// trackme_1.js

const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };

const TRACKINGDISTANCE = 20;
const TRACKINGSECONDS = 10;
const TRACKINGSECONDS2 = 2; // This variable seems unused in the provided code, kept for consistency.

const txt_log_TRACKING = `Tracking started with TRACKINGDISTANCE: ${TRACKINGDISTANCE} m and TRACKINGSECONDS: ${TRACKINGSECONDS}`;
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
let lastTrackTime = null;
let lastTooltipMarker = null;
let tooltipContent = ""; // Seems unused, but keeping for consistency.

const SMOOTH_WINDOW = 3;
let lastLocations = [];

let currentTrackingNotification = null; // To manage the persistent notification

// --- Notification Functions ---
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        alert("trackme_1.js: This browser does not support desktop notification");
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

// For one-off notifications (e.g., tracking stopped)
function sendNotification(title, body) {
    console.log("sendNotification Notification.permission: ", Notification.permission);
    if (Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: '/icon.png', // <--- IMPORTANT: Update this path to your app's icon
            tag: 'trackme-status', // Use a consistent tag for general status messages
            renotify: true // Re-alert if notification with same tag is sent
        });
    } else {
        console.log(`[Notification Skipped] Title: ${title}, Body: ${body}`);
    }
}

// For a persistent notification that updates its content
function sendPersistentNotification(title, body) {
    console.log("sendPersistentNotification Notification.permission: ", Notification.permission);
    if (Notification.permission === "granted") {
        if (currentTrackingNotification) {
            console.log("sendPersistentNotification currentTrackingNotification.close ...");
            currentTrackingNotification.close(); // Close previous one if it's still open
        }
        console.log("sendPersistentNotification new Notification ...");
        currentTrackingNotification = new Notification(title, {
            body: body,
            icon: '/icon.png', // <--- IMPORTANT: Update this path to your app's icon
            tag: 'trackme-active-tracking', // Consistent tag for active tracking to update/replace
            renotify: false, // Don't re-alert for every update if body changes
            silent: true // Optional: don't make a sound for routine updates
        });
    } else {
        console.log(`[Persistent Notification Skipped] Title: ${title}, Body: ${body}`);
    }
    console.log("sendPersistentNotification done");
}


// --- Init on DOM
document.addEventListener("DOMContentLoaded", () => {
    // Wait until map is available
    if (window.map) {

        console.info('Hi, here is trackme.js!');

        getLocation();

        // Add other layers, controls, etc., here

        initMapForTrackme();

        addCustomControlsForTrackingPlugin();

        if (true) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (let registration of registrations) {
                        registration.unregister();
                    }
                });
            }

            if ('caches' in window) {
                caches.keys().then(function(keyList) {
                    return Promise.all(keyList.map(function(key) {
                        return caches.delete(key);
                    }));
                });
            }
        }

        // Register Service Worker for PWA capabilities
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                // Ensure trackme_sw.js is at the root of your *web server*
                console.log("navigator.serviceWorker.register('trackme_sw.js') ...");
                navigator.serviceWorker.register('trackme_sw.js')
                    .then(registration => {
                        console.log('Service Worker registered with scope:', registration.scope);
                    })
                    .catch(error => {
                        console.error('Service Worker registration failed:', error);
                    });
            });
        }

    }
    else {
        alert("window.map is missing !");
    }
});

// --- Initialize map & base layers ---
function initMapForTrackme() {
}

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

            // Hidden File Input
            const fileInput = L.DomUtil.create("input", "", container);
            fileInput.type = "file";
            fileInput.accept = ".gpx,.kml,.geojson";
            fileInput.style.display = "none";

            // Upload Button
            makeBtn("📂", "Upload track", false, () => fileInput.click(), null, "elevation-btn-upload");
            fileInput.addEventListener("change", onFileSelected);

            // Locate Me Button
            makeBtn("📍", txt_GoToCurrentLocation, false, () => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            const latlng = [lat, lng];
                            const llatlng = L.latLng(lat, lng);

                            showPosition(position);
                            map.setView(latlng, 16);
                            aaddMarker(llatlng); // Assuming aaddMarker exists and works
                        },
                        (err) => {
                            alert(txt_GeolocationFailed + err.message);
                        },
                        GEOLOCATION_OPTIONS
                    );
                } else {
                    alert(txt_GeolocationIsNotSupportedByYourBrowser);
                }
            }, null, "elevation-btn-locate");

            // Track Me Button
            makeBtn("👣", "Track me", true,
                () => {
                    isRecording = 1;
                    // Reset all tracking variables for a new session
                    recordedPoints = [];
                    totalDistance = 0;
                    up = 0;
                    down = 0;
                    trackMarkers.forEach(m => map.removeLayer(m));
                    trackMarkers = [];
                    trackLines.forEach(l => map.removeLayer(l));
                    trackLines = [];
                    lastTrackTime = null;
                    lastTooltipMarker = null;
                    lastLocations = []; // Reset smoothing buffer

                    //console.log("requestNotificationPermission ...");   
                    //requestNotificationPermission(); // Request permission proactively when user intends to track
    
                    window.modeManager.resetMode(true);
                    setStatusInfo("Track");

                    console.log("startTracking ...");  
                    startTracking();

                    console.log(txt_log_TRACKING);

                    alert(txt_log_TRACKING); // Still keep for immediate user feedback
                },
                () => {
                    isRecording = 0;
                    stopTracking();

                    window.modeManager.resetMode(true);
                    setStatusInfo("");

                    console.log("Tracking stopped, points: ", recordedPoints.length);
                    alert("Tracking stopped, points: " + recordedPoints.length); // Still keep for immediate user feedback
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
// Removed the old 'ooonFileSelected' function for clarity.

function onFileSelected(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        const gpxText = e.target.result;

        // Parse GPX string into an XML DOM
        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxText, "application/xml");

        // Convert GPX XML to GeoJSON
        // <--- IMPORTANT: 'toGeoJSON' library is required for this to work.
        // Make sure you've included it (e.g., <script src="https://unpkg.com/@mapbox/togeojson@0.16.0/togeojson.js"></script>)
        const geojson = toGeoJSON.gpx(gpxDoc);

        // Optional: Log or inspect it
        console.log("GeoJSON from GPX:", geojson);

        // Pane erstellen (nur einmal nötig)
        if (!map.getPane('gpxPane')) {
            map.createPane('gpxPane');
            map.getPane('gpxPane').style.zIndex = 650; // kleiner als 500 (z. B. Labels), größer als Standard-Overlays
        }

        // Add GeoJSON layer to the map
        const gpxLayer = L.geoJSON(geojson, {
            pane: 'gpxPane',  // Hier ist der entscheidende Teil
            style: {
                color: "#f00",
                weight: 4,
                opacity: 0.7
            },
            onEachFeature: function (feature, layer) {
                if (feature.geometry.type === "LineString") {
                    layer.bindPopup("Track");
                } else if (feature.geometry.type === "Point") {
                    const ele = feature.properties.ele ? `Elevation: ${feature.properties.ele}m` : "No elevation";
                    layer.bindPopup(ele);
                }
            }
        }).addTo(map);

        map.fitBounds(gpxLayer.getBounds());
    };

    reader.readAsText(file);
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            showPosition,
            showError,
            GEOLOCATION_OPTIONS
        );
    } else {
        console.warn("Geolocation is not supported.");
    }
}

function showPosition(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    //console.log(`trackme.js Latitude: ${lat}\nLongitude: ${lng}\nAccuracy: ${accuracy} meters`);
}

function showError(error) {
    console.error(`Error: ${error.message}`);
}

function getDistanceMeters(p1, p2) {
    if (
        !p1 || !p2 ||
        !isFinite(p1.lat) || !isFinite(p1.lng) ||
        !isFinite(p2.lat) || !isFinite(p2.lng)
    ) {
        console.warn("Invalid coordinates in getDistanceMeters", p1, p2);
        return NaN;
    }

    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const lat1 = toRad(p1.lat);
    const lat2 = toRad(p2.lat);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}


function exportToGPX(points) {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MyTracker" xmlns="http://www.topografix.com/GPX/1/1">
<trk>
  <name>My Track</name>
  <trkseg>
`;

    const footer = `  </trkseg>
</trk>
</gpx>`;

    const segments = points
        .map((p) => {
            const eleLine =
                typeof p.elevation === "number"
                    ? `\n      <ele>${p.elevation.toFixed(1)}</ele>`
                    : "";
            return `    <trkpt lat="${p.lat}" lon="${p.lng}">${eleLine}
      <time>${p.time}</time>
    </trkpt>`;
        })
        .join("\n");

    const gpx = header + segments + "\n" + footer;

    return gpx;
}

function saveGPXFile() {
    const gpxData = exportToGPX(recordedPoints);
    const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "track.gpx";
    link.click();
    URL.revokeObjectURL(url);
}


function smoothLocation(lat, lng) {

    lat = Number(lat);
    lng = Number(lng);

    if (isNaN(lat) || isNaN(lng)) {
        console.error("Invalid lat/lng:", lat, lng);
        return null;
    }

    lastLocations.push({ lat, lng });
    if (lastLocations.length > SMOOTH_WINDOW) lastLocations.shift();

    const avgLat = lastLocations.reduce((sum, p) => sum + p.lat, 0) / lastLocations.length;
    const avgLng = lastLocations.reduce((sum, p) => sum + p.lng, 0) / lastLocations.length;

    return { lat: avgLat, lng: avgLng };
}


function ssstartTracking() {
    console.log("startTracking isRecording: ", isRecording);

    if (isRecording !== 1) return;

    // Send initial persistent notification
    console.log("sendPersistentNotification ...");
    //sendPersistentNotification("Tracking Started", "Your location is now being recorded.");

    watchId = navigator.geolocation.watchPosition(
        (pos) => {

            let lat = pos.coords.latitude;
            let lng = pos.coords.longitude;

            const smoothed = smoothLocation(lat, lng);
            if (!smoothed) {
                console.warn("Skipping point due to invalid smoothed location.");
                return;
            }
            lat = smoothed.lat;
            lng = smoothed.lng;

            const now = Date.now();
            const newPoint = {
                lat,
                lng,
                time: new Date().toISOString(),
            };

            const lastPoint = recordedPoints.at(-1);
            const distance = lastPoint
                ? getDistanceMeters(lastPoint, newPoint)
                : Infinity;

            // Simplified speed check for robustness
            if (false) { // Disabled for now, uncomment if needed
                const timeDiff = lastPoint
                    ? (now - new Date(lastPoint.time).getTime()) / 1000
                    : Infinity;
                const speed = distance / timeDiff;
                const SPEED_THRESHOLD = 10; // 10 m/s (~36 km/h)
                if (speed > SPEED_THRESHOLD && timeDiff > 1) { // Only check if enough time has passed
                    console.log(
                        `Ignored point due to unrealistic speed: ${speed.toFixed(1)} m/s over ${timeDiff.toFixed(1)}s`
                    );
                    return;
                }
            }

            if (distance < 5 && recordedPoints.length > 0) { // Only ignore if not the very first point
                //console.log(`Ignored small move: ${distance.toFixed(1)} m`);
                return;
            }

            if (distance >= TRACKINGDISTANCE || recordedPoints.length === 0) { // Always record the first point
                // Elevation (if getElevation function is available)
                if (false && typeof getElevation === "function") { // Disabled, requires an external elevation service
                    getElevation({ lat, lng }, (elevation, _, __) => {
                        newPoint.elevation = elevation;

                        if (lastPoint?.elevation !== undefined) {
                            const delta = elevation - lastPoint.elevation;
                            if (delta > 0) up += delta;
                            else down += Math.abs(delta);
                        }

                        updateMapAndData(newPoint, lastPoint, distance);
                    });
                } else {
                    updateMapAndData(newPoint, lastPoint, distance);
                }
            } else {
                //console.log(`Skipped: ${distance.toFixed(1)} m from last (less than TRACKINGDISTANCE)`);
            }
        },
        (err) => {
            console.warn("Geolocation error:", err.message);
            // Notify user if there's a serious geolocation error
            sendNotification("Tracking Error", `Geolocation failed: ${err.message}. Tracking may have stopped.`);
            stopTracking(); // Attempt to stop tracking gracefully
        },
        GEOLOCATION_OPTIONS
    );
    console.log("startTracking done");
}


function ssstopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    // Close the persistent notification
    if (currentTrackingNotification) {
        currentTrackingNotification.close();
        currentTrackingNotification = null;
    }
    // Send a final notification with summary
    // sendNotification("Tracking Stopped", `Tracked ${recordedPoints.length} points over ${totalDistance.toFixed(1)} meters. Up: ${up.toFixed(1)}m, Down: ${down.toFixed(1)}m.`);
    console.log("Tracking Stopped", `Tracked ${recordedPoints.length} points over ${totalDistance.toFixed(1)} meters. Up: ${up.toFixed(1)}m, Down: ${down.toFixed(1)}m.`);
}

// In trackme_1.js

function xstartTracking() {
    console.log("startTracking isRecording: ", isRecording);

    if (isRecording !== 1) return;

    if (true) {
        // Listen for messages from the service worker
        // This listener is set up to catch messages sent from the service worker.
        navigator.serviceWorker.addEventListener('message', event => {
            // First, check if it's a RESPONSE message we care about.
            if (event.data && event.data.type === 'RESPONSE') {
                
                console.log('Message received from service worker:', event.data);

                // Now, check if this response contains tracking data to update the map.
                if (event.data.data) {
                    const { newPoint, lastPoint, distance } = event.data.data;
                    updateMapAndData(newPoint, lastPoint, distance);
                } 
                // Optional: If you want to specifically see the text from other messages.
                else if (event.data.text) {
                    console.log('Received status text from SW:', event.data.text); // This will show "bla" and "blub"
                } else {
                    console.log('Received something else from SW:'); 
                }
            }
        });
    }

    // Inform the service worker that tracking has started
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'START_TRACKING'
        });
    }

    watchId = navigator.geolocation.watchPosition(
        (pos) => {
            // ... (smoothing logic remains the same)
            const smoothed = smoothLocation(pos.coords.latitude, pos.coords.longitude);
            if (!smoothed) {
                console.warn("Skipping point due to invalid smoothed location.");
                return;
            }

            lat = smoothed.lat;
            lng = smoothed.lng;

            const now = Date.now();
            const newPoint = {
                lat,
                lng,
                time: new Date().toISOString(),
            };

            const lastPoint = recordedPoints.at(-1);
            const distance = lastPoint
                ? getDistanceMeters(lastPoint, newPoint)
                : Infinity;

            // Simplified speed check for robustness
            if (false) { // Disabled for now, uncomment if needed
                const timeDiff = lastPoint
                    ? (now - new Date(lastPoint.time).getTime()) / 1000
                    : Infinity;
                const speed = distance / timeDiff;
                const SPEED_THRESHOLD = 10; // 10 m/s (~36 km/h)
                if (speed > SPEED_THRESHOLD && timeDiff > 1) { // Only check if enough time has passed
                    console.log(
                        `Ignored point due to unrealistic speed: ${speed.toFixed(1)} m/s over ${timeDiff.toFixed(1)}s`
                    );
                    return;
                }
            }

            /*
            if (distance < 5 && recordedPoints.length > 0) { // Only ignore if not the very first point
                //console.log(`Ignored small move: ${distance.toFixed(1)} m`);
                return;
            }
            */

            if (true /* distance >= 0 || recordedPoints.length === 0 */) { // Always record the first point
                // console.log("NEW_POINT payload: ", newPoint);
                // Send the new point to the service worker
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    //console.log("posting to sw...: NEW_POINT payload: ", newPoint);
                    navigator.serviceWorker.controller.postMessage({
                        type: 'NEW_POINT',
                        payload: newPoint
                    });
                }
            }
            
            /*
            // Send the new point to the service worker
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'NEW_POINT',
                    payload: newPoint
                });
            }
            */
            
            // You can still update the map if the page is active
            // Or, have the service worker send the updated stats back to the page
            // updateMapAndData(newPoint); das gibt zu viele Punkte !!!

        },
        (err) => {
            console.warn("Geolocation error:", err.message);
            sendNotification("Tracking Error", `Geolocation failed: ${err.message}.`);
            stopTracking();
        },
        GEOLOCATION_OPTIONS
    );
}
function startTracking() {
    console.log("startTracking isRecording: ", isRecording);

    if (isRecording !== 1) return;

    // Wait for the service worker to be ready
    navigator.serviceWorker.ready.then((registration) => {
        console.log("Service Worker is ready.");

        // Listen for messages from the service worker
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'RESPONSE') {
                console.log('Message received from service worker:', event.data);
                if (event.data.data) {
                    const { newPoint, lastPoint, distance } = event.data.data;
                    updateMapAndData(newPoint, lastPoint, distance);
                }
            }
        });

        // Inform the service worker that tracking has started
        registration.active.postMessage({
            type: 'START_TRACKING'
        });

        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const smoothed = smoothLocation(pos.coords.latitude, pos.coords.longitude);
                if (!smoothed) {
                    console.warn("Skipping point due to invalid smoothed location.");
                    return;
                }

                const newPoint = {
                    lat: smoothed.lat,
                    lng: smoothed.lng,
                    time: new Date().toISOString(),
                };

                // Send the new point to the active service worker
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'NEW_POINT',
                        payload: newPoint
                    });
                }
            },
            (err) => {
                console.warn("Geolocation error:", err.message);
                sendNotification("Tracking Error", `Geolocation failed: ${err.message}.`);
                stopTracking();
            },
            GEOLOCATION_OPTIONS
        );
    });
}


function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    // Inform the service worker to stop and finalize the track
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'STOP_TRACKING'
        });
    }

    // The service worker will be responsible for creating the GPX file
    // and notifying the main thread when it's ready for download.
}


// Separated out for clarity
function updateMapAndData(newPoint, lastPoint, distance) {
    recordedPoints.push(newPoint);
    lastTrackTime = Date.now();

    const lat = newPoint.lat;
    const lng = newPoint.lng;

    // Marker
    const marker = L.circleMarker([lat, lng], {
        radius: 3,
        color: "blue",
        fillColor: "#30f",
        fillOpacity: 0.8,
        weight: 1,
    }).addTo(map);
    map.setView([lat, lng], map.getZoom());
    trackMarkers.push(marker);

    // Line
    if (lastPoint) {
        const line = L.polyline(
            [
                [lastPoint.lat, lastPoint.lng],
                [lat, lng],
            ],
            { color: "blue", weight: 2, opacity: 0.8 }
        ).addTo(map);
        trackLines.push(line);
        totalDistance += distance;
    }

    if (lastTooltipMarker) lastTooltipMarker.unbindTooltip();

    const currentTooltipContent =
        typeof newPoint.elevation !== "undefined"
            ? `🔼 ${up.toFixed(1)} m / 🔽 ${down.toFixed(1)} m<br>📏 ${totalDistance.toFixed(1)} m`
            : `📏 ${totalDistance.toFixed(1)} m`;

    console.log("updateMapAndData currentTooltipContent: ", currentTooltipContent);

    marker
        .bindTooltip(currentTooltipContent, {
            permanent: true,
            direction: "top",
            offset: [0, -8],
            className: "tracking-tooltip",
        })
        .openTooltip();

    lastTooltipMarker = marker;

    // Update persistent notification with current progress
    const notificationBody =
        typeof newPoint.elevation !== "undefined"
            ? `Active: 🔼 ${up.toFixed(1)} m / 🔽 ${down.toFixed(1)} m, 📏 ${totalDistance.toFixed(1)} m`
            : `Active: 📏 ${totalDistance.toFixed(1)} m`;
    //sendPersistentNotification("Tracking in Progress", notificationBody);
}

// Add a dummy aaddMarker function if it's not defined elsewhere, for the Locate Me button
// This is not directly related to background tracking but ensures the example works.
function aaddMarker(latlng) {
    if (false) {
        L.marker(latlng).addTo(map)
        .bindPopup("Your current location")
        .openPopup();
    }    
}