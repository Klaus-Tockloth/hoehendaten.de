// hillshade_1.js

(function(global) {

  const HILLSHADE_API_URL = "https://api.hoehendaten.de:14444/v1/hillshade";

  const SIMULATE_API_CALL_FOR_HILLSHADE = false; // Set this to 'true' for development/tests.

  const TEXT_HILLSHADE_LABEL = "Schummerung";  
  
  const MODE_HILLSHADE = 21; 
  
  const HILLSHADE_OPTIONS_DEFAULTS = {
    exaggeration: 1.0,
    azimuth: 315,
    altitude: 45,
    // shadingVariant: "multidirectional",
    shadingVariant: "igor",
    gradientAlgorithmVariant: "ZevenbergenThorne",
    opacity: 100, 

    // New: StyleOptions for MapStyleManager
    styleOptions: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      opacity: 90, 
      // blendMode: "normal"
      blendMode: "multiply"
    }
  };
  
  function buildHillshadeRequestBody(latlng, options) {
    return {
      Type: "HillshadeRequest",
      ID: `Hillshade at ${latlng.lat},${latlng.lng}`,
      Attributes: {
        Zone: 0, Easting: 0.0, Northing: 0.0,
        Longitude: latlng.lng, Latitude: latlng.lat,
        GradientAlgorithm: options.gradientAlgorithmVariant,
        VerticalExaggeration: options.exaggeration,
        AzimuthOfLight: options.azimuth,
        AltitudeOfLight: options.altitude,
        ShadingVariant: options.shadingVariant,
      },
    };
  }

  function extractHillshadeTileData(data) {
    if (SIMULATE_API_CALL_FOR_HILLSHADE) {
      console.warn("API-Simulation for Hillshade is not implemented in extractHillshadeTileData. Returning empty array.");
      return [];
    }

    if (data?.Attributes?.IsError) {
      const errObj = data.Attributes.Error || {};
      const code = errObj.Code || "UNKNOWN";
      const title = errObj.Title || "Unbekannter API-Fehler";
      const detail = errObj.Detail || "Keine Details verfügbar.";
      throw new Error(`Hillshade API-Fehler [${code}]: ${title}\nDetail: ${detail}`);
    }

    const hillshadesArray = data?.Attributes?.Hillshades;
    if (!Array.isArray(hillshadesArray) || hillshadesArray.length === 0) {
      throw new Error("Keine Schummerungsdaten im API-Antwortobjekt gefunden.");
    }
  
    return hillshadesArray.map(hillshade => ({
      Data: hillshade.Data,                 
      DataFormat: hillshade.DataFormat,    
      BoundingBox: hillshade.BoundingBox,   
      Actuality: hillshade.Actuality,      
      Origin: hillshade.Origin,
      Attribution: hillshade.Attribution,
      TileIndex: hillshade.TileIndex,
    }));
  }
  
  function getHillshadePanelHtml(idSuffix = "", options) {
    if (typeof global.makeSlider !== "function") {
      console.error("makeSlider ist nicht verfügbar. HTML-Panel kann nicht korrekt generiert werden.");
      return `<div>Fehler: UI-Komponenten fehlen.</div>`;
    }

    return `
      <!-- Style Controls -->
      <div class="client" id="style-controls${idSuffix}">
        ${MapStyleManager.getHtml(options.styleOptions, idSuffix)}
      </div>

      <hr>

      <div class="server_data">
        <label for="gradientAlgorithmVariant${idSuffix}">Algorithmus:</label>
        <select id="gradientAlgorithmVariant${idSuffix}" name="gradientAlgorithmVariant">
          <option value="ZevenbergenThorne" ${
            options.gradientAlgorithmVariant === "ZevenbergenThorne"
              ? "selected"
              : ""
          }>ZevenbergenThorne</option>
          <option value="Horn" ${
            options.gradientAlgorithmVariant === "Horn"
              ? "selected"
              : ""
          }>Horn</option>
        </select>

        ${global.makeSlider(
          "exaggeration",
          idSuffix,
          "Vertikale Überhöhung",
          options.exaggeration,
          0.1,
          25,
          0.1,
          1
        )}

        ${global.makeSlider(
          "azimuth",
          idSuffix,
          "Azimut der Lichtquelle",
          options.azimuth,
          0,
          360,
          15,
          0,
          "°"
        )}

        ${global.makeSlider(
          "altitude",
          idSuffix,
          "Höhe der Lichtquelle",
          options.altitude,
          0,
          90,
          5,
          0,
          "°"
        )}

        <label for="shadingVariant${idSuffix}">Schattierungsvariante:</label>
        <select id="shadingVariant${idSuffix}" name="shadingVariant">
          <option value="regular" ${
            options.shadingVariant === "regular"
              ? "selected"
              : ""
          }>regular</option>
          <option value="combined" ${
            options.shadingVariant === "combined"
              ? "selected"
              : ""
          }>combined</option>
          <option value="multidirectional" ${
            options.shadingVariant === "multidirectional"
              ? "selected"
              : ""
          }>multidirectional</option>
          <option value="igor" ${
            options.shadingVariant === "igor"
              ? "selected"
              : ""
          }>igor</option>
        </select>
      </div>

      <div class="panel-buttons" style="margin-top: 12px;">
        <!--
        <button type="button" id="btn-hillshade-standard${idSuffix}">Standard wiederherstellen</button>
        -->
        <button type="button" id="btn-hillshade-zeichnen${idSuffix}">neu zeichnen</button>
      </div>
    `;
  }
  
  function iiinitHillshadePanelHelper(idSuffix = "", managerApi) {
    const {
      options,
      saveSettings,
      redrawLayers,
      forceRedraw,
      resetOptionsToDefaults,
    } = managerApi;
  
    const styleManager = new MapStyleManager(
      saveSettings, 
      redrawLayers
    );
    styleManager.init(options.styleOptions, idSuffix);
    
    const updateInputAvailability = (selectedVariant) => {
      const azimuthSlider = document.getElementById("azimuth" + idSuffix);
      const altitudeSlider = document.getElementById("altitude" + idSuffix);
      const azimuthNumber = document.getElementById(
        "azimuth" + idSuffix + "-number"
      );
      const altitudeNumber = document.getElementById(
        "altitude" + idSuffix + "-number"
      );
      const azimuthLabel = document.getElementById(
        "azimuth" + idSuffix + "-value"
      );
      const altitudeLabel = document.getElementById(
        "altitude" + idSuffix + "-value"
      );

      if (selectedVariant === "multidirectional") {
        const azimuthValue = HILLSHADE_OPTIONS_DEFAULTS.azimuth;
        if (azimuthSlider) {
          azimuthSlider.value = azimuthValue;
          azimuthSlider.disabled = true;
        }
        if (azimuthNumber) {
          azimuthNumber.value = azimuthValue;
          azimuthNumber.disabled = true;
        }
        if (azimuthLabel) azimuthLabel.textContent = azimuthValue;
        options.azimuth = azimuthValue; 
      } else {
        if (azimuthSlider) azimuthSlider.disabled = false;
        if (azimuthNumber) azimuthNumber.disabled = false;
      }

      if (selectedVariant === "igor") {
        const altitudeValue = HILLSHADE_OPTIONS_DEFAULTS.altitude;
        if (altitudeSlider) {
          altitudeSlider.value = altitudeValue;
          altitudeSlider.disabled = true;
        }
        if (altitudeNumber) {
          altitudeNumber.value = altitudeValue;
          altitudeNumber.disabled = true;
        }
        if (altitudeLabel) altitudeLabel.textContent = altitudeValue;
        options.altitude = altitudeValue; 
      } else {
        if (altitudeSlider) altitudeSlider.disabled = false;
        if (altitudeNumber) altitudeNumber.disabled = false;
      }
      saveSettings(); 
    };

    // TODO
    // ----- WICHTIG: Fetch-Refs erstellen (bindSlider erwartet hier ein Objekt mit .value) -----
    // Diese sind nicht mehr direkt notwendig, da die Logik in den redrawFn über _hillshadeFetchForRedraw gesetzt wird
    // aber werden hier als Platzhalter belassen, falls bindSlider sie erwartet.
    // Ihre Werte werden durch die Logik in den redrawFn überschrieben.
    const altitudeFetchRef = { value: true }; // Diese sollten true sein, da sie serverseitig sind
    const azimuthFetchRef = { value: true };
    const exaggerationFetchRef = { value: true };
    
    if (typeof global.bindSlider === "function") {
      global.bindSlider(
        "altitude",
        idSuffix,
        "altitude",
        altitudeFetchRef,
        true,
        0,
        parseInt,
        options,
        saveSettings,
        forceRedraw 
      );
      global.bindSlider(
        "azimuth",
        idSuffix,
        "azimuth",
        azimuthFetchRef,
        true,
        0,
        parseInt,
        options,
        saveSettings,
        forceRedraw
      );
      global.bindSlider(
        "exaggeration",
        idSuffix,
        "exaggeration",
        exaggerationFetchRef,
        true,
        1,
        parseFloat,
        options,
        saveSettings,
        forceRedraw
      );
    } else {
      console.warn("bindSlider ist nicht verfügbar.");
    }

    const shadingVariantInput = document.getElementById(
      "shadingVariant" + idSuffix
    );
    console.log("shadingVariantInput: ", shadingVariantInput);
    if (shadingVariantInput) {
      shadingVariantInput.addEventListener("change", () => {
        const selectedValue = shadingVariantInput.value;
        options.shadingVariant = selectedValue;
        updateInputAvailability(selectedValue); 
        saveSettings();
        forceRedraw(); 
      });
      updateInputAvailability(shadingVariantInput.value); 
    } else {
      console.warn(
        "shadingVariant input nicht gefunden für idSuffix:",
        idSuffix
      );
    }

    const gradientAlgorithmVariantInput = document.getElementById(
      "gradientAlgorithmVariant" + idSuffix
    );
    if (gradientAlgorithmVariantInput) {
      gradientAlgorithmVariantInput.addEventListener("change", () => {
        const selectedValue = gradientAlgorithmVariantInput.value;
        options.gradientAlgorithmVariant = selectedValue;
        saveSettings();
        forceRedraw(); 
      });
    } else {
      console.warn(
        "gradientAlgorithmVariant input nicht gefunden für idSuffix:",
        idSuffix
      );
    }

    document
      .getElementById("btn-hillshade-standard" + idSuffix)
      ?.addEventListener("click", () => {
        resetOptionsToDefaults();
        const shadingInput = document.getElementById(
          "shadingVariant" + idSuffix
        );
        if (shadingInput) {
          updateInputAvailability(shadingInput.value);
        }
      });

    document
      .getElementById("btn-hillshade-zeichnen" + idSuffix)
      ?.addEventListener("click", () => {
        forceRedraw(); 
      });

    if (typeof global.updateInputAndLabel === "function") {
      global.updateInputAndLabel(
        "azimuth",
        idSuffix,
        options.azimuth.toFixed(0)
      );
      global.updateInputAndLabel(
        "altitude",
        idSuffix,
        options.altitude.toFixed(0)
      );
      global.updateInputAndLabel(
        "exaggeration",
        idSuffix,
        options.exaggeration.toFixed(1)
      );
    }
    if (shadingVariantInput) {
      shadingVariantInput.value = options.shadingVariant;
    }
    if (gradientAlgorithmVariantInput) {
      gradientAlgorithmVariantInput.value = options.gradientAlgorithmVariant;
    }
  }
  function initHillshadePanelHelper(idSuffix = "", managerApi) {   
    const { saveSettings, redrawLayers, forceRedraw, resetOptionsToDefaults } =
      managerApi;
   
    const styleManager = new MapStyleManager(saveSettings, redrawLayers);
    styleManager.init(managerApi.options.styleOptions, idSuffix); 
   
    const updateInputAvailability = (selectedVariant) => {
      const azimuthSlider = document.getElementById("azimuth" + idSuffix);
      const altitudeSlider = document.getElementById("altitude" + idSuffix);
      const azimuthNumber = document.getElementById(
        "azimuth" + idSuffix + "-number"
      );
      const altitudeNumber = document.getElementById(
        "altitude" + idSuffix + "-number"
      );
      const azimuthLabel = document.getElementById(
        "azimuth" + idSuffix + "-value"
      );
      const altitudeLabel = document.getElementById(
        "altitude" + idSuffix + "-value"
      );

      if (selectedVariant === "multidirectional") {
        const azimuthValue = HILLSHADE_OPTIONS_DEFAULTS.azimuth;
        if (azimuthSlider) {
          azimuthSlider.value = azimuthValue;
          azimuthSlider.disabled = true;
        }
        if (azimuthNumber) {
          azimuthNumber.value = azimuthValue;
          azimuthNumber.disabled = true;
        }
        if (azimuthLabel) azimuthLabel.textContent = azimuthValue;
        managerApi.options.azimuth = azimuthValue; 
      } else {
        if (azimuthSlider) azimuthSlider.disabled = false;
        if (azimuthNumber) azimuthNumber.disabled = false;
      }

      if (selectedVariant === "igor") {
        const altitudeValue = HILLSHADE_OPTIONS_DEFAULTS.altitude;
        if (altitudeSlider) {
          altitudeSlider.value = altitudeValue;
          altitudeSlider.disabled = true;
        }
        if (altitudeNumber) {
          altitudeNumber.value = altitudeValue;
          altitudeNumber.disabled = true;
        }
        if (altitudeLabel) altitudeLabel.textContent = altitudeValue;
        managerApi.options.altitude = altitudeValue; 
      } else {
        if (altitudeSlider) altitudeSlider.disabled = false;
        if (altitudeNumber) altitudeNumber.disabled = false;
      }
      saveSettings(); 
    };

    // TODO
    // ----- WICHTIG: Fetch-Refs erstellen (bindSlider erwartet hier ein Objekt mit .value) -----
    // Diese sind nicht mehr direkt notwendig, da die Logik in den redrawFn über _hillshadeFetchForRedraw gesetzt wird
    // aber werden hier als Platzhalter belassen, falls bindSlider sie erwartet.
    // Ihre Werte werden durch die Logik in den redrawFn überschrieben.
    const altitudeFetchRef = { value: true }; // Diese sollten true sein, da sie serverseitig sind
    const azimuthFetchRef = { value: true };
    const exaggerationFetchRef = { value: true };

    // For bindSlider, it's problematic if it holds a stale reference to `options`.
    // The `bindSlider` utility would ideally need to accept `managerApi` directly,
    // or be re-initialized if `optionsLast` is reassigned.
    // For now, pass `managerApi.options` as the object to modify, but be aware
    // that `resetOptionsToDefaults` would still cause it to modify a stale object
    // if `bindSlider` stores that reference directly.
    // A robust `bindSlider` would access properties using the getter pattern.

    // Assuming global.bindSlider is robust enough, or the reassignments of optionsLast are rare
    // and handled by panel re-initialization, we pass managerApi.options here.
    if (typeof global.bindSlider === "function") {
      global.bindSlider(
        "altitude",
        idSuffix,
        "altitude",
        altitudeFetchRef,
        true,
        0,
        parseInt,
        managerApi.options, 
        saveSettings,
        forceRedraw
      );
      global.bindSlider(
        "azimuth",
        idSuffix,
        "azimuth",
        azimuthFetchRef,
        true,
        0,
        parseInt,
        managerApi.options, 
        saveSettings,
        forceRedraw
      );
      global.bindSlider(
        "exaggeration",
        idSuffix,
        "exaggeration",
        exaggerationFetchRef,
        true,
        1,
        parseFloat,
        managerApi.options, 
        saveSettings,
        forceRedraw
      );
    } else {
      console.warn("bindSlider ist nicht verfügbar.");
    }

    const shadingVariantInput = document.getElementById(
      "shadingVariant" + idSuffix
    );
    if (shadingVariantInput) {
      shadingVariantInput.addEventListener("change", () => {
        const selectedValue = shadingVariantInput.value;
        managerApi.options.shadingVariant = selectedValue; 
        updateInputAvailability(selectedValue);  

        saveSettings();
        forceRedraw();
      });
      
      shadingVariantInput.value = managerApi.options.shadingVariant;
      updateInputAvailability(managerApi.options.shadingVariant);
    } else {
      console.warn(
        "shadingVariant input nicht gefunden für idSuffix:",
        idSuffix
      );
    }
    
    const gradientAlgorithmVariantInput = document.getElementById(
      "gradientAlgorithmVariant" + idSuffix
    );
    if (gradientAlgorithmVariantInput) {
      gradientAlgorithmVariantInput.addEventListener("change", () => {
        const selectedValue = gradientAlgorithmVariantInput.value;
        managerApi.options.gradientAlgorithmVariant = selectedValue; 
        saveSettings();
        forceRedraw();
      });
      gradientAlgorithmVariantInput.value =
        managerApi.options.gradientAlgorithmVariant;
    } else {
      console.warn(
        "gradientAlgorithmVariant input nicht gefunden für idSuffix:",
        idSuffix
      );
    }

    document
      .getElementById("btn-hillshade-standard" + idSuffix)
      ?.addEventListener("click", () => {
        resetOptionsToDefaults(); 

        const shadingInput = document.getElementById(
          "shadingVariant" + idSuffix
        );
        if (shadingInput) {
          shadingInput.value = managerApi.options.shadingVariant;
          updateInputAvailability(managerApi.options.shadingVariant); 
        }
        const gradientInput = document.getElementById(
          "gradientAlgorithmVariant" + idSuffix
        );
        if (gradientInput) {
          gradientInput.value = managerApi.options.gradientAlgorithmVariant;
        }
       
        if (typeof global.updateInputAndLabel === "function") {
          global.updateInputAndLabel(
            "azimuth",
            idSuffix,
            managerApi.options.azimuth.toFixed(0)
          );
          global.updateInputAndLabel(
            "altitude",
            idSuffix,
            managerApi.options.altitude.toFixed(0)
          );
          global.updateInputAndLabel(
            "exaggeration",
            idSuffix,
            managerApi.options.exaggeration.toFixed(1)
          );
        }
      });

    document
      .getElementById("btn-hillshade-zeichnen" + idSuffix)
      ?.addEventListener("click", () => {
        forceRedraw();
      });

    if (typeof global.updateInputAndLabel === "function") {
      global.updateInputAndLabel(
        "azimuth",
        idSuffix,
        managerApi.options.azimuth.toFixed(0)
      );
      global.updateInputAndLabel(
        "altitude",
        idSuffix,
        managerApi.options.altitude.toFixed(0)
      );
      global.updateInputAndLabel(
        "exaggeration",
        idSuffix,
        managerApi.options.exaggeration.toFixed(1)
      );
    }
    
    if (shadingVariantInput) {
      shadingVariantInput.value = managerApi.options.shadingVariant;
    }
    if (gradientAlgorithmVariantInput) {
      gradientAlgorithmVariantInput.value =
        managerApi.options.gradientAlgorithmVariant;
    }
  }
  
  const hillshadeModeManager = createTileManager({
    type: "hillshade",
    label: TEXT_HILLSHADE_LABEL,
    modeId: MODE_HILLSHADE,
    apiUrl: HILLSHADE_API_URL,
    defaultOptions: HILLSHADE_OPTIONS_DEFAULTS,
    hasGradientAlgorithm: true,
    hasColorMap: false, 
    buildRequestBody: buildHillshadeRequestBody,
    extractTileData: extractHillshadeTileData,
    getCustomPanelHtml: getHillshadePanelHtml, 
    initCustomPanelHelper: initHillshadePanelHelper, 
  });

  document.addEventListener("DOMContentLoaded", () => {   
    if (window.map) {
      // console.info("hillshade_1.js initialisiert.");
      if (typeof global.createLoadingSpinner === 'function') global.createLoadingSpinner();

      hillshadeModeManager.init();           
      hillshadeModeManager.addCustomControls();    
    } else {
      console.error("Leaflet Kartenobjekt 'map' fehlt bei DOMContentLoaded für hillshade_1.js");
    }
  });

  // Optionally expose the manager instance globally for debugging or external interaction
  global.hillshadeModeManager = hillshadeModeManager;

})(window); // Pass 'window' as 'global' to the IIFE.