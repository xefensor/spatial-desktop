const assert = require('node:assert/strict');
const {create, catalog} = require('../dist/panel-content.js');

// A small DOM fixture checks native live-node migration and original actions.
// It implements only the ordinary selectors used by this adapter and fixture.
class Element {
  constructor(tag = 'div', attributes = {}) {
    this.tagName = tag.toUpperCase(); this.attributes = {...attributes};
    this.children = []; this.parentElement = null; this.hidden = false;
    this.textContent = ''; this.events = {}; this.dataset = {}; this.disabled = false;
    for (const [name, value] of Object.entries(attributes)) if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  get className() { return this.attributes.class || ''; }
  set className(value) { this.attributes.class = value; }
  get classList() { return {add: value => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), value])].join(' '); }, contains: value => this.className.split(/\s+/).includes(value)}; }
  get firstElementChild() { return this.children[0] || null; }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(...nodes) {
    for (const child of nodes) {
      if (child.parentElement) child.parentElement.children.splice(child.parentElement.children.indexOf(child), 1);
      child.parentElement = this; this.children.push(child);
    }
  }
  insertBefore(child, before) {
    this.append(child);
    if (before) { this.children.pop(); this.children.splice(this.children.indexOf(before), 0, child); }
  }
  contains(node) { for (; node; node = node.parentElement) if (node === this) return true; return false; }
  matches(selector) {
    const tokens = selector.trim().replace(/>/g, ' > ').split(/\s+/);
    const match = (node, token) => {
      const tag = token.match(/^[a-z][a-z\d-]*/i)?.[0];
      if (tag && node.tagName !== tag.toUpperCase()) return false;
      for (const part of token.matchAll(/#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/g)) {
        if (part[1] && node.attributes.id !== part[1]) return false;
        if (part[2] && !node.className.split(/\s+/).includes(part[2])) return false;
        if (part[3] && (!(part[3] in node.attributes) || (part[4] !== undefined && node.attributes[part[3]] !== part[4]))) return false;
      }
      return true;
    };
    let node = this, index = tokens.length - 1;
    if (!match(node, tokens[index--])) return false;
    while (index >= 0) {
      if (tokens[index] === '>') {
        node = node.parentElement; index--;
        if (!node || !match(node, tokens[index--])) return false;
      } else {
        node = node.parentElement;
        while (node && !match(node, tokens[index])) node = node.parentElement;
        if (!node) return false; index--;
      }
    }
    return true;
  }
  querySelectorAll(selector) {
    const result = [], visit = node => { for (const child of node.children) { if (child.matches(selector)) result.push(child); visit(child); } };
    visit(this); return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  addEventListener(type, callback) { (this.events[type] ||= []).push(callback); }
}
class Document extends Element { createElement(tag) { return new Element(tag); } }
const element = (tag, attributes, parent) => { const node = new Element(tag, attributes); parent?.append(node); return node; };
const document = new Document('body');
const apps = element('aside', {'data-widget-source': 'apps'}, document);
const appsHeader = document;
const overview = element('button', {id: 'allAppsToggle'}, appsHeader);
let overviewClicks = 0; overview.addEventListener('click', () => overviewClicks++);
const appsBody = element('div', {class: 'apps-widget-body'}, apps);
const appsScroll = element('div', {class: 'apps-scroll-region'}, appsBody);
const quickLaunchScope = element('small', {id: 'appsQuickLaunchScope'}, appsScroll);
const parkedScope = element('small', {id: 'parkedScope'}, appsScroll);
const parkedCount = element('span', {id: 'miniCount'}, appsScroll); parkedCount.textContent = '0';
const files = element('aside', {'data-widget-source': 'files'}, document);
const filesHeader = element('div', {class: 'file-project-actions-source'}, files);
const manage = element('button', {id: 'manageProjectButton'}, filesHeader);
const pack = element('button', {'data-open-package': 'project', class: 'project-pack-key'}, filesHeader);
const close = element('button', {id: 'closeProjectButton'}, filesHeader);
let closes = 0; close.addEventListener('click', () => closes++);
const memory = element('section', {id: 'workingMemory'}, files);
const toolbar = element('div', {class: 'memory-toolbar'}, memory);
const addNote = element('button', {'data-memory-action': 'add'}, toolbar);
const addFiles = element('button', {'data-memory-action': 'files'}, toolbar);
const nativeFileInput = element('input', {'data-memory-files': ''}, toolbar); nativeFileInput.hidden = true;
const browse = element('div', {class: 'memory-browse'}, memory);
const searchLabel = element('label', {class: 'library-search'}, browse);
const fileQuery = element('input', {'data-memory-query': ''}, searchLabel); fileQuery.value = 'draft filter';
const memoryFilter = element('select', {'data-memory-filter': ''}, browse); memoryFilter.value = 'all';
const facets = element('details', {class: 'memory-facets'}, memory);
const facetSummary = element('summary', {}, facets);
const facetCount = element('small', {'data-facet-count': ''}, facetSummary);
const facetBody = element('div', {}, facets);
const clearFilters = element('button', {'data-history-reset': ''}, facetBody);
const assistant = element('aside', {'data-widget-source': 'assistant'}, document);
const chatContent = element('div', {class: 'ai-content'}, assistant);
const chatOptions = element('details', {class: 'ai-chat-settings'}, chatContent);
element('summary', {}, chatOptions);
const chatSettings = element('div', {class: 'ai-chat-settings-body'}, chatOptions);
const saveFolder = element('div', {class: 'ai-folder'}, chatSettings); element('label', {}, saveFolder);
const displayControl = element('section', {'data-display-control': ''}, chatContent);
const permission = element('label', {class: 'display-assistant-permission'}, displayControl);
const permissionInput = element('input', {'data-display-assistant-allowed': ''}, permission); permissionInput.checked = false;
const permissionScope = element('small', {class: 'display-permission-scope', id: 'displayAssistantPermissionScope'}, displayControl);
const displayStatus = element('div', {class: 'display-control-heading'}, displayControl);
const takeover = element('button', {'data-display-action': 'takeover'}, displayStatus);
const resume = element('button', {'data-display-action': 'resume'}, displayStatus);
const prompt = element('textarea', {id: 'aiPrompt'}, chatContent); prompt.value = 'My unsent draft';
const transcript = element('div', {id: 'aiTranscript'}, chatContent); transcript.textContent = 'Existing conversation';
const notice = element('small', {id: 'aiDemoNotice'}, chatContent);
element('small', {}, element('p', {class: 'ai-empty'}, chatContent));
const system = element('aside', {'data-widget-source': 'system'}, document);
const systemHeader = system;
const settings = element('button', {'data-open-settings': ''}, systemHeader);
let settingsClicks = 0; settings.addEventListener('click', () => settingsClicks++);
const projectScope = element('section', {id: 'systemScopeProject'}, system); projectScope.hidden = true;
const desktopScope = element('section', {id: 'systemScopeDesktop'}, system);
const requests = element('div', {class: 'system-desktop-requests'}, desktopScope);
const request = element('button', {'data-system-request': 'notes'}, requests);
const projectPlans = element('div', {class: 'system-project-plan'}, projectScope); projectPlans.hidden = true;
const agenda = element('div', {class: 'static-widget-stack system-agenda-stack'}, system);
const calendar = element('section', {class: 'calendar-widget system-widget'}, agenda);
const calendarTitle = element('h2', {}, calendar);
const devices = element('details', {class: 'system-device-details'}, system);
const stack = element('div', {class: 'static-widget-stack system-device-stack'}, devices);
const phone = element('section', {class: 'system-widget'}, stack); phone.hidden = true;
for (const [className, id] of [['', 'notificationWidget'], ['', 'desktopClipboardWidget'], ['system-focus-controls', ''], ['time-block', ''], ['quick-settings', ''], ['desktop-system-shortcuts', ''], ['', 'workspaceNotificationsWidget'], ['', 'systemWideNotificationWidget']]) element('section', {class: className, id}, system);
const timer = element('section', {id: 'timerWidget'}, system.querySelector('.system-focus-controls')); timer.hidden = true;
const before = system.querySelectorAll('.static-widget-stack>.system-widget');
const oldObserver = global.MutationObserver, oldOpenApp = global.openApp;
const observers = [];
global.MutationObserver = class { constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); } observe(target, options) { this.targets.push({target, options}); } };
try {
  const registry = create(document);
  assert.equal(registry.size, 14); assert.equal(catalog.length, 14); assert.equal(create(document), registry);
  const notificationCount = element('span', {id: 'notificationCount'}, registry.get('notifications').source);
  notificationCount.textContent = '3'; assert.equal(registry.get('notifications').badge(), 3);
  notificationCount.textContent = '0'; assert.equal(registry.get('notifications').badge(), 0, 'Dismissed notifications clear the icon count');
  assert.equal(registry.get('requests').badge(), 1);
  const otherBadges = element('nav', {id: 'workspaceNotificationBadges'}, registry.get('workspace-alerts').source);
  for (const count of [3, 4]) element('small', {}, element('button', {}, otherBadges)).textContent = String(count);
  element('span', {id: 'systemWideNotificationCount'}, registry.get('workspace-alerts').nodes[1]).textContent = '5';
  assert.equal(registry.get('workspace-alerts').badge(), 12, 'Alert badge counts unread items across Workspaces, not Workspace buttons');
  assert.equal(registry.get('calendar').nodes[0], agenda);
  const systemShortcuts = system.querySelector('.desktop-system-shortcuts');
  assert.equal(registry.get('controls').nodes[1], systemShortcuts);
  assert.equal(systemShortcuts.querySelector('[data-open-settings]'), settings, 'Settings stays with the system links as the original live action');
  assert.equal(registry.get('controls').nodes.includes(settings), false, 'Moving the widget cannot pull Settings back out onto a separate row');
  assert.equal(settings.children.at(-1).textContent, 'Settings', 'The settings action has a visible name');
  settings.events.click[0](); assert.equal(settingsClicks, 1, 'Grouping preserves the original Settings listener');
  assert.equal(registry.get('launcher').source, overview, 'The launcher owns the original native Overview action');
  assert.deepEqual(registry.get('launcher').nodes, [overview]);
  assert.equal(registry.get('launcher').label, 'Overview');
  assert.deepEqual(registry.get('launcher').sourceMetadata, {selector: '#allAppsToggle', scope: 'Workspace'});
  assert.equal(appsBody.querySelector('.panel-app-tools'), null, 'Apps has no duplicate launcher toolbar');
  assert.equal(appsBody.children[0], appsScroll, 'Quick launch keeps its full content width');
  overview.events.click[0](); assert.equal(overviewClicks, 1);
  const actions = browse.querySelector('.panel-file-actions');
  assert(actions); assert.equal(actions.hidden, false);
  assert.equal(actions.querySelector('.panel-file-actions-menu .memory-toolbar'), toolbar, 'One Actions disclosure owns the original creation toolbar');
  assert.equal(toolbar.querySelector('[data-memory-action="add"]'), addNote);
  assert.equal(toolbar.querySelector('[data-memory-action="files"]'), addFiles);
  assert.equal(toolbar.querySelector('[data-memory-files]'), nativeFileInput);
  assert.deepEqual(actions.querySelector('.panel-file-project-actions').children, [manage, pack, close]);
  assert.equal(close.parentElement.parentElement, toolbar);
  assert.equal(actions.querySelector('.panel-project-actions'), null, 'No nested project overflow menu');
  actions.open = true; actions.events.click[0]({target: addNote}); assert.equal(actions.open, false);
  close.events.click[0](); assert.equal(closes, 1, 'Close project keeps its original session action');
  assert.equal(manage.children.at(-1).textContent, 'Manage project');
  assert.equal(pack.children.at(-1).textContent, 'Pack project');
  assert.equal(close.children.at(-1).textContent, 'Close project');
  for (const control of [manage, pack, close]) control.disabled = true;
  const availability = observers.find(observer => observer.targets.some(entry => entry.target === manage));
  availability.callback(); assert.equal(actions.querySelector('.panel-file-project-actions').hidden, true);
  assert.equal(actions.hidden, false, 'Workspace file creation stays available without a Project');
  manage.disabled = false; availability.callback(); assert.equal(actions.querySelector('.panel-file-project-actions').hidden, false);
  assert.equal(facetBody.querySelector('[data-memory-filter]'), memoryFilter, 'The existing Show filter moves into Filters');
  assert.equal(browse.querySelector('[data-memory-query]'), fileQuery); assert.equal(fileQuery.value, 'draft filter');
  const pinnedState = facets.querySelector('.panel-file-pinned-state'); assert.equal(pinnedState.hidden, true);
  memoryFilter.value = 'pinned'; memoryFilter.events.change[0](); assert.equal(pinnedState.hidden, false);
  facets.events.click[0]({target: clearFilters}); assert.equal(memoryFilter.value, 'all'); assert.equal(pinnedState.hidden, true);
  const access = displayControl.querySelector('.panel-assistant-access');
  assert.equal(access.querySelector('[data-display-assistant-allowed]'), permissionInput);
  assert.equal(access.querySelector('#displayAssistantPermissionScope'), permissionScope);
  assert.equal(access.querySelector('.panel-assistant-access-state').textContent, 'Off');
  assert.equal(displayStatus.parentElement, displayControl); assert.equal(takeover.parentElement, displayStatus); assert.equal(resume.parentElement, displayStatus);
  permissionInput.checked = true;
  observers.find(observer => observer.targets.some(entry => entry.target === displayControl)).callback();
  assert.equal(access.querySelector('.panel-assistant-access-state').textContent, 'Allowed');
  assert.equal(prompt.value, 'My unsent draft'); assert.equal(transcript.textContent, 'Existing conversation');
  assert.equal(notice.textContent, 'Scripted demo. Try “Make a checklist.”');
  assert(quickLaunchScope.classList.contains('panel-secondary-copy')); assert(parkedScope.classList.contains('panel-secondary-copy'));
  assert.equal(apps.dataset.panelParkedEmpty, 'true'); parkedCount.textContent = '1';
  observers.find(observer => observer.targets.some(entry => entry.target === parkedCount)).callback();
  assert.equal(apps.dataset.panelParkedEmpty, 'false');
  assert.equal(projectPlans.hidden, true); assert.equal(timer.hidden, true);
  projectScope.hidden = false;
  assert.equal(projectPlans.hidden, true, 'Reparenting never proxies retired scope visibility; native model owns it');
  for (const entry of registry.values()) element('div', {}, document).append(...entry.nodes);
  assert.equal(document.querySelectorAll('#allAppsToggle').length, 1, 'The separate launcher reuses one original native button');
  assert.equal(document.querySelector('#allAppsToggle'), overview);
  assert.equal(apps.querySelector('#allAppsToggle'), null, 'The launcher is independent of Apps content');
  overview.events.click[0](); assert.equal(overviewClicks, 2, 'Moving the launcher preserves its native action');
  assert.equal(system.querySelector('.calendar-widget h2'), null, 'Former parent cannot find widgets after native reparenting');
  assert.equal(desktopScope.querySelector('.system-desktop-requests'), null);
  assert.equal(system.querySelectorAll('.static-widget-stack>.system-widget').length, 0);
  assert.equal(system.querySelectorAll('#notificationWidget').length, 0);
  assert.equal(Object.hasOwn(system, 'querySelector'), false, 'Native ancestor queries are never patched');
  assert.equal(Object.hasOwn(desktopScope, 'querySelectorAll'), false);
  assert.equal(registry.get('calendar').source.dataset.widgetSource, 'calendar');
  assert.equal(registry.get('files').kind, 'widget');
  assert.equal(registry.get('calendar').kind, 'system');
} finally {
  if (oldObserver === undefined) delete global.MutationObserver; else global.MutationObserver = oldObserver;
  if (oldOpenApp === undefined) delete global.openApp; else global.openApp = oldOpenApp;
}
console.log('Panel content passed: 14 live widgets, a separate native launcher, live icon counts, original actions/listeners, disabled-state tracking, native unmodified ancestor queries and preserved dynamic visibility.');
