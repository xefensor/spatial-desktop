/* Desktop items are an ordinary folder projection, not disposable DOM icons. */
(function(root){
  'use strict';
  const host=document.querySelector('.workspace-zone');if(!host||!root.SpatialDesktopFiles)return;
  let queued=false;
  function directory(){const column=desktopPages.column(activeWorkspace);return (projectSpaces[column]?.root||workspaceProfiles[activeWorkspace].home)+'/Desktop';}
  function open(address){const file=SpatialDesktopFiles.read(address);if(!file){showToast('This item is no longer available.');refresh();return;}if(file.kind==='folder')openFileLocation(address);else{const id=createAppInstance('dolphin');renderFileLocation(id,SpatialDesktopFiles.parent(address));openAppFile(id,file.name);}}
  function refresh(){
    host.querySelectorAll('[data-desktop-file]').forEach(node=>node.remove());
    if(root.SpatialDisplayRoleBridge?.isSideSpace()||document.body.classList.contains('is-fullscreen-desktop'))return;
    let items;try{items=SpatialDesktopFiles.list(directory());}catch{return;}
    const width=Math.max(1,Math.floor((host.clientWidth-30)/92));
    for(const [index,file] of items.entries()){
      const button=document.createElement('button');button.type='button';button.className='desktop-folder';button.dataset.desktopFile=file.path;
      button.dataset.desktopPage=String(desktopPages.current(activeWorkspace));button.dataset.desktopColumn=desktopPages.column(activeWorkspace);button.dataset.desktopWorkspace=activeWorkspace;
      button.title=file.path;button.setAttribute('aria-label',file.name+' · '+(file.kind==='folder'?'Folder':'File'));
      button.innerHTML=icon(file.kind==='folder'?'i-folder':file.kind==='image'?'i-image':'i-note')+'<span>'+escapeHtml(file.name)+'</span>';
      button.style.left=(16+index%width*92)+'px';button.style.top=(48+Math.floor(index/width)*86)+'px';
      button.addEventListener('dblclick',()=>open(file.path));button.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();open(file.path);}if(event.key==='Delete'){event.preventDefault();try{SpatialDesktopFiles.trash([file.path]);}catch(error){showToast(error.message);}}});
      host.append(button);
    }
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}}
  createDesktopFolder=function(){
    try{const target=directory();if(!SpatialDesktopFiles.read(target))SpatialDesktopFiles.createDirectory(target);const folder=SpatialDesktopFiles.createDirectory(target+'/New Folder',{collision:'keep-both'});refresh();showToast(folder.name+' created in Desktop');host.querySelector('[data-desktop-file="'+CSS.escape(folder.path)+'"]')?.focus();}
    catch(error){showToast(error.message);}
  };
  const descriptor=contextMenuDescriptor;contextMenuDescriptor=function(target,...args){const node=target?.closest?.('[data-desktop-file]');if(node)return {kind:'surface-file',path:node.dataset.desktopFile,title:node.textContent.trim()};return descriptor(target,...args);};
  const entries=contextMenuEntries;contextMenuEntries=function(context){if(context.kind==='surface-file')return [{action:'surface-open',icon:'i-folder',label:'Open'},{action:'surface-folder',icon:'i-folder',label:'Open containing folder'},{action:'surface-copy',icon:'i-clipboard',label:'Copy'},{action:'surface-cut',icon:'i-clipboard',label:'Cut'},{separator:true},{action:'surface-trash',icon:'i-trash',label:'Move to Trash',danger:true}];return entries(context);};
  const execute=executeContextAction;executeContextAction=function(action){if(!action.startsWith('surface-'))return execute(action);const address=contextMenuState?.path;if(!address)return;try{if(action==='surface-open')open(address);if(action==='surface-folder')openFileLocation(SpatialDesktopFiles.parent(address));if(action==='surface-copy')SpatialDesktopFiles.copy([address]);if(action==='surface-cut')SpatialDesktopFiles.cut([address]);if(action==='surface-trash')SpatialDesktopFiles.trash([address]);}catch(error){showToast(error.message);}};
  const page=updateDesktopPageUi;updateDesktopPageUi=function(...args){const result=page(...args);schedule();return result;};
  const incoming=persistIncomingDesktopState;persistIncomingDesktopState=function(...args){const result=incoming(...args);schedule();return result;};
  root.addEventListener('spatial-files-change',schedule);root.addEventListener('resize',schedule);
  root.SpatialDesktopSurface={refresh,schedule,directory};refresh();
})(globalThis);
