'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const G = require('../dist/spatial-guide.js');
const source = fs.readFileSync(path.join(__dirname, '../dist/guide-desktop.js'), 'utf8');
const dom = new JSDOM('<!doctype html><body><section id="spatialGuide"><header><button class="guide-key" data-guide-action="compact"></button></header><div class="guide-strip"><span class="guide-strip-meta"></span><p class="guide-strip-task"></p><button class="guide-strip-next"></button></div><div class="guide-content"></div></section></body>', {pretendToBeVisual: true});
const w = dom.window, d = w.document;
const model = G.create({status: 'active', version: 9, mode: 'repeat', lessonId: 'move-areas', chapter: 'move-areas', done: []});
const sandbox = {
  document: d, window: d.querySelector('#spatialGuide'), model,
  guide: {lessons: G.lessons, chapters: G.chapters, view: 'expanded', mission: G.mission, shouldCompact: G.shouldCompact},
  $: (selector, root = d) => root.querySelector(selector),
  $$: (selector, root = d) => [...root.querySelectorAll(selector)],
  escapeHtml: text => String(text ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
  icon: () => '<svg aria-hidden="true"></svg>',
  chapterLabel: () => 'Panels & widgets', clearHighlight() {}, prepareControlSemantics() {}, highlight() {}, positionGuide() {},
  tileSession: () => ({}), lastSignature: '', manuallyExpanded: false,
  setCompact: compact => sandbox.window.classList.toggle('is-compact', compact),
  check: () => sandbox.updateChecklist(),
};
const context = vm.createContext(sandbox);
vm.runInContext(source.slice(source.indexOf('  function guideProseMarkup('), source.indexOf('  function chapterLabel(')), context, {filename: 'guide-help-markup.js'});
vm.runInContext(source.slice(source.indexOf('  function updateChecklist('), source.indexOf('  function mark(')), context, {filename: 'active-guide-render.js'});
sandbox.render();
const content = d.querySelector('.guide-content');
const expected = (model.lesson.details ? 1 : 0) + (model.lesson.referenceSections || []).length + (model.lesson.usage ? 1 : 0);
assert(expected > 1, 'The real panel lesson contains useful reference help');
assert.equal(content.querySelectorAll('[data-guide-help]').length, expected, 'Active practice offers the same optional help sections as reference browsing');
assert.equal(content.querySelectorAll('.guide-explanation').length, 1, 'The short opening explanation is not duplicated');
assert.equal(content.querySelectorAll('.guide-task').length, 1, 'Help does not duplicate the current mission');
assert.equal(content.querySelectorAll('h1').length, 1, 'Help adds no second lesson heading');
assert([...content.querySelectorAll('[data-guide-help]')].every(section => !section.open), 'All help starts collapsed, keeping the initial mission short');
const reference = content.querySelector('[data-guide-help="reference-0"]');
assert(reference); assert.equal(reference.querySelector('summary').textContent, model.lesson.referenceSections[0].title);
assert(reference.textContent.includes(model.lesson.referenceSections[0].text), 'The existing practical instructions are reachable during the active step');
reference.open = true; const summary = reference.querySelector('summary'); summary.focus(); content.scrollTop = 120;
sandbox.updateChecklist();
assert.equal(content.querySelector('[data-guide-help="reference-0"]'), reference, 'Routine progress updates preserve the open native disclosure');
assert(reference.open); assert.equal(d.activeElement, summary, 'Routine progress updates preserve keyboard focus');
sandbox.render();
const restored = content.querySelector('[data-guide-help="reference-0"]');
assert(restored.open, 'Reopening or rerendering the same step restores its expanded help');
assert.equal(d.activeElement, restored.querySelector('summary'), 'Same-step rerender restores focus to the corresponding summary');
assert.equal(content.scrollTop, 120, 'Same-step rerender preserves the reader’s position');
model.state.index = G.lessons.findIndex(lesson => lesson.id === 'hide-areas'); model.state.chapter = 'hide-areas'; model.state.done = [];
sandbox.render();
assert([...content.querySelectorAll('[data-guide-help]')].every(section => !section.open), 'A different step starts with fresh collapsed help');
assert.equal(content.scrollTop, 0);
const sample = {text: 'A short introduction.', details: 'Keep <draft> & its source.', referenceSections: [{title: 'Where <files> go', text: 'Open /home/demo/Assistant/brief.md.'}], usage: {title: 'Keep a reference', text: 'Read while writing.'}};
sandbox.sample = sample;
const referenceMarkup = vm.runInContext('lessonContentMarkup(sample)', context);
const holder = d.createElement('div'); holder.innerHTML = referenceMarkup;
assert.equal(holder.querySelectorAll('.guide-explanation').length, 1, 'Reference browsing retains its explanation');
assert.equal(holder.querySelectorAll('.guide-usage').length, 1, 'Usage remains a single disclosure');
assert.equal(holder.querySelector('summary').textContent, 'More details');
assert.equal(holder.querySelector('[data-guide-help="reference-0"] summary').textContent, 'Where <files> go', 'Help labels remain escaped literal text');
assert.equal(holder.querySelector('draft,files'), null);
assert(holder.textContent.includes('/home/demo/Assistant/brief.md.'));

// Welcome offers both destinations together, including returning users’ desktop.
for (const [mode,label] of [['first','Explore demo'],['repeat','Return to desktop']]) {
  model.start(mode); sandbox.guide.settingUp=false; sandbox.render();
  const actions=content.querySelector('.guide-step-actions');
  const choices=[...actions.querySelectorAll('button')];
  assert.deepEqual(choices.map(button=>button.dataset.guideAction),['explore-demo','next'],'Both welcome choices are adjacent primary actions');
  assert.equal(choices[0].textContent.trim(),label);
  assert.equal(choices[1].textContent.trim(),'Learn the controls');
  assert(choices.every(button=>!button.hidden&&!button.disabled),'Both destinations are immediately available');
  assert.equal(content.querySelector('[data-guide-action="leave"]'),null,'Welcome does not hide its demo path behind Skip introduction');
  assert.equal(content.querySelector('[data-guide-preset]'),null,'Welcome opens its destination directly, without the later desktop chooser');
}

// Starting practice changes the model before reload replaces reference help.
// Run the actual click/start/check path, including its bubbled and queued work,
// while deliberately keeping the old reference DOM mounted until reload.
const transitionErrors=[];dom.virtualConsole.on('jsdomError',error=>transitionErrors.push(error));
const captures=[],saved=[],reloads=[],pendingChecks=[];
sandbox.captureCurrentWorkspaceSession=()=>captures.push(['session',model.active(),sandbox.guide.settingUp]);
sandbox.captureWorkspaceContent=()=>captures.push(['content',model.active(),sandbox.guide.settingUp]);
sandbox.guide.clearPractice=()=>captures.push(['clear',model.active(),sandbox.guide.settingUp]);
sandbox.guide.save=()=>saved.push(model.snapshot());
sandbox.location={reload:()=>reloads.push(model.snapshot())};
sandbox.preparePanelLesson=()=>assert.fail('Reference DOM cannot be inspected as an initialized practice scene');
vm.runInContext(source.slice(source.indexOf('  function referenceMarkup('),source.indexOf('  function setCompact('))+source.slice(source.indexOf('  function start('),source.indexOf('  function renderExitChoices('))+source.slice(source.indexOf('  function check()'),source.indexOf('  function start(')),context,{filename:'guide-reference-practice-transition.js'});
const clickStart=source.indexOf("  window.addEventListener('click', async event => {");
vm.runInContext(source.slice(clickStart,source.indexOf("  window.addEventListener('input'",clickStart)),context,{filename:'guide-reference-click-actions.js'});
d.addEventListener('click',()=>pendingChecks.push(()=>sandbox.check()),true);
d.addEventListener('click',()=>sandbox.check());
for(const [selector,chapter]of [['[data-guide-chapter="park"]','park'],['[data-guide-action="start"]',null]]){
  model.leave('completed');sandbox.guide.settingUp=false;sandbox.render();
  assert.equal(content.querySelector('.guide-progress'),null,'The real reference screen has no active-task progress element');
  const control=content.querySelector(selector);assert(control);
  const before=reloads.length;control.click();
  assert.equal(model.active(),true);assert.equal(model.state.chapter||null,chapter);
  assert.equal(sandbox.guide.settingUp,true,'Observers are suspended before the model becomes active');
  assert.equal(reloads.length,before+1);assert.equal(saved.at(-1).chapter||null,chapter,'The requested practice target is saved before reload');
  assert.equal(content.querySelector('.guide-progress'),null,'The regression keeps old reference DOM present through the event bubble');
  for(const check of pendingChecks.splice(0))assert.doesNotThrow(check,'Queued checks also wait for the new practice page');
  assert.doesNotThrow(()=>sandbox.check(),'Polling cannot inspect the stale reference screen');
  control.click();assert.equal(reloads.length,before+1,'A second click during reload cannot start another practice session');
}
assert(captures.every(([,active,settingUp])=>!active&&settingUp),'Real desktop content is captured before practice activates, with observers already suspended');
assert.deepEqual(transitionErrors,[],'Starting either an individual step or the whole Guide emits no reference-DOM browser error');
w.close();
console.log('Guide help passed: active optional sections, concise missions, disclosure/focus/scroll recovery, escaped reference labels and coherent reference-to-practice transitions.');
