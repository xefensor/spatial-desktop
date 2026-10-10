const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const G = require('../dist/spatial-guide.js');
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
assert(model.allows('apps')); assert(!model.allows('overview'));
while (model.lesson.id !== 'complete') {
  for (const goal of model.lesson.goals || []) model.mark(goal);
  assert(model.ready()); assert(model.next());
}
assert(model.allows('projects'));
model.leave('completed'); assert(model.allows('everything'));
assert.equal(G.lessons.map(x=>x.id).join(','), 'welcome,system,apps,tiling,float,overview,fullscreen,true-fullscreen,park,unpark,resize-areas,desktops,projects,project-navigation,workspaces,folders,return,complete');
function boot(entries) {
  const storage = {...entries};
  Object.defineProperties(storage, {
    getItem:{value:key=>storage[key] ?? null},
    setItem:{value:(key,value)=>{storage[key]=String(value);}},
    removeItem:{value:key=>{delete storage[key];}}
  });
  const context = vm.createContext({localStorage:storage, document:{documentElement:{dataset:{}}}});
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
resumed.api.finish('completed');
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
const checkSource = adapter.slice(adapter.indexOf('  function check()'),adapter.indexOf('  function start()'));
const context = vm.createContext({model:at('resize-areas'), guide:{observeFullscreen:G.observeFullscreen,save(){}},
  appState:{}, appMaximizedState:{}, tileSession:()=>({}), isLocalApp:()=>true,
  dockState:{systems:{edge:'right'}}, dockSizes:{right:300}, areaFor:()=>({classList:{contains:()=>context.dragging}}),
  dragging:false, window:{}, lastSignature:'', $:()=>({}), highlight(){}, activeWorkspace:'general',activeProjectName:null,
  desktopPages:{column:()=>context.column},column:'workspace',projectColumnActive:()=>context.column !== 'workspace'});
context.mark = goal=>context.model.mark(goal);
vm.runInContext(checkSource,context); context.check();
context.dockSizes.right=340; context.dragging=true; context.check();
assert(!context.model.ready(), 'Resize completes only after releasing the border');
context.dragging=false; context.check(); assert(context.model.ready());
context.model=at('projects'); context.activeProjectName='plasma'; context.check(); assert(!context.model.ready());
context.column='plasma'; context.check(); assert(context.model.ready(), 'Opening the actual project completes introduction');
context.model=at('project-navigation'); context.check(); assert(!context.model.ready());
context.column='workspace'; context.check(); context.column='plasma'; context.check(); assert(!context.model.ready());
context.column='workspace'; context.check(); assert(context.model.ready(), 'Project navigation checks both directions and a final return');
console.log('Guide fullscreen recovery, progress migration, Area resize and project navigation passed.');
