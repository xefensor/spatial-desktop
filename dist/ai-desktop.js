/* A fourth docked Area. Dragged sources carry explicit provenance and a working folder. */
(function(){
  'use strict';
  const C=SpatialAIContext,F=SpatialStashFiles,key='spatial-ai-context-v1';
  const model=C.create(readDesktopStorage(key,{}),{workspaces:()=>workspaceProfiles,projects:()=>projectSpaces});
  const area=areaFor('ai'),prompt=$('#aiPrompt'),folder=$('#aiWorkingFolder'),attachments=$('#aiAttachments'),status=$('#aiStatus');
  let current='',signature='',sourceDrag=null;
  const workspaceLabel=id=>workspaceProfiles[id]?.label||id;
  function persist(){try{desktopStorage.setItem(key,JSON.stringify(model.snapshot()));queueDesktopStateBroadcast(0);return true;}catch{status.textContent='Could not save this conversation. Your input is still visible here.';return false;}}
  function itemMarkup(item){
    const project=item.project&&projectSpaces[item.project];
    const kind=item.kind==='image'?'i-image':item.kind==='audio'?'i-music':item.kind==='folder'?'i-folder':item.kind==='browser'||/^https?:/.test(item.address)?'i-web':'i-note';
    const tags=(item.project?'<span class="ai-tag ai-tag-project" style="--project-accent:'+(/^#[0-9a-f]{3,8}$/i.test(project?.accent||'')?project.accent:'var(--text)')+'">Project: '+escapeHtml(project?.name||'Unavailable project')+'</span>':'')+'<span class="ai-tag">Workspace: '+escapeHtml(workspaceLabel(item.workspace))+'</span>'+(item.app?'<span class="ai-tag">'+escapeHtml(item.app==='browser'?'Browser':appInfo[item.app]?.label||item.app)+'</span>':'')+(item.app&&['browser','app'].includes(item.kind)?'':'<span class="ai-tag">'+escapeHtml(item.kind.charAt(0).toUpperCase()+item.kind.slice(1))+'</span>');
    const origin=item.source||{},different=origin.workspace&&(origin.workspace!==item.workspace||origin.project!==item.project);
    const originTags=different?'<span class="ai-tag">Source workspace: '+escapeHtml(workspaceLabel(origin.workspace))+'</span>'+(origin.project?'<span class="ai-tag ai-tag-project">Source project: '+escapeHtml(projectSpaces[origin.project]?.name||origin.project)+'</span>':''):'';
    const reference=origin.address?'<a class="ai-source-link" href="'+escapeHtml(origin.address)+'" data-ai-source="'+escapeHtml(item.id)+'">'+escapeHtml(origin.address)+'</a>':'';
    return '<article class="ai-attachment" data-ai-attachment="'+escapeHtml(item.id)+'">'+icon(kind)+'<div class="ai-attachment-main"><b>'+escapeHtml(item.title)+'</b><p title="'+escapeHtml(item.address||item.text)+'">'+escapeHtml(item.address||item.text.slice(0,100)||item.filename||'Attached source')+'</p><div class="ai-tags">'+tags+originTags+'</div>'+reference+'</div><button class="ai-remove" data-ai-remove="'+escapeHtml(item.id)+'" aria-label="Remove '+escapeHtml(item.title)+'">'+icon('i-close')+'</button></article>';
  }
  function render(){
    const session=model.session(activeWorkspace),switched=current!==activeWorkspace;
    if(switched){current=activeWorkspace;prompt.value=session.draft;status.textContent='AI not connected · your input stays here';signature='';}
    const project=projectSpaces[session.workingProject];
    $('#aiAreaContext').textContent=project?.name||workspaceLabel(activeWorkspace)+' workspace';
    const expanded=area.dataset.areaState==='expanded';
    $('#aiAreaToggle').setAttribute('aria-expanded',String(expanded));$('#aiAreaToggle').setAttribute('aria-pressed',String(expanded));$('#aiAreaToggle').setAttribute('aria-label',expanded?'Put AI area on rail':'Expand AI area');
    const options=[...new Set([session.workingProject,...session.items.map(item=>item.project),activeProjectName].filter(id=>projectSpaces[id]))];
    const next=JSON.stringify([activeWorkspace,session.items,session.workingProject,options.map(id=>[id,projectSpaces[id].name,projectSpaces[id].root])]);
    if(next===signature)return;signature=next;
    folder.innerHTML='<option value="">'+escapeHtml(workspaceLabel(activeWorkspace)+' · '+workspaceProfiles[activeWorkspace].home)+'</option>'+options.map(id=>'<option value="'+escapeHtml(id)+'">'+escapeHtml(projectSpaces[id].name+' · '+projectSpaces[id].root)+'</option>').join('');folder.value=session.workingProject||'';folder.title=model.workingFolder(activeWorkspace);
    attachments.innerHTML=session.items.map(itemMarkup).join('');$('.ai-empty',area).hidden=session.items.length>0;prepareControlSemantics(area);
  }
  function setMode(mode,save=true){model.mode(activeWorkspace,mode);if(save)persist();}
  function expand(focus=true){
    if(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai'))return;
    if(extendedDesktopActive()&&!isLocalArea('ai')){displayAssignmentsFor().areas.ai=localDisplaySlot();persistDisplayAssignments();}
    area.hidden=false;setMode('expanded');layoutDockAreas(true);scheduleWindowTiling();if(focus)prompt.focus();
  }
  function toggle(){if(area.hidden||area.dataset.areaState==='rail')expand();else{setMode('rail');layoutDockAreas(true);scheduleWindowTiling();}}
  function add(item){
    const previous=model.session(activeWorkspace).workingProject,added=model.add(activeWorkspace,item);
    if(!added){status.textContent='This conversation holds up to 24 attachments. Remove one to add another.';return false;}
    persist();render();expand(false);
    status.textContent=previous&&added.project&&previous!==added.project?'Attached from '+(projectSpaces[added.project]?.name||'another project')+'. Working folder stays '+model.workingFolder(activeWorkspace)+'.':'Attached · AI not connected';return true;
  }
  $('#aiAreaToggle').addEventListener('click',toggle);
  prompt.addEventListener('input',()=>{model.draft(activeWorkspace,prompt.value);persist();status.textContent='AI not connected · your input stays here';});
  prompt.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();event.stopPropagation();model.draft(activeWorkspace,prompt.value);persist();status.textContent=prompt.value.trim()?'AI is not connected yet. Your request and attachments are kept here.':'AI not connected · type your own request';}if(event.key==='Escape'){event.stopPropagation();setMode('rail');layoutDockAreas(true);}});
  $('#aiComposer').addEventListener('submit',event=>event.preventDefault());
  folder.addEventListener('change',()=>{model.folder(activeWorkspace,folder.value);persist();render();});
  attachments.addEventListener('click',event=>{const link=event.target.closest('[data-ai-source]');if(link){event.preventDefault();const item=model.session(activeWorkspace).items.find(item=>item.id===link.dataset.aiSource);if(item?.source.address){if(/^https?:/.test(item.source.address)){const id=createAppInstance('browser');navigateBrowser(id,item.source.address);}else openFileLocation(item.source.address);}return;}const button=event.target.closest('[data-ai-remove]');if(!button)return;model.remove(activeWorkspace,button.dataset.aiRemove);persist();render();});
  document.addEventListener('keydown',event=>{if((event.metaKey||event.getModifierState?.('OS'))&&!event.ctrlKey&&!event.altKey&&!event.shiftKey&&event.code==='KeyA'&&(!globalThis.SpatialGuide?.model.active()||SpatialGuide.model.allows('ai'))){event.preventDefault();event.stopPropagation();superKeyAlone=false;toggle();}},true);

  function baseSource(target){
    const frame=target.closest('[data-app-frame]'),app=frame?.dataset.appFrame,owner=app&&desktopPages.columnOf(activeWorkspace,app);
    const project=projectSpaces[owner]?owner:target.closest('[data-area-window="projects"]')&&projectSpaces[activeProjectName]?activeProjectName:null;
    return {workspace:activeWorkspace,project,app:appInfo[app]?.base||app||''};
  }
  function describe(target){
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
  function prepareSources(root=document){$$('.app-identity .app-badge,[data-file-name],[data-project-item]',root).forEach(element=>{element.draggable=true;if(element.matches('.app-badge'))element.title='Drag into AI to attach this app with its context';});}
  prepareSources();
  const observer=new MutationObserver(changes=>{changes.forEach(change=>change.addedNodes.forEach(node=>{if(node.nodeType===1){if(node.matches('.app-identity .app-badge,[data-file-name],[data-project-item]'))node.draggable=true;prepareSources(node);}}));});observer.observe($('.desktop-shell'),{childList:true,subtree:true});
  // Desktop content uses the same pointer gestures as the rest of the scene.
  // Native HTML drops remain available for external files, links and selections.
  function bindContentTransfers(){
    let gesture=null,suppressClick=false;
    const targetAt=event=>{const target=document.elementFromPoint(event.clientX,event.clientY);return target&&area.contains(target)&&!area.hidden;};
    const stashAt=event=>{const target=document.elementFromPoint(event.clientX,event.clientY);return target?.closest?.('#workingMemory,.memory-header-key,.memory-rail-entry')&&!target.closest('input,textarea');};
    const clear=()=>{gesture=null;area.classList.remove('is-ai-drop-target');document.querySelector?.('#workingMemory')?.classList.remove('is-drop-target');};
    document.addEventListener('pointerdown',event=>{
      suppressClick=false;
      if(event.button!==0||(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai'))||area.contains(event.target))return;
      const source=event.target.closest('.app-identity .app-badge,[data-file-name],[data-project-item],[data-memory-id]');
      if(!source||event.target.closest('input,textarea,a,audio,iframe')||event.target.closest('summary:not(.memory-item-summary)')||event.target.closest('[data-memory-item-action]'))return;
      const item=describe(event.target);if(!item?.title)return;
      event.target.closest('.memory-item-summary')?.focus();
      event.preventDefault();event.stopPropagation();gesture={item,x:event.clientX,y:event.clientY,pointer:event.pointerId,moved:false};
    },true);
    window.addEventListener('pointermove',event=>{
      if(!gesture||event.pointerId!==gesture.pointer)return;
      if(!(event.buttons&1)){clear();return;}
      if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8)gesture.moved=true;
      if(gesture.moved){area.classList.toggle('is-ai-drop-target',Boolean(targetAt(event)));document.querySelector?.('#workingMemory')?.classList.toggle('is-drop-target',Boolean(stashAt(event)));}
    },true);
    window.addEventListener('pointerup',event=>{
      if(!gesture||event.pointerId!==gesture.pointer)return;
      const item=gesture.item,moved=gesture.moved,over=targetAt(event),stash=stashAt(event);clear();
      if(!moved)return;suppressClick=true;
      if(over){event.preventDefault();event.stopPropagation();add(item);}
      else if(stash&&globalThis.SpatialMemoryDesktop){event.preventDefault();event.stopPropagation();SpatialMemoryDesktop.reveal();SpatialMemoryDesktop.keepContext(item);}
      else {const field=document.elementFromPoint(event.clientX,event.clientY);if(field?.matches('textarea,input[type=text],input:not([type]),input[type=search],input[type=url]')&&!field.disabled&&!field.readOnly){field.focus();field.setRangeText(item.text||item.address||item.title,field.selectionStart||0,field.selectionEnd||0,'end');field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}}
    },true);
    document.addEventListener('click',event=>{if(!suppressClick)return;suppressClick=false;event.preventDefault();event.stopImmediatePropagation();},true);
    window.addEventListener('pointercancel',clear,true);window.addEventListener('blur',clear);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')clear();},true);
  }
  bindContentTransfers();
  document.addEventListener('dragstart',event=>{
    if(area.contains(event.target))return;
    sourceDrag=describe(event.target);
    if(!sourceDrag)return;
    if(sourceDrag.title){event.dataTransfer.setData(C.MIME,JSON.stringify(sourceDrag));event.dataTransfer.setData('text/plain',sourceDrag.text||sourceDrag.address||sourceDrag.title);event.dataTransfer.effectAllowed='copy';}
  });
  function accepts(event){return [...event.dataTransfer.types].some(type=>[C.MIME,'Files','text/plain','text/uri-list'].includes(type));}
  area.addEventListener('dragover',event=>{if(!accepts(event))return;event.preventDefault();event.dataTransfer.dropEffect='copy';area.classList.add('is-ai-drop-target');});
  area.addEventListener('dragleave',event=>{if(!area.contains(event.relatedTarget))area.classList.remove('is-ai-drop-target');});
  document.addEventListener('dragend',()=>{sourceDrag=null;area.classList.remove('is-ai-drop-target');});
  area.addEventListener('drop',async event=>{
    if(!accepts(event))return;event.preventDefault();event.stopPropagation();area.classList.remove('is-ai-drop-target');
    const raw=event.dataTransfer.getData(C.MIME),source=sourceDrag||{workspace:activeWorkspace};sourceDrag=null;
    if(raw){try{add(JSON.parse(raw));}catch{status.textContent='This attachment could not be read.';}return;}
    const files=[...event.dataTransfer.files];
    if(files.length){const workspace=activeWorkspace;expand(false);for(const file of files){if(file.size>25*1024*1024){status.textContent='Files must be smaller than 25 MB.';continue;}if(model.session(workspace).items.length>=24){status.textContent='This conversation holds up to 24 attachments.';break;}try{const fileKey='stash-upload-'+crypto.randomUUID();await F.put(fileKey,file);model.add(workspace,{workspace,id:fileKey,fileKey,filename:file.name,title:file.name,kind:file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':'file',text:file.type.startsWith('text/')?(await file.text()).slice(0,12000):''});persist();render();status.textContent='Attached · AI not connected';}catch{status.textContent='Could not keep this file in this browser.';}}return;}
    const text=event.dataTransfer.getData('text/plain'),url=event.dataTransfer.getData('text/uri-list').split('\n').find(line=>line&&!line.startsWith('#'));
    if(text||url)add({...source,title:url||text.trim().slice(0,80)||'Dropped content',kind:url?'link':'text',text,address:url||''});
  });
  // Move earlier draft requests into the new Area without discarding them.
  const legacyDrafts=readDesktopStorage('spatial-stash-ai-drafts-v1',{}),drafts=legacyDrafts&&typeof legacyDrafts==='object'?legacyDrafts:{};
  if(!desktopStorage.getItem(key)){Object.keys(workspaceProfiles).forEach(workspace=>{const project=workspaceProjects[workspace];const draft=drafts['project:'+project]||drafts[JSON.stringify([workspace,null])];if(typeof draft==='string'&&draft){model.draft(workspace,draft);model.folder(workspace,project);}});persist();}
  globalThis.SpatialAIDesktop={render,expand,mode:()=>model.session(activeWorkspace).mode,setMode,snapshot:()=>model.snapshot(),merge(value){model.load(value);signature='';const session=model.session(activeWorkspace);if(document.activeElement!==prompt)prompt.value=session.draft;render();}};
  layoutDockAreas(false,false);render();
})();
