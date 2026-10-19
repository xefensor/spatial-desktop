/* Overview groups system widgets: desktop, Project, Workspace, system. */
(function(root){
  'use strict';
  function notificationScopes(store,current,profiles){
    return {local:store.list(current),shared:store.list(null),foreign:Object.keys(profiles).filter(id=>id!==current).map(id=>({workspace:id,unread:store.unread(id)}))};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={notificationScopes};return;}
  const panel=document.querySelector('[data-overview-panel="system"]'),body=panel?.querySelector('.overview-system-body');
  if(!body||!root.SpatialSystemScopes)return;
  const make=(tag,className,html='')=>{const el=document.createElement(tag);el.className=className;el.innerHTML=html;return el;};
  function section(scope,label){const el=make('section','overview-system-scope','<header class="overview-system-scope-heading"><h4>'+label+'</h4><span></span></header><div class="overview-system-scope-body"></div>');el.dataset.overviewSystemScope=scope;return el;}
  const desktop=section('desktop','This desktop'),project=section('project','Project'),workspace=section('workspace','Workspace'),system=section('system','System-wide');
  const content=el=>el.querySelector('.overview-system-scope-body');
  const requests=make('div','overview-system-requests');content(desktop).append(requests);
  const projectAgenda=make('button','overview-project-plan','<span><b></b><small></small></span>'+icon('i-right'));projectAgenda.type='button';projectAgenda.dataset.timelinePlanned='';content(project).append(projectAgenda);
  const notifications=$('#overviewNotifications'),notificationEmpty=make('p','overview-system-empty','No notifications in this Workspace');notificationEmpty.id='overviewNotificationEmpty';notifications.append(notificationEmpty);
  const localFocus=make('section','overview-widget overview-workspace-focus','<header><h3>Focus</h3></header>'),focus=panel.querySelector('[data-toggle][aria-label="Focus"]');if(focus)localFocus.append(focus);
  content(workspace).append(notifications,panel.querySelector('.overview-now-playing'),panel.querySelector('.overview-agenda-widget'),localFocus,panel.querySelector('.overview-panels-widget'));
  content(system).append($('#overviewSystemWideNotifications'),$('#overviewWorkspaceNotificationsWidget'),panel.querySelector('.overview-clock-widget'),panel.querySelector('.overview-quick-widget'),panel.querySelector('.overview-connect-widget'));
  const local=make('div','overview-system-local');local.append(desktop,project,workspace);body.replaceChildren(local,system);panel.classList.add('overview-system-scoped');
  let pending=0;
  function render(){
    const profile=workspaceProfiles[activeWorkspace],owner=desktopPages.column(activeWorkspace),space=projectSpaces[owner],page=desktopPages.current(activeWorkspace)+1;
    desktop.querySelector('.overview-system-scope-heading>span').textContent='Desktop '+page;
    project.hidden=!space;project.querySelector('.overview-system-scope-heading>span').textContent=space?.name||'';
    project.style.setProperty('--overview-system-accent',space?.accent||profile.accent);
    workspace.querySelector('.overview-system-scope-heading>span').textContent=profile.label;
    workspace.style.setProperty('--overview-system-accent',profile.accent);
    const models=appWindowStore.snapshot()[activeWorkspace]||{},items=SpatialSystemScopes.requests(models,appState,id=>desktopPages.inColumn(activeWorkspace,id),id=>desktopPages.visible(activeWorkspace,id,localDisplaySlot(),activeDisplayRoster().length),appInfo);
    const key=JSON.stringify(items);if(requests.dataset.rendered!==key){requests.dataset.rendered=key;requests.replaceChildren();
      for(const item of items){const button=make('button','overview-system-request',appArt(item.id)+'<span><b></b><small></small></span>'+icon('i-right'));button.type='button';button.dataset.overviewSystemRequest=item.id;button.querySelector('b').textContent=item.label+' · Needs input';button.querySelector('small').textContent=item.detail;requests.append(button);}
    }
    desktop.hidden=!items.length;
    const plans=root.SpatialTimelineDesktop?.snapshot().plans||[],agenda=SpatialSystemScopes.agendas(plans,activeWorkspace,space?owner:'',Date.now());
    const stamp=item=>item?new Date(item.time).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Add one in Timeline';
    projectAgenda.querySelector('b').textContent=agenda.project?.title||'No upcoming Project plans';projectAgenda.querySelector('small').textContent=stamp(agenda.project);
    $('#workspaceAgendaHeading').textContent=space?'Elsewhere in Workspace':'Next up';$('#workspaceAgendaTitle').textContent=agenda.workspace?.title||(space?'No other upcoming plans':'No upcoming plans');$('#workspaceAgendaMeta').textContent=stamp(agenda.workspace);
    notificationEmpty.hidden=$$('#overviewNotificationList .overview-notification').length>0;
    const store=root.SpatialAllWorkspaces;
    if(store){
      const scopes=notificationScopes(store,activeWorkspace,workspaceProfiles);
      notifications.hidden=false;notifications.setAttribute('aria-label',profile.label+' notifications');notifications.querySelector('h3').textContent='Notifications';notificationEmpty.hidden=scopes.local.length>0;
      const list=$('#overviewSystemWideNotificationList'),fingerprint=JSON.stringify(scopes.shared.map(note=>({id:note.id,...store.content(note)})));
      if(list.dataset.rendered!==fingerprint){list.dataset.rendered=fingerprint;list.replaceChildren();
        for(const note of scopes.shared){const article=make('article','overview-notification','<span><b></b><small></small></span><button type="button" class="dismiss-button">×</button>'),text=store.content(note);article.dataset.notificationId=note.id;article.querySelector('b').textContent=text.title;article.querySelector('small').textContent=text.detail;const dismiss=article.querySelector('button');dismiss.dataset.overviewSystemDismiss=note.id;dismiss.setAttribute('aria-label','Dismiss '+text.title);list.append(article);}
      }
      $('#overviewSystemWideNotificationCount').textContent=scopes.shared.length;$('#overviewSystemWideEmpty').hidden=scopes.shared.length>0;$('#overviewWorkspaceNotificationsWidget').hidden=!scopes.foreign.length;
    }
    root.SpatialWorkspaceNotificationViews?.scan();prepareControlSemantics(panel);
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;render();});}
  panel.addEventListener('click',event=>{const request=event.target.closest('[data-overview-system-request]');if(request){setUniversalSearchOpen(false);openApp(request.dataset.overviewSystemRequest);}const dismiss=event.target.closest('[data-overview-system-dismiss]');if(dismiss)root.SpatialAllWorkspaces?.dismiss(dismiss.dataset.overviewSystemDismiss);});
  const originalPages=updateDesktopPageUi;updateDesktopPageUi=function(...args){const result=originalPages(...args);schedule();return result;};
  const originalSave=saveAppWindows;saveAppWindows=function(...args){const result=originalSave(...args);schedule();return result;};
  const originalAgenda=SpatialSystemScopes.syncAgenda;SpatialSystemScopes.syncAgenda=function(...args){const result=originalAgenda(...args);schedule();return result;};
  const originalNotifications=syncNotifications;syncNotifications=function(...args){const result=originalNotifications(...args);schedule();return result;};
  root.SpatialAllWorkspaces?.subscribe(schedule);
  root.SpatialOverviewSystem={render,notificationScopes};render();
})(typeof globalThis!=='undefined'?globalThis:this);
