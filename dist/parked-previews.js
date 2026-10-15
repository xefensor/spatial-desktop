/* Read-only window previews for apps without a parking-widget integration. */
(function (root) {
  'use strict';
  function usesPreview(info) { return info?.parkingWidget === false; }
  function fit(width, height, availableWidth, availableHeight) {
    const scale = Math.min(availableWidth / width, availableHeight / height, 1);
    return {scale, left:(availableWidth-width*scale)/2, top:(availableHeight-height*scale)/2};
  }
  function markup(original, id, label, escape) {
    const end = original.indexOf('</header>');
    if (end < 0) return original;
    return original.slice(0,end+9).replace('class="mini-card','class="mini-card mini-card-preview')
      + '<div class="parked-preview-viewport" data-parked-preview="'+escape(id)+'">'
      + '<button class="parked-preview-restore" data-mini-restore="'+escape(id)+'" aria-label="Restore '+escape(label)+' from window preview" title="Restore this window to interact with the app."><span>Restore window</span></button></div>'
      + '<div class="parked-preview-caption"><span>Window preview</span><small>Click to restore · drag header to place</small></div></article>';
  }
  function cloneWindow(frame) {
    const clone = frame.cloneNode(true);
    const originals = [frame,...frame.querySelectorAll('*')], copies = [clone,...clone.querySelectorAll('*')];
    originals.forEach((original,index) => {
      const copy = copies[index];
      for (const attribute of [...copy.attributes]) {
        if (attribute.name==='id' || attribute.name==='name' || attribute.name==='autofocus' || attribute.name.startsWith('on') || attribute.name.startsWith('data-')) copy.removeAttribute(attribute.name);
      }
      if ('value' in original) copy.value = original.value;
      if ('checked' in original) copy.checked = original.checked;
      if ('selectedIndex' in original) copy.selectedIndex = original.selectedIndex;
      if (original.isContentEditable) copy.contentEditable = 'false';
      if (copy.matches('audio,video')) {copy.autoplay=false;copy.muted=true;copy.removeAttribute('autoplay');}
      copy.scrollTop=original.scrollTop;copy.scrollLeft=original.scrollLeft;
    });
    clone.hidden=false;clone.inert=true;clone.setAttribute('aria-hidden','true');
    clone.dataset.appKind=frame.dataset.appKind;
    clone.classList.remove('is-fullscreen','is-maximized','is-floating','is-front','is-auto-tiling','is-dragging','is-resizing');
    clone.classList.add('parked-preview-window');
    return clone;
  }
  const api={usesPreview,fit,markup,cloneWindow};
  if(typeof module!=='undefined' && module.exports){module.exports=api;return;}
  root.SpatialParkedPreviews=api;
  let workspace=activeWorkspace, pending=0;
  const entries=new Map(), observed=new WeakSet(), dirty=new Set();
  const styleLinks=[...document.querySelectorAll('link[rel="stylesheet"]')];
  function makeHost() {
    const host=document.createElement('div');host.className='parked-preview-surface';host.inert=true;host.setAttribute('aria-hidden','true');
    const shadow=host.attachShadow({mode:'open',clonable:true});
    for(const link of styleLinks){const copy=link.cloneNode(true);copy.addEventListener('load',schedule);shadow.append(copy);}
    const style=document.createElement('style');
    style.textContent='body.parked-preview-context{display:block!important;position:relative!important;inset:0!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;background:none!important;overflow:hidden!important}.parked-preview-window{display:grid!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;margin:0!important;transform:none!important;transition:none!important;animation:none!important;opacity:1!important;visibility:visible!important;z-index:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;pointer-events:none!important}.parked-preview-window *{animation:none!important;transition:none!important;caret-color:transparent!important}';
    const context=document.createElement('body');context.className='parked-preview-context';
    shadow.append(style,context);return host;
  }
  function copyIcons(frame,shadow) {
    const sprite=document.createElementNS('http://www.w3.org/2000/svg','svg');sprite.style.display='none';
    const seen=new Set();
    function add(id) {
      if(seen.has(id))return;seen.add(id);
      const symbol=document.getElementById(id);if(!symbol)return;
      sprite.append(symbol.cloneNode(true));
      for(const use of symbol.querySelectorAll('use')){const href=use.getAttribute('href');if(href?.startsWith('#'))add(href.slice(1));}
    }
    for(const use of frame.querySelectorAll('use')){const href=use.getAttribute('href');if(href?.startsWith('#'))add(href.slice(1));}
    sprite.dataset.previewIcons='';shadow.append(sprite);
  }
  function update(id,entry) {
    const frame=frameFor(id);if(!frame)return;
    if(!observed.has(frame)) {
      observed.add(frame);
      new MutationObserver(()=>{
        dirty.add(id);
        if(appState[id]==='minimized' && desktopPages.inColumn(activeWorkspace,id))schedule();
      }).observe(frame,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['value','checked','selected','hidden','open','aria-selected','data-app-ready-workspace']});
    }
    if(frame.dataset.appReadyWorkspace!==activeWorkspace)return;
    const rect=frame.getBoundingClientRect(), geometry=windowGeometry.get(id);
    entry.width=Math.max(320,rect.width || parseFloat(frame.style.width) || geometry?.width || 960);
    entry.height=Math.max(200,rect.height || parseFloat(frame.style.height) || geometry?.height || 640);
    entry.host.style.width=entry.width+'px';entry.host.style.height=entry.height+'px';
    const shadow=entry.host.shadowRoot;
    shadow.querySelector('.parked-preview-window')?.remove();shadow.querySelector('[data-preview-icons]')?.remove();
    const clone=cloneWindow(frame),computed=getComputedStyle(frame);
    for(const property of computed)if(property.startsWith('--'))clone.style.setProperty(property,computed.getPropertyValue(property));
    copyIcons(frame,shadow);shadow.querySelector('.parked-preview-context').append(clone);dirty.delete(id);
    entry.original=frame;entry.clone=clone;
    entry.title=frame.querySelector('.app-identity small')?.textContent || appInfo[id].detail;
  }
  function place(viewport,entry) {
    const position=fit(entry.width,entry.height,viewport.clientWidth,viewport.clientHeight);
    Object.assign(entry.host.style,{left:position.left+'px',top:position.top+'px',transform:'scale('+position.scale+')'});
    if(entry.clone){
      const originals=entry.original.querySelectorAll('*'),copies=entry.clone.querySelectorAll('*');
      originals.forEach((node,index)=>{if(copies[index]){copies[index].scrollTop=node.scrollTop;copies[index].scrollLeft=node.scrollLeft;}});
    }
  }
  const resize=new ResizeObserver(records=>{
    for(const {target} of records){const entry=entries.get(target.dataset.parkedPreview);if(entry)place(target,entry);}
  });
  function refresh() {
    if(workspace!==activeWorkspace){entries.clear();dirty.clear();workspace=activeWorkspace;}
    for(const [id] of entries)if(appState[id]==='closed')entries.delete(id);
    resize.disconnect();
    for(const viewport of document.querySelectorAll('#miniStack [data-parked-preview]')) {
      const id=viewport.dataset.parkedPreview;
      let entry=entries.get(id);
      if(!entry){entry={host:makeHost(),width:960,height:640};entries.set(id,entry);dirty.add(id);}
      if(dirty.has(id))update(id,entry);
      entry.host.shadowRoot.querySelector('.parked-preview-context').dataset.theme=document.body.dataset.theme;
      if(entry.host.parentElement!==viewport)viewport.prepend(entry.host);
      const detail=viewport.closest('[data-mini-card]').querySelector('header small');if(detail)detail.textContent=entry.title || appInfo[id].detail;
      place(viewport,entry);resize.observe(viewport);
    }
  }
  function schedule() {
    if(pending || document.hidden)return;
    pending=requestAnimationFrame(()=>{pending=0;refresh();});
  }
  const originalMarkup=miniMarkup;
  miniMarkup=function(id){const original=originalMarkup(id);return usesPreview(appInfo[id])?markup(original,id,appInfo[id].label,escapeHtml):original;};
  const originalRender=renderMiniApps;
  renderMiniApps=function(...args){originalRender(...args);refresh();};
  if(document.body)new MutationObserver(()=>{for(const id of entries.keys())dirty.add(id);schedule();}).observe(document.body,{attributes:true,attributeFilter:['data-theme']});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  renderMiniApps();
})(typeof globalThis!=='undefined'?globalThis:this);
