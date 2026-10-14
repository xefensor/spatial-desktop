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
const emptyNow=T.lanes([],[],{day:laneDay,now:at(3),includeNow:true});
assert(emptyNow.nowTop>=0&&emptyNow.nowTop<=emptyNow.height,'Now is reachable even on an empty morning');
const futureOnly=T.lanes([],[meeting],{day:laneDay,now:at(3),includeNow:true});
assert(futureOnly.nowTop>=0&&futureOnly.nowTop<futureOnly.plans[0].top,'Today includes current time even when all plans are later');
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
  const n={key,closest:()=>null,value:'',hidden:false,inert:false,dataset:{},attrs:{},style:{},textContent:'',innerHTML:'',listeners:{},
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
const dayButtons=[-1,1].map(direction=>{const n=make('day:'+direction);n.dataset.timelineDayStep=String(direction);return n;});
const edges=[-1,1].map(direction=>{const n=make('edge:'+direction);n.dataset.overviewStep=String(direction);return n;});
make('#timelineType').value='all';
const data=new Map(),pending=[],calls=[];
const context={SpatialAppNames:require('../dist/app-names.js'),SpatialTimeline:T,activeWorkspace:'general',desktopSyncApplying:false,desktopPageAnimating:false,
  appInfo:{dolphin:{label:'Files',base:'dolphin'}},appState:{dolphin:'open'},windowMembership:{general:{dolphin:'site'}},
  workspaceProfiles:{general:{label:'General'},work:{label:'Work'}},projectSpaces:{site:{name:'Website',accent:'#22bb66'}},workspaceContent:{},
  desktopPages:{column:()=>context.column||'site',columnOf:()=>context.column||'site',current:()=>1,pageOf:()=>1,last:()=>2},
  desktopStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)},
  $:(key,scope)=>key==='span'&&scope?make(scope.key+':span'):make(key),
  $$:key=>key==='[data-overview-panel]'?panelNodes:key==='[data-overview-section]'?tabs:key==='[data-overview-step]'?edges:key==='[data-timeline-day-step]'?dayButtons:[],
  escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
  icon:name=>'<svg>'+name+'</svg>',appArt:()=>'<svg>app</svg>',prepareControlSemantics(){},
  requestAnimationFrame:fn=>fn(),ResizeObserver:class{constructor(fn){resizeCallback=fn;}observe(){}},setTimeout:fn=>{pending.push(fn);return pending.length;},clearTimeout(){},
  window:{matchMedia:()=>({matches:true}),addEventListener(){},getComputedStyle:node=>({overflowY:node.overflowY||'visible',overflowX:node.overflowX||'visible'})},
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
const wheelSurface=make('#universalSearch'),blank={closest:()=>null};
const wheel=(extra={})=>wheelSurface.listeners.wheel({deltaX:0,deltaY:120,deltaMode:0,shiftKey:false,ctrlKey:false,metaKey:false,target:blank,preventDefault(){prevented++;},stopPropagation(){},...extra});
const releaseWheel=()=>pending.splice(0).forEach(fn=>fn());
wheel();assert.equal(prevented,1);assert.equal(overview.active(),'projects','Ordinary mouse wheels navigate over content, not only headings');
releaseWheel();wheel({target:make('#universalSearchInput')});assert.equal(overview.active(),'system','The global Overview header also supports wheel navigation');
releaseWheel();wheel({deltaY:-120});assert.equal(overview.active(),'projects','Reverse wheels select the previous section');
releaseWheel();overview.select('apps',false);
const list={closest:()=>null,overflowY:'auto',scrollHeight:800,clientHeight:200,scrollTop:100,parentElement:wheelSurface};
const beforeList=prevented;wheel({target:list});assert.equal(prevented,beforeList);assert.equal(overview.active(),'apps','Scrollable lists retain vertical scrolling while there is room');
wheel({target:list,deltaY:-120});assert.equal(overview.active(),'apps','Lists can scroll back up');
list.scrollTop=600;wheel({target:list});assert.equal(overview.active(),'apps','The lower list edge never advances the section');assert.equal(prevented,beforeList);
releaseWheel();list.scrollTop=0;wheel({target:list,deltaY:-120});assert.equal(overview.active(),'apps','At the upper list edge reverse navigation works');
assert.equal(prevented,beforeList,'The upper edge retains native scrolling too');
const child={closest:()=>null,parentElement:list};
wheel({target:child,deltaY:-120});assert.equal(prevented,beforeList,'A child inside an exhausted list cannot navigate an outer section');
releaseWheel();wheel({target:list,shiftKey:true});assert.equal(overview.active(),'projects','Shift scroll navigates directly over lists');
releaseWheel();overview.select('apps',false);
const horizontal={closest:()=>null,parentElement:track,overflowX:'auto',scrollWidth:800,clientWidth:200};
for(const left of [0,600]){
  horizontal.scrollLeft=left;
  for(const motion of [{deltaX:left?80:-80,deltaY:0},{shiftKey:true,deltaY:left?120:-120}]){
    releaseWheel();const count=prevented;wheel({target:horizontal,...motion});
    assert.equal(overview.active(),'apps','A nested horizontal list keeps the section at both edges');
    assert.equal(prevented,count,'Native horizontal list scrolling is preserved');
  }
}
track.overflowX='auto';track.scrollWidth=3000;
releaseWheel();wheel({target:{closest:()=>null,parentElement:track},deltaX:80,deltaY:0});
assert.equal(overview.active(),'projects','The carousel itself remains a navigation surface');
releaseWheel();overview.select('apps',false);
wheel({deltaX:80,deltaY:0});assert.equal(overview.active(),'projects','Horizontal wheel advances one section');
wheel({deltaX:80,deltaY:0});assert.equal(overview.active(),'projects','Momentum does not skip the next section');
const before=overview.active();wheel({ctrlKey:true});wheel({metaKey:true});assert.equal(overview.active(),before,'Browser zoom remains available');
releaseWheel();wheel({target:{closest:()=>({})}});assert.equal(overview.active(),before,'Native select and numeric controls retain their wheel behavior');
make('#overviewHome').hidden=true;wheel();assert.equal(overview.active(),before,'Search results retain their own scrolling');make('#overviewHome').hidden=false;
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
context.SpatialMemoryDesktop={revealItem:(...args)=>calls.push(['stash',...args])};
timeline.record('stash.save',{title:'Saved reference',stashId:'stash-reference',project:'site',page:1});
const savedReference=timeline.snapshot().activity.find(event=>event.type==='stash.save');
make('#timelineEntries').listeners.click({target:{closest:()=>({dataset:{timelineOpen:savedReference.id}})}});
assert(calls.some(call=>call[0]==='stash'&&call[1]==='stash-reference'&&call[2]===JSON.stringify(['general','site'])),'Timeline returns to the specific saved item');
timeline.record('stash.save',{workspace:'work',project:null,title:'Completed upload',stashId:'stash-upload',page:0});
assert(JSON.parse(data.get('spatial-workspace-timeline-v1')).work.some(event=>event.stashId==='stash-upload'),'An asynchronous save records its captured workspace');
context.activeWorkspace='work';timeline.record('app.open',{app:'dolphin',title:'Work files'});
timeline.render();assert(!make('#timelineEntries').innerHTML.includes('unsafe'),'Timeline switches with workspace');
const beforeRestore=data.get('spatial-workspace-timeline-v1');
timeline.suspend(()=>{timeline.record('file.folder',{app:'dolphin',path:'/workspace-restored'});timeline.suspend(()=>timeline.record('app.open',{app:'dolphin'}));});
assert.equal(data.get('spatial-workspace-timeline-v1'),beforeRestore,'Restoring a workspace is not reported as user opening all its folders');
assert.throws(()=>timeline.suspend(()=>{throw Error('interrupted restore');}));
timeline.record('workspace',{title:'Work'});
assert(JSON.parse(data.get('spatial-workspace-timeline-v1')).work.some(event=>event.type==='workspace'),'Logging resumes after an interrupted restore');

context.SpatialGuide={model:{active:()=>true,allows:()=>false,lesson:{id:'overview'}}};
context.SpatialGuide.settingUp=true;const beforeGuide=data.get('spatial-workspace-timeline-v1');timeline.record('app.park',{app:'dolphin'});assert.equal(data.get('spatial-workspace-timeline-v1'),beforeGuide,'Guide prerequisite setup is not recorded as learner activity');context.SpatialGuide.settingUp=false;
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
// Examples are relative to now and can all fall on yesterday just after midnight.
make('#timelineDay').value=T.dayKey(Math.max(...firstSeed.general.filter(event=>event.example).map(event=>event.time)));
make('#timelineDay').listeners.change();
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
make('#timelineToday').listeners.click();
assert.equal(make('#timelineDay').value,T.dayKey(Date.now()),'Now returns from a future day to today');
assert(make('#timelineEntries').innerHTML.includes('timeline-now'),'Now has a visible anchor even outside scheduled hours');
assert(make('#timelineScroll').scrollTop>=0);
make('#timelineScroll').scrollTop=-100;make('#timelineLatest').listeners.click();
assert(make('#timelineScroll').scrollTop>=0,'Latest activity jumps to an actual activity anchor');
assert.equal(make('#timelineDay').value,T.dayKey(Date.now()),'Jumping to latest activity preserves the selected day');
dayButtons[1].listeners.click();assert.notEqual(make('#timelineDay').value,T.dayKey(Date.now()),'Day arrows reach the next day containing items');
dayButtons[0].listeners.click();assert.equal(make('#timelineDay').value,T.dayKey(Date.now()),'Reverse navigation returns to the prior available day');
assert.equal(make('#overviewContext').textContent,'General / Website / Desktop 2','Overview states the actual workspace, project and desktop');
context.activeWorkspace='work';context.SpatialOverviewDesktop.refresh();assert.equal(make('#timelinePlanForm').hidden,true,'A workspace switch closes the old workspace form');
console.log('Overview and Timeline passed: real circular neighbours, snap centring, focus, wheel/zoom/momentum, workspace history, persistence, bounds, safe text, return actions, Guide gating, labelled examples, interruption-safe snaps and independent calendar/tasks/reminders.');

// Production window filters keep travelling parked windows visible on every desktop.
const shell=fs.readFileSync(require('node:path').join(__dirname,'../dist/desktop-shell.js'),'utf8');
const windowNodes=new Map(),windowContext={
  activeWorkspace:'general',desktopHasWindowFocus:false,frontApp:null,
  appState:{left:'open',right:'open',other:'open',park:'minimized',closed:'closed',foreign:'open'},
  appInfo:Object.fromEntries(['left','right','other','park','closed','foreign'].map(name=>[name,{label:name,primary:'#22bb66',detail:'Detail'}])),
  desktopPages:{inColumn:(_,name)=>name!=='foreign',current:()=>0,pageOf:(_,name)=>name==='other'||name==='park'?1:0},
  workspaceHotbarNames:()=>['right','left','park'],isLocalApp:()=>true,
  frameFor:name=>name==='right'?{detail:'report <draft>.md'}:null,
  $:(id,parent)=>{if(id==='.app-identity small')return {textContent:parent.detail};if(!windowNodes.has(id))windowNodes.set(id,{innerHTML:'',textContent:'',value:'all'});return windowNodes.get(id);},
  escapeHtml:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),appArt:()=>'<svg></svg>',icon:()=>'<svg></svg>',refreshWorkspaceContext(){},renderDesktopColumnMap(){},prepareControlSemantics(){}
};
vm.createContext(windowContext);vm.runInContext(shell.slice(shell.indexOf('function renderOverviewWindows()'),shell.indexOf('function refreshWorkspaceContext()')),windowContext);
const checkWindows=(filter,expected)=>{windowContext.$('#overviewWindowFilter').value=filter;windowContext.renderOverviewWindows();assert.deepEqual([...windowContext.$('#overviewWindowGrid').innerHTML.matchAll(/data-overview-open-app="([^"]+)"/g)].map(match=>match[1]),expected);};
checkWindows('all',['right','left','other','park']);checkWindows('desktop',['right','left','park']);checkWindows('parked',['park']);checkWindows('open',['right','left','other']);
const cards=windowContext.$('#overviewWindowGrid').innerHTML;
assert(cards.includes('<small>report &lt;draft&gt;.md</small>'),'The live window title is shown and escaped');
assert(cards.includes('<small>Detail</small>'),'Windows without a local frame retain their saved detail');
assert(cards.match(/data-overview-open-app="right"[\s\S]*?class="overview-window-hotkey" aria-hidden="true">1<\/kbd>/),'Current hotbar numbering matches window order');
assert(!cards.split('data-overview-open-app="other"')[1].split('</button>')[0].includes('overview-window-hotkey'),'A window outside the current hotbar gets no misleading shortcut');
windowContext.appState.park='closed';checkWindows('parked',[]);assert(windowContext.$('#overviewWindowGrid').innerHTML.includes('No matching windows'),'A filter has a helpful empty state without hiding the app launcher');
console.log('Overview improvements passed: current context, time jumps, available-day navigation, empty-day Now anchors, window filters and desktop/hotbar order.');

// Contributed sections join the real carousel only while their app is available.
const steamPanel=make('steam');steamPanel.dataset.overviewPanel='steam';steamPanel.offsetWidth=800;panelNodes.push(steamPanel);track.children.push(steamPanel);
Object.defineProperty(steamPanel,'offsetLeft',{get:()=>100+track.children.indexOf(steamPanel)*824});
const steamTab=make('tab:steam');steamTab.dataset.overviewSection='steam';tabs.push(steamTab);
const providerGroup=make('provider-group'),priorQuery=context.$$;
context.$$=(key,scope)=>key==='[data-overview-provider-group]'?[providerGroup]:key==='[data-overview-section]'&&scope===providerGroup?[steamTab]:priorQuery(key,scope);
context.SpatialGuide=null;context.activeWorkspace='general';context.workspaceProfiles.gaming={label:'Gaming'};
vm.runInContext(source,context);const contributed=context.SpatialOverviewDesktop;
assert.equal(contributed.registerSection('apps',{available:()=>true}),false,'An app cannot replace a system section');
assert.equal(contributed.registerSection('absent',{available:()=>true}),false,'An absent panel cannot be registered');
contributed.registerSection('steam',{label:'Steam',available:()=>context.activeWorkspace==='gaming'&&context.steamOpen!==false});
contributed.select('steam',false);assert.equal(contributed.active(),'apps');assert(steamPanel.hidden&&steamTab.hidden&&providerGroup.hidden);
context.activeWorkspace='gaming';contributed.refresh();contributed.select('steam',false);assert.equal(contributed.active(),'steam');assert(!steamPanel.hidden&&!steamTab.hidden&&!providerGroup.hidden);assert.equal(steamPanel.inert,false);
contributed.step(1);assert.equal(contributed.active(),'timeline','The contributed section wraps back to the system sections');contributed.step(-1);assert.equal(contributed.active(),'steam');assert.equal(track.children.length,5,'No interactive controls are cloned');
context.steamOpen=false;contributed.refresh();assert.equal(contributed.active(),'apps');assert(steamPanel.hidden&&steamTab.hidden&&providerGroup.hidden,'Closing the provider removes it from navigation and layout');
context.steamOpen=true;context.SpatialGuide={model:{active:()=>true,allows:()=>false,lesson:{id:'overview'}}};contributed.refresh();assert(steamPanel.hidden&&steamTab.hidden,'Guide practice cannot reveal an untaught provider');
console.log('Contributed Overview passed: system sections protected, contextual availability, carousel wrap, focus, provider grouping, and removal.');
