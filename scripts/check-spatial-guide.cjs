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
assert(!model.mark('app-open'), 'Unrelated activity cannot complete the task');
assert(model.mark('toggle-off')); assert(!model.ready());
assert(!model.mark('toggle-off'), 'Repeated events do not advance a lesson');
assert(model.mark('toggle-on')); assert(model.next());
assert.equal(model.lesson.id,'apps'); assert(model.allows('apps')); assert(model.allows('overview'));
while (model.lesson.id !== 'complete') {
  for (const goal of model.lesson.goals || []) model.mark(goal);
  assert(model.ready()); assert(model.next());
}
assert(model.allows('projects'));
model.leave('completed'); assert(model.allows('everything'));
assert.equal(G.lessons.map(x=>x.id).join(','), 'welcome,system,apps,overview,app-instances,tiling,float,fullscreen,true-fullscreen,park,unpark,desktops,empty-desktop,project-stash,ai-context,projects,project-app,project-navigation,workspaces,folders,return,overview-navigation,timeline,timeline-task,resize-areas,area-rail,move-areas,hide-areas,challenge,temporary-desktop,two-displays,complete');
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
existing.api.model.next(); existing.api.model.mark('toggle-off'); existing.api.save();
const resumed = boot(existing.storage);
assert(resumed.api.model.active()); assert.equal(resumed.api.model.lesson.id,'system'); assert(resumed.api.model.state.done.includes('toggle-off'));
resumed.api.finish('completed'); resumed.api.storage.setItem('spatial-workspace-app-states-v1','late-practice-autosave');
assert.equal(resumed.storage['spatial-workspace-app-states-v1'],'original-windows', 'Repeating lessons preserves the original desktop');
const corrupt = G.create({index:999, done:'invalid'});
assert.equal(corrupt.lesson.id,'complete'); assert.deepEqual(corrupt.state.done,[]);
console.log('Spatial Guide passed: progressive access, task validation, first login, skip, persistence, reload and isolated repeat lessons.');

// Exercise the production observer with different apps and overlapping modes.
function at(id) { return G.create({status:'active',version:2,lessonId:id}); }
// New chapters credit a performed action, preserve old progress and distinguish
// the fullscreen and tiled presentations of one screen on its ordinary page.
assert.equal(G.create({status:'active',version:8,index:11,done:['stash-saved']}).lesson.id,'project-stash');
assert.deepEqual(G.create({status:'active',version:8,index:11,done:['stash-saved']}).state.done,['stash-saved']);
assert.equal(G.create({status:'active',version:8,index:27}).lesson.id,'two-displays');
assert(!at('desktops').allows('empty-desktop'));assert(at('empty-desktop').allows('empty-desktop'));
const copies=at('app-instances');
G.observeWindows(copies,{states:{notes:'open','notes--2':'open'},open:['notes','notes--2'],bases:{notes:'notes','notes--2':'notes'}});
assert(!copies.ready(),'Already existing copies do not complete creating a window');
G.observeWindows(copies,{states:{notes:'open','notes--2':'open',terminal:'open'},open:['notes','notes--2','terminal'],bases:{notes:'notes','notes--2':'notes',terminal:'terminal'}});
assert(!copies.ready(),'A different tool is not a second window');
G.observeWindows(copies,{states:{notes:'open','notes--2':'open','notes--3':'open'},open:['notes','notes--2','notes--3'],bases:{notes:'notes','notes--2':'notes','notes--3':'notes'}});
assert(copies.ready());
const parkedCopy=at('app-instances');
G.observeWindows(parkedCopy,{states:{browser:'open'},open:['browser'],bases:{browser:'browser'}});
G.observeWindows(parkedCopy,{states:{browser:'minimized','browser--1':'open'},open:['browser--1'],bases:{browser:'browser','browser--1':'browser'}});
assert(parkedCopy.ready(),'Creating an independent copy counts when layout pressure parks the original');
const closedCopy=at('app-instances');
G.observeWindows(closedCopy,{states:{browser:'open'},open:['browser'],bases:{browser:'browser'}});
G.observeWindows(closedCopy,{states:{browser:'closed','browser--1':'open'},open:['browser--1'],bases:{browser:'browser','browser--1':'browser'}});
assert(!closedCopy.ready(),'Closing the original and opening another does not count as keeping two windows');
const empty=at('empty-desktop');
const emptyScene={workspace:'general',column:'workspace',page:0,open:['notes'],bases:{notes:'notes','notes--2':'notes'}};
G.observeWindows(empty,emptyScene);
G.observeWindows(empty,{...emptyScene,column:'project',page:1,open:[]});assert(!empty.state.done.length);
G.observeWindows(empty,{...emptyScene,page:1,open:[]});assert(empty.state.done.includes('empty-visited'));
G.observeWindows(empty,{...emptyScene,page:1,open:['notes--2']});assert(!empty.ready(),'Opening through Overview is not using the empty desktop icons');
G.observeWindows(empty,{...emptyScene,page:2,open:[]});
empty.state.emptyLaunch={workspace:'work',column:'workspace',page:2,name:'notes'};
G.observeWindows(empty,{...emptyScene,page:2,open:['notes--2']});assert(!empty.ready(),'A stamp from another workspace cannot count');
empty.state.emptyLaunch={workspace:'general',column:'workspace',page:2,name:'notes'};
G.observeWindows(empty,{...emptyScene,page:2,open:['notes--2']});assert(empty.ready(),'A later empty desktop also works, including independent copies');
const temporary=at('temporary-desktop');
const virtualScene={name:'game',borderless:true,state:'open',column:'workspace',page:0,open:['game'],virtualTiled:false};
G.observeTemporaryDesktop(temporary,{...virtualScene,borderless:false,full:'game'});assert(!temporary.state.done.length,'Decorated fullscreen cannot complete the borderless practice');
G.observeTemporaryDesktop(temporary,virtualScene);assert(!temporary.state.done.length,'A normal window is not the fullscreen starting point');
G.observeTemporaryDesktop(temporary,{...virtualScene,full:'game'});
assert.deepEqual(temporary.state.done,['temporary-enter']);
G.observeTemporaryDesktop(temporary,{...virtualScene,page:1,virtualTiled:true});assert(!temporary.state.done.includes('temporary-back'),'A different desktop cannot complete the tile task');
G.observeTemporaryDesktop(temporary,{...virtualScene,virtualTiled:true,state:'closed',open:[]});assert(!temporary.state.done.includes('temporary-back'));
G.observeTemporaryDesktop(temporary,{...virtualScene,virtualTiled:true,state:'minimized',open:[]});assert(!temporary.state.done.includes('temporary-back'));
G.observeTemporaryDesktop(temporary,{...virtualScene,virtualTiled:true});assert(temporary.state.done.includes('temporary-back'));assert(!temporary.ready(),'Tiling must be followed by showing the same screen fullscreen again');
G.observeTemporaryDesktop(temporary,{...virtualScene,full:'other'});assert(!temporary.ready(),'A different fullscreen window cannot complete the return');
G.observeTemporaryDesktop(temporary,{...virtualScene,full:'game'});assert(temporary.ready());
assert.deepEqual(G.create(temporary.snapshot()).state.done,temporary.state.done,'Stable borderless goal IDs retain completed progress');
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

for (const version of [3,4]) {const resumed=G.create({status:'active',version,index:3,done:['notes-open']});assert.equal(resumed.lesson.id,'apps');assert(resumed.ready(),'Progress before the new docking chapter keeps its original task');}
assert.equal(G.create({status:'active',version:5,index:3}).lesson.id,'move-areas');
assert.equal(G.create({status:'active',version:5,index:21}).lesson.id,'complete','The old final screen stays final');
// Free choice still requires the right action, sequence and window ownership.
for (const name of ['browser','terminal','elisa','dolphin','notes','terminal--2']) {
  const app=at('apps');G.observeWindows(app,{open:[name],bases:{[name]:name.split('--')[0]}});assert(app.ready());
  const floating=at('float');G.observeWindows(floating,{floating:[name],interacting:true});assert(!floating.ready());
  G.observeWindows(floating,{floating:[name]});assert(floating.ready());
  const parked=at('park');G.observeWindows(parked,{open:[name],states:{[name]:'open',older:'minimized'}});
  assert(!parked.ready(),'An already parked window is not a new action');
  G.observeWindows(parked,{states:{[name]:'minimized',older:'minimized'}});assert(parked.ready());assert.equal(parked.state.parkedWindow,name);
  const unparked=at('unpark');G.observeWindows(unparked,{states:{[name]:'minimized'}});
  G.observeWindows(unparked,{open:['unrelated'],states:{[name]:'minimized'}});assert(!unparked.ready());
  G.observeWindows(unparked,{open:[name],states:{[name]:'open'}});assert(unparked.ready());
  const project=at('project-app');project.state.practiceProject='mine';
  G.observeWindows(project,{column:'workspace',open:[name]});assert(!project.ready());
  G.observeWindows(project,{column:'mine',open:[name]});assert(project.state.done.includes('project-app-open'));assert(!project.ready(),'Project AI context follows opening the app');
}
const tiled=at('tiling');G.observeWindows(tiled,{tiled:['terminal','terminal--2']});assert(tiled.ready(),'Two instances of the same app qualify');
const laterPark=at('unpark');G.observeWindows(laterPark,{states:{}});G.observeWindows(laterPark,{states:{elisa:'minimized'}});G.observeWindows(laterPark,{open:['elisa']});assert(laterPark.ready());
const setting=at('system');G.observeToggle(setting,'Wi-Fi',false);G.observeToggle(setting,'Bluetooth',true);assert(!setting.ready());G.observeToggle(setting,'Wi-Fi',true);assert(setting.ready());
for (const name of ['browser','terminal','elisa','Spatial Guide']) {
  const search=at('overview');G.observeSearch(search,{query:'',results:[name],launch:name,opened:[name]});assert(!search.ready());
  G.observeSearch(search,{query:'choice',results:[name]});assert(search.state.done.includes('app-search'));
  G.observeSearch(search,{query:'choice',results:[name],launch:'unrelated',opened:['unrelated']});assert(!search.ready());
  G.observeSearch(search,{query:'choice',results:[name],launch:name,opened:[name]});assert(search.ready());
}
const pages=at('desktops');G.observeWindows(pages,{page:2});G.observeWindows(pages,{page:5,column:'another-project'});assert(!pages.state.done.length);
G.observeWindows(pages,{page:5});assert(!pages.ready());G.observeWindows(pages,{page:0});assert(!pages.ready());G.observeWindows(pages,{page:2});assert(pages.ready());
const oldToggle=G.create({status:'active',version:3,lessonId:'system',done:['sound-off']});G.observeToggle(oldToggle,'Sound',true);assert(oldToggle.ready(),'Old in-progress toggle tasks retain their chosen setting');
assert(G.create({status:'active',version:3,lessonId:'park',done:['note-written','notes-park']}).ready());
assert(!G.create({status:'active',version:3,lessonId:'park',done:['note-written']}).ready());
console.log('General Guide tasks passed: all apps, instances, settings, search results, parking, projects, arbitrary desktops and legacy progress.');

// The optional final chapter follows the challenge and can be skipped on one monitor.
const displayLesson=at('two-displays');assert.equal(G.lessons.at(-2).id,'two-displays');assert(displayLesson.lesson.optional);
G.observeDisplays(displayLesson,{count:1});assert(!displayLesson.state.done.length);
const displayScene={count:2,slot:1,assignments:{apps:{terminal:1,browser:1},areas:{systems:1,apps:1}},states:{terminal:'open',browser:'open'},open:['terminal','browser'],areas:[{name:'systems',saved:1,actual:1},{name:'apps',saved:1,actual:1}]};
G.observeDisplays(displayLesson,displayScene);assert.deepEqual(displayLesson.state.done,['display-linked']);
displayScene.assignments.apps.terminal=2;displayScene.open=['browser'];G.observeDisplays(displayLesson,displayScene);assert(displayLesson.state.done.includes('display-app-moved'));assert(!displayLesson.state.done.includes('display-app-returned'));
displayScene.assignments.apps.browser=1;G.observeDisplays(displayLesson,displayScene);assert(!displayLesson.state.done.includes('display-app-returned'),'A different app cannot restore the moved window');
displayScene.assignments.apps.terminal=1;displayScene.open.push('terminal');G.observeDisplays(displayLesson,displayScene);assert(displayLesson.state.done.includes('display-app-returned'));
displayScene.assignments.areas.systems=2;displayScene.areas[0]={name:'systems',saved:2,actual:2};G.observeDisplays(displayLesson,displayScene);assert(displayLesson.state.done.includes('display-area-moved'));
displayScene.bounded='terminal';G.observeDisplays(displayLesson,displayScene);assert(!displayLesson.state.done.includes('display-max-enter'),'A maximized window alone cannot satisfy app transfer');
displayScene.transferred={browser:{source:1,target:2}};displayScene.assignments.apps.browser=2;displayScene.open=['terminal'];G.observeDisplays(displayLesson,displayScene);assert(displayLesson.state.done.includes('display-max-enter'));
delete displayScene.bounded;G.observeDisplays(displayLesson,displayScene);assert(!displayLesson.state.done.includes('display-max-exit'),'The peer must return as well as the owner restoring');
displayScene.assignments.apps.browser=1;displayScene.open.push('browser');G.observeDisplays(displayLesson,displayScene);assert(displayLesson.state.done.includes('display-max-exit'));
displayScene.assignments.apps.browser=2;displayScene.open=['terminal'];
displayScene.full='terminal';G.observeDisplays(displayLesson,displayScene);assert(!displayLesson.state.done.includes('display-full-enter'),'A manually transferred Area alone does not demonstrate automatic fullscreen yielding');
displayScene.areas[1].actual=2;displayScene.areas[1].hidden=true;G.observeDisplays(displayLesson,displayScene);assert(!displayLesson.state.done.includes('display-full-enter'),'Hidden Areas do not count as visible on the other display');
displayScene.areas[1].hidden=false;G.observeDisplays(displayLesson,displayScene);assert(displayLesson.state.done.includes('display-full-enter'));
delete displayScene.full;displayScene.open=['browser'];G.observeDisplays(displayLesson,displayScene);assert(!displayLesson.ready(),'Closing the fullscreen app does not count as restoring it');
displayScene.open.push('terminal');displayScene.assignments.apps.browser=1;G.observeDisplays(displayLesson,displayScene);assert(displayLesson.ready());assert(G.create(displayLesson.snapshot()).ready());
const optional=at('two-displays');assert(optional.skip());assert.equal(optional.lesson.id,'complete');assert(optional.state.skipped.includes('two-displays'));
const ownerBoot=boot({'spatial-active-workspace':'general','spatial-workspace-app-states-v1':'real-desktop'},'?guide=chapter&chapter=two-displays');
const companionBoot=boot(ownerBoot.storage,'?guide=display&practice='+ownerBoot.api.model.state.sessionId);
assert(companionBoot.api.displayValid);assert(companionBoot.api.displayCompanion);assert.equal(companionBoot.api.syncScope,ownerBoot.api.syncScope);
const progress=companionBoot.storage['spatial-guide-v1'];companionBoot.api.model.mark('display-linked');companionBoot.api.save();assert.equal(companionBoot.storage['spatial-guide-v1'],progress,'Only the Guide owner saves task progress');
companionBoot.api.storage.setItem('spatial-workspace-app-states-v1','practice-display');assert.equal(companionBoot.storage['spatial-workspace-app-states-v1'],'real-desktop');
assert(!boot(ownerBoot.storage,'?guide=display&practice=unrelated').api.displayValid);
console.log('Two-display chapter passed: optional ending, real transfers, same-window return, visible fullscreen Areas, reload and companion storage isolation.');

// Run the adapter's actual polling function for the new desktop tasks.
const adapter = fs.readFileSync(require.resolve('../dist/guide-desktop.js'),'utf8');
const checkSource = adapter.slice(adapter.indexOf('  function check()'),adapter.indexOf('  function start('));
const context = vm.createContext({model:at('resize-areas'), guide:{mission:G.mission,observeContext:G.observeContext,observeFullscreen:G.observeFullscreen,observeWindows:G.observeWindows,observeSearch:G.observeSearch,recovery:G.recovery,shouldCompact:G.shouldCompact,save(){}},
  appState:{}, appMaximizedState:{}, tileSession:()=>({}), isLocalApp:()=>true,
  areaPriority:['systems','apps','projects'],dockState:{systems:{edge:'right'},apps:{edge:'left'},projects:{edge:'left'}}, dockSizes:{right:300,top:250}, areaRect:{width:300,height:500}, areaFor:name=>({getBoundingClientRect:()=>({...context.areaRect}),classList:{contains:token=>token==='is-area-resizing' ? context.dragging || context.resizingArea===name : context.dragging}}),
  dragging:false, window:{}, currentRecovery:null, lastFullscreen:null, lastSignature:'', manualWindowInteraction:false, frameFor:()=>({dataset:{},classList:{contains:()=>false}}), SpatialHomeFolders:require('../dist/home-folders.js'), $:()=>({classList:{contains:()=>false}}), $$:selector=>selector==='.area-share-handle.is-active' && context.shareDragging ? [{}] : [], highlight(){}, activeWorkspace:'general',activeProjectName:null,
  appInfo:{notes:{}}, appWindowModel:()=>({notes:[{text:'My original note'}]}),
  projectSpaces:{example:{}}, updateChecklist(){}, positionGuide(){},
  openProjectNames:()=>Object.keys(context.projectSpaces),desktopPages:{current:()=>0,visible:()=>true,column:()=>context.column,columnOf:(_,name)=>context.owners[name],fullscreenBond:()=>null},owners:{},column:'workspace',projectColumnActive:()=>context.column !== 'workspace'});
context.mark = goal=>context.model.mark(goal);
vm.runInContext(checkSource,context); context.check();
context.dockSizes.right=340; context.dragging=true; context.check();
assert(!context.model.ready(), 'Resize completes only after releasing the border');
context.dragging=false; context.check(); assert(context.model.ready());
// The production polling block credits either dimension, once its gesture ends.
context.model=at('resize-areas');context.dockSizes.right=300;context.check();
assert.equal(context.model.state.areaResizeBaseline.extent,500,'Side-dock lessons remember System height');
context.areaRect.height=523;context.check();assert(!context.model.ready(),'A small shared-space adjustment does not finish the task');
context.areaRect.height=548;context.shareDragging=true;context.check();assert(!context.model.ready(),'A live sibling separator cannot finish the task before release');
context.shareDragging=false;context.check();assert(context.model.ready(),'Changing System height through its sibling separator completes resizing without changing dock width');
assert(G.create(context.model.snapshot()).ready(),'Completed shared-space resizing survives a saved lesson');
context.model=at('resize-areas');context.check();context.dockSizes.right=340;context.resizingArea='apps';context.check();
assert(!context.model.ready(),'A shared width drag on a different Area must also finish before credit');
context.resizingArea=null;context.check();assert(context.model.ready(),'The completed shared width gesture still counts for System');
context.dockState.systems.edge='top';context.areaRect={width:600,height:250};context.model=at('resize-areas');context.check();
assert.equal(context.model.state.areaResizeBaseline.extent,600,'Top and bottom docks measure System width');
context.areaRect.height=310;context.check();assert(!context.model.ready(),'Changing the wrong rect axis does not count as the horizontal share');
context.areaRect.width=632;context.shareDragging=true;context.check();assert(!context.model.ready(),'Horizontal share previews also wait for release');
context.shareDragging=false;context.check();assert(context.model.ready(),'A horizontal separator completes the same task');
context.dockState.systems.edge='right';context.areaRect={width:340,height:500};context.model=at('resize-areas');
context.model.state.areaResizeBaseline={edge:'right',size:340};context.check();
assert.equal(context.model.state.areaResizeBaseline.extent,500,'Old saved baselines learn the missing extent on their first poll');
assert(!context.model.ready(),'Adding the old baseline extent cannot claim a resize that was not observed');
context.areaRect.height=532;context.check();assert(context.model.ready(),'A migrated baseline can credit a later sibling adjustment');
context.model=at('resize-areas');context.model.state.areaResizeBaseline={edge:'right',size:300};context.check();
assert(context.model.ready(),'An old saved width difference remains valid while migrating the baseline');
context.model=at('resize-areas');context.check();context.dockState.systems.edge='top';context.areaRect.width=700;context.check();
assert(!context.model.ready(),'Moving System to a different edge alone cannot complete resizing');
context.dockState.systems.edge='right';
assert(G.goalHints['area-resized'].includes('separator'),'The resize hint teaches the sibling control too');
context.areaFor=name=>({hidden:name==='apps',classList:{contains:()=>context.dragging}});
context.model=at('move-areas');context.check();assert(!context.model.ready());
context.dockState.apps.edge='bottom';context.check();assert(!context.model.ready(),'Hidden, untaught Areas cannot complete docking practice');
context.dockState.systems.edge='left';context.dragging=true;context.check();assert(!context.model.ready(),'Dock preview does not complete a move before release');
context.dragging=false;context.check();assert(context.model.ready());
const moveSnapshot=context.model.snapshot();assert(G.create(moveSnapshot).ready(),'Completed docking survives refresh');
context.model.next();assert.equal(context.model.state.areaMoveBaseline,undefined,'The next task gets a fresh baseline');
for(const edge of ['left']) {context.dockState.systems.edge='right';context.model=at('move-areas');context.check();context.dockState.systems.edge=edge;context.check();assert(context.model.ready(),edge);}
context.dockState.systems.edge='right';
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
context.model=at('folders');context.model.state.practiceWorkspace='personal';context.appInfo.dolphin={};context.appState.dolphin='open';context.frameFor=()=>({dataset:{fileLocation:'/home/demo/Downloads'},classList:{contains:()=>false}});context.check();assert(!context.model.ready());
context.frameFor=()=>({dataset:{fileLocation:'/home/demo/Workspaces/personal/Pictures'},classList:{contains:()=>false}});context.check();assert(context.model.ready(),'Any standard folder in the new workspace satisfies the folder task');
context.activeWorkspace='general';context.appState.dolphin='closed';

context.model=at('project-app');context.model.state.practiceProject='mine';context.appState.notes='open';context.owners.notes='workspace';
context.isLocalApp=name=>context.owners[name]===context.column;context.check();assert(!context.model.ready(), 'Workspace Notes does not count as a project window');
context.appInfo['notes--2']={base:'notes'};context.appState['notes--2']='open';context.owners['notes--2']='mine';context.check();assert(context.model.state.done.includes('project-app-open'));assert(!context.model.ready());
context.model=at('project-navigation');context.model.state.practiceProject='mine';context.check();assert(!context.model.ready());
context.column='workspace';context.check();context.column='mine';context.check();assert(context.model.ready(),'A return to the project finishes switching practice without a redundant third switch');
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
const clickObserver=adapter.slice(adapter.indexOf('  // Capture the selected search result'),adapter.indexOf("  document.addEventListener('pointerup'"));
vm.runInContext(clickObserver,context);
context.model=at('fullscreen');context.appState={dolphin:'open'};context.appInfo.dolphin={};context.owners.dolphin='workspace';context.column='workspace';
const clickSession={};context.tileSession=()=>clickSession;
capturedClick({target:{closest:()=>null}});assert(!context.model.state.done.includes('bounded-enter'));
clickSession.focus={name:'dolphin'};scheduled.shift()();assert(context.model.state.done.includes('bounded-enter'));
capturedClick({target:{closest:()=>null}});clickSession.focus=null;scheduled.shift()();assert(context.model.ready());
console.log('Stopped window clicks are observed after their action, including a rapid restore.');

// A skipped task stays distinct from a performed action, including after refresh.
const skipping=at('park'); skipping.state.practiceWindow='notes';
assert(skipping.skip()); assert.equal(skipping.lesson.id,'unpark');
assert.deepEqual(skipping.state.done,[]); assert.deepEqual(skipping.state.skipped,['park']);
assert.equal(skipping.state.practiceWindow,undefined);
assert.deepEqual(G.create(skipping.snapshot()).state.skipped,['park']);
assert(!at('welcome').skip()); assert(!at('complete').skip());
const chapter=G.create();chapter.start('repeat','park');
assert.equal(chapter.lesson.id,'park');assert.equal(chapter.state.chapter,'park');assert(!chapter.ready());
chapter.mark('app-park');assert(chapter.ready());
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

const normalScene={workspace:'general',column:'workspace',projectExists:true,open:['terminal'],parked:[]};
assert.equal(G.recovery(at('fullscreen'),{...normalScene,full:'terminal'}).action,'escape');
const lost=at('fullscreen');lost.state.practiceWindow='terminal';lost.mark('bounded-enter');
assert.equal(G.recovery(lost,{...normalScene,open:[]}).action,'fullscreen-retry');
assert.equal(G.recovery(at('true-fullscreen'),{...normalScene,bounded:'terminal'}).action,'true-fullscreen');
assert.equal(G.recovery(at('float'),{...normalScene,open:[]}).action,'window');
assert.equal(G.recovery(at('park'),{...normalScene,open:[],parked:['terminal']}).action,'window');
assert.equal(G.recovery(at('unpark'),{...normalScene,open:[],parked:['terminal']}),null);
assert.equal(G.recovery(at('unpark'),{...normalScene,open:[]}).action,'park-app');
assert.equal(G.recovery(at('folders'),normalScene).action,'workspace');
assert.equal(G.recovery(at('project-app'),{...normalScene,projectExists:false}).action,'project');
assert.equal(G.recovery(at('park'),normalScene),null,'Any open app provides the task prerequisite');

// Execute the actual asynchronous prerequisite adapter for every replayable chapter.
const prepareSource=adapter.slice(adapter.indexOf('  async function waitForScene()'),adapter.indexOf('  async function recover('));
const gameControls={};
const gameNavigation=vm.createContext({model:at('temporary-desktop'),activeWorkspace:'gaming',document:{addEventListener(_,handler){gameControls.click=handler;}},showLessonOverview(id){gameControls.overview=id;},SpatialVirtualScreen:{showTiled(name){gameControls.tiled=name;}},check(){}});
vm.runInContext(adapter.slice(adapter.indexOf("  document.addEventListener('click', event => {"),adapter.indexOf("  document.addEventListener('pointerdown', event => {")),gameNavigation);
for(const action of ['overview','desktop'])gameControls.click({target:{closest:selector=>selector==='[data-steam-action]'?{dataset:{steamAction:action}}:null}});
assert.equal(gameControls.overview,'temporary-desktop');assert.equal(gameControls.tiled,'game','The practice Show desktop action tiles the same screen without the Steam adapter');
// The full introduction also prepares the borderless example at its boundary,
// then returns to the ordinary workspace for the following display chapter.
(async()=>{
  const scene={prepared:[]};
  const transition=vm.createContext({model:at('challenge'),guide:{save(){}},window:{addEventListener(_,handler){scene.click=handler;}},updateGate(){},render(){},async prepareLesson(){scene.prepared.push(transition.model.lesson.id);},closePracticeDisplay(){}});
  vm.runInContext(adapter.slice(adapter.indexOf("  window.addEventListener('click', async event => {"),adapter.indexOf("  window.addEventListener('input', event => {")),transition);
  const next={target:{closest:selector=>selector==='[data-guide-action]'?{dataset:{guideAction:'next'}}:null}};
  for(const goal of transition.model.lesson.goals)transition.model.mark(goal);
  await scene.click(next);assert.equal(transition.model.lesson.id,'temporary-desktop');assert.deepEqual(scene.prepared,['temporary-desktop']);
  for(const goal of transition.model.lesson.goals)transition.model.mark(goal);
  await scene.click(next);assert.equal(transition.model.lesson.id,'two-displays');assert.deepEqual(scene.prepared,['temporary-desktop','two-displays']);
})().catch(error=>{console.error(error);process.exitCode=1;});
(async()=>{
  for(const lesson of G.lessons.filter(lesson=>lesson.goals)) {
    const scene={workspace:'general',column:'workspace',page:0,notes:{notes:[{text:''}]},projectApp:false};
    const prepared=vm.createContext({model:at(lesson.id),guide:{prerequisites:G.prerequisites,save(){}},
      desktopPageAnimating:false,activeWorkspace:'general',activeProjectName:null,projectSpaces:{},appState:{browser:'closed',terminal:'closed',notes:'closed',dolphin:'closed',game:'closed'},appInfo:{browser:{},terminal:{},notes:{},dolphin:{},game:{borderlessFullscreen:true}},
      tileSession:()=>scene.session ||= {},toggleAppFullscreen(){scene.session.fullscreen=null;},SpatialVirtualScreen:{showFullscreen(name){assert(!prepared.desktopPageAnimating,'Wait for workspace navigation before requesting Gamescope fullscreen');scene.session ||= {};scene.session.fullscreen={name};scene.fullscreenPage=scene.page;scene.fullscreenColumn=scene.column;}},syncApps(){},refreshIntentAreas(){},renderTileLayout(){},setUniversalSearchOpen(){},$(){return {value:"parked"};},renderOverviewWindows(){},showArea(){},focusDesktop(){},captureCurrentWorkspaceSession(){},saveAppWindows(){},saveIndependentSessions(){},saveDesktopPages(){},renderNotes(){},
      appWindowModel:()=>scene.notes,renderFileLocation:(_,path)=>{scene.path=path;},workspaceProfiles:{general:{home:'/home/demo'}},
      gamingWorkspaceProfile:{label:'Gaming'},cloneDesktopState:value=>JSON.parse(JSON.stringify(value)),workspaceAppStates:{},workspaceProjectStates:{},workspaceOpenProjects:{},workspaceProjects:{},windowMembership:{},workspaceAreaContents:{},workspaceContent:{},defaultAreaContent:{},renderWorkspaceTabs(){},
      createWorkspaceFromEditor(){prepared.workspaceProfiles.mine={custom:true,home:'/home/demo/Workspaces/mine'};scene.column='workspace';return 'mine';},
      desktopPages:{column:()=>scene.column,current:()=>scene.page,pageOf:()=>scene.page,columnOf:(_,name)=>name.endsWith('--project')?'practice':'workspace',fullscreenBond:(_,name)=>scene.bond?.name===name?scene.bond:null},
      changeDesktopPage(page,_,column=scene.column){scene.page=page;scene.column=column;},
      renderWorkspace(name){prepared.activeWorkspace=name;scene.workspace=name;if(lesson.id==='temporary-desktop')prepared.desktopPageAnimating=true;},setTimeout(fn){prepared.desktopPageAnimating=false;fn();},
      openProjectNames:()=>Object.keys(prepared.projectSpaces),
      createProjectFromEditor(){prepared.projectSpaces.practice={};prepared.activeProjectName='practice';scene.column='practice';},
      openApp(name){if(scene.column==='practice'){prepared.appInfo[name+'--project']={base:name};prepared.appState[name+'--project']='open';scene.projectApp=true;}else prepared.appState[name]='open';},
      minimizeApp(name){prepared.appState[name]='minimized';}});
    prepared.model.state.preferredApp='terminal';vm.runInContext(prepareSource,prepared);await prepared.prepareLesson();
    assert(prepared.model.state.initialized,lesson.id);assert.equal(prepared.guide.settingUp,false);
    assert(!prepared.model.ready(), 'Prerequisites must not claim the selected chapter was performed: '+lesson.id);
    const needed=G.prerequisites(lesson.id);
    assert.equal(prepared.appState.terminal,needed.window?(needed.parked?'minimized':'open'):'closed',lesson.id);
    assert.equal(prepared.appState.notes,'closed', 'Preparing '+lesson.id+' never forces Notes');
    assert.equal(scene.notes.notes[0].text,'',lesson.id);
    assert.equal(!!prepared.projectSpaces.practice,needed.project,lesson.id);
    assert.equal(scene.projectApp,needed.projectApp,lesson.id);
    if (lesson.id === 'area-rail') {
      scene.notes.notes[0].text = 'Keep my own wording';
      await prepared.prepareLesson();
      assert.equal(scene.notes.notes[0].text,'Keep my own wording','Skipping preserves the learner’s existing note');
    }
    assert.equal(scene.column,needed.inProject?'practice':'workspace',lesson.id);
    assert.equal(scene.workspace,lesson.id==='temporary-desktop'?'gaming':needed.ownWorkspace?'mine':'general',lesson.id);
    if(lesson.id==='temporary-desktop') {
      assert.equal(prepared.appState.game,'open');assert.equal(scene.session.fullscreen.name,'game');assert.equal(scene.fullscreenPage,0);assert.equal(scene.fullscreenColumn,'workspace');assert.equal(scene.bond,undefined,'Fullscreen preparation never creates a child page');assert.equal(prepared.appState.browser,'closed','The borderless example never seeds a decorated substitute');
      prepared.model.state.temporaryWindow='browser';prepared.model.state.done=['temporary-enter'];
      await prepared.prepareLesson();assert.equal(prepared.model.state.temporaryWindow,'game');assert(!prepared.model.state.done.length,'The old Firefox practice restarts only this task with the correct app');
    }
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
const positioning=vm.createContext({manuallyExpanded:false,model:at('project-app'),guide:{placeGuide:G.placeGuide,shouldCompact:G.shouldCompact,view:'expanded'},
  window:{hidden:false,contains:element=>!!element.own,classList:{contains:()=>false},getBoundingClientRect(){const left=parseInt(this.style.left)||961,top=parseInt(this.style.top)||362;return{width:390,height:562,left,top,right:left+390,bottom:top+562};},style:{}},
  pointer:null,highlighted:[{own:true,getBoundingClientRect:()=>({left:0,top:0,right:1363,bottom:936})}],frontApp:null,innerWidth:1363,innerHeight:936,
  $(selector){const rect=selector.endsWith('.universal-search-header')?titleRect:selector.endsWith('#allAppsGrid')?gridRect:selector === '#universalSearch.is-open #allAppsGrid [data-open-app]'?(lookedUpNextControl=true,notesButton):null;return rect?{getBoundingClientRect:()=>rect}:null;},
  setCompact(){throw new Error('A clear corner exists; keep the expanded preference');}});
vm.runInContext(adapter.slice(adapter.indexOf("  function overviewPracticeTarget()"),adapter.indexOf("  function highlight()")),positioning);
vm.runInContext(positionSource,positioning);positioning.positionGuide();
assert(lookedUpNextControl,'Use the app grid control, not a hidden duplicate favourite');
assert(parseInt(positioning.window.style.left)+390 <= notesButton.left,'Expanded Guide keeps the project app launcher clickable');
positioning.manuallyExpanded=true;positioning.$=()=>({getBoundingClientRect:()=>({left:0,top:0,right:1363,bottom:936})});
positioning.positionGuide();
let automaticCompactions=0;positioning.manuallyExpanded=false;positioning.setCompact=()=>automaticCompactions++;positioning.positionGuide();assert.equal(automaticCompactions,1,'Manual expansion stays readable; automatic compaction resumes at the next interaction');
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

const syncBoundary=desktop.slice(desktop.indexOf('function postDesktopSyncMessage('),desktop.indexOf('function prepareCrossDisplaySync('));
let sent=[],applied=[],closed=0;
const syncContext=vm.createContext({cancelAreaPointerInteraction:null,cancelWindowPointerInteraction:null,SpatialGuide:{model:{active:()=>true},syncScope:'guide:test',displayValid:true},desktopSyncScope:'guide:test',desktopSyncSource:'main',desktopSyncLastStamp:0,desktopSyncReady:true,desktopSyncApplying:false,desktopSyncTimer:0,desktopSyncAnnounced:false,
 desktopSyncChannel:{postMessage(packet){sent.push(packet);}},localDisplayDescriptor:()=>({guideCompanion:false}),captureDesktopSyncState:()=>({schema:4}),desktopStorage:{setItem(){}},desktopSyncPeers:new Map(),refreshIntentAreas(){},localDisplaySlot:()=>1,localDisplayRoleLabel:()=> 'Main display',
 document:{body:{classList:{toggle(){}}}},$(){return null;},areaFor(){return null;},rebalanceAreaDisplays:()=>false,applyExtendedDesktopPartition(){},showToast(){},workspaceProfiles:{general:{label:'General'}},activeWorkspace:'general',setTimeout,clearTimeout,
 applyDesktopSyncState(state){applied.push(state);},close(){closed++;}});
vm.runInContext(syncBoundary,syncContext);
syncContext.postDesktopSyncMessage({type:'presence'});assert.equal(sent[0].scope,'guide:test');
syncContext.receiveDesktopSyncMessage({source:'normal',scope:'desktop',type:'state',stamp:1,state:{wrong:true}});assert(!applied.length);assert(!syncContext.desktopSyncPeers.size);
syncContext.receiveDesktopSyncMessage({source:'old-practice',scope:'guide:another',type:'state',stamp:2,state:{wrong:true}});assert(!applied.length);
syncContext.receiveDesktopSyncMessage({source:'second',scope:'guide:test',type:'state',stamp:3,state:{correct:true}});assert(applied[0].correct);
syncContext.SpatialGuide.displayCompanion=true;syncContext.receiveDesktopSyncMessage({source:'main',scope:'guide:test',type:'guide-display-end'});assert.equal(closed,0,'A display ignores its own source');
syncContext.desktopSyncSource='second';syncContext.receiveDesktopSyncMessage({source:'main',scope:'guide:test',type:'guide-display-end'});assert.equal(closed,1);
sent=[];syncContext.desktopSyncReady=false;syncContext.broadcastDesktopState();assert(!sent.length,'A new companion cannot overwrite the main scene before initial synchronization');
console.log('Production display synchronization passed: isolated practice channels, stale-session rejection, initial owner authority and companion cleanup.');

// New chapters observe owned, persisted content and meaningful state transitions.
const contextScene={workspace:'general',column:'practice',note:'',items:[],ai:{items:[],draft:'',workingProject:null},areas:{apps:true,systems:true,projects:true,ai:true},activity:[],plans:[],overview:false,section:'windows',filter:'all',query:'',day:'2026-10-10',activityDay:'2026-10-10'};
const stash=at('project-stash');G.observeContext(stash,{...contextScene,column:'workspace'});
G.observeContext(stash,{...contextScene,column:'another',items:[{id:'a'}]});assert(!stash.ready(),'Another context does not complete workspace Stash practice');
G.observeContext(stash,{...contextScene,column:'workspace',items:[{id:'a',title:'My idea'}]});assert(!stash.ready(),'Save and inspect are separate actions');
G.observeContext(stash,{...contextScene,column:'workspace',items:[{id:'a',title:'My idea'}],expandedStash:['a']});assert(stash.ready());assert(G.create(stash.snapshot()).ready());
const ai=at('ai-context');G.observeContext(ai,{...contextScene,column:'workspace'});
G.observeContext(ai,{...contextScene,column:'workspace',ai:{items:[{id:'foreign',workspace:'other'}],turns:[],workingProject:null}});assert(!ai.state.done.includes('ai-source'));
G.observeContext(ai,{...contextScene,column:'workspace',ai:{items:[{id:'mine',workspace:'general',title:'My idea'}],turns:[{id:'reply',request:'Help me',example:false}],workingProject:null}});assert(!ai.ready(),'Keeping the reply is a separate action');
G.observeContext(ai,{...contextScene,column:'workspace',items:[{id:'kept-reply',source:{app:'ai-demo'}}],ai:{items:[{id:'mine',workspace:'general'}],turns:[{id:'reply',request:'Help me',example:false}],workingProject:null}});assert(ai.ready(),'AI works and its reply can be kept without a project');
const projectContext=at('project-app');projectContext.state.practiceProject='practice';G.observeContext(projectContext,contextScene);projectContext.mark('project-app-open');
G.observeContext(projectContext,{...contextScene,ai:{items:[{id:'other',project:'another'}],workingProject:'another'}});assert(!projectContext.ready());
G.observeContext(projectContext,{...contextScene,ai:{items:[{id:'mine',project:'practice'}],workingProject:'practice'}});assert(projectContext.ready(),'Project context selects the real working folder');
const hide=at('hide-areas');G.observeContext(hide,contextScene);G.observeContext(hide,{...contextScene,areas:{...contextScene.areas,ai:false}});assert(hide.state.done.includes('area-hidden'));
G.observeContext(hide,{...contextScene,overview:true,section:'apps'});assert(!hide.ready(),'Restoring from the intended System view remains a separate action');
G.observeContext(hide,{...contextScene,overview:true,section:'system'});assert(hide.ready());
const nav=at('overview-navigation');G.observeContext(nav,contextScene);G.observeContext(nav,{...contextScene,overview:true,section:'system'});assert(!nav.ready());G.observeContext(nav,{...contextScene,overview:true});assert(!nav.ready(),'Returning to Windows alone does not finish window practice');
const filterAction={kind:'filter',value:'parked',workspace:'general',fromOverview:true,section:'windows'};
assert(!G.observeOverviewAction(nav,filterAction,{...contextScene,overview:true,windowFilter:'all'}),'A stale filter action is not credited');
assert(!G.observeOverviewAction(nav,{...filterAction,fromOverview:false},{...contextScene,overview:true,windowFilter:'parked'}),'A filter outside Overview is not credited');
assert(!G.observeOverviewAction(nav,{...filterAction,section:'apps'},{...contextScene,overview:true,section:'apps',windowFilter:'parked'}),'The Apps launcher cannot complete Windows filtering practice');
assert(G.observeOverviewAction(nav,filterAction,{...contextScene,overview:true,windowFilter:'parked'}));
const windowAction={kind:'window',name:'terminal--2',workspace:'general',fromOverview:true,section:'windows'};
assert(!G.observeOverviewAction(nav,windowAction,{...contextScene,open:['notes'],front:'notes'}),'Selecting a closed or different window cannot finish practice');
assert(!G.observeOverviewAction(nav,windowAction,{...contextScene,workspace:'work',open:['terminal--2'],front:'terminal--2'}),'Another workspace cannot finish practice');
assert(G.observeOverviewAction(nav,windowAction,{...contextScene,open:['terminal--2'],front:'terminal--2'}));assert(nav.ready());assert(G.create(nav.snapshot()).ready(),'Overview practice survives reload with the actual completed goals');
const timeline=at('timeline');G.observeContext(timeline,contextScene);
const activity=[{id:'opened',type:'app.open',time:1000}],plans=[{id:'event',type:'calendar.event',time:500,endTime:1500}];
G.observeContext(timeline,{...contextScene,activity,plans:[{...plans[0],endTime:900}]});assert(!timeline.state.done.includes('timeline-event'),'An event must cover the activity time');
G.observeContext(timeline,{...contextScene,activity,plans,overview:true,section:'timeline',filter:'calendar'});assert(!timeline.ready(),'Compare requires both lanes');
G.observeContext(timeline,{...contextScene,activity,plans,overview:true,section:'timeline',day:'2026-10-11'});assert(!timeline.ready(),'Compare requires the activity day');
G.observeContext(timeline,{...contextScene,activity,plans,overview:true,section:'timeline'});assert(!timeline.ready(),'Comparing lanes is followed by trying Latest activity');
const latestAction={kind:'latest',workspace:'general',fromOverview:true,section:'timeline'};
assert(!G.observeOverviewAction(timeline,latestAction,{...contextScene,activity,overview:true,section:'apps'}),'Latest activity must run in Timeline');
assert(!G.observeOverviewAction(timeline,latestAction,{...contextScene,activity,overview:true,section:'timeline',day:'2026-10-11'}),'Latest on another day does not locate the practice activity');
assert(G.observeOverviewAction(timeline,latestAction,{...contextScene,activity,overview:true,section:'timeline'}));assert(timeline.ready());
const taskLesson=at('timeline-task');G.observeContext(taskLesson,contextScene);const newTask={id:'task',type:'task.due',time:5000,done:false};G.observeContext(taskLesson,{...contextScene,plans:[newTask]});assert(!taskLesson.ready());G.observeContext(taskLesson,{...contextScene,plans:[{...newTask,done:true}]});assert(taskLesson.ready());
assert(at('return').allows('ai'));assert(at('project-stash').allows('stash'));assert(at('project-stash').allows('project-area'));assert(!at('project-stash').allows('projects'));assert(!at('project-stash').allows('ai'));assert(at('ai-context').allows('ai'));assert(!at('ai-context').allows('timeline'));assert(!at('ai-context').allows('overview-system'));assert(at('hide-areas').allows('overview-system'));assert(at('overview-navigation').allows('timeline'));
assert.equal(G.create({status:'active',version:6,index:16}).lesson.id,'project-navigation','Version 6 indices retain their original topic');
assert.equal(G.create({status:'active',version:6,index:22}).lesson.id,'complete','Completed older introductions stay complete');
const isolated=boot({'spatial-active-workspace':'general','spatial-workspace-timeline-v1':'real-history'},'?guide=chapter&chapter=timeline');isolated.api.storage.setItem('spatial-workspace-timeline-v1','practice-history');assert.equal(isolated.storage['spatial-workspace-timeline-v1'],'real-history');isolated.api.finish('completed');assert.equal(isolated.storage['spatial-workspace-timeline-v1'],'real-history');
console.log('New Guide chapters passed: project Stash, AI source/folder/draft, Area recovery, carousel navigation, overlapping Timeline comparison, task completion, progressive gates, legacy progress and isolated history.');

// New targets follow the learner's unfinished action, including an empty filter.
const practiceTarget=vm.createContext({model:at('overview-navigation'),$:()=>null});
vm.runInContext(adapter.slice(adapter.indexOf('  function overviewPracticeTarget()'),adapter.indexOf('  function highlight()')),practiceTarget);
assert.equal(practiceTarget.overviewPracticeTarget(),'.overview-section-nav');
practiceTarget.model.state.done=['overview-away','overview-back'];assert.equal(practiceTarget.overviewPracticeTarget(),'#overviewWindowFilter');
practiceTarget.model.state.done.push('overview-filtered');assert.equal(practiceTarget.overviewPracticeTarget(),'#overviewWindowFilter','An empty filter points back to the filter instead of an empty window list');
practiceTarget.$=()=>({});assert.equal(practiceTarget.overviewPracticeTarget(),'#overviewWindowGrid');
practiceTarget.model=at('timeline');practiceTarget.model.state.done=['timeline-activity','timeline-event','timeline-compared'];assert.equal(practiceTarget.overviewPracticeTarget(),'#timelineLatest');
const resumedOverview=G.create({status:'active',version:7,lessonId:'overview-navigation',done:['overview-away','overview-back']});assert(!resumedOverview.ready());assert.deepEqual(resumedOverview.state.done,['overview-away','overview-back'],'Updating the chapter preserves existing learner progress');
const lessonNavigation=[];
const lessonRouting=vm.createContext({model:at('apps'),setUniversalSearchOpen(open){assert.equal(open,true);},SpatialOverviewDesktop:{select(section,animate){assert.equal(animate,false);lessonNavigation.push(section);}},positionGuide(){}});
vm.runInContext(adapter.slice(adapter.indexOf('  function showLessonOverview('),adapter.indexOf('  function check()')),lessonRouting);
for(const [id,section] of [['apps','apps'],['overview','apps'],['tiling','apps'],['project-app','apps'],['folders','projects'],['overview-navigation','windows'],['temporary-desktop','windows'],['hide-areas','system'],['timeline-task','timeline']]){
  lessonRouting.model=at(id);lessonRouting.showLessonOverview(id);assert.equal(lessonNavigation.at(-1),section,'Show me routes '+id+' to '+section);
}
lessonRouting.model=at('timeline');lessonRouting.showLessonOverview('timeline');assert.equal(lessonNavigation.at(-1),'apps','Timeline starts by launching a tool');
lessonRouting.model.mark('timeline-activity');lessonRouting.showLessonOverview('timeline');assert.equal(lessonNavigation.at(-1),'timeline','After making activity the lesson opens Timeline');
assert.equal(G.goalLabels['overview-back'],'Return to Windows');
assert(G.goalHints['temporary-back'].includes('Overview → Windows'));
assert(G.goalHints['workspace-folder'].includes('Projects & Files'));
console.log('Updated Guide passed: Overview filters, actual window return, latest-activity jumps, context-specific tab routing and existing progress.');

// Run the real capture listeners: window selection closes Overview before validation.
const captureModel=at('overview-navigation');G.observeContext(captureModel,contextScene);captureModel.mark('overview-away');captureModel.mark('overview-back');
const captureNodes={'#universalSearch':{classList:{contains:()=>captureScene.overview}},'#overviewWindowFilter':{value:'parked'},'#timelineDay':{value:'2026-10-10'}},captureScene={overview:true,section:'windows'},captureHandlers={},capturePending=[];
const capture=vm.createContext({model:captureModel,guide:{observeOverviewAction:G.observeOverviewAction,save(){}},activeWorkspace:'general',lastSignature:'',frontApp:null,appState:{'terminal--2':'minimized'},isLocalApp:()=>true,
  $:id=>captureNodes[id],SpatialOverviewDesktop:{active:()=>captureScene.section},SpatialTimelineDesktop:{snapshot:()=>({activity:[]})},SpatialTimeline:require('../dist/timeline.js'),
  document:{addEventListener(type,fn,phase){assert.equal(phase,true);captureHandlers[type]=fn;}},setTimeout:fn=>capturePending.push(fn),check(){}});
vm.runInContext(adapter.slice(adapter.indexOf('  // Capture Overview actions'),adapter.indexOf('  // Capture the selected search result')),capture);
captureHandlers.change({target:{id:'overviewWindowFilter',value:'parked'}});assert(!captureModel.state.done.includes('overview-filtered'));capturePending.shift()();assert(captureModel.state.done.includes('overview-filtered'));
captureHandlers.click({target:{closest:selector=>selector==='[data-overview-open-app]'?{dataset:{overviewOpenApp:'terminal--2'}}:null}});
assert(!captureModel.ready(),'Window practice waits for the window action');
capture.appState['terminal--2']='open';capture.frontApp='terminal--2';captureScene.overview=false;capturePending.shift()();assert(captureModel.ready(),'The capture retains the Overview origin after the app closes the overlay');
capture.guide.settingUp=true;captureHandlers.change({target:{id:'overviewWindowFilter',value:'open'}});assert.equal(capturePending.length,0,'Guide prerequisite setup cannot credit user actions');
console.log('Guide Overview capture passed: filters validate after change, unpark validates after selection and setup never counts.');

assert.doesNotThrow(()=>G.observeWindows(at('overview-navigation'),{open:[],states:{}}),'An empty Overview desktop remains observable');
assert.equal(G.recovery(at('overview-navigation'),{...normalScene,open:[],parked:[]}).action,'window','Empty-window recovery offers a real app rather than crashing');

// Mission sequencing and stored progress remain meaningful after the reordering.
assert.equal(G.chapters.length,14);
assert(G.lessons.findIndex(l=>l.id==='project-stash') < G.lessons.findIndex(l=>l.id==='ai-context'));
assert(G.lessons.findIndex(l=>l.id==='ai-context') < G.lessons.findIndex(l=>l.id==='projects'));
assert(G.lessons.findIndex(l=>l.id==='resize-areas') > G.lessons.findIndex(l=>l.id==='timeline-task'));
assert.equal(G.create({status:'active',version:7,index:16,done:['stash-saved']}).lesson.id,'project-stash','Version 7 positional progress retains its original lesson');
const missionStash=at('project-stash');assert.equal(G.mission(missionStash).goal,'stash-saved');
missionStash.mark('stash-saved');missionStash.state.keptItem={id:'x',title:'My own idea'};
assert.equal(G.mission(missionStash).goal,'stash-inspected');assert(G.mission(missionStash).feedback.includes('My own idea'));
assert(!missionStash.ready());missionStash.mark('stash-inspected');assert(missionStash.ready());
for(const lesson of G.lessons.filter(l=>l.goals)){
  assert(lesson.text.split(/\s+/).length<=35,'Short primary explanation: '+lesson.id);
  assert(G.chapters.some(chapter=>chapter.id===lesson.chapter));
}
// Seed only a labeled meeting in active Timeline practice, aligned with the learner's action.
const overviewSource=fs.readFileSync(require.resolve('../dist/overview-desktop.js'),'utf8');
const planner=require('../dist/timeline.js').createPlanner();let meetingSaves=0;
const meetingCtx=vm.createContext({SpatialGuide:{model:at('timeline')},activeWorkspace:'general',planner,savePlanner(){meetingSaves++;},renderTimeline(){}});
meetingCtx.SpatialGuide.model.state.sessionId='test-session';
vm.runInContext(overviewSource.slice(overviewSource.indexOf('  function addPracticeMeeting('),overviewSource.indexOf('  globalThis.SpatialTimelineDesktop=')),meetingCtx);
const practiceMeeting=meetingCtx.addPracticeMeeting(1760000000000);
assert(practiceMeeting.time<=1760000000000&&practiceMeeting.endTime>1760000000000);
assert(practiceMeeting.title.includes('Guide example'));assert.equal(meetingSaves,1);
assert.equal(meetingCtx.addPracticeMeeting(1760000000000).id,practiceMeeting.id);assert.equal(meetingSaves,1,'A reload does not duplicate the meeting');
meetingCtx.SpatialGuide.model.leave('completed');assert.equal(meetingCtx.addPracticeMeeting(1760000000001),null,'Normal desktop calendars never receive a guide meeting');
console.log('Mission Guide passed: short copy, chapter order, one current action, own-item feedback, legacy progress and practice-only Timeline example.');

// Fresh practice prepares immediately while parsing scripts. Its presentation
// adapter must exist before Guide bootstrap can request fullscreen.
const bootHtml=fs.readFileSync(require.resolve("../dist/index.html"),"utf8");
assert(bootHtml.indexOf('src="virtual-screen.js')<bootHtml.indexOf('src="guide-desktop.js'),"Gamescope loads before Guide practice initializes");
