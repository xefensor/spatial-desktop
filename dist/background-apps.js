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
  function entries(snapshot,states,current,currentStates,info,profiles){
    const result=[];
    for(const [workspace,models] of Object.entries(snapshot)){
      if(!profiles[workspace])continue;
      const local=workspace===current?currentStates:states[workspace]||{};
      for(const [id,model] of Object.entries(models)){
        if(!info[id] || !model.background || (local[id]||'closed')!=='closed')continue;
        const activity=reason(info[id].base||id,model,local.game==='open');
        if(activity)result.push({workspace,id,activity,model});
      }
    }
    return result;
  }
  const api={reason,advance,stop,entries};
  if(typeof module!=='undefined' && module.exports){module.exports=api;return;}
  const row=document.getElementById('backgroundApps');
  if(!row)return;
  let timer=0;
  const kind=id=>appInfo[id]?.base || id;
  const activity=id=>reason(kind(id),appWindowModel(id),activeWorkspace==='gaming' && appState.game==='open');
  const running=id=>Boolean(appInfo[id] && appState[id]==='closed' && appWindowModel(id).background);
  const allEntries=()=>entries(appWindowStore.snapshot(),workspaceAppStates,activeWorkspace,appState,appInfo,workspaceProfiles);
  root.SpatialBackgroundApps={...api,running,players:()=>allEntries().filter(entry=>entry.workspace!==activeWorkspace && kind(entry.id)==='elisa').map(entry=>appWindowStore.get(entry.workspace,entry.id))};
  function normalize() {
    for(const [workspace,models] of Object.entries(appWindowStore.snapshot())){
      const states=workspace===activeWorkspace?appState:workspaceAppStates[workspace]||{};
      for(const [id,model] of Object.entries(models))if(model.background && (states[id]||'closed')==='closed' && !reason(kind(id),model,states.game==='open'))appWindowStore.get(workspace,id).background=false;
    }
  }
  function prepareCloseButtons() {
    for(const button of document.querySelectorAll('[data-window-action="close"],[data-mini-close]')){
      button.title='Left click: close window; needed activity keeps running in the background. Middle click: force quit and stop its activity.';
    }
  }
  function prepareSteam() {
    const frame=frameFor('steam');
    if(!frame || activeWorkspace!=='gaming' || globalThis.SpatialGuide?.model.active())return;
    const summary=frame.querySelector('.steam-library-summary');if(!summary)return;
    let panel=summary.querySelector('[data-background-download]');
    if(!panel){panel=document.createElement('section');panel.className='steam-demo-download';panel.dataset.backgroundDownload='';summary.append(panel);}
    const download=appWindowModel('steam').download;
    const received=Math.floor(download?.received || 0),total=download?.total || 400,finished=received>=total;
    const status=download?.active?'Downloading':finished?'Update ready':received?'Paused':'Demo update';
    const label=download?.active?'Pause download':finished?'Download again':received?'Resume download':'Download demo update';
    const key=JSON.stringify([status,received,total,label]);if(panel.dataset.rendered===key)return;panel.dataset.rendered=key;
    panel.innerHTML='<div><b>'+status+'</b><small>Local simulation · '+received+' / '+total+' MB</small></div>'
      + '<progress max="'+total+'" value="'+received+'" aria-label="Demo update download"></progress>'
      + '<button type="button" class="steam-button" data-background-download-toggle>'+label+'</button>';
    prepareControlSemantics(panel);
  }
  function render() {
    normalize();
    const items=allEntries(),keys=items.map(({workspace,id})=>workspace+':'+id);
    row.hidden=!items.length;
    const key=JSON.stringify(items.map(({workspace,id,activity})=>[workspace,id,appInfo[id].label,activity]));
    if(row.dataset.rendered!==key){
      row.dataset.rendered=key;
      // Retain button identity and focus as progress changes.
      for(const button of [...row.children])if(!keys.includes(button.dataset.backgroundWorkspace+':'+button.dataset.backgroundOpen))button.remove();
      for(const {workspace,id,activity,model} of items){
        let button=[...row.children].find(node=>node.dataset.backgroundOpen===id && node.dataset.backgroundWorkspace===workspace);
        if(!button){button=document.createElement('button');button.type='button';button.className='background-app-icon';button.dataset.backgroundOpen=id;button.dataset.backgroundWorkspace=workspace;button.innerHTML=appArt(id)+'<span class="background-workspace-icon" aria-hidden="true">'+icon(workspaceProfiles[workspace].icon)+'</span><i aria-hidden="true"></i>';row.append(button);}
        const label=appInfo[id].label+' · Background · '+workspaceProfiles[workspace].label+' · '+activity+' · Click to open in its workspace · Middle click to force quit';
        button.title=label;button.setAttribute('aria-label',label);button.style.setProperty('--background-accent',appInfo[id].primary);
        button.style.setProperty('--background-workspace-accent',workspaceProfiles[workspace].accent);
        button.style.setProperty('--background-progress',kind(id)==='steam' && model.download?.active?Math.floor(model.download.received/model.download.total*100)+'%':'100%');
      }
    }
    prepareCloseButtons();prepareSteam();schedule();
  }
  function activeDownloads() {
    const result=[];
    for(const [workspace,models] of Object.entries(appWindowStore.snapshot()))for(const [id,model] of Object.entries(models))if(model.download?.active)result.push({workspace,id});
    return result;
  }
  function schedule() {
    if(timer || !activeDownloads().length)return;
    timer=setTimeout(()=>{
      timer=0;let changed=false;
      for(const {workspace,id} of activeDownloads())changed=advance(appWindowStore.get(workspace,id).download,Date.now()) || changed;
      if(changed){saveAppWindows(false);render();}
      schedule();
    },1000);
  }
  const originalSave=saveAppWindows;
  saveAppWindows=function(...args){normalize();originalSave(...args);};
  const originalClose=closeApp;
  closeApp=function(id,{force=false}={}) {
    if(!appInfo[id])return;
    const model=appWindowModel(id),wasBackground=running(id),needed=!force && activity(id);
    if(needed)model.background=true;else stop(model);
    const result=originalClose(id);
    saveAppWindows();render();
    if(wasBackground)globalThis.SpatialTimelineDesktop?.record('app.close',{app:id,title:appInfo[id].label,detail:force?'Force quit':'Activity finished'});
    if(needed)showToast(appInfo[id].label+' is running in the background · '+needed);
    else if(force)showToast(appInfo[id].label+' force quit · background activity stopped');
    return result;
  };
  const originalOpen=openApp;
  openApp=function(id,...args){const result=originalOpen(id,...args);if(appInfo[id] && appState[id]==='open'){appWindowModel(id).background=false;saveAppWindows(false);}render();return result;};
  const originalSync=syncApps;
  syncApps=function(...args){originalSync(...args);render();};
  const originalMini=renderMiniApps;
  renderMiniApps=function(...args){originalMini(...args);render();};
  const originalMusic=renderAllAppMusic;
  renderAllAppMusic=function(...args){originalMusic(...args);render();};
  const originalHydrate=hydrateAppWindow;
  hydrateAppWindow=function(id,...args){originalHydrate(id,...args);prepareCloseButtons();if(id==='steam')prepareSteam();};
  const originalDescriptor=contextMenuDescriptor;
  contextMenuDescriptor=function(target,...args){const icon=target.closest?.('[data-background-open]');return icon?{kind:'app',name:icon.dataset.backgroundOpen,title:appInfo[icon.dataset.backgroundOpen].label,background:true,backgroundWorkspace:icon.dataset.backgroundWorkspace}:originalDescriptor(target,...args);};
  const originalEntries=contextMenuEntries;
  contextMenuEntries=function(context){
    if(context.kind!=='app')return originalEntries(context);
    if(context.background)return [{action:'app-open',icon:'i-right',label:'Open window'},{separator:true},{action:'app-force-quit',icon:'i-close',label:'Force quit',danger:true}];
    const entries=originalEntries(context).map(entry=>entry.action==='app-close'?{...entry,label:'Close window',shortcut:'Left click ×'}:entry);
    if(appState[context.name]!=='closed')entries.push({action:'app-force-quit',icon:'i-close',label:'Force quit',shortcut:'Middle click ×',danger:true});
    return entries;
  };
  function openBackground(workspace,id){
    if(!workspaceProfiles[workspace] || !appInfo[id])return;
    if(workspace===activeWorkspace){openApp(id);return;}
    renderWorkspace(workspace,false);
    const owner=desktopPages.columnOf(workspace,id);
    if(owner!=='workspace'&&!openProjectNames().includes(owner))activateProject(owner,false);else changeDesktopColumn(owner,false);
    const finish=()=>{if(activeWorkspace!==workspace)return;if(desktopPageAnimating){setTimeout(finish,60);return;}openApp(id);};finish();
  }
  function forceBackground(workspace,id){
    if(workspace===activeWorkspace){closeApp(id,{force:true});return;}
    const entry=allEntries().find(item=>item.workspace===workspace && item.id===id);if(!entry)return;
    stop(appWindowStore.get(workspace,id));saveAppWindows();render();showToast(appInfo[id].label+' force quit · '+workspaceProfiles[workspace].label);
  }
  const originalAction=executeContextAction;
  executeContextAction=function(action){
    if(contextMenuState?.background){if(action==='app-open'){openBackground(contextMenuState.backgroundWorkspace,contextMenuState.name);return;}if(action==='app-force-quit'){forceBackground(contextMenuState.backgroundWorkspace,contextMenuState.name);return;}}
    if(action==='app-force-quit'){closeApp(contextMenuState.name,{force:true});return;}return originalAction(action);
  };
  document.addEventListener('click',event=>{
    const icon=event.target.closest('[data-background-open]');if(icon){event.preventDefault();event.stopImmediatePropagation();openBackground(icon.dataset.backgroundWorkspace,icon.dataset.backgroundOpen);return;}
    if(event.target.closest('[data-background-download-toggle]')){
      event.preventDefault();event.stopImmediatePropagation();
      const model=appWindowModel('steam');
      if(!model.download || model.download.received>=model.download.total)model.download={received:0,total:400,updated:Date.now(),active:false};
      advance(model.download,Date.now());model.download.active=!model.download.active;model.download.updated=Date.now();
      saveAppWindows();render();
    }
  },true);
  // Suppress browser autoscroll without closing until the matching release.
  document.addEventListener('pointerdown',event=>{if(event.button===1 && event.target.closest('[data-window-action="close"],[data-mini-close],[data-background-open]'))event.preventDefault();},true);
  document.addEventListener('auxclick',event=>{
    if(event.button!==1)return;
    const button=event.target.closest('[data-window-action="close"],[data-mini-close],[data-background-open]');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(button.dataset.backgroundOpen){forceBackground(button.dataset.backgroundWorkspace,button.dataset.backgroundOpen);return;}
    const id=button.dataset.miniClose || button.closest('[data-app-frame]').dataset.appFrame;
    closeApp(id,{force:true});
  },true);
  // Catch up a saved simulated download without replaying or duplicating work.
  for(const {workspace,id} of activeDownloads())advance(appWindowStore.get(workspace,id).download,Date.now());
  render();
})(typeof globalThis!=='undefined'?globalThis:this);
