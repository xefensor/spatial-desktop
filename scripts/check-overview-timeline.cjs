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
const D=require('../dist/demo-examples.js'),exampleProfiles={general:{home:'/home/demo'},school:{},work:{},gaming:{},custom:{custom:true}};
const examples=T.demoExamples({preset:'demo',profiles:exampleProfiles,projects:D.projects,now:1800000000000});
assert.deepEqual(T.demoExamples({preset:'clean',profiles:exampleProfiles,projects:D.projects}),[],'A clean desktop has no invented history');
assert.deepEqual([...new Set(examples.map(event=>event.workspace))].sort(),['gaming','general','school','work']);
assert(examples.every(event=>event.example&&T.normalize(event)),'Every fixture is explicitly labelled and valid');
assert(new Set(examples.map(event=>event.type)).size>=7,'Examples cover varied desktop activities');
assert(examples.some(event=>event.path===D.projects.research.root+'/field-observations.csv'));
assert(examples.some(event=>event.path===D.projects.plasma.root+'/index.html'));
assert(!T.demoExamples({preset:'demo',profiles:exampleProfiles,projects:{}}).some(event=>event.project),'Deleted projects are never reintroduced');
const exampleModel=T.create();examples.forEach(event=>exampleModel.add(event));
assert.equal(T.create(exampleModel.snapshot()).list('work')[0].example,true,'Example labels persist across reloads');
const plans=T.demoPlans({preset:'demo',profiles:{...exampleProfiles,general:{home:'/home/demo',agenda:['Personal','Walk by the river','18:00 · personal calendar']}},projects:D.projects,now:1800000000000});
assert(plans.some(event=>event.type==='calendar.event'&&event.title==='Walk by the river'),'The existing calendar is present without a click');
assert(plans.some(event=>event.type==='task.due')&&plans.some(event=>event.type==='reminder.due'));
assert.deepEqual(T.demoPlans({preset:'clean',profiles:exampleProfiles,projects:D.projects}),[]);
const planner=T.createPlanner();plans.forEach(event=>planner.put({...event,updated:1}));
const task=planner.list('general',{type:'task'})[0];
assert.equal(planner.complete('work',task.id,true,2),null,'Tasks cannot be completed from another workspace');
planner.complete('general',task.id,true,2);
assert.equal(T.view([],planner.list('general'),{now:8000}).earlier.find(row=>row.id===task.id).time,2,'A completed future task is placed at its completion time, retaining its original deadline');
planner.merge({[task.id]:{...task,done:false,updated:1}});
assert.equal(planner.get(task.id).done,true,'Stale display snapshots cannot undo task completion');
assert.equal(T.createPlanner(planner.snapshot()).get(task.id).done,true,'Completion persists');
const future=planner.put({...task,id:'future',done:false,time:10000,updated:3}),ongoing=planner.put({...task,id:'ongoing',type:'calendar.event',time:3000,endTime:9000,done:false,updated:3});
const mixed=T.view([event('activity',7000)], [future,ongoing,{...task,time:2000,done:true}],{now:8000});
assert.deepEqual(mixed.upcoming.map(row=>row.id),['ongoing','future'],'Ongoing and future plans sort chronologically');
assert(mixed.earlier.some(row=>row.id==='activity')&&mixed.earlier.some(row=>row.done));
assert.equal(T.view([],planner.list('general'),{type:'activity'}).upcoming.length,0);
assert(T.view([],planner.list('general'),{type:'planned',query:'holiday'}).earlier.some(row=>row.id===task.id),'Planned content is searchable');

// Calendar duration and concurrency use the same scale as the activity lane.
const laneDay='2026-10-10',at=(h,m=0)=>new Date(laneDay+'T'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00').getTime();
const meeting={...event('meeting',at(10)),type:'calendar.event',planned:true,endTime:at(11),title:'Review'},overlap={...meeting,id:'overlap',time:at(10,30),endTime:at(11,30)};
const dayView=T.lanes([event('during',at(10,30))],[meeting,overlap],{day:laneDay});
assert.equal(dayView.plans[0].top,dayView.ticks.find(t=>t.time===at(10)).top);
assert.equal(dayView.plans[0].top+dayView.plans[0].height,dayView.ticks.find(t=>t.time===at(11)).top,'A meeting spans its full duration on the shared time map');
assert.equal(dayView.activity[0].top,dayView.plans[0].top+30*dayView.scale,'Activity during a meeting aligns with the same time on the left');
assert.equal(dayView.plans[0].columns,2);assert.notEqual(dayView.plans[0].column,dayView.plans[1].column,'Overlapping events retain their times in separate columns');
const backToBack=T.lanes([], [meeting,{...meeting,id:'later',time:at(11),endTime:at(12)}],{day:laneDay});
assert(backToBack.plans.every(e=>e.columns===1),'Touching intervals do not overlap');
const tomorrow=new Date(laneDay+'T00:00:00');tomorrow.setDate(tomorrow.getDate()+1);
const overnight={...meeting,time:at(23),endTime:tomorrow.getTime()+3600000};
const nextDay=T.lanes([], [overnight],{day:T.dayKey(tomorrow.getTime())});
assert.equal(nextDay.plans.length,1);assert.equal(nextDay.plans[0].height,60*nextDay.scale,'An overnight event clips to the selected day');
assert.equal(T.lanes([], [meeting],{day:'2026-10-12'}).plans.length,0,'Other days never leak into the selected day');
assert.equal(T.lanes([event('during',at(10,30))],[meeting],{day:laneDay,type:'activity'}).plans.length,0);
assert.equal(T.lanes([], [{...meeting,example:true}],{day:laneDay}).plans[0].example,true);
const dense=T.lanes([event('one',at(10,5)),event('two',at(10,5)+1000)],[{...meeting,time:at(10,5),endTime:at(10,5)+1000}],{day:laneDay});
assert.equal(dense.activity[0].top,dense.plans[0].top,'Activity anchors exactly to a meeting starting at the same minute');
assert.equal(dense.activity[1].top,dense.plans[0].top+dense.plans[0].height,'Even one-second activity bursts align with the event end');
assert(dense.activity[1].top-dense.activity[0].top>=58,'Dense actions stay readable while both lanes expand together');

// Execute the actual carousel and timeline adapter, with a small DOM geometry model.
const nodes=new Map(),make=(key)=>{
  if(nodes.has(key))return nodes.get(key);
  const n={key,value:'',hidden:false,inert:false,dataset:{},attrs:{},style:{},textContent:'',innerHTML:'',listeners:{},
    classList:{add(){},remove(){},toggle(){},contains:()=>false},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;}};
  nodes.set(key,n);return n;
};
const panelNodes=T.sections.map(id=>{const n=make(id);n.dataset.overviewPanel=id;n.offsetWidth=800;return n;});
let scrollWrites=0,resizeCallback;
const track=make('#overviewSectionTrack');Object.assign(track,{clientWidth:1000,scrollLeft:0,children:[...panelNodes],
  prepend(n){this.children=this.children.filter(x=>x!==n);this.children.unshift(n);},
  append(n){this.children=this.children.filter(x=>x!==n);this.children.push(n);},scrollTo({left}){scrollWrites++;this.scrollLeft=left;}});
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
  requestAnimationFrame:fn=>fn(),ResizeObserver:class{constructor(fn){resizeCallback=fn;}observe(){}},setTimeout:fn=>{pending.push(fn);return pending.length;},clearTimeout(){},
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
overview.select('system',true);const staleFinish=pending.at(-1);overview.select('timeline',true);const desired=track.scrollLeft;staleFinish();assert.equal(track.scrollLeft,desired,'An interrupted animation cannot recenter a later selection');
pending.at(-1)();track.scrollLeft+=.25;const beforeRounding=scrollWrites;track.listeners.scrollend();assert.equal(scrollWrites,beforeRounding,'Subpixel rounding does not trigger another snap');
resizeCallback();pending.at(-1)();const beforeResize=scrollWrites;resizeCallback();assert.equal(scrollWrites,beforeResize,'An unchanged ResizeObserver notification does not restart scrolling');
const deferred=[];context.requestAnimationFrame=fn=>deferred.push(fn);overview.select('apps',false);overview.refresh();overview.select('timeline',false);deferred.pop()();assert.equal(overview.active(),'timeline','A delayed refresh cannot override a later calendar or section navigation');context.requestAnimationFrame=fn=>fn();
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
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/overview-desktop.js'),'utf8');
context.desktopPreset='demo';vm.runInContext(source,context);
assert(!data.has('spatial-timeline-demo-v1'),'Guide practice never seeds demo history');
context.SpatialGuide=null;context.desktopPreset='clean';vm.runInContext(source,context);
assert(!data.has('spatial-timeline-demo-v1'),'Clean sessions never seed demo history');
context.desktopPreset='demo';context.activeWorkspace='general';context.workspaceProfiles.general.home='/home/demo';vm.runInContext(source,context);
const firstSeed=JSON.parse(data.get('spatial-workspace-timeline-v1'));
assert(firstSeed.general.some(event=>event.id===stored.general[0].id),'Seeding preserves existing real activity');
assert.equal(firstSeed.general.filter(event=>event.example).length,7);
assert(make('#timelineEntries').innerHTML.includes('timeline-example-label'),'Demo rows visibly distinguish examples');
vm.runInContext(source,context);
assert.deepEqual(JSON.parse(data.get('spatial-workspace-timeline-v1')),firstSeed,'Reload neither duplicates nor re-dates example events');
assert(require('../dist/workspace-setup.js').sessionKeys.includes('spatial-timeline-demo-v1'),'Clean/demo resets allow fresh example seeding');
assert(JSON.parse(data.get('spatial-workspace-planner-v1')),'Plans are persisted independently of interaction history');
make('#timelinePlanKind').value='task.due';make('#timelinePlanTitle').value='Send review notes';make('#timelinePlanTime').value='2099-01-01T12:00';make('#timelinePlanProject').value='site';make('#timelinePlanDetail').value='Include keyboard feedback';
make('#timelinePlanForm').listeners.submit({preventDefault(){}});
const created=Object.values(JSON.parse(data.get('spatial-workspace-planner-v1'))).find(item=>item.title==='Send review notes');assert(created&&created.workspace==='general'&&created.project==='site');
assert(make('#timelineEntries').innerHTML.includes('Calendar & tasks'));
assert(make('#timelineDay').value==='2099-01-01','Adding a plan reveals its day');
make('#timelineEntries').listeners.change({target:{closest:()=>({dataset:{timelineComplete:created.id},checked:true})}});
assert.equal(JSON.parse(data.get('spatial-workspace-planner-v1'))[created.id].done,true);
make('#timelineDay').value=T.dayKey(Date.now());make('#timelineDay').listeners.change();
assert(make('#timelineEntries').innerHTML.includes('Send review notes'),'Task completion records the explicit action on its actual day');
make('#timelinePlanKind').value='calendar.event';make('#timelinePlanTitle').value='Design review';make('#timelinePlanTime').value='2099-01-02T10:00';make('#timelinePlanEnd').value='2099-01-02T09:00';
make('#timelinePlanForm').listeners.submit({preventDefault(){}});
assert(!Object.values(JSON.parse(data.get('spatial-workspace-planner-v1'))).some(e=>e.title==='Design review'),'An invalid calendar interval cannot be saved');
make('#timelinePlanEnd').value='2099-01-02T11:30';make('#timelinePlanForm').listeners.submit({preventDefault(){}});
const review=Object.values(JSON.parse(data.get('spatial-workspace-planner-v1'))).find(e=>e.title==='Design review');assert.equal(review.endTime-review.time,90*60000,'The form persists the chosen duration');
context.activeWorkspace='work';context.SpatialOverviewDesktop.refresh();assert.equal(make('#timelinePlanForm').hidden,true,'A workspace switch closes the old workspace form');
console.log('Overview and Timeline passed: real circular neighbours, snap centring, focus, wheel/zoom/momentum, workspace history, persistence, bounds, safe text, return actions, Guide gating, labelled examples, interruption-safe snaps and independent calendar/tasks/reminders.');
