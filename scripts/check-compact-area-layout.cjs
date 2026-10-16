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
