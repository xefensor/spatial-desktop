/* Supporting displays share their windows and tools. The mode decides whether
   the user or Assistant is allowed to operate the display's app windows. */
(function(root){
  'use strict';
  const zone=document.querySelector('.workspace-zone');if(!zone)return;
  const host=document.createElement('section');host.className='display-workbench';host.hidden=true;host.setAttribute('aria-label','Display workspace');
  host.innerHTML=`
    <aside class="display-workbench-panel material-surface-glass" aria-label="Supporting display tools">
      <div class="display-workbench-context"><div><b data-display-title></b><small data-display-scope></small></div><button type="button" class="surface-key" data-display-action="settings" aria-label="Open Display settings" title="Display settings"><svg aria-hidden="true"><use href="#i-settings"/></svg></button></div>
      <section class="display-mode-controls" aria-label="Who controls this display">
        <p data-display-mode-description></p>
        <button type="button" class="surface-key display-mode-switch" data-display-action="mode"></button>
      </section>
      <section class="display-assistant-control" data-display-control hidden aria-label="Assistant display control">
        <div class="display-control-heading"><span class="display-control-indicator" aria-hidden="true"></span><strong data-display-control-status role="status" aria-live="polite"></strong><button type="button" class="surface-key" data-display-action="takeover">Take over</button><button type="button" class="surface-key" data-display-action="resume" hidden>Continue</button></div>
        <p class="display-control-summary" data-display-task-summary></p>
        <details class="display-local-tasks"><summary>Try a local task</summary><p>These demo actions open real windows here. Native AI control comes later.</p><div><button type="button" class="surface-key" data-display-action="task-briefing">Prepare briefing</button><button type="button" class="surface-key" data-display-action="task-image">Show a reference image</button></div></details>
      </section>
      <nav class="display-tool-tabs" role="tablist" aria-label="Display tools"><button type="button" class="nav-choice" role="tab" data-display-action="chat" id="displayChatTab" aria-controls="displayChatTools">Chat</button><button type="button" class="nav-choice" role="tab" data-display-action="references" id="displayReferencesTab" aria-controls="displayReferenceTools">References</button></nav>
      <div class="display-side-tools" data-display-side id="displayReferenceTools" role="tabpanel" aria-labelledby="displayReferencesTab"></div>
      <div class="display-assistant-tools" data-display-assistant id="displayChatTools" role="tabpanel" aria-labelledby="displayChatTab" hidden>
        <nav class="display-canvas-actions" aria-label="Assistant workspace tools"><button type="button" class="surface-key" data-display-action="files">Open files</button><button type="button" class="surface-key" data-display-action="note">New note</button><button type="button" class="surface-key" data-display-action="selection" title="Attach selected text or files from a window here">Use selection</button></nav>
        <div class="display-assistant-chat" role="region" aria-label="Assistant chat"></div>
      </div>
      <details class="display-workbench-section display-parked-windows" data-display-parked hidden><summary>Parked here <span data-display-parked-count></span></summary><div class="display-parked-list" data-display-parked-list></div></details>
      <section class="display-clock" data-display-clock-section aria-label="Clock"><time data-display-clock></time><span data-display-date></span></section>
      <p class="display-workbench-status" role="status" data-display-feedback></p>
    </aside>
    <section class="display-workbench-empty" aria-label="Start on this display"><svg aria-hidden="true"><use href="#i-monitor"/></svg><b data-display-empty-title></b><p data-display-empty-text></p><div class="display-empty-actions"><button type="button" class="surface-key" data-display-action="files">Open workspace files</button><button type="button" class="surface-key" data-display-action="note">New note here</button><button type="button" class="surface-key" data-display-action="briefing">Workspace briefing</button></div></section>`;
  zone.append(host);
  const find=selector=>host.querySelector(selector),bridge=()=>root.SpatialDisplayRoleBridge;
  const context=state=>[state?.setupKey,state?.workspaceId,state?.localSlot,state?.role].join('|');
  const spaceKey=state=>[state?.setupKey,state?.workspaceId,state?.localSlot].join('|');
  const special=state=>state&&(state.role==='side'||state.role==='assistant');
  const tools=new Map();
  let currentKey='',parkedKey='',clockTimer=0,chatMounted=false,sideMounted=false,selection=null,visibleTool='';
  function tool(state){return tools.get(spaceKey(state))||(state.role==='assistant'?'chat':'references');}
  function selectTool(name,{focus=false}={}){
    const state=bridge()?.state();if(!special(state)||context(state)!==currentKey||!['chat','references'].includes(name))return false;
    tools.set(spaceKey(state),name);refresh();
    if(focus)find('[data-display-action="'+name+'"]').focus?.({preventScroll:true});return true;
  }
  function renderParked(state){
    const windows=state.parkedWindows||[],key=JSON.stringify(windows.map(window=>[window.id,window.label,window.title]));
    find('[data-display-parked]').hidden=!windows.length;find('[data-display-parked-count]').textContent=String(windows.length);
    if(key===parkedKey)return;parkedKey=key;
    find('[data-display-parked-list]').replaceChildren(...windows.map(window=>{const button=document.createElement('button');button.type='button';button.className='surface-key display-parked-restore';button.dataset.displayWindow=window.id;button.textContent='Restore '+(window.title||window.label||window.id);return button;}));
  }
  function renderControl(state){
    const assistant=state.role==='assistant',task=state.space?.assistant||{},user=task.control==='user'||task.status==='paused';
    find('[data-display-mode-description]').textContent=assistant?'Assistant may work with every window on this display.':'You control this space. Keep references here or hand it to Assistant.';
    find('[data-display-action="mode"]').textContent=assistant?'Use as Side space':'Let Assistant work here';
    find('[data-display-control]').hidden=!assistant;
    const status=user?'You’re in control':task.status==='working'?'Working':task.status==='needs-you'||task.status==='error'?'Needs your input':'Ready';
    find('[data-display-control-status]').textContent=status;
    find('[data-display-control]').dataset.control=user?'user':task.status==='working'?'working':'assistant';
    find('[data-display-action="takeover"]').hidden=user;find('[data-display-action="resume"]').hidden=!user;
    for(const name of ['task-briefing','task-image'])find('[data-display-action="'+name+'"]').disabled=user||task.status==='working';
    const summary=find('[data-display-task-summary]');summary.textContent=task.result||task.task||'';summary.hidden=!summary.textContent;
  }
  function time(){const now=new Date();find('[data-display-clock]').textContent=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});find('[data-display-clock]').dateTime=now.toISOString();find('[data-display-date]').textContent=now.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});}
  function refresh(){
    const state=bridge()?.state(),key=context(state),changed=key!==currentKey;
    if(!special(state)&&chatMounted){root.SpatialAIDesktop?.unmountDisplay();chatMounted=false;}
    host.hidden=!special(state);if(host.hidden){clearInterval(clockTimer);clockTimer=0;currentKey=key;visibleTool='';return;}
    if(changed){selection=null;find('[data-display-feedback]').textContent='';}currentKey=key;
    host.dataset.displayRole=state.role;find('[data-display-title]').textContent=state.role==='assistant'?'Assistant':'Side space';find('[data-display-scope]').textContent=state.workspace+' · Display '+state.localSlot;
    visibleTool=tool(state);tools.set(spaceKey(state),visibleTool);host.dataset.displayTool=visibleTool;
    find('[data-display-side]').hidden=visibleTool!=='references';find('[data-display-assistant]').hidden=visibleTool!=='chat';
    for(const name of ['chat','references']){const button=find('[data-display-action="'+name+'"]'),selected=name===visibleTool;button.setAttribute('aria-selected',String(selected));button.setAttribute('tabindex',selected?'0':'-1');button.classList?.toggle('is-active',selected);}
    if(!chatMounted)chatMounted=Boolean(root.SpatialAIDesktop?.mountDisplay(find('.display-assistant-chat')));
    else if(changed)root.SpatialAIDesktop?.render();
    if(!sideMounted&&root.SpatialDisplaySideTools){root.SpatialDisplaySideTools.mount(find('[data-display-side]'));sideMounted=true;}
    root.SpatialDisplaySideTools?.refresh(state);
    renderControl(state);renderParked(state);
    find('[data-display-empty-title]').textContent=state.role==='assistant'?'Assistant’s working space':'Keep your references in view';
    find('[data-display-empty-text]').textContent=state.role==='assistant'?'Give Assistant a task in chat, or try a local task. Open files and notes here; take over whenever you want to work with a window yourself.':'Open a pinned reference or start a note. Windows stay here as you switch desktops and Projects. You can hand this same space to Assistant.';
    find('.display-workbench-empty').hidden=Boolean(state.localWindows?.length);
    find('[data-display-clock-section]').hidden=visibleTool!=='references';
    if(visibleTool==='references'&&!clockTimer){time();clockTimer=setInterval(time,30000);}if(visibleTool!=='references'){clearInterval(clockTimer);clockTimer=0;}
    if(typeof prepareControlSemantics==='function')prepareControlSemantics(host);
  }
  host.addEventListener('pointerdown',event=>{
    if(event.target.closest('[data-display-action="selection"]')){const state=bridge()?.state();selection=special(state)&&visibleTool==='chat'?{key:context(state),items:root.SpatialAssistantDesktop?.capture()||[]}:null;}
  });
  host.addEventListener('keydown',event=>{
    const tab=event.target.closest('[role="tab"]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();selectTool(event.key==='Home'?'chat':event.key==='End'?'references':visibleTool==='chat'?'references':'chat',{focus:true});
  });
  host.addEventListener('click',event=>{
    const state=bridge()?.state();if(host.hidden||!special(state)||context(state)!==currentKey)return;
    const parked=event.target.closest('[data-display-window]');if(parked){bridge()?.openWindow(parked.dataset.displayWindow);return;}
    const action=event.target.closest('[data-display-action]')?.dataset.displayAction;if(!action)return;
    if(['files','note','selection'].includes(action)&&event.target.closest('[data-display-assistant]')&&visibleTool!=='chat')return;
    try{
      if(action==='settings'){bridge().openDisplays(state.localSlot);return;}
      if(action==='chat'||action==='references'){selectTool(action);return;}
      if(action==='mode'){bridge().setRole(state.localSlot,state.role==='assistant'?'side':'assistant');return;}
      if(action==='takeover'||action==='resume'){if(state.role==='assistant')bridge().assistantControl(action==='takeover'?'takeover':'resume');return;}
      if(action==='task-briefing'||action==='task-image'){if(state.role==='assistant')bridge().runAssistantTask(action==='task-image'?'image':'briefing');return;}
      if(action==='files')bridge().openFolder(visibleTool==='chat'?(root.SpatialAIDesktop?.workingFolder?.()||state.home):state.home);
      if(action==='note')bridge().launchNote('Untitled note','');
      if(action==='selection'&&visibleTool==='chat'){
        const items=selection?.key===context(state)?selection.items:[];selection=null;
        if(items.length)root.SpatialAIDesktop?.attach(items);else root.SpatialAIDesktop?.notify('Select text or files in a window here, then choose Use selection.');
      }
      if(action==='briefing'){
        const text=[state.workspace+' — Workspace briefing','','Open on this display',...(state.localWindows?.length?state.localWindows.map(window=>'• '+window.label):['• No windows yet']),'','Workspace Home: '+state.home,'','Notes','','Write your next steps here. This note uses the current Workspace context; it does not inspect document contents.'].join('\n');
        bridge().launchNote('Workspace briefing',text);
      }
    }catch(error){find('[data-display-feedback]').textContent=error.message||'This action could not complete.';}
  });
  root.addEventListener('spatial-display-role-change',refresh);
  root.addEventListener('spatial-assistant-display-reveal',event=>{const state=bridge()?.state();if(event.detail?.workspace&&event.detail.workspace!==state?.workspaceId)return;selectTool('chat');});
  root.addEventListener('pagehide',()=>{clearInterval(clockTimer);clockTimer=0;root.SpatialAIDesktop?.unmountDisplay();chatMounted=false;selection=null;});
  root.addEventListener('pageshow',refresh);
  root.SpatialDisplayWorkbench={refresh,selectTool};refresh();
})(window);
