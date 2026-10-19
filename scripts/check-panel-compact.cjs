const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tag = 'div', attributes = {}) {
    this.tagName = tag.toUpperCase(); this.attributes = {...attributes}; this.dataset = {};
    this.children = []; this.parentElement = null; this.events = {}; this.textContent = '';
    this.captures = new Set(); this.offsetHeight = 180;
    this.hidden = false; this.inert = false; this.disabled = false; this.innerHTML = '';
    this.style = {setProperty: (name, value) => { this.style[name] = value; }};
    for (const [name, value] of Object.entries(attributes)) if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  get id() { return this.attributes.id || ''; }
  set id(value) { this.attributes.id = value; }
  get innerHTML() { return this.html || ''; }
  set innerHTML(value) {
    this.html = value;
    if (this.attributes['data-background-popup-content'] !== undefined && value) {
      this.replaceChildren();
      if (value.includes('<progress')) this.append(new Element('progress'));
      if (value.includes('data-background-track')) this.append(new Element('p', {'data-background-track': ''}));
      for (const match of value.matchAll(/data-background-control="([^"]+)"/g)) this.append(new Element('button', {'data-background-control': match[1]}));
    }
  }
  get className() { return this.attributes.class || ''; }
  set className(value) { this.attributes.class = value; }
  get classList() { return {toggle: (name, on) => { const values = new Set(this.className.split(/\s+/).filter(Boolean)); if (on) values.add(name); else values.delete(name); this.className = [...values].join(' '); }, contains: name => this.className.split(/\s+/).includes(name)}; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  append(...nodes) { for (const child of nodes) { child.remove(); child.parentElement = this; this.children.push(child); } }
  replaceChildren(...nodes) { for (const child of [...this.children]) child.remove(); this.append(...nodes); }
  insertBefore(child, before) { child.remove(); child.parentElement = this; this.children.splice(before ? this.children.indexOf(before) : this.children.length, 0, child); }
  remove() { if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; }
  contains(node) { for (; node; node = node.parentElement) if (node === this) return true; return false; }
  matches(selector) {
    if (selector.includes(',')) return selector.split(',').some(part => this.matches(part));
    const parts = selector.trim().split(/\s+/), matches = (node, part) => {
      const tag = part.match(/^[a-z][a-z\d-]*/i)?.[0]; if (tag && node.tagName !== tag.toUpperCase()) return false;
      for (const match of part.matchAll(/#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/g)) {
        if (match[1] && node.attributes.id !== match[1]) return false;
        if (match[2] && !node.classList.contains(match[2])) return false;
        if (match[3]) {
          const key = match[3].startsWith('data-') ? match[3].slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) : null;
          const value = key ? node.dataset[key] : node.attributes[match[3]];
          if (value === undefined || (match[4] !== undefined && value !== match[4])) return false;
        }
      }
      return true;
    };
    let node = this, index = parts.length - 1; if (!matches(node, parts[index--])) return false;
    while (index >= 0) { node = node.parentElement; while (node && !matches(node, parts[index])) node = node.parentElement; if (!node) return false; index--; }
    return true;
  }
  querySelectorAll(selector) { const values = []; const visit = node => { for (const child of node.children) { if (child.matches(selector)) values.push(child); visit(child); } }; visit(this); return values; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  addEventListener(type, callback, capture = false) { (this.events[type] ||= []).push(callback); if (capture === true || capture?.capture) this.captures.add(callback); }
  removeEventListener(type, callback) { this.events[type] = (this.events[type] || []).filter(item => item !== callback); }
  dispatch(type, properties = {}) {
    const path = []; for (let node = this; node; node = node.parentElement) path.push(node);
    const event = {target: this, defaultPrevented: false, propagationStopped: false, immediateStopped: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.propagationStopped = true; }, stopImmediatePropagation() { this.immediateStopped = this.propagationStopped = true; }, ...properties};
    for (const capture of [true, false]) for (const node of capture ? [...path].reverse() : path) {
      for (const callback of node.events[type] || []) if (node.captures.has(callback) === capture) { callback(event); if (event.immediateStopped) break; }
      if (event.propagationStopped) return event;
    }
    return event;
  }
  click() { if (!this.disabled) return this.dispatch('click'); }
  focus() { this.focused = true; }
  getBoundingClientRect() { return {left: 20, top: 120, right: 60, bottom: 160, width: 40, height: 40}; }
}
class Document extends Element { createElement(tag) { return new Element(tag); } getElementById(id) { return this.querySelector('#' + id); } }
const element = (tag, attrs, parent) => { const node = new Element(tag, attrs); parent?.append(node); return node; };
const document = new Document('body');
const shell = element('main', {class: 'desktop-shell'}, document);
element('section', {class: 'workspace-zone'}, shell);
const apps = element('aside', {'data-widget-source':'apps'}, shell); apps.inert = true;
const region = element('div', {class: 'apps-scroll-region'}, apps);
const rack = element('nav', {id: 'appRack'}, region);
const miniStack = element('div', {id: 'miniStack'}, region);
const backgroundRow = element('nav', {id: 'backgroundApps'}, apps);
const backgroundPopup = element('section', {id: 'backgroundAppPopup'}, document); backgroundPopup.hidden = backgroundPopup.inert = true;
element('h2', {}, backgroundPopup);
element('button', {'data-background-popup-close': ''}, backgroundPopup);
element('p', {'data-background-popup-status': ''}, backgroundPopup);
const backgroundContent = element('div', {'data-background-popup-content': ''}, backgroundPopup);
// The fixture does not parse innerHTML. Prebuild the native Steam controls.
backgroundContent.dataset.kind = 'steam';
element('progress', {}, backgroundContent);
element('button', {'data-background-control': 'toggle'}, backgroundContent);
const backgroundRestore = element('button', {'data-background-popup-open': ''}, backgroundPopup);
element('button', {'data-background-popup-stop': ''}, backgroundPopup);
const overview = element('button', {id: 'allAppsToggle'}, document); overview.setAttribute('aria-label', 'Open General workspace Overview');
const clock = element('header', {class: 'time-block'}, document);
const liveTime = element('strong', {class: 'live-time'}, clock); liveTime.textContent = '12:34';
const controls = element('section', {}, document);
const wifi = element('button', {'aria-label': 'Wi-Fi', 'aria-pressed': 'true'}, controls);
const sound = element('button', {'aria-label': 'Sound', 'aria-pressed': 'true'}, controls);
const nativeParents = [apps.parentElement, clock.parentElement, controls.parentElement];
const registry = new Map([['apps', {source: apps}], ['clock', {source: clock}], ['controls', {source: controls}]]);
const frames = new Map(), observations = []; let nextFrame = 0;
const windowListeners = [];
const eventRoot = {
  requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id; }, cancelAnimationFrame: id => frames.delete(id),
  addEventListener: (type, callback, options) => windowListeners.push({type, callback, options}),
  removeEventListener: (type, callback) => { const index = windowListeners.findIndex(listener => listener.type === type && listener.callback === callback); if (index >= 0) windowListeners.splice(index, 1); },
};
document.defaultView = eventRoot;
const calls = [], openedWidgets = []; let blocked = false, permitted = true, sourceRestores = 0, layoutChanges = 0;
const orders = {general: ['notes--2', 'browser', 'elisa'], work: ['work-note']};
const sandbox = {document, Date, Map, Set, Array, Boolean, String, Number, Math, MutationObserver: class { constructor(callback) { this.callback = callback; this.targets = []; observations.push(this); } observe(node, options) { this.targets.push({node, options}); } disconnect() { this.disconnected = true; } },
  activeWorkspace: 'general', desktopHasWindowFocus: true, frontApp: 'notes--2',
  appInfo: {notes: {label: 'Note Editor'}, 'notes--2': {label: 'Note Editor', base: 'notes'}, browser: {label: 'Firefox'}, elisa: {label: 'Music Player'}, settings: {label: 'Settings'}, steam: {label: 'Steam', singleInstance: true}, 'work-note': {label: 'Work note', base: 'notes', workspace: 'work'}},
  appState: {notes: 'closed', 'notes--2': 'open', browser: 'minimized', elisa: 'minimized', settings: 'closed', steam: 'closed', 'work-note': 'open'},
  workspaceProfiles: {general: {icon: 'i-grid', rack: ['notes', 'browser', 'settings', 'steam'], favorites: [['notes'], ['browser'], ['settings'], ['steam']]}, work: {icon: 'i-office', rack: ['notes'], favorites: [['notes']]}},
  appArt: id => '<svg class="app-art"><use href="#app-' + id + '"/></svg>', icon: id => '<svg><use href="#' + id + '"/></svg>',
  SpatialGuide: {model: {active: () => !permitted, allows: () => permitted}}, desktopNavigationBlocked: () => blocked,
  desktopPages: {inColumn: () => true, fullscreenBond: () => null, pageOf: () => 2, columnOf: () => 'workspace', column: () => 'workspace'},
  $: selector => document.querySelector(selector), prepareControlSemantics() {}};
sandbox.workspaceHotbarNames = () => orders[sandbox.activeWorkspace];
sandbox.hotbarSlotFor = id => orders[sandbox.activeWorkspace].indexOf(id) + 1;
sandbox.openApp = id => { calls.push(['open', id]); sandbox.appState[id] = 'open'; sandbox.frontApp = id; sandbox.desktopHasWindowFocus = true; };
sandbox.minimizeApp = id => { calls.push(['park', id]); sandbox.appState[id] = 'minimized'; };
sandbox.createAppInstance = id => { calls.push(['new', id]); };
sandbox.launchAppHere = (...args) => { calls.push(['launch', ...args]); };
sandbox.changeDesktopPage = (...args) => { calls.push(['desktop', ...args]); };
// Execute the real background service implementation as well: closing a
// downloading Steam window must detach its session, not create a parked card.
const windowModels = {general: {}, work: {}};
const originalSteamModel = {kind: 'steam', background: false, download: {received: 84, total: 400, active: true, updated: Date.now()}};
windowModels.general.steam = JSON.parse(JSON.stringify(originalSteamModel));
let serviceSequence = 0;
Object.assign(sandbox, {
  crypto: {randomUUID: () => 'test-' + (++serviceSequence)},
  desktopStorage: {getItem() { return null; }, setItem() {}},
  workspaceAppStates: {general: sandbox.appState, work: {}},
  appWindowStore: {snapshot: () => windowModels, get: (workspace, id) => windowModels[workspace][id]},
  appWindowModel: id => windowModels[sandbox.activeWorkspace][id] ||= {kind: sandbox.appInfo[id]?.base || id},
  frameFor: () => null, queueDesktopStateBroadcast() {}, saveAppWindows() {}, saveIndependentSessions() {},
  closeApp: id => { sandbox.appState[id] = 'closed'; },
  syncApps() {}, renderMiniApps() {}, renderAllAppMusic() {}, hydrateAppWindow() {}, setUniversalSearchOpen() {}, renderWorkspace() {},
  contextMenuDescriptor: () => ({}), contextMenuEntries: () => [], executeContextAction() {}, captureDesktopSyncState: () => ({}), persistIncomingDesktopState() {},
  showToast() {}, addEventListener() {}, setTimeout: () => 1, innerWidth: 1200, innerHeight: 800,
  instanceSequence: 0, instanceDefinitions: {}, windowMembership: {},
  installInstance: (id, base) => { sandbox.appInfo[id] = {...sandbox.appInfo[base], label: sandbox.appInfo[base].label, base, workspace: sandbox.activeWorkspace}; sandbox.appState[id] = 'closed'; orders[sandbox.activeWorkspace].push(id); },
});
for (const id of ['elisa', 'browser']) {
  const card = element('article', {'data-mini-card': id}, miniStack);
  element('button', {'data-mini-restore': id}, card).addEventListener('click', () => { sourceRestores++; sandbox.openApp(id); });
}
vm.createContext(sandbox);
// Run the actual expanded Quick launch implementation, not a second fake policy.
vm.runInContext(fs.readFileSync(require.resolve('../dist/apps-quick-launch.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(require.resolve('../dist/background-services.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(require.resolve('../dist/background-apps.js'), 'utf8'), sandbox);
const nativeQuick = document.querySelector('#appsQuickLaunch');
const nativeIds = document.querySelectorAll('[id]').length;
vm.runInContext(fs.readFileSync(require.resolve('../dist/panel-compact.js'), 'utf8'), sandbox);
const api = sandbox.SpatialPanelCompact.create({registry, openWidget: (id, anchor) => openedWidgets.push([id, anchor]), onChange: () => layoutChanges++});
const appPanel = element('aside', {class: 'desktop-panel', 'data-mode': 'compact', 'data-edge': 'left'}, document);
const appHost = element('div', {}, appPanel), clockHost = element('div', {}, document), controlHost = element('div', {}, document), otherHost = element('div', {}, document);
assert.equal(api.mount('apps', appHost), true); assert.equal(api.mount('clock', clockHost), true); assert.equal(api.mount('controls', controlHost), false); assert.equal(api.mount('assistant', otherHost), false);
assert.equal(api.mount('apps', appHost), true); assert.equal(appHost.children.length, 1); assert.equal(calls.length, 0, 'Mount and sync do not create or change native windows');
assert.deepEqual([apps.parentElement, clock.parentElement, controls.parentElement], nativeParents, 'Expanded source stays mounted in its original location');
const appView = appHost.children[0];
const taskButtons = () => appView.querySelector('.panel-compact-tasks').children;
const launchButtons = () => appView.querySelector('.panel-compact-pins').children;
const wheel = (target, properties = {}) => {
  const event = {target, deltaX: 0, deltaY: 60, deltaMode: 0, defaultPrevented: false, propagationStopped: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.propagationStopped = true; }, ...properties};
  for (const listener of windowListeners.filter(listener => listener.type === 'wheel')) listener.callback(event);
  return event;
};
assert(windowListeners.some(listener => listener.type === 'wheel' && listener.options.capture && listener.options.passive === false), 'Parked owns wheel before document-capture desktop navigation');
assert.deepEqual(appView.children.map(node => node.dataset.appSection), ['quick-launch', 'parked', 'background']);
assert.equal(appView.querySelector('.panel-compact-overview'), null, 'Start belongs to its own panel icon, without a duplicate in Apps');
assert.equal(api.measure('apps', true), 272, 'Four launchers and two parked icons reserve only their six icons and one group separator');
assert.deepEqual(taskButtons().map(node => node.dataset.panelTask), ['elisa', 'browser'], 'Parked order matches expanded cards, even when hotbar numbering differs');
assert.deepEqual(launchButtons().map(node => node.dataset.panelLaunch), ['notes', 'browser', 'settings', 'steam'], 'Quick launch keeps every native favorite even when its app is open or parked');
assert.equal(taskButtons()[0].dataset.windowState, 'minimized'); assert(taskButtons()[0].classList.contains('is-parked'));
assert.equal(taskButtons()[0].querySelector('.panel-compact-shortcut').textContent, '3'); assert.equal(taskButtons()[1].querySelector('.panel-compact-shortcut').textContent, '2');
assert.equal(taskButtons()[0].getAttribute('aria-keyshortcuts'), 'Meta+3');
assert.equal(launchButtons()[0].querySelector('.panel-compact-state'), null, 'Quick launch does not pretend to be a running-window indicator');
const clickApps = (target, shiftKey = false) => appView.events.click[0]({target, shiftKey, preventDefault() {}, stopPropagation() {}});
const compactButton = id => launchButtons().find(node => node.dataset.panelLaunch === id);
const nativeButton = id => nativeQuick.querySelectorAll('[data-quick-launch-app]').find(node => node.dataset.quickLaunchApp === id);
function compareQuick(id, state, shiftKey) {
  sandbox.appState[id] = state; sandbox.SpatialAppsQuickLaunch.refresh(); api.sync(); calls.length = 0;
  apps.inert = false; nativeQuick.events.click[0]({target: nativeButton(id), shiftKey}); const expected = JSON.parse(JSON.stringify(calls));
  sandbox.appState[id] = state; sandbox.SpatialAppsQuickLaunch.refresh(); api.sync(); calls.length = 0;
  apps.inert = true; clickApps(compactButton(id), shiftKey); assert.deepEqual(JSON.parse(JSON.stringify(calls)), expected, 'Compact uses exact expanded Quick launch command for ' + id + '/' + state + '/' + shiftKey);
  assert.equal(compactButton(id).getAttribute('aria-label'), nativeButton(id).getAttribute('aria-label'));
}
for (const state of ['closed', 'open', 'minimized']) for (const shift of [false, true]) compareQuick('browser', state, shift);
compareQuick('settings', 'open', true); assert.deepEqual(calls.at(-1), ['launch', 'settings'], 'Settings keeps the native no-duplicate policy even with Shift');
compareQuick('steam', 'open', true); assert.deepEqual(calls.map(call => call[0]), ['desktop', 'open'], 'Single-instance launcher returns to its owning desktop before opening');
sandbox.appState.browser = 'minimized'; sandbox.appState.elisa = 'minimized'; api.sync();
const parked = taskButtons().find(node => node.dataset.panelTask === 'browser'); calls.length = 0; clickApps(parked, true);
assert.deepEqual(calls, [['open', 'browser']]); assert.equal(sourceRestores, 1, 'Compact clicks the original expanded Unpark button; Shift keeps the same primary action');
assert.equal(taskButtons().some(node => node.dataset.panelTask === 'browser'), false, 'Restored window disappears from Parked rather than becoming an alternate open-window taskbar');
assert.equal(launchButtons().some(node => node.dataset.panelLaunch === 'browser'), true);
const staleParked = taskButtons()[0]; sandbox.activeWorkspace = 'work'; calls.length = 0; clickApps(staleParked); assert.equal(calls.length, 0, 'Old-Workspace parked controls cannot act in another Workspace');
assert.deepEqual(launchButtons().map(node => node.dataset.panelLaunch), ['notes']);
const beforeBlocked = calls.length; blocked = true; clickApps(compactButton('notes')); assert.equal(calls.length, beforeBlocked); blocked = false;
permitted = false; clickApps(compactButton('notes')); assert.equal(calls.length, beforeBlocked); permitted = true;
assert.equal(document.querySelectorAll('[id]').length, nativeIds, 'Compact views introduce no duplicate native IDs');
// Background entries are not open/minimized windows. Exercise the actual
// close-to-service command and native delegated controls using compact buttons.
const backgroundButtons = () => appView.querySelector('.panel-compact-background').children;
const serviceIds = () => sandbox.SpatialBackgroundApps.snapshot().items.map(service => service.id);
const compactBackground = id => backgroundButtons().find(button => button.dataset.backgroundOpen === id);
const nativeBackground = id => backgroundRow.querySelectorAll('[data-background-open]').find(button => button.dataset.backgroundOpen === id);
const backgroundObservation = observations.find(observer => observer.targets.some(entry => entry.node === backgroundRow));
assert(backgroundObservation, 'Native background visibility and progress updates trigger a compact refresh');
sandbox.activeWorkspace = 'general'; api.sync();
const beforeBackground = api.measure('apps', true);
const beforeBackgroundLayouts = layoutChanges;
sandbox.closeApp('steam'); backgroundObservation.callback(); backgroundObservation.callback();
assert.equal(frames.size, 1, 'Background mutations coalesce into one compact refresh');
for (const [id, callback] of frames) { frames.delete(id); callback(); }
assert.equal(layoutChanges, beforeBackgroundLayouts + 1, 'A newly added background service requests one layout update');
api.sync(); api.sync();
assert.equal(layoutChanges, beforeBackgroundLayouts + 1, 'Unchanged resync does not request redundant layout updates');
assert.equal(sandbox.appState.steam, 'closed', 'Steam closes its window while its download continues independently');
const steamService = serviceIds()[0]; assert(steamService);
assert.deepEqual(backgroundButtons().map(button => button.dataset.backgroundOpen), [steamService]);
assert.equal(compactBackground(steamService).dataset.windowState, 'background');
assert.equal(compactBackground(steamService).getAttribute('aria-label'), nativeBackground(steamService).getAttribute('aria-label'));
assert.equal(compactBackground(steamService).getAttribute('aria-controls'), 'backgroundAppPopup');
assert.equal(api.measure('apps', true) - beforeBackground, 52, 'A new Background section adds one native icon plus its gap and divider');
assert.equal(api.measure('apps', true), api.measure('apps', false), 'Both orientations measure the same complete strip');
const elisaModel = sandbox.appWindowModel('elisa'); Object.assign(elisaModel, {playing: true, index: 0, tracks: [{title: 'Retained song'}]}); sandbox.appState.elisa = 'open';
sandbox.closeApp('elisa'); api.sync();
assert.equal(backgroundButtons().length, 2, 'All background services are projected, not just appInfo open/minimized entries');
assert.deepEqual(backgroundButtons().map(button => button.dataset.backgroundOpen), backgroundRow.querySelectorAll('[data-background-open]').map(button => button.dataset.backgroundOpen), 'Background service order matches expanded Apps');
assert.equal(taskButtons().some(button => button.dataset.panelTask === 'elisa'), false, 'Background music does not produce a duplicate parked card');
calls.length = 0; compactBackground(steamService).click();
assert.equal(backgroundPopup.hidden, false, 'Compact click opens the original native controls popup');
assert.equal(backgroundPopup.querySelector('h2').textContent, 'Steam');
assert.equal(backgroundContent.querySelector('progress').value, 84);
assert.equal(calls.length, 0, 'Viewing background controls does not create an extra window');
const context = sandbox.contextMenuDescriptor(compactBackground(steamService));
assert.equal(context.backgroundService, steamService); assert.equal(context.background, true, 'Native context commands retain the actual service identity');
sandbox.activeWorkspace = 'work'; sandbox.renderWorkspace(); api.sync();
assert.equal(backgroundPopup.hidden, true, 'Changing Workspace closes native controls before another session action');
assert.equal(backgroundButtons().length, 2, 'System-wide background activity remains visible across Workspaces');
assert.equal(taskButtons().length, 0, 'Previous Workspace parked windows remain isolated');
compactBackground(steamService).click(); calls.length = 0; backgroundRestore.click(); api.sync();
const restoredSteam = calls.find(call => call[0] === 'open')?.[1];
assert(restoredSteam?.startsWith('steam--'));
assert.equal(sandbox.appInfo[restoredSteam].workspace, 'work', 'Open window here restores into the current Workspace');
assert.equal(sandbox.windowMembership.work[restoredSteam], null);
assert.equal(windowModels.work[restoredSteam].download.received, 84, 'Native restore preserves the service session');
assert.equal(windowModels.work[restoredSteam].download.active, true);
assert.equal(windowModels.general.steam.download.active, false, 'Closed source session does not also run its own download');
assert.equal(serviceIds().includes(steamService), false); assert.equal(compactBackground(steamService), undefined, 'Consumed service disappears from compact Apps');
assert.equal(backgroundButtons().length, 1, 'Restoring Steam leaves the independent music service intact');
sandbox.closeApp(restoredSteam); api.sync();
const nextSteam = sandbox.SpatialBackgroundApps.snapshot().items.find(service => service.kind === 'steam').id;
sandbox.activeWorkspace = 'general'; sandbox.renderWorkspace(); api.sync();
assert(compactBackground(nextSteam), 'A service detached in another Workspace remains available system-wide');
compactBackground(nextSteam).dispatch('auxclick', {button: 1}); api.sync();
assert.equal(serviceIds().includes(nextSteam), false, 'Compact middle click uses the native force-quit command');
assert.equal(sandbox.appState[restoredSteam], 'closed');
compactBackground(serviceIds()[0]).dispatch('auxclick', {button: 1}); api.sync();
assert.equal(backgroundButtons().length, 0); assert.equal(backgroundRow.hidden, true);
// Quick launch and Background are fixed groups. Parked retains every native
// action, but its preferred viewport stops growing after three icons.
const parkedObservation = observations.find(observer => observer.targets.some(entry => entry.node === miniStack));
const flushParked = () => { parkedObservation.callback(); parkedObservation.callback(); for (const [id, callback] of frames) { frames.delete(id); callback(); } };
const addParked = number => {
  const id = 'parked-test-' + number;
  sandbox.appInfo[id] = {label: 'Parked test ' + number, base: 'notes', workspace: 'general'};
  sandbox.appState[id] = 'minimized'; orders.general.push(id);
  const card = element('article', {'data-mini-card': id}, miniStack);
  element('button', {'data-mini-restore': id}, card).addEventListener('click', () => { sourceRestores++; sandbox.openApp(id); });
  return id;
};
api.sync(); assert.equal(taskButtons().length, 0);
const emptyParkedPreferred = api.measure('apps', true), emptyParkedMinimum = api.measureMin('apps', true);
assert.equal(emptyParkedMinimum, emptyParkedPreferred, 'Empty Parked reserves no viewport or separator');
assert.equal(emptyParkedPreferred, 176, 'A single Quick launch group has no leading separator or Start slot');
const firstParked = addParked(1), beforeFirstParkedLayouts = layoutChanges; flushParked();
assert.equal(api.measure('apps', true), emptyParkedPreferred + 52);
assert.equal(api.measureMin('apps', true), emptyParkedMinimum + 52, 'Minimum reserves exactly one usable Parked icon');
assert.equal(layoutChanges, beforeFirstParkedLayouts + 1);
addParked(2); addParked(3); flushParked();
const threeParkedPreferred = api.measure('apps', true), threeParkedMinimum = api.measureMin('apps', true);
assert.equal(threeParkedPreferred, emptyParkedPreferred + 52 + 88, 'Preferred Parked viewport contains three icons');
assert.equal(threeParkedMinimum, emptyParkedMinimum + 52);
const beforeLongParkedLayouts = layoutChanges;
for (let number = 4; number <= 40; number++) addParked(number);
flushParked();
assert.equal(taskButtons().length, 40, 'Long Parked lists retain every native action for their own scroll region');
assert.equal(api.measure('apps', true), threeParkedPreferred, 'Parked growth beyond three cannot grow or collapse the whole Apps strip');
assert.equal(api.measureMin('apps', true), threeParkedMinimum);
assert.equal(layoutChanges, beforeLongParkedLayouts, 'Overflow-only Parked growth does not request a redundant layout');
assert.equal(launchButtons().length, 4, 'All Quick launch actions remain outside the long Parked list');
const parkedGroup = appView.querySelector('.panel-compact-tasks');
Object.assign(parkedGroup, {clientWidth: 128, scrollWidth: 2000, scrollLeft: 0, clientHeight: 128, scrollHeight: 2000, scrollTop: 0});
appPanel.dataset.edge = 'bottom';
let parkedScroll = wheel(taskButtons()[0]);
assert.equal(parkedGroup.scrollLeft, 60); assert(parkedScroll.defaultPrevented && parkedScroll.propagationStopped, 'Ordinary vertical wheel scrolls horizontal Parked before desktop navigation can consume it');
wheel(taskButtons()[0], {deltaX: -20, deltaY: 5}); assert.equal(parkedGroup.scrollLeft, 40, 'Horizontal trackpad motion retains its axis');
wheel(taskButtons()[0], {deltaY: 2, deltaMode: 1}); assert.equal(parkedGroup.scrollLeft, 72, 'Line-mode wheels use native sixteen-pixel steps');
wheel(taskButtons()[0], {deltaY: 1, deltaMode: 2}); assert.equal(parkedGroup.scrollLeft, 200, 'Page-mode wheel uses the Parked viewport');
parkedGroup.scrollLeft = 1872; parkedScroll = wheel(taskButtons()[0]);
assert.equal(parkedGroup.scrollLeft, 1872); assert(parkedScroll.defaultPrevented && parkedScroll.propagationStopped, 'Horizontal edges keep wheel ownership instead of changing desktops');
appPanel.dataset.edge = 'left'; parkedGroup.scrollTop = 1872;
parkedScroll = wheel(taskButtons()[0]);
assert(parkedScroll.propagationStopped && !parkedScroll.defaultPrevented, 'Vertical Parked keeps native default scrolling, including at its edge');
assert.equal(parkedGroup.scrollTop, 1872, 'Vertical scrolling is left to the browser default');
parkedScroll = wheel(taskButtons()[0], {shiftKey: true});
assert(!parkedScroll.propagationStopped && !parkedScroll.defaultPrevented, 'Shift-wheel in a vertical panel keeps native column navigation');
appPanel.dataset.edge = 'bottom';
for (const properties of [{metaKey: true}, {ctrlKey: true}, {altKey: true}, {getModifierState: key => key === 'OS'}]) {
  parkedScroll = wheel(taskButtons()[0], properties); assert(!parkedScroll.propagationStopped && !parkedScroll.defaultPrevented, 'Modified desktop/window shortcuts retain their wheel');
}
sandbox.SpatialDemoSuper = {held: () => true}; parkedScroll = wheel(taskButtons()[0]); assert(!parkedScroll.propagationStopped); delete sandbox.SpatialDemoSuper;
for (const state of ['manualWindowInteraction', 'tileInteraction']) { sandbox[state] = true; assert(!wheel(taskButtons()[0]).propagationStopped, 'Held-window wheel remains owned by ' + state); sandbox[state] = false; }
const draggingFrame = element('article', {class: 'app-frame is-dragging'}, document);
assert(!wheel(taskButtons()[0]).propagationStopped, 'Native dragging-frame wheel gestures are preserved'); draggingFrame.remove();
assert(!wheel(launchButtons()[0]).propagationStopped, 'Quick launch does not acquire Parked scrolling');
assert(!wheel(overview).propagationStopped, 'The separate native Start control does not acquire Parked scrolling');
appPanel.dataset.edge = 'left';
const lastParked = taskButtons().find(button => button.dataset.panelTask === 'parked-test-40'); calls.length = 0; clickApps(lastParked);
assert.deepEqual(calls, [['open', 'parked-test-40']], 'Last item in the long Parked viewport keeps the native Unpark action');
assert.equal(taskButtons().length, 39);
assert.equal(layoutChanges, beforeLongParkedLayouts, 'Unparking beyond the visible viewport keeps fixed allocations stable');
sandbox.workspaceProfiles.general.favorites.push(['fixed-launcher']); sandbox.appInfo['fixed-launcher'] = {label: 'Fixed launcher'};
sandbox.SpatialAppsQuickLaunch.refresh(); api.sync();
assert.equal(api.measure('apps', true), threeParkedPreferred + 44);
assert.equal(api.measureMin('apps', true), threeParkedMinimum + 44);
assert.equal(layoutChanges, beforeLongParkedLayouts + 1, 'A fixed launcher changes both required extents even when Parked is long');
const fixedAddedPreferred = api.measure('apps', true), fixedAddedMinimum = api.measureMin('apps', true), fixedAddedLayouts = layoutChanges;
sandbox.appState.steam = 'open'; windowModels.general.steam = JSON.parse(JSON.stringify(originalSteamModel)); sandbox.closeApp('steam'); api.sync();
assert.equal(api.measure('apps', true), fixedAddedPreferred + 52);
assert.equal(api.measureMin('apps', true), fixedAddedMinimum + 52);
assert.equal(layoutChanges, fixedAddedLayouts + 1, 'Background always changes fixed demand, independently of Parked overflow');
assert(!wheel(compactBackground(serviceIds()[0])).propagationStopped, 'Background controls do not acquire Parked scrolling');
compactBackground(serviceIds()[0]).dispatch('auxclick', {button: 1}); api.sync();
for (const button of [...taskButtons()]) if (button.dataset.panelTask !== firstParked) sandbox.appState[button.dataset.panelTask] = 'closed';
flushParked();
assert.equal(taskButtons().length, 1);
const oneParkedLayouts = layoutChanges;
sandbox.appState[firstParked] = 'closed'; flushParked();
assert.equal(api.measure('apps', true), api.measureMin('apps', true));
assert.equal(layoutChanges, oneParkedLayouts + 1, 'Removing the last Parked icon releases its viewport and divider');
sandbox.appState[firstParked] = sandbox.appState['parked-test-2'] = 'minimized'; api.sync();
const beforeMinimumOnly = {preferred: api.measure('apps', true), minimum: api.measureMin('apps', true), callbacks: layoutChanges};
sandbox.appInfo['second-fixed-launcher'] = {label: 'Another fixed launcher'}; sandbox.workspaceProfiles.general.favorites.push(['second-fixed-launcher']);
sandbox.appState['parked-test-2'] = 'closed'; sandbox.SpatialAppsQuickLaunch.refresh(); api.sync();
assert.equal(api.measure('apps', true), beforeMinimumOnly.preferred, 'Replacing a second parked slot with a fixed launcher can keep preferred size unchanged');
assert.equal(api.measureMin('apps', true), beforeMinimumOnly.minimum + 44);
assert.equal(layoutChanges, beforeMinimumOnly.callbacks + 1, 'A minimum-only change still requests layout');
const clockButton = clockHost.children[0]; assert.equal(clockButton.querySelector('.panel-compact-time').textContent, '12:34');
const beforeClockLayouts = layoutChanges;
liveTime.textContent = '13:05'; api.sync(); assert.equal(clockButton.querySelector('.panel-compact-time').textContent, '13:05');
assert.equal(layoutChanges, beforeClockLayouts, 'Clock and label refreshes do not request strip layout updates');
clockButton.click(); assert.equal(openedWidgets.at(-1)[0], 'calendar'); assert.equal(openedWidgets.at(-1)[1], clockButton);
assert.equal(clock.getAttribute('role'), 'button'); assert.equal(clock.getAttribute('tabindex'), '0');
clock.click(); assert.equal(openedWidgets.at(-1)[0], 'calendar'); assert.equal(openedWidgets.at(-1)[1], clock, 'Expanded clock uses the same Calendar command');
for (const key of ['Enter', ' ']) { let prevented = false; clock.events.keydown[0]({key, preventDefault() { prevented = true; }, stopPropagation() {}}); assert(prevented); assert.equal(openedWidgets.at(-1)[0], 'calendar'); }
assert.equal(controlHost.children.length, 0, 'Controls use the generic applet opening unchanged native content');
assert.equal(wifi.getAttribute('aria-pressed'), 'true'); assert.equal(sound.getAttribute('aria-pressed'), 'true', 'Rendering compact Controls cannot mute or toggle anything');
assert.equal(api.measure('clock', true), 48); assert.equal(api.measure('clock', false), 76); assert.equal(api.measure('controls', true), 44); assert.equal(api.measure('controls', false), 44);
assert.equal(api.measureMin('clock', true), 48); assert.equal(api.measureMin('clock', false), 76); assert.equal(api.measureMin('controls', true), 44);
const clockObservation = observations.find(observer => observer.targets.some(entry => entry.node === clock));
clockObservation.callback(); clockObservation.callback(); assert.equal(frames.size, 1);
for (const [id, callback] of frames) { frames.delete(id); callback(); }
api.destroy(); assert(observations.every(observer => observer.disconnected)); assert.equal(appHost.children.length, 0); assert.equal(clock.getAttribute('role'), null); assert.equal(clock.events.click.length, 0); assert.equal(windowListeners.filter(listener => listener.type === 'wheel').length, 0, 'Destroy removes its capture listener');
console.log('Compact parity passed: native Quick launch/Parked commands and order, retained background sessions across Workspaces, fixed launchers/background plus a bounded 0/1/40-item Parked viewport, preferred/minimum layout callbacks, shared Clock and generic Controls.');
