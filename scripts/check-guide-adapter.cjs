'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const G = require('../dist/spatial-guide.js');
const source = fs.readFileSync(path.join(__dirname, '../dist/guide-desktop.js'), 'utf8');
const dom = new JSDOM('<!doctype html><body><section id="spatialGuide"></section><section id="universalSearch" class="is-open"><input id="universalSearchInput"><div id="results"></div></section></body>', {pretendToBeVisual: true});
const w = dom.window, d = w.document, queue = [];
w.HTMLElement.prototype.getClientRects = function () {return this.closest('[hidden]') ? [] : [this.getBoundingClientRect()];};
const sandbox = {
  document: d, window: d.querySelector('#spatialGuide'),
  getComputedStyle: w.getComputedStyle.bind(w),
  $: (selector, root = d) => root.querySelector(selector),
  $$: (selector, root = d) => [...root.querySelectorAll(selector)],
  appState: {}, appInfo: {}, local: new Set(),
  isLocalApp: name => sandbox.local.has(name),
  setTimeout: callback => {queue.push(callback);}, check() {}, lastSignature: '',
  guide: {observeSearch: G.observeSearch, save() {}},
  model: null
};
const context = vm.createContext(sandbox);
const visible = source.slice(source.indexOf('  function visibleTarget('), source.indexOf('\n  function panelWidgetsForLesson('));
const targets = source.slice(source.indexOf('  function guideTargets('), source.indexOf('\n  function panelTargetContext('));
vm.runInContext(visible + targets, context, {filename: 'guide-live-targets.js'});

const apps = d.createElement('section'); apps.className = 'desktop-widget'; apps.dataset.widgetId = 'apps';
apps.innerHTML = '<div class="desktop-widget-content" hidden><nav id="appsQuickLaunch"><button data-quick-launch-app="notes">Notes</button><button data-quick-launch-app="browser">Browser</button></nav><section class="mini-section"><div id="miniStack"><article data-mini-card="notes--2"><button data-mini-restore="notes--2">Restore Notes</button></article><article data-mini-card="browser--1"><button data-mini-restore="browser--1">Restore Browser</button></article></div></section></div><button class="desktop-widget-summary" hidden>Apps</button><div class="desktop-widget-compact"><nav><button data-panel-launch="notes">Notes</button><button data-panel-launch="browser">Browser</button></nav><div><button data-panel-task="notes--2">Parked Notes</button><button data-panel-task="browser--1">Parked Browser</button></div></div>';
d.body.append(apps);
const find = selector => vm.runInContext('guideTargets(' + JSON.stringify(selector) + ')', context);
const ids = nodes => Array.from(nodes, node => node.dataset.panelTask || node.dataset.panelLaunch || node.dataset.quickLaunchApp || node.id);
assert.deepEqual(ids(find('#appsQuickLaunch [data-quick-launch-app="notes"]')), ['notes'], 'A hidden native launcher resolves to that same live compact launcher');
assert.deepEqual(ids(find('#appsQuickLaunch')), ['notes', 'browser'], 'A Quick launch group resolves only to its projected launchers');
assert.deepEqual(ids(find('#miniStack')), ['notes--2', 'browser--1'], 'A parked-window mission highlights restore icons, not new-window launchers');
assert.deepEqual(ids(find('[data-mini-restore="notes--2"]')), ['notes--2'], 'A specific parked window retains its own target');
apps.querySelector('.desktop-widget-compact').hidden = true; apps.querySelector('.desktop-widget-summary').hidden = false;
assert.equal(find('#miniStack')[0], apps.querySelector('.desktop-widget-summary'), 'An icon-only Apps widget points at its applet opener');
apps.querySelector('.desktop-widget-content').hidden = false;
assert.equal(find('#miniStack')[0], apps.querySelector('#miniStack'), 'An expanded native target remains the primary target');
apps.setAttribute('inert', ''); assert.equal(find('#miniStack').length, 0, 'Guide never highlights inert underlying controls'); apps.remove();

const listener = source.slice(source.indexOf('  function openedSearchTargets()'), source.indexOf("  document.addEventListener('pointerup', check);"));
assert(listener.includes('openedSearchTargets()'));
vm.runInContext(listener, context, {filename: 'guide-search-result-adapter.js'});
function search(name, action, {launchGuide = false, local = []} = {}) {
  sandbox.model = G.create({status: 'active', version: 9, lessonId: 'overview', done: []});
  sandbox.appState = {}; sandbox.appInfo = {}; sandbox.local = new Set(local);
  sandbox.window.hidden = true;
  const input = d.querySelector('#universalSearchInput'); input.value = 'notes';
  const result = d.createElement('button'); result.dataset[launchGuide ? 'searchLaunchApp' : 'searchOpenApp'] = name;
  d.querySelector('#results').replaceChildren(result);
  result.addEventListener('click', () => {action(); input.value = ''; result.remove();});
  result.click(); for (const callback of queue.splice(0)) callback();
  return sandbox.model;
}
let model = search('notes--2', () => {
  sandbox.appState['notes--2'] = 'open'; sandbox.appInfo['notes--2'] = {base: 'notes'};
}, {local: ['notes--2']});
assert(model.ready(), 'Selecting an existing independent instance completes search after its native action opens it');
model = search('notes', () => {
  sandbox.appState['notes--3'] = 'open'; sandbox.appInfo['notes--3'] = {base: 'notes'};
}, {local: ['notes--3']});
assert(model.ready(), 'An installed-app result also recognizes the new independent instance it launched');
model = search('notes--2', () => {
  sandbox.appState['notes--3'] = 'open'; sandbox.appInfo['notes--3'] = {base: 'notes'};
}, {local: ['notes--3']});
assert(!model.ready(), 'Opening a different instance cannot impersonate the selected existing window');
model = search('notes--2', () => {
  sandbox.appState['notes--2'] = 'open'; sandbox.appInfo['notes--2'] = {base: 'notes'};
});
assert(!model.ready(), 'A window left on another desktop or display does not count as a successful local result');
model = search('Spatial Guide', () => {sandbox.window.hidden = false;}, {launchGuide: true});
assert(model.ready(), 'The explicit Guide search action remains supported');
model = search('Spatial Guide', () => {}, {launchGuide: true}); assert(!model.ready(), 'A hidden Guide cannot count as opened');

// The live observer receives the selected bound conversation, rather than the
// Workspace snapshot's compatibility working-folder and attachment fields.
const AssistantContext = require('../dist/ai-context.js');
const chats = AssistantContext.create({}, {workspaces: () => ({general: {home: '/home/demo'}}), projects: () => ({practice: {root: '/home/demo/Projects/practice'}})});
chats.scope('general');
for (const [id, value] of [['timelineType', 'all'], ['timelineQuery', ''], ['timelineDay', '2026-10-21']]) {
  const input = d.createElement('input'); input.id = id; input.value = value; d.body.append(input);
}
sandbox.guide.observeContext = G.observeContext;
sandbox.model = G.create({status: 'active', version: 9, lessonId: 'project-app', done: []});
sandbox.model.state.practiceProject = 'practice';
sandbox.activeWorkspace = 'general'; sandbox.column = 'workspace'; sandbox.id = 'project-app';
sandbox.SpatialAIDesktop = {current: () => chats.session('general'), snapshot() {throw Error('Use the active bound chat for Guide validation');}};
sandbox.SpatialMemoryDesktop = {items: () => []};
sandbox.SpatialOverviewDesktop = {active: () => 'windows'};
const contextObserver = source.slice(source.indexOf("    if(['project-stash','ai-context','project-app','overview-navigation','timeline','timeline-task'].includes(id)){"), source.indexOf("    if(id==='timeline'&&model.state.timelineActivity"));
const observeChat = () => vm.runInContext(contextObserver, context, {filename: 'guide-selected-chat-adapter.js'});
observeChat();
sandbox.column = 'practice'; chats.scope('general', 'practice'); sandbox.model.mark('project-app-open');
observeChat(); assert(!sandbox.model.ready(), 'Entering a Project with its own chat still requires an explicit source');
chats.contextPreference('general', 'practice', true); observeChat(); assert(!sandbox.model.ready(), 'Automatic context is optional for the manual Guide exercise');
chats.add('general', {id: 'my-project-note', title: 'Project note', text: 'A useful source.', workspace: 'general', project: 'practice'});
observeChat(); assert(sandbox.model.ready(), 'The production adapter credits a real manual attachment in the selected Project chat');
w.close();
console.log('Guide adapter passed: compact targets, search-result identity, local launches, Guide visibility and selected immutable Project chats.');
