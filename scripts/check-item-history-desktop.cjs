const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const H=require('../dist/item-history.js');
const M=require('../dist/working-memory.js');
const F=require('../dist/stash-files.js');
const historySource=fs.readFileSync(require.resolve('../dist/item-history-desktop.js'),'utf8');
const memorySource=fs.readFileSync(require.resolve('../dist/working-memory-desktop.js'),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
function section(source,from,to){const start=source.indexOf(from),end=source.indexOf(to,start+from.length);assert(start>=0&&end>start,'Production helper boundary: '+from);return source.slice(start,end);}
const time={value:100000},storage=new Map(),queued=[];
const projects={first:{name:'Taxes',originWorkspace:'work',root:'/work/Taxes',resources:[],files:[]},second:{name:'Review',originWorkspace:'work',root:'/work/Review',resources:[],files:[]}};
const profiles={work:{label:'Work',home:'/work'},personal:{label:'Personal',home:'/personal'},school:{label:'School',home:'/school'}};
const messages=[];
function historyHarness(savedStorage=storage){
  let submit;
  const form={elements:{method:{value:'copy'},destination:{value:M.scope('work','second')}},querySelector:selector=>selector.includes('status')?form.status:form.button,status:{textContent:''},button:{disabled:false},addEventListener(type,callback){if(type==='submit')submit=callback;}};
  const heading={},sheet={querySelector:selector=>selector==='form'?form:heading};
  const context={SpatialItemHistory:{...H,create:saved=>H.create(saved,()=>time.value,'history-test')},readDesktopStorage:(key,fallback)=>savedStorage.has(key)?JSON.parse(savedStorage.get(key)):fallback,desktopStorage:{setItem:(key,value)=>savedStorage.set(key,value)},queueMicrotask:fn=>queued.push(fn),queueDesktopStateBroadcast(){},showToast:message=>messages.push(message),activeWorkspace:'work',projectSpaces:projects,workspaceProfiles:profiles,desktopPages:{column:()=> 'first'},appInfo:{browser:{label:'Firefox'},editor:{label:'Editor'}},escapeHtml:value=>String(value),SpatialMemoryDesktop:{allItems:()=>[]},sheet,dialogItem:'',dialogWorkspace:'work',document:{querySelector:()=>null},CSS:{escape:value=>value},renderVersion(){},decorate(){},openProjectNames:()=>['first','second'],display(body){context.dialogWorkspace=context.activeWorkspace;context.lastDisplay=body;},close(){context.closed=true;}};
  vm.createContext(context);
  vm.runInContext(section(historySource,'  const H=','  const sheet='),context);
  vm.runInContext(section(historySource,'  function transfer(item){',"  sheet.addEventListener('click'"),context);
  vm.runInContext(section(historySource,'  function facts(source){','  async function renderVersion('),context);
  vm.runInContext(section(historySource,'  globalThis.SpatialItemHistoryDesktop={','  allEntries().forEach'),context);
  vm.runInContext('globalThis.testHelpers={canonical,capture,hydrate,record,get,locations,tags,saveTags,persist};',context);
  return {context,api:context.SpatialItemHistoryDesktop,helpers:context.testHelpers,form,submit:()=>submit({preventDefault(){},currentTarget:form})};
}
const history=historyHarness();
let serial=0;
const memoryModel=M.create({},()=>time.value,'memory-test');
const memoryContext={M,F,model:memoryModel,projectSpaces:projects,workspaceProfiles:profiles,workspaceStashes:new Map(),selected:new Set(),persistProjectState(){},queueDesktopStateBroadcast(){},activeWorkspace:'work',Date:{now:()=>time.value},crypto:{randomUUID:()=> 'test-'+(++serial)},describeProjectResource:address=>[address,'','web','i-link'],SpatialItemHistoryDesktop:history.api,desktopPages:{current:()=>0},SpatialTimelineDesktop:{record(){}},allowed:()=>true,scope:()=>M.scope('work'),current:M.scope('work'),save:()=>true,feedback:message=>messages.push(message),render(){},resetShelfFilters(){}};
vm.createContext(memoryContext);
vm.runInContext(section(memorySource,'  function projectFor(','  const scope='),memoryContext);
vm.runInContext(section(memorySource,'  function recordSaved(','  function originTags('),memoryContext);
vm.runInContext(section(memorySource,'  async function keepContext(','  function dropIntoStash('),memoryContext);
// Exercise the exported production removeEntry/allItems bodies as well as the
// same capture, hydration and transfer helpers used by browser interactions.
vm.runInContext('function '+section(memorySource,'allItems(){',',removeEntry('),memoryContext);
vm.runInContext('function '+section(memorySource,'removeEntry(id,key){',',itemFor,'),memoryContext);
vm.runInContext('globalThis.testHelpers={itemsFor,itemFor,editItem,addItem,resourceItems,contextFor,keepContext,allItems,removeEntry,savedItem};',memoryContext);
const memory=memoryContext.testHelpers;
history.context.SpatialMemoryDesktop=memory;
function advance(){time.value+=1000;}
function rawNote(key,value){return memoryModel.add(key,value);}
function latest(id){return history.api.get(id);}
function switchWorkspace(workspace){history.context.activeWorkspace=workspace;memoryContext.activeWorkspace=workspace;}
function verifyFocusedTags(){
  const callbacks={},frames=[],fields=new Map(),committedTags=[],key=M.scope('work');
  let replacements=0,filterCalls=0;
  const tagsInput={dataset:{itemTags:'render-item'},value:'important, typing',isConnected:true,matches:selector=>selector.includes('[data-item-tags]')};
  const target={prepend(){}},railEntry={},items=[{id:'render-item',scope:key,title:'Updated item',text:'Text just edited',source:{},updated:2}];
  const field=selector=>{if(!fields.has(selector))fields.set(selector,{});return fields.get(selector);};
  Object.defineProperty(field('.memory-items'),'innerHTML',{set(value){replacements++;tagsInput.isConnected=false;this.markup=value;}});
  const host={parentElement:target,contains:node=>node===tagsInput,querySelectorAll:()=>[],addEventListener(type,callback){callbacks[type]=callback;}};
  const context={desktopSyncApplying:false,requestAnimationFrame:fn=>frames.push(fn),dropPosition:null,scope:()=>key,current:key,allowed:()=>true,host,rail:{},railEntry,area:{lastElementChild:railEntry},field,selected:new Set(),drafts:new Map(),shelfViews:new Map(),signature:'old',itemsSignature:'old',projectColumnActive:()=>true,$:()=>target,syncFolders(){},projectFor:()=>null,ownerFor:()=>({root:'/work'}),itemsFor:()=>items,F,workspaceProfiles:profiles,filterShelf(){filterCalls++;},saveTags(id,value){committedTags.push([id,value]);},itemMarkup:item=>item.title,prepareControlSemantics(){},document:{activeElement:tagsInput}};
  const publicRenders=[];
  context.SpatialMemoryDesktop={render(force){publicRenders.push(force);context.render(force);}};
  vm.createContext(context);
  vm.runInContext(section(memorySource,'  function render(force=false){','  function collapse('),context);
  context.render(true);
  assert.equal(replacements,0,'A deferred content refresh cannot replace a row while its Tags input is focused');
  assert.equal(tagsInput.value,'important, typing');assert.equal(tagsInput.isConnected,true,'Typing stays attached to the existing input');
  assert.equal(filterCalls,0,'Deferred content is refreshed after the editor is left');
  const focusout=historySource.split('\n').find(line=>line.includes("host.addEventListener('focusout'"));
  assert(focusout,'Production Tags editor has a blur refresh listener');
  vm.runInContext(focusout,context);
  context.document.activeElement=null;
  callbacks.focusout({target:tagsInput});
  assert.deepEqual(committedTags,[['render-item','important, typing']],'Tags blur saves its value synchronously before any row refresh');
  assert.equal(frames.length,1,'Leaving Tags schedules the deferred public refresh');
  assert.equal(replacements,0,'Blur does not rebuild the input during the focus event');
  frames.shift()();
  assert.deepEqual(publicRenders,[true],'Tags blur calls the public render boundary so history decoration runs too');
  assert.equal(replacements,1,'The postponed content update is applied once editing has finished');
  assert.equal(filterCalls,1);
}
function verifyRapidInline(id,key){
  const callbacks={},frames=[],timers=new Map(),opened=[],transferred=[];
  let timerId=0;
  const summary={querySelector:selector=>selector==='b'?{}:{title:'Note'},setAttribute(){}};
  const row={dataset:{memoryId:id,memoryOwner:key},querySelector:()=>summary};
  const input={dataset:{memoryInline:'text'},value:'Rapid text before blur',isConnected:true,closest:()=>row,matches:selector=>selector.includes('[data-memory-inline]')};
  const context={host:{addEventListener(type,callback){callbacks[type]=callback;}},window:{addEventListener(){}},setTimeout(callback){const id=++timerId;timers.set(id,callback);return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:callback=>frames.push(callback),expandedItems:new Set(),itemFor:memory.itemFor,editItem:memory.editItem,save:()=>true,feedback(){},render(){},SpatialItemHistoryDesktop:{...history.api,open(itemId){opened.push(latest(itemId).text);return history.api.open(itemId);},transfer:item=>transferred.push(item.title)}};
  vm.createContext(context);
  vm.runInContext(section(memorySource,'  let inlineTimer=',"  host.addEventListener('toggle'"),context);
  vm.runInContext('globalThis.inlineTest={queueInline,flushInline};',context);
  advance();context.inlineTest.queueInline(input);
  assert.equal(timers.size,1);assert.notEqual(latest(id).text,input.value,'Input remains queued until its explicit commit boundary');
  callbacks.focusout({target:input});
  assert.equal(latest(id).text,input.value,'Inline blur commits pending text synchronously before deferred rendering');
  assert.equal(timers.size,0);assert.equal(frames.length,1);
  advance();input.value='Rapid text before History';context.inlineTest.queueInline(input);
  const button={dataset:{memoryItemAction:'history'},closest:()=>row};
  callbacks.click({target:{closest:()=>button}});
  assert.deepEqual(opened,['Rapid text before History'],'History sees the current text even before the debounce timer or blur runs');
  assert.equal(timers.size,0);
  advance();input.dataset.memoryInline='title';input.value='Rapidly renamed before transfer';context.inlineTest.queueInline(input);
  button.dataset.memoryItemAction='transfer';callbacks.click({target:{closest:()=>button}});
  assert.deepEqual(transferred,['Rapidly renamed before transfer'],'A Stash action resolves its item after flushing pending edits');
  assert.equal(timers.size,0);
}

(async()=>{
  const scope=M.scope('work'),other=M.scope('work','second');
  const initial=rawNote(scope,{title:'Chart',text:'Original chart',source:{app:'browser',address:'https://example.org/chart',workspace:'school',project:'research'}});
  history.api.capture(initial);
  const firstVersion=latest(initial.id).currentVersion;
  advance();
  const reference=rawNote(other,{title:initial.title,text:initial.text,source:initial.source,itemId:initial.id,reference:true});
  history.api.capture(reference,{force:true,action:'reference'});
  assert.equal(latest(initial.id).versions.length,1,'An identical reference retains the shared content version');
  assert.equal(history.api.canonical(reference),initial.id);
  assert.equal(latest(reference.id),null,'A local Stash entry does not create a second canonical item');
  advance();
  memory.editItem(initial.id,{text:'Updated chart'});
  const edited=latest(initial.id),editedVersion=edited.currentVersion;
  assert.equal(edited.text,'Updated chart');assert.notEqual(editedVersion,firstVersion);
  assert.equal(history.api.hydrate(reference).text,'Updated chart','An old reference renders authoritative latest content');
  const versionCount=edited.versions.length;
  for(let i=0;i<4;i++){history.api.hydrate(reference);memory.itemsFor(other);}
  assert.equal(latest(initial.id).versions.length,versionCount,'Repeated hydration cannot write stale local content over an edit');
  advance();
  memory.editItem(reference.id,{title:'Renamed shared chart'});
  assert.equal(latest(initial.id).text,'Updated chart','Partial edits in a stale reference preserve the newer body');
  assert.equal(memory.itemFor(initial.id).title,'Renamed shared chart','Editing a reference updates every view');
  assert.equal(latest(initial.id).origin.app,'browser');assert.equal(latest(initial.id).origin.workspace,'school');
  assert.equal(latest(initial.id).origin.project,'research','Using a different Stash never rewrites origin');
  const beforePin=latest(initial.id).versions.length;
  advance();memory.editItem(reference.id,{pinned:true});
  assert.equal(latest(initial.id).versions.length,beforePin,'Pinning changes the Stash view without manufacturing a content revision');
  assert.equal(memory.itemFor(initial.id).text,'Updated chart');

  // Project resources have distinct local file IDs, but references share the
  // canonical item ID. The raw fileId must not win over explicit itemId.
  projects.first.resources.push(['Project chart','Old resource body','web','i-link',{fileId:'project-file',itemId:initial.id,reference:true,address:initial.source.address,source:initial.source,created:10,updated:10}]);
  const resource=memory.resourceItems(M.scope('work','first'))[0];
  const projected=history.api.hydrate(resource);
  assert.equal(projected.itemId,initial.id);assert.equal(projected.text,'Updated chart');
  assert.equal(latest('project-file'),null,'A reference fileId cannot redirect capture into an unrelated history item');
  advance();memory.editItem(resource.id,{text:'Edited through project resource'});
  assert.equal(latest(initial.id).text,'Edited through project resource');
  assert.equal(latest(initial.id).title,'Renamed shared chart','A text-only edit from a stale project resource preserves the current shared title');
  assert.equal(memory.itemFor(reference.id).text,'Edited through project resource');
  const savedProject=copy(projects.first),reloadedNotes=M.create(memoryModel.snapshot());
  assert.equal(reloadedNotes.get(reference.id).itemId,initial.id);assert.equal(reloadedNotes.get(reference.id).reference,true,'Reference metadata survives working-memory reload');
  assert.equal(savedProject.resources[0][4].itemId,initial.id);assert.equal(savedProject.resources[0][4].reference,true,'Project-file metadata retains canonical identity through JSON export');

  // A reference may store a bundled image under a new IndexedDB blob key. Its
  // newer local timestamp and storage locator are not edits to the source.
  advance();
  const bundled={id:'bundled-image',scope,title:'Bundled image',text:'Source caption',source:{app:'browser'},attachment:{kind:'image',src:'media/stash/chart.svg',filename:'Chart.svg'},updated:time.value};
  history.api.capture(bundled);const bundledVersion=latest(bundled.id).currentVersion,bundledEvents=latest(bundled.id).events.length;
  advance();
  const storedReference=rawNote(other,{title:bundled.title,text:'Stale local caption',source:bundled.source,attachment:{kind:'image',key:'stash-reference-copy',filename:'Chart.svg'},itemId:bundled.id,reference:true});
  assert(storedReference.updated>latest(bundled.id).updated);
  const referenceView=history.api.hydrate(storedReference);
  assert.equal(referenceView.text,'Source caption','A newly saved reference cannot write its local content into the source');
  assert.equal(referenceView.attachment.src,'media/stash/chart.svg');
  assert.equal(latest(bundled.id).currentVersion,bundledVersion,'Reference storage conversion creates no content version');
  assert.equal(latest(bundled.id).versions.length,1);
  assert.equal(latest(bundled.id).events.length,bundledEvents+1);
  assert.equal(latest(bundled.id).events.at(-1).type,'reference');
  assert.equal(latest(bundled.id).events.at(-1).workspace,'work');assert.equal(latest(bundled.id).events.at(-1).project,'second');
  history.api.capture(storedReference,{force:true,action:'reference'});
  assert.equal(latest(bundled.id).currentVersion,bundledVersion,'Explicit reference capture is also storage-only');
  advance();memory.editItem(storedReference.id,{text:'Deliberately edited caption'});
  assert.equal(latest(bundled.id).text,'Deliberately edited caption','Explicit edits from a reference still update shared content');
  assert.equal(latest(bundled.id).attachment?.src,'media/stash/chart.svg','A caption edit retains the authoritative bundled image');
  assert.equal(latest(bundled.id).versions.length,2);

  // Missing origin information remains unknown, even with a front app and an
  // explicit destination. A known partial source is preserved as given.
  const unknown=rawNote(scope,{text:'No origin available',source:{}});
  history.context.frontApp='browser';history.api.capture(unknown);
  assert.equal(latest(unknown.id).origin.app,'');assert.equal(latest(unknown.id).origin.workspace,'');
  advance();
  const countBeforePartial=memoryModel.items(scope).length;
  await memory.keepContext({title:'Partial source',text:'Known app, unknown workspace',source:{app:'browser',address:'https://example.org/partial'}},scope);
  const partial=memoryModel.items(scope).find(item=>item.title==='Partial source');
  assert.equal(memoryModel.items(scope).length,countBeforePartial+1);assert.equal(partial.source.app,'browser');assert.equal(partial.source.address,'https://example.org/partial');assert.equal(partial.source.workspace,'','Destination context cannot fill an unknown origin workspace');

  // Explicit attachment removal must clear stale previews in every reference.
  const image=rawNote(scope,{title:'Image',text:'Caption',attachment:{kind:'image',key:'stash-original-image',filename:'Image.png'}});
  history.api.capture(image);const staleImage={...image,itemId:image.id};
  advance();history.api.capture({...image,attachment:null},{force:true,action:'edit'});
  assert.equal(history.api.hydrate(staleImage).attachment,null,'An old attachment is not resurrected by hydration');
  advance();memory.editItem(image.id,{title:'Image metadata'});
  assert.equal(latest(image.id).attachment,null,'A partial note edit preserves an authoritative attachment removal');

  // The actual transfer submit handler uses current content and pins precisely
  // that source version on an independent copy. Further source edits stay apart.
  advance();
  const staleForTransfer={...reference,text:'Stale transfer body',updated:1};
  history.api.transfer(staleForTransfer);
  history.form.elements.method.value='copy';history.form.elements.destination.value=M.scope('work','second');
  const parentVersion=latest(initial.id).currentVersion;
  await history.submit();
  const copies=memory.itemsFor(other).filter(item=>item.itemId!==initial.id&&history.api.get(item.itemId||item.fileId||item.id)?.relations.some(parent=>parent.itemId===initial.id&&parent.relation==='copiedFrom'));
  assert.equal(copies.length,1,'Transfer creates one independent copy');
  const copied=copies[0],copiedRecord=history.api.get(copied.itemId||copied.fileId||copied.id);
  assert.equal(copiedRecord.text,'Edited through project resource','Transfer copies the visible current content instead of stale local data');
  assert.equal(copiedRecord.relations.find(parent=>parent.itemId===initial.id).versionId,parentVersion,'Copy provenance points to the exact copied version');
  advance();memory.editItem(initial.id,{text:'Source changed after copy'});
  assert.equal(history.api.get(copiedRecord.id).text,'Edited through project resource','Independent copy is not hydrated as shared content');
  assert.equal(history.api.snapshot().history.records[initial.id].versions.find(version=>version.id===parentVersion).text,'Edited through project resource');

  // Locations reflect live Stash rows while retained history stays available.
  const lone=rawNote(scope,{title:'Temporary reference',text:'Keep its journey'});history.api.capture(lone);
  assert.equal(history.helpers.locations(lone.id).length,1);
  memory.removeEntry(lone.id,scope);
  assert.equal(history.helpers.locations(lone.id).length,0,'Removing an entry removes its current location');
  assert(history.api.get(lone.id),'Removing a Stash entry retains the recorded journey');
  switchWorkspace('personal');
  assert.equal(history.api.get(initial.id),null,'History access defaults to the current workspace');
  assert.equal(history.helpers.locations(initial.id).length,0);
  switchWorkspace('school');assert.equal(history.api.get(initial.id),null,'The recorded origin workspace alone does not expose the item');
  switchWorkspace('work');

  // Use the production change listener and saveTags implementation, so the
  // edit preserved by the focus guard really reaches storage and the journey.
  let tagsChanged,tagFilters=0;
  history.context.host={addEventListener(type,callback){if(type==='change')tagsChanged=callback;}};
  history.context.filter=()=>{tagFilters++;};
  const tagsChange=historySource.split('\n').find(line=>line.includes("host.addEventListener('change',event=>"));
  assert(tagsChange);vm.runInContext(tagsChange,history.context);
  tagsChanged({target:{dataset:{itemTags:initial.id},value:'important, typing',matches:selector=>selector.includes('[data-item-tags]')}});
  assert.deepEqual(copy(history.helpers.tags(initial.id)),['important','typing']);
  assert.equal(latest(initial.id).events.at(-1).type,'tagged','A committed Tags edit is present in the item journey');
  assert.equal(tagFilters,1);
  const uncommittedTags={value:'fast, confirmed'};
  history.context.document.querySelector=selector=>selector.includes(initial.id)?uncommittedTags:null;
  const taggedBefore=latest(initial.id).events.filter(event=>event.type==='tagged').length;
  assert.equal(history.api.open(initial.id),true);
  assert.deepEqual(copy(history.helpers.tags(initial.id)),['fast','confirmed'],'Opening History flushes the current Tags field before reading the item');
  assert(history.context.lastDisplay.includes('Tags: fast, confirmed'),'The immediately opened journey includes the newly committed tags');
  history.api.open(initial.id);history.helpers.saveTags(initial.id,'fast, confirmed');
  assert.equal(latest(initial.id).events.filter(event=>event.type==='tagged').length,taggedBefore+1,'Blur, change and History flushes cannot duplicate an unchanged tag event');
  history.context.document.querySelector=()=>null;

  // Execute production merge, then reconstruct the adapter from its actual
  // storage keys: imported tags must survive a new tab/reload.
  history.api.merge({history:history.api.snapshot().history,metadata:{[initial.id]:{tags:['taxes','verify'],updated:Date.now()+60000}}});
  assert.deepEqual(copy(history.helpers.tags(initial.id)),['taxes','verify']);
  history.api.persist();
  const reloadedHistory=historyHarness(storage);
  assert.deepEqual(copy(reloadedHistory.helpers.tags(initial.id)),['taxes','verify'],'Merged UI metadata survives reload');
  assert.equal(reloadedHistory.api.get(initial.id).text,'Source changed after copy');
  assert.equal(reloadedHistory.api.get(initial.id).origin.workspace,'school');
  assert.equal(reloadedHistory.api.get(copiedRecord.id).relations[0].versionId,parentVersion);
  verifyRapidInline(initial.id,scope);
  verifyFocusedTags();
  console.log('Item history desktop passed: production capture/hydration, shared edits, stable file identity, exact copy version, origin facts, current locations, workspace isolation, metadata reload, focused Tags preservation and rapid-action edit flushes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
