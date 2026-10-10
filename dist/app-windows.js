/* App content has the same independent identity as its window. */
let appWindowsReady = false;
let appWindowsHydrating = false;
let appWindowStore;
function saveAppWindows(broadcast = true) {
  if (!appWindowsReady) return;
  try { localStorage.setItem('spatial-app-windows-v1', JSON.stringify(appWindowStore.snapshot())); } catch {}
  if (broadcast) queueDesktopStateBroadcast(120);
}
function appWindowModel(id) {
  const frame = frameFor(id), kind = appInfo[id]?.base || id;
  return appWindowStore.get(activeWorkspace, id, () => {
    if (kind === 'dolphin') return {kind, navigation: SpatialAppTools.navigation(frame.dataset.fileLocation || workspaceProfiles[activeWorkspace].home), query: '', search: false, grid: false, sort: 'name', selected: null};
    if (kind === 'notes') {
      const title = $('.app-identity small', frame).textContent || 'Notes';
      return {kind, active: 'main', sequence: 1, notes: [{id:'main', title, text:$('.notes-layout textarea', frame).value}]};
    }
    if (kind === 'browser') return {kind, navigation: SpatialAppTools.navigation(readBrowserPage(frame))};
    if (kind === 'terminal') {
      const owner = desktopPages.columnOf(activeWorkspace, id);
      return {kind, cwd: projectSpaces[owner]?.root || workspaceProfiles[activeWorkspace].home,
        history: [], historyIndex: 0, draft: '', lines: $$('.terminal-screen > p', frame).map(line => line.textContent)};
    }
    const tracks = $$('.playlist .content-row', frame).map(row => {
      const duration = row.lastElementChild.textContent.split(':').map(Number);
      return {title: $('span', row).textContent.replace(/^\s*\d+[\s·]+/, '').trim(), artist: $('small', row)?.textContent || 'Northbound', duration: duration[0] * 60 + duration[1] || 218};
    });
    return {kind, tracks, index: 0, position: id === 'elisa' ? musicPosition : 0, playing: id === 'elisa' && appState[id] !== 'closed' ? musicPlaying : false, volume: Number($('.volume-range', frame)?.value || 72), muted: false};
  });
}
function appActionButton(action, glyph, label, attributes = '') {
  return '<button class="surface-key compact-key" data-app-action="' + action + '" aria-label="' + label + '" title="' + label + '" ' + attributes + '>' + icon(glyph) + '</button>';
}
function hydrateAppWindow(id, force = false) {
  const frame = frameFor(id);
  if (!frame || (!force && id.includes("--") && appState[id] === "closed")) return;
  frame.dataset.appReadyWorkspace = activeWorkspace;
  const kind = appInfo[id].base || id;
  frame.dataset.appKind = kind;
  const model = appWindowModel(id);
  if (kind === 'dolphin') {
    renderFileLocation(id, SpatialAppTools.current(model.navigation), {history: false});
  } else if (kind === 'notes') {
    if (!$('.note-editor', frame)) {
      const editor = document.createElement('section'); editor.className = 'note-editor';
      const text = $('.notes-layout textarea', frame);
      text.before(editor); editor.append(text);
      editor.insertAdjacentHTML('afterbegin', '<header class="note-toolbar"><input data-note-title aria-label="Note title" maxlength="80" placeholder="Untitled note"><span data-note-save-state>Saved</span></header>');
      editor.insertAdjacentHTML('beforeend', '<footer class="note-status"><span data-note-count></span><span>Autosaved · Ctrl+S</span></footer>');
      text.placeholder = 'Start writing…';
    }
    renderNotes(id);
  } else if (kind === 'browser') {
    $('.browser-toolbar', frame).innerHTML = '<div class="key-group">' + appActionButton('browser-back','i-left','Back · Alt+Left') + appActionButton('browser-forward','i-right','Forward · Alt+Right') + appActionButton('browser-reload','i-refresh','Reload') + '</div><label class="recessed-field"><svg><use href="#i-web"/></svg><input aria-label="Address" autocomplete="off" spellcheck="false"></label>' + appActionButton('browser-home','i-grid','Start page');
    renderBrowserPage(id);
  } else if (kind === 'terminal') {
    if (!$('.terminal-context', frame)) $('.terminal-screen', frame).insertAdjacentHTML('beforebegin', '<div class="terminal-context"><span>Demo shell</span><span>↑↓ History · Ctrl+L Clear</span></div>');
    renderTerminal(id);
  } else if (kind === 'elisa') {
    const volume = $('.volume-icon', frame);
    if (volume) volume.outerHTML = '<button class="surface-key music-key" data-music="mute" aria-label="Mute" aria-pressed="false" title="Mute">' + icon('i-volume') + '</button>';
    if (!$('.music-library-status', frame)) frame.insertAdjacentHTML('beforeend', '<footer class="music-library-status"><span>Demo library</span><span data-music-track-count></span></footer>');
    renderAppMusic(id);
  }
  prepareControlSemantics(frame);
  if (kind === 'elisa') renderAppMusic(id);
}
function appFileRows(id, path) {
  const frame = frameFor(id);
  const otherHome = Object.entries(workspaceProfiles).find(([,profile])=>profile.home===path);
  const otherProjects = Object.entries(workspaceProfiles).find(([,profile])=>profile.home+'/Projects'===path);
  const rows = otherHome ? [...otherHome[1].folders] : otherProjects ? Object.values(projectSpaces).filter(project=>project.originWorkspace===otherProjects[0]).map(project=>[project.name,'Project','folder',project.root]) : fileLocationRows(frame, path);
  const seen = new Set(rows.map(row => row[0]));
  const targets=new Set(rows.map(([name,,,target])=>target||path.replace(/\/$/,'')+'/'+name));
  const directories=[...Object.values(workspaceProfiles).flatMap(profile=>[profile.home,...SpatialHomeFolders.standard.map(name=>profile.home+'/'+name),profile.home+'/Projects']),...Object.values(projectSpaces).flatMap(project=>[project.root,...project.files.filter(([, ,type])=>type==='folder').map(([name])=>project.root+'/'+name)]),...workspaceDownloads.snapshot().directories];
  directories.forEach(directory => {
    const prefix=path==='/'?'/':path.replace(/\/$/,'')+'/';
    if(!directory.startsWith(prefix))return;
    const name=directory.slice(prefix.length).split('/')[0];
    const target=prefix+name;
    if(name&&!seen.has(name)&&!targets.has(target)){rows.push([name,'Folder','folder',target]);seen.add(name);targets.add(target);}
  });
  return rows;
}
function appFileBreadcrumbs(path) {
  const profile = Object.values(workspaceProfiles).filter(profile=>path===profile.home||path.startsWith(profile.home+'/')).sort((a,b)=>b.home.length-a.home.length)[0] || workspaceProfiles[activeWorkspace];
  const home = profile.home;
  const inside = path === home || path.startsWith(home + '/');
  const entries = inside ? [[profile.label + ' Home', home]] : [['Filesystem', '/']];
  let cursor = inside ? home : '';
  (inside ? path.slice(home.length) : path).split('/').filter(Boolean).forEach(part => { cursor += '/' + part; entries.push([part, cursor]); });
  return entries.map(([label, target], index) => (index ? '<span aria-hidden="true">›</span>' : '') + '<button class="surface-key" data-file-path="' + escapeHtml(target) + '"' + (index === entries.length-1 ? ' aria-current="page"' : '') + ' title="' + escapeHtml(target) + '">' + escapeHtml(label) + '</button>').join('');
}
function renderAppFiles(id, path, {history = true} = {}) {
  const frame = frameFor(id), model = appWindowModel(id);
  const previousPath=frame.dataset.fileLocation,previousQuery=frame.dataset.fileQuery;
  if (history && path !== SpatialAppTools.current(model.navigation)) {
    SpatialAppTools.visit(model.navigation, path); model.query = ''; model.selected = null;
  }
  frame.dataset.fileLocation = path; frame.dataset.fileWorkspace = activeWorkspace;
  $('.address-bar input', frame).value = path;
  $('.app-identity small', frame).textContent = path === workspaceProfiles[activeWorkspace].home ? 'Home' : path.split('/').at(-1) || 'Filesystem';
  appInfo[id].detail=$('.app-identity small',frame).textContent;
  $('.app-toolbar', frame).innerHTML = '<div class="key-group">' + appActionButton('file-back','i-left','Back · Alt+Left') + appActionButton('file-forward','i-right','Forward · Alt+Right') + appActionButton('file-up','i-up','Parent folder · Alt+Up') + '</div><label class="recessed-field address-bar"><svg><use href="#i-folder"/></svg><input aria-label="Location" autocomplete="off" spellcheck="false" value="' + escapeHtml(path) + '"></label>' + appActionButton('file-search','i-search','Search this folder · Ctrl+F','aria-pressed="' + model.search + '"') + appActionButton('file-new-folder','i-add','New folder');
  const module = $('.files-module', frame);
  if (!$('.file-navigation', module)) {
    $('.folder-tabs', module)?.remove();
    module.insertAdjacentHTML('afterbegin', '<div class="file-navigation"><nav class="file-breadcrumbs" aria-label="Folder path"></nav><div class="file-options"><label class="file-filter recessed-field" hidden><svg><use href="#i-search"/></svg><input data-file-filter aria-label="Filter files" placeholder="Filter this folder"></label><label class="file-sort"><span>Sort</span><select data-file-sort aria-label="Sort files"><option value="name">Name</option><option value="type">Type</option></select></label>' + appActionButton('file-view','i-grid','Grid view','aria-pressed="false"') + '</div></div>');
    $('.file-well', frame).insertAdjacentHTML('beforeend', '<section class="file-preview" hidden aria-label="File preview"></section>');
  }
  $('.file-breadcrumbs', frame).innerHTML = appFileBreadcrumbs(path);
  $('.file-filter', frame).hidden = !model.search;
  $('[data-file-filter]', frame).value = model.query;
  $('[data-file-sort]', frame).value = model.sort;
  const view = $('[data-app-action="file-view"]', frame);
  view.setAttribute('aria-pressed', String(model.grid));
  view.title = model.grid ? 'List view' : 'Grid view'; view.setAttribute('aria-label', view.title);
  $('.file-well', frame).classList.toggle('is-file-grid', model.grid);
  if(previousPath!==path||previousQuery!==model.query)$('.file-preview', frame).hidden = true;
  frame.dataset.fileQuery=model.query;
  const rows = appFileRows(id, path).filter(([label]) => label.toLocaleLowerCase().includes(model.query.toLocaleLowerCase())).sort((a,b) => (model.sort === 'type' ? Number(b[2] === 'folder') - Number(a[2] === 'folder') : 0) || a[0].localeCompare(b[0], undefined, {numeric: true}));
  $('.file-head', frame).innerHTML = '<span>Name</span><span>Details</span><span>Kind</span>';
  $('.file-list', frame).innerHTML = rows.map(([label, detail, type, target]) => '<button class="content-row' + (model.selected === label ? ' is-selected' : '') + '" role="option" aria-selected="' + (model.selected === label) + '" data-file-name="' + escapeHtml(label) + '"' + (type === 'folder' ? ' data-file-folder="' + escapeHtml(target || path.replace(/\/$/,'') + '/' + label) + '"' : '') + ' title="' + escapeHtml(label) + '"><span><svg class="file-entry-icon"><use href="#' + (type === 'folder' ? 'i-folder' : type === 'config' ? 'i-code' : 'i-note') + '"/></svg><b>' + escapeHtml(label) + '</b></span><small>' + escapeHtml(detail) + '</small><small>' + (type === 'folder' ? 'Folder' : type === 'config' ? 'Config' : 'File') + '</small></button>').join('') || '<p class="file-folder-empty">' + icon(model.query ? 'i-search' : 'i-folder') + '<b>' + (model.query ? 'No matching files' : 'This folder is empty') + '</b><span>' + (model.query ? 'Try a different name.' : 'Create a folder or save a demo download here.') + '</span></p>';
  const status = $('.app-status', frame);
  status.innerHTML = '<span>' + rows.length + (rows.length === 1 ? ' item' : ' items') + (model.selected ? ' · ' + escapeHtml(model.selected) : '') + '</span><span>Double-click to open</span>';
  $('[data-app-action="file-back"]', frame).disabled = model.navigation.index === 0;
  $('[data-app-action="file-forward"]', frame).disabled = model.navigation.index === model.navigation.items.length-1;
  $('[data-app-action="file-up"]', frame).disabled = path === '/';
  $$('[data-home-folder]', frame).forEach(button => {
    const target = SpatialHomeFolders.folder(workspaceProfiles, activeWorkspace, button.dataset.homeFolder);
    button.title = button.dataset.homeFolder + ' · ' + target;
    const selected = path === target || (button.dataset.homeFolder !== 'Home' && path.startsWith(target + '/'));
    button.setAttribute('aria-pressed', String(selected)); button.classList.toggle('is-active', selected);
  });
  prepareControlSemantics(frame);
  saveAppWindows(false);
}
function openAppFile(id, name) {
  const model = appWindowModel(id), frame = frameFor(id), path = SpatialAppTools.current(model.navigation);
  const row = appFileRows(id,path).find(row => row[0] === name);
  if (!row) return;
  if (row[2] === 'folder') { renderFileLocation(id,row[3] || path.replace(/\/$/,'') + '/' + row[0]); saveAppWindows(); return; }
  const file = workspaceDownloads.list(path).find(file => file.name === name);
  const project = Object.values(projectSpaces).find(project => project.root === path);
  let text = file?.content;
  if (name === '.spatial-project.toml' && project) text = 'name = ' + JSON.stringify(project.name) + '\nroot = ' + JSON.stringify(project.root) + '\ndownload_to_project = ' + Boolean(project.downloadToProject);
  if (name === '.spatial-workspace.toml') text = 'name = ' + JSON.stringify(workspaceProfiles[activeWorkspace].label) + '\nhome = ' + JSON.stringify(workspaceProfiles[activeWorkspace].home);
  if (text === undefined) text = 'Example file: ' + name + '\n' + row[1] + '\n\nThis sample has no file contents attached.';
  const preview = $('.file-preview', frame);
  preview.innerHTML = '<header><div><b>' + escapeHtml(name) + '</b><small>' + escapeHtml(path) + '</small></div>' + appActionButton('file-preview-close','i-close','Close file preview') + '</header><pre>' + escapeHtml(text) + '</pre>';
  preview.hidden = false; prepareControlSemantics(preview);
}
function newAppFolder(id) {
  const model = appWindowModel(id), path = SpatialAppTools.current(model.navigation);
  const used = new Set(appFileRows(id,path).map(row=>row[0]));
  let name = 'New folder', number = 2;
  while (used.has(name)) name = 'New folder ' + number++;
  workspaceDownloads.ensure(path.replace(/\/$/,'') + '/' + name); persistDownloads();
  model.query = ''; model.selected = name;
  $('.file-preview',frameFor(id)).hidden=true;
  renderFileLocation(id,path,{history:false}); saveAppWindows();
}
function renderNotes(id) {
  const frame = frameFor(id), model = appWindowModel(id), note = SpatialAppTools.activeNote(model);
  $('.notes-layout nav', frame).innerHTML = '<span class="small-heading">NOTES</span>' + model.notes.map(item=>'<button class="nav-choice' + (item.id===note.id?' is-active':'') + '" data-note-id="' + escapeHtml(item.id) + '" aria-pressed="' + (item.id===note.id) + '" title="' + escapeHtml(item.title || 'Untitled') + '">' + icon('i-note') + '<span>' + escapeHtml(item.title || 'Untitled') + '</span></button>').join('') + '<button class="surface-key note-new" data-app-action="note-new">' + icon('i-add') + '<span>New note</span></button>';
  $('.notes-layout textarea',frame).value = note.text;
  $('[data-note-title]', frame).value = note.title;
  $('.app-identity small',frame).textContent = note.title || 'Untitled';
  appInfo[id].detail=note.title || 'Untitled';
  updateNoteStatus(id); prepareControlSemantics(frame);
}
function updateNoteStatus(id) {
  const frame = frameFor(id), note = SpatialAppTools.activeNote(appWindowModel(id));
  $('[data-note-count]',frame).textContent = SpatialAppTools.words(note.text) + ' words · ' + note.text.length + ' characters';
  $('[data-note-save-state]',frame).textContent = 'Saved';
}
function readBrowserPage(frame) {
  const page = $('.demo-reading-page', frame);
  return {address:$('.browser-toolbar input',frame)?.value || 'Start', title:page?.querySelector('h2')?.textContent || 'Start page',
    subtitle:page?.querySelector('.small-heading')?.textContent || workspaceProfiles[activeWorkspace].label + ' workspace',
    intro:page?.querySelector('p')?.textContent || 'Your workspace, your pages. Choose a shortcut or enter an address.',
    detail:page?.querySelector('.demo-page-detail p')?.textContent || 'Local demo pages and downloads stay with this window.',
    links:page ? [...page.querySelectorAll('[data-demo-link]')].map(button=>button.textContent) : ['Mail','Calendar','News','Weather']};
}
function renderBrowserPage(id) {
  const frame=frameFor(id), model=appWindowModel(id), page=SpatialAppTools.current(model.navigation);
  $('.browser-toolbar input',frame).value=page.address;
  $('.app-identity small',frame).textContent=page.title;appInfo[id].detail=page.title;
  $('.start-page',frame).innerHTML='<div class="demo-reading-page"><span class="small-heading">' + escapeHtml(page.subtitle) + '</span><h2>' + escapeHtml(page.title) + '</h2><p>' + escapeHtml(page.intro) + '</p><div class="site-grid">' + page.links.map(label=>'<button class="surface-key" data-demo-link="' + escapeHtml(label) + '">' + escapeHtml(label) + icon('i-right') + '</button>').join('') + '</div><section class="demo-page-detail"><h3>Page notes</h3><p>' + escapeHtml(page.detail) + '</p>' + (page.external ? '<a class="browser-external-link" href="' + escapeHtml(page.external) + '" target="_blank" rel="noopener noreferrer">Open in your browser ↗</a>' : '') + '</section></div>';
  $('[data-app-action="browser-back"]',frame).disabled=model.navigation.index===0;
  $('[data-app-action="browser-forward"]',frame).disabled=model.navigation.index===model.navigation.items.length-1;
  refreshDownloadUi(); prepareControlSemantics(frame);
}
function navigateBrowser(id, address) {
  const model=appWindowModel(id);
  const remembered=model.navigation.items.find(page=>page.address.toLocaleLowerCase()===address.toLocaleLowerCase() || page.title.toLocaleLowerCase()===address.toLocaleLowerCase());
  let external='';
  try { const url=new URL(address.includes('://')?address:'https://'+address); if (['https:','http:'].includes(url.protocol) && (address.includes('://') || /^[\w-]+\.[\w.-]+(?:\/.*)?$/.test(address))) external=url.href; } catch {}
  const source=SpatialAppTools.current(model.navigation);
  const page=remembered || {address,title:address,subtitle:workspaceProfiles[activeWorkspace].label+' · Web preview',
    intro:external?'This address opens outside the desktop prototype.':address+' · local demonstration page',
    detail:external?'The prototype cannot display external websites here. Use the link below to open this address.':source.detail,
    links:[],external};
  SpatialAppTools.visit(model.navigation,page);
  workspaceContent[activeWorkspace] ||= {frames:{},history:[]};
  (workspaceContent[activeWorkspace].history ||= []).push({address:page.address,time:Date.now()});
  saveIndependentSessions();renderBrowserPage(id);saveAppWindows();
}
function terminalAppContext(id) {
  const frame=frameFor(id), home=workspaceProfiles[activeWorkspace].home;
  const paths=new Set([home,'/',...Object.values(workspaceProfiles).flatMap(profile=>[profile.home,profile.home+'/Projects',...SpatialHomeFolders.standard.map(name=>profile.home+'/'+name)]),...Object.values(projectSpaces).map(project=>project.root),...workspaceDownloads.snapshot().directories]);
  // Sample subfolders are navigable, without claiming access to native files.
  Object.values(projectSpaces).forEach(project=>project.files.filter(([, , type])=>type==='folder').forEach(([name])=>paths.add(project.root+'/'+name)));
  [...paths].forEach(path=>{let parent=path.slice(0,path.lastIndexOf('/'));while(parent){paths.add(parent);parent=parent.slice(0,parent.lastIndexOf('/'));}});
  const environment=Object.fromEntries(SpatialHomeFolders.standard.map(name=>['XDG_'+name.toUpperCase().replace('DOWNLOADS','DOWNLOAD').replace('PUBLIC','PUBLICSHARE')+'_DIR',home+'/'+name]));
  return {home,environment,exists:path=>paths.has(path),list:path=>appFileRows(id,path).map(row=>row[0]),frame};
}
function renderTerminal(id) {
  const model=appWindowModel(id), frame=frameFor(id), screen=$('.terminal-screen',frame);
  $$('.terminal-screen > p',frame).forEach(line=>line.remove());
  const label=$('label',screen);
  model.lines.slice(-200).forEach(text=>{const line=document.createElement('p');line.className='terminal-output';line.textContent=text;label.before(line);});
  $('i',label).textContent=model.cwd===workspaceProfiles[activeWorkspace].home?'~':model.cwd;
  $('.app-identity small',frame).textContent=model.cwd;appInfo[id].detail=model.cwd;
  screen.scrollTop=screen.scrollHeight;
}
function runAppCommand(id, command) {
  const model=appWindowModel(id), frame=frameFor(id);
  if (!command.trim()) return;
  const result=SpatialAppTools.terminal(command,model.cwd,terminalAppContext(id));
  if (model.history.at(-1)!==command) model.history.push(command);
  model.history=model.history.slice(-100); model.historyIndex=model.history.length;
  if (result.clear) model.lines=[];
  else {model.lines.push('demo@desktop:'+model.cwd+'$ '+command); if(result.output)model.lines.push(result.output);}
  model.lines=model.lines.slice(-200); model.cwd=result.cwd; model.draft='';
  $('.terminal-screen input',frame).value='';
  if (id==='terminal') terminalPreview=result.output || 'Ready for a command';
  renderTerminal(id); saveAppWindows();
}
function renderAppMusic(id) {
  const model=appWindowModel(id), frame=frameFor(id), track=model.tracks[model.index];
  if (!track) return;
  $('.app-identity small',frame).textContent=track.title;appInfo[id].detail=track.title;
  $('.track-copy h2',frame).textContent=track.title; $('.track-copy p',frame).textContent=track.artist;
  frame.classList.toggle('is-music-playing',model.playing);
  const trackKey=JSON.stringify(model.tracks);
  if(frame.dataset.musicTrackKey!==trackKey){
    frame.dataset.musicTrackKey=trackKey;
    $('.playlist',frame).innerHTML=model.tracks.map((item,index)=>'<button class="content-row' + (index===model.index?' is-selected':'') + '" data-track-index="' + index + '" aria-pressed="' + (index===model.index) + '"><span><b>' + String(index+1).padStart(2,'0') + '</b>' + escapeHtml(item.title) + '</span><small>' + escapeHtml(item.artist) + '</small><small>' + formatTime(item.duration) + '</small></button>').join('');
    prepareControlSemantics($('.playlist',frame));
  }
  $$('[data-track-index]',frame).forEach(button=>{const selected=Number(button.dataset.trackIndex)===model.index;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));});
  const cards=$$('[data-mini-card]').filter(card=>card.dataset.miniCard===id);
  [frame,...cards].forEach(surface=>{
    $$('[data-music="play"]',surface).forEach(button=>{button.innerHTML=icon(model.playing?'i-pause':'i-play');button.classList.toggle('is-active',model.playing);button.setAttribute('aria-pressed',String(model.playing));button.title=model.playing?'Pause':'Play';button.setAttribute('aria-label',button.title);});
    $$('.track-range',surface).forEach(range=>{range.max=track.duration;range.value=model.position;updateRangeLight(range);});
    const elapsed=$('[data-music-elapsed]',surface);if(elapsed)elapsed.textContent=formatTime(model.position);
    const miniTitle=$('.mini-track b',surface);if(miniTitle)miniTitle.textContent=track.title;
    const miniDetail=$('.mini-track small',surface);if(miniDetail)miniDetail.textContent=track.artist+' · '+formatTime(model.position)+' / '+formatTime(track.duration);
  });
  const range=$('.track-range',frame);
  range.previousElementSibling.textContent=formatTime(model.position);range.nextElementSibling.textContent=formatTime(track.duration);
  $('.volume-range',frame).value=model.volume; updateRangeLight($('.volume-range',frame));
  const mute=$('[data-music="mute"]',frame);
  mute?.setAttribute('aria-pressed',String(model.muted));mute?.setAttribute('aria-label',model.muted?'Unmute':'Mute');
  if(mute)mute.title=(model.muted?'Unmute':'Mute')+' · '+model.volume+'%';
  const count=$('[data-music-track-count]',frame);if(count)count.textContent=model.tracks.length+' tracks · '+(model.muted?'Muted':model.volume+'% volume');
}
function currentAppMusicId() {
  return Object.keys(appInfo).filter(id=>(appInfo[id].base||id)==='elisa'&&appState[id]!=='closed').sort((a,b)=>{
    const first=appWindowModel(a),second=appWindowModel(b);
    return Number(second.playing)-Number(first.playing)||(second.lastUsed||0)-(first.lastUsed||0);
  })[0] || null;
}
function renderAllAppMusic() {
  if (!appWindowsReady) return;
  Object.keys(appInfo).filter(id=>(appInfo[id].base||id)==='elisa'&&(appState[id]!=='closed'||frameFor(id).dataset.appReadyWorkspace===activeWorkspace)).forEach(renderAppMusic);
  const id=currentAppMusicId();
  if(!id){
    musicPlaying=false;document.body.classList.remove('music-playing');
    $('.overview-now-playing header b').textContent='No active player';
    $('.overview-now-playing header span small').textContent='Open Elisa to choose music';
    $('.overview-track i').style.width='0%';
    $$('[data-music="play"]',$('.overview-now-playing')).forEach(button=>{button.innerHTML=icon('i-play');button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Play');});
    return;
  }
  const model=appWindowModel(id),track=model.tracks[model.index];
  if(!track)return;
  musicPlaying=model.playing;musicPosition=model.position;document.body.classList.toggle('music-playing',model.playing);
  $('.overview-now-playing header b').textContent=track.title;
  $('.overview-now-playing header span small').textContent=track.artist;
  $('.overview-track i').style.width=(model.position/track.duration*100)+'%';
  $$('[data-music="play"]',$('.overview-now-playing')).forEach(button=>{button.innerHTML=icon(model.playing?'i-pause':'i-play');button.setAttribute('aria-pressed',String(model.playing));button.setAttribute('aria-label',model.playing?'Pause':'Play');});
}
function appMiniMarkup(id, original) {
  const end=original.indexOf('</header>'); if(end<0)return original;
  const header=original.slice(0,end+9), model=appWindowModel(id), frame=frameFor(id);
  if(model.kind==='dolphin') {
    const path=SpatialAppTools.current(model.navigation);
    return header+'<div class="mini-location"><b>' + escapeHtml(path.split('/').at(-1)||'Filesystem') + '</b><small>' + appFileRows(id,path).length + ' items</small></div><div class="mini-file-list">'+appFileRows(id,path).slice(0,3).map(([name,,type])=>'<button data-app-mini-file="'+escapeHtml(name)+'"><span>'+icon(type==='folder'?'i-folder':'i-note')+escapeHtml(name)+'</span></button>').join('')+'</div><div class="mini-quick-row"><button class="surface-key mini-tool" data-app-action="file-new-folder">'+icon('i-add')+'<span>New folder</span></button><button class="surface-key mini-tool" data-app-action="file-search">'+icon('i-search')+'<span>Find</span></button></div></article>';
  }
  if(model.kind==='notes')return header+'<textarea class="mini-note-field" data-app-mini-note aria-label="Edit '+escapeHtml(SpatialAppTools.activeNote(model).title)+'">'+escapeHtml(SpatialAppTools.activeNote(model).text)+'</textarea></article>';
  if(model.kind==='browser')return header+'<form class="mini-browser-search" data-app-mini-browser><input name="query" placeholder="Address or local page" aria-label="Mini browser address"><button class="surface-key mini-control" aria-label="Open page">'+icon('i-right')+'</button></form><div class="mini-location"><b>'+escapeHtml(SpatialAppTools.current(model.navigation).title)+'</b></div></article>';
  if(model.kind==='terminal')return header+'<div class="mini-terminal-output"><b>'+escapeHtml(model.cwd)+'</b><span>'+escapeHtml(model.lines.at(-1)||'Type help for commands')+'</span></div><form class="mini-command" data-app-mini-terminal><span>$</span><input name="command" autocomplete="off" aria-label="Quick terminal command" placeholder="Run a demo command"><button class="surface-key mini-control" aria-label="Run command">'+icon('i-right')+'</button></form></article>';
  if(model.kind==='elisa')return header+'<div class="mini-music"><div class="mini-art"></div><div class="mini-track"><b>'+escapeHtml(model.tracks[model.index]?.title||'Music')+'</b><small>Demo library</small></div><div class="mini-transport"><button class="surface-key mini-control" data-music="prev" aria-label="Previous track">'+icon('i-prev')+'</button><button class="surface-key mini-control play-toggle" data-music="play" aria-label="Play">'+icon('i-play')+'</button><button class="surface-key mini-control" data-music="next" aria-label="Next track">'+icon('i-next')+'</button><input class="track-range" type="range" min="0" max="218" aria-label="Track position"></div></div></article>';
  return original;
}
function performAppAction(id, action) {
  const frame=frameFor(id), model=appWindowModel(id);
  if(action.startsWith('file-')) {
    let path=SpatialAppTools.current(model.navigation);
    if(action==='file-back'||action==='file-forward') {path=SpatialAppTools.go(model.navigation,action==='file-back'?-1:1);model.query='';model.selected=null;renderFileLocation(id,path,{history:false});}
    if(action==='file-up') renderFileLocation(id,SpatialAppTools.resolvePath('..',path,workspaceProfiles[activeWorkspace].home));
    if(action==='file-new-folder')newAppFolder(id);
    if(action==='file-view'){model.grid=!model.grid;renderFileLocation(id,path,{history:false});}
    if(action==='file-search'){model.search=!model.search;if(!model.search)model.query='';renderFileLocation(id,path,{history:false});if(model.search){if(frame.hidden)openApp(id);$('[data-file-filter]',frame).focus();}}
    if(action==='file-preview-close')$('.file-preview',frame).hidden=true;
  } else if(action==='note-new'){SpatialAppTools.addNote(model);renderNotes(id);$('[data-note-title]',frame).focus();$('[data-note-title]',frame).select();}
  else if(action.startsWith('browser-')){
    if(action==='browser-back'||action==='browser-forward')SpatialAppTools.go(model.navigation,action==='browser-back'?-1:1);
    if(action==='browser-home')SpatialAppTools.visit(model.navigation,model.navigation.items[0]);
    renderBrowserPage(id);
  }
  saveAppWindows();
}
function parkedAppMenuEntries(id) {
  const kind=appInfo[id]?.base||id;
  if(!['elisa','notes','dolphin','browser','terminal'].includes(kind))return [];
  const model=appWindowModel(id);
  if(kind==='elisa')return [
    {action:'parked:music-play',icon:model.playing?'i-pause':'i-play',label:model.playing?'Pause':'Play'},
    {action:'parked:music-prev',icon:'i-prev',label:'Previous track'},
    {action:'parked:music-next',icon:'i-next',label:'Next track'},
    {action:'parked:music-restart',icon:'i-refresh',label:'Restart track'},
    {action:'parked:music-mute',icon:'i-volume',label:model.muted?'Unmute':'Mute'}
  ];
  if(kind==='dolphin')return [
    {action:'parked:file-home',icon:'i-home',label:'Open workspace Home'},
    {action:'parked:file-downloads',icon:'i-download',label:'Open Downloads'},
    {action:'parked:file-new-folder',icon:'i-add',label:'New folder here'}
  ];
  if(kind==='notes')return [
    {action:'parked:note-new',icon:'i-add',label:'New note'},
    ...model.notes.map(note=>({action:'parked:note:'+note.id,icon:'i-note',label:'Open note: '+(note.title||'Untitled')}))
  ];
  if(kind==='browser')return [
    ...(model.navigation.index>0?[{action:'parked:browser-back',icon:'i-left',label:'Back'}]:[]),
    ...(model.navigation.index<model.navigation.items.length-1?[{action:'parked:browser-forward',icon:'i-right',label:'Forward'}]:[]),
    {action:'parked:browser-reload',icon:'i-refresh',label:'Reload page'},
    {action:'parked:browser-home',icon:'i-home',label:'Start page'}
  ];
  return [
    {action:'parked:terminal-pwd',icon:'i-code',label:'Print working directory'},
    {action:'parked:terminal-help',icon:'i-note',label:'List demo commands'},
    {action:'parked:terminal-folder',icon:'i-folder',label:'Open working folder in Dolphin'},
    {action:'parked:terminal-clear',icon:'i-close',label:'Clear output'}
  ];
}
function executeParkedAppAction(id, action) {
  if(appState[id]!=='minimized')return;
  const model=appWindowModel(id);
  if(action.startsWith('music-')){
    model.lastUsed=Date.now();
    if(action==='music-play')model.playing=!model.playing;
    if(action==='music-mute')model.muted=!model.muted;
    if(action==='music-restart')model.position=0;
    if(action==='music-prev'||action==='music-next')SpatialAppTools.musicStep(model,action==='music-prev'?-1:1);
    renderAllAppMusic();
  } else if(action==='file-home'||action==='file-downloads'){
    renderFileLocation(id,SpatialHomeFolders.folder(workspaceProfiles,activeWorkspace,action==='file-home'?'Home':'Downloads'));
    openApp(id);
  } else if(action==='file-new-folder'){
    newAppFolder(id);showToast('Folder created in '+SpatialAppTools.current(model.navigation));
  } else if(action==='note-new'){
    SpatialAppTools.addNote(model);renderNotes(id);openApp(id);
    const title=$('[data-note-title]',frameFor(id));title.focus();title.select();
  } else if(action.startsWith('note:')){
    const note=model.notes.find(note=>note.id===action.slice(5));
    if(note){model.active=note.id;renderNotes(id);openApp(id);}
  } else if(action.startsWith('browser-'))performAppAction(id,action);
  else if(action==='terminal-folder'){
    const files=createAppInstance('dolphin');if(files)renderFileLocation(files,model.cwd);
  } else if(action.startsWith('terminal-')){
    runAppCommand(id,action.slice(9));showToast(action==='terminal-clear'?'Terminal output cleared':'Terminal output updated');
  }
  renderMiniApps();saveAppWindows();
}
function prepareAppWindows() {
  let saved={};try{saved=JSON.parse(localStorage.getItem('spatial-app-windows-v1')||'{}');}catch{}
  appWindowStore=SpatialAppTools.create(saved);appWindowsReady=true;
  const originalFiles=renderFileLocation;
  renderFileLocation=function(id,path,options){if(!appWindowsReady)return originalFiles(id,path);renderAppFiles(id,SpatialAppTools.resolvePath(path,frameFor(id)?.dataset.fileLocation||workspaceProfiles[activeWorkspace].home,workspaceProfiles[activeWorkspace].home),options);};
  const originalRestore=restoreWorkspaceContent;
  restoreWorkspaceContent=function(workspace){appWindowsHydrating=true;try{originalRestore(workspace);Object.keys(appInfo).forEach(id=>hydrateAppWindow(id));}finally{appWindowsHydrating=false;}saveAppWindows(false);};
  const originalInstall=installInstance;
  installInstance=function(id,base,bind=true){originalInstall(id,base,bind);if(bind)hydrateAppWindow(id,true);};
  const originalExample=renderDemoAppExample;
  renderDemoAppExample=function(id,example){originalExample(id,example);hydrateAppWindow(id,true);};
  const originalCapture=captureWorkspaceContent;
  captureWorkspaceContent=function(){saveAppWindows(false);originalCapture();};
  const originalMove=moveAppWorkspace;
  moveAppWorkspace=function(id,destination){const origin=activeWorkspace;originalMove(id,destination);appWindowStore.copy(origin,id,destination,(appInfo[id].base||id)+'--'+instanceSequence);saveAppWindows();};
  const originalSnapshot=captureDesktopSyncState;
  captureDesktopSyncState=function(){return {...originalSnapshot(),appWindows:appWindowStore.snapshot()};};
  const originalIncoming=persistIncomingDesktopState;
  persistIncomingDesktopState=function(state){if(state.appWindows)appWindowStore.load(state.appWindows);originalIncoming(state);saveAppWindows(false);};
  const originalContext=contextMenuDescriptor;
  contextMenuDescriptor=function(target,...args){
    const context=originalContext(target,...args);
    if(context?.kind==='app'&&appState[context.name]==='minimized'&&target.closest('.apps-zone[data-area-state="rail"] .app-rack-parked'))context.parkedRail=true;
    if(context?.kind==='file'){
      const frame=context.element.closest('[data-app-frame]');
      context.appId=frame.dataset.appFrame;
      context.label=context.element.dataset.fileName||context.label;
      context.path=context.element.dataset.fileFolder||frame.dataset.fileLocation.replace(/\/$/,'')+'/'+context.label;
    }
    return context;
  };
  const originalEntries=contextMenuEntries;
  contextMenuEntries=function(context){
    if(context.kind==='app'&&context.parkedRail){
      const actions=parkedAppMenuEntries(context.name);
      return [
        {action:'app-open',icon:'i-right',label:'Show window'},
        ...(actions.length?[{separator:true},...actions]:[]),
        {separator:true},
        {action:'app-new-instance',icon:'i-add',label:'New window'},
        {action:'parked:window-options',icon:'i-settings',label:'Window options…'},
        {action:'app-close',icon:'i-close',label:'Quit this window',danger:true}
      ];
    }
    return context.kind==='file' ? [
    {action:'file-open',icon:'i-folder',label:'Open'},
    {action:'file-copy',icon:'i-clipboard',label:'Copy location'}
  ] : originalEntries(context);};
  const originalAction=executeContextAction;
  executeContextAction=function(action){
    const context=contextMenuState;
    if(context?.parkedRail&&action==='app-close'&&(appInfo[context.name]?.base||context.name)==='elisa'){
      appWindowModel(context.name).playing=false;saveAppWindows(false);
    }
    if(context?.kind==='app'&&context.parkedRail&&action.startsWith('parked:')){
      if(action==='parked:window-options'){
        const rect=$('#desktopContextMenu').getBoundingClientRect();
        requestAnimationFrame(()=>openDesktopContextMenu({...context,parkedRail:false},rect.left,rect.top,true));
      } else executeParkedAppAction(context.name,action.slice(7));
      return;
    }
    if(context?.kind==='file'&&action==='file-open'){openAppFile(context.appId,context.label);return;}
    if(context?.kind==='file'&&action==='file-copy'){
      const copy=navigator.clipboard?.writeText(context.path);
      if(copy)copy.then(()=>showToast('Location copied'),()=>showToast(context.path,{duration:3200}));
      else showToast(context.path,{duration:3200});
      return;
    }
    originalAction(action);
  };
  const originalMini=miniMarkup;
  miniMarkup=function(id){return appMiniMarkup(id,originalMini(id));};
  const originalMusicSync=syncMusic;
  syncMusic=function(){originalMusicSync();renderAllAppMusic();};
  setMusicPlaying=function(next){musicPlaying=next;if(!appWindowsHydrating)appWindowModel(currentAppMusicId()||'elisa').playing=next;syncMusic();saveAppWindows(false);};
  clearInterval(musicTimer);
  const originalSyncApps=syncApps;
  syncApps=function(...args){originalSyncApps(...args);renderAllAppMusic();};
  Object.keys(appInfo).forEach(id=>hydrateAppWindow(id));
  document.addEventListener('click',appWindowClick,true);
  document.addEventListener('dblclick',event=>{const frame=event.target.closest('[data-app-frame]'),row=event.target.closest('[data-file-name]');if(frame&&row){event.preventDefault();event.stopImmediatePropagation();openAppFile(frame.dataset.appFrame,row.dataset.fileName);}},true);
  document.addEventListener('input',appWindowInput,true);
  document.addEventListener('change',event=>{const frame=event.target.closest('[data-app-frame]');if(frame&&event.target.matches('[data-file-sort]')){event.stopImmediatePropagation();const id=frame.dataset.appFrame;appWindowModel(id).sort=event.target.value;renderFileLocation(id,frame.dataset.fileLocation,{history:false});saveAppWindows();}},true);
  document.addEventListener('keydown',appWindowKey,true);
  document.addEventListener('submit',event=>{const form=event.target.closest('[data-app-mini-browser],[data-app-mini-terminal]');if(!form)return;event.preventDefault();event.stopImmediatePropagation();const id=form.closest('[data-mini-card]').dataset.miniCard;const value=form.querySelector('input').value.trim();if(value){if(form.matches('[data-app-mini-browser]'))navigateBrowser(id,value);else runAppCommand(id,value);form.querySelector('input').value='';}},true);
  setInterval(()=>{
    Object.keys(appInfo).filter(id=>(appInfo[id].base||id)==='elisa'&&appState[id]!=='closed').forEach(id=>SpatialAppTools.musicTick(appWindowModel(id)));
    renderAllAppMusic();saveAppWindows(false);
  },1000);
  saveAppWindows(false);
}
function appWindowClick(event) {
  let surface=event.target.closest('[data-app-frame],[data-mini-card]');
  if(!surface&&event.target.closest('.overview-now-playing [data-music]')){const player=currentAppMusicId()||createAppInstance('elisa');surface=frameFor(player);}
  if(!surface)return;
  const id=surface.dataset.appFrame||surface.dataset.miniCard,model=appWindowModel(id),frame=frameFor(id);
  const action=event.target.closest('[data-app-action]');
  const place=event.target.closest('[data-home-folder]');
  const path=event.target.closest('[data-file-path]');
  const row=event.target.closest('[data-file-name]');
  const note=event.target.closest('[data-note-id]');
  const link=event.target.closest('[data-demo-link]');
  const music=event.target.closest('[data-music]');
  const track=event.target.closest('[data-track-index]');
  const miniFile=event.target.closest('[data-app-mini-file]');
  if(!action&&!place&&!path&&!row&&!note&&!link&&!music&&!track&&!miniFile)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(action){performAppAction(id,action.dataset.appAction);if(surface.dataset.miniCard){renderMiniApps();renderAllAppMusic();}}
  if(place){renderFileLocation(id,SpatialHomeFolders.folder(workspaceProfiles,activeWorkspace,place.dataset.homeFolder));saveAppWindows();}
  if(path){renderFileLocation(id,path.dataset.filePath);saveAppWindows();}
  if(row){model.selected=row.dataset.fileName;$$('[data-file-name]',frame).forEach(item=>{item.classList.toggle('is-selected',item===row);item.setAttribute('aria-selected',String(item===row));});$('.app-status span',frame).textContent=appFileRows(id,frame.dataset.fileLocation).length+' items · '+model.selected;saveAppWindows(false);}
  if(miniFile){openApp(id);openAppFile(id,miniFile.dataset.appMiniFile);}
  if(note){model.active=note.dataset.noteId;renderNotes(id);saveAppWindows();}
  if(link)navigateBrowser(id,link.dataset.demoLink);
  if(music||track){
    model.lastUsed=Date.now();
    if(track){model.index=Number(track.dataset.trackIndex);model.position=0;model.playing=true;}
    else if(music.dataset.music==='play')model.playing=!model.playing;
    else if(music.dataset.music==='mute')model.muted=!model.muted;
    else SpatialAppTools.musicStep(model,music.dataset.music==='prev'?-1:1);
    prepareControlSemantics(frame);renderAllAppMusic();saveAppWindows();
  }
}
function appWindowInput(event) {
  const surface=event.target.closest('[data-app-frame],[data-mini-card]');if(!surface)return;
  const id=surface.dataset.appFrame||surface.dataset.miniCard,model=appWindowModel(id),frame=frameFor(id);
  if(event.target.matches('[data-file-filter]')){
    event.stopImmediatePropagation();model.query=event.target.value;const start=event.target.selectionStart;
    renderFileLocation(id,frame.dataset.fileLocation,{history:false});const field=$('[data-file-filter]',frame);field.focus();field.setSelectionRange(start,start);saveAppWindows(false);
  }
  if(event.target.matches('.notes-layout textarea,[data-app-mini-note],[data-note-title]')){
    const note=SpatialAppTools.activeNote(model);
    if(event.target.matches('[data-note-title]')){note.title=event.target.value;const label=$$('[data-note-id]',frame).find(button=>button.dataset.noteId===note.id);$('span',label).textContent=note.title||'Untitled';$('.app-identity small',frame).textContent=note.title||'Untitled';appInfo[id].detail=note.title||'Untitled';label.title=note.title||'Untitled';}
    else {note.text=event.target.value;$('.notes-layout textarea',frame).value=note.text;if(id==='notes'){noteDraft=note.text;persistWorkspaceNote();}}
    updateNoteStatus(id);saveAppWindows();
  }
  if(event.target.matches('.track-range,.volume-range')){event.stopImmediatePropagation();if(event.target.matches('.track-range'))model.position=Number(event.target.value);else model.volume=Number(event.target.value);renderAppMusic(id);saveAppWindows(false);}
}
function appWindowKey(event) {
  const frame=event.target.closest('[data-app-frame]');if(!frame||event.metaKey)return;
  const id=frame.dataset.appFrame,model=appWindowModel(id);let handled=false;
  if(model.kind==='dolphin'){
    if(event.ctrlKey&&event.key.toLowerCase()==='l'){$('.address-bar input',frame).focus();$('.address-bar input',frame).select();handled=true;}
    if(event.ctrlKey&&event.key.toLowerCase()==='f'){if(!model.search)performAppAction(id,'file-search');else $('[data-file-filter]',frame).focus();handled=true;}
    if(event.altKey&&['ArrowLeft','ArrowRight','ArrowUp'].includes(event.key)){performAppAction(id,{'ArrowLeft':'file-back','ArrowRight':'file-forward','ArrowUp':'file-up'}[event.key]);handled=true;}
    if(event.key==='Enter'&&event.target.matches('.address-bar input')){renderFileLocation(id,event.target.value);saveAppWindows();handled=true;}
    if(event.key==='Enter'&&event.target.closest('[data-file-name]')){openAppFile(id,event.target.closest('[data-file-name]').dataset.fileName);handled=true;}
    if(event.key==='Escape'&&!$('.file-preview',frame).hidden){performAppAction(id,'file-preview-close');handled=true;}
    if(event.key==='Escape'&&event.target.matches('[data-file-filter]')){performAppAction(id,'file-search');handled=true;}
  } else if(model.kind==='browser'){
    if(event.key==='Enter'&&event.target.matches('.browser-toolbar input')){if(event.target.value.trim())navigateBrowser(id,event.target.value.trim());handled=true;}
    if(event.ctrlKey&&event.key.toLowerCase()==='l'){$('.browser-toolbar input',frame).focus();$('.browser-toolbar input',frame).select();handled=true;}
    if(event.altKey&&['ArrowLeft','ArrowRight'].includes(event.key)){performAppAction(id,event.key==='ArrowLeft'?'browser-back':'browser-forward');handled=true;}
  } else if(model.kind==='terminal'&&event.target.matches('.terminal-screen input')){
    if(event.key==='Enter'){runAppCommand(id,event.target.value.trim());handled=true;}
    if(['ArrowUp','ArrowDown'].includes(event.key)){
      if(model.historyIndex===model.history.length)model.draft=event.target.value;
      model.historyIndex=Math.max(0,Math.min(model.history.length,model.historyIndex+(event.key==='ArrowUp'?-1:1)));
      event.target.value=model.history[model.historyIndex]??model.draft;handled=true;
    }
    if(event.ctrlKey&&event.key.toLowerCase()==='l'){model.lines=[];renderTerminal(id);saveAppWindows();handled=true;}
  } else if(model.kind==='notes'&&event.ctrlKey&&event.key.toLowerCase()==='s'){saveAppWindows();updateNoteStatus(id);handled=true;}
  if(handled){event.preventDefault();event.stopImmediatePropagation();}
}
