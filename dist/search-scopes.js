/* Search follows the same near-to-wide order as Apps and System. */
(function(root){
  'use strict';
  function scopeFor(item,context){
    if(item.scope)return item.scope;
    if(item.kind==='window' && item.owner===context.owner && item.visible)return 'desktop';
    if(item.owner && item.owner!=='workspace' && item.owner===context.owner)return 'project';
    return ['window','file','memory','project'].includes(item.kind)?'workspace':'system';
  }
  function localProject(project,id,workspace,open){
    return !project.originWorkspace || project.originWorkspace===workspace || open.includes(id);
  }
  // Compare actual saved locations, never source URLs or shared item identities.
  // Linux paths remain case-sensitive; reject parent segments rather than guess.
  function canonicalFilePath(value){
    const path=String(value||'');if(!path.startsWith('/')||path.includes('\0'))return '';
    const parts=path.split('/').filter(part=>part&&part!=='.');
    return parts.includes('..')?'':'/'+parts.join('/');
  }
  function duplicateFiles(rows){
    const winners=new Map(),duplicates=[];
    for(const row of rows){
      const path=canonicalFilePath(row.path);if(!path)continue;
      const previous=winners.get(path);
      if(!previous){winners.set(path,row);continue;}
      if(row.provider==='memory'&&previous.provider!=='memory'){duplicates.push(previous);winners.set(path,row);}
      else duplicates.push(row);
    }
    return duplicates;
  }
  if(typeof module!=='undefined' && module.exports){module.exports={scopeFor,localProject,canonicalFilePath,duplicateFiles};return;}
  const results=document.querySelector('#universalResults');if(!results)return;
  const host=document.createElement('div');host.id='scopedSearchResults';host.className='scoped-search-results';results.prepend(host);
  const origins=new Map();
  const kinds={apps:'Application',files:'File',memory:'Saved items',projects:'Project',settings:'Action'};
  const context=()=>({owner:desktopPages.column(activeWorkspace),workspace:workspaceProfiles[activeWorkspace],page:desktopPages.current(activeWorkspace),bond:desktopPages.selectedFullscreen(activeWorkspace)});
  const availableProjects=()=>Object.entries(projectSpaces).filter(([id,project])=>localProject(project,id,activeWorkspace,openProjectNames()));
  function restore(){
    for(const [row,parent] of origins){row.querySelector('[data-search-location]')?.remove();parent.append(row);}
    origins.clear();host.replaceChildren();
  }
  function result(action,label,detail,art){
    const button=document.createElement('button');button.type='button';button.className='universal-result';
    button.innerHTML='<span class="universal-app-icon">'+art+'</span><span><b></b><small></small></span>';
    button.querySelector('b').textContent=label;button.querySelector('small').textContent=detail;
    Object.assign(button.dataset,action);return button;
  }
  function appResults(query){
    const target=$('#universalAppResults');target.replaceChildren();
    const models=appWindowStore.snapshot()[activeWorkspace]||{};
    for(const [id,state] of Object.entries(appState)){
      if(!appInfo[id] || !['open','minimized','background'].includes(state))continue;
      const owner=desktopPages.columnOf(activeWorkspace,id);
      if(owner!=='workspace' && !openProjectNames().includes(owner))continue;
      const info=appInfo[id],hidden=models[id]?.previewHidden,base=info.base||id;
      // Private previews do not become searchable window titles.
      const label=hidden?appInfo[base].label:info.label;
      const title=hidden?'Preview hidden':info.detail||'';
      if(!matchesSearch(label+' '+title,query))continue;
      const row=result({searchOpenApp:id,searchWindow:'true'},label,(state==='minimized'?'Parked':state==='background'?'Running in background':'Open window')+(title?' · '+title:''),appArt(id));
      target.append(row);
    }
    for(const button of $$('.launcher-app',$('#allAppsGrid'))){
      if(button.dataset.appWorkspace && button.dataset.appWorkspace!==activeWorkspace)continue;
      if(!matchesSearch(button.textContent+' '+(button.dataset.category||''),query))continue;
      const id=button.dataset.openApp;
      const action=id?{searchOpenApp:id,searchNewInstance:'true'}:{searchLaunchApp:button.dataset.launchApp};
      const row=result(action,button.lastElementChild.textContent.trim(),id&&!appInfo[id]?.singleInstance?'Open a new window':'Open application',$('.launcher-icon',button).innerHTML);
      row.dataset.searchScope=button.dataset.appWorkspace?'workspace':'system';target.append(row);
    }
    prepareControlSemantics(target);return target.children.length;
  }
  function fileResults(query){
    const target=$('#universalFileResults');if(!target)return;
    target.replaceChildren();const seen=new Set();
    const add=(label,directory,owner='workspace',folder=false)=>{
      const path=folder?directory:directory.replace(/\/$/,'')+'/'+label;
      if(seen.has(path) || !matchesSearch(label+' '+path,query))return;seen.add(path);
      const row=result({searchFileDirectory:directory,searchFileName:folder?'':label,searchOwner:owner},label,directory,icon(folder?'i-folder':'i-note'));
      target.append(row);
    };
    const profile=workspaceProfiles[activeWorkspace];
    for(const [name,,type] of profile.folders)add(name,type==='config'?profile.home:profile.home+'/'+name,'workspace',type!=='config');
    for(const [id,project] of availableProjects()){
      for(const [name,,type,targetPath] of project.files||[])add(name,type==='folder'?(targetPath||project.root+'/'+name):project.root,id,type==='folder');
    }
    for(const file of workspaceDownloads.snapshot().files){
      if(file.workspace!==activeWorkspace)continue;
      if(file.project && !availableProjects().some(([id])=>id===file.project))continue;
      add(file.name,file.directory,file.project||'workspace');
    }
    prepareControlSemantics(target);
  }
  // Run after query/Guide matching and category counts, before category hiding.
  // All results keeps the richer saved-item action; each category keeps its own row.
  function dedupe(hideDuplicates=true){
    const candidates=[];
    for(const row of $$('.universal-result:not([hidden])',results)){
      if(row.dataset.memoryResult){
        const item=root.SpatialMemoryDesktop?.itemFor(row.dataset.memoryResult);
        const saved=item&&root.SpatialMemoryDesktop?.savedItem(item);
        if(saved?.path)candidates.push({row,path:saved.path,provider:'memory'});
      }else if(row.dataset.searchFileName){
        candidates.push({row,path:row.dataset.searchFileDirectory.replace(/\/$/,'')+'/'+row.dataset.searchFileName,provider:'files'});
      }
    }
    const duplicates=duplicateFiles(candidates);
    if(hideDuplicates)for(const item of duplicates)item.row.hidden=true;
    return duplicates.length;
  }
  function metadata(row,kind,ctx){
    let owner=row.dataset.searchOwner;
    let detail='';const item={kind:({files:'file',projects:'project',apps:'app'})[kind]||kind,owner,scope:row.dataset.searchScope};
    if(row.dataset.searchWindow){
      const id=row.dataset.searchOpenApp;owner=desktopPages.columnOf(activeWorkspace,id);item.kind='window';item.owner=owner;
      item.visible=appState[id]==='open'&&desktopPages.visible(activeWorkspace,id,localDisplaySlot(),activeDisplayRoster().length);
      const bond=desktopPages.fullscreenBond(activeWorkspace,id);
      if(appState[id]==='background')item.scope='system';
      else if(appState[id]==='minimized'){if(owner!==ctx.owner)detail=projectSpaces[owner]?.name||ctx.workspace.label;}
      else if(owner!==ctx.owner||!item.visible){
        const place=bond?'Temporary desktop · from Desktop '+(bond.page+1):'Desktop '+(desktopPages.pageOf(activeWorkspace,id)+1);
        detail=(owner!==ctx.owner?(projectSpaces[owner]?.name||ctx.workspace.label)+' · ':'')+place;
      }
    }else if(row.dataset.memoryResult){
      const record=SpatialMemoryDesktop.itemFor(row.dataset.memoryResult);
      if(record){item.owner=JSON.parse(record.scope)[1]||'workspace';if(item.owner!==ctx.owner)detail=projectSpaces[item.owner]?.name||'';}
    }else if(row.dataset.searchProject){
      item.owner=row.dataset.searchProject;
    }else if(row.dataset.areaShow||row.id==='universalTimer')item.scope='workspace';
    return {scope:scopeFor(item,ctx),detail,kind:item.kind==='window'?'Window':kinds[kind]||kind};
  }
  function render(){
    const ctx=context();
    const titles={desktop:['This desktop',ctx.bond?'Temporary desktop':'Desktop '+(ctx.page+1)],project:['Project',projectSpaces[ctx.owner]?.name||''],workspace:['Workspace',ctx.workspace.label],system:['System-wide','Applications & settings']};
    const sections=new Map();
    for(const [scope,[label,name]] of Object.entries(titles)){
      const section=document.createElement('section');section.className='search-scope';section.dataset.searchScope=scope;section.hidden=true;section.setAttribute('aria-label',label+' search results');
      section.innerHTML='<header class="search-scope-heading"><div><span></span><h3></h3></div><small></small></header><div class="universal-result-grid"></div>';
      section.querySelector('span').textContent=label;section.querySelector('h3').textContent=name;sections.set(scope,section);host.append(section);
    }
    for(const group of $$('.universal-group',results)){
      const kind=group.dataset.universalGroup;if(kind==='web')continue;
      for(const row of $$('.universal-result:not([hidden])',group)){
        const meta=metadata(row,kind,ctx),section=sections.get(meta.scope);if(!section)continue;
        origins.set(row,row.parentElement);
        // The heading owns scope; the row already describes its action or path.
        // Add a location only when it helps distinguish another desktop or Project.
        if(meta.detail){const location=document.createElement('small');location.dataset.searchLocation='true';location.className='search-result-location';location.textContent=meta.detail;row.querySelector('b').parentElement.append(location);}
        section.querySelector('.universal-result-grid').append(row);section.hidden=false;
      }
      group.hidden=true;
    }
    for(const section of sections.values()){
      const count=section.querySelector('.universal-result-grid').children.length;
      section.querySelector('.search-scope-heading>small').textContent=count+' '+(count===1?'result':'results');
    }
    $('#universalResults').scrollTop=0;
  }
  results.addEventListener('click',event=>{
    const row=event.target.closest('[data-search-file-directory]');if(!row)return;
    const owner=row.dataset.searchOwner;
    if(owner && owner!=='workspace')activateProject(owner,false);
    else if(desktopPages.column(activeWorkspace)!=='workspace')changeDesktopColumn('workspace',false);
    const browser=Object.keys(appInfo).find(id=>(appInfo[id].base||id)==='dolphin' && appState[id]!=='closed' && desktopPages.inColumn(activeWorkspace,id));
    if(browser)changeDesktopPage(desktopPages.pageOf(activeWorkspace,browser),false,desktopPages.columnOf(activeWorkspace,browser));
    openFileLocation(row.dataset.searchFileDirectory);
    if(row.dataset.searchFileName)showToast(row.dataset.searchFileName+' · shown in its folder');
  });
  root.SpatialSearchScopes={restore,render,appResults,fileResults,dedupe};
})(typeof globalThis!=='undefined'?globalThis:this);
