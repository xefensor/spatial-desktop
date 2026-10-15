/* App-owned dialogs travel with their window, including its parked card. */
(function (root) {
  'use strict';
  function savePage(page, context) {
    return {kind:'save-page', title:'Save page as…', filename:(page.title || 'Page').replace(/[\\/:*?"<>|]/g,'-')+'.txt',
      directory:context.directory, project:context.project, source:page.address,
      content:[page.title,page.intro,page.detail].filter(Boolean).join('\n\n')};
  }
  function filename(value) { return String(value || '').trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-'); }
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
  const api={savePage,filename,parkedMarkup};
  if(typeof module!=='undefined' && module.exports){module.exports=api;return;}
  root.SpatialOwnedDialogs=api;
  const rendered=new WeakMap();
  const state=id=>appWindowModel(id).ownedDialog;
  function focusDialog(id) {
    const frame=frameFor(id);
    if(appState[id]==='open' && isLocalApp(id) && !frame.hidden)frame.querySelector('[data-owned-dialog] input')?.focus({preventScroll:true});
  }
  function render(id) {
    const frame=frameFor(id);
    if(!frame || frame.dataset.appReadyWorkspace!==activeWorkspace)return;
    const dialog=appState[id]==='closed'?null:state(id);
    if(dialog){const context=downloadContext(id);dialog.directory=context.directory;dialog.project=context.project;}
    const previous=rendered.get(frame);
    if(previous?.dialog===dialog && previous?.workspace===activeWorkspace && previous?.directory===dialog?.directory && (!dialog || frame.querySelector('[data-owned-dialog]')))return;
    frame.querySelector('[data-owned-dialog]')?.remove();
    for(const child of frame.querySelectorAll(':scope > [data-owned-dialog-inert]')){child.inert=child.dataset.ownedDialogInert==='true';delete child.dataset.ownedDialogInert;}
    rendered.set(frame,{dialog,workspace:activeWorkspace,directory:dialog?.directory});
    if(!dialog)return;
    const layer=document.createElement('div');layer.className='owned-dialog-layer';layer.dataset.ownedDialog=id;
    layer.innerHTML='<form class="owned-app-dialog" role="dialog" aria-modal="false" aria-label="'+escapeHtml(dialog.title+' · '+appInfo[id].label)+'" data-owned-dialog-form>'
      + '<div class="owned-dialog-heading">'+appArt(id,'app-art-compact')+'<div><small>Dialog · '+escapeHtml(appInfo[id].label)+'</small><b>'+escapeHtml(dialog.title)+'</b></div></div>'
      + '<label><span>File name</span><input data-owned-dialog-filename aria-label="File name" maxlength="100" required value="'+escapeHtml(dialog.filename)+'"></label>'
      + '<div class="owned-dialog-destination"><span>Save in</span><b>'+escapeHtml(dialog.directory)+'</b></div>'
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
    const menu=frameFor(id).querySelector('.firefox-menu');if(menu)menu.open=false;
    render(id);saveAppWindows();focusDialog(id);
  }
  function dismiss(id, focus=true) {
    delete appWindowModel(id).ownedDialog;render(id);saveAppWindows();renderMiniApps();
    if(focus && appState[id]==='open' && !frameFor(id).hidden)frameFor(id).querySelector('.browser-toolbar input')?.focus({preventScroll:true});
  }
  const originalHydrate=hydrateAppWindow;
  hydrateAppWindow=function(id,...args){originalHydrate(id,...args);prepare(id);render(id);};
  const originalSync=syncApps;
  syncApps=function(...args){originalSync(...args);renderAll();};
  const originalOpen=openApp;
  openApp=function(id,...args){const result=originalOpen(id,...args);if(appInfo[id]){render(id);focusDialog(id);}return result;};
  const originalClose=closeApp;
  closeApp=function(id,...args){if(appInfo[id]){delete appWindowModel(id).ownedDialog;rendered.delete(frameFor(id));}const result=originalClose(id,...args);render(id);saveAppWindows(false);return result;};
  const originalAction=performAppAction;
  performAppAction=function(id,action,...args){if(action==='browser-save-page'){openSave(id);return;}if(state(id))return;return originalAction(id,action,...args);};
  const originalMini=miniMarkup;
  miniMarkup=function(id){return parkedMarkup(originalMini(id),id,appInfo[id].label,state(id),escapeHtml);};
  document.addEventListener('click',event=>{
    const restore=event.target.closest('[data-owned-dialog-restore]');
    if(restore){event.preventDefault();event.stopImmediatePropagation();openApp(restore.dataset.ownedDialogRestore);return;}
    const layer=event.target.closest('[data-owned-dialog]');
    if(layer && event.target.closest('[data-owned-dialog-cancel]')){event.preventDefault();event.stopImmediatePropagation();dismiss(layer.dataset.ownedDialog);}
  },true);
  document.addEventListener('input',event=>{
    const layer=event.target.closest('[data-owned-dialog]');
    if(layer && event.target.matches('[data-owned-dialog-filename]')){event.target.setCustomValidity('');state(layer.dataset.ownedDialog).filename=event.target.value;saveAppWindows(false);}
  },true);
  document.addEventListener('submit',event=>{
    const form=event.target.closest('[data-owned-dialog-form]');if(!form)return;
    event.preventDefault();event.stopImmediatePropagation();
    const id=form.closest('[data-owned-dialog]').dataset.ownedDialog,dialog=state(id),name=filename(dialog.filename);
    if(!name){form.querySelector('input').setCustomValidity('Enter a file name.');form.querySelector('input').reportValidity();return;}
    const context=downloadContext(id);
    // A moved window uses its current workspace/project, just like its downloads.
    if(context.project && projectSpaces[context.project]?.downloadToProject)ensureProjectDownloads(context.project);
    const file=workspaceDownloads.add(context.directory,name,{...context,source:dialog.source,content:dialog.content});
    persistDownloads();dismiss(id);refreshDownloadUi();captureWorkspaceContent();queueDesktopStateBroadcast(0);
    showToast('Demo file saved · '+file.path,{duration:3200});
  },true);
  document.addEventListener('keydown',event=>{
    const frame=event.target.closest('[data-app-frame]');if(!frame)return;
    const id=frame.dataset.appFrame;
    if((appInfo[id]?.base || id)==='browser' && event.ctrlKey && event.key.toLowerCase()==='s'){
      event.preventDefault();event.stopImmediatePropagation();openSave(id);return;
    }
    if(!state(id))return;
    if(event.key==='Escape') {event.preventDefault();event.stopImmediatePropagation();dismiss(id);}
    if(event.key==='Tab'){
      const controls=[...frame.querySelectorAll('.app-titlebar button,[data-owned-dialog] input,[data-owned-dialog] button')].filter(node=>!node.disabled && !node.hidden);
      const at=controls.indexOf(document.activeElement),next=event.shiftKey?at-1:at+1;
      if(at<0 || next<0 || next>=controls.length){event.preventDefault();event.stopImmediatePropagation();controls[event.shiftKey?controls.length-1:0]?.focus();}
    }
  },true);
  for(const id of Object.keys(appInfo)){prepare(id);render(id);}
  renderMiniApps();
})(typeof globalThis!=='undefined'?globalThis:this);
