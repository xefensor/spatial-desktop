const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Pages = require('../dist/desktop-pages.js');
const T = require('../dist/spatial-tiling.js');
const source = fs.readFileSync(require.resolve('../dist/desktop-shell.js'), 'utf8');
const slice = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const copy = value => JSON.parse(JSON.stringify(value));

const pages = Pages.create();
pages.assign('work', 'personal', 2);
pages.assign('work', 'draft', 4, 'site');
pages.go('work', 3);
assert.equal(pages.last('work'), 3);
pages.select('work', 'site');
assert.equal(pages.current('work'), 0);
assert.equal(pages.visible('work', 'personal'), false);
pages.go('work', 4);
assert.equal(pages.visible('work', 'draft'), true);
assert.equal(pages.context('work'), 'work:project-column:site:desktop:4:');
pages.select('work', 'workspace');
assert.equal(pages.current('work'), 3, 'Each column remembers its desktop');
assert.equal(pages.inColumn('work', 'draft'), false, 'Minimized windows cannot leak across columns');
assert.equal(pages.column('school'), 'workspace');
assert.deepEqual(Pages.create(pages.snapshot()).snapshot(), pages.snapshot());
assert.equal(Pages.create({work:{activeColumn:'site',columns:{site:{active:999}},owners:{draft:'site'},windows:{draft:2}}}).current('work'), 3);

// Split the real legacy tile sessions without changing identities, content or pages.
const migration = vm.createContext({
  desktopPages: Pages.create({work:{active:1,windows:{personal:0,draft:1},migrated:true}}),
  workspaceProfiles:{work:{}}, workspaceProjectStates:{work:{project:'site'}},
  workspaceAppStates:{work:{personal:'open',draft:'minimized'}},
  windowMembership:{work:{personal:null,draft:'site'}}, projectSpaces:{site:{}},
  projectModeId:()=> 'default', tileEngine:T, cloneDesktopState:copy,
  tileSessions:{'work:desktop:1:1':{root:{kind:'split',axis:'x',ratio:.6,a:T.leaf('personal'),b:T.leaf('draft')},floating:{draft:{left:20}},parked:{personal:{}},focus:{name:'draft',root:T.leaf('personal')}}},
  saveDesktopPages(){},saveTileSessions(){},saveIndependentSessions(){}
});
vm.runInContext(slice('function migrateDesktopColumns(', 'function updateDesktopPageUi('), migration);
migration.migrateDesktopColumns();
assert.equal(migration.desktopPages.column('work'), 'site');
assert.equal(migration.desktopPages.pageOf('work','draft'),1);
assert.equal(migration.tileSessions['work:desktop:1:1'].root.name,'personal');
const projectTree=migration.tileSessions['work:project-column:site:desktop:1:1'];
assert.equal(projectTree.root.name,'draft');
assert.equal(projectTree.floating.draft.left,20);
assert.equal(projectTree.focus.root,null);
assert.deepEqual(Object.keys(projectTree.parked),[]);
const migrated=JSON.stringify(migration.desktopPages.snapshot());
migration.migrateDesktopColumns();
assert.equal(JSON.stringify(migration.desktopPages.snapshot()),migrated);

// Exercise real scene navigation and visibility, using reduced motion to settle synchronously.
const classes=()=>({contains:()=>false,add(){},remove(){},toggle(){}});
const nodes={};
const node=key=>nodes[key] ||= {hidden:true,dataset:{},style:{setProperty(){}},classList:classes(),setAttribute(){},focus(){},clientHeight:800,clientWidth:1000,children:[]};
const frames=Object.fromEntries(['personal','draft'].map(name=>[name,{...node(name),dataset:{appFrame:name},style:{zIndex:20}}]));
const ctx=vm.createContext({
  desktopPages:Pages.create(),desktopWheel:Pages.wheelGate(),desktopColumnWheel:Pages.wheelGate(),
  activeWorkspace:'work',activeProjectName:'site',projectSpaces:{site:{name:'Website Launch',icon:'i-folder',accent:'#5af'}},workspaceProfiles:{work:{label:'Work',icon:'i-grid',accent:'#fa5'}},
  appInfo:{personal:{label:'Files'},draft:{label:'Notes'}},appState:{personal:'open',draft:'open'},windowMembership:{work:{personal:null,draft:'site'}},
  windowViewportLockReady:false,desktopPageAnimating:false,desktopHasWindowFocus:false,frontApp:null,zCounter:20,
  tileSessions:{},tileEngine:T,tileInteraction:false,tileRendering:false,manualWindowInteraction:false,
  window:{matchMedia:()=>({matches:true})},document:{body:{dataset:{},style:{setProperty(){},removeProperty(){}}}},
  $:key=>node(key),$$:selector=>selector==='[data-app-frame]'?Object.values(frames):[],frameFor:name=>frames[name],
  areaFor:name=>node('area:'+name),
  localDisplaySlot:()=>1,extendedDesktopActive:()=>false,displayAssignmentsFor:()=>({apps:{}}),
  intentAreaPlan:{moves:{}},syncProjectWindowScopes(){},syncRack(){},originalSyncRack(){},renderMiniApps(){},renderOverviewWindows(){},scheduleWindowVisibility(){},persistWorkspaceAppStates(){},
  captureWorkspaceContent(){},saveLayout(){},saveTileSessions(){},saveDesktopPages(){},saveIndependentSessions(){},persistProjectState(){},
  refreshIntentAreas(){},renderTileLayout(){},queueDesktopStateBroadcast(){},endSystemRailExpansion(){},showToast(){},removeWindowFromSavedProjects(){},cloneDesktopState:copy,
  leaveAppFullscreen(){},
  tileSession(){return ctx.tileSessions[ctx.desktopPages.context('work')+'1'] ||= {root:null,parked:{},floating:{}}},
  layoutDockAreas(){ctx.keepPersistentAreasVisible()}
});
vm.runInContext(slice('function projectColumnActive(', 'function renderDesktopColumnMap('),ctx);
vm.runInContext(source.match(/const persistentAreas = new Set\([^;]+;/)[0],ctx);
vm.runInContext(slice('function keepPersistentAreasVisible(', 'function areaLabel('),ctx);
vm.runInContext(slice('function isLocalApp(', 'function persistDisplayAssignments('),ctx);
vm.runInContext(slice('function topOpenApp(', 'function openApp('),ctx);
vm.runInContext(slice('function updateDesktopPageUi(', 'function moveWindowToDesktop('),ctx);
vm.runInContext(slice('function detachDraggedDesktopWindow(', '// A floating window is reparented'),ctx);
ctx.desktopPages.assign('work','personal',0,'workspace');
ctx.desktopPages.assign('work','draft',0,'site');
ctx.syncApps();ctx.keepPersistentAreasVisible();
assert.equal(frames.personal.hidden,false);assert.equal(frames.draft.hidden,true);assert.equal(node('area:projects').hidden,true);
assert.equal(ctx.changeDesktopColumn('site'),true);
assert.equal(frames.personal.hidden,true);assert.equal(frames.draft.hidden,false);assert.equal(node('area:projects').hidden,false);
assert.equal(ctx.appState.personal,'open');
assert.equal(ctx.changeDesktopColumn('unknown'),false);
ctx.changeDesktopPage(1,false);
ctx.changeDesktopColumn('workspace');
ctx.changeDesktopColumn('site');
assert.equal(ctx.desktopPages.current('work'),1);
ctx.moveWindowToColumn('personal','site');
assert.equal(ctx.windowMembership.work.personal,'site');assert.equal(ctx.desktopPages.pageOf('work','personal'),1);
ctx.moveWindowToColumn('personal','workspace');
assert.equal(ctx.windowMembership.work.personal,null);assert.equal(ctx.desktopPages.column('work'),'workspace');
assert.equal(ctx.appState.personal,'open');assert.equal(frames.draft.hidden,true);

// Held-window cross-column transfer and rollback restore both ownership and trees.
ctx.desktopPages.go('work',0);
ctx.tileSession().root=T.leaf('personal');
ctx.tileSession().floating.personal={left:120,top:50,width:400,height:300};
const drag={name:'personal',page:0,column:'workspace',changed:false,sessions:copy(ctx.tileSessions)};
assert.equal(ctx.changeDraggedDesktopColumn(drag,'site'),true);
assert.equal(ctx.windowMembership.work.personal,'site');
assert.equal(ctx.tileSession().floating.personal.left,120);
assert.equal(frames.personal.hidden,false);assert.equal(node('area:projects').hidden,false);
ctx.cancelDraggedDesktopPages(drag);
assert.equal(ctx.windowMembership.work.personal,null);assert.equal(ctx.desktopPages.column('work'),'workspace');
assert.deepEqual(copy(ctx.tileSessions),drag.sessions);assert.equal(node('area:projects').hidden,true);
console.log('Project columns passed: ownership, per-column pages, reload/sync, mixed-tree migration, visibility, Project Area isolation, transfers and gesture rollback.');

// Closing shelves only this column; reopening preserves its last (even empty) desktop.
Object.assign(ctx, {
  projectWindowSessions:{},projectModeId:()=> 'default',projectSessionKey:name=>'work:'+name+':default',
  projectSession(name){return ctx.projectWindowSessions[ctx.projectSessionKey(name)]},
  refreshProjectSessionUi(){},captureWorkspaceContent(){},clearWindowAutoAvoidance(){},syncMaximizeButton(){},
  windowGeometry:new Map(),appMaximizedState:{},maximizeRestore:new Map(),readGeometry:()=>({x:10,y:10,width:400,height:300}),defaultWindowGeometry:()=>({x:10,y:10,width:400,height:300}),
  applyGeometry(){},persistDisplayAssignments(){},layoutMode:'manual',workspaceProjects:{work:'site'},
  setProjectClosedState(){},renderOverviewProjects(){},seedProjectModeWindows(){throw Error('A deliberately empty saved project must stay empty')}
});
ctx.projectSpaces.site.modes={default:{label:'Project'}};
vm.runInContext(slice('function parkProjectWindows(', 'function describeProjectResource('),ctx);
ctx.changeDesktopColumn('site');ctx.changeDesktopPage(1,false);
ctx.closeActiveProject();
assert.equal(ctx.activeProjectName,null);assert.equal(ctx.desktopPages.column('work'),'workspace');
assert.equal(ctx.appState.personal,'open');assert.equal(ctx.appState.draft,'closed');
assert.equal(ctx.projectWindowSessions['work:site:default'].pages.draft,0);
ctx.activeProjectName='site';ctx.changeDesktopColumn('site');ctx.restoreProjectWindows('site',false,true);
assert.equal(ctx.desktopPages.current('work'),1,'Reopen returns to the remembered desktop, including an empty desktop');
assert.equal(ctx.appState.draft,'open');assert.equal(frames.draft.hidden,true);
ctx.appState.draft='closed';ctx.parkProjectWindows('site',false);
assert.equal(ctx.restoreProjectWindows('site',false,true),0);
console.log('Project shelf passed: independent windows stay open, project pages and minimized states persist, and an empty session never seeds replacement windows.');
