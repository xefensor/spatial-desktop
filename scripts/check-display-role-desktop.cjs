const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const Roles=require('../dist/display-roles.js'),Pages=require('../dist/desktop-pages.js'),Tiles=require('../dist/spatial-tiling.js');
const source=fs.readFileSync(path.join(__dirname,'../dist/display-role-desktop.js'),'utf8');
const shell=fs.readFileSync(path.join(__dirname,'../dist/desktop-shell.js'),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const slice=(start,end)=>shell.slice(shell.indexOf(start),shell.indexOf(end,shell.indexOf(start)));
function fixture(count=2){
  const listeners={},elements={},frames={},storage=new Map(),roster=Array.from({length:count},(_,index)=>({slot:index+1,source:'browser-'+index,width:1440,height:900}));
  for(const selector of ['#emptyWorkspace','.workspace-zone','.desktop-context-page'])elements[selector]={hidden:false,textContent:'',setAttribute(name,value){this[name]=value;}};
  const assignments={work:{apps:{browser:1,editor:2,music:1},areas:{apps:1,systems:2}},gaming:{apps:{browser:1,editor:2,music:1},areas:{apps:1,systems:2}}};
  const removedProjects=[],released=[],packets=[],transfers=[],areaTransfers=[];
  const c={
    SpatialDisplayRoles:Roles,activeWorkspace:'work',localSlot:1,roster,
    workspaceProfiles:{work:{label:'Work',home:'/Work'},gaming:{label:'Gaming',home:'/Gaming'}},
    activeDisplayRoster:()=>c.roster,localDisplaySlot:()=>c.localSlot,extendedDesktopActive:()=>c.roster.length>1,
    otherDisplaySlot:()=>c.localSlot===1?2:1,
    desktopPages:Pages.create(),appInfo:{browser:{label:'Firefox'},editor:{label:'Editor'},music:{label:'Music'}},appState:{browser:'open',editor:'open',music:'closed'},
    windowMembership:{work:{browser:null,editor:'site'},gaming:{browser:null,editor:null}},
    appMaximizedState:{browser:false,editor:true,music:false},tileEngine:Tiles,
    tileSessions:{'work:desktop:0:1':{root:Tiles.leaf('browser'),floating:{},parked:{}},'work:desktop:0:2':{root:Tiles.leaf('editor'),floating:{editor:{left:0}},parked:{editor:{reason:'fit'}},focus:{name:'editor'},fullscreen:{name:'editor'}}},
    displayAssignmentsFor:(workspace=c.activeWorkspace)=>assignments[workspace],intentAreaPlan:{moves:{}},areaPriority:['apps','systems'],areaFor:()=>({hidden:false}),
    window:{innerWidth:1440,innerHeight:900},placementUndoEpoch:0,frontApp:'browser',desktopHasWindowFocus:true,
    readDesktopStorage:(key,fallback)=>storage.has(key)?JSON.parse(storage.get(key)):fallback,
    desktopStorage:{setItem:(key,value)=>storage.set(key,value)},
    $:selector=>elements[selector]||null,
    document:{body:{dataset:{}},addEventListener(type,handler){(listeners[type]||=[]).push(handler);}},
    CustomEvent:class{constructor(type){this.type=type;}},dispatchEvent(){},addEventListener(type,handler){(listeners[type]||=[]).push(handler);},
    releaseBorrowedApp:id=>released.push(id),removeWindowFromSavedProjects:id=>removedProjects.push(id),
    leaveTileFocus(session){session.focus=null;},leaveAppFullscreen(session){session.fullscreen=null;},
    frameFor:id=>frames[id]||(frames[id]={classList:{remove(){}},dataset:{}}),
    persistDisplayAssignments(){},saveDesktopPages(){},saveTileSessions(){},saveIndependentSessions(){},
    refreshIntentAreas(){},layoutDockAreas(){},renderTileLayout(){},queueDesktopStateBroadcast(){},
    syncApps(){c.visible=Object.keys(c.appState).filter(id=>c.appState[id]==='open'&&c.isLocalApp(id));},
    tileBounds:()=>({x:8,y:8,width:1424,height:884}),
    isLocalArea:name=>Number(assignments[c.activeWorkspace].areas[name]||1)===c.localSlot,
    changeDesktopPage:delta=>c.desktopPages.go(c.activeWorkspace,c.desktopPages.current(c.activeWorkspace)+delta),
    updateDesktopPageUi(){},rebalanceAreaDisplays(){return true;},updateDesktopSyncPresence(){},localDisplayRoleLabel:()=>c.localSlot===1?'Main display':'Display '+c.localSlot,
    transferAppToDisplay(id,target){transfers.push({id,target});assignments[c.activeWorkspace].apps[id]=target;},
    transferAreaToDisplay(name,target){areaTransfers.push({name,target});assignments[c.activeWorkspace].areas[name]=target;return true;},
    openApp(id){assignments[c.activeWorkspace].apps[id]=c.localSlot;c.appState[id]='open';c.frontApp=id;c.desktopHasWindowFocus=true;c.syncApps();return id;},
    closeApp(id){c.appState[id]='closed';c.syncApps();},bringToFront(id){c.frontApp=id;c.desktopHasWindowFocus=true;},
    captureDesktopSyncState:()=>({schema:5,activeWorkspace:c.activeWorkspace,frontApp:c.frontApp,desktopHasWindowFocus:c.desktopHasWindowFocus}),
    applyDesktopSyncState(packet){if(!packet)return;packets.push(clone(packet));c.activeWorkspace=packet.activeWorkspace;if(packet.frontApp!==undefined)c.frontApp=packet.frontApp;if(packet.desktopHasWindowFocus!==undefined)c.desktopHasWindowFocus=packet.desktopHasWindowFocus;c.syncApps();},
    capturePlacement:()=>({workspace:c.activeWorkspace,assignments:clone(assignments[c.activeWorkspace]),pages:c.desktopPages.snapshot()}),
    restorePlacement(saved){Object.assign(assignments[c.activeWorkspace],clone(saved.assignments));c.desktopPages.load(saved.pages);},
    contextMenuEntries:context=>context.kind==='area'?[{action:'area-move-display',label:'Move to other display'},{action:'area-hide',label:'Hide'}]:[{action:'desktop-settings',label:'Settings'}],executeContextAction(){},closeDesktopContextMenu(){},desktopNavigationBlocked:()=>false,
    showToast(message){c.toast=message;},
    SpatialDisplaySettings:{refresh(){},open(){}},SpatialDisplayWorkbench:{refresh(){}},
  };
  for(const workspace of ['work','gaming'])for(const id of Object.keys(c.appInfo))c.desktopPages.assign(workspace,id,0,'workspace');
  vm.createContext(c);
  // Use the real normal-display membership and tile-context implementations.
  vm.runInContext(slice('function isLocalApp(name) {','function isLocalArea(name) {'),c);
  vm.runInContext(slice('function tileContextKey() {','function tileSession() {'),c);
  vm.runInContext(slice('function intentContextPrefix() {','function screenWindowRect(frame) {'),c);
  vm.runInContext(source,c);
  return {c,assignments,listeners,storage,packets,transfers,areaTransfers,removedProjects,released};
}

{
  const {c,assignments,removedProjects,released}=fixture();
  c.SpatialDisplayRoleBridge.setRole(2,'side');
  assert.equal(c.SpatialDisplayRoleBridge.state().role,'main');
  assert.equal(c.isLocalApp('editor'),false,'The helper window is not duplicated on the main display');
  assert.equal(assignments.work.apps.editor,2);assert.equal(c.windowMembership.work.editor,null);
  assert(removedProjects.includes('editor'));assert(released.includes('editor'));
  assert.equal(c.tileSessions['work:desktop:0:2'].root,null,'Pinning removes stale normal-display tile membership');
  assert.deepEqual(clone(c.tileSessions['work:desktop:0:2'].floating),{});
  assert.equal(c.tileSessions['work:desktop:0:2'].focus,null);assert.equal(c.tileSessions['work:desktop:0:2'].fullscreen,null);
  c.localSlot=2;
  assert.equal(c.isLocalApp('editor'),true);assert.equal(c.isLocalApp('browser'),false,'Unpinned apps cannot appear on helper displays');
  assert.equal(c.isLocalArea('apps'),false);
  const key=c.tileContextKey(),intentKey=c.intentContextPrefix();
  assert.equal(key,intentKey+c.localSlot,'The helper’s intent and tile contexts refer to the same session');
  c.desktopPages.assign('work','browser',2,'site');c.desktopPages.select('work','site');c.desktopPages.go('work',2);
  assert.equal(c.isLocalApp('editor'),true,'Helper membership survives a different Project and desktop');
  assert.equal(c.tileContextKey(),key,'Helper tiling has a stable Workspace context');
  assert.equal(c.intentContextPrefix(),intentKey,'Area intent cannot switch the helper back into a Project context');
  assert.equal(c.changeDesktopPage(1),false,'Scrolling a helper display cannot change the user’s desktop');
  c.activeWorkspace='gaming';
  assert.equal(c.isLocalApp('editor'),false,'A Workspace cannot inherit another Workspace’s pinned app');
  assert.notEqual(c.tileContextKey(),key);
  c.activeWorkspace='work';
  assert.equal(c.isLocalApp('editor'),true);
  c.SpatialDisplayRoleBridge.updateSpace({note:'Reference notes'});
  assert.equal(c.SpatialDisplayRoleBridge.state().space.note,'Reference notes');
}

{
  const {c}=fixture(3);c.SpatialDisplayRoleBridge.setRole(2,'side');c.SpatialDisplayRoleBridge.setRole(3,'assistant');
  c.transferAppToDisplay('browser',2);
  assert.equal(c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[2].windows.includes('browser'),true);
  c.transferAppToDisplay('browser',3);
  const pins=c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays;
  assert.equal(pins[2].windows.includes('browser'),false);assert.equal(pins[3].windows.includes('browser'),true);
  c.desktopPages.assign('work','music',2,'site');c.desktopPages.select('work','site');c.desktopPages.go('work',2);
  c.transferAppToDisplay('browser',1);
  assert.equal(c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[3].windows.includes('browser'),false);
  assert.equal(c.desktopPages.pageOf('work','browser'),2);assert.equal(c.desktopPages.columnOf('work','browser'),'site');
  assert.equal(c.windowMembership.work.browser,'site');assert.equal(c.isLocalApp('browser'),true,'Returning attaches the window to the current desktop');
  c.transferAppToDisplay('browser',2);c.openApp('browser');
  assert.equal(c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[2].windows.includes('browser'),false,'Opening a helper window from the main display returns it');
  assert.equal(c.isLocalApp('browser'),true);
  c.localSlot=3;c.openApp('music');
  assert.equal(c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[3].windows.includes('music'),true,'Opening on a helper creates a local helper window');
  c.closeApp('music');assert.equal(c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[3].windows.includes('music'),false);
}

{
  const {c,packets,listeners}=fixture();c.SpatialDisplayRoleBridge.setRole(2,'assistant');
  const saved=c.captureDesktopSyncState();assert(saved.displayRoles,'Linked displays receive role and helper content state');
  c.frontApp='browser';c.desktopHasWindowFocus=true;
  c.applyDesktopSyncState({...saved,frontApp:'editor',desktopHasWindowFocus:false});
  assert.equal(c.frontApp,'browser');assert.equal(c.desktopHasWindowFocus,true,'Assistant sync does not take the user’s local focus');
  assert.equal(packets.at(-1).frontApp,'browser');assert.equal(packets.at(-1).desktopHasWindowFocus,true);
  c.desktopHasWindowFocus=false;c.applyDesktopSyncState({...saved,frontApp:'editor',desktopHasWindowFocus:true});
  assert.equal(c.desktopHasWindowFocus,false,'Remote activity cannot focus an unfocused local desktop');
  c.localSlot=2;c.frontApp='editor';c.desktopHasWindowFocus=true;
  c.SpatialDisplayRoleBridge.updateSpace({assistant:{status:'working',task:'Prepare references'}});
  const event={target:{closest:selector=>selector==='[data-app-frame]'?{}:null}};
  for(const handler of listeners.pointerdown||[])handler(event);
  assert.equal(c.SpatialDisplayRoleBridge.state().space.assistant.status,'paused','Taking over an Assistant window pauses its work');
  c.applyDesktopSyncState({...c.captureDesktopSyncState(),frontApp:'browser',desktopHasWindowFocus:false});
  assert.equal(c.frontApp,'editor');assert.equal(c.desktopHasWindowFocus,true,'The helper display also keeps its own focus');
}

{
  const {c}=fixture();c.SpatialDisplayRoleBridge.setRole(2,'side');
  const saved=c.capturePlacement();c.transferAppToDisplay('browser',2);c.restorePlacement(saved);
  assert.equal(c.isLocalApp('browser'),true);assert.equal(c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[2].windows.includes('browser'),false,'Placement Undo restores role membership along with layout');
  c.desktopPages.assign('work','music',2,'site');c.desktopPages.select('work','site');c.desktopPages.go('work',2);
  const pair=c.roster.slice();c.roster=[pair[0]];c.localSlot=1;c.updateDesktopSyncPresence();
  assert.equal(c.SpatialDisplayRoleBridge.state().role,'main');
  assert.equal(c.isLocalApp('editor'),true,'A disconnected helper window recovers on the sole display');
  c.roster=pair;c.updateDesktopSyncPresence();
  assert.equal(c.SpatialDisplayRoleBridge.state().displays[1].role,'side');assert.equal(c.isLocalApp('editor'),false);
  c.localSlot=2;assert.equal(c.isLocalApp('editor'),true,'Reconnecting restores helper membership');
}

{
  const {c,assignments}=fixture();c.SpatialDisplayRoleBridge.setRole(2,'side');
  c.desktopPages.assign('work','music',2,'site');c.desktopPages.select('work','site');c.desktopPages.go('work',2);
  c.roster=[c.roster[0]];c.updateDesktopSyncPresence();c.openApp('editor');
  assert.equal(c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[2].windows.includes('editor'),false,'Explicitly opening a recovered window releases its old helper pin');
  assert.equal(c.desktopPages.columnOf('work','editor'),'site');assert.equal(c.desktopPages.pageOf('work','editor'),2);assert.equal(assignments.work.apps.editor,1);
}

{
  const {c,assignments}=fixture();c.SpatialDisplayRoleBridge.setRole(2,'side');
  c.desktopPages.assign('work','music',2,'site');c.desktopPages.select('work','site');c.desktopPages.go('work',2);
  c.activeWorkspace='gaming';c.localSlot=2;c.openApp('music');
  c.desktopPages.assign('gaming','browser',3,'stream');c.desktopPages.select('gaming','stream');c.desktopPages.go('gaming',3);
  c.activeWorkspace='work';c.localSlot=1;c.SpatialDisplayRoleBridge.setRole(2,'extended');
  const spaces=c.SpatialDisplayRoleDesktop.snapshot().workspaces;
  assert.deepEqual(clone(spaces.work.displays[2].windows),[],'Changing a helper to normal releases its Workspace pins');
  assert.deepEqual(clone(spaces.gaming.displays[2].windows),[],'Inactive Workspaces release pins into their own remembered desktop');
  assert.equal(c.desktopPages.columnOf('work','editor'),'site');assert.equal(c.desktopPages.pageOf('work','editor'),2);
  assert.equal(c.desktopPages.columnOf('gaming','music'),'stream');assert.equal(c.desktopPages.pageOf('gaming','music'),3);
  assert.equal(c.windowMembership.work.editor,'site');assert.equal(c.windowMembership.gaming.music,'stream');
  assert.equal(assignments.work.apps.editor,2);assert.equal(assignments.gaming.apps.music,2);
  c.localSlot=2;assert.equal(c.isLocalApp('editor'),true,'Released windows remain visible on the now-normal display');
}

{
  const {c,assignments,areaTransfers}=fixture();
  assert.equal(c.transferAreaToDisplay('apps',2),true,'Areas can move to an ordinary extended display');
  assert.equal(assignments.work.areas.apps,2);assert.equal(areaTransfers.length,1);
  c.SpatialDisplayRoleBridge.setRole(2,'side');
  assert.equal(assignments.work.areas.apps,1,'Reserving a helper display returns its Areas to the main display');
  c.transferAreaToDisplay('apps',2);
  assert.equal(assignments.work.areas.apps,1);assert.equal(areaTransfers.length,1,'Side space blocks Area transfers');
  assert.equal(c.contextMenuEntries({kind:'area',name:'apps'}).some(entry=>entry.action==='area-move-display'),false,'The Area menu hides unavailable helper-display moves');
  assert.equal(c.contextMenuEntries({kind:'area',name:'apps'}).some(entry=>entry.action==='area-hide'),true,'Other Area actions remain available');
  c.SpatialDisplayRoleBridge.setRole(2,'assistant');c.transferAreaToDisplay('apps',2);
  assert.equal(assignments.work.areas.apps,1);assert.equal(areaTransfers.length,1,'Assistant space also blocks Area transfers');
  c.SpatialDisplayRoleBridge.setRole(2,'extended');
  assert.equal(c.contextMenuEntries({kind:'area',name:'apps'}).some(entry=>entry.action==='area-move-display'),true);
  assert.equal(c.transferAreaToDisplay('apps',2),true);assert.equal(assignments.work.areas.apps,2);assert.equal(areaTransfers.length,2);
}

console.log('Display-role integration: helper visibility, Project-independent tiling, transfers, Workspace isolation, sync focus and reconnect recovery passed');
