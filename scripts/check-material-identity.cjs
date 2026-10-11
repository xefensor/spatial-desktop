const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const A = require('../dist/app-names.js');
const read = name => fs.readFileSync(path.join(__dirname, '../dist', name),'utf8');
assert.equal(A.label('Dolphin'), 'File Browser Dolphin');
assert.equal(A.label('Elisa · 2'), 'Music Player Elisa · 2');
assert.equal(A.label('File Browser Dolphin · 2'), 'File Browser Dolphin · 2');
assert.equal(A.label('My research note'), 'My research note', 'User documents retain their titles');
const html = read('index.html');
const primary = {dolphin:'Dolphin',elisa:'Elisa',browser:'Firefox',terminal:'Konsole',notes:'Notes'};
const launchers = [...html.matchAll(/<button class="launcher-app"[^>]*data-(open|launch)-app="([^"]+)"[\s\S]*?<span>([^<>]+)<\/span><\/button>/g)];
assert.equal(launchers.length,34,'Every catalog application is checked');
for (const [,action,id,label] of launchers) {
  const brand = action === 'open' ? primary[id] : id;
  assert.equal(label,A.label(brand),id+' has a consistent function-first label');
  assert(label.includes(brand) || ['System Settings','Partition Manager'].includes(brand), 'The original brand remains searchable');
}
const searchCtx = vm.createContext({});
const shell = read('desktop-shell.js');
vm.runInContext(shell.slice(shell.indexOf('function normalizeSearchText('),shell.indexOf('function buildUniversalAppResults(')),searchCtx);
assert(searchCtx.matchesSearch(A.label('Dolphin'),'file browser'));
assert(searchCtx.matchesSearch(A.label('Dolphin'),'dolphin'));
console.log('Material identity passed: catalog parity, function/brand search, preserved launch keys and documents.');
