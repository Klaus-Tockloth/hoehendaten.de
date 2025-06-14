/*
Purpose:
- Definition und Initialisierung der Leaflet-Basiskarte.

Releases:
- v1.0.0 - 2025-05-22: initial release

Copyright:
- © 2025 | Klaus Tockloth

License:
- MIT License

Description:
- NN
*/

// Initialisiere die Karte auf die 'Mitte Deutschlands'.
var map = L.map('map').setView([51.220906, 9.357579], 8);

// Exportiere die Karte für andere Skripte.
window.map = map;

// Füge die OpenStreetMap Basemap hinzu.
var osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 21, // erlaube dem Layer, Kacheln bis Zoom 21 darzustellen (Level 20 & 21 werden hochskaliert)
    maxNativeZoom: 19, // OSM liefert native Kacheln bis Zoom 19
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap Contributors</a>'
}).addTo(map);

// Erlaube der Karte als Ganzes, Zoom bis Level 21.
map.options.maxZoom = 21;

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

var googleTerrain = L.gridLayer.googleMutant({
    type: 'terrain'
});

var googleHybrid = L.gridLayer.googleMutant({
    type: 'hybrid'
});

// Definiere Basis-Layer für den Layer-Control.
var baseLayers = {
    "OpenStreetMap": osmLayer,
    "Google Roadmap": googleRoadmap,
    "Google Satellite": googleSatellite,
    "Google Terrain": googleTerrain,
    "Google Hybrid": googleHybrid
};

// Füge den Layer-Control zur Karte hinzu.
var layercontrol = L.control.layers(baseLayers).addTo(map);

// Leaflet.Locate control initialisieren.
L.control.locate({
    position: 'topleft',
    keepCurrentZoomLevel: true,
    drawCircle: true,
    showCompass: false,
    strings: {
        title: "Zeige meinen aktuellen Standort an.",
        popup: "Sie befinden sich im Umkreis von {distance} Metern um den markierten Mittelpunkt."
    }
}).addTo(map);

/*
 * Initialize Leaflet.FileLayer control for loading GPX/KML/GeoJSON.
 */
let fileLayerColors = [
    "#f44336", "#9c27b0", "#2196f3", "#4caf50", "#ff9800", "#795548", "#607d8b",
];

// Set the label for the file layer button
L.Control.FileLayerLoad.LABEL = '📂';

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
    layercontrol.addOverlay(e.layer, '<span style="color: ' + fileLayerColors[0] + '">' + e.filename + '</span>');

    // rotate to next color
    fileLayerColors.push(fileLayerColors.shift());
});
