// tri.js

const tri_url = "https://api.hoehendaten.de:14444/v1/tri";

// const txt_tri = "TRI&nbsp;(Ruggedness)";
// const txt_tri = "TRI\u00A0(Ruggedness)";
const txt_tri = "TRI";

const MODE_TRI = 23;

const tri_options_defaults = {
  coloringAlgorithmVariant: "interpolation",
  colorMap: {
    0.00: { r: 173, g: 216, b: 230, a: 255 },
    0.20: { r: 57,  g: 176, b: 130, a: 255 },
    0.40: { r: 104, g: 151, b: 0,   a: 255 },
    0.60: { r: 255, g: 195, b: 0,   a: 255 },
    0.80: { r: 255, g: 186, b: 0,   a: 255 },
    1.00: { r: 255, g: 177, b: 0,   a: 255 },
    1.20: { r: 255, g: 167, b: 0,   a: 255 },
    1.40: { r: 255, g: 132, b: 0,   a: 255 },
    1.60: { r: 255, g: 88,  b: 0,   a: 255 },
    1.80: { r: 255, g: 44,  b: 0,   a: 255 },
    2.00: { r: 255, g: 0,   b: 0,   a: 255 },
    2.20: { r: 245, g: 0,   b: 0,   a: 255 },
    2.40: { r: 235, g: 0,   b: 0,   a: 255 },
    2.60: { r: 225, g: 0,   b: 0,   a: 255 },
    2.80: { r: 215, g: 0,   b: 0,   a: 255 },
    3.00: { r: 205, g: 0,   b: 0,   a: 255 },
    3.20: { r: 195, g: 0,   b: 0,   a: 255 },
    3.40: { r: 185, g: 0,   b: 0,   a: 255 },
    3.60: { r: 168, g: 0,   b: 0,   a: 255 },
    3.80: { r: 144, g: 0,   b: 0,   a: 255 },
    4.00: { r: 120, g: 0,   b: 0,   a: 255 },
    4.20: { r: 96,  g: 0,   b: 0,   a: 255 },
    4.40: { r: 72,  g: 0,   b: 0,   a: 255 },
    4.60: { r: 48,  g: 0,   b: 0,   a: 255 },
    4.80: { r: 24,  g: 0,   b: 0,   a: 255 },
    5.00: { r: 0,   g: 0,   b: 0,   a: 255 },
    nv:   { r: 0,   g: 0,   b: 0,   a: 0   },
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

function buildTriRequestBody(latlng, options) {
  return {
    Type: "TRIRequest",
    ID: `Tri at ${latlng.lat},${latlng.lng}`,
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

function extractTriTileData(data) {
  const triesArray = data?.Attributes?.TRIs;
  if (!Array.isArray(triesArray) || triesArray.length === 0) {
    throw new Error("No tri data found in response.");
  }
  return triesArray;
}

const triModeManager = createTileManager({
  type: "tri",
  label: txt_tri,
  modeId: MODE_TRI,
  apiUrl: tri_url,
  defaultOptions: tri_options_defaults,
  hasGradientAlgorithm: false, 
  hasColorMap: true,     
  buildRequestBody: buildTriRequestBody,
  extractTileData: extractTriTileData,
});

document.addEventListener("DOMContentLoaded", () => {
  if (window.map) {
    if (typeof createLoadingSpinner === 'function') 
      createLoadingSpinner();
    
    triModeManager.init();
    triModeManager.addCustomControls();    
  } else {
    console.error("window.map is missing! Cannot initialize tri.js.");
  }
});