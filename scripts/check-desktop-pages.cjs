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
assert.equal(Pages.create({ work: { active: 100, windows: { browser: -4 } } }).current('work'), 1, 'Corrupt saved indices cannot create unreachable desktops');

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
const nodes = Object.fromEntries(['.workspace-zone', '#allAppsToggle', '#desktopPageNumber', '#emptyWorkspace', 'strong', 'span', '#desktopContextMenu'].map(key => [key, node(key)]));
let clock = 0;
const ctx = vm.createContext({
  SpatialDesktopPages: Pages, desktopPages: Pages.create(), desktopWheel: Pages.wheelGate(),
  desktopColumnWheel: Pages.wheelGate(), projectSpaces: {}, activeProjectName: null,
  activeWorkspace: 'work', workspaceProfiles: {work: {label: 'Work'}}, desktopHasWindowFocus: true, desktopPageAnimating: false,
  tileInteraction: false, manualWindowInteraction: false, superKeyAlone: false,
  $: key => nodes[key] || node(key), $$: () => [],
  document: { addEventListener(type, callback) { listeners['document:' + type] = callback; } },
  performance: { now: () => clock },
  syncRack() { throw new Error("Rebuilding the hotbar would detach the clicked Area button"); }, originalSyncRack() {}, renderOverviewWindows() {}, saveDesktopPages() {},
  migrateProjectDesktops() {}, migrateDesktopColumns() {}, syncProjectAreaView() {}, isLocalApp: () => true, bringToFront() {},
  tileSession: () => ({})
});
vm.runInContext(slice('function updateDesktopPageUi(', 'function changeDesktopPage('), ctx);
ctx.renderDesktopContextColumns = () => {}; // Header rendering is exercised by check-desktop-columns.
ctx.openProjectNames = () => ctx.activeProjectName ? [ctx.activeProjectName] : [];
vm.runInContext(slice('function prepareDesktopPages(', 'function isLocalApp('), ctx);
const changes = [];
ctx.changeDesktopPage = page => { changes.push(page); ctx.desktopPages.go('work', page); return true; };
ctx.prepareDesktopPages();
const event = (delta = 80) => ({ deltaY: delta, deltaX: 0, deltaMode: 0, preventDefault() { this.prevented = this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } });
let e = event(); listeners['.workspace-zone:wheel'](e);
assert.equal(e.prevented, undefined); assert.equal(changes.length, 0, 'Focused app owns its scrolling');
listeners['.workspace-zone:pointerdown']({target: {closest: () => null}});
assert.equal(ctx.desktopHasWindowFocus, false);
assert.equal(nodes['.workspace-zone'].dataset.desktopFocused, 'true');
assert.equal(nodes['#desktopPageNumber'].textContent, 1);
assert.equal(nodes['#allAppsToggle']['aria-label'], 'Open Work workspace overview · Desktop 1');
assert.equal(nodes['#allAppsToggle']['aria-pressed'], undefined, 'Updating the page badge does not alter the Overview toggle state');
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
// All three Areas release app focus, including headers and interactive fields.
// The capture listener must leave their native click/focus actions intact.
nodes['#desktopContextMenu'].hidden = true;
let workspaceFocusCalls = 0;
nodes['.workspace-zone'].focus = () => workspaceFocusCalls++;
for (const areaName of ['apps', 'projects', 'systems']) {
  for (const control of ['header', 'button', 'input', 'textarea']) {
    ctx.desktopHasWindowFocus = true;
    let blurred = false;
    ctx.document.activeElement = { closest: () => ({}), blur: () => { blurred = true; } };
    const areaEvent = {
      target: { closest: selector => selector === '[data-area-window]' ? { areaName, control } : null },
      preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }
    };
    listeners['document:pointerdown'](areaEvent);
    assert.equal(ctx.desktopHasWindowFocus, false, areaName + ' ' + control + ' releases window focus');
    assert.equal(blurred, true, 'The previous app field loses keyboard focus');
    assert.equal(areaEvent.prevented, undefined, 'Area control default actions are preserved');
    assert.equal(areaEvent.stopped, undefined, 'Area dragging and resize handlers receive the event');
  }
}
assert.equal(workspaceFocusCalls, 0, 'Area clicks do not steal focus into the canvas');
ctx.desktopHasWindowFocus = true;
listeners['document:pointerdown']({ target: { closest: () => null } });
assert.equal(ctx.desktopHasWindowFocus, true, 'Clicking inside an app does not release its focus');
nodes['.desktop-shell'] = { inert: true };
listeners['document:pointerdown']({ target: { closest: () => ({}) } });
assert.equal(ctx.desktopHasWindowFocus, true, 'Modal background isolation is preserved');


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

// Real visibility/focus adapter: leaving a page keeps its windows open.
const classes = () => { const values = new Set(); return { contains: key => values.has(key), remove: key => values.delete(key), toggle(key, on) { on ? values.add(key) : values.delete(key); } }; };
const frames = Object.fromEntries(['browser', 'notes'].map(name => [name, { dataset: { appFrame: name }, style: { zIndex: 20 }, classList: classes() }]));
const adapter = vm.createContext({
  desktopPages: Pages.create(), activeWorkspace: 'work', appState: { browser: 'open', notes: 'open' },
  frontApp: 'browser', desktopHasWindowFocus: true, zCounter: 20,
  frameFor: name => frames[name], extendedDesktopActive: () => false,
  localDisplaySlot: () => 1, displayAssignmentsFor: () => ({ apps: {} }),
  $: () => ({}), $$: () => Object.values(frames),
  syncProjectWindowScopes() {}, syncRack() {}, renderMiniApps() {}, renderOverviewWindows() {},
  updateDesktopPageUi() {}, scheduleWindowVisibility() {}, persistWorkspaceAppStates() {},
  windowViewportLockReady: false
});
vm.runInContext(slice('function isLocalApp(', 'function isLocalArea('), adapter);
vm.runInContext(slice('function topOpenApp(', 'function openApp('), adapter);
adapter.desktopPages.assign('work', 'notes', 1);
adapter.syncApps();
assert.equal(frames.browser.hidden, false); assert.equal(frames.notes.hidden, true);
adapter.desktopPages.go('work', 1); adapter.desktopHasWindowFocus = false;
adapter.syncApps();
assert.equal(frames.browser.hidden, true); assert.equal(frames.notes.hidden, false);
assert.equal(adapter.appState.browser, 'open', 'Off-page windows are neither minimized nor closed');
assert.equal(adapter.desktopHasWindowFocus, false, 'Sync/retile cannot steal desktop focus');
adapter.bringToFront('notes');
assert.equal(adapter.desktopHasWindowFocus, true);
assert.equal(frames.notes.classList.contains('is-front'), true);
adapter.desktopPages.go('work', 0); adapter.desktopHasWindowFocus = false;
adapter.syncApps();
assert.equal(frames.browser.hidden, false); assert.equal(adapter.appState.notes, 'open');

const transfer = vm.createContext({
  desktopPages: adapter.desktopPages, activeWorkspace: 'work',
  appInfo: { browser: {}, notes: {} }, appState: { browser: 'open', notes: 'closed' },
  activeProjectName: null, windowMembership: {}, desktopPageAnimating: false,
  openApp(name) { transfer.appState[name] = 'open'; },
  changeDesktopPage(page) { transfer.desktopPages.go('work', page); },
  removeOffPageWindowTiles() {}, saveDesktopPages() {}, saveIndependentSessions() {}
});
vm.runInContext(slice('const originalOpenApp = openApp;', 'function removeWindowFromSavedProjects('), transfer);
transfer.desktopPages.go('work', 1);
transfer.openApp('browser');
assert.equal(transfer.desktopPages.current('work'), 0, 'Existing hotbar windows navigate to their own desktop');
transfer.desktopPages.go('work', 1);
transfer.openApp('notes');
assert.equal(transfer.desktopPages.pageOf('work', 'notes'), 1, 'New windows belong to the desktop being viewed');
transfer.appState.notes = 'minimized';
transfer.desktopPages.assign('work', 'notes', 0);
transfer.openApp('notes');
assert.equal(transfer.desktopPages.current('work'), 1, 'Restoring a minimized card never jumps back to its former desktop');
assert.equal(transfer.desktopPages.pageOf('work', 'notes'), 1, 'Minimized windows travel onto the current desktop when restored');

const hotbar = vm.createContext({
  desktopPages: {inColumn: () => true},
  activeWorkspace: 'work', workspaceProfiles: { work: { rack: ['browser', 'closed', 'parked'] } },
  appState: { browser: 'open', closed: 'closed', parked: 'minimized', other: 'open', instance: 'open' },
  isLocalApp: name => ['browser', 'instance'].includes(name)
});
vm.runInContext(slice('function workspaceHotbarNames(', 'function renderInstanceRack('), hotbar);
assert.deepEqual(Array.from(hotbar.workspaceHotbarNames()), ['browser', 'instance', 'parked'], 'Top hotbar keeps minimized icons while excluding closed and off-page open windows');
assert.deepEqual(Array.from(hotbar.workspaceShortcutNames()), ['browser', 'instance', 'parked'], 'Minimized cards share their icon’s unique keyboard slot');
hotbar.isLocalApp = () => false;
assert.deepEqual(Array.from(hotbar.workspaceHotbarNames()), ['parked'], 'Minimized icons remain in the hotbar when the desktop has no visible windows');
assert.deepEqual(Array.from(hotbar.workspaceShortcutNames()), ['parked'], 'Minimized shortcuts appear exactly once on an empty desktop');
let restored = null;
Object.assign(hotbar, {
  appInfo: { parked: {} }, desktopHasWindowFocus: false, frontApp: null,
  openApp: name => { restored = name; }, queueDesktopStateBroadcast() {},
  $: selector => selector === '#universalSearch' ? { classList: { contains: () => false } } : null
});
vm.runInContext(slice('function activateHotbarSlot(', 'document.addEventListener("keydown",'), hotbar);
assert.equal(hotbar.activateHotbarSlot(1), true);
assert.equal(restored, 'parked', 'Keyboard shortcuts restore travelling minimized windows from their shared slot');
assert.equal(hotbar.activateHotbarSlot(2), false);

console.log('Vertical desktops passed: page bounds, workspace isolation, reload/sync, wheel gestures/momentum, focus ownership, zoom/menu guards and lossless legacy session migration.');

// Shift wheel uses the horizontal column axis, preserving focused app and zoom input.
ctx.activeProjectName='site';ctx.projectSpaces.site={name:'Website Launch'};
vm.runInContext(slice('function adjacentDesktopColumn(', 'function changeDesktopColumn('),ctx);
const columnChanges=[];
ctx.changeDesktopColumn=column=>{columnChanges.push(column);ctx.desktopPages.select('work',column);};
ctx.desktopHasWindowFocus=false;clock=2000;
e=event();e.shiftKey=true;listeners['.workspace-zone:wheel'](e);
assert.equal(e.prevented,true);assert.deepEqual(columnChanges,['site']);
for(clock=2015;clock<2200;clock+=15) {e=event();e.shiftKey=true;listeners['.workspace-zone:wheel'](e);}
assert.deepEqual(columnChanges,['site']);
clock=2500;e=event(0);e.deltaX=-80;e.shiftKey=true;listeners['.workspace-zone:wheel'](e);
assert.deepEqual(columnChanges,['site','workspace'],'Browsers that report Shift+wheel as deltaX can also switch columns');
ctx.desktopHasWindowFocus=true;clock=2800;e=event();e.shiftKey=true;listeners['.workspace-zone:wheel'](e);
assert.equal(e.prevented,undefined);assert.equal(columnChanges.length,2);
ctx.desktopHasWindowFocus=false;clock=3100;e=event();e.shiftKey=true;e.ctrlKey=true;listeners['.workspace-zone:wheel'](e);
assert.equal(e.prevented,undefined);
console.log('Column wheel passed: Shift axis, focused-app ownership, horizontal delta compatibility, momentum and zoom guards.');

// Explicit Win shortcuts are captured above both focused app content and Areas.
// They share the ordinary wheel gates and must never toggle Overview on release.
nodes['#desktopContextMenu'].hidden=true;
ctx.desktopHasWindowFocus=true;ctx.superKeyAlone=true;
ctx.desktopWheel.reset();ctx.desktopColumnWheel.reset();
ctx.desktopPages.select('work','workspace');ctx.desktopPages.go('work',0);
const changeCount=changes.length;
clock=4000;e=event();e.metaKey=true;
listeners['document:wheel'](e);
assert.equal(e.prevented,true);assert.equal(e.stopped,true);
assert.equal(ctx.superKeyAlone,false,'Win+wheel consumes the standalone Overview key');
assert.equal(changes.length,changeCount+1);
assert.equal(ctx.desktopPages.current('work'),1,'Win+wheel navigates with a focused app');
listeners['.workspace-zone:wheel'](e);
assert.equal(changes.length,changeCount+1,'Capture and canvas listeners cannot process one wheel twice');
for(clock=4015;clock<4200;clock+=15){e=event();e.metaKey=true;listeners['document:wheel'](e);}
assert.equal(changes.length,changeCount+1,'Explicit shortcuts preserve momentum gating');

clock=4500;e=event(-5);e.deltaMode=1;e.getModifierState=key=>key==='OS';
listeners['document:wheel'](e);
assert.equal(ctx.desktopPages.current('work'),0,'OS modifier alias and line-mode wheels work');
const columnCount=columnChanges.length;
clock=5000;e=event(0);e.deltaX=80;e.shiftKey=true;e.metaKey=true;
listeners['document:wheel'](e);
assert.equal(columnChanges.length,columnCount+1);
assert.equal(ctx.desktopPages.column('work'),'site','Win+Shift+wheel changes projects with a focused app');
clock=5500;e=event(-80);e.shiftKey=true;e.metaKey=true;
listeners['document:wheel'](e);
assert.equal(ctx.desktopPages.column('work'),'workspace','Win+Shift+wheel returns to Workspace');

for(const modifier of ['ctrlKey','altKey']){
 clock+=500;e=event();e.metaKey=true;e[modifier]=true;listeners['document:wheel'](e);
 assert.equal(e.prevented,undefined,modifier+' combinations keep their existing behavior');
}
clock+=500;e=event(0);e.deltaX=80;e.metaKey=true;listeners['document:wheel'](e);
assert.equal(e.prevented,undefined,'Horizontal scrolling alone is not a vertical desktop shortcut');
nodes['#desktopContextMenu'].hidden=false;
clock+=500;e=event();e.metaKey=true;listeners['document:wheel'](e);
assert.equal(e.prevented,undefined,'Explicit shortcuts respect menu guards');
nodes['#desktopContextMenu'].hidden=true;
ctx.tileInteraction=true;
clock+=500;e=event();e.metaKey=true;listeners['document:wheel'](e);
assert.equal(e.prevented,undefined,'Document navigation leaves held-window gestures to their own handler');
ctx.tileInteraction=false;
clock+=500;e=event();listeners['document:wheel'](e);
assert.equal(e.prevented,undefined,'Plain Area scrolling is never intercepted globally');
console.log('Win wheel passed: focused app/Area capture, project axis, OS alias, line deltas, momentum, duplicate/Overview prevention and input/menu/drag guards.');

// Exercise the actual window-owned pointer gesture rather than global navigation.
const dragListeners={},carried=[];
const held=vm.createContext({
  cancelWindowPointerInteraction:null,cancelAnimationFrame(){},tileLayoutFrame:0,tileInteraction:false,
  SpatialDesktopPages:Pages,desktopPages:Pages.create(),activeWorkspace:'work',tileSessions:{},
  activeDesktopDrag:null,desktopPageAnimating:false,superKeyAlone:true,performance:{now:()=>clock},
  $:()=>({clientHeight:800}),
  window:{addEventListener(type,fn){dragListeners[type]=fn;},removeEventListener(type){delete dragListeners[type];},dispatchEvent(){}},
  document:{addEventListener(){},removeEventListener(){},hidden:false},CustomEvent:function(){},
  adjacentDesktopColumn:direction=>direction>0?'site':'workspace',
  changeDraggedDesktopPage(drag,page){carried.push(['desktop',page]);held.desktopPages.go('work',page);return true;},
  changeDraggedDesktopColumn(drag,column){carried.push(['project',column]);return true;},cancelDraggedDesktopPages(){}
});
vm.runInContext(slice('function trackWindowPointer(', 'function beginManualWindowInteraction('),held);
held.trackWindowPointer({pointerId:1,button:0,clientX:100,clientY:100},{setPointerCapture(){},releasePointerCapture(){}},()=>{},()=>{}, {name:'notes'});
clock=10000;e=event();e.metaKey=true;dragListeners.wheel(e);
assert.equal(e.prevented,true);assert.equal(e.stopped,true);
assert.deepEqual(carried,[['desktop',1]],'Win+wheel carries the held window to another desktop');
assert.equal(held.superKeyAlone,false);
clock=10500;e=event();e.metaKey=true;e.shiftKey=true;dragListeners.wheel(e);
assert.deepEqual(carried,[['desktop',1],['project','site']],'Win+Shift+wheel carries the held window into a project');
dragListeners.pointerup({pointerId:1,type:'pointerup'});
assert.equal(dragListeners.wheel,undefined,'Release removes the window-owned wheel handler');
console.log('Held-window Win wheel passed: desktop/project carry, standalone-key suppression and release cleanup.');
