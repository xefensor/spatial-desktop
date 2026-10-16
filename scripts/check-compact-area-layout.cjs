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
  assert.equal(JSON.stringify(input),before,'Allocation preserves preferred states and saved shares');
  const names=[...new Set(input.names.filter(name=>typeof name==='string'&&name.length))];
  assert.deepEqual(Object.keys(result),names,'Area order remains stable in both orientations');
  const extent=Number.isFinite(input.extent)?Math.max(0,input.extent):0;
  const tolerance=Math.max(1e-7,extent*1e-12),axis=input.axis==='horizontal'?'horizontal':'vertical';
  const gap=names.length>1?Math.min(Number.isFinite(input.gap)?Math.max(0,input.gap):0,extent/(names.length-1)):0;
  const crossSize=Number.isFinite(input.crossSize)?Math.max(0,input.crossSize):0;
  const narrowRails=crossSize<(axis==='vertical'?240:120)&&names.every(name=>result[name].state==='rail');
  let edge=0;
  for(const [index,name] of names.entries()){
    const panel=result[name];
    assert(Number.isFinite(panel.offset)&&panel.offset>=0&&Number.isFinite(panel.extent)&&panel.extent>=0,'Geometry is finite and nonnegative');
    assert(Math.abs(panel.offset-edge)<tolerance,'Only the requested gap separates consecutive Areas');
    assert(panel.offset+panel.extent<=extent+tolerance,'Every Area stays inside its dock');
    assert(['rail','expanded'].includes(panel.state));
    if(input.states?.[name]==='rail')assert.equal(panel.state,'rail','Explicit Compact preferences stay Compact');
    if(panel.state==='expanded')assert(panel.extent+tolerance>=Compact.expandedMinimum(axis,name),'Expanded panels retain a useful content minimum');
    if(names.length>1&&panel.state==='rail'&&!narrowRails)assert(panel.extent<=Compact.compactSize(axis,name)+tolerance,'Embedded Compact slots never freely grow with saved shares');
    const gridFits=axis==='vertical'?crossSize>=240:panel.extent>=160&&crossSize>=120;
    assert.equal(panel.compactGrid,gridFits&&panel.state==='rail');
    edge=panel.offset+panel.extent+(index<names.length-1?gap:0);
  }
  if(narrowRails||names.some(name=>result[name].state==='expanded')||names.length===1)assert(Math.abs(edge-extent)<tolerance,'Expanded peers and whole narrow Compact docks consume the remaining space');
  allocationCount++;return result;
}
const allNames=['apps','projects','systems','ai'];
const fullStates=Object.fromEntries(allNames.map(name=>[name,'expanded']));
assert.equal(Compact.thresholds.resistance,48);
assert.equal(Compact.expandedMinimum('vertical','systems'),280,'Expanded System has room beyond its 208px Compact slot');
result=allocated({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},axis:'vertical',crossSize:280,extent:900});
assert.deepEqual(result,{apps:{offset:0,extent:692,state:'expanded',compactGrid:false},systems:{offset:692,extent:208,state:'rail',compactGrid:true}});
for(const shares of [{apps:2,systems:1},{apps:1,systems:9},{apps:1e308,systems:1}]){
  result=allocated({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},axis:'vertical',crossSize:280,extent:4000,shares});
  assert.equal(result.systems.extent,208,'Compact System is a fixed slot regardless of requested proportions');
}
result=allocated({names:['apps','systems'],states:fullStates,axis:'vertical',crossSize:280,extent:800,shares:{apps:1,systems:9}});
assert.equal(result.apps.extent,184);assert.equal(result.apps.state,'rail');assert.equal(result.systems.extent,616);
result=allocated({names:['apps','systems'],states:fullStates,axis:'vertical',crossSize:280,extent:4000,shares:{apps:1,systems:9}});
near(result.apps.extent,400);assert.equal(result.apps.state,'expanded','A preferred Expanded panel returns when its saved proportion fits');
result=allocated({names:['projects','ai'],states:fullStates,axis:'horizontal',crossSize:180,extent:1000,shares:{projects:1,ai:3}});
assert.equal(result.projects.extent,196);assert.equal(result.projects.state,'rail');assert.equal(result.ai.extent,804);
assert.equal(result.projects.compactGrid,true);
result=allocated({names:['projects','ai'],states:fullStates,axis:'horizontal',crossSize:180,extent:1400,shares:{projects:1,ai:3}});
assert.equal(result.projects.extent,350);assert.equal(result.projects.state,'expanded');
result=allocated({names:['apps','projects'],states:fullStates,axis:'vertical',crossSize:280,extent:650,shares:{apps:1,projects:1}});
assert.equal(result.apps.extent,184);assert.equal(result.projects.extent,466,'An undersized preference snaps Compact while its peer receives spare room');
result=allocated({names:allNames,states:Object.fromEntries(allNames.map(name=>[name,'rail'])),axis:'vertical',crossSize:280,extent:1200,gap:8,shares:{apps:1,projects:5,systems:1,ai:9}});
assert.deepEqual(allNames.map(name=>result[name].extent),[184,100,208,100]);
assert.equal(result.ai.offset+result.ai.extent,616,'An all-Compact group leaves unused room rather than stretching tiny panels');
// A Compact card below Expanded Apps becomes a regular rail when the whole
// column collapses. Both Areas must still occupy the complete dock, rather
// than retaining two short card slots with most of the column left empty.
const screenshotMixed=allocated({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},axis:'vertical',crossSize:300,extent:900});
const screenshotShares=Object.fromEntries(Object.entries(screenshotMixed).map(([name,panel])=>[name,panel.extent]));
result=allocated({names:['apps','systems'],states:{apps:'rail',systems:'rail'},axis:'vertical',crossSize:70,extent:900,shares:screenshotShares});
assert.deepEqual(result,{apps:{offset:0,extent:692,state:'rail',compactGrid:false},systems:{offset:692,extent:208,state:'rail',compactGrid:false}},'Collapsing the whole mixed panel preserves its split as full-length Compact rails');
result=allocated({names:['apps','systems'],states:{apps:'rail',systems:'rail'},axis:'vertical',crossSize:70,extent:900});
assert.equal(result.apps.extent,450);assert.equal(result.systems.extent,450,'Narrow Compact rails without saved shares divide the whole lane equally');
for(const axis of ['vertical','horizontal']){
  for(const name of allNames){
    assert(Compact.compactSize(axis,name)<Compact.expandedMinimum(axis,name),'Every Compact slot is smaller than its Expanded content minimum');
    for(const offset of [-1,0,1]){
      const extent=Compact.expandedMinimum(axis,name)+offset;
      result=allocated({names:[name],states:fullStates,axis,crossSize:300,extent,shares:{[name]:1}});
      assert.equal(result[name].extent,extent,'A lone Area occupies the entire dock rather than one shared slot');
      assert.equal(result[name].state,offset<0?'rail':'expanded');
    }
  }
  result=allocated({names:['apps','systems'],states:fullStates,axis,crossSize:300,extent:1000,shares:{apps:1e-20,systems:1}});
  assert.equal(result.apps.extent,Compact.compactSize(axis,'apps'));
  result=allocated({names:['apps','systems'],states:fullStates,axis,crossSize:300,extent:100,shares:{apps:1,systems:99}});
  near(result.apps.extent/result.systems.extent,Compact.compactSize(axis,'apps')/Compact.compactSize(axis,'systems'));
  near(result.apps.extent+result.systems.extent,100,'Only an undersized physical dock scales fixed Compact slots');
}
function permutations(values){
  return values.length?values.flatMap((value,index)=>permutations(values.filter((_,other)=>index!==other)).map(rest=>[value,...rest])):[[]];
}
const shares={apps:1,projects:2,systems:3,ai:4};
for(const names of permutations(allNames))for(const axis of ['vertical','horizontal']){
  const states=Object.fromEntries(names.map(name=>[name,'rail']));
  const threshold=axis==='vertical'?240:120;
  const fixedTotal=names.reduce((sum,name)=>sum+Compact.compactSize(axis,name),0);
  for(const crossSize of [0,threshold-1,threshold,threshold+1])for(const extent of [0,1,400,1200,2400])for(const gap of [0,8]){
    result=allocated({names,states,axis,crossSize,extent,gap,shares});
    const usable=Math.max(0,extent-Math.min(gap,extent/(names.length-1))*(names.length-1));
    if(crossSize<threshold&&usable>=fixedTotal){
      for(const name of names)assert(result[name].extent+1e-7>=Compact.compactSize(axis,name),'A narrow rail keeps its controls usable when the physical lane has room');
      if(extent===2400&&gap===0)for(const name of names)near(result[name].extent,shares[name]/10*extent);
    }else if(crossSize>=threshold&&usable>=fixedTotal){
      for(const name of names)assert.equal(result[name].extent,Compact.compactSize(axis,name),'Wide all-Compact cards retain their fixed slots');
    }
  }
  for(const preference of [null,{},Object.fromEntries(names.map(name=>[name,1])),Object.fromEntries(names.map((name,index)=>[name,index?1:1e308]))]){
    result=allocated({names,states,axis,crossSize:threshold-1,extent:2400,shares:preference});
    if(preference===null||!Object.keys(preference).length)for(const name of names)near(result[name].extent,600);
  }
}
for(const names of permutations(allNames))for(const axis of ['vertical','horizontal'])for(let mask=0;mask<16;mask++){
  const states=Object.fromEntries(names.map((name,index)=>[name,mask&(1<<index)?'rail':'expanded']));
  for(const extent of [1,450,2400])allocated({names,states,axis,crossSize:300,extent,gap:8,shares});
}
for(const axis of ['vertical','horizontal'])for(const extent of [0,1,32,500,1e308])for(const gap of [0,8,1e308]){
  allocated({names:allNames,states:fullStates,axis,crossSize:300,extent,gap,shares:{apps:Number.MIN_VALUE,projects:1,systems:1e308,ai:2}});
}
for(const shares of [null,{},'broken',{apps:1},{apps:1,systems:0},{apps:1,systems:-1},{apps:1,systems:NaN},{apps:1,systems:Infinity},{apps:1,systems:'2'},Object.create({apps:1,systems:1})]){
  result=allocated({names:['apps','systems'],states:{apps:'expanded',systems:'rail'},axis:'vertical',crossSize:280,extent:900,shares});
  assert.equal(result.apps.extent,692);assert.equal(result.systems.extent,208,'Malformed saved shares use useful defaults');
}
for(const axis of ['vertical','horizontal'])for(const crossSize of [0,70,239,240,320])allocated({names:['apps','systems'],states:fullStates,axis,crossSize,extent:300,shares:{apps:1,systems:1}});
for(const name of allNames)for(const extent of [159,160,200])for(const crossSize of [64,119,120,250]){
  result=allocated({names:[name],states:fullStates,axis:'horizontal',crossSize,extent});
  assert.equal(result[name].compactGrid,extent>=160&&crossSize>=120);
}
allocated({names:['apps','apps','systems',null,''],states:fullStates,axis:'vertical',crossSize:300,extent:900,shares:{apps:1,systems:2}});
allocated({names:['apps','systems'],states:null,axis:'unknown',crossSize:Infinity,extent:NaN,gap:-5,shares:{apps:1,systems:2}});
assert.deepEqual(Compact.allocate(),{});assert.deepEqual(Compact.allocate(null),{});
result=Compact.allocate({names:['__proto__','apps'],states:fullStates,axis:'vertical',crossSize:300,extent:900,shares:JSON.parse('{"__proto__":1,"apps":1}')});
assert.equal(Object.getPrototypeOf(result),Object.prototype);assert.equal(Object.hasOwn(result,'__proto__'),true);
assert.equal(Compact.expandedMinimum('horizontal','__proto__'),300);
assert.equal(Compact.compactSize('horizontal','__proto__'),196);
assert.equal(typeof sandbox.SpatialCompactAreas.allocate,'function');
console.log('Constrained Area allocation: '+allocationCount+' embedded fixed-slot, full narrow rail, orientation, permutation, minimum-size, fit/restore, tiny viewport and invalid-state scenarios passed.');

let resizeCount=0;
function resized(input){
  const before=JSON.stringify(input),result=Compact.resizePair(input);
  assert.equal(JSON.stringify(input),before,'Pointer proposals do not mutate saved states, sizes or remembered Expanded sizes');
  assert.notEqual(result.sizes,input.sizes);assert.notEqual(result.states,input.states);
  near(result.sizes[input.first]+result.sizes[input.second],input.sizes[input.first]+input.sizes[input.second]);
  assert(result.pressure>=0&&result.pressure<=1);assert.equal(typeof result.blocked,'boolean');
  for(const size of Object.values(result.sizes))assert(Number.isFinite(size)&&size>=0);
  assert.equal(result.sizes.unrelated,173,'Other Areas are untouched by a pair proposal');
  assert.equal(result.states.unrelated,'expanded');
  resizeCount++;return result;
}
for(const axis of ['vertical','horizontal'])for(const first of allNames)for(const second of allNames.filter(name=>name!==first))for(const direction of [-1,1]){
  const minFirst=Compact.expandedMinimum(axis,first),minSecond=Compact.expandedMinimum(axis,second);
  const sizes={[first]:minFirst+100,[second]:minSecond+100,unrelated:173},states={[first]:'expanded',[second]:'expanded',unrelated:'expanded'};
  const shrinking=direction>0?second:first,growing=direction>0?first:second;
  const input={axis,first,second,sizes,states,crossSize:320};
  result=resized({...input,delta:0});assert.deepEqual(result.sizes,sizes);assert.deepEqual(result.states,states);
  result=resized({...input,delta:direction*20});near(result.sizes[shrinking],sizes[shrinking]-20);assert.equal(result.pressure,0);
  result=resized({...input,delta:direction*100});near(result.sizes[shrinking],Compact.expandedMinimum(axis,shrinking));assert.equal(result.pressure,0);
  result=resized({...input,delta:direction*124});near(result.sizes[shrinking],Compact.expandedMinimum(axis,shrinking));assert.equal(result.pressure,0.5);assert.equal(result.blocked,true);assert.equal(result.snapped,undefined);
  result=resized({...input,delta:direction*147.999});assert.equal(result.states[shrinking],'expanded','Nearly crossing resistance must not snap');
  result=resized({...input,delta:direction*148});assert.equal(result.states[shrinking],'rail');assert.equal(result.sizes[shrinking],Compact.compactSize(axis,shrinking));assert.equal(result.snapped,shrinking);
  const afterSnap={...input,sizes:result.sizes,states:result.states,expanded:sizes};
  result=resized({...afterSnap,delta:-direction*24});assert.deepEqual(result.sizes,afterSnap.sizes);assert.equal(result.pressure,0.5,'A reverse drag needs fresh pressure beyond its new Compact edge');
  result=resized({...afterSnap,delta:-direction*48});assert.equal(result.states[shrinking],'expanded');assert.equal(result.snapped,shrinking);assert.equal(result.sizes[shrinking],sizes[shrinking],'Expanding restores the remembered Expanded extent when its peer can fit');
  result=resized({...afterSnap,delta:direction*500});assert.deepEqual(result.sizes,afterSnap.sizes,'Shrinking Compact cannot resize its fixed slot');assert.equal(result.blocked,true);
  result=resized({...afterSnap,delta:-direction*48,crossMinimums:{[shrinking]:400}});assert.equal(result.states[shrinking],'rail');assert.equal(result.blocked,true);assert.equal(result.expand,shrinking,'The caller can request space from other dock peers after the threshold');
  const compactSizes={[first]:Compact.compactSize(axis,first),[second]:Compact.compactSize(axis,second),unrelated:173};
  const compactStates={[first]:'rail',[second]:'rail',unrelated:'expanded'};
  result=resized({...input,sizes:compactSizes,states:compactStates,delta:direction*48});assert.deepEqual(result.sizes,compactSizes);assert.equal(result.blocked,true);assert.equal(result.expand,growing,'Two Compact slots request global space without freely stretching');
  const blockedSizes={[first]:Compact.compactSize(axis,first),[second]:minSecond,unrelated:173};
  result=resized({...input,sizes:blockedSizes,states:{...states,[first]:'rail'},delta:48});assert.deepEqual(result.sizes,blockedSizes);assert.equal(result.expand,first);assert.equal(result.blocked,true);
}
// A whole Compact dock has continuous sibling resizing, with hard control
// minima. Neither the old48px threshold nor a large overshoot can expand it.
for(const axis of ['vertical','horizontal'])for(const first of allNames)for(const second of allNames.filter(name=>name!==first)){
  const minFirst=Compact.compactSize(axis,first),minSecond=Compact.compactSize(axis,second);
  const sizes={[first]:minFirst+200,[second]:minSecond+200,unrelated:173};
  const states={[first]:'rail',[second]:'rail',unrelated:'expanded'},total=sizes[first]+sizes[second];
  for(const delta of [0,1,-1,16,-16,47,-47,48,-48,49,-49,200,-200,10000,-10000]){
    result=resized({axis,first,second,sizes,states,delta,compactDock:true,crossSize:70});
    const expected=Math.min(total-minSecond,Math.max(minFirst,sizes[first]+delta));
    near(result.sizes[first],expected);near(result.sizes[second],total-expected);
    assert.deepEqual(result.states,states,'Whole Compact dock divider never changes presentation');
    assert.equal(result.expand,undefined);assert.equal(result.snapped,undefined);assert.equal(result.pressure,0);
    assert.equal(result.blocked,expected!==sizes[first]+delta);
    assert(result.sizes[first]>=minFirst&&result.sizes[second]>=minSecond,'Both Compact control minima remain usable');
  }
  const constrained={[first]:minFirst/2,[second]:minSecond/2,unrelated:173};
  for(const delta of [-1000,48,1000]){
    result=resized({axis,first,second,sizes:constrained,states,delta,compactDock:true,crossSize:70});
    assert.deepEqual(result.sizes,constrained,'A physically undersized Compact pair cannot create invalid peer geometry');
    assert.equal(result.expand,undefined);assert.equal(result.snapped,undefined);assert.equal(result.pressure,0);assert.equal(result.blocked,true);
  }
}
for(const state of ['expanded','rail'])for(const axis of ['vertical','horizontal'])for(const name of allNames){
  const minimum=Compact.expandedMinimum(axis,name),compact=Compact.compactSize(axis,name),maximum=1000;
  let thickness=Compact.resizeThickness({state,requested:state==='rail'?compact:minimum,minimum,compact,maximum});
  assert.equal(thickness.size,state==='rail'?compact:minimum);assert.equal(thickness.pressure,0);
  if(state==='expanded'){
    thickness=Compact.resizeThickness({state,requested:minimum-24,minimum,compact,maximum});assert.equal(thickness.size,minimum);assert.equal(thickness.pressure,.5);assert.equal(thickness.state,'expanded');
    thickness=Compact.resizeThickness({state,requested:minimum-48,minimum,compact,maximum});assert.equal(thickness.size,compact);assert.equal(thickness.state,'rail');assert.equal(thickness.snapped,true);
    for(const constrainedMaximum of [minimum-1,compact-1,0]){
      thickness=Compact.resizeThickness({state,requested:minimum+100,minimum,compact,maximum:constrainedMaximum});
      assert.equal(thickness.size,Math.min(compact,constrainedMaximum));assert.equal(thickness.state,'rail','A physical dock limit never produces Expanded below its content minimum');
      assert.equal(thickness.blocked,true);assert.equal(thickness.snapped,undefined,'Viewport constraints are not a pointer-driven snap');
    }
  }else{
    for(const requested of [compact-100,compact,compact+47.999]){
      thickness=Compact.resizeThickness({state,requested,minimum,compact,maximum});assert.equal(thickness.size,compact);assert.equal(thickness.state,'rail','A Compact outer edge only snaps, never resizes');
    }
    thickness=Compact.resizeThickness({state,requested:compact+48,minimum,compact,maximum,restore:minimum+50});assert.equal(thickness.size,minimum+50);assert.equal(thickness.state,'expanded');
    thickness=Compact.resizeThickness({state,requested:compact+48,minimum,compact,maximum:minimum-1});assert.equal(thickness.size,compact);assert.equal(thickness.state,'rail');assert.equal(thickness.expand,true);assert.equal(thickness.blocked,true);
  }
}
for(const axis of ['vertical','horizontal'])for(const delta of [-48,0,48]){
  const sizes={apps:40,systems:60,unrelated:173},states={apps:'rail',systems:'rail',unrelated:'expanded'};
  result=resized({axis,first:'apps',second:'systems',sizes,states,delta,crossSize:300});
  assert.deepEqual(result.sizes,sizes,'A physically constrained dock cannot be stretched into invalid negative peer geometry');
}
for(const sizes of [{apps:10,systems:20},{apps:1e308,systems:1e308}]){
  result=Compact.resizePair({axis:'vertical',first:'apps',second:'systems',sizes,states:{apps:'expanded',systems:'expanded'},delta:48});
  assert.deepEqual(result.sizes,sizes,'An invalid Expanded snapshot blocks a gesture until normal constraint allocation runs');
  assert.equal(result.blocked,true);
}
assert.equal(typeof sandbox.SpatialCompactAreas.resizePair,'function');assert.equal(typeof sandbox.SpatialCompactAreas.resizeThickness,'function');
assert.equal(typeof sandbox.SpatialCompactAreas.compactSize,'function');
console.log('Area snap resistance: '+resizeCount+' pair proposals across every Area/orientation/direction, fixed Compact slots, continuous whole-Compact sharing, remembered restore, cross-axis constraints and matching outer-edge hysteresis passed.');
