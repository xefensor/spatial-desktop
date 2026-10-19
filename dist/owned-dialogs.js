/* App-owned dialogs travel with their window, including its parked card. */
(function (root) {
  'use strict';
  function savePage(page, context) {
    return {kind:'save-page', title:'Save page as…', filename:(page.title || 'Page').replace(/[\\/:*?"<>|]/g,'-')+'.txt',
      directory:context.directory, project:context.project, source:page.address,
      content:[page.title,page.intro,page.detail].filter(Boolean).join('\n\n')};
  }
  function filename(value) { return String(value || '').trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-'); }
  function destinations(context, profiles, projects) {
    const profile=profiles[context.workspace],project=projects[context.project],groups=[{label:'This window',items:[{key:'default',label:'Default save location',directory:context.directory,project:project&&context.directory===project.root.replace(/\/+$/,'')+'/Downloads'?context.project:null}]}];
    const join=(base,name)=>base.replace(/\/+$/,'')+'/'+name;
    if(project)groups.push({label:'Project · '+project.name,items:[{key:'project-folder',label:'Project folder',directory:project.root,project:context.project},{key:'project-downloads',label:'Project Downloads',directory:join(project.root,'Downloads'),project:context.project}]});
    if(profile)groups.push({label:'Workspace · '+profile.label,items:['Downloads','Documents','Desktop','Home'].map(name=>({key:'workspace-'+name.toLowerCase(),label:name==='Home'?profile.label+' Home':name,directory:name==='Home'?profile.home:join(profile.home,name),project:null}))});
    return groups;
  }
  function destination(dialog,context,profiles,projects) {
    const groups=destinations(context,profiles,projects),owner=JSON.stringify([context.workspace,context.project||null]);
    const key=dialog.saveOwner===owner?dialog.saveLocation:'default';
    return {...(groups.flatMap(group=>group.items).find(item=>item.key===key)||groups[0].items[0]),owner,groups};
  }
  function availableName(requested, names) {
    const used=new Set(names),dot=requested.lastIndexOf('.'),stem=dot>0?requested.slice(0,dot):requested,extension=dot>0?requested.slice(dot):'';
    let name=requested,index=2;while(used.has(name))name=stem+' ('+(index++)+')'+extension;return name;
  }
  function parkedMarkup(original, id, label, dialog, escape) {
    if (!dialog) return original;
    const child='<div class="parked-owned-dialog"><span class="owned-dialog-connection" aria-hidden="true"></span>'
      + '<button type="button" class="parked-owned-dialog-restore" data-owned-dialog-restore="'+escape(id)+'" aria-label="Restore '+escape(label)+' and its '+escape(dialog.title)+' dialog">'
      + '<span class="parked-dialog-heading"><span>Dialog · '+escape(label)+'</span><em>Needs input</em></span>'
      + '<b>'+escape(dialog.title)+'</b><span class="parked-dialog-file">'+escape(dialog.filename)+'</span>'
      + '<small>'+escape(dialog.directory)+'</small><span class="parked-dialog-return">Restore app & dialog ↗</span></button></div>';
    return original.replace('class="mini-card','role="group" aria-label="'+escape(label)+' and its dialog" class="mini-card has-owned-dialog')
      .replace(/<\/article>$/,child+'</article>');
  }
  const api={savePage,filename,parkedMarkup,destinations,destination,availableName};
  if(typeof module!=='undefined' && module.exports){module.exports=api;return;}
  root.SpatialOwnedDialogs=api;
  const rendered=new WeakMap();
  const state=id=>appWindowModel(id).ownedDialog;
  function resolve(id) {
    const dialog=state(id),context=downloadContext(id),target=destination(dialog,context,workspaceProfiles,projectSpaces);
    dialog.directory=target.directory;dialog.project=context.project;dialog.saveOwner=target.owner;dialog.saveLocation=target.key;
    return {context,target};
  }
  function focusDialog(id) {
    const frame=frameFor(id);
    if(appState[id]==='open' && isLocalApp(id) && !frame.hidden)(frame.querySelector('[data-owned-dialog] input')||frame.querySelector('[data-owned-dialog] select')||frame.querySelector('[data-owned-dialog] button'))?.focus({preventScroll:true});
  }
  const isNote=id=>(appInfo[id]?.base||id)==='notes';
  const editableName=value=>/\.(md|markdown|txt)$/i.test(value);
  function noteScope(id){const source=downloadContext(id),project=projectSpaces[source.project];return {...source,directory:project?.root||workspaceProfiles[activeWorkspace].home+'/Documents'};}
  function noteCurrent(id,dialog=state(id)){
    if(dialog?.workspace!==activeWorkspace)throw Error('This dialog belongs to another Workspace. Cancel and open it here again.');
    const model=appWindowModel(id),note=model.notes.find(note=>note.id===dialog.noteId);
    if(!note)throw Error('This document is no longer available.');
    model.active=note.id;return note;
  }
  function allowedFolder(path){return root.SpatialAssistantFiles?.allowed(path,activeWorkspace,workspaceProfiles,projectSpaces,typeof openProjectNames==='function'?openProjectNames():[])!==false;}
  function folderPath(value){const path=root.SpatialDesktopFiles?.path?.(value)||String(value||'').replace(/\/+$/,'');if(!path.startsWith('/')||!allowedFolder(path))throw Error('Choose a folder in this Workspace or an open Project.');return path;}
  function openNoteDialog(id,kind='note-save',closeAfter=false){
    const note=SpatialAppTools.activeNote(appWindowModel(id)),scope=noteScope(id);
    appWindowModel(id).ownedDialog={kind,title:kind==='note-open'?'Open text document':kind==='note-close'?'Save changes before closing?':'Save document as…',workspace:activeWorkspace,noteId:note.id,directory:note.file?.workspace===activeWorkspace?note.file.path.slice(0,note.file.path.lastIndexOf('/')):scope.directory,filename:note.file?.workspace===activeWorkspace?note.file.path.split('/').at(-1):(filename(note.title||'Untitled').replace(/\.(?:md|markdown|txt)$/i,'')||'Untitled')+'.md',closeAfter};
    rendered.delete(frameFor(id));render(id);saveAppWindows();focusDialog(id);
  }
  function noteDialogMarkup(id,dialog){
    const note=noteCurrent(id,dialog),close=dialog.kind==='note-close',opening=dialog.kind==='note-open',backend=root.SpatialDesktopFiles;
    const entries=backend?.list?.(dialog.directory,{workspace:activeWorkspace})||[],folders=entries.filter(file=>file.kind==='folder'||file.type==='folder'),files=entries.filter(file=>editableName(file.name)&&typeof file.content==='string'&&file.kind!=='folder'&&file.type!=='folder');
    const full=(file)=>file.path||dialog.directory.replace(/\/$/,'')+'/'+file.name;
    if(!dialog.selected||!files.some(file=>full(file)===dialog.selected))dialog.selected=files[0]?full(files[0]):'';
    const header='<div class="owned-dialog-heading">'+appArt(id,'app-art-compact')+'<div><small>Dialog · Note Editor</small><b>'+escapeHtml(dialog.title)+'</b></div></div>';
    if(close)return header+'<p><b>'+escapeHtml(note.title||'Untitled')+'</b> has changes that are not saved to a file. Your draft stays here if you cancel.</p><p class="owned-dialog-error" role="status">'+escapeHtml(dialog.error||'')+'</p><div class="owned-dialog-actions"><button type="button" data-owned-dialog-cancel>Cancel</button><button type="button" data-note-dialog-discard>Discard changes</button>'+(note.file?'<button type="button" data-note-dialog-save-copy>Save as…</button>':'')+'<button type="submit">Save</button></div>';
    const parent=dialog.directory.slice(0,dialog.directory.lastIndexOf('/'))||'/';
    return header+'<p>Browser-local '+(opening?'Markdown and text files.':'Markdown (.md) or plain text (.txt).')+'</p><label>Folder<input data-note-dialog-directory aria-label="Folder path" value="'+escapeHtml(dialog.directory)+'" autocomplete="off"></label><div class="owned-folder-actions"><button type="button" data-note-dialog-go>Go</button><button type="button" data-note-dialog-folder="'+escapeHtml(parent)+'"'+(!allowedFolder(parent)?' disabled':'')+'>Parent folder</button><button type="button" data-note-dialog-folder="'+escapeHtml(workspaceProfiles[activeWorkspace].home)+'">Workspace Home</button></div>'+(folders.length?'<nav class="owned-folder-list" aria-label="Folders">'+folders.map(file=>'<button type="button" data-note-dialog-folder="'+escapeHtml(full(file))+'">'+icon('i-folder')+escapeHtml(file.name)+'</button>').join('')+'</nav>':'')+(opening?'<label>Text files<select size="6" data-note-dialog-file aria-label="Text files">'+files.map(file=>'<option value="'+escapeHtml(full(file))+'"'+(dialog.selected===full(file)?' selected':'')+'>'+escapeHtml(file.name)+'</option>').join('')+'</select></label>'+(!files.length?'<p>No editable text files in this folder.</p>':''):'<label>File name<input data-owned-dialog-filename aria-label="File name" maxlength="100" required value="'+escapeHtml(dialog.filename)+'"></label>')+'<p class="owned-dialog-error" role="status">'+escapeHtml(dialog.error||'')+'</p>'+(dialog.confirm?'<p><b>'+escapeHtml(dialog.confirm.path)+'</b> already exists. Replace it only if you want to change that file.</p><div class="owned-dialog-actions"><button type="button" data-note-dialog-keep-both>Keep both</button><button type="button" data-note-dialog-replace>Replace existing file</button></div>':'')+'<div class="owned-dialog-actions"><button type="button" data-owned-dialog-cancel>Cancel</button><button type="submit"'+(opening&&!dialog.selected?' disabled':'')+'>'+(opening?'Open':'Save')+'</button></div>';
  }
  function render(id) {
    const frame=frameFor(id);
    if(!frame || frame.dataset.appReadyWorkspace!==activeWorkspace)return;
    const dialog=appState[id]==='closed'?null:state(id);
    const noteDialog=dialog?.kind?.startsWith('note-');
    const choices=dialog&&!noteDialog?resolve(id).target.groups:[],signature=JSON.stringify([choices,dialog?.error,dialog?.confirm,dialog?.directory,dialog?.selected]);
    const previous=rendered.get(frame);
    if(previous?.dialog===dialog && previous?.workspace===activeWorkspace && previous?.directory===dialog?.directory && previous?.destinations===signature && (!dialog || frame.querySelector('[data-owned-dialog]')))return;
    frame.querySelector('[data-owned-dialog]')?.remove();
    for(const child of frame.querySelectorAll(':scope > [data-owned-dialog-inert]')){child.inert=child.dataset.ownedDialogInert==='true';delete child.dataset.ownedDialogInert;}
    rendered.set(frame,{dialog,workspace:activeWorkspace,directory:dialog?.directory,destinations:signature});
    if(!dialog)return;
    if(noteDialog&&dialog.workspace!==activeWorkspace){dialog.error='This dialog belongs to another Workspace. Cancel and open it here again.';}
    const layer=document.createElement('div');layer.className='owned-dialog-layer';layer.dataset.ownedDialog=id;
    layer.innerHTML=noteDialog?'<form class="owned-app-dialog owned-note-dialog" role="dialog" aria-modal="false" aria-label="'+escapeHtml(dialog.title+' · Note Editor')+'" data-owned-dialog-form>'+(dialog.workspace===activeWorkspace?noteDialogMarkup(id,dialog):'<p>'+escapeHtml(dialog.error)+'</p><button type="button" data-owned-dialog-cancel>Cancel</button>')+'</form>':'<form class="owned-app-dialog" role="dialog" aria-modal="false" aria-label="'+escapeHtml(dialog.title+' · '+appInfo[id].label)+'" data-owned-dialog-form>'
      + '<div class="owned-dialog-heading">'+appArt(id,'app-art-compact')+'<div><small>Dialog · '+escapeHtml(appInfo[id].label)+'</small><b>'+escapeHtml(dialog.title)+'</b></div></div>'
      + '<label><span>File name</span><input data-owned-dialog-filename aria-label="File name" maxlength="100" required value="'+escapeHtml(dialog.filename)+'"></label>'
      + '<label class="owned-dialog-destination"><span>Save in</span><select data-owned-dialog-location aria-label="Save location">'+choices.map(group=>'<optgroup label="'+escapeHtml(group.label)+'">'+group.items.map(item=>'<option value="'+item.key+'"'+(item.key===dialog.saveLocation?' selected':'')+'>'+escapeHtml(item.label)+'</option>').join('')+'</optgroup>').join('')+'</select><b>'+escapeHtml(dialog.directory)+'</b><small>This file only · your download preference stays the same.</small></label>'
      + '<p>Park '+escapeHtml(appInfo[id].label)+' to keep this dialog with its window.</p>'
      + '<div class="owned-dialog-actions"><button type="button" data-owned-dialog-cancel>Cancel</button><button type="submit">Save</button></div></form>';
    for(const child of frame.children)if(!child.matches('.app-titlebar')){child.dataset.ownedDialogInert=String(child.inert);child.inert=true;}
    frame.append(layer);prepareControlSemantics(layer);
  }
  function renderAll() {
    for(const id of Object.keys(appInfo))render(id);
  }
  function prepare(id) {
    const frame=frameFor(id);
    if(!frame || (appInfo[id]?.base || id)!=='browser')return;
    const menu=frame.querySelector('.firefox-menu > div');
    if(menu && !menu.querySelector('[data-app-action="browser-save-page"]')){
      const button=document.createElement('button');button.type='button';button.dataset.appAction='browser-save-page';button.className='firefox-save-page';button.textContent='Save page as…';button.title='Save page as… · Ctrl+S';
      menu.querySelector('small')?.before(button);prepareControlSemantics(button);
    }
  }
  function openSave(id) {
    if(appState[id]!=='open')return;
    const model=appWindowModel(id);
    model.ownedDialog ||= savePage(SpatialAppTools.current(model.navigation),downloadContext(id));
    resolve(id);
    const menu=frameFor(id).querySelector('.firefox-menu');if(menu)menu.open=false;
    render(id);saveAppWindows();focusDialog(id);
  }
  function dismiss(id, focus=true) {
    delete appWindowModel(id).ownedDialog;render(id);saveAppWindows();renderMiniApps();
    if(focus && appState[id]==='open' && !frameFor(id).hidden)frameFor(id).querySelector(isNote(id)?'.notes-layout textarea':'.browser-toolbar input')?.focus({preventScroll:true});
  }
  const originalHydrate=hydrateAppWindow;
  hydrateAppWindow=function(id,...args){originalHydrate(id,...args);prepare(id);render(id);};
  const originalSync=syncApps;
  syncApps=function(...args){originalSync(...args);renderAll();};
  const originalOpen=openApp;
  openApp=function(id,...args){const result=originalOpen(id,...args);if(appInfo[id]){render(id);focusDialog(id);}return result;};
  const originalClose=closeApp;
  closeApp=function(id,...args){if(isNote(id)&&!args[0]?.force&&root.SpatialNoteFiles?.needsSave(id)){const pending=root.SpatialNoteFiles.pending(id);appWindowModel(id).active=pending.id;renderNotes(id);if(state(id)?.kind!=='note-close')openNoteDialog(id,'note-close');if(appState[id]!=='open')openApp(id);return false;}if(appInfo[id]){delete appWindowModel(id).ownedDialog;rendered.delete(frameFor(id));}const result=originalClose(id,...args);render(id);saveAppWindows(false);return result;};
  const originalAction=performAppAction;
  performAppAction=function(id,action,...args){if(action==='browser-save-page'){openSave(id);return;}if(isNote(id)&&['note-open','note-save','note-save-as'].includes(action)){if(state(id))return;if(action==='note-save'&&SpatialAppTools.activeNote(appWindowModel(id)).file){root.SpatialNoteFiles.save(id);updateNoteStatus(id);saveAppWindows();}else openNoteDialog(id,action==='note-open'?'note-open':'note-save');return;}if(state(id))return;return originalAction(id,action,...args);};
  const originalMini=miniMarkup;
  miniMarkup=function(id){return parkedMarkup(originalMini(id),id,appInfo[id].label,state(id),escapeHtml);};
  function reportNoteError(id,error){const dialog=state(id);if(dialog){dialog.error=error.message||'The document could not be saved. Your draft is kept.';rendered.delete(frameFor(id));render(id);saveAppWindows();focusDialog(id);}}
  function finishNoteSave(id,collision='cancel'){
    const dialog=state(id),note=noteCurrent(id,dialog),backend=root.SpatialDesktopFiles;
    if(dialog.kind==='note-open'){
      const file=backend?.read?.(dialog.selected,{workspace:activeWorkspace});if(!file||!editableName(file.name))throw Error('Choose an available text file.');
      root.SpatialNoteFiles.open(id,file);dismiss(id);return;
    }
    if(dialog.kind==='note-close'){
      if(note.file){if(!root.SpatialNoteFiles.save(id)){updateNoteStatus(id);throw Error(note.fileError||'Saving failed. Choose Save as to keep a copy.');}dismiss(id,false);closeApp(id);return;}
      openNoteDialog(id,'note-save',true);return;
    }
    const directory=folderPath(dialog.directory),name=filename(dialog.filename);
    if(!name||!editableName(name))throw Error('Use a file name ending in .md, .markdown or .txt.');
    const path=directory.replace(/\/$/,'')+'/'+name,existing=backend?.read?.(path,{workspace:activeWorkspace});
    const same=existing&&note.file?.itemId===existing.itemId&&note.file.workspace===activeWorkspace;
    if(existing&&collision==='cancel'&&(!same||existing.content!==note.fileText)){dialog.confirm={path,itemId:existing.itemId,revision:existing.revision,content:existing.content};dialog.error='Choose Replace existing file or Keep both.';rendered.delete(frameFor(id));render(id);return;}
    let options={collision};
    if(same&&collision!=='keep-both')options={...options,itemId:existing.itemId,expectedContent:note.fileText};
    if(collision==='replace'){if(!dialog.confirm||dialog.confirm.path!==path)throw Error('Review the destination again before replacing a file.');options={...options,itemId:dialog.confirm.itemId,expectedContent:dialog.confirm.content,expectedRevision:dialog.confirm.revision};}
    root.SpatialNoteFiles.saveAs(id,path,options);const closeAfter=dialog.closeAfter;dismiss(id,!closeAfter);refreshDownloadUi();if(closeAfter)closeApp(id);
  }
  root.SpatialOwnedDialogs.openNote=openNoteDialog;
  document.addEventListener('click',event=>{
    const restore=event.target.closest('[data-owned-dialog-restore]');
    if(restore){event.preventDefault();event.stopImmediatePropagation();openApp(restore.dataset.ownedDialogRestore);return;}
    const layer=event.target.closest('[data-owned-dialog]');
    if(layer&&state(layer.dataset.ownedDialog)?.kind?.startsWith('note-')){
      const id=layer.dataset.ownedDialog,dialog=state(id);
      try{
        if(event.target.closest('[data-note-dialog-discard]')){event.preventDefault();event.stopImmediatePropagation();noteCurrent(id);root.SpatialNoteFiles.discard(id);dismiss(id,false);closeApp(id);return;}
        if(event.target.closest('[data-note-dialog-save-copy]')){event.preventDefault();event.stopImmediatePropagation();noteCurrent(id);openNoteDialog(id,'note-save',true);return;}
        const folder=event.target.closest('[data-note-dialog-folder]'),go=event.target.closest('[data-note-dialog-go]');
        if(folder||go){event.preventDefault();event.stopImmediatePropagation();noteCurrent(id);dialog.directory=folderPath(folder?folder.dataset.noteDialogFolder:layer.querySelector('[data-note-dialog-directory]').value);dialog.confirm=null;dialog.error='';rendered.delete(frameFor(id));render(id);saveAppWindows();return;}
        if(event.target.closest('[data-note-dialog-replace],[data-note-dialog-keep-both]')){event.preventDefault();event.stopImmediatePropagation();finishNoteSave(id,event.target.closest('[data-note-dialog-replace]')?'replace':'keep-both');return;}
      }catch(error){reportNoteError(id,error);return;}
    }
    if(layer && event.target.closest('[data-owned-dialog-cancel]')){event.preventDefault();event.stopImmediatePropagation();dismiss(layer.dataset.ownedDialog);}
  },true);
  document.addEventListener('input',event=>{
    const layer=event.target.closest('[data-owned-dialog]');
    if(layer&&state(layer.dataset.ownedDialog)?.kind?.startsWith('note-')&&event.target.matches('[data-note-dialog-directory]')){state(layer.dataset.ownedDialog).directory=event.target.value;state(layer.dataset.ownedDialog).confirm=null;saveAppWindows(false);return;}
    if(layer && event.target.matches('[data-owned-dialog-filename]')){event.target.setCustomValidity('');state(layer.dataset.ownedDialog).filename=event.target.value;state(layer.dataset.ownedDialog).confirm=null;saveAppWindows(false);}
  },true);
  document.addEventListener('change',event=>{
    const layer=event.target.closest('[data-owned-dialog]');if(!layer)return;
    if(state(layer.dataset.ownedDialog)?.kind?.startsWith('note-')&&event.target.matches('[data-note-dialog-file]')){state(layer.dataset.ownedDialog).selected=event.target.value;saveAppWindows(false);return;}
    if(!event.target.matches('[data-owned-dialog-location]'))return;
    const id=layer.dataset.ownedDialog;state(id).saveLocation=event.target.value;resolve(id);rendered.delete(frameFor(id));render(id);saveAppWindows(false);
    frameFor(id).querySelector('[data-owned-dialog-location]')?.focus({preventScroll:true});
  },true);
  document.addEventListener('submit',event=>{
    const form=event.target.closest('[data-owned-dialog-form]');if(!form)return;
    event.preventDefault();event.stopImmediatePropagation();
    const id=form.closest('[data-owned-dialog]').dataset.ownedDialog,dialog=state(id),name=filename(dialog.filename);
    if(dialog.kind?.startsWith('note-')){try{finishNoteSave(id);}catch(error){reportNoteError(id,error);}return;}
    if(!name){form.querySelector('input').setCustomValidity('Enter a file name.');form.querySelector('input').reportValidity();return;}
    // Resolve against this window's ownership again, including after a transfer.
    const {context,target}=resolve(id);
    if(target.project && target.directory===projectSpaces[target.project].root.replace(/\/+$/,'')+'/Downloads')ensureProjectDownloads(target.project);
    const safeName=availableName(name,appFileRows(id,target.directory).map(row=>row[0]));
    const file=workspaceDownloads.add(target.directory,safeName,{...context,directory:target.directory,project:target.project,source:dialog.source,content:dialog.content});
    persistDownloads();dismiss(id);refreshDownloadUi();captureWorkspaceContent();queueDesktopStateBroadcast(0);
    showToast('Demo file saved · '+file.path,{duration:3200});
  },true);
  document.addEventListener('keydown',event=>{
    const frame=event.target.closest('[data-app-frame]');if(!frame)return;
    const id=frame.dataset.appFrame;
    if(isNote(id)&&event.ctrlKey&&['s','o'].includes(event.key.toLowerCase())){event.preventDefault();event.stopImmediatePropagation();if(!state(id))performAppAction(id,event.key.toLowerCase()==='o'?'note-open':event.shiftKey?'note-save-as':'note-save');return;}
    if((appInfo[id]?.base || id)==='browser' && event.ctrlKey && event.key.toLowerCase()==='s'){
      event.preventDefault();event.stopImmediatePropagation();openSave(id);return;
    }
    if(!state(id))return;
    if(event.key==='Escape') {event.preventDefault();event.stopImmediatePropagation();dismiss(id);}
    if(event.key==='Tab'){
      const controls=[...frame.querySelectorAll('.app-titlebar button,.app-titlebar input,[data-owned-dialog] input,[data-owned-dialog] select,[data-owned-dialog] button')].filter(node=>!node.disabled && !node.hidden);
      const at=controls.indexOf(document.activeElement),next=event.shiftKey?at-1:at+1;
      if(at<0 || next<0 || next>=controls.length){event.preventDefault();event.stopImmediatePropagation();controls[event.shiftKey?controls.length-1:0]?.focus();}
    }
  },true);
  root.addEventListener?.('spatial-files-change',event=>{if(event.detail?.workspace&&event.detail.workspace!==activeWorkspace)return;for(const id of Object.keys(appInfo))if(isNote(id)&&appState[id]!=='closed'&&frameFor(id)?.dataset.appReadyWorkspace===activeWorkspace&&frameFor(id).querySelector('.note-editor')){renderNotes(id);if(state(id)){rendered.delete(frameFor(id));render(id);}}});
  for(const id of Object.keys(appInfo)){prepare(id);render(id);}
  renderMiniApps();
})(typeof globalThis!=='undefined'?globalThis:this);
