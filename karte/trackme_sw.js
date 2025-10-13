// trackme_sw.js

let sw_recordedPoints = [];
let sw_totalDistance = 0;
let sw_up = 0;
let sw_down = 0;

const SW_TRACKINGDISTANCE = 25; // 20;

function getDistanceMeters(p1, p2) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const lat1 = toRad(p1.lat);
    const lat2 = toRad(p2.lat);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', event => {
    // ... existing message handling logic
});


self.addEventListener('message', event => {
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'START_TRACKING':
                // Corrected variable names
                sw_recordedPoints = [];
                sw_totalDistance = 0;
                sw_up = 0;
                sw_down = 0;
                console.log('trackme_sw: Service Worker: Tracking started.');

                /* das funktioniert nicht !!!
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            console.log('trackme_sw: position: ', position);
                        },
                        (err) => {
                            console.log("txt_GeolocationFailed" + err.message);
                        },
                        GEOLOCATION_OPTIONS
                    );
                } else {
                    console.log("txt_GeolocationIsNotSupportedByYourBrowser");
                }
                */

                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'RESPONSE', text: 'Hello, main page!' });
                    });
                });
                break;
            case 'NNNEW_POINT':
                const newPoint = event.data.payload;

                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'RESPONSE', text: 'bla' });
                    });
                });

                console.log("sw newPoint: ", newPoint);

                const lastPoint = sw_recordedPoints.length > 0 ? sw_recordedPoints[sw_recordedPoints.length - 1] : newPoint;
                
                if (lastPoint) {
                    const distance = getDistanceMeters(lastPoint, newPoint);
                    //SW_TRACKINGDISTANCE 
                    if (true /* distance > 0*/) {
                        // Corrected variable names
                        sw_totalDistance += distance;
                        sw_recordedPoints.push(newPoint);

                        self.clients.matchAll().then(clients => {
                            clients.forEach(client => {
                                client.postMessage({
                                    type: 'RESPONSE',
                                    data: {
                                        newPoint: newPoint,
                                        lastPoint: lastPoint,
                                        distance: sw_totalDistance.toFixed(1)
                                    }
                                });
                            });
                        });
                    }
                } else {
                    sw_recordedPoints.push(newPoint); // Always add the first point
                }

                // Corrected variable names
                console.log(`trackme_sw.js: Points: ${sw_recordedPoints.length}, Distance: ${sw_totalDistance.toFixed(1)}m`);
                
                break;
            // In sw.js

            case 'NEW_POINT':
                const sw_newPoint = event.data.payload;
                let sw_lastPoint = null;
                
                if (sw_recordedPoints.length > 0) {
                    sw_lastPoint = sw_recordedPoints[sw_recordedPoints.length - 1];
                }

                // Always add the first point, or subsequent points if they meet the distance criteria
                if (!sw_lastPoint) {
                    sw_recordedPoints.push(sw_newPoint);
                } else {
                    const distance = getDistanceMeters(sw_lastPoint, sw_newPoint);

                    if (distance >= SW_TRACKINGDISTANCE) {
                        sw_totalDistance += distance;
                        sw_recordedPoints.push(sw_newPoint);

                        // Notify all clients (open tabs of your app)
                        self.clients.matchAll().then(clients => {
                            clients.forEach(client => {
                                client.postMessage({
                                    type: 'RESPONSE',
                                    data: {
                                        text: "blabla",
                                        newPoint: sw_newPoint,
                                        lastPoint: sw_lastPoint,
                                        distance: distance // Sending the segment distance might be more useful
                                    }
                                });
                            });
                        });
                    }
                }

                console.log(`trackme_sw.js: Points: ${sw_recordedPoints.length}, Distance: ${sw_totalDistance.toFixed(1)}m`);
                break;

            case 'STOP_TRACKING':
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'RESPONSE', text: 'blub' });
                    });
                });
                console.log('trackme_sw: Service Worker: Tracking stopped.');
                // Here you would save the data to IndexedDB for persistence
                // and potentially prepare the GPX file.
                break;
        }
    }
});
