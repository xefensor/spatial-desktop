const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const MapModel=require('../dist/app-spatial-map.js');
const rect=(id,x,y,width,height,other={})=>({id,x,y,width,height,...other});
const cell=(id,column,row,columnSpan=1,rowSpan=1)=>({id,column,row,columnSpan,rowSpan});
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-9,`${actual} is near ${expected}`);

function checked(input){
  const original=JSON.stringify(input),result=MapModel.layout(input);
  assert.equal(JSON.stringify(input),original,'Reading geometry never changes window state');
  const actual=[...result.cells.map(entry=>entry.id),...result.fallback];
  const expected=[...new Set(input.filter(entry=>entry&&typeof entry==='object'&&(typeof entry.id==='string'||typeof entry.id==='number'&&Number.isFinite(entry.id))).map(entry=>String(entry.id)))];
  assert.deepEqual([...actual].sort(),expected.sort(),'Every identifiable app appears exactly once');
  for(const axis of ['columns','rows']){
    assert(result[axis].every(weight=>Number.isFinite(weight)&&weight>0),'Tracks have positive finite sizes');
    if(result[axis].length)near(result[axis].reduce((sum,value)=>sum+value,0),1);
  }
  for(const a of result.cells){
    for(const name of ['column','row','columnSpan','rowSpan'])assert(Number.isInteger(a[name])&&a[name]>0,'Cells use positive CSS-grid indices and spans');
    assert(a.column+a.columnSpan-1<=result.columns.length&&a.row+a.rowSpan-1<=result.rows.length,'Every target fits its grid');
    for(const b of result.cells){
      if(a===b)continue;
      assert(!(a.column<b.column+b.columnSpan&&a.column+a.columnSpan>b.column&&a.row<b.row+b.rowSpan&&a.row+a.rowSpan>b.row),'App targets never overlap');
    }
  }
  return result;
}

let result=checked([rect('left',100,60,492,600),rect('right',600,60,492,600)]);
assert.deepEqual(result.cells,[cell('left',1,1),cell('right',2,1)],'Side-by-side windows stay side by side');
assert.equal(result.rows.length,1);near(result.columns[0],.5);
result=checked([rect('top',40,80,1000,292),rect('bottom',40,380,1000,292)]);
assert.deepEqual(result.cells,[cell('top',1,1),cell('bottom',1,2)],'Stacked windows stay stacked');
assert.equal(result.columns.length,1);near(result.rows[0],.5);
result=checked([rect('a',0,0,492,292),rect('b',500,0,492,292),rect('c',0,300,492,292),rect('d',500,300,492,292)]);
assert.deepEqual(result.cells,[cell('a',1,1),cell('b',2,1),cell('c',1,2),cell('d',2,2)],'A 2×2 layout remains a 2×2 map');
assert.equal(result.columns.length,2);assert.equal(result.rows.length,2);
result=checked([rect('tall',10,10,392,600),rect('top',410,10,592,192),rect('bottom',410,210,592,400)]);
assert.deepEqual(result.cells,[cell('tall',1,1,1,2),cell('top',2,1),cell('bottom',2,2)],'A full-height tile spans both right-hand rows');
near(result.columns[0],396/992);near(result.rows[0],196/600);
result=checked([rect('left-top',0,0,492,192),rect('right-top',500,0,492,292),rect('left-bottom',0,200,492,400),rect('right-bottom',500,300,492,300)]);
assert.deepEqual(result.cells,[cell('left-top',1,1),cell('right-top',2,1,1,2),cell('left-bottom',1,2,1,2),cell('right-bottom',2,3)],'Independent split heights retain different row spans');
assert.equal(result.rows.length,3);

result=checked([rect('first',400,600,100,100),rect('second',700,600,100,100)]);
assert.deepEqual(result.cells,[cell('first',1,1),cell('second',3,1)],'A real internal empty lane remains empty');
assert.equal(result.columns.length,3);near(result.columns[1],.5);
result=checked([rect('only',200,900,320,180)]);
assert.deepEqual(result,{columns:[1],rows:[1],cells:[cell('only',1,1)],fallback:[]},'Outer canvas space is trimmed');
result=checked([rect('tiny-left',0,0,4,4),rect('tiny-right',5,0,4,4)]);
assert.deepEqual(result.cells,[cell('tiny-left',1,1),cell('tiny-right',2,1)],'The gutter tolerance adapts to tiny windows');
result=checked([rect('a',0,0,100,100),rect('b',108,0,100,100),rect('c',0,108,100,100),rect('d',108,110,100,98)]);
assert.equal(result.rows.length,2,'Minor settled edge differences share a row boundary');
assert.equal(result.columns.length,2);

result=checked([rect('one',0,0,200,200),rect('overlap',150,100,200,200),rect('valid',400,0,100,300),rect('float',430,20,200,200,{floating:true})]);
assert.deepEqual(result.cells,[cell('valid',1,1)],'Unrelated tiles remain usable next to overlapping and floating windows');
assert.deepEqual(result.fallback,['one','overlap','float']);
result=checked([rect('edge-a',0,0,100,100),rect('edge-b',100,0,100,100)]);
assert.equal(result.cells.length,2,'Touching edges are not overlapping windows');
result=checked([
  rect('zero',0,0,0,10),rect('negative',0,0,10,-1),rect('nan',NaN,0,10,10),
  rect('infinite',0,0,Infinity,10),{id:'missing'},rect('string','5',0,10,10),
  rect('unrepresentable',1e300,0,1,10),rect('overflow',1e308,0,1e308,10),
  rect('good',5,5,10,10)
]);
assert.deepEqual(result.cells,[cell('good',1,1)]);
assert.equal(result.fallback.length,8,'Bad geometry stays accessible through fallback');
result=checked([rect('left',-1e308,0,1e307,100),rect('right',9e307,0,1e307,100)]);
assert.equal(result.cells.length,0,'An unrepresentable total coordinate span falls back safely');
assert.deepEqual(MapModel.layout(null),{columns:[],rows:[],cells:[],fallback:[]});
assert.deepEqual(MapModel.layout({}),{columns:[],rows:[],cells:[],fallback:[]});
checked([null,{},rect('same',0,0,10,10),rect('same',100,100,10,10),rect(0,20,0,10,10),rect('<img src=x onerror=alert(1)>',40,0,10,10)]);

// Run the actual browser export without a DOM: opaque IDs require no HTML,
// selector escaping or document access in the model itself.
const sandbox={};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/app-spatial-map.js'),'utf8'),sandbox);
assert.equal(typeof sandbox.SpatialAppMap.layout,'function');
assert.equal(sandbox.SpatialAppMap.layout([rect('<script>bad()</script>',0,0,100,100)]).cells[0].id,'<script>bad()</script>');
console.log('Apps spatial map: split topology, proportions, independent rows, gaps, tiny windows, overlap, floating and invalid geometry checks passed.');

// Exercise the production desktop adapter with its real geometry model. The
// small DOM preserves button identity, parentage, focus and style-write counts.
const shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const adapterSource=shell.slice(shell.indexOf('function syncRackSpatialLayout(names) {'),shell.indexOf('\nfunction renderInstanceRack()',shell.indexOf('function syncRackSpatialLayout(names) {')));
assert(adapterSource.startsWith('function syncRackSpatialLayout'),'The production adapter is present');
let styleWrites=0,moves=0;
function style(values={}){
  return new Proxy({...values,setProperty(name,value){this[name]=String(value);}},{set(target,name,value){styleWrites++;target[name]=value;return true;}});
}
const fakeDocument={activeElement:null};
class Element {
  constructor(name,dataset={}){this.name=name;this.dataset={...dataset};this.style=style();this.children=[];this.parentElement=null;this.hidden=false;}
  append(child){
    if(child.parentElement)child.parentElement.children.splice(child.parentElement.children.indexOf(child),1);
    child.parentElement=this;this.children.push(child);moves++;
    if(fakeDocument.activeElement===child)fakeDocument.activeElement=null;
  }
  contains(child){return this===child||this.children.some(item=>item.contains(child));}
  focus(options){assert.equal(options.preventScroll,true,'Restoring focus does not scroll the Apps Area');fakeDocument.activeElement=this;}
}
const rack=new Element('rack'),group=new Element('open'),tiles=new Element('tiles'),extra=new Element('extra'),parkedGroup=new Element('parked');
rack.append(group);rack.append(parkedGroup);group.append(tiles);group.append(extra);
const names=['left-top','right-top','left-bottom','right-bottom','parked'];
const buttons=Object.fromEntries(names.map((name,index)=>[name,new Element(name,{openApp:name,hotbarSlot:String(index+1),originalShortcut:'Meta+'+(index+1)})]));
names.forEach(name=>(name==='parked'?parkedGroup:tiles).append(buttons[name]));
const originalButtons={...buttons},originalDatasets=Object.fromEntries(names.map(name=>[name,JSON.stringify(buttons[name].dataset)]));
const appState=Object.fromEntries(names.map(name=>[name,name==='parked'?'minimized':'open']));
let frameReads=[];
function frame(x,y,width,height){
  const classes=new Set();
  return {style:{left:x+'px',top:y+'px',width:width+'px',height:height+'px'},classes,
    classList:{contains:value=>classes.has(value)},
    parentElement:{getBoundingClientRect:()=>({left:80,top:40})},
    // Intentionally overlapping, stale animation positions: only settled inline
    // pixel geometry gives the correct four-window spatial map.
    getBoundingClientRect:()=>({left:500,top:500,width:20,height:20})};
}
const frames={
  'left-top':frame(0,0,392,292),'right-top':frame(400,0,592,292),
  'left-bottom':frame(0,300,392,300),'right-bottom':frame(400,300,592,300)
};
const descendants=node=>node.children.flatMap(child=>[child,...descendants(child)]);
const environment={SpatialAppMap:MapModel,document:fakeDocument,appState,
  frameFor(name){frameReads.push(name);assert.notEqual(name,'parked','Parked app geometry never enters the open-window map');return frames[name];},
  $(selector,parent){
    if(selector==='#appRack')return rack;
    if(selector==='.app-rack-open'&&parent===rack)return group;
    if(selector==='.app-map-tiles'&&parent===group)return tiles;
    if(selector==='.app-map-extra'&&parent===group)return extra;
    throw new Error('Unexpected selector '+selector);
  },
  $$(selector,parent){assert.equal(selector,'[data-open-app]');assert.equal(parent,group);return descendants(parent).filter(node=>node.dataset.openApp);}
};
vm.runInNewContext(adapterSource,environment);
const sync=()=>environment.syncRackSpatialLayout(names);
sync();
assert.equal(tiles.hidden,false);assert.equal(extra.hidden,true);
assert.equal(tiles.style['--app-map-columns'],'2');assert.equal(tiles.style['--app-map-rows'],'2');
assert.equal(buttons['left-top'].style.gridColumn,'1 / span 1');
assert.equal(buttons['left-top'].style.gridRow,'1 / span 1');
assert.equal(buttons['right-bottom'].style.gridColumn,'2 / span 1');
assert.equal(buttons['right-bottom'].style.gridRow,'2 / span 1');
assert.match(tiles.style.gridTemplateColumns,/^minmax\(56px,0\.399/,'Settled inline widths determine the unequal column proportions');
assert.equal(frameReads.length,4);assert.equal(buttons.parked.parentElement,parkedGroup);
assert.deepEqual(Object.keys(buttons.parked.style),['setProperty'],'Parked buttons receive no spatial grid styling');

const initialColumns=tiles.style.gridTemplateColumns,initialRows=tiles.style.gridTemplateRows;
const beforeResizeMoves=moves;
// A divider moves without changing shortcut order. The left and right columns
// now have independent split heights, requiring three tracks and spanning cells.
frames['right-top'].style.height='192px';frames['right-bottom'].style.top='200px';frames['right-bottom'].style.height='400px';
sync();
assert.equal(moves,beforeResizeMoves,'A geometry-only resize preserves every existing button in place');
assert.equal(tiles.style.gridTemplateColumns,initialColumns);
assert.notEqual(tiles.style.gridTemplateRows,initialRows,'A divider resize updates row proportions even when shortcut order is unchanged');
assert.equal(tiles.style['--app-map-rows'],'3');
assert.equal(buttons['left-top'].style.gridRow,'1 / span 2');
assert.equal(buttons['right-top'].style.gridRow,'1 / span 1');
assert.equal(buttons['left-bottom'].style.gridRow,'3 / span 1');
assert.equal(buttons['right-bottom'].style.gridRow,'2 / span 2');
for(const name of names){
  assert.equal(buttons[name],originalButtons[name],'Spatial updates preserve the real button');
  assert.equal(JSON.stringify(buttons[name].dataset),originalDatasets[name],'Spatial placement preserves original shortcut datasets');
}
const beforeStableWrites=styleWrites,beforeStableMoves=moves;
sync();
assert.equal(styleWrites,beforeStableWrites,'Unchanged geometry avoids unnecessary style writes');
assert.equal(moves,beforeStableMoves,'Unchanged geometry avoids unnecessary DOM moves');

frames['right-top'].classes.add('is-floating');
frames['right-top'].style.left='600px';frames['right-top'].style.top='60px';
fakeDocument.activeElement=buttons['right-top'];
sync();
assert.equal(buttons['right-top'].parentElement,extra,'A moved floating app uses the separate reachable strip');
assert.equal(extra.hidden,false);assert.equal(extra.children.length,1);
assert.equal(buttons['right-top'].style.gridColumn,'');assert.equal(buttons['right-top'].style.gridRow,'');
assert.equal(fakeDocument.activeElement,buttons['right-top'],'Moving a focused app preserves keyboard reachability');
assert.equal(tiles.children.length,3,'Tiled targets remain distinct from the floating strip');
assert.equal(buttons.parked.parentElement,parkedGroup,'Parked apps remain outside both open-window regions');
const floatingMoves=moves;
frames['right-top'].style.left='650px';sync();
assert.equal(moves,floatingMoves,'Moving an already separated float does not unnecessarily move its button again');
frames['right-top'].classes.delete('is-floating');frames['right-top'].style.left='400px';frames['right-top'].style.top='0px';
sync();
assert.equal(buttons['right-top'].parentElement,tiles,'A returned tile reuses the original button in the map');
assert.equal(extra.hidden,true);assert.equal(extra.children.length,0);
assert.equal(buttons['right-top'].style.gridColumn,'2 / span 1');
for(const name of names)assert.equal(JSON.stringify(buttons[name].dataset),originalDatasets[name]);
console.log('Apps spatial adapter: settled geometry, divider-only resize, unchanged button identity and shortcuts, parked isolation, float routing, focus and no-op updates passed.');
