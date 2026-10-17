/* One folder projection for ordinary files and retained working materials. */
(function(root){
  'use strict';
  const inside=(path,base)=>path===base||path.startsWith(base.replace(/\/$/,'')+'/');
  const parent=path=>path.slice(0,path.lastIndexOf('/'))||'/';
  function mergeRows(rows,extra){const result=rows.map(row=>[...row]);for(const row of extra)if(!result.some(existing=>existing[0]===row[0]))result.push([...row]);return result;}
  function projectRows({path,base,rows=[],files=[],directories=[],downloads=[],archive={}}){
    let result=mergeRows(rows,downloads.filter(file=>file.directory===path).map(file=>[file.name,'Saved file',file.attachment?.kind||'document']));
    const prefix=path.replace(/\/$/,'')+'/';
    for(const target of [...directories,...files.map(file=>file.directory),...Object.keys(archive).map(name=>base+'/'+name)]){
      if(!target.startsWith(prefix))continue;const suffix=target.slice(prefix.length),name=suffix.split('/')[0];if(!name)continue;
      const folder=suffix.includes('/')||directories.includes(target)||files.some(file=>file.directory===target);
      result=mergeRows(result,[[name,folder?'Folder':'Imported file',folder?'folder':archive[target.slice(base.length+1)]?.kind||'document']]);
    }
    return result.sort((a,b)=>Number(b[2]==='folder')-Number(a[2]==='folder')||a[0].localeCompare(b[0]));
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={inside,parent,mergeRows,projectRows};return;}
  const memory=root.SpatialMemoryDesktop,F=SpatialStashFiles,host=document.getElementById('workingMemory');if(!memory||!host)return;
  const html=escapeHtml,paths=new Map(),storage='spatial-folder-views-v1',previewUrls=new Map();
  let state=readDesktopStorage(storage,{pins:{}}),serial=0,queued=0;
  state.pins||={};
  const key=()=>SpatialWorkingMemory.scope(activeWorkspace,projectSpaces[desktopPages.column(activeWorkspace)]?desktopPages.column(activeWorkspace):null);
  const owner=(scope=key())=>memory.ownerFor(scope);
  function path(scope=key()){const base=F.folder(owner(scope)),selected=paths.get(scope);return selected&&inside(selected,base)?selected:base;}
  const relativeDirectory=scope=>path(scope).slice(F.folder(owner(scope)).length).replace(/^\//,'');
  const revision=()=>serial;
  function persist(){desktopStorage.setItem(storage,JSON.stringify(state));queueDesktopStateBroadcast(0);serial++;}
  function schedule(){if(!queued)queued=requestAnimationFrame(()=>{queued=0;memory.render(true);root.SpatialProjectRail?.render();});}
  function rows(scope=key()){
    const current=path(scope),base=F.folder(owner(scope)),project=projectSpaces[JSON.parse(scope)[1]],snapshot=workspaceDownloads.snapshot();
    const seed=fileLocationRows({dataset:{}},current);
    const directories=[...snapshot.directories,...(project?.files||[]).filter(row=>row[2]==='folder').map(row=>base+'/'+row[0])];
    if(!project){const profile=workspaceProfiles[JSON.parse(scope)[0]];directories.push(...profile.folders.filter(row=>row[2]==='folder').map(row=>row[3]||base+'/'+row[0]));if(current===base+'/Projects')seed.push(...Object.values(projectSpaces).filter(project=>project.originWorkspace===activeWorkspace).map(project=>[project.name,'Project','folder',project.root]));}
    return projectRows({path:current,base,rows:seed,files:F.list(owner(scope)).map(file=>({...file,directory:F.directory(owner(scope),file)})),directories,downloads:snapshot.files,archive:project?.archiveFiles});
  }
  function go(target){
    const scope=key(),base=F.folder(owner(scope));if(!inside(target,base)){openFileLocation(target);return;}
    const project=Object.entries(projectSpaces).find(([,project])=>project.root===target&&project.originWorkspace===activeWorkspace);
    if(project&&project[0]!==JSON.parse(scope)[1]){activateProject(project[0],false);paths.set(key(),target);}else paths.set(scope,target);
    host.querySelector('[data-memory-query]').value='';host.querySelector('[data-memory-filter]').value='all';host.querySelectorAll('[data-history-app],[data-history-type],[data-history-date]').forEach(field=>field.value='');serial++;memory.render(true);
  }
  const full=(name,scope=key())=>path(scope)+'/'+name;
  const pinned=address=>state.pins[address]?.pinned===true;
  function fileContext(address){const saved=root.SpatialAssistantDesktop?.fileContext(address);if(saved)return saved;const project=Object.values(projectSpaces).find(project=>inside(address,project.root)),binary=project?.archiveFiles?.[address.slice(project.root.length+1)];if(binary)return {id:'file:'+address,itemId:binary.itemId||'file:'+address,title:address.split('/').at(-1),filename:address.split('/').at(-1),kind:binary.kind||'file',address,workspace:activeWorkspace,project:JSON.parse(key())[1],attachment:{key:binary.key,kind:binary.kind||'file',filename:address.split('/').at(-1),mime:binary.mime||''},source:{label:'Imported file',address,workspace:activeWorkspace,project:JSON.parse(key())[1]}};return {id:'unavailable:'+address,title:address.split('/').at(-1),filename:address.split('/').at(-1),kind:'file',address,workspace:activeWorkspace,project:JSON.parse(key())[1],source:{label:'Files',address,workspace:activeWorkspace,project:JSON.parse(key())[1]}};}
  function fileMarkup(row,scope){
    const [name,detail,type,target]=row,address=target||full(name,scope),isFolder=type==='folder',isPinned=pinned(address),glyph=isFolder?'i-folder':type==='image'?'i-image':type==='audio'?'i-music':'i-note';
    if(isFolder)return '<div class="folder-entry folder-directory" data-folder-entry="'+html(address)+'" data-folder-search="'+html(name+' '+detail)+'" data-folder-kind="'+html(type==='document'&&/\.(txt|md|csv|json)$/i.test(name)?'text':type)+'" data-folder-created="'+(workspaceDownloads.list(parent(address)).find(file=>file.name===name)?.savedAt||0)+'" data-folder-pinned="'+isPinned+'"><button type="button" data-folder-go="'+html(address)+'" draggable="true" data-folder-drag="'+html(address)+'">'+icon(glyph)+'<span><b>'+html(name)+'</b><small>'+html(detail)+'</small></span>'+icon('i-right')+'</button></div>';
    return '<details class="folder-entry folder-file memory-item" data-folder-entry="'+html(address)+'" data-folder-search="'+html(name+' '+detail)+'" data-folder-kind="'+html(type==='document'&&/\.(txt|md|csv|json)$/i.test(name)?'text':type)+'" data-folder-created="'+(workspaceDownloads.list(parent(address)).find(file=>file.name===name)?.savedAt||0)+'" data-folder-pinned="'+isPinned+'" draggable="true" data-folder-drag="'+html(address)+'"><summary class="memory-item-summary" aria-label="'+html(name+' · File')+'"><span class="memory-type-icon">'+icon(glyph)+'</span><span class="memory-select"><b>'+html(name)+'</b><small>'+html(detail)+'</small></span>'+(isPinned?'<small class="memory-pinned">Pinned</small>':'')+'</summary><div class="memory-item-body"><div class="folder-preview" data-folder-preview="'+html(address)+'"></div><div class="folder-file-actions"><button class="memory-text-action" type="button" data-folder-open="'+html(address)+'">Open file</button><button class="memory-text-action" type="button" data-folder-pin="'+html(address)+'" aria-pressed="'+isPinned+'">'+(isPinned?'Unpin':'Pin')+'</button><button class="memory-text-action" type="button" data-folder-assistant="'+html(address)+'">Ask Assistant</button></div></div></details>';
  }
  function markup({key:scope,owner:current,items,itemMarkup}){
    const at=path(scope),saved=F.list(current).filter(file=>F.directory(current,file)===at),byId=new Map(saved.map(file=>[file.id,file]));
    const retained=items.filter(item=>byId.has(item.fileId||item.id)),savedNames=new Set(saved.map(file=>file.name));
    const ordinary=rows(scope).filter(row=>!savedNames.has(row[0]));
    const groups=[['Pinned',retained.filter(item=>item.pinned).map(itemMarkup).concat(ordinary.filter(row=>pinned(row[3]||full(row[0],scope))).map(row=>fileMarkup(row,scope)))],['Folders',ordinary.filter(row=>row[2]==='folder'&&!pinned(row[3]||full(row[0],scope))).map(row=>fileMarkup(row,scope))],['Files',retained.filter(item=>!item.pinned).map(itemMarkup).concat(ordinary.filter(row=>row[2]!=='folder'&&!pinned(row[3]||full(row[0],scope))).map(row=>fileMarkup(row,scope)))]];
    return groups.filter(([,content])=>content.length).map(([title,content])=>'<section class="folder-group" data-folder-group><h3>'+title+'</h3>'+content.join('')+'</section>').join('');
  }
  function decorate(target,{key:scope,owner:current,items}){
    for(const [element,url] of previewUrls)if(!element.isConnected){URL.revokeObjectURL(url);previewUrls.delete(element);}
    target.classList.add('interactive-folder');target.setAttribute('aria-label','Interactive folder');
    const at=path(scope),base=F.folder(current),[,project]=JSON.parse(scope),label=project?projectSpaces[project].name:workspaceProfiles[activeWorkspace].label+' Home';
    target.querySelector('.memory-folder-action b').textContent=at===base?label:at.split('/').at(-1);
    const folderButton=target.querySelector('[data-memory-action="folder"]');folderButton.setAttribute('aria-label','Open current folder in File Browser');folderButton.title=at;
    target.querySelector('[data-memory-scope]').textContent=at;
    target.querySelector('[data-memory-query]').setAttribute('aria-label','Search this folder');target.querySelector('[data-memory-query]').placeholder='Find in this folder…';
    target.querySelector('[data-memory-filter]').setAttribute('aria-label','Show folder items');target.querySelector('[data-memory-filter] option[value="all"]').textContent='All items';
    let nav=target.querySelector('.folder-navigation');if(!nav){nav=document.createElement('nav');nav.className='folder-navigation';nav.setAttribute('aria-label','Folder navigation');target.querySelector('.memory-scope').after(nav);}
    const parts=at.slice(base.length).split('/').filter(Boolean),crumbs=[['Home',base]];let cursor=base;
    for(const part of parts){cursor+='/'+part;crumbs.push([part,cursor]);}
    nav.innerHTML='<button class="surface-key" type="button" data-folder-up'+(at===base?' disabled':'')+' aria-label="Parent folder">'+icon('i-up')+'</button><div>'+crumbs.map(([name,address],index)=>'<button type="button" data-folder-go="'+html(address)+'"'+(index===crumbs.length-1?' aria-current="page"':'')+'>'+html(index===0?(project?'Project folder':'Workspace Home'):name)+'</button>').join('<span aria-hidden="true">›</span>')+'</div>';
    let create=target.querySelector('[data-folder-new]');if(!create){create=document.createElement('button');create.type='button';create.className='memory-text-action';create.dataset.folderNew='';create.textContent='New folder';target.querySelector('.memory-toolbar').append(create);}
    target.querySelector('.memory-help').textContent='Drop text, links or files into this folder';
    target.querySelector('[data-memory-action="files"]').textContent='Add files';target.querySelector('[data-memory-action="add"]').setAttribute('aria-label','New note or link');
    for(const row of target.querySelectorAll('[data-memory-id]')){const item=items.find(item=>item.id===row.dataset.memoryId),file=item&&current.stash?.files?.[item.fileId||item.id];if(!file)continue;row.dataset.folderEntry=F.path(current,file);row.title=file.name;
      const name=row.querySelector('.memory-item-summary b');if(name)name.textContent=file.name;
      if(!row.querySelector('[data-folder-assistant]')){const button=document.createElement('button');button.type='button';button.className='memory-text-action';button.dataset.folderAssistant=F.path(current,file);button.textContent='Ask Assistant';row.querySelector('.memory-row-actions').prepend(button);}
    }
    for(const button of document.querySelectorAll('.memory-header-key,.memory-rail-entry')){if(button.closest('.project-material-rail'))continue;button.title='Files';button.setAttribute('aria-label','Open files');const span=button.querySelector('span');if(span)span.textContent='Files';}
  }
  function filter(target,items,current,scope,options={}){
    const query=target.querySelector('[data-memory-query]').value.trim(),onlyPinned=target.querySelector('[data-memory-filter]').value==='pinned',values=options.values||{},byId=new Map(items.map(item=>[item.id,item]));let count=0,total=0;
    for(const row of target.querySelectorAll('[data-folder-entry]')){
      total++;const item=byId.get(row.dataset.memoryId),record=item&&root.SpatialItemHistoryDesktop?.get?.(item.itemId||item.fileId||item.id),text=item?[item.title,item.text,item.source?.label,item.source?.address,item.source?.app,...(options.tags?.(item.itemId||item.fileId||item.id)||[])].join(' '):row.dataset.folderSearch||row.dataset.folderEntry;
      const isPinned=item?item.pinned:row.dataset.folderPinned==='true',captured=record?.created||item?.created||Number(row.dataset.folderCreated)||0,today=new Date();today.setHours(0,0,0,0);
      const show=(!query||matchesSearch(text+' '+row.dataset.folderEntry,query))&&(!onlyPinned||isPinned)&&(!values.app||(item?.source?.app||'unknown')===values.app)&&(!values.type||(item?options.itemType?.(item):row.dataset.folderKind||'file')===values.type)&&(!values.date||captured>=(values.date==='today'?today.getTime():Date.now()-7*86400000));
      row.hidden=!show;if(show)count++;
    }
    for(const group of target.querySelectorAll('[data-folder-group]'))group.hidden=![...group.querySelectorAll('[data-folder-entry]')].some(row=>!row.hidden);
    target.querySelector('[data-memory-count]').textContent=(count===total?total:count+' of '+total)+' items';target.querySelector('.memory-empty').hidden=count>0;
    target.querySelector('[data-memory-empty-title]').textContent=total?'No matching files':'This folder is empty';target.querySelector('[data-memory-empty-detail]').textContent=total?'Try another search or show all items.':'Create a note, add files or drop something here.';
    target.querySelector('[data-memory-action="clear-filter"]').hidden=!query&&!onlyPinned&&!Object.values(values).some(Boolean);
  }
  async function preview(row){
    const address=row.dataset.folderEntry,target=row.querySelector('[data-folder-preview]');if(!target||target.dataset.loaded)return;target.dataset.loaded='true';
    const scope=key(),context=fileContext(address),download=workspaceDownloads.list(parent(address)).find(file=>file.name===address.split('/').at(-1));
    let text=download?.attachment?undefined:download?.content;
    if(text===undefined&&address.endsWith('/.spatial-project.toml')){const project=projectSpaces[JSON.parse(scope)[1]];if(project)text='name = '+JSON.stringify(project.name)+'\nroot = '+JSON.stringify(project.root);}
    if(text===undefined&&context.attachment){try{const blob=context.attachment.key?await F.get(context.attachment.key):null;if(blob&&(/^(text\/|application\/(json|xml))/.test(blob.type)||/\.(md|txt|csv|json|html|toml|js|css)$/i.test(address)))text=(await blob.text()).slice(0,12000);else if(blob){const url=URL.createObjectURL(blob),element=document.createElement(blob.type.startsWith('image/')?'img':blob.type.startsWith('audio/')?'audio':'iframe');previewUrls.set(target,url);element.src=url;if(element.tagName==='AUDIO')element.controls=true;if(element.tagName==='IFRAME')element.setAttribute('sandbox','');if(target.isConnected&&scope===key())target.append(element);return;}}catch{}}
    if(!target.isConnected||scope!==key())return;
    if(text===undefined||text===null){target.textContent='Example file · no saved contents attached in this demo.';return;}
    const pre=document.createElement('pre');pre.textContent=text;target.append(pre);
    if(download&&!download.attachment){const label=document.createElement('details');label.innerHTML='<summary>Edit text</summary><textarea aria-label="Edit file text" maxlength="12000"></textarea><button class="surface-key" type="button" data-folder-save="'+html(address)+'">Save changes</button>';label.querySelector('textarea').value=text;target.append(label);}
    if(context.itemId){const button=document.createElement('button');button.className='memory-text-action';button.type='button';button.dataset.folderHistory=context.itemId;button.textContent='History';target.append(button);}
  }
  function openFile(address){const id=createAppInstance('dolphin');renderFileLocation(id,parent(address));openAppFile(id,address.split('/').at(-1));}
  function revealFile(address){memory.reveal();go(parent(address));const row=[...host.querySelectorAll('[data-folder-entry]')].find(row=>row.dataset.folderEntry===address);if(row){row.open=true;row.scrollIntoView({block:'center'});row.querySelector('summary,button')?.focus();}}
  function pinnedItems(){const scope=key(),base=F.folder(owner(scope));return Object.entries(state.pins).filter(([address,value])=>value.pinned&&inside(address,base)).map(([address,value])=>({id:'folder-file:'+address,title:address.split('/').at(-1),updated:value.updated,source:{address}}));}
  host.addEventListener('click',event=>{
    const button=event.target.closest('[data-folder-go],[data-folder-up],[data-folder-new],[data-folder-pin],[data-folder-open],[data-folder-assistant],[data-folder-save],[data-folder-history]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();
    if(button.hasAttribute('data-folder-go'))return go(button.dataset.folderGo);
    if(button.hasAttribute('data-folder-up'))return go(parent(path()));
    if(button.hasAttribute('data-folder-new')){const names=new Set(rows().map(row=>row[0]));let name='New folder',n=2;while(names.has(name))name='New folder '+n++;workspaceDownloads.ensure(full(name));persistDownloads();serial++;memory.render(true);return;}
    if(button.dataset.folderPin){const address=button.dataset.folderPin;state.pins[address]={pinned:!pinned(address),updated:Date.now()};persist();memory.render(true);root.SpatialProjectRail?.render();return;}
    if(button.dataset.folderOpen)return openFile(button.dataset.folderOpen);
    if(button.dataset.folderHistory)return root.SpatialItemHistoryDesktop?.open(button.dataset.folderHistory);
    if(button.dataset.folderAssistant){const context=fileContext(button.dataset.folderAssistant);root.SpatialAIDesktop.attach([context]);return;}
    if(button.dataset.folderSave){const address=button.dataset.folderSave,value=button.closest('details').querySelector('textarea').value;workspaceDownloads.update(parent(address),address.split('/').at(-1),{content:value});persistDownloads();const file=fileContext(address);if(file.itemId)root.SpatialItemHistoryDesktop?.capture({id:file.itemId,itemId:file.itemId,scope:key(),kind:'item',title:file.title,text:value,source:file.source},{force:true,action:'edit'});serial++;memory.render(true);}
  },true);
  host.addEventListener('toggle',event=>{if(event.target.matches('.folder-file')&&event.target.open)preview(event.target);},true);
  host.addEventListener('dragstart',event=>{const row=event.target.closest('[data-folder-drag]');if(!row||!event.dataTransfer)return;const address=row.dataset.folderDrag,context=fileContext(address);if(row.matches('[data-folder-go]'))context.kind='folder';event.dataTransfer.effectAllowed='copy';event.dataTransfer.setData(SpatialAIContext.MIME,JSON.stringify(context));event.dataTransfer.setData('text/plain',address);});
  const originalFolderAction=host.querySelector('[data-memory-action="folder"]');originalFolderAction.addEventListener('click',event=>{event.stopImmediatePropagation();openFileLocation(path());},true);
  const originalSave=persistDownloads;persistDownloads=function(...args){const result=originalSave(...args);serial++;schedule();return result;};
  const capture=captureDesktopSyncState;captureDesktopSyncState=function(...args){return {...capture(...args),folderViews:JSON.parse(JSON.stringify(state))};};
  const incoming=persistIncomingDesktopState;persistIncomingDesktopState=function(snapshot,...args){for(const [address,value] of Object.entries(snapshot.folderViews?.pins||{}))if(!state.pins[address]||value.updated>state.pins[address].updated)state.pins[address]=value;desktopStorage.setItem(storage,JSON.stringify(state));const result=incoming(snapshot,...args);serial++;schedule();return result;};
  const sync=syncProjectAreaView;syncProjectAreaView=function(...args){const result=sync(...args);document.getElementById('projectAreaName').textContent='Files';return result;};
  root.SpatialFolderDesktop={prepareItem(item){const current=owner(item.scope),file=current?.stash?.files?.[item.fileId||item.id];if(file)paths.set(item.scope,F.directory(current,file));},path,relativeDirectory,revision,markup,decorate,filter,go,rows,pinnedItems,revealFile,fileContext};
  document.getElementById('projectAreaName').textContent='Files';memory.render(true);root.SpatialProjectRail?.render();
})(typeof globalThis!=='undefined'?globalThis:this);
