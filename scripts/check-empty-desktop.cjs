const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Pages = require('../dist/desktop-pages.js');
const shell = fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
function segment(first,last) {
  const start=shell.indexOf(first),end=shell.indexOf(last,start+first.length);
  assert(start>=0&&end>start,'The production launch path can be isolated');
  return shell.slice(start,end);
}
const listeners = {}, nodes = {};
for (const key of ['#emptyWorkspace', '#emptyDesktopApps', '#emptyDesktopAllApps', '.desktop-shell']) {
  nodes[key] = {hidden:false,inert:false,innerHTML:'',addEventListener(type,fn){listeners[key+':'+type]=fn;}};
}
const calls = [];
const context = vm.createContext({
  $:selector=>nodes[selector], activeWorkspace:'general', desktopPages:Pages.create(),
  appInfo:{browser:{label:'Firefox',primary:'#ff7139'},notes:{label:'Note Editor',primary:'#ffb553'},'browser--1':{label:'Firefox',base:'browser'},steam:{label:'Steam',workspace:'gaming',singleInstance:true,primary:'#79bfec'},game:{label:'Fallout 4',workspace:'gaming',singleInstance:true,primary:'#b8d59a'}},
  appState:{browser:'open',notes:'closed',steam:'closed',game:'closed'},
  escapeHtml:s=>s,appArt:name=>'<i>'+name+'</i>',desktopNavigationBlocked:()=>false,
  createAppInstance:name=>calls.push(['new',name]),openApp:name=>calls.push(['open',name]),
  changeDesktopPage(page,animate,column,fullscreen){calls.push(['go',page,column,fullscreen]);context.desktopPages.select(context.activeWorkspace,column);context.desktopPages.go(context.activeWorkspace,page,column);},
  setUniversalSearchOpen:open=>calls.push(['overview',open]),SpatialOverviewDesktop:{select:(tab,animate)=>calls.push(['section',tab,animate])}
});
context.desktopPages.assign('general','browser',0);context.desktopPages.go('general',1);
vm.runInContext(segment('function launchAppHere(', 'function workspaceHotbarNames('),context);
vm.runInContext(fs.readFileSync(require.resolve('../dist/empty-desktop.js'),'utf8'),context);
const click = (name,shiftKey=false) => listeners['#emptyDesktopApps:click']({shiftKey,target:{closest:()=>({dataset:{emptyApp:name}})}});
assert(nodes['#emptyDesktopApps'].innerHTML.includes('New window here'));
assert(!nodes['#emptyDesktopApps'].innerHTML.includes('Steam'),'Gaming apps stay in Gaming');
assert(!nodes['#emptyDesktopApps'].innerHTML.includes('browser--1'),'Window instances are not separate launchers');
click('browser');assert.deepEqual(calls.pop(),['new','browser']);assert.equal(context.desktopPages.current('general'),1,'Launching here must not navigate to the existing app on Desktop 1');
click('notes');assert.deepEqual(calls.pop(),['open','notes']);click('notes',true);assert.deepEqual(calls.pop(),['new','notes']);
context.appState.browser='minimized';context.SpatialEmptyDesktop.refresh();click('browser');assert.deepEqual(calls.pop(),['new','browser'],'Launching a parked app creates a new window even in its owning context');
assert.equal(context.appState.browser,'minimized','Launching leaves the parked window untouched');
assert(nodes['#emptyDesktopApps'].innerHTML.includes('New window here'),'A parked app is described as a new launch');
context.desktopPages.select('general','project');click('browser');assert.deepEqual(calls.pop(),['new','browser'],'A parked window in another Project keeps its ownership');
context.SpatialEmptyDesktop.refresh();const unchanged=nodes['#emptyDesktopApps'].innerHTML;nodes['#emptyDesktopApps'].innerHTML='keyboard focus remains';context.SpatialEmptyDesktop.refresh();assert.equal(nodes['#emptyDesktopApps'].innerHTML,'keyboard focus remains');nodes['#emptyDesktopApps'].innerHTML=unchanged;
context.activeWorkspace='gaming';context.appState.steam='open';context.desktopPages.assign('gaming','steam',0);context.desktopPages.select('gaming','project');context.SpatialEmptyDesktop.refresh();assert(nodes['#emptyDesktopApps'].innerHTML.includes('Return to app'));
click('steam');assert.deepEqual(calls.slice(-2),[['go',0,'workspace',null],['open','steam']],'Return to a single-instance app selects its owner before opening');
const count=calls.length;nodes['#emptyWorkspace'].hidden=true;click('notes');assert.equal(calls.length,count);nodes['#emptyWorkspace'].hidden=false;
nodes['.desktop-shell'].inert=true;click('notes');listeners['#emptyDesktopAllApps:click']();assert.equal(calls.length,count);nodes['.desktop-shell'].inert=false;
context.desktopNavigationBlocked=()=>true;click('notes');assert.equal(calls.length,count);context.desktopNavigationBlocked=()=>false;
listeners['#emptyDesktopAllApps:click']();assert.deepEqual(calls.slice(-2),[['overview',true],['section','apps',false]]);
let stopped=0;const wheel=(height,keys={})=>({target:{closest:()=>({scrollHeight:height,clientHeight:100})},stopPropagation(){stopped++;},...keys});
listeners['#emptyWorkspace:wheel'](wheel(200));assert.equal(stopped,1,'A short viewport keeps ordinary wheel inside its scrollable app list');
for(const event of [wheel(100),wheel(200,{shiftKey:true}),wheel(200,{metaKey:true}),wheel(200,{ctrlKey:true})])listeners['#emptyWorkspace:wheel'](event);
assert.equal(stopped,1,'Desktop/project shortcuts and zoom keep their normal routing');

// The same production launcher policy serves Overview Apps and favorites;
// existing-window buttons in the parked rack still explicitly restore.
let appLauncher;
context.document={addEventListener(type,handler){assert.equal(type,'click');appLauncher=handler;}};
vm.runInContext(segment('document.addEventListener("click", event => {\n  const button = event.target.closest("[data-open-app]");', '$$("[data-launch-app]")'),context);
context.activeWorkspace='general';context.desktopPages.select('general','workspace');context.desktopPages.go('general',1);
const launchButton=(name,{parked=false,overview=false}={})=>({dataset:{openApp:name},closest(selector){return selector==='#appRack'&&parked?nodes['#emptyDesktopApps']:selector==='#universalSearch'&&overview?{}:null;}});
const launch=(name,options={},shiftKey=false)=>appLauncher({shiftKey,target:{closest:()=>launchButton(name,options)}});
launch('browser',{overview:true});assert.deepEqual(calls.slice(-2),[['new','browser'],['overview',false]],'Overview Apps launches a new window instead of the parked one');
launch('browser');assert.deepEqual(calls.pop(),['new','browser'],'Workspace favorites use the same launch policy');
launch('browser',{parked:true});assert.deepEqual(calls.pop(),['open','browser'],'A parked rail icon still restores its actual window');
launch('browser',{parked:true},true);assert.deepEqual(calls.pop(),['new','browser'],'Shift-click on an existing-window icon keeps its new-instance action');
launch('notes');assert.deepEqual(calls.pop(),['open','notes'],'A closed ordinary app still opens normally');
launch('notes',{},true);assert.deepEqual(calls.pop(),['new','notes'],'Shift-click explicitly creates a new window for a closed app');
context.activeWorkspace='gaming';context.appState.steam='minimized';context.desktopPages.assign('gaming','steam',2,'workspace');context.desktopPages.select('gaming','project');
launch('steam');assert.deepEqual(calls.slice(-2),[['go',2,'workspace',null],['open','steam']],'A parked single-instance app returns to its owner before restoring');
assert.equal(context.appState.browser,'minimized','Every ordinary application launch preserves the parked source window');
console.log('Empty desktop and Overview launchers passed: independent launches preserve parked windows, explicit rack restoration, singleton return, workspace filtering, stable focus, modal guards, Apps Overview and scroll ownership.');
