// customdata_1.js

(function (global) {

  global.TEXT_CUSTOMDATA_LABEL = "Eigene Objekte";

  let _myCustomdataMap = new Map();

  const defaultLineStyle = {
    color: "#0078FF",
    weight: 5,
    opacity: 0.75,
    dashArray: "5, 15",
    trackColor: "#0056b3", 
  };
  const defaultPointStyle = {
    radius: 8,
    fillColor: "#ff0000",
    color: "#000", 
    weight: 1, 
    opacity: 1,
    fillOpacity: 0.8,
  };

  const CUSTOMDATA_OPTIONS_DEFAULTS = {
    styleOptions: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      opacity: 100,
      blendMode: "normal",
    },
    lineStyle: defaultLineStyle,
    pointStyle: defaultPointStyle,
  };
  
  let _customDataOptionsLast = { ...CUSTOMDATA_OPTIONS_DEFAULTS };

  let fileInput = null;

  const CUSTOMDATA_DIR_NAME = "customdata_files";
  const CUSTOMDATA_MASTER_NAME = "customdata_master.json";
  
  global.initcustomdata = async function () {
    
    await _loadSettings();

    await loadCustomData();
    
    applyGlobalCustomDataStyleToPane();

    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";     
      fileInput.accept = ".gpx, .kml, .json, .geojson";
      fileInput.style.display = "none"; 
      document.body.appendChild(fileInput); 
      fileInput.addEventListener("change", handleFileSelect); 
    }

    makeCustomDataMenu();
   
    if (typeof global.createSidepanel === "function") {
      global.sidepanel = global.createSidepanel({
        type: "customdata", 
        label: global.TEXT_CUSTOMDATA_LABEL, 
        loadFn: loadCustomDataLayers, 
        saveFn: saveCustomDataLayers, 
        panelHtmlFn: (idSuffix) => global.getCustomDataPanelHtml(idSuffix), 
        panelHelperFn: (idSuffix) => global.initCustomDataPanelHelper(idSuffix), 
        mode: global.MODE_NONE, 
        array: _myCustomdataMap, 
        onAction: ({ type: actionType, name }) => {
          console.log(`Sidepanel action: ${actionType}, Name: ${name}`);
        },
      });
    }
   
    global.getCustomDataLayers = () => _myCustomdataMap;

    global.toggleCustomDataLayerVisibility = async (id, visible) => {
      const item = _myCustomdataMap.get(id);
      if (item) {
        item.visible = visible;
        if (item.layer && global.map) {
          // Ensure layer object exists and map is defined
          if (visible && !global.map.hasLayer(item.layer)) {
            item.layer.addTo(global.map);
          } else if (!visible && global.map.hasLayer(item.layer)) {
            global.map.removeLayer(item.layer);
          }
        } else if (!item.layer && visible) {
          console.warn(
            `Layer object for ID ${id} is missing, cannot toggle visibility on map.`
          );
        }

        if (
          typeof global.sidepanel !== "undefined" &&
          global.sidepanel.isVisible() &&
          global.sidepanel.currentType === "customdata"
        ) {
          global.sidepanel.showCustomData(); 
        }
      } else {
        console.warn(`Item with ID ${id} not found for visibility toggle.`);
      }
    };

    global.removeCustomDataLayer = async (id) => {
      const item = _myCustomdataMap.get(id);
      if (item) {
        if (item.layer && global.map && global.map.hasLayer(item.layer)) {
          
          global.map.removeLayer(item.layer);
        }
        if (item.opfsPath) {
          const fileName = item.opfsPath.split("/").pop();
          await deleteCustomDataFile(fileName);
        }
        _myCustomdataMap.delete(id); 
        await saveMetadata();
        console.log(
          `CustomData layer "${item.name}" (ID: ${id}) removed from map and OPFS.`
        );

        if (
          typeof global.sidepanel !== "undefined" &&
          global.sidepanel.isVisible() &&
          global.sidepanel.currentType === "customdata"
        ) {
          global.sidepanel.showCustomData("customdata");
        }
      } else {
        console.warn(`Item with ID ${id} not found to remove.`);
      }
    };
  };
 
  async function clearAllCustomDataLayers() {
    if (
      !confirm(
        "Wirklich alle geladenen CUSTOMDATA-Objekte von der Karte entfernen und den lokalen Speicher leeren?"
      )
    ) {
      return;
    }

    _myCustomdataMap.forEach((item) => {
      if (item.layer && global.map.hasLayer(item.layer)) {
        global.map.removeLayer(item.layer);
      }
    });
 
    for (const item of _myCustomdataMap.values()) {
      if (item.opfsPath) {
        const fileNameInOpfs = item.opfsPath.split("/").pop(); 
        await deleteCustomDataFile(fileNameInOpfs);
      }
    }

    _myCustomdataMap.clear(); 

    await saveMetadata(); 
   
    _customDataOptionsLast = { ...CUSTOMDATA_OPTIONS_DEFAULTS };
    await _saveSettings();
    applyGlobalCustomDataStyleToPane(); 

    console.log(
      "Alle CUSTOMDATA-Objekte von der Karte entfernt und lokaler Speicher geleert."
    );
   
    if (
      typeof global.sidepanel !== "undefined" &&
      global.sidepanel.isVisible() &&
      global.sidepanel.currentType === "customdata"
    ) {
      global.sidepanel.showCustomData("customdata");
    }
  }

  function displayCustomDataGeoJson(
    geojson,
    fileName,
    id,
    opfsPath,
    fileType,
    initialVisible = true,
    loadedStyle = null
  ) {
    if (!geojson || !global.map) {
      console.error("Ungültige GeoJSON-Daten oder Karte nicht initialisiert.");
      return null;
    }

    const pane = getOrCreatePane(map, "customdata");
    if (!pane) {
      console.error(
        "Failed to get or create Leaflet pane for customdata layers. Cannot display GeoJSON."
      );
      return null;
    }
   
    let layerMetadata = _myCustomdataMap.get(id);
   
    if (!layerMetadata) {
      layerMetadata = {
        id: id,
        name: fileName,
        opfsPath: opfsPath,
        layer: null, 
        visible: initialVisible,
        fileType: fileType,
        style: {
          line: {
            ..._customDataOptionsLast.lineStyle,
            ...(loadedStyle && loadedStyle.line ? loadedStyle.line : {}),
          },
          point: {
            ..._customDataOptionsLast.pointStyle,
            ...(loadedStyle && loadedStyle.point ? loadedStyle.point : {}),
          },
        },
      };
    } else {      
      layerMetadata.style = layerMetadata.style || {};
      layerMetadata.style.line = layerMetadata.style.line || {};
      layerMetadata.style.point = layerMetadata.style.point || {};
      layerMetadata.style.line = {
        ..._customDataOptionsLast.lineStyle,
        ...layerMetadata.style.line,
      };
      layerMetadata.style.point = {
        ..._customDataOptionsLast.pointStyle,
        ...layerMetadata.style.point,
      };
      
      layerMetadata.name = fileName;
      layerMetadata.opfsPath = opfsPath;
      layerMetadata.fileType = fileType;
    
      layerMetadata.visible =
        typeof initialVisible === "boolean"
          ? initialVisible
          : layerMetadata.visible;
    }

    const effectiveLineStyle = layerMetadata.style.line;
    const effectivePointStyle = layerMetadata.style.point;

    const customdataLayer = L.geoJSON(geojson, {
      pane: pane, 
      style: function (feature) {
        if (
          feature.geometry.type === "LineString" ||
          feature.geometry.type === "MultiLineString"
        ) {
          let styleToApply = {
            color: effectiveLineStyle.color,
            weight: effectiveLineStyle.weight,
            opacity: effectiveLineStyle.opacity,
            dashArray: effectiveLineStyle.dashArray || null, 
          };

          if (
            feature.properties &&
            (feature.properties.type === "track" ||
              feature.properties.hasOwnProperty("trackseg") ||
              feature.properties.hasOwnProperty("gx_track"))
          ) {
            styleToApply.dashArray = null;
            styleToApply.color = effectiveLineStyle.trackColor; 
          }
          return styleToApply;
        }
        return {}; 
      },
      pointToLayer: function (feature, latlng) {
        if (feature.geometry.type === "Point") {
          if (feature.properties && feature.properties.icon) {
            return L.marker(latlng, {
              pane: pane,
              icon: L.icon({
                pane: pane,
                iconUrl: feature.properties.icon,
                iconSize: [32, 32],
                iconAnchor: [16, 32], 
                popupAnchor: [0, -32], 
              }),
            });
          }

          return L.circleMarker(latlng, {
            radius: effectivePointStyle.radius,
            fillColor: effectivePointStyle.fillColor,
            color: effectivePointStyle.color,
            weight: effectivePointStyle.weight,
            opacity: effectivePointStyle.opacity,
            fillOpacity: effectivePointStyle.fillOpacity,
            pane: pane,
          });
        }
        return null; 
      },
      onEachFeature: function (feature, layer) {       
        let popupContent = "";
        if (feature.properties) {
          if (feature.properties.name) {
            popupContent += `<b>${feature.properties.name}</b><br>`;
          }
          
          if (feature.properties.description) {            
            popupContent += `${feature.properties.description}<br>`;
          } else if (feature.properties.desc) {           
            popupContent += `${feature.properties.desc}<br>`;
          }
          if (feature.properties.sym) {
            popupContent += `Symbol: ${feature.properties.sym}<br>`;
          }
          if (feature.properties.cmt) {
            popupContent += `Kommentar: ${feature.properties.cmt}<br>`;
          }
          if (feature.properties.ele !== undefined) {
            popupContent += `Höhe: ${feature.properties.ele} m<br>`;
          }
          if (feature.properties.time) {
            try {
              popupContent += `Zeit: ${new Date(
                feature.properties.time
              ).toLocaleString()}<br>`;
            } catch (e) {
            }
          }
          // If no specific content, add a few generic properties (up to 3)
          if (!popupContent && Object.keys(feature.properties).length > 0) {
            let genericProps = Object.keys(feature.properties)
              .filter(
                (key) =>
                  key !== "name" &&
                  key !== "description" &&
                  key !== "desc" &&
                  key !== "sym" &&
                  key !== "cmt" &&
                  key !== "ele" &&
                  key !== "time" &&
                  key !== "icon"
              )
              .slice(0, 3); // Show max 3 other properties
            if (genericProps.length > 0) {
              popupContent += "Weitere Eigenschaften:<br>";
              genericProps.forEach((key) => {
                popupContent += `&nbsp;&nbsp;<b>${key}</b>: ${feature.properties[key]}<br>`;
              });
            }
          }
        }

        if (popupContent) {
          layer.bindPopup(popupContent);
        }
      },
    });

    layerMetadata.layer = customdataLayer;

    if (layerMetadata.visible) {
      customdataLayer.addTo(global.map);
     
      if (      
        customdataLayer.getBounds().isValid() &&
              !global.map.getBounds().contains(customdataLayer.getBounds())
      ) {
        global.map.fitBounds(customdataLayer.getBounds());
      } else if (!customdataLayer.getBounds().isValid()) {
        console.warn(
          `Die hochgeladene Datei "${fileName}" enthält keine gültigen Geometrien zum Anpassen der Kartenansicht.`
        );
      }
    }
  
    _myCustomdataMap.set(id, layerMetadata);
   
    if (
      typeof global.sidepanel !== "undefined" &&
      global.sidepanel.isVisible() &&
      global.sidepanel.currentType === "customdata"
    ) {
      // TODO !!! Achtung, nur wenn Übersicht abgezeigt wird, dann diese aktualisiert anzeigen

      // auskommentiert, damit die komplette Ansicht sichtbar bleibt !!!
      //global.sidepanel.showCustomData("customdata"); // Re-display the list of CUSTOMDATA files
    }

    return customdataLayer;
  }
  
  function parseFileContentToGeoJson(fileContent, fileType, fileName) {
    let geojson = null;
    const parser = new DOMParser(); 

    try {
      if (fileType === "gpx") {
        const gpxDom = parser.parseFromString(fileContent, "text/xml");

        const errorNode = gpxDom.querySelector("parsererror");
        if (errorNode) {
          console.error(
            "Fehler beim Parsen der GPX-XML-Daten:",
            errorNode.textContent
          );
          alert(
            "Fehler beim Parsen der GPX-Datei. Überprüfen Sie das XML-Format."
          );
          return null;
        }

        if (typeof toGeoJSON === "undefined" || !toGeoJSON.gpx) {
          console.error(
            "Die 'toGeoJSON'-Bibliothek oder die GPX-Methode ist nicht verfügbar. Stelle sicher, dass togeojson.js geladen ist."
          );
          alert(
            "Fehler: Konvertierungsbibliothek für GPX nicht gefunden. GPX kann nicht verarbeitet werden."
          );
          return null;
        }
        geojson = toGeoJSON.gpx(gpxDom);
      } else if (fileType === "kml") {
        const kmlDom = parser.parseFromString(fileContent, "text/xml");

        const errorNode = kmlDom.querySelector("parsererror");
        if (errorNode) {
          console.error(
            "Fehler beim Parsen der KML-XML-Daten:",
            errorNode.textContent
          );
          alert(
            "Fehler beim Parsen der KML-Datei. Überprüfen Sie das XML-Format."
          );
          return null;
        }

        if (typeof toGeoJSON === "undefined" || !toGeoJSON.kml) {
          console.error(
            "Die 'toGeoJSON'-Bibliothek oder die KML-Methode ist nicht verfügbar. Stelle sicher, dass togeojson.js geladen ist."
          );
          alert(
            "Fehler: Konvertierungsbibliothek für KML nicht gefunden. KML kann nicht verarbeitet werden."
          );
          return null;
        }
        geojson = toGeoJSON.kml(kmlDom);
      } else if (fileType === "json" || fileType === "geojson") {
        geojson = JSON.parse(fileContent);
        if (
          !geojson ||
          !geojson.type ||
          ![
            "FeatureCollection",
            "Feature",
            "GeometryCollection",
            "Point",
            "LineString",
            "Polygon",
            "MultiPoint",
            "MultiLineString",
            "MultiPolygon",
          ].includes(geojson.type)
        ) {
          console.error(
            `Die Datei "${fileName}" ist ungültiges GeoJSON oder hat einen unbekannten Typ.`
          );
          alert(
            `Die ausgewählte Datei "${fileName}" ist ungültiges GeoJSON oder hat einen unbekannten Typ.`
          );
          return null;
        }
      } else {
        alert("Interner Fehler: Unbekannter Dateityp zur Verarbeitung.");
        return null;
      }
     
      if (
        geojson &&
        geojson.type === "FeatureCollection" &&
        (!geojson.features || geojson.features.length === 0)
      ) {
        console.warn(
          `Datei "${fileName}" wurde geparst, aber es wurden keine GeoJSON-Features gefunden.`
        );
        alert(
          `Die Datei "${fileName}" enthält keine interpretierbaren Geodaten (Tracks, Routen, Wegpunkte, Features).`
        );
        return null;
      }
      if (!geojson) {
        console.warn(
          `Datei "${fileName}" konnte nicht in ein GeoJSON-Objekt konvertiert/gelesen werden.`
        );
        alert(
          `Die Datei "${fileName}" konnte nicht als gültiges GeoJSON gelesen werden.`
        );
        return null;
      }
      return geojson;
    } catch (error) {
      console.error(
        `Fehler beim Parsen oder Verarbeiten der Datei "${fileName}" (${fileType}):`,
        error
      );
      alert(
        `Ein unerwarteter Fehler ist beim Verarbeiten der Datei "${fileName}" aufgetreten: ${error.message}`
      );
      return null;
    }
  }
 
  async function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) {
      console.log("Keine Datei ausgewählt.");
      return;
    }

    const file = files[0];
    const fileName = file.name;
    const fileExtension = getFileExtension(fileName);
    
    if (!["gpx", "json", "geojson", "kml"].includes(fileExtension)) {
      alert(
        "Bitte wählen Sie eine Datei mit der Endung .gpx, .kml, .json oder .geojson aus."
      );
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = async function (e) {
      const fileContent = e.target.result;
      const fileId = generateUUID(); 
      const fileNameInOpfs = `${fileId}.${fileExtension}`; 
      const opfsPath = `${CUSTOMDATA_DIR_NAME}/${fileNameInOpfs}`; 

      const geojson = parseFileContentToGeoJson(
        fileContent,
        fileExtension,
        fileName
      );

      if (geojson) {
        displayCustomDataGeoJson(
          geojson,
          fileName,
          fileId,
          opfsPath,
          fileExtension,
          true
        );
        
        persist(CUSTOMDATA_DIR_NAME, fileNameInOpfs, fileContent);

        await saveMetadata();
      }

      event.target.value = ""; 
    };

    reader.onerror = function (e) {
      console.error(
        `Fehler beim Lesen der Datei "${fileName}" mit FileReader:`,
        e
      );
      alert(`Fehler beim Lesen der Datei "${fileName}".`);
      event.target.value = "";
    };

    reader.readAsText(file);
  }

  function applyGlobalCustomDataStyleToPane() {
    if (!global.map || !global.map.getPane) {      
      return;
    }
  
    let customDataPane = getOrCreatePane(map, "customdata");
   
    if (!customDataPane) {
      console.warn(
        "Leaflet pane 'customdata' could not be obtained or created. Skipping global style application."
      );
      return;
    }

    const styleOptions = _customDataOptionsLast.styleOptions;
    if (!styleOptions) {
      console.warn("CustomData global style options not loaded.");
      return;
    }

    let filterString = "";
    if (styleOptions.brightness !== 100)
      filterString += `brightness(${styleOptions.brightness}%) `;
    if (styleOptions.contrast !== 100)
      filterString += `contrast(${styleOptions.contrast}%) `;
    if (styleOptions.saturation !== 100)
      filterString += `saturate(${styleOptions.saturation}%) `;

    // console.log("filterString: ",filterString);
    /* TODO !!! */
    customDataPane.style.filter = filterString.trim();
    customDataPane.style.opacity = (styleOptions.opacity / 100).toFixed(2);
    customDataPane.style.mixBlendMode = styleOptions.blendMode;    
  }
  
  global.redrawCustomData = async function () {
    console.log("Redrawing all custom data layers...");

    const currentLayers = Array.from(_myCustomdataMap.values()); 
    _myCustomdataMap.clear(); 

    for (const item of currentLayers) {
      if (item.layer && global.map && global.map.hasLayer(item.layer)) {
        global.map.removeLayer(item.layer);
        
      }

      if (item.opfsPath) {
        const fileName = item.opfsPath.split("/").pop();
        const fileContent = await loadCustomDataFile(fileName);

        if (fileContent) {          
          const geojson = parseFileContentToGeoJson(
            fileContent,
            item.fileType,
            item.name
          );

          if (geojson) {    
            displayCustomDataGeoJson(
              geojson,
              item.name,
              item.id,
              item.opfsPath,
              item.fileType,
              item.visible,
              item.style
            );
          }
        } else {
          console.warn(
            `Could not read content for layer "${item.name}" (ID: ${item.id}) from OPFS. Skipping redraw.`
          );
        }
      } else {
        console.warn(
          `OPFS path missing for layer "${item.name}" (ID: ${item.id}). Skipping redraw.`
        );
      }
    }
   
    applyGlobalCustomDataStyleToPane();

    await saveMetadata();

    console.log("Finished redrawing all custom data layers.");
  };

  const getOverallCustomDataVisibility = () => {
    return Array.from(_myCustomdataMap.values()).some((item) => item.visible);
  };
  
  function makeCustomDataMenu() {
    // if (window.innerWidth >= 1280) {
    if (window.innerWidth > 1024) {
      createDesktopMenuEntry();
    } else {
      createHamburgerMenuEntry();
    }
  }

  function createDesktopMenuEntry() {
    let nav = document.querySelector("nav");
    if (!nav) {
      nav = document.createElement("nav");
      document.body.insertBefore(nav, document.body.firstChild);
    }
    nav.classList.add("isNotMobile");

    let ul = nav.querySelector("ul");
    if (!ul) {
      ul = document.createElement("ul");
      nav.appendChild(ul);
    }

    const li = document.createElement("li");
    li.classList.add("dropdown");

    const a = document.createElement("a");
    a.href = "javascript:void(0);";
    a.innerHTML = global.TEXT_CUSTOMDATA_LABEL; 
    a.classList.add("dropbtn");
    a.classList.add("customdata-upload-menu-item");

    const submenu = document.createElement("ul");
    submenu.classList.add("submenu");
    li._submenu = submenu; 
   
    const addSubmenuButton = (
      label,
      handler,
      iconHtml = "",
      specificClass = ""
    ) => {
      const item = document.createElement("li");
      const btn = document.createElement("button");
      btn.innerHTML = iconHtml ? `${iconHtml} ${label}` : label;
      if (specificClass) btn.classList.add(specificClass);
      
      if (!window.matchMedia("(hover: none)").matches) {
        // If not a touch device
        btn.addEventListener(
          "mouseenter",
          () => (btn.style.background = "#f0f0f0")
        );
        btn.addEventListener(
          "mouseleave",
          () => (btn.style.background = "transparent")
        );
      }

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handler();
        // Hide menu on click for touch devices or after action (desktop for explicit menu closing)
        if (window.matchMedia("(hover: none)").matches) {
          // If it's a touch device
          if (li._submenu) {
            li._submenu.style.display = "none"; // Explicitly hide submenu
          }
        } else {
          // For desktop with hover, attempt to "lose focus" of the parent dropdown
          // by temporarily disabling pointer events. This causes the submenu to hide.
          li.style.pointerEvents = "none";
          setTimeout(() => {
            li.style.pointerEvents = "";
          }, 100);
        }
      });
      item.appendChild(btn);
      submenu.appendChild(item);
      return btn;
    };

    // --- Submenu Entries ---
    // Importieren
    addSubmenuButton(
      "Importieren",
      () => {
        fileInput.click();
      },
      ""
    );

    // Sichtbarkeit
    const visibilityBtn = addSubmenuButton(
      "Sichtbarkeit",
      async () => {        
        const targetVisibility = !getOverallCustomDataVisibility();
        for (const item of _myCustomdataMap.values()) {
          await global.toggleCustomDataLayerVisibility(
            item.id,
            targetVisibility
          );
        }        
        visibilityBtn.innerHTML = targetVisibility
          ? '<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit'
          : '<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit: unsichtbar';
      },
      "", 
      "customdata-visibility-btn"
    );
    visibilityBtn.innerHTML = getOverallCustomDataVisibility()
      ? '<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit'
      : '<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit: unsichtbar';

    // Konfiguration
    addSubmenuButton(
      "Konfiguration",
      () => {
        if (
          typeof global.sidepanel !== "undefined" &&
          global.sidepanel.showCustomDataConfiguration
        ) {
          global.sidepanel.showCustomDataConfiguration("customdata");
        }
      },
      ""
    );

    // Objektübersicht (Data Panel)
    addSubmenuButton(
      "Objektübersicht",
      () => {
        if (
          typeof global.sidepanel !== "undefined" &&
          global.sidepanel.showCustomData
        ) {
          global.sidepanel.showCustomData("customdata");
        }
      },
      ""
    );

    // Alle eigenen Objekte löschen
    addSubmenuButton(
      "Alle eigenen Objekte löschen",
      async () => {
        console.log("Desktop Submenu: Alle eigenen Objekte löschen clicked.");
        await clearAllCustomDataLayers();
        visibilityBtn.innerHTML = getOverallCustomDataVisibility()
          ? '<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit'
          : '<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit: unsichtbar';
      },
      "", // "🗑️"
    );

    // Hilfe
    addSubmenuButton("Hilfe", () => {
      if (
        typeof global.sidepanel !== "undefined" &&
        global.sidepanel.showHelpHtml
      ) {
        global.sidepanel.showHelpHtml("customdata");
      }
    });
   
    a.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof global.deactivateElevationButtons === "function") {
        global.deactivateElevationButtons();
      }

      const isTouchDevice = window.matchMedia("(hover: none)").matches;
      if (isTouchDevice) {       
        document.querySelectorAll("nav ul .submenu").forEach((sub) => {
          if (sub !== submenu) {
            sub.style.display = "none";
          }
        });
        submenu.style.display =
          submenu.style.display === "flex" ? "none" : "flex";
      }    
    });

    li.appendChild(a);
    li.appendChild(submenu);
    ul.appendChild(li);
    return a;
  }

  function createHamburgerMenuEntry() {
    let nav = document.querySelector("nav");
    if (!nav) {
      nav = document.createElement("nav");
      document.body.insertBefore(nav, document.body.firstChild);
    }
    nav.classList.add("mobile-nav");

    let panel = document.getElementById("hamburger-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "hamburger-panel";
      panel.style.display = "none";
      document.body.insertBefore(panel, nav.nextSibling);

      const content = document.createElement("div");
      content.id = "hamburger-content";
      panel.appendChild(content);
    }

    // Create hamburger icon inside nav if it doesn't exist
    if (!document.getElementById("hamburger-toggle")) {
      const hamburgerIcon = document.createElement("div");
      hamburgerIcon.id = "hamburger-toggle";
      hamburgerIcon.innerHTML = "&#9776;";
      hamburgerIcon.addEventListener("click", () => {
        const panel = document.getElementById("hamburger-panel");
        if (panel)
          panel.style.display =
            panel.style.display === "none" ? "block" : "none";
      });
      nav.appendChild(hamburgerIcon);
    }

    const container = document.getElementById("hamburger-content");
    if (!container) {
      console.error("Hamburger content container not found.");
      return;
    }

    // Ensure status-info exists for mobile
    if (!document.getElementById("status-info")) {
      const statusInfo = document.createElement("span");
      statusInfo.id = "status-info";
      statusInfo.textContent = "Status";
      statusInfo.classList.add("nav-status-info");
      nav.appendChild(statusInfo);
    }

    // Ensure info-button exists for mobile
    if (!document.getElementById("info-button")) {
      const infoBtn = document.createElement("button");
      infoBtn.id = "info-button";
      infoBtn.textContent = "Info";
      infoBtn.classList.add("nav-green-btn");
      infoBtn.style.display = "none"; 
      infoBtn.addEventListener("click", () => {
        document
          .querySelectorAll(".nav-green-btn")
          .forEach((btn) => btn.classList.remove("nav-green-btn"));
        if (typeof global.modeManager !== "undefined") {
          global.modeManager.set(global.MODE_NONE, "");
        }
        infoBtn.style.display = "none";
        if (global.map) global.map.getContainer().style.cursor = "pointer";
      });
      nav.appendChild(infoBtn);
    }

    // Main "Eigene Objekte" button in the hamburger panel
    const hamburgerMainBtn = document.createElement("button");
    hamburgerMainBtn.classList.add("hamburger-menu-main-button");
    hamburgerMainBtn.classList.add("customdata"); 
    const btnContent = document.createElement("span");
    btnContent.textContent = global.TEXT_CUSTOMDATA_LABEL; 
    const arrow = document.createElement("span");
    arrow.textContent = " +";
    arrow.style.float = "right";
    arrow.style.marginLeft = "10px";
    hamburgerMainBtn.appendChild(btnContent);
    hamburgerMainBtn.appendChild(arrow);

    const submenu = document.createElement("div");
    submenu.classList.add("hamburgerSubmenu");
    submenu.style.display = "none";

    hamburgerMainBtn.addEventListener("click", (e) => {
      e.preventDefault();
      document
        .querySelectorAll("#hamburger-content > div.hamburgerSubmenu")
        .forEach((div) => {
          if (div !== submenu) div.style.display = "none";
        });
      const visible = submenu.style.display === "none";
      submenu.style.display = visible ? "flex" : "none";
      arrow.textContent = visible ? " -" : " +";
    });

    container.appendChild(hamburgerMainBtn);
    container.appendChild(submenu);

    const addSubBtn = (label, handler, iconHtml = "", specificClass = "") => {
      const btn = document.createElement("button");
      btn.classList.add("customdata"); // Type class
      btn.classList.add("hamburgerSubmenuBtn");
      if (specificClass) btn.classList.add(specificClass);
      btn.innerHTML = iconHtml ? `${iconHtml} ${label}` : label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handler();
        document.getElementById("hamburger-panel").style.display = "none"; // Close main panel on action
      });
      submenu.appendChild(btn);
      return btn;
    };

    // --- Submenu Entries ---
    // Importieren
    addSubBtn(
      "Importieren",
      () => {
        console.log("Hamburger Submenu: Importieren clicked.");
        fileInput.click();
        document.getElementById("status-info").textContent =
          global.TEXT_CUSTOMDATA_LABEL; 
        const infoBtn = document.getElementById("info-button");
        if (infoBtn) {
          infoBtn.textContent = global.TEXT_CUSTOMDATA_LABEL;
          infoBtn.classList.add("customdata", "nav-green-btn");
          infoBtn.style.display = "inline-block";
        }
        if (typeof global.modeManager !== "undefined") {
          global.modeManager.set(global.MODE_NONE, "customdata");
        }
        if (global.map) global.map.getContainer().style.cursor = "pointer";
        if (typeof global.deactivateElevationButtons === "function") {
          global.deactivateElevationButtons();
        }
      },
      // "⬆️"
      ""
    );

    // Sichtbarkeit
    const visibilityBtn = addSubBtn(
      "Sichtbarkeit",
      async () => {
        console.log("Hamburger Submenu: Sichtbarkeit clicked.");
        const targetVisibility = !getOverallCustomDataVisibility();
        for (const item of _myCustomdataMap.values()) {
          await global.toggleCustomDataLayerVisibility(
            item.id,
            targetVisibility
          );
        }
        visibilityBtn.innerHTML = targetVisibility
          ? '<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit'
          : '<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit: unsichtbar';
      },
      "",
      "customdata-visibility-btn"
    );
    visibilityBtn.innerHTML = getOverallCustomDataVisibility()
      ? '<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit'
      : '<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit: unsichtbar';

    // Konfiguration
    addSubBtn(
      "Konfiguration",
      () => {
        console.log("Hamburger Submenu: Konfiguration clicked.");
        if (
          typeof global.sidepanel !== "undefined" &&
          global.sidepanel.showCustomDataConfiguration
        ) {
          global.sidepanel.showCustomDataConfiguration("customdata");
        }
      },
      // "🔳"
      ""
    );

    // Objektübersicht (Data Panel)
    addSubBtn(
      "Objektübersicht",
      () => {
        console.log("Hamburger Submenu: Objektübersicht clicked.");
        if (
          typeof global.sidepanel !== "undefined" &&
          global.sidepanel.showCustomData
        ) {
          global.sidepanel.showCustomData("customdata");
        }
      },
      // "🔳"
      ""
    );

    // Alle eigenen Objekte löschen
    addSubBtn(
      "Alle eigenen Objekte löschen",
      async () => {
        console.log("Hamburger Submenu: Alle eigenen Objekte löschen clicked.");
        await clearAllCustomDataLayers();
        visibilityBtn.innerHTML = getOverallCustomDataVisibility()
          ? '<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit'
          : '<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit: unsichtbar';
      },
      "", // "🗑️"
    );

     // Hilfe
    addSubBtn("Hilfe", () => {
      if (
        typeof global.sidepanel !== "undefined" &&
        global.sidepanel.showHelpHtml
      ) {
        global.sidepanel.showHelpHtml("customdata");
      }
    });

    return hamburgerMainBtn;
  }

  global.getCustomDataConfigurationPanelHtml = function (idSuffix = "") {
    idSuffix = "-default"; 
    
    const lineStyle = _customDataOptionsLast.lineStyle || {};
    const pointStyle = _customDataOptionsLast.pointStyle || {};

    
    return `
        <!-- Style Controls -->
        <div class="client" id="style-controls${idSuffix}">
          <h4>Darstellung:</h4>
          ${MapStyleManager.getHtml(
            _customDataOptionsLast.styleOptions,
            idSuffix
          )}
        </div>

        <hr>

        <div>
          <b> Hinweis: </b>
          <br>
          Diese Konfiguration wirkt auf neu importierte Objekte,
          nicht auf bereits importierte Objekte!         
          <br>
          Individuelle Konfigurationen zu bereits importierten Objekten 
          können unter "Objektübersicht" vorgenommen werden.
        </div>

        <hr>

        <div id="customdata-config-area" class="customdata-config-area">

          <h4>default-Stil für Linien (Tracks/Routen)</h4>

          <label>Farbe: <input type="color" class="config-line-color" value="${
            lineStyle.color || "#0078FF"
          }"></label>

          <br>  <br>
          
          ${global.makeSlider(
            "line-weight",
            idSuffix,
            "Stärke",
            lineStyle.weight || 5,
            1,
            10,
            1,
            0
          )}

          <br>  <br>

          <label>Muster (z.B. "5, 5" für gestrichelt, leer für durchgezogen): <input type="text" class="config-line-dasharray" value="${
            lineStyle.dashArray || ""
          }"></label>

          <br>  <br>
          
          <label>Track Farbe (GPX/KML, durchgezogen): <input type="color" class="config-line-trackcolor" value="${
            lineStyle.trackColor || "#0056b3"
          }"></label>

          <br>  <br>

          <h4>default-Stil für Punkte (Wegpunkte)</h4>

          ${global.makeSlider(
            "point-radius",
            idSuffix,
            "Radius",
            pointStyle.radius || 8,
            1,
            20,
            1,
            0
          )}

          <br>  <br>

          <label>Füllfarbe: <input type="color" class="config-point-fillcolor" value="${
            pointStyle.fillColor || "#ff0000"
          }"></label>

          <br>  <br>

          <label>Randfarbe: <input type="color" class="config-point-color" value="${
            pointStyle.color || "#000"
          }"></label>
          
          <br>  <br>

          ${global.makeSlider(
            "point-weight",
            idSuffix,
            "Randstärke",
            pointStyle.weight || 1,
            0,
            5,
            1,
            0
          )}


          <div class="panel-buttons">
              <button type="button" class="customdata-apply-config-btn" data-id="0">default-Stile speichern</button>
          </div>
        </div>       
        `;
  };

  global.initCustomDataConfigurationPanelHelper = function (idSuffix) {
    idSuffix = "-default"; 

    if (typeof MapStyleManager === "undefined") {
      console.error("MapStyleManager not defined.");
      return;
    }

    const styleManager = new MapStyleManager(
      _saveSettings,
      () => global.redrawCustomData()
    );
    styleManager.init(_customDataOptionsLast.styleOptions, idSuffix);

    applyGlobalCustomDataStyleToPane();

    const panelElement = document.getElementById(`customdata-config-area`);
    if (!panelElement) {
      console.error(`CustomData panel element "customdata-config-area" not found.`);
      return;
    }

    const updateAndRedraw = () => {
      _saveSettings();
      global.redrawCustomData();
    };

    global.bindSlider(
      "line-weight",
      idSuffix,
      "weight", 
      _customDataOptionsLast.lineStyle, 
      false,
      0,
      parseInt,
      _customDataOptionsLast.lineStyle, 
      _saveSettings,
      () => global.redrawCustomData() 
    );

    global.bindSlider(
      "point-radius",
      idSuffix,
      "radius",
      _customDataOptionsLast.pointStyle,
      false,
      0,
      parseInt,
      _customDataOptionsLast.pointStyle,
      _saveSettings,
      () => global.redrawCustomData()
    );

    global.bindSlider(
      "point-weight",
      idSuffix,
      "weight",
      _customDataOptionsLast.pointStyle,
      false,
      0,
      parseInt,
      _customDataOptionsLast.pointStyle,
      _saveSettings,
      () => global.redrawCustomData()
    );


    const applyButton = panelElement.querySelector(".customdata-apply-config-btn");
    if (applyButton) {
        applyButton.addEventListener("click", async function (e) {
          console.log("customdata-apply-config-btn click");
          e.stopPropagation();

          _customDataOptionsLast.lineStyle.color = panelElement.querySelector(".config-line-color").value;
          _customDataOptionsLast.lineStyle.dashArray = panelElement.querySelector(".config-line-dasharray").value;
          _customDataOptionsLast.lineStyle.trackColor = panelElement.querySelector(".config-line-trackcolor").value;
          _customDataOptionsLast.pointStyle.fillColor = panelElement.querySelector(".config-point-fillcolor").value;
          _customDataOptionsLast.pointStyle.color = panelElement.querySelector(".config-point-color").value;

          updateAndRedraw(); 
        });
    }
  };

  global.getCustomDataPanelHtml = function (idSuffix = "") {
    console.log("getCustomDataPanelHtml called with suffix:", idSuffix);

    let html = `
    <div id="customdata-panel-${idSuffix}" class="customdata-panel">
      <div id="customdata-list-${idSuffix}" class="entry-list">
  `;

    if (!_myCustomdataMap || _myCustomdataMap.size === 0) {
      /* html += `<p>Noch keine Objekte importiert. Nutzen Sie "Importieren" im Menü, um Ihr erstes Objekt hinzuzufügen!</p>`; */
      html += `<div class="entry-list"><p style="color: #777; font-style: italic; padding: 10px;">Noch kein Objekt importiert.</p></div>`;
    } else {
      _myCustomdataMap.forEach((item) => {
        const isVisible = typeof item.visible === "boolean" ? item.visible : true;
        const visibilityClass = isVisible ? "is-visible" : "is-hidden";
        const itemId = item.id ? String(item.id) : "";
        const itemName = item.name || "Unnamed File";

        const itemStyle = item.style || {};
        const lineStyle = itemStyle.line || {};
        const pointStyle = itemStyle.point || {};

        const visibilityButtonContent = isVisible
          ? `<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> `
          : `<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> `;

        html += `
    <details class="customdata-item-details entry-list" data-id="${itemId}">
      <summary class="customdata-item-summary">
        <span class="customdata-item-name">${itemName}</span>
        <span class="customdata-item-actions-summary">
          <button class="customdata-position-btn" data-id="${itemId}" title="Auf Karte zentrieren">🔍</button>
          <button class="customdata-toggle-visibility-btn ${visibilityClass}" data-id="${itemId}" title="Sichtbarkeit umschalten">${visibilityButtonContent}</button>
          <button class="customdata-remove-btn" data-id="${itemId}" title="Datei entfernen">🗑️</button>
        </span>
      </summary>
      <!-- -->
      <div class="customdata-config-area" data-id="${itemId}">
        <!--
        <span class="customdata-item-name">${itemName}</span>
        -->
        <h4>Stil für Linien (Tracks/Routen)</h4>
        <label>Farbe: <input type="color" class="config-line-color" value="${
          lineStyle.color || "#0078FF"
        }"></label>
        
        <br>  <br>

        ${global.makeSlider(
          `line-weight`,
          itemId,
          "Stärke",
          lineStyle.weight || 5,
          1,
          10,
          1,
          0
        )}

        <br>  <br>

        <label>Muster (z.B. "5, 5" für gestrichelt, leer für durchgezogen): <input type="text" class="config-line-dasharray" value="${
          lineStyle.dashArray || ""
        }"></label>

        <br>  <br>

        <label>Track Farbe (GPX/KML, durchgezogen): <input type="color" class="config-line-trackcolor" value="${
          lineStyle.trackColor || "#0056b3"
        }"></label>

        <h4>Stil für Punkte (Wegpunkte)</h4>
        
        ${global.makeSlider(
          `point-radius`,
          itemId,
          "Radius",
          pointStyle.radius || 8,
          1,
          20,
          1,
          0
        )}

        <br>  <br>
        
        <label>Füllfarbe: <input type="color" class="config-point-fillcolor" value="${
          pointStyle.fillColor || "#ff0000"
        }"></label>

        <br>  <br>

        <label>Randfarbe: <input type="color" class="config-point-color" value="${
          pointStyle.color || "#000"
        }"></label>

        <br>  <br>
        
        ${global.makeSlider(
          `point-weight`,
          itemId,
          "Randstärke",
          pointStyle.weight || 1,
          0,
          5,
          1,
          0
        )}

        <div class="panel-buttons">
            <button type="button" class="customdata-apply-config-btn" data-id="${itemId}">Stil anwenden</button>
        </div>
      </div>
      <!-- -->
    </details>
  `;
      });
    }

    html += `
      </div>
      <!--
      <p><small>Die Objekte werden lokal in Ihrem Browser gespeichert (Origin Private File System).</small></p>
      -->
    </div>
  `;
    return html;
  };

  global.initCustomDataPanelHelper = function (idSuffix) {
    idSuffix = ""; // TODO Hack !!!

    const panelElement = document.getElementById(`customdata-panel-${idSuffix}`);
    if (!panelElement) {
      console.error(`CustomData panel element "customdata-panel-${idSuffix}" not found.`);
      return;
    }

    const redrawAndSaveItem = async (item) => {
        if (!item) return;
        if (item.layer && global.map && global.map.hasLayer(item.layer)) {
            global.map.removeLayer(item.layer);
            item.layer = null; 
        }

        const fileNameInOpfs = item.opfsPath.split("/").pop();
        const fileContent = await loadCustomDataFile(fileNameInOpfs);
        if (fileContent) {
            const geojson = parseFileContentToGeoJson(fileContent, item.fileType, item.name);
            if (geojson) {              
                displayCustomDataGeoJson(geojson, item.name, item.id, item.opfsPath, item.fileType, item.visible, item.style);
            }
        }
        await saveMetadata(); 
        console.log(`Style for "${item.name}" updated and redrawn.`);
    };    
   
    panelElement.querySelectorAll(".customdata-item-details").forEach(detailsElement => {
        const itemId = detailsElement.dataset.id;
        const item = _myCustomdataMap.get(itemId);
        if (!item) return;

        const configArea = detailsElement.querySelector('.customdata-config-area');
        if (!configArea) return;

        const redrawCallback = () => redrawAndSaveItem(item);

        global.bindSlider(`line-weight`, itemId, "weight", item.style.line, false, 0, parseInt, item.style.line, saveMetadata, redrawCallback);
        global.bindSlider(`point-radius`, itemId, "radius", item.style.point, false, 0, parseInt, item.style.point, saveMetadata, redrawCallback);
        global.bindSlider(`point-weight`, itemId, "weight", item.style.point, false, 0, parseInt, item.style.point, saveMetadata, redrawCallback);

        const applyButton = configArea.querySelector(".customdata-apply-config-btn");
        applyButton.addEventListener('click', async (e) => {
            e.stopPropagation();            
            
            item.style.line.color = configArea.querySelector(".config-line-color").value;
            item.style.line.dashArray = configArea.querySelector(".config-line-dasharray").value.trim() || null;
            item.style.line.trackColor = configArea.querySelector(".config-line-trackcolor").value;
            item.style.point.fillColor = configArea.querySelector(".config-point-fillcolor").value;
            item.style.point.color = configArea.querySelector(".config-point-color").value;

            await redrawAndSaveItem(item); 
            
            alert(`Stil für "${item.name}" angewendet.`);
            detailsElement.open = false; 
        });
    });

    panelElement.querySelectorAll(".customdata-toggle-visibility-btn").forEach(button => {
        button.addEventListener("click", function(e) {
            e.stopPropagation();
            const itemId = this.dataset.id;
            const item = _myCustomdataMap.get(itemId);
            if (item) {
                global.toggleCustomDataLayerVisibility(itemId, !item.visible);
            }
        });
    });

    panelElement.querySelectorAll(".customdata-remove-btn").forEach(button => {
        button.addEventListener("click", async function(e) {
            e.stopPropagation();
            const itemId = this.dataset.id;
            const itemName = (_myCustomdataMap.get(itemId) || {}).name || itemId;
            if (confirm(`Möchten Sie die Datei "${itemName}" wirklich entfernen?`)) {
                await global.removeCustomDataLayer(itemId);
            }
        });
    });

    panelElement.querySelectorAll(".customdata-position-btn").forEach(button => {
        button.addEventListener("click", async function(e) {
            e.stopPropagation();
            const itemIdToFind = this.dataset.id;
            const foundLayerMetadata = _myCustomdataMap.get(itemIdToFind);

            if (foundLayerMetadata && foundLayerMetadata.layer && global.map) {
                const actualLeafletLayer = foundLayerMetadata.layer;
                let wasVisible = global.map.hasLayer(actualLeafletLayer);

                if (!wasVisible) {
                    actualLeafletLayer.addTo(global.map);
                }

                if (actualLeafletLayer.getBounds && actualLeafletLayer.getBounds().isValid()) {
                    global.map.fitBounds(actualLeafletLayer.getBounds(), { padding: [20, 20] });
                }

                if (!wasVisible && !foundLayerMetadata.visible) {
                    global.map.removeLayer(actualLeafletLayer);
                }
            } else {
                console.warn(`Layer with ID ${itemIdToFind} not found or has no valid bounds.`);
            }
        });
    });
};

  async function _saveSettings() {
    localStorage.setItem(
      "customdata_configuration",
      JSON.stringify(_customDataOptionsLast)
    );
  }

  async function _loadSettings() {
    try {
      const storedOptions = localStorage.getItem("customdata_configuration");
      if (storedOptions) {
        _customDataOptionsLast = {
          ...CUSTOMDATA_OPTIONS_DEFAULTS,
          ...JSON.parse(storedOptions),
          styleOptions: {
            ...CUSTOMDATA_OPTIONS_DEFAULTS.styleOptions,
            ...(JSON.parse(storedOptions).styleOptions || {}),
          },
        };        
      }
    } catch (error) {
      console.error(
        "Failed to load customdata options from localStorage:",
        error
      );
      _customDataOptionsLast = { ...CUSTOMDATA_OPTIONS_DEFAULTS }; 
    }
  }

  async function saveCustomDataLayers() {
    // So, no explicit action needed here for now, but kept for sidepanel interface consistency.
  }
  async function loadCustomDataLayers() {
    // It exists for sidepanel interface consistency.
  }

  async function loadCustomData() {
    const storedLayersMetadata = await loadMetadata();
    if (!storedLayersMetadata || storedLayersMetadata.length === 0) {
      return;
    }
   
    for (const item of storedLayersMetadata) {
      if (item.opfsPath) {
        const fileNameInOpfs = item.opfsPath.split("/").pop(); 
        const fileContent = await loadCustomDataFile(fileNameInOpfs);

        if (fileContent) {
          const geojson = parseFileContentToGeoJson(
            fileContent,
            item.fileType,
            item.name
          );
          if (geojson) {
            displayCustomDataGeoJson(
              geojson,
              item.name,
              item.id,
              item.opfsPath,
              item.fileType,
              item.visible,
              item.style
            );
          }
        }
      }
    }
  }

  async function saveMetadata() {
    const serializableLayers = Array.from(_myCustomdataMap.values()).map((item) => ({
      id: item.id,
      name: item.name,
      opfsPath: item.opfsPath,
      visible: item.visible,
      fileType: item.fileType,
      style: item.style, 
    }));

    const metadataContent = JSON.stringify(serializableLayers, null, 2);

    persist("", CUSTOMDATA_MASTER_NAME, metadataContent);   
  }

  async function loadMetadata() {
    try {
      const content = await retrieve("", CUSTOMDATA_MASTER_NAME);

      if (content === "") {
        return [];
      }

      const loadedMetadata = JSON.parse(content);
      return loadedMetadata;
    } catch (error) {
      console.error(`Failed to load custom data metadata file from OPFS:`, error);
      return null;
    }
  }

  async function loadCustomDataFile(fileNameInOpfs) {
    try {      
      const content = await retrieve(CUSTOMDATA_DIR_NAME, fileNameInOpfs);     
      return content;
    } catch (error) {
      console.error(`Failed to load custom data file "${fileNameInOpfs}" from OPFS:`, error);
      return null;
    }
  }

  async function deleteCustomDataFile(fileNameInOpfs) {
    try {
      await remove(CUSTOMDATA_DIR_NAME, fileNameInOpfs);
    } catch (error) {
      console.error(`Failed to delete file "${fileNameInOpfs}" from OPFS:`, error);
      return null;
    }
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    global.initcustomdata();
  })
})(window); // Pass `window` as 'global' to the IIFE