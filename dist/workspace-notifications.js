/* Cross-workspace badges reveal content only after an explicit click. */
(function(root){
  'use strict';
  function createPreview(){
    let workspace='',ids=[];
    return {
      open(scope,notes){workspace=scope;ids=notes.filter(note=>note.workspace===scope).map(note=>note.id);},
      close(){workspace='';ids=[];},
      workspace:()=>workspace,
      ids:()=>[...ids],
      items:store=>store.list(workspace).filter(note=>ids.includes(note.id)),
      pending:store=>store.list(workspace).filter(note=>!ids.includes(note.id)).length
    };
  }
  if(typeof module!=='undefined' && module.exports){module.exports={createPreview};return;}
  const store=root.SpatialAllWorkspaces,popup=document.getElementById('workspaceNotificationPopup');
  if(!store || !popup)return;
  const preview=createPreview(),rows=[document.getElementById('workspaceNotificationBadges'),document.getElementById('systemRailWorkspaceNotifications'),document.getElementById('overviewWorkspaceNotificationBadges')].filter(Boolean);
  const list=popup.querySelector('[data-workspace-notification-list]'),status=popup.querySelector('[data-workspace-notification-status]');
  let origin=null,scanPending=0;
  function renderBadges(){
    const scopes=Object.keys(workspaceProfiles).filter(workspace=>workspace!==activeWorkspace);
    document.getElementById('workspaceNotificationsWidget').hidden=!scopes.length;
    const overviewWidget=document.getElementById('overviewWorkspaceNotificationsWidget');if(overviewWidget)overviewWidget.hidden=!scopes.length;
    for(const row of rows){
      row.hidden=!scopes.length;
      for(const node of [...row.children])if(!scopes.includes(node.dataset.notificationWorkspaceToggle))node.remove();
      for(const workspace of scopes){
        const profile=workspaceProfiles[workspace],count=store.unread(workspace);
        let button=[...row.children].find(node=>node.dataset.notificationWorkspaceToggle===workspace);
        if(!button){button=document.createElement('button');button.type='button';button.className='workspace-notification-badge';button.dataset.notificationWorkspaceToggle=workspace;button.innerHTML=icon(profile.icon)+'<small></small>';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',popup.id);row.append(button);}
        button.style.setProperty('--notification-workspace-accent',profile.accent);
        button.querySelector('small').textContent=count;
        button.classList.toggle('has-unread',count>0);
        button.setAttribute('aria-expanded',String(!popup.hidden && preview.workspace()===workspace));
        const label=profile.label+' · '+count+' unread '+(count===1?'notification':'notifications');
        button.title=label;button.setAttribute('aria-label','Show '+label);
      }
    }
  }
  function renderPopup(){
    if(popup.hidden)return;
    const workspace=preview.workspace(),profile=workspaceProfiles[workspace];
    if(!profile){close(false);return;}
    const notes=preview.items(store),keys=new Set(notes.map(note=>note.id));
    for(const node of [...list.children])if(!keys.has(node.dataset.workspacePreviewNotification))node.remove();
    for(const note of notes){
      let node=[...list.children].find(node=>node.dataset.workspacePreviewNotification===note.id);
      if(!node){node=document.createElement('article');node.className='workspace-notification-item';node.dataset.workspacePreviewNotification=note.id;node.innerHTML='<div><b></b><p></p></div><div class="workspace-notification-actions"><button type="button" data-notification-preview-open>Open</button><button type="button" data-notification-preview-dismiss>Dismiss</button></div>';list.append(node);}
      const content=store.content(note);
      node.querySelector('b').textContent=content.title;node.querySelector('p').textContent=content.detail;
      node.querySelector('[data-notification-preview-open]').setAttribute('aria-label','Open '+content.title+' in '+profile.label);
      node.querySelector('[data-notification-preview-dismiss]').setAttribute('aria-label','Dismiss '+content.title);
    }
    popup.querySelector('[data-workspace-notification-empty]').hidden=notes.length>0;
    const pending=preview.pending(store);
    status.textContent=pending?pending+' new '+(pending===1?'notification':'notifications')+' · Reopen to view':'New arrivals update the badge only.';
  }
  function close(restoreFocus=true){
    if(popup.hidden)return;
    popup.hidden=true;popup.inert=true;list.replaceChildren();status.textContent='';
    popup.querySelector('h2').textContent='';preview.close();renderBadges();
    if(restoreFocus && origin?.isConnected)origin.focus({preventScroll:true});origin=null;
  }
  function open(workspace,button){
    if(!workspaceProfiles[workspace] || workspace===activeWorkspace)return;
    if(!popup.hidden && preview.workspace()===workspace){close();return;}
    close(false);origin=button;preview.open(workspace,store.list(workspace));
    const profile=workspaceProfiles[workspace];popup.style.setProperty('--notification-workspace-accent',profile.accent);
    popup.querySelector('h2').textContent=profile.label+' notifications';
    popup.querySelector('[data-workspace-notification-symbol]').innerHTML=icon(profile.icon);
    popup.hidden=false;popup.inert=false;renderPopup();
    const rect=button.getBoundingClientRect(),width=Math.min(380,window.innerWidth-24);
    popup.style.width=width+'px';
    popup.style.left=Math.max(12,Math.min(window.innerWidth-width-12,rect.right-width))+'px';
    popup.style.top=Math.max(12,Math.min(window.innerHeight-popup.offsetHeight-12,rect.bottom+9))+'px';
    store.markRead(preview.ids());renderBadges();
    popup.querySelector('[data-notification-preview-close]').focus({preventScroll:true});
  }
  for(const row of rows)row.addEventListener('click',event=>{const button=event.target.closest('[data-notification-workspace-toggle]');if(button){event.stopPropagation();open(button.dataset.notificationWorkspaceToggle,button);}});
  popup.addEventListener('click',event=>{
    if(event.target.closest('[data-notification-preview-close]')){close();return;}
    const workspace=preview.workspace();
    if(event.target.closest('[data-notification-preview-workspace]')){close(false);store.openOrigin(workspace,'');return;}
    const item=event.target.closest('[data-workspace-preview-notification]');if(!item)return;
    const note=store.list(workspace).find(note=>note.id===item.dataset.workspacePreviewNotification);if(!note)return;
    if(event.target.closest('[data-notification-preview-dismiss]')){store.dismiss(note.id);renderPopup();return;}
    if(event.target.closest('[data-notification-preview-open]')){close(false);store.openOrigin(workspace,note.app);}
  });
  document.addEventListener('pointerdown',event=>{if(!popup.hidden && !popup.contains(event.target) && !event.target.closest('[data-notification-workspace-toggle]'))close(false);},true);
  document.addEventListener('focusin',event=>{if(!popup.hidden && !popup.contains(event.target) && !event.target.closest('[data-notification-workspace-toggle]'))close(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && !popup.hidden){event.preventDefault();event.stopImmediatePropagation();close();}},true);
  window.addEventListener('blur',()=>close(false));window.addEventListener('resize',()=>close(false));
  const originalRailOwns=systemRailExpansionOwns;
  systemRailExpansionOwns=function(target){return !popup.hidden&&popup.contains(target)||originalRailOwns(target);};
  const originalWorkspace=renderWorkspace;
  renderWorkspace=function(...args){close(false);const result=originalWorkspace(...args);renderBadges();scan();return result;};
  const originalOverview=setUniversalSearchOpen;
  setUniversalSearchOpen=function(...args){close(false);const result=originalOverview(...args);scan();return result;};
  // Read state changes only for notifications actually revealed to the user.
  // Overflow clipping, hidden rails and the inert desktop under Overview count as hidden.
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    if(document.hidden)return;
    const ids=[];
    for(const entry of entries){
      if(!entry.isIntersecting || entry.intersectionRatio<.6 || !entry.target.isConnected || entry.target.closest('[hidden],[inert],[aria-hidden="true"]'))continue;
      const id=entry.target.dataset.notificationId || entry.target.dataset.globalItem?.replace(/^notification:/,'');if(id)ids.push(id);
    }
    if(ids.length)store.markRead(ids);
  },{threshold:.6}):null;
  function scan(){if(!observer||scanPending)return;scanPending=requestAnimationFrame(()=>{scanPending=0;observer.disconnect();document.querySelectorAll('#notificationList [data-notification-id],#systemWideNotificationList [data-notification-id],#overviewNotificationList [data-notification-id],#overviewSystemWideNotificationList [data-notification-id]').forEach(node=>observer.observe(node));});}
  if(typeof MutationObserver==='function'){
    const mutations=new MutationObserver(scan);
    const overviewSystem=document.querySelector('[data-overview-panel="system"]');
    if(overviewSystem){const visibility=new MutationObserver(()=>{if((overviewSystem.inert||overviewSystem.hidden)&&origin?.closest('[data-overview-panel="system"]'))close(false);});visibility.observe(overviewSystem,{attributes:true,attributeFilter:['inert','hidden']});}
    for(const node of [document.getElementById('notificationList'),document.getElementById('overviewNotificationList'),document.getElementById('overviewSystemWideNotificationList')].filter(Boolean))mutations.observe(node,{childList:true,subtree:true});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close(false);else scan();});
  store.subscribe(()=>{renderBadges();renderPopup();scan();});
  // System-wide alerts may be mounted by the scope layout after this adapter.
  root.SpatialWorkspaceNotificationViews={scan};
  renderBadges();scan();
})(typeof globalThis!=='undefined'?globalThis:this);
