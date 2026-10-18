/* Display roles use the real linked-window desktop, not a separate mock scene.
   Ordinary desktop membership is retained on normal displays. Side/Assistant
   windows live in a stable Workspace-owned surface and tile there normally. */
(function(root){
  'use strict';
  if(!root.SpatialDisplayRoles)return;
  const key='spatial-display-roles-v1';
  let model=SpatialDisplayRoles.create(readDesktopStorage(key,{})),refreshing=false,lastRole='',lastSetup='';
  const special=role=>role==='side'||role==='assistant';
  const labels={main:'Main workspace',extended:'Extended workspace',assistant:'Assistant',side:'Side space'};
  function connect(){return model.connect(activeDisplayRoster().map((display,index)=>({...display,slot:index+1})));}
  connect();
  const role=(slot=localDisplaySlot())=>model.role(slot)||'main';
  const pinned=id=>{
    if(!extendedDesktopActive())return null;
    const slot=model.windowDisplay(activeWorkspace,id);
    return slot&&special(role(slot))?slot:null;
  };
  function persist(){try{desktopStorage.setItem(key,JSON.stringify(model.snapshot()));}catch{}}
  function referenceOptions(){
    if(!root.SpatialEmptyDesktopResources)return [];
    const options=new Map(),columns=['workspace',...(typeof openProjectNames==='function'?openProjectNames():[])];
    for(const column of columns){
      const resources=root.SpatialEmptyDesktopResources.collect({workspace:activeWorkspace,column,profiles:workspaceProfiles,projects:projectSpaces,downloads:workspaceDownloads.snapshot(),stashRows:path=>root.SpatialMemoryDesktop?.fileRows(path)});
      for(const [kind,rows] of [['folder',resources.folders],['file',resources.files]])for(const row of rows){
        if(row.target&&!options.has(row.target))options.set(row.target,{kind,path:row.target,label:row.label,detail:row.detail});
      }
    }
    return [...options.values()].slice(0,150);
  }
  function openReference(reference){
    if(!reference||!['folder','file','link'].includes(reference.kind))throw Error('Choose a file, folder or web link.');
    if(reference.kind==='link'){
      let url;try{url=new URL(reference.url);}catch{throw Error('Use a complete web address.');}
      if(!['http:','https:'].includes(url.protocol))throw Error('Use an HTTP or HTTPS web link.');
      const id=createAppInstance('browser');if(!id)throw Error('Firefox could not open.');
      navigateBrowser(id,url.href);captureWorkspaceContent();queueDesktopStateBroadcast(0);return id;
    }
    const path=root.SpatialAssistantFiles.path(reference.path,workspaceProfiles[activeWorkspace].home);
    if(!root.SpatialAssistantFiles.allowed(path,activeWorkspace,workspaceProfiles,projectSpaces,openProjectNames()))throw Error('Choose a location in this Workspace or one of its open Projects.');
    const directory=reference.kind==='file'?path.slice(0,path.lastIndexOf('/'))||'/':path;
    const id=createAppInstance('dolphin');if(!id)throw Error('File Browser could not open.');
    renderFileLocation(id,directory);
    if(reference.kind==='file'){
      const name=path.split('/').at(-1);
      if(!appFileRows(id,directory).some(row=>row[0]===name)){closeApp(id);throw Error('This file is no longer available in the demo.');}
      openAppFile(id,name);
    }
    captureWorkspaceContent();queueDesktopStateBroadcast(0);return id;
  }
  function state(){
    const setup=connect(),local=localDisplaySlot();
    return {setupKey:setup.signature,mainSlot:model.main(),localSlot:local,role:role(local),workspace:workspaceProfiles[activeWorkspace].label,workspaceId:activeWorkspace,home:workspaceProfiles[activeWorkspace].home,
      displays:setup.displays.map(display=>({...display,label:'Display '+display.slot,role:role(display.slot),local:display.slot===local})),
      space:model.space(activeWorkspace,local),referenceOptions:role(local)==='side'?referenceOptions():[],localWindows:Object.keys(appState).filter(id=>appState[id]==='open'&&isLocalApp(id)).map(id=>({id,label:appInfo[id]?.label||id})),
      parkedWindows:model.space(activeWorkspace,local).windows.filter(id=>appState[id]==='minimized'&&pinned(id)===local).map(id=>({id,label:appInfo[id]?.label||id,title:frameFor(id)?.querySelector?.('.app-identity small')?.textContent||appInfo[id]?.label||id}))};
  }
  function notify(){
    if(refreshing)return;
    refreshing=true;
    try{
      const next=state();document.body.dataset.displayRole=next.role;
      if(special(next.role)){
        $('#emptyWorkspace').hidden=true;
        $('.workspace-zone').setAttribute('aria-label',next.workspace+' · '+labels[next.role]+' · Display '+next.localSlot);
        const page=$('.desktop-context-page');if(page)page.textContent=labels[next.role];
      }
      if(next.setupKey!==lastSetup||next.role!==lastRole){lastSetup=next.setupKey;lastRole=next.role;persist();}
      root.SpatialDisplaySettings?.refresh();root.SpatialDisplayWorkbench?.refresh();
      root.dispatchEvent(new CustomEvent('spatial-display-roles-change'));
      root.dispatchEvent(new CustomEvent('spatial-display-role-change'));
    }finally{refreshing=false;}
  }
  function detachTiles(id){
    for(const [context,session] of Object.entries(tileSessions)){
      if(!context.startsWith(activeWorkspace+':'))continue;
      if(!session||typeof session!=='object')continue;
      if(session.focus?.name===id)leaveTileFocus(session,true);
      if(session.fullscreen?.name===id)leaveAppFullscreen(session);
      session.root=tileEngine.remove(session.root,id);
      delete session.floating?.[id];delete session.parked?.[id];
      if(session.focus?.name===id)session.focus=null;
      if(session.fullscreen?.name===id)session.fullscreen=null;
    }
    frameFor(id)?.classList.remove('is-fullscreen','is-maximized');
    appMaximizedState[id]=false;
  }
  function pin(id,slot){
    if(!appInfo[id])return;
    detachTiles(id);releaseBorrowedApp(id);desktopPages.removeFullscreen(activeWorkspace,id);
    removeWindowFromSavedProjects(id);
    windowMembership[activeWorkspace] ||= {};windowMembership[activeWorkspace][id]=null;
    desktopPages.assign(activeWorkspace,id,0,'workspace');
    model.pinWindow(activeWorkspace,slot,id);
    displayAssignmentsFor().apps[id]=slot;
  }
  function settle(){
    persist();persistDisplayAssignments();saveDesktopPages();saveTileSessions();saveIndependentSessions();
    syncApps();refreshIntentAreas();layoutDockAreas(false,false);renderTileLayout(frontApp);notify();queueDesktopStateBroadcast(0);
  }
  function setRole(slot,next){
    connect();slot=Number(slot);
    const previousMain=model.main(),result=model.setRole(slot,next);
    if(!result.ok)throw new Error(result.reason==='choose-main-first'?'Choose another display as Main workspace first.':'This role needs a connected second display.');
    if(!result.changed)return true;
    placementUndoEpoch++;
    if(special(result.previous)&&!special(next)){
      for(const workspace of Object.keys(workspaceProfiles))for(const id of model.space(workspace,slot).windows){
        if(workspace===activeWorkspace)detachTiles(id);
        model.unpinWindow(workspace,id);
        const column=desktopPages.column(workspace);desktopPages.assign(workspace,id,desktopPages.current(workspace),column);
        windowMembership[workspace] ||= {};windowMembership[workspace][id]=column==='workspace'?null:column;
        displayAssignmentsFor(workspace).apps[id]=slot;
      }
    }
    if(special(next)){
      for(const id of Object.keys(appState))if(appState[id]==='open'&&Number(displayAssignmentsFor().apps[id]||1)===slot&&desktopPages.visible(activeWorkspace,id,slot,activeDisplayRoster().length))pin(id,slot);
    }
    for(const workspace of Object.keys(workspaceProfiles)){
      const assignments=displayAssignmentsFor(workspace);
      for(const name of areaPriority)if(special(role(Number(assignments.areas[name]||1)))||next==='main'&&Number(assignments.areas[name]||1)===previousMain)assignments.areas[name]=model.main();
    }
    settle();showToast('Display '+slot+' · '+labels[next]);return true;
  }
  const originalLocal=isLocalApp;
  isLocalApp=function(id){
    if(!extendedDesktopActive()&&model.windowDisplay(activeWorkspace,id))return true;
    const slot=pinned(id);if(slot)return slot===localDisplaySlot();
    if(special(role()))return false;
    return originalLocal(id);
  };
  const originalArea=isLocalArea;
  isLocalArea=function(name){
    if(special(role()))return false;
    const intended=Number(intentAreaPlan.moves[name]||displayAssignmentsFor().areas[name]||1);
    if(special(role(intended)))return localDisplaySlot()===model.main()&&!areaFor(name)?.hidden;
    return originalArea(name);
  };
  const originalTileKey=tileContextKey;
  tileContextKey=function(){return special(role())?activeWorkspace+':display-role:'+role()+':'+localDisplaySlot():originalTileKey();};
  const originalIntentPrefix=intentContextPrefix;
  intentContextPrefix=function(){return special(role())?activeWorkspace+':display-role:'+role()+':':originalIntentPrefix();};
  const originalTileBounds=tileBounds;
  tileBounds=function(){
    const bounds=originalTileBounds();if(!special(role()))return bounds;
    const panel=role()==='assistant'?(window.innerWidth>=1100?380:window.innerWidth>=900?340:window.innerWidth>=600?300:280):(window.innerWidth>=900?240:window.innerWidth>=600?200:160);
    return {...bounds,x:bounds.x+panel,width:Math.max(1,bounds.width-panel)};
  };
  const originalPage=changeDesktopPage;
  changeDesktopPage=function(...args){if(special(role()))return false;return originalPage(...args);};
  const originalUi=updateDesktopPageUi;
  updateDesktopPageUi=function(...args){const result=originalUi(...args);notify();return result;};
  const originalSync=syncApps;
  syncApps=function(...args){const result=originalSync(...args);notify();return result;};
  const originalRebalance=rebalanceAreaDisplays;
  rebalanceAreaDisplays=function(...args){
    connect();if(model.main()!==1||Object.values(model.roles()).some(special))return false;
    return originalRebalance(...args);
  };
  const originalPresence=updateDesktopSyncPresence;
  updateDesktopSyncPresence=function(...args){connect();const result=originalPresence(...args);notify();return result;};
  const originalLabel=localDisplayRoleLabel;
  localDisplayRoleLabel=function(){return extendedDesktopActive()?'Display '+localDisplaySlot()+' · '+labels[role()]:originalLabel();};
  const originalTransfer=transferAppToDisplay;
  transferAppToDisplay=function(id,target,...args){
    connect();target=Number(target);
    if(!special(role(target))&&!pinned(id))return originalTransfer(id,target,...args);
    if(!appInfo[id]||!model.role(target)||!extendedDesktopActive())return;
    detachTiles(id);model.unpinWindow(activeWorkspace,id);
    if(special(role(target)))pin(id,target);
    else{
      const column=desktopPages.column(activeWorkspace);desktopPages.assign(activeWorkspace,id,desktopPages.current(activeWorkspace),column);
      windowMembership[activeWorkspace] ||= {};windowMembership[activeWorkspace][id]=column==='workspace'?null:column;
      displayAssignmentsFor().apps[id]=target;
    }
    appState[id]='open';settle();showToast(appInfo[id].label+' moved to Display '+target+' · '+labels[role(target)]);
  };
  const originalAreaTransfer=transferAreaToDisplay;
  transferAreaToDisplay=function(name,target,...args){
    if(special(role(Number(target)))){showToast('Place Areas on a Main or Extended workspace display. '+labels[role(Number(target))]+' has its own tools.');return;}
    return originalAreaTransfer(name,target,...args);
  };
  const originalOpen=openApp;
  openApp=function(id,...args){
    if(!appInfo[id])return;
    const slot=model.windowDisplay(activeWorkspace,id);
    if(special(role())){
      if(appInfo[id].workspace&&appInfo[id].workspace!==activeWorkspace)return;
      pin(id,localDisplaySlot());appState[id]='open';frontApp=id;settle();bringToFront(id);return id;
    }
    if(slot){
      // Choosing an existing side window explicitly brings it to this desktop.
      model.unpinWindow(activeWorkspace,id);detachTiles(id);
      const column=desktopPages.column(activeWorkspace);desktopPages.assign(activeWorkspace,id,desktopPages.current(activeWorkspace),column);
      windowMembership[activeWorkspace] ||= {};windowMembership[activeWorkspace][id]=column==='workspace'?null:column;
      persist();
    }
    return originalOpen(id,...args);
  };
  const originalClose=closeApp;
  closeApp=function(id,...args){const result=originalClose(id,...args);if(appState[id]==='closed'){model.unpinWindow(activeWorkspace,id);persist();}notify();return result;};
  const originalCapture=captureDesktopSyncState;
  captureDesktopSyncState=function(){return {...originalCapture(),displayRoles:model.snapshot()};};
  const originalApply=applyDesktopSyncState;
  applyDesktopSyncState=function(incoming){
    if(!incoming)return originalApply(incoming);
    if(incoming.displayRoles){model.load(incoming.displayRoles);connect();persist();}
    const same=incoming.activeWorkspace===activeWorkspace,focused=desktopHasWindowFocus,localFront=frontApp;
    const packet=same?{...incoming,desktopHasWindowFocus:focused,frontApp:localFront}:incoming;
    const result=originalApply(packet);
    if(same&&localFront&&appState[localFront]==='open'&&isLocalApp(localFront)){frontApp=localFront;desktopHasWindowFocus=focused;}
    notify();return result;
  };
  // Placement undo also restores surface membership when a drag is undone.
  const originalPlacement=capturePlacement;
  capturePlacement=function(){return {...originalPlacement(),displayRoles:model.snapshot()};};
  const originalRestore=restorePlacement;
  restorePlacement=function(saved){if(saved.workspace===activeWorkspace&&saved.displayRoles){model.load(saved.displayRoles);connect();persist();}const result=originalRestore(saved);notify();return result;};
  const originalContext=contextMenuEntries;
  contextMenuEntries=function(context){
    let entries=originalContext(context).filter(entry=>!(context.kind==='area'&&entry.action==='area-move-display'&&special(role(otherDisplaySlot()))));
    if(context.kind==='app'&&pinned(context.name)){
      const info=entries.find(item=>item.info);if(info)info.info=appInfo[context.name].label+' · '+labels[role(pinned(context.name))]+' · Display '+pinned(context.name)+' · '+workspaceProfiles[activeWorkspace].label+' Workspace';
      const entry=entries.find(item=>item.action==='app-open');
      if(entry){entry.label=pinned(context.name)===localDisplaySlot()?'Focus':'Bring here from '+labels[role(pinned(context.name))];entry.detail='Display '+pinned(context.name)+' · '+workspaceProfiles[activeWorkspace].label+' Workspace';}
    }
    if(context.kind!=='desktop')return entries;
    if(root.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('systems'))return entries;
    if(special(role())){
      entries=entries.filter(entry=>!entry.action?.startsWith('desktop-page:')&&!['desktop-new-folder','desktop-paste'].includes(entry.action)&&!entry.label?.startsWith('Project · '));
      entries=entries.filter((entry,index,all)=>!entry.separator||(index>0&&!all[index-1].separator));
      const info=entries.find(entry=>entry.info);if(info)info.info=labels[role()]+' · Display '+localDisplaySlot()+' · '+workspaceProfiles[activeWorkspace].label+' Workspace · all desktops and Projects';
    }
    const direct=entries.findIndex(entry=>entry.action==='desktop-settings'),shared=entries.findIndex(entry=>entry.label==='System-wide');
    const choices=extendedDesktopActive()?Object.entries(labels).map(([id,label])=>({action:'display-role:'+id,icon:'i-monitor',label,checked:role()===id,disabled:role()==='main'&&id!=='main',detail:role()==='main'&&id!=='main'?'Choose another display as Main workspace first':''})):[{info:'This is your only display. Add a second demo display in Displays.'}];
    choices.push({separator:true},{action:'display-settings',label:'Open Displays',icon:'i-settings'});
    entries.splice(direct>=0?direct:shared>=0?shared:entries.length,0,{label:'Display role',icon:'i-monitor',children:choices});
    return entries;
  };
  const originalExecute=executeContextAction;
  executeContextAction=function(action){
    if(action==='desktop-settings'||action==='display-settings'){closeDesktopContextMenu();root.SpatialDisplaySettings.open();return;}
    if(action.startsWith('display-role:')){closeDesktopContextMenu();setRole(localDisplaySlot(),action.slice(13));return;}
    return originalExecute(action);
  };
  root.SpatialDisplayRoleBridge={state,setRole,openReference,openDisplays:slot=>root.SpatialDisplaySettings.open(slot),
    openWindow(id){if(pinned(id)!==localDisplaySlot()||appState[id]==='closed')return false;openApp(id);return true;},
    windowContextKey(id){const slot=pinned(id);return slot?activeWorkspace+':display-role:'+role(slot)+':'+slot:null;},
    updateSpace(patch){model.updateSpace(activeWorkspace,localDisplaySlot(),patch);persist();notify();queueDesktopStateBroadcast(0);},
    openCompanion(){
      const url=new URL(location.href);
      url.searchParams.set('display',Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7));
      if(root.SpatialGuide?.model.active()){url.searchParams.set('guide','display');url.searchParams.delete('chapter');url.searchParams.set('practice',SpatialGuide.model.state.sessionId);}
      const child=root.open(url.href,'spatial-demo-display-'+Date.now());if(!child)throw new Error('Allow the demo to open its second browser window, then try again.');return true;
    },
    openFolder(path){const id=createAppInstance('dolphin');if(id){renderFileLocation(id,path);captureWorkspaceContent();queueDesktopStateBroadcast(0);}return id;},
    launchNote(title,text){
      const id=createAppInstance('notes');if(!id)return null;
      const note=SpatialAppTools.activeNote(appWindowModel(id));note.title=title;note.text=text;
      renderNotes(id);saveAppWindows(false);
      captureWorkspaceContent();saveIndependentSessions();queueDesktopStateBroadcast(0);return id;
    }
  };
  document.addEventListener('pointerdown',event=>{
    if(role()==='assistant'&&event.target.closest('[data-app-frame]')){
      const assistant=model.space(activeWorkspace,localDisplaySlot()).assistant;
      if(assistant.status==='working'){model.setAssistant(activeWorkspace,localDisplaySlot(),{status:'paused',result:'You took over the workspace. Resume when you are ready.'});persist();notify();queueDesktopStateBroadcast(0);}
    }
  },true);
  root.addEventListener('resize',()=>notify());
  root.addEventListener('storage',event=>{if(event.key===key){model.load(readDesktopStorage(key,{}));connect();notify();}});
  root.SpatialDisplayRoleDesktop={refresh:notify,snapshot:()=>model.snapshot()};
  notify();settle();
})(globalThis);
