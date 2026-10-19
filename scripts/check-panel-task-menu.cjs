'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Use the bounded live panel fixture, without running its test loops or booting
// unrelated desktop services. Its compact Parked buttons are the actual view.
const fixture = fs.readFileSync(path.join(__dirname, 'check-panel-desktop.cjs'), 'utf8');
const marker = fixture.indexOf("test('runtime-only fixture");
assert(marker >= 0);
const harness = {require, process, console, __dirname, module: {exports: {}}};
vm.runInNewContext(fixture.slice(0, marker) + '\nmodule.exports={w,d,context,P};', harness, {filename: 'panel-task-menu-fixture.cjs'});
const {w, d, context, P} = harness.module.exports;
const shell = fs.readFileSync(path.join(__dirname, '../dist/desktop-shell.js'), 'utf8');
const start = shell.indexOf('function contextMenuDescriptor(');
const descriptor = shell.slice(start, shell.indexOf('\nfunction contextMenuEntries(', start));
assert(start >= 0 && descriptor.includes('function contextMenuDescriptor('));
w.$ = (selector, root = d) => root.querySelector(selector);
vm.runInContext(descriptor, context, {filename: 'native-context-menu-descriptor.js'});

P.updatePanel('panel-left', {mode: 'compact'});
const task = d.querySelector('.panel-compact-tasks [data-panel-task="notes"]');
assert(task, 'A real parked window has a compact task button');
assert.equal(task.hasAttribute('data-mini-card'), false, 'Compact tasks cannot be mistaken for native mini-card rendering targets');
const original = JSON.stringify(P.state());
const nestedIcon = task.querySelector('svg') || task;
const value = w.contextMenuDescriptor(nestedIcon);
assert.equal(value.kind, 'app'); assert.equal(value.name, 'notes'); assert.equal(value.title, 'Notes');

// The panel's real capture listener must pass native app context through, rather
// than taking over with its own Edit layout menu. Existing scope/action adapters
// can then apply the same menu commands as they do for an expanded parked card.
const native = [];
d.addEventListener('contextmenu', event => {
  const context = w.contextMenuDescriptor(event.target);
  if (context?.kind === 'app') {native.push(context); event.preventDefault();}
});
const event = new w.MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: 30, clientY: 180});
nestedIcon.dispatchEvent(event);
assert(event.defaultPrevented); assert.equal(native.length, 1); assert.equal(native[0].name, 'notes');
assert.equal(d.querySelector('.panel-context-menu'), null, 'The panel does not intercept a native parked-window menu');
assert.equal(JSON.stringify(P.state()), original, 'Opening a task menu does not edit the layout');

const card = d.createElement('article'); card.dataset.miniCard = 'notes'; d.body.append(card);
const expanded = w.contextMenuDescriptor(card);
assert.equal(expanded.kind, value.kind); assert.equal(expanded.name, value.name); assert.equal(expanded.title, value.title);
card.remove();
const clone = d.createElement('button'); clone.dataset.panelTask = 'notes-7';
w.appInfo['notes-7'] = {label: 'Notes · Research', base: 'notes', workspace: 'work'};
d.body.append(clone); const independent = w.contextMenuDescriptor(clone);
assert.equal(independent.name, 'notes-7', 'Independent windows retain their actual identity, rather than their app base');
assert.equal(independent.title, 'Notes · Research');
clone.dataset.panelTask = 'missing-window';
assert.equal(w.contextMenuDescriptor(clone), null, 'A stale task does not become a valid app action');
clone.remove();
const background = d.querySelector('[data-background-open]');
assert(background); assert.equal(w.contextMenuDescriptor(background), null, 'Background services remain owned by their separate native descriptor adapter');
w.close();
console.log('Compact parked menus passed: real task identity, native context-menu handoff, independent instances, stale targets and separate background services.');
