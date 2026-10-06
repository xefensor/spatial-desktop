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

// Fixed floats reserve space with the same 8px gap as neighbouring tiles.
const obstacleBounds = {x:8,y:8,width:1800,height:1200};
let obstacleTree = T.insert(T.leaf("dolphin"), "elisa", "dolphin", "right", obstacleBounds, min);
obstacleTree = T.insert(obstacleTree, "notes", "elisa", "bottom", obstacleBounds, min);
const centralFloat = {x:750,y:8,width:340,height:1200};
const noOverlap = (result, obstacles) => {
  check(result, obstacleBounds);
  for (const [name,rect] of result.windows) {
    assert(rect.width >= min(name).width-1 && rect.height >= min(name).height-1, name+" stays usable around a float");
    for (const obstacle of obstacles) assert(rect.x+rect.width <= obstacle.x-T.gap || rect.x >= obstacle.x+obstacle.width+T.gap || rect.y+rect.height <= obstacle.y-T.gap || rect.y >= obstacle.y+obstacle.height+T.gap, name+" clears a floating window and its gutter");
  }
  for (const split of result.splits) assert.equal(T.at(result.node,split.path).axis,split.axis, "Visible divider addresses the real persistent split");
};
const bothSides = T.fitAvoiding(obstacleTree,obstacleBounds,min,"notes",()=>0,[centralFloat]);
assert.equal(bothSides.windows.size,3,"Uses both sides of a central float instead of parking a usable window");
assert.equal(bothSides.parked.length,0);
noOverlap(bothSides,[centralFloat]);
assert([...bothSides.windows.values()].some(rect=>rect.x+rect.width < centralFloat.x));
assert([...bothSides.windows.values()].some(rect=>rect.x > centralFloat.x+centralFloat.width));
assert.equal(bothSides.splits.length,1,"A shared free lane keeps a working resize divider");
const insertedAround = T.insert(bothSides.node,"browser","dolphin",null,obstacleBounds,min,bothSides.windows);
const fourAround = T.fitAvoiding(insertedAround,obstacleBounds,min,"browser",()=>0,[centralFloat]);
assert.equal(fourAround.windows.size,4,"New insertion chooses a useful vertical split in the narrow free lane");
noOverlap(fourAround,[centralFloat]);
const sideFloats = [{x:8,y:8,width:240,height:1200},{x:1540,y:8,width:268,height:1200}];
const middleLane = T.fitAvoiding(obstacleTree,obstacleBounds,min,"notes",()=>0,sideFloats);
assert.equal(middleLane.windows.size,3,"Multiple floats leave a usable centre lane");
noOverlap(middleLane,sideFloats);
const resizedAvoiding = T.resizeWindow(middleLane.node,"elisa","y",30,obstacleBounds,middleLane);
noOverlap(T.fitAvoiding(resizedAvoiding,obstacleBounds,min,"elisa",()=>0,sideFloats),sideFloats);
const covered = T.fitAvoiding(obstacleTree,obstacleBounds,min,"notes",()=>0,[obstacleBounds]);
assert.equal(covered.windows.size,0,"Does not place an unusable app under a covering float");
assert.equal(covered.parked.length,3);
assert.deepEqual(T.fitAvoiding(obstacleTree,obstacleBounds,min,"notes",()=>0,[{x:2500,y:0,width:400,height:500}]),T.fit(obstacleTree,obstacleBounds,min,"notes"),"Off-workspace floats do not constrain tiles");
assert.deepEqual(T.fitAvoiding(obstacleTree,obstacleBounds,min,"notes"),T.fit(obstacleTree,obstacleBounds,min,"notes"),"Removing the obstruction restores ordinary tiling");
console.log("Floating obstacles: both-side packing, multiple floats, gutters, usable sizes, divider paths, resize, full coverage and obstruction removal passed.");

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
  window: { SpatialTiling: T, innerWidth: 1616, innerHeight: 1016 }, localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) },
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
  classList: { add() {}, remove() {}, toggle() {} },
  handle: { listeners: new Map(), setPointerCapture() {},
    addEventListener(type, fn) { this.listeners.set(type, fn); },
    removeEventListener(type) { this.listeners.delete(type); }
  }
}]));
const shell = { clientWidth: 1600, clientHeight: 900,
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 1600, bottom: 900, width: 1600, height: 900 }) };
const docks = {
  tileEngine: T, activeWorkspace: "general", window: { innerWidth: 1600 },
  intentAreaPlan: {moves: {}, rails: {}, overlays: {}, canvas: {}}, refreshIntentAreas() {}, manualAreaOverride() {},
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

// Mixed tile/float/fullscreen state is preserved through normal re-layouts.
sandbox.projectModeId = () => "modeling";
vm.runInContext(slice("function syncMaximizeButton(", "function hotbarSlotFor("), sandbox);
vm.runInContext('openApp("notes"); floatWindow("notes", {left: 480, top: 90, width: 440, height: 350});', sandbox);
assert.equal(frames.notes.classList.contains("is-floating"), true, "Manual placement detaches a window from the tile tree");
assert.equal(vm.runInContext('tileEngine.contains(tileSession().root, "notes")', sandbox), false);
const floatRect = vm.runInContext('JSON.stringify(tileSession().floating.notes)', sandbox);
vm.runInContext('renderTileLayout("dolphin")', sandbox);
assert.equal(vm.runInContext('JSON.stringify(tileSession().floating.notes)', sandbox), floatRect, "Automatic layout never retakes a manually placed window");
const splitBeforeFull = vm.runInContext('JSON.stringify(tileSession().root)', sandbox);
vm.runInContext('toggleAppFullscreen("notes")', sandbox);
assert.equal(frames.notes.classList.contains("is-fullscreen"), true, "True fullscreen is separate from bounded maximize");
assert.equal(frames.notes.style.width, "1616px");
assert.equal(vm.runInContext('JSON.stringify(tileSession().fullscreen.root)', sandbox), splitBeforeFull, "Fullscreen saves the prior split tree for restoration");
assert.equal(sandbox.appState.dolphin, "minimized", "True fullscreen parks covered tiles in Apps");
assert.equal(sandbox.appState.elisa, "minimized");
vm.runInContext('toggleAppFullscreen("notes")', sandbox);
assert.equal(sandbox.appState.dolphin, "open", "Leaving fullscreen restores its previously visible peers");
assert.equal(vm.runInContext('JSON.stringify(tileSession().floating.notes)', sandbox), floatRect, "Leaving fullscreen restores the prior floating rectangle");
vm.runInContext('toggleMaximize("notes"); toggleMaximize("notes")', sandbox);
assert.equal(vm.runInContext('JSON.stringify(tileSession().floating.notes)', sandbox), floatRect, "Bounded maximize also restores prior manual placement");
vm.runInContext('splitWindowIntoTile("notes")', sandbox);
assert.equal(vm.runInContext('Boolean(tileSession().floating.notes)', sandbox), false, "Left docking explicitly returns a window to tiling");
assert.equal(frames.notes.classList.contains("is-tiled"), true);
vm.runInContext('toggleMaximize("dolphin"); toggleAppFullscreen("dolphin"); toggleAppFullscreen("dolphin")', sandbox);
assert.equal(vm.runInContext('tileSession().focus.name', sandbox), "dolphin", "Fullscreen returns to bounded maximize when that was the prior state");
vm.runInContext('toggleMaximize("dolphin")', sandbox);

// Exercise the actual held-middle pointer lifecycle (not just its helpers).
Object.assign(sandbox, { AREA_BOUNDARY_RESISTANCE: 120, AREA_BOUNDARY_INSET: 2,
  dockEdges: ["left", "right", "top", "bottom"], dockSizes: {left: 310, right: 300, top: 250, bottom: 250},
  baseDockLaneRects: new Map(), areaBoundaryStage: () => "expanded", setAreaBoundaryFeedback() {},
  resistAreaBoundaries: position => ({...position, resisted: false}), displayTransferTarget: () => 0 });
frames.notes.getBoundingClientRect = () => ({left: parseFloat(frames.notes.style.left), top: parseFloat(frames.notes.style.top), width: parseFloat(frames.notes.style.width), height: parseFloat(frames.notes.style.height)});
function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatchEvent(event) { for (const fn of [...(listeners.get(event.type) || [])]) fn(event); },
    listenerCount() { return [...listeners.values()].reduce((sum, hooks) => sum + hooks.size, 0); }
  };
}
Object.assign(sandbox.window, eventTarget());
sandbox.document = Object.assign(eventTarget(), {hidden: false});
sandbox.CustomEvent = class { constructor(type) {this.type = type;} };
vm.runInContext(slice("let cancelWindowPointerInteraction =", "function bindWindowDrag("), sandbox);
const dragHandle = Object.assign(eventTarget(), {
  captured: false, captures: 0, releases: 0,
  setPointerCapture() {this.captured = true; this.captures++;},
  releasePointerCapture() {this.captured = false; this.releases++;}
});
sandbox.dragHandle = dragHandle;
let cursorReleases = 0;
sandbox.window.addEventListener("material-cursor-release", () => cursorReleases++);
const windowBaseline = sandbox.window.listenerCount();
const pointer = (type, x, y, buttons = 4, pointerId = 3) => sandbox.window.dispatchEvent({type, clientX: x, clientY: y, buttons, pointerId});
const startGesture = (button = 1, resizing = false) => vm.runInContext(`beginManualWindowInteraction({button:${button},clientX:550,clientY:110,pointerId:3,preventDefault(){},stopPropagation(){}}, frameFor("notes"), dragHandle, ${resizing})`, sandbox);
const assertCleanGesture = () => {
  assert(!frames.notes.classList.contains("is-dragging"), "Drag class cannot block interaction after release");
  assert(!frames.notes.classList.contains("is-resizing"));
  assert.equal(vm.runInContext("tileInteraction", sandbox), false, "Tiling is no longer locked");
  assert.equal(vm.runInContext("cancelWindowPointerInteraction", sandbox), null);
  assert.equal(sandbox.window.listenerCount(), windowBaseline, "Global gesture hooks are removed");
  assert.equal(sandbox.document.listenerCount(), 0);
  assert.equal(dragHandle.captured, false);
};
// Model the exact browser failure: append() drops capture on the titlebar.
const desktopShell = {append(frame) {
  frame.parentElement = desktopShell;
  dragHandle.captured = false;
  dragHandle.dispatchEvent({type:"lostpointercapture", pointerId:3});
}};
const oldSelector = sandbox.$;
sandbox.$ = selector => selector === ".desktop-shell" ? desktopShell : oldSelector(selector);
startGesture();
pointer("pointermove", 620, 165);
assert.equal(frames.notes.parentElement, desktopShell, "Manual drag moves out of the clipped workspace");
assert.equal(dragHandle.captured, true, "Capture is restored after reparenting");
assert.equal(dragHandle.captures, 2);
const firstPosition = frames.notes.style.left;
// Subsequent events arrive at the browser, not at the old handle.
dragHandle.captured = false;
dragHandle.dispatchEvent({type:"lostpointercapture", pointerId:3});
pointer("pointermove", 690, 190);
assert.notEqual(frames.notes.style.left, firstPosition, "Movement continues after capture is lost");
pointer("pointerup", 690, 190, 0);
assert.equal(frames.notes.classList.contains("is-floating"), true, "Releasing middle drag keeps manual placement");
assertCleanGesture();
assert.equal(cursorReleases, 1, "Finishing also resets the custom cursor");
pointer("pointerup", 690, 190, 0);
assert.equal(cursorReleases, 1, "Duplicate release is harmless");

// Alt+left is the same lifecycle, but monitors the left-button mask.
startGesture(0);
pointer("pointermove", 630, 160, 1);
const beforeOtherPointer = frames.notes.style.left;
pointer("pointermove", 830, 360, 1, 99);
pointer("pointerup", 830, 360, 0, 99);
assert.equal(frames.notes.style.left, beforeOtherPointer, "Another pointer cannot move or finish the gesture");
pointer("pointerup", 630, 160, 0);
assertCleanGesture();

const beforeCancel = vm.runInContext('JSON.stringify(tileSession().floating.notes)', sandbox);
startGesture(0);
pointer("pointermove", 670, 210, 1);
pointer("pointercancel", 670, 210, 0);
assertCleanGesture();
assert.equal(vm.runInContext('JSON.stringify(tileSession().floating.notes)', sandbox), beforeCancel, "Cancel restores prior placement");

startGesture(0);
pointer("pointermove", 640, 180, 1);
sandbox.window.dispatchEvent({type:"blur"});
assertCleanGesture();
assert.equal(vm.runInContext('JSON.stringify(tileSession().floating.notes)', sandbox), beforeCancel, "Leaving the browser safely cancels");

startGesture(0);
pointer("pointermove", 650, 190, 1);
const releasedPosition = frames.notes.style.left;
pointer("pointermove", 950, 490, 0);
assertCleanGesture();
assert.equal(frames.notes.style.left, releasedPosition, "A missing up finishes at the last held position without jumping");

startGesture(1, true);
pointer("pointermove", 670, 230);
pointer("pointerup", 670, 230, 0);
assertCleanGesture();

startGesture(0);
sandbox.document.hidden = true;
sandbox.document.dispatchEvent({type:"visibilitychange"});
sandbox.document.hidden = false;
assertCleanGesture();
sandbox.$ = oldSelector;

// Normal left dragging still docks a floating window back into the tree,
// and now shares the same interruption-safe global gesture owner.
const appsBeforeLeftDrag = {...sandbox.appState};
const modeBeforeLeftDrag = sandbox.projectModeId;
sandbox.projectModeId = () => "pointer-lifecycle-left";
vm.runInContext('renderTileLayout("notes")', sandbox);
const workspaceElement = {append(frame) {frame.parentElement = workspaceElement;}, getBoundingClientRect: () => ({left:0, top:0, right:1616, bottom:1016})};
const appsElement = {getBoundingClientRect: () => ({left:0, top:0, right:200, bottom:1016})};
sandbox.$ = selector => selector === ".app-titlebar" ? dragHandle : selector === ".workspace-zone" ? workspaceElement : selector === ".apps-zone" ? appsElement : oldSelector(selector);
Object.assign(sandbox, {setDropTarget() {}, clearTileDropPreview() {}, showTileDropPreview() {}, pointInside: () => false});
vm.runInContext(slice("function bindWindowDrag(", "function bindResize("), sandbox);
vm.runInContext('bindWindowDrag(frameFor("notes"))', sandbox);
const startLeftDrag = () => dragHandle.dispatchEvent({type:"pointerdown", button:0, clientX:550, clientY:110, pointerId:3, target:{closest:()=>null}, preventDefault(){}});
startLeftDrag();
pointer("pointermove", 700, 230, 1);
pointer("pointerup", 700, 230, 0);
assertCleanGesture();
assert.equal(frames.notes.classList.contains("is-tiled"), true, "Left drag still retiles the manually placed window");
assert.equal(frames.notes.parentElement, workspaceElement);
startLeftDrag();
pointer("pointermove", 680, 220, 1);
sandbox.window.dispatchEvent({type:"blur"});
assertCleanGesture();
assert.equal(frames.notes.classList.contains("is-tiled"), true, "Interrupted left drag restores its tile");
sandbox.$ = oldSelector;
sandbox.projectModeId = modeBeforeLeftDrag;
Object.assign(sandbox.appState, appsBeforeLeftDrag);
vm.runInContext('syncApps(); renderTileLayout("notes")', sandbox);
vm.runInContext('tileSession().floating.notes = {left:330,top:300,width:440,height:350,yieldEdges:["left"]}; updateFloatingYield("notes", {passed:new Set(),preferredSizes:dockSizes})', sandbox);
assert.equal(vm.runInContext('tileSession().floating.notes.yieldEdges.includes("left")', sandbox), true, "Area return has a larger hysteresis boundary");
vm.runInContext('tileSession().floating.notes.left = 400; updateFloatingYield("notes", {passed:new Set(),preferredSizes:dockSizes})', sandbox);
assert.equal(vm.runInContext('tileSession().floating.notes.yieldEdges.includes("left")', sandbox), false, "Moving the manual window clear releases borrowed space");
console.log("Intent interactions: Alt/middle drag and resize, capture loss on reparent, pointer filtering, release, cancel, blur, visibility, missing-up recovery, cursor reset and no leaked hooks passed.");

// Check the desktop's real planner adapter, not just the pure docking policy.
const intentAssignments = {apps:Object.fromEntries(Object.keys(frames).map(name => [name,1])),areas:{projects:1,apps:1,systems:1}};
Object.assign(sandbox, {
  areaPriority:["projects","apps","systems"], dockState:{projects:{edge:"left"},apps:{edge:"right"},systems:{edge:"right"}},
  areaFor:name => areaFrames[name], displayAssignmentsFor:() => intentAssignments,
  activeDisplayRoster:() => [{width:1616,height:1016},{width:1616,height:1016}], extendedDesktopActive:() => true,
  layoutDockAreas() {}, persistDisplayAssignments() {}
});
sandbox.window.SpatialIntent = require("../dist/spatial-intent.js");
vm.runInContext('renderIntentAreaEdges = () => {};', sandbox);
vm.runInContext(slice("function isLocalArea(", "function persistDisplayAssignments("), sandbox);
areaFrames.projects.hidden = false;
vm.runInContext('toggleAppFullscreen("dolphin")', sandbox);
assert.equal(vm.runInContext('intentAreaPlan.moves.systems', sandbox), 2, "Fullscreen adapter relocates the System Area to the free monitor");
assert.equal(intentAssignments.areas.systems, 1, "Underlying preferred monitor assignment stays untouched");
vm.runInContext('toggleAppFullscreen("dolphin")', sandbox);
assert.equal(vm.runInContext('Object.keys(intentAreaPlan.moves).length', sandbox), 0, "Fullscreen exit releases temporary display moves");
const fullRoster = sandbox.activeDisplayRoster;
sandbox.fullscreenTestSessions = vm.runInContext("JSON.stringify(tileSessions)", sandbox);
sandbox.activeDisplayRoster = () => [{width:1616,height:1016}];
vm.runInContext('toggleAppFullscreen("dolphin")', sandbox);
assert.equal(vm.runInContext('Object.keys(intentAreaPlan.hidden).length', sandbox), 3, "Actual single-display fullscreen temporarily hides all Areas");
assert.equal(vm.runInContext('Object.keys(intentAreaPlan.overlays).length', sandbox), 0, "No edge overlays remain over fullscreen");
vm.runInContext('manualAreaOverride("projects"); refreshIntentAreas()', sandbox);
assert.equal(vm.runInContext('intentAreaPlan.hidden.projects', sandbox), true, "A previous explicit dock choice cannot expose an Area over fullscreen");
vm.runInContext('toggleAppFullscreen("dolphin")', sandbox);
assert.equal(vm.runInContext('Object.keys(intentAreaPlan.hidden).length', sandbox), 0, "Exiting fullscreen clears temporary hiding");
sandbox.activeDisplayRoster = fullRoster;
vm.runInContext("tileSessions = JSON.parse(fullscreenTestSessions)", sandbox);
delete sandbox.fullscreenTestSessions;
vm.runInContext('tileSession().floating.notes.yieldEdges = ["left"]; refreshIntentAreas()', sandbox);
assert.equal(vm.runInContext('intentAreaPlan.moves.projects', sandbox), 2, "A manual window's lease reaches the actual Area planner");
vm.runInContext('manualAreaOverride("projects"); refreshIntentAreas()', sandbox);
assert.equal(vm.runInContext('intentAreaPlan.moves.projects', sandbox), undefined, "An explicit Area edit releases its temporary automatic move");
console.log("Desktop Area adapter: actual fullscreen and manual leases, temporary monitor allocation, return and manual override passed.");

// Actual openApp/render adapter: screen-space floats must be translated to
// workspace coordinates, including a workspace offset caused by docked Areas.
sandbox.projectModeId = () => "float-aware-opening";
Object.keys(sandbox.appState).forEach(name => {sandbox.appState[name] = "closed";});
sandbox.window.innerWidth = 2416;
sandbox.window.innerHeight = 1216;
sandbox.workspaceBounds = () => ({width:2100,height:1200,rect:{left:200,top:16}});
vm.runInContext('openApp("elisa"); floatWindow("elisa",{left:900,top:16,width:460,height:1184}); openApp("dolphin")',sandbox);
const pinnedFloat = vm.runInContext('JSON.stringify(tileSession().floating.elisa)',sandbox);
vm.runInContext('openApp("notes")',sandbox);
assert.equal(sandbox.appState.notes,"open","New app opens in clear usable space beside a float");
assert.equal(vm.runInContext('JSON.stringify(tileSession().floating.elisa)',sandbox),pinnedFloat,"Opening tiles never moves the manually placed float");
const desktopFit = vm.runInContext('fitDesktopTiles()',sandbox);
for (const [name,rect] of desktopFit.windows) {
  assert(rect.x+rect.width <= 700-T.gap || rect.x >= 1160+T.gap || rect.y+rect.height <= -T.gap || rect.y >= 1184+T.gap,name+" avoids the screen-space floating rectangle");
  assert.equal(frames[name].style.left,rect.x+"px","Rendered geometry matches obstacle-aware tiling");
}
vm.runInContext('minimizeApp("elisa"); renderTileLayout("notes")',sandbox);
assert.equal(vm.runInContext('Boolean(fitDesktopTiles().avoiding)',sandbox),false,"Minimized floats stop reserving space");
vm.runInContext('openApp("elisa")',sandbox);
assert.equal(vm.runInContext('Boolean(fitDesktopTiles().avoiding)',sandbox),true,"Restoring a float reserves its space again");
vm.runInContext('closeApp("elisa"); renderTileLayout("notes")',sandbox);
assert.equal(vm.runInContext('Boolean(fitDesktopTiles().avoiding)',sandbox),false,"Closing a float releases its space");
console.log("Float-aware desktop: new app opening, coordinate offsets, pinned float, rendered placement, minimize/restore and close passed.");

// Visibility is per monitor/workspace and based on complete geometric coverage,
// including the union of several foreground windows, not just the front app.
sandbox.projectModeId = () => "visibility-policy";
sandbox.window.innerWidth = 1616;
sandbox.window.innerHeight = 1016;
sandbox.workspaceBounds = () => ({width:1616,height:1016,rect:{left:0,top:0}});
sandbox.getComputedStyle = frame => ({zIndex: frame.classList.contains("is-fullscreen") ? "800" : frame.style.zIndex});
Object.values(frames).forEach(frame => {
  frame.getBoundingClientRect = () => ({left:parseFloat(frame.style.left)||0,top:parseFloat(frame.style.top)||0,width:parseFloat(frame.style.width)||440,height:parseFloat(frame.style.height)||340});
});
const resetVisibility = () => {
  Object.keys(frames).forEach(name => {sandbox.appState[name] = "closed";frames[name].classList.remove("is-fullscreen","is-floating","is-tiled");});
  vm.runInContext('tileSession().root=null;tileSession().focus=null;tileSession().fullscreen=null;tileSession().floating={};tileSession().parked={};',sandbox);
};
resetVisibility();
sandbox.appState.browser = "minimized";
vm.runInContext('openApp("dolphin");openApp("elisa");openApp("notes");floatWindow("notes",{left:480,top:90,width:440,height:350})',sandbox);
const beforeVisibilityFloat = vm.runInContext('JSON.stringify(tileSession().floating.notes)',sandbox);
vm.runInContext('toggleAppFullscreen("dolphin")',sandbox);
assert.equal(sandbox.appState.elisa,"minimized","Fullscreen minimizes visible tiled peers");
assert.equal(sandbox.appState.notes,"minimized","Fullscreen minimizes visible floating peers too");
assert.equal(frames.notes.hidden,true,"Covered float is no longer an invisible open window");
vm.runInContext('closeApp("elisa");toggleAppFullscreen("dolphin")',sandbox);
assert.equal(sandbox.appState.elisa,"closed","Leaving fullscreen cannot reopen a closed peer");
assert.equal(sandbox.appState.browser,"minimized","An already minimized app stays minimized");
assert.equal(sandbox.appState.notes,"open");
assert.equal(vm.runInContext('JSON.stringify(tileSession().floating.notes)',sandbox),beforeVisibilityFloat,"Fullscreen restore preserves manual coordinates");
vm.runInContext('openApp("elisa");toggleAppFullscreen("dolphin");openApp("notes")',sandbox);
assert.equal(vm.runInContext('tileSession().fullscreen',sandbox),null,"Restoring a card exits exclusive fullscreen");
assert.equal(sandbox.appState.notes,"open","Restored card is usable rather than immediately covered again");
vm.runInContext('toggleAppFullscreen("dolphin");minimizeApp("dolphin")',sandbox);
assert.equal(sandbox.appState.notes,"open","Minimizing fullscreen returns the peer windows");
vm.runInContext('openApp("dolphin");toggleAppFullscreen("dolphin");closeApp("dolphin")',sandbox);
assert.equal(sandbox.appState.notes,"open","Closing fullscreen also returns the peer windows");
assert.equal(vm.runInContext('tileSession().fullscreen',sandbox),null);

resetVisibility();
vm.runInContext('openApp("dolphin");openApp("elisa");openApp("notes")',sandbox);
const originalLocalApp = sandbox.isLocalApp;
sandbox.isLocalApp = name => name !== "notes";
vm.runInContext('toggleAppFullscreen("dolphin")',sandbox);
assert.equal(sandbox.appState.notes,"open","Fullscreen on monitor 1 leaves visible apps on monitor 2 open");
assert.equal(sandbox.appState.elisa,"minimized");
vm.runInContext('toggleAppFullscreen("dolphin")',sandbox);
sandbox.isLocalApp = originalLocalApp;

resetVisibility();
const position = (name,left,top,width,height,z) => {
  sandbox.appState[name]="open";
  Object.assign(frames[name].style,{left:left+"px",top:top+"px",width:width+"px",height:height+"px",zIndex:String(z)});
  vm.runInContext(`tileSession().floating.${name}={left:${left},top:${top},width:${width},height:${height}}`,sandbox);
};
position("dolphin",100,100,800,400,1);
position("elisa",100,100,400,400,3);
position("notes",500,100,400,400,2);
vm.runInContext('minimizeInvisibleWindows()',sandbox);
assert.equal(sandbox.appState.dolphin,"minimized","Two foreground windows jointly cover and minimize a background app");
assert.equal(sandbox.appState.elisa,"open");
assert.equal(sandbox.appState.notes,"open");
position("dolphin",100,100,801,400,1);
vm.runInContext('minimizeInvisibleWindows()',sandbox);
assert.equal(sandbox.appState.dolphin,"open","Even a partially visible window stays open");
position("dolphin",2000,100,800,400,1);
vm.runInContext('minimizeInvisibleWindows()',sandbox);
assert.equal(sandbox.appState.dolphin,"minimized","A fully offscreen local window moves to Apps");
position("dolphin",2000,100,800,400,1);
sandbox.isLocalApp = name => name !== "dolphin";
vm.runInContext('minimizeInvisibleWindows()',sandbox);
assert.equal(sandbox.appState.dolphin,"open","An offscreen frame assigned to another monitor is not minimized");
sandbox.isLocalApp = originalLocalApp;
vm.runInContext('tileInteraction=true;minimizeInvisibleWindows();tileInteraction=false',sandbox);
assert.equal(sandbox.appState.dolphin,"open","A window under active dragging is not parked mid-gesture");
console.log("Visibility policy: fullscreen tile/float parking, restoration, close/minimize, explicit card opening, multi-monitor exclusion, union coverage, partial visibility, offscreen and drag safety passed.");
