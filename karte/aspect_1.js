const aspect_url = "https://api.hoehendaten.de:14444/v1/aspect";

const txt_aspect = "Hangexposition";

const MODE_ASPECT = 25;

const aspect_options_defaults = {
  gradientAlgorithmVariant: "ZevenbergenThorne",
  coloringAlgorithmVariant: "interpolation",
  colorMap: {
    0:    { r: 190, g: 190, b: 220, a: 255 },
    22.5: { r: 180, g: 220, b: 200, a: 255 },
    67.5: { r: 255, g: 255, b: 180, a: 255 },
    112.5:{ r: 255, g: 220, b: 160, a: 255 },
    157.5:{ r: 255, g: 180, b: 120, a: 255 },
    202.5:{ r: 245, g: 190, b: 130, a: 255 },
    247.5:{ r: 200, g: 210, b: 230, a: 255 },
    292.5:{ r: 190, g: 190, b: 220, a: 255 },
    337.5:{ r: 190, g: 190, b: 220, a: 255 },
    360.0:{ r: 190, g: 190, b: 220, a: 255 },
    nv:   { r: 0,   g: 0,   b: 0,   a: 0   }
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

function buildAspectRequestBody(latlng, options) {
  return {
    Type: "AspectRequest",
    ID: `Aspect at ${latlng.lat},${latlng.lng}`,
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
function extractAspectTileData(data) {
  const aspectsArray = data?.Attributes?.Aspects;
  if (!Array.isArray(aspectsArray) || aspectsArray.length === 0) {
    throw new Error("No aspect data found in response.");
  }
  return aspectsArray;
}
const aspectModeManager = createTileManager({
  type: "aspect",
  label: txt_aspect,
  modeId: MODE_ASPECT,
  apiUrl: aspect_url,
  defaultOptions: aspect_options_defaults,
  hasGradientAlgorithm: true, // Aspect mode uses a gradient algorithm
  hasColorMap: true,
  buildRequestBody: buildAspectRequestBody,
  extractTileData: extractAspectTileData,
});

document.addEventListener("DOMContentLoaded", () => {
  if (window.map) {
    // console.info("Initializing Aspect mode (aspect.js)...");
    if (typeof createLoadingSpinner === 'function') 
      createLoadingSpinner();
    
    aspectModeManager.init();
    aspectModeManager.addCustomControls();    
  } else {
    console.error("window.map is missing! Cannot initialize aspect.js.");
  }
});