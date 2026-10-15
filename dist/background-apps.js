/* Closed windows may leave explicit app activity running, without a park card. */
(function (root) {
  'use strict';
  function reason(kind, model, gameRunning=false) {
    if(kind==='elisa' && model.playing)return 'Playing music';
    if(kind==='steam'){
      if(model.download?.active)return 'Downloading demo update · '+Math.floor(model.download.received/model.download.total*100)+'%';
      if(gameRunning)return 'Game session';
    }
    return '';
  }
  function advance(download, now) {
    if(!download?.active)return false;
    const elapsed=Math.max(0,now-download.updated)/1000;
    if(elapsed<1)return false;
    download.received=Math.min(download.total,download.received+elapsed*2);
    download.updated=now;
    if(download.received>=download.total)download.active=false;
    return true;
  }
  function stop(model) {
    model.background=false;
    if(model.kind==='elisa')model.playing=false;
    if(model.download)model.download.active=false;
  }
  const api={reason,advance,stop};
  if(typeof module!=='undefined' && module.exports){module.exports=api;return;}
  const row=document.getElementById('backgroundApps'),popup=document.getElementById('backgroundAppPopup');
  if(!row||!popup)return;
  const key='spatial-background-services-v1',clone=value=>JSON.parse(JSON.stringify(value));
  let saved={};try{saved=JSON.parse(desktopStorage.getItem(key)||'{}');}catch{}
  const services=root.SpatialBackgroundServices.create(saved),fingerprints=new Map();
  let timer=0,popupId='',origin=null,persisted='',availability='';
  const kind=id=>appInfo[id]?.base||id;
  const anyGame=()=>Object.entries(workspaceAppStates).some(([workspace,state])=>Object.entries(workspace===activeWorkspace?appState:state).some(([id,status])=>kind(id)==='game'&&status==='open'));
  function activity(service){
    if(service.kind==='elisa')return service.model.playing?'Playing music':'Music paused';
    if(service.model.download?.active)return reason('steam',service.model);
    if(service.gameSession&&anyGame())return 'Game session';
    if(service.model.download&&service.model.download.received<service.model.download.total)return 'Download paused';
    return '';
  }
  function flush(broadcast=true){
    for(const item of services.items()){const value=JSON.stringify(item.model);if(fingerprints.has(item.id)&&fingerprints.get(item.id)!==value)services.touch(item.id);fingerprints.set(item.id,value);}
    const value=JSON.stringify(services.snapshot());if(value===persisted)return;persisted=value;
    try{desktopStorage.setItem(key,value);}catch{}
    if(broadcast)queueDesktopStateBroadcast(0);
  }
  function detach(workspace,id,model,legacy=false){
    const old=root.SpatialBackgroundServices.legacyId(workspace,id),base=kind(id);
    if(!legacy||!services.known(old)){
      const serviceId=legacy?old:'service-'+crypto.randomUUID();
      services.put({id:serviceId,kind:base,label:appInfo[base]?.label||appInfo[id].label,model:clone(model),gameSession:base==='steam'&&(workspace===activeWorkspace?appState:workspaceAppStates[workspace]||{}).game==='open'});
      if(!legacy)services.remove(old);
    }
    stop(model);
  }
  function normalize(){
    for(const [workspace,models] of Object.entries(appWindowStore.snapshot()))for(const [id,model] of Object.entries(models))if(appInfo[id]&&model.background){
      const live=appWindowStore.get(workspace,id);if(reason(kind(id),model,(workspace===activeWorkspace?appState:workspaceAppStates[workspace]||{}).game==='open'))detach(workspace,id,live,true);else stop(live);
    }
    for(const service of services.items()){
      const download=service.model.download;
      if(download&&download.received>=download.total&&!download.notified&&root.SpatialAllWorkspaces){download.notified=true;root.SpatialAllWorkspaces.notify({id:'background-download:'+service.id,workspace:null,title:'Demo update ready',detail:'Steam finished its system-wide background download.',tone:'green',glyph:'i-download',quiet:true});}
      if(!activity(service))services.remove(service.id);
    }
  }
  function closePopup(focus=true){popup.hidden=true;popup.inert=true;popupId='';popup.querySelector('[data-background-popup-content]').replaceChildren();if(focus&&origin?.isConnected)origin.focus({preventScroll:true});origin=null;}
  function renderPopup(){
    if(!popupId)return;const service=services.get(popupId);if(!service){closePopup(false);return;}
    popup.querySelector('h2').textContent=service.label;popup.querySelector('[data-background-popup-status]').textContent=activity(service);
    const content=popup.querySelector('[data-background-popup-content]');
    if(content.dataset.kind!==service.kind||!content.children.length){content.dataset.kind=service.kind;content.innerHTML=service.kind==='elisa'?'<p data-background-track></p><div class="background-transport"><button type="button" data-background-control="prev">Previous</button><button type="button" data-background-control="toggle"></button><button type="button" data-background-control="next">Next</button></div>':'<progress aria-label="Background download progress"></progress><button type="button" data-background-control="toggle"></button>';prepareControlSemantics(content);}
    const toggle=content.querySelector('[data-background-control="toggle"]');
    if(service.kind==='elisa'){content.querySelector('[data-background-track]').textContent=service.model.previewHidden?'Preview hidden':service.model.tracks?.[service.model.index]?.title||'Music';toggle.textContent=service.model.playing?'Pause':'Play';}
    else{const download=service.model.download,progress=content.querySelector('progress');progress.hidden=!download;toggle.hidden=!download||download.received>=download.total;if(download){progress.max=download.total;progress.value=download.received;toggle.textContent=download.active?'Pause download':'Resume download';}}
  }
  function openPopup(id,button){
    if(popupId===id&&!popup.hidden){closePopup();return;}if(!services.get(id))return;
    closePopup(false);popupId=id;origin=button;popup.hidden=false;popup.inert=false;renderPopup();
    const rect=button.getBoundingClientRect(),width=Math.min(340,innerWidth-24);popup.style.width=width+'px';popup.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.right))+'px';popup.style.top=Math.max(12,Math.min(innerHeight-popup.offsetHeight-12,rect.top))+'px';popup.querySelector('[data-background-popup-close]').focus({preventScroll:true});
  }
  function restore(id){
    const service=services.get(id);if(!service)return;
    const model=clone(service.model),base=service.kind,name=base+'--'+(++instanceSequence);
    services.remove(id);closePopup(false);flush();
    instanceDefinitions[name]=base;installInstance(name,base);
    const target=appWindowModel(name);for(const property of Object.keys(target))delete target[property];Object.assign(target,model,{background:false});
    windowMembership[activeWorkspace]||={};windowMembership[activeWorkspace][name]=desktopPages.column(activeWorkspace)==='workspace'?null:desktopPages.column(activeWorkspace);
    openApp(name);hydrateAppWindow(name,true);saveAppWindows();saveIndependentSessions();render();return name;
  }
  function force(id){const service=services.get(id);if(!service)return;services.remove(id);flush();render();showToast(service.label+' force quit · system-wide background activity stopped');}
  function prepareSteam(){
    if(root.SpatialGuide?.model.active())return;
    for(const id of Object.keys(appInfo).filter(id=>kind(id)==='steam')){
      const frame=frameFor(id),summary=frame?.querySelector('.steam-library-summary');if(!summary)continue;
      let panel=summary.querySelector('[data-background-download]');if(!panel){panel=document.createElement('section');panel.className='steam-demo-download';panel.dataset.backgroundDownload='';summary.append(panel);}
      const download=appWindowModel(id).download,received=Math.floor(download?.received||0),total=download?.total||400,finished=received>=total,status=download?.active?'Downloading':finished?'Update ready':received?'Paused':'Demo update',label=download?.active?'Pause download':finished?'Download again':received?'Resume download':'Download demo update';
      const stamp=JSON.stringify([status,received,total,label]);if(panel.dataset.rendered===stamp)continue;panel.dataset.rendered=stamp;
      panel.innerHTML='<div><b>'+status+'</b><small>Local simulation · '+received+' / '+total+' MB</small></div><progress max="'+total+'" value="'+received+'" aria-label="Demo update download"></progress><button type="button" class="steam-button" data-background-download-toggle>'+label+'</button>';prepareControlSemantics(panel);
    }
  }
  function downloads(){return [...services.items().map(item=>item.model.download),...Object.values(appWindowStore.snapshot()).flatMap(models=>Object.values(models).map(model=>model.download))].filter(download=>download?.active);}
  function schedule(){if(timer||!downloads().length)return;timer=setTimeout(()=>{timer=0;for(const service of services.items())if(service.model.download)advance(service.model.download,Date.now());for(const [workspace,models] of Object.entries(appWindowStore.snapshot()))for(const [id,model] of Object.entries(models))if(model.download?.active)advance(appWindowStore.get(workspace,id).download,Date.now());saveAppWindows(false);render();},1000);}
  function render(){
    normalize();flush();const items=services.items();row.hidden=!items.length;
    for(const button of [...row.children])if(!services.get(button.dataset.backgroundOpen))button.remove();
    for(const service of items){
      let button=[...row.children].find(button=>button.dataset.backgroundOpen===service.id);
      if(!button){button=document.createElement('button');button.type='button';button.className='background-app-icon';button.dataset.backgroundOpen=service.id;button.innerHTML=appArt(service.kind)+'<i aria-hidden="true"></i>';row.append(button);}
      const label=service.label+' · System-wide background app · '+activity(service)+' · Click for controls · Middle click to force quit';button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',popup.id);button.style.setProperty('--background-accent',appInfo[service.kind]?.primary||'#8aa4b8');button.style.setProperty('--background-progress',service.model.download?.active?Math.floor(service.model.download.received/service.model.download.total*100)+'%':'100%');
    }
    for(const button of document.querySelectorAll('[data-window-action="close"],[data-mini-close]'))button.title='Left click: close window; needed activity keeps running system-wide. Middle click: force quit and stop its activity.';
    prepareSteam();renderPopup();schedule();const next=JSON.stringify(items.map(item=>[item.id,item.kind]));if(next!==availability){availability=next;root.SpatialSteamOverview?.syncContext();}
  }
  root.SpatialBackgroundApps={...api,running:id=>services.items().some(item=>item.kind===kind(id)),players:()=>services.items().filter(item=>item.kind==='elisa').map(item=>item.model),snapshot:()=>services.snapshot(),restore,stop:force,render};
  const originalSave=saveAppWindows;saveAppWindows=function(...args){normalize();flush();return originalSave(...args);};
  const originalClose=closeApp;closeApp=function(id,{force=false}={}){if(!appInfo[id])return;const model=appWindowModel(id),needed=!force&&reason(kind(id),model,appState.game==='open');if(needed)detach(activeWorkspace,id,model);else stop(model);const result=originalClose(id);saveAppWindows();render();if(needed)showToast(appInfo[id].label+' is running system-wide · '+needed);return result;};
  const originalOpen=openApp;openApp=function(id,...args){const service=!appInfo[id]?.base&&appState[id]==='closed'?services.items().find(item=>item.kind===id):null;if(service)return restore(service.id);const result=originalOpen(id,...args);render();return result;};
  const originalSync=syncApps;syncApps=function(...args){const result=originalSync(...args);render();return result;};
  const originalMini=renderMiniApps;renderMiniApps=function(...args){const result=originalMini(...args);render();return result;};
  const originalMusic=renderAllAppMusic;renderAllAppMusic=function(...args){const result=originalMusic(...args);render();return result;};
  const originalHydrate=hydrateAppWindow;hydrateAppWindow=function(...args){const result=originalHydrate(...args);prepareSteam();return result;};
  const originalOverview=setUniversalSearchOpen;setUniversalSearchOpen=function(...args){closePopup(false);return originalOverview(...args);};
  const originalWorkspace=renderWorkspace;renderWorkspace=function(...args){closePopup(false);return originalWorkspace(...args);};
  const originalDescriptor=contextMenuDescriptor;contextMenuDescriptor=function(target,...args){const button=target.closest?.('[data-background-open]'),service=button&&services.get(button.dataset.backgroundOpen);return service?{kind:'app',name:service.kind,title:service.label,background:true,backgroundService:service.id}:originalDescriptor(target,...args);};
  const originalEntries=contextMenuEntries;contextMenuEntries=function(context){if(context.background)return [{info:'System-wide background app'},{action:'app-open',icon:'i-settings',label:'Show controls'},{action:'background-open-window',icon:'i-right',label:'Open window here',detail:'On the current desktop'},{separator:true},{action:'app-force-quit',icon:'i-close',label:'Force quit',danger:true}];const entries=originalEntries(context).map(item=>item.action==='app-close'?{...item,label:'Close window',shortcut:'Left click ×'}:item);if(context.kind==='app'&&appState[context.name]!=='closed')entries.push({action:'app-force-quit',icon:'i-close',label:'Force quit',shortcut:'Middle click ×',danger:true});return entries;};
  const originalAction=executeContextAction;executeContextAction=function(action){const context=contextMenuState;if(context?.background){if(action==='app-open')openPopup(context.backgroundService,row.querySelector('[data-background-open="'+context.backgroundService+'"]'));if(action==='background-open-window')restore(context.backgroundService);if(action==='app-force-quit')force(context.backgroundService);return;}if(action==='app-force-quit'){closeApp(context.name,{force:true});return;}return originalAction(action);};
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-background-open]');if(button){event.preventDefault();event.stopImmediatePropagation();openPopup(button.dataset.backgroundOpen,button);return;}
    if(event.target.closest('[data-background-popup-close]'))return closePopup();
    if(event.target.closest('[data-background-popup-open]'))return restore(popupId);
    if(event.target.closest('[data-background-popup-stop]'))return force(popupId);
    const control=event.target.closest('[data-background-control]');if(control){const service=services.get(popupId);if(!service)return;const action=control.dataset.backgroundControl;if(service.kind==='elisa'){if(action==='toggle')service.model.playing=!service.model.playing;else SpatialAppTools.musicStep(service.model,action==='prev'?-1:1);}else if(service.model.download){advance(service.model.download,Date.now());service.model.download.active=!service.model.download.active;service.model.download.updated=Date.now();}flush();render();return;}
    if(event.target.closest('[data-background-download-toggle]')){const id=event.target.closest('[data-app-frame]').dataset.appFrame,model=appWindowModel(id);if(!model.download||model.download.received>=model.download.total)model.download={received:0,total:400,updated:Date.now(),active:false};advance(model.download,Date.now());model.download.active=!model.download.active;model.download.updated=Date.now();saveAppWindows();render();}
  },true);
  document.addEventListener('pointerdown',event=>{if(event.button===1&&event.target.closest('[data-window-action="close"],[data-mini-close],[data-background-open]'))event.preventDefault();if(!popup.hidden&&!popup.contains(event.target)&&!event.target.closest('[data-background-open]'))closePopup(false);},true);
  document.addEventListener('auxclick',event=>{if(event.button!==1)return;const button=event.target.closest('[data-window-action="close"],[data-mini-close],[data-background-open]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();if(button.dataset.backgroundOpen)force(button.dataset.backgroundOpen);else closeApp(button.dataset.miniClose||button.closest('[data-app-frame]').dataset.appFrame,{force:true});},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.hidden){event.preventDefault();event.stopImmediatePropagation();closePopup();}},true);
  const originalCapture=captureDesktopSyncState;captureDesktopSyncState=function(){flush(false);return {...originalCapture(),backgroundServices:services.snapshot()};};
  const originalIncoming=persistIncomingDesktopState;persistIncomingDesktopState=function(state){if(state.backgroundServices)services.merge(state.backgroundServices);const result=originalIncoming(state);render();return result;};
  root.addEventListener('storage',event=>{if(event.key===key){try{services.merge(JSON.parse(event.newValue||'{}'));render();}catch{}}});
  root.addEventListener('resize',()=>closePopup(false));root.addEventListener('blur',()=>closePopup(false));
  for(const service of services.items())if(service.model.download)advance(service.model.download,Date.now());
  render();
})(typeof globalThis!=='undefined'?globalThis:this);
