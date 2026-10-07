// Exercise production functions, plus deterministic long-running layout sequences.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const T = require('../dist/spatial-tiling.js');
const source = fs.readFileSync(path.join(__dirname, '../dist/desktop-shell.js'), 'utf8');
const slice = (first, last) => {
  const start = source.indexOf(first);
  const end = source.indexOf(last, start + first.length);
  assert(start >= 0 && end > start, `Production source segment: ${first}`);
  return source.slice(start, end);
};
const ctx = vm.createContext({ URL, projectSpaces: {}, workspaceProfiles: { general: { home: '/home/demo' }, school: { home: '/home/demo/Workspaces/School' } }, activeWorkspace: 'general', activeProjectName: null });
vm.runInContext(slice('function describeProjectResource(', 'function addProjectResource('), ctx);
const resources = [
  ['/mnt/media/QA reference.mp4', 'QA reference.mp4', 'video'],
  ['/mnt/České zdroje/Žluťoučký.pdf', 'Žluťoučký.pdf', 'file'],
  ['~/Documents/report.pdf', 'report.pdf', 'file'],
  ['./resources/report.pdf', 'report.pdf', 'file'],
  ['resources/report.pdf', 'report.pdf', 'file'],
  ['report.pdf', 'report.pdf', 'file'],
  ['C:\\Users\\Demo\\clip.mp4', 'clip.mp4', 'video'],
  ['\\\\server\\shared\\clip.mp4', 'clip.mp4', 'video'],
  ['file:///mnt/media/clip.mp4', 'clip.mp4', 'video'],
  ['https://example.com/docs/guide.pdf', 'example.com/docs/guide.pdf', 'web'],
  ['example.com/docs/guide.pdf', 'example.com/docs/guide.pdf', 'web'],
  ['example.com', 'example.com', 'web'],
  ['localhost:8080/reference', 'localhost/reference', 'web'],
  ['https://example.com/QA%20reference', 'example.com/QA reference', 'web']
];
for (const [input, label, type] of resources) {
  const result = ctx.describeProjectResource(input);
  assert.equal(result[0], label, input);
  assert.equal(result[2], type, input);
  if (type !== 'web') assert.equal(result[1], 'Linked · ' + input, 'Original location retained');
}
for (const input of ['', '   ', 'javascript:alert(1)', 'data:text/html,test', 'https://']) assert.equal(ctx.describeProjectResource(input), null, input);
vm.runInContext(slice('function terminalResult(', 'function bindMiniWidgets('), ctx);
assert.match(ctx.terminalResult('help'), /echo hello/);
assert.equal(ctx.terminalResult('echo hello'), 'hello');
assert.equal(ctx.terminalResult('echo <img src=x onerror=alert(1)>'), '<img src=x onerror=alert(1)>');
assert.equal(ctx.terminalResult('pwd'), '/home/demo');
ctx.activeWorkspace = 'school';
assert.equal(ctx.terminalResult('pwd'), ctx.workspaceProfiles.school.home);
ctx.projectSpaces.custom = { root: '/mnt/custom project' };
ctx.activeProjectName = 'custom';
assert.equal(ctx.terminalResult('pwd'), '/mnt/custom project');
assert.equal(ctx.terminalResult('clear'), 'Terminal cleared');
assert.equal(ctx.terminalResult('unknown'), 'command not found: unknown');
assert(source.includes('terminalPreview = terminalResult(command);') && source.includes('terminalPreview = terminalResult(value);'), 'Live card and window share command behavior');
assert(source.includes('line.textContent = terminalPreview;'), 'Terminal output is literal text');
vm.runInContext(slice('function normalizeSearchText(', 'function buildUniversalAppResults('), ctx);
ctx.projectSpaces = {
  research: { name: 'Urban Ecology', root: '/mnt/School/Research', summary: 'River observation', modes: { a: { label: 'Reading' } }, resources: [['Video reference.mp4', 'Linked · /media/reference.mp4']], note: 'Žluťoučký kůň' },
  custom: { name: 'České <notes>', root: '/mnt/custom', summary: '', modes: {}, resources: [], note: '' }
};
vm.runInContext(slice('function projectSearchResults(', 'function filterUniversalSearch('), ctx);
for (const [query, id] of [['urban', 'research'], ['ecology urban', 'research'], ['mnt school', 'research'], ['reading', 'research'], ['video reference', 'research'], ['zlutoucky kun', 'research'], ['ceske notes', 'custom']]) assert(ctx.projectSearchResults(query).some(r => r.id === id), query);
assert.equal(ctx.projectSearchResults('not in any project').length, 0);
assert.equal(ctx.projectSearchResults(' ').length, 0);
delete ctx.projectSpaces.custom;
assert.equal(ctx.projectSearchResults('ceske notes').length, 0, 'Deleted projects disappear from search');
ctx.projectSpaces.injected = { name: '<img src=x onerror=alert(1)>', root: '/tmp/<test>', summary: '', modes: {}, resources: [], note: '' };
const rendered = {};
ctx.$ = () => rendered;
ctx.prepareControlSemantics = () => {};
ctx.icon = () => '<svg></svg>';
vm.runInContext(slice('function escapeHtml(', 'function showToast('), ctx);
ctx.buildUniversalProjectResults('img');
assert(!rendered.innerHTML.includes('<img'), 'Project labels cannot inject HTML');
assert(rendered.innerHTML.includes('&lt;img'), 'User text remains visible');
function control(textContent, id = '') {
  const classes = new Set();
  return { textContent, id, attributes: {}, classList: { toggle: (key, active) => active ? classes.add(key) : classes.delete(key), contains: key => classes.has(key) }, setAttribute(key, value) { this.attributes[key] = value; } };
}
const controls = [control(' Wi-Fi '), control('Wi-Fi'), control('Bluetooth'), control('Wi-Fi', 'themeToggle')];
let saved = {}, storageBlocked = false;
ctx.$$ = () => controls;
ctx.readDesktopStorage = () => saved;
ctx.localStorage = { setItem(key, value) { if (storageBlocked) throw new Error('Blocked'); saved = JSON.parse(value); } };
vm.runInContext(slice('function setSystemToggle(', 'Object.entries(readDesktopStorage("spatial-system-toggles-v1"))'), ctx);
for (const active of [true, false]) {
  ctx.setSystemToggle('Wi-Fi', active);
  for (const button of controls.slice(0, 2)) { assert.equal(button.classList.contains('is-active'), active); assert.equal(button.attributes['aria-pressed'], String(active)); }
  assert.equal(saved['Wi-Fi'], active);
  assert.equal(controls[2].classList.contains('is-active'), false);
  assert.equal(controls[3].classList.contains('is-active'), false, 'Theme is independent');
}
storageBlocked = true;
assert.doesNotThrow(() => ctx.setSystemToggle('Wi-Fi', true));
assert(controls[0].classList.contains('is-active'), 'Controls work without storage access');
// No implicit named window globals: an ordinary keyup must work in strict DOM environments.
let keyup;
const openDialogs = new Set();
let projectClosed = false, packageClosed = false, overviewOpened = false;
const keys = vm.createContext({
  document: { addEventListener: (_, callback) => { keyup = callback; } },
  $: selector => ({ classList: { contains: () => openDialogs.has(selector) } }),
  superKeyAlone: false,
  closeProjectEditor: () => { projectClosed = true; }, closePackageDialog: () => { packageClosed = true; },
  setUniversalSearchOpen: () => { overviewOpened = true; }
});
vm.runInContext(slice('document.addEventListener("keyup",', 'window.addEventListener("blur",'), keys);
assert.doesNotThrow(() => keyup({ key: 'a' }));
for (const dialog of ['#projectEditorDialog', '#packageDialog']) {
  openDialogs.add(dialog);
  keyup({ key: 'Escape', preventDefault() {} });
  openDialogs.clear();
}
assert(projectClosed && packageClosed);
keys.superKeyAlone = true;
keyup({ key: 'Meta', preventDefault() {} });
assert(overviewOpened);
// Escape closes a transient surface first, preserving the fullscreen session.
let full = true, exits = 0;
const transient = new Set();
const escapeCtx = vm.createContext({ tileSession: () => ({ fullscreen: full ? { name: 'dolphin' } : null }), $: selector => ({ hidden: selector === '#desktopContextMenu' ? !transient.has(selector) : false, classList: { contains: () => transient.has(selector) } }), toggleAppFullscreen: () => { exits++; } });
const escapeBody = slice('    if (event.key !== "Escape" || !tileSession().fullscreen', '\n  });\n  const observer');
vm.runInContext('function handleEscape(event) {\n' + escapeBody + '\n}', escapeCtx);
for (const surface of ['#universalSearch', '#packageDialog', '#projectEditorDialog', '#desktopContextMenu']) {
  transient.add(surface);
  escapeCtx.handleEscape({ key: 'Escape', preventDefault() {} });
  transient.clear();
}
assert.equal(exits, 0);
escapeCtx.handleEscape({ key: 'Escape', preventDefault() {} });
assert.equal(exits, 1);
// Mutations need to sync even when no pointer event precedes them.
for (const [start, end] of [['function openApp(', 'function minimizeApp('], ['function minimizeApp(', 'function closeApp('], ['function closeApp(', 'function syncMaximizeButton('], ['function activateHotbarSlot(', 'document.addEventListener("keydown",']]) assert(slice(start, end).includes('queueDesktopStateBroadcast();'), start + ': keyboard actions publish state');
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
const quickSettings = [...html.matchAll(/<button class="quick-toggle[^"\n]*" data-toggle[^>]*>[\s\S]*?<span>(Wi-Fi|Bluetooth|Sound|Focus)<\/span>/g)];
assert.equal(quickSettings.length, 7);
for (const match of quickSettings) assert(match[0].includes(`aria-label="${match[1]}"`), 'Rail quick settings retain a name when text is hidden');
let localReferences = 0;
const dist = path.join(__dirname, '../dist');
for (const filename of fs.readdirSync(dist).filter(name => name.endsWith('.html'))) {
  const page = fs.readFileSync(path.join(dist, filename), 'utf8');
  for (const [, reference] of page.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    if (/^(?:https?:|data:|mailto:|#|\/\/)/.test(reference)) continue;
    const clean = reference.split(/[?#]/)[0];
    if (!clean) continue;
    assert(fs.existsSync(path.join(dist, clean)), filename + ': missing ' + reference);
    localReferences++;
  }
}
console.log(`${localReferences} local HTML asset/navigation references passed.`);
console.log('Desktop workflows passed: 19 resource cases, shared terminal commands, project/resource/note search, safe markup, duplicate system toggles, keyboard events and Escape priority.');

// Project rail actions must reveal the editor rather than focus hidden content.
for (const edge of ['left', 'right', 'top', 'bottom']) {
  let focused = false, scrolled = false, shown = false;
  const rail = vm.createContext({
    dockState: { projects: { edge } }, dockSizes: { [edge]: 64 }, dockSizeManual: {},
    autoSpatialEdgeStates: new Map([[edge, 'rail']]), manualAreaOverride() {},
    showArea(name) { assert.equal(name, 'projects'); shown = true; }, refreshIntentAreas() {},
    requestAnimationFrame: callback => callback(),
    $: () => ({ focus() { focused = true; }, scrollIntoView() { scrolled = true; } })
  });
  vm.runInContext(slice('function focusProjectControl(', 'const projectAccentPalette'), rail);
  rail.focusProjectControl('#projectQuickNote');
  assert(rail.dockSizes[edge] >= (edge === 'left' || edge === 'right' ? 300 : 250));
  assert.equal(rail.dockSizeManual[edge], true);
  assert.equal(rail.autoSpatialEdgeStates.has(edge), false);
  assert(shown && focused && scrolled);
}
console.log('Project rail editors passed: all four dock edges expand before focus.');

// Seeded mixed open/close/resize/persist sequences, including narrow and ultrawide workspaces.
const minimums = { dolphin: { width: 440, height: 340 }, elisa: { width: 460, height: 360 }, browser: { width: 420, height: 320 }, terminal: { width: 390, height: 300 }, notes: { width: 400, height: 300 } };
const names = Object.keys(minimums), min = name => minimums[name];
let seed = 0x5a17;
const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
let checks = 0;
for (const [width, height] of [[320, 480], [640, 700], [900, 720], [1280, 800], [1920, 1080], [3440, 1440], [5120, 1440], [1800, 450]]) {
  let tree = null;
  const bounds = { x: 8, y: 8, width, height };
  for (let i = 0; i < 150; i++) {
    const selected = names[Math.floor(random() * names.length)];
    const operation = Math.floor(random() * 4);
    if (operation === 0) tree = T.remove(tree, selected);
    else if (operation === 1 && T.contains(tree, selected)) tree = T.resizeWindow(tree, selected, random() < .5 ? 'x' : 'y', (random() - .5) * Math.min(width, height), bounds);
    else tree = T.insert(tree, selected, T.names(tree).at(-1), null, bounds, min);
    const obstacles = i % 7 === 0 ? [{ x: width * .4 + 8, y: 8, width: width * .18, height: height * .6 }] : [];
    const result = obstacles.length ? T.fitAvoiding(tree, bounds, min, selected, () => 0, obstacles) : T.fit(tree, bounds, min, selected);
    const entries = [...result.windows];
    assert.equal(new Set(T.names(result.node)).size, T.names(result.node).length, 'No duplicate leaves');
    for (const [name, rect] of entries) {
      assert(rect.width > 0 && rect.height > 0 && Object.values(rect).every(Number.isFinite));
      assert(rect.x >= bounds.x && rect.y >= bounds.y && rect.x + rect.width <= bounds.x + width && rect.y + rect.height <= bounds.y + height, 'Within available space');
      if (obstacles.length || entries.length > 1) assert(rect.width >= min(name).width - 1 && rect.height >= min(name).height - 1, 'Usable size, or parked');
      for (const obstacle of obstacles) assert(rect.x + rect.width <= obstacle.x - T.gap || rect.x >= obstacle.x + obstacle.width + T.gap || rect.y + rect.height <= obstacle.y - T.gap || rect.y >= obstacle.y + obstacle.height + T.gap, 'Float clearance');
    }
    for (let a = 0; a < entries.length; a++) for (let b = a + 1; b < entries.length; b++) {
      const A = entries[a][1], B = entries[b][1];
      assert(A.x + A.width <= B.x || B.x + B.width <= A.x || A.y + A.height <= B.y || B.y + B.height <= A.y, 'Tiles do not overlap');
    }
    tree = T.normalize(JSON.parse(JSON.stringify(result.node)), names);
    assert.deepEqual(T.names(tree), T.names(result.node), 'Persistence round-trip');
    checks++;
  }
}
console.log(`Seed 0x5a17: ${checks} mixed layout steps across 8 sizes passed (bounds, usability, floats, overlap, persistence).`);
