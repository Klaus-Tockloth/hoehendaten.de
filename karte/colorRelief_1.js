const colorrelief_url = "https://api.hoehendaten.de:14444/v1/colorrelief";

const txt_colorrelief = "Farbrelief";

const MODE_COLORRELIEF = 27;

const colorrelief_options_defaults = { 
  coloringAlgorithmVariant: "interpolation",
  colorMap: {
    0.0:  { r: 0,   g: 0,   b: 139, a: 255 },
    200:  { r: 0,   g: 191, b: 255, a: 255 },
    400:  { r: 34,  g: 139, b: 34,  a: 255 },
    600:  { r: 50,  g: 205, b: 50,  a: 255 },
    800:  { r: 173, g: 255, b: 47,  a: 255 },
    1000: { r: 255, g: 255, b: 0,   a: 255 },
    1200: { r: 255, g: 165, b: 0,   a: 255 },
    1400: { r: 255, g: 100, b: 0,   a: 255 },
    1600: { r: 255, g: 0,   b: 0,   a: 255 },
    1800: { r: 200, g: 0,   b: 0,   a: 255 },
    2000: { r: 139, g: 69,  b: 19,  a: 255 },
    2200: { r: 169, g: 169, b: 169, a: 255 },
    2400: { r: 192, g: 192, b: 192, a: 255 },
    2600: { r: 255, g: 255, b: 255, a: 255 },
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

function buildColorReliefRequestBody(latlng, options) {
  return {
    Type: "ColorReliefRequest",
    ID: `ColorRelief at ${latlng.lat},${latlng.lng}`,
    Attributes: {
      Zone: 0, Easting: 0.0, Northing: 0.0,
      Longitude: latlng.lng, Latitude: latlng.lat,
      // Use the standardized coloringAlgorithmVariant and colorMap
      ColoringAlgorithm: options.coloringAlgorithmVariant,
      ColorTextFileContent: Object.entries(options.colorMap).map(([key, c]) =>
        `${key} ${c.r} ${c.g} ${c.b} ${c.a}`
      ),
    },
  };
}

function extractColorReliefTileData(data) {
  const colorreliefesArray = data?.Attributes?.ColorReliefs;
  if (!Array.isArray(colorreliefesArray) || colorreliefesArray.length === 0) {
    throw new Error("No colorrelief data found in response.");
  }
  return colorreliefesArray;
}

const colorreliefModeManager = createTileManager({
  type: "colorRelief",
  label: txt_colorrelief,
  modeId: MODE_COLORRELIEF,
  apiUrl: colorrelief_url,
  defaultOptions: colorrelief_options_defaults,
  hasGradientAlgorithm: false, // ColorRelief mode DOES NOT use a gradient algorithm
  hasColorMap: true,
  buildRequestBody: buildColorReliefRequestBody,
  extractTileData: extractColorReliefTileData,
});

document.addEventListener("DOMContentLoaded", () => {
  if (window.map) {
    // console.info("Initializing ColorRelief mode (colorRelief.js)...");
    if (typeof createLoadingSpinner === 'function') 
      createLoadingSpinner();
    
    colorreliefModeManager.init();
    colorreliefModeManager.addCustomControls();    
  } else {
    console.error("window.map is missing! Cannot initialize colorRelief.js.");
  }
});