/* Production Overview: the same live controls, arranged in a circular snap track. */
(function(){
  'use strict';
  const home=$('#overviewHome'),track=$('#overviewSectionTrack');
  const panels=new Map($$('[data-overview-panel]',track).map(panel=>[panel.dataset.overviewPanel,panel]));
  const labels={timeline:'Timeline',apps:'Apps',projects:'Projects & Home',system:'System'};
  const historyKey='spatial-workspace-timeline-v1',sectionKey='spatial-overview-section-v1';
  const read=key=>{try{return JSON.parse(desktopStorage.getItem(key)||'{}');}catch{return {};}};
  const model=SpatialTimeline.create(read(historyKey));
  let preferred=read(sectionKey),active='apps',scrollTimer=0,wheelTimer=0,wheelTotal=0,wheelLast=0,wheelLocked=false,scrolling=false;
  const reduced=()=>window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const limited=()=>globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('all');
  function allowed(){return SpatialTimeline.sections.filter(id=>!limited()||id==='apps'||id==='projects'&&SpatialGuide.model.allows('projects'));}
  function centre(panel){return panel.offsetLeft+panel.offsetWidth/2-track.clientWidth/2;}
  function setCurrent(id){
    active=id;
    const visible=allowed();
    panels.forEach((panel,name)=>{panel.classList.toggle('is-current',name===id);panel.inert=name!==id;});
    $$('[data-overview-section]',home).forEach(button=>{const name=button.dataset.overviewSection;button.hidden=!visible.includes(name);button.setAttribute('aria-pressed',String(name===id));button.setAttribute('aria-current',name===id?'page':'false');});
    $$('[data-overview-step]',home).forEach(button=>{const name=SpatialTimeline.neighbour(id,Number(button.dataset.overviewStep),visible);button.hidden=visible.length<2;button.setAttribute('aria-label',(Number(button.dataset.overviewStep)<0?'Previous':'Next')+' section: '+labels[name]);$('span',button).textContent=labels[name]||'';});
    $('#overviewSectionStatus').textContent=labels[id]+' section';
    if(!limited()){
      preferred[activeWorkspace]=id;
      try{desktopStorage.setItem(sectionKey,JSON.stringify(preferred));}catch{}
    }
  }
  // Rotate existing panels, never clone their interactive controls or IDs.
  function keepNeighbours(panel){
    const nodes=[...track.children],index=nodes.indexOf(panel);
    if(nodes.length<3||index>0&&index<nodes.length-1)return;
    const current=panels.get(active),before=current.offsetLeft,position=track.scrollLeft;
    track.style.scrollSnapType='none';
    if(index===0)track.prepend(nodes.at(-1));else track.append(nodes[0]);
    track.scrollLeft=position+current.offsetLeft-before;
    track.style.scrollSnapType='';
  }
  function select(id,animate=true){
    if(!allowed().includes(id))id='apps';
    const panel=panels.get(id);if(!panel)return;
    keepNeighbours(panel);setCurrent(id);
    scrolling=true;
    track.scrollTo({left:centre(panel),behavior:animate&&!reduced()?'smooth':'instant'});
    clearTimeout(scrollTimer);scrollTimer=setTimeout(settle,animate&&!reduced()?380:40);
  }
  function settle(){
    if(!track.clientWidth||home.hidden)return;
    scrolling=false;
    const panel=[...panels.values()].filter(panel=>allowed().includes(panel.dataset.overviewPanel)).reduce((nearest,panel)=>Math.abs(centre(panel)-track.scrollLeft)<Math.abs(centre(nearest)-track.scrollLeft)?panel:nearest,panels.get(active));
    setCurrent(panel.dataset.overviewPanel);keepNeighbours(panel);
    if(Math.abs(track.scrollLeft-centre(panel))>1)track.scrollTo({left:centre(panel),behavior:'instant'});
  }
  function refresh(){
    renderTimeline();
    let id=preferred[activeWorkspace]||'apps';
    if(limited())id=['folders','return'].includes(SpatialGuide.model.lesson.id)?'projects':'apps';
    requestAnimationFrame(()=>select(id,false));
  }
  function step(direction){const id=SpatialTimeline.neighbour(active,direction,allowed());if(id&&id!==active)select(id);}
  home.addEventListener('click',event=>{
    const tab=event.target.closest('[data-overview-section]'),edge=event.target.closest('[data-overview-step]');
    if(tab)select(tab.dataset.overviewSection);if(edge)step(Number(edge.dataset.overviewStep));
  });
  track.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(settle,150);},{passive:true});
  track.addEventListener('wheel',event=>{
    if(event.ctrlKey||event.metaKey)return;
    const across=event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY);
    const onHeading=event.target.closest('.overview-zone-heading,.overview-apps-section>.overview-section-heading');
    if(!across&&!onHeading)return; // Lists keep their own vertical scrolling.
    event.preventDefault();event.stopPropagation();
    const delta=across&&!event.shiftKey?event.deltaX:event.deltaY||event.deltaX;
    const now=Date.now();
    if(now-wheelLast>170||Math.sign(wheelTotal)!==Math.sign(delta))wheelTotal=0;
    wheelLast=now;
    clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{wheelLocked=false;wheelTotal=0;},190);
    if(wheelLocked)return;
    wheelTotal+=delta*(event.deltaMode===1?20:event.deltaMode===2?track.clientWidth:1);
    if(Math.abs(wheelTotal)>=24){wheelLocked=true;step(Math.sign(wheelTotal));}
  },{passive:false});
  home.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.target.matches('input,textarea,select,[contenteditable]'))return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);}
  });
  // Tab focus reaches only the current panel; touch / scrollbar navigation still snaps.
  new ResizeObserver(()=>{if(!scrolling&&track.clientWidth&&!home.hidden)select(active,false);}).observe(track);
  function save(){
    model.merge(read(historyKey));
    try{desktopStorage.setItem(historyKey,JSON.stringify(model.snapshot()));}catch{}
  }
  function record(type,data={}){
    if(globalThis.SpatialGuide?.model.active()||desktopSyncApplying)return;
    const app=data.app||'',owner=app&&appInfo[app]?desktopPages.columnOf(activeWorkspace,app):desktopPages.column(activeWorkspace);
    const project=data.project===undefined?(owner==='workspace'?'':owner):(data.project||'');
    const event=model.add({id:globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2),time:Date.now(),workspace:activeWorkspace,type,
      title:data.title||appInfo[app]?.label||'',app,base:appInfo[app]?.base||app,project,projectName:projectSpaces[project]?.name||data.projectName||'',
      page:data.page??(app&&appInfo[app]?desktopPages.pageOf(activeWorkspace,app):desktopPages.current(activeWorkspace)),path:data.path||'',address:data.address||''});
    if(event){save();if($('#universalSearch').classList.contains('is-open'))renderTimeline();}
  }
  const descriptions={'session':'Opened the desktop','workspace':'Switched workspace','app.open':'Opened','app.restore':'Unparked','app.park':'Parked','app.close':'Closed','project.open':'Opened project','project.close':'Closed project','project.switch':'Switched project','desktop.switch':'Switched desktop','file.open':'Opened file','file.folder':'Opened folder','browser.visit':'Visited'};
  function actionFor(event){
    if(event.type==='session'||event.type==='workspace')return '';
    if(event.project&&!projectSpaces[event.project])return '';
    if(event.type.startsWith('file.'))return 'Open';
    if(event.type==='browser.visit')return 'Open';
    if(event.type.startsWith('project.')||event.type==='desktop.switch')return 'Go to';
    if(event.base&&['dolphin','browser','notes','elisa','terminal'].includes(event.base))return 'Open';
    return '';
  }
  function renderTimeline(){
    $('#overviewTimelineWorkspace').textContent=workspaceProfiles[activeWorkspace]?.label||activeWorkspace;
    const events=model.list(activeWorkspace,{type:$('#timelineType').value,query:$('#timelineQuery').value});
    let previousDay='',html='';
    for(const event of events){
      const date=new Date(event.time),day=date.toDateString();
      if(day!==previousDay){const today=new Date().toDateString()===day;html+='<h4 class="timeline-day">'+escapeHtml(today?'Today':date.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'}))+'</h4>';previousDay=day;}
      const info=appInfo[event.app]||appInfo[event.base],symbol=event.type.startsWith('file.')?'i-folder':event.type==='browser.visit'?'i-web':event.type.startsWith('project.')?'i-folder':event.type==='desktop.switch'?'i-monitor':'i-clock';
      const image=info?appArt(event.app in appInfo?event.app:event.base):icon(symbol);
      const project=projectSpaces[event.project],accent=/^#[\da-f]{6}$/i.test(project?.accent||'')?project.accent:'';
      const context=(event.projectName?'<span class="timeline-project-tag"'+(accent?' style="--timeline-project:'+accent+'"':'')+'>'+escapeHtml(event.projectName)+'</span>':'')+'Desktop '+(event.page+1);
      const detail=event.path||event.address||'';
      const name=event.title||(event.type==='desktop.switch'?'Desktop '+(event.page+1):event.type==='workspace'?workspaceProfiles[event.workspace]?.label:'');
      const action=actionFor(event);
      html+='<article class="timeline-entry" role="listitem"><time datetime="'+date.toISOString()+'" title="'+escapeHtml(date.toLocaleString())+'">'+escapeHtml(date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}))+'</time><span class="timeline-entry-icon">'+image+'</span><div><h4>'+escapeHtml(descriptions[event.type]||'')+(name?' · '+escapeHtml(name):'')+'</h4><p>'+context+'</p>'+(detail?'<p>'+escapeHtml(detail)+'</p>':'')+'</div>'+(action?'<button class="timeline-entry-action" data-timeline-open="'+escapeHtml(event.id)+'" aria-label="'+escapeHtml(action+' '+name)+'">'+action+icon('i-right')+'</button>':'')+'</article>';
    }
    $('#timelineEntries').innerHTML=html||'<p class="timeline-empty"><b>'+(model.list(activeWorkspace).length?'No matching activity':'Your activity starts here')+'</b>'+(model.list(activeWorkspace).length?'Try another activity type or search.':'Open an app, visit a folder or switch projects. Your actions will appear here.')+'</p>';
    prepareControlSemantics($('#timelineEntries'));
  }
  function reopen(id){
    const event=model.list(activeWorkspace).find(event=>event.id===id);if(!event||!actionFor(event))return;
    setUniversalSearchOpen(false);
    let column=event.project||'workspace';
    if(event.app&&appInfo[event.app]&&Object.hasOwn(windowMembership[activeWorkspace]||{},event.app)&&['open','minimized'].includes(appState[event.app]))column=desktopPages.columnOf(activeWorkspace,event.app);
    if(column!=='workspace'&&!openProjectNames().includes(column))activateProject(column,false);
    else changeDesktopColumn(column,false);
    const workspace=activeWorkspace;
    const finish=()=>{
      if(activeWorkspace!==workspace)return;
      if(desktopPageAnimating){setTimeout(finish,60);return;}
      if(desktopPages.column(activeWorkspace)!==column)return;
      const page=Math.min(event.page,desktopPages.last(activeWorkspace,column));
      changeDesktopPage(page,false,column);
      if(event.type.startsWith('project.')||event.type==='desktop.switch')return;
      const base=event.type.startsWith('file.')?'dolphin':event.type==='browser.visit'?'browser':event.base;
      const member=Object.hasOwn(windowMembership[activeWorkspace]||{},event.app);
      const existing=event.app&&appInfo[event.app]&&member&&desktopPages.columnOf(activeWorkspace,event.app)===column?event.app:null;
      const app=existing||createAppInstance(base);
      if(!app)return;
      if(existing&&desktopPages.pageOf(activeWorkspace,app)!==page)changeDesktopPage(desktopPages.pageOf(activeWorkspace,app),false,column);
      openApp(app);
      if(event.type==='browser.visit')navigateBrowser(app,event.address);
      if(event.type.startsWith('file.')){
        const folder=event.type==='file.folder'?event.path:event.path.slice(0,event.path.lastIndexOf('/'))||'/';
        renderFileLocation(app,folder);
        if(event.type==='file.open')openAppFile(app,event.path.split('/').at(-1));
      }
    };
    finish();
  }
  $('#timelineEntries').addEventListener('click',event=>{const action=event.target.closest('[data-timeline-open]');if(action)reopen(action.dataset.timelineOpen);});
  $('#timelineType').addEventListener('change',renderTimeline);$('#timelineQuery').addEventListener('input',renderTimeline);
  window.addEventListener('storage',event=>{if(event.key===historyKey){model.merge(read(historyKey));renderTimeline();}});
  globalThis.SpatialOverviewDesktop={select,refresh,step,active:()=>active};
  globalThis.SpatialTimelineDesktop={record,render:renderTimeline};
  // Existing browser history contains actual visits; preserve its original timestamps.
  for(const [workspace,content] of Object.entries(workspaceContent)){
    for(const visit of (content?.history||[]).slice(-100))model.add({id:'legacy-web:'+workspace+':'+visit.time+':'+visit.address,workspace,type:'browser.visit',time:visit.time,title:visit.address,address:visit.address,base:'browser'});
  }
  save();refresh();
})();
