// sidepanel.js

const version = "0.0.9";

window.theSidepanelSingleton = null;

document.addEventListener("DOMContentLoaded", () => {
});

window.createSidepanel = function (options = {}) {
  // Stellt sicher, dass nur eine Instanz existiert (Singleton-Muster)
  if (!window.theSidepanelSingleton) {
    window.theSidepanelSingleton = new SidepanelManager();
  } 
  window.theSidepanelSingleton.register(options);
  return window.theSidepanelSingleton;
};

class SidepanelManager {
  constructor() {
    this.configs = {};
    this.currentType = null; 
   
    const wrapper = document.createElement("div");
    wrapper.className = "wrapper";
    wrapper.id = "sidepanelWrapper";

    document.body.appendChild(wrapper); 

    const mainContentArea = document.getElementById("main-content-area");

    if (mainContentArea) {
      mainContentArea.appendChild(wrapper);
    } else {
      // Fallback: Wenn der 'main-content-area'-Container nicht gefunden wird,
      // füge ihn direkt dem Body hinzu (Layout könnte dann abweichen).
      document.body.appendChild(wrapper);
      console.warn(
        "Element mit ID 'main-content-area' nicht gefunden. sidepanelWrapper wird direkt dem Body hinzugefügt. Stellen Sie sicher, dass Ihre HTML-Struktur das gewünschte Layout unterstützt."
      );
    }

    this.sidepanel = document.createElement("div");
    this.sidepanel.className = "side-panel";
    this.sidepanel.innerHTML = `
      <div class="side-panel-header">
        <div class="side-panel-title">Sidepanel</div>
        <button class="side-panel-close" style="background: none; border: none; font-size: 18px; cursor: pointer;">✕</button>
      </div>
      
      <div class="side-panel-content"></div>
    `;

    wrapper.appendChild(this.sidepanel); 

    this._container = this.sidepanel; 

    this._sidepanelTitle = this.sidepanel.querySelector(".side-panel-title");

    this.contentEl = this.sidepanel.querySelector(".side-panel-content");

    this._closeButton = this.sidepanel.querySelector(".side-panel-close");
    
    this._closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      //this.hide(); // Verbirgt die Seitenleiste sofort
      setTimeout(() => this.hide(), 200);
    });

    if (false) {
      // Vorübergehend deaktiviert: Event-Listener für 'mouseleave'
      this.sidepanel.addEventListener("mouseleave", (e) => {
        if (!this.sidepanel.contains(e.relatedTarget)) {
          this.hide();
        }
      });
    }
  }
 
  register(config) {
    if (!config.type) {
      console.warn("Die Sidepanel-Konfiguration muss einen `type` haben.");
      return;
    }   
    if (!this.configs[config.type]) {
      this.configs[config.type] = config;
    } 
  }

  getTypes() {
    return Object.keys(this.configs);
  }

  isVisible() {
    return this._container?.classList.contains("open");
  }
  isVisibleWithData() {
    if (this._container?.classList.contains("open"))
      return this._container?.classList.contains("data");
    return false;
  }
  isVisibleWithOptions() {
    if (this._container?.classList.contains("open"))
      return this._container?.classList.contains("options");
    return false;
  }
  
  hide() {   
    this._container.classList.remove("open");
  }
  
  getConfig(type) {
    return this.configs[type];
  }

  showHelp(type) {   
    if (this.contentEl) {
      this.contentEl.classList.remove("sidepanel-options-padding");
    }

    this._container.classList.add("open"); 
    this._container.classList.add("help");

    this._sidepanelTitle.innerHTML =
      "Hilfe " + (this.configs[type]?.label || type);
   
    if (type === "map") {
      this.contentEl.innerHTML = `
        <b>Das Ebenen-Konzept:</b> Die Karte setzt sich aus mehreren Ebenen zusammen, die wie Folien übereinanderliegen. Ganz unten befindet sich in der Regel die Basiskarte, darüber können weitere Informationen wie eine Schummerung oder Höhenschichtlinien platziert werden. Sie können die Anordnung dieser Ebenen jederzeit ändern.
        <br><br>

        <b>Werkzeuge zur Anpassung:</b> Für jede Ebene stehen Ihnen leistungsstarke Werkzeuge zur Verfügung:
        <br>

        <ul>
          <li>
        <b>Filter:</b> Passen Sie die Darstellung einer einzelnen Ebene direkt an, indem Sie Helligkeit, Kontrast, Farbsättigung oder die Deckkraft (Transparenz) verändern.
          </li>
          <li>
        <b>Mischmodus:</b> Bestimmen Sie, wie eine Ebene mit den darunterliegenden Ebenen interagiert. Modi wie „Multiplizieren“ oder „Farbig abwedeln“ erzeugen dabei völlig unterschiedliche visuelle Ergebnisse.
          </li>
        </ul>
        
        <b>Tipp:</b> Das Zusammenspiel von Filtern und Mischmodi ist der Schlüssel zu einer perfekten Karte. Der beste Weg dorthin ist das Experimentieren mit den verschiedenen Einstellungen.
        <br>
        <br>
        ${window.innerWidth}      
        `;
    }

    if (type === "tri") {
      this.contentEl.innerHTML = `
        <h4><strong>TRI (Terrain Ruggedness Index): Allgemeine Unebenheit des Geländes messen</strong></h4>
        <p>Der TRI ist ein Maß für die allgemeine Unebenheit und „Zerklüftung“ des Geländes. Er berechnet die durchschnittliche Höhendifferenz zwischen einem zentralen Punkt und all seinen Nachbarn. Ein hoher TRI-Wert steht für ein sehr heterogenes, raues Gelände mit vielen kleinen Höhenänderungen, während ein niedriger Wert eine glatte Oberfläche anzeigt – dies ist unabhängig von der generellen Hangneigung.</p>
        <p>Sie können verschiedene Parameter anpassen, um die Darstellung zu steuern:</p>
        <ul>
        <li><strong>Farbschema:</strong> Definiert, welche Farbe welchem TRI-Wert entspricht. Das vorgegebene Schema kann flexibel angepasst werden, um die Visualisierung auf spezifische Anforderungen abzustimmen. Die verwendete Farbtabelle eignet sich hervorragend als Farblegende für die Karte.</li>
        <li><strong>Farbzuweisung:</strong> Legt fest, wie die Farben den TRI-Werten zugeordnet werden.
        <ul>
        <li><strong>Lineare Interpolation:</strong> Erzeugt sanfte Übergänge zwischen den Farbstufen.</li>
        <li><strong>Nächstgelegene Farbe:</strong> Weist jedem Wert exakt die definierte Farbe zu, was zu klar abgegrenzten Bereichen führt.</li>
        </ul>
        </li>
        <li><strong>Interaktion mit dem Kartenbild:</strong> Die Ebene kann durch die Auswahl eines Mischmodus und/oder durch Filter mit darunterliegenden Kartenbildern interagieren. Dadurch lässt sich die visuelle Integration optimieren.</li>
        </ul>
        `;
    }
    /*
        window.innerWidth liefert
        die CSS-Pixel nach Skalierung/Zoom,
        und nicht nicht die physische Bildschirmauflösung
      */
  }

  async showHelpHtml(type) {   
    if (this.contentEl) {
      this.contentEl.classList.remove("sidepanel-options-padding");
    }
    
    this._container.classList.add("open");
    this._container.classList.add("help");

    this._sidepanelTitle.innerHTML =
      "Hilfe " + (this.configs[type]?.label || type);

    if (type === "upload") {
      this._sidepanelTitle.innerHTML =
        this._sidepanelTitle.innerHTML + "<br>" + window.innerWidth;
    }

    /* Klaus Tockloth: auskommentiert
    if (isLocalhost) {
      console.log("Running on localhost, showing dummy help content.");
      this.contentEl.innerHTML = `
        <p>Dies ist ein Platzhalter für die Hilfe zu "${type}".</p>
        <p>Blablabla...</p>
        <p>Weitere Informationen hierzu auf Ihrem lokalen Entwicklungsserver.</p>
        <div class="Version">${version} (version, sidepanel)</div>
      `;
      return; // Exit the function early if on localhost
    }
    */
  
    try {
      const helpFilename = `./help/${type}.html`;
      const response = await fetch(helpFilename); 
      if (!response.ok) {
        throw new Error(
          `Help file for '${helpFilename}' not found: ${response.statusText}`
        );
      }
      let contentHtml = await response.text();
     
      if (type === "map") {
        // contentHtml += `<br><br>${window.innerWidth}`;
        // contentHtml += `<div class="Version">${version}</div>`;
        console.log("window.innerWidth:", window.innerWidth);
        console.log("version:", version);
      }

      this.contentEl.innerHTML = contentHtml;
    } catch (error) {
      console.error("Fehler beim Laden der Hilfe:", error);
      this.contentEl.innerHTML = `<p>Konnte Hilfe für "${type}" nicht laden.</p>`;
    }
  }
  
  showOptions(type) {    
    if (this.contentEl) {
      this.contentEl.classList.add("sidepanel-options-padding");
    }

    this._container.classList.add("open"); 
    this._container.classList.add("options");

    if (this._sidepanelTitle) {
      this._sidepanelTitle.innerHTML =
        "Konfiguration " + (this.configs[type]?.label || type);
    }
    
    this.updateInfoContent(type);

    this.currentType = type;
  }
  
  updateInfoContent(type) {
    if (!this.contentEl) 
      return;

    const config = Object.values(this.configs).find((cfg) => cfg.type === type);

    // Fehlerbehandlung, falls Typ oder Konfiguration fehlen
    if (!type || !config) {
      console.warn(
        "Fehler: Typ oder Konfiguration für Sidepanel-Inhalt fehlen."
      );
      console.warn("Fehlende Konfiguration: ", config);
      console.warn("Verfügbare Konfigurationen: ", this.configs);
      this.contentEl.style.display = "none";
      this.contentEl.innerHTML = "";
      return;
    }
    
    if (typeof config.panelHtmlFn === "function") {
      this.contentEl.innerHTML = config.panelHtmlFn();
    } else {
      console.error("Die Funktion 'panelHtmlFn' fehlt für den Typ:", type);
      return;
    }
    
    if (typeof config.panelHelperFn === "function") {
      requestAnimationFrame(() => {
        config.panelHelperFn();
      });
    }
  }
  
  showData(type, highlightTileIndex = null) {    
    if (this.contentEl) {
      this.contentEl.classList.remove("sidepanel-options-padding");
    }

    this._container.classList.add("open"); 
    this._container.classList.add("data");

    this._closeButton.style.display = "block"; 

    const config = this.configs[type];
    
    const array = config?.array ?? [];   

    const tilesMap = config?.tilesMap ?? null;   

    this.currentType = type;

    if (this._sidepanelTitle) {     
      this._sidepanelTitle.innerHTML =
        "Daten " + (this.configs[type]?.label || type);      
    }

   
    this.contentEl.innerHTML = this.getListHtml(
      tilesMap,
      type,
      highlightTileIndex
    );

    if (highlightTileIndex !== null) {    
      const highlightedElement =
        this.contentEl.querySelector(".highlighted-tile");

      if (highlightedElement) {       
        highlightedElement.scrollIntoView({
          behavior: "smooth", 
          block: "center", 
        });
      }
    }
  }

 
  getListHtml(tilesMap, type, highlightTileIndex = null) {   
    if (!tilesMap || tilesMap.size === 0) {
      const label = this.configs[type]?.label || type || "Elemente";
      return `<div class="entry-list"><p style="color: #777; font-style: italic; padding: 10px;">Noch keine Kachel für ${label} angelegt.</p></div>`;
    }
   
    let colorIndex = 0;
   
    const listItems = [...tilesMap.entries()]
      .map(([tileIndex, tilesArray]) => {        
        const colorClass = colorIndex % 2 === 0 ? "color-even" : "color-odd";
        colorIndex++; 

        
        return tilesArray
          .map((tile) => {           
            const tileId = tile.tile?.TileIndex ?? tileIndex ?? "";
            const leaflet_id = tile.leaflet_id ?? "";

            const isHighlighted =
              highlightTileIndex !== null &&
              String(tileId) === String(highlightTileIndex);            
            const rowClass = `${
              isHighlighted ? "highlighted-tile" : ""
            } ${colorClass}`;
            
            const isVisible =
              typeof tile.visible === "boolean" ? tile.visible : true;
            const visibilityClass = isVisible ? "is-visible" : "is-hidden";
           
            const visibilityButtonContent = isVisible
              ? `<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;">`
              : `<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;">`;

            const visibilityBtn = `
            <button class="customdata-toggle-visibility-btn ${visibilityClass}" type="button" title="Sichtbarkeit umschalten" onclick="toggleVisibility(event, ${leaflet_id})">
              ${visibilityButtonContent}
            </button>`;
           
            return `
            <details class="${rowClass.trim()}" style="margin-top:4px;">
              <summary class="customdata-item-summary">
                <span class="customdata-item-name">
                  <!--
                  ${this.configs[type]?.label}, 
                  -->
                  ${tileId}, 
                  ${tile.tile?.Origin ?? ""}
                </span>
                <span class="customdata-item-actions-summary">
                  ${
                    tileId
                      ? `<button class="customdata-position-btn" type="button" title="Suchen" onclick="searchIt(event, ${leaflet_id})">🔍</button>`
                      : ""
                  }
                  ${visibilityBtn}
                  <button class="customdata-remove-btn" type="button" title="Löschen" onclick="removeTheTile(event, '${type}', '${tileId}', ${leaflet_id})">🗑️</button>
                </span>
              </summary>
              <div style="margin-left:10px;">
                ${buildTileInfo(tile, this.configs[type]?.label)}
              </div>
            </details>
          `;
          })
          .join(""); 
      })
      .join(""); 

    return `<div class="entry-list">${listItems}</div>`;
  }

  showCustomDataConfiguration(type) {    

    // console.log("showCustomDataConfiguration type: ", type);

    if (this.contentEl) {
      this.contentEl.classList.add("sidepanel-options-padding");
    }

    // const type = "customdataConfiguration";   
    this._container.classList.add("open");
    this._container.classList.add("data");

    this._closeButton.style.display = "block"; 

    const config = this.configs[type];

    if (this._sidepanelTitle) {
      this._sidepanelTitle.innerHTML = "Konfiguration Eigene Objekte";
    }

    this.contentEl.innerHTML = getCustomDataConfigurationPanelHtml();

   
    if (typeof initCustomDataConfigurationPanelHelper === "function") {
      requestAnimationFrame(() => {
        initCustomDataConfigurationPanelHelper();
      });
    }
  }

  showCustomData(type) {

    // console.log("showCustomData type: ", type);

    if (this.contentEl) {
      this.contentEl.classList.remove("sidepanel-options-padding");
    }

    // const type = "customdata";
   
    this._container.classList.add("open"); 
    this._container.classList.add("data");

    this._closeButton.style.display = "block"; 

    const config = this.configs[type];   
    const array = config?.array ?? [];

    this.currentType = type;

    if (this._sidepanelTitle) {      
      this._sidepanelTitle.innerHTML =
        (this.configs[type]?.label || type)
    }
   
    this.contentEl.innerHTML = config.panelHtmlFn();
    
    if (typeof config.panelHelperFn === "function") {      
      requestAnimationFrame(() => {
        config.panelHelperFn();
      });
    }
  }
}

function toggleVisibility(event, layerId) {  
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
 
  const layer = window.map._layers[layerId];
  console.log("toggleVisibility layerId: ", layerId, layer);
  const btn = document.querySelector(
    `button[onclick="toggleVisibility(event, ${layerId})"]`
  );
 
  if (!layer || !btn) {
    console.error("Layer or button not found for ID:", layerId);
    return;
  }
  
  const visibleIcon = `<img src="assets/eye-solid-full.svg" alt="Sichtbar" style="width: 1em; height: 1em; vertical-align: middle;">`;
  const hiddenIcon = `<img src="assets/eye-slash-solid-full.svg" alt="Unsichtbar" style="width: 1em; height: 1em; vertical-align: middle;">`;
 
  if (typeof layer._customIsHidden === "undefined") {    
    const initialVisibility = btn.classList.contains("is-visible");
    layer._customIsHidden = !initialVisibility;
  }
 
  if (layer._customIsHidden) {    
    if (layer.setOpacity) {
      layer.setOpacity(1);
    } else if (
      layer.eachLayer &&
      (layer instanceof L.GeoJSON || layer instanceof L.LayerGroup)
    ) {      
      layer.eachLayer(function (childLayer) {
        if (childLayer.setStyle) {
          childLayer.setStyle({ opacity: 1, fillOpacity: 0.7 }); 
        } else if (childLayer.setOpacity) {         
          childLayer.setOpacity(1);
        }
      });
    } else if (layer.getElement) {
      layer.getElement().style.display = "";
    }

    btn.innerHTML = visibleIcon;
    btn.classList.remove("is-hidden");
    btn.classList.add("is-visible");
    layer._customIsHidden = false;
  } else {
    if (layer.setOpacity) {
      layer.setOpacity(0);
    } else if (
      layer.eachLayer &&
      (layer instanceof L.GeoJSON || layer instanceof L.LayerGroup)
    ) {     
      layer.eachLayer(function (childLayer) {
        if (childLayer.setStyle) {
          childLayer.setStyle({ opacity: 0, fillOpacity: 0 });
        } else if (childLayer.setOpacity) {
          childLayer.setOpacity(0);
        }
      });
    } else if (layer.getElement) {
      layer.getElement().style.display = "none";
    }

    btn.innerHTML = hiddenIcon;
    btn.classList.remove("is-visible");
    btn.classList.add("is-hidden");
    layer._customIsHidden = true;
  }
}

function searchIt(event, layerId) {
  event.preventDefault(); 
  event.stopPropagation();

  const layer = getLayerById(layerId);

  if (layer) {
    if (layer.getBounds) {
      map.fitBounds(layer.getBounds(), { padding: [20, 20] }); 
    } else {
      console.warn(`Layer ${layerId} hat keine 'getBounds'-Methode.`);
    }
  } else {
    console.warn(`Layer ${layerId} nicht gefunden.`);
  }
}

// TODO: Falls 'theLayerControlSingleton' existiert, sollte hier auch das Overlay entfernt werden.
function removeIt(event, layerId) {
  event.preventDefault(); 
  event.stopPropagation(); 

  alert("Funktion noch nicht implementiert !");

  console.log("Entferne Layer mit ID: ", layerId);
  
  for (const config of Object.values(window.theSidepanelSingleton.configs)) {
    const index = config.array?.findIndex(
      (l) => l.layer?._leaflet_id === layerId || l.layer?._leafletId === layerId
    );
   
    if (index !== undefined && index !== -1) {
      console.log(
        "config.array[index].TileIndex: ",
        config.array[index].TileIndex
      );

      deleteSingleLayer(
        config.type,
        config.array[index].TileIndex,
        config.array[index].Origin
      );
     
      const [removedLayerObj] = config.array.splice(index, 1);

      const leafletLayer = removedLayerObj?.layer;      
      if (leafletLayer && map.hasLayer(leafletLayer)) {
        map.removeLayer(leafletLayer);
        console.log(`Layer ${layerId} von Karte und Konfiguration entfernt.`);
      } else {
        console.warn(
          `Layer ${layerId} nicht auf der Karte, aber aus Konfiguration entfernt.`
        );
      }
      
      window.theSidepanelSingleton?.showData(config.type);
      return; 
    }
  }

  console.warn(`Layer mit ID ${layerId} in keiner Konfiguration gefunden.`);
}

async function rrrremoveTheTile(event, type, tileId, leaflet_id) {
  event.preventDefault(); 
  event.stopPropagation(); 

  console.log("removeTheTile tileId: ", tileId, leaflet_id);

  const sidepanelManager = window.theSidepanelSingleton;
  if (!sidepanelManager || !sidepanelManager.configs[type]) {
    console.error(
      "SidepanelManager oder Konfiguration für Typ",
      type,
      "nicht gefunden."
    );
    return;
  }

  const managerConfig = sidepanelManager.configs[type]; 
  const theMap = managerConfig.tilesMap;
  
  if (!theMap) {
    console.error("tilesMap für Typ", type, "nicht gefunden.");
    return;
  }

  const theTile = theMap.get(tileId);

  let origin = null;
 
  if (Array.isArray(theTile)) {

    const matchingTiles = theTile.filter(
      (tile) => tile.leaflet_id === leaflet_id
    );

    if (matchingTiles.length !== 1) {
      console.error("removeTheTile uups matchingTiles: ", matchingTiles);
    } else {
      origin = matchingTiles[0].tile.Origin;
    }

    if (theTile.length === 1) {
      console.log(
        `Removed tileId '${tileId}' from theMap as it was the last element.`
      );
    } else {      
      const updatedTiles = theTile.filter(
        (tile) => tile.leaflet_id !== leaflet_id
      ); 

      if (updatedTiles.length === 0) {        
        theMap.delete(tileId);
        console.log(
          `Removed tileId '${tileId}' from theMap as all elements were removed.`
        );
      } else {       
        theMap.set(tileId, updatedTiles);
        console.log(
          `Removed element with leaflet_id '${leaflet_id}' from tileId '${tileId}'. Updated theMap.`
        );
      }
    }
  } else if (theTile) {    
    theMap.delete(tileId);
    console.log(
      `Removed non-array tile entry for tileId '${tileId}' from theMap.`
    );
  } else {
    console.warn(
      `Attempted to remove tileId '${tileId}', but no matching tile was found in theMap.`
    );
  }
  
  if (
    managerConfig.managerPublicApi &&
    managerConfig.managerPublicApi._saveTileMapInternal
  ) {
    await managerConfig.managerPublicApi._saveTileMapInternal(theMap, type);
  } else {
    console.error(
      `_saveTileMapInternal not exposed in managerPublicApi within manager config for type '${type}'. Cannot save tile map.`
    );
  }

  if (
    managerConfig.managerPublicApi &&
    managerConfig.managerPublicApi._removeSingleLayerInOPFS
  ) {
    await managerConfig.managerPublicApi._removeSingleLayerInOPFS(
      type,
      tileId,
      origin
    );
  } else {
    console.error(
      `_removeSingleLayerInOPFS not exposed in managerPublicApi within manager config for type '${type}'. Cannot save tile map.`
    );
  }

  removeLayerByLeafletId(leaflet_id);

  console.log("removeTheTile theMap after operation: ", theMap);

  window.theSidepanelSingleton.showData(type);
}
async function removeTheTile(event, type, tileId, leaflet_id) {
  event.preventDefault();
  event.stopPropagation();

  console.log("removeTheTile tileId: ", tileId, leaflet_id);

  const sidepanelManager = window.theSidepanelSingleton;
  if (!sidepanelManager || !sidepanelManager.configs[type]) {
    console.error(
      "SidepanelManager oder Konfiguration für Typ",
      type,
      "nicht gefunden."
    );
    return;
  }

  const managerConfig = sidepanelManager.configs[type];
  const theMap = managerConfig.tilesMap;

  if (!theMap) {
    console.error("tilesMap für Typ", type, "nicht gefunden.");
    return;
  }

  const theTile = theMap.get(tileId);

  let origin = null;

  if (Array.isArray(theTile)) {
    const tileToRemove = theTile.find(
      (tile) => tile.leaflet_id === leaflet_id
    );
    if (tileToRemove) {
      origin = tileToRemove.tile.Origin;
    } else {
      console.error(
        `Could not find tile with leaflet_id ${leaflet_id} for tileId '${tileId}'`
      );
    }

    // Always filter the array to get the updated list of tiles
    const updatedTiles = theTile.filter(
      (tile) => tile.leaflet_id !== leaflet_id
    );

    // If the updated array is empty, remove the key from the map
    if (updatedTiles.length === 0) {
      theMap.delete(tileId);
      console.log(
        `Removed tileId '${tileId}' from theMap as it was the last element.`
      );
    } else {
      // Otherwise, update the map with the smaller array
      theMap.set(tileId, updatedTiles);
      console.log(
        `Removed element with leaflet_id '${leaflet_id}' from tileId '${tileId}'. Updated theMap.`
      );
    }
    
  } else if (theTile) {
    theMap.delete(tileId);
    console.log(
      `Removed non-array tile entry for tileId '${tileId}' from theMap.`
    );
  } else {
    console.warn(
      `Attempted to remove tileId '${tileId}', but no matching tile was found in theMap.`
    );
  }

  if (
    managerConfig.managerPublicApi &&
    managerConfig.managerPublicApi._saveTileMapInternal
  ) {
    await managerConfig.managerPublicApi._saveTileMapInternal(theMap, type);
  } else {
    console.error(
      `_saveTileMapInternal not exposed in managerPublicApi within manager config for type '${type}'. Cannot save tile map.`
    );
  }

  if (
    managerConfig.managerPublicApi &&
    managerConfig.managerPublicApi._removeSingleLayerInOPFS
  ) {
    await managerConfig.managerPublicApi._removeSingleLayerInOPFS(
      type,
      tileId,
      origin
    );
  } else {
    console.error(
      `_removeSingleLayerInOPFS not exposed in managerPublicApi within manager config for type '${type}'. Cannot save tile map.`
    );
  }

  removeLayerByLeafletId(leaflet_id);

  console.log("removeTheTile theMap after operation: ", theMap);

  window.theSidepanelSingleton.showData(type);
}


function getLayerById(id) {  

  if (map && typeof map.eachLayer === "function") {
    map.eachLayer(function (layer) {      
      if (layer._leaflet_id === id) {
        foundLayer = layer;
      }
    });
  } else {
    console.error(
      "Die 'map'-Variable ist kein gültiges Leaflet-Kartenobjekt oder nicht verfügbar."
    );
    return null;
  }
  return foundLayer; 
}

function safeId(val) {
  return val
    .toString()
    .replace(/\./g, "_")
    .replace(/\s/g, "")
    .replace(/[^\w-]/g, "");
}
