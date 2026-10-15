const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const createDesktopMarkers = require('../dist/desktop-markers.js');

const key = 'spatial-desktop-markers-v1';

function fixture(saved = null, blocked = false) {
  const document = { documentElement: { dataset: {} } };
  const writes = [];
  const listeners = new Map();
  const storage = {
    getItem(name) {
      assert.equal(name, key);
      if (blocked) throw new Error('Storage is unavailable');
      return saved;
    },
    setItem(name, value) {
      if (blocked) throw new Error('Storage is unavailable');
      writes.push([name, value]);
      saved = value;
    }
  };
  const events = {
    addEventListener(type, listener) {
      assert.equal(type, 'storage');
      listeners.set(type, listener);
    }
  };
  const markers = createDesktopMarkers({ document, storage, events });
  let changes = 0;
  markers.onChange = () => changes++;
  return {
    markers, document, writes,
    get changes() { return changes; },
    receive(event) { listeners.get('storage')(event); }
  };
}

function assertMode(test, value, message) {
  assert.equal(test.markers.preference, value, message);
  assert.equal(test.document.documentElement.dataset.desktopMarkers, value,
    'Rendered marker mode follows the saved preference');
}

for (const [saved, expected] of [[null, 'icons'], ['icons', 'icons'], ['lines', 'lines'], ['', 'icons'], ['unknown', 'icons']]) {
  const test = fixture(saved);
  assertMode(test, expected, 'Saved valid modes load; missing or corrupt preferences use icons');
  assert.deepEqual(test.writes, [], 'Loading a preference does not overwrite storage');
}

const toggled = fixture();
toggled.markers.setPreference('lines');
assertMode(toggled, 'lines', 'Lines-only applies immediately');
assert.deepEqual(toggled.writes, [[key, 'lines']], 'A changed preference persists for the next visit');
assert.equal(toggled.changes, 1, 'An actual mode change notifies the UI');
toggled.markers.setPreference('lines');
assert.equal(toggled.changes, 1, 'Selecting the current mode does not redundantly notify the UI');
const writesBeforeInvalid = toggled.writes.length;
for (const invalid of [null, undefined, '', 'auto', 'ICONS', {}, 0]) toggled.markers.setPreference(invalid);
assertMode(toggled, 'lines', 'Invalid setters do not replace a valid choice');
assert.equal(toggled.writes.length, writesBeforeInvalid, 'Invalid setters never write storage');
assert.equal(toggled.changes, 1, 'Invalid setters never notify the UI');
toggled.markers.setPreference('icons');
assertMode(toggled, 'icons', 'The user can return to icons');
assert.deepEqual(toggled.writes.at(-1), [key, 'icons']);
assert.equal(toggled.changes, 2);

const blocked = fixture(null, true);
assertMode(blocked, 'icons', 'Blocked storage still permits the default desktop to render');
assert.doesNotThrow(() => blocked.markers.setPreference('lines'));
assertMode(blocked, 'lines', 'Blocked persistence does not stop a live settings change');
assert.equal(blocked.changes, 1);

const synced = fixture('lines');
synced.receive({ key: 'another-setting', newValue: 'icons' });
assertMode(synced, 'lines', 'Unrelated cross-tab settings do not change desktop markers');
assert.equal(synced.changes, 0);
synced.receive({ key, newValue: 'icons' });
assertMode(synced, 'icons', 'Other displays adopt a changed marker preference');
assert.equal(synced.changes, 1);
synced.receive({ key, newValue: 'icons' });
assert.equal(synced.changes, 1, 'Duplicate cross-tab events do not redundantly notify the UI');
synced.receive({ key, newValue: 'lines' });
assertMode(synced, 'lines');
assert.equal(synced.changes, 2);
synced.receive({ key, newValue: 'invalid' });
assertMode(synced, 'icons', 'An invalid cross-tab value falls back to icons');
assert.equal(synced.changes, 3);
synced.receive({ key, newValue: 'lines' });
synced.receive({ key, newValue: null });
assertMode(synced, 'icons', 'Removing the preference resets every display to the default');
assert.equal(synced.changes, 5);
synced.receive({ key, newValue: 'lines' });
synced.receive({ key: null, newValue: null });
assertMode(synced, 'icons', 'Clearing local storage resets every display to the default');
assert.equal(synced.changes, 7);
synced.receive({ key: null, newValue: null });
assert.equal(synced.changes, 7, 'Clearing an already-default preference does not redundantly notify');
assert.deepEqual(synced.writes, [], 'Cross-tab updates never echo another storage write');

// A browser can reject access to the localStorage property itself, not just its methods.
const browser = { document: { documentElement: { dataset: {} } }, addEventListener() {} };
Object.defineProperty(browser, 'localStorage', { get() { throw new Error('Storage access denied'); } });
const context = vm.createContext({ window: browser });
assert.doesNotThrow(() => vm.runInContext(fs.readFileSync(require.resolve('../dist/desktop-markers.js'), 'utf8'), context));
assert.equal(browser.SpatialDesktopMarkers.preference, 'icons');
assert.doesNotThrow(() => browser.SpatialDesktopMarkers.setPreference('lines'));
assert.equal(browser.document.documentElement.dataset.desktopMarkers, 'lines',
  'Browser bootstrap and live toggles tolerate a blocked localStorage property');

console.log('Desktop marker preference, persistence and display sync checks passed');
