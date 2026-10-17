/* Shared item identity: Stash entries are views; the retained journey is independent. */
(function(){
  'use strict';
  const H=SpatialItemHistory,key='spatial-item-history-v1',uiKey='spatial-item-history-ui-v1';
  let model=H.create(readDesktopStorage(key,{})),metadata=readDesktopStorage(uiKey,{}),lastSaved='',syncing=false;
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))metadata={};
  const canonical=item=>String(item?.itemId||item?.fileId||item?.id||'');
  const owner=item=>{try{const [workspace,project]=JSON.parse(item.scope||item.storageScope);return {workspace,project};}catch{return {workspace:item.workspace||activeWorkspace,project:item.project||null};}};
  const context=()=>({workspace:activeWorkspace,project:projectSpaces[desktopPages.column(activeWorkspace)]?desktopPages.column(activeWorkspace):null});
  const scopeLabel=ref=>ref.project?(projectSpaces[ref.project]?.name||ref.project)+' · '+(workspaceProfiles[ref.workspace]?.label||ref.workspace):(workspaceProfiles[ref.workspace]?.label||ref.workspace)+' workspace';
  const appLabel=id=>id==='ai-demo'?'Assistant demo':appInfo[id]?.label||appInfo[String(id).split('--')[0]]?.label||id;
  const date=time=>time?new Date(time).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Time unknown';
  const html=escapeHtml;
  let saveQueued=false;
  function persist(){
    saveQueued=false;const value=JSON.stringify(model.snapshot());if(value===lastSaved)return true;
    try{desktopStorage.setItem(key,value);lastSaved=value;if(!syncing)queueDesktopStateBroadcast(0);return true;}
    catch{showToast('Item history could not be saved. Keep this tab open and export the item history.');return false;}
  }
  function scheduleSave(){if(!saveQueued){saveQueued=true;queueMicrotask(persist);}}
  function capture(item,options={}){
    if(!item||!canonical(item))return null;
    const id=canonical(item),before=model.get(id),at={...owner(item),...options};
    // A stale local reference must never overwrite a newer edit from another Stash.
    if(!before&&Number(item.created)>0&&Number(item.created)<Date.now()-60000&&!options.action){at.action='indexed';at.detail='Indexed an existing Stash entry. Its known saved date is preserved.';}
    const changed=!before||options.force||Number(item.updated)>before.updated;
    let result=before;
    if(changed)result=model.upsert({...item,id,fileId:undefined,address:item.source?.address||item.address||'',source:item.source||{}},at);
    else if(!before.references.some(ref=>ref.active&&ref.workspace===at.workspace&&(ref.project||null)===(at.project||null)))result=model.record(id,'reference',at)||before;
    if(options.related?.length){for(const related of options.related){const parent=typeof related==='string'?related:related.itemId||related.id;if(parent&&parent!==id)model.link(id,{itemId:parent,versionId:typeof related==='object'?related.versionId:undefined},typeof related==='object'?related.relation||options.relation||'derivedFrom':options.relation||'derivedFrom');}result=model.get(id);}
    if(changed||result!==before||options.related?.length)scheduleSave();return model.get(id);
  }
  function hydrate(item){
    const saved=capture(item);if(!saved)return item;
    return {...item,title:saved.title,text:saved.text,source:saved.origin||saved.source,attachment:saved.attachment,itemId:saved.id};
  }
  function record(id,type,options={}){const event=model.record(id,type,{...context(),...options});if(event)scheduleSave();return event;}
  function accessible(id,workspace=activeWorkspace){return model.list(workspace).some(item=>item.id===id);}
  function get(id){return accessible(id)?model.get(id):null;}
  function allEntries(){return globalThis.SpatialMemoryDesktop?.allItems?.()||[];}
  function locations(id){return allEntries().filter(item=>canonical(item)===id&&owner(item).workspace===activeWorkspace);}
  function tags(id){return Array.isArray(metadata[id]?.tags)?metadata[id].tags.filter(tag=>typeof tag==='string').slice(0,16):[];}
  function saveTags(id,value){
    const next=[...new Set(String(value).split(',').map(tag=>tag.trim().slice(0,40)).filter(Boolean))].slice(0,16);
    metadata[id]={tags:next,updated:Date.now()};try{desktopStorage.setItem(uiKey,JSON.stringify(metadata));queueDesktopStateBroadcast(0);}catch{showToast('Tags could not be saved.');}record(id,'tagged',{detail:next.length?'Tags: '+next.join(', '):'Tags cleared'});
  }
  const sheet=document.createElement('dialog');sheet.className='item-history-dialog material-surface-glass';sheet.setAttribute('aria-label','Item history');document.body.append(sheet);
  let dialogItem='',returnFocus=null,dialogWorkspace='',objectUrls=[];
  function close(){sheet.close();objectUrls.forEach(url=>URL.revokeObjectURL(url));objectUrls=[];returnFocus?.isConnected&&returnFocus.focus({preventScroll:true});}
  function display(body,title='Item history'){
    returnFocus=document.activeElement;dialogWorkspace=activeWorkspace;
    sheet.innerHTML='<header><div><small>'+html(title)+'</small><h2 id="itemHistoryTitle"></h2></div><button class="surface-key" data-history-close aria-label="Close '+html(title)+'">'+icon('i-close')+'</button></header>'+body;
    sheet.setAttribute('aria-labelledby','itemHistoryTitle');if(!sheet.open)sheet.showModal();prepareControlSemantics(sheet);sheet.querySelector('[data-history-close]').focus();
  }
  function facts(source){
    return '<dl class="history-facts"><div><dt>Page / source</dt><dd>'+html(source.address||'Unknown')+'</dd></div><div><dt>Captured via</dt><dd>'+html(source.app?appLabel(source.app):'App unknown')+'</dd></div><div><dt>Project at capture</dt><dd>'+html(source.project?projectSpaces[source.project]?.name||source.project:'No project recorded')+'</dd></div><div><dt>Workspace at capture</dt><dd>'+html(source.workspace?workspaceProfiles[source.workspace]?.label||source.workspace:'Unknown')+'</dd></div></dl>';
  }
  const eventLabel={'capture':'Saved','indexed':'Existing item indexed','reference':'Added reference','version':'Content changed','edit':'Edited','copiedFrom':'Copied from source','removed-from-stash':'Removed from Stash','moved':'Moved','used-in-assistant':'Used in Assistant','assistant.use':'Used in Assistant','use':'Used in Assistant','tagged':'Tags changed','opened':'Opened','note':'Note'};
  function open(id,{versionId='',workspace=activeWorkspace}={}){
    if(workspace!==activeWorkspace||!accessible(id,workspace)){showToast('This item is outside the current Workspace.');return false;}
    const item=model.get(id);if(!item)return false;dialogItem=id;
    const entries=locations(id),parents=item.relations||[],versions=item.versions||[];
    display('<div class="history-body"><p class="history-kind">'+html(item.attachment?'Saved '+item.attachment.kind:item.text?'Saved text':item.address?'Source link · content not captured':'Saved item')+'</p>'+
      '<details open><summary>Origin</summary>'+facts(item.origin||item.source||{})+'</details>'+
      '<details><summary>Current locations <small>'+entries.length+'</small></summary>'+(entries.length?'<ul>'+entries.map(entry=>'<li><b>'+html(scopeLabel(owner(entry)))+'</b><small>'+html(SpatialMemoryDesktop.savedItem(entry)?.path||'Stash entry')+'</small><span>'+html(entry.reference?'Reference · shared content':'Saved item')+'</span></li>').join('')+'</ul>':'<p>No current Stash entry. The retained history is still available.</p>')+'</details>'+
      '<details'+(parents.length?' open':'')+'><summary>Sources <small>'+parents.length+'</small></summary>'+(parents.length?'<ul>'+parents.map(parent=>{const known=get(parent.itemId);return '<li><button class="memory-text-action" data-history-parent="'+html(parent.itemId)+'" data-history-parent-version="'+html(parent.versionId||'')+'"'+(!known?' disabled':'')+'>'+html(known?.title||'Source unavailable in this Workspace')+'</button><small>'+html(parent.relation==='copiedFrom'?'Independent copy of':parent.relation==='derivedFrom'?'Derived from':parent.relation)+' · '+html(known?.versions?.findIndex(version=>version.id===parent.versionId)>=0?'Version '+(known.versions.findIndex(version=>version.id===parent.versionId)+1):'Version unknown')+'</small></li>';}).join('')+'</ul>':'<p>No earlier source item recorded.</p>')+'</details>'+
      '<details'+(versionId?' open':'')+'><summary>Versions <small>'+versions.length+'</small></summary><p>Readable saved content. File history is separate from backups.</p><label class="history-version-label">Saved version<select data-history-version>'+versions.slice().reverse().map((version,index)=>'<option value="'+html(version.id)+'"'+((versionId?version.id===versionId:index===0)?' selected':'')+'>'+'Version '+(versions.length-index)+' · '+html(date(version.created))+(version.id===item.currentVersion?' · current':'')+'</option>').join('')+'</select></label><div data-history-content></div></details>'+
      '<details open><summary>Journey <small>'+item.events.length+'</small></summary><ol class="history-journey">'+item.events.slice().reverse().map(event=>'<li><b>'+html(eventLabel[event.type]||event.type.replaceAll('-',' '))+'</b><time>'+html(date(event.created||event.time))+'</time><small>'+html(scopeLabel(event))+'</small>'+(event.detail?'<p>'+html(event.detail)+'</p>':'')+'</li>').join('')+'</ol></details>'+
      '<form data-history-note><label>Note about this item<textarea maxlength="1000" rows="2" required placeholder="Why did this matter?"></textarea></label><button class="surface-key" type="submit">Add note</button></form></div><footer><button class="surface-key" data-history-export>Export item history</button><small>History keeps recorded facts; unknown steps stay unknown.</small></footer>');
    sheet.querySelector('h2').textContent=item.title;renderVersion(versionId||item.currentVersion);return true;
  }
  async function renderVersion(versionId){
    const item=model.get(dialogItem),version=model.version(dialogItem,versionId),target=sheet.querySelector('[data-history-content]');if(!target||!version)return;
    target.replaceChildren();const text=document.createElement('pre');text.textContent=version.text||(!version.attachment?'This version contains a source link; page contents were not captured.':'No text content was captured for this file.');target.append(text);
    if(version.address){const link=document.createElement('p');link.textContent='Source: '+version.address;target.append(link);}
    const media=SpatialStashFiles.safeAttachment(version.attachment);if(media?.kind==='image'||media?.kind==='audio'){
      try{let src=media.src;if(media.key){const blob=await SpatialStashFiles.get(media.key);if(!blob)throw Error('Missing file');src=URL.createObjectURL(blob);objectUrls.push(src);}if(!target.isConnected||sheet.querySelector('[data-history-version]')?.value!==versionId)return;const element=document.createElement(media.kind==='image'?'img':'audio');element.src=src;if(media.kind==='image')element.alt=version.title;else element.controls=true;target.prepend(element);}catch{const message=document.createElement('p');message.textContent='Saved file bytes are unavailable; recorded metadata remains.';target.append(message);}
    }
    if(version.attachment){const detail=document.createElement('p');detail.textContent='File: '+(version.attachment.filename||version.title)+'. Saved file content is separate from the caption.';target.append(detail);}
  }
  function transfer(item){
    item=hydrate(item);
    const from=owner(item);if(from.workspace!==activeWorkspace)return;capture(item);dialogItem=canonical(item);
    const destinations=[{workspace:activeWorkspace,project:null},...Object.entries(projectSpaces).filter(([id,project])=>project.originWorkspace===activeWorkspace||openProjectNames().includes(id)).map(([id])=>({workspace:activeWorkspace,project:id}))].filter(ref=>ref.project!==from.project);
    display('<form class="history-transfer" data-history-transfer><p>Keep this item available elsewhere in the current Workspace.</p><label>Destination<select name="destination" required>'+destinations.map(ref=>'<option value="'+html(JSON.stringify([ref.workspace,ref.project]))+'">'+html(scopeLabel(ref))+' Stash</option>').join('')+'</select></label><fieldset><legend>How should they relate?</legend><label><input type="radio" name="method" value="reference" checked><span><b>Add reference</b><small>Shared content. Edits are visible in both Stashes.</small></span></label><label><input type="radio" name="method" value="copy"><span><b>Independent copy</b><small>Edit separately. Keep a link to this version of the source.</small></span></label><label><input type="radio" name="method" value="move"><span><b>Move item</b><small>Keep its identity and history; remove this Stash entry.</small></span></label></fieldset><button class="surface-key" type="submit"'+(!destinations.length?' disabled':'')+'>Continue</button><p data-transfer-status role="status">'+(!destinations.length?'Create another Project to add a destination.':'Removing a reference later leaves the other entries available.')+'</p></form>','Add to another Stash');sheet.querySelector('h2').textContent=item.title;
    sheet.querySelector('form').addEventListener('submit',async event=>{
      event.preventDefault();const form=event.currentTarget,method=form.elements.method.value,destination=form.elements.destination.value;if(dialogWorkspace!==activeWorkspace)return close();const data=SpatialMemoryDesktop.contextFor(item);form.querySelector('button[type=submit]').disabled=true;
      const existing=allEntries().some(entry=>canonical(entry)===dialogItem&&entry.scope===destination);
      if(method!=='copy'&&existing){form.querySelector('[data-transfer-status]').textContent='This Stash already contains the item.';form.querySelector('button[type=submit]').disabled=false;return;}
      const saved=await SpatialMemoryDesktop.keepContext({...data,itemId:dialogItem,versionId:model.get(dialogItem)?.currentVersion,transfer:method},destination);
      if(saved){if(method==='move'){SpatialMemoryDesktop.removeEntry(item.fileId||item.id,item.scope);record(dialogItem,'moved',{...from,detail:'Moved from '+scopeLabel(from)+' to '+scopeLabel(owner({scope:destination}))});model.record(dialogItem,'unreference',from);}persist();close();showToast(method==='copy'?'Independent copy saved.':method==='move'?'Item moved with its history.':'Reference added; content stays shared.');}
      else{form.querySelector('[data-transfer-status]').textContent='Could not save this item. Check the Stash limit and saved file availability.';form.querySelector('button[type=submit]').disabled=false;}
    });
  }
  sheet.addEventListener('click',event=>{if(event.target===sheet)return close();const button=event.target.closest('button');if(!button)return;if(button.hasAttribute('data-history-close'))close();if(button.dataset.historyParent)open(button.dataset.historyParent,{versionId:button.dataset.historyParentVersion});if(button.hasAttribute('data-history-export')){
    const item=get(dialogItem);if(!item)return;const blob=new Blob([JSON.stringify({format:'spatial-item-history',version:1,item,tags:tags(dialogItem)},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=SpatialStashFiles.safeName(item.title)+'-history.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }});
  sheet.addEventListener('change',event=>{if(event.target.matches('[data-history-version]'))renderVersion(event.target.value);});
  sheet.addEventListener('submit',event=>{if(!event.target.matches('[data-history-note]'))return;event.preventDefault();const input=event.target.querySelector('textarea');record(dialogItem,'note',{detail:input.value.trim()});persist();open(dialogItem);});
  sheet.addEventListener('cancel',event=>{event.preventDefault();close();});
  // Facets filter existing rows, preserving disclosure state and media playback.
  const host=document.querySelector('#workingMemory'),views=new Map();let filterScope='';
  const facets=document.createElement('details');facets.className='memory-facets';facets.innerHTML='<summary>Filters <small data-facet-count></small></summary><div><label>Origin app<select data-history-app><option value="">Any app</option></select></label><label>Type<select data-history-type><option value="">Any type</option><option value="text">Text / notes</option><option value="link">Source links</option><option value="image">Images</option><option value="audio">Audio</option><option value="document">Documents</option><option value="file">Files</option></select></label><label>Captured date<select data-history-date><option value="">Any time</option><option value="today">Today</option><option value="week">Last 7 days</option></select></label><button class="memory-text-action" data-history-reset>Clear filters</button></div>';
  host.querySelector('.memory-browse').after(facets);
  const currentScope=()=>JSON.stringify([activeWorkspace,projectSpaces[desktopPages.column(activeWorkspace)]?desktopPages.column(activeWorkspace):null]);
  const itemType=item=>item.attachment?.kind||(item.resourceType==='folder'?'file':item.resourceType==='document'?'document':item.source?.address&&!item.text?.trim()?'link':'text');
  function decorate(){
    if(!host.isConnected)return;const scope=currentScope();if(scope!==filterScope){filterScope=scope;const view=views.get(scope)||{};['app','type','date'].forEach(name=>facets.querySelector('[data-history-'+name+']').value=view[name]||'');if(sheet.open&&dialogWorkspace!==activeWorkspace)close();}
    const items=SpatialMemoryDesktop.items(),byId=new Map(items.map(item=>[item.id,item])),select=facets.querySelector('[data-history-app]'),previous=select.value;
    const apps=[...new Set(items.map(item=>item.source?.app||'unknown'))];const options='<option value="">Any app</option>'+apps.map(app=>'<option value="'+html(app)+'">'+html(app==='unknown'?'App unknown':appLabel(app))+'</option>').join('');if(select.innerHTML!==options){select.innerHTML=options;select.value=previous;}
    host.querySelectorAll('[data-memory-id]').forEach(row=>{const item=byId.get(row.dataset.memoryId);if(!item)return;const id=canonical(item),record=model.get(id),body=row.querySelector('.memory-item-body');
      if(!body.querySelector('.memory-location')){const location=document.createElement('p');location.className='memory-location';location.textContent=(item.reference?'Reference · shared content':'Kept in '+scopeLabel(owner(item)))+(record?.relations.some(parent=>parent.relation==='copiedFrom')?' · Independent copy':'');body.querySelector('.memory-tags')?.before(location);}
      if(!body.querySelector('[data-item-tags]')){const label=document.createElement('label');label.className='memory-user-tags';label.textContent='Tags';const input=document.createElement('input');input.dataset.itemTags=id;input.value=tags(id).join(', ');input.placeholder='Add your tags, separated by commas';input.maxLength=640;label.append(input);body.querySelector('.memory-edit-details')?.before(label);}
      row.dataset.historyItem=id;
    });filter();
  }
  function filter(){
    const values=Object.fromEntries(['app','type','date'].map(name=>[name,facets.querySelector('[data-history-'+name+']').value]));views.set(filterScope,values);
    const items=SpatialMemoryDesktop.items(),byId=new Map(items.map(item=>[item.id,item])),query=host.querySelector('[data-memory-query]').value.trim(),pinned=host.querySelector('[data-memory-filter]').value==='pinned',today=new Date();today.setHours(0,0,0,0);
    let visible=0;host.querySelectorAll('[data-memory-id]').forEach(row=>{const item=byId.get(row.dataset.memoryId);if(!item)return;const record=model.get(canonical(item)),text=[item.title,item.text,item.source?.address,item.source?.label,item.source?.app,appLabel(item.source?.app),...tags(canonical(item))].join(' '),captured=record?.created||item.created||0;
      const show=(!pinned||item.pinned)&&(!query||matchesSearch(text,query))&&(!values.app||(item.source?.app||'unknown')===values.app)&&(!values.type||itemType(item)===values.type)&&(!values.date||captured>=(values.date==='today'?today.getTime():Date.now()-7*86400000));row.hidden=!show;if(show)visible++;});
    facets.querySelector('[data-facet-count]').textContent=Object.values(values).filter(Boolean).length?'· '+Object.values(values).filter(Boolean).length+' active':'';
    host.querySelector('[data-memory-count]').textContent=(visible===items.length?items.length:visible+' of '+items.length)+' items';
    const empty=host.querySelector('.memory-empty');empty.hidden=visible>0;host.querySelector('[data-memory-empty-title]').textContent=items.length?'No matching items':'Nothing saved yet';host.querySelector('[data-memory-empty-detail]').textContent=items.length?'Adjust the filters or clear them to show all items.':'Add a note, choose files or drop something here.';host.querySelector('[data-memory-action="clear-filter"]').hidden=!(query||pinned||Object.values(values).some(Boolean));
  }
  facets.addEventListener('change',filter);facets.addEventListener('click',event=>{if(!event.target.closest('[data-history-reset]'))return;['app','type','date'].forEach(name=>facets.querySelector('[data-history-'+name+']').value='');filter();});
  host.addEventListener('input',event=>{if(event.target.matches('[data-memory-query]'))filter();});
  host.addEventListener('change',event=>{if(event.target.matches('[data-item-tags]')){saveTags(event.target.dataset.itemTags,event.target.value);filter();}if(event.target.matches('[data-memory-filter]'))filter();});
  host.addEventListener('click',event=>{if(event.target.closest('[data-memory-action="clear-filter"]')){['app','type','date'].forEach(name=>facets.querySelector('[data-history-'+name+']').value='');filter();}});
  globalThis.SpatialItemHistoryDesktop={canonical,capture,hydrate,record,get,open,transfer,persist,snapshot:()=>({history:model.snapshot(),metadata}),merge(value){if(!value)return;syncing=true;model.merge(value.history||value);for(const [id,meta]of Object.entries(value.metadata||{})){if(Number(meta.updated)>Number(metadata[id]?.updated||0))metadata[id]=meta;}try{desktopStorage.setItem(uiKey,JSON.stringify(metadata));}catch{}persist();syncing=false;decorate();}};
  allEntries().forEach(item=>capture(item));persist();
  // The adapter's renders are its public refresh boundary; preserve all existing callers.
  const originalRender=SpatialMemoryDesktop.render;SpatialMemoryDesktop.render=function(...args){const result=originalRender.apply(this,args);decorate();return result;};
  const observer=new MutationObserver(()=>{if(!decorationQueued){decorationQueued=true;queueMicrotask(()=>{decorationQueued=false;decorate();});}});let decorationQueued=false;observer.observe(host.querySelector('.memory-items'),{childList:true});
  decorate();
})();
