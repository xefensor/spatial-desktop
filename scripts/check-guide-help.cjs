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
w.close();
console.log('Guide help passed: active optional reference sections, concise initial mission, same-step disclosure/focus/scroll recovery and unchanged reference labels.');
