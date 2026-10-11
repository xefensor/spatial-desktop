/* Working-memory UI uses the same project ownership, storage and display sync as the desktop. */
(function(){
  'use strict';
  const M=SpatialWorkingMemory,F=SpatialStashFiles, storageKey='spatial-working-memory-v1';
  let model=M.create(readDesktopStorage(storageKey,{version:1,records:{}})), persisted=model.snapshot();
  Object.values(projectSpaces).forEach(project=>Object.values(project.stash?.files||{}).forEach(file=>{if(file.record)model.merge({version:1,records:{[file.record.id]:file.record}});}));
  const mediaUrls=new Map(), copying=new Set(), workspaceStashes=new Map(), expandedItems=new Set();
  const area=areaFor('projects');let current='',selected=new Set(),editing=null,draftScope='',lastRemoved=null,temporaryRail=null;
  const host=document.createElement('section');host.id='workingMemory';host.className='working-memory';host.setAttribute('aria-label','Stash');
  host.innerHTML=`<section class="memory-shelf"><header><button class="memory-folder-action" data-memory-action="folder" aria-label="Open Stash folder"><svg aria-hidden="true"><use href="#i-folder"/></svg><b>Stash</b></button><small data-memory-count></small></header><p class="memory-scope" data-memory-scope></p>
  <div class="memory-toolbar"><button class="surface-key" data-memory-action="add" aria-label="Add note or source" title="Add a note or paste a link">${icon('i-add')}<span>Note</span></button><button class="memory-text-action" data-memory-action="files">Choose files</button><input type="file" data-memory-files multiple hidden aria-label="Files to save in Stash"></div>
  <form class="memory-editor" hidden><label>Note or link<textarea data-memory-text maxlength="12000" rows="3" aria-label="Stash item content" placeholder="Write a note or paste a link…"></textarea></label><div class="memory-actions"><button class="surface-key" type="submit">Keep</button><button class="memory-text-action" type="button" data-memory-action="cancel">Cancel</button></div></form>
  <div class="memory-items"></div>
  <p class="memory-help">Drop files, text or links · <button class="memory-text-action" data-memory-action="remember" title="Keep selected text with its source · Ctrl+Shift+M">Keep selection</button></p><p class="memory-feedback" role="status"></p><button class="memory-text-action" data-memory-action="undo" hidden>Undo removal</button></section>`;
  const rail=document.createElement('button');rail.className='surface-key memory-header-key';rail.dataset.memoryAction='reveal';rail.title='Stash';rail.setAttribute('aria-label','Open Stash');rail.innerHTML=icon('i-note');$('.area-window-actions',area).prepend(rail);
  const railEntry=document.createElement('button');railEntry.className='surface-key memory-rail-entry rail-action';railEntry.setAttribute('aria-label','Open Stash');railEntry.innerHTML=icon('i-note')+'<span>Stash</span>';area.append(railEntry);
  const searchGroup=document.createElement('section');searchGroup.className='universal-group';searchGroup.dataset.universalGroup='memory';searchGroup.hidden=true;searchGroup.innerHTML='<h3>Stash · this workspace</h3><div class="universal-result-grid" id="universalMemoryResults"></div>';$('#universalResults').insertBefore(searchGroup,$('[data-universal-group="projects"]'));
  const field=selector=>$(selector,host);
  const quickNote=$('.project-note-module');quickNote.hidden=false;$('.project-resources-module').hidden=true;
  $('#projectRailNote').hidden=false;$('#projectRailResource').hidden=true;
  function projectFor(key){return projectSpaces[JSON.parse(key)[1]];}
  function ownerFor(key){
    const project=projectFor(key);if(project)return project;
    const [workspace,projectId]=JSON.parse(key),profile=workspaceProfiles[workspace];if(projectId||!profile)return null;
    let owner=workspaceStashes.get(workspace);if(!owner){owner={root:profile.home,files:[]};workspaceStashes.set(workspace,owner);}owner.root=profile.home;return owner;
  }
  function savedItem(item){const owner=ownerFor(item.scope),file=owner?.stash?.files?.[item.fileId||item.id];return file?{owner,file,path:F.folder(owner)+'/'+file.name}:null;}
  function resourceItems(key){const project=projectFor(key);if(!project)return [];return project.resources.map((entry,index)=>{
    const [title,detail,type,,meta={}]=entry;let address=meta.address;
    if(address===undefined){const raw=String(detail||'').replace(/^Linked · /,'');address=/^(https?:\/\/|\/)/i.test(raw)?raw:type==='web'&&/^[\w.-]+\.[a-z]{2,}(?:[/?#]|$)/i.test(title)?'https://'+title:'';
      if(raw.startsWith('~/'))address=(workspaceProfiles[project.originWorkspace||JSON.parse(key)[0]]?.home||'/home/demo')+raw.slice(1);
      if(address.startsWith('/')&&/\.[a-z0-9]{1,10}$/i.test(title)&&!address.endsWith('/'+title)&&!address.split('/').at(-1).includes('.'))address=address.replace(/\/$/,'')+'/'+title;
    }
    return {id:'resource:'+JSON.stringify([...JSON.parse(key),meta.fileId||index]),scope:key,kind:'item',title,text:meta.text??detail??'',source:M.source({...meta.source,label:meta.source?.label||'Project resource',address}),created:meta.created||meta.updated||0,why:meta.why||'',updated:meta.updated||0,pinned:!!meta.pinned,resourceIndex:index,resourceType:type,attachment:meta.attachment,fileId:meta.fileId};
  });}
  function itemsFor(key){const project=projectFor(key);const notes=project?Object.values(model.snapshot().records).filter(item=>item.kind==='item'&&!item.deleted&&JSON.parse(item.scope)[1]===JSON.parse(key)[1]):model.items(key);return [...notes.filter(item=>!(project&&item.title==='Project starting point'&&item.text===project.note&&item.source.label===project.name+' · Quick note')), ...resourceItems(key)].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updated-a.updated);}
  function quickItem(key){const project=projectFor(key);return project?.note?{id:'quick:'+key,scope:key,kind:'item',title:'Quick note',text:project.note,source:M.source({label:project.name}),updated:0}:null;}
  function itemFor(id){if(id?.startsWith('quick:'))return quickItem(id.slice(6));if(!id?.startsWith('resource:'))return model.get(id);try{const [workspace,project,index]=JSON.parse(id.slice(9));return resourceItems(M.scope(workspace,project)).find(item=>typeof index==='string'?item.fileId===index:item.resourceIndex===index);}catch{return null;}}
  function persistResources(){persistProjectState();queueDesktopStateBroadcast(0);}
  function editItem(id,value){const item=itemFor(id);if(item?.resourceIndex===undefined)return model.edit(id,value);const project=projectFor(item.scope),entry=project.resources[item.resourceIndex];
    const title=String(value.title??entry[0]).trim()||String(value.text??item.text).trim().split('\n')[0].slice(0,60)||item.source.address.split('/').at(-1)||'Saved item';
    project.resources[item.resourceIndex]=[title,value.text??entry[1],entry[2],entry[3],{...entry[4],source:value.source?M.source(value.source):item.source,address:value.source?.address??item.source.address,text:value.text??item.text,why:value.why??item.why,pinned:value.pinned??item.pinned,created:item.created||Date.now(),updated:Date.now()}];persistResources();return itemFor(id);
  }
  function addItem(key,value){const project=projectFor(key);if(project&&itemsFor(key).length>=80)return null;if(project&&value.source?.address){const resource=describeProjectResource(value.source.address);if(!resource)return null;selected.clear();project.resources.unshift([value.title?.trim()||resource[0],value.text||'',resource[2],resource[3],{fileId:'stash-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)),address:value.source.address,source:M.source(value.source),text:value.text||'',why:value.why||'',created:Date.now(),updated:Date.now()}]);persistResources();return resourceItems(key)[0];}return model.add(key,value);}

  const scope=()=>{const column=desktopPages.column(activeWorkspace);return M.scope(activeWorkspace,projectSpaces[column]?column:null);};
  const allowed=()=>!globalThis.SpatialGuide?.model.active()||SpatialGuide.model.allows('projects');
  function label(key=current){const [workspace,project]=JSON.parse(key);return project?projectSpaces[project]?.name||'Unavailable project':workspaceProfiles[workspace]?.label+' workspace';}
  function feedback(text){field('.memory-feedback').textContent=text;}
  function save(){try{syncFolders();desktopStorage.setItem(storageKey,JSON.stringify(model.snapshot()));persisted=model.snapshot();queueDesktopStateBroadcast(0);return true;}catch{model=M.create(persisted);feedback('Stash is full in this browser. Remove an item or shorten its content before saving more.');return false;}}
  function sourceFor(id=frontApp){const frame=id&&frameFor(id);if(!frame||!isLocalApp(id))return M.source({label:label(scope()),workspace:activeWorkspace,project:JSON.parse(scope())[1],desktop:desktopPages.current(activeWorkspace)});const address=frame.dataset.fileLocation||$('.browser-toolbar input',frame)?.value||'';const owner=desktopPages.columnOf(activeWorkspace,id);return M.source({workspace:activeWorkspace,project:projectSpaces[owner]?owner:null,app:id,label:appInfo[id]?.label+' · '+($('.app-identity small',frame)?.textContent||''),address,desktop:desktopPages.pageOf(activeWorkspace,id)});}
  function selectedText(){const el=document.activeElement;if(el?.matches('textarea,input:not([type="password"])')&&!el.closest('#workingMemory,#universalSearch'))return el.value.slice(el.selectionStart||0,el.selectionEnd||0);const selection=getSelection();if(selection?.anchorNode?.parentElement?.closest('#workingMemory,#universalSearch'))return '';return selection?.toString()||'';}
  let lastSelection=null;
  document.addEventListener('selectionchange',()=>{const text=selectedText().trim();if(text){const parent=getSelection()?.anchorNode?.parentElement;const frame=document.activeElement?.closest('[data-app-frame]')||parent?.closest('[data-app-frame]');lastSelection={text,scope:scope(),source:sourceFor(frame?.dataset.appFrame)};}});
  function remember(){const text=selectedText().trim();const captured=lastSelection?.scope===scope()&&(!text||text===lastSelection.text)?lastSelection:text?{text,scope:scope(),source:sourceFor()}:null;if(!captured?.text||captured.scope!==scope()){reveal();feedback('Select some text in an app first, or use Add note or source.');return;}const item=addItem(captured.scope,{text:captured.text,source:captured.source});if(!item){feedback('This Stash holds up to 80 items. Remove an item to make room.');return;}if(save())recordSaved(item);render(true);reveal();feedback('Selection saved with its source.');lastSelection=null;}
  function attachmentFor(item){const media=F.safeAttachment(item.attachment);if(!media)return null;const src=mediaUrls.get(media.key||media.src)||media.src;return {...media,src:src||''};}
  function syncFolders(){
    let changed=false;const records=Object.values(model.snapshot().records);
    let workspaceChanged=false;
    Object.keys(workspaceProfiles).forEach(workspace=>{
      const key=M.scope(workspace),owner=ownerFor(key);
      if(F.materialize(owner,model.items(key)))workspaceChanged=true;
      F.list(owner).filter(file=>file.attachment).forEach(file=>cacheMedia(key,file));
    });
    Object.entries(projectSpaces).forEach(([id,project])=>{
      project.resources.forEach((entry,index)=>{if(!entry[4]?.fileId){entry[4]={...entry[4],fileId:'stash-'+crypto.randomUUID()};changed=true;}});
      const key=M.scope(project.originWorkspace||activeWorkspace,id);
      const notes=records.filter(item=>item.kind==='item'&&!item.deleted&&JSON.parse(item.scope)[1]===id&&!(item.title==='Project starting point'&&item.text===project.note&&item.source.label===project.name+' · Quick note'));
      if(F.materialize(project,[...resourceItems(key),...notes]))changed=true;
      F.list(project).filter(file=>file.attachment).forEach(file=>cacheMedia(key,file));
    });
    if(workspaceChanged)refreshStashBrowsers();
    if(changed){persistProjectState();refreshStashBrowsers();const project=projectSpaces[activeProjectName];if(project&&!$('#projectRootItems [data-project-item="Stash"]'))$('#projectRootItems').insertAdjacentHTML('beforeend','<button data-project-item="Stash"><span class="linked-type web">'+icon('i-folder')+'</span><span><b>Stash</b><small>Saved notes, files and media</small></span></button>');}
  }
  function refreshStashBrowsers(){Object.keys(appInfo).forEach(id=>{const frame=frameFor(id);if(frame&&(appInfo[id].base||id)==='dolphin'&&[...Object.values(projectSpaces),...workspaceStashes.values()].some(owner=>frame.dataset.fileLocation===owner.root||frame.dataset.fileLocation===F.folder(owner)))renderFileLocation(id,frame.dataset.fileLocation);});}
  function cacheMedia(key,file){
    const token=key+':'+file.id;if(copying.has(token))return;copying.add(token);
    F.copyAsset(ownerFor(key),file).then(blob=>{
      const owner=ownerFor(key),live=owner?.stash?.files?.[file.id];if(!live)return;
      live.blobKey=file.blobKey;if(projectFor(key))persistProjectState();
      const media=live.attachment,mediaKey=media.key||media.src;if(!mediaUrls.has(mediaKey))mediaUrls.set(mediaKey,URL.createObjectURL(blob));
      // Updating the source does not rebuild controls or interrupt playing audio.
      host.querySelectorAll('[data-memory-id]').forEach(row=>{const item=itemFor(row.dataset.memoryId);if(!item?.attachment||item.attachment.key!==media.key||item.attachment.src!==media.src)return;const src=mediaUrls.get(mediaKey);row.querySelectorAll('img,iframe').forEach(el=>{if(el.getAttribute('src')!==src)el.src=src;});const audio=row.querySelector('audio');if(audio?.paused&&audio.currentTime===0&&audio.getAttribute('src')!==src)audio.src=src;row.querySelectorAll('a[href]').forEach(el=>el.href=src);});
    }).catch(()=>{copying.delete(token);if(key===current)feedback('A file could not be copied into Stash. Reopen Stash to retry.');});
  }
  async function saveFiles(files){
    const key=scope(),project=projectFor(key),owner=ownerFor(key);if(!owner)return;
    for(const file of files){
      if(itemsFor(key).length>=80){feedback('This Stash holds up to 80 items. Remove an item to make room.');break;}
      if(file.size>25*1024*1024){feedback('This demo accepts files up to 25 MB each.');continue;}
      const fileId='stash-'+crypto.randomUUID(),kind=file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':file.type==='application/pdf'||file.type==='text/html'?'document':'file';
      try{await F.put(fileId,file);const attachment={key:fileId,kind,filename:file.name,mime:file.type,size:file.size,format:kind==='file'?'File':kind[0].toUpperCase()+kind.slice(1)};
        const text=file.type.startsWith('text/')&&kind==='file'?(await file.text()).slice(0,12000):'';
        if(itemsFor(key).length>=80){feedback('This Stash holds up to 80 items. Remove an item to make room.');break;}
        if(project){project.resources.unshift([file.name,'Saved in Stash',kind,kind==='image'?'i-image':kind==='audio'?'i-music':'i-note',{fileId,attachment,text,source:M.source({label:'Uploaded file',workspace:JSON.parse(key)[0],project:JSON.parse(key)[1]}),created:Date.now(),updated:Date.now()}]);persistResources();}
        else if(!model.add(key,{title:file.name,text,source:{label:'Uploaded file',workspace:JSON.parse(key)[0],project:JSON.parse(key)[1]},attachment})){feedback('This Stash holds up to 80 items.');break;}
        mediaUrls.set(fileId,URL.createObjectURL(file));if(save()){const item=itemsFor(key).find(item=>(item.fileId||item.attachment?.key)===fileId);if(item)recordSaved(item);}selected.clear();render(true);if(current===key)feedback('Saved '+file.name+' in '+F.folder(owner)+'.');
      }catch{feedback('Could not save '+file.name+'. This browser may be out of storage.');}
    }
  }
  function itemMarkup(item){
    const media=attachmentFor(item),address=item.source.address,localTool=item.source.label.startsWith('Local tool'),snippet=item.text.replace(/^Linked · /,'');
    const type=media?.format||(item.resourceType==='folder'?'Folder':item.resourceType==='audio'?'Audio':item.resourceType==='document'?'Document':item.resourceType==='web'||address&&!snippet.trim()?'Source':'Note');
    const typeIcon=media?.kind==='image'?'i-image':media?.kind==='audio'||item.resourceType==='audio'?'i-music':item.resourceType==='folder'?'i-folder':type==='Source'?'i-link':media?.kind==='file'||media?.kind==='document'||item.resourceType==='document'?'i-office':'i-note';
    const sourceLabel=media?.credit||(address?address.replace(/^https?:\/\//,'').replace(/\/$/,''):item.source.label||'Note');
    let content='';
    if(media?.kind==='file')content='<p class="memory-file">'+icon('i-note')+escapeHtml(media.filename||item.title)+'</p>';
    if(media?.kind==='image')content='<a class="memory-image" href="'+escapeHtml(media.src)+'" target="_blank" rel="noopener" aria-label="Open '+escapeHtml(item.title)+' image"><img src="'+escapeHtml(media.src)+'" alt="'+escapeHtml(item.title)+'" loading="lazy"></a>';
    if(media?.kind==='audio')content='<div class="memory-audio"><audio preload="metadata" src="'+escapeHtml(media.src)+'"></audio><button class="surface-key" data-memory-item-action="play" aria-label="Play '+escapeHtml(item.title)+'">'+icon('i-play')+'</button><input class="memory-seek" type="range" min="0" max="8" step="0.05" value="0" aria-label="Seek '+escapeHtml(item.title)+'"><small data-memory-time>0:00 / 0:08</small></div>';
    if(media?.kind==='document')content='<details class="memory-document"><summary>Read document</summary><iframe title="'+escapeHtml(item.title)+'" src="'+escapeHtml(media.src)+'" sandbox loading="lazy"></iframe></details>';
    return '<details class="memory-item" data-memory-id="'+escapeHtml(item.id)+'" data-memory-owner="'+escapeHtml(item.scope)+'" draggable="true"'+(expandedItems.has(item.scope+'\n'+item.id)?' open':'')+'><summary class="memory-item-summary" aria-label="'+escapeHtml(item.title+' · '+type)+'"><span class="memory-type-icon" aria-hidden="true" title="'+escapeHtml(type)+'">'+icon(typeIcon)+'</span><span class="memory-select"><b>'+escapeHtml(item.title)+'</b></span>'+(item.pinned?'<small class="memory-pinned">Pinned</small>':'')+'</summary><div class="memory-item-body">'+content+(snippet&&!item.text.startsWith('Linked · ')?'<p class="memory-excerpt">'+escapeHtml(snippet)+'</p>':'')+originTags(item)+(address?'<button class="memory-text-action memory-source-address" data-memory-item-action="source" title="'+escapeHtml(address)+'">'+escapeHtml(address)+'</button>':media?.credit||localTool?'<small class="memory-source-address">'+(localTool?icon('i-tools'):'')+escapeHtml(sourceLabel)+'</small>':'')+(item.created||item.updated?'<time class="memory-saved-time" datetime="'+new Date(item.created||item.updated).toISOString()+'">Saved '+escapeHtml(new Date(item.created||item.updated).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}))+'</time>':'')+'<details class="memory-edit-details"><summary>Edit content</summary><label>Name <small>optional</small><input data-memory-inline="title" maxlength="120" aria-label="Rename '+escapeHtml(item.title)+'" value="'+escapeHtml(item.title)+'"></label><label>'+ (media?'Caption':'Content')+'<textarea data-memory-inline="text" maxlength="12000" rows="3" aria-label="Edit '+escapeHtml(item.title)+'">'+escapeHtml(item.text)+'</textarea></label></details><div class="memory-row-actions">'+(media?'<button class="memory-text-action" data-memory-item-action="saved-file">Open file</button>':!address&&item.source.app?'<button class="memory-text-action" data-memory-item-action="source">Open source app</button>':'')+'<details class="memory-item-details"><summary aria-label="More options for '+escapeHtml(item.title)+'">More</summary><div class="memory-item-actions"><button class="memory-text-action" data-memory-item-action="pin" aria-label="Pin '+escapeHtml(item.title)+'" aria-pressed="'+item.pinned+'">'+(item.pinned?'Unpin':'Pin')+'</button><button class="memory-text-action" data-memory-item-action="remove">Remove</button></div></details></div></div></details>';
  }
  let signature='',itemsSignature='';
  const drafts=new Map();
  function render(force=false){
    if(desktopSyncApplying){requestAnimationFrame(()=>render(force));return;}
    const key=scope(),changed=key!==current;host.hidden=!allowed();rail.hidden=!allowed();railEntry.hidden=!allowed();if(!allowed())return;
    if(changed){
      if(current&&!field('.memory-editor').hidden)drafts.set(current,{text:field('[data-memory-text]').value});
      current=key;selected.clear();const draft=drafts.get(key);editing=draft?.editing||null;draftScope=draft?key:'';field('.memory-editor').hidden=!draft;
      if(draft)field('[data-memory-text]').value=draft.text;
      field('.memory-feedback').textContent='';lastRemoved=null;field('[data-memory-action="undo"]').hidden=true;
    }
    const target=projectColumnActive()?$('#projectSpaceContent'):$('#projectClosedState');if(host.parentElement!==target){if(projectColumnActive()){target.prepend(quickNote);quickNote.after(host);}else target.prepend(host);}
    if(projectColumnActive()){if(railEntry!==area.lastElementChild)area.append(railEntry);}else if(railEntry.nextElementSibling!==target)area.insertBefore(railEntry,target);
    syncFolders();const project=projectFor(key),owner=ownerFor(key),items=itemsFor(key);field('[data-memory-action="folder"]').disabled=!owner;field('[data-memory-action="folder"]').title=owner?F.folder(owner):'Stash';field('[data-memory-action="files"]').hidden=!owner;
    if(project&&document.activeElement!==$('#projectQuickNote'))$('#projectQuickNote').value=project.note||'';
    const nextSignature=JSON.stringify([key,items]);if(!force&&!changed&&signature===nextSignature&&itemsSignature===nextSignature)return;signature=nextSignature;
    field('[data-memory-scope]').textContent=(project?'Project: '+project.name:'Workspace: '+workspaceProfiles[JSON.parse(key)[0]]?.label);field('[data-memory-count]').textContent=items.length+' item'+(items.length===1?'':'s');
    if(!changed&&document.activeElement?.matches('[data-memory-inline]')&&host.contains(document.activeElement))return;
    const nextItemsSignature=JSON.stringify([key,items]);if(itemsSignature!==nextItemsSignature){host.querySelectorAll('audio').forEach(audio=>audio.pause());field('.memory-items').innerHTML=items.length?items.map(itemMarkup).join(''):'<p class="memory-empty">Keep notes, files and links here.</p>';itemsSignature=nextItemsSignature;}
    prepareControlSemantics(host);
  }
  function collapse(reflow=true){if(!temporaryRail)return;temporaryRail=null;delete area.dataset.memoryRailExpanded;[rail,railEntry].forEach(button=>button.setAttribute('aria-expanded','false'));if(reflow)layoutDockAreas(false,false);}
  function applyRailExpansion(width,height){
    if(!temporaryRail)return;
    const edge=dockState.projects.edge;
    if(temporaryRail.scope!==scope()||temporaryRail.edge!==edge||area.hidden||!isLocalArea('projects')||area.dataset.areaState!=='rail'){collapse(false);return;}
    const vertical=edge==='left'||edge==='right',thickness=Math.min(vertical?width:height,vertical?340:300);
    area.dataset.areaState='expanded';area.dataset.memoryRailExpanded='true';
    applyDockRect('projects',{x:edge==='right'?width-thickness:parseFloat(area.style.left)||0,y:edge==='bottom'?height-thickness:parseFloat(area.style.top)||0,width:vertical?thickness:parseFloat(area.style.width),height:vertical?parseFloat(area.style.height):thickness,joinEdge:area.dataset.areaJoinEdge});
    area.style.zIndex='230';
  }
  function reveal(){render();if(!allowed())return;showArea('projects',false);if(area.dataset.areaState==='rail'&&!temporaryRail){temporaryRail={edge:dockState.projects.edge,scope:scope()};layoutDockAreas(false,false);}[rail,railEntry].forEach(button=>button.setAttribute('aria-expanded','true'));requestAnimationFrame(()=>host.scrollIntoView({block:'start',behavior:'smooth'}));}
  function editor(item=null){
    reveal();
    if(item){const row=host.querySelector('[data-memory-id="'+CSS.escape(item.id)+'"]');if(row){row.open=true;row.querySelector('.memory-edit-details').open=true;row.querySelector('[data-memory-inline="text"]')?.focus();row.scrollIntoView({block:'nearest'});}return;}
    editing=null;draftScope=current;field('.memory-editor').hidden=false;field('[data-memory-text]').value=drafts.get(current)?.text||'';field('[data-memory-text]').focus();
  }
  function recordSaved(item){item=itemFor(item.id)||item;const [workspace,project]=JSON.parse(item.scope);globalThis.SpatialTimelineDesktop?.record('stash.save',{workspace,project,title:item.title,stashId:item.fileId||item.id,page:desktopPages.current(workspace),detail:'Saved to Stash'});}
  function contextFor(item){
    const [workspace,project]=JSON.parse(item.scope),saved=savedItem(item),attachment=F.safeAttachment(item.attachment);
    return {id:item.fileId||item.id,title:item.title,kind:attachment?.kind||'note',text:item.text,address:saved?saved.path:item.source.address,workspace,project,app:item.source.app,source:item.source,savedAt:item.created||item.updated,storageScope:item.scope,filename:saved?.file.name||'',attachment:attachment?{...attachment,filename:attachment.filename||saved?.file.name||item.title}:null};
  }
  function originTags(item){
    const [workspace,project]=JSON.parse(item.scope),src=item.source,originWorkspace=src.workspace||workspace,originProject=src.workspace?src.project:project;
    const tag=(text,accent='')=>'<span class="memory-tag"'+(accent?' style="--memory-tag-accent:'+accent+'"':'')+'>'+escapeHtml(text)+'</span>';
    const space=projectSpaces[originProject],accent=/^#[0-9a-f]{3,8}$/i.test(space?.accent||'')?space.accent:'';
    return '<div class="memory-tags" aria-label="Source context">'+(originProject?tag('Project: '+(space?.name||originProject),accent):'')+tag('Workspace: '+(workspaceProfiles[originWorkspace]?.label||originWorkspace))+(src.app?tag(appInfo[src.app]?.label||appInfo[src.app.split('--')[0]]?.label||src.app):'')+((originWorkspace!==workspace||originProject!==project)?tag('Stored in: '+label(item.scope)):'')+'</div>';
  }

  function openSource(item){const src=item.source;if(src.address){if(/^https?:\/\//i.test(src.address)){const id=createAppInstance('browser');navigateBrowser(id,src.address);}else{const id=createAppInstance('dolphin');const file=/\.[a-z0-9]{1,10}$/i.test(src.address);renderFileLocation(id,file?src.address.slice(0,src.address.lastIndexOf('/'))||'/':src.address);if(file)openAppFile(id,src.address.split('/').at(-1));}return;}if(src.app&&appInfo[src.app]){const owner=desktopPages.columnOf(activeWorkspace,src.app);if(owner!==(JSON.parse(item.scope)[1]||'workspace')){feedback('The source window has moved to another project. Its saved excerpt is still here.');return;}changeDesktopPage(desktopPages.pageOf(activeWorkspace,src.app),false,owner);openApp(src.app);}else feedback('The original app is unavailable. The saved excerpt remains in Stash.');}
  host.addEventListener('submit',event=>{
    event.preventDefault();if(draftScope!==scope())return;
    const text=field('[data-memory-text]').value.trim(),address=/^(https?:\/\/|\/)[^\s]+$/i.test(text)?text:'';
    const [workspace,project]=JSON.parse(current),item=addItem(current,{text:address?'':text,source:{label:'Your note',workspace,project,address}});
    if(!item){feedback('Write a note or paste a link. This Stash holds up to 80 items.');return;}
    if(save()){recordSaved(item);drafts.delete(current);field('.memory-editor').hidden=true;editing=null;render(true);feedback('Saved to '+label()+'.');}
  });
  host.addEventListener('change',event=>{
    if(event.target.matches('[data-memory-files]')){saveFiles([...event.target.files]);event.target.value='';return;}
    const input=event.target.closest('[data-memory-inline]'),row=input?.closest('[data-memory-id]');if(!row)return;
    const item=itemFor(row.dataset.memoryId);if(!item||item.scope!==row.dataset.memoryOwner)return;
    persistInline(input);requestAnimationFrame(()=>render());
  });
  function persistInline(input){
    const row=input.closest('[data-memory-id]'),item=row&&itemFor(row.dataset.memoryId);if(!item||item.scope!==row.dataset.memoryOwner)return;
    expandedItems.add(item.scope+'\n'+item.id);const updated=editItem(item.id,{[input.dataset.memoryInline]:input.value});
    if(save()){const summary=row.querySelector('.memory-item-summary');summary.querySelector('b').textContent=updated.title;summary.setAttribute('aria-label',updated.title+' · '+summary.querySelector('.memory-kind').textContent);feedback('Changes saved.');}
  }
  host.addEventListener('focusout',event=>{if(event.target.matches('[data-memory-inline]'))requestAnimationFrame(()=>render());});
  host.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;const id=button.closest('[data-memory-id]')?.dataset.memoryId,item=id&&itemFor(id),action=button.dataset.memoryAction||button.dataset.memoryItemAction;
    if(action==='folder'&&ownerFor(current))openFileLocation(F.folder(ownerFor(current)));if(action==='files')field('[data-memory-files]').click();if(action==='add')editor();if(action==='cancel'){drafts.delete(current);field('.memory-editor').hidden=true;}if(action==='remember')remember();
    if(action==='saved-file'&&item){syncFolders();const owner=ownerFor(item.scope),file=owner?.stash?.files?.[item.fileId||item.id];if(file){openFileLocation(F.folder(owner));const frameId=Object.keys(appInfo).find(name=>(appInfo[name].base||name)==='dolphin'&&frameFor(name)?.dataset.fileLocation===F.folder(owner)&&desktopPages.inColumn(activeWorkspace,name));if(frameId)openAppFile(frameId,file.name);}}if(action==='play'){const audio=button.closest('.memory-item').querySelector('audio');if(audio.paused){host.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});audio.play().catch(()=>feedback('This audio could not be played. Open its source to try again.'));}else audio.pause();}if(action==='edit')editor(item);if(action==='source')openSource(item);if(action==='pin'){editItem(id,{pinned:!item.pinned});save();render(true);}if(action==='remove'){lastRemoved={id,resource:item.resourceIndex===undefined?null:projectFor(item.scope).resources.splice(item.resourceIndex,1)[0],index:item.resourceIndex,scope:item.scope};if(lastRemoved.resource){selected.clear();persistResources();}else model.remove(id);save();render(true);field('[data-memory-action="undo"]').hidden=false;feedback('Removed '+item.title+'.');}if(action==='undo'&&lastRemoved){if(lastRemoved.resource){projectFor(lastRemoved.scope).resources.splice(lastRemoved.index,0,lastRemoved.resource);persistResources();}else model.restore(lastRemoved.id);save();render(true);lastRemoved=null;button.hidden=true;feedback('Item restored.');}


  });
  host.addEventListener('toggle',event=>{
    const row=event.target;if(!row.matches('.memory-item')||!row.isConnected)return;
    const key=row.dataset.memoryOwner+'\n'+row.dataset.memoryId;
    if(row.open)expandedItems.add(key);else{expandedItems.delete(key);row.querySelectorAll('audio').forEach(audio=>audio.pause());}
  },true);
  const audioTime=value=>{const seconds=Math.floor(Number.isFinite(value)?value:0);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');};
  function updateAudio(event){const audio=event.target;if(audio.tagName!=='AUDIO')return;const row=audio.closest('.memory-audio'),button=row.querySelector('button'),item=itemFor(row.closest('[data-memory-id]').dataset.memoryId);button.innerHTML=icon(audio.paused?'i-play':'i-pause');button.setAttribute('aria-label',(audio.paused?'Play ':'Pause ')+(item?.title||'audio'));const seek=row.querySelector('input');seek.max=Number.isFinite(audio.duration)?audio.duration:8;seek.value=audio.currentTime;row.querySelector('[data-memory-time]').textContent=audioTime(audio.currentTime)+' / '+audioTime(audio.duration);}
  ['loadedmetadata','timeupdate','play','pause','ended'].forEach(type=>host.addEventListener(type,updateAudio,true));
  host.addEventListener('error',event=>{if(event.target.tagName==='AUDIO')feedback('Audio unavailable. Try opening its source.');if(event.target.tagName==='IMG')event.target.alt='Image unavailable — open its source.';},true);
  host.addEventListener('input',event=>{if(event.target.matches('[data-memory-inline]')){persistInline(event.target);return;}if(!event.target.matches('.memory-seek'))return;const audio=event.target.closest('.memory-audio').querySelector('audio');if(Number.isFinite(audio.duration))audio.currentTime=Number(event.target.value);});
  host.addEventListener('dragstart',event=>{if(event.target.closest('input,textarea,button,a,audio,iframe')||event.target.closest('summary:not(.memory-item-summary)'))return;const item=itemFor(event.target.closest('[data-memory-id]')?.dataset.memoryId);if(!item)return;event.dataTransfer.setData(SpatialAIContext.MIME,JSON.stringify(contextFor(item)));event.dataTransfer.setData('text/plain',item.text||item.source.address);if(/^https?:\/\//.test(item.source.address))event.dataTransfer.setData('text/uri-list',item.source.address);event.dataTransfer.effectAllowed='copy';});
  host.addEventListener('dragover',event=>{if(event.dataTransfer.types.some(type=>[SpatialAIContext.MIME,'Files','text/plain','text/uri-list'].includes(type))){event.preventDefault();event.dataTransfer.dropEffect='copy';host.classList.add('is-drop-target');}});
  host.addEventListener('dragleave',event=>{if(!host.contains(event.relatedTarget))host.classList.remove('is-drop-target');});
  async function keepContext(value,key=scope()){
    if(!value||typeof value!=='object'||!allowed())return false;
    if(value.storageScope===key&&itemsFor(key).some(item=>(item.fileId||item.id)===value.id)){feedback('This item is already in this Stash.');return false;}
    const [workspace,project]=JSON.parse(key),source=M.source(value.source?.workspace?value.source:{workspace:value.workspace||workspace,project:value.project||null,app:value.app,label:value.app?appInfo[value.app]?.label||value.app:'Dropped content',address:value.address});
    let attachment=F.safeAttachment(value.attachment);if(attachment)attachment={...attachment,filename:attachment.filename||String(value.filename||value.title||'Saved file').slice(0,160)};
    if(attachment?.key){try{if(!await F.get(attachment.key)){feedback('The saved file is unavailable. Open its source to recover it.');return false;}}catch{feedback('The saved file could not be read.');return false;}}
    if(attachment?.src){try{const blob=await F.copyAsset(ownerFor(key),{id:value.id,attachment}),blobKey='stash-upload-'+crypto.randomUUID();await F.put(blobKey,blob);attachment={...attachment,key:blobKey,src:undefined,filename:value.filename||value.title,mime:blob.type,size:blob.size};}catch{feedback('The file could not be copied.');return false;}}
    if(itemsFor(key).length>=80){feedback('This Stash holds up to 80 items.');return false;}
    const text=String(value.text||'').slice(0,12000),why=String(value.why||'').slice(0,1000),title=String(value.title||'').slice(0,120),address=source.address||M.source({address:value.address}).address;
    const data={title,text,why,source,attachment};let item;
    if(attachment&&project){const id='stash-'+crypto.randomUUID();projectFor(key).resources.unshift([title||attachment.filename||'Saved file',text,attachment.kind,attachment.kind==='image'?'i-image':attachment.kind==='audio'?'i-music':'i-note',{fileId:id,attachment,text,why,source,created:Date.now(),updated:Date.now()}]);persistResources();item=resourceItems(key)[0];}
    else item=addItem(key,{...data,source:{...source,address:attachment?source.address:address}});
    if(!item){feedback('This item has no content to keep.');return false;}
    if(!save())return false;recordSaved(item);render(true);if(current===key)feedback('Saved with its source.');return true;
  }
  function dropIntoStash(event){
    host.classList.remove('is-drop-target');if(event.dataTransfer.files.length){event.preventDefault();event.stopPropagation();saveFiles([...event.dataTransfer.files]);return;}
    if(event.target.closest('textarea,input'))return;
    const raw=event.dataTransfer.getData(SpatialAIContext.MIME),text=event.dataTransfer.getData('text/plain'),url=event.dataTransfer.getData('text/uri-list').split('\n').find(line=>line&&!line.startsWith('#'));
    if(!raw&&!text&&!url)return;event.preventDefault();event.stopPropagation();
    if(raw){try{keepContext(JSON.parse(raw));}catch{feedback('This source could not be read.');}return;}
    const address=url||(/^(https?:\/\/|\/)[^\s]+$/i.test(text.trim())?text.trim():'');
    keepContext({text:address?'':text,address,workspace:activeWorkspace,project:JSON.parse(scope())[1],source:{label:'Dropped content',address,workspace:activeWorkspace,project:JSON.parse(scope())[1]}});
  }
  host.addEventListener('drop',dropIntoStash);
  host.addEventListener('paste',event=>{if(event.target.closest('input,textarea')||!event.clipboardData)return;dropIntoStash({target:event.target,dataTransfer:event.clipboardData,preventDefault:()=>event.preventDefault(),stopPropagation:()=>event.stopPropagation()});});
  [rail,railEntry].forEach(button=>{
    button.addEventListener('click',()=>{reveal();field('[data-memory-action="add"]').focus();});
    button.addEventListener('dragover',event=>{if(!event.dataTransfer.types.some(type=>[SpatialAIContext.MIME,'Files','text/plain','text/uri-list'].includes(type)))return;event.preventDefault();event.dataTransfer.dropEffect='copy';reveal();});
    button.addEventListener('drop',event=>{reveal();dropIntoStash(event);});
  });
  document.addEventListener('pointerdown',event=>{if(temporaryRail&&!area.contains(event.target))collapse();},true);
  document.addEventListener('focusin',event=>{if(temporaryRail&&!area.contains(event.target))collapse();});
  document.addEventListener('keydown',event=>{if(event.ctrlKey&&event.shiftKey&&event.code==='KeyM'&&allowed()){event.preventDefault();remember();}if(event.key==='Escape'&&temporaryRail)collapse();});

  document.addEventListener('click',event=>{const result=event.target.closest('[data-memory-result]');if(!result)return;const item=itemFor(result.dataset.memoryResult);if(!item)return;const [,project]=JSON.parse(item.scope);setUniversalSearchOpen(false);if(project&&projectSpaces[project])activateProject(project,false);else changeDesktopPage(desktopPages.current(activeWorkspace),false,'workspace');render(true);reveal();const row=$('[data-memory-id="'+CSS.escape(item.id)+'"]',host);if(row)row.open=true;row?.scrollIntoView({block:'center'});if(item.id.startsWith('quick:')){$('#projectQuickNote').focus();$('#projectQuickNote').scrollIntoView({block:'nearest'});}else {row?.setAttribute('tabindex','-1');row?.focus();}});
  function search(query){const searchable=M.create(model.snapshot());Object.entries(projectSpaces).forEach(([id,project])=>{if(project.originWorkspace===activeWorkspace||openProjectNames().includes(id)){const key=M.scope(activeWorkspace,id);[...itemsFor(key),quickItem(key)].filter(Boolean).map(item=>({...item,scope:key})).forEach(item=>searchable.merge({version:1,records:{[item.id]:item}}));}});const results=allowed()?searchable.search(query,activeWorkspace).filter(item=>!JSON.parse(item.scope)[1]||projectSpaces[JSON.parse(item.scope)[1]]):[];$('#universalMemoryResults').innerHTML=results.map(item=>'<button class="universal-result" data-memory-result="'+escapeHtml(item.id)+'"><span class="universal-symbol">'+icon('i-note')+'</span><span><b>'+escapeHtml(item.title)+'</b><small>'+escapeHtml(label(item.scope)+' · '+(item.source.label||'Your note')+(item.updated?' · '+sessionAge(item.updated):''))+'</small><small>'+escapeHtml((item.text||item.source.address).slice(0,120))+'</small></span></button>').join('');prepareControlSemantics(searchGroup);return results.length;}
  function seed(){if(desktopPreset!=='demo'||globalThis.SpatialGuide?.model.active())return;Object.entries(projectSpaces).forEach(([id,project])=>{if(!SpatialDemoExamples.projects[id]||project.name!==SpatialDemoExamples.projects[id].name)return;const workspace=project.originWorkspace;if(!workspaceProfiles[workspace])return;const key=M.scope(workspace,id);if(model.seeded(key))return;model.markSeeded(key);model.add(key,{title:'Questions for the next review',text:'What is ready to share?\nWhat still needs testing?\nNext: review the project starting point before opening another task.',source:{}});});save();}
  function ownerAtFolder(path){
    const pair=Object.entries(projectSpaces).find(([,project])=>F.folder(project)===path);
    if(pair)return {owner:pair[1],key:M.scope(pair[1].originWorkspace||activeWorkspace,pair[0])};
    const workspace=Object.keys(workspaceProfiles).find(id=>F.folder(ownerFor(M.scope(id)))===path);
    return workspace?{owner:ownerFor(M.scope(workspace)),key:M.scope(workspace)}:null;
  }
  function fileRows(path){
    const pair=ownerAtFolder(path);if(pair)return F.rows(pair.owner);
    const workspace=Object.keys(workspaceProfiles).find(id=>workspaceProfiles[id].home===path);
    if(workspace)return [...workspaceProfiles[workspace].folders.filter(([name])=>name!=='Stash'),['Stash','Saved notes, files and media','folder']];
    return null;
  }
  function openSavedFile(id,path,name){
    const pair=ownerAtFolder(path),file=pair&&F.list(pair.owner).find(file=>file.name===name);if(!file)return false;
    const preview=$('.file-preview',frameFor(id));preview.innerHTML='<header><div><b>'+escapeHtml(file.name)+'</b><small>'+escapeHtml(path)+'</small></div>'+appActionButton('file-preview-close','i-close','Close file preview')+'</header><div class="stash-file-content"><p>Loading saved file…</p></div>';preview.hidden=false;
    const section=$('.stash-file-content',preview),savedScope=pair.key;
    const renderFile=(blob)=>{
      if(!preview.isConnected||$('.stash-file-content',preview)!==section)return;
      const url=URL.createObjectURL(blob);let body=file.content!==null?'<pre>'+escapeHtml(file.content)+'</pre>':file.kind==='image'?'<img class="stash-file-image" src="'+escapeHtml(url)+'" alt="'+escapeHtml(file.title)+'">':file.kind==='audio'?'<audio controls preload="metadata" src="'+escapeHtml(url)+'" aria-label="'+escapeHtml(file.title)+'"></audio>':file.kind==='document'?'<iframe src="'+escapeHtml(url)+'" title="'+escapeHtml(file.title)+'" sandbox></iframe>':file.attachment?.mime?.startsWith('text/')?'<pre>'+escapeHtml(file.caption)+'</pre>':'<p>'+escapeHtml(file.title)+' · '+escapeHtml(file.attachment?.mime||'Saved file')+'</p>';
      section.innerHTML=body+'<div class="stash-file-actions"><a class="surface-key" href="'+escapeHtml(url)+'" download="'+escapeHtml(file.name)+'">Download file</a><button class="surface-key" data-stash-edit="'+escapeHtml(file.id)+'" data-stash-scope="'+escapeHtml(savedScope)+'">Edit '+(file.attachment?'details':'in Stash')+'</button></div>';
      prepareControlSemantics(preview);
    };
    if(file.content!==null)renderFile(new Blob([file.content],{type:file.kind==='note'?'text/markdown;charset=utf-8':'text/plain;charset=utf-8'}));
    else F.copyAsset(pair.owner,file).then(renderFile).catch(()=>{section.textContent='This saved file is unavailable in this browser.';});return true;
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-stash-edit]');if(!button)return;const [workspace,id]=JSON.parse(button.dataset.stashScope);if(activeWorkspace!==workspace)renderWorkspace(workspace,false);if(id)activateProject(id,false);else changeDesktopPage(desktopPages.current(activeWorkspace),false,'workspace');render(true);const item=itemsFor(current).find(item=>(item.fileId||item.id)===button.dataset.stashEdit);if(item)editor(item);});
  globalThis.SpatialMemoryDesktop={itemFor,savedItem,contextFor,contextAtFile(path){const folder=path.slice(0,path.lastIndexOf('/')),pair=ownerAtFolder(folder),file=pair&&F.list(pair.owner).find(file=>folder+'/'+file.name===path),item=file&&itemsFor(pair.key).find(item=>(item.fileId||item.id)===file.id);return item?contextFor(item):null;},keepContext,reveal,revealItem(id,key){const item=itemsFor(key).find(item=>(item.fileId||item.id)===id);if(!item){reveal();feedback('This item is no longer in Stash.');return false;}reveal();const row=host.querySelector('[data-memory-id="'+CSS.escape(item.id)+'"]');if(row){row.open=true;row.scrollIntoView({block:'center'});row.querySelector('summary').focus();}return true;},items:()=>itemsFor(scope()),fileRows,openFile:openSavedFile,render,search,remember,applyRailExpansion,snapshot:()=>model.snapshot(),merge(value){if(model.merge(value)){try{desktopStorage.setItem(storageKey,JSON.stringify(model.snapshot()));persisted=model.snapshot();}catch{}render(true);}}};
  Object.values(model.snapshot().records).filter(item=>item.kind==='next'&&!item.deleted).forEach(item=>model.promoteNext(item.scope,projectFor(item.scope)?.note));
  seed();save();render(true);refreshStashBrowsers();prepareControlSemantics(rail.parentElement);
})();
