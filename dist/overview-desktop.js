/* Production Overview: the same live controls, arranged in a circular snap track. */
(function(){
  'use strict';
  const home=$('#overviewHome'),track=$('#overviewSectionTrack');
  const panels=new Map($$('[data-overview-panel]',track).map(panel=>[panel.dataset.overviewPanel,panel]));
  const labels={windows:'Windows',apps:'Apps',projects:'Projects & Files',timeline:'Timeline',system:'System'};
  const providers=new Map();
  const separate=new Map();let separateActive='',separateWorkspace='';
  const historyKey='spatial-workspace-timeline-v1',sectionKey='spatial-overview-section-v2';
  const read=key=>{try{const value=JSON.parse(desktopStorage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}};
  const preferences=()=>{try{if(desktopStorage.getItem(sectionKey)!==null)return read(sectionKey);}catch{return {};}return Object.fromEntries(Object.entries(read('spatial-overview-section-v1')).map(([workspace,id])=>[workspace,id==='apps'?'windows':id]));};
  const model=SpatialTimeline.create(read(historyKey));
  const plannerKey='spatial-workspace-planner-v1',planner=SpatialTimeline.createPlanner(read(plannerKey));
  const sessionNotesKey='spatial-timeline-session-notes-v1',sessionNotes=SpatialTimeline.createSessionNotes(read(sessionNotesKey)),groupingKey='spatial-timeline-grouping-v1';
  const expandedSessions=new Set();let groupActivity=read(groupingKey).mode!=='events';
  let preferred=preferences(),active='windows',scrollTimer=0,wheelTimer=0,wheelTotal=0,wheelLast=0,wheelLocked=false,scrolling=false,recordingSuspended=0,trackWidth=0,selection=0,formWorkspace=activeWorkspace;
  const reduced=()=>window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const limited=()=>globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('all');
  function allowed(){return [...SpatialTimeline.sections,...[...providers].filter(([,provider])=>provider.available()).map(([id])=>id)].filter(id=>!globalThis.SpatialGuide?.model.active()||['windows','apps'].includes(id)||SpatialGuide.model.allows(({projects:'projects',timeline:'timeline',system:'overview-system'})[id]||'all'));}
  function centre(panel){return panel.offsetLeft+panel.offsetWidth/2-track.clientWidth/2;}
  function setCurrent(id){
    active=id;
    const visible=allowed();
    panels.forEach((panel,name)=>{panel.classList.toggle('is-current',name===id);panel.inert=name!==id;});
    $$('[data-overview-section]',home).forEach(button=>{const name=button.dataset.overviewSection;button.hidden=!visible.includes(name);button.setAttribute('aria-pressed',String(name===id));button.setAttribute('aria-current',name===id?'page':'false');if(name===id)button.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});});
    $$('[data-overview-provider-group]',home).forEach(group=>{group.hidden=!$$('[data-overview-section]',group).some(button=>!button.hidden);});
    $$('[data-overview-step]',home).forEach(button=>{const name=SpatialTimeline.neighbour(id,Number(button.dataset.overviewStep),visible);button.hidden=visible.length<2;button.setAttribute('aria-label',(Number(button.dataset.overviewStep)<0?'Previous':'Next')+' section: '+labels[name]);$('span',button).textContent=labels[name]||'';});
    $('#overviewSectionStatus').textContent=labels[id]+' section';
    if(!limited()){
      preferred[activeWorkspace]=id;
      try{desktopStorage.setItem(sectionKey,JSON.stringify(preferred));}catch{}
    }
  }
  function leaveSeparate(){
    if(!separateActive)return;
    const provider=separate.get(separateActive);separateActive='';
    provider.panel.hidden=true;provider.panel.inert=true;provider.button.setAttribute('aria-pressed','false');provider.button.setAttribute('aria-current','false');provider.close?.();
    $('.overview-carousel-stage',home).hidden=false;$('.overview-carousel-stage',home).inert=false;
    delete home.dataset.globalView;
  }
  function selectSeparate(id){
    const provider=separate.get(id);if(!provider?.available())return;
    leaveSeparate();clearTimeout(scrollTimer);++selection;scrolling=false;
    track.scrollTo({left:track.scrollLeft,behavior:'instant'});separateActive=id;separateWorkspace=activeWorkspace;
    $('.overview-carousel-stage',home).hidden=true;$('.overview-carousel-stage',home).inert=true;
    home.dataset.globalView=id;provider.panel.hidden=false;provider.panel.inert=false;
    $$('[data-overview-section]',home).forEach(button=>{button.setAttribute('aria-pressed','false');button.setAttribute('aria-current','false');});
    provider.button.setAttribute('aria-pressed','true');provider.button.setAttribute('aria-current','page');
    $('#overviewContext').textContent=provider.label+' / System-wide activity';$('#overviewSectionStatus').textContent=provider.label+' section';provider.render();
  }
  // Rotate existing panels, never clone their interactive controls or IDs.
  function keepNeighbours(panel){
    const nodes=[...track.children].filter(node=>allowed().includes(node.dataset.overviewPanel)),index=nodes.indexOf(panel);
    if(nodes.length<3||index>0&&index<nodes.length-1)return;
    const current=panels.get(active),before=current.offsetLeft,position=track.scrollLeft;
    if(index===0)track.prepend(nodes.at(-1));else track.append(nodes[0]);
    track.scrollTo({left:position+current.offsetLeft-before,behavior:'instant'});
  }
  function select(id,animate=true){
    if(separate.has(id)){selectSeparate(id);return;}
    leaveSeparate();
    if(!allowed().includes(id))id='windows';
    const panel=panels.get(id);if(!panel)return;
    panels.forEach((node,name)=>{node.hidden=!allowed().includes(name);});
    clearTimeout(scrollTimer);
    const token=++selection;
    scrolling=true;
    // Stop an interrupted smooth scroll before rotating the physical panels.
    track.scrollTo({left:track.scrollLeft,behavior:'instant'});
    keepNeighbours(panel);setCurrent(id);
    track.scrollTo({left:centre(panel),behavior:animate&&!reduced()?'smooth':'instant'});
    scrollTimer=setTimeout(()=>finishSelection(token),animate&&!reduced()?700:40);
  }
  function finishSelection(token=selection){
    if(token!==selection||!scrolling)return;
    clearTimeout(scrollTimer);
    const left=centre(panels.get(active));
    // Subpixel rounding must not start another scroll / snap cycle.
    if(Math.abs(track.scrollLeft-left)>1)track.scrollTo({left,behavior:'instant'});
    scrolling=false;
  }
  function settle(){
    if(separateActive||scrolling||!track.clientWidth||home.hidden)return;
    const panel=[...panels.values()].filter(panel=>allowed().includes(panel.dataset.overviewPanel)).reduce((nearest,panel)=>Math.abs(centre(panel)-track.scrollLeft)<Math.abs(centre(nearest)-track.scrollLeft)?panel:nearest,panels.get(active));
    if(Math.abs(centre(panel)-track.scrollLeft)>1||panel.dataset.overviewPanel!==active)select(panel.dataset.overviewPanel,true);
  }
  function refresh(){
    filterLauncher();
    if(separateActive&&separateWorkspace!==activeWorkspace)leaveSeparate();
    separate.forEach(provider=>{provider.button.hidden=!provider.available();});
    const column=desktopPages.column(activeWorkspace),project=projectSpaces[column];
    const bond=desktopPages.selectedFullscreen?.(activeWorkspace),page=desktopPages.current(activeWorkspace)+1;
    const local=bond && Math.min(bond.display,activeDisplayRoster().length)===localDisplaySlot();
    const place=local ? (appInfo[bond.name]?.label||'App')+' · temporary desktop · linked to Desktop '+page : 'Desktop '+page+(bond?' · temporary desktop on Display '+bond.display:'');
    $('#overviewContext').textContent=[workspaceProfiles[activeWorkspace]?.label||activeWorkspace,project?.name||'Workspace',place].join(' / ');
    if(formWorkspace!==activeWorkspace){formWorkspace=activeWorkspace;$('#timelinePlanForm').hidden=true;$('#timelineAddToggle').setAttribute('aria-pressed','false');$('#timelineAddToggle').setAttribute('aria-expanded','false');$('#timelinePlanTitle').value='';$('#timelinePlanDetail').value='';}
    renderTimeline();
    const visible=allowed();
    panels.forEach((panel,name)=>{panel.hidden=!visible.includes(name);});
    $$('[data-overview-section]',home).forEach(button=>{button.hidden=!visible.includes(button.dataset.overviewSection);});
    $$('[data-overview-provider-group]',home).forEach(group=>{group.hidden=!$$('[data-overview-section]',group).some(button=>!button.hidden);});
    if(separateActive){const provider=separate.get(separateActive);if(provider.available()){$('#overviewContext').textContent=provider.label+' / System-wide activity';$('#overviewSectionStatus').textContent=provider.label+' section';provider.render();return;}leaveSeparate();}
    // Read the preference in the frame: a later explicit navigation wins.
    requestAnimationFrame(()=>{
      if(separateActive)return;
      let id=preferred[activeWorkspace]||'windows';
      if(globalThis.SpatialGuide?.model.active()){const lesson=SpatialGuide.model.lesson.id;id=['folders','return'].includes(lesson)?'projects':['timeline','timeline-task'].includes(lesson)&&SpatialGuide.model.state.done.includes('timeline-activity')||lesson==='timeline-task'?'timeline':active;if(!allowed().includes(id))id='windows';}
      if(!allowed().includes(id))id='windows';
      if(!scrolling||id!==active)select(id,false);
    });
  }
  function step(direction){const id=SpatialTimeline.neighbour(active,direction,allowed());if(id&&id!==active)select(id);}
  home.addEventListener('click',event=>{
    const special=event.target.closest('[data-overview-separate]');if(special){selectSeparate(special.dataset.overviewSeparate);return;}
    const tab=event.target.closest('[data-overview-section]'),go=event.target.closest('[data-overview-go]'),edge=event.target.closest('[data-overview-step]');
    if(go)select(go.dataset.overviewGo);
    if(tab)select(tab.dataset.overviewSection);if(edge)step(Number(edge.dataset.overviewStep));
  });
  track.addEventListener('scroll',()=>{clearTimeout(scrollTimer);const token=selection;scrollTimer=setTimeout(()=>scrolling?finishSelection(token):settle(),180);},{passive:true});
  track.addEventListener('scrollend',()=>{if(scrolling){if(Math.abs(track.scrollLeft-centre(panels.get(active)))<=1)finishSelection();}else settle();},{passive:true});
  track.addEventListener('pointerdown',()=>{if(scrolling){++selection;scrolling=false;clearTimeout(scrollTimer);track.scrollTo({left:track.scrollLeft,behavior:'instant'});}},{passive:true});
  // Ordinary wheel navigation works throughout Overview. A nested list gets
  // ownership of its axis, including at either edge. The section track itself
  // remains the navigation surface, not a nested horizontal list.
  function ownsScroll(target,across){
    for(let node=target;node&&node!==$('#universalSearch');node=node.parentElement){
      if(node===track)continue;
      const extent=across?node.scrollWidth-node.clientWidth:node.scrollHeight-node.clientHeight;
      const style=window.getComputedStyle(node);
      if(extent>1&&/^(auto|scroll)$/.test(across?style.overflowX:style.overflowY))return true;
    }
    return false;
  }
  $('#universalSearch').addEventListener('wheel',event=>{
    if(separateActive||home.hidden||event.ctrlKey||(globalThis.SpatialDemoSuper?.held()||event.metaKey))return;
    const across=event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY);
    if(event.target.closest('select,input[type=number],input[type=range]')||ownsScroll(event.target,across))return;
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
    if(separateActive)return;
    if(event.altKey||event.ctrlKey||(globalThis.SpatialDemoSuper?.held()||event.metaKey)||event.target.matches('input,textarea,select,[contenteditable]'))return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);$('[data-overview-section="'+active+'"]',home)?.focus({preventScroll:true});}
  });
  // Tab focus reaches only the current panel; touch / scrollbar navigation still snaps.
  new ResizeObserver(()=>{const width=track.clientWidth;if(width&&Math.abs(width-trackWidth)>1){trackWidth=width;if(!home.hidden&&!separateActive)select(active,false);}}).observe(track);
  function save(){
    model.merge(read(historyKey));
    try{desktopStorage.setItem(historyKey,JSON.stringify(model.snapshot()));}catch{}
  }
  function record(type,data={}){
    if(recordingSuspended||globalThis.SpatialGuide?.settingUp||globalThis.SpatialGuide?.displayCompanion||desktopSyncApplying)return;
    const app=data.app||'',owner=app&&appInfo[app]?desktopPages.columnOf(activeWorkspace,app):desktopPages.column(activeWorkspace);
    const project=data.project===undefined?(owner==='workspace'?'':owner):(data.project||'');
    const event=model.add({id:globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2),time:Date.now(),workspace:data.workspace||activeWorkspace,type,
      title:data.title||appInfo[app]?.label||'',app,base:appInfo[app]?.base||app,project,projectName:projectSpaces[project]?.name||data.projectName||'',
      page:data.page??(app&&appInfo[app]?desktopPages.pageOf(activeWorkspace,app):desktopPages.current(activeWorkspace)),path:data.path||'',address:data.address||'',stashId:data.stashId||'',itemId:data.itemId||'',itemVersion:data.itemVersion||'',outputId:data.outputId||'',chatId:data.chatId||'',turnId:data.turnId||'',sourceIds:data.sourceIds||[],detail:data.detail||''});
    if(event){save();if($('#universalSearch').classList.contains('is-open'))renderTimeline();}
  }
  const descriptions={'stash.save':'Saved to Stash','assistant.use':'Used in Assistant','assistant.output':'Saved Assistant output','session':'Opened the desktop','workspace':'Switched workspace','app.open':'Opened','app.restore':'Unparked','app.park':'Parked','app.close':'Closed','project.open':'Opened project','project.close':'Closed project','project.switch':'Switched project','desktop.switch':'Switched desktop','file.open':'Opened file','file.folder':'Opened folder','browser.visit':'Visited','calendar.event':'Calendar','task.due':'Task due','task.complete':'Completed task','task.reopen':'Reopened task','reminder.due':'Reminder'};
  function actionFor(event){
    if(event.type==='session'||event.type==='workspace')return '';
    if(event.type.startsWith('assistant.')&&event.chatId)return 'Open chat';
    if(event.itemId)return 'View item';
    if(event.project&&!projectSpaces[event.project])return '';
    if(event.type==='stash.save')return 'Open Stash';
    if(event.type.startsWith('file.'))return 'Open';
    if(event.type==='browser.visit')return 'Open';
    if(event.type.startsWith('project.')||event.type==='desktop.switch')return 'Go to';
    if(event.base&&['dolphin','browser','notes','elisa','terminal'].includes(event.base))return 'Open';
    return '';
  }
  function timelineActivity(){const events=new Map(sessionNotes.activity(activeWorkspace).map(event=>[event.id,event]));for(const event of model.list(activeWorkspace))events.set(event.id,event);return [...events.values()];}
  function saveSessionNotes(){sessionNotes.merge(read(sessionNotesKey));try{desktopStorage.setItem(sessionNotesKey,JSON.stringify(sessionNotes.snapshot()));}catch{}}
  // Keep this control beside the existing day/type/search controls. It changes
  // only the activity lane; plans continue to use their real start/end times.
  if(typeof document!=='undefined'&&!document.getElementById('timelineGrouping'))$('.timeline-toolbar',home)?.insertAdjacentHTML('beforeend','<button class="surface-key timeline-grouping" id="timelineGrouping" type="button" aria-pressed="true" title="Group nearby activity in the same Project or Workspace; expand to see every event">Sessions</button>');
  $('#timelineGrouping')?.addEventListener('click',()=>{groupActivity=!groupActivity;try{desktopStorage.setItem(groupingKey,JSON.stringify({mode:groupActivity?'sessions':'events'}));}catch{}renderTimeline();});
  let timelineDayWorkspace='',timelineDay='',timelineRenderedDay='',timelineView=null;
  function renderTimeline(){
    $('#overviewTimelineWorkspace').textContent=workspaceProfiles[activeWorkspace]?.label||activeWorkspace;
    const now=Date.now(),today=SpatialTimeline.dayKey(now);
    if(timelineDayWorkspace!==activeWorkspace){timelineDayWorkspace=activeWorkspace;timelineDay=today;}
    const view=SpatialTimeline.lanes(timelineActivity(),planner.list(activeWorkspace),{day:timelineDay,now,includeNow:timelineDay===today,type:$('#timelineType').value,query:$('#timelineQuery').value,groupActivity,expandedSessions:[...expandedSessions]});
    const groupingButton=$('#timelineGrouping');if(groupingButton){groupingButton.textContent=groupActivity?'Sessions':'Events';groupingButton.setAttribute('aria-pressed',String(groupActivity));groupingButton.setAttribute('aria-label',groupActivity?'Sessions shown. Show individual events':'Individual events shown. Group into sessions');}
    $('#timelineDay').innerHTML=view.days.map(day=>'<option value="'+day+'"'+(day===timelineDay?' selected':'')+'>'+escapeHtml(day===today?'Today':new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))+'</option>').join('');
    $('#timelineDay').value=timelineDay;
    timelineView=view;
    const dayIndex=view.days.indexOf(timelineDay);
    $$('[data-timeline-day-step]',home).forEach(button=>{const day=view.days[dayIndex+Number(button.dataset.timelineDayStep)];button.disabled=!day;button.setAttribute('aria-label',(Number(button.dataset.timelineDayStep)<0?'Previous':'Next')+' day with items'+(day?': '+new Date(day+'T12:00:00').toLocaleDateString():''));});
    $('#timelineLatest').disabled=!view.activity.length;
    const clock=time=>new Date(time).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
    function card(event,planned=false){
      const info=appInfo[event.app]||appInfo[event.base],symbol=event.type==='calendar.event'?'i-calendar':event.type.startsWith('task.')?'i-note':event.type==='reminder.due'?'i-bell':event.type==='stash.save'?'i-note':event.type.startsWith('file.')?'i-folder':event.type==='browser.visit'?'i-web':event.type.startsWith('project.')?'i-folder':event.type==='desktop.switch'?'i-monitor':'i-clock';
      const image=info?appArt(event.app in appInfo?event.app:event.base):icon(symbol),project=projectSpaces[event.project],accent=/^#[\da-f]{6}$/i.test(project?.accent||'')?project.accent:'';
      const overdue=planned&&!event.done&&event.type!=='calendar.event'&&event.time<now;
      const source=planned?(event.done?'Completed':overdue?'Overdue':event.endTime>now&&event.time<=now?'Happening now':event.type==='calendar.event'?'Calendar':event.type==='task.due'?'Task':'Reminder'):([descriptions[event.type], 'Desktop '+(event.page+1)].filter(Boolean).join(' · '));
      const name=event.type.startsWith('app.') ? SpatialAppNames.label(event.title||info?.label||'') : event.title||descriptions[event.type]||'',detail=event.path||event.address||event.detail||'',action=planned?'':actionFor(event);
      const completion=planned&&event.type!=='calendar.event'?'<label class="timeline-completion"><input type="checkbox" data-timeline-complete="'+escapeHtml(event.id)+'"'+(event.done?' checked':'')+' aria-label="'+escapeHtml((event.type==='task.due'?'Complete ':'Dismiss reminder ')+name)+'"><span>'+(event.type==='task.due'?'Done':'Dismissed')+'</span></label>':'';
      const context=(event.projectName?'<span class="timeline-project-tag"'+(accent?' style="--timeline-project:'+accent+'"':'')+'>'+escapeHtml(event.projectName)+'</span> · ':'')+source;
      return '<span class="timeline-entry-icon">'+image+'</span><div class="timeline-entry-body"><h4>'+escapeHtml(name)+(event.example?'<span class="timeline-example-label">Example</span>':'')+'</h4><p><time datetime="'+new Date(event.time).toISOString()+'">'+escapeHtml(clock(event.time))+(event.endTime?'–'+escapeHtml(clock(event.endTime)):'')+'</time> · '+context+'</p>'+(planned&&detail?'<p class="timeline-plan-detail">'+escapeHtml(detail)+'</p>':'')+(event.dueTime?'<p class="timeline-plan-detail">Originally due '+escapeHtml(new Date(event.dueTime).toLocaleString())+'</p>':'')+completion+'</div>'+(action?'<button class="timeline-entry-action" data-timeline-open="'+escapeHtml(event.id)+'" aria-label="'+escapeHtml(action+' '+name)+'">'+action+icon('i-right')+'</button>':'');
    }
    const ticks=view.ticks.map(t=>'<div class="timeline-time-rule" style="top:'+t.top+'px"><time>'+escapeHtml(clock(t.time))+'</time></div>').join('');
    function eventCards(events){return events.map(e=>'<article class="timeline-entry" role="listitem" title="'+escapeHtml([descriptions[e.type],e.path||e.address].filter(Boolean).join(' · '))+'">'+card(e)+'</article>').join('');}
    function sessionCard(session){
      const open=expandedSessions.has(session.id),note=sessionNotes.get(session.id,activeWorkspace),label=session.projectName?'Worked on '+session.projectName:'Desktop activity';
      const counts=[session.materials?session.materials+' material'+(session.materials===1?'':'s'):'',session.outputs?session.outputs+' output'+(session.outputs===1?'':'s'):'',session.total+' event'+(session.total===1?'':'s')].filter(Boolean).join(' · '),matched=session.matched!==session.total?' · '+session.matched+' matching':'';
      return '<section class="timeline-work-session'+(open?' is-expanded':'')+'" data-session-card="'+escapeHtml(session.id)+'"><button class="timeline-session-toggle" data-timeline-session="'+escapeHtml(session.id)+'" aria-expanded="'+open+'"><span class="timeline-session-mark">'+icon(session.project?'i-folder':'i-clock')+'</span><span><b>'+escapeHtml(label)+(session.example?'<span class="timeline-example-label">Example</span>':'')+'</b><span><time>'+escapeHtml(clock(session.time))+'–'+escapeHtml(clock(session.endTime))+'</time></span>'+(open?'<span>'+escapeHtml(counts+matched)+'</span>':'')+'<small>'+escapeHtml(open?'Hide details':'Details')+(note?.text?' · Note saved':'')+'</small></span>'+icon('i-down')+'</button>'+(open?'<div class="timeline-session-events" role="list" aria-label="Exact session events">'+eventCards(session.events)+'</div><label class="timeline-session-note">Note about this session<textarea data-timeline-session-note="'+escapeHtml(session.id)+'" maxlength="2000" rows="2" placeholder="What mattered, or where to continue…">'+escapeHtml(note?.text||'')+'</textarea><small>Saved locally with this session’s events.</small></label>':'')+'</section>';
    }
    const activity=view.activity.map(group=>'<div class="timeline-activity-burst" style="top:'+group.top+'px">'+(group.session?sessionCard(group.session):eventCards(group.events))+'</div>').join('');
    const plans=view.plans.map(e=>'<article class="timeline-entry timeline-plan-block'+(e.type==='calendar.event'?' is-duration':'')+(e.done?' is-done':'')+'" role="listitem" data-timeline-plan="'+escapeHtml(e.id)+'" aria-label="'+escapeHtml(e.title+' · '+new Date(e.time).toLocaleString()+(e.endTime?' until '+new Date(e.endTime).toLocaleString():''))+'" title="'+escapeHtml(e.title+(e.detail?' · '+e.detail:''))+'" style="top:'+e.top+'px;height:'+e.height+'px;left:calc('+e.column*100/e.columns+'% + 6px);width:calc('+100/e.columns+'% - 12px)">'+card(e,true)+'</article>').join('');
    const nowLine=timelineDay===today&&view.nowTop>=0&&view.nowTop<=view.height?'<div class="timeline-now" style="top:'+view.nowTop+'px"><span>Now</span></div>':'';
    $('#timelineEntries').innerHTML='<div class="timeline-lane-headings"><span>Time</span><h4>Desktop activity</h4><h4>Calendar & tasks</h4></div><div class="timeline-day-grid" style="height:'+(view.height+30)+'px">'+ticks+'<div class="timeline-activity-lane" role="list" aria-label="Desktop activity">'+activity+'</div><div class="timeline-planned-lane" role="list" aria-label="Calendar, tasks and reminders">'+plans+'</div>'+nowLine+(!activity&&!plans?'<p class="timeline-empty"><b>No items on this day</b>Choose another day, change the filter or add an event.</p>':'')+'</div>';
    prepareControlSemantics($('#timelineEntries'));syncAgenda(now);
    const renderedDay=activeWorkspace+':'+timelineDay;if(timelineRenderedDay!==renderedDay){timelineRenderedDay=renderedDay;const real=view.activity.filter(group=>group.events.some(event=>!event.example));
      const top=real.length?real.at(-1).top:timelineDay===today?view.nowTop:Math.min(...view.activity.map(e=>e.top),...view.plans.map(e=>e.top),view.height);
      $('#timelineScroll').scrollTop=Math.max(0,top-72);}
  }
  function savePlanner(){planner.merge(read(plannerKey));try{desktopStorage.setItem(plannerKey,JSON.stringify(planner.snapshot()));}catch{}}
  function syncAgenda(now=Date.now()){
    const next=planner.list(activeWorkspace).find(event=>!event.done&&(event.time>=now||event.endTime>now));
    for(const id of ['#systemAgendaTitle','#workspaceAgendaTitle'])$(id).textContent=next?.title||'No upcoming events or tasks';
    for(const id of ['#systemAgendaMeta','#workspaceAgendaMeta'])$(id).textContent=next?new Date(next.time).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})+(next.projectName?' · '+next.projectName:''): 'Add one in Timeline';
    globalThis.SpatialSystemScopes?.syncAgenda(planner.list(activeWorkspace),now);
  }
  function showPlanForm(open){
    const form=$('#timelinePlanForm'),toggle=$('#timelineAddToggle');form.hidden=!open;toggle.setAttribute('aria-pressed',String(open));toggle.setAttribute('aria-expanded',String(open));
    if(open){
      $('#timelinePlanProject').innerHTML='<option value="">Workspace</option>'+Object.entries(projectSpaces).map(([id,project])=>'<option value="'+escapeHtml(id)+'">'+escapeHtml(project.name)+'</option>').join('');
      const column=desktopPages.column(activeWorkspace);$('#timelinePlanProject').value=column==='workspace'?'':column;
      const date=new Date();if(globalThis.SpatialGuide?.model.active()&&SpatialGuide.model.lesson.id==='timeline'){date.setTime(SpatialGuide.model.state.timelineActivity?.time||Date.now());date.setMinutes(Math.floor(date.getMinutes()/15)*15,0,0);$('#timelinePlanKind').value='calendar.event';}else date.setHours(date.getHours()+1,0,0,0);const local=new Date(date-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
      $('#timelinePlanTime').value=local;$('#timelinePlanEnd').value=new Date(date.getTime()+3600000-date.getTimezoneOffset()*60000).toISOString().slice(0,16);syncPlanEnd();$('#timelinePlanTitle').focus();
    }else toggle.focus?.({preventScroll:true});
  }
  function syncPlanEnd(){const calendar=$('#timelinePlanKind').value==='calendar.event';$('#timelinePlanEndLabel').hidden=!calendar;$('#timelinePlanEnd').required=calendar;$('#timelinePlanEnd').min=$('#timelinePlanTime').value;}
  $('#timelinePlanKind').addEventListener('change',syncPlanEnd);
  $('#timelinePlanTime').addEventListener('change',()=>{const time=new Date($('#timelinePlanTime').value);if(new Date($('#timelinePlanEnd').value)<=time)$('#timelinePlanEnd').value=new Date(time.getTime()+3600000-time.getTimezoneOffset()*60000).toISOString().slice(0,16);syncPlanEnd();});
  $('#timelineToday').addEventListener('click',()=>{
    timelineDay=SpatialTimeline.dayKey(Date.now());renderTimeline();
    $('#timelineScroll').scrollTop=Math.max(0,timelineView.nowTop-72);
  });
  $('#timelineLatest').addEventListener('click',()=>{
    if(timelineView?.activity.length)$('#timelineScroll').scrollTop=Math.max(0,timelineView.activity.at(-1).top-72);
  });
  $$('[data-timeline-day-step]',home).forEach(button=>button.addEventListener('click',()=>{
    const index=timelineView?.days.indexOf(timelineDay),day=timelineView?.days[index+Number(button.dataset.timelineDayStep)];
    if(day){timelineDay=day;renderTimeline();}
  }));
  $('#timelineDay').addEventListener('change',()=>{timelineDay=$('#timelineDay').value;renderTimeline();});
  function reopen(id){
    const event=timelineActivity().find(event=>event.id===id);if(!event||!actionFor(event))return;
    if(event.type.startsWith('assistant.')&&event.chatId&&globalThis.SpatialAIDesktop?.revealChat){setUniversalSearchOpen(false);SpatialAIDesktop.revealChat(event.chatId,{turnId:event.turnId});return;}
    if(event.itemId&&globalThis.SpatialItemHistoryDesktop?.open){SpatialItemHistoryDesktop.open(event.itemId,{versionId:event.itemVersion,workspace:event.workspace});return;}
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
      if(event.type==='stash.save'){globalThis.SpatialMemoryDesktop?.revealItem(event.stashId,JSON.stringify([workspace,event.project||null]));return;}
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
  $('#timelineEntries').addEventListener('click',event=>{const toggle=event.target.closest('[data-timeline-session]');if(toggle?.dataset.timelineSession){const id=toggle.dataset.timelineSession;if(expandedSessions.has(id))expandedSessions.delete(id);else expandedSessions.add(id);renderTimeline();return;}const action=event.target.closest('[data-timeline-open]');if(action)reopen(action.dataset.timelineOpen);});
  $('#timelineEntries').addEventListener('input',event=>{
    const input=event.target.closest('[data-timeline-session-note]');if(!input?.dataset.timelineSessionNote)return;
    const session=SpatialTimeline.workSessions(timelineActivity()).find(session=>session.id===input.dataset.timelineSessionNote);if(!session)return;
    sessionNotes.put(session,input.value);saveSessionNotes();
  });
  $('#timelineEntries').addEventListener('change',event=>{
    const input=event.target.closest('[data-timeline-complete]');if(!input)return;
    planner.merge(read(plannerKey));const item=planner.complete(activeWorkspace,input.dataset.timelineComplete,input.checked);if(!item)return;
    savePlanner();
    if(item.type==='task.due')record(item.done?'task.complete':'task.reopen',{title:item.title,project:item.project,projectName:item.projectName});
    renderTimeline();
  });
  $('#timelineAddToggle').addEventListener('click',()=>showPlanForm($('#timelinePlanForm').hidden));
  $('#timelinePlanCancel').addEventListener('click',()=>showPlanForm(false));
  $('#timelinePlanForm').addEventListener('submit',event=>{
    event.preventDefault();
    const title=$('#timelinePlanTitle').value.trim(),time=new Date($('#timelinePlanTime').value).getTime(),type=$('#timelinePlanKind').value,project=$('#timelinePlanProject').value;
    if(!title||!Number.isFinite(time)||!['calendar.event','task.due','reminder.due'].includes(type)||project&&!projectSpaces[project])return;
    const endTime=type==='calendar.event'?new Date($('#timelinePlanEnd').value).getTime():0;
    if(type==='calendar.event'&&(!Number.isFinite(endTime)||endTime<=time))return;
    const item=planner.put({endTime,id:globalThis.crypto?.randomUUID?.()||Date.now()+'-plan-'+Math.random().toString(36).slice(2),workspace:activeWorkspace,type,time,title,detail:$('#timelinePlanDetail').value,project,projectName:projectSpaces[project]?.name||''});
    if(!item)return;
    savePlanner();$('#timelinePlanTitle').value='';$('#timelinePlanDetail').value='';$('#timelineType').value='all';$('#timelineQuery').value='';showPlanForm(false);timelineDay=SpatialTimeline.dayKey(time);timelineRenderedDay='';renderTimeline();const entry=$$('.timeline-plan-block',$('#timelineEntries')).find(e=>e.dataset.timelinePlan===item.id);if(entry)$('#timelineScroll').scrollTop=Math.max(0,entry.offsetTop-24);
  });
  $('#timelineType').addEventListener('change',renderTimeline);$('#timelineQuery').addEventListener('input',renderTimeline);
  window.addEventListener('click',event=>{if(!event.target.closest('[data-timeline-planned]')||limited())return;setUniversalSearchOpen(true);$('#timelineType').value='all';$('#timelineQuery').value='';select('timeline',false);renderTimeline();});
  window.addEventListener('storage',event=>{if(event.key===historyKey){model.merge(read(historyKey));renderTimeline();}if(event.key===plannerKey){planner.merge(read(plannerKey));renderTimeline();}if(event.key===sessionNotesKey){sessionNotes.merge(read(sessionNotesKey));renderTimeline();}});
  window.setInterval?.(()=>{if($('#universalSearch').classList.contains('is-open')&&active==='timeline'&&$('#timelinePlanForm').hidden&&!(typeof document!=='undefined'&&document.activeElement?.matches('[data-timeline-session-note]')))renderTimeline();else syncAgenda();},60000);
  function registerSection(id,provider){
    if(SpatialTimeline.sections.includes(id)||!panels.has(id)||typeof provider?.available!=='function')return false;
    providers.set(id,provider);labels[id]=provider.label||id;refresh();return true;
  }
  function closeSeparate(){if(separateActive){leaveSeparate();select(active,false);}}
  function registerSeparateSection(id,provider){
    if(panels.has(id)||separate.has(id)||!provider?.panel||!provider?.button||typeof provider.available!=='function')return false;
    separate.set(id,provider);provider.panel.hidden=true;provider.panel.inert=true;provider.button.hidden=!provider.available();return true;
  }
  globalThis.SpatialOverviewDesktop={select,refresh,step,registerSection,registerSeparateSection,closeSeparate,overviewChanged:()=>closeSeparate(),active:()=>separateActive||active};
  function addPracticeMeeting(time){
    const guide=globalThis.SpatialGuide;
    if(!guide?.model.active()||guide.model.lesson.id!=='timeline'||!Number.isFinite(time))return null;
    const id='guide-review:'+guide.model.state.sessionId+':'+time;
    const existing=planner.get(id);if(existing)return existing;
    const event=planner.put({id,workspace:activeWorkspace,type:'calendar.event',time:time-5*60000,endTime:time+20*60000,title:'Practice review · Guide example',detail:'A practice meeting aligned with your activity. No calendar account is connected.'});
    savePlanner();renderTimeline();return event;
  }
  globalThis.SpatialTimelineDesktop={addPracticeMeeting,record,render:renderTimeline,snapshot:()=>({activity:model.list(activeWorkspace),plans:planner.list(activeWorkspace)}),suspend(action){recordingSuspended++;try{return action();}finally{recordingSuspended--;}}};
  // Existing browser history contains actual visits; preserve its original timestamps.
  for(const [workspace,content] of Object.entries(workspaceContent)){
    for(const visit of (content?.history||[]).slice(-100))model.add({id:'legacy-web:'+workspace+':'+visit.time+':'+visit.address,workspace,type:'browser.visit',time:visit.time,title:visit.address,address:visit.address,base:'browser'});
  }
  // Populate only the demo, once. Keep real activity and original example timestamps.
  const demoKey='spatial-timeline-demo-v1';
  if(typeof desktopPreset!=='undefined'&&desktopPreset==='demo'&&!globalThis.SpatialGuide?.model.active()&&!desktopStorage.getItem(demoKey)){
    SpatialTimeline.demoExamples({preset:desktopPreset,profiles:workspaceProfiles,projects:projectSpaces}).forEach(event=>model.add(event));
    save();
    try{desktopStorage.setItem(demoKey,'1');}catch{}
  }
  const planDemoKey='spatial-timeline-planner-demo-v1';
  if(typeof desktopPreset!=='undefined'&&desktopPreset==='demo'&&!globalThis.SpatialGuide?.model.active()&&!desktopStorage.getItem(planDemoKey)){
    SpatialTimeline.demoPlans({preset:desktopPreset,profiles:workspaceProfiles,projects:projectSpaces}).forEach(event=>planner.put(event));
    savePlanner();try{desktopStorage.setItem(planDemoKey,'1');}catch{}
  }
  save();refresh();
})();
