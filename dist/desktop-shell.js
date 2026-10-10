const desktopStorage = globalThis.SpatialGuide?.storage || globalThis.localStorage;
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const desktopPreset = desktopStorage.getItem(SpatialWorkspaceSetup.presetKey) || (globalThis.SpatialGuide?.model.active() ? 'clean' : 'demo');
if (desktopPreset === 'demo') { try { SpatialDemoExamples.seedWorkspaces(desktopStorage); } catch {} }

const toggleControlSelector = [
  "[aria-pressed]",
  "[aria-selected]",
  "[aria-checked]",
  ".nav-choice",
  "[data-open-app]",
  "[data-toggle]",
  ".folder-tab",
  ".play-toggle",
  "#timerToggle",
  "#allAppsToggle",
  "[data-project-mode]",
  "[data-workspace]",
  "[data-package-mode]",
  "[data-overview-view]",
  "[data-category-filter]",
  "[data-overview-project]",
  "#layoutModeToggle",
  "[data-window-action=\"maximize\"]"
].join(",");

const materialControlSelector = [
  ".surface-key",
  ".quick-toggle",
  ".folder-tab",
  ".app-key",
  ".dismiss-button",
  ".workspace-tab",
  ".workspace-action",
  ".overview-view-tab",
  ".overview-task",
  ".overview-window",
  ".launcher-category",
  ".areas-reset",
  ".overview-area-row > button",
  ".package-mode-switch > button",
  ".package-secondary",
  ".package-primary",
  ".project-path",
  ".system-launcher",
  ".overview-launch",
  ".workspace-status",
  ".overview-close",
  ".workspace-home-open"
].join(",");

const glassMaterialSurfaceSelector = [
  ".area-window",
  ".universal-search",
  ".mini-card",
  ".system-widget",
  ".overview-widget",
  ".workspace-switcher",
  ".workspace-home-card",
  ".overview-app-library",
  ".project-module",
  ".desktop-context-menu",
  ".all-apps-drawer",
  ".project-editor-window",
  ".package-window",
  ".notification-peek",
  ".toast",
  ".desktop-context-header",
  ".app-frame .recessed-field"
].join(",");

const absMaterialSurfaceSelector = [
  ".app-frame"
].join(",");

const materialFieldSelector = [
  ".recessed-field",
  ".universal-search-field",
  ".project-resource-form label",
  ".all-apps-search",
  ".mini-command",
  ".mini-browser-search",
  "input[type=range]",
  "input:not([type=range]):not([type=checkbox]):not([type=radio])",
  "textarea",
  "select"
].join(",");

const materialElementSelector = [
  ".app-badge",
  ".area-window-icon:not(button)",
  ".area-list-icon",
  ".universal-symbol",
  ".universal-file-icon",
  ".overview-project-icon",
  ".workspace-home-icon",
  ".workspace-glyph",
  ".project-choice-icon",
  ".session-toggle-icon",
  ".phone-silhouette",
  ".safety-shield",
  ".import-file-icon"
].join(",");

function matchingNodes(root, selector) {
  const nodes = root?.matches?.(selector) ? [root] : [];
  return nodes.concat(root?.querySelectorAll ? [...root.querySelectorAll(selector)] : []);
}

function prepareMaterialSurfaces(root = document) {
  matchingNodes(root, glassMaterialSurfaceSelector).forEach(surface => {
    surface.classList.add("material-surface-glass");
    surface.classList.remove("material-surface-abs");
  });
  matchingNodes(root, absMaterialSurfaceSelector).forEach(surface => {
    surface.classList.add("material-surface-abs");
    surface.classList.remove("material-surface-glass");
  });
  /* App windows are primarily ABS. Only small display-like inserts are glass,
     so a whole toolbar never changes material just because it contains one. */
  matchingNodes(root, ".app-frame .recessed-field").forEach(surface => {
    surface.classList.add("material-surface-glass");
    surface.classList.remove("material-surface-abs");
  });
  /* Sliders are physical controls, not glass display inserts. Clear the old
     range-only override and inherit ABS from the app or glass from its host. */
  matchingNodes(root, ".app-frame input[type=range]").forEach(range => {
    range.classList.remove("material-surface-glass");
  });
}

function nearestMaterialSurface(element) {
  return element.closest(".material-surface-glass,.material-surface-abs");
}

function applyControlMaterial(button) {
  const surface = nearestMaterialSurface(button);
  const glass = surface?.classList.contains("material-surface-glass");
  const abs = surface?.classList.contains("material-surface-abs");
  button.classList.toggle("material-glass-button", Boolean(glass));
  button.classList.toggle("material-abs-button", Boolean(abs));
}

function applyFieldMaterial(field) {
  const surface = nearestMaterialSurface(field);
  const glass = surface?.classList.contains("material-surface-glass");
  const abs = surface?.classList.contains("material-surface-abs");
  field.classList.toggle("material-glass-field", Boolean(glass));
  field.classList.toggle("material-abs-field", Boolean(abs));
}

function updateRangeLight(range) {
  const min = Number(range.min || 0);
  const max = Number(range.max || 100);
  const value = Number(range.value);
  const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  range.style.setProperty("--range-progress", (ratio * 100).toFixed(3) + "%");
}

function applyElementMaterial(element) {
  const surface = nearestMaterialSurface(element);
  const glass = surface?.classList.contains("material-surface-glass");
  const abs = surface?.classList.contains("material-surface-abs");
  element.classList.toggle("material-glass-element", Boolean(glass));
  element.classList.toggle("material-abs-element", Boolean(abs));
}

function prepareControlSemantics(root = document) {
  prepareMaterialSurfaces(root);
  const buttons = matchingNodes(root, "button");
  buttons.forEach(button => {
    applyControlMaterial(button);
    const toggle = button.matches(toggleControlSelector);
    const managed = toggle || button.matches(materialControlSelector);
    if (!managed) return;
    button.classList.toggle("control-toggle", toggle);
    button.classList.toggle("control-push", !toggle);
    if (button.matches(".play-toggle")) {
      button.classList.toggle("is-active", musicPlaying);
      button.setAttribute("aria-pressed", String(musicPlaying));
      return;
    }
    if (toggle && !button.hasAttribute("aria-pressed") && !button.hasAttribute("aria-selected") && !button.hasAttribute("aria-checked")) {
      button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
    }
  });
  matchingNodes(root, materialFieldSelector).forEach(applyFieldMaterial);
  matchingNodes(root, "input[type=range]").forEach(range => {
    updateRangeLight(range);
    if (range.dataset.rangeLightBound) return;
    range.dataset.rangeLightBound = "true";
    range.addEventListener("input", () => updateRangeLight(range));
  });
  matchingNodes(root, materialElementSelector).forEach(applyElementMaterial);
}

function observeMaterialInheritance() {
  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) prepareControlSemantics(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

const appInfo = {
  dolphin: { label: "Dolphin", icon: "i-folder", tone: "blue", primary: "#2a9fff", detail: "Downloads" },
  elisa: { label: "Elisa", icon: "i-music", tone: "violet", primary: "#a483ff", detail: "Evening Light" },
  browser: { label: "Web", icon: "i-web", tone: "cyan", primary: "#55d8e9", detail: "Start page" },
  terminal: { label: "Konsole", icon: "i-terminal", tone: "green", primary: "#64d782", detail: "demo@desktop" },
  notes: { label: "Notes", icon: "i-note", tone: "amber", primary: "#ffb553", detail: "Meeting notes" }
};

const appState = desktopPreset === 'demo' ? { ...SpatialDemoExamples.scenarios.general.apps } : Object.fromEntries(Object.keys(appInfo).map(id => [id,'closed']));
const appMaximizedState = { dolphin: false, elisa: false, browser: false, terminal: false, notes: false };
const windowGeometry = new Map();
const autoTiledWindows = new Set();
const maximizeRestore = new Map();
let frontApp = "dolphin";
let desktopHasWindowFocus = true;
const desktopPages = SpatialDesktopPages.create(readDesktopStorage("spatial-desktop-pages-v1"));
const desktopWheel = SpatialDesktopPages.wheelGate();
const desktopColumnWheel = SpatialDesktopPages.wheelGate();
let desktopPageAnimating = false;
let zCounter = 20;
let toastTimer;
let musicPlaying = true;
let musicPosition = 115;
let musicTimer;
let focusSeconds = 25 * 60;
let focusRunning = false;
let focusTimer;
let notificationPeekTimer;
let notificationPeekAttentionTimer;
let notificationAttentionTimer;
let noteDraft = "";
let terminalPreview = "Ready for a command";
let cursorBusyTimer;

function pulseBusyCursor(duration = 700) {
  clearTimeout(cursorBusyTimer);
  document.body.classList.add("cursor-busy");
  window.dispatchEvent(new CustomEvent("material-cursor-mode"));
  cursorBusyTimer = setTimeout(() => {
    document.body.classList.remove("cursor-busy");
    window.dispatchEvent(new CustomEvent("material-cursor-mode"));
  }, duration);
}

function icon(name) {
  return '<svg aria-hidden="true"><use href="#' + name + '"/></svg>';
}

function appArt(name, extraClass = "") {
  return '<svg class="app-art ' + extraClass + '" aria-hidden="true"><use href="#app-' + (appInfo[name]?.base || name) + '"/></svg>';
}

function applyAppPrimaryColors(root = document) {
  Object.entries(appInfo).forEach(([name, info]) => {
    const selector = '[data-app-frame="' + name + '"],[data-open-app="' + name + '"],[data-mini-card="' + name + '"]';
    const elements = root.matches?.(selector) ? [root, ...$$(selector, root)] : $$(selector, root);
    elements.forEach(element => element.style.setProperty("--app-primary", info.primary));
  });
}

function hydrateAppArtwork() {
  $$('[data-app-frame]').forEach(frame => {
    const name = frame.dataset.appFrame;
    const badge = $('.app-titlebar .app-badge', frame);
    if (badge && appInfo[name]) badge.innerHTML = appArt(name, "app-art-compact");
  });

  $$('.notification', $('#notificationList')).forEach(notification => {
    const title = $('b', notification)?.textContent || "";
    const name = title.includes("Elisa") ? "elisa" : title.includes("Download") ? "dolphin" : "";
    const badge = $('.app-badge', notification);
    if (badge && name) {
      notification.dataset.appOrigin = name;
      notification.style.setProperty("--app-primary", appInfo[name].primary);
      badge.innerHTML = appArt(name, "app-art-compact");
    }
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function showToast(message, { duration = 1600, projectSwitch = false } = {}) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("is-project-switch", projectSwitch);
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), duration);
}

function frameFor(name) {
  return document.querySelector('[data-app-frame="' + name + '"]');
}

/* Content limits rather than generic window-manager minimums. Each app
   switches to a compact internal layout at this footprint, while keeping its
   primary controls and content usable. */
const windowUsableSizes = {
  dolphin: { width: 440, height: 340 },
  elisa: { width: 460, height: 360 },
  browser: { width: 420, height: 320 },
  terminal: { width: 390, height: 300 },
  notes: { width: 400, height: 300 }
};

function minimumUsableWindowSize(name) {
  return windowUsableSizes[appInfo[name]?.base || name] || { width: 400, height: 300 };
}

function workspaceBounds() {
  const element = $(".workspace-zone");
  return { element, rect: element.getBoundingClientRect(), width: element.clientWidth, height: element.clientHeight };
}

function readGeometry(frame) {
  const workspace = workspaceBounds();
  const rect = frame.getBoundingClientRect();
  return { x: rect.left - workspace.rect.left, y: rect.top - workspace.rect.top, width: rect.width, height: rect.height };
}

function clampGeometry(geometry, name = null) {
  const workspace = workspaceBounds();
  const usable = minimumUsableWindowSize(name);
  const maximumWidth = Math.max(1, workspace.width - 16);
  const maximumHeight = Math.max(1, workspace.height - 16);
  /* A tiled window must obey the tile it was given. Applying the normal app
     minimum here used to enlarge narrow cells after layout, making windows
     overlap and disappear behind the Areas. App container layouts provide a
  compact presentation for these deliberately small tiles. */
  const isAutoTile = name && autoTiledWindows.has(name);
  const minWidth = Math.min(isAutoTile ? Math.max(1, geometry.width) : usable.width, maximumWidth);
  const minHeight = Math.min(isAutoTile ? Math.max(1, geometry.height) : usable.height, maximumHeight);
  const width = Math.max(minWidth, Math.min(geometry.width, maximumWidth));
  const height = Math.max(minHeight, Math.min(geometry.height, maximumHeight));
  return {
    x: Math.max(8, Math.min(geometry.x, workspace.width - width - 8)),
    y: Math.max(8, Math.min(geometry.y, workspace.height - height - 8)),
    width,
    height
  };
}

function applyGeometry(name, geometry, save = true) {
  const frame = frameFor(name);
  const next = clampGeometry(geometry, name);
  frame.style.left = next.x + "px";
  frame.style.top = next.y + "px";
  frame.style.width = next.width + "px";
  frame.style.height = next.height + "px";
  if (save) {
    windowGeometry.set(name, next);
    saveLayout();
  }
  return next;
}

function saveLayout() {
  try {
    const layouts = JSON.parse(desktopStorage.getItem("spatial-workspace-window-layouts-v1") || "{}");
    layouts[activeWorkspace] = Object.fromEntries(windowGeometry);
    desktopStorage.setItem("spatial-workspace-window-layouts-v1", JSON.stringify(layouts));
  } catch {}
  scheduleHotbarOrder();
}

function loadLayout(workspaceName = activeWorkspace) {
  windowGeometry.clear();
  try {
    const layouts = JSON.parse(desktopStorage.getItem("spatial-workspace-window-layouts-v1") || "{}");
    let layout = layouts[workspaceName];
    if (!layout && workspaceName === "general") {
      layout = JSON.parse(desktopStorage.getItem("spatial-desktop-layout-v3") || "{}");
    }
    layout ||= {};
    Object.entries(layout).forEach(([name, geometry]) => {
      if (appInfo[name] && geometry && Number.isFinite(geometry.x)) {
        windowGeometry.set(name, geometry);
      }
    });
  } catch {}
}

function defaultWindowGeometry(name, index = 0) {
  const workspace = workspaceBounds();
  const presets = {
    dolphin: { x: .03, y: .04, width: .78, height: .78 },
    elisa: { x: .24, y: .23, width: .73, height: .72 },
    browser: { x: .09, y: .11, width: .76, height: .74 },
    terminal: { x: .18, y: .16, width: .68, height: .62 },
    notes: { x: .34, y: .10, width: .52, height: .68 }
  };
  const preset = presets[name] || { x: .08 + index * .04, y: .08 + index * .04, width: .72, height: .70 };
  return {
    x: workspace.width * preset.x,
    y: workspace.height * preset.y,
    width: workspace.width * preset.width,
    height: workspace.height * preset.height
  };
}

function fittedWindowLayout(names) {
  const workspace = workspaceBounds();
  const inset = 8;
  const gap = 10;
  const availableWidth = Math.max(0, workspace.width - inset * 2);
  const availableHeight = Math.max(0, workspace.height - inset * 2);
  if (!names.length) return null;

  /* Try every sensible column count and choose the partition that preserves
     each app's usable footprint best. Every candidate still fills the exact
     workspace; the score only decides whether that space is divided more
     naturally into rows or columns. The incomplete final row expands across
     the width, which gives the newly opened (last) window a useful tile. */
  let best = null;
  for (let columns = 1; columns <= names.length; columns += 1) {
    const rows = Math.ceil(names.length / columns);
    const rowHeight = (availableHeight - gap * Math.max(0, rows - 1)) / rows;
    if (rowHeight <= 0) continue;
    const geometries = new Map();
    const fits = [];
    const aspectPenalties = [];
    for (let row = 0; row < rows; row += 1) {
      const start = row * columns;
      const rowNames = names.slice(start, start + columns);
      const cellWidth = (availableWidth - gap * Math.max(0, rowNames.length - 1)) / rowNames.length;
      rowNames.forEach((name, column) => {
        const usable = minimumUsableWindowSize(name);
        const widthFit = Math.min(1, cellWidth / usable.width);
        const heightFit = Math.min(1, rowHeight / usable.height);
        fits.push(widthFit * heightFit);
        aspectPenalties.push(Math.abs(Math.log((cellWidth / Math.max(1, rowHeight)) / 1.42)));
        geometries.set(name, {
          x: Math.round(inset + column * (cellWidth + gap)),
          y: Math.round(inset + row * (rowHeight + gap)),
          width: Math.round(cellWidth),
          height: Math.round(rowHeight)
        });
      });
    }
    const minimumFit = Math.min(...fits);
    const averageFit = fits.reduce((sum, value) => sum + value, 0) / fits.length;
    const aspectPenalty = aspectPenalties.reduce((sum, value) => sum + value, 0) / aspectPenalties.length;
    const score = minimumFit * 1000 + averageFit * 120 - aspectPenalty * 10 - rows * .05;
    if (!best || score > best.score) best = { score, geometries };
  }
  return best?.geometries || null;
}

/* Trellis-inspired nested splitting, with bounded space instead of zoom.
   The existing ABS windows stay mounted; overflow becomes a live Apps card. */
const tileEngine = window.SpatialTiling;
let tileSessions = {};
try { tileSessions = JSON.parse(desktopStorage.getItem("spatial-split-layouts-v1") || "{}"); } catch {}
let tileRendering = false;
let tileInteraction = false;
let manualWindowInteraction = false;
let activeDesktopDrag = null;
let tileLayoutFrame = 0;
let tileDropPreview = null;
let lastTileContext = "";
let intentAreaPlan = { moves: {}, rails: {}, overlays: {}, hidden: {}, canvas: {} };
let applyingIntentAreas = false;

function tileContextKey() {
  return desktopPages.context(activeWorkspace) + localDisplaySlot();
}

function tileSession() {
  const key = tileContextKey();
  tileSessions[key] ||= { root: null, parked: {}, focus: null };
  const session = tileSessions[key];
  session.parked ||= {};
  session.floating ||= {};
  return session;
}

function tileBounds() {
  const workspace = workspaceBounds();
  return { x: 8, y: 8, width: Math.max(1, workspace.width - 16), height: Math.max(1, workspace.height - 16) };
}

function saveTileSessions() {
  try { desktopStorage.setItem("spatial-split-layouts-v1", JSON.stringify(tileSessions)); } catch {}
}

function tilePriority(name) { return Number(frameFor(name)?.style.zIndex || 0); }

function fitDesktopTiles(root = tileSession().root, preferredName = frontApp) {
  const session = tileSession();
  const workspace = workspaceBounds();
  // Float coordinates belong to the monitor; tile coordinates belong to the
  // workspace between Areas. Only visible floats on this monitor reserve space.
  const obstacles = session.fullscreen ? [] : Object.entries(session.floating)
    .filter(([name]) => appState[name] === "open" && isLocalApp(name) && name !== activeDesktopDrag?.name)
    .map(([,rect]) => ({x:rect.left-workspace.rect.left, y:rect.top-workspace.rect.top, width:rect.width, height:rect.height}));
  return tileEngine.fitAvoiding(root, tileBounds(), minimumUsableWindowSize, preferredName, tilePriority, obstacles);
}

function reconcileTileTree(preferredName = frontApp) {
  const session = tileSession();
  const open = Object.keys(appState).filter(name => appState[name] === "open" && isLocalApp(name) && !session.floating[name] && name !== activeDesktopDrag?.name);
  session.root = tileEngine.normalize(session.root, open);
  open.forEach(name => {
    if (tileEngine.contains(session.root, name)) return;
    session.root = tileEngine.insert(session.root, name, preferredName, null, tileBounds(), minimumUsableWindowSize, fitDesktopTiles(session.root,preferredName).windows);
  });
  return session;
}

function parkTileWindows(names, reason, announce = true) {
  const session = tileSession();
  const parked = names.filter(name => appState[name] === "open" && isLocalApp(name));
  parked.forEach(name => {
    const frame = frameFor(name);
    windowGeometry.set(name, readGeometry(frame));
    session.parked[name] = { reason, target: frontApp };
    appState[name] = "minimized";
    appMaximizedState[name] = false;
    frame.classList.remove("is-maximized", "is-tiled");
    delete frame.dataset.maximized;
    autoWindowAvoidance.delete(name);
    autoTiledWindows.delete(name);
    syncMaximizeButton(frame);
  });
  if (parked.length) {
    syncApps();
    if (announce) showToast(parked.map(name => appInfo[name].label).join(", ") + " parked in Apps · still running");
    queueDesktopStateBroadcast();
  }
  return parked;
}

// A maximized window borrows the other display without displacing its apps.
// Capacity uses the actual split fitter, dock lanes and pinned float obstacles.
function moveCoveredApps(session, mode, names) {
  if (!extendedDesktopActive()) return;
  const target = otherDisplaySlot(), prefix = intentContextPrefix();
  const peer = tileSessions[prefix + target] ||= { root:null, parked:{}, floating:{}, focus:null };
  if (peer.focus || peer.fullscreen) return;
  const assignments = displayAssignmentsFor(), display = activeDisplayRoster()[target - 1];
  if (!display) return;
  const lanes = {left:0,right:0,top:0,bottom:0};
  areaPriority.forEach(name => {
    const area = areaFor(name);
    if (!area || area.hidden) return;
    const saved = Number(assignments.areas[name] || 1), actual = Number(intentAreaPlan.moves[name] || saved);
    if (saved !== target && actual !== target) return;
    const edge = dockState[name].edge;
    const rail = area.dataset.areaState === "rail" || intentAreaPlan.rails[name];
    const size = rail ? 70 : Math.max(dockSizes[edge], edge === "left" || edge === "right" ? stateSideMinimum(name,"expanded") : stateHorizontalMinimum(name,"expanded"));
    lanes[edge] = Math.max(lanes[edge], size);
  });
  const origin = {left:8+(lanes.left ? lanes.left+8 : 0),top:8+(lanes.top ? lanes.top+8 : 0)};
  const bounds = {x:8,y:8,width:Math.max(1,display.width-origin.left-8-(lanes.right ? lanes.right+8 : 0)-16),height:Math.max(1,display.height-origin.top-8-(lanes.bottom ? lanes.bottom+8 : 0)-16)};
  const open = Object.keys(appState).filter(name => appState[name] === "open" && desktopPages.visible(activeWorkspace,name) && Number(assignments.apps[name] || 1) === target);
  const floats = peer.floating || {};
  const obstacles = open.filter(name=>floats[name]).map(name=>({x:floats[name].left-origin.left,y:floats[name].top-origin.top,width:floats[name].width,height:floats[name].height}));
  let root = tileEngine.normalize(peer.root,open.filter(name=>!floats[name]));
  open.filter(name=>!floats[name] && !tileEngine.contains(root,name)).forEach(name=>{root=tileEngine.insert(root,name,tileEngine.names(root).at(-1),null,bounds,minimumUsableWindowSize);});
  mode.transferred ||= {};
  names.forEach(name => {
    const candidate = tileEngine.insert(root,name,tileEngine.names(root).at(-1),null,bounds,minimumUsableWindowSize);
    const fitted = tileEngine.fitAvoiding(candidate,bounds,minimumUsableWindowSize,name,tilePriority,obstacles);
    if (fitted.parked.length || !fitted.windows.has(name) || [...fitted.windows].some(([id,rect])=>rect.width < minimumUsableWindowSize(id).width-1 || rect.height < minimumUsableWindowSize(id).height-1)) return;
    mode.transferred[name] = {source:localDisplaySlot(),target,floating:session.floating[name] ? {...session.floating[name]} : null};
    delete session.floating[name];
    session.root = tileEngine.remove(session.root,name);
    assignments.apps[name] = target;
    appMaximizedState[name] = false;
    root = fitted.node;
  });
  peer.root = root;
  persistDisplayAssignments();
}

function releaseBorrowedApp(name) {
  // A deliberate app action takes ownership from any automatic transfer.
  Object.values(tileSessions).forEach(session=>[session.focus,session.fullscreen].forEach(mode=>{if(mode?.transferred) delete mode.transferred[name];}));
}

function returnCoveredApps(session, mode) {
  if (!mode) return;
  const assignments = displayAssignmentsFor(), prefix = intentContextPrefix();
  Object.entries(mode.transferred || {}).forEach(([name,record])=>{
    if (appState[name] !== "open" || !desktopPages.visible(activeWorkspace,name) || Number(assignments.apps[name]) !== record.target) return;
    const peer = tileSessions[prefix+record.target];
    if (peer) {peer.root=tileEngine.remove(peer.root,name);delete peer.floating?.[name];}
    assignments.apps[name]=record.source;
    if(record.floating) session.floating[name]=record.floating;
  });
  if (Object.keys(mode.transferred || {}).length) persistDisplayAssignments();
}

function leaveTileFocus(session, restoreParked = false) {
  const focus = session.focus;
  if (!focus) return;
  session.focus = null;
  returnCoveredApps(session,focus);
  if (restoreParked) focus.parked.forEach(name=>{
    if(appState[name] !== "minimized" || !isLocalApp(name)) return;
    appState[name]="open";delete session.parked[name];
  });
}

function parkFullscreenPeers(session) {
  const fullscreen = session.fullscreen;
  if (!fullscreen || appState[fullscreen.name] !== "open") return;
  fullscreen.root ??= tileEngine.copy(session.root);
  fullscreen.parked ||= [];
  const peers = Object.keys(appState).filter(name => name !== fullscreen.name && appState[name] === "open" && isLocalApp(name));
  moveCoveredApps(session, fullscreen, peers);
  const parked = parkTileWindows(peers, "Full fullscreen · " + appInfo[fullscreen.name].label, false);
  parked.forEach(name => {
    session.parked[name].fullscreen = fullscreen.name;
    session.root = tileEngine.remove(session.root, name);
    if (!fullscreen.parked.includes(name)) fullscreen.parked.push(name);
  });
}

function leaveAppFullscreen(session = tileSession()) {
  const fullscreen = session.fullscreen;
  if (!fullscreen) return;
  session.fullscreen = null;
  returnCoveredApps(session, fullscreen);
  (fullscreen.parked || []).forEach(name => {
    // Only revive windows parked by this fullscreen, never closed apps or
    // cards the user subsequently moved to another monitor/session.
    if (appState[name] !== "minimized" || !isLocalApp(name) || session.parked[name]?.fullscreen !== fullscreen.name) return;
    appState[name] = "open";
    delete session.parked[name];
  });
  if (fullscreen.root) session.root = tileEngine.normalize(fullscreen.root,
    Object.keys(appState).filter(name => appState[name] === "open" && isLocalApp(name) && !session.floating[name]));
  const frame = frameFor(fullscreen.name);
  frame?.classList.remove("is-fullscreen", "is-maximized");
  if (frame) delete frame.dataset.maximized;
  appMaximizedState[fullscreen.name] = false;
  syncApps();
}

// Subtract opaque foreground windows from the visible portion of a window.
// Several overlapping windows can jointly cover it; a partially visible
// window stays open. This deliberately ignores Overview and other overlays.
function subtractWindowRect(rect, cover) {
  const left = Math.max(rect.left, cover.left), top = Math.max(rect.top, cover.top);
  const right = Math.min(rect.right, cover.right), bottom = Math.min(rect.bottom, cover.bottom);
  if (right <= left || bottom <= top) return [rect];
  return [
    { left: rect.left, top: rect.top, right: rect.right, bottom: top },
    { left: rect.left, top: bottom, right: rect.right, bottom: rect.bottom },
    { left: rect.left, top, right: left, bottom },
    { left: right, top, right: rect.right, bottom }
  ].filter(part => part.right > part.left && part.bottom > part.top);
}

function minimizeInvisibleWindows() {
  if (tileInteraction || tileRendering) return;
  const session = tileSession();
  const workspace = workspaceBounds();
  const viewport = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  const windows = Object.keys(appState).filter(name => appState[name] === "open" && isLocalApp(name))
    .map(name => {
      const frame = frameFor(name), bounds = frame.getBoundingClientRect();
      const floating = Boolean(session.floating[name] || session.fullscreen?.name === name);
      const clip = floating ? viewport : {
        left: Math.max(0, workspace.rect.left), top: Math.max(0, workspace.rect.top),
        right: Math.min(viewport.right, workspace.rect.left + workspace.width),
        bottom: Math.min(viewport.bottom, workspace.rect.top + workspace.height)
      };
      return { name, frame, z: Number(getComputedStyle(frame).zIndex) || 0, rect: {
        left: Math.max(bounds.left, clip.left), top: Math.max(bounds.top, clip.top),
        right: Math.min(bounds.left + bounds.width, clip.right), bottom: Math.min(bounds.top + bounds.height, clip.bottom)
      }};
    }).sort((a, b) => b.z - a.z);
  const covers = [], invisible = [];
  windows.forEach(({ name, rect }) => {
    let visible = rect.right > rect.left && rect.bottom > rect.top ? [rect] : [];
    covers.forEach(cover => { visible = visible.flatMap(part => subtractWindowRect(part, cover)); });
    if (!visible.length) invisible.push(name);
    else covers.push(rect);
  });
  if (!invisible.length) return;
  const parked = parkTileWindows(invisible, "Covered by another window", false);
  parked.forEach(name => {
    session.root = tileEngine.remove(session.root, name);
    if (session.focus && !session.focus.parked.includes(name)) session.focus.parked.push(name);
  });
  saveTileSessions();
  scheduleWindowTiling();
}

let windowVisibilityFrame = 0;
function scheduleWindowVisibility() {
  if (windowVisibilityFrame) return;
  windowVisibilityFrame = requestAnimationFrame(() => {
    windowVisibilityFrame = 0;
    if (!windowViewportLockReady || desktopPageAnimating || tileInteraction || tileRendering || tileLayoutFrame) return;
    // Check settled geometry, not the intermediate overlap of animated tiles.
    if ($$(".app-frame.is-auto-tiling").length) {
      setTimeout(scheduleWindowVisibility, 160);
      return;
    }
    minimizeInvisibleWindows();
  });
}

function renderTileLayout(preferredName = frontApp, announce = false, animate = false) {
  // A held manual gesture owns its screen geometry. Retile neighbours once
  // on release, rather than parking them against a moving obstacle.
  if (tileRendering || (manualWindowInteraction && !activeDesktopDrag?.switching)) return;
  tileRendering = true;
  try {
    parkFullscreenPeers(tileSession());
    const session = reconcileTileTree(preferredName);
    renderFloatingWindows(session);
    $$(".tile-will-park").forEach(frame => frame.classList.remove("tile-will-park"));
    $(".tile-pressure-hint")?.remove();
    const key = tileContextKey();
    if (key !== lastTileContext) {
      autoTiledWindows.clear();
      lastTileContext = key;
    }
    const fitted = fitDesktopTiles(session.root, preferredName);
    session.root = fitted.node;
    parkTileWindows(fitted.parked, "Made room for " + (appInfo[preferredName]?.label || "a window"), announce);
    fitted.windows.forEach((rect, name) => {
      const frame = frameFor(name);
      if (!frame || frame.classList.contains("is-dragging") || session.fullscreen?.name === name) return;
      const workspaceElement = $(".workspace-zone");
      if (workspaceElement && frame.parentElement !== workspaceElement) workspaceElement.append(frame);
      autoTiledWindows.add(name);
      frame.classList.add("is-tiled");
      const focused = session.focus?.name === name;
      frame.classList.toggle("is-maximized", focused);
      appMaximizedState[name] = focused;
      if (focused) frame.dataset.maximized = "true";
      else delete frame.dataset.maximized;
      syncMaximizeButton(frame);
      if (animate && !tileInteraction) {
        frame.classList.add("is-auto-tiling");
        setTimeout(() => frame.classList.remove("is-auto-tiling"), 120);
      }
      const geometry = applyGeometry(name, rect, false);
      windowGeometry.set(name, geometry);
    });
    renderTileDividers(fitted.splits);
    if (session.fullscreen && appState[session.fullscreen.name] === "open") renderFullscreenWindow(session.fullscreen.name);
    saveLayout();
    saveTileSessions();
  } finally { tileRendering = false; scheduleWindowVisibility(); }
}

function tileOpenWindows(newName) {
  const session = tileSession();
  if (newName) {
    /* Opening a card is an explicit request to bring it back, not to revive
       every card that was pushed out by an earlier focus action. */
    leaveTileFocus(session);
    $$('[data-app-frame]').forEach(frame => {
      if (!frame.classList.contains("is-tiled")) return;
      delete frame.dataset.maximized;
      frame.classList.remove("is-maximized");
      appMaximizedState[frame.dataset.appFrame] = false;
      syncMaximizeButton(frame);
    });
    delete session.parked[newName];
  }
  renderTileLayout(newName || frontApp, true, true);
}

function scheduleWindowTiling(name = frontApp) {
  if (tileRendering || tileInteraction) return;
  cancelAnimationFrame(tileLayoutFrame);
  tileLayoutFrame = requestAnimationFrame(() => {
    if (tileInteraction) { tileLayoutFrame = 0; return; }
    tileLayoutFrame = requestAnimationFrame(() => {
      tileLayoutFrame = 0;
      if (tileInteraction) return;
      renderTileLayout(appState[name] === "open" ? name : frontApp);
    });
  });
}

function splitWindowIntoTile(name, point = null, preferredTarget = frontApp) {
  const session = tileSession();
  delete session.floating[name];
  frameFor(name)?.classList.remove("is-floating");
  if (session.fullscreen?.name === name) session.fullscreen = null;
  const target = tileDropTarget(name, point);
  leaveTileFocus(session);
  const clearRects = fitDesktopTiles(tileEngine.remove(session.root,name),preferredTarget).windows;
  session.root = tileEngine.insert(session.root, name, target?.name || preferredTarget, target?.side, tileBounds(), minimumUsableWindowSize, clearRects);
  delete session.parked[name];
  tileOpenWindows(name);
  refreshIntentAreas();
}

function tileDropTarget(name, point) {
  if (!point) return null;
  const workspace = workspaceBounds();
  const x = point.x - workspace.rect.left, y = point.y - workspace.rect.top;
  const rects = fitDesktopTiles().windows;
  let target = null;
  rects.forEach((rect, other) => {
    if (other === name || x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height) return;
    const nx = (x - rect.x) / rect.width, ny = (y - rect.y) / rect.height;
    const edges = [["left", nx], ["right", 1 - nx], ["top", ny], ["bottom", 1 - ny]].sort((a, b) => a[1] - b[1]);
    target = { name: other, side: edges[0][0], rect };
  });
  return target;
}

function showTileDropPreview(name, point) {
  const target = tileDropTarget(name, point);
  if (!tileDropPreview) {
    tileDropPreview = document.createElement("div");
    tileDropPreview.className = "tile-drop-preview";
    tileDropPreview.setAttribute("aria-hidden", "true");
    $(".workspace-zone").append(tileDropPreview);
  }
  tileDropPreview.hidden = !target;
  if (!target) return;
  const rect = { ...target.rect };
  if (target.side === "left" || target.side === "right") {
    rect.width = (rect.width - tileEngine.gap) / 2;
    if (target.side === "right") rect.x += rect.width + tileEngine.gap;
  } else {
    rect.height = (rect.height - tileEngine.gap) / 2;
    if (target.side === "bottom") rect.y += rect.height + tileEngine.gap;
  }
  Object.assign(tileDropPreview.style, { left: rect.x + "px", top: rect.y + "px", width: rect.width + "px", height: rect.height + "px", "--tile-accent": appInfo[name].primary });
  tileDropPreview.textContent = "Place " + appInfo[name].label + " " + ({ left: "to the left", right: "to the right", top: "above", bottom: "below" }[target.side]);
}

function clearTileDropPreview() { if (tileDropPreview) tileDropPreview.hidden = true; }

function renderTileDividers(splits) {
  if (tileInteraction) return;
  $$(".tile-divider").forEach(element => element.remove());
  splits.forEach(split => {
    const divider = document.createElement("div");
    divider.className = "tile-divider tile-divider-" + split.axis;
    divider.dataset.cursor = split.axis === "x" ? "ew-resize" : "ns-resize";
    divider.tabIndex = 0;
    divider.setAttribute("role", "separator");
    divider.setAttribute("aria-orientation", split.axis === "x" ? "vertical" : "horizontal");
    divider.setAttribute("aria-label", "Resize adjacent windows · push further to park one in Apps");
    divider.setAttribute("aria-valuemin", "0");
    divider.setAttribute("aria-valuemax", "100");
    divider.setAttribute("aria-valuenow", String(Math.round(tileEngine.at(tileSession().root, split.path).ratio * 100)));
    divider.title = "Drag to resize · keep pushing to park a window in Apps";
    const vertical = split.axis === "x";
    Object.assign(divider.style, { left: (vertical ? split.coordinate - 4 : split.bounds.x) + "px", top: (vertical ? split.bounds.y : split.coordinate - 4) + "px", width: (vertical ? 8 : split.bounds.width) + "px", height: (vertical ? split.bounds.height : 8) + "px" });
    divider.addEventListener("pointerdown", event => beginTileDividerResize(event, split, divider));
    divider.addEventListener("keydown", event => {
      const direction = vertical ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
      if (!direction[event.key]) return;
      event.preventDefault();
      const session = tileSession(), node = tileEngine.at(session.root, split.path);
      const step = direction[event.key] * (event.shiftKey ? .1 : .025);
      const protectedName = tileEngine.names(step > 0 ? node.a : node.b)[0];
      node.ratio = Math.max(.001, Math.min(.999, node.ratio + step));
      renderTileLayout(protectedName, true);
    });
    $(".workspace-zone").append(divider);
  });
}

function beginTileDividerResize(event, split, divider) {
  if (event.button !== 0) return;
  event.preventDefault();
  const session = tileSession(), startTree = tileEngine.copy(session.root);
  const axis = split.axis === "x" ? "clientX" : "clientY";
  const extent = split.bounds[split.axis === "x" ? "width" : "height"] - tileEngine.gap;
  const start = event[axis], initialRatio = tileEngine.at(startTree, split.path).ratio;
  const initialNames = tileEngine.names(startTree);
  let protectedName = frontApp;
  tileInteraction = true;
  divider.setPointerCapture(event.pointerId);
  divider.classList.add("is-resizing");
  $$(".app-frame").forEach(frame => frame.classList.remove("is-auto-tiling"));
  const move = next => {
    const root = tileEngine.copy(startTree), node = tileEngine.at(root, split.path);
    const delta = next[axis] - start;
    node.ratio = Math.max(.001, Math.min(.999, initialRatio + delta / Math.max(1, extent)));
    protectedName = tileEngine.names(delta >= 0 ? node.a : node.b)[0];
    session.root = root;
    /* Preserve all start nodes until release so reversing a drag restores the
       squeezed neighbour. Release commits parking rather than tiny windows. */
    previewTilePressure(root, protectedName);
  };
  const finish = () => {
    divider.removeEventListener("pointermove", move);
    divider.removeEventListener("pointerup", finish);
    divider.removeEventListener("pointercancel", cancel);
    tileInteraction = false;
    const missing = initialNames.filter(name => !tileEngine.contains(session.root, name));
    parkTileWindows(missing, "Made room while resizing", true);
    renderTileLayout(protectedName);
    queueDesktopStateBroadcast();
  };
  const cancel = () => { session.root = startTree; finish(); };
  divider.addEventListener("pointermove", move);
  divider.addEventListener("pointerup", finish);
  divider.addEventListener("pointercancel", cancel);
}

function previewTilePressure(root, preferredName) {
  const fitted = fitDesktopTiles(root, preferredName);
  tileSession().root = fitted.node;
  const visible = new Set(fitted.windows.keys());
  let hint = $(".tile-pressure-hint");
  if (fitted.parked.length) {
    if (!hint) {
      hint = document.createElement("div");
      hint.className = "tile-pressure-hint";
      $(".workspace-zone").append(hint);
    }
    hint.textContent = "Release to park " + fitted.parked.map(name => appInfo[name].label).join(", ") + " in Apps";
  } else hint?.remove();
  $$("[data-app-frame]").forEach(frame => {
    const name = frame.dataset.appFrame;
    if (appState[name] !== "open" || !isLocalApp(name) || tileSession().floating[name]) return;
    frame.classList.toggle("tile-will-park", !visible.has(name));
    if (!visible.has(name)) return;
    autoTiledWindows.add(name);
    windowGeometry.set(name, applyGeometry(name, fitted.windows.get(name), false));
  });
}

function beginTileWindowResize(event, name, handle) {
  event.preventDefault();
  event.stopPropagation();
  bringToFront(name);
  const session = reconcileTileTree(name);
  if (session.focus?.name === name) focusTileWindow(name);
  const startTree = tileEngine.copy(session.root);
  const bounds = tileBounds();
  const initialNames = tileEngine.names(startTree);
  const placed = fitDesktopTiles(startTree, name);
  const initialRect = placed.windows.get(name);
  if (!initialRect) return;
  const minimum = minimumUsableWindowSize(name);
  const startX = event.clientX, startY = event.clientY;
  tileInteraction = true;
  handle.setPointerCapture(event.pointerId);
  frameFor(name).classList.add("is-resizing");
  $$(".app-frame").forEach(frame => frame.classList.remove("is-auto-tiling"));
  const move = next => {
    const dx = Math.max(Math.min(0, minimum.width - initialRect.width), next.clientX - startX);
    const dy = Math.max(Math.min(0, minimum.height - initialRect.height), next.clientY - startY);
    let root = tileEngine.resizeWindow(startTree, name, "x", dx, bounds, placed);
    root = tileEngine.resizeWindow(root, name, "y", dy, bounds, placed);
    previewTilePressure(root, name);
  };
  const finish = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", finish);
    handle.removeEventListener("pointercancel", cancel);
    tileInteraction = false;
    frameFor(name).classList.remove("is-resizing");
    parkTileWindows(initialNames.filter(other => !tileEngine.contains(session.root, other)), "Made room for " + appInfo[name].label, true);
    renderTileLayout(name);
    queueDesktopStateBroadcast();
  };
  const cancel = () => { session.root = startTree; finish(); };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", cancel);
}

function growTileWindow(name, direction) {
  const session = reconcileTileTree(name);
  const placed = fitDesktopTiles(session.root, name);
  const rect = placed.windows.get(name);
  if (!rect) return;
  const path = tileEngine.pathTo(session.root, name);
  const axis = path?.length ? tileEngine.at(session.root, path.slice(0, -1)).axis : "x";
  const extent = rect[axis === "x" ? "width" : "height"];
  const minimum = minimumUsableWindowSize(name)[axis === "x" ? "width" : "height"];
  const delta = Math.max(Math.min(0, minimum - extent), direction * Math.max(36, extent * .12));
  session.root = tileEngine.resizeWindow(session.root, name, axis, delta, tileBounds(), placed);
  bringToFront(name);
  renderTileLayout(name, true, true);
}

function focusTileWindow(name) {
  releaseBorrowedApp(name);
  const session = reconcileTileTree(name);
  if (session.focus?.name === name) {
    const focus = session.focus;
    leaveTileFocus(session, true);
    session.root = tileEngine.normalize(focus.root, Object.keys(appState).filter(other => appState[other] === "open" && isLocalApp(other)));
    delete frameFor(name).dataset.maximized;
    frameFor(name).classList.remove("is-maximized");
    appMaximizedState[name] = false;
    if (focus.returnFloating) {
      session.floating[name] = focus.returnFloating;
      session.root = tileEngine.remove(session.root, name);
    }
    syncApps();
    renderTileLayout(name, true, true);
  } else {
    if (session.focus) leaveTileFocus(session);
    const peers = Object.keys(appState).filter(other => other !== name && appState[other] === "open" && isLocalApp(other));
    session.focus = { name, root: tileEngine.copy(session.root), parked: [] };
    moveCoveredApps(session, session.focus, peers);
    session.focus.parked = peers.filter(other=>isLocalApp(other));
    session.root = tileEngine.leaf(name);
    parkTileWindows(session.focus.parked, "Focused " + appInfo[name].label, true);
    frameFor(name).dataset.maximized = "true";
    frameFor(name).classList.add("is-maximized");
    appMaximizedState[name] = true;
    renderTileLayout(name, false, true);
  }
  syncMaximizeButton(frameFor(name));
  saveTileSessions();
  refreshIntentAreas();
  queueDesktopStateBroadcast();
}

function intentContextPrefix() {
  return desktopPages.context(activeWorkspace);
}

function screenWindowRect(frame) {
  const rect = frame.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function detachedDragRect(name, rect, pointer, titlebarHeight = 48) {
  const preferred = {
    dolphin: { width: 640, height: 480 },
    elisa: { width: 680, height: 540 },
    browser: { width: 720, height: 520 },
    terminal: { width: 560, height: 380 },
    notes: { width: 480, height: 440 }
  }[name] || { width: 640, height: 480 };
  const minimum = minimumUsableWindowSize(name);
  const workspace = workspaceBounds();
  const fit = (ideal, min, available, screen) => Math.min(Math.max(1, screen - 16), Math.max(min, Math.min(ideal, available - 16)));
  const width = fit(preferred.width, minimum.width, workspace.width, window.innerWidth);
  const height = fit(preferred.height, minimum.height, workspace.height, window.innerHeight);
  // Preserve the grab's horizontal proportion and its titlebar offset while
  // replacing a long tile with the app's normal, usable floating footprint.
  const fraction = Math.max(0, Math.min(1, (pointer.clientX - rect.left) / Math.max(1, rect.width)));
  const titleOffset = Math.max(0, Math.min(titlebarHeight - 1, pointer.clientY - rect.top));
  return { left: pointer.clientX - fraction * width, top: pointer.clientY - titleOffset, width, height };
}

function applyFloatingGeometry(name, rect) {
  const frame = frameFor(name);
  const minimum = minimumUsableWindowSize(name);
  const width = Math.max(Math.min(minimum.width, window.innerWidth - 16), Math.min(rect.width, window.innerWidth - 16));
  const height = Math.max(Math.min(minimum.height, window.innerHeight - 16), Math.min(rect.height, window.innerHeight - 16));
  const next = { ...rect, left: Math.max(0, Math.min(rect.left, window.innerWidth - width)), top: Math.max(0, Math.min(rect.top, window.innerHeight - height)), width, height };
  const shell = $(".desktop-shell");
  if (shell && frame.parentElement !== shell) shell.append(frame);
  frame.classList.add("is-floating");
  frame.classList.remove("is-tiled");
  Object.entries({ left: next.left, top: next.top, width, height }).forEach(([key, value]) => { frame.style[key] = value + "px"; });
  return next;
}

function renderFloatingWindows(session) {
  $$('[data-app-frame]').forEach(frame => {
    const name = frame.dataset.appFrame;
    if (frame.classList.contains("is-dragging") || frame.classList.contains("is-resizing")) return;
    frame.classList.toggle("is-fullscreen", session.fullscreen?.name === name && appState[name] === "open");
    if (!session.floating[name] || appState[name] !== "open" || !isLocalApp(name)) {
      frame.classList.remove("is-floating");
      return;
    }
    if (session.fullscreen?.name === name) return;
    delete frame.dataset.maximized;
    appMaximizedState[name] = false;
    frame.classList.remove("is-maximized");
    autoTiledWindows.delete(name);
    session.floating[name] = applyFloatingGeometry(name, session.floating[name]);
    syncMaximizeButton(frame);
  });
}

function floatWindow(name, rect = null) {
  releaseBorrowedApp(name);
  const frame = frameFor(name);
  if (!rect) {
    rect = screenWindowRect(frame);
    if (frame.classList.contains("is-tiled") && !tileSession().floating[name]) {
      rect = detachedDragRect(name, rect, { clientX: rect.left + rect.width / 2, clientY: rect.top + 24 });
    }
  }
  const session = tileSession();
  if (session.fullscreen?.name === name) toggleAppFullscreen(name);
  if (session.focus?.name === name) focusTileWindow(name);
  session.root = tileEngine.remove(session.root, name);
  session.floating[name] = { ...rect, yieldEdges: session.floating[name]?.yieldEdges || [] };
  delete frame.dataset.maximized;
  frame.classList.remove("is-maximized", "is-fullscreen");
  appMaximizedState[name] = false;
  autoTiledWindows.delete(name);
  applyFloatingGeometry(name, session.floating[name]);
  renderTileLayout(name);
  saveTileSessions();
}

function renderFullscreenWindow(name) {
  const frame = frameFor(name);
  const shell = $(".desktop-shell");
  if (shell && frame.parentElement !== shell) shell.append(frame);
  frame.classList.add("is-fullscreen", "is-maximized");
  frame.classList.remove("is-floating", "is-tiled");
  frame.dataset.maximized = "true";
  appMaximizedState[name] = true;
  Object.assign(frame.style, { left: "0px", top: "0px", width: window.innerWidth + "px", height: window.innerHeight + "px" });
  syncMaximizeButton(frame);
}

function toggleAppFullscreen(name) {
  releaseBorrowedApp(name);
  if (appState[name] !== "open" || !isLocalApp(name)) return;
  const session = tileSession();
  if (session.fullscreen?.name === name) {
    leaveAppFullscreen(session);
  } else {
    if (session.fullscreen) leaveAppFullscreen(session);
    // Keep the split tree, floating rectangle and bounded focus untouched.
    session.fullscreen = { name };
    bringToFront(name);
  }
  saveTileSessions();
  refreshIntentAreas();
  renderTileLayout(name);
  queueDesktopStateBroadcast(0);
}

function updateFloatingYield(name, gate = null) {
  const floating = tileSession().floating[name];
  if (!floating) return;
  const edgeClearance = edge => edge === "left" ? floating.left : edge === "right" ? window.innerWidth - floating.left - floating.width : edge === "top" ? floating.top : window.innerHeight - floating.top - floating.height;
  const previous = new Set(floating.yieldEdges || []);
  floating.yieldEdges = dockEdges.filter(edge => {
    const size = gate?.preferredSizes?.[edge] ?? dockSizes[edge];
    const clearance = edgeClearance(edge);
    if (previous.has(edge)) return clearance < size + 64;
    return clearance < size - 2 && (!gate || gate.passed.has(edge));
  });
  floating.overlayEdges = floating.yieldEdges.filter(edge => edgeClearance(edge) < 68);
  refreshIntentAreas();
}

function manualAreaOverride(name) {
  if (intentAreaPlan.moves[name] && intentAreaPlan.moves[name] === localDisplaySlot()) {
    displayAssignmentsFor().areas[name] = localDisplaySlot();
    persistDisplayAssignments();
  }
  const prefix = intentContextPrefix();
  Object.entries(tileSessions).filter(([key]) => key.startsWith(prefix)).forEach(([, session]) => {
    Object.values(session.floating || {}).forEach(rect => { rect.excludeAreas = [...new Set([...(rect.excludeAreas || []), name])]; });
    if (session.fullscreen) session.fullscreen.excludeAreas = [...new Set([...(session.fullscreen.excludeAreas || []), name])];
  });
  saveTileSessions();
}

function refreshIntentAreas() {
  if (applyingIntentAreas || !window.SpatialIntent) return;
  applyingIntentAreas = true;
  try {
    const prefix = intentContextPrefix();
    const assignments = displayAssignmentsFor();
    const sessions = Object.entries(tileSessions).filter(([key]) => key.startsWith(prefix));
    const windows = [], demands = [];
    sessions.forEach(([key, session]) => {
      const display = Number(key.slice(prefix.length));
      const openHere = name => desktopPages.visible(activeWorkspace, name) && appState[name] === "open" && Number(assignments.apps[name] || 1) === display;
      tileEngine.names(session.root).filter(openHere).forEach(name => windows.push({ name, display }));
      Object.entries(session.floating || {}).filter(([name]) => openHere(name)).forEach(([name, rect]) => {
        windows.push({ name, display, floating: true, rect });
        if (rect.yieldEdges?.length) demands.push({ display, edges: rect.yieldEdges, overlayEdges: rect.overlayEdges, exclude: rect.excludeAreas });
      });
      if (session.fullscreen && openHere(session.fullscreen.name)) demands.push({ display, fullscreen: true, edges: [...dockEdges], exclude: session.fullscreen.excludeAreas });
    });
    Object.keys(appState).filter(name => desktopPages.visible(activeWorkspace, name) && appState[name] === "open" && !windows.some(item => item.name === name)).forEach(name => windows.push({ name, display: Number(assignments.apps[name] || 1) }));
    const roster = activeDisplayRoster();
    const displays = roster.map((display, index) => {
      const session = tileSessions[prefix + (index + 1)];
      const openNames = Object.keys(appState).filter(name => desktopPages.visible(activeWorkspace, name) && appState[name] === "open" && Number(assignments.apps[name] || 1) === index + 1 && !session?.floating?.[name]);
      const openTree = tileEngine.normalize(session?.root, openNames);
      const minimum = window.SpatialIntent.minimumTree(openTree, minimumUsableWindowSize);
      if (!openTree && openNames.length) {
        minimum.width = Math.max(...openNames.map(name => minimumUsableWindowSize(name).width));
        minimum.height = openNames.reduce((sum, name) => sum + minimumUsableWindowSize(name).height, 0) + (openNames.length - 1) * 8;
      }
      return { slot: index + 1, width: display.width || window.innerWidth, height: display.height || window.innerHeight, minimum };
    });
    const areas = areaPriority.filter(name => !areaFor(name)?.hidden).map(name => ({ name, edge: dockState[name].edge, display: Math.min(roster.length, Number(assignments.areas[name]) || 1), size: dockSizes[dockState[name].edge] }));
    const next = window.SpatialIntent.plan({ areas, displays, windows, demands });
    // True fullscreen transfers Areas when they fit elsewhere. Any Area left
    // on the covered display is temporarily hidden, without changing its saved state.
    demands.filter(demand => demand.fullscreen).forEach(demand => {
      areas.filter(area => (next.moves[area.name] || area.display) === demand.display).forEach(area => { next.hidden[area.name] = true; delete next.overlays[area.name]; });
    });
    const changed = JSON.stringify(next) !== JSON.stringify(intentAreaPlan);
    intentAreaPlan = next;
    if (changed) {
      areaPriority.forEach(name => areaFor(name)?.classList.toggle("is-on-other-display", !isLocalArea(name)));
      layoutDockAreas(false, false);
      scheduleWindowTiling();
    }
    renderIntentAreaEdges();
  } finally { applyingIntentAreas = false; }
}

function renderIntentAreaEdges() {
  let shelf = $("#intentAreaEdges");
  if (!shelf) {
    shelf = document.createElement("nav");
    shelf.id = "intentAreaEdges";
    shelf.setAttribute("aria-label", "Areas available over this window");
    $(".desktop-shell").append(shelf);
  }
  const names = areaPriority.filter(name => intentAreaPlan.overlays[name] && !intentAreaPlan.hidden?.[name] && isLocalArea(name));
  const signature = names.map(name => name + ":" + dockState[name].edge).join("|");
  if (shelf.dataset.signature !== signature) {
    shelf.dataset.signature = signature;
    shelf.innerHTML = names.map((name, index) => '<button class="intent-area-tab" data-intent-area="' + name + '" data-edge="' + dockState[name].edge + '" style="--tab-index:' + index + '" aria-expanded="false">' + escapeHtml(areaLabel(name)) + '</button>').join("");
    $$('[data-intent-area]', shelf).forEach(button => button.addEventListener("click", () => {
      const area = areaFor(button.dataset.intentArea);
      const show = !area.classList.contains("is-intent-revealed");
      area.classList.toggle("is-intent-revealed", show);
      button.setAttribute("aria-expanded", String(show));
      layoutDockAreas(false, false);
    }));
  }
  areaPriority.forEach(name => {
    const area = areaFor(name);
    const hiddenForFullscreen = Boolean(intentAreaPlan.hidden?.[name]);
    area?.classList.toggle("is-intent-hidden", hiddenForFullscreen);
    if (area) area.inert = hiddenForFullscreen;
    area?.classList.toggle("is-intent-overlay", names.includes(name));
    if (!names.includes(name)) area?.classList.remove("is-intent-revealed");
  });
}

function restoreWorkspaceWindowLayout() {
  const openNames = Object.keys(appState).filter(name => appState[name] === "open");
  $$('[data-app-frame]').forEach(frame => {
    frame.classList.remove("is-maximized");
    delete frame.dataset.maximized;
    delete frame.dataset.maxDisplay;
    syncMaximizeButton(frame);
  });
  maximizeRestore.clear();
  openNames.forEach((name, index) => {
    const geometry = windowGeometry.get(name) || defaultWindowGeometry(name, index);
    windowGeometry.set(name, clampGeometry(geometry, name));
    applyGeometry(name, geometry, false);
  });
  saveLayout();
  refreshIntentAreas();
  scheduleWindowTiling();
}

function syncRack() {
  $$("[data-open-app]").forEach(button => {
    const name = button.dataset.openApp;
    const state = appState[name];
    button.classList.toggle("is-open", state !== "closed");
    button.classList.toggle("is-active", desktopHasWindowFocus && state === "open" && name === frontApp && isLocalApp(name));
    button.classList.toggle("is-minimized", state === "minimized");
    button.setAttribute("aria-pressed", String(desktopHasWindowFocus && state === "open" && name === frontApp && isLocalApp(name)));
  });
}

function topOpenApp(except = null) {
  return Object.keys(appState)
    .filter(name => appState[name] === "open" && name !== except && isLocalApp(name))
    .sort((a, b) => Number(frameFor(b).style.zIndex || 0) - Number(frameFor(a).style.zIndex || 0))[0] || null;
}

function bringToFront(name) {
  if (appState[name] !== "open" || !isLocalApp(name)) return;
  desktopHasWindowFocus = true;
  frontApp = name;
  zCounter += 1;
  $$("[data-app-frame]").forEach(frame => frame.classList.toggle("is-front", frame.dataset.appFrame === name));
  frameFor(name).style.zIndex = zCounter;
  updateDesktopPageUi();
  syncRack();
  scheduleWindowVisibility();
}

function syncApps() {
  syncProjectWindowScopes();
  $$("[data-app-frame]").forEach(frame => {
    const visible = appState[frame.dataset.appFrame] === "open" && isLocalApp(frame.dataset.appFrame);
    frame.hidden = !visible;
    frame.classList.toggle("is-active", visible);
  });
  if (!frontApp || appState[frontApp] !== "open" || !isLocalApp(frontApp)) frontApp = topOpenApp();
  $("#emptyWorkspace").hidden = Object.keys(appState).some(name => appState[name] === "open" && isLocalApp(name));
  syncRack();
  renderMiniApps();
  renderOverviewWindows();
  if (frontApp && desktopHasWindowFocus) bringToFront(frontApp);
  if (!frontApp) desktopHasWindowFocus = false;
  updateDesktopPageUi();
  persistWorkspaceAppStates();
  /* An otherwise empty secondary display is an Area workspace. Re-run the
     Area layout whenever its local window occupancy changes so it can enter
     or leave that presentation immediately. */
  if (windowViewportLockReady && extendedDesktopActive()) layoutDockAreas(false, false);
  if (windowViewportLockReady && !tileRendering && !tileInteraction) scheduleWindowTiling();
}

function openApp(name, dropPoint = null) {
  if (globalThis.SpatialGuide?.model.active() && !SpatialGuide.model.allows('apps')) return;
  if (!appInfo[name]) return;
  // Restoring a live card is an explicit request to leave exclusive fullscreen.
  if (tileSession().fullscreen && tileSession().fullscreen.name !== name) leaveAppFullscreen();
  releaseBorrowedApp(name);
  const previousState = appState[name];
  const splitTarget = frontApp;
  displayAssignmentsFor().apps[name] = localDisplaySlot();
  if (typeof clearWindowAutoAvoidance === "function") clearWindowAutoAvoidance(name);
  appState[name] = "open";
  frameFor(name).hidden = false;
  syncApps();
  if (tileSession().floating[name] && !dropPoint) {
    renderTileLayout(name);
  } else if (previousState !== "open" || dropPoint) {
    splitWindowIntoTile(name, dropPoint, splitTarget);
  } else renderTileLayout(name);
  bringToFront(name);
  refreshIntentAreas();
  if (layoutMode === "auto") {
    if (rebalanceAreaDisplays()) applyExtendedDesktopPartition();
    scheduleSpatialAutoLayout();
    scheduleWindowTiling(name);
  }
  queueDesktopStateBroadcast();
}

function removeOffPageWindowTiles(name) {
  if (desktopPages.visible(activeWorkspace, name)) return;
  const prefix = desktopPages.context(activeWorkspace, desktopPages.pageOf(activeWorkspace, name), desktopPages.columnOf(activeWorkspace, name));
  Object.entries(tileSessions).filter(([key]) => key.startsWith(prefix)).forEach(([, session]) => {
    session.root = tileEngine.remove(session.root, name);
    delete session.floating?.[name];
    delete session.parked?.[name];
    if (session.focus?.name === name) leaveTileFocus(session);
    if (session.fullscreen?.name === name) session.fullscreen = null;
  });
}

function minimizeApp(name, preserveGeometry = false) {
  releaseBorrowedApp(name);
  if (globalThis.SpatialGuide?.model.active() && !SpatialGuide.model.allows('parking')) return;
  removeOffPageWindowTiles(name);
  const frame = frameFor(name);
  if (appState[name] !== "open") return;
  if (!preserveGeometry && !frame.dataset.maximized) windowGeometry.set(name, readGeometry(frame));
  frame.classList.remove("is-maximized");
  delete frame.dataset.maximized;
  appMaximizedState[name] = false;
  if (typeof clearWindowAutoAvoidance === "function") clearWindowAutoAvoidance(name);
  syncMaximizeButton(frame);
  appState[name] = "minimized";
  if (tileSession().fullscreen?.name === name) leaveAppFullscreen();
  tileSession().root = tileEngine.remove(tileSession().root, name);
  delete tileSession().parked[name];
  if (tileSession().focus?.name === name) leaveTileFocus(tileSession());
  autoTiledWindows.delete(name);
  frame.classList.remove("is-tiled");
  saveTileSessions();
  if (frontApp === name) frontApp = topOpenApp(name);
  syncApps();
  refreshIntentAreas();
  if (layoutMode === "auto") {
    if (rebalanceAreaDisplays()) applyExtendedDesktopPartition();
    scheduleSpatialAutoLayout();
  }
  queueDesktopStateBroadcast();
}

function closeApp(name) {
  releaseBorrowedApp(name);
  removeOffPageWindowTiles(name);
  if (typeof clearWindowAutoAvoidance === "function") clearWindowAutoAvoidance(name);
  const frame = frameFor(name);
  frame?.classList.remove("is-maximized");
  if (frame) delete frame.dataset.maximized;
  appState[name] = "closed";
  delete tileSession().floating[name];
  if (tileSession().fullscreen?.name === name) leaveAppFullscreen();
  tileSession().root = tileEngine.remove(tileSession().root, name);
  delete tileSession().parked[name];
  if (tileSession().focus?.name === name) leaveTileFocus(tileSession());
  saveTileSessions();
  autoTiledWindows.delete(name);
  appMaximizedState[name] = false;
  if (frame) syncMaximizeButton(frame);
  if (frontApp === name) frontApp = topOpenApp(name);
  syncApps();
  refreshIntentAreas();
  if (layoutMode === "auto") {
    if (rebalanceAreaDisplays()) applyExtendedDesktopPartition();
    scheduleSpatialAutoLayout();
  }
  showToast(appInfo[name].label + " closed");
  queueDesktopStateBroadcast();
}

function syncMaximizeButton(frame) {
  const button = $('[data-window-action="maximize"]', frame);
  if (button) {
    button.setAttribute("aria-pressed", String(frame.dataset.maximized === "true"));
    button.title = "Left click: Maximize · middle click: Full fullscreen · repeat to restore";
    button.setAttribute("aria-label", "Maximize; middle click for Full fullscreen");
  }
}

function toggleMaximize(name) {
  const frame = frameFor(name);
  if (!frame || !isLocalApp(name)) return;
  const session = tileSession();
  if (session.fullscreen?.name === name) {
    toggleAppFullscreen(name);
    if (session.focus?.name === name) return;
  }
  if (session.floating[name]) {
    const returnFloating = { ...session.floating[name] };
    splitWindowIntoTile(name);
    focusTileWindow(name);
    tileSession().focus.returnFloating = returnFloating;
    saveTileSessions();
    refreshIntentAreas();
    return;
  }
  if (frame.classList.contains("is-tiled") || tileEngine.contains(tileSession().root, name)) {
    focusTileWindow(name);
    return;
  }
  if (frame.dataset.maximized === "true") {
    delete frame.dataset.maximized;
    frame.classList.remove("is-maximized");
    appMaximizedState[name] = false;
    clearWindowAutoAvoidance(name);
    applyGeometry(name, maximizeRestore.get(name) || windowGeometry.get(name) || readGeometry(frame));
    syncMaximizeButton(frame);
    if (layoutMode === "auto" && rebalanceAreaDisplays()) applyExtendedDesktopPartition();
    scheduleSpatialAutoLayout();
    return;
  }
  maximizeRestore.set(name, readGeometry(frame));
  const occupiedEdges = dockEdges.filter(edge => dockGroup(edge).length);
  let maximizeEdges = occupiedEdges;
  if (layoutMode === "auto" && currentDisplayProfile === "dual") {
    const shellRect = $(".desktop-shell").getBoundingClientRect();
    const onLeftDisplay = lastDesktopPointerX < shellRect.left + shellRect.width / 2;
    maximizeEdges = occupiedEdges.filter(edge => edge === (onLeftDisplay ? "left" : "right") || edge === "top" || edge === "bottom");
  }
  setWindowAutoAvoidance(name, maximizeEdges, frame);
  const workspace = workspaceBounds();
  frame.dataset.maximized = "true";
  appMaximizedState[name] = true;
  frame.classList.add("is-maximized");
  if (layoutMode === "auto" && currentDisplayProfile === "dual") {
    const shellRect = $(".desktop-shell").getBoundingClientRect();
    const onLeftDisplay = lastDesktopPointerX < shellRect.left + shellRect.width / 2;
    const targetLeft = shellRect.left + (onLeftDisplay ? 0 : shellRect.width / 2);
    applyGeometry(name, {
      x: targetLeft - workspace.rect.left + 8,
      y: shellRect.top - workspace.rect.top + 8,
      width: shellRect.width / 2 - 16,
      height: shellRect.height - 16
    }, false);
    frame.dataset.maxDisplay = onLeftDisplay ? "1" : "2";
  } else {
    applyGeometry(name, { x: 8, y: 8, width: workspace.width - 16, height: workspace.height - 16 }, false);
    delete frame.dataset.maxDisplay;
  }
  bringToFront(name);
  syncMaximizeButton(frame);
  if (layoutMode === "auto" && rebalanceAreaDisplays()) applyExtendedDesktopPartition();
}

function hotbarSlotFor(name) {
  const rack = workspaceProfiles[activeWorkspace]?.rack || [];
  const index = rack.indexOf(name);
  return index === -1 ? null : index + 1;
}

function miniMarkup(name) {
  const info = appInfo[name];
  const slot = hotbarSlotFor(name);
  const hotkey = slot === null ? "" : '<kbd class="mini-hotkey" aria-hidden="true">' + (slot <= 10 ? slot % 10 : slot <= 20 ? '⇧' + slot % 10 : slot) + '</kbd>';
  const shortcut = slot === null ? "" : slot > 20 ? " · Click · slot " + slot : " · Super+" + (slot > 10 ? "Shift+" : "") + (slot % 10);
  const parked = tileSession().parked[name];
  const detail = parked ? "Parked · still running" : info.detail;
  const header = '<header title="' + escapeHtml(parked?.reason || 'Drag this card back into the workspace') + shortcut + '"><div>' + hotkey + '<span class="app-badge ' + info.tone + '">' + appArt(name, "app-art-compact") + '</span><span><b>' + info.label + '</b><small>' + detail + '</small></span></div><div class="mini-actions"><button class="surface-key mini-control" data-mini-restore="' + name + '" aria-label="Unpark ' + info.label + '">' + icon("i-max") + '</button><button class="surface-key mini-control" data-mini-close="' + name + '" aria-label="Close ' + info.label + '">' + icon("i-close") + "</button></div></header>";
  if (name === "elisa") {
    return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<div class="mini-music"><div class="mini-art"></div><div class="mini-track"><b>Evening Light</b><small>Northbound · 1:55 / 3:38</small></div><div class="mini-transport"><button class="surface-key mini-control" data-music="prev" aria-label="Previous track" title="Previous track">' + icon("i-prev") + '</button><button class="surface-key mini-control play-toggle" data-music="play" aria-label="' + (musicPlaying ? "Pause" : "Play") + '" title="' + (musicPlaying ? "Pause" : "Play") + '">' + icon(musicPlaying ? "i-pause" : "i-play") + '</button><button class="surface-key mini-control" data-music="next" aria-label="Next track" title="Next track">' + icon("i-next") + '</button><input class="track-range" type="range" min="0" max="218" value="' + musicPosition + '" aria-label="Track position"></div></div></article>';
  }
  if (name === "dolphin") {
    return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<div class="mini-location"><span class="live-slit"></span><b>Downloads</b><small>276.8 GiB free</small></div><div class="mini-file-list"><button data-mini-file="Website Launch"><span><i class="folder-glyph"></i>Website Launch</span><small>today</small></button><button data-mini-file="landscape.jpg"><span><i class="document-glyph image"></i>landscape.jpg</span><small>6.8 MiB</small></button></div><div class="mini-quick-row"><button class="surface-key mini-tool" data-mini-action="new-folder">' + icon("i-folder") + '<span>New folder</span></button><button class="surface-key mini-tool" data-mini-action="find-files">' + icon("i-search") + '<span>Find</span></button></div></article>';
  }
  if (name === "terminal") {
    return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<div class="mini-terminal-output"><b>demo@desktop:~$</b><span data-mini-terminal-output>' + escapeHtml(terminalPreview) + '</span></div><form class="mini-command" data-mini-terminal-form><span>$</span><input name="command" autocomplete="off" placeholder="Run a quick command" aria-label="Quick terminal command"><button class="surface-key mini-control" aria-label="Run command">' + icon("i-right") + "</button></form></article>";
  }
  if (name === "browser") {
    return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<form class="mini-browser-search" data-mini-browser-form><input name="query" placeholder="Search or enter address" aria-label="Mini browser search"><button class="surface-key mini-control" aria-label="Search">' + icon("i-search") + '</button></form><div class="mini-sites"><button data-mini-site="Mail">Mail</button><button data-mini-site="Calendar">Calendar</button><button data-mini-site="Weather">Weather</button></div></article>';
  }
  if (name === "notes") {
    return '<article class="mini-card mini-card-note" data-mini-card="' + name + '">' + header + '<textarea class="mini-note-field" data-mini-note aria-label="Edit meeting note">' + escapeHtml(noteDraft) + "</textarea></article>";
  }
  return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<div class="mini-files"><b>' + info.detail + '</b><span>live</span><small>Drag back when you need the full app</small><span>ready</span></div></article>';
}

function renderMiniApps() {
  const minimized = Object.keys(appState).filter(key => appState[key] === "minimized" && desktopPages.inColumn(activeWorkspace, key));
  $("#miniStack").innerHTML = minimized.length ? minimized.map(miniMarkup).join("") : '<div class="mini-empty">Drag a window here to keep it controllable.</div>';
  applyAppPrimaryColors($("#miniStack"));
  prepareControlSemantics($("#miniStack"));
  $("#miniCount").textContent = minimized.length + " parked";
  $$("[data-mini-restore]").forEach(button => button.addEventListener("click", () => openApp(button.dataset.miniRestore)));
  $$("[data-mini-close]").forEach(button => button.addEventListener("click", () => closeApp(button.dataset.miniClose)));
  $$("[data-mini-card]").forEach(bindMiniDrag);
  bindMusicControls();
  bindMiniWidgets();
}

function terminalResult(command) {
  if (command === "help") return "Try: clear, date, pwd, git status, echo hello";
  if (command === "date") return new Date().toLocaleString("en-GB");
  if (command === "git status") return "On branch main · working tree clean";
  if (command === "pwd") return projectSpaces[activeProjectName]?.root || workspaceProfiles[activeWorkspace]?.home || "/home/demo";
  if (command === "echo" || command.startsWith("echo ")) return command.slice(4).trimStart();
  if (command === "clear") return "Terminal cleared";
  return "command not found: " + command;
}

function bindMiniWidgets() {
  $$("[data-mini-file]").forEach(button => button.addEventListener("click", () => {
    const item = button.dataset.miniFile;
    openApp("dolphin");
    showToast(item + " selected");
  }));

  $$("[data-mini-action]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.miniAction === "new-folder") {
      const list = button.closest("[data-mini-card]").querySelector(".mini-file-list");
      const folder = document.createElement("button");
      const number = list.querySelectorAll('[data-mini-file^="New folder"]').length + 1;
      const folderName = number === 1 ? "New folder" : "New folder " + number;
      folder.dataset.miniFile = folderName;
      folder.innerHTML = '<span><i class="folder-glyph"></i>' + folderName + '</span><small>now</small>';
      folder.addEventListener("click", () => {
        openApp("dolphin");
        showToast(folderName + " selected");
      });
      list.prepend(folder);
      showToast("New folder created in Downloads");
      return;
    }
    openApp("dolphin");
    requestAnimationFrame(() => {
      const location = frameFor("dolphin").querySelector('input[aria-label="Location"]');
      location.focus();
      location.select();
    });
  }));

  $$("[data-mini-browser-form]").forEach(form => form.addEventListener("submit", event => {
    event.preventDefault();
    const query = new FormData(form).get("query").trim();
    if (!query) return;
    const address = frameFor("browser").querySelector('input[aria-label="Address"]');
    address.value = query;
    openApp("browser");
    showToast("Web opened: " + query);
  }));

  $$("[data-mini-site]").forEach(button => button.addEventListener("click", () => {
    const address = frameFor("browser").querySelector('input[aria-label="Address"]');
    address.value = button.dataset.miniSite;
    openApp("browser");
    showToast(button.dataset.miniSite + " opened");
  }));

  $$("[data-mini-terminal-form]").forEach(form => form.addEventListener("submit", event => {
    event.preventDefault();
    const input = form.elements.command;
    const command = input.value.trim();
    if (!command) return;
    terminalPreview = terminalResult(command);
    const output = form.closest("[data-mini-card]").querySelector("[data-mini-terminal-output]");
    output.textContent = terminalPreview;
    const mainLine = document.createElement("p");
    mainLine.className = "terminal-output";
    mainLine.textContent = "$ " + command + "  ·  " + terminalPreview;
    const terminalLabel = $("#terminalInput").closest("label");
    if (command === "clear") $$(".terminal-screen > p").forEach(item => item.remove());
    else terminalLabel.before(mainLine);
    input.value = "";
  }));

  $$("[data-mini-note]").forEach(field => field.addEventListener("input", () => {
    noteDraft = field.value;
    $(".notes-layout textarea").value = noteDraft;
    persistWorkspaceNote();
  }));
}

function prepareNoteSync() {
  const mainNote = $(".notes-layout textarea");
  try {
    noteDraft = SpatialDemoExamples.migrateNote(desktopStorage.getItem("spatial-note-draft-v1") ?? mainNote.value);
    desktopStorage.setItem("spatial-note-draft-v1", noteDraft);
  } catch {
    noteDraft = mainNote.value;
  }
  mainNote.value = noteDraft;
  mainNote.addEventListener("input", () => {
    noteDraft = mainNote.value;
    persistWorkspaceNote();
  });
}

function pointInside(rect, x, y) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function setDropTarget(zone, active) {
  zone.classList.toggle("is-drop-target", active);
}

const AREA_BOUNDARY_RESISTANCE = 86;
const AREA_BOUNDARY_INSET = 10;

function ensureAreaBoundaryFeedback() {
  let feedback = $("#areaBoundaryFeedback");
  if (feedback) return feedback;
  feedback = document.createElement("div");
  feedback.id = "areaBoundaryFeedback";
  feedback.className = "area-boundary-feedback";
  feedback.setAttribute("aria-hidden", "true");
  $(".desktop-shell").append(feedback);
  return feedback;
}

function areaBoundaryPenetration(edge, rect, lane) {
  if (edge === "left") return lane.right - rect.left;
  if (edge === "right") return rect.right - lane.left;
  if (edge === "top") return lane.bottom - rect.top;
  return rect.bottom - lane.top;
}

function areaBoundarySpanOverlaps(edge, rect, lane) {
  if (edge === "left" || edge === "right") {
    return Math.min(rect.bottom, lane.bottom) - Math.max(rect.top, lane.top) > 28;
  }
  return Math.min(rect.right, lane.right) - Math.max(rect.left, lane.left) > 28;
}

function areaBoundaryStage(edge) {
  return dockGroup(edge).map(name => name + ":" + (areaFor(name)?.dataset.areaState || "unknown")).join("|");
}

function edgeHasVisibleArea(edge) {
  return dockGroup(edge).some(name => {
    const area = areaFor(name);
    return area && !area.classList.contains("is-auto-yielding") && !area.classList.contains("is-auto-relocated");
  });
}

function setAreaBoundaryFeedback(hit, rect) {
  const feedback = ensureAreaBoundaryFeedback();
  if (!hit) {
    feedback.classList.remove("is-visible");
    feedback.style.removeProperty("--boundary-pressure");
    return;
  }
  const shellRect = $(".desktop-shell").getBoundingClientRect();
  const lane = hit.lane;
  const vertical = hit.edge === "left" || hit.edge === "right";
  const extent = vertical
    ? Math.min(190, Math.max(72, rect.height * .42))
    : Math.min(220, Math.max(90, rect.width * .42));
  const center = vertical
    ? Math.max(lane.top + extent / 2, Math.min((rect.top + rect.bottom) / 2, lane.bottom - extent / 2))
    : Math.max(lane.left + extent / 2, Math.min((rect.left + rect.right) / 2, lane.right - extent / 2));
  const boundary = hit.edge === "left" ? lane.right : hit.edge === "right" ? lane.left : hit.edge === "top" ? lane.bottom : lane.top;
  const firstArea = areaFor(dockGroup(hit.edge)[0]);
  const accent = firstArea ? getComputedStyle(firstArea).getPropertyValue("--area-header-accent").trim() : "#62c9ff";
  feedback.dataset.edge = hit.edge;
  feedback.style.setProperty("--boundary-pressure", hit.pressure.toFixed(3));
  feedback.style.setProperty("--boundary-opacity", (0.28 + hit.pressure * 0.56).toFixed(3));
  feedback.style.setProperty("--boundary-glow", Math.round(4 + hit.pressure * 8) + "px");
  feedback.style.setProperty("--boundary-accent", accent || "#62c9ff");
  if (vertical) {
    feedback.style.left = Math.round(boundary - shellRect.left - 2) + "px";
    feedback.style.top = Math.round(center - extent / 2 - shellRect.top) + "px";
    feedback.style.width = "4px";
    feedback.style.height = Math.round(extent) + "px";
  } else {
    feedback.style.left = Math.round(center - extent / 2 - shellRect.left) + "px";
    feedback.style.top = Math.round(boundary - shellRect.top - 2) + "px";
    feedback.style.width = Math.round(extent) + "px";
    feedback.style.height = "4px";
  }
  feedback.classList.add("is-visible");
}

function resistAreaBoundaries(position, size, gate, bypass = false) {
  if ((!areasFollowWindows() && !gate.manual) || bypass) {
    setAreaBoundaryFeedback(null);
    return { ...position, resisted: false };
  }
  const candidate = {
    left: position.left,
    top: position.top,
    right: position.left + size.width,
    bottom: position.top + size.height,
    width: size.width,
    height: size.height
  };
  const next = { ...position, resisted: false };
  let strongest = null;

  dockEdges.forEach(edge => {
    const lane = baseDockLaneRects.get(edge);
    if (!lane || !edgeHasVisibleArea(edge) || !areaBoundarySpanOverlaps(edge, candidate, lane)) return;
    const penetration = areaBoundaryPenetration(edge, candidate, lane);
    const stage = areaBoundaryStage(edge);
    if (gate.stages.get(edge) !== stage) {
      gate.stages.set(edge, stage);
      gate.passed.delete(edge);
      gate.baselines.set(edge, Math.max(0, penetration));
    }
    if (gate.passed.has(edge)) {
      if (penetration < -20) {
        gate.passed.delete(edge);
        gate.baselines.set(edge, 0);
      }
      else return;
    }
    if (penetration <= 0) {
      gate.baselines.set(edge, 0);
      return;
    }
    const effectivePenetration = Math.max(0, penetration - (gate.baselines.get(edge) || 0));
    if (effectivePenetration >= gate.threshold) {
      gate.passed.add(edge);
      gate.baselines.set(edge, 0);
      return;
    }

    const pressure = Math.max(0, Math.min(1, effectivePenetration / gate.threshold));
    if (edge === "left") next.left = lane.right + AREA_BOUNDARY_INSET;
    if (edge === "right") next.left = lane.left - size.width - AREA_BOUNDARY_INSET;
    if (edge === "top") next.top = lane.bottom + AREA_BOUNDARY_INSET;
    if (edge === "bottom") next.top = lane.top - size.height - AREA_BOUNDARY_INSET;
    next.resisted = true;
    if (!strongest || pressure > strongest.pressure) strongest = { edge, pressure, lane };
  });

  const resistedRect = {
    left: next.left,
    top: next.top,
    right: next.left + size.width,
    bottom: next.top + size.height,
    width: size.width,
    height: size.height
  };
  setAreaBoundaryFeedback(strongest, resistedRect);
  return next;
}

let cancelWindowPointerInteraction = null;

function detachDraggedDesktopWindow(name, page, column = desktopPages.column(activeWorkspace)) {
  const prefix = desktopPages.context(activeWorkspace, page, column);
  Object.entries(tileSessions).filter(([key]) => key.startsWith(prefix)).forEach(([, session]) => {
    session.root = tileEngine.remove(session.root, name);
    if (session.focus?.name === name) leaveTileFocus(session);
    if (session.focus?.root) session.focus.root = tileEngine.remove(session.focus.root, name);
    delete session.floating?.[name];
    delete session.parked?.[name];
  });
}

function changeDraggedDesktopPage(drag, page) {
  const previous = desktopPages.current(activeWorkspace);
  if (page === previous || page < 0 || page > desktopPages.last(activeWorkspace) || desktopPageAnimating) return false;
  const floating = tileSession().floating[drag.name];
  detachDraggedDesktopWindow(drag.name, previous);
  desktopPages.go(activeWorkspace, page);
  // Restore the destination's fullscreen peers before the held window joins it.
  if (tileSession().fullscreen) leaveAppFullscreen();
  desktopPages.assign(activeWorkspace, drag.name, page);
  if (floating) tileSession().floating[drag.name] = floating;
  drag.changed = true;
  drag.switching = true;
  try {
    syncApps();
    refreshIntentAreas();
    renderTileLayout(drag.name);
    bringToFront(drag.name);
  } finally { drag.switching = false; }
  saveDesktopPages();
  saveTileSessions();
  queueDesktopStateBroadcast(0);
  return true;
}

function cancelDraggedDesktopPages(drag) {
  if (!drag.changed) return;
  detachDraggedDesktopWindow(drag.name, desktopPages.current(activeWorkspace));
  Object.keys(tileSessions).filter(key => key.startsWith(activeWorkspace + ":")).forEach(key => delete tileSessions[key]);
  Object.entries(drag.sessions).forEach(([key, session]) => { tileSessions[key] = session; });
  if (desktopPages.column(activeWorkspace) !== drag.column) {
    desktopPages.select(activeWorkspace, drag.column);
    if (drag.column !== "workspace" && drag.column !== activeProjectName) renderProjectSpace(drag.column);
    windowMembership[activeWorkspace][drag.name] = drag.column === "workspace" ? null : drag.column;
    layoutDockAreas(false, false);
    saveIndependentSessions();
  }
  desktopPages.assign(activeWorkspace, drag.name, drag.page, drag.column);
  desktopPages.go(activeWorkspace, drag.page);
  syncApps();
  refreshIntentAreas();
  saveDesktopPages();
  saveTileSessions();
  queueDesktopStateBroadcast(0);
}

// A floating window is reparented out of the clipped workspace. Capture on
// its titlebar can be lost during that move, so the window owns the gesture;
// element capture is only an aid, never the sole route to pointerup.
function trackWindowPointer(event, handle, move, finish, desktopDrag = null) {
  cancelWindowPointerInteraction?.();
  cancelAnimationFrame(tileLayoutFrame);
  tileLayoutFrame = 0;
  tileInteraction = true;
  const pointerId = event.pointerId;
  const heldButton = event.button === 1 ? 4 : 1;
  let lastPointer = event;
  let finished = false;
  const drag = event.button === 0 && desktopDrag ? {
    ...desktopDrag, page: desktopPages.current(activeWorkspace), column: desktopPages.column(activeWorkspace), changed: false,
    sessions: JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(tileSessions)
      .filter(([key]) => key.startsWith(activeWorkspace + ":")))))
  } : null;
  const wheel = drag ? SpatialDesktopPages.wheelGate() : null;
  const columnWheel = drag ? SpatialDesktopPages.wheelGate() : null;
  if (drag) activeDesktopDrag = drag;
  const capture = () => {
    if (finished) return;
    try { handle.setPointerCapture(pointerId); } catch { /* Global tracking still works. */ }
  };
  const end = pointer => {
    if (finished || (pointer.pointerId !== undefined && pointer.pointerId !== pointerId)) return;
    finished = true;
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", end, true);
    window.removeEventListener("pointercancel", end, true);
    window.removeEventListener("blur", cancel);
    window.removeEventListener("wheel", onWheel, true);
    window.removeEventListener("keydown", onKey, true);
    document.removeEventListener("visibilitychange", visibilityChanged);
    if (cancelWindowPointerInteraction === cancel) cancelWindowPointerInteraction = null;
    try { handle.releasePointerCapture(pointerId); } catch { /* Capture may already be gone. */ }
    try {
      if (drag && pointer.type === "pointercancel") cancelDraggedDesktopPages(drag);
      if (activeDesktopDrag === drag) activeDesktopDrag = null;
      finish(pointer);
    }
    finally {
      if (activeDesktopDrag === drag) activeDesktopDrag = null;
      tileInteraction = false;
      window.dispatchEvent(new CustomEvent("material-cursor-release"));
    }
  };
  const cancel = () => end({ type: "pointercancel", pointerId, clientX: lastPointer.clientX, clientY: lastPointer.clientY });
  const visibilityChanged = () => { if (document.hidden) cancel(); };
  const onKey = key => {
    if (!drag || key.key !== "Escape") return;
    key.preventDefault();
    key.stopPropagation();
    cancel();
  };
  const onWheel = scroll => {
    const superHeld = scroll.metaKey || scroll.getModifierState?.("OS");
    if (!drag || finished || scroll.ctrlKey || scroll.altKey || (!scroll.shiftKey && Math.abs(scroll.deltaX) > Math.abs(scroll.deltaY))) return;
    if (superHeld) superKeyAlone = false;
    scroll.preventDefault();
    scroll.stopPropagation();
    const delta = (scroll.shiftKey ? scroll.deltaY || scroll.deltaX : scroll.deltaY) * (scroll.deltaMode === 1 ? 16 : scroll.deltaMode === 2 ? $(".workspace-zone").clientHeight : 1);
    if (scroll.shiftKey) {
      const direction = columnWheel.feed(delta, performance.now());
      const target = adjacentDesktopColumn(direction);
      if (direction && target) {
        move(lastPointer, true);
        if (changeDraggedDesktopColumn(drag, target)) { move(lastPointer, true); capture(); }
      }
      return;
    }
    const direction = wheel.feed(delta, performance.now());
    const page = desktopPages.current(activeWorkspace) + direction;
    if (!direction || desktopPageAnimating || page < 0 || page > desktopPages.last(activeWorkspace)) return;
    try {
      // Wheel alone is a deliberate move, even before the six-pixel threshold.
      move(lastPointer, true);
      if (changeDraggedDesktopPage(drag, page)) { move(lastPointer, true); capture(); }
    } catch (error) { cancel(); throw error; }
  };
  const onMove = pointer => {
    if (pointer.pointerId !== pointerId || finished) return;
    // Recover even if release happened outside the browser and no up arrived.
    if (typeof pointer.buttons === "number" && !(pointer.buttons & heldButton)) {
      end({ type: "pointerup", pointerId, clientX: lastPointer.clientX, clientY: lastPointer.clientY });
      return;
    }
    lastPointer = pointer;
    try { move(pointer); }
    catch (error) { cancel(); throw error; }
  };
  cancelWindowPointerInteraction = cancel;
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", end, true);
  window.addEventListener("pointercancel", end, true);
  window.addEventListener("blur", cancel);
  if (drag) {
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("keydown", onKey, true);
  }
  document.addEventListener("visibilitychange", visibilityChanged);
  capture();
  return capture;
}

function beginManualWindowInteraction(event, frame, handle, resizing = false) {
  releaseBorrowedApp(frame.dataset.appFrame);
  cancelWindowPointerInteraction?.();
  event.preventDefault();
  event.stopPropagation();
  const name = frame.dataset.appFrame;
  if (tileSession().fullscreen?.name === name) toggleAppFullscreen(name);
  const original = screenWindowRect(frame);
  const startX = event.clientX, startY = event.clientY;
  const priorFloating = tileSession().floating[name] ? { ...tileSession().floating[name] } : null;
  const start = !resizing && !priorFloating && frame.classList.contains("is-tiled")
    ? detachedDragRect(name, original, event, handle.getBoundingClientRect?.().height || 48)
    : original;
  const gate = { manual: true, threshold: AREA_BOUNDARY_RESISTANCE, passed: new Set(priorFloating?.yieldEdges || []), stages: new Map(), baselines: new Map(), preferredSizes: { ...dockSizes } };
  dockEdges.forEach(edge => { gate.stages.set(edge, areaBoundaryStage(edge)); gate.baselines.set(edge, 0); });
  let moved = false;
  tileInteraction = true;
  bringToFront(name);
  const move = (pointer, force = false) => {
    if (!moved) {
      if (!force && Math.hypot(pointer.clientX - startX, pointer.clientY - startY) < 6) return;
      moved = true;
      manualWindowInteraction = true;
      frame.classList.remove("is-auto-tiling");
      frame.classList.add(resizing ? "is-resizing" : "is-dragging");
      floatWindow(name, start);
      // Re-establish capture after append(), not before the DOM move.
      recapture();
    }
    const candidate = resizing
      ? { ...start, width: start.width + pointer.clientX - startX, height: start.height + pointer.clientY - startY }
      : { ...start, left: start.left + pointer.clientX - startX, top: start.top + pointer.clientY - startY };
    if (!resizing) {
      const resisted = resistAreaBoundaries(candidate, candidate, gate);
      candidate.left = resisted.left;
      candidate.top = resisted.top;
    } else {
      const raw = { ...candidate, right: candidate.left + candidate.width, bottom: candidate.top + candidate.height };
      dockEdges.forEach(edge => {
        const lane = baseDockLaneRects.get(edge);
        if (!lane || gate.passed.has(edge)) return;
        const pressure = areaBoundaryPenetration(edge, raw, lane);
        if (pressure >= gate.threshold) gate.passed.add(edge);
        else if (pressure > 0) {
          if (edge === "right") candidate.width = lane.left - start.left - AREA_BOUNDARY_INSET;
          if (edge === "bottom") candidate.height = lane.top - start.top - AREA_BOUNDARY_INSET;
        }
      });
    }
    const metadata = tileSession().floating[name];
    const geometry = applyFloatingGeometry(name, candidate);
    tileSession().floating[name] = { ...metadata, ...geometry };
    delete tileSession().floating[name].excludeAreas;
    updateFloatingYield(name, gate);
    saveTileSessions();
    queueDesktopStateBroadcast(80);
  };
  const finish = pointer => {
    frame.classList.remove("is-dragging", "is-resizing");
    manualWindowInteraction = false;
    setAreaBoundaryFeedback(null);
    tileInteraction = false;
    if (moved && pointer.type === "pointercancel") {
      if (priorFloating) tileSession().floating[name] = priorFloating;
      else { delete tileSession().floating[name]; splitWindowIntoTile(name); }
    } else if (moved) {
      const target = displayTransferTarget(pointer.clientX);
      if (target) transferAppToDisplay(name, target, pointer.clientX < window.innerWidth / 2 ? "left" : "right", screenWindowRect(frame));
    }
    saveTileSessions();
    refreshIntentAreas();
    renderTileLayout(name);
    queueDesktopStateBroadcast(0);
  };
  const recapture = trackWindowPointer(event, handle, move, finish, resizing ? null : { name });
}

function bindWindowDrag(frame) {
  const titlebar = $(".app-titlebar", frame);
  titlebar.addEventListener("pointerdown", event => {
    if ((event.button === 1 || (event.button === 0 && event.altKey)) && !event.target.closest("button,input,a")) {
      beginManualWindowInteraction(event, frame, titlebar);
      return;
    }
    if (event.button !== 0 || event.target.closest("button,input,a")) return;
    cancelWindowPointerInteraction?.();
    event.preventDefault();
    const name = frame.dataset.appFrame;
    if (tileSession().fullscreen?.name === name) toggleAppFullscreen(name);
    autoTiledWindows.delete(name);
    bringToFront(name);
    tileInteraction = true;
    let hasMoved = false;

    const startGeometry = readGeometry(frame);
    const startRect = frame.getBoundingClientRect();
    const offsetX = event.clientX - startRect.left;
    const offsetY = event.clientY - startRect.top;
    const appsZone = $(".apps-zone");
    const workspace = $(".workspace-zone");
    const boundaryGate = { threshold: AREA_BOUNDARY_RESISTANCE, passed: new Set(), stages: new Map(), baselines: new Map() };
    if (layoutMode === "auto") {
      dockEdges.forEach(edge => {
        const lane = baseDockLaneRects.get(edge);
        boundaryGate.stages.set(edge, areaBoundaryStage(edge));
        boundaryGate.baselines.set(edge, 0);
        if (lane && areaBoundaryPenetration(edge, startRect, lane) > 0) boundaryGate.passed.add(edge);
      });
    }
    frame.classList.add("is-dragging");
    frame.style.left = startRect.left + "px";
    frame.style.top = startRect.top + "px";
    frame.style.width = startRect.width + "px";
    frame.style.height = startRect.height + "px";

    const move = (moveEvent, force = false) => {
      if (!hasMoved) {
        if (!force && Math.hypot(moveEvent.clientX - event.clientX, moveEvent.clientY - event.clientY) < 6) return;
        hasMoved = true;
        releaseBorrowedApp(name);
        if (frame.dataset.maximized === "true") focusTileWindow(name);
      }
      const position = resistAreaBoundaries({
        left: moveEvent.clientX - offsetX,
        top: moveEvent.clientY - offsetY
      }, { width: startRect.width, height: startRect.height }, boundaryGate, moveEvent.altKey);
      frame.style.left = position.left + "px";
      frame.style.top = position.top + "px";
      showTileDropPreview(name, { x: moveEvent.clientX, y: moveEvent.clientY });
      if (layoutMode === "auto") {
        const movingRect = frame.getBoundingClientRect();
        if (!position.resisted) refreshSpatialAutoLayout(frame, movingRect);
        setDropTarget(appsZone, false);
        setDropTarget(workspace, true);
      } else {
        setDropTarget(appsZone, pointInside(appsZone.getBoundingClientRect(), moveEvent.clientX, moveEvent.clientY));
        setDropTarget(workspace, pointInside(workspace.getBoundingClientRect(), moveEvent.clientX, moveEvent.clientY));
      }
    };

    const finish = upEvent => {
      setDropTarget(appsZone, false);
      setDropTarget(workspace, false);
      setAreaBoundaryFeedback(null);
      clearTileDropPreview();
      tileInteraction = false;
      const parked = pointInside(appsZone.getBoundingClientRect(), upEvent.clientX, upEvent.clientY);
      const finalRect = frame.getBoundingClientRect();
      frame.classList.remove("is-dragging");
      frame.style.position = "";
      if (!hasMoved || upEvent.type === "pointercancel") {
        renderTileLayout(name);
        return;
      }
      const transferTarget = displayTransferTarget(upEvent.clientX);
      if (transferTarget) {
        transferAppToDisplay(name, transferTarget, upEvent.clientX < window.innerWidth / 2 ? "left" : "right", finalRect);
        return;
      }
      if (parked) {
        windowGeometry.set(name, startGeometry);
        saveLayout();
        frame.style.left = "";
        frame.style.top = "";
        frame.style.width = "";
        frame.style.height = "";
        minimizeApp(name, true);
        showToast(appInfo[name].label + " parked in Apps");
        return;
      }
      splitWindowIntoTile(name, { x: upEvent.clientX, y: upEvent.clientY });
      if (layoutMode === "auto") scheduleSpatialAutoLayout();
    };

    trackWindowPointer(event, titlebar, move, finish, { name });
  });
}

function bindResize(frame) {
  const handle = document.createElement("button");
  handle.className = "resize-handle";
  handle.type = "button";
  handle.setAttribute("aria-label", "Resize " + appInfo[frame.dataset.appFrame].label);
  handle.title = "Drag to resize";
  frame.append(handle);

  handle.addEventListener("pointerdown", event => {
    if (event.button === 1 || (event.button === 0 && event.altKey) || (event.button === 0 && frame.classList.contains("is-floating"))) {
      beginManualWindowInteraction(event, frame, handle, true);
      return;
    }
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const name = frame.dataset.appFrame;
    if (frame.classList.contains("is-tiled")) {
      beginTileWindowResize(event, name, handle);
      return;
    }
    autoTiledWindows.delete(name);
    bringToFront(name);
    if (frame.dataset.maximized === "true") toggleMaximize(name);
    const start = readGeometry(frame);
    const startX = event.clientX;
    const startY = event.clientY;
    handle.setPointerCapture(event.pointerId);
    frame.classList.add("is-resizing");

    const move = moveEvent => {
      applyGeometry(name, {
        ...start,
        width: start.width + moveEvent.clientX - startX,
        height: start.height + moveEvent.clientY - startY
      }, false);
      if (layoutMode === "auto") refreshSpatialAutoLayout(frame, frame.getBoundingClientRect());
    };
    const finish = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      frame.classList.remove("is-resizing");
      windowGeometry.set(name, readGeometry(frame));
      saveLayout();
      if (layoutMode === "auto") scheduleSpatialAutoLayout();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function bindMiniDrag(card) {
  const header = $("header", card);
  header.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button,input")) return;
    const name = card.dataset.miniCard;
    const startX = event.clientX;
    const startY = event.clientY;
    let ghost = null;
    header.setPointerCapture(event.pointerId);

    const move = moveEvent => {
      if (!ghost && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 6) {
        ghost = card.cloneNode(true);
        ghost.classList.add("drag-ghost");
        ghost.setAttribute("aria-hidden", "true");
        ghost.style.width = card.getBoundingClientRect().width + "px";
        document.body.append(ghost);
      }
      if (!ghost) return;
      ghost.style.left = moveEvent.clientX - 35 + "px";
      ghost.style.top = moveEvent.clientY - 24 + "px";
      const workspace = $(".workspace-zone");
      showTileDropPreview(name, { x: moveEvent.clientX, y: moveEvent.clientY });
      setDropTarget(workspace, pointInside(workspace.getBoundingClientRect(), moveEvent.clientX, moveEvent.clientY));
    };

    const finish = upEvent => {
      header.removeEventListener("pointermove", move);
      header.removeEventListener("pointerup", finish);
      header.removeEventListener("pointercancel", finish);
      const workspace = $(".workspace-zone");
      setDropTarget(workspace, false);
      clearTileDropPreview();
      if (ghost) ghost.remove();
      if (pointInside(workspace.getBoundingClientRect(), upEvent.clientX, upEvent.clientY)) {
        openApp(name, { x: upEvent.clientX, y: upEvent.clientY });
        showToast(appInfo[name].label + " unparked onto desktop");
      }
    };
    header.addEventListener("pointermove", move);
    header.addEventListener("pointerup", finish);
    header.addEventListener("pointercancel", finish);
  });
}

const zoneLayout = { apps: .25, systems: .25 };
let zoneFitFrame;

function zoneLimits() {
  const shell = $(".desktop-shell");
  const width = shell.clientWidth;
  return {
    shell,
    width,
    minApps: Math.max(200, width * .15),
    minSystems: Math.max(220, width * .15),
    maxSide: width * .45,
    minWorkspace: Math.min(520, width * .43)
  };
}

function fittedZonePixels() {
  const limits = zoneLimits();
  let apps = Math.min(limits.maxSide, Math.max(limits.minApps, zoneLayout.apps * limits.width));
  let systems = Math.min(limits.maxSide, Math.max(limits.minSystems, zoneLayout.systems * limits.width));
  const available = limits.width - limits.minWorkspace;
  const overflow = apps + systems - available;
  if (overflow > 0) {
    const appsRoom = Math.max(0, apps - limits.minApps);
    const systemsRoom = Math.max(0, systems - limits.minSystems);
    const room = appsRoom + systemsRoom;
    if (room > 0) {
      apps -= overflow * appsRoom / room;
      systems -= overflow * systemsRoom / room;
    }
  }
  return { ...limits, apps, systems };
}

function scheduleWindowFit() {
  cancelAnimationFrame(zoneFitFrame);
  zoneFitFrame = requestAnimationFrame(() => {
    $$("[data-app-frame]").forEach(frame => {
      if (frame.hidden || frame.classList.contains("is-dragging")) return;
      const current = readGeometry(frame);
      const fitted = clampGeometry(current, frame.dataset.appFrame);
      const changed = ["x", "y", "width", "height"].some(key => Math.abs(current[key] - fitted[key]) > 1);
      if (changed) {
        applyGeometry(frame.dataset.appFrame, fitted, false);
        windowGeometry.set(frame.dataset.appFrame, fitted);
      }
    });
    saveLayout();
  });
}

function updateZoneAccessibility(apps, systems, width) {
  const limits = zoneLimits();
  const appsPercent = Math.round(apps / width * 100);
  const systemsPercent = Math.round(systems / width * 100);
  const workspacePercent = Math.max(0, 100 - appsPercent - systemsPercent);
  const left = $('[data-zone-resizer="apps"]');
  const right = $('[data-zone-resizer="systems"]');
  left.setAttribute("aria-valuemin", Math.round(limits.minApps / width * 100));
  left.setAttribute("aria-valuemax", Math.round(limits.maxSide / width * 100));
  left.setAttribute("aria-valuenow", appsPercent);
  left.setAttribute("aria-valuetext", "Apps " + appsPercent + "%, Workspace " + workspacePercent + "%");
  right.setAttribute("aria-valuemin", Math.round(limits.minSystems / width * 100));
  right.setAttribute("aria-valuemax", Math.round(limits.maxSide / width * 100));
  right.setAttribute("aria-valuenow", systemsPercent);
  right.setAttribute("aria-valuetext", "Systems " + systemsPercent + "%, Workspace " + workspacePercent + "%");
}

function applyZoneLayout(save = false) {
  const fitted = fittedZonePixels();
  fitted.shell.style.setProperty("--apps-width", fitted.apps + "px");
  fitted.shell.style.setProperty("--systems-width", fitted.systems + "px");
  zoneLayout.apps = fitted.apps / fitted.width;
  zoneLayout.systems = fitted.systems / fitted.width;
  updateZoneAccessibility(fitted.apps, fitted.systems, fitted.width);
  scheduleWindowFit();
  if (save) {
    try {
      desktopStorage.setItem("spatial-zone-layout-v1", JSON.stringify(zoneLayout));
    } catch {}
  }
}

function setZonePixels(which, requestedPixels, save = false) {
  const fitted = fittedZonePixels();
  if (which === "apps") {
    const max = Math.min(fitted.maxSide, fitted.width - fitted.systems - fitted.minWorkspace);
    zoneLayout.apps = Math.max(fitted.minApps, Math.min(requestedPixels, max)) / fitted.width;
  } else {
    const max = Math.min(fitted.maxSide, fitted.width - fitted.apps - fitted.minWorkspace);
    zoneLayout.systems = Math.max(fitted.minSystems, Math.min(requestedPixels, max)) / fitted.width;
  }
  applyZoneLayout(save);
}

function resetZoneLayout() {
  zoneLayout.apps = .25;
  zoneLayout.systems = .25;
  applyZoneLayout(true);
  showToast("Areas reset to 25 / 50 / 25");
}

function prepareZoneResizers() {
  try {
    const saved = JSON.parse(desktopStorage.getItem("spatial-zone-layout-v1") || "null");
    if (saved && Number.isFinite(saved.apps) && Number.isFinite(saved.systems)) {
      zoneLayout.apps = saved.apps;
      zoneLayout.systems = saved.systems;
    }
  } catch {}
  applyZoneLayout(false);

  $$("[data-zone-resizer]").forEach(resizer => {
    const which = resizer.dataset.zoneResizer;
    resizer.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      const shell = $(".desktop-shell");
      resizer.setPointerCapture(event.pointerId);
      resizer.classList.add("is-dragging");
      shell.classList.add("is-resizing");

      const move = moveEvent => {
        const rect = shell.getBoundingClientRect();
        const requested = which === "apps" ? moveEvent.clientX - rect.left : rect.right - moveEvent.clientX;
        setZonePixels(which, requested, false);
      };
      const finish = () => {
        resizer.removeEventListener("pointermove", move);
        resizer.removeEventListener("pointerup", finish);
        resizer.removeEventListener("pointercancel", finish);
        resizer.classList.remove("is-dragging");
        shell.classList.remove("is-resizing");
        applyZoneLayout(true);
      };
      resizer.addEventListener("pointermove", move);
      resizer.addEventListener("pointerup", finish);
      resizer.addEventListener("pointercancel", finish);
    });

    resizer.addEventListener("keydown", event => {
      const step = event.shiftKey ? 40 : 16;
      let direction = 0;
      if (event.key === "ArrowLeft") direction = which === "apps" ? -1 : 1;
      if (event.key === "ArrowRight") direction = which === "apps" ? 1 : -1;
      if (event.key === "Home") {
        event.preventDefault();
        resetZoneLayout();
        return;
      }
      if (!direction) return;
      event.preventDefault();
      const fitted = fittedZonePixels();
      setZonePixels(which, fitted[which] + direction * step, true);
    });
    resizer.addEventListener("dblclick", event => {
      event.preventDefault();
      resetZoneLayout();
    });
  });
}

const areaPriority = ["projects", "apps", "systems"];
const persistentAreas = new Set(["projects", "apps", "systems"]);
const dockEdges = ["left", "right", "top", "bottom"];
const dockState = {
  projects: { edge: "left", order: 0 },
  apps: { edge: "right", order: 0 },
  systems: { edge: "right", order: 1 }
};
const dockSizes = { left: 310, right: 300, top: 250, bottom: 250 };
const dockSizeManual = { left: false, right: false, top: false, bottom: false };
let dockPreview;
// Bounded split tiling owns the space BETWEEN Areas, never their geometry.
// Old saved Auto sessions are treated as Manual without resetting dock sizes,
// positions, visibility, or explicit display assignments.
const layoutModes = tileEngine ? ["manual"] : ["auto", "manual"];
let layoutMode = tileEngine ? "manual" : "auto";
function areasFollowWindows() {
  return !tileEngine && layoutMode === "auto";
}
let currentDisplayProfile = "desktop";
let lastDesktopPointerX = window.innerWidth / 2;
const autoWindowAvoidance = new Map();
const baseDockLaneRects = new Map();
const autoSpatialEdgeStates = new Map();
let systemRailExpansion = null;
let baseWorkspaceInsets = { left: 0, right: 0, bottom: 0, top: 0 };
let autoAvoidanceSource = null;
let spatialLayoutFrame = 0;
let windowViewportLockReady = false;
let suspendWindowViewportLock = false;
let windowViewportSaveTimer = 0;
const workspaceAreaSessions = Object.create(null);
let defaultAreaSession = null;

function areaFor(name) {
  return document.querySelector('[data-area-window="' + name + '"]');
}

function areaCanBeHidden(name) {
  return !persistentAreas.has(name);
}

function keepPersistentAreasVisible() {
  persistentAreas.forEach(name => {
    const area = areaFor(name);
    if (area) area.hidden = false;
  });
}

function areaLabel(name) {
  return name === "projects" ? "Project Space" : name === "apps" ? "Apps" : "System";
}

function dockGroup(edge, includeHidden = false) {
  return areaPriority
    .filter(name => isLocalArea(name) && dockState[name].edge === edge && (includeHidden || !areaFor(name)?.hidden))
    .sort((a, b) => dockState[a].order - dockState[b].order || areaPriority.indexOf(a) - areaPriority.indexOf(b));
}

function normalizeDockOrder(edge) {
  dockGroup(edge, true).forEach((name, order) => { dockState[name].order = order; });
}

function snapshotAreaLayout() {
  const hidden = Object.fromEntries(areaPriority.map(name => [name, areaCanBeHidden(name) && Boolean(areaFor(name)?.hidden)]));
  return {
    state: Object.fromEntries(areaPriority.map(name => [name, { ...dockState[name] }])),
    sizes: { ...dockSizes },
    hidden,
    manual: { ...dockSizeManual },
    layoutMode
  };
}

function persistAreaSessions() {
  try {
    desktopStorage.setItem("spatial-workspace-area-layouts-v1", JSON.stringify(workspaceAreaSessions));
  } catch {}
}

function saveAreaLayout() {
  workspaceAreaSessions[activeWorkspace] = snapshotAreaLayout();
  persistAreaSessions();
}

function applyAreaSession(workspaceName) {
  const source = workspaceAreaSessions[workspaceName] || defaultAreaSession || snapshotAreaLayout();
  const saved = JSON.parse(JSON.stringify(source));
  saved.hidden ||= {};
  persistentAreas.forEach(name => { saved.hidden[name] = false; });
  workspaceAreaSessions[workspaceName] = saved;
  if (saved.state) areaPriority.forEach(name => {
    if (dockEdges.includes(saved.state[name]?.edge)) {
      dockState[name] = { edge: saved.state[name].edge, order: Number(saved.state[name].order) || 0 };
    }
  });
  if (saved.sizes) dockEdges.forEach(edge => {
    if (Number.isFinite(saved.sizes[edge])) dockSizes[edge] = saved.sizes[edge];
  });
  if (saved.hidden) areaPriority.forEach(name => {
    if (areaFor(name)) areaFor(name).hidden = Boolean(saved.hidden[name]);
  });
  if (saved.manual) dockEdges.forEach(edge => { dockSizeManual[edge] = Boolean(saved.manual[edge]); });
  layoutMode = layoutModes.includes(saved.layoutMode) ? saved.layoutMode : layoutModes[0];
  dockEdges.forEach(normalizeDockOrder);
  autoSpatialEdgeStates.clear();
  autoWindowAvoidance.clear();
  autoAvoidanceSource = null;
  layoutDockAreas(false, false);
  applyAutoAvoidance();
  refreshIntentAreas();
}

function captureVisibleWindowViewportRects() {
  const snapshot = new Map();
  if (!windowViewportLockReady || suspendWindowViewportLock) return snapshot;
  $$('[data-app-frame]').forEach(frame => {
    const name = frame.dataset.appFrame;
    if (frame.hidden || appState[name] !== "open" || frame.classList.contains("is-tiled") || frame.classList.contains("is-fullscreen") || frame.classList.contains("is-dragging") || frame.classList.contains("is-resizing")) return;
    const rect = frame.getBoundingClientRect();
    snapshot.set(name, { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  });
  return snapshot;
}

function restoreWindowViewportRects(snapshot) {
  if (!snapshot.size) return;
  const workspaceRect = $(".workspace-zone").getBoundingClientRect();
  snapshot.forEach((rect, name) => {
    const frame = frameFor(name);
    if (!frame || frame.hidden || frame.classList.contains("is-dragging") || frame.classList.contains("is-resizing")) return;
    // Floats are fixed to the screen, not positioned inside the workspace.
    // Subtracting Area insets here made them jump whenever an Area yielded.
    if (frame.classList.contains("is-floating")) {
      const session = tileSession();
      session.floating[name] = applyFloatingGeometry(name, { ...session.floating[name], ...rect });
      return;
    }
    const geometry = {
      x: rect.left - workspaceRect.left,
      y: rect.top - workspaceRect.top,
      width: rect.width,
      height: rect.height
    };
    frame.style.left = geometry.x + "px";
    frame.style.top = geometry.y + "px";
    frame.style.width = geometry.width + "px";
    frame.style.height = geometry.height + "px";
    windowGeometry.set(name, geometry);
  });
  clearTimeout(windowViewportSaveTimer);
  windowViewportSaveTimer = setTimeout(saveLayout, 120);
}

function setWorkspaceInsets(left, right, bottom, top = 12) {
  const shell = $(".desktop-shell");
  const workspace = $(".workspace-zone");
  const windowSnapshot = captureVisibleWindowViewportRects();
  const previousTransition = workspace.style.transition;
  if (windowSnapshot.size) workspace.style.transition = "none";
  shell.style.setProperty("--workspace-left", left + "px");
  shell.style.setProperty("--workspace-right", right + "px");
  shell.style.setProperty("--workspace-bottom", bottom + "px");
  shell.style.setProperty("--workspace-top", top + "px");
  if (windowSnapshot.size) {
    void workspace.offsetWidth;
    restoreWindowViewportRects(windowSnapshot);
    void workspace.offsetWidth;
    workspace.style.transition = previousTransition;
  }
  if (windowViewportLockReady && !tileRendering && !tileInteraction) scheduleWindowTiling();
}

function edgePriority(edge) {
  const priorities = dockGroup(edge).map(name => areaPriority.indexOf(name));
  return priorities.length ? Math.min(...priorities) : Infinity;
}

function displayProfileFor(width, height) {
  const ratio = width / Math.max(1, height);
  if (ratio >= 2.75 && width >= 2200) return "dual";
  if (ratio >= 2.05 || width >= 2100) return "ultrawide";
  if (width <= 1180 || height <= 700) return "laptop";
  return "desktop";
}

function areaStateForSize(edge, size) {
  const vertical = edge === "left" || edge === "right";
  return size <= (vertical ? 152 : 142) ? "rail" : "expanded";
}

function initialAreaStates(profile) {
  let states;
  if (!areasFollowWindows()) {
    states = { projects: "expanded", apps: "expanded", systems: "expanded" };
    areaPriority.forEach(name => {
      const edge = dockState[name].edge;
      states[name] = areaStateForSize(edge, dockSizes[edge]);
      if (intentAreaPlan.rails[name]) states[name] = "rail";
    });
    return states;
  }
  if (profile === "laptop") states = {
    projects: "expanded",
    apps: areaFor("projects")?.hidden ? "expanded" : "rail",
    systems: "rail"
  };
  else if (profile === "desktop") states = { projects: "expanded", apps: "expanded", systems: "expanded" };
  else states = { projects: "expanded", apps: "expanded", systems: "expanded" };
  autoSpatialEdgeStates.forEach((state, edge) => {
    dockGroup(edge, true).forEach(name => { states[name] = state; });
  });
  return states;
}

function stateSideMinimum(name, state) {
  const values = {
    projects: { rail: 68, expanded: 270 },
    apps: { rail: 68, expanded: 256 },
    systems: { rail: 70, expanded: 280 }
  };
  return values[name][state];
}

function stateHorizontalMinimum(name, state) {
  if (state === "rail") return 64;
  return name === "projects" ? 280 : name === "apps" ? 250 : 190;
}

function edgeStateMinimum(edge, states) {
  const names = dockGroup(edge);
  if (!names.length) return 0;
  const vertical = edge === "left" || edge === "right";
  return Math.max(...names.map(name => vertical ? stateSideMinimum(name, states[name]) : stateHorizontalMinimum(name, states[name])));
}

function preferredSideSize(edge, states, profile) {
  const names = dockGroup(edge);
  if (!names.length) return 0;
  const minimum = edgeStateMinimum(edge, states);
  if (names.every(name => states[name] === "rail")) return minimum;
  return Math.min(420, Math.max(minimum, dockSizes[edge]));
}

function downgradeArea(states, name) {
  if (states[name] !== "expanded") return false;
  states[name] = "rail";
  return true;
}

function resolvedManualDockSizes(states) {
  const sizes = { ...dockSizes };
  dockEdges.forEach(edge => {
    const names = dockGroup(edge);
    if (!names.length) return;
    const minimum = edgeStateMinimum(edge, states);
    sizes[edge] = names.every(name => states[name] === "rail")
      ? minimum
      : Math.max(minimum, dockSizes[edge]);
  });
  return sizes;
}

function minimumWorkspaceWidth(profile, width) {
  if (profile === "dual") return Math.min(width * .56, 1780);
  if (profile === "ultrawide") return Math.min(width * .56, 1340);
  if (profile === "laptop") return Math.min(620, width * .57);
  return Math.min(820, width * .54);
}

function resolvedAreaLayout(width, height) {
  const profile = displayProfileFor(width, height);
  const states = initialAreaStates(profile);
  if (!areasFollowWindows()) {
    return { profile, states, sizes: resolvedManualDockSizes(states), minimumWorkspace: 220 };
  }
  const gap = 0;
  const minimumWorkspace = minimumWorkspaceWidth(profile, width);
  const sideWidth = edge => preferredSideSize(edge, states, profile);
  const occupiedSides = () => ["left", "right"].filter(edge => dockGroup(edge).length);
  const required = () => occupiedSides().reduce((sum, edge) => sum + sideWidth(edge), 0) + (occupiedSides().length + 1) * gap + minimumWorkspace;

  ["systems", "apps", "projects"].forEach(name => {
    while (required() > width && downgradeArea(states, name)) {}
  });

  const sizes = { ...dockSizes };
  sizes.left = sideWidth("left");
  sizes.right = sideWidth("right");
  sizes.top = Math.min(340, Math.max(edgeStateMinimum("top", states), dockSizes.top));
  sizes.bottom = Math.min(340, Math.max(edgeStateMinimum("bottom", states), dockSizes.bottom));

  let overflow = sizes.left + sizes.right + (occupiedSides().length + 1) * gap + minimumWorkspace - width;
  ["right", "left"].sort((a, b) => edgePriority(b) - edgePriority(a)).forEach(edge => {
    if (overflow <= 0 || !dockGroup(edge).length) return;
    const minimum = edgeStateMinimum(edge, states);
    const reduction = Math.min(overflow, Math.max(0, sizes[edge] - minimum));
    sizes[edge] -= reduction;
    overflow -= reduction;
  });
  return { profile, states, sizes, minimumWorkspace };
}

function layoutStateLabel(state) {
  return state === "rail" ? "On rail" : "Expanded";
}

function syncAreaControls(states) {
  areaPriority.forEach(name => {
    const area = areaFor(name);
    const hidden = Boolean(area?.hidden);
    $$('[data-overview-area-visibility="' + name + '"]').forEach(button => {
      button.textContent = hidden ? "Show" : "Hide";
      button.classList.toggle("is-show", hidden);
      button.setAttribute("aria-label", (hidden ? "Show " : "Hide ") + areaLabel(name));
    });
    const row = $('[data-overview-area="' + name + '"]');
    if (row) {
      if (name === "projects") row.hidden = false;
      row.classList.toggle("is-hidden", hidden);
      const detail = $("small", row);
      if (detail) detail.textContent = hidden ? "Closed" : layoutStateLabel(states[name]);
    }
  });
}

function syncLayoutModeUI(profile = currentDisplayProfile) {
  const borrowed = Object.keys(intentAreaPlan.moves).length || Object.keys(intentAreaPlan.rails).length;
  const modeLabel = tileEngine ? (borrowed ? "Adapted" : "Fixed") : layoutMode[0].toUpperCase() + layoutMode.slice(1);
  const profileLabel = extendedDesktopActive()
    ? "Extended · " + localDisplayRoleLabel()
    : profile === "dual" ? "Dual display" : profile === "ultrawide" ? "Ultrawide" : profile === "laptop" ? "Laptop" : "Desktop";
  const control = $("#layoutModeToggle");
  if (control) {
    $("span", control).textContent = "Areas: " + modeLabel;
    control.classList.toggle("is-active", areasFollowWindows());
    if (control.matches("button")) control.setAttribute("aria-pressed", String(areasFollowWindows()));
    control.title = tileEngine
      ? "Left drag keeps Areas fixed · middle drag and Full fullscreen may borrow Area space · " + profileLabel
      : layoutMode === "auto"
      ? "Auto · Areas expand, move onto the rail, yield, or move according to nearby windows · " + profileLabel
      : "Manual · Areas stay exactly where you place them · " + profileLabel;
  }
  const status = $("#overviewLayoutStatus");
  if (status) status.textContent = modeLabel + " · " + profileLabel;
}

function fitOpposingDockSizes(firstEdge, secondEdge, available, minimumWorkspace, minimumDock) {
  const occupied = [firstEdge, secondEdge].filter(edge => dockGroup(edge).length);
  if (!occupied.length) return;
  let overflow = occupied.reduce((sum, edge) => sum + dockSizes[edge], 0) + minimumWorkspace - available;
  occupied.sort((a, b) => edgePriority(b) - edgePriority(a)).forEach(edge => {
    if (overflow <= 0) return;
    const reduction = Math.min(overflow, Math.max(0, dockSizes[edge] - minimumDock));
    dockSizes[edge] -= reduction;
    overflow -= reduction;
  });
}

function applyDockRect(name, rect) {
  const area = areaFor(name);
  if (!area) return;
  area.dataset.dockEdge = dockState[name].edge;
  area.dataset.areaJoinEdge = rect.joinEdge || "none";
  area.style.left = Math.round(rect.x) + "px";
  area.style.top = Math.round(rect.y) + "px";
  area.style.width = Math.round(rect.width) + "px";
  area.style.height = Math.round(rect.height) + "px";
  area.style.right = "auto";
  area.style.bottom = "auto";
  area.style.zIndex = String(220 + areaPriority.length - areaPriority.indexOf(name));
  const cycle = $('[data-area-auto]', area);
  if (cycle) {
    cycle.title = "Move dock — currently " + dockState[name].edge;
    cycle.setAttribute("aria-label", "Move " + areaLabel(name) + " dock from " + dockState[name].edge);
  }
}

function captureBaseDockLaneRects() {
  const shellRect = $(".desktop-shell").getBoundingClientRect();
  baseDockLaneRects.clear();
  dockEdges.forEach(edge => {
    const names = dockGroup(edge);
    if (!names.length) return;
    const rects = names.map(name => {
      const area = areaFor(name);
      const left = shellRect.left + (parseFloat(area.style.left) || 0);
      const top = shellRect.top + (parseFloat(area.style.top) || 0);
      const width = parseFloat(area.style.width) || area.offsetWidth;
      const height = parseFloat(area.style.height) || area.offsetHeight;
      return { left, top, right: left + width, bottom: top + height, width, height };
    });
    const left = Math.min(...rects.map(rect => rect.left));
    const top = Math.min(...rects.map(rect => rect.top));
    const right = Math.max(...rects.map(rect => rect.right));
    const bottom = Math.max(...rects.map(rect => rect.bottom));
    baseDockLaneRects.set(edge, { left, top, right, bottom, width: right - left, height: bottom - top });
  });
}

function rectanglesOverlap(first, second, inset = 0) {
  return first.left < second.right - inset && first.right > second.left + inset && first.top < second.bottom - inset && first.bottom > second.top + inset;
}

function edgeMinimumForState(edge, state) {
  const names = dockGroup(edge);
  if (!names.length) return 0;
  const states = Object.fromEntries(areaPriority.map(name => [name, state]));
  return edgeStateMinimum(edge, states);
}

function clearanceFromEdge(edge, rect, shellRect) {
  if (edge === "left") return rect.left - shellRect.left;
  if (edge === "right") return shellRect.right - rect.right;
  if (edge === "top") return rect.top - shellRect.top;
  return shellRect.bottom - rect.bottom;
}

function spatialStateForClearance(edge, clearance) {
  const expanded = edgeMinimumForState(edge, "expanded");
  const visibleArea = areaFor(dockGroup(edge)[0]);
  const previousState = autoSpatialEdgeStates.get(edge) || visibleArea?.dataset.areaState;
  const previous = previousState === "rail" ? "rail" : "expanded";
  const lane = baseDockLaneRects.get(edge);
  const visibleBoundary = lane ? (edge === "left" || edge === "right" ? lane.width : lane.height) : 0;
  if (previous === "expanded") {
    if (clearance >= (visibleBoundary || expanded + 18)) return "expanded";
    return "rail";
  }
  if (previous === "rail") {
    if (clearance >= expanded + 60) return "expanded";
    return "rail";
  }
  if (clearance >= expanded + 48) return "expanded";
  return "rail";
}

function contextWindowRects(sourceFrame = null, sourceRect = null) {
  return $$('[data-app-frame]').filter(frame => !frame.hidden && appState[frame.dataset.appFrame] === "open").map(frame => ({
    frame,
    rect: frame === sourceFrame && sourceRect ? sourceRect : frame.getBoundingClientRect()
  }));
}

function refreshSpatialAutoLayout(sourceFrame = null, sourceRect = null) {
  if (!areasFollowWindows()) return;
  const shellRect = $(".desktop-shell").getBoundingClientRect();
  const windows = contextWindowRects(sourceFrame, sourceRect);
  let stateChanged = false;

  dockEdges.forEach(edge => {
    if (!dockGroup(edge).length) {
      if (autoSpatialEdgeStates.delete(edge)) stateChanged = true;
      return;
    }
    const clearance = windows.length
      ? Math.min(...windows.map(item => clearanceFromEdge(edge, item.rect, shellRect)))
      : Infinity;
    const nextState = spatialStateForClearance(edge, clearance);
    if (autoSpatialEdgeStates.get(edge) !== nextState) {
      autoSpatialEdgeStates.set(edge, nextState);
      stateChanged = true;
    }
  });

  if (stateChanged) layoutDockAreas(false, false);

  windows.forEach(({ frame, rect }) => {
    if (frame.dataset.maximized === "true") return;
    const edges = dockEdges.filter(edge => {
      if (!dockGroup(edge).length) return false;
      const lane = baseDockLaneRects.get(edge);
      const visibleThickness = lane
        ? (edge === "left" || edge === "right" ? lane.width : lane.height)
        : edgeMinimumForState(edge, "rail");
      return clearanceFromEdge(edge, rect, shellRect) < Math.max(0, visibleThickness - 2);
    });
    if (edges.length) autoWindowAvoidance.set(frame.dataset.appFrame, new Set(edges));
    else autoWindowAvoidance.delete(frame.dataset.appFrame);
  });
  autoAvoidanceSource = sourceFrame;
  applyAutoAvoidance();
}

function scheduleSpatialAutoLayout() {
  cancelAnimationFrame(spatialLayoutFrame);
  spatialLayoutFrame = requestAnimationFrame(() => refreshSpatialAutoLayout());
}

function desiredAutoEdges() {
  const edges = new Set();
  if (!areasFollowWindows()) return edges;
  autoWindowAvoidance.forEach(windowEdges => windowEdges.forEach(edge => edges.add(edge)));
  return edges;
}

function relocationShiftFor(edge, sourceFrame, desiredEdges) {
  if (currentDisplayProfile !== "dual" || !["left", "right"].includes(edge)) return 0;
  const lane = baseDockLaneRects.get(edge);
  const shellRect = $(".desktop-shell").getBoundingClientRect();
  if (!lane || !shellRect.width) return 0;
  const shift = edge === "left" ? shellRect.width / 2 : -shellRect.width / 2;
  const target = { ...lane, left: lane.left + shift, right: lane.right + shift };
  if (target.left < shellRect.left || target.right > shellRect.right) return 0;
  const blockedByArea = dockEdges.some(otherEdge => {
    if (otherEdge === edge || desiredEdges.has(otherEdge)) return false;
    const other = baseDockLaneRects.get(otherEdge);
    return other && rectanglesOverlap(target, other, 8);
  });
  if (blockedByArea) return 0;
  const blockedByWindow = $$('[data-app-frame]').some(frame => {
    if (frame === sourceFrame || frame.hidden || appState[frame.dataset.appFrame] !== "open") return false;
    return rectanglesOverlap(target, frame.getBoundingClientRect(), 12);
  });
  return blockedByWindow ? 0 : shift;
}

function applyAutoAvoidance() {
  const desiredEdges = desiredAutoEdges();
  areaPriority.forEach(name => {
    const area = areaFor(name);
    if (!area) return;
    area.classList.remove("is-auto-yielding", "is-auto-relocated");
    area.style.removeProperty("--auto-relocate-x");
    delete area.dataset.autoBehavior;
  });

  desiredEdges.forEach(edge => {
    const shift = relocationShiftFor(edge, autoAvoidanceSource, desiredEdges);
    dockGroup(edge).forEach(name => {
      const area = areaFor(name);
      if (!area) return;
      if (shift) {
        area.classList.add("is-auto-relocated");
        area.style.setProperty("--auto-relocate-x", Math.round(shift) + "px");
        area.dataset.autoBehavior = "moved-to-free-display";
      } else {
        area.classList.add("is-auto-yielding");
        area.dataset.autoBehavior = "yielded-to-window";
      }
    });
  });

  setWorkspaceInsets(
    desiredEdges.has("left") ? 0 : baseWorkspaceInsets.left,
    desiredEdges.has("right") ? 0 : baseWorkspaceInsets.right,
    desiredEdges.has("bottom") ? 0 : baseWorkspaceInsets.bottom,
    desiredEdges.has("top") ? 0 : baseWorkspaceInsets.top
  );
  document.body.classList.toggle("is-auto-avoiding", desiredEdges.size > 0);
}

function setWindowAutoAvoidance(name, edges, sourceFrame = null) {
  if (!areasFollowWindows()) return;
  const next = new Set(edges);
  if (next.size) autoWindowAvoidance.set(name, next);
  else autoWindowAvoidance.delete(name);
  autoAvoidanceSource = sourceFrame;
  applyAutoAvoidance();
}

function clearWindowAutoAvoidance(name) {
  autoWindowAvoidance.delete(name);
  autoAvoidanceSource = null;
  applyAutoAvoidance();
}

function clearAllAutoAvoidance() {
  autoWindowAvoidance.clear();
  autoAvoidanceSource = null;
  applyAutoAvoidance();
}

function freezeCurrentAreaLayout() {
  dockEdges.forEach(edge => {
    const lane = baseDockLaneRects.get(edge);
    if (!lane) return;
    dockSizes[edge] = edge === "left" || edge === "right" ? lane.width : lane.height;
    dockSizeManual[edge] = true;
  });
}

function secondaryAreaCanvasNames() {
  const intentional = intentAreaPlan.canvas[localDisplaySlot()];
  if (intentional?.length) return intentional.filter(name => isLocalArea(name) && !areaFor(name)?.hidden);
  if (!areasFollowWindows() || !extendedDesktopActive() || localDisplaySlot() === 1) return [];
  const hasLocalWindow = Object.keys(appState).some(name => appState[name] === "open" && isLocalApp(name));
  if (hasLocalWindow) return [];
  return areaPriority.filter(name => isLocalArea(name) && !areaFor(name)?.hidden);
}

function applySecondaryAreaCanvas(names, width, height) {
  const padding = 8;
  const gap = 8;
  const usableWidth = Math.max(220, width - padding * 2);
  const usableHeight = Math.max(220, height - padding * 2);
  const place = (name, x, y, areaWidth, areaHeight) => {
    applyDockRect(name, {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(areaWidth),
      height: Math.round(areaHeight)
    });
  };

  if (names.length === 1) {
    place(names[0], padding, padding, usableWidth, usableHeight);
  } else if (names.length === 2) {
    if (width >= height * 1.15) {
      const firstWidth = Math.round((usableWidth - gap) * (names[0] === "projects" ? .54 : .5));
      place(names[0], padding, padding, firstWidth, usableHeight);
      place(names[1], padding + firstWidth + gap, padding, usableWidth - firstWidth - gap, usableHeight);
    } else {
      const firstHeight = Math.round((usableHeight - gap) * (names[0] === "projects" ? .54 : .5));
      place(names[0], padding, padding, usableWidth, firstHeight);
      place(names[1], padding, padding + firstHeight + gap, usableWidth, usableHeight - firstHeight - gap);
    }
  } else if (width >= 900) {
    /* A whole monitor is more useful as three persistent full-height lanes
       than as a dashboard stack. Width still reflects the desktop priority:
       Project Space > Apps > System. */
    const available = usableWidth - gap * 2;
    const projectWidth = Math.round(available * .40);
    const appsWidth = Math.round(available * .33);
    const systemWidth = available - projectWidth - appsWidth;
    place(names[0], padding, padding, projectWidth, usableHeight);
    place(names[1], padding + projectWidth + gap, padding, appsWidth, usableHeight);
    place(names[2], padding + projectWidth + appsWidth + gap * 2, padding, systemWidth, usableHeight);
  } else {
    const available = usableHeight - gap * 2;
    const primaryHeight = Math.round(available * .46);
    const appsHeight = Math.round(available * .30);
    place(names[0], padding, padding, usableWidth, primaryHeight);
    place(names[1], padding, padding + primaryHeight + gap, usableWidth, appsHeight);
    place(names[2], padding, padding + primaryHeight + appsHeight + gap * 2, usableWidth, available - primaryHeight - appsHeight);
  }

  baseWorkspaceInsets = { left: 0, right: 0, bottom: 0, top: 0 };
  captureBaseDockLaneRects();
  applyAutoAvoidance();
  document.body.classList.add("secondary-area-canvas", "areas-docked");
  document.body.classList.remove("areas-freeform", "areas-auto");
}

function layoutDockAreas(save = false, fitWindows = true) {
  keepPersistentAreasVisible();
  const shell = $(".desktop-shell");
  const width = shell.clientWidth;
  const height = shell.clientHeight;
  const gap = 0;
  const resolved = resolvedAreaLayout(width, height);
  const effectiveSizes = resolved.sizes;
  const secondaryCanvasNames = secondaryAreaCanvasNames();
  if (secondaryCanvasNames.length) {
    secondaryCanvasNames.forEach(name => { resolved.states[name] = "expanded"; });
  }
  currentDisplayProfile = resolved.profile;
  document.body.dataset.displayProfile = resolved.profile;
  document.body.dataset.layoutMode = layoutMode;
  areaPriority.forEach(name => {
    const area = areaFor(name);
    if (!area) return;
    const state = resolved.states[name];
    area.dataset.areaState = state;
    if (areasFollowWindows()) area.dataset.autoSize = state;
    else delete area.dataset.autoSize;
  });
  syncAreaControls(resolved.states);
  syncLayoutModeUI(resolved.profile);
  if (secondaryCanvasNames.length) {
    applySecondaryAreaCanvas(secondaryCanvasNames, width, height);
    if (save) saveAreaLayout();
    return;
  }
  document.body.classList.remove("secondary-area-canvas");

  const left = dockGroup("left");
  const right = dockGroup("right");
  const top = dockGroup("top");
  const bottom = dockGroup("bottom");
  const leftWidth = left.length ? effectiveSizes.left : 0;
  const rightWidth = right.length ? effectiveSizes.right : 0;
  const topHeight = top.length ? effectiveSizes.top : 0;
  const bottomHeight = bottom.length ? effectiveSizes.bottom : 0;
  const centerLeft = gap + (left.length ? leftWidth + gap : 0);
  const centerRight = width - gap - (right.length ? rightWidth + gap : 0);
  const centerWidth = Math.max(220, centerRight - centerLeft);

  const layoutSide = (names, edge, x, sideWidth) => {
    if (!names.length) return;
    const availableHeight = height - gap * 2 - gap * (names.length - 1);
    const panelHeight = availableHeight / names.length;
    names.forEach((name, index) => applyDockRect(name, { x, y: gap + index * (panelHeight + gap), width: sideWidth, height: panelHeight, joinEdge: index ? "top" : "none" }));
  };
  const layoutHorizontal = (names, edge, y, panelHeight) => {
    if (!names.length) return;
    const availableWidth = centerWidth - gap * (names.length - 1);
    const panelWidth = availableWidth / names.length;
    names.forEach((name, index) => applyDockRect(name, { x: centerLeft + index * (panelWidth + gap), y, width: panelWidth, height: panelHeight, joinEdge: index ? "left" : "none" }));
  };

  layoutSide(left, "left", gap, leftWidth);
  layoutSide(right, "right", width - gap - rightWidth, rightWidth);
  layoutHorizontal(top, "top", gap, topHeight);
  layoutHorizontal(bottom, "bottom", height - gap - bottomHeight, bottomHeight);
  baseWorkspaceInsets = {
    left: centerLeft,
    right: width - centerRight,
    bottom: bottom.length ? bottomHeight + gap * 2 : gap,
    top: top.length ? topHeight + gap * 2 : gap
  };
  // A revealed edge panel expands over the current scene, without taking
  // more tile space. Its preferred dock size remains unchanged.
  areaPriority.forEach(name => {
    const area = areaFor(name);
    if (!intentAreaPlan.overlays[name] || !isLocalArea(name) || !area?.classList.contains("is-intent-revealed")) return;
    const edge = dockState[name].edge;
    const vertical = edge === "left" || edge === "right";
    const thickness = Math.max(vertical ? stateSideMinimum(name, "expanded") : stateHorizontalMinimum(name, "expanded"), dockSizes[edge]);
    area.dataset.areaState = "expanded";
    applyDockRect(name, {
      x: edge === "right" ? width - thickness : parseFloat(area.style.left) || 0,
      y: edge === "bottom" ? height - thickness : parseFloat(area.style.top) || 0,
      width: vertical ? thickness : parseFloat(area.style.width) || centerWidth,
      height: vertical ? parseFloat(area.style.height) || height : thickness
    });
  });
  captureBaseDockLaneRects();
  applyAutoAvoidance();
  applySystemRailExpansion(width, height);
  globalThis.SpatialMemoryDesktop?.applyRailExpansion(width, height);
  document.body.classList.add("areas-docked");
  document.body.classList.remove("areas-freeform", "areas-auto");
  if (areasFollowWindows() && fitWindows && !windowViewportLockReady) scheduleWindowFit();
  if (save) saveAreaLayout();
}

function hideArea(name) {
  if (!areaCanBeHidden(name)) return;
  const area = areaFor(name);
  if (!area) return;
  area.hidden = true;
  layoutDockAreas(true);
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
  showToast(areaLabel(name) + " closed — reopen it from Overview");
}

function showArea(name, announce = true) {
  const area = areaFor(name);
  if (!area) return;
  area.hidden = false;
  layoutDockAreas(true);
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
  if (announce) showToast(areaLabel(name) + " shown in its " + dockState[name].edge + " dock");
}

function setDockPosition(name, edge, insertion = null, announce = true) {
  if (!dockEdges.includes(edge)) return;
  if (name === "systems") endSystemRailExpansion(false);
  manualAreaOverride(name);
  const previousEdge = dockState[name].edge;
  dockState[name].edge = edge;
  normalizeDockOrder(previousEdge);
  const peers = dockGroup(edge, true).filter(item => item !== name);
  const index = insertion === null ? peers.length : Math.max(0, Math.min(insertion, peers.length));
  peers.splice(index, 0, name);
  peers.forEach((item, order) => { dockState[item].order = order; });
  autoSpatialEdgeStates.clear();
  layoutDockAreas(true);
  refreshIntentAreas();
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
  if (announce) showToast(areaLabel(name) + " docked " + edge);
}

function closestDockEdge(clientX, clientY) {
  const rect = $(".desktop-shell").getBoundingClientRect();
  const distances = {
    left: Math.abs(clientX - rect.left),
    right: Math.abs(rect.right - clientX),
    top: Math.abs(clientY - rect.top),
    bottom: Math.abs(rect.bottom - clientY)
  };
  return [...dockEdges].sort((a, b) => distances[a] - distances[b])[0];
}

function ensureDockPreview() {
  if (dockPreview) return dockPreview;
  dockPreview = document.createElement("div");
  dockPreview.className = "dock-preview";
  dockPreview.setAttribute("aria-hidden", "true");
  $(".desktop-shell").append(dockPreview);
  return dockPreview;
}

function dockInsertion(edge, clientX, clientY, movingName) {
  const peers = dockGroup(edge).filter(name => name !== movingName);
  if (!peers.length) return 0;
  const shell = $(".desktop-shell").getBoundingClientRect();
  const ratio = edge === "left" || edge === "right" ? (clientY - shell.top) / shell.height : (clientX - shell.left) / shell.width;
  return Math.max(0, Math.min(peers.length, Math.floor(ratio * (peers.length + 1))));
}

function bindAreaDockDrag(name, area) {
  const handle = $("[data-area-drag-handle]", area);
  if (!handle) return;
  handle.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button,input,a")) return;
    event.preventDefault();
    const preview = ensureDockPreview();
    let candidate = dockState[name].edge;
    handle.setPointerCapture(event.pointerId);
    area.classList.add("is-dock-dragging");
    preview.dataset.edge = candidate;
    preview.classList.add("is-visible");
    const move = moveEvent => {
      candidate = closestDockEdge(moveEvent.clientX, moveEvent.clientY);
      preview.dataset.edge = candidate;
    };
    const finish = upEvent => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      area.classList.remove("is-dock-dragging");
      preview.classList.remove("is-visible");
      const transferTarget = displayTransferTarget(upEvent.clientX);
      if (transferTarget) {
        transferAreaToDisplay(name, transferTarget, upEvent.clientX < window.innerWidth / 2 ? "left" : "right");
        return;
      }
      setDockPosition(name, candidate, dockInsertion(candidate, upEvent.clientX, upEvent.clientY, name));
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function bindDockResize(name, area) {
  const handle = $('[data-area-resize="' + name + '"]', area);
  if (!handle) return;
  handle.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    if (name === "systems") endSystemRailExpansion(false);
    event.preventDefault();
    event.stopPropagation();
    const shellRect = $(".desktop-shell").getBoundingClientRect();
    const resizeEdge = dockState[name].edge;
    manualAreaOverride(name);
    dockSizeManual[resizeEdge] = !areasFollowWindows();
    handle.setPointerCapture(event.pointerId);
    area.classList.add("is-area-resizing");
    const move = moveEvent => {
      const edge = dockState[name].edge;
      if (edge === "left") dockSizes.left = moveEvent.clientX - shellRect.left;
      if (edge === "right") dockSizes.right = shellRect.right - moveEvent.clientX;
      if (edge === "top") dockSizes.top = moveEvent.clientY - shellRect.top;
      if (edge === "bottom") dockSizes.bottom = shellRect.bottom - moveEvent.clientY;
      /* In legacy Auto this is only the immediate drag state. The next spatial pass
         may expand it again, keep it on the rail, or move it when even the
         rail does not fit. Bounded tiling always keeps the user's chosen size. */
      if (areasFollowWindows()) autoSpatialEdgeStates.set(edge, areaStateForSize(edge, dockSizes[edge]));
      layoutDockAreas(false);
    };
    const finish = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      area.classList.remove("is-area-resizing");
      saveAreaLayout();
      refreshIntentAreas();
      if (areasFollowWindows()) {
        if (rebalanceAreaDisplays()) applyExtendedDesktopPartition();
        scheduleSpatialAutoLayout();
      }
      showToast(areaLabel(name) + " · " + layoutStateLabel(area.dataset.areaState));
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function prepareAreaWindows() {
  // New Workspaces start from the neutral dock layout, never the last one's edits.
  defaultAreaSession = JSON.parse(JSON.stringify(snapshotAreaLayout()));
  let saved = null;
  try {
    const sessions = JSON.parse(desktopStorage.getItem("spatial-workspace-area-layouts-v1") || "{}");
    Object.entries(sessions).forEach(([name, session]) => { workspaceAreaSessions[name] = session; });
    saved = workspaceAreaSessions[activeWorkspace] || null;
    if (!saved && activeWorkspace === "general") saved = JSON.parse(desktopStorage.getItem("spatial-dock-layout-v2") || "null");
  } catch {}
  if (saved?.state) areaPriority.forEach(name => {
    if (dockEdges.includes(saved.state[name]?.edge)) dockState[name] = { edge: saved.state[name].edge, order: Number(saved.state[name].order) || 0 };
  });
  if (saved?.sizes) dockEdges.forEach(edge => { if (Number.isFinite(saved.sizes[edge])) dockSizes[edge] = saved.sizes[edge]; });
  if (saved?.hidden) areaPriority.forEach(name => { if (areaFor(name)) areaFor(name).hidden = Boolean(saved.hidden[name]); });
  keepPersistentAreasVisible();
  if (saved?.manual) dockEdges.forEach(edge => { dockSizeManual[edge] = Boolean(saved.manual[edge]); });

  areaPriority.forEach(name => {
    const area = areaFor(name);
    if (!area) return;
    bindAreaDockDrag(name, area);
    bindDockResize(name, area);
  });
  $$('[data-area-hide]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); hideArea(button.dataset.areaHide); }));
  $$('[data-area-show]').forEach(button => button.addEventListener("click", () => showArea(button.dataset.areaShow)));
  $$('[data-overview-area-visibility]').forEach(button => button.addEventListener("click", () => {
    const name = button.dataset.overviewAreaVisibility;
    if (areaFor(name)?.hidden) showArea(name, false);
    else hideArea(name);
  }));
  const resetAreas = $("#resetAreas");
  if (resetAreas) resetAreas.addEventListener("click", () => {
    areaPriority.forEach(name => {
      if (areaFor(name)) areaFor(name).hidden = false;
    });
    Object.assign(dockSizes, { left: 310, right: 300, top: 250, bottom: 250 });
    dockEdges.forEach(edge => { dockSizeManual[edge] = false; });
    layoutMode = layoutModes[0];
    autoSpatialEdgeStates.clear();
    clearAllAutoAvoidance();
    try { desktopStorage.setItem("spatial-layout-mode-v1", layoutMode); } catch {}
    layoutDockAreas(true);
    if (rebalanceAreaDisplays()) applyExtendedDesktopPartition();
    showToast(tileEngine ? "Desktop Areas restored · borders stay fixed" : "Desktop Areas restored to Auto");
  });
  $$('[data-area-auto]').forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const name = button.closest('[data-area-window]').dataset.areaWindow;
    const current = dockEdges.indexOf(dockState[name].edge);
    setDockPosition(name, dockEdges[(current + 1) % dockEdges.length]);
  }));
  dockEdges.forEach(normalizeDockOrder);
  try {
    const savedMode = desktopStorage.getItem("spatial-layout-mode-v1");
    if (!saved?.layoutMode && layoutModes.includes(savedMode)) layoutMode = savedMode;
  } catch {}
  layoutMode = layoutModes.includes(saved?.layoutMode) ? saved.layoutMode : layoutModes.includes(layoutMode) ? layoutMode : layoutModes[0];
  const layoutControl = $("#layoutModeToggle");
  if (layoutControl?.matches("button") && layoutModes.length > 1) layoutControl.addEventListener("click", () => {
    const nextMode = layoutModes[(layoutModes.indexOf(layoutMode) + 1) % layoutModes.length];
    if (nextMode === "manual") freezeCurrentAreaLayout();
    layoutMode = nextMode;
    if (layoutMode === "manual") {
      autoSpatialEdgeStates.clear();
      clearAllAutoAvoidance();
    } else {
      autoSpatialEdgeStates.clear();
    }
    try { desktopStorage.setItem("spatial-layout-mode-v1", layoutMode); } catch {}
    layoutDockAreas(false);
    saveAreaLayout();
    if (layoutMode === "auto") {
      if (rebalanceAreaDisplays()) applyExtendedDesktopPartition();
      scheduleSpatialAutoLayout();
    }
    showToast(layoutMode === "auto" ? "Auto Areas · windows can claim dock space" : "Manual Areas · geometry locked");
  });
  layoutDockAreas(false);
  workspaceAreaSessions[activeWorkspace] = snapshotAreaLayout();
  persistAreaSessions();
}

const projectSpaces = desktopPreset === 'demo' ? JSON.parse(JSON.stringify(SpatialDemoExamples.projects)) : {};

let activeProjectName = null;
// Projects are shared resources; which one is open (and its Mode) belongs to a Workspace.
const workspaceProjectStates = Object.create(null);
const workspaceOpenProjects = readDesktopStorage("spatial-open-projects-v1");

function openProjectNames(workspace = activeWorkspace) {
  const legacy = workspaceProjectStates[workspace]?.project || (workspace === activeWorkspace ? activeProjectName : null);
  const saved = workspaceOpenProjects[workspace];
  return [...new Set(Array.isArray(saved) ? saved : legacy ? [legacy] : [])].filter(name => projectSpaces[name]);
}
const workspaceAreaContents = Object.create(null);
let defaultAreaContent = null;

function normalizedWorkspaceProjects(saved = {}, legacyProject = undefined, workspaceName = activeWorkspace) {
  const result = Object.fromEntries(Object.keys(workspaceProfiles).map(name => {
    const example = SpatialDemoExamples.scenarios[name];
    const project = example?.project && projectSpaces[example.project];
    return [name, { project: project ? example.project : null, mode: project?.modes[example.mode] ? example.mode : null }];
  }));
  Object.entries(saved || {}).forEach(([name, context]) => {
    if (!result[name]) return;
    const project = context?.project && projectSpaces[context.project];
    result[name] = { project: project ? context.project : null, mode: project?.modes[context?.mode] ? context.mode : null };
  });
  if (legacyProject !== undefined && result[workspaceName]) {
    Object.values(result).forEach(context => { context.project = null; context.mode = null; });
    result[workspaceName] = { project: projectSpaces[legacyProject] ? legacyProject : null, mode: null };
  }
  return result;
}

function rememberWorkspaceProject() {
  workspaceProjectStates[activeWorkspace] = { project: activeProjectName || null, mode: activeProjectName ? projectModeId(activeProjectName) : null };
}

function restoreWorkspaceProject(workspaceName) {
  const context = workspaceProjectStates[workspaceName];
  activeProjectName = context?.project && projectSpaces[context.project] ? context.project : null;
  if (activeProjectName && projectSpaces[activeProjectName].modes[context.mode]) projectSpaces[activeProjectName].activeMode = context.mode;
}
let projectNoteSaveTimer;
const projectWindowSessions = {};
let projectEditorState = null;

function validProject(project) {
  return project && typeof project.name === "string" && project.name.trim() && project.modes && typeof project.modes === "object" && Object.keys(project.modes).length;
}

function normalizeProject(project, id) {
  project = SpatialDemoExamples.migrateProject(id, project);
  if (!validProject(project)) return null;
  const modes = Object.fromEntries(Object.entries(project.modes).filter(([, mode]) => mode && typeof mode.label === "string" && mode.label.trim()).map(([modeId, mode]) => [modeId, {
    label: mode.label.trim(),
    icon: mode.icon || "i-monitor",
    apps: Array.isArray(mode.apps) ? mode.apps.filter(appName => appInfo[appName]) : [],
    layout: ["canvas", "build", "review"].includes(mode.layout) ? mode.layout : "canvas"
  }]));
  if (!Object.keys(modes).length) return null;
  const activeMode = modes[project.activeMode] ? project.activeMode : Object.keys(modes)[0];
  const fallbackRoot = "/home/demo/Projects/" + slugifyProject(project.name);
  const rawRoot = project.root || fallbackRoot;
  const root = rawRoot.startsWith("~/") ? (workspaceProfiles[project.originWorkspace]?.home || "/home/demo") + "/" + rawRoot.slice(2) : rawRoot;
  const detectedWorkspace = Object.entries(workspaceProfiles).find(([, profile]) => root === profile.home + "/Projects" || root.startsWith(profile.home + "/Projects/"))?.[0] || null;
  return {
    name: project.name.trim(),
    accent: project.accent || "#5cbcff",
    icon: project.icon || "i-folder",
    summary: project.summary || "Project",
    root,
    downloadToProject: project.downloadToProject === true,
    originWorkspace: project.originWorkspace && workspaceProfiles[project.originWorkspace] ? project.originWorkspace : detectedWorkspace,
    files: Array.isArray(project.files) ? project.files : [],
    note: typeof project.note === "string" ? project.note : "",
    resources: Array.isArray(project.resources) ? project.resources : [],
    activeMode,
    modes
  };
}

function projectLocationMeta(project) {
  const workspaceName = project.originWorkspace && workspaceProfiles[project.originWorkspace]
    ? project.originWorkspace
    : Object.entries(workspaceProfiles).find(([, profile]) => project.root === profile.home + "/Projects" || project.root.startsWith(profile.home + "/Projects/"))?.[0] || null;
  if (!workspaceName) return { label: "Custom location", detail: "Stored outside Workspace Homes", custom: true };
  const profile = workspaceProfiles[workspaceName];
  return { label: profile.label + " Home · Projects", detail: "Default project location", custom: false };
}

function slugifyProject(value) {
  return String(value || "project").trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "project";
}

function uniqueProjectId(label, existing = projectSpaces) {
  const base = slugifyProject(label);
  let id = base;
  let suffix = 2;
  while (id === "workspace" || existing[id]) id = base + "-" + suffix++;
  return id;
}

function uniqueModeId(project, label) {
  return uniqueProjectId(label, project.modes);
}

function projectModeId(name) {
  const project = projectSpaces[name];
  if (!project) return "";
  if (!project.modes[project.activeMode]) project.activeMode = Object.keys(project.modes)[0];
  return project.activeMode;
}

function projectSessionKey(name, modeId = projectModeId(name)) {
  return activeWorkspace + ":" + name + ":" + modeId;
}

function persistProjectState() {
  rememberWorkspaceProject();
  try {
    desktopStorage.setItem("spatial-open-projects-v1", JSON.stringify(Object.fromEntries(Object.keys(workspaceProfiles).map(name => [name, openProjectNames(name)]))));
    desktopStorage.setItem("spatial-workspace-project-states-v1", JSON.stringify(workspaceProjectStates));
    const content = Object.fromEntries(Object.entries(projectSpaces).map(([name, project]) => [name, {
      note: project.note,
      resources: project.resources,
      activeMode: projectModeId(name)
    }]));
    desktopStorage.setItem("spatial-project-content-v1", JSON.stringify(content));
    desktopStorage.setItem("spatial-project-spaces-v2", JSON.stringify(projectSpaces));
    desktopStorage.setItem("spatial-active-project-v1", activeProjectName || "");
    desktopStorage.setItem("spatial-project-window-sessions-v1", JSON.stringify(projectWindowSessions));
  } catch {}
}

function loadProjectState() {
  try {
    const savedSpacesRaw = desktopStorage.getItem("spatial-project-spaces-v2");
    if (savedSpacesRaw !== null) {
      const savedSpaces = JSON.parse(savedSpacesRaw || "{}");
      const normalized = Object.fromEntries(Object.entries(savedSpaces).map(([name, project]) => [name, normalizeProject(project, name)]).filter(([, project]) => project));
      Object.keys(projectSpaces).forEach(name => delete projectSpaces[name]);
      Object.assign(projectSpaces, normalized);
    }
    const content = JSON.parse(desktopStorage.getItem("spatial-project-content-v1") || "{}");
    Object.entries(content).forEach(([name, saved]) => {
      if (!projectSpaces[name] || !saved) return;
      if (typeof saved.note === "string") projectSpaces[name].note = saved.note;
      if (Array.isArray(saved.resources)) projectSpaces[name].resources = saved.resources;
      if (typeof saved.activeMode === "string" && projectSpaces[name].modes[saved.activeMode]) projectSpaces[name].activeMode = saved.activeMode;
    });
    Object.entries(projectSpaces).forEach(([id, project]) => {
      projectSpaces[id] = SpatialDemoExamples.migrateProject(id, project);
    });
    Object.assign(projectWindowSessions, JSON.parse(desktopStorage.getItem("spatial-project-window-sessions-v1") || "{}"));
    const savedActiveProject = desktopStorage.getItem("spatial-active-project-v1");
    const savedContexts = desktopStorage.getItem("spatial-workspace-project-states-v1");
    Object.assign(workspaceProjectStates, normalizedWorkspaceProjects(savedContexts ? JSON.parse(savedContexts) : {}, savedContexts ? undefined : savedActiveProject === null ? undefined : savedActiveProject));
    restoreWorkspaceProject(activeWorkspace);
    persistProjectState();
  } catch {}
}

function resourceMarkup([label, detail, type = "web", itemIcon = "i-link"]) {
  return '<button data-project-item="' + escapeHtml(label) + '"><span class="linked-type ' + escapeHtml(type) + '">' + icon(itemIcon) + '</span><span><b>' + escapeHtml(label) + '</b><small>' + escapeHtml(detail) + '</small></span><i class="link-badge">' + icon("i-link") + '</i></button>';
}

function projectSession(name, modeId = projectModeId(name)) {
  return projectWindowSessions[projectSessionKey(name, modeId)] || null;
}

function sessionAge(savedAt) {
  const minutes = Math.max(0, Math.round((Date.now() - Number(savedAt || 0)) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + " min ago";
  return Math.round(minutes / 60) + " h ago";
}

function refreshProjectSessionUi(name = activeProjectName) {
  const project = name ? projectSpaces[name] : null;
  if (!project) return;
  const openCount = Object.keys(appState).filter(id => appState[id] !== "closed" && windowMembership[activeWorkspace]?.[id] === name).length;
  const savedCount = projectSession(name)?.apps?.length || 0;
  $("#projectRailWindowCount").textContent = openCount || savedCount;
  $("#projectRailSession").title = "Show project desktops · " + openCount + " windows";
  if (projectColumnActive()) {
    $("#projectAreaContext").textContent = "Project resources";
    $("#projectAreaContext").title = openCount + " project windows · all desktops · autosaved";
  }
}

function renderProjectModes() {
  // Old project metadata remains importable; desktop pages own live layouts.
  $("#projectModeSwitcher").replaceChildren();
  $("#projectModeSwitcher").hidden = true;
}

function renderOverviewProjects() {
  renderAvailableProjectLibrary();
  const grid = $("#overviewProjectGrid");
  const entries = Object.entries(projectSpaces);
  $("#overviewProjectCount").textContent = entries.length + (entries.length === 1 ? " project" : " projects");
  grid.innerHTML = entries.map(([name, project]) => {
    const selected = openProjectNames().includes(name);
    const resourceCount = project.resources.length;
    const location = projectLocationMeta(project);
    const detail = location.label + " · " + resourceCount + (resourceCount === 1 ? " resource" : " resources");
    return '<button class="overview-project' + (selected ? " is-active" : "") + (location.custom ? " is-custom-location" : "") + '" data-overview-project="' + escapeHtml(name) + '" aria-pressed="' + selected + '" title="' + escapeHtml(project.root) + '" style="--project-card-accent:' + escapeHtml(project.accent) + '"><span class="overview-project-icon"><svg><use href="#' + escapeHtml(project.icon) + '"/></svg></span><span><b>' + escapeHtml(project.name) + '</b><small>' + escapeHtml(detail) + '</small></span><span class="overview-project-open">Open<svg><use href="#i-right"/></svg></span></button>';
  }).join("") || '<div class="overview-project-empty"><svg><use href="#i-folder"/></svg><span><b>No projects yet</b><small>Create one to attach a folder and resources.</small></span></div>';
  prepareControlSemantics(grid);
}

function setProjectClosedState(closed) {
  closed = closed || !projectColumnActive();
  syncProjectWindowScopes(closed);
  areaFor("projects").dataset.projectLibraryOpen = String(closed);
  $("#projectSpaceContent").hidden = closed;
  $("#projectClosedState").hidden = !closed;
  const project = activeProjectName ? projectSpaces[activeProjectName] : null;
  $("#projectModeSwitcher").hidden = true;
  $("#closeProjectButton").disabled = closed;
  $("#manageProjectButton").disabled = closed;
  $$(".project-pack-key").forEach(button => { button.disabled = closed; });
  if (closed) {
    renderAvailableProjectLibrary();
    $("#projectAreaName").textContent = "Projects";
    $("#projectAreaContext").removeAttribute("title");
    const count = Object.keys(projectSpaces).length;
    $("#projectAreaContext").textContent = count + (count === 1 ? " project available" : " projects available");
    if (!activeProjectName) $$("[data-overview-project]").forEach(card => {
      card.classList.remove("is-active");
      card.setAttribute("aria-pressed", "false");
    });
  }
}

function syncProjectAreaView() {
  globalThis.SpatialMemoryDesktop?.render();
  const project = projectColumnActive() ? projectSpaces[activeProjectName] : null;
  const area = areaFor("projects");
  if (!area) return;
  if (area.dataset.projectLibraryOpen !== String(!project)) setProjectClosedState(!project);
  if (project) {
    $("#projectAreaName").textContent = project.name;
    $("#projectRailName").textContent = project.name;
    refreshProjectSessionUi();
  }
}

function renderProjectSpace(name) {
  const project = projectSpaces[name];
  const area = areaFor("projects");
  if (!project || !area) return;
  activeProjectName = name;
  workspaceOpenProjects[activeWorkspace] = [...new Set([...openProjectNames(), name])];
  workspaceProjects[activeWorkspace] = name;
  rememberWorkspaceProject();
  area.style.setProperty("--project-accent", project.accent);
  $("#projectAreaName").textContent = project.name;
  $("#projectRailName").textContent = project.name;
  $("#projectRailName").title = project.name;
  $("#projectRailResourceCount").textContent = project.resources.length;
  renderProjectModes(name);
  $("#projectRootPath").textContent = project.root;
  const location = projectLocationMeta(project);
  $("#projectLocationNote").textContent = location.detail + " · " + location.label;
  $("#projectLocationNote").classList.toggle("is-custom", location.custom);
  const projectFiles = [[".spatial-project.toml", "Editable project settings", "config"], ...project.files.filter(([label]) => label !== ".spatial-project.toml")];
  $("#projectRootItems").innerHTML = projectFiles.map(([label, detail, type]) => '<button data-project-item="' + escapeHtml(label) + '">' + (type === "folder" ? '<span class="linked-type web">' + icon("i-folder") + '</span>' : type === "config" ? '<span class="linked-type config">' + icon("i-code") + '</span>' : '<i class="document-glyph"></i>') + '<span><b>' + escapeHtml(label) + '</b><small>' + escapeHtml(detail) + '</small></span></button>').join("");
  if (document.activeElement !== $("#projectQuickNote")) $("#projectQuickNote").value = project.note || "";
  $("#projectNoteState").textContent = "Saved";
  $("#projectLinkedItems").innerHTML = project.resources.map(resourceMarkup).join("");
  $("#projectResourceCount").textContent = project.resources.length + (project.resources.length === 1 ? " linked" : " linked");
  setProjectClosedState(false);
  refreshProjectSessionUi(name);
  renderOverviewProjects();
  applyAppPrimaryColors(area);
  refreshWorkspaceContext();
  persistProjectState();
  syncProjectAreaView();
}

function projectModeGeometry(layout, index, count) {
  const workspace = workspaceBounds();
  const padding = 18;
  const gap = 10;
  const width = Math.max(420, workspace.width - padding * 2);
  const height = Math.max(300, workspace.height - padding * 2);
  if (count === 1) return { x: padding, y: padding, width, height };
  if (count === 2) {
    const firstWidth = Math.round((width - gap) * .58);
    return index === 0
      ? { x: padding, y: padding, width: firstWidth, height }
      : { x: padding + firstWidth + gap, y: padding, width: width - firstWidth - gap, height };
  }
  if (layout === "canvas") {
    const sideWidth = Math.round((width - gap) * .36);
    const rowHeight = Math.round((height - gap) / 2);
    if (index === 0) return { x: padding + sideWidth + gap, y: padding, width: width - sideWidth - gap, height };
    return { x: padding, y: padding + (index - 1) * (rowHeight + gap), width: sideWidth, height: index === 1 ? rowHeight : height - rowHeight - gap };
  }
  if (layout === "review") {
    const topHeight = Math.round((height - gap) * .68);
    const lowerWidth = Math.round((width - gap) / 2);
    if (index === 0) return { x: padding, y: padding, width, height: topHeight };
    return { x: padding + (index - 1) * (lowerWidth + gap), y: padding + topHeight + gap, width: index === 1 ? lowerWidth : width - lowerWidth - gap, height: height - topHeight - gap };
  }
  const primaryWidth = Math.round((width - gap) * .62);
  const rowHeight = Math.round((height - gap) / 2);
  if (index === 0) return { x: padding, y: padding, width: primaryWidth, height };
  return { x: padding + primaryWidth + gap, y: padding + (index - 1) * (rowHeight + gap), width: width - primaryWidth - gap, height: index === 1 ? rowHeight : height - rowHeight - gap };
}

function seedProjectModeWindows(name, modeId) {
  const mode = projectSpaces[name]?.modes[modeId];
  if (!mode) return 0;
  const definition = SpatialDemoExamples.projects[name];
  const example = modeId === "default" && definition?.name === projectSpaces[name].name && definition?.root === projectSpaces[name].root ? SpatialDemoExamples.projectWindows[name] : null;
  const specs = example || mode.apps.map(base => ({base, page:desktopPages.current(activeWorkspace, name), state:"open"}));
  const names = specs.map(({base}) => {
    if (appState[base] === 'closed' && (!(base in desktopPages.space(activeWorkspace).owners) || desktopPages.columnOf(activeWorkspace, base) === name)) return base;
    const id = base + '--' + (++instanceSequence);
    instanceDefinitions[id] = appInfo[base].base || base;
    installInstance(id, instanceDefinitions[id]);
    return id;
  });
  names.forEach((appName, index) => {
    if (!appInfo[appName]) return;
    windowMembership[activeWorkspace] ||= {};
    windowMembership[activeWorkspace][appName] = name;
    const spec = specs[index];
    appState[appName] = spec.state;
    desktopPages.assign(activeWorkspace, appName, spec.page, name);
    if (spec.content) renderDemoAppExample(appName, spec.content);
    saveDesktopPages();
    displayAssignmentsFor().apps[appName] = 1;
    appMaximizedState[appName] = false;
    const peers = specs.filter(spec => spec.page === specs[index].page && spec.state === "open");
    const peerIndex = specs.slice(0,index).filter(spec => spec.page === specs[index].page && spec.state === "open").length;
    windowGeometry.set(appName, projectModeGeometry(mode.layout, peerIndex, Math.max(1,peers.length)));
  });
  syncApps();
  names.forEach(appName => {
    if (appState[appName] === "open" && isLocalApp(appName)) applyGeometry(appName, windowGeometry.get(appName), false);
  });
  frontApp = names[0] || frontApp;
  if (frontApp && isLocalApp(frontApp)) bringToFront(frontApp);
  saveLayout();
  persistDisplayAssignments();
  captureWorkspaceContent();
  return names.length;
}

function activateProject(name, announce = true) {
  if (desktopPageAnimating) { setTimeout(() => activateProject(name, announce), 230); return; }
  const project = projectSpaces[name];
  if (!project) return;
  if (openProjectNames().includes(name)) {
    changeDesktopColumn(name);
    renderProjectSpace(name);
    if (announce) showToast(project.name + " is already open");
    return;
  }
  captureWorkspaceContent();
  workspaceOpenProjects[activeWorkspace] = [...openProjectNames(), name];
  changeDesktopColumn(name, false);
  if (activeProjectName !== name) renderProjectSpace(name);
  workspaceProjects[activeWorkspace] = name;
  saveIndependentSessions();
  const restored = restoreProjectWindows(name, false, true);
  if (announce) showToast(project.name + " opened · " + restored + " window" + (restored === 1 ? "" : "s"));
}

function switchProjectMode(modeId, announce = true) {
  if (!activeProjectName) return;
  const project = projectSpaces[activeProjectName];
  if (!project.modes[modeId] || projectModeId(activeProjectName) === modeId) return;
  const previousMode = projectModeId(activeProjectName);
  parkProjectWindows(activeProjectName, false, previousMode);
  project.activeMode = modeId;
  persistProjectState();
  renderProjectSpace(activeProjectName);
  const restored = restoreProjectWindows(activeProjectName, false, true);
  queueDesktopStateBroadcast(0);
  if (announce) showToast(project.modes[modeId].label + " mode · " + restored + " window" + (restored === 1 ? "" : "s") + " restored");
}

function parkProjectWindows(name, announce = true, modeId = projectModeId(name)) {
  const project = projectSpaces[name];
  if (!project) return 0;
  const names = Object.keys(appState).filter(appName => appState[appName] !== "closed" && windowMembership[activeWorkspace]?.[appName] === name);
  const states = Object.fromEntries(names.map(appName => [appName, appState[appName]]));
  const geometry = {};
  const displays = {};
  names.forEach(appName => {
    const frame = frameFor(appName);
    geometry[appName] = frame && !frame.hidden
      ? frame.dataset.maximized === "true"
        ? maximizeRestore.get(appName) || windowGeometry.get(appName) || readGeometry(frame)
        : readGeometry(frame)
      : windowGeometry.get(appName) || defaultWindowGeometry(appName, 0);
    displays[appName] = Number(displayAssignmentsFor().apps[appName] || 1);
    windowGeometry.set(appName, geometry[appName]);
    appState[appName] = "closed";
    clearWindowAutoAvoidance?.(appName);
    if (frame) {
      frame.classList.remove("is-maximized");
      delete frame.dataset.maximized;
      syncMaximizeButton(frame);
    }
    appMaximizedState[appName] = false;
  });
  projectWindowSessions[projectSessionKey(name, modeId)] = { apps: names, states, geometry, displays, pages: Object.fromEntries(names.map(id => [id, desktopPages.pageOf(activeWorkspace, id)])), savedAt: Date.now() };
  frontApp = topOpenApp();
  syncApps();
  saveLayout();
  persistProjectState();
  refreshProjectSessionUi(name);
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
  if (announce) showToast(project.modes[modeId].label + " mode saved · " + names.length + " window" + (names.length === 1 ? "" : "s"));
  return names.length;
}

function restoreProjectWindows(name, announce = true, seedIfEmpty = false) {
  const modeId = projectModeId(name);
  const session = projectSession(name, modeId);
  if (!session?.apps?.length) {
    const seeded = !session && seedIfEmpty ? seedProjectModeWindows(name, modeId) : 0;
    refreshProjectSessionUi(name);
    if (announce) showToast(seeded ? seeded + " default mode windows opened" : "No saved windows for this mode");
    return seeded;
  }
  session.apps.forEach(appName => {
    if (!appInfo[appName]) return;
    windowMembership[activeWorkspace] ||= {};
    windowMembership[activeWorkspace][appName] = name;
    desktopPages.assign(activeWorkspace, appName, session.pages?.[appName] ?? desktopPages.pageOf(activeWorkspace, appName), name);
    appState[appName] = session.states?.[appName] === "minimized" ? "minimized" : "open";
    if (session.geometry?.[appName]) windowGeometry.set(appName, session.geometry[appName]);
    if (session.displays?.[appName]) displayAssignmentsFor().apps[appName] = session.displays[appName];
  });
  syncApps();
  session.apps.forEach(appName => {
    if (appState[appName] === "open" && isLocalApp(appName) && windowGeometry.has(appName)) applyGeometry(appName, windowGeometry.get(appName), false);
  });
  frontApp = topOpenApp();
  if (frontApp && isLocalApp(frontApp)) bringToFront(frontApp);
  delete projectWindowSessions[projectSessionKey(name, modeId)];
  saveDesktopPages();
  persistProjectState();
  persistDisplayAssignments();
  refreshProjectSessionUi(name);
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
  if (announce) showToast(session.apps.length + " " + projectSpaces[name].modes[modeId].label + " window" + (session.apps.length === 1 ? " restored" : "s restored"));
  return session.apps.length;
}

function closeActiveProject() {
  if (desktopPageAnimating) { setTimeout(closeActiveProject, 230); return; }
  if (!activeProjectName) return;
  const name = activeProjectName;
  const project = projectSpaces[name];
  captureWorkspaceContent();
  if (tileSession().fullscreen) leaveAppFullscreen();
  const parked = parkProjectWindows(name, false);
  workspaceOpenProjects[activeWorkspace] = openProjectNames().filter(id => id !== name);
  changeDesktopColumn("workspace", false);
  activeProjectName = openProjectNames()[0] || null;
  workspaceProjects[activeWorkspace] = activeProjectName;
  saveIndependentSessions();
  setProjectClosedState(true);
  layoutDockAreas(false, false);
  persistProjectState();
  renderOverviewProjects();
  updateDesktopPageUi();
  queueDesktopStateBroadcast(0);
  showToast(project.name + " closed · saved " + parked + " window" + (parked === 1 ? "" : "s"));
}

function describeProjectResource(value) {
  const raw = value.trim();
  if (!raw) return null;
  const localPath = /^(?:[\\/~]|\.{1,2}[\\/]|[a-z]:[\\/]|file:)/i.test(raw)
    || /\.(?:mp4|webm|mov|mkv|mp3|wav|ogg|flac|png|jpe?g|svg|webp|pdf|txt|md|csv|zip|blend|kra)(?:$|[?#])/i.test(raw) && !/^https?:\/\//i.test(raw) && !/^[^/]+\.[^/]+[/?#]/.test(raw);
  const webAddress = !localPath && (/^https?:\/\//i.test(raw) || /^(?:localhost(?::\d+)?|(?:[\p{L}\d-]+\.)+[\p{L}\d-]+)(?::\d+)?(?:[/?#]|$)/u.test(raw));
  if (webAddress) {
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
      return [url.hostname.replace(/^www\./, "") + (url.pathname !== "/" ? decodeURI(url.pathname).replace(/\/$/, "") : ""), "Web resource · " + url.hostname, "web", "i-web"];
    } catch { return null; }
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^(?:[a-z]:[\\/]|file:)/i.test(raw)) return null;
  const path = raw.replace(/^file:\/\//i, "").replace(/[\\/]+$/, "");
  const label = path.split(/[\\/]/).at(-1) || raw;
  const video = /\.(mp4|webm|mov|mkv)$/i.test(path);
  return [label, "Linked · " + raw, video ? "video" : "file", video ? "i-video" : "i-folder"];
}

function addProjectResource(value) {
  if (!activeProjectName) return;
  const resource = describeProjectResource(value);
  if (!resource) { if (value.trim()) showToast("Use a file path or an HTTP(S) web address"); return; }
  projectSpaces[activeProjectName].resources.unshift(resource);
  persistProjectState();
  renderProjectSpace(activeProjectName);
  showToast(resource[0] + " added to " + projectSpaces[activeProjectName].name);
}

function focusProjectControl(selector) {
  // A rail command requesting an editor must expose it before moving focus.
  manualAreaOverride("projects");
  const edge = dockState.projects.edge;
  const vertical = edge === "left" || edge === "right";
  dockSizes[edge] = Math.max(dockSizes[edge], vertical ? 300 : 250);
  dockSizeManual[edge] = true;
  autoSpatialEdgeStates.delete(edge);
  showArea("projects", false);
  refreshIntentAreas();
  requestAnimationFrame(() => {
    const field = $(selector);
    field.focus();
    field.scrollIntoView({ block: "nearest" });
  });
}

const projectAccentPalette = ["#5cbcff", "#a88aff", "#65d881", "#ff9b68", "#f4c95d", "#48d1c8"];

function clearProjectSessions(projectName, modeId = null) {
  Object.keys(projectWindowSessions).forEach(key => {
    const matchesProject = key.includes(":" + projectName + ":");
    const matchesMode = modeId === null || key.endsWith(":" + projectName + ":" + modeId);
    if (matchesProject && matchesMode) delete projectWindowSessions[key];
  });
}

function createProjectFromEditor(name, root, downloadToProject = false) {
  const cleanName = name.trim();
  if (!cleanName) return;
  const id = uniqueProjectId(cleanName);
  const accent = projectAccentPalette[Object.keys(projectSpaces).length % projectAccentPalette.length];
  const workspace = workspaceProfiles[activeWorkspace];
  const defaultRoot = workspace.home + "/Projects/" + id;
  const rawRoot = root.trim() || defaultRoot;
  const chosenRoot = rawRoot.startsWith("~/") ? workspace.home + "/" + rawRoot.slice(2) : rawRoot;
  const originWorkspace = chosenRoot === workspace.home + "/Projects" || chosenRoot.startsWith(workspace.home + "/Projects/") ? activeWorkspace : null;
  projectSpaces[id] = {
    name: cleanName,
    accent,
    icon: "i-folder",
    summary: "Project",
    root: chosenRoot,
    downloadToProject,
    originWorkspace,
    files: [],
    note: "",
    resources: [],
    activeMode: "default",
    modes: {
      default: { label: "Default", icon: "i-monitor", apps: [], layout: "canvas" }
    }
  };
  if (downloadToProject) ensureProjectDownloads(id);
  persistProjectState();
  renderOverviewProjects();
  closeProjectEditor();
  activateProject(id, false);
  showArea("projects");
  setUniversalSearchOpen(false);
  queueDesktopStateBroadcast(0);
  showToast(cleanName + " created");
}

function createModeFromEditor(label) {
  const projectName = projectEditorState?.projectName;
  const project = projectSpaces[projectName];
  const cleanLabel = label.trim();
  if (!project || !cleanLabel || activeProjectName !== projectName) return;
  const previousMode = projectModeId(projectName);
  const modeId = uniqueModeId(project, cleanLabel);
  parkProjectWindows(projectName, false, previousMode);
  const previousSession = projectSession(projectName, previousMode);
  project.modes[modeId] = {
    label: cleanLabel,
    icon: "i-monitor",
    apps: previousSession?.apps ? [...previousSession.apps] : [],
    layout: "canvas"
  };
  if (previousSession) projectWindowSessions[projectSessionKey(projectName, modeId)] = cloneDesktopState(previousSession);
  project.activeMode = modeId;
  persistProjectState();
  renderProjectSpace(projectName);
  restoreProjectWindows(projectName, false, false);
  closeProjectEditor();
  queueDesktopStateBroadcast(0);
  showToast(cleanLabel + " mode created from the current setup");
}

function deleteProjectMode(projectName, modeId) {
  const project = projectSpaces[projectName];
  if (!project?.modes[modeId] || Object.keys(project.modes).length <= 1) return;
  const label = project.modes[modeId].label;
  const deletingActive = project.activeMode === modeId;
  if (deletingActive && activeProjectName === projectName) parkProjectWindows(projectName, false, modeId);
  clearProjectSessions(projectName, modeId);
  delete project.modes[modeId];
  if (deletingActive) project.activeMode = Object.keys(project.modes)[0];
  persistProjectState();
  if (activeProjectName === projectName) {
    renderProjectSpace(projectName);
    if (deletingActive) restoreProjectWindows(projectName, false, true);
  } else renderOverviewProjects();
  queueDesktopStateBroadcast(0);
  showToast(label + " mode deleted");
}

function deleteProject(projectName) {
  const project = projectSpaces[projectName];
  if (!project) return;
  const label = project.name;
  if (desktopPageAnimating) { setTimeout(() => deleteProject(projectName), 230); return; }
  if (activeProjectName === projectName) closeActiveProject();
  else if (openProjectNames().includes(projectName)) parkProjectWindows(projectName, false);
  Object.entries(windowMembership).forEach(([workspace, membership]) => {
    Object.entries(membership).filter(([, owner]) => owner === projectName).forEach(([name]) => {
      if (workspaceAppStates[workspace]) workspaceAppStates[workspace][name] = "closed";
    });
    if (workspaceProjects[workspace] === projectName) workspaceProjects[workspace] = null;
  });
  clearProjectSessions(projectName);
  delete projectSpaces[projectName];
  Object.keys(workspaceProfiles).forEach(workspace => { workspaceOpenProjects[workspace] = openProjectNames(workspace).filter(name => name !== projectName); });
  Object.entries(workspaceProjectStates).forEach(([workspace, context]) => {
    if (context.project === projectName) { context.project = null; context.mode = null; }
    if (desktopPages.column(workspace) === projectName) desktopPages.select(workspace, "workspace");
  });
  if (activeProjectName === projectName) {
    activeProjectName = null;
    setProjectClosedState(true);
  }
  persistProjectState();
  renderOverviewProjects();
  closeProjectEditor();
  queueDesktopStateBroadcast(0);
  updateDesktopPageUi();
  saveIndependentSessions();
  persistWorkspaceAppStates();
  showToast(label + " removed · folder and files kept");
}

function renderProjectEditor() {
  const state = projectEditorState;
  if (!state) return;
  const body = $("#projectEditorBody");
  const project = state.projectName ? projectSpaces[state.projectName] : null;
  const title = $("#projectEditorTitle");
  const kicker = $("#projectEditorKicker");
  if (state.view === "create-project") {
    kicker.textContent = "PROJECTS";
    title.textContent = "Create project";
    const defaultProjectPath = workspaceProfiles[activeWorkspace].home + "/Projects/my-project";
    body.innerHTML = '<form class="project-editor-form" data-project-editor-form="project"><label><span>Project name</span><input name="name" maxlength="48" required autocomplete="off" placeholder="My project"></label><label><span>Project folder <small>optional</small></span><input name="root" maxlength="160" autocomplete="off" placeholder="' + escapeHtml(defaultProjectPath) + '"></label><p>By default the folder is created inside <b>' + escapeHtml(workspaceProfiles[activeWorkspace].label) + ' Home/Projects</b>. Enter any other folder to keep the Project elsewhere. Its editable settings live inside <b>.spatial-project.toml</b>.</p><label class="project-download-option"><input type="checkbox" name="downloadToProject"><span>Download into this project<small>Create Downloads inside the project folder. Other Home folders still use the workspace.</small></span></label><div class="project-create-actions"><button class="surface-key project-editor-secondary" type="button" data-project-editor-action="close">Cancel</button><button class="surface-key project-editor-primary" type="submit"><svg><use href="#i-add"/></svg><span>Create project</span></button></div></form>';
  } else if (state.view === "delete-project" && project) {
    kicker.textContent = "REMOVE PROJECT";
    title.textContent = project.name;
    body.innerHTML = '<section class="project-editor-confirm"><span class="project-editor-warning"><svg><use href="#i-trash"/></svg></span><div><b>Remove this Project from Spatial Desktop?</b><p>The associated folder and files stay untouched. Its saved window sessions will be removed.</p></div><footer><button class="surface-key project-editor-secondary" data-project-editor-action="manage">Cancel</button><button class="surface-key project-editor-danger" data-project-editor-action="confirm-delete-project"><svg><use href="#i-trash"/></svg><span>Remove project</span></button></footer></section>';
  } else if (project) {
    state.view = "manage";
    kicker.textContent = "PROJECT SETTINGS";
    title.textContent = project.name;
    body.innerHTML = '<section class="project-editor-manage"><header><div><b>Project folder</b><small>' + escapeHtml(project.root) + '</small></div></header><p>Files, notes and linked resources stay together while your windows can use any desktop in this workspace. Click the desktop background or any Area to unfocus the window, then scroll up or down to change desktops. The number in the Apps header shows your current desktop.</p><label class="project-download-option"><input type="checkbox" data-project-download-toggle' + (project.downloadToProject ? ' checked' : '') + '><span>Download into this project<small>Creates <b>' + escapeHtml(project.root + '/Downloads') + '</b>. Only downloads from this project’s windows use it; Home and other standard folders stay in the workspace.</small></span></label><p class="project-download-destination">Downloads currently use <b>' + escapeHtml(SpatialHomeFolders.downloadDestination(workspaceProfiles, projectSpaces, activeWorkspace, state.projectName)) + '</b>.</p><footer><span>Removing the Project never deletes its folder.</span><button class="surface-key project-editor-danger quiet" data-project-editor-action="delete-project"><svg><use href="#i-trash"/></svg><span>Remove project</span></button></footer></section>';
  }
  prepareMaterialSurfaces($("#projectEditorDialog"));
  prepareControlSemantics($("#projectEditorDialog"));
}

function openProjectEditor(view, options = {}) {
  const dialog = $("#projectEditorDialog");
  projectEditorState = {
    view,
    projectName: options.projectName || activeProjectName || null,
    modeId: options.modeId || null,
    returnFocus: document.activeElement
  };
  const inline = view === 'create-project';
  dialog.classList.toggle('is-inline',inline);
  dialog.setAttribute('role',inline ? 'region' : 'dialog');
  dialog.setAttribute('aria-modal',String(!inline));
  if (inline) {
    setUniversalSearchOpen(false);
    const area = areaFor('projects');
    area.classList.add('is-creating-project'); area.append(dialog);
    const edge = dockState.projects.edge;
    dockSizes[edge] = Math.max(dockSizes[edge],320);
    autoSpatialEdgeStates.set(edge,'expanded');
    showArea('projects',false); layoutDockAreas(false,false);
  } else { areaFor('projects').classList.remove('is-creating-project'); document.body.append(dialog); }
  renderProjectEditor();
  dialog.hidden = false;
  dialog.inert = false;
  dialog.setAttribute("aria-hidden", "false");
  if (!inline) {
    $('.desktop-shell').inert = true;
    $('#universalSearch').inert = true;
    document.body.classList.add('project-editor-open');
  }
  requestAnimationFrame(() => {
    dialog.classList.add("is-open");
    const preferred = $("input", dialog) || $("button", $("#projectEditorBody"));
    preferred?.focus({ preventScroll: true });
  });
}

function closeProjectEditor() {
  const dialog = $("#projectEditorDialog");
  if (!dialog || dialog.hidden) return;
  const returnFocus = projectEditorState?.returnFocus;
  const inline = dialog.classList.contains("is-inline");
  areaFor("projects").classList.remove("is-creating-project");
  dialog.classList.remove("is-open");
  dialog.setAttribute("aria-hidden", "true");
  dialog.inert = true;
  const overviewOpen = $("#universalSearch").classList.contains("is-open");
  $(".desktop-shell").inert = overviewOpen;
  $("#universalSearch").inert = !overviewOpen;
  document.body.classList.remove("project-editor-open");
  projectEditorState = null;
  if (inline) dialog.hidden = true;
  else setTimeout(() => { if (!dialog.classList.contains("is-open")) dialog.hidden = true; }, 110);
  returnFocus?.focus?.({ preventScroll: true });
}

function prepareProjectEditor() {
  const dialog = $("#projectEditorDialog");
  $("#createProjectButton").addEventListener("click", () => openProjectEditor("create-project"));
  $("#manageProjectButton").addEventListener("click", event => {
    event.stopPropagation();
    if (activeProjectName) openProjectEditor("manage", { projectName: activeProjectName });
  });
  $("#closeProjectEditor").addEventListener("click", closeProjectEditor);
  dialog.addEventListener("pointerdown", event => { if (event.target === dialog && !dialog.classList.contains("is-inline")) closeProjectEditor(); });
  dialog.addEventListener("submit", event => {
    const form = event.target.closest("[data-project-editor-form]");
    if (!form) return;
    event.preventDefault();
    const data = new FormData(form);
    if (form.dataset.projectEditorForm === "project") createProjectFromEditor(String(data.get("name") || ""), String(data.get("root") || ""), data.has("downloadToProject"));
  });
  dialog.addEventListener("change", event => {
    if (!event.target.matches("[data-project-download-toggle]")) return;
    const name = projectEditorState?.projectName;
    const project = projectSpaces[name];
    if (!project) return;
    project.downloadToProject = event.target.checked;
    if (project.downloadToProject) ensureProjectDownloads(name);
    persistProjectState();
    refreshDownloadUi();
    if (activeProjectName === name) renderProjectSpace(name);
    $(".project-download-destination b", dialog).textContent = SpatialHomeFolders.downloadDestination(workspaceProfiles, projectSpaces, activeWorkspace, name);
    queueDesktopStateBroadcast(0);
  });
  dialog.addEventListener("click", event => {
    const action = event.target.closest("[data-project-editor-action]");
    if (!action) return;
    const projectName = projectEditorState?.projectName;
    if (action.dataset.projectEditorAction === "close") closeProjectEditor();
    if (action.dataset.projectEditorAction === "manage") {
      projectEditorState.view = "manage";
      projectEditorState.modeId = null;
      renderProjectEditor();
    }
    if (action.dataset.projectEditorAction === "delete-project") {
      projectEditorState.view = "delete-project";
      renderProjectEditor();
    }
    if (action.dataset.projectEditorAction === "confirm-delete-project") deleteProject(projectName);
  });
}

function prepareProjectSpaces() {
  loadProjectState();
  $("#overviewProjectGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-overview-project]");
    if (!button) return;
    activateProject(button.dataset.overviewProject);
    showArea("projects");
    setUniversalSearchOpen(false);
  });
  $(".project-area").addEventListener("click", event => {
    const project = event.target.closest("[data-open-area-project]");
    if (project) {
      activateProject(project.dataset.openAreaProject);
      const rail = areaFor("projects").dataset.areaState === "rail";
      if (rail) showArea("projects");
      requestAnimationFrame(() => {
        const focusTarget = $("#projectSpaceContent");
        if (focusTarget && !focusTarget.hidden) focusTarget.focus({ preventScroll: true });
      });
      return;
    }
    if (event.target.closest("[data-create-area-project]")) return openProjectEditor("create-project");
    const item = event.target.closest("[data-project-item]");
    if (item) showToast("Opening " + item.dataset.projectItem);
  });
  $("#closeProjectButton").addEventListener("click", closeActiveProject);
  $("#projectRailClose").addEventListener("click", closeActiveProject);
  $("#projectQuickNote").addEventListener("input", event => {
    if (!activeProjectName) return;
    projectSpaces[activeProjectName].note = event.target.value;
    $("#projectNoteState").textContent = "Saving…";
    clearTimeout(projectNoteSaveTimer);
    projectNoteSaveTimer = setTimeout(() => {
      persistProjectState();
      queueDesktopStateBroadcast(0);
      $("#projectNoteState").textContent = "Saved";
    }, 320);
  });
  $("#projectResourceForm").addEventListener("submit", event => {
    event.preventDefault();
    addProjectResource($("#projectResourceInput").value);
    $("#projectResourceInput").value = "";
  });
  $("#projectRailNote").addEventListener("click", () => {
    showArea("projects");
    if (!activeProjectName) {
      const firstProject = Object.keys(projectSpaces)[0];
      if (firstProject) activateProject(firstProject, false);
      else return openProjectEditor("create-project");
    }
    focusProjectControl("#projectQuickNote");
  });
  $("#projectRailResource").addEventListener("click", () => {
    showArea("projects");
    if (!activeProjectName) {
      const firstProject = Object.keys(projectSpaces)[0];
      if (firstProject) activateProject(firstProject, false);
      else return openProjectEditor("create-project");
    }
    focusProjectControl("#projectResourceInput");
  });
  $("#projectRailSession").addEventListener("click", () => {
    if (!activeProjectName) {
      const firstProject = Object.keys(projectSpaces)[0];
      if (firstProject) activateProject(firstProject);
      else openProjectEditor("create-project");
    }
    else { setUniversalSearchOpen(true); $("#desktopColumnMap").scrollIntoView({block: "nearest"}); }
  });
  prepareProjectEditor();
  renderOverviewProjects();
  const initialProject = activeProjectName && projectSpaces[activeProjectName] ? activeProjectName : null;
  if (initialProject) renderProjectSpace(initialProject);
  else {
    activeProjectName = null;
    setProjectClosedState(true);
  }
}

const workspaceProfiles = {
  general: {
    label: "General", subtitle: "Personal desktop", icon: "i-grid", accent: "#56baff", home: "/home/demo",
    context: "Everyday files and personal tools", meta: "Personal desktop · no project open",
    folders: [["Desktop", "8 items", "folder"], ["Documents", "124 items", "folder"], ["Downloads", "31 items", "folder"], ["Projects", "Default project location", "folder"], [".spatial-workspace.toml", "Editable workspace settings", "config"]],
    rack: ["dolphin", "elisa", "browser", "terminal", "notes"],
    favorites: [["dolphin", "Dolphin"], ["browser", "Firefox"], ["elisa", "Elisa"], ["notes", "Notes"], ["i-mail", "Thunderbird"]],
    agenda: ["Personal", "Walk by the river", "18:00 · personal calendar"]
  },
  school: {
    label: "School", subtitle: "Classes and study", icon: "i-graduation", accent: "#f2b646", home: "/home/demo/Workspaces/School",
    context: "Read, compare and take field notes", meta: "Urban Ecology · research session",
    folders: [["Desktop", "4 items", "folder"], ["Documents", "6 courses", "folder"], ["Downloads", "12 items", "folder"], ["Projects", "Default project location", "folder"], [".spatial-workspace.toml", "Editable workspace settings", "config"]],
    rack: ["browser", "dolphin", "notes"],
    favorites: [["browser", "Firefox"], ["i-office", "Writer"], ["i-calendar", "Kalendar"], ["i-note", "Okular"], ["dolphin", "Dolphin"]],
    agenda: ["School", "Biology field report", "Due tomorrow · 16:00"]
  },
  work: {
    label: "Work", subtitle: "Focused session", icon: "i-office", accent: "#8d85ff", home: "/home/demo/Workspaces/Work",
    context: "Build a website and review its preview", meta: "Website Launch · Desktop",
    folders: [["Desktop", "3 items", "folder"], ["Documents", "42 items", "folder"], ["Downloads", "7 items", "folder"], ["Projects", "Default project location", "folder"], [".spatial-workspace.toml", "Editable workspace settings", "config"]],
    rack: ["browser", "terminal", "dolphin", "notes"],
    favorites: [["terminal", "Konsole"], ["i-code", "Kate"], ["browser", "Firefox"], ["dolphin", "Dolphin"], ["i-mail", "Mail"]],
    agenda: ["Work", "Staging review", "15:15 · Website Launch"]
  },
  gaming: {
    label: "Gaming", subtitle: "Games and friends", icon: "i-gamepad", accent: "#61d982", home: "/home/demo/Workspaces/Gaming",
    context: "Friends, games and background music", meta: "Co-op night · no project needed",
    folders: [["Desktop", "6 shortcuts", "folder"], ["Games", "23 installed", "folder"], ["Captures", "64 videos", "folder"], ["Projects", "Default project location", "folder"], [".spatial-workspace.toml", "Editable workspace settings", "config"]],
    rack: ["browser", "elisa", "dolphin", "terminal"],
    favorites: [["i-gamepad", "Steam"], ["i-gamepad", "Lutris"], ["i-web", "Discord"], ["i-monitor", "MangoHud"], ["dolphin", "Dolphin"]],
    agenda: ["Gaming", "Co-op session", "20:00 · voice chat"]
  }
};

if (desktopPreset === 'clean') Object.keys(workspaceProfiles).filter(id => id !== 'general').forEach(id => delete workspaceProfiles[id]);
try {
  const saved = JSON.parse(desktopStorage.getItem(SpatialWorkspaceSetup.profilesKey) || '{}');
  Object.entries(saved).forEach(([id, profile]) => {
    if (!/^workspace-[a-z0-9-]+$/.test(id) || !profile?.custom || typeof profile.label !== 'string') return;
    const created = SpatialWorkspaceSetup.createProfile(profile.label, {});
    workspaceProfiles[id] = {...created.profile, accent:/^#[a-f0-9]{6}$/i.test(profile.accent) ? profile.accent : created.profile.accent, home:'/home/demo/Workspaces/'+id};
  });
} catch {}

function renderWorkspaceTabs() {
  $('.workspace-tabs').innerHTML = Object.entries(workspaceProfiles).map(([id,profile]) => '<button class="workspace-tab" role="tab" aria-selected="' + (id === activeWorkspace) + '" tabindex="' + (id === activeWorkspace ? '0' : '-1') + '" data-workspace="' + id + '" style="--workspace-accent:' + profile.accent + '"><span class="workspace-glyph">' + icon(profile.icon) + '</span><span><b>' + escapeHtml(profile.label) + '</b><small>' + escapeHtml(profile.subtitle) + '</small></span></button>').join('');
}
function createWorkspaceFromEditor(label) {
  const created = SpatialWorkspaceSetup.createProfile(label,workspaceProfiles);
  if (!created) return null;
  const {id,profile} = created;
  workspaceProfiles[id] = profile;
  workspaceAppStates[id] = Object.fromEntries(Object.keys(appInfo).map(name => [name,'closed']));
  workspaceProjectStates[id] = {project:null,mode:null}; workspaceOpenProjects[id] = [];
  workspaceProjects[id] = null; windowMembership[id] = {};
  workspaceAreaContents[id] = {...defaultAreaContent,noteDraft:'',notifications:[],notificationsHtml:''};
  workspaceContent[id] = {note:'',apps:{}};
  workspaceAreaSessions[id] = snapshotAreaLayout();
  try { desktopStorage.setItem(SpatialWorkspaceSetup.profilesKey,JSON.stringify(Object.fromEntries(Object.entries(workspaceProfiles).filter(([,value])=>value.custom)))); } catch {}
  renderWorkspaceTabs(); renderWorkspace(id,false);
  persistWorkspaceAppStates(); persistProjectState(); saveIndependentSessions();
  setWorkspaceCreateOpen(false); setUniversalSearchOpen(false);
  showToast(profile.label + ' workspace created · its own Home folders');
  return id;
}
function setWorkspaceCreateOpen(open) {
  const form = $('#workspaceCreateForm'); form.hidden = !open;
  $('#newWorkspaceButton').setAttribute('aria-expanded',String(open));
  if (open) { form.reset(); requestAnimationFrame(()=>$('#workspaceName').focus()); }
}

// Every workspace exposes the same standard Home folders, alongside its extras.
Object.values(workspaceProfiles).forEach(profile => {
  const extras = profile.folders.filter(([name]) => !SpatialHomeFolders.standard.includes(name));
  profile.folders = [...SpatialHomeFolders.standard.map(name => [name, "Workspace folder", "folder"]), ...extras];
});
const workspaceDownloads = SpatialHomeFolders.create(readDesktopStorage("spatial-downloads-v1"));
function persistDownloads() {
  try { desktopStorage.setItem("spatial-downloads-v1", JSON.stringify(workspaceDownloads.snapshot())); } catch {}
}
function ensureProjectDownloads(name) {
  const project = projectSpaces[name];
  if (!project) return;
  workspaceDownloads.ensure(project.root.replace(/\/+$/, "") + "/Downloads");
  if (!project.files.some(([label]) => label === "Downloads")) project.files.push(["Downloads", "Downloaded files", "folder"]);
  persistDownloads();
}
function downloadContext(id, workspace = activeWorkspace) {
  const owner = desktopPages.columnOf(workspace, id);
  return {workspace, project: owner === "workspace" ? null : owner,
    directory: SpatialHomeFolders.downloadDestination(workspaceProfiles, projectSpaces, workspace, owner)};
}
function downloadPageNotes(id) {
  const frame = frameFor(id);
  if (!frame) return;
  // Capture the originating window, never the last selected project.
  const context = downloadContext(id);
  if (context.project && projectSpaces[context.project]?.downloadToProject) ensureProjectDownloads(context.project);
  const title = $(".app-identity small", frame).textContent || "Page notes";
  const file = workspaceDownloads.add(context.directory, title.replace(/[\\/]/g, "-") + ".txt", {
    ...context, source: $(".browser-toolbar input", frame).value,
    content: $(".demo-reading-page", frame)?.textContent || $(".app-identity small", frame).textContent
  });
  persistDownloads();
  refreshDownloadUi();
  captureWorkspaceContent();
  queueDesktopStateBroadcast(0);
  showToast("Demo download saved · " + file.path, {duration: 3200});
}
function refreshDownloadUi() {
  Object.keys(appInfo).forEach(id => {
    const frame = frameFor(id);
    const base = appInfo[id].base || id;
    if (base === "browser") {
      let section = $(".browser-downloads", frame);
      if (!section) {
        section = document.createElement("section");
        section.className = "browser-downloads";
        $(".start-page", frame).append(section);
      }
      const context = downloadContext(id);
      const recent = workspaceDownloads.list(context.directory).slice(-3).reverse();
      section.innerHTML = '<button class="surface-key" data-demo-download>Download page notes</button><small>Demo destination: <b>' + escapeHtml(context.directory) + '</b></small>' + recent.map(file => '<p>' + escapeHtml(file.name) + '</p>').join('') + '<button class="surface-key" data-open-download-folder="' + escapeHtml(context.directory) + '">Open download folder</button>';
      prepareControlSemantics(section);
    } else if (base === "dolphin" && frame.dataset.fileLocation) renderFileLocation(id, frame.dataset.fileLocation);
  });
}
function fileLocationRows(frame, path) {
  const profile = workspaceProfiles[activeWorkspace];
  let rows = [];
  if (path === profile.home) rows = profile.folders;
  else if (path === profile.home + "/Projects") rows = Object.values(projectSpaces).filter(project => project.originWorkspace === activeWorkspace).map(project => [project.name, "Project", "folder", project.root]);
  else {
    const project = Object.values(projectSpaces).find(project => project.root === path);
    if (project) rows = [[".spatial-project.toml", "Project settings", "config"], ...project.files];
    else if (frame.dataset.fileSeedPath === path) rows = JSON.parse(frame.dataset.fileSeedRows || "[]");
  }
  return [...rows, ...workspaceDownloads.list(path).map(file => [file.name, "Demo download", "document"])];
}
function renderFileLocation(id, path) {
  const frame = frameFor(id);
  if (!frame || !$(".file-list", frame)) return;
  frame.dataset.fileLocation = path;
  frame.dataset.fileWorkspace = activeWorkspace;
  $(".address-bar input", frame).value = path;
  $(".app-identity small", frame).textContent = path === workspaceProfiles[activeWorkspace].home ? "Home" : path.split('/').at(-1);
  const rows = fileLocationRows(frame, path);
  $(".file-list", frame).innerHTML = rows.map(([label, detail, type, target]) => '<button class="content-row"' + (type === "folder" ? ' data-file-folder="' + escapeHtml(target || path.replace(/\/+$/, '') + '/' + label) + '"' : '') + '><span><i class="' + (type === "folder" ? 'folder' : 'document') + '-glyph"></i>' + escapeHtml(label) + '</span><small>' + escapeHtml(detail) + '</small><small>Today</small></button>').join('') || '<p class="file-folder-empty">This folder is empty.</p>';
  $$("[data-home-folder]", frame).forEach(button => {
    const target = SpatialHomeFolders.folder(workspaceProfiles, activeWorkspace, button.dataset.homeFolder);
    const selected = path === target || (button.dataset.homeFolder !== "Home" && path.startsWith(target + '/'));
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.title = target;
  });
  $(".app-status span", frame).textContent = rows.length + " items";
  prepareControlSemantics(frame);
}
function openFileLocation(path) {
  let id = Object.keys(appInfo).find(name => (appInfo[name].base || name) === "dolphin" && appState[name] !== "closed" && desktopPages.inColumn(activeWorkspace, name));
  if (id) openApp(id);
  else id = createAppInstance("dolphin");
  renderFileLocation(id, path);
  captureWorkspaceContent();
  setUniversalSearchOpen(false);
}
function prepareHomeFolders() {
  document.addEventListener("click", event => {
    const frame = event.target.closest("[data-app-frame]");
    if (event.target.closest("[data-demo-download]") && frame) return downloadPageNotes(frame.dataset.appFrame);
    const downloads = event.target.closest("[data-open-download-folder]");
    if (downloads) return openFileLocation(downloads.dataset.openDownloadFolder);
    const place = event.target.closest("[data-home-folder]");
    if (place && frame) {
      renderFileLocation(frame.dataset.appFrame, SpatialHomeFolders.folder(workspaceProfiles, activeWorkspace, place.dataset.homeFolder));
      return captureWorkspaceContent();
    }
    const folder = event.target.closest("[data-file-folder]");
    if (folder && frame) {
      renderFileLocation(frame.dataset.appFrame, folder.dataset.fileFolder);
      return captureWorkspaceContent();
    }
    const workspaceFolder = event.target.closest("[data-workspace-folder]");
    if (workspaceFolder) openFileLocation(workspaceProfiles[activeWorkspace].home + '/' + workspaceFolder.dataset.workspaceFolder);
    const projectItem = event.target.closest("#projectRootItems [data-project-item]");
    if (projectItem && projectSpaces[activeProjectName]?.files.some(([name,, type]) => name === projectItem.dataset.projectItem && type === "folder")) openFileLocation(projectSpaces[activeProjectName].root + '/' + projectItem.dataset.projectItem);
  });
  document.addEventListener("change", event => {
    const frame = event.target.closest('[data-app-frame]');
    if (frame && event.target.matches('.address-bar input')) renderFileLocation(frame.dataset.appFrame, event.target.value);
  });
  Object.entries(projectSpaces).forEach(([name, project]) => { if (project.downloadToProject) ensureProjectDownloads(name); });
  refreshDownloadUi();
}


let activeWorkspace = (() => {
  try { return desktopStorage.getItem("spatial-active-workspace") || "general"; }
  catch { return "general"; }
})();
const workspaceAppStates = Object.fromEntries(Object.keys(workspaceProfiles).map(name => [name, desktopPreset === 'demo' && SpatialDemoExamples.scenarios[name] ? {...SpatialDemoExamples.scenarios[name].apps} : Object.fromEntries(Object.keys(appInfo).map(id => [id,'closed']))]));

function persistWorkspaceAppStates() {
  if (!workspaceProfiles[activeWorkspace]) return;
  workspaceAppStates[activeWorkspace] = { ...appState };
  try { desktopStorage.setItem("spatial-workspace-app-states-v1", JSON.stringify(workspaceAppStates)); } catch {}
}

function snapshotWorkspaceAreaContent() {
  return {
    noteDraft,
    terminalOutputHtml: $$("#terminalScreen > p").map(line => line.outerHTML).join(""),
    notificationsHtml: $("#notificationList").innerHTML,
    focus: { running: focusRunning, seconds: focusSeconds, visible: !$("#timerWidget").hidden, savedAt: Date.now() },
    hiddenWidgets: $$(".static-widget-stack>.system-widget", areaFor("systems")).map(widget => Boolean(widget.hidden)),
    scroll: { apps: $("#miniStack").scrollTop, systems: $(".system-scroll-region").scrollTop, projects: $("#projectSpaceContent").scrollTop }
  };
}

function restoreWorkspaceAreaContent(workspaceName) {
  const saved = workspaceAreaContents[workspaceName] || {
    ...defaultAreaContent, notificationsHtml: workspaceName === "general" ? defaultAreaContent.notificationsHtml : ""
  };
  hideNotificationPeek();
  clearTimeout(notificationAttentionTimer);
  $("#notificationList").innerHTML = saved.notificationsHtml ?? (saved.notifications || []).map(([title, detail, tone, glyph]) => '<article class="notification"><span class="app-badge ' + tone + '">' + icon(glyph) + '</span><div><b>' + escapeHtml(title) + '</b><small>' + escapeHtml(detail) + '</small></div><button class="dismiss-button" aria-label="Dismiss">×</button></article>').join("");
  noteDraft = typeof saved.noteDraft === "string" ? saved.noteDraft : SpatialDemoExamples.scenarios[workspaceName]?.note || noteDraft;
  $(".notes-layout textarea").value = noteDraft;
  $$("[data-mini-note]").forEach(field => { field.value = noteDraft; });
  if (typeof saved.terminalOutputHtml === "string") {
    $$("#terminalScreen > p").forEach(line => line.remove());
    $("#terminalInput").closest("label").insertAdjacentHTML("beforebegin", saved.terminalOutputHtml);
  }
  $$(".notification", $("#notificationList")).forEach(item => item.classList.remove("is-leaving", "is-new-attention"));
  areaFor("systems").classList.remove("has-notification-attention");
  $("#notificationWidget").classList.remove("has-new-attention");
  $$(".static-widget-stack>.system-widget", areaFor("systems")).forEach((widget, index) => { widget.hidden = Boolean(saved.hiddenWidgets?.[index]); });
  const timer = saved.focus || defaultAreaContent.focus;
  const elapsed = timer.running ? Math.max(0, Math.floor((Date.now() - timer.savedAt) / 1000)) : 0;
  focusSeconds = Math.max(0, timer.seconds - elapsed);
  $("#timerWidget").hidden = !timer.visible || !focusSeconds;
  $("#timerWidget").classList.toggle("is-visible", !$("#timerWidget").hidden);
  setFocusRunning(Boolean(timer.running && focusSeconds));
  syncNotifications();
  const scroll = saved.scroll || {};
  $("#miniStack").scrollTop = scroll.apps || 0;
  $(".system-scroll-region").scrollTop = scroll.systems || 0;
  $("#projectSpaceContent").scrollTop = scroll.projects || 0;
}

function captureCurrentWorkspaceSession() {
  if (!workspaceProfiles[activeWorkspace]) return;
  rememberWorkspaceProject();
  persistProjectState();
  workspaceAreaContents[activeWorkspace] = snapshotWorkspaceAreaContent();
  try { desktopStorage.setItem("spatial-workspace-area-contents-v1", JSON.stringify(workspaceAreaContents)); } catch {}
  persistWorkspaceAppStates();
  saveLayout();
  saveAreaLayout();
}

function workspaceFavoriteMarkup([asset, label]) {
  if (appInfo[asset]) return '<button class="workspace-favorite" data-open-app="' + asset + '" title="' + escapeHtml(label) + '">' + appArt(asset) + '</button>';
  return '<button class="workspace-favorite generic" data-toast="' + escapeHtml(label) + ' launched" title="' + escapeHtml(label) + '">' + icon(asset) + '</button>';
}

function renderOverviewWindows() {
  const target = $("#overviewWindowGrid");
  if (!target) return;
  const windowNames = Object.keys(appState).filter(name => appState[name] !== "closed" && desktopPages.inColumn(activeWorkspace, name));
  $("#workspaceOpenCount").textContent = windowNames.length + (windowNames.length === 1 ? " window" : " windows");
  target.innerHTML = windowNames.map(name => {
    const info = appInfo[name];
    const minimized = appState[name] === "minimized";
    const stateLabel = (minimized ? "Parked" : (desktopHasWindowFocus && isLocalApp(name) && name === frontApp ? "Active" : "Open")) + " · Desktop " + (desktopPages.pageOf(activeWorkspace, name) + 1);
    return '<button class="overview-window ' + (desktopHasWindowFocus && isLocalApp(name) && name === frontApp && !minimized ? "is-front " : "") + (minimized ? "is-minimized " : "") + name + '" data-overview-open-app="' + name + '" style="--overview-app:' + info.primary + '"><span class="overview-window-titlebar">' + appArt(name) + '<span><b>' + escapeHtml(info.label) + '</b><small>' + escapeHtml(stateLabel + " · " + info.detail) + '</small></span><i></i></span></button>';
  }).join("") || '<div class="workspace-no-windows"><span>' + icon("i-monitor") + '</span><b>No windows in this workspace</b><small>Open or unpark an application and it will appear here.</small></div>';

  refreshWorkspaceContext();
  renderDesktopColumnMap();
  prepareControlSemantics(target);
}

function refreshWorkspaceContext() {
  const profile = workspaceProfiles[activeWorkspace];
  if (!profile) return;
  const project = projectSpaces[activeProjectName];
  $("#workspaceContextMeta").textContent = profile.favorites.length + " favorite apps · private clipboard";
  $("#workspaceContextTitle").textContent = project ? "Active project: " + project.name : profile.context;
}

let activeOverviewView = "all";

function setOverviewView(view, focus = false) {
  /* Overview is intentionally one glanceable surface. Project context,
     favourite apps, open windows and live system state remain visible at the
     same time instead of being split into tabs. Keep this function as a
     compatibility entry point for older callers and saved sessions. */
  activeOverviewView = "all";
  const home = $("#overviewHome");
  home.dataset.overviewState = "all";
  $(".open-windows-section").hidden = false;
  $(".overview-projects-section").hidden = false;
  $(".workspace-home-card").hidden = false;
  $(".overview-apps-section").hidden = false;
  $(".overview-main").hidden = false;
  $(".overview-widgets").hidden = false;
  renderOverviewWindows();
  if (focus) $("#overviewHome")?.focus?.({preventScroll:true});
}

function prepareOverviewViews() {
  setOverviewView("all");
}

function renderWorkspace(name, announce = true) {
  if (globalThis.SpatialGuide?.model.active() && !SpatialGuide.settingUp && name !== activeWorkspace && !SpatialGuide.model.allows('workspaces')) return;
  if (name !== activeWorkspace) endSystemRailExpansion(false);
  const profile = workspaceProfiles[name];
  if (!profile) return;
  if (name !== activeWorkspace && !desktopSyncApplying) captureCurrentWorkspaceSession();
  activeWorkspace = name;
  restoreWorkspaceProject(name);
  Object.assign(appState, workspaceAppStates[name]);
  loadLayout(name);
  applyAreaSession(name);
  frontApp = Object.keys(appState).find(appName => appState[appName] === "open") || null;
  document.body.dataset.workspace = name;
  document.body.style.setProperty("--workspace-accent", profile.accent);
  document.body.style.setProperty("--workspace-accent-soft", profile.accent + "26");
  $$("[data-workspace]").forEach(button => {
    const selected = button.dataset.workspace === name;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  $("#activeWorkspaceLabel").textContent = profile.label;
  const otherHomes = $('.other-workspaces small');
  if (otherHomes) otherHomes.textContent = Object.entries(workspaceProfiles).filter(([id])=>id!==name).map(([,item])=>item.label).join(' · ') || 'Create another workspace in Overview';
  $("#openWindowsTitle").textContent = profile.label + " workspace";
  $("#workspaceHomeTitle").textContent = profile.label + " Home";
  $("#workspaceHomePath").textContent = profile.home;
  $("#workspaceHomeIcon use").setAttribute("href", "#" + profile.icon);
  $("#workspaceContextTitle").textContent = profile.context;
  refreshWorkspaceContext();
  $("#workspaceFolders").innerHTML = profile.folders.map(([label, detail, type = "folder"]) => '<button class="workspace-folder' + (type === "config" ? " workspace-config-file" : "") + '" ' + (type === "config" ? 'data-toast="Opening ' + escapeHtml(label) : 'data-workspace-folder="' + escapeHtml(label)) + '"><span>' + icon(type === "config" ? "i-code" : "i-folder") + '</span><span><b>' + escapeHtml(label) + '</b><small>' + escapeHtml(detail) + '</small></span></button>').join("");
  $("#workspaceFavorites").innerHTML = profile.favorites.map(workspaceFavoriteMarkup).join("");
  $("#workspaceAgendaHeading").textContent = profile.agenda[0];
  $("#workspaceAgendaTitle").textContent = profile.agenda[1];
  $("#workspaceAgendaMeta").textContent = profile.agenda[2];
  $("#systemAgendaTitle").textContent = profile.agenda[1];
  $("#systemAgendaMeta").textContent = profile.agenda[2];
  $("#appsAreaContext").textContent = profile.label + " workspace";
  $("#systemAreaContext").textContent = profile.label + " workspace";
  renderWorkspaceExample(name);
  $("#appRack").innerHTML = profile.rack.map((appName, index) => {
    const info = appInfo[appName];
    const state = appState[appName];
    const slot = index + 1;
    const shortcut = "Super+" + slot;
    return '<button class="app-key ' + (state !== "closed" ? "is-open " : "") + (state === "open" && appName === frontApp ? "is-active" : "") + '" data-open-app="' + appName + '" data-hotbar-slot="' + slot + '" aria-label="' + escapeHtml(info.label) + ' · ' + shortcut + '" aria-keyshortcuts="Meta+' + slot + '" title="' + escapeHtml(info.label) + ' · ' + shortcut + '"><kbd class="app-hotkey" aria-hidden="true">' + slot + '</kbd>' + appArt(appName) + '<span>' + escapeHtml(info.label) + '</span><i></i></button>';
  }).join("");
  applyAppPrimaryColors($("#appRack"));
  prepareControlSemantics($("#appRack"));
  if (activeProjectName) renderProjectSpace(activeProjectName);
  else { setProjectClosedState(true); renderOverviewProjects(); }
  syncApps();
  restoreWorkspaceAreaContent(name);
  const overview = $("#allAppsToggle");
  $("use", overview).setAttribute("href", "#" + profile.icon);
  updateDesktopPageUi();
  try { desktopStorage.setItem("spatial-active-workspace", name); } catch {}
  persistWorkspaceAppStates();
  persistProjectState();
  requestAnimationFrame(() => {
    if (activeWorkspace !== name) return;
    restoreWorkspaceWindowLayout();
    if (frontApp && desktopHasWindowFocus) bringToFront(frontApp);
    if (layoutMode === "auto") scheduleSpatialAutoLayout();
  });
  if (announce) showToast(profile.label + " workspace loaded");
}

function renderDemoAppExample(id, example) {
  const frame = frameFor(id);
  if (!frame || !example) return;
  const key = activeWorkspace + ":" + JSON.stringify(example);
  if (frame.dataset.demoExample === key) return;
  frame.dataset.demoExample = key;
  $(".app-identity small", frame).textContent = example.shortTitle;
  appInfo[id].detail = example.shortTitle;
  if (appInfo[id].base) appInfo[id].label = appInfo[appInfo[id].base].label + " · " + example.shortTitle;
  if (example.note !== undefined) {
    $(".notes-layout .nav-choice", frame).textContent = example.shortTitle;
    $(".notes-layout textarea", frame).value = example.note;
  }
  if (example.browser) {
    const page = example.browser;
    $(".browser-toolbar input", frame).value = example.address || page.subtitle;
    $(".start-page", frame).innerHTML = '<div class="demo-reading-page"><span class="small-heading">' + escapeHtml(page.subtitle) + '</span><h2>' + escapeHtml(page.title) + '</h2><p>' + escapeHtml(page.intro) + '</p><div class="site-grid">' + page.links.map(label => '<button class="surface-key" data-demo-link="' + escapeHtml(label) + '">' + escapeHtml(label) + '</button>').join('') + '</div><section class="demo-page-detail"><h3>' + escapeHtml(example.shortTitle) + '</h3><p>' + escapeHtml(page.detail || page.intro) + '</p></section></div>';
  }
  if (example.folder) {
    frame.dataset.fileSeedPath = example.folder;
    frame.dataset.fileSeedRows = JSON.stringify(example.files);
    $(".address-bar input", frame).value = example.folder;
    $(".file-list", frame).innerHTML = example.files.map(([label, detail, type]) => '<button class="content-row"><span><i class="' + (type === "folder" ? "folder" : "document") + '-glyph"></i>' + escapeHtml(label) + '</span><small>' + escapeHtml(detail) + '</small><small>Today</small></button>').join('');
    $$(".places-list .nav-choice", frame).forEach(choice => {
      const selected = choice.textContent.trim() === (example.folder === workspaceProfiles[activeWorkspace].home ? "Home" : example.folder.includes('/Documents') ? "Documents" : "");
      choice.classList.toggle("is-active", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
    $(".app-status span", frame).textContent = example.files.length + " items";
  }
  if (example.terminal) {
    const terminal = $(".terminal-screen", frame);
    $$("p", terminal).forEach(line => line.remove());
    $("label", terminal).insertAdjacentHTML("beforebegin", '<p><b>demo@desktop</b>:<i>' + escapeHtml(example.terminal.path) + '</i>$ ' + escapeHtml(example.terminal.command) + '</p><p class="terminal-output">' + escapeHtml(example.terminal.output).replaceAll('\n','<br>') + '</p>');
  }
  if (example.music) {
    $(".track-copy h2", frame).textContent = example.music.title;
    $(".track-copy p", frame).textContent = example.music.artist;
    $(".album-block span", frame).textContent = example.shortTitle;
    $(".playlist", frame).innerHTML = example.music.tracks.map((track,index) => '<button class="content-row' + (index === 0 ? ' is-selected' : '') + '"><span>' + String(index+1).padStart(2,'0') + ' · ' + escapeHtml(track) + '</span><small>' + escapeHtml(example.music.artist) + '</small><small>3:38</small></button>').join('');
  }
  if (example.folder) renderFileLocation(id, example.folder);
  if (example.browser) refreshDownloadUi();
  prepareControlSemantics(frame);
}

function renderWorkspaceExample(name) {
  if (desktopPreset !== "demo") return;
  const example = SpatialDemoExamples.scenarios[name];
  if (!example) return;
  // Seeded identities keep their own content; switching columns never replaces
  // a project’s notes with the workspace’s personal draft.
  for (const column of example.windows) {
    for (const window of column.windows) {
      if (desktopPages.columnOf(name, window.id) !== column.column) continue;
      renderDemoAppExample(window.id, window.content);
    }
  }
  const personal = SpatialDemoExamples.workspaceWindows[name].find(window => window.base === "notes");
  if (personal && typeof workspaceAreaContents[name]?.noteDraft !== "string") noteDraft = personal.content.note;
}

function persistWorkspaceNote() {
  workspaceAreaContents[activeWorkspace] = { ...(workspaceAreaContents[activeWorkspace] || {}), noteDraft };
  try {
    desktopStorage.setItem("spatial-note-draft-v1", noteDraft);
    desktopStorage.setItem("spatial-workspace-area-contents-v1", JSON.stringify(workspaceAreaContents));
  } catch {}
}

function prepareWorkspaces() {
  if (!workspaceProfiles[activeWorkspace]) activeWorkspace = "general";
  defaultAreaContent = snapshotWorkspaceAreaContent();
  try { Object.assign(workspaceAreaContents, JSON.parse(desktopStorage.getItem("spatial-workspace-area-contents-v1") || "{}")); } catch {}
  try {
    const savedStates = JSON.parse(desktopStorage.getItem("spatial-workspace-app-states-v1") || "{}");
    Object.entries(savedStates).forEach(([name, states]) => {
      if (!workspaceProfiles[name] || !states) return;
      workspaceAppStates[name] = { ...workspaceAppStates[name], ...states };
    });
  } catch {}
  renderWorkspaceTabs();
  $('.workspace-tabs').addEventListener('click',event => { const tab = event.target.closest('[data-workspace]'); if (tab) renderWorkspace(tab.dataset.workspace); });
  $('#newWorkspaceButton').addEventListener('click',()=>setWorkspaceCreateOpen($('#workspaceCreateForm').hidden));
  $('#cancelWorkspaceCreate').addEventListener('click',()=>setWorkspaceCreateOpen(false));
  $('#workspaceCreateForm').addEventListener('submit',event=>{event.preventDefault();createWorkspaceFromEditor($('#workspaceName').value);});
  $(".workspace-tabs").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = $$("[role=tab]", event.currentTarget);
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    renderWorkspace(tabs[next].dataset.workspace);
    tabs[next].focus();
  });
  $("#overviewWindowGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-overview-open-app]");
    if (button) {
      const name = button.dataset.overviewOpenApp;
      changeDesktopColumn(desktopPages.columnOf(activeWorkspace, name), false);
      openApp(name); setUniversalSearchOpen(false);
    }
  });
  $("#workspaceFavorites").addEventListener("click", event => {
    const toast = event.target.closest("[data-toast]");
    if (toast) showToast(toast.dataset.toast);
  });
  $("#workspaceFolders").addEventListener("click", event => {
    const button = event.target.closest("[data-toast]");
    if (button) showToast(button.dataset.toast);
  });
  renderWorkspace(activeWorkspace, false);
}

const packageModes = {
  template: { summary: "A reusable layout with app requirements and widgets, but no personal files.", workspaceSize: "6.4 MB", projectSize: "420 KB" },
  portable: { summary: "A portable copy with settings and the files you select.", workspaceSize: "1.8 GB", projectSize: "286 MB" },
  handoff: { summary: "A resumable snapshot with open windows and session context.", workspaceSize: "1.9 GB", projectSize: "301 MB" }
};

let packageKind = "workspace";
let packageMode = "portable";
let packageLastFocus = null;

function packageRows(kind) {
  const workspaceRows = [
    ["i-folder", "Workspace Home", "Desktop, Documents, Downloads and selected files", "1.6 GB", true],
    ["i-grid", "Desktop context", "Area layout, favourites, widgets and wallpaper", "3.8 MB", true],
    ["i-folder", "Selected projects", Object.values(projectSpaces).map(project => project.name).join(", ") || "No projects", Object.keys(projectSpaces).length + " links", true],
    ["i-archive", "App requirements", "Package names and suggested versions", "33 apps", true],
    ["i-monitor", "Window session", "Open apps, positions and view state", "optional", packageMode === "handoff"]
  ];
  const projectRows = [
    ["i-folder", "Project folder", "Files under the project root", "274 MB", true],
    ["i-link", "Linked resources", "Portable copies or safe relative references", "2 links", true],
    ["i-note", "Notes and widgets", "Project notes and selected widget state", "84 KB", true],
    ["i-grid", "Window session", "Project windows across desktop pages and displays", "all desktops", true],
    ["i-clipboard", "Project clipboard", "Off by default because it may be sensitive", "optional", false]
  ];
  return kind === "project" ? projectRows : workspaceRows;
}

function renderPackageComposer() {
  const profile = workspaceProfiles[activeWorkspace];
  const project = projectSpaces[activeProjectName];
  const subject = packageKind === "project" ? project.name : profile.label;
  const suffix = packageKind === "project" ? ".project" : ".workspace";
  $("#packageKicker").textContent = packageKind === "project" ? "PORTABLE PROJECT" : "PORTABLE WORKSPACE";
  $("#packageTitle").textContent = "Pack " + subject;
  $("#packageFileName").textContent = subject.replace(/\s+/g, "-") + suffix;
  $("#packageSummary").textContent = packageModes[packageMode].summary;
  $("#packageSize").textContent = packageModes[packageMode][packageKind + "Size"];
  $$("[data-package-mode]").forEach(button => {
    const selected = button.dataset.packageMode === packageMode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-checked", String(selected));
  });
  $("#packageContentList").innerHTML = packageRows(packageKind).map(([itemIcon, label, detail, size, checked]) => '<label class="package-content-row"><input type="checkbox" ' + (checked ? "checked" : "") + '><span>' + icon(itemIcon) + '</span><span><b>' + escapeHtml(label) + '</b><small>' + escapeHtml(detail) + '</small></span><small>' + escapeHtml(size) + '</small></label>').join("");
  prepareControlSemantics($("#packageDialog"));
}

function openPackageDialog(kind = "workspace", direction = "pack") {
  packageKind = kind;
  const dialog = $("#packageDialog");
  packageLastFocus = document.activeElement;
  $("#packageComposer").hidden = direction !== "pack";
  $("#importPreview").hidden = direction !== "import";
  if (direction === "pack") renderPackageComposer();
  else {
    $("#packageKicker").textContent = "IMPORT PREVIEW";
    $("#packageTitle").textContent = "Review shared Workspace";
  }
  dialog.hidden = false;
  dialog.inert = false;
  dialog.setAttribute("aria-hidden", "false");
  $(".desktop-shell").inert = true;
  $("#universalSearch").inert = true;
  document.body.classList.add("package-open");
  requestAnimationFrame(() => {
    dialog.classList.add("is-open");
    $("[data-close-package]", dialog)?.focus({preventScroll:true});
  });
}

function closePackageDialog() {
  const dialog = $("#packageDialog");
  dialog.classList.remove("is-open");
  dialog.setAttribute("aria-hidden", "true");
  dialog.inert = true;
  const overviewOpen = $("#universalSearch").classList.contains("is-open");
  $(".desktop-shell").inert = overviewOpen;
  $("#universalSearch").inert = !overviewOpen;
  document.body.classList.remove("package-open");
  setTimeout(() => { if (!dialog.classList.contains("is-open")) dialog.hidden = true; }, 120);
  const returnFocus = packageLastFocus;
  packageLastFocus = null;
  requestAnimationFrame(() => returnFocus?.focus?.({preventScroll:true}));
}

function preparePackages() {
  $$("[data-open-package]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); openPackageDialog(button.dataset.openPackage); }));
  $$("[data-close-package]").forEach(button => button.addEventListener("click", closePackageDialog));
  $("[data-import-package]").addEventListener("click", () => openPackageDialog("workspace", "import"));
  $$("[data-package-mode]").forEach(button => button.addEventListener("click", () => { packageMode = button.dataset.packageMode; renderPackageComposer(); }));
  $("#packageSelectAll").addEventListener("click", () => $$("input[type=checkbox]", $("#packageContentList")).forEach(input => { input.checked = true; }));
  $("#createPackage").addEventListener("click", () => {
    const button = $("#createPackage");
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = icon("i-timer") + "<span>Building preview…</span>";
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = original;
      closePackageDialog();
      showToast((packageKind === "project" ? "Project" : "Workspace") + " package preview created");
    }, 650);
  });
  $("#importWorkspace").addEventListener("click", () => { closePackageDialog(); showToast("Creative Studio workspace imported · preview"); });
  $("#importProjectOnly").addEventListener("click", () => { closePackageDialog(); showToast("2 projects imported · preview"); });
  $("#packageDialog").addEventListener("pointerdown", event => { if (event.target === $("#packageDialog")) closePackageDialog(); });
  renderPackageComposer();
}

function ensureOpenWindowGeometry() {
  const workspace = workspaceBounds();
  const defaults = {
    dolphin: { x: workspace.width * .03, y: workspace.height * .04, width: workspace.width * .78, height: workspace.height * .78 },
    elisa: { x: workspace.width * .24, y: workspace.height * .23, width: workspace.width * .73, height: workspace.height * .72 }
  };
  Object.entries(defaults).forEach(([name, geometry]) => {
    if (appState[name] !== "open") return;
    const frame = frameFor(name);
    frame.hidden = false;
    frame.style.visibility = "visible";
    frame.style.opacity = "1";
    const rect = frame.getBoundingClientRect();
    const isUsable = rect.width >= Math.min(300, workspace.width * .65) && rect.height >= Math.min(220, workspace.height * .65);
    if (!isUsable) applyGeometry(name, geometry, false);
  });
}

function prepareWindows(root = document) {
  $$("[data-app-frame]", root).forEach(frame => {
    const actions = $(".window-actions", frame);
    if (!$('[data-window-action="maximize"]', actions)) {
      const maximize = document.createElement("button");
      maximize.className = "surface-key window-key";
      maximize.dataset.windowAction = "maximize";
      maximize.setAttribute("aria-label", "Maximize " + appInfo[frame.dataset.appFrame].label);
      maximize.setAttribute("aria-pressed", "false");
      maximize.innerHTML = icon("i-max");
      actions.insertBefore(maximize, $(".danger", actions));
    }
    syncMaximizeButton(frame);
    bindWindowDrag(frame);
    bindResize(frame);
    frame.addEventListener("pointerdown", () => bringToFront(frame.dataset.appFrame));
    $(".app-titlebar", frame).addEventListener("dblclick", event => {
      if (!event.target.closest("button,input,a")) toggleMaximize(frame.dataset.appFrame);
    });
    $(".app-titlebar", frame).title = "Left drag: tile · scroll while holding: carry to another desktop · middle drag or Alt+drag: float and borrow Area space · double-click: Maximize";
    frame.addEventListener("auxclick", event => {
      if (event.button === 1 && event.target.closest(".app-titlebar,.resize-handle")) event.preventDefault();
    });
    $(".app-titlebar", frame).addEventListener("wheel", event => {
      if (!event.altKey || event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      growTileWindow(frame.dataset.appFrame, event.deltaY < 0 ? 1 : -1);
    }, { passive: false });
  });

  $$("[data-window-action]", root).forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const name = button.closest("[data-app-frame]").dataset.appFrame;
    if (button.dataset.windowAction === "minimize") minimizeApp(name);
    if (button.dataset.windowAction === "maximize") toggleMaximize(name);
    if (button.dataset.windowAction === "close") closeApp(name);
  }));
  $$('[data-window-action="maximize"]', root).forEach(button => button.addEventListener("pointerdown", event => {
    if (event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    toggleAppFullscreen(button.closest("[data-app-frame]").dataset.appFrame);
  }));
  if (root === document) document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !tileSession().fullscreen || ["#universalSearch", "#packageDialog", "#projectEditorDialog"].some(selector => $(selector).classList.contains("is-open")) || !$("#desktopContextMenu").hidden) return;
    event.preventDefault();
    toggleAppFullscreen(tileSession().fullscreen.name);
  });
  const observer = new ResizeObserver(() => { if (windowViewportLockReady) scheduleWindowTiling(); });
  if (root === document) observer.observe($(".workspace-zone"));
}

$("#allAppsToggle").addEventListener("click", () => {
  setUniversalSearchOpen(!$("#universalSearch").classList.contains("is-open"));
});

/* App entries are rebuilt whenever a Workspace changes. Keep one delegated
   launcher so rail icons, Overview entries, favourites and the app grid all
   continue to work after their markup is replaced. */
document.addEventListener("click", event => {
  const button = event.target.closest("[data-open-app]");
  if (!button) return;
  if (event.shiftKey) createAppInstance(button.dataset.openApp);
  else openApp(button.dataset.openApp);
  if (button.closest("#universalSearch")) setUniversalSearchOpen(false);
});

$$("[data-launch-app]").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.launchApp === 'Spatial Guide') { setUniversalSearchOpen(false); SpatialGuide.open(); return; }
  pulseBusyCursor();
  showToast(button.dataset.launchApp + " launched");
  if (button.closest("#universalSearch")) setUniversalSearchOpen(false);
}));

let activeLauncherCategory = "all";
$("#overviewCategory").addEventListener("change", event => {
  activeLauncherCategory = event.target.value;
  $$("[data-category-filter]").forEach(button => {
    const selected = button.dataset.categoryFilter === activeLauncherCategory;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  filterLauncher();
});
$("#overviewClose").addEventListener("click", () => setUniversalSearchOpen(false));
$("[data-workspace-home]").addEventListener("click", () => {
  openFileLocation(SpatialHomeFolders.home(workspaceProfiles, activeWorkspace));
});
$("#overviewNotificationList").addEventListener("click", event => {
  const button = event.target.closest("[data-overview-dismiss]");
  if (!button) return;
  const notification = $$(".notification", $("#notificationList"))[Number(button.dataset.overviewDismiss)];
  if (notification) $(".dismiss-button", notification)?.click();
});

function filterLauncher() {
  let visible = 0;
  $$(".launcher-app", $("#allAppsGrid")).forEach(button => {
    const matchesCategory = activeLauncherCategory === "all" ||
      (activeLauncherCategory === "favorites" && button.dataset.favorite === "true") ||
      button.dataset.category === activeLauncherCategory;
    const taughtApp = !globalThis.SpatialGuide?.model.active() || SpatialGuide.model.allows('all') || button.dataset.openApp || button.dataset.launchApp === 'Spatial Guide';
    button.hidden = !matchesCategory || !taughtApp;
    if (!button.hidden) visible += 1;
  });
  $("#allAppsCount").textContent = visible + (visible === 1 ? " app" : " apps");
  $("#allAppsEmpty").hidden = visible !== 0;
}

$$("[data-category-filter]").forEach(button => button.addEventListener("click", () => {
  activeLauncherCategory = button.dataset.categoryFilter;
  $("#overviewCategory").value = activeLauncherCategory;
  $$("[data-category-filter]").forEach(choice => {
    const selected = choice === button;
    choice.classList.toggle("is-active", selected);
    choice.setAttribute("aria-pressed", String(selected));
  });

  filterLauncher();
}));

filterLauncher();

let universalLastFocus = null;

function normalizeSearchText(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function matchesSearch(value, query) {
  const text = normalizeSearchText(value);
  const words = normalizeSearchText(query).split(" ").filter(Boolean);
  return words.length > 0 && words.every(word => text.includes(word));
}

function buildUniversalAppResults(query) {
  const target = $("#universalAppResults");
  const matches = $$(".launcher-app", $("#allAppsGrid")).filter(button => {
    if (globalThis.SpatialGuide?.model.active() && !SpatialGuide.model.allows('all') && !button.dataset.openApp && button.dataset.launchApp !== 'Spatial Guide') return false;
    const searchable = `${button.textContent} ${button.dataset.category || ""}`.toLowerCase();
    return matchesSearch(searchable, query);
  });

  target.innerHTML = matches.map(button => {
    const action = button.dataset.openApp
      ? `data-search-open-app="${button.dataset.openApp}"`
      : `data-search-launch-app="${button.dataset.launchApp}"`;
    const iconMarkup = $(".launcher-icon", button).innerHTML;
    const label = button.lastElementChild.textContent.trim();
    const category = button.dataset.category || "application";
    return `<button class="universal-result" ${action}><span class="universal-app-icon">${iconMarkup}</span><span><b>${label}</b><small>${category[0].toUpperCase() + category.slice(1)}</small></span></button>`;
  }).join("");
  return matches.length;
}

function projectSearchResults(query) {
  const results = [];
  Object.entries(projectSpaces).forEach(([id, project]) => {
    const searchable = [project.name, project.root, project.summary, ...Object.values(project.modes).map(mode => mode.label)].join(" ");
    if (matchesSearch(searchable, query)) results.push({ id, label: project.name, detail: project.root, search: searchable });
    if (!globalThis.SpatialMemoryDesktop) (project.resources || []).forEach(([label, detail]) => {
      const search = label + " " + detail;
      if (matchesSearch(search, query)) results.push({ id, label, detail: project.name + " · " + detail, search, resource: label });
    });
    if (!globalThis.SpatialMemoryDesktop && matchesSearch(project.note || "", query)) results.push({ id, label: project.name + " · Quick note", detail: "Open this project's note", search: project.note, note: true });
  });
  return results;
}

function buildUniversalProjectResults(query) {
  $("#universalProjectResults").innerHTML = projectSearchResults(query).map(result =>
    '<button class="universal-result" data-search-project="' + escapeHtml(result.id) + '" data-universal-search="' + escapeHtml(result.search) + '"' +
    (result.resource ? ' data-search-resource="' + escapeHtml(result.resource) + '"' : '') + (result.note ? ' data-search-project-note="true"' : '') +
    '><span class="universal-symbol violet">' + icon(result.note ? "i-note" : "i-folder") + '</span><span><b>' + escapeHtml(result.label) + '</b><small>' + escapeHtml(result.detail) + '</small></span></button>'
  ).join("");
  prepareControlSemantics($("#universalProjectResults"));
}

function filterUniversalSearch() {
  const rawQuery = $("#universalSearchInput").value.trim();
  const query = rawQuery.toLowerCase();
  const searching = query.length > 0;
  $("#overviewHome").hidden = searching;
  $("#universalResults").hidden = !searching;

  if (!searching) {
    $("#universalSearchStatus").hidden = true;
    $("#universalWebLabel").textContent = "Search the web";
    return;
  }

  let localVisible = buildUniversalAppResults(query);
  const guideLimited = globalThis.SpatialGuide?.model.active() && !SpatialGuide.model.allows('all');
  const guideAppsOnly = guideLimited && !SpatialGuide.model.allows('projects');
  globalThis.SpatialMemoryDesktop?.search(query);
  if (!guideAppsOnly) buildUniversalProjectResults(query);
  else $("#universalProjectResults").innerHTML = '';

  $$(".universal-result", $("#universalResults")).filter(result => !result.closest("#universalAppResults")).forEach(result => {
    const group = result.closest("[data-universal-group]").dataset.universalGroup;
    if (guideLimited && !(['projects','memory'].includes(group) && SpatialGuide.model.allows('projects')) && !(group === 'files' && SpatialGuide.model.allows('folders'))) { result.hidden = true; return; }
    const isWeb = group === "web";
    const searchable = `${result.dataset.universalSearch || ""} ${result.textContent}`;
    const matchesQuery = isWeb || Boolean(result.dataset.memoryResult) || matchesSearch(searchable, query);
    result.hidden = !matchesQuery;
    if (!result.hidden && !isWeb) localVisible += 1;
  });

  $$(".universal-group", $("#universalResults")).forEach(group => {
    group.hidden = !$(".universal-result:not([hidden])", group);
  });

  $("#universalWebLabel").textContent = `Search the web for “${rawQuery}”`;
  $("#universalEmpty").hidden = localVisible !== 0;
  $("#universalSearchStatus").hidden = false;
  $("#universalSearchStatus").textContent = localVisible + (guideLimited ? (guideAppsOnly ? (localVisible === 1 ? ' application result' : ' application results') : (localVisible === 1 ? ' local result' : ' local results')) : (localVisible === 1 ? " desktop result" : " desktop results") + " · Web search available");
}

function setUniversalSearchOpen(open) {
  if (open && globalThis.SpatialGuide?.model.active() && !SpatialGuide.model.allows('overview')) return;
  const overlay = $("#universalSearch");
  if (open === overlay.classList.contains("is-open")) return;
  if (open) universalLastFocus = document.activeElement;
  overlay.classList.toggle("is-open", open);
  overlay.inert = !open;
  overlay.setAttribute("aria-hidden", String(!open));
  $(".desktop-shell").inert = open;
  document.body.classList.toggle("universal-search-open", open);
  const contextToggle = $("#desktopContextToggle");
  if (contextToggle) {
    contextToggle.setAttribute("aria-expanded", String(open));
    contextToggle.setAttribute("aria-pressed", String(open));
  }

  if (open) {
    if (currentDisplayProfile === "dual") overlay.dataset.monitor = lastDesktopPointerX < window.innerWidth / 2 ? "left" : "right";
    else delete overlay.dataset.monitor;
    $("#universalSearchInput").value = "";
    $("#allAppsToggle").classList.add("is-active");
    $("#allAppsToggle").setAttribute("aria-expanded", "true");
    $("#allAppsToggle").setAttribute("aria-pressed", "true");
    setOverviewView("desktop");
    syncNotifications();
    filterUniversalSearch();
    requestAnimationFrame(() => {
      $("#universalSearchInput").focus();
      $("#universalSearchInput").select();
    });
  } else {
    $("#allAppsToggle").classList.remove("is-active");
    $("#allAppsToggle").setAttribute("aria-expanded", "false");
    $("#allAppsToggle").setAttribute("aria-pressed", "false");
    if (universalLastFocus && universalLastFocus.focus) universalLastFocus.focus({preventScroll:true});
    universalLastFocus = null;
  }
}

$("#universalSearchInput").addEventListener("input", filterUniversalSearch);

$("#universalAppResults").addEventListener("click", event => {
  const result = event.target.closest(".universal-result");
  if (!result) return;
  if (result.dataset.searchOpenApp) openApp(result.dataset.searchOpenApp);
  if (result.dataset.searchLaunchApp) {
    if (result.dataset.searchLaunchApp === 'Spatial Guide') { setUniversalSearchOpen(false); SpatialGuide.open(); return; }
    pulseBusyCursor();
    showToast(result.dataset.searchLaunchApp + " launched");
  }
  setUniversalSearchOpen(false);
});

$("#universalProjectResults").addEventListener("click", event => {
  const result = event.target.closest("[data-search-project]");
  if (!result || !projectSpaces[result.dataset.searchProject]) return;
  activateProject(result.dataset.searchProject);
  showArea("projects", false);
  setUniversalSearchOpen(false);
  if (result.dataset.searchProjectNote) focusProjectControl("#projectQuickNote");
  if (result.dataset.searchResource) showToast("Opening " + result.dataset.searchResource);
});

$$('.universal-result').forEach(button => button.addEventListener("click", () => setUniversalSearchOpen(false)));
$("#universalWebResult").addEventListener("click", () => {
  openApp("browser");
  const query = $("#universalSearchInput").value.trim();
  showToast(query ? `Searching the web for “${query}”` : "Web search opened");
});
$("#universalTimer").addEventListener("click", () => $("#launchTimer").click());
$("#overviewTimer").addEventListener("click", () => {
  $("#launchTimer").click();
  setUniversalSearchOpen(false);
});
$("#universalSearch").addEventListener("pointerdown", event => {
  if (event.target === $("#universalSearch")) setUniversalSearchOpen(false);
});

filterUniversalSearch();

function prepareMaterialCursor() {
  const cursor = $("#materialCursor");
  const desktop = $(".desktop-shell");
  if (!cursor || !desktop || !window.matchMedia("(pointer:fine)").matches) return;

  const cursorModes = ["is-pointer", "is-text", "is-col-resize", "is-row-resize", "is-diag-resize", "is-grab", "is-grabbing", "is-move", "is-forbidden", "is-help", "is-progress", "is-copy"];
  let lastX = 0;
  let lastY = 0;
  let lastBorderTarget = null;

  const parseSurfaceColor = value => {
    const match = String(value || "").match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    const parts = match[1].trim().split(/[\s,\/]+/).map(Number);
    if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
    return [parts[0], parts[1], parts[2], Number.isFinite(parts[3]) ? parts[3] : 1];
  };
  const syncBorderColor = target => {
    if (!target || target === lastBorderTarget) return;
    lastBorderTarget = target;
    const lightTheme = document.body.dataset.theme === "light";
    let surface = lightTheme ? [226, 232, 235] : [5, 11, 17];
    const chain = [];
    for (let node = target; node instanceof Element; node = node.parentElement) chain.push(node);
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      const color = parseSurfaceColor(getComputedStyle(chain[index]).backgroundColor);
      if (!color || color[3] <= 0) continue;
      const alpha = Math.min(1, Math.max(0, color[3]));
      surface = color.slice(0, 3).map((channel, channelIndex) => channel * alpha + surface[channelIndex] * (1 - alpha));
    }
    const [red, green, blue] = surface.map(channel => Math.round(Math.min(255, Math.max(0, channel))));
    const linear = [red, green, blue].map(channel => {
      const value = channel / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    cursor.style.setProperty("--cursor-border-color", `rgb(${red} ${green} ${blue})`);
    cursor.style.setProperty("--cursor-mark-color", luminance > .42 ? "rgb(4 9 13)" : "rgb(242 251 255)");
  };

  const syncButtons = buttons => {
    cursor.classList.toggle("is-left", (buttons & 1) === 1);
    cursor.classList.toggle("is-right", (buttons & 2) === 2);
  };
  const syncMode = (target, buttons = 0) => {
    cursor.classList.remove(...cursorModes);
    if (document.body.classList.contains("cursor-busy")) {
      cursor.classList.add("is-progress");
      return;
    }
    if ($(".drag-ghost")) {
      cursor.classList.add("is-copy");
      return;
    }
    if ($(".app-frame.is-dragging")) {
      cursor.classList.add("is-move");
      return;
    }
    if (!target || !target.closest) return;
    const explicitMode = target.closest("[data-cursor]")?.dataset.cursor;
    if (target.closest(":disabled,[aria-disabled='true']")) cursor.classList.add("is-forbidden");
    else if (explicitMode === "help") cursor.classList.add("is-help");
    else if (target.closest(".tile-divider-x")) cursor.classList.add("is-col-resize");
    else if (target.closest(".tile-divider-y")) cursor.classList.add("is-row-resize");
    else if (target.closest(".zone-resizer")) cursor.classList.add("is-col-resize");
    else if (target.closest("[data-area-resize]") && ["left", "right"].includes(target.closest("[data-area-window]")?.dataset.dockEdge)) cursor.classList.add("is-col-resize");
    else if (target.closest("[data-area-resize]") && ["top", "bottom"].includes(target.closest("[data-area-window]")?.dataset.dockEdge)) cursor.classList.add("is-row-resize");
    else if (target.closest(".resize-handle")) cursor.classList.add("is-diag-resize");
    else if (target.closest("textarea,[contenteditable='true'],input:not([type]),input[type='text'],input[type='search']")) cursor.classList.add("is-text");
    else if (target.closest(".app-titlebar,.area-window-bar") && !target.closest("button,input,a")) cursor.classList.add("is-move");
    else if (target.closest(".mini-card header") && !target.closest("button,input,a")) cursor.classList.add((buttons & 1) ? "is-grabbing" : "is-grab");
    else if (target.closest("button,a,label,input[type='range'],select")) cursor.classList.add("is-pointer");
  };
  const release = () => {
    syncButtons(0);
    syncMode(document.elementFromPoint(lastX, lastY), 0);
  };

  [desktop, $("#universalSearch"), $("#packageDialog"), $("#projectEditorDialog")].filter(Boolean).forEach(surface => {
    surface.addEventListener("pointerenter", event => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      cursor.classList.add("is-visible");
    });
    surface.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-visible");
      release();
    });
    surface.addEventListener("pointermove", event => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      lastX = event.clientX;
      lastY = event.clientY;
      cursor.style.setProperty("--cursor-x", event.clientX + "px");
      cursor.style.setProperty("--cursor-y", event.clientY + "px");
      cursor.classList.add("is-visible");
      syncButtons(event.buttons);
      const target = document.elementFromPoint(event.clientX, event.clientY);
      syncBorderColor(target);
      syncMode(target, event.buttons);
    }, {passive:true});
    surface.addEventListener("pointerdown", event => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      syncButtons(event.buttons);
      syncMode(event.target, event.buttons);
    });
    surface.addEventListener("contextmenu", event => event.preventDefault());
  });
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", release);
  window.addEventListener("material-cursor-release", release);
  window.addEventListener("material-cursor-mode", () => {
    const target = document.elementFromPoint(lastX, lastY);
    lastBorderTarget = null;
    syncBorderColor(target);
    syncMode(target, 0);
  });
}

let superKeyAlone = false;

function trapDialogFocus(root, event) {
  if (event.key !== "Tab") return false;
  const focusable = $$('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])', root)
    .filter(element => !element.hidden && element.offsetParent !== null);
  if (!focusable.length) return false;
  const first = focusable[0];
  const last = focusable.at(-1);
  const outside = !root.contains(document.activeElement);
  if (outside || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey && !outside ? last : first).focus();
    return true;
  }
  return false;
}

function activateHotbarSlot(slot) {
  const name = workspaceShortcutNames()[slot - 1];
  if (!appInfo[name]) return false;

  /* Match a desktop taskbar while retaining the game-hotbar directness:
     first press opens/focuses, pressing the already-front slot parks it. */
  const visibleHere = appState[name] === "open" && isLocalApp(name);
  if (visibleHere && desktopHasWindowFocus && frontApp === name) minimizeApp(name);
  else if (visibleHere) bringToFront(name);
  else openApp(name);

  if ($("#universalSearch").classList.contains("is-open")) setUniversalSearchOpen(false);
  const currentButton = $('#appRack [data-hotbar-slot="' + slot + '"]');
  if (currentButton) {
    currentButton.classList.remove("is-hotkey-pulse");
    void currentButton.offsetWidth;
    currentButton.classList.add("is-hotkey-pulse");
    window.setTimeout(() => currentButton.classList.remove("is-hotkey-pulse"), 90);
  }
  queueDesktopStateBroadcast();
  return true;
}

document.addEventListener("keydown", event => {
  const packageDialog = $("#packageDialog");
  const projectEditorDialog = $("#projectEditorDialog");
  const universalSearch = $("#universalSearch");
  if (packageDialog.classList.contains("is-open") && trapDialogFocus(packageDialog, event)) return;
  if (projectEditorDialog.classList.contains("is-open") && !projectEditorDialog.classList.contains("is-inline") && trapDialogFocus(projectEditorDialog, event)) return;
  if (universalSearch.classList.contains("is-open") && trapDialogFocus(universalSearch, event)) return;

  if (projectEditorDialog.classList.contains("is-open") || packageDialog.classList.contains("is-open")) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (projectEditorDialog.classList.contains("is-open")) closeProjectEditor();
      else closePackageDialog();
    }
    return;
  }

  const isSuper = event.key === "Meta" || event.key === "OS";
  if (isSuper && !event.repeat) {
    superKeyAlone = true;
    return;
  }
  if (event.metaKey && !isSuper) superKeyAlone = false;

  const hotbarMatch = /^(?:Digit|Numpad)([0-9])$/.exec(event.code);
  const superHeld = event.metaKey || event.getModifierState?.("OS");
  /* Browsers on Windows/KDE may never receive OS-reserved Super+number.
     Alt+number mirrors it only inside this prototype so the behavior remains
     testable; the desktop-shell binding remains Super+number. */
  const demoHotbarHeld = event.altKey && !event.metaKey && !event.ctrlKey;
  if (hotbarMatch && !event.repeat && (superHeld || demoHotbarHeld) && !event.ctrlKey) {
    event.preventDefault();
    event.stopPropagation();
    superKeyAlone = false;
    activateHotbarSlot((Number(hotbarMatch[1]) || 10) + (event.shiftKey ? 10 : 0));
    return;
  }

  if (event.key === "Escape" && $("#packageDialog").classList.contains("is-open")) {
    event.preventDefault();
    event.stopPropagation();
    closePackageDialog();
    return;
  }

  if (event.key === "Escape" && projectEditorDialog.classList.contains("is-open")) {
    event.preventDefault();
    event.stopPropagation();
    closeProjectEditor();
    return;
  }

  const universalShortcut = event.code === "Space" && (event.metaKey || event.altKey || event.ctrlKey);
  if (universalShortcut) {
    event.preventDefault();
    superKeyAlone = false;
    setUniversalSearchOpen(!$("#universalSearch").classList.contains("is-open"));
    return;
  }

  if (event.key === "Escape" && $("#universalSearch").classList.contains("is-open")) {
    event.preventDefault();
    setUniversalSearchOpen(false);
    return;
  }

  if ($("#universalSearch").classList.contains("is-open") && !$("#universalResults").hidden && (event.target === $("#universalSearchInput") || event.target.closest("#universalResults")) && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
    event.preventDefault();
    const results = $$(".universal-result:not([hidden])", $("#universalResults"));
    if (!results.length) return;
    const current = results.indexOf(document.activeElement);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const next = current === -1 ? (direction > 0 ? 0 : results.length - 1) : (current + direction + results.length) % results.length;
    results[next].focus();
  }

  if ($("#universalSearch").classList.contains("is-open") && event.key === "Enter" && !$("#universalResults").hidden && document.activeElement === $("#universalSearchInput")) {
    const first = $(".universal-result:not([hidden])", $("#universalResults"));
    if (first) {
      event.preventDefault();
      first.click();
    }
  }
});

document.addEventListener("keyup", event => {
  const projectEditorDialog = $("#projectEditorDialog");
  const packageDialog = $("#packageDialog");
  if (projectEditorDialog.classList.contains("is-open") || packageDialog.classList.contains("is-open")) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (projectEditorDialog.classList.contains("is-open")) closeProjectEditor();
      else closePackageDialog();
    }
    return;
  }

  const isSuper = event.key === "Meta" || event.key === "OS";
  if (isSuper && superKeyAlone) {
    event.preventDefault();
    setUniversalSearchOpen(!$("#universalSearch").classList.contains("is-open"));
  }
  if (isSuper) superKeyAlone = false;
});
window.addEventListener("blur", () => { superKeyAlone = false; });

$$("[data-toast]").forEach(button => button.addEventListener("click", () => showToast(button.dataset.toast)));
function setSystemToggle(label, active, persist = true) {
  $$(".quick-toggle").filter(button => button.id !== "themeToggle" && button.textContent.trim() === label).forEach(button => {
    button.classList.toggle("is-active", Boolean(active));
    button.setAttribute("aria-pressed", String(Boolean(active)));
  });
  if (persist) {
    const saved = readDesktopStorage("spatial-system-toggles-v1");
    saved[label] = Boolean(active);
    try { desktopStorage.setItem("spatial-system-toggles-v1", JSON.stringify(saved)); } catch {}
  }
}

Object.entries(readDesktopStorage("spatial-system-toggles-v1")).forEach(([label, active]) => setSystemToggle(label, active, false));
$$("[data-toggle]").forEach(button => button.addEventListener("click", () => {
  const active = !button.classList.contains("is-active");
  if (button.classList.contains("quick-toggle")) setSystemToggle(button.textContent.trim(), active);
  else {
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}));

SpatialDesktopTheme.bind($("#themeToggle"));
SpatialDesktopTheme.onChange = () => queueDesktopStateBroadcast(0);
$("#themeToggle").addEventListener("click", () => {
  SpatialDesktopTheme.next();
  showToast(SpatialDesktopTheme.preference === "auto" ? "Auto theme · follows system" : $("#themeToggle span:last-child").textContent + " surface");
});

$$(".nav-choice").forEach(button => button.addEventListener("click", () => {
  const nav = button.closest("nav");
  $$(".nav-choice", nav).forEach(other => {
    const selected = other === button;
    other.classList.toggle("is-active", selected);
    other.setAttribute("aria-pressed", String(selected));
  });
}));

$$(".folder-tab").forEach(tab => tab.addEventListener("click", event => {
  if (event.target.tagName === "SPAN") {
    if ($$(".folder-tab").length > 1) tab.remove();
    return;
  }
  $$(".folder-tab").forEach(other => {
    const selected = other === tab;
    other.classList.toggle("is-active", selected);
    other.setAttribute("aria-selected", String(selected));
  });
}));

$$(".content-row").forEach(row => row.addEventListener("click", () => {
  const parent = row.parentElement;
  $$(".content-row", parent).forEach(other => other.classList.toggle("is-selected", other === row));
}));
$(".file-list").addEventListener("click", event => {
  const row = event.target.closest(".content-row");
  if (row) $$(".content-row", event.currentTarget).forEach(item => item.classList.toggle("is-selected", item === row));
});
$(".start-page").addEventListener("click", event => {
  const link = event.target.closest("[data-demo-link]");
  if (!link) return;
  $$("[data-demo-link]", event.currentTarget).forEach(item => item.classList.toggle("is-selected", item === link));
  showToast(link.dataset.demoLink + " selected");
});

function formatTime(seconds) {
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

function syncMusic() {
  document.body.classList.toggle("music-playing", musicPlaying);
  $$(".play-toggle").forEach(button => {
    button.innerHTML = icon(musicPlaying ? "i-pause" : "i-play");
    button.classList.toggle("is-active", musicPlaying);
    button.setAttribute("aria-pressed", String(musicPlaying));
    button.setAttribute("aria-label", musicPlaying ? "Pause" : "Play");
    button.title = musicPlaying ? "Pause" : "Play";
  });
  $$(".track-range").forEach(range => {
    range.value = musicPosition;
    updateRangeLight(range);
  });
  if ($("#elapsedMain")) $("#elapsedMain").textContent = formatTime(musicPosition);
  const overviewProgress = $(".overview-track i");
  if (overviewProgress) overviewProgress.style.width = (musicPosition / 218 * 100) + "%";
}

function setMusicPlaying(next) {
  musicPlaying = next;
  clearInterval(musicTimer);
  if (musicPlaying) musicTimer = setInterval(() => {
    musicPosition = musicPosition >= 218 ? 0 : musicPosition + 1;
    syncMusic();
  }, 1000);
  syncMusic();
}

function bindMusicControls() {
  $$("[data-music]").forEach(button => {
    if (button.dataset.bound) return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      if (button.dataset.music === "play") setMusicPlaying(!musicPlaying);
      else showToast(button.dataset.music === "next" ? "Next track" : "Previous track");
    });
  });
  $$(".track-range").forEach(range => {
    if (range.dataset.bound) return;
    range.dataset.bound = "true";
    range.addEventListener("input", event => {
      musicPosition = Number(event.target.value);
      syncMusic();
    });
  });
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  $$(".live-time").forEach(label => label.textContent = time);
  const day = now.toLocaleDateString("en-GB", { weekday: "long" });
  const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  $("#dayLabel").textContent = day;
  $("#dateLabel").textContent = date;
  $("#overviewDayLabel").textContent = day;
  $("#overviewDateLabel").textContent = date;
  $("#overviewAgendaDay").textContent = now.getDate();
  $("#systemRailDate").textContent = now.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  $("#monthLabel").textContent = now.toLocaleDateString("en-GB", { month: "long" });
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstMondayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const previousDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstMondayIndex - 1; i >= 0; i--) cells.push({ day: previousDays - i, outside: true });
  for (let day = 1; day <= days; day++) cells.push({ day, today: day === now.getDate() });
  let next = 1;
  while (cells.length < 35) cells.push({ day: next++, outside: true });
  $("#calendarGrid").innerHTML = cells.map(cell => '<button class="' + (cell.today ? "is-today" : "") + " " + (cell.outside ? "is-outside" : "") + '">' + cell.day + "</button>").join("");
}

function updateTimer() {
  $("#timerValue").textContent = formatTime(focusSeconds);
  $("#systemRailTimerValue").textContent = formatTime(focusSeconds);
  const railTimer = $("#systemRailTimer");
  railTimer.setAttribute("aria-pressed", String(focusRunning));
  railTimer.classList.toggle("is-active", focusRunning);
  railTimer.setAttribute("aria-label", (focusRunning ? "Pause" : "Start") + " focus timer");
  railTimer.title = (focusRunning ? "Pause" : "Start") + " focus timer · " + formatTime(focusSeconds);
  $("#timerProgress").style.width = 100 - focusSeconds / (25 * 60) * 100 + "%";
  $("#timerState").textContent = focusRunning ? "Running" : focusSeconds === 25 * 60 ? "Ready" : "Paused";
  $("#timerToggle").textContent = focusRunning ? "Pause" : "Start";
  $("#timerToggle").setAttribute("aria-pressed", String(focusRunning));
  $("#overviewTimer small").textContent = (focusRunning ? "Running" : focusSeconds === 25 * 60 ? "Ready" : "Paused") + " · " + formatTime(focusSeconds);
}

function revealDynamicWidget(widget) {
  widget.hidden = false;
  requestAnimationFrame(() => widget.classList.add("is-visible"));
}

function concealDynamicWidget(widget) {
  widget.classList.remove("is-visible");
  window.setTimeout(() => {
    if (!widget.classList.contains("is-visible")) widget.hidden = true;
  }, 170);
}

function positionNotificationPeek() {
  const peek = $("#notificationPeek");
  if (!peek?.classList.contains("is-visible")) return;
  const area = areaFor("systems");
  const edge = area?.dataset.dockEdge || dockState.systems?.edge || "right";
  const railVisible = area && !area.hidden && !area.classList.contains("is-on-other-display") && area.dataset.areaState === "rail";
  const rect = railVisible ? area.getBoundingClientRect() : null;
  const gap = 8;
  const inset = 12;
  const width = Math.min(292, Math.max(224, window.innerWidth - inset * 2));
  const height = peek.offsetHeight || 58;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  let left;
  let top;

  peek.style.width = width + "px";
  peek.dataset.edge = edge;
  if (edge === "left") {
    left = rect ? rect.right + gap : inset;
    top = rect ? clamp(rect.top + 58, inset, window.innerHeight - height - inset) : clamp(window.innerHeight * .28, inset, window.innerHeight - height - inset);
  } else if (edge === "right") {
    left = rect ? rect.left - width - gap : window.innerWidth - width - inset;
    top = rect ? clamp(rect.top + 58, inset, window.innerHeight - height - inset) : clamp(window.innerHeight * .28, inset, window.innerHeight - height - inset);
  } else if (edge === "top") {
    left = rect ? clamp(rect.right - width - 8, inset, window.innerWidth - width - inset) : window.innerWidth - width - inset;
    top = rect ? rect.bottom + gap : inset;
  } else {
    left = rect ? clamp(rect.right - width - 8, inset, window.innerWidth - width - inset) : window.innerWidth - width - inset;
    top = rect ? rect.top - height - gap : window.innerHeight - height - inset;
  }
  peek.style.left = clamp(left, inset, window.innerWidth - width - inset) + "px";
  peek.style.top = clamp(top, inset, window.innerHeight - height - inset) + "px";
}

function hideNotificationPeek() {
  const peek = $("#notificationPeek");
  clearTimeout(notificationPeekTimer);
  clearTimeout(notificationPeekAttentionTimer);
  peek?.classList.remove("is-visible");
  peek?.classList.remove("is-attending");
  peek?.setAttribute("aria-hidden", "true");
}

function showNotificationPeek(title, detail, tone, glyph) {
  const peek = $("#notificationPeek");
  if (!peek) return;
  peek.style.setProperty("--peek-tone", "var(--" + tone + ")");
  const iconElement = $("#notificationPeekIcon");
  iconElement.className = "notification-peek-icon " + tone;
  iconElement.innerHTML = icon(glyph);
  $("#notificationPeekTitle").textContent = title;
  $("#notificationPeekDetail").textContent = detail;
  peek.setAttribute("aria-hidden", "false");
  peek.classList.add("is-visible");
  clearTimeout(notificationPeekAttentionTimer);
  peek.classList.remove("is-attending");
  void peek.offsetWidth;
  peek.classList.add("is-attending");
  notificationPeekAttentionTimer = setTimeout(() => peek.classList.remove("is-attending"), 2500);
  requestAnimationFrame(positionNotificationPeek);
  clearTimeout(notificationPeekTimer);
  notificationPeekTimer = setTimeout(hideNotificationPeek, 3400);
}

function drawAttentionToNotification(item, title, detail, tone, glyph) {
  const area = areaFor("systems");
  const local = area && !area.hidden && !area.classList.contains("is-on-other-display") && isLocalArea("systems");
  const expanded = local && area.dataset.areaState === "expanded" && !$("#universalSearch")?.classList.contains("is-open");
  clearTimeout(notificationAttentionTimer);
  $$(".notification.is-new-attention", $("#notificationList")).forEach(notification => notification.classList.remove("is-new-attention"));
  area?.classList.remove("has-notification-attention");
  $("#notificationWidget")?.classList.remove("has-new-attention");

  if (expanded) {
    hideNotificationPeek();
    item.classList.add("is-new-attention");
    area.classList.add("has-notification-attention");
    $("#notificationWidget").classList.add("has-new-attention");
    item.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    notificationAttentionTimer = setTimeout(() => {
      item.classList.remove("is-new-attention");
      area.classList.remove("has-notification-attention");
      $("#notificationWidget")?.classList.remove("has-new-attention");
    }, 2500);
    return;
  }

  if (local && area.dataset.areaState === "rail") area.classList.add("has-notification-attention");
  showNotificationPeek(title, detail, tone, glyph);
  notificationAttentionTimer = setTimeout(() => area?.classList.remove("has-notification-attention"), 2500);
}

function addNotification(title, detail, tone = "blue", glyph = "i-bell") {
  const item = document.createElement("article");
  item.className = "notification";
  item.style.setProperty("--notification-tone", "var(--" + tone + ")");
  item.innerHTML = '<span class="app-badge ' + tone + '">' + icon(glyph) + '</span><div><b>' + escapeHtml(title) + '</b><small>' + escapeHtml(detail) + '</small></div><button class="dismiss-button" aria-label="Dismiss">×</button>';
  $("#notificationList").prepend(item);
  syncNotifications();
  requestAnimationFrame(() => drawAttentionToNotification(item, title, detail, tone, glyph));
}

function syncNotifications() {
  const count = $$(".notification", $("#notificationList")).length;
  $("#notificationCount").textContent = count;
  $("#systemRailNotificationCount").textContent = count || "Clear";
  $("#systemRailNotifications").title = count + (count === 1 ? " notification" : " notifications");
  $("#overviewNotifications").hidden = count === 0;
  $("#overviewNotificationCount").textContent = count;
  $("#overviewNotificationList").innerHTML = $$(".notification", $("#notificationList")).map((item, index) => '<article class="overview-notification"><span><b>' + escapeHtml($("b", item)?.textContent || "Notification") + '</b><small>' + escapeHtml($("small", item)?.textContent || "") + '</small></span><button class="dismiss-button" data-overview-dismiss="' + index + '" aria-label="Dismiss ' + escapeHtml($("b", item)?.textContent || "notification") + '">×</button></article>').join("");
  prepareControlSemantics($("#overviewNotificationList"));
  if (count) revealDynamicWidget($("#notificationWidget"));
  else concealDynamicWidget($("#notificationWidget"));
}

function setFocusRunning(running) {
  focusRunning = running;
  clearInterval(focusTimer);
  if (focusRunning) focusTimer = setInterval(() => {
    focusSeconds = Math.max(0, focusSeconds - 1);
    if (!focusSeconds) {
      focusRunning = false;
      clearInterval(focusTimer);
      addNotification("Focus timer finished", "25 minute session completed", "blue", "i-timer");
      concealDynamicWidget($("#timerWidget"));
    }
    updateTimer();
  }, 1000);
  updateTimer();
}

// Rails use the same workspace state as their expanded widgets.
function systemRailExpansionOwns(target) {
  if (areaFor("systems")?.contains(target)) return true;
  // A context menu opened by the panel is still part of its current task.
  return Boolean(target?.closest?.("#desktopContextMenu") &&
    (contextMenuState?.name === "systems" || areaFor("systems")?.contains(contextMenuState?.element)));
}

function endSystemRailExpansion(reflow = true) {
  if (!systemRailExpansion) return;
  systemRailExpansion = null;
  const area = areaFor("systems");
  delete area.dataset.railExpanded;
  if (reflow) {
    if (area.contains(document.activeElement)) document.activeElement.blur();
    layoutDockAreas(false, false);
  }
}

function applySystemRailExpansion(width, height) {
  if (!systemRailExpansion) return;
  const area = areaFor("systems");
  const edge = dockState.systems.edge;
  if (systemRailExpansion.workspace !== activeWorkspace || systemRailExpansion.edge !== edge ||
      area.hidden || !isLocalArea("systems") || area.dataset.areaState !== "rail") {
    endSystemRailExpansion(false);
    return;
  }
  const vertical = edge === "left" || edge === "right";
  const thickness = Math.min(vertical ? width : height, vertical ? 280 : 250);
  const base = {
    x: parseFloat(area.style.left) || 0,
    y: parseFloat(area.style.top) || 0,
    width: parseFloat(area.style.width),
    height: parseFloat(area.style.height),
    joinEdge: area.dataset.areaJoinEdge
  };
  area.dataset.areaState = "expanded";
  area.dataset.railExpanded = "true";
  applyDockRect("systems", {
    ...base,
    x: edge === "right" ? width - thickness : base.x,
    y: edge === "bottom" ? height - thickness : base.y,
    width: vertical ? thickness : base.width,
    height: vertical ? base.height : thickness
  });
  area.style.zIndex = "230";
}

function revealSystemRailWidget(selector) {
  const area = areaFor("systems");
  if (area.dataset.areaState === "rail") {
    systemRailExpansion = { workspace: activeWorkspace, edge: dockState.systems.edge, trigger: document.activeElement };
    layoutDockAreas(false, false);
  } else if (area.hidden) showArea("systems", false);
  const expansion = systemRailExpansion;
  requestAnimationFrame(() => {
    if (expansion && expansion !== systemRailExpansion) return;
    const widget = $(selector);
    const focusTarget = widget && !widget.hidden ? widget : $(".system-scroll-region", area);
    focusTarget.tabIndex = -1;
    focusTarget.focus({ preventScroll: true });
    focusTarget.scrollIntoView({ block: "nearest" });
  });
}

function prepareSystemRailExpansion() {
  const leave = event => {
    if (systemRailExpansion && !systemRailExpansionOwns(event.target)) endSystemRailExpansion();
  };
  document.addEventListener("pointerdown", leave, { capture: true });
  document.addEventListener("focusin", leave, { capture: true });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !systemRailExpansion || !$("#desktopContextMenu").hidden) return;
    const trigger = systemRailExpansion.trigger;
    endSystemRailExpansion();
    trigger?.focus({ preventScroll: true });
    event.preventDefault();
  });
  window.addEventListener("blur", () => endSystemRailExpansion());
}
$("#systemRailNotifications").addEventListener("click", () => revealSystemRailWidget("#notificationWidget"));
$("#systemRailCalendar").addEventListener("click", () => revealSystemRailWidget(".calendar-widget"));
$("#systemRailTimer").addEventListener("click", () => {
  if (!focusSeconds) focusSeconds = 25 * 60;
  revealDynamicWidget($("#timerWidget"));
  setFocusRunning(!focusRunning);
});

$("#launchTimer").addEventListener("click", () => {
  if (!focusSeconds) focusSeconds = 25 * 60;
  revealDynamicWidget($("#timerWidget"));
  setFocusRunning(true);
});

$("#timerToggle").addEventListener("click", () => {
  setFocusRunning(!focusRunning);
});

$("#timerReset").addEventListener("click", () => {
  clearInterval(focusTimer);
  focusRunning = false;
  focusSeconds = 25 * 60;
  updateTimer();
  concealDynamicWidget($("#timerWidget"));
});

$("#notificationList").addEventListener("click", event => {
  const button = event.target.closest(".dismiss-button");
  if (!button) return;
  const item = button.closest(".notification");
  item.classList.add("is-leaving");
  window.setTimeout(() => {
    item.remove();
    syncNotifications();
  }, 140);
});

$("#notificationPeek").addEventListener("click", () => {
  hideNotificationPeek();
  revealSystemRailWidget("#notificationWidget");
});

$$('[data-phone-ping]').forEach(button => button.addEventListener("click", () => {
  addNotification("Phone ping sent", "Phone is ringing", "cyan", "i-phone");
}));

$("#terminalInput").addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  const value = event.target.value.trim();
  if (!value) return;
  const line = document.createElement("p");
  line.className = "terminal-output";
  terminalPreview = terminalResult(value);
  line.textContent = terminalPreview;
  event.target.closest("label").before(line);
  if (value === "clear") $$(".terminal-screen > p").forEach(item => item.remove());
  event.target.value = "";
  queueDesktopStateBroadcast();
});

let desktopFolderCount = 0;
let contextMenuState = null;

function contextMenuDescriptor(target, clientX = 0, clientY = 0) {
  if (!target?.closest || target.closest("#desktopContextMenu")) return null;

  const appControl = target.closest("[data-open-app],[data-overview-open-app],[data-search-open-app],[data-mini-card]");
  if (appControl) {
    const name = appControl.dataset.openApp || appControl.dataset.overviewOpenApp || appControl.dataset.searchOpenApp || appControl.dataset.miniCard;
    if (appInfo[name]) return { kind: "app", name, title: appInfo[name].label };
  }

  const titlebar = target.closest(".app-titlebar");
  if (titlebar) {
    const frame = titlebar.closest("[data-app-frame]");
    const name = frame?.dataset.appFrame;
    if (appInfo[name]) return { kind: "app", name, title: appInfo[name].label + " window" };
  }

  const file = target.closest(".file-list .content-row");
  if (file) {
    const label = $("span", file)?.textContent?.trim() || "File";
    return { kind: "file", title: label, label, element: file };
  }

  const projectItem = target.closest("[data-project-item]");
  if (projectItem) {
    return {
      kind: "project-item",
      title: projectItem.dataset.projectItem,
      label: projectItem.dataset.projectItem,
      linked: Boolean(projectItem.closest("#projectLinkedItems")),
      element: projectItem
    };
  }

  const projectMode = target.closest("[data-project-mode]");
  if (projectMode && activeProjectName) {
    const modeId = projectMode.dataset.projectMode;
    return { kind: "project-mode", name: activeProjectName, modeId, title: projectSpaces[activeProjectName]?.modes[modeId]?.label || "Project mode" };
  }

  const projectCard = target.closest("[data-overview-project]");
  if (projectCard) {
    const name = projectCard.dataset.overviewProject;
    if (projectSpaces[name]) return { kind: "project", name, title: projectSpaces[name].name };
  }

  const widget = target.closest(".system-widget");
  if (widget) {
    return {
      kind: "widget",
      title: $("h2", widget)?.textContent?.trim() || "System widget",
      element: widget
    };
  }

  const area = target.closest("[data-area-window]");
  if (area && (target.closest(".area-window-bar") || area.dataset.areaState === "rail" || !target.closest("button,input,textarea,a"))) {
    const name = area.dataset.areaWindow;
    return { kind: "area", name, title: areaLabel(name) };
  }

  if (target.closest(".workspace-zone") && !target.closest(".app-frame")) {
    return { kind: "desktop", title: "Desktop", point: { x: clientX, y: clientY } };
  }
  return null;
}

function contextMenuEntries(context) {
  const separator = { separator: true };
  if (context.kind === "app") {
    const state = appState[context.name];
    const frame = frameFor(context.name);
    const maximized = frame?.dataset.maximized === "true";
    return [
      globalThis.SpatialMemoryDesktop ? {action:"memory-remember",icon:"i-note",label:"Save selection to Stash",shortcut:"Ctrl+Shift+M"} : null,
      { action: "app-new-instance", icon: "i-add", label: "New window", shortcut: "Shift+click" },
      state !== "closed" && desktopPages.pageOf(activeWorkspace, context.name) > 0 ? { action: "move-desktop:-1", icon: "i-monitor", label: "Move to desktop above" } : null,
      state !== "closed" ? { action: "move-desktop:1", icon: "i-monitor", label: "Move to desktop below" } : null,
      ...(state !== "closed" ? Object.entries(workspaceProfiles).filter(([id]) => id !== activeWorkspace).map(([id, profile]) => ({action: "move-workspace:" + id, icon: "i-monitor", label: "Move to " + profile.label + " workspace"})) : []),
      ...(state !== "closed" ? Object.entries(projectSpaces).map(([id, project]) => ({action: "move-project:" + id, icon: "i-folder", label: "Move to " + project.name})) : []),
      state !== "closed" && windowMembership[activeWorkspace]?.[context.name] ? {action: "detach-project", icon: "i-folder", label: "Take out of project · keep open"} : null,
      { action: "app-open", icon: state === "open" ? "i-right" : "i-play", label: state === "open" ? "Focus" : state === "minimized" ? "Unpark" : "Open" },
      state === "open" ? { action: "app-minimize", icon: "i-min", label: "Park in Apps Area" } : null,
      state === "open" && isLocalApp(context.name) ? { action: "app-maximize", icon: "i-max", label: maximized ? "Restore / Maximize" : "Maximize", shortcut: "Alt+Enter" } : null,
      state === "open" && isLocalApp(context.name) ? { action: "app-fullscreen", icon: "i-max", label: tileSession().fullscreen?.name === context.name ? "Leave Full fullscreen" : "Full fullscreen", shortcut: "Middle click" } : null,
      state === "open" && isLocalApp(context.name) ? { action: "app-float", icon: "i-monitor", label: tileSession().floating[context.name] ? "Return to tiling" : "Float window", shortcut: "Middle drag" } : null,
      state === "open" && isLocalApp(context.name) ? { action: "app-grow", icon: "i-max", label: "Give more space", shortcut: "Alt+wheel up" } : null,
      state === "open" && isLocalApp(context.name) ? { action: "app-shrink", icon: "i-min", label: "Give less space", shortcut: "Alt+wheel down" } : null,
      extendedDesktopActive() ? { action: "app-move-display", icon: "i-monitor", label: "Move to Display " + otherDisplaySlot() } : null,
      state !== "closed" ? separator : null,
      state !== "closed" ? { action: "app-close", icon: "i-close", label: "Close", danger: true } : null
    ].filter(Boolean);
  }
  if (context.kind === "desktop") return [
    { action: "desktop-overview", icon: "i-search", label: "Open Overview", shortcut: "Super" },
    ...(desktopPages.current(activeWorkspace) > 0 ? [{ action: "desktop-page:-1", icon: "i-monitor", label: "Desktop above", shortcut: "Page Up" }] : []),
    ...(desktopPages.current(activeWorkspace) < desktopPages.last(activeWorkspace) ? [{ action: "desktop-page:1", icon: "i-monitor", label: "Desktop below", shortcut: "Page Down" }] : []),
    separator,
    { action: "desktop-new-folder", icon: "i-folder", label: "New Folder" },
    { action: "desktop-paste", icon: "i-clipboard", label: "Paste" },
    separator,
    { action: "desktop-settings", icon: "i-monitor", label: "Display Settings" },
    { action: "desktop-guide", icon: "i-note", label: "Philosophy & guide" }
  ];
  if (context.kind === "file") return [
    { action: "file-open", icon: "i-folder", label: "Open" },
    { action: "file-copy", icon: "i-clipboard", label: "Copy location" },
    separator,
    { action: "file-trash", icon: "i-close", label: "Move to Trash", danger: true }
  ];
  if (context.kind === "project-item") return [
    { action: "project-item-open", icon: "i-folder", label: "Open" },
    { action: "project-item-copy", icon: "i-link", label: "Copy reference" },
    context.linked ? separator : null,
    context.linked ? { action: "project-item-unlink", icon: "i-close", label: "Remove link", danger: true } : null
  ].filter(Boolean);
  if (context.kind === "project-mode") return [
    { action: "project-mode-open", icon: "i-monitor", label: "Switch to this mode" },
    Object.keys(projectSpaces[context.name]?.modes || {}).length > 1 ? separator : null,
    Object.keys(projectSpaces[context.name]?.modes || {}).length > 1 ? { action: "project-mode-delete", icon: "i-trash", label: "Delete mode", danger: true } : null
  ].filter(Boolean);
  if (context.kind === "project") return [
    { action: "project-open", icon: "i-folder", label: "Open project" },
    context.name === activeProjectName ? { action: "project-manage", icon: "i-settings", label: "Manage project" } : null,
    separator,
    { action: "project-delete", icon: "i-trash", label: "Remove project", danger: true }
  ].filter(Boolean);
  if (context.kind === "widget") {
    const entries = [{ action: "widget-open", icon: "i-right", label: "Open" }];
    if (context.element.id === "notificationWidget") entries.push({ action: "widget-clear", icon: "i-bell", label: "Clear notifications" });
    entries.push(separator, { action: "widget-hide", icon: "i-close", label: "Remove from System Area", danger: true });
    return entries;
  }
  if (context.kind === "area") return [
    { action: "area-move", icon: "i-grid", label: "Move to next edge" },
    extendedDesktopActive() ? { action: "area-move-display", icon: "i-monitor", label: "Move to Display " + otherDisplaySlot() } : null,
    { action: "area-reset", icon: "i-max", label: "Reset Area size" },
    areaCanBeHidden(context.name) ? separator : null,
    areaCanBeHidden(context.name) ? { action: "area-hide", icon: "i-min", label: "Hide Area", danger: true } : null
  ].filter(Boolean);
  return [];
}

function closeDesktopContextMenu(restoreFocus = false) {
  const menu = $("#desktopContextMenu");
  if (!menu || menu.hidden) return;
  menu.classList.remove("is-open");
  menu.hidden = true;
  if (restoreFocus && contextMenuState?.origin?.focus) contextMenuState.origin.focus({ preventScroll: true });
  contextMenuState = null;
}

function openDesktopContextMenu(context, clientX, clientY, keyboard = false) {
  const menu = $("#desktopContextMenu");
  const entries = contextMenuEntries(context).filter(entry => {
    if (!globalThis.SpatialGuide?.model.active() || !entry.action) return true;
    const action = entry.action, model = SpatialGuide.model;
    if (action.startsWith('move-workspace:')) return model.allows('workspaces');
    if (action.startsWith('move-project:') || action === 'detach-project' || action.includes('project')) return model.allows('projects');
    if (action.startsWith('move-desktop:') || action.startsWith('desktop-page:')) return model.allows('desktops');
    if (action === 'app-minimize') return model.allows('parking');
    if (['app-maximize','app-fullscreen'].includes(action)) return model.allows('overview');
    return true;
  });
  if (!menu || !entries.length) return;
  contextMenuState = { ...context, origin: document.activeElement };
  $("#contextMenuTitle").textContent = context.title;
  $("#contextMenuItems").innerHTML = entries.map(entry => {
    if (entry.separator) return '<div class="context-menu-separator" role="separator"></div>';
    return '<button class="context-menu-item' + (entry.danger ? ' is-danger' : '') + '" role="menuitem" data-context-action="' + entry.action + '">' + icon(entry.icon) + '<span>' + escapeHtml(entry.label) + '</span>' + (entry.shortcut ? '<kbd>' + escapeHtml(entry.shortcut) + '</kbd>' : '') + '</button>';
  }).join("");
  prepareControlSemantics(menu);
  menu.hidden = false;
  menu.classList.add("is-open");
  menu.style.visibility = "hidden";
  menu.style.left = "0px";
  menu.style.top = "0px";
  const rect = menu.getBoundingClientRect();
  const left = Math.max(8, Math.min(clientX, window.innerWidth - rect.width - 8));
  const top = Math.max(8, Math.min(clientY, window.innerHeight - rect.height - 8));
  menu.style.left = left + "px";
  menu.style.top = top + "px";
  menu.style.visibility = "";
  if (keyboard) requestAnimationFrame(() => $(".context-menu-item", menu)?.focus());
}

function createDesktopFolder(point) {
  const workspace = $(".workspace-zone");
  const rect = workspace.getBoundingClientRect();
  const folder = document.createElement("button");
  const name = desktopFolderCount ? "New Folder " + (desktopFolderCount + 1) : "New Folder";
  desktopFolderCount += 1;
  folder.className = "desktop-folder";
  folder.dataset.desktopPage = String(desktopPages.current(activeWorkspace));
  folder.dataset.desktopColumn = desktopPages.column(activeWorkspace);
  folder.dataset.desktopWorkspace = activeWorkspace;
  folder.title = name;
  folder.innerHTML = icon("i-folder") + "<span>" + escapeHtml(name) + "</span>";
  folder.style.left = Math.max(10, Math.min(point.x - rect.left - 31, rect.width - 74)) + "px";
  folder.style.top = Math.max(10, Math.min(point.y - rect.top - 20, rect.height - 86)) + "px";
  folder.addEventListener("dblclick", () => showToast(name + " opened"));
  workspace.append(folder);
  showToast(name + " created");
}

function executeContextAction(action) {
  const context = contextMenuState;
  if (!context) return;
  if (action === "app-new-instance") createAppInstance(context.name);
  if (action.startsWith("move-desktop:")) moveWindowToDesktop(context.name, Number(action.split(":")[1]));
  if (action.startsWith("desktop-page:")) changeDesktopPage(desktopPages.current(activeWorkspace) + Number(action.split(":")[1]));
  if (action.startsWith("move-workspace:")) moveAppWorkspace(context.name, action.split(":")[1]);
  if (action.startsWith("move-project:")) moveAppProject(context.name, action.split(":")[1]);
  if (action === "detach-project") moveWindowToColumn(context.name, "workspace");
  if (action === "app-open") openApp(context.name);
  if (action === "app-minimize") minimizeApp(context.name);
  if (action === "memory-remember") globalThis.SpatialMemoryDesktop?.remember();
  if (action === "app-maximize") toggleMaximize(context.name);
  if (action === "app-fullscreen") toggleAppFullscreen(context.name);
  if (action === "app-float") {
    if (tileSession().floating[context.name]) splitWindowIntoTile(context.name);
    else floatWindow(context.name);
  }
  if (action === "app-grow") growTileWindow(context.name, 1);
  if (action === "app-shrink") growTileWindow(context.name, -1);
  if (action === "app-move-display") transferAppToDisplay(context.name, otherDisplaySlot(), "right", frameFor(context.name)?.getBoundingClientRect());
  if (action === "app-close") closeApp(context.name);
  if (action === "desktop-overview") setUniversalSearchOpen(true);
  if (action === "desktop-guide") window.location.href = "philosophy.html";
  if (action === "desktop-new-folder") createDesktopFolder(context.point);
  if (action === "desktop-paste") showToast("Clipboard pasted to the desktop");
  if (action === "desktop-settings") showToast("Display Settings opened");
  if (action === "file-open") showToast("Opening " + context.label);
  if (action === "file-copy") showToast("Copied /home/demo/Downloads/" + context.label);
  if (action === "file-trash") {
    context.element?.remove();
    showToast(context.label + " moved to Trash");
  }
  if (action === "project-item-open") showToast("Opening " + context.label);
  if (action === "project-item-copy") showToast("Reference copied · " + context.label);
  if (action === "project-item-unlink") {
    context.element?.remove();
    showToast(context.label + " unlinked from project");
  }
  if (action === "project-mode-open") switchProjectMode(context.modeId);
  if (action === "project-mode-delete") openProjectEditor("delete-mode", { projectName: context.name, modeId: context.modeId });
  if (action === "project-open") {
    activateProject(context.name);
    showArea("projects");
    setUniversalSearchOpen(false);
  }
  if (action === "project-manage") openProjectEditor("manage", { projectName: context.name });
  if (action === "project-delete") openProjectEditor("delete-project", { projectName: context.name });
  if (action === "widget-open") showToast(context.title + " opened");
  if (action === "widget-clear") {
    $$(".notification", context.element).forEach(item => item.remove());
    syncNotifications();
  }
  if (action === "widget-hide") {
    if (context.element.classList.contains("dynamic-widget")) concealDynamicWidget(context.element);
    else context.element.hidden = true;
    showToast(context.title + " removed from System Area");
  }
  if (action === "area-move") {
    const current = dockState[context.name].edge;
    setDockPosition(context.name, dockEdges[(dockEdges.indexOf(current) + 1) % dockEdges.length]);
  }
  if (action === "area-move-display") transferAreaToDisplay(context.name, otherDisplaySlot(), "right");
  if (action === "area-reset") {
    dockSizeManual[dockState[context.name].edge] = false;
    layoutDockAreas(true);
    showToast(areaLabel(context.name) + " size reset");
  }
  if (action === "area-hide") hideArea(context.name);
}

function prepareContextMenus() {
  const menu = $("#desktopContextMenu");
  if (!menu) return;
  document.addEventListener("contextmenu", event => {
    if (event.target.closest("input,textarea,[contenteditable='true']")) return;
    const context = contextMenuDescriptor(event.target, event.clientX, event.clientY);
    if (!context) return;
    event.preventDefault();
    openDesktopContextMenu(context, event.clientX, event.clientY);
  });
  menu.addEventListener("click", event => {
    const item = event.target.closest("[data-context-action]");
    if (!item) return;
    const action = item.dataset.contextAction;
    executeContextAction(action);
    closeDesktopContextMenu();
  });
  menu.addEventListener("keydown", event => {
    const items = $$(".context-menu-item", menu);
    const index = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[(index + direction + items.length) % items.length]?.focus();
    }
    if (event.key === "Home") { event.preventDefault(); items[0]?.focus(); }
    if (event.key === "End") { event.preventDefault(); items.at(-1)?.focus(); }
  });
  document.addEventListener("pointerdown", event => {
    if (!menu.hidden && !event.target.closest("#desktopContextMenu")) closeDesktopContextMenu();
  });
document.addEventListener("keydown", event => {
  if (event.altKey && !event.ctrlKey && event.code === "Enter" && frontApp && !event.repeat && !event.target.closest("input,textarea,[contenteditable]") && !$("#universalSearch").classList.contains("is-open") && !$("#packageDialog").classList.contains("is-open") && !$("#projectEditorDialog").classList.contains("is-open")) {
    event.preventDefault();
    focusTileWindow(frontApp);
    return;
  }
    if (event.key === "Escape" && !menu.hidden) {
      event.preventDefault();
      closeDesktopContextMenu(true);
      return;
    }
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
    const target = document.activeElement;
    const rect = target?.getBoundingClientRect?.();
    const context = contextMenuDescriptor(target, rect?.left || 16, rect?.bottom || 16);
    if (!context) return;
    event.preventDefault();
    openDesktopContextMenu(context, rect?.left || 16, rect?.bottom || 16, true);
  });
  window.addEventListener("blur", () => closeDesktopContextMenu());
  window.addEventListener("resize", () => closeDesktopContextMenu());
}

/* Two browser windows on the same profile can act as one live desktop test
   session. BroadcastChannel is immediate; the storage message is a fallback
   for browsers that do not expose it. State remains entirely on this device. */
const desktopSyncScope = globalThis.SpatialGuide?.syncScope || "desktop";
const DESKTOP_SYNC_CHANNEL = "spatial-desktop-live-v1" + (desktopSyncScope === "desktop" ? "" : ":" + desktopSyncScope);
const DESKTOP_SYNC_STORAGE_KEY = "spatial-desktop-live-message-v1";
const desktopSyncSource = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
const desktopSyncStartedAt = (() => {
  try {
    const saved = Number(sessionStorage.getItem("spatial-display-opened-at"));
    if (Number.isFinite(saved) && saved > 0) return saved;
    const created = Date.now() + Math.random();
    sessionStorage.setItem("spatial-display-opened-at", String(created));
    return created;
  } catch { return Date.now() + Math.random(); }
})();
const desktopSyncChannel = "BroadcastChannel" in window ? new BroadcastChannel(DESKTOP_SYNC_CHANNEL) : null;
const desktopSyncPeers = new Map();
const workspaceDisplayAssignments = (() => {
  try { return JSON.parse(desktopStorage.getItem("spatial-workspace-display-assignments-v1") || "{}"); }
  catch { return {}; }
})();
let desktopSyncReady = !globalThis.SpatialGuide?.displayCompanion;
let desktopSyncApplying = false;
let desktopSyncTimer = 0;
let desktopSyncLastStamp = 0;
let desktopSyncAnnounced = false;

function cloneDesktopState(value) {
  return JSON.parse(JSON.stringify(value));
}

function readDesktopStorage(key, fallback = {}) {
  try { return JSON.parse(desktopStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return cloneDesktopState(fallback); }
}

function localDisplayDescriptor() {
  return {
    guideCompanion: Boolean(globalThis.SpatialGuide?.displayCompanion),
    openedAt: desktopSyncStartedAt,
    screenX: Number(window.screenX ?? window.screenLeft ?? 0),
    screenY: Number(window.screenY ?? window.screenTop ?? 0),
    width: window.innerWidth,
    height: window.innerHeight
  };
}

function activeDisplayRoster() {
  const now = Date.now();
  const roster = [{ source: desktopSyncSource, seenAt: now, ...localDisplayDescriptor() }];
  desktopSyncPeers.forEach((peer, source) => {
    if (now - peer.seenAt <= 6500) roster.push({ source, ...peer });
  });
  /* The first window opened is the main monitor. Physical X coordinates are
     deliberately not used: a main monitor may sit to the right in KDE. */
  return roster.sort((first, second) => Number(Boolean(first.guideCompanion)) - Number(Boolean(second.guideCompanion))
    || (first.openedAt || 0) - (second.openedAt || 0)
    || first.source.localeCompare(second.source));
}

function extendedDesktopActive() {
  return activeDisplayRoster().length > 1;
}

function localDisplaySlot() {
  const index = activeDisplayRoster().findIndex(display => display.source === desktopSyncSource);
  return Math.max(1, index + 1);
}

function otherDisplaySlot() {
  const count = activeDisplayRoster().length;
  if (count < 2) return 1;
  return localDisplaySlot() === 1 ? 2 : 1;
}

function localDisplayRoleLabel() {
  const slot = localDisplaySlot();
  return slot === 1 ? "Main display" : "Display " + slot;
}

function displayAssignmentsFor(workspaceName = activeWorkspace) {
  const saved = workspaceDisplayAssignments[workspaceName] ||= {};
  saved.apps ||= Object.fromEntries(Object.keys(appInfo).map(name => [name, 1]));
  saved.areas ||= Object.fromEntries(areaPriority.map(name => [name, 1]));
  return saved;
}

function saveDesktopPages() {
  try { desktopStorage.setItem("spatial-desktop-pages-v1", JSON.stringify(desktopPages.snapshot())); } catch {}
}

function projectColumnActive() {
  return Boolean(activeProjectName && desktopPages.column(activeWorkspace) === activeProjectName);
}

function desktopColumnLabel(column = desktopPages.column(activeWorkspace)) {
  return column === "workspace" ? workspaceProfiles[activeWorkspace].label + " workspace" : projectSpaces[column]?.name || "Project";
}

function adjacentDesktopColumn(direction) {
  if (!direction) return null;
  const columns = ["workspace", ...openProjectNames()];
  return columns[columns.indexOf(desktopPages.column(activeWorkspace)) + Math.sign(direction)] || null;
}

function changeDesktopColumn(column, announce = true) {
  if (column !== "workspace" && !openProjectNames().includes(column)) return false;
  if (desktopPages.column(activeWorkspace) === column) return false;
  captureWorkspaceContent();
  const changed = changeDesktopPage(desktopPages.current(activeWorkspace, column), true, column);
  if (changed && announce) showToast(desktopColumnLabel(column) + " · Desktop " + (desktopPages.current(activeWorkspace) + 1), { duration: 3200, projectSwitch: true });
  return changed;
}

function moveWindowToColumn(name, column, follow = true) {
  if (!appInfo[name] || appState[name] === "closed" || (column !== "workspace" && !openProjectNames().includes(column))) return false;
  const previous = desktopPages.columnOf(activeWorkspace, name);
  if (previous === column) return false;
  const page = desktopPages.pageOf(activeWorkspace, name);
  const floating = tileSessions[desktopPages.context(activeWorkspace, page, previous) + localDisplaySlot()]?.floating?.[name];
  removeWindowFromSavedProjects(name);
  detachDraggedDesktopWindow(name, page, previous);
  desktopPages.assign(activeWorkspace, name, desktopPages.current(activeWorkspace, column), column);
  windowMembership[activeWorkspace] ||= {};
  windowMembership[activeWorkspace][name] = column === "workspace" ? null : column;
  if (floating) {
    const target = tileSessions[desktopPages.context(activeWorkspace, undefined, column) + localDisplaySlot()] ||= {root: null, parked: {}, floating: {}};
    target.floating ||= {};
    target.floating[name] = floating;
  }
  if (follow) changeDesktopColumn(column, false);
  syncApps();
  renderTileLayout(name);
  if (follow && appState[name] === "open") bringToFront(name);
  saveDesktopPages(); saveTileSessions(); saveIndependentSessions(); persistProjectState();
  queueDesktopStateBroadcast(0);
  showToast(appInfo[name].label + " moved to " + desktopColumnLabel(column));
  return true;
}

function changeDraggedDesktopColumn(drag, column) {
  if (column === desktopPages.column(activeWorkspace) || (column !== "workspace" && !openProjectNames().includes(column))) return false;
  const floating = tileSession().floating[drag.name];
  detachDraggedDesktopWindow(drag.name, desktopPages.current(activeWorkspace));
  desktopPages.select(activeWorkspace, column);
  if (column !== "workspace" && column !== activeProjectName) renderProjectSpace(column);
  if (tileSession().fullscreen) leaveAppFullscreen();
  desktopPages.assign(activeWorkspace, drag.name);
  windowMembership[activeWorkspace] ||= {};
  windowMembership[activeWorkspace][drag.name] = column === "workspace" ? null : column;
  if (floating) tileSession().floating[drag.name] = floating;
  drag.changed = true;
  drag.switching = true;
  try {
    endSystemRailExpansion(false);
    layoutDockAreas(false, false);
    syncApps();
    refreshIntentAreas();
    renderTileLayout(drag.name);
    bringToFront(drag.name);
  } finally { drag.switching = false; }
  saveDesktopPages(); saveTileSessions(); saveIndependentSessions();
  queueDesktopStateBroadcast(0);
  showToast("Move to " + desktopColumnLabel(column), { duration: 3200, projectSwitch: true });
  return true;
}

function renderDesktopColumnMap() {
  const target = $("#desktopColumnMap");
  if (!target) return;
  const columns = ["workspace", ...openProjectNames()];
  target.innerHTML = columns.map(column => {
    const project = column === "workspace" ? null : projectSpaces[column];
    const current = desktopPages.column(activeWorkspace) === column;
    const names = Object.keys(appState).filter(name => appState[name] !== "closed" && desktopPages.columnOf(activeWorkspace, name) === column);
    const pages = Array.from({length: desktopPages.last(activeWorkspace, column) + 1}, (_, page) => {
      const windows = names.filter(name => desktopPages.pageOf(activeWorkspace, name) === page);
      const selected = current && desktopPages.current(activeWorkspace) === page;
      return '<button class="desktop-column-page" data-desktop-column="' + escapeHtml(column) + '" data-column-page="' + page + '" aria-pressed="' + selected + '" aria-label="' + escapeHtml(desktopColumnLabel(column) + ' · Desktop ' + (page + 1)) + '"><span><b>Desktop ' + (page + 1) + '</b><small>' + (windows.length ? windows.length + ' window' + (windows.length === 1 ? '' : 's') : 'Empty') + '</small></span><span class="desktop-column-apps">' + windows.slice(0, 5).map(appArt).join('') + '</span></button>';
    }).join("");
    return '<section class="desktop-column-card' + (current ? ' is-current' : '') + '" style="--column-accent:' + escapeHtml(project?.accent || workspaceProfiles[activeWorkspace].accent) + '"><header>' + icon(project?.icon || workspaceProfiles[activeWorkspace].icon) + '<b>' + escapeHtml(desktopColumnLabel(column)) + '</b></header><div class="desktop-column-pages">' + pages + '</div></section>';
  }).join("");
  prepareControlSemantics(target);
}

function migrateDesktopColumns() {
  Object.keys(workspaceProfiles).forEach(workspace => {
    const state = desktopPages.space(workspace);
    const openedProject = workspaceProjectStates[workspace]?.project;
    if (state.columnsMigrated) {
      if (desktopPages.column(workspace) !== "workspace" && !openProjectNames(workspace).includes(desktopPages.column(workspace))) desktopPages.select(workspace, "workspace");
      return;
    }
    const previousPage = state.active;
    if (!windowMembership[workspace]) {
      const projectApps = projectSpaces[openedProject]?.modes[projectModeId(openedProject)]?.apps || [];
      windowMembership[workspace] = Object.fromEntries(Object.keys(workspaceAppStates[workspace] || {}).filter(name => workspaceAppStates[workspace][name] !== "closed").map(name => [name, projectApps.includes(name) ? openedProject : null]));
    }
    const names = new Set([...Object.keys(state.windows), ...Object.keys(windowMembership[workspace]), ...Object.keys(workspaceAppStates[workspace] || {}).filter(name => workspaceAppStates[workspace][name] !== "closed")]);
    names.forEach(name => {
      const owner = windowMembership[workspace][name];
      desktopPages.assign(workspace, name, desktopPages.pageOf(workspace, name), projectSpaces[owner] ? owner : "workspace");
    });
    // Partition the old mixed tree, including saved focus/fullscreen roots.
    Object.entries(tileSessions).filter(([key]) => key.startsWith(workspace + ":desktop:")).forEach(([key, saved]) => {
      const [, pageText, display] = key.slice(workspace.length + 1).match(/^desktop:(\d+):(\d+)$/) || [];
      if (!display) return;
      const page = Number(pageText);
      const owners = new Set(["workspace", ...[...names].map(name => desktopPages.columnOf(workspace, name))]);
      owners.forEach(owner => {
        const keep = name => desktopPages.columnOf(workspace, name) === owner;
        const prune = root => tileEngine.names(root).filter(name => !keep(name)).reduce((tree, name) => tileEngine.remove(tree, name), cloneDesktopState(root || null));
        const session = cloneDesktopState(saved);
        session.root = prune(session.root);
        ["parked", "floating"].forEach(field => { session[field] = Object.fromEntries(Object.entries(session[field] || {}).filter(([name]) => keep(name))); });
        ["focus", "fullscreen"].forEach(field => {
          if (!session[field] || !keep(session[field].name)) session[field] = null;
          else {
            if (session[field].root) session[field].root = prune(session[field].root);
            if (session[field].parked) session[field].parked = session[field].parked.filter(keep);
          }
        });
        tileSessions[desktopPages.context(workspace, page, owner) + display] = session;
      });
    });
    Object.keys(state.columns).forEach(column => desktopPages.go(workspace, previousPage, column));
    desktopPages.go(workspace, previousPage, "workspace");
    if (openedProject) desktopPages.select(workspace, openedProject);
    state.columnsMigrated = true;
  });
  saveDesktopPages(); saveTileSessions(); saveIndependentSessions();
}


function updateDesktopPageUi() {
  syncProjectAreaView();
  const page = desktopPages.current(activeWorkspace) + 1;
  const workspace = $(".workspace-zone");
  const button = $("#allAppsToggle");
  if (!workspace || !button) return;
  const focused = !desktopHasWindowFocus;
  workspace.dataset.desktopFocused = String(focused);
  workspace.dataset.desktopPage = String(page);
  workspace.setAttribute("aria-label", "Desktop " + page);
  const label = workspaceProfiles[activeWorkspace].label;
  const column = desktopPages.column(activeWorkspace);
  const project = column === "workspace" ? null : projectSpaces[column];
  const context = project ? project.name + " project" : label + " workspace";
  workspace.dataset.desktopColumn = column;
  workspace.setAttribute("aria-label", context + " · Desktop " + page);
  $("use", button)?.setAttribute("href", "#" + (project?.icon || workspaceProfiles[activeWorkspace].icon));
  button.style?.setProperty("--desktop-column-accent", project?.accent || workspaceProfiles[activeWorkspace].accent);
  $("#appsAreaContext").textContent = context + " · Desktop " + page;
  $("#openWindowsTitle").textContent = context;
  button.setAttribute("aria-label", "Open " + context + " overview · Desktop " + page);
  button.title = "Overview · " + context + " · Desktop " + page + " · Super · Win+scroll: desktops · Win+Shift+scroll: projects";
  const contextToggle = $("#desktopContextToggle");
  if (contextToggle) {
    $(".desktop-context-page", contextToggle).textContent = "Desktop " + page;
    contextToggle.dataset.project = String(Boolean(project));
    contextToggle.style?.setProperty("--context-accent", project?.accent || workspaceProfiles[activeWorkspace].accent);
    contextToggle.setAttribute("aria-label", "Open desktop map · " + label + " / " + (project?.name || "Workspace") + " · Desktop " + page);
  }
  renderDesktopContextColumns();
  renderDesktopPageRail();
  $("#desktopPageNumber").textContent = page;
  const empty = $("#emptyWorkspace");
  $("strong", empty).textContent = "Desktop " + page + " is empty";
  $("span", empty).textContent = "Open an app here. Scroll for another desktop" + (activeProjectName ? " · Shift+scroll to switch projects." : ". Open a project in Overview to use its desktops.");
  $$(".desktop-folder").forEach(folder => {
    folder.hidden = folder.dataset.desktopWorkspace !== activeWorkspace || (folder.dataset.desktopColumn || "workspace") !== column || Number(folder.dataset.desktopPage) !== page - 1;
  });
}

function renderDesktopContextColumns() {
  const header = $(".desktop-context-header");
  const nav = $("#desktopContextColumns");
  if (!header || !nav) return;
  const projects = openProjectNames();
  const wasHidden = header.hidden;
  header.hidden = projects.length === 0;
  $(".desktop-shell").style.setProperty("--desktop-context-height", header.hidden ? "0px" : "32px");
  $(".desktop-context-workspace", header).textContent = workspaceProfiles[activeWorkspace].label;
  const columns = ["workspace", ...projects];
  const key = JSON.stringify(columns.map(id => { const value = id === "workspace" ? workspaceProfiles[activeWorkspace] : projectSpaces[id]; return [id, value.name || value.label, value.icon, value.accent]; }));
  if (nav.dataset.contentsKey !== key) {
    nav.dataset.contentsKey = key;
    nav.innerHTML = columns.map(id => {
      const project = id === "workspace" ? null : projectSpaces[id];
      return '<button class="desktop-context-column" data-context-column="' + escapeHtml(id) + '" aria-pressed="false" aria-label="' + escapeHtml('Switch to ' + desktopColumnLabel(id)) + '" style="--column-accent:' + escapeHtml(project?.accent || workspaceProfiles[activeWorkspace].accent) + '">' + icon(project?.icon || workspaceProfiles[activeWorkspace].icon) + '<span>' + escapeHtml(project?.name || 'Workspace') + '</span></button>';
    }).join("");
    prepareControlSemantics(nav);
  }
  $$("[data-context-column]", nav).forEach(button => {
    const selected = button.dataset.contextColumn === desktopPages.column(activeWorkspace);
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-active", selected);
  });
  if (wasHidden !== header.hidden && windowViewportLockReady && !tileInteraction && !manualWindowInteraction) scheduleWindowTiling();
}

function renderDesktopPageRail() {
  const rail = $("#desktopPageRail");
  if (!rail) return;
  const column = desktopPages.column(activeWorkspace);
  const current = desktopPages.current(activeWorkspace);
  const names = Object.keys(appState).filter(name => appState[name] !== "closed" && desktopPages.columnOf(activeWorkspace, name) === column);
  // Include the current empty desktop, but do not advertise an unused spare.
  const last = Math.max(current, 0, ...names.map(name => desktopPages.pageOf(activeWorkspace, name)));
  const project = column === "workspace" ? null : projectSpaces[column];
  rail.style?.setProperty("--desktop-marker-accent", project?.accent || workspaceProfiles[activeWorkspace].accent);
  rail.setAttribute("aria-label", (project?.name || workspaceProfiles[activeWorkspace].label + " workspace") + " · " + (last + 1) + " desktops · Desktop " + (current + 1) + " is current");
  rail.innerHTML = Array.from({ length: last + 1 }, (_, page) => '<span class="desktop-page-mark' + (page === current ? ' is-current' : '') + '" data-desktop-marker="' + page + '" aria-hidden="true"></span>').join("");
}

function focusDesktop(moveKeyboardFocus = true) {
  desktopHasWindowFocus = false;
  desktopWheel.reset();
  desktopColumnWheel.reset();
  $$("[data-app-frame]").forEach(frame => frame.classList.remove("is-front"));
  updateDesktopPageUi();
  // Keep the clicked Area control in the DOM until its normal click runs.
  originalSyncRack();
  renderOverviewWindows();
  if (moveKeyboardFocus) $(".workspace-zone").focus({ preventScroll: true });
}

function desktopNavigationBlocked() {
  return tileInteraction || manualWindowInteraction || desktopPageAnimating ||
    ["#universalSearch", "#packageDialog", "#projectEditorDialog"].some(selector => $(selector)?.classList.contains("is-open")) || !$("#desktopContextMenu").hidden;
}

function changeDesktopPage(page, animate = true, column = desktopPages.column(activeWorkspace)) {
  if (globalThis.SpatialGuide?.model.active() && !SpatialGuide.model.allows(column === 'workspace' ? 'desktops' : 'projects')) return false;
  const previous = desktopPages.current(activeWorkspace);
  const previousColumn = desktopPages.column(activeWorkspace);
  const horizontal = column !== previousColumn;
  if ((!horizontal && page === previous) || page < 0 || page > desktopPages.last(activeWorkspace, column) || desktopPageAnimating) return false;
  // A desktop moves inside the canvas; a project moves the complete scene.
  // Capture before changing Project Area content or window visibility.
  const workspace = $(".workspace-zone");
  const shell = $(".desktop-shell");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ghost = animate && !reducedMotion ? (horizontal ? shell.cloneNode(true) : document.createElement("div")) : null;
  if (ghost) {
    if (horizontal) ghost.classList.add("desktop-column-ghost");
    else {
      ghost.className = "desktop-page-ghost";
      [...workspace.children].filter(node => (node.matches("[data-app-frame]") && !node.hidden) || (node.id === "emptyWorkspace" && !node.hidden) || node.matches(".desktop-folder:not([hidden])")).forEach(node => ghost.append(node.cloneNode(true)));
    }
    ghost.inert = true;
    ghost.setAttribute("aria-hidden", "true");
    [ghost, ...ghost.querySelectorAll("[id],[data-app-frame],[data-area-window]")].forEach(item => {
      item.removeAttribute("id"); item.removeAttribute("data-app-frame"); item.removeAttribute("data-area-window");
    });
  }
  saveLayout();
  saveTileSessions();
  if (tileSession().fullscreen) leaveAppFullscreen();
  if (horizontal && column !== "workspace" && column !== activeProjectName) {
    captureWorkspaceContent();
    renderProjectSpace(column);
  }
  desktopPages.select(activeWorkspace, column);
  desktopPages.go(activeWorkspace, page);
  if (horizontal) { endSystemRailExpansion(false); layoutDockAreas(false, false); }
  desktopHasWindowFocus = false;
  frontApp = topOpenApp();
  desktopPageAnimating = Boolean(ghost);
  syncApps();
  focusDesktop(false);
  refreshIntentAreas();
  renderTileLayout(frontApp);
  saveDesktopPages();
  if (ghost) {
    const columns = ["workspace", ...openProjectNames()];
    const from = columns.indexOf(previousColumn), to = columns.indexOf(column);
    const direction = horizontal ? (from < 0 ? (column === "workspace" ? -1 : 1) : Math.sign(to - from)) : (page > previous ? 1 : -1);
    const axis = horizontal ? "X" : "Y";
    const distance = direction * (horizontal ? shell.clientWidth : workspace.clientHeight);
    const options = { duration: 220, easing: "cubic-bezier(.2,.75,.25,1)" };
    if (horizontal) {
      document.body.append(ghost);
      shell.dataset.desktopTransition = "column";
    } else workspace.append(ghost);
    const outgoing = ghost.animate([{ transform: "translate" + axis + "(0)" }, { transform: "translate" + axis + "(" + -distance + "px)" }], options);
    const incomingNodes = horizontal ? [shell] : [...workspace.children].filter(node => !node.hidden && (node.matches("[data-app-frame],.desktop-folder") || node.id === "emptyWorkspace"));
    const incoming = incomingNodes.map(node => node.animate([{ transform: "translate" + axis + "(" + distance + "px)" }, { transform: "translate" + axis + "(0)" }], options));
    Promise.allSettled([outgoing.finished, ...incoming.map(animation => animation.finished)]).then(() => {
      ghost.remove();
      delete shell.dataset.desktopTransition;
      desktopPageAnimating = false;
      scheduleWindowVisibility();
    });
  }
  queueDesktopStateBroadcast(0);
  return true;
}

function moveWindowToDesktop(name, direction) {
  if (appState[name] === "closed" || !appInfo[name]) return;
  const previous = desktopPages.pageOf(activeWorkspace, name);
  const destination = previous + direction;
  if (destination < 0) return;
  const floating = tileSessions[desktopPages.context(activeWorkspace, previous, desktopPages.columnOf(activeWorkspace, name)) + localDisplaySlot()]?.floating?.[name];
  // Remove only the transferred identity, preserving the other pages' trees.
  Object.entries(tileSessions).filter(([key]) => key.startsWith(desktopPages.context(activeWorkspace, previous, desktopPages.columnOf(activeWorkspace, name)))).forEach(([, session]) => {
    if (session.fullscreen?.name === name) leaveAppFullscreen(session);
    session.root = tileEngine.remove(session.root, name);
    if (session.focus?.name === name) leaveTileFocus(session);
    if (session.focus?.root) session.focus.root = tileEngine.remove(session.focus.root, name);
    delete session.floating?.[name];
    delete session.parked?.[name];
  });
  desktopPages.assign(activeWorkspace, name, destination);
  if (floating) {
    const key = desktopPages.context(activeWorkspace, destination) + localDisplaySlot();
    const target = tileSessions[key] ||= { root: null, parked: {}, focus: null };
    target.floating ||= {};
    target.floating[name] = cloneDesktopState(floating);
  }
  appMaximizedState[name] = false;
  frameFor(name).classList.remove("is-maximized", "is-front");
  delete frameFor(name).dataset.maximized;
  autoTiledWindows.delete(name);
  saveDesktopPages();
  saveTileSessions();
  frontApp = topOpenApp();
  focusDesktop();
  syncApps();
  renderTileLayout(frontApp);
  queueDesktopStateBroadcast(0);
  showToast(appInfo[name].label + " moved to Desktop " + (destination + 1));
}

function migrateProjectDesktops() {
  const savedStates = readDesktopStorage("spatial-workspace-app-states-v1");
  Object.keys(workspaceProfiles).forEach(workspace => {
    const state = desktopPages.space(workspace);
    if (state.migrated) return;
    const used = new Set(Object.keys(savedStates[workspace] || workspaceAppStates[workspace]).filter(name => (savedStates[workspace] || workspaceAppStates[workspace])[name] !== "closed"));
    used.forEach(name => desktopPages.assign(workspace, name, 0));
    const context = workspaceProjectStates[workspace];
    const oldPrefix = [workspace, context?.project || "desktop", context?.project ? context.mode || projectModeId(context.project) : "default"].join(":") + ":";
    Object.entries(tileSessions).filter(([key]) => key.startsWith(oldPrefix)).forEach(([key, session]) => {
      tileSessions[workspace + ":desktop:0:" + key.slice(oldPrefix.length)] = cloneDesktopState(session);
    });
    const combined = {};
    Object.entries(projectWindowSessions).filter(([key]) => key.startsWith(workspace + ":")).forEach(([key, session]) => {
      const projectName = key.split(":")[1];
      if (!projectSpaces[projectName] || !session?.apps?.length) return;
      const page = desktopPages.last(workspace);
      const targetKey = workspace + ":" + projectName + ":" + projectModeId(projectName);
      const target = combined[targetKey] ||= { apps: [], states: {}, geometry: {}, displays: {}, savedAt: session.savedAt };
      const renamed = {};
      session.apps.forEach(name => {
        if (!appInfo[name]) return;
        let id = name;
        if (used.has(id)) {
          id = (appInfo[name].base || name) + "--" + (++instanceSequence);
          instanceDefinitions[id] = appInfo[name].base || name;
          installInstance(id, instanceDefinitions[id], false);
          if (workspaceContent[workspace]?.frames?.[name]) workspaceContent[workspace].frames[id] = cloneDesktopState(workspaceContent[workspace].frames[name]);
        }
        used.add(id); renamed[name] = id;
        desktopPages.assign(workspace, id, page);
        windowMembership[workspace] ||= {};
        windowMembership[workspace][id] = projectName;
        target.apps.push(id);
        ["states", "geometry", "displays"].forEach(field => { if (session[field]?.[name] !== undefined) target[field][id] = cloneDesktopState(session[field][name]); });
      });
      Object.entries(tileSessions).filter(([tileKey]) => tileKey.startsWith(key + ":")).forEach(([tileKey, session]) => {
        // Rename object keys as well as leaf identities when a saved Mode reused
        // a base window already present on another desktop.
        let serialized = JSON.stringify(session);
        Object.entries(renamed).forEach(([oldId, newId]) => { serialized = serialized.split(JSON.stringify(oldId)).join(JSON.stringify(newId)); });
        tileSessions[workspace + ":desktop:" + page + ":" + tileKey.slice(key.length + 1)] = JSON.parse(serialized);
      });
      delete projectWindowSessions[key];
    });
    Object.assign(projectWindowSessions, combined);
    state.migrated = true;
  });
  saveIndependentSessions();
  persistProjectState();
  saveTileSessions();
  saveDesktopPages();
}

function prepareDesktopPages() {
  migrateProjectDesktops();
  migrateDesktopColumns();
  $("#desktopContextToggle").addEventListener("click", () => {
    focusDesktop(false);
    setUniversalSearchOpen(true);
  });
  $("#desktopContextColumns").addEventListener("click", event => {
    const button = event.target.closest("[data-context-column]");
    if (!button) return;
    const column = button.dataset.contextColumn;
    focusDesktop(false);
    changeDesktopColumn(column);
  });
  const workspace = $(".workspace-zone");
  workspace.addEventListener("pointerdown", event => {
    if (!event.target.closest("[data-app-frame],.tile-divider,.desktop-folder,button,input,textarea,select,a") && !desktopNavigationBlocked()) focusDesktop();
  });
  document.addEventListener("pointerdown", event => {
    if (!event.target.closest("[data-area-window]") || $(".desktop-shell").inert) return;
    // Capture runs before Area handles stop propagation. Leave native focus
    // and the control's click action to the Area rather than focusing the canvas.
    focusDesktop(false);
    const focused = document.activeElement;
    if (focused?.closest("[data-app-frame]")) focused.blur();
  }, { capture: true });
  document.addEventListener("focusin", event => {
    const frame = event.target.closest("[data-app-frame]");
    if (frame && !frame.hidden && isLocalApp(frame.dataset.appFrame)) bringToFront(frame.dataset.appFrame);
  });
  const onDesktopWheel = event => {
    const superHeld = event.metaKey || event.getModifierState?.("OS");
    if (superHeld) superKeyAlone = false;
    if (event.defaultPrevented || event.ctrlKey || event.altKey || (!superHeld && desktopHasWindowFocus) || (!event.shiftKey && Math.abs(event.deltaX) > Math.abs(event.deltaY))) return;
    if (desktopNavigationBlocked() && !desktopPageAnimating) return;
    event.preventDefault();
    if (superHeld) event.stopPropagation();
    const delta = (event.shiftKey ? event.deltaY || event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? workspace.clientHeight : 1);
    if (event.shiftKey) {
      const direction = desktopColumnWheel.feed(delta, performance.now());
      const target = adjacentDesktopColumn(direction);
      if (direction && target && !desktopPageAnimating) changeDesktopColumn(target);
      return;
    }
    const direction = desktopWheel.feed(delta, performance.now());
    if (direction && !desktopPageAnimating) changeDesktopPage(desktopPages.current(activeWorkspace) + direction);
  };
  workspace.addEventListener("wheel", onDesktopWheel, { passive: false });
  // Explicit desktop shortcuts also work over app content and Areas. Capture
  // before their scroll handlers, while held-window gestures stay window-owned.
  document.addEventListener("wheel", event => {
    if (event.metaKey || event.getModifierState?.("OS")) onDesktopWheel(event);
  }, { capture: true, passive: false });
  document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || desktopNavigationBlocked() || event.target.closest("input,textarea,select,[contenteditable=true]")) return;
    if (event.key === "Escape" && !tileSession().fullscreen) { event.preventDefault(); focusDesktop(); }
    if (!desktopHasWindowFocus && ["PageUp", "PageDown"].includes(event.key)) {
      event.preventDefault();
      if (event.shiftKey) {
        const target = adjacentDesktopColumn(event.key === "PageDown" ? 1 : -1);
        if (target) changeDesktopColumn(target);
      } else changeDesktopPage(desktopPages.current(activeWorkspace) + (event.key === "PageDown" ? 1 : -1));
    }
  });
  $("#desktopColumnMap").addEventListener("click", event => {
    const button = event.target.closest("[data-desktop-column]");
    if (!button) return;
    const column = button.dataset.desktopColumn;
    if (column !== "workspace" && !openProjectNames().includes(column)) return;
    setUniversalSearchOpen(false);
    const switchedProject = column !== desktopPages.column(activeWorkspace);
    if (changeDesktopPage(Number(button.dataset.columnPage), true, column) && switchedProject) {
      showToast(desktopColumnLabel(column) + " · Desktop " + (desktopPages.current(activeWorkspace) + 1), { duration: 3200, projectSwitch: true });
    }
  });
  updateDesktopPageUi();
}

function isLocalApp(name) {
  return desktopPages.visible(activeWorkspace, name) && (!extendedDesktopActive() || Number(displayAssignmentsFor().apps[name] || 1) === localDisplaySlot());
}

function isLocalArea(name) {
  if (globalThis.SpatialGuide?.model.active() && !SpatialGuide.model.allows(name)) return false;
  return !extendedDesktopActive() || Number(intentAreaPlan.moves[name] || displayAssignmentsFor().areas[name] || 1) === localDisplaySlot();
}

function persistDisplayAssignments() {
  try { desktopStorage.setItem("spatial-workspace-display-assignments-v1", JSON.stringify(workspaceDisplayAssignments)); }
  catch {}
}

function applyExtendedDesktopPartition() {
  const count = activeDisplayRoster().length;
  const slot = localDisplaySlot();
  document.body.dataset.physicalDisplay = String(slot);
  Object.keys(appInfo).forEach(name => {
    if (count > 1 && !isLocalApp(name)) autoWindowAvoidance.delete(name);
  });
  if (autoAvoidanceSource && !isLocalApp(autoAvoidanceSource.dataset.appFrame)) autoAvoidanceSource = null;
  areaPriority.forEach(name => areaFor(name)?.classList.toggle("is-on-other-display", count > 1 && !isLocalArea(name)));
  syncApps();
  layoutDockAreas(false);
  if (count > 1) {
    const workspace = workspaceBounds();
    $$('[data-app-frame]').forEach(frame => {
      if (frame.hidden || frame.dataset.maximized !== "true" || frame.classList.contains("is-fullscreen")) return;
      applyGeometry(frame.dataset.appFrame, {
        x: 8,
        y: 8,
        width: workspace.width - 16,
        height: workspace.height - 16
      }, false);
    });
  }
  document.title = count > 1 ? "Spatial Desktop — " + localDisplayRoleLabel() + " · WIP Prototype" : "Spatial Desktop — WIP Prototype";
}

function mainDisplayWindowRects() {
  return $$('[data-app-frame]').filter(frame => {
    const name = frame.dataset.appFrame;
    return appState[name] === "open" && Number(displayAssignmentsFor().apps[name] || 1) === 1 && !frame.hidden;
  }).map(frame => ({
    frame,
    rect: frame.getBoundingClientRect(),
    /* Bounded tile focus is not screen fullscreen. It leaves the Areas in
       place; only a genuine fullscreen/floating app needs another display. */
    maximized: frame.dataset.maximized === "true" && !frame.classList.contains("is-tiled")
  }));
}

function areaNamesForEdge(edge) {
  return areaPriority.filter(name => dockState[name].edge === edge && !areaFor(name)?.hidden);
}

function mainDisplayFitForEdge(edge, names, windows, currentlyOnMain) {
  if (!names.length || !windows.length) return { display: 1, state: "expanded" };
  if (windows.some(windowInfo => windowInfo.maximized)) return { display: 2, state: "expanded" };
  const shellRect = $(".desktop-shell").getBoundingClientRect();
  const clearance = Math.min(...windows.map(windowInfo => clearanceFromEdge(edge, windowInfo.rect, shellRect)));
  const vertical = edge === "left" || edge === "right";
  const minimumFor = (name, state) => vertical
    ? stateSideMinimum(name, state)
    : stateHorizontalMinimum(name, state);
  const expandedMinimum = Math.max(...names.map(name => minimumFor(name, "expanded")));
  const railMinimum = Math.max(...names.map(name => minimumFor(name, "rail")));
  const desiredExpanded = Math.max(expandedMinimum, Math.min(340, dockSizes[edge] || expandedMinimum));
  const previous = autoSpatialEdgeStates.get(edge) || "expanded";
  const containsProject = names.includes("projects");
  const containsApps = names.includes("apps");
  const priorityAllowance = containsProject ? 22 : containsApps ? 10 : 0;
  /* Auto tries all useful forms on the main display before spilling the lane
     to Display 2. Hysteresis keeps it from flickering at either boundary. */
  const expandThreshold = desiredExpanded - priorityAllowance
    + (previous === "rail" ? 54 : currentlyOnMain ? -10 : 8);
  const railThreshold = railMinimum + (currentlyOnMain ? -4 : 8);
  if (clearance >= expandThreshold) return { display: 1, state: "expanded" };
  if (clearance >= railThreshold) return { display: 1, state: "rail" };
  return { display: 2, state: "expanded" };
}

function rebalanceAreaDisplays() {
  if (!areasFollowWindows()) return false;
  const count = activeDisplayRoster().length;
  if (count < 2 || layoutMode !== "auto" || localDisplaySlot() !== 1) return false;
  const assignments = displayAssignmentsFor();
  const windows = mainDisplayWindowRects();
  let changed = false;
  /* Areas sharing an edge are one lane: expand it on the main display when
     possible, use its rail when space tightens, and move the whole lane only
     when even the rail would collide. */
  dockEdges.forEach(edge => {
    const names = areaNamesForEdge(edge);
    if (!names.length) return;
    const currentlyOnMain = names.some(name => Number(assignments.areas[name] || 1) === 1);
    const fit = mainDisplayFitForEdge(edge, names, windows, currentlyOnMain);
    if (fit.display === 1) autoSpatialEdgeStates.set(edge, fit.state);
    else autoSpatialEdgeStates.delete(edge);
    names.forEach(name => {
      const current = Math.max(1, Math.min(count, Number(assignments.areas[name]) || 1));
      if (fit.display !== current) changed = true;
      assignments.areas[name] = fit.display;
    });
  });
  if (changed) persistDisplayAssignments();
  return changed;
}

function displayTransferTarget(clientX) {
  if (!extendedDesktopActive()) return 0;
  if (clientX <= 18 || clientX >= window.innerWidth - 18) return otherDisplaySlot();
  return 0;
}

function transferAppToDisplay(name, targetSlot, edge = "right", sourceRect = null) {
  releaseBorrowedApp(name);
  if (!appInfo[name] || !extendedDesktopActive()) return;
  const sourceSession = tileSession();
  if (sourceSession.fullscreen?.name === name) leaveAppFullscreen(sourceSession);
  if (sourceSession.focus?.name === name) leaveTileFocus(sourceSession, true);
  if (sourceSession.floating[name]) {
    const display = activeDisplayRoster()[targetSlot - 1];
    const rect = sourceSession.floating[name];
    const key = intentContextPrefix() + targetSlot;
    tileSessions[key] ||= { root: null, parked: {}, focus: null, floating: {} };
    tileSessions[key].floating ||= {};
    tileSessions[key].floating[name] = { ...rect, left: edge === "left" ? Math.max(8, (display?.width || window.innerWidth) - rect.width - 24) : 24, top: 24, yieldEdges: [], overlayEdges: [] };
    delete sourceSession.floating[name];
    saveTileSessions();
  }
  const assignments = displayAssignmentsFor();
  assignments.apps[name] = targetSlot;
  const workspace = workspaceBounds();
  const rect = sourceRect || frameFor(name)?.getBoundingClientRect();
  const width = Math.min(rect?.width || 720, Math.max(380, workspace.width - 48));
  const height = Math.min(rect?.height || 560, Math.max(300, workspace.height - 48));
  windowGeometry.set(name, {
    x: edge === "left" ? Math.max(24, workspace.width - width - 24) : 24,
    y: Math.max(24, Math.min((rect?.top || 80) - workspace.rect.top, workspace.height - height - 24)),
    width,
    height
  });
  persistDisplayAssignments();
  saveLayout();
  if (layoutMode === "auto") rebalanceAreaDisplays();
  refreshIntentAreas();
  applyExtendedDesktopPartition();
  queueDesktopStateBroadcast(0);
  showToast(appInfo[name].label + " moved to Display " + targetSlot);
}

function transferAreaToDisplay(name, targetSlot, edge = "right") {
  if (!areaPriority.includes(name) || !extendedDesktopActive()) return;
  manualAreaOverride(name);
  displayAssignmentsFor().areas[name] = targetSlot;
  dockState[name].edge = edge === "left" ? "right" : "left";
  persistDisplayAssignments();
  saveAreaLayout();
  refreshIntentAreas();
  applyExtendedDesktopPartition();
  queueDesktopStateBroadcast(0);
  showToast(areaLabel(name) + " moved to Display " + targetSlot);
}

function captureDesktopSyncState() {
  const workspaceStates = cloneDesktopState(workspaceAppStates);
  workspaceStates[activeWorkspace] = { ...appState };

  const areaSessions = cloneDesktopState(workspaceAreaSessions);
  areaSessions[activeWorkspace] = snapshotAreaLayout();

  const windowLayouts = readDesktopStorage("spatial-workspace-window-layouts-v1");
  windowLayouts[activeWorkspace] = Object.fromEntries(windowGeometry);

  const projects = cloneDesktopState(projectSpaces);
  rememberWorkspaceProject();
  const areaContents = cloneDesktopState(workspaceAreaContents);
  areaContents[activeWorkspace] = snapshotWorkspaceAreaContent();

  return {
    schema: 4,
    workingMemory: globalThis.SpatialMemoryDesktop?.snapshot(),
    desktopPages: desktopPages.snapshot(),
    downloads: workspaceDownloads.snapshot(),
    desktopHasWindowFocus,
    openProjects: Object.fromEntries(Object.keys(workspaceProfiles).map(name => [name, openProjectNames(name)])),
    workspaceProjects: cloneDesktopState(workspaceProjectStates),
    areaContents,
    independent: {instances: instanceDefinitions, content: workspaceContent, membership: windowMembership, projects: workspaceProjects, sequence: instanceSequence},
    theme: document.body.dataset.theme,
    themePreference: SpatialDesktopTheme.preference,
    activeWorkspace,
    workspaceStates,
    areaSessions,
    windowLayouts,
    displayAssignments: cloneDesktopState(workspaceDisplayAssignments),
    frontApp,
    maximized: { ...appMaximizedState },
    activeProjectName,
    projects,
    projectWindowSessions: cloneDesktopState(projectWindowSessions),
    tileSessions: cloneDesktopState(tileSessions),
    noteDraft,
    music: { playing: musicPlaying, position: musicPosition },
    focus: {
      running: focusRunning,
      seconds: focusSeconds,
      visible: !$("#timerWidget").hidden
    },
    quickToggles: $$(".quick-toggle").filter(button => button.id !== "themeToggle").map(button => ({
      label: button.textContent.trim(),
      active: button.classList.contains("is-active")
    })),
    notificationsHtml: $("#notificationList").innerHTML
  };
}

function persistIncomingDesktopState(state) {
  if (state.workingMemory) globalThis.SpatialMemoryDesktop?.merge(state.workingMemory);
  if (state.downloads) { workspaceDownloads.load(state.downloads); persistDownloads(); }
  if (state.openProjects) {
    Object.keys(workspaceOpenProjects).forEach(name => delete workspaceOpenProjects[name]);
    Object.keys(workspaceProfiles).forEach(name => { workspaceOpenProjects[name] = Array.isArray(state.openProjects[name]) ? state.openProjects[name].filter(id => state.projects?.[id] || projectSpaces[id]) : []; });
    try { desktopStorage.setItem("spatial-open-projects-v1", JSON.stringify(workspaceOpenProjects)); } catch {}
  }
  if (state.desktopPages) { desktopPages.load(state.desktopPages); saveDesktopPages(); }
  if (typeof state.desktopHasWindowFocus === "boolean") desktopHasWindowFocus = state.desktopHasWindowFocus;
  if (state.independent) {
    Object.entries(state.independent.instances || {}).forEach(([id, base]) => { instanceDefinitions[id] = base; installInstance(id, base); });
    Object.assign(workspaceContent, state.independent.content || {});
    Object.assign(windowMembership, state.independent.membership || {});
    Object.assign(workspaceProjects, state.independent.projects || {});
    instanceSequence = Math.max(instanceSequence, state.independent.sequence || 0);
    saveIndependentSessions();
  }
  try {
    desktopStorage.setItem("spatial-workspace-app-states-v1", JSON.stringify(state.workspaceStates));
    desktopStorage.setItem("spatial-workspace-window-layouts-v1", JSON.stringify(state.windowLayouts));
    desktopStorage.setItem("spatial-workspace-area-layouts-v1", JSON.stringify(state.areaSessions));
    desktopStorage.setItem("spatial-project-content-v1", JSON.stringify(state.projects || {}));
    desktopStorage.setItem("spatial-project-spaces-v2", JSON.stringify(state.projects || {}));
    desktopStorage.setItem("spatial-active-project-v1", state.activeProjectName || "");
    desktopStorage.setItem("spatial-workspace-project-states-v1", JSON.stringify(state.workspaceProjects || normalizedWorkspaceProjects({}, state.activeProjectName || null, state.activeWorkspace)));
    desktopStorage.setItem("spatial-workspace-area-contents-v1", JSON.stringify(state.areaContents || {}));
    desktopStorage.setItem("spatial-project-window-sessions-v1", JSON.stringify(state.projectWindowSessions || {}));
    desktopStorage.setItem("spatial-note-draft-v1", state.noteDraft || "");
    desktopStorage.setItem("spatial-active-workspace", state.activeWorkspace);
    if (state.displayAssignments) desktopStorage.setItem("spatial-workspace-display-assignments-v1", JSON.stringify(state.displayAssignments));
    if (state.tileSessions) desktopStorage.setItem("spatial-split-layouts-v1", JSON.stringify(state.tileSessions));
  } catch {}
}

function applyDesktopSyncState(state) {
  if (!state || ![1, 2, 3, 4].includes(state.schema) || !workspaceProfiles[state.activeWorkspace]) return;
  desktopSyncApplying = true;
  try {
    if (state.tileSessions) tileSessions = cloneDesktopState(state.tileSessions);
    Object.entries(state.workspaceStates || {}).forEach(([name, saved]) => {
      if (workspaceAppStates[name] && saved) workspaceAppStates[name] = { ...workspaceAppStates[name], ...saved };
    });
    Object.keys(workspaceAreaSessions).forEach(name => delete workspaceAreaSessions[name]);
    Object.assign(workspaceAreaSessions, cloneDesktopState(state.areaSessions || {}));
    if (state.displayAssignments) {
      Object.keys(workspaceDisplayAssignments).forEach(name => delete workspaceDisplayAssignments[name]);
      Object.assign(workspaceDisplayAssignments, cloneDesktopState(state.displayAssignments));
    }
    Object.entries(state.maximized || {}).forEach(([name, maximized]) => {
      if (name in appMaximizedState) appMaximizedState[name] = Boolean(maximized);
    });
    Object.keys(projectWindowSessions).forEach(name => delete projectWindowSessions[name]);
    Object.assign(projectWindowSessions, cloneDesktopState(state.projectWindowSessions || {}));
    if (state.schema >= 3) {
      const normalized = Object.fromEntries(Object.entries(state.projects || {}).map(([name, project]) => [name, normalizeProject(project, name)]).filter(([, project]) => project));
      Object.keys(projectSpaces).forEach(name => delete projectSpaces[name]);
      Object.assign(projectSpaces, normalized);
    } else {
      Object.entries(state.projects || {}).forEach(([name, saved]) => {
        if (!projectSpaces[name] || !saved) return;
        if (typeof saved.note === "string") projectSpaces[name].note = saved.note;
        if (Array.isArray(saved.resources)) projectSpaces[name].resources = cloneDesktopState(saved.resources);
        if (typeof saved.activeMode === "string" && projectSpaces[name].modes[saved.activeMode]) projectSpaces[name].activeMode = saved.activeMode;
      });
    }

    Object.entries(projectSpaces).forEach(([id, project]) => {
      projectSpaces[id] = SpatialDemoExamples.migrateProject(id, project);
    });
    noteDraft = typeof state.noteDraft === "string" ? SpatialDemoExamples.migrateNote(state.noteDraft) : noteDraft;
    SpatialDesktopTheme.setPreference(state.themePreference || state.theme || "auto", { notify: false });
    persistIncomingDesktopState({ ...state, projects: projectSpaces, noteDraft });

    Object.keys(workspaceProjectStates).forEach(name => delete workspaceProjectStates[name]);
    Object.assign(workspaceProjectStates, normalizedWorkspaceProjects(state.workspaceProjects || {}, state.workspaceProjects ? undefined : state.activeProjectName || null, state.activeWorkspace));
    Object.keys(workspaceAreaContents).forEach(name => delete workspaceAreaContents[name]);
    Object.assign(workspaceAreaContents, cloneDesktopState(state.areaContents || {}));
    activeWorkspace = state.activeWorkspace;
    renderWorkspace(activeWorkspace, false);

    const notesField = $(".notes-layout textarea");
    if (notesField) notesField.value = noteDraft;

    (state.quickToggles || []).forEach(saved => {
      setSystemToggle(saved.label, saved.active);
    });

    if (typeof state.notificationsHtml === "string") {
      const previousNotificationCount = $$(".notification", $("#notificationList")).length;
      $("#notificationList").innerHTML = state.notificationsHtml;
      syncNotifications();
      const newest = $(".notification", $("#notificationList"));
      const incomingNotificationCount = $$(".notification", $("#notificationList")).length;
      if (newest && incomingNotificationCount > previousNotificationCount) {
        const badge = $(".app-badge", newest);
        const tone = ["blue", "cyan", "violet", "green", "amber", "rose"].find(name => badge?.classList.contains(name)) || "blue";
        const glyph = $("use", badge)?.getAttribute("href")?.replace(/^#/, "") || "i-bell";
        requestAnimationFrame(() => drawAttentionToNotification(
          newest,
          $("b", newest)?.textContent || "New notification",
          $("small", newest)?.textContent || "",
          tone,
          glyph
        ));
      }
    }

    if (state.music) {
      musicPosition = Math.max(0, Math.min(218, Number(state.music.position) || 0));
      setMusicPlaying(Boolean(state.music.playing));
    }
    if (state.focus) {
      focusSeconds = Math.max(0, Number(state.focus.seconds) || 0);
      if (state.focus.visible) revealDynamicWidget($("#timerWidget"));
      else concealDynamicWidget($("#timerWidget"));
      setFocusRunning(Boolean(state.focus.running));
    }

    requestAnimationFrame(() => {
      const areasChanged = layoutMode === "auto" && rebalanceAreaDisplays();
      refreshIntentAreas();
      applyExtendedDesktopPartition();
      renderTileLayout(state.frontApp || frontApp);
      Object.entries(state.maximized || {}).forEach(([name, maximized]) => {
        const frame = frameFor(name);
        if (!frame || appState[name] !== "open" || !isLocalApp(name)) {
          autoWindowAvoidance.delete(name);
          return;
        }
        if (Boolean(maximized) !== (frame.dataset.maximized === "true")) toggleMaximize(name);
      });
      if (desktopHasWindowFocus && state.frontApp && appState[state.frontApp] === "open") bringToFront(state.frontApp);
      if (!desktopHasWindowFocus) focusDesktop(false);
      updateDesktopSyncPresence();
      if (areasChanged && localDisplaySlot() === 1) {
        setTimeout(() => queueDesktopStateBroadcast(0), 0);
      }
    });
  } finally {
    requestAnimationFrame(() => { desktopSyncApplying = false; });
  }
}

function postDesktopSyncMessage(message) {
  if ((desktopSyncScope === "desktop" && globalThis.SpatialGuide?.model.active()) || globalThis.SpatialGuide?.settingUp || globalThis.SpatialGuide?.displayValid === false) return;
  const packet = {
    scope: desktopSyncScope,
    ...message,
    id: desktopSyncSource + ":" + Date.now() + ":" + Math.random().toString(36).slice(2),
    source: desktopSyncSource,
    display: localDisplayDescriptor(),
    sentAt: Date.now()
  };
  if (desktopSyncChannel) desktopSyncChannel.postMessage(packet);
  else {
    try { desktopStorage.setItem(DESKTOP_SYNC_STORAGE_KEY, JSON.stringify(packet)); } catch {}
  }
}

function broadcastDesktopState() {
  if (desktopSyncApplying || !desktopSyncReady) return;
  const stamp = Math.max(Date.now(), desktopSyncLastStamp + 1);
  desktopSyncLastStamp = stamp;
  postDesktopSyncMessage({ type: "state", stamp, state: captureDesktopSyncState() });
}

function queueDesktopStateBroadcast(delay = 55) {
  if (desktopSyncApplying) return;
  clearTimeout(desktopSyncTimer);
  desktopSyncTimer = setTimeout(broadcastDesktopState, delay);
}

function updateDesktopSyncPresence() {
  refreshIntentAreas();
  const now = Date.now();
  desktopSyncPeers.forEach((peer, source) => {
    if (now - peer.seenAt > 6500) desktopSyncPeers.delete(source);
  });
  const count = desktopSyncPeers.size;
  const slot = localDisplaySlot();
  document.body.classList.toggle("is-session-synced", count > 0);
  const context = $("#systemAreaContext");
  if (context && workspaceProfiles[activeWorkspace]) {
    context.textContent = workspaceProfiles[activeWorkspace].label + " workspace" + (count ? " · " + localDisplayRoleLabel() : "");
  }
  const systemArea = areaFor("systems");
  if (systemArea) {
    systemArea.setAttribute("aria-label", count ? "System area · " + (count + 1) + " displays synced" : "System area");
    systemArea.title = count ? (count + 1) + " displays linked in this browser session" : "";
  }
  if (count && !desktopSyncAnnounced) {
    desktopSyncAnnounced = true;
    showToast(localDisplayRoleLabel() + " connected · extended desktop ready");
  }
  if (!count) desktopSyncAnnounced = false;
  const changed = rebalanceAreaDisplays();
  applyExtendedDesktopPartition();
  if (changed && slot === 1 && !desktopSyncApplying) queueDesktopStateBroadcast(0);
}

function receiveDesktopSyncMessage(packet) {
  if (desktopSyncScope === "desktop" && globalThis.SpatialGuide?.model.active()) return;
  if (!packet || (packet.scope || "desktop") !== desktopSyncScope || packet.source === desktopSyncSource || globalThis.SpatialGuide?.displayValid === false) return;
  if (packet.type === "guide-display-end") { if (globalThis.SpatialGuide?.displayCompanion) globalThis.close(); return; }
  if (packet.type === "goodbye") {
    desktopSyncPeers.delete(packet.source);
    updateDesktopSyncPresence();
    return;
  }
  desktopSyncPeers.set(packet.source, { seenAt: Date.now(), ...(packet.display || {}) });
  updateDesktopSyncPresence();
  if (packet.type === "request") {
    broadcastDesktopState();
    return;
  }
  if (packet.type !== "state" || !Number.isFinite(packet.stamp) || packet.stamp <= desktopSyncLastStamp) return;
  desktopSyncLastStamp = packet.stamp;
  desktopSyncReady = true;
  applyDesktopSyncState(packet.state);
}

function prepareCrossDisplaySync() {
  if (desktopSyncChannel) desktopSyncChannel.addEventListener("message", event => receiveDesktopSyncMessage(event.data));
  else window.addEventListener("storage", event => {
    if (event.key !== (desktopSyncScope === "desktop" ? "" : SpatialGuide.prefix) + DESKTOP_SYNC_STORAGE_KEY || !event.newValue) return;
    try { receiveDesktopSyncMessage(JSON.parse(event.newValue)); } catch {}
  });

  document.addEventListener("click", () => queueDesktopStateBroadcast());
  document.addEventListener("change", () => queueDesktopStateBroadcast());
  document.addEventListener("input", event => {
    if (!event.target.closest("#universalSearch")) queueDesktopStateBroadcast(90);
  });
  window.addEventListener("pointerup", () => {
    if (layoutMode === "auto" && rebalanceAreaDisplays()) applyExtendedDesktopPartition();
    queueDesktopStateBroadcast();
  });

  postDesktopSyncMessage({ type: "presence" });
  postDesktopSyncMessage({ type: "request" });
  window.setInterval(() => {
    postDesktopSyncMessage({ type: "presence" });
    updateDesktopSyncPresence();
  }, 2000);
  window.addEventListener("pagehide", () => postDesktopSyncMessage({ type: "goodbye" }));
}

// Window identities and workspace-owned content sessions.
const baseAppNames = Object.keys(appInfo);
if (desktopPreset === 'clean') { $('.notes-layout textarea',frameFor('notes')).value = ''; $('.notes-layout textarea',frameFor('notes')).textContent = ''; noteDraft = ''; }
const pristineFrames = Object.fromEntries(baseAppNames.map(name => [name, frameFor(name).cloneNode(true)]));
let independentSessions = {};
try { independentSessions = JSON.parse(desktopStorage.getItem('spatial-independent-sessions-v1') || '{}'); } catch {}
const instanceDefinitions = independentSessions.instances || {};
const workspaceContent = independentSessions.content || {};
const workspaceProjects = independentSessions.projects || {general: activeProjectName, school: null, work: null, gaming: null};
const windowMembership = independentSessions.membership || {general: {dolphin: activeProjectName, elisa: null}};
let instanceSequence = Number(independentSessions.sequence) || 0;
function saveIndependentSessions() {
  try { desktopStorage.setItem('spatial-independent-sessions-v1', JSON.stringify({instances: instanceDefinitions, content: workspaceContent, projects: workspaceProjects, membership: windowMembership, sequence: instanceSequence})); } catch {}
}
function installInstance(id, base, bind = true) {
  if (appInfo[id] || !pristineFrames[base]) return;
  const frame = pristineFrames[base].cloneNode(true);
  frame.dataset.appFrame = id;
  frame.hidden = true;
  frame.querySelectorAll('[id]').forEach(element => { element.id += '-' + id; });
  appInfo[id] = {...appInfo[base], base, label: appInfo[base].label + ' · ' + id.split('--').at(-1)};
  appState[id] = 'closed';
  appMaximizedState[id] = false;
  $('.workspace-zone').append(frame);
  if (base === 'elisa') {
    let playing = false;
    frame.querySelectorAll('[data-music="play"]').forEach(button => button.addEventListener('click', () => { playing = !playing; button.innerHTML = icon(playing ? 'i-pause' : 'i-play'); button.setAttribute('aria-pressed', String(playing)); }));
  }
  if (bind) prepareWindows({querySelectorAll: selector => selector === '[data-app-frame]' ? [frame] : frame.querySelectorAll(selector)});
  applyAppPrimaryColors();
}
Object.entries(instanceDefinitions).forEach(([id, base]) => installInstance(id, base, false));
function createAppInstance(name) {
  const base = appInfo[name]?.base || name;
  if (!pristineFrames[base]) return;
  const id = base + '--' + (++instanceSequence);
  instanceDefinitions[id] = base;
  installInstance(id, base);
  windowMembership[activeWorkspace] ||= {};
  windowMembership[activeWorkspace][id] = desktopPages.column(activeWorkspace) === "workspace" ? null : desktopPages.column(activeWorkspace);
  openApp(id);
  saveIndependentSessions();
  showToast('New ' + appInfo[base].label + ' window · separate hotbar slot');
  return id;
}
function workspaceHotbarNames() {
  const names = [...new Set([...workspaceProfiles[activeWorkspace].rack, ...Object.keys(appState)])];
  // Read final CSS positions rather than intermediate tile animation rects.
  const open = names.filter(name => appState[name] === 'open' && isLocalApp(name)).map((name,index) => {
    const frame=frameFor(name), rect=frame?.getBoundingClientRect();
    const parent=frame?.parentElement?.getBoundingClientRect();
    const x=parseFloat(frame?.style.left),y=parseFloat(frame?.style.top);
    return {name,index,x:Number.isFinite(x)&&parent?parent.left+x:rect?.left||0,
      y:Number.isFinite(y)&&parent?parent.top+y:rect?.top||0};
  }).sort((a,b)=>a.y-b.y||a.x-b.x||a.index-b.index);
  const rows=[];
  open.forEach(item=>{
    // Anchor each row to its first window for stable, transitive ordering.
    const row=rows.at(-1);
    if(row&&item.y-row.top<=24)row.windows.push(item);
    else rows.push({top:item.y,windows:[item]});
  });
  const ordered=rows.flatMap(row=>row.windows.sort((a,b)=>a.x-b.x||a.y-b.y||a.index-b.index).map(item=>item.name));
  // Minimized windows travel with the Apps Area, including its icon-only rail.
  return [...ordered,
    ...names.filter(name => appState[name] === 'minimized' && desktopPages.inColumn(activeWorkspace, name))];
}
function workspaceShortcutNames() {
  // Icons and their useful cards share a single slot for each window.
  return workspaceHotbarNames();
}
function renderInstanceRack() {
  const names = workspaceHotbarNames();
  $('#appRack').hidden = names.length === 0;
  const order=JSON.stringify(names.map(name=>[name,appState[name]]));
  if($('#appRack').dataset.layoutOrder===order){applyAppPrimaryColors($('#appRack'));return;}
  $('#appRack').dataset.layoutOrder=order;
  const buttons = names.map((name, index) => {
    const info = appInfo[name];
    const slot = index + 1, bank = Math.floor(index / 10), digit = (index + 1) % 10;
    const shortcut = bank === 0 ? 'Super+' + digit : bank === 1 ? 'Super+Shift+' + digit : 'Click · slot ' + slot;
    return '<button class="app-key" data-open-app="' + name + '" data-hotbar-slot="' + slot + '" title="' + escapeHtml(info.label + ' · ' + shortcut + ' · Shift+click: new window') + '" aria-label="' + escapeHtml(info.label + ' · ' + shortcut) + '"' + (bank < 2 ? ' aria-keyshortcuts="Meta+' + (bank ? 'Shift+' : '') + digit + '"' : '') + '><kbd class="app-hotkey">' + (bank === 0 ? digit : bank === 1 ? '⇧' + digit : slot) + '</kbd>' + appArt(name) + '<span>' + escapeHtml(info.label) + '</span><i></i></button>';
  });
  const open = buttons.filter((_, index) => appState[names[index]] === 'open').join('');
  const parked = buttons.filter((_, index) => appState[names[index]] === 'minimized').join('');
  $('#appRack').innerHTML = (open ? '<div class="app-rack-group app-rack-open" role="group" aria-label="Open applications">' + open + '</div>' : '')
    + (parked ? '<div class="app-rack-group app-rack-parked" role="group" aria-label="Parked applications">' + parked + '</div>' : '');
  applyAppPrimaryColors($('#appRack'));
}
let hotbarOrderFrame=0;
function scheduleHotbarOrder() {
  if(hotbarOrderFrame)return;
  hotbarOrderFrame=requestAnimationFrame(()=>{
    hotbarOrderFrame=0;
    if(manualWindowInteraction||tileInteraction)return;
    const before=$('#appRack').dataset.layoutOrder;
    syncRack();
    if(before!==$('#appRack').dataset.layoutOrder)renderMiniApps();
  });
}
const originalSyncRack = syncRack;
syncRack = function() { renderInstanceRack(); originalSyncRack(); };
hotbarSlotFor = name => { const index = workspaceShortcutNames().indexOf(name); return index < 0 ? null : index + 1; };
function captureWorkspaceContent() {
  const frames = {};
  Object.keys(appInfo).forEach(name => {
    const frame = frameFor(name);
    if (!frame) return;
    frames[name] = [...frame.querySelectorAll('input,textarea,select,[contenteditable]')].map(field => ({value: field.isContentEditable ? field.innerHTML : field.value, checked: field.checked}));
  });
  workspaceContent[activeWorkspace] = {frames, systemFields: [...areaFor('systems')?.querySelectorAll('input,select') || []].map(field => field.value), focusSeconds, music: {playing: musicPlaying, position: musicPosition}, note: noteDraft, terminal: terminalPreview, history: workspaceContent[activeWorkspace]?.history || []};
  workspaceProjects[activeWorkspace] = activeProjectName;
  saveIndependentSessions();
}
function renderWorkspaceHistory() {
  Object.keys(appInfo).filter(id => (appInfo[id].base || id) === 'browser').forEach(id => {
    const frame = frameFor(id);
    let details = frame.querySelector('.workspace-browser-history');
    if (!details) { details = document.createElement('details'); details.className = 'workspace-browser-history'; frame.querySelector('.start-page').append(details); }
    const history = workspaceContent[activeWorkspace]?.history || [];
    details.innerHTML = '<summary>' + escapeHtml(workspaceProfiles[activeWorkspace].label) + ' browsing history (' + history.length + ')</summary>' + history.slice(-20).reverse().map(item => '<p>' + escapeHtml(item.address) + '</p>').join('');
  });
}
function restoreWorkspaceContent(name) {
  const saved = workspaceContent[name];
  Object.keys(appInfo).forEach(id => {
    const frame = frameFor(id), base = appInfo[id].base || id;
    if (!frame) return;
    const defaults = [...pristineFrames[base].querySelectorAll('input,textarea,select,[contenteditable]')];
    [...frame.querySelectorAll('input,textarea,select,[contenteditable]')].forEach((field, index) => {
      const value = saved?.frames?.[id]?.[index]?.value ?? (frame.dataset.demoExample ? field.value : defaults[index]?.value ?? '');
      if (field.isContentEditable) field.innerHTML = saved?.frames?.[id]?.[index]?.value || '';
      else field.value = field.tagName === 'TEXTAREA' ? SpatialDemoExamples.migrateNote(value) : value;
      if (field.type === 'checkbox') field.checked = saved?.frames?.[id]?.[index]?.checked ?? defaults[index]?.checked ?? false;
    });
  });
  noteDraft = saved?.note ?? workspaceAreaContents[name]?.noteDraft ?? (desktopPreset === 'demo' ? SpatialDemoExamples.workspaceWindows[name]?.find(window => window.base === 'notes')?.content.note : '') ?? '';
  noteDraft = SpatialDemoExamples.migrateNote(noteDraft);
  $('.notes-layout textarea').value = noteDraft;
  terminalPreview = saved?.terminal || 'Ready for a command';
  focusSeconds = saved?.focusSeconds ?? 25 * 60;
  focusRunning = false; clearInterval(focusTimer); updateTimer();
  [...areaFor('systems')?.querySelectorAll('input,select') || []].forEach((field, index) => { if (saved?.systemFields?.[index] !== undefined) field.value = saved.systemFields[index]; });
  musicPosition = saved?.music?.position || 0;
  setMusicPlaying(saved?.music?.playing ?? false);
  Object.keys(appInfo).filter(id => (appInfo[id].base || id) === "dolphin").forEach(id => {
    const frame = frameFor(id);
    if (!frame) return;
    const hasOwnPath = saved?.frames?.[id] || frame.dataset.demoExample?.startsWith(name + ":");
    renderFileLocation(id, hasOwnPath ? $(".address-bar input", frame).value || workspaceProfiles[name].home : workspaceProfiles[name].home);
  });
  refreshDownloadUi();
  renderWorkspaceHistory();
}
const originalCaptureWorkspace = captureCurrentWorkspaceSession;
captureCurrentWorkspaceSession = function() { captureWorkspaceContent(); originalCaptureWorkspace(); };
const originalRenderWorkspace = renderWorkspace;
renderWorkspace = function(name, announce = true) {
  if (!workspaceProfiles[name]) return;
  if (name !== activeWorkspace) captureCurrentWorkspaceSession();
  Object.keys(appState).forEach(id => { appState[id] = 'closed'; });
  activeProjectName = workspaceProjects[name] || null;
  activeWorkspace = name;
  originalRenderWorkspace(name, announce);
  restoreWorkspaceContent(name);
  if (activeProjectName && projectSpaces[activeProjectName]) renderProjectSpace(activeProjectName);
  else setProjectClosedState(true);
  windowMembership[name] ||= {};
  saveIndependentSessions();
};
const originalOpenApp = openApp;
openApp = function(name, point = null) {
  if (!appInfo[name]) return;
  if (desktopPageAnimating) { setTimeout(() => openApp(name, point), 230); return; }
  const newlyOpened = appState[name] === 'closed';
  const column = desktopPages.column(activeWorkspace);
  const owner = desktopPages.columnOf(activeWorkspace, name);
  // Launching an app in another column creates a separate window identity.
  if (owner !== column && (!newlyOpened || name in desktopPages.space(activeWorkspace).owners)) return createAppInstance(name);
  if (newlyOpened) {
    windowMembership[activeWorkspace] ||= {};
    windowMembership[activeWorkspace][name] = column === 'workspace' ? null : column;
  }
  if (newlyOpened || appState[name] === 'minimized') {
    removeOffPageWindowTiles(name);
    desktopPages.assign(activeWorkspace, name);
    saveDesktopPages();
  } else changeDesktopPage(desktopPages.pageOf(activeWorkspace, name), false);
  originalOpenApp(name, point);
  if (newlyOpened && (appInfo[name].base || name) === "dolphin" && !frameFor(name).dataset.demoExample?.startsWith(activeWorkspace + ":")) renderFileLocation(name, workspaceProfiles[activeWorkspace].home);
  refreshDownloadUi();
  saveIndependentSessions();
};
function removeWindowFromSavedProjects(name) {
  Object.entries(projectWindowSessions).forEach(([key, session]) => {
    if (!key.startsWith(activeWorkspace + ':')) return;
    session.apps = (session.apps || []).filter(id => id !== name);
    ['states','geometry','displays'].forEach(field => { if (session[field]) delete session[field][name]; });
  });
}
function moveAppWorkspace(name, destination) {
  if (!workspaceProfiles[destination] || appState[name] === 'closed') return;
  captureWorkspaceContent();
  const state = appState[name], contents = workspaceContent[activeWorkspace]?.frames?.[name];
  // Base windows already exist in every workspace. Transfer into a fresh identity
  // so an existing destination window is never overwritten.
  const base = appInfo[name].base || name, id = base + '--' + (++instanceSequence);
  instanceDefinitions[id] = base; installInstance(id, base);
  workspaceAppStates[destination][id] = state;
  workspaceContent[destination] ||= {frames: {}, music: {playing:false, position:0}, history: []};
  workspaceContent[destination].frames ||= {};
  workspaceContent[destination].frames[id] = contents;
  windowMembership[destination] ||= {}; windowMembership[destination][id] = null;
  desktopPages.assign(destination, id, desktopPages.current(destination, 'workspace'), 'workspace'); saveDesktopPages();
  removeWindowFromSavedProjects(name);
  closeApp(name); windowMembership[activeWorkspace][name] = null; syncProjectWindowScopes();
  persistProjectState(); persistWorkspaceAppStates(); saveIndependentSessions();
  showToast('Window moved to ' + workspaceProfiles[destination].label + ' · content preserved');
}
function moveAppProject(name, destination) {
  if (!projectSpaces[destination] || appState[name] === 'closed') return;
  if (openProjectNames().includes(destination)) { moveWindowToColumn(name, destination); return; }
  removeWindowFromSavedProjects(name);
  const page = desktopPages.current(activeWorkspace, destination);
  const key = projectSessionKey(destination);
  const session = projectWindowSessions[key] ||= {apps:[], states:{}, geometry:{}, displays:{}, pages:{}};
  session.apps.push(name); session.states[name] = appState[name];
  session.geometry[name] = windowGeometry.get(name) || readGeometry(frameFor(name));
  session.displays[name] = displayAssignmentsFor().apps[name] || 1;
  session.pages ||= {}; session.pages[name] = page;
  closeApp(name);
  desktopPages.assign(activeWorkspace, name, page, destination);
  windowMembership[activeWorkspace] ||= {};
  windowMembership[activeWorkspace][name] = destination;
  persistProjectState(); saveIndependentSessions(); saveDesktopPages();
  showToast('Window moved to ' + projectSpaces[destination].name);
}
document.addEventListener('change', event => {
  const frame = event.target.closest('[data-app-frame]');
  if ((appInfo[frame?.dataset.appFrame]?.base || frame?.dataset.appFrame) === 'browser' && event.target.matches('input')) {
    workspaceContent[activeWorkspace] ||= {frames: {}, history: []};
    const history = workspaceContent[activeWorkspace].history ||= [];
    if (event.target.value) history.push({address:event.target.value, time:Date.now()});
  }
  captureWorkspaceContent();
  renderWorkspaceHistory();
});

prepareNoteSync();
prepareAreaWindows();
prepareSystemRailExpansion();
prepareProjectSpaces();
prepareDesktopPages();
prepareOverviewViews();
prepareWorkspaces();
preparePackages();
prepareHomeFolders();
prepareWindows();
applyAppPrimaryColors();
hydrateAppArtwork();
prepareControlSemantics();
observeMaterialInheritance();
prepareMaterialCursor();
prepareContextMenus();
prepareCrossDisplaySync();
updateClock();
setInterval(updateClock, 1000);
renderCalendar();
bindMusicControls();
restoreWorkspaceContent(activeWorkspace);
prepareAppWindows();
updateTimer();
syncApps();
requestAnimationFrame(() => {
  loadLayout(activeWorkspace);
  restoreWorkspaceWindowLayout();
  windowViewportLockReady = true;
  if (frontApp && desktopHasWindowFocus) bringToFront(frontApp);
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
  scheduleWindowTiling();
});

window.addEventListener("resize", () => {
  suspendWindowViewportLock = true;
  layoutDockAreas(false);
  windowGeometry.forEach((geometry, name) => {
    if (appState[name] === "open") applyGeometry(name, geometry, false);
  });
  suspendWindowViewportLock = false;
  refreshIntentAreas();
  renderTileLayout(frontApp);
  if (layoutMode === "auto") {
    if (rebalanceAreaDisplays()) applyExtendedDesktopPartition();
    scheduleSpatialAutoLayout();
  }
  positionNotificationPeek();
});

window.addEventListener("pointermove", event => {
  if (!event.pointerType || event.pointerType === "mouse") lastDesktopPointerX = event.clientX;
}, { passive: true });

window.addEventListener("pagehide", () => captureCurrentWorkspaceSession());


// Window labels show which windows are saved with the current Project.
function syncProjectWindowScopes(closed = false) {
  const shell = $(".desktop-shell");
  if (!shell) return;
  const project = !closed && projectColumnActive() ? projectSpaces[activeProjectName] : null;
  shell.dataset.projectOpen = String(Boolean(project));
  if (project) shell.style.setProperty("--open-project-accent", project.accent);
  else shell.style.removeProperty("--open-project-accent");
  const memberships = windowMembership[activeWorkspace] || {};
  $$("[data-app-frame]").forEach(frame => {
    const name = frame.dataset.appFrame, owner = memberships[name];
    frame.dataset.projectScope = project && owner === activeProjectName ? "project" : "workspace";
    let label = $(".project-window-scope", frame);
    if (!label) {
      const identity = $(".app-identity", frame);
      if (!identity) return;
      label = document.createElement("span");
      label.className = "project-window-scope";
      identity.append(label);
    }
    label.hidden = true;
    label.textContent = owner === activeProjectName ? "Project" : "Workspace";
    label.title = owner === activeProjectName ? project?.name + " · saved with this project" : "Independent window · stays open when the project closes";
  });
}

function renderAvailableProjectLibrary() {
  const list = $("#projectLibraryList");
  if (!list) return;
  const entries = Object.entries(projectSpaces);
  if (!activeProjectName) $("#projectAreaContext").textContent = entries.length + (entries.length === 1 ? " project available" : " projects available");
  list.innerHTML = entries.map(([id, project]) => {
    const detail = projectLocationMeta(project).label + " · " + project.resources.length + " resources";
    return '<button type="button" class="surface-key project-library-entry" data-open-area-project="' + escapeHtml(id) + '" aria-label="' + escapeHtml("Open " + project.name) + '" title="' + escapeHtml(project.name + " · " + project.root) + '" style="--library-project-accent:' + escapeHtml(project.accent) + '"><span class="project-library-icon">' + icon(project.icon || "i-folder") + '</span><span class="project-library-copy"><b>' + escapeHtml(project.name) + '</b><small>' + escapeHtml(detail) + '</small></span></button>';
  }).join("") || '<div class="project-library-empty"><p>No projects yet.</p></div>';
  prepareControlSemantics(list);
}
