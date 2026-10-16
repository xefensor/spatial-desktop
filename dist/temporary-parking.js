/* Read-only provenance for windows temporarily parked by bounded maximize. */
(function (root) {
  'use strict';
  const owns = (object, key) => Boolean(object && Object.hasOwn(object, key));
  const columnId = value => typeof value === 'string' && value && value !== 'workspace' ? value : 'workspace';
  function classify({sessions = {}, workspace, column, pages = {}, appState = {}, assignments = {}, displayCount = 1} = {}) {
    const byWindow = Object.create(null), groups = [];
    if (typeof workspace !== 'string' || !workspace || !owns(pages, workspace)) return {byWindow, groups};
    const space = pages[workspace], ownerColumn = columnId(column ?? space.activeColumn);
    const prefix = ownerColumn === 'workspace' ? workspace + ':desktop:' : workspace + ':project-column:' + encodeURIComponent(ownerColumn) + ':desktop:';
    const count = Number.isSafeInteger(displayCount) && displayCount > 0 ? displayCount : 1;
    const member = (name, page, display) => owns(space.windows, name)
      && columnId(space.owners?.[name]) === ownerColumn && space.windows[name] === page
      && !space.fullscreen?.[name]
      && (count === 1 || Number(assignments[name] || 1) === display);
    Object.entries(sessions).forEach(([sessionKey, session]) => {
      if (!sessionKey.startsWith(prefix)) return;
      const location = /^(0|[1-9]\d*):([1-9]\d*)$/.exec(sessionKey.slice(prefix.length));
      if (!location) return;
      const page = Number(location[1]), display = Number(location[2]), focus = session?.focus, owner = focus?.name;
      if (!Number.isSafeInteger(page) || display > count || !Number.isSafeInteger(display)
        || typeof owner !== 'string' || appState[owner] !== 'open' || !member(owner, page, display)
        || session.fullscreen || session.root?.kind !== 'window' || session.root.name !== owner
        || !Array.isArray(focus.parked)) return;
      const windows = [...new Set(focus.parked)].filter(id => typeof id === 'string' && id !== owner
        && appState[id] === 'minimized' && member(id, page, display)
        // Manual Park removes this record. Membership alone can outlive a
        // deliberate action, so it must never promise an automatic return.
        && owns(session.parked, id) && session.parked[id] && typeof session.parked[id] === 'object');
      if (!windows.length) return;
      const metadata = {owner, page, display, column:ownerColumn, sessionKey, mode:'maximized'};
      windows.forEach(id => { byWindow[id] = {id, ...metadata}; });
      groups.push({key:sessionKey, ...metadata, windows});
    });
    groups.sort((a,b) => a.page-b.page || a.display-b.display || a.key.localeCompare(b.key));
    return {byWindow, groups};
  }
  const api = {classify};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpatialTemporaryParking = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
