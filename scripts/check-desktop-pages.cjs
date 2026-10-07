const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Pages = require('../dist/desktop-pages.js');
const source = fs.readFileSync(require.resolve('../dist/desktop-shell.js'), 'utf8');
const slice = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

const pages = Pages.create();
pages.assign('work', 'browser');
assert.equal(pages.go('work', 1), true);
assert.equal(pages.visible('work', 'browser'), false);
assert.equal(pages.go('work', 2), false, 'One trailing empty page prevents runaway scrolling');
pages.assign('work', 'notes');
assert.equal(pages.go('work', 2), true);
assert.equal(pages.pageOf('work', 'notes'), 1);
assert.equal(pages.current('general'), 0, 'Workspace pages are independent');
const reloaded = Pages.create(pages.snapshot());
assert.deepEqual(reloaded.snapshot(), pages.snapshot(), 'Page and window assignments survive reload/sync');
const snapshot = pages.snapshot(); snapshot.work.windows.browser = 9;
assert.equal(pages.pageOf('work', 'browser'), 0, 'Snapshots cannot mutate live state');

const wheel = Pages.wheelGate();
assert.equal(wheel.feed(12, 0), 0);
assert.equal(wheel.feed(28, 15), 1);
for (let time = 30; time <= 300; time += 15) assert.equal(wheel.feed(80, time), 0, 'Momentum never advances twice');
assert.equal(wheel.feed(-60, 500), -1, 'A fresh gesture can reverse direction');
wheel.reset();
assert.equal(wheel.feed(30, 600), 0);
assert.equal(wheel.feed(-30, 615), 0, 'Direction reversal discards incomplete accumulation');
assert.equal(wheel.feed(-10, 630), -1);

// Exercise the actual focus and wheel listeners; app/Area scroll must be untouched.
const listeners = {};
const node = key => ({ key, hidden: true, dataset: {}, textContent: '',
  classList: { contains: () => false, toggle() {}, remove() {} },
  setAttribute(name, value) { this[name] = value; },
  addEventListener(type, callback) { listeners[key + ':' + type] = callback; },
  focus() {}, clientHeight: 800
});
const nodes = Object.fromEntries(['.workspace-zone', '#desktopFocusButton', '#desktopPageNumber', '#emptyWorkspace', 'strong', 'span', '#desktopContextMenu'].map(key => [key, node(key)]));
let clock = 0;
const ctx = vm.createContext({
  SpatialDesktopPages: Pages, desktopPages: Pages.create(), desktopWheel: Pages.wheelGate(),
  activeWorkspace: 'work', desktopHasWindowFocus: true, desktopPageAnimating: false,
  tileInteraction: false, manualWindowInteraction: false,
  $: key => nodes[key] || node(key), $$: () => [],
  document: { addEventListener(type, callback) { listeners['document:' + type] = callback; } },
  performance: { now: () => clock },
  syncRack() {}, renderOverviewWindows() {}, saveDesktopPages() {},
  migrateProjectDesktops() {}, isLocalApp: () => true, bringToFront() {},
  tileSession: () => ({})
});
vm.runInContext(slice('function updateDesktopPageUi(', 'function changeDesktopPage('), ctx);
vm.runInContext(slice('function prepareDesktopPages(', 'function isLocalApp('), ctx);
const changes = [];
ctx.changeDesktopPage = page => { changes.push(page); ctx.desktopPages.go('work', page); return true; };
ctx.prepareDesktopPages();
const event = (delta = 80) => ({ deltaY: delta, deltaX: 0, deltaMode: 0, preventDefault() { this.prevented = true; } });
let e = event(); listeners['.workspace-zone:wheel'](e);
assert.equal(e.prevented, undefined); assert.equal(changes.length, 0, 'Focused app owns its scrolling');
listeners['#desktopFocusButton:click']();
assert.equal(ctx.desktopHasWindowFocus, false);
assert.equal(nodes['#desktopFocusButton']['aria-pressed'], 'true');
e = event(); listeners['.workspace-zone:wheel'](e);
assert.equal(e.prevented, true); assert.deepEqual(changes, [1]);
ctx.desktopPageAnimating = true;
for (clock = 15; clock <= 240; clock += 15) listeners['.workspace-zone:wheel'](event());
ctx.desktopPageAnimating = false;
listeners['.workspace-zone:wheel'](event());
assert.deepEqual(changes, [1], 'Animation does not open a gap in momentum suppression');
clock = 500; e = event(-80); listeners['.workspace-zone:wheel'](e);
assert.deepEqual(changes, [1, 0]);
e = event(); e.ctrlKey = true; listeners['.workspace-zone:wheel'](e);
assert.equal(e.prevented, undefined, 'Browser zoom is preserved');
nodes['#desktopContextMenu'].hidden = false;
clock = 800; e = event(); listeners['.workspace-zone:wheel'](e);
assert.equal(e.prevented, undefined, 'Menus block desktop navigation');

// Migrate two saved modes reusing a live window without overwriting its content.
const migration = vm.createContext({
  desktopPages: Pages.create(), workspaceProfiles: { work: {} },
  readDesktopStorage: () => ({ work: { browser: 'open' } }),
  workspaceAppStates: { work: { browser: 'open' } },
  workspaceProjectStates: { work: { project: 'site', mode: 'build' } },
  appInfo: { browser: { base: 'browser' } }, projectSpaces: { site: {} },
  projectModeId: () => 'build',
  projectWindowSessions: {
    'work:site:review': { apps: ['browser'], states: { browser: 'open' }, geometry: { browser: { x: 30 } }, displays: { browser: 1 } },
    'work:site:design': { apps: ['browser'], states: { browser: 'minimized' }, geometry: { browser: { x: 70 } } }
  },
  tileSessions: { 'work:site:build:1': { root: { name: 'browser' } }, 'work:site:review:1': { root: { name: 'browser' }, floating: { browser: { left: 30 } } } },
  windowMembership: {}, instanceSequence: 0, instanceDefinitions: {},
  workspaceContent: { work: { frames: { browser: [{ value: 'draft' }] } } },
  cloneDesktopState: value => JSON.parse(JSON.stringify(value)),
  installInstance(id, base) { migration.appInfo[id] = { base }; },
  saveIndependentSessions() {}, persistProjectState() {}, saveTileSessions() {}, saveDesktopPages() {}
});
vm.runInContext(slice('function migrateProjectDesktops(', 'function prepareDesktopPages('), migration);
migration.migrateProjectDesktops();
assert.equal(migration.desktopPages.pageOf('work', 'browser'), 0);
assert.equal(migration.desktopPages.pageOf('work', 'browser--1'), 1);
assert.equal(migration.desktopPages.pageOf('work', 'browser--2'), 2);
assert.deepEqual(JSON.parse(JSON.stringify(migration.projectWindowSessions['work:site:build'].apps)), ['browser--1', 'browser--2']);
assert.equal(migration.projectWindowSessions['work:site:build'].geometry['browser--2'].x, 70);
assert.equal(migration.workspaceContent.work.frames['browser--1'][0].value, 'draft');
assert.equal(migration.tileSessions['work:desktop:1:1'].root.name, 'browser--1');
assert.equal(migration.tileSessions['work:desktop:1:1'].floating['browser--1'].left, 30);
const migrated = JSON.stringify(migration.desktopPages.snapshot());
migration.migrateProjectDesktops();
assert.equal(JSON.stringify(migration.desktopPages.snapshot()), migrated, 'Migration is idempotent');
assert.equal(migration.instanceSequence, 2);
console.log('Vertical desktops passed: page bounds, workspace isolation, reload/sync, wheel gestures/momentum, focus ownership, zoom/menu guards and lossless legacy session migration.');
