const assert=require('node:assert/strict');
const R=require('../dist/retired-apps.js');
const copy=value=>JSON.parse(JSON.stringify(value));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const leaf=name=>({kind:'window',name});
const files={work:{files:{'/home/demo/Pictures/screenshot.png':{attachment:{key:'binary-1'},itemId:'image-1'}},fileOperations:{trash:[{itemId:'monitor',content:'Calculator notes'}],directoryIds:{'/home/demo/software':'directory-1'}}}};
const project={name:'Calculator',root:'/home/demo/Projects/Calculator',apps:['calculator','notes'],modes:{main:{apps:['software--9','notes'],description:'Use Discover'}},files:{'monitor.txt':'Calculator and screenshot'},archiveFiles:{'screenshot.png':{key:'binary-1'}},stash:[{id:'software',content:'Saved output'}],resources:[{title:'System Monitor'}],note:'Do not delete calculator notes'};
const snapshot={schema:5,activeWorkspace:'work',frontApp:'calculator--1',
 workspaceStates:{work:{calculator:'open','software--9':'minimized','utility-copy':'open',notes:'open','notes--calculator':'minimized',monitoring:'open'}},
 windowLayouts:{work:{calculator:{width:400},notes:{width:800}}},
 maximized:{monitor:true,notes:false},
 appWindows:{work:{calculator:{kind:'calculator',value:'12'},'custom-capture':{kind:'screenshot'},notes:{kind:'notes',notes:[{text:'Calculator screenshot software monitor app-preview'}]}}},
 independent:{instances:{'utility-copy':'calculator','utility-copy-2':'utility-copy','notes--calculator':'notes'},membership:{work:{'utility-copy-2':true,notes:true}},content:{work:{frames:{'utility-copy':{markup:'retired'},notes:{markup:'calculator text'}},note:'scratch screenshot',history:[{app:'calculator',content:'An old calculation'}],systemFields:['monitor']}},projects:{work:'Calculator'},sequence:92},
 desktopPages:{work:{windows:{calculator:1,notes:2},owners:{'software--9':1,notes:1},fullscreen:{monitor:{page:2},notes:{page:4}},activeFullscreen:{1:'monitor',2:'notes'},active:2,columns:{Calculator:[1,2]}}},
 tileSessions:{'work:1':{root:{kind:'split',axis:'x',ratio:.5,a:leaf('calculator'),b:leaf('notes'),custom:'keep'},floating:{screenshot:true,notes:true},parked:{calculator:{reason:'cover'},notes:{target:'calculator',fullscreen:'software',reason:'cover'}},focus:{name:'notes',root:{kind:'split',a:leaf('software'),b:leaf('notes')},parked:['screenshot','notes'],transferred:{monitor:1,notes:2},display:1},fullscreen:{name:'app-preview',root:leaf('notes')}},'work:2':{root:{kind:'split',a:leaf('notes'),b:leaf('browser'),custom:'survives'},focus:{name:'calculator'},parked:{}}},
 projectWindowSessions:{'work:Calculator:main':{apps:['calculator','custom-capture'],states:{calculator:'open'},geometry:{calculator:{}},displays:{monitor:2},pages:{software:3},savedAt:40}},
 projects:{Calculator:project},
 displayAssignments:{work:{apps:{calculator:2,notes:1},areas:{ai:2},sideAreaSetups:{'displays:1|2':true}}},
 displayRoles:{version:2,setups:{pair:{roles:{1:'main',2:'side'}}},workspaces:{work:{displays:{2:{windows:['screenshot','notes','utility-copy-2'],widgets:[{id:'calculator',text:'saved checklist'}],folders:['/home/demo/software'],note:'Calculator scratch note',assistant:{allowed:true,task:'Use Calculator',result:'Saved screenshot',outputs:['screenshot','notes'],context:{folder:'/home/demo/monitor'}}}}}}},
 customWorkspaces:{work:{rack:['calculator','notes'],favorites:[['calculator','Calculator'],['Spectacle','Capture'],['Discover','Software'],['System Monitor','Processes'],['Calculator','Calculator'],['notes','Calculator']],label:'Calculator'}},
 downloads:files,itemHistory:[{app:'calculator',path:'/home/demo/screenshot.png'}],workingMemory:{items:[{id:'monitor',content:'Calculator'}]},areaContents:{work:{ai:{chat:'Open Calculator'}}},noteDraft:'Calculator screenshot',notificationsHtml:'System Monitor completed'};
const original=copy(snapshot);freeze(snapshot);
const filtered=R.filterSnapshot(snapshot);
assert.deepEqual(snapshot,original,'Filtering must not mutate an incoming packet');
assert.deepEqual(Object.keys(filtered.workspaceStates.work),['notes','notes--calculator','monitoring']);
assert.deepEqual(Object.keys(filtered.appWindows.work),['notes']);
assert.deepEqual(filtered.independent.instances,{'notes--calculator':'notes'});
assert.deepEqual(filtered.independent.membership.work,{notes:true});
assert.deepEqual(filtered.independent.content.work.frames,{notes:{markup:'calculator text'}});
assert.equal(filtered.independent.sequence,92);assert.deepEqual(filtered.independent.projects,snapshot.independent.projects);
assert.deepEqual(filtered.independent.content.work.history,snapshot.independent.content.work.history);
assert.equal(filtered.independent.content.work.note,'scratch screenshot');
assert.equal(filtered.frontApp,null);assert.deepEqual(filtered.maximized,{notes:false});assert.deepEqual(filtered.windowLayouts.work,{notes:{width:800}});
assert.deepEqual(filtered.desktopPages.work.windows,{notes:2});assert.deepEqual(filtered.desktopPages.work.owners,{notes:1});
assert.deepEqual(filtered.desktopPages.work.activeFullscreen,{2:'notes'});assert.equal(filtered.desktopPages.work.active,2);assert.deepEqual(filtered.desktopPages.work.columns,{Calculator:[1,2]});
const tile=filtered.tileSessions['work:1'];assert.deepEqual(tile.root,leaf('notes'));assert.deepEqual(tile.floating,{notes:true});assert.deepEqual(tile.parked,{notes:{reason:'cover'}});
assert.deepEqual(tile.focus.root,leaf('notes'));assert.deepEqual(tile.focus.parked,['notes']);assert.deepEqual(tile.focus.transferred,{notes:2});assert.equal(tile.fullscreen,null);
assert.equal(filtered.tileSessions['work:2'].root.custom,'survives');assert.equal(filtered.tileSessions['work:2'].focus,null);
assert.deepEqual(filtered.projectWindowSessions['work:Calculator:main'],{apps:[],states:{},geometry:{},displays:{},pages:{},savedAt:40},'An emptied saved session stays empty instead of reseeding defaults');
assert.deepEqual(filtered.projects.Calculator.apps,['notes']);assert.deepEqual(filtered.projects.Calculator.modes.main.apps,['notes']);
for(const field of ['files','archiveFiles','stash','resources'])assert.equal(filtered.projects.Calculator[field],snapshot.projects.Calculator[field],'Saved file payloads are neither traversed nor cloned');
assert.equal(filtered.projects.Calculator.note,project.note);assert.equal(filtered.projects.Calculator.name,'Calculator');
assert.deepEqual(filtered.displayAssignments.work.apps,{notes:1});assert.deepEqual(filtered.displayAssignments.work.areas,{ai:2});assert.deepEqual(filtered.displayAssignments.work.sideAreaSetups,{'displays:1|2':true});
const side=filtered.displayRoles.workspaces.work.displays[2];assert.deepEqual(side.windows,['notes']);assert.deepEqual(side.assistant.outputs,['notes']);assert.equal(side.assistant.allowed,true);assert.equal(side.assistant.result,'Saved screenshot');
assert.deepEqual(side.widgets,snapshot.displayRoles.workspaces.work.displays[2].widgets);assert.equal(side.note,'Calculator scratch note');
assert.deepEqual(filtered.customWorkspaces.work.favorites,[['notes','Calculator']]);assert.deepEqual(filtered.customWorkspaces.work.rack,['notes']);
for(const field of ['downloads','itemHistory','workingMemory','areaContents','noteDraft','notificationsHtml'])assert.equal(filtered[field],snapshot[field]);
assert.equal(R.filterSnapshot(null),null);assert.equal(R.filterValue('__proto__',{calculator:'keep'}).calculator,'keep');
assert.equal(R.isRetired('calculator--practice-1'),true);assert.equal(R.isRetired('notes--calculator'),false);assert.equal(R.isRetired('monitoring'),false);
const aliased=R.filterSnapshot({workspaceStates:{work:{copy:'open',second:'open',notes:'open'}},independent:{instances:{copy:'custom-capture',second:'copy'}},appWindows:{work:{'custom-capture':{kind:'screenshot'},notes:{kind:'notes'}}}});
assert.deepEqual(aliased.workspaceStates.work,{notes:'open'});assert.deepEqual(aliased.independent.instances,{});assert.deepEqual(aliased.appWindows.work,{notes:{kind:'notes'}},'Retired model-kind aliases must seed the transitive instance closure');

function store(values={},fail=false){
 const data=new Map(Object.entries(values)),reads=[],writes=[];
 const target={get length(){assert.equal(this,target);return data.size;},getItem(key){assert.equal(this,target);reads.push(key);return data.has(key)?data.get(key):null;},setItem(key,value){assert.equal(this,target);if(fail)throw Error('Quota exceeded');writes.push(key);data.set(key,String(value));},removeItem(key){data.delete(key);},key(index){return [...data.keys()][index]??null;}};
 return {target,data,reads,writes};
}
const rawFiles=' { "work": { "file": "Calculator screenshot" } } ',rawUnknown=' { "calculator": "untouched" } ';
const saved=store({'spatial-workspace-app-states-v1':JSON.stringify(original.workspaceStates),'spatial-independent-sessions-v1':JSON.stringify(original.independent),'spatial-app-windows-v1':JSON.stringify(original.appWindows),'spatial-downloads-v1':rawFiles,['__proto__']:rawUnknown,'unrelated':rawUnknown,'spatial-desktop-layout-v3':'invalid JSON'});
const facade=R.storage(saved.target);assert.equal(R.storage(saved.target),facade);assert.equal(facade.length,saved.data.size);
assert.deepEqual(JSON.parse(facade.getItem('spatial-workspace-app-states-v1')).work,{notes:'open','notes--calculator':'minimized',monitoring:'open'});
assert.equal(saved.data.get('spatial-downloads-v1'),rawFiles);assert.equal(facade.getItem('__proto__'),rawUnknown);assert.equal(facade.getItem('unrelated'),rawUnknown);assert.equal(facade.getItem('spatial-desktop-layout-v3'),'invalid JSON');
const readsBefore=saved.reads.length;facade.getItem('unrelated');facade.setItem('unrelated',rawUnknown);assert.equal(saved.reads.length,readsBefore+1,'Ordinary preferences must not parse large session snapshots on every access');
facade.setItem('spatial-independent-sessions-v1',JSON.stringify({instances:{'new-alias':'monitor'}}));facade.setItem('spatial-workspace-app-states-v1',JSON.stringify({work:{'new-alias':'open',notes:'open'}}));
assert.deepEqual(JSON.parse(facade.getItem('spatial-workspace-app-states-v1')),{work:{notes:'open'}});assert.equal(saved.data.get('unrelated'),rawUnknown);
const quota=store({'spatial-workspace-app-states-v1':JSON.stringify({work:{calculator:'open',notes:'open'}})},true),safe=R.storage(quota.target);
assert.deepEqual(JSON.parse(safe.getItem('spatial-workspace-app-states-v1')),{work:{notes:'open'}},'A failed best-effort migration must still read safely');
assert.throws(()=>safe.setItem('spatial-workspace-app-states-v1','{}'),/Quota exceeded/,'Ordinary write failures must reach transactional callers');
const real=store({'practice:spatial-workspace-app-states-v1':JSON.stringify({work:{calculator:'open',notes:'open'}}),'spatial-workspace-app-states-v1':JSON.stringify({work:{calculator:'open'}}),'practice:spatial-downloads-v1':rawFiles});
const guide={getItem:key=>real.target.getItem('practice:'+key),setItem:(key,value)=>real.target.setItem('practice:'+key,value)};R.storage(guide);
assert.deepEqual(JSON.parse(real.data.get('practice:spatial-workspace-app-states-v1')),{work:{notes:'open'}});assert.deepEqual(JSON.parse(real.data.get('spatial-workspace-app-states-v1')),{work:{calculator:'open'}});assert.equal(real.data.get('practice:spatial-downloads-v1'),rawFiles);

const received=[],runtime={persistIncomingDesktopState(value){received.push(value);assert(!('calculator'in value.appWindows.work),'Outer app-window hydration must receive the filtered packet');return 'persisted';},applyDesktopSyncState(value){received.push(value);return 'applied';},captureDesktopSyncState(){return original;}};
R.installSyncGuards(runtime);const wrapped=runtime.persistIncomingDesktopState;R.installSyncGuards(runtime);assert.equal(runtime.persistIncomingDesktopState,wrapped);
assert.equal(runtime.persistIncomingDesktopState(original),'persisted');assert.equal(runtime.applyDesktopSyncState(original),'applied');assert.equal(received.length,2);assert.equal(received[0].downloads,original.downloads);assert.equal(runtime.captureDesktopSyncState().frontApp,null);
const previous=runtime.persistIncomingDesktopState;runtime.persistIncomingDesktopState=function(value){assert(!('calculator'in value.appWindows.work));return previous(value);};R.installSyncGuards(runtime);assert.equal(runtime.persistIncomingDesktopState(original),'persisted');
const fs=require('node:fs'),index=fs.readFileSync(require.resolve('../dist/index.html'),'utf8'),shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
assert(index.indexOf('src="retired-apps.js')<index.indexOf('src="desktop-shell.js'),'Saved-session filtering must load before shell startup');
assert(index.indexOf('SpatialRetiredApps.installSyncGuards()')>index.indexOf('src="display-role-desktop.js'),'Live guards must wrap the final outer display/app-window consumers');
assert.match(shell,/const desktopStorage\s*=\s*SpatialRetiredApps\.storage\(/,'Startup hydration must use the filtered, Guide-aware storage facade');
console.log('Retired utility cleanup passed: typed saved-session migration, aliases, split/fullscreen/Side state, live sync guards, scoped Guide storage, quota fallback and ordinary file/history preservation.');
