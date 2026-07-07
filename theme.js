/* ============================================================
   CBUSEVENTS THEME SYSTEM
   theme.js — loaded on every page

   Dark mode only. Light theme has been removed platform-wide.
   This file always forces data-theme="dark" and ignores any
   saved preference, system preference, or toggle clicks.
   ============================================================ */

;(function() {
  'use strict';

  var STORAGE_KEY = 'cbus-theme';
  var html = document.documentElement;

  function applyTheme() {
    html.setAttribute('data-theme', 'dark');
  }

  function init() {
    // Clear any previously saved light preference so nothing can
    // ever re-apply it, then force dark.
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
    applyTheme();
  }

  // No-op: theme is dark-only, toggling does nothing.
  function toggle() {
    applyTheme();
  }

  // Run immediately to avoid flash of wrong theme
  init();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Expose public API (kept for backward compatibility with
  // existing onclick="CBUSTheme.toggle()" buttons in markup)
  window.CBUSTheme = {
    toggle: toggle,
    init: init,
    get: function() { return 'dark'; }
  };

})();
