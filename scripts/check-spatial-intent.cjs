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
assert.deepEqual(blocked.overlays,{projects:true,apps:true,systems:true},"Busy/one-monitor fullscreen exposes Areas at the edges");
const one = I.plan({...defaults,displays:[displays[0]]});
assert.deepEqual(one.overlays,{projects:true,apps:true,systems:true});
const manual = I.plan({...defaults,displays:[displays[0]],demands:[{display:1,edges:["left"]}]});
assert.deepEqual(manual.rails,{projects:true},"Only the manually crossed Area lane yields");
assert.deepEqual(manual.overlays,{},"Rail stays visible when the manual window leaves rail space");
const railOnly = I.plan({...defaults,displays:[displays[0], {...displays[1],minimum:{width:1450,height:400}}],windows:[{name:"elisa",display:1},{name:"browser",display:2}],demands:[{display:1,edges:["left"]}]});
assert.deepEqual(railOnly.moves,{projects:2});
assert.equal(railOnly.rails.projects,true,"A second monitor may accept a rail when expanded space will not fit");
const overridden = I.plan({...defaults,demands:[{...fullscreen[0],exclude:["projects"]}]});
assert.equal(overridden.moves.projects,undefined,"Manual Area edits override automatic relocation");
const noIntent = I.plan({...defaults,demands:[]});
assert.deepEqual(noIntent,{moves:{},rails:{},overlays:{},canvas:{}},"Normal tiled-window activity never changes Areas");
console.log("Area intent policy: fullscreen transfer/return, three-column scene, busy and single-monitor fallback, rail capacity, manual override and no-feedback invariants passed.");
