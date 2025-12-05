// geocoder.js

let searchMarker = null; // Speichert den aktuellen Suchmarker global

document.addEventListener("DOMContentLoaded", () => {

  /*  Wenn bei einem Leaflet-Steuerelement keine Position angegeben wird, 
      verwendet es seine Standardeinstellung. 
      Für das Plugin L.Control.geocoder ist die voreingestellte Position "topright" (oben rechts).
  */

  // 1. Geocoder-Steuerung erstellen: Wichtig ist defaultMarkGeocode: false
  const geocoderControl = L.Control.geocoder({
    defaultMarkGeocode: false, // <--- WICHTIG: Deaktiviert das automatische Setzen des Markers
    //placeholder: "🔍 Suche Ort",
    placeholder: "Suche Ort",
    errorMessage: "Ort nicht gefunden",
  }).addTo(map);

  // 2. Event-Listener für das Finden eines Ortes hinzufügen
  geocoderControl.on('markgeocode', function(e) {
    // Vorhandenen Marker entfernen
    if (searchMarker) {
      map.removeLayer(searchMarker);
    }

    // Neuen Marker erstellen und speichern
    searchMarker = L.marker(e.geocode.center)
      .addTo(map)
      .bindPopup(e.geocode.name)
      .openPopup();

    // Kartenansicht anpassen (optional)
    //map.fitBounds(e.geocode.bbox || searchMarker.getLatLng().toBounds(100));
    map.fitBounds(e.geocode.bbox || searchMarker.getLatLng().toBounds(100), { padding: [20, 20], maxZoom: 16 }); 

    // Den Löschen-Button anzeigen
    const clearButton = document.getElementById('clear-search-marker-btn');
    if (clearButton) {
        clearButton.style.display = 'block';
    }
  });

  // 3. Einen separaten Leaflet-Control für den Löschen-Button erstellen
  const ClearControl = L.Control.extend({
    options: { position: 'topright' },

    onAdd: function(map) {
      // Erstellt einen Container, der wie ein Leaflet-Control aussieht
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      
      // Erstellt den Button-Link
      const button = L.DomUtil.create('a', 'leaflet-bar-part', container);
      button.id = 'clear-search-marker-btn';
      button.innerHTML = '✖';
      button.title = 'Suchmarker entfernen';
      button.style.display = 'none'; // Zuerst versteckt
      button.style.cursor = 'pointer';
      
      // Stoppt die Event-Propagation, um Konflikte mit der Karte zu vermeiden
      L.DomEvent.on(button, 'click', function(e) {
        L.DomEvent.stop(e);
        if (searchMarker) {
          map.removeLayer(searchMarker);
          searchMarker = null;
          button.style.display = 'none'; // Button wieder verstecken
        }
      });
      return container;
    }
  });

  // 4. Den Löschen-Control zur Karte hinzufügen (wird direkt unter dem Geocoder angezeigt)
  new ClearControl().addTo(map);
});