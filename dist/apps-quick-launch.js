/* Workspace favorites launch here; visible windows already have their own place. */
(function (root) {
  'use strict';
  const area = areaFor('apps'), rack = document.getElementById('appRack');
  const region = area?.querySelector('.apps-scroll-region');
  if (!area || !region || !rack) return;
  const nav = document.createElement('nav');
  nav.id = 'appsQuickLaunch'; nav.className = 'apps-quick-launch';
  nav.setAttribute('aria-labelledby', 'appsQuickLaunchTitle');
  const heading = document.createElement('h2');
  heading.id = 'appsQuickLaunchTitle'; heading.textContent = 'Quick launch';
  const grid = document.createElement('div'); grid.className = 'apps-quick-launch-grid';
  nav.append(heading, grid); region.insertBefore(nav, rack);
  let signature = '';
  const allowed = () => !root.SpatialGuide?.model.active() || SpatialGuide.model.allows('apps');
  const available = name => Boolean(appInfo[name] && !appInfo[name].base && (!appInfo[name].workspace || appInfo[name].workspace === activeWorkspace));
  function names() {
    const profile = workspaceProfiles[activeWorkspace];
    const favorites = (profile?.favorites || []).filter(Array.isArray).map(row => row[0]).filter(available);
    return [...new Set(favorites.length ? favorites : (profile?.rack || []).filter(available))];
  }
  function actionFor(name) {
    const state = appState[name], live = state === 'open' || state === 'minimized';
    if (appInfo[name].singleInstance && live) return 'return';
    // A launcher starts new work; only a parked card restores existing work.
    return live ? 'new' : 'open';
  }
  function refresh() {
    const launchers = names();
    const next = JSON.stringify([activeWorkspace, launchers.map(name => [name, appInfo[name].label, appInfo[name].primary])]);
    nav.hidden = !launchers.length;
    if (signature !== next) {
      signature = next;
      grid.replaceChildren(...launchers.map(name => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'apps-quick-launch-key material-glass-button control-push';
        button.dataset.quickLaunchApp = name; button.style.setProperty('--app-primary', appInfo[name].primary);
        button.innerHTML = appArt(name);
        const label = document.createElement('span'); label.textContent = appInfo[name].label; button.append(label);
        return button;
      }));
      prepareControlSemantics(nav);
    }
    // State changes update the action hint without replacing a focused launcher.
    for (const button of grid.querySelectorAll('[data-quick-launch-app]')) {
      const name = button.dataset.quickLaunchApp, action = actionFor(name);
      const detail = action === 'return' ? 'Return to app' : action === 'new' ? 'New window here' : 'Open here';
      const label = appInfo[name].label + ' · ' + detail + (appInfo[name].singleInstance ? '' : ' · Shift-click for a new window');
      button.setAttribute('aria-label', label); button.title = label;
    }
  }
  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-quick-launch-app]');
    if (!button || !nav.contains(button) || nav.hidden || area.hidden || area.inert || $('.desktop-shell').inert || desktopNavigationBlocked() || !allowed()) return;
    const name = button.dataset.quickLaunchApp;
    if (!available(name) || !names().includes(name)) return;
    const action = actionFor(name);
    if (appInfo[name].singleInstance && action === 'return') {
      const bond = desktopPages.fullscreenBond?.(activeWorkspace, name);
      changeDesktopPage(desktopPages.pageOf(activeWorkspace, name), false, desktopPages.columnOf(activeWorkspace, name), bond?.name || null);
    }
    if (!appInfo[name].singleInstance && (event.shiftKey || action === 'new')) createAppInstance(name);
    else openApp(name);
  });
  root.SpatialAppsQuickLaunch = {refresh};
  refresh();
})(globalThis);
