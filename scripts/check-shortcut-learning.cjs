'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const Learning = require('../dist/shortcut-learning.js');
let now = 1000;
const create = options => Learning.create({now: () => now, ...options});
const mouse = (model, id, times = 1) => Array.from({length: times}, () => model.record(id, 'pointer'));
const key = (model, id, times = 1) => Array.from({length: times}, () => model.record(id, 'shortcut'));
const state = (model, id) => model.snapshot().actions[id];

const model = create();
assert(mouse(model, 'overview', 5).every(result => !result.show), 'The first five mouse invocations stay quiet');
assert.equal(model.record('overview', 'pointer').show, true, 'The sixth invocation starts teaching');
assert.equal(model.record('overview', 'pointer').show, true, 'Every further mouse invocation repeats an active hint');
assert.equal(model.record('overview', 'shortcut').learned, false);
assert.equal(model.record('overview', 'pointer').show, true);
assert.equal(model.record('overview', 'shortcut').learned, false);
assert.equal(model.record('overview', 'pointer').show, true);
assert.deepEqual(model.record('overview', 'shortcut'), {show: false, learned: true}, 'Three successful shortcuts need not be consecutive');
assert.equal(state(model, 'overview').teaching, false);
assert.equal(state(model, 'overview').mouseUses, 0);
assert.equal(state(model, 'overview').shortcutUses, 0);
assert(mouse(model, 'overview', 5).every(result => !result.show), 'Learning resets the complete observation allowance');
assert.equal(model.record('overview', 'pointer').show, true, 'Repeated mouse use can teach a previously learned action again');

const mixed = create();
mouse(mixed, 'map', 4);key(mixed, 'map');
assert.equal(state(mixed, 'map').mouseUses, 0, 'Regular mixed input clears the observation streak');
assert(mouse(mixed, 'map', 5).every(result => !result.show));
assert.equal(mixed.record('map', 'pointer').show, true);
mouse(mixed, 'maximize', 5);
assert.equal(state(mixed, 'map').shortcutUses, 0, 'Actions keep independent progress');

const capped = create();
for (const id of ['a', 'b', 'c']) mouse(capped, id, 6);
assert.deepEqual(Object.entries(capped.snapshot().actions).filter(([, value]) => value.teaching).map(([id]) => id), ['a', 'b']);
assert.equal(capped.record('c', 'pointer').show, false, 'No third shortcut starts competing for attention');
assert.equal(state(capped, 'c').mouseUses, 5, 'Waiting actions retain a bounded observation count');
key(capped, 'a', 3);
assert.equal(capped.record('c', 'pointer').show, true, 'A waiting action can teach when a slot becomes available');

const saved = JSON.parse(JSON.stringify(capped.snapshot()));
const restored = create({saved});
assert.deepEqual(restored.snapshot(), saved, 'Saved progress resumes without losing partially learned shortcuts');
key(restored, 'b');
const detached = restored.snapshot();detached.actions.b.shortcutUses = 100;delete detached.actions.c;
assert.equal(state(restored, 'b').shortcutUses, 1, 'Snapshots cannot mutate live progress');
assert(state(restored, 'c'));

const muted = create();
mouse(muted, 'overview', 6);muted.setMuted('overview', true);
const excluded = muted.snapshot();
assert(mouse(muted, 'overview', 20).every(result => !result.show));
key(muted, 'overview', 3);
assert.deepEqual(muted.snapshot(), excluded, 'Muted actions neither nag nor accumulate hidden practice');
const mutedRestored = create({saved: muted.snapshot()});
assert.equal(state(mutedRestored, 'overview').muted, true);
mutedRestored.setMuted('overview', false);
assert(mouse(mutedRestored, 'overview', 5).every(result => !result.show), 'Re-enabling an individual suggestion starts gently');
assert.equal(mutedRestored.record('overview', 'pointer').show, true);
mutedRestored.setEnabled(false);
const paused = mutedRestored.snapshot();
assert(mouse(mutedRestored, 'overview', 10).every(result => !result.show));key(mutedRestored, 'overview', 3);
assert.deepEqual(mutedRestored.snapshot(), paused, 'Disabled learning records no additional practice');
mutedRestored.reset();
assert.deepEqual(mutedRestored.snapshot(), {version: 1, enabled: false, actions: {}}, 'Reset clears progress and exclusions while preserving the global toggle');

const recent = create({recentMs: 100});
mouse(recent, 'overview', 4);mouse(recent, 'map', 6);recent.setMuted('never', true);
now += 101;
assert.equal(recent.record('overview', 'pointer').show, false);
assert.equal(state(recent, 'overview').mouseUses, 1, 'A stale observation starts a new streak');
assert.equal(state(recent, 'map').teaching, false, 'Inactive teaching releases its limited attention slot');
assert.equal(state(recent, 'never').muted, true, 'Time never removes a deliberate exclusion');

for (const saved of [null, 'bad', [], {version: 20, enabled: false}, {actions: []}]) {
  const clean = create({saved});assert.equal(clean.snapshot().enabled, true);assert.deepEqual(clean.snapshot().actions, {});
}
const corrupt = create({saved: {version: 1, enabled: 'false', actions: {
  a: {mouseUses: -5, shortcutUses: Infinity, teaching: true, lastUsed: now},
  b: {mouseUses: 1e9, shortcutUses: 1e9, teaching: true, lastUsed: now},
  c: {mouseUses: 5, shortcutUses: 1, teaching: true, lastUsed: now},
  future: {lastUsed: now + 1e9}, invalid: null
}}});
assert.equal(corrupt.snapshot().enabled, true);
assert.equal(state(corrupt, 'a').mouseUses, 0);assert.equal(state(corrupt, 'a').shortcutUses, 0);
assert.equal(state(corrupt, 'b').mouseUses, 5);assert.equal(state(corrupt, 'b').shortcutUses, 2);
assert.equal(state(corrupt, 'c').teaching, false, 'Corrupted saved input cannot exceed the active-teaching limit');
assert.equal(state(corrupt, 'future').lastUsed, now, 'Future timestamps cannot extend the observation window');
assert.equal(state(corrupt, 'invalid'), undefined);
const untouched = corrupt.snapshot();
for (const [id, source] of [['', 'pointer'], ['x'.repeat(161), 'pointer'], ['valid', 'keyboard-navigation'], [null, 'shortcut']]) {
  assert.deepEqual(corrupt.record(id, source), {show: false, learned: false});
}
assert.deepEqual(corrupt.snapshot(), untouched, 'Unknown actions and navigation inputs do not alter progress');

const bounded = create();bounded.setMuted('excluded', true);
for (let i = 0; i < 220; i++) {now++;mouse(bounded, 'window-' + i);}
assert.equal(Object.keys(bounded.snapshot().actions).length, 200, 'Unusually large sessions cannot grow storage without bound');
assert.equal(state(bounded, 'excluded').muted, true, 'Ordinary observations are evicted before explicit exclusions');
const safeIds = create();safeIds.record('__proto__', 'pointer');
assert.equal(Object.hasOwn(safeIds.snapshot().actions, '__proto__'), true, 'Action ids are data, including special object property names');
assert.equal({}.mouseUses, undefined);

const browser = {};vm.createContext(browser);vm.runInContext(fs.readFileSync(require.resolve('../dist/shortcut-learning.js'), 'utf8'), browser);
assert.equal(typeof browser.SpatialShortcutLearning.create, 'function');
console.log('Adaptive shortcut observation, teaching, persistence and exclusion checks passed.');
