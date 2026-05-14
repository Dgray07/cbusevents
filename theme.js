/* ============================================================
   CBUSEVENTS THEME SYSTEM
   theme.js — loaded on every page
   ============================================================

   USAGE ON EACH PAGE:
   -------------------
   In <head>, add:
     <link rel="stylesheet" href="/theme.css">
     <script src="/theme.js"></script>

   In your nav, add the toggle button wherever it fits:
     <button class="theme-toggle" onclick="CBUSTheme.toggle()" 
             title="Toggle dark mode" aria-label="Toggle dark mode">
       <span class="theme-icon-moon">&#9790;</span>
       <span class="theme-icon-sun">&#9728;</span>
     </button>

   For portals that are ALREADY dark by default, add
   data-default="dark" to your <html> tag:
     <html lang="en" data-default="dark">
   This flips the toggle so light is the "on" state.
   ============================================================ */

;(function() {
  'use strict';

  var STORAGE_KEY = 'cbus-theme';
  var html = document.documentElement;
  var isDefaultDark = html.getAttribute('data-default') === 'dark';

  function getSystemPreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch(e) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch(e) {}
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
  }

  function init() {
    var saved = getSavedTheme();
    var theme;

    if (saved) {
      theme = saved;
    } else if (isDefaultDark) {
      // Portal pages default to dark, switch to light if user prefers light
      theme = getSystemPreference() === 'light' ? 'light' : 'dark';
    } else {
      // Light pages default to light, switch to dark if user prefers dark
      theme = getSystemPreference() === 'dark' ? 'dark' : 'light';
    }

    applyTheme(theme);
  }

  function toggle() {
    var current = html.getAttribute('data-theme');
    var next;

    if (isDefaultDark) {
      // For dark-default portals: toggle between dark (default) and light
      next = current === 'light' ? 'dark' : 'light';
    } else {
      // For light-default pages: toggle between light (default) and dark
      next = current === 'dark' ? 'light' : 'dark';
    }

    applyTheme(next);
    saveTheme(next);
  }

  // Run immediately to avoid flash of wrong theme
  init();

  // Also re-run once DOM is ready in case html tag wasn't available
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Listen for system preference changes (e.g. user changes OS setting)
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      // Only auto-switch if user hasn't manually picked a theme
      if (!getSavedTheme()) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Expose public API
  window.CBUSTheme = {
    toggle: toggle,
    init: init,
    get: function() { return html.getAttribute('data-theme'); }
  };

})();
