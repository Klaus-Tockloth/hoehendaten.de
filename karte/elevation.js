/*
Zweck:
- Erweitert eine Leaflet-Karte um interaktive Funktionen zur Höhenabfrage und -visualisierung.
- Ermöglicht das Setzen von Markern, das Zeichnen von Linien zwischen zwei Punkten zur
  Darstellung von Höhenprofilen (Differenz, Distanz) und die Verwaltung dieser Elemente.

Hauptfunktionen:
- Hinzufügen einzelner Marker mit Anzeige der Meereshöhe (via Tooltip/Popup).
- Zeichnen von Linien zwischen zwei Markern mit Anzeige von Höhendifferenz,
  Distanz und optional Steigung.
- Abrufen von Höhendaten für einzelne Punkte von einer konfigurierbaren externen API
  (siehe Konstante `elevation_url`) mittels POST-Request.
- Interaktive Tooltips und Popups für Marker und Linien zur Informationsanzeige.
- Benutzerdefinierte Leaflet-Steuerelemente (Toolbar) für verschiedene Interaktionsmodi:
    - Einzelnen Marker hinzufügen.
    - Linie zwischen zwei Punkten zeichnen.
    - Gezeichnete Elemente löschen (einzeln oder alle).
- Persistenz von Markern, Linien und der Kartenansicht (Zentrum/Zoom) im `localStorage`
  des Browsers.
- Dynamisches Info-Overlay zur Anzeige detaillierter Informationen beim Klick auf
  Tooltips (alternativ zu/ergänzend zu Popups).
- Möglichkeit, den API-Aufruf zu simulieren (für Entwicklungszwecke).

Funktionsweise / Integration:
- Das Skript operiert auf einer bereits initialisierten Leaflet-Karteninstanz (`window.map`).
- Fügt der Karte benutzerdefinierte Steuerelemente (Controls) hinzu.
- Reagiert auf Klick-Events auf der Karte, um Marker und Linien zu platzieren.
- Modifiziert das DOM zur Anzeige von Informationen in Tooltips, Popups und einem Overlay-Panel.

Abhängigkeiten:
- Leaflet-Bibliothek (L) muss global verfügbar sein.
- Eine Leaflet-Karteninstanz (`window.map`) muss global verfügbar und initialisiert sein,
  bevor dieses Skript ausgeführt wird.
- Die zugehörige CSS-Datei (vermutlich elevation.css oder ähnlich) für das Styling der
  benutzerdefinierten Steuerelemente und Elemente wird für eine korrekte Darstellung benötigt.

Konfiguration:
- Wichtige Verhaltensweisen (z.B. API-URL, API-Simulation, Verwendung von Popups,
  Speicherintervall für localStorage) können über Konstanten am Anfang des Skripts angepasst werden.

Versionen:
- v1.0.0 - 2025-05-25: initiale Veröffentlichung
- v1.1.0 - 2025-06-06: Linie: Richtungspfeil, Aktion: Voreinstellung und Speicherung
           2025-06-11: alert bei Fetch error und Delta, Prozent, Winkel, ..., Prozent und Winkel mit 1 NK
- v1.1.1 - 2025-07-23: Fehlermeldung: Daten konnten nicht geladen werden\n\n...
                       pairPane für zIndex 900 bei marker und line
           2025-09-25: Verzeichnis assets eingebunden, Verzeichnis elevation gelöscht 
                       setInterval auskommentiert, dafür Aufruf von saveMarkersAndLines() wo erforderlich 

Autor:
- Franz Kolberg

Copyright:
- © 2025 | Franz Kolberg (Teile generiert mit ChatGPT und Gemini-AI)

Lizenz:
- MIT License

Kontakt:
- printmaps.service@gmail.com

Anmerkungen:
- Ist auf eine externe API (aktuell hoehendaten.de) für den Abruf von Höhendaten angewiesen.
  Das Format der Anfrage und Antwort ist spezifisch für diese API.
- Die Persistenz nutzt `localStorage`, was bedeutet, dass die Daten browser-spezifisch und
  nicht serverseitig gespeichert werden.
- Die Fehlerbehandlung bei API-Anfragen ist implementiert und zeigt Fehlermeldungen an.

TODOs:
- Derzeit keine offenen TODOs.

Links:
- LeafletJS: https://leafletjs.com/
- Höhendaten-API: https://hoehendaten.de/api.html
*/

// API endpoint URL
const elevation_url = "https://api.hoehendaten.de:14444/v1/point";

const simulateApiCall = false;

const localStorageTimer = 5; // save to localStorage all x seconds

const usePopups = true;

const linePopupOnHover = false;

const txt_ClearEverything = "Clear everything";
const txt_EraseMarkerAndLine = "Erase marker/line";
const txt_AddMarkers = "Add markers";
const txt_Add2PointsAndLine = "Add 2-points and line";

const ElevationIcon = L.Icon.extend({
    options: {
        iconSize: [24, 24],
    }
});

let arrayOfMarkerPairs = []; // array containing markers and their data
let tmp_buffer = []; // 2 point buffer

let suppressNextMapClick = false;

const all_toggle_buttons = [];

/*
mode – Interaktionsmodus
Diese Variable steuert, was beim Klicken auf die Karte passiert:
    mode === 0: Kein aktiver Modus – Klicks werden ignoriert.
    mode === 1: Ein-Punkt-Modus – Marker wird gesetzt.
    mode === 2: Zwei-Punkt-Modus – Erst ein Marker, dann ein zweiter, dazwischen wird eine Linie gezeichnet.
    mode === 9: Löschmodus 
*/

const MODE_NONE = 0;
const MODE_POINT = 1;
const MODE_LINE = 2;
const MODE_ERASE = 9;

let mode = MODE_POINT;

let isFetchingElevation = false;

// --- Init on DOM ready ---
document.addEventListener("DOMContentLoaded", () => {
    // Wait until map is available
    if (window.map) {

        console.info('Hi, here is elevation.js!');

        map.createPane("pairPane");
        map.getPane("pairPane").style.zIndex = 900;

        addCustomControls();

        initClickHandling();

        // recover data from localStorage
        loadMarkersAndLines();

        // save data to localStorage
        // setInterval(saveMarkersAndLines, localStorageTimer * 1000);

        // console.info('ready');
    } else {
        alert("window.map is missing !");
    }
});

/*
addCustomControls erstellt und fügt benutzerdefinierte Leaflet-Steuerelemente für höhenbezogene Aktionen hinzu.
Es definiert Schaltflächen zum Löschen, Entfernen, Hinzufügen einzelner Marker und Hinzufügen von Zwei-Punkt-Linien.
Diese Funktion richtet die Hauptwerkzeugleiste der Benutzeroberfläche für die Interaktion mit den Höhenfunktionen ein.
*/

function addCustomControls() {
  mode = parseInt(localStorage.getItem("mode"));
  if (!mode) 
    mode = MODE_POINT;
  if (mode !== MODE_POINT && mode !== MODE_LINE)
     mode = MODE_POINT;

  const MainControl = L.Control.extend({
    onAdd: () => {
      const container = L.DomUtil.create(
        "div",
        "leaflet-control leaflet-bar elevation-bar"
      );
      const btns = [];
      let pointBtn = null;
      let lineBtn = null;

      function makeBtn(
        html,
        title,
        isToggle,
        onEnable,
        onDisable = null,
        claz = ""
      ) {
        const a = L.DomUtil.create("a", "elevation-btn " + claz, container);
        a.innerHTML = html;
        a.title = title;
        L.DomEvent.disableClickPropagation(a);

        const btnEntry = { element: a, onUnpress: onDisable };

        a.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          resetMode();

          const wasPressed = a.classList.contains("pressed");

          //console.log("isToggle:", isToggle);
          //console.log("wasPressed:", wasPressed);

          if (isToggle) {
            if (wasPressed) {
              a.classList.remove("pressed");
              if (onDisable) onDisable(a);
            } else {
              btns.forEach((btn) => {
                if (
                  btn.element !== a &&
                  btn.element.classList.contains("pressed")
                ) {
                  btn.element.classList.remove("pressed");
                  if (btn.onUnpress) btn.onUnpress(btn.element);
                }
              });
              all_toggle_buttons.forEach((btn) => {
                if (
                  btn.element !== a &&
                  btn.element.classList.contains("pressed")
                ) {
                  btn.element.classList.remove("pressed");
                  if (btn.onUnpress) btn.onUnpress(btn.element);
                }
              });

              a.classList.add("pressed");
              onEnable(a);
            }
          } else {
            onEnable(a);
          }
        });

        btns.push(btnEntry);
        all_toggle_buttons.push(btnEntry);
        return a;
      }

      // Clear Button
      makeBtn(
        "🗑️",
        txt_ClearEverything,
        false,
        () => {
          removeAllPointsAndLines();
          mode = MODE_NONE;
          map.getContainer().style.cursor = "";
          btns.forEach((b) => b.element.classList.remove("pressed"));
          localStorage.setItem("mode", MODE_NONE);
        },
        null,
        "elevation-btn-clear"
      );

      // Erase Button
      makeBtn(
        "⌫",
        txt_EraseMarkerAndLine,
        true,
        () => {
          mode = MODE_ERASE;
          localStorage.setItem("mode", MODE_ERASE);
        },
        () => {
          mode = MODE_NONE;
          localStorage.setItem("mode", MODE_NONE);
        },
        "elevation-btn-erase"
      );

      // Point Button
      pointBtn = makeBtn(
        "⨁",
        txt_AddMarkers,
        true,
        () => {
          mode = MODE_POINT;
          map.getContainer().style.cursor = "crosshair";
          localStorage.setItem("mode", MODE_POINT);
          setStatusInfo("Punkt");
        },
        () => {
          mode = MODE_NONE;
          map.getContainer().style.cursor = "";
          localStorage.setItem("mode", MODE_NONE);
          setStatusInfo("");
        },
        "elevation-btn-1point"
      );

      // Line Button
      lineBtn = makeBtn(
        "⨁-⨁",
        txt_Add2PointsAndLine,
        true,
        () => {
          mode = MODE_LINE;
          map.getContainer().style.cursor = "crosshair";
          localStorage.setItem("mode", MODE_LINE);
          setStatusInfo("Linie");
        },
        () => {
          mode = MODE_NONE;
          map.getContainer().style.cursor = "";
          localStorage.setItem("mode", MODE_NONE);
          setStatusInfo("");
        },
        "elevation-btn-2points"
      );

      if (true) {
         // Set initial button state from localStorage
        if (mode === MODE_POINT && pointBtn) {
          pointBtn.classList.add("pressed");
          map.getContainer().style.cursor = "crosshair";
          setTimeout(() => setStatusInfo("Punkt"), 1000);

        } else if (mode === MODE_LINE && lineBtn) {
          lineBtn.classList.add("pressed");
          map.getContainer().style.cursor = "crosshair";
          setTimeout(() => setStatusInfo("Linie"), 1000);
        }
      }     

      return container;
    },
  });

  function resetMode() {
    if (window.modeManager && typeof window.modeManager.resetMode === "function") {
      window.modeManager.resetMode();
    }
  }

  new MainControl({ position: "topleft" }).addTo(map);
}


/*
initClickHandling richtet den primären Klick-Ereignis-Listener auf der Leaflet-Karte ein. Basierend auf dem aktuellen
Interaktionsmodus löst es Aktionen wie das Hinzufügen eines einzelnen Markers oder das Starten einer Zwei-Punkt-Linie aus.
Es ignoriert Klicks, wenn eine Höhenabfrage läuft oder wenn der Klick auf vorhandene Marker, Tooltips oder Popups abzielt.
*/
function initClickHandling() {
    map.on("click", (e) => {

        if (suppressNextMapClick) return; // Skip this click if suppressed

        if (mode === MODE_NONE)
            return;  

        // Prevent click during elevation fetch
        if (isFetchingElevation) return;

        // ignore if clicking on a marker or tooltip
        if (
            e.originalEvent?.target?.closest(
                ".leaflet-tooltip, .leaflet-marker-icon, .leaflet-popup"
            )
        ) {
            return;
        }

        if (mode === MODE_NONE) return;
        if (mode === MODE_POINT) addMarker(e.latlng, 1);
        if (mode === MODE_LINE) addMarkerAndLine(e.latlng);
    });
}

/*
generateMarkerInfoContent generiert HTML-Inhalt zur Anzeige detaillierter Informationen über einen einzelnen Marker.
Es enthält Höhe, Aktualität, Koordinaten und Quellenangabe oder Fehlerdetails, falls die Höhenabfrage fehlgeschlagen ist.
Dieser Inhalt wird typischerweise für Popups oder ein Overlay-Panel verwendet.
*/
function generateMarkerInfoContent(m) {
    if (!m.isError) {
        return `
      Höhe: ${formatNumber(m.elevation)} m<br>
      Vom: ${m.actuality || "?"}<br>
      Lon: ${typeof m.latlng?.lng === "number" ? m.latlng.lng.toFixed(7) : "?"}<br>
      Lat: ${typeof m.latlng?.lat === "number" ? m.latlng.lat.toFixed(7) : "?"}<br>
      <hr>
      ${m.attribution || ""}
    `;
    } else {
        const {
            Code,
            Title,
            Detail
        } = m.error || {};
        return `
      <h3>Error Info</h3>
      Code: ${Code || "?"}<br>
      Title: ${Title || "?"}<br>
      Detail: ${Detail || "?"}<br>
      Lon: ${typeof m.latlng?.lng === "number" ? m.latlng.lng.toFixed(7) : "?"}<br>
      Lat: ${typeof m.latlng?.lat === "number" ? m.latlng.lat.toFixed(7) : "?"}
    `;
    }
}

/*
generateLineInfoContent erstellt HTML-Inhalt, der eine Linie zwischen zwei Markern detailliert beschreibt.
Es zeigt Informationen für beide Start- und Endpunkte, die berechnete Distanz, den Höhenunterschied und optional
das Gefälle an. Dies wird für Popups oder ein Overlay-Panel verwendet, um linienspezifische Daten anzuzeigen.
*/
function generateLineInfoContent(pair) {
    const latlng1 = L.latLng(pair.m1.latlng.lat, pair.m1.latlng.lng);
    const latlng2 = L.latLng(pair.m2.latlng.lat, pair.m2.latlng.lng);
    const dist = latlng1.distanceTo(latlng2);

    const diff = formatNumber(pair.m2.elevation - pair.m1.elevation);

    const gradientPercent = formatNumber((Math.abs(diff) / dist) * 100, 1);
    
    const angleRad = Math.atan(Math.abs(diff) / dist);
    const angleDeg = angleRad * (180 / Math.PI);
    const formattedAngle = formatNumber(angleDeg, 1);

    const getPointInfo = (m) => {
        if (!m.isError) {
            return `
        Höhe: ${formatNumber(m.elevation)} m<br>
        Vom: ${m.actuality || "?"}<br>
        Lon: ${typeof m.latlng?.lng === "number" ? m.latlng.lng.toFixed(7) : "?"}<br>
        Lat: ${typeof m.latlng?.lat === "number" ? m.latlng.lat.toFixed(7) : "?"}
      `;
        } else {
            const {
                Code,
                Title,
                Detail
            } = m.error || {};
            return `
        Code: ${Code || "?"}<br>
        Title: ${Title || "?"}<br>
        Detail: ${Detail || "?"}<br>
        Lon: ${typeof m.latlng?.lng === "number" ? m.latlng.lng.toFixed(7) : "?"}<br>
        Lat: ${typeof m.latlng?.lat === "number" ? m.latlng.lat.toFixed(7) : "?"}
      `;
        }
    };

    const point1Info = getPointInfo(pair.m1);
    const point2Info = getPointInfo(pair.m2);

    const lineInfo = (!pair.m1.isError && !pair.m2.isError) ?
            `
            Delta: ${Math.abs(formatNumber(diff))} m<br>
            Prozent: ${gradientPercent} %<br>
            Winkel: ${formatNumber(angleDeg, 1)}°<br>
            Strecke: ${formatNumber(dist)} m<br>            
        ` :
            `
            Delta: -<br>
            Prozent: -<br>
            Winkel: -<br>
            Strecke: ${formatNumber(dist)} m<br>            
        `;

    const detailed = false;
    if (detailed) {
        return `
      <h3>Line Info</h3>
      Daten zu Punkt1<br>
      ${point1Info}
      <br><br>
      Daten zu Punkt2<br>
      ${point2Info}
      <br><br>
      ${lineInfo}
    `;
    } else {
        return `
      ${point1Info}
      <hr>
      ${point2Info}
      <hr>
      ${lineInfo}
    `;
    }
}

/*
addMarker fügt einen ziehbaren Marker zur Karte an der angegebenen LatLng hinzu und initiiert eine Höhenabfrage dafür.
Er speichert diesen Marker und seine abgerufenen Daten und ordnet ihn entweder als ersten oder zweiten Punkt eines
potenziellen Paares zu. Das Aussehen des Markers kann farblich angepasst werden.
*/
function addMarker(latlng, position, color = "red") {
    console.log("addMarker");

    let m = null;
    m = createMarker(latlng, true, color).addTo(map);

    getElevation(latlng, (isError, error, elevation, actuality, attribution) => {

        if (position === 1) {
            arrayOfMarkerPairs.push({
                marker1: m,
                marker2: null,
                line: null,
                lineTooltip: null,
                m1: {
                    isError,
                    error,
                    latlng,
                    elevation,
                    actuality,
                    attribution,
                },
                m2: null,
            });

            if (mode === MODE_POINT) {
              saveMarkersAndLines();
            }

            const pair = arrayOfMarkerPairs[arrayOfMarkerPairs.length - 1];
            addTooltipAndPopupToMarker(pair.marker1, pair.m1);
            addEventhandlingToMarker(m, pair);
        }

        if (position === 2) {
            const lastPair = arrayOfMarkerPairs[arrayOfMarkerPairs.length - 1];
            lastPair.marker2 = m;
            lastPair.m2 = {
                isError,
                error,
                latlng,
                elevation,
                actuality,
                attribution,
            };

            if (mode === MODE_LINE) {
              saveMarkersAndLines();
            }

            addTooltipAndPopupToMarker(lastPair.marker2, lastPair.m2);
            addEventhandlingToMarker(m, lastPair);

            // Optional: draw line if both markers are present
            if (lastPair.marker1 && lastPair.marker2) {
                addLineAndTooltip(lastPair);
            }
        }
    });
}

/*
addMarkerAndLine steuert den Zwei-Klick-Prozess zur Erstellung einer Linie zwischen zwei Punkten.
Der erste Klick platziert den Startmarker, und der zweite Klick platziert den Endmarker. Nachdem
der zweite Marker platziert wurde, wird normalerweise das Zeichnen der Linie und die Anzeige der
zugehörigen Informationen ausgelöst.
*/
function addMarkerAndLine(latlng) {

    if (tmp_buffer.length === 0) {
        addMarker(latlng, 1, "blue");
        tmp_buffer.push("bla");
    } else if (tmp_buffer.length === 1) {
        addMarker(latlng, 2, "blue");
        // Reset temp storage
        tmp_buffer = [];
    } else if (tmp_buffer.length > 1) {
        alert("uups");
        tmp_buffer = [];
        return;
    }
}

/*
createMarker instanziiert und gibt ein Leaflet-Marker-Objekt mit angegebenen Eigenschaften zurück.
Es setzt die Position des Markers, den ziehbaren Zustand und das Icon basierend auf der angegebenen
Farbe. Diese Hilfsfunktion zentralisiert die Logik zur Erstellung von Markern.
*/
function createMarker(latlng, draggable, color, markerStyle = 'icon') {
    let marker;

    if (color === 'red') {
        icon = new ElevationIcon({
            iconUrl: './assets/Point-Red-64x64.png'
        });
    } else {
        icon = new ElevationIcon({
            iconUrl: './assets/Point-Blue-64x64.png'
        });
    }

    marker = L.marker(latlng, {
        pane: "pairPane",
        draggable: draggable,
        icon: icon
    });

    return marker;
}

/*
addTooltipAndPopupToMarker hängt einen Tooltip und ein Popup (oder einen Overlay-Auslöser) an einen angegebenen Marker.
Der Tooltip zeigt präzise Höheninformationen oder einen Fehlerstatus an, während das Popup/Overlay detailliertere Daten
bereitstellt. Es passt die Interaktivität an, indem es Tooltips klickbar macht, um mehr Informationen anzuzeigen.
*/
function addTooltipAndPopupToMarker(marker, m) {
    const tooltipClass = "custom-tooltip-" + L.Util.stamp(marker);

    let tooltip;

    //console.log("m.isError: ", m.isError);
    //console.log("m.isError: ", m);
    // 1 ) handle the special string first
    if (m.isError === true) {
        tooltip = "Elevation error";

        /* 2 ) then the numeric tests
              (Number(...) turns non‑number strings into NaN, so we check that
              before converting) */
    } else if (Number(m.elevation) >= 9999) {
        console.log("Elevation is 9999 or more");
        tooltip = "NoData";
    
        /* 3 ) default case – just echo the value plus unit */
    } else {
        tooltip = `${formatNumber(m.elevation)} m`;
    }

    marker.bindTooltip(tooltip, {
        permanent: true,
        direction: "top",
        offset: [0, -14],
        opacity: 0.9,
        className: tooltipClass,
        interactive: true,
    });

    // Define popup content
    const popupContent = generateMarkerInfoContent(m);

    if (usePopups) {
        // Add click listener to tooltip to show popup
        marker.bindPopup(popupContent, {
            className: 'my-custom-popup',
            offset: [0, 6]
        });

        setTimeout(() => {
            const tooltipEl = marker.getTooltip()?.getElement();
            if (tooltipEl) {
                tooltipEl.style.cursor = "pointer";
                tooltipEl.addEventListener("click", () => {
                    marker.openPopup();
                });
            }
        }, 0);
    }

    if (!usePopups) {
        setTimeout(() => {
            const tooltipEl = marker.getTooltip()?.getElement();
            if (tooltipEl) {
                tooltipEl.style.cursor = "pointer";
                tooltipEl.addEventListener("click", () => {
                    const content = generateMarkerInfoContent(m);
                    showOverlayWithContent(content);
                });

            }
        }, 0);

        return;
    }
}

/*
updatePair aktualisiert die Daten und die visuelle Darstellung eines Markers oder Markerpaares, nachdem ein Marker gezogen wurde.
Es ruft die Höhe für den verschobenen Marker erneut ab, aktualisiert dessen Tooltip/Popup und zeichnet jede zugehörige Linie und
deren Tooltip neu. Dies stellt sicher, dass alle angezeigten Informationen mit der neuen Position des Markers synchronisiert bleiben.
*/
function updatePair(marker, pair) {
    if (!pair)
        return;

    getElevation(marker.getLatLng(), (isError, error, elevation, actuality, attribution) => {
        // update pair !!!
        if (marker === pair.marker1) {
            pair.m1.isError = isError,
                pair.m1.error = error,
                pair.m1.latlng = marker.getLatLng();
            pair.m1.elevation = elevation;
            pair.m1.actuality = actuality;
            pair.m1.attribution = attribution;

            addTooltipAndPopupToMarker(marker, pair.m1);

            if (document.getElementById("map-overlay"))
                showOverlayWithContent(generateMarkerInfoContent(pair.m1));
        } else if (marker === pair.marker2) {
            pair.m2.isError = isError,
                pair.m2.error = error,
                pair.m2.latlng = marker.getLatLng();
            pair.m2.elevation = elevation;
            pair.m2.actuality = actuality;
            pair.m2.attribution = attribution;

            addTooltipAndPopupToMarker(marker, pair.m2);

            if (document.getElementById("map-overlay"))
                showOverlayWithContent(generateMarkerInfoContent(pair.m2));
        }

        if (pair.marker2) {
            // update line
            addLineAndTooltip(pair);

            if (document.getElementById("map-overlay"))
                showOverlayWithContent(generateLineInfoContent(pair));
        }
    });
}

/*
addEventhandlingToLineTooltip fügt Ereignis-Listener zum Tooltip hinzu, der mit einer Linie verknüpft ist.
Es ermöglicht hauptsächlich das Klicken auf den Tooltip, um die Linie und ihre Marker zu löschen, wenn der 
Löschmodus aktiv ist. Optional kann es auch eine Popup-Anzeige mit Liniendetails beim Überfahren mit der
Maus auslösen.
*/
function addEventhandlingToLineTooltip(pair) {
    const tooltipEl = pair.lineTooltip?.getElement();

    if (!tooltipEl) return;

    // Click for erase logic
    tooltipEl.addEventListener("click", () => {
        const index = arrayOfMarkerPairs.findIndex(
            (p) => p.lineTooltip === pair.lineTooltip
        );

        if (mode === MODE_ERASE) {
            if (index !== -1) {
                removePair(pair);
                arrayOfMarkerPairs.splice(index, 1);

                saveMarkersAndLines();
            } else {
                console.error("Tooltip not found in pair list");
            }
        } else {
            console.warn("Not in MODE_ERASE");
        }
    });

    // Hover popup
    if (linePopupOnHover) {
        if (usePopups) {
            tooltipEl.addEventListener("mouseenter", (e) => {
                const popupContent = generateLineInfoContent(pair);
                const popup = L.popup({
                        closeButton: false,
                        autoPan: false,
                        offset: [0, -14],

                    })
                    .setLatLng(pair.line.getCenter())
                    .setContent(popupContent)
                    .openOn(map);

                // Save to pair if you want to reuse/close it later
                pair._hoverPopup = popup;
            });

            tooltipEl.addEventListener("mouseleave", () => {
                if (pair._hoverPopup) {
                    map.closePopup(pair._hoverPopup);
                    pair._hoverPopup = null;
                }
            });
        }
    }

}

/*
throttle ist eine Hilfsfunktion, die die Ausführungshäufigkeit einer anderen Funktion begrenzt.
Sie stellt sicher, dass die umschlossene Funktion höchstens einmal innerhalb eines bestimmten Zeitintervalls aufgerufen wird.
Dies ist nützlich zur Leistungsoptimierung von Ereignisbehandlern, die schnell ausgelöst werden, wie z. B. 'drag'-Ereignisse.
*/
function throttle(func, limit) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            func.apply(this, args);
        }
    };
}

/*
addEventhandlingToMarker fügt Ereignis-Listener zu einem einzelnen Marker hinzu. Es richtet 'Klick'-Ereignisse
zum Löschen des Markers ein, wenn der Löschmodus aktiv ist. Es behandelt auch 'drag'- und 'dragend'-Ereignisse,
um die Informationen des Markers und jede zugehörige Linie zu aktualisieren.
*/
function addEventhandlingToMarker(marker, pair) {
    // marker.on("click", () => {
    marker.on("click", function(e) {
        if (mode === MODE_ERASE)
            erase(marker);
        return;
    });

    if (marker instanceof L.Marker) {
        // works only for instance of L.marker !
        marker.on("dragend", () => {
            updatePair(marker, pair);

            saveMarkersAndLines();
        });
        const throttledUpdatePair = throttle(updatePair, 100); // 100ms = 10x per second
        marker.on("drag", () => throttledUpdatePair(marker, pair));
    } else {
        console.warn("Unknown type");
    };
}

/*
addLineAndTooltip zeichnet oder aktualisiert eine Polylinie und deren zugehörigen Tooltip zwischen zwei Markern eines Paares.
Es entfernt jede vorhandene Linie und jeden Tooltip für das Paar, bevor neue erstellt werden. Die Linie wird gestaltet, und
ihr Tooltip zeigt wichtige Informationen wie den Höhenunterschied an.
Richtungspfeil zur Senke
*/
function addLineAndTooltip(pair) {
    let latlng1 = null;
    let latlng2 = null;

    if (pair.m1.elevation > pair.m2.elevation) {
      latlng1 = pair.marker1.getLatLng();
      latlng2 = pair.marker2.getLatLng();
    } else if (pair.m1.elevation < pair.m2.elevation) {
      latlng2 = pair.marker1.getLatLng();
      latlng1 = pair.marker2.getLatLng();
    } else {
      latlng2 = pair.marker1.getLatLng();
      latlng1 = pair.marker2.getLatLng();
    }

    if (pair.line) map.removeLayer(pair.line);
    if (pair.lineTooltip) map.removeLayer(pair.lineTooltip);
    if (pair.arrowDecorator) map.removeLayer(pair.arrowDecorator);
    if (pair.zoomHandler) map.off("zoomend", pair.zoomHandler);

  /*    
    L.polyline([latlng1, latlng2], ...)
    Then latlng1 → latlng2 defines the direction of the line. So any arrowHead placed 
    along that line will point from latlng1 to latlng2, regardless of elevation!
  */
  const newLine = L.polyline([latlng1, latlng2], {
    pane: "pairPane",
    color: "red",
    weight: 2,
  }).addTo(map);

  newLine._path.classList.add("my-custom-line");
  newLine._path.removeAttribute("stroke");

  pair.line = newLine;

  pair.arrowDecorator = createLineWithArrowDecorator(pair);

  createLineTooltip(pair);
}

/*
Unfortunately, Leaflet.PolylineDecorator only supports percentage-based offsets, not pixel-based. 
Damit die Richtungspfeile stets in etwa den gleichen Abstand zu den Enpunkten haben,
muss zoom level berücksichtigt werden
*/ 
function createLineWithArrowDecorator(pair) {
  if (pair.m1.isError || pair.m2.isError) 
    return;

  const latlng1 = pair.marker1.getLatLng();
  const latlng2 = pair.marker2.getLatLng();

  const elev1 = pair.m1.elevation;
  const elev2 = pair.m2.elevation;

  if (elev1 === elev2) return;

  let arrowFrom = null;
  let arrowTo = null;

  if (elev1 > elev2) {
    arrowFrom = latlng1;
    arrowTo = latlng2;
  } else if (elev2 > elev1) {
    arrowFrom = latlng2;
    arrowTo = latlng1;
  }

  if (!arrowFrom || !arrowTo) return null;

  const arrowLine = pair.line;

  const getOffsetPercentageValue = (from, to, pixelGap) => {
    const p1 = map.latLngToContainerPoint(from);
    const p2 = map.latLngToContainerPoint(to);
    const pixelLength = p1.distanceTo(p2);
    return Math.min(Math.max((pixelGap / pixelLength) * 100, 1), 49);
  };

  const pixelGapStart = 28;
  const pixelGapEnd = 18;

  const percentStart = getOffsetPercentageValue(
    arrowFrom,
    arrowTo,
    pixelGapStart
  );
  const percentEnd = getOffsetPercentageValue(arrowTo, arrowFrom, pixelGapEnd);

  const offsetStart = `${percentStart}%`;
  const offsetEnd = `${100 - percentEnd}%`;

  const buildDecorator = () =>
    L.polylineDecorator(arrowLine, {
      patterns: [
        {
          offset: offsetStart,
          repeat: 0,
          symbol: L.Symbol.arrowHead({
            pixelSize: 10,
            polygon: false,
            pathOptions: {
              pane: "pairPane",
              stroke: true,
              color: "rgb(82, 144, 199)",
              weight: 1.5,
              opacity: 1,
            },
          }),
        },
        {
          offset: offsetEnd,
          repeat: 0,
          symbol: L.Symbol.arrowHead({
            pixelSize: 10,
            polygon: false,
            pathOptions: {
              stroke: true,
              color: "rgb(82, 144, 199)",
              weight: 1.5,
              opacity: 1,
            },
          }),
        },
      ],
    });

  if (pair.arrowDecorator) map.removeLayer(pair.arrowDecorator);
  pair.arrowDecorator = buildDecorator().addTo(map);

  // Rebind zoom handler to recalculate everything
  if (pair.zoomHandler) {
    map.off("zoomend", pair.zoomHandler);
  }

  pair.zoomHandler = () => {
    createLineWithArrowDecorator(pair);
  };

  map.on("zoomend", pair.zoomHandler);

  return pair.arrowDecorator;
}

/*
getElevation dient als Verteiler für das Abrufen von Höhendaten für eine gegebene LatLng. Es entscheidet, ob die
tatsächliche API-Endpunkt- oder eine Simulationsfunktion basierend auf der `simulateApiCall`-Konfiguration aufgerufen
wird. Die abgerufenen oder simulierten Höhendaten werden dann an den bereitgestellten `onSuccess`-Callback übergeben.
*/
function getElevation(latlng, onSuccess) {
    if (simulateApiCall) {
        simulateFetchElevation(latlng, onSuccess);
    } else {
        fetchElevation(latlng, onSuccess);
    }
}

/*
fetchElevation führt eine asynchrone Anfrage an eine externe API durch, um Höhendaten für eine bestimmte Längen- und Breitengradkoordinate abzurufen.
Es erstellt eine JSON-POST-Anfrage, sendet sie ab und verarbeitet die Antwort, wobei sowohl erfolgreiche Datenabrufe als auch API-Fehler behandelt werden.
Die Ergebnisse, einschließlich Höhe, Aktualität und Quellenangabe, werden an einen `onSuccess`-Callback übergeben.
*/
function fetchElevation(latlng, onSuccess) {
    if (isFetchingElevation) return;
    isFetchingElevation = true;

    const body = {
        Type: "PointRequest",
        ID: `WebApp-${Date.now()}`,
        Attributes: {
            Latitude: latlng.lat,
            Longitude: latlng.lng,
        },
    };

    fetch(elevation_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(body),
        })
        .then((response) => {
            if (response.ok || response.status === 400) {
                return response.json();
            } else {
                throw new Error(`Unexpected HTTP error! Status: ${response.status}`);
            }
        })
        .then((res) => {
            isFetchingElevation = false;
            //console.log("Full elevation response:", res);

            const {
                IsError: isError,
                Error: error,
                Elevation: e,
                Actuality: a,
                Attribution: at,
                TileIndex: ti
            } = res.Attributes;
            onSuccess(isError, error, e, a, at, ti);
        })
        .catch((error) => {
            isFetchingElevation = false;
            console.error("Fetch error:", error);
            //alert("Fetch error: " + error.message);
            alert(
                "Daten konnten nicht geladen werden\n\nEs ist ein Problem bei der Verbindung zum Server aufgetreten.\nBitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut."
            );

            const msg = "❌ Fetch failed";
            const a = "Code: FETCH_ERROR";
            const at = error.message || "-";
            const ti = "";

            onSuccess(msg, a, at, ti);
        });
}

/*
simulateFetchElevation liefert simulierte Höhendaten für eine gegebene Längen- und Breitengradkoordinate, ohne einen
tatsächlichen API-Aufruf zu tätigen. Diese Funktion wird für Entwicklungs- und Testzwecke verwendet und gibt vordefinierte
oder zufällig generierte Werte zurück. Die simulierten Daten werden an den `onSuccess`-Callback übergeben und ahmen eine
echte API-Antwortstruktur nach.
*/
function simulateFetchElevation(latlng, onSuccess) {
    const elevation = (Math.random() * 100 + 50).toFixed(1);
    const actuality = "2023-11";
    const attribution = "SIMULATION !!!";
    const tileIndex = "32_429_5749";

    onSuccess(elevation, actuality, attribution, tileIndex);
}

/*
createLineTooltip generiert und fügt der Karte einen Tooltip für ein Liniensegment zwischen zwei Markern hinzu.
Dieser Tooltip zeigt zusammenfassende Informationen wie den Höhenunterschied an. Er richtet auch Interaktivität ein,
die es ermöglicht, durch Klicken auf den Tooltip potenziell detailliertere Popups anzuzeigen oder andere Aktionen auszulösen.
*/
function createLineTooltip(pair) {
    const latlng1 = pair.marker1.getLatLng();
    const latlng2 = pair.marker2.getLatLng();

    const dist = latlng1.distanceTo(latlng2);

    let tipText;
    if (pair.m1.isError || pair.m2.isError) {
        tipText = "NoData";
    } else {
        const diff = formatNumber(
            parseFloat(pair.m2.elevation) - parseFloat(pair.m1.elevation)
            );
        const displayDiffValue = Math.abs(parseFloat(diff)).toFixed(2);
        tipText = `${displayDiffValue} m`;
    }
    const tip = tipText;   

    const tooltipId = `tooltip-${Date.now()}`;

    const htmlContent = `<span id="${tooltipId}-text">${tip}</span>`;

    const midLat = (latlng1.lat + latlng2.lat) / 2;
    const midLng = (latlng1.lng + latlng2.lng) / 2;  

    const tooltip = L.tooltip({
            permanent: true,
            direction: "top",
            offset: [0, -6],
            className: "line-tooltip",
            interactive: true // ← Tooltip reagiert auf Maus
        })
        .setLatLng([midLat, midLng])
        .setContent(htmlContent)
        .addTo(map);

    pair.lineTooltip = tooltip;

    addEventhandlingToLineTooltip(pair);

    if (!usePopups) {
        setTimeout(() => {
            const tooltipEl = tooltip?.getElement();
            if (tooltipEl) {
                tooltipEl.style.cursor = "pointer";
                tooltipEl.addEventListener("click", () => {
                    const content = generateLineInfoContent(pair);
                    showOverlayWithContent(content);
                });
            }
        }, 0);
        return;
    }

    if (pair.popupMarker) {
        pair.popupMarker.closePopup();
        map.removeLayer(pair.popupMarker);
        pair.popupMarker = null;
    }

    // 1. Dummy‑Marker direkt unter den Tooltip setzen
    const ghost = L.marker([midLat, midLng], {
        pane: "pairPane",
        icon: L.divIcon({
            className: 'ghost-icon'
        }),
        keyboard: false // kein Tastaturfokus
    }).addTo(map);

    // 2. Popup‑Inhalt definieren
    const popupHtml = generateLineInfoContent(pair);

    // 3. Popup binden (autoClose / closeOnClick nach Bedarf)
    ghost.bindPopup(popupHtml, {
        closeButton: true,
        autoClose: true,
        closeOnClick: false,
        offset: L.point(0, 15),
        className: 'my-custom-popup'
    });

    // 4. Klick auf Tooltip öffnet Popup des Ghost‑Markers
    if (mode !== MODE_ERASE)
        tooltip.on("click", () => ghost.openPopup());

    // 5. Referenzen speichern
    pair.lineTooltip = tooltip;
    pair.popupMarker = ghost;
}

/*
clearAll entfernt alle vom Benutzer hinzugefügten Höhenelemente von der Karte und setzt interne Datenstrukturen zurück.
Dies umfasst alle Marker, Linien, Tooltips und leert das `arrayOfMarkerPairs` sowie temporäre Puffer. Es stellt effektiv
einen sauberen Zustand für die Höhenfunktionalität her.
*/
function removeAllPointsAndLines() {
    arrayOfMarkerPairs.forEach((pair) => {
        if (pair.marker1) map.removeLayer(pair.marker1);
        if (pair.marker2) map.removeLayer(pair.marker2);
        if (pair.line) map.removeLayer(pair.line);
        if (pair.lineTooltip) map.removeLayer(pair.lineTooltip);

        if (pair.arrowDecorator) map.removeLayer(pair.arrowDecorator);

    });
    // Clear the array properly
    arrayOfMarkerPairs.length = 0;

    saveMarkersAndLines();

    // Clear any 2-point buffers
    tmp_buffer = [];
}

/*
erase entfernt einen angeklickten Marker und seine zugehörigen Elemente von der Karte und aus dem Datenspeicher.
Wenn der Marker Teil einer Zwei-Punkt-Linie ist, werden auch die entsprechende Linie, der Tooltip und der andere
Marker des Paares entfernt. Es aktualisiert das `arrayOfMarkerPairs`, um die Löschung widerzuspiegeln.
*/
function erase(clickedMarker) {
  const index = arrayOfMarkerPairs.findIndex(
    (pair) => pair.marker1 === clickedMarker || pair.marker2 === clickedMarker
  );

  if (index !== -1) {
    const pair = arrayOfMarkerPairs[index];

    removePair(pair); // Use the helper function

    arrayOfMarkerPairs.splice(index, 1); // Remove from array

    saveMarkersAndLines();
  }
}

/*
removePair ist eine Hilfsfunktion, die alle Leaflet-Layer, die mit einem bestimmten Markerpaar-Objekt verknüpft sind,
von der Karte entfernt. Dies schließt den ersten Marker, den zweiten Marker (falls vorhanden), die Verbindungslinie
und den Tooltip der Linie ein. Es modifiziert nicht das `arrayOfMarkerPairs` selbst.
*/
function removePair(pair) {
    const {
        marker1,
        marker2,
        line,
        lineTooltip,
        arrowDecorator
    } = pair;

    map.removeLayer(marker1);
    if (marker2 != null) {
        map.removeLayer(marker2);

        map.removeLayer(line);
        map.removeLayer(lineTooltip);

        map.removeLayer(arrowDecorator);
    }
}

/*
makeOverlayDraggable ermöglicht es, ein HTML-Element, typischerweise ein Overlay-Panel, durch Ziehen zu verschieben.
Es hängt Maus-Ereignis-Listener (mousedown, mousemove, mouseup) an ein spezifiziertes Zieh-Handle innerhalb des Elements.
Diese Funktion erlaubt es Benutzern, das Overlay für eine bessere Sichtbarkeit der Karte neu zu positionieren.
*/
function makeOverlayDraggable(elmnt, dragHandle) {
    let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;

    dragHandle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        // Get the mouse cursor position at startup
        pos3 = e.clientX;
        pos4 = e.clientY;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        // Calculate the new cursor position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;

        pos3 = e.clientX;
        pos4 = e.clientY;

        // Set the element's new position
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

/*
showOverlayWithContent zeigt ein ziehbares Overlay-Panel auf der Karte an oder aktualisiert es mit dem bereitgestellten HTML-Inhalt.
Falls das Overlay nicht existiert, erstellt es dieses mit einer Kopfzeile (zum Ziehen und Schließen) und einem Inhaltsbereich.
Diese Funktion wird verwendet, um detaillierte Informationen für Marker oder Linien als Alternative zu Popups anzuzeigen.
*/
function showOverlayWithContent(content) {
    // Check container first
    const container = document.querySelector(".map-container");
    if (!container) {
        console.error("No .map-container found!");
        return;
    }

    let overlay = document.getElementById("map-overlay");

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "map-overlay";

        // Style the container itself
        Object.assign(overlay.style, {
            position: "absolute",
            top: "160px",
            right: "10px",
            zIndex: 1000,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "6px",
            maxWidth: "300px",
            boxShadow: "0 0 6px rgba(0,0,0,0.2)",
        });

        container.appendChild(overlay);
    }

    // Fill overlay with content and header
    overlay.innerHTML = `
    <div id="map-overlay-header" style="
      cursor: move;
      background: #eee;
      padding: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ccc;">
      <span>Details</span>
      <button id="map-overlay-close" style="
        border: none;
        background: none;
        font-size: 1.2em;
        cursor: pointer;">✖</button>
    </div>
    <div id="map-overlay-content" style="padding: 8px;"></div>
  `;

    // Set dynamic content
    const contentDiv = overlay.querySelector("#map-overlay-content");
    if (contentDiv) {
        contentDiv.innerHTML = content;
    } else {
        console.error("Could not find #map-overlay-content");
    }

    // Set up close handler
    const closeBtn = overlay.querySelector("#map-overlay-close");
    if (closeBtn) {
        closeBtn.onclick = () => overlay.remove();
    }

    // Make draggable
    const header = overlay.querySelector("#map-overlay-header");
    if (header) {
        makeOverlayDraggable(overlay, header);
    } else {
        console.error("Could not find #map-overlay-header");
    }
}

/*
auf 2 Nachkommestellen runden
*/
function formatNumber(number, nk=2) {
  //return (Math.round(number * 100) / 100).toFixed(nk);
  return (Math.round(number * Math.pow(10, nk)) / Math.pow(10, nk)).toFixed(nk);
}

/*
saveMarkersAndLines speichert den aktuellen Zustand der Karte und aller Höhenelemente im `localStorage` des Browsers.
Es sichert das Zentrum und den Zoomlevel der Karte sowie eine serialisierte Darstellung aller Marker und ihrer
zugehörigen Daten. Dies ermöglicht es, die Annotationen des Benutzers in nachfolgenden Sitzungen wiederherzustellen.
*/
function saveMarkersAndLines() {

    const mapState = {
        center: map.getCenter(),
        zoom: map.getZoom(),
    };
    localStorage.setItem("mapState", JSON.stringify(mapState));

    // Create a cleaned copy
    const cleanCopy = arrayOfMarkerPairs.map((pair) => ({
        m1: {
            ...pair.m1,
        },
        m2: pair.m2 ?
            {
                ...pair.m2
            } :
            null,
    }));
    const serializedPairs = JSON.stringify(cleanCopy);
    localStorage.setItem("arrayOfMarkerPairs", serializedPairs);
}

/*
loadMarkersAndLines stellt den Kartenzustand und zuvor gespeicherte Höhenelemente aus dem `localStorage` wieder her.
Es ruft die gespeicherte Kartenansicht (Zentrum, Zoom) und das Array der Markerpaare ab und parst diese.
Anschließend erstellt es die Marker, Linien und deren Tooltips/Popups auf der Karte neu.
*/
function loadMarkersAndLines() {
    const mapStateData = localStorage.getItem("mapState");
    if (mapStateData) {
        const mapState = JSON.parse(mapStateData);
        if (mapState.center && typeof mapState.zoom === "number") {
            // TODO ??? map.setView(mapState.center, mapState.zoom);
        }
    }

    const saved = localStorage.getItem("arrayOfMarkerPairs");
    if (!saved) return;

    const savedPairs = JSON.parse(saved);
    arrayOfMarkerPairs.length = 0; // Clear existing

    savedPairs.forEach((pair) => {
        let color = 'blue';
        if (!pair.m2) {
            color = 'red';
        }

        let m1 = null;
        m1 = createMarker([pair.m1.latlng.lat, pair.m1.latlng.lng], true, color, 'icon').addTo(map);

        let m2 = null;
        if (pair.m2) {
            m2 = createMarker([pair.m2.latlng.lat, pair.m2.latlng.lng], true, color, 'icon').addTo(map);
        }

        arrayOfMarkerPairs.push({
            marker1: m1,
            marker2: m2,
            line: null,
            lineTooltip: null,
            m1: pair.m1,
            m2: pair.m2,
            l: {
                tooltip: pair.l?.tooltip || null,
            },
        });

        addTooltipAndPopupToMarker(m1, pair.m1);
        addEventhandlingToMarker(m1, arrayOfMarkerPairs[arrayOfMarkerPairs.length - 1]);
        if (m2) {
            addTooltipAndPopupToMarker(m2, pair.m2);
            addEventhandlingToMarker(m2, arrayOfMarkerPairs[arrayOfMarkerPairs.length - 1]);

            addLineAndTooltip(arrayOfMarkerPairs[arrayOfMarkerPairs.length - 1])
        }
    });
}

function setStatusInfo(status) { 
  const statusInfo = document.getElementById("status-info");
  if (statusInfo) {
      statusInfo.textContent = status;
  }  
}
