// ui-utils.js

// --- Init on DOM ready ---
document.addEventListener("DOMContentLoaded", () => {
  // Eine Info-Meldung, dass das Skript geladen und initialisiert wird.
  // console.info("Hallo, ui_utils.js wird geladen!");
});

function isMobile() {
  //return true; // Für Testzwecke, um mobile Ansicht zu erzwingen

  return (
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.matchMedia("(max-width: 768px)").matches
  );
}

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

(function (global) {
   const allToggleEntries = [];

  window.updateEyeIndicator = function (type, visible) {
    // console.log("window.updateEyeIndicator aufgerufen");
    const entry = allToggleEntries.find((e) => e.type === type);
    
    if (entry && entry.a && entry.a._eyeIndicator) {
      entry.a._eyeIndicator.innerHTML = visible
        ? '<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;">'
        : '<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;">'; // Auge-Symbol für sichtbar, Affe-Symbol für unsichtbar
      entry.a._eyeIndicator._open = visible; // Interner Status
    }
  };
  
  window.updateLayerCheckbox = function (type, visible) {
    const checkbox = window.layerCheckboxMap?.[type];
    if (checkbox) {
      checkbox.checked = visible;
      // console.log(`[checkbox] set visibility for [${type}] → ${visible}`);
    }
  };

  function deactivateElevationButtons() {
      document.querySelectorAll(".elevation-btn").forEach((btn) => {
      const wasPressed = btn.classList.contains("pressed");
      if (wasPressed) {
        btn.classList.remove("pressed");
        
        mode = MODE_NONE; // elevation_1.js
      }
    });
  }
  
  async function deleteAllLayers(config, type) {    
    if (!confirm("Wirklich alle Kacheln löschen?")) return;

    if (true) {
      if (type === "map") {
        const storedLayerOrder = loadLayerOrder(); 
        if (Array.isArray(storedLayerOrder)) {
          for (const layerType of storedLayerOrder) {
            console.log("calling deleteLayers ", layerType);
            await deleteLayers(layerType);
          }
        } else {
          console.warn("storedLayerOrder ist kein Array:", storedLayerOrder);
        }
        await clearOPFS();
      } else {
        await deleteLayers(type);
      }

      console.log("calling location.reload()");
      // location.reload();
      // TODO
      // von map entfernen
      /*
      [...myLayers].forEach(entry => {
             if (entry.leafletId) {
                 removeLayerById(entry.leafletId);
             }
         });
      */
    }

    const deleteLayersFromConfig = (cfg) => {
      // console.log("deleteLayersFromConfig cfg: ", cfg);

      // Check if the configuration and tilesMap exist and if tilesMap is a Map
      if (!cfg || !(cfg.tilesMap instanceof Map)) {
        console.warn("Konfiguration fehlt oder 'tilesMap' ist keine Map:", cfg);
        return;
      }

      // Iterate over the values (which are ARRAYS of layer objects) in the tilesMap
      cfg.tilesMap.forEach((layerArray) => {
        // Check if layerArray is actually an array
        if (Array.isArray(layerArray)) {
          // Now, iterate over each layer object inside the array
          layerArray.forEach((layerObject) => {
            // console.log("Processing layer object: ", layerObject);
            // Check if the layer object and its leafletId exist before removing
            if (layerObject && layerObject.leaflet_id) {
              // <-- NOTE: your log shows 'leaflet_id', not 'leafletId'
              removeLayerById(layerObject.leaflet_id);
              // console.log("Layer entfernt:", layerObject.leaflet_id);
            } else {
              console.warn("Layer-Objekt oder leaflet_id fehlt:", layerObject);
            }
          });
        }
      });

      // Optionally, clear the tilesMap after removing the layers from the map
      cfg.tilesMap.clear();
    };


    if (type === "map" && typeof sidepanel?.configs === "object") {     
      Object.values(sidepanel.configs).forEach(deleteLayersFromConfig);
      console.log("Alle Layer aus allen Konfigurationen entfernt.");

      if (sidepanel.isVisible()) {
        sidepanel.hide();
      }
    } else if (sidepanel?.configs?.[type]) {
      deleteLayersFromConfig(sidepanel.configs[type]);
      console.log(`Alle Layer für den Typ "${type}" entfernt.`);

      if (sidepanel.isVisible()) {
        sidepanel.showData(type);
      }
    } else {
      console.warn(`Keine Konfiguration für den Typ "${type}" gefunden.`);
    }

    // TODO Daten sidepanel aktualisieren !!!
  }
  
  global.makeMenuEntry = function (
    type,
    _mode,
    _array,
    _visible,
    html,
    href,
    toggle,
    onClick,
    onUnpress,
    layersCounterFn,
    extraClass,
    config = {}
  ) {
    if (true) {
      // 1. Get the div element by its ID
      const hiddenDiv = document.getElementById("hiddenDataDiv");

      if (hiddenDiv !== null) {
        // 2. Access the data-matrix-menue attribute using the dataset property
        //    The attribute data-matrix-menue becomes hiddenDiv.dataset.matrixMenue
        const matrixMenueString = hiddenDiv.dataset.matrixMenue;

        // 3. Convert the string value to a boolean
        const isMatrixMenueEnabled = matrixMenueString === "true";

        if (isMatrixMenueEnabled) {
          console.log("isMatrixMenueEnabled: ", isMatrixMenueEnabled); // This will output true or false
          makeMatrixMenuEntry(
            type,
            _mode,
            _array,
            _visible,
            html,
            href,
            toggle,
            onClick,
            onUnpress,
            layersCounterFn,
            extraClass,
            config
          );

          return;
        }
      }
    }
    //if (isMobile()) {
    // if (window.innerWidth < 1280) {
    if (window.innerWidth <= 1024) {
      //makeMatrixMenuEntry(
      makeHamburgerMenuEntry(
        type,
        _mode,
        _array,
        _visible,
        html,
        href,
        toggle,
        onClick,
        onUnpress,
        layersCounterFn,
        extraClass,
        config
      );
      return;
    }
  
    config = {
      isActive: true, 
      hasTiles: true, 
      hasSettings: true,
      hasInfo: true, 
      ...config, // Überschreibe Standardwerte mit übergebenen Konfig-Werten
    };
   
    let nav = document.querySelector("nav");
    if (!nav) {
      nav = document.createElement("nav");
      document.body.insertBefore(nav, document.body.firstChild); // Füge nav vor dem body-Inhalt ein
    }

    nav.classList.add("isNotMobile"); // Füge Klasse für Desktop-Ansicht hinzu
   
    let ul = nav.querySelector("ul");
    if (!ul) {
      ul = document.createElement("ul");
      nav.appendChild(ul);
    }

    const li = document.createElement("li");
    li.classList.add("dropdown");

    
    const a = document.createElement("a");
    a.href = href || "javascript:void(0);"; // Standard-Link, wenn keiner angegeben
    //a.innerHTML = html + " &#x203A;"; // Füge den "Rechts-Pfeil" (›) hinzu
    a.innerHTML = html;
    a.classList.add("dropbtn"); 

    if (extraClass) a.classList.add(extraClass); 

    a._pressed = false; 
    a._onUnpress = onUnpress; 

    const toggleFn = (state) => {
      allToggleEntries.forEach((entry) => {
        const isThis = entry.type === type;
        entry.a._pressed = isThis && state; 
        entry.a.classList.toggle("active", isThis && state); 
        if (entry.li._submenu) {
          // entry.li._submenu.style.display = isThis && state ? "flex" : "none"; // Optionale Anzeige des Submenüs
        }
      });
    };

    if (toggle) {
      allToggleEntries.push({ type, toggleFn, a, li });
    }

    const submenu = document.createElement("ul");
    submenu.classList.add("submenu");
    li._submenu = submenu; 
   
    const addSubmenuButton = (label, handler) => {
      const item = document.createElement("li"); 
      const btn = document.createElement("button"); 
      btn.textContent = label;

      // Nur auf Geräten ohne Hover (Touch) mit Klick arbeiten
      if (window.matchMedia("(hover: none)").matches) {
      } else {
        // console.log("Gerät mit hover");
        // Event-Listener für Hover-Effekt.
        btn.addEventListener(
          "mouseenter",
          () => (btn.style.background = "#f0f0f0")
        );
        btn.addEventListener(
          "mouseleave",
          () => (btn.style.background = "transparent")
        );
      }
     
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); 
        handler(); 

        // Nur auf Geräten ohne Hover (Touch) mit Klick arbeiten
        if (window.matchMedia("(hover: none)").matches) {
          const parentLi = btn.closest("li.dropdown");
          if (parentLi._submenu) {
            parentLi._submenu.style.display = "none";
          }
        } else {
          // Menü ausblenden und Hover-Effekt entfernen.
          // Die 'pointerEvents'-Manipulation ist ein Workaround, um den Hover-Zustand zu beenden.
          const parentLi = btn.closest("li.dropdown");
          //console.log("parentLi: ", parentLi);
          if (parentLi) {
            // parentLi.classList.remove("open"); // Nur wenn eine '.open'-Klasse verwendet wird
            parentLi.style.pointerEvents = "none"; // Temporär Pointer-Events deaktivieren
            setTimeout(() => {
              parentLi.style.pointerEvents = ""; // Pointer-Events wieder aktivieren
            }, 100); // Kurze Verzögerung, damit das Submenü verschwinden kann
          }
        }
      });
      item.appendChild(btn);
      submenu.appendChild(item);

      return btn; 
    };

    // TODO: 'visibility' hier ist eine lokale Variable und wird nicht korrekt verwendet.
    // Die tatsächliche Sichtbarkeit sollte über `_visible` (den Parameter)
    // oder, falls `layerControl` vorhanden, über `window.layerVisibilityState[type]` gesteuert werden.
    // Initialisiere den Sichtbarkeitsstatus für `layerControl` (falls vorhanden).
    if (typeof layerControl !== "undefined") {
      if (window.layerVisibilityState[type] === undefined) {
        window.layerVisibilityState[type] = true; // Standardmäßig sichtbar setzen
      }
    }
    
    if (config.hasTiles) {
      let label = "Kacheln (Anzeigen/Info/Löschen)";

      const tileButton = addSubmenuButton(label, () => {
        // Nur auf Geräten ohne Hover (Touch) mit Klick arbeiten
        if (window.matchMedia("(hover: none)").matches) {
          a._pressed = true;
          a.classList.add("active");

          modeManager.set(_mode, type); 
          if (type !== "map") {           
            map.getContainer().style.cursor =
              "url('assets/MapMarker_Board_Blue.png') 9 16,auto";
          } else {           
            map.getContainer().style.cursor = "pointer";
          }
        } else {
          a.click();
          // Optional: close the submenu immediately after
          const parentLi = tileButton.closest("li.dropdown");
          if (parentLi) {
            parentLi.style.pointerEvents = "none";
            setTimeout(() => {
              parentLi.style.pointerEvents = "";
            }, 100);
          }
        }
      });
    }

    // Sichtbarkeit-Button
    if (config.hasTiles) {
      const updateButtonState = (button, isVisible) => {
        const icon = isVisible
          ? "assets/eye-solid-full.svg"
          : "assets/eye-slash-solid-full.svg";
        const altText = isVisible ? "Sichtbar" : "Unsichtbar";
        const label = isVisible ? "Sichtbarkeit" : "Sichtbarkeit: unsichtbar";

        button.innerHTML = `<img src="${icon}" alt="${altText}" style="width: 1em; height: 1em; vertical-align: middle;"> ${label}`;
      };

      const eyeButton = addSubmenuButton(`Sichtbarkeit...`, () => {
        // 1. Toggle the visual pane element.
        const currentVisibilityState = togglePaneVisibility(map, type);

        if (false) {
          let currentVisibilityState;

          // 2. Determine the new state, prioritizing the `layerControl` logic.
          if (typeof layerControl !== "undefined") {            
            window.layerVisibilityState[type] =
              !window.layerVisibilityState[type];
            currentVisibilityState = window.layerVisibilityState[type];

            console.log(
              `layerControl has toggled visibility for ${type}:`,
              currentVisibilityState
            );
            layersCounterFn(); 

            const selectAllCheckbox =
              document.getElementById("select-all-tiles");
            if (selectAllCheckbox) {
              selectAllCheckbox.checked = currentVisibilityState;
              selectAllCheckbox.dispatchEvent(
                new Event("change", { bubbles: true })
              );
            }
          } else {
            // Fallback logic if `layerControl` is not defined.
            _visible = !_visible; // Toggle the passed-in state.
            currentVisibilityState = _visible;

            // Apply visibility changes to layers.
            currentVisibilityState ? showLayers(_array) : hideLayers(_array);
          }
        }

        // 3. Update the button's UI in one central place.
        updateButtonState(eyeButton, currentVisibilityState);
      });

      // Set the initial state of the button when it's first created.
      const initialVisibility =
        typeof layerControl !== "undefined"
          ? window.layerVisibilityState[type]
          : _visible;

      updateButtonState(eyeButton, initialVisibility);
    }

    // Konfiguration-Button
    if (config.hasSettings) {
      //addSubmenuButton("⚙️ Konfiguration", () => {
      addSubmenuButton("Konfiguration", () => {
        if (
          typeof sidepanel !== "undefined" &&
          typeof sidepanel.showOptions === "function"
        ) {
          sidepanel.showOptions(type);
        }
      });
    }

    // Daten-Button
    if (config.hasTiles) {
      //addSubmenuButton("🔳 Daten", () => {
      addSubmenuButton("Kachelübersicht", () => {
        if (
          typeof sidepanel !== "undefined" &&
          typeof sidepanel.showData === "function"
        ) {
          sidepanel.showData(type);
        }
      });
    }

    // Löschen-Button
    const deleteText = type === "map" ? "" : `${html} `; // Text für den Löschen-Button
    //addSubmenuButton(`🗑️ Alle yyy ${deleteText}Kacheln löschen`, () => {
    addSubmenuButton(`Alle Kacheln ${deleteText} löschen`, () => {
      deleteAllLayers(config, type);
    });

    addSubmenuButton(`Hilfe`, () => {
      sidepanel.showHelpHtml(type);
    });

    a.addEventListener("click", function (e) {
      e.preventDefault();

      deactivateElevationButtons();

      // Schließt (falls implementiert) alle anderen Submenüs.
      // Achtung: Derzeit wird keine Klasse wie "show" verwendet, daher hat dieser Block keinen Effekt,
      // es sei denn, die CSS/JS-Logik für "show" wird reaktiviert.
      document.querySelectorAll(".submenu").forEach((sub) => {
        // sub.classList.remove("show");
      });

      if (true) {
        const isTouchDevice = window.matchMedia("(hover: none)").matches;
        const currentLi = this.closest("li.dropdown");
        const currentSubmenu = currentLi ? currentLi._submenu : null;

        if (isTouchDevice) {
          // If on a touch device, explicitly toggle the submenu display
          if (currentSubmenu) {
            // Hide all other submenus first
            document.querySelectorAll("nav ul .submenu").forEach((sub) => {
              if (sub !== currentSubmenu) {
                sub.style.display = "none"; // Ensure others are hidden
              }
            });

            // Toggle visibility of the current submenu
            if (currentSubmenu.style.display === "flex") {
              currentSubmenu.style.display = "none"; // Hide if already visible
            } else {
              currentSubmenu.style.display = "flex"; // Show if hidden
            }
          }
        } else {
          // For hover devices, ensure submenus are hidden if clicked, unless CSS handles it
          // The commented out `sub.classList.remove("show")` suggests a CSS class was used.
          // If you rely solely on hover CSS for desktop, this block might be less critical.
          document.querySelectorAll(".submenu").forEach((sub) => {
            // sub.classList.remove("show"); // Re-add this if you use a 'show' class
            // sub.style.display = 'none'; // Or explicitly hide if not using a class for hover
          });
        }
      }

      // Logik für Toggle-Menüeinträge (aktiv/inaktiv)
      if (toggle) {
        if (a._pressed) {
          a._pressed = false;
          a.classList.remove("active"); 

          modeManager.set(MODE_NONE, ""); 
          map.getContainer().style.cursor = "pointer"; 

          if (a._onUnpress) a._onUnpress.call(a, e);
        } else {
          // Nicht gedrückt -> Aktivieren und andere deaktivieren

          if (sidepanel.isVisibleWithData()) {
            console.log("toggle sidepanel.isVisibleWithData");
            sidepanel.showData(type);
          } else if (sidepanel.isVisibleWithOptions()) {
            console.log("toggle sidepanel.isVisibleWithOptions");
            sidepanel.showOptions(type);
          }

          allToggleEntries.forEach((entry) => {
            if (entry.type !== type) entry.toggleFn(false); 
          });

          a._pressed = true; 
          a.classList.add("active"); 

          modeManager.set(_mode, type); 
          if (type !== "map") {
            // Setze spezifischen Cursor für Nicht-Karten-Modi.
            map.getContainer().style.cursor =
              "url('assets/MapMarker_Board_Blue.png') 9 16,auto";
          } else {
            // Setze Standard-Cursor für den Karten-Modus.
            map.getContainer().style.cursor = "pointer";
          }
          onClick.call(a, e); // Rufe die Click-Funktion auf
        }
      } else {
        // Für Nicht-Toggle-Buttons: einfach Click-Handler auslösen.
        onClick.call(a, e);
      }
    });

    li.appendChild(a);
    li.appendChild(submenu);
    ul.appendChild(li);
    return a; 
  };
  
  // do not delete !!!
  // matrix menu
  global.makeMatrixMenuEntry = function (
    type,
    _mode,
    _array,
    _visible,
    html,
    href,
    toggle,
    onClick,
    onUnpress,
    layersCounterFn,
    extraClass,
    config = {}
  ) {   
    config = {
      isActive: true,
      hasTiles: true,
      hasSettings: true,
      hasInfo: true,
      ...config,
    };
   
    let nav = document.querySelector("nav");
    if (!nav) {
      nav = document.createElement("nav");
      document.body.insertBefore(nav, document.body.firstChild);
    }
    nav.classList.add("isMobile"); 

    let mainUl = nav.querySelector("ul.main");
    if (!mainUl) {
      mainUl = document.createElement("ul");
      mainUl.classList.add("main");
      nav.appendChild(mainUl);
    }

    let darstellungLi = mainUl.querySelector("li.darstellung-parent");
    let darstellungBtn;
    let darstellungUl;

    if (!darstellungLi) {
      darstellungLi = document.createElement("li");
      darstellungLi.classList.add("darstellung-parent");

      darstellungBtn = document.createElement("a");
      darstellungBtn.id = "btnDarstellung";
      darstellungBtn.href = "#";
      darstellungBtn.classList.add("dropbtn");
      darstellungBtn.textContent = "Darstellung >"; // Initial text
      darstellungLi.appendChild(darstellungBtn);

      darstellungUl = document.createElement("ul");
      darstellungUl.classList.add("darstellung", "submenu");
      darstellungLi.appendChild(darstellungUl);

      mainUl.appendChild(darstellungLi);

      // Verhalten für "Darstellung"-Button festlegen.
      darstellungBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const aktionenUl = mainUl.querySelector("ul.aktionen");
        const isVisible = darstellungUl.style.display === "block";
        darstellungUl.style.display = isVisible ? "none" : "block"; 
        if (aktionenUl) aktionenUl.style.display = "none"; 
       
        darstellungBtn.classList.toggle("is-open", !isVisible);
        
        const currentAktionenBtn = document.getElementById("btnAktionen");
        if (currentAktionenBtn) currentAktionenBtn.classList.remove("is-open");
      });
    } else {      
      darstellungBtn = darstellungLi.querySelector("#btnDarstellung");
      darstellungUl = darstellungLi.querySelector("ul.darstellung");
    }

    
    let aktionenLi = mainUl.querySelector("li.aktionen-parent");
    let aktionenBtn;
    let aktionenUl;

    if (!aktionenLi) {
      aktionenLi = document.createElement("li");
      aktionenLi.classList.add("aktionen-parent");

      aktionenBtn = document.createElement("a");
      aktionenBtn.id = "btnAktionen";
      aktionenBtn.href = "#";
      aktionenBtn.classList.add("dropbtn");
      aktionenBtn.textContent = "Aktionen >";
      aktionenBtn.style.display = "none"; 
      aktionenLi.appendChild(aktionenBtn);

      aktionenUl = document.createElement("ul");
      aktionenUl.classList.add("aktionen", "submenu");
      aktionenLi.appendChild(aktionenUl);

      mainUl.appendChild(aktionenLi);
     
      aktionenBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const darstellungUl = mainUl.querySelector("ul.darstellung");
        const isVisible = aktionenUl.style.display === "block";
        aktionenUl.style.display = isVisible ? "none" : "block"; 
        if (darstellungUl) darstellungUl.style.display = "none"; 
        
        aktionenBtn.classList.toggle("is-open", !isVisible);
        const currentDarstellungBtn = document.getElementById("btnDarstellung");
        if (currentDarstellungBtn)
          currentDarstellungBtn.classList.remove("is-open");
      });
    } else {
      aktionenBtn = aktionenLi.querySelector("#btnAktionen");
      aktionenUl = aktionenLi.querySelector("ul.aktionen");
    }

    if (!darstellungUl.querySelector(`button[data-type="${type}"]`)) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.textContent = html;
      btn.dataset.type = type; 
      if (extraClass) btn.classList.add(extraClass);
      li.appendChild(btn);
      darstellungUl.appendChild(li);

      btn.addEventListener("click", () => {        
        darstellungUl.style.display = "none";
        darstellungBtn.classList.remove("is-open");

        if (darstellungBtn) {          
          darstellungBtn.dataset.selectedText = btn.textContent; // Store selected text
        }

        if (aktionenBtn) {
          aktionenBtn.textContent = btn.textContent + " >"; 
          aktionenBtn.style.display = "block"; 
          aktionenBtn.classList.remove("is-selected-action");
        }

        console.log(
          "btn.textContent:",
          btn.textContent,
          "| _mode:",
          _mode,
          "| type:",
          type
        );
       
        document
          .querySelectorAll("ul.darstellung button[data-type].active")
          .forEach((activeBtn) => {
            activeBtn.classList.remove("active");
          });
       
        if (aktionenBtn) aktionenBtn.classList.remove("active");

        if (toggle) {         
          if (btn._pressed) {
            btn._pressed = false;
            btn.classList.remove("active");

            if (typeof modeManager !== "undefined")
              modeManager.set(MODE_NONE, "");
            if (typeof map !== "undefined" && map.getContainer)
              map.getContainer().style.cursor = "pointer";
          } else {          
            document
              .querySelectorAll("ul.darstellung button[data-type]")
              .forEach((otherBtn) => {
                if (otherBtn !== btn && otherBtn._pressed) {
                  otherBtn._pressed = false;
                  otherBtn.classList.remove("active");
                }
              });

            btn._pressed = true;
            btn.classList.add("active");
            if (aktionenBtn) aktionenBtn.classList.add("active"); 

            if (typeof modeManager !== "undefined")
              modeManager.set(_mode, type);
            if (typeof map !== "undefined" && map.getContainer) {
              if (type !== "map") {
                map.getContainer().style.cursor =
                  "url('assets/MapMarker_Board_Blue.png') 9 16,auto";
              } else {
                map.getContainer().style.cursor = "pointer";
              }
            }
          }
        }
       
        aktionenUl.innerHTML = "";
       
        if (config.hasTiles) {
          const visLi = document.createElement("li");
          const visBtn = document.createElement("button");
          
          const initialVis =
            typeof layerControl !== "undefined" &&
            window.layerVisibilityState &&
            window.layerVisibilityState[type] !== undefined
              ? window.layerVisibilityState[type]
              : _visible;
          visBtn.innerHTML = initialVis
            ? '<img src="eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit'
            : '<img src="eye-slash-solid.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit: unsichtbar';
          visLi.appendChild(visBtn);
          aktionenUl.appendChild(visLi);
          visBtn.addEventListener("click", (event) => {
            aktionenUl.style.display = "none";
            aktionenBtn.classList.remove("is-open"); 

            if (
              typeof layerControl !== "undefined" &&
              window.layerVisibilityState
            ) {
              window.layerVisibilityState[type] =
                !window.layerVisibilityState[type];
              _visible = window.layerVisibilityState[type]; 
              if (layersCounterFn) layersCounterFn(); 
            } else {
              _visible = !_visible; 
              if (_visible) {
                if (typeof showLayers !== "undefined") showLayers(_array);
              } else {
                if (typeof hideLayers !== "undefined") hideLayers(_array);
              }
            }
            visBtn.innerHTML = _visible
              ? '<img src="eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit'
              : '<img src="eye-slash-solid.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit: unsichtbar';
          });
        }
       
        // Konfiguration-Button
        if (config.hasSettings) {
          const cfgLi = document.createElement("li");
          const cfgBtn = document.createElement("button");
          cfgBtn.textContent = "⚙️ Konfiguration";
          cfgLi.appendChild(cfgBtn);
          aktionenUl.appendChild(cfgLi);
          cfgBtn.addEventListener("click", (event) => {           
            aktionenUl.style.display = "none";
            aktionenBtn.classList.remove("is-open"); 

            if (false && aktionenBtn && darstellungBtn.dataset.selectedText) {
              aktionenBtn.textContent = `${darstellungBtn.dataset.selectedText}: ${event.currentTarget.textContent}`;
              aktionenBtn.classList.add("is-selected-action");
            }

            if (typeof sidepanel !== "undefined" && sidepanel.showOptions) {
              sidepanel.showOptions(type);
            }
          });
        }

        // Daten-Button
        if (config.hasTiles) {
          const dataLi = document.createElement("li");
          const dataBtn = document.createElement("button");
          dataBtn.textContent = "🔳 Daten";
          dataLi.appendChild(dataBtn);
          aktionenUl.appendChild(dataLi);
          dataBtn.addEventListener("click", (event) => {            
            aktionenUl.style.display = "none";
            aktionenBtn.classList.remove("is-open"); 

            if (typeof sidepanel !== "undefined" && sidepanel.showData) {
              sidepanel.showData(type);
            }
          });
        }

        // Löschen-Button
        const delLi = document.createElement("li");
        const delBtn = document.createElement("button");
        let label;
        if (type === "map") {
          label = "Kacheln";
        } else {
          label = `Kacheln ${html}`;
        }
        delBtn.textContent = `🗑️ Alle ${label.trim()} löschen`; 
        delLi.appendChild(delBtn);
        aktionenUl.appendChild(delLi);
        delBtn.addEventListener("click", (event) => {
          aktionenUl.style.display = "none";
          aktionenBtn.classList.remove("is-open"); 

          if (typeof deleteAllLayers !== "undefined") {
            deleteAllLayers(config, type);
          }
        });
      });
    }

    // Anfänglich beide Submenüs ausblenden (important if the function is called multiple times or on page load)
    if (darstellungUl) darstellungUl.style.display = "none";
    if (aktionenUl) aktionenUl.style.display = "none";

    // Gibt null zurück, da die Elemente direkt ins DOM eingefügt werden.
    return null; 
  };

  global.makeHamburgerMenuEntry = function (
    type,
    _mode,
    _array,
    _visible,
    html,
    href,
    toggle,
    onClick,
    onUnpress,
    layersCounterFn,
    extraClass,
    config = {}
  ) {
    config = {
      isActive: true,
      hasTiles: true,
      hasSettings: true,
      hasInfo: true,
      ...config,
    };
    
    let nav = document.querySelector("nav");
    if (!nav) {
      nav = document.createElement("nav");
      document.body.insertBefore(nav, document.body.firstChild);
    }
    nav.classList.add("mobile-nav");   
   
    let panel = document.getElementById("hamburger-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "hamburger-panel";      
      panel.style.display = "none"; // !!!
      document.body.insertBefore(panel, nav.nextSibling);

      const content = document.createElement("div");
      content.id = "hamburger-content";     
      panel.appendChild(content);
    }
   
    if (!document.getElementById("hamburger-toggle")) {
      const hamburgerIcon = document.createElement("div");
      hamburgerIcon.id = "hamburger-toggle";
      hamburgerIcon.innerHTML = "&#9776;";     

      hamburgerIcon.addEventListener("click", () => {
        const panel = document.getElementById("hamburger-panel");
        if (!panel) return;
        panel.style.display = panel.style.display === "none" ? "block" : "none";
      });

      nav.appendChild(hamburgerIcon);
    }

    const container = document.getElementById("hamburger-content");
    if (!container) {
      console.error("Hamburger content container not found.");
      return;
    }

    if (!document.getElementById("status-info")) {
      const statusInfo = document.createElement("span");
      statusInfo.id = "status-info";
      statusInfo.classList.add("nav-status-info");
      statusInfo.textContent = "Status";      
      nav.appendChild(statusInfo);
    }

    if (!document.getElementById("info-button")) {
      const infoBtn = document.createElement("button");

      infoBtn.id = "info-button";
      infoBtn.textContent = "Info";
      infoBtn.classList.add("nav-green-btn");      

      infoBtn.addEventListener("click", () => {
        document
          .querySelectorAll(".nav-green-btn")
          .forEach((btn) => btn.classList.remove("nav-green-btn"));       
       
        if (typeof modeManager !== "undefined") {
          modeManager.set(MODE_NONE, "");
        }
       
        infoBtn.style.display = "none";

        map.getContainer().style.cursor = "pointer";
      });

      nav.appendChild(infoBtn);
    }
   
    const hamburgerMainBtn = document.createElement("button");
    hamburgerMainBtn.classList.add("hamburger-menu-main-button");
    if (extraClass) hamburgerMainBtn.classList.add(extraClass);
   
    const btnContent = document.createElement("span");
    btnContent.textContent = html;

    const arrow = document.createElement("span");
    // arrow.textContent = " +"; 
    // arrow.style.float = "right";
    // arrow.style.marginLeft = "10px";
    // arrow.textContent = "▶"; 
    arrow.textContent = "▷"; 
    arrow.style.float = "left";
    arrow.style.marginRight = "10px";

    hamburgerMainBtn.appendChild(arrow);    
    hamburgerMainBtn.appendChild(btnContent);

    hamburgerMainBtn.classList.add(type);
   
    const submenu = document.createElement("div");
    submenu.classList.add("hamburgerSubmenu");
    submenu.style.display = "none";
    
    const toggleFn = (state) => {
      return;      
    };

    if (toggle) {
      allToggleEntries.push({ type, toggleFn, a: hamburgerMainBtn });
    }
   
    let dddrawButton;

    hamburgerMainBtn.addEventListener("click", (e) => {
      e.preventDefault();   

      const currentSubmenu = submenu;
      const currentArrow = arrow; 
      const isAboutToBeVisible = currentSubmenu.style.display === "none";

      // 1. Collapse all other submenus and reset their arrows
      document
        .querySelectorAll(".hamburger-menu-main-button")
        .forEach((otherMainBtn) => {
         
          if (otherMainBtn !== hamburgerMainBtn) {
            const otherSubmenu = otherMainBtn.nextElementSibling; 
            // const otherArrow = otherMainBtn.lastElementChild; 
            const otherArrow = otherMainBtn.firstElementChild; 

            if (otherSubmenu && otherArrow) {
              if (otherSubmenu.style.display !== "none") {
                otherSubmenu.style.display = "none";
                // otherArrow.textContent = " +";
                // otherArrow.textContent = "▶"; 
                otherArrow.textContent = "▷"; 
              }
            }
          }
        });

      // 2. Toggle the clicked button's submenu and update its arrow
      currentSubmenu.style.display = isAboutToBeVisible ? "flex" : "none";
      // currentArrow.textContent = isAboutToBeVisible ? " -" : " +";
      // currentArrow.textContent = isAboutToBeVisible ? "▼" : "▶"; 
      currentArrow.textContent = isAboutToBeVisible ? "▽" : "▷"; 

      console.log("toggle: ", toggle);
      if (toggle) {            
        if (hamburgerMainBtn.classList.contains("active")) {
          console.log("contains active");
          // mainBtn.classList.remove("active");
          // onUnpress?.call(mainBtn, e);
          // modeManager.set(MODE_NONE, "");
          // document.getElementById("info-button").style.display = "none";
        } else {
          console.log("contains not active");
          // allToggleEntries.forEach((entry) => entry.toggleFn(false));
          // mainBtn.classList.add("active");
          // modeManager.set(_mode, type);
          // onClick?.call(mainBtn, e);
          // document.getElementById("info-button").textContent = html;
          // document.getElementById("info-button").style.display = "inline-block";
        }
      } else {
        console.log("calling hamburgerMainBtn: ", hamburgerMainBtn, e);
        onClick?.call(hamburgerMainBtn, e);
      }

      // neu xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      if (true) {
        if (true) {
          if (sidepanel.isVisibleWithData()) {
            console.log("sidepanel.isVisibleWithData");
            sidepanel?.showData?.(type);
          }
          if (sidepanel.isVisibleWithOptions()) {
            console.log("sidepanel.isVisibleWithOptions");
            sidepanel?.showOptions?.(type);
          }
        }
        if (false) {
          if (hamburgerMainBtn.classList.contains("nav-green-btn")) {
            hamburgerMainBtn.classList.remove("nav-green-btn");
          } else {
            document
              .querySelectorAll(".nav-green-btn")
              .forEach((otherMainBtn) => {
                otherMainBtn.classList.remove("nav-green-btn");
              });
            hamburgerMainBtn.classList.add("nav-green-btn");

            if (dddrawButton) {
              dddrawButton.click(); // Dispatch click to the "draw" button
            }
          }
        }
      }

    });
  
    container.appendChild(hamburgerMainBtn);
    container.appendChild(submenu);
 
    function addSubBtn(label, type, handler) {
      const btn = document.createElement("button");

      btn.classList.add(type);
      btn.classList.add("hamburgerSubmenuBtn");

      btn.textContent = label;
    
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handler();
        // submenu soll geöffnet bleiben, daher auskommentiert
        // submenu.style.display = "none";
        document.getElementById("hamburger-panel").style.display = "none";
      });
      submenu.appendChild(btn);
      return btn;
    }

    // Zeichnen
    if (type !== "map") {
      // let text = "Kacheln";
      let text = "Kacheln (Anzeigen/Info/Löschen)";

      const drawButton = addSubBtn(text, type, (e) => {
        document.getElementById("status-info").textContent = html;

        document.getElementById("info-button").textContent = html;

        if (toggle) {
          if (drawButton.classList.contains("nav-green-btn")) {
            // drawButton.textContent = "Kacheln";
            drawButton.textContent = "Kacheln (Anzeigen/Info/Löschen)";
            drawButton.classList.remove("nav-green-btn");
            onUnpress?.call(drawButton, e);
            modeManager.set(MODE_NONE, "");
            document.getElementById("info-button").style.display = "none";

            document.getElementById("status-info").style.display = "none";

            map.getContainer().style.cursor = "pointer";
          } else {
            if (true) {
              document.querySelectorAll(".nav-green-btn").forEach((btn) => {
                btn.classList.remove("nav-green-btn");
              });
            }

            // drawButton.textContent = "Kacheln";
            drawButton.textContent = "Kacheln (Anzeigen/Info/Löschen)";
            allToggleEntries.forEach((entry) => entry.toggleFn(false));
            drawButton.classList.add("nav-green-btn");
            modeManager.set(_mode, type);
            onClick?.call(drawButton, e);
            document.getElementById("info-button").textContent =
              "Kacheln " + html;

            document.getElementById("info-button").classList.add(type);
            document
              .getElementById("info-button")
              .classList.add("nav-green-btn");

            document.getElementById("status-info").style.display = "block"; // or "inline", "flex", etc

            if (true) {
              if (type !== "map") {
                map.getContainer().style.cursor =
                  "url('assets/MapMarker_Board_Blue.png') 9 16,auto";
              } else {
                map.getContainer().style.cursor = "pointer";
              }

              deactivateElevationButtons();
            }
          }
        } else {
          onClick?.call(hamburgerMainBtn, e);
        }
      });
      dddrawButton = drawButton;
    }

    // Visibility toggle
    // Sichtbarkeit
    // TODO prüfen !!!
    if (config.hasTiles) {
      const eyeButton = addSubBtn("Sichtbarkeit", type, () => {
        // 1. Toggle the visual pane element.
        const visible = togglePaneVisibility(map, type);

        eyeButton.innerHTML = visible
          ? '<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit'
          : '<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit';
      });
      // Set the initial innerHTML of the eyeButton to show the full eye icon.
      eyeButton.innerHTML =
        '<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;"> Sichtbarkeit';
    }

    if (config.hasSettings) {
      // addSubBtn("⚙️ Konfiguration", type, () => {
      addSubBtn("Konfiguration", type, () => {
        sidepanel?.showOptions?.(type);
      });
    }

    if (config.hasTiles) {
      // addSubBtn("🔳 Daten", type, () => {
      // addSubBtn("Daten", type, () => {
      addSubBtn("Kachelübersicht", type, () => {
        sidepanel?.showData?.(type);
      });
    }

    if (true) {
      let label = type === "map" ? "" : `${html} `;
      if (type === "map") {
        label = "Kacheln";
      } else if (type === "customdata") {
        label = "eigenen Objekte";
      } else {
        label = `Kacheln ${html} `;
      }
      // addSubBtn(`🗑️ Alle ${label} löschen`, type, () => {
      addSubBtn(`Alle ${label} löschen`, type, () => {
        deleteAllLayers(config, type);
      });
    }

    addSubBtn(`Hilfe`, type, () => {
      sidepanel.showHelpHtml(type);
    });

    return hamburgerMainBtn;
  };
  
  global.updateMenuEntryFromRadio = function (type, state) {
    const entry = allToggleEntries.find((e) => e.type === type);
    if (entry) {
      //console.log("Rufe nun entry.toggleFn(state) auf, Eintrag:", JSON.stringify(entry, null, 2), "Status:", state);
      entry.toggleFn(state); // Ruft die Toggle-Funktion des Menüeintrags auf
    }
  };
})(window);

(function (global) {
  const btns = []; 
  const all_toggle_buttons = []; 

  global.makeBtn = function (html, title, toggle, onClick, onUnpress, cl) {   
    const btn = L.DomUtil.create("a");
    btn.href = "#"; // Verhindert Scrollen
    btn.type = "button"; // Sicherstellen, dass es kein Formular absendet
    btn.className = "leaflet-bar-part"; // Grundlegender Leaflet-Button-Stil
    if (cl) {
      L.DomUtil.addClass(btn, cl); 
    }
    btn.innerHTML = html;
    btn.title = title;

    btns.push(btn);
    if (toggle) {
      btn._pressed = false; 
      btn._onUnpress = onUnpress; 
      all_toggle_buttons.push(btn);
    }
    
    L.DomEvent.on(btn, "click", function (e) {
      L.DomEvent.stop(e); // Verhindert, dass das Event zur Karte bubbelt (verhindert Panning/Zoomen)
      if (toggle) {
        if (btn._pressed) {
          btn._pressed = false;
          L.DomUtil.removeClass(btn, "pressed"); 
          if (onUnpress) {
            onUnpress.call(btn, e);
          }
        } else {
          all_toggle_buttons.forEach(function (other) {
            if (other !== btn && other._pressed) {
              other._pressed = false;
              L.DomUtil.removeClass(other, "pressed");
              if (other._onUnpress) {
                other._onUnpress();
              }
            }
          });
          btn._pressed = true;
          L.DomUtil.addClass(btn, "pressed"); 
          onClick.call(btn, e);
        }
      } else {
        onClick.call(btn, e);
      }
    });

    return btn;
  };
})(window);

(function (global) { 
  global.createLoadingSpinner = function () {
    // Verhindert doppelte Spinner
    if (document.getElementById("loading-spinner")) return;

    const spinnerWrapper = document.createElement("div");
    spinnerWrapper.id = "loading-spinner";
    spinnerWrapper.className = "loading-spinner hidden";

    spinnerWrapper.innerHTML = `
      <div class="spinner"></div>
      <!--
      <div class="loading-text">Loading ...</div>
      -->
    `;

    document.body.appendChild(spinnerWrapper);
  };

  global.showLoadingSpinner = function () {
    const el = document.getElementById("loading-spinner");
    if (el) el.classList.remove("hidden");
  };

  global.hideLoadingSpinner = function () {
    const el = document.getElementById("loading-spinner");
    if (el) el.classList.add("hidden");
  };
})(window);

let idCounter = 0; 

function getUniqueIdSuffix() {
  return "_" + ++idCounter;
}

function makeSlider(
  id,
  idSuffix,
  label,
  value,
  min,
  max,
  step,
  decimals = 1,
  unit = ""
) {
  const fullId = id + idSuffix;

  const displayValue =
    decimals === 0 ? Math.round(value) : Number(value).toFixed(decimals);

  // if (window.isMobile()) {
  // if (window.innerWidth < 1280) {
  if (window.innerWidth <= 1024) {
    return `
      <label style="display: flex; align-items: center; gap: 8px;">
        <span>${label}:</span>
        <span id="${fullId}-value">${displayValue}</span>${unit}
      </label>
      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="text" id="${fullId}-number"
               inputmode="decimal"
               pattern="[0-9]*[.,]?[0-9]*"
               min="${min}" max="${max}" step="${step}"
               value="${displayValue}" style="width: 70px;" />
      </div>
    `;
  } else {
    return `
      <label style="display: flex; align-items: center; gap: 8px;">
        <span>${label}:</span>
        <span id="${fullId}-value">${displayValue}</span>${unit}
      </label>
      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="range" id="${fullId}"
               min="${min}" max="${max}" step="${step}"
               value="${value}" style="flex: 1;" />
      </div>
    `;
  }
}

function bindSlider(
  id,
  idSuffix,
  optionKey,
  fetchRequiredRef,
  isFetchRequired,
  displayPrecision = 1,
  toNumber = parseFloat,
  //optionsArray = contour_options_last,
  optionsArray,
  saveSettingsFn,
  redrawFn = null
) {
  const fullId = id + idSuffix;
  const slider = document.getElementById(fullId);
  const numberInput = document.getElementById(`${fullId}-number`);
  const valueSpan = document.getElementById(`${fullId}-value`);

  if (!valueSpan) {
    console.warn(`Label/Value für ID '${fullId}' nicht gefunden`);
    return;
  }

  // NEU: Lese min/max aus dem verfügbaren Input-Element
  const inputElement = slider || numberInput;
  if (!inputElement) {
      console.warn(`No input element found for ID '${fullId}'`);
      return;
  }
  const minVal = parseFloat(inputElement.min);
  const maxVal = parseFloat(inputElement.max);

  // console.log("bindSlider minVal/maxVal: ", minVal, maxVal);
  // ENDE NEU

  const updateValue = (value, triggerRedraw = false, formatNumber = true) => {
    let num = toNumber(value);
    if (!isNaN(num)) {

      // NEU: Begrenze den Wert (Clamping)
      if (!isNaN(minVal) && num < minVal) {
          num = minVal;
      }
      if (!isNaN(maxVal) && num > maxVal) {
          num = maxVal;
      }
      // ENDE NEU

      valueSpan.textContent = num.toFixed(displayPrecision);
      if (slider) 
        slider.value = num;

      if (numberInput) {
        numberInput.value = formatNumber
          ? num.toFixed(displayPrecision)
          : value;
      }

      // console.log("bindSlider updateValue num: ", num, optionKey); 

      optionsArray[optionKey] = num;
      saveSettingsFn?.();

      if (triggerRedraw && redrawFn) {
        console.log("bindSlider updateValue calling redrawFn()", num, optionKey);
        redrawFn();
      }
    }
  };

 
  if (slider) 
    updateValue(slider.value);
  else 
    if (numberInput) 
      updateValue(numberInput.value);

  if (slider) {
    // Use the 'change' event to fire only when the user releases the slider
    slider.addEventListener("change", (e) => {
      updateValue(e.target.value, true); // slider always redraws
      if (isFetchRequired) fetchRequiredRef.value = true;
    });

    // Optional: If you still want the label to update live while dragging,
    // you can add the 'input' event listener just for that.
    slider.addEventListener("input", (e) => {
      const num = toNumber(e.target.value);
      if (!isNaN(num)) {
        valueSpan.textContent = num.toFixed(displayPrecision);
        if (numberInput) {
          numberInput.value = num.toFixed(displayPrecision);
        }
      }
    });
  }
 
  if (numberInput) {
    // While typing → update label only (no redraw)
    numberInput.addEventListener("input", (e) => {
      const val = e.target.value.replace(/[^0-9.,-]/g, "");
      e.target.value = val;
      updateValue(val, false, false); // label updated, no redraw
    });

    // On blur → finalize + redraw
    numberInput.addEventListener("blur", (e) => {
      const num = parseFloat(e.target.value.replace(",", "."));
      if (!isNaN(num)) {
        updateValue(num, true, true); // format + redraw
        if (isFetchRequired) fetchRequiredRef.value = true;
      }
    });

    // Enter key = same as blur
    numberInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        numberInput.blur(); // triggers blur handler
      }
    });
  }
}

function updateInputAndLabel(id, idSuffix, value) {
  const fullId = id + idSuffix;
  const fullIdOfInput = id + idSuffix + "-number";
  const fullIdOfValue = id + idSuffix + "-value";

  const input = document.getElementById(fullIdOfInput);
  const label = document.getElementById(fullIdOfValue);

  if (input) input.value = value;
  else {
    // if (isMobile()) {
    // if (window.innerWidth < 1280) {
    if (window.innerWidth <= 1024) {
      console.warn(
        "Input-Element nicht gefunden, fullIdOfInput:",
        fullIdOfInput
      );
    }
  }
  if (label) label.textContent = value;
  else
    console.warn("Label-Element nicht gefunden, fullIdOfValue:", fullIdOfValue);
}


function suppressEventPropagation(selector) {
  //console.log("suppressEventPropagation selector: ", selector);
  return; // TODO was sollte das da unten? die slider bei contour_1 funktionieren damit nicht !!!
  /* kann weg
  document.querySelectorAll(selector).forEach((el) => {
    ["mousedown", "click", "wheel"].forEach((evt) =>
      el.addEventListener(evt, (e) => {
        e.stopPropagation(); // Stoppt die Event-Weitergabe
        if (evt !== "wheel") e.preventDefault(); // Verhindert Standard-Browser-Aktion, außer bei Mausrad (zum Scrollen in Overlays)
      })
    );
  });
  */
}

function buildTileInfo(entry, type) {
  return `
    <!-- <div>Kachel: ${entry.tile?.TileIndex}</div> -->
    <div>Aktualität: ${entry.tile?.Actuality ?? "N/A"}</div>
    <!-- <div>Herkunft: ${entry.tile?.Origin ?? "N/A"}</div> -->
    <div>Attribution: ${entry.tile?.Attribution ?? "N/A"}</div>    
  `;
}

function showCustomConfirm(entry, type, sameTileCount = 0, ttype = "") {
  return new Promise((resolve, reject) => {
    document.querySelector(".custom-dialog")?.remove();

    const dialog = document.createElement("div");
    dialog.className = "custom-dialog";

    const infoHtml = buildTileInfo(entry, type);

    dialog.innerHTML = `
      <div class="custom-dialog-overlay"></div>
      <div class="custom-dialog-box">
        <button class="custom-dialog-close">&times;</button>
        ${infoHtml}
        ${
          sameTileCount > 1
            ? `       
                <hr>         
                <div class="same-tile-info-line">                  
                  <!--
                  <button class="custom-dialog-details-button" onclick="sidepanel.showData('${ttype}', '${entry.TileIndex}')">🔍 Details</button>
                  -->
                  <div class="custom-dialog-actions">
                    <button class="custom-dialog-details-button">🔍 Weitere Kacheln mit dieser Position anzeigen</button>
                  </div>
                </div>`
            : ""
        }
        <hr>
        <div class="custom-dialog-actions">
          <button class="custom-dialog-config">⚙️ Konfiguration</button>
        </div>
        <hr>
        <p>Soll die <strong>${type}</strong>-Kachel gelöscht werden?</p>
        <div class="custom-dialog-actions">
          <button class="custom-dialog-confirm">🗑️ Löschen</button>
          <button class="custom-dialog-cancel">Abbrechen</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const closeDialog = () => dialog.remove();

    dialog.querySelector(".custom-dialog-confirm").onclick = () => {
      closeDialog();
      resolve();
    };

    dialog.querySelector(".custom-dialog-cancel").onclick =
      dialog.querySelector(".custom-dialog-close").onclick = () => {
        closeDialog();
        reject();
      };

    const detailsBtn = dialog.querySelector(".custom-dialog-details-button");
    if (detailsBtn) {
      detailsBtn.onclick = () => {
        closeDialog();
        sidepanel.showData(ttype, entry.TileIndex);
        reject();
      };
    } else {
      // console.warn("⚠️ Keine .custom-dialog-details-button im Dialog gefunden");
    }

    dialog.querySelector(".custom-dialog-config").onclick = () => {
      closeDialog();
      sidepanel.showOptions(ttype);
      reject();
    };
  });
}

function showCustomInfo(type, html, allFoundTiles) {
  console.log("showCustomInfo type: ", type);
  return new Promise((resolve, reject) => {
    document.querySelector(".custom-dialog")?.remove();

    const dialog = document.createElement("div");
    dialog.className = "custom-dialog";

    dialog.innerHTML = `
      <div class="custom-dialog-overlay"></div>
      <div class="custom-dialog-box">
        <button class="custom-dialog-close">&times;</button>
        <div class="custom-dialog-content">
          ${html}
        </div>
        <hr>
        <div class="custom-dialog-actions">
          <button class="custom-dialog-confirm">🗑️ Löschen</button>
          <button class="custom-dialog-cancel">Abbrechen</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const closeDialog = () => dialog.remove();
   
    dialog.querySelector(".custom-dialog-confirm").onclick = () => {
      closeDialog();
      resolve();
    };

    const cancelAction = () => {
      closeDialog();
      reject();
    };

    dialog.querySelector(".custom-dialog-cancel").onclick = cancelAction;
    dialog.querySelector(".custom-dialog-close").onclick = cancelAction;

    const detailsBtn = dialog.querySelector(".custom-dialog-details-button");
    if (detailsBtn) {
      detailsBtn.onclick = () => {
        closeDialog();
        console.log(
          "custom-dialog-details-button allFoundTiles: ",
          allFoundTiles
        );
        sidepanel.showData(type, allFoundTiles);
        // alert("Funktion noch nicht implementiert: sidepanel.showData(...");
        reject();
      };
    } else {
      // console.warn("⚠️ Keine .custom-dialog-details-button im Dialog gefunden");
    }
  });
}


function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function rgbaStringToHex(r, g, b) {
  return rgbToHex(r, g, b);
}

function hexToRgb(hex) {
  const v = parseInt(hex.replace("#", ""), 16);
  return {
    r: (v >> 16) & 255,
    g: (v >> 8) & 255,
    b: v & 255,
  };
}

function getTextColor(bgColor) {
  const color = bgColor.charAt(0) === "#" ? bgColor.substring(1, 7) : bgColor;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 125 ? "#000" : "#fff";
}

function parseColorStringToRgbaObject(colorString) {
  if (!colorString) {
    console.warn("Empty color string, defaulting to opaque black.");
    return { r: 0, g: 0, b: 0, a: 255 };
  }

  let r, g, b, a;

  let match = colorString.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
  );
  if (match) {
    r = parseInt(match[1], 10);
    g = parseInt(match[2], 10);
    b = parseInt(match[3], 10);
    // Alpha channel (index 4) might be undefined if it's an rgb() string
    a = match[4] ? Math.round(parseFloat(match[4]) * 255) : 255;
    return { r, g, b, a };
  }

  // Try parsing hex #RRGGBB or #RGB
  if (colorString.startsWith("#")) {
    const hex = colorString.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      console.warn(
        "Invalid hex color string, defaulting to opaque black:",
        colorString
      );
      return { r: 0, g: 0, b: 0, a: 255 };
    }
    return { r, g, b, a: 255 }; // Hex typically implies opaque
  }

  // Fallback for named colors or unsupported formats
  console.warn(
    "Could not parse color string, defaulting to opaque black:",
    colorString
  );
  return { r: 0, g: 0, b: 0, a: 255 };
}

function rgbaObjectToString(rgbaObj) {
  // Ensure alpha is clamped between 0 and 255 before converting to 0.0-1.0 range
  const alpha = Math.max(0, Math.min(255, rgbaObj.a));
  return `rgba(${rgbaObj.r},${rgbaObj.g},${rgbaObj.b},${(alpha / 255).toFixed(
    2
  )})`;
}

function getAlphaFromColorString(colorString) {
  const rgbaObj = parseColorStringToRgbaObject(colorString);
  return rgbaObj.a;
}



function getActiveTileLayer(map) {
  let activeTileLayer = null;

  map.eachLayer((layer) => {
    if (
      layer instanceof L.TileLayer &&
      typeof layer.setOpacity === "function"
    ) {
      activeTileLayer = layer;
    }
  });

  return activeTileLayer;
}

/*
 Die Leaflet-Standardkarte bekommt dabei den zIndex 200.
 Layer <200 werden dann unter die Standardkarte,
 und Layer >200 über die Standardkarte gezeichnet.

 Hinweise zur zIndex-Vergabe in Leaflet-Panes:
 - mapPane: Enthält alle anderen Panes, zIndex 'auto'.
 - tilePane: Für GridLayers und TileLayers, Standard zIndex 200.
 - overlayPane: Für Vektorlayer (Pfade, GeoJSON), Standard zIndex 400.
 - shadowPane: Für Marker-Schatten, typischerweise über overlayPane.
 - markerPane: Für Marker-Icons.
 - popupPane: Für Popups, immer ganz oben.

 Die hier verwendete Logik ordnet die zIndex-Werte wie folgt zu:
 - "Map" erhält 200.
 - Typen, die in `layerOrder` VOR "Map" stehen, erhalten zIndex-Werte >200 (z.B. 210, 220, ...).
   Der Layer, der in `layerOrder` am weitesten oben steht (Index 0), erhält den höchsten zIndex,
   um über allen anderen benutzerdefinierten Layern zu liegen.
 - Typen, die in `layerOrder` NACH "Map" stehen, erhalten zIndex-Werte <200 (z.B. 190, 180, ...).
   Dies positioniert sie unter der Standardkarte.
*/

/**
 * Ruft einen Leaflet-Pane ab oder erstellt ihn, falls er noch nicht existiert,
 * und weist ihm einen passenden zIndex basierend auf einer definierten Reihenfolge zu.
 * @param {L.Map} map - Das Leaflet-Kartenobjekt.
 * @param {string} type - Der Typ des Layers (z.B. "Hillshade", "Contour", "Map").
 * @returns {string} Der Name des Panes.
 */
function getOrCreatePane(map, type) {
  // console.log("getOrCreatePane called with:", { map, type });

  // TODO aufräumen !!!

  // Versucht, die Layer-Reihenfolge aus dem DOM-Element zu lesen
  // (angenommen, `window.layerOrderList` oder ein Element mit der Klasse 'layer-order-list' existiert).
  const layerOrderList =
    window.layerOrderList || document.querySelector(".layer-order-list");
  let layerOrder = [];

  if (layerOrderList) {
    // Extrahiert die Werte der Radio-Buttons aus der Reihenfolgeliste.
    layerOrder = [...layerOrderList.children]
      .map((row) => {
        const input = row.querySelector('input[type="radio"]');
        return input?.value;
      })
      .filter(Boolean); // Entfernt undefined/null Einträge
  } else {
    // Fallback-Standardreihenfolge, wenn keine UI-Reihenfolge gefunden wird.    
    layerOrder = [...defaultLayerOrder, "marker", "overlay", "tile"];
  }

  const finalOrder = loadLayerOrder();

  //console.log("finalOrder: ", finalOrder);

  // Finde den Index des aktuellen Typs in der Reihenfolge.
  const idx = finalOrder.indexOf(type); // ohne Case-Insensitive Vergleich

  let zIndex;

  if (idx === -1) {
    // Unbekannter Typ: Standardmäßig zIndex des overlayPane (400) verwenden.
    zIndex = 400;
    console.warn(
      `Typ "${type}" nicht in der definierten Layer-Reihenfolge gefunden. Standard-zIndex 400 zugewiesen.`
    );
  } else {
    const mapPos = finalOrder.indexOf("map"); // Position des "map"-Layers

    if (idx === mapPos) {
      // Wenn der Typ "map" ist, zIndex 200.
      zIndex = 200;
    } else if (idx < mapPos) {
      // Typen, die in der Liste VOR "map" stehen (sollen ÜBER "map" liegen).
      // Z-Index beginnt bei 210 und erhöht sich um 10.
      // Der Layer an Index 0 bekommt den höchsten Z-Index unterhalb des Popups, etc.
      zIndex = 210 + 10 * (mapPos - idx - 1);
    } else {
      // Typen, die in der Liste NACH "map" stehen (sollen UNTER "map" liegen).
      // Z-Index beginnt bei 190 und verringert sich um 10.
      zIndex = 190 - 10 * (idx - mapPos - 1);
    }
  }

  const paneNameMapping = {
    hillshade: "hillshadePane",
    contour: "contourPane",
    slope: "slopePane",
    aspect: "aspectPane",
    roughness: "roughnessPane",
    tpi: "tpiPane",
    tri: "triPane",
    colorRelief: "colorReliefPane",
    customdata: "customdata",
    map: "mapPane", 
    marker: "markerPane",
    overlay: "overlayPane",
    tile: "tilePane",
  };

  const name = paneNameMapping[type] || "overlayPane";
  
  let pane = map.getPane(name);
  if (!pane) {
    pane = map.createPane(name);
    pane.style.zIndex = zIndex;
    // console.log(`Pane '${name}' erstellt mit zIndex: ${zIndex}`);
  } else {
    // Wenn der Pane existiert, aber der zIndex abweicht, aktualisiere ihn.
    if (parseInt(pane.style.zIndex) !== zIndex) {
      pane.style.zIndex = zIndex;
      // console.log(`Pane '${name}' zIndex aktualisiert auf: ${zIndex}`);
    } else {
      // console.log(`Pane '${name}' existiert bereits mit zIndex: ${zIndex}`);
    }
  }

  // console.log("getOrCreatePane Name:", name );
  // console.log("getOrCreatePane Pane zIndex:", pane.style.zIndex );

  // console.log(`getOrCreatePane Name: ${name}, zIndex: ${pane.style.zIndex}`);

  // return name;
  return pane; // !!!
}

const togglePaneVisibility = (map, type) => {
  console.log("togglePaneVisibility type:", type);
  const pane = getOrCreatePane(map, type);
  console.log("togglePaneVisibility pane:", pane);
  pane.style.display = pane.style.display === "none" ? "block" : "none";
  const display = (pane.style.display === "block");
  console.log("togglePaneVisibility display: ", display);
  return display;
};

function hideLayers(array) {
  console.log("hideLayers Array: ", array);
  array.forEach((item) => {
    if (map.hasLayer(item.layer)) {
      map.removeLayer(item.layer);
      item.hidden = true; // Setze Status auf versteckt
    }
  });
}

function showLayers(array) {
  console.log("showLayers Array: ", array);
  array.forEach((item) => {
    if (!map.hasLayer(item.layer)) {
      map.addLayer(item.layer);
      item.hidden = false; // Setze Status auf sichtbar
    }
  });
}

function loadLayerOrder() {
  const stored = localStorage.getItem("layerOrder");
  const storedOrder = stored ? JSON.parse(stored) : defaultLayerOrder;

  return storedOrder;
}

let allLoaded = false; // Flag, um zu verhindern, dass alle Layer mehrmals geladen werden.

async function loadAllLayerTypes() {  
  if (!map_options_last.storeTiles) {
    // console.log("loadAllLayerTypes storeTiles: ", map_options_last.storeTiles);
    return;
  }
  if (allLoaded) {
    return;
  }

  allLoaded = true;

  // Warte einen Frame, um sicherzustellen, dass das DOM vollständig gerendert ist.
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const storedOrder = loadLayerOrder(); 

  let configsSource = null;

  if (typeof sidepanel !== "undefined" && sidepanel.configs) {
    configsSource = sidepanel.configs;
  } else if (
    typeof layerControl !== "undefined" &&
    window.layerControlConfigsObject
  ) {
    console.log("Lade Layer über layerControlConfigsObject");
    configsSource = window.layerControlConfigsObject;
  } else {
    console.warn(
      "Weder sidepanel noch layerControlConfigsObject gefunden. Keine Layer werden automatisch geladen."
    );
    return;
  }

  for (const key of storedOrder) {
    const config = configsSource[key]; 

    if (config && typeof config.loadFn === "function") {
      try {
        await config.loadFn(); 
      } catch (err) {
        console.error(`Fehler beim Aufruf von loadFn für Typ "${key}":`, err);
      }
    } else {
      if (key !== 'customdata')
        console.warn(`Keine loadFn definiert für Typ: ${key}`);
      //console.log(`config: ${config}`);
      //console.log("configsSource:", configsSource);
    }
  }

  // Alle Layer sind nun geladen.
  // console.log("Alle konfigurierten Layer geladen.");
}

function delay(ms) {
  console.log("delay ms: ", ms);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseColorText(text) {
  const lines = text.split("\n");
  const map = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length === 5) {
      const [val, r, g, b, a] = parts;
      const key = val === "nv" ? "nv" : parseFloat(val).toString();
      map[key] = {
        r: parseInt(r),
        g: parseInt(g),
        b: parseInt(b),
        a: parseInt(a),
      };
    }
  }
  return map;
}

function generateColorMapText(data) {
  const { colorMap } = data;

  let keys = Object.keys(colorMap);

  // Put nv last, others sorted numerically
  keys = keys
    .filter((k) => k !== "nv")
    .map((k) => parseFloat(k)) // convert numeric keys to numbers
    .sort((a, b) => a - b)
    .map((k) => k.toString());

  if (colorMap.nv) {
    keys.push("nv");
  }

  let lines = [];
  lines.push("# Farbdefinition für ...");
  lines.push("# Format: Wert Rot Grün Blau Alpha");

  keys.forEach((key) => {
    const val = colorMap[key];
    if (val) {
      lines.push(`${key} ${val.r} ${val.g} ${val.b} ${val.a}`);
    }
  });

  return lines.join("\n");
}

// Helper function to convert transparency (0-100) to Leaflet opacity (0-1)
function transparency2opacity(val) {
  const opacity = (100 - val) / 100;
  //console.log("transparency2opacity val: ", val, opacity);
  return opacity;
}

let OPFSonANDROID = false;
let OPFSonSAFARI = false;
async function checkOPFSAvailable() {
  let root = null;
  let testFileName = "opfs-test-" + Math.random().toString(36).slice(2);
  let handle = null;
  let worker = null;

  try {
    root = await navigator.storage.getDirectory();

    let mainThreadWriteSuccessful = false;
    let mainThreadWriteError = null;

    try {
      handle = await root.getFileHandle(testFileName, { create: true });
      const writable = await handle.createWritable();
      await writable.write("ok");
      await writable.close();
      mainThreadWriteSuccessful = true;
      OPFSonANDROID = true;
    } catch (err) {
      mainThreadWriteError = err;
      console.warn(
        "---> OPFS: Main thread createWritable() failed:",
        err.message || err.toString(),
        err
      );
    }

    if (!mainThreadWriteSuccessful) {
      // console.log("---> OPFS: attempt worker fallback ...");
      if (!handle) {
        return {
          available: false,
          reason: `Failed to get file handle initially: ${
            mainThreadWriteError?.message || "Unknown error"
          }`,
        };
      }

      console.log(
        "---> OPFS: Main thread createWritable() failed. Attempting worker fallback..."
      );

      try {
        worker = new Worker("opfs-worker.js");

        const workerMessageId = "worker-write-" + Date.now();
        const workerPromise = new Promise((resolve, reject) => {
          const messageHandler = (event) => {
            if (event.data.id === workerMessageId) {
              if (event.data.status === "success") {
                resolve(event.data);
              } else {
                reject(new Error(event.data.message));
              }
              worker.removeEventListener("message", messageHandler);
            }
          };
          worker.addEventListener("message", messageHandler);
          worker.addEventListener("error", (err) => {
            reject(
              new Error(
                `Worker encountered an error: ${
                  err.message || err.error || "Unknown worker error"
                }`
              )
            );
          });
          
          worker.postMessage({
            id: workerMessageId,
            type: "write",            
            fileName: testFileName,
            content: "ok",
          });
        });

        await workerPromise;
        console.log(
          "---> OPFS: Worker write successful. OPFS is available via worker."
        );
        OPFSonSAFARI = true;
      } catch (workerErr) {
        console.error("---> OPFS: Worker write attempt failed:", workerErr);
        const originalReason = mainThreadWriteError
          ? `(main thread: "${mainThreadWriteError.message}")`
          : "";
        return {
          available: false,
          reason: `OPFS write failed ${originalReason} (worker: "${
            workerErr.message || workerErr.toString()
          }")`,
        };
      } finally {
        if (worker) {
          worker.terminate();
          worker = null;
        }
      }
    }

    const file = await handle.getFile(); 
    const text = await file.text();

    console.log("---> OPFS text: ", text);

    if (text === "ok") {
      return { available: true };
    } else {
      return {
        available: false,
        reason: "File write/read mismatch after successful write.",
      };
    }
  } catch (err) {
    return { available: false, reason: err.message || err.toString() };
  } finally {
    if (root && handle) {
      try {
        await root.removeEntry(testFileName);
        // console.log(`---> OPFS: Cleaned up test file: ${testFileName}`);
      } catch (cleanupErr) {
        console.warn(
          `---> OPFS: Failed to clean up test file ${testFileName}:`,
          cleanupErr
        );
      }
    }
  }
}

async function deleteLayers(type) {
  if (isOpfsAvailable) await deleteLayersInOPFS(type);
  else deleteLayersInLocalStorage(type);
}

async function deleteLayersInOPFS(type) {
  console.log("deleteLayersInOPFS");
  try {
    const root = await navigator.storage.getDirectory();

    // Verzeichnis löschen (z.B. "hillshade_files")
    await remove(`${type}_files`);

    // Master-Metadatei löschen (z.B. "hillshade_master.json")
    await remove("", `${type}_master.json`);

    await remove("", `map_${type}_master.json`);

    console.log(`✅ Alle ${type}-Layer vollständig aus OPFS gelöscht.`);
  } catch (err) {
    console.error(`❌ Fehler beim Löschen der ${type}-Layer aus OPFS:`, err);
  }
}

async function removeSingleTile(tilesMap, type, tile) {
  console.log("removeSingleTile tile: ", tile, type);

  removeLayerByLeafletId(tile.leaflet_id);

  remove(type + "_files", tile.filename);

  console.log(
    "removeSingleTile filename: ",
    tile.filename,
    tile.tile.TileIndex
  );
}

async function deleteLayersInLocalStorage(type) {
  console.log("TODO: deleteLayersInLocalStorage type: ", type);
  const serialized = "";
  localStorage.setItem(`${type}Layers`, JSON.stringify(serialized));
}

async function deleteSingleLayer(type, identifier, origin) {
  if (isOpfsAvailable) deleteSingleLayerInOPFS(type, identifier, origin);
  else deleteSingleLayerInLocalStorage(type, identifier, origin);
}

async function deleteSingleLayerInOPFS(type, identifier, origin) {
  try {
    console.log("deleteSingleLayerInOPFS identifier: ", identifier);

    const masterFileName = `${type}_master.json`;
    const content = await retrieve("", masterFileName);
    const parsedMeta = JSON.parse(content);
    
    const index = parsedMeta.findIndex(
      (entry) =>
        String(entry.TileIndex) === String(identifier) &&
        String(entry.Origin) === String(origin)
    );

    if (index === -1) {
      console.warn(
        `⚠️ Kein Layer mit Identifier "${identifier}" und Origin "${origin}" gefunden.`
      );
      return;
    }

    // Datei im OPFS-Ordner löschen
    try {
      const directoryName = `${type}_files`;

      const fileName = `${type}_${parsedMeta[index].TileIndex}_${parsedMeta[index].Origin}.json`;

      await remove(directoryName, fileName);
      console.log(`🗑️ Layer-Datei "${fileName}" gelöscht.`);
    } catch (err) {
      if (err.name === "NotFoundError") {
        console.warn(`⚠️ Datei "${masterFileName}" nicht im Ordner gefunden.`);
      } else {
        throw err;
      }
    }

    parsedMeta.splice(index, 1);

    await persist("", masterFileName, JSON.stringify(parsedMeta, null, 2));

    console.log(
      `✅ Layer "${identifier}" (${origin}) vollständig entfernt (Datei + Metadaten).`
    );
  } catch (err) {
    console.error(`❌ Fehler beim Löschen des Layers "${identifier}":`, err);
  }
}

async function deleteSingleLayerInLocalStorage(type, identifier, origin) {
  try {
    const key = `${type}Layers`;
    const stored = localStorage.getItem(key);

    if (!stored) {
      console.warn(
        `⚠️ Keine gespeicherten ${type}-Layer in LocalStorage gefunden.`
      );
      return;
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      console.error(`❌ Unerwartetes Format in LocalStorage für ${key}`);
      return;
    }

    const index = parsed.findIndex(
      (entry) =>
        String(entry.TileIndex) === String(identifier) &&
        String(entry.Origin) === String(origin)
    );

    if (index === -1) {
      console.warn(
        `⚠️ Kein Layer mit Identifier "${identifier}" und Origin "${origin}" in LocalStorage gefunden.`
      );
      return;
    }

    parsed.splice(index, 1);

    localStorage.setItem(key, JSON.stringify(parsed));

    console.log(
      `✅ Layer "${identifier}" (${origin}) erfolgreich aus LocalStorage entfernt.`
    );
  } catch (err) {
    console.error(
      `❌ Fehler beim Löschen des Layers "${identifier}" (${origin}) aus LocalStorage:`,
      err
    );
  }
}

function getFileExtension(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function callerStackIs() {
  try {
    throw new Error();
  } catch (e) {
    const stack = e.stack.split("\n").slice(1); // skip "Error"
    const cleaned = stack
      .map((s) => {
        s = s.trim();

        // Split function and file
        const parts = s.split("@");
        let fn = parts[0] || "<anonymous>";
        let filePath = parts[1] || "";

        // Simplify function name
        fn =
          fn
            .replace(/^(async\*|setTimeout handler\*|EventListener\.)/, "") // remove prefixes
            .replace(/<.*>/, "") // remove <...> fragments
            .replace(/\*$/, "") // remove trailing *
            .trim() || "<anonymous>";

        // Only keep filename from path
        const file = filePath.split("/").pop();

        return `${fn}   @   ${file}`;
      })
      .join("\n");

    console.log("callerStackIs:\n" + cleaned);
  }
}

function roughSizeOfObject(obj) {
  const cache = new Set();
  const str = JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (cache.has(value)) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our collection
      cache.add(value);
    }
    return value;
  });
  // Each character in a JS string is 2 bytes (UTF-16)
  return str ? str.length * 2 : 0;
}

function addTileToMap(map, tile, type, leaflet_id) {
  const key = tile.TileIndex;
  const filename = type + "_" + tile.TileIndex + "_" + tile.Origin + ".json";
  if (true) {
    if (map.has(key)) {
      map
        .get(key)
        .push({ leaflet_id: leaflet_id, tile: tile, filename: filename });
    } else {
      map.set(key, [
        { leaflet_id: leaflet_id, tile: tile, filename: filename },
      ]);
    }
  }
  if (false) {
    map.set(key, [{ leaflet_id: leaflet_id, tile: tile, filename: filename }]);
  }
}

function countTilesInMap(myTilesMap) {
  let totalElements = 0;

  if (myTilesMap !== null) {
    for (const tilesArray of myTilesMap.values()) {
      totalElements += tilesArray.length;
    }
  }

  return totalElements;
}

function removeLayerById(id) {
  map.eachLayer(function (layer) {
    if (layer._leaflet_id === id) {
      map.removeLayer(layer);
      // console.log("removeLayerById removed layer with _leaflet_id: ", id);
      return;
    }
  });
}

function saveMapToLocalStorage(map, key) {
  try {
    const mapAsArray = Array.from(map.entries());
    const serializedMap = JSON.stringify(mapAsArray);
    localStorage.setItem(key, serializedMap);
    console.log(`Map successfully saved to localStorage with key: ${key}`);
  } catch (error) {
    console.error("Error saving map to localStorage:", error);
  }
}

function loadMapFromLocalStorage(key) {
  try {
    const serializedMap = localStorage.getItem(key);
    if (serializedMap === null) {
      return null;
    }
    const mapAsArray = JSON.parse(serializedMap);
    return new Map(mapAsArray);
  } catch (error) {
    console.error("Error loading map from localStorage:", error);
    return null;
  }
}
