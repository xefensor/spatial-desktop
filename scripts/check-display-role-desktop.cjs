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
    refreshIntentAreas(){},layoutDockAreas(){},renderTileLayout(preferred){c.renderedPreferred=preferred;},queueDesktopStateBroadcast(){},
    syncApps(){c.visible=Object.keys(c.appState).filter(id=>c.appState[id]==='open'&&c.isLocalApp(id));},
    tileBounds:()=>({x:8,y:8,width:Math.max(1,c.window.innerWidth-16),height:Math.max(1,c.window.innerHeight-16)}),
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
    contextMenuEntries(context){
      if(context.kind==='area')return [{action:'area-move-display',label:'Move to other display'},{action:'area-hide',label:'Hide'}];
      if(context.kind==='app')return [{info:'Editor · Desktop 1'},{action:'app-open',label:'Open'}];
      // scoped-actions.js nests Settings; no direct desktop-settings entry survives.
      return [{info:'Desktop 1 · Work'},{action:'desktop-page:next',label:'Next desktop'},{action:'desktop-new-folder',label:'New folder'},{action:'desktop-paste',label:'Paste'},
        {label:'Project · Website',children:[{action:'project-close',label:'Close Project'}]},
        {action:'desktop-wallpaper',label:'Wallpaper'},{label:'System-wide',children:[{action:'desktop-settings',label:'Settings'}]}];
    },executeContextAction(){},closeDesktopContextMenu(){},desktopNavigationBlocked:()=>false,
    showToast(message){c.toast=message;},
    SpatialDisplaySettings:{refresh(){},open(){c.settingsOpened=true;}},SpatialDisplayWorkbench:{refresh(){}},
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

// Supporting-display tools always occupy a vertical side panel. They cannot
// leave a ghost header or turn into a bottom strip on smaller viewports.
for(const [viewport,panel] of [[1440,240],[900,240],[899,200],[600,200],[599,160],[320,160]]){
  const {c}=fixture();
  c.window.innerWidth=viewport;
  const normal={x:8,y:8,width:viewport-16,height:884};
  assert.deepEqual(clone(c.tileBounds()),normal,'Main display keeps its normal tiling bounds at '+viewport+'px');
  c.localSlot=2;
  assert.deepEqual(clone(c.tileBounds()),normal,'Extended display keeps its normal tiling bounds at '+viewport+'px');
  for(const role of ['side','assistant']){
    c.SpatialDisplayRoleBridge.setRole(2,role);
    const actual=clone(c.tileBounds());
    assert.deepEqual(actual,{...normal,x:8+panel,width:Math.max(1,normal.width-panel)},role+': the '+viewport+'px canvas reserves only its '+panel+'px side panel');
    assert.equal(actual.y,8,role+': no top-header space remains');
    assert.equal(actual.height,normal.height,role+': windows retain the entire canvas height');
  }
  c.SpatialDisplayRoleBridge.setRole(2,'extended');
  assert.deepEqual(clone(c.tileBounds()),normal,'Returning to Extended releases the supporting-display panel');
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

{
  const {c}=fixture();
  const normal=c.contextMenuEntries({kind:'desktop'}),roleMenu=normal.find(entry=>entry.label==='Display role');
  assert(roleMenu,'Display role remains reachable after scoped Settings are nested under System-wide');
  assert(normal.indexOf(roleMenu)<normal.findIndex(entry=>entry.label==='System-wide'),'Display role is placed beside the other system settings');
  assert.equal(roleMenu.children.find(entry=>entry.action==='display-role:main').checked,true);
  assert.equal(roleMenu.children.find(entry=>entry.action==='display-role:side').disabled,true,'The current main cannot silently give away the user’s only working surface');
  assert(roleMenu.children.some(entry=>entry.action==='display-settings'&&entry.label==='Open Displays'));
  assert(normal.some(entry=>entry.action==='desktop-page:next'),'Normal displays retain desktop navigation');
  c.executeContextAction('display-settings');assert.equal(c.settingsOpened,true,'The menu’s Open Displays action reaches Settings');
  c.SpatialDisplayRoleBridge.setRole(2,'side');c.localSlot=2;
  const side=c.contextMenuEntries({kind:'desktop'}),sideRoles=side.find(entry=>entry.label==='Display role');
  assert.equal(sideRoles.children.find(entry=>entry.action==='display-role:side').checked,true);
  assert.equal(sideRoles.children.find(entry=>entry.action==='display-role:main').checked,false);
  assert.equal(sideRoles.children.find(entry=>entry.action==='display-role:main').disabled,false);
  assert.equal(side.some(entry=>entry.action?.startsWith('desktop-page:')),false);
  assert.equal(side.some(entry=>['desktop-new-folder','desktop-paste'].includes(entry.action)),false);
  assert.equal(side.some(entry=>entry.label?.startsWith('Project · ')),false,'Side space does not offer actions for a Project it does not follow');
  assert(side.some(entry=>entry.action==='desktop-wallpaper'),'Independent display actions remain available');
  assert.match(side.find(entry=>entry.info).info,/Side space · Display 2 · Work Workspace · all desktops and Projects/);
  c.SpatialDisplayRoleBridge.setRole(2,'assistant');
  const assistant=c.contextMenuEntries({kind:'desktop'});
  assert.match(assistant.find(entry=>entry.info).info,/Assistant · Display 2 · Work Workspace/);
  assert.equal(assistant.find(entry=>entry.label==='Display role').children.find(entry=>entry.action==='display-role:assistant').checked,true);
  assert.equal(assistant.some(entry=>entry.action==='desktop-page:next'||entry.label?.startsWith('Project · ')),false);
  c.roster=[c.roster[0]];c.localSlot=1;c.updateDesktopSyncPresence();
  const single=c.contextMenuEntries({kind:'desktop'}).find(entry=>entry.label==='Display role');
  assert(single.children.some(entry=>entry.info?.includes('only display')));
  assert(single.children.some(entry=>entry.action==='display-settings'),'A sole display can still open setup and add a companion');
}

{
  const {c}=fixture();c.SpatialDisplayRoleBridge.setRole(2,'side');c.localSlot=2;
  c.frameFor('editor').querySelector=selector=>selector==='.app-identity small'?{textContent:'Website launch notes'}:null;
  c.appState.editor='minimized';
  assert.deepEqual(clone(c.SpatialDisplayRoleBridge.state().parkedWindows),[{id:'editor',label:'Editor',title:'Website launch notes'}],'A helper’s parked list retains the actual document title');
  c.frontApp='browser';c.renderedPreferred=null;
  assert.equal(c.SpatialDisplayRoleBridge.openWindow('editor'),true);
  assert.equal(c.appState.editor,'open');assert.equal(c.isLocalApp('editor'),true);assert.equal(c.frontApp,'editor');
  assert.equal(c.renderedPreferred,'editor','The restored helper window gets priority while fitting the tile layout');
  assert.deepEqual(clone(c.SpatialDisplayRoleBridge.state().parkedWindows),[]);
  c.appState.editor='minimized';c.localSlot=1;
  assert.equal(c.SpatialDisplayRoleBridge.openWindow('editor'),false,'Main display cannot restore a helper’s parked button');
  assert.equal(c.appState.editor,'minimized');c.localSlot=2;c.activeWorkspace='gaming';
  assert.equal(c.SpatialDisplayRoleBridge.openWindow('editor'),false,'A parked button from another Workspace cannot restore its app');
  c.activeWorkspace='work';c.appState.editor='closed';
  assert.equal(c.SpatialDisplayRoleBridge.openWindow('editor'),false,'Closed apps cannot be reopened by stale parked controls');
  assert.equal(c.SpatialDisplayRoleBridge.openWindow('unknown-app'),false);
}

console.log('Display-role integration: full-height side-panel geometry, helper visibility, Project-independent tiling, transfers, Workspace isolation, sync focus and reconnect recovery passed');
