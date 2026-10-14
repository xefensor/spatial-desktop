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
          columns: Object.fromEntries(Object.entries(entry.columns || {}).filter(([key]) => key !== 'workspace').map(([key, data]) => [key, {active: index(data?.active)}])),
          fullscreen: Object.fromEntries(Object.entries(entry.fullscreen || {}).filter(([name]) => Object.hasOwn(entry.windows || {}, name)).map(([name, data]) => [name, {name, page:index(entry.windows[name]), column:columnId(entry.owners?.[name]), display:Math.max(1,index(data?.display))}])),
          activeFullscreen: {...entry.activeFullscreen}
        };
      });
      Object.entries(spaces).forEach(([id, entry]) => {
        entry.active = Math.min(entry.active, last(id, 'workspace'));
        Object.keys(entry.columns).forEach(column => { entry.columns[column].active = Math.min(entry.columns[column].active, last(id, column)); });
        Object.entries(entry.activeFullscreen).forEach(([owner, name]) => {
          if (entry.fullscreen[name]?.column !== owner || entry.fullscreen[name]?.page !== current(id,owner)) delete entry.activeFullscreen[owner];
        });
      });
    }
    const space = id => spaces[id] ||= { active: 0, windows: {}, migrated: false, columnsMigrated: false, activeColumn: 'workspace', owners: {}, columns: {}, fullscreen:{}, activeFullscreen:{} };
    const column = id => space(id).activeColumn;
    const columnOf = (id, name) => columnId(space(id).owners[name]);
    const columnState = (id, owner) => owner === 'workspace' ? space(id) : (space(id).columns[owner] ||= {active: 0});
    const pageOf = (id, name) => index(space(id).windows[name]);
    const last = (id, owner = column(id)) => Math.max(0, ...Object.entries(space(id).windows).filter(([name]) => columnOf(id, name) === owner).map(([, page]) => page)) + 1;
    const current = (id, owner = column(id)) => columnState(id, owner).active;
    const fullscreenBond = (id, name) => space(id).fullscreen[name] || null;
    const selectedFullscreen = (id, owner = column(id)) => fullscreenBond(id,space(id).activeFullscreen[owner]);
    function entries(id, owner = column(id)) {
      const bonds = Object.values(space(id).fullscreen).filter(bond=>bond.column===owner);
      return Array.from({length:last(id,owner)+1},(_,page)=>[
        {page,fullscreen:null},...bonds.filter(bond=>bond.page===page).map(bond=>({...bond,fullscreen:bond.name}))
      ]).flat();
    }
    function removeFullscreen(id,name) {
      const bond=fullscreenBond(id,name);if(!bond)return null;
      delete space(id).fullscreen[name];
      if(space(id).activeFullscreen[bond.column]===name)delete space(id).activeFullscreen[bond.column];
      return bond;
    }
    load(saved);
    return {
      load, space, pageOf, last, current, column, columnOf, fullscreenBond, selectedFullscreen, entries, removeFullscreen,
      context: (id, page = current(id), owner = column(id)) => owner === 'workspace' ? id + ':desktop:' + page + ':' : id + ':project-column:' + encodeURIComponent(owner) + ':desktop:' + page + ':',
      visible(id, name, display=1, displayCount=Infinity) {
        if(columnOf(id,name)!==column(id)||pageOf(id,name)!==current(id))return false;
        const selected=selectedFullscreen(id);
        if(selected && Math.min(selected.display,displayCount)===display)return selected.name===name;
        return !fullscreenBond(id,name);
      },
      inColumn: (id, name) => columnOf(id, name) === column(id),
      assign(id, name, page = current(id), owner = column(id)) {
        const bond=fullscreenBond(id,name);
        if(bond&&(bond.page!==index(page)||bond.column!==columnId(owner)))removeFullscreen(id,name);
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
        const wasFullscreen=Boolean(space(id).activeFullscreen[owner]);
        delete space(id).activeFullscreen[owner];
        if (target.active === next) return wasFullscreen;
        target.active = next;
        return true;
      },
      addFullscreen(id,name,display=1) {
        return space(id).fullscreen[name] ||= {name,page:pageOf(id,name),column:columnOf(id,name),display:Math.max(1,index(display))};
      },
      goFullscreen(id,name) {
        const bond=fullscreenBond(id,name);if(!bond)return false;
        const changed=column(id)!==bond.column||space(id).activeFullscreen[bond.column]!==name;
        space(id).activeColumn=bond.column;columnState(id,bond.column).active=bond.page;
        space(id).activeFullscreen[bond.column]=name;return changed;
      },
      next(id,direction,owner=column(id)) {
        const list=entries(id,owner),selected=selectedFullscreen(id,owner);
        const at=list.findIndex(entry=>entry.page===current(id,owner)&&entry.fullscreen===(selected?.name||null));
        return list[at+Math.sign(direction)]||null;
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
