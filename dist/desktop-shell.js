const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const toggleControlSelector = [
  "[data-open-app]",
  "[data-toggle]",
  ".folder-tab",
  ".play-toggle",
  "#timerToggle",
  "#allAppsToggle",
  "[data-project-select]",
  "[data-workspace]",
  "[data-package-mode]",
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
  ".launcher-category",
  ".areas-reset",
  ".overview-area-row > button",
  ".package-mode-switch > button",
  ".package-secondary",
  ".package-primary",
  ".project-path",
  ".system-launcher",
  ".overview-launch",
  ".workspace-status"
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
  ".toast",
  ".app-frame .recessed-field",
  ".app-frame input[type=range]"
].join(",");

const absMaterialSurfaceSelector = [
  ".app-frame",
  ".package-window"
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
  ".area-window-icon",
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
  matchingNodes(root, ".app-frame .recessed-field,.app-frame input[type=range]").forEach(surface => {
    surface.classList.add("material-surface-glass");
    surface.classList.remove("material-surface-abs");
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
    const managed = button.matches(materialControlSelector);
    if (!managed) return;
    button.classList.toggle("control-toggle", toggle);
    button.classList.toggle("control-push", !toggle);
    if (button.matches(".play-toggle")) {
      button.classList.toggle("is-active", musicPlaying);
      button.setAttribute("aria-pressed", String(musicPlaying));
      return;
    }
    if (toggle && !button.hasAttribute("aria-pressed") && !button.hasAttribute("aria-selected")) {
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
  elisa: { label: "Elisa", icon: "i-music", tone: "violet", primary: "#a483ff", detail: "running out of time" },
  browser: { label: "Web", icon: "i-web", tone: "cyan", primary: "#55d8e9", detail: "Start page" },
  terminal: { label: "Konsole", icon: "i-terminal", tone: "green", primary: "#64d782", detail: "xef@desktop" },
  notes: { label: "Notes", icon: "i-note", tone: "amber", primary: "#ffb553", detail: "Desktop concept" }
};

const appState = { dolphin: "open", elisa: "open", browser: "closed", terminal: "closed", notes: "closed" };
const windowGeometry = new Map();
const maximizeRestore = new Map();
let frontApp = "dolphin";
let zCounter = 20;
let toastTimer;
let musicPlaying = true;
let musicPosition = 115;
let musicTimer;
let focusSeconds = 25 * 60;
let focusRunning = false;
let focusTimer;
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
  return '<svg class="app-art ' + extraClass + '" aria-hidden="true"><use href="#app-' + name + '"/></svg>';
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

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1600);
}

function frameFor(name) {
  return document.querySelector('[data-app-frame="' + name + '"]');
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

function clampGeometry(geometry) {
  const workspace = workspaceBounds();
  const minWidth = Math.min(380, workspace.width - 24);
  const minHeight = Math.min(300, workspace.height - 24);
  const width = Math.max(minWidth, Math.min(geometry.width, workspace.width - 16));
  const height = Math.max(minHeight, Math.min(geometry.height, workspace.height - 16));
  return {
    x: Math.max(8, Math.min(geometry.x, workspace.width - width - 8)),
    y: Math.max(8, Math.min(geometry.y, workspace.height - height - 8)),
    width,
    height
  };
}

function applyGeometry(name, geometry, save = true) {
  const frame = frameFor(name);
  const next = clampGeometry(geometry);
  frame.style.left = next.x + "px";
  frame.style.top = next.y + "px";
  frame.style.width = next.width + "px";
  frame.style.height = next.height + "px";
  if (save) {
    windowGeometry.set(name, next);
    saveLayout();
  }
}

function saveLayout() {
  try {
    const layouts = JSON.parse(localStorage.getItem("spatial-workspace-window-layouts-v1") || "{}");
    layouts[activeWorkspace] = Object.fromEntries(windowGeometry);
    localStorage.setItem("spatial-workspace-window-layouts-v1", JSON.stringify(layouts));
  } catch {}
}

function loadLayout(workspaceName = activeWorkspace) {
  windowGeometry.clear();
  try {
    const layouts = JSON.parse(localStorage.getItem("spatial-workspace-window-layouts-v1") || "{}");
    let layout = layouts[workspaceName];
    if (!layout && workspaceName === "general") {
      layout = JSON.parse(localStorage.getItem("spatial-desktop-layout-v3") || "{}");
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
    windowGeometry.set(name, clampGeometry(geometry));
    applyGeometry(name, geometry, false);
  });
  saveLayout();
}

function syncRack() {
  $$("[data-open-app]").forEach(button => {
    const name = button.dataset.openApp;
    const state = appState[name];
    button.classList.toggle("is-open", state !== "closed");
    button.classList.toggle("is-active", state === "open" && name === frontApp);
    button.classList.toggle("is-minimized", state === "minimized");
    button.setAttribute("aria-pressed", String(state === "open" && name === frontApp));
  });
}

function topOpenApp(except = null) {
  return Object.keys(appState)
    .filter(name => appState[name] === "open" && name !== except)
    .sort((a, b) => Number(frameFor(b).style.zIndex || 0) - Number(frameFor(a).style.zIndex || 0))[0] || null;
}

function bringToFront(name) {
  if (appState[name] !== "open") return;
  frontApp = name;
  zCounter += 1;
  $$("[data-app-frame]").forEach(frame => frame.classList.toggle("is-front", frame.dataset.appFrame === name));
  frameFor(name).style.zIndex = zCounter;
  syncRack();
}

function syncApps() {
  $$("[data-app-frame]").forEach(frame => {
    const visible = appState[frame.dataset.appFrame] === "open";
    frame.hidden = !visible;
    frame.classList.toggle("is-active", visible);
  });
  if (!frontApp || appState[frontApp] !== "open") frontApp = topOpenApp();
  $("#emptyWorkspace").hidden = Object.values(appState).includes("open");
  syncRack();
  renderMiniApps();
  renderOverviewWindows();
  if (frontApp) bringToFront(frontApp);
  persistWorkspaceAppStates();
}

function openApp(name, dropPoint = null) {
  if (!appInfo[name]) return;
  if (typeof clearWindowAutoAvoidance === "function") clearWindowAutoAvoidance(name);
  appState[name] = "open";
  frameFor(name).hidden = false;
  syncApps();
  if (dropPoint) {
    const workspace = workspaceBounds();
    const previous = windowGeometry.get(name);
    const width = previous?.width || Math.min(680, workspace.width * .72);
    const height = previous?.height || Math.min(620, workspace.height * .72);
    applyGeometry(name, {
      x: dropPoint.x - workspace.rect.left - width / 2,
      y: dropPoint.y - workspace.rect.top - 32,
      width,
      height
    });
  } else if (windowGeometry.has(name)) {
    applyGeometry(name, windowGeometry.get(name), false);
  } else {
    const geometry = defaultWindowGeometry(name, Object.values(appState).filter(state => state === "open").length - 1);
    windowGeometry.set(name, clampGeometry(geometry));
    applyGeometry(name, geometry);
  }
  bringToFront(name);
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
}

function minimizeApp(name, preserveGeometry = false) {
  const frame = frameFor(name);
  if (appState[name] !== "open") return;
  if (!preserveGeometry && !frame.dataset.maximized) windowGeometry.set(name, readGeometry(frame));
  frame.classList.remove("is-maximized");
  delete frame.dataset.maximized;
  if (typeof clearWindowAutoAvoidance === "function") clearWindowAutoAvoidance(name);
  syncMaximizeButton(frame);
  appState[name] = "minimized";
  if (frontApp === name) frontApp = topOpenApp(name);
  syncApps();
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
}

function closeApp(name) {
  if (typeof clearWindowAutoAvoidance === "function") clearWindowAutoAvoidance(name);
  appState[name] = "closed";
  if (frontApp === name) frontApp = topOpenApp(name);
  syncApps();
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
  showToast(appInfo[name].label + " closed");
}

function syncMaximizeButton(frame) {
  const button = $('[data-window-action="maximize"]', frame);
  if (button) button.setAttribute("aria-pressed", String(frame.dataset.maximized === "true"));
}

function toggleMaximize(name) {
  const frame = frameFor(name);
  if (frame.dataset.maximized === "true") {
    delete frame.dataset.maximized;
    frame.classList.remove("is-maximized");
    clearWindowAutoAvoidance(name);
    applyGeometry(name, maximizeRestore.get(name) || windowGeometry.get(name) || readGeometry(frame));
    syncMaximizeButton(frame);
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
}

function miniMarkup(name) {
  const info = appInfo[name];
  const header = '<header title="Drag this card back into the workspace"><div><span class="app-badge ' + info.tone + '">' + appArt(name, "app-art-compact") + '</span><span><b>' + info.label + '</b><small>' + info.detail + '</small></span></div><div class="mini-actions"><button class="surface-key mini-control" data-mini-restore="' + name + '" aria-label="Restore ' + info.label + '">' + icon("i-max") + '</button><button class="surface-key mini-control" data-mini-close="' + name + '" aria-label="Close ' + info.label + '">' + icon("i-close") + "</button></div></header>";
  if (name === "elisa") {
    return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<div class="mini-music"><div class="mini-art"></div><div class="mini-track"><b>running out of time</b><small>eenspire · 1:55 / 3:38</small></div><div class="mini-transport"><button class="surface-key mini-control" data-music="prev" aria-label="Previous track" title="Previous track">' + icon("i-prev") + '</button><button class="surface-key mini-control play-toggle" data-music="play" aria-label="' + (musicPlaying ? "Pause" : "Play") + '" title="' + (musicPlaying ? "Pause" : "Play") + '">' + icon(musicPlaying ? "i-pause" : "i-play") + '</button><button class="surface-key mini-control" data-music="next" aria-label="Next track" title="Next track">' + icon("i-next") + '</button><input class="track-range" type="range" min="0" max="218" value="' + musicPosition + '" aria-label="Track position"></div></div></article>';
  }
  if (name === "dolphin") {
    return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<div class="mini-location"><span class="live-slit"></span><b>Downloads</b><small>276.8 GiB free</small></div><div class="mini-file-list"><button data-mini-file="material-interface"><span><i class="folder-glyph"></i>material-interface</span><small>today</small></button><button data-mini-file="plasma-shell-study.png"><span><i class="document-glyph image"></i>plasma-shell-study.png</span><small>6.8 MiB</small></button></div><div class="mini-quick-row"><button class="surface-key mini-tool" data-mini-action="new-folder">' + icon("i-folder") + '<span>New folder</span></button><button class="surface-key mini-tool" data-mini-action="find-files">' + icon("i-search") + '<span>Find</span></button></div></article>';
  }
  if (name === "terminal") {
    return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<div class="mini-terminal-output"><b>xef@desktop:~$</b><span data-mini-terminal-output>' + escapeHtml(terminalPreview) + '</span></div><form class="mini-command" data-mini-terminal-form><span>$</span><input name="command" autocomplete="off" placeholder="Run a quick command" aria-label="Quick terminal command"><button class="surface-key mini-control" aria-label="Run command">' + icon("i-right") + "</button></form></article>";
  }
  if (name === "browser") {
    return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<form class="mini-browser-search" data-mini-browser-form><input name="query" placeholder="Search or enter address" aria-label="Mini browser search"><button class="surface-key mini-control" aria-label="Search">' + icon("i-search") + '</button></form><div class="mini-sites"><button data-mini-site="KDE Invent">KDE</button><button data-mini-site="GitHub">GitHub</button><button data-mini-site="CHMI">CHMI</button></div></article>';
  }
  if (name === "notes") {
    return '<article class="mini-card mini-card-note" data-mini-card="' + name + '">' + header + '<textarea class="mini-note-field" data-mini-note aria-label="Edit Desktop concept note">' + escapeHtml(noteDraft) + "</textarea></article>";
  }
  return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<div class="mini-files"><b>' + info.detail + '</b><span>live</span><small>Drag back when you need the full app</small><span>ready</span></div></article>';
}

function renderMiniApps() {
  const minimized = Object.keys(appState).filter(key => appState[key] === "minimized");
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
  if (command === "date") return new Date().toLocaleString("en-GB");
  if (command === "git status") return "On branch main · working tree clean";
  if (command === "pwd") return "/home/xef";
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
    try {
      localStorage.setItem("spatial-note-draft-v1", noteDraft);
    } catch {}
  }));
}

function prepareNoteSync() {
  const mainNote = $(".notes-layout textarea");
  try {
    noteDraft = localStorage.getItem("spatial-note-draft-v1") || mainNote.value;
  } catch {
    noteDraft = mainNote.value;
  }
  mainNote.value = noteDraft;
  mainNote.addEventListener("input", () => {
    noteDraft = mainNote.value;
    try {
      localStorage.setItem("spatial-note-draft-v1", noteDraft);
    } catch {}
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
  if (layoutMode !== "auto" || bypass) {
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

function bindWindowDrag(frame) {
  const titlebar = $(".app-titlebar", frame);
  titlebar.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button,input,a")) return;
    event.preventDefault();
    const name = frame.dataset.appFrame;
    bringToFront(name);
    if (frame.dataset.maximized === "true") toggleMaximize(name);

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
    titlebar.setPointerCapture(event.pointerId);
    frame.classList.add("is-dragging");
    frame.style.left = startRect.left + "px";
    frame.style.top = startRect.top + "px";
    frame.style.width = startRect.width + "px";
    frame.style.height = startRect.height + "px";

    const move = moveEvent => {
      const position = resistAreaBoundaries({
        left: moveEvent.clientX - offsetX,
        top: moveEvent.clientY - offsetY
      }, { width: startRect.width, height: startRect.height }, boundaryGate, moveEvent.altKey);
      frame.style.left = position.left + "px";
      frame.style.top = position.top + "px";
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
      titlebar.removeEventListener("pointermove", move);
      titlebar.removeEventListener("pointerup", finish);
      titlebar.removeEventListener("pointercancel", finish);
      setDropTarget(appsZone, false);
      setDropTarget(workspace, false);
      setAreaBoundaryFeedback(null);
      const parked = layoutMode === "manual" && pointInside(appsZone.getBoundingClientRect(), upEvent.clientX, upEvent.clientY);
      const finalRect = frame.getBoundingClientRect();
      frame.classList.remove("is-dragging");
      frame.style.position = "";
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
      const workspaceRect = workspace.getBoundingClientRect();
      applyGeometry(name, {
        x: finalRect.left - workspaceRect.left,
        y: finalRect.top - workspaceRect.top,
        width: finalRect.width,
        height: finalRect.height
      });
      if (layoutMode === "auto") scheduleSpatialAutoLayout();
    };

    titlebar.addEventListener("pointermove", move);
    titlebar.addEventListener("pointerup", finish);
    titlebar.addEventListener("pointercancel", finish);
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
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const name = frame.dataset.appFrame;
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
      setDropTarget(workspace, pointInside(workspace.getBoundingClientRect(), moveEvent.clientX, moveEvent.clientY));
    };

    const finish = upEvent => {
      header.removeEventListener("pointermove", move);
      header.removeEventListener("pointerup", finish);
      header.removeEventListener("pointercancel", finish);
      const workspace = $(".workspace-zone");
      setDropTarget(workspace, false);
      if (ghost) ghost.remove();
      if (pointInside(workspace.getBoundingClientRect(), upEvent.clientX, upEvent.clientY)) {
        openApp(name, { x: upEvent.clientX, y: upEvent.clientY });
        showToast(appInfo[name].label + " restored to workspace");
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
      const fitted = clampGeometry(current);
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
      localStorage.setItem("spatial-zone-layout-v1", JSON.stringify(zoneLayout));
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
    const saved = JSON.parse(localStorage.getItem("spatial-zone-layout-v1") || "null");
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
const dockEdges = ["left", "right", "top", "bottom"];
const dockState = {
  projects: { edge: "left", order: 0 },
  apps: { edge: "right", order: 0 },
  systems: { edge: "right", order: 1 }
};
const dockSizes = { left: 310, right: 300, top: 250, bottom: 250 };
const dockSizeManual = { left: false, right: false, top: false, bottom: false };
let dockPreview;
const layoutModes = ["auto", "manual"];
let layoutMode = "auto";
let currentDisplayProfile = "desktop";
let lastDesktopPointerX = window.innerWidth / 2;
const autoWindowAvoidance = new Map();
const baseDockLaneRects = new Map();
const autoSpatialEdgeStates = new Map();
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

function areaLabel(name) {
  return name === "projects" ? "Project Space" : name === "apps" ? "Apps" : "System";
}

function dockGroup(edge, includeHidden = false) {
  return areaPriority
    .filter(name => dockState[name].edge === edge && (includeHidden || !areaFor(name)?.hidden))
    .sort((a, b) => dockState[a].order - dockState[b].order || areaPriority.indexOf(a) - areaPriority.indexOf(b));
}

function normalizeDockOrder(edge) {
  dockGroup(edge, true).forEach((name, order) => { dockState[name].order = order; });
}

function snapshotAreaLayout() {
  const hidden = Object.fromEntries(areaPriority.map(name => [name, Boolean(areaFor(name)?.hidden)]));
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
    localStorage.setItem("spatial-workspace-area-layouts-v1", JSON.stringify(workspaceAreaSessions));
  } catch {}
}

function saveAreaLayout() {
  workspaceAreaSessions[activeWorkspace] = snapshotAreaLayout();
  persistAreaSessions();
}

function applyAreaSession(workspaceName) {
  const source = workspaceAreaSessions[workspaceName] || defaultAreaSession || snapshotAreaLayout();
  const saved = JSON.parse(JSON.stringify(source));
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
  if (layoutModes.includes(saved.layoutMode)) layoutMode = saved.layoutMode;
  dockEdges.forEach(normalizeDockOrder);
  autoSpatialEdgeStates.clear();
  autoWindowAvoidance.clear();
  autoAvoidanceSource = null;
  layoutDockAreas(false, false);
  applyAutoAvoidance();
}

function captureVisibleWindowViewportRects() {
  const snapshot = new Map();
  if (!windowViewportLockReady || suspendWindowViewportLock) return snapshot;
  $$('[data-app-frame]').forEach(frame => {
    const name = frame.dataset.appFrame;
    if (frame.hidden || appState[name] !== "open" || frame.classList.contains("is-dragging") || frame.classList.contains("is-resizing")) return;
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
  if (layoutMode === "manual") {
    states = { projects: "expanded", apps: "expanded", systems: "expanded" };
    areaPriority.forEach(name => {
      const edge = dockState[name].edge;
      states[name] = areaStateForSize(edge, dockSizes[edge]);
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
  dockEdges.forEach(edge => {
    if (!dockSizeManual[edge] || layoutMode !== "manual") return;
    const state = areaStateForSize(edge, dockSizes[edge]);
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
  if (state === "rail") return 96;
  return name === "projects" ? 210 : 190;
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
  if (layoutMode === "manual") {
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
      row.classList.toggle("is-hidden", hidden);
      const detail = $("small", row);
      if (detail) detail.textContent = hidden ? "Closed" : layoutStateLabel(states[name]);
    }
  });
}

function syncLayoutModeUI(profile = currentDisplayProfile) {
  const modeLabel = layoutMode[0].toUpperCase() + layoutMode.slice(1);
  const profileLabel = profile === "dual" ? "Dual display" : profile === "ultrawide" ? "Ultrawide" : profile === "laptop" ? "Laptop" : "Desktop";
  const control = $("#layoutModeToggle");
  if (control) {
    $("span", control).textContent = "Areas: " + modeLabel;
    control.classList.toggle("is-active", layoutMode === "auto");
    control.setAttribute("aria-pressed", String(layoutMode === "auto"));
    control.title = layoutMode === "auto"
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
  if (layoutMode !== "auto") return;
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
  if (layoutMode !== "auto") return edges;
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
  if (layoutMode !== "auto") return;
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

function layoutDockAreas(save = false, fitWindows = true) {
  const shell = $(".desktop-shell");
  const width = shell.clientWidth;
  const height = shell.clientHeight;
  const gap = 0;
  const resolved = resolvedAreaLayout(width, height);
  const effectiveSizes = resolved.sizes;
  currentDisplayProfile = resolved.profile;
  document.body.dataset.displayProfile = resolved.profile;
  document.body.dataset.layoutMode = layoutMode;
  areaPriority.forEach(name => {
    const area = areaFor(name);
    if (!area) return;
    const state = resolved.states[name];
    area.dataset.areaState = state;
    if (layoutMode === "auto") area.dataset.autoSize = state;
    else delete area.dataset.autoSize;
  });
  syncAreaControls(resolved.states);
  syncLayoutModeUI(resolved.profile);

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
    names.forEach((name, index) => applyDockRect(name, { x, y: gap + index * (panelHeight + gap), width: sideWidth, height: panelHeight }));
  };
  const layoutHorizontal = (names, edge, y, panelHeight) => {
    if (!names.length) return;
    const availableWidth = centerWidth - gap * (names.length - 1);
    const panelWidth = availableWidth / names.length;
    names.forEach((name, index) => applyDockRect(name, { x: centerLeft + index * (panelWidth + gap), y, width: panelWidth, height: panelHeight }));
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
  captureBaseDockLaneRects();
  applyAutoAvoidance();
  document.body.classList.add("areas-docked");
  document.body.classList.remove("areas-freeform", "areas-auto");
  if (layoutMode === "auto" && fitWindows && !windowViewportLockReady) scheduleWindowFit();
  if (save) saveAreaLayout();
}

function hideArea(name) {
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
  const previousEdge = dockState[name].edge;
  dockState[name].edge = edge;
  normalizeDockOrder(previousEdge);
  const peers = dockGroup(edge, true).filter(item => item !== name);
  const index = insertion === null ? peers.length : Math.max(0, Math.min(insertion, peers.length));
  peers.splice(index, 0, name);
  peers.forEach((item, order) => { dockState[item].order = order; });
  autoSpatialEdgeStates.clear();
  layoutDockAreas(true);
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
    event.preventDefault();
    event.stopPropagation();
    const shellRect = $(".desktop-shell").getBoundingClientRect();
    dockSizeManual[dockState[name].edge] = true;
    handle.setPointerCapture(event.pointerId);
    area.classList.add("is-area-resizing");
    const move = moveEvent => {
      const edge = dockState[name].edge;
      if (edge === "left") dockSizes.left = moveEvent.clientX - shellRect.left;
      if (edge === "right") dockSizes.right = shellRect.right - moveEvent.clientX;
      if (edge === "top") dockSizes.top = moveEvent.clientY - shellRect.top;
      if (edge === "bottom") dockSizes.bottom = shellRect.bottom - moveEvent.clientY;
      layoutDockAreas(false);
    };
    const finish = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      area.classList.remove("is-area-resizing");
      saveAreaLayout();
      if (layoutMode === "auto") scheduleSpatialAutoLayout();
      showToast(areaLabel(name) + " · " + layoutStateLabel(area.dataset.areaState));
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function prepareAreaWindows() {
  let saved = null;
  try {
    const sessions = JSON.parse(localStorage.getItem("spatial-workspace-area-layouts-v1") || "{}");
    Object.entries(sessions).forEach(([name, session]) => { workspaceAreaSessions[name] = session; });
    saved = workspaceAreaSessions[activeWorkspace] || null;
    if (!saved && activeWorkspace === "general") saved = JSON.parse(localStorage.getItem("spatial-dock-layout-v2") || "null");
  } catch {}
  if (saved?.state) areaPriority.forEach(name => {
    if (dockEdges.includes(saved.state[name]?.edge)) dockState[name] = { edge: saved.state[name].edge, order: Number(saved.state[name].order) || 0 };
  });
  if (saved?.sizes) dockEdges.forEach(edge => { if (Number.isFinite(saved.sizes[edge])) dockSizes[edge] = saved.sizes[edge]; });
  if (saved?.hidden) areaPriority.forEach(name => { if (areaFor(name)) areaFor(name).hidden = Boolean(saved.hidden[name]); });
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
    layoutMode = "auto";
    autoSpatialEdgeStates.clear();
    clearAllAutoAvoidance();
    try { localStorage.setItem("spatial-layout-mode-v1", layoutMode); } catch {}
    layoutDockAreas(true);
    showToast("Desktop Areas restored to Auto");
  });
  $$('[data-area-auto]').forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const name = button.closest('[data-area-window]').dataset.areaWindow;
    const current = dockEdges.indexOf(dockState[name].edge);
    setDockPosition(name, dockEdges[(current + 1) % dockEdges.length]);
  }));
  dockEdges.forEach(normalizeDockOrder);
  try {
    const savedMode = localStorage.getItem("spatial-layout-mode-v1");
    if (!saved?.layoutMode && layoutModes.includes(savedMode)) layoutMode = savedMode;
  } catch {}
  if (layoutModes.includes(saved?.layoutMode)) layoutMode = saved.layoutMode;
  const layoutControl = $("#layoutModeToggle");
  if (layoutControl) layoutControl.addEventListener("click", () => {
    const nextMode = layoutModes[(layoutModes.indexOf(layoutMode) + 1) % layoutModes.length];
    if (nextMode === "manual") freezeCurrentAreaLayout();
    layoutMode = nextMode;
    if (layoutMode === "manual") {
      autoSpatialEdgeStates.clear();
      clearAllAutoAvoidance();
    } else {
      autoSpatialEdgeStates.clear();
    }
    try { localStorage.setItem("spatial-layout-mode-v1", layoutMode); } catch {}
    layoutDockAreas(false);
    saveAreaLayout();
    if (layoutMode === "auto") scheduleSpatialAutoLayout();
    showToast(layoutMode === "auto" ? "Auto Areas · windows can claim dock space" : "Manual Areas · geometry locked");
  });
  layoutDockAreas(false);
  workspaceAreaSessions[activeWorkspace] = snapshotAreaLayout();
  defaultAreaSession = JSON.parse(JSON.stringify(workspaceAreaSessions.general || workspaceAreaSessions[activeWorkspace]));
  persistAreaSessions();
}

const projectSpaces = {
  plasma: {
    name: "Plasma Redesign",
    accent: "#5cbcff",
    root: "~/Projects/plasma-redesign",
    files: [["desktop-shell.css", "Modified 8 min ago", "document"], ["interaction-notes.md", "Modified today", "document"]],
    note: "Keep the interaction physical, but let the content stay quiet and readable.",
    resources: [["keyboard-reference.mp4", "Linked · ~/Videos", "video", "i-video"], ["Ocean design", "Web reference", "web", "i-web"]],
    keepWindows: true
  },
  retold: {
    name: "Retold",
    accent: "#65d881",
    root: "~/Projects/retold-mod",
    files: [["src/main/java", "Gameplay sources", "folder"], ["gradle.properties", "Modified yesterday", "document"]],
    note: "Test the new movement controller, then record the climbing animation bug.",
    resources: [["v0.3 test recording.mp4", "Linked · ~/Videos/Captures", "video", "i-video"], ["Fabric documentation", "Web reference", "web", "i-web"]],
    keepWindows: true
  }
};

let activeProjectName = "plasma";
let projectNoteSaveTimer;
const projectWindowSessions = {};

function projectSessionKey(name) {
  return activeWorkspace + ":" + name;
}

function persistProjectState() {
  try {
    const content = Object.fromEntries(Object.entries(projectSpaces).map(([name, project]) => [name, {
      note: project.note,
      resources: project.resources,
      keepWindows: project.keepWindows
    }]));
    localStorage.setItem("spatial-project-content-v1", JSON.stringify(content));
    localStorage.setItem("spatial-project-window-sessions-v1", JSON.stringify(projectWindowSessions));
  } catch {}
}

function loadProjectState() {
  try {
    const content = JSON.parse(localStorage.getItem("spatial-project-content-v1") || "{}");
    Object.entries(content).forEach(([name, saved]) => {
      if (!projectSpaces[name] || !saved) return;
      if (typeof saved.note === "string") projectSpaces[name].note = saved.note;
      if (Array.isArray(saved.resources)) projectSpaces[name].resources = saved.resources;
      if (typeof saved.keepWindows === "boolean") projectSpaces[name].keepWindows = saved.keepWindows;
    });
    Object.assign(projectWindowSessions, JSON.parse(localStorage.getItem("spatial-project-window-sessions-v1") || "{}"));
  } catch {}
}

function resourceMarkup([label, detail, type = "web", itemIcon = "i-link"]) {
  return '<button data-project-item="' + escapeHtml(label) + '"><span class="linked-type ' + escapeHtml(type) + '">' + icon(itemIcon) + '</span><span><b>' + escapeHtml(label) + '</b><small>' + escapeHtml(detail) + '</small></span><i class="link-badge">' + icon("i-link") + '</i></button>';
}

function projectSession(name) {
  return projectWindowSessions[projectSessionKey(name)] || null;
}

function sessionAge(savedAt) {
  const minutes = Math.max(0, Math.round((Date.now() - Number(savedAt || 0)) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + " min ago";
  return Math.round(minutes / 60) + " h ago";
}

function refreshProjectSessionUi(name = activeProjectName) {
  const project = name ? projectSpaces[name] : null;
  const session = name ? projectSession(name) : null;
  const count = session?.apps?.length || 0;
  const toggle = $("#projectSessionToggle");
  if (toggle && project) {
    toggle.classList.toggle("is-active", project.keepWindows);
    toggle.setAttribute("aria-pressed", String(project.keepWindows));
    $("#projectSessionSummary").textContent = count
      ? count + (count === 1 ? " window saved · " : " windows saved · ") + sessionAge(session.savedAt)
      : project.keepWindows ? "Close or switch to park open windows here" : "Windows stay on the desktop when this closes";
  }
  $$('[data-project-select]').forEach(choice => {
    const choiceSession = projectSession(choice.dataset.projectSelect);
    const choiceCount = choiceSession?.apps?.length || 0;
    choice.dataset.savedWindows = String(choiceCount);
    choice.title = projectSpaces[choice.dataset.projectSelect].name + (choiceCount ? " · " + choiceCount + " saved window" + (choiceCount === 1 ? "" : "s") : "");
  });
}

function setProjectClosedState(closed) {
  $("#projectSpaceContent").hidden = closed;
  $("#projectSessionBar").hidden = closed;
  $("#projectClosedState").hidden = !closed;
  $("#closeProjectButton").disabled = closed;
  $$(".project-pack-key").forEach(button => { button.disabled = closed; });
  if (closed) {
    $("#projectAreaName").textContent = "Projects";
    $$('[data-project-select]').forEach(choice => {
      choice.classList.remove("is-active");
      choice.setAttribute("aria-pressed", "false");
    });
  }
}

function renderProjectSpace(name) {
  const project = projectSpaces[name];
  const area = areaFor("projects");
  if (!project || !area) return;
  activeProjectName = name;
  area.style.setProperty("--project-accent", project.accent);
  $("#projectAreaName").textContent = project.name;
  $("#projectRootPath").textContent = project.root;
  $("#projectRootItems").innerHTML = project.files.map(([label, detail, type]) => '<button data-project-item="' + escapeHtml(label) + '">' + (type === "folder" ? '<span class="linked-type web">' + icon("i-folder") + '</span>' : '<i class="document-glyph"></i>') + '<span><b>' + escapeHtml(label) + '</b><small>' + escapeHtml(detail) + '</small></span></button>').join("");
  $("#projectQuickNote").value = project.note || "";
  $("#projectNoteState").textContent = "Saved";
  $("#projectLinkedItems").innerHTML = project.resources.map(resourceMarkup).join("");
  $("#projectResourceCount").textContent = project.resources.length + (project.resources.length === 1 ? " linked" : " linked");
  setProjectClosedState(false);
  refreshProjectSessionUi(name);
  $$("[data-overview-project]").forEach(card => {
    const selected = card.dataset.overviewProject === name;
    card.classList.toggle("is-active", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
  applyAppPrimaryColors(area);
}

function activateProject(name, announce = true) {
  const project = projectSpaces[name];
  if (!project) return;
  if (activeProjectName && activeProjectName !== name && projectSpaces[activeProjectName].keepWindows) {
    parkProjectWindows(activeProjectName, false);
  }
  $$('[data-project-select]').forEach(choice => {
    const selected = choice.dataset.projectSelect === name;
    choice.classList.toggle("is-active", selected);
    choice.setAttribute("aria-pressed", String(selected));
  });
  renderProjectSpace(name);
  const restored = restoreProjectWindows(name, false);
  if (announce) showToast(project.name + (restored ? " opened · " + restored + " saved window" + (restored === 1 ? " restored" : "s restored") : " project opened"));
}

function parkProjectWindows(name, announce = true) {
  const project = projectSpaces[name];
  if (!project) return 0;
  const names = Object.keys(appState).filter(appName => appState[appName] === "open");
  const geometry = {};
  names.forEach(appName => {
    const frame = frameFor(appName);
    geometry[appName] = frame?.dataset.maximized === "true"
      ? maximizeRestore.get(appName) || windowGeometry.get(appName) || readGeometry(frame)
      : readGeometry(frame);
    windowGeometry.set(appName, geometry[appName]);
    appState[appName] = "closed";
    clearWindowAutoAvoidance?.(appName);
  });
  projectWindowSessions[projectSessionKey(name)] = { apps: names, geometry, savedAt: Date.now() };
  frontApp = topOpenApp();
  syncApps();
  saveLayout();
  persistProjectState();
  refreshProjectSessionUi(name);
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
  if (announce) showToast(project.name + " saved · " + names.length + " window" + (names.length === 1 ? "" : "s") + " parked");
  return names.length;
}

function restoreProjectWindows(name, announce = true) {
  const session = projectSession(name);
  if (!session?.apps?.length) return 0;
  session.apps.forEach(appName => {
    if (!appInfo[appName]) return;
    appState[appName] = "open";
    if (session.geometry?.[appName]) windowGeometry.set(appName, session.geometry[appName]);
  });
  syncApps();
  session.apps.forEach(appName => {
    if (appState[appName] === "open" && windowGeometry.has(appName)) applyGeometry(appName, windowGeometry.get(appName), false);
  });
  frontApp = session.apps.at(-1) || frontApp;
  if (frontApp) bringToFront(frontApp);
  delete projectWindowSessions[projectSessionKey(name)];
  persistProjectState();
  refreshProjectSessionUi(name);
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
  if (announce) showToast(session.apps.length + " saved window" + (session.apps.length === 1 ? " restored" : "s restored"));
  return session.apps.length;
}

function closeActiveProject() {
  if (!activeProjectName) return;
  const name = activeProjectName;
  const project = projectSpaces[name];
  const parked = project.keepWindows ? parkProjectWindows(name, false) : 0;
  activeProjectName = null;
  setProjectClosedState(true);
  showToast(project.name + " closed" + (project.keepWindows ? " · " + parked + " window" + (parked === 1 ? " saved" : "s saved") : ""));
}

function addProjectResource(value) {
  if (!activeProjectName) return;
  const raw = value.trim();
  if (!raw) return;
  let label = raw;
  let detail = "Linked resource";
  let type = "web";
  let itemIcon = "i-link";
  try {
    const url = new URL(raw.includes("://") ? raw : "https://" + raw);
    label = url.hostname.replace(/^www\./, "") + (url.pathname !== "/" ? url.pathname.replace(/\/$/, "") : "");
    detail = "Web resource · " + url.hostname;
    itemIcon = "i-web";
  } catch {
    const pieces = raw.split(/[\\/]/);
    label = pieces.at(-1) || raw;
    detail = "Linked · " + raw;
    type = /\.(mp4|webm|mov)$/i.test(raw) ? "video" : "web";
    itemIcon = type === "video" ? "i-video" : "i-folder";
  }
  projectSpaces[activeProjectName].resources.unshift([label, detail, type, itemIcon]);
  persistProjectState();
  renderProjectSpace(activeProjectName);
  showToast(label + " added to " + projectSpaces[activeProjectName].name);
}

function prepareProjectSpaces() {
  loadProjectState();
  $$('[data-project-select]').forEach(button => button.addEventListener("click", () => activateProject(button.dataset.projectSelect)));
  $$("[data-overview-project]").forEach(button => button.addEventListener("click", () => {
    activateProject(button.dataset.overviewProject);
    showArea("projects");
    setUniversalSearchOpen(false);
  }));
  $(".project-area").addEventListener("click", event => {
    const item = event.target.closest("[data-project-item]");
    if (item) showToast("Opening " + item.dataset.projectItem);
  });
  $("#projectSessionToggle").addEventListener("click", () => {
    if (!activeProjectName) return;
    const project = projectSpaces[activeProjectName];
    project.keepWindows = !project.keepWindows;
    persistProjectState();
    refreshProjectSessionUi();
    showToast(project.keepWindows ? "Project windows will be saved on close" : "Project windows will stay on the desktop");
  });
  $("#projectCloseAction").addEventListener("click", closeActiveProject);
  $("#closeProjectButton").addEventListener("click", closeActiveProject);
  $("#projectQuickNote").addEventListener("input", event => {
    if (!activeProjectName) return;
    projectSpaces[activeProjectName].note = event.target.value;
    $("#projectNoteState").textContent = "Saving…";
    clearTimeout(projectNoteSaveTimer);
    projectNoteSaveTimer = setTimeout(() => {
      persistProjectState();
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
    if (!activeProjectName) activateProject("plasma", false);
    requestAnimationFrame(() => $("#projectQuickNote").focus());
  });
  $("#projectRailResource").addEventListener("click", () => {
    showArea("projects");
    if (!activeProjectName) activateProject("plasma", false);
    requestAnimationFrame(() => $("#projectResourceInput").focus());
  });
  $("#projectRailSession").addEventListener("click", () => {
    if (!activeProjectName) activateProject("plasma");
    else if (!restoreProjectWindows(activeProjectName)) showToast("No saved windows for this project");
  });
  renderProjectSpace("plasma");
}

const workspaceProfiles = {
  general: {
    label: "General", subtitle: "Personal desktop", icon: "i-grid", accent: "#56baff", home: "/home/xef",
    context: "Everyday desktop", meta: "5 favourite apps · 2 open projects · private clipboard",
    folders: [["Desktop", "8 items"], ["Documents", "124 items"], ["Downloads", "31 items"], ["Pictures", "480 items"]],
    rack: ["dolphin", "elisa", "browser", "terminal", "notes"],
    favorites: [["dolphin", "Dolphin"], ["browser", "Firefox"], ["elisa", "Elisa"], ["notes", "Notes"], ["i-mail", "Thunderbird"]],
    agenda: ["Today", "Retold test pass", "14:30 · 45 min"]
  },
  school: {
    label: "School", subtitle: "Classes and study", icon: "i-graduation", accent: "#f2b646", home: "/home/xef/Workspaces/School",
    context: "Study session", meta: "4 favourite apps · 1 open project · school clipboard",
    folders: [["Desktop", "4 items"], ["Documents", "6 courses"], ["Downloads", "12 items"], ["Assignments", "3 due"]],
    rack: ["browser", "dolphin", "notes"],
    favorites: [["browser", "Firefox"], ["i-office", "Writer"], ["i-calendar", "Kalendar"], ["i-note", "Okular"], ["dolphin", "Dolphin"]],
    agenda: ["School", "Physics assignment", "Due tomorrow · 16:00"]
  },
  work: {
    label: "Work", subtitle: "Focused session", icon: "i-office", accent: "#8d85ff", home: "/home/xef/Workspaces/Work",
    context: "Product work", meta: "5 favourite apps · 1 open project · work clipboard",
    folders: [["Desktop", "3 items"], ["Documents", "42 items"], ["Downloads", "7 items"], ["Shared", "18 items"]],
    rack: ["terminal", "browser", "dolphin", "notes"],
    favorites: [["terminal", "Konsole"], ["i-code", "Kate"], ["browser", "Firefox"], ["dolphin", "Dolphin"], ["i-mail", "Mail"]],
    agenda: ["Work", "Design review", "15:15 · 30 min"]
  },
  gaming: {
    label: "Gaming", subtitle: "Games and friends", icon: "i-gamepad", accent: "#61d982", home: "/home/xef/Workspaces/Gaming",
    context: "Game night", meta: "4 favourite apps · 1 open project · gaming clipboard",
    folders: [["Desktop", "6 shortcuts"], ["Games", "23 installed"], ["Captures", "64 videos"], ["Mods", "11 profiles"]],
    rack: ["elisa", "browser", "dolphin", "terminal"],
    favorites: [["i-gamepad", "Steam"], ["i-gamepad", "Lutris"], ["i-web", "Discord"], ["i-monitor", "MangoHud"], ["dolphin", "Dolphin"]],
    agenda: ["Gaming", "Co-op with Martin", "20:00 · voice chat"]
  }
};

let activeWorkspace = (() => {
  try { return localStorage.getItem("spatial-active-workspace") || "general"; }
  catch { return "general"; }
})();
const workspaceAppStates = {
  general: { dolphin: "open", elisa: "open", browser: "closed", terminal: "closed", notes: "closed" },
  school: { dolphin: "open", elisa: "closed", browser: "open", terminal: "closed", notes: "minimized" },
  work: { dolphin: "minimized", elisa: "closed", browser: "open", terminal: "open", notes: "closed" },
  gaming: { dolphin: "closed", elisa: "open", browser: "minimized", terminal: "closed", notes: "closed" }
};

function persistWorkspaceAppStates() {
  if (!workspaceProfiles[activeWorkspace]) return;
  workspaceAppStates[activeWorkspace] = { ...appState };
  try { localStorage.setItem("spatial-workspace-app-states-v1", JSON.stringify(workspaceAppStates)); } catch {}
}

function captureCurrentWorkspaceSession() {
  if (!workspaceProfiles[activeWorkspace]) return;
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
  const openNames = Object.keys(appState).filter(name => appState[name] === "open");
  $("#workspaceOpenCount").textContent = openNames.length + (openNames.length === 1 ? " active" : " active");
  target.innerHTML = openNames.map(name => {
    const info = appInfo[name];
    const preview = name === "elisa"
      ? '<span class="overview-window-preview music-preview"><i></i><b>1:55</b><span></span></span>'
      : '<span class="overview-window-preview file-preview"><i></i><i></i><i></i></span>';
    return '<button class="overview-window ' + (name === "elisa" ? "elisa" : "") + '" data-overview-open-app="' + name + '" style="--overview-app:' + info.primary + '"><span class="overview-window-app">' + appArt(name) + '<span><b>' + escapeHtml(info.label) + '</b><small>' + escapeHtml(info.detail) + '</small></span></span>' + preview + '</button>';
  }).join("") || '<div class="workspace-no-windows"><b>No open windows</b><small>This Workspace will remember new windows you open.</small></div>';
}

function renderWorkspace(name, announce = true) {
  const profile = workspaceProfiles[name];
  if (!profile) return;
  if (name !== activeWorkspace) captureCurrentWorkspaceSession();
  activeWorkspace = name;
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
  });
  $("#activeWorkspaceLabel").textContent = profile.label;
  $("#workspaceHomeTitle").textContent = profile.label + " Home";
  $("#workspaceHomePath").textContent = profile.home;
  $("#workspaceHomeIcon use").setAttribute("href", "#" + profile.icon);
  $("#workspaceContextTitle").textContent = profile.context;
  $("#workspaceContextMeta").textContent = profile.meta;
  $("#workspaceFolders").innerHTML = profile.folders.map(([label, detail]) => '<button class="workspace-folder" data-toast="' + escapeHtml(label) + ' opened"><span>' + icon("i-folder") + '</span><span><b>' + escapeHtml(label) + '</b><small>' + escapeHtml(detail) + '</small></span></button>').join("");
  $("#workspaceFavorites").innerHTML = profile.favorites.map(workspaceFavoriteMarkup).join("");
  $("#workspaceAgendaHeading").textContent = profile.agenda[0];
  $("#workspaceAgendaTitle").textContent = profile.agenda[1];
  $("#workspaceAgendaMeta").textContent = profile.agenda[2];
  $("#systemAgendaTitle").textContent = profile.agenda[1];
  $("#systemAgendaMeta").textContent = profile.agenda[2];
  $("#appsAreaContext").textContent = profile.label + " workspace";
  $("#systemAreaContext").textContent = profile.label + " workspace";
  $("#dolphinContext").textContent = profile.label + " · Downloads";
  $(".address-bar input").value = profile.home + "/Downloads";
  $("#appRack").innerHTML = profile.rack.map(appName => {
    const info = appInfo[appName];
    const state = appState[appName];
    return '<button class="app-key ' + (state !== "closed" ? "is-open " : "") + (state === "open" && appName === frontApp ? "is-active" : "") + '" data-open-app="' + appName + '" aria-label="' + escapeHtml(info.label) + '" title="' + escapeHtml(info.label) + '">' + appArt(appName) + '<span>' + escapeHtml(info.label) + '</span><i></i></button>';
  }).join("");
  applyAppPrimaryColors($("#appRack"));
  prepareControlSemantics($("#appRack"));
  syncApps();
  if (activeProjectName) refreshProjectSessionUi(activeProjectName);
  const status = $("#workspaceStatus");
  $("b", status).textContent = profile.label;
  $("small", status).textContent = profile.subtitle;
  $("#workspaceRailGlyph").textContent = profile.label.slice(0, 1).toUpperCase();
  status.title = profile.label + " workspace";
  try { localStorage.setItem("spatial-active-workspace", name); } catch {}
  persistWorkspaceAppStates();
  requestAnimationFrame(() => {
    restoreWorkspaceWindowLayout();
    if (frontApp) bringToFront(frontApp);
    if (layoutMode === "auto") scheduleSpatialAutoLayout();
  });
  if (announce) showToast(profile.label + " workspace loaded");
}

function prepareWorkspaces() {
  if (!workspaceProfiles[activeWorkspace]) activeWorkspace = "general";
  try {
    const savedStates = JSON.parse(localStorage.getItem("spatial-workspace-app-states-v1") || "{}");
    Object.entries(savedStates).forEach(([name, states]) => {
      if (!workspaceProfiles[name] || !states) return;
      workspaceAppStates[name] = { ...workspaceAppStates[name], ...states };
    });
  } catch {}
  $$("[data-workspace]").forEach(button => button.addEventListener("click", () => renderWorkspace(button.dataset.workspace)));
  $("#workspaceStatus").addEventListener("click", () => setUniversalSearchOpen(true));
  $("#overviewWindowGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-overview-open-app]");
    if (button) { openApp(button.dataset.overviewOpenApp); setUniversalSearchOpen(false); }
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
    ["i-folder", "Selected projects", "References to Plasma Redesign and Retold", "2 links", true],
    ["i-archive", "App requirements", "Package names and suggested versions", "33 apps", true],
    ["i-monitor", "Window session", "Open apps, positions and view state", "optional", packageMode === "handoff"]
  ];
  const projectRows = [
    ["i-folder", "Project folder", "Files under the project root", "274 MB", true],
    ["i-link", "Linked resources", "Portable copies or safe relative references", "2 links", true],
    ["i-note", "Notes and widgets", "Project notes and selected widget state", "84 KB", true],
    ["i-grid", "Quick launch apps", "App requirements, commands and roles", "4 apps", true],
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
  $("#importWorkspace").addEventListener("click", () => { closePackageDialog(); showToast("Game Development workspace imported · preview"); });
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

function prepareWindows() {
  $$("[data-app-frame]").forEach(frame => {
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
  });

  $$("[data-window-action]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const name = button.closest("[data-app-frame]").dataset.appFrame;
    if (button.dataset.windowAction === "minimize") minimizeApp(name);
    if (button.dataset.windowAction === "maximize") toggleMaximize(name);
    if (button.dataset.windowAction === "close") closeApp(name);
  }));
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
  openApp(button.dataset.openApp);
  if (button.closest("#universalSearch")) setUniversalSearchOpen(false);
});

$$("[data-launch-app]").forEach(button => button.addEventListener("click", () => {
  pulseBusyCursor();
  showToast(button.dataset.launchApp + " launched");
  if (button.closest("#universalSearch")) setUniversalSearchOpen(false);
}));

let activeLauncherCategory = "all";

function filterLauncher() {
  let visible = 0;
  $$(".launcher-app", $("#allAppsGrid")).forEach(button => {
    const matchesCategory = activeLauncherCategory === "all" ||
      (activeLauncherCategory === "favorites" && button.dataset.favorite === "true") ||
      button.dataset.category === activeLauncherCategory;
    button.hidden = !matchesCategory;
    if (!button.hidden) visible += 1;
  });
  $("#allAppsCount").textContent = visible + (visible === 1 ? " app" : " apps");
  $("#allAppsEmpty").hidden = visible !== 0;
}

$$("[data-category-filter]").forEach(button => button.addEventListener("click", () => {
  activeLauncherCategory = button.dataset.categoryFilter;
  $$("[data-category-filter]").forEach(choice => {
    const selected = choice === button;
    choice.classList.toggle("is-active", selected);
    choice.setAttribute("aria-pressed", String(selected));
  });
  $("#allAppsTitle").textContent = button.textContent.trim();
  filterLauncher();
}));

filterLauncher();

let universalLastFocus = null;

function buildUniversalAppResults(query) {
  const target = $("#universalAppResults");
  const matches = $$(".launcher-app", $("#allAppsGrid")).filter(button => {
    const searchable = `${button.textContent} ${button.dataset.category || ""}`.toLowerCase();
    return searchable.includes(query);
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

function filterUniversalSearch() {
  const rawQuery = $("#universalSearchInput").value.trim();
  const query = rawQuery.toLowerCase();
  const searching = query.length > 0;
  $("#overviewHome").hidden = searching;
  $("#universalResults").hidden = !searching;

  if (!searching) {
    $("#universalWebLabel").textContent = "Search the web";
    return;
  }

  let localVisible = buildUniversalAppResults(query);

  $$(".universal-result", $("#universalResults")).filter(result => !result.closest("#universalAppResults")).forEach(result => {
    const group = result.closest("[data-universal-group]").dataset.universalGroup;
    const isWeb = group === "web";
    const searchable = (result.dataset.universalSearch || result.textContent).toLowerCase();
    const matchesQuery = isWeb || searchable.includes(query);
    result.hidden = !matchesQuery;
    if (!result.hidden && !isWeb) localVisible += 1;
  });

  $$(".universal-group", $("#universalResults")).forEach(group => {
    group.hidden = !$(".universal-result:not([hidden])", group);
  });

  $("#universalWebLabel").textContent = `Search the web for “${rawQuery}”`;
  $("#universalEmpty").hidden = localVisible !== 0;
}

function setUniversalSearchOpen(open) {
  const overlay = $("#universalSearch");
  if (open === overlay.classList.contains("is-open")) return;
  if (open) universalLastFocus = document.activeElement;
  overlay.classList.toggle("is-open", open);
  overlay.inert = !open;
  overlay.setAttribute("aria-hidden", String(!open));
  $(".desktop-shell").inert = open;
  document.body.classList.toggle("universal-search-open", open);

  if (open) {
    if (currentDisplayProfile === "dual") overlay.dataset.monitor = lastDesktopPointerX < window.innerWidth / 2 ? "left" : "right";
    else delete overlay.dataset.monitor;
    $("#universalSearchInput").value = "";
    $("#allAppsToggle").classList.add("is-active");
    $("#allAppsToggle").setAttribute("aria-expanded", "true");
    $("#allAppsToggle").setAttribute("aria-pressed", "true");
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
    pulseBusyCursor();
    showToast(result.dataset.searchLaunchApp + " launched");
  }
  setUniversalSearchOpen(false);
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

  [desktop, $("#universalSearch"), $("#packageDialog")].filter(Boolean).forEach(surface => {
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

document.addEventListener("keydown", event => {
  const packageDialog = $("#packageDialog");
  const universalSearch = $("#universalSearch");
  if (packageDialog.classList.contains("is-open") && trapDialogFocus(packageDialog, event)) return;
  if (universalSearch.classList.contains("is-open") && trapDialogFocus(universalSearch, event)) return;

  const isSuper = event.key === "Meta" || event.key === "OS";
  if (isSuper && !event.repeat) {
    superKeyAlone = true;
    return;
  }
  if (event.metaKey && !isSuper) superKeyAlone = false;

  if (event.key === "Escape" && $("#packageDialog").classList.contains("is-open")) {
    event.preventDefault();
    event.stopPropagation();
    closePackageDialog();
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

  if ($("#universalSearch").classList.contains("is-open") && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
    event.preventDefault();
    const results = $$(".universal-result:not([hidden])", $("#universalResults"));
    if (!results.length) return;
    const current = results.indexOf(document.activeElement);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const next = current === -1 ? (direction > 0 ? 0 : results.length - 1) : (current + direction + results.length) % results.length;
    results[next].focus();
  }

  if ($("#universalSearch").classList.contains("is-open") && event.key === "Enter" && document.activeElement === $("#universalSearchInput")) {
    const first = $(".universal-result:not([hidden])", $("#universalResults"));
    if (first) {
      event.preventDefault();
      first.click();
    }
  }
});

document.addEventListener("keyup", event => {
  const isSuper = event.key === "Meta" || event.key === "OS";
  if (isSuper && superKeyAlone) {
    event.preventDefault();
    setUniversalSearchOpen(!$("#universalSearch").classList.contains("is-open"));
  }
  if (isSuper) superKeyAlone = false;
});
window.addEventListener("blur", () => { superKeyAlone = false; });

$$("[data-toast]").forEach(button => button.addEventListener("click", () => showToast(button.dataset.toast)));
$$("[data-toggle]").forEach(button => button.addEventListener("click", () => {
  button.classList.toggle("is-active");
  button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
}));

const themes = ["oled", "graphite", "light"];
$("#themeToggle").addEventListener("click", () => {
  const next = themes[(themes.indexOf(document.body.dataset.theme) + 1) % themes.length];
  document.body.dataset.theme = next;
  showToast(next[0].toUpperCase() + next.slice(1) + " surface");
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
  $("#timerProgress").style.width = 100 - focusSeconds / (25 * 60) * 100 + "%";
  $("#timerState").textContent = focusRunning ? "Running" : focusSeconds === 25 * 60 ? "Ready" : "Paused";
  $("#timerToggle").textContent = focusRunning ? "Pause" : "Start";
  $("#timerToggle").setAttribute("aria-pressed", String(focusRunning));
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

function addNotification(title, detail, tone = "blue", glyph = "i-bell") {
  const item = document.createElement("article");
  item.className = "notification";
  item.innerHTML = '<span class="app-badge ' + tone + '">' + icon(glyph) + '</span><div><b>' + escapeHtml(title) + '</b><small>' + escapeHtml(detail) + '</small></div><button class="dismiss-button" aria-label="Dismiss">×</button>';
  $("#notificationList").prepend(item);
  syncNotifications();
}

function syncNotifications() {
  const count = $$(".notification", $("#notificationList")).length;
  $("#notificationCount").textContent = count;
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
      showToast("Focus timer finished");
      addNotification("Focus timer finished", "25 minute session completed", "blue", "i-timer");
      concealDynamicWidget($("#timerWidget"));
    }
    updateTimer();
  }, 1000);
  updateTimer();
}

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

$("#terminalInput").addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  const value = event.target.value.trim();
  if (!value) return;
  const line = document.createElement("p");
  line.className = "terminal-output";
  line.textContent = value === "help" ? "Try: clear, date, echo hello" : value === "date" ? new Date().toString() : "command not found: " + value;
  event.target.closest("label").before(line);
  if (value === "clear") $$(".terminal-screen > p").forEach(item => item.remove());
  event.target.value = "";
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

  const projectChoice = target.closest("[data-project-select]");
  if (projectChoice) {
    const name = projectChoice.dataset.projectSelect;
    return { kind: "project", name, title: projectSpaces[name]?.name || "Project" };
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
      { action: "app-open", icon: state === "open" ? "i-right" : "i-play", label: state === "open" ? "Focus" : state === "minimized" ? "Restore" : "Open" },
      state === "open" ? { action: "app-minimize", icon: "i-min", label: "Minimize to Apps Area" } : null,
      state === "open" ? { action: "app-maximize", icon: "i-max", label: maximized ? "Restore window" : "Maximize" } : null,
      state !== "closed" ? separator : null,
      state !== "closed" ? { action: "app-close", icon: "i-close", label: "Close", danger: true } : null
    ].filter(Boolean);
  }
  if (context.kind === "desktop") return [
    { action: "desktop-overview", icon: "i-search", label: "Open Overview", shortcut: "Super" },
    separator,
    { action: "desktop-new-folder", icon: "i-folder", label: "New Folder" },
    { action: "desktop-paste", icon: "i-clipboard", label: "Paste" },
    separator,
    { action: "desktop-settings", icon: "i-monitor", label: "Display Settings" }
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
  if (context.kind === "project") return [
    { action: "project-open", icon: "i-folder", label: "Open Project Space" },
    { action: "project-pack", icon: "i-archive", label: "Pack project" }
  ];
  if (context.kind === "widget") {
    const entries = [{ action: "widget-open", icon: "i-right", label: "Open" }];
    if (context.element.id === "notificationWidget") entries.push({ action: "widget-clear", icon: "i-bell", label: "Clear notifications" });
    entries.push(separator, { action: "widget-hide", icon: "i-close", label: "Remove from System Area", danger: true });
    return entries;
  }
  if (context.kind === "area") return [
    { action: "area-move", icon: "i-grid", label: "Move to next edge" },
    { action: "area-reset", icon: "i-max", label: "Reset Area size" },
    separator,
    { action: "area-hide", icon: "i-min", label: "Hide Area", danger: true }
  ];
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
  const entries = contextMenuEntries(context);
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
  if (action === "app-open") openApp(context.name);
  if (action === "app-minimize") minimizeApp(context.name);
  if (action === "app-maximize") toggleMaximize(context.name);
  if (action === "app-close") closeApp(context.name);
  if (action === "desktop-overview") setUniversalSearchOpen(true);
  if (action === "desktop-new-folder") createDesktopFolder(context.point);
  if (action === "desktop-paste") showToast("Clipboard pasted to the desktop");
  if (action === "desktop-settings") showToast("Display Settings opened");
  if (action === "file-open") showToast("Opening " + context.label);
  if (action === "file-copy") showToast("Copied /home/xef/Downloads/" + context.label);
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
  if (action === "project-open") {
    activateProject(context.name);
    showArea("projects", false);
  }
  if (action === "project-pack") openPackageDialog("project");
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
const DESKTOP_SYNC_CHANNEL = "spatial-desktop-live-v1";
const DESKTOP_SYNC_STORAGE_KEY = "spatial-desktop-live-message-v1";
const desktopSyncSource = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
const desktopSyncChannel = "BroadcastChannel" in window ? new BroadcastChannel(DESKTOP_SYNC_CHANNEL) : null;
const desktopSyncPeers = new Map();
let desktopSyncApplying = false;
let desktopSyncTimer = 0;
let desktopSyncLastStamp = 0;
let desktopSyncAnnounced = false;

function cloneDesktopState(value) {
  return JSON.parse(JSON.stringify(value));
}

function readDesktopStorage(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return cloneDesktopState(fallback); }
}

function captureDesktopSyncState() {
  const workspaceStates = cloneDesktopState(workspaceAppStates);
  workspaceStates[activeWorkspace] = { ...appState };

  const areaSessions = cloneDesktopState(workspaceAreaSessions);
  areaSessions[activeWorkspace] = snapshotAreaLayout();

  const windowLayouts = readDesktopStorage("spatial-workspace-window-layouts-v1");
  windowLayouts[activeWorkspace] = Object.fromEntries(windowGeometry);

  const projects = Object.fromEntries(Object.entries(projectSpaces).map(([name, project]) => [name, {
    note: project.note,
    resources: cloneDesktopState(project.resources),
    keepWindows: project.keepWindows
  }]));

  return {
    schema: 1,
    theme: document.body.dataset.theme,
    activeWorkspace,
    workspaceStates,
    areaSessions,
    windowLayouts,
    frontApp,
    maximized: Object.fromEntries($$("[data-app-frame]").map(frame => [
      frame.dataset.appFrame,
      frame.dataset.maximized === "true"
    ])),
    activeProjectName,
    projects,
    projectWindowSessions: cloneDesktopState(projectWindowSessions),
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
  try {
    localStorage.setItem("spatial-workspace-app-states-v1", JSON.stringify(state.workspaceStates));
    localStorage.setItem("spatial-workspace-window-layouts-v1", JSON.stringify(state.windowLayouts));
    localStorage.setItem("spatial-workspace-area-layouts-v1", JSON.stringify(state.areaSessions));
    localStorage.setItem("spatial-project-content-v1", JSON.stringify(state.projects || {}));
    localStorage.setItem("spatial-project-window-sessions-v1", JSON.stringify(state.projectWindowSessions || {}));
    localStorage.setItem("spatial-note-draft-v1", state.noteDraft || "");
    localStorage.setItem("spatial-active-workspace", state.activeWorkspace);
  } catch {}
}

function applyDesktopSyncState(state) {
  if (!state || state.schema !== 1 || !workspaceProfiles[state.activeWorkspace]) return;
  desktopSyncApplying = true;
  try {
    Object.entries(state.workspaceStates || {}).forEach(([name, saved]) => {
      if (workspaceAppStates[name] && saved) workspaceAppStates[name] = { ...workspaceAppStates[name], ...saved };
    });
    Object.keys(workspaceAreaSessions).forEach(name => delete workspaceAreaSessions[name]);
    Object.assign(workspaceAreaSessions, cloneDesktopState(state.areaSessions || {}));
    Object.keys(projectWindowSessions).forEach(name => delete projectWindowSessions[name]);
    Object.assign(projectWindowSessions, cloneDesktopState(state.projectWindowSessions || {}));
    Object.entries(state.projects || {}).forEach(([name, saved]) => {
      if (!projectSpaces[name] || !saved) return;
      if (typeof saved.note === "string") projectSpaces[name].note = saved.note;
      if (Array.isArray(saved.resources)) projectSpaces[name].resources = cloneDesktopState(saved.resources);
      if (typeof saved.keepWindows === "boolean") projectSpaces[name].keepWindows = saved.keepWindows;
    });

    noteDraft = typeof state.noteDraft === "string" ? state.noteDraft : noteDraft;
    document.body.dataset.theme = state.theme || document.body.dataset.theme;
    persistIncomingDesktopState(state);

    activeWorkspace = state.activeWorkspace;
    renderWorkspace(activeWorkspace, false);

    activeProjectName = state.activeProjectName && projectSpaces[state.activeProjectName]
      ? state.activeProjectName
      : null;
    if (activeProjectName) renderProjectSpace(activeProjectName);
    else setProjectClosedState(true);

    const notesField = $(".notes-layout textarea");
    if (notesField) notesField.value = noteDraft;

    (state.quickToggles || []).forEach(saved => {
      const button = $$(".quick-toggle").find(candidate => candidate.id !== "themeToggle" && candidate.textContent.trim() === saved.label);
      if (!button) return;
      button.classList.toggle("is-active", Boolean(saved.active));
      button.setAttribute("aria-pressed", String(Boolean(saved.active)));
    });

    if (typeof state.notificationsHtml === "string") {
      $("#notificationList").innerHTML = state.notificationsHtml;
      syncNotifications();
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
      Object.entries(state.maximized || {}).forEach(([name, maximized]) => {
        const frame = frameFor(name);
        if (!frame || appState[name] !== "open") return;
        if (Boolean(maximized) !== (frame.dataset.maximized === "true")) toggleMaximize(name);
      });
      if (state.frontApp && appState[state.frontApp] === "open") bringToFront(state.frontApp);
      updateDesktopSyncPresence();
    });
  } finally {
    requestAnimationFrame(() => { desktopSyncApplying = false; });
  }
}

function postDesktopSyncMessage(message) {
  const packet = {
    ...message,
    id: desktopSyncSource + ":" + Date.now() + ":" + Math.random().toString(36).slice(2),
    source: desktopSyncSource,
    sentAt: Date.now()
  };
  if (desktopSyncChannel) desktopSyncChannel.postMessage(packet);
  else {
    try { localStorage.setItem(DESKTOP_SYNC_STORAGE_KEY, JSON.stringify(packet)); } catch {}
  }
}

function broadcastDesktopState() {
  if (desktopSyncApplying) return;
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
  const now = Date.now();
  desktopSyncPeers.forEach((seen, source) => {
    if (now - seen > 6500) desktopSyncPeers.delete(source);
  });
  const count = desktopSyncPeers.size;
  document.body.classList.toggle("is-session-synced", count > 0);
  const context = $("#systemAreaContext");
  if (context && workspaceProfiles[activeWorkspace]) {
    context.textContent = workspaceProfiles[activeWorkspace].label + " workspace" + (count ? " · " + (count + 1) + " displays" : "");
  }
  const systemArea = areaFor("systems");
  if (systemArea) {
    systemArea.setAttribute("aria-label", count ? "System area · " + (count + 1) + " displays synced" : "System area");
    systemArea.title = count ? (count + 1) + " displays linked in this browser session" : "";
  }
  if (count && !desktopSyncAnnounced) {
    desktopSyncAnnounced = true;
    showToast("Second display connected · desktop synced");
  }
  if (!count) desktopSyncAnnounced = false;
}

function receiveDesktopSyncMessage(packet) {
  if (!packet || packet.source === desktopSyncSource) return;
  desktopSyncPeers.set(packet.source, Date.now());
  updateDesktopSyncPresence();
  if (packet.type === "request") {
    broadcastDesktopState();
    return;
  }
  if (packet.type === "goodbye") {
    desktopSyncPeers.delete(packet.source);
    updateDesktopSyncPresence();
    return;
  }
  if (packet.type !== "state" || !Number.isFinite(packet.stamp) || packet.stamp <= desktopSyncLastStamp) return;
  desktopSyncLastStamp = packet.stamp;
  applyDesktopSyncState(packet.state);
}

function prepareCrossDisplaySync() {
  if (desktopSyncChannel) desktopSyncChannel.addEventListener("message", event => receiveDesktopSyncMessage(event.data));
  else window.addEventListener("storage", event => {
    if (event.key !== DESKTOP_SYNC_STORAGE_KEY || !event.newValue) return;
    try { receiveDesktopSyncMessage(JSON.parse(event.newValue)); } catch {}
  });

  document.addEventListener("click", () => queueDesktopStateBroadcast());
  document.addEventListener("change", () => queueDesktopStateBroadcast());
  document.addEventListener("input", event => {
    if (!event.target.closest("#universalSearch")) queueDesktopStateBroadcast(90);
  });
  window.addEventListener("pointerup", () => queueDesktopStateBroadcast());

  postDesktopSyncMessage({ type: "presence" });
  postDesktopSyncMessage({ type: "request" });
  window.setInterval(() => {
    postDesktopSyncMessage({ type: "presence" });
    updateDesktopSyncPresence();
  }, 2000);
  window.addEventListener("pagehide", () => postDesktopSyncMessage({ type: "goodbye" }));
}

prepareNoteSync();
prepareAreaWindows();
prepareProjectSpaces();
prepareWorkspaces();
preparePackages();
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
setMusicPlaying(true);
updateTimer();
syncApps();
requestAnimationFrame(() => {
  loadLayout(activeWorkspace);
  restoreWorkspaceWindowLayout();
  windowViewportLockReady = true;
  if (frontApp) bringToFront(frontApp);
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
});

window.addEventListener("resize", () => {
  suspendWindowViewportLock = true;
  layoutDockAreas(false);
  windowGeometry.forEach((geometry, name) => {
    if (appState[name] === "open") applyGeometry(name, geometry, false);
  });
  suspendWindowViewportLock = false;
  if (layoutMode === "auto") scheduleSpatialAutoLayout();
});

window.addEventListener("pointermove", event => {
  if (!event.pointerType || event.pointerType === "mouse") lastDesktopPointerX = event.clientX;
}, { passive: true });

window.addEventListener("pagehide", () => captureCurrentWorkspaceSession());
