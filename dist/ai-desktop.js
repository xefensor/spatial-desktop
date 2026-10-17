/* A fourth docked Area. Dragged sources carry explicit provenance and a working folder. */
(function(){
  'use strict';
  const C=SpatialAIContext,D=SpatialAIDemo,F=SpatialStashFiles,key='spatial-ai-context-v1';
  const model=C.create(readDesktopStorage(key,{}),{workspaces:()=>workspaceProfiles,projects:()=>projectSpaces});
  const area=areaFor('ai'),content=$('.ai-content',area),prompt=$('#aiPrompt'),folder=$('#aiWorkingFolder'),attachments=$('#aiAttachments'),transcript=$('#aiTranscript'),status=$('#aiStatus');
  let current='',signature='',sourceDrag=null;const views=new Map();
  const chatSelect=$('#aiChatSelect'),chatName=$('#aiChatName'),renameForm=$('#aiRenameForm'),send=$('#aiSend');
  const workspaceLabel=id=>workspaceProfiles[id]?.label||id;
  const dropHint=document.createElement('div'),dropTitle=document.createElement('b'),dropDetail=document.createElement('small');
  dropHint.className='ai-drop-hint';dropHint.hidden=true;dropHint.setAttribute('role','status');dropHint.append(dropTitle,dropDetail);document.body.append(dropHint);
  let dropPosition=null,quickWorkspace=null,quickReturnFocus=null,inputPanel=null,inputOwner='',inputReturnFocus=null;
  const rail=document.createElement('nav');rail.className='ai-rail-tools';rail.setAttribute('aria-label','Assistant quick actions');
  rail.innerHTML='<button class="surface-key ai-rail-chat" id="aiRailChat" type="button" aria-controls="aiQuickPanel" aria-expanded="false"><span class="ai-rail-chat-title" id="aiRailChatTitle"></span><span class="ai-rail-sources">'+icon('i-note')+'<span id="aiRailSources"></span></span><small id="aiRailDraft" hidden>Draft</small></button><button class="surface-key ai-rail-new" id="aiRailNewChat" type="button" aria-label="Start a new Assistant chat" title="New chat"><span aria-hidden="true">+</span><small>New chat</small></button>';
  area.insertBefore(rail,content);
  const quickPanel=document.createElement('section');quickPanel.className='ai-area ai-quick-panel material-surface-glass';quickPanel.id='aiQuickPanel';quickPanel.hidden=true;quickPanel.setAttribute('role','region');quickPanel.setAttribute('aria-label','Assistant quick chat');
  quickPanel.innerHTML='<header class="ai-quick-header"><span><b id="aiQuickTitle">Assistant</b><small id="aiQuickContext"></small></span><button class="surface-key" id="aiQuickExpand" type="button" title="Keep Assistant expanded">Expand area</button><button class="surface-key" id="aiQuickClose" type="button" aria-label="Close Assistant quick chat">'+icon('i-close')+'</button></header><div class="ai-quick-body" id="aiQuickBody"></div>';
  document.body.append(quickPanel);
  const withinAssistant=target=>area.contains(target)||quickPanel.contains(target);
  const blockedByDialog=()=>Boolean(document.querySelector?.('[aria-modal="true"]:not([hidden]):not([aria-hidden="true"]),#universalSearch.is-open,#packageDialog.is-open,#projectEditorDialog.is-open:not(.is-inline),#desktopContextMenu:not([hidden]),#spatialGuideDialog:not([hidden])'));
  const quickBlocked=()=>Boolean(area.inert||$('.desktop-shell').inert||blockedByDialog());
  function positionQuick(){
    if(quickPanel.hidden)return;
    const rect=area.getBoundingClientRect(),edge=area.dataset.dockEdge||'right',gap=10;
    const width=Math.min(390,window.innerWidth-24),height=Math.min(620,window.innerHeight-24);
    const left=edge==='left'?rect.right+gap:edge==='right'?rect.left-width-gap:rect.left;
    const top=edge==='top'?rect.bottom+gap:edge==='bottom'?rect.top-height-gap:rect.top;
    quickPanel.style.width=width+'px';quickPanel.style.height=height+'px';
    quickPanel.style.left=Math.max(12,Math.min(left,window.innerWidth-width-12))+'px';
    quickPanel.style.top=Math.max(12,Math.min(top,window.innerHeight-height-12))+'px';
  }
  function closeQuick(restoreFocus=false){
    if(quickPanel.hidden)return;
    model.draft(quickWorkspace,prompt.value);persist();
    area.insertBefore(content,rail.nextSibling);quickPanel.hidden=true;quickWorkspace=null;
    $('#aiRailChat').setAttribute('aria-expanded','false');$('#aiAreaToggle').setAttribute('aria-expanded','false');$('#aiAreaToggle').setAttribute('aria-pressed','false');$('#aiAreaToggle').setAttribute('aria-label','Open Assistant quick chat');renderRail(model.session(activeWorkspace));
    if(restoreFocus&&quickReturnFocus?.isConnected!==false)quickReturnFocus?.focus();quickReturnFocus=null;
  }
  function openQuick(focus=true){
    if(quickBlocked())return;
    if(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai'))return;
    if(area.hidden||area.dataset.areaState!=='rail'){expand(focus);return;}
    if(quickPanel.hidden){window.dispatchEvent(new CustomEvent('spatial-rail-open',{detail:{area:'ai'}}));quickReturnFocus=document.activeElement;quickWorkspace=activeWorkspace;$('#aiQuickBody').append(content);quickPanel.hidden=false;}
    $('#aiRailChat').setAttribute('aria-expanded','true');$('#aiAreaToggle').setAttribute('aria-expanded','true');$('#aiAreaToggle').setAttribute('aria-pressed','true');$('#aiAreaToggle').setAttribute('aria-label','Close Assistant quick chat');renderRail(model.session(activeWorkspace));
    positionQuick();if(focus)prompt.focus();
  }
  function renderRail(session){
    const title=session.title,sources=session.items.length,label=sources+' source'+(sources===1?'':'s');
    $('#aiRailChatTitle').textContent=title;$('#aiRailSources').textContent=String(sources);$('#aiRailDraft').hidden=!session.draft;
    $('#aiRailChat').setAttribute('aria-label',(quickPanel.hidden?'Open ':'Close ')+title+' · '+label+(session.draft?' · Unsent draft':''));
    $('#aiRailChat').title=title+' · '+label+' · Drop sources here or open chat';
    $('#aiQuickTitle').textContent=title;$('#aiQuickContext').textContent=workspaceLabel(activeWorkspace)+' workspace · Scripted local demo';
  }
  $('#aiRailChat').addEventListener('click',()=>{if(globalThis.SpatialAssistantDesktop?.invoke())return;quickPanel.hidden?openQuick():closeQuick(true);});
  $('#aiQuickClose').addEventListener('click',()=>closeQuick(true));$('#aiQuickExpand').addEventListener('click',()=>expand());
  document.addEventListener('pointerdown',event=>{if(inputPanel&&!inputPanel.hidden&&inputPanel.contains(event.target))return;if(!quickPanel.hidden&&!withinAssistant(event.target))closeQuick();if(inputPanel&&!inputPanel.hidden&&!event.target.closest?.('[data-ai-inspect],[data-ai-input]'))closeInput();},true);
  document.addEventListener('keydown',event=>{
    if(inputPanel&&!inputPanel.hidden)return;
    if(event.key!=='Escape'||quickPanel.hidden||blockedByDialog()||event.defaultPrevented)return;
    closeQuick(true);event.preventDefault();event.stopImmediatePropagation();
  },true);
  window.addEventListener('resize',positionQuick);
  window.addEventListener('spatial-rail-open',event=>{if(event.detail?.area!=='ai')closeQuick();});
  // Overview, modal editors and Guide can open from a shortcut without touching
  // this Area. A body portal must yield together with the docked shell.
  const layerObserver=new MutationObserver(()=>{if(!quickPanel.hidden&&quickBlocked())closeQuick();if(inputPanel&&!inputPanel.hidden&&quickBlocked())closeInput();});
  layerObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden','aria-modal','inert']});

  const editableDropTarget=target=>Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));
  const insertsText=event=>editableDropTarget(event.target)&&![...event.dataTransfer.types].some(type=>type==='Files'||type===C.MIME);
  function showDropTarget(event=null){
    const visible=Boolean(event)&&!area.hidden&&(!globalThis.SpatialGuide?.model.active()||SpatialGuide.model.allows('ai'));
    area.classList.toggle('is-ai-drop-target',visible);dropHint.hidden=!visible;dropPosition=visible?{clientX:event.clientX,clientY:event.clientY}:null;
    if(!visible)return;
    const title='Attach to '+model.session(activeWorkspace).title,detail=workspaceLabel(activeWorkspace)+' workspace · Copy source';
    if(dropTitle.textContent!==title)dropTitle.textContent=title;if(dropDetail.textContent!==detail)dropDetail.textContent=detail;
    const rect=dropHint.getBoundingClientRect();
    dropHint.style.left=Math.max(8,Math.min(event.clientX+18,window.innerWidth-rect.width-8))+'px';
    dropHint.style.top=Math.max(8,Math.min(event.clientY+18,window.innerHeight-rect.height-8))+'px';
  }
  function persist(){try{desktopStorage.setItem(key,JSON.stringify(model.snapshot()));queueDesktopStateBroadcast(0);return true;}catch{status.textContent='Changes are visible here but could not be saved. Keep this tab open.';return false;}}
  function captureInput(item,workspace=activeWorkspace){
    const normalized=model.normalize(item,workspace),canonical=item.itemId||item.fileId||item.id||normalized.id,history=globalThis.SpatialItemHistoryDesktop;
    // Stash's virtual saved-file location is an attachment locator, not a new
    // content version. Reuse an existing exact version, including older inputs.
    const existing=history?.get?.(canonical),contentAddress=item.storageScope?normalized.source.address:normalized.source.address||normalized.address;
    const fileKey=value=>value?.key||value?.src||'';
    const matching=existing?.versions?.slice().reverse().find(version=>version.title===normalized.title&&version.text===normalized.text&&version.address===contentAddress&&fileKey(version.attachment)===fileKey(normalized.attachment));
    const tracked=history?.capture({...normalized,fileId:canonical,address:contentAddress},{workspace,project:normalized.project||null,action:'attach',force:!matching});
    const versionId=matching?.id||tracked?.currentVersion||item.versionId||'';
    return {...normalized,itemId:tracked?.id||canonical,fileId:item.fileId||tracked?.id||'',versionId,versionNumber:tracked?.versions?.findIndex(version=>version.id===versionId)+1||normalized.versionNumber,capturedAt:Date.now()};
  }
  function recordInputs(turn,chatId){
    const history=globalThis.SpatialItemHistoryDesktop;
    turn.sources.forEach(item=>history?.record(item.itemId||item.fileId||item.id,'use',{workspace:turn.workspace,project:turn.project,versionId:item.versionId,app:'assistant',detail:'Used in Assistant · '+turn.request.slice(0,120)}));
    globalThis.SpatialTimelineDesktop?.record?.('assistant.use',{workspace:turn.workspace,project:turn.project,chatId,turnId:turn.id,itemId:turn.sources[0]?.itemId||'',itemVersion:turn.sources[0]?.versionId||'',sourceIds:turn.sources.map(item=>item.itemId||item.fileId||item.id),title:'Assistant · '+turn.title,detail:turn.request.slice(0,180)});
  }
  function closeInput(restoreFocus=false){if(!inputPanel||inputPanel.hidden)return;inputPanel.hidden=true;inputOwner='';if(restoreFocus&&inputReturnFocus?.isConnected!==false)inputReturnFocus?.focus();inputReturnFocus=null;}
  function inspectInput(item,label){
    if(!item)return;
    if(!inputPanel){
      inputPanel=document.createElement('section');inputPanel.className='ai-input-panel material-surface-glass';inputPanel.hidden=true;inputPanel.setAttribute('role','dialog');inputPanel.setAttribute('aria-modal','false');inputPanel.setAttribute('aria-label','Saved Assistant input');document.body.append(inputPanel);
      inputPanel.addEventListener('click',event=>{if(event.target.closest('[data-ai-input-close]'))closeInput(true);const journey=event.target.closest('[data-ai-input-history]');if(journey){const id=journey.dataset.aiInputHistory,versionId=journey.dataset.aiInputVersion;closeInput(true);globalThis.SpatialItemHistoryDesktop?.open(id,{versionId,workspace:activeWorkspace});}});
    }
    inputReturnFocus=document.activeElement;inputOwner=activeWorkspace+':'+model.session(activeWorkspace).id;
    const origin=item.source||{},originContext=[origin.project&&('Project: '+(projectSpaces[origin.project]?.name||origin.project)),origin.workspace&&('Workspace: '+workspaceLabel(origin.workspace))].filter(Boolean).join(' · ');
    const exact=item.text?'<pre class="ai-input-text">'+escapeHtml(item.text)+'</pre>':'<p class="ai-input-empty">No document text was attached. This saved input contains only its link and metadata; the demo did not read the page, file, pixels or audio.</p>';
    const version=item.versionNumber?' · Version '+item.versionNumber:'';
    const help=label==='Attached input'?'This attached snapshot will be kept with your next request. Reattach the source to use a newer version.':'This is the input kept with this request. Later edits or removal of the source do not change it.';
    const itemId=item.itemId||item.fileId||item.id,journey=globalThis.SpatialItemHistoryDesktop?.get?.(itemId)?'<button class="surface-key ai-inspect-input" data-ai-input-history="'+escapeHtml(itemId)+'" data-ai-input-version="'+escapeHtml(item.versionId||'')+'">Item history</button>':'';
    inputPanel.innerHTML='<header><span><small>'+escapeHtml(label)+'</small><b>'+escapeHtml(item.title)+'</b></span><button class="surface-key" data-ai-input-close aria-label="Close saved input">'+icon('i-close')+'</button></header><div class="ai-input-body"><p class="ai-input-version">Saved input snapshot'+escapeHtml(version)+' · '+escapeHtml(C.representation(item))+(item.contentTruncated?' · First 12,000 characters':'')+'</p><p class="ai-input-help">'+help+'</p>'+exact+'<dl><dt>Captured through</dt><dd>'+escapeHtml(origin.label||appInfo[origin.app]?.label||origin.app||'Unknown source')+'</dd>'+(origin.address?'<dt>Source address</dt><dd>'+escapeHtml(origin.address)+'</dd>':'')+(originContext?'<dt>Origin context</dt><dd>'+escapeHtml(originContext)+'</dd>':'')+(item.address?'<dt>Attached location</dt><dd>'+escapeHtml(item.address)+'</dd>':'')+'</dl>'+journey+'<small class="ai-input-local">Scripted local demo · No provider calls. Only the saved text and metadata above are available to its reply rules.</small></div>';
    inputPanel.hidden=false;prepareControlSemantics(inputPanel);$('[data-ai-input-close]',inputPanel)?.focus();
  }
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&inputPanel&&!inputPanel.hidden&&!blockedByDialog()){closeInput(true);event.preventDefault();event.stopImmediatePropagation();}},true);
  function itemMarkup(item){
    const project=item.project&&projectSpaces[item.project];
    const kind=item.kind==='image'?'i-image':item.kind==='audio'?'i-music':item.kind==='folder'?'i-folder':item.kind==='browser'||/^https?:/.test(item.address)?'i-web':'i-note';
    const tags=(item.project?'<span class="ai-tag ai-tag-project" style="--project-accent:'+(/^#[0-9a-f]{3,8}$/i.test(project?.accent||'')?project.accent:'var(--text)')+'">Project: '+escapeHtml(project?.name||'Unavailable project')+'</span>':'')+'<span class="ai-tag">Workspace: '+escapeHtml(workspaceLabel(item.workspace))+'</span>'+(item.app?'<span class="ai-tag">'+escapeHtml(item.app==='browser'?'Browser':appInfo[item.app]?.label||item.app)+'</span>':'')+(item.app&&['browser','app'].includes(item.kind)?'':'<span class="ai-tag">'+escapeHtml(item.kind.charAt(0).toUpperCase()+item.kind.slice(1))+'</span>');
    const origin=item.source||{},different=origin.workspace&&(origin.workspace!==item.workspace||origin.project!==item.project);
    const originTags=different?'<span class="ai-tag">Source workspace: '+escapeHtml(workspaceLabel(origin.workspace))+'</span>'+(origin.project?'<span class="ai-tag ai-tag-project">Source project: '+escapeHtml(projectSpaces[origin.project]?.name||origin.project)+'</span>':''):'';
    const reference=origin.address?'<a class="ai-source-link" href="'+escapeHtml(origin.address)+'" data-ai-source="'+escapeHtml(item.id)+'">'+escapeHtml(origin.address)+'</a>':'';
    return '<article class="ai-attachment" data-ai-attachment="'+escapeHtml(item.id)+'"><details class="ai-source-detail" data-ai-source-detail="'+escapeHtml(item.id)+'"><summary>'+icon(kind)+'<span><b>'+escapeHtml(item.title)+'</b><small>'+escapeHtml(C.representation(item)+' · '+(project?.name||workspaceLabel(item.workspace)))+'</small></span></summary><div class="ai-attachment-main"><p title="'+escapeHtml(item.address||item.text)+'">'+escapeHtml(item.address||item.text.slice(0,240)||item.filename||'Attached source')+'</p><div class="ai-tags">'+tags+originTags+'</div>'+reference+'<button class="surface-key ai-inspect-input" data-ai-inspect="'+escapeHtml(item.id)+'">Inspect attached input</button></div></details><button class="ai-remove" data-ai-remove="'+escapeHtml(item.id)+'" aria-label="Remove '+escapeHtml(item.title)+'">'+icon('i-close')+'</button></article>';
  }
  function turnMarkup(turn){
    const references=turn.sources.map((item,index)=>'<li><button class="ai-input-citation" data-ai-input="'+index+'" data-ai-input-turn="'+escapeHtml(turn.id)+'"><span>['+(index+1)+']</span><span><b>'+escapeHtml(item.filename||item.title)+'</b><small>'+escapeHtml(C.representation(item))+'</small></span>'+icon('i-note')+'</button></li>').join('');
    return '<section class="ai-turn'+(turn.action?' ai-file-turn':'')+'"><div class="ai-request"><small>'+(turn.example?'Example request':'You')+'</small><p>'+escapeHtml(turn.request)+'</p></div><article class="ai-demo-output" draggable="true" tabindex="0" data-ai-demo-turn="'+escapeHtml(turn.id)+'" aria-label="Demo reply: '+escapeHtml(turn.title)+'"'+(turn.action?' hidden':'')+'><header>'+icon('i-ai')+'<span>Assistant</span></header><b>'+escapeHtml(turn.title)+'</b><p>'+escapeHtml(turn.text)+'</p></article><div class="ai-turn-actions"><button class="surface-key ai-save-output" data-ai-save-output="'+escapeHtml(turn.id)+'">Save to Stash</button><details class="ai-turn-sources"><summary>Details</summary><small>Scripted local reply · '+turn.sources.length+' saved input'+(turn.sources.length===1?'':'s')+'</small><small class="ai-turn-folder">Working folder: '+escapeHtml(turn.folder)+'</small>'+(references?'<ul>'+references+'</ul>':'')+'<small>Drag the reply into Stash to keep it with its input history.</small></details></div></section>';
  }
  function exampleMarkup(examples){
    if(desktopPreset!=='demo'||globalThis.SpatialGuide?.model.active())return examples.length?'<details class="ai-examples"><summary>Earlier sample replies</summary>'+examples.map(turnMarkup).join('')+'</details>':'';
    const builtIn=SpatialDemoExamples.projects[activeProjectName],project=projectSpaces[activeProjectName];
    const context=builtIn&&project?.name===builtIn.name&&project?.root===builtIn.root?activeProjectName:activeProjectName?null:activeWorkspace;
    const workflows=SpatialDemoExamples.assistantWorkflows?.[context]||[];
    const recipes=workflows.map(recipe=>'<section class="ai-example-recipe"><b>'+escapeHtml(recipe.title)+'</b><ol>'+recipe.steps.map(step=>'<li>'+escapeHtml(step)+'</li>').join('')+'</ol>'+(recipe.prompt?'<p class="ai-example-prompt">'+escapeHtml(recipe.prompt)+'</p>':'')+'</section>').join('');
    const earlier=examples.length?'<details class="ai-earlier-examples"><summary>Earlier sample replies</summary>'+examples.map(turnMarkup).join('')+'</details>':'';
    return recipes||earlier?'<details class="ai-examples"><summary>Examples</summary>'+recipes+(recipes?'<p class="ai-example-note">Try these with your selection. Replies are scripted locally; supported file conversions create real copies in the demo.</p>':'')+earlier+'</details>':'';
  }
  function submitRequest(){
    const request=prompt.value.trim();if(!request){status.textContent='Assistant demo · write a request first';return;}
    const session=model.session(activeWorkspace),workingFolder=model.workingFolder(activeWorkspace),project=projectSpaces[session.workingProject];
    const turn=model.exchange(activeWorkspace,request,D.reply(request,{items:session.items,folder:workingFolder,project:project?.name||workspaceLabel(activeWorkspace)+' workspace'}));
    if(!turn){status.textContent='This demo chat is full. Start a new chat to continue; your draft is kept.';return;}
    recordInputs(turn,session.id);
    model.draft(activeWorkspace,'');prompt.value='';persist();render();
    const sources=$('.ai-context-sources',content);if(sources){sources.open=false;sources.hidden=true;}
    $('.ai-chat',content).scrollTop=$('.ai-chat',content).scrollHeight;
    status.textContent='Reply ready · local demo';
  }
  function rememberView(){
    if(!current)return;
    views.set(current,{scroll:$('.ai-chat',content).scrollTop||0,sources:$('.ai-context-sources',content).open,
      expanded:$$('[data-ai-source-detail][open]',attachments).map(node=>node.dataset.aiSourceDetail)});
  }
  function render(){
    if(!quickPanel.hidden&&(quickWorkspace!==activeWorkspace||quickBlocked()||area.hidden||area.dataset.areaState!=='rail'||area.classList.contains('is-on-other-display')||(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai'))))closeQuick();
    const session=model.session(activeWorkspace),nextKey=activeWorkspace+':'+session.id,switched=current!==nextKey;if(inputPanel&&!inputPanel.hidden&&(inputOwner!==nextKey||quickBlocked()||area.hidden))closeInput();renderRail(session);positionQuick();
    const chats=model.chats(activeWorkspace),project=projectSpaces[session.workingProject];
    const options=[...new Set([session.workingProject,...session.items.map(item=>item.project),activeProjectName].filter(id=>projectSpaces[id]))];
    const next=JSON.stringify([activeWorkspace,activeProjectName,session.id,chats,session.items,session.turns,session.workingProject,options.map(id=>[id,projectSpaces[id].name,projectSpaces[id].root])]);
    $('#aiAreaContext').textContent=project?.name||workspaceLabel(activeWorkspace)+' workspace';
    const expanded=area.dataset.areaState==='expanded'||!quickPanel.hidden;
    $('#aiAreaToggle').setAttribute('aria-expanded',String(expanded));$('#aiAreaToggle').setAttribute('aria-pressed',String(expanded));$('#aiAreaToggle').setAttribute('aria-label',area.dataset.areaState==='expanded'?'Make Assistant area Compact':!quickPanel.hidden?'Close Assistant quick chat':'Open Assistant quick chat');
    if(dropPosition)showDropTarget(dropPosition);
    if(next===signature)return;rememberView();signature=next;
    if(switched){current=nextKey;prompt.value=session.draft;renameForm.hidden=true;status.textContent='Local demo · scripted replies';}
    chatSelect.innerHTML=chats.map(chat=>'<option value="'+escapeHtml(chat.id)+'">'+escapeHtml(chat.title)+'</option>').join('');chatSelect.value=session.id;chatSelect.title=session.title;
    send.disabled=!prompt.value.trim()||session.turns.length>=60;
    folder.innerHTML='<option value="">'+escapeHtml(workspaceLabel(activeWorkspace)+' · '+workspaceProfiles[activeWorkspace].home)+'</option>'+options.map(id=>'<option value="'+escapeHtml(id)+'">'+escapeHtml(projectSpaces[id].name+' · '+projectSpaces[id].root)+'</option>').join('');folder.value=session.workingProject||'';folder.title=model.workingFolder(activeWorkspace);
    attachments.innerHTML=session.items.map(itemMarkup).join('');const examples=session.turns.filter(turn=>turn.example),replies=session.turns.filter(turn=>!turn.example);transcript.innerHTML=exampleMarkup(examples)+replies.map(turnMarkup).join('');$('.ai-empty',content).hidden=session.items.length>0||session.turns.length>0;
    const sources=$('.ai-context-sources',content),view=views.get(nextKey);sources.open=view?.sources??false;sources.hidden=!session.items.length||!sources.open;sources.querySelector('summary').textContent='Details';
    $$('[data-ai-source-detail]',attachments).forEach(node=>{node.open=Boolean(view?.expanded?.includes(node.dataset.aiSourceDetail));});
    if(switched)$('.ai-chat',content).scrollTop=view?.scroll??$('.ai-chat',content).scrollHeight??0;
    prepareControlSemantics(area);prepareControlSemantics(quickPanel);
  }
  chatSelect.addEventListener('change',()=>{rememberView();model.select(activeWorkspace,chatSelect.value);persist();render();});
  function newChat(){rememberView();model.draft(activeWorkspace,prompt.value);const chat=model.newChat(activeWorkspace);if(!chat){openQuick();status.textContent='This workspace holds up to 50 chats.';return;}persist();render();openQuick();prompt.focus();}
  $('#aiNewChat').addEventListener('click',newChat);$('#aiRailNewChat').addEventListener('click',newChat);
  $('#aiRenameChat').addEventListener('click',()=>{chatName.value=model.session(activeWorkspace).title;renameForm.hidden=false;chatName.focus();chatName.select?.();});
  $('#aiCancelRename').addEventListener('click',()=>{renameForm.hidden=true;});
  renameForm.addEventListener('submit',event=>{event.preventDefault();if(model.rename(activeWorkspace,model.session(activeWorkspace).id,chatName.value)){renameForm.hidden=true;persist();render();}else{status.textContent='Give this chat a name first.';chatName.focus();}});
  function setMode(mode,save=true){model.mode(activeWorkspace,mode);if(save)persist();}
  function expand(focus=true){
    if(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai'))return;
    if(extendedDesktopActive()&&!isLocalArea('ai')){displayAssignmentsFor().areas.ai=localDisplaySlot();persistDisplayAssignments();}
    closeQuick();setAreaState('ai','expanded',false);scheduleWindowTiling();if(focus)prompt.focus();
  }
  function toggle(){
    if(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai'))return;
    if(!area.hidden&&area.dataset.areaState==='rail'){if(quickPanel.hidden)openQuick();else closeQuick(true);return;}
    const next=area.hidden?'expanded':'rail';
    setAreaState('ai',next);if(next==='expanded')prompt.focus();
  }
  function add(item){
    const previous=model.session(activeWorkspace).workingProject,added=model.add(activeWorkspace,captureInput(item));
    if(!added){status.textContent='This conversation holds up to 24 attachments. Remove one to add another.';return false;}
    persist();render();openQuick(false);
    status.textContent=previous&&added.project&&previous!==added.project?'Attached from '+(projectSpaces[added.project]?.name||'another project')+'. Working folder stays '+model.workingFolder(activeWorkspace)+'.':'Attached · ready for a scripted demo';return true;
  }
  $('#aiAreaToggle').addEventListener('click',()=>{if(!globalThis.SpatialAssistantDesktop?.invoke())toggle();});
  prompt.addEventListener('input',()=>{model.draft(activeWorkspace,prompt.value);send.disabled=!prompt.value.trim()||model.session(activeWorkspace).turns.length>=60;persist();renderRail(model.session(activeWorkspace));status.textContent='Local demo · scripted replies';});
  prompt.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();event.stopPropagation();submitRequest();}if(event.key==='Escape'){event.stopPropagation();if(!quickPanel.hidden)closeQuick(true);else setAreaState('ai','rail');}});
  $('#aiComposer').addEventListener('submit',event=>{event.preventDefault();submitRequest();});
  folder.addEventListener('change',()=>{model.folder(activeWorkspace,folder.value);persist();render();});
  attachments.addEventListener('click',event=>{const inspect=event.target.closest('[data-ai-inspect]');if(inspect){inspectInput(model.session(activeWorkspace).items.find(item=>item.id===inspect.dataset.aiInspect),'Attached input');return;}const link=event.target.closest('[data-ai-source]');if(link){event.preventDefault();const item=model.session(activeWorkspace).items.find(item=>item.id===link.dataset.aiSource);if(item?.source.address){if(/^https?:/.test(item.source.address)){const id=createAppInstance('browser');navigateBrowser(id,item.source.address);}else openFileLocation(item.source.address);}return;}const button=event.target.closest('[data-ai-remove]');if(!button)return;model.remove(activeWorkspace,button.dataset.aiRemove);persist();render();});
  transcript.addEventListener('click',async event=>{const save=event.target.closest('[data-ai-save-output]');if(save){const turn=model.session(activeWorkspace).turns.find(turn=>turn.id===save.dataset.aiSaveOutput);if(!turn||!globalThis.SpatialMemoryDesktop)return;const workspace=activeWorkspace,key=JSON.stringify([workspace,turn.project&&projectSpaces[turn.project]?turn.project:null]);save.disabled=true;const kept=await SpatialMemoryDesktop.keepContext(outputContext(turn),key);save.disabled=false;if(activeWorkspace===workspace)status.textContent=kept?'Saved to Stash with its input versions.':'Could not save this draft. Check the Stash and try again.';return;}const citation=event.target.closest('[data-ai-input]');if(!citation)return;const turn=model.session(activeWorkspace).turns.find(turn=>turn.id===citation.dataset.aiInputTurn);inspectInput(turn?.sources[Number(citation.dataset.aiInput)],'Request input · '+(turn?.title||'Reply'));});
  document.addEventListener('keydown',event=>{if((globalThis.SpatialDemoSuper?.held()||event.metaKey||event.getModifierState?.('OS'))&&!event.ctrlKey&&!event.altKey&&!event.shiftKey&&event.code==='KeyA'&&(!globalThis.SpatialGuide?.model.active()||SpatialGuide.model.allows('ai'))){event.preventDefault();event.stopPropagation();superKeyAlone=false;if(!globalThis.SpatialAssistantDesktop?.invoke())toggle();}},true);

  function baseSource(target){
    const frame=target.closest('[data-app-frame]'),app=frame?.dataset.appFrame,owner=app&&desktopPages.columnOf(activeWorkspace,app);
    const project=projectSpaces[owner]?owner:target.closest('[data-area-window="projects"]')&&projectSpaces[activeProjectName]?activeProjectName:null;
    return {workspace:activeWorkspace,project,app:appInfo[app]?.base||app||''};
  }
  function describe(target){
    const output=target.closest('[data-ai-demo-turn]');
    if(output){const turn=model.session(activeWorkspace).turns.find(turn=>turn.id===output.dataset.aiDemoTurn);return turn?outputContext(turn):null;}
    // The working-material shelf is a body portal, so its owner is captured
    // from the active column at gesture start instead of an Area ancestor.
    const shelfFile=target.closest('[data-project-shelf-path]');
    if(shelfFile){const column=desktopPages.column(activeWorkspace),project=projectSpaces[column]?column:null,path=shelfFile.dataset.projectShelfPath;return {id:'shelf-file:'+activeWorkspace+':'+path,title:shelfFile.dataset.projectShelfFile,address:path,filename:shelfFile.dataset.projectShelfFile,workspace:activeWorkspace,project,kind:shelfFile.dataset.projectShelfFolder==='true'?'folder':'file',source:{label:project?'Project files':'Workspace files',address:path,workspace:activeWorkspace,project}};}
    const shelfPin=target.closest('[data-project-shelf-item]'),pinned=shelfPin&&globalThis.SpatialMemoryDesktop?.itemFor(shelfPin.dataset.projectShelfItem);
    if(pinned)return SpatialMemoryDesktop.contextFor(pinned);
    const source=baseSource(target),frame=target.closest('[data-app-frame]');
    const row=target.closest('[data-file-name]');
    if(row){const path=frame.dataset.fileLocation.replace(/\/$/,'')+'/'+row.dataset.fileName,savedContext=globalThis.SpatialMemoryDesktop?.contextAtFile(path);if(savedContext)return savedContext;const project=model.projectAt(path)||source.project;const saved=project&&F.list(projectSpaces[project]).find(file=>F.folder(projectSpaces[project])+'/'+file.name===path);return {...source,project,source:{...source,project,address:path,label:appInfo[frame.dataset.appFrame]?.label||'Files',desktop:desktopPages.pageOf(activeWorkspace,frame.dataset.appFrame)},id:'file:'+path,title:row.dataset.fileName,kind:row.dataset.fileFolder?'folder':saved?.kind||'file',address:path,text:saved?.content||saved?.caption||'',filename:row.dataset.fileName,fileKey:saved?.attachment?.key||saved?.blobKey};}
    const projectItem=target.closest('[data-project-item]');
    if(projectItem){const project=projectSpaces[source.project];if(!project)return null;const name=projectItem.dataset.projectItem;return {...source,source:{...source,address:project.root.replace(/\/$/,'')+'/'+name,label:'Project folder'},id:'project-file:'+project.root+'/'+name,title:name,kind:'file',address:project.root.replace(/\/$/,'')+'/'+name};}
    const badge=target.closest('.app-identity .app-badge');
    if(badge&&frame){const app=frame.dataset.appFrame,base=appInfo[app].base||app,address=frame.dataset.fileLocation||$('.browser-toolbar input',frame)?.value||'';return {...source,source:{...source,label:appInfo[app].label,address,desktop:desktopPages.pageOf(activeWorkspace,app)},id:'window:'+activeWorkspace+':'+app,title:appInfo[app].label+' · '+($('.app-identity small',frame)?.textContent||''),kind:base==='browser'?'browser':'app',address,text:base==='notes'?$('.notes-layout textarea',frame)?.value||'':base==='browser'?$('.start-page',frame)?.innerText?.slice(0,12000)||'':''};}
    const memory=target.closest('[data-memory-id]'),item=memory&&SpatialMemoryDesktop.itemFor(memory.dataset.memoryId);
    if(item)return SpatialMemoryDesktop.contextFor(item);
    const selection=frame&&getSelection()?.toString().trim(),link=frame&&target.closest('a[href]'),address=link?.getAttribute('href')||frame?.dataset.fileLocation||$('.browser-toolbar input',frame)?.value||'';
    if(selection||link)return {...source,id:'selection-'+crypto.randomUUID(),title:(selection||link.textContent||address).slice(0,60),kind:link?'link':'text',text:selection||'',address,source:{...source,address,label:appInfo[frame.dataset.appFrame]?.label||'App',desktop:desktopPages.pageOf(activeWorkspace,frame.dataset.appFrame)}};
    return source;
  }
  function outputContext(turn){const derivedFrom=turn.sources.map(item=>({itemId:item.itemId||item.fileId||item.id,versionId:item.versionId,relation:'derivedFrom'}));return {id:'demo-reply:'+turn.id,title:turn.title,kind:'note',text:turn.text,workspace:turn.workspace,project:turn.project,app:'ai-demo',derivedFrom,relations:derivedFrom,chatId:model.session(activeWorkspace).id,turnId:turn.id,source:{workspace:turn.workspace,project:turn.project,app:'ai-demo',label:'Assistant demo · scripted reply'}};}
  function prepareSources(root=document){$$('.app-identity .app-badge,[data-file-name],[data-project-item],[data-project-shelf-path],[data-project-shelf-item]',root).forEach(element=>{element.draggable=true;if(element.matches('.app-badge'))element.title='Drag into Assistant to attach this app with its context';});}
  prepareSources();
  const observer=new MutationObserver(changes=>{changes.forEach(change=>change.addedNodes.forEach(node=>{if(node.nodeType===1){if(node.matches('.app-identity .app-badge,[data-file-name],[data-project-item],[data-project-shelf-path],[data-project-shelf-item]'))node.draggable=true;prepareSources(node);}}));});observer.observe($('.desktop-shell'),{childList:true,subtree:true});
  // Desktop content uses the same pointer gestures as the rest of the scene.
  // Native HTML drops remain available for external files, links and selections.
  function bindContentTransfers(){
    let gesture=null,suppressClick=false;
    const targetAt=event=>{const target=document.elementFromPoint(event.clientX,event.clientY);return target&&withinAssistant(target)&&!area.hidden;};
    const stashAt=event=>{const target=document.elementFromPoint(event.clientX,event.clientY);return target?.closest?.('#workingMemory,.memory-header-key,.memory-rail-entry')&&!editableDropTarget(target);};
    const clear=()=>{gesture=null;showDropTarget();globalThis.SpatialMemoryDesktop?.showDropTarget?.();};
    document.addEventListener('pointerdown',event=>{
      suppressClick=false;
      if(event.button!==0||(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai'))||(withinAssistant(event.target)&&!event.target.closest('[data-ai-demo-turn]')))return;
      const source=event.target.closest('.app-identity .app-badge,[data-file-name],[data-project-item],[data-project-shelf-path],[data-project-shelf-item],[data-memory-id],[data-ai-demo-turn]');
      if(!source||event.target.closest('input,textarea,a,audio,iframe')||event.target.closest('summary:not(.memory-item-summary)')||event.target.closest('[data-memory-item-action]'))return;
      const item=describe(event.target);if(!item?.title)return;
      event.target.closest('.memory-item-summary')?.focus();
      event.preventDefault();event.stopPropagation();gesture={item,x:event.clientX,y:event.clientY,pointer:event.pointerId,moved:false};
    },true);
    window.addEventListener('pointermove',event=>{
      if(!gesture||event.pointerId!==gesture.pointer)return;
      if(!(event.buttons&1)){clear();return;}
      if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8)gesture.moved=true;
      if(gesture.moved){showDropTarget(targetAt(event)&&gesture.item.app!=='ai-demo'?event:null);globalThis.SpatialMemoryDesktop?.showDropTarget?.(stashAt(event)?event:null);}
    },true);
    window.addEventListener('pointerup',event=>{
      if(!gesture||event.pointerId!==gesture.pointer)return;
      const item=gesture.item,moved=gesture.moved,over=targetAt(event),stash=stashAt(event);clear();
      if(!moved)return;suppressClick=true;
      if(over&&item.app!=='ai-demo'){event.preventDefault();event.stopPropagation();add(item);}
      else if(stash&&globalThis.SpatialMemoryDesktop){event.preventDefault();event.stopPropagation();SpatialMemoryDesktop.reveal();SpatialMemoryDesktop.keepContext(item);}
      else {const field=document.elementFromPoint(event.clientX,event.clientY);if(field?.matches('textarea,input[type=text],input:not([type]),input[type=search],input[type=url]')&&!field.disabled&&!field.readOnly){field.focus();field.setRangeText(item.text||item.address||item.title,field.selectionStart||0,field.selectionEnd||0,'end');field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}}
    },true);
    document.addEventListener('click',event=>{if(!suppressClick)return;suppressClick=false;event.preventDefault();event.stopImmediatePropagation();},true);
    window.addEventListener('pointercancel',clear,true);window.addEventListener('blur',clear);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')clear();},true);
  }
  bindContentTransfers();
  document.addEventListener('dragstart',event=>{
    if(withinAssistant(event.target)&&!event.target.closest('[data-ai-demo-turn]'))return;
    sourceDrag=describe(event.target);
    if(!sourceDrag)return;
    if(sourceDrag.title){event.dataTransfer.setData(C.MIME,JSON.stringify(sourceDrag));event.dataTransfer.setData('text/plain',sourceDrag.text||sourceDrag.address||sourceDrag.title);event.dataTransfer.effectAllowed='copy';}
  });
  function accepts(event){return [...event.dataTransfer.types].some(type=>[C.MIME,'Files','text/plain','text/uri-list'].includes(type));}
  for(const dropSurface of [area,quickPanel])dropSurface.addEventListener('dragover',event=>{if(!accepts(event)||insertsText(event)){showDropTarget();return;}event.preventDefault();event.dataTransfer.dropEffect='copy';showDropTarget(event);});
  for(const dropSurface of [area,quickPanel])dropSurface.addEventListener('dragleave',event=>{if(!withinAssistant(event.relatedTarget))showDropTarget();});
  document.addEventListener('dragover',event=>{if(!withinAssistant(event.target))showDropTarget();});
  document.addEventListener('drop',()=>showDropTarget(),true);
  document.addEventListener('dragend',()=>{sourceDrag=null;showDropTarget();});
  for(const dropSurface of [area,quickPanel])dropSurface.addEventListener('drop',async event=>{
    showDropTarget();if(!accepts(event)||insertsText(event))return;event.preventDefault();event.stopPropagation();
    const raw=event.dataTransfer.getData(C.MIME),source=sourceDrag||{workspace:activeWorkspace};sourceDrag=null;
    if(raw){try{add(JSON.parse(raw));}catch{status.textContent='This attachment could not be read.';}return;}
    const files=[...event.dataTransfer.files];
    if(files.length){const workspace=activeWorkspace,chatId=model.session(workspace).id;openQuick(false);for(const file of files){if(file.size>25*1024*1024){status.textContent='Files must be smaller than 25 MB.';continue;}if(model.session(workspace,chatId).items.length>=24){status.textContent='This conversation holds up to 24 attachments.';break;}try{const fileKey='stash-upload-'+crypto.randomUUID();await F.put(fileKey,file);const text=file.type.startsWith('text/')?await file.text():'';model.add(workspace,captureInput({workspace,id:fileKey,fileKey,filename:file.name,title:file.name,kind:file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':'file',text,attachment:{kind:file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':'file',key:fileKey,filename:file.name,mime:file.type,size:file.size},source:{workspace,label:'File upload'}},workspace),chatId);persist();render();if(activeWorkspace===workspace&&model.session(workspace).id===chatId)status.textContent='Attached · ready for a scripted demo';}catch{status.textContent='Could not keep this file in this browser.';}}return;}
    const text=event.dataTransfer.getData('text/plain'),url=event.dataTransfer.getData('text/uri-list').split('\n').find(line=>line&&!line.startsWith('#'));
    if(text||url)add({...source,title:url||text.trim().slice(0,80)||'Dropped content',kind:url?'link':'text',text,address:url||''});
  });
  // Move earlier draft requests into the new Area without discarding them.
  const legacyDrafts=readDesktopStorage('spatial-stash-ai-drafts-v1',{}),drafts=legacyDrafts&&typeof legacyDrafts==='object'?legacyDrafts:{};
  if(!desktopStorage.getItem(key)){Object.keys(workspaceProfiles).forEach(workspace=>{const project=workspaceProjects[workspace];const draft=drafts['project:'+project]||drafts[JSON.stringify([workspace,null])];if(typeof draft==='string'&&draft){model.draft(workspace,draft);model.folder(workspace,project);}});persist();}
  function revealChat(chatId,{turnId}={}){if(quickBlocked()||!model.select(activeWorkspace,chatId))return false;closeInput();persist();render();expand(false);if(turnId)$$('[data-ai-demo-turn]',transcript).find(node=>node.dataset.aiDemoTurn===turnId)?.scrollIntoView?.({block:'center'});return true;}
  globalThis.SpatialAIDesktop={render,expand,revealChat,
    attach(items,{focus=true}={}){if(quickBlocked())return [];const existing=new Set(model.session(activeWorkspace).items.map(i=>i.id));if(existing.size+new Set(items.filter(i=>!existing.has(i.id)).map(i=>i.id)).size>24){status.textContent='Remove unused sources before adding this selection.';return [];}const added=[];for(const item of items){if(add(item))added.push(model.session(activeWorkspace).items.find(entry=>entry.id===item.id));}if(focus)openQuick();return added.filter(Boolean);},
    inspect(item){inspectInput(item,'Attached input');},toggleInputs(){const panel=$('.ai-context-sources',content);panel.open=!panel.open;panel.hidden=!panel.open;return panel.open;},removeInputs(ids){for(const id of ids)model.remove(activeWorkspace,id);persist();render();},current:()=>model.session(activeWorkspace),workingFolder:()=>model.workingFolder(activeWorkspace),
    notify(text){status.textContent=text;},
    createTurn(request,response,context={}){const session=model.session(activeWorkspace),turn=model.exchange(activeWorkspace,request,response,context);if(!turn)return null;recordInputs(turn,session.id);model.draft(activeWorkspace,'');prompt.value='';persist();render();$('.ai-chat',content).scrollTop=$('.ai-chat',content).scrollHeight;return turn;},
    setAction(workspace,chatId,turnId,value){const turn=model.action(workspace,turnId,value,chatId);if(turn){persist();render();}return turn;},mode:()=>model.session(activeWorkspace).mode,setMode,snapshot:()=>model.snapshot(),merge(value){if(!quickPanel.hidden&&quickWorkspace!==activeWorkspace)closeQuick();model.load(value,{preserveSelection:activeWorkspace});signature='';const session=model.session(activeWorkspace);if(document.activeElement!==prompt)prompt.value=session.draft;render();}};
  layoutDockAreas(false,false);render();
})();
