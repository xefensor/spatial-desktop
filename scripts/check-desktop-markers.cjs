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

// Exercise the production shared context menu from either rail and its children,
// including the existing keyboard path rather than introducing another popup.
const shell = fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const menuStart = shell.indexOf('let desktopFolderCount = 0;');
const menuEnd = shell.indexOf('/* Two browser windows',menuStart);
assert(menuStart>=0&&menuEnd>menuStart);
const menuPreference=fixture('icons'),documentHandlers=new Map(),windowHandlers=new Map(),menuHandlers=new Map();
const documentState={activeElement:null,addEventListener(type,handler){if(!documentHandlers.has(type))documentHandlers.set(type,[]);documentHandlers.get(type).push(handler);}};
function node({parent=null,rail=false,desktop=false,menu=false}={}){
  return {parent,rail,desktop,menu,dataset:{},style:{},
    closest(selector){
      if(selector==='.desktop-page-rail')return this.rail?this:this.parent?.closest(selector)||null;
      if(selector==='#desktopContextMenu')return this.menu?this:this.parent?.closest(selector)||null;
      if(selector==='[data-context-action]')return this.dataset.contextAction?this:this.parent?.closest(selector)||null;
      if(selector==='.workspace-zone')return this.desktop?this:this.parent?.closest(selector)||null;
      return null;
    },
    focus(){documentState.activeElement=this;},
    getBoundingClientRect(){return {left:14,bottom:220,width:250,height:120};}
  };
}
const menu=node({menu:true}),title={textContent:''},items={buttons:[]};menu.hidden=true;
const menuClasses=new Set();menu.classList={add:value=>menuClasses.add(value),remove:value=>menuClasses.delete(value),contains:value=>menuClasses.has(value)};
menu.addEventListener=(type,handler)=>menuHandlers.set(type,handler);
Object.defineProperty(items,'innerHTML',{get(){return this.markup||'';},set(value){
  this.markup=value;this.buttons=[];
  for(const match of value.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)){
    const button=node({parent:menu}),attributes=Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(attr=>[attr[1],attr[2]]));
    button.dataset.contextAction=attributes['data-context-action'];button.attributes=attributes;this.buttons.push(button);
  }
}});
const left=node({rail:true}),right=node({rail:true}),marker=node({parent:left}),appIcon=node({parent:right}),desktop=node({desktop:true});
const sandbox={
  document:documentState,window:{innerWidth:1000,innerHeight:800,addEventListener:(type,handler)=>windowHandlers.set(type,handler)},
  SpatialDesktopMarkers:menuPreference.markers,appInfo:{},activeProjectName:null,desktopPages:{next:()=>null},activeWorkspace:'work',
  $:(selector,scope)=>scope===menu?items.buttons[0]||null:selector==='#desktopContextMenu'?menu:selector==='#contextMenuTitle'?title:selector==='#contextMenuItems'?items:null,
  $$:(selector,scope)=>selector==='.context-menu-item'&&scope===menu?items.buttons:[],
  icon:()=>'<svg></svg>',escapeHtml:value=>String(value),prepareControlSemantics(){},requestAnimationFrame:callback=>callback()
};
vm.createContext(sandbox);vm.runInContext(shell.slice(menuStart,menuEnd),sandbox);
for(const target of [left,right,marker,appIcon]){
  const descriptor=sandbox.contextMenuDescriptor(target,40,60);
  assert.equal(descriptor.kind,'desktop-markers');assert.match(descriptor.title,/System-wide/);
}
const ordinary=sandbox.contextMenuDescriptor(desktop,400,300);
assert.equal(ordinary.kind,'desktop');assert.equal(ordinary.point.x,400);assert.equal(ordinary.point.y,300);
assert(sandbox.contextMenuEntries(ordinary).some(entry=>entry.action==='desktop-new-folder'),'The ordinary desktop menu keeps its existing actions');
sandbox.prepareContextMenus();
const dispatch=(type,event)=>{for(const handler of documentHandlers.get(type)||[])handler(event);};
const event=target=>({target,clientX:40,clientY:60,prevented:false,preventDefault(){this.prevented=true;}});
const mouse=event(appIcon);dispatch('contextmenu',mouse);
assert(mouse.prevented);assert.equal(menu.hidden,false);assert.equal(title.textContent,'Desktop indicators · System-wide');
assert.equal(items.buttons.length,2,'Indicators use only the two existing preference choices');
assert.deepEqual(items.buttons.map(button=>[button.dataset.contextAction,button.attributes.role,button.attributes['aria-checked']]),[
  ['desktop-markers:lines','menuitemradio','false'],['desktop-markers:icons','menuitemradio','true']
]);
menuHandlers.get('click')({target:items.buttons[0]});
assertMode(menuPreference,'lines','A marker-menu choice changes the shared persisted preference');assert.equal(menu.hidden,true);
assert.deepEqual(menuPreference.writes,[[key,'lines']]);
left.focus();
for(const keys of [{key:'ContextMenu'},{key:'F10',shiftKey:true}]){
  const keyboard={...event(left),...keys};dispatch('keydown',keyboard);
  assert(keyboard.prevented);assert.equal(menu.hidden,false);assert.equal(documentState.activeElement,items.buttons[0],'Keyboard invocation focuses the existing shared menu');
  assert.equal(items.buttons[0].attributes['aria-checked'],'true','The next opening checks the current shared choice');
  const escape={...event(left),key:'Escape'};dispatch('keydown',escape);
  assert.equal(menu.hidden,true);assert.equal(documentState.activeElement,left,'Escape returns keyboard focus to the marker region');
}
dispatch('contextmenu',event(marker));menuHandlers.get('click')({target:items.buttons[1]});
assertMode(menuPreference,'icons','The menu can restore icons as well as select lines');
assert.deepEqual(menuPreference.writes.at(-1),[key,'icons']);
sandbox.openDesktopContextMenu(ordinary,100,100);
sandbox.executeContextAction('desktop-markers:lines');
assertMode(menuPreference,'icons','An indicator action cannot change settings through an unrelated menu context');
assert.equal(sandbox.contextMenuDescriptor(items.buttons[0]),null,'Right-clicking inside the shared menu does not replace its context');

console.log('Desktop markers passed: preference persistence, display sync and production shared menus from both rails, marker/icon targets, radio choices, keyboard focus and ordinary desktop isolation.');
