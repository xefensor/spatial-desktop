/* Working-memory UI uses the same project ownership, storage and display sync as the desktop. */
(function(){
  'use strict';
  const M=SpatialWorkingMemory,F=SpatialStashFiles, storageKey='spatial-working-memory-v1';
  let model=M.create(readDesktopStorage(storageKey,{version:1,records:{}})), persisted=model.snapshot();
  Object.values(projectSpaces).forEach(project=>Object.values(project.stash?.files||{}).forEach(file=>{if(file.record)model.merge({version:1,records:{[file.record.id]:file.record}});}));
  const mediaUrls=new Map(), copying=new Set(), workspaceStashes=new Map(), expandedItems=new Set((()=>{const saved=readDesktopStorage('spatial-stash-expanded-v1',[]);return Array.isArray(saved)?saved.filter(value=>typeof value==='string').slice(0,500):[];})());
  const area=areaFor('projects');let current='',selected=new Set(),editing=null,draftScope='',lastRemoved=null,temporaryRail=null;
  const host=document.createElement('section');host.id='workingMemory';host.className='working-memory';host.setAttribute('aria-label','folder');
  host.innerHTML=`<section class="memory-shelf"><header><button class="memory-folder-action" data-memory-action="folder" aria-label="Open folder in File Browser"><svg aria-hidden="true"><use href="#i-folder"/></svg><b>Files</b></button><small data-memory-count></small></header><p class="memory-scope" data-memory-scope></p>
  <div class="memory-toolbar"><button class="surface-key" data-memory-action="add" aria-label="Add note or source" title="Add a note or paste a link">${icon('i-add')}<span>Note</span></button><button class="memory-text-action" data-memory-action="files">Choose files</button><input type="file" data-memory-files multiple hidden aria-label="Files to save in this folder"></div>
  <form class="memory-editor" hidden><label>Note or link<textarea data-memory-text maxlength="12000" rows="3" aria-label="Note or link content" placeholder="Write a note or paste a link…"></textarea></label><div class="memory-actions"><button class="surface-key" type="submit">Keep</button><button class="memory-text-action" type="button" data-memory-action="cancel">Cancel</button></div></form>
  <div class="memory-browse"><label class="library-search">${icon('i-search')}<input type="search" data-memory-query aria-label="Search this folder" placeholder="Find in this folder…"></label><select data-memory-filter aria-label="Show folder items"><option value="all">All items</option><option value="pinned">Pinned</option></select></div>
  <div class="memory-items"></div>
  <div class="memory-empty" hidden><b data-memory-empty-title></b><p data-memory-empty-detail></p><button class="library-reset" data-memory-action="clear-filter" hidden>Show all items</button></div>
  <p class="memory-help">Drop files, text or links</p><p class="memory-feedback" role="status"></p><button class="memory-text-action" data-memory-action="undo" hidden>Undo removal</button></section>`;
  const rail=document.createElement('button');rail.className='surface-key memory-header-key';rail.dataset.memoryAction='reveal';rail.title='Files';rail.setAttribute('aria-label','Open files');rail.innerHTML=icon('i-note');$('.area-window-actions',area).prepend(rail);
  const railEntry=document.createElement('button');railEntry.className='surface-key memory-rail-entry rail-action';railEntry.setAttribute('aria-label','Open files');railEntry.innerHTML=icon('i-note')+'<span>Files</span>';area.append(railEntry);
  const dropHint=document.createElement('div'),dropTitle=document.createElement('b'),dropDetail=document.createElement('small');
  dropHint.className='memory-drop-hint';dropHint.hidden=true;dropHint.setAttribute('role','status');dropHint.append(dropTitle,dropDetail);document.body.append(dropHint);
  let dropPosition=null;
  const searchGroup=document.createElement('section');searchGroup.className='universal-group';searchGroup.dataset.universalGroup='memory';searchGroup.hidden=true;searchGroup.innerHTML='<h3>Saved files · this workspace</h3><div class="universal-result-grid" id="universalMemoryResults"></div>';$('#universalResults').insertBefore(searchGroup,$('[data-universal-group="projects"]'));
  const field=selector=>$(selector,host);
  $('.project-resources-module').hidden=true;
  $('#projectRailResource').hidden=true;
  function projectFor(key){return projectSpaces[JSON.parse(key)[1]];}
  function ownerFor(key){
    const project=projectFor(key);if(project)return project;
    const [workspace,projectId]=JSON.parse(key),profile=workspaceProfiles[workspace];if(projectId||!profile)return null;
    let owner=workspaceStashes.get(workspace);if(!owner){owner={root:profile.home,files:[]};workspaceStashes.set(workspace,owner);}owner.root=profile.home;return owner;
  }
  function savedItem(item){const owner=ownerFor(item.scope),file=owner?.stash?.files?.[item.fileId||item.id];return file?{owner,file,path:F.path(owner,file)}:null;}
  function resourceItems(key){const project=projectFor(key);if(!project)return [];return project.resources.map((entry,index)=>{
    const [title,detail,type,,meta={}]=entry;let address=meta.address;
    if(address===undefined){const raw=String(detail||'').replace(/^Linked · /,'');address=/^(https?:\/\/|\/)/i.test(raw)?raw:type==='web'&&/^[\w.-]+\.[a-z]{2,}(?:[/?#]|$)/i.test(title)?'https://'+title:'';
      if(raw.startsWith('~/'))address=(workspaceProfiles[project.originWorkspace||JSON.parse(key)[0]]?.home||'/home/demo')+raw.slice(1);
      if(address.startsWith('/')&&/\.[a-z0-9]{1,10}$/i.test(title)&&!address.endsWith('/'+title)&&!address.split('/').at(-1).includes('.'))address=address.replace(/\/$/,'')+'/'+title;
    }
    return {id:'resource:'+JSON.stringify([...JSON.parse(key),meta.fileId||index]),scope:key,kind:'item',title,text:meta.text??detail??'',source:M.source({...meta.source,label:meta.source?.label||'Project resource',address}),created:meta.created||meta.updated||0,why:meta.why||'',updated:meta.updated||0,pinned:!!meta.pinned,resourceIndex:index,resourceType:type,attachment:meta.attachment,fileId:meta.fileId,itemId:meta.itemId,relativeDirectory:meta.relativeDirectory||'',reference:meta.reference===true};
  });}
  function itemsFor(key){const project=projectFor(key);const notes=project?Object.values(model.snapshot().records).filter(item=>item.kind==='item'&&!item.deleted&&JSON.parse(item.scope)[1]===JSON.parse(key)[1]):model.items(key);return [...notes, ...resourceItems(key)].map(item=>globalThis.SpatialItemHistoryDesktop?.hydrate(item)||item).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updated-a.updated);}
  function itemFor(id){let item;if(!id?.startsWith('resource:'))item=model.get(id);else try{const [workspace,project,index]=JSON.parse(id.slice(9));item=resourceItems(M.scope(workspace,project)).find(item=>typeof index==='string'?item.fileId===index:item.resourceIndex===index);}catch{return null;}return item?(globalThis.SpatialItemHistoryDesktop?.hydrate(item)||item):null;}

  function persistResources(){persistProjectState();queueDesktopStateBroadcast(0);}
  function editItem(id,value){const item=itemFor(id);if(!item)return null;if(item?.resourceIndex===undefined){const updated=model.edit(id,{title:item.title,text:item.text,source:item.source,attachment:item.attachment,...value});globalThis.SpatialItemHistoryDesktop?.capture(updated,{force:true,action:'edit'});return updated;}const project=projectFor(item.scope),entry=project.resources[item.resourceIndex];
    const title=String(value.title??item.title).trim()||String(value.text??item.text).trim().split('\n')[0].slice(0,60)||item.source.address.split('/').at(-1)||'Saved item';
    project.resources[item.resourceIndex]=[title,value.text??item.text,entry[2],entry[3],{...entry[4],attachment:item.attachment,source:value.source?M.source(value.source):item.source,address:value.source?.address??item.source.address,text:value.text??item.text,why:value.why??item.why,pinned:value.pinned??item.pinned,created:item.created||Date.now(),updated:Date.now()}];persistResources();const updated=resourceItems(item.scope).find(candidate=>candidate.fileId===item.fileId||candidate.id===id);globalThis.SpatialItemHistoryDesktop?.capture(updated,{force:true,action:'edit'});return updated;
  }
  function addItem(key,value){value={relativeDirectory:globalThis.SpatialFolderDesktop?.relativeDirectory(key)||'',...value};const project=projectFor(key);if(project&&itemsFor(key).length>=80)return null;if(project&&value.source?.address){const resource=describeProjectResource(value.source.address);if(!resource)return null;selected.clear();project.resources.unshift([value.title?.trim()||resource[0],value.text||'',resource[2],resource[3],{fileId:'stash-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)),address:value.source.address,source:M.source(value.source),text:value.text||'',why:value.why||'',created:Date.now(),updated:Date.now(),itemId:value.itemId,reference:!!value.reference,relativeDirectory:value.relativeDirectory}]);persistResources();return resourceItems(key)[0];}return model.add(key,value);}

  const scope=()=>{const column=desktopPages.column(activeWorkspace);return M.scope(activeWorkspace,projectSpaces[column]?column:null);};
  const allowed=()=>!globalThis.SpatialGuide?.model.active()||SpatialGuide.model.allows('stash');
  function label(key=current){const [workspace,project]=JSON.parse(key);return project?projectSpaces[project]?.name||'Unavailable project':workspaceProfiles[workspace]?.label+' workspace';}
  function showDropTarget(event=null){
    const visible=Boolean(event)&&allowed()&&!area.hidden;
    [host,rail,railEntry].forEach(node=>node.classList.toggle('is-drop-target',visible));dropHint.hidden=!visible;dropPosition=visible?{clientX:event.clientX,clientY:event.clientY}:null;
    if(!visible)return;
    const key=scope(),owner=ownerFor(key),title='Copy into '+label(key)+' folder',detail=owner?(globalThis.SpatialFolderDesktop?.path(key)||F.folder(owner)):'Copy with its source';
    if(dropTitle.textContent!==title)dropTitle.textContent=title;if(dropDetail.textContent!==detail)dropDetail.textContent=detail;
    const rect=dropHint.getBoundingClientRect();
    dropHint.style.left=Math.max(8,Math.min(event.clientX+18,window.innerWidth-rect.width-8))+'px';
    dropHint.style.top=Math.max(8,Math.min(event.clientY+18,window.innerHeight-rect.height-8))+'px';
  }
  function feedback(text){field('.memory-feedback').textContent=text;}
  function save(){try{syncFolders();desktopStorage.setItem(storageKey,JSON.stringify(model.snapshot()));persisted=model.snapshot();queueDesktopStateBroadcast(0);return true;}catch{model=M.create(persisted);feedback('Saved file storage is full in this browser. Remove an item or shorten its content before saving more.');return false;}}
  function sourceFor(id=frontApp){const frame=id&&frameFor(id);if(!frame||!isLocalApp(id))return M.source({label:label(scope()),workspace:activeWorkspace,project:JSON.parse(scope())[1],desktop:desktopPages.current(activeWorkspace)});const address=frame.dataset.fileLocation||$('.browser-toolbar input',frame)?.value||'';const owner=desktopPages.columnOf(activeWorkspace,id);return M.source({workspace:activeWorkspace,project:projectSpaces[owner]?owner:null,app:id,label:appInfo[id]?.label+' · '+($('.app-identity small',frame)?.textContent||''),address,desktop:desktopPages.pageOf(activeWorkspace,id)});}
  function attachmentFor(item){const media=F.safeAttachment(item.attachment);if(!media)return null;const src=mediaUrls.get(media.key||media.src)||media.src;return {...media,src:src||''};}
  function syncFolders(){
    let changed=false;Object.entries(projectSpaces).forEach(([id,project])=>{if(model.migrateQuickNote(M.scope(project.originWorkspace||activeWorkspace,id),project.note||'',project.name))changed=true;});const records=Object.values(model.snapshot().records);
    let workspaceChanged=false;
    Object.keys(workspaceProfiles).forEach(workspace=>{
      const key=M.scope(workspace),owner=ownerFor(key);
      if(F.materialize(owner,model.items(key).map(item=>globalThis.SpatialItemHistoryDesktop?.hydrate(item)||item)))workspaceChanged=true;
      F.list(owner).filter(file=>file.attachment).forEach(file=>cacheMedia(key,file));
    });
    Object.entries(projectSpaces).forEach(([id,project])=>{
      project.resources.forEach((entry,index)=>{if(!entry[4]?.fileId){entry[4]={...entry[4],fileId:'stash-'+crypto.randomUUID()};changed=true;}});
      const key=M.scope(project.originWorkspace||activeWorkspace,id);
      const notes=records.filter(item=>item.kind==='item'&&!item.deleted&&JSON.parse(item.scope)[1]===id);
      if(F.materialize(project,[...resourceItems(key),...notes].map(item=>globalThis.SpatialItemHistoryDesktop?.hydrate(item)||item)))changed=true;
      F.list(project).filter(file=>file.attachment).forEach(file=>cacheMedia(key,file));
    });
    if(workspaceChanged)refreshStashBrowsers();
    if(changed){persistProjectState();refreshStashBrowsers();}
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
    }).catch(()=>{copying.delete(token);if(key===current)feedback('A file could not be copied into the folder. Reopen Files to retry.');});
  }
  async function saveFiles(files){
    const key=scope(),project=projectFor(key),owner=ownerFor(key),relativeDirectory=globalThis.SpatialFolderDesktop?.relativeDirectory(key)||'';if(!owner)return;
    for(const file of files){
      if(itemsFor(key).length>=80){feedback('This folder supports up to 80 items. Remove an item to make room.');break;}
      if(file.size>25*1024*1024){feedback('This demo accepts files up to 25 MB each.');continue;}
      const fileId='stash-'+crypto.randomUUID(),kind=file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':file.type==='application/pdf'||file.type==='text/html'?'document':'file';
      try{await F.put(fileId,file);const attachment={key:fileId,kind,filename:file.name,mime:file.type,size:file.size,format:kind==='file'?'File':kind[0].toUpperCase()+kind.slice(1)};
        const text=file.type.startsWith('text/')&&kind==='file'?(await file.text()).slice(0,12000):'';
        if(itemsFor(key).length>=80){feedback('This folder supports up to 80 items. Remove an item to make room.');break;}
        if(project){project.resources.unshift([file.name,'Saved file',kind,kind==='image'?'i-image':kind==='audio'?'i-music':'i-note',{fileId,attachment,text,relativeDirectory,source:M.source({label:'Uploaded file',workspace:JSON.parse(key)[0],project:JSON.parse(key)[1]}),created:Date.now(),updated:Date.now()}]);persistResources();}
        else if(!model.add(key,{title:file.name,text,relativeDirectory,source:{label:'Uploaded file',workspace:JSON.parse(key)[0],project:JSON.parse(key)[1]},attachment})){feedback('This folder supports up to 80 items.');break;}
        mediaUrls.set(fileId,URL.createObjectURL(file));if(save()){const item=itemsFor(key).find(item=>(item.fileId||item.attachment?.key)===fileId);if(item)recordSaved(item);if(current===key)resetShelfFilters();}selected.clear();render(true);if(current===key)feedback('Saved '+file.name+' in '+F.folder(owner)+'.');
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
    return '<details class="memory-item" data-memory-id="'+escapeHtml(item.id)+'" data-memory-owner="'+escapeHtml(item.scope)+'" draggable="true"'+(expandedItems.has(item.scope+'\n'+item.id)?' open':'')+'><summary class="memory-item-summary" aria-label="'+escapeHtml(item.title+' · '+type)+'"><span class="memory-type-icon" aria-hidden="true" title="'+escapeHtml(type)+'">'+icon(typeIcon)+'</span><span class="memory-select"><b>'+escapeHtml(item.title)+'</b><small class="memory-summary-preview">'+escapeHtml((snippet||media?.filename||'').replace(/\s+/g,' ').slice(0,90))+'</small></span>'+(item.pinned?'<small class="memory-pinned">Pinned</small>':'')+'</summary><div class="memory-item-body">'+content+(snippet&&!item.text.startsWith('Linked · ')?'<p class="memory-excerpt">'+escapeHtml(snippet)+'</p>':'')+'<details class="memory-info-details"><summary>Details</summary><div class="memory-metadata">'+originTags(item)+(address?'<button class="memory-text-action memory-source-address" data-memory-item-action="source" title="'+escapeHtml(address)+'">'+escapeHtml(address)+'</button>':media?.credit||localTool?'<small class="memory-source-address">'+(localTool?icon('i-tools'):'')+escapeHtml(sourceLabel)+'</small>':'')+(item.created||item.updated?'<time class="memory-saved-time" datetime="'+new Date(item.created||item.updated).toISOString()+'">Saved '+escapeHtml(new Date(item.created||item.updated).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}))+'</time>':'')+'<button class="memory-text-action" data-memory-item-action="history">History</button></div></details><details class="memory-edit-details"><summary>Edit content</summary><label>Name <small>optional</small><input data-memory-inline="title" maxlength="120" aria-label="Rename '+escapeHtml(item.title)+'" value="'+escapeHtml(item.title)+'"></label><label>'+ (media?'Caption':'Content')+'<textarea data-memory-inline="text" maxlength="12000" rows="3" aria-label="Edit '+escapeHtml(item.title)+'">'+escapeHtml(item.text)+'</textarea></label></details><div class="memory-row-actions">'+(media?'<button class="memory-text-action" data-memory-item-action="saved-file">Open file</button>':!address&&item.source.app&&appInfo[item.source.app]?'<button class="memory-text-action" data-memory-item-action="source">Open source app</button>':'')+'<details class="memory-item-details"><summary aria-label="More options for '+escapeHtml(item.title)+'">⋯</summary><div class="memory-item-actions"><button class="memory-text-action" data-memory-item-action="pin" aria-label="Pin '+escapeHtml(item.title)+'" aria-pressed="'+item.pinned+'">'+(item.pinned?'Unpin':'Pin')+'</button><button class="memory-text-action" data-memory-item-action="transfer">Add to another folder…</button><button class="memory-text-action" data-memory-item-action="remove">Remove saved file</button></div></details></div></div></details>';
  }
  function stashMatches(item,query,filter){
    return (filter!=='pinned'||item.pinned)&&(!query.trim()||matchesSearch([item.title,item.text,item.source?.label,item.source?.address,item.source?.app,item.attachment?.filename].join(' '),query));
  }
  const shelfViews=new Map();
  function filterShelf(items=itemsFor(current)){
    if(globalThis.SpatialFolderDesktop)return SpatialFolderDesktop.filter(host,items,ownerFor(current),current);
    const query=field('[data-memory-query]').value||'',filter=field('[data-memory-filter]').value||'all';
    shelfViews.set(current,{query,filter});
    const visible=new Set(items.filter(item=>stashMatches(item,query,filter)).map(item=>item.id));
    // Hide existing disclosures: filtering must not rebuild previews or interrupt audio.
    host.querySelectorAll('[data-memory-id]').forEach(row=>{row.hidden=!visible.has(row.dataset.memoryId);});
    field('[data-memory-count]').textContent=(visible.size===items.length?items.length:visible.size+' of '+items.length)+' item'+(items.length===1?'':'s');
    const filtered=Boolean(query.trim())||filter!=='all';
    field('.memory-empty').hidden=visible.size>0;
    field('[data-memory-empty-title]').textContent=items.length?'No matching items':'Nothing saved yet';
    field('[data-memory-empty-detail]').textContent=items.length?'Try another search or show all items.':'Add a note, choose files or drop something here.';
    field('[data-memory-action="clear-filter"]').hidden=!filtered;
  }
  function resetShelfFilters(){
    field('[data-memory-query]').value='';field('[data-memory-filter]').value='all';filterShelf();
  }
  let signature='',itemsSignature='';
  const drafts=new Map();
  function render(force=false){
    if(desktopSyncApplying){requestAnimationFrame(()=>render(force));return;}
    if(dropPosition)showDropTarget(dropPosition);
    const key=scope(),changed=key!==current;globalThis.SpatialProjectRail?.contextChanged?.(key);host.hidden=!allowed();rail.hidden=!allowed();railEntry.hidden=!allowed();if(!allowed())return;
    if(changed){
      if(current&&!field('.memory-editor').hidden)drafts.set(current,{text:field('[data-memory-text]').value});
      current=key;selected.clear();const draft=drafts.get(key);editing=draft?.editing||null;draftScope=draft?key:'';field('.memory-editor').hidden=!draft;
      const view=shelfViews.get(key);field('[data-memory-query]').value=view?.query||'';field('[data-memory-filter]').value=view?.filter||'all';
      if(draft)field('[data-memory-text]').value=draft.text;
      field('.memory-feedback').textContent='';lastRemoved=null;field('[data-memory-action="undo"]').hidden=true;
    }
    const inlineTarget=projectColumnActive()?$('#projectSpaceContent'):$('#projectClosedState'),target=globalThis.SpatialProjectRail?.stashTarget?.()||inlineTarget;if(host.parentElement!==target)target.prepend(host);
    if(projectColumnActive()){if(railEntry!==area.lastElementChild)area.append(railEntry);}else if(railEntry.nextElementSibling!==inlineTarget)area.insertBefore(railEntry,inlineTarget);
    syncFolders();const project=projectFor(key),owner=ownerFor(key),items=itemsFor(key);field('[data-memory-action="folder"]').disabled=!owner;field('[data-memory-action="folder"]').title=owner?F.folder(owner):'folder';field('[data-memory-action="files"]').hidden=!owner;
    const folderPath=globalThis.SpatialFolderDesktop?.path(key)||'';const nextSignature=JSON.stringify([key,folderPath,items,globalThis.SpatialFolderDesktop?.revision()]);if(!force&&!changed&&signature===nextSignature&&itemsSignature===nextSignature)return;signature=nextSignature;
    field('[data-memory-scope]').textContent=(project?'Project: '+project.name:'Workspace: '+workspaceProfiles[JSON.parse(key)[0]]?.label);field('[data-memory-count]').textContent=items.length+' item'+(items.length===1?'':'s');
    if(!changed&&document.activeElement?.matches('[data-memory-inline],[data-item-tags]')&&host.contains(document.activeElement))return;
    const nextItemsSignature=JSON.stringify([key,folderPath,items,globalThis.SpatialFolderDesktop?.revision()]);if(itemsSignature!==nextItemsSignature){
      const disclosures=new Map(!changed?[...host.querySelectorAll('[data-memory-id]')].map(row=>[row.dataset.memoryId,['memory-edit-details','memory-item-details','memory-document','memory-info-details'].filter(name=>row.querySelector('.'+name)?.open)]):[]);
      host.querySelectorAll('audio').forEach(audio=>audio.pause());field('.memory-items').innerHTML=globalThis.SpatialFolderDesktop?SpatialFolderDesktop.markup({key,owner,items,itemMarkup}):items.map(itemMarkup).join('');
      host.querySelectorAll('[data-memory-id]').forEach(row=>{for(const name of disclosures.get(row.dataset.memoryId)||[]){const disclosure=row.querySelector('.'+name);if(disclosure)disclosure.open=true;}});
      itemsSignature=nextItemsSignature;
    }
    globalThis.SpatialFolderDesktop?.decorate(host,{key,owner,items});
    filterShelf(items);
    prepareControlSemantics(host);
    globalThis.SpatialEmptyDesktop?.refresh();
  }
  function collapse(reflow=true){globalThis.SpatialProjectRail?.close?.();if(!temporaryRail)return;temporaryRail=null;delete area.dataset.memoryRailExpanded;[rail,railEntry].forEach(button=>button.setAttribute('aria-expanded','false'));if(reflow)layoutDockAreas(false,false);}
  function applyRailExpansion(width,height){
    if(!temporaryRail)return;
    const edge=dockState.projects.edge;
    if(temporaryRail.scope!==scope()||temporaryRail.edge!==edge||area.hidden||!isLocalArea('projects')||area.dataset.areaState!=='rail'){collapse(false);return;}
    const vertical=edge==='left'||edge==='right',thickness=Math.min(vertical?width:height,vertical?340:300);
    area.dataset.areaState='expanded';area.dataset.memoryRailExpanded='true';
    applyDockRect('projects',{x:edge==='right'?width-thickness:parseFloat(area.style.left)||0,y:edge==='bottom'?height-thickness:parseFloat(area.style.top)||0,width:vertical?thickness:parseFloat(area.style.width),height:vertical?parseFloat(area.style.height):thickness,joinEdge:area.dataset.areaJoinEdge});
    area.style.zIndex='230';
  }
  function reveal(){render();if(!allowed())return;if(globalThis.SpatialProjectRail?.canReveal?.()){globalThis.SpatialProjectRail.revealStash();return;}showArea('projects',false);if(area.dataset.areaState==='rail'&&!temporaryRail){temporaryRail={edge:dockState.projects.edge,scope:scope()};layoutDockAreas(false,false);}[rail,railEntry].forEach(button=>button.setAttribute('aria-expanded','true'));requestAnimationFrame(()=>host.scrollIntoView({block:'start',behavior:'smooth'}));}
  function editor(item=null){
    reveal();
    resetShelfFilters();
    if(item){const row=host.querySelector('[data-memory-id="'+CSS.escape(item.id)+'"]');if(row){row.open=true;row.querySelector('.memory-edit-details').open=true;row.querySelector('[data-memory-inline="text"]')?.focus();row.scrollIntoView({block:'nearest'});}return;}
    editing=null;draftScope=current;field('.memory-editor').hidden=false;field('[data-memory-text]').value=drafts.get(current)?.text||'';field('[data-memory-text]').focus();
  }
  function recordSaved(item){item=itemFor(item.id)||item;const record=globalThis.SpatialItemHistoryDesktop?.capture(item);const [workspace,project]=JSON.parse(item.scope);globalThis.SpatialTimelineDesktop?.record('stash.save',{workspace,project,title:item.title,itemId:record?.id||item.itemId||item.fileId||item.id,itemVersion:record?.currentVersion||'',stashId:item.fileId||item.id,page:desktopPages.current(workspace),detail:'Saved to folder'});}
  function contextFor(item){
    item=globalThis.SpatialItemHistoryDesktop?.hydrate(item)||item;
    const [workspace,project]=JSON.parse(item.scope),saved=savedItem(item),attachment=F.safeAttachment(item.attachment);
    return {id:item.fileId||item.id,itemId:item.itemId||item.fileId||item.id,reference:!!item.reference,title:item.title,kind:attachment?.kind||'note',text:item.text,address:saved?saved.path:item.source.address,workspace,project,app:item.source.app,source:item.source,savedAt:item.created||item.updated,storageScope:item.scope,filename:saved?.file.name||'',attachment:attachment?{...attachment,filename:attachment.filename||saved?.file.name||item.title}:null};
  }
  function originTags(item){
    const src=item.source||{},tag=text=>'<span class="memory-tag">'+escapeHtml(text)+'</span>';
    const app=src.app&&(src.app==='ai-demo'?'Assistant demo':appInfo[src.app]?.label||appInfo[src.app.split('--')[0]]?.label||src.app);
    return '<div class="memory-tags" aria-label="Origin">'+(app?tag('Via '+app):tag('Source app unknown'))+(src.project?tag('Origin project: '+(projectSpaces[src.project]?.name||src.project)):'')+(src.workspace?tag('Origin workspace: '+(workspaceProfiles[src.workspace]?.label||src.workspace)):'')+'</div>';
  }

  function openSource(item){const src=item.source;if(src.address){if(/^https?:\/\//i.test(src.address)){const id=createAppInstance('browser');navigateBrowser(id,src.address);}else{const id=createAppInstance('dolphin');const file=/\.[a-z0-9]{1,10}$/i.test(src.address);renderFileLocation(id,file?src.address.slice(0,src.address.lastIndexOf('/'))||'/':src.address);if(file)openAppFile(id,src.address.split('/').at(-1));}return;}if(src.app&&appInfo[src.app]){const owner=desktopPages.columnOf(activeWorkspace,src.app);if(owner!==(JSON.parse(item.scope)[1]||'workspace')){feedback('The source window has moved to another project. Its saved excerpt is still here.');return;}changeDesktopPage(desktopPages.pageOf(activeWorkspace,src.app),false,owner);openApp(src.app);}else feedback('The original app is unavailable. The saved excerpt remains in Files.');}
  host.addEventListener('submit',event=>{
    event.preventDefault();if(draftScope!==scope())return;
    const text=field('[data-memory-text]').value.trim(),address=/^(https?:\/\/|\/)[^\s]+$/i.test(text)?text:'';
    const [workspace,project]=JSON.parse(current),item=addItem(current,{text:address?'':text,source:{label:'Your note',workspace,project,address}});
    if(!item){feedback('Write a note or paste a link. This folder supports up to 80 items.');return;}
    if(save()){recordSaved(item);drafts.delete(current);field('.memory-editor').hidden=true;editing=null;resetShelfFilters();render(true);feedback('Saved to '+label()+'.');}
  });
  host.addEventListener('change',event=>{
    if(event.target.matches('[data-memory-filter]')){filterShelf();return;}
    if(event.target.matches('[data-memory-files]')){saveFiles([...event.target.files]);event.target.value='';return;}
    const input=event.target.closest('[data-memory-inline]'),row=input?.closest('[data-memory-id]');if(!row)return;
    const item=itemFor(row.dataset.memoryId);if(!item||item.scope!==row.dataset.memoryOwner)return;
    flushInline(input);requestAnimationFrame(()=>render());
  });
  let inlineTimer=null,pendingInline=null;
  function queueInline(input){clearTimeout(inlineTimer);pendingInline=input;inlineTimer=setTimeout(()=>{const target=pendingInline;pendingInline=null;if(target?.isConnected)persistInline(target);},450);}
  function flushInline(input){clearTimeout(inlineTimer);pendingInline=null;persistInline(input);}
  function persistInline(input){
    const row=input.closest('[data-memory-id]'),item=row&&itemFor(row.dataset.memoryId);if(!item||item.scope!==row.dataset.memoryOwner)return;
    expandedItems.add(item.scope+'\n'+item.id);const updated=editItem(item.id,{[input.dataset.memoryInline]:input.value});
    if(save()){globalThis.SpatialItemHistoryDesktop?.capture(updated,{force:true,action:'edit'});const summary=row.querySelector('.memory-item-summary');summary.querySelector('b').textContent=updated.title;summary.setAttribute('aria-label',updated.title+' · '+summary.querySelector('.memory-type-icon').title);feedback('Changes saved.');}
  }
  host.addEventListener('focusout',event=>{if(event.target.matches('[data-memory-inline]')){if(pendingInline===event.target)flushInline(event.target);requestAnimationFrame(()=>render());}});
  window.addEventListener('pagehide',()=>{if(pendingInline)flushInline(pendingInline);});
  host.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(pendingInline)flushInline(pendingInline);const id=button.closest('[data-memory-id]')?.dataset.memoryId,item=id&&itemFor(id),action=button.dataset.memoryAction||button.dataset.memoryItemAction;
    if(action==='clear-filter'){resetShelfFilters();field('[data-memory-query]').focus();return;}
    if(action==='folder'&&ownerFor(current))openFileLocation(F.folder(ownerFor(current)));if(action==='files')field('[data-memory-files]').click();if(action==='add')editor();if(action==='cancel'){drafts.delete(current);field('.memory-editor').hidden=true;}
    if(action==='saved-file'&&item){syncFolders();const owner=ownerFor(item.scope),file=owner?.stash?.files?.[item.fileId||item.id];if(file){openFileLocation(F.directory(owner,file));const frameId=Object.keys(appInfo).find(name=>(appInfo[name].base||name)==='dolphin'&&frameFor(name)?.dataset.fileLocation===F.directory(owner,file)&&desktopPages.inColumn(activeWorkspace,name));if(frameId)openAppFile(frameId,file.name);}}if(action==='play'){const audio=button.closest('.memory-item').querySelector('audio');if(audio.paused){host.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});audio.play().catch(()=>feedback('This audio could not be played. Open its source to try again.'));}else audio.pause();}if(action==='history'&&item)globalThis.SpatialItemHistoryDesktop?.open(item.itemId||item.fileId||item.id);if(action==='transfer'&&item)globalThis.SpatialItemHistoryDesktop?.transfer(item);if(action==='edit')editor(item);if(action==='source')openSource(item);if(action==='pin'){editItem(id,{pinned:!item.pinned});save();render(true);}if(action==='remove'){globalThis.SpatialItemHistoryDesktop?.record(item.itemId||item.fileId||item.id,'removed-from-stash',{workspace:JSON.parse(item.scope)[0],project:JSON.parse(item.scope)[1],detail:'Removed this saved file entry; source and saved history remain.'});lastRemoved={id,resource:item.resourceIndex===undefined?null:projectFor(item.scope).resources.splice(item.resourceIndex,1)[0],index:item.resourceIndex,scope:item.scope};if(lastRemoved.resource){selected.clear();persistResources();}else model.remove(id);save();render(true);field('[data-memory-action="undo"]').hidden=false;feedback('Removed '+item.title+'.');}if(action==='undo'&&lastRemoved){if(lastRemoved.resource){projectFor(lastRemoved.scope).resources.splice(lastRemoved.index,0,lastRemoved.resource);persistResources();}else model.restore(lastRemoved.id);save();render(true);lastRemoved=null;button.hidden=true;feedback('Item restored.');}


  });
  host.addEventListener('toggle',event=>{
    const row=event.target;if(!row.matches('.memory-item')||!row.isConnected)return;
    const key=row.dataset.memoryOwner+'\n'+row.dataset.memoryId;
    if(row.open)expandedItems.add(key);else{expandedItems.delete(key);row.querySelectorAll('audio').forEach(audio=>audio.pause());}
    try{desktopStorage.setItem('spatial-stash-expanded-v1',JSON.stringify([...expandedItems].slice(-500)));}catch{}
  },true);
  const audioTime=value=>{const seconds=Math.floor(Number.isFinite(value)?value:0);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');};
  function updateAudio(event){const audio=event.target;if(audio.tagName!=='AUDIO')return;const row=audio.closest('.memory-audio'),button=row.querySelector('button'),item=itemFor(row.closest('[data-memory-id]').dataset.memoryId);button.innerHTML=icon(audio.paused?'i-play':'i-pause');button.setAttribute('aria-label',(audio.paused?'Play ':'Pause ')+(item?.title||'audio'));const seek=row.querySelector('input');seek.max=Number.isFinite(audio.duration)?audio.duration:8;seek.value=audio.currentTime;row.querySelector('[data-memory-time]').textContent=audioTime(audio.currentTime)+' / '+audioTime(audio.duration);}
  ['loadedmetadata','timeupdate','play','pause','ended'].forEach(type=>host.addEventListener(type,updateAudio,true));
  host.addEventListener('error',event=>{if(event.target.tagName==='AUDIO')feedback('Audio unavailable. Try opening its source.');if(event.target.tagName==='IMG')event.target.alt='Image unavailable — open its source.';},true);
  host.addEventListener('input',event=>{if(event.target.matches('[data-memory-query]')){filterShelf();return;}if(event.target.matches('[data-memory-inline]')){queueInline(event.target);return;}if(!event.target.matches('.memory-seek'))return;const audio=event.target.closest('.memory-audio').querySelector('audio');if(Number.isFinite(audio.duration))audio.currentTime=Number(event.target.value);});
  host.addEventListener('dragstart',event=>{if(event.target.closest('input,textarea,button,a,audio,iframe')||event.target.closest('summary:not(.memory-item-summary)'))return;const item=itemFor(event.target.closest('[data-memory-id]')?.dataset.memoryId);if(!item)return;event.dataTransfer.setData(SpatialAIContext.MIME,JSON.stringify(contextFor(item)));event.dataTransfer.setData('text/plain',item.text||item.source.address);if(/^https?:\/\//.test(item.source.address))event.dataTransfer.setData('text/uri-list',item.source.address);event.dataTransfer.effectAllowed='copy';});
  const acceptsDrop=event=>{const types=[...event.dataTransfer.types],attachment=types.some(type=>type===SpatialAIContext.MIME||type==='Files');return allowed()&&types.some(type=>[SpatialAIContext.MIME,'Files','text/plain','text/uri-list'].includes(type))&&(attachment||!event.target?.closest?.('input,textarea,select,[contenteditable="true"]'));};
  const containsDropTarget=target=>Boolean(target&&(host.contains(target)||rail.contains(target)||railEntry.contains(target)));
  host.addEventListener('dragover',event=>{if(!acceptsDrop(event)){showDropTarget();return;}event.preventDefault();event.dataTransfer.dropEffect='copy';showDropTarget(event);});
  [host,rail,railEntry].forEach(node=>node.addEventListener('dragleave',event=>{if(!containsDropTarget(event.relatedTarget))showDropTarget();}));
  document.addEventListener('dragover',event=>{if(!containsDropTarget(event.target))showDropTarget();});
  ['drop','dragend','pointercancel'].forEach(type=>document.addEventListener(type,()=>showDropTarget(),true));
  window.addEventListener('blur',()=>showDropTarget());
  document.addEventListener('keydown',event=>{if(event.key==='Escape')showDropTarget();},true);
  async function keepContext(value,key=scope()){
    if(!value||typeof value!=='object'||!allowed())return false;
    if(value.transfer!=='copy'&&value.storageScope===key&&itemsFor(key).some(item=>(item.fileId||item.id)===value.id)){feedback('This item is already in this folder.');return false;}
    const relativeDirectory=globalThis.SpatialFolderDesktop?.relativeDirectory(key)||'';
    const [workspace,project]=JSON.parse(key),source=M.source(value.source&&typeof value.source==='object'?value.source:{workspace:value.workspace||'',project:value.project||null,app:value.app,label:value.app?appInfo[value.app]?.label||value.app:'Dropped content',address:value.address});
    let attachment=F.safeAttachment(value.attachment);if(attachment)attachment={...attachment,filename:attachment.filename||String(value.filename||value.title||'Saved file').slice(0,160)};
    if(attachment?.key){try{if(!await F.get(attachment.key)){feedback('The saved file is unavailable. Open its source to recover it.');return false;}}catch{feedback('The saved file could not be read.');return false;}}
    if(attachment?.src){try{const blob=await F.copyAsset(ownerFor(key),{id:value.id,attachment}),blobKey='stash-upload-'+crypto.randomUUID();await F.put(blobKey,blob);attachment={...attachment,key:blobKey,src:undefined,filename:value.filename||value.title,mime:blob.type,size:blob.size};}catch{feedback('The file could not be copied.');return false;}}
    if(itemsFor(key).length>=80){feedback('This folder supports up to 80 items.');return false;}
    const text=String(value.text||'').slice(0,12000),why=String(value.why||'').slice(0,1000),title=String(value.title||'').slice(0,120),address=source.address||M.source({address:value.address}).address;
    const shared=value.transfer==='reference'||value.transfer==='move',itemId=shared?(value.itemId||value.id):undefined;const data={title,text,why,source,attachment,itemId,reference:shared,relativeDirectory};let item;
    if(attachment&&project){const id='stash-'+crypto.randomUUID();projectFor(key).resources.unshift([title||attachment.filename||'Saved file',text,attachment.kind,attachment.kind==='image'?'i-image':attachment.kind==='audio'?'i-music':'i-note',{fileId:id,itemId,relativeDirectory,reference:shared,attachment,text,why,source,created:Date.now(),updated:Date.now()}]);persistResources();item=resourceItems(key)[0];}
    else item=addItem(key,{...data,source:{...source,address:attachment?source.address:address}});
    if(!item){feedback('This item has no content to keep.');return false;}
    if(!save())return false;globalThis.SpatialItemHistoryDesktop?.capture(item,{force:true,action:shared?'reference':'capture',related:value.derivedFrom||value.relations||(value.itemId||value.storageScope?[{itemId:value.itemId||value.id,versionId:value.versionId,relation:'copiedFrom'}]:[]),relation:value.derivedFrom?'derivedFrom':'copiedFrom'});recordSaved(item);if(value.derivedFrom?.length)globalThis.SpatialTimelineDesktop?.record('assistant.output',{workspace,project,title:item.title,itemId:item.itemId||item.fileId||item.id,sourceIds:value.derivedFrom.map(parent=>parent.itemId),chatId:value.chatId,turnId:value.turnId,detail:'Saved Assistant draft with its input versions'});if(current===key)resetShelfFilters();render(true);if(current===key)feedback('Saved with its source.');return true;
  }
  function dropIntoStash(event){
    showDropTarget();if(!acceptsDrop(event))return;
    if(event.dataTransfer.files.length){event.preventDefault();event.stopPropagation();saveFiles([...event.dataTransfer.files]);return;}
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
    button.addEventListener('dragover',event=>{if(!acceptsDrop(event))return;event.preventDefault();event.dataTransfer.dropEffect='copy';reveal();showDropTarget(event);});
    button.addEventListener('drop',event=>{reveal();dropIntoStash(event);});
  });
  document.addEventListener('pointerdown',event=>{if(temporaryRail&&!area.contains(event.target))collapse();},true);
  document.addEventListener('focusin',event=>{if(temporaryRail&&!area.contains(event.target))collapse();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&temporaryRail)collapse();});

  document.addEventListener('click',event=>{const result=event.target.closest('[data-memory-result]');if(!result)return;const item=itemFor(result.dataset.memoryResult);if(!item)return;const [,project]=JSON.parse(item.scope);setUniversalSearchOpen(false);globalThis.SpatialFolderDesktop?.prepareItem(item);if(project&&projectSpaces[project])activateProject(project,false);else changeDesktopPage(desktopPages.current(activeWorkspace),false,'workspace');render(true);reveal();resetShelfFilters();const row=$('[data-memory-id="'+CSS.escape(item.id)+'"]',host);if(row)row.open=true;row?.scrollIntoView({block:'center'});row?.setAttribute('tabindex','-1');row?.focus();});
  function search(query){const searchable=M.create(model.snapshot());Object.entries(projectSpaces).forEach(([id,project])=>{if(project.originWorkspace===activeWorkspace||openProjectNames().includes(id)){const key=M.scope(activeWorkspace,id);itemsFor(key).map(item=>({...item,scope:key})).forEach(item=>searchable.merge({version:1,records:{[item.id]:item}}));}});const results=allowed()?searchable.search(query,activeWorkspace).filter(item=>!JSON.parse(item.scope)[1]||projectSpaces[JSON.parse(item.scope)[1]]):[];$('#universalMemoryResults').innerHTML=results.map(item=>'<button class="universal-result" data-memory-result="'+escapeHtml(item.id)+'"><span class="universal-symbol">'+icon('i-note')+'</span><span><b>'+escapeHtml(item.title)+'</b><small>'+escapeHtml(label(item.scope)+' · '+(item.source.label||'Your note')+(item.updated?' · '+sessionAge(item.updated):''))+'</small><small>'+escapeHtml((item.text||item.source.address).slice(0,120))+'</small></span></button>').join('');prepareControlSemantics(searchGroup);return results.length;}
  function seed(){
    if(desktopPreset!=='demo'||globalThis.SpatialGuide?.model.active())return;
    Object.entries(projectSpaces).forEach(([id,project])=>{
      const definition=SpatialDemoExamples.projects[id];if(!definition||project.name!==definition.name||project.root!==definition.root)return;
      const workspace=project.originWorkspace||Object.keys(SpatialDemoExamples.scenarios||{}).find(name=>SpatialDemoExamples.scenarios[name].windows.some(column=>column.column===id));
      if(!workspaceProfiles[workspace])return;
      const key=M.scope(workspace,id),review=SpatialDemoExamples.reviewNotes?.[id];
      for(const item of model.items(key)){if(item.title!=='Project note')continue;const text=SpatialDemoExamples.migrateNote(item.text);if(text!==item.text)editItem(item.id,{text});}
      const previous=model.items(key).find(item=>item.title==='Questions for the next review'&&item.text==='What is ready to share?\nWhat still needs testing?\nNext: review the project starting point before opening another task.');
      if(previous&&review)editItem(previous.id,review);
      if(model.seeded(key))return;model.markSeeded(key);if(review)model.add(key,{...review,source:{}});
    });save();
  }
  function ownerAtFolder(path){
    const pair=Object.entries(projectSpaces).filter(([,project])=>path===F.folder(project)||path.startsWith(F.folder(project)+'/')).sort((a,b)=>b[1].root.length-a[1].root.length)[0];
    if(pair)return {owner:pair[1],key:M.scope(pair[1].originWorkspace||activeWorkspace,pair[0])};
    const workspace=Object.keys(workspaceProfiles).filter(id=>path===workspaceProfiles[id].home||path.startsWith(workspaceProfiles[id].home+'/')).sort((a,b)=>workspaceProfiles[b].home.length-workspaceProfiles[a].home.length)[0];
    return workspace?{owner:ownerFor(M.scope(workspace)),key:M.scope(workspace)}:null;
  }
  function fileRows(path){
    const pair=ownerAtFolder(path);if(!pair)return null;
    const root=F.folder(pair.owner),legacy=path===root+'/Stash',at=legacy?root:path;
    const [,projectId]=JSON.parse(pair.key),profile=workspaceProfiles[JSON.parse(pair.key)[0]];
    let rows=at===root?(projectId?[[".spatial-project.toml","Project settings","config"],...pair.owner.files]:profile.folders).filter(row=>!(row[0]==='Stash'&&row[1]==='Saved notes, files and media')):[];
    const saved=F.rows(pair.owner,at);
    if(!legacy&&at!==root&&!saved.length&&!F.list(pair.owner).some(file=>F.directory(pair.owner,file).startsWith(at+'/')))return null;
    if(legacy)return saved;
    for(const row of saved)if(!rows.some(existing=>existing[0]===row[0]))rows.push(row);
    for(const file of F.list(pair.owner)){const dir=F.directory(pair.owner,file);if(dir.startsWith(at+'/')){const name=dir.slice(at.length+1).split('/')[0];if(!rows.some(row=>row[0]===name))rows.push([name,'Folder','folder']);}}
    return rows;
  }
  function openSavedFile(id,path,name){
    const pair=ownerAtFolder(path),file=pair&&F.list(pair.owner).find(file=>file.name===name&&(F.directory(pair.owner,file)===path||path===F.folder(pair.owner)+'/Stash'&&F.directory(pair.owner,file)===F.folder(pair.owner)));if(!file)return false;
    const preview=$('.file-preview',frameFor(id));preview.innerHTML='<header><div><b>'+escapeHtml(file.name)+'</b><small>'+escapeHtml(path)+'</small></div>'+appActionButton('file-preview-close','i-close','Close file preview')+'</header><div class="stash-file-content"><p>Loading saved file…</p></div>';preview.hidden=false;
    const section=$('.stash-file-content',preview),savedScope=pair.key;
    const renderFile=(blob)=>{
      if(!preview.isConnected||$('.stash-file-content',preview)!==section)return;
      const url=URL.createObjectURL(blob);let body=file.content!==null?'<pre>'+escapeHtml(file.content)+'</pre>':file.kind==='image'?'<img class="stash-file-image" src="'+escapeHtml(url)+'" alt="'+escapeHtml(file.title)+'">':file.kind==='audio'?'<audio controls preload="metadata" src="'+escapeHtml(url)+'" aria-label="'+escapeHtml(file.title)+'"></audio>':file.kind==='document'?'<iframe src="'+escapeHtml(url)+'" title="'+escapeHtml(file.title)+'" sandbox></iframe>':file.attachment?.mime?.startsWith('text/')?'<pre>'+escapeHtml(file.caption)+'</pre>':'<p>'+escapeHtml(file.title)+' · '+escapeHtml(file.attachment?.mime||'Saved file')+'</p>';
      section.innerHTML=body+'<div class="stash-file-actions"><a class="surface-key" href="'+escapeHtml(url)+'" download="'+escapeHtml(file.name)+'">Download file</a><button class="surface-key" data-stash-edit="'+escapeHtml(file.id)+'" data-stash-scope="'+escapeHtml(savedScope)+'">Edit '+(file.attachment?'details':'in Files')+'</button></div>';
      prepareControlSemantics(preview);
    };
    if(file.content!==null)renderFile(new Blob([file.content],{type:file.kind==='note'?'text/markdown;charset=utf-8':'text/plain;charset=utf-8'}));
    else F.copyAsset(pair.owner,file).then(renderFile).catch(()=>{section.textContent='This saved file is unavailable in this browser.';});return true;
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-stash-edit]');if(!button)return;const [workspace,id]=JSON.parse(button.dataset.stashScope);if(activeWorkspace!==workspace)renderWorkspace(workspace,false);if(id)activateProject(id,false);else changeDesktopPage(desktopPages.current(activeWorkspace),false,'workspace');render(true);const item=itemsFor(current).find(item=>(item.fileId||item.id)===button.dataset.stashEdit);if(item)editor(item);});
  globalThis.SpatialMemoryDesktop={allItems(){const keys=[...Object.keys(workspaceProfiles).map(workspace=>M.scope(workspace)),...Object.entries(projectSpaces).map(([id,project])=>M.scope(project.originWorkspace||activeWorkspace,id))];return keys.flatMap(itemsFor);},removeEntry(id,key){const item=itemsFor(key).find(item=>(item.fileId||item.id)===id);if(!item)return false;if(item.resourceIndex===undefined)model.remove(item.id);else{projectFor(key).resources.splice(item.resourceIndex,1);persistResources();}save();render(true);return true;},itemFor,savedItem,contextFor,ownerFor,editItem,save,saveFiles,addItem,recordSaved,contextAtFile(path){const folder=path.slice(0,path.lastIndexOf('/')),pair=ownerAtFolder(folder),file=pair&&F.list(pair.owner).find(file=>F.path(pair.owner,file)===path||folder===F.folder(pair.owner)+'/Stash'&&file.name===path.split('/').at(-1)),item=file&&itemsFor(pair.key).find(item=>(item.fileId||item.id)===file.id);return item?contextFor(item):null;},keepContext,reveal,collapse,showDropTarget,revealItem(id,key){const item=itemsFor(key).find(item=>(item.fileId||item.id)===id);if(!item){reveal();feedback('This item is no longer in Files.');return false;}globalThis.SpatialFolderDesktop?.prepareItem(item);reveal();resetShelfFilters();render(true);const row=host.querySelector('[data-memory-id="'+CSS.escape(item.id)+'"]');if(row){row.open=true;row.scrollIntoView({block:'center'});row.querySelector('summary').focus();}return true;},items:()=>itemsFor(scope()),fileRows,openFile:openSavedFile,render,search,applyRailExpansion,snapshot:()=>model.snapshot(),merge(value){if(model.merge(value)){try{desktopStorage.setItem(storageKey,JSON.stringify(model.snapshot()));persisted=model.snapshot();}catch{}render(true);}}};
  Object.values(model.snapshot().records).filter(item=>item.kind==='next'&&!item.deleted).forEach(item=>model.promoteNext(item.scope,projectFor(item.scope)?.note));
  seed();save();render(true);refreshStashBrowsers();prepareControlSemantics(rail.parentElement);
})();
