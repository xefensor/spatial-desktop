(function () {
  'use strict';
  const panel = $('#emptyWorkspace'), grid = $('#emptyDesktopApps');
  if (!panel || !grid) return;
  const search = $('#emptyDesktopSearch'), folders = $('#emptyDesktopFolders'), files = $('#emptyDesktopFiles');
  const status = $('#emptyDesktopStatus'), clear = $('#emptyDesktopClear');
  let rendered = '', scope = '', query = '', allFolders = false, allFiles = false;
  const available = name => appInfo[name] && !appInfo[name].launcherHidden && !appInfo[name].base && (!appInfo[name].workspace || appInfo[name].workspace === activeWorkspace);
  const scopeKey = () => JSON.stringify([activeWorkspace, desktopPages.column(activeWorkspace), desktopPages.current(activeWorkspace)]);
  const allowedFiles = () => !globalThis.SpatialGuide?.model.active() || SpatialGuide.model.allows('folders');
  const blocked = () => panel.hidden || $('.desktop-shell').inert || desktopNavigationBlocked();
  function resources() {
    if (!allowedFiles() || !globalThis.SpatialEmptyDesktopResources) return {folders:[],files:[]};
    return SpatialEmptyDesktopResources.collect({workspace:activeWorkspace,column:desktopPages.column(activeWorkspace),profiles:workspaceProfiles,
      projects:projectSpaces,downloads:workspaceDownloads.snapshot(),stashRows:path=>globalThis.SpatialMemoryDesktop?.fileRows(path)});
  }
  function actionFor(name) {
    const live = appState[name] === 'open' || appState[name] === 'minimized';
    if (appInfo[name].singleInstance && live) return 'return';
    return live ? 'new' : 'open';
  }
  const matches = value => !query.trim() || matchesSearch(value, query);
  function resourceMarkup(entry) {
    const detail = /^(Workspace folder|Saved file|Saved folder|Folder|Imported file)$/.test(entry.detail) ? '' : entry.detail;
    const glyph = entry.folder ? 'i-folder' : entry.type === 'config' ? 'i-code' : entry.type === 'image' ? 'i-image' : entry.type === 'audio' ? 'i-music' : 'i-note';
    return '<button type="button" class="empty-desktop-resource" data-empty-resource="'+escapeHtml(entry.key)+'" data-empty-context="'+escapeHtml(scope)+'" title="'+escapeHtml(entry.path)+'">'+icon(glyph)+'<span><b>'+escapeHtml(entry.label)+'</b>'+(detail?'<small>'+escapeHtml(detail)+'</small>':'')+'</span>'+icon('i-right')+'</button>';
  }
  function refresh() {
    const nextScope = scopeKey();
    if (scope !== nextScope) {
      scope = nextScope; query = ''; allFolders = false; allFiles = false;
      if (search) search.value = '';
    }
    const names = Object.keys(appInfo).filter(available).filter(name=>matches(appInfo[name].label));
    const data = resources(), folderRows = data.folders.filter(row=>matches(row.label+' '+row.path+' '+row.detail));
    const fileRows = data.files.filter(row=>matches(row.label+' '+row.path+' '+row.detail))
      .sort((a,b)=>Number(a.label.startsWith('.'))-Number(b.label.startsWith('.')));
    const key = JSON.stringify([scope,query,allFolders,allFiles,names.map(name=>[name,appInfo[name].label,actionFor(name)]),folderRows,fileRows]);
    if (key === rendered) return;
    rendered = key;
    grid.innerHTML = names.map(name => {
      const info = appInfo[name], action = actionFor(name);
      const detail = action === 'return' ? 'Return to app' : action === 'new' ? 'New window here' : 'Open here';
      return '<button class="empty-desktop-app" type="button" data-empty-app="' + escapeHtml(name) + '" aria-label="' + escapeHtml(info.label + ' · ' + detail) + '" title="' + escapeHtml(info.label + ' · ' + detail) + '" style="--app-primary:' + info.primary + '">' + appArt(name) + '<b>' + escapeHtml(info.label) + '</b>' + (action === 'open' ? '' : '<small>' + detail + '</small>') + '</button>';
    }).join('');
    if (folders && files) {
      const searching = Boolean(query.trim());
      folders.innerHTML = (searching || allFolders ? folderRows : folderRows.slice(0,6)).map(resourceMarkup).join('');
      files.innerHTML = (searching || allFiles ? fileRows : fileRows.slice(0,4)).map(resourceMarkup).join('');
      for (const [kind,rows,expanded,limit] of [['Folders',folderRows,allFolders,6],['Files',fileRows,allFiles,4]]) {
        const section = $('#emptyDesktop'+kind+'Section'), more = $('#emptyDesktopMore'+kind);
        if (section) section.hidden = !allowedFiles() || (searching && !rows.length);
        if (more) {more.hidden = searching || rows.length <= limit; more.textContent = expanded ? 'Show fewer' : 'Show all '+kind.toLowerCase()+' ('+rows.length+')';more.setAttribute('aria-expanded',String(expanded));}
      }
      const appSection = $('#emptyDesktopAppsSection'); if (appSection) appSection.hidden = searching && !names.length;
      const emptyFiles = $('#emptyDesktopFilesEmpty'); if (emptyFiles) emptyFiles.hidden = fileRows.length > 0 || searching;
      if (clear) clear.hidden = !searching;
      if (status) {status.hidden = !searching;status.textContent = (names.length+folderRows.length+fileRows.length) ? (names.length+folderRows.length+fileRows.length)+(names.length+folderRows.length+fileRows.length===1?' match':' matches') : 'No matches here. Try another name.';}
    }
  }
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-empty-app]');
    if (!button || blocked()) return;
    const name = button.dataset.emptyApp;
    if (!available(name)) return;
    launchAppHere(name, event.shiftKey);
  });
  for (const host of [folders,files]) host?.addEventListener('click',event=>{
    const button=event.target.closest('[data-empty-resource]');
    if (!button || !host.contains(button) || blocked() || !allowedFiles() || button.dataset.emptyContext!==scopeKey()) return;
    const data=resources(), entry=[...data.folders,...data.files].find(row=>row.key===button.dataset.emptyResource);
    if (!entry) {refresh();return;}
    const id=createAppInstance('dolphin'); if (!id) return;
    renderFileLocation(id,entry.folder?entry.path:entry.directory);
    if (!entry.folder) openAppFile(id,entry.name);
    captureWorkspaceContent();
  });
  search?.addEventListener('input',()=>{query=search.value;allFolders=false;allFiles=false;refresh();});
  search?.addEventListener('keydown',event=>{
    if (event.key==='Escape' && query) {event.preventDefault();event.stopPropagation();query='';search.value='';refresh();}
    else if(event.key==='Enter' && query.trim()) {event.preventDefault();event.stopPropagation();panel.querySelector('[data-empty-app],[data-empty-resource]')?.click();}
  });
  clear?.addEventListener('click',()=>{query='';if(search)search.value='';refresh();search?.focus();});
  for (const kind of ['Folders','Files']) $('#emptyDesktopMore'+kind)?.addEventListener('click',()=>{
    if (kind==='Folders') allFolders=!allFolders;else allFiles=!allFiles;refresh();
  });
  panel.addEventListener('wheel', event => {
    const launcher = event.target.closest('.empty-desktop-launcher');
    if (launcher && !globalThis.SpatialDemoSuper?.held() && !event.metaKey && !event.getModifierState?.('OS') && !event.shiftKey && !event.ctrlKey && launcher.scrollHeight > launcher.clientHeight + 1) event.stopPropagation();
  }, { passive: true });
  $('#emptyDesktopAllApps').addEventListener('click', () => {
    if (blocked()) return;
    setUniversalSearchOpen(true);
    globalThis.SpatialOverviewDesktop?.select('apps', false);
  });
  globalThis.SpatialEmptyDesktop = { refresh };
  refresh();
})();
