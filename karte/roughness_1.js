// roughness.js

const roughness_url = "https://api.hoehendaten.de:14444/v1/roughness";

const txt_roughness = "Geländerauheit";

const MODE_ROUGHNESS = 24;

const roughness_options_defaults = {
  coloringAlgorithmVariant: "interpolation",
  colorMap: { 
    0.0: { r: 173, g: 216, b: 230, a: 255 },
    0.2: { r: 57, g: 176, b: 130, a: 255 },
    0.35: { r: 28, g: 126, b: 0, a: 255 },
    0.5: { r: 255, g: 200, b: 0, a: 255 },
    1.25: { r: 255, g: 165, b: 0, a: 255 },
    2.0: { r: 255, g: 0, b: 0, a: 255 },
    3.5: { r: 180, g: 0, b: 0, a: 255 },
    5.0: { r: 0, g: 0, b: 0, a: 255 },
    nv: { r: 0, g: 0, b: 0, a: 0 },
  },
  opacity: 20, // das wird transparency !!!

  styleOptions: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      opacity: 100,
      blendMode: "normal"
    }
};

function buildRoughnessRequestBody(latlng, options) {
  return {
    Type: "RoughnessRequest",
    ID: `Roughness at ${latlng.lat},${latlng.lng}`,
    Attributes: {
      Zone: 0, Easting: 0.0, Northing: 0.0,
      Longitude: latlng.lng, Latitude: latlng.lat,     
      ColoringAlgorithm: options.coloringAlgorithmVariant,
      ColorTextFileContent: Object.entries(options.colorMap).map(([key, c]) =>
        `${key} ${c.r} ${c.g} ${c.b} ${c.a}`
      ),
    },
  };
}

function extractRoughnessTileData(data) {
  const roughnessesArray = data?.Attributes?.Roughnesses;
  if (!Array.isArray(roughnessesArray) || roughnessesArray.length === 0) {
    throw new Error("No roughness data found in response.");
  }
  return roughnessesArray;
}

const roughnessModeManager = createTileManager({
  type: "roughness",
  label: txt_roughness,
  modeId: MODE_ROUGHNESS,
  apiUrl: roughness_url,
  defaultOptions: roughness_options_defaults,
  hasGradientAlgorithm: false, 
  hasColorMap: true,
  buildRequestBody: buildRoughnessRequestBody,
  extractTileData: extractRoughnessTileData,
});

document.addEventListener("DOMContentLoaded", () => {
  if (window.map) {    
    if (typeof createLoadingSpinner === 'function') createLoadingSpinner();
    
    roughnessModeManager.init();
    roughnessModeManager.addCustomControls();    
  } else {
    console.error("window.map is missing! Cannot initialize roughness.js.");
  }
});