/* Display roles use the real linked-window desktop, not a separate mock scene.
   Ordinary desktop membership is retained on normal displays. Side/Assistant
   windows live in a stable Workspace-owned surface and tile there normally. */
(function(root){
  'use strict';
  if(!root.SpatialDisplayRoles)return;
  const key='spatial-display-roles-v1';
  const exampleStages=new Set(['plan','source','output','question']);
  let activeExample=null;
  const endedExamples=new Map();
  let model=SpatialDisplayRoles.create(readDesktopStorage(key,{})),refreshing=false,lastRole='',lastSetup='',lastWorkspace=activeWorkspace;
  const special=role=>role==='side'||role==='assistant';
  const labels={main:'Main workspace',extended:'Extended workspace',assistant:'Assistant',side:'Side space'};
  function connect(){return model.connect(activeDisplayRoster().map((display,index)=>({...display,slot:index+1})));}
  function sharedTileContexts(sessions=tileSessions){
    const canonical=new Set(Object.keys(sessions).filter(context=>/:display-role:space:\d+$/.test(context)));
    for(const [context,session] of Object.entries(sessions)){
      const match=/^(.*):display-role:(side|assistant):(\d+)$/.exec(context);if(!match)continue;
      const shared=match[1]+':display-role:space:'+match[3];
      // The current role's old session is the visible layout during migration.
      if(!canonical.has(shared)&&(!sessions[shared]||match[2]===model.role(Number(match[3]))))sessions[shared]=session;
    }
    for(const context of Object.keys(sessions))if(/:display-role:(side|assistant):\d+$/.test(context))delete sessions[context];
  }
  connect();
  sharedTileContexts();
  const role=(slot=localDisplaySlot())=>model.role(slot)||'main';
  const pinned=id=>{
    if(!extendedDesktopActive())return null;
    const slot=model.windowDisplay(activeWorkspace,id);
    return slot&&special(role(slot))?slot:null;
  };
  function persist(){try{desktopStorage.setItem(key,JSON.stringify(model.snapshot()));}catch{}}
  function rememberExample(session){
    endedExamples.set(session.operationId,{workspace:session.context.workspace,slot:session.context.slot});
    if(endedExamples.size>32)endedExamples.delete(endedExamples.keys().next().value);
  }
  function loadDisplayRoles(value){
    // This tab owns its running job. Linked tabs echo whole snapshots, so an
    // older echo must not rewind its question, resurrect a stopped operation,
    // or replace a later result. Persisted revisions also cover old idle
    // snapshots with no operation ID. Window membership and roles still sync.
    const preserved=new Map(),next=JSON.parse(JSON.stringify(value||{})),local=localDisplaySlot();
    const keep=(workspace,slot)=>preserved.set(workspace+':'+slot,{workspace,slot,assistant:model.space(workspace,slot).assistant});
    for(const workspace of Object.keys(model.snapshot().workspaces)){
      const current=model.space(workspace,local).assistant,incoming=next.workspaces?.[workspace]?.displays?.[local]?.assistant;
      if(current.revision>(Number(incoming?.revision)||0))keep(workspace,local);
    }
    if(activeExample)keep(activeExample.context.workspace,activeExample.context.slot);
    for(const [operationId,owner] of endedExamples){
      const incoming=next.workspaces?.[owner.workspace]?.displays?.[owner.slot]?.assistant;
      if(incoming?.context?.operationId===operationId)keep(owner.workspace,owner.slot);
    }
    for(const owner of preserved.values()){
      next.workspaces ||= {};next.workspaces[owner.workspace] ||= {displays:{}};next.workspaces[owner.workspace].displays ||= {};
      next.workspaces[owner.workspace].displays[owner.slot] ||= {};
      next.workspaces[owner.workspace].displays[owner.slot].assistant=owner.assistant;
    }
    // Load the preserved data directly: restoring a snapshot is not a new edit
    // and must not advance its revision merely because another tab echoed it.
    model.load(next);
  }
  function referenceOptions(){
    if(!root.SpatialEmptyDesktopResources)return [];
    const options=new Map(),columns=['workspace',...(typeof openProjectNames==='function'?openProjectNames():[])];
    for(const column of columns){
      const resources=root.SpatialEmptyDesktopResources.collect({workspace:activeWorkspace,column,profiles:workspaceProfiles,projects:projectSpaces,downloads:workspaceDownloads.snapshot(),stashRows:path=>root.SpatialMemoryDesktop?.fileRows(path)});
      for(const [kind,rows] of [['folder',resources.folders],['file',resources.files]])for(const row of rows){
        if(row.path&&!options.has(row.path))options.set(row.path,{kind,path:row.path,label:row.label,detail:row.detail});
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
      space:model.space(activeWorkspace,local),referenceOptions:special(role(local))?referenceOptions():[],localWindows:Object.keys(appState).filter(id=>appState[id]==='open'&&isLocalApp(id)).map(id=>({id,label:appInfo[id]?.label||id})),
      parkedWindows:model.space(activeWorkspace,local).windows.filter(id=>appState[id]==='minimized'&&pinned(id)===local).map(id=>({id,label:appInfo[id]?.label||id,title:frameFor(id)?.querySelector?.('.app-identity small')?.textContent||appInfo[id]?.label||id}))};
  }
  function notify(){
    if(refreshing)return;
    refreshing=true;
    try{
      reconcileAssistantExample();
      let next=state();
      if(lastWorkspace!==activeWorkspace||lastSetup&&lastSetup!==next.setupKey){
        const spaces=model.snapshot().workspaces[lastWorkspace]?.displays||{};let paused=false;
        for(const [slot,space] of Object.entries(spaces))if(space.assistant.status==='working'){
          model.setAssistant(lastWorkspace,slot,{control:'user',status:'paused',context:space.assistant.context?{...space.assistant.context,operationId:''}:null,...(space.assistant.activity&&exampleStages.has(space.assistant.activity.stage)?{activity:{...space.assistant.activity,stage:'interrupted',label:'Example interrupted',detail:'The Workspace or monitor setup changed. Run the example again when you are ready.',question:null}}:{})});paused=true;
        }
        if(paused){persist();queueDesktopStateBroadcast(0);next=state();}
      }
      lastWorkspace=activeWorkspace;
      document.body.dataset.displayRole=next.role;
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
    if(result.previous==='assistant'||next==='assistant')for(const workspace of Object.keys(workspaceProfiles)){
      const previous=model.space(workspace,slot).assistant;
      model.setAssistant(workspace,slot,{control:next==='assistant'?'assistant':'user',status:next==='assistant'?'idle':'paused',context:previous.context?{...previous.context,operationId:''}:null,...(previous.activity&&exampleStages.has(previous.activity.stage)?{activity:{...previous.activity,stage:'interrupted',label:'Example interrupted',detail:'The display role changed. Run the example again when you are ready.',question:null}}:{})});
    }
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
      for(const id of Object.keys(appState))if(appState[id]==='open'&&model.windowDisplay(activeWorkspace,id)!==slot&&Number(displayAssignmentsFor().apps[id]||1)===slot&&desktopPages.visible(activeWorkspace,id,slot,activeDisplayRoster().length))pin(id,slot);
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
  tileContextKey=function(){return special(role())?activeWorkspace+':display-role:space:'+localDisplaySlot():originalTileKey();};
  const originalIntentPrefix=intentContextPrefix;
  intentContextPrefix=function(){return special(role())?activeWorkspace+':display-role:space:':originalIntentPrefix();};
  const originalTileBounds=tileBounds;
  tileBounds=function(){
    const bounds=originalTileBounds();if(!special(role()))return bounds;
    const panel=window.innerWidth>=1100?380:window.innerWidth>=900?340:window.innerWidth>=600?300:280;
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
    if(incoming.displayRoles){loadDisplayRoles(incoming.displayRoles);connect();sharedTileContexts();persist();}
    const same=incoming.activeWorkspace===activeWorkspace,focused=desktopHasWindowFocus,localFront=frontApp;
    const packet={...incoming,...(same?{desktopHasWindowFocus:focused,frontApp:localFront}:{})};
    if(incoming.tileSessions){packet.tileSessions=JSON.parse(JSON.stringify(incoming.tileSessions));sharedTileContexts(packet.tileSessions);}
    const result=originalApply(packet);sharedTileContexts();
    if(same&&localFront&&appState[localFront]==='open'&&isLocalApp(localFront)){frontApp=localFront;desktopHasWindowFocus=focused;}
    notify();return result;
  };
  // Placement undo also restores surface membership when a drag is undone.
  const originalPlacement=capturePlacement;
  capturePlacement=function(){return {...originalPlacement(),displayRoles:model.snapshot()};};
  const originalRestore=restorePlacement;
  restorePlacement=function(saved){
    if(saved.workspace===activeWorkspace&&saved.displayRoles){loadDisplayRoles(saved.displayRoles);connect();persist();}
    const packet={...saved};if(saved.tileSessions){packet.tileSessions=JSON.parse(JSON.stringify(saved.tileSessions));sharedTileContexts(packet.tileSessions);}
    const result=originalRestore(packet);sharedTileContexts();notify();return result;
  };
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
  function assistantContext(){
    const setup=connect(),slot=localDisplaySlot();
    if(role(slot)!=='assistant'||!extendedDesktopActive())throw Error('Assistant can control windows only on its assigned display.');
    return {workspace:activeWorkspace,setup:setup.signature,slot,folder:root.SpatialAIDesktop?.workingFolder?.()||workspaceProfiles[activeWorkspace].home};
  }
  function controlContextMatches(context){return context.workspace===activeWorkspace&&context.slot===localDisplaySlot()&&context.setup===connect().signature&&role(context.slot)==='assistant';}
  function saveAssistant(context,patch){
    const assistant=model.setAssistant(context.workspace,context.slot,patch);persist();notify();queueDesktopStateBroadcast(0);return assistant;
  }
  function exampleIdentity(session){
    const current=model.space(session.context.workspace,session.context.slot).assistant;
    return !session.stopped&&controlContextMatches(session.context)&&current.context?.operationId===session.operationId&&(!session.chatId||root.SpatialAIDesktop?.current?.().id===session.chatId);
  }
  function wakeExample(session){for(const wake of [...session.waiters])wake();session.waiters.clear();}
  function interruptExample(session,detail='The example was interrupted. Run it again when you are ready.'){
    if(!session||session.stopped)return false;
    session.stopped=true;rememberExample(session);session.end={stage:'interrupted',label:'Example interrupted',detail};wakeExample(session);
    const current=model.space(session.context.workspace,session.context.slot).assistant;
    if(current.context?.operationId===session.operationId){
      model.setAssistant(session.context.workspace,session.context.slot,{status:current.control==='user'?'paused':'idle',result:detail,context:{...current.context,operationId:''},activity:{...current.activity,stage:'interrupted',label:'Example interrupted',detail,question:null}});persist();queueDesktopStateBroadcast(0);
    }
    return true;
  }
  function reconcileAssistantExample(){
    if(activeExample){
      if(activeExample.stopped){
        const current=model.space(activeExample.context.workspace,activeExample.context.slot).assistant;
        if(current.context?.operationId===activeExample.operationId){model.setAssistant(activeExample.context.workspace,activeExample.context.slot,{status:current.control==='user'?'paused':'idle',result:activeExample.end?.detail||'Example interrupted.',context:{...current.context,operationId:''},activity:{...current.activity,...activeExample.end,question:null}});persist();queueDesktopStateBroadcast(0);}
      }else if(!activeExample.startingChat&&!exampleIdentity(activeExample))interruptExample(activeExample,'The chat, Workspace or display changed. Run the example again when you are ready.');
      return;
    }
    // Only this display's owner can resume its live closure. After a reload its
    // saved log remains useful, but a persisted question is never a live job.
    const current=model.space(activeWorkspace,localDisplaySlot()).assistant;
    if(role()==='assistant'&&exampleStages.has(current.activity?.stage)&&current.context?.operationId?.startsWith('assistant-example-')){
      model.setAssistant(activeWorkspace,localDisplaySlot(),{status:current.control==='user'?'paused':'idle',result:'Example interrupted by reloading this display. Run it again to continue.',context:{...current.context,operationId:''},activity:{...current.activity,stage:'interrupted',label:'Example interrupted',detail:'This display was reloaded. Saved files and the conversation are kept; choose Run example to start again.',question:null}});persist();queueDesktopStateBroadcast(0);
    }
  }
  function assistantControl(action){
    const context=assistantContext();
    if(!['takeover','resume'].includes(action))throw Error('Choose Take control or Continue.');
    const previous=model.space(context.workspace,context.slot).assistant,session=activeExample;
    const pending=session&&exampleIdentity(session);
    const status=action==='takeover'?'paused':pending?(session.question?'needs-you':'working'):'idle';
    const result=saveAssistant(context,{control:action==='takeover'?'user':'assistant',status,...(action==='takeover'&&!pending?{context:previous.context?{...previous.context,operationId:''}:null}:{})});
    if(pending)wakeExample(session);return result;
  }
  function answerAssistantExample(choiceId,{questionId,operationId}={}){
    const session=activeExample;if(!session||!exampleIdentity(session))throw Error('This example question is no longer active.');
    const current=model.space(session.context.workspace,session.context.slot).assistant;
    if(current.control!=='assistant'||current.status!=='needs-you'||session.answer!==null||!session.question||questionId!==session.question.id||operationId!==session.operationId||!session.question.options.some(option=>option.id===choiceId))throw Error('Choose one of the current question options after continuing Assistant.');
    session.answer=choiceId;wakeExample(session);return true;
  }
  function stopAssistantExample(){
    const session=activeExample;if(!session||!exampleIdentity(session))return false;
    session.stopped=true;rememberExample(session);session.end={stage:'stopped',label:'Example stopped',detail:'Saved files and the conversation are kept. Run an example to start another task.'};wakeExample(session);
    const current=model.space(session.context.workspace,session.context.slot).assistant;
    saveAssistant(session.context,{status:current.control==='user'?'paused':'idle',result:'Example stopped. Saved files and the conversation are kept.',context:{...current.context,operationId:''},activity:{...current.activity,stage:'stopped',label:'Example stopped',detail:'Saved files and the conversation are kept. Run an example to start another task.',question:null}});return true;
  }
  async function runAssistantExample(kind){
    const context=assistantContext(),previous=model.space(context.workspace,context.slot).assistant;
    if(previous.control==='user')throw Error('You control this display. Choose Continue before asking Assistant to work here.');
    if(activeExample&&!activeExample.stopped||previous.status==='working'||previous.activity?.stage==='question')throw Error('Assistant is already working on this display. Answer its question or stop the current example first.');
    const examples=root.SpatialDisplayAssistantExamples,definition=examples?.list().find(example=>example.id===kind),A=root.SpatialAIDesktop;
    if(!definition||!A?.startExample)throw Error('This Assistant example is unavailable. Reload the demo and try again.');
    context.folder=root.SpatialAssistantFiles.path(context.folder,workspaceProfiles[context.workspace].home);
    if(!root.SpatialAssistantFiles.allowed(context.folder,context.workspace,workspaceProfiles,projectSpaces,openProjectNames()))throw Error('Choose a working folder in this Workspace or one of its open Projects.');
    const project=Object.keys(projectSpaces).filter(id=>root.SpatialAssistantFiles.inside(context.folder,projectSpaces[id].root)).sort((a,b)=>projectSpaces[b].root.length-projectSpaces[a].root.length)[0]||null;
    const operationId='assistant-example-'+crypto.randomUUID(),opened=[],originalChatId=A.current().id;
    const session={context,operationId,chatId:originalChatId,startingChat:false,stopped:false,waiters:new Set(),question:null,answer:null};
    activeExample=session;
    context.operationId=operationId;
    let chatId='',preparedImageKey='',imagePublished=false;
    const isCurrent=()=>exampleIdentity(session)&&model.space(context.workspace,context.slot).assistant.control==='assistant';
    const check=()=>{if(!isCurrent())throw Error('Assistant stopped because control, the chat or the Workspace changed.');};
    const wait=()=>new Promise(resolve=>session.waiters.add(resolve));
    const checkpoint=async()=>{while(exampleIdentity(session)&&model.space(context.workspace,context.slot).assistant.control==='user')await wait();check();};
    const delay=()=>new Promise(resolve=>{let settled=false;const finish=()=>{if(settled)return;settled=true;session.waiters.delete(finish);resolve();};session.waiters.add(finish);setTimeout(finish,1400);});
    const progress=patch=>{check();const current=model.space(context.workspace,context.slot).assistant;return saveAssistant(context,{activity:{...current.activity,...patch},context:{...context,...(chatId?{chatId}:{})},outputs:opened});};
    saveAssistant(context,{status:'working',control:'assistant',kind,task:definition.title,result:'Working with explicit sample inputs in '+context.folder,context:{...context,chatId:originalChatId},outputs:[],activity:{stage:'plan',label:'Starting the example',detail:'Preparing a fresh chat and a bound working folder.',step:0,total:4,entries:[],question:null}});
    function save(name,text,options={}){
      check();
      // Include catalogue and Stash names, not only generated downloads. Keeping
      // the returned path also handles a second run without replacing a file.
      const frame=Object.keys(appInfo).find(id=>frameFor(id)),used=new Set((frame?appFileRows(frame,context.folder):[]).map(row=>row[0].toLocaleLowerCase()));
      for(const file of workspaceDownloads.list(context.folder))used.add(file.name.toLocaleLowerCase());
      const requested=root.SpatialStashFiles.safeName(name),dot=requested.lastIndexOf('.'),stem=dot>0?requested.slice(0,dot):requested,extension=dot>0?requested.slice(dot):'';
      let unique=requested,index=2;while(used.has(unique.toLocaleLowerCase()))unique=stem+' ('+(index++)+')'+extension;
      const itemId='example-'+crypto.randomUUID(),before=workspaceDownloads.snapshot();let file;
      try{
        file=workspaceDownloads.add(context.folder,unique,{workspace:context.workspace,project,content:text,attachment:options.attachment,itemId,operationId,source:'Assistant local example'});
        desktopStorage.setItem('spatial-downloads-v1',JSON.stringify(workspaceDownloads.snapshot()));
      }catch(error){workspaceDownloads.load(before);throw Error('The example file could not be saved in this browser.');}
      if(file.attachment?.key===preparedImageKey)imagePublished=true;
      const item={id:itemId,itemId,title:file.name,filename:file.name,text:file.content,kind:file.attachment?.kind||'note',address:file.path,attachment:file.attachment,workspace:context.workspace,project,source:{workspace:context.workspace,project,app:'assistant',label:'Assistant local example',address:file.path}};
      root.SpatialItemHistoryDesktop?.capture(item,{workspace:context.workspace,project,action:options.related?.length?'created':'saved',detail:'Explicit sample file created by '+definition.title,related:options.related?.map(parent=>({itemId:parent.itemId||parent.id,versionId:parent.versionId,relation:'derivedFrom'}))});
      root.SpatialItemHistoryDesktop?.persist();refreshDownloadUi();captureWorkspaceContent();queueDesktopStateBroadcast(0);return item;
    }
    try{
      const result=await examples.run(kind,{workspace:context.workspace,folder:context.folder,check,isCurrent,
        async prepareImage(asset){
          await checkpoint();const response=await fetch(asset);await checkpoint();if(!response.ok)throw Error('The bundled example photograph could not load.');
          const blob=await response.blob();await checkpoint();if(!blob.type.startsWith('image/')||blob.size>25*1024*1024)throw Error('The example photograph is unavailable or too large.');
          const key='stash-example-'+crypto.randomUUID();preparedImageKey=key;await root.SpatialStashFiles.put(key,blob);await checkpoint();
          return {kind:'image',key,filename:'Example keyboard photo.jpg',mime:blob.type,size:blob.size,format:'JPEG'};
        },
        startChat(title){check();session.startingChat=true;try{const chat=A.startExample({title,workspace:context.workspace,folder:context.folder,items:[]});chatId=chat.chatId;session.chatId=chatId;context.chatId=chatId;progress({});return chat;}finally{session.startingChat=false;}},
        async step(details){await checkpoint();progress({...details,question:null});await delay();await checkpoint();},
        completed(details){const current=model.space(context.workspace,context.slot).assistant;progress({entries:[...(current.activity?.entries||[]),details]});},
        async ask(question){
          await checkpoint();session.question={id:operationId+':'+question.id,prompt:question.prompt,options:question.options};session.answer=null;
          progress({stage:'question',label:'Your choice',detail:'Assistant will wait for your answer before creating the result.',question:session.question});saveAssistant(context,{status:'needs-you'});
          while(!session.answer){await wait();await checkpoint();}
          const answer=session.answer;session.question=null;session.answer=null;saveAssistant(context,{status:'working'});progress({question:null});return answer;
        },
        update(turnId,response){check();const turn=A.updateTurn?.(context.workspace,chatId,turnId,response);if(!turn)throw Error('The example conversation could not be updated.');return turn;},
        save,
        attach(items){check();const attached=A.attach(items,{focus:false});if(attached.length!==items.length)throw Error('The sample inputs could not be attached.');return attached;},
        turn(request,response,details){check();const turn=A.createTurn(request,response,{...details,folder:context.folder,project});if(!turn)throw Error('The sample conversation could not be saved.');return turn;},
        note(title,text){check();const id=root.SpatialDisplayRoleBridge.launchNote(title,text);if(id)opened.push(id);return id;},
        showFile(item){check();const id=openReference({kind:'file',path:item.address});if(id)opened.push(id);return id;},
        proposeConversion(options){check();if(!root.SpatialAssistantDesktop?.proposeExampleConversion)throw Error('The local file converter is unavailable.');return root.SpatialAssistantDesktop.proposeExampleConversion(options);}
      });
      check();
      root.SpatialTimelineDesktop?.record('assistant.output',{workspace:context.workspace,project,chatId:result.chatId,turnId:result.turnId,title:definition.title,path:context.folder,detail:result.result});
      const current=model.space(context.workspace,context.slot).assistant;
      return saveAssistant(context,{status:result.status,result:result.result,context:{...context,chatId:result.chatId,turnId:result.turnId},outputs:result.outputs,activity:{...current.activity,stage:result.status==='needs-you'?'review':'complete',label:result.status==='needs-you'?'Ready for your review':'Result ready',detail:result.result,question:null}});
    }catch(error){
      if(preparedImageKey&&!imagePublished)try{await root.SpatialStashFiles.remove?.(preparedImageKey);}catch{}
      if(session.stopped)return model.space(context.workspace,context.slot).assistant;
      const current=model.space(context.workspace,context.slot).assistant;
      if(current.context?.operationId===operationId){
        if(controlContextMatches(context)&&current.control==='assistant')saveAssistant(context,{status:'error',result:error.message,outputs:opened,activity:{...current.activity,stage:'error',label:'Example could not finish',detail:error.message,question:null}});
        else saveAssistant(context,{status:'paused',control:'user',result:error.message,outputs:opened,activity:{...current.activity,stage:'interrupted',label:'Example interrupted',detail:error.message,question:null}});
      }
      throw error;
    }finally{rememberExample(session);if(activeExample===session)activeExample=null;}
  }
  function assistantExampleConversionUpdate({workspace,chatId,turnId,action}={}){
    if(role()!=='assistant'||workspace!==activeWorkspace||!extendedDesktopActive())return false;
    const current=model.space(workspace,localDisplaySlot()).assistant,context=current.context;
    if(current.kind!=='image'||!context||context.chatId!==chatId||context.turnId!==turnId||!controlContextMatches(context))return false;
    if(!['running','complete','failed','cancelled'].includes(action?.status))return false;
    const running=action.status==='running',complete=action.status==='complete',cancelled=action.status==='cancelled';
    const count=Array.isArray(action.outputs)?action.outputs.length:0;
    const destination=action.destination||context.folder;
    const result=running?'Converting the saved example image to WebP in '+destination+'.':complete?'Created '+count+' WebP '+(count===1?'copy':'copies')+' in '+destination+'. Use Open or Show in folder in the chat.':cancelled?'The example conversion was cancelled. The saved original is unchanged.':'The example conversion failed: '+(action.error||'Review the chat for details.');
    saveAssistant(context,{status:current.control==='user'?'paused':running?'working':complete?'done':cancelled?'idle':'error',result,...(current.activity?{activity:{...current.activity,stage:running?'review':complete?'complete':cancelled?'stopped':'error',label:running?'Converting the image':complete?'Image copy ready':cancelled?'Conversion cancelled':'Conversion failed',detail:result,question:null}}:{})});return true;
  }
  function runAssistantTask(kind){
    const context=assistantContext(),previous=model.space(context.workspace,context.slot).assistant;
    if(previous.control==='user')throw Error('You control this display. Choose Continue before asking Assistant to work here.');
    if(activeExample&&!activeExample.stopped||previous.status==='working'||previous.activity?.stage==='question')throw Error('Assistant is already working on this display. Answer its question or stop the current example first.');
    if(!['briefing','image'].includes(kind))throw Error('Choose a supported local demonstration.');
    const folder=root.SpatialAssistantFiles.path(context.folder,workspaceProfiles[context.workspace].home);
    if(!root.SpatialAssistantFiles.allowed(folder,context.workspace,workspaceProfiles,projectSpaces,openProjectNames()))throw Error('Choose a working folder in this Workspace or one of its open Projects.');
    context.folder=folder;
    const localWindows=Object.keys(appState).filter(id=>appState[id]==='open'&&pinned(id)===context.slot).map(id=>({id,label:appInfo[id]?.label||id}));
    const task=kind==='briefing'?'Prepare a Workspace briefing':'Show an image for review',outputs=[];
    saveAssistant(context,{status:'working',control:'assistant',kind,task,result:'Working in '+context.folder,context,outputs,activity:null});
    function check(){if(!controlContextMatches(context)||model.space(context.workspace,context.slot).assistant.control!=='assistant')throw Error('Assistant stopped because control or the Workspace changed.');}
    try{
      check();
      if(kind==='briefing'){
        const text=[workspaceProfiles[context.workspace].label+' — Workspace briefing','','Working folder: '+context.folder,'','Windows on this display',...(localWindows.length?localWindows.map(window=>'• '+window.label):['• No windows yet']),'','Next steps','','Add your observations here. This local demonstration lists window labels; it does not inspect their document contents.'].join('\n');
        const note=root.SpatialDisplayRoleBridge.launchNote('Workspace briefing',text);if(!note)throw Error('Note Editor could not open.');outputs.push(note);check();
        const files=root.SpatialDisplayRoleBridge.openFolder(context.folder);if(!files)throw Error('File Browser could not open.');outputs.push(files);
      }else{
        const image=referenceOptions().find(reference=>reference.kind==='file'&&root.SpatialMemoryDesktop?.contextAtFile?.(reference.path)?.attachment?.kind==='image');
        if(image)outputs.push(openReference(image));
        else{
          const id=root.SpatialDisplayRoleBridge.openFolder(context.folder);if(!id)throw Error('File Browser could not open.');outputs.push(id);check();
          const preview=frameFor(id)?.querySelector?.('.file-preview');if(!preview)throw Error('The image preview could not open.');
          preview.innerHTML='<header><div><b>Built-in reference photograph</b><small>Local demo image · not a saved Workspace file</small></div></header><img class="stash-file-image" src="images/philosophy/keychron-profile.jpg" alt="Keyboard profile reference photograph"><p>Photo: Mulad · public domain</p>';preview.hidden=false;
        }
        check();
        const note=root.SpatialDisplayRoleBridge.launchNote('Image review','Reference image opened on this display.\n\nWorking folder: '+context.folder+'\n\nReview notes\n\nDescribe the crop, colours or details you want to change. This local demonstration opens an image and a note; it does not analyse the image.');if(!note)throw Error('Note Editor could not open.');outputs.push(note);
      }
      check();
      return saveAssistant(context,{status:'done',result:kind==='briefing'?'Opened a briefing note and its working folder on this display.':'Opened a reference image and an editable review note on this display.',outputs});
    }catch(error){
      const current=model.space(context.workspace,context.slot).assistant;
      if(controlContextMatches(context)&&current.control==='assistant')saveAssistant(context,{status:'error',result:error.message,outputs});
      else saveAssistant(context,{status:'paused',control:'user',result:error.message,outputs});
      throw error;
    }
  }
  root.SpatialDisplayRoleBridge={state,setRole,openReference,assistantControl,runAssistantTask,runAssistantExample,answerAssistantExample,stopAssistantExample,assistantExampleConversionUpdate,assistantExamples:()=>root.SpatialDisplayAssistantExamples?.list()||[],openDisplays:slot=>root.SpatialDisplaySettings.open(slot),
    openWindow(id){if(pinned(id)!==localDisplaySlot()||appState[id]==='closed')return false;openApp(id);return true;},
    windowContextKey(id){const slot=pinned(id);return slot?activeWorkspace+':display-role:space:'+slot:null;},
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
  function takeWindowControl(event){
    if(role()!=='assistant')return;
    const frame=event.target.closest('[data-app-frame]'),id=frame?.dataset?.appFrame;
    const empty=!frame&&event.type==='pointerdown'&&(event.target.matches?.('.workspace-zone')||event.target.closest('.display-workbench-empty')&&!event.target.closest('button,a,input,textarea,select'));
    if(!empty&&(!id||appState[id]!=='open'||pinned(id)!==localDisplaySlot()||!isLocalApp(id)))return;
    if(model.space(activeWorkspace,localDisplaySlot()).assistant.control!=='user')assistantControl('takeover');
  }
  document.addEventListener('pointerdown',takeWindowControl,true);
  document.addEventListener('keydown',takeWindowControl,true);
  root.addEventListener('resize',()=>notify());
  root.addEventListener('spatial-ai-chat-change',()=>{if(activeExample&&!activeExample.startingChat&&!exampleIdentity(activeExample)){interruptExample(activeExample,'The active chat changed. Saved files and the conversation are kept.');notify();}});
  root.addEventListener('pagehide',()=>{if(activeExample){interruptExample(activeExample,'This display was closed or reloaded. Saved files and the conversation are kept.');persist();}});
  root.addEventListener('storage',event=>{if(event.key===key){loadDisplayRoles(readDesktopStorage(key,{}));connect();notify();}});
  root.SpatialDisplayRoleDesktop={refresh:notify,snapshot:()=>model.snapshot()};
  notify();settle();
})(globalThis);
