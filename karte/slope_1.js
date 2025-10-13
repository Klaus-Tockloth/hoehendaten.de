// slope.js

const slope_url = "https://api.hoehendaten.de:14444/v1/slope";

const txt_slope = "Hangneigung";

const MODE_SLOPE = 26;

const slope_options_defaults = {
  gradientAlgorithmVariant: "ZevenbergenThorne",
  coloringAlgorithmVariant: "interpolation",
  colorMap: {
    0: { r: 0, g: 100, b: 0, a: 255 },
    5: { r: 0, g: 200, b: 0, a: 255 },
    10: { r: 100, g: 255, b: 0, a: 255 },
    20: { r: 200, g: 200, b: 0, a: 255 },
    30: { r: 255, g: 150, b: 0, a: 255 },
    40: { r: 255, g: 100, b: 0, a: 255 },
    45: { r: 255, g: 0, b: 0, a: 255 },
    60: { r: 150, g: 0, b: 0, a: 255 },
    90: { r: 0, g: 0, b: 0, a: 255 },
    nv: { r: 0, g: 0, b: 0, a: 0 }
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

function buildSlopeRequestBody(latlng, options) {
  return {
    Type: "SlopeRequest",
    ID: `Slope at ${latlng.lat},${latlng.lng}`,
    Attributes: {
      Zone: 0, Easting: 0.0, Northing: 0.0, 
      Longitude: latlng.lng, Latitude: latlng.lat,
      GradientAlgorithm: options.gradientAlgorithmVariant,
      ColoringAlgorithm: options.coloringAlgorithmVariant,      
      ColorTextFileContent: Object.entries(options.colorMap).map(([key, c]) =>
        `${key} ${c.r} ${c.g} ${c.b} ${c.a}`
      ),
    }
  };
}

function extractSlopeTileData(data) {
  const slopesArray = data?.Attributes?.Slopes;
  if (!Array.isArray(slopesArray) || slopesArray.length === 0) {
    throw new Error("No slope data found in response.");
  }
  return slopesArray;
}

const slopeModeManager = createTileManager({
  type: "slope",
  label: txt_slope,
  modeId: MODE_SLOPE,
  apiUrl: slope_url,
  defaultOptions: slope_options_defaults,
  hasGradientAlgorithm: true, 
  hasColorMap: true,     
  buildRequestBody: buildSlopeRequestBody,
  extractTileData: extractSlopeTileData,
});

document.addEventListener("DOMContentLoaded", () => {  
  if (window.map) {
    // console.info("Initializing Slope mode (slope.js)...");
    if (typeof createLoadingSpinner === 'function') 
      createLoadingSpinner();     
   
    slopeModeManager.init();    
   
    slopeModeManager.addCustomControls();
    
  } else {
    console.error("window.map is missing! Cannot initialize slope.js.");  
  }
}); 