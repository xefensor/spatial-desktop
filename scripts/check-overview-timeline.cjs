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
assert.deepEqual(T.sections,['windows','apps','projects','timeline','system'],'Overview moves from current windows through launching, project files, activity and system controls');
assert.equal(T.neighbour('windows',-1),'system');assert.equal(T.neighbour('system',1),'windows');
assert.equal(T.neighbour('timeline',-1),'projects');
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
    classList:{add(){},remove(){},toggle(){},contains:()=>false},focus(){this.focused=true;},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;}};
  nodes.set(key,n);return n;
};
const panelNodes=T.sections.map(id=>{const n=make(id);n.dataset.overviewPanel=id;n.offsetWidth=800;return n;});
let scrollWrites=0,resizeCallback;const panelMoves=[];
const track=make('#overviewSectionTrack');Object.assign(track,{clientWidth:1000,scrollLeft:0,children:[...panelNodes],
  prepend(n){panelMoves.push(n);this.children=this.children.filter(x=>x!==n);this.children.unshift(n);},
  append(n){panelMoves.push(n);this.children=this.children.filter(x=>x!==n);this.children.push(n);},
  insertBefore(n,before){panelMoves.push(n);this.children=this.children.filter(x=>x!==n);this.children.splice(this.children.indexOf(before),0,n);},scrollTo({left}){scrollWrites++;this.scrollLeft=left;}});
panelNodes.forEach(n=>Object.defineProperty(n,'offsetLeft',{get:()=>100+track.children.indexOf(n)*824}));
const tabs=T.sections.map(id=>{const n=make('tab:'+id);n.dataset.overviewSection=id;return n;});
const dayButtons=[-1,1].map(direction=>{const n=make('day:'+direction);n.dataset.timelineDayStep=String(direction);return n;});
const edges=[-1,1].map(direction=>{const n=make('edge:'+direction);n.dataset.overviewStep=String(direction);return n;});
make('#timelineType').value='all';
const data=new Map(),pending=[],calls=[],windowListeners=new Map();
const context={SpatialAppNames:require('../dist/app-names.js'),SpatialTimeline:T,SpatialTimelineSearch:require('../dist/timeline-search.js'),CSS:{escape:value=>String(value)},activeWorkspace:'general',desktopSyncApplying:false,desktopPageAnimating:false,
  appInfo:{dolphin:{label:'Files',base:'dolphin'}},appState:{dolphin:'open'},windowMembership:{general:{dolphin:'site'}},
  workspaceProfiles:{general:{label:'General'},work:{label:'Work'}},projectSpaces:{site:{name:'Website',accent:'#22bb66'}},workspaceContent:{},
  desktopPages:{column:()=>context.column||'site',columnOf:()=>context.column||'site',current:()=>1,pageOf:()=>1,last:()=>2},
  desktopStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)},
  $:(key,scope)=>key==='span'&&scope?make(scope.key+':span'):make(key),
  $$:key=>key==='[data-overview-panel]'?panelNodes:key==='[data-overview-section]'?tabs:key==='[data-overview-step]'?edges:key==='[data-timeline-day-step]'?dayButtons:[],
  escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
  icon:name=>'<svg>'+name+'</svg>',appArt:()=>'<svg>app</svg>',prepareControlSemantics(){},
  requestAnimationFrame:fn=>fn(),ResizeObserver:class{constructor(fn){resizeCallback=fn;}observe(){}},setTimeout:fn=>{pending.push(fn);return pending.length;},clearTimeout(){},
  window:{matchMedia:()=>({matches:true}),addEventListener(type,handler){windowListeners.set(type,handler);},getComputedStyle:node=>({overflowY:node.overflowY||'visible',overflowX:node.overflowX||'visible'})},
  setUniversalSearchOpen:open=>calls.push(['overview',open]),openProjectNames:()=>['site'],filterLauncher:()=>calls.push(['launcher',context.activeWorkspace]),
  activateProject:name=>{context.column=name;calls.push(['activate',name]);},changeDesktopColumn:name=>{context.column=name;calls.push(['column',name]);},
  changeDesktopPage:page=>calls.push(['page',page]),createAppInstance:base=>{calls.push(['instance',base]);return base;},
  openApp:app=>calls.push(['open',app]),navigateBrowser:(app,address)=>calls.push(['browser',app,address]),
  renderFileLocation:(app,path)=>calls.push(['folder',app,path]),openAppFile:(app,name)=>calls.push(['file',app,name])
};
vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../dist/overview-desktop.js'),'utf8'),context);
const overview=context.SpatialOverviewDesktop,timeline=context.SpatialTimelineDesktop;
assert.equal(overview.active(),'windows','A fresh Overview starts with existing work, not the app catalogue');
assert.equal(JSON.parse(data.get('spatial-overview-section-v2')).general,'windows','Default selection is stored under the new preference version');
assert(calls.some(call=>call[0]==='launcher'&&call[1]==='general'),'Overview refresh applies the current Workspace launcher profile');
for(const id of ['timeline','system','projects','windows','apps','timeline','apps']){
  overview.select(id,false);
  const current=panelNodes.find(n=>n.dataset.overviewPanel===id),index=track.children.indexOf(current);
  assert(index>0&&index<track.children.length-1,'Both real neighbours stay visible for '+id);
  assert.equal(track.children.length,5,'All five real panels are rotated without duplicating controls');
  assert.equal(track.scrollLeft,current.offsetLeft+current.offsetWidth/2-track.clientWidth/2,'Selected panel is centred');
  assert.equal(current.inert,false);assert(panelNodes.filter(n=>n!==current).every(n=>n.inert),'Preview controls stay out of keyboard focus');
}
overview.select('timeline',true);
const selectedTimeline=panelNodes.find(n=>n.dataset.overviewPanel==='timeline'),finishSnap=pending.at(-1);
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
releaseWheel();wheel({target:make('#universalSearchInput')});assert.equal(overview.active(),'timeline','The global Overview header also supports wheel navigation');
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
overview.select('windows',false);
let arrowPrevented=0;
const arrow=key=>make('#overviewHome').listeners.keydown({key,target:{matches:()=>false},preventDefault(){arrowPrevented++;}});
arrow('ArrowRight');assert.equal(overview.active(),'apps','Arrow keys reach the separate application launcher');
arrow('ArrowLeft');assert.equal(overview.active(),'windows');
arrow('ArrowLeft');assert.equal(overview.active(),'system','Keyboard navigation wraps from Windows to System');
assert.equal(arrowPrevented,3,'Carousel arrow keys suppress native page scrolling');
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
overview.refresh();assert.equal(overview.active(),'windows','Guide falls back to Windows when a previously selected section is unavailable');
assert.deepEqual(tabs.filter(tab=>!tab.hidden).map(tab=>tab.dataset.overviewSection),['windows','apps'],'Windows and launching remain accessible while later sections are gated');
assert(edges.every(edge=>!edge.hidden),'Both introductory sections retain horizontal navigation');
overview.select('apps',false);overview.step(1);assert.equal(overview.active(),'windows','Introductory navigation wraps between launching and current windows');
context.SpatialGuide.model.allows=feature=>feature==='projects';overview.refresh();
assert.deepEqual(tabs.filter(tab=>!tab.hidden).map(tab=>tab.dataset.overviewSection),['windows','apps','projects'],'Project files appear only once the Guide introduces projects');
context.SpatialGuide.model.allows=()=>false;
// Entering Overview follows the current Guide task rather than the learner's
// earlier default tab. Subsequent tab choices remain available to the exercise.
const Guide=require('../dist/spatial-guide.js'),ordinaryPreference=data.get('spatial-overview-section-v2');
context.SpatialGuide={model:Guide.create({status:'active',version:9,lessonId:'apps',done:[]}),overviewSection:Guide.overviewSection};
overview.select('windows',false);overview.overviewChanged(true);overview.refresh();
assert.equal(overview.active(),'apps','The first launch lesson opens Apps through the real Overview-open hook');
overview.select('windows',false);overview.refresh();
assert.equal(overview.active(),'windows','Refreshing does not switch a manually selected Windows tab back to Apps');
let openingFrame;context.requestAnimationFrame=fn=>{openingFrame=fn;};overview.refresh();overview.overviewChanged(true);openingFrame();
assert.equal(overview.active(),'apps','A queued earlier refresh cannot swap the launch tab back to Windows after opening');
context.requestAnimationFrame=fn=>fn();
overview.overviewChanged(false);overview.overviewChanged(true);
assert.equal(overview.active(),'apps','Reopening returns the launch task to its app catalogue');
assert.equal(data.get('spatial-overview-section-v2'),ordinaryPreference,'An introductory launch task does not save its routing as an ordinary Workspace preference');
context.SpatialGuide.model=Guide.create({status:'active',version:9,lessonId:'overview-navigation',done:[]});
overview.overviewChanged(true);assert.equal(overview.active(),'windows','Existing-work practice starts on Windows instead of the launcher');
overview.select('apps',false);overview.refresh();assert.equal(overview.active(),'apps','The leave-and-return exercise can remain on another tab');
context.SpatialGuide.model=Guide.create({status:'active',version:9,lessonId:'timeline',done:[]});
overview.overviewChanged(true);assert.equal(overview.active(),'apps','Timeline practice first opens Apps to create real activity');
context.SpatialGuide.model.mark('timeline-activity');overview.overviewChanged(true);overview.refresh();
assert.equal(overview.active(),'timeline','Once activity exists, reopening leads to Timeline');
context.SpatialGuide={model:{active:()=>true,allows:()=>false,lesson:{id:'overview'}}};
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
assert.equal(calls.filter(call=>call[0]==='launcher').at(-1)[1],'work','A Workspace switch refreshes launcher favorites alongside the Overview context');
console.log('Overview and Timeline passed: real circular neighbours, snap centring, focus, wheel/zoom/momentum, workspace history, persistence, bounds, safe text, return actions, Guide gating, labelled examples, interruption-safe snaps and independent calendar/tasks/reminders.');

// Running windows belong to desktops; parked windows travel with their column.
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
checkWindows('all',['right','left','other','park']);
let groupedCards=windowContext.$('#overviewWindowGrid').innerHTML;
assert.deepEqual([...groupedCards.matchAll(/<h4 class="overview-window-group">([^<]+)<\/h4>/g)].map(match=>match[1]),['This desktop','Other desktops','Parked · Workspace-wide'],'The Windows overview orders current work, other desktops and travelling parked apps');
checkWindows('desktop',['right','left']);
checkWindows('parked',['park']);
let parkedCards=windowContext.$('#overviewWindowGrid').innerHTML;
assert(parkedCards.includes('Parked · Workspace-wide')&&!parkedCards.includes('Desktop 2'),'A parked window is labelled by its owning Workspace, not its remembered desktop');
windowContext.desktopPages.column=()=> 'site';checkWindows('parked',['park']);
assert(windowContext.$('#overviewWindowGrid').innerHTML.includes('Parked · Project-wide'),'Project parking is distinguished from ordinary Workspace parking');
checkWindows('open',['right','left','other']);
const cards=windowContext.$('#overviewWindowGrid').innerHTML;
assert(cards.includes('<small>report &lt;draft&gt;.md</small>'),'The live window title is shown and escaped');
assert(cards.includes('<small>Detail</small>'),'Windows without a local frame retain their saved detail');
assert(cards.match(/data-overview-open-app="right"[\s\S]*?class="overview-window-hotkey" aria-hidden="true">1<\/kbd>/),'Current hotbar numbering matches window order');
assert(!cards.split('data-overview-open-app="other"')[1].split('</button>')[0].includes('overview-window-hotkey'),'A window outside the current hotbar gets no misleading shortcut');
windowContext.appState.park2='minimized';windowContext.appInfo.park2={label:'Second parked app',primary:'#22bb66',detail:'Parked from this desktop'};
const originalPageOf=windowContext.desktopPages.pageOf,originalHotbar=windowContext.workspaceHotbarNames;
windowContext.desktopPages.pageOf=(workspace,name)=>name==='park2'?0:originalPageOf(workspace,name);
windowContext.workspaceHotbarNames=()=>['right','park','park2','left'];
checkWindows('parked',['park','park2']);
assert.deepEqual([...windowContext.$('#overviewWindowGrid').innerHTML.matchAll(/class="overview-window-hotkey" aria-hidden="true">(\d+)<\/kbd>/g)].map(match=>match[1]),['2','3'],'Project-wide parked cards follow hotbar slots rather than old desktop locations');
delete windowContext.appState.park2;delete windowContext.appInfo.park2;windowContext.desktopPages.pageOf=originalPageOf;windowContext.workspaceHotbarNames=originalHotbar;
windowContext.appState.park='closed';checkWindows('parked',[]);
assert(windowContext.$('#overviewWindowGrid').innerHTML.includes('No matching windows'),'A filter has a helpful empty state');
assert(windowContext.$('#overviewWindowGrid').innerHTML.includes('data-overview-go="apps"'),'The empty Windows state links directly to the separate app launcher');
console.log('Overview improvements passed: current context, time jumps, available-day navigation, empty-day Now anchors, window filters and desktop/hotbar order.');

// Execute the real desktop map against actual page ownership: a parked window
// remains accessible in its column without becoming an icon or count on a page.
const mapPages=require('../dist/desktop-pages.js').create(),mapNodes=new Map();
const mapStates={workspaceOpen:'open',otherOpen:'open',workspaceParked:'minimized',projectOpen:'open',projectParked:'minimized',closed:'closed',unlisted:'open'};
for(const [name,page,column] of [['workspaceOpen',0,'workspace'],['otherOpen',1,'workspace'],['workspaceParked',2,'workspace'],['projectOpen',0,'site'],['projectParked',1,'site'],['closed',0,'site'],['unlisted',0,'unlisted']])mapPages.assign('general',name,page,column);
const mapContext={
  ...windowContext,appState:mapStates,
  appInfo:Object.fromEntries(Object.keys(mapStates).map(name=>[name,{label:name,primary:'#22bb66',detail:'Example'}])),
  desktopPages:mapPages,projectSpaces:{site:{name:'Website',accent:'#22bb66',icon:'i-folder'}},workspaceProfiles:{general:{label:'General',accent:'#22bb66',icon:'i-grid'}},
  activeDisplayRoster:()=>[{}],localDisplaySlot:()=>1,openProjectNames:()=>['site'],desktopColumnLabel:column=>column==='workspace'?'Workspace':'Website',
  workspaceHotbarNames:()=>['workspaceOpen','workspaceParked','projectOpen','projectParked'],frameFor:()=>null,
  $:id=>{if(!mapNodes.has(id))mapNodes.set(id,{innerHTML:'',textContent:'',value:'all'});return mapNodes.get(id);},
  appArt:name=>'<svg data-map-app="'+name+'"></svg>'
};
vm.createContext(mapContext);
vm.runInContext(shell.slice(shell.indexOf('function renderDesktopColumnMap()'),shell.indexOf('function migrateDesktopColumns()')),mapContext);
vm.runInContext(shell.slice(shell.indexOf('function renderOverviewWindows()'),shell.indexOf('function refreshWorkspaceContext()')),mapContext);
const mapIcons=()=>[...mapContext.$('#desktopColumnMap').innerHTML.matchAll(/data-map-app="([^"]+)"/g)].map(match=>match[1]);
const mapPage=(column,page)=>[...mapContext.$('#desktopColumnMap').innerHTML.matchAll(/<button\b[^>]*data-desktop-column="([^"]+)"[^>]*data-column-page="(\d+)"[^>]*>([\s\S]*?)<\/button>/g)].find(match=>match[1]===column&&Number(match[2])===page)?.[3]||'';
mapContext.renderOverviewWindows();
assert.deepEqual(mapIcons(),['workspaceOpen','otherOpen','projectOpen'],'Only open windows in displayed columns contribute desktop-map icons');
assert(mapPage('workspace',0).includes('1 window')&&mapPage('workspace',1).includes('1 window')&&mapPage('site',0).includes('1 window'),'Each occupied desktop counts its open windows');
assert(mapPage('workspace',2).includes('Empty')&&mapPage('site',1).includes('Empty'),'Remembered locations containing only parked windows count as empty');
assert(mapContext.$('#overviewWindowGrid').innerHTML.includes('data-overview-open-app="workspaceParked"')&&mapContext.$('#overviewWindowGrid').innerHTML.includes('Parked · Workspace-wide'),'Workspace-wide parked cards remain available below the map');
mapPages.select('general','site');mapContext.renderOverviewWindows();
assert(mapContext.$('#overviewWindowGrid').innerHTML.includes('data-overview-open-app="projectParked"')&&mapContext.$('#overviewWindowGrid').innerHTML.includes('Parked · Project-wide'),'Project-wide parked cards remain available in the selected Project');
assert.deepEqual(mapIcons(),['workspaceOpen','otherOpen','projectOpen'],'Selecting a Project never puts parked cards back into its page icons');
mapStates.projectParked='open';mapContext.renderOverviewWindows();
assert(mapIcons().includes('projectParked')&&mapPage('site',1).includes('1 window'),'Unparking adds the real window to its desktop icon and count');
mapStates.projectOpen='minimized';mapContext.renderOverviewWindows();
assert(!mapIcons().includes('projectOpen')&&mapPage('site',0).includes('Empty'),'Parking immediately removes the icon and count from the former desktop');
assert(mapContext.$('#overviewWindowGrid').innerHTML.includes('data-overview-open-app="projectOpen"'),'The newly parked app remains available in the Project group');
console.log('Overview map passed: open-window icons/counts, column ownership, parked-only empty pages, persistent scoped parking and park/unpark transitions.');

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
contributed.select('steam',false);assert.equal(contributed.active(),'windows');assert(steamPanel.hidden&&steamTab.hidden&&providerGroup.hidden);
// Start from markup order and rotate while Steam is hidden, then make it
// available. Its retained DOM position must not split Timeline from System.
track.children=[...panelNodes];contributed.select('windows',false);contributed.select('timeline',false);
const physicalCycle=()=>{
  const visible=track.children.filter(node=>!node.hidden).map(node=>node.dataset.overviewPanel),start=visible.indexOf('windows');
  return [...visible.slice(start),...visible.slice(0,start)];
};
context.activeWorkspace='gaming';contributed.refresh();contributed.select('timeline',false);
assert.deepEqual(physicalCycle(),[...T.sections,'steam'],'Opening Steam preserves the same canonical cycle as the section tabs');
const physicalNeighbour=direction=>{
  const visible=track.children.filter(node=>!node.hidden),index=visible.findIndex(node=>node.dataset.overviewPanel===contributed.active());
  return visible[(index+direction+visible.length)%visible.length].dataset.overviewPanel;
};
assert.equal(physicalNeighbour(1),'system','Timeline previews System before Steam');assert.equal(edges[1].attrs['aria-label'],'Next section: System');
contributed.step(1);assert.equal(contributed.active(),'system');assert.equal(physicalNeighbour(1),'steam');
contributed.select('timeline',true);const beforeAvailabilityMoves=panelMoves.length;context.steamOpen=false;contributed.refresh();
assert.equal(contributed.active(),'timeline','Removing a provider during a snap retains the selected built-in section');
assert.deepEqual(physicalCycle(),T.sections,'Closing Steam restores the five-section cycle');
context.steamOpen=true;contributed.refresh();assert.equal(contributed.active(),'timeline');
assert.deepEqual(physicalCycle(),[...T.sections,'steam'],'Reopening Steam during a snap restores its canonical position');
assert(!panelMoves.slice(beforeAvailabilityMoves).includes(make('timeline')),'Changing provider availability never reparents the focused Timeline panel');
assert.equal(new Set(track.children).size,6,'Availability changes move existing panels without duplicating controls');
context.activeWorkspace='gaming';contributed.refresh();contributed.select('steam',false);assert.equal(contributed.active(),'steam');assert(!steamPanel.hidden&&!steamTab.hidden&&!providerGroup.hidden);assert.equal(steamPanel.inert,false);
contributed.step(1);assert.equal(contributed.active(),'windows','The contributed section wraps back to the first built-in section');contributed.step(-1);assert.equal(contributed.active(),'steam');assert.equal(track.children.length,6,'The provider joins five built-in panels without cloning controls');
context.steamOpen=false;contributed.refresh();assert.equal(contributed.active(),'windows');assert(steamPanel.hidden&&steamTab.hidden&&providerGroup.hidden,'Closing the provider removes it from navigation and layout');
context.steamOpen=true;context.SpatialGuide={model:{active:()=>true,allows:()=>false,lesson:{id:'overview'}}};contributed.refresh();assert(steamPanel.hidden&&steamTab.hidden,'Guide practice cannot reveal an untaught provider');
console.log('Contributed Overview passed: system sections protected, contextual availability, carousel wrap, focus, provider grouping, and removal.');

// Global inspection is explicit and never joins the workspace carousel.
delete context.SpatialGuide;context.activeWorkspace='work';
const globalPanel=make('global-panel'),globalButton=make('global-button');let globalRenders=0,globalCloses=0;
assert(contributed.registerSeparateSection('global',{panel:globalPanel,button:globalButton,label:'All Workspaces',available:()=>true,render(){globalRenders++;},close(){globalCloses++;}}));
assert(!contributed.registerSeparateSection('apps',{panel:globalPanel,button:globalButton,available:()=>true}));
contributed.select('apps',false);contributed.select('global',false);
assert.equal(contributed.active(),'global');assert.equal(globalPanel.hidden,false);assert.equal(globalPanel.inert,false);
assert.equal(make('.overview-carousel-stage').hidden,true);assert(!track.children.includes(globalPanel),'Other workspace content never appears in an edge preview');
assert(!Object.values(JSON.parse(data.get('spatial-overview-section-v2'))).includes('global'),'Global inspection is never saved as a workspace preference');
contributed.refresh();assert.equal(contributed.active(),'global');assert(globalRenders>=2);
contributed.overviewChanged(false);assert.equal(globalPanel.hidden,true);assert.equal(contributed.active(),'apps');assert(globalCloses>0);
contributed.refresh();assert.equal(contributed.active(),'apps','Reopening restores a local section');
const queued=[];context.requestAnimationFrame=fn=>queued.push(fn);contributed.refresh();contributed.select('global',false);queued.splice(0).forEach(fn=>fn());assert.equal(contributed.active(),'global','An older local refresh cannot override an explicit global selection');context.requestAnimationFrame=fn=>fn();
context.activeWorkspace='general';contributed.refresh();assert.notEqual(contributed.active(),'global','Changing Workspace closes global inspection');
console.log('Separate global Overview passed: explicit selection, isolated panel and scrolling, no neighbour previews, refresh races, no stored preference, close/reopen and workspace-change privacy.');

// Old Apps contained running windows: migrate that preference to the new Windows
// tab, while preserving deliberate selections in every other workspace.
context.requestAnimationFrame=fn=>fn();delete context.SpatialGuide;context.desktopPreset='clean';
function reloadSections({legacy,current,workspace='general'}={}){
  for(const key of ['spatial-overview-section-v1','spatial-overview-section-v2'])data.delete(key);
  if(legacy!==undefined)data.set('spatial-overview-section-v1',legacy);
  if(current!==undefined)data.set('spatial-overview-section-v2',current);
  context.activeWorkspace=workspace;vm.runInContext(source,context);return context.SpatialOverviewDesktop;
}
let restored=reloadSections({legacy:JSON.stringify({general:'apps',work:'timeline',school:'projects',gaming:'steam'})});
assert.equal(restored.active(),'windows','The old combined Apps destination becomes Windows');
let migrated=JSON.parse(data.get('spatial-overview-section-v2'));
assert.equal(migrated.work,'timeline');assert.equal(migrated.school,'projects');assert.equal(migrated.gaming,'steam','Provider preferences survive migration for later registration');
context.activeWorkspace='work';restored.refresh();assert.equal(restored.active(),'timeline','Other Workspaces retain their selected destination');
restored=reloadSections({legacy:'{"general":"apps"}',current:'{"general":"apps"}'});
assert.equal(restored.active(),'apps','A new explicit launcher preference is never migrated a second time');
restored=reloadSections({current:'{"general":"missing-section"}'});assert.equal(restored.active(),'windows','Unknown current preferences fall back to Windows');
for(const corrupt of ['null','[]','42','"apps"','{']){
  restored=reloadSections({current:corrupt});assert.equal(restored.active(),'windows','Invalid current preference maps cannot break Overview: '+corrupt);
  restored=reloadSections({legacy:corrupt});assert.equal(restored.active(),'windows','Invalid old preference maps cannot break migration: '+corrupt);
}
console.log('Overview preferences passed: Windows default, versioned Apps migration, per-Workspace choices, provider retention and invalid storage recovery.');

// Exercise the actual material-summary renderer and delegated controls.
context.activeWorkspace='general';context.column='site';
const summaryTimeline=context.SpatialTimelineDesktop;
let summaryClock=Date.now();context.Date=class extends Date{static now(){return summaryClock+=1000;}};
const clickTimeline=dataset=>make('#timelineEntries').listeners.click({target:{closest:selector=>selector.includes('session-events')?dataset.timelineSessionEvents?{dataset}:null:selector==='[data-timeline-session]'?dataset.timelineSession?{dataset}:null:selector==='[data-timeline-item]'?dataset.timelineItem?{dataset}:null:selector==='[data-timeline-folder]'?dataset.timelineFolder?{dataset}:null:dataset.timelineOpen?{dataset}:null}});
context.SpatialItemHistoryDesktop={get:id=>id==='canonical-note'?{title:'Launch note',relations:[]}:null,open:(id,options)=>calls.push(['item',id,options])};
summaryTimeline.record('file.open',{app:'dolphin',title:'Launch note',path:'/projects/site/launch.md',itemId:'canonical-note'});
summaryTimeline.record('assistant.use',{title:'Read the note',path:'/projects/site/launch.md',itemId:'canonical-note',chatId:'chat',turnId:'one',sourceIds:['canonical-note']});
summaryTimeline.render();
let rendered=make('#timelineEntries').innerHTML;
const sessionId=T.workSessions(summaryTimeline.snapshot().activity).find(s=>s.events.some(e=>e.itemId==='canonical-note')).id;
clickTimeline({timelineSession:sessionId});
rendered=make('#timelineEntries').innerHTML;
assert(rendered.includes('Session materials')&&rendered.includes('Latest recorded activity'));
assert(!rendered.includes('aria-label="Exact session events"'),'Chronology is secondary and starts collapsed');
assert.equal((rendered.match(/data-timeline-item="canonical-note"/g)||[]).length,1,'The same file used in Assistant is presented once');
assert(rendered.includes('Used in Assistant'),'Latest activity remains visible on the deduplicated material');
const id=summaryTimeline.snapshot().activity.find(e=>e.itemId==='canonical-note'&&e.type==='assistant.use').id;
clickTimeline({timelineItem:'canonical-note',timelineItemEvent:id});
assert(calls.some(call=>call[0]==='item'&&call[1]==='canonical-note'),'A material opens item history even when its latest action was an Assistant chat');
const beforeForeign=calls.length;clickTimeline({timelineItem:'outside-workspace',timelineItemEvent:id});assert.equal(calls.length,beforeForeign,'Inaccessible canonical items cannot be opened through a summary');
make('#timelineEntries').listeners.input({target:{closest:()=>({dataset:{timelineSessionNote:sessionId},value:'Continue <here> & review.'})}});
clickTimeline({timelineSession:sessionId});
assert(make('#timelineEntries').innerHTML.includes('Continue &lt;here&gt; &amp; review.'),'A saved note is visible and escaped on the closed card');
clickTimeline({timelineSession:sessionId});clickTimeline({timelineSessionEvents:sessionId});
assert(make('#timelineEntries').innerHTML.includes('aria-label="Exact session events"'),'The separate disclosure retains the full chronological event view');
assert(Object.values(JSON.parse(data.get('spatial-timeline-session-notes-v1'))).some(n=>n.text==='Continue <here> & review.'),'Existing note persistence is preserved');
console.log('Timeline summary UI passed: collapsed notes, deduplicated materials, latest activity, item actions, Workspace privacy and secondary chronology.');

summaryTimeline.record('assistant.output',{title:'Converted file',path:'/projects/site/Assistant',chatId:'chat',turnId:'conversion'});
const folderEvent=summaryTimeline.snapshot().activity.find(e=>e.turnId==='conversion');
clickTimeline({timelineFolder:folderEvent.id});pending.splice(0).forEach(fn=>fn());
assert(calls.some(call=>call[0]==='folder'&&call[2]==='/projects/site/Assistant'),'A recorded output folder opens Files instead of only its chat');
summaryTimeline.record('file.folder',{app:'dolphin',base:'dolphin',title:'Assistant',path:'/projects/site/Assistant'});
const revisitedFolder=summaryTimeline.snapshot().activity.find(e=>e.type==='file.folder'&&e.path==='/projects/site/Assistant');
const beforeRevisit=calls.filter(call=>call[0]==='folder'&&call[2]==='/projects/site/Assistant').length;
summaryTimeline.render();
assert(make('#timelineEntries').innerHTML.includes('data-timeline-folder="'+revisitedFolder.id+'"'),'The output folder material refers to its latest recorded visit');
clickTimeline({timelineFolder:revisitedFolder.id});pending.splice(0).forEach(fn=>fn());
assert.equal(calls.filter(call=>call[0]==='folder'&&call[2]==='/projects/site/Assistant').length,beforeRevisit+1,'A later folder visit does not break the known output folder action');
console.log('Timeline output folder navigation passed.');

// Use the production content adapter and the real desktop file read/resolve API.
// There is deliberately no entries() stub: desktop file listings are private.
const searchFiles=new Map(),fileReads=[],fileResolves=[];
context.SpatialDesktopFiles={
  read:(path,{workspace})=>{fileReads.push([path,workspace]);const file=searchFiles.get(path);return file?.workspace===workspace?{...file}:null;},
  resolve:(binding,{workspace})=>{fileResolves.push([binding.itemId,workspace]);const file=[...searchFiles.values()].find(file=>file.itemId===binding.itemId&&file.workspace===workspace&&binding.workspace===workspace);return file?{...file}:null;}
};
const searchRecord={id:'search-source',title:'Current source',relations:[],text:'Current retained text',currentVersion:'v2',versions:[{id:'v1',title:'Original <source>',text:'The <b>hyacinth</b> handoff & review is recorded here.'},{id:'v2',title:'Current source',text:'Current retained text'}]};
const searchHistory=new Map([['search-source',searchRecord]]);
context.SpatialItemHistoryDesktop={get:id=>searchHistory.get(id)||null,open:(id,options)=>calls.push(['item',id,options])};
const sourcePath='/projects/site/renamed-source.md';
searchFiles.set(sourcePath,{workspace:'general',project:'site',path:sourcePath,directory:'/projects/site',name:'renamed-source.md',itemId:'search-source',kind:'document',content:'Current <i>gentian</i> follow-up & review.',revision:2});
summaryClock+=20*60000;
summaryTimeline.record('project.open',{title:'Website',project:'site'});
summaryTimeline.record('file.open',{app:'dolphin',title:'Original source',path:'/projects/site/old-source.md',itemId:'search-source',itemVersion:'v1'});
summaryTimeline.record('assistant.use',{title:'Review input',path:'/projects/site/old-source.md',itemId:'search-source',itemVersion:'v1',chatId:'search-chat',turnId:'search-turn'});
summaryTimeline.record('assistant.output',{title:'Surrounding output',path:'/projects/site/Assistant/search-output.md',itemId:'search-output'});
const searchSession=T.workSessions(summaryTimeline.snapshot().activity).find(session=>session.events.some(event=>event.itemId==='search-source'));
make('#timelineQuery').value='hyacinth';make('#timelineQuery').listeners.input();
let searchHTML=make('#timelineSearchResults').innerHTML;
assert.equal(make('#timelineSearchResults').hidden,false);
assert(searchHTML.includes('1 matching session')&&searchHTML.includes('Saved version text: Original &lt;source&gt;'),'The result identifies the matching material and saved-text reason');
assert(searchHTML.includes('&lt;b&gt;hyacinth&lt;/b&gt; handoff &amp; review'),'Content snippets are escaped before rendering');
assert(!searchHTML.includes('<b>hyacinth</b>'),'File text cannot become active result markup');
assert(fileResolves.some(([id,workspace])=>id==='search-source'&&workspace==='general'),'Content search resolves canonical identity through the production file API');
const clickSearch=dataset=>make('#timelineSearchResults').listeners.click({target:{closest:selector=>selector==='[data-timeline-search-session]'&&dataset.timelineSearchSession||selector==='[data-timeline-search-match]'&&dataset.timelineSearchMatch!==undefined?{dataset}:null}});
const savedIndex=searchHTML.match(/data-timeline-search-match="(\d+)"/)[1];
clickSearch({timelineSearchMatch:savedIndex});
assert(calls.some(call=>call[0]==='item'&&call[1]==='search-source'&&call[2].versionId==='v1'&&call[2].workspace==='general'),'A saved-text result opens the exact matched version rather than the latest edit');
clickSearch({timelineSearchSession:searchSession.id});
assert.equal(make('#timelineDay').value,T.dayKey(searchSession.time));
assert(make('#timelineEntries').innerHTML.includes('data-timeline-session="'+searchSession.id+'" aria-expanded="true"'),'Show session opens the original full session');
clickTimeline({timelineSessionEvents:searchSession.id});
const surrounding=make('#timelineEntries').innerHTML;
assert(surrounding.includes('aria-label="Exact session events"')&&surrounding.includes('Surrounding output'),'Showing the matching session retains nonmatching outputs and its full chronology');
assert(make('[data-timeline-session="'+searchSession.id+'"]').focused,'Show session returns keyboard focus to its session card');

make('#timelineQuery').value='gentian';make('#timelineQuery').listeners.input();
searchHTML=make('#timelineSearchResults').innerHTML;
assert(searchHTML.includes('Current file text: renamed-source.md')&&searchHTML.includes('&lt;i&gt;gentian&lt;/i&gt; follow-up &amp; review'),'Current file matches retain their current name and escape their explanation');
const currentIndex=searchHTML.match(/data-timeline-search-match="(\d+)"/)[1];
const beforeCurrent=calls.length;clickSearch({timelineSearchMatch:currentIndex});
assert(fileReads.some(([path,workspace])=>path===sourcePath&&workspace==='general'));
assert(calls.slice(beforeCurrent).some(call=>call[0]==='folder'&&call[2]==='/projects/site')&&calls.slice(beforeCurrent).some(call=>call[0]==='file'&&call[2]==='renamed-source.md'),'A current content result follows stable identity to the renamed file and opens it');

make('#timelineQuery').value='';make('#timelineQuery').listeners.input();
make('#timelineEntries').listeners.input({target:{closest:()=>({dataset:{timelineSessionNote:searchSession.id},value:'Continue the <orbital> handoff & review.'})}});
make('#timelineQuery').value='orbital';make('#timelineQuery').listeners.input();
searchHTML=make('#timelineSearchResults').innerHTML;
assert(searchHTML.includes('<b>Session note</b>')&&searchHTML.includes('Continue the &lt;orbital&gt; handoff &amp; review.'),'A note-only match states its reason and renders saved text safely');
assert(make('#timelineEntries').innerHTML.includes('Note matches'),'A note-only hit is not labelled as zero matching activity');
clickSearch({timelineSearchSession:searchSession.id});
assert(make('#timelineEntries').innerHTML.includes('Surrounding output'),'A note-only result also returns to the full surrounding session');
const beforeScope=calls.length;context.activeWorkspace='work';clickSearch({timelineSearchMatch:currentIndex});
assert.equal(calls.length,beforeScope,'A stale content action cannot open material after changing Workspace');
summaryTimeline.render();
assert(make('#timelineSearchResults').innerHTML.includes('0 matching sessions'),'Another Workspace cannot search a previous Workspace’s notes or file text');
context.activeWorkspace='general';make('#timelineQuery').value='';summaryTimeline.render();
assert(make('#timelineSearchResults').hidden&&make('#timelineSearchResults').innerHTML==='','Clearing search restores the ordinary Timeline and removes stale result actions');
console.log('Timeline search UI passed: production source adapter, escaped note/content reasons, full-session navigation, saved-version and renamed current-file actions, focus and Workspace isolation.');

const createPath='/projects/site/new-output.md',createdFile={workspace:'general',project:'site',path:createPath,name:'new-output.md',itemId:'new-output',kind:'document'};
searchHistory.set('new-output',{id:'new-output',title:'new-output.md',currentVersion:'created-v1',versions:[{id:'created-v1',title:'new-output.md',text:'Created file text'}],relations:[]});
const filesChanged=windowListeners.get('spatial-files-change');
assert.equal(typeof filesChanged,'function');
const beforeCreate=summaryTimeline.snapshot().activity.length;
filesChanged({detail:{workspace:'general',action:'create',items:[{workspace:'general',project:'site',path:'/projects/site/Folder',name:'Folder',itemId:'folder-id',kind:'folder'},createdFile]}});
const createdEvents=summaryTimeline.snapshot().activity.filter(event=>event.itemId==='new-output');
assert.equal(summaryTimeline.snapshot().activity.length,beforeCreate+1,'Creating a real file records activity while creating its containing folder does not claim a saved file');
assert.equal(createdEvents.length,1);assert.equal(createdEvents[0].type,'file.save');assert.equal(createdEvents[0].path,createPath);assert.equal(createdEvents[0].itemVersion,'created-v1');assert.equal(createdEvents[0].project,'site');
filesChanged({detail:{workspace:'general',action:'save',items:[createdFile]}});
assert.equal(summaryTimeline.snapshot().activity.filter(event=>event.itemId==='new-output').length,1,'Ordinary autosave notifications cannot produce per-keystroke Timeline saves');
filesChanged({detail:{workspace:'work',action:'create',items:[{...createdFile,workspace:'work',itemId:'foreign-created'}]}});
assert(!summaryTimeline.snapshot().activity.some(event=>event.itemId==='foreign-created'),'A foreign Workspace file notification cannot enter the active Timeline');
clickTimeline({timelineOpen:createdEvents[0].id});
assert(calls.some(call=>call[0]==='item'&&call[1]==='new-output'&&call[2].versionId==='created-v1'),'A created-file save event reopens the exact captured output version');
console.log('Timeline file creation passed: real files, canonical version IDs, folder exclusion, autosave coalescing, Workspace ownership and exact output reopening.');

(async()=>{
  // Finish a pending attachment read while the query is cleared in another
  // Workspace, then return to the same cache signature and search again.
  let releaseRead,readCount=0;
  context.SpatialStashFiles={get:()=>{readCount++;return new Promise(resolve=>{releaseRead=resolve;});}};
  const attachmentPath='/projects/site/imported.txt';
  searchFiles.set(attachmentPath,{workspace:'general',project:'site',path:attachmentPath,directory:'/projects/site',name:'imported.txt',itemId:'imported-text',kind:'document',content:null,revision:1,attachment:{key:'imported-text-key',mime:'text/plain'}});
  summaryClock+=20*60000;
  summaryTimeline.record('file.open',{app:'dolphin',title:'Imported text',path:attachmentPath,itemId:'imported-text'});
  make('#timelineQuery').value='violet';make('#timelineQuery').listeners.input();
  assert(make('#timelineSearchResults').innerHTML.includes('Reading saved text…'),'An asynchronous imported file read has a visible loading status');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(readCount,1);
  make('#timelineQuery').value='';summaryTimeline.render();context.activeWorkspace='work';summaryTimeline.render();
  releaseRead(new Blob(['The violet handoff was captured in imported text.']));
  await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
  context.activeWorkspace='general';make('#timelineQuery').value='violet';summaryTimeline.render();
  const afterReturn=make('#timelineSearchResults').innerHTML;
  assert(afterReturn.includes('Current file text: imported.txt')&&afterReturn.includes('violet handoff'),'A read finishing in another Workspace remains searchable when its owning Workspace returns');
  assert(!afterReturn.includes('Reading saved text…'),'A completed read does not leave its original signature permanently loading');
  assert.equal(readCount,1,'Returning to the same file state reuses the completed read');
  console.log('Timeline asynchronous text search passed: cleared-query Workspace transitions cannot strand a completed attachment read.');
})().catch(error=>{console.error(error);process.exitCode=1;});
