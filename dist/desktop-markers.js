/* A shared appearance preference, applied before the desktop first paints. */
(function (root) {
  'use strict';
  function createDesktopMarkers({ document, storage, events }) {
    const key = 'spatial-desktop-markers-v1';
    const valid = value => value === 'lines' || value === 'icons';
    let preference = 'icons';
    try { const saved = storage.getItem(key); if (valid(saved)) preference = saved; } catch {}
    const apply = () => { document.documentElement.dataset.desktopMarkers = preference; };
    const markers = {
      get preference() { return preference; },
      onChange: null,
      setPreference(value) {
        if (!valid(value) || preference === value) return false;
        preference = value;
        apply();
        try { storage.setItem(key, value); } catch {}
        markers.onChange?.();
        return true;
      }
    };
    events?.addEventListener('storage', event => {
      if (event.key !== key && event.key !== null) return;
      const next = valid(event.newValue) && event.key !== null ? event.newValue : 'icons';
      if (next === preference) return;
      preference = next;
      apply();
      markers.onChange?.();
    });
    apply();
    return markers;
  }
  if (typeof module === 'object' && module.exports) module.exports = createDesktopMarkers;
  else root.SpatialDesktopMarkers = createDesktopMarkers({
    document: root.document,
    storage: { getItem: key => root.localStorage.getItem(key), setItem: (key, value) => root.localStorage.setItem(key, value) },
    events: root
  });
})(typeof window === 'object' ? window : globalThis);
