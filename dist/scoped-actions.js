/* Existing commands name their target and broaden from desktop to system. */
(function(root){
  'use strict';
  function entries(original,context){
    if(context.background)return original;
    const {kind,workspace,project,page=0,label,allowed=()=>true}=context;
    const desktop='Desktop '+(page+1),path=(project?project.name+' · ':'')+workspace.label;
    if(kind==='desktop'){
      const local=original.filter(item=>item.action==='desktop-overview'||item.action?.startsWith('desktop-page:')||['desktop-new-folder','desktop-paste'].includes(item.action));
      const result=[{info:'This desktop · '+desktop+' · '+path},...local];
      if(project&&allowed('projects'))result.push({separator:true},{label:'Project · '+project.name,icon:'i-folder',children:[
        {action:'scope:project-folder',label:'Open Project folder',detail:project.root,icon:'i-folder'},
        {action:'scope:project-manage',label:'Manage Project: '+project.name,icon:'i-settings'},
        {action:'scope:project-close',label:'Close Project: '+project.name,detail:'Save its windows across all of its desktops',icon:'i-close'}
      ]});
      const workspaceActions=[];
      if(allowed('folders'))workspaceActions.push({action:'scope:workspace-home',label:'Open '+workspace.label+' Home',detail:workspace.home,icon:'i-folder'});
      if(allowed('systems'))workspaceActions.push({action:'scope:workspace-settings',label:'Workspace settings',detail:'Areas across all desktops and Projects in '+workspace.label,icon:'i-settings'});
      if(workspaceActions.length)result.push({separator:true},{label:'Workspace · '+workspace.label,icon:workspace.icon||'i-grid',children:workspaceActions});
      const shared=[];
      if(allowed('systems'))shared.push({action:'scope:system-settings',label:'System settings',detail:'Theme, connections and sound · all Workspaces',icon:'i-settings'});
      const guide=original.find(item=>item.action==='desktop-guide');if(guide)shared.push(guide);
      if(shared.length)result.push({separator:true},{label:'System-wide',icon:'i-monitor',children:shared});
      return result;
    }
    if(kind==='area')return [{info:'Workspace · '+workspace.label+' · all its desktops and Projects'},...original];
    if(kind==='project')return [{info:'Project · '+project.name},...original.map(item=>{
      if(item.action==='project-open')return {...item,label:'Open Project: '+project.name};
      if(item.action==='project-manage')return {...item,label:'Manage Project: '+project.name};
      if(item.action==='project-delete')return {...item,label:'Remove Project: '+project.name,detail:'Remove its saved setup; keep its folder and files'};
      return item;
    })];
    if(kind==='app')return [{info:context.closed?'Application · '+label+' · '+workspace.label:label+' window · '+desktop+' · '+path},...original.map(item=>{
      if(item.action==='app-close')return {...item,label:'Close '+label+' window'};
      if(item.action==='app-force-quit')return {...item,label:'Force quit '+label+' instance',detail:'Stop only this instance in '+workspace.label};
      if(item.action==='app-new-instance')return {...item,detail:'Opens on '+context.newWindowTarget};
      return item;
    })];
    return original;
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={entries};return;}
  const originalDescriptor=contextMenuDescriptor;
  contextMenuDescriptor=function(...args){const result=originalDescriptor(...args);if(result)result.actionScope={workspace:activeWorkspace,owner:desktopPages.column(activeWorkspace)};return result;};
  const originalEntries=contextMenuEntries;
  contextMenuEntries=function(context){
    const original=originalEntries(context);if(context.background)return original;
    const workspaceId=activeWorkspace;
    const owner=context.kind==='project'?context.name:context.kind==='app'?desktopPages.columnOf(workspaceId,context.name):desktopPages.column(activeWorkspace);
    const model={kind:context.kind,workspace:workspaceProfiles[workspaceId],project:projectSpaces[owner],page:context.kind==='app'?desktopPages.pageOf(workspaceId,context.name):desktopPages.current(activeWorkspace),label:appInfo[context.name]?.label,background:context.background,closed:appState[context.name]==='closed',
      newWindowTarget:'Desktop '+(desktopPages.current(activeWorkspace)+1)+' · '+(projectSpaces[desktopPages.column(activeWorkspace)]?.name||workspaceProfiles[activeWorkspace].label),allowed:feature=>!root.SpatialGuide?.model.active()||SpatialGuide.model.allows(feature)};
    if(context.kind==='project'&&!model.project)return original;
    return entries(original,model);
  };
  const originalAction=executeContextAction;
  executeContextAction=function(action){
    if(!action.startsWith('scope:'))return originalAction(action);
    const scope=contextMenuState?.actionScope;if(!scope||scope.workspace!==activeWorkspace||scope.owner!==desktopPages.column(activeWorkspace))return;
    const project=projectSpaces[scope.owner];
    if(action==='scope:project-folder'&&project)openFileLocation(project.root);
    if(action==='scope:project-manage'&&project){openProjectEditor('manage',{projectName:scope.owner});projectEditorState.returnFocus=document.querySelector('.workspace-zone');}
    if(action==='scope:project-close'&&project&&activeProjectName===scope.owner)closeActiveProject();
    if(action==='scope:workspace-home')openFileLocation(workspaceProfiles[activeWorkspace].home);
    if(action==='scope:workspace-settings'||action==='scope:system-settings'){
      SpatialSettings.open(action==='scope:workspace-settings'?'workspace':'appearance');
    }
  };
})(typeof globalThis!=='undefined'?globalThis:this);
