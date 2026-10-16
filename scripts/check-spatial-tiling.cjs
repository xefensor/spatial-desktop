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
  window: { SpatialTiling: T, innerWidth: 1616, innerHeight: 1016 }, desktopStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) },
  desktopPages: require("../dist/desktop-pages.js").create(),
  SpatialDesktopPages: require("../dist/desktop-pages.js"),
  activeWorkspace: "general", activeProjectName: "project", projectModeId: () => "modeling", localDisplaySlot: () => 1,
  appState: Object.fromEntries(Object.keys(frames).map(name => [name, "closed"])),
  appInfo: Object.fromEntries(Object.keys(frames).map(name => [name, { label: name }])), appMaximizedState: {},
  desktopPageAnimating: false, frontApp: null, layoutMode: "manual", windowGeometry: new Map(), autoTiledWindows: new Set(), autoWindowAvoidance: new Map(),
  extendedDesktopActive: () => false, otherDisplaySlot: () => 2, stateSideMinimum: () => 310, stateHorizontalMinimum: () => 250, persistDisplayAssignments() {},
  isLocalApp: () => true, minimumUsableWindowSize: min, frameFor: name => frames[name],
  workspaceBounds: () => ({ width: 1616, height: 1016, rect: { left: 0, top: 0 } }),
  syncMaximizeButton() {}, saveLayout() {}, showToast() {}, queueDesktopStateBroadcast() {}, scheduleSpatialAutoLayout() {},
  clearWindowAutoAvoidance() {}, displayAssignmentsFor: () => ({ apps: {} }),
  rebalanceAreaDisplays: () => false, applyExtendedDesktopPartition() {},
  requestAnimationFrame: () => 1, cancelAnimationFrame() {}, setTimeout() {},
  capturePlacement: () => ({}), restorePlacement() {}, offerPlacementUndo() {},
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
sandbox.desktopPages.go("general", 1);
assert.equal(vm.runInContext("tileSession().root", sandbox), null, "Desktop pages have independent split trees");
sandbox.desktopPages.go("general", 0);
assert.equal(vm.runInContext("JSON.stringify(tileSession().root)", sandbox), rootBefore, "Returning to a desktop preserves its split tree");
console.log("Desktop adapter: open, live-card parking, focus/restore, closed-app exclusion, workspace and desktop page isolation passed.");

// Run the real dock layout/session/resize paths, including legacy Auto data.
// Window activity must never steal dock space or move Areas to another display.
const areaFrames = Object.fromEntries(["projects", "apps", "systems", "ai"].map(name => [name, {
  hidden: false, dataset: {}, style: { removeProperty() {} },
  getBoundingClientRect() {
    const rect=this.rect||{x:0,y:0,width:0,height:0};
    return {...rect,left:rect.x,top:rect.y,right:rect.x+rect.width,bottom:rect.y+rect.height};
  },
  scrollRegion: {scrollTop:0,scrollLeft:0},
  classList: { add() {}, remove() {}, toggle() {} },
  handle: { listeners: new Map(), setPointerCapture() {},
    addEventListener(type, fn) { this.listeners.set(type, fn); },
    removeEventListener(type) { this.listeners.delete(type); }
  }
}]));
const shell = { clientWidth: 1600, clientHeight: 900,
  append() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 1600, bottom: 900, width: 1600, height: 900 }) };
const docks = {
  desktopPages: require("../dist/desktop-pages.js").create(),
  SpatialCompactAreas: require("../dist/compact-area-layout.js"),
  tileEngine: T, activeWorkspace: "general", systemRailExpansion:null, cancelAreaPointerInteraction:null,
  window: { innerWidth: 1600, innerHeight: 900, ...eventTarget() },
  cloneDesktopState: value => JSON.parse(JSON.stringify(value)),
  capturePlacement: () => vm.runInContext("JSON.parse(JSON.stringify(snapshotAreaLayout()))", docks),
  restorePlacement(before) { docks.beforeCancel=before; vm.runInContext("workspaceAreaSessions[activeWorkspace]=beforeCancel;applyAreaSession(activeWorkspace);",docks); },
  offerPlacementUndo(before) { docks.lastUndo = before;docks.undoOffers=(docks.undoOffers||0)+1; },
  intentAreaPlan: {moves: {}, rails: {}, overlays: {}, canvas: {}}, refreshIntentAreas() {}, manualAreaOverride() {},
  document: { querySelector: selector => areaFrames[selector.match(/data-area-window="([^"]+)/)?.[1]],
    createElement: () => ({dataset:{},attributes:{},hiddenWrites:[],get hidden(){return this._hidden;},set hidden(value){this.hiddenWrites.push(value);this._hidden=value;},style:{removeProperty(key){delete this[key];}},
      classList:{values:new Set(),add(...names){names.forEach(name=>this.values.add(name));},remove(...names){names.forEach(name=>this.values.delete(name));},contains(name){return this.values.has(name);}},
      listeners:new Map(),addEventListener(type,fn){this.listeners.set(type,fn);},removeEventListener(type){this.listeners.delete(type);},
      setPointerCapture(){},releasePointerCapture(){},
      setAttribute(name,value){this.attributes[name]=value;},getAttribute(name){return this.attributes[name];}}),
    body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {} } } },
  desktopStorage: sandbox.desktopStorage, isLocalArea: () => true, projectColumnActive: () => true,
  $: (selector, scope) => selector === ".desktop-shell" ? shell : selector === ".system-scroll-region" ? scope?.scrollRegion : scope?.handle,
  extendedDesktopActive: () => true, localDisplaySlot: () => 1, otherDisplaySlot: () => 2,
  displayTransferTarget: () => null,
  applyDockRect(name, rect) { areaFrames[name].rect = rect; },
  captureBaseDockLaneRects() {}, syncAreaControls() {}, syncLayoutModeUI() {},
  applySystemRailExpansion() {}, endSystemRailExpansion() {},
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
vm.runInContext(slice("function trackAreaPointer(", "function prepareAreaWindows("), docks);
vm.runInContext(`workspaceAreaSessions.general = {
  layoutMode: "auto", sizes: {left: 320, right: 300, top: 250, bottom: 250},
  hidden: {projects: false, apps: false, systems: false}
}; applyAreaSession("general");`, docks);
assert.equal(vm.runInContext("layoutMode", docks), "manual", "Legacy Auto sessions migrate to fixed Area bounds");
assert.equal(areaFrames.ai.rect.x, 1300, "The fourth AI Area defaults to the right edge");
assert.equal(areaFrames.ai.rect.height, 450, "System and AI share the vertical right dock");
assert.equal(docks.insets.bottom, 0, "Default Areas leave no horizontal dock inset");
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
// Commands choose each Area's presentation; a width drag still resizes its
// shared column and remembers the user's mixed presentation through the gesture.
vm.runInContext('setAreaState("projects","expanded",false);',docks);
assert.equal(areaFrames.projects.dataset.areaState,"expanded");
assert.equal(areaFrames.apps.dataset.areaState,"rail","Expanding Project leaves Apps compact in the same column");
projectHandle.listeners.get("pointerdown")({button:0,pointerId:11,preventDefault(){},stopPropagation(){}});
projectHandle.listeners.get("pointermove")({pointerId:11,clientX:390,clientY:300});
projectHandle.listeners.get("pointermove")({pointerId:11,clientX:72,clientY:300});
assert.equal(areaFrames.projects.dataset.areaState,"rail","A narrow width still collapses the whole column");
assert.equal(areaFrames.apps.dataset.areaState,"rail");
projectHandle.listeners.get("pointermove")({pointerId:11,clientX:390,clientY:300});
assert.equal(areaFrames.projects.dataset.areaState,"expanded","Reversing the same resize restores its originally expanded Area");
projectHandle.listeners.get("pointerup")();
assert.equal(areaFrames.apps.dataset.areaState,"rail","Widening a mixed column preserves its compact peer");
vm.runInContext('setAreaState("apps","expanded",false);',docks);
vm.runInContext('setAreaState("projects","rail",false);',docks);
assert.equal(areaFrames.projects.dataset.areaState,"rail","Only the commanded Area becomes compact");
assert.equal(areaFrames.apps.dataset.areaState,"expanded","Collapsing Project leaves Apps expanded in the same column");
assert.equal(areaFrames.apps.rect.width,areaFrames.projects.rect.width);
assert.equal(areaFrames.projects.rect.width,390,"An expanded peer retains the shared column width");
vm.runInContext('setAreaState("projects","expanded",false);',docks);
assert.equal(areaFrames.projects.rect.width,390,"Expanded restores the column’s last dragged width");
assert.equal(areaFrames.apps.rect.width,390,"Peers still share the column's outer width");
for(const cancellation of ["pointercancel","Escape","lostpointercapture"]) {
  const before=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks);
  projectHandle.listeners.get("pointerdown")({button:0,pointerId:12,preventDefault(){},stopPropagation(){}});
  projectHandle.listeners.get("pointermove")({pointerId:12,clientX:72,clientY:300});
  assert.equal(areaFrames.projects.dataset.areaState,"rail");
  if(cancellation==="Escape") docks.window.dispatchEvent({type:"keydown",key:"Escape",preventDefault(){},stopImmediatePropagation(){}});
  else projectHandle.listeners.get(cancellation)({pointerId:12,type:cancellation});
  assert.equal(vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks),before,cancellation+" restores preferences, expanded width and dock size");
  assert.equal(areaFrames.projects.rect.width,390);
  assert.equal(docks.window.listenerCount(),0,"Area gesture removes global listeners");
}
vm.runInContext('setAreaState("projects","rail",false);setAreaState("apps","rail",false);',docks);
console.log("Fixed Areas: legacy-state migration, invariant dock/canvas bounds, display stability, explicit rail resize and workspace persistence passed.");

// System and AI collapse together, retain a shared thickness and restore together.
const mixedRailBaseline = vm.runInContext('JSON.stringify(snapshotAreaLayout())', docks);
vm.runInContext('bindDockResize("systems", areaFor("systems"));', docks);
const systemHandle = areaFrames.systems.handle;
areaFrames.systems.scrollRegion.scrollTop=253;
areaFrames.systems.scrollRegion.scrollLeft=80;
systemHandle.listeners.get('pointerdown')({button:0,pointerId:2,preventDefault(){},stopPropagation(){}});
systemHandle.listeners.get('pointermove')({clientX:1530,clientY:200});
systemHandle.listeners.get('pointerup')();
assert.equal(areaFrames.systems.dataset.areaState,'rail');
assert.equal(areaFrames.systems.rect.width,70,'The System/AI column collapses to its shared 70px rail');
assert.equal(areaFrames.systems.scrollRegion.scrollTop,0,'Collapsing from a scrolled panel exposes the rail clock and alerts');
assert.equal(areaFrames.systems.scrollRegion.scrollLeft,0,'The rail starts at the beginning on either dock axis');
assert.equal(areaFrames.systems.rect.x+areaFrames.systems.rect.width,1600,'The rail stays anchored to the outer edge');
assert.equal(areaFrames.ai.dataset.areaState,'rail','Collapsing System also collapses AI');
assert.equal(areaFrames.ai.rect.width,70,'AI matches the shared rail thickness');
vm.runInContext('applyAreaSession("general");',docks);
assert.equal(areaFrames.systems.rect.width,70,'Reloading the saved Area session preserves the column rail');
docks.compactColumnBaseline=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks);
systemHandle.listeners.get('pointerdown')({button:0,pointerId:3,preventDefault(){},stopPropagation(){}});
systemHandle.listeners.get('pointermove')({pointerId:3,clientX:1300,clientY:200});
systemHandle.listeners.get('pointerup')();
assert.equal(areaFrames.systems.dataset.areaState,'expanded','Widening an all-compact column expands the Area being resized');
assert.equal(areaFrames.ai.dataset.areaState,'rail','Widening an all-compact column leaves the other Area compact');
vm.runInContext('workspaceAreaSessions.general=JSON.parse(compactColumnBaseline);applyAreaSession("general");',docks);
for(const edge of ['left','right','top','bottom']){
  docks.mixedEdge=edge;
  vm.runInContext(`dockState.systems.edge=mixedEdge;dockState.ai.edge=mixedEdge;
    dockSizes[mixedEdge]=mixedEdge==='left'||mixedEdge==='right'?70:64;areaPreferredStates.systems="rail";layoutDockAreas();`,docks);
  const r=areaFrames.systems.rect,vertical=['left','right'].includes(edge);
  assert.equal(areaFrames.systems.dataset.areaState,'rail');
  assert.equal(vertical?r.width:r.height,vertical?70:64,edge+': the column rail keeps its shared thickness');
  assert.equal(edge==='right'?r.x+r.width:edge==='bottom'?r.y+r.height:edge==='left'?r.x:r.y,edge==='right'?1600:edge==='bottom'?900:0,edge+': rail stays flush with its screen edge');
  assert.equal(areaFrames.ai.dataset.areaState,'rail');
  assert.equal(vertical?areaFrames.ai.rect.width:areaFrames.ai.rect.height,vertical?70:64);
}
docks.mixedRailBaseline=mixedRailBaseline;
vm.runInContext('workspaceAreaSessions.general=JSON.parse(mixedRailBaseline);applyAreaSession("general");',docks);
console.log('Shared dock rails passed: System/AI resize together, saved session restore and matching four-edge geometry.');

// Context commands, hide/show and joining another column preserve the selected
// Area's presentation rather than adopting or overwriting a peer's preference.
vm.runInContext(slice('function hideArea(', 'function closestDockEdge('),docks);
vm.runInContext(slice('function closestDockEdge(', '// One owner for the gesture'),docks);
const sharedColumnBaseline=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks);
vm.runInContext('setAreaState("systems","rail",false);hideArea("systems");setAreaState("ai","expanded",false);',docks);
assert.equal(areaFrames.systems.hidden,true,'Expanding a peer does not reveal a deliberately hidden Area');
assert.equal(areaFrames.ai.rect.width,300);
vm.runInContext('showArea("systems",false);',docks);
assert.equal(areaFrames.systems.hidden,false);
assert.equal(areaFrames.systems.rect.width,areaFrames.ai.rect.width,'A shown Area rejoins the column width');
assert.equal(areaFrames.systems.dataset.areaState,'rail','Showing System restores its own compact presentation');
assert.equal(areaFrames.ai.dataset.areaState,'expanded','Showing System leaves Assistant expanded');
vm.runInContext('setAreaState("apps","rail",false);setDockPosition("ai","left",null,false);',docks);
assert.equal(areaFrames.ai.dataset.areaState,'expanded','A moved Area keeps its own expanded presentation');
assert.equal(areaFrames.apps.dataset.areaState,'rail','A moved expanded Area leaves its destination peer compact');
assert.equal(areaFrames.ai.rect.width,areaFrames.apps.rect.width);
assert.equal(areaFrames.ai.rect.width,areaFrames.projects.rect.width);
assert.equal(areaFrames.systems.dataset.areaState,'rail','Docking leaves the old column presentation unchanged');
docks.sharedColumnBaseline=sharedColumnBaseline;
vm.runInContext('workspaceAreaSessions.general=JSON.parse(sharedColumnBaseline);applyAreaSession("general");',docks);
docks.isLocalArea=name=>name!=='ai';
const remotePreference=vm.runInContext('areaPreferredStates.ai',docks);
vm.runInContext('setAreaState("systems","rail",false);',docks);
assert.equal(vm.runInContext('areaPreferredStates.ai',docks),remotePreference,'An Area assigned to another display is not part of this column');
docks.isLocalArea=()=>true;
vm.runInContext('workspaceAreaSessions.general=JSON.parse(sharedColumnBaseline);applyAreaSession("general");',docks);
vm.runInContext('areaPreferredStates.systems="rail";areaPreferredStates.ai="expanded";dockSizes.right=300;layoutDockAreas();',docks);
assert.equal(areaFrames.systems.dataset.areaState,'rail','Manual mixed preferences remain independent of the saved column width');
assert.equal(areaFrames.ai.dataset.areaState,'expanded');
assert.equal(areaFrames.systems.rect.width,areaFrames.ai.rect.width);
vm.runInContext('saveAreaLayout();applyAreaSession("general");',docks);
assert.equal(areaFrames.systems.dataset.areaState,'rail','Reload retains the compact Area preference');
assert.equal(areaFrames.ai.dataset.areaState,'expanded','Reload retains its expanded peer preference');
vm.runInContext('workspaceAreaSessions.general=JSON.parse(sharedColumnBaseline);applyAreaSession("general");',docks);
vm.runInContext(`hideArea('projects');hideArea('ai');setAreaState('apps','expanded',false);
  setAreaState('systems','rail',false);bindAreaDockDrag('systems',areaFor('systems'));`,docks);
const dockDragStart={button:0,pointerId:21,clientX:1560,clientY:100,target:{closest:()=>false},preventDefault(){}};
systemHandle.listeners.get('pointerdown')(dockDragStart);
systemHandle.listeners.get('pointermove')({pointerId:21,clientX:200,clientY:850});
assert.equal(vm.runInContext('dockPreview.dataset.edge',docks),'left','Dragging over Apps chooses its edge even near the bottom screen edge');
assert.equal(vm.runInContext('dockPreview.style.height',docks),'240px','The production drag preview shows the short compact rectangle');
assert.equal(vm.runInContext('dockPreview.style.top',docks),'660px','The production drag preview shows System below Apps');
systemHandle.listeners.get('pointerup')({pointerId:21,clientX:200,clientY:850});
assert.equal(areaFrames.apps.dataset.areaState,'expanded','Apps stays expanded when compact System is docked below it');
assert.equal(areaFrames.systems.dataset.areaState,'rail','Docking System preserves its compact presentation');
assert.equal(areaFrames.apps.rect.height,660,'Expanded Apps receives the remaining column height');
assert.equal(areaFrames.systems.rect.height,240,'Compact System uses a short rectangle rather than half the screen');
assert.equal(areaFrames.systems.rect.y,660,'Compact System is placed immediately below Apps');
assert.equal(areaFrames.apps.rect.width,areaFrames.systems.rect.width,'Mixed Areas share one column width');
assert.equal(docks.insets.right,0,'Moving the only visible right Area frees the right canvas gutter');
assert.equal(docks.insets.left,areaFrames.apps.rect.width,'The shared Apps/System column reserves its width only once');
const mixedColumnRects=JSON.stringify([areaFrames.apps.rect,areaFrames.systems.rect]);
vm.runInContext('applyAreaSession("general");',docks);
assert.equal(JSON.stringify([areaFrames.apps.rect,areaFrames.systems.rect]),mixedColumnRects,'Reload restores mixed placement and short System geometry');
vm.runInContext('hideArea("systems");showArea("systems",false);',docks);
assert.equal(areaFrames.systems.dataset.areaState,'rail','Hide/show preserves System compact mode below Apps');
assert.equal(JSON.stringify([areaFrames.apps.rect,areaFrames.systems.rect]),mixedColumnRects,'Hide/show restores the compact slot without resizing Apps');
vm.runInContext('workspaceAreaSessions.general=JSON.parse(sharedColumnBaseline);applyAreaSession("general");',docks);

// Hidden Areas must not shift a visible drop boundary. The one-click command
// follows the same placement path and offers one undo for its complete result.
vm.runInContext(`hideArea('projects');hideArea('ai');dockState.projects.order=0;dockState.apps.order=1;
  setAreaState('apps','expanded',false);setAreaState('systems','rail',false);layoutDockAreas();`,docks);
const beforeBelowApps=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks);
const undoOffersBefore=docks.undoOffers;
vm.runInContext('compactSystemBelowApps();',docks);
assert.equal(areaFrames.systems.rect.y,areaFrames.apps.rect.y+areaFrames.apps.rect.height,'The below-Apps command ignores earlier hidden peers when choosing its visible insertion boundary');
assert.equal(areaFrames.systems.rect.height,240);
assert.equal(docks.undoOffers,undoOffersBefore+1,'The complete below-Apps command creates one undo');
assert.equal(JSON.stringify(docks.lastUndo),beforeBelowApps,'That undo captures the original layout before any command step');
docks.restorePlacement(docks.lastUndo);
assert.equal(vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks),beforeBelowApps,'A single undo restores the complete command');
vm.runInContext('workspaceAreaSessions.general=JSON.parse(sharedColumnBaseline);applyAreaSession("general");',docks);
console.log('Independent Area commands passed: hidden visibility, shared width, retained presentation on move, display isolation, reload and compact System below expanded Apps.');

// A hidden expanded peer cannot prevent the only visible compact Area from
// expanding when its border is widened.
vm.runInContext('setAreaState("projects","expanded",false);hideArea("projects");setAreaState("apps","rail",false);bindDockResize("apps",areaFor("apps"));',docks);
const appHandle=areaFrames.apps.handle;
appHandle.listeners.get('pointerdown')({button:0,pointerId:22,preventDefault(){},stopPropagation(){}});
appHandle.listeners.get('pointermove')({pointerId:22,clientX:350,clientY:200});
appHandle.listeners.get('pointerup')();
assert.equal(areaFrames.apps.dataset.areaState,'expanded','A hidden expanded peer does not block widening the visible compact Area');
assert.equal(areaFrames.apps.rect.width,350);
assert.equal(areaFrames.projects.hidden,true,'Widening never reveals the hidden peer');
assert.equal(vm.runInContext('areaPreferredStates.projects',docks),'expanded','Widening preserves the hidden peer preference for later recovery');
vm.runInContext('workspaceAreaSessions.general=JSON.parse(sharedColumnBaseline);applyAreaSession("general");',docks);

// Preview follows the same priority and canvas bounds as the final placement,
// without saving its speculative model or touching the existing Area rectangles.
shell.clientWidth=1200;
vm.runInContext(`areaFor('ai').hidden=true;areaFor('projects').hidden=areaFor('apps').hidden=areaFor('systems').hidden=false;
  dockState.apps={edge:'left',order:0};dockState.projects={edge:'right',order:0};dockState.systems={edge:'right',order:1};
  areaPreferredStates.apps=areaPreferredStates.projects='expanded';areaPreferredStates.systems='rail';
  dockSizes.left=450;dockSizes.right=400;layoutDockAreas();`,docks);
const beforePreview=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks);
const previewSessions=vm.runInContext('JSON.stringify(workspaceAreaSessions)',docks);
const previewStorage=JSON.stringify([...store]);
const beforePreviewRects=JSON.stringify(Object.values(areaFrames).map(area=>area.rect));
vm.runInContext('renderAreaDockPreview("systems","left",1);',docks);
const tightPreview=vm.runInContext('({x:parseFloat(dockPreview.style.left),y:parseFloat(dockPreview.style.top),width:parseFloat(dockPreview.style.width),height:parseFloat(dockPreview.style.height)})',docks);
assert.equal(vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks),beforePreview,'Preview restores all speculative Area preferences, placement and sizes');
assert.equal(vm.runInContext('JSON.stringify(workspaceAreaSessions)',docks),previewSessions,'Preview does not change saved Workspace sessions');
assert.equal(JSON.stringify([...store]),previewStorage,'Preview performs no persistence writes');
assert.equal(JSON.stringify(Object.values(areaFrames).map(area=>area.rect)),beforePreviewRects,'Preview does not move the real Areas');
vm.runInContext('setDockPosition("systems","left",1,false);',docks);
for(const key of ['x','y','width','height'])assert.equal(tightPreview[key],areaFrames.systems.rect[key],'Tight-viewport preview matches the final System '+key);
assert.equal(areaFrames.systems.rect.width,360,'Preview respects the opposite Project Area and the usable canvas budget');
shell.clientWidth=1600;
vm.runInContext('workspaceAreaSessions.general=JSON.parse(sharedColumnBaseline);applyAreaSession("general");',docks);

// The manual presentation change leaves the legacy Auto allocation policy
// intact for environments without the bounded tiling engine.
const boundedTileEngine=docks.tileEngine;
docks.tileEngine=null;
vm.runInContext('layoutMode="auto";dockSizes.right=300;',docks);
assert.equal(vm.runInContext('unifyAreaColumnStates({projects:"rail",apps:"rail",systems:"rail",ai:"expanded"}).systems',docks),'expanded','Legacy Auto still unifies a mixed column using its saved thickness');
vm.runInContext('intentAreaPlan.rails.systems=true;',docks);
assert.equal(vm.runInContext('unifyAreaColumnStates({projects:"rail",apps:"rail",systems:"expanded",ai:"expanded"}).ai',docks),'rail','Legacy Auto pressure still collapses a shared column');
docks.tileEngine=boundedTileEngine;
vm.runInContext('delete intentAreaPlan.rails.systems;workspaceAreaSessions.general=JSON.parse(sharedColumnBaseline);applyAreaSession("general");',docks);

// Area growth is bounded before layout: dragging to an extreme must not
// squeeze the opposing panel, overlap it, or save an off-screen preference.
const areaBoundsBaseline = vm.runInContext('JSON.stringify(snapshotAreaLayout())', docks);
const originalShellRect = shell.getBoundingClientRect;
shell.getBoundingClientRect = () => ({left:25,top:30,right:25+shell.clientWidth,bottom:30+shell.clientHeight,width:shell.clientWidth,height:shell.clientHeight});
for (const edge of ['left','right','top','bottom']) {
  const opposite = {left:'right',right:'left',top:'bottom',bottom:'top'}[edge];
  const vertical = ['left','right'].includes(edge);
  docks.boundsEdge = edge; docks.boundsOpposite = opposite;
  vm.runInContext(`
    areaFor('apps').hidden = areaFor('ai').hidden = true;
    areaFor('projects').hidden = areaFor('systems').hidden = false;
    areaPreferredStates.projects = areaPreferredStates.systems = 'expanded';
    dockState.projects.edge = boundsEdge; dockState.systems.edge = boundsOpposite;
    dockSizes[boundsEdge] = ${vertical ? 300 : 280}; dockSizes[boundsOpposite] = ${vertical ? 300 : 190};
    layoutDockAreas();
  `, docks);
  const oppositeBefore = JSON.stringify(areaFrames.systems.rect);
  projectHandle.listeners.get('pointerdown')({button:0,pointerId:2,preventDefault(){},stopPropagation(){}});
  const maxPointer = {clientX:edge==='right'?-2000:3000,clientY:edge==='bottom'?-2000:3000};
  projectHandle.listeners.get('pointermove')(maxPointer);
  const dimension = vertical ? 'width' : 'height';
  const expected = vertical ? 520 : 360;
  assert.equal(areaFrames.projects.rect[dimension],expected,edge+' stops at the size cap');
  assert.equal(JSON.stringify(areaFrames.systems.rect),oppositeBefore,edge+' never shrinks its opposite during a drag');
  assert.equal(vm.runInContext('dockSizes[boundsEdge]',docks),expected,'Persists the bounded size, not the pointer distance');
  projectHandle.listeners.get('pointermove')({clientX:edge==='right'?4000:-3000,clientY:edge==='bottom'?4000:-3000});
  assert.equal(areaFrames.projects.dataset.areaState,'rail',edge+' can still shrink to rail beyond the screen');
  assert(areaFrames.projects.rect[dimension]>0,'Rail thickness stays positive');
  projectHandle.listeners.get('pointerup')();
}
shell.clientWidth = 1200;
vm.runInContext(`dockState.projects.edge='left';dockState.systems.edge='right';
  areaPreferredStates.projects=areaPreferredStates.systems='expanded';dockSizes.left=300;dockSizes.right=400;layoutDockAreas();`,docks);
projectHandle.listeners.get('pointerdown')({button:0,pointerId:3,preventDefault(){},stopPropagation(){}});
projectHandle.listeners.get('pointermove')({clientX:3000,clientY:400});
assert.equal(areaFrames.projects.rect.width,360,'The opposing panel and usable canvas can impose a tighter cap');
assert.equal(areaFrames.systems.rect.width,400,'Tighter cap still preserves the other panel');
assert.equal(shell.clientWidth-docks.insets.left-docks.insets.right,440,'Preserves the desktop width');
projectHandle.listeners.get('pointerup')();

// Reflow repairs old huge preferences and changing viewport sizes, without
// replacing those preferences when no resize gesture is in progress.
for (const [width,height] of [[1600,900],[900,650],[600,400],[300,200],[120,100]]) {
  shell.clientWidth=width; shell.clientHeight=height;
  for (const horizontal of [false,true]) {
    docks.horizontalBounds=horizontal;
    vm.runInContext(`
      dockState.projects.edge=horizontalBounds?'top':'left';dockState.systems.edge=horizontalBounds?'bottom':'right';
      dockSizes.left=dockSizes.right=dockSizes.top=dockSizes.bottom=100000;
      layoutDockAreas();
    `,docks);
    for(const name of ['projects','systems']) {
      const r=areaFrames[name].rect;
      assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height,'Areas stay within the resized viewport');
    }
    const a=areaFrames.projects.rect,b=areaFrames.systems.rect;
    assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'Opposing Areas never overlap');
    assert.equal(vm.runInContext('dockSizes.left',docks),100000,'Viewport fitting preserves the preferred layout');
  }
}
shell.clientWidth=1600; shell.clientHeight=900; shell.getBoundingClientRect=originalShellRect;
docks.areaBoundsBaseline=JSON.parse(areaBoundsBaseline);
vm.runInContext(`workspaceAreaSessions.general=areaBoundsBaseline;applyAreaSession('general');`,docks);
assert.equal(JSON.stringify(areaFrames.projects.rect),railRect,'Restoring the baseline keeps its original rail');
console.log('Area resize limits: all four edges, out-of-screen pointers, opposite preservation, canvas reservation, stored sizes and ten viewport/session repair scenarios passed.');

// Shared dock dividers resize adjacent Areas along the dock, independently of
// the existing outer-border thickness gesture. Exercise real handles and model.
const shareBaseline=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks);
const shareAreas=['apps','projects','systems','ai'];
const sharePointer=(handle,type,vertical,start,delta=0,pointerId=41)=>handle.listeners.get(type)?.({
  button:0,pointerId,type,clientX:vertical?start.x:start.x+delta,clientY:vertical?start.y+delta:start.y,
  preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}
});
const shareKey=(handle,key,shiftKey=false)=>handle.listeners.get('keydown')({key,shiftKey,preventDefault(){},stopPropagation(){}});
const configureShareEdge=edge=>{
  docks.shareEdge=edge;
  vm.runInContext(`
    restoreAreaPreferences({});
    ['apps','projects','systems','ai'].forEach((name,index)=>{
      areaFor(name).hidden=false;dockState[name]={edge:shareEdge,order:index};areaPreferredStates[name]='expanded';
    });
    dockSizes[shareEdge]=shareEdge==='left'||shareEdge==='right'?340:300;
    layoutDockAreas(false,false);
  `,docks);
};
shell.clientWidth=1800;shell.clientHeight=1600;
shell.getBoundingClientRect=()=>({left:0,top:0,right:shell.clientWidth,bottom:shell.clientHeight,width:shell.clientWidth,height:shell.clientHeight});
for(const edge of ['left','right','top','bottom']){
  configureShareEdge(edge);
  const vertical=['left','right'].includes(edge),dimension=vertical?'height':'width',crossDimension=vertical?'width':'height';
  const handle=vm.runInContext(`areaShareHandles.get('${edge}:apps:projects')`,docks);
  assert(handle&&!handle.hidden,edge+' has a divider between visible adjacent Areas');
  assert.equal(handle.getAttribute('role'),'separator');
  assert.equal(handle.getAttribute('aria-orientation'),vertical?'horizontal':'vertical',edge+' announces the separator orientation');
  const initial=Object.fromEntries(shareAreas.map(name=>[name,{...areaFrames[name].rect}]));
  const initialInsets=JSON.stringify(docks.insets),before=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks),undoBefore=docks.undoOffers;
  const start={x:initial.apps.x+initial.apps.width,y:initial.apps.y+initial.apps.height};
  const hiddenWritesBefore=handle.hiddenWrites.length;
  sharePointer(handle,'pointerdown',vertical,start);
  sharePointer(handle,'pointermove',vertical,start,60);
  assert(Math.abs(areaFrames.apps.rect[dimension]-initial.apps[dimension]-60)<1e-6,edge+' gives the first Area the dragged space');
  assert(Math.abs(areaFrames.projects.rect[dimension]-initial.projects[dimension]+60)<1e-6,edge+' takes that space from the adjacent Area');
  for(const name of ['systems','ai'])assert.equal(areaFrames[name].rect[dimension],initial[name][dimension],edge+' leaves non-adjacent '+name+' space unchanged');
  for(const name of shareAreas)assert.equal(areaFrames[name].rect[crossDimension],initial[name][crossDimension],edge+' preserves the shared outer thickness');
  assert.equal(JSON.stringify(docks.insets),initialInsets,edge+' leaves the application canvas unchanged');
  assert.equal(vm.runInContext(`areaShareHandles.get('${edge}:apps:projects')`,docks),handle,edge+' keeps the active captured handle attached during reflow');
  assert(!handle.hiddenWrites.slice(hiddenWritesBefore).includes(true),edge+' never transiently hides the active separator during layout');
  sharePointer(handle,'pointerup',vertical,start,60);
  assert.equal(docks.undoOffers,undoBefore+1,edge+' offers one Undo for the whole pointer gesture');
  assert.equal(JSON.stringify(docks.lastUndo),before,edge+' Undo starts before manual/share changes');
  assert.equal(handle.classList.contains('is-active'),false,edge+' removes the active visual after release');
  assert.equal(docks.window.listenerCount(),0,edge+' releases all global Area gesture hooks');
  const after=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks),rects=JSON.stringify(shareAreas.map(name=>areaFrames[name].rect));
  vm.runInContext('applyAreaSession("general");',docks);
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks)),JSON.parse(after),edge+' saves and reloads its relative shares');
  assert.equal(JSON.stringify(shareAreas.map(name=>areaFrames[name].rect)),rects,edge+' reload restores all proportional rectangles');
  docks.restorePlacement(docks.lastUndo);
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks)),JSON.parse(before),edge+' one Undo restores shares, states and thickness');
}

// Every Area, on every dock orientation, changes presentation under pressure.
for(const edge of ['left','right','top','bottom'])for(const squeezed of shareAreas){
  configureShareEdge(edge);
  const vertical=['left','right'].includes(edge),dimension=vertical?'height':'width',index=shareAreas.indexOf(squeezed);
  const first=shareAreas[index===0?0:index-1],second=shareAreas[index===0?1:index];
  const handle=vm.runInContext(`areaShareHandles.get('${edge}:${first}:${second}')`,docks),start={x:0,y:0};
  const delta=(index===0?-1:1)*(areaFrames[squeezed].rect[dimension]-100);
  sharePointer(handle,'pointerdown',vertical,start);
  sharePointer(handle,'pointermove',vertical,start,delta);
  assert.equal(areaFrames[squeezed].dataset.areaState,'rail',edge+' squeezes '+squeezed+' into Compact');
  assert.equal(vm.runInContext(`areaPreferredStates.${squeezed}`,docks),'expanded',edge+' preserves '+squeezed+' Expanded preference');
  sharePointer(handle,'pointermove',vertical,start,0);
  assert.equal(areaFrames[squeezed].dataset.areaState,'expanded',edge+' gives '+squeezed+' expanded content back when it fits');
  sharePointer(handle,'pointercancel',vertical,start);
}

configureShareEdge('left');
let shareHandle=vm.runInContext('areaShareHandles.get("left:apps:projects")',docks);
const shareStart={x:340,y:400};
for(const cancellation of ['pointercancel','Escape','lostpointercapture','blur']){
  const before=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks),undoBefore=docks.undoOffers;
  sharePointer(shareHandle,'pointerdown',true,shareStart);
  sharePointer(shareHandle,'pointermove',true,shareStart,300);
  assert.equal(areaFrames.projects.dataset.areaState,'rail','Pressure switches the squeezed expanded Area to Compact');
  assert.equal(vm.runInContext('areaPreferredStates.projects',docks),'expanded','Pressure preserves its Expanded preference');
  if(cancellation==='Escape')docks.window.dispatchEvent({type:'keydown',key:'Escape',preventDefault(){},stopImmediatePropagation(){}});
  else if(cancellation==='blur')docks.window.dispatchEvent({type:'blur'});
  else sharePointer(shareHandle,cancellation,true,shareStart,300);
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks)),JSON.parse(before),cancellation+' restores proportions and presentation preferences');
  assert.equal(areaFrames.projects.dataset.areaState,'expanded',cancellation+' restores the squeezed Area content');
  assert.equal(docks.undoOffers,undoBefore,cancellation+' does not offer Undo for an abandoned gesture');
  assert.equal(docks.window.listenerCount(),0,cancellation+' clears all global Area gesture hooks');
}
const wrongPointerBefore=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks);
sharePointer(shareHandle,'pointerdown',true,shareStart);
sharePointer(shareHandle,'pointermove',true,shareStart,150,99);
sharePointer(shareHandle,'pointerup',true,shareStart,150,99);
assert.equal(vm.runInContext('JSON.stringify(areaDockShares.left)',docks),'{}','Another pointer cannot resize or finish the active split');
assert(shareHandle.listeners.has('pointermove'),'Wrong-pointer release leaves the real gesture active');
sharePointer(shareHandle,'pointercancel',true,shareStart);
assert.equal(vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks),wrongPointerBefore,'The original pointer can still cancel safely');

// Compact is a presentation of the actual allocation. Preferred Expanded
// returns in the same gesture and after a later resize. Deliberate Compact
// only promotes after growing past its usable footprint plus hysteresis.
sharePointer(shareHandle,'pointerdown',true,shareStart);
sharePointer(shareHandle,'pointermove',true,shareStart,300);
assert.equal(areaFrames.projects.dataset.areaState,'rail');
sharePointer(shareHandle,'pointermove',true,shareStart,0);
assert.equal(areaFrames.projects.dataset.areaState,'expanded','Reversing pressure restores Expanded without another command');
sharePointer(shareHandle,'pointermove',true,shareStart,300);
sharePointer(shareHandle,'pointerup',true,shareStart,300);
assert.equal(vm.runInContext('areaPreferredStates.projects',docks),'expanded','Releasing a squeezed Area keeps the Expanded preference');
vm.runInContext('applyAreaSession("general");',docks);
assert.equal(areaFrames.projects.dataset.areaState,'rail','Reload keeps the constrained compact allocation');
sharePointer(shareHandle,'pointerdown',true,shareStart);
sharePointer(shareHandle,'pointermove',true,shareStart,-300);
sharePointer(shareHandle,'pointerup',true,shareStart,-300);
assert.equal(areaFrames.projects.dataset.areaState,'expanded','A later gesture gives the squeezed Area its expanded content back');
vm.runInContext(`areaDockShares.left={apps:.45,projects:.05,systems:.25,ai:.25};areaPreferredStates.projects='rail';layoutDockAreas(false,false);`,docks);
const compactStart=areaFrames.projects.rect.height;
sharePointer(shareHandle,'pointerdown',true,shareStart);
sharePointer(shareHandle,'pointermove',true,shareStart,-150);
assert.equal(areaFrames.projects.dataset.areaState,'rail','Deliberate Compact stays compact below the promotion threshold');
assert.equal(vm.runInContext('areaPreferredStates.projects',docks),'rail');
sharePointer(shareHandle,'pointermove',true,shareStart,-(264-compactStart));
assert.equal(areaFrames.projects.dataset.areaState,'expanded','Giving deliberate Compact enough extra space promotes it to Expanded');
assert.equal(vm.runInContext('areaPreferredStates.projects',docks),'expanded');
sharePointer(shareHandle,'pointerup',true,shareStart,-(264-compactStart));

// Explicit Expanded must reclaim useful along-dock space after pressure,
// instead of selecting a presentation that remains too small to display.
for(const edge of ['left','right','top','bottom']){
  configureShareEdge(edge);
  const vertical=['left','right'].includes(edge),dimension=vertical?'height':'width',crossDimension=vertical?'width':'height';
  vm.runInContext(`areaDockShares[shareEdge]={apps:.05,projects:.45,systems:.25,ai:.25};layoutDockAreas(false,false);`,docks);
  const thickness=areaFrames.apps.rect[crossDimension],insets=JSON.stringify(docks.insets);
  assert.equal(areaFrames.apps.dataset.areaState,'rail',edge+' begins with pressure-compacted Apps');
  vm.runInContext('setAreaState("apps","expanded",false);',docks);
  assert.equal(areaFrames.apps.dataset.areaState,'expanded',edge+' Expanded command gives Apps usable space');
  assert(areaFrames.apps.rect[dimension]>=(vertical?244:324)-1e-6,edge+' Expanded reserves the usable footprint plus recovery margin');
  assert.equal(areaFrames.apps.rect[crossDimension],thickness,edge+' Expanded recovery keeps this column thickness');
  assert.equal(JSON.stringify(docks.insets),insets,edge+' Expanded recovery keeps the application canvas');
  for(const name of shareAreas){
    const rect=areaFrames[name].rect;
    assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=shell.clientWidth+1e-6&&rect.y+rect.height<=shell.clientHeight+1e-6,edge+' Expanded recovery keeps '+name+' inside the display');
  }
}
configureShareEdge('left');
shell.clientHeight=500;
vm.runInContext('areaDockShares.left={apps:.144,projects:.144,systems:.144,ai:.568};layoutDockAreas(false,false);',docks);
vm.runInContext('setAreaState("apps","expanded",false);',docks);
assert.equal(areaFrames.apps.dataset.areaState,'expanded','Explicit Expanded reclaims usable space even with two peers already at compact minimum');
assert(areaFrames.apps.rect.height>=220-1e-6,'Clamping small peers cannot steal the reclaimed usable footprint');
for(const name of ['projects','systems','ai'])assert(areaFrames[name].rect.height>=72-1e-6,'Expanded recovery preserves '+name+' compact controls');
shell.clientHeight=1600;

// Keyboard resizing uses the same saved proportions and persistent separator.
for(const edge of ['left','right','top','bottom']){
  configureShareEdge(edge);
  const vertical=['left','right'].includes(edge),dimension=vertical?'height':'width';
  const handle=vm.runInContext(`areaShareHandles.get('${edge}:apps:projects')`,docks),size=areaFrames.apps.rect[dimension],undoBefore=docks.undoOffers;
  shareKey(handle,vertical?'ArrowDown':'ArrowRight');
  assert(Math.abs(areaFrames.apps.rect[dimension]-size-16)<1e-6,edge+' arrow gives the first Area 16 pixels');
  shareKey(handle,vertical?'ArrowUp':'ArrowLeft',true);
  assert(Math.abs(areaFrames.apps.rect[dimension]-size+32)<1e-6,edge+' Shift-arrow uses a 48 pixel step');
  assert.equal(docks.undoOffers,undoBefore+2,edge+' each keyboard action has one Undo');
  assert.equal(vm.runInContext(`areaShareHandles.get('${edge}:apps:projects')`,docks),handle,edge+' keyboard reflow preserves focus target identity');
  assert.equal(handle.getAttribute('aria-valuenow'),String(Math.round(100*areaFrames.apps.rect[dimension]/(areaFrames.apps.rect[dimension]+areaFrames.projects.rect[dimension]))),edge+' updates the accessible separator value');
  const before=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks);
  shareKey(handle,vertical?'ArrowLeft':'ArrowUp');
  assert.equal(vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks),before,edge+' ignores the arrow on the other axis');
}

configureShareEdge('left');
vm.runInContext('areaFor("projects").hidden=true;',docks);
docks.isLocalArea=name=>name!=='systems';
vm.runInContext('layoutDockAreas(false,false);',docks);
assert.equal(vm.runInContext('JSON.stringify([...areaShareHandles].filter(([,handle])=>!handle.hidden).map(([key])=>key))',docks),'["left:apps:ai"]','Only visible local adjacent Areas get a divider; hidden and remote peers are skipped');
assert.equal(vm.runInContext('areaShareHandles.get("left:apps:projects").hidden',docks),true,'Former adjacency divider is hidden');
docks.isLocalArea=()=>true;
configureShareEdge('left');
vm.runInContext(`areaDockShares.left={apps:.25,projects:.25,systems:.25,ai:.25};areaFor('projects').hidden=true;areaFor('systems').hidden=true;layoutDockAreas(false,false);`,docks);
const hiddenShareHandle=vm.runInContext('areaShareHandles.get("left:apps:ai")',docks);
shareKey(hiddenShareHandle,'ArrowDown');
assert.equal(vm.runInContext('areaDockShares.left.projects',docks),.25,'Resizing visible peers retains the hidden Project share');
assert.equal(vm.runInContext('areaDockShares.left.systems',docks),.25,'Resizing visible peers retains the hidden System share');
assert.equal(vm.runInContext('areaDockShares.left.apps+areaDockShares.left.ai',docks),.5,'Visible peers retain their combined share mass while hidden peers are absent');
vm.runInContext(`areaFor('projects').hidden=false;areaFor('systems').hidden=false;layoutDockAreas(false,false);`,docks);
assert(Math.abs(areaFrames.projects.rect.height-400)<1e-6,'Showing Project restores its original proportion');
assert(Math.abs(areaFrames.systems.rect.height-400)<1e-6,'Showing System restores its original proportion');
assert(Math.abs(areaFrames.apps.rect.height-408)<1e-6,'The shared-space edit remains proportional when hidden peers return');
assert(Math.abs(areaFrames.ai.rect.height-392)<1e-6);

// More along-dock space cannot silently widen a deliberately narrow column.
configureShareEdge('left');
vm.runInContext(`['apps','projects','systems','ai'].forEach(name=>{areaPreferredStates[name]='rail';});dockSizes.left=70;layoutDockAreas(false,false);`,docks);
const narrowHandle=vm.runInContext('areaShareHandles.get("left:apps:projects")',docks),narrowInsets=JSON.stringify(docks.insets);
shareKey(narrowHandle,'ArrowDown',true);
assert.equal(vm.runInContext('areaPreferredStates.apps',docks),'rail','Along-dock growth preserves deliberate Compact when the cross-axis cannot fit Expanded');
assert.equal(areaFrames.apps.dataset.areaState,'rail');
assert.equal(areaFrames.apps.rect.width,70,'The sibling gesture does not widen a narrow column');
assert.equal(JSON.stringify(docks.insets),narrowInsets,'Narrow-column sibling resizing preserves the application canvas');

// A newly shown peer has no share yet. Give it its default allocation while
// preserving the ratio the user already chose for the established neighbors.
for(const edge of ['left','right','top','bottom']){
  configureShareEdge(edge);
  const vertical=['left','right'].includes(edge),dimension=vertical?'height':'width',extent=vertical?shell.clientHeight:shell.clientWidth;
  vm.runInContext(`areaFor('projects').hidden=areaFor('ai').hidden=true;areaDockShares[shareEdge]={apps:.8,systems:.2};layoutDockAreas(false,false);`,docks);
  assert(Math.abs(areaFrames.apps.rect[dimension]/areaFrames.systems.rect[dimension]-4)<1e-6,edge+' begins with the existing 80/20 split');
  vm.runInContext('showArea("projects",false);',docks);
  assert(Math.abs(areaFrames.apps.rect[dimension]/areaFrames.systems.rect[dimension]-4)<1e-6,edge+' showing an unweighted peer preserves the existing 80/20 ratio');
  assert(Math.abs(areaFrames.projects.rect[dimension]-extent/3)<1e-6,edge+' the new peer receives its normal default portion');
  assert.equal(vm.runInContext('JSON.stringify(areaDockShares[shareEdge])',docks),'{"apps":0.8,"systems":0.2}',edge+' default share bootstrap does not mutate persisted user weights');
  const beforeReload=JSON.stringify(shareAreas.map(name=>areaFrames[name].rect));
  vm.runInContext('applyAreaSession("general");',docks);
  assert.equal(JSON.stringify(shareAreas.map(name=>areaFrames[name].rect)),beforeReload,edge+' reload restores the bootstrapped new peer and existing ratio');
}
configureShareEdge('left');
shareHandle=vm.runInContext('areaShareHandles.get("left:apps:projects")',docks);
shareKey(shareHandle,'ArrowDown');
const generalShares=vm.runInContext('JSON.stringify(areaDockShares)',docks);
vm.runInContext('activeWorkspace="school";applyAreaSession("school");',docks);
assert.notEqual(vm.runInContext('JSON.stringify(areaDockShares)',docks),generalShares,'Another Workspace does not inherit the edited dock proportions');
vm.runInContext('activeWorkspace="general";applyAreaSession("general");',docks);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(areaDockShares)',docks)),JSON.parse(generalShares),'Returning to the Workspace restores its dock proportions');

// The projected drop uses the exact weighted allocator and does not mutate
// saved proportions or any real panel before the move is committed.
vm.runInContext(`areaFor('ai').hidden=true;areaFor('projects').hidden=false;
  dockState.apps={edge:'left',order:0};dockState.projects={edge:'left',order:1};dockState.systems={edge:'right',order:0};
  areaPreferredStates.apps=areaPreferredStates.projects=areaPreferredStates.systems='expanded';
  areaDockShares.left={apps:.5,projects:.3,systems:.2};layoutDockAreas(false,false);`,docks);
const sharePreviewBefore=vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks),sharePreviewRects=JSON.stringify(shareAreas.map(name=>areaFrames[name].rect)),sharePreviewStorage=JSON.stringify([...store]);
vm.runInContext('renderAreaDockPreview("systems","left",2);',docks);
const weightedPreview=vm.runInContext('({x:parseFloat(dockPreview.style.left),y:parseFloat(dockPreview.style.top),width:parseFloat(dockPreview.style.width),height:parseFloat(dockPreview.style.height)})',docks);
assert.equal(vm.runInContext('JSON.stringify(snapshotAreaLayout())',docks),sharePreviewBefore,'Weighted preview leaves all shares and placement untouched');
assert.equal(JSON.stringify(shareAreas.map(name=>areaFrames[name].rect)),sharePreviewRects,'Weighted preview leaves real Areas untouched');
assert.equal(JSON.stringify([...store]),sharePreviewStorage,'Weighted preview does not save speculation');
vm.runInContext('setDockPosition("systems","left",2,false);',docks);
for(const key of ['x','y','width','height'])assert.equal(weightedPreview[key],areaFrames.systems.rect[key],'Weighted drop preview matches committed '+key);
shell.clientWidth=1600;shell.clientHeight=900;shell.getBoundingClientRect=originalShellRect;
docks.shareBaseline=JSON.parse(shareBaseline);
vm.runInContext('workspaceAreaSessions.general=shareBaseline;applyAreaSession("general");',docks);
console.log('Shared Area dividers passed: four edges and Areas, proportional neighbor resize, unchanged canvas/thickness, stable handles, pointer filtering/cancellation, reversible pressure, deliberate Compact promotion, keyboard steps, Undo, Workspace persistence, hidden/remote peers and weighted drop previews.');

vm.runInContext(slice("function hideArea(", "function setDockPosition("), docks);
vm.runInContext(slice("function contextMenuEntries(", "function closeDesktopContextMenu("), docks);
vm.runInContext(`workspaceAreaSessions.general.hidden = {apps:true, systems:true, projects:true, ai:true};
  applyAreaSession("general");`, docks);
for (const name of ["apps", "systems", "projects", "ai"]) {
  assert.equal(areaFrames[name].hidden, true, name + " restores saved hidden state");
  assert.equal(vm.runInContext(`contextMenuEntries({kind:"area",name:"${name}"}).some(item => item.action === "area-hide")`, docks), true, name + " has a hide context command");
}
assert.deepEqual(docks.insets, {left:0,right:0,bottom:0,top:0}, "Hiding every Area frees the entire canvas");
vm.runInContext('activeWorkspace = "school"; applyAreaSession("school");', docks);
assert.equal(areaFrames.apps.hidden, false, "Another workspace keeps its own visible Areas");
vm.runInContext('activeWorkspace = "general"; applyAreaSession("general");', docks);
for (const name of ["apps", "systems", "projects", "ai"]) {
  assert.equal(areaFrames[name].hidden, true, "Workspace switching preserves " + name + " visibility");
  vm.runInContext(`showArea("${name}",false);`, docks);
  assert.equal(areaFrames[name].hidden, false, name + " can be restored");
  vm.runInContext(`hideArea("${name}"); applyAreaSession("general");`, docks);
  assert.equal(areaFrames[name].hidden, true, name + " can be hidden again and restored as hidden");
}
vm.runInContext('["apps","systems","projects","ai"].forEach(name => showArea(name,false));', docks);
assert.equal(JSON.stringify(areaFrames.projects.rect), railRect, "Showing Areas restores their original dock sizes and positions");
const html = fs.readFileSync(require("node:path").join(__dirname, "../dist/index.html"), "utf8");
assert(!html.includes("data-area-auto"), "Move dock buttons are removed");
for (const name of ["apps", "systems", "projects", "ai"]) {
  assert(html.includes('data-overview-area-visibility="' + name + '"'), name + " has a Show/Hide recovery control in Overview");
}
console.log("Hideable Areas: all four context commands, saved visibility, full canvas, workspace isolation and Show recovery passed.");

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
  assert.equal(vm.runInContext("manualWindowInteraction", sandbox), false, "Manual placement lock is released too");
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
const peersBeforeDrag = JSON.stringify(Object.entries(frames).filter(([name]) => name !== "notes").map(([name,frame]) => [name,frame.style,sandbox.appState[name]]));
startGesture();
pointer("pointermove", 620, 165);
assert.equal(JSON.stringify(Object.entries(frames).filter(([name]) => name !== "notes").map(([name,frame]) => [name,frame.style,sandbox.appState[name]])), peersBeforeDrag, "Starting a manual drag does not retile or park its neighbours");
const treeDuringDrag = vm.runInContext('JSON.stringify(tileSession().root)', sandbox);
vm.runInContext('renderTileLayout("notes")', sandbox);
assert.equal(vm.runInContext('JSON.stringify(tileSession().root)', sandbox), treeDuringDrag, "An Area/presence layout pass cannot mutate tiles during a held manual drag");
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
const pageBeforeLeftDrag = sandbox.desktopPages.current("general");
sandbox.desktopPages.assign("general", "fixture-page", 2);
sandbox.desktopPages.go("general", 2);
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

// A real left title drag owns wheel navigation, even before pointer movement.
const localityBeforeCarry = sandbox.isLocalApp;
const pagesBeforeCarry = sandbox.desktopPages.snapshot();
const sessionsBeforeCarry = vm.runInContext('JSON.stringify(tileSessions)', sandbox);
let carryClock = 0;
Object.assign(sandbox, { performance: {now: () => carryClock}, saveDesktopPages() {} });
sandbox.isLocalApp = name => sandbox.desktopPages.visible("general", name);
workspaceElement.clientHeight = 1016;
Object.keys(sandbox.appState).forEach(name => {sandbox.appState[name] = ["notes", "dolphin", "elisa"].includes(name) ? "open" : "closed";});
for (const name of ["notes", "dolphin"]) sandbox.desktopPages.assign("general", name, 4);
sandbox.desktopPages.assign("general", "elisa", 5);
sandbox.desktopPages.go("general", 5);
vm.runInContext('renderTileLayout("elisa")', sandbox);
sandbox.desktopPages.go("general", 4);
vm.runInContext('renderTileLayout("notes")', sandbox);
const wheelCarry = (delta = 80, modifiers = {}) => {
  const scroll = {type:"wheel", deltaY:delta, deltaX:0, deltaMode:0, ...modifiers,
    preventDefault(){this.prevented=true;}, stopPropagation(){this.stopped=true;}};
  sandbox.window.dispatchEvent(scroll);
  return scroll;
};
startLeftDrag();
const heldRect = {...frames.notes.style};
assert.equal(wheelCarry(80, {ctrlKey:true}).prevented, undefined, "Holding a titlebar does not hijack browser zoom");
assert.equal(wheelCarry(80, {deltaX:160}).prevented, undefined, "Horizontal scrolling does not carry a window");
const carried = wheelCarry();
assert.equal(carried.prevented, true);
assert.equal(carried.stopped, true, "Held-wheel cannot also scroll an app or Area");
assert.equal(sandbox.desktopPages.current("general"), 5);
assert.equal(sandbox.desktopPages.pageOf("general", "notes"), 5);
assert.equal(frames.notes.hidden, false, "The held frame remains visible on the destination");
for (const key of ["left", "top", "width", "height"]) assert.equal(frames.notes.style[key], heldRect[key], "Wheel navigation does not move the held frame");
assert.equal(sandbox.appState.dolphin, "open", "The source peer stays running on its own desktop");
assert.equal(sandbox.desktopPages.pageOf("general", "dolphin"), 4);
assert.equal(sandbox.appState.elisa, "open", "Destination peers cannot be parked by the moving window");
assert.deepEqual(Array.from(vm.runInContext('tileEngine.names(tileSession().root)', sandbox)), ["elisa"], "Held windows are outside the destination split until release");
for (carryClock = 15; carryClock <= 300; carryClock += 15) wheelCarry();
assert.equal(sandbox.desktopPages.current("general"), 5, "A wheel burst and its momentum switch only one page during a drag");
pointer("pointerup", 550, 110, 0);
assertCleanGesture();
assert.equal(vm.runInContext('activeDesktopDrag', sandbox), null);
assert.equal(vm.runInContext('tileEngine.contains(tileSession().root, "notes")', sandbox), true, "Releasing without pointer motion still places the carried window");
assert.equal(vm.runInContext('tileEngine.contains(tileSessions["general:desktop:4:1"].root, "notes")', sandbox), false, "The window is removed from its old split");
assert.equal(wheelCarry().prevented, undefined, "Normal wheel routing returns immediately after release");

// Cross several pages while held, reverse, then cancel through Escape or blur.
const beforeReturn = vm.runInContext('JSON.stringify(tileSession())', sandbox);
startLeftDrag();
carryClock = 600; wheelCarry();
assert.equal(sandbox.desktopPages.current("general"), 6, "A fresh gesture can reach the spare empty desktop");
carryClock = 900; wheelCarry();
assert.equal(sandbox.desktopPages.current("general"), 7, "Carrying a window creates the next spare desktop");
carryClock = 1200; wheelCarry(-80);
assert.equal(sandbox.desktopPages.current("general"), 6, "Reverse scrolling works while the same pointer remains held");
sandbox.window.dispatchEvent({type:"keydown", key:"Escape", preventDefault(){}, stopPropagation(){}});
assertCleanGesture();
assert.equal(sandbox.desktopPages.current("general"), 5);
assert.equal(sandbox.desktopPages.pageOf("general", "notes"), 5, "Cancel restores the original page assignment");
assert.equal(vm.runInContext('JSON.stringify(tileSession())', sandbox), beforeReturn, "Cancel restores the original split and floating state");
for (const page of [6,7]) assert.equal(vm.runInContext(`tileEngine.contains(tileSessions["general:desktop:${page}:1"]?.root, "notes")`, sandbox), false, "Cancelled carry leaves no duplicate on a visited page");
startLeftDrag();
carryClock = 1500; wheelCarry(-80);
sandbox.window.dispatchEvent({type:"blur"});
assertCleanGesture();
assert.equal(sandbox.desktopPages.pageOf("general", "notes"), 5, "Losing browser focus also returns the carried window");

// Alt-left floating carries use the same wheel owner, but resize and middle do not.
startGesture(0);
carryClock = 1800; wheelCarry();
assert.equal(sandbox.desktopPages.current("general"), 6);
pointer("pointerup", 550, 110, 0);
assertCleanGesture();
assert.equal(frames.notes.classList.contains("is-floating"), true);
assert.equal(vm.runInContext('Boolean(tileSession().floating.notes)', sandbox), true, "Manual placement remains floating after a desktop transfer");
startGesture(0, true);
assert.equal(wheelCarry().prevented, undefined, "Resize gestures do not switch desktops");
pointer("pointerup", 550, 110, 0);
assertCleanGesture();
startGesture(1);
assert.equal(wheelCarry().prevented, undefined, "Middle drag keeps its existing wheel behavior");
pointer("pointerup", 550, 110, 0);
assertCleanGesture();
sandbox.isLocalApp = localityBeforeCarry;
sandbox.desktopPages.load(pagesBeforeCarry);
sandbox.savedCarrySessions = JSON.parse(sessionsBeforeCarry);
vm.runInContext('tileSessions = savedCarrySessions', sandbox);
delete sandbox.savedCarrySessions;
console.log("Held-window desktops: wheel-only carry, geometry continuity, source/destination peers, momentum, repeated/reversed pages, release, Escape/blur rollback, floating carry, zoom/horizontal guards and no leaked hooks passed.");
sandbox.$ = oldSelector;
sandbox.desktopPages.go("general", pageBeforeLeftDrag);
Object.assign(sandbox.appState, appsBeforeLeftDrag);
vm.runInContext('syncApps(); renderTileLayout("notes")', sandbox);
vm.runInContext('tileSession().floating.notes = {left:330,top:300,width:440,height:350,yieldEdges:["left"]}; updateFloatingYield("notes", {passed:new Set(),preferredSizes:dockSizes})', sandbox);
assert.equal(vm.runInContext('tileSession().floating.notes.yieldEdges.includes("left")', sandbox), true, "Area return has a larger hysteresis boundary");
vm.runInContext('tileSession().floating.notes.left = 400; updateFloatingYield("notes", {passed:new Set(),preferredSizes:dockSizes})', sandbox);
assert.equal(vm.runInContext('tileSession().floating.notes.yieldEdges.includes("left")', sandbox), false, "Moving the manual window clear releases borrowed space");
console.log("Intent interactions: Alt/middle drag and resize, capture loss on reparent, pointer filtering, release, cancel, blur, visibility, missing-up recovery, cursor reset and no leaked hooks passed.");

// Detaching a noodle-shaped tile gives it a normal app footprint, anchored
// under the held pointer. Existing manual sizes and resize gestures are kept.
const beforeDetachApps = {...sandbox.appState};
const beforeDetachPage = sandbox.desktopPages.current("general");
sandbox.desktopPages.assign("general", "fixture-page", 3);
sandbox.desktopPages.go("general", 3);
Object.keys(sandbox.appState).forEach(name => {sandbox.appState[name] = name === "notes" ? "open" : "closed";});
vm.runInContext('renderTileLayout("notes")',sandbox);
Object.assign(frames.notes.style,{left:"80px",top:"80px",width:"1400px",height:"340px"});
const noodleRect = {...frames.notes.style};
startGesture();
pointer("pointermove",552,112);
for (const key of ["left","top","width","height"]) assert.equal(frames.notes.style[key],noodleRect[key],"A middle click or tiny pointer wobble does not resize the tile");
pointer("pointermove",620,165);
assert.equal(frames.notes.style.width,"480px","Wide thin tile becomes a normal small Notes window");
assert.equal(frames.notes.style.height,"440px");
assert(Math.abs(parseFloat(frames.notes.style.left)+(470/1400)*480-620)<.01,"Horizontal grab proportion stays under the pointer");
assert.equal(parseFloat(frames.notes.style.top)+30,165,"The same titlebar point follows the pointer vertically");
pointer("pointerup",620,165,0);
assertCleanGesture();
startGesture();pointer("pointermove",610,160);pointer("pointerup",610,160,0);
assert.equal(frames.notes.style.width,"480px","A second middle drag preserves the floating size");
assert.equal(frames.notes.style.height,"440px");
startGesture(1,true);pointer("pointermove",590,140);pointer("pointerup",590,140,0);
assert.equal(frames.notes.style.width,"520px","Manual resizing uses the current width, not a detach preset");
assert.equal(frames.notes.style.height,"470px");
assertCleanGesture();
vm.runInContext('splitWindowIntoTile("notes")',sandbox);
startGesture();pointer("pointermove",620,165);pointer("pointercancel",620,165,0);
assertCleanGesture();
assert(frames.notes.classList.contains("is-tiled"),"Canceling a detach restores the tile");
assert.equal(vm.runInContext('Boolean(tileSession().floating.notes)',sandbox),false);
vm.runInContext('floatWindow("notes")',sandbox);
assert.equal(frames.notes.style.width,"480px","Float menu uses the same normal footprint as manual detaching");
assert.equal(frames.notes.style.height,"440px");
for(const name of Object.keys(minimums)) {
  const rect=vm.runInContext(`detachedDragRect("${name}",{left:8,top:8,width:1500,height:350},{clientX:750,clientY:32})`,sandbox);
  assert(rect.width>=min(name).width && rect.height>=min(name).height,name+" has a usable detached footprint");
  assert(rect.width/rect.height<2 && rect.height/rect.width<2,name+" is not a noodle in either direction");
}
const wideBounds=sandbox.workspaceBounds;
sandbox.workspaceBounds=()=>({width:460,height:350,rect:{left:0,top:0}});
const smallRect=vm.runInContext('detachedDragRect("notes",{left:8,top:8,width:444,height:334},{clientX:230,clientY:32})',sandbox);
assert.equal(smallRect.width,444,"Detached size adapts to a small available workspace");
assert.equal(smallRect.height,334);
sandbox.workspaceBounds=wideBounds;
sandbox.desktopPages.go("general", beforeDetachPage);
Object.assign(sandbox.appState,beforeDetachApps);
vm.runInContext('syncApps();renderTileLayout("notes")',sandbox);
console.log("Detached footprints: movement threshold, sensible app sizes, pointer anchoring, repeated drag, explicit resize, cancel, Float menu and limited space passed.");

// Check the desktop's real planner adapter, not just the pure docking policy.
const intentAssignments = {apps:Object.fromEntries(Object.keys(frames).map(name => [name,1])),areas:{projects:1,apps:1,systems:1}};
Object.assign(sandbox, {
  areaPriority:["projects","apps","systems"], dockState:{projects:{edge:"left"},apps:{edge:"right"},systems:{edge:"right"}},
  areaFor:name => areaFrames[name], displayAssignmentsFor:() => intentAssignments,
  isLocalApp:name => intentAssignments.apps[name] === 1,
  activeDisplayRoster:() => [{width:1616,height:1016},{width:1616,height:1016}], extendedDesktopActive:() => true,
  layoutDockAreas() {}, persistDisplayAssignments() {}, projectColumnActive: () => true
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
sandbox.desktopPages.assign("general", "fixture-page", 4);
sandbox.desktopPages.go("general", 4);
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

sandbox.extendedDesktopActive=()=>false;
// Visibility is per monitor/workspace and based on complete geometric coverage,
// including the union of several foreground windows, not just the front app.
sandbox.desktopPages.assign("general", "fixture-page", 5);
sandbox.desktopPages.go("general", 5);
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

const visibilityCallbacks = [];
sandbox.requestAnimationFrame = fn => {visibilityCallbacks.push(fn);return visibilityCallbacks.length;};
sandbox.windowViewportLockReady = false;
vm.runInContext('windowVisibilityFrame=0;tileLayoutFrame=0;scheduleWindowVisibility()',sandbox);
visibilityCallbacks.shift()();
assert.equal(sandbox.appState.dolphin,"open","Startup must restore and tile the windows before judging their visibility");
sandbox.windowViewportLockReady = true;
vm.runInContext('tileLayoutFrame=1;scheduleWindowVisibility()',sandbox);
visibilityCallbacks.shift()();
assert.equal(sandbox.appState.dolphin,"open","A pending tile pass takes priority over stale overlapping geometry");
vm.runInContext('tileLayoutFrame=0;scheduleWindowVisibility()',sandbox);
visibilityCallbacks.shift()();
assert.equal(sandbox.appState.dolphin,"minimized","After layout settles an actually invisible window is parked");
console.log("Visibility scheduling: startup guard, pending layout and settled checks passed.");

// A tile pass queued before pointerdown must not race the next pointermove.
visibilityCallbacks.length=0;
const oldRenderTileLayout = vm.runInContext('renderTileLayout', sandbox);
let scheduledTileRenders = 0;
sandbox.countTileRender = () => scheduledTileRenders++;
vm.runInContext('renderTileLayout=countTileRender;tileLayoutFrame=0;tileInteraction=false;scheduleWindowTiling("notes")', sandbox);
vm.runInContext('tileInteraction=true', sandbox);
visibilityCallbacks.shift()();
assert.equal(visibilityCallbacks.length,0,"The first queued frame stops when a gesture has started");
vm.runInContext('tileInteraction=false;scheduleWindowTiling("notes")', sandbox);
visibilityCallbacks.shift()();
vm.runInContext('tileInteraction=true', sandbox);
visibilityCallbacks.shift()();
assert.equal(scheduledTileRenders,0,"The second queued frame also respects the held gesture");
vm.runInContext('tileInteraction=false;scheduleWindowTiling("notes")', sandbox);
visibilityCallbacks.shift()();visibilityCallbacks.shift()();
assert.equal(scheduledTileRenders,1,"Normal scheduling still renders after release");
sandbox.restoreTileRender = oldRenderTileLayout;
vm.runInContext('renderTileLayout=restoreTileRender',sandbox);

// Area yielding changes the workspace origin. Fixed floats must keep screen
// coordinates while legacy workspace children retain their viewport position.
sandbox.suspendWindowViewportLock = false;
sandbox.windowViewportSaveTimer = 0;
sandbox.clearTimeout = () => {};
vm.runInContext(slice("function captureVisibleWindowViewportRects(","function setWorkspaceInsets("),sandbox);
resetVisibility();
vm.runInContext('openApp("notes");floatWindow("notes",{left:480,top:90,width:440,height:350});tileSession().floating.notes.yieldEdges=["left"]',sandbox);
const fixedScreenRect = vm.runInContext('JSON.stringify(tileSession().floating.notes)',sandbox);
vm.runInContext('var areaResizeSnapshot=captureVisibleWindowViewportRects()',sandbox);
const selectorBeforeViewportTest = sandbox.$;
sandbox.$ = selector => selector === ".workspace-zone" ? {getBoundingClientRect:()=>({left:310,top:70})} : selectorBeforeViewportTest(selector);
vm.runInContext('restoreWindowViewportRects(areaResizeSnapshot)',sandbox);
assert.equal(frames.notes.style.left,"480px","Yield/return never subtracts the Area inset from a floating window");
assert.equal(frames.notes.style.top,"90px");
assert.equal(vm.runInContext('JSON.stringify(tileSession().floating.notes)',sandbox),fixedScreenRect,"Fixed coordinates and Area leases remain in sync");
frames.notes.classList.add("is-fullscreen");
assert.equal(vm.runInContext('captureVisibleWindowViewportRects().size',sandbox),0,"Fullscreen is never restored as a workspace child");
frames.notes.classList.remove("is-fullscreen","is-floating");
vm.runInContext('restoreWindowViewportRects(areaResizeSnapshot)',sandbox);
assert.equal(frames.notes.style.left,"170px","A genuine workspace child still compensates for its new origin");
assert.equal(frames.notes.style.top,"20px");
sandbox.$ = selectorBeforeViewportTest;
console.log("Manual drag stability: frozen peers/tree, both queued-frame guards, screen-space float restoration and fullscreen exclusion passed.");


// The real held-pointer wheel owner can cross a column, commit or roll back.
const columnCarrySelector = sandbox.$;
sandbox.$ = selector => selector === '.apps-zone' ? appsElement : selector === '.workspace-zone' ? workspaceElement : columnCarrySelector(selector);
Object.assign(sandbox, {
  projectSpaces:{project:{name:'Test project'}},workspaceProfiles:{general:{label:'General'}},
  openProjectNames:()=>['project'], renderProjectSpace(name){sandbox.activeProjectName=name;},
  windowMembership:{general:{notes:null,dolphin:null,elisa:'project'}},
  endSystemRailExpansion(){},saveIndependentSessions(){},projectColumnActive:()=>true,
  extendedDesktopActive:()=>false,isLocalApp:name=>sandbox.desktopPages.visible('general',name),
  performance:{now:()=>carryClock}
});
sandbox.desktopPages.load({});
for (const name of Object.keys(sandbox.appState)) sandbox.appState[name]=['notes','dolphin','elisa'].includes(name)?'open':'closed';
sandbox.desktopPages.assign('general','notes',0,'workspace');
sandbox.desktopPages.assign('general','dolphin',0,'workspace');
sandbox.desktopPages.assign('general','elisa',0,'project');
vm.runInContext(slice('function projectColumnActive(', 'function changeDesktopColumn('),sandbox);
vm.runInContext(slice('function changeDraggedDesktopColumn(', 'function renderDesktopColumnMap('),sandbox);
vm.runInContext('tileSessions = {}; renderTileLayout("notes");',sandbox);
const beforeColumnCarry=vm.runInContext('JSON.stringify(tileSessions)',sandbox);
startLeftDrag();carryClock=10000;wheelCarry(80,{shiftKey:true});
assert.equal(sandbox.desktopPages.column('general'),'project');
assert.equal(sandbox.windowMembership.general.notes,'project');
assert.equal(sandbox.desktopPages.visible('general','dolphin'),false);
assert.equal(vm.runInContext('tileEngine.contains(tileSessions["general:desktop:0:1"].root,"notes")',sandbox),false);
for(carryClock=10015;carryClock<10200;carryClock+=15) wheelCarry(80,{shiftKey:true});
assert.equal(sandbox.desktopPages.column('general'),'project','Column momentum does not repeat the transfer');
carryClock=10500;wheelCarry(-80,{shiftKey:true});
assert.equal(sandbox.desktopPages.column('general'),'workspace');
sandbox.window.dispatchEvent({type:'keydown',key:'Escape',preventDefault(){},stopPropagation(){}});
assertCleanGesture();
assert.equal(sandbox.windowMembership.general.notes,null);
assert.equal(vm.runInContext('JSON.stringify(tileSessions)',sandbox),beforeColumnCarry);
startLeftDrag();carryClock=11000;wheelCarry(80,{shiftKey:true});pointer('pointerup',550,110,0);
assertCleanGesture();
assert.equal(sandbox.windowMembership.general.notes,'project');
assert.equal(vm.runInContext('tileEngine.contains(tileSession().root,"notes")',sandbox),true,'Release inserts the window into its project desktop');
console.log('Held-window columns passed: real Shift+wheel ownership transfer, source removal, momentum, reverse, Escape rollback and release commit.');

// Exercise the production adapter with two displays and real capacity fitting.
resetVisibility();
const monitorAssignments = {apps:{dolphin:1,elisa:1,notes:1,browser:2,terminal:1},areas:{}};
sandbox.displayAssignmentsFor=()=>monitorAssignments;
sandbox.extendedDesktopActive=()=>true;
sandbox.otherDisplaySlot=()=>2;
sandbox.activeDisplayRoster=()=>[{width:1616,height:1016},{width:1400,height:1000}];
sandbox.isLocalApp=name=>sandbox.desktopPages.visible("general",name) && monitorAssignments.apps[name]===1;
sandbox.areaFor=()=>null;
sandbox.persistDisplayAssignments=()=>{};
const resetMonitors=()=>{
  resetVisibility();Object.keys(frames).forEach(name=>sandbox.desktopPages.assign("general",name,sandbox.desktopPages.current("general"),sandbox.desktopPages.column("general")));Object.assign(monitorAssignments.apps,{dolphin:1,elisa:1,notes:1,browser:2,terminal:1});
  vm.runInContext('delete tileSessions[intentContextPrefix()+2]',sandbox);
};
resetMonitors();
vm.runInContext('openApp("dolphin");openApp("elisa");openApp("notes");floatWindow("notes",{left:480,top:90,width:440,height:350})',sandbox);
sandbox.appState.browser="open";sandbox.desktopPages.assign("general","browser",sandbox.desktopPages.current("general"),sandbox.desktopPages.column("general"));
const floatBeforeTransfer=vm.runInContext('JSON.stringify(tileSession().floating.notes)',sandbox);
vm.runInContext('focusTileWindow("dolphin")',sandbox);
assert.equal(monitorAssignments.apps.elisa,2,"Maximize moves a fitting tile to display 2");
assert.equal(monitorAssignments.apps.notes,2,"Maximize moves a fitting float to display 2 as a usable tile");
assert.equal(sandbox.appState.browser,"open","The existing second-display app remains open");
assert.equal(sandbox.appState.elisa,"open");assert.equal(sandbox.appState.notes,"open");
vm.runInContext('focusTileWindow("dolphin")',sandbox);
assert.equal(monitorAssignments.apps.elisa,1);assert.equal(monitorAssignments.apps.notes,1);
assert.equal(monitorAssignments.apps.browser,2);
assert.equal(vm.runInContext('JSON.stringify(tileSession().floating.notes)',sandbox),floatBeforeTransfer,"Restore returns floats to their exact original rectangle");
vm.runInContext('toggleAppFullscreen("dolphin")',sandbox);
assert.equal(monitorAssignments.apps.elisa,2);assert.equal(sandbox.appState.elisa,"open");
vm.runInContext('releaseBorrowedApp("elisa");closeApp("notes");toggleAppFullscreen("dolphin")',sandbox);
assert.equal(monitorAssignments.apps.elisa,2,"An explicit user decision cancels automatic return");
assert.equal(sandbox.appState.notes,"closed","Restore cannot reopen a peer closed on the second display");
resetMonitors();
sandbox.activeDisplayRoster=()=>[{width:1616,height:1016},{width:450,height:360}];
vm.runInContext('openApp("dolphin");openApp("elisa");openApp("notes");focusTileWindow("dolphin")',sandbox);
assert.equal(monitorAssignments.apps.elisa,1,"An oversized peer stays on its original display");assert.equal(sandbox.appState.elisa,"minimized");
assert.equal(monitorAssignments.apps.notes,2,"A smaller peer may still fit after rejecting a larger one");
vm.runInContext('minimizeApp("dolphin")',sandbox);
assert.equal(monitorAssignments.apps.notes,1,"Parking the maximized owner releases its automatic transfers");
resetMonitors();
sandbox.activeDisplayRoster=()=>[{width:1616,height:1016},{width:900,height:650}];
sandbox.appState.browser="open";
vm.runInContext('tileSessions[intentContextPrefix()+2]={root:tileEngine.leaf("browser"),floating:{browser:{left:8,top:8,width:884,height:634}},parked:{}};openApp("dolphin");openApp("notes");toggleAppFullscreen("dolphin")',sandbox);
assert.equal(monitorAssignments.apps.notes,1,"A pinned float on the peer display reserves its space");assert.equal(sandbox.appState.notes,"minimized");assert.equal(sandbox.appState.browser,"open");
vm.runInContext('toggleAppFullscreen("dolphin")',sandbox);assert.equal(sandbox.appState.notes,"open");
resetMonitors();
vm.runInContext('tileSessions[intentContextPrefix()+2]={root:tileEngine.leaf("browser"),floating:{},parked:{},focus:{name:"browser"}};openApp("dolphin");openApp("notes");focusTileWindow("dolphin")',sandbox);
assert.equal(monitorAssignments.apps.notes,1,"A maximized peer display cannot accept borrowed apps");
console.log("Two-display maximize/full fullscreen: capacity, existing peers, floats, automatic return, user overrides, parking/closing and crowded-display fallback passed.");

resetMonitors();
sandbox.activeDisplayRoster=()=>[{width:1616,height:1016},{width:1400,height:1000}];
vm.runInContext('openApp("dolphin");openApp("notes");focusTileWindow("dolphin")',sandbox);
sandbox.saveLayout=()=>{};sandbox.refreshIntentAreas=()=>{};
vm.runInContext(slice('function transferAppToDisplay(', 'function transferAreaToDisplay('),sandbox);
vm.runInContext('transferAppToDisplay("dolphin",2)',sandbox);
assert.equal(monitorAssignments.apps.dolphin,2,"Moving the maximized owner goes to the requested display");
assert.equal(monitorAssignments.apps.notes,1,"Moving the owner releases automatic peer transfer");
assert.equal(vm.runInContext('tileSession().focus',sandbox),null);
resetMonitors();
vm.runInContext('openApp("dolphin");openApp("notes");toggleAppFullscreen("dolphin");transferAppToDisplay("dolphin",2)',sandbox);
assert.equal(monitorAssignments.apps.notes,1);assert.equal(vm.runInContext('tileSession().fullscreen',sandbox),null);
console.log("Moving a maximized/full-fullscreen owner releases its automatic transfers and temporary mode.");

// Automatic openings follow reading order, independently of the focused tile.
{
  const bounds = {x:0,y:0,width:1000,height:900};
  const minimum = () => ({width:400,height:300});
  let tree = null;
  for (const name of ['first','second','third','fourth']) {
    tree = T.insert(tree,name,'first',null,bounds,minimum);
    const rects = T.layout(tree,bounds).windows;
    if (name === 'second') {
      assert.equal(rects.get('first').height,900);
      assert.equal(rects.get('second').height,900);
      assert(rects.get('first').x < rects.get('second').x);
    }
  }
  const rects = T.layout(tree,bounds).windows;
  assert.equal(rects.get('first').y,rects.get('second').y);
  assert.equal(rects.get('third').y,rects.get('fourth').y);
  assert(rects.get('third').y > rects.get('first').y);
  assert(rects.get('third').x < rects.get('fourth').x);
  console.log('Automatic opening: two vertical halves, left-to-right rows and focus-independent placement passed.');
}

// On wide desktops four windows still prefer 2x2, rather than a long row.
{
  const ids = ['first','second','third','fourth'];
  const minimum = () => ({width:400,height:300});
  const wide = {x:0,y:0,width:2600,height:1000};
  let tree = null;
  for (const id of ids) tree=T.insert(tree,id,'first',null,wide,minimum);
  const rects=T.layout(tree,wide).windows;
  assert.equal(rects.get('first').y,rects.get('second').y);
  assert.equal(rects.get('third').y,rects.get('fourth').y);
  assert(rects.get('third').y>rects.get('first').y);
  assert.equal(rects.get('first').x,rects.get('third').x);
  assert.equal(rects.get('second').x,rects.get('fourth').x);
  const triple=T.layout(T.rowMajor(ids.slice(0,3),wide,minimum),wide).windows;
  assert.equal(triple.get('third').width,wide.width,'Third window uses the bottom row without an empty cell');
  const short={...wide,height:350};
  const fitted=T.fit(T.rowMajor(ids,short,minimum),short,minimum,'fourth');
  assert.equal(fitted.parked.length,0,'A short wide workspace can use one row instead of unnecessarily parking peers');
  assert([...fitted.windows.values()].every(rect=>rect.y===0));
  const manual=T.insert(T.leaf('first'),'second','first','bottom',wide,minimum);
  assert.equal(manual.axis,'y','Explicit user split direction is retained');
  console.log('Preferred 2x2: wide desktops, three-window progression, short-screen fallback and manual direction passed.');
}
