const assert = require('node:assert/strict');
const D = require('../dist/demo-examples.js');
const copy = value => JSON.parse(JSON.stringify(value));

// Stored pre-public-demo fixtures; exercise compatibility rather than label snapshots.
const oldWebsite = {
  name: 'Plasma Redesign', root: '/home/xef/Projects/plasma-redesign',
  icon: 'i-folder', summary: 'Desktop shell', accent: '#5cbcff', originWorkspace: 'general',
  files: [['desktop-shell.css', 'Modified 8 min ago', 'document'], ['interaction-notes.md', 'Modified today', 'document']],
  note: 'Keep the interaction physical, but let the content stay quiet and readable.',
  resources: [['keyboard-reference.mp4', 'Linked · ~/Videos', 'video', 'i-video'], ['Ocean design', 'Web reference', 'web', 'i-web']],
  activeMode: 'testing', modes: {
    visual: { label: 'Visual Design', icon: 'i-palette', apps: ['browser', 'dolphin', 'notes'], layout: 'canvas' },
    prototype: { label: 'Prototype', icon: 'i-code', apps: ['browser', 'terminal', 'dolphin'], layout: 'build' },
    testing: { label: 'Interaction Test', icon: 'i-monitor', apps: ['browser', 'notes', 'terminal'], layout: 'review' }
  }
};
const oldFilm = {
  name: 'Retold', root: '/mnt/nvmekingston/Projects/Retold',
  summary: 'Minecraft mod', icon: 'i-gamepad',
  files: [['src/main/java', 'Gameplay sources', 'folder'], ['gradle.properties', 'Modified yesterday', 'document']],
  resources: [['v0.3 test recording.mp4', 'Linked · ~/Videos/Captures', 'video', 'i-video'], ['Fabric documentation', 'Web reference', 'web', 'i-web']],
  modes: { development: { label: 'Development', icon: 'i-code', apps: ['terminal', 'dolphin', 'browser'], layout: 'build' } },
  activeMode: 'development'
};
const original = copy(oldWebsite);
const website = D.migrateProject('plasma', oldWebsite);
assert.equal(website.name, 'Website Launch');
assert.equal(website.root, D.projects.plasma.root);
assert.deepEqual(website.files, D.projects.plasma.files);
assert.deepEqual(website.resources, D.projects.plasma.resources);
assert.equal(website.activeMode, 'testing'); // Current selection/session IDs survive.
assert.deepEqual(Object.keys(website.modes), Object.keys(oldWebsite.modes));
assert.equal(website.modes.testing.label, 'Review');
assert.deepEqual(oldWebsite, original); // Migration never mutates an incoming sync packet.
assert.deepEqual(D.migrateProject('plasma', website), website); // Idempotent.
assert.equal(D.migrateProject('retold', oldFilm).name, 'Short Film');
assert.equal(D.migrateProject('retold', { ...oldFilm, root: '/home/xef/Projects/retold-mod' }).root, D.projects.retold.root);

const edited = copy(oldWebsite);
edited.note = 'My own note';
edited.resources[0][0] = 'my-reference.mp4';
edited.resources.push(['Custom resource', 'Linked · /media', 'web', 'i-web']);
edited.files.splice(0, 1); // Do not restore something the user removed.
edited.modes.visual.label = 'My design mode';
edited.modes.testing.apps = ['notes'];
edited.modes.custom = { label: 'Custom', icon: 'i-note', apps: ['notes'], layout: 'canvas' };
const preserved = D.migrateProject('plasma', edited);
assert.equal(preserved.note, edited.note);
assert.deepEqual(preserved.resources[0], edited.resources[0]);
assert.deepEqual(preserved.resources[2], edited.resources[2]);
assert.equal(preserved.resources[1][0], D.projects.plasma.resources[1][0]);
assert.equal(preserved.files.length, 1);
assert.equal(preserved.modes.visual.label, 'My design mode');
assert.deepEqual(preserved.modes.testing.apps, ['notes']);
assert.deepEqual(preserved.modes.custom, edited.modes.custom);

for (const changed of [
  { ...oldWebsite, name: 'My website' },
  { ...oldWebsite, root: '/media/my-project' },
  { ...oldFilm, name: 'My game' }
]) {
  const id = changed.name === 'My game' ? 'retold' : 'plasma';
  assert.deepEqual(D.migrateProject(id, changed), changed);
}
assert.deepEqual(D.migrateProject('custom', oldWebsite), oldWebsite);
assert.equal(D.migrateProject('plasma', null), null);

// Legacy content-only storage is merged into current defaults before migration.
const contentOnly = { ...copy(D.projects.plasma), note: oldWebsite.note, resources: oldWebsite.resources };
assert.equal(D.migrateProject('plasma', contentOnly).note, D.projects.plasma.note);
assert.deepEqual(D.migrateProject('plasma', contentOnly).resources, D.projects.plasma.resources);
assert.equal(D.migrateNote('My note'), 'My note');
assert.equal(D.migrateNote(''), '');
assert.equal(D.migrateNote('The center is a free-form workspace. Windows can overlap, move and resize.\n\nDrag a title bar into Apps to park the window as a live card. Drag that card back to restore it where you release.\n\nThe right side contains system state and short interactions.'), D.note);
console.log('Demo migration checks passed: defaults, legacy paths, custom data, stable modes and idempotence.');

// Seed usable, intentionally different scenes once, then preserve interactions.
function sceneStore(seed = {}) {
  const data = new Map(Object.entries(seed));
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  return { data, storage, read: key => JSON.parse(data.get(key)) };
}
const freshScene = sceneStore();
assert.equal(D.seedWorkspaces(freshScene.storage), true);
const sceneApps = freshScene.read('spatial-workspace-app-states-v1');
const sceneProjects = freshScene.read('spatial-workspace-project-states-v1');
assert.deepEqual(Object.entries(sceneApps.general).filter(([, state]) => state === 'open').map(([name]) => name), ['dolphin', 'browser', 'notes']);
assert.equal(sceneProjects.general.project, null);
assert.equal(sceneProjects.school.project, 'research');
assert.equal(sceneProjects.work.mode, 'default');
assert.equal(sceneApps.gaming.elisa, 'minimized');
// The opening desktop is composed by the same native panel/widget model used
// at runtime. Scene content never creates a second layout system.
const Panels = require('../dist/panel-widgets.js');
const defaultPanels = Panels.defaults(), savedDefaultPanels = copy(defaultPanels);
assert.equal(defaultPanels.panels[0].mode,'expanded');
assert.equal(defaultPanels.panels[1].mode,'compact');
assert.deepEqual(defaultPanels.panels[0].widgets,['launcher','apps','clock','notifications','calendar','controls']);
assert.deepEqual(defaultPanels.panels[1].widgets.slice(0,2),['files','assistant']);
const defaultComposition=Panels.layout(defaultPanels,{width:1440,height:900,display:1,displays:1});
const leftComposition=defaultComposition.panels['panel-left'];
assert.equal(leftComposition.widgets.apps.mode,'expanded','Apps has the main expanded view');
assert.equal(leftComposition.widgets.clock.mode,'expanded','The current time remains readable');
for(const id of ['launcher','notifications','calendar','controls'])assert.equal(leftComposition.widgets[id].mode,'compact',id+' starts as an icon');
assert.equal(leftComposition.widgets.launcher.y,0,'Overview starts above Quick launch');
assert.equal(leftComposition.widgets.controls.y+leftComposition.widgets.controls.height,leftComposition.height,'The system row finishes at the panel bottom');
assert(leftComposition.widgets.apps.y+leftComposition.widgets.apps.height<leftComposition.widgets.clock.y,'Apps and the bottom controls have separate allocations');
for(const [width,height] of [[1440,900],[920,700],[700,500]])for(const mode of ['expanded','compact']){
 const composition=Panels.layout(Panels.updatePanel(defaultPanels,'panel-left',{mode}),{width,height,display:1,displays:1});
 assert(composition.insets.left+composition.insets.right<width,'Panel fitting retains a desktop canvas');
 for(const panel of Object.values(composition.panels))for(const widget of Object.values(panel.widgets)){
  assert(widget.x>=0&&widget.y>=0,'Default widget stays within its panel');
  assert(widget.x+widget.width<=panel.width+.01&&widget.y+widget.height<=panel.height+.01,'Default widget cannot extend beyond the panel');
 }
}
assert.deepEqual(defaultPanels,savedDefaultPanels,'Fitting the demo leaves saved widget preferences unchanged');
assert.equal(freshScene.storage.getItem('spatial-workspace-area-layouts-v1'),null,'Demo scenes no longer seed the retired Areas layout');
assert.equal(freshScene.storage.getItem('spatial-demo-general-areas-v1'),null,'Demo scenes do not run the retired opening-layout migration');
for(const name of ['defaultAreaDocks','migrateAreaLayout','migrateSideAreaLayout'])assert(!Object.hasOwn(D,name),'No obsolete Areas layout exports: '+name);
for(const example of Object.values(D.scenarios))assert(!Object.hasOwn(example,'areas'),'Scene content has no retired layout configuration');
const nativeLayout=Panels.addSpacer(Panels.updatePanel(defaultPanels,'panel-left',{edge:'bottom',size:317}),'panel-left',1);
const existingPanels=sceneStore({'spatial-widget-panels-v1':JSON.stringify({general:nativeLayout}),'spatial-demo-scenes-v1':'4'});
D.seedWorkspaces(existingPanels.storage);
assert.deepEqual(existingPanels.read('spatial-widget-panels-v1'),{general:nativeLayout},'Refreshing demo content leaves the native panel layout and Spacer untouched');

assert.equal(Object.keys(D.projects.research.modes).length, 1);
const tiles = freshScene.read('spatial-split-layouts-v1');
assert.equal(tiles['gaming:desktop:0:1'].fullscreen,undefined,'The initial game tiles on the ordinary desktop');
assert.equal(sceneApps.gaming.game,'open','The parent opening view keeps Fallout running');
assert.equal(freshScene.read('spatial-desktop-pages-v1').gaming.active,0);
const oldGaming={active:0,activeColumn:'workspace',activeFullscreen:{workspace:'game'},windows:{game:0},owners:{game:'workspace'}};
const oldGamingSession=()=>sceneStore({
  'spatial-demo-scenes-v1':'4','spatial-demo-steam-v1':'1',
  'spatial-desktop-pages-v1':JSON.stringify({gaming:copy(oldGaming)}),
  'spatial-split-layouts-v1':JSON.stringify({'gaming:desktop:0:1':{fullscreen:{name:'game'}}})
});
const opening=oldGamingSession();D.seedWorkspaces(opening.storage);
assert.equal(opening.read('spatial-desktop-pages-v1').gaming.activeFullscreen.workspace,undefined);
assert.equal(opening.read('spatial-split-layouts-v1')['gaming:desktop:0:1'].fullscreen.startOnParent,true);
opening.storage.setItem('spatial-desktop-pages-v1',JSON.stringify({gaming:copy(oldGaming)}));
D.seedWorkspaces(opening.storage);
assert.equal(opening.read('spatial-desktop-pages-v1').gaming.activeFullscreen.workspace,'game','Later choices survive subsequent visits');
for(const changed of [{active:1},{activeColumn:'my-project'},{owners:{game:'my-project'}}]) {
  const edited=oldGamingSession(),gaming={...copy(oldGaming),...changed};
  edited.storage.setItem('spatial-desktop-pages-v1',JSON.stringify({gaming}));D.seedWorkspaces(edited.storage);
  assert.deepEqual(edited.read('spatial-desktop-pages-v1').gaming,gaming,'Do not change a user-selected page or Project');
}
assert.equal(tiles['work:project-column:plasma:desktop:0:1'].root.axis, 'x');
assert.deepEqual(require('../dist/spatial-tiling.js').names(tiles['work:project-column:plasma:desktop:0:1'].root), ['browser--demo-site-preview', 'notes--demo-site-checklist']);
// Every fresh desktop has one focused activity, with the paired materials
// actually readable at common laptop widths and panel-fallback boundaries.
// Use production demo adaptation and app minima so changing a window's
// requirements cannot silently park it.
const SeedTiling=require('../dist/spatial-tiling.js');
const sizeLiteral=require('node:fs').readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8').match(/const windowUsableSizes = (\{[\s\S]*?\n\});/)[1];
const appMinima=Function('return ('+sizeLiteral+')')();
const pageState=freshScene.read('spatial-desktop-pages-v1');
assert.deepEqual(SeedTiling.names(tiles['general:desktop:0:1'].root),['browser','notes'],'The first General desktop pairs browsing with a personal plan');
assert.deepEqual(SeedTiling.names(tiles['general:desktop:1:1'].root),['dolphin'],'File organisation has a separate desktop');
assert.equal(D.workspaceWindows.general.find(w=>w.base==='dolphin').content.folder,'/home/demo/Documents','The organisation desktop does not duplicate the panel Home view');
assert.deepEqual(SeedTiling.names(tiles['work:project-column:plasma:desktop:1:1'].root),['terminal--demo-site-server','dolphin--demo-site-files']);
assert.deepEqual(SeedTiling.names(tiles['gaming:desktop:0:1'].root),['game'],'The game opens alone on its parent desktop');
assert.deepEqual(SeedTiling.names(tiles['gaming:desktop:1:1'].root),['browser','notes'],'Social planning stays beside the game rather than squeezing it');
for(const viewportWidth of [1024,1191,1192,1247,1248,1280,1366,1439,1440,1600])for(const [workspace,example] of Object.entries(D.scenarios))for(const column of example.windows){
 for(const page of new Set(column.windows.map(w=>w.page))){
  const open=column.windows.filter(w=>w.page===page&&w.state==='open');assert(open.length<=2,'Demo desktops contain at most two relevant open windows');
  const prefix=column.column==='workspace'?workspace+':desktop:':workspace+':project-column:'+column.column+':desktop:';
  const panelLayout=Panels.layout(Panels.demoDefaults(workspace),{width:viewportWidth,height:900,display:1,displays:1,demo:true});
  const tileWidth=viewportWidth-panelLayout.insets.left-panelLayout.insets.right-64; // two 24px desktop rails plus 16px tile padding
  const root=tiles[prefix+page+':1'].root,placed=SeedTiling.layout(root,{x:0,y:0,width:tileWidth,height:700}).windows;
  for(const window of open){const rect=placed.get(window.id),minimum=appMinima[window.base]||{width:400,height:300};assert(rect);assert(rect.width>=minimum.width-1,window.id+' has readable width on a '+viewportWidth+'px demo');assert(rect.height>=minimum.height-1,window.id+' has readable height');}
 }
}
for(const name of ['general','school','work','gaming'])assert.equal(pageState[name].active,0,'Fresh contexts begin on their first desktop');
const currentShell=require('node:fs').readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const profileLiteral=currentShell.slice(currentShell.indexOf('const workspaceProfiles = {')+'const workspaceProfiles = '.length,currentShell.indexOf('\n\nconst gamingWorkspaceProfile')).trim().replace(/;$/,'');
const defaultProfiles=Function('return ('+profileLiteral+')')();
for(const [workspace,profile] of Object.entries(defaultProfiles))for(const [id] of profile.favorites){assert(Object.hasOwn(D.scenarios[workspace].apps,id),'The '+workspace+' default launcher opens a working app: '+id);if(workspace!=='gaming')assert(!['game','steam'].includes(id),'Game launchers belong to Gaming');}
const resumedScene=sceneStore(Object.fromEntries(freshScene.data));
resumedScene.storage.setItem('spatial-demo-window-order-v1','1');
resumedScene.storage.setItem('spatial-workspace-app-states-v1',JSON.stringify({general:{notes:'open',browser:'closed'}}));
resumedScene.storage.setItem('spatial-split-layouts-v1',JSON.stringify({'general:desktop:0:1':{root:{kind:'window',name:'notes'},floating:{},parked:{}}}));
resumedScene.storage.setItem('spatial-ai-context-v1',JSON.stringify({custom:'Keep my chats and drafts'}));
const retainedScene=Object.fromEntries(resumedScene.data);assert.equal(D.seedWorkspaces(resumedScene.storage),false);assert.deepEqual(Object.fromEntries(resumedScene.data),retainedScene,'Revisiting a version-4 demo never reseeds existing windows, tiling, files or chats');
freshScene.storage.setItem('spatial-workspace-app-states-v1', JSON.stringify({ general: { notes: 'open' } }));
assert.equal(D.seedWorkspaces(freshScene.storage), false);
assert.deepEqual(freshScene.read('spatial-workspace-app-states-v1'), { general: { notes: 'open' } });
const customScene = sceneStore({
  'spatial-active-workspace': 'work',
  'spatial-project-spaces-v2': JSON.stringify({ custom: { name: 'My own project' }, plasma: { ...D.projects.plasma, note: 'My draft' } }),
  'spatial-workspace-project-states-v1': JSON.stringify({ work: { project: 'custom', mode: 'mine' } }),
  'spatial-workspace-app-states-v1': JSON.stringify({ work: { notes: 'open' } }),
  'spatial-workspace-area-layouts-v1': JSON.stringify({ work: { sizes: { left: 330 } } }),
  'spatial-workspace-area-contents-v1': JSON.stringify({ general: { noteDraft: 'Keep this text' } })
});
D.seedWorkspaces(customScene.storage);
assert.equal(customScene.storage.getItem('spatial-active-workspace'), 'work');
assert.deepEqual(customScene.read('spatial-workspace-app-states-v1').work, { notes: 'open' });
assert.deepEqual(customScene.read('spatial-workspace-area-layouts-v1').work, { sizes: { left: 330 } });
assert.equal(customScene.read('spatial-project-spaces-v2').plasma.note, 'My draft');
assert.equal(customScene.read('spatial-workspace-area-contents-v1').general.noteDraft, 'Keep this text');
assert(customScene.storage.getItem('spatial-demo-columns-backup-v1'));
const emptyLibrary = sceneStore({ 'spatial-project-spaces-v2': '{}' });
D.seedWorkspaces(emptyLibrary.storage);
assert.deepEqual(emptyLibrary.read('spatial-project-spaces-v2'), {});
assert.equal(emptyLibrary.read('spatial-workspace-project-states-v1').school.project, null);
assert.equal(emptyLibrary.storage.getItem('spatial-workspace-area-layouts-v1'),null,'An empty project library does not recreate retired layouts');
assert.equal(D.migrateProject('plasma', { ...D.projects.plasma, root: '/home/demo/Projects/website-launch', originWorkspace: 'general' }).originWorkspace, 'work');
console.log('Demo scenes passed: distinct activities, two General desktops, native panel composition, single-mode research, one-time migration, custom data and deleted library.');

// Exercise the actual storage adapter, including the older content-only key.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const shell = fs.readFileSync(path.join(__dirname, '../dist/desktop-shell.js'), 'utf8');
const slice = (start, end) => shell.slice(shell.indexOf(start), shell.indexOf(end, shell.indexOf(start)));
function storageAdapter(seed) {
  const storage = new Map(Object.entries(seed));
  const noteField = { value: D.note, addEventListener() {} };
  const context = vm.createContext({
    SpatialDemoExamples: D, desktopPreset:"demo",
    workspaceProfiles: { general: { home: '/home/demo' }, school: { home: '/home/demo/Workspaces/School' }, work: { home: '/home/demo/Workspaces/Work' }, gaming: { home: '/home/demo/Workspaces/Gaming' } },
    appInfo: { browser: {}, dolphin: {}, notes: {}, terminal: {}, elisa: {} },
    activeWorkspace: 'general',
    desktopStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    $: () => noteField,
    noteDraft: ''
  });
  vm.runInContext(slice('function readDesktopStorage(', 'function localDisplayDescriptor('), context);
  vm.runInContext(slice('const projectSpaces =', 'function projectLocationMeta('), context);
  vm.runInContext(slice('function slugifyProject(', 'function resourceMarkup('), context);
  vm.runInContext(slice('function prepareNoteSync(', 'function pointInside('), context);
  vm.runInContext('loadProjectState(); prepareNoteSync();', context);
  return { storage, noteField, context };
}
const sessions = { 'general:plasma:testing': { savedAt: 100, apps: ['notes'] } };
const seeded = storageAdapter({
  'spatial-project-spaces-v2': JSON.stringify({ plasma: oldWebsite, retold: oldFilm }),
  'spatial-project-content-v1': JSON.stringify({ plasma: { note: 'My note', resources: edited.resources, activeMode: 'testing' } }),
  'spatial-project-window-sessions-v1': JSON.stringify(sessions),
  'spatial-active-project-v1': 'retold',
  'spatial-note-draft-v1': ''
});
const saved = JSON.parse(seeded.storage.get('spatial-project-spaces-v2'));
assert.equal(saved.plasma.name, 'Website Launch');
assert.equal(saved.retold.name, 'Short Film');
assert.equal(saved.plasma.note, 'My note');
assert.deepEqual(saved.plasma.resources[2], edited.resources[2]);
assert.equal(saved.plasma.activeMode, 'testing');
assert.equal(seeded.storage.get('spatial-active-project-v1'), 'retold');
assert.deepEqual(JSON.parse(seeded.storage.get('spatial-project-window-sessions-v1')), sessions);
assert.equal(seeded.noteField.value, '');
const deleted = storageAdapter({ 'spatial-project-spaces-v2': '{}' });
assert.deepEqual(JSON.parse(deleted.storage.get('spatial-project-spaces-v2')), {});
const legacyContent = storageAdapter({ 'spatial-project-content-v1': JSON.stringify({ plasma: { note: oldWebsite.note, resources: oldWebsite.resources } }) });
assert.equal(JSON.parse(legacyContent.storage.get('spatial-project-spaces-v2')).plasma.note, D.projects.plasma.note);
console.log('Desktop storage adapter passed: active project, window sessions, deleted projects, legacy content and empty notes preserved.');

// Workspace project selection is independent; project definitions remain shared.
const isolated = storageAdapter({
  'spatial-project-spaces-v2': JSON.stringify({plasma:oldWebsite,retold:oldFilm}),
  'spatial-workspace-project-states-v1': JSON.stringify({
    general: { project: 'plasma', mode: 'visual' },
    school: { project: null, mode: null },
    work: { project: 'retold', mode: 'development' },
    gaming: { project: 'plasma', mode: 'testing' }
  })
});
const ctx = isolated.context;
vm.runInContext('activeWorkspace = "gaming"; restoreWorkspaceProject(activeWorkspace);', ctx);
assert.equal(vm.runInContext('activeProjectName', ctx), 'plasma');
assert.equal(vm.runInContext('projectModeId(activeProjectName)', ctx), 'testing');
vm.runInContext('activeWorkspace = "general"; restoreWorkspaceProject(activeWorkspace);', ctx);
assert.equal(vm.runInContext('projectModeId(activeProjectName)', ctx), 'visual', 'Same shared Project retains a separate Mode per Workspace');
vm.runInContext('activeProjectName = null; persistProjectState(); activeWorkspace = "work"; restoreWorkspaceProject(activeWorkspace);', ctx);
assert.equal(vm.runInContext('activeProjectName', ctx), 'retold', 'Closing General does not close Work’s Project');
vm.runInContext('activeWorkspace = "school"; restoreWorkspaceProject(activeWorkspace); persistProjectState();', ctx);
assert.equal(vm.runInContext('activeProjectName', ctx), null, 'No Project leaks into an unused Workspace');
const reloaded = storageAdapter(Object.fromEntries(isolated.storage));
assert.equal(vm.runInContext('activeProjectName', reloaded.context), null, 'Explicitly closed Project stays closed on reload');
assert.equal(JSON.parse(seeded.storage.get('spatial-workspace-project-states-v1')).school.project, null, 'Legacy global selection migrates only into its owning Workspace');
assert.equal(vm.runInContext('normalizedWorkspaceProjects({}, "plasma", "gaming").general.project', ctx), null, 'Legacy migration must not also seed General when Gaming owns the old selection');
vm.runInContext('delete projectSpaces.retold; const cleaned = normalizedWorkspaceProjects(workspaceProjectStates);', ctx);
assert.equal(vm.runInContext('cleaned.work.project', ctx), null, 'Deleted Projects never reopen from a stale Workspace');

// Exercise real Workspace switching, including native content restoration before panel/window layout.
const ui = storageAdapter({ 'spatial-workspace-project-states-v1': JSON.stringify({ general: { project: 'plasma', mode: 'visual' }, school: { project: null, mode: null } }) });
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { dataset: {}, hidden: false, scrollTop: 0, innerHTML: '', textContent: '', value: '', closest() { return this; }, insertAdjacentHTML(position, html) { this.innerHTML = html; }, style: { setProperty() {} }, classList: { remove() {}, toggle() {} }, setAttribute() {} });
  return elements.get(id);
}
const widgets = [element('calendar'), element('phone')];
const raf = [];
const calls = [];
Object.assign(ui.context, {
  desktopPages: require('../dist/desktop-pages.js').create(),
  Date, focusRunning: false, focusSeconds: 1500, notificationAttentionTimer: null,
  document: { body: { dataset: {}, style: { setProperty() {} } } },
  $: selector => element(selector),
  $$: selector => selector === '.static-widget-stack>.system-widget' ? widgets : [],
  areaFor: name => element('area:' + name),
  appState: { dolphin: 'open', elisa: 'open', browser: 'closed', terminal: 'closed', notes: 'closed' },
  workspaceAppStates: {
    general: { dolphin: 'open', elisa: 'open', browser: 'closed', terminal: 'closed', notes: 'closed' },
    school: { dolphin: 'closed', elisa: 'closed', browser: 'open', terminal: 'closed', notes: 'closed' }
  },
  desktopSyncApplying: false, desktopHasWindowFocus: true, frontApp: null, layoutMode: 'manual',
  cancelAreaPointerInteraction: null, cancelWindowPointerInteraction: null, placementUndoEpoch: 0,
  requestAnimationFrame: fn => raf.push(fn), clearTimeout() {},
  hideNotificationPeek() {}, syncNotifications() {}, setFocusRunning(running) { ui.context.focusRunning = running; },
  persistWorkspaceAppStates() { ui.context.workspaceAppStates[ui.context.activeWorkspace] = { ...ui.context.appState }; },
  loadLayout(name) { calls.push(['windows', name, vm.runInContext('activeProjectName', ui.context)]); },
  applyAreaSession(name) { calls.push(['panels', name, vm.runInContext('activeProjectName', ui.context)]); },
  saveAreaLayout() {}, saveLayout() {},
  refreshWorkspaceContext() {}, workspaceFavoriteMarkup() {}, escapeHtml: x => x, icon: () => '', appArt: () => '',
  applyAppPrimaryColors() {}, prepareControlSemantics() {}, ensureBondedFullscreenDesktops() {}, syncApps() {},
  renderWorkspaceExample() {}, endSystemRailExpansion() {}, syncProjectAreaView() {},
  renderOverviewProjects() {}, setProjectClosedState(closed) { element('project').hidden = closed; },
  renderProjectSpace(name) { vm.runInContext('activeProjectName = ' + JSON.stringify(name) + '; rememberWorkspaceProject();', ui.context); element('project').hidden = false; },
  restoreWorkspaceWindowLayout() { calls.push(['restore', ui.context.activeWorkspace]); }, bringToFront() {}, showToast() {}
});
for (const [name, profile] of Object.entries(ui.context.workspaceProfiles)) Object.assign(profile, { label: name, accent: '#56baff', icon: 'i-grid', favorites: [], folders: [], rack: [], agenda: ['', '', ''] });
vm.runInContext(slice('function snapshotWorkspaceAreaContent(', 'function workspaceFavoriteMarkup('), ui.context);
vm.runInContext(slice('function renderWorkspace(', 'function renderWorkspaceExample('), ui.context);
vm.runInContext(slice('function updateDesktopPageUi(', 'function focusDesktop('), ui.context);
ui.context.renderDesktopContextColumns = () => {}; // Real header rendering is covered by the column integration suite.
ui.context.renderFullscreenPeek = () => {}; // Real preview rendering is covered by the fullscreen integration suite.
vm.runInContext('defaultAreaContent = snapshotWorkspaceAreaContent();', ui.context);
element('#notificationList').innerHTML = 'General notification';
element('#miniStack').scrollTop = 120;
element('#projectSpaceContent').scrollTop = 64;
ui.context.focusRunning = true;
ui.context.focusSeconds = 1400;
element('#timerWidget').hidden = false;
vm.runInContext('renderWorkspace("school", false);', ui.context);
assert.equal(vm.runInContext('activeProjectName', ui.context), null);
assert.equal(element('project').hidden, true);
assert.equal(element('#notificationList').innerHTML, '', 'School gets its own notifications');
assert.equal(element('#miniStack').scrollTop, 0,'School gets its own Parked viewport position');
assert.equal(element('#projectSpaceContent').scrollTop, 0,'School gets its own Files viewport position');
assert.equal(ui.context.focusRunning, false, 'General timer does not become School’s timer');
assert.deepEqual(calls.slice(0, 2), [['windows', 'school', null], ['panels', 'school', null]], 'Project context changes before restoring panels and tiling');
element('#notificationList').innerHTML = 'School notification';
element('#miniStack').scrollTop = 24;
element('#projectSpaceContent').scrollTop = 12;
vm.runInContext('renderWorkspace("general", false);', ui.context);
assert.equal(vm.runInContext('activeProjectName', ui.context), 'plasma');
assert.equal(element('#notificationList').innerHTML, 'General notification');
assert.equal(element('#miniStack').scrollTop, 120,'General restores its own Parked viewport');
assert.equal(element('#projectSpaceContent').scrollTop, 64,'General restores its own Files viewport');
assert.equal(ui.context.focusRunning, true);
assert.ok(ui.context.focusSeconds <= 1400 && ui.context.focusSeconds >= 1399);
raf.forEach(fn => fn());
assert.deepEqual(calls.filter(call => call[0] === 'restore'), [['restore', 'general']], 'A delayed callback from the previous Workspace cannot relayout the current one');
console.log('Workspace sessions passed: isolated Projects/Modes, legacy migration, reload, notifications, timer, Parked/Files scroll and switch ordering.');

// A sample filename rename must never rewrite a stylesheet or script URL.
const dist = path.join(__dirname, '../dist');
for (const htmlName of fs.readdirSync(dist).filter(name => name.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(dist, htmlName), 'utf8');
  for (const tag of html.match(/<(?:link|script)\b[^>]*>/g) || []) {
    const stylesheet = /\brel="stylesheet"/.test(tag);
    const script = tag.startsWith('<script');
    if (!stylesheet && !script) continue;
    const resource = tag.match(/\b(?:href|src)="([^"]+)"/)?.[1];
    if (!resource || /^(?:https?:|data:)/.test(resource)) continue;
    const file = resource.split(/[?#]/)[0];
    assert.equal(path.extname(file), stylesheet ? '.css' : '.js', htmlName + ': incorrect resource type ' + resource);
    assert.ok(fs.existsSync(path.join(dist, file)), htmlName + ': missing ' + resource);
  }
}
console.log('Website asset checks passed: local stylesheet and script types and paths.');


const multiple = storageAdapter({
  'spatial-open-projects-v1': JSON.stringify({general:['plasma','retold'],school:[],work:['retold']}),
  'spatial-workspace-project-states-v1': JSON.stringify({general:{project:'retold'},school:{project:null},work:{project:'retold'}})
});
assert.deepEqual(JSON.parse(multiple.storage.get('spatial-open-projects-v1')).general,['plasma','retold']);
const multipleReload = storageAdapter(Object.fromEntries(multiple.storage));
assert.deepEqual(JSON.parse(multipleReload.storage.get('spatial-open-projects-v1')).general,['plasma','retold']);
assert.deepEqual(JSON.parse(multipleReload.storage.get('spatial-open-projects-v1')).school,[]);
console.log('Open projects persist across reload with independent workspace lists.');

// Native column snapshots must survive without the legacy Mode migration.
const columnPages=require('../dist/desktop-pages.js').create(freshScene.read('spatial-desktop-pages-v1'));
const independent=freshScene.read('spatial-independent-sessions-v1');
assert.deepEqual(freshScene.read('spatial-open-projects-v1').work,['plasma','retold']);
assert.equal(columnPages.column('work'),'plasma');
for (const [workspace,example] of Object.entries(D.scenarios)) {
  for (const column of example.windows) {
    for (const window of column.windows) {
      assert.equal(columnPages.columnOf(workspace,window.id),column.column);
      assert.equal(columnPages.pageOf(workspace,window.id),window.page);
      assert.equal(independent.membership[workspace][window.id],column.column==='workspace'?null:column.column);
      if (window.id!==window.base) assert.equal(independent.instances[window.id],window.base);
    }
  }
}
assert.equal(columnPages.pageOf('work','notes--demo-site-checklist'),0);
assert.equal(columnPages.columnOf('work','notes--demo-film-cut'),'retold');
assert.notEqual(D.projectWindows.plasma.find(w=>w.base==='notes').content.note,D.projectWindows.retold.find(w=>w.base==='notes').content.note);
assert.equal(sceneApps.work['elisa--demo-film-soundtrack'],'minimized');
assert(freshScene.read('spatial-demo-columns-backup-v1'));

// Exercise the actual per-window content renderer and input restoration.
const demoFrames={};
for (const column of D.scenarios.work.windows) for (const spec of column.windows) {
  const fields=[{value:'old generic content',checked:false}];
  const parts={};
  demoFrames[spec.id]={dataset:{},fields,parts,querySelectorAll:()=>fields};
}
const contentCtx=vm.createContext({
  SpatialDemoExamples:D,activeWorkspace:'work',workspaceProfiles:{work:{home:'/home/demo/Workspaces/Work'}},
  appInfo:Object.fromEntries(D.scenarios.work.windows.flatMap(c=>c.windows.map(w=>[w.id,{label:w.base,...(w.id!==w.base?{base:w.base}:{})}]))),
  frameFor:id=>demoFrames[id],
  $:(selector,frame=demoFrames.notes)=>{
    if(selector.includes('textarea') || selector.includes('input')) return frame.fields[0];
    return frame.parts[selector] ||= {parts:{},fields:frame.fields,textContent:'',innerHTML:'',value:'',insertAdjacentHTML(position,html){this.innerHTML=html;}};
  },$$:()=>[],escapeHtml:x=>String(x).replaceAll('<','&lt;'),prepareControlSemantics(){},
  workspaceContent:{work:{frames:{'notes--demo-film-cut':[{value:'My edited film note'}]},note:'My studio planning'}},
  pristineFrames:Object.fromEntries(Object.keys(D.scenarios.work.apps).filter(id=>!id.includes('--')).map(id=>[id,{querySelectorAll:()=>[{value:'pristine default'}]}])),
  workspaceAreaContents:{},noteDraft:'',terminalPreview:'',focusSeconds:1500,focusRunning:false,focusTimer:0,
  areaFor:()=>({querySelectorAll:()=>[]}),clearInterval(){},updateTimer(){},setMusicPlaying(){},renderWorkspaceHistory(){},renderFileLocation(){},refreshDownloadUi(){}
});
for (const id of ['terminal','dolphin','elisa']) contentCtx.appInfo[id] = {label:id};
vm.runInContext(slice('function renderDemoAppExample(', 'function renderWorkspaceExample('),contentCtx);
for (const column of D.scenarios.work.windows) for (const spec of column.windows) contentCtx.renderDemoAppExample(spec.id,spec.content);
assert.match(demoFrames['notes--demo-film-cut'].fields[0].value,/station transition/);
assert.match(demoFrames['notes--demo-site-checklist'].fields[0].value,/keyboard navigation/);
assert.equal(demoFrames['dolphin--demo-film-footage'].fields[0].value,D.projects.retold.root);
assert.match(demoFrames['browser--demo-site-preview'].parts['.start-page'].innerHTML,/Northstar Studio/);
vm.runInContext(slice('function restoreWorkspaceContent(', 'const originalCaptureWorkspace'),contentCtx);
contentCtx.restoreWorkspaceContent('work');
assert.equal(demoFrames['notes--demo-film-cut'].fields[0].value,'My edited film note');
assert.match(demoFrames['notes--demo-site-checklist'].fields[0].value,/keyboard navigation/,'Unsaved example fields retain their specific initial content');
assert.equal(demoFrames.notes.fields[0].value,'My studio planning');
console.log('Column examples passed: multiple open projects, distinct identities/content, two desktops, minimized soundtrack, native ownership, backups and edited note restoration.');
// Upgrade only untouched public resource rows, including School's research project.
for(const [id,rows] of Object.entries({plasma:[['brand-guidelines.pdf','Linked · ~/Documents/Brand','document','i-note'],['Reference images','Linked · ~/Pictures/References','folder','i-folder']],retold:[['soundtrack.wav','Linked · ~/Music/Production','audio','i-music'],['storyboard.pdf','Linked · ~/Documents/Film','document','i-note']],research:[['Field guide.pdf','Linked · School/Documents/Biology','document','i-note'],['Survey map','Linked · School/Pictures','document','i-web']]})){
 const prior={...copy(D.projects[id]),resources:copy(rows)};
 assert.deepEqual(D.migrateProject(id,prior).resources,D.projects[id].resources);
 prior.resources[0][1]='My own caption';prior.resources.splice(1,1);
 assert.deepEqual(D.migrateProject(id,prior).resources,prior.resources);
}
const fsMedia=require('node:fs'),pathMedia=require('node:path');
for(const project of Object.values(D.projects))for(const row of project.resources){const media=row[4]?.attachment;if(media?.src.startsWith('media/stash/'))assert.ok(fsMedia.statSync(pathMedia.join(__dirname,'../dist',media.src)).size>100);}
const wav=fsMedia.readFileSync(pathMedia.join(__dirname,'../dist/media/stash/closing-theme.wav'));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(40)/(wav.readUInt32LE(24)*wav.readUInt16LE(22)*wav.readUInt16LE(34)/8),8);
console.log('Typed examples passed: public migration, edited/deleted rows preserved, real assets and eight-second audio.');

// Existing shipped demos adopt row-major layout without resetting user layouts.
{
  const key = 'work:project-column:plasma:desktop:0:1';
  const initial = copy(tiles[key]);
  const ids = require('../dist/spatial-tiling.js').names(initial.root);
  const oldRoot = {kind:'split',axis:'y',ratio:.5,a:{kind:'window',name:ids[0]},b:{kind:'window',name:ids[1]}};
  const store = sceneStore({'spatial-demo-scenes-v1':'4','spatial-split-layouts-v1':JSON.stringify({[key]:{...initial,root:oldRoot}})});
  D.seedWorkspaces(store.storage);
  assert.equal(store.read('spatial-split-layouts-v1')[key].root.axis,'x');
  const customRoot = {...oldRoot,ratio:.7};
  const edited = sceneStore({'spatial-demo-scenes-v1':'4','spatial-split-layouts-v1':JSON.stringify({[key]:{...initial,root:customRoot}})});
  D.seedWorkspaces(edited.storage);
  assert.deepEqual(edited.read('spatial-split-layouts-v1')[key].root,customRoot);
  console.log('Demo window order migration passed: shipped pairs become vertical halves; user splits survive.');
}

// The walkthrough and its source materials must describe the same task/data.
assert.match(D.scenarios.work.browser.intro,/compact keyboard/);
assert.match(D.projectWindows.plasma.find(w=>w.base==='notes').content.note,/Explore the keyboard/);
const studyNote=D.projectWindows.research.find(w=>w.base==='notes').content.note;
for(const sample of ['Riverside A: 75% shade, 8 species','Riverside B: 60% shade, 7 species','Courtyard A: 20% shade, 4 species','Courtyard B: 35% shade, 5 species'])assert(studyNote.includes(sample));
assert.match(studyNote,/does not establish/);
assert.notEqual(D.reviewNotes.plasma.text,D.reviewNotes.research.text);
const priorSite=JSON.parse(JSON.stringify(D.projects.plasma));priorSite.note='Review the homepage copy, check the mobile layout, then share the preview for feedback.';
assert.equal(D.migrateProject('plasma',priorSite).note,D.projects.plasma.note);
priorSite.note='My own review plan';assert.equal(D.migrateProject('plasma',priorSite).note,'My own review plan');
console.log('Current workflows passed: keyboard materials agree, four survey plots agree, specific review notes, recipes without fake activity and edited note preservation.');

const cachedPage={address:'http://localhost:5173/',title:'Northstar Studio',intro:'Thoughtful spaces for everyday life. A small architecture studio creating useful, welcoming places — from the first sketch to the last detail.',detail:'Thoughtful spaces for everyday life. A small architecture studio creating useful, welcoming places — from the first sketch to the last detail.',links:['Our projects','About the studio','Contact','Preview checklist'],bookmarked:true};
const updatedPage=D.migrateBrowserPage(cachedPage);assert.match(updatedPage.intro,/compact keyboard/);assert(updatedPage.bookmarked);assert.match(cachedPage.intro,/architecture studio/,'Migration does not mutate older retained snapshots');assert.equal(D.migrateBrowserPage({...cachedPage,intro:'My own text'}).intro,'My own text');assert.equal(D.migrateBrowserPage(updatedPage),updatedPage,'Content migration is idempotent');

assert.equal(D.migrateNote('Field observations\n\nRiverside: 14 plant species, mostly shaded.\nCourtyard: 8 species, direct sunlight.\nCheck whether sampling effort was equal.'),D.projects.research.note);
assert.equal(D.migrateNote('My own field observations'),'My own field observations');

const oldSurvey=JSON.parse(JSON.stringify(D.projects.research));oldSurvey.files[0][1]='Three survey sites';assert.equal(D.migrateProject('research',oldSurvey).files[0][1],'Four plots across two sites');oldSurvey.files[0][1]='My own survey description';assert.equal(D.migrateProject('research',oldSurvey).files[0][1],'My own survey description');
