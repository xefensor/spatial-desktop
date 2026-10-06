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
  assert(contents.includes('ui-refinements.css?v=156'), page + ': shared refinements loaded');
  assert(!contents.includes('href="/"'), page + ': project-relative navigation');
}
console.log('UI checks passed: filename/Unicode search, live workspace context, category parity, unique IDs, shared lanes and project-relative navigation.');
