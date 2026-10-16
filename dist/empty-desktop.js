(function () {
  'use strict';
  const panel = $('#emptyWorkspace'), grid = $('#emptyDesktopApps');
  if (!panel || !grid) return;
  let rendered = '';
  const available = name => appInfo[name] && !appInfo[name].base && (!appInfo[name].workspace || appInfo[name].workspace === activeWorkspace);
  function actionFor(name) {
    const live = appState[name] === 'open' || appState[name] === 'minimized';
    if (appInfo[name].singleInstance && live) return 'return';
    return live ? 'new' : 'open';
  }
  function refresh() {
    // Keep the focused button stable through focus-only updates and display sync.
    const names = Object.keys(appInfo).filter(available);
    const key = JSON.stringify([activeWorkspace, desktopPages.column(activeWorkspace), desktopPages.current(activeWorkspace), names.map(name => [name, appInfo[name].label, actionFor(name)])]);
    if (key === rendered) return;
    rendered = key;
    grid.innerHTML = names.map(name => {
      const info = appInfo[name], action = actionFor(name);
      const detail = action === 'return' ? 'Return to app' : action === 'new' ? 'New window here' : 'Open here';
      return '<button class="empty-desktop-app" type="button" data-empty-app="' + escapeHtml(name) + '" aria-label="' + escapeHtml(info.label + ' · ' + detail) + '" title="' + escapeHtml(info.label + ' · ' + detail) + '" style="--app-primary:' + info.primary + '">' + appArt(name) + '<b>' + escapeHtml(info.label) + '</b><small>' + detail + '</small></button>';
    }).join('');
  }
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-empty-app]');
    if (!button || panel.hidden || $('.desktop-shell').inert || desktopNavigationBlocked()) return;
    const name = button.dataset.emptyApp;
    if (!available(name)) return;
    launchAppHere(name, event.shiftKey);
  });
  panel.addEventListener('wheel', event => {
    const launcher = event.target.closest('.empty-desktop-launcher');
    if (launcher && !globalThis.SpatialDemoSuper?.held() && !event.metaKey && !event.getModifierState?.('OS') && !event.shiftKey && !event.ctrlKey && launcher.scrollHeight > launcher.clientHeight + 1) event.stopPropagation();
  }, { passive: true });
  $('#emptyDesktopAllApps').addEventListener('click', () => {
    if (panel.hidden || $('.desktop-shell').inert || desktopNavigationBlocked()) return;
    setUniversalSearchOpen(true);
    globalThis.SpatialOverviewDesktop?.select('apps', false);
  });
  globalThis.SpatialEmptyDesktop = { refresh };
  refresh();
})();
