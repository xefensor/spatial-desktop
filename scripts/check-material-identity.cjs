const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const A = require('../dist/app-names.js');
const read = name => fs.readFileSync(path.join(__dirname, '../dist', name),'utf8');
assert.equal(A.label('Dolphin'), 'File Browser');
assert.equal(A.label('Elisa · 2'), 'Music Player · 2');
assert.equal(A.label('File Browser Dolphin · 2'), 'File Browser · 2');
assert.equal(A.label('My research note'), 'My research note', 'User documents retain their titles');
const html = read('index.html');
const primary = {dolphin:'Dolphin',elisa:'Elisa',browser:'Firefox',terminal:'Konsole',notes:'Notes'};
const launchers = [...html.matchAll(/<button class="launcher-app"[^>]*data-(open|launch)-app="([^"]+)"[\s\S]*?<span>([^<>]+)<\/span><\/button>/g)];
assert.equal(launchers.length,35,'Every catalog application is checked');
for (const [,action,id,label] of launchers) {
  if (id === 'steam' || id === 'game') {
    assert.equal(label,id === 'steam' ? 'Steam' : 'Fallout 4','App-contributed examples keep their identity');
    continue;
  }
  if(id==='browser'){assert.equal(label,'Firefox','The requested Firefox example keeps its brand');continue;}
  const brand = action === 'open' ? primary[id] : id;
  assert.equal(label,A.label(brand),id+' has a consistent function-first label');
  assert(!/\b(?:Dolphin|Elisa|Firefox|Konsole|KDE|LibreOffice|Krita|Steam|Spatial Guide)\b/.test(label), 'Visible labels contain only the generic function');
}
const searchCtx = vm.createContext({});
const shell = read('desktop-shell.js');
vm.runInContext(shell.slice(shell.indexOf('function normalizeSearchText('),shell.indexOf('function buildUniversalAppResults(')),searchCtx);
assert(searchCtx.matchesSearch(A.label('Dolphin'),'file browser'));
assert(!searchCtx.matchesSearch(A.label('Dolphin'),'dolphin'));
assert.equal(A.label('Desktop Guide Spatial Guide'), 'Desktop Guide');
assert.equal(A.label('KDE Connect'), 'Device Link');
const guide = require('../dist/spatial-guide.js');
assert(!JSON.stringify([guide.chapters,guide.lessons]).match(/\bmissions?\b/i));
assert(!read('guide-desktop.js').match(/(?:YOUR MISSION|Mission complete|Try this mission|Skip this mission|Leave mission|Finish mission|MISSION PRACTICE)/));
console.log('Material identity passed: catalog parity, generic labels and legacy label migration, preserved launch keys and documents.');
