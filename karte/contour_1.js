(function(global) {
  ("use strict");

  const CONTOUR_API_URL = "https://api.hoehendaten.de:14444/v1/contours";
  
  // const TEXT_CONTOUR_LABEL = "Höhenschichtlinien";
  const TEXT_CONTOUR_LABEL = "Höhenlinien";

  const MODE_CONTOUR = 20;

  const CONTOUR_OPTIONS_DEFAULTS = {
    interval: 10.0,
    lineWeight: 0.5,
    smoothFactor: 0,
    color: "rgba(180,180,180,1.0)",
    majorInterval: 5,
    majorColor: "rgba(150,150,150,1.0)",
    majorLineWeight: 0.5,
    majorLabeling: false,
    labelSmoothFactor: 10,
    styleOptions: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      opacity: 100, 
      blendMode: "normal",
    },
  };
 
  function buildContourRequestBody(latlng, options) {
    return {
      Type: "ContoursRequest",
      ID: `Contours at ${latlng.lat},${latlng.lng}`,
      Attributes: {
        Longitude: latlng.lng,
        Latitude: latlng.lat,
        Format: "GeoJSON",
        Equidistance: options.interval,
      },
    };
  }
  
  function extractContourTileData(data) {
    if (data?.Attributes?.IsError) {
      const err = data.Attributes.Error || {};
      throw new Error(
        `Contour API Error [${err.Code || "Unknown"}]: ${
          err.Title || "Error"
        }. ${err.Detail || ""}`
      );
    }
    const contoursArray = data?.Attributes?.Contours;
    if (!Array.isArray(contoursArray) || contoursArray.length === 0) {
      throw new Error("No contour data found in API response.");
    }
    return contoursArray.map((item) => ({
      geojson: JSON.parse(atob(item.Data)),
      Actuality: item.Actuality,
      Origin: item.Origin,
      Attribution: item.Attribution,
      TileIndex: item.TileIndex,
    }));
  }

  function createContourLayerFromData(tileData, options) {
    //console.log("createContourLayerFromData options: ", options);
    const { geojson } = tileData;
    const {
      color,
      lineWeight,
      smoothFactor,
      majorInterval,
      majorColor,
      majorLineWeight,
      majorLabeling,
      labelSmoothFactor,
    } = options;

    const pane = global.getOrCreatePane(map, "contour");

    const isMajorLine = (elevation) =>
      Number.isInteger(elevation / (options.interval * majorInterval));
    /*
    const isMajorLine = (elevation) =>
      ((elevation / options.interval) % majorInterval) === 0;
    */

    const mainRgba = global.parseColorStringToRgbaObject(color);
    const majorRgba = global.parseColorStringToRgbaObject(majorColor);

    const lineLayer = L.geoJSON(geojson, {
      pane: pane,
      smoothFactor: smoothFactor,
      style: (feature) => {
        const elevation =
          feature.properties?.Hoehe ?? feature.properties?.elevation;
        const isMajor = isMajorLine(elevation);
        const rgba = isMajor ? majorRgba : mainRgba;
        return {
          color: rgba.a > 0 ? global.rgbaObjectToString(rgba) : "transparent",
          weight: isMajor ? majorLineWeight : lineWeight,
        };
      },
      onEachFeature: (feature, layer) => {
        const elevation =
          feature.properties?.Hoehe ?? feature.properties?.elevation ?? "?";
        layer.bindTooltip(`${elevation} m`, { sticky: true });
      },
    });

    // Basic implementation: returns a simple GeoJSON layer.
    // For advanced features like text labels on paths (majorLabeling),
    // you would need L.Polyline.setText which is not standard Leaflet.
    // We will keep it simple here to ensure it works with the manager.
    const featureGroup = L.featureGroup([lineLayer]);
    // Layer specifically for major contour line labels, made transparent
    if (majorLabeling) {
      const labelLayer = L.geoJSON(geojson, {
        pane: pane,
        smoothFactor: labelSmoothFactor, // Potentially higher smoothFactor for better label placement
        filter: (feature) => {
          const elevation =
            feature.properties?.Hoehe ?? feature.properties?.elevation;
          return isMajorLine(elevation); // Only render features that are major lines
        },
        style: () => ({
          color: "transparent", // Make the line itself completely transparent
          weight: 0, // No visible line thickness
          opacity: 0, // Fully transparent
          interactive: false, // Don't make this layer interactive
        }),
        onEachFeature: (feature, layer) => {
          const elevation =
            feature.properties?.Hoehe ?? feature.properties?.elevation ?? "?";
          // Add extra spaces to ensure text repeats along longer lines
          const lineLabel = `${elevation}${" ".repeat(100)}`;

          // Apply text to LineString features if L.Polyline.setText is available (from Leaflet.TextPath plugin)
          if (
            feature.geometry.type === "LineString" &&
            layer instanceof L.Polyline &&
            typeof layer.setText === "function"
          ) {
            layer.setText(lineLabel, {
              repeat: true, // Repeat the label along the line [1]
              center: true, // Center the label on the line segment [1]
              offset: -8, // Vertical offset (negative value places text above the line) [1]
              attributes: {
                // SVG attributes for the text itself [1]
                fill: global.rgbaObjectToString(majorRgba), // Use the major contour line color for the label
                "font-size": "12px",
                "font-weight": "normal",
                "text-anchor": "middle", // Center the text horizontally
                "paint-order": "stroke", // Ensure text is drawn on top of any strokes
                stroke: "white", // A slight stroke for better visibility against varied backgrounds
                "stroke-width": "2px",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
              },
            });
          }
        },
      });
      featureGroup.addLayer(labelLayer);
    }

    return featureGroup;
  }

  function getContourPanelHtml(idSuffix, options) {
    if (typeof global.makeSlider !== "function") {
      console.error(
        "makeSlider ist nicht verfügbar. HTML-Panel kann nicht korrekt generiert werden."
      );
      return `<div>Fehler: UI-Komponenten fehlen.</div>`;
    }

    // TODO kann das weg ?
    // Bestimmt den anfänglichen Checked-Zustand für Alpha-Checkboxen basierend auf dem Alpha-Wert der aktuellen Farbe.
    const isMainColorVisible =
      global.getAlphaFromColorString(options.color) > 0;
    const isMajorColorVisible =
      global.getAlphaFromColorString(options.majorColor) > 0;

    return `
      <!-- Style Controls -->
      <div class="client" id="style-controls${idSuffix}">
        ${MapStyleManager.getHtml(options.styleOptions, idSuffix)}
      </div>

      <hr>
   
      <div class="client">
        <h4>Höhenlinien</h4>

        <label>Farbe:</label>
        <div class="color-row">
          <div class="color-cell">
            <input type="text"
                id="contour-color-input${idSuffix}"
                value="${options.color}"
                tabindex="-1"
                readonly
                class="cp_input color-input"
                data-color="${options.color}"
                style="background-color: ${options.color};
                color: ${global.getTextColor(
                  global.rgbToHex(
                    global.parseColorStringToRgbaObject(options.color).r,
                    global.parseColorStringToRgbaObject(options.color).g,
                    global.parseColorStringToRgbaObject(options.color).b
                  )
                )};">
          </div>          
        </div>

        ${global.makeSlider(
          "lineWeight",
          idSuffix,
          "Linienstärke",
          options.lineWeight,
          0.1,
          5,
          0.1,
          1
        )}
        ${global.makeSlider(
          "smoothFactor",
          idSuffix,
          "Glättung",
          options.smoothFactor,
          0,
          10,
          1,
          0
        )}
        
        <h4>Haupthöhenlinien</h4>                
        ${global.makeSlider(
          "majorInterval",
          idSuffix,
          "Intervall",
          options.majorInterval,
          2,
          25,
          1,
          0
        )}        

        <label>Farbe:</label>
        <div class="color-row">
          <div class="color-cell">   
            <input type="text"
              id="contour-major-color-input${idSuffix}"
              value="${options.majorColor}"
              tabindex="-1"
              readonly
              class="cp_input color-input"
              data-color="${options.majorColor}"
              style="background-color: ${options.majorColor};
              color: ${global.getTextColor(
                global.rgbToHex(
                  global.parseColorStringToRgbaObject(options.majorColor).r,
                  global.parseColorStringToRgbaObject(options.majorColor).g,
                  global.parseColorStringToRgbaObject(options.majorColor).b
                )
              )};" />
          </div>   
        </div>     

        ${global.makeSlider(
          "majorLineWeight",
          idSuffix,
          "Linienstärke",
          options.majorLineWeight,
          0.1,
          5,
          0.1,
          1
        )}
      
        <!-- 
        <label>
          <input type="checkbox" id="contour-major-labeling${idSuffix}" ${
              options.majorLabeling ? "checked" : "" } />
            Haupthöhenlinien beschriften?
        </label>
      </div>
      -->

      <hr>

      <div class="server_data">
        ${global.makeSlider(
          "interval",
          idSuffix,
          "Äquidistanz",
          options.interval,
          0.2,
          25.0,
          0.1,
          1,
          " m"
        )}
      </div>
      
      <div class="panel-buttons" style="margin-top: 12px;">
        <button type="button" id="btn-contour-zeichnen${idSuffix}" style="dddisplay: none;">aktualisieren</button>
      </div>                       
    `;
  }

  function initContourPanelHelper(idSuffix, managerApi) {
    // Don't destructure 'options' from managerApi, as it would create a local,
    // potentially stale reference if managerApi.options uses a getter and optionsLast is reassigned.
    const { saveSettings, redrawLayers, forceRedraw, resetOptionsToDefaults } =
      managerApi;

    let mustFetch = false;
    const redrawButton = document.getElementById(`btn-contour-zeichnen${idSuffix}`);

    // Initialize the MapStyleManager for client-side styling
    // MapStyleManager.init should be called with managerApi.options.styleOptions directly
    const styleManager = new MapStyleManager(saveSettings, redrawLayers);
    styleManager.init(managerApi.options.styleOptions, idSuffix); // Use managerApi.options.styleOptions directly

    // Hilfsfunktion zum Einrichten eines Farbwählers und der zugehörigen Alpha-Checkbox.
    const setupColorPicker = (inputId, optionKey, alphaCheckboxId) => {
      const colorInput = document.getElementById(inputId + idSuffix);
      const alphaCheckbox = document.getElementById(alphaCheckboxId + idSuffix); // Auskommentiert, aber hier als Referenz beibehalten

      if (!colorInput || typeof global.ColorPicker === "undefined") {
        console.warn(
          `Farbwähler-Einrichtung übersprungen für ${inputId}${idSuffix}: Input oder ColorPicker-Klasse nicht gefunden.`
        );
        return;
      }

      const initialColorRgbaObj = global.parseColorStringToRgbaObject(
        managerApi.options[optionKey]
      );
      const initialColorRgbaStr =
        global.rgbaObjectToString(initialColorRgbaObj);

      // Erstellt eine neue ColorPicker-Instanz.
      const pickerInstance = new global.ColorPicker(colorInput, {
        toggleStyle: "input",
        headless: false,
        enableAlpha: true, // Alpha-Kanal ist im Farbwähler aktiviert.
        color: initialColorRgbaStr, // Initialisiert den Farbwähler mit dem vollständigen RGBA-String.
        enableEyedropper: false,
        formats: ["hex", "rgba", "hsv", "hsl"],
        defaultFormat: "rgba",
        swatches: [
          "rgba(139,0,0,1)", // dark red
          "rgba(255,0,0,1)", // red
          "rgba(255,69,0,1)", // orange-red
          "rgba(255,165,0,1)", // orange
          "rgba(255,215,0,1)", // gold
          "rgba(255,255,0,1)", // yellow
          "rgba(173,255,47,1)", // green-yellow
          "rgba(0,255,0,1)", // green
          "rgba(144,238,144,1)", // light green
          "rgba(64,224,208,1)", // turquoise
          "rgba(0,255,255,1)", // cyan
          "rgba(135,206,235,1)", // sky blue
          "rgba(0,0,255,1)", // blue
          "rgba(75,0,130,1)", // indigo
          "rgba(138,43,226,1)", // blue-violet
          "rgba(128,0,128,1)", // purple
          "rgba(55,30,70,1)", // dark purple
          "rgba(255,0,255,1)", // magenta
        ],
        submitMode: "confirm",
        showClearButton: false,
        dismissOnOutsideClick: true,
        dialogPlacement: "top",
        dialogOffset: 8,
      });

      colorInput._colorpicker = pickerInstance; // Speichert die Farbwähler-Instanz am Input-Element.

      // Event-Listener, wenn eine Farbe aus der ColorPicker-UI ausgewählt wird.
      pickerInstance.on("pick", (pickedColor) => {
        const rgbaStr = pickedColor.string("rgba");
        const rgbaObj = global.parseColorStringToRgbaObject(rgbaStr);

        console.log("pick optionKey: ", optionKey, rgbaStr);

        managerApi.options[optionKey] = rgbaStr; // Option mit vollständigem RGBA-String aktualisieren.
        managerApi.saveSettings(); // Einstellungen speichern.

        // Visuellen Stil des Input-Feldes aktualisieren.
        colorInput.style.backgroundColor = rgbaStr;
        colorInput.style.color = global.getTextColor(
          global.rgbToHex(rgbaObj.r, rgbaObj.g, rgbaObj.b)
        );
        colorInput.dataset.color = rgbaStr; // `data-color`-Attribut synchron halten.

        // Zustand der zugehörigen Alpha-Checkbox aktualisieren (wenn sie existieren würde).
        if (alphaCheckbox) {
          alphaCheckbox.checked = rgbaObj.a > 0;
        }
        // managerApi.redrawLayers(); // Neudarstellung auslösen, um neuen Stil anzuwenden.
        managerApi.reloadLayersFromStorage(); // Neudarstellung auslösen, um neuen Stil anzuwenden.
      });

      // Event-Listener für die Alpha-Sichtbarkeits-Checkbox (auskommentiert, aber Logik ist hier).
      if (alphaCheckbox) {
        alphaCheckbox.addEventListener("change", () => {
          const currentRgbaObj = global.parseColorStringToRgbaObject(
            options[optionKey]
          );
          currentRgbaObj.a = alphaCheckbox.checked ? 255 : 0; // Alpha auf undurchsichtig (255) oder transparent (0) setzen.
          const newRgbaStr = global.rgbaObjectToString(currentRgbaObj);

          options[optionKey] = newRgbaStr; // Option mit neuem Alpha-Wert aktualisieren.
          this._saveSettings(); // Einstellungen speichern.

          // Farbwähler-Instanzfarbe aktualisieren (ohne dessen 'pick'-Event erneut auszulösen).
          if (colorInput._colorpicker) {
            colorInput._colorpicker.setColor(newRgbaStr, false);
          }
          // Visuellen Stil des Input-Feldes aktualisieren.
          colorInput.style.backgroundColor = newRgbaStr;
          colorInput.style.color = global.getTextColor(
            global.rgbToHex(
              currentRgbaObj.r,
              currentRgbaObj.g,
              currentRgbaObj.b
            )
          );
          colorInput.dataset.color = newRgbaStr;

          // !!! this.redrawLayers(); // Neudarstellung auslösen, um neuen Stil anzuwenden.
        });
      }
    };

    // Haupt-Farbwähler für normale Höhenlinien einrichten.
    setupColorPicker(
      "contour-color-input",
      "color",
      "contour-alpha-visible-" // ID der Alpha-Checkbox
    );
    // Haupt-Farbwähler für Haupthöhenlinien einrichten.
    setupColorPicker(
      "contour-major-color-input",
      "majorColor",
      "contour-major-alpha-visible-" // ID der Alpha-Checkbox
    );

    // Helper to bind a color input and its alpha slider
    const bindColorAndAlpha = (colorKey, colorInputId, alphaInputId) => {
      const colorInput = document.getElementById(colorInputId + idSuffix);
      const alphaInput = document.getElementById(alphaInputId + idSuffix);

      const updateColor = () => {
        const hex = colorInput.value;
        const alpha = parseFloat(alphaInput.value);
        options[colorKey] = global.hexToRgbaString(hex, alpha);
        saveSettings();
      };

      // TODO colorInput.addEventListener("input", updateColor);
      // TODO alphaInput.addEventListener("input", updateColor);
    };

    bindColorAndAlpha("color", "color", "color-alpha");
    bindColorAndAlpha("majorColor", "majorColor", "majorColor-alpha");

    // Bind sliders
    global.bindSlider(
      "interval",
      idSuffix,
      "interval",
      {},
      true,
      1,
      parseFloat,
      managerApi.options,
      saveSettings,
      () => {
        mustFetch = true;
        redrawButton.style.display = 'block';
      }    
    );
    global.bindSlider(
      "lineWeight",
      idSuffix,
      "lineWeight",
      {},
      false,
      1,
      parseFloat,
      managerApi.options,
      saveSettings,
      managerApi.reloadLayersFromStorage // redrawLayers
    );
    global.bindSlider(
      "smoothFactor",
      idSuffix,
      "smoothFactor",
      {},
      false,
      0,
      parseInt,
      managerApi.options,
      saveSettings,
      managerApi.reloadLayersFromStorage // redrawLayers
    );
    global.bindSlider(
      "majorInterval",
      idSuffix,
      "majorInterval",
      {},
      false,
      0,
      parseInt,
      managerApi.options,
      saveSettings,
      managerApi.reloadLayersFromStorage // redrawLayers
    );
    global.bindSlider(
      "majorLineWeight",
      idSuffix,
      "majorLineWeight",
      {},
      false,
      1,
      parseFloat,
      managerApi.options,
      saveSettings,
      managerApi.reloadLayersFromStorage // redrawLayers
    );
   
    const majorLabelingCheckbox = document.getElementById(
      `contour-major-labeling${idSuffix}`
    );
    if (majorLabelingCheckbox) {      
      majorLabelingCheckbox.addEventListener("change", () => {
        console.log(" majorLabelingCheckbox change");
        managerApi.options.majorLabeling = majorLabelingCheckbox.checked;
        saveSettings();
        //forceRedraw(); // Force a full redraw to re-create layers with/without labels
        managerApi.reloadLayersFromStorage(); // redrawLayers
      });
    }

    redrawButton.addEventListener("click", () => {
        console.log("btn-contour-zeichnen mustFetch: ", mustFetch);
        if (mustFetch) {
          forceRedraw(); // forceRedraw triggers a full re-fetch
          mustFetch = false;
        } else {
           // This will now call the public loadLayers method via the managerApi proxy
           managerApi.reloadLayersFromStorage(); 
         }
         redrawButton.style.display = 'none';
      });
  }
  
  const contourModeManager = createTileManager({
    type: "contour",
    label: TEXT_CONTOUR_LABEL,
    modeId: MODE_CONTOUR,
    apiUrl: CONTOUR_API_URL,
    defaultOptions: CONTOUR_OPTIONS_DEFAULTS,
    hasGradientAlgorithm: false,
    hasColorMap: false,
    buildRequestBody: buildContourRequestBody,
    extractTileData: extractContourTileData,
    getCustomPanelHtml: getContourPanelHtml,
    initCustomPanelHelper: initContourPanelHelper,
    createLayerFromTileData: createContourLayerFromData, // Custom function for GeoJSON
  });

  document.addEventListener("DOMContentLoaded", () => {
    if (window.map) {
      // console.info("contour_1.js initialisiert.");
      contourModeManager.init();
      contourModeManager.addCustomControls();
    } else {
      console.error("Leaflet map object 'map' not found for contour_1.js");
    }
  });

  // Expose the manager instance for debugging
  global.contourModeManager = contourModeManager;
})(window);
