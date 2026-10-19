/* A private clipboard for each Workspace. Host clipboard access is explicit. */
(function(root){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function create(saved={}){
    const records={},cleared={};
    function merge(value={}){
      for(const [workspace,time] of Object.entries(value.cleared||{}))cleared[workspace]=Math.max(cleared[workspace]||0,Number(time)||0);
      for(const item of Object.values(value.records||{})){
        const normalized=normalize(item);if(!normalized||normalized.time<=(cleared[normalized.workspace]||0))continue;
        if(!records[normalized.id]||normalized.time>records[normalized.id].time)records[normalized.id]=normalized;
      }
      for(const [id,item] of Object.entries(records))if(item.time<=(cleared[item.workspace]||0))delete records[id];
      for(const workspace of new Set(Object.values(records).map(item=>item.workspace))){
        const seen=new Set();let count=0;
        for(const item of list(workspace)){const signature=item.kind+'|'+(item.kind==='files'?item.mode+'|'+JSON.stringify(item.paths):item.text);if(seen.has(signature)||count>=30)delete records[item.id];else{seen.add(signature);count++;}}
      }
    }
    function normalize(item){
      if(!item||typeof item.workspace!=='string'||typeof item.id!=='string'||!Number.isFinite(item.time))return null;
      const kind=['text','location','files'].includes(item.kind)?item.kind:'text';
      const value={id:item.id.slice(0,100),workspace:item.workspace.slice(0,100),kind,time:item.time,label:String(item.label||'').slice(0,100)};
      if(kind==='files'){
        value.paths=(Array.isArray(item.paths)?item.paths:[]).filter(path=>typeof path==='string').slice(0,100).map(path=>path.slice(0,2000));
        if(!value.paths.length)return null;
        value.mode=item.mode==='cut'?'cut':'copy';
        value.items=(Array.isArray(item.items)?item.items:[]).slice(0,100).map(file=>({itemId:String(file.itemId||file.id||'').slice(0,100),path:String(file.path||'').slice(0,2000),name:String(file.name||'').slice(0,200)}));
      }else{value.text=String(item.text||'').slice(0,20000);if(!value.text.trim())return null;}
      return value;
    }
    function list(workspace){return Object.values(records).filter(item=>item.workspace===workspace).sort((a,b)=>b.time-a.time||b.id.localeCompare(a.id)).map(clone);}
    function add(item){
      const next=normalize(item);if(!next)return null;
      next.time=Math.max(next.time,(cleared[next.workspace]||0)+1);
      // Repeated copies promote one entry instead of filling the history.
      const same=list(next.workspace).find(old=>old.kind===next.kind&&(next.kind==='files'?old.mode===next.mode&&JSON.stringify(old.paths)===JSON.stringify(next.paths):old.text===next.text));
      if(same)delete records[same.id];
      records[next.id]=next;
      for(const old of list(next.workspace).slice(30))delete records[old.id];
      return clone(next);
    }
    function clear(workspace,time=Date.now()){cleared[workspace]=Math.max(time,...list(workspace).map(item=>item.time),cleared[workspace]||0);for(const [id,item] of Object.entries(records))if(item.workspace===workspace)delete records[id];}
    merge(saved);return {list,add,clear,merge,snapshot:()=>clone({records,cleared})};
  }
  function isPrivateField(target){return Boolean(target?.closest?.('input[type="password"],[autocomplete="current-password"],[autocomplete="new-password"],[autocomplete="one-time-code"],[data-private-clipboard],[data-clipboard-private]'));}
  function editable(target){return Boolean(target&&!isPrivateField(target)&&!target.disabled&&!target.readOnly&&(target.matches?.('textarea,input:not([type]),input[type="text"],input[type="search"],input[type="url"],input[type="email"],input[type="tel"]')||target.isContentEditable));}
  function pasteTextFile(files,item,directory,workspace){
    if(!files?.write)throw new Error('File operations are not available yet.');
    if(item.workspace&&item.workspace!==workspace)throw new Error('This clipboard item belongs to another Workspace.');
    if(typeof item.text!=='string')throw new Error('Choose a text clipboard item.');
    if(item.text.length>12000)throw new Error('Text files in this demo support up to 12,000 characters. Your clipboard item has been kept.');
    const address=files.path(directory);files.owner(address,{workspace});
    let folder=files.read(address,{workspace});
    // Home and Project Desktop are ordinary directories. Create only this
    // standard destination, and let the file model validate its parent/scope.
    if(!folder&&address.split('/').pop()==='Desktop')folder=files.createDirectory(address,{workspace});
    if(!folder||folder.kind!=='folder')throw new Error('The destination folder is no longer available. Your clipboard item has been kept.');
    return files.write(address.replace(/\/$/,'')+'/Pasted text.txt',item.text,{workspace,collision:'keep-both',source:'Workspace clipboard'});
  }
  const api={create,isPrivateField,editable,pasteTextFile};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  if(typeof desktopStorage==='undefined')return;
  const key='spatial-desktop-clipboard-v1';let saved={};try{saved=JSON.parse(desktopStorage.getItem(key)||'{}');}catch{}
  const model=create(saved),make=(tag,cls,html='')=>{const node=document.createElement(tag);node.className=cls;node.innerHTML=html;return node;};
  let lastEditable=null,lastRange=null,selectedId='',renderPending=0,lastSaveOk=true;
  const workspace=()=>activeWorkspace;
  const section=document.querySelector('[data-widget-source="system"]');
  if(!section)return;
  const widget=make('section','system-widget desktop-clipboard-widget','<header class="widget-heading"><div>'+icon('i-clipboard')+'<h2>Clipboard</h2></div><button type="button" class="surface-key tiny-key" data-clipboard-clear>Clear</button></header><p class="desktop-clipboard-context"></p><div class="desktop-clipboard-list"></div><form class="desktop-clipboard-destination" hidden><label>Paste files into<input aria-label="Clipboard destination folder" autocomplete="off" spellcheck="false"></label><button class="surface-key" type="submit">Paste files</button></form><small class="desktop-clipboard-status" role="status"></small>');
  widget.id='desktopClipboardWidget';section.append(widget);

  const list=widget.querySelector('.desktop-clipboard-list'),status=widget.querySelector('[role="status"]'),destination=widget.querySelector('form'),folder=destination.querySelector('input');
  function save(broadcast=true){
    try{desktopStorage.setItem(key,JSON.stringify(model.snapshot()));lastSaveOk=true;}catch{lastSaveOk=false;status.textContent='Clipboard could not be saved. Browser storage may be full.';render();return false;}
    if(broadcast&&typeof queueDesktopStateBroadcast==='function')queueDesktopStateBroadcast(120);render();return true;
  }
  function remember(value){
    const item=model.add({...value,workspace:value.workspace||workspace(),id:root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2),time:Date.now()});
    if(item)save();return item;
  }
  async function copyText(text,label='Copied text',options={}){
    const item=remember({kind:options.kind||'text',text,label});if(!item)return false;
    if(options.host===false){if(lastSaveOk)status.textContent='Saved to this Workspace clipboard.';return lastSaveOk;}
    const retained=lastSaveOk;
    try{if(!navigator.clipboard?.writeText)throw new Error('unavailable');await navigator.clipboard.writeText(item.text);status.textContent=retained?'Copied to the browser clipboard and this Workspace.':'Copied to the browser clipboard. Workspace history could not be saved.';showToast(retained?'Copied to clipboard.':'Browser copy succeeded. Workspace history could not be saved.');return true;}
    catch{status.textContent=retained?'Saved to this Workspace. Browser clipboard access was unavailable.':'Clipboard is available in this tab only. Browser copy and saved history were unavailable.';showToast(status.textContent);return false;}
  }
  function defaultFolder(){
    const focused=document.activeElement?.closest?.('[data-app-frame][data-file-location]');
    return focused?.dataset.fileLocation||root.SpatialDesktopFiles?.currentDirectory?.()||workspaceProfiles[workspace()]?.home+'/Documents';
  }
  function open(){status.textContent='';render();globalThis.SpatialPanels?.openApplet?.('clipboard');}
  function chosen(){return model.list(workspace()).find(item=>item.id===selectedId)||model.list(workspace())[0];}
  function textPaste(item,target){
    if(!editable(target)||!target.isConnected){open();status.textContent='Focus a text field, then choose Paste from Clipboard.';showToast(status.textContent);return false;}
    if(target.closest('[hidden],[inert],[aria-hidden="true"]')){status.textContent='Open the document before pasting.';showToast(status.textContent);return false;}
    target.focus({preventScroll:true});
    if(target.isContentEditable){
      const selection=window.getSelection();if(lastRange&&target.contains(lastRange.commonAncestorContainer)){selection.removeAllRanges();selection.addRange(lastRange);}
      const range=selection.rangeCount&&target.contains(selection.getRangeAt(0).commonAncestorContainer)?selection.getRangeAt(0):document.createRange();
      if(!selection.rangeCount||!target.contains(range.commonAncestorContainer)){range.selectNodeContents(target);range.collapse(false);}
      range.deleteContents();const node=document.createTextNode(item.text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);
    }else target.setRangeText(item.text,target.selectionStart??target.value.length,target.selectionEnd??target.value.length,'end');
    target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));status.textContent='Pasted into '+(target.getAttribute('aria-label')||'the text field')+'.';return true;
  }
  function paste(target,entry){
    const item=entry||chosen();if(!item){open();status.textContent='Clipboard is empty in this Workspace.';return false;}
    selectedId=item.id;
    const directory=typeof target==='string'?target:target?.directory;
    if(item.kind!=='files'){
      if(!directory)return textPaste(item,editable(target)?target:lastEditable);
      try{const file=pasteTextFile(root.SpatialDesktopFiles,item,directory,workspace());status.textContent='Saved '+file.path+'.';showToast(status.textContent);destination.hidden=true;return file;}
      catch(error){status.textContent=error.message||'Text could not be saved. Your clipboard item has been kept.';showToast(status.textContent);return false;}
    }
    if(!directory){destination.hidden=false;folder.value=defaultFolder();open();destination.hidden=false;folder.focus();status.textContent='Choose a folder for '+item.paths.length+' '+(item.paths.length===1?'file':'files')+'.';return false;}
    try{
      if(!root.SpatialDesktopFiles?.pasteClipboard)throw new Error('File operations are not available yet.');
      const result=root.SpatialDesktopFiles.pasteClipboard(item,directory,{workspace:workspace(),collision:target?.collision||'cancel'});
      status.textContent='Files pasted into '+directory+'.';destination.hidden=true;return result;
    }catch(error){status.textContent=error.message||'Files could not be pasted.';showToast(status.textContent);return false;}
  }
  function render(){
    const items=model.list(workspace()),profile=workspaceProfiles[workspace()];
    widget.querySelector('.desktop-clipboard-context').textContent=(profile?.label||workspace())+' only · '+items.length+' of 30 items';
    widget.querySelector('[data-clipboard-clear]').disabled=!items.length;
    const signature=JSON.stringify(items);if(list.dataset.rendered===signature)return;list.dataset.rendered=signature;list.replaceChildren();
    if(!items.length){const empty=make('p','desktop-clipboard-empty');empty.textContent='Copy text or files in the demo to keep them here.';list.append(empty);}
    for(const item of items){
      const row=make('article','desktop-clipboard-item');row.dataset.clipboardItem=item.id;
      const text=make('div','desktop-clipboard-copy'),name=document.createElement('b'),preview=document.createElement('p');
      name.textContent=item.label||(item.kind==='files'?(item.mode==='cut'?'Cut':'Copied')+' files':item.kind==='location'?'Location':'Copied text');
      preview.textContent=item.kind==='files'?item.paths.map(path=>path.split('/').pop()).join(', '):item.text;text.append(name,preview);
      const controls=make('div','desktop-clipboard-actions','<button type="button" data-clipboard-paste>'+(item.kind==='files'?'Paste files…':'Paste')+'</button>'+(item.kind==='files'?'':'<button type="button" data-clipboard-host>Copy to browser</button>'));
      row.append(text,controls);list.append(row);
    }
  }
  function schedule(){if(!renderPending)renderPending=requestAnimationFrame(()=>{renderPending=0;render();});}
  widget.addEventListener('click',event=>{
    if(event.target.closest('[data-clipboard-clear]')){model.clear(workspace());selectedId='';destination.hidden=true;save();status.textContent='Clipboard history cleared for this Workspace.';return;}
    const row=event.target.closest('[data-clipboard-item]');if(!row)return;
    const item=model.list(workspace()).find(value=>value.id===row.dataset.clipboardItem);if(!item)return;selectedId=item.id;
    if(event.target.closest('[data-clipboard-paste]'))paste(null,item);
    if(event.target.closest('[data-clipboard-host]'))copyText(item.text,item.label,{kind:item.kind});
  });
  destination.addEventListener('submit',event=>{event.preventDefault();paste(folder.value.trim(),chosen());});
  document.addEventListener('focusin',event=>{if(editable(event.target)&&!widget.contains(event.target)){lastEditable=event.target;lastRange=null;}});
  document.addEventListener('focusout',event=>{if(lastEditable?.isContentEditable&&event.target===lastEditable){const selection=window.getSelection();if(selection.rangeCount)lastRange=selection.getRangeAt(0).cloneRange();}});
  function rememberSelection(event){
    if(isPrivateField(event.target)||isPrivateField(document.activeElement)||widget.contains(event.target))return;
    let text=event.clipboardData?.getData('text/plain')||'';
    if(!text&&editable(event.target)&&typeof event.target.selectionStart==='number')text=event.target.value.slice(event.target.selectionStart,event.target.selectionEnd);
    if(!text)text=window.getSelection()?.toString()||'';
    if(text.trim())remember({text,label:'Copied text'});
  }
  document.addEventListener('copy',rememberSelection);document.addEventListener('cut',rememberSelection);
  window.addEventListener('spatial-file-clipboard-change',event=>{const value=event.detail;if(value?.workspace)remember({...value,kind:'files',label:(value.mode==='cut'?'Cut':'Copied')+' '+value.paths.length+' '+(value.paths.length===1?'file':'files')});});
  window.addEventListener('storage',event=>{if(event.key===key){try{model.merge(JSON.parse(event.newValue||'{}'));render();}catch{}}});
  const originalWorkspace=renderWorkspace;renderWorkspace=function(...args){lastEditable=null;lastRange=null;selectedId='';destination.hidden=true;status.textContent='';const result=originalWorkspace(...args);schedule();return result;};
  const originalCapture=captureDesktopSyncState;captureDesktopSyncState=function(){return {...originalCapture(),workspaceClipboard:model.snapshot()};};
  const originalIncoming=persistIncomingDesktopState;persistIncomingDesktopState=function(state){if(state.workspaceClipboard){model.merge(state.workspaceClipboard);save(false);}return originalIncoming(state);};
  // The user policy lives beside notifications, and never discards quiet arrivals.
  const notifications=root.SpatialAllWorkspaces;
  if(notifications){
    const controls=[];
    for(const host of [document.querySelector('#notificationWidget'),document.querySelector('#overviewNotifications')].filter(Boolean)){
      const control=make('button','surface-key desktop-notification-dnd');control.type='button';control.dataset.notificationDnd='';control.setAttribute('aria-label','Do Not Disturb');host.querySelector('header')?.after(control);controls.push(control);
      control.addEventListener('click',()=>notifications.setDoNotDisturb(!notifications.doNotDisturb()));
    }
    const notifyWidget=document.querySelector('#notificationWidget');
    const empty=make('p','desktop-notification-empty');empty.textContent='No notifications in this Workspace.';notifyWidget?.append(empty);
    function keepCenter(){if(notifyWidget){notifyWidget.hidden=false;notifyWidget.classList.add('is-visible');empty.hidden=notifications.list(workspace()).length>0;}}
    const update=()=>{const enabled=notifications.doNotDisturb();if(enabled&&typeof hideNotificationPeek==='function')hideNotificationPeek();for(const control of controls){control.setAttribute('aria-pressed',String(enabled));control.textContent='Do Not Disturb · '+(enabled?'On':'Off');control.title=enabled?'Popups are quiet. Notifications are still saved.':'Mute notification popups; keep notification history.';}keepCenter();notifications.renderActions?.();};
    // Keep the empty center reachable so Do Not Disturb can be enabled before
    // the first notification arrives.
    if(notifyWidget&&typeof concealDynamicWidget==='function'){
      const originalConceal=concealDynamicWidget;concealDynamicWidget=function(target){if(target===notifyWidget){keepCenter();return;}return originalConceal(target);};
    }
    notifications.subscribe(update);update();
    if(typeof MutationObserver==='function'){
      const observer=new MutationObserver(()=>notifications.renderActions?.());
      for(const host of document.querySelectorAll('#notificationList,#systemWideNotificationList,#overviewNotificationList,#overviewSystemWideNotificationList'))observer.observe(host,{childList:true});
    }
  }
  root.SpatialDesktopClipboard={...api,open,remember,copyText,paste,clear:()=>{model.clear(workspace());save();},list:()=>model.list(workspace()),snapshot:model.snapshot};render();
})(typeof globalThis!=='undefined'?globalThis:this);
