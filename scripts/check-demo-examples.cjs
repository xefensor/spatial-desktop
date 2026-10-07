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
assert.equal(preserved.resources[1][0], 'Reference images');
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
const sceneAreas = freshScene.read('spatial-workspace-area-layouts-v1');
const sceneProjects = freshScene.read('spatial-workspace-project-states-v1');
assert.deepEqual(Object.entries(sceneApps.general).filter(([, state]) => state === 'open').map(([name]) => name), ['dolphin']);
assert.equal(sceneProjects.general.project, null);
assert.equal(sceneAreas.general.hidden.projects, true);
assert.equal(sceneProjects.school.project, 'research');
assert.equal(sceneAreas.school.state.apps.edge, 'bottom');
assert.equal(sceneAreas.work.state.projects.edge, 'right');
assert.equal(sceneProjects.work.mode, 'prototype');
assert.equal(sceneApps.gaming.elisa, 'minimized');
assert.equal(sceneAreas.gaming.sizes.right, 70);
assert.equal(Object.keys(D.projects.research.modes).length, 1);
const tiles = freshScene.read('spatial-split-layouts-v1');
assert.equal(tiles['work:plasma:prototype:1'].root.axis, 'y');
assert.deepEqual(require('../dist/spatial-tiling.js').names(tiles['work:plasma:prototype:1'].root), ['browser', 'terminal']);
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
assert(customScene.storage.getItem('spatial-demo-scenes-backup-v1'));
const emptyLibrary = sceneStore({ 'spatial-project-spaces-v2': '{}' });
D.seedWorkspaces(emptyLibrary.storage);
assert.deepEqual(emptyLibrary.read('spatial-project-spaces-v2'), {});
assert.equal(emptyLibrary.read('spatial-workspace-project-states-v1').school.project, null);
assert.equal(emptyLibrary.read('spatial-workspace-area-layouts-v1').school.hidden.projects, true);
assert.equal(D.migrateProject('plasma', { ...D.projects.plasma, root: '/home/demo/Projects/website-launch', originWorkspace: 'general' }).originWorkspace, 'work');
console.log('Demo scenes passed: distinct activities, one General window, no empty Project Area, single-mode research, one-time migration, custom data and deleted library.');

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
    SpatialDemoExamples: D,
    workspaceProfiles: { general: { home: '/home/demo' }, school: { home: '/home/demo/Workspaces/School' }, work: { home: '/home/demo/Workspaces/Work' }, gaming: { home: '/home/demo/Workspaces/Gaming' } },
    appInfo: { browser: {}, dolphin: {}, notes: {}, terminal: {}, elisa: {} },
    activeWorkspace: 'general',
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    $: () => noteField,
    noteDraft: ''
  });
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

// Exercise real Workspace switching, including restoration before Area/window layout.
const ui = storageAdapter({ 'spatial-workspace-project-states-v1': JSON.stringify({ general: { project: 'plasma', mode: 'visual' }, school: { project: null, mode: null } }) });
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { hidden: false, scrollTop: 0, innerHTML: '', textContent: '', value: '', closest() { return this; }, insertAdjacentHTML(position, html) { this.innerHTML = html; }, style: { setProperty() {} }, classList: { remove() {}, toggle() {} }, setAttribute() {} });
  return elements.get(id);
}
const widgets = [element('calendar'), element('phone')];
const raf = [];
const calls = [];
Object.assign(ui.context, {
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
  requestAnimationFrame: fn => raf.push(fn), clearTimeout() {},
  hideNotificationPeek() {}, syncNotifications() {}, setFocusRunning(running) { ui.context.focusRunning = running; },
  persistWorkspaceAppStates() { ui.context.workspaceAppStates[ui.context.activeWorkspace] = { ...ui.context.appState }; },
  loadLayout(name) { calls.push(['windows', name, vm.runInContext('activeProjectName', ui.context)]); },
  applyAreaSession(name) { calls.push(['areas', name, vm.runInContext('activeProjectName', ui.context)]); },
  saveAreaLayout() {}, saveLayout() {},
  refreshWorkspaceContext() {}, workspaceFavoriteMarkup() {}, escapeHtml: x => x, icon: () => '', appArt: () => '',
  applyAppPrimaryColors() {}, prepareControlSemantics() {}, syncApps() {},
  renderWorkspaceExample() {},
  renderOverviewProjects() {}, setProjectClosedState(closed) { element('project').hidden = closed; },
  renderProjectSpace(name) { vm.runInContext('activeProjectName = ' + JSON.stringify(name) + '; rememberWorkspaceProject();', ui.context); element('project').hidden = false; },
  restoreWorkspaceWindowLayout() { calls.push(['restore', ui.context.activeWorkspace]); }, bringToFront() {}, showToast() {}
});
for (const [name, profile] of Object.entries(ui.context.workspaceProfiles)) Object.assign(profile, { label: name, accent: '#56baff', icon: 'i-grid', favorites: [], folders: [], rack: [], agenda: ['', '', ''] });
vm.runInContext(slice('function snapshotWorkspaceAreaContent(', 'function workspaceFavoriteMarkup('), ui.context);
vm.runInContext(slice('function renderWorkspace(', 'function renderWorkspaceExample('), ui.context);
vm.runInContext('defaultAreaContent = snapshotWorkspaceAreaContent();', ui.context);
element('#notificationList').innerHTML = 'General notification';
element('.system-scroll-region').scrollTop = 120;
widgets[1].hidden = true;
ui.context.focusRunning = true;
ui.context.focusSeconds = 1400;
element('#timerWidget').hidden = false;
vm.runInContext('renderWorkspace("school", false);', ui.context);
assert.equal(vm.runInContext('activeProjectName', ui.context), null);
assert.equal(element('project').hidden, true);
assert.equal(element('#notificationList').innerHTML, '', 'School gets its own notifications');
assert.equal(element('.system-scroll-region').scrollTop, 0);
assert.equal(widgets[1].hidden, false, 'General widget removal does not alter School');
assert.equal(ui.context.focusRunning, false, 'General timer does not become School’s timer');
assert.deepEqual(calls.slice(0, 2), [['windows', 'school', null], ['areas', 'school', null]], 'Project context changes before restoring Areas and tiling');
element('#notificationList').innerHTML = 'School notification';
element('.system-scroll-region').scrollTop = 24;
vm.runInContext('renderWorkspace("general", false);', ui.context);
assert.equal(vm.runInContext('activeProjectName', ui.context), 'plasma');
assert.equal(element('#notificationList').innerHTML, 'General notification');
assert.equal(element('.system-scroll-region').scrollTop, 120);
assert.equal(widgets[1].hidden, true);
assert.equal(ui.context.focusRunning, true);
assert.ok(ui.context.focusSeconds <= 1400 && ui.context.focusSeconds >= 1399);
raf.forEach(fn => fn());
assert.deepEqual(calls.filter(call => call[0] === 'restore'), [['restore', 'general']], 'A delayed callback from the previous Workspace cannot relayout the current one');
console.log('Workspace sessions passed: isolated Projects/Modes, legacy migration, reload, widget visibility, notifications, timer, scroll and switch ordering.');

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

