const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../dist/timeline.js');
const model=T.create();
const event=(id,time=10000,workspace='general',extra={})=>({id,time,workspace,type:'app.open',title:'Files',app:'dolphin',base:'dolphin',project:'site',projectName:'Website',page:1,...extra});
model.add(event('a'));model.add(event('b',11000));
assert.equal(model.list('general').length,1,'Repeated action bursts coalesce');
model.add(event('c',15000));model.add(event('d',16000,'work'));
assert.equal(model.list('general').length,2);assert.equal(model.list('work').length,1,'Workspaces have separate histories');
assert.equal(model.list('general',{query:'website'}).length,2);
assert.equal(model.list('general',{type:'browser'}).length,0);
assert.equal(model.add(event('bad',NaN)),null);assert.equal(model.add(event('bad',1,'general',{type:'keystroke'})),null);
assert.deepEqual(T.create(model.snapshot()).snapshot(),model.snapshot(),'Reload preserves context and timestamps');
const other=T.create(model.snapshot());other.add(event('other',20000));model.merge(other.snapshot());model.merge(other.snapshot());
assert.equal(model.list('general').length,3,'Concurrent displays merge without duplicate event IDs');
for(let i=0;i<400;i++)model.add(event('bounded-'+i,30000+i*4000,'work'));
assert.equal(model.list('work').length,T.limit,'History stays bounded');
assert.equal(model.list('work')[0].id,'bounded-399','Newest events survive trimming');
assert.equal(T.neighbour('timeline',-1),'system');assert.equal(T.neighbour('system',1),'timeline');
assert.equal(T.neighbour('apps',1,['apps','projects']),'projects');

// Execute the actual carousel and timeline adapter, with a small DOM geometry model.
const nodes=new Map(),make=(key)=>{
  if(nodes.has(key))return nodes.get(key);
  const n={key,value:'',hidden:false,inert:false,dataset:{},attrs:{},style:{},textContent:'',innerHTML:'',listeners:{},
    classList:{add(){},remove(){},toggle(){},contains:()=>false},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;}};
  nodes.set(key,n);return n;
};
const panelNodes=T.sections.map(id=>{const n=make(id);n.dataset.overviewPanel=id;n.offsetWidth=800;return n;});
const track=make('#overviewSectionTrack');Object.assign(track,{clientWidth:1000,scrollLeft:0,children:[...panelNodes],
  prepend(n){this.children=this.children.filter(x=>x!==n);this.children.unshift(n);},
  append(n){this.children=this.children.filter(x=>x!==n);this.children.push(n);},scrollTo({left}){this.scrollLeft=left;}});
panelNodes.forEach(n=>Object.defineProperty(n,'offsetLeft',{get:()=>100+track.children.indexOf(n)*824}));
const tabs=T.sections.map(id=>{const n=make('tab:'+id);n.dataset.overviewSection=id;return n;});
const edges=[-1,1].map(direction=>{const n=make('edge:'+direction);n.dataset.overviewStep=String(direction);return n;});
make('#timelineType').value='all';
const data=new Map(),pending=[],calls=[];
const context={SpatialTimeline:T,activeWorkspace:'general',desktopSyncApplying:false,desktopPageAnimating:false,
  appInfo:{dolphin:{label:'Files',base:'dolphin'}},appState:{dolphin:'open'},windowMembership:{general:{dolphin:'site'}},
  workspaceProfiles:{general:{label:'General'},work:{label:'Work'}},projectSpaces:{site:{name:'Website',accent:'#22bb66'}},workspaceContent:{},
  desktopPages:{column:()=>context.column||'site',columnOf:()=>context.column||'site',current:()=>1,pageOf:()=>1,last:()=>2},
  desktopStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)},
  $:(key,scope)=>key==='span'&&scope?make(scope.key+':span'):make(key),
  $$:key=>key==='[data-overview-panel]'?panelNodes:key==='[data-overview-section]'?tabs:key==='[data-overview-step]'?edges:[],
  escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
  icon:name=>'<svg>'+name+'</svg>',appArt:()=>'<svg>app</svg>',prepareControlSemantics(){},
  requestAnimationFrame:fn=>fn(),ResizeObserver:class{observe(){}},setTimeout:fn=>{pending.push(fn);return pending.length;},clearTimeout(){},
  window:{matchMedia:()=>({matches:true}),addEventListener(){}},
  setUniversalSearchOpen:open=>calls.push(['overview',open]),openProjectNames:()=>['site'],
  activateProject:name=>{context.column=name;calls.push(['activate',name]);},changeDesktopColumn:name=>{context.column=name;calls.push(['column',name]);},
  changeDesktopPage:page=>calls.push(['page',page]),createAppInstance:base=>{calls.push(['instance',base]);return base;},
  openApp:app=>calls.push(['open',app]),navigateBrowser:(app,address)=>calls.push(['browser',app,address]),
  renderFileLocation:(app,path)=>calls.push(['folder',app,path]),openAppFile:(app,name)=>calls.push(['file',app,name])
};
vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../dist/overview-desktop.js'),'utf8'),context);
const overview=context.SpatialOverviewDesktop,timeline=context.SpatialTimelineDesktop;
for(const id of ['timeline','system','projects','apps','timeline','apps']){
  overview.select(id,false);
  const current=panelNodes.find(n=>n.dataset.overviewPanel===id),index=track.children.indexOf(current);
  assert(index>0&&index<track.children.length-1,'Both real neighbours stay visible for '+id);
  assert.equal(track.children.length,4,'Controls are rotated, not duplicated');
  assert.equal(track.scrollLeft,current.offsetLeft+current.offsetWidth/2-track.clientWidth/2,'Selected panel is centred');
  assert.equal(current.inert,false);assert(panelNodes.filter(n=>n!==current).every(n=>n.inert),'Preview controls stay out of keyboard focus');
}
overview.select('timeline',true);
const selectedTimeline=panelNodes[0],finishSnap=pending.at(-1);
track.scrollLeft=track.children.indexOf(panelNodes[1])*824;track.listeners.scroll();
assert.equal(overview.active(),'timeline','Native scroll events cannot replace the requested panel during its transition');
finishSnap();assert.equal(track.scrollLeft,selectedTimeline.offsetLeft+selectedTimeline.offsetWidth/2-track.clientWidth/2,'The requested snap target is restored after native DOM anchoring');
overview.select('apps',false);
let prevented=0;
track.listeners.wheel({deltaX:0,deltaY:120,deltaMode:0,shiftKey:false,ctrlKey:false,metaKey:false,target:{closest:()=>null},preventDefault(){prevented++;},stopPropagation(){}});
assert.equal(prevented,0,'Ordinary list wheels keep vertical scrolling');
track.listeners.wheel({deltaX:80,deltaY:0,deltaMode:0,shiftKey:false,ctrlKey:false,metaKey:false,target:{closest:()=>null},preventDefault(){prevented++;},stopPropagation(){}});
assert.equal(prevented,1);assert.equal(overview.active(),'projects','Horizontal wheel advances one section');
track.listeners.wheel({deltaX:80,deltaY:0,deltaMode:0,shiftKey:false,ctrlKey:false,metaKey:false,target:{closest:()=>null},preventDefault(){},stopPropagation(){}});
assert.equal(overview.active(),'projects','Momentum does not skip the next section');
const before=overview.active();track.listeners.wheel({ctrlKey:true});assert.equal(overview.active(),before,'Browser zoom remains available');
timeline.record('file.open',{app:'dolphin',title:'<unsafe>',path:'/projects/site/notes.md'});
const stored=JSON.parse(data.get('spatial-workspace-timeline-v1'));assert.equal(stored.general.length,1);
assert.equal(stored.general[0].project,'site');assert.equal(stored.general[0].page,1);
timeline.render();assert(make('#timelineEntries').innerHTML.includes('&lt;unsafe&gt;'),'Activity text is escaped');
make('#timelineEntries').listeners.click({target:{closest:()=>({dataset:{timelineOpen:stored.general[0].id}})}});
assert(calls.some(call=>call[0]==='file'&&call[2]==='notes.md'),'An activity reopens its file');
assert(!calls.some(call=>call[0]==='instance'),'The original available app instance is reused');
context.desktopPageAnimating=true;
make('#timelineEntries').listeners.click({target:{closest:()=>({dataset:{timelineOpen:stored.general[0].id}})}});
const finish=pending.at(-1),count=calls.filter(call=>call[0]==='file').length;
context.desktopPageAnimating=false;finish();
assert.equal(calls.filter(call=>call[0]==='file').length,count+1,'Returning waits for project animation before opening a file');
context.activeWorkspace='work';timeline.record('app.open',{app:'dolphin',title:'Work files'});
timeline.render();assert(!make('#timelineEntries').innerHTML.includes('unsafe'),'Timeline switches with workspace');
const beforeRestore=data.get('spatial-workspace-timeline-v1');
timeline.suspend(()=>{timeline.record('file.folder',{app:'dolphin',path:'/workspace-restored'});timeline.suspend(()=>timeline.record('app.open',{app:'dolphin'}));});
assert.equal(data.get('spatial-workspace-timeline-v1'),beforeRestore,'Restoring a workspace is not reported as user opening all its folders');
assert.throws(()=>timeline.suspend(()=>{throw Error('interrupted restore');}));
timeline.record('workspace',{title:'Work'});
assert(JSON.parse(data.get('spatial-workspace-timeline-v1')).work.some(event=>event.type==='workspace'),'Logging resumes after an interrupted restore');

context.SpatialGuide={model:{active:()=>true,allows:()=>false,lesson:{id:'overview'}}};
const beforeGuide=data.get('spatial-workspace-timeline-v1');timeline.record('app.park',{app:'dolphin'});assert.equal(data.get('spatial-workspace-timeline-v1'),beforeGuide,'Guide actions do not enter saved history');
overview.refresh();assert.equal(overview.active(),'apps');assert.equal(tabs[0].hidden,true);assert.equal(tabs[2].hidden,true);assert(edges.every(edge=>edge.hidden),'Only introduced sections are navigable');
console.log('Overview and Timeline passed: real circular neighbours, snap centring, focus, wheel/zoom/momentum, workspace history, persistence, bounds, safe text, return actions and Guide gating.');
