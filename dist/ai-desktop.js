/* Assistant widget. Scoped chats retain exact manual and automatic inputs. */
(function(){
  'use strict';
  const C=SpatialAIContext,D=SpatialAIDemo,F=SpatialStashFiles,key='spatial-ai-context-v1';
  const model=C.create(readDesktopStorage(key,{}),{workspaces:()=>workspaceProfiles,projects:()=>projectSpaces});
  const area=document.querySelector('[data-widget-source="assistant"]'),content=$('.ai-content',area),prompt=$('#aiPrompt'),folder=$('#aiWorkingFolder'),attachments=$('#aiAttachments'),transcript=$('#aiTranscript'),status=$('#aiStatus');
  const sampleConversation=document.getElementById?.('aiSampleConversation');
  const replyAnnouncement=document.getElementById?.('aiReplyAnnouncement');
  const messageRoots=()=>[transcript,sampleConversation].filter(Boolean);
  const turnDetails=selector=>messageRoots().flatMap(root=>$$(selector,root));
  let current='',signature='',chatContext='',sourceDrag=null,owner=null,scopeAvailable=true,rendering=false;const views=new Map();
  const chatSelect=$('#aiChatSelect'),chatName=$('#aiChatName'),renameForm=$('#aiRenameForm'),send=$('#aiSend');
  const workspaceLabel=id=>workspaceProfiles[id]?.label||id;
  const contextToggle=$('#aiUseWorkspaceContext'),displayToggle=$('#aiAllowDisplayControl');
  const currentProject=()=>{const column=desktopPages.column(activeWorkspace);return projectSpaces[column]?column:null;};
  let voice=null,voiceWorkspace='',voiceContextOwner='',voiceManualBase='',voiceManualText='',voiceNotice='';
  const scopeLabel=()=>currentProject()?projectSpaces[currentProject()].name+' Project':workspaceLabel(activeWorkspace)+' Workspace';
  function syncScope(){
    const project=currentProject(),changed=owner&&(owner.workspace!==activeWorkspace||owner.project!==project);
    if(changed){rememberView();model.draft(owner.workspace,prompt.value,owner.chatId);}
    const before=model.session(activeWorkspace).id,previous=model.activeScope(activeWorkspace),session=model.scope(activeWorkspace,project);
    scopeAvailable=Boolean(session);
    if(session&&(!owner||changed||before!==session.id||previous!==project))persist();
    return session||model.session(activeWorkspace);
  }
  function automaticInputs(){
    const project=currentProject();
    if(!scopeAvailable||!model.contextPreference(activeWorkspace,project))return [];
    const result=[];
    for(const [id,info] of Object.entries(appInfo)){
      if(typeof appState==='undefined'||appState[id]!=='open'||desktopPages.columnOf(activeWorkspace,id)!==(project||'workspace'))continue;
      const frame=typeof frameFor==='function'?frameFor(id):null;if(!frame)continue;
      const at={workspace:activeWorkspace,project,app:info.base||id},base=info.base||id;
      const address=frame.dataset.fileLocation||frame.querySelector('.browser-toolbar input')?.value||'';
      const source={...at,address,label:info.label||base,desktop:desktopPages.pageOf(activeWorkspace,id)};
      const text=base==='notes'?frame.querySelector('.notes-layout textarea')?.value||'':base==='browser'?frame.querySelector('.start-page')?.innerText||'':'';
      result.push({...at,id:'window:'+activeWorkspace+':'+id,title:(frame.querySelector('.app-identity small')?.textContent||info.label||base),kind:base==='browser'?'browser':'app',address,text,source,origin:'automatic'});
      if(base==='dolphin'){
        for(const row of frame.querySelectorAll('[data-file-name][aria-selected="true"]')){
          if(row.dataset.fileFolder)continue;
          const path=address.replace(/\/$/,'')+'/'+row.dataset.fileName;
          const file=globalThis.SpatialAssistantDesktop?.fileContext?.(path,activeWorkspace);
          if(file&&file.workspace===activeWorkspace&&(file.project||null)===project)result.push({...file,origin:'automatic'});
        }
        const preview=frame.querySelector('.file-preview');
        const name=preview&&!preview.hidden?preview.querySelector('header b')?.textContent:'';
        if(name){const file=globalThis.SpatialAssistantDesktop?.fileContext?.(address.replace(/\/$/,'')+'/'+name,activeWorkspace);if(file&&file.workspace===activeWorkspace&&(file.project||null)===project)result.push({...file,origin:'automatic'});}
      }
    }
    return [...new Map(result.map(item=>[item.itemId||item.id,item])).values()];
  }
  function requestInputs(session){
    const manual=session.items.map(item=>({...item,origin:'manual'})),seen=new Set(manual.map(item=>item.itemId||item.id));
    const automatic=automaticInputs().filter(item=>!seen.has(item.itemId||item.id)).slice(0,Math.max(0,24-manual.length)).map(item=>captureInput(item));
    return [...manual,...automatic];
  }
  function renderPermissions(){
    const enabled=scopeAvailable&&model.contextPreference(activeWorkspace,currentProject()),inputs=automaticInputs(),permission=globalThis.SpatialDisplayRoleBridge?.displayControl?.();
    $('#aiScopeLabel').textContent=scopeLabel();contextToggle.checked=enabled;contextToggle.disabled=!scopeAvailable;
    displayToggle.checked=permission?.allowed===true;displayToggle.disabled=!permission?.available||!scopeAvailable;
    displayToggle._context=permission||null;
    $('#aiDisplayControlHint').textContent=permission?.available?'Display '+permission.slot+' · '+(permission.roleLabel||({main:'Main workspace',extended:'Extended workspace',side:'Side space'}[permission.role])||'This display')+' · '+permission.scopeLabel+'. Allows scripted window actions.':'Display control is unavailable while this display is disconnected.';
    const summary=$('#aiAutomaticContext'),list=$('#aiAutomaticSources');summary.hidden=!enabled;
    $('#aiAutomaticSummary').textContent=inputs.length+' source'+(inputs.length===1?'':'s');
    const markup=inputs.slice(0,24).map(item=>'<li>'+escapeHtml(item.title)+'<small>'+escapeHtml(C.representation(item))+'</small></li>').join('')+'<li class="ai-context-limit">Saved on send · 24 inputs maximum.</li>';
    if(list.innerHTML!==markup)list.innerHTML=markup;
    $('.ai-empty span',content).textContent=!scopeAvailable?'This Workspace holds 50 chats. Return to an existing context to continue.':enabled?'Context is on. Ask a question.':'Ask a question or drop a file.';
  }
  contextToggle.addEventListener('change',()=>{status.textContent='';model.contextPreference(activeWorkspace,currentProject(),contextToggle.checked);persist();renderPermissions();});
  displayToggle.addEventListener('change',()=>{try{const accepted=globalThis.SpatialDisplayRoleBridge?.setDisplayControl?.(displayToggle.checked,displayToggle._context);if(accepted===false)throw Error('The display or context changed. Try the switch again.');status.textContent='';}catch(error){status.textContent=error.message||'The display permission could not change.';}renderPermissions();});
  window.addEventListener('spatial-display-role-change',()=>{renderPermissions();syncVoiceContext();});
  let permissionRefresh=null;
  function refreshPermissionPreview(){
    if(permissionRefresh!==null)return;
    if(typeof requestAnimationFrame!=='function'){renderPermissions();return;}
    permissionRefresh=requestAnimationFrame(()=>{permissionRefresh=null;renderPermissions();});
  }
  for(const type of ['input','click','keydown'])document.addEventListener(type,event=>{if(event.target?.closest?.('[data-app-frame]'))refreshPermissionPreview();});
  document.addEventListener('selectionchange',refreshPermissionPreview);
  const dropHint=document.createElement('div'),dropTitle=document.createElement('b'),dropDetail=document.createElement('small');
  dropHint.className='ai-drop-hint';dropHint.hidden=true;dropHint.setAttribute('role','status');dropHint.append(dropTitle,dropDetail);document.body.append(dropHint);
  let dropPosition=null,inputPanel=null,inputOwner='',inputReturnFocus=null;
  const inApplet=()=>Boolean(content.closest('.panel-applet-popup'));
  const nativeExpanded=()=>Boolean(globalThis.SpatialPanels?.isWidgetExpanded?.('assistant'));
  const nativeVisible=()=>inApplet()||nativeExpanded();
  // Progress belongs to the normal Assistant conversation, including its
  // ordinary compact quick chat. Task updates never rebuild messages.
  const taskPanel=document.createElement('section');taskPanel.className='ai-live-task';taskPanel.hidden=true;taskPanel.setAttribute('aria-label','Assistant task');
  taskPanel.innerHTML='<div class="ai-live-task-heading"><span class="ai-live-task-label" role="status" aria-live="polite"></span><small class="ai-live-task-step"></small><button class="surface-key" type="button" data-ai-task-stop>Stop</button></div><p class="ai-live-task-paused" hidden>Paused. Choose Continue to let Assistant carry on.</p><div class="ai-live-task-choices" role="group" aria-label="Choose how to continue" hidden></div><details class="ai-live-task-steps"><summary>Steps</summary><ol></ol></details>';
  $('.ai-chat',content).append(taskPanel);
  let displayTask=null,taskSignature='',taskQuestionKey='';
  const taskStages=new Set(['plan','source','question','output']);
  const nearConversationEnd=()=>{const chat=$('.ai-chat',content);return chat.scrollHeight-(chat.scrollTop||0)-(chat.clientHeight||0)<90;};
  let followingChat='',followRevision=0;
  const conversationKey=()=>activeWorkspace+':'+model.session(activeWorkspace).id;
  const shouldFollowConversation=()=>followingChat===conversationKey()||nearConversationEnd();
  function stopFollowingConversation(){followingChat='';followRevision++;}
  function followConversation(){
    const key=conversationKey(),revision=++followRevision,chat=$('.ai-chat',content);followingChat=key;chat.scrollTop=chat.scrollHeight;
    if(typeof requestAnimationFrame!=='function'){followingChat='';return;}
    // Replacing messages and changing the question tray can adjust browser
    // scroll anchoring after the synchronous render. Settle the same reader
    // intent across that layout, without retaining it after a user scrolls up.
    requestAnimationFrame(()=>{if(revision!==followRevision||followingChat!==key||conversationKey()!==key)return;chat.scrollTop=chat.scrollHeight;requestAnimationFrame(()=>{if(revision!==followRevision||followingChat!==key||conversationKey()!==key)return;chat.scrollTop=chat.scrollHeight;followingChat='';});});
  }
  const conversation=$('.ai-chat',content);conversation.addEventListener('wheel',stopFollowingConversation,{passive:true});conversation.addEventListener('pointerdown',stopFollowingConversation,{passive:true});conversation.addEventListener('keydown',event=>{if(['PageUp','PageDown','Home','End','ArrowUp','ArrowDown'].includes(event.key))stopFollowingConversation();});
  $('#aiDemoHelp').addEventListener('click',()=>{
    const help=$('#aiDemoRequests'),open=help.hidden;
    help.hidden=!open;$('#aiDemoHelp').setAttribute('aria-expanded',String(open));
    if(open){stopFollowingConversation();conversation.scrollTop=0;}
  });
  function taskScopeMatches(state,context){
    if(!state||!context||!['main','extended','side'].includes(state.role)||state.workspaceId!==activeWorkspace||context.workspace!==activeWorkspace)return false;
    if(Object.hasOwn(context,'project')&&(context.project||null)!==currentProject())return false;
    if(context.role&&context.role!==state.role||context.setup&&state.setupKey&&context.setup!==state.setupKey||context.slot!=null&&state.localSlot!=null&&Number(context.slot)!==Number(state.localSlot))return false;
    return state.role==='side'||!Number.isInteger(context.page)||context.page===(desktopPages.current?.(activeWorkspace)??0);
  }
  function currentDisplayTask(){
    const state=displayTask,task=state?.space?.assistant,context=task?.context;
    return scopeAvailable&&taskScopeMatches(state,context)&&context.chatId===model.session(activeWorkspace).id?task:null;
  }
  const taskOngoing=task=>Boolean(task&&taskStages.has(task.activity?.stage));
  const taskPaused=task=>task?.allowed!==true||task?.control==='user'||task?.status==='paused';
  const choiceText=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  function answerTask(choiceId,questionId,operationId){
    const task=currentDisplayTask(),question=task?.activity?.stage==='question'?task.activity.question:null;
    if(!conversationVisible()||quickBlocked()||!question||taskPaused(task)||question.id!==questionId||task.context.operationId!==operationId||!question.options?.some(option=>option.id===choiceId))return false;
    const bridge=globalThis.SpatialDisplayRoleBridge;if(!bridge?.answerAssistantExample)return false;
    if(bridge.state){const fresh=bridge.state(),current=fresh.space?.assistant;if(!taskScopeMatches(fresh,current?.context)||current?.allowed!==true||current?.context?.chatId!==model.session(activeWorkspace).id||current.context.operationId!==operationId||current.activity?.question?.id!==questionId)return false;}
    const accepted=bridge.answerAssistantExample(choiceId,{questionId,operationId})!==false;if(accepted)followConversation();return accepted;
  }
  function renderDisplayTask(){
    const task=currentDisplayTask(),activity=task?.activity,ongoing=taskOngoing(task),paused=taskPaused(task),question=activity?.stage==='question'?activity.question:null;
    folder.disabled=true;folder.title='This chat saves in '+model.workingFolder(activeWorkspace)+'. Switch Workspace or Project to change context.';
    const latest=model.session(activeWorkspace).turns.at(-1),finishedHere=!task?.context?.turnId||task.context.turnId===latest?.id;
    const show=Boolean(activity&&(ongoing||['error','interrupted','stopped'].includes(activity.stage)||(finishedHere&&(activity.entries||[]).length))),next=JSON.stringify([show,task?.allowed,task?.status,task?.control,task?.context?.operationId,activity]);
    $('.ai-empty',content).hidden=show||Boolean(model.session(activeWorkspace).items.length||model.session(activeWorkspace).turns.some(turn=>!turn.example));
    if(next===taskSignature)return;const follow=shouldFollowConversation();taskSignature=next;taskPanel.hidden=!show;
    if(!show){taskQuestionKey='';return;}
    taskPanel.dataset.stage=activity.stage;
    const heading=$('.ai-live-task-heading',taskPanel),label=$('.ai-live-task-label',taskPanel),step=$('.ai-live-task-step',taskPanel),stop=$('[data-ai-task-stop]',taskPanel);
    // The durable question turn already asks the question. Its answer buttons
    // live here, so there is no second question panel competing with the chat.
    heading.hidden=!ongoing&&!['error','interrupted','stopped'].includes(activity.stage);
    label.textContent=question?'Waiting for your choice':paused&&ongoing?'Assistant is paused':activity.label||task.task||'Working';
    step.textContent=!question&&ongoing&&activity.total?String(activity.step||0)+' / '+activity.total:'';step.hidden=!step.textContent;
    stop.hidden=!ongoing;stop.dataset.aiTaskOperation=task.context?.operationId||'';
    const notice=$('.ai-live-task-paused',taskPanel),ended=['error','interrupted','stopped'].includes(activity.stage);notice.hidden=!(paused&&ongoing)&&!(ended&&activity.detail);notice.textContent=ended?activity.detail:task?.allowed!==true?'Paused. Turn on Allow display control to carry on.':'Paused. Choose Continue to let Assistant carry on.';
    const choices=$('.ai-live-task-choices',taskPanel),questionKey=JSON.stringify([question,task.context?.operationId]);choices.hidden=!question;
    if(taskQuestionKey!==questionKey){taskQuestionKey=questionKey;choices.innerHTML=(question?.options||[]).map(option=>'<button class="surface-key ai-task-choice" type="button" data-ai-task-answer="'+escapeHtml(option.id)+'" data-ai-task-question="'+escapeHtml(question.id)+'" data-ai-task-operation="'+escapeHtml(task.context?.operationId||'')+'"><b>'+escapeHtml(option.label)+'</b>'+(option.description?'<small>'+escapeHtml(option.description)+'</small>':'')+'</button>').join('');}
    $$('[data-ai-task-answer]',choices).forEach(button=>{button.disabled=paused;});
    const steps=$('.ai-live-task-steps',taskPanel),list=$('ol',steps),entries=activity.entries||[],markup=entries.map(entry=>'<li><b>'+escapeHtml(entry.label||'')+'</b>'+(entry.detail?'<span>'+escapeHtml(entry.detail)+'</span>':'')+'</li>').join('');steps.hidden=!entries.length;if(list.innerHTML!==markup)list.innerHTML=markup;
    if(follow)followConversation();
  }
  function setDisplayTask(state){displayTask=state||null;renderDisplayTask();}
  taskPanel.addEventListener('click',event=>{
    const answer=event.target.closest('[data-ai-task-answer]');if(answer){try{if(answerTask(answer.dataset.aiTaskAnswer,answer.dataset.aiTaskQuestion,answer.dataset.aiTaskOperation)){status.textContent='';prompt.focus();}}catch(error){status.textContent=error.message||'Choose one of the displayed options.';}return;}
    const stop=event.target.closest('[data-ai-task-stop]'),task=currentDisplayTask();if(stop&&conversationVisible()&&!quickBlocked()&&taskOngoing(task)&&stop.dataset.aiTaskOperation===task.context.operationId){try{const bridge=globalThis.SpatialDisplayRoleBridge,fresh=bridge?.state?.(),context=fresh?.space?.assistant?.context;if(!fresh||(taskScopeMatches(fresh,context)&&context?.chatId===model.session(activeWorkspace).id&&context.operationId===stop.dataset.aiTaskOperation))bridge?.stopAssistantExample?.();}catch(error){status.textContent=error.message||'The task could not stop.';}}
  });
  const withinAssistant=target=>Boolean(target&&area.contains(target));
  const blockedByDialog=()=>Boolean(document.querySelector?.('[aria-modal="true"]:not([hidden]):not([aria-hidden="true"]),#universalSearch.is-open,#packageDialog.is-open,#projectEditorDialog.is-open:not(.is-inline),#desktopContextMenu:not([hidden]),#spatialGuideDialog:not([hidden])'));
  const quickBlocked=()=>Boolean($('.desktop-shell').inert||blockedByDialog()||(globalThis.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('ai')));
  const conversationVisible=()=>{
    if(content.dataset.displayExamples==='open')return false;
    for(let at=content;at;at=at.parentElement||at.parentNode)if(at.hidden||at.inert||at.getAttribute?.('aria-hidden')==='true')return false;
    return nativeVisible();
  };
  function revealContent(){window.dispatchEvent(new CustomEvent('spatial-assistant-display-reveal',{detail:{workspace:activeWorkspace}}));}
  function closeQuick(restoreFocus=false){
    if(inApplet())globalThis.SpatialPanels?.closeApplet?.(restoreFocus);
  }
  function openQuick(focus=true){
    if(quickBlocked())return;
    revealContent();
    if(!nativeExpanded()&&!inApplet())globalThis.SpatialPanels?.openApplet?.('assistant');
    if(focus&&nativeVisible())prompt.focus();
  }
  function renderNative(session){
    area.dataset.chatTitle=session.title;
    area.dataset.sourceCount=String(session.items.length);
    area.dataset.hasDraft=String(Boolean(session.draft));
    globalThis.SpatialPanels?.refresh?.();
  }
  document.addEventListener('pointerdown',event=>{if(inputPanel&&!inputPanel.hidden&&inputPanel.contains(event.target))return;if(inputPanel&&!inputPanel.hidden&&!event.target.closest?.('[data-ai-inspect],[data-ai-input]'))closeInput();},true);
  const layerObserver=new MutationObserver(()=>{if(inputPanel&&!inputPanel.hidden&&quickBlocked())closeInput();if(voice&&(voice.state().active||voice.state().speaking)&&(!conversationVisible()||quickBlocked()))voice.stop('Voice paused. Open the chat to start again.');});
  layerObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden','aria-modal','inert','data-display-examples']});

  const editableDropTarget=target=>Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));
  const insertsText=event=>editableDropTarget(event.target)&&![...event.dataTransfer.types].some(type=>type==='Files'||type===C.MIME);
  function showDropTarget(event=null){
    const visible=Boolean(event)&&nativeVisible()&&!quickBlocked();
    area.classList.toggle('is-ai-drop-target',visible);dropHint.hidden=!visible;dropPosition=visible?{clientX:event.clientX,clientY:event.clientY}:null;
    if(!visible)return;
    const title='Attach to '+model.session(activeWorkspace).title,detail=workspaceLabel(activeWorkspace)+' workspace · Copy source';
    if(dropTitle.textContent!==title)dropTitle.textContent=title;if(dropDetail.textContent!==detail)dropDetail.textContent=detail;
    const rect=dropHint.getBoundingClientRect();
    dropHint.style.left=Math.max(8,Math.min(event.clientX+18,window.innerWidth-rect.width-8))+'px';
    dropHint.style.top=Math.max(8,Math.min(event.clientY+18,window.innerHeight-rect.height-8))+'px';
  }
  function persist(){try{desktopStorage.setItem(key,JSON.stringify(model.snapshot()));queueDesktopStateBroadcast(0);return true;}catch{status.textContent='Changes are visible here but could not be saved. Keep this tab open.';return false;}}
  function validateWorkingFolder(path,workspace=activeWorkspace){
    const profile=workspaceProfiles[workspace];if(!profile)throw Error('Choose an available Workspace.');
    if(typeof path!=='string'||!path.startsWith('/'))throw Error('Choose an available local working folder.');
    const scopes=[{root:profile.home,rows:profile.folders||[]},...Object.values(projectSpaces).map(project=>({root:project.root,rows:project.files||[]}))];
    const scope=scopes.filter(scope=>path===scope.root.replace(/\/+$/,'')+'/Assistant'||path.startsWith(scope.root.replace(/\/+$/,'')+'/Assistant/')).sort((a,b)=>b.root.length-a.root.length)[0];
    if(!scope)return path;
    const rows=[...scope.rows,...(globalThis.SpatialMemoryDesktop?.fileRows?.(scope.root)||[])];
    const downloads=typeof workspaceDownloads==='undefined'?[]:workspaceDownloads.list(scope.root);
    if(rows.some(row=>row[0]==='Assistant'&&row[2]!=='folder')||downloads.some(file=>file.name==='Assistant'))throw Error('A file named Assistant already exists in '+scope.root+'. Rename it before using the Assistant working folder.');
    return path;
  }
  function captureInput(item,workspace=activeWorkspace){
    const normalized=model.normalize(item,workspace),canonical=item.itemId||item.fileId||item.id||normalized.id,history=globalThis.SpatialItemHistoryDesktop;
    // Files's virtual saved-file location is an attachment locator, not a new
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
    const references=turn.sources.map((item,index)=>'<li><button class="ai-input-citation" data-ai-input="'+index+'" data-ai-input-turn="'+escapeHtml(turn.id)+'"><span>['+(index+1)+']</span><span><b>'+escapeHtml(item.filename||item.title)+'</b><small>'+escapeHtml((item.origin==='automatic'?'Automatic context · ':'Attached input · ')+C.representation(item))+'</small></span>'+icon('i-note')+'</button></li>').join('');
    const saved=turn.outputs||[],ordinary=!turn.presentation&&!saved.length&&!turn.assistantOnly&&!turn.action;
    const outputCards=saved.map((output,index)=>{const name=output.path.split('/').at(-1),scope=turn.project?(projectSpaces[turn.project]?.name||turn.project)+' Project':workspaceLabel(turn.workspace)+' Workspace';return '<article class="ai-result-file"><span class="ai-result-file-icon">'+icon(output.kind==='image'?'i-image':'i-note')+'</span><div><b>'+escapeHtml(output.title||name)+'</b>'+(output.title!==name?'<small>'+escapeHtml(name)+'</small>':'')+'<small>Saved · '+escapeHtml(scope)+'</small><div class="ai-result-file-actions"><button class="surface-key" type="button" data-ai-result-open="'+index+'" data-ai-result-turn="'+escapeHtml(turn.id)+'">Open</button><button class="surface-key" type="button" data-ai-result-folder="'+index+'" data-ai-result-turn="'+escapeHtml(turn.id)+'">Show in folder</button></div></div></article>';}).join('');
    return '<section class="ai-turn'+(turn.action?' ai-file-turn':'')+'" data-ai-turn="'+escapeHtml(turn.id)+'"'+(turn.presentation?' data-ai-presentation="'+turn.presentation+'"':'')+'>'+(turn.assistantOnly?'':'<div class="ai-request"><small>'+(turn.example?'Example request':'You')+'</small><p>'+escapeHtml(turn.request)+'</p></div>')+'<article class="ai-demo-output" data-ai-turn-output="'+escapeHtml(turn.id)+'"'+(ordinary?' draggable="true" tabindex="0" data-ai-demo-turn="'+escapeHtml(turn.id)+'"':'')+' aria-label="Assistant: '+escapeHtml(turn.title)+'"'+(turn.action?' hidden':'')+'><header>'+icon('i-ai')+'<span>Assistant</span></header><b>'+escapeHtml(turn.title)+'</b><p>'+escapeHtml(turn.text)+'</p>'+outputCards+'</article><div class="ai-turn-actions">'+(ordinary?'<button class="surface-key ai-save-output" data-ai-save-output="'+escapeHtml(turn.id)+'">Save to Files</button>':'')+'<details class="ai-turn-sources" data-ai-turn-details="'+escapeHtml(turn.id)+'"><summary>Details</summary><small>Scripted local reply · '+turn.sources.length+' saved input'+(turn.sources.length===1?'':'s')+'</small><small class="ai-turn-folder">Working folder: '+escapeHtml(turn.folder)+'</small>'+saved.map(output=>'<small class="ai-turn-folder">'+escapeHtml(output.path)+'</small>').join('')+(references?'<ul>'+references+'</ul>':'')+(ordinary?'<small>Drag the reply into Files to keep it with its input history.</small>':'')+'</details></div></section>';
  }
  function exampleMarkup(examples){
    if(desktopPreset!=='demo'||globalThis.SpatialGuide?.model.active())return examples.length?'<details class="ai-examples"><summary>Sample conversation</summary>'+examples.map(turnMarkup).join('')+'</details>':'';
    const actualProject=currentProject(),builtIn=SpatialDemoExamples.projects[actualProject],project=projectSpaces[actualProject];
    const context=builtIn&&project?.name===builtIn.name&&project?.root===builtIn.root?actualProject:actualProject?null:activeWorkspace;
    const workflows=SpatialDemoExamples.assistantWorkflows?.[context]||[];
    const recipes=workflows.map(recipe=>'<section class="ai-example-recipe"><b>'+escapeHtml(recipe.title)+'</b><ol>'+recipe.steps.map(step=>'<li>'+escapeHtml(step)+'</li>').join('')+'</ol>'+(recipe.prompt?'<p class="ai-example-prompt">'+escapeHtml(recipe.prompt)+'</p>':'')+'</section>').join('');
    const earlier=examples.length?'<details class="ai-earlier-examples"><summary>Earlier sample replies</summary>'+examples.map(turnMarkup).join('')+'</details>':'';
    return recipes||earlier?'<details class="ai-examples"><summary>Sample conversation</summary>'+recipes+(recipes?'<p class="ai-example-note">Replies are scripted. File conversions create local copies.</p>':'')+earlier+'</details>':'';
  }
  function submitRequest(){
    if(replyAnnouncement)replyAnnouncement.textContent='';
    const request=prompt.value.trim();if(!request){status.textContent='Write a request first.';return false;}
    if(!conversationVisible()||quickBlocked())return false;
    const task=currentDisplayTask();
    if(taskOngoing(task)){
      model.draft(activeWorkspace,prompt.value);persist();
      if(taskPaused(task)){status.textContent=task.allowed!==true?'Your draft is kept. Turn on Allow display control before answering the task.':'Your draft is kept. Choose Continue before answering the task.';return false;}
      const question=task.activity.stage==='question'?task.activity.question:null;
      if(!question){status.textContent='Your draft is kept while Assistant works. Stop the task to start a different request.';return false;}
      const choice=question.options?.find(option=>[option.id,option.label].some(label=>choiceText(label)===choiceText(request)));
      if(!choice){status.textContent='Choose one of the displayed options, or type its label. Your draft is kept.';return false;}
      const workspace=activeWorkspace,chatId=model.session(workspace).id,sentDraft=prompt.value;
      try{if(!answerTask(choice.id,question.id,task.context.operationId)){status.textContent='This question changed. Choose one of the current options.';return false;}}catch(error){status.textContent=error.message||'The answer could not be used. Your draft is kept.';return false;}
      if(activeWorkspace===workspace&&model.session(workspace).id===chatId&&prompt.value===sentDraft){model.draft(workspace,'',chatId);prompt.value='';send.disabled=true;persist();}status.textContent='';return true;
    }
    if(!scopeAvailable){status.textContent='This Workspace holds 50 chats. Return to an existing context to continue.';return false;}
    const session=model.session(activeWorkspace),workingFolder=model.workingFolder(activeWorkspace),project=projectSpaces[session.workingProject],inputs=requestInputs(session);
    const turn=model.exchange(activeWorkspace,request,D.reply(request,{items:inputs,folder:workingFolder,project:project?.name||workspaceLabel(activeWorkspace)+' workspace'}),{sources:inputs});
    if(!turn){status.textContent='This demo chat is full. Start a new chat to continue; your draft is kept.';return false;}
    recordInputs(turn,session.id);
    model.draft(activeWorkspace,'');prompt.value='';status.textContent='';persist();render();
    const sources=$('.ai-context-sources',content);if(sources){sources.open=false;sources.hidden=true;}
    followConversation();
    if(replyAnnouncement)replyAnnouncement.textContent='Reply ready.';
    speakTurn(turn);return true;
  }
  function rememberView(){
    if(!current)return;
    views.set(current,{scroll:$('.ai-chat',content).scrollTop||0,sources:$('.ai-context-sources',content).open,
      expanded:$$('[data-ai-source-detail][open]',attachments).map(node=>node.dataset.aiSourceDetail),turnDetails:turnDetails('[data-ai-turn-details][open]').map(node=>node.dataset.aiTurnDetails),sampleSections:sampleConversation?$$('details',sampleConversation).flatMap((node,index)=>node.open?[index]:[]):[]});
  }
  function render(){
    if(rendering)return;rendering=true;try{renderChat();}finally{rendering=false;}
  }
  function renderChat(){
    const session=syncScope(),nextKey=activeWorkspace+':'+session.id,switched=current!==nextKey;if(inputPanel&&!inputPanel.hidden&&(inputOwner!==nextKey||quickBlocked()||!nativeVisible()))closeInput();renderNative(session);renderPermissions();syncVoiceContext();
    const chats=model.chats(activeWorkspace),project=projectSpaces[session.workingProject];
    const options=[...new Set([session.workingProject,...session.items.map(item=>item.project),activeProjectName].filter(id=>projectSpaces[id]))];
    const next=JSON.stringify([activeWorkspace,currentProject(),scopeAvailable,activeProjectName,session.id,chats,session.items,session.turns,session.workingProject,options.map(id=>[id,projectSpaces[id].name,projectSpaces[id].root])]);
    if($('#aiAreaContext'))$('#aiAreaContext').textContent=project?.name||workspaceLabel(activeWorkspace)+' workspace';
    if(dropPosition)showDropTarget(dropPosition);
    const follow=!switched&&shouldFollowConversation();if(switched)stopFollowingConversation();renderDisplayTask();if(next===signature)return;const focusedSummary=!switched&&messageRoots().some(root=>root.contains(document.activeElement))&&document.activeElement?.matches?.('summary')?document.activeElement:null,focusedDetails=focusedSummary?.closest?.('[data-ai-turn-details]')?.dataset.aiTurnDetails;rememberView();signature=next;
    if(switched){current=nextKey;prompt.value=session.draft;renameForm.hidden=true;status.textContent='';}owner={workspace:activeWorkspace,project:currentProject(),chatId:session.id};
    chatSelect.innerHTML=chats.map(chat=>'<option value="'+escapeHtml(chat.id)+'">'+escapeHtml(chat.title)+'</option>').join('');chatSelect.value=session.id;chatSelect.title=session.title;
    prompt.disabled=!scopeAvailable;send.disabled=!scopeAvailable||!prompt.value.trim()||session.turns.length>=60;
    chatSelect.disabled=!scopeAvailable;$('#aiNewChat').disabled=!scopeAvailable;$('#aiRenameChat').disabled=!scopeAvailable;
    if(!scopeAvailable)status.textContent='This Workspace holds 50 chats. Return to an existing context to continue.';
    folder.innerHTML='<option value="">'+escapeHtml(workspaceLabel(activeWorkspace)+' · '+workspaceProfiles[activeWorkspace].home+'/Assistant')+'</option>'+options.map(id=>'<option value="'+escapeHtml(id)+'">'+escapeHtml(projectSpaces[id].name+' · '+projectSpaces[id].root+'/Assistant')+'</option>').join('');folder.value=session.workingProject||'';folder.title=model.workingFolder(activeWorkspace);
    attachments.innerHTML=session.items.map(itemMarkup).join('');const examples=session.turns.filter(turn=>turn.example),replies=session.turns.filter(turn=>!turn.example),sampleMarkup=exampleMarkup(examples);
    if(sampleConversation){sampleConversation.innerHTML=sampleMarkup;sampleConversation.hidden=!sampleMarkup;}transcript.innerHTML=(sampleConversation?'':sampleMarkup)+replies.map(turnMarkup).join('');transcript.hidden=!scopeAvailable;$('.ai-empty',content).hidden=scopeAvailable&&(session.items.length>0||replies.length>0||!taskPanel.hidden);
    const sources=$('.ai-context-sources',content),view=views.get(nextKey);sources.open=view?.sources??false;sources.hidden=!scopeAvailable||!session.items.length||!sources.open;sources.querySelector('summary').textContent='Details';
    $$('[data-ai-source-detail]',attachments).forEach(node=>{node.open=Boolean(view?.expanded?.includes(node.dataset.aiSourceDetail));});
    if(sampleConversation)$$('details',sampleConversation).forEach((node,index)=>{node.open=Boolean(view?.sampleSections?.includes(index));});
    turnDetails('[data-ai-turn-details]').forEach(node=>{node.open=Boolean(view?.turnDetails?.includes(node.dataset.aiTurnDetails));});
    if(focusedDetails&&(document.activeElement===focusedSummary||focusedSummary.isConnected===false))turnDetails('[data-ai-turn-details]').find(node=>node.dataset.aiTurnDetails===focusedDetails)?.querySelector('summary')?.focus?.({preventScroll:true});
    if(switched)$('.ai-chat',content).scrollTop=view?.scroll??$('.ai-chat',content).scrollHeight??0;else if(follow)followConversation();
    prepareControlSemantics(area);
    const detail={workspace:activeWorkspace,chatId:session.id,folder:model.workingFolder(activeWorkspace)},context=JSON.stringify(detail);
    if(context!==chatContext){chatContext=context;if(typeof CustomEvent==='function')window.dispatchEvent?.(new CustomEvent('spatial-ai-chat-change',{detail}));}
  }
  chatSelect.addEventListener('change',()=>{if(!scopeAvailable)return;rememberView();model.draft(activeWorkspace,prompt.value);model.select(activeWorkspace,chatSelect.value);persist();render();});
  function newChat(){rememberView();model.draft(activeWorkspace,prompt.value);const chat=model.newChat(activeWorkspace);if(!chat){openQuick();status.textContent='This workspace holds up to 50 chats.';return;}persist();render();openQuick();prompt.focus();}
  $('#aiNewChat').addEventListener('click',newChat);
  $('#aiRenameChat').addEventListener('click',()=>{chatName.value=model.session(activeWorkspace).title;renameForm.hidden=false;chatName.focus();chatName.select?.();});
  $('#aiCancelRename').addEventListener('click',()=>{renameForm.hidden=true;});
  renameForm.addEventListener('submit',event=>{event.preventDefault();if(model.rename(activeWorkspace,model.session(activeWorkspace).id,chatName.value)){renameForm.hidden=true;persist();render();}else{status.textContent='Give this chat a name first.';chatName.focus();}});
  function setMode(mode,save=true){model.mode(activeWorkspace,mode);if(save)persist();}
  function expand(focus=true){
    if(quickBlocked())return;
    revealContent();
    closeQuick(false);
    globalThis.SpatialPanels?.showWidget?.('assistant',true);
    if(focus&&nativeVisible())prompt.focus();
  }
  function toggle(){
    if(quickBlocked())return;
    if(inApplet())closeQuick(true);else openQuick();
  }
  function add(item){
    if(!scopeAvailable){status.textContent='Return to an existing chat context before attaching an input.';return false;}
    const previous=model.session(activeWorkspace).workingProject,added=model.add(activeWorkspace,captureInput(item));
    if(!added){status.textContent='This conversation holds up to 24 attachments. Remove one to add another.';return false;}
    persist();render();openQuick(false);
    status.textContent=previous&&added.project&&previous!==added.project?'Attached from '+(projectSpaces[added.project]?.name||'another project')+'. Working folder stays '+model.workingFolder(activeWorkspace)+'.':'Attached to this request.';return true;
  }
  prompt.addEventListener('input',()=>{if(voice?.state().active)voice.stop('Microphone stopped while you edit.');model.draft(activeWorkspace,prompt.value);send.disabled=!prompt.value.trim()||model.session(activeWorkspace).turns.length>=60;persist();renderNative(model.session(activeWorkspace));status.textContent='';});
  prompt.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();event.stopPropagation();voice?.stop('Microphone stopped before sending.');submitRequest();}if(event.key==='Escape'){event.stopPropagation();closeQuick(true);}});
  $('#aiComposer').addEventListener('submit',event=>{event.preventDefault();voice?.stop('Microphone stopped before sending.');submitRequest();});
  folder.addEventListener('change',()=>{folder.value=model.session(activeWorkspace).workingProject||'';status.textContent='Switch Workspace or Project to use its chat and save location.';});
  attachments.addEventListener('click',event=>{const inspect=event.target.closest('[data-ai-inspect]');if(inspect){inspectInput(model.session(activeWorkspace).items.find(item=>item.id===inspect.dataset.aiInspect),'Attached input');return;}const link=event.target.closest('[data-ai-source]');if(link){event.preventDefault();const item=model.session(activeWorkspace).items.find(item=>item.id===link.dataset.aiSource);if(item?.source.address){if(/^https?:/.test(item.source.address)){const id=createAppInstance('browser');navigateBrowser(id,item.source.address);}else openFileLocation(item.source.address);}return;}const button=event.target.closest('[data-ai-remove]');if(!button)return;model.remove(activeWorkspace,button.dataset.aiRemove);persist();render();});
  async function handleTurnClick(event){
    const outputButton=event.target.closest('[data-ai-result-open],[data-ai-result-folder]');
    if(outputButton){
      if(!conversationVisible()||quickBlocked())return;
      const turn=model.session(activeWorkspace).turns.find(turn=>turn.id===outputButton.dataset.aiResultTurn),showFolder=Object.hasOwn(outputButton.dataset,'aiResultFolder'),index=Number(showFolder?outputButton.dataset.aiResultFolder:outputButton.dataset.aiResultOpen),output=turn?.outputs?.[index];if(!output)return;
      try{const files=globalThis.SpatialAssistantFiles,accessible=typeof openProjectNames==='function'?openProjectNames():[];if(!files?.allowed(output.path,activeWorkspace,workspaceProfiles,projectSpaces,accessible))throw Error('Open this file’s Project before using its result.');const directory=output.path.slice(0,output.path.lastIndexOf('/'))||'/';if(globalThis.SpatialDisplayRoleBridge?.openReference&&SpatialDisplayRoleBridge.state?.().role==='side')SpatialDisplayRoleBridge.openReference({kind:showFolder?'folder':'file',path:showFolder?directory:output.path});else if(showFolder)openFileLocation(directory);else{const app=createAppInstance('dolphin');if(!app)throw Error('File Browser could not open.');renderFileLocation(app,directory);if(!appFileRows(app,directory).some(row=>row[0]===output.path.split('/').at(-1))){closeApp(app);throw Error('This saved result is no longer available.');}openAppFile(app,output.path.split('/').at(-1));}status.textContent='';}catch(error){status.textContent=error.message||'The saved file could not open.';}return;
    }
    const save=event.target.closest('[data-ai-save-output]');if(save){const turn=model.session(activeWorkspace).turns.find(turn=>turn.id===save.dataset.aiSaveOutput);if(!turn||turn.presentation||turn.assistantOnly||turn.outputs?.length||!globalThis.SpatialMemoryDesktop)return;const workspace=activeWorkspace,chatId=model.session(workspace).id,key=JSON.stringify([workspace,turn.project&&projectSpaces[turn.project]?turn.project:null]);save.disabled=true;const kept=await SpatialMemoryDesktop.keepContext(outputContext(turn),key,{folder:turn.folder||model.workingFolder(workspace)});save.disabled=false;if(activeWorkspace===workspace&&model.session(workspace).id===chatId)status.textContent=kept?'Saved in '+(turn.folder||model.workingFolder(workspace))+' with its input versions.':'Could not save this draft. Check the Files and try again.';return;}
    const citation=event.target.closest('[data-ai-input]');if(!citation)return;const turn=model.session(activeWorkspace).turns.find(turn=>turn.id===citation.dataset.aiInputTurn);inspectInput(turn?.sources[Number(citation.dataset.aiInput)],'Request input · '+(turn?.title||'Reply'));
  }
  transcript.addEventListener('click',handleTurnClick);sampleConversation?.addEventListener('click',handleTurnClick);
  document.addEventListener('keydown',event=>{if((globalThis.SpatialDemoSuper?.held()||event.metaKey||event.getModifierState?.('OS'))&&!event.ctrlKey&&!event.altKey&&!event.shiftKey&&event.code==='KeyA'&&(!globalThis.SpatialGuide?.model.active()||SpatialGuide.model.allows('ai'))){event.preventDefault();event.stopPropagation();superKeyAlone=false;if(!globalThis.SpatialAssistantDesktop?.invoke())toggle();}},true);

  function baseSource(target){
    const frame=target.closest('[data-app-frame]'),app=frame?.dataset.appFrame,owner=app&&desktopPages.columnOf(activeWorkspace,app);
    const project=projectSpaces[owner]?owner:target.closest('[data-widget-source="files"]')&&projectSpaces[activeProjectName]?activeProjectName:null;
    return {workspace:activeWorkspace,project,app:appInfo[app]?.base||app||''};
  }
  function describe(target){
    const output=target.closest('[data-ai-demo-turn]');
    if(output){const turn=model.session(activeWorkspace).turns.find(turn=>turn.id===output.dataset.aiDemoTurn);return turn?outputContext(turn):null;}
    // The working-material shelf is a body portal, so its owner is captured
    // from the active column at gesture start instead of a widget ancestor.
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
    const targetAt=event=>{const target=document.elementFromPoint(event.clientX,event.clientY);return !quickBlocked()&&target&&(withinAssistant(target)&&nativeVisible()&&content.dataset.displayExamples!=='open');};
    const stashAt=event=>{const target=document.elementFromPoint(event.clientX,event.clientY);return target?.closest?.('#workingMemory,[data-widget-source="files"]')&&!editableDropTarget(target);};
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
  const compactTarget=target=>target?.closest?.('.desktop-widget-summary[data-widget-id="assistant"]');
  document.addEventListener('dragover',event=>{
    if(!compactTarget(event.target)||quickBlocked()||document.body.dataset.panelEditing==='true'||!accepts(event))return;
    event.preventDefault();event.dataTransfer.dropEffect='copy';
    if(!inApplet()&&!nativeExpanded())globalThis.SpatialPanels?.openApplet?.('assistant',compactTarget(event.target));
    showDropTarget(event);
  });
  document.addEventListener('drop',event=>{
    if(!compactTarget(event.target)||quickBlocked()||document.body.dataset.panelEditing==='true'||!accepts(event))return;
    openQuick(false);
    // Forward the original payload to the shared content receiver.
    const forwarded=new Event('drop',{bubbles:true,cancelable:true});
    Object.defineProperty(forwarded,'dataTransfer',{value:event.dataTransfer});
    event.preventDefault();event.stopPropagation();content.dispatchEvent(forwarded);
  });
  const receivesDrop=event=>scopeAvailable&&!quickBlocked()&&(nativeVisible()&&content.dataset.displayExamples!=='open');
  for(const dropSurface of [area,content])dropSurface.addEventListener('dragover',event=>{if(!receivesDrop(event)||!accepts(event)||insertsText(event)){showDropTarget();return;}event.preventDefault();event.dataTransfer.dropEffect='copy';showDropTarget(event);});
  for(const dropSurface of [area,content])dropSurface.addEventListener('dragleave',event=>{if(!withinAssistant(event.relatedTarget))showDropTarget();});
  document.addEventListener('dragover',event=>{if(!withinAssistant(event.target))showDropTarget();});
  document.addEventListener('drop',()=>showDropTarget(),true);
  document.addEventListener('dragend',()=>{sourceDrag=null;showDropTarget();});
  for(const dropSurface of [area,content])dropSurface.addEventListener('drop',async event=>{
    showDropTarget();if(!receivesDrop(event)||!accepts(event)||insertsText(event))return;event.preventDefault();event.stopPropagation();
    const raw=event.dataTransfer.getData(C.MIME),source=sourceDrag||{workspace:activeWorkspace};sourceDrag=null;
    if(raw){try{add(JSON.parse(raw));}catch{status.textContent='This attachment could not be read.';}return;}
    const files=[...event.dataTransfer.files];
    if(files.length){
      const workspace=activeWorkspace,chatId=model.session(workspace).id;
      const notifyOwner=message=>{if(activeWorkspace===workspace&&model.session(workspace).id===chatId)status.textContent=message;};
      openQuick(false);
      for(const file of files){
        if(file.size>25*1024*1024){notifyOwner('Files must be smaller than 25 MB.');continue;}
        if(model.session(workspace,chatId).items.length>=24){notifyOwner('This conversation holds up to 24 attachments.');break;}
        let fileKey='',attached=false;
        try{
          fileKey='stash-upload-'+crypto.randomUUID();await F.put(fileKey,file);
          const text=file.type.startsWith('text/')?await file.text():'';
          // Another drop can fill this chat while bytes or text are loading.
          // Check again before creating history or publishing an attachment.
          if(model.session(workspace,chatId).items.length>=24){notifyOwner('This conversation holds up to 24 attachments.');break;}
          attached=Boolean(model.add(workspace,captureInput({workspace,id:fileKey,fileKey,filename:file.name,title:file.name,kind:file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':'file',text,attachment:{kind:file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':'file',key:fileKey,filename:file.name,mime:file.type,size:file.size},source:{workspace,label:'File upload'}},workspace),chatId));
          if(!attached){notifyOwner('This conversation holds up to 24 attachments.');break;}
          persist();render();notifyOwner('Attached to this request.');
        }catch{notifyOwner('Could not keep this file in this browser.');}
        finally{if(fileKey&&!attached&&F.remove)await Promise.allSettled([Promise.resolve().then(()=>F.remove(fileKey))]);}
      }
      return;
    }
    const text=event.dataTransfer.getData('text/plain'),url=event.dataTransfer.getData('text/uri-list').split('\n').find(line=>line&&!line.startsWith('#'));
    if(text||url)add({...source,title:url||text.trim().slice(0,80)||'Dropped content',kind:url?'link':'text',text,address:url||''});
  });
  // Preserve earlier draft requests in the Assistant widget.
  const legacyDrafts=readDesktopStorage('spatial-stash-ai-drafts-v1',{}),drafts=legacyDrafts&&typeof legacyDrafts==='object'?legacyDrafts:{};
  if(!desktopStorage.getItem(key)){Object.keys(workspaceProfiles).forEach(workspace=>{const project=workspaceProjects[workspace];const draft=drafts['project:'+project]||drafts[JSON.stringify([workspace,null])];if(typeof draft==='string'&&draft){model.draft(workspace,draft);model.folder(workspace,project);}});persist();}
  function revealChat(chatId,{turnId}={}){
    if(quickBlocked())return false;const chat=model.session(activeWorkspace,chatId);if(!chat)return false;
    const project=chat.scopeBound?chat.scopeProject:chat.workingProject;
    if(project!==currentProject()){
      if(typeof desktopPageAnimating!=='undefined'&&desktopPageAnimating){status.textContent='Let the desktop switch finish, then open this chat again.';return false;}
      if(project&&typeof activateProject==='function')activateProject(project,false);
      else if(typeof changeDesktopColumn==='function')changeDesktopColumn(project||'workspace',false);
      if(project!==currentProject())return false;
      render();
    }
    model.draft(activeWorkspace,prompt.value);if(!model.select(activeWorkspace,chatId))return false;closeInput();persist();render();expand(false);
    if(turnId){
      const turn=messageRoots().flatMap(root=>$$('[data-ai-turn]',root)).find(node=>node.dataset.aiTurn===turnId);
      if(turn){
        if(sampleConversation?.contains(turn)){$('#aiDemoRequests').hidden=false;$('#aiDemoHelp').setAttribute('aria-expanded','true');}
        for(let at=turn.parentElement;at&&at!==transcript&&at!==sampleConversation;at=at.parentElement)if(at.tagName==='DETAILS')at.open=true;
        turn.scrollIntoView?.({block:'center'});rememberView();
      }
    }
    return true;
  }
  function startExample({title='Assistant example',folder:targetFolder,items=[],workspace=activeWorkspace,chatId}={}){
    // Validate before selecting a new conversation. An example must never
    // consume an existing draft, replace its inputs or spill into another Home.
    if(workspace!==activeWorkspace||(chatId&&model.session(workspace).id!==chatId))throw Error('The Workspace or chat changed. Start the example again here.');
    if(quickBlocked())throw Error('Close the open dialog before starting an Assistant example.');
    if(model.chats(workspace,{all:true}).length>=50)throw Error('This Workspace holds up to 50 chats. Your current chat has been kept.');
    if(!Array.isArray(items)||items.length>24||items.some(item=>!item||typeof item!=='object'||item.workspace&&item.workspace!==workspace||item.source?.workspace&&item.source.workspace!==workspace))throw Error('Choose up to 24 inputs from the current Workspace.');
    const files=globalThis.SpatialAssistantFiles,home=workspaceProfiles[workspace].home;
    if(!files)throw Error('Assistant file tools are unavailable.');
    const requested=files.path(targetFolder||model.workingFolder(workspace),home),project=Object.keys(projectSpaces).find(id=>[projectSpaces[id].root,projectSpaces[id].root.replace(/\/+$/,'')+'/Assistant'].includes(requested))||null;
    const base=project?projectSpaces[project].root:home,destination=base.replace(/\/+$/,'')+'/Assistant';
    const accessible=typeof openProjectNames==='function'?openProjectNames(workspace):[activeProjectName].filter(Boolean);
    if(![base,destination].includes(requested)||!files.allowed(destination,workspace,workspaceProfiles,projectSpaces,accessible))throw Error('Choose the Assistant folder in this Workspace Home or an open Project.');
    validateWorkingFolder(destination,workspace);
    if(project!==currentProject())throw Error('Switch to '+(project?projectSpaces[project].name+' Project':'the Workspace column')+' before starting this example.');
    const sources=items.map(item=>captureInput(item,workspace));
    if(new Set(sources.map(item=>item.id)).size!==sources.length)throw Error('Choose distinct example inputs.');
    rememberView();model.draft(workspace,prompt.value);
    const chat=model.newChat(workspace,project);if(!chat)throw Error('This Workspace holds up to 50 chats. Your current chat has been kept.');
    model.rename(workspace,chat.id,title);model.folder(workspace,project,chat.id);
    for(const item of sources)model.add(workspace,item,chat.id);
    closeInput();persist();render();openQuick(false);
    return {workspace,chatId:chat.id,folder:destination,project,items:chat.items};
  }
  globalThis.SpatialAIDesktop={render,expand,revealChat,startExample,validateWorkingFolder,setDisplayTask,
    attach(items,{focus=true}={}){if(!scopeAvailable||quickBlocked())return [];const existing=new Set(model.session(activeWorkspace).items.map(i=>i.id));if(existing.size+new Set(items.filter(i=>!existing.has(i.id)).map(i=>i.id)).size>24){status.textContent='Remove unused sources before adding this selection.';return [];}const added=[];for(const item of items){if(add(item))added.push(model.session(activeWorkspace).items.find(entry=>entry.id===item.id));}if(focus)openQuick();return added.filter(Boolean);},
    inspect(item){inspectInput(item,'Attached input');},toggleInputs(){const panel=$('.ai-context-sources',content);panel.open=!panel.open;panel.hidden=!panel.open;return panel.open;},removeInputs(ids){for(const id of ids)model.remove(activeWorkspace,id);persist();render();},current:()=>model.session(activeWorkspace),workingFolder:()=>model.workingFolder(activeWorkspace),automaticInputs,
    notify(text){status.textContent=text;},stopVoice(reason='Microphone stopped.'){voice?.stop(reason);},
    taskActive:()=>taskOngoing(currentDisplayTask()),
    consumeDraft(value,{workspace=activeWorkspace,chatId=model.session(workspace).id}={}){if(workspace!==activeWorkspace||model.session(workspace).id!==chatId||prompt.value!==value)return false;model.draft(workspace,'',chatId);prompt.value='';send.disabled=true;persist();return true;},
    createTurn(request,response,context={}){const session=model.session(activeWorkspace),turn=model.exchange(activeWorkspace,request,response,context);if(!turn)return null;recordInputs(turn,session.id);model.draft(activeWorkspace,prompt.value);persist();render();status.textContent='';speakTurn(turn);return turn;},
    updateTurn(workspace,chatId,turnId,response){if(workspace!==activeWorkspace||model.session(workspace).id!==chatId)return null;const turn=model.reply(workspace,turnId,response,chatId);if(turn){persist();render();if(['question','result','review'].includes(turn.presentation))speakTurn(turn);}return turn;},
    setAction(workspace,chatId,turnId,value){const turn=model.action(workspace,turnId,value,chatId);if(turn){persist();render();}return turn;},mode:()=>model.session(activeWorkspace).mode,setMode,snapshot:()=>model.snapshot(),merge(value){model.load(value,{preserveSelection:activeWorkspace});signature='';render();if(document.activeElement!==prompt)prompt.value=model.session(activeWorkspace).draft;send.disabled=!scopeAvailable||!prompt.value.trim()||model.session(activeWorkspace).turns.length>=60;}};
  // Voice never owns a separate conversation or bypasses the normal request
  // handlers. Only preferences are saved; microphone activation is tab-local.
  function voiceContext(){
    const permission=globalThis.SpatialDisplayRoleBridge?.displayControl?.();
    return JSON.stringify([activeWorkspace,currentProject(),model.session(activeWorkspace).id,permission?.contextKey||'',desktopPages.current?.(activeWorkspace)??0]);
  }
  function voiceDraft(value){
    prompt.value=value;model.draft(activeWorkspace,value);send.disabled=!scopeAvailable||!value.trim()||model.session(activeWorkspace).turns.length>=60;persist();renderNative(model.session(activeWorkspace));
  }
  function speakTurn(turn){
    if(!voice||!turn||turn.example||turn.action||!conversationVisible()||quickBlocked())return;
    if(turn.presentation&&!['question','result','review'].includes(turn.presentation))return;
    voice.speak([turn.title,turn.text].filter(Boolean).join('. '),turn.id+':'+turn.title+':'+turn.text);
  }
  function syncVoiceContext(){
    if(!voice)return;const context=voiceContext();if(context!==voiceContextOwner){voiceContextOwner=context;voiceNotice='';voiceManualBase='';voiceManualText='';}voice.setContext(context);
    if(voiceWorkspace!==activeWorkspace){
      voiceWorkspace=activeWorkspace;voiceNotice='';voiceManualBase='';voiceManualText='';
      const saved=readDesktopStorage('spatial-assistant-voice-v1',{}),preference=saved&&typeof saved==='object'?saved[activeWorkspace]:null;
      voice.setMode(['manual','wake','continuous'].includes(preference?.mode)?preference.mode:'manual');
      voice.setReadAloud(preference?.readAloud===true);
    }
    renderVoice(voice.state());
  }
  function saveVoicePreference(){
    const saved=readDesktopStorage('spatial-assistant-voice-v1',{}),preferences=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
    const state=voice.state();preferences[activeWorkspace]={mode:state.mode,readAloud:state.readAloud};
    try{desktopStorage.setItem('spatial-assistant-voice-v1',JSON.stringify(preferences));}catch{voiceNotice='Voice preferences could not be saved.';}
    renderVoice(state);
  }
  function renderVoice(state){
    const mic=$('#aiVoiceMic'),mode=$('#aiVoiceMode'),read=$('#aiVoiceReadAloud'),message=$('#aiVoiceStatus'),preview=$('#aiVoiceTranscript');
    if(!mic||!mode||!read||!message||!preview)return;
    mic.disabled=!scopeAvailable||!state.supported||state.installing===true||state.mode==='wake'&&!state.wakeSupported;
    mic.setAttribute('aria-pressed',String(state.active));mic.setAttribute('aria-label',state.active?'Mute voice input':'Start voice input');
    mic.title=state.active?'Stop listening':!state.supported?'Voice input is unavailable in this browser':state.mode==='wake'&&!state.wakeSupported?'Wake phrase needs on-device speech recognition':'Start '+({manual:'dictation',wake:'wake phrase listening',continuous:'continuous conversation'}[state.mode]||'voice input');
    const caption=mic.querySelector('span');if(caption)caption.textContent=state.active?'Mute':'Speak';
    mode.value=state.mode;mode.disabled=state.installing===true;const install=$('#aiVoiceInstallPack');if(install){install.hidden=state.mode!=='wake'||!state.wakeInstallSupported||state.wakePackAvailable===true;install.disabled=state.installing===true;install.textContent=state.installing?'Installing…':'Install English pack';}const wake=mode.querySelector('option[value="wake"]');if(wake){wake.disabled=!state.wakeSupported;wake.textContent=state.wakeSupported?'Wake phrase':'Wake phrase · unavailable';}
    read.checked=state.readAloud;read.disabled=!state.synthesisSupported;
    $('#aiVoiceStopSpeech').hidden=!state.speaking;
    $('#aiVoiceModeHint').textContent=!state.supported?'Voice input is unavailable in this browser. You can still type.':state.mode==='manual'?'Dictate in English, then review and send the message.':state.mode==='wake'?'Say “Hey Assistant”, followed by a request in English. Each request sends after a pause. On-device recognition and an installed English language pack are required. Use Install English pack when available, then press Speak.':'Speak in English without an activation phrase. Each message sends automatically after a pause. Say “Stop listening” to mute.';
    $('#aiVoiceProcessing').textContent=state.mode==='wake'?'Wake phrase is processed on this device. This browser must support on-device recognition and have the English language pack installed. Assistant replies remain scripted.':'Your browser transcribes speech and may send audio to its online recognition service. Voice activates only when you press Speak. Assistant replies remain scripted.'+(!state.wakeSupported?' Wake phrase is unavailable here because this browser does not support on-device recognition.':'');
    message.textContent=voiceNotice||state.status||'';
    message.hidden=!message.textContent||!state.active&&!state.speaking&&!state.installing&&!state.error&&!voiceNotice;
    area.dataset.voiceActive=String(state.active);area.dataset.voiceSpeaking=String(state.speaking);
    if(state.error&&state.mode!=='manual'&&state.transcript){preview.textContent=state.transcript;preview.hidden=false;}
    else if(!state.active){preview.hidden=true;preview.textContent='';}
  }
  function initializeVoice(){
    const factory=globalThis.SpatialAssistantVoice;if(!factory?.create)return;
    voice=factory.create({environment:window,lang:'en-US',getContext:voiceContext,
      canSend:()=>scopeAvailable&&conversationVisible()&&!quickBlocked(),
      onState:state=>renderVoice(state),
      onTranscript(text,{final,mode}){
        const preview=$('#aiVoiceTranscript');preview.textContent=text;preview.hidden=!text||mode==='manual';
        if(mode!=='manual')return;
        const prior=voiceManualBase+(voiceManualBase&&voiceManualText?' ':'')+voiceManualText;
        if(prompt.value!==prior){voice.stop('Microphone stopped because the draft changed.');return;}
        voiceManualText=String(text||'');voiceDraft((voiceManualBase+(voiceManualBase&&voiceManualText?' ':'')+voiceManualText).slice(0,4000));
      },
      async onSubmit(text){
        const captured=voiceContext(),workspace=activeWorkspace,chatId=model.session(workspace).id;
        const isCurrent=()=>captured===voiceContext()&&scopeAvailable&&conversationVisible()&&!quickBlocked();
        if(!isCurrent()||prompt.value.trim())return false;
        voiceDraft(String(text||'').slice(0,4000));
        const handled=await globalThis.SpatialAssistantDesktop?.submitVoiceRequest?.(prompt.value.trim(),{workspace,chatId,isCurrent});
        if(handled!==null&&handled!==undefined)return handled===true;
        if(!isCurrent())return false;return submitRequest();
      }
    });
    $('#aiVoiceMic').addEventListener('click',async()=>{
      syncVoiceContext();voiceNotice='';
      if(voice.state().active){voice.stop('Microphone muted.',{keepSpeech:true});return;}
      if(!scopeAvailable||!conversationVisible()||quickBlocked())return;
      if(voice.state().mode!=='manual'&&prompt.value.trim()){
        voiceNotice='Send or clear your draft before starting automatic voice input.';renderVoice(voice.state());return;
      }
      voiceManualBase=prompt.value;voiceManualText='';await voice.start(voice.state().mode);
    });
    $('#aiVoiceMode').addEventListener('change',()=>{voiceNotice='';voice.setMode($('#aiVoiceMode').value);saveVoicePreference();});
    $('#aiVoiceReadAloud').addEventListener('change',()=>{voiceNotice='';voice.setReadAloud($('#aiVoiceReadAloud').checked);saveVoicePreference();});
    $('#aiVoiceStopSpeech').addEventListener('click',()=>voice.stopSpeaking());
    $('#aiVoiceInstallPack')?.addEventListener('click',async()=>{voiceNotice='';await voice.installWakePack?.();});
    window.addEventListener('pagehide',()=>voice.stop('Voice stopped because the page closed.'));
    syncVoiceContext();
  }
  initializeVoice();
  window.addEventListener('spatial-panels-ready',()=>{renderNative(model.session(activeWorkspace));render();});
  if(typeof updateDesktopPageUi==='function'){const update=updateDesktopPageUi;updateDesktopPageUi=function(...args){const result=update(...args);render();return result;};}
  render();
})();
