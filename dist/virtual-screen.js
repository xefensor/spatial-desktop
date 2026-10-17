/* Browser simulation of a Gamescope display inside one ordinary shell window. */
(function(root){
  'use strict';
  const WIDTH=2560,HEIGHT=1440;
  function fit(width,height){
    const scale=Math.max(0,Math.min(width/WIDTH,height/HEIGHT));
    return {scale,width:WIDTH*scale,height:HEIGHT*scale};
  }
  function card({name,label,primary,fullscreen,shortcut,detail,privatePreview,minimized,page,escape,art,icon}){
    const id=escape(name),mode=fullscreen?'Fullscreen':minimized?'Parked':'Tiled';
    return '<article class="overview-temporary-desktop overview-virtual-screen" data-fullscreen-card="'+id+'" style="--overview-app:'+primary+'">'
      +'<button class="temporary-desktop-open" data-overview-open-app="'+id+'" aria-label="Return to '+escape(label)+' Gamescope window"><span class="temporary-desktop-scene" data-peek-kind="'+(privatePreview?'private':id)+'"><span class="temporary-desktop-badge">'+icon('i-monitor')+'Gamescope · '+mode+'</span>'+art+shortcut+'</span><span class="temporary-desktop-title"><b>'+escape(label)+'</b><small>'+escape(privatePreview?'Preview hidden':detail)+'</small></span></button>'
      +'<p class="virtual-screen-spec">2560 × 1440 <span>·</span> 16:9 <span>·</span> Fixed game resolution</p>'
      +'<p class="temporary-desktop-parent">'+icon('i-monitor')+('Desktop '+(page+1)+(fullscreen?' · fullscreen on this desktop':' · scales to fit its tile'))+'</p>'
      +'<div class="temporary-desktop-actions">'+(fullscreen?'<button type="button" data-overview-open-app="'+id+'">Return to game</button><button type="button" data-virtual-screen-tiled="'+id+'" title="Meta+F or F2+F · switch the outer window; game resolution stays fixed.">Show tiled</button>':'<button type="button" data-overview-open-app="'+id+'">'+(minimized?'Unpark game':'Return to game')+'</button><button type="button" data-virtual-screen-fullscreen="'+id+'">Show fullscreen</button>')+'</div></article>';
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={fit,card};return;}
  const key='spatial-virtual-screen-modes-v1';let modes={};
  try{modes=JSON.parse(desktopStorage.getItem(key)||'{}')||{};}catch{}
  const eligible=name=>Boolean(appInfo[name]?.gamescope);
  function sessionFor(name){
    const display=Math.min(Number(displayAssignmentsFor().apps[name]||1),activeDisplayRoster().length);
    const key=desktopPages.context(activeWorkspace,desktopPages.pageOf(activeWorkspace,name),desktopPages.columnOf(activeWorkspace,name))+display;
    return tileSessions[key];
  }
  const fullscreen=name=>eligible(name)&&sessionFor(name)?.fullscreen?.name===name;
  function remember(name,tiled){
    modes[activeWorkspace] ||= {};modes[activeWorkspace][name]=tiled?'tiled':'fullscreen';
    try{desktopStorage.setItem(key,JSON.stringify(modes));}catch{}
  }
  const prefersTiled=name=>eligible(name)&&!fullscreen(name)&&modes[activeWorkspace]?.[name]!=='fullscreen';
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
        viewport=document.createElement('div');viewport.className='virtual-screen-viewport';viewport.setAttribute('aria-label','Gamescope · 2560 by 1440 · 16:9');
        stage.before(viewport);viewport.append(stage);observer.observe(viewport);
      }
      const identity=frame.querySelector('.app-identity > div');
      if(identity&&!identity.querySelector('.virtual-screen-label')){const label=document.createElement('span');label.className='virtual-screen-label';label.innerHTML=icon('i-monitor')+'Gamescope · 2560 × 1440 · 16:9';identity.append(label);}
      resize(viewport);
    }
    const control=document.getElementById('steamVirtualScreenMode');
    if(control){control.hidden=!['open','minimized'].includes(appState.game);control.textContent=fullscreen('game')?'Show tiled':'Show fullscreen';control.title=fullscreen('game')?'Meta+F / F2+F · switch to tiling':'Meta+F / F2+F · fill this display';}
  }
  function overviewCard(name,{shortcut,detail,minimized}){
    return card({name,label:appInfo[name].label,primary:appInfo[name].primary,fullscreen:fullscreen(name),shortcut,detail,privatePreview:Boolean(root.SpatialPreviewPrivacy?.hidden(name)),minimized,page:desktopPages.pageOf(activeWorkspace,name),escape:escapeHtml,art:appArt(name),icon});
  }
  function canPresent(name){
    if(!eligible(name)||!['open','minimized'].includes(appState[name])||desktopPageAnimating||tileInteraction||manualWindowInteraction)return false;
    const display=Math.min(Number(displayAssignmentsFor().apps[name]||1),activeDisplayRoster().length);
    if(display!==localDisplaySlot()){showToast('Open the Gamescope window on its owning display.');return false;}
    return true;
  }
  function showTiled(name){
    if(!canPresent(name)||!fullscreen(name))return false;
    setUniversalSearchOpen(false);
    changeDesktopPage(desktopPages.pageOf(activeWorkspace,name),false,desktopPages.columnOf(activeWorkspace,name));
    remember(name,true);
    const session=sessionFor(name);
    if(session.fullscreen?.name===name)leaveAppFullscreen(session);
    delete session.floating?.[name];if(session.focus?.name===name)session.focus=null;
    appMaximizedState[name]=false;saveTileSessions();syncApps();refreshIntentAreas();renderTileLayout(name);
    if(isLocalApp(name))bringToFront(name);
    saveIndependentSessions();queueDesktopStateBroadcast(0);root.SpatialSteamOverview?.syncContext();
    showToast(appInfo[name].label+' · Gamescope tiled · 2560 × 1440 unchanged');
    return true;
  }
  function showFullscreen(name){
    if(!canPresent(name)||fullscreen(name))return false;
    setUniversalSearchOpen(false);
    changeDesktopPage(desktopPages.pageOf(activeWorkspace,name),false,desktopPages.columnOf(activeWorkspace,name));
    if(appState[name]==='minimized'){remember(name,true);openApp(name);}
    if(!fullscreen(name))toggleAppFullscreen(name);
    return Boolean(fullscreen(name));
  }
  const originalToggle=toggleAppFullscreen;
  toggleAppFullscreen=function(name){
    const result=originalToggle(name);
    if(eligible(name)){remember(name,!fullscreen(name));root.SpatialSteamOverview?.syncContext();refresh();}
    return result;
  };
  const originalSync=syncApps;
  syncApps=function(...args){const result=originalSync(...args);refresh();return result;};
  const originalEntries=contextMenuEntries;
  contextMenuEntries=function(context){
    const entries=originalEntries(context);
    if(context.kind!=='app'||context.background||context.parkedRail||!eligible(context.name)||appState[context.name]==='closed')return entries;
    const next=entries.filter(entry=>entry.action!=='app-fullscreen');
    next.splice(next.findIndex(entry=>entry.action==='app-open')+1,0,{action:fullscreen(context.name)?'virtual-screen:tiled':'virtual-screen:fullscreen',icon:'i-monitor',label:fullscreen(context.name)?'Show tiled · Gamescope':'Show fullscreen · Gamescope'});
    return next;
  };
  const originalAction=executeContextAction;
  executeContextAction=function(action){
    const name=contextMenuState?.name;
    if(action==='virtual-screen:tiled')return showTiled(name);
    if(action==='virtual-screen:fullscreen')return showFullscreen(name);
    return originalAction(action);
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-virtual-screen-fullscreen],[data-virtual-screen-tiled],[data-virtual-screen-toggle]');if(!button)return;
    event.preventDefault();
    if(button.dataset.virtualScreenTiled)showTiled(button.dataset.virtualScreenTiled);
    else if(button.dataset.virtualScreenFullscreen)showFullscreen(button.dataset.virtualScreenFullscreen);
    else {const name=button.dataset.virtualScreenToggle;fullscreen(name)?showTiled(name):showFullscreen(name);}
  });
  document.addEventListener('keydown',event=>{
    const superHeld=root.SpatialDemoSuper?.held()||event.metaKey||event.getModifierState?.('OS');
    if(!superHeld||!['KeyD','KeyF'].includes(event.code)||event.repeat||event.ctrlKey||event.altKey||event.shiftKey||event.isComposing)return;
    if(document.querySelector('#packageDialog.is-open,#projectEditorDialog.is-open,#universalSearch.is-open,#spatialDesktopMap:not([hidden])'))return;
    const activeFullscreen=tileSession().fullscreen?.name;
    // D only reveals the desktop. F toggles the focused Gamescope container
    // in both directions; ordinary apps and other displays keep their keys.
    const name=activeFullscreen||(event.code==='KeyF'?frontApp:null);
    if(!eligible(name)||!isLocalApp(name)||appState[name]!=='open')return;
    if(!activeFullscreen && (!desktopHasWindowFocus || event.target?.closest?.('input,textarea,select,[contenteditable="true"]')))return;
    event.preventDefault();event.stopPropagation();superKeyAlone=false;
    fullscreen(name)?showTiled(name):showFullscreen(name);
  },true);
  window.addEventListener('storage',event=>{if(event.key===key){try{modes=JSON.parse(event.newValue||'{}')||{};}catch{}refresh();}});
  root.SpatialVirtualScreen={fit,overviewCard,prefersTiled,fullscreen,showTiled,showFullscreen,refresh};
  refresh();renderOverviewWindows();
})(typeof globalThis!=='undefined'?globalThis:this);
