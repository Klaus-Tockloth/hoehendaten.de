const CompassControl = L.Control.extend({
  options: { position: 'topcenter' },

  initialize(opts) {
    L.setOptions(this, opts);
    this._handleOrientation = this._handleOrientation.bind(this);
  },

  onAdd(map) {
    // make sure a 'topcenter' corner exists
    if (!map._controlCorners.topcenter) 
      addTopCenterCorner(map);

    this._div = L.DomUtil.create('div', 'leaflet-compass');
    startOrientation(this._handleOrientation);
    return this._div;
  },

  onRemove() {
    stopOrientation(this._handleOrientation);
  },

  _handleOrientation(alpha /*°, 0 = north*/) {
    // Device gives clockwise degrees – we want the arrow to stay
    // pointing toward true north, so rotate CCW:
    this._div.style.transform = `rotate(${-alpha}deg)`;
  }
});

// add a new Leaflet corner: leaflet-top leaflet-center
function addTopCenterCorner(map) {
  const top = map._controlCorners.topleft.parentNode;
  const tc  = L.DomUtil.create('div', 'leaflet-top leaflet-center', top);
  top.insertBefore(tc, map._controlCorners.topright);
  map._controlCorners.topcenter = tc;
}

// simple DeviceOrientation listener with permission helper (iOS ≥ 13)
let listenerCount = 0;
function startOrientation(cb) {
  listenerCount++;
  if (listenerCount > 1) return;      // already listening

  const hook = (e) => {
    if (e.absolute !== false && e.alpha != null) cb(e.alpha);
  };

  if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
    // iOS – need explicit user gesture once
    DeviceOrientationEvent.requestPermission()
      .then((state) => state === 'granted' && window.addEventListener('deviceorientation', hook, true))
      .catch(console.error);
  } else {
    window.addEventListener('deviceorientationabsolute', hook, true);
    window.addEventListener('deviceorientation',          hook, true);
  }

  startOrientation._hook = hook;
}

function stopOrientation(cb) {
  if (--listenerCount > 0) return;
  const h = startOrientation._hook;
  if (h) {
    window.removeEventListener('deviceorientationabsolute', h, true);
    window.removeEventListener('deviceorientation',          h, true);
    startOrientation._hook = null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
    // Wait until map is available
    if (window.map) {

        console.info('Hi, here is compass.js!');

        // ensure the custom corner once
        map.whenReady(() => new CompassControl().addTo(map));
    }
    else {
      alert("window.map is missing !");
    }
  });