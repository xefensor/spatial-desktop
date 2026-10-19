/* Window-local audio state is part of the existing per-Workspace app model. */
(function(root){
  'use strict';
  const clamp=value=>Math.max(0,Math.min(100,Math.round(value)));
  function read(model={}){
    const volume=Number.isFinite(model.volume)?clamp(model.volume):100;
    const restore=Number.isFinite(model.audioRestoreVolume)&&model.audioRestoreVolume>0?clamp(model.audioRestoreVolume):volume||100;
    return {volume,muted:model.muted===true,silent:model.muted===true||volume===0,restore};
  }
  function setVolume(model,value){
    if(!Number.isFinite(value))return read(model);
    const previous=read(model);model.volume=clamp(value);model.muted=false;
    model.audioRestoreVolume=model.volume||previous.restore;return read(model);
  }
  function toggleMute(model){
    const previous=read(model);
    if(previous.volume===0){model.volume=previous.restore;model.muted=false;}
    else{model.volume=previous.volume;model.muted=!previous.muted;}
    model.audioRestoreVolume=previous.restore;return read(model);
  }
  function effective(state,master={}){return {...state,volume:state.volume*(Number.isFinite(master.volume)?master.volume:100)/100,muted:state.muted||master.outputMuted===true};}
  function apply(media,state,master={}){
    state=effective(state,master);
    const volume=state.volume/100;
    if(media.volume!==volume)media.volume=volume;
    if(media.muted!==state.muted)media.muted=state.muted;
  }
  const api={read,setVolume,toggleMute,apply,effective};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  const bound=new WeakMap();let scheduled=0;
  function render(id){
    if(!appWindowsReady||appWindowsHydrating)return;
    const frame=frameFor(id),header=frame?.querySelector('.app-titlebar');if(!header)return;
    let control=header.querySelector('.window-audio');
    if(appInfo[id]?.audio===false){control?.remove();return;}
    if(!control){
      control=document.createElement('div');control.className='window-audio';control.setAttribute('role','group');
      control.innerHTML='<button type="button" class="surface-key window-key window-audio-mute" data-window-mute aria-pressed="false"></button><input type="range" min="0" max="100" step="1" data-window-volume><output aria-hidden="true"></output>';
      const actions=header.querySelector('.window-actions');if(actions)actions.before(control);else header.append(control);
      control.addEventListener('pointerdown',event=>{event.stopPropagation();if(appState[id]==='open'&&isLocalApp(id))bringToFront(id);});
      control.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();});
      control.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();});
      prepareMaterialSurfaces(control);prepareControlSemantics(control);
    }
    const state=read(appWindowModel(id)),label=appInfo[id].label,button=control.querySelector('button'),range=control.querySelector('input'),output=control.querySelector('output');
    control.setAttribute('aria-label','Audio for '+label);control.title='Window volume · '+(state.silent?'Muted · ':'')+state.volume+'%';
    const glyph=state.silent?'i-volume-off':'i-volume';
    if(button.dataset.audioGlyph!==glyph){button.dataset.audioGlyph=glyph;button.innerHTML=icon(glyph);}
    button.setAttribute('aria-label',(state.silent?'Unmute ':'Mute ')+label);button.title=button.getAttribute('aria-label');button.setAttribute('aria-pressed',String(state.silent));
    range.setAttribute('aria-label','Volume for '+label);range.setAttribute('aria-valuetext',state.volume+' percent'+(state.silent?', muted':''));
    if(Number(range.value)!==state.volume)range.value=state.volume;
    range.style.setProperty('--window-volume-fill',state.volume+'%');
    const value=state.volume+'%';if(output.textContent!==value)output.textContent=value;
    control.classList.toggle('is-muted',state.silent);
    for(const media of frame.querySelectorAll('audio,video')){
      if(media.closest('.parked-preview-window,.desktop-map-snapshot'))continue;
      bound.set(media,{workspace:activeWorkspace,id});apply(media,state,root.SpatialDesktopSystem?.audioState());
    }
  }
  function renderAll(){for(const id of Object.keys(appInfo))render(id);}
  function schedule(){if(!scheduled)scheduled=requestAnimationFrame(()=>{scheduled=0;renderAll();});}
  function update(id,change){
    if(!appInfo[id]||!frameFor(id)||appWindowsHydrating)return;
    change(appWindowModel(id));
    if((appInfo[id].base||id)==='elisa')renderAppMusic(id);
    render(id);saveAppWindows();
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-window-mute]'),frame=button?.closest('[data-app-frame]');if(!frame)return;
    event.preventDefault();event.stopImmediatePropagation();update(frame.dataset.appFrame,toggleMute);
  },true);
  function input(event){
    const range=event.target.closest('[data-window-volume]'),frame=range?.closest('[data-app-frame]');if(!frame)return;
    // Keep this shell field out of browser navigation and document editors.
    event.stopImmediatePropagation();update(frame.dataset.appFrame,model=>setVolume(model,Number(range.value)));
  }
  document.addEventListener('input',input,true);document.addEventListener('change',input,true);
  document.addEventListener('volumechange',event=>{
    const media=event.target,owner=bound.get(media);if(!owner||owner.workspace!==activeWorkspace||!media.isConnected)return;
    const frame=media.closest('[data-app-frame]');if(frame!==frameFor(owner.id))return;
    const state=read(appWindowModel(owner.id)),master=root.SpatialDesktopSystem?.audioState()||{},expected=effective(state,master);
    if(Math.abs(expected.volume-media.volume*100)<.01&&expected.muted===media.muted)return;
    if(master.outputMuted||master.volume===0){render(owner.id);return;}
    const volume=clamp(media.volume*100/(Number.isFinite(master.volume)?master.volume/100:1));
    update(owner.id,model=>{setVolume(model,volume);model.muted=media.muted;});
  },true);
  const originalSave=saveAppWindows;saveAppWindows=function(...args){renderAll();return originalSave(...args);};
  const originalMusic=renderAppMusic;renderAppMusic=function(id,...args){const result=originalMusic(id,...args);render(id);return result;};
  const originalRestore=restoreWorkspaceContent;restoreWorkspaceContent=function(...args){const result=originalRestore(...args);renderAll();return result;};
  const originalInstall=installInstance;installInstance=function(id,...args){const result=originalInstall(id,...args);render(id);return result;};
  new MutationObserver(schedule).observe(document.querySelector('.workspace-zone'),{subtree:true,childList:true});
  root.addEventListener?.('spatial-system-change',schedule);
  root.SpatialWindowAudio={...api,refresh:renderAll};renderAll();
})(typeof globalThis!=='undefined'?globalThis:this);
