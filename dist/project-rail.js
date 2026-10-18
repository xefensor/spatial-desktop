/* The Project rail keeps working material within reach without resizing a dock. */
(function(root){
  'use strict';
  function position(rect,edge,viewport,size){
    const width=Math.min(size.width,Math.max(0,viewport.width-16)),height=Math.min(size.height,Math.max(0,viewport.height-16));
    let x=edge==='right'?rect.left-width-8:edge==='left'?rect.right+8:rect.left;
    let y=edge==='bottom'?rect.top-height-8:edge==='top'?rect.bottom+8:rect.top;
    x=Math.max(8,Math.min(x,viewport.width-width-8));y=Math.max(8,Math.min(y,viewport.height-height-8));
    return {x,y,width,height};
  }
  function files(owner){
    if(!owner)return [];
    return (owner.files||owner.folders||[]).filter(row=>Array.isArray(row)&&typeof row[0]==='string').map(([name,detail,type,target])=>({name,detail:String(detail||''),folder:type==='folder',path:target||owner.root.replace(/\/+$/,'')+'/'+name}));
  }
  const kindIcon=item=>item.attachment?.kind==='image'?'i-image':item.attachment?.kind==='audio'?'i-music':/^https?:/i.test(item.source?.address||'')?'i-web':item.source?.address?'i-folder':'i-note';
  if(typeof module!=='undefined'&&module.exports){module.exports={position,files,kindIcon};return;}
  const area=areaFor('projects'),memory=root.SpatialMemoryDesktop,host=document.getElementById('workingMemory');
  if(!area||!memory||!host)return;
  const make=(tag,classes,text='')=>{const node=document.createElement(tag);node.className=classes;node.textContent=text;return node;};
  const rail=make('nav','project-material-rail');rail.setAttribute('aria-label','Files and notes');
  rail.innerHTML='<small class="project-material-context"></small><button type="button" class="rail-action memory-rail-entry project-material-stash" data-project-shelf="stash">'+icon('i-note')+'<span>Files</span><small></small></button><button type="button" class="rail-action" data-project-shelf="note">'+icon('i-add')+'<span>New note</span></button><div class="project-material-pinned" aria-label="Pinned files"></div><footer><button type="button" class="rail-action" data-project-shelf="files">'+icon('i-folder')+'<span>Files</span></button><button type="button" class="rail-action" data-project-shelf="more" aria-label="Workspace and Project actions">'+icon('i-settings')+'<span>Actions</span></button></footer>';
  area.append(rail);area.dataset.projectRailReady='true';
  const popup=make('section','project-shelf-popup material-surface-glass');popup.id='projectShelfPopup';popup.hidden=true;popup.inert=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');popup.setAttribute('aria-labelledby','projectShelfTitle');
  popup.innerHTML='<header><div><small id="projectShelfContext"></small><h2 id="projectShelfTitle"></h2></div><button type="button" class="surface-key" data-project-shelf-expand>Expand area</button><button type="button" class="surface-key" data-project-shelf-close aria-label="Close Files">×</button></header><div class="project-shelf-body"></div>';
  document.body.append(popup);
  rail.querySelectorAll('[data-project-shelf]').forEach(button=>{button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',popup.id);button.setAttribute('aria-expanded','false');});
  const body=popup.querySelector('.project-shelf-body'),pinned=rail.querySelector('.project-material-pinned');
  let view='',openedScope='',returnFocus=null,signature='',pending=0;
  const scope=()=>SpatialWorkingMemory.scope(activeWorkspace,projectSpaces[desktopPages.column(activeWorkspace)]?desktopPages.column(activeWorkspace):null);
  const allowed=feature=>!root.SpatialGuide?.model.active()||SpatialGuide.model.allows(feature);
  const canReveal=()=>allowed('stash')&&!area.hidden&&isLocalArea('projects')&&area.dataset.areaState==='rail';
  const context=()=>{const project=projectSpaces[desktopPages.column(activeWorkspace)],profile=workspaceProfiles[activeWorkspace];return {project,profile,label:project?.name||profile.label,owner:project||{root:profile.home,folders:profile.folders},key:scope()};};
  function place(){
    if(!view)return;
    popup.style.width=Math.min(view==='more'?300:420,window.innerWidth-16)+'px';popup.style.maxHeight=Math.min(620,window.innerHeight-24)+'px';
    const rect=area.getBoundingClientRect(),actual=popup.getBoundingClientRect(),bounds=position(rect,dockState.projects.edge,{width:window.innerWidth,height:window.innerHeight},{width:actual.width,height:actual.height});
    popup.style.left=bounds.x+'px';popup.style.top=bounds.y+'px';popup.style.width=bounds.width+'px';popup.style.maxHeight=bounds.height+'px';
  }
  function restoreStash(){
    if(host.parentElement!==body)return;
    const target=projectColumnActive()?document.getElementById('projectSpaceContent'):document.getElementById('projectClosedState');
    target.prepend(host);
  }
  function close(focus=false){
    if(!view)return;
    view='';openedScope='';restoreStash();popup.hidden=true;popup.inert=true;
    rail.querySelectorAll('[aria-expanded]').forEach(button=>button.setAttribute('aria-expanded','false'));
    document.querySelectorAll('.memory-header-key,.memory-rail-entry').forEach(button=>button.setAttribute('aria-expanded','false'));
    if(focus&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  }
  function renderFiles(state){
    const entries=files(state.owner),heading=make('div','project-shelf-folder');
    const path=make('small','',state.owner.root),browse=make('button','surface-key','Open folder');browse.type='button';browse.dataset.projectShelfBrowse='';heading.append(path,browse);body.append(heading);
    const list=make('div','project-shelf-files');list.setAttribute('aria-label',state.label+' files');
    for(const entry of entries){
      const button=make('button','project-shelf-file');button.type='button';button.draggable=true;button.dataset.projectShelfPath=entry.path;button.dataset.projectShelfFile=entry.name;button.dataset.projectShelfFolder=String(entry.folder);button.title=entry.path;
      button.innerHTML=icon(entry.folder?'i-folder':'i-note');const text=make('span',''),name=make('b','',entry.name),detail=make('small','',entry.detail);text.append(name,detail);button.append(text);list.append(button);
    }
    if(!entries.length)list.append(make('p','project-shelf-empty','This folder is empty.'));
    body.append(list,make('p','project-shelf-hint','Drag files to Assistant.'));
  }
  function renderMore(state){
    const menu=make('div','project-shelf-menu');menu.setAttribute('role','menu');menu.setAttribute('aria-label',state.project?'Project actions':'Workspace actions');
    const actions=state.project?[['manage','Manage project'],['pack','Pack project'],['close','Close project']]:[['create','New project'],['projects','Project library']];
    for(const [action,label] of actions){const button=make('button','surface-key',label);button.type='button';button.setAttribute('role','menuitem');button.dataset.projectShelfAction=action;menu.append(button);}body.append(menu);
  }
  function open(next,focus=true){
    if(!canReveal())return false;
    if(next==='files'&&root.SpatialFolderDesktop)next='stash';
    if(next==='files'&&!allowed('folders')||next==='more'&&!allowed('projects'))return false;
    root.dispatchEvent(new CustomEvent('spatial-rail-open',{detail:{area:'projects'}}));
    const state=context();returnFocus=document.activeElement;
    if(view!==next)restoreStash();view=next;openedScope=state.key;
    popup.hidden=false;popup.inert=false;popup.dataset.shelfView=next;
    popup.style.setProperty('--project-accent',state.project?.accent||state.profile.accent);popup.style.setProperty('--workspace-accent',state.profile.accent);
    popup.querySelector('#projectShelfContext').textContent=state.label+' · '+(state.project?'Project':'Workspace');
    popup.querySelector('#projectShelfTitle').textContent=next==='stash'?'Files':next==='files'?'Files':'Actions';
    if(next==='stash'){if(host.parentElement!==body)body.replaceChildren(host);memory.render();}else{body.replaceChildren();if(next==='files')renderFiles(state);else renderMore(state);}
    rail.querySelectorAll('[data-project-shelf]').forEach(button=>button.setAttribute('aria-expanded',String(button.dataset.projectShelf===next||next==='stash'&&button.dataset.projectShelf==='note')));
    prepareMaterialSurfaces(popup);prepareControlSemantics(popup);place();
    if(focus)requestAnimationFrame(()=>{if(view!==next)return;const target=next==='stash'?host.querySelector('[data-memory-action="add"]'):body.querySelector('button');target?.focus({preventScroll:true});});
    return true;
  }
  function render(){
    const state=context();if(view&&(!canReveal()||openedScope!==state.key||document.body.classList.contains('universal-search-open')||document.body.classList.contains('project-editor-open')||document.body.classList.contains('package-open')))close();
    rail.hidden=!allowed('stash');rail.querySelector('[data-project-shelf="files"]').hidden=Boolean(root.SpatialFolderDesktop)||!allowed('folders');rail.querySelector('[data-project-shelf="more"]').hidden=!allowed('projects');
    rail.querySelector('.project-material-context').textContent=state.label;rail.querySelector('.project-material-context').title=state.label+' · '+(state.project?'Project':'Workspace');
    const items=memory.items(),pins=items.filter(item=>item.pinned).concat(root.SpatialFolderDesktop?.pinnedItems()||[]),folderCount=root.SpatialFolderDesktop?.rows().length??items.length;rail.querySelector('.project-material-stash small').textContent=String(folderCount);
    rail.querySelector('[data-project-shelf="stash"]').setAttribute('aria-label','Open '+state.label+' files · '+folderCount+' items');
    const next=JSON.stringify([state.key,pins.map(item=>[item.id,item.title,item.updated,item.source?.address,item.attachment?.kind])]);
    if(signature!==next){signature=next;pinned.replaceChildren();
      if(pins.length)pinned.append(make('small','project-material-pinned-label','Pinned'));
      for(const item of pins){const button=make('button','project-material-item');button.type='button';button.draggable=true;button.dataset.projectShelfItem=item.id;button.title=item.title;button.setAttribute('aria-label','Open pinned item: '+item.title);button.innerHTML=icon(kindIcon(item));button.append(make('span','',item.title));pinned.append(button);}
    }
    place();
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;render();});}
  rail.addEventListener('click',event=>{
    const item=event.target.closest('[data-project-shelf-item]');if(item){if(item.dataset.projectShelfItem.startsWith('folder-file:'))root.SpatialFolderDesktop?.revealFile(item.dataset.projectShelfItem.slice(12));else memory.revealItem(item.dataset.projectShelfItem,scope());return;}
    const button=event.target.closest('[data-project-shelf]');if(!button)return;
    const next=button.dataset.projectShelf;if(next==='note'){if(open('stash'))host.querySelector('[data-memory-action="add"]').click();return;}
    if(view===next)close(true);else open(next);
  });
  popup.addEventListener('click',event=>{
    if(event.target.closest('[data-project-shelf-close]'))return close(true);
    if(event.target.closest('[data-project-shelf-expand]')){close();setAreaState('projects','expanded');return;}
    const state=context();
    if(event.target.closest('[data-project-shelf-browse]')){close();openFileLocation(state.owner.root);return;}
    const file=event.target.closest('[data-project-shelf-path]');if(file){const path=file.dataset.projectShelfPath,name=file.dataset.projectShelfFile,folder=file.dataset.projectShelfFolder==='true';close();if(folder)openFileLocation(path);else{const id=createAppInstance('dolphin');renderFileLocation(id,path.slice(0,path.lastIndexOf('/'))||'/');openAppFile(id,path.split('/').at(-1));}return;}
    const action=event.target.closest('[data-project-shelf-action]')?.dataset.projectShelfAction;if(!action)return;close();
    if(action==='manage')openProjectEditor('manage',{projectName:desktopPages.column(activeWorkspace)});
    if(action==='pack')openPackageDialog('project','pack');
    if(action==='close')closeActiveProject();
    if(action==='create')openProjectEditor('create-project');
    if(action==='projects'){setUniversalSearchOpen(true);root.SpatialOverviewDesktop?.select('projects',false);}
  });
  function startDrag(event){
    const pinnedItem=event.target.closest('[data-project-shelf-item]'),file=event.target.closest('[data-project-shelf-path]');if(!event.dataTransfer||!pinnedItem&&!file)return;
    const state=context(),item=pinnedItem&&(pinnedItem.dataset.projectShelfItem.startsWith('folder-file:')?root.SpatialFolderDesktop?.fileContext(pinnedItem.dataset.projectShelfItem.slice(12)):memory.itemFor(pinnedItem.dataset.projectShelfItem));
    const value=item?(item.scope?memory.contextFor(item):item):{title:file.dataset.projectShelfFile,address:file.dataset.projectShelfPath,workspace:activeWorkspace,project:state.project?desktopPages.column(activeWorkspace):null,kind:file.dataset.projectShelfFolder==='true'?'folder':'file',source:{label:state.project?'Project files':'Workspace files',address:file.dataset.projectShelfPath,workspace:activeWorkspace,project:state.project?desktopPages.column(activeWorkspace):null}};
    event.dataTransfer.effectAllowed='copy';event.dataTransfer.setData(SpatialAIContext.MIME,JSON.stringify(value));event.dataTransfer.setData('text/plain',value.address||value.text||value.title);if(/^https?:/i.test(value.address||''))event.dataTransfer.setData('text/uri-list',value.address);
  }
  rail.addEventListener('dragstart',startDrag);popup.addEventListener('dragstart',startDrag);
  const stashButton=rail.querySelector('[data-project-shelf="stash"]');
  for(const type of ['dragover','drop'])stashButton.addEventListener(type,event=>{if(!canReveal()||![...event.dataTransfer?.types||[]].some(type=>['Files','text/plain','text/uri-list',SpatialAIContext.MIME].includes(type)))return;event.preventDefault();event.stopPropagation();open('stash',false);host.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:event.dataTransfer,clientX:event.clientX,clientY:event.clientY}));});
  document.addEventListener('pointerdown',event=>{if(view&&!popup.contains(event.target)&&!rail.contains(event.target)&&!event.target.closest('.memory-header-key,.memory-rail-entry'))close();},true);
  document.addEventListener('focusin',event=>{if(view&&!popup.contains(event.target)&&!area.contains(event.target))close();});
  document.addEventListener('keydown',event=>{
    if(!view)return;
    if(event.key==='Escape'&&!event.target.matches('select')){event.preventDefault();event.stopImmediatePropagation();close(true);return;}
    if(view!=='more'||!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const buttons=[...body.querySelectorAll('[role="menuitem"]')],index=buttons.indexOf(document.activeElement);if(!buttons.length)return;
    event.preventDefault();event.stopPropagation();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length].focus();
  },true);
  root.addEventListener('spatial-rail-open',event=>{if(event.detail?.area!=='projects')close();});
  root.addEventListener('resize',place);root.addEventListener('blur',()=>close());
  const observer=new MutationObserver(schedule);observer.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden']});observer.observe(area,{attributes:true,attributeFilter:['data-area-state','data-dock-edge','hidden']});observer.observe(document.body,{attributes:true,attributeFilter:['class','data-workspace']});
  root.SpatialProjectRail={open,close,render,canReveal,revealStash:()=>open('stash',false),stashTarget:()=>view==='stash'?body:null,contextChanged(key){if(view&&openedScope!==key)close();}};
  render();
})(typeof globalThis!=='undefined'?globalThis:this);
