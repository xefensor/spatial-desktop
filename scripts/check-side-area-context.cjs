const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const Pages=require('../dist/desktop-pages.js');
const source=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const slice=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const pages=Pages.create();
for(const id of ['sideOpen','sideParked','otherSide'])pages.assign('work',id,0,'workspace');
for(const id of ['mainOpen','mainParked'])pages.assign('work',id,1,'site');
pages.select('work','site');pages.go('work',1);
const nodes=new Map();
const node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',value:'all'});return nodes.get(key);};
let side=true;
const local=new Set(['sideOpen','sideParked']);
const context=vm.createContext({
  activeWorkspace:'work',desktopPages:pages,
  appState:{sideOpen:'open',sideParked:'minimized',otherSide:'minimized',mainOpen:'open',mainParked:'minimized'},
  appInfo:Object.fromEntries(['sideOpen','sideParked','otherSide','mainOpen','mainParked'].map(id=>[id,{label:id,primary:'#abc'}])),
  workspaceProfiles:{work:{rack:[]}},desktopHasWindowFocus:false,frontApp:null,
  SpatialDisplayRoleBridge:{windowInCurrentContext:id=>side?local.has(id):null,isSideSpace:()=>side},
  isLocalApp:id=>side?local.has(id):id.startsWith('main'),
  frameFor:()=>({getBoundingClientRect:()=>({left:0,top:0}),style:{}}),
  $:key=>node(key),$$:()=>[],miniMarkup:id=>'<article>'+id+'</article>',
  escapeHtml:String,appArt:()=>'',icon:()=>'',fullscreenHotbarBond:()=>false,
  applyAppPrimaryColors(){},prepareControlSemantics(){},bindMusicControls(){},bindMiniWidgets(){},bindMiniDrag(){},
  refreshWorkspaceContext(){},renderDesktopColumnMap(){}
});
for(const [start,end] of [
  ['function renderMiniApps()','function terminalResult('],
  ['function workspaceHotbarNames()','function workspaceShortcutNames()'],
  ['function renderOverviewWindows()','function refreshWorkspaceContext()']
])vm.runInContext(slice(start,end),context);

// The main display is on a Project's second desktop. Side space's own normal
// Apps Area and Overview must retain its Workspace-owned parked windows.
context.renderMiniApps();
assert.equal(node('#miniStack').innerHTML,'<article>sideParked</article>');
assert.equal(node('#miniCount').textContent,'1');
assert.deepEqual(Array.from(context.workspaceHotbarNames()),['sideOpen','sideParked']);
context.renderOverviewWindows();
assert.match(node('#overviewWindowGrid').innerHTML,/data-overview-open-app="sideOpen"/);
assert.match(node('#overviewWindowGrid').innerHTML,/data-overview-open-app="sideParked"/);
assert.doesNotMatch(node('#overviewWindowGrid').innerHTML,/mainOpen|mainParked|otherSide|Project-wide/);
assert.match(node('#overviewWindowGrid').innerHTML,/Parked · Side space/);
node('#overviewWindowFilter').value='desktop';context.renderOverviewWindows();
assert.match(node('#overviewWindowGrid').innerHTML,/data-overview-open-app="sideOpen"/);
assert.doesNotMatch(node('#overviewWindowGrid').innerHTML,/data-overview-open-app="sideParked"/);
node('#overviewWindowFilter').value='parked';context.renderOverviewWindows();
assert.match(node('#overviewWindowGrid').innerHTML,/data-overview-open-app="sideParked"/);
assert.doesNotMatch(node('#overviewWindowGrid').innerHTML,/data-overview-open-app="sideOpen"/);

side=false;node('#overviewWindowFilter').value='all';
context.renderMiniApps();context.renderOverviewWindows();
assert.equal(node('#miniStack').innerHTML,'<article>mainParked</article>');
assert.deepEqual(Array.from(context.workspaceHotbarNames()),['mainOpen','mainParked']);
assert.match(node('#overviewWindowGrid').innerHTML,/Parked · Project-wide/);
assert.doesNotMatch(node('#overviewWindowGrid').innerHTML,/sideOpen|sideParked|otherSide/);
console.log('Side Area window context passed: native Apps cards, shortcut order and Overview filters retain local Side windows across main Project/desktop changes without mixing other displays.');
