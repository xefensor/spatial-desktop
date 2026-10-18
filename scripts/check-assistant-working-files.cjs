const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../dist/working-memory.js'),F=require('../dist/stash-files.js'),H=require('../dist/home-folders.js'),Folder=require('../dist/folder-files.js');
const code=fs.readFileSync(require.resolve('../dist/working-memory-desktop.js'),'utf8');
const section=(start,end)=>code.slice(code.indexOf(start),code.indexOf(end,code.indexOf(start)));
const profiles={work:{home:'/home/work',folders:[['Documents','Folder','folder']]},school:{home:'/home/work/Workspaces/school',folders:[]}};
const projects={launch:{root:'/home/work/Projects/launch',originWorkspace:'work',files:[],resources:[]},other:{root:'/home/work/Projects/other',originWorkspace:'work',files:[],resources:[]},private:{root:'/mnt/private',originWorkspace:'school',files:[],resources:[]}};
const workspace=M.scope('work'),project=M.scope('work','launch'),memory=M.create({},()=>100,'assistant-files');
const homeOwner={root:profiles.work.home,files:[]},owners=new Map([[workspace,homeOwner],[project,projects.launch]]),messages=[],captures=[],events=[];
const context=vm.createContext({M,F,crypto:require('node:crypto').webcrypto,workspaceProfiles:profiles,projectSpaces:projects,scope:()=>workspace,allowed:()=>true,itemsFor:key=>memory.items(key),ownerFor:key=>owners.get(key),projectFor:key=>projects[JSON.parse(key)[1]],addItem:(key,value)=>memory.add(key,value),appInfo:{},feedback:text=>messages.push(text),save(){for(const [key,owner]of owners)F.materialize(owner,memory.items(key).concat(JSON.parse(key)[1]?context.resourceItems(key):[]));return true;},persistResources(){},recordSaved(){},resetShelfFilters(){},render(){},current:workspace,SpatialFolderDesktop:{relativeDirectory:()=> 'User selected folder'},SpatialItemHistoryDesktop:{capture:(item,options)=>captures.push({item,options})},SpatialTimelineDesktop:{record:(type,value)=>events.push({type,value})}});
vm.runInContext(section('function resourceItems(','  function itemsFor('),context);
vm.runInContext(section('async function keepContext(','  function dropIntoStash('),context);
const keep=(value,key=workspace,options)=>{context.value=value;context.target=key;context.options=options;return vm.runInContext('keepContext(value,target,options)',context);};
const output={title:'Launch checklist',text:'- [ ] Test navigation',source:{label:'Assistant',workspace:'work',project:'launch',app:'ai-demo'},derivedFrom:[{itemId:'brief-original',versionId:'brief-v1'}],chatId:'chat-1',turnId:'turn-1'};

(async()=>{
  assert.equal(await keep(output,workspace,{folder:'/home/work/Assistant'}),true);
  const saved=F.list(homeOwner)[0];assert.equal(F.path(homeOwner,saved),'/home/work/Assistant/Launch checklist.md');assert.equal(saved.content,output.text);
  assert.equal(memory.items(workspace)[0].relativeDirectory,'Assistant');
  assert.equal(captures[0].options.relation,'derivedFrom');assert.deepEqual(captures[0].options.related,output.derivedFrom,'The ordinary destination retains exact input-version provenance');
  assert.equal(events[0].value.chatId,'chat-1');assert.equal(saved.source.project,'launch','Destination does not replace the output origin');
  assert.equal(await keep({...output,title:'Project checklist'},project,{folder:projects.launch.root+'/Assistant'}),true);
  assert.equal(F.path(projects.launch,F.list(projects.launch)[0]),projects.launch.root+'/Assistant/Project checklist.md');
  assert.equal(F.list(homeOwner).length,1,'Saving a Project output does not also add a Workspace copy');
  assert.equal(await keep({...output,title:'Ordinary note'}),true);assert.equal(memory.items(workspace).find(item=>item.title==='Ordinary note').relativeDirectory,'User selected folder','Normal Files capture retains its current folder behavior');
  const before=memory.items(workspace).length;
  for(const folder of [profiles.school.home+'/Assistant','/home/work//Workspaces/school/Assistant',projects.launch.root+'/Assistant',projects.other.root+'/Assistant','/home/work/Assistant/../Documents','relative/Assistant','/outside/Assistant'])assert.equal(await keep(output,workspace,{folder}),false,'A Workspace save cannot reach '+folder);
  for(const folder of ['/home/work/Assistant',projects.other.root+'/Assistant','/mnt/private/Assistant'])assert.equal(await keep(output,project,{folder}),false,'A Project save cannot reach '+folder);
  owners.set(M.scope('work','private'),projects.private);assert.equal(await keep(output,M.scope('work','private'),{folder:'/mnt/private/Assistant'}),false,'A forged scope cannot save into another Workspace’s external Project');
  assert.equal(memory.items(workspace).length,before,'Rejected destinations never create fallback root files');
  context.openProjectNames=()=>['private'];assert.equal(await keep({...output,title:'Explicitly opened Project'},M.scope('work','private'),{folder:'/mnt/private/Assistant'}),true,'An explicitly opened Project is legal in the current Workspace');context.openProjectNames=()=>[];
  projects.nested={root:profiles.school.home+'/Projects/shared',originWorkspace:'school',files:[],resources:[]};const nested=M.scope('work','nested');owners.set(nested,projects.nested);
  context.openProjectNames=value=>{assert.equal(value,'work','Project access follows the captured Workspace');return ['nested'];};
  assert.equal(await keep({...output,title:'Opened nested Project'},nested,{folder:projects.nested.root+'/Assistant'}),true,'An explicitly opened Project root more specific than a foreign Home is legal');
  profiles.deeper={home:projects.nested.root+'/Assistant/private',folders:[]};
  assert.equal(await keep(output,nested,{folder:profiles.deeper.home+'/Outputs'}),false,'A foreign Home deeper than the opened Project remains blocked');delete profiles.deeper;context.openProjectNames=()=>[];

  // A captured destination survives a Files navigation change while the source
  // bytes load, but removal of that owning Project safely stops the save.
  let finish;context.F={...F,get:()=>new Promise(resolve=>{finish=resolve;})};
  const pending=keep({...output,title:'Delayed image',attachment:{kind:'image',key:'stash-delayed',filename:'Image.png'}},project,{folder:projects.launch.root+'/Assistant'});
  context.SpatialFolderDesktop.relativeDirectory=()=> 'Changed while waiting';finish(new Blob(['image']));assert.equal(await pending,true);
  assert.equal(projects.launch.resources.at(0)[4].relativeDirectory,'Assistant','A delayed attachment keeps its reviewed folder');
  assert(F.list(projects.launch).some(file=>F.path(projects.launch,file)===projects.launch.root+'/Assistant/Delayed image.png'),'The copied attachment is an actual file in the same ordinary destination');
  const blocked=keep({...output,title:'Unavailable destination',attachment:{kind:'image',key:'stash-later',filename:'Image.png'}},project,{folder:projects.launch.root+'/Assistant'});
  owners.delete(project);finish(new Blob(['image']));assert.equal(await blocked,false);assert(!projects.launch.resources.some(row=>row[0]==='Unavailable destination'));

  // Both Files renderers expose empty working folders without a synthetic
  // collection, and retained notes remain actual files below those folders.
  const roots=vm.createContext({F,M,activeWorkspace:'work',workspaceProfiles:profiles,projectSpaces:projects,ownerFor:key=>key===workspace?homeOwner:owners.get(key)});
  vm.runInContext(section('function ownerAtFolder(','  function openSavedFile('),roots);
  assert(roots.fileRows('/home/work').some(row=>row[0]==='Assistant'&&row[3]==='/home/work/Assistant'));
  assert(roots.fileRows(projects.other.root).some(row=>row[0]==='Assistant'&&row[3]===projects.other.root+'/Assistant'));
  assert(roots.fileRows('/home/work/Assistant').some(row=>row[0]==='Launch checklist.md'));
  const folderCode=fs.readFileSync(require.resolve('../dist/folder-files.js'),'utf8'),at=folderCode.indexOf('  function rows(scope=key()){');
  const downloads=H.create(),fileRows=vm.createContext({key:()=>workspace,path:()=>'/home/work',F,owner:()=>homeOwner,projectSpaces:projects,workspaceProfiles:profiles,activeWorkspace:'work',workspaceDownloads:downloads,fileLocationRows:()=>[],projectRows:Folder.projectRows});
  vm.runInContext(folderCode.slice(at,folderCode.indexOf('  function go(',at)),fileRows);
  assert(fileRows.rows().some(row=>row[0]==='Assistant'&&row[2]==='folder'),'Interactive Files shows the same ordinary working directory');
  profiles.work.folders.push(['Assistant','Existing original file','document']);
  assert.equal(await keep(output,workspace,{folder:'/home/work/Assistant'}),false,'A static same-name file blocks the reserved destination');
  assert(roots.fileRows('/home/work').some(row=>row[0]==='Assistant'&&row[2]==='document'),'The Files projection preserves the actual same-name file');
  assert(!roots.fileRows('/home/work').some(row=>row[0]==='Assistant'&&row[2]==='folder'));
  profiles.work.folders.pop();
  homeOwner.stash.files.blocker={id:'blocker',name:'Assistant',kind:'file',content:'Keep this original',relativeDirectory:''};
  assert.equal(await keep(output,workspace,{folder:'/home/work/Assistant/Variants'}),false,'A retained same-name file also blocks nested Assistant outputs');
  assert.equal(roots.fileRows('/home/work').find(row=>row[0]==='Assistant')[2],'file');assert.equal(homeOwner.stash.files.blocker.content,'Keep this original');
  delete homeOwner.stash.files.blocker;
  context.workspaceDownloads=H.create();context.workspaceDownloads.add('/home/work','Assistant',{workspace:'work',content:'An ordinary original'});
  assert.equal(await keep(output,workspace,{folder:'/home/work/Assistant'}),false,'A saved ordinary same-name file is not treated as a folder');
  assert.equal(H.standard.length,8,'The Assistant folder does not become an XDG standard folder');
  console.log('Assistant working files passed: visible ordinary folders, captured destinations, Workspace/Project isolation, rejected traversal, provenance, delayed bytes and normal Files behavior.');
})().catch(error=>{console.error(error);process.exitCode=1;});
