document.addEventListener("DOMContentLoaded", () => {

  // Add Geocoder control, positioned on the left below zoom
  const geocoderControl = L.Control.geocoder({
    defaultMarkGeocode: true,
    placeholder: "🔍 Suche Ort",
    errorMessage: "Ort nicht gefunden",
  }).addTo(map);

  // console.log("📍 Using geocoder:", geocoderControl.options.geocoder.options.serviceUrl);

  geocoderControl.setPosition("topleft"); // Position below zoom

  if (false) {
    /*
        You can customize what happens when a result is selected

        Let me know if you want rto use a different geocoding service 
        like Mapbox, Google Maps, or Photon.
      */
    const geocoder = L.Control.geocoder({
      defaultMarkGeocode: false,
      placeholder: "Suche Ort",
    })
      .on("markgeocode", function (e) {
        const bbox = e.geocode.bbox;
        const poly = L.polygon([
          bbox.getSouthEast(),
          bbox.getNorthEast(),
          bbox.getNorthWest(),
          bbox.getSouthWest(),
        ]).addTo(map);
        map.fitBounds(poly.getBounds());
      })
      .addTo(map);
  }
});

