// map-tile-manager.js

function createTileManager(config) {
  const {
    type,
    label,
    modeId,
    apiUrl,
    defaultOptions,
    hasGradientAlgorithm = true,
    hasColorMap = true, 
    buildRequestBody,
    extractTileData,
    getCustomPanelHtml,
    initCustomPanelHelper,
    createLayerFromTileData, 
  } = config;

  const myTilesMap = new Map();

  // let myLayers = []; // Stores active layers for this specific mode
  let optionsLast = { ...defaultOptions }; 
  let fetchForRedraw = false; 
  let TYPE_DIR_NAME = type + "_files"; 
  let TYPE_MASTER_NAME =  "map_" + type + "_master.json";
  
  let isDrawingRectangle = false;
  let startLatLng = null;
  let currentRectangle = null;
  let drawnRectangleBounds = null; 

  function saveSettings() {  
    localStorage.setItem(`${type}_configuration`, JSON.stringify(optionsLast));
  }
 
  function loadSettings() {
    try {
      const stored = localStorage.getItem(`${type}_configuration`);
      optionsLast = stored ? JSON.parse(stored) : { ...defaultOptions };
     
      if (
        hasColorMap &&
        optionsLast.colorMap &&
        typeof defaultOptions.colorMap === "object"
      ) {
        optionsLast.colorMap = structuredClone(optionsLast.colorMap);
      }
      
      optionsLast = { ...defaultOptions, ...optionsLast };
      if (hasColorMap && defaultOptions.colorMap && !optionsLast.colorMap) {       
        optionsLast.colorMap = structuredClone(defaultOptions.colorMap);
      }
    } catch (e) {
      console.warn(`Invalid stored ${type} options, using defaults.`, e);
      optionsLast = { ...defaultOptions };
      if (hasColorMap && defaultOptions.colorMap) {
        optionsLast.colorMap = structuredClone(defaultOptions.colorMap);
      }
    }
  }

  function saveLayers() {   
    if (isOpfsAvailable) {
      saveLayersInOPFS();
      return;
    }
  }

  async function saveTileMapInOPFS(map, type) {
    const mapAsArray = Array.from(map.entries());
    const serializedMap = JSON.stringify(mapAsArray);

    await persist("", TYPE_MASTER_NAME, serializedMap); 
  }
  
  async function saveSingleLayerInOPFS(entry, type) {    
    try {      
      const fileName = `${type}_${entry.TileIndex || Date.now()}_${
        entry.Origin || "unknown"
      }.json`;

      let content = null;

      if (entry.layer === null) {        
      }
      // 1. GeoJSON-Layer
      else if (entry.layer && typeof entry.layer.toGeoJSON === "function") {
        content = { type: "geojson", data: entry.layer.toGeoJSON() };
      }
      // 2. ImageOverlay (Tile-Layer)
      else if (entry.layer instanceof L.ImageOverlay) {
        const bounds = entry.layer.getBounds();
        const src = entry.layer.getElement()?.src; 

        if (src && src.startsWith("data:")) {
          const [, mimeType, base64Data] =
            src.match(/^data:(.*?);base64,(.*)$/) || [];
          content = {
            type: "tile",
            Data: base64Data, 
            DataFormat: mimeType?.includes("tiff")
              ? "geotiff"
              : mimeType?.includes("jpeg")
              ? "jpeg"
              : "png",
            BoundingBox: {
              MinLat: bounds.getSouth(),
              MinLon: bounds.getWest(),
              MaxLat: bounds.getNorth(),
              MaxLon: bounds.getEast(),
            },
          };
        }
      }

      if (entry.layer !== null && !content) {
        console.warn(`⚠️ ${type} Layer could not be serialized:`, entry);
        return null;
      }

      if (entry.layer !== null) {
        entry.layer = null;

        const fileContent = JSON.stringify(content, null, 2);
        await persist(TYPE_DIR_NAME, fileName, fileContent);        
      }

      const { layer, ...rest } = entry;
      returnData = { ...rest, fileName: fileName };
      return returnData;
    } catch (err) {
      console.error(`❌ Error saving a ${type} layer:`, err);
      return null; 
    }
  }

  async function saveLayersInOPFS() {
    try {
      const masterData = []; 
     
      const fileContent = JSON.stringify(masterData, null, 2);
      await persist("", TYPE_MASTER_NAME, fileContent); // Using the persistence module

      /*
      if (true) {
        console.log(
          "Final for myLayers estimated size (bytes):",
          roughSizeOfObject(myLayers)
        );
      }
      */
    } catch (err) {
      console.error(`❌ Error saving ${type} layers to OPFS:`, err);
    }
  }
 
  function resetOptionsToDefaults(idSuffix = "") {
    fetchForRedraw = true; 
    optionsLast = { ...defaultOptions };
    if (
      hasColorMap &&
      optionsLast.colorMap &&
      typeof defaultOptions.colorMap === "object"
    ) {
      optionsLast.colorMap = structuredClone(defaultOptions.colorMap); 
    }

    const gradientAlgorithmVariant = document.getElementById(
      `gradientAlgorithmVariant${idSuffix}`
    );
    if (gradientAlgorithmVariant && hasGradientAlgorithm) {
      gradientAlgorithmVariant.value = optionsLast.gradientAlgorithmVariant;
    }
    const coloringAlgorithmVariant = document.getElementById(
      `coloringAlgorithmVariant${idSuffix}`
    );
    if (coloringAlgorithmVariant && hasColorMap) {
      coloringAlgorithmVariant.value = optionsLast.coloringAlgorithmVariant;
    }

    if (hasColorMap) {
      renderColorPickers(idSuffix); 
      const colorTextArea = document.getElementById(
        `colorTextFileContent${idSuffix}`
      );
      if (colorTextArea) {
        colorTextArea.value = generateColorMapText(optionsLast);
      }
    }
  
    if (optionsLast.opacity !== undefined) {
      updateInputAndLabel("opacity", idSuffix, optionsLast.opacity.toFixed(1)); 
    }

    saveSettings();
    redrawTiles();
  }
 
  function redrawTiles() {
    console.log("redrawLayers fetchForRedraw:", fetchForRedraw, type);

    if (!fetchForRedraw) {
      MapStyleManager.applyFilterAndBlendMode(
        type,
        optionsLast.styleOptions
      );
    } else {
      regenerateTiles(true); 
    }
    fetchForRedraw = false; 
  }
  
  function regenerateTiles() {
    for (const tilesArray of myTilesMap.values()) {
      for (const tile of tilesArray) {
        console.log("tile: ", tile);
        console.log("tile.leaflet_id: ", tile.leaflet_id);
      }
    }

    for (const tilesArray of myTilesMap.values()) {
      for (const tile of tilesArray) {
        removeLayerById(tile.leaflet_id);
      }
    }

    const copiedTilesMap = new Map(myTilesMap);
    myTilesMap.clear();

    revisitTileIndices(copiedTilesMap);
  }

  async function revisitTileIndices(copiedTilesMap = []) {
    console.log("revisitTileIndices optionsLast: ", optionsLast);

    let lastTileIndex = ""; 
    const originalMode = modeManager.get(); 
    modeManager.set(modeId); 

    console.log("revisitTileIndices copiedTilesMap: ", copiedTilesMap);

    for (const [key, tilesArray] of copiedTilesMap.entries()) {     
      // console.log("Map Key: ", key); 
      const effectiveLatLng = calculateLatLng(key);

      await handleGoButtonForMode(effectiveLatLng);
      // await delay(500); // 0.5 Sekunden Pause
      await delay(200); // 0.2 Sekunden Pause
    }

    modeManager.set(originalMode); 
  }

  function getPanelHtml(idSuffix = "") {    
    if (getCustomPanelHtml) {
      return (
        // "<h4>Darstellung:</h4>" + getCustomPanelHtml(idSuffix, optionsLast)
        getCustomPanelHtml(idSuffix, optionsLast)
      );
    }

    let gradientAlgorithmHtml = "";
    if (hasGradientAlgorithm) {
      gradientAlgorithmHtml = `
        <label for="gradientAlgorithmVariant${idSuffix}">Algorithmus:</label>
        <select id="gradientAlgorithmVariant${idSuffix}" name="gradientAlgorithmVariant">
          <option value="ZevenbergenThorne" ${
            optionsLast.gradientAlgorithmVariant === "ZevenbergenThorne"
              ? "selected"
              : ""
          }>ZevenbergenThorne</option>
          <option value="Horn" ${
            optionsLast.gradientAlgorithmVariant === "Horn" ? "selected" : ""
          }>Horn</option>
        </select>
      `;
    }

    let colorMapHtml = "";
    if (hasColorMap) {
      colorMapHtml = `
            <!-- Color file input -->
            <details style="margin-top: 12px;">
              <!-- <summary class="summary" style="cursor: pointer; font-size: 1.1em; font-weight: bold;">Farbschemadatei</summary> -->
              <summary class="summary" style="cursor: pointer; font-weight: bold;">Farbschemadatei</summary>
              <div style="margin-top: 12px;">
                <div id="colorFileSection${idSuffix}" style="margin-top: 8px;">
                  <label for="colorFileInput${idSuffix}">Farbschema</label>
                  <input type="file" id="colorFileInput${idSuffix}" accept=".txt" />
                  <textarea id="colorTextFileContent${idSuffix}" rows="20" style="width: 100%; margin-top: 6px;"></textarea>
                  <div class="panel-buttons" style="margin-top: 12px;">
                    <button type="button" id="applyColorValues${idSuffix}" >
                      Werte in Farbtabelle übernehmen
                    </button>
                  </div>
                </div>
              </div>
            </details>

            <!-- Color table -->
            <!-- <details open style="margin-top: 12px;"> -->
            <details style="margin-top: 12px;">
              <!-- <summary class="summary" style="cursor: pointer; font-size: 1.1em; font-weight: bold;">Farbtabelle</summary> -->
              <summary class="summary" style="cursor: pointer; font-weight: bold;">Farbtabelle</summary>
              <div id="${type}ColorTable${idSuffix}" class="color-table" style="margin-top: 8px;"></div>
            </details>

            <label for="coloringAlgorithmVariant${idSuffix}">Farbzuweisung:</label>
            <select id="coloringAlgorithmVariant${idSuffix}" name="coloringAlgorithmVariant">
              <option value="interpolation" ${
                optionsLast.coloringAlgorithmVariant === "interpolation"
                  ? "selected"
                  : ""
              }>Lineare Interpolation</option>
              <option value="rounding" ${
                optionsLast.coloringAlgorithmVariant === "rounding"
                  ? "selected"
                  : ""
              }>Nächstgelegene Farbe</option>
            </select>
        `;
    }

    return `
        <!-- Style Controls -->
        <div class="client" id="style-controls${idSuffix}">
          ${MapStyleManager.getHtml(optionsLast.styleOptions, idSuffix)}
        </div>

        <hr>

        <div class="server_data">
            ${colorMapHtml}
            ${gradientAlgorithmHtml}
        </div>

        <div class="panel-buttons" style="margin-top: 12px;">

          <button type="button" id="btn-${type}-zeichnen${idSuffix}">aktualisieren</button>
        </div>
    `;
  }
  
  function getPanelHelper(idSuffix = "") {    
    const managerApi = {      
      get options() {
        return optionsLast;
      },     
      set options(newOptions) {
        optionsLast = newOptions;
      }, 
      saveSettings,
      redrawLayers: redrawTiles,
      forceRedraw: () => {
        fetchForRedraw = true;
      },
      resetOptionsToDefaults: () => resetOptionsToDefaults(idSuffix),
      hasGradientAlgorithm,
      hasColorMap,
      //reloadLayersFromStorage: () => managerPublicApi.loadLayers(), 
      reloadLayersFromStorage: () => {/* console.log("getPanelHelper reloadLayersFromStorage calling managerPublicApi.loadLayers()"); */managerPublicApi.removeLayersFromMap(); managerPublicApi.loadLayers()}, 
    };

   
    if (initCustomPanelHelper) {
      initCustomPanelHelper(idSuffix, managerApi);
    } else {
     
      const styleManager = new MapStyleManager(
        saveSettings, 
        redrawTiles 
      );
      styleManager.init(optionsLast.styleOptions, idSuffix);

      if (hasColorMap) {
        const colorTextArea = document.getElementById(
          `colorTextFileContent${idSuffix}`
        );
        const fileInput = document.getElementById(`colorFileInput${idSuffix}`);

        if (colorTextArea) {
          const predefinedText = generateColorMapText(optionsLast);
          colorTextArea.value = predefinedText;
        }

        if (fileInput && colorTextArea) {
          fileInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
              const text = e.target.result;
              colorTextArea.value = text;
              const newMap = parseColorText(text); 
              if (newMap) {
                optionsLast.colorMap = newMap;
                saveSettings();
                renderColorPickers(idSuffix);
                fetchForRedraw = true;
              }
            };
            reader.readAsText(file);
          });
        }

        document
          .getElementById(`applyColorValues${idSuffix}`)
          ?.addEventListener("click", () => {
            const content = document.getElementById(
              `colorTextFileContent${idSuffix}`
            ).value;
            const newMap = parseColorText(content); 
            if (newMap) {
              optionsLast.colorMap = newMap;
              saveSettings();
              renderColorPickers(idSuffix); 
              fetchForRedraw = true;
            }
          });

        renderColorPickers(idSuffix);

        const coloringAlgorithmVariantInput = document.getElementById(
          `coloringAlgorithmVariant${idSuffix}`
        );
        if (coloringAlgorithmVariantInput) {
          coloringAlgorithmVariantInput.addEventListener("change", function () {
            optionsLast.coloringAlgorithmVariant = this.value;
            saveSettings();
            fetchForRedraw = true; 
          });
        }
      }
     
      const gradientAlgorithmVariantInput = document.getElementById(
        `gradientAlgorithmVariant${idSuffix}`
      );
      if (gradientAlgorithmVariantInput && hasGradientAlgorithm) {
        gradientAlgorithmVariantInput.addEventListener("change", function () {
          optionsLast.gradientAlgorithmVariant = this.value;
          saveSettings();
          fetchForRedraw = true; 
        });
      }
    }
    
    document
      .getElementById(`btn-${type}-standard${idSuffix}`)
      ?.addEventListener("click", () => {
        resetOptionsToDefaults(idSuffix);
      });

    document
      .getElementById(`btn-${type}-zeichnen${idSuffix}`)
      ?.addEventListener("click", () => {
        redrawTiles();
      });
  
    document
      .querySelectorAll(
        `#${type}-panel input, #${type}-panel button, #${type}-panel select, #${type}-panel textarea`
      )
      .forEach((el) => {
        el.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          e.preventDefault();
        });
        el.addEventListener("click", (e) => {
          e.stopPropagation();
        });
        el.addEventListener("wheel", (e) => {
          e.stopPropagation();
        });
        el.addEventListener("change", (e) => {
          e.stopPropagation();
        });
      });
  }
 
  function renderColorPickers(idSuffix = "") {
    if (!hasColorMap) return; 

    const container = document.getElementById(`${type}ColorTable${idSuffix}`);
    if (!container) return;

    const colorMap = optionsLast.colorMap;
    const sortedKeys = Object.keys(colorMap).sort((a, b) => {
      if (a === "nv") return 1;
      if (b === "nv") return -1;
      return parseFloat(a) - parseFloat(b);
    });

    container.innerHTML = ""; 
    const header = document.createElement("div");
    header.className = "color-row color-header";
    header.innerHTML = `
        <div class="color-cell"><strong>Wert</strong></div>
        <div class="color-cell"><strong>Farbe</strong></div>
        `;
    container.appendChild(header);

    for (const val of sortedKeys) {
      const safeVal = safeId(val); 
      const color = colorMap[val];
      const hex = rgbToHex(color.r, color.g, color.b); 
      const rgbaStr = `rgba(${color.r},${color.g},${color.b},${(
        color.a / 255
      ).toFixed(2)})`;

      const row = document.createElement("div");
      row.className = "color-row";
      row.innerHTML = `
        <div class="color-cell">${val}</div>
        <div class="color-cell">
            <button class="cp_wide color-picker" type="button" data-color="${rgbaStr}">
            <input type="text"
                id="${type}-color-${safeVal}${idSuffix}"
                value="${hex}"
                tabindex="-1"
                readonly
                class="cp_input"
                data-color="${rgbaStr}"
                style="background-color: ${hex};
                color: ${getTextColor(hex)};">
            </button>
        </div>
      `;
      container.appendChild(row);
     
      const input = document.getElementById(
        `${type}-color-${safeVal}${idSuffix}`
      );
      if (input && window.ColorPicker) {
        const picker = new window.ColorPicker(input, {
          toggleStyle: "input",
          headless: false,
          enableAlpha: true,
          color: rgbaStr,
          enableEyedropper: false,
          formats: ["hex", "rgba", "hsv", "hsl"],
          defaultFormat: "rgba",
          swatches: [
            "rgba(139,0,0,1)",
            "rgba(255,0,0,1)",
            "rgba(255,69,0,1)",
            "rgba(255,165,0,1)",
            "rgba(255,215,0,1)",
            "rgba(255,255,0,1)",
            "rgba(173,255,47,1)",
            "rgba(0,255,0,1)",
            "rgba(144,238,144,1)",
            "rgba(64,224,208,1)",
            "rgba(0,255,255,1)",
            "rgba(135,206,235,1)",
            "rgba(0,0,255,1)",
            "rgba(75,0,130,1)",
            "rgba(138,43,226,1)",
            "rgba(128,0,128,1)",
            "rgba(55,30,70,1)",
            "rgba(255,0,255,1)",
          ],
          submitMode: "confirm",
          showClearButton: false,
          dismissOnOutsideClick: true,
          dialogPlacement: "top",
          dialogOffset: 8,
        });

        input._picker = picker;

        picker.on("pick", (pickedColor) => {
          const rgbaStr = pickedColor.string("rgba");
          const match = rgbaStr.match(
            /rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/
          );
          if (match) {
            const r = parseInt(match[1], 10);
            const g = parseInt(match[2], 10);
            const b = parseInt(match[3], 10);
            const a = Math.round(parseFloat(match[4]) * 255);
            optionsLast.colorMap[val] = { r, g, b, a };
            saveSettings();
            const hexNew = rgbToHex(r, g, b);
            input.style.backgroundColor = hexNew;
            input.style.color = getTextColor(hexNew);
            fetchForRedraw = true; 
            if (true) {
              const colorTextArea = document.getElementById(
                `colorTextFileContent${idSuffix}`
              );
              if (colorTextArea.value && colorTextArea.value.length > 0) {
                const predefinedText = generateColorMapText(optionsLast);
                colorTextArea.value = predefinedText;
              }
            }
          } else {
            console.warn(
              "Failed to parse RGBA string from ColorPicker:",
              rgbaStr
            );
          }
        });
      }
    }
  }

  async function handleCustomInfoAction(allFoundTiles, lng, lat) {
    console.log("handleCustomInfoAction allFoundTiles: ", allFoundTiles);
    try {     
      let html = displayTiles(allFoundTiles, lng, lat, config.label);

      html += `
          <div class="custom-dialog-actions">
            <button class="custom-dialog-details-button">🔍 Weitere Kacheln im Sidepanel anzeigen</button>
          </div>
        `;

      await showCustomInfo(type, html, allFoundTiles[0].tile.TileIndex);
     
      console.log(
        "handleCustomInfoAction User confirmed deletion for allFoundTiles: ",
        allFoundTiles
      );

      if (true) {
        allFoundTiles.forEach((tile) => {         
          removeLayerByLeafletId(tile.leaflet_id);
         
          remove(type + "_files", tile.filename);
         
          if (myTilesMap.has(tile.tile.TileIndex)) {
            myTilesMap.delete(tile.tile.TileIndex);
            console.log("deleted from myTilesMap key: ", tile.tile.TileIndex);
          }
        });
        
        saveTileMapInOPFS(myTilesMap, type);
      }
    } catch (error) {      
      console.log("User canceled the action.");
    }
  }
  
  function handleMapClick() {
    map.on("click", async (e) => {      
      if (modeManager.get() !== modeId) return; 

      if (isDrawingRectangle || drawnRectangleBounds) {
        drawnRectangleBounds = null; 
        return;
      }

      const latlng = e.latlng;
      window.theLatLng = latlng;

      if (true) {      
        const allFoundTiles = findTiles(myTilesMap, latlng.lng, latlng.lat);
        
        if (allFoundTiles.length === 0) {
          console.log("✅ String enthält KEIN 'Keine Kacheln'");
        } else {
          console.log("❌ String enthält 'Keine Kacheln'");
        }
        if (allFoundTiles.length !== 0) {
          await handleCustomInfoAction(allFoundTiles, latlng.lng, latlng.lat);
          return; 
        }
      }

      if (true) {
        if (true) {
          if (latlng.lng <= 10.4) {
            const tileindex32 = calculateTileindexFromPoint(
              32,
              latlng.lng,
              latlng.lat
            );
            const tiles32 = lookupTileInMap(myTilesMap, tileindex32);
            console.log("tiles32: ", tiles32);
          } else {
            const tileindex32 = calculateTileindexFromPoint(
              32,
              latlng.lng,
              latlng.lat
            );
            const tileindex33 = calculateTileindexFromPoint(
              33,
              latlng.lng,
              latlng.lat
            );
            const tiles32 = lookupTileInMap(myTilesMap, tileindex32);
            const tiles33 = lookupTileInMap(myTilesMap, tileindex33);
            console.log("tiles32: ", tiles32);
            console.log("tiles33: ", tiles33);
          }
        }
      }

      updateMarkerData(window.theLatLng);
      handleGoButtonForMode(window.theLatLng);
    });
  }
  
  function updateMarkerData(newLatLng) {
    const latLngText = newLatLng
      ? `${newLatLng.lat.toFixed(6)}, ${newLatLng.lng.toFixed(6)}`
      : `0.000000, 0.000000`;
    const input = document.getElementById(`position_center_${type}`); 
    if (input) {
      input.value = latLngText;
    }
  }
   
  async function handleGoButtonForMode(latlng) {
    if (!latlng) {
      alert("Please place a marker first.");
      return;
    }

    if (typeof showLoadingSpinner === "function") showLoadingSpinner();

    let res; 
    let data; 

    try {
      const requestBody = buildRequestBody(latlng, optionsLast);

      const controller = new AbortController();
      const signal = controller.signal;
      
      const seconds = 3;
      const timeoutId = setTimeout(() => controller.abort(), seconds * 1000);

      try {
        res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestBody),          
          signal,
        });
        
        clearTimeout(timeoutId);

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`Fetch request aborted after ${seconds} seconds`);
          throw new Error(`Keine Daten empfangen nach ${seconds} Sekunden.`);
        } else {
          console.error('Fetch error:', error);
          throw new Error(`Keine Daten empfangen: ${error}`);
        }
      }

      if (!res.ok) {
        let errorText = await res.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.message || errorText;
        } catch (e) {         
        }
        throw new Error(
          `${label} API error: ${res.status} ${res.statusText} - ${errorText}`
        );
      }

      data = await res.json();
      
      const tilesData = extractTileData(data);

      if (!Array.isArray(tilesData) || tilesData.length === 0) {
        throw new Error(`No ${type} data found in response.`);
      }

      for (const tileData of tilesData) {
        let layer;
        if (typeof createLayerFromTileData === "function") {
          layer = createLayerFromTileData(tileData, optionsLast, latlng);
        } else {
          const base64Data = tileData.Data;
          const format = tileData.DataFormat?.toLowerCase() || "png";

          let mimeType = "image/png";
          if (format === "geotiff") mimeType = "image/tiff";
          else if (format === "jpeg" || format === "jpg")
            mimeType = "image/jpeg";

          const imageUrl = `data:${mimeType};base64,${base64Data}`;

          const bounds = [
            [tileData.BoundingBox.MinLat, tileData.BoundingBox.MinLon],
            [tileData.BoundingBox.MaxLat, tileData.BoundingBox.MaxLon],
          ];

          const pane = getOrCreatePane(map, type);

          layer = L.imageOverlay(imageUrl, bounds, { pane });
          layer.options.latLng = latlng;
        }

        const metadata = {
          Actuality: tileData.Actuality || null,
          Origin: tileData.Origin || null,
          Attribution: tileData.Attribution || null,
          TileIndex: tileData.TileIndex || null,
          latLng: latlng,
          optionsAtCreation: structuredClone(optionsLast),
        };
        const leaflet_id = drawTile(layer, metadata, latlng);

        saveLayers();

        if (true) {
          await saveSingleLayerInOPFS({ layer, ...metadata }, type);
          addTileToMap(myTilesMap, metadata, type, leaflet_id);
          saveTileMapInOPFS(myTilesMap, type);
          updateDataInSidepanel();
          console.log(" ", myTilesMap);
        }
      }
      window.activeMarker = null;
    } catch (err) {
      console.error(`${label} error:`, err);
      alert(`Fehler bei ${label}:\n` + err.message + `\n${apiUrl}`);
    } finally {
      if (typeof hideLoadingSpinner === "function") hideLoadingSpinner();
    }
  }
 
  function drawTile(layer, metadata, latLng) {   
    layer.on("add", () => {
      const img = layer.getElement?.();
      if (img) img.classList.add(`custom-${type}-tile`);
    });
    map.on("layerremove", function (e) {
      if (e.layer === layer) {        
        const img = e.layer.getElement?.();
        if (img) img.classList.remove(`custom-${type}-tile`);
      }
    });
   
    layer.name = `${label} @ ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(
      4
    )}, ${metadata?.Origin || "?"}`;
   
    const layerLabelHtml = `
      <details style="margin-top:4px;">
        <summary style="cursor:pointer;">
          ${label}: ${metadata?.TileIndex || "?"} ${metadata?.Origin || "?"}
        </summary>
        <div style="margin-left:10px;">
          ${buildTileInfo(metadata, metadata?.TileIndex || "?")}
        </div>
      </details>
    `;
    
    layer.addTo(map);
   
    MapStyleManager.applyFilterAndBlendMode(type, optionsLast.styleOptions);
    
    if (typeof layerControl !== "undefined") {
      layerControl.addOverlay(
        layer,
        layer.name,
        layerLabelHtml,
        type,
        metadata?.TileIndex,
        metadata?.Origin
      );
    }
    updateDataInSidepanel(); 

    return layer._leaflet_id;
  }

  function updateDataInSidepanel() {
    if (
      typeof sidepanel !== "undefined" &&
      typeof sidepanel.showOptions === "function"
    ) {
      const sidePanel = document.querySelector(".side-panel");
      const isVisible = !!(sidePanel && sidePanel.offsetParent !== null);
      if (isVisible) {
        const element = document.querySelector(".side-panel-title");
        if (
          element &&
          element.textContent.includes(
            "Daten"
          ) 
        ) {
          sidepanel.showData(type);
        }
      }
    }
  }
 
  function setupRectangleDrawingHandlers() {
    map.on("mousedown", onMouseDownForRectangle);
    map.on("mousemove", onMouseMoveForRectangle);
    map.on("mouseup", onMouseUpForRectangle);
  }

  function onMouseDownForRectangle(e) {    
    if (e.originalEvent.shiftKey && modeManager.get() === modeId) {
      isDrawingRectangle = true;
      startLatLng = e.latlng;
      map.dragging.disable(); 
      e.originalEvent.preventDefault(); 
    }
  }

  function onMouseMoveForRectangle(e) {
    if (isDrawingRectangle && startLatLng) {
      const currentLatLng = e.latlng;
      const bounds = L.latLngBounds(startLatLng, currentLatLng);

      if (currentRectangle) {
        currentRectangle.setBounds(bounds);
      } else {
        currentRectangle = L.rectangle(bounds, {
          color: "#ff7800",
          weight: 3,
          opacity: 0.5,
          fillOpacity: 0.2,
        }).addTo(map);
      }
    }
  }

  function onMouseUpForRectangle(e) {
    if (isDrawingRectangle) {
      isDrawingRectangle = false;
      map.dragging.enable(); 

      if (currentRectangle) {
        drawnRectangleBounds = currentRectangle.getBounds();
        map.removeLayer(currentRectangle); 
        currentRectangle = null; 

        console.log(
          "onMouseUpForRectangle drawnRectangleBounds: ",
          drawnRectangleBounds
        );

        showRectangleActionDialog(drawnRectangleBounds, e.containerPoint);
      }
      startLatLng = null;
    }
  }
  
  function movePointSouth(lat, km) {
    const earthRadiusKm = 6371;
    const latRad = (lat * Math.PI) / 180;
    const newLatRad = latRad - km / earthRadiusKm;
    return (newLatRad * 180) / Math.PI;
  }
 
  function movePointEast(lat, lon, km) {
    const earthRadiusKm = 6371;
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const newLonRad = lonRad + km / (earthRadiusKm * Math.cos(latRad));
    return (newLonRad * 180) / Math.PI;
  }
  
  async function fetchDataForAreaInRectangle(bounds, stepKm) {
    const north = bounds.getNorth();
    const west = bounds.getWest(); 
    const south = bounds.getSouth();
    const east = bounds.getEast();

    let currentRowLat = north;
    let rowCount = 1;

    // --- Outer loop for rows (moving South) ---
    while (currentRowLat >= south) {
      console.log(`--- Evaluating Row ${rowCount} ---`);
      let currentPointLon = west; 
      let pointsInRow = 0;
      let colCount = 1;

      // --- Inner loop for columns (moving East) ---
      while (currentPointLon <= east) {
        const currentPoint = L.latLng(currentRowLat, currentPointLon);
      
        if (!bounds.contains(currentPoint)) {
          console.log(
            `  Point (R${rowCount}C${colCount}) is OUT of bounds. Terminating column processing for Row ${rowCount}.`
          );
          break; 
        }
        
        console.log(
          `  Processing Point (R${rowCount}C${colCount}) (Confirmed In Bounds): Lat=${currentPoint.lat.toFixed(
            6
          )}, Lon=${currentPoint.lng.toFixed(6)}`
        );

        await handleGoButtonForMode(currentPoint);

        pointsInRow++;
        colCount++;

        currentPointLon = movePointEast(currentRowLat, currentPointLon, stepKm);
      }

      console.log(
        `--- Finished Row ${rowCount}. Total points in row: ${pointsInRow} ---`
      );

      // Move 1km south for the next row
      const prevLat = currentRowLat;
      currentRowLat = movePointSouth(currentRowLat, stepKm);
     
      if (currentRowLat < south) {
        break;
      }

      console.log(
        `  Moved ${stepKm}km South for next row. Previous Start Lat: ${prevLat.toFixed(
          6
        )}, New Start Lat: ${currentRowLat.toFixed(6)}`
      );
      rowCount++;
    }
  }
 
  function showRectangleActionDialog(bounds, clickPoint) {   
    let dialog = document.getElementById("rectangle-action-dialog");
    if (dialog) {
      dialog.remove();
    }

    dialog = document.createElement("div");
    dialog.id = "rectangle-action-dialog";
    dialog.style.position = "absolute";
    dialog.style.zIndex = "10000";
    dialog.style.backgroundColor = "white";
    dialog.style.border = "1px solid #ccc";
    dialog.style.padding = "10px";
    dialog.style.borderRadius = "5px";
    dialog.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
    dialog.style.whiteSpace = "nowrap";

    if (clickPoint) {
      dialog.style.left = `${clickPoint.x}px`;
      dialog.style.top = `${clickPoint.y}px`;
      dialog.style.transform = "translate(-50%, -100%)"; 
    } else {
      const mapCenter = map.getContainerPoint(map.getCenter());
      dialog.style.left = `${mapCenter.x}px`;
      dialog.style.top = `${mapCenter.y}px`;
      dialog.style.transform = "translate(-50%, -50%)";
    }

    const skm = calculateRectangleAreaInSqKm(bounds);
    console.log("calculateRectangleAreaInSqKm skm: ", skm);

    if (skm > 64) {
      alert("Der markierte Bereich ist größer as 64 Kacheln!");
      return;
    }

    dialog.innerHTML = `
      <h4 style="margin-top:0; margin-bottom: 8px;">Bereichs-Aktionen für ${label}</h4>
      <!--
      <p style="font-size:0.9em; margin-bottom: 12px;">Bounds: ${bounds
        .getSouthWest()
        .lat.toFixed(4)},${bounds.getSouthWest().lng.toFixed(4)} to ${bounds
      .getNorthEast()
      .lat.toFixed(4)},${bounds.getNorthEast().lng.toFixed(4)}</p>
      -->

      <p style="font-size:0.9em; margin-bottom: 12px;">${skm} km<sup>2</sup></p>


      <button id="fetch-data-rect" style="margin-right: 5px; padding: 5px 10px;">Kacheln für diesen Bereich laden</button>
      <button id="delete-layers-rect" style="margin-right: 5px; padding: 5px 10px;">TODO: Kacheln in diesem Bereich löschen</button>
      <button id="cancel-rect-action" style="padding: 5px 10px;">Abbruch</button>
    `;

    document.body.appendChild(dialog);

    document
      .getElementById("fetch-data-rect")
      .addEventListener("click", async () => {       
        console.log("Fetching data for rectangle:", bounds);
        dialog.remove(); 

        if (typeof showLoadingSpinner === "function") showLoadingSpinner();
        try {
          await fetchDataForAreaInRectangle(bounds, 1); 
          alert(`Kacheln geladen für den Bereich: ${bounds.toBBoxString()}`);
        } catch (error) {
          console.error("Error fetching data for area:", error);
          alert(`Fehler beim Laden der Kacheln:\n${error.message}`);
        } finally {
          if (typeof hideLoadingSpinner === "function") hideLoadingSpinner();
        }
        drawnRectangleBounds = null;
      });

    document
      .getElementById("delete-layers-rect")
      .addEventListener("click", async () => {
        console.log("Deleting layers in rectangle:", bounds);

        if (true) {
          const stepKm = 1;
          const north = bounds.getNorth();
          const west = bounds.getWest(); 
          const south = bounds.getSouth();
          const east = bounds.getEast();

          let currentRowLat = north; 
          let rowCount = 1;

          let totalCount = 0;
          let theTilesToBeDeleted = []; 

          // --- Outer loop for rows (moving South) ---
          while (currentRowLat >= south) {
            console.log(`--- Evaluating Row ${rowCount} ---`);
            let currentPointLon = west;
            let pointsInRow = 0;
            let colCount = 1;

            // --- Inner loop for columns (moving East) ---
            while (currentPointLon <= east) {
              const currentPoint = L.latLng(currentRowLat, currentPointLon);
              
              if (!bounds.contains(currentPoint)) {
                console.log(
                  `  Point (R${rowCount}C${colCount}) is OUT of bounds. Terminating column processing for Row ${rowCount}.`
                );
                break; 
              }

              console.log(
                `  Processing Point (R${rowCount}C${colCount}) (Confirmed In Bounds): Lat=${currentPoint.lat.toFixed(
                  6
                )}, Lon=${currentPoint.lng.toFixed(6)}`
              );

              console.log("currentPoint: ", currentPoint);

              const theTiles = getTiles(
                myTilesMap,
                currentPoint.lng,
                currentPoint.lat
              );

              theTilesToBeDeleted.push(...theTiles);
              totalCount += theTiles.length;

              console.log("theTiles: ", theTiles);

              pointsInRow++;
              colCount++;

              currentPointLon = movePointEast(
                currentRowLat,
                currentPointLon,
                stepKm
              );
            }

            console.log(
              `--- Finished Row ${rowCount}. Total points in row: ${pointsInRow} ---`
            );
           
            const prevLat = currentRowLat;
            currentRowLat = movePointSouth(currentRowLat, stepKm);

            // If we've moved past the southern boundary, exit the loop
            if (currentRowLat < south) {
              break;
            }

            console.log(
              `  Moved ${stepKm}km South for next row. Previous Start Lat: ${prevLat.toFixed(
                6
              )}, New Start Lat: ${currentRowLat.toFixed(6)}`
            );
            rowCount++;
          }

          console.log("totalCount: ", totalCount, theTilesToBeDeleted);

          theTilesToBeDeleted.forEach((tile) => {           
            removeLayerByLeafletId(tile.leaflet_id);
          
            remove(type + "_files", tile.filename);

            if (myTilesMap.has(tile.tile.TileIndex)) {
              myTilesMap.delete(tile.tile.TileIndex);
              console.log("deleted from myTilesMap key: ", tile.tile.TileIndex);
            }
          });
          
          saveTileMapInOPFS(myTilesMap, type);
        }

        dialog.remove();

        drawnRectangleBounds = null; 
      });

    document
      .getElementById("cancel-rect-action")
      .addEventListener("click", () => {
        console.log("Rectangle action cancelled.");
        dialog.remove();
        drawnRectangleBounds = null; 
      });
    
    dialog.querySelectorAll("button, p, h4").forEach((el) => {
      el.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      el.addEventListener("wheel", (e) => {
        e.stopPropagation();
      });
    });
  }
 
  const managerPublicApi = {
    init: () => {
      loadSettings(); 
      MapStyleManager.applyFilterAndBlendMode(
        type,
        optionsLast.styleOptions
      );
      handleMapClick(); 
      setupRectangleDrawingHandlers();

      const idSuffix = getUniqueIdSuffix(); 

      if (typeof createSidepanel === "function") {        
        window.sidepanel = createSidepanel({
          type: type,
          label: label,
          loadFn: managerPublicApi.loadLayers.bind(managerPublicApi), 
          saveFn: saveLayers, 
          panelHtmlFn: () => getPanelHtml(idSuffix),
          panelHelperFn: () => getPanelHelper(idSuffix),
          mode: modeId,
          array: null, // myLayers,
          tilesMap: myTilesMap,
          geojsonLayers: null, 
          onAction: ({ type: actionType, id, name, layers }) => {
            if (actionType === "update") {
              const latlng = extractLatLngFromNameHTML(name);
              if (latlng) simulateClickAtLatLng(map, latlng);
            } else if (actionType === "redraw") {
              redrawTiles();
            }
          },
          managerPublicApi: managerPublicApi,
        });
      }
      if (typeof createLayerControl === "function") {
        // Assign to window scope if 'layerControl' is a global singleton
        // window.layerControl = createLayerControl({ ...
        // das war einmal 
      }          
    },

    addCustomControls() {
      if (typeof makeMenuEntry !== "undefined") {
        makeMenuEntry(
          type, 
          modeId, 
          null, // myLayers, // Array der von diesem Typ verwalteten Layer // TODO map
          true, 
          label, 
          "#",
          true, 
          () => {
            // --- OnActivate ---
            if (typeof layerControl !== "undefined") {
              layerControl.toggleRadioByType(type);
            }

            if (window.mode !== undefined) {
              window.mode = window.MODE_NONE; 
            }
            if (typeof modeManager !== "undefined") {
              modeManager.set(modeId);
            }
          },
          () => {
            // --- OnDeactivate ---
            if (typeof modeManager !== "undefined") {
              modeManager.resetMode();
            }

            updateMarkerData();
            if (window.activeMarker && map.hasLayer(window.activeMarker)) {
              map.removeLayer(window.activeMarker);
              window.activeMarker = null;
            }
          },
          () => myLayers.length, 
          "my-custom-class" 
        );
      }
    },

    removeLayersFromMap:  async function () {
      console.log("new function: removeLayersFromMap()");

      for (const tilesArray of myTilesMap.values()) {
        for (const tile of tilesArray) {
          console.log("tile: ", tile);
          console.log("tile.leaflet_id: ", tile.leaflet_id);
        }
      }

      for (const tilesArray of myTilesMap.values()) {
        for (const tile of tilesArray) {
          removeLayerById(tile.leaflet_id);
        }
      }
    },

    loadLayers: async function () {

      if (isOpfsAvailable) managerPublicApi.loadLayersFromOPFS();
      else {
        managerPublicApi.loadLayersFromLocalStorage();
      }
    },

    loadLayersFromOPFS: async function () {
      try {    
        if (map_options_last && !map_options_last.storeTiles) 
          return []; 

        myTilesMap.clear();

        const content = await retrieve("", TYPE_MASTER_NAME);
        
        if (content === "") {
          return [];
        }

        const parsedData = JSON.parse(content);       

        if (!Array.isArray(parsedData) || parsedData.length === 0) {         
          return [];
        }

        const ccontent = await retrieve("", TYPE_MASTER_NAME);
        
        const newTilesData = JSON.parse(ccontent);        
        
        myTilesMap.clear();

        for (const [key, value] of newTilesData) {
          myTilesMap.set(key, value);
        }

        for (const [key, value] of myTilesMap) {
          for (const entry of value) {
            try {
              const content = await retrieve(TYPE_DIR_NAME, entry.filename);

              if (content && content.trim().length > 0) {
                const tile = JSON.parse(content); 

                try {
                  latLng = calculateLatLng(entry.tile.TileIndex);
                } catch (err) {
                  console.warn(
                    "⚠️ Konnte LatLng aus TileIndex nicht berechnen:",
                    entry.TileIndex,
                    err
                  );
                }

                if (tile?.type === "tile" && tile.Data) {
                  const format = tile.DataFormat?.toLowerCase() || "png";
                  let mimeType = "image/png";
                  if (format === "geotiff") mimeType = "image/tiff";
                  else if (["jpeg", "jpg"].includes(format))
                    mimeType = "image/jpeg";

                  const imageUrl = `data:${mimeType};base64,${tile.Data}`;
                  const bounds = [
                    [tile.BoundingBox.MinLat, tile.BoundingBox.MinLon],
                    [tile.BoundingBox.MaxLat, tile.BoundingBox.MaxLon],
                  ];

                  const pane = getOrCreatePane(map, type);

                  const layer = L.imageOverlay(imageUrl, bounds, { pane });

                  const metadata = {
                    Actuality: entry.Actuality || tile.Actuality || null,
                    Origin: entry.Origin || tile.Origin || null,
                    Attribution: entry.Attribution || tile.Attribution || null,
                    TileIndex: entry.TileIndex || tile.TileIndex || null,
                    latLng: latLng,
                    optionsAtCreation:
                      entry.optionsAtCreation || structuredClone(optionsLast), 
                  };

                  const leaflet_id = drawTile(layer, metadata, latLng);
                  
                  entry.leaflet_id = leaflet_id;
            
                } else if (
                  tile.type === "geojson" &&
                  typeof createLayerFromTileData === "function"
                ) {
                  const tileDataForCreate = {
                    geojson: tile.data,
                    ...entry, 
                  };
                  layer = createLayerFromTileData(
                    tileDataForCreate,
                    optionsLast,
                    latLng
                  );

                  const metadata = {
                    Actuality: entry.Actuality || tile.Actuality || null,
                    Origin: entry.Origin || tile.Origin || null,
                    Attribution: entry.Attribution || tile.Attribution || null,
                    TileIndex: entry.TileIndex || tile.TileIndex || null,
                    latLng: latLng,
                    optionsAtCreation:
                      entry.optionsAtCreation || structuredClone(optionsLast), 
                  };

                  const leaflet_id = drawTile(layer, metadata, latLng);
                
                  entry.leaflet_id = leaflet_id;
                }
              } else {
                console.warn(
                  "missing file, filename: ",
                  entry.filename,
                  TYPE_DIR_NAME
                );
              }
            } catch (err) {
              console.error(
                `❌ Fehler beim Laden von Layer-Datei ${entry.filename}:`,
                err
              );
            }
          }
        }

        MapStyleManager.applyFilterAndBlendMode(
          type,
          optionsLast.styleOptions
        );
      } catch (err) {
        console.error(`❌ Fehler beim Laden der ${type} Layer aus OPFS:`, err);        
        managerPublicApi.loadLayersFromLocalStorage();
      }
    },
 
    getOptions: () => optionsLast,
    
    triggerRedraw: () => {
      redrawTiles();
    },
   
    forceRedraw: () => {
      fetchForRedraw = true;
      console.log("forceRedraw calling redrawLayers");
      redrawTiles();
    },

    triggerSavelayers: () => {
      saveLayers();
    },
    
    _saveTileMapInternal: saveTileMapInOPFS,

    _removeSingleLayerInOPFS: (type, tileId, origin) => {      
      try {
        const directoryName = `${type}_files`;
        const fileName = `${type}_${tileId}_${origin}.json`;
        remove(directoryName, fileName);
        console.log(`🗑️ Layer-Datei "${fileName}" gelöscht.`);
      } catch (err) {
        if (err.name === "NotFoundError") {
          console.warn(`⚠️ Datei "${fileName}" nicht im Ordner gefunden.`);
        } else {
          throw err;
        }
      }
    },
  };

  return managerPublicApi;
}
