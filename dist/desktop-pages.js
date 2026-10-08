(function (root) {
  'use strict';
  const index = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  function create(saved = {}) {
    let spaces = {};
    const columnId = value => typeof value === 'string' && value && value !== 'workspace' ? value : 'workspace';
    function load(value) {
      spaces = {};
      Object.entries(value || {}).forEach(([id, entry]) => {
        if (!entry || typeof entry !== 'object') return;
        spaces[id] = {
          active: index(entry.active), windows: Object.fromEntries(Object.entries(entry.windows || {}).map(([name, page]) => [name, index(page)])),
          migrated: Boolean(entry.migrated), columnsMigrated: Boolean(entry.columnsMigrated),
          activeColumn: columnId(entry.activeColumn),
          owners: Object.fromEntries(Object.entries(entry.owners || {}).map(([name, owner]) => [name, columnId(owner)])),
          columns: Object.fromEntries(Object.entries(entry.columns || {}).filter(([key]) => key !== 'workspace').map(([key, data]) => [key, {active: index(data?.active)}]))
        };
      });
      Object.entries(spaces).forEach(([id, entry]) => {
        entry.active = Math.min(entry.active, last(id, 'workspace'));
        Object.keys(entry.columns).forEach(column => { entry.columns[column].active = Math.min(entry.columns[column].active, last(id, column)); });
      });
    }
    const space = id => spaces[id] ||= { active: 0, windows: {}, migrated: false, columnsMigrated: false, activeColumn: 'workspace', owners: {}, columns: {} };
    const column = id => space(id).activeColumn;
    const columnOf = (id, name) => columnId(space(id).owners[name]);
    const columnState = (id, owner) => owner === 'workspace' ? space(id) : (space(id).columns[owner] ||= {active: 0});
    const pageOf = (id, name) => index(space(id).windows[name]);
    const last = (id, owner = column(id)) => Math.max(0, ...Object.entries(space(id).windows).filter(([name]) => columnOf(id, name) === owner).map(([, page]) => page)) + 1;
    const current = (id, owner = column(id)) => columnState(id, owner).active;
    load(saved);
    return {
      load, space, pageOf, last, current, column, columnOf,
      context: (id, page = current(id), owner = column(id)) => owner === 'workspace' ? id + ':desktop:' + page + ':' : id + ':project-column:' + encodeURIComponent(owner) + ':desktop:' + page + ':',
      visible: (id, name) => columnOf(id, name) === column(id) && pageOf(id, name) === current(id),
      inColumn: (id, name) => columnOf(id, name) === column(id),
      assign(id, name, page = current(id), owner = column(id)) {
        space(id).windows[name] = index(page);
        space(id).owners[name] = columnId(owner);
        columnState(id, columnId(owner));
      },
      select(id, owner) {
        const next = columnId(owner);
        if (column(id) === next) return false;
        space(id).activeColumn = next;
        const target = columnState(id, next);
        target.active = Math.min(target.active, last(id, next));
        return true;
      },
      go(id, page, owner = column(id)) {
        const next = Math.max(0, Math.min(index(page), last(id, owner)));
        const target = columnState(id, owner);
        if (target.active === next) return false;
        target.active = next;
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
