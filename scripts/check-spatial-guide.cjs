const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const G = require('../dist/spatial-guide.js');
const Setup = require('../dist/workspace-setup.js');
const model = G.create();
model.start('first');
for (const feature of ['systems','apps','overview','parking','desktops','workspaces','folders','projects']) assert.equal(model.allows(feature), false, 'Welcome starts empty: ' + feature);
assert(model.next());
assert(model.allows('systems')); assert(!model.allows('apps'));
assert(!model.next(), 'Reading alone cannot complete a hands-on step');
assert(!model.mark('notes-open'), 'Unrelated activity cannot complete the task');
assert(model.mark('sound-off')); assert(!model.ready());
assert(!model.mark('sound-off'), 'Repeated events do not advance a lesson');
assert(model.mark('sound-on')); assert(model.next());
assert.equal(model.lesson.id,'resize-areas'); assert(!model.allows('apps'));
model.mark('area-resized'); assert(model.next());
assert(model.allows('apps')); assert(!model.allows('overview'));
while (model.lesson.id !== 'complete') {
  for (const goal of model.lesson.goals || []) model.mark(goal);
  assert(model.ready()); assert(model.next());
}
assert(model.allows('projects'));
model.leave('completed'); assert(model.allows('everything'));
assert.equal(G.lessons.map(x=>x.id).join(','), 'welcome,system,resize-areas,apps,tiling,float,overview,fullscreen,true-fullscreen,park,area-rail,unpark,desktops,projects,project-app,project-navigation,workspaces,folders,return,challenge,complete');
function boot(entries, query = '') {
  const storage = {...entries};
  Object.defineProperties(storage, {
    getItem:{value:key=>storage[key] ?? null},
    setItem:{value:(key,value)=>{storage[key]=String(value);}},
    removeItem:{value:key=>{delete storage[key];}}
  });
  const context = vm.createContext({localStorage:storage, SpatialWorkspaceSetup:Setup, URLSearchParams, location:{search:query}, document:{documentElement:{dataset:{}}}});
  vm.runInContext(fs.readFileSync(require.resolve('../dist/spatial-guide.js'), 'utf8'),context);
  return {storage, api:context.SpatialGuide, context};
}
const fresh = boot({});
assert(fresh.api.model.active()); assert.equal(fresh.api.model.state.mode,'first');
assert.equal(fresh.context.document.documentElement.dataset.guideLevel,0);
fresh.api.storage.setItem('spatial-workspace-app-states-v1','learner-windows');
assert.equal(fresh.storage['spatial-workspace-app-states-v1'],undefined, 'Practice is isolated before finishing');
fresh.api.finish('skipped');
assert.equal(fresh.storage['spatial-workspace-app-states-v1'],'learner-windows', 'First-time learners keep their own work when skipping');
const existing = boot({'spatial-workspace-app-states-v1':'original-windows', 'spatial-active-workspace':'work'});
assert(!existing.api.model.active(), 'Existing users are not forced through first login');
existing.api.model.start(); existing.api.storage.setItem('spatial-workspace-app-states-v1','practice-windows');
existing.api.model.next(); existing.api.model.mark('sound-off'); existing.api.save();
const resumed = boot(existing.storage);
assert(resumed.api.model.active()); assert.equal(resumed.api.model.lesson.id,'system'); assert(resumed.api.model.state.done.includes('sound-off'));
resumed.api.finish('completed'); resumed.api.storage.setItem('spatial-workspace-app-states-v1','late-practice-autosave');
assert.equal(resumed.storage['spatial-workspace-app-states-v1'],'original-windows', 'Repeating lessons preserves the original desktop');
const corrupt = G.create({index:999, done:'invalid'});
assert.equal(corrupt.lesson.id,'complete'); assert.deepEqual(corrupt.state.done,[]);
console.log('Spatial Guide passed: progressive access, task validation, first login, skip, persistence, reload and isolated repeat lessons.');

// Exercise the production observer with different apps and overlapping modes.
function at(id) { return G.create({status:'active',version:2,lessonId:id}); }
const bounded = at('fullscreen');
G.observeFullscreen(bounded,{bounded:'dolphin',open:['dolphin','notes']});
assert(bounded.state.done.includes('bounded-enter'), 'Dolphin can complete the same fullscreen task as Notes');
assert(!bounded.ready(), 'Entering is followed by a restore task');
G.observeFullscreen(bounded,{bounded:'dolphin',full:'dolphin',open:['dolphin']});
assert(!bounded.ready(), 'True fullscreen over bounded mode is not restoration');
G.observeFullscreen(bounded,{bounded:'dolphin',open:['dolphin','notes']});
assert(!bounded.ready(), 'Leaving true fullscreen alone leaves bounded maximize active');
G.observeFullscreen(bounded,{open:['dolphin','notes']});
assert(bounded.ready());
const wrongMode = at('fullscreen');
G.observeFullscreen(wrongMode,{full:'notes',open:['notes']});
G.observeFullscreen(wrongMode,{open:['notes']});
assert(!wrongMode.ready(), 'The two fullscreen lessons stay distinct');
const full = at('true-fullscreen');
G.observeFullscreen(full,{bounded:'notes',full:'notes',open:['notes']});
G.observeFullscreen(full,{bounded:'notes',open:['notes']});
assert(full.ready(), 'Escape into a previously bounded window completes true fullscreen');
assert.equal(G.create({status:'active',index:11}).lesson.id,'workspaces', 'Existing progress survives inserted lessons');
assert.equal(G.create(at('projects').snapshot()).lesson.id,'projects');
const projects = at('projects');
assert(projects.allows('projects')); assert(projects.allows('desktops')); assert(!projects.allows('workspaces')); assert(!projects.allows('folders'));

// Run the adapter's actual polling function for the new desktop tasks.
const adapter = fs.readFileSync(require.resolve('../dist/guide-desktop.js'),'utf8');
const checkSource = adapter.slice(adapter.indexOf('  function check()'),adapter.indexOf('  function start('));
const context = vm.createContext({model:at('resize-areas'), guide:{observeFullscreen:G.observeFullscreen,recovery:G.recovery,shouldCompact:G.shouldCompact,save(){}},
  appState:{}, appMaximizedState:{}, tileSession:()=>({}), isLocalApp:()=>true,
  dockState:{systems:{edge:'right'}}, dockSizes:{right:300}, areaFor:()=>({classList:{contains:()=>context.dragging}}),
  dragging:false, window:{}, currentRecovery:null, lastFullscreen:null, lastSignature:'', $:()=>({}), $$:()=>[], highlight(){}, activeWorkspace:'general',activeProjectName:null,
  appInfo:{notes:{}}, appWindowModel:()=>({notes:[{text:'My original note'}]}),
  projectSpaces:{example:{}}, updateChecklist(){}, positionGuide(){},
  openProjectNames:()=>Object.keys(context.projectSpaces),desktopPages:{visible:()=>true,column:()=>context.column,columnOf:(_,name)=>context.owners[name]},owners:{},column:'workspace',projectColumnActive:()=>context.column !== 'workspace'});
context.mark = goal=>context.model.mark(goal);
vm.runInContext(checkSource,context); context.check();
context.dockSizes.right=340; context.dragging=true; context.check();
assert(!context.model.ready(), 'Resize completes only after releasing the border');
context.dragging=false; context.check(); assert(context.model.ready());
context.model=at('area-rail'); context.areaFor=()=>({dataset:{areaState:context.railState},classList:{contains:()=>false}});
context.railState='expanded';context.check();assert(!context.model.ready());
context.railState='rail';context.check();assert(!context.model.ready());
context.railState='expanded';context.check();assert(context.model.ready());
context.model=at('projects');context.check();
context.column='example';context.activeProjectName='example';context.check();assert(!context.model.ready(), 'An existing seeded project cannot complete creation');
context.projectSpaces.mine={};context.column='mine';context.activeProjectName='mine';context.check();assert(context.model.ready());
assert.equal(context.model.state.practiceProject,'mine');
context.model=at('workspaces');context.workspaceProfiles={general:{},existing:{custom:true}};context.activeWorkspace='general';context.check();
context.activeWorkspace='existing';context.check();assert(!context.model.ready(),'Switching to an existing workspace does not count as creation');
context.workspaceProfiles.personal={custom:true,home:'/home/demo/Workspaces/personal'};context.activeWorkspace='personal';context.check();assert(context.model.ready());
assert.equal(context.model.state.practiceWorkspace,'personal');
context.model=at('folders');context.model.state.practiceWorkspace='personal';context.appInfo.dolphin={};context.appState.dolphin='open';context.frameFor=()=>({dataset:{fileLocation:'/home/demo/Downloads'}});context.check();assert(!context.model.ready());
context.frameFor=()=>({dataset:{fileLocation:'/home/demo/Workspaces/personal/Downloads'}});context.check();assert(context.model.ready(),'Only the new workspace Downloads satisfies the folder task');
context.activeWorkspace='general';context.appState.dolphin='closed';

context.model=at('project-app');context.model.state.practiceProject='mine';context.appState.notes='open';context.owners.notes='workspace';
context.isLocalApp=name=>context.owners[name]===context.column;context.check();assert(!context.model.ready(), 'Workspace Notes does not count as a project window');
context.appInfo['notes--2']={base:'notes'};context.appState['notes--2']='open';context.owners['notes--2']='mine';context.check();assert(context.model.ready());
context.model=at('project-navigation');context.model.state.practiceProject='mine';context.check();assert(!context.model.ready());
context.column='workspace';context.check();context.column='mine';context.check();assert(!context.model.ready());
context.column='workspace';context.check();assert(context.model.ready());
context.model=at('challenge');context.model.state.practiceProject='mine';context.check();
context.column='mine';context.check();assert(!context.model.ready(), 'Existing project app does not complete the final challenge');
context.appInfo.browser={};context.appState.browser='open';context.owners.browser='mine';context.check();assert(context.model.state.done.includes('challenge-open'));
context.appState.browser='closed';context.check();assert(!context.model.state.done.includes('challenge-open'), 'Closing the chosen app lets the learner try another');
context.appState.browser='open';context.check();context.appState.browser='minimized';context.check();assert(!context.model.ready());
context.column='workspace';context.check();assert(context.model.ready());
assert(!G.lessons.find(lesson=>lesson.id==='challenge').target);
for (const lesson of G.lessons) for (const goal of lesson.goals || []) assert(G.goalLabels[goal], 'Every task action has a readable checklist label');
const placed=G.placeGuide({width:1000,height:700},{width:390,height:400},[{left:500,top:200,right:1000,bottom:700}]);
assert(placed.left+390 <= 500, 'Guide avoids the target when a clear corner is available');
const small=G.placeGuide({width:360,height:600},{width:420,height:550},[]);
assert(small.left>=0&&small.top>=0&&small.left<=360&&small.top<=600);
// The actual project creation path creates no default windows.
const desktop=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const projectCreateSource=desktop.slice(desktop.indexOf('function createProjectFromEditor('),desktop.indexOf('function createModeFromEditor('));
const createContext=vm.createContext({projectSpaces:{},activeWorkspace:'general',workspaceProfiles:{general:{home:'/home/demo'}},
  uniqueProjectId:()=> 'my-project',projectAccentPalette:['#64d782'],persistProjectState(){},renderOverviewProjects(){},closeProjectEditor(){},
  activateProject(id){createContext.activated=id;},showArea(){},setUniversalSearchOpen(){},queueDesktopStateBroadcast(){},showToast(){}});
vm.runInContext(projectCreateSource,createContext);createContext.createProjectFromEditor('My project','');
assert.equal(createContext.activated,'my-project');assert.equal(createContext.projectSpaces['my-project'].modes.default.apps.length,0);
assert.equal(createContext.projectSpaces['my-project'].root,'/home/demo/Projects/my-project');
assert.equal(G.create({status:'active',version:2,index:12}).lesson.id,'projects', 'Version 2 index also migrates without a lesson ID');
console.log('Guide task observers passed: modes, empty project creation, window ownership, rail resize, final challenge, progress migration and placement.');

// Capture observes stopped click events, but must run after the control mutates state.
const scheduled=[];let capturedClick;
context.document={addEventListener(type,listener,capture){assert.equal(type,'click');assert.equal(capture,true);capturedClick=listener;}};
context.setTimeout=(callback)=>scheduled.push(callback);
const clickObserver=adapter.split('\n').find(line=>line.includes("document.addEventListener('click', () =>"));
vm.runInContext(clickObserver,context);
context.model=at('fullscreen');context.appState={dolphin:'open'};context.appInfo.dolphin={};context.owners.dolphin='workspace';context.column='workspace';
const clickSession={};context.tileSession=()=>clickSession;
capturedClick();assert(!context.model.state.done.includes('bounded-enter'));
clickSession.focus={name:'dolphin'};scheduled.shift()();assert(context.model.state.done.includes('bounded-enter'));
capturedClick();clickSession.focus=null;scheduled.shift()();assert(context.model.ready());
console.log('Stopped window clicks are observed after their action, including a rapid restore.');

// A skipped task stays distinct from a performed action, including after refresh.
const skipping=at('park'); skipping.state.practiceWindow='notes';
assert(skipping.skip()); assert.equal(skipping.lesson.id,'area-rail');
assert.deepEqual(skipping.state.done,[]); assert.deepEqual(skipping.state.skipped,['park']);
assert.equal(skipping.state.practiceWindow,undefined);
assert.deepEqual(G.create(skipping.snapshot()).state.skipped,['park']);
assert(!at('welcome').skip()); assert(!at('complete').skip());
const chapter=G.create();chapter.start('repeat','park');
assert.equal(chapter.lesson.id,'park');assert.equal(chapter.state.chapter,'park');assert(!chapter.ready());
chapter.mark('note-written');chapter.mark('notes-park');assert(chapter.ready());
assert(!chapter.next(),'A single chapter never advances into unrelated topics');
assert(!chapter.skip());assert.equal(G.create(chapter.snapshot()).state.chapter,'park');
chapter.start('repeat','not-a-chapter');assert.equal(chapter.lesson.id,'welcome');assert(!chapter.state.chapter);
const chapterBoot=boot({'spatial-active-workspace':'work','spatial-workspace-app-states-v1':'real-windows'},'?guide=chapter&chapter=park');
assert.equal(chapterBoot.api.model.lesson.id,'park');assert.equal(chapterBoot.api.model.state.mode,'repeat');
chapterBoot.api.storage.setItem('spatial-workspace-app-states-v1','chapter-windows');chapterBoot.api.finish('completed');chapterBoot.api.storage.setItem('spatial-workspace-app-states-v1','late-chapter-layout');
assert.equal(chapterBoot.storage['spatial-workspace-app-states-v1'],'real-windows');
assert.equal(boot(chapterBoot.storage).api.storage.getItem('spatial-workspace-app-states-v1'),'real-windows','A new normal desktop reads its own original session');
chapterBoot.api.storage.removeItem('spatial-workspace-app-states-v1');assert.equal(chapterBoot.storage['spatial-workspace-app-states-v1'],'real-windows','Late removal also stays in practice');
chapterBoot.api.setView('compact');assert.equal(boot(chapterBoot.storage).api.view,'compact');
chapterBoot.api.model.start();assert.equal(chapterBoot.api.view,'compact');
chapterBoot.api.setView('expanded');assert.equal(boot(chapterBoot.storage).api.view,'expanded');
assert(G.shouldCompact('compact',{left:0,top:0,right:100,bottom:100},null));
assert(!G.shouldCompact('expanded',{left:0,top:0,right:100,bottom:100},{left:200,top:0,right:300,bottom:100}));
assert(G.shouldCompact('expanded',{left:0,top:0,right:100,bottom:100},{left:50,top:50,right:150,bottom:150}));

const normalScene={workspace:'general',column:'workspace',projectExists:true,open:['notes'],notesState:'open',notesVisible:true};
assert.equal(G.recovery(at('fullscreen'),{...normalScene,full:'notes'}).action,'escape');
const lost=at('fullscreen');lost.state.practiceWindow='notes';lost.mark('bounded-enter');
assert.equal(G.recovery(lost,{...normalScene,open:[]}).action,'fullscreen-retry');
assert.equal(G.recovery(at('true-fullscreen'),{...normalScene,bounded:'notes'}).action,'true-fullscreen');
assert.equal(G.recovery(at('float'),{...normalScene,notesState:'closed'}).action,'notes');
assert.equal(G.recovery(at('park'),{...normalScene,notesState:'minimized'}).action,'notes');
assert.equal(G.recovery(at('unpark'),{...normalScene,notesState:'minimized'}),null,'Parking is expected in the unpark task');
assert.equal(G.recovery(at('folders'),normalScene).action,'workspace');
assert.equal(G.recovery(at('project-app'),{...normalScene,projectExists:false}).action,'project');
assert.equal(G.recovery(at('park'),{...normalScene,notesVisible:false}).action,'notes');
assert.equal(G.recovery(at('park'),normalScene),null);

// Execute the actual asynchronous prerequisite adapter for every replayable chapter.
const prepareSource=adapter.slice(adapter.indexOf('  async function waitForScene()'),adapter.indexOf('  async function recover('));
(async()=>{
  for(const lesson of G.lessons.filter(lesson=>lesson.goals)) {
    const scene={workspace:'general',column:'workspace',page:0,notes:{notes:[{text:''}]},projectNotes:false};
    const prepared=vm.createContext({model:at(lesson.id),guide:{prerequisites:G.prerequisites,save(){}},
      desktopPageAnimating:false,activeWorkspace:'general',activeProjectName:null,projectSpaces:{},appState:{notes:'closed',dolphin:'closed'},appInfo:{notes:{},dolphin:{}},
      tileSession:()=>({}),setUniversalSearchOpen(){},focusDesktop(){},captureCurrentWorkspaceSession(){},saveAppWindows(){},saveIndependentSessions(){},saveDesktopPages(){},renderNotes(){},
      appWindowModel:()=>scene.notes,renderFileLocation:(_,path)=>{scene.path=path;},workspaceProfiles:{general:{home:'/home/demo'}},
      createWorkspaceFromEditor(){prepared.workspaceProfiles.mine={custom:true,home:'/home/demo/Workspaces/mine'};scene.column='workspace';return 'mine';},
      desktopPages:{column:()=>scene.column,current:()=>scene.page,columnOf:(_,name)=>name==='project-note'?'practice':'workspace'},
      changeDesktopPage(page,_,column=scene.column){scene.page=page;scene.column=column;},
      renderWorkspace(name){prepared.activeWorkspace=name;scene.workspace=name;},
      openProjectNames:()=>Object.keys(prepared.projectSpaces),
      createProjectFromEditor(){prepared.projectSpaces.practice={};prepared.activeProjectName='practice';scene.column='practice';},
      openApp(name){if(name==='notes'&&scene.column==='practice'){prepared.appInfo['project-note']={base:'notes'};prepared.appState['project-note']='open';scene.projectNotes=true;}else prepared.appState[name]='open';},
      minimizeApp(name){prepared.appState[name]='minimized';}});
    vm.runInContext(prepareSource,prepared);await prepared.prepareLesson();
    assert(prepared.model.state.initialized,lesson.id);assert.equal(prepared.guide.settingUp,false);
    assert(!prepared.model.ready(), 'Prerequisites must not claim the selected chapter was performed: '+lesson.id);
    const needed=G.prerequisites(lesson.id);
    assert.equal(prepared.appState.notes,needed.notes?(needed.parked?'minimized':'open'):'closed',lesson.id);
    assert.equal(!!scene.notes.notes[0].text,needed.noteText,lesson.id);
    assert.equal(!!prepared.projectSpaces.practice,needed.project,lesson.id);
    assert.equal(scene.projectNotes,needed.projectApp,lesson.id);
    if (lesson.id === 'area-rail') {
      scene.notes.notes[0].text = 'Keep my own wording';
      await prepared.prepareLesson();
      assert.equal(scene.notes.notes[0].text,'Keep my own wording','Skipping preserves the learner’s existing note');
    }
    assert.equal(scene.column,needed.inProject?'practice':'workspace',lesson.id);
    assert.equal(scene.workspace,needed.ownWorkspace?'mine':'general',lesson.id);
    assert.equal(!!scene.path,needed.downloads,lesson.id);
  }
  // In-progress notes are never replaced when preparing the next task after a skip.
  console.log('Guide additions passed: individual skipping, isolated chapter replay, every chapter prerequisite, persistent view and contextual recovery.');
})().catch(error=>{console.error(error);process.exitCode=1;});

// The actual recovery action uses the same complete fullscreen toggle as Escape.
(async()=>{
  const session={fullscreen:{name:'notes'}};let toggles=0,checks=0;
  const recovering=vm.createContext({guide:{save(){}},model:at('fullscreen'),tileSession:()=>session,
    waitForScene:async()=>{},toggleAppFullscreen(name){assert.equal(name,'notes');toggles++;session.fullscreen=null;},
    appInfo:{notes:{}},lastSignature:'before',check(){checks++;}});
  const source=adapter.slice(adapter.indexOf('  async function recover('),adapter.indexOf('  function resetPractice('));
  vm.runInContext(source,recovering);await recovering.recover('escape');
  assert.equal(toggles,1);assert.equal(checks,1);assert.equal(recovering.guide.settingUp,false);
  console.log('Recovery exits fullscreen through the production toggle and immediately validates the resulting scene.');
})().catch(error=>{console.error(error);process.exitCode=1;});

const positionSource=adapter.slice(adapter.indexOf('  function positionGuide()'),adapter.indexOf('  function updateChecklist()'));
const titleRect={left:0,top:0,right:1363,bottom:130};
const gridRect={left:730,top:400,right:1320,bottom:820};
const notesButton={left:1104,top:667,right:1309,bottom:720};let lookedUpNextControl=false;
const positioning=vm.createContext({model:at('project-app'),guide:{placeGuide:G.placeGuide,shouldCompact:G.shouldCompact,view:'expanded'},
  window:{hidden:false,classList:{contains:()=>false},getBoundingClientRect(){const left=parseInt(this.style.left)||961,top=parseInt(this.style.top)||362;return{width:390,height:562,left,top,right:left+390,bottom:top+562};},style:{}},
  pointer:null,highlighted:[],frontApp:null,innerWidth:1363,innerHeight:936,
  $(selector){const rect=selector.endsWith('.universal-search-header')?titleRect:selector.endsWith('#allAppsGrid')?gridRect:selector === '#universalSearch.is-open #allAppsGrid [data-open-app="notes"]'?(lookedUpNextControl=true,notesButton):null;return rect?{getBoundingClientRect:()=>rect}:null;},
  setCompact(){throw new Error('A clear corner exists; keep the expanded preference');}});
vm.runInContext(positionSource,positioning);positioning.positionGuide();
assert(lookedUpNextControl,'Use the app grid control, not a hidden duplicate favourite');
assert(parseInt(positioning.window.style.left)+390 <= notesButton.left,'Expanded Guide keeps the project Notes launcher clickable');
console.log('Guide placement avoids Overview app launchers and the current chapter control.');

// Preset exit resets session data only and keeps late practice callbacks isolated.
for (const choice of ['clean','demo']) for (const status of ['skipped','completed']) {
  const preset = boot({'spatial-active-workspace':'work','spatial-workspace-app-states-v1':'old-apps','spatial-custom-workspaces-v1':'old-profiles','spatial-project-spaces-v2':'old-projects','spatial-color-theme-v1':'light'},'?guide=start');
  preset.api.storage.setItem('spatial-workspace-app-states-v1','practice-apps');
  preset.api.finish(status,choice);
  assert.equal(preset.storage[Setup.presetKey],choice);
  assert.equal(preset.storage['spatial-active-workspace'],'general');
  assert.equal(preset.storage['spatial-project-spaces-v2'],undefined);
  assert.equal(preset.storage['spatial-custom-workspaces-v1'],undefined);
  assert.equal(preset.storage['spatial-color-theme-v1'],'light');
  preset.api.storage.setItem('spatial-workspace-app-states-v1','late-practice-layout');
  assert.equal(preset.storage['spatial-workspace-app-states-v1'],undefined);
  const normal=boot(preset.storage);assert(!normal.api.model.active());assert.equal(normal.api.storage.getItem(Setup.presetKey),choice);
}
const pending=boot({'spatial-active-workspace':'general'},'?guide=start');pending.api.model.state.exitStatus='skipped';pending.api.save();
assert.equal(boot(pending.storage).api.model.state.exitStatus,'skipped','Reloading remembers an unanswered desktop choice');
console.log('Desktop exit choices passed: skip/completion, clean/demo reset, preference preservation and late autosave isolation.');
