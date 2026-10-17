/* Settings is one normal window per Workspace. A contextual entry point brings
   that window here instead of navigating to a previous desktop or Project. */
(function(root){
  'use strict';
  const previousOpen=openApp,previousLaunch=launchAppHere;
  function openHere(point=null){
    if(root.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('systems'))return;
    if(desktopPageAnimating){const workspace=activeWorkspace;setTimeout(()=>{if(activeWorkspace===workspace)openHere(point);},230);return;}
    const name='settings',frame=frameFor(name);if(!frame)return;
    const page=desktopPages.current(activeWorkspace),column=desktopPages.column(activeWorkspace);
    const relocating=desktopPages.pageOf(activeWorkspace,name)!==page || desktopPages.columnOf(activeWorkspace,name)!==column || (appState[name]==='open'&&!isLocalApp(name));
    if(relocating || appState[name]==='closed'){
      const oldPage=desktopPages.pageOf(activeWorkspace,name),oldColumn=desktopPages.columnOf(activeWorkspace,name);
      const owns=id=>desktopPages.pageOf(activeWorkspace,id)===oldPage&&desktopPages.columnOf(activeWorkspace,id)===oldColumn;
      for(const [key,session] of Object.entries(tileSessions)){
        if(!key.startsWith(activeWorkspace+':')||!session)continue;
        if(session.focus?.name===name)leaveTileFocus(session,true,{owns});
        if(session.fullscreen?.name===name)leaveAppFullscreen(session,{owns});
        session.root=tileEngine.remove(session.root,name);
        delete session.floating?.[name];delete session.parked?.[name];
      }
      releaseBorrowedApp(name);desktopPages.removeFullscreen(activeWorkspace,name);
      frame.classList.remove('is-maximized','is-fullscreen');delete frame.dataset.maximized;
      appMaximizedState[name]=false;maximizeRestore.delete(name);
      if(appState[name]==='open')appState[name]='minimized';
    }
    desktopPages.assign(activeWorkspace,name,page,column);
    previousOpen(name,point);
    // Preferences belong to the Workspace session, never to a packed Project.
    windowMembership[activeWorkspace] ||= {};windowMembership[activeWorkspace][name]=null;
    removeWindowFromSavedProjects(name);
    saveDesktopPages();saveTileSessions();saveIndependentSessions();persistWorkspaceAppStates();persistProjectState();
    root.SpatialSettings?.refresh();queueDesktopStateBroadcast(0);
    return name;
  }
  openApp=function(name,...args){return name==='settings'?openHere(...args):previousOpen(name,...args);};
  launchAppHere=function(name,...args){return name==='settings'?openHere():previousLaunch(name,...args);};
  // There is already a Settings window in each Workspace. Transfers remain
  // useful between desktops and displays, but cannot create packed copies.
  const previousEntries=contextMenuEntries;
  contextMenuEntries=function(context){
    const entries=previousEntries(context);if(context.kind!=='app'||context.name!=='settings')return entries;
    function filter(items){return items.filter(item=>item.action!=='app-new-instance'&&!['Other Projects','Other Workspaces'].includes(item.label)).map(item=>item.children?{...item,children:filter(item.children)}:item);}
    return filter(entries);
  };
  const previousWorkspaceMove=moveAppWorkspace,previousProjectMove=moveAppProject,previousColumnMove=moveWindowToColumn;
  function independent(){showToast('Open Settings in the destination to bring its window there. Settings is not saved inside a Project.');}
  moveAppWorkspace=function(name,...args){if(name==='settings'){independent();return;}return previousWorkspaceMove(name,...args);};
  moveAppProject=function(name,...args){if(name==='settings'){independent();return;}return previousProjectMove(name,...args);};
  moveWindowToColumn=function(name,column,...args){
    if(name==='settings'&&column!==desktopPages.columnOf(activeWorkspace,name)){independent();return false;}
    return previousColumnMove(name,column,...args);
  };
  root.SpatialSettingsAppDesktop={open:openHere};
})(globalThis);
