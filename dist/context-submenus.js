/* Nested destination menus retain the existing window-transfer operations. */
(function(root){
  'use strict';
  const encode=target=>'move-target:'+encodeURIComponent(JSON.stringify(target));
  function targets({workspace,profiles,projects,owner,page,bond=false,last,open=[],allowed=()=>true,restricted=null,displayAction=null}){
    const profile=profiles[workspace],ownerName=id=>id==='workspace'?'Workspace':projects[id]?.name||'Project';
    const path=(space,column,index)=>profiles[space].label+' / '+ownerName(column)+' / Desktop '+(index+1);
    const pages=(space,column)=>Array.from({length:last(space,column)+1},(_,index)=>{
      const current=space===workspace && column===owner && index===page && !bond;
      return {action:encode({workspace:space,owner:column,page:index}),icon:'i-monitor',label:'Desktop '+(index+1),detail:path(space,column,index),disabled:current,checked:current,marker:current?'Current':index===last(space,column)?'New':''};
    });
    const children=[{info:'From: '+path(workspace,owner,page)+(bond?' / Temporary desktop':'')}];
    if(allowed('desktops'))children.push({label:owner==='workspace'?'This Workspace':'This Project',icon:owner==='workspace'?'i-monitor':'i-folder',detail:owner==='workspace'?profile.label:ownerName(owner),children:pages(workspace,owner)});
    if(allowed('projects')){
      const others=[];
      if(owner!=='workspace')others.push({label:'Workspace desktops',icon:'i-monitor',detail:profile.label+' · outside Projects',children:pages(workspace,'workspace')});
      for(const [id,project] of Object.entries(projects)){
        if(id===owner)continue;
        others.push({label:project.name,icon:'i-folder',detail:open.includes(id)?'Open in '+profile.label:'Closed Project · window stored for later',children:[...(!open.includes(id)?[{info:'This Project is closed. The window is saved here until you open it.'}]:[]),...pages(workspace,id)]});
      }
      if(others.length)children.push({label:'Other Projects',icon:'i-folder',detail:profile.label+' Workspace',children:others});
    }
    if(allowed('workspaces') && !restricted){
      const others=Object.entries(profiles).filter(([id])=>id!==workspace).map(([id,space])=>({label:space.label,icon:space.icon||'i-monitor',detail:'Workspace · '+space.home,children:[{info:'Home: '+space.home},{info:'Moves out of its Project. Window content is kept; open files and locations stay at their paths.'},...pages(id,'workspace')]}));
      if(others.length){children.push({separator:true},{label:'Other Workspaces',icon:'i-grid',detail:'A different Home and Workspace context',children:others});}
    }
    if(displayAction)children.push({separator:true},{label:'Displays',icon:'i-monitor',children:[displayAction]});
    return children.some(item=>item.children)?{label:'Move to…',icon:'i-monitor',children}:null;
  }
  function place(anchor,size,viewport){
    const right=anchor.right-2,left=anchor.left-size.width+2;
    return {left:Math.max(8,Math.min(right+size.width<=viewport.width-8?right:left,viewport.width-size.width-8)),top:Math.max(8,Math.min(anchor.top-5,viewport.height-size.height-8))};
  }
  if(typeof module!=='undefined' && module.exports){module.exports={targets,place};return;}
  const menu=document.querySelector('#desktopContextMenu');if(!menu)return;
  let panels=new Map(),chain=[],hoverTimer=0;
  function reset(){clearTimeout(hoverTimer);hoverTimer=0;chain=[];panels.clear();menu.querySelectorAll('.context-submenu').forEach(node=>node.remove());}
  function markup(entries){
    reset();let popups='';
    function list(items,parent=''){
      return items.map((entry,index)=>{
        const id=(parent?parent+'-':'')+index;
        if(entry.separator)return '<div class="context-menu-separator" role="separator"></div>';
        if(entry.info)return '<p class="context-menu-info">'+escapeHtml(entry.info)+'</p>';
        if(entry.children){
          const content=list(entry.children,id);
          popups+='<section class="desktop-context-menu context-submenu material-surface-glass" role="menu" aria-label="'+escapeHtml(entry.label)+'" id="contextSubmenu-'+id+'" data-submenu-panel="'+id+'" hidden><header class="context-submenu-heading"><button type="button" data-context-back="'+id+'" aria-label="Back from '+escapeHtml(entry.label)+'">'+icon('i-left')+'</button><b>'+escapeHtml(entry.label)+'</b></header><div class="context-submenu-list">'+content+'</div></section>';
        }
        const role=typeof entry.checked==='boolean'?'menuitemradio':'menuitem';
        return '<button type="button" class="context-menu-item'+(entry.danger?' is-danger':'')+'" role="'+role+'"'+(typeof entry.checked==='boolean'?' aria-checked="'+entry.checked+'"':'')+(entry.disabled?' disabled aria-disabled="true"':'')+(entry.children?' data-context-submenu="'+id+'" aria-haspopup="menu" aria-expanded="false" aria-controls="contextSubmenu-'+id+'"':' data-context-action="'+escapeHtml(entry.action)+'"')+'>'+icon(entry.icon||'i-right')+'<span class="context-entry-copy"><b>'+escapeHtml(entry.label)+'</b>'+(entry.detail?'<small>'+escapeHtml(entry.detail)+'</small>':'')+'</span>'+(entry.children?'<svg class="context-submenu-arrow" aria-hidden="true"><use href="#i-right"/></svg>':entry.marker||entry.checked?'<kbd>'+escapeHtml(entry.marker||'Current')+'</kbd>':entry.shortcut?'<kbd>'+escapeHtml(entry.shortcut)+'</kbd>':'')+'</button>';
      }).join('');
    }
    const main=list(entries);return main+popups;
  }
  function mount(){
    menu.querySelectorAll('.context-submenu').forEach(panel=>{menu.append(panel);const id=panel.dataset.submenuPanel,opener=menu.querySelector('[data-context-submenu="'+id+'"]');panels.set(id,{panel,opener,parent:opener.closest('.context-submenu')?.dataset.submenuPanel||''});});
    // All popups are siblings: scrolling one never clips its child submenu.
  }
  function items(panel){return [...panel.querySelectorAll('.context-menu-item')].filter(node=>!node.disabled && node.closest('.context-submenu')===(panel===menu?null:panel));}
  function closeAfter(parent,focus=false){
    const at=parent?chain.indexOf(parent)+1:0,closed=chain.splice(at);
    for(const id of closed){const record=panels.get(id);record.panel.hidden=true;record.opener.setAttribute('aria-expanded','false');}
    if(focus && closed.length)panels.get(closed[0]).opener.focus({preventScroll:true});
    return closed.length>0;
  }
  function back(focus=false){clearTimeout(hoverTimer);if(!chain.length)return false;const id=chain.at(-1);return closeAfter(panels.get(id).parent,focus);}
  function open(id,focus=false){
    clearTimeout(hoverTimer);const record=panels.get(id);if(!record)return;
    if(!chain.includes(id)){
      closeAfter(record.parent);
      record.panel.hidden=false;record.panel.style.visibility='hidden';record.panel.style.left='0px';record.panel.style.top='0px';
      const anchor=record.opener.getBoundingClientRect(),size=record.panel.getBoundingClientRect(),base=menu.getBoundingClientRect(),position=place(anchor,size,{width:window.innerWidth,height:window.innerHeight});
      record.panel.style.left=(position.left-base.left)+'px';record.panel.style.top=(position.top-base.top)+'px';record.panel.style.visibility='';record.opener.setAttribute('aria-expanded','true');chain.push(id);
    }
    if(focus)items(record.panel)[0]?.focus({preventScroll:true});
  }
  function click(event){
    const opener=event.target.closest('[data-context-submenu]'),backButton=event.target.closest('[data-context-back]');
    if(opener){open(opener.dataset.contextSubmenu,true);return true;}
    if(backButton){const record=panels.get(backButton.dataset.contextBack);closeAfter(record.parent,true);return true;}
    return false;
  }
  function key(event){
    const focused=document.activeElement,panel=focused.closest?.('.context-submenu')||menu,list=items(panel),index=list.indexOf(focused);
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();event.stopPropagation();
      const next=event.key==='Home'?0:event.key==='End'?list.length-1:index<0?(event.key==='ArrowUp'?list.length-1:0):(index+(event.key==='ArrowDown'?1:-1)+list.length)%list.length;
      list[next]?.focus({preventScroll:false});return true;
    }
    if(event.key==='ArrowRight' && focused.dataset.contextSubmenu){event.preventDefault();event.stopPropagation();open(focused.dataset.contextSubmenu,true);return true;}
    if((event.key==='ArrowLeft'||event.key==='Escape') && chain.length){event.preventDefault();event.stopPropagation();back(true);return true;}
    if(event.key==='Tab'){event.preventDefault();event.stopPropagation();closeDesktopContextMenu(true);return true;}
    return false;
  }
  menu.addEventListener('pointerover',event=>{
    const button=event.target.closest('.context-menu-item');if(!button || button===event.relatedTarget?.closest?.('.context-menu-item'))return;
    clearTimeout(hoverTimer);const parent=button.closest('.context-submenu')?.dataset.submenuPanel||'';
    if(button.dataset.contextSubmenu)hoverTimer=setTimeout(()=>open(button.dataset.contextSubmenu),140);
    else closeAfter(parent);
  });
  const originalEntries=contextMenuEntries;
  contextMenuEntries=function(context){
    const entries=originalEntries(context);
    if(context.kind!=='app' || context.background || context.parkedRail || appState[context.name]==='closed')return entries;
    const allowed=feature=>!root.SpatialGuide?.model.active() || SpatialGuide.model.allows(feature);
    const move=targets({workspace:activeWorkspace,profiles:workspaceProfiles,projects:projectSpaces,owner:desktopPages.columnOf(activeWorkspace,context.name),page:desktopPages.pageOf(activeWorkspace,context.name),bond:Boolean(desktopPages.fullscreenBond(activeWorkspace,context.name)),last:(space,column)=>desktopPages.last(space,column),open:openProjectNames(),allowed,restricted:appInfo[context.name]?.workspace,displayAction:entries.find(entry=>entry.action==='app-move-display')});
    const filtered=entries.filter(entry=>!entry.action || !(/^(move-desktop:|move-workspace:|move-project:)/.test(entry.action)||['detach-project','app-move-display'].includes(entry.action)));
    if(move)filtered.splice(1,0,move);return filtered;
  };
  function moveTarget(name,target){
    if(!appInfo[name] || appState[name]==='closed' || !workspaceProfiles[target.workspace] || !Number.isSafeInteger(target.page) || target.page<0)return;
    if(appInfo[name].workspace && appInfo[name].workspace!==target.workspace)return;
    if(target.workspace!==activeWorkspace && target.owner!=='workspace')return;
    if(target.owner!=='workspace' && !projectSpaces[target.owner])return;
    if(target.page>desktopPages.last(target.workspace,target.owner))return;
    const origin={workspace:activeWorkspace,owner:desktopPages.column(activeWorkspace),page:desktopPages.current(activeWorkspace),bond:desktopPages.selectedFullscreen(activeWorkspace)?.name||null};
    const source=desktopPages.columnOf(activeWorkspace,name),sourcePage=desktopPages.pageOf(activeWorkspace,name),bond=desktopPages.fullscreenBond(activeWorkspace,name);
    let result;
    try{
      changeDesktopPage(sourcePage,false,source,bond?.name||null);
      if(bond)leaveBondedFullscreen(name,false);
      if(target.workspace!==activeWorkspace){
        result=moveAppWorkspace(name,target.workspace,target.page);
        if(result)result.transfer=true;
      }else if(target.owner===source){
        if(target.page!==sourcePage)moveWindowToDesktop(name,target.page-sourcePage);
      }else if(target.owner==='workspace')moveWindowToColumn(name,'workspace',false,target.page);
      else moveAppProject(name,target.owner,target.page);
    }finally{
      const fullscreen=origin.bond && desktopPages.fullscreenBond(activeWorkspace,origin.bond)?origin.bond:null;
      changeDesktopPage(origin.page,false,origin.owner,fullscreen);
    }
    queueDesktopStateBroadcast(0);return result;
  }
  const transfer=reversiblePlacement(moveTarget,name=>appInfo[name].label+' moved',result=>{
    if(!result?.transfer)return null;
    const fingerprint=()=>JSON.stringify([workspaceContent[result.destination]?.frames?.[result.id],appWindowStore.snapshot()[result.destination]?.[result.id]]),expected=fingerprint();
    return ()=>fingerprint()===expected;
  });
  const originalAction=executeContextAction;
  executeContextAction=function(action){
    if(!action.startsWith('move-target:'))return originalAction(action);
    const name=contextMenuState?.name;if(!name)return;
    let target;try{target=JSON.parse(decodeURIComponent(action.slice(12)));}catch{return;}
    transfer(name,target);
  };
  root.SpatialContextSubmenus={markup,mount,click,key,back,reset};
})(typeof globalThis!=='undefined'?globalThis:this);
