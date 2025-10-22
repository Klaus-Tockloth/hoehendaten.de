// modeManager.js

(function (global) {
  let currentMode = null;
  
  global.modeManager = {

    set(newMode, type) {
      currentMode = { mode: newMode, type };
    },

    get() {
      return currentMode?.mode ?? null;
    },

    getMode() {
      return currentMode?.mode ?? null;
    },

    getType() {
      return currentMode?.type ?? null;
    },

    is(mode, type) {
      return currentMode?.mode === mode && currentMode?.type === type;
    },
    
    resetMode(all=false) {
      currentMode = null;
      mode = MODE_NONE;

      console.log("[modeManager] Modus gelöscht");

      document
        .querySelectorAll(".dropbtn.my-custom-class.active")
        .forEach((el) => el.classList.remove("active"));

      document
        .querySelectorAll(".hamburgerSubmenuBtn.nav-green-btn")
        .forEach((el) => el.classList.remove("nav-green-btn"));

      // Collapse all other submenus and reset their arrows
      document
        .querySelectorAll(".hamburger-menu-main-button")
        .forEach((otherMainBtn) => {
          if (true) {
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
      
      if (all) {
        document
          .querySelectorAll(".elevation-btn.elevation-btn-1point.pressed")
          .forEach((el) => el.classList.remove("pressed"));
      }
    },
  };
})(window);