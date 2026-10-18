/* A Workspace-owned shelf for supporting displays. Pins refer to real demo
   files/folders or web addresses; opening one always requires a user action. */
(function(root){
  'use strict';
  const text=(value,max=4000)=>typeof value==='string'?value.slice(0,max):'';
  const homePath=home=>typeof home==='string'?home:home?.root||home?.path||'';
  function normalizePath(value,home=''){
    let path=text(value,2000).trim();
    if(path==='~'||path.startsWith('~/'))path=homePath(home).replace(/\/$/,'')+path.slice(1);
    if(!path.startsWith('/')||/[\x00-\x1f\x7f]/.test(path)||path.split('/').includes('..'))return '';
    path=path.split('/').filter(part=>part&&part!=='.').join('/');
    return '/'+path;
  }
  function normalizeUrl(value){
    const address=text(value,2000).trim();
    if(!address||/[\x00-\x20\x7f]/.test(address))return '';
    try{const parsed=new URL(address);return /^https?:$/.test(parsed.protocol)&&!parsed.username&&!parsed.password?parsed.href:'';}catch{return '';}
  }
  function normalizeReference(value,home=''){
    if(typeof value==='string')value=/^https?:\/\//i.test(value)?{kind:'link',url:value}:{kind:'folder',path:value};
    if(!value||typeof value!=='object'||!['folder','file','link'].includes(value.kind))return null;
    const address=value.kind==='link'?normalizeUrl(value.url||value.address):normalizePath(value.path||value.address,home);
    if(!address)return null;
    const fallback=value.kind==='link'?new URL(address).hostname:address.split('/').filter(Boolean).at(-1)||'Filesystem';
    return {id:text(value.id,180)||value.kind+':'+address,kind:value.kind,label:text(value.label||value.title,100).trim()||fallback,...(value.kind==='link'?{url:address}:{path:address})};
  }
  function checklist(space){
    const saved=(Array.isArray(space?.widgets)?space.widgets:[]).find(widget=>widget?.kind==='checklist'&&widget.id==='side-checklist');
    return (Array.isArray(saved?.items)?saved.items:[]).slice(0,40).filter(item=>item&&typeof item.id==='string'&&text(item.text,200).trim()).map(item=>({id:item.id,text:text(item.text,200).trim(),done:item.done===true}));
  }
  const contextKey=state=>state?[state.setupKey,state.workspaceId,state.localSlot,state.role].join('|'):'';
  const api={normalizePath,normalizeUrl,normalizeReference,checklist,contextKey};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  const mounts=new Set(),records=new WeakMap(),drafts=new Map();
  const bridge=()=>root.SpatialDisplayRoleBridge;
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon=name=>'<svg aria-hidden="true"><use href="#'+name+'"/></svg>';
  function mount(host){
    if(!host||!host.querySelector)return null;
    if(records.has(host))return records.get(host).controller;
    host.classList.add('display-side-shelf');
    host.innerHTML=`
      <section class="display-side-section">
        <h2>Handy folders</h2>
        <nav class="display-side-home" aria-label="Workspace folder shortcuts"></nav>
      </section>
      <section class="display-side-section display-side-pins" aria-label="Pinned references">
        <div class="display-side-section-heading"><h2>Pinned references</h2><span data-side-pin-count></span></div>
        <div class="display-side-reference-list" data-side-references></div>
        <p class="display-side-empty" data-side-pin-empty>Keep a file, folder or web page within reach. Drag one here, or pin its address.</p>
        <details class="display-side-add" data-side-pin-editor>
          <summary>Pin a reference</summary>
          <form data-side-reference-form>
            <label data-side-options-label hidden>From this Workspace<select data-side-options aria-label="Choose a Workspace reference"><option value="">Choose a file or folder…</option></select></label>
            <label>Type<select name="kind" data-side-reference-kind><option value="folder">Folder</option><option value="file">File</option><option value="link">Web page</option></select></label>
            <label>Address<input name="address" data-side-reference-address type="text" maxlength="2000" placeholder="/home/… or ~/Documents" autocomplete="off" required></label>
            <label>Name <span>optional</span><input name="label" data-side-reference-label type="text" maxlength="100" placeholder="Name shown here" autocomplete="off"></label>
            <button type="submit" class="surface-key display-role-primary">Pin reference</button>
          </form>
        </details>
        <p class="display-side-feedback" data-side-feedback role="status" aria-live="polite"></p>
      </section>
      <section class="display-side-section display-side-notepad">
        <div class="display-side-section-heading"><label for="displaySideNote">Scratch note</label><span data-side-note-status>Saved here</span></div>
        <textarea id="displaySideNote" data-side-note rows="4" maxlength="8000" placeholder="A reminder, meeting notes or something to copy later…" spellcheck="true"></textarea>
        <button type="button" class="display-side-text-action" data-side-action="open-note">Open in Note Editor</button>
      </section>
      <section class="display-side-section display-side-checklist">
        <div class="display-side-section-heading"><h2>Checklist</h2><span data-side-task-count></span></div>
        <div data-side-tasks></div>
        <form class="display-side-task-form" data-side-task-form><label class="display-side-sr-only" for="displaySideTask">New checklist item</label><input id="displaySideTask" type="text" maxlength="200" placeholder="Add a next step…" autocomplete="off" required><button type="submit" class="surface-key" aria-label="Add checklist item">+</button></form>
        <button type="button" class="display-side-text-action" data-side-action="clear-done" hidden>Clear completed</button>
      </section>
      <p class="display-side-scope">Saved for this Workspace. Pins and notes stay here as you switch desktops and Projects.</p>`;
    const find=selector=>host.querySelector(selector),note=find('[data-side-note]'),form=find('[data-side-reference-form]'),taskForm=find('[data-side-task-form]');
    const record={host,key:'',state:null,pinsKey:'',tasksKey:'',foldersKey:'',optionsKey:'',controller:null};
    mounts.add(record);records.set(host,record);
    const message=value=>find('[data-side-feedback]').textContent=value;
    function current(){
      const state=bridge()?.state();
      return state?.role==='side'&&record.key===contextKey(state)?state:null;
    }
    function activeDraft(){return drafts.get(record.key)||{kind:'folder',address:'',label:'',task:'',expanded:false};}
    function storeDraft(){if(!record.key)return;drafts.set(record.key,{kind:find('[data-side-reference-kind]').value,address:find('[data-side-reference-address]').value,label:find('[data-side-reference-label]').value,task:find('#displaySideTask').value,expanded:find('[data-side-pin-editor]').open});}
    function update(patch){const state=current();if(!state)return false;bridge().updateSpace(patch);refresh(bridge().state());return true;}
    function refs(state){return (Array.isArray(state.space?.folders)?state.space.folders:[]).map(item=>normalizeReference(item,state.home)).filter(Boolean);}
    function pin(value){
      const state=current();if(!state)return false;
      const item=normalizeReference(value,state.home);
      if(!item){message('Use an absolute file path, ~/ path, or a full http:// or https:// web address.');return false;}
      const previous=refs(state),address=item.path||item.url;
      if(previous.some(ref=>ref.kind===item.kind&&(ref.path||ref.url)===address)){message('This reference is already pinned.');return false;}
      if(previous.length>=40){message('Remove a reference before adding another. Up to 40 can be pinned here.');return false;}
      update({folders:[...(Array.isArray(state.space?.folders)?state.space.folders:[]),item]});
      message('Pinned '+item.label+'.');return true;
    }
    function writeTasks(items){const state=current();if(!state)return;const widgets=(Array.isArray(state.space?.widgets)?state.space.widgets:[]).filter(widget=>!(widget?.kind==='checklist'&&widget.id==='side-checklist'));update({widgets:[...widgets,{id:'side-checklist',kind:'checklist',items}]});}
    function open(item){
      if(!current())return;
      if(typeof bridge()?.openReference==='function'){
        const result=bridge().openReference(item);
        if(result===false)message('This reference could not open. Check its address or remove the pin.');
      }else if(item.kind==='folder')bridge()?.openFolder(item.path);
      else message('Opening this reference is unavailable in this demo.');
    }
    function folderOptions(state){
      const options=(Array.isArray(state.referenceOptions)?state.referenceOptions:[]).map(item=>normalizeReference(item,state.home)).filter(Boolean);
      const home=normalizePath(homePath(state.home));
      const fallback=home?[{kind:'folder',path:home,label:'Home'},{kind:'folder',path:home+'/Documents',label:'Documents'},{kind:'folder',path:home+'/Downloads',label:'Downloads'}]:[];
      return {options,quick:options.length?[{kind:'folder',path:home,label:'Home'},...options.filter(item=>item.kind==='folder'&&[home+'/Documents',home+'/Downloads'].includes(item.path))].filter(item=>item.path):fallback};
    }
    function refresh(state=bridge()?.state()){
      if(!state)return;
      const key=contextKey(state),changed=record.key!==key;
      if(changed){
        storeDraft();record.key=key;record.pinsKey=record.tasksKey=record.foldersKey=record.optionsKey='';
        const draft=activeDraft();
        find('[data-side-reference-kind]').value=draft.kind;
        find('[data-side-reference-address]').value=draft.address;
        find('[data-side-reference-label]').value=draft.label;
        find('#displaySideTask').value=draft.task;
        find('[data-side-pin-editor]').open=draft.expanded;
        message('');
      }
      record.state=state;
      const pins=refs(state),pinsKey=JSON.stringify(pins);
      if(pinsKey!==record.pinsKey){
        record.pinsKey=pinsKey;
        find('[data-side-references]').innerHTML=pins.map(item=>'<div class="display-side-reference"><button type="button" class="display-side-reference-open" data-side-open="'+escape(item.id)+'" title="'+escape(item.path||item.url)+'">'+icon(item.kind==='folder'?'i-folder':item.kind==='link'?'i-web':'i-note')+'<span><b>'+escape(item.label)+'</b><small>'+escape(item.kind==='link'?new URL(item.url).hostname:item.path.replace(homePath(state.home),'~'))+'</small></span></button><button type="button" class="display-side-remove" data-side-remove="'+escape(item.id)+'" aria-label="Unpin '+escape(item.label)+'" title="Unpin reference">×</button></div>').join('');
        find('[data-side-pin-count]').textContent=pins.length||'';
        find('[data-side-pin-empty]').hidden=Boolean(pins.length);
      }
      const tasks=checklist(state.space),tasksKey=JSON.stringify(tasks);
      if(tasksKey!==record.tasksKey){
        record.tasksKey=tasksKey;
        find('[data-side-tasks]').innerHTML=tasks.map(item=>'<div class="display-side-task'+(item.done?' is-done':'')+'"><label><input type="checkbox" data-side-task="'+escape(item.id)+'"'+(item.done?' checked':'')+'><span>'+escape(item.text)+'</span></label><button type="button" class="display-side-remove" data-side-remove-task="'+escape(item.id)+'" aria-label="Remove '+escape(item.text)+'" title="Remove checklist item">×</button></div>').join('');
        find('[data-side-task-count]').textContent=tasks.length?tasks.filter(item=>item.done).length+'/'+tasks.length:'';
        find('[data-side-action="clear-done"]').hidden=!tasks.some(item=>item.done);
      }
      if(changed||document.activeElement!==note)note.value=state.space?.note||'';
      find('[data-side-action="open-note"]').disabled=!note.value.trim();
      const {options,quick}=folderOptions(state),foldersKey=JSON.stringify(quick),optionsKey=JSON.stringify(options);
      if(foldersKey!==record.foldersKey){record.foldersKey=foldersKey;find('.display-side-home').innerHTML=quick.map(item=>'<button type="button" class="surface-key" data-side-quick-folder="'+escape(item.path)+'" title="'+escape(item.path)+'">'+icon('i-folder')+'<span>'+escape(item.label)+'</span></button>').join('');}
      if(optionsKey!==record.optionsKey){record.optionsKey=optionsKey;find('[data-side-options-label]').hidden=!options.length;find('[data-side-options]').innerHTML='<option value="">Choose a file or folder…</option>'+options.map((item,index)=>'<option value="'+index+'">'+escape(item.label+' · '+(item.kind==='folder'?'Folder':'File'))+'</option>').join('');record.options=options;}
      find('[data-side-reference-address]').placeholder=find('[data-side-reference-kind]').value==='link'?'https://example.com/page':'/home/… or ~/Documents';
      if(typeof prepareControlSemantics==='function')prepareControlSemantics(host);
    }
    function onClick(event){
      const button=event.target.closest('button');if(!button||!host.contains(button)||!current())return;
      const state=current();
      if(button.hasAttribute('data-side-open')){const item=refs(state).find(item=>item.id===button.dataset.sideOpen);if(item)open(item);}
      if(button.hasAttribute('data-side-remove')){
        update({folders:(state.space?.folders||[]).filter(item=>normalizeReference(item,state.home)?.id!==button.dataset.sideRemove)});
        message('Reference unpinned. The original is unchanged.');
      }
      if(button.hasAttribute('data-side-quick-folder'))open({kind:'folder',path:button.dataset.sideQuickFolder,label:button.textContent.trim()});
      if(button.hasAttribute('data-side-remove-task'))writeTasks(checklist(state.space).filter(item=>item.id!==button.dataset.sideRemoveTask));
      if(button.dataset.sideAction==='clear-done')writeTasks(checklist(state.space).filter(item=>!item.done));
      if(button.dataset.sideAction==='open-note'&&note.value.trim())bridge()?.launchNote(state.workspace+' — Scratch note',note.value);
    }
    function onChange(event){
      if(!current())return;
      if(event.target.hasAttribute('data-side-task'))writeTasks(checklist(current().space).map(item=>item.id===event.target.dataset.sideTask?{...item,done:event.target.checked}:item));
      if(event.target.hasAttribute('data-side-reference-kind')){find('[data-side-reference-address]').placeholder=event.target.value==='link'?'https://example.com/page':'/home/… or ~/Documents';storeDraft();}
      if(event.target.hasAttribute('data-side-options')){
        const option=record.options?.[Number(event.target.value)];
        if(event.target.value!==''&&option){find('[data-side-reference-kind]').value=option.kind;find('[data-side-reference-address]').value=option.path||option.url;find('[data-side-reference-label]').value=option.label;storeDraft();}
      }
    }
    function onInput(event){
      if(!current())return;
      if(event.target===note){const value=note.value.slice(0,8000);if(note.value!==value)note.value=value;update({note:value});find('[data-side-note-status]').textContent='Saved here';find('[data-side-action="open-note"]').disabled=!value.trim();}
      else storeDraft();
    }
    function onSubmit(event){
      if(!event.target.matches('[data-side-reference-form],[data-side-task-form]'))return;
      event.preventDefault();if(!current())return;
      if(event.target===form){
        const kind=find('[data-side-reference-kind]').value,address=find('[data-side-reference-address]').value,label=find('[data-side-reference-label]').value;
        if(pin({kind,label,...(kind==='link'?{url:address}:{path:address})})){
          find('[data-side-reference-address]').value='';find('[data-side-reference-label]').value='';find('[data-side-options]').value='';storeDraft();find('[data-side-reference-address]').focus();
        }
      }else{
        const input=find('#displaySideTask'),value=input.value.trim(),tasks=checklist(current().space);
        if(!value)return;
        if(tasks.length>=40){message('Clear a checklist item before adding another. Up to 40 fit here.');return;}
        writeTasks([...tasks,{id:'task-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),text:value,done:false}]);input.value='';storeDraft();input.focus();
      }
    }
    function onDragOver(event){
      if(!current())return;
      const types=Array.from(event.dataTransfer?.types||[]);
      if(!types.some(type=>['text/plain','text/uri-list',root.SpatialAIContext?.MIME||'application/x-spatial-context'].includes(type)))return;
      event.preventDefault();event.dataTransfer.dropEffect='copy';host.classList.add('is-drop-target');
    }
    function onDragLeave(event){if(!host.contains(event.relatedTarget))host.classList.remove('is-drop-target');}
    function onDrop(event){
      host.classList.remove('is-drop-target');if(!current())return;
      let item=null;
      try{const data=event.dataTransfer?.getData(root.SpatialAIContext?.MIME||'application/x-spatial-context');if(data){const value=JSON.parse(data),address=value.address||value.source?.address;item={kind:/^https?:\/\//i.test(address||'')?'link':value.kind==='folder'?'folder':'file',address,label:value.title||value.filename};}}catch{}
      if(!item){const value=(event.dataTransfer?.getData('text/uri-list')||event.dataTransfer?.getData('text/plain')||'').split('\n').find(line=>line.trim()&&!line.startsWith('#'))||'';item={kind:/^https?:\/\//i.test(value)?'link':'file',address:value};}
      if(normalizeReference(item,current().home)){event.preventDefault();event.stopPropagation();pin(item);}else message('Drop a file or folder from Files, or a full web address. Files dropped from your computer must first be added to Files.');
    }
    host.addEventListener('click',onClick);host.addEventListener('change',onChange);host.addEventListener('input',onInput);host.addEventListener('submit',onSubmit);host.addEventListener('dragover',onDragOver);host.addEventListener('dragleave',onDragLeave);host.addEventListener('drop',onDrop);
    const controller={refresh,dispose(){storeDraft();mounts.delete(record);records.delete(host);host.removeEventListener('click',onClick);host.removeEventListener('change',onChange);host.removeEventListener('input',onInput);host.removeEventListener('submit',onSubmit);host.removeEventListener('dragover',onDragOver);host.removeEventListener('dragleave',onDragLeave);host.removeEventListener('drop',onDrop);}};
    record.controller=controller;refresh();return controller;
  }
  root.SpatialDisplaySideTools={...api,mount,refresh(state=bridge()?.state()){for(const record of mounts)record.controller.refresh(state);}};
})(typeof globalThis!=='undefined'?globalThis:this);
