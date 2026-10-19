const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const M=require('../dist/working-memory.js');
// Exercise the production render in both ownership modes without a Quick note
// element, then edit a row whose type is conveyed by its icon.
{
  const adapter=fs.readFileSync(require.resolve('../dist/working-memory-desktop.js'),'utf8');
  const fields=new Map(),field=name=>{if(!fields.has(name))fields.set(name,{});return fields.get(name);};
  const host={parentElement:null,querySelectorAll:()=>[],contains:()=>false},railEntry={};
  const projectTarget={prepend(item){item.parentElement=this;}},workspaceTarget={prepend(item){item.parentElement=this;}};
  const context={desktopSyncApplying:false,dropPosition:null,scope:()=>M.scope('work','demo'),current:'',allowed:()=>true,host,rail:{},railEntry,area:{append(item){item.parentElement=this;}},field,shelfViews:new Map(),filterShelf(){},itemMarkup(){},drafts:new Map(),selected:new Set(),editing:null,draftScope:'',lastRemoved:null,projectColumnActive:()=>true,$:name=>name==='#projectSpaceContent'?projectTarget:workspaceTarget,syncFolders(){},projectFor:()=>({name:'Demo'}),ownerFor:()=>({root:'/project'}),itemsFor:()=>[],F:{folder:owner=>owner.root+'/Stash'},signature:'',itemsSignature:'',workspaceProfiles:{work:{label:'Work'}},document:{activeElement:null},prepareControlSemantics(){}};
  vm.createContext(context);vm.runInContext(adapter.slice(adapter.indexOf('  function render(force=false){'),adapter.indexOf('  function collapse(')),context);
  context.render(true);assert.equal(host.parentElement,context.area);
  context.projectColumnActive=()=>false;context.scope=()=>M.scope('work');context.projectFor=()=>null;
  context.render(true);assert.equal(host.parentElement,context.area);
  const row={dataset:{memoryId:'note',memoryOwner:M.scope('work')},querySelector:()=>summary};
  const heading={},summary={querySelector:selector=>selector==='b'?heading:{title:'Note'},setAttribute(name,value){this[name]=value;}};
  context.expandedItems=new Set();context.itemFor=()=>({id:'note',scope:M.scope('work')});context.editItem=()=>({title:'Updated note'});context.save=()=>true;context.feedback=()=>{};
  vm.runInContext(adapter.slice(adapter.indexOf('  function persistInline(input){'),adapter.indexOf("  host.addEventListener('focusout'")),context);
  context.persistInline({closest:()=>row,dataset:{memoryInline:'title'},value:'Updated note'});
  assert.equal(heading.textContent,'Updated note');assert.equal(summary['aria-label'],'Updated note · Note');
}
// Legacy project notes become ordinary pinned items exactly once, including
// full shelves and notes that the user later edits or removes.
{
  const key=M.scope('work','migration'),memory=M.create({},()=>100,'migration');
  const note=memory.migrateQuickNote(key,'My original project wording.','Migration project');
  assert.equal(note.text,'My original project wording.');assert(note.pinned);
  assert.equal(note.source.project,'migration');assert.equal(memory.items(key).length,1);
  assert.equal(memory.search('original project wording','work')[0].id,note.id,'Migrated notes remain searchable through Stash');
  memory.edit(note.id,{text:'My updated wording.'});
  const restored=M.create(memory.snapshot(),()=>200,'reload');
  restored.migrateQuickNote(key,'My original project wording.','Migration project');
  assert.equal(restored.items(key).length,1);assert.equal(restored.get(note.id).text,'My updated wording.');
  restored.remove(note.id);restored.migrateQuickNote(key,'My original project wording.','Migration project');
  assert.equal(restored.items(key).length,0,'Removed migrated notes never reappear');
  const duplicate=M.create();const existing=duplicate.add(key,{title:'Project starting point',text:'Already saved',source:{label:'Migration project · Quick note'}});
  assert.equal(duplicate.migrateQuickNote(key,'Already saved','Migration project').id,existing.id);
  assert.equal(duplicate.items(key).length,1);assert(duplicate.get(existing.id).pinned);
  const full=M.create();for(let i=0;i<80;i++)full.add(key,{text:'Item '+i});
  assert.equal(full.migrateQuickNote(key,'Never lose this note','Migration project').text,'Never lose this note');
}
let now=new Date(2026,9,10,15).getTime();
const a=M.create({},()=>now,'display-a'), project=M.scope('work','launch'), workspace=M.scope('work'), privateScope=M.scope('personal','launch');
const first=a.add(project,{title:'Layout reference',text:'Keep the navigation clear.\nCheck keyboard focus.',source:{label:'Browser · Reference',address:'https://example.org/reference',app:'browser--2',desktop:2}});
assert(first);assert.equal(a.items(project).length,1);assert.equal(a.items(workspace).length,0);assert.equal(a.items(privateScope).length,0);
a.add(workspace,{title:'Workspace thought',text:'A note outside all projects.'});a.add(privateScope,{title:'Private reference',text:'Keep the navigation clear.'});
assert.equal(a.search('navigation','work').length,1,'Search never mixes workspaces');
assert.equal(a.search('reference today','work')[0].id,first.id);assert.equal(a.search('reference yesterday','work').length,0);
now+=86400000;assert.equal(a.search('reference yesterday','work')[0].id,first.id);
a.next(project,'Review keyboard navigation');assert.equal(a.nextStep(project),'Review keyboard navigation');assert.equal(a.nextStep(workspace),'');
const b=M.create(a.snapshot(),()=>now,'display-b');
const second=b.add(project,{title:'Alternative',text:'Keep the navigation clear.\nUse larger targets.',source:{address:'javascript:alert(1)'}});assert.equal(second.source.address,'','Executable URLs are rejected');
a.edit(first.id,{text:'Keep the navigation clear.\nCheck keyboard focus.',pinned:true});a.merge(b.snapshot());b.merge(a.snapshot());assert.equal(a.items(project).length,2);assert.deepEqual(a.snapshot(),b.snapshot(),'Concurrent additions and edits converge');
b.remove(first.id);a.merge(b.snapshot());assert(!a.items(project).some(x=>x.id===first.id));a.merge(M.create({version:1,records:{[first.id]:first}}).snapshot());assert(!a.items(project).some(x=>x.id===first.id),'An old monitor cannot resurrect a removed item');
a.restore(first.id);b.merge(a.snapshot());assert(b.items(project).some(x=>x.id===first.id));
const comparison=M.compare([a.get(first.id),a.get(second.id)]);assert.deepEqual(comparison.shared,['Keep the navigation clear.']);assert.deepEqual(comparison.onlyFirst,['Check keyboard focus.']);assert.deepEqual(comparison.onlySecond,['Use larger targets.']);assert.equal(M.compare([first]),null);
assert(M.compose([first]).includes('https://example.org/reference'),'Assembled notes retain source provenance');
a.visit(project,{title:'Notes · Plan',desktop:2,apps:['notes--3'],source:{app:'notes--3'}});a.visit(project,{title:'Notes · Plan',desktop:2,apps:['notes--3']});assert.equal(a.history(project).length,1,'Repeated clicks do not fill the history');
for(let i=0;i<40;i++){now+=61000;a.visit(project,{title:'Document '+i,desktop:i%3,apps:['notes--3']});}assert.equal(a.history(project).length,30);
const reloaded=M.create(JSON.parse(JSON.stringify(a.snapshot())));assert.deepEqual(reloaded.items(project),a.items(project));assert.equal(reloaded.nextStep(project),'Review keyboard navigation');
assert.doesNotThrow(()=>a.merge({version:1,records:{bad:{scope:'not json',kind:'item',updated:3}}}));assert.doesNotThrow(()=>M.source(null));
assert.equal(a.add(project,{text:'   '}),null);const bounded=M.create();for(let i=0;i<80;i++)assert(bounded.add(workspace,{text:'Item '+i}));assert.equal(bounded.add(workspace,{text:'Overflow'}),null);
const huge=M.create().add(project,{title:'x'.repeat(1000),text:'x'.repeat(20000)});assert.equal(huge.title.length,120);assert.equal(huge.text.length,12000);
const Setup=require('../dist/workspace-setup.js');assert(Setup.sessionKeys.includes('spatial-working-memory-v1'),'Clean/demo resets include the new memory');
// Run the real source-opening adapter: source windows must not overwrite a
// browser or file-manager instance owned by a different project.
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/working-memory-desktop.js'),'utf8');
const section=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)));
// The real drag handlers name the current scope, remain readable on rail, and
// release the hint when leaving/cancelling without taking over editable fields.
{
  const events={},globalEvents={},listen=(list,type,fn)=>(list[type]??=[]).push(fn);
  const surface=()=>({classes:new Set(),classList:{toggle(name,on){this.owner.classes[on?'add':'delete'](name);}},contains(target){return target===this;},addEventListener(type,fn){listen(events,type,fn);}});
  const host=surface(),rail=surface(),railEntry=surface();[host,rail,railEntry].forEach(node=>node.classList.owner=node);
  const hint={hidden:true,style:{},getBoundingClientRect:()=>({width:280,height:80})},title={},detail={};
  let destination=M.scope('work','launch');
  const context={host,rail,railEntry,area:{hidden:false},allowed:()=>true,scope:()=>destination,ownerFor:()=>({root:'/home/work/Launch'}),F:{folder:owner=>owner.root+'/Stash'},projectSpaces:{launch:{name:'Launch <review>'}},workspaceProfiles:{work:{label:'Work'}},dropHint:hint,dropTitle:title,dropDetail:detail,dropPosition:null,SpatialAIContext:require('../dist/ai-context.js'),window:{innerWidth:1200,innerHeight:800,addEventListener(type,fn){listen(globalEvents,type,fn);}},document:{addEventListener(type,fn){listen(globalEvents,type,fn);}}};
  vm.createContext(context);vm.runInContext(section('function label(','  function feedback('),context);vm.runInContext(section('  const acceptsDrop=','  async function keepContext('),context);
  let prevented=false;const event={target:host,clientX:1190,clientY:780,preventDefault(){prevented=true;},dataTransfer:{types:['text/plain'],dropEffect:''}};
  events.dragover[0](event);assert(prevented);assert.equal(title.textContent,'Copy into Launch <review> folder');assert.equal(title.innerHTML,undefined,'Project names are plain text');assert.equal(detail.textContent,'/home/work/Launch/Stash');assert.equal(hint.style.left,'912px');
  destination=M.scope('work');events.dragover[0](event);assert.equal(title.textContent,'Copy into Work workspace folder');
  events.dragleave[0]({relatedTarget:{}});assert(hint.hidden);assert(!rail.classes.has('is-drop-target'));
  for(const [type,event] of [['dragover',{target:{}}],['drop',{}],['dragend',{}],['pointercancel',{}],['blur',{}],['keydown',{key:'Escape'}]]){context.showDropTarget({clientX:50,clientY:50});globalEvents[type].forEach(fn=>fn(event));assert(hint.hidden,type+' clears the Stash hint');}
  prevented=false;events.dragover[0]({...event,target:{closest:()=>({})}});assert.equal(prevented,false);assert(hint.hidden,'Dropping over a Stash editor does not offer to create an attachment');
  for(const type of ['Files',context.SpatialAIContext.MIME]){prevented=false;events.dragover[0]({...event,target:{closest:()=>({})},dataTransfer:{types:[type]}});assert(prevented,type+' over the editor remains an explicit attachment, avoiding browser file navigation');assert.equal(hint.hidden,false);}
}
const calls=[];const sandbox={createAppInstance:base=>{calls.push(['create',base]);return base+'--new';},navigateBrowser:(...args)=>calls.push(['navigate',...args]),renderFileLocation:(...args)=>calls.push(['folder',...args]),openAppFile:(...args)=>calls.push(['file',...args]),feedback:text=>calls.push(['message',text]),appInfo:{notes:{}}};vm.createContext(sandbox);vm.runInContext(section('function openSource(',"  host.addEventListener('submit'"),sandbox);
sandbox.item={source:{address:'https://example.org/reference'}};vm.runInContext('openSource(item)',sandbox);assert.deepEqual(calls,[['create','browser'],['navigate','browser--new','https://example.org/reference']]);calls.length=0;
sandbox.item={source:{address:'/home/demo/Projects/test/notes.md'}};vm.runInContext('openSource(item)',sandbox);assert.deepEqual(calls,[['create','dolphin'],['folder','dolphin--new','/home/demo/Projects/test'],['file','dolphin--new','notes.md']]);
// Native Files reveal delegates layout ownership to Panels and keeps the live content host.
const widgetCalls=[],widgetSandbox={allowed:()=>true,render:()=>widgetCalls.push('render'),host:{scrollIntoView:options=>widgetCalls.push(['scroll',options.block])},requestAnimationFrame:fn=>fn(),SpatialPanels:{showWidget:(id,expanded)=>widgetCalls.push([id,expanded]),closeApplet:()=>widgetCalls.push('close')}};
vm.createContext(widgetSandbox);vm.runInContext(section('function collapse(','  function editor('),widgetSandbox);widgetSandbox.reveal();
assert.deepEqual(widgetCalls,['render',['files',true],['scroll','nearest']]);widgetSandbox.collapse();assert.equal(widgetCalls.at(-1),'close');
const migrated=M.create();const migrationKey=M.scope('work','example');migrated.next(migrationKey,'Check the exit sign');migrated.promoteNext(migrationKey,'Project notes');assert.equal(migrated.items(migrationKey)[0].text,'Check the exit sign');assert.equal(migrated.nextStep(migrationKey),'');migrated.promoteNext(migrationKey);assert.equal(migrated.items(migrationKey).length,1);
const linked=M.create();const sourceOnly=linked.add(workspace,{text:'',title:'Reference',source:{address:'https://example.org/source'}});assert.equal(linked.search('reference','work')[0].id,sourceOnly.id,'Source-only resources are searchable');
const mergedProject={name:'Example',note:'Autosaved thought',resources:[['Existing reference','Linked · /home/demo/reference.pdf','file','i-folder']]};
const unified={M,model:M.create(),projectSpaces:{example:mergedProject},selected:new Set(),persistProjectState(){},queueDesktopStateBroadcast(){},describeProjectResource:address=>['New reference','',address.startsWith('http')?'web':'file','i-link']};
vm.createContext(unified);vm.runInContext(section('function projectFor(','  const scope='),unified);unified.key=migrationKey;
vm.runInContext("addItem(key,{title:'Web source',text:'Check navigation',source:{address:'https://example.org/page?q=1#section',label:'Web · Reference',app:'browser--2'}})",unified);
assert.equal(mergedProject.resources.length,2);assert.equal(mergedProject.resources[1][0],'Existing reference');
let joined=vm.runInContext('itemsFor(key)',unified);assert.equal(joined[0].source.address,'https://example.org/page?q=1#section');assert.equal(joined[0].source.app,'browser--2');assert.equal(joined[1].source.address,'/home/demo/reference.pdf');
unified.resourceId=joined[0].id;vm.runInContext("editItem(resourceId,{title:'Edited reference',pinned:true})",unified);assert.equal(mergedProject.resources[0][0],'Edited reference');assert.equal(vm.runInContext('itemFor(resourceId).pinned',unified),true);assert.equal(mergedProject.note,'Autosaved thought');
console.log('Working memory passed: scope isolation, provenance, dated search, concurrent displays, deletion/undo, reload, limits, history, selected-content tools, reset and safe source reopening.');
// Typed resource metadata survives edits and display projection; untrusted previews are rejected.
const attachment={kind:'audio',src:'media/stash/closing-theme.wav',format:'Audio'};
mergedProject.resources.push(['Closing theme','Caption','audio','i-music',{attachment,text:'Caption'}]);
const audioItem=vm.runInContext('resourceItems(key).at(-1)',unified);assert.deepEqual(audioItem.attachment,attachment);
unified.audioId=audioItem.id;vm.runInContext("editItem(audioId,{title:'My title',text:'My caption'})",unified);
assert.deepEqual(mergedProject.resources.at(-1)[4].attachment,attachment);
const mediaSandbox={F:require('../dist/stash-files.js'),mediaUrls:new Map()};vm.createContext(mediaSandbox);vm.runInContext(section('function attachmentFor(','  function itemMarkup('),mediaSandbox);
for(const value of [attachment,{kind:'image',src:'images/philosophy/keychron-profile.jpg'},{kind:'document',src:'media/stash/brand-brief.html'}]){mediaSandbox.item={attachment:value};assert.ok(vm.runInContext('attachmentFor(item)',mediaSandbox));}
for(const value of [{kind:'image',src:'javascript:alert(1)'},{kind:'image',src:'media/stash/../../private.svg'},{kind:'document',src:'https://example.org/document.html'},{kind:'audio',src:'media/stash/not-audio.html'}]){mediaSandbox.item={attachment:value};assert.equal(vm.runInContext('attachmentFor(item)',mediaSandbox),null);}
console.log('Stash media passed: typed projection, caption edits preserve assets, safe preview sources.');
// Stash owns real virtual files in the project, including note bodies and link-file contents.
const F=require('../dist/stash-files.js');
const stashProject={root:'/home/demo/Projects/My project/',files:[]};
const noteFile={id:'saved-note',scope:project,kind:'item',title:'Review',text:'Keep the original body.',source:{},updated:1};
const linkFile={id:'saved-link',title:'Reference',resourceType:'web',text:'Navigation reference',source:{address:'https://example.org/page?x=1#intro'}};
const audioFile={id:'saved-audio',title:'Theme',text:'Music study',source:{},attachment};
assert.equal(F.materialize(stashProject,[noteFile,linkFile,audioFile]),true);
assert.equal(F.folder(stashProject),'/home/demo/Projects/My project');
assert.deepEqual(stashProject.files,[],'Saved materials are files in the project folder');
assert.equal(F.list(stashProject).find(file=>file.id==='saved-note').content,noteFile.text);
assert.match(F.list(stashProject).find(file=>file.id==='saved-link').content,/\[InternetShortcut\]\nURL=https:\/\/example.org\/page\?x=1#intro/);
const projectRoundtrip=JSON.parse(JSON.stringify(stashProject));assert.deepEqual(projectRoundtrip,stashProject);
const recovered=M.create({version:1,records:{'saved-note':projectRoundtrip.stash.files['saved-note'].record}});assert.equal(recovered.get('saved-note').text,noteFile.text,'A note body is recoverable from the project itself');
assert.equal(F.materialize(projectRoundtrip,[noteFile,linkFile,audioFile]),false,'Reload does not recreate files');
F.materialize(stashProject,[{...noteFile,id:'new-note'},noteFile,linkFile,audioFile]);assert.equal(stashProject.stash.files['saved-note'].name,'Review.md','A new collision does not rename the existing file');assert.equal(stashProject.stash.files['new-note'].name,'Review (2).md');
F.materialize(stashProject,[linkFile,audioFile]);assert(!stashProject.stash.files['saved-note'],'Removal also removes the file from the folder');
F.materialize(stashProject,[noteFile,linkFile,audioFile]);assert.equal(stashProject.stash.files['saved-note'].content,noteFile.text,'Undo restores contents');
F.materialize(stashProject,[{...noteFile,title:'../Bad/path\u0000',text:'Changed body'},linkFile,audioFile]);assert(!stashProject.stash.files['saved-note'].name.includes('/'));assert.equal(stashProject.stash.files['saved-note'].content,'Changed body');
assert.deepEqual(F.safeAttachment({kind:'image',key:'stash-upload-123',src:'https://untrusted.example/track.png'}),{kind:'image',key:'stash-upload-123',src:undefined},'Uploaded previews can only use their stored file');
console.log('Project Stash folder passed: owned contents, project reload recovery, link files, safe names, stable collisions, edits, removal and undo.');

// Workspace files use the same folder adapter, retaining uploads through reload
// and display sync without leaking into another workspace or a project.
const workspaceMedia=M.create({},()=>now,'uploads');
const upload={kind:'image',key:'stash-upload-local',filename:'Reference.png',mime:'image/png',size:42,format:'Image'};
const image=workspaceMedia.add(workspace,{title:'Reference.png',attachment:upload});
assert(image,'A file without a text caption can be saved');
workspaceMedia.edit(image.id,{text:'A useful reference',title:'My image'});
const mediaReload=M.create(workspaceMedia.snapshot());
assert.deepEqual(mediaReload.get(image.id).attachment,upload,'Caption edits and reload retain the blob key');
assert.equal(mediaReload.items(M.scope('school')).length,0);
assert.equal(mediaReload.items(project).length,0);
assert.equal(mediaReload.search('my image','work')[0].id,image.id);
assert.equal(workspaceMedia.add(workspace,{title:'Remote tracker',attachment:{kind:'image',src:'https://example.org/track.png'}}),null);
const owners={M,F,model:mediaReload,projectSpaces:{launch:stashProject},workspaceProfiles:{work:{home:'/home/demo/Workspaces/work',folders:[['Documents','Documents','folder']]},school:{home:'/home/demo/Workspaces/school',folders:[]}},workspaceStashes:new Map(),activeWorkspace:'work'};
vm.createContext(owners);
vm.runInContext(section('function projectFor(','  function resourceItems('),owners);
vm.runInContext(section('function ownerAtFolder(','  function openSavedFile('),owners);
owners.key=workspace;
const workOwner=vm.runInContext('ownerFor(key)',owners);
F.materialize(workOwner,mediaReload.items(workspace));
assert.equal(F.folder(workOwner),'/home/demo/Workspaces/work');
owners.item=mediaReload.get(image.id);
assert.equal(vm.runInContext('savedItem(item).path',owners),'/home/demo/Workspaces/work/My image.png');
assert.equal(vm.runInContext("fileRows('/home/demo/Workspaces/work/Stash')[0][0]",owners),'My image.png');
assert.equal(vm.runInContext("fileRows('/home/demo/Workspaces/work').at(-1)[0]",owners),'My image.png');
assert.equal(vm.runInContext("fileRows('/home/demo/Workspaces/school/Stash').length",owners),0);
mediaReload.remove(image.id);F.materialize(workOwner,mediaReload.items(workspace));
assert.equal(F.list(workOwner).length,0);
mediaReload.restore(image.id);F.materialize(workOwner,mediaReload.items(workspace));
assert.equal(F.list(workOwner)[0].attachment.key,upload.key);
const appFiles=fs.readFileSync(require('node:path').join(__dirname,'../dist/app-windows.js'),'utf8');
const fileContext={workspaceProfiles:owners.workspaceProfiles,projectSpaces:owners.projectSpaces,frameFor:()=>({}),SpatialHomeFolders:require('../dist/home-folders.js'),SpatialMemoryDesktop:{fileRows:path=>owners.fileRows(path)},workspaceDownloads:{snapshot:()=>({directories:[]})},fileLocationRows:()=>[]};
vm.createContext(fileContext);
vm.runInContext(appFiles.slice(appFiles.indexOf('function appFileRows('),appFiles.indexOf('function ',appFiles.indexOf('function appFileRows(')+10)),fileContext);
assert(vm.runInContext("appFileRows('files','/home/demo/Workspaces/work').some(row=>row[0]==='My image.png')",fileContext),'The enhanced Dolphin Home renderer includes workspace Stash');
assert.equal(vm.runInContext("appFileRows('files','/home/demo/Workspaces/work/Stash')[0][0]",fileContext),'My image.png');

// A file upload can complete after the user switches workspace. The captured
// destination must still receive it, and reloading must preserve that file.
(async()=>{
  const uploads=M.create({},()=>now,'upload-test');let currentScope=workspace,release;
  const messages=[],written=[],owner={root:'/home/demo/Workspaces/work',files:[]};
  const uploadContext={M,model:uploads,F:{...F,put:key=>new Promise(resolve=>{written.push(key);release=resolve;})},scope:()=>currentScope,projectFor:()=>null,ownerFor:()=>owner,itemsFor:key=>uploads.items(key),feedback:text=>messages.push(text),crypto:require('node:crypto').webcrypto,Date,URL:{createObjectURL:()=> 'blob:test'},mediaUrls:new Map(),selected:new Set(),current:workspace,save(){F.materialize(owner,uploads.items(workspace));},render(){}};
  vm.createContext(uploadContext);vm.runInContext(section('async function saveFiles(','  function itemMarkup('),uploadContext);
  uploadContext.files=[{name:'Photo.png',type:'image/png',size:50}];
  const operation=vm.runInContext('saveFiles(files)',uploadContext);
  currentScope=M.scope('school');uploadContext.current=currentScope;release();await operation;
  const roundtrip=M.create(uploads.snapshot());
  assert.equal(roundtrip.items(workspace).length,1);
  assert.equal(roundtrip.items(currentScope).length,0);
  assert.equal(roundtrip.items(workspace)[0].attachment.key,written[0]);
  assert.equal(F.list(owner)[0].name,'Photo.png');
  assert.equal(messages.length,0,'Completion does not announce the old workspace in the new one');
  console.log('Workspace Stash passed: owned folder, upload keys, caption edits, search, reload/display sync, isolation, file navigation, undo and in-flight workspace switching.');
})().catch(error=>{console.error(error);process.exitCode=1;});

// Origin is independent of the destination and survives inline edits, reload,
// file materialization and later insertions in the same project.
const provenance=M.create({},()=>now,'provenance');
const captured=provenance.add(workspace,{text:'Use this for the navigation review.',why:'Reference for our menu',source:{workspace:'school',project:'research',app:'browser',address:'https://example.org/reference'}});
assert.equal(captured.title,'Use this for the navigation review.','Text capture does not require a title');
const bareLink=provenance.add(workspace,{source:{address:'https://example.org/references/navigation'}});
assert.equal(bareLink.title,'navigation','A pasted link gets a readable automatic name');
provenance.edit(captured.id,{why:'Compare with keyboard navigation',title:'Reference'});
const originReload=M.create(provenance.snapshot()).get(captured.id);
assert.equal(originReload.source.workspace,'school');assert.equal(originReload.source.project,'research');
assert.equal(JSON.parse(originReload.scope)[0],'work','Copy destination never replaces origin');
assert.equal(originReload.why,'Compare with keyboard navigation');
assert.equal(provenance.search('keyboard','work')[0].id,captured.id,'Personal reminders are searchable');
const originOwner={root:'/work',files:[]};F.materialize(originOwner,[originReload]);
assert.equal(F.list(originOwner)[0].why,originReload.why);assert.equal(F.list(originOwner)[0].source.project,'research');
const stableResource=vm.runInContext('resourceItems(key)[0]',unified);
mergedProject.resources.unshift(['Later item','Text','file','i-note',{fileId:'stash-later'}]);
unified.stableResourceId=stableResource.id;
assert.equal(vm.runInContext('itemFor(stableResourceId).title',unified),'Edited reference','New insertions do not retarget an existing saved item');

(async()=>{
  const retained=[],destination=M.create({},()=>now,'capture'),context={M,F,scope:()=>workspace,allowed:()=>true,itemsFor:key=>destination.items(key),appInfo:{browser:{label:'Web'}},ownerFor:()=>originOwner,projectFor:()=>null,addItem:(key,value)=>destination.add(key,value),save:()=>true,recordSaved:item=>retained.push(item),resetShelfFilters(){},render(){},feedback(){},current:workspace};
  vm.createContext(context);vm.runInContext(section('async function keepContext(','  function dropIntoStash('),context);
  context.value={title:'Study reference',text:'The original excerpt',why:'Use in our website',workspace:'school',project:'research',source:{workspace:'school',project:'research',app:'browser',address:'https://example.org/reference'}};
  await vm.runInContext('keepContext(value)',context);
  assert.equal(destination.items(workspace)[0].source.project,'research');assert.equal(destination.items(workspace)[0].why,'Use in our website');assert.equal(retained.length,1,'Immediate capture creates exactly one timeline event');
  context.value={...context.value,id:destination.items(workspace)[0].id,storageScope:workspace};
  await vm.runInContext('keepContext(value)',context);assert.equal(destination.items(workspace).length,1,'Dropping a saved row into its own Stash does not duplicate it');
  console.log('Stash context passed: title-free capture, origin/destination separation, reminders, stable resource identity, reload, file metadata and immediate timeline capture.');
})().catch(error=>{console.error(error);process.exitCode=1;});

// Run the actual async preview callback: its media key must not shadow the
// owning scope used to retrieve the saved file after IndexedDB loading.
(async()=>{
  const cachedOwner={stash:{files:{preview:{id:'preview',attachment:{kind:'image',key:'stash-preview'}}}}},errors=[],mediaCache=new Map();
  const cacheContext={F:{copyAsset:async()=>new Blob(['preview'])},ownerFor:key=>{assert.equal(key,workspace);return cachedOwner;},projectFor:()=>null,copying:new Set(),mediaUrls:mediaCache,host:{querySelectorAll:()=>[]},URL:{createObjectURL:()=> 'blob:preview'},feedback:text=>errors.push(text),current:workspace};
  vm.createContext(cacheContext);vm.runInContext(section('function cacheMedia(','  async function saveFiles('),cacheContext);
  cacheContext.key=workspace;cacheContext.file=cachedOwner.stash.files.preview;
  vm.runInContext('cacheMedia(key,file)',cacheContext);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(mediaCache.get('stash-preview'),'blob:preview');assert.equal(errors.length,0,'A loaded media preview must not report a copy error');
  console.log('Stash preview passed: uploaded and copied media load from their owning scope without shadowing the media key.');
})().catch(error=>{console.error(error);process.exitCode=1;});
