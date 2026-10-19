/* Remove only retired utility window identities from session structures.
   Saved documents, capture files, history and other app contents stay intact. */
(function(root){
  'use strict';
  const retired=['calculator','screenshot','software','monitor','app-preview'];
  const object=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
  const entries=value=>object(value)?Object.entries(value):[];
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const baseRetired=id=>typeof id==='string'&&retired.some(base=>id===base||id.startsWith(base+'--'));
  const retiredLabels=new Set(['Calculator','Spectacle','Discover','System Monitor']);
  function identities({instances,appWindows}={},known=new Set()){
    for(const [,models]of entries(appWindows))for(const [id,model]of entries(models))if(baseRetired(id)||baseRetired(model?.kind))known.add(id);
    let changed=true;
    while(changed){changed=false;for(const [id,base]of entries(instances))if((baseRetired(id)||baseRetired(base)||known.has(base))&&!known.has(id)){known.add(id);changed=true;}}
    return known;
  }
  const blocked=(id,known)=>baseRetired(id)||known.has(id);
  function appMap(value,known){if(!object(value))return value;return Object.fromEntries(entries(value).filter(([id])=>!blocked(id,known)));}
  function appList(value,known){return Array.isArray(value)?value.filter(id=>!blocked(id,known)):value;}
  function workspaces(value,filter){return object(value)?Object.fromEntries(entries(value).map(([key,item])=>[key,filter(item)])):value;}
  function tree(value,known,depth=0){
    if(!object(value)||depth>64)return value;
    if(value.kind==='window')return blocked(value.name,known)?null:value;
    if(value.kind!=='split')return value;
    const a=tree(value.a,known,depth+1),b=tree(value.b,known,depth+1);
    return a&&b?{...value,a,b}:a||b||null;
  }
  function mode(value,known){
    if(!object(value))return value;if(blocked(value.name,known))return null;
    const next={...value};if(own(next,'root'))next.root=tree(next.root,known);
    if(own(next,'parked'))next.parked=appList(next.parked,known);
    if(own(next,'transferred'))next.transferred=appMap(next.transferred,known);
    return next;
  }
  function tiles(value,known){
    return workspaces(value,session=>{
      if(!object(session))return session;const next={...session};
      if(own(next,'root'))next.root=tree(next.root,known);
      if(own(next,'floating'))next.floating=appMap(next.floating,known);
      if(object(next.parked))next.parked=Object.fromEntries(entries(appMap(next.parked,known)).map(([id,record])=>{
        if(!object(record))return [id,record];const item={...record};
        for(const field of ['target','fullscreen'])if(blocked(item[field],known))delete item[field];
        return [id,item];
      }));
      for(const field of ['focus','fullscreen'])if(own(next,field))next[field]=mode(next[field],known);
      return next;
    });
  }
  function pages(value,known){
    return workspaces(value,page=>{
      if(!object(page))return page;const next={...page};
      for(const field of ['windows','owners','fullscreen'])if(own(next,field))next[field]=appMap(next[field],known);
      if(object(next.activeFullscreen))next.activeFullscreen=Object.fromEntries(entries(next.activeFullscreen).filter(([,id])=>!blocked(id,known)));
      return next;
    });
  }
  function independent(value,known){
    if(!object(value))return value;const next={...value};
    if(own(next,'instances'))next.instances=Object.fromEntries(entries(next.instances).filter(([id,base])=>!blocked(id,known)&&!blocked(base,known)));
    if(own(next,'membership'))next.membership=workspaces(next.membership,item=>appMap(item,known));
    if(own(next,'content'))next.content=workspaces(next.content,item=>object(item)?{...item,...(own(item,'frames')?{frames:appMap(item.frames,known)}:{})}:item);
    return next;
  }
  function projectSessions(value,known){
    return workspaces(value,session=>{
      if(!object(session))return session;const next={...session};
      if(own(next,'apps'))next.apps=appList(next.apps,known);
      for(const field of ['states','geometry','displays','pages'])if(own(next,field))next[field]=appMap(next[field],known);
      return next;
    });
  }
  function projects(value,known){return workspaces(value,project=>object(project)?{...project,...(own(project,'apps')?{apps:appList(project.apps,known)}:{}),...(own(project,'modes')?{modes:workspaces(project.modes,item=>object(item)&&own(item,'apps')?{...item,apps:appList(item.apps,known)}:item)}:{})}:project);}
  function profiles(value,known){return workspaces(value,profile=>object(profile)?{...profile,...(own(profile,'rack')?{rack:appList(profile.rack,known)}:{}),...(Array.isArray(profile.favorites)?{favorites:profile.favorites.filter(row=>!Array.isArray(row)||(!blocked(row[0],known)&&!retiredLabels.has(row[0])))}:{})}:profile);}
  function displays(value,known){return workspaces(value,display=>object(display)&&own(display,'apps')?{...display,apps:appMap(display.apps,known)}:display);}
  function roles(value,known){
    if(!object(value)||!object(value.workspaces))return value;
    return {...value,workspaces:workspaces(value.workspaces,workspace=>object(workspace)&&own(workspace,'displays')?{...workspace,displays:workspaces(workspace.displays,space=>object(space)?{...space,...(own(space,'windows')?{windows:appList(space.windows,known)}:{}),...(object(space.assistant)&&own(space.assistant,'outputs')?{assistant:{...space.assistant,outputs:appList(space.assistant.outputs,known)}}:{})}:space)}:workspace)};
  }
  const schemas={
    'spatial-workspace-app-states-v1':(value,known)=>workspaces(value,item=>appMap(item,known)),
    'spatial-workspace-window-layouts-v1':(value,known)=>workspaces(value,item=>appMap(item,known)),
    'spatial-desktop-layout-v3':appMap,
    'spatial-app-windows-v1':(value,known)=>workspaces(value,item=>appMap(item,known)),
    'spatial-independent-sessions-v1':independent,
    'spatial-desktop-pages-v1':pages,
    'spatial-split-layouts-v1':tiles,
    'spatial-project-window-sessions-v1':projectSessions,
    'spatial-project-spaces-v2':projects,
    'spatial-project-content-v1':projects,
    'spatial-workspace-display-assignments-v1':displays,
    'spatial-custom-workspaces-v1':profiles,
    'spatial-display-roles-v1':roles
  };
  function parse(raw){try{return JSON.parse(raw||'null');}catch{return null;}}
  function filterValue(key,value,known=new Set()){
    if(!own(schemas,key)||!object(value))return value;
    if(key==='spatial-independent-sessions-v1')identities({instances:value.instances},known);
    if(key==='spatial-app-windows-v1')identities({appWindows:value},known);
    return schemas[key](value,known);
  }
  function filterSnapshot(value){
    if(!object(value))return value;const known=identities({instances:value.independent?.instances,appWindows:value.appWindows}),next={...value};
    const fields={workspaceStates:'spatial-workspace-app-states-v1',windowLayouts:'spatial-workspace-window-layouts-v1',appWindows:'spatial-app-windows-v1',independent:'spatial-independent-sessions-v1',desktopPages:'spatial-desktop-pages-v1',tileSessions:'spatial-split-layouts-v1',projectWindowSessions:'spatial-project-window-sessions-v1',projects:'spatial-project-spaces-v2',displayAssignments:'spatial-workspace-display-assignments-v1',displayRoles:'spatial-display-roles-v1',customWorkspaces:'spatial-custom-workspaces-v1'};
    for(const [field,key]of entries(fields))if(own(value,field))next[field]=filterValue(key,value[field],known);
    if(own(value,'maximized'))next.maximized=appMap(value.maximized,known);
    if(blocked(value.frontApp,known))next.frontApp=null;
    return next;
  }
  function knownFrom(storage,known=new Set()){
    const saved=key=>{try{return parse(storage.getItem(key));}catch{return null;}};
    return identities({instances:saved('spatial-independent-sessions-v1')?.instances,appWindows:saved('spatial-app-windows-v1')},known);
  }
  function filteredText(key,raw,known){
    if(!own(schemas,key)||raw===null||raw===undefined)return raw;const value=parse(raw);if(!object(value))return raw;
    const next=filterValue(key,value,known);return JSON.stringify(next)===JSON.stringify(value)?raw:JSON.stringify(next);
  }
  function migrate(storage,known=knownFrom(storage)){
    const changed=[];
    for(const key of Object.keys(schemas)){
      try{const raw=storage.getItem(key),next=filteredText(key,raw,known);if(next!==raw){storage.setItem(key,next);changed.push(key);}}catch{}
    }
    return changed;
  }
  const facades=new WeakMap();
  function storage(source){
    if(!source||typeof source.getItem!=='function')return source;if(facades.has(source))return facades.get(source);
    const known=knownFrom(source);migrate(source,known);
    const facade=new Proxy(source,{get(target,key){
      if(key==='getItem')return name=>filteredText(name,target.getItem(name),known);
      if(key==='setItem')return (name,value)=>target.setItem(name,filteredText(name,String(value),known));
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});
    facades.set(source,facade);return facade;
  }
  const guards=new WeakSet();
  function installSyncGuards(target=root){
    for(const name of ['applyDesktopSyncState','persistIncomingDesktopState','captureDesktopSyncState']){
      const previous=target[name];if(typeof previous!=='function'||guards.has(previous))continue;
      const next=name==='captureDesktopSyncState'?function(...args){return filterSnapshot(previous.apply(this,args));}:function(value,...args){return previous.call(this,filterSnapshot(value),...args);};
      guards.add(next);target[name]=next;
    }
  }
  const api={retired:retired.slice(),isRetired:baseRetired,filterValue,filterSnapshot,migrate,storage,installSyncGuards};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SpatialRetiredApps=api;
})(typeof globalThis!=='undefined'?globalThis:this);
