const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const Compact=require('../dist/compact-area-layout.js');
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-7,`${actual} should be ${expected}`);
let count=0;
function checked(input){
  const before=JSON.stringify(input),result=Compact.layout(input);
  assert.equal(JSON.stringify(input),before,'Allocation does not change persistent state or its input');
  const names=[...new Set(input.names.filter(name=>typeof name==='string'&&name.length))];
  assert.deepEqual(Object.keys(result),names,'Column order is preserved with no duplicate allocations');
  const height=Number.isFinite(input.height)?Math.max(0,input.height):0;
  let bottom=0;
  for(const name of names){
    const entry=result[name];
    assert(Number.isFinite(entry.y)&&entry.y>=0&&Number.isFinite(entry.height)&&entry.height>=0,'Geometry is finite and nonnegative');
    assert(entry.y+1e-7>=bottom,'Allocated Areas never overlap');
    assert(entry.y+entry.height<=height+1e-7,'Every Area fits the local column');
    assert.equal(typeof entry.compactGrid,'boolean');bottom=entry.y+entry.height;
  }
  if(names.length)near(bottom,height);
  count++;return result;
}

let result=checked({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},width:320,height:900});
assert.deepEqual(result,{apps:{y:0,height:660,compactGrid:false},systems:{y:660,height:240,compactGrid:true}},'System has a short content-sized panel below an expanded Apps Area');
result=checked({names:['systems','apps'],states:{apps:'expanded',systems:'rail'},width:240,height:900,gap:8});
assert.deepEqual(result,{systems:{y:0,height:240,compactGrid:true},apps:{y:248,height:652,compactGrid:false}},'Order and gutter are preserved when the compact Area comes first');
result=checked({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},width:239,height:900,gap:8});
assert.deepEqual(result,{apps:{y:0,height:446,compactGrid:false},systems:{y:454,height:446,compactGrid:false}},'Narrow rails retain the legacy equal allocation');
for(const states of [{apps:'expanded',systems:'expanded'},{apps:'rail',systems:'rail'}]){
  result=checked({names:['apps','systems'],states,width:320,height:900,gap:8});
  assert.equal(result.apps.height,446);assert.equal(result.systems.height,446);
  assert.equal(result.apps.compactGrid,states.apps==='rail');assert.equal(result.systems.compactGrid,states.systems==='rail');
}
result=checked({names:['systems'],states:{systems:'rail'},width:320,height:660,gap:80});
assert.deepEqual(result,{systems:{y:0,height:660,compactGrid:true}},'An all-compact wide column keeps its equal allocation and grid after its expanded peer is hidden');
result=checked({names:['projects','apps','systems','ai'],states:{projects:'rail',apps:'expanded',systems:'rail',ai:'expanded'},width:320,height:1000,gap:8});
assert.equal(result.projects.height,156);assert.equal(result.systems.height,240);
assert.equal(result.apps.height,290);assert.equal(result.ai.height,290);
assert.equal(result.apps.y,164);assert.equal(result.systems.y,462);assert.equal(result.ai.y,710);
result=checked({names:['projects','apps','systems','ai'],states:{projects:'rail',apps:'expanded',systems:'rail',ai:'rail'},width:320,height:600,gap:8});
near(result.apps.height,288);
near(result.systems.height/result.projects.height,240/156);
near(result.ai.height,result.projects.height);
assert(result.apps.height>result.systems.height,'Multiple compacts do not crowd out the expanded Area');
result=checked({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},width:320,height:800,compactHeights:{systems:200}});
assert.equal(result.systems.height,200);assert.equal(result.apps.height,600,'A caller can use a measured compact content height');
result=checked({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},width:320,height:800,compactHeights:{systems:-1}});
assert.equal(result.systems.height,240,'Invalid compact preferences use the content default');

for(const height of [0,1,12,99,400,480,481,900])for(const gap of [0,8,2000]){
  result=checked({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},width:320,height,gap});
  assert(result.apps.height+1e-7>=result.systems.height,'A single expanded Area retains at least half the usable height');
}
for(const width of [0,70,239,240,320])for(const height of [0,1,31,600]){
  checked({names:['apps','projects','systems','ai'],states:{apps:'expanded',projects:'rail',systems:'rail',ai:'rail'},width,height,gap:8});
  checked({names:['apps','projects','systems','ai'],states:{apps:'rail',projects:'rail',systems:'rail',ai:'rail'},width,height,gap:8});
}
checked({names:['apps','apps','systems',null,''],states:{apps:'expanded',systems:'rail'},width:320,height:900});
checked({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},width:NaN,height:-10,gap:-2});
checked({names:['apps','systems','ai'],states:{apps:'expanded',systems:'rail',ai:'rail'},width:320,height:1000,compactHeights:{systems:1e308,ai:1e308}});
assert.deepEqual(Compact.layout(),{});assert.deepEqual(Compact.layout(null),{});
const special=Compact.layout({names:['__proto__','apps'],states:{apps:'expanded'},width:320,height:900});
assert.equal(Object.getPrototypeOf(special),Object.prototype);assert.equal(Object.hasOwn(special,'__proto__'),true,'Area names cannot change the output prototype');
const sandbox={};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/compact-area-layout.js'),'utf8'),sandbox);
assert.equal(typeof sandbox.SpatialCompactAreas.layout,'function','The same pure helper is available to the browser');
const browser=sandbox.SpatialCompactAreas.layout({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},width:320,height:900});
assert.equal(browser.systems.height,240);assert.equal(browser.apps.height,660);
console.log('Compact Area allocation: '+count+' ordered mixed/equal/narrow/tiny scenarios, content preferences, state immutability and browser export passed.');

let allocationCount=0;
function allocated(input){
  const before=JSON.stringify(input),result=Compact.allocate(input);
  assert.equal(JSON.stringify(input),before,'Weighted allocation preserves preferred states and saved shares');
  const names=[...new Set(input.names.filter(name=>typeof name==='string'&&name.length))];
  assert.deepEqual(Object.keys(result),names,'Area order remains stable in both orientations');
  const extent=Number.isFinite(input.extent)?Math.max(0,input.extent):0;
  const tolerance=Math.max(1e-7,extent*1e-12),axis=input.axis==='horizontal'?'horizontal':'vertical';
  const gap=names.length>1?Math.min(Number.isFinite(input.gap)?Math.max(0,input.gap):0,extent/(names.length-1)):0;
  let edge=0;
  for(const [index,name] of names.entries()){
    const panel=result[name];
    assert(Number.isFinite(panel.offset)&&panel.offset>=0&&Number.isFinite(panel.extent)&&panel.extent>=0,'All allocation geometry is finite and nonnegative');
    assert(Math.abs(panel.offset-edge)<tolerance,'Only the requested gap separates consecutive Areas');
    assert(panel.offset+panel.extent<=extent+tolerance,'Every Area remains inside its dock');
    const expectedState=input.states?.[name]==='rail'||panel.extent+1e-7<Compact.expandedMinimum(axis,name)?'rail':'expanded';
    assert.equal(panel.state,expectedState,'Content fit affects the resolved state, retaining explicit Compact preferences');
    const crossSize=Number.isFinite(input.crossSize)?Math.max(0,input.crossSize):0;
    const gridFits=axis==='vertical'?crossSize>=240:panel.extent>=160&&crossSize>=120;
    assert.equal(panel.compactGrid,gridFits&&panel.state==='rail');
    edge=panel.offset+panel.extent+(index<names.length-1?gap:0);
  }
  if(names.length)assert(Math.abs(edge-extent)<tolerance,'The final panel consumes the remaining extent exactly');
  allocationCount++;return result;
}
const fullStates={apps:'expanded',projects:'expanded',systems:'expanded',ai:'expanded'};
result=allocated({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},axis:'vertical',crossSize:280,extent:900});
assert.deepEqual(result,{apps:{offset:0,extent:660,state:'expanded',compactGrid:false},systems:{offset:660,extent:240,state:'rail',compactGrid:true}},'The default wide mixed column retains the existing compact System allocation');
result=allocated({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},axis:'vertical',crossSize:280,extent:900,shares:{apps:2,systems:1}});
assert.equal(result.apps.extent,600);assert.equal(result.systems.extent,300,'Explicit space shares override the compact content default');
assert.equal(result.systems.state,'rail','A saved Compact preference stays Compact even when allocated more space');
result=allocated({names:['apps','systems'],states:fullStates,axis:'vertical',crossSize:280,extent:800,shares:{apps:1,systems:9}});
assert.equal(result.apps.extent,80);assert.equal(result.apps.state,'rail');assert.equal(result.systems.extent,720);assert.equal(result.systems.state,'expanded');
result=allocated({names:['apps','systems'],states:fullStates,axis:'vertical',crossSize:280,extent:2400,shares:{apps:1,systems:9}});
near(result.apps.extent,240);assert.equal(result.apps.state,'expanded','A panel automatically returns to its preferred Expanded state when the same shares fit');
result=allocated({names:['projects','ai'],states:fullStates,axis:'horizontal',crossSize:180,extent:1000,shares:{projects:1,ai:3}});
assert.equal(result.projects.extent,250);assert.equal(result.projects.state,'rail');assert.equal(result.ai.extent,750);assert.equal(result.ai.state,'expanded');
assert.equal(result.projects.compactGrid,true,'A short wide compact panel uses its available height instead of a long overflowing icon row');
result=allocated({names:['projects','ai'],states:fullStates,axis:'horizontal',crossSize:180,extent:1400,shares:{projects:1,ai:3}});
assert.equal(result.projects.extent,350);assert.equal(result.projects.state,'expanded');

for(const axis of ['vertical','horizontal']){
  const minimum=Compact.thresholds.compactExtent[axis];
  result=allocated({names:['apps','systems'],states:fullStates,axis,crossSize:300,extent:1000,shares:{apps:1e-20,systems:1}});
  assert.equal(result.apps.extent,minimum,'Extreme proportions retain enough space for compact controls');
  assert.equal(result.systems.extent,1000-minimum,'Minimum allocation is taken only from the larger peer');
  result=allocated({names:['apps','systems'],states:fullStates,axis,crossSize:300,extent:minimum,shares:{apps:1,systems:99}});
  assert.equal(result.apps.extent,minimum/2);assert.equal(result.systems.extent,minimum/2,'The compact minimum shrinks only when the entire dock is too short');
  for(const name of Object.keys(fullStates))for(const offset of [-1,0,1]){
    const extent=Compact.expandedMinimum(axis,name)+offset;
    result=allocated({names:[name],states:fullStates,axis,crossSize:300,extent,shares:{[name]:1}});
    assert.equal(result[name].state,offset<0?'rail':'expanded','Each Area has its own meaningful expanded-content threshold');
  }
}

function permutations(values){
  return values.length?values.flatMap((value,index)=>permutations(values.filter((_,other)=>index!==other)).map(rest=>[value,...rest])):[[]];
}
const shares={apps:1,projects:2,systems:3,ai:4};
for(const names of permutations(Object.keys(fullStates)))for(const axis of ['vertical','horizontal'])for(let mask=0;mask<16;mask++){
  const states=Object.fromEntries(names.map((name,index)=>[name,mask&(1<<index)?'rail':'expanded']));
  for(const extent of [1,450,2400]){
    result=allocated({names,states,axis,crossSize:300,extent,gap:8,shares});
    if(extent===2400)for(const name of names)near(result[name].extent,(extent-24)*shares[name]/10);
  }
}
for(const axis of ['vertical','horizontal'])for(const extent of [0,1,32,500,1e308])for(const gap of [0,8,1e308]){
  allocated({names:['apps','projects','systems','ai'],states:fullStates,axis,crossSize:300,extent,gap,shares:{apps:Number.MIN_VALUE,projects:1,systems:1e308,ai:2}});
}
for(const shares of [null,{},'broken',{apps:1},{apps:1,systems:0},{apps:1,systems:-1},{apps:1,systems:NaN},{apps:1,systems:Infinity},{apps:1,systems:'2'},Object.create({apps:1,systems:1})]){
  result=allocated({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},axis:'vertical',crossSize:280,extent:900,shares});
  assert.equal(result.apps.extent,660);assert.equal(result.systems.extent,240,'Malformed saved shares safely use the existing default');
}
for(const axis of ['vertical','horizontal'])for(const crossSize of [0,70,239,240,320]){
  allocated({names:['apps','systems'],states:fullStates,axis,crossSize,extent:300,shares:{apps:1,systems:1}});
}
for(const name of Object.keys(fullStates))for(const extent of [159,160,200])for(const crossSize of [64,119,120,250]){
  result=allocated({names:[name],states:fullStates,axis:'horizontal',crossSize,extent});
  assert.equal(result[name].compactGrid,extent>=160&&crossSize>=120,'Every horizontal Area selects a grid only when both dimensions fit');
}
result=allocated({names:['systems'],states:{systems:'rail'},axis:'horizontal',crossSize:64,extent:900});
assert.equal(result.systems.compactGrid,false,'A shallow horizontal rail retains its original icon row');
result=allocated({names:['systems'],states:fullStates,axis:'horizontal',crossSize:250,extent:900});
assert.equal(result.systems.compactGrid,false,'Expanded panels never select the Compact grid');
allocated({names:['apps','apps','systems',null,''],states:fullStates,axis:'vertical',crossSize:300,extent:900,shares:{apps:1,systems:2}});
allocated({names:['apps','systems'],states:null,axis:'unknown',crossSize:Infinity,extent:NaN,gap:-5,shares:{apps:1,systems:2}});
assert.deepEqual(Compact.allocate(),{});assert.deepEqual(Compact.allocate(null),{});
result=Compact.allocate({names:['__proto__','apps'],states:fullStates,axis:'vertical',crossSize:300,extent:900,shares:JSON.parse('{"__proto__":1,"apps":1}')});
assert.equal(Object.getPrototypeOf(result),Object.prototype);assert.equal(Object.hasOwn(result,'__proto__'),true);
assert.equal(Compact.expandedMinimum('horizontal','__proto__'),300,'Unknown names use a numeric threshold');
assert.equal(typeof sandbox.SpatialCompactAreas.allocate,'function','Weighted allocation is also exported for the browser');
const browserAllocation=sandbox.SpatialCompactAreas.allocate({names:['apps','systems'],states:fullStates,axis:'vertical',crossSize:280,extent:800,shares:{apps:1,systems:9}});
assert.equal(browserAllocation.apps.extent,80);assert.equal(browserAllocation.apps.state,'rail');
console.log('Resizable Area allocation: '+allocationCount+' proportional, orientation, permutation, fit/restore, minimum-size and malformed-state scenarios passed.');
