const assert = require("node:assert/strict");
const T = require("../dist/spatial-tiling.js");
const minimums = {
  dolphin: { width: 440, height: 340 },
  elisa: { width: 460, height: 360 },
  browser: { width: 420, height: 320 },
  terminal: { width: 390, height: 300 },
  notes: { width: 400, height: 300 }
};
const min = name => minimums[name];
function check(result, bounds) {
  const entries = [...result.windows];
  for (const [name, rect] of entries) {
    assert(rect.x >= bounds.x && rect.y >= bounds.y, name + " starts inside the workspace");
    assert(rect.x + rect.width <= bounds.x + bounds.width && rect.y + rect.height <= bounds.y + bounds.height, name + " fits the workspace");
    if (entries.length > 1) assert(rect.width >= min(name).width - 1 && rect.height >= min(name).height - 1, name + " remains usable");
  }
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i][1], b = entries[j][1];
    assert(!(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y), "Tiles never overlap");
  }
}

let checks = 0;
for (const [width, height] of [[300, 500], [650, 700], [1000, 900], [1750, 1000], [2600, 1400], [1500, 400]]) {
  const bounds = { x: 8, y: 8, width, height };
  let tree = null, allParked = [];
  for (const name of Object.keys(minimums)) {
    tree = T.insert(tree, name, T.names(tree).at(-1), null, bounds, min);
    const fitted = T.fit(tree, bounds, min, name);
    assert(fitted.windows.has(name), "New window is never parked");
    check(fitted, bounds);
    tree = fitted.node;
    allParked.push(...fitted.parked);
    checks++;
  }
  const roundTrip = T.normalize(JSON.parse(JSON.stringify(tree)), Object.keys(minimums));
  assert.deepEqual(T.names(roundTrip), T.names(tree), "Nested tree persists");
  if (width < 850) assert(allParked.length > 0, "Insufficient space parks running windows");
}

const bounds = { x: 8, y: 8, width: 1600, height: 1000 };
let tree = T.insert(T.leaf("dolphin"), "elisa", "dolphin", "right", bounds, min);
tree = T.insert(tree, "notes", "elisa", "bottom", bounds, min);
assert.equal(tree.axis, "x");
assert.equal(tree.b.axis, "y", "A target tile can split recursively");
const original = T.copy(tree);
tree = T.resizeWindow(tree, "dolphin", "x", 800, bounds);
const enlarged = T.fit(tree, bounds, min, "dolphin");
assert.deepEqual(T.names(enlarged.node), ["dolphin"], "Stretching parks the displaced subtree");
assert.deepEqual(enlarged.parked.sort(), ["elisa", "notes"]);
check(enlarged, bounds);
check(T.fit(original, bounds, min, "dolphin"), bounds);
const restored = T.insert(enlarged.node, "notes", "dolphin", "bottom", bounds, min);
const restoredResult = T.fit(restored, bounds, min, "notes");
assert.deepEqual(T.names(restoredResult.node).sort(), ["dolphin", "notes"], "A parked card returns to a new usable split");
check(restoredResult, bounds);
const removed = T.remove(original, "elisa");
assert.equal(removed.b.name, "notes", "Removing a leaf collapses its empty split");
assert.deepEqual(T.names(original), ["dolphin", "elisa", "notes"], "Resize/removal leaves saved snapshots unchanged");
assert.deepEqual(T.names(T.normalize({ kind: "split", axis: "x", a: T.leaf("notes"), b: T.leaf("notes") }, ["notes"])), ["notes"], "Duplicate leaves are repaired");
console.log("Spatial split engine: " + checks + " viewport/open scenarios + resize, park, restore, persistence and overlap checks passed.");

// Exercise the actual desktop adapter with DOM geometry stubs. These tests
// check state transitions, not browser rendering or visual appearance.
const fs = require("node:fs"), vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../dist/desktop-shell.js"), "utf8");
const frames = Object.fromEntries(Object.keys(minimums).map(name => {
  const classes = new Set();
  return [name, { dataset: { appFrame: name }, style: { zIndex: "1" }, hidden: true, classList: {
    contains: value => classes.has(value), add: (...values) => values.forEach(value => classes.add(value)),
    remove: (...values) => values.forEach(value => classes.delete(value)),
    toggle: (value, force) => { const enabled = force === undefined ? !classes.has(value) : force; enabled ? classes.add(value) : classes.delete(value); return enabled; }
  }}];
}));
const store = new Map();
const sandbox = {
  window: { SpatialTiling: T }, localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) },
  activeWorkspace: "general", activeProjectName: "project", projectModeId: () => "modeling", localDisplaySlot: () => 1,
  appState: Object.fromEntries(Object.keys(frames).map(name => [name, "closed"])),
  appInfo: Object.fromEntries(Object.keys(frames).map(name => [name, { label: name }])), appMaximizedState: {},
  frontApp: null, layoutMode: "manual", windowGeometry: new Map(), autoTiledWindows: new Set(), autoWindowAvoidance: new Map(),
  isLocalApp: () => true, minimumUsableWindowSize: min, frameFor: name => frames[name],
  workspaceBounds: () => ({ width: 1616, height: 1016, rect: { left: 0, top: 0 } }),
  syncMaximizeButton() {}, saveLayout() {}, showToast() {}, queueDesktopStateBroadcast() {}, scheduleSpatialAutoLayout() {},
  clearWindowAutoAvoidance() {}, displayAssignmentsFor: () => ({ apps: {} }),
  rebalanceAreaDisplays: () => false, applyExtendedDesktopPartition() {},
  requestAnimationFrame: () => 1, cancelAnimationFrame() {}, setTimeout() {},
  $: () => null, $$: selector => selector.includes("data-app-frame") ? Object.values(frames) : [],
  readGeometry: frame => ({ x: parseFloat(frame.style.left) || 8, y: parseFloat(frame.style.top) || 8, width: parseFloat(frame.style.width) || 440, height: parseFloat(frame.style.height) || 340 }),
  syncApps: () => Object.entries(frames).forEach(([name, frame]) => { frame.hidden = sandbox.appState[name] !== "open"; }),
  bringToFront: name => { sandbox.frontApp = name; frames[name].style.zIndex = String(Number(frames[name].style.zIndex) + 1); },
  topOpenApp: () => Object.keys(frames).find(name => sandbox.appState[name] === "open") || null,
};
vm.createContext(sandbox);
const slice = (first, last) => source.slice(source.indexOf(first), source.indexOf(last, source.indexOf(first)));
vm.runInContext(slice("function clampGeometry(", "function saveLayout("), sandbox);
vm.runInContext(slice("const tileEngine =", "function restoreWorkspaceWindowLayout("), sandbox);
vm.runInContext("renderTileDividers = () => {};", sandbox);
vm.runInContext(slice("function openApp(", "function syncMaximizeButton("), sandbox);
vm.runInContext('openApp("dolphin"); openApp("elisa"); openApp("notes");', sandbox);
assert.equal(sandbox.appState.notes, "open");
vm.runInContext('focusTileWindow("dolphin")', sandbox);
assert.equal(sandbox.appState.dolphin, "open");
assert.equal(sandbox.appState.elisa, "minimized");
assert.equal(sandbox.appState.notes, "minimized");
assert.equal(frames.elisa.hidden, true, "Overflow uses existing app minimization");
vm.runInContext('focusTileWindow("dolphin")', sandbox);
assert.equal(sandbox.appState.elisa, "open", "Focus restore revives the prior split");
assert.equal(sandbox.appState.notes, "open");
vm.runInContext('minimizeApp("notes"); openApp("notes")', sandbox);
assert.equal(sandbox.appState.notes, "open", "Restoring a card inserts a tile");
vm.runInContext('focusTileWindow("dolphin"); closeApp("notes"); focusTileWindow("dolphin")', sandbox);
assert.equal(sandbox.appState.notes, "closed", "Focus restore never reopens a closed app");
const rootBefore = vm.runInContext("JSON.stringify(tileSession().root)", sandbox);
sandbox.activeWorkspace = "school";
vm.runInContext('renderTileLayout("dolphin")', sandbox);
sandbox.activeWorkspace = "general";
assert.equal(vm.runInContext("JSON.stringify(tileSession().root)", sandbox), rootBefore, "Workspace trees are separate");
sandbox.projectModeId = () => "texturing";
assert.equal(vm.runInContext("tileSession().root", sandbox), null, "Project modes have independent split trees");
console.log("Desktop adapter: open, live-card parking, focus/restore, closed-app exclusion, workspace and mode isolation passed.");

// Run the real dock layout/session/resize paths, including legacy Auto data.
// Window activity must never steal dock space or move Areas to another display.
const areaFrames = Object.fromEntries(["projects", "apps", "systems"].map(name => [name, {
  hidden: false, dataset: {}, style: { removeProperty() {} },
  classList: { add() {}, remove() {} },
  handle: { listeners: new Map(), setPointerCapture() {},
    addEventListener(type, fn) { this.listeners.set(type, fn); },
    removeEventListener(type) { this.listeners.delete(type); }
  }
}]));
const shell = { clientWidth: 1600, clientHeight: 900,
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 1600, bottom: 900, width: 1600, height: 900 }) };
const docks = {
  tileEngine: T, activeWorkspace: "general", window: { innerWidth: 1600 },
  document: { querySelector: selector => areaFrames[selector.match(/data-area-window="([^"]+)/)?.[1]],
    body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {} } } },
  localStorage: sandbox.localStorage, isLocalArea: () => true,
  $: (selector, scope) => selector === ".desktop-shell" ? shell : scope?.handle,
  extendedDesktopActive: () => true, localDisplaySlot: () => 1, otherDisplaySlot: () => 2,
  applyDockRect(name, rect) { areaFrames[name].rect = rect; },
  captureBaseDockLaneRects() {}, syncAreaControls() {}, syncLayoutModeUI() {},
  setWorkspaceInsets(left, right, bottom, top) { docks.insets = { left, right, bottom, top }; },
  showToast() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  applyExtendedDesktopPartition() { throw Error("Area resized another display"); }
};
vm.createContext(docks);
vm.runInContext(slice("const areaPriority =", "function captureVisibleWindowViewportRects("), docks);
vm.runInContext(slice("function edgePriority(", "function syncAreaControls("), docks);
vm.runInContext(slice("function refreshSpatialAutoLayout(", "function relocationShiftFor("), docks);
vm.runInContext(slice("function applyAutoAvoidance(", "function freezeCurrentAreaLayout("), docks);
vm.runInContext(slice("function secondaryAreaCanvasNames(", "function applySecondaryAreaCanvas("), docks);
vm.runInContext(slice("function layoutDockAreas(", "function hideArea("), docks);
vm.runInContext(slice("function rebalanceAreaDisplays(", "function displayTransferTarget("), docks);
vm.runInContext(slice("function bindDockResize(", "function prepareAreaWindows("), docks);
vm.runInContext(`workspaceAreaSessions.general = {
  layoutMode: "auto", sizes: {left: 320, right: 300, top: 250, bottom: 250},
  hidden: {projects: false, apps: false, systems: false}
}; applyAreaSession("general");`, docks);
assert.equal(vm.runInContext("layoutMode", docks), "manual", "Legacy Auto sessions migrate to fixed Area bounds");
const beforeDocks = JSON.stringify(Object.values(areaFrames).map(area => area.rect));
const beforeInsets = JSON.stringify(docks.insets);
// Even stale state from another tab/version cannot re-enable window avoidance.
vm.runInContext(`layoutMode = "auto";
  autoWindowAvoidance.set("dolphin", new Set(["left", "right"]));
  refreshSpatialAutoLayout({}, {left: 0, right: 1600});
  setWindowAutoAvoidance("dolphin", ["left"]);
  applyAutoAvoidance(); layoutDockAreas();`, docks);
assert.equal(JSON.stringify(Object.values(areaFrames).map(area => area.rect)), beforeDocks, "Window activity leaves all Area rectangles unchanged");
assert.equal(JSON.stringify(docks.insets), beforeInsets, "Window activity leaves the tile canvas unchanged");
assert.equal(vm.runInContext("rebalanceAreaDisplays()", docks), false, "Areas never migrate monitors because of windows");
assert.equal(vm.runInContext("secondaryAreaCanvasNames().length", docks), 0, "Empty secondary displays do not expand Areas automatically");
vm.runInContext('bindDockResize("projects", areaFor("projects"));', docks);
const projectHandle = areaFrames.projects.handle;
projectHandle.listeners.get("pointerdown")({ button: 0, pointerId: 1, preventDefault() {}, stopPropagation() {} });
projectHandle.listeners.get("pointermove")({ clientX: 78, clientY: 300 });
projectHandle.listeners.get("pointerup")();
assert.equal(areaFrames.projects.dataset.areaState, "rail", "An explicit Area border drag still collapses to rail");
const railRect = JSON.stringify(areaFrames.projects.rect);
vm.runInContext('refreshSpatialAutoLayout(); layoutDockAreas();', docks);
assert.equal(JSON.stringify(areaFrames.projects.rect), railRect, "The user's rail size stays after release and later window activity");
vm.runInContext(`workspaceAreaSessions.school = {layoutMode: "auto", sizes: {left: 370, right: 330, top: 250, bottom: 250}};
  activeWorkspace = "school"; applyAreaSession("school");`, docks);
assert.equal(areaFrames.projects.rect.width, 370, "Another workspace retains its own explicit size");
vm.runInContext('activeWorkspace = "general"; applyAreaSession("general");', docks);
assert.equal(JSON.stringify(areaFrames.projects.rect), railRect, "Returning to a workspace restores its manually chosen rail");
console.log("Fixed Areas: legacy-state migration, invariant dock/canvas bounds, display stability, explicit rail resize and workspace persistence passed.");

vm.runInContext(slice("function hideArea(", "function showArea("), docks);
vm.runInContext(slice("function contextMenuEntries(", "function closeDesktopContextMenu("), docks);
vm.runInContext(`workspaceAreaSessions.general.hidden = {apps: true, systems: true, projects: false};
  applyAreaSession("general"); hideArea("apps"); hideArea("systems");`, docks);
assert.equal(areaFrames.apps.hidden, false, "Apps cannot be hidden by old saved state or a hide action");
assert.equal(areaFrames.systems.hidden, false, "System cannot be hidden by old saved state or a hide action");
for (const name of ["apps", "systems"]) {
  assert.equal(vm.runInContext(`contextMenuEntries({kind: "area", name: "${name}"}).some(item => item.action === "area-hide")`, docks), false, name + " context menu has no hide command");
}
vm.runInContext('hideArea("projects")', docks);
assert.equal(areaFrames.projects.hidden, true, "Project remains optionally hideable");
const html = fs.readFileSync(require("node:path").join(__dirname, "../dist/index.html"), "utf8");
assert(!html.includes("data-area-auto"), "Move dock buttons are removed");
assert(!/data-(?:area-hide|overview-area-visibility)="(?:apps|systems)"/.test(html), "No Apps/System hide buttons remain");
console.log("Persistent Areas: hidden-state migration, blocked hide actions, context-menu policy and removed controls passed.");
