/* Fixed virtual display, presented fullscreen or inside a normal desktop tile. */
(function(root){
  'use strict';
  const WIDTH=1920,HEIGHT=1080;
  function fit(width,height){
    const scale=Math.max(0,Math.min(width/WIDTH,height/HEIGHT));
    return {scale,width:WIDTH*scale,height:HEIGHT*scale};
  }
  function card({name,label,primary,bond,shortcut,detail,privatePreview,minimized,page,escape,art,icon}){
    const id=escape(name),mode=bond?'Fullscreen':minimized?'Parked':'Tiled';
    return '<article class="overview-temporary-desktop overview-virtual-screen" data-fullscreen-card="'+id+'" style="--overview-app:'+primary+'">'
      +'<button class="temporary-desktop-open" data-overview-open-app="'+id+'" aria-label="Return to '+escape(label)+' virtual screen"><span class="temporary-desktop-scene" data-peek-kind="'+(privatePreview?'private':id)+'"><span class="temporary-desktop-badge">'+icon('i-monitor')+'Virtual screen · '+mode+'</span>'+art+shortcut+'</span><span class="temporary-desktop-title"><b>'+escape(label)+'</b><small>'+escape(privatePreview?'Preview hidden':detail)+'</small></span></button>'
      +'<p class="virtual-screen-spec">1920 × 1080 <span>·</span> 16:9 <span>·</span> Fixed resolution</p>'
      +'<p class="temporary-desktop-parent">'+icon('i-monitor')+(bond?'Temporary desktop · attached to Desktop '+(bond.page+1):'Desktop '+(page+1)+' · scales to fit its tile')+'</p>'
      +'<div class="temporary-desktop-actions">'+(bond?'<button type="button" data-fullscreen-action="back" data-fullscreen-app="'+id+'">Back to Desktop '+(bond.page+1)+'</button><button type="button" data-fullscreen-action="restore" data-fullscreen-app="'+id+'" title="Tile the same virtual display; keep its resolution and aspect ratio.">Show tiled</button>':'<button type="button" data-overview-open-app="'+id+'">'+(minimized?'Unpark screen':'Return to screen')+'</button><button type="button" data-virtual-screen-fullscreen="'+id+'">Show fullscreen</button>')+'</div></article>';
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={fit,card};return;}
  const key='spatial-virtual-screen-modes-v1';let modes={};
  try{modes=JSON.parse(desktopStorage.getItem(key)||'{}')||{};}catch{}
  const eligible=name=>Boolean(appInfo[name]?.borderlessFullscreen);
  const bond=name=>desktopPages.fullscreenBond(activeWorkspace,name);
  function remember(name,tiled){
    modes[activeWorkspace] ||= {};modes[activeWorkspace][name]=tiled?'tiled':'fullscreen';
    try{desktopStorage.setItem(key,JSON.stringify(modes));}catch{}
  }
  const prefersTiled=name=>eligible(name)&&!bond(name)&&modes[activeWorkspace]?.[name]==='tiled';
  const observer=new ResizeObserver(entries=>entries.forEach(entry=>resize(entry.target)));
  function resize(viewport){
    const size=fit(viewport.clientWidth,viewport.clientHeight),canvas=viewport.firstElementChild;
    if(!canvas)return;
    canvas.style.transform='translate(-50%, -50%) scale('+size.scale+')';
  }
  function refresh(){
    for(const [name,info] of Object.entries(appInfo)){
      if(!eligible(name))continue;
      const frame=frameFor(name);if(!frame)continue;
      frame.classList.add('virtual-screen-window');
      let viewport=frame.querySelector('.virtual-screen-viewport');
      if(!viewport){
        const stage=frame.querySelector('.steam-game-stage');if(!stage)continue;
        viewport=document.createElement('div');viewport.className='virtual-screen-viewport';viewport.setAttribute('aria-label','Virtual screen · 1920 by 1080 · 16:9');
        stage.before(viewport);viewport.append(stage);observer.observe(viewport);
        const label=frame.querySelector('.app-identity small');if(label)label.textContent='Virtual screen · 1920 × 1080 · 16:9';
      }
      resize(viewport);
    }
    const control=document.getElementById('steamVirtualScreenMode');
    if(control){control.hidden=activeWorkspace!=='gaming'||!['open','minimized'].includes(appState.game)||Boolean(bond('game'));control.textContent='Show fullscreen';}
  }
  function overviewCard(name,{bond:current,shortcut,detail,minimized}){
    return card({name,label:appInfo[name].label,primary:appInfo[name].primary,bond:current,shortcut,detail,privatePreview:Boolean(root.SpatialPreviewPrivacy?.hidden(name)),minimized,page:desktopPages.pageOf(activeWorkspace,name),escape:escapeHtml,art:appArt(name),icon});
  }
  const originalRestore=fullscreenDesktopAction;
  fullscreenDesktopAction=function(action,name){
    const origin=bond(name);
    const changed=originalRestore(action,name);
    if(changed&&action==='restore'&&eligible(name)){
      remember(name,true);
      const session=tileSessions[desktopPages.context(activeWorkspace,origin.page,origin.column)+Math.min(origin.display,activeDisplayRoster().length)];
      if(session){delete session.floating?.[name];if(session.focus?.name===name)session.focus=null;}
      appMaximizedState[name]=false;saveTileSessions();renderTileLayout(name);saveIndependentSessions();
      root.SpatialSteamOverview?.syncContext();refresh();
      showToast(appInfo[name].label+' · Virtual screen tiled · 1920 × 1080 unchanged');
    }
    return changed;
  };
  function showFullscreen(name){
    if(!eligible(name)||!['open','minimized'].includes(appState[name])||bond(name)||desktopPageAnimating||tileInteraction||manualWindowInteraction)return false;
    setUniversalSearchOpen(false);
    changeDesktopPage(desktopPages.pageOf(activeWorkspace,name),false,desktopPages.columnOf(activeWorkspace,name));
    if(!isLocalApp(name)){showToast('Open the virtual screen on its owning display.');return false;}
    if(appState[name]==='minimized')openApp(name);
    if(!bond(name))toggleAppFullscreen(name);
    return Boolean(bond(name));
  }
  const originalToggle=toggleAppFullscreen;
  toggleAppFullscreen=function(name){
    const result=originalToggle(name);
    if(eligible(name)){remember(name,!bond(name));root.SpatialSteamOverview?.syncContext();refresh();}
    return result;
  };
  const originalSync=syncApps;
  syncApps=function(...args){const result=originalSync(...args);refresh();return result;};
  const originalEntries=contextMenuEntries;
  contextMenuEntries=function(context){
    const entries=originalEntries(context);
    if(context.kind!=='app'||context.background||context.parkedRail||!eligible(context.name)||appState[context.name]==='closed')return entries;
    const next=entries.filter(entry=>entry.action!=='app-fullscreen');
    next.splice(next.findIndex(entry=>entry.action==='app-open')+1,0,{action:bond(context.name)?'virtual-screen:tiled':'virtual-screen:fullscreen',icon:'i-monitor',label:bond(context.name)?'Show tiled virtual screen':'Show fullscreen virtual screen'});
    return next;
  };
  const originalAction=executeContextAction;
  executeContextAction=function(action){
    const name=contextMenuState?.name;
    if(action==='virtual-screen:tiled')return fullscreenDesktopAction('restore',name);
    if(action==='virtual-screen:fullscreen')return showFullscreen(name);
    return originalAction(action);
  };
  document.addEventListener('click',event=>{const button=event.target.closest('[data-virtual-screen-fullscreen]');if(button){event.preventDefault();showFullscreen(button.dataset.virtualScreenFullscreen);}});
  window.addEventListener('storage',event=>{if(event.key===key){try{modes=JSON.parse(event.newValue||'{}')||{};}catch{}refresh();}});
  root.SpatialVirtualScreen={fit,overviewCard,prefersTiled,showFullscreen,refresh};
  refresh();renderOverviewWindows();
})(typeof globalThis!=='undefined'?globalThis:this);
