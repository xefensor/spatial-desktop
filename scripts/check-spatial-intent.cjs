const assert = require("node:assert/strict");
const I = require("../dist/spatial-intent.js");
const areas = [
  {name:"projects", edge:"left", display:1, size:310},
  {name:"apps", edge:"right", display:1, size:300},
  {name:"systems", edge:"right", display:1, size:300}
];
const displays = [{slot:1,width:1600,height:900,minimum:{width:460,height:360}}, {slot:2,width:1600,height:900,minimum:{width:0,height:0}}];
const fullscreen = [{display:1,fullscreen:true,edges:["left","right","top","bottom"]}];
const defaults = {areas,displays,windows:[{name:"elisa",display:1}],demands:fullscreen};
const transferred = I.plan(defaults);
assert.deepEqual(transferred.moves,{projects:2,apps:2,systems:2});
assert.deepEqual(transferred.canvas[2],["projects","apps","systems"],"An empty second display hosts three tiled Area columns");
assert.deepEqual(areas.map(area => area.display),[1,1,1],"Temporary borrowing never rewrites the preferred monitor assignments");
assert.deepEqual(I.plan({...defaults,demands:[]}).moves,{},"Exiting fullscreen returns the original allocation");
const blocked = I.plan({...defaults,displays:[displays[0], {...displays[1],minimum:{width:1550,height:880}}],windows:[{name:"elisa",display:1},{name:"browser",display:2}]});
assert.deepEqual(blocked.moves,{},"A busy second monitor's windows are not displaced");
assert.deepEqual(blocked.hidden,{projects:true,apps:true,systems:true},"Busy second monitor hides Areas on the fullscreen display");
assert.deepEqual(blocked.overlays,{},"Fullscreen leaves no edge tabs over the app");
const one = I.plan({...defaults,displays:[displays[0]]});
assert.deepEqual(one.hidden,{projects:true,apps:true,systems:true});
assert.deepEqual(one.overlays,{});
assert.deepEqual(transferred.hidden,{},"Areas stay visible on a display with room");
assert.deepEqual(I.plan({...defaults,displays:[displays[0]],demands:[]}).hidden,{},"Leaving fullscreen restores Areas on a single monitor");
const bothFullscreen = I.plan({...defaults,demands:[...fullscreen,{display:2,fullscreen:true,edges:["left","right","top","bottom"]}]});
assert.deepEqual(bothFullscreen.moves,{},"Never relocate Areas over another fullscreen app");
assert.deepEqual(bothFullscreen.hidden,{projects:true,apps:true,systems:true});
const covered = I.plan({...defaults,windows:[{name:"elisa",display:1},{name:"notes",display:2,floating:true,rect:{left:0,top:0,width:1600,height:900}}]});
assert.deepEqual(covered.moves,{},"A floating window covering the destination blocks relocation");
assert.deepEqual(covered.hidden,{projects:true,apps:true,systems:true});
const manualOverlay = I.plan({...defaults,displays:[displays[0]],demands:[{display:1,edges:["left"],overlayEdges:["left"]}]});
assert.deepEqual(manualOverlay.overlays,{projects:true},"Manual floating pressure retains its accessible edge overlay");
assert.deepEqual(manualOverlay.hidden,{},"Temporary hiding is specific to true fullscreen");
const manual = I.plan({...defaults,displays:[displays[0]],demands:[{display:1,edges:["left"]}]});
assert.deepEqual(manual.rails,{projects:true},"Only the manually crossed Area lane yields");
assert.deepEqual(manual.overlays,{},"Rail stays visible when the manual window leaves rail space");
const railOnly = I.plan({...defaults,displays:[displays[0], {...displays[1],minimum:{width:1450,height:400}}],windows:[{name:"elisa",display:1},{name:"browser",display:2}],demands:[{display:1,edges:["left"]}]});
assert.deepEqual(railOnly.moves,{projects:2});
assert.equal(railOnly.rails.projects,true,"A second monitor may accept a rail when expanded space will not fit");
const overridden = I.plan({...defaults,demands:[{...fullscreen[0],exclude:["projects"]}]});
assert.equal(overridden.moves.projects,undefined,"Manual Area edits override automatic relocation");
const noIntent = I.plan({...defaults,demands:[]});
assert.deepEqual(noIntent,{moves:{},rails:{},overlays:{},hidden:{},canvas:{}},"Normal tiled-window activity never changes Areas");
console.log("Area intent policy: fullscreen transfer/return, three-column scene, busy and single-monitor hiding/return, rail capacity, manual override and no-feedback invariants passed.");
// Exercise the real visibility renderer as well as the allocation policy.
const fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../dist/desktop-shell.js'), 'utf8');
const frames = Object.fromEntries(areas.map(area => {
  const classes = new Set(['is-intent-revealed']);
  return [area.name, {inert:false, classList: {
    toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
    remove(name) { classes.delete(name); }, contains(name) { return classes.has(name); }
  }}];
}));
const shelf = {dataset:{},innerHTML:''};
const context = vm.createContext({
  $: () => shelf, $$: () => [], areaFor: name => frames[name],
  areaPriority: areas.map(area => area.name), dockState: Object.fromEntries(areas.map(area => [area.name,{edge:area.edge}])),
  isLocalArea: () => true, intentAreaPlan: one
});
vm.runInContext(source.slice(source.indexOf('function renderIntentAreaEdges('),source.indexOf('function restoreWorkspaceWindowLayout(')),context);
context.renderIntentAreaEdges();
assert.equal(shelf.innerHTML,'','Fullscreen hiding has no clickable edge tabs');
for(const frame of Object.values(frames)) {
  assert.equal(frame.inert,true,'Hidden Areas are not keyboard-accessible');
  assert(frame.classList.contains('is-intent-hidden'));
  assert(!frame.classList.contains('is-intent-revealed'));
}
context.intentAreaPlan = noIntent;
context.renderIntentAreaEdges();
for(const frame of Object.values(frames)) {
  assert.equal(frame.inert,false,'Areas regain interaction after fullscreen');
  assert(!frame.classList.contains('is-intent-hidden'));
}
console.log('Fullscreen Area rendering: no edge tabs, inert hidden panels and interaction restored on exit passed.');
