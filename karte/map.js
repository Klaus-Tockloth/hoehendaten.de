// map.js

/*
Purpose:
- Definition und Initialisierung der Leaflet-Basiskarte.

Releases:
- v1.0.0 - 2025-05-16: initial release

Copyright:
- © 2025 | Klaus Tockloth

License:
- MIT License

Description:
- NN
*/

// Initialisiere die Karte (auf die 'Mitte Deutschlands').
var map = L.map('map').setView([51.220906, 9.357579], 8);

// Export map for other scripts
window.map = map;

// Füge die OpenStreetMap Basemap hinzu.
var osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 23,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap Contributors</a>'
});
// osmLayer.addTo(map); // <--- REMOVED: Initial layer adding will be handled by map_1.js

// Massstab für Leaflet initialisieren.
L.control.scale({ imperial: false, maxWidth: 200 }).addTo(map);

// Customize Leaflet attribution prefix (removes the default Leaflet link or adds yours).
map.attributionControl.setPrefix('');

// Füge Google Maps Layer als Overlays hinzu ('roadmap', 'satellite', 'terrain', 'hybrid').
var googleRoadmap = L.gridLayer.googleMutant({
    type: 'roadmap'
});

var googleSatellite = L.gridLayer.googleMutant({
    type: 'satellite'
});

/* TODO: Wie kann die Terrain-Ansicht genutzt werden?
var googleTerrain = L.gridLayer.googleMutant({
    type: 'terrain'
});
*/

var googleHybrid = L.gridLayer.googleMutant({
    type: 'hybrid'
});

// Definiere Basis-Layer für den Layer-Control und mache sie global zugänglich.
// Die IDs müssen einzigartig sein und für das Speichern/Laden verwendet werden.
window.baseLayersConfig = {
    "OpenStreetMap": {
        layer: osmLayer,
        id: "openstreetmap", // Unique ID for storage
        label: "OpenStreetMap"
    },
    "Google Roadmap": {
        layer: googleRoadmap,
        id: "googleRoadmap",
        label: "Google Roadmap"
    },
    "Google Satellite": {
        layer: googleSatellite,
        id: "googleSatellite",
        label: "Google Satellite"
    },
    "Google Hybrid": {
        layer: googleHybrid,
        id: "googleHybrid",
        label: "Google Hybrid"
    }
};

// KEINEN L.control.layers hier hinzufügen. Die Steuerung erfolgt über map_1.js.
// L.control.layers(baseLayers).addTo(map); // <--- REMOVED

// Leaflet.Locate control initialisieren.
L.control.locate({
    position: 'topleft',
    keepCurrentZoomLevel: true,
    drawCircle: true,
    strings: {
        title: "Zeige meinen aktuellen Standort an.",
        popup: "Ihr Standort befindet sich innerhalb von {distance} Metern von diesem Punkt."
    }
}).addTo(map);

/*
 * Initialize Leaflet.FileLayer control for loading GPX/KML/GeoJSON.
 */
/*
let fileLayerColors = [
    "#f44336", "#9c27b0", "#2196f3", "#4caf50", "#ff9800", "#795548", "#607d8b",
];

// L.Control.fileLayerLoad comes from the Leaflet FileLayer plugin — it’s not part of core Leaflet.
// Set the label for the file layer button
L.Control.FileLayerLoad.LABEL = "🥾"; // This was the last one in original code, so it's kept.

let fileLayerControl = L.Control.fileLayerLoad({
    layerOptions: {
        style: function (feature) {
            return {
                color: fileLayerColors[0],
                opacity: 0.7,
                fillOpacity: 0.5,
            }
        },

        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng);
        },

        onEachFeature: function (feature, layer) {
            let popupContent = [];
            if (feature.properties.name) {
                popupContent.push("<b>" + feature.properties.name + "</b>");
            }
            if (feature.properties.desc) {
                popupContent.push(feature.properties.desc);
            }
            if (feature.properties.time) {
                popupContent.push(feature.properties.time);
            }
            layer.bindPopup(popupContent.join("<br>"));
        },
    },

    fileSizeLimit: 16000000, // 16MB limit
}).addTo(map);

fileLayerControl.loader.on('data:loaded', function (e) {
    // Create a custom pane for uploaded files
    const paneName = 'uploaded-files';
    if (!map.getPane(paneName)) {
        map.createPane(paneName);
        map.getPane(paneName).style.zIndex = 650; // higher than default vector layers
    }

    // Assign the pane to the uploaded layer
    e.layer.eachLayer(function (l) {
        if (l.options && !l.options.pane) {
            l.options.pane = paneName;
        }
    });

    // We do NOT add overlays to the standard L.control.layers here, as it's removed.
    // layercontrol.addOverlay(...) <--- REMOVED

    // Add layer to map
    e.layer.addTo(map);

    // Rotate to next color
    fileLayerColors.push(fileLayerColors.shift());
});
*/