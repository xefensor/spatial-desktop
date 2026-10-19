/* Workspace favorites launch here; visible windows already have their own place. */
(function (root) {
  'use strict';
  const area = document.querySelector('[data-widget-source="apps"]'), rack = document.getElementById('appRack');
  const region = area?.querySelector('.apps-scroll-region');
  if (!area || !region || !rack) return;
  const nav = document.createElement('nav');
  nav.id = 'appsQuickLaunch'; nav.className = 'apps-quick-launch';
  nav.setAttribute('aria-labelledby', 'appsQuickLaunchTitle');
  nav.setAttribute('aria-describedby', 'appsQuickLaunchScope');
  nav.title = 'Quick launch · Workspace favorites · Open on this desktop';
  const heading = document.createElement('h2');
  heading.id = 'appsQuickLaunchTitle'; heading.textContent = 'Quick launch';
  const scope = document.createElement('small');
  scope.id = 'appsQuickLaunchScope'; scope.className = 'apps-quick-launch-scope'; scope.textContent = 'Open on this desktop';
  const grid = document.createElement('div'); grid.className = 'apps-quick-launch-grid';
  nav.append(heading, scope, grid); region.insertBefore(nav, rack);
  let signature = '';
  const allowed = name => !root.SpatialGuide?.model?.active?.() || root.SpatialGuide.model.allows(name === 'settings' ? 'systems' : 'apps');
  const available = name => Boolean(appInfo[name] && !appInfo[name].base && (!appInfo[name].workspace || appInfo[name].workspace === activeWorkspace));
  function names() {
    const profile = workspaceProfiles[activeWorkspace];
    const favorites = (profile?.favorites || []).filter(Array.isArray).map(row => row[0]).filter(available);
    return [...new Set(favorites.length ? favorites : (profile?.rack || []).filter(available))];
  }
  function actionFor(name) {
    if (name === 'settings') return 'open';
    const state = appState[name], live = state === 'open' || state === 'minimized';
    if (appInfo[name].singleInstance && live) return 'return';
    // A launcher starts new work; only a parked card restores existing work.
    return live ? 'new' : 'open';
  }
  function refresh() {
    const launchers = names();
    const next = JSON.stringify([activeWorkspace, launchers.map(name => [name, appInfo[name].label, appInfo[name].primary])]);
    nav.hidden = !launchers.length;
    nav.dataset.workspace = activeWorkspace;
    if (signature !== next) {
      signature = next;
      const focused = document.activeElement;
      const existing = new Map(Array.from(grid.querySelectorAll('[data-quick-launch-app]'), button => [button.dataset.quickLaunchApp, button]));
      const nodes = launchers.map(name => {
        let button = existing.get(name);
        if (!button) {
          button = document.createElement('button');
          button.type = 'button'; button.className = 'apps-quick-launch-key material-glass-button control-push';
          button.dataset.quickLaunchApp = name;
          button.innerHTML = appArt(name);
          button.append(document.createElement('span'));
        }
        button.style.setProperty('--app-primary', appInfo[name].primary);
        button.querySelector('span').textContent = appInfo[name].label;
        return button;
      });
      const keep = new Set(nodes);
      for (const child of Array.from(grid.children)) if (!keep.has(child)) child.remove();
      nodes.forEach((button, index) => { if (grid.children[index] !== button) grid.insertBefore(button, grid.children[index] || null); });
      if (focused && grid.contains(focused) && document.activeElement !== focused) focused.focus({preventScroll: true});
      prepareControlSemantics(nav);
    }
    // State changes update the action hint without replacing a focused launcher.
    for (const button of grid.querySelectorAll('[data-quick-launch-app]')) {
      const name = button.dataset.quickLaunchApp, action = actionFor(name);
      const detail = action === 'return' ? 'Return to existing app on its desktop' : action === 'new' ? 'New window on this desktop' : 'Open on this desktop';
      const label = appInfo[name].label + ' · ' + detail + (appInfo[name].singleInstance ? '' : ' · Shift-click for a new window');
      button.setAttribute('aria-label', label); button.title = label + ' · Workspace favorite';
      button.disabled = !allowed(name);
    }
  }
  function activate(name, shiftKey = false) {
    if ($('.desktop-shell').inert || desktopNavigationBlocked() || !available(name) || !names().includes(name) || !allowed(name)) return false;
    // Settings keeps one window per Workspace and brings it to this desktop.
    if (name === 'settings') { launchAppHere(name); return true; }
    const action = actionFor(name);
    if (appInfo[name].singleInstance && action === 'return') {
      const bond = desktopPages.fullscreenBond?.(activeWorkspace, name);
      changeDesktopPage(desktopPages.pageOf(activeWorkspace, name), false, desktopPages.columnOf(activeWorkspace, name), bond?.name || null);
    }
    if (!appInfo[name].singleInstance && (shiftKey || action === 'new')) createAppInstance(name);
    else openApp(name);
    return true;
  }
  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-quick-launch-app]');
    if (!button || !nav.contains(button) || button.disabled || nav.hidden || area.hidden || area.inert) return;
    if (nav.dataset.workspace !== activeWorkspace) { refresh(); return; }
    activate(button.dataset.quickLaunchApp, event.shiftKey);
  });
  // Expanded buttons and compact projections use one validated command. Only
  // the expanded DOM listener owns the source area's presentation guards.
  root.SpatialAppsQuickLaunch = {refresh, names, actionFor, activate};
  refresh();
})(globalThis);
