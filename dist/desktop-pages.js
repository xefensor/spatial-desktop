(function (root) {
  'use strict';
  const index = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  function create(saved = {}) {
    let spaces = {};
    function load(value) {
      spaces = {};
      Object.entries(value || {}).forEach(([id, entry]) => {
        if (!entry || typeof entry !== 'object') return;
        spaces[id] = { active: index(entry.active), windows: Object.fromEntries(Object.entries(entry.windows || {}).map(([name, page]) => [name, index(page)])), migrated: Boolean(entry.migrated) };
      });
    }
    load(saved);
    const space = id => spaces[id] ||= { active: 0, windows: {}, migrated: false };
    const pageOf = (id, name) => index(space(id).windows[name]);
    const last = id => Math.max(0, ...Object.values(space(id).windows)) + 1;
    return {
      load, space, pageOf, last,
      current: id => space(id).active,
      visible: (id, name) => pageOf(id, name) === space(id).active,
      assign(id, name, page = space(id).active) { space(id).windows[name] = index(page); },
      go(id, page) {
        const next = Math.max(0, Math.min(index(page), last(id)));
        if (space(id).active === next) return false;
        space(id).active = next;
        return true;
      },
      snapshot: () => JSON.parse(JSON.stringify(spaces))
    };
  }
  // A wheel burst includes trackpad momentum. Require a quiet gap before a
  // second page, rather than advancing on every individual wheel event.
  function wheelGate({ threshold = 40, quiet = 180 } = {}) {
    let total = 0, lastTime = -Infinity, fired = false;
    return {
      reset() { total = 0; lastTime = -Infinity; fired = false; },
      feed(delta, time) {
        if (!Number.isFinite(delta) || !delta) return 0;
        if (time - lastTime >= quiet) { total = 0; fired = false; }
        lastTime = time;
        if (fired) return 0;
        if (total && Math.sign(total) !== Math.sign(delta)) total = 0;
        total += delta;
        if (Math.abs(total) < threshold) return 0;
        fired = true;
        return Math.sign(total);
      }
    };
  }
  const api = { create, wheelGate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpatialDesktopPages = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
