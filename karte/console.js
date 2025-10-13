document.addEventListener("DOMContentLoaded", () => {    

    createConsoleControls();

    initLogging();

    console.error('INFO: Hi, here is console.js!');
});

function createConsoleControls() {
  const nav = document.querySelector("nav");
  if (!nav) {
    console.warn("Navigation element not found.");
    return;
  }

  // Create wrapper for nav and controls
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "20px"; // spacing between nav and controls

  // Insert wrapper before nav, then move nav into wrapper
  nav.parentNode.insertBefore(wrapper, nav);
  wrapper.appendChild(nav);

  // Create controls container
  const controlsContainer = document.createElement("div");
  controlsContainer.id = "console-controls";
  controlsContainer.style.display = "flex";
  controlsContainer.style.gap = "10px";
  controlsContainer.style.flexWrap = "wrap";

  const buttons = [
    { id: "clearBtn", text: "🧹" },
    { id: "showLocalStorageBtn", text: "📦" },
    { id: "copyToClipboardBtn", text: "📋" },
    { id: "toggleBtn", text: "👁️", title: "Show Console" }
  ];

  buttons.forEach(({ id, text, title }) => {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = text;
    if (title) btn.title = title;
    controlsContainer.appendChild(btn);
  });

  const logLevelSelector = document.createElement("select");
  logLevelSelector.id = "logLevelSelector";
  logLevelSelector.title = "Minimum log level";

  ["log", "info", "warn", "error"].forEach(level => {
    const opt = document.createElement("option");
    opt.value = level;
    opt.textContent = level;
    if (level === "log") opt.selected = true;
    logLevelSelector.appendChild(opt);
  });

  controlsContainer.appendChild(logLevelSelector);
  wrapper.appendChild(controlsContainer); // Insert controls next to nav

  // Create and insert hidden textarea
  const textarea = document.createElement("textarea");
  textarea.id = "textarea";
  textarea.readOnly = true;
  textarea.rows = 10;
  textarea.style.width = "100%";
  textarea.style.marginTop = "10px";
  textarea.style.display = "none";

  wrapper.insertAdjacentElement("afterend", textarea);
}
  
function initLogging() {
  const consoleTextarea = document.getElementById("textarea");
  const clearBtn = document.getElementById("clearBtn");
  const toggleBtn = document.getElementById("toggleBtn");
  const toggleMarkerBtn = document.getElementById("toggleMarkerBtn");
  const logLevelSelector = document.getElementById("logLevelSelector");

  // Define priority
  const LOG_LEVELS = {
    log: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  // Get current level
  function getCurrentLogLevel() {
    const selected = logLevelSelector?.value || "log";
    return LOG_LEVELS[selected];
  }  

  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  };

  if (false /*!isMobile*/) {    
    consoleTextarea.remove();
    clearBtn.remove();
    toggleBtn.remove();
  } else {  
      // Start empty
      consoleTextarea.value = "";

      function appendToConsole(prefix, args) {
        const line = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        consoleTextarea.value += `${prefix} ${line}\n`;
        consoleTextarea.scrollTop = consoleTextarea.scrollHeight;
      }
      
      console.log = function (...args) {
        if (getCurrentLogLevel() <= LOG_LEVELS.log) {
          original.log(...args);
          appendToConsole('[LOG]', args);
        }
      };
      
      console.info = function (...args) {
        if (getCurrentLogLevel() <= LOG_LEVELS.info) {
          original.info(...args);
          appendToConsole('[INFO]', args);
        }
      };
      
      console.warn = function (...args) {
        if (getCurrentLogLevel() <= LOG_LEVELS.warn) {
          original.warn(...args);
          appendToConsole('[WARN]', args);
        }
      };
      
      console.error = function (...args) {
        if (getCurrentLogLevel() <= LOG_LEVELS.error) {
          original.error(...args);
          appendToConsole('[ERROR]', args);
        }
      };      

      // Clear button functionality
      clearBtn.addEventListener("click", () => {
        consoleTextarea.value = "";
      });

     toggleBtn.addEventListener("click", () => {
       if (consoleTextarea.style.display === "none") {
         consoleTextarea.style.display = "block";
         toggleBtn.textContent = "🙈"; // Monkey covering eyes
         toggleBtn.title = "Hide Console";
       } else {
         consoleTextarea.style.display = "none";
         toggleBtn.textContent = "👁️"; // Open eye
         toggleBtn.title = "Show Console";
       }
     });
     
      copyToClipboardBtn.addEventListener("click", () => {
        const text = document.getElementById("textarea");
        if (text) {
            navigator.clipboard.writeText(text.value || "").then(() => {
              console.log("copied");
            });    
        }
      });

      // Example log
      console.error("INFO: Console ready.");
    };
}