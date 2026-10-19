/* Ordinary browser-local files, projected over retained demo material. Mutations
   share one Downloads snapshot, including Trash, so persistence can roll back. */
(function(root){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const inside=(value,base)=>Boolean(base&&(value===base||value.startsWith(base.replace(/\/$/,'')+'/')));
  const parent=value=>value.slice(0,value.lastIndexOf('/'))||'/';
  const basename=value=>value.slice(value.lastIndexOf('/')+1);
  function path(value){
    if(typeof value!=='string'||!value.startsWith('/')||/[\x00-\x1f\x7f\\]/.test(value))return '';
    const parts=[];for(const part of value.split('/')){if(part==='..'){if(!parts.length)return '';parts.pop();}else if(part&&part!=='.')parts.push(part);}
    return '/'+parts.join('/');
  }
  function error(code,message,details={}){return Object.assign(Error(message),{code,...details});}
  function validName(value){if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>180||/[\/\\\x00-\x1f\x7f]/.test(value)||['.','..'].includes(value))throw error('name','Use a name without slashes, leading/trailing spaces or control characters.');return value;}
  function create({downloads,seed=()=>[],scope,workspace=()=>'',persist=()=>{},changed=()=>{},clipboardChanged=()=>{},clock=()=>Date.now(),id=()=>('file-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))}){
    const clipboards=new Map(),undos=new Map();
    const ws=options=>options?.workspace||workspace();
    function owner(value,options={}){const normalized=path(value),current=ws(options),result=normalized&&scope(normalized,current);if(!result)throw error('scope','Choose a folder in this Workspace or one of its open Projects.');return {workspace:current,project:result.project||null};}
    function state(snapshot=downloads.snapshot()){const value=snapshot.fileOperations||{};return {version:1,trash:Array.isArray(value.trash)?clone(value.trash):[],suppressed:Array.isArray(value.suppressed)?clone(value.suppressed):[],directoryIds:value.directoryIds&&typeof value.directoryIds==='object'?clone(value.directoryIds):{},revision:Number(value.revision)||0};}
    function visibleSource(value,options={}){const current=ws(options);return !state().suppressed.some(entry=>entry.workspace===current&&inside(value,entry.path));}
    function entries(options={}){
      const current=ws(options),snapshot=downloads.snapshot(),meta=state(snapshot),result=new Map();
      const add=(value,ordinary=false)=>{
        const address=path(value.path||value.directory+'/'+value.name);if(!address||!scope(address,current)||(value.workspace&&value.workspace!==current))return;
        if(!ordinary&&meta.suppressed.some(entry=>entry.workspace===current&&inside(address,entry.path)))return;
        const inherited=result.get(address);
        // Project import's Downloads row is a listing placeholder. The archive
        // attachment owns the bytes until an ordinary mutation replaces it.
        if(ordinary&&inherited?.sourceRef?.archive&&inherited.attachment&&!value.attachment&&/^Imported binary file · /.test(value.content||''))value={...value,content:null,attachment:inherited.attachment,kind:inherited.kind};
        const at=owner(address,{workspace:current}),folder=value.kind==='folder';
        result.set(address,{...result.get(address),...clone(value),...at,path:address,directory:parent(address),name:basename(address),itemId:(folder&&meta.directoryIds[current+'\n'+address])||value.itemId||value.id||'file:'+current+':'+address,kind:folder?'folder':value.attachment?.kind||value.kind||'document',content:folder?null:typeof value.content==='string'?value.content:null,revision:value.revision||value.updated||value.savedAt||0});
      };
      for(const value of seed(current)||[])add(value);
      for(const directory of snapshot.directories||[])add({path:directory,kind:'folder'},true);
      for(const file of snapshot.files||[])add({...file,path:file.directory+'/'+file.name},true);
      return [...result.values()];
    }
    function read(value,options={}){const address=path(value);owner(address,options);return entries(options).find(entry=>entry.path===address)||null;}
    function list(value,options={}){const address=path(value);owner(address,options);return entries(options).filter(entry=>entry.directory===address).sort((a,b)=>Number(b.kind==='folder')-Number(a.kind==='folder')||a.name.localeCompare(b.name));}
    function resolve(binding,options={}){const current=options.workspace||binding?.workspace||ws(options);if(!binding?.itemId)return null;return entries({workspace:current}).find(entry=>entry.itemId===binding.itemId&&(!binding.workspace||entry.workspace===binding.workspace))||null;}
    const directories=(options={})=>entries(options).filter(entry=>entry.kind==='folder').map(entry=>entry.path).sort();
    function suppress(meta,address,current){if(!meta.suppressed.some(entry=>entry.workspace===current&&entry.path===address))meta.suppressed.push({workspace:current,path:address});for(const key of Object.keys(meta.directoryIds))if(key.startsWith(current+'\n')&&inside(key.slice(current.length+1),address))delete meta.directoryIds[key];}
    function erase(snapshot,address){snapshot.files=snapshot.files.filter(file=>!inside(file.directory+'/'+file.name,address));snapshot.directories=snapshot.directories.filter(directory=>!inside(directory,address));}
    function mutableSubtree(address,current,snapshot=downloads.snapshot()){
      const foreignFile=snapshot.files.some(file=>inside(file.directory+'/'+file.name,address)&&((file.workspace&&file.workspace!==current)||!scope(file.directory+'/'+file.name,current)));
      const foreignFolder=snapshot.directories.some(directory=>inside(directory,address)&&!scope(directory,current));
      if(foreignFile||foreignFolder)throw error('scope','This folder contains another Workspace’s files. Open that Workspace to manage them.');
    }
    function add(snapshot,record,meta){if(record.kind==='folder'){if(!snapshot.directories.includes(record.path))snapshot.directories.push(record.path);meta.directoryIds[record.workspace+'\n'+record.path]=record.itemId;return;}snapshot.files=snapshot.files.filter(file=>file.directory+'/'+file.name!==record.path);snapshot.files.push({...record,directory:parent(record.path),name:basename(record.path),savedAt:record.savedAt||clock()});if(!snapshot.directories.includes(parent(record.path)))snapshot.directories.push(parent(record.path));}
    function captureTrash(snapshot,meta,address,current,all=entries({workspace:current})){
      const values=all.filter(entry=>inside(entry.path,address));if(!values.length)throw error('missing','This item is no longer available.');
      if(values.some(entry=>entry.protected&&entry.path===address))throw error('protected','Workspace, Project and standard Home folders stay in place.');
      mutableSubtree(address,current,snapshot);
      const entry={id:'trash-'+id(),workspace:current,path:address,name:basename(address),deletedAt:clock(),items:clone(values)};
      meta.trash.push(entry);suppress(meta,address,current);erase(snapshot,address);return entry;
    }
    function commit(snapshot,meta,action,current,items,before=downloads.snapshot(),{remember=true}={}){
      meta.revision=Math.max(clock(),state(before).revision+1);snapshot.fileOperations=meta;downloads.load(snapshot);
      try{persist(downloads.snapshot(),before);}catch(cause){downloads.load(before);throw error('storage','This browser could not save the change. Your files are unchanged.',{cause});}
      const token='undo-'+id();if(remember)undos.set(current,{token,before:clone(before),after:JSON.stringify(downloads.snapshot())});
      try{changed({workspace:current,action,items:clone(items),paths:items.map(item=>item.path),...(remember?{undoToken:token}:{})});}catch{}return items;
    }
    function collision(address,source,choice,all){
      const existing=all.find(entry=>entry.path===address);if(!existing)return {address};
      if(choice==='keep-both'){
        const name=basename(address),dot=source?.kind==='folder'?-1:name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';let count=2,next;
        do{next=parent(address)+'/'+stem+' ('+count+++')'+ext;}while(all.some(entry=>entry.path===next));return {address:next};
      }
      if(choice==='replace'&&existing.kind!=='folder'&&source?.kind!=='folder'&&!existing.protected)return {address,replace:existing};
      throw error('conflict','An item named “'+basename(address)+'” already exists.',{path:address,canReplace:existing.kind!=='folder'&&source?.kind!=='folder'&&!existing.protected});
    }
    function checkDirectory(address,options){const target=read(address,options);if(!target||target.kind!=='folder')throw error('missing','The destination folder is no longer available.');}
    function write(value,content,options={}){
      const current=ws(options);let address=path(value);const at=owner(address,{workspace:current});validName(basename(address));checkDirectory(parent(address),{workspace:current});
      if(content!==null&&typeof content!=='string')throw error('content','Choose text or a retained file attachment.');
      if(typeof content==='string'&&content.length>12000)throw error('size','Text files in this demo support up to 12,000 characters. Your draft has been kept.');
      const all=entries({workspace:current}),existing=all.find(entry=>entry.path===address),updating=existing&&(options.expectedContent!==undefined||options.expectedRevision!==undefined||options.itemId===existing.itemId);
      if(updating&&existing.kind==='folder')throw error('folder','Choose a file rather than a folder.');
      if(updating&&options.expectedContent!==undefined&&existing.content!==options.expectedContent)throw error('changed','The file changed elsewhere. Your draft has been kept.');
      if(updating&&options.expectedRevision!==undefined&&existing.revision!==options.expectedRevision)throw error('changed','The file changed elsewhere. Your draft has been kept.');
      if(!existing&&(options.expectedContent!==undefined||options.expectedRevision!==undefined||options.itemId))throw error('missing','The saved file is no longer available. Use Save As to keep your draft.');
      const before=downloads.snapshot(),snapshot=clone(before),meta=state(before);let victim;
      if(existing&&!updating){const decision=collision(address,{kind:options.attachment?.kind||'document'},options.collision||'cancel',all);address=decision.address;victim=decision.replace;if(victim)captureTrash(snapshot,meta,victim.path,current,all);}
      if(updating&&existing.attachment&&typeof content==='string'&&!existing.attachment.mime?.startsWith('text/'))throw error('binary','This file has binary contents. Save the text as a different file.');
      if(updating&&options.collision==='replace')captureTrash(snapshot,meta,existing.path,current,all);
      const record={...(updating?existing:{}),...owner(address,{workspace:current}),path:address,directory:parent(address),name:basename(address),itemId:updating?existing.itemId:options.itemId||id(),kind:options.attachment?.kind||options.kind||(updating?existing.kind:'document'),content,revision:Math.max(clock(),(existing?.revision||0)+1),...(options.attachment?{attachment:clone(options.attachment)}:{}),source:options.source||'Local file'};
      if(updating)suppress(meta,existing.path,current);add(snapshot,record,meta);return commit(snapshot,meta,updating?'save':'create',current,[record],before)[0];
    }
    function createDirectory(value,options={}){
      const current=ws(options);let address=path(value);owner(address,{workspace:current});validName(basename(address));checkDirectory(parent(address),{workspace:current});
      address=collision(address,{kind:'folder'},options.collision||'cancel',entries({workspace:current})).address;
      const before=downloads.snapshot(),snapshot=clone(before),meta=state(before),record={...owner(address,{workspace:current}),path:address,directory:parent(address),name:basename(address),kind:'folder',itemId:id(),content:null,revision:clock()};
      add(snapshot,record,meta);return commit(snapshot,meta,'mkdir',current,[record],before)[0];
    }
    function selection(values,current){const paths=[...new Set((Array.isArray(values)?values:[values]).map(path))];if(!paths.length||paths.some(value=>!value))throw error('selection','Select a file or folder first.');paths.forEach(value=>owner(value,{workspace:current}));return paths.filter(value=>!paths.some(other=>other!==value&&inside(value,other)));}
    function transfer(values,destination,options={}){
      const current=ws(options),moving=options.mode==='move',target=path(destination);owner(target,{workspace:current});checkDirectory(target,{workspace:current});
      const sources=selection(values,current),all=entries({workspace:current}),before=downloads.snapshot(),snapshot=clone(before),meta=state(before),outputs=[];
      for(const address of sources){
        const source=all.find(entry=>entry.path===address);if(!source)throw error('missing','A selected item is no longer available.');
        if(source.protected)throw error('protected','Workspace, Project and standard Home folders stay in place.');
        mutableSubtree(address,current,before);
        if(source.kind==='folder'&&inside(target,address))throw error('descendant','A folder cannot be placed inside itself.');
        const requested=target+'/'+basename(address);if(moving&&requested===address){outputs.push(source);continue;}
        const decision=collision(requested,{...source,path:moving?address:''},options.collision||'cancel',[...all.filter(entry=>!moving||!sources.some(value=>inside(entry.path,value))),...outputs]);
        if(decision.replace)captureTrash(snapshot,meta,decision.replace.path,current,all);
        const subtree=all.filter(entry=>inside(entry.path,address)).sort((a,b)=>a.path.length-b.path.length);
        if(moving){suppress(meta,address,current);erase(snapshot,address);}
        for(const value of subtree){const nextPath=decision.address+value.path.slice(address.length),record={...value,...owner(nextPath,{workspace:current}),path:nextPath,directory:parent(nextPath),name:basename(nextPath),itemId:moving?value.itemId:id(),revision:Math.max(clock(),value.revision+1)};delete record.protected;delete record.sourceRef;add(snapshot,record,meta);outputs.push(record);}
      }
      return commit(snapshot,meta,moving?'move':'copy',current,outputs,before);
    }
    function rename(value,name,options={}){
      const current=ws(options),address=path(value);validName(name);if(name===basename(address))return read(address,{workspace:current});
      const source=read(address,{workspace:current});if(!source)throw error('missing','This item is no longer available.');if(source.protected)throw error('protected','Workspace, Project and standard Home folders stay in place.');
      mutableSubtree(address,current);
      const all=entries({workspace:current}),decision=collision(parent(address)+'/'+name,source,options.collision||'cancel',all),before=downloads.snapshot(),snapshot=clone(before),meta=state(before),outputs=[];
      if(decision.replace)captureTrash(snapshot,meta,decision.replace.path,current,all);suppress(meta,address,current);erase(snapshot,address);
      for(const value of all.filter(entry=>inside(entry.path,address))){const nextPath=decision.address+value.path.slice(address.length),record={...value,...owner(nextPath,{workspace:current}),path:nextPath,directory:parent(nextPath),name:basename(nextPath),revision:Math.max(clock(),value.revision+1)};delete record.sourceRef;add(snapshot,record,meta);outputs.push(record);}
      return commit(snapshot,meta,'rename',current,outputs,before).find(item=>item.path===decision.address);
    }
    function trash(values,options={}){const current=ws(options),before=downloads.snapshot(),snapshot=clone(before),meta=state(before),all=entries({workspace:current}),removed=selection(values,current).map(address=>captureTrash(snapshot,meta,address,current,all));commit(snapshot,meta,'trash',current,removed,before);return removed;}
    function trashList(options={}){return state().trash.filter(entry=>entry.workspace===ws(options)).map(clone).sort((a,b)=>b.deletedAt-a.deletedAt);}
    function restore(ids,options={}){
      const current=ws(options),wanted=new Set(Array.isArray(ids)?ids:[ids]),before=downloads.snapshot(),snapshot=clone(before),meta=state(before),all=entries({workspace:current}),outputs=[];
      const selected=meta.trash.filter(entry=>wanted.has(entry.id)&&entry.workspace===current).sort((a,b)=>a.path.length-b.path.length);if(selected.length!==wanted.size)throw error('missing','A selected Trash item is no longer available.');
      for(const entry of selected){owner(entry.path,{workspace:current});if(![...all,...outputs].some(item=>item.path===parent(entry.path)&&item.kind==='folder'))throw error('missing','Restore the original parent folder first.');const source=entry.items.find(item=>item.path===entry.path),decision=collision(entry.path,source,options.collision||'cancel',[...all,...outputs]);if(decision.replace)captureTrash(snapshot,meta,decision.replace.path,current,all);for(const value of entry.items){const nextPath=decision.address+value.path.slice(entry.path.length),record={...value,...owner(nextPath,{workspace:current}),path:nextPath,directory:parent(nextPath),name:basename(nextPath),itemId:all.some(active=>active.itemId===value.itemId)?id():value.itemId,revision:clock()};add(snapshot,record,meta);outputs.push(record);}}
      meta.trash=meta.trash.filter(entry=>!wanted.has(entry.id));return commit(snapshot,meta,'restore',current,outputs,before);
    }
    function clipboard(options={}){return clone(clipboards.get(ws(options))||null);}
    function setClipboard(values,mode,options={}){const current=ws(options),paths=selection(values,current),items=paths.map(value=>read(value,{workspace:current}));if(items.some(item=>!item))throw error('missing','A selected item is no longer available.');const result={workspace:current,mode,paths,items};clipboards.set(current,clone(result));clipboardChanged(clone(result));return result;}
    function pasteClipboard(entry,destination,options={}){const current=ws(options);if(entry?.workspace!==current)throw error('scope','The file clipboard belongs to another Workspace.');const values=(entry.items||[]).map(item=>resolve(item,{workspace:current})?.path);if(!values.length||values.some(value=>!value))throw error('missing','A copied item is no longer available. Copy it again.');const result=transfer(values,destination,{...options,workspace:current,mode:entry.mode==='cut'?'move':'copy'});if(entry.mode==='cut'){clipboards.delete(current);clipboardChanged({workspace:current,mode:'copy',paths:[],items:[]});}return result;}
    function undo(options={}){const current=ws(options),saved=undos.get(current);if(!saved||options.token&&options.token!==saved.token)throw error('missing','There is no file change to undo.');if(JSON.stringify(downloads.snapshot())!==saved.after)throw error('changed','Other file changes happened after this action. Use Trash to restore individual items.');const before=downloads.snapshot();downloads.load(saved.before);try{persist(downloads.snapshot(),before);}catch(cause){downloads.load(before);throw error('storage','Undo could not be saved. Your files are unchanged.',{cause});}undos.delete(current);changed({workspace:current,action:'undo',paths:[],items:[]});return true;}
    function filterRows(directory,rows,options={}){const current=ws(options),at=path(directory),result=(rows||[]).filter(row=>visibleSource(row[3]?.startsWith('/')&&row[2]==='folder'?row[3]:at+'/'+row[0],{workspace:current})).map(row=>[...row]);for(const item of list(at,{workspace:current})){const row=[item.name,item.kind==='folder'?'Folder':item.attachment?.format||'Saved file',item.kind==='folder'?'folder':item.kind,item.kind==='folder'?item.path:undefined],index=result.findIndex(value=>value[0]===item.name);if(index<0)result.push(row);else result[index]=row;}return result;}
    return {path,inside,parent,owner,read,list,resolve,directories,write,createDirectory,mkdir:createDirectory,rename,transfer,move:(values,to,options={})=>transfer(values,to,{...options,mode:'move'}),trash,trashList,restore,undo,visibleSource,filterRows,copy:(values,options)=>setClipboard(values,'copy',options),cut:(values,options)=>setClipboard(values,'cut',options),clipboard,pasteClipboard,paste:(to,options={})=>pasteClipboard(clipboard(options),to,options)};
  }
  const api={create,path,inside,parent,validName};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  root.SpatialDesktopFilesCore=api;
  if(typeof workspaceDownloads==='undefined'||!root.SpatialStashFiles)return;
  const F=root.SpatialStashFiles,memory=root.SpatialMemoryDesktop,rawStashList=F.list.bind(F);
  const current=()=>activeWorkspace;
  function scope(address,workspace){
    if(!root.SpatialAssistantFiles.allowed(address,workspace,workspaceProfiles,projectSpaces,typeof openProjectNames==='function'?openProjectNames(workspace):[]))return null;
    const project=Object.entries(projectSpaces).filter(([key,entry])=>inside(address,entry.root)&&(entry.originWorkspace===workspace||(typeof openProjectNames==='function'&&openProjectNames(workspace).includes(key)))).sort((a,b)=>b[1].root.length-a[1].root.length)[0];
    return {workspace,project:project?.[0]||null};
  }
  function seed(workspace){
    const profile=workspaceProfiles[workspace],result=[];if(!profile)return result;
    const folder=(address,protectedFolder=false)=>result.push({path:address,kind:'folder',protected:protectedFolder});
    function row(base,value){const [name,detail,kind,target]=value,address=kind==='folder'&&typeof target==='string'&&target.startsWith('/')?target:base+'/'+name;result.push({path:address,kind:kind==='folder'?'folder':kind||'document',content:null,detail,source:'Bundled demo file'});}
    folder(profile.home,true);folder(profile.home+'/Projects',true);folder(profile.home+'/Assistant');
    for(const name of SpatialHomeFolders.standard)folder(profile.home+'/'+name,true);
    // General Home can contain other Workspaces' Homes. Their parent folders
    // are navigation containers, never a route around Workspace isolation.
    for(const [other,entry]of Object.entries(workspaceProfiles)){if(other===workspace||!inside(entry.home,profile.home))continue;let address=parent(entry.home);while(inside(address,profile.home)){folder(address,true);if(address===profile.home)break;address=parent(address);}}
    for(const value of profile.folders||[])row(profile.home,value);
    const owners=[{owner:memory?.ownerFor?.(JSON.stringify([workspace,null])),project:null}];
    for(const [project,entry] of Object.entries(projectSpaces)){
      if(!scope(entry.root,workspace))continue;folder(entry.root,true);folder(entry.root+'/Assistant');for(const value of entry.files||[])row(entry.root,value);
      result.push({path:entry.root+'/.spatial-project.toml',kind:'config',content:'name = '+JSON.stringify(entry.name)+'\nroot = '+JSON.stringify(entry.root)+'\n'});
      for(const [relative,file]of Object.entries(entry.archiveFiles||{}))result.push({path:entry.root+'/'+relative,kind:file.kind||'file',content:null,itemId:file.itemId,attachment:{key:file.key,kind:file.kind||'file',mime:file.mime||'',filename:basename(relative)},sourceRef:{archive:true}});
      owners.push({owner:entry,project});
    }
    result.push({path:profile.home+'/.spatial-workspace.toml',kind:'config',content:'name = '+JSON.stringify(profile.label)+'\nhome = '+JSON.stringify(profile.home)+'\n'});
    for(const {owner:retained,project}of owners){if(!retained)continue;for(const file of rawStashList(retained)){
      const address=F.path(retained,file);
      result.push({path:address,workspace,project,kind:file.kind,content:file.content,attachment:file.attachment?{...file.attachment,...(file.blobKey&&!file.attachment.key?{key:file.blobKey}:{})}:undefined,itemId:file.record?.itemId||file.id,revision:file.updated||file.created||0,source:'Retained material',sourceRef:{path:address,id:file.id}});
      let directory=parent(address);while(inside(directory,F.folder(retained))&&directory!==F.folder(retained)){folder(directory);directory=parent(directory);}
    }}
    return result;
  }
  let refreshing=false;
  function refresh(detail){
    if(refreshing)return;refreshing=true;
    try{
      for(const item of detail.items||[]){for(const file of item.items||[item]){if(file.kind==='folder'||!file.itemId)continue;root.SpatialItemHistoryDesktop?.capture?.({id:file.itemId,itemId:file.itemId,title:file.name,text:file.content||'',attachment:file.attachment,address:file.path,workspace:file.workspace||detail.workspace,project:file.project||null,source:{workspace:file.workspace||detail.workspace,project:file.project||null,address:file.path,label:'Files',app:'dolphin'}},{workspace:file.workspace||detail.workspace,project:file.project||null,action:detail.action,detail:'File '+detail.action});}}
      for(const [id,info]of Object.entries(appInfo)){if((info.base||id)!=='dolphin'||appState[id]==='closed')continue;const frame=frameFor(id);if(frame?.dataset.fileWorkspace===activeWorkspace&&frame.dataset.fileLocation){if(frame.dataset.desktopTrash==='true')showTrash(id);else renderAppFiles(id,frame.dataset.fileLocation,{history:false});}}
      memory?.render(true);root.SpatialProjectRail?.render();root.SpatialAIDesktop?.render();
      queueDesktopStateBroadcast(0);root.dispatchEvent(new CustomEvent('spatial-files-change',{detail}));
    }finally{refreshing=false;}
  }
  const files=create({downloads:workspaceDownloads,seed,scope,workspace:current,persist:snapshot=>desktopStorage.setItem('spatial-downloads-v1',JSON.stringify(snapshot)),changed:refresh,clipboardChanged:detail=>root.dispatchEvent(new CustomEvent('spatial-file-clipboard-change',{detail})),id:()=>('file-'+crypto.randomUUID())});
  files.openFolder=(address,options={})=>{const workspace=options.workspace||activeWorkspace;if(workspace!==activeWorkspace)throw error('scope','Switch to this Workspace before opening its files.');const record=files.read(address,{workspace});return openFileLocation(record&&record.kind!=='folder'?record.directory:address);};
  files.saveBlob=async(address,blob,options={})=>{
    if(!(blob instanceof Blob))throw error('content','Choose a file to save.');if(blob.size>25*1024*1024)throw error('size','This demo saves files up to 25 MB.');
    const workspace=options.workspace||activeWorkspace,key='stash-file-'+crypto.randomUUID();files.owner(address,{workspace});
    await F.put(key,blob);
    try{return files.write(address,null,{...options,workspace,attachment:{key,kind:options.kind||(/^(image|audio)\//.exec(blob.type)?.[1])||'file',mime:blob.type||'application/octet-stream',size:blob.size,filename:basename(path(address))}});}catch(cause){try{await F.remove(key);}catch{}throw cause;}
  };
  files.blob=async(address,options={})=>{
    const file=files.read(address,options);if(!file||file.kind==='folder')throw error('missing','Choose an available file.');
    if(typeof file.content==='string')return new Blob([file.content],{type:file.attachment?.mime||(/\.md$/i.test(file.name)?'text/markdown;charset=utf-8':'text/plain;charset=utf-8')});
    if(file.attachment?.key){const blob=await F.get(file.attachment.key);if(blob)return blob;throw error('missing','The file bytes are no longer available in this browser.');}
    const attachment=F.safeAttachment(file.attachment);if(attachment?.src){const response=await fetch(attachment.src);if(!response.ok)throw error('missing','The bundled file could not be loaded.');return response.blob();}
    throw error('unavailable','This bundled example has no file contents. Create or import a file to download it.');
  };
  files.download=async(address,options={})=>{const workspace=options.workspace||activeWorkspace,file=files.read(address,{workspace});if(!file)throw error('missing','This file is no longer available.');const blob=await files.blob(address,{workspace});if(activeWorkspace!==workspace)throw error('scope','The Workspace changed. Download the file again here.');const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return file;};
  root.SpatialDesktopFiles=files;
  if(root.SpatialAssistantDesktop)root.SpatialAssistantDesktop.fileContext=function(address,workspace=activeWorkspace){let file;try{file=files.read(address,{workspace});}catch{return null;}if(!file||file.kind==='folder')return null;return {id:file.itemId,itemId:file.itemId,title:file.name,filename:file.name,kind:file.attachment?.kind||'file',text:file.content||'',address:file.path,attachment:file.attachment,workspace:file.workspace,project:file.project,source:{workspace:file.workspace,project:file.project,address:file.path,label:'File Browser'}};};
  const previousRows=appFileRows;
  appFileRows=function(id,address){const frame=frameFor(id),workspace=frame?.dataset.fileWorkspace||activeWorkspace;if(!scope(path(address),workspace))return previousRows(id,address);return files.filterRows(address,previousRows(id,address),{workspace});};
  const previousLocationRows=fileLocationRows;
  fileLocationRows=function(frame,address){const workspace=frame?.dataset?.fileWorkspace||activeWorkspace;const rows=previousLocationRows(frame,address);return scope(path(address),workspace)?files.filterRows(address,rows,{workspace}):rows;};
  /* File Browser controls are ordinary app controls; no native disk access. */
  const previousRender=renderAppFiles,selections=new Map(),selectionObservers=new WeakMap();
  renderAppFiles=function(id,address,options){const frame=frameFor(id);if(frame)delete frame.dataset.desktopTrash;const result=previousRender(id,address,options);decorate(id);return result;};
  function selection(id){const frame=frameFor(id);if(frame?.dataset.desktopTrash==='true')return selections.get(id)||[];const model=appWindowModel(id);return (model.selections?.length?model.selections:[model.selected].filter(Boolean)).map(name=>frame.dataset.fileLocation.replace(/\/$/,'')+'/'+name);}
  function button(action,label,disabled=false){return '<button type="button" class="surface-key" data-file-operation="'+action+'"'+(disabled?' disabled':'')+'>'+escapeHtml(label)+'</button>';}
  function decorate(id){
    const frame=frameFor(id);if(!frame||(appInfo[id]?.base||id)!=='dolphin')return;
    let toolbar=frame.querySelector('.desktop-file-actions');if(!toolbar){toolbar=document.createElement('div');toolbar.className='desktop-file-actions';toolbar.setAttribute('aria-label','File actions');frame.querySelector('.file-navigation')?.after(toolbar);}
    const inTrash=frame.dataset.desktopTrash==='true',picked=selection(id).length;
    toolbar.innerHTML=inTrash?button('home','Back to files')+button('restore','Restore',!picked):button('copy','Copy',!picked)+button('cut','Cut',!picked)+button('paste','Paste',!files.clipboard())+button('rename','Rename',picked!==1)+button('trash','Move to Trash',!picked)+button('show-trash','Trash');
    let feedback=frame.querySelector('.desktop-file-feedback');if(!feedback){feedback=document.createElement('p');feedback.className='desktop-file-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');frame.querySelector('.desktop-file-actions')?.after(feedback);}
    const list=frame.querySelector('.file-list');if(list&&!selectionObservers.has(list)){const observer=new MutationObserver(()=>decorate(id));observer.observe(list,{subtree:true,attributes:true,attributeFilter:['aria-selected']});selectionObservers.set(list,observer);}
  }
  function feedback(id,message){const field=frameFor(id)?.querySelector('.desktop-file-feedback');if(field)field.textContent=message;else showToast(message);}
  const modal=document.createElement('dialog');modal.className='desktop-files-dialog';modal.setAttribute('aria-label','File action');document.body.append(modal);
  const previousNavigationBlocked=desktopNavigationBlocked;desktopNavigationBlocked=function(...args){return modal.open||previousNavigationBlocked(...args);};
  for(const type of ['keydown','keyup'])root.addEventListener(type,event=>{if(modal.open){root.SpatialDemoSuper?.cancel?.();event.stopImmediatePropagation();}},true);
  // F2 also emulates Super in browsers. A selected file reserves this plain
  // key before that document-level handler can set its held-key state.
  root.addEventListener('keydown',event=>{
    if(event.key!=='F2'||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    const frame=event.target.closest('[data-app-frame]');if(!frame||frame.hidden||frame.dataset.fileWorkspace!==activeWorkspace||frame.dataset.desktopTrash==='true'||(appInfo[frame.dataset.appFrame]?.base||frame.dataset.appFrame)!=='dolphin'||selection(frame.dataset.appFrame).length!==1)return;
    event.preventDefault();event.stopImmediatePropagation();perform(frame.dataset.appFrame,'rename');
  },true);
  let dialogReturn=null;
  function closeDialog(){modal.close();if(dialogReturn?.isConnected)dialogReturn.focus();dialogReturn=null;}
  function ask({title,message='',name,choices},action){
    if(modal.open)throw error('busy','Finish the open file dialog first.');dialogReturn=document.activeElement;
    modal.innerHTML='<form method="dialog"><h2>'+escapeHtml(title)+'</h2>'+(message?'<p>'+escapeHtml(message)+'</p>':'')+(name!==undefined?'<label>Name<input name="filename" value="'+escapeHtml(name)+'" maxlength="180" autocomplete="off" required></label>':'')+'<p class="desktop-files-dialog-error" role="status"></p><div>'+choices.map(choice=>'<button class="surface-key" type="button" data-file-choice="'+escapeHtml(choice.value)+'">'+escapeHtml(choice.label)+'</button>').join('')+'<button class="surface-key" type="button" data-file-choice="cancel">Cancel</button></div></form>';
    const workspace=activeWorkspace;modal.onclick=async event=>{const choice=event.target.closest('[data-file-choice]');if(!choice)return;if(choice.dataset.fileChoice==='cancel'){closeDialog();return;}if(activeWorkspace!==workspace){closeDialog();return;}try{await action(choice.dataset.fileChoice,modal.querySelector('input')?.value);closeDialog();}catch(cause){modal.querySelector('.desktop-files-dialog-error').textContent=cause.message;}};
    modal.querySelector('form').onsubmit=event=>{event.preventDefault();modal.querySelector('[data-file-choice]:not([data-file-choice="cancel"])')?.click();};
    modal.oncancel=()=>{dialogReturn=null;};modal.showModal();modal.querySelector('input')?.select();
  }
  function perform(id,operation,choice='cancel'){
    const frame=frameFor(id),workspace=activeWorkspace,address=frame.dataset.fileLocation,picked=selection(id);
    try{
      if(operation==='show-trash'){showTrash(id);return;}
      if(operation==='home'){delete frame.dataset.desktopTrash;renderFileLocation(id,workspaceProfiles[workspace].home);return;}
      if(operation==='copy'||operation==='cut'){files[operation](picked,{workspace});feedback(id,picked.length+' item'+(picked.length===1?'':'s')+(operation==='cut'?' ready to move.':' copied.'));decorate(id);return;}
      if(operation==='paste'){files.paste(address,{workspace,collision:choice});feedback(id,'Files pasted.');return;}
      if(operation==='trash'){files.trash(picked,{workspace});appWindowModel(id).selections=[];appWindowModel(id).selected=null;renderAppFiles(id,address,{history:false});feedback(id,'Moved to Trash.');return;}
      if(operation==='restore'){files.restore(picked,{workspace,collision:choice});showTrash(id);feedback(id,'Restored.');return;}
      if(operation==='rename'&&picked.length===1){ask({title:'Rename',name:basename(picked[0]),choices:[{value:'rename',label:'Rename'}]},(_,name)=>{files.rename(picked[0],name,{workspace});appWindowModel(id).selected=null;appWindowModel(id).selections=[];renderAppFiles(id,address,{history:false});});return;}
      if(operation==='new-folder'){ask({title:'New folder',name:'New folder',choices:[{value:'create',label:'Create folder'}]},(_,name)=>files.createDirectory(address+'/'+name,{workspace}));return;}
      if(operation==='download'&&picked.length===1){files.download(picked[0],{workspace}).catch(cause=>feedback(id,cause.message));return;}
      if(operation==='undo'){files.undo({workspace});return;}
    }catch(cause){
      if(cause.code==='conflict'&&choice==='cancel'&&['paste','restore'].includes(operation)){ask({title:'An item already exists',message:cause.message,choices:[{value:'keep-both',label:'Keep both'},...(cause.canReplace?[{value:'replace',label:'Replace · keep old file in Trash'}]:[])]},value=>perform(id,operation,value));}
      else feedback(id,cause.message);
    }
  }
  function showTrash(id){
    const frame=frameFor(id),workspace=activeWorkspace;frame.dataset.desktopTrash='true';selections.set(id,[]);const entries=files.trashList({workspace});
    frame.querySelector('.file-list').innerHTML=entries.map(entry=>'<button type="button" class="content-row" role="option" aria-selected="false" data-trash-id="'+escapeHtml(entry.id)+'"><span>'+icon(entry.items[0]?.kind==='folder'?'i-folder':'i-note')+'<b>'+escapeHtml(entry.name)+'</b></span><small>'+escapeHtml(parent(entry.path))+'</small><small>'+new Date(entry.deletedAt).toLocaleDateString()+'</small></button>').join('')||'<p class="file-folder-empty">Trash is empty.</p>';
    frame.querySelector('.file-head').innerHTML='<span>Name</span><span>Original folder</span><span>Removed</span>';frame.querySelector('.file-preview').hidden=true;frame.querySelector('.app-identity small').textContent='Trash';frame.querySelector('.app-status').innerHTML='<span>'+entries.length+' items in this Workspace’s Trash</span><span>Restore keeps the original location</span>';decorate(id);
  }
  newAppFolder=function(id){return perform(id,'new-folder');};
  const previousOpen=openAppFile;openAppFile=function(id,name){
    const frame=frameFor(id);if(frame?.dataset.desktopTrash==='true')return;
    const address=frame?.dataset.fileLocation?.replace(/\/$/,'')+'/'+name;let file;try{file=files.read(address);}catch{return previousOpen(id,name);}
    if(file&&typeof file.content==='string'&&/\.(md|markdown|txt)$/i.test(name)&&root.SpatialNoteFiles?.open){const editor=Object.keys(appInfo).find(key=>(appInfo[key].base||key)==='notes'&&appState[key]!=='closed'&&isLocalApp(key))||createAppInstance('notes');if(editor){root.SpatialNoteFiles.open(editor,file);openApp(editor);}return;}
    if(file&&typeof file.content==='string'){const preview=frame.querySelector('.file-preview');preview.innerHTML='<header><div><b>'+escapeHtml(file.name)+'</b><small>'+escapeHtml(file.directory)+'</small></div>'+appActionButton('file-preview-close','i-close','Close file preview')+'</header><pre>'+escapeHtml(file.content)+'</pre>';preview.hidden=false;return;}
    if(file?.attachment){const preview=frame.querySelector('.file-preview'),workspace=activeWorkspace;preview.innerHTML='<header><div><b>'+escapeHtml(name)+'</b><small>'+escapeHtml(file.directory)+'</small></div>'+appActionButton('file-preview-close','i-close','Close file preview')+'</header><div class="desktop-file-binary-preview">Loading saved file…</div>';preview.hidden=false;const target=preview.querySelector('.desktop-file-binary-preview');files.blob(address,{workspace}).then(blob=>{if(!target.isConnected||activeWorkspace!==workspace)return;const url=URL.createObjectURL(blob);if(file.kind==='image'){const image=document.createElement('img');image.src=url;image.alt=name;target.replaceChildren(image);}else if(file.kind==='audio'){const audio=document.createElement('audio');audio.src=url;audio.controls=true;target.replaceChildren(audio);}else target.textContent=name+' · '+blob.size+' bytes';setTimeout(()=>URL.revokeObjectURL(url),60000);}).catch(cause=>{if(target.isConnected)target.textContent=cause.message;});return;}
    return previousOpen(id,name);
  };
  document.addEventListener('click',event=>{
    const frame=event.target.closest('[data-app-frame]');if(!frame||(appInfo[frame.dataset.appFrame]?.base||frame.dataset.appFrame)!=='dolphin'||frame.hidden||frame.dataset.fileWorkspace!==activeWorkspace)return;
    const id=frame.dataset.appFrame,trash=event.target.closest('[data-trash-id]'),action=event.target.closest('[data-file-operation]');
    if(trash){const previous=selections.get(id)||[],value=trash.dataset.trashId,next=event.ctrlKey||event.metaKey?(previous.includes(value)?previous.filter(item=>item!==value):[...previous,value]):[value];selections.set(id,next);frame.querySelectorAll('[data-trash-id]').forEach(row=>{row.setAttribute('aria-selected',String(next.includes(row.dataset.trashId)));row.classList.toggle('is-selected',next.includes(row.dataset.trashId));});decorate(id);return;}
    if(action){event.preventDefault();event.stopImmediatePropagation();perform(id,action.dataset.fileOperation);return;}
    if(event.target.closest('[data-file-name]'))decorate(id);
    if(frame.dataset.desktopTrash==='true'&&event.target.closest('[data-home-folder],[data-file-path],[data-app-action="file-back"],[data-app-action="file-up"]')){delete frame.dataset.desktopTrash;renderAppFiles(id,frame.dataset.fileLocation,{history:false});}
  },true);
  document.addEventListener('keydown',event=>{
    if(modal.open||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;const frame=event.target.closest('[data-app-frame]');if(!frame||(appInfo[frame.dataset.appFrame]?.base||frame.dataset.appFrame)!=='dolphin'||frame.hidden||frame.dataset.fileWorkspace!==activeWorkspace)return;
    const key=event.key.toLowerCase(),control=event.ctrlKey||event.metaKey;const operation=event.key==='F2'&&selection(frame.dataset.appFrame).length===1?'rename':event.key==='Delete'?'trash':control&&key==='c'?'copy':control&&key==='x'?'cut':control&&key==='v'?'paste':control&&key==='z'?'undo':control&&event.shiftKey&&key==='n'?'new-folder':null;
    if(operation){event.preventDefault();event.stopImmediatePropagation();if(frame.dataset.desktopTrash==='true'&&operation!=='undo')return;perform(frame.dataset.appFrame,operation);}
  },true);
  const previousContext=contextMenuEntries;
  contextMenuEntries=function(context){const entries=previousContext(context);const address=context.path||context.address;if(context.kind!=='file'||!address||!scope(path(address),activeWorkspace))return entries;return [...entries.filter(entry=>entry.action!=='file-trash'),{separator:true},{action:'desktop-file-copy',label:'Copy',icon:'i-clipboard'},{action:'desktop-file-cut',label:'Cut',icon:'i-clipboard'},{action:'desktop-file-paste',label:'Paste here',icon:'i-clipboard',disabled:!files.clipboard()},{action:'desktop-file-rename',label:'Rename',icon:'i-edit'},{action:'desktop-file-trash',label:'Move to Trash',icon:'i-trash'},{action:'desktop-file-download',label:'Download a copy',icon:'i-down'}];};
  const previousContextAction=executeContextAction;
  executeContextAction=function(action){if(action.startsWith('desktop-file-')){const context=contextMenuState,id=context?.appId,frame=id&&frameFor(id);if(frame){const model=appWindowModel(id);if(context.label&&!model.selections?.includes(context.label)){model.selected=context.label;model.selections=[context.label];}closeDesktopContextMenu();perform(id,action.slice('desktop-file-'.length));}return;}return previousContextAction(action);};
  root.addEventListener('spatial-file-clipboard-change',()=>{for(const [id,info]of Object.entries(appInfo))if((info.base||id)==='dolphin'&&appState[id]!=='closed')decorate(id);});
  for(const [id,info]of Object.entries(appInfo))if((info.base||id)==='dolphin'&&appState[id]!=='closed')decorate(id);
})(typeof globalThis!=='undefined'?globalThis:this);
