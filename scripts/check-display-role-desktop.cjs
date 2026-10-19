const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const Roles=require('../dist/display-roles.js'),Pages=require('../dist/desktop-pages.js'),Tiles=require('../dist/spatial-tiling.js'),AssistantFiles=require('../dist/assistant-files.js'),Resources=require('../dist/empty-desktop-resources.js');
const source=fs.readFileSync(path.join(__dirname,'../dist/display-role-desktop.js'),'utf8');
const shell=fs.readFileSync(path.join(__dirname,'../dist/desktop-shell.js'),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const slice=(start,end)=>shell.slice(shell.indexOf(start),shell.indexOf(end,shell.indexOf(start)));
function fixture(count=2,savedRoles=null,savedTiles=null,savedAssignments=null){
  const listeners={},elements={},frames={},storage=new Map(),roster=Array.from({length:count},(_,index)=>({slot:index+1,source:'browser-'+index,width:1440,height:900}));
  for(const selector of ['#emptyWorkspace','.workspace-zone','.desktop-context-page'])elements[selector]={hidden:false,textContent:'',setAttribute(name,value){this[name]=value;}};
  const assignments=savedAssignments||{work:{apps:{browser:1,editor:2,music:1},areas:{apps:1,systems:2,ai:1}},gaming:{apps:{browser:1,editor:2,music:1},areas:{apps:1,systems:2,ai:1}}};
  const areas={apps:{hidden:false},systems:{hidden:false},ai:{hidden:true}};
  const initialAreas={state:{apps:{edge:'left',order:0},systems:{edge:'right',order:0},ai:{edge:'right',order:1}},hidden:{apps:false,systems:false,ai:true},preferred:{apps:'expanded',systems:'rail',ai:'rail'},sizes:{left:310,right:300}};
  const removedProjects=[],released=[],packets=[],transfers=[],areaTransfers=[],created=[],fileLocations=[],openedFiles=[],browserLocations=[],notes={},boundNotes={};
  const c={
    SpatialDisplayRoles:Roles,SpatialAssistantFiles:AssistantFiles,URL,activeWorkspace:'work',localSlot:1,roster,projectSpaces:{},openProjectNames:()=>[],
    workspaceProfiles:{work:{label:'Work',home:'/Work'},gaming:{label:'Gaming',home:'/Gaming'}},
    activeDisplayRoster:()=>c.roster,localDisplaySlot:()=>c.localSlot,extendedDesktopActive:()=>c.roster.length>1,
    otherDisplaySlot:()=>c.localSlot===1?2:1,
    desktopPages:Pages.create(),appInfo:{browser:{label:'Firefox'},editor:{label:'Editor'},music:{label:'Music'}},appState:{browser:'open',editor:'open',music:'closed'},
    windowMembership:{work:{browser:null,editor:'site'},gaming:{browser:null,editor:null}},
    appMaximizedState:{browser:false,editor:true,music:false},tileEngine:Tiles,
    tileSessions:{'work:desktop:0:1':{root:Tiles.leaf('browser'),floating:{},parked:{}},'work:desktop:0:2':{root:Tiles.leaf('editor'),floating:{editor:{left:0}},parked:{editor:{reason:'fit'}},focus:{name:'editor'},fullscreen:{name:'editor'}}},
    displayAssignmentsFor:(workspace=c.activeWorkspace)=>assignments[workspace],areaFor:name=>areas[name],widgetIdFor:name=>({systems:'controls',ai:'assistant'})[name]||name,
    SpatialPanels:{isWidgetVisible:id=>!areas[({controls:'systems',assistant:'ai'})[id]||id]?.hidden&&Number(assignments[c.activeWorkspace].areas[({controls:'systems',assistant:'ai'})[id]||id]||1)===c.localSlot,showWidget(id){const name=({controls:'systems',assistant:'ai'})[id]||id;areas[name].hidden=false;assignments[c.activeWorkspace].areas[name]=c.localSlot;return true;}},
    dockState:clone(initialAreas.state),workspaceAreaSessions:{},defaultAreaSession:clone(initialAreas),areaInsets:{left:0,right:0},
    stateSideMinimum:()=>300,persistAreaSessions(){},
    snapshotAreaLayout(){const layout=clone(c.workspaceAreaSessions[c.activeWorkspace]||c.defaultAreaSession);layout.hidden=Object.fromEntries(Object.entries(areas).map(([name,area])=>[name,area.hidden]));return layout;},
    applyAreaSession(workspace){for(const [name,hidden] of Object.entries(c.workspaceAreaSessions[workspace].hidden||{}))areas[name].hidden=hidden;},
    window:{innerWidth:1440,innerHeight:900},placementUndoEpoch:0,frontApp:'browser',desktopHasWindowFocus:true,
    readDesktopStorage:(key,fallback)=>storage.has(key)?JSON.parse(storage.get(key)):fallback,
    desktopStorage:{setItem:(key,value)=>storage.set(key,value)},
    $:selector=>elements[selector]||null,
    document:{body:{dataset:{}},addEventListener(type,handler){(listeners[type]||=[]).push(handler);}},
    CustomEvent:class{constructor(type){this.type=type;}},dispatchEvent(){},addEventListener(type,handler){(listeners[type]||=[]).push(handler);},
    releaseBorrowedApp:id=>released.push(id),removeWindowFromSavedProjects:id=>removedProjects.push(id),
    leaveTileFocus(session){session.focus=null;},leaveAppFullscreen(session){session.fullscreen=null;},
    frameFor:id=>frames[id]||(frames[id]={classList:{remove(){}},dataset:{appFrame:id},preview:{hidden:true,innerHTML:''},querySelector(selector){return selector==='.file-preview'?this.preview:null;}}),
    persistDisplayAssignments(){},saveDesktopPages(){},saveTileSessions(){},saveIndependentSessions(){},
    schedulePanelLayout(){},renderTileLayout(preferred){c.renderedPreferred=preferred;},queueDesktopStateBroadcast(){},
    syncApps(){c.visible=Object.keys(c.appState).filter(id=>c.appState[id]==='open'&&c.isLocalApp(id));},
    tileBounds:()=>({x:8,y:8,width:Math.max(1,c.window.innerWidth-16-c.areaInsets.left-c.areaInsets.right),height:Math.max(1,c.window.innerHeight-16)}),
    isLocalArea:name=>Number(assignments[c.activeWorkspace].areas[name]||1)===c.localSlot,
    changeDesktopPage:delta=>c.desktopPages.go(c.activeWorkspace,c.desktopPages.current(c.activeWorkspace)+delta),
    updateDesktopPageUi(){},rebalanceAreaDisplays(){return true;},updateDesktopSyncPresence(){},localDisplayRoleLabel:()=>c.localSlot===1?'Main display':'Display '+c.localSlot,
    transferAppToDisplay(id,target){transfers.push({id,target});assignments[c.activeWorkspace].apps[id]=target;},
    transferAreaToDisplay(name,target){areaTransfers.push({name,target});assignments[c.activeWorkspace].areas[name]=target;return true;},
    openApp(id){assignments[c.activeWorkspace].apps[id]=c.localSlot;c.appState[id]='open';c.frontApp=id;c.desktopHasWindowFocus=true;c.syncApps();return id;},
    closeApp(id){c.appState[id]='closed';c.syncApps();},minimizeApp(id){if(c.appState[id]==='open')c.appState[id]='minimized';c.syncApps();},bringToFront(id){c.frontApp=id;c.desktopHasWindowFocus=true;},
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
    createAppInstance(kind){const id=kind+'--'+(created.length+1);created.push({id,kind});c.appInfo[id]={label:kind,base:kind};c.appState[id]='closed';c.openApp(id);return id;},
    renderFileLocation(id,path){fileLocations.push({id,path});},appFileRows:()=>[['brief.md','Saved file','document']],openAppFile(id,name){openedFiles.push({id,name});},
    navigateBrowser(id,url){browserLocations.push({id,url});},captureWorkspaceContent(){},
    SpatialNoteFiles:{bind(id,file){const saved=c.workspaceDownloads?.list(file.path.slice(0,file.path.lastIndexOf('/'))).find(row=>row.path===file.path||row.name===file.path.split('/').at(-1));if(!saved||saved.itemId!==file.itemId||file.workspace!==c.activeWorkspace)return false;boundNotes[id]=clone(file);notes[id].file=clone(file);notes[id].text=saved.content;return true;}},
    SpatialAppTools:{activeNote:model=>model},appWindowModel:id=>notes[id]||=({title:'',text:''}),renderNotes(){},saveAppWindows(){},
  };
  for(const workspace of ['work','gaming'])for(const id of Object.keys(c.appInfo))c.desktopPages.assign(workspace,id,0,'workspace');
  if(savedRoles)storage.set('spatial-display-roles-v1',JSON.stringify(savedRoles));
  if(savedTiles)c.tileSessions=savedTiles;
  vm.createContext(c);
  // Use the real normal-display membership and tile-context implementations.
  vm.runInContext(slice('function isLocalApp(name) {','function isLocalArea(name) {'),c);
  vm.runInContext(slice('function isLocalArea(name) {','function persistDisplayAssignments() {'),c);
  vm.runInContext(slice('function tileContextKey() {','function tileSession() {'),c);
  vm.runInContext(slice('function intentContextPrefix() {','function screenWindowRect(frame) {'),c);
  vm.runInContext(source,c);
  return {c,assignments,areas,listeners,storage,packets,transfers,areaTransfers,removedProjects,released,created,fileLocations,openedFiles,browserLocations,notes,boundNotes};
}

// Supporting-display tools use normal Areas. Tiling consumes the workspace
// bounds their ordinary layout provides without reserving a second panel.
for(const viewport of [1440,1100,1099,900,899,600,599,320]){
  const {c}=fixture();
  c.window.innerWidth=viewport;
  const normal={x:8,y:8,width:viewport-16,height:884};
  assert.deepEqual(clone(c.tileBounds()),normal,'Main display keeps its normal tiling bounds at '+viewport+'px');
  c.localSlot=2;
  assert.deepEqual(clone(c.tileBounds()),normal,'Extended display keeps its normal tiling bounds at '+viewport+'px');
  for(const role of ['side']){
    c.SpatialDisplayRoleBridge.setRole(2,role);
    const actual=clone(c.tileBounds());
    assert.deepEqual(actual,normal,role+': no fixed supporting panel is reserved at '+viewport+'px');
    assert.equal(actual.y,8,role+': no top-header space remains');
    assert.equal(actual.height,normal.height,role+': windows retain the entire canvas height');
  }
  c.SpatialDisplayRoleBridge.setRole(2,'extended');
  assert.deepEqual(clone(c.tileBounds()),normal,'Returning to Extended uses the same ordinary bounds');
  c.SpatialDisplayRoleBridge.setRole(2,'side');c.areaInsets.left=310;c.areaInsets.right=68;
  assert.deepEqual(clone(c.tileBounds()),{...normal,width:Math.max(1,normal.width-378)},'Side tiling keeps the exact bounds supplied by expanded and compact normal Areas');
}

{
  const {c,assignments,removedProjects,released}=fixture();
  c.SpatialDisplayRoleBridge.setRole(2,'side');
  assert.equal(c.SpatialDisplayRoleBridge.state().role,'main');
  assert.equal(c.SpatialDisplayRoleBridge.isSideSpace(),false);
  assert.equal(c.SpatialDisplayRoleBridge.windowInCurrentContext('editor'),null,'Ordinary displays use normal desktop and Project membership');
  assert.equal(c.isLocalApp('editor'),false,'The helper window is not duplicated on the main display');
  assert.equal(assignments.work.apps.editor,2);assert.equal(c.windowMembership.work.editor,null);
  assert(removedProjects.includes('editor'));assert(released.includes('editor'));
  assert.equal(c.tileSessions['work:desktop:0:2'].root,null,'Pinning removes stale normal-display tile membership');
  assert.deepEqual(clone(c.tileSessions['work:desktop:0:2'].floating),{});
  assert.equal(c.tileSessions['work:desktop:0:2'].focus,null);assert.equal(c.tileSessions['work:desktop:0:2'].fullscreen,null);
  c.localSlot=2;
  assert.equal(c.SpatialDisplayRoleBridge.isSideSpace(),true);
  assert.equal(c.isLocalApp('editor'),true);assert.equal(c.isLocalApp('browser'),false,'Unpinned apps cannot appear on helper displays');
  assert.equal(c.SpatialDisplayRoleBridge.windowInCurrentContext('editor'),true);
  assert.equal(c.SpatialDisplayRoleBridge.windowInCurrentContext('browser'),false);
  assert.equal(c.SpatialDisplayRoleBridge.windowInCurrentContext('missing'),false);
  assert.equal(c.isLocalArea('apps'),false,'Apps remains on its assigned main display');
  assert.equal(c.isLocalArea('systems'),true,'An ordinary Area already assigned here remains visible');
  assert.equal(c.SpatialDisplayRoleBridge.ensureAssistantWidget(2),true);assert.equal(c.isLocalArea('ai'),true,'The Assistant widget is revealed on its local panel');
  assignments.work.areas.systems=1;assert.equal(c.isLocalArea('systems'),false,'Native widget visibility follows its panel display');assignments.work.areas.systems=2;
  const key=c.tileContextKey(),intentKey=c.intentContextPrefix();
  assert.equal(key,intentKey+c.localSlot,'The helper’s intent and tile contexts refer to the same session');
  c.desktopPages.assign('work','browser',2,'site');c.desktopPages.select('work','site');c.desktopPages.go('work',2);
  assert.equal(c.isLocalApp('editor'),true,'Helper membership survives a different Project and desktop');
  assert.equal(c.SpatialDisplayRoleBridge.windowInCurrentContext('editor'),true,'Normal Side Apps include their pinned windows while Main uses a Project');
  assert.equal(c.SpatialDisplayRoleBridge.windowInCurrentContext('browser'),false,'Main Project windows do not enter Side Apps');
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
  const {c}=fixture(3);c.SpatialDisplayRoleBridge.setRole(2,'side');c.SpatialDisplayRoleBridge.setRole(3,'side');c.SpatialDisplayRoleBridge.setAssistantAllowed(3,true);
  c.transferAppToDisplay('browser',2);
  assert.equal(c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[2].windows.includes('browser'),true);
  c.transferAppToDisplay('browser',3);
  const pins=c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays;
  assert.equal(pins[2].windows.includes('browser'),false);assert.equal(pins[3].windows.includes('browser'),true);
  c.localSlot=2;assert.equal(c.SpatialDisplayRoleBridge.windowInCurrentContext('browser'),false,'Other Side displays do not share their pinned window lists');c.localSlot=1;
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
  const {c,packets,listeners}=fixture();c.SpatialDisplayRoleBridge.setRole(2,'side');c.SpatialDisplayRoleBridge.setAssistantAllowed(2,true);
  const saved=c.captureDesktopSyncState();assert(saved.displayRoles,'Linked displays receive role and helper content state');
  c.frontApp='browser';c.desktopHasWindowFocus=true;
  c.applyDesktopSyncState({...saved,frontApp:'editor',desktopHasWindowFocus:false});
  assert.equal(c.frontApp,'browser');assert.equal(c.desktopHasWindowFocus,true,'Assistant sync does not take the user’s local focus');
  assert.equal(packets.at(-1).frontApp,'browser');assert.equal(packets.at(-1).desktopHasWindowFocus,true);
  c.desktopHasWindowFocus=false;c.applyDesktopSyncState({...saved,frontApp:'editor',desktopHasWindowFocus:true});
  assert.equal(c.desktopHasWindowFocus,false,'Remote activity cannot focus an unfocused local desktop');
  c.localSlot=2;c.frontApp='editor';c.desktopHasWindowFocus=true;
  c.SpatialDisplayRoleBridge.updateSpace({assistant:{status:'working',task:'Prepare references'}});
  const event={type:'pointerdown',target:{closest:selector=>selector==='[data-app-frame]'?c.frameFor('editor'):null}};
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

// Side display setup uses native panel APIs and never revives an Area layout.
{
  const {c,assignments,areas}=fixture();
  const before=clone(assignments.work.areas);
  c.SpatialDisplayRoleBridge.setRole(2,'side');
  assert.deepEqual(clone(assignments.work.areas),before,'Remote role setup leaves native widget placement to the local display');
  assert.equal(c.SpatialDisplayRoleBridge.ensureAssistantWidget(1),false,'Main is not a supporting Assistant display');
  c.localSlot=2;
  assert.equal(c.SpatialDisplayRoleBridge.ensureAssistantWidget(2),true,'The local supporting display reveals Assistant through the widget API');
  assert.equal(c.isLocalArea('ai'),true);assert.equal(areas.ai.hidden,false);
  assert.equal(c.SpatialDisplayRoleBridge.state().space.assistant.allowed,false,'Revealing Assistant grants no monitor permission');
  assert.equal(assignments.work.areas.apps,1,'Other widget assignments are preserved');
  c.activeWorkspace='gaming';assert.equal(c.SpatialDisplayRoleBridge.ensureAssistantWidget(2),true);
  assert.equal(assignments.gaming.areas.ai,2,'The active Workspace receives its own local Assistant widget');
}
{
  const saved={version:2,setups:{'displays:1|2':{roles:{1:'main',2:'side'}}},workspaces:{work:{displays:{2:{windows:['editor'],note:'Keep my notes',assistant:{allowed:false,task:'Saved task'}}}}}};
  const {c}=fixture(2,saved);c.localSlot=2;
  assert.equal(c.SpatialDisplayRoleBridge.ensureAssistantWidget(2),true);
  const space=c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[2];
  assert.deepEqual(clone(space.windows),['editor']);assert.equal(space.note,'Keep my notes');
  assert.equal(space.assistant.task,'Saved task');assert.equal(space.assistant.allowed,false);
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
  assert.equal(sideRoles.children.filter(entry=>entry.action?.startsWith('display-role:')).length,3,'Only Main, Extended and Side space are display roles');
  assert.equal(sideRoles.children.find(entry=>entry.action==='display-assistant-toggle').checked,false);
  c.executeContextAction('display-assistant-toggle');assert.equal(c.SpatialDisplayRoleBridge.state().space.assistant.allowed,true);
  c.executeContextAction('display-assistant-toggle');assert.equal(c.SpatialDisplayRoleBridge.state().space.assistant.allowed,false);
  assert.match(side.find(entry=>entry.info).info,/Side space · Display 2 · Work Workspace · all desktops and Projects/);
  c.SpatialDisplayRoleBridge.setAssistantAllowed(2,true);
  const assistant=c.contextMenuEntries({kind:'desktop'});
  assert.match(assistant.find(entry=>entry.info).info,/Side space · Display 2 · Work Workspace/);
  assert.equal(assistant.find(entry=>entry.label==='Display role').children.find(entry=>entry.action==='display-assistant-toggle').checked,true);
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

{
  const {c,created,fileLocations,openedFiles,browserLocations}=fixture();c.SpatialDisplayRoleBridge.setRole(2,'side');c.localSlot=2;
  const folder=c.SpatialDisplayRoleBridge.openReference({kind:'folder',path:'/Work/Documents'});
  assert.equal(created.at(-1).kind,'dolphin');assert.deepEqual(fileLocations.at(-1),{id:folder,path:'/Work/Documents'});
  assert.equal(c.isLocalApp(folder),true,'Opening a shelf folder creates a window on this helper display');
  assert.equal(c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[2].windows.includes(folder),true);
  const file=c.SpatialDisplayRoleBridge.openReference({kind:'file',path:'/Work/Documents/brief.md'});
  assert.notEqual(file,folder,'A shelf file uses a fresh File Browser rather than taking over another display’s window');
  assert.deepEqual(fileLocations.at(-1),{id:file,path:'/Work/Documents'});assert.deepEqual(openedFiles.at(-1),{id:file,name:'brief.md'});
  const browser=c.SpatialDisplayRoleBridge.openReference({kind:'link',url:'https://example.com/reference'});
  assert.equal(created.at(-1).kind,'browser');assert.deepEqual(browserLocations.at(-1),{id:browser,url:'https://example.com/reference'});assert.equal(c.isLocalApp(browser),true);
  const before=created.length;
  assert.throws(()=>c.SpatialDisplayRoleBridge.openReference({kind:'file',path:'/Gaming/private.md'}),/this Workspace/);
  assert.throws(()=>c.SpatialDisplayRoleBridge.openReference({kind:'link',url:'javascript:alert(1)'}),/HTTP or HTTPS/);
  assert.equal(created.length,before,'Invalid and foreign references cannot create windows');
  assert.throws(()=>c.SpatialDisplayRoleBridge.openReference({kind:'file',path:'/Work/Documents/missing.md'}),/no longer available/);
  assert.equal(c.appState[created.at(-1).id],'closed','An unavailable file does not leave an empty window behind');
  c.localSlot=1;assert.equal(c.isLocalApp(browser),false,'Opening helper references never covers the main display');
}

{
  const {c}=fixture();c.SpatialEmptyDesktopResources=Resources;
  c.workspaceProfiles.work.folders=[['Documents','Workspace folder','folder'],['.spatial-workspace.toml','Workspace settings','config']];
  c.projectSpaces={site:{name:'Website',root:'/Work/Projects/site',originWorkspace:'work',files:[['index.html','Website entry','document']]},closed:{name:'Closed Project',root:'/Work/Projects/closed',originWorkspace:'work',files:[['closed.md','Closed file','document']]},game:{name:'Game notes',root:'/Gaming/Projects/game',originWorkspace:'gaming',files:[['guide.md','Game guide','document']]}};
  c.openProjectNames=(workspace=c.activeWorkspace)=>workspace==='work'?['site']:['game'];
  c.workspaceDownloads={snapshot:()=>({directories:['/Work/Documents/Reports','/Gaming/Downloads'],files:[
    {workspace:'work',directory:'/Work/Documents',name:'brief.md',content:'Do not copy file contents into the picker'},
    {workspace:'work',project:'site',directory:'/Work/Projects/site',name:'review.md'},
    {workspace:'work',project:'closed',directory:'/Work/Projects/closed',name:'closed-secret.md'},
    {workspace:'gaming',directory:'/Gaming/Downloads',name:'game.txt'},
    {workspace:'work',directory:'/Gaming/Downloads',name:'mislabeled-private.txt'},
  ]})};
  c.SpatialMemoryDesktop={fileRows:directory=>directory==='/Work'?[['scratch.md','Saved note','document']]:[]};
  c.SpatialDisplayRoleBridge.setRole(2,'side');c.localSlot=2;
  const options=clone(c.SpatialDisplayRoleBridge.state().referenceOptions),paths=options.map(option=>option.path);
  for(const path of ['/Work','/Work/Documents','/Work/Documents/Reports','/Work/Documents/brief.md','/Work/scratch.md','/Work/Projects/site','/Work/Projects/site/index.html','/Work/Projects/site/review.md'])assert(paths.includes(path),'The real resource collector supplies '+path+' to the Side picker');
  assert.equal(options.find(option=>option.path==='/Work/Documents/brief.md').kind,'file');assert.equal(options.find(option=>option.path==='/Work/Documents').kind,'folder');
  assert.equal(new Set(paths).size,paths.length,'Workspace and Project collections deduplicate Home references');
  assert(!paths.some(path=>path.startsWith('/Gaming')||path.startsWith('/Work/Projects/closed')),'Foreign Workspace and closed Project references stay out');
  assert(!JSON.stringify(options).includes('Do not copy file contents'),'The picker contains references rather than document contents');
  c.activeWorkspace='gaming';const gamingPaths=c.SpatialDisplayRoleBridge.state().referenceOptions.map(option=>option.path);
  assert(gamingPaths.includes('/Gaming/Downloads/game.txt'));assert(gamingPaths.includes('/Gaming/Projects/game/guide.md'));assert(!gamingPaths.some(path=>path.startsWith('/Work')),'Switching Workspace replaces the catalogue');
}

{
  const {c,packets}=fixture();c.SpatialDisplayRoleBridge.setRole(2,'side');c.localSlot=2;
  const key=c.tileContextKey(),session={root:Tiles.leaf('editor'),floating:{},parked:{}};
  c.tileSessions[key]=session;c.SpatialDisplayRoleBridge.updateSpace({note:'Keep this shelf',folders:[{kind:'folder',path:'/Work/Documents'}]});
  c.SpatialDisplayRoleBridge.setAssistantAllowed(2,true);
  assert.equal(c.SpatialDisplayRoleBridge.state().role,'side','Permission changes no display role');
  assert.equal(c.SpatialDisplayRoleBridge.state().displays[1].assistantAllowed,true);
  c.activeWorkspace='gaming';assert.equal(c.SpatialDisplayRoleBridge.state().displays[1].assistantAllowed,false,'Settings permission follows the active Workspace');c.activeWorkspace='work';
  assert.equal(c.tileContextKey(),key,'Assistant and Side use the same tile session');
  assert.equal(c.intentContextPrefix()+2,key);assert.equal(c.tileSessions[key],session,'Mode toggle preserves the actual tile tree');
  assert.equal(c.tileSessions[key].root.name,'editor');
  assert.equal(c.SpatialDisplayRoleBridge.windowContextKey('editor'),key,'Window source scope stays stable when delegated');
  assert.equal(c.SpatialDisplayRoleBridge.state().space.note,'Keep this shelf');
  c.SpatialDisplayRoleBridge.setAssistantAllowed(2,false);assert.equal(c.tileSessions[key],session,'Removing permission preserves window arrangement too');
  assert.equal(c.SpatialDisplayRoleBridge.state().space.assistant.allowed,false);
  const old='work:display-role:side:2';delete c.tileSessions[key];c.tileSessions[old]=session;
  c.applyDesktopSyncState(c.captureDesktopSyncState());
  assert.equal(c.tileSessions[key],session,'Old saved Side sessions migrate to the shared context');assert.equal(c.tileSessions[old],undefined);
  const legacyPacket={...c.captureDesktopSyncState(),tileSessions:{[old]:{root:Tiles.leaf('editor')}}};
  c.applyDesktopSyncState(legacyPacket);
  assert.equal(c.tileSessions[key],session);assert.equal(c.tileSessions[old],undefined);
  assert.deepEqual(packets.at(-1).tileSessions,{[key]:{root:Tiles.leaf('editor')}},'Incoming role sessions are migrated before the desktop renderer receives them');
  assert.deepEqual(clone(legacyPacket.tileSessions),{[old]:{root:Tiles.leaf('editor')}},'Migration does not modify the caller’s saved packet');
  assert(c.captureDesktopSyncState().displayRoles);
  const incoming=c.captureDesktopSyncState();incoming.tileSessions={[old]:{root:Tiles.leaf('browser')},[key]:{root:Tiles.leaf('editor')}};
  c.applyDesktopSyncState(incoming);
  assert.deepEqual(packets.at(-1).tileSessions,{[key]:{root:Tiles.leaf('editor')}},'Canonical incoming layouts win over stale legacy layout records');
  assert.equal(c.tileSessions[key],session,'Existing canonical layouts are not overwritten by stale role-specific records');
}

{
  const {c,created,fileLocations,notes,listeners}=fixture();const B=c.SpatialDisplayRoleBridge;
  assert.throws(()=>B.runAssistantTask('briefing'),/connected Side space/);
  B.setRole(2,'side');c.localSlot=2;assert.throws(()=>B.runAssistantTask('briefing'),/Allow Assistant/);assert.throws(()=>B.assistantControl('resume'),/Allow Assistant/);
  B.setRole(2,'side');B.setAssistantAllowed(2,true);c.SpatialAIDesktop={workingFolder:()=>'/Work/Documents'};
  const mainBefore=c.appState.browser;
  let result=B.runAssistantTask('briefing');
  assert.equal(result.status,'done');assert.equal(result.control,'assistant');assert.equal(result.kind,'briefing');
  assert.deepEqual(clone(result.context),{workspace:'work',setup:'displays:1|2',slot:2,folder:'/Work/Documents'});
  assert.deepEqual(created.map(window=>window.kind),['notes','dolphin'],'Briefing opens actual Note Editor and folder windows immediately');
  assert.equal(fileLocations.at(-1).path,'/Work/Documents');assert(notes[created[0].id].text.includes('Editor'));assert(!notes[created[0].id].text.includes('Firefox'),'Briefing only includes windows on the delegated display');
  assert.deepEqual(clone(result.outputs),created.map(window=>window.id));
  for(const output of result.outputs)assert.equal(c.isLocalApp(output),true);
  assert.equal(c.appState.browser,mainBefore);assert.equal(c.isLocalApp('browser'),false,'The main-display window is not taken over');
  const count=created.length;
  const completed=clone(B.state().space.assistant);
  B.assistantControl('takeover');assert.equal(B.state().space.assistant.status,'paused');assert.throws(()=>B.runAssistantTask('image'),/Choose Continue/);
  assert.equal(B.state().space.assistant.result,completed.result,'Taking control preserves the actual task result');
  assert.deepEqual(clone(B.state().space.assistant.outputs),completed.outputs);
  B.assistantControl('resume');assert.equal(B.state().space.assistant.status,'idle');assert.equal(created.length,count,'Continue restores authority without replaying a completed task');
  assert.equal(B.state().space.assistant.result,completed.result,'Continue changes authority without replacing the result with control instructions');
  B.setAssistantAllowed(2,false);B.setAssistantAllowed(2,true);
  assert.equal(B.state().space.assistant.control,'assistant');assert.equal(B.state().space.assistant.status,'idle');
  assert.equal(B.state().space.assistant.result,completed.result,'Handing a Side space back to Assistant retains its completed result');
  result=B.runAssistantTask('image');assert.equal(result.status,'done');assert.equal(result.outputs.length,2);
  const preview=c.frameFor(result.outputs[0]).preview;assert.equal(preview.hidden,false);assert(preview.innerHTML.includes('<img'));assert(preview.innerHTML.includes('Local demo image'));
  assert(notes[result.outputs[1]].text.includes('does not analyse the image'));
  const event=(frame,type='pointerdown')=>({type,target:{closest:selector=>selector==='[data-app-frame]'?frame:null,matches:()=>false}});
  const fire=event=>{for(const handler of listeners[event.type]||[])handler(event);};
  fire(event(c.frameFor('browser')));assert.equal(B.state().space.assistant.control,'assistant','Interacting with a Main or foreign frame cannot take over this display');
  fire(event(null));assert.equal(B.state().space.assistant.control,'assistant','Chat and tools do not count as canvas takeover');
  fire(event(c.frameFor(result.outputs[1]),'keydown'));assert.equal(B.state().space.assistant.control,'user','Typing in a local result note takes control even after the task finished');
  B.assistantControl('resume');fire(event(c.frameFor(result.outputs[0])));assert.equal(B.state().space.assistant.status,'paused','Pointer interaction with an actual local window pauses control');
  B.assistantControl('resume');fire({type:'pointerdown',target:{closest:()=>null,matches:selector=>selector==='.workspace-zone'}});assert.equal(B.state().space.assistant.control,'user','The empty canvas also gives the user control');
  B.assistantControl('resume');B.setAssistantAllowed(2,false);fire(event(c.frameFor(result.outputs[1]),'keydown'));assert.equal(B.state().space.assistant.control,'assistant','Working in Side space with permission off does not alter Assistant control state');
  B.setRole(2,'side');B.setAssistantAllowed(2,true);c.SpatialAIDesktop.workingFolder=()=>'/Gaming/private';assert.throws(()=>B.runAssistantTask('briefing'),/this Workspace/);assert.equal(created.length,count+2,'A foreign task folder cannot open windows');
}

{
  const {c}=fixture(),B=c.SpatialDisplayRoleBridge;B.setRole(2,'side');B.setAssistantAllowed(2,true);c.localSlot=2;
  for(const stale of ['You control this display. Assistant will wait until you choose Continue.','Assistant may work with windows on this display when you give it a task.','The Workspace or monitor setup changed. Continue here when you are ready.','You took over the workspace. Resume when you are ready.']){
    const packet=c.captureDesktopSyncState();
    packet.displayRoles.workspaces.work.displays[2].assistant={allowed:true,revision:B.state().space.assistant.revision+1,status:'paused',control:'user',task:'Prepare briefing',result:stale};
    c.applyDesktopSyncState(packet);
    assert.equal(B.state().space.assistant.result,'','Previously persisted control instructions are removed when loading saved display state');
    B.setAssistantAllowed(2,false);B.setAssistantAllowed(2,true);
    assert.equal(B.state().space.assistant.control,'user','Reallowing never clears a separate Take over');
    B.assistantControl('resume');assert.equal(B.state().space.assistant.status,'idle');
    assert.equal(B.state().space.assistant.result,'','A Ready display never restores stale user-control instructions');
    assert.equal(B.state().space.assistant.task,'Prepare briefing','Control-notice repair preserves the original task title');
  }
}

{
  const {c,created}=fixture();const B=c.SpatialDisplayRoleBridge;B.setRole(2,'side');B.setAssistantAllowed(2,true);c.localSlot=2;
  B.updateSpace({assistant:{status:'working',task:'Unfinished',context:{workspace:'work',setup:'displays:1|2',slot:2,folder:'/Work'}}});
  c.activeWorkspace='gaming';c.updateDesktopPageUi();
  const old=c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[2].assistant;
  assert.equal(old.control,'user');assert.equal(old.status,'paused','Changing Workspace suspends unfinished control in its original Workspace');
  assert.equal(B.state().space.assistant.status,'idle');assert.deepEqual(clone(B.state().space.assistant.outputs),[]);
  c.activeWorkspace='work';c.updateDesktopPageUi();B.assistantControl('resume');
  c.renderNotes=()=>{c.activeWorkspace='gaming';};
  assert.throws(()=>B.runAssistantTask('briefing'),/Workspace changed/);
  assert.equal(created.length,1,'A context change between real operations stops the remaining step');
  const stopped=c.SpatialDisplayRoleDesktop.snapshot().workspaces.work.displays[2].assistant;
  assert.equal(stopped.control,'user');assert.equal(stopped.status,'paused');assert.equal(stopped.context.workspace,'work');
  assert.equal(B.state().space.assistant.task,'','No task result is written into the newly selected Workspace');
}

{
  const {c}=fixture(),B=c.SpatialDisplayRoleBridge;B.setRole(2,'side');B.setAssistantAllowed(2,true);c.localSlot=2;
  const context={workspace:'work',setup:B.state().setupKey,slot:2,folder:'/Work',chatId:'chat-example',turnId:'turn-example'};
  B.updateSpace({assistant:{kind:'image',status:'needs-you',control:'assistant',task:'Convert an image',context}});
  const update=(status,details={})=>B.assistantExampleConversionUpdate({workspace:'work',chatId:context.chatId,turnId:context.turnId,action:{status,destination:'/Work/Web',outputs:[],...details}});
  assert.equal(update('running'),true);assert.equal(B.state().space.assistant.status,'working','A real Convert starts working instead of leaving the display waiting for input');
  assert(B.state().space.assistant.result.includes('/Work/Web'),'The progress summary uses the user-reviewed destination');
  const working=clone(B.state().space.assistant);
  assert.equal(B.assistantExampleConversionUpdate({workspace:'work',chatId:'another-chat',turnId:context.turnId,action:{status:'running'}}),false);
  assert.deepEqual(clone(B.state().space.assistant),working,'An unrelated conversion cannot change the display task');
  B.assistantControl('takeover');update('running');assert.equal(B.state().space.assistant.status,'paused');assert.equal(B.state().space.assistant.control,'user','A conversion update preserves explicit user control');
  update('complete',{outputs:[{path:'/Work/Web/photo.webp'}]});assert.equal(B.state().space.assistant.status,'paused');assert(B.state().space.assistant.result.includes('/Work/Web'));
  B.assistantControl('resume');update('complete',{outputs:[{path:'/Work/Web/photo.webp'}]});assert.equal(B.state().space.assistant.status,'done');
}

console.log('Display-role integration: native panel bounds and Assistant reveal, saved Side content preservation, stable Side windows, scoped references, Project-independent tiling, Workspace isolation, sync focus, conversion progress and reconnect recovery passed');

// Older role-specific sessions migrate using the formerly visible role, even
// when both historical layouts exist. No pins, notes or chat scope are reset.
{
  const saved={version:1,setups:{'displays:1|2':{roles:{1:'main',2:'assistant'}}},workspaces:{work:{displays:{2:{windows:['editor'],note:'Old monitor notes',assistant:{task:'Old task',context:{workspace:'work',setup:'displays:1|2',slot:2,folder:'/Work/Assistant',chatId:'old-chat'}}}}}}};
  const assistantSession={root:Tiles.leaf('editor'),floating:{},parked:{}},sideSession={root:Tiles.leaf('browser'),floating:{},parked:{}};
  const {c}=fixture(2,saved,{'work:display-role:assistant:2':assistantSession,'work:display-role:side:2':sideSession});c.localSlot=2;
  const state=c.SpatialDisplayRoleBridge.state();assert.equal(state.role,'side');assert.equal(state.space.assistant.allowed,true);
  assert.equal(c.tileSessions['work:display-role:space:2'],assistantSession,'The old visible Assistant layout wins the one-time merge');
  assert.equal(c.tileSessions['work:display-role:side:2'],undefined);assert.equal(c.tileSessions['work:display-role:assistant:2'],undefined);
  assert.deepEqual(clone(state.space.windows),['editor']);assert.equal(state.space.note,'Old monitor notes');assert.equal(state.space.assistant.context.chatId,'old-chat');
}
