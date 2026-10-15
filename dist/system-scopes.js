/* System follows the same near-to-wide order as Apps. */
(function(root){
  'use strict';
  function agendas(plans,workspace,project,now){
    const upcoming=plans.filter(item=>item.workspace===workspace && !item.done && (item.time>=now || item.endTime>now)).sort((a,b)=>a.time-b.time);
    return {project:project?upcoming.find(item=>item.project===project):null,workspace:upcoming.find(item=>!project || item.project!==project)};
  }
  function requests(models,states,belongs,visible,info){
    return Object.entries(models).filter(([id,model])=>info[id] && model.ownedDialog && ['open','minimized'].includes(states[id]) && belongs(id) && (states[id]==='minimized'||visible(id))).map(([id,model])=>({id,label:info[id].label,detail:model.previewHidden?'Preview hidden':model.ownedDialog.title||'Needs input'}));
  }
  if(typeof module!=='undefined' && module.exports){module.exports={agendas,requests};return;}
  const area=document.querySelector('[data-area-window="systems"]'),scroll=area?.querySelector('.system-scroll-region');
  if(!scroll)return;
  const make=(tag,className,html='')=>{const node=document.createElement(tag);node.className=className;node.innerHTML=html;return node;};
  const scope=(id,label)=>{
    const node=make('section','system-scope','<header class="system-scope-heading"><span>'+label+'</span><b></b></header><div class="system-scope-body"></div>');
    node.dataset.systemScope=id;node.id='systemScope'+id[0].toUpperCase()+id.slice(1);node.setAttribute('aria-label',label+' controls');return node;
  };
  const desktop=scope('desktop','This desktop'),project=scope('project','Project'),workspace=scope('workspace','Workspace'),system=scope('system','System-wide');
  const body=node=>node.querySelector('.system-scope-body');
  const topRail=area.querySelector('.system-rail-start'),middleRail=area.querySelector('.system-rail-middle');
  const railClock=area.querySelector('.rail-clock'),foreignRail=$('#systemRailWorkspaceNotifications'),phone=area.querySelector('.system-rail-middle [data-phone-ping]');
  const projectRail=make('nav','rail-group system-rail-project','<button type="button" class="surface-key rail-action" id="systemRailProject" aria-label="Show current project plans"><svg aria-hidden="true"><use href="#i-folder"/></svg><span>Project</span><small></small></button>');
  const desktopRail=make('nav','rail-group system-rail-desktop','<button type="button" class="surface-key rail-action" id="systemRailDesktop" aria-label="Show this desktop’s pending requests"><svg aria-hidden="true"><use href="#i-monitor"/></svg><span>Desktop</span><small></small></button>');
  const wideAlerts=make('button','surface-key rail-action',icon('i-bell')+'<span>System</span><small>0</small>');wideAlerts.id='systemRailWideAlerts';wideAlerts.type='button';wideAlerts.hidden=true;
  const globalRail=make('section','rail-group system-rail-global');globalRail.append(railClock,wideAlerts,foreignRail,phone);
  // Keep the original controls and IDs, including their listeners and saved state.
  middleRail.prepend($('#systemRailNotifications'));
  body(desktop).append(make('div','system-desktop-requests','<p class="system-scope-empty">No pending requests</p>'));
  const projectPlan=make('div','system-project-plan','<button type="button" class="next-event" data-timeline-planned><i aria-hidden="true"></i><span><b id="systemProjectAgendaTitle"></b><small id="systemProjectAgendaMeta"></small></span><svg aria-hidden="true"><use href="#i-right"/></svg></button>');body(project).append(projectPlan);
  const timer=$('#timerWidget'),launchers=area.querySelector('.system-launchers'),agenda=area.querySelector('.system-agenda-stack'),dynamic=$('#dynamicWidgetStack'),foreign=$('#workspaceNotificationsWidget');
  const clock=area.querySelector('.time-block'),settings=area.querySelector('.quick-settings'),devices=area.querySelector('.system-device-stack');
  timer.before(document.createComment('Focus is Workspace-local.'));
  const focus=make('div','system-focus-controls');focus.append($('#launchTimer'),timer);
  body(workspace).append(dynamic,focus,agenda);
  $('#layoutModeToggle').hidden=true;body(desktop).append($('#layoutModeToggle'));launchers.remove();topRail.remove();
  const shared=make('section','system-widget system-shared-alerts','<header class="widget-heading"><div>'+icon('i-bell')+'<h2>System alerts</h2></div><span id="systemWideNotificationCount">0</span></header><div id="systemWideNotificationList"></div>');shared.id='systemWideNotificationWidget';shared.hidden=true;
  const deviceDetails=make('details','system-device-details','<summary>Connected devices</summary>');deviceDetails.append(devices);
  body(system).append(foreign,shared,clock,deviceDetails);
  system.append(globalRail,settings);
  scroll.replaceChildren(desktopRail,desktop,projectRail,project,middleRail,workspace,system);
  let pending=0;
  function syncAgenda(plans,now=Date.now()){
    const owner=desktopPages.column(activeWorkspace),space=projectSpaces[owner],result=agendas(plans,activeWorkspace,space?owner:'',now);
    project.hidden=!space;projectRail.hidden=!space;
    project.querySelector('.system-scope-heading b').textContent=space?.name||'';
    project.style.setProperty('--system-scope-accent',space?.accent||workspaceProfiles[activeWorkspace].accent);
    $('#systemRailProject small').textContent=space?.name||'';
    $('#systemRailProject').title=space?'Project plans · '+space.name:'Project plans';
    const stamp=item=>item?new Date(item.time).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})+(item.projectName?' · '+item.projectName:''):'Add one in Timeline';
    $('#systemProjectAgendaTitle').textContent=result.project?.title||'No upcoming project plans';$('#systemProjectAgendaMeta').textContent=stamp(result.project);
    $('#systemAgendaTitle').textContent=result.workspace?.title||'No other upcoming plans';$('#systemAgendaMeta').textContent=stamp(result.workspace);
    $('.calendar-widget h2',area).textContent=space?'Elsewhere in Workspace':'Next up';
  }
  function render(){
    const profile=workspaceProfiles[activeWorkspace],owner=desktopPages.column(activeWorkspace),space=projectSpaces[owner];
    const page=desktopPages.current(activeWorkspace)+1,bond=desktopPages.selectedFullscreen?.(activeWorkspace),place=bond?'Temporary desktop':'Desktop '+page;
    desktop.querySelector('.system-scope-heading b').textContent=place;
    workspace.querySelector('.system-scope-heading b').textContent=profile.label;
    workspace.style.setProperty('--system-scope-accent',profile.accent);
    $('#systemAreaContext').textContent=(space?.name||profile.label)+' · '+place;
    $('#systemRailDesktop small').textContent=String(page);
    const models=appWindowStore.snapshot()[activeWorkspace]||{};
    const items=requests(models,appState,id=>desktopPages.inColumn(activeWorkspace,id),id=>desktopPages.visible(activeWorkspace,id,localDisplaySlot(),activeDisplayRoster().length),appInfo);
    const rack=desktop.querySelector('.system-desktop-requests');
    const key=JSON.stringify(items);if(rack.dataset.rendered!==key){rack.dataset.rendered=key;rack.replaceChildren();
      for(const item of items){const button=make('button','system-desktop-request',appArt(item.id)+'<span><b></b><small></small></span>'+icon('i-right'));button.type='button';button.dataset.systemRequest=item.id;button.querySelector('b').textContent=item.label+' · Needs input';button.querySelector('small').textContent=item.detail;rack.append(button);}
      if(!items.length)rack.append(make('p','system-scope-empty','No pending requests'));
    }
    $('#systemRailDesktop').classList.toggle('has-system-request',items.length>0);$('#systemRailDesktop').title=place+' · '+items.length+' pending '+(items.length===1?'request':'requests');
    $('#launchTimer').hidden=!timer.hidden;
    const count=$$('.notification',$('#systemWideNotificationList')).length;shared.hidden=!count;$('#systemWideNotificationCount').textContent=count;wideAlerts.hidden=!count;wideAlerts.querySelector('small').textContent=count;wideAlerts.setAttribute('aria-label','Show '+count+' system-wide alerts');
    syncAgenda(root.SpatialTimelineDesktop?.snapshot().plans||[]);
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;render();});}
  area.addEventListener('click',event=>{const request=event.target.closest('[data-system-request]');if(request)openApp(request.dataset.systemRequest);});
  $('#systemRailDesktop').addEventListener('click',()=>revealSystemRailWidget('#systemScopeDesktop'));
  $('#systemRailProject').addEventListener('click',()=>revealSystemRailWidget('#systemScopeProject'));
  wideAlerts.addEventListener('click',()=>revealSystemRailWidget('#systemWideNotificationWidget'));
  $('#systemWideNotificationList').addEventListener('click',event=>{const button=event.target.closest('.dismiss-button');if(button)root.SpatialAllWorkspaces?.dismiss(button.closest('[data-notification-id]').dataset.notificationId);});
  const originalPages=updateDesktopPageUi;updateDesktopPageUi=function(...args){const result=originalPages(...args);schedule();return result;};
  const originalSave=saveAppWindows;saveAppWindows=function(...args){const result=originalSave(...args);schedule();return result;};
  const originalTimer=updateTimer;updateTimer=function(...args){const result=originalTimer(...args);$('#launchTimer').hidden=!timer.hidden;return result;};
  if(typeof MutationObserver==='function'){
    const observer=new MutationObserver(()=>{schedule();root.SpatialWorkspaceNotificationViews?.scan();});observer.observe(dynamic,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});observer.observe(timer,{attributes:true,attributeFilter:['hidden']});observer.observe($('#systemWideNotificationList'),{childList:true,subtree:true});
  }
  root.SpatialAllWorkspaces?.subscribe(schedule);
  root.SpatialSystemScopes={render,syncAgenda};
  root.SpatialAllWorkspaces?.refreshLocal?.();
  prepareControlSemantics(area);area.classList.add('system-scopes-ready');render();
})(typeof globalThis!=='undefined'?globalThis:this);
