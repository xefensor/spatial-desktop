/* Explicit global inspection; ordinary notifications remain workspace-local. */
(function(root){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function create(saved={}) {
    const records={},dismissed={},imported={},read={};
    function merge(value={}) {
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
      const note={id:item.id,workspace:item.workspace??null,app:String(item.app||''),title:item.title.slice(0,200),detail:String(item.detail||'').slice(0,2000),tone:item.tone||'blue',glyph:item.glyph||'i-bell',time:item.time,updated:item.updated||item.time};
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
    return {list,add,dismiss,merge,markRead,unread:workspace=>list(workspace).filter(note=>!(read[note.id]>=(note.updated||note.time))).length,get:id=>records[id]?clone(records[id]):null,imported:workspace=>Boolean(imported[workspace]),markImported:workspace=>{imported[workspace]=true;},snapshot:()=>clone({records,dismissed,imported,read})};
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
  const api={create,destination,displayNotification,activities};
  if(typeof module!=='undefined' && module.exports){module.exports=api;return;}
  const panel=document.getElementById('allWorkspacesPanel'),button=document.getElementById('allWorkspacesTab'),groups=document.getElementById('allWorkspacesGroups');
  if(!panel || !root.SpatialOverviewDesktop || root.SpatialGuide?.model.active())return;
  const key='spatial-workspace-notifications-v1';
  let saved={};try{saved=JSON.parse(desktopStorage.getItem(key)||'{}');}catch{}
  const notifications=create(saved),listeners=new Set();let painting=false,restoring=false,pending=0;
  const visible=()=>SpatialOverviewDesktop.active()==='global'&&!panel.hidden;
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
  function save(broadcast=true){try{desktopStorage.setItem(key,JSON.stringify(notifications.snapshot()));}catch{}if(broadcast)queueDesktopStateBroadcast(120);schedule();listeners.forEach(listener=>listener());}
  function markRead(ids){if(notifications.markRead(ids))save();}
  function dismiss(id){notifications.dismiss(id);save();renderLocal();}
  function content(note){const model=appWindowStore.snapshot()[note.workspace]?.[note.app];return displayNotification(note,model,appInfo[note.app]?.label);}
  const originalSync=syncNotifications;
  function renderLocal(){
    if(painting)return;painting=true;
    try{
      const shared=document.getElementById('systemWideNotificationList');
      $('#notificationList').innerHTML=[...(shared?[]:notifications.list(null)),...notifications.list(activeWorkspace)].map(notificationMarkup).join('');
      if(shared)shared.innerHTML=notifications.list(null).map(notificationMarkup).join('');
      originalSync();
    }finally{painting=false;}
  }
  syncNotifications=function(...args){
    if(painting||restoring)return originalSync(...args);
    if(desktopSyncApplying){renderLocal();schedule();return;}
    const shown=new Set([...localItems()].map(item=>item.dataset.notificationId));
    let changed=false;
    for(const note of [...notifications.list(activeWorkspace),...notifications.list(null)])if(!shown.has(note.id)){notifications.dismiss(note.id);changed=true;}
    if(changed)save();originalSync(...args);schedule();
  };
  function notify(options){
    const workspace=destination(options,activeWorkspace,workspaceProfiles);if(workspace===undefined)return null;
    const note=notifications.add({...options,id:options.id||id(),workspace,time:options.time||Date.now()});if(!note)return null;
    save();
    if(workspace===null||workspace===activeWorkspace){
      renderLocal();
      if(!options.quiet)requestAnimationFrame(()=>{
        const item=[...localItems()].find(node=>node.dataset.notificationId===note.id);
        if(item&&notifications.get(note.id))drawAttentionToNotification(item,note.title,note.detail,note.tone,note.glyph);
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
    }else revealSystemRailWidget('#notificationWidget');
  }
  function reconcile(list,items,workspace){
    const keys=new Set(items.map(item=>item.id));
    for(const node of [...list.children])if(!keys.has(node.dataset.globalItem))node.remove();
    for(const item of items){
      let node=[...list.children].find(node=>node.dataset.globalItem===item.id);
      if(!node){
        node=document.createElement('article');node.className='global-activity-item';node.dataset.globalItem=item.id;
        node.innerHTML='<span class="global-item-icon" aria-hidden="true"></span><div class="global-item-copy"><span class="global-item-category"></span><h4></h4><p></p></div><div class="global-item-actions"><button type="button" data-global-open>Open</button></div>';
        list.append(node);
        if(item.notification){const dismiss=document.createElement('button');dismiss.type='button';dismiss.dataset.globalDismiss=item.notification;dismiss.textContent='Dismiss';node.querySelector('.global-item-actions').append(dismiss);}
      }
      node.querySelector('.global-item-category').textContent=item.category;
      node.querySelector('h4').textContent=item.title;node.querySelector('p').textContent=item.detail;
      const art=item.app&&appInfo[item.app]?appArt(item.app):icon(item.notification?'i-bell':'i-monitor'),artNode=node.querySelector('.global-item-icon');if(artNode.dataset.art!==art){artNode.dataset.art=art;artNode.innerHTML=art;}
      const open=node.querySelector('[data-global-open]');open.dataset.globalWorkspace=workspace===null?'@system':workspace;open.dataset.globalApp=item.app||'';open.dataset.globalNotification=item.notification||'';open.setAttribute('aria-label','Open '+item.title+' in '+(workspace===null?'System':workspaceProfiles[workspace].label));
      const dismiss=node.querySelector('[data-global-dismiss]');if(dismiss)dismiss.setAttribute('aria-label','Dismiss '+item.title);
    }
  }
  function render(){
    if(!visible())return;
    const snapshot=appWindowStore.snapshot();
    const scopes=[null,...Object.keys(workspaceProfiles)];
    for(const workspace of scopes){
      const scope=workspace===null?'@system':workspace,profile=workspaceProfiles[workspace];
      let group=[...groups.children].find(node=>node.dataset.globalWorkspaceGroup===scope);
      if(!group){group=document.createElement('section');group.className='global-workspace-group';group.dataset.globalWorkspaceGroup=scope;group.innerHTML='<header><span class="global-group-icon" aria-hidden="true"></span><div><h4></h4><small></small></div></header><div class="global-group-items"></div><p class="global-group-empty"></p>';groups.append(group);}
      group.style.setProperty('--global-group-accent',profile?.accent||'#8aa4b8');
      group.querySelector('header h4').textContent=profile?.label||'System';group.querySelector('header small').textContent=workspace===null?'Shared system alerts':workspace===activeWorkspace?'Current workspace':'Workspace-local activity';
      group.querySelector('.global-group-icon').innerHTML=icon(profile?.icon||'i-settings');
      const models=snapshot[workspace]||{},states=workspace===activeWorkspace?appState:workspaceAppStates[workspace]||{};
      const items=notifications.list(workspace).map(note=>({...displayNotification(note,models[note.app],appInfo[note.app]?.label),id:'notification:'+note.id,notification:note.id,app:note.app,category:'Notification'}));
      if(workspace!==null)items.push(...activities(models,states,workspace,activeWorkspace,appInfo));
      reconcile(group.querySelector('.global-group-items'),items,workspace);
      group.querySelector('.global-group-empty').hidden=items.length>0;group.querySelector('.global-group-empty').textContent=workspace===null?'No system-wide alerts':'No pending notifications or activity';
    }
    for(const group of [...groups.children])if(group.dataset.globalWorkspaceGroup!=='@system'&&!workspaceProfiles[group.dataset.globalWorkspaceGroup])group.remove();
  }
  function schedule(){if(!visible()||pending)return;pending=requestAnimationFrame(()=>{pending=0;render();});}
  function checkDownloads(quiet=false){
    for(const [workspace,models] of Object.entries(appWindowStore.snapshot()))for(const [app,model] of Object.entries(models))if(model.download?.received>=model.download?.total && !model.download.notified){
      appWindowStore.get(workspace,app).download.notified=true;
      notify({workspace,app,title:'Demo update ready',detail:'Steam finished its local demo download.',tone:'green',glyph:'i-download',quiet});
    }
  }
  const originalSaveApps=saveAppWindows;
  saveAppWindows=function(...args){checkDownloads();originalSaveApps(...args);schedule();};
  groups.addEventListener('click',event=>{
    const dismiss=event.target.closest('[data-global-dismiss]');if(dismiss){notifications.dismiss(dismiss.dataset.globalDismiss);save();renderLocal();render();return;}
    const open=event.target.closest('[data-global-open]');if(open){if(open.dataset.globalNotification)markRead([open.dataset.globalNotification]);openOrigin(open.dataset.globalWorkspace==='@system'?null:open.dataset.globalWorkspace,open.dataset.globalApp);}
  });
  $('#notificationList').addEventListener('click',event=>{
    const dismiss=event.target.closest('.dismiss-button'),note=dismiss?.closest('[data-notification-id]');
    if(note){notifications.dismiss(note.dataset.notificationId);save();}
  },true);
  $('#universalSearchInput').addEventListener('input',()=>{if($('#universalSearchInput').value.trim())SpatialOverviewDesktop.closeSeparate();});
  button.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();SpatialOverviewDesktop.select('timeline',false);$('[data-overview-section="timeline"]')?.focus({preventScroll:true});}});
  window.addEventListener('storage',event=>{if(event.key===key){try{notifications.merge(JSON.parse(event.newValue||'{}'));renderLocal();schedule();listeners.forEach(listener=>listener());}catch{}}});
  for(const workspace of Object.keys(workspaceProfiles))readLegacy(workspace,workspace===activeWorkspace);
  root.SpatialAllWorkspaces={notify,notifications:()=>notifications.snapshot(),render,refreshLocal:renderLocal,list:notifications.list,unread:notifications.unread,markRead,dismiss,content,openOrigin,subscribe:listener=>{listeners.add(listener);return ()=>listeners.delete(listener);}};
  SpatialOverviewDesktop.registerSeparateSection('global',{button,panel,label:'All Workspaces',available:()=>!root.SpatialGuide?.model.active(),render,close:()=>groups.replaceChildren()});
  save(false);renderLocal();checkDownloads(true);originalSaveApps(false);
})(typeof globalThis!=='undefined'?globalThis:this);
