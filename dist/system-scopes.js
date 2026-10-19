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
  // Each scope is an independent widget. The short-lived source bank is used
  // only to assemble the initial controls; panels own the live nodes after mount.
  const bank=document.querySelector('[data-widget-source="system"]');
  if(!bank)return;
  const make=(tag,className,html='')=>{const node=document.createElement(tag);node.className=className;node.innerHTML=html;return node;};
  const timer=document.getElementById('timerWidget'),launch=document.getElementById('launchTimer');
  const devices=document.querySelector('.system-device-stack');
  const requestsWidget=make('section','system-desktop-requests','<p class="system-scope-empty">No pending requests</p>');
  requestsWidget.setAttribute('aria-label','This desktop’s pending requests');requestsWidget.dataset.systemScope='desktop';
  const projectPlan=make('section','system-project-plan','<button type="button" class="next-event" data-timeline-planned><i aria-hidden="true"></i><span><b id="systemProjectAgendaTitle"></b><small id="systemProjectAgendaMeta"></small></span><svg aria-hidden="true"><use href="#i-right"/></svg></button>');
  projectPlan.setAttribute('aria-label','Current project plans');projectPlan.dataset.systemScope='project';
  const focus=make('section','system-focus-controls');focus.setAttribute('aria-label','Workspace focus timer');focus.dataset.systemScope='workspace';focus.append(launch,timer);
  const shared=make('section','system-widget system-shared-alerts','<header class="widget-heading"><div>'+icon('i-bell')+'<h2>System alerts</h2></div><span id="systemWideNotificationCount">0</span></header><div id="systemWideNotificationList"></div>');
  shared.id='systemWideNotificationWidget';shared.hidden=true;shared.dataset.systemScope='system';
  const deviceDetails=make('details','system-device-details','<summary>Connected devices</summary>');deviceDetails.dataset.systemScope='system';deviceDetails.append(devices);
  bank.append(requestsWidget,projectPlan,focus,shared,deviceDetails);
  const obsoleteLaunchers=bank.querySelector('.system-launchers');obsoleteLaunchers?.remove();
  let pending=0;
  function syncAgenda(plans,now=Date.now()){
    const owner=desktopPages.column(activeWorkspace),space=projectSpaces[owner],result=agendas(plans,activeWorkspace,space?owner:'',now);
    projectPlan.hidden=!space;
    projectPlan.style.setProperty('--system-scope-accent',space?.accent||workspaceProfiles[activeWorkspace].accent);
    projectPlan.setAttribute('aria-label',space?space.name+' plans':'Project plans');
    const stamp=(item,showProject=true)=>item?new Date(item.time).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})+(showProject&&item.projectName?' · '+item.projectName:''):'Add in Timeline';
    document.getElementById('systemProjectAgendaTitle').textContent=result.project?.title||'No upcoming plans';document.getElementById('systemProjectAgendaMeta').textContent=stamp(result.project,false);
    document.getElementById('systemAgendaTitle').textContent=result.workspace?.title||(space?'No other upcoming plans':'No upcoming plans');document.getElementById('systemAgendaMeta').textContent=stamp(result.workspace);
    const heading=document.querySelector('.calendar-widget h2');if(heading)heading.textContent=space?'Elsewhere in Workspace':'Next up';
  }
  function render(){
    const page=desktopPages.current(activeWorkspace)+1,bond=desktopPages.selectedFullscreen?.(activeWorkspace),place=bond?'Temporary desktop':'Desktop '+page;
    requestsWidget.setAttribute('aria-label',place+' pending requests');
    const models=appWindowStore.snapshot()[activeWorkspace]||{};
    const items=requests(models,appState,id=>desktopPages.inColumn(activeWorkspace,id),id=>desktopPages.visible(activeWorkspace,id,localDisplaySlot(),activeDisplayRoster().length),appInfo);
    const key=JSON.stringify(items);if(requestsWidget.dataset.rendered!==key){requestsWidget.dataset.rendered=key;requestsWidget.replaceChildren();
      for(const item of items){const button=make('button','system-desktop-request',appArt(item.id)+'<span><b></b><small></small></span>'+icon('i-right'));button.type='button';button.dataset.systemRequest=item.id;button.querySelector('b').textContent=item.label+' · Needs input';button.querySelector('small').textContent=item.detail;requestsWidget.append(button);}
      if(!items.length)requestsWidget.append(make('p','system-scope-empty','No pending requests'));
    }
    launch.hidden=!timer.hidden;
    deviceDetails.hidden=!devices.querySelector('.system-widget:not([hidden])');
    const count=document.querySelectorAll('#systemWideNotificationList .notification').length;shared.hidden=!count;document.getElementById('systemWideNotificationCount').textContent=count;
    syncAgenda(root.SpatialTimelineDesktop?.snapshot().plans||[]);
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;render();});}
  // Panel and applet moves preserve these exact nodes. Delegation therefore
  // follows requests in either presentation without a hidden ancestor bridge.
  document.addEventListener('click',event=>{const request=event.target.closest('[data-system-request]');if(request&&!event.defaultPrevented)openApp(request.dataset.systemRequest);});
  const originalPages=updateDesktopPageUi;updateDesktopPageUi=function(...args){const result=originalPages(...args);schedule();return result;};
  const originalSave=saveAppWindows;saveAppWindows=function(...args){const result=originalSave(...args);schedule();return result;};
  const originalTimer=updateTimer;updateTimer=function(...args){const result=originalTimer(...args);launch.hidden=!timer.hidden;return result;};
  if(typeof MutationObserver==='function'){
    const observer=new MutationObserver(()=>{schedule();root.SpatialWorkspaceNotificationViews?.scan();});
    observer.observe(timer,{attributes:true,attributeFilter:['hidden']});
    for(const list of [document.getElementById('notificationList'),document.getElementById('systemWideNotificationList')])observer.observe(list,{childList:true,subtree:true});
  }
  root.addEventListener('spatial-panels-ready',schedule);
  root.addEventListener('spatial-panel-applet-change',schedule);
  root.SpatialAllWorkspaces?.subscribe(schedule);
  root.SpatialSystemScopes={render,syncAgenda,agendas,requests};
  root.SpatialAllWorkspaces?.refreshLocal?.();
  for(const node of [requestsWidget,projectPlan,focus,shared,deviceDetails])prepareControlSemantics(node);
  render();
})(typeof globalThis!=='undefined'?globalThis:this);
