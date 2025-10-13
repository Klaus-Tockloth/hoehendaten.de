// geo-utils.js

function isLatLngInTile(latlng, tileIndexStr) {
  // Requires global proj4
  const [zoneStr, eastingStr, northingStr] = tileIndexStr.split("_");
  const zone = parseInt(zoneStr, 10);
  const tileEasting = parseInt(eastingStr, 10) * 1000;
  const tileNorthing = parseInt(northingStr, 10) * 1000;

  const utm = proj4(
    "EPSG:4326",
    `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
    [latlng.lng, latlng.lat]
  );

  const [x, y] = utm;

  return (
    x >= tileEasting &&
    x < tileEasting + 1000 &&
    y >= tileNorthing &&
    y < tileNorthing + 1000
  );
}

function calculateLatLng(tileIndexStr) {
  // Requires global proj4
  const [zoneStr, eastingStr, northingStr] = tileIndexStr.split("_");
  const zone = parseInt(zoneStr, 10);
  const easting = parseInt(eastingStr, 10) * 1000 + 500;
  const northing = parseInt(northingStr, 10) * 1000 + 500;

  const latlng = proj4(
    `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
    "EPSG:4326",
    [easting, northing]
  );

  return {
    lat: latlng[1],
    lng: latlng[0],
  };
}

function getUTMZone(lng, lat) {
  let zone = Math.floor((lng + 180) / 6) + 1;

  // Special exceptions for Norway
  if (lat >= 56 && lat < 64 && lng >= 3 && lng < 12) {
    zone = 32;
  }

  // Special exceptions for Svalbard
  if (lat >= 72 && lat < 84) {
    if (lng >= 0 && lng < 9) zone = 31;
    else if (lng >= 9 && lng < 21) zone = 33;
    else if (lng >= 21 && lng < 33) zone = 35;
    else if (lng >= 33 && lng < 42) zone = 37;
  }
  return zone;
}

function getZoneFromTileIndex(tileIndex) {
  if (!tileIndex || typeof tileIndex !== "string") {
    throw new Error("Invalid tileIndex");
  }

  const parts = tileIndex.split("_");
  const zone = parseInt(parts[0], 10);

  if (isNaN(zone)) {
    throw new Error(`No valid zone found in tileIndex: ${tileIndex}`);
  }

  return zone;
}

function calculateTileindexFromPoint(zone, lon, lat) {
  // 1. define the source and target projections
  const sourceProjection = "EPSG:4326"; // WGS84
  const targetProjection = `+proj=utm +zone=${zone} +north +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;

  // 2. perform the transformation
  const utmCoordinates = proj4(sourceProjection, targetProjection, [lon, lat]);
  const easting = utmCoordinates[0];
  const northing = utmCoordinates[1];

  // 3. create the tile index
  // Easting and Northing without decimal places
  const eastingInt = Math.trunc(easting);
  const northingInt = Math.trunc(northing);

  // shorten by 3 leading digits by dividing and rounding down
  const eastingIndex = Math.floor(eastingInt / 1000);
  const northingIndex = Math.floor(northingInt / 1000);

  // 4. return the formatted index
  return `${zone}_${eastingIndex}_${northingIndex}`;
}

function calculateNewLatLng(initialLatLng, distanceKm, bearingDegrees) {
    const EARTH_RADIUS_KM = 6371; // Mean radius of the Earth in kilometers [3, 9, 18]

    const latRad = initialLatLng.lat * Math.PI / 180;
    const lonRad = initialLatLng.lng * Math.PI / 180;
    const bearingRad = bearingDegrees * Math.PI / 180;

    const angularDistance = distanceKm / EARTH_RADIUS_KM;

    const newLatRad = Math.asin(
        Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
    );

    let newLonRad = lonRad + Math.atan2(
        Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
    );

    // Normalize longitude to -180 to +180
    newLonRad = (newLonRad + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

    const newLat = newLatRad * 180 / Math.PI;
    const newLon = newLonRad * 180 / Math.PI;

    return L.latLng(newLat, newLon);
}

function lookupTileInMap(map, tileindex) {
    return map.get(tileindex);
}

function getTiles(map, lon, lat) {

    let allFoundTiles = [];

    // Logik basierend auf dem Längengrad
    if (lon <= 10.4) {
        const tileindex32 = calculateTileindexFromPoint(32, lon, lat);
          const tiles = lookupTileInMap(map, tileindex32);
        if (tiles) {
            allFoundTiles.push(...tiles);
        }
    } else {
        const tileindex32 = calculateTileindexFromPoint(32, lon, lat);
        const tileindex33 = calculateTileindexFromPoint(33, lon, lat);
        
        const tiles32 = lookupTileInMap(map, tileindex32);
        if (tiles32) {
            allFoundTiles.push(...tiles32);
        }
        const tiles33 = lookupTileInMap(map, tileindex33);
        if (tiles33) {
            allFoundTiles.push(...tiles33);
        }
    }
    return allFoundTiles;
}

function findAndDisplayTiles(map, lon, lat) {
    const resultsDiv = document.getElementById('results');    
    let resultsHTML = `<h2>Informationen ..</h2>`;
    let allFoundTiles = [];

    if (lon <= 10.4) {
        const tileindex32 = calculateTileindexFromPoint(32, lon, lat);
        resultsHTML += `<p>Suche in Zone 32 nach Index: <strong>${tileindex32}</strong></p>`;
        const tiles = lookupTileInMap(map, tileindex32);
        if (tiles) {
            allFoundTiles.push(...tiles);
        }
    } else {
        const tileindex32 = calculateTileindexFromPoint(32, lon, lat);
        const tileindex33 = calculateTileindexFromPoint(33, lon, lat);
        resultsHTML += `<p>Suche in Zone 32 nach Index: <strong>${tileindex32}</strong></p>`;
        resultsHTML += `<p>Suche in Zone 33 nach Index: <strong>${tileindex33}</strong></p>`;
        
        const tiles32 = lookupTileInMap(map, tileindex32);
        if (tiles32) {
            allFoundTiles.push(...tiles32);
        }
        const tiles33 = lookupTileInMap(map, tileindex33);
        if (tiles33) {
            allFoundTiles.push(...tiles33);
        }
    }

    if (allFoundTiles.length === 0) {
        resultsHTML += "<p><strong>Keine Kacheln für diese Koordinaten gefunden.</strong></p>";
    } else {
        console.log("findAndDisplayTiles allFoundTiles: ", allFoundTiles);

        resultsHTML += `<h3>${allFoundTiles.length} Kachel(n) gefunden:</h3>`;
        allFoundTiles.forEach(tile => {            
            const tileData = tile.tile; 

            resultsHTML += `
              <div class="tile-info">
                  <strong>TileIndex:</strong> ${tile.filename}<br> <!-- Annahme: filename statt des nicht existierenden TileIndex -->
                  <strong>Herkunft:</strong> ${tileData.Origin}<br>
                  <strong>Aktualität:</strong> ${tileData.Actuality}<br><br>
              </div>
            `;
        });
    }
    return resultsHTML;
}

function findTiles(map, lon, lat) {
   let allFoundTiles = [];
    
    if (lon <= 10.4) {
        const tileindex32 = calculateTileindexFromPoint(32, lon, lat);
         const tiles = lookupTileInMap(map, tileindex32);
        if (tiles) {
            allFoundTiles.push(...tiles);
        }
    } else {
        const tileindex32 = calculateTileindexFromPoint(32, lon, lat);
        const tileindex33 = calculateTileindexFromPoint(33, lon, lat);
           
        const tiles32 = lookupTileInMap(map, tileindex32);
        if (tiles32) {
            allFoundTiles.push(...tiles32);
        }
        const tiles33 = lookupTileInMap(map, tileindex33);
        if (tiles33) {
            allFoundTiles.push(...tiles33);
        }
    }

    return allFoundTiles;
}
function displayTiles(allFoundTiles, lon, lat, typeName="") {    
  const resultsDiv = document.getElementById('results');    
    let resultsHTML = `<h2>Informationen ...</h2>`;
   
    if (allFoundTiles.length === 0) {
        resultsHTML += "<p><strong>Keine Kacheln für diese Koordinaten gefunden.</strong></p>";
    } else { 
        console.log("displayTiles allFoundTiles: ", allFoundTiles);

        resultsHTML += `<h3>${allFoundTiles.length} ${typeName}-Kachel(n) gefunden:</h3>`;
        allFoundTiles.forEach(tile => {            
            const tileData = tile.tile; 
            console.log("displayTiles tileData: ", tileData);

            resultsHTML += `
              <div class="tile-info">
                  <!--
                  <strong>Dateiname:</strong> ${tile.filename}<br>
                  -->
                  <strong>TileIndex:</strong> ${tileData.TileIndex}<br>
                  <strong>Herkunft:</strong> ${tileData.Origin}<br>
                  <strong>Aktualität:</strong> ${tileData.Actuality}<br>
                  <strong>Attribution:</strong> ${tileData.Attribution}<br><br>
              </div>
            `;
        });       
    }
    return resultsHTML;
}

function calculateRectangleAreaInSqKm(drawnRectangleBounds) {
  // Ensure Turf.js is loaded
  if (typeof turf === "undefined") {
    console.error(
      "Turf.js library is not loaded. Please include it in your project."
    );
    return null;
  }

  // 1. Get the southwest and northeast corners of the bounds.
  const sw = drawnRectangleBounds.getSouthWest();
  const ne = drawnRectangleBounds.getNorthEast();

  // 2. Define the four corners of the rectangle in GeoJSON [longitude, latitude] format.
  // GeoJSON coordinates are [longitude, latitude].
  const southWestCoord = [sw.lng, sw.lat];
  const southEastCoord = [ne.lng, sw.lat]; // Same latitude as SW, same longitude as NE
  const northEastCoord = [ne.lng, ne.lat];
  const northWestCoord = [sw.lng, ne.lat]; // Same latitude as NE, same longitude as SW

  // 3. Create a GeoJSON Polygon from these coordinates.
  // The polygon must be a closed loop, so the first and last coordinates are the same.
  const rectanglePolygon = turf.polygon([
    [
      southWestCoord,
      southEastCoord,
      northEastCoord,
      northWestCoord,
      southWestCoord, // Closing the polygon
    ],
  ]);

  // 4. Calculate the area using Turf.js.
  // turf.area() returns the area in square meters. [2]
  const areaInSquareMeters = turf.area(rectanglePolygon);

  // 5. Convert the area from square meters to square kilometers.
  const areaInSquareKilometers = areaInSquareMeters / 1_000_000;

  console.log(
    "Area of the drawn rectangle:",
    areaInSquareKilometers.toFixed(2),
    "square km");

  return areaInSquareKilometers;
}

function removeLayerByLeafletId(id) {
    var layerToRemove = null;
    map.eachLayer(function(layer) {
        if (layer._leaflet_id === id) {
            layerToRemove = layer;
        }
    });

    if (layerToRemove) {
        map.removeLayer(layerToRemove);
        console.log('Layer with _leaflet_id ' + id + ' removed from map.');
    } else {
        console.log('Layer with _leaflet_id ' + id + ' not found on map.');
    }
}

window.isLatLngInTile = isLatLngInTile;
window.calculateLatLng = calculateLatLng;
window.getUTMZone = getUTMZone;
window.getZoneFromTileIndex = getZoneFromTileIndex;
window.calculateTileindexFromPoint = calculateTileindexFromPoint;

window.calculateNewLatLng = calculateNewLatLng;
window.lookupTileInMap = lookupTileInMap;
