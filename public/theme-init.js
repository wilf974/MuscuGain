// Applique le thème (clair/sombre) avant le premier rendu React. Défaut : sombre (charte historique).
(function () {
  try {
    var pref = localStorage.getItem('muscuGainTheme') || 'dark';
    var light = pref === 'light' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
    if (light) document.documentElement.classList.add('theme-light');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#f1f5f9' : '#0f172a');
  } catch (e) { /* stockage indisponible : thème sombre */ }
})();
