const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const toggleControlSelector = [
  "[data-open-app]",
  "[data-toggle]",
  ".folder-tab",
  ".nav-choice",
  ".play-toggle",
  "#timerToggle",
  "#allAppsToggle",
  "[data-project-select]",
  "[data-window-action=\"maximize\"]"
].join(",");

function prepareControlSemantics(root = document) {
  const buttons = root.matches?.("button") ? [root, ...$$("button", root)] : $$("button", root);
  buttons.forEach(button => {
    const managed = button.matches(".surface-key,.quick-toggle,.folder-tab,.nav-choice,.app-key,.dismiss-button");
    if (!managed) return;
    const toggle = button.matches(toggleControlSelector);
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
    localStorage.setItem("spatial-desktop-layout-v3", JSON.stringify(Object.fromEntries(windowGeometry)));
  } catch {}
}

function loadLayout() {
  try {
    const layout = JSON.parse(localStorage.getItem("spatial-desktop-layout-v3") || "{}");
    Object.entries(layout).forEach(([name, geometry]) => {
      if (appInfo[name] && geometry && Number.isFinite(geometry.x)) {
        windowGeometry.set(name, geometry);
        applyGeometry(name, geometry, false);
      }
    });
  } catch {}
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
  if (frontApp) bringToFront(frontApp);
}

function openApp(name, dropPoint = null) {
  if (!appInfo[name]) return;
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
  }
  bringToFront(name);
}

function minimizeApp(name, preserveGeometry = false) {
  const frame = frameFor(name);
  if (appState[name] !== "open") return;
  if (!preserveGeometry && !frame.dataset.maximized) windowGeometry.set(name, readGeometry(frame));
  frame.classList.remove("is-maximized");
  delete frame.dataset.maximized;
  syncMaximizeButton(frame);
  appState[name] = "minimized";
  if (frontApp === name) frontApp = topOpenApp(name);
  syncApps();
}

function closeApp(name) {
  appState[name] = "closed";
  if (frontApp === name) frontApp = topOpenApp(name);
  syncApps();
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
    applyGeometry(name, maximizeRestore.get(name) || windowGeometry.get(name) || readGeometry(frame));
    syncMaximizeButton(frame);
    return;
  }
  maximizeRestore.set(name, readGeometry(frame));
  const workspace = workspaceBounds();
  frame.dataset.maximized = "true";
  frame.classList.add("is-maximized");
  applyGeometry(name, { x: 8, y: 8, width: workspace.width - 16, height: workspace.height - 16 }, false);
  bringToFront(name);
  syncMaximizeButton(frame);
}

function miniMarkup(name) {
  const info = appInfo[name];
  const header = '<header title="Drag this card back into the workspace"><div><span class="app-badge ' + info.tone + '">' + appArt(name, "app-art-compact") + '</span><span><b>' + info.label + '</b><small>' + info.detail + '</small></span></div><div class="mini-actions"><button class="surface-key mini-control" data-mini-restore="' + name + '" aria-label="Restore ' + info.label + '">' + icon("i-max") + '</button><button class="surface-key mini-control" data-mini-close="' + name + '" aria-label="Close ' + info.label + '">' + icon("i-close") + "</button></div></header>";
  if (name === "elisa") {
    return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<div class="mini-music"><div class="mini-art"></div><div class="mini-track"><b>running out of time</b><small>eenspire · 1:55 / 3:38</small></div><div class="mini-transport"><button class="surface-key mini-control" data-music="prev">' + icon("i-prev") + '</button><button class="surface-key mini-control play-toggle" data-music="play">' + icon(musicPlaying ? "i-pause" : "i-play") + '</button><button class="surface-key mini-control" data-music="next">' + icon("i-next") + '</button><input class="track-range" type="range" min="0" max="218" value="' + musicPosition + '" aria-label="Track position"></div></div></article>';
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
    titlebar.setPointerCapture(event.pointerId);
    frame.classList.add("is-dragging");
    frame.style.left = startRect.left + "px";
    frame.style.top = startRect.top + "px";
    frame.style.width = startRect.width + "px";
    frame.style.height = startRect.height + "px";

    const move = moveEvent => {
      frame.style.left = moveEvent.clientX - offsetX + "px";
      frame.style.top = moveEvent.clientY - offsetY + "px";
      setDropTarget(appsZone, pointInside(appsZone.getBoundingClientRect(), moveEvent.clientX, moveEvent.clientY));
      setDropTarget(workspace, pointInside(workspace.getBoundingClientRect(), moveEvent.clientX, moveEvent.clientY));
    };

    const finish = upEvent => {
      titlebar.removeEventListener("pointermove", move);
      titlebar.removeEventListener("pointerup", finish);
      titlebar.removeEventListener("pointercancel", finish);
      setDropTarget(appsZone, false);
      setDropTarget(workspace, false);
      const parked = pointInside(appsZone.getBoundingClientRect(), upEvent.clientX, upEvent.clientY);
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

    const move = moveEvent => applyGeometry(name, {
      ...start,
      width: start.width + moveEvent.clientX - startX,
      height: start.height + moveEvent.clientY - startY
    }, false);
    const finish = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      frame.classList.remove("is-resizing");
      windowGeometry.set(name, readGeometry(frame));
      saveLayout();
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
const areaGeometry = new Map();
let areaMode = "auto";
let areaZCounter = 240;

function areaFor(name) {
  return document.querySelector('[data-area-window="' + name + '"]');
}

function areaMinimums(name) {
  return name === "projects" ? { width: 480, height: 210 } : { width: name === "systems" ? 260 : 240, height: 310 };
}

function defaultAreaGeometry(name) {
  const shell = $(".desktop-shell");
  const width = shell.clientWidth;
  const height = shell.clientHeight;
  if (name === "projects") return { x: Math.max(12, width * .24), y: Math.max(12, height * .66), width: Math.max(480, width * .5), height: Math.max(210, height * .31) };
  if (name === "systems") return { x: Math.max(12, width - Math.max(280, width * .22) - 12), y: 12, width: Math.max(280, width * .22), height: height - 24 };
  return { x: 12, y: 12, width: Math.max(260, width * .21), height: height - 24 };
}

function clampAreaGeometry(name, geometry) {
  const shell = $(".desktop-shell");
  const gap = 8;
  const minimum = areaMinimums(name);
  const width = Math.min(Math.max(minimum.width, geometry.width), Math.max(minimum.width, shell.clientWidth - gap * 2));
  const height = Math.min(Math.max(minimum.height, geometry.height), Math.max(minimum.height, shell.clientHeight - gap * 2));
  return {
    x: Math.min(Math.max(gap, geometry.x), Math.max(gap, shell.clientWidth - width - gap)),
    y: Math.min(Math.max(gap, geometry.y), Math.max(gap, shell.clientHeight - height - gap)),
    width,
    height
  };
}

function applyAreaGeometry(name, geometry, remember = true) {
  const area = areaFor(name);
  if (!area) return;
  const fitted = clampAreaGeometry(name, geometry);
  area.style.left = fitted.x + "px";
  area.style.top = fitted.y + "px";
  area.style.width = fitted.width + "px";
  area.style.height = fitted.height + "px";
  area.style.right = "auto";
  area.style.bottom = "auto";
  if (remember) areaGeometry.set(name, fitted);
}

function bringAreaToFront(name) {
  const area = areaFor(name);
  if (!area) return;
  areaZCounter += 1;
  area.style.zIndex = areaZCounter;
}

function saveAreaLayout() {
  const hidden = Object.fromEntries(areaPriority.map(name => [name, Boolean(areaFor(name)?.hidden)]));
  try {
    localStorage.setItem("spatial-area-layout-v1", JSON.stringify({
      mode: areaMode,
      hidden,
      geometry: Object.fromEntries(areaGeometry)
    }));
  } catch {}
}

function setWorkspaceInsets(left, right, bottom, top = 12) {
  const shell = $(".desktop-shell");
  shell.style.setProperty("--workspace-left", left + "px");
  shell.style.setProperty("--workspace-right", right + "px");
  shell.style.setProperty("--workspace-bottom", bottom + "px");
  shell.style.setProperty("--workspace-top", top + "px");
}

function tileAreas(save = false) {
  const shell = $(".desktop-shell");
  const width = shell.clientWidth;
  const height = shell.clientHeight;
  const gap = 12;
  const visible = name => areaFor(name) && !areaFor(name).hidden;
  const hasProject = visible("projects");
  const hasApps = visible("apps");
  const hasSystems = visible("systems");
  let appsWidth = hasApps ? Math.min(320, Math.max(250, width * .205)) : 0;
  let systemsWidth = hasSystems ? Math.min(340, Math.max(270, width * .215)) : 0;
  const projectHeight = hasProject ? Math.min(320, Math.max(250, height * .31)) : 0;

  // Project Space gets the central canvas first. On constrained screens the
  // lower-priority System area yields before Apps.
  const minimumCenter = Math.min(560, width - gap * 2);
  let overflow = appsWidth + systemsWidth + (hasApps ? gap : 0) + (hasSystems ? gap : 0) + minimumCenter + gap * 2 - width;
  if (overflow > 0 && hasSystems) {
    const reduction = Math.min(overflow, Math.max(0, systemsWidth - 240));
    systemsWidth -= reduction;
    overflow -= reduction;
  }
  if (overflow > 0 && hasApps) appsWidth = Math.max(230, appsWidth - overflow);

  if (hasApps) applyAreaGeometry("apps", { x: gap, y: gap, width: appsWidth, height: height - gap * 2 });
  if (hasSystems) applyAreaGeometry("systems", { x: width - systemsWidth - gap, y: gap, width: systemsWidth, height: height - gap * 2 });
  if (hasProject) {
    const left = gap + (hasApps ? appsWidth + gap : 0);
    const right = width - gap - (hasSystems ? systemsWidth + gap : 0);
    applyAreaGeometry("projects", { x: left, y: height - projectHeight - gap, width: Math.max(480, right - left), height: projectHeight });
  }

  areaMode = "auto";
  document.body.classList.add("areas-auto");
  document.body.classList.remove("areas-freeform");
  setWorkspaceInsets(hasApps ? appsWidth + gap * 2 : gap, hasSystems ? systemsWidth + gap * 2 : gap, hasProject ? projectHeight + gap * 2 : gap, gap);
  [["systems", 221], ["apps", 222], ["projects", 223]].forEach(([name, z]) => {
    const area = areaFor(name);
    if (area) area.style.zIndex = z;
  });
  scheduleWindowFit();
  if (save) saveAreaLayout();
}

function detachAreaLayout() {
  if (areaMode === "free") return;
  areaPriority.forEach(name => {
    const area = areaFor(name);
    if (!area || area.hidden) return;
    const areaRect = area.getBoundingClientRect();
    const shellRect = $(".desktop-shell").getBoundingClientRect();
    areaGeometry.set(name, { x: areaRect.left - shellRect.left, y: areaRect.top - shellRect.top, width: areaRect.width, height: areaRect.height });
  });
  areaMode = "free";
  document.body.classList.remove("areas-auto");
  document.body.classList.add("areas-freeform");
  setWorkspaceInsets(12, 12, 12, 12);
  scheduleWindowFit();
}

function hideArea(name) {
  const area = areaFor(name);
  if (!area) return;
  area.hidden = true;
  if (areaMode === "auto") tileAreas(false);
  saveAreaLayout();
  showToast((name === "projects" ? "Project Space" : name === "apps" ? "Apps" : "System") + " hidden — reopen it from Search");
}

function showArea(name, announce = true) {
  const area = areaFor(name);
  if (!area) return;
  area.hidden = false;
  if (areaMode === "auto") tileAreas(false);
  else applyAreaGeometry(name, areaGeometry.get(name) || defaultAreaGeometry(name));
  bringAreaToFront(name);
  saveAreaLayout();
  if (announce) showToast((name === "projects" ? "Project Space" : name === "apps" ? "Apps" : "System") + " shown");
}

function bindAreaDrag(name, area) {
  const handle = $("[data-area-drag-handle]", area);
  if (!handle) return;
  handle.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button,input,a")) return;
    event.preventDefault();
    detachAreaLayout();
    bringAreaToFront(name);
    const shellRect = $(".desktop-shell").getBoundingClientRect();
    const startRect = area.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY, left: startRect.left - shellRect.left, top: startRect.top - shellRect.top, width: startRect.width, height: startRect.height };
    handle.setPointerCapture(event.pointerId);
    area.classList.add("is-area-dragging");
    const move = moveEvent => applyAreaGeometry(name, { x: start.left + moveEvent.clientX - start.x, y: start.top + moveEvent.clientY - start.y, width: start.width, height: start.height });
    const finish = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      area.classList.remove("is-area-dragging");
      saveAreaLayout();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function bindAreaResize(name, area) {
  const handle = $('[data-area-resize="' + name + '"]', area);
  if (!handle) return;
  handle.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    detachAreaLayout();
    bringAreaToFront(name);
    const rect = area.getBoundingClientRect();
    const shellRect = $(".desktop-shell").getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY, left: rect.left - shellRect.left, top: rect.top - shellRect.top, width: rect.width, height: rect.height };
    handle.setPointerCapture(event.pointerId);
    area.classList.add("is-area-resizing");
    const move = moveEvent => applyAreaGeometry(name, { x: start.left, y: start.top, width: start.width + moveEvent.clientX - start.x, height: start.height + moveEvent.clientY - start.y });
    const finish = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      area.classList.remove("is-area-resizing");
      saveAreaLayout();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function prepareAreaWindows() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("spatial-area-layout-v1") || "null"); } catch {}
  if (saved?.hidden) areaPriority.forEach(name => { if (areaFor(name)) areaFor(name).hidden = Boolean(saved.hidden[name]); });
  if (saved?.geometry) Object.entries(saved.geometry).forEach(([name, geometry]) => areaGeometry.set(name, geometry));

  areaPriority.forEach(name => {
    const area = areaFor(name);
    if (!area) return;
    bindAreaDrag(name, area);
    bindAreaResize(name, area);
    area.addEventListener("pointerdown", () => bringAreaToFront(name));
  });
  $$('[data-area-hide]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); hideArea(button.dataset.areaHide); }));
  $$('[data-area-show]').forEach(button => button.addEventListener("click", () => showArea(button.dataset.areaShow)));
  $$('[data-area-auto]').forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    tileAreas(true);
    showToast("Areas arranged: Projects → Apps → System");
  }));

  if (saved?.mode === "free") {
    areaMode = "free";
    document.body.classList.add("areas-freeform");
    setWorkspaceInsets(12, 12, 12, 12);
    areaPriority.forEach(name => {
      const area = areaFor(name);
      if (area && !area.hidden) applyAreaGeometry(name, areaGeometry.get(name) || defaultAreaGeometry(name));
    });
  } else tileAreas(false);
}

const projectSpaces = {
  plasma: {
    name: "Plasma Redesign",
    accent: "#5cbcff",
    root: "~/Projects/plasma-redesign",
    files: [["desktop-shell.css", "Modified 8 min ago", "document"], ["interaction-notes.md", "Modified today", "document"]],
    links: [["keyboard-reference.mp4", "Linked · ~/Videos", "video", "i-video"], ["Ocean design", "Linked web reference", "web", "i-web"]],
    clipboard: ["#2a9fff", "Project clipboard · pinned colour"]
  },
  retold: {
    name: "Retold",
    accent: "#65d881",
    root: "~/Projects/retold-mod",
    files: [["src/main/java", "Gameplay sources", "folder"], ["gradle.properties", "Modified yesterday", "document"]],
    links: [["v0.3 test recording.mp4", "Linked · ~/Videos/Captures", "video", "i-video"], ["Fabric documentation", "Linked web reference", "web", "i-web"]],
    clipboard: ["./gradlew runClient", "Project clipboard · last command"]
  }
};

function renderProjectSpace(name) {
  const project = projectSpaces[name];
  const area = areaFor("projects");
  if (!project || !area) return;
  area.style.setProperty("--project-accent", project.accent);
  $("#projectAreaName").textContent = project.name;
  $("#projectRootPath").textContent = project.root;
  $("#projectRootItems").innerHTML = project.files.map(([label, detail, type]) => '<button data-project-item="' + escapeHtml(label) + '">' + (type === "folder" ? '<span class="linked-type web">' + icon("i-folder") + '</span>' : '<i class="document-glyph"></i>') + '<span><b>' + escapeHtml(label) + '</b><small>' + escapeHtml(detail) + '</small></span></button>').join("");
  $("#projectLinkedItems").innerHTML = project.links.map(([label, detail, type, itemIcon]) => '<button data-project-item="' + escapeHtml(label) + '"><span class="linked-type ' + type + '">' + icon(itemIcon) + '</span><span><b>' + escapeHtml(label) + '</b><small>' + escapeHtml(detail) + '</small></span><i class="link-badge">' + icon("i-link") + '</i></button>').join("");
  const [clip, clipDetail] = project.clipboard;
  $("#projectClipboard").innerHTML = '<span class="clipboard-mark">' + icon("i-clipboard") + '</span><span><b>' + escapeHtml(clip) + '</b><small>' + escapeHtml(clipDetail) + '</small></span><button class="surface-key project-small-key" data-project-copy="' + escapeHtml(clip) + '">Copy</button>';
  applyAppPrimaryColors(area);
}

function prepareProjectSpaces() {
  $$('[data-project-select]').forEach(button => button.addEventListener("click", () => {
    $$('[data-project-select]').forEach(choice => {
      const selected = choice === button;
      choice.classList.toggle("is-active", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
    renderProjectSpace(button.dataset.projectSelect);
    showToast(button.textContent.trim() + " context loaded");
  }));
  $(".project-area").addEventListener("click", event => {
    const item = event.target.closest("[data-project-item]");
    const copy = event.target.closest("[data-project-copy]");
    if (item) showToast("Opening " + item.dataset.projectItem);
    if (copy) showToast("Copied " + copy.dataset.projectCopy);
  });
  renderProjectSpace("plasma");
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

function setAllAppsOpen(open) {
  const drawer = $("#allAppsDrawer");
  const toggle = $("#allAppsToggle");
  drawer.classList.toggle("is-open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  toggle.classList.toggle("is-active", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-pressed", String(open));
}

$("#allAppsToggle").addEventListener("click", () => {
  setAllAppsOpen(!$("#allAppsDrawer").classList.contains("is-open"));
});

$$("[data-open-app]").forEach(button => button.addEventListener("click", () => {
  openApp(button.dataset.openApp);
  if (button.closest("#allAppsDrawer")) setAllAppsOpen(false);
}));

$$("[data-launch-app]").forEach(button => button.addEventListener("click", () => {
  pulseBusyCursor();
  showToast(button.dataset.launchApp + " launched");
  setAllAppsOpen(false);
}));

let activeLauncherCategory = "all";

function filterLauncher() {
  const query = $("#appSearch").value.trim().toLowerCase();
  let visible = 0;
  $$(".launcher-app", $("#allAppsGrid")).forEach(button => {
    const matchesSearch = !query || button.textContent.trim().toLowerCase().includes(query);
    const matchesCategory = query || activeLauncherCategory === "all" ||
      (activeLauncherCategory === "favorites" && button.dataset.favorite === "true") ||
      button.dataset.category === activeLauncherCategory;
    button.hidden = !(matchesSearch && matchesCategory);
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
  $("#appSearch").value = "";
  $("#allAppsTitle").textContent = button.textContent.trim();
  filterLauncher();
}));

$("#appSearch").addEventListener("input", event => {
  if (event.target.value) setAllAppsOpen(true);
  const selectedCategory = $("[data-category-filter].is-active");
  $("#allAppsTitle").textContent = event.target.value ? "Search results" : selectedCategory.textContent.trim();
  filterLauncher();
});

filterLauncher();

let activeUniversalScope = "all";
let universalLastFocus = null;

function filterUniversalSearch() {
  const query = $("#universalSearchInput").value.trim().toLowerCase();
  let localVisible = 0;

  $$(".universal-result", $("#universalResults")).forEach(result => {
    const group = result.closest("[data-universal-group]").dataset.universalGroup;
    const inScope = activeUniversalScope === "all" || activeUniversalScope === group;
    const isWeb = group === "web";
    const searchable = (result.dataset.universalSearch || result.textContent).toLowerCase();
    const matchesQuery = !query || isWeb || searchable.includes(query);
    result.hidden = !(inScope && matchesQuery);
    if (!result.hidden && !isWeb) localVisible += 1;
  });

  $$(".universal-group", $("#universalResults")).forEach(group => {
    group.hidden = !$(".universal-result:not([hidden])", group);
  });

  $("#universalWebLabel").textContent = query ? `Search the web for “${$("#universalSearchInput").value.trim()}”` : "Search the web";
  $("#universalEmpty").hidden = !(query && localVisible === 0 && activeUniversalScope !== "web");
}

function setUniversalSearchOpen(open) {
  const overlay = $("#universalSearch");
  if (open === overlay.classList.contains("is-open")) return;
  overlay.classList.toggle("is-open", open);
  overlay.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("universal-search-open", open);

  if (open) {
    universalLastFocus = document.activeElement;
    setAllAppsOpen(false);
    activeUniversalScope = "all";
    $("#universalSearchInput").value = "";
    $$('[data-universal-scope]').forEach(choice => {
      const selected = choice.dataset.universalScope === "all";
      choice.classList.toggle("is-active", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
    filterUniversalSearch();
    requestAnimationFrame(() => {
      $("#universalSearchInput").focus();
      $("#universalSearchInput").select();
    });
  } else if (universalLastFocus && universalLastFocus.focus) {
    universalLastFocus.focus({preventScroll:true});
  }
}

function openApplicationSearch() {
  setUniversalSearchOpen(false);
  showArea("apps", false);
  setAllAppsOpen(true);
  requestAnimationFrame(() => $("#appSearch").focus());
}

$("#universalSearchInput").addEventListener("input", filterUniversalSearch);

$$('[data-universal-scope]').forEach(button => button.addEventListener("click", () => {
  activeUniversalScope = button.dataset.universalScope;
  $$('[data-universal-scope]').forEach(choice => {
    const selected = choice === button;
    choice.classList.toggle("is-active", selected);
    choice.setAttribute("aria-pressed", String(selected));
  });
  filterUniversalSearch();
  $("#universalSearchInput").focus();
}));

$$('.universal-result').forEach(button => button.addEventListener("click", () => setUniversalSearchOpen(false)));
$("#universalWebResult").addEventListener("click", () => {
  openApp("browser");
  const query = $("#universalSearchInput").value.trim();
  showToast(query ? `Searching the web for “${query}”` : "Web search opened");
});
$("#universalTimer").addEventListener("click", () => $("#launchTimer").click());
$("#universalSearch").addEventListener("pointerdown", event => {
  if (event.target === $("#universalSearch")) setUniversalSearchOpen(false);
});

filterUniversalSearch();

function prepareMaterialCursor() {
  const cursor = $("#materialCursor");
  const desktop = $(".desktop-shell");
  if (!cursor || !desktop || !window.matchMedia("(pointer:fine)").matches) return;

  const cursorModes = ["is-pointer", "is-text", "is-col-resize", "is-diag-resize", "is-grab", "is-grabbing", "is-move", "is-forbidden", "is-help", "is-progress", "is-copy"];
  let lastX = 0;
  let lastY = 0;

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

  [desktop, $("#universalSearch")].filter(Boolean).forEach(surface => {
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
      syncMode(document.elementFromPoint(event.clientX, event.clientY), event.buttons);
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
  window.addEventListener("material-cursor-mode", () => syncMode(document.elementFromPoint(lastX, lastY), 0));
}

let superKeyAlone = false;
document.addEventListener("keydown", event => {
  const isSuper = event.key === "Meta" || event.key === "OS";
  if (isSuper && !event.repeat) {
    superKeyAlone = true;
    return;
  }
  if (event.metaKey && !isSuper) superKeyAlone = false;

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

  if (event.key === "Escape" && $("#allAppsDrawer").classList.contains("is-open")) {
    setAllAppsOpen(false);
    $("#allAppsToggle").focus();
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
    openApplicationSearch();
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
  });
  $$(".track-range").forEach(range => range.value = musicPosition);
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
  $("#dayLabel").textContent = now.toLocaleDateString("en-GB", { weekday: "long" });
  $("#dateLabel").textContent = now.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
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

prepareNoteSync();
prepareAreaWindows();
prepareProjectSpaces();
prepareWindows();
applyAppPrimaryColors();
hydrateAppArtwork();
prepareControlSemantics();
prepareMaterialCursor();
updateClock();
setInterval(updateClock, 1000);
renderCalendar();
bindMusicControls();
setMusicPlaying(true);
updateTimer();
syncApps();
requestAnimationFrame(() => {
  loadLayout();
  ensureOpenWindowGeometry();
  bringToFront("dolphin");
  window.setTimeout(() => {
    const diagnosticFrame = frameFor("dolphin");
    const diagnosticRect = diagnosticFrame.getBoundingClientRect();
    $("#projectAreaName").nextElementSibling.textContent = "Project Space · " + $$('[data-app-frame]').length + " windows · " + (diagnosticFrame.hidden ? "hidden" : "shown") + " · " + Math.round(diagnosticRect.width) + "×" + Math.round(diagnosticRect.height) + " · z" + getComputedStyle(diagnosticFrame).zIndex;
  }, 500);
});

window.addEventListener("resize", () => {
  if (areaMode === "auto") tileAreas(false);
  else areaPriority.forEach(name => {
    const area = areaFor(name);
    if (area && !area.hidden) applyAreaGeometry(name, areaGeometry.get(name) || defaultAreaGeometry(name));
  });
  windowGeometry.forEach((geometry, name) => {
    if (appState[name] === "open") applyGeometry(name, geometry, false);
  });
});
