// trackme_1.js

const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };
const TRACKING_DISTANCE_THRESHOLD = 25; // Minimum distance in meters to record a new point

const txt_GoToCurrentLocation = "Go to current location";
const txt_GeolocationFailed = "Geolocation failed: ";
const txt_GeolocationIsNotSupportedByYourBrowser = "Geolocation is not supported by your browser.";

let isRecording = false;
let watchId = null;

let recordedPoints = [];
let totalDistance = 0;
let up = 0;
let down = 0;
let trackMarkers = [];
let trackLines = [];
let lastTooltipMarker = null;

const SMOOTH_WINDOW = 3;
let lastLocations = [];

// Array to store console log history
let consoleLogHistory = [];

// --- IndexedDB ---
let db;
const DB_NAME = "trackmeDB";
const STORE_NAME = "points";

function initDB(callback) {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { autoIncrement: true });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log("Database opened successfully.");
        if (callback) callback();
    };

    request.onerror = (event) => {
        console.error("Database error: " + event.target.errorCode);
    };
}

function addPointToDB(point) {
    if (!db) return;
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.add(point);
}

function getAllPointsFromDB(callback) {
    if (!db) return;
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        if (callback) callback(request.result);
    };

    request.onerror = (event) => {
        console.error("Error fetching points from DB: " + event.target.errorCode);
    };
}

function clearDB() {
    if (!db) return;
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
}


// Function to capture console logs
function captureConsoleLogs() {
    const originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console)
    };

    function formatMessage(args) {
        return args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return 'Unserializable Object';
                }
            }
            return String(arg);
        }).join(' ');
    }

    Object.keys(originalConsole).forEach(level => {
        console[level] = function(...args) {
            const message = formatMessage(args);
            const timestamp = new Date().toISOString();
            consoleLogHistory.push(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
            originalConsole[level](...args);
        };
    });
}

// Initialize console capture immediately
captureConsoleLogs();


// --- Wake Lock Functions ---
let wakeLock = null;

const requestWakeLock = async () => {
    if (document.visibilityState === 'visible') {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock was released');
                wakeLock = null;
            });
            console.log('Wake Lock is active');
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }
};

// Re-acquire the wake lock when the page becomes visible again.
document.addEventListener('visibilitychange', async () => {
    if (wakeLock === null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

const releaseWakeLock = async () => {
  if (wakeLock !== null) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('Screen Wake Lock released.');
    } catch (err) {
      console.error(`${err.name}, ${err.message}`);
    }
  }
}

/*
You could remove both requestNotificationPermission and sendNotification functions, 
and the associated calls to them, 
and the application would still successfully track and save the user's route.

However, by doing so, 
you would lose the benefit of proactively informing the user about important events, 
particularly tracking errors. 
Therefore, while not essential for the primary function, 
these notification features are a highly recommended enhancement 
for creating a more robust and user-friendly tracking application.
*/
// --- Notification Functions ---
function requestNotificationPermission() {
    if (_isSafariOnIOS)
        return;

    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return;
    }

    if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Notification permission granted.");
            } else {
                console.warn("Notification permission denied.");
            }
        });
    }
}

function sendNotification(title, body) {
    if (_isSafariOnIOS)
        return;

    if (Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: '/icon.png',
            tag: 'trackme-status',
            renotify: true
        });
    } else {
        console.log(`[Notification Skipped] Title: ${title}, Body: ${body}`);
    }
}

let _isSafariOnIOS = false;
function isSafariOnIOS() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isAppleVendor = /Apple Computer, Inc./.test(navigator.vendor);

  _isSafariOnIOS = isIOS && isSafari && isAppleVendor;

  return _isSafariOnIOS;
}

// --- Init on DOM ---
document.addEventListener("DOMContentLoaded", () => {

    if (isSafariOnIOS()) {
        console.log("This is running on Safari on an iOS device.");
        // You could apply specific logic or CSS classes here if needed
        document.body.classList.add('safari-ios');
    }

    if (window.map) {
        console.info('Hi, here is trackme.js!');
        initDB(() => {
            restoreTrackIfNeeded();
        });
        getLocation();
        addCustomControlsForTrackingPlugin();
    }
    else {
        alert("window.map is missing !");
    }
});

// --- Toolbar Controls ---
function addCustomControlsForTrackingPlugin() {

    const Control = L.Control.extend({
        onAdd: () => {
            const container = L.DomUtil.create("div", "leaflet-control leaflet-bar trackme-bar");
            const btns = [];

            function makeBtn(html, title, toggle, onClick, onUnpress = null, cl = "") {
                const a = L.DomUtil.create("a", "elevation-btn " + cl, container);
                a.innerHTML = html;
                a.title = title;
                L.DomEvent.disableClickPropagation(a);
                const btnEntry = { element: a, onUnpress };
                a.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const wasPressed = a.classList.contains("pressed");
                    if (toggle) {
                        if (wasPressed) {
                            a.classList.remove("pressed");
                            if (onUnpress) onUnpress(a);
                        } else {
                            btns.forEach((btn) => {
                                if (btn.element !== a && btn.element.classList.contains("pressed")) {
                                    btn.element.classList.remove("pressed");
                                    if (btn.onUnpress) btn.onUnpress(btn.element);
                                }
                            });
                            a.classList.add("pressed");
                            onClick(a);
                        }
                    } else {
                        onClick(a);
                    }
                });
                btns.push(btnEntry);
                return a;
            }

            const fileInput = L.DomUtil.create("input", "", container);
            fileInput.type = "file";
            fileInput.accept = ".gpx,.kml,.geojson";
            fileInput.style.display = "none";

            makeBtn("📂", "Upload track", false, () => fileInput.click(), null, "elevation-btn-upload");
            fileInput.addEventListener("change", onFileSelected);

            makeBtn("📍", txt_GoToCurrentLocation, false, () => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const latlng = [position.coords.latitude, position.coords.longitude];
                            logPosition(position);
                            map.setView(latlng, 16);
                            aaddMarker(L.latLng(latlng));
                        },
                        (err) => alert(txt_GeolocationFailed + err.message),
                        GEOLOCATION_OPTIONS
                    );
                } else {
                    alert(txt_GeolocationIsNotSupportedByYourBrowser);
                }
            }, null, "elevation-btn-locate");

            makeBtn("👣", "Track me", true,
                () => { // On Press
                    isRecording = true;
                    localStorage.setItem("isRecording", "true");
                    // Reset all tracking variables
                    recordedPoints = [];
                    totalDistance = 0;
                    up = 0;
                    down = 0;
                    trackMarkers.forEach(m => map.removeLayer(m));
                    trackMarkers = [];
                    trackLines.forEach(l => map.removeLayer(l));
                    trackLines = [];
                    lastTooltipMarker = null;
                    lastLocations = [];
                    consoleLogHistory = []; 
                    clearDB();
                    
                    requestNotificationPermission();
                    requestWakeLock();
                    startTracking();
                    alert("Tracking started...");
                    console.log(`Tracking started, ${TRACKING_DISTANCE_THRESHOLD} m`);
                },
                () => { // On Unpress
                    isRecording = false;
                    localStorage.removeItem("isRecording");
                    releaseWakeLock();
                    stopTracking();
                    alert("Tracking stopped. Points recorded: " + recordedPoints.length);
                    saveGPXFile();
                },
                "elevation-btn-trackme"
            );

            return container;
        },
    });

    new Control({ position: "topleft" }).addTo(map);
}

// --- File import GPX/KML/GeoJSON ---
function onFileSelected(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const gpxText = e.target.result;
        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxText, "application/xml");

        // Requires the togeojson.js library
        const geojson = toGeoJSON.gpx(gpxDoc);
        console.log("GeoJSON from GPX:", geojson);

        if (!map.getPane('gpxPane')) {
            map.createPane('gpxPane');
            map.getPane('gpxPane').style.zIndex = 650;
        }

        const gpxLayer = L.geoJSON(geojson, {
            pane: 'gpxPane',
            style: { color: "#f00", weight: 4, opacity: 0.7 },
            onEachFeature: function (feature, layer) {
                if (feature.properties.name) {
                    layer.bindPopup(feature.properties.name);
                }
            }
        }).addTo(map);

        map.fitBounds(gpxLayer.getBounds());
    };
    reader.readAsText(file);
}

// --- Geolocation Functions ---
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(logPosition, showError, GEOLOCATION_OPTIONS);
    } else {
        console.warn("Geolocation is not supported.");
    }
}

function logPosition(position) {
    console.log(`Latitude: ${position.coords.latitude}, Longitude: ${position.coords.longitude}`);
}

function showError(error) {
    console.error(`Geolocation Error: ${error.message}`);
}

// --- Distance Calculation ---
function getDistanceMeters(p1, p2) {
    if (!p1 || !p2 || !isFinite(p1.lat) || !isFinite(p1.lng) || !isFinite(p2.lat) || !isFinite(p2.lng)) {
        console.warn("Invalid coordinates for distance calculation.", p1, p2);
        return 0;
    }
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// --- GPX Export ---
function exportToGPX(points) {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrackMe" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>My Track</name><trkseg>`;

    const footer = `</trkseg></trk></gpx>`;

    const segments = points.map(p => {
        const eleLine = typeof p.elevation === "number" ? `<ele>${p.elevation.toFixed(1)}</ele>` : "";
        return `<trkpt lat="${p.lat}" lon="${p.lng}">${eleLine}<time>${p.time}</time></trkpt>`;
    }).join("\n");

    return header + "\n" + segments + "\n" + footer;
}

function saveGPXFile() {
    if (recordedPoints.length === 0) {
        console.log("No points recorded, skipping file save.");
        return;
    }

    // --- Save GPX File ---
    const gpxData = exportToGPX(recordedPoints);
    const gpxBlob = new Blob([gpxData], { type: 'application/gpx+xml' });
    const gpxUrl = URL.createObjectURL(gpxBlob);
    const gpxLink = document.createElement("a");
    gpxLink.href = gpxUrl;
    gpxLink.download = "track.gpx";
    document.body.appendChild(gpxLink);
    gpxLink.click();
    document.body.removeChild(gpxLink);
    URL.revokeObjectURL(gpxUrl);

    // --- Save Console Log File ---
    if (false) {
      setTimeout(() => {
        const logData = consoleLogHistory.join("\n");
        const logBlob = new Blob([logData], { type: "text/plain" });
        const logUrl = URL.createObjectURL(logBlob);
        const logLink = document.createElement("a");
        logLink.href = logUrl;
        logLink.download = "console_log.txt";
        document.body.appendChild(logLink);
        logLink.click();
        document.body.removeChild(logLink);
        URL.revokeObjectURL(logUrl);
      }, 5000);
    }
    
}

// --- Location Smoothing ---
function smoothLocation(lat, lng) {
    lat = Number(lat);
    lng = Number(lng);

    if (isNaN(lat) || isNaN(lng)) {
        console.error("Invalid lat/lng for smoothing:", lat, lng);
        return null;
    }

    lastLocations.push({ lat, lng });
    if (lastLocations.length > SMOOTH_WINDOW) lastLocations.shift();

    const avgLat = lastLocations.reduce((sum, p) => sum + p.lat, 0) / lastLocations.length;
    const avgLng = lastLocations.reduce((sum, p) => sum + p.lng, 0) / lastLocations.length;

    return { lat: avgLat, lng: avgLng };
}

// --- Tracking Logic ---
function startTracking() {
    if (!isRecording) return;
    
    console.log("Starting geolocation watch...");

    watchId = navigator.geolocation.watchPosition(
        // Make the callback async
        async (pos) => {
            // Ensure wake lock is active
            if (!wakeLock || wakeLock.released) {
                await requestWakeLock();
            }

            const smoothed = smoothLocation(pos.coords.latitude, pos.coords.longitude);
            if (!smoothed) {
                console.warn("Skipping point due to invalid smoothed location.");
                return;
            }

            const newPoint = {
                lat: smoothed.lat,
                lng: smoothed.lng,
                time: new Date().toISOString(),
                // elevation: pos.coords.altitude // Optional: include if available
            };

            if (recordedPoints.length === 0) {
                console.log("Recording first point.");
                updateMapAndData(newPoint, null, 0);
            } else {
                const lastPoint = recordedPoints[recordedPoints.length - 1];
                const distance = getDistanceMeters(lastPoint, newPoint);

                if (distance >= TRACKING_DISTANCE_THRESHOLD) {
                    // console.log(`Distance ${distance.toFixed(1) }m. Recording point.`);
                    updateMapAndData(newPoint, lastPoint, distance);
                } else {
                    // Optional: log points that are too close
                    // console.log(`Point too close (${distance.toFixed(1)} m). Skipping.`);
                }
            }
        },
        (err) => {
            console.error("Geolocation watch error:", err.message);
            sendNotification("Tracking Error", `Geolocation failed: ${err.message}.`);
            stopTracking();
        },
        GEOLOCATION_OPTIONS
    );
}

function stopTracking() {
    if (watchId !== null) {
        console.log("Stopping geolocation watch.");
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    isRecording = false; // Ensure state is consistent
}

// --- Map Update Logic ---
function updateMapAndData(newPoint, lastPoint, distance) {
    recordedPoints.push(newPoint);
    addPointToDB(newPoint);

    // Update Map Marker
    const marker = L.circleMarker([newPoint.lat, newPoint.lng], {
        radius: 3, color: "blue", fillColor: "#30f", fillOpacity: 0.8, weight: 1
    }).addTo(map);
    map.setView([newPoint.lat, newPoint.lng]);
    trackMarkers.push(marker);

    // Update Map Line
    if (lastPoint) {
        const line = L.polyline([[lastPoint.lat, lastPoint.lng], [newPoint.lat, newPoint.lng]], 
            { color: "blue", weight: 2, opacity: 0.8 }
        ).addTo(map);
        trackLines.push(line);
        totalDistance += distance;
    }

    // Update Tooltip
    if (lastTooltipMarker) {
        lastTooltipMarker.unbindTooltip();
    }
    const tooltipContent = `📏 ${totalDistance.toFixed(1)} m`;
    marker.bindTooltip(tooltipContent, {
        permanent: true, direction: "top", offset: [0, -8], className: "tracking-tooltip"
    }).openTooltip();
    lastTooltipMarker = marker;

    // Optionally send a status notification
    // sendNotification("Tracking Update", `Distance: ${totalDistance.toFixed(1)} m`);
}

// --- Restore track from DB ---
function restoreTrackIfNeeded() {
    if (localStorage.getItem("isRecording") === "true") {
        getAllPointsFromDB(points => {
            if (points && points.length > 0) {
                console.log(`Restoring ${points.length} points from a previous session.`);
                recordedPoints = points;
                let lastPoint = null;
                points.forEach(point => {
                    const distance = lastPoint ? getDistanceMeters(lastPoint, point) : 0;
                    updateMapAndData(point, lastPoint, distance);
                    lastPoint = point;
                });

                // Continue tracking
                isRecording = true;
                const trackMeButton = document.querySelector('.elevation-btn-trackme');
                if (trackMeButton) {
                    trackMeButton.classList.add('pressed');
                }
                startTracking();
            }
        });
    }
}


// Dummy function to prevent errors if not defined elsewhere
function aaddMarker(latlng) {
    L.marker(latlng).addTo(map)
      .bindPopup("Your location")
      .openPopup();
}
