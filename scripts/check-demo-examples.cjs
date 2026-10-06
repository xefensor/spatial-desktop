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
    workspaceProfiles: { general: { home: '/home/demo' } },
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
  return { storage, noteField };
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
