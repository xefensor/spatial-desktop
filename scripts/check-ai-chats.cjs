const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const C=require('../dist/ai-context.js'),D=require('../dist/ai-demo.js');
const profiles={general:{label:'General',home:'/home/demo'},work:{label:'Work',home:'/home/demo/Work'}};
const projects={film:{name:'Film',root:'/home/demo/Projects/film'},site:{name:'Website',root:'/home/demo/Projects/site'}};
const env={workspaces:()=>profiles,projects:()=>projects};
const model=C.create({},env),first=model.session('general').id;
model.add('general',{id:'brief',title:'Brief',text:'Original text',project:'film',workspace:'general'});
model.exchange('general','Summarize the brief',D.reply('Summarize',{items:model.session('general').items}));
model.draft('general','Unsent question');model.mode('general','rail');
const second=model.newChat('general').id;
assert.equal(model.session('general').mode,'rail','Area mode belongs to the workspace, not a chat');
assert.equal(model.session('general').draft,'');assert.equal(model.session('general').items.length,0);assert.equal(model.session('general').turns.length,0);
assert.equal(model.workingFolder('general'),profiles.general.home);
model.add('general',{id:'page',title:'Page',project:'site',workspace:'work'});model.draft('general','Other draft');
assert.equal(model.workingFolder('general'),projects.site.root);
assert(model.rename('general',second,'Website review'));
model.exchange('general','A different request',{text:'Reply'});
assert.equal(model.session('general').title,'Website review','Explicit names survive subsequent messages');
model.select('general',first);
assert.equal(model.session('general').draft,'Unsent question');assert.equal(model.session('general').items[0].id,'brief');
assert.equal(model.workingFolder('general'),projects.film.root);assert.equal(model.session('general').turns.length,1);
model.add('general',{id:'brief',title:'Brief updated',text:'Revised text',project:'film'});
assert.equal(model.session('general').items.length,1,'Re-dropping a source updates it instead of duplicating it');
assert.equal(model.session('general').items[0].text,'Revised text');
assert.equal(model.session('general').turns[0].sources[0].text,'Original text','Earlier context snapshots remain immutable');
const reloaded=C.create(model.snapshot(),env);
assert.equal(reloaded.session('general').id,first);assert.equal(reloaded.session('general',second).draft,'Other draft');
assert.equal(reloaded.chats('general').length,2);assert.equal(reloaded.session('work').items.length,0);
assert.equal(model.select('general','missing'),false);assert.equal(model.rename('general',first,'   '),false);
const explicitHome=C.create({},env);explicitHome.folder('general',null);explicitHome.add('general',{id:'film-source',title:'Film source',project:'film'});
assert.equal(explicitHome.workingFolder('general'),profiles.general.home,'An explicit Home choice cannot be replaced by a later project drop');
assert.equal(C.create(explicitHome.snapshot(),env).workingFolder('general'),profiles.general.home);
for(const version of [1,2,3]){
  const migrated=C.create({version,sessions:{general:{draft:'Keep me',items:[{id:'old',title:'Legacy source',project:'film'}],turns:[{request:'Old request',text:'Old reply',sources:[{title:'Legacy source'}]}],workingProject:'film',mode:'rail',updated:15}}},env);
  assert.equal(migrated.chats('general').length,1);assert.equal(migrated.session('general').draft,'Keep me');
  assert.equal(migrated.session('general').turns[0].text,'Old reply');assert.equal(migrated.workingFolder('general'),projects.film.root);
  assert.equal(migrated.session('general').mode,version===1?'expanded':'rail');
  const twice=C.create(migrated.snapshot(),env);assert.equal(twice.chats('general').length,1);
}
// Independent chat edits and creations merge without replacing the whole workspace.
const a=C.create(model.snapshot(),env),b=C.create(model.snapshot(),env);
a.draft('general','A edited first',first);b.draft('general','B edited second',second);
a.load(b.snapshot());b.load(a.snapshot());
assert.equal(a.session('general',first).draft,'A edited first');assert.equal(a.session('general',second).draft,'B edited second');
const newA=a.newChat('general').id,newB=b.newChat('general').id;
a.load(b.snapshot(),{preserveSelection:'general'});b.load(a.snapshot(),{preserveSelection:'general'});
assert(a.session('general',newB));assert(b.session('general',newA));assert.equal(a.session('general').id,newA);assert.equal(b.session('general').id,newB);
const older=a.snapshot();a.draft('general','Latest');a.load(older);assert.equal(a.session('general').draft,'Latest');
const many=C.create({},env);
for(let i=0;i<24;i++)many.add('general',{id:'source-'+i,title:'Source '+i,text:'Text '+i});
const turn=many.exchange('general','Summarize',D.reply('Summarize',{items:many.session('general').items}));
assert.equal(turn.sources.length,24,'All current sources are recorded, including later drops');assert(turn.text.includes('Source 23'));
for(let i=1;i<60;i++)assert(many.exchange('general','Request '+i,{text:'Reply'}));
assert.equal(many.exchange('general','Beyond the limit',{text:'Reply'}),null);assert.equal(many.session('general').turns[0].request,'Summarize','Reaching the limit never drops earlier messages');
assert(many.newChat('general'));assert(many.exchange('general','Fresh request',{text:'Reply'}));
console.log('AI chats passed: legacy migration, drafts/folders/sources/history isolation, rename, refreshed sources, immutable provenance, concurrent edits and creation, local selection, full context and lossless limits.');

// Boot the production adapter and switch chats/workspaces during an awaited file drop.
(async()=>{
  const nodes=new Map(),handlers={},storage=new Map(),documentHandlers={},windowHandlers={},created=[],areaTransitions=[],observers=[];let releaseUpload,uploads=0,modalOpen=false,pointed=null,sourceProject='site';
  const listen=(events,type,fn)=>(events[type]??=[]).push(fn);
  const document={activeElement:null,elementFromPoint:()=>pointed,querySelector:selector=>{assert(selector.includes('[aria-modal="true"]:not([hidden]):not([aria-hidden="true"])'),'The permanently mounted closed Overview must not block quick-chat Escape');return modalOpen?{}:null;},addEventListener(type,fn){listen(documentHandlers,type,fn);},createElement(tag){const element=node('created-'+created.length);created.push(element);return element;},body:{append(){}}};
  function node(selector){if(!nodes.has(selector)){const classes=new Set();nodes.set(selector,{dataset:{areaState:'expanded'},style:{},value:'',hidden:false,open:false,scrollTop:0,scrollHeight:100,innerHTML:'',textContent:'',listeners:{},classList:{contains:name=>classes.has(name),remove:name=>classes.delete(name),add:name=>classes.add(name),toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},contains(target){return target===this;},append(){},insertBefore(){},getBoundingClientRect:()=>({left:1100,right:1168,top:100,bottom:450,width:68,height:350}),querySelector:()=>node('summary'),addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(){},focus(){document.activeElement=this;},select(){}});}return nodes.get(selector);}
  const area=node('area');area.addEventListener=(type,fn)=>handlers[type]=fn;
  const boot={SpatialAIContext:C,SpatialAIDemo:D,SpatialStashFiles:{put:()=>++uploads===1?new Promise(resolve=>{releaseUpload=resolve;}):Promise.resolve()},readDesktopStorage:(_,fallback)=>fallback,workspaceProfiles:profiles,projectSpaces:projects,SpatialDemoExamples:{projects:{}},activeWorkspace:'general',activeProjectName:null,desktopPages:{column:()=>sourceProject},desktopPreset:'clean',areaFor:()=>area,$:node,$$:()=>[],desktopStorage:{getItem:()=>true,setItem:(key,value)=>storage.set(key,value)},queueDesktopStateBroadcast(){},escapeHtml:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),icon:()=>'',appInfo:{},prepareControlSemantics(){},MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(target,options){this.target=target;this.options=options;}},document,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}},window:{innerWidth:1200,innerHeight:800,dispatchEvent(event){for(const fn of windowHandlers[event.type]||[])fn(event);},addEventListener(type,fn){listen(windowHandlers,type,fn);}},layoutDockAreas(){},scheduleWindowTiling(){},extendedDesktopActive:()=>false,crypto:require('node:crypto')};
  vm.createContext(boot);vm.runInContext(fs.readFileSync(require.resolve('../dist/ai-desktop.js'),'utf8'),boot);
  const api=boot.SpatialAIDesktop,initial=api.snapshot().sessions.general.activeChat;
  boot.setAreaState=(name,state)=>{areaTransitions.push([name,state]);area.dataset.areaState=state;area.hidden=state==='hidden';api.setMode(state);};boot.superKeyAlone=true;
  node('#aiAreaToggle').listeners.click();assert.equal(api.mode(),'rail');
  documentHandlers.keydown.forEach(fn=>fn({metaKey:true,code:'KeyA',preventDefault(){},stopPropagation(){}}));
  assert.deepEqual(areaTransitions,[['ai','rail']],'Quick invocation preserves the saved rail and never resizes its shared dock column');assert.equal(document.activeElement,node('#aiPrompt'));
  const quick=created[4];assert.equal(quick.hidden,false);assert.equal(quick.style.left,'700px');assert.equal(quick.style.top,'100px');assert.equal(node('#aiRailSources').textContent,'0');
  node('#aiPrompt').value='Keep my quick draft';node('#aiPrompt').listeners.input();assert.equal(node('#aiRailDraft').hidden,false);
  node('#aiQuickClose').listeners.click();assert.equal(quick.hidden,true);assert.equal(api.snapshot().sessions.general.chats[initial].draft,'Keep my quick draft');
  node('#aiRailChat').listeners.click();assert.equal(quick.hidden,false);assert.equal(node('#aiPrompt').value,'Keep my quick draft');
  const quickEscape={key:'Escape',preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};documentHandlers.keydown.forEach(fn=>fn(quickEscape));assert.equal(quick.hidden,true);assert(quickEscape.prevented);
  node('#aiRailChat').listeners.click();documentHandlers.pointerdown.forEach(fn=>fn({target:{},button:1}));assert.equal(quick.hidden,true,'Clicking away dismisses the overlay without changing the Area');
  node('#aiRailChat').listeners.click();modalOpen=true;documentHandlers.keydown.forEach(fn=>fn({key:'Escape'}));assert.equal(quick.hidden,false,'Quick chat leaves Escape to a modal above it');modalOpen=false;
  const layerObserver=observers.find(observer=>observer.target===document.body&&observer.options.attributes);assert(layerObserver,'The production adapter observes higher-layer changes outside the shell');
  const openOverviewWithKeyboard=event=>{if(event.key==='F2'){modalOpen=true;node('.desktop-shell').inert=true;document.activeElement=node('#universalSearchInput');}};
  documentHandlers.keydown.push(openOverviewWithKeyboard);
  documentHandlers.keydown.forEach(fn=>fn({key:'F2'}));layerObserver.callback([{type:'attributes',attributeName:'class',target:document.body}]);
  assert.equal(quick.hidden,true,'F2 opening Overview dismisses the body-portal quick chat');assert.equal(document.activeElement,node('#universalSearchInput'),'Dismissal leaves focus with the newly opened Overview');assert.equal(api.snapshot().sessions.general.chats[initial].draft,'Keep my quick draft','Keyboard Overview opening preserves the Assistant draft');
  node('#aiRailChat').listeners.click();assert.equal(quick.hidden,true,'Assistant cannot reopen above Overview');modalOpen=false;node('.desktop-shell').inert=false;documentHandlers.keydown.pop();
  node('#aiRailChat').listeners.click();area.inert=true;layerObserver.callback([{type:'attributes',attributeName:'inert',target:area}]);assert.equal(quick.hidden,true,'Guide restriction closes a quick chat portalled outside the inert Area');area.inert=false;node('#aiRailChat').listeners.click();

  windowHandlers['spatial-rail-open'].forEach(fn=>fn({detail:{area:'projects'}}));assert.equal(quick.hidden,true,'Opening another rail dismisses quick chat');
  for(const [edge,left,top] of [['left','798px','100px'],['right','700px','100px'],['top','798px','168px'],['bottom','798px','12px']]){area.dataset.dockEdge=edge;node('#aiRailChat').listeners.click();assert.equal(quick.style.left,left);assert.equal(quick.style.top,top);node('#aiQuickClose').listeners.click();}
  area.dataset.dockEdge='right';node('#aiRailChat').listeners.click();node('#aiQuickExpand').listeners.click();assert.equal(quick.hidden,true);assert.deepEqual(areaTransitions,[['ai','rail'],['ai','expanded']],'Only explicit Expand area commits the normal shared-column layout');
  const hint=created[0],hintTitle=created[1],hintDetail=created[2];hint.getBoundingClientRect=()=>({width:280,height:80});
  const hover={target:area,clientX:1180,clientY:790,preventDefault(){},dataTransfer:{types:['text/plain'],dropEffect:''}};
  node('#aiChatName').value='<Review & plans>';node('#aiRenameForm').listeners.submit({preventDefault(){}});
  handlers.dragover(hover);assert.equal(hint.hidden,false);assert.equal(hintTitle.textContent,'Attach to <Review & plans>');assert.equal(hintTitle.innerHTML,'','Names remain text, never markup');
  assert.equal(hintDetail.textContent,'General workspace · Copy source');assert.equal(hint.style.left,'912px');assert.equal(hint.style.top,'712px','Hint stays inside the viewport');
  node('#aiNewChat').listeners.click();assert.equal(hintTitle.textContent,'Attach to New chat 2','The label follows the current chat, including a switch during drag');
  node('#aiChatSelect').value=initial;node('#aiChatSelect').listeners.change();
  for(const [events,type,event] of [[documentHandlers,'dragover',{target:{}}],[documentHandlers,'drop',{}],[documentHandlers,'dragend',{}],[documentHandlers,'keydown',{key:'Escape'}],[windowHandlers,'pointercancel',{}],[windowHandlers,'blur',{}]]){
    handlers.dragover(hover);events[type].forEach(fn=>fn(event));assert.equal(hint.hidden,true,type+' clears the destination');assert.equal(area.classList.contains('is-ai-drop-target'),false);
  }
  let intercepted=false;const inputHover={...hover,target:{closest:()=>node('#aiPrompt')},preventDefault(){intercepted=true;}};
  handlers.dragover(inputHover);await handlers.drop({...inputHover,dataTransfer:{...inputHover.dataTransfer,getData:()=> 'Text for my prompt',files:[]}});
  assert.equal(intercepted,false,'Text fields retain their normal text-drop behavior');assert.equal(hint.hidden,true);
  node('#aiNewChat').listeners.click();const contextChat=api.snapshot().sessions.general.activeChat;
  const contextDrop={...inputHover,stopPropagation(){},dataTransfer:{types:[C.MIME],getData:type=>type===C.MIME?JSON.stringify({id:'editor-context',title:'Attached from editor',text:'Source text'}):'',files:[]}};
  boot.setAreaState('ai','rail');handlers.dragover(contextDrop);assert.equal(hint.hidden,false);await handlers.drop(contextDrop);assert.equal(api.mode(),'rail','Attaching a source preserves the saved rail');assert.equal(quick.hidden,false);assert.equal(node('#aiRailSources').textContent,'1','The rail reflects the named chat source count');assert(intercepted,'Explicit sources over the composer still attach');
  assert.equal(api.snapshot().sessions.general.chats[contextChat].items[0].id,'editor-context');
  node('#aiChatSelect').value=initial;node('#aiChatSelect').listeners.change();
  node('#aiPrompt').value='Draft before switching';node('#aiPrompt').listeners.input();
  const drop=handlers.drop({target:inputHover.target,preventDefault(){},stopPropagation(){},dataTransfer:{types:['Files'],getData:()=>'',files:[{size:20,name:'brief.txt',type:'text/plain',text:async()=>'Brief contents'},{size:10,name:'notes.txt',type:'text/plain',text:async()=>'Notes contents'}]}});
  node('#aiNewChat').listeners.click();const next=api.snapshot().sessions.general.activeChat;
  assert.notEqual(next,initial);assert.equal(node('#aiPrompt').value,'');
  node('#aiPrompt').value='Draft in new chat';node('#aiPrompt').listeners.input();
  boot.activeWorkspace='work';api.render();assert.equal(quick.hidden,true,'Switching workspace dismisses the old private quick chat');releaseUpload();await drop;
  const snapshot=api.snapshot();assert.equal(snapshot.sessions.general.chats[initial].items.length,2);
  assert.equal(snapshot.sessions.general.chats[next].items.length,0);assert.equal(snapshot.sessions.work.items.length,0);
  assert.equal(snapshot.sessions.general.chats[initial].draft,'Draft before switching');assert.equal(snapshot.sessions.general.chats[next].draft,'Draft in new chat');
  boot.activeWorkspace='general';api.render();node('#aiChatSelect').value=initial;node('#aiChatSelect').listeners.change();
  assert.equal(node('#aiPrompt').value,'Draft before switching');assert(node('#aiAttachments').innerHTML.includes('ai-source-detail'));
  node('#aiComposer').listeners.submit({preventDefault(){}});
  assert.equal(api.snapshot().sessions.general.chats[initial].turns.length,1);assert.equal(api.snapshot().sessions.general.chats[next].turns.length,0);
  assert.equal(node('#aiPrompt').value,'');assert.equal(node('.ai-context-sources').open,false);
  const remote=C.create(api.snapshot(),env);remote.select('general',next);remote.draft('general','Remote draft',next);
  api.merge(remote.snapshot());assert.equal(api.snapshot().sessions.general.activeChat,initial,'Another display cannot move input into a different chat');
  // Real pointer transfers from Project shelf buttons (not synthetic native
  // dragstart/drop) must copy into Assistant or Stash without opening a file.
  const stashCopies=[];let stashReveals=0;
  const pin={id:'pinned-brief',title:'Pinned brief',text:'Keep this source',workspace:'general',project:'site',source:{label:'Firefox',workspace:'work',project:null,address:'https://example.org/original'}};
  boot.SpatialMemoryDesktop={itemFor:id=>id===pin.id?pin:null,contextFor:item=>({...item,source:{...item.source}}),showDropTarget(){},reveal(){stashReveals++;},keepContext:item=>stashCopies.push(item)};
  const shelfNode=dataset=>({dataset,closest(selector){return selector.split(',').some(part=>part==='[data-project-shelf-path]'&&this.dataset.projectShelfPath||part==='[data-project-shelf-item]'&&this.dataset.projectShelfItem)?this:null;}});
  const fileSource=shelfNode({projectShelfPath:projects.site.root+'/brief.md',projectShelfFile:'brief.md',projectShelfFolder:'false'}),pinSource=shelfNode({projectShelfItem:pin.id});
  const stashTarget={closest:selector=>selector.includes('.memory-rail-entry')?stashTarget:null,matches:()=>false};
  const pointer=(surface,type,target,extra={})=>{const event={target,button:0,buttons:1,pointerId:8,clientX:10,clientY:10,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;},...extra};for(const fn of surface[type]||[])fn(event);return event;};
  const transitionCount=areaTransitions.length;
  pointer(documentHandlers,'pointerdown',fileSource);sourceProject='workspace';pointed=area;pointer(windowHandlers,'pointermove',fileSource,{clientX:80});pointer(windowHandlers,'pointerup',fileSource,{clientX:80});
  let attached=api.snapshot().sessions.general.chats[initial].items.find(item=>item.address===fileSource.dataset.projectShelfPath);assert(attached,'A Project Files button attaches through the real pointer gesture');assert.equal(attached.title,'brief.md');assert.equal(attached.project,'site','The source Project is captured at pointerdown even for a body-portalled shelf');assert.equal(attached.source.label,'Project files');assert.equal(attached.source.address,fileSource.dataset.projectShelfPath);assert(pointer(documentHandlers,'click',fileSource).prevented,'The transfer suppresses the source file-opening click');
  pointer(documentHandlers,'pointerdown',pinSource);pointed=area;pointer(windowHandlers,'pointermove',pinSource,{clientX:80});pointer(windowHandlers,'pointerup',pinSource,{clientX:80});attached=api.snapshot().sessions.general.chats[initial].items.find(item=>item.id===pin.id);assert(attached);assert.equal(attached.source.address,pin.source.address);assert.equal(attached.source.workspace,'work','Pinned items keep their original provenance');assert(pointer(documentHandlers,'click',pinSource).prevented);
  const homeSource=shelfNode({projectShelfPath:profiles.general.home+'/Documents',projectShelfFile:'Documents',projectShelfFolder:'true'});
  for(const source of [fileSource,pinSource,homeSource]){pointer(documentHandlers,'pointerdown',source);pointed=stashTarget;pointer(windowHandlers,'pointermove',source,{clientX:80});pointer(windowHandlers,'pointerup',source,{clientX:80});assert(pointer(documentHandlers,'click',source).prevented);}
  assert.equal(stashReveals,3);assert.equal(stashCopies.length,3);assert.equal(stashCopies[0].source.label,'Workspace files');assert.equal(stashCopies[0].project,null);assert.equal(stashCopies[1].source.address,pin.source.address);assert.equal(stashCopies[2].kind,'folder');assert.equal(stashCopies[2].source.address,profiles.general.home+'/Documents');assert.equal(areaTransitions.length,transitionCount,'Shelf file/pin transfers never expand the saved rail or resize the dock');
  console.log('AI chat adapter passed: geometry-preserving quick rail, draft persistence, all four dock edges, safe dismissal/keyboard Overview and Guide priority/other rails, explicit expansion, Project shelf file/pin pointer copies to Assistant/Stash, current named drop destination, safe names, viewport positioning, leave/drop/cancel cleanup, normal input drops, actual new/select/send handlers, draft restoration, compact sources, two-file upload stays in its original chat/workspace, and display sync cannot redirect input.');
})().catch(error=>{console.error(error);process.exitCode=1;});
