/* A fourth docked Area. Dragged sources carry explicit provenance and a working folder. */
(function(){
  'use strict';
  const C=SpatialAIContext,D=SpatialAIDemo,F=SpatialStashFiles,key='spatial-ai-context-v1';
  const model=C.create(readDesktopStorage(key,{}),{workspaces:()=>workspaceProfiles,projects:()=>projectSpaces});
  const area=areaFor('ai'),prompt=$('#aiPrompt'),folder=$('#aiWorkingFolder'),attachments=$('#aiAttachments'),transcript=$('#aiTranscript'),status=$('#aiStatus');
  let current='',signature='',sourceDrag=null;const views=new Map();
  const chatSelect=$('#aiChatSelect'),chatName=$('#aiChatName'),renameForm=$('#aiRenameForm'),send=$('#aiSend');
  const workspaceLabel=id=>workspaceProfiles[id]?.label||id;
  const dropHint=document.createElement('div'),dropTitle=document.createElement('b'),dropDetail=document.createElement('small');
  dropHint.className='ai-drop-hint';dropHint.hidden=true;dropHint.setAttribute('role','status');dropHint.append(dropTitle,dropDetail);document.body.append(dropHint);
  let dropPosition=null;
  const editableDropTarget=target=>Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));
  const insertsText=event=>editableDropTarget(event.target)&&![...event.dataTransfer.types].some(type=>type==='Files'||type===C.MIME);
  function showDropTarget(event=null){
    const visible=Boolean(event)&&!area.hidden&&(!globalThis.SpatialGuide?.model.active()||SpatialGuide.model.allows('ai'));
    area.classList.toggle('is-ai-drop-target',visible);dropHint.hidden=!visible;dropPosition=visible?{clientX:event.clientX,clientY:event.clientY}:null;
    if(!visible)return;
    const title='Attach to '+model.session(activeWorkspace).title,detail=workspaceLabel(activeWorkspace)+' workspace · Copy source';
    if(dropTitle.textContent!==title)dropTitle.textContent=title;if(dropDetail.textContent!==detail)dropDetail.textContent=detail;
    const rect=dropHint.getBoundingClientRect();
    dropHint.style.left=Math.max(8,Math.min(event.clientX+18,window.innerWidth-rect.width-8))+'px';
    dropHint.style.top=Math.max(8,Math.min(event.clientY+18,window.innerHeight-rect.height-8))+'px';
  }
  function persist(){try{desktopStorage.setItem(key,JSON.stringify(model.snapshot()));queueDesktopStateBroadcast(0);return true;}catch{status.textContent='Changes are visible here but could not be saved. Keep this tab open.';return false;}}
  function itemMarkup(item){
    const project=item.project&&projectSpaces[item.project];
    const kind=item.kind==='image'?'i-image':item.kind==='audio'?'i-music':item.kind==='folder'?'i-folder':item.kind==='browser'||/^https?:/.test(item.address)?'i-web':'i-note';
    const tags=(item.project?'<span class="ai-tag ai-tag-project" style="--project-accent:'+(/^#[0-9a-f]{3,8}$/i.test(project?.accent||'')?project.accent:'var(--text)')+'">Project: '+escapeHtml(project?.name||'Unavailable project')+'</span>':'')+'<span class="ai-tag">Workspace: '+escapeHtml(workspaceLabel(item.workspace))+'</span>'+(item.app?'<span class="ai-tag">'+escapeHtml(item.app==='browser'?'Browser':appInfo[item.app]?.label||item.app)+'</span>':'')+(item.app&&['browser','app'].includes(item.kind)?'':'<span class="ai-tag">'+escapeHtml(item.kind.charAt(0).toUpperCase()+item.kind.slice(1))+'</span>');
    const origin=item.source||{},different=origin.workspace&&(origin.workspace!==item.workspace||origin.project!==item.project);
    const originTags=different?'<span class="ai-tag">Source workspace: '+escapeHtml(workspaceLabel(origin.workspace))+'</span>'+(origin.project?'<span class="ai-tag ai-tag-project">Source project: '+escapeHtml(projectSpaces[origin.project]?.name||origin.project)+'</span>':''):'';
    const reference=origin.address?'<a class="ai-source-link" href="'+escapeHtml(origin.address)+'" data-ai-source="'+escapeHtml(item.id)+'">'+escapeHtml(origin.address)+'</a>':'';
    return '<article class="ai-attachment" data-ai-attachment="'+escapeHtml(item.id)+'"><details class="ai-source-detail" data-ai-source-detail="'+escapeHtml(item.id)+'"><summary>'+icon(kind)+'<span><b>'+escapeHtml(item.title)+'</b><small>'+escapeHtml(project?.name||workspaceLabel(item.workspace))+'</small></span></summary><div class="ai-attachment-main"><p title="'+escapeHtml(item.address||item.text)+'">'+escapeHtml(item.address||item.text.slice(0,240)||item.filename||'Attached source')+'</p><div class="ai-tags">'+tags+originTags+'</div>'+reference+'</div></details><button class="ai-remove" data-ai-remove="'+escapeHtml(item.id)+'" aria-label="Remove '+escapeHtml(item.title)+'">'+icon('i-close')+'</button></article>';
  }
  function turnMarkup(turn){
    const references=turn.sources.map(item=>'<li><b>'+escapeHtml(item.title)+'</b><small>'+escapeHtml((item.project?'Project: '+(projectSpaces[item.project]?.name||item.project)+' · ':'')+'Workspace: '+workspaceLabel(item.workspace))+'</small></li>').join('');
    return '<section class="ai-turn"><div class="ai-request"><small>'+(turn.example?'Example request':'You')+'</small><p>'+escapeHtml(turn.request)+'</p></div><article class="ai-demo-output" draggable="true" tabindex="0" data-ai-demo-turn="'+escapeHtml(turn.id)+'" aria-label="Demo reply: '+escapeHtml(turn.title)+'"><header>'+icon('i-ai')+'<span>Demo reply · scripted</span></header><b>'+escapeHtml(turn.title)+'</b><p>'+escapeHtml(turn.text)+'</p><small class="ai-output-hint">Drag this draft into Stash</small></article><details class="ai-turn-sources"><summary>Context · '+turn.sources.length+' source'+(turn.sources.length===1?'':'s')+'</summary><small class="ai-turn-folder">Working folder: '+escapeHtml(turn.folder)+'</small>'+(references?'<ul>'+references+'</ul>':'')+'</details></section>';
  }
  function seedExamples(session){
    if(session.examplesSeen||session.turns.length||desktopPreset!=='demo'||globalThis.SpatialGuide?.model.active())return;
    const candidate=session.workingProject||activeProjectName,project=projectSpaces[candidate],isDemo=project&&SpatialDemoExamples.projects[candidate]?.name===project.name;
    const projectId=isDemo?candidate:null,workingFolder=isDemo?project.root:workspaceProfiles[activeWorkspace].home;
    const items=isDemo?[model.normalize({id:'example-project-note:'+candidate,title:'Project note',text:project.note||project.summary,workspace:project.originWorkspace||activeWorkspace,project:candidate,source:{workspace:project.originWorkspace||activeWorkspace,project:candidate}},activeWorkspace)]:[];
    const context={folder:workingFolder,project:projectId,sources:items,example:true},name=isDemo?project.name:'';
    const requests=isDemo?['Summarize the attached project note.','Turn it into a checklist for the next review.']:['Help me plan a focused work session.','Draft a note I can keep in this workspace.'];
    requests.forEach(request=>model.exchange(activeWorkspace,request,D.reply(request,{items,folder:workingFolder,project:name}),context));
    model.examplesSeen(activeWorkspace);persist();
  }
  function submitRequest(){
    const request=prompt.value.trim();if(!request){status.textContent='Assistant demo · write a request first';return;}
    const session=model.session(activeWorkspace),workingFolder=model.workingFolder(activeWorkspace),project=projectSpaces[session.workingProject];
    const turn=model.exchange(activeWorkspace,request,D.reply(request,{items:session.items,folder:workingFolder,project:project?.name||workspaceLabel(activeWorkspace)+' workspace'}));
    if(!turn){status.textContent='This demo chat is full. Start a new chat to continue; your draft is kept.';return;}
    model.draft(activeWorkspace,'');prompt.value='';persist();render();
    const sources=$('.ai-context-sources',area);if(sources)sources.open=false;
    $('.ai-chat',area).scrollTop=$('.ai-chat',area).scrollHeight;
    status.textContent='Scripted demo · Enter to try · Shift+Enter for a new line';
  }
  function rememberView(){
    if(!current)return;
    views.set(current,{scroll:$('.ai-chat',area).scrollTop||0,sources:$('.ai-context-sources',area).open,
      expanded:$$('[data-ai-source-detail][open]',attachments).map(node=>node.dataset.aiSourceDetail)});
  }
  function render(){
    const session=model.session(activeWorkspace),nextKey=activeWorkspace+':'+session.id,switched=current!==nextKey;seedExamples(session);
    const chats=model.chats(activeWorkspace),project=projectSpaces[session.workingProject];
    const options=[...new Set([session.workingProject,...session.items.map(item=>item.project),activeProjectName].filter(id=>projectSpaces[id]))];
    const next=JSON.stringify([activeWorkspace,session.id,chats,session.items,session.turns,session.workingProject,options.map(id=>[id,projectSpaces[id].name,projectSpaces[id].root])]);
    $('#aiAreaContext').textContent=project?.name||workspaceLabel(activeWorkspace)+' workspace';
    const expanded=area.dataset.areaState==='expanded';
    $('#aiAreaToggle').setAttribute('aria-expanded',String(expanded));$('#aiAreaToggle').setAttribute('aria-pressed',String(expanded));$('#aiAreaToggle').setAttribute('aria-label',expanded?'Put Assistant area on rail':'Expand Assistant area');
    if(dropPosition)showDropTarget(dropPosition);
    if(next===signature)return;rememberView();signature=next;
    if(switched){current=nextKey;prompt.value=session.draft;renameForm.hidden=true;status.textContent='Assistant demo · scripted replies · nothing is sent';}
    chatSelect.innerHTML=chats.map(chat=>'<option value="'+escapeHtml(chat.id)+'">'+escapeHtml(chat.title+' · '+chat.sources+' source'+(chat.sources===1?'':'s'))+'</option>').join('');chatSelect.value=session.id;chatSelect.title=session.title;
    send.disabled=!prompt.value.trim()||session.turns.length>=60;
    folder.innerHTML='<option value="">'+escapeHtml(workspaceLabel(activeWorkspace)+' · '+workspaceProfiles[activeWorkspace].home)+'</option>'+options.map(id=>'<option value="'+escapeHtml(id)+'">'+escapeHtml(projectSpaces[id].name+' · '+projectSpaces[id].root)+'</option>').join('');folder.value=session.workingProject||'';folder.title=model.workingFolder(activeWorkspace);
    attachments.innerHTML=session.items.map(itemMarkup).join('');transcript.innerHTML=session.turns.map(turnMarkup).join('');$('.ai-empty',area).hidden=session.items.length>0||session.turns.length>0;
    const sources=$('.ai-context-sources',area),view=views.get(nextKey);sources.hidden=!session.items.length;sources.open=view?.sources??false;sources.querySelector('summary').textContent='Sources · '+session.items.length;
    $$('[data-ai-source-detail]',attachments).forEach(node=>{node.open=Boolean(view?.expanded?.includes(node.dataset.aiSourceDetail));});
    if(switched)$('.ai-chat',area).scrollTop=view?.scroll??$('.ai-chat',area).scrollHeight??0;
    prepareControlSemantics(area);
  }
  chatSelect.addEventListener('change',()=>{rememberView();model.select(activeWorkspace,chatSelect.value);persist();render();});
  $('#aiNewChat').addEventListener('click',()=>{rememberView();model.draft(activeWorkspace,prompt.value);const chat=model.newChat(activeWorkspace);if(!chat){status.textContent='This workspace holds up to 50 chats.';return;}persist();render();prompt.focus();});
  $('#aiRenameChat').addEventListener('click',()=>{chatName.value=model.session(activeWorkspace).title;renameForm.hidden=false;chatName.focus();chatName.select?.();});
  $('#aiCancelRename').addEventListener('click',()=>{renameForm.hidden=true;});
  renameForm.addEventListener('submit',event=>{event.preventDefault();if(model.rename(activeWorkspace,model.session(activeWorkspace).id,chatName.value)){renameForm.hidden=true;persist();render();}else{status.textContent='Give this chat a name first.';chatName.focus();}});
  function setMode(mode,save=true){model.mode(activeWorkspace,mode);if(save)persist();}
  function expand(focus=true){
    if(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai'))return;
    if(extendedDesktopActive()&&!isLocalArea('ai')){displayAssignmentsFor().areas.ai=localDisplaySlot();persistDisplayAssignments();}
    setAreaState('ai','expanded',false);scheduleWindowTiling();if(focus)prompt.focus();
  }
  function toggle(){
    if(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai'))return;
    const next=area.hidden||area.dataset.areaState==='rail'?'expanded':'rail';
    setAreaState('ai',next);if(next==='expanded')prompt.focus();
  }
  function add(item){
    const previous=model.session(activeWorkspace).workingProject,added=model.add(activeWorkspace,item);
    if(!added){status.textContent='This conversation holds up to 24 attachments. Remove one to add another.';return false;}
    persist();render();expand(false);if(!model.session(activeWorkspace).turns.length)$('.ai-context-sources',area).open=true;
    status.textContent=previous&&added.project&&previous!==added.project?'Attached from '+(projectSpaces[added.project]?.name||'another project')+'. Working folder stays '+model.workingFolder(activeWorkspace)+'.':'Attached · ready for a scripted demo';return true;
  }
  $('#aiAreaToggle').addEventListener('click',toggle);
  prompt.addEventListener('input',()=>{model.draft(activeWorkspace,prompt.value);send.disabled=!prompt.value.trim()||model.session(activeWorkspace).turns.length>=60;persist();status.textContent='Assistant demo · scripted replies · nothing is sent';});
  prompt.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();event.stopPropagation();submitRequest();}if(event.key==='Escape'){event.stopPropagation();setAreaState('ai','rail');}});
  $('#aiComposer').addEventListener('submit',event=>{event.preventDefault();submitRequest();});
  folder.addEventListener('change',()=>{model.folder(activeWorkspace,folder.value);persist();render();});
  attachments.addEventListener('click',event=>{const link=event.target.closest('[data-ai-source]');if(link){event.preventDefault();const item=model.session(activeWorkspace).items.find(item=>item.id===link.dataset.aiSource);if(item?.source.address){if(/^https?:/.test(item.source.address)){const id=createAppInstance('browser');navigateBrowser(id,item.source.address);}else openFileLocation(item.source.address);}return;}const button=event.target.closest('[data-ai-remove]');if(!button)return;model.remove(activeWorkspace,button.dataset.aiRemove);persist();render();});
  document.addEventListener('keydown',event=>{if((event.metaKey||event.getModifierState?.('OS'))&&!event.ctrlKey&&!event.altKey&&!event.shiftKey&&event.code==='KeyA'&&(!globalThis.SpatialGuide?.model.active()||SpatialGuide.model.allows('ai'))){event.preventDefault();event.stopPropagation();superKeyAlone=false;toggle();}},true);

  function baseSource(target){
    const frame=target.closest('[data-app-frame]'),app=frame?.dataset.appFrame,owner=app&&desktopPages.columnOf(activeWorkspace,app);
    const project=projectSpaces[owner]?owner:target.closest('[data-area-window="projects"]')&&projectSpaces[activeProjectName]?activeProjectName:null;
    return {workspace:activeWorkspace,project,app:appInfo[app]?.base||app||''};
  }
  function describe(target){
    const output=target.closest('[data-ai-demo-turn]');
    if(output){const turn=model.session(activeWorkspace).turns.find(turn=>turn.id===output.dataset.aiDemoTurn);return turn?{id:'demo-reply:'+turn.id,title:turn.title,kind:'note',text:turn.text,workspace:turn.workspace,project:turn.project,app:'ai-demo',source:{workspace:turn.workspace,project:turn.project,app:'ai-demo',label:'Assistant demo · scripted reply'}}:null;}
    const source=baseSource(target),frame=target.closest('[data-app-frame]');
    const row=target.closest('[data-file-name]');
    if(row){const path=frame.dataset.fileLocation.replace(/\/$/,'')+'/'+row.dataset.fileName,savedContext=globalThis.SpatialMemoryDesktop?.contextAtFile(path);if(savedContext)return savedContext;const project=model.projectAt(path)||source.project;const saved=project&&F.list(projectSpaces[project]).find(file=>F.folder(projectSpaces[project])+'/'+file.name===path);return {...source,project,source:{...source,project,address:path,label:appInfo[frame.dataset.appFrame]?.label||'Files',desktop:desktopPages.pageOf(activeWorkspace,frame.dataset.appFrame)},id:'file:'+path,title:row.dataset.fileName,kind:row.dataset.fileFolder?'folder':saved?.kind||'file',address:path,text:saved?.content||saved?.caption||'',filename:row.dataset.fileName,fileKey:saved?.attachment?.key||saved?.blobKey};}
    const projectItem=target.closest('[data-project-item]');
    if(projectItem){const project=projectSpaces[source.project];if(!project)return null;const name=projectItem.dataset.projectItem;return {...source,source:{...source,address:project.root.replace(/\/$/,'')+'/'+name,label:'Project folder'},id:'project-file:'+project.root+'/'+name,title:name,kind:'file',address:project.root.replace(/\/$/,'')+'/'+name};}
    const badge=target.closest('.app-identity .app-badge');
    if(badge&&frame){const app=frame.dataset.appFrame,base=appInfo[app].base||app,address=frame.dataset.fileLocation||$('.browser-toolbar input',frame)?.value||'';return {...source,source:{...source,label:appInfo[app].label,address,desktop:desktopPages.pageOf(activeWorkspace,app)},id:'window:'+activeWorkspace+':'+app,title:appInfo[app].label+' · '+($('.app-identity small',frame)?.textContent||''),kind:base==='browser'?'browser':'app',address,text:base==='notes'?$('.notes-layout textarea',frame)?.value||'':base==='browser'?$('.start-page',frame)?.innerText?.slice(0,12000)||'':''};}
    const memory=target.closest('[data-memory-id]'),item=memory&&SpatialMemoryDesktop.itemFor(memory.dataset.memoryId);
    if(item)return SpatialMemoryDesktop.contextFor(item);
    const selection=frame&&getSelection()?.toString().trim(),link=frame&&target.closest('a[href]'),address=link?.getAttribute('href')||frame?.dataset.fileLocation||$('.browser-toolbar input',frame)?.value||'';
    if(selection||link)return {...source,id:'selection-'+crypto.randomUUID(),title:(selection||link.textContent||address).slice(0,60),kind:link?'link':'text',text:selection||'',address,source:{...source,address,label:appInfo[frame.dataset.appFrame]?.label||'App',desktop:desktopPages.pageOf(activeWorkspace,frame.dataset.appFrame)}};
    return source;
  }
  function prepareSources(root=document){$$('.app-identity .app-badge,[data-file-name],[data-project-item]',root).forEach(element=>{element.draggable=true;if(element.matches('.app-badge'))element.title='Drag into Assistant to attach this app with its context';});}
  prepareSources();
  const observer=new MutationObserver(changes=>{changes.forEach(change=>change.addedNodes.forEach(node=>{if(node.nodeType===1){if(node.matches('.app-identity .app-badge,[data-file-name],[data-project-item]'))node.draggable=true;prepareSources(node);}}));});observer.observe($('.desktop-shell'),{childList:true,subtree:true});
  // Desktop content uses the same pointer gestures as the rest of the scene.
  // Native HTML drops remain available for external files, links and selections.
  function bindContentTransfers(){
    let gesture=null,suppressClick=false;
    const targetAt=event=>{const target=document.elementFromPoint(event.clientX,event.clientY);return target&&area.contains(target)&&!area.hidden;};
    const stashAt=event=>{const target=document.elementFromPoint(event.clientX,event.clientY);return target?.closest?.('#workingMemory,.memory-header-key,.memory-rail-entry')&&!editableDropTarget(target);};
    const clear=()=>{gesture=null;showDropTarget();globalThis.SpatialMemoryDesktop?.showDropTarget?.();};
    document.addEventListener('pointerdown',event=>{
      suppressClick=false;
      if(event.button!==0||(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai'))||(area.contains(event.target)&&!event.target.closest('[data-ai-demo-turn]')))return;
      const source=event.target.closest('.app-identity .app-badge,[data-file-name],[data-project-item],[data-memory-id],[data-ai-demo-turn]');
      if(!source||event.target.closest('input,textarea,a,audio,iframe')||event.target.closest('summary:not(.memory-item-summary)')||event.target.closest('[data-memory-item-action]'))return;
      const item=describe(event.target);if(!item?.title)return;
      event.target.closest('.memory-item-summary')?.focus();
      event.preventDefault();event.stopPropagation();gesture={item,x:event.clientX,y:event.clientY,pointer:event.pointerId,moved:false};
    },true);
    window.addEventListener('pointermove',event=>{
      if(!gesture||event.pointerId!==gesture.pointer)return;
      if(!(event.buttons&1)){clear();return;}
      if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8)gesture.moved=true;
      if(gesture.moved){showDropTarget(targetAt(event)&&gesture.item.app!=='ai-demo'?event:null);globalThis.SpatialMemoryDesktop?.showDropTarget?.(stashAt(event)?event:null);}
    },true);
    window.addEventListener('pointerup',event=>{
      if(!gesture||event.pointerId!==gesture.pointer)return;
      const item=gesture.item,moved=gesture.moved,over=targetAt(event),stash=stashAt(event);clear();
      if(!moved)return;suppressClick=true;
      if(over&&item.app!=='ai-demo'){event.preventDefault();event.stopPropagation();add(item);}
      else if(stash&&globalThis.SpatialMemoryDesktop){event.preventDefault();event.stopPropagation();SpatialMemoryDesktop.reveal();SpatialMemoryDesktop.keepContext(item);}
      else {const field=document.elementFromPoint(event.clientX,event.clientY);if(field?.matches('textarea,input[type=text],input:not([type]),input[type=search],input[type=url]')&&!field.disabled&&!field.readOnly){field.focus();field.setRangeText(item.text||item.address||item.title,field.selectionStart||0,field.selectionEnd||0,'end');field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}}
    },true);
    document.addEventListener('click',event=>{if(!suppressClick)return;suppressClick=false;event.preventDefault();event.stopImmediatePropagation();},true);
    window.addEventListener('pointercancel',clear,true);window.addEventListener('blur',clear);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')clear();},true);
  }
  bindContentTransfers();
  document.addEventListener('dragstart',event=>{
    if(area.contains(event.target)&&!event.target.closest('[data-ai-demo-turn]'))return;
    sourceDrag=describe(event.target);
    if(!sourceDrag)return;
    if(sourceDrag.title){event.dataTransfer.setData(C.MIME,JSON.stringify(sourceDrag));event.dataTransfer.setData('text/plain',sourceDrag.text||sourceDrag.address||sourceDrag.title);event.dataTransfer.effectAllowed='copy';}
  });
  function accepts(event){return [...event.dataTransfer.types].some(type=>[C.MIME,'Files','text/plain','text/uri-list'].includes(type));}
  area.addEventListener('dragover',event=>{if(!accepts(event)||insertsText(event)){showDropTarget();return;}event.preventDefault();event.dataTransfer.dropEffect='copy';showDropTarget(event);});
  area.addEventListener('dragleave',event=>{if(!area.contains(event.relatedTarget))showDropTarget();});
  document.addEventListener('dragover',event=>{if(!area.contains(event.target))showDropTarget();});
  document.addEventListener('drop',()=>showDropTarget(),true);
  document.addEventListener('dragend',()=>{sourceDrag=null;showDropTarget();});
  area.addEventListener('drop',async event=>{
    showDropTarget();if(!accepts(event)||insertsText(event))return;event.preventDefault();event.stopPropagation();
    const raw=event.dataTransfer.getData(C.MIME),source=sourceDrag||{workspace:activeWorkspace};sourceDrag=null;
    if(raw){try{add(JSON.parse(raw));}catch{status.textContent='This attachment could not be read.';}return;}
    const files=[...event.dataTransfer.files];
    if(files.length){const workspace=activeWorkspace,chatId=model.session(workspace).id;expand(false);for(const file of files){if(file.size>25*1024*1024){status.textContent='Files must be smaller than 25 MB.';continue;}if(model.session(workspace,chatId).items.length>=24){status.textContent='This conversation holds up to 24 attachments.';break;}try{const fileKey='stash-upload-'+crypto.randomUUID();await F.put(fileKey,file);model.add(workspace,{workspace,id:fileKey,fileKey,filename:file.name,title:file.name,kind:file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':'file',text:file.type.startsWith('text/')?(await file.text()).slice(0,12000):''},chatId);persist();render();if(activeWorkspace===workspace&&model.session(workspace).id===chatId)status.textContent='Attached · ready for a scripted demo';}catch{status.textContent='Could not keep this file in this browser.';}}return;}
    const text=event.dataTransfer.getData('text/plain'),url=event.dataTransfer.getData('text/uri-list').split('\n').find(line=>line&&!line.startsWith('#'));
    if(text||url)add({...source,title:url||text.trim().slice(0,80)||'Dropped content',kind:url?'link':'text',text,address:url||''});
  });
  // Move earlier draft requests into the new Area without discarding them.
  const legacyDrafts=readDesktopStorage('spatial-stash-ai-drafts-v1',{}),drafts=legacyDrafts&&typeof legacyDrafts==='object'?legacyDrafts:{};
  if(!desktopStorage.getItem(key)){Object.keys(workspaceProfiles).forEach(workspace=>{const project=workspaceProjects[workspace];const draft=drafts['project:'+project]||drafts[JSON.stringify([workspace,null])];if(typeof draft==='string'&&draft){model.draft(workspace,draft);model.folder(workspace,project);}});persist();}
  globalThis.SpatialAIDesktop={render,expand,mode:()=>model.session(activeWorkspace).mode,setMode,snapshot:()=>model.snapshot(),merge(value){model.load(value,{preserveSelection:activeWorkspace});signature='';const session=model.session(activeWorkspace);if(document.activeElement!==prompt)prompt.value=session.draft;render();}};
  layoutDockAreas(false,false);render();
})();
