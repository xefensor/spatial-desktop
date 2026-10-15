/* A window can replace all of its parked content with a private restore card. */
(function (root) {
  'use strict';
  function card(id, label, artwork, slot, hasDialog, escape) {
    const key=slot===null?'':'<kbd class="mini-hotkey" aria-hidden="true">'+(slot<=10?slot%10:slot<=20?'⇧'+slot%10:slot)+'</kbd>';
    const dialog=hasDialog?'<div class="parked-owned-dialog"><span class="owned-dialog-connection" aria-hidden="true"></span>'
      + '<button type="button" class="parked-owned-dialog-restore" data-owned-dialog-restore="'+escape(id)+'" aria-label="Restore '+escape(label)+' and its dialog">'
      + '<span class="parked-dialog-heading"><span>Dialog · '+escape(label)+'</span><em>Needs input</em></span><b>Preview hidden</b><span class="parked-dialog-return">Restore app & dialog ↗</span></button></div>':'';
    return '<article class="mini-card mini-card-private'+(hasDialog?' has-owned-dialog':'')+'" data-mini-card="'+escape(id)+'"'+(hasDialog?' role="group" aria-label="'+escape(label)+' and its dialog"':'')+'>'
      + '<header title="Drag this card back into the workspace"><div>'+key+'<span class="app-badge">'+artwork+'</span><span><b>'+escape(label)+'</b><small>Preview hidden</small></span></div>'
      + '<div class="mini-actions"><button class="surface-key mini-control" data-mini-restore="'+escape(id)+'" aria-label="Unpark '+escape(label)+'">'+svg('i-max')+'</button><button class="surface-key mini-control" data-mini-close="'+escape(id)+'" aria-label="Close '+escape(label)+'">'+svg('i-close')+'</button></div></header>'
      + '<button type="button" class="private-preview-restore" data-mini-restore="'+escape(id)+'" aria-label="Restore '+escape(label)+'; preview hidden">'+artwork+'<b>Preview hidden</b><small>Click to restore · drag header to place</small></button>'+dialog+'</article>';
  }
  function svg(id){return '<svg aria-hidden="true"><use href="#'+id+'"/></svg>';}
  const api={card};
  if(typeof module!=='undefined' && module.exports){module.exports=api;return;}
  const hidden=id=>Boolean(appInfo[id] && appWindowModel(id).previewHidden);
  root.SpatialPreviewPrivacy={...api,hidden};
  const originalMini=miniMarkup;
  miniMarkup=function(id){return hidden(id)?card(id,appInfo[id].label,appArt(id,'app-art-compact'),hotbarSlotFor(id),Boolean(appWindowModel(id).ownedDialog),escapeHtml):originalMini(id);};
  const originalEntries=contextMenuEntries;
  contextMenuEntries=function(context){
    const entries=originalEntries(context);
    if(context.kind!=='app' || context.background || !['open','minimized'].includes(appState[context.name]))return entries;
    const privacy={action:'app-toggle-preview',icon:'i-image',label:hidden(context.name)?'Show preview':'Hide preview'};
    const at=entries.findIndex(entry=>entry.action==='app-close' || entry.action==='app-force-quit');
    entries.splice(at<0?entries.length:at,0,privacy);return entries;
  };
  function applyScene(scene,id) {
    if(!scene)return;
    const privatePreview=hidden(id);
    scene.dataset.peekKind=privatePreview?'private':appInfo[id]?.base || id;
    scene.dataset.previewHidden=String(privatePreview);
    const current=scene.querySelector('.private-scene-label');
    if(privatePreview && !current){const label=document.createElement('span');label.className='private-scene-label';label.textContent='Preview hidden';scene.append(label);}
    if(!privatePreview)current?.remove();
  }
  const originalMap=renderDesktopColumnMap;
  renderDesktopColumnMap=function(...args){originalMap(...args);for(const page of document.querySelectorAll('[data-fullscreen-page]'))applyScene(page.querySelector('.temporary-desktop-scene'),page.dataset.fullscreenPage);};
  const originalOverview=renderOverviewWindows;
  renderOverviewWindows=function(...args){originalOverview(...args);for(const entry of document.querySelectorAll('[data-fullscreen-card]'))applyScene(entry.querySelector('.temporary-desktop-scene'),entry.dataset.fullscreenCard);};
  const originalPeek=renderFullscreenPeek;
  renderFullscreenPeek=function(...args){
    originalPeek(...args);
    const peek=document.getElementById('fullscreenDesktopPeek'),bond=fullscreenPeekBond();if(!peek || !bond)return;
    const privatePreview=hidden(bond.name);peek.dataset.peekKind=privatePreview?'private':appInfo[bond.name].base || bond.name;
    const detail=peek.querySelector('.fullscreen-peek-copy small');if(detail)detail.textContent=privatePreview?'Preview hidden':'Created for borderless fullscreen';
  };
  const originalAction=executeContextAction;
  executeContextAction=function(action){
    if(action!=='app-toggle-preview')return originalAction(action);
    const id=contextMenuState?.name;if(!appInfo[id])return;
    appWindowModel(id).previewHidden=!hidden(id);
    saveAppWindows();renderMiniApps();renderOverviewWindows();renderFullscreenPeek();
    showToast(appInfo[id].label+(hidden(id)?' preview hidden':' preview shown'));
  };
  renderMiniApps();renderOverviewWindows();renderFullscreenPeek();
  document.body?.classList.add('preview-privacy-ready');
})(typeof globalThis!=='undefined'?globalThis:this);
