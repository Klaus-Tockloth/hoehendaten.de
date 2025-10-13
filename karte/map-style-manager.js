// map-style-manager

class MapStyleManager {
  constructor(saveSettingsFn, redrawFn) {
    this.saveSettings = saveSettingsFn;
    this.redraw = redrawFn;

    if (typeof this.redraw === "function") {
    } else {
      console.log("not a function redrawFn: ", redrawFn);
    }
  }

  static STYLE_CONTROLS_DEF = {
    sliders: [
      {
        key: "brightness",
        label: "Helligkeit",
        min: 0,
        max: 200,
        step: 1,
        unit: "%",
      },
      {
        key: "contrast",
        label: "Kontrast",
        min: 0,
        max: 200,
        step: 1,
        unit: "%",
      },
      {
        key: "saturation",
        label: "Sättigung",
        min: 0,
        max: 200,
        step: 1,
        unit: "%",
      },
      {
        key: "opacity",
        label: "Deckkraft",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
      },
    ],
    blendModes: [
      "normal",
      "multiply",
      "screen",
      "overlay",
      "color-burn",
      "color-dodge",
      "hard-light",
      "soft-light",
      "hue",
      "saturation",
      "color",
      "luminosity",
    ],
  };

  static getHtml(opts, idSuffix = "") {
    const sliderHtml = MapStyleManager.STYLE_CONTROLS_DEF.sliders
      .map((s) =>
        window.makeSlider(
          s.key,
          idSuffix,
          s.label,
          opts[s.key],
          s.min,
          s.max,
          s.step,
          0,
          s.unit
        )
      )
      .join("");

    const blendModeLabels = {
      normal: "Normal (normal)",
      multiply: "Multiplizieren (multiply)",
      screen: "Negativ multiplizieren (screen)",
      overlay: "Überlagern (overlay)",
      "color-burn": "Farbig abwedeln (color-burn)",
      "color-dodge": "Farbig nachbelichten (color-dodge)",
      "hard-light": "Hartes Licht (hard-light)",
      "soft-light": "Weiches Licht (soft-light)",
      hue: "Farbton (hue)",
      saturation: "Sättigung (saturation)",
      color: "Farbe (color)",
      luminosity: "Helligkeit (luminosity)",
    };

    const blendOptions = MapStyleManager.STYLE_CONTROLS_DEF.blendModes
      .map(
        (m) =>
          `<option value="${m}" ${opts.blendMode === m ? "selected" : ""}>${
            blendModeLabels[m] || m
          }</option>`
      )
      .join("");

    return `      
      ${sliderHtml}
      <label for="style-blendMode${idSuffix}">Mischmodus:</label>
      <select id="style-blendMode${idSuffix}">${blendOptions}</select>
  `;
  }

  init(opts, idSuffix = "") {
    this.currentBrightness =
      typeof opts.brightness === "number" ? opts.brightness : 100;
    this.currentContrast =
      typeof opts.contrast === "number" ? opts.contrast : 100;
    this.currentSaturation =
      typeof opts.saturation === "number" ? opts.saturation : 100;
    this.currentOpacity = typeof opts.opacity === "number" ? opts.opacity : 100;
    this.currentBlendMode = opts.blendMode || "normal";
    
    opts.brightness = this.currentBrightness;
    opts.contrast = this.currentContrast;
    opts.saturation = this.currentSaturation;
    opts.opacity = this.currentOpacity;
    opts.blendMode = this.currentBlendMode;

    MapStyleManager.STYLE_CONTROLS_DEF.sliders.forEach((s) => {
      bindSlider(
        s.key, 
        idSuffix, 
        s.key, 
        { value: false }, 
        false, 
        s.precision ?? 1, 
        s.toNumber ?? parseFloat,
        opts, 
        this.saveSettings.bind(this), 
        this.updateBaseMapStyle.bind(this) 
      );
    });

    const blendSel = document.getElementById("style-blendMode" + idSuffix);
    if (blendSel) {
      blendSel.value = opts.blendMode; 
      blendSel.addEventListener("change", (e) => {
        opts.blendMode = e.target.value;
        this.currentBlendMode = opts.blendMode;

        this.updateBaseMapStyle();
        this.saveSettings();
      });
    }
  }

  updateBaseMapStyle() {
    if (typeof this.redraw === "function") {
      this.redraw();
    } else {
      console.warn(
        "updateBaseMapStyle missing redraw function !!! ",
        this.redraw
      );
    }
  }

  static applyFilterAndBlendMode(type, opts = {}) {
    const name = getOrCreatePane(map, type);
    const thePane = map.getPane(type + "Pane");

    if (thePane) {
      // Aktuellen z-index auslesen
      const currentZ = thePane.style.zIndex;
      // console.log(`applyFilterAndBlendMode Pane ${type} hat z-index:`, currentZ);

      // Neuen z-index setzen
      //thePane.style.zIndex = 650; // Beispielwert, höher = weiter oben

      //console.log("opts: " , opts) ;
      const filterString = `brightness(${opts.brightness ?? 100}%) 
                          contrast(${opts.contrast ?? 100}%) 
                          saturate(${opts.saturation ?? 100}%) 
                          opacity(${opts.opacity ?? 100}%)`;
      const blendMode = opts.blendMode || "normal";

      thePane.style.filter = filterString;
      thePane.style.mixBlendMode = blendMode;

      //console.log("applyImageLayerStyles: Style update complete.");
    } else {
      console.warn("missing pane for type: ", type);
    }
  }
}
