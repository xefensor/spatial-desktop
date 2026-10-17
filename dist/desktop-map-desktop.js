/* Meta+Tab: projects across, desktops down, windows inside their own surfaces. */
(function(){
  'use strict';
  const D=SpatialDesktopMap,html=escapeHtml;
  const panel=document.createElement('section');panel.id='spatialDesktopMap';panel.className='desktop-map-overlay material-surface-glass';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','desktopMapTitle');
  panel.innerHTML='<header class="desktop-map-heading"><div><small id="desktopMapWorkspace"></small><h1 id="desktopMapTitle">Desktop map</h1><p>Projects across · Desktops down · Choose a window to return</p></div><button type="button" class="surface-key" data-map-close aria-label="Close desktop map">'+icon('i-close')+'</button></header><div class="desktop-map-world" tabindex="-1" aria-label="Projects and desktops"></div><footer><span><kbd>Meta + Tab</kbd> / <kbd>F2 + Tab</kbd> Desktop map</span><span><kbd>← ↑ ↓ →</kbd> Choose desktop · <kbd>Enter</kbd> Open · <kbd>Esc</kbd> Close</span></footer>';
  document.body.append(panel);
  const world=panel.querySelector('.desktop-map-world');let origin=null,owner='',inert=[],timer=0,columns=[],signature='',rendering=false;
  const isOpen=()=>!panel.hidden;
  function data(){
    const roster=activeDisplayRoster(),count=roster.length,assignments=displayAssignmentsFor().apps;
    const windows=Object.keys(appState).filter(id=>appInfo[id]&&['open','minimized'].includes(appState[id])&&frameFor(id)).map(id=>{
      const privatePreview=Boolean(globalThis.SpatialPreviewPrivacy?.hidden(id));
      return {id,column:desktopPages.columnOf(activeWorkspace,id),page:desktopPages.pageOf(activeWorkspace,id),display:Math.min(count,Math.max(1,Number(assignments[id])||1)),state:appState[id],label:appInfo[id].label,detail:privatePreview?'Preview hidden':frameFor(id).querySelector('.app-identity small')?.textContent||'',privatePreview,virtual:Boolean(appInfo[id].borderlessFullscreen)};
    });
    return {columns:['workspace',...openProjectNames()].map(id=>({id,label:desktopColumnLabel(id),icon:projectSpaces[id]?.icon||workspaceProfiles[activeWorkspace].icon,accent:projectSpaces[id]?.accent||workspaceProfiles[activeWorkspace].accent,pages:desktopPages.last(activeWorkspace,id)+1})),windows,displays:roster.map((display,i)=>({slot:i+1,width:Math.max(1,display.width||1000),height:Math.max(1,display.height||640)})),session:(column,page,display)=>tileSessions[desktopPages.context(activeWorkspace,page,column)+display]||{},currentColumn:desktopPages.column(activeWorkspace),currentPage:desktopPages.current(activeWorkspace)};
  }
  function windowMarkup(w){
    const position='left:'+w.x*100+'%;top:'+w.y*100+'%;width:'+w.width*100+'%;height:'+w.height*100+'%;';
    return '<div class="desktop-map-window'+(w.top?' is-top':'')+(w.virtual?' is-virtual':'')+'" style="'+position+'" data-map-preview="'+html(w.id)+'"><div class="desktop-map-snapshot" aria-hidden="true"></div><button type="button" class="desktop-map-window-target" data-map-window="'+html(w.id)+'" aria-label="'+html('Return to '+w.label+' · '+w.detail+' · Display '+w.display)+'">'+appArt(w.id)+'<span>'+html(w.label)+(w.privatePreview?'<small>Preview hidden</small>':w.virtual?'<small>Gamescope</small>':'')+'</span></button></div>';
  }
  function render(force=false){
    if(!isOpen()||rendering)return;
    if(owner!==activeWorkspace){close(false);return;}
    const source=data(),next=JSON.stringify({...source,session:source.columns.flatMap(c=>source.displays.flatMap(d=>Array.from({length:c.pages},(_,page)=>source.session(c.id,page,d.slot))))});
    if(!force&&signature===next)return;signature=next;rendering=true;
    try{
    const focused=document.activeElement?.closest('[data-map-page]'),focus=focused?{column:focused.dataset.mapColumn,page:Number(focused.dataset.mapPage)}:null;
    const scroll={x:world.scrollLeft,y:world.scrollTop};columns=D.build(source);
    panel.querySelector('#desktopMapWorkspace').textContent=workspaceProfiles[activeWorkspace].label+' Workspace';
    world.innerHTML=columns.map(column=>'<section class="desktop-map-column" data-map-column-id="'+html(column.id)+'" style="--map-accent:'+html(/^#[\da-f]{3,8}$/i.test(column.accent||'')?column.accent:'#5cbcff')+'"><header>'+icon(column.icon||'i-folder')+'<div><h2>'+html(column.label)+'</h2><small>'+(column.id==='workspace'?'Workspace desktops':'Project desktops')+'</small></div></header><div class="desktop-map-pages">'+column.pages.map(page=>'<section class="desktop-map-page'+(page.current?' is-current':'')+'"><button type="button" class="desktop-map-page-heading" data-map-page="'+page.page+'" data-map-column="'+html(column.id)+'" aria-current="'+(page.current?'page':'false')+'" aria-label="'+html(column.label+' · Desktop '+(page.page+1))+'"><span>Desktop '+(page.page+1)+'</span><small>'+(page.current?'Current':page.displays.every(d=>!d.windows.length)?'Empty':'')+'</small></button><div class="desktop-map-displays">'+page.displays.map(display=>'<div class="desktop-map-display" style="aspect-ratio:'+display.width+'/'+display.height+'" aria-label="Display '+display.slot+'"><button type="button" class="desktop-map-background" tabindex="-1" data-map-page="'+page.page+'" data-map-column="'+html(column.id)+'" aria-label="'+html('Open '+column.label+' · Desktop '+(page.page+1))+'">'+(!display.windows.length?'<span>Empty desktop</span>':'')+'</button>'+display.windows.map(windowMarkup).join('')+(source.displays.length>1?'<span class="desktop-map-display-label">Display '+display.slot+'</span>':'')+'</div>').join('')+'</div></section>').join('')+'</div>'+(column.parked.length?'<section class="desktop-map-parked"><h3>Parked <small>Across these desktops</small></h3><div>'+column.parked.map(w=>'<button type="button" data-map-parked="'+html(w.id)+'" title="'+html(w.label+' · '+w.detail)+'" aria-label="'+html('Restore '+w.label+' here')+'">'+appArt(w.id)+'<span>'+html(w.label)+'</span></button>').join('')+'</div></section>':'')+'</section>').join('');
    prepareControlSemantics(panel);
    world.scrollLeft=scroll.x;world.scrollTop=scroll.y;
    for(const column of columns)for(const page of column.pages)for(const display of page.displays)for(const w of display.windows)paint(w);
    if(focus)focusPage(focus.column,focus.page);
    }finally{rendering=false;}
  }
  function paint(w){
    if(w.privatePreview)return;
    const frame=frameFor(w.id),host=[...world.querySelectorAll('[data-map-preview]')].find(node=>node.dataset.mapPreview===w.id)?.querySelector('.desktop-map-snapshot');
    if(!frame||!host||!globalThis.SpatialParkedPreviews)return;
    const clone=SpatialParkedPreviews.cloneWindow(frame);
    clone.querySelectorAll('iframe,audio,video,script,.parked-preview-surface').forEach(node=>node.remove());
    const box=host.getBoundingClientRect(),rect=frame.getBoundingClientRect(),saved=windowGeometry.get(w.id),width=Math.max(320,rect.width||saved?.width||960),height=width*Math.max(1,box.height)/Math.max(1,box.width);
    const computed=getComputedStyle(frame);for(const property of computed)if(property.startsWith('--'))clone.style.setProperty(property,computed.getPropertyValue(property));
    clone.style.setProperty('width',width+'px','important');clone.style.setProperty('height',height+'px','important');
    const scale=box.width/width;clone.style.setProperty('transform','scale('+scale+')','important');host.append(clone);
  }
  function focusPage(column,page){const button=[...world.querySelectorAll('.desktop-map-page-heading')].find(n=>n.dataset.mapColumn===column&&Number(n.dataset.mapPage)===page);button?.focus({preventScroll:true});button?.scrollIntoView({block:'nearest',inline:'center'});}
  function blocked(){return document.querySelector('[aria-modal="true"]:not([hidden]):not([aria-hidden="true"]):not(#universalSearch):not(#spatialDesktopMap)')||tileInteraction||manualWindowInteraction||desktopPageAnimating||globalThis.SpatialGuide?.model.active()&&(!SpatialGuide.model.allows('projects')||!SpatialGuide.model.allows('desktops'));}
  function open(){
    if(isOpen()||blocked())return false;
    origin=document.activeElement;owner=activeWorkspace;setUniversalSearchOpen(false);closeDesktopContextMenu();
    inert=[...document.body.children].filter(node=>node!==panel&&!['SCRIPT','STYLE','LINK'].includes(node.tagName)).map(node=>[node,node.inert]);inert.forEach(([node])=>node.inert=true);
    panel.hidden=false;panel.inert=false;render(true);focusPage(desktopPages.column(activeWorkspace),desktopPages.current(activeWorkspace));
    timer=setInterval(()=>render(),1000);return true;
  }
  function close(restore=true){if(!isOpen())return;panel.hidden=true;clearInterval(timer);world.replaceChildren();signature='';inert.forEach(([node,value])=>node.inert=value);inert=[];if(restore&&origin?.isConnected&&!origin.closest('[hidden]'))origin.focus({preventScroll:true});}
  function visit(column,page,id,parked=false){
    if(column!=='workspace'&&!openProjectNames().includes(column))return;
    close(false);changeDesktopPage(page,false,column);
    if(id&&appInfo[id]&&appState[id]!=='closed'){
      const display=Math.min(activeDisplayRoster().length,Number(displayAssignmentsFor().apps[id])||1);
      if(parked)openApp(id);else if(display===localDisplaySlot())bringToFront(id);else showToast(appInfo[id].label+' · Display '+display);
    }else focusDesktop();
  }
  panel.addEventListener('click',event=>{
    if(event.target.closest('[data-map-close]'))return close();
    const app=event.target.closest('[data-map-window],[data-map-parked]');if(app){const id=app.dataset.mapWindow||app.dataset.mapParked,parked=Boolean(app.dataset.mapParked);return visit(desktopPages.columnOf(activeWorkspace,id),parked?desktopPages.current(activeWorkspace,desktopPages.columnOf(activeWorkspace,id)):desktopPages.pageOf(activeWorkspace,id),id,parked);}
    const page=event.target.closest('[data-map-page]');if(page)visit(page.dataset.mapColumn,Number(page.dataset.mapPage));
  });
  window.addEventListener('keydown',event=>{
    const held=event.metaKey||event.getModifierState?.('OS')||globalThis.SpatialDemoSuper?.held();
    if(event.key==='Tab'&&held&&!event.ctrlKey&&!event.altKey){event.preventDefault();event.stopImmediatePropagation();superKeyAlone=false;if(!event.repeat)isOpen()?close():open();return;}
    if(!isOpen())return;
    if(['Meta','OS','F2'].includes(event.key)){superKeyAlone=false;return;}
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();return close();}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();const page=document.activeElement.closest('[data-map-page]')||document.activeElement.closest('.desktop-map-page')?.querySelector('.desktop-map-page-heading');const next=D.move(columns,page?.dataset.mapColumn||desktopPages.column(activeWorkspace),Number(page?.dataset.mapPage??desktopPages.current(activeWorkspace)),event.key);focusPage(next.column,next.page);return;
    }
    if(event.key==='Tab'){
      const buttons=[...panel.querySelectorAll('button:not([tabindex="-1"])')],at=buttons.indexOf(document.activeElement),next=at+(event.shiftKey?-1:1);if(next<0||next>=buttons.length){event.preventDefault();buttons[(next+buttons.length)%buttons.length].focus();}
    }
    event.stopPropagation();
  },true);
  window.addEventListener('keyup',event=>{if(isOpen()&&['Meta','OS','F2'].includes(event.key)){superKeyAlone=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  const originalNavigationBlocked=desktopNavigationBlocked;desktopNavigationBlocked=function(){return isOpen()||originalNavigationBlocked();};
  panel.addEventListener('wheel',event=>event.stopPropagation());
  const toggle=document.getElementById('desktopContextToggle');toggle.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();open();},true);toggle.title='Desktop map · Meta+Tab or F2+Tab';toggle.setAttribute('aria-haspopup','dialog');
  const button=document.createElement('button');button.type='button';button.className='surface-key';button.textContent='Desktop map';button.title='Meta+Tab or F2+Tab';button.addEventListener('click',open);document.querySelector('.overview-desktop-map > header').append(button);
  new MutationObserver(()=>{if(isOpen())render();}).observe(document.querySelector('.desktop-shell'),{subtree:true,childList:true,attributes:true});
  window.addEventListener('resize',()=>{if(isOpen())render(true);});window.addEventListener('pagehide',()=>close(false));
  globalThis.SpatialDesktopMapDesktop={open,close,isOpen,refresh:render};
})();
