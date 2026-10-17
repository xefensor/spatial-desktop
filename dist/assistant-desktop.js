/* Direct selection, explicit file commands and local converters for the demo. */
(function(){
  'use strict';
  const A=SpatialAIDesktop,T=SpatialAssistantFiles,F=SpatialStashFiles,html=escapeHtml;
  let pending=null,lastFrame=null,busy=false;
  const invoking=new Set(),running=new Set(),urls=new Set();
  const content=document.querySelector('.ai-content'),transcript=document.getElementById('aiTranscript'),prompt=document.getElementById('aiPrompt');
  const strip=document.createElement('div');strip.className='ai-direct-context';strip.hidden=true;strip.setAttribute('aria-label','Current Assistant inputs');document.getElementById('aiComposer').before(strip);
  function allowed(){return (!globalThis.SpatialGuide?.model.active()||SpatialGuide.model.allows('ai'))&&!document.querySelector('[aria-modal="true"]:not([hidden]):not([aria-hidden="true"])');}
  function projectAt(path){return Object.keys(projectSpaces).filter(id=>T.inside(path,projectSpaces[id].root)).sort((a,b)=>projectSpaces[b].root.length-projectSpaces[a].root.length)[0]||null;}
  function local(frame){const id=frame?.dataset.appFrame;return id&&appState[id]==='open'&&!frame.hidden&&isLocalApp(id)&&desktopPages.inColumn(activeWorkspace,id)&&desktopPages.pageOf(activeWorkspace,id)===desktopPages.current(activeWorkspace);}
  function scope(frame){const id=frame?.dataset.appFrame,owner=id&&desktopPages.columnOf(activeWorkspace,id);return {workspace:activeWorkspace,project:projectSpaces[owner]?owner:null,app:appInfo[id]?.base||id||''};}
  function selectedText(){
    const active=document.activeElement;
    if(active?.matches('input[type="password"],input[autocomplete*="password"],input[type="email"]'))return null;
    if(active?.matches('textarea,input:not([type]),input[type="text"],input[type="search"],input[type="url"]')&&local(active.closest('[data-app-frame]'))){
      const text=active.value.slice(active.selectionStart??0,active.selectionEnd??0).trim();if(text)return {frame:active.closest('[data-app-frame]'),text};
    }
    const selection=window.getSelection(),node=selection?.anchorNode,frame=(node?.nodeType===1?node:node?.parentElement)?.closest('[data-app-frame]');
    if(!selection?.isCollapsed&&local(frame)&&frame.contains(selection.focusNode)){const text=selection.toString().trim();if(text)return {frame,text};}return null;
  }
  function selectionSource(value){
    const {frame,text}=value,id=frame.dataset.appFrame,at=scope(frame),address=frame.querySelector('.browser-toolbar input')?.value||frame.dataset.fileLocation||'';
    return {...at,id:'selection-'+crypto.randomUUID(),title:'Selected text · '+appInfo[id].label,kind:'text',text,address,source:{...at,label:appInfo[id].label,address,desktop:desktopPages.pageOf(activeWorkspace,id)}};
  }
  function fileContext(path,workspace=activeWorkspace){
    if(!T.allowed(path,workspace,workspaceProfiles,projectSpaces))return null;
    const saved=globalThis.SpatialMemoryDesktop?.contextAtFile(path);if(saved)return {...saved,address:path,filename:path.split('/').at(-1)};
    const directory=path.slice(0,path.lastIndexOf('/')),name=path.split('/').at(-1),file=workspaceDownloads.list(directory).find(f=>f.name===name&&(!f.workspace||f.workspace===workspace));
    if(file)return {id:file.itemId||'file:'+workspace+':'+path,itemId:file.itemId||'file:'+workspace+':'+path,title:name,filename:name,kind:file.attachment?.kind||'file',text:file.content,address:path,attachment:file.attachment,workspace,project:file.project||projectAt(path),source:{workspace,project:file.project||projectAt(path),address:path,label:'File Browser'}};
    return null;
  }
  function fileSources(frame,target=null){
    if(!local(frame)||(appInfo[frame.dataset.appFrame]?.base||frame.dataset.appFrame)!=='dolphin')return [];
    const clicked=target?.closest('[data-file-name]'),selected=[...frame.querySelectorAll('[data-file-name][aria-selected="true"]')];
    const rows=clicked&&!selected.includes(clicked)?[clicked]:selected;
    return rows.map(row=>{const path=row.dataset.fileFolder||frame.dataset.fileLocation.replace(/\/$/,'')+'/'+row.dataset.fileName;return row.dataset.fileFolder?{...scope(frame),id:'folder:'+path,title:row.dataset.fileName,filename:row.dataset.fileName,kind:'folder',address:path,source:{...scope(frame),address:path,label:'File Browser'}}:fileContext(path)||{...scope(frame),id:'unavailable:'+path,title:row.dataset.fileName,filename:row.dataset.fileName,kind:'file',address:path,source:{...scope(frame),address:path,label:'File Browser'}};});
  }
  function capture(target=null){
    if(!allowed())return [];
    const text=selectedText();if(text)return [selectionSource(text)];
    const frame=target?.closest('[data-app-frame]')||document.activeElement?.closest('[data-app-frame]')||lastFrame;
    return fileSources(frame,target);
  }
  function attach(items){
    if(!items.length)return false;
    const incoming=new Set(items.map(i=>i.id));A.removeInputs(A.current().items.filter(i=>invoking.has(i.id)&&!incoming.has(i.id)).map(i=>i.id));invoking.clear();
    const added=A.attach(items);if(!added.length)return false;
    for(const item of added)invoking.add(item.id);drawStrip();return true;
  }
  function invoke(){const items=pending?.workspace===activeWorkspace?pending.items:capture();pending=null;return attach(items);}
  document.addEventListener('pointerdown',event=>{
    const frame=event.target.closest('[data-app-frame]');if(local(frame))lastFrame=frame;
    if(event.button===0&&event.target.closest('#aiAreaToggle,#aiRailChat,#aiPrompt')){const items=capture();pending={workspace:activeWorkspace,items};if(event.target===prompt){pending=null;attach(items);}}
    else if(!event.target.closest('.ai-area,#desktopContextMenu'))pending=null;
  },true);
  // Preserve normal editing context menus unless a real app selection exists.
  const descriptor=contextMenuDescriptor,entries=contextMenuEntries,execute=executeContextAction;
  contextMenuDescriptor=function(target,...args){const items=target?.closest('[data-app-frame]')?capture(target):[],original=descriptor(target,...args);return items.length?{...(original||{}),kind:original?.kind||'assistant-selection',title:original?.title||'Selected text',assistantSources:items}:original;};
  contextMenuEntries=function(context){const original=entries(context);return context.assistantSources?.length?[{action:'assistant-selection',icon:'i-ai',label:'Ask Assistant',detail:context.assistantSources.length===1?context.assistantSources[0].title:context.assistantSources.length+' selected files',shortcut:'F2+A'},{separator:true},...original]:original;};
  executeContextAction=function(action){if(action!=='assistant-selection')return execute(action);const items=contextMenuState?.assistantSources||[];closeDesktopContextMenu();pending=null;attach(items);};
  document.addEventListener('contextmenu',event=>{
    if(!event.target.closest('input,textarea,[contenteditable="true"]')||!local(event.target.closest('[data-app-frame]')))return;
    const items=capture(event.target);if(!items.length)return;event.preventDefault();event.stopImmediatePropagation();openDesktopContextMenu({kind:'assistant-selection',title:'Selected text',assistantSources:items},event.clientX,event.clientY);
  },true);
  function drawStrip(){
    const session=A.current(),items=session.items;strip.hidden=!items.length;
    const current=items.filter(item=>invoking.has(item.id)),shown=current.length?current:items;
    strip.innerHTML='<span><b>'+html(shown.length===1?shown[0].title:shown.length+' sources in this chat')+'</b><small>'+html(shown.length===1?(shown[0].filename||shown[0].source?.address||shown[0].text.slice(0,100)):shown.map(i=>i.filename||i.title).join(' · '))+'</small></span><button type="button" class="surface-key" data-direct-inspect>Inspect</button><button type="button" class="surface-key" data-direct-remove aria-label="Remove current inputs">'+icon('i-close')+'</button>';
  }
  strip.addEventListener('click',event=>{if(event.target.closest('[data-direct-remove]')){const items=A.current().items.filter(i=>invoking.has(i.id));A.removeInputs((items.length?items:A.current().items).map(i=>i.id));drawStrip();return;}const item=A.current().items.find(i=>invoking.has(i.id))||A.current().items[0];if(item)A.inspect(item);});
  function folders(workspace){
    const home=workspaceProfiles[workspace].home;
    return [...new Set([home,...SpatialHomeFolders.standard.map(f=>home+'/'+f),home+'/Stash',...Object.values(projectSpaces).filter(p=>p.originWorkspace===workspace).flatMap(p=>[p.root,p.root+'/Stash',...p.files.filter(r=>r[2]==='folder').map(r=>p.root+'/'+r[0])]),...workspaceDownloads.snapshot().directories])].filter(path=>T.allowed(path,workspace,workspaceProfiles,projectSpaces));
  }
  function cwd(){return local(lastFrame)&&(appInfo[lastFrame.dataset.appFrame].base||lastFrame.dataset.appFrame)==='dolphin'?lastFrame.dataset.fileLocation:A.workingFolder();}
  function resolveFolder(value,base,workspace){const raw=String(value),first=raw.split('/')[0];if(SpatialHomeFolders.standard.includes(first))base=workspaceProfiles[workspace].home;const result=T.chooseFolder(value,base,folders(workspace));if(!T.allowed(result,workspace,workspaceProfiles,projectSpaces))throw Error('Choose a folder in the current Workspace. Other Workspaces stay separate.');return result;}
  function filesIn(directory,workspace){
    const paths=new Set(workspaceDownloads.list(directory).filter(f=>!f.workspace||f.workspace===workspace).map(f=>directory+'/'+f.name));
    const frame=Object.keys(appInfo).map(frameFor).find(frame=>frame&&frame.dataset.appKind==='dolphin');
    if(frame)for(const row of appFileRows(frame.dataset.appFrame,directory))if(row[2]!=='folder')paths.add(directory+'/'+row[0]);
    return [...paths].map(path=>fileContext(path,workspace)).filter(Boolean);
  }
  function extension(item){return (item.filename||item.title).match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()||'txt';}
  function sourcesFor(parsed,workspace){
    let items=parsed.sourceFolder?filesIn(resolveFolder(parsed.sourceFolder,cwd(),workspace),workspace):A.current().items.filter(i=>invoking.has(i.id));
    if(!items.length&&!parsed.sourceFolder)items=A.current().items.length?A.current().items:filesIn(cwd(),workspace);
    items=items.flatMap(item=>item.kind==='folder'?filesIn(item.address,workspace):[item]);
    if(parsed.sourceName){const matching=[...items,...filesIn(cwd(),workspace)].filter(i=>(i.filename||i.title)===parsed.sourceName);items=[...new Map(matching.map(i=>[i.itemId||i.id,i])).values()];if(items.length!==1)throw Error('Select '+parsed.sourceName+' in File Browser so its location is unambiguous.');}
    if(parsed.extension)items=items.filter(item=>extension(item)===parsed.extension||parsed.extension==='jpeg'&&extension(item)==='jpg');
    if(!items.length)throw Error('Select files in File Browser, or name their folder in the request. Only files with saved contents can be converted.');
    if(items.length>24)throw Error('Convert up to 24 files in one request.');
    return [...new Map(items.map(i=>[i.itemId||i.id,i])).values()];
  }
  async function textOf(item){
    if(item.attachment){const blob=await bytes(item);if(blob.size>1024*1024)throw Error('Text conversions support files up to 1 MB.');return blob.text();}
    if(item.id.startsWith('unavailable:')||(!item.text&&!fileContext(item.address)&&!['text','note'].includes(item.kind)))throw Error('No saved file content is available for '+item.title+'.');
    if(item.contentTruncated)throw Error('This saved excerpt is truncated. Attach the original text file to convert it in full.');return item.text||'';
  }
  async function bytes(item){
    const media=F.safeAttachment(item.attachment);if(!media)throw Error('Original file bytes are unavailable for '+item.title+'.');
    if(media.key){const blob=await F.get(media.key);if(!blob)throw Error('The original file is no longer available in this browser.');return blob;}
    const response=await fetch(media.src);if(!response.ok)throw Error('Could not read '+item.title+'.');return response.blob();
  }
  async function converted(item,format){
    if(['png','jpg','webp'].includes(format)){
      const blob=await bytes(item);if(!blob.type.startsWith('image/'))throw Error('Choose an image file for '+format.toUpperCase()+'.');
      const bitmap=await createImageBitmap(blob);try{if(bitmap.width*bitmap.height>24000000)throw Error('Images are limited to 24 megapixels.');const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');if(format==='jpg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(bitmap,0,0);const result=await new Promise(resolve=>canvas.toBlob(resolve,T.mime[format],.92));if(!result||result.type!==T.mime[format])throw Error('This browser cannot encode '+format.toUpperCase()+'.');return {blob:result,text:'',kind:'image'};}finally{bitmap.close();}
    }
    const text=T.convertText(await textOf(item),extension(item),format);return {blob:new Blob([text],{type:T.mime[format]+';charset=utf-8'}),text,kind:'file'};
  }
  async function propose(request,parsed){
    const workspace=activeWorkspace,chatId=A.current().id,base=cwd(),items=sourcesFor(parsed,workspace);
    const destination=resolveFolder(parsed.destination||'Converted',base,workspace);
    if(items.some(i=>i.workspace!==workspace))throw Error('Selected inputs must belong to the current Workspace.');
    // Freeze text in the source snapshot; media use their retained immutable bytes.
    const sources=[];
    for(const item of items){if(!['png','jpg','webp'].includes(parsed.format)){const text=await textOf(item);if(text.length>12000)throw Error('This demo converts text files up to 12,000 characters so the complete input can be kept in history.');sources.push({...item,text});}else{if(!F.safeAttachment(item.attachment))throw Error('Original image bytes are unavailable for '+item.title+'.');sources.push(item);}}
    if(activeWorkspace!==workspace||A.current().id!==chatId)throw Error('The chat changed. Send the request again in its original Workspace.');
    const exact=A.attach(sources,{focus:false});if(exact.length!==sources.length)throw Error('There is no room for these sources. Remove unused attachments first.');
    const project=projectAt(destination),action={format:parsed.format,destination,status:'review',outputs:[]};
    const turn=A.createTurn(request,{title:'Convert files · '+parsed.format.toUpperCase(),text:'Review '+sources.length+' input'+(sources.length===1?'':'s')+' and the destination below. Run conversion creates local copies; originals stay unchanged.',action},{sources:exact,folder:base,project});
    if(!turn)throw Error('Start a new chat before converting more files.');drawCards();A.notify('Review the inputs and output folder, then run the local conversion.');
  }
  async function intercept(event){
    const request=prompt.value.trim();let parsed;
    try{parsed=T.parse(request);}catch(error){event.preventDefault();event.stopImmediatePropagation();A.notify(error.message);return;}
    if(!parsed)return;
    event.preventDefault();event.stopImmediatePropagation();if(busy||!allowed())return;
    busy=true;try{await propose(request,parsed);}catch(error){A.notify(error.message);}finally{busy=false;}
  }
  document.addEventListener('submit',event=>{if(event.target.id==='aiComposer')return intercept(event);},true);
  document.addEventListener('keydown',event=>{if(event.target===prompt&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing)return intercept(event);},true);
  function drawCards(){
    drawStrip();for(const turn of A.current().turns){if(!turn.action)continue;if(turn.action.status==='running'&&!running.has(turn.id)){A.setAction(activeWorkspace,A.current().id,turn.id,{...turn.action,status:'failed',error:'Interrupted. Review the output folder before retrying.'});return;}const output=transcript.querySelector('[data-ai-demo-turn="'+CSS.escape(turn.id)+'"]');if(!output)continue;
      const at=turn.action,signature=JSON.stringify(at);let card=output.parentElement.querySelector('.ai-file-task');if(card?.dataset.signature===signature)continue;
      if(!card){card=document.createElement('section');card.className='ai-file-task';output.after(card);}card.dataset.turn=turn.id;card.dataset.signature=signature;card.setAttribute('aria-label','File conversion');
      const done=at.status==='complete',locked=done||at.status==='cancelled'||at.status==='running'||running.has(turn.id);
      card.innerHTML='<header><b>'+html(done?'Conversion complete':at.status==='cancelled'?'Conversion cancelled':'Local file conversion')+'</b><small>'+html(at.format.toUpperCase())+' · '+turn.sources.length+' input'+(turn.sources.length===1?'':'s')+'</small></header><ul>'+turn.sources.map(i=>'<li>'+html(i.filename||i.title)+'</li>').join('')+'</ul><label>Output folder<input data-task-destination aria-label="Conversion output folder" value="'+html(at.destination)+'"'+(locked?' readonly':'')+'></label><small>Create converted copies · Original files stay unchanged</small>'+(at.error?'<p class="ai-file-error" role="status">'+html(at.error)+'</p>':'')+(done?'<ul>'+at.outputs.map(o=>'<li><span>'+html(o.path.split('/').at(-1))+'</span><button type="button" class="surface-key" data-task-history="'+html(o.itemId)+'">History</button></li>').join('')+'</ul><button type="button" class="surface-key" data-task-open>Open output folder</button>':!locked?'<div class="ai-file-actions"><button type="button" class="surface-key" data-task-run>Run conversion</button><button type="button" class="surface-key" data-task-cancel>Cancel</button></div>':at.status==='running'?'<p role="status">Converting…</p>':'');
      prepareControlSemantics(card);
    }
  }
  async function run(turn,destination){
    if(running.has(turn.id)||turn.action.status==='complete')return;
    const workspace=activeWorkspace,chatId=A.current().id,format=turn.action.format;
    const action={...turn.action,destination:resolveFolder(destination,turn.folder,workspace),status:'running',error:''};running.add(turn.id);A.setAction(workspace,chatId,turn.id,action);drawCards();
    try{
      // Prepare every conversion before publishing any output into the filesystem.
      const prepared=[];for(const input of turn.sources)prepared.push({input,...await converted(input,format)});
      if(activeWorkspace!==workspace||A.current().id!==chatId)throw Error('Conversion stopped because the Workspace or chat changed. Run it again from its original chat.');
      const before=workspaceDownloads.snapshot(),outputs=[];const project=projectAt(action.destination);
      try{for(const value of prepared){const {input,blob,text,kind}=value,key='stash-converted-'+crypto.randomUUID();await F.put(key,blob);
        const name=F.safeName((input.filename||input.title).replace(/\.[a-z0-9]{1,10}$/i,'')+'.'+format),itemId='converted-'+crypto.randomUUID(),attachment={kind,key,filename:name,mime:blob.type,size:blob.size,format:format.toUpperCase()};
        const file=workspaceDownloads.add(action.destination,name,{workspace,project,content:text,source:input.source?.address||input.address,itemId,attachment,operationId:turn.id});outputs.push({file,input,attachment});}
        desktopStorage.setItem('spatial-downloads-v1',JSON.stringify(workspaceDownloads.snapshot()));
      }catch(error){workspaceDownloads.load(before);throw error;}
      for(const {file,input,attachment} of outputs){const related=[{itemId:input.itemId||input.id,versionId:input.versionId,relation:'derivedFrom'}];SpatialItemHistoryDesktop.capture({id:file.itemId,title:file.name,text:file.content,address:file.path,attachment,workspace,project,source:{workspace,project,app:'assistant',label:'Assistant file conversion'}},{workspace,project,action:'converted',detail:format.toUpperCase()+' copy created in '+action.destination,related});}
      SpatialItemHistoryDesktop.persist();
      A.setAction(workspace,chatId,turn.id,{...action,status:'complete',outputs:outputs.map(({file})=>({path:file.path,itemId:file.itemId}))});
      globalThis.SpatialTimelineDesktop?.record('assistant.output',{workspace,project,chatId,turnId:turn.id,title:'Converted '+outputs.length+' file'+(outputs.length===1?'':'s')+' to '+format.toUpperCase(),path:action.destination,sourceIds:turn.sources.map(i=>i.itemId||i.id),detail:'Created copies in '+action.destination});
      refreshDownloadUi();captureWorkspaceContent();queueDesktopStateBroadcast(0);A.notify('Converted '+outputs.length+' file'+(outputs.length===1?'':'s')+' · Open output folder to use them.');
    }catch(error){A.setAction(workspace,chatId,turn.id,{...action,status:'failed',error:error.message});A.notify('Conversion failed: '+error.message);}
    finally{running.delete(turn.id);drawCards();}
  }
  transcript.addEventListener('click',event=>{
    const card=event.target.closest('.ai-file-task');if(!card)return;const turn=A.current().turns.find(t=>t.id===card.dataset.turn);if(!turn)return;
    if(event.target.closest('[data-task-run]')){const destination=card.querySelector('[data-task-destination]').value;return run(turn,destination).catch(error=>A.notify(error.message));}
    if(event.target.closest('[data-task-cancel]')){A.setAction(activeWorkspace,A.current().id,turn.id,{...turn.action,status:'cancelled'});drawCards();}
    if(event.target.closest('[data-task-open]'))openFileLocation(turn.action.destination);
    const history=event.target.closest('[data-task-history]');if(history)SpatialItemHistoryDesktop.open(history.dataset.taskHistory);
  });
  const originalOpen=openAppFile;
  openAppFile=function(id,name){const frame=frameFor(id),file=workspaceDownloads.list(frame.dataset.fileLocation).find(f=>f.name===name);if(!file?.attachment)return originalOpen(id,name);
    const preview=frame.querySelector('.file-preview');preview.innerHTML='<header><div><b>'+html(name)+'</b><small>'+html(file.directory)+'</small></div>'+appActionButton('file-preview-close','i-close','Close file preview')+'</header><div class="stash-file-content" data-converted-preview><p>Loading file…</p></div>';preview.hidden=false;
    const host=preview.querySelector('[data-converted-preview]');F.get(file.attachment.key).then(blob=>{if(!blob)throw Error('Saved bytes are unavailable.');if(!host.isConnected)return;const url=URL.createObjectURL(blob);urls.add(url);host.innerHTML=(file.attachment.kind==='image'?'<img class="stash-file-image" src="'+html(url)+'" alt="'+html(name)+'">':file.attachment.mime.startsWith('text/html')?'<iframe src="'+html(url)+'" title="'+html(name)+'" sandbox></iframe>':'<pre>'+html(file.content)+'</pre>')+'<div class="stash-file-actions"><a class="surface-key" href="'+html(url)+'" download="'+html(name)+'">Download file</a><button type="button" class="surface-key" data-converted-history="'+html(file.itemId)+'">History</button></div>';prepareControlSemantics(preview);}).catch(error=>{if(host.isConnected)host.textContent=error.message;});
  };
  document.addEventListener('click',event=>{const button=event.target.closest('[data-converted-history]');if(button)SpatialItemHistoryDesktop.open(button.dataset.convertedHistory);});
  new MutationObserver(drawCards).observe(transcript,{childList:true});
  new MutationObserver(drawStrip).observe(document.getElementById('aiAttachments'),{childList:true});
  // No interrupted task resumes itself after a reload. It must be reviewed again.
  for(const turn of A.current().turns)if(turn.action?.status==='running')A.setAction(activeWorkspace,A.current().id,turn.id,{...turn.action,status:'failed',error:'Interrupted. Review the output folder before retrying.'});
  window.addEventListener('pagehide',()=>{for(const url of urls)URL.revokeObjectURL(url);});
  globalThis.SpatialAssistantDesktop={invoke,fileContext,capture,drawCards};drawCards();
})();
