/* Persistent notification routing for native widgets and the System overview. */
(function(root){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function notificationActions(value){
    return (Array.isArray(value)?value:[]).filter(action=>action&&['open-location','undo','open-app'].includes(action.kind)&&typeof action.label==='string').slice(0,3).map((action,index)=>({id:String(action.id||action.kind+'-'+index).slice(0,80),kind:action.kind,label:action.label.slice(0,48),...(typeof action.path==='string'?{path:action.path.slice(0,1000)}:{}),...(typeof action.token==='string'?{token:action.token.slice(0,100)}:{}),...(typeof action.app==='string'?{app:action.app.slice(0,80)}:{})}));
  }
  function create(saved={}) {
    const records={},dismissed={},imported={},read={};
    let policy={doNotDisturb:false,updated:0};
    function merge(value={}) {
      if(Number(value.policy?.updated)>policy.updated)policy={doNotDisturb:Boolean(value.policy.doNotDisturb),updated:Number(value.policy.updated)};
      Object.assign(imported,value.imported||{});
      for(const [id,time] of Object.entries(value.read||{}))read[id]=Math.max(read[id]||0,Number(time)||0);
      for(const [id,time] of Object.entries(value.dismissed||{}))dismissed[id]=Math.max(dismissed[id]||0,Number(time)||0);
      for(const [id,item] of Object.entries(value.records||{})){
        if(!item || typeof item.title!=='string' || !Number.isFinite(item.time))continue;
        if(!records[id] || (item.updated||item.time)>(records[id].updated||records[id].time))records[id]=clone({...item,id});
      }
      for(const [id,item] of Object.entries(records))if(dismissed[id]>=(item.updated||item.time))delete records[id];
    }
    function list(workspace){return Object.values(records).filter(item=>item.workspace===workspace).sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id)).map(clone);}
    function add(item){
      if(!item?.id || typeof item.title!=='string' || !Number.isFinite(item.time))return null;
      const note={id:item.id,workspace:item.workspace??null,app:String(item.app||''),title:item.title.slice(0,200),detail:String(item.detail||'').slice(0,2000),tone:item.tone||'blue',glyph:item.glyph||'i-bell',time:item.time,updated:item.updated||item.time,actions:notificationActions(item.actions)};
      if(dismissed[note.id]>=note.updated)return null;records[note.id]=note;
      for(const old of list(note.workspace).slice(100)){dismissed[old.id]=note.updated;delete records[old.id];}
      return clone(note);
    }
    function dismiss(id,time=Date.now()){dismissed[id]=Math.max(time,records[id]?.updated||0,dismissed[id]||0);delete records[id];}
    function markRead(ids,time=Date.now()){
      let changed=false;
      for(const id of ids){const note=records[id];if(note && !(read[id]>=(note.updated||note.time))){read[id]=Math.max(time,note.updated||note.time);changed=true;}}
      return changed;
    }
    merge(saved);
    return {list,add,dismiss,merge,markRead,doNotDisturb:()=>policy.doNotDisturb,setDoNotDisturb:(value,time=Date.now())=>{policy={doNotDisturb:Boolean(value),updated:Math.max(time,policy.updated+1)};},unread:workspace=>list(workspace).filter(note=>!(read[note.id]>=(note.updated||note.time))).length,get:id=>records[id]?clone(records[id]):null,imported:workspace=>Boolean(imported[workspace]),markImported:workspace=>{imported[workspace]=true;},snapshot:()=>clone({records,dismissed,imported,read,policy})};
  }
  function destination(options,current,profiles){return options?.system?null:Object.hasOwn(profiles,options?.workspace||current)?options?.workspace||current:undefined;}
  function displayNotification(note,model,label){return model?.previewHidden?{title:(label||'App')+' notification',detail:'Preview hidden'}:{title:note.title,detail:note.detail};}
  function activities(models,states,workspace,current,info) {
    const result=[];
    for(const [id,model] of Object.entries(models||{})){
      const state=states[id]||'closed',label=info[id]?.label||id,privatePreview=model.previewHidden;
      if(model.ownedDialog && state!=='closed')result.push({id:'dialog:'+id,app:id,title:label,category:'Needs input',detail:privatePreview?'Preview hidden':[model.ownedDialog.title,model.ownedDialog.filename].filter(Boolean).join(' · ')});
    }
    return result;
  }
  const api={create,destination,displayNotification,activities,notificationActions};
  if(typeof module!=='undefined' && module.exports){module.exports=api;return;}
  if(!root.SpatialOverviewDesktop || root.SpatialGuide?.model.active())return;
  const key='spatial-workspace-notifications-v1';
  let saved={};try{saved=JSON.parse(desktopStorage.getItem(key)||'{}');}catch{}
  const notifications=create(saved),listeners=new Set(),actionHandlers=new Map();let painting=false,restoring=false,pending=0;
  const originalAttention=drawAttentionToNotification;
  drawAttentionToNotification=function(...args){if(!notifications.doNotDisturb())return originalAttention(...args);};
  const visible=()=>SpatialOverviewDesktop.active()==='system'&&$('#universalSearch').classList.contains('is-open');
  const id=()=>root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
  const tones=new Set(['blue','cyan','violet','green','amber','rose']);
  const localItems=()=>document.querySelectorAll('#notificationList [data-notification-id],#systemWideNotificationList [data-notification-id]');
  function notificationMarkup(note){
    const tone=tones.has(note.tone)?note.tone:'blue',glyph=/^i-[a-z-]+$/.test(note.glyph)?note.glyph:'i-bell';
    return '<article class="notification" data-notification-id="'+escapeHtml(note.id)+'"'+(note.workspace===null?' data-notification-system="true"':' data-notification-workspace="'+escapeHtml(note.workspace)+'"')+(note.app?' data-app-origin="'+escapeHtml(note.app)+'"':'')+'><span class="app-badge '+tone+'">'+icon(glyph)+'</span><div><b>'+escapeHtml(note.title)+'</b><small>'+escapeHtml(note.detail)+'</small></div><button class="dismiss-button" aria-label="Dismiss">×</button></article>';
  }
  function readLegacy(workspace,useLive=false){
    if(notifications.imported(workspace))return;
    const area=workspaceAreaContents[workspace] || (workspace==='general'?{notificationsHtml:defaultAreaContent.notificationsHtml}:desktopPreset==='demo'?{notifications:SpatialDemoExamples.scenarios[workspace]?.notifications||[]}:{});
    let html=useLive?$('#notificationList').innerHTML:area?.notificationsHtml;
    if(typeof html==='string'){
      const template=document.createElement('template');template.innerHTML=html;
      for(const item of template.content.querySelectorAll('.notification')){
        notifications.add({id:item.dataset.notificationId||id(),workspace,app:item.dataset.appOrigin||'',title:item.querySelector('b')?.textContent||'Notification',detail:item.querySelector('small')?.textContent||'',time:Date.now(),tone:[...tones].find(t=>item.querySelector('.app-badge')?.classList.contains(t))||'blue',glyph:item.querySelector('use')?.getAttribute('href')?.slice(1)||'i-bell'});
      }
    }else for(const [title,detail,tone,glyph] of area?.notifications||[])notifications.add({id:id(),workspace,title,detail,tone,glyph,time:Date.now(),app:glyph==='i-gamepad'?'steam':''});
    notifications.markImported(workspace);
  }
  function save(broadcast=true){try{desktopStorage.setItem(key,JSON.stringify(notifications.snapshot()));}catch{}if(notifications.doNotDisturb()&&typeof hideNotificationPeek==='function')hideNotificationPeek();if(broadcast)queueDesktopStateBroadcast(120);schedule();listeners.forEach(listener=>listener());}
  function markRead(ids){if(notifications.markRead(ids))save();}
  function dismiss(id){notifications.dismiss(id);save();renderLocal();}
  function content(note){const model=appWindowStore.snapshot()[note.workspace]?.[note.app];return displayNotification(note,model,appInfo[note.app]?.label);}
  function renderActions(){
    for(const node of document.querySelectorAll('#notificationList [data-notification-id],#systemWideNotificationList [data-notification-id],#overviewNotificationList [data-notification-id],#overviewSystemWideNotificationList [data-notification-id]')){
      const note=notifications.get(node.dataset.notificationId),privatePreview=note&&appWindowStore.snapshot()[note.workspace]?.[note.app]?.previewHidden;
      const actions=note&&!privatePreview&&(note.workspace===null||note.workspace===activeWorkspace)?notificationActions(note.actions):[];
      let host=node.querySelector('.desktop-notification-actions');
      if(!actions.length){host?.remove();continue;}
      const markup=actions.map(action=>'<button type="button" data-notification-action="'+escapeHtml(action.id)+'">'+escapeHtml(action.label)+'</button>').join('');
      if(!host){host=document.createElement('div');host.className='desktop-notification-actions';(node.querySelector('div')||node.querySelector('span')||node).append(host);}
      if(host.innerHTML!==markup)host.innerHTML=markup;
    }
  }
  const originalSync=syncNotifications;
  function renderLocal(){
    if(painting)return;painting=true;
    try{
      const shared=document.getElementById('systemWideNotificationList');
      $('#notificationList').innerHTML=[...(shared?[]:notifications.list(null)),...notifications.list(activeWorkspace)].map(notificationMarkup).join('');
      if(shared)shared.innerHTML=notifications.list(null).map(notificationMarkup).join('');
      originalSync();
      renderActions();
    }finally{painting=false;}
  }
  syncNotifications=function(...args){
    if(painting||restoring)return originalSync(...args);
    if(desktopSyncApplying){renderLocal();schedule();return;}
    const shown=new Set([...localItems()].map(item=>item.dataset.notificationId));
    let changed=false;
    for(const note of [...notifications.list(activeWorkspace),...notifications.list(null)])if(!shown.has(note.id)){notifications.dismiss(note.id);changed=true;}
    if(changed)save();originalSync(...args);renderActions();schedule();
  };
  function notify(options){
    const workspace=destination(options,activeWorkspace,workspaceProfiles);if(workspace===undefined)return null;
    const note=notifications.add({...options,id:options.id||id(),workspace,time:options.time||Date.now()});if(!note)return null;
    save();
    if(workspace===null||workspace===activeWorkspace){
      renderLocal();
      if(!options.quiet&&!notifications.doNotDisturb())requestAnimationFrame(()=>{
        const item=[...localItems()].find(node=>node.dataset.notificationId===note.id);
        if(item&&notifications.get(note.id)&&!notifications.doNotDisturb())drawAttentionToNotification(item,note.title,note.detail,note.tone,note.glyph);
      });
    }
    return note;
  }
  addNotification=function(title,detail,tone='blue',glyph='i-bell',options={}){return notify({...options,title,detail,tone,glyph});};
  const originalRestore=restoreWorkspaceAreaContent;
  restoreWorkspaceAreaContent=function(workspace,...args){readLegacy(workspace);restoring=true;try{originalRestore(workspace,...args);}finally{restoring=false;}renderLocal();};
  const originalCapture=captureDesktopSyncState;
  captureDesktopSyncState=function(){return {...originalCapture(),workspaceNotifications:notifications.snapshot()};};
  const originalIncoming=persistIncomingDesktopState;
  persistIncomingDesktopState=function(state){if(state.workspaceNotifications){notifications.merge(state.workspaceNotifications);save(false);}return originalIncoming(state);};
  function openOrigin(workspace,app){
    if(workspace!==null&&!workspaceProfiles[workspace])return;
    setUniversalSearchOpen(false);
    if(workspace!==null && activeWorkspace!==workspace)renderWorkspace(workspace,false);
    if(app && appInfo[app]){
      const owner=desktopPages.columnOf(activeWorkspace,app);
      if(owner!=='workspace'&&!openProjectNames().includes(owner))activateProject(owner,false);else changeDesktopColumn(owner,false);
      const finish=()=>{if(workspace!==null&&activeWorkspace!==workspace)return;if(desktopPageAnimating){setTimeout(finish,60);return;}openApp(app);};finish();
    }else root.SpatialPanels?.openApplet?.(workspace===null?'workspace-alerts':'notifications');
  }
  function setDoNotDisturb(value){notifications.setDoNotDisturb(value);if(value){if(typeof hideNotificationPeek==='function')hideNotificationPeek();document.querySelectorAll('.has-notification-attention,.has-new-attention,.is-new-attention').forEach(node=>node.classList.remove('has-notification-attention','has-new-attention','is-new-attention'));}save();return notifications.doNotDisturb();}
  function invokeAction(noteId,actionId){
    const note=notifications.get(noteId);if(!note||(note.workspace!==null&&note.workspace!==activeWorkspace)||appWindowStore.snapshot()[note.workspace]?.[note.app]?.previewHidden)return false;
    const action=notificationActions(note.actions).find(item=>item.id===actionId);if(!action)return false;
    const handler=actionHandlers.get(action.kind);
    try{
      if(handler)return handler(action,note);
      if(action.kind==='open-app'){openOrigin(note.workspace,action.app||note.app);return true;}
      if(action.kind==='open-location'&&root.SpatialDesktopFiles?.openFolder){root.SpatialDesktopFiles.openFolder(action.path,{workspace:note.workspace||activeWorkspace});return true;}
      if(action.kind==='undo'&&root.SpatialDesktopFiles?.undo){root.SpatialDesktopFiles.undo({workspace:note.workspace||activeWorkspace,token:action.token});return true;}
      showToast('This action is no longer available.');return false;
    }catch(error){showToast(error.message||'The action could not be completed.');return false;}
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-notification-action]');if(!button)return;const note=button.closest('[data-notification-id]');if(!note)return;event.preventDefault();event.stopPropagation();invokeAction(note.dataset.notificationId,button.dataset.notificationAction);},true);
  function render(){root.SpatialOverviewSystem?.render();}
  function schedule(){if(!visible()||pending)return;pending=requestAnimationFrame(()=>{pending=0;render();});}
  function checkDownloads(quiet=false){
    for(const [workspace,models] of Object.entries(appWindowStore.snapshot()))for(const [app,model] of Object.entries(models))if(model.download?.received>=model.download?.total && !model.download.notified){
      appWindowStore.get(workspace,app).download.notified=true;
      notify({workspace,app,title:'Demo update ready',detail:'Steam finished its local demo download.',tone:'green',glyph:'i-download',quiet});
    }
  }
  const originalSaveApps=saveAppWindows;
  saveAppWindows=function(...args){checkDownloads();originalSaveApps(...args);schedule();};
  document.addEventListener('click',event=>{
    const dismiss=event.target.closest('#notificationList .dismiss-button,#systemWideNotificationList .dismiss-button'),note=dismiss?.closest('[data-notification-id]');
    if(note){notifications.dismiss(note.dataset.notificationId);save();}
  },true);
  window.addEventListener('storage',event=>{if(event.key===key){try{notifications.merge(JSON.parse(event.newValue||'{}'));renderLocal();schedule();listeners.forEach(listener=>listener());}catch{}}});
  for(const workspace of Object.keys(workspaceProfiles))readLegacy(workspace,workspace===activeWorkspace);
  root.SpatialAllWorkspaces={notify,notifications:()=>notifications.snapshot(),render,refreshLocal:renderLocal,list:notifications.list,unread:notifications.unread,markRead,dismiss,content,openOrigin,doNotDisturb:notifications.doNotDisturb,setDoNotDisturb,renderActions,invokeAction,registerActionHandler:(kind,handler)=>{actionHandlers.set(kind,handler);return ()=>actionHandlers.delete(kind);},subscribe:listener=>{listeners.add(listener);return ()=>listeners.delete(listener);}};
  save(false);renderLocal();checkDownloads(true);originalSaveApps(false);
})(typeof globalThis!=='undefined'?globalThis:this);
