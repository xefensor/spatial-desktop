/* Project-only Pack / Import. Native filesystem access is outside this demo. */
(function(root){
  'use strict';
  const A=root.SpatialProjectArchive,F=root.SpatialStashFiles;
  const node=id=>document.getElementById(id),clone=value=>JSON.parse(JSON.stringify(value));
  let generation=0,state=null,lastArchive=null;
  const size=bytes=>bytes<1024?bytes+' B':bytes<1048576?(bytes/1024).toFixed(1)+' KB':(bytes/1048576).toFixed(1)+' MB';
  function row(title,detail,count='',type='i-folder'){return '<div class="project-archive-row">'+icon(type)+'<span><b>'+escapeHtml(title)+'</b><small>'+escapeHtml(detail)+'</small></span>'+(count?'<small class="archive-count">'+escapeHtml(count)+'</small>':'')+'</div>';}
  async function collect(project,id,replacements){
    const files=[],prefix=project.root.replace(/\/$/,'')+'/';
    for(const file of workspaceDownloads.snapshot().files){if(file.directory.startsWith(prefix)||file.directory===project.root){const path=(file.directory+'/'+file.name).slice(prefix.length);files.push({path,data:file.content||'',kind:'text'});}}
    for(const [path,file]of Object.entries(project.archiveFiles||{})){const blob=await F.get(file.key);if(!blob)throw Error('An imported file is no longer available: '+path);const at=files.findIndex(f=>f.path===path);if(at>=0)files.splice(at,1);files.push({path,data:new Uint8Array(await blob.arrayBuffer()),kind:file.kind||'file',mime:file.mime||blob.type});}
    const snapshot=clone(project);
    // Notes already materialized in Stash remain actual files in the archive.
    const stash=F.list(snapshot);
    return A.build(snapshot,{home:workspaceProfiles[project.originWorkspace||activeWorkspace]?.home||'',files,stash,replacements,
      readAttachment:file=>F.copyAsset(snapshot,{...clone(file),id:'archive:'+(file.attachment?.key||file.attachment?.src||file.id)}),
      readPath:async address=>{
        const file=workspaceDownloads.snapshot().files.find(file=>file.directory+'/'+file.name===address);if(file)return file.content||'';
        for(const other of Object.values(projectSpaces)){const prefix=other.root.replace(/\/$/,'')+'/';if(address.startsWith(prefix)){const binary=other.archiveFiles?.[address.slice(prefix.length)];if(binary){const blob=await F.get(binary.key);if(blob)return new Uint8Array(await blob.arrayBuffer());}}}
        return undefined;
      }});
  }
  async function prepare(direction,input=null){
    const token=++generation;node('packageKicker').textContent=direction==='pack'?'PROJECT ZIP':'IMPORT PROJECT';
    node('packageComposer').hidden=direction!=='pack';node('importPreview').hidden=direction!=='import';
    if(direction==='import'){
      state={direction,workspace:activeWorkspace,review:null};node('packageTitle').textContent='Import Project';node('projectImportReview').hidden=true;node('importProject').disabled=true;node('projectArchiveInput').value='';node('importStatus').textContent='Choose a Project ZIP created by this demo.';
      if(input)await reviewArchive(input,token);return;
    }
    const id=activeProjectName,project=projectSpaces[id];if(!project)return;
    state={direction,id,workspace:activeWorkspace,project:clone(project),replacements:{},plan:null,token};
    node('packageTitle').textContent='Pack '+project.name;node('packageFileName').textContent=slugifyProject(project.name)+'.zip';node('packageContentList').innerHTML=row('Project folder',project.root,'Preparing…');node('packageLinkedList').textContent='Checking linked files…';node('packageStatus').textContent='Gathering the Project copy…';node('createPackage').disabled=true;node('packageReviewImport').hidden=true;
    await refreshPlan();
  }
  async function refreshPlan(){
    const current=state,token=generation;node('createPackage').disabled=true;
    try{
      const plan=await collect(current.project,current.id,current.replacements);if(state!==current||generation!==token)return;
      current.plan=plan;node('packageSize').textContent=size(plan.size);
      node('packageContentList').innerHTML=row('Project folder',plan.entries.length+' files in the copy',size(plan.size))+row('Project settings and note','Editable settings, modes and Project note','Included','i-code')+row('Applications','Requirements are listed; apps and accounts are not bundled',plan.manifest.requirements.length+' apps','i-grid')+(plan.samples.length?row('Example files',plan.samples.length+' listed-only demo files contain labeled sample text','Demo','i-note'):'');
      node('packageLinkedList').innerHTML=plan.report.map(item=>item.kind==='missing'?'<div class="project-archive-row project-package-missing">'+icon('i-link')+'<span><b>'+escapeHtml(item.label)+'</b><small>Unavailable · '+escapeHtml(item.detail)+'</small><label>Provide this file<input type="file" data-package-replacement="'+item.index+'" aria-label="Provide '+escapeHtml(item.label)+'"></label></span></div>':row(item.label,item.detail,item.kind==='web'?'Link':'Included',item.kind==='web'?'i-web':'i-link')).join('')||row('No external files','All available Project content stays in its folder.');
      node('packageStatus').textContent=plan.missing.length?plan.missing.length+' unavailable file(s). Provide the missing files before creating a complete ZIP.':'Ready. The ZIP includes the linked files; your original Project and source files stay unchanged.';
      node('createPackage').disabled=!!plan.missing.length;prepareControlSemantics(node('packageDialog'));
    }catch(error){node('packageStatus').textContent=error.message;}
  }
  async function reviewArchive(input,token=generation){
    try{
      const bytes=input instanceof Uint8Array?input:new Uint8Array(await input.arrayBuffer()),review=A.inspect(bytes);if(token!==generation||state?.direction!=='import')return;
      state.review=review;const p=review.manifest.project,known=review.manifest.requirements||[];
      const id=uniqueProjectId(p.name),base=workspaceProfiles[state.workspace].home+'/Projects/'+id;
      const occupied=new Set([...Object.values(projectSpaces).map(project=>project.root),...workspaceDownloads.snapshot().directories]);let folder=base,suffix=2;while(occupied.has(folder))folder=base+'-'+suffix++;
      node('projectImportDestination').value=folder;node('projectImportReview').hidden=false;
      node('projectImportSummary').innerHTML='<section><b>'+escapeHtml(p.name)+'</b><small>One Project copy</small></section><section><b>'+review.files.size+' files</b><small>Project folder + included resources</small></section><section><b>'+escapeHtml(workspaceProfiles[state.workspace].label)+'</b><small>Opened Workspace</small></section>';
      node('projectImportFiles').innerHTML=[...review.files.keys()].map(path=>row(path,path.startsWith('Linked resources/')?'Included linked file':'Project file',size(review.files.get(path).length))).join('');
      const missing=known.filter(name=>!appInfo[name]);node('projectImportApps').textContent=missing.length?'Unavailable applications: '+missing.join(', ')+'. Files and Project settings can still be imported.':known.length+' application requirements are available in this demo. Apps are not installed by importing.';
      node('importStatus').textContent=(review.manifest.samples?.length?'Contains '+review.manifest.samples.length+' labeled demo example files. ':'')+'A new folder and Project will be created. Existing Projects stay unchanged.';node('importProject').disabled=false;prepareControlSemantics(node('packageDialog'));
    }catch(error){node('importStatus').textContent=error.message;node('projectImportReview').hidden=true;node('importProject').disabled=true;}
  }
  function cleanedProject(raw){
    const p=clone(raw),allowedIcon=value=>/^i-[a-z-]{1,30}$/.test(value||'')?value:'i-folder';
    p.name=String(p.name).trim().slice(0,80);p.icon=allowedIcon(p.icon);p.accent=/^#[0-9a-f]{6}$/i.test(p.accent||'')?p.accent:'#5cbcff';p.summary=String(p.summary||'Imported Project').slice(0,500);p.note=String(p.note||'').slice(0,12000);
    p.files=p.files.filter(row=>Array.isArray(row)&&A.safePath(row[0])&&!row[0].includes('/')).map(row=>[row[0],String(row[1]||'').slice(0,300),['folder','config','image','audio','document'].includes(row[2])?row[2]:'document']);
    p.modes=Object.fromEntries(Object.entries(p.modes).filter(([id,mode])=>/^[a-zA-Z0-9_-]{1,80}$/.test(id)&&mode&&typeof mode.label==='string').map(([id,mode])=>[id,{label:mode.label.slice(0,80),icon:allowedIcon(mode.icon),apps:(Array.isArray(mode.apps)?mode.apps:[]).filter(name=>typeof name==='string'),layout:['canvas','build','review'].includes(mode.layout)?mode.layout:'canvas'}]));
    if(!Object.keys(p.modes).length)throw Error('This Project has no usable modes.');p.activeMode=Object.hasOwn(p.modes,p.activeMode)?p.activeMode:Object.keys(p.modes)[0];return p;
  }
  async function importProject(){
    const current=state;if(!current?.review)return;
    const target=node('projectImportDestination').value.trim().replace(/\/+$/,'');
    if(!target.startsWith('/')||target.split('/').some(part=>part==='.'||part==='..')||/[\\\x00-\x1f]/.test(target)){node('importStatus').textContent='Choose an absolute folder path without . or .. segments.';return;}
    if(Object.values(projectSpaces).some(project=>project.root===target)||workspaceDownloads.snapshot().directories.includes(target)){node('importStatus').textContent='That folder already exists. Choose a new Project folder.';return;}
    node('importProject').disabled=true;node('importStatus').textContent='Importing the Project copy…';
    try{
      const {manifest,files}=current.review,p=cleanedProject(manifest.project),id=uniqueProjectId(p.name),keys=new Map();
      p.root=target;p.originWorkspace=current.workspace;p.requirements=manifest.requirements||[];p.archiveFiles={};delete p.stash;
      if(Object.values(projectSpaces).some(project=>project.name===p.name))p.name+=' (copy)';
      const fileData=new Map(manifest.files.map(file=>[file.path,file]));
      for(const [path,data]of files){
        if(path==='.spatial-project.json'||path==='.spatial-project.toml')continue;
        const meta=fileData.get(path)||{},kind=meta.kind||'text';
        if(kind!=='text'){
          const key='stash-import-'+crypto.randomUUID();await F.put(key,new Blob([data],{type:meta.mime||'application/octet-stream'}));keys.set(path,key);p.archiveFiles[path]={key,kind,mime:meta.mime||'application/octet-stream'};
        }
      }
      p.resources=p.resources.map(entry=>{
        const meta=entry[4]||{},next={...meta};
        if(meta.address?.startsWith('./'))next.address=target+'/'+meta.address.slice(2);
        if(meta.source?.address?.startsWith('./'))next.source={label:'Imported Project file',address:target+'/'+meta.source.address.slice(2)};
        if(meta.attachment){const path=meta.attachment.packagePath,key=keys.get(path);if(!key)throw Error('Attached file bytes are missing.');next.attachment={...meta.attachment,key};delete next.attachment.packagePath;delete next.attachment.src;next.fileId=key;}
        return [String(entry[0]).slice(0,120),String(entry[1]||'').replace(/Linked · \.\//,'Linked · '+target+'/').slice(0,12000),['web','file','document','audio','image','video','folder'].includes(entry[2])?entry[2]:'file',/^i-[a-z-]+$/.test(entry[3]||'')?entry[3]:'i-link',next];
      });
      const pendingFiles=[...files].filter(([path])=>!path.startsWith('.spatial-project.')).map(([path,data])=>({path,content:p.archiveFiles[path]?'Imported binary file · '+size(data.length):A.decode(data)}));
      // Validate all settings and text before adding the new Project or changing folders.
      const normalized=normalizeProject(p,id);if(!normalized)throw Error('Invalid Project settings.');
      projectSpaces[id]=normalized;workspaceDownloads.ensure(target);
      for(const {path,content}of pendingFiles){const slash=path.lastIndexOf('/'),directory=slash<0?target:target+'/'+path.slice(0,slash),name=path.slice(slash+1);workspaceDownloads.ensure(directory);workspaceDownloads.add(directory,name,{workspace:current.workspace,project:id,content});const first=path.split('/')[0];if(path.includes('/')&&!normalized.files.some(row=>row[0]===first))normalized.files.push([first,'Imported files','folder']);}
      persistDownloads();persistProjectState();renderOverviewProjects();queueDesktopStateBroadcast(0);closePackageDialog();
      if(activeWorkspace===current.workspace){activateProject(id,false);showArea('projects');setUniversalSearchOpen(false);}
      showToast(p.name+' imported into '+workspaceProfiles[current.workspace].label+' · originals unchanged');
    }catch(error){node('importStatus').textContent=error.message;node('importProject').disabled=false;}
  }
  node('createPackage').addEventListener('click',()=>{
    if(!state?.plan||state.plan.missing.length)return;
    try{lastArchive=A.zip(state.plan.entries);const blob=new Blob([lastArchive],{type:'application/zip'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=slugifyProject(state.project.name)+'.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);node('packageStatus').textContent='Project ZIP downloaded. Your original folder, links and source files are unchanged.';node('packageReviewImport').hidden=false;}catch(error){node('packageStatus').textContent=error.message;}
  });
  node('packageReviewImport').addEventListener('click',()=>prepare('import',lastArchive));
  node('packageLinkedList').addEventListener('change',event=>{const index=event.target.dataset.packageReplacement,file=event.target.files?.[0];if(index!==undefined&&file&&state?.direction==='pack'){if(file.size>A.LIMIT){node('packageStatus').textContent='This demo supports files up to 40 MB.';return;}state.replacements[index]=file;refreshPlan();}});
  node('projectArchiveInput').addEventListener('change',event=>{const file=event.target.files?.[0];if(file)reviewArchive(file);});
  node('importProject').addEventListener('click',importProject);
  async function previewBinary(id,path,file){
    const workspace=activeWorkspace,directory=path.slice(0,path.lastIndexOf('/'));
    const blob=await F.get(file.key);if(!blob){showToast('Imported file bytes are unavailable.');return;}
    const frame=frameFor(id),surface=frame?.querySelector('.file-preview');if(!surface||activeWorkspace!==workspace||frame.dataset.fileLocation!==directory)return;
    const url=URL.createObjectURL(blob),media=file.kind==='image'?'<img class="project-package-preview-image" src="'+url+'" alt="Imported Project image">':file.kind==='audio'?'<audio controls src="'+url+'"></audio>':file.kind==='document'?'<iframe src="'+url+'" title="Imported document" sandbox></iframe>':'<a href="'+url+'" download="'+escapeHtml(path.split('/').at(-1))+'">Download file</a>';
    surface.innerHTML='<header><div><b>'+escapeHtml(path.split('/').at(-1))+'</b><small>Imported Project file</small></div>'+appActionButton('file-preview-close','i-close','Close file preview')+'</header>'+media;surface.hidden=false;prepareControlSemantics(surface);
  }
  root.SpatialProjectPackages={prepare,collect,openFile(id,path,name){const full=path+'/'+name,project=Object.values(projectSpaces).find(project=>full.startsWith(project.root+'/')),file=project?.archiveFiles?.[full.slice(project.root.length+1)];if(!file)return false;previewBinary(id,full,file);return true;}};
})(globalThis);
