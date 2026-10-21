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
migration.openProjectNames = workspace => migration.workspaceProjectStates[workspace]?.project ? [migration.workspaceProjectStates[workspace].project] : [];
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
const node=key=>nodes[key] ||= {hidden:true,dataset:{},style:{setProperty(){}},classList:classes(),setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},focus(){},clientHeight:800,clientWidth:1000,children:[]};
const frames=Object.fromEntries(['personal','draft'].map(name=>[name,{...node(name),dataset:{appFrame:name},style:{zIndex:20}}]));
const ctx=vm.createContext({
  cancelAreaPointerInteraction:null,placementUndoEpoch:0,
  desktopPages:Pages.create(),desktopWheel:Pages.wheelGate(),desktopColumnWheel:Pages.wheelGate(),
  activeWorkspace:'work',activeProjectName:'site',projectSpaces:{site:{name:'Website Launch',icon:'i-folder',accent:'#5af'}},workspaceProfiles:{work:{label:'Work',icon:'i-grid',accent:'#fa5'}},
  appInfo:{personal:{label:'Files'},draft:{label:'Notes'}},appState:{personal:'open',draft:'open'},windowMembership:{work:{personal:null,draft:'site'}},
  workspaceOpenProjects:{work:['site']},workspaceProjectStates:{},workspaceProjects:{work:'site'},
  icon:name=>'<svg>'+name+'</svg>',escapeHtml:value=>String(value),prepareControlSemantics(){},scheduleWindowTiling(){},
  renderProjectSpace(name){ctx.activeProjectName=name; ctx.workspaceOpenProjects[ctx.activeWorkspace]=[...new Set([...ctx.openProjectNames(),name])];},
  windowViewportLockReady:false,desktopPageAnimating:false,desktopHasWindowFocus:false,frontApp:null,zCounter:20,
  tileSessions:{},tileEngine:T,tileInteraction:false,tileRendering:false,manualWindowInteraction:false,
  window:{matchMedia:()=>({matches:true})},document:{body:{dataset:{},style:{setProperty(){},removeProperty(){}}}},
  $:key=>node(key),$$:selector=>selector==='[data-app-frame]'?Object.values(frames):[],frameFor:name=>frames[name],
  areaFor:name=>node('area:'+name),
  activeDisplayRoster:()=>[{}],releaseBorrowedApp(){},autoTiledWindows:new Set(),appMaximizedState:{},leaveTileFocus(){},localDisplaySlot:()=>1,extendedDesktopActive:()=>false,displayAssignmentsFor:()=>({apps:{}}),
  intentAreaPlan:{moves:{}},syncProjectWindowScopes(){},syncRack(){},originalSyncRack(){},renderMiniApps(){},renderOverviewWindows(){},scheduleWindowVisibility(){},persistWorkspaceAppStates(){},
  captureWorkspaceContent(){},saveLayout(){},saveTileSessions(){},saveDesktopPages(){},saveIndependentSessions(){},persistProjectState(){},
  refreshIntentAreas(){},renderTileLayout(){},queueDesktopStateBroadcast(){},endSystemRailExpansion(){},showToast(){},removeWindowFromSavedProjects(){},cloneDesktopState:copy,
  leaveAppFullscreen(){},renderAvailableProjectLibrary(){},refreshProjectSessionUi(){},
  tileSession(){return ctx.tileSessions[ctx.desktopPages.context('work')+'1'] ||= {root:null,parked:{},floating:{}}},
  layoutDockAreas(){}
});
vm.runInContext(slice('function openProjectNames(', 'const workspaceAreaContents'),ctx);
vm.runInContext(slice('function projectColumnActive(', 'function renderDesktopColumnMap('),ctx);
vm.runInContext(slice('function setProjectClosedState(', 'function renderProjectSpace('),ctx);
vm.runInContext(slice('function isLocalApp(', 'function persistDisplayAssignments('),ctx);
vm.runInContext(slice('function topOpenApp(', 'function openApp('),ctx);
vm.runInContext(slice('function appArt(', 'function applyAppPrimaryColors('),ctx);
vm.runInContext(slice('function updateDesktopPageUi(', 'function moveWindowToDesktop('),ctx);
vm.runInContext(slice('function detachDraggedDesktopWindow(', '// A floating window is reparented'),ctx);
ctx.desktopPages.assign('work','personal',0,'workspace');
ctx.desktopPages.assign('work','draft',0,'site');
node('area:projects').hidden=false;
ctx.syncApps();
assert.equal(node('.desktop-context-header').hidden,false);
assert.match(node('#desktopContextColumns').innerHTML,/Workspace/);
assert.match(node('#desktopContextColumns').innerHTML,/Website Launch/);
assert.equal(node('#desktopContextToggle')['aria-label'],'Open desktop map · Work / Workspace · Desktop 1');
assert.equal(frames.personal.hidden,false);assert.equal(frames.draft.hidden,true);assert.equal(node('area:projects').hidden,false);assert.equal(node('area:projects').dataset.projectLibraryOpen,'true');
assert.equal(ctx.changeDesktopColumn('site'),true);
assert.equal(node('#desktopContextToggle')['aria-label'],'Open desktop map · Work / Website Launch · Desktop 1');
assert.equal(node('#desktopContextToggle').dataset.project,'true');
assert.equal(frames.personal.hidden,true);assert.equal(frames.draft.hidden,false);assert.equal(node('area:projects').hidden,false);assert.equal(node('area:projects').dataset.projectLibraryOpen,'false');
assert.equal(ctx.appState.personal,'open');
assert.equal(ctx.changeDesktopColumn('unknown'),false);
ctx.changeDesktopPage(1,false);
assert.equal(node('.desktop-context-page').textContent,'Desktop 2');
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
assert.deepEqual(copy(ctx.tileSessions),drag.sessions);assert.equal(node('area:projects').hidden,false);assert.equal(node('area:projects').dataset.projectLibraryOpen,'true');
console.log('Project columns passed: ownership, per-column pages, reload/sync, mixed-tree migration, visibility, persistent Project Area context, transfers and gesture rollback.');

node('area:projects').hidden=true;
ctx.changeDesktopColumn('site');ctx.changeDesktopColumn('workspace');
assert.equal(node('area:projects').hidden,true,'Switching project columns retains the workspace choice to hide Project Area');
node('area:projects').hidden=false;

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
ctx.renderProjectSpace('site');ctx.changeDesktopColumn('site');ctx.restoreProjectWindows('site',false,true);
assert.equal(ctx.desktopPages.current('work'),1,'Reopen returns to the remembered desktop, including an empty desktop');
assert.equal(ctx.appState.draft,'open');assert.equal(frames.draft.hidden,true);
ctx.appState.draft='closed';ctx.parkProjectWindows('site',false);
assert.equal(ctx.restoreProjectWindows('site',false,true),0);
console.log('Project shelf passed: independent windows stay open, project pages and minimized states persist, and an empty session never seeds replacement windows.');

// Multiple open projects share the header, but never share their windows or pages.
ctx.workspaceProfiles.school={label:'School',icon:'i-grid',accent:'#f85'};
ctx.projectSpaces.film={name:'Short Film',icon:'i-video',accent:'#f85',modes:{default:{label:'Project'}}};
ctx.workspaceOpenProjects.work=[];
ctx.activeProjectName=null;
ctx.desktopPages.select('work','workspace');
ctx.updateDesktopPageUi();
assert.equal(node('.desktop-context-header').hidden,true,'No project means no header');
vm.runInContext(slice('function activateProject(', 'function switchProjectMode('),ctx);
const seed=[];
ctx.seedProjectModeWindows=name=>{seed.push(name);const id=name==='site'?'draft':'cut';ctx.appInfo[id]={label:id};ctx.appState[id]='open';ctx.windowMembership.work[id]=name;ctx.desktopPages.assign('work',id,0,name);return 1;};
ctx.projectWindowSessions={};
ctx.activateProject('site',false);
assert.equal(node('.desktop-context-header').hidden,false);
ctx.changeDesktopPage(1,false);
ctx.activateProject('film',false);
assert.deepEqual(copy(ctx.openProjectNames()),['site','film']);
assert.equal(ctx.appState.draft,'open','Opening a second project never shelves the first');
assert.match(node('#desktopContextColumns').innerHTML,/Website Launch/);
assert.match(node('#desktopContextColumns').innerHTML,/Short Film/);
assert.equal(ctx.adjacentDesktopColumn(-1),'site');
ctx.activateProject('site',false);
assert.equal(ctx.desktopPages.current('work'),1,'Already open projects retain their last desktop');
assert.deepEqual(seed,['site','film'],'Switching an open project never reseeds its windows');
ctx.closeActiveProject();
assert.deepEqual(copy(ctx.openProjectNames()),['film']);
assert.equal(node('.desktop-context-header').hidden,false,'Closing one leaves the header visible');
assert.equal(ctx.appState.cut,'open','Closing one project keeps the other project open');
ctx.activateProject('film',false);
ctx.closeActiveProject();
assert.equal(node('.desktop-context-header').hidden,true,'Closing the final project hides the header');
ctx.workspaceOpenProjects.school=['film','film','deleted'];
assert.deepEqual(copy(ctx.openProjectNames('school')),['film'],'Lists are workspace specific, unique and exclude deleted projects');
ctx.updateDesktopPageUi();
assert.equal(node('.desktop-context-header').hidden,true,'Other workspaces cannot expose the header here');
console.log('Open-project header passed: zero/one/multiple projects, all labels, switching without shelving/reseeding, remembered desktops, independent closure and workspace isolation.');

// Test the production transition with controlled animation completion.
(async () => {
  const animations=[];
  class Element {
    constructor(kind, attrs={}) { this.kind=kind;this.attrs={...attrs};this.dataset={};this.hidden=false;this.children=[];this.clientWidth=1200;this.clientHeight=800;this.classes=new Set();this.classList={add:name=>this.classes.add(name)}; }
    append(child) { this.children.push(child); child.parent=this; }
    remove() { this.parent.children=this.parent.children.filter(child=>child!==this); }
    setAttribute(key,value) { this.attrs[key]=value; }
    removeAttribute(key) { delete this.attrs[key]; }
    querySelectorAll() { return this.children.flatMap(child=>[child,...child.querySelectorAll()]).filter(child=>child.attrs.id || child.attrs['data-app-frame']); }
    matches(selector) { return (selector.includes('[data-app-frame]') && Boolean(this.attrs['data-app-frame'])) || (selector.includes('.desktop-folder') && this.kind==='folder'); }
    get id() { return this.attrs.id; }
    cloneNode() { const clone=new Element(this.kind,this.attrs);clone.hidden=this.hidden;clone.dataset={...this.dataset};this.children.forEach(child=>clone.append(child.cloneNode(true)));return clone; }
    animate(keyframes,options) { let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b});animations.push({node:this,keyframes,options,resolve,reject});return {finished}; }
  }
  const body=new Element('body'),shell=new Element('shell'),canvas=new Element('canvas');
  const area=new Element('area',{id:'projectArea'}),frame=new Element('frame',{'data-app-frame':'draft',id:'window'});
  shell.append(area);shell.append(canvas);canvas.append(frame);body.append(shell);
  let reduced=false,visibilityChecks=0;
  const animationCtx=vm.createContext({
    cancelAreaPointerInteraction:null,placementUndoEpoch:0,
    desktopPages:Pages.create(),activeWorkspace:'work',activeProjectName:'site',desktopPageAnimating:false,desktopHasWindowFocus:false,
    document:{body,createElement:()=>new Element('ghost')},window:{matchMedia:()=>({matches:reduced})},
    $:selector=>selector==='.workspace-zone'?canvas:shell,openProjectNames:()=>['site','film'],
    saveLayout(){},saveTileSessions(){},tileSession:()=>({}),captureWorkspaceContent(){},
    renderProjectSpace(name){animationCtx.activeProjectName=name;area.dataset.project=name;},
    endSystemRailExpansion(){},layoutDockAreas(){},topOpenApp:()=>null,
    syncApps(){},focusDesktop(){},refreshIntentAreas(){},renderTileLayout(){},saveDesktopPages(){},queueDesktopStateBroadcast(){},scheduleWindowVisibility(){visibilityChecks++;}
  });
  animationCtx.desktopPages.assign('work','draft',0,'site');
  animationCtx.desktopPages.select('work','site');area.dataset.project='site';
  vm.runInContext(slice('function changeDesktopPage(', 'function moveWindowToDesktop('),animationCtx);
  const settle=async()=>{animations.forEach(a=>a.resolve());await new Promise(resolve=>setImmediate(resolve));animations.length=0;};
  assert.equal(animationCtx.changeDesktopPage(1,true),true);
  assert.equal(animations.length,2);
  assert.equal(animations[1].node,frame,'Only canvas windows move vertically');
  assert.equal(animations[1].keyframes[0].transform,'translateY(800px)');
  assert.equal(body.children.length,1,'Vertical motion never clones Areas');
  assert.equal(animationCtx.changeDesktopPage(0,true),false,'Concurrent navigation is guarded');
  await settle();
  assert.equal(canvas.children.length,1,'The outgoing canvas is removed');
  assert.equal(animationCtx.changeDesktopPage(0,true,'film'),true);
  assert.equal(animations[1].node,shell,'Projects animate the entire incoming scene');
  assert.equal(animations[1].keyframes[0].transform,'translateX(1200px)');
  const ghost=body.children[1];
  assert.equal(ghost.children[0].dataset.project,'site','Outgoing Areas retain the old project');
  assert.equal(area.dataset.project,'film');
  assert.equal(ghost.inert,true);assert.equal(ghost.attrs['aria-hidden'],'true');
  assert.equal(ghost.querySelectorAll().length,0,'Scene clones contain no duplicate IDs or window identities');
  await settle();
  assert.equal(body.children.length,1);assert.equal(shell.dataset.desktopTransition,undefined);
  assert.equal(animationCtx.changeDesktopPage(1,true,'site'),true);
  assert.equal(animations[1].keyframes[0].transform,'translateX(-1200px)','Project-to-project motion follows the tab order');
  animations[0].reject(Error('cancelled'));animations[1].resolve();
  await new Promise(resolve=>setImmediate(resolve));animations.length=0;
  assert.equal(animationCtx.desktopPageAnimating,false,'Cancellation releases navigation');
  assert.equal(body.children.length,1);
  reduced=true;
  assert.equal(animationCtx.changeDesktopPage(0,true,'workspace'),true);
  assert.equal(animations.length,0,'Reduced motion applies the scene without sliding');
  assert.equal(animationCtx.desktopPageAnimating,false);
  assert.equal(visibilityChecks,3);
  console.log('Scene animations passed: vertical canvas only, horizontal whole scene, old Area snapshot, tab-order direction, cleanup, cancellation, navigation guard and reduced motion.');
})().catch(error=>{console.error(error);process.exitCode=1;});

// The native Project strip must reserve real workspace height. Its old
// Areas-only selector left the strip over the centers of app title-bar buttons.
{
  const {JSDOM}=require('jsdom');
  const desktopCSS=fs.readFileSync(require.resolve('../dist/desktop-shell.css'),'utf8');
  const workspaceRule=desktopCSS.match(/\.desktop-shell>\.workspace-zone\{[^}]*\}/)?.[0];
  assert(workspaceRule);
  const layoutDOM=new JSDOM('<!doctype html><body class="panel-desktop-preview"><main class="desktop-shell"><header class="desktop-context-header" hidden><span class="desktop-context-workspace"></span><nav id="desktopContextColumns"></nav></header><section class="workspace-zone"></section></main></body>');
  const browser=layoutDOM.window,document=browser.document,shell=document.querySelector('.desktop-shell'),workspace=document.querySelector('.workspace-zone'),header=document.querySelector('.desktop-context-header');
  const style=document.createElement('style');style.textContent=workspaceRule+'\n'+fs.readFileSync(require.resolve('../dist/desktop-pages.css'),'utf8');document.head.append(style);
  let projects=[],column='workspace',retiles=0;
  const cssPixels=(element,property)=>{
    const value=browser.getComputedStyle(element).getPropertyValue(property).replace(/var\((--[\w-]+)(?:,([^)]*))?\)/g,(_,name,fallback)=>browser.getComputedStyle(shell).getPropertyValue(name).trim()||fallback||'0px');
    const terms=value.replace(/^calc\((.*)\)$/,'$1').replace(/px/g,'').match(/[+-]?\s*\d+(?:\.\d+)?/g)||[];
    return terms.reduce((sum,term)=>sum+Number(term.replace(/\s/g,'')),0);
  };
  workspace.getBoundingClientRect=()=>{
    const left=cssPixels(workspace,'left'),top=cssPixels(workspace,'top'),width=1280-left-cssPixels(workspace,'right'),height=800-top-cssPixels(workspace,'bottom');
    return {left,top,width,height,right:left+width,bottom:top+height};
  };
  Object.defineProperty(workspace,'clientWidth',{get:()=>workspace.getBoundingClientRect().width});Object.defineProperty(workspace,'clientHeight',{get:()=>workspace.getBoundingClientRect().height});
  const layout=vm.createContext({
    $:(selector,root=document)=>root.querySelector(selector),$$:(selector,root=document)=>[...root.querySelectorAll(selector)],
    activeWorkspace:'general',workspaceProfiles:{general:{label:'General',icon:'i-grid',accent:'#5af'}},projectSpaces:{site:{name:'Usability test',icon:'i-folder',accent:'#fa5'}},
    openProjectNames:()=>projects,desktopPages:{column:()=>column},desktopColumnLabel:id=>id==='workspace'?'Workspace':'Usability test',icon:()=>'<svg></svg>',escapeHtml:value=>String(value),prepareControlSemantics(){},
    windowViewportLockReady:true,tileInteraction:false,tileRendering:false,manualWindowInteraction:false,
    captureVisibleWindowViewportRects:()=>new Map(),scheduleWindowTiling(){retiles++;}
  });
  vm.runInContext(slice('function workspaceBounds(', 'function readGeometry(')+slice('function tileBounds(', 'function saveTileSessions(')+slice('function setWorkspaceInsets(', 'const projectSpaces =')+slice('function renderDesktopContextColumns(', 'function renderDesktopPageRail('),layout);
  assert(!document.body.classList.contains('areas-docked'),'The native panel desktop has no retired Areas body state');
  for(const [name,insets]of [['left',[232,56,0,0]],['top',[0,56,0,248]],['hidden',[0,0,0,0]]]){
    projects=[];column='workspace';layout.setWorkspaceInsets(...insets);layout.renderDesktopContextColumns();
    const without=layout.workspaceBounds();assert.equal(without.rect.top,insets[3]);
    projects=['site'];layout.renderDesktopContextColumns();
    const withProject=layout.workspaceBounds(),stripTop=cssPixels(header,'top'),stripBottom=stripTop+cssPixels(header,'height');
    assert.equal(header.hidden,false);assert.equal(withProject.rect.top,stripBottom,name+' panels reserve the Project strip before placing apps');
    assert.equal(withProject.height,without.height-32,'Opening a Project reduces usable height exactly once');
    for(const root of [T.leaf('music'),{kind:'split',axis:'x',ratio:.5,a:T.leaf('music'),b:T.leaf('browser')}]){
      for(const rect of T.layout(root,layout.tileBounds()).windows.values()){
        const buttonCenterY=withProject.rect.top+rect.y+8+29/2;
        assert(buttonCenterY>stripBottom,'Park and maximize button centers remain below the Project strip');
        assert(withProject.rect.top+rect.y>=stripBottom,'The entire title bar starts inside the reserved work area');
      }
    }
    column='site';layout.renderDesktopContextColumns();assert.equal(layout.workspaceBounds().rect.top,stripBottom,'Project and ordinary columns share the same safe bounds');
    projects=[];column='workspace';layout.renderDesktopContextColumns();
    assert.equal(header.hidden,true);assert.equal(layout.workspaceBounds().rect.top,without.rect.top,'Closing the final Project returns its strip space');
  }
  assert(retiles>0,'Showing and hiding the Project strip schedules the native window layout');
  browser.close();
}
console.log('Project strip geometry passed: native panel CSS, Left/Top/hidden panels, app-control centers, Project/Workspace columns, exact height reservation and closing recovery.');

// Navigation animations queue Project commands. A queued command belongs to
// the Workspace/column where it was requested, not whatever is active later.
for(const [name,first,last,args] of [
  ['activateProject','function activateProject(','function switchProjectMode(',['film',false]],
  ['closeActiveProject','function closeActiveProject(','function describeProjectResource(',[]],
  ['deleteProject','function deleteProject(','function renderProjectEditor(',['site']]
])for(const changed of ['none','workspace','column','project']){
  let column='site',called=0;const timers=[];
  const deferred=vm.createContext({activeWorkspace:'work',activeProjectName:'site',desktopPageAnimating:true,desktopPages:{column:()=>column},projectSpaces:{site:{name:'Site'}},setTimeout:fn=>timers.push(fn)});
  vm.runInContext(slice(first,last),deferred);deferred[name](...args);assert.equal(timers.length,1,name+' waits for the current animation');
  deferred[name]=(...replayed)=>{called++;assert.deepEqual(replayed,args,'Queued Project command keeps its original arguments');};
  if(changed==='workspace')deferred.activeWorkspace='school';
  if(changed==='column')column='film';
  if(changed==='project'){
    if(name==='closeActiveProject')deferred.activeProjectName='film';
    else if(name==='deleteProject')deferred.projectSpaces.site={name:'Replacement project'};
    else deferred.activeProjectName='film';
  }
  deferred.desktopPageAnimating=false;timers.shift()();
  const valid=changed==='none'||(changed==='project'&&name==='activateProject');
  assert.equal(called,valid?1:0,name+' does not follow a changed '+changed+' into another context');
}
console.log('Deferred Project commands passed: activation, close and removal retain their initiating Workspace/column and cannot close another active or replacement Project.');
