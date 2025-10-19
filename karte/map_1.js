// map_1.js

const MODE_MAP = 10; 

let isOpfsAvailable = true;

const defaultLayerOrder = ["customdata", "tri", "tpi", "slope", "aspect", "roughness", "colorRelief", "contour", "hillshade", "map"];

const map_options_defaults = {
  storeTiles: true,
  baseLayer: "openstreetmap", 

  styleOptions: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      opacity: 100,
      blendMode: "normal"
    }
};

function getActiveTileLayer(map) {
    if (!window.baseLayersConfig) return null;
    for (const key in window.baseLayersConfig) {
        const config = window.baseLayersConfig[key];
        if (map.hasLayer(config.layer)) {
            return config.layer;
        }
    }
    return null;
}

function getActiveBaseLayerId(map) {
    if (!window.baseLayersConfig) return null;
    for (const key in window.baseLayersConfig) {
        const config = window.baseLayersConfig[key];
        if (map.hasLayer(config.layer)) {
            return config.id;
        }
    }
    return null;
}

function getTileLayerConfigById(id) {
    if (!window.baseLayersConfig || !id) return null;
    for (const key in window.baseLayersConfig) {
        const config = window.baseLayersConfig[key];
        if (config.id === id) {
            return config;
        }
    }
    return null;
}

document.addEventListener("DOMContentLoaded", () => { 
  if (window.map) {
    // console.info("Hi, here is map_1.js!");

    map.getPane('tilePane').style.zIndex = 200;

    // TODO
    // HACK !!!
    OPFSonANDROID = false;
    OPFSonSAFARI = true;
    //console.log("HACK2 OPFSonANDROID: ", OPFSonANDROID);
    //console.log("HACK2 OPFSonSAFARI: ", OPFSonSAFARI);

    if (true) {
      // Startet den Ladevorgang für alle Layer-Typen, nachdem das DOM bereit ist.
      triggerLoadAllLayerTypes();
    }

    if (!isMobile()) {
      const locateControl = document.querySelector(".leaflet-control-locate");

      if (locateControl) {        
        locateControl.style.display = "none";

        // OR, if you want to remove it entirely:
        // locateControl.remove();

        // console.log("📍 Locate control hidden");
      } else {
        // console.log("ℹ️ No locate control found");
      }
    }

    loadMapSettings();

    if (true) {
      makeMenuEntry(
        "map",
        MODE_MAP,
        [],
        null,
        "Basis",
        "#",
        true,
        function () {
          if (typeof layerControl !== "undefined")
            layerControl.toggleRadioByType("map");
        },
        function () {
          if (typeof layerControl !== "undefined")
            layerControl.toggleRadioByType("map"); 
        },
        function () {
          return 0;
        },
        "my-custom-class",
        {
          hasSettings: true,
          hasTiles: false, // has no tiles
          hasInfo: false,
        }
      );
    }

    if (typeof createSidepanel === "function") {
      const idSuffix = getUniqueIdSuffix(); 
      sidepanel = createSidepanel({
        type: "map",
        label: "Basis",
        loadFn: loadMap,
        saveFn: saveMap,
        panelHtmlFn: () => getMapPanelHtml(idSuffix), 
        panelHelperFn: () => getMapPanelHelper(idSuffix), 
        mode: MODE_MAP,
        array: null,
      });
    }

    if (typeof createLayerControl === "function") {
      layerControl = createLayerControl({
        type: "map",
        label: "Basis",
        loadFn: loadMap,
        saveFn: saveMap,
        panelHtmlFn: getMapPanelHtml, 
        panelHelperFn: getMapPanelHelper,
        mode: MODE_MAP,
        array: null,
      });
      map.addControl(layerControl);
    }

  } else {
    alert("window.map is missing !");
  }

});

function getMapPanelHtml(idSuffix = "") {
  let layerListHtml = "";
  if (typeof theSidepanelSingleton !== "undefined" && theSidepanelSingleton) {
    const types = theSidepanelSingleton.getTypes?.() || [];
    const storedLayerOrder = loadLayerOrder();

    const typeOrder = [...types].sort((a, b) => {
      const indexA = storedLayerOrder.indexOf(a);
      const indexB = storedLayerOrder.indexOf(b);
      return (
        (indexA === -1 ? Infinity : indexA) -
        (indexB === -1 ? Infinity : indexB)
      );
    });

    layerListHtml = typeOrder
      .map((type, index) => {
        const config = theSidepanelSingleton.getConfig(type);
        const label = config?.label || type;
        const upDisabled = index === 0;
        const downDisabled = index === typeOrder.length - 1;
        const buttonStyle = (disabled) => `
        font-size: 12px;
        padding: 2px 6px;
        line-height: 1.1;
        min-width: 24px;
        opacity: ${disabled ? "0.4" : "1"};
        cursor: ${disabled ? "not-allowed" : "pointer"};
      `;
         return `
          <div class="layer-row" data-type="${type}"
            style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 0;">

            <button class="btn-down" data-index="${index}"
                    ${downDisabled ? "disabled" : ""}
                    style="${buttonStyle(downDisabled)}">↓</button>

            <span class="xlabel" draggable="true">${label}</span>

            <button class="btn-up" data-index="${index}"
                    ${upDisabled ? "disabled" : ""}
                    style="${buttonStyle(upDisabled)}">↑</button>
          </div>
        `;
      })
      .join("");
  }

  let baseLayerOptionsHtml = '';
  if (window.baseLayersConfig) {
      const currentActiveBaseLayerId = getActiveBaseLayerId(map);
      for (const key in window.baseLayersConfig) {
          const config = window.baseLayersConfig[key];
          const checked = config.id === currentActiveBaseLayerId ? 'checked="checked"' : '';
          baseLayerOptionsHtml += `
              <label>
                  <input type="radio" name="baseLayerSelect${idSuffix}" value="${config.id}" ${checked} />
                  ${config.label}
              </label><br>
          `;
      }
  }

  const checkedAttr = map_options_last.storeTiles ? 'checked="checked"' : "";

      return `
        <!-- Style Controls -->
        <div class="client" id="style-controls${idSuffix}">
          <!-- <h4>Darstellung:</h4> -->
          ${MapStyleManager.getHtml(map_options_last.styleOptions, idSuffix)}
        </div>
        
        <hr>

    <div>
      <!-- Base Layer Selection -->
      <div style="margin-bottom: 15px;">
          <h4>Karte/Luftbild auswählen:</h4>
          ${baseLayerOptionsHtml}
      </div>

      <hr>

      <!--
      <div>
        Die Referenzen auf Kacheln können im im Speicher des Browser abgelegt werden.
        <br>
        Wenn dies gewünscht ist, setzen Sie hier einen Haken:
      </div>
      <div style="margin-top: 10px;">
        <label>
          <input type="checkbox" id="storeTiles${idSuffix}" ${checkedAttr} />
          Kacheln speichern
        </label>
      </div>

      <hr>
      -->

      <div style="margin-bottom: 15px;">
          <h4>Reihenfolge der Ebenen:</h4>
      </div>
      <div class="layer-order-list" style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px;">
        ${layerListHtml}
      </div>

      <!--
      <div class="client">
        <div>
          <label for="mapOpacity${idSuffix}">
            Transparenz (Basiskarte): <span id="opacity-value${idSuffix}">${map_options_last.opacity * 100} %</span>
          </label>
          <input
            type="range"
            id="mapOpacity${idSuffix}"
            min="0"
            max="1"
            step="0.1"
            value="${map_options_last.opacity}"
          />
        </div>
      </div>

      <hr>
      -->

      <div class="panel-buttons" style="margin-top: 12px;">
        <!--
        <button type="button" id="btn-map-standard${idSuffix}">Standard wiederherstellen</button>
        -->
        <!--
        <button type="button" id="btn-map-zeichnen${idSuffix}">neu zeichnen</button>
        --<
      </div>
    </div>
  `;
}

function getMapPanelHelper(idSuffix = "") {

   const styleManager = new MapStyleManager(
     saveMapSettings.bind(this),
     () => this.redrawMaps()
   );
   styleManager.init(map_options_last.styleOptions, idSuffix);

  const opacityInput = document.getElementById("mapOpacity" + idSuffix);
  if (opacityInput) {
    opacityInput.addEventListener("input", (e) => {
      document.getElementById("opacity-value" + idSuffix).textContent = parseFloat(e.target.value) * 100 + " %";
      map_options_last.opacity = parseFloat(e.target.value);
      saveMapSettings();

      const tileLayer = getActiveTileLayer(map);
      if (tileLayer) tileLayer.setOpacity(1 - map_options_last.opacity); // Use (1 - transparency) for actual Leaflet opacity
    });
  }

  document.querySelectorAll('input[name="baseLayerSelect' + idSuffix + '"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
          const selectedBaseLayerId = e.target.value;
          map_options_last.baseLayer = selectedBaseLayerId;
          saveMapSettings();
          
          for (const key in window.baseLayersConfig) {
              const config = window.baseLayersConfig[key];
              if (map.hasLayer(config.layer)) {
                  map.removeLayer(config.layer);
              }
          }

          const newBaseLayerConfig = getTileLayerConfigById(selectedBaseLayerId);
          if (newBaseLayerConfig) {
              newBaseLayerConfig.layer.addTo(map);
              newBaseLayerConfig.layer.setOpacity(1 - map_options_last.opacity); 
          }
          redrawAllTypes(); 
      });
  });

  const storeTilesCheckbox = document.getElementById("storeTiles" + idSuffix);
  if (storeTilesCheckbox) {
    storeTilesCheckbox.checked = map_options_last.storeTiles; 
    storeTilesCheckbox.addEventListener("change", (e) => { 
      map_options_last.storeTiles = e.target.checked;
      saveMapSettings();

      if (map_options_last.storeTiles) {
        if (typeof contourManagerInstance !== 'undefined' && contourManagerInstance) contourManagerInstance.saveContourLayers();
        if (typeof tpiModeManager !== 'undefined' && tpiModeManager) tpiModeManager.triggerSavelayers();
        if (typeof triModeManager !== 'undefined' && triModeManager) triModeManager.triggerSavelayers();
        if (typeof roughnessModeManager !== 'undefined' && roughnessModeManager) roughnessModeManager.triggerSavelayers();
        if (typeof aspectModeManager !== 'undefined' && aspectModeManager) aspectModeManager.triggerSavelayers();
        if (typeof slopeModeManager !== 'undefined' && slopeModeManager) slopeModeManager.triggerSavelayers();
        if (typeof colorreliefModeManager !== 'undefined' && colorreliefModeManager) colorreliefModeManager.triggerSavelayers();
        if (typeof hillshadeManagerInstance !== 'undefined' && hillshadeManagerInstance) hillshadeManagerInstance.saveHillshades();
      } else {
        localStorage.removeItem("contourLayers");
        localStorage.removeItem("tpiLayers");
        localStorage.removeItem("triLayers");
        localStorage.removeItem("roughnessLayers");
        localStorage.removeItem("aspectLayers");
        localStorage.removeItem("slopeLayers");
        localStorage.removeItem("colorReliefLayers");
        localStorage.removeItem("hillshadeLayers");
      }
    });
  }

  document.getElementById("btn-map-standard" + idSuffix)?.addEventListener("click", () => {
    console.log("Resetting map to standard values...");

    map_options_last = { ...map_options_defaults }; 

    const opacityInput = document.getElementById("mapOpacity" + idSuffix);
    const opacityLabel = document.getElementById("opacity-value" + idSuffix);
    if (opacityInput && opacityLabel) {
      opacityInput.value = map_options_last.opacity;
      opacityLabel.textContent = `${map_options_last.opacity * 100} %`;
    }

    const storeTilesInput = document.getElementById("storeTiles" + idSuffix);
    if (storeTilesInput) {
      storeTilesInput.checked = map_options_last.storeTiles;
    }

    const defaultBaseLayerConfig = getTileLayerConfigById(map_options_defaults.baseLayer);
    document.querySelectorAll('input[name="baseLayerSelect' + idSuffix + '"]').forEach(radio => {
        radio.checked = (radio.value === map_options_defaults.baseLayer);
    });

    if (window.baseLayersConfig) { 
      for (const key in window.baseLayersConfig) {
          const config = window.baseLayersConfig[key];
          if (map.hasLayer(config.layer)) {
              map.removeLayer(config.layer);
          }
      }
    }
    if (defaultBaseLayerConfig) {
        defaultBaseLayerConfig.layer.addTo(map);
        defaultBaseLayerConfig.layer.setOpacity(1 - map_options_last.opacity);
    }

    saveMapSettings(); 
    
    const wrapper = document.querySelector(".side-panel-content");
    const container = wrapper?.querySelector(".layer-order-list");
    if (container) {
        const html = defaultLayerOrder
            .map((type, index) => {
                const config = theSidepanelSingleton.getConfig(type);
                const label = config?.label || type;
                const upDisabled = index === 0;
                const downDisabled = index === defaultLayerOrder.length - 1;
                const buttonStyle = (disabled) => `
                font-size: 12px;
                padding: 2px 6px;
                line-height: 1.1;
                min-width: 24px;
                opacity: ${disabled ? "0.4" : "1"};
                cursor: ${disabled ? "not-allowed" : "pointer"};
                `;
                return `
                <div class="layer-row" data-type="${type}" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 0;">
                    <button class="btn-down" data-index="${index}"
                    ${downDisabled ? "disabled" : ""}
                    style="${buttonStyle(downDisabled)}">↓</button>
                    <span class="xlabel" draggable="true">${label}</span>
                    <button class="btn-up" data-index="${index}"
                    ${upDisabled ? "disabled" : ""}
                    style="${buttonStyle(upDisabled)}">↑</button>
                </div>
                `;
            })
            .join("");

        container.innerHTML = html;
        localStorage.setItem("layerOrder", JSON.stringify(defaultLayerOrder));
        redrawAllTypes(); 
        getMapPanelHelperForSort(); 
    }
  });

  getMapPanelHelperForSort(); 

  document
    .getElementById("btn-map-zeichnen" + idSuffix)
    ?.addEventListener("click", () => {
      redrawAllTypes()
    });
}

function getMapPanelHelperForSort() {

  const wrapper = document.querySelector(".side-panel-content");
  if (!wrapper) return;

  const container = wrapper.querySelector(".layer-order-list");
  if (!container) return;

  const rows = Array.from(container.querySelectorAll(".layer-row"));

  const storeCurrentLayerOrder = () => {
    const order = Array.from(container.querySelectorAll(".layer-row")).map(
      (row) => row.dataset.type
    );
    localStorage.setItem("layerOrder", JSON.stringify(order));
  };

  const addDragAndDropHandlers = (row) => {
    const label = row.querySelector(".xlabel");

    label.setAttribute("draggable", "true");

    label.addEventListener("dragstart", (e) => {
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    label.addEventListener("dragend", () => {
      row.classList.remove("dragging");
    });

    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingRow = container.querySelector(".dragging");
      if (!draggingRow || draggingRow === row) return;

      const bounding = row.getBoundingClientRect();
      const offset = e.clientY - bounding.top;

      if (offset > bounding.height / 2) {
        container.insertBefore(draggingRow, row.nextSibling);
      } else {
        container.insertBefore(draggingRow, row);
      }
    });

    row.addEventListener("drop", () => {
      storeCurrentLayerOrder();
      updateButtonStates(container);
      redrawAllTypes(); 
    });
  };

  rows.forEach((row) => {
    const type = row.dataset.type;
    const upBtn = row.querySelector(".btn-up");
    const downBtn = row.querySelector(".btn-down");
    
    const newUpBtn = upBtn?.cloneNode(true);
    const newDownBtn = downBtn?.cloneNode(true);
    if (upBtn && newUpBtn) upBtn.replaceWith(newUpBtn);
    if (downBtn && newDownBtn) downBtn.replaceWith(newDownBtn);

    if (newUpBtn) {
      newUpBtn.addEventListener("click", () => {
        const prev = row.previousElementSibling;
        if (prev && prev.classList.contains("layer-row")) {
          container.insertBefore(row, prev);
          updateButtonStates(container);
          storeCurrentLayerOrder();
          redrawAllTypes(); 
        }
      });
    }

    if (newDownBtn) {
      newDownBtn.addEventListener("click", () => {
        const next = row.nextElementSibling;
        if (next && next.classList.contains("layer-row")) {
          container.insertBefore(next, row);
          updateButtonStates(container);
          storeCurrentLayerOrder();
          redrawAllTypes(); 
        }
      });
    }

    addDragAndDropHandlers(row);
  });

  updateButtonStates(container);
}

function updateButtonStates(container) {
  const rows = Array.from(container.querySelectorAll(".layer-row"));

  rows.forEach((row, index) => {
    const upBtn = row.querySelector(".btn-up");
    const downBtn = row.querySelector(".btn-down");

    if (upBtn) {
      upBtn.disabled = index === 0;
      upBtn.style.opacity = index === 0 ? "0.4" : "1";
      upBtn.style.cursor = index === 0 ? "not-allowed" : "pointer";
    }

    if (downBtn) {
      downBtn.disabled = index === rows.length - 1;
      downBtn.style.opacity = index === rows.length - 1 ? "0.4" : "1";
      downBtn.style.cursor = index === rows.length - 1 ? "not-allowed" : "pointer";
    }
  });
}

function redrawMaps() {
  const tilePane = map.getPane('tilePane');

  if (tilePane) {
    opts = map_options_last.styleOptions;
    const filterString = `brightness(${opts.brightness ?? 100}%) contrast(${
      opts.contrast ?? 100
    }%) saturate(${opts.saturation ?? 100}%) opacity(${opts.opacity ?? 100}%)`;
    const blendMode = opts.blendMode || "normal";
    tilePane.style.filter = filterString;
    tilePane.style.mixBlendMode = blendMode;
  }
}

function redrawAllTypes() {
  const storedLayerOrder = loadLayerOrder();

  const reversedOrder = [...storedLayerOrder].reverse();
  
  for (const layerType of reversedOrder) {
      switch (layerType) {
          case "cccontour":
              if (typeof contourManagerInstance !== 'undefined' && contourManagerInstance) {
                  contourManagerInstance.redrawLayers();
              } else {
                console.log("problem: contourManagerInstance.redrawLayers()");
              }
              break;
          case "contour":
              if (typeof contourModeManager !== 'undefined' && contourModeManager) {
                  contourModeManager.triggerRedraw();
              } else {
                console.log("problem: contourManagerInstance.redrawLayers()");
              }
              break;
          case "tpi":
              if (typeof tpiModeManager !== 'undefined' && tpiModeManager) {
                  tpiModeManager.triggerRedraw();
              }
              break;
          case "tri":
              if (typeof triModeManager !== 'undefined' && triModeManager) {
                  triModeManager.triggerRedraw();
              }
              break;
          case "roughness":
              if (typeof roughnessModeManager !== 'undefined' && roughnessModeManager) {
                  roughnessModeManager.triggerRedraw();
              }
              break;
          case "aspect":
              if (typeof aspectModeManager !== 'undefined' && aspectModeManager) {
                  aspectModeManager.triggerRedraw();
              }
              break;
          case "slope":
              if (typeof slopeModeManager !== 'undefined' && slopeModeManager) {
                  slopeModeManager.triggerRedraw();
              }
              break;
          case "colorRelief":
              if (typeof colorreliefModeManager !== 'undefined' && colorreliefModeManager) {
                  colorreliefModeManager.triggerRedraw();
              }
              break;
          case "hillshade":
              if (typeof hillshadeModeManager !== 'undefined' && hillshadeModeManager) {
                  hillshadeModeManager.triggerRedraw();
              } else {
                console.log("problem: hillshadeModeManager.redrawLayers()");
              }
              break;
          case "map":
              redrawMaps();
              break;
          case "customdata":
              redrawCustomData();
              break;
          default:
              console.warn(`No redraw function defined for layer type: ${layerType}`);
              break;
      }
  }
}

function loadLayerOrder() {
    const savedOrder = JSON.parse(localStorage.getItem("layerOrder"));
    return savedOrder || defaultLayerOrder;
}

function saveMapSettings() {  
  localStorage.setItem("map_configuration", JSON.stringify(map_options_last));
}

function saveMap() {
    // This function seems to be a placeholder; the actual save logic is in saveMapSettings
}

function loadMapSettings() {
  map_options_last = { ...map_options_defaults };
  
  let saved = null;
  try {
    const raw = localStorage.getItem("map_configuration");
    if (raw) saved = JSON.parse(raw);
  } catch (err) {
    console.warn("Invalid saved map options:", err);
  }

  map_options_last = {
    baseLayer: saved?.baseLayer ?? map_options_defaults.baseLayer,
    styleOptions: {
      brightness: saved?.styleOptions?.brightness ?? map_options_defaults.styleOptions.brightness,
      contrast:   saved?.styleOptions?.contrast   ?? map_options_defaults.styleOptions.contrast,
      saturation: saved?.styleOptions?.saturation ?? map_options_defaults.styleOptions.saturation,
      opacity:    saved?.styleOptions?.opacity    ?? map_options_defaults.styleOptions.opacity,
      blendMode:  saved?.styleOptions?.blendMode  ?? "normal",
    },
  };

  map_options_last.storeTiles = true;

  const savedMapState = localStorage.getItem("mapState");
  if (savedMapState) {
    try {
      const mapState = JSON.parse(savedMapState);
      if (mapState.center && mapState.zoom) {
        map.setView(mapState.center, mapState.zoom);
      }
    } catch (err) {
      console.warn("Failed to parse mapState:", err);
    }
  }

  map.on("moveend", () => {
    const mapState = {
      center: map.getCenter(),
      zoom: map.getZoom(),
    };
    localStorage.setItem("mapState", JSON.stringify(mapState));
  });

  let configToLoad = getTileLayerConfigById(map_options_last.baseLayer);
  if (!configToLoad) {
    configToLoad = getTileLayerConfigById(map_options_defaults.baseLayer);
    map_options_last.baseLayer = map_options_defaults.baseLayer;
  }

  if (configToLoad) {
    if (window.baseLayersConfig) {
      for (const key in window.baseLayersConfig) {
        const config = window.baseLayersConfig[key];
        if (map.hasLayer(config.layer)) {
          map.removeLayer(config.layer);
        }
      }
    }

    configToLoad.layer.addTo(map);
  }

  redrawMaps();
}


function loadMap() {
    // This function seems to be a placeholder; the actual load logic is in loadMapSettings
}

function triggerLoadAllLayerTypes() {
  // Warte 1 Sekunde, damit die Karte (und möglicherweise andere Layer) initialisiert werden können.
  setTimeout(async () => {
    if (window.map) {
      showLoadingSpinner();
      await loadAllLayerTypes(); 
      hideLoadingSpinner(); 

      modeManager.set(MODE_NONE); 
      
      if (typeof theLayerControlSingleton !== "undefined") {
        theLayerControlSingleton.updateInfoContent(MODE_NONE);
      }
    } else {
      console.warn("Karte ist nach dem Timeout nicht bereit.");
    }
  }, 1000); // 1 Sekunde Verzögerung
}
