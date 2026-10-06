const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../dist/desktop-shell.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function normalizeSearchText('), source.indexOf('function buildUniversalAppResults(')), context);
for (const [value, query, expected] of [
  ['meeting-notes.md', 'meeting-notes.md', true],
  ['meeting-notes.md', 'notes meeting', true],
  ['Document Práce', 'prace', true],
  ['写真.png', '写真', true],
  ['Firefox Internet', 'internet firefox', true],
  ['Firefox Internet', 'firefox office', false],
  ['Anything', '   ', false]
]) assert.equal(context.matchesSearch(value, query), expected, `${value} / ${query}`);
const nodes = { '#workspaceContextMeta': {}, '#workspaceContextTitle': {} };
Object.assign(context, {
  $: selector => nodes[selector], activeWorkspace: 'general',
  workspaceProfiles: { general: { context: 'Everyday desktop', favorites: [1, 2, 3] } },
  projectSpaces: { custom: { name: 'My custom project' } }, activeProjectName: 'custom'
});
vm.runInContext(source.slice(source.indexOf('function refreshWorkspaceContext('), source.indexOf('let activeOverviewView')), context);
context.refreshWorkspaceContext();
assert.equal(nodes['#workspaceContextMeta'].textContent, '3 favorite apps · private clipboard');
assert.equal(nodes['#workspaceContextTitle'].textContent, 'Active project: My custom project');
context.activeProjectName = null;
context.refreshWorkspaceContext();
assert.equal(nodes['#workspaceContextTitle'].textContent, 'Everyday desktop');
// Inspect real page structure: unique control IDs and category parity.
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'No duplicate IDs');
const categories = [...html.matchAll(/data-category-filter="([^"]+)"/g)].map(match => match[1]).sort();
const select = html.match(/<select id="overviewCategory"[\s\S]*?<\/select>/)[0];
assert.deepEqual([...select.matchAll(/value="([^"]+)"/g)].map(match => match[1]).sort(), categories);
const libraryStart = html.indexOf('<section class="overview-section overview-apps-section"');
assert(html.indexOf('id="overviewWindowGrid"') > libraryStart, 'Open windows share the Apps lane');
assert(!source.includes('const miniature = name =>'), 'No decorative desktop previews');
assert(source.includes('!$("#universalResults").hidden && (event.target === $("#universalSearchInput")'), 'Result navigation leaves category select alone');
for (const page of ['index.html', 'philosophy.html', 'material-guide.html', 'material-lab.html']) {
  const contents = fs.readFileSync(path.join(__dirname, '../dist', page), 'utf8');
  assert(contents.includes('ui-refinements.css?v=179'), page + ': shared refinements loaded');
  assert(!contents.includes('href="/"'), page + ': project-relative navigation');
}
console.log('UI checks passed: filename/Unicode search, live workspace context, category parity, unique IDs, shared lanes and project-relative navigation.');
// Project dialogs must isolate the background and restore its previous role.
for (const overviewOpen of [true, false]) {
  let focusReturned = false;
  const classes = new Set();
  const dialog = { hidden: true, inert: true, classList: { add: v => classes.add(v), remove: v => classes.delete(v), contains: v => classes.has(v) }, setAttribute() {} };
  const desktop = { inert: overviewOpen };
  const overview = { inert: !overviewOpen, classList: { contains: () => overviewOpen } };
  const returnFocus = { focus: () => { focusReturned = true; } };
  const ctx = vm.createContext({
    $: selector => selector === '#projectEditorDialog' ? dialog : selector === '.desktop-shell' ? desktop : selector === '#universalSearch' ? overview : { focus() {} },
    document: { activeElement: returnFocus, body: { classList: { add() {}, remove() {} } } },
    activeProjectName: 'custom', projectEditorState: null, renderProjectEditor() {},
    requestAnimationFrame: callback => callback(), setTimeout: callback => callback()
  });
  vm.runInContext(source.slice(source.indexOf('function openProjectEditor('), source.indexOf('function prepareProjectEditor(')), ctx);
  ctx.openProjectEditor('create-project');
  assert.equal(desktop.inert, true);
  assert.equal(overview.inert, true);
  assert.equal(dialog.inert, false);
  ctx.closeProjectEditor();
  assert.equal(desktop.inert, overviewOpen);
  assert.equal(overview.inert, !overviewOpen);
  assert.equal(dialog.inert, true);
  assert.equal(focusReturned, true);
}
console.log('Project dialog checks passed: background isolation and focus return from desktop and Overview.');

// Material inheritance must match desktop utility surfaces even when a saved
// or newly inserted node still carries an obsolete ABS class.
const materialCtx = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const glassMaterialSurfaceSelector'),source.indexOf('const materialFieldSelector')),materialCtx);
vm.runInContext(source.slice(source.indexOf('function matchingNodes('),source.indexOf('function updateRangeLight(')),materialCtx);
const materialNode = (selector,parent=null) => {
  const classes=new Set();
  const node={selector,parent,classes,
    matches: selectors => selectors.split(',').includes(selector),
    closest: () => classes.has('material-surface-glass') || classes.has('material-surface-abs') ? node : parent?.closest(),
    classList:{add: value=>classes.add(value),remove:value=>classes.delete(value),contains:value=>classes.has(value),toggle:(value,on)=>on?classes.add(value):classes.delete(value)}};
  return node;
};
const utilitySurfaces=['.package-window','.project-editor-window','.desktop-context-menu','.universal-search','.toast','.notification-peek'].map(selector=>materialNode(selector));
const absApp=materialNode('.app-frame');
const allSurfaces=[...utilitySurfaces,absApp];
utilitySurfaces[0].classes.add('material-surface-abs');
materialCtx.prepareMaterialSurfaces({querySelectorAll:selector=>allSurfaces.filter(node=>node.matches(selector))});
for(const surface of utilitySurfaces){
  const button=materialNode('button',surface),field=materialNode('input',surface);
  materialCtx.applyControlMaterial(button);materialCtx.applyFieldMaterial(field);
  assert(surface.classes.has('material-surface-glass'),surface.selector+' is acrylic');
  assert(!surface.classes.has('material-surface-abs'));
  assert(button.classes.has('material-glass-button'),'Controls inherit '+surface.selector+' glass');
  assert(field.classes.has('material-glass-field'),'Fields inherit '+surface.selector+' glass');
}
materialCtx.applyControlMaterial(utilitySurfaces.at(-1));
assert(utilitySurfaces.at(-1).classes.has('material-glass-button'),'A notification preview inherits its own glass surface');
const appButton=materialNode('button',absApp);
materialCtx.applyControlMaterial(appButton);
assert(appButton.classes.has('material-abs-button'),'Application controls retain ABS');
console.log('Material inheritance passed: Pack/Import, project editor, Overview, context menus, toast, notification preview, stale ABS removal and application distinction.');

// Exercise real preference handling and media changes, including persistence and
// cross-display packets: Auto must remain Auto, rather than save its palette.
const createTheme = require('../dist/desktop-theme.js');
const themeStorage = new Map();
function themeFixture(dark, storage = themeStorage) {
  const handlers = {};
  const body = { dataset: {} };
  const meta = {};
  const label = {};
  const attributes = {};
  const button = { querySelector: () => label, setAttribute: (k, v) => attributes[k] = v };
  const media = { matches: dark, addEventListener: (type, listener) => handlers[type] = listener };
  const theme = createTheme({ document: { body, querySelector: () => meta },
    storage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) }, media,
    events: { addEventListener: (type, listener) => handlers[type] = listener } });
  theme.bind(button);
  return { theme, body, label, attributes, handlers, media };
}
const auto = themeFixture(false);
assert.equal(auto.theme.preference, 'auto');
assert.equal(auto.body.dataset.theme, 'light');
assert.equal(auto.label.textContent, 'Auto');
auto.media.matches = true;
auto.handlers.change();
assert.equal(auto.body.dataset.theme, 'graphite');
assert.match(auto.attributes['aria-label'], /Auto \(Dark\)/);
auto.theme.setPreference('oled');
auto.media.matches = false;
auto.handlers.change();
assert.equal(auto.body.dataset.theme, 'oled', 'Manual selection ignores system changes');
assert.equal(themeFixture(false).theme.preference, 'oled', 'Manual preference survives reload');
for (const expected of ['graphite', 'light', 'auto']) {
  auto.theme.next();
  assert.equal(auto.theme.preference, expected);
}
assert.equal(themeFixture(true).body.dataset.theme, 'graphite', 'Persisted Auto resolves the current system');
auto.theme.setPreference('auto', { notify: false }); // Incoming desktop packet.
assert.equal(auto.body.dataset.theme, 'light');
auto.handlers.storage({ key: 'spatial-color-theme-v1', newValue: 'graphite' });
assert.equal(auto.theme.preference, 'graphite');
auto.handlers.storage({ key: 'spatial-color-theme-v1', newValue: null });
assert.equal(auto.theme.preference, 'auto');
assert.equal(themeFixture(true, new Map([['spatial-color-theme-v1', 'invalid']])).theme.preference, 'auto');
const blocked = createTheme({ document: { body: { dataset: {} }, querySelector: () => null },
  storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } },
  media: { matches: true, addEventListener() {} } });
blocked.setPreference('light');
assert.equal(blocked.preference, 'light', 'Blocked storage does not disable themes');
assert(html.indexOf('desktop-theme.js') < html.indexOf('class="icon-sprite"'), 'Resolve preference before desktop markup');
assert(source.includes('themePreference: SpatialDesktopTheme.preference'), 'Sync carries the preference separately');
console.log('Theme checks passed: live system changes, manual override, reload, cross-tab changes, Auto sync and blocked storage.');
