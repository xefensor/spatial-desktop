/* Native panel runtime: live widgets in movable, resizable docks. */
(function(root){
  'use strict';
  const M=root.SpatialPanelWidgets,registry=root.SpatialPanelContent.create(),shell=document.querySelector('.desktop-shell');
  if(!M||!shell||!registry.size)return;
  const storage=typeof desktopStorage!=='undefined'?desktopStorage:root.localStorage,key='spatial-widget-panels-v1';
  let saved={};try{saved=JSON.parse(storage.getItem(key)||'{}');}catch{}
  if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
  const sessions=Object.create(null);for(const [id,value]of Object.entries(saved))if(id!=='__proto__')sessions[id]=M.normalize(value);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const owner=()=>typeof activeWorkspace==='string'?activeWorkspace:'general';
  const state=()=>sessions[owner()]||=(M.defaults());
  const preferredWidgets=Object.create(null);
  const frames=new Map(),panels=new Map(),undo=[];
  const editInert=new Map();
  const definitionFor=id=>M.definition?.(id)||M.definitions[id];
  const isSpacer=id=>Boolean(M.isSpacer?.(id));
  const iconNames={launcher:'i-grid',apps:'i-grid',files:'i-folder',assistant:'i-chat',calendar:'i-calendar',notifications:'i-bell',clipboard:'i-note',focus:'i-timer',clock:'i-clock',controls:'i-settings',devices:'i-phone',requests:'i-monitor','project-plans':'i-folder','workspace-alerts':'i-bell',spacer:'i-menu'};
  const svg=name=>'<svg aria-hidden="true"><use href="#'+name+'"/></svg>';
  const node=(tag,className,text)=>{const value=document.createElement(tag);if(className)value.className=className;if(text!==undefined)value.textContent=text;return value;};
  const button=(label,action,className='surface-key')=>{const value=node('button',className);value.type='button';value.setAttribute('aria-label',label);value.title=label;value.dataset.panelAction=action;return value;};
  const announce=text=>{live.textContent=text;};
  let editing=false,rendering=false,pending=0,lastInsets='',lastWorkspace='',menu=null,menuOrigin=null,menuScope=null,appletPopup=null,drag=null,fitPending=0,suppressedPanelClick=null,suppressedWidgetClick=null;
  let compactPanels=null,widgetFit=null;
  const popupAnchors=new WeakMap();
  document.body.classList.add('panel-desktop-preview');document.body.dataset.panelEditing='false';
  const stage=node('div','widget-panels');shell.append(stage);
  const live=node('p','panel-layout-announcement');live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.append(live);
  const tooltip=node('div','panel-widget-tooltip');tooltip.id='panelWidgetTooltip';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;document.body.append(tooltip);
  let tooltipAnchor=null;
  const toolbar=node('nav','panel-layout-toolbar');toolbar.setAttribute('aria-label','Arrange panels');toolbar.hidden=true;
  const toolbarTitle=node('span','panel-layout-title','Edit layout');toolbar.append(toolbarTitle);
  for(const [label,action]of [['Add panel','add-panel'],['Panels','panels'],['Widgets','widgets'],['Undo','undo'],['Reset layout','reset'],['Help','help'],['Done','done']]){const value=button(label,action);value.textContent=label;toolbar.append(value);}document.body.append(toolbar);

  function save(){try{storage.setItem(key,JSON.stringify(sessions));}catch{}root.queueDesktopStateBroadcast?.();}
  function change(next,message){
    const current=state(),normalized=M.normalize(next);if(JSON.stringify(current)===JSON.stringify(normalized)){render();return false;}
    undo.push({workspace:owner(),state:clone(current)});if(undo.length>20)undo.shift();sessions[owner()]=normalized;save();render();if(message)announce(message);return true;
  }
  function ensureVisible(id,expanded=true){
    if(appletPopup?.id===id&&expanded)return true;
    const current=state(),panel=current.panels.find(item=>item.widgets.includes(id));if(!panel)return;
    if(id==='launcher'){let next=M.updatePanel(current,panel.id,{mode:panel.mode==='hidden'?'expanded':panel.mode,display:localSlot()});return change(M.updateWidget(next,id,{mode:'compact'}));}
    if(expanded)preferredWidgets[owner()]=id;
    let next=M.updatePanel(current,panel.id,{mode:expanded||panel.mode==='hidden'?'expanded':panel.mode,display:localSlot()});
    if(expanded)next=M.updateWidget(next,id,{mode:'expanded'});change(next);
  }
  function localSlot(){try{return localDisplaySlot();}catch{return 1;}}
  function displayCount(){try{return activeDisplayRoster().length||1;}catch{return 1;}}
  function fullDisplay(){
    try{const session=tileSession();if(session?.fullscreen&&!session.fullscreen.bonded)return localSlot();const bond=desktopPages.selectedFullscreen?.(owner());if(bond)return Math.min(bond.display,displayCount());}catch{}return 0;
  }
  function layoutOptions(){
    const full=fullDisplay(),compactSizes={};if(compactPanels)for(const id of ['apps','clock'])compactSizes[id]={vertical:compactPanels.measure(id,true),horizontal:compactPanels.measure(id,false),minSize:{vertical:compactPanels.measureMin?.(id,true),horizontal:compactPanels.measureMin?.(id,false)}};
    const options={width:shell.clientWidth||root.innerWidth||1440,height:shell.clientHeight||root.innerHeight||900,display:localSlot(),displays:displayCount(),fullscreen:Boolean(full),fullscreenDisplay:full||1,headerSize:0,footerSize:0,compactToolboxSize:0,compactSizes,widgetHeaderSize:0,preferredWidget:preferredWidgets[owner()]};
    if(widgetFit){const geometry=M.layout(state(),options),widgetSizes={},measure=(id,vertical,cross)=>widgetFit.measureRange?.(id,vertical,cross)??widgetFit.measure(id,vertical,cross);for(const panel of state().panels){const rect=geometry.panels[panel.id];if(!rect||rect.compact)continue;for(const id of panel.widgets)if(!isSpacer(id)&&state().widgets[id]?.mode==='expanded'){widgetSizes[id]=rect.vertical?{vertical:measure(id,true,rect.width)}:{horizontal:measure(id,false,Math.max(0,rect.height-rect.bodyOffset-rect.bodyEnd-options.widgetHeaderSize))};}}options.widgetSizes=widgetSizes;}
    return options;
  }
  function setEditing(value){drag?.cancel();closeApplet(false);editing=Boolean(value);if(editing&&document.querySelector('#universalSearch')?.classList.contains('is-open'))setUniversalSearchOpen(false);document.body.dataset.panelEditing=String(editing);toolbar.hidden=!editing;closeMenu();render();}
  function createPanelFrame(panel){
    const element=node('section','desktop-panel');element.dataset.panelId=panel.id;element.setAttribute('aria-label',panel.label);
    const body=node('div','desktop-panel-body');body.id='panel-widgets-body-'+panel.id;body.tabIndex=0;body.setAttribute('aria-label',panel.label+' widgets');
    const resize=node('div','desktop-panel-resizer');resize.tabIndex=0;resize.setAttribute('role','separator');resize.dataset.panelId=panel.id;resize.setAttribute('aria-label','Resize '+panel.label);
    const lengthResize=node('div','desktop-panel-length-resizer');lengthResize.tabIndex=0;lengthResize.setAttribute('role','separator');lengthResize.dataset.panelId=panel.id;lengthResize.setAttribute('aria-label','Resize length of '+panel.label);
    element.append(body,resize,lengthResize);stage.append(element);panels.set(panel.id,{element,body,resize,lengthResize});return panels.get(panel.id);
  }
  function createWidgetFrame(id){
    const definition=definitionFor(id),entry=registry.get(id),element=node('section','desktop-widget');element.dataset.widgetId=id;element.dataset.widgetKind=isSpacer(id)?'spacer':'content';element.setAttribute('aria-label',definition.title+' widget');
    const content=node('div','desktop-widget-content');content.id='panel-widget-content-'+id;if(entry?.kind==='system')content.classList.add('system-widget-content','system-scopes-ready','material-surface-glass');
    if(entry)for(const item of entry.nodes)content.append(item);
    const empty=node('p','panel-empty-widget');empty.hidden=true;content.append(empty);
    const summary=button('Expand '+definition.title,id==='launcher'?'open-overview':'expand-widget','desktop-widget-summary');summary.dataset.widgetId=id;
    summary.innerHTML=svg(iconNames[id]||iconNames.spacer);summary.setAttribute('aria-controls',id==='launcher'?'universalSearch':id==='clock'?'panel-widget-content-calendar':content.id);
    const badge=node('span','widget-icon-badge');badge.hidden=true;badge.setAttribute('aria-hidden','true');summary.append(badge);
    const compactContent=node('div','desktop-widget-compact');compactContent.hidden=true;
    const editCover=button('Move '+definition.title+' · Click for widget options','widget-options','panel-widget-edit-cover');editCover.dataset.widgetId=id;editCover.hidden=true;editCover.textContent=definition.title;
    element.append(content,summary,compactContent,editCover);element.hidden=true;stage.append(element);frames.set(id,{element,content,summary,compactContent,badge,empty,editCover});return frames.get(id);
  }
  for(const definition of M.catalog)if(definition.id!=='spacer')createWidgetFrame(definition.id);
  compactPanels=root.SpatialPanelCompact?.create({registry,openWidget:openApplet,onChange:schedule})||null;
  if(compactPanels)for(const [id,frame]of frames)frame.hasCompactView=compactPanels.mount(id,frame.compactContent);
  widgetFit=root.SpatialPanelFit?.create({registry,onChange:schedule})||null;
  // All individual sources now belong to their native widget frames.
  document.querySelector('[data-widget-source="system"]')?.remove();

  function refreshSummaries(){
    for(const [id,frame]of frames){const entry=registry.get(id),detail=entry?.summary?.()||entry?.sourceMetadata?.scope||'',title=definitionFor(id).title,raw=Number(entry?.badge?.()||0),count=Number.isFinite(raw)?Math.max(0,Math.floor(raw)):0;
      frame.badge.hidden=count===0;frame.badge.textContent=count>99?'99+':String(count);frame.summary.dataset.tooltip=title+(detail?' · '+detail:'');frame.summary.setAttribute('aria-label','Open '+title+(count?' · '+count+' pending':''));
      frame.summary.removeAttribute('title');
      if(id==='launcher'){
        const native=document.querySelector('#allAppsToggle'),label=native?.getAttribute('aria-label')||'Open Overview',icon=native?.querySelector('use')?.getAttribute('href')||'#i-grid',accent=native?.style.getPropertyValue('--desktop-column-accent');
        frame.summary.setAttribute('aria-label',label);frame.summary.dataset.tooltip=native?.title||label;frame.summary.setAttribute('aria-expanded',native?.getAttribute('aria-expanded')||'false');frame.summary.setAttribute('aria-pressed',native?.getAttribute('aria-pressed')||'false');frame.summary.disabled=Boolean(native?.disabled);frame.summary.classList.toggle('is-active',native?.classList.contains('is-active')||false);
        const use=frame.summary.querySelector('use');if(use?.getAttribute('href')!==icon)use?.setAttribute('href',icon);if(accent)frame.summary.style.setProperty('--desktop-column-accent',accent);else frame.summary.style.removeProperty('--desktop-column-accent');
      }
      const emptyMessages={notifications:'No notifications.',clipboard:'Copied items will appear here.',focus:'Start a focus session when you are ready.',devices:'No connected devices.',requests:'No pending requests.','project-plans':'Open a project to see its plans.','workspace-alerts':'No alerts from other Workspaces.'};
      const hasContent=isSpacer(id)||entry?.nodes?.some(item=>!item.hidden);
      frame.empty.hidden=Boolean(hasContent);frame.empty.textContent=emptyMessages[id]||'This widget is not available in this session.';
    }
    if(tooltipAnchor&&!tooltip.hidden)tooltip.textContent=tooltipAnchor.dataset.tooltip;
    compactPanels?.sync();
  }
  function hideTooltip(){tooltip.hidden=true;tooltipAnchor?.removeAttribute('aria-describedby');tooltipAnchor=null;}
  function restoreFilesContent(){root.SpatialMemoryDesktop?.render?.();}
  function showTooltip(anchor){if(drag||anchor.closest('.desktop-widget')?.hidden)return;hideTooltip();tooltipAnchor=anchor;tooltip.textContent=anchor.dataset.tooltip||anchor.title;anchor.setAttribute('aria-describedby',tooltip.id);tooltip.hidden=false;const rect=anchor.getBoundingClientRect(),box=tooltip.getBoundingClientRect();Object.assign(tooltip.style,{left:Math.max(8,Math.min(root.innerWidth-box.width-8,rect.left))+'px',top:(rect.bottom+box.height+12<=root.innerHeight?rect.bottom+6:Math.max(8,rect.top-box.height-6))+'px'});}
  function render(){
    if(rendering)return;rendering=true;
    try{
      if(drag&&(drag.workspace!==owner()||drag.display!==localSlot()||drag.fullscreen!==fullDisplay()))drag.cancel();
      if(menuScope&&(menuScope.workspace!==owner()||menuScope.display!==localSlot()||menuScope.fullscreen!==fullDisplay()))closeMenu(false);
      for(const [part,value]of editInert)part.inert=value;editInert.clear();
      const current=state();for(const id of Object.keys(current.widgets))if(!frames.has(id)&&definitionFor(id))createWidgetFrame(id);for(const [id,frame]of frames)if(!current.widgets[id]){frame.element.remove();frames.delete(id);}
      const width=shell.clientWidth||root.innerWidth||1440,height=shell.clientHeight||root.innerHeight||900;
      if(appletPopup&&(appletPopup.workspace!==owner()||appletPopup.display!==localSlot()||fullDisplay()||root.SpatialGuide?.panelWidgetAllowed?.(appletPopup.id)===false))closeApplet(false,false);
      let layoutState=current;
      if(root.SpatialGuide?.panelWidgetAllowed){const widgets={...current.widgets};let gated=false;for(const id of Object.keys(widgets))if(!root.SpatialGuide.panelWidgetAllowed(id)){widgets[id]={...widgets[id],mode:'hidden'};gated=true;}if(gated)layoutState={...current,widgets,panels:current.panels.map(panel=>panel.widgets.some(id=>widgets[id].mode!=='hidden')?panel:{...panel,mode:'hidden'})};}
      const options=layoutOptions(),layout=M.layout(layoutState,options);
      const fullscreen=Boolean(fullDisplay());document.body.classList.toggle('panel-layout-fullscreen',fullscreen&&displayCount()===1);
      toolbarTitle.textContent='Edit layout · '+(typeof workspaceProfiles!=='undefined'?workspaceProfiles[owner()]?.label||owner():owner());
      for(const [id,frame]of panels)if(!current.panels.some(item=>item.id===id)){frame.element.remove();panels.delete(id);}
      for(const panel of current.panels){
        const frame=panels.get(panel.id)||createPanelFrame(panel),rect=layout.panels[panel.id];
        frame.element.hidden=!rect;
        const focused=document.activeElement;let previous=null;for(const id of panel.widgets){const widget=frames.get(id);if(!widget)continue;const reference=previous?previous.nextElementSibling:frame.body.firstElementChild;if(widget.element!==reference)frame.body.insertBefore(widget.element,reference);previous=widget.element;}if(focused?.isConnected&&frame.body.contains(focused)&&document.activeElement!==focused)focused.focus({preventScroll:true});
        if(!rect)continue;
        frame.element.style.setProperty('--panel-header-size',rect.bodyOffset+'px');
        frame.element.style.setProperty('--panel-footer-size',(rect.bodyEnd??0)+'px');
        frame.element.style.setProperty('--panel-toolbox-size',(rect.toolboxSize||0)+'px');
        frame.element.dataset.edge=panel.edge;frame.element.dataset.mode=rect.compact?'compact':'expanded';frame.element.setAttribute('aria-label',panel.label);
        Object.assign(frame.element.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
        const thickness=Math.round(rect.vertical?rect.width:rect.height),maxThickness=Math.max(thickness,Math.min(640,Math.max(56,rect.vertical?width-300:height-220)));
        frame.resize.setAttribute('aria-orientation',rect.vertical?'vertical':'horizontal');frame.resize.setAttribute('aria-valuenow',String(thickness));frame.resize.setAttribute('aria-valuemin',String(Math.min(56,thickness)));frame.resize.setAttribute('aria-valuemax',String(maxThickness));
        frame.lengthResize.hidden=current.panels.filter(item=>item.edge===panel.edge&&layout.panels[item.id]).length<2;frame.lengthResize.setAttribute('aria-orientation',rect.vertical?'horizontal':'vertical');frame.lengthResize.setAttribute('aria-valuenow',String(Math.round(rect.vertical?rect.height:rect.width)));frame.lengthResize.setAttribute('aria-valuemin','0');frame.lengthResize.setAttribute('aria-valuemax',String(Math.max(Math.round(rect.vertical?rect.height:rect.width),rect.vertical?height-layout.insets.top-layout.insets.bottom:width)));
        for(const id of panel.widgets){
          const widget=frames.get(id),allocation=rect.widgets[id];if(!widget)continue;
          if(widget.element.parentElement!==frame.body)frame.body.append(widget.element);
          widget.element.hidden=!allocation;if(!allocation)continue;
          const spacerWidget=isSpacer(id),compact=allocation.mode==='compact';widget.element.dataset.widgetMode=compact?'compact':'expanded';widget.element.dataset.compactView=allocation.compactView||'icon';widget.element.dataset.panelId=panel.id;
          Object.assign(widget.element.style,{left:allocation.x+'px',top:allocation.y+'px',width:allocation.width+'px',height:allocation.height+'px'});
          widget.element.style.setProperty('--widget-header-size','0px');
          const popupOpen=appletPopup?.id===id,liveCompact=rect.compact&&widget.hasCompactView&&allocation.compactView!=='icon';
          widget.compactContent.hidden=!liveCompact;widget.summary.hidden=!compact||liveCompact;widget.content.hidden=compact&&!popupOpen;widget.content.inert=compact&&!popupOpen;
          widget.editCover.hidden=!editing;if(spacerWidget){widget.content.hidden=true;widget.content.inert=true;widget.summary.hidden=true;widget.compactContent.hidden=true;widget.empty.hidden=true;}
          widget.summary.setAttribute('aria-label','Open '+definitionFor(id).title);widget.summary.setAttribute('aria-expanded',String(popupOpen||appletPopup?.anchor===widget.summary||!compact));widget.summary.setAttribute('aria-haspopup','dialog');
          const entry=registry.get(id);if(entry){
            const source=entry.source,wasExpanded=source.dataset.widgetMode==='expanded';if(entry.kind==='widget')source.hidden=false;source.inert=compact&&!popupOpen;source.dataset.widgetMode=compact&&!popupOpen?'compact':'expanded';source.dataset.panelEdge=popupOpen?'left':panel.edge;source.setAttribute('aria-label',entry.label+' widget');if(id==='files'&&!wasExpanded&&source.dataset.widgetMode==='expanded')restoreFilesContent();
          }
        }
        frame.body.style.setProperty('--panel-content-extent',rect.contentExtent+'px');
        let spacer=frame.body.querySelector(':scope > .panel-scroll-extent');if(!spacer){spacer=node('span','panel-scroll-extent');spacer.setAttribute('aria-hidden','true');frame.body.append(spacer);}
        Object.assign(spacer.style,rect.vertical?{width:'1px',height:rect.contentExtent+'px'}:{height:'1px',width:rect.contentExtent+'px'});

      }
      for(const [id,widget]of frames){const panel=current.panels.find(item=>item.widgets.includes(id)),rect=panel&&layout.panels[panel.id];if(!rect||!rect.widgets[id]){widget.element.hidden=true;if(registry.get(id)?.kind==='widget'&&appletPopup?.id!==id){registry.get(id).source.hidden=true;}}}

      document.body.dataset.panelLauncherLocation='desktop';
      const insets=layout.insets,stamp=JSON.stringify(insets);
      if(stamp!==lastInsets){lastInsets=stamp;setWorkspaceInsets(insets.left,insets.right,insets.bottom,insets.top);}
      for(const [selector,side]of [['#desktopPageRail','left'],['#desktopPageRailRight','right']]){const rail=document.querySelector(selector);shell.style.setProperty('--desktop-page-rail-'+side+'-display',insets[side]?'flex':'none');shell.style.setProperty('--desktop-page-rail-'+side+'-width',insets[side]?'var(--desktop-page-rail-width)':'0px');if(rail){rail.hidden=!insets[side];rail.style.display=insets[side]?'flex':'none';}}
      const undoButton=toolbar.querySelector('[data-panel-action="undo"]');undoButton.disabled=!undo.some(item=>item.workspace===owner());
      toolbar.querySelector('[data-panel-action="add-panel"]').disabled=current.panels.length>=24;
      refreshSummaries();if(widgetFit?.sync())schedule();lastWorkspace=owner();
      if(tooltipAnchor&&(tooltipAnchor.hidden||tooltipAnchor.closest('.desktop-widget')?.hidden||tooltipAnchor.closest('.desktop-widget')?.dataset.widgetMode!=='compact'))hideTooltip();
      if(appletPopup){const anchorPanel=appletPopup.anchor?.closest('.desktop-panel');if(anchorPanel?.hidden||appletPopup.anchor?.closest('.desktop-widget')?.hidden||appletPopup.anchor?.closest('[hidden]'))closeApplet(false,false);}
      if(appletPopup)positionApplet();
      if(menu)finishPopup(menu,false);
      if(editing)for(const frame of frames.values())for(const part of [frame.content,frame.summary,frame.compactContent]){editInert.set(part,Boolean(part.inert));part.inert=true;}
    }finally{rendering=false;}
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;render();});}
  function fit(){cancelAnimationFrame(fitPending);fitPending=requestAnimationFrame(()=>{fitPending=0;root.scheduleWindowTiling?.();});}

  const usableFocus=element=>Boolean(element?.isConnected&&!element.hidden&&!element.closest('[hidden]'));
  function layoutAnchor(id){const preferred=panels.get(id)?.body;return usableFocus(preferred)?preferred:[...panels.values()].find(frame=>usableFocus(frame.body))?.body||shell;}
  function positionApplet(){
    if(!appletPopup)return;const {element,anchor,id}=appletPopup,width=Math.min(id==='assistant'?420:380,Math.max(1,root.innerWidth-16));element.style.width=width+'px';
    const css=getComputedStyle(element),borders=(parseFloat(css.borderTopWidth)||0)+(parseFloat(css.borderBottomWidth)||0),chrome=(element.querySelector('.panel-applet-popup-header')?.getBoundingClientRect().height||0)+borders,natural=widgetFit?.measure(id,true,width-(parseFloat(css.borderLeftWidth)||0)-(parseFloat(css.borderRightWidth)||0)),preferred=Number.isFinite(natural)&&natural>0?natural+chrome:id==='controls'?380:600,height=Math.min(Math.max(chrome,preferred),Math.max(1,root.innerHeight-16)),rect=anchor?.getBoundingClientRect?.()||{left:8,top:8,right:52,bottom:52},panel=anchor?.closest('.desktop-panel'),edge=panel?.dataset.edge||'bottom';
    let left=edge==='left'?rect.right+8:edge==='right'?rect.left-width-8:rect.left,top=edge==='top'?rect.bottom+8:edge==='bottom'?rect.top-height-8:rect.top;
    Object.assign(element.style,{left:Math.max(8,Math.min(root.innerWidth-width-8,left))+'px',top:Math.max(8,Math.min(root.innerHeight-height-8,top))+'px',width:width+'px',height:height+'px'});
  }
  function closeApplet(restoreFocus=true,redraw=true){
    if(typeof restoreFocus==='string'){if(appletPopup?.id!==restoreFocus)return false;restoreFocus=true;}
    if(!appletPopup)return;const current=appletPopup;appletPopup=null;
    current.frame.element.insertBefore(current.frame.content,current.frame.summary);current.element.remove();
    const compact=current.frame.element.dataset.widgetMode==='compact';current.frame.content.hidden=compact;current.frame.content.inert=compact;current.frame.summary.setAttribute('aria-expanded',String(!compact));if(current.anchor?.hasAttribute('aria-haspopup'))current.anchor.setAttribute('aria-expanded','false');
    if(registry.get(current.id)){const source=registry.get(current.id).source;source.inert=compact;source.dataset.widgetMode=compact?'compact':'expanded';}
    root.dispatchEvent(new CustomEvent('spatial-panel-applet-change',{detail:{id:current.id,open:false}}));
    if(redraw&&!rendering)render();if(restoreFocus){const fallback=current.frame.compactContent.hidden?current.frame.summary:current.frame.compactContent.querySelector('button');(usableFocus(current.anchor)?current.anchor:usableFocus(fallback)?fallback:layoutAnchor())?.focus({preventScroll:true});}
  }
  function openOverview(){if(editing)return;closeMenu(false);closeApplet(false,false);hideTooltip();document.querySelector('#allAppsToggle')?.click();refreshSummaries();}
  function openApplet(id,anchor){
    if(id==='launcher')return openOverview();
    const frame=frames.get(id);if(editing||!frame||!registry.has(id)||root.SpatialGuide?.panelWidgetAllowed?.(id)===false)return;
    if(appletPopup?.id===id){closeApplet();return;}
    closeMenu(false);closeApplet(false,false);hideTooltip();
    const element=node('section','panel-applet-popup desktop-widget');element.dataset.widgetId=id;element.dataset.widgetMode='expanded';element.style.setProperty('--widget-header-size','0px');element.setAttribute('role','dialog');element.setAttribute('aria-labelledby','panelAppletTitle');element.tabIndex=-1;
    const header=node('header','panel-applet-popup-header'),title=node('strong','',definitionFor(id).title);title.id='panelAppletTitle';header.append(title);
    const pin=button('Keep '+definitionFor(id).title+' expanded','pin-widget');pin.dataset.widgetId=id;pin.textContent='Keep expanded';
    const close=button('Close '+definitionFor(id).title,'close-applet');close.textContent='×';header.append(pin,close);
    const host=node('div','panel-applet-popup-content');host.append(frame.content);element.append(header,host);document.body.append(element);
    appletPopup={id,element,anchor:anchor||frame.summary,frame,workspace:owner(),display:localSlot()};frame.content.hidden=false;frame.content.inert=false;
    if(registry.get(id)){const source=registry.get(id).source;if(registry.get(id).kind==='widget')source.hidden=false;source.inert=false;source.dataset.widgetMode='expanded';source.dataset.panelEdge='left';}if(id==='assistant')root.SpatialAIDesktop?.render?.();if(id==='files')restoreFilesContent();
    frame.summary.setAttribute('aria-expanded','true');if(anchor?.hasAttribute('aria-haspopup'))anchor.setAttribute('aria-expanded','true');if(id==='calendar'&&anchor?.matches('.panel-compact-clock,.time-block,.desktop-widget-summary[data-widget-id="clock"]')){const month=frame.content.querySelector('#systemMonth');if(month)month.open=true;}positionApplet();element.focus({preventScroll:true});root.dispatchEvent(new CustomEvent('spatial-panel-applet-change',{detail:{id,open:true}}));
  }
  function closeMenu(restoreFocus=true){if(!menu)return;const origin=menuOrigin;menu.remove();menu=null;menuOrigin=null;menuScope=null;if(restoreFocus){const fallback=editing?toolbar.querySelector('[data-panel-action="widgets"]'):layoutAnchor();(usableFocus(origin)?origin:fallback)?.focus({preventScroll:true});}}
  function finishPopup(container,focus=true){
    if(menu!==container)return;
    const savedAnchor=popupAnchors.get(container),anchor=usableFocus(savedAnchor?.element)?savedAnchor.element.getBoundingClientRect():savedAnchor?.rect||{left:8,top:8,bottom:8},margin=8,viewportWidth=root.innerWidth||1440,viewportHeight=root.innerHeight||900;
    container.style.maxHeight=Math.max(0,viewportHeight-margin*2)+'px';
    const measured=container.getBoundingClientRect(),width=Math.min(measured.width||300,Math.max(0,viewportWidth-margin*2)),height=Math.min(measured.height||260,Math.max(0,viewportHeight-margin*2)),below=anchor.bottom+6,above=(anchor.top??anchor.bottom)-height-6;
    const top=below+height<=viewportHeight-margin?below:above>=margin?above:Math.max(margin,viewportHeight-height-margin);
    Object.assign(container.style,{left:Math.max(margin,Math.min(viewportWidth-width-margin,anchor.left))+'px',top:top+'px',maxHeight:Math.max(0,viewportHeight-top-margin)+'px'});if(focus)container.focus({preventScroll:true});
  }
  function popup(title,anchor,wide=false){
    const anchorRect=anchor?.getBoundingClientRect?.(),origin=usableFocus(anchor)&&!menu?.contains(anchor)?anchor:menuOrigin;closeMenu(false);closeApplet(false);hideTooltip();menu=node('section',wide?'panel-widget-picker':'panel-context-menu');menuOrigin=origin||layoutAnchor();menu.setAttribute('role','dialog');menu.setAttribute('aria-label',title);menu.tabIndex=-1;
    menuScope={workspace:owner(),display:localSlot(),fullscreen:fullDisplay()};
    const heading=node('header','panel-menu-heading');heading.append(node('strong','',title));const close=button('Close','close-menu');close.textContent='×';heading.append(close);menu.append(heading);document.body.append(menu);
    const rect=anchorRect||{left:root.innerWidth/2-160,top:24,bottom:48};popupAnchors.set(menu,{rect,element:anchor?.isConnected?anchor:null});Object.assign(menu.style,{left:Math.max(8,Math.min(root.innerWidth-(wide?356:300)-8,rect.left))+'px',top:'8px'});return menu;
  }
  function field(container,label,control){const row=node('label','panel-menu-field');row.append(node('span','',label),control);container.append(row);return control;}
  function select(options,current,changeHandler){const value=document.createElement('select');for(const [id,label]of options){const option=node('option','',label);option.value=id;value.append(option);}value.value=String(current);value.addEventListener('change',()=>changeHandler(value.value));return value;}
  function showPanels(anchor){
    const container=popup('Panels',anchor);
    for(const panel of state().panels){
      const row=node('div','panel-choice');row.dataset.panelId=panel.id;
      const label=node('span','panel-choice-label');label.append(node('strong','',panel.label),node('small','',panel.edge[0].toUpperCase()+panel.edge.slice(1)+' · Display '+panel.display));row.append(label);
      const move=button('Move '+panel.label,'move-panel','panel-move-handle surface-key');move.dataset.panelId=panel.id;move.innerHTML=svg('i-menu')+'<span>Move</span>';move.title='Drag to move '+panel.label;move.disabled=panel.mode==='hidden';row.append(move);
      const compact=button(panel.mode==='hidden'?'Show '+panel.label:panel.mode==='compact'?'Expand '+panel.label:'Make '+panel.label+' compact',panel.mode==='hidden'?'show-panel':'compact-panel','panel-choice-compact surface-key');compact.dataset.panelId=panel.id;compact.innerHTML=svg(panel.mode==='compact'||panel.mode==='hidden'?'i-max':'i-min');compact.setAttribute('aria-expanded',String(panel.mode==='expanded'));compact.setAttribute('aria-pressed',String(panel.mode==='compact'));row.append(compact);
      const options=button(panel.label+' options','panel-options');options.dataset.panelId=panel.id;options.textContent='⋯';options.setAttribute('aria-haspopup','dialog');row.append(options);container.append(row);
    }
    container.append(node('small','panel-menu-note','Drag Move to dock a panel on another edge. Resize its border directly.'));
    finishPopup(container);
  }
  function showPanelMenu(id,anchor){
    const panel=state().panels.find(item=>item.id===id);if(!panel)return;const container=popup(panel.label,anchor),edit=button('Edit panel and widget layout','edit');edit.textContent='Edit layout';container.append(edit);const name=document.createElement('input');name.value=panel.label;name.maxLength=60;name.addEventListener('change',()=>{change(M.updatePanel(state(),id,{label:name.value}));closeMenu();});field(container,'Panel name',name);
    field(container,'Dock',select(['left','right','top','bottom'].map(edge=>[edge,edge[0].toUpperCase()+edge.slice(1)]),panel.edge,edge=>{change(M.updatePanel(state(),id,{edge}),'Panel moved to '+edge);closeMenu();}));
    field(container,'Display',select(Array.from({length:displayCount()},(_,index)=>[index+1,'Display '+(index+1)]),Math.min(panel.display,displayCount()),display=>{change(M.updatePanel(state(),id,{display:Number(display)}),'Panel moved to display '+display);closeMenu();}));
    const appearance=button(panel.mode==='hidden'?'Show panel':panel.mode==='compact'?'Expand panel':'Make panel compact',panel.mode==='hidden'?'show-panel':panel.mode==='compact'?'expand-panel':'collapse-panel');appearance.dataset.panelId=id;appearance.textContent=panel.mode==='hidden'?'Show panel':panel.mode==='compact'?'Expand panel':'Make panel compact';container.append(appearance);
    const effectiveDisplay=item=>item.display<=displayCount()?item.display:1;
    if(state().panels.filter(item=>item.edge===panel.edge&&item.mode!=='hidden'&&effectiveDisplay(item)===effectiveDisplay(panel)).length>1){const length=document.createElement('input');length.type='range';length.min='.1';length.max='5';length.step='.1';length.value=panel.share;length.setAttribute('aria-label','Panel length');length.addEventListener('change',()=>change(M.updatePanel(state(),id,{share:Number(length.value)})));field(container,'Panel length',length);}
    const widgets=button('Choose widgets','widgets');widgets.textContent='Choose widgets';widgets.dataset.targetPanel=id;container.append(widgets);

    const hide=button('Hide panel','hide-panel');hide.dataset.panelId=id;hide.textContent='Hide panel';hide.disabled=panel.mode==='hidden';container.append(hide);
    const remove=button('Remove panel','remove-panel');remove.dataset.panelId=id;remove.textContent='Remove panel';remove.disabled=state().panels.length===1;container.append(remove,node('small','panel-menu-note','Widgets move to another panel when this panel is removed.'));finishPopup(container);
  }
  function showWidgetMenu(id,anchor){
    const definition=definitionFor(id),current=state(),panel=current.panels.find(item=>item.widgets.includes(id));if(!panel)return;const container=popup(definition.title,anchor);
    field(container,'Panel',select(current.panels.map(item=>[item.id,item.label]),panel.id,destination=>{change(M.moveWidget(state(),id,destination),definition.title+' moved');closeMenu();}));
    if(!isSpacer(id)&&id!=='launcher')field(container,'Appearance',select([['expanded','Expanded widget'],['compact','Icon']],current.widgets[id].mode,mode=>{if(mode==='expanded')ensureVisible(id);else change(M.updateWidget(state(),id,{mode}));closeMenu();}));

    const ordering=node('div','panel-widget-order'),position=panel.widgets.indexOf(id);for(const [label,step]of [['Move earlier',-1],['Move later',1]]){const move=button(label,'reorder-widget');move.textContent=label;move.dataset.widgetId=id;move.dataset.step=String(step);move.disabled=position+step<0||position+step>=panel.widgets.length;ordering.append(move);}container.append(ordering);
    if(!isSpacer(id)&&id!=='launcher'){const auto=button('Fit content automatically','auto-widget');auto.textContent='Fit content automatically';auto.dataset.widgetId=id;container.append(auto,node('small','panel-menu-note',registry.get(id)?.sourceMetadata?.scope||'Workspace'));}
    if(id==='notifications'){const clear=button('Clear notifications','clear-notifications');clear.textContent='Clear notifications';clear.disabled=!document.querySelector('#notificationWidget .notification');container.append(clear);}
    const remove=button('Remove '+definition.title+' from panel','remove-widget');remove.textContent='Remove widget';remove.dataset.widgetId=id;container.append(remove);finishPopup(container);
  }
  function showPicker(anchor,targetPanel){
    const container=popup('Widgets & panels',anchor,true),current=state();container.append(node('p','panel-menu-note','Drag widgets in Edit layout, or choose their panel and order here. Add Spacer wherever you need flexible space.'));
    for(const definition of M.catalog){const ownerPanel=current.panels.find(item=>item.widgets.includes(definition.id)),row=node('div','panel-widget-choice');
      if(definition.id==='spacer'){const destination=targetPanel&&current.panels.some(panel=>panel.id===targetPanel)?targetPanel:current.panels.find(panel=>panel.mode!=='hidden')?.id||current.panels[0].id,title=node('span','panel-widget-choice-label');title.innerHTML=svg(iconNames.spacer);title.append(node('b','','Spacer'),node('small','','Flexible space · Add more than once'));row.append(title);const add=button('Add Spacer','add-spacer');add.textContent='Add';add.dataset.targetPanel=destination;row.append(add);const panelSelect=select(current.panels.map(panel=>[panel.id,panel.label]),destination,value=>{add.dataset.targetPanel=value;});panelSelect.setAttribute('aria-label','Panel for Spacer');row.append(panelSelect);container.append(row);continue;}

      const title=node('span','panel-widget-choice-label');title.innerHTML=svg(iconNames[definition.id]);title.append(node('b','',definition.title),node('small','',registry.get(definition.id)?.sourceMetadata?.scope||'Workspace'));row.append(title);
      const toggle=button((current.widgets[definition.id].mode==='hidden'?'Add ':'Remove ')+definition.title,'toggle-widget');toggle.dataset.widgetId=definition.id;toggle.dataset.targetPanel=targetPanel||'';toggle.textContent=current.widgets[definition.id].mode==='hidden'?'Add':'Remove';toggle.setAttribute('aria-pressed',String(current.widgets[definition.id].mode!=='hidden'));row.append(toggle);
      const destination=select(current.panels.map(panel=>[panel.id,panel.label]),ownerPanel?.id,value=>{change(M.moveWidget(state(),definition.id,value),definition.title+' moved');showPicker(anchor,targetPanel);});destination.setAttribute('aria-label','Panel for '+definition.title);row.append(destination);
      const options=button(definition.title+' widget options','widget-options','panel-widget-choice-options surface-key');options.textContent='⋯';options.dataset.widgetId=definition.id;options.disabled=current.widgets[definition.id].mode==='hidden';row.append(options);container.append(row);
    }
    const hidden=current.panels.filter(panel=>panel.mode==='hidden');if(hidden.length){container.append(node('strong','panel-menu-subtitle','Hidden panels'));for(const panel of hidden){const show=button('Show '+panel.label,'show-panel');show.dataset.panelId=panel.id;show.textContent='Show '+panel.label;container.append(show);}}
    finishPopup(container);
  }
  function help(anchor){const container=popup('Panels and widgets',anchor,true);for(const text of ['Compact and expanded panels keep the same widgets, order and actions. Select any widget icon to open its live content; Escape or a click outside closes it.','Keep expanded pins the content into its panel. Use Edit layout → Panels to switch a whole panel between compact and expanded.','Right-click a panel → Edit layout → Panels, then drag Move to dock the whole panel on another edge. Drag the panel border to resize it.','In Edit layout, drag a widget to reorder it or move it between panels. Click it for widget options. Normal use keeps its original controls.','Add Spacer from Widgets wherever you need flexible space. Drag or remove it in Edit layout like any other widget; you can add it more than once.','Each Workspace remembers its own layout. Removing a widget keeps its content.'])container.append(node('p','panel-help-paragraph',text));finishPopup(container);}

  document.addEventListener('pointerover',event=>{const anchor=event.target.closest('.desktop-widget-summary');if(anchor&&!anchor.contains(event.relatedTarget))showTooltip(anchor);});
  document.addEventListener('pointerout',event=>{const anchor=event.target.closest('.desktop-widget-summary');if(anchor&&!anchor.contains(event.relatedTarget)&&document.activeElement!==anchor)hideTooltip();});
  document.addEventListener('focusin',event=>{const anchor=event.target.closest('.desktop-widget-summary');if(anchor)showTooltip(anchor);});
  document.addEventListener('focusout',event=>{if(event.target.closest('.desktop-widget-summary'))hideTooltip();});
  document.addEventListener('pointerdown',event=>{if(menu&&!menu.contains(event.target))closeMenu(false);if(appletPopup&&!appletPopup.element.contains(event.target)&&!appletPopup.anchor?.contains(event.target))closeApplet(false);},true);
  document.addEventListener('click',event=>{const panel=suppressedPanelClick,widget=suppressedWidgetClick;suppressedPanelClick=null;suppressedWidgetClick=null;if(event.detail!==0&&(panel&&event.target.closest('.desktop-panel')?.dataset.panelId===panel.id||widget&&event.target.closest('.desktop-widget')?.dataset.widgetId===widget.id)){event.preventDefault();event.stopImmediatePropagation();}},true);

  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-panel-action]');if(!target){if(menu&&!menu.contains(event.target))closeMenu(false);return;}const action=target.dataset.panelAction,id=target.dataset.panelId,widget=target.dataset.widgetId;
    if(action==='edit')setEditing(true);else if(action==='done')setEditing(false);else if(action==='close-menu')closeMenu();
    else if(action==='close-applet')closeApplet();
    else if(action==='open-overview')openOverview();
    else if(action==='pin-widget'){closeApplet(false,false);ensureVisible(widget);(editing?frames.get(widget)?.editCover:layoutAnchor())?.focus({preventScroll:true});}
    else if(action==='help')help(target);else if(action==='widgets')showPicker(target,target.dataset.targetPanel);else if(action==='panels')showPanels(target);
    else if(action==='panel-options')showPanelMenu(id,target);else if(action==='widget-options')showWidgetMenu(widget,target);
    else if(action==='add-spacer'){const destination=target.dataset.targetPanel||state().panels[0].id;change(M.addSpacer(state(),destination),'Spacer added');showPicker(layoutAnchor(),destination);menu?.querySelector('[data-panel-action="add-spacer"]')?.focus({preventScroll:true});}
    else if(action==='compact-panel'){const panel=state().panels.find(item=>item.id===id);if(panel){change(M.updatePanel(state(),id,{mode:panel.mode==='compact'?'expanded':'compact'}));showPanels(toolbar.querySelector('[data-panel-action="panels"]'));menu?.querySelector('[data-panel-action="compact-panel"][data-panel-id="'+id+'"]')?.focus({preventScroll:true});}}
    else if(action==='expand-panel'||action==='collapse-panel'){closeMenu(false);closeApplet(false,false);change(M.updatePanel(state(),id,{mode:action==='expand-panel'?'expanded':'compact'}));(editing?toolbar.querySelector('[data-panel-action="panels"]'):layoutAnchor())?.focus({preventScroll:true});}
    else if(action==='compact-widget'){const mode=state().widgets[widget].mode==='compact'?'expanded':'compact';if(mode==='expanded')preferredWidgets[owner()]=widget;change(M.updateWidget(state(),widget,{mode}));if(mode==='compact')frames.get(widget)?.summary.focus({preventScroll:true});}
    else if(action==='clear-notifications'){document.querySelectorAll('#notificationWidget .notification').forEach(item=>item.remove());syncNotifications();closeMenu();}
    else if(action==='expand-widget'){hideTooltip();openApplet(widget==='clock'?'calendar':widget,target);if(widget==='assistant'&&appletPopup?.id==='assistant')root.SpatialAssistantDesktop?.invoke?.();}
    else if(action==='remove-widget'){change(isSpacer(widget)?M.removeSpacer(state(),widget):M.updateWidget(state(),widget,{mode:'hidden'}));closeMenu();layoutAnchor()?.focus({preventScroll:true});}
    else if(action==='toggle-widget'){let next=state(),mode=next.widgets[widget].mode==='hidden'?'compact':'hidden';if(target.dataset.targetPanel&&mode!=='hidden')next=M.moveWidget(next,widget,target.dataset.targetPanel);change(M.updateWidget(next,widget,{mode}));showPicker(layoutAnchor(),target.dataset.targetPanel);menu?.querySelector('[data-panel-action="toggle-widget"][data-widget-id="'+widget+'"]')?.focus({preventScroll:true});}
    else if(action==='show-panel'){closeMenu(false);change(M.updatePanel(state(),id,{mode:'expanded'}));layoutAnchor(id)?.focus({preventScroll:true});}
    else if(action==='hide-panel'){change(M.updatePanel(state(),id,{mode:'hidden'}));closeMenu(false);layoutAnchor()?.focus({preventScroll:true});}
    else if(action==='add-panel'){const next=M.addPanel(state(),'left');change(next,'New panel added');setEditing(true);showPanelMenu(next.panels.at(-1).id,target);}
    else if(action==='remove-panel'){change(M.removePanel(state(),id),'Panel removed; its widgets were kept');closeMenu();}
    else if(action==='reorder-widget'){const panel=state().panels.find(item=>item.widgets.includes(widget));change(M.moveWidget(state(),widget,panel.id,panel.widgets.indexOf(widget)+Number(target.dataset.step)));closeMenu();}
    else if(action==='auto-widget'){preferredWidgets[owner()]=widget;change(M.updateWidget(state(),widget,{size:0}));closeMenu();}
    else if(action==='reset'){delete preferredWidgets[owner()];change(M.defaults(),'Default panel layout restored');closeMenu();}
    else if(action==='undo'){const index=undo.findLastIndex(item=>item.workspace===owner());if(index>=0){sessions[owner()]=undo.splice(index,1)[0].state;save();render();announce('Panel layout restored');}}
    event.stopPropagation();
  });

  const pointEdge=event=>{const rect=shell.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;return [{edge:'left',distance:x/Math.max(1,rect.width)},{edge:'right',distance:(rect.width-x)/Math.max(1,rect.width)},{edge:'top',distance:y/Math.max(1,rect.height)},{edge:'bottom',distance:(rect.height-y)/Math.max(1,rect.height)}].sort((a,b)=>a.distance-b.distance)[0].edge;};
  function widgetDrop(pointer,widgetId){
    const target=[...panels.values()].find(frame=>{const rect=frame.body.getBoundingClientRect();return !frame.element.hidden&&rect.width>0&&rect.height>0&&pointer.clientX>=rect.left&&pointer.clientX<=rect.right&&pointer.clientY>=rect.top&&pointer.clientY<=rect.bottom;});
    if(!target)return null;
    const panel=state().panels.find(item=>item.id===target.element.dataset.panelId),vertical=['left','right'].includes(panel.edge),remaining=panel.widgets.filter(id=>id!==widgetId),body=target.body.getBoundingClientRect();
    let index=remaining.length,reference=null,last=null;
    for(const [position,id]of remaining.entries()){
      const element=frames.get(id)?.element;if(!element||element.hidden)continue;const rect=element.getBoundingClientRect();last={element,rect};
      const before=vertical?(element.dataset.widgetMode==='compact'&&target.element.dataset.mode!=='compact'?pointer.clientY<rect.top||pointer.clientY<=rect.bottom&&pointer.clientX<rect.left+rect.width/2:pointer.clientY<rect.top+rect.height/2):pointer.clientX<rect.left+rect.width/2;
      if(before){index=position;reference={element,rect};break;}
    }

    const row=vertical&&target.element.dataset.mode!=='compact'&&(reference||last)?.element.dataset.widgetMode==='compact';
    let marker;if(row){const item=reference||last;marker={left:Math.max(0,(reference?item.rect.left:item.rect.right)-body.left-1),top:Math.max(0,item.rect.top-body.top),width:3,height:Math.min(item.rect.height,body.height)};}
    else if(vertical)marker={left:0,top:Math.max(0,Math.min(body.height-3,(reference?reference.rect.top:last?last.rect.bottom:body.top)-body.top-1)),width:body.width,height:3};
    else marker={left:Math.max(0,Math.min(body.width-3,(reference?reference.rect.left:last?last.rect.right:body.left)-body.left-1)),top:0,width:3,height:body.height};
    return {panel:panel.id,index,frame:target,marker};
  }
  function beginDrag(event,kind,id){
    if(event.button!==0||drag||kind==='widget'&&!editing)return;
    const panel=state().panels.find(item=>kind==='widget'?item.widgets.includes(id):item.id===id);if(!panel)return;
    event.preventDefault();event.stopImmediatePropagation();closeMenu(false);closeApplet(false);hideTooltip();
    const before=clone(state()),panelFrame=panels.get(panel.id),initialRect=panelFrame.element.getBoundingClientRect();
    drag={kind,id,before,workspace:owner(),display:localSlot(),fullscreen:fullDisplay(),pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,panel,changed:false,extent:['left','right'].includes(panel.edge)?initialRect.width:initialRect.height};
    if(kind==='panel-length')drag.extent=['left','right'].includes(panel.edge)?initialRect.height:initialRect.width;
    document.body.classList.add('panel-is-dragging');const ghost=node('div','panel-drag-label',kind==='widget'?definitionFor(id).title:panel.label),marker=node('div','panel-widget-drop-marker');marker.setAttribute('aria-hidden','true');document.body.append(ghost);
    const matchesPointer=pointer=>drag&&(drag.pointerId==null||pointer.pointerId==null||drag.pointerId===pointer.pointerId);
    const move=pointer=>{
      if(!matchesPointer(pointer))return;if(owner()!==drag.workspace||localSlot()!==drag.display||fullDisplay()!==drag.fullscreen){finish(pointer,true);return;}
      if(Math.hypot(pointer.clientX-drag.startX,pointer.clientY-drag.startY)<5&&!drag.changed)return;drag.changed=true;
      Object.assign(ghost.style,{left:pointer.clientX+14+'px',top:pointer.clientY+14+'px'});
      if(kind==='widget'){
        frames.get(id)?.element.classList.add('is-dragging');const drop=widgetDrop(pointer,id);drag.drop=drop;
        for(const frame of panels.values())frame.element.classList.toggle('is-drop-target',frame===drop?.frame);
        if(drop){drop.frame.body.append(marker);Object.assign(marker.style,Object.fromEntries(Object.entries(drop.marker).map(([key,value])=>[key,value+'px'])));}else marker.remove();return;
      }
      if(kind==='panel'){const edge=pointEdge(pointer);sessions[owner()]=M.updatePanel(before,id,{edge,mode:panel.mode==='hidden'?'expanded':panel.mode});}
      else if(kind==='panel-resize'){const vertical=['left','right'].includes(panel.edge),delta=vertical?pointer.clientX-drag.startX:pointer.clientY-drag.startY,sign=['right','bottom'].includes(panel.edge)?-1:1,proposed=drag.extent+delta*sign;sessions[owner()]=M.updatePanel(before,id,proposed<(vertical?132:80)?{mode:'compact'}:{size:proposed,mode:'expanded'});}
      else{const vertical=['left','right'].includes(panel.edge),delta=vertical?pointer.clientY-drag.startY:pointer.clientX-drag.startX;sessions[owner()]=M.updatePanel(before,id,{share:Math.max(.1,panel.share*(drag.extent+delta)/Math.max(1,drag.extent))});}
      render();
    };
    const finish=(pointer,cancelled=false)=>{
      if(!drag)return;const current=drag;drag=null;document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',cancel,true);document.removeEventListener('keydown',escape,true);ghost.remove();marker.remove();document.body.classList.remove('panel-is-dragging');frames.get(id)?.element.classList.remove('is-dragging');for(const frame of panels.values())frame.element.classList.remove('is-drop-target');
      let next=sessions[current.workspace];sessions[current.workspace]=before;
      const accepted=!cancelled&&current.changed&&owner()===current.workspace&&localSlot()===current.display&&fullDisplay()===current.fullscreen&&(kind!=='widget'||current.drop);
      if(accepted){if(kind==='widget'){next=M.moveWidget(before,id,current.drop.panel,current.drop.index);}change(next,kind==='widget'?'Widget moved':'Panel updated');}else render();fit();
      if(current.changed){if(kind==='widget')suppressedWidgetClick={id};else suppressedPanelClick={id};}
      if(kind==='widget'&&editing&&owner()===current.workspace)frames.get(id)?.editCover.focus({preventScroll:true});
      if(kind==='panel'&&editing&&owner()===current.workspace)toolbar.querySelector('[data-panel-action="panels"]')?.focus({preventScroll:true});
    };
    const up=pointer=>{if(!matchesPointer(pointer))return;move(pointer);finish(pointer);},cancel=pointer=>{if(matchesPointer(pointer))finish(pointer,true);},escape=key=>{if(key.key==='Escape'){key.preventDefault();key.stopImmediatePropagation();finish(event,true);}};
    drag.cancel=()=>finish(event,true);
    document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',cancel,true);document.addEventListener('keydown',escape,true);
  }
  document.addEventListener('pointerdown',event=>{
    suppressedPanelClick=null;suppressedWidgetClick=null;
    const widgetCover=event.target.closest('.panel-widget-edit-cover');if(widgetCover&&editing)return beginDrag(event,'widget',widgetCover.dataset.widgetId);
    const panelHandle=event.target.closest('.panel-move-handle'),panelResize=event.target.closest('.desktop-panel-resizer'),lengthResize=event.target.closest('.desktop-panel-length-resizer');
    if(panelHandle){if(editing)beginDrag(event,'panel',panelHandle.dataset.panelId);return;}
    if(panelResize)return beginDrag(event,'panel-resize',panelResize.dataset.panelId);
    if(lengthResize)return beginDrag(event,'panel-length',lengthResize.dataset.panelId);
  },true);
  document.addEventListener('contextmenu',event=>{
    if(event.target.closest('input,textarea,[contenteditable="true"]'))return;
    const panel=event.target.closest('.desktop-panel'),widget=event.target.closest('.desktop-widget');if(!panel&&!widget)return;
    const context=typeof contextMenuDescriptor==='function'?contextMenuDescriptor(event.target,event.clientX,event.clientY):null;
    if(context&&!['panel','widget'].includes(context.kind))return;
    event.preventDefault();event.stopImmediatePropagation();
    const anchor={getBoundingClientRect:()=>({left:event.clientX,top:event.clientY,bottom:event.clientY})};
    if(widget&&(editing||!panel))showWidgetMenu(widget.dataset.widgetId,anchor);
    else showPanelMenu(panel.dataset.panelId,anchor);
    menuOrigin=panel?.querySelector('.desktop-panel-body')||layoutAnchor();
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){if(drag)return;if(appletPopup){closeApplet();event.preventDefault();event.stopImmediatePropagation();}else if(menu){closeMenu();event.preventDefault();event.stopImmediatePropagation();}else if(editing){setEditing(false);event.preventDefault();event.stopImmediatePropagation();}return;}
    const handle=event.target.closest('.desktop-panel-resizer,.desktop-panel-length-resizer');if(!handle||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)||handle.getAttribute('aria-disabled')==='true')return;
    const panel=state().panels.find(item=>item.id===handle.dataset.panelId),vertical=['left','right'].includes(panel.edge),length=handle.classList.contains('desktop-panel-length-resizer'),alongY=length?vertical:!vertical;
    if(event.key.startsWith('Arrow')&&!(alongY?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight']).includes(event.key))return;
    event.preventDefault();event.stopImmediatePropagation();const delta=['ArrowRight','ArrowDown'].includes(event.key)?16:-16,rect=panels.get(panel.id).element.getBoundingClientRect(),extent=length?(vertical?rect.height:rect.width):(vertical?rect.width:rect.height),sign=!length&&['right','bottom'].includes(panel.edge)?-1:1;
    if(length)change(M.updatePanel(state(),panel.id,{share:event.key==='Home'?1:event.key==='End'?20:panel.share*(extent+delta)/Math.max(1,extent)}));
    else{const proposed=event.key==='Home'?(vertical?264:180):event.key==='End'?640:extent+delta*sign;change(M.updatePanel(state(),panel.id,proposed<(vertical?132:80)?{mode:'compact'}:{size:proposed,mode:'expanded'}));}

  },true);

  root.addEventListener('resize',()=>{drag?.cancel();schedule();fit();});
  root.addEventListener('blur',()=>drag?.cancel());
  root.setInterval(refreshSummaries,1000);
  function isWidgetVisible(id){
    const frame=frames.get(id);return Boolean(frame&&!frame.element.hidden&&!frame.element.closest('.desktop-panel')?.hidden);
  }
  function isWidgetExpanded(id){
    const frame=frames.get(id);return Boolean(frame&&!frame.element.hidden&&(!frame.content.hidden||appletPopup?.id===id));
  }
  function insetsFor(display=localSlot()){
    const full=fullDisplay();return {...M.layout(state(),{...layoutOptions(),display,fullscreen:Boolean(full),fullscreenDisplay:full||1}).insets};
  }
  function replaceSessions(snapshot){
    if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return false;
    if(Object.hasOwn(snapshot,owner())){drag?.cancel();closeMenu(false);closeApplet(false,false);hideTooltip();}
    for(const [workspace,value]of Object.entries(snapshot))if(workspace!=='__proto__')sessions[workspace]=M.normalize(value);
    save();schedule();return true;
  }
  function restoreSession(workspace,snapshot){
    if(!workspace||workspace==='__proto__')return false;
    if(workspace===owner()){drag?.cancel();closeMenu(false);closeApplet(false,false);hideTooltip();}
    if(snapshot)sessions[workspace]=M.normalize(snapshot);else delete sessions[workspace];
    save();schedule();return true;
  }
  root.SpatialPanels={
    state:()=>clone(state()),sessions:()=>clone(sessions),captureSessions:()=>clone(sessions),replaceSessions,restoreSession,insetsFor,
    render,refresh:schedule,edit:setEditing,openApplet,closeApplet,isAppletOpen:id=>appletPopup?.id===id,hasWidget:id=>registry.has(id),isWidgetVisible,isWidgetExpanded,
    reset:()=>{closeApplet(false,false);delete preferredWidgets[owner()];return change(M.defaults(),'Default panel layout restored');},
    moveWidget:(id,panel,index)=>change(M.moveWidget(state(),id,panel,index)),
    updateWidget:(id,patch)=>{let next=M.updateWidget(state(),id,patch);if(patch?.mode==='expanded'){preferredWidgets[owner()]=id;const panel=next.panels.find(item=>item.widgets.includes(id));if(panel)next=M.updatePanel(next,panel.id,{mode:'expanded'});}return change(next);},
    updatePanel:(id,patch)=>change(M.updatePanel(state(),id,patch)),addPanel:edge=>change(M.addPanel(state(),edge)),removePanel:id=>change(M.removePanel(state(),id)),
    showWidget:ensureVisible,addSpacer:(panelId,index)=>change(M.addSpacer(state(),panelId,index)),removeSpacer:id=>change(M.removeSpacer(state(),id))
  };
  render();fit();root.dispatchEvent(new CustomEvent('spatial-panels-ready'));
})(globalThis);
