/* A rail offers live controls; temporary, focused flyouts borrow the real widgets. */
(function(root){
  'use strict';
  function position(edge,anchor,size,viewport){
    const gap=8,pad=12,width=Math.min(size.width,Math.max(1,viewport.width-pad*2)),height=Math.min(size.height,Math.max(1,viewport.height-pad*2));
    let left=anchor.left,top=anchor.top;
    if(edge==='left')left=anchor.right+gap;
    if(edge==='right')left=anchor.left-width-gap;
    if(edge==='top')top=anchor.bottom+gap;
    if(edge==='bottom')top=anchor.top-height-gap;
    return {left:Math.max(pad,Math.min(viewport.width-width-pad,left)),top:Math.max(pad,Math.min(viewport.height-height-pad,top)),width,height};
  }
  // Prefer this Workspace's active player. Only explicitly shared background
  // services may be offered from another Workspace.
  function choosePlayer(local,background){
    const shared=background.map(model=>({model,shared:true}));
    return [local,...shared].filter(Boolean).find(item=>item.model.playing)||local||shared[0]||null;
  }
  function createFlyout({document,popup,content,title,scope,empty,onPosition}){
    let session=null;
    function restore(){if(!session)return;for(const slot of session.slots)if(slot.marker.parentNode)slot.marker.parentNode.insertBefore(slot.node,slot.marker);}
    function mount(){if(!session)return;for(const slot of session.slots)content.append(slot.node);}
    function close(focus=false){
      if(!session)return;
      const previous=session;session=null;
      for(const slot of previous.slots){if(slot.marker.parentNode)slot.marker.parentNode.insertBefore(slot.node,slot.marker);slot.marker.remove();}
      popup.hidden=true;popup.inert=true;if(popup.matches?.(':popover-open'))popup.hidePopover();
      previous.origin?.setAttribute('aria-expanded','false');
      if(focus&&previous.origin?.isConnected)previous.origin.focus({preventScroll:true});
    }
    function open(options){
      if(session?.key===options.key){close(true);return false;}
      close(false);
      const slots=options.nodes.filter(Boolean).map(node=>{const marker=document.createComment('System rail widget home');node.before(marker);return {node,marker};});
      session={...options,slots};mount();
      title.textContent=options.label;scope.textContent=options.scope||'';empty.textContent=options.empty||'Nothing needs your attention.';
      empty.hidden=slots.some(slot=>!slot.node.hidden);
      popup.hidden=false;popup.inert=false;options.origin?.setAttribute('aria-expanded','true');
      if(typeof popup.showPopover==='function')popup.showPopover();
      onPosition(session);popup.focus({preventScroll:true});return true;
    }
    function withRestored(callback){
      if(!session)return callback();
      const focused=popup.contains(document.activeElement)?document.activeElement:null;
      restore();try{return callback();}finally{mount();if(focused?.isConnected)focused.focus({preventScroll:true});}
    }
    return {open,close,withRestored,current:()=>session,owns:target=>Boolean(session&&(popup.contains(target)||session.origin?.contains(target))),reconcile(context){if(session&&session.context!==context)close(false);},refresh(){if(session){empty.hidden=session.slots.some(slot=>!slot.node.hidden);onPosition(session);}}};
  }
  const api={position,choosePlayer,createFlyout};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  const area=document.querySelector('[data-area-window="systems"]');
  if(!area?.classList.contains('system-scopes-ready'))return;
  const $=selector=>area.querySelector(selector);
  const make=(tag,className,html='')=>{const node=document.createElement(tag);node.className=className;node.innerHTML=html;return node;};
  const action=(id,glyph,label)=>{const button=make('button','surface-key rail-action',icon(glyph)+'<span>'+label+'</span><small></small>');button.type='button';button.id=id;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');return button;};
  const popup=make('section','system-rail-flyout','<header class="system-rail-flyout-heading"><div><small></small><h2></h2></div><button type="button" class="surface-key" data-system-rail-close aria-label="Close System controls">'+icon('i-close')+'</button></header><div class="system-rail-flyout-body"></div><p class="system-rail-empty"></p>');
  popup.id='systemRailFlyout';popup.hidden=true;popup.inert=true;popup.tabIndex=-1;popup.setAttribute('role','dialog');popup.setAttribute('aria-label','System controls');popup.setAttribute('popover','manual');area.append(popup);
  const content=popup.querySelector('.system-rail-flyout-body');
  for(const id of ['systemRailDesktop','systemRailProject','systemRailNotifications','systemRailCalendar','systemRailTimer','systemRailWideAlerts']){const button=$('#'+id);if(button){button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',popup.id);button.setAttribute('aria-expanded','false');}}
  function context(){return [activeWorkspace,desktopPages.column(activeWorkspace),desktopPages.current(activeWorkspace),area.dataset.areaState,area.dataset.dockEdge,area.hidden,isLocalArea('systems')].join('|');}
  function locate(session){
    const anchor=(session.origin?.isConnected?session.origin:area).getBoundingClientRect(),viewport={width:innerWidth,height:innerHeight};
    popup.style.width=Math.min(330,Math.max(1,innerWidth-24))+'px';popup.style.maxHeight=Math.max(1,innerHeight-24)+'px';
    const rect=position(area.dataset.dockEdge||'right',anchor,{width:popup.offsetWidth,height:popup.offsetHeight},viewport);
    popup.style.left=rect.left+'px';popup.style.top=rect.top+'px';
  }
  const flyout=createFlyout({document,popup,content,title:popup.querySelector('h2'),scope:popup.querySelector('header small'),empty:popup.querySelector('.system-rail-empty'),onPosition:locate});
  function show(key,label,scope,nodes,origin,empty){
    if(area.hidden||area.dataset.areaState!=='rail'||!isLocalArea('systems'))return false;
    popup.dataset.systemRailTool=key;popup.setAttribute('aria-label',label+' · '+scope);
    root.dispatchEvent(new CustomEvent('spatial-rail-open',{detail:{area:'systems'}}));
    return flyout.open({key,label,scope,nodes,origin,empty,context:context()});
  }
  const quick=action('systemRailQuickSettings','i-settings','Quick'),media=action('systemRailMedia','i-music','Media');
  quick.title='Quick settings · network, Bluetooth, appearance and devices';quick.setAttribute('aria-label','Show quick settings');
  media.setAttribute('aria-label','Show current media controls');
  $('.system-rail-global').append(quick);$('.system-rail-middle').append(media);
  for(const button of [quick,media])button.setAttribute('aria-controls',popup.id);
  const sound=$('.quick-settings [aria-label="Sound"]');if(sound){sound.title='Sound · click to mute or unmute';sound.classList.add('system-rail-sound');}
  const quickPanel=make('div','system-rail-quick-panel','<button type="button" class="surface-key system-rail-settings" data-open-settings>'+icon('i-settings')+'<span>All Settings</span></button><p class="system-rail-note">Demo controls · no device settings are changed.</p>');
  quickPanel.hidden=true;area.append(quickPanel);
  quick.addEventListener('click',()=>{
    quickPanel.hidden=false;
    show('quick','Quick settings','System-wide',[$('.quick-settings'),$('.system-device-details'),quickPanel],quick);
  });
  const mediaPanel=make('section','system-rail-media-panel','<div class="system-rail-track"><b></b><small></small></div><div class="system-rail-media-actions"><button type="button" class="surface-key" data-system-media="prev" aria-label="Previous track">'+icon('i-prev')+'</button><button type="button" class="surface-key" data-system-media="play" aria-label="Play">'+icon('i-play')+'</button><button type="button" class="surface-key" data-system-media="next" aria-label="Next track">'+icon('i-next')+'</button></div><small class="system-rail-media-time"></small>');
  mediaPanel.hidden=true;area.append(mediaPanel);
  function player(){
    const ids=Object.keys(appState).filter(id=>['open','minimized'].includes(appState[id])&&(appInfo[id]?.base||id)==='elisa');
    ids.sort((first,second)=>Number(appWindowModel(second).playing)-Number(appWindowModel(first).playing)||(appWindowModel(second).lastUsed||0)-(appWindowModel(first).lastUsed||0));
    const id=ids[0];return choosePlayer(id?{id,model:appWindowModel(id),shared:false}:null,root.SpatialBackgroundApps?.players?.()||[]);
  }
  function syncMedia(){
    const session=flyout.current();
    let selected=session?.key==='media'&&session.player?session.player:player();
    if(session?.key==='media'&&session.player&&(selected.shared?!root.SpatialBackgroundApps?.players?.().includes(selected.model):appState[selected.id]==='closed')){flyout.close(false);selected=player();}
    const model=selected?.model,track=model?.tracks?.[model.index];
    media.hidden=!selected;
    media.classList.toggle('is-active',Boolean(model?.playing));
    media.querySelector('small').textContent=model?.playing?'Playing':'Paused';
    media.title=selected?(selected.shared?'System-wide background media':'Media · '+workspaceProfiles[activeWorkspace].label)+(model.previewHidden?' · Preview hidden':track?' · '+track.title:''):'';
    media.setAttribute('aria-label',selected?'Show '+(selected.shared?'system-wide background':'current Workspace')+' media controls':'Show current media controls');
    if(!selected&&flyout.current()?.key==='media'){flyout.close(false);return;}
    mediaPanel.querySelector('b').textContent=model?.previewHidden?'Preview hidden':track?.title||'No active player';
    mediaPanel.querySelector('.system-rail-track small').textContent=selected?(selected.shared?'System-wide background app':workspaceProfiles[activeWorkspace].label+' · Music Player'):'';
    const play=mediaPanel.querySelector('[data-system-media="play"]');play.innerHTML=icon(model?.playing?'i-pause':'i-play');play.setAttribute('aria-label',model?.playing?'Pause':'Play');play.setAttribute('aria-pressed',String(Boolean(model?.playing)));
    mediaPanel.querySelector('.system-rail-media-time').textContent=model?(model.playing?'Playing':'Paused')+' · '+formatTime(model.position||0)+(track?' / '+formatTime(track.duration):''):'';
  }
  media.addEventListener('click',()=>{const selected=player();if(!selected)return;mediaPanel.hidden=false;if(show('media','Media',selected.shared?'System-wide':workspaceProfiles[activeWorkspace].label,[mediaPanel],media)){flyout.current().player=selected;syncMedia();}});
  mediaPanel.addEventListener('click',event=>{
    const control=event.target.closest('[data-system-media]'),selected=flyout.current()?.player;if(!control||!selected)return;
    const model=selected.model;model.lastUsed=Date.now();
    if(control.dataset.systemMedia==='play')model.playing=!model.playing;
    else SpatialAppTools.musicStep(model,control.dataset.systemMedia==='prev'?-1:1);
    renderAllAppMusic();saveAppWindows();root.SpatialBackgroundApps?.render();syncMedia();
  });
  const originalReveal=revealSystemRailWidget;
  revealSystemRailWidget=function(selector){
    if(area.hidden||area.dataset.areaState!=='rail'||!isLocalArea('systems')){flyout.close(false);return originalReveal(selector);}
    const profile=workspaceProfiles[activeWorkspace],space=projectSpaces[desktopPages.column(activeWorkspace)];
    const target=document.querySelector(selector),trigger=area.contains(document.activeElement)?document.activeElement:null;
    const routes={
      '#notificationWidget':['notifications','Notifications',profile.label,[target],$('#systemRailNotifications'),'No notifications in this Workspace.'],
      '#systemWideNotificationWidget':['alerts','System alerts','System-wide',[target],$('#systemRailWideAlerts'),'No system alerts.'],
      '#systemScopeDesktop':['requests','Pending requests','This desktop',[target],$('#systemRailDesktop'),'No pending requests.'],
      '#systemScopeProject':['project','Project plans',space?.name||'Project',[target],$('#systemRailProject'),'No upcoming project plans.'],
      '.calendar-widget':['agenda','Calendar & agenda',profile.label,[$('.system-agenda-stack')],$('#systemRailCalendar'),'No upcoming plans.']
    };
    const route=routes[selector];if(!route)return originalReveal(selector);
    return show(...route.slice(0,4),trigger||route[4],route[5]);
  };
  // The timer can be inspected without starting or pausing it by accident.
  $('#systemRailTimer').addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(!focusSeconds)focusSeconds=25*60;
    revealDynamicWidget($('#timerWidget'));updateTimer();
    show('timer','Focus timer',workspaceProfiles[activeWorkspace].label,[$('#timerWidget')],$('#systemRailTimer'));
  },true);
  function syncTimer(){const timer=$('#systemRailTimer');timer.removeAttribute('aria-pressed');timer.classList.remove('control-toggle');timer.classList.add('control-push');timer.setAttribute('aria-label','Show focus timer · '+formatTime(focusSeconds));timer.title='Focus timer · '+formatTime(focusSeconds)+' · '+(focusRunning?'Running':focusSeconds===25*60?'Ready':'Paused');}
  const originalTimer=updateTimer;updateTimer=function(...args){const result=originalTimer(...args);syncTimer();return result;};
  const originalMusic=renderAllAppMusic;renderAllAppMusic=function(...args){const result=originalMusic(...args);syncMedia();return result;};
  const originalSave=saveAppWindows;saveAppWindows=function(...args){const result=originalSave(...args);syncMedia();return result;};
  const originalBackground=root.SpatialBackgroundApps?.render;
  if(originalBackground)root.SpatialBackgroundApps.render=function(...args){const result=originalBackground(...args);syncMedia();return result;};
  // Snapshot in original DOM order so the saved hidden-widget indices stay stable.
  const originalSnapshot=snapshotWorkspaceAreaContent;snapshotWorkspaceAreaContent=function(...args){return flyout.withRestored(()=>originalSnapshot(...args));};
  function closeThen(name){const original=root[name];if(typeof original==='function')root[name]=function(...args){flyout.close(false);return original(...args);};}
  // These are global classic-script functions; wrapping the global binding also
  // covers keyboard shortcuts and remote-display scope changes.
  ['renderWorkspace','changeDesktopColumn','activateProject','restoreWorkspaceAreaContent','setUniversalSearchOpen','hideArea','moveAreaDock','openDesktopContextMenu'].forEach(closeThen);
  function outside(event){if(flyout.current()&&!flyout.owns(event.target)&&!event.target.closest?.('#desktopContextMenu'))flyout.close(false);}
  document.addEventListener('pointerdown',outside,true);document.addEventListener('focusin',outside,true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&flyout.current()&&document.querySelector('#desktopContextMenu')?.hidden!==false){event.preventDefault();event.stopImmediatePropagation();flyout.close(true);}},true);
  popup.querySelector('[data-system-rail-close]').addEventListener('click',()=>flyout.close(true));
  popup.addEventListener('click',event=>{if(event.target.closest('[data-open-settings],[data-timeline-planned],[data-system-request],#timerReset'))requestAnimationFrame(()=>flyout.close(false));});
  root.addEventListener('spatial-rail-open',event=>{if(event.detail?.area!=='systems')flyout.close(false);});
  root.addEventListener('blur',()=>flyout.close(false));root.addEventListener('resize',()=>flyout.close(false));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flyout.close(false);});
  if(typeof MutationObserver==='function'){
    const observer=new MutationObserver(()=>{flyout.reconcile(context());flyout.refresh();});
    observer.observe(area,{attributes:true,attributeFilter:['hidden','data-area-state','data-dock-edge','class']});
    for(const node of [$('#notificationWidget'),$('#systemWideNotificationWidget'),$('#timerWidget')].filter(Boolean))observer.observe(node,{attributes:true,attributeFilter:['hidden']});
    const backgroundRow=document.getElementById('backgroundApps');
    if(backgroundRow){const mediaObserver=new MutationObserver(syncMedia);mediaObserver.observe(backgroundRow,{childList:true,attributes:true,attributeFilter:['hidden']});}
  }
  root.SpatialSystemRail={...api,close:flyout.close,current:flyout.current,refresh(){flyout.reconcile(context());syncTimer();syncMedia();}};
  const originalPages=updateDesktopPageUi;updateDesktopPageUi=function(...args){const result=originalPages(...args);root.SpatialSystemRail.refresh();return result;};
  prepareControlSemantics(area);area.classList.add('system-rail-ready');syncTimer();syncMedia();
})(typeof globalThis!=='undefined'?globalThis:this);
