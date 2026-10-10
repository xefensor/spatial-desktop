const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const M=require('../dist/working-memory.js');
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
const calls=[];const sandbox={createAppInstance:base=>{calls.push(['create',base]);return base+'--new';},navigateBrowser:(...args)=>calls.push(['navigate',...args]),renderFileLocation:(...args)=>calls.push(['folder',...args]),openAppFile:(...args)=>calls.push(['file',...args]),feedback:text=>calls.push(['message',text]),appInfo:{notes:{}}};vm.createContext(sandbox);vm.runInContext(section('function openSource(','  function preview('),sandbox);
sandbox.item={source:{address:'https://example.org/reference'}};vm.runInContext('openSource(item)',sandbox);assert.deepEqual(calls,[['create','browser'],['navigate','browser--new','https://example.org/reference']]);calls.length=0;
sandbox.item={source:{address:'/home/demo/Projects/test/notes.md'}};vm.runInContext('openSource(item)',sandbox);assert.deepEqual(calls,[['create','dolphin'],['folder','dolphin--new','/home/demo/Projects/test'],['file','dolphin--new','notes.md']]);
// Revealing rail memory changes only the project rectangle, never the shared lane.
const railCalls=[];const railArea={hidden:false,dataset:{areaState:'rail',areaJoinEdge:'none'},style:{left:'0',top:'400',width:'64',height:'400'}};
const railSandbox={temporaryRail:{scope:project,edge:'left'},scope:()=>project,dockState:{projects:{edge:'left'}},area:railArea,isLocalArea:()=>true,rail:{setAttribute(){}},railEntry:{setAttribute(){}},layoutDockAreas:()=>railCalls.push('layout'),applyDockRect:(name,rect)=>railCalls.push({name,rect})};
vm.createContext(railSandbox);vm.runInContext(section('function collapse(','  function reveal('),railSandbox);vm.runInContext('applyRailExpansion(1200,800)',railSandbox);
assert.equal(railArea.dataset.areaState,'expanded');assert.equal(railCalls[0].rect.width,340);assert.equal(railCalls[0].rect.height,400);assert.equal(railCalls[0].name,'projects');
vm.runInContext('collapse()',railSandbox);assert.equal(railArea.dataset.memoryRailExpanded,undefined);assert.equal(railCalls.at(-1),'layout');
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
const mediaSandbox={};vm.createContext(mediaSandbox);vm.runInContext(section('function attachmentFor(','  function itemMarkup('),mediaSandbox);
for(const value of [attachment,{kind:'image',src:'images/philosophy/keychron-profile.jpg'},{kind:'document',src:'media/stash/brand-brief.html'}]){mediaSandbox.item={attachment:value};assert.ok(vm.runInContext('attachmentFor(item)',mediaSandbox));}
for(const value of [{kind:'image',src:'javascript:alert(1)'},{kind:'image',src:'media/stash/../../private.svg'},{kind:'document',src:'https://example.org/document.html'},{kind:'audio',src:'media/stash/not-audio.html'}]){mediaSandbox.item={attachment:value};assert.equal(vm.runInContext('attachmentFor(item)',mediaSandbox),null);}
console.log('Stash media passed: typed projection, caption edits preserve assets, safe preview sources.');
