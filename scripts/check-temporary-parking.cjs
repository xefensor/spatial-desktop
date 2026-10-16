const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const Temporary = require('../dist/temporary-parking.js');
const Pages = require('../dist/desktop-pages.js'), T = require('../dist/spatial-tiling.js');
const source = fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const slice = (start,end) => {const a=source.indexOf(start), b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b);};
const copy = value => JSON.parse(JSON.stringify(value));
const frozen = value => {if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;};
const pages = Pages.create();
const ids = ['browser','notes','terminal','manual','pressure','other-page','other-display','foreign'];
ids.forEach(id=>pages.assign('work',id,0));
pages.assign('work','other-page',1);pages.assign('work','foreign',0,'private-project');
const states = Object.fromEntries(ids.map(id=>[id,id==='browser'?'open':'minimized']));
const assignments = Object.fromEntries(ids.map(id=>[id,id==='other-display'?2:1]));
const parked = Object.fromEntries(ids.filter(id=>id!=='browser'&&id!=='manual').map(id=>[id,{reason:'Focused Firefox'}]));
const base = {workspace:'work',column:'workspace',pages:pages.snapshot(),appState:states,assignments,displayCount:2,
  sessions:{'work:desktop:0:1':{root:T.leaf('browser'),focus:{name:'browser',parked:['notes','terminal','manual','other-page','other-display','foreign','notes']},parked}}};
const result = Temporary.classify(frozen(copy(base)));
assert.deepEqual(Object.keys(result.byWindow),['notes','terminal']);
assert.deepEqual(result.groups[0].windows,['notes','terminal']);
assert.deepEqual({...result.byWindow.notes},{id:'notes',owner:'browser',page:0,display:1,column:'workspace',sessionKey:'work:desktop:0:1',mode:'maximized'});
assert(!result.byWindow.manual,'An explicit Park has no automatic return record');
assert(!result.byWindow.pressure,'Ordinary capacity parking has no focus membership');
assert(!result.byWindow['other-page']&&!result.byWindow['other-display']&&!result.byWindow.foreign,'Only the originating page, display and Project can return');
assert(!JSON.stringify(result).includes('reason'),'Presentation does not expose persisted reason strings or document titles');
for(const edit of [input=>input.appState.browser='closed',input=>input.appState.browser='minimized',input=>input.sessions['work:desktop:0:1'].focus=null,
  input=>input.sessions['work:desktop:0:1'].root=T.leaf('notes'),input=>input.sessions['work:desktop:0:1'].fullscreen={name:'browser'},
  input=>input.pages.work.windows.browser=1,input=>input.pages.work.owners.browser='private-project',input=>input.assignments.browser=2,
  input=>input.pages.work.fullscreen={browser:{display:1}},input=>delete input.pages.work]) {
  const input=copy(base);edit(input);assert.equal(Temporary.classify(input).groups.length,0,'Stale/closed/moved/fullscreen owners never promise automatic return');
}
const unparked=copy(base);unparked.appState.notes='open';assert(!Temporary.classify(unparked).byWindow.notes,'A restored peer is not waiting to return');
const closed=copy(base);closed.appState.notes='closed';assert(!Temporary.classify(closed).byWindow.notes,'Closed peers never return');
const unknown=copy(base);delete unknown.pages.work.windows.notes;assert(!Temporary.classify(unknown).byWindow.notes,'Unknown membership is not treated as Desktop 1');
const disconnected=copy(base);disconnected.displayCount=1;disconnected.assignments.browser=2;assert(Temporary.classify(disconnected).byWindow.notes,'Single-display isLocalApp ignores old display assignments');

// Park is Project-wide: retain distinct desktop/display groups, never read a
// different Workspace or Project even when its app ids happen to match.
const multi=copy(base), project='launch:review / α';multi.column=project;multi.pages.work.activeColumn=project;
multi.sessions={};multi.appState={a:'open',b:'minimized',c:'open',d:'minimized',x:'open',y:'minimized'};
multi.pages.work.windows={a:2,b:2,c:0,d:0,x:0,y:0};multi.pages.work.owners={a:project,b:project,c:project,d:project,x:project,y:project};
multi.assignments={a:2,b:2,c:1,d:1,x:1,y:1};
const session=(owner,peer)=>({root:T.leaf(owner),focus:{name:owner,parked:[peer]},parked:{[peer]:{reason:'private title'}}});
multi.sessions['work:project-column:'+encodeURIComponent(project)+':desktop:2:2']=session('a','b');
multi.sessions['work:project-column:'+encodeURIComponent(project)+':desktop:0:1']=session('c','d');
multi.sessions['gaming:desktop:0:1']=session('x','y');
multi.sessions['work:project-column:other:desktop:0:1']=session('x','y');
multi.sessions['work:project-column:'+encodeURIComponent(project)+':desktop:0:fullscreen:x:1']=session('x','y');
const groups=Temporary.classify(frozen(multi)).groups;
assert.deepEqual(groups.map(group=>[group.page,group.display,group.windows]),[[0,1,['d']],[2,2,['b']]]);
assert.equal(Temporary.classify({...multi,column:'workspace'}).groups.length,0);
assert.equal(Temporary.classify({...multi,displayCount:1}).groups.length,1,'Disconnected displays do not retain a live return group');

// Exercise actual bounded maximize and its actual restore path, rather than a
// second implementation of those transitions in the test.
const frame = () => ({dataset:{},classList:{add(){},remove(){},contains(){return false;}}});
const frames=Object.fromEntries(['browser','notes','terminal','manual'].map(id=>[id,frame()]));
const actualPages=Pages.create();Object.keys(frames).forEach(id=>actualPages.assign('work',id,0));
const initial={kind:'split',axis:'x',ratio:.5,a:T.leaf('browser'),b:{kind:'split',axis:'y',ratio:.5,a:T.leaf('notes'),b:T.leaf('terminal')}};
const sessionState={root:initial,focus:null,parked:{},floating:{}};
const context={activeWorkspace:'work',desktopPages:actualPages,appState:{browser:'open',notes:'open',terminal:'open',manual:'minimized'},
  appInfo:{browser:{label:'Firefox'},notes:{label:'Note Editor'},terminal:{label:'Terminal'},manual:{label:'Manual'}},appMaximizedState:{},
  tileEngine:T,frontApp:'browser',tileSession:()=>sessionState,reconcileTileTree:()=>sessionState,frameFor:id=>frames[id],
  isLocalApp:id=>actualPages.visible('work',id,1),windowGeometry:new Map(),autoWindowAvoidance:new Set(),autoTiledWindows:new Set(),
  readGeometry:()=>({}),syncMaximizeButton(){},syncApps(){},showToast(){},queueDesktopStateBroadcast(){},renderTileLayout(){},
  releaseBorrowedApp(){},moveCoveredApps(){},returnCoveredApps(){},saveTileSessions(){},refreshIntentAreas(){},
  removeOffPageWindowTiles(){},clearWindowAutoAvoidance(){},layoutMode:'manual',topOpenApp:()=>null,
  window:{},globalThis:{},$$:()=>[]};
vm.createContext(context);
vm.runInContext(slice('function parkTileWindows(','// A maximized window'),context);
vm.runInContext(slice('function leaveTileFocus(','function parkFullscreenPeers('),context);
vm.runInContext(slice('function focusTileWindow(','function intentContextPrefix('),context);
vm.runInContext(slice('function tileOpenWindows(','function scheduleWindowTiling('),context);
vm.runInContext(slice('function minimizeApp(','function closeApp('),context);
vm.runInContext(slice('function closeApp(','function syncMaximizeButton('),context);
const classify=()=>Temporary.classify({workspace:'work',pages:actualPages.snapshot(),appState:context.appState,sessions:{'work:desktop:0:1':sessionState}});
context.focusTileWindow('browser');
assert.deepEqual(Object.keys(classify().byWindow),['notes','terminal']);
assert.equal(context.appState.manual,'minimized');
context.focusTileWindow('browser');
assert.equal(context.appState.notes,'open');assert.equal(context.appState.terminal,'open');assert.equal(context.appState.manual,'minimized');
assert.equal(classify().groups.length,0,'Unmaximize clears the group exactly when its peers return');
context.focusTileWindow('browser');context.closeApp('notes');
assert(!classify().byWindow.notes);assert(classify().byWindow.terminal);
context.focusTileWindow('browser');assert.equal(context.appState.notes,'closed','Actual restore never reopens a closed peer');
context.focusTileWindow('browser');context.minimizeApp('browser');
assert.equal(classify().groups.length,0,'Parking the maximized owner cancels its return group');
assert.equal(context.appState.terminal,'minimized','Actual owner Park does not restore the other cards');
context.appState.browser='open';context.appState.terminal='open';sessionState.root=T.leaf('browser');
context.focusTileWindow('browser');assert(classify().byWindow.terminal);
context.appState.terminal='open';context.tileOpenWindows('terminal');
assert.equal(classify().groups.length,0,'Explicitly restoring one peer cancels the original maximize arrangement');
assert.equal(sessionState.focus,null);
context.minimizeApp('terminal');assert.equal(classify().groups.length,0,'Reparking a restored peer remains an ordinary Park');

const browser={};vm.createContext(browser);vm.runInContext(fs.readFileSync(require.resolve('../dist/temporary-parking.js'),'utf8'),browser);
assert.equal(typeof browser.SpatialTemporaryParking.classify,'function');
console.log('Temporary maximize parking provenance and production lifecycle checks passed.');
