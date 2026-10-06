const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const appInfo = {
  dolphin: { label: "Dolphin", icon: "i-folder", tone: "blue", detail: "Downloads" },
  elisa: { label: "Elisa", icon: "i-music", tone: "violet", detail: "running out of time" },
  browser: { label: "Web", icon: "i-web", tone: "cyan", detail: "Start page" },
  terminal: { label: "Konsole", icon: "i-terminal", tone: "green", detail: "xef@desktop" },
  notes: { label: "Notes", icon: "i-note", tone: "amber", detail: "Desktop concept" }
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

function icon(name) {
  return '<svg aria-hidden="true"><use href="#' + name + '"/></svg>';
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

function toggleMaximize(name) {
  const frame = frameFor(name);
  if (frame.dataset.maximized === "true") {
    delete frame.dataset.maximized;
    frame.classList.remove("is-maximized");
    applyGeometry(name, maximizeRestore.get(name) || windowGeometry.get(name) || readGeometry(frame));
    return;
  }
  maximizeRestore.set(name, readGeometry(frame));
  const workspace = workspaceBounds();
  frame.dataset.maximized = "true";
  frame.classList.add("is-maximized");
  applyGeometry(name, { x: 8, y: 8, width: workspace.width - 16, height: workspace.height - 16 }, false);
  bringToFront(name);
}

function miniMarkup(name) {
  const info = appInfo[name];
  const header = '<header title="Drag this card back into the workspace"><div><span class="app-badge ' + info.tone + '">' + icon(info.icon) + '</span><span><b>' + info.label + '</b><small>' + info.detail + '</small></span></div><div class="mini-actions"><button class="surface-key mini-control" data-mini-restore="' + name + '" aria-label="Restore ' + info.label + '">' + icon("i-max") + '</button><button class="surface-key mini-control" data-mini-close="' + name + '" aria-label="Close ' + info.label + '">' + icon("i-close") + "</button></div></header>";
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
    return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<label class="mini-note-label"><span>Desktop concept</span><textarea class="mini-note-field" data-mini-note aria-label="Edit Desktop concept note">' + escapeHtml(noteDraft) + "</textarea></label></article>";
  }
  return '<article class="mini-card" data-mini-card="' + name + '">' + header + '<div class="mini-files"><b>' + info.detail + '</b><span>live</span><small>Drag back when you need the full app</small><span>ready</span></div></article>';
}

function renderMiniApps() {
  const minimized = Object.keys(appState).filter(key => appState[key] === "minimized");
  $("#miniStack").innerHTML = minimized.length ? minimized.map(miniMarkup).join("") : '<div class="mini-empty">Drag a window here to keep it controllable.</div>';
  $("#miniCount").textContent = minimized.length + " parked";
  $$("[data-mini-restore]").forEach(button => button.addEventListener("click", () => openApp(button.dataset.miniRestore)));
  $$("[data-mini-close]").forEach(button => button.addEventListener("click", () => closeApp(button.dataset.miniClose)));
  $$("[data-mini-card]").forEach(bindMiniDrag);
  bindMusicControls();
  bindMiniWidgets();
}

function terminalResult(command) {
  if (command === "date") return new Date().toLocaleString();
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

function prepareWindows() {
  $$("[data-app-frame]").forEach(frame => {
    const actions = $(".window-actions", frame);
    if (!$('[data-window-action="maximize"]', actions)) {
      const maximize = document.createElement("button");
      maximize.className = "surface-key window-key";
      maximize.dataset.windowAction = "maximize";
      maximize.setAttribute("aria-label", "Maximize " + appInfo[frame.dataset.appFrame].label);
      maximize.innerHTML = icon("i-max");
      actions.insertBefore(maximize, $(".danger", actions));
    }
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

$$("[data-open-app]").forEach(button => button.addEventListener("click", () => openApp(button.dataset.openApp)));

$("#appSearch").addEventListener("input", event => {
  const query = event.target.value.toLowerCase();
  $$("[data-open-app]").forEach(button => {
    button.hidden = !appInfo[button.dataset.openApp].label.toLowerCase().includes(query);
  });
});

$("#fullscreenButton").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showToast("Use F11 to enter fullscreen");
  }
});

document.addEventListener("fullscreenchange", () => {
  $("#fullscreenButton").setAttribute("aria-label", document.fullscreenElement ? "Leave fullscreen" : "Enter fullscreen");
});

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
  $$(".nav-choice", nav).forEach(other => other.classList.toggle("is-active", other === button));
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
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  $$(".live-time").forEach(label => label.textContent = time);
  $("#dayLabel").textContent = now.toLocaleDateString([], { weekday: "long" });
  $("#dateLabel").textContent = now.toLocaleDateString([], { day: "numeric", month: "long" });
  $("#monthLabel").textContent = now.toLocaleDateString([], { month: "long" });
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
}

$("#timerToggle").addEventListener("click", () => {
  focusRunning = !focusRunning;
  clearInterval(focusTimer);
  if (focusRunning) focusTimer = setInterval(() => {
    focusSeconds = Math.max(0, focusSeconds - 1);
    if (!focusSeconds) {
      focusRunning = false;
      clearInterval(focusTimer);
      showToast("Focus timer finished");
    }
    updateTimer();
  }, 1000);
  updateTimer();
});

$("#timerReset").addEventListener("click", () => {
  clearInterval(focusTimer);
  focusRunning = false;
  focusSeconds = 25 * 60;
  updateTimer();
});

$$(".dismiss-button").forEach(button => button.addEventListener("click", () => {
  button.closest(".notification").remove();
  const count = $$(".notification").length;
  $("#notificationCount").textContent = count;
  if (!count) $("#notificationList").innerHTML = '<div class="notification-empty">You are all caught up.</div>';
}));

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
prepareZoneResizers();
prepareWindows();
updateClock();
setInterval(updateClock, 1000);
renderCalendar();
bindMusicControls();
setMusicPlaying(true);
updateTimer();
syncApps();
requestAnimationFrame(() => {
  loadLayout();
  bringToFront("dolphin");
});

window.addEventListener("resize", () => {
  applyZoneLayout(false);
  windowGeometry.forEach((geometry, name) => {
    if (appState[name] === "open") applyGeometry(name, geometry, false);
  });
});
