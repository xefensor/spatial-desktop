const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../dist/desktop-shell.js'),'utf8');
const Pages = require('../dist/desktop-pages.js');
const T = require('../dist/spatial-tiling.js');
const slice = (start,end) => source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const clone = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const frames = {notes:{classList:{remove(){}},dataset:{},style:{zIndex:'20'},text:'original note'}};
  const c = {
    areaPriority:['systems'],areaFor:()=>({}),$:()=>null,$$:()=>[],document:{querySelector:()=>null},desktopHasWindowFocus:true,
    activeWorkspace:'general',localDisplaySlot:()=>1,window:{innerWidth:1600,innerHeight:900},
    activeDisplayRoster:()=>[{source:'local',width:1600,height:900}],activeProjectName:null,
    workspaceOpenProjects:{general:[]},workspaceProjectStates:{general:{project:null}},workspaceProjects:{general:null},
    cloneDesktopState:clone,panels:{schema:5,panels:[{id:'left',size:310},{id:'right',size:300}],widgets:{controls:{mode:'expanded'}}},
    snapshotAreaLayout(){return clone(c.panels);},SpatialPanels:{restoreSession(workspace,snapshot){c.panels=clone(snapshot);}},
    tileSessions:{'general:desktop:0:1':{root:T.leaf('notes'),floating:{},parked:{}}},
    desktopPages:Pages.create(), workspaceAppStates:{general:{notes:'open'},school:{notes:'closed'}},
    appState:{notes:'open'},appMaximizedState:{notes:false},appInfo:{notes:{label:'Notes'}},
    windowGeometry:new Map([['notes',{x:8,y:8,width:500,height:400}]]),
    workspaceDisplayAssignments:{general:{apps:{notes:1},areas:{systems:1}}},windowMembership:{general:{notes:null}},
    projectWindowSessions:{},projectSpaces:{site:{name:'Site'}},autoSpatialEdgeStates:new Map(),frontApp:'notes',
    tileLayoutFrame:0,cancelAnimationFrame(){},endSystemRailExpansion(){},
    renderProjectSpace(name){c.activeProjectName=name;},syncProjectAreaView(){},
    topOpenApp:()=>Object.keys(c.appState).find(name=>c.appState[name]==='open')||null,
    syncProjectWindowScopes(){},syncApps(){},refreshIntentAreas(){},layoutDockAreas(){},renderTileLayout(){},
    saveAreaLayout(){},saveDesktopPages(){},saveTileSessions(){},saveLayout(){},persistDisplayAssignments(){},
    persistWorkspaceAppStates(){},persistProjectState(){},saveIndependentSessions(){},queueDesktopStateBroadcast(){},
    showToast(message,options={}){c.toast={message,...options};},
    tileEngine:T,frameFor:name=>frames[name],autoTiledWindows:new Set(),focusDesktop(){},
    leaveAppFullscreen(){},leaveTileFocus(){},
    workspaceProfiles:{general:{label:'General'},school:{label:'School'}},workspaceContent:{general:{frames:{notes:{text:'original note'}}}},
    instanceSequence:0,instanceDefinitions:{},
    captureWorkspaceContent(){c.workspaceContent.general.frames.notes={text:frames.notes.text};},
    installInstance(id,base){c.appInfo[id]={label:base,base};c.appState[id]='closed';frames[id]={text:'',dataset:{},style:{zIndex:'1'},classList:{remove(){}}};},
    removeWindowFromSavedProjects(){},closeApp(name){c.appState[name]='closed';},
  };
  vm.createContext(c);
  vm.runInContext(slice('let placementUndoEpoch =','function frameFor('),c);
  vm.runInContext(slice('function moveWindowToDesktop(','function migrateProjectDesktops('),c);
  vm.runInContext(slice('function moveAppWorkspace(','function moveAppProject('),c);
  vm.runInContext(slice('let placementOperationDepth =','moveWindowToDesktop = reversiblePlacement('),c);
  vm.runInContext('moveWindowToDesktop=reversiblePlacement(moveWindowToDesktop,"Window moved");',c);
  vm.runInContext(slice('moveAppWorkspace = reversiblePlacement(', 'transferAppToDisplay = reversiblePlacement('),c);
  c.desktopPages.assign('general','notes',0,'workspace');
  return {c,frames};
}
{
  const {c,frames}=fixture();
  const before=JSON.stringify(c.tileSessions);
  c.moveWindowToDesktop('notes',1);
  assert.equal(c.desktopPages.pageOf('general','notes'),1);
  assert.equal(typeof c.toast.action,'function','An actual desktop move offers Undo');
  frames.notes.text='newly edited after the move';
  c.toast.action();
  assert.equal(c.desktopPages.pageOf('general','notes'),0);
  assert.equal(JSON.stringify(c.tileSessions),before,'Undo restores the original split tree');
  assert.equal(frames.notes.text,'newly edited after the move','Undo cannot overwrite new app content');
  assert.equal(c.toast.message,'Previous layout restored');
}
for(const mutation of ['window','panels','context','display','epoch']) {
  const {c}=fixture();
  c.moveWindowToDesktop('notes',1);const undo=c.toast.action;
  if(mutation==='window') c.appState.notes='closed';
  if(mutation==='panels') c.panels.panels[1].size=370;
  if(mutation==='context') c.desktopPages.go('general',1);
  if(mutation==='display') c.window.innerWidth=1500;
  if(mutation==='epoch') vm.runInContext('placementUndoEpoch++',c);
  undo();
  assert.equal(c.desktopPages.pageOf('general','notes'),1,mutation+' makes stale Undo refuse restoration');
  assert.match(c.toast.message,/no longer available/);
}
{
  const {c}=fixture();
  const before=c.capturePlacement();
  c.panels.panels[1].size=400;
  c.appState.notes='minimized';
  c.tileSessions['general:desktop:0:1'].parked.notes={reason:'fit'};
  c.tileSessions['general:desktop:0:1'].floating.notes={left:100,top:100,width:500,height:400,excludeAreas:['systems']};
  c.offerPlacementUndo(before,'Panel resized');c.toast.action();
  assert.equal(c.panels.panels[1].size,300);
  assert.equal(c.appState.notes,'open','Panel recovery reverses automatic window parking');
  assert.deepEqual(c.tileSessions['general:desktop:0:1'].floating,{},'Panel recovery reverses its automatic window exceptions');
}
{
  const {c,frames}=fixture();
  frames.notes.text='current document';
  c.moveAppWorkspace('notes','school');
  assert.equal(c.appState.notes,'closed');
  assert.equal(c.workspaceAppStates.school['notes--1'],'open');
  assert.equal(c.workspaceContent.school.frames['notes--1'].text,'current document');
  const undo=c.toast.action;frames.notes.text='latest document';undo();
  assert.equal(c.appState.notes,'open');
  assert(!c.workspaceAppStates.school['notes--1'],'Undo hides only the transferred identity in the destination');
  assert.equal(c.workspaceAppStates.school.notes,'closed','A pre-existing destination app is preserved');
  assert.equal(frames.notes.text,'latest document');
}
{
  const {c}=fixture();
  const before=c.capturePlacement();
  c.activeProjectName='site';c.workspaceProjects.general='site';
  c.workspaceProjectStates.general={project:'site'};c.workspaceOpenProjects.general=['site'];
  c.desktopPages.select('general','site');c.desktopPages.assign('general','notes',0,'site');
  c.windowMembership.general.notes='site';
  c.offerPlacementUndo(before,'Window moved to project');c.toast.action();
  assert.equal(c.activeProjectName,null,'Undo restores an originally unselected Project');
  assert.equal(c.desktopPages.column('general'),'workspace');
  assert.equal(c.windowMembership.general.notes,null);
  assert.deepEqual(c.workspaceOpenProjects.general,[]);
}
{
  const {c}=fixture();
  c.moveAppWorkspace('notes','school');const undo=c.toast.action;
  c.workspaceContent.school.frames['notes--1'].text='edited on a second display';
  undo();
  assert.equal(c.workspaceAppStates.school['notes--1'],'open','Undo never removes a transferred window edited in its destination');
  assert.equal(c.appState.notes,'closed');
  assert.match(c.toast.message,/no longer available/);
}
{
  const {c,frames}=fixture();
  const before=c.capturePlacement();
  frames.notes.style.zIndex='900';c.desktopHasWindowFocus=false;c.panels.panels[0].size=350;
  c.offerPlacementUndo(before,'Panel changed');c.toast.action();
  assert.equal(frames.notes.style.zIndex,'20','Recovery restores the original stacking order');
  assert.equal(c.desktopHasWindowFocus,true,'Recovery restores the previous focus owner');
}
console.log('Placement recovery: real desktop/workspace moves, content preservation, split/parking restoration, null Project restoration and stale layout/context/display guards passed.');
