const GEOLOCATION_OPTIONS = 
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };
const GEOLOCATION_OPTIONS_FOR_WATCHPOSITION = 
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };

const TRACKING_DISTANCE_THRESHOLD = 25; // Minimum distance in meters to record a new point

let TRACK_CONTIONUOUS = false;
const SEC_INTERVALDURATION = 3; // alle x Sekunden

const txt_GoToCurrentLocation = "Go to current location";
const txt_GeolocationFailed = "Geolocation failed: ";
const txt_GeolocationIsNotSupportedByYourBrowser = "Geolocation is not supported by your browser.";

let isRecording = false;
let isPaused = false; // New state for pausing
let watchId = null;

// The recordedPoints array is removed.
// A new variable to hold only the last point.
let lastRecordedPoint = null; 
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
function aaaddCustomControlsForTrackingPlugin() {
    const Control = L.Control.extend({
        onAdd: () => {
            const container = L.DomUtil.create("div", "leaflet-control leaflet-bar trackme-bar");
            let startBtn, pauseBtn, stopBtn;

            function updateButtonStates() {
                if (isRecording && !isPaused) { // Tracking
                    startBtn.style.display = 'none';
                    pauseBtn.style.display = 'block';
                    stopBtn.style.display = 'block';
                    pauseBtn.innerHTML = '⏸️';
                    pauseBtn.title = 'Pause tracking';
                } else if (isRecording && isPaused) { // Paused
                    startBtn.style.display = 'none';
                    pauseBtn.style.display = 'block';
                    stopBtn.style.display = 'block';
                    pauseBtn.innerHTML = '▶️';
                    pauseBtn.title = 'Resume tracking';
                } else { // Stopped
                    startBtn.style.display = 'block';
                    pauseBtn.style.display = 'none';
                    stopBtn.style.display = 'none';
                }
            }

            function makeBtn(html, title, onClick, cl = "") {
                const a = L.DomUtil.create("a", "elevation-btn " + cl, container);
                a.innerHTML = html;
                a.title = title;
                a.href = "#";
                L.DomEvent.disableClickPropagation(a);
                a.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClick(a);
                    updateButtonStates();
                });
                return a;
            }

            const fileInput = L.DomUtil.create("input", "", container);
            fileInput.type = "file";
            fileInput.accept = ".gpx,.kml,.geojson";
            fileInput.style.display = "none";

            makeBtn("📂", "Upload track", () => fileInput.click(), "elevation-btn-upload");
            fileInput.addEventListener("change", onFileSelected);

            makeBtn("📍", txt_GoToCurrentLocation, () => {
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
            }, "elevation-btn-locate");

            // --- Recorder Style Buttons ---
            startBtn = makeBtn("▶️", "Start tracking", () => {
                isRecording = true;
                isPaused = false;
                localStorage.setItem("isRecording", "true");
                localStorage.removeItem("isPaused");

                // Reset all tracking variables
                lastRecordedPoint = null;
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
            }, "elevation-btn-start");

            pauseBtn = makeBtn("⏸️", "Pause tracking", () => {
                isPaused = !isPaused;
                if (isPaused) {
                    localStorage.setItem("isPaused", "true");
                    stopTracking(); // Stops watching position
                    releaseWakeLock();
                    console.log("Tracking paused.");
                } else {
                    localStorage.removeItem("isPaused");
                    startTracking(); // Resumes watching position
                    requestWakeLock();
                    console.log("Tracking resumed.");
                }
            }, "elevation-btn-pause");

            stopBtn = makeBtn("⏹️", "Stop tracking", () => {
                isRecording = false;
                isPaused = false;
                localStorage.removeItem("isRecording");
                localStorage.removeItem("isPaused");

                releaseWakeLock();
                stopTracking();

                getAllPointsFromDB(points => {
                    alert("Tracking stopped. Points recorded: " + (points ? points.length : 0));
                });
                saveGPXFile();
            }, "elevation-btn-stop");

            updateButtonStates(); // Set initial state
            return container;
        },
    });

    const trackingModeControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded');
            const form = L.DomUtil.create('form', 'leaflet-control-layers-list', container);
            const label = L.DomUtil.create('label', '', form);
            const checkbox = L.DomUtil.create('input', '', label);
            checkbox.type = 'checkbox';
            checkbox.checked = TRACK_CONTIONUOUS;
            checkbox.addEventListener('change', () => {
                TRACK_CONTIONUOUS = checkbox.checked;
            });
            const span = L.DomUtil.create('span', '', label);
            span.innerText = ' Continuous Tracking';
            return container;
        }
    });

    new Control({ position: "topleft" }).addTo(map);
    new trackingModeControl({ position: 'topleft' }).addTo(map);
}
// --- Toolbar Controls ---
function addCustomControlsForTrackingPlugin() {
    const Control = L.Control.extend({
        onAdd: () => {
            const container = L.DomUtil.create("div", "leaflet-control leaflet-bar trackme-bar");
            // Declare all button variables
            let startContinuousBtn, startIntervalBtn, pauseBtn, stopBtn;

            // --- Common function to initiate tracking ---
            function initiateTracking(isContinuous) {
                TRACK_CONTIONUOUS = isContinuous; // Set the mode

                isRecording = true;
                isPaused = false;
                localStorage.setItem("isRecording", "true");
                localStorage.removeItem("isPaused");

                // Reset all tracking variables
                lastRecordedPoint = null;
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
                
                // Start the correct tracking function based on the mode
                if (TRACK_CONTIONUOUS) {
                    startTracking();
                } else {
                    xstartTracking();
                }

                alert(`Tracking started (Continuous: ${isContinuous})`);
                if (!isContinuous)
                    console.log(`Tracking started (Continuous: ${isContinuous}), ${TRACKING_DISTANCE_THRESHOLD} m, ${SEC_INTERVALDURATION} sec`);
                else
                    console.log(`Tracking started (Continuous: ${isContinuous}), ${TRACKING_DISTANCE_THRESHOLD} m`);
            }

            function updateButtonStates() {
                const isActivelyRecording = isRecording && !isPaused;
                const isPausedRecording = isRecording && isPaused;

                // Hide or show start buttons based on whether recording is active at all
                startContinuousBtn.style.display = isRecording ? 'none' : 'block';
                startIntervalBtn.style.display = isRecording ? 'none' : 'block';

                // Show pause/stop only when recording
                pauseBtn.style.display = isRecording ? 'block' : 'none';
                stopBtn.style.display = isRecording ? 'block' : 'none';

                if (isActivelyRecording) { // Tracking
                    pauseBtn.innerHTML = '⏸️';
                    pauseBtn.title = 'Pause tracking';
                } else if (isPausedRecording) { // Paused
                    pauseBtn.innerHTML = '▶️';
                    pauseBtn.title = 'Resume tracking';
                }
            }

            function makeBtn(html, title, onClick, cl = "") {
                const a = L.DomUtil.create("a", "elevation-btn " + cl, container);
                a.innerHTML = html;
                a.title = title;
                a.href = "#";
                L.DomEvent.disableClickPropagation(a);
                a.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClick(a);
                    updateButtonStates();
                });
                return a;
            }

            const fileInput = L.DomUtil.create("input", "", container);
            fileInput.type = "file";
            fileInput.accept = ".gpx,.kml,.geojson";
            fileInput.style.display = "none";

            makeBtn("📂", "Upload track", () => fileInput.click(), "elevation-btn-upload");
            // ... (The locate button code remains unchanged)
            makeBtn("📍", txt_GoToCurrentLocation, () => {
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
            }, "elevation-btn-locate");


            // --- Recorder Style Buttons ---

            // --- FIRST START BUTTON (TRACK_CONTIONUOUS = true) ---
            startContinuousBtn = makeBtn("▶️", "Start Continuous Tracking (watchPosition)", () => {
                initiateTracking(true);
            }, "elevation-btn-start");

            // --- SECOND START BUTTON (TRACK_CONTIONUOUS = false) ---
            startIntervalBtn = makeBtn(`▶️ ${SEC_INTERVALDURATION}`, "Start Interval Tracking (setInterval)", () => {
                initiateTracking(false);
            }, "elevation-btn-start");


            pauseBtn = makeBtn("⏸️", "Pause tracking", () => {
                isPaused = !isPaused;
                if (isPaused) {
                    localStorage.setItem("isPaused", "true");
                    // Stop function automatically handles which clear method to use
                    stopTracking(); 
                    releaseWakeLock();
                    console.log("Tracking paused.");
                } else {
                    localStorage.removeItem("isPaused");
                    // Start function automatically handles which watch method to use
                    if(TRACK_CONTIONUOUS) startTracking(); else xstartTracking();
                    requestWakeLock();
                    console.log("Tracking resumed.");
                }
            }, "elevation-btn-pause");

            stopBtn = makeBtn("⏹️", "Stop tracking", () => {
                isRecording = false;
                isPaused = false;
                localStorage.removeItem("isRecording");
                localStorage.removeItem("isPaused");

                releaseWakeLock();
                // Stop function automatically handles which clear method to use
                stopTracking();

                getAllPointsFromDB(points => {
                    alert("Tracking stopped. Points recorded: " + (points ? points.length : 0));
                });
                saveGPXFile();
            }, "elevation-btn-stop");

            updateButtonStates(); // Set initial state
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

/*
How exportToGPX and getAllPointsFromDB Work Together
- Initiating the Data Request: 
The exportToGPX function's primary goal is to create a GPX file 
from the stored tracking points. 
To do this, it first needs to fetch those points from the IndexedDB. 
It accomplishes this by calling getAllPointsFromDB(points => { ... });.
- The Asynchronous Gap: 
The getAllPointsFromDB function initiates a request to the database to retrieve 
all the stored points. This process is not instantaneous. 
While the database is busy fetching the data, the rest of the JavaScript code, 
including the code that called exportToGPX, continues to run.
- The Role of the Callback: 
The function passed as an argument to getAllPointsFromDB is the "callback." 
This callback function contains the code that needs to execute 
after the database has successfully retrieved the points. 
In this case, it's the logic that constructs the GPX string.
- Ensuring Correct Execution Order: 
Without the callback, the exportToGPX function would try to build the GPX file 
immediately after calling getAllPointsFromDB, 
but the points data wouldn't be available yet. 
This would result in an empty or incorrect GPX file. 
The callback mechanism ensures that the GPX generation logic 
only runs when it has the necessary data.

In essence, the callback in exportToGPX is a fundamental part 
of handling the asynchronous nature of IndexedDB, 
guaranteeing that the data is available before it's processed.
*/
// --- GPX Export ---
function exportToGPX(callback) {
    getAllPointsFromDB(points => {
        if (!points || points.length === 0) {
            console.log("No points in the database to export.");
            if (callback) callback(null);
            return;
        }

        const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrackMe" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>My Track</name><trkseg>`;

        const footer = `</trkseg></trk></gpx>`;

        const segments = points.map(p => {
            const eleLine = typeof p.elevation === "number" ? `<ele>${p.elevation.toFixed(1)}</ele>` : "";
            const distanceToPrevious = p.distance || 0; // Use the stored distance
            const distanceLine = `<distance>${distanceToPrevious.toFixed(1)}</distance>`;
            const flagLine = `<flag>${p.flag}</flag>`;
            return `<trkpt lat="${p.lat}" lon="${p.lng}">${eleLine}${distanceLine}${flagLine}<time>${p.time}</time></trkpt>`;
        }).join("\n");

        const gpxData = header + "\n" + segments + "\n" + footer;
        if (callback) callback(gpxData);
    });
}


function saveGPXFile() {
    exportToGPX(gpxData => {
        if (!gpxData) {
            console.log("No GPX data was generated, skipping file save.");
            return;
        }

        // --- Save GPX File ---
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
            const logUrl = URL.createObjectURL(logUrl);
            const logLink = document.createElement("a");
            logLink.href = logUrl;
            logLink.download = "console_log.txt";
            document.body.appendChild(logLink);
            logLink.click();
            document.body.removeChild(logLink);
            URL.revokeObjectURL(logUrl);
          }, 5000);
        }
    });
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
    if (!TRACK_CONTIONUOUS) {
        xstartTracking();
        return;
    }

    if (watchId !== null) { // Prevent multiple watchers
        navigator.geolocation.clearWatch(watchId);
    }
    
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

            if (lastRecordedPoint === null) {
                console.log("Recording first point.");
                updateMapAndData(newPoint, null, 0, true);
            } else {
                const distance = getDistanceMeters(lastRecordedPoint, newPoint);

                if (distance >= TRACKING_DISTANCE_THRESHOLD) {
                    // console.log(`Distance ${distance.toFixed(1) }m. Recording point.`);
                    updateMapAndData(newPoint, lastRecordedPoint, distance, true);
                } else {
                    // Optional: log points that are too close
                    // console.log(`Point too close (${distance.toFixed(1)} m). Skipping.`);
                    updateMapAndData(newPoint, lastRecordedPoint, distance, false);
                }
            }
        },
        (err) => {
            console.error("Geolocation watch error:", err.message);
            sendNotification("Tracking Error", `Geolocation failed: ${err.message}.`);
            stopTracking();
        },
        GEOLOCATION_OPTIONS_FOR_WATCHPOSITION
    );
}

function stopTracking() {
    if (!TRACK_CONTIONUOUS) {
        xstopTracking();
        return;
    }

    if (watchId !== null) {
        console.log("Stopping geolocation watch.");
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

// --- Tracking Logic ---
function xstartTracking() {
    if (watchId !== null) { // Prevent multiple intervals
        clearInterval(watchId); // Changed from navigator.geolocation.clearWatch
    }    
    
    console.log(`Starting geolocation interval (${SEC_INTERVALDURATION} sec) watch...`);

    const successCallback = async (pos) => {
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

        if (lastRecordedPoint === null) {
            console.log("Recording first point.");
            updateMapAndData(newPoint, null, 0, true);
        } else {
            const distance = getDistanceMeters(lastRecordedPoint, newPoint);

            if (distance >= TRACKING_DISTANCE_THRESHOLD) {
                // console.log(`Distance ${distance.toFixed(1) }m. Recording point.`);
                updateMapAndData(newPoint, lastRecordedPoint, distance, true);
            } else {
                // Optional: log points that are too close
                // console.log(`Point too close (${distance.toFixed(1)} m). Skipping.`);
                updateMapAndData(newPoint, lastRecordedPoint, distance, false);
            }
        }
    };

    const errorCallback = (err) => {
        console.error("Geolocation watch error:", err.message);
        sendNotification("Tracking Error", `Geolocation failed: ${err.message}.`);
        stopTracking();
    };

    // The interval duration for polling the position (30 seconds as per user's example)
    const intervalDuration = SEC_INTERVALDURATION * 1000;// 30000; 

    // Get current position immediately when starting
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, GEOLOCATION_OPTIONS_FOR_WATCHPOSITION);

    // Then set up the interval for subsequent position fetches
    watchId = setInterval(() => {
        // The tracking state (isRecording, isPaused) is managed by startTracking/stopTracking calls,
        // so if this interval is running, tracking is active and not paused.
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, GEOLOCATION_OPTIONS_FOR_WATCHPOSITION);
    }, intervalDuration);
}

function xstopTracking() {
    if (watchId !== null) {
        console.log("Stopping geolocation interval watch.");
        clearInterval(watchId); // Changed from navigator.geolocation.clearWatch
        watchId = null;
    }
}

// --- Map Update Logic ---
function updateMapUI(newPoint, lastPoint, distance) {
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
}

function updateMapAndData(newPoint, lastPoint, distance, flag) {
    // Create the object to be stored, now including the distance
    const pointToStore = { ...newPoint, distance: distance, flag: flag };
    addPointToDB(pointToStore);    

    if (flag) {
        lastRecordedPoint = newPoint; // Update the last recorded point for the next distance calculation
        // Update the visual representation on the map
        updateMapUI(newPoint, lastPoint, distance);
    }
    
    // Optionally send a status notification
    // sendNotification("Tracking Update", `Distance: ${totalDistance.toFixed(1)} m`);
}

// --- Restore track from DB ---
function restoreTrackIfNeeded() {
    if (localStorage.getItem("isRecording") === "true") {
        isRecording = true;
        isPaused = localStorage.getItem("isPaused") === "true";

        getAllPointsFromDB(points => {
            if (points && points.length > 0) {
                console.log(`Restoring ${points.length} points from a previous session.`);
                let currentLastPoint = null;
                totalDistance = 0;

                points.forEach(point => {
                    const distance = point.distance || 0;
                    updateMapUI(point, currentLastPoint, distance, flag);
                    currentLastPoint = point;
                });

                lastRecordedPoint = currentLastPoint;

                // Manually trigger button state update on the next cycle
                setTimeout(() => {
                    const dummyElement = document.querySelector('.elevation-btn-start');
                    if (dummyElement) {
                        const container = dummyElement.parentElement;
                        // This is a bit of a hack to re-run the state logic
                        // A better approach might be a dedicated function, but this works
                        container.querySelector('.elevation-btn-start').dispatchEvent(new Event('click'));
                        container.querySelector('.elevation-btn-pause').dispatchEvent(new Event('click'));
                        container.querySelector('.elevation-btn-stop').dispatchEvent(new Event('click'));
                     }
                }, 100);

                if (!isPaused) {
                    startTracking();
                } else {
                     console.log("Session restored in a paused state.");
                }
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
