// tpi.js

const tpi_url = "https://api.hoehendaten.de:14444/v1/tpi";

//const txt_tpi = "TPI&nbsp;(Position)";
const txt_tpi = "TPI\u00A0(Position)";

const MODE_TPI = 22;

const tpi_options_defaults = {  
  coloringAlgorithmVariant: "interpolation",
    colorMap: {
    "-0.050001": { r: 0,   g: 0,   b: 0,   a: 255 },
    "-0.05":     { r: 255, g: 255, b: 255, a: 255 },
    "0.05":      { r: 255, g: 255, b: 255, a: 255 },
    "0.050001":  { r: 0,   g: 0,   b: 0,   a: 255 },
    "nv":        { r: 0,   g: 0,   b: 0,   a: 0   },
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

function buildTpiRequestBody(latlng, options) {
  return {
    Type: "TPIRequest",
    ID: `Tpi at ${latlng.lat},${latlng.lng}`,
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

function extractTpiTileData(data) {
  const tpiesArray = data?.Attributes?.TPIs;
  if (!Array.isArray(tpiesArray) || tpiesArray.length === 0) {
    throw new Error("No tpi data found in response.");
  }
  return tpiesArray;
}

const tpiModeManager = createTileManager({
  type: "tpi",
  label: txt_tpi,
  modeId: MODE_TPI,
  apiUrl: tpi_url,
  defaultOptions: tpi_options_defaults,
  hasGradientAlgorithm: false, 
  hasColorMap: true,
  buildRequestBody: buildTpiRequestBody,
  extractTileData: extractTpiTileData,
});

document.addEventListener("DOMContentLoaded", () => {
  if (window.map) {
    // console.info("Initializing Tpi mode (tpi.js)...");
    if (typeof createLoadingSpinner === 'function') createLoadingSpinner();
    
    tpiModeManager.init();   
    tpiModeManager.addCustomControls();
    
  } else {
    console.error("window.map is missing! Cannot initialize tpi.js.");
  }
});