/* Display control lives in the normal Assistant Area. Side space supplies a
   scoped display permission; chat, sources and task progress keep one owner. */
(function(root){
  'use strict';
  const area=document.querySelector('[data-area-window="ai"]'),content=area?.querySelector('.ai-content');if(!content)return;
  const host=document.createElement('section');host.className='ai-display-controls';host.hidden=true;host.setAttribute('aria-label','Assistant display control');
  host.innerHTML=`
    <section class="display-assistant-control" data-display-control>
      <label class="display-assistant-permission"><input type="checkbox" role="switch" data-display-assistant-allowed aria-describedby="displayAssistantPermissionScope"><span>Allow Assistant to use this display</span></label>
      <small class="display-permission-scope" id="displayAssistantPermissionScope" data-display-permission-scope></small>
      <div class="display-control-heading"><span class="display-control-indicator" aria-hidden="true"></span><strong data-display-control-status role="status" aria-live="polite"></strong><button type="button" class="surface-key" data-display-action="takeover">Take over</button><button type="button" class="surface-key" data-display-action="resume" hidden>Continue</button><button type="button" class="surface-key" data-display-action="examples">Examples</button></div>
    </section>
    <section class="display-assistant-examples" data-display-examples hidden aria-labelledby="displayExamplesHeading"><div class="display-examples-heading"><button type="button" class="surface-key" data-display-action="examples-back">← Back to chat</button><h2 id="displayExamplesHeading">Assistant examples</h2></div><p class="display-examples-intro">Follow a file task from start to saved result. Each example starts a new chat.</p><p class="display-examples-local">Scripted examples · no AI service connected</p><div class="display-examples-access" data-display-examples-access hidden><p data-display-examples-access-text></p><button type="button" class="surface-key" data-display-action="examples-delegate">Allow Assistant</button></div><div class="display-examples-list" data-display-examples-list></div></section>
    <p class="display-assistant-feedback" role="status" data-display-feedback></p>`;
  content.insertBefore(host,content.firstChild);
  const menu=document.createElement('div');menu.className='ai-display-tools';menu.hidden=true;
  menu.innerHTML='<button type="button" class="surface-key" data-display-action="selection">Use selection</button><button type="button" class="surface-key" data-display-action="note">New note here</button><button type="button" class="surface-key" data-display-action="working-folder">Open working folder</button><button type="button" class="surface-key" data-display-action="settings">Display settings</button>';
  content.querySelector('.ai-chat-settings-body')?.append(menu);
  const find=selector=>host.querySelector(selector),bridge=()=>root.SpatialDisplayRoleBridge;
  const context=state=>[state?.setupKey,state?.workspaceId,state?.localSlot,state?.role].join('|');
  const available=state=>state?.role==='side';
  const allowed=state=>Boolean(state?.space?.assistant?.allowed);
  let currentKey='',examplesOpen=false,examplesListKey='',selection=null,permissionBusy=false;
  const interactive=()=>{for(let at=content;at;at=at.parentElement||at.parentNode)if(at.hidden||at.inert||at.getAttribute?.('aria-hidden')==='true'||(at===area&&(area.dataset.areaState==='rail'||area.classList.contains('is-on-other-display'))))return false;return true;};
  function showChat(){examplesOpen=false;content.dataset.displayExamples='closed';find('[data-display-examples]').hidden=true;host.dataset.displayExamples='closed';}
  function renderControl(state){
    const task=state.space?.assistant||{},permitted=allowed(state),user=!permitted||task.control==='user'||task.status==='paused';
    const input=find('[data-display-assistant-allowed]');input.checked=permitted;input.disabled=permissionBusy;
    find('[data-display-permission-scope]').textContent='Display '+state.localSlot+' · all windows here · '+state.workspace+' Workspace only';
    find('[data-display-control-status]').textContent=user?'You’re in control':task.status==='working'?'Working':task.status==='needs-you'||task.status==='error'?'Needs your input':'Ready';
    find('[data-display-control]').dataset.control=user?'user':task.status==='working'?'working':'assistant';
    find('[data-display-action="takeover"]').hidden=!permitted||user;find('[data-display-action="resume"]').hidden=!permitted||!user;
  }
  function renderExamples(state){
    host.dataset.displayExamples=examplesOpen?'open':'closed';content.dataset.displayExamples=examplesOpen?'open':'closed';find('[data-display-examples]').hidden=!examplesOpen;if(!examplesOpen)return;
    const task=state.space?.assistant||{},paused=task.control==='user'||task.status==='paused',working=task.status==='working'||['plan','source','question','output'].includes(task.activity?.stage),canRun=allowed(state)&&!paused&&!working;
    find('[data-display-examples-access]').hidden=canRun;find('[data-display-examples-access-text]').textContent=!allowed(state)?'Allow Assistant to run an example.':paused?'You’re in control. Choose Continue to let Assistant run an example.':'Assistant is working. Wait for this task to finish before starting another example.';
    find('[data-display-action="examples-delegate"]').hidden=allowed(state);
    const examples=bridge()?.assistantExamples?.()||[],key=JSON.stringify(examples);
    if(key!==examplesListKey){examplesListKey=key;find('[data-display-examples-list]').replaceChildren(...examples.map(example=>{
      const card=document.createElement('article');card.className='display-example-card';const title=document.createElement('h3');title.textContent=example.title;
      const outcome=document.createElement('p');outcome.className='display-example-outcome';outcome.textContent=example.outcome;
      const sample=document.createElement('small');sample.className='display-example-input';sample.textContent='Sample: '+example.input;
      const button=document.createElement('button');button.type='button';button.className='surface-key';button.dataset.displayExample=example.id;button.textContent='Run example';button.setAttribute('aria-label','Run example: '+example.title);card.append(title,outcome,sample,button);return card;
    }));}
    for(const button of find('[data-display-examples-list]').querySelectorAll('[data-display-example]'))button.disabled=!canRun;
  }
  function refresh(){
    const state=bridge()?.state(),key=context(state),changed=key!==currentKey;host.hidden=menu.hidden=!available(state);
    if(changed){showChat();selection=null;find('[data-display-feedback]').textContent='';}currentKey=key;
    root.SpatialAIDesktop?.setDisplayTask?.(available(state)?state:null);
    if(host.hidden)return;renderControl(state);renderExamples(state);
    if(typeof prepareControlSemantics==='function')prepareControlSemantics(host);
  }
  function setPermission(permitted){
    const state=bridge()?.state(),key=context(state);if(permissionBusy||!available(state)||key!==currentKey||!interactive())return;
    permissionBusy=true;renderControl(state);
    try{if(bridge().setAssistantAllowed(state.localSlot,permitted)===false)throw Error('Assistant access could not be changed.');}
    catch(error){if(context(bridge()?.state())===key)find('[data-display-feedback]').textContent=error.message||'Assistant access could not be changed.';}
    finally{permissionBusy=false;refresh();}
  }
  content.addEventListener('change',event=>{const input=event.target.closest('[data-display-assistant-allowed]');if(input)setPermission(Boolean(input.checked));});
  content.addEventListener('pointerdown',event=>{
    const opening=event.target.closest('.ai-chat-settings>summary');
    if(!opening&&!event.target.closest('[data-display-action="selection"]'))return;
    const state=bridge()?.state(),items=available(state)&&interactive()?root.SpatialAssistantDesktop?.capture()||[]:[];
    if(opening||items.length)selection=items.length?{key:context(state),items}:null;
  });
  content.addEventListener('keydown',event=>{if(event.key==='Escape'&&examplesOpen){event.preventDefault();event.stopPropagation();showChat();find('[data-display-action="examples"]').focus?.({preventScroll:true});}});
  content.addEventListener('click',event=>{
    const state=bridge()?.state();if(host.hidden||!available(state)||context(state)!==currentKey||!interactive())return;
    const example=event.target.closest('[data-display-example]');
    if(example){
      const task=state.space?.assistant||{};if(!examplesOpen||!allowed(state)||task.control==='user'||task.status==='paused'||task.status==='working'||['plan','source','question','output'].includes(task.activity?.stage))return;
      const id=example.dataset.displayExample;if(!(bridge().assistantExamples?.()||[]).some(item=>item.id===id))return;
      const key=context(state);showChat();try{Promise.resolve(bridge().runAssistantExample(id)).catch(error=>{if(context(bridge()?.state())===key)find('[data-display-feedback]').textContent=error.message||'This example could not complete.';});}catch(error){find('[data-display-feedback]').textContent=error.message||'This example could not complete.';}return;
    }
    const action=event.target.closest('[data-display-action]')?.dataset.displayAction;if(!action)return;
    const options=content.querySelector('.ai-chat-settings');if(options)options.open=false;
    try{
      if(action==='examples'){examplesOpen=true;renderExamples(state);find('[data-display-action="examples-back"]').focus?.({preventScroll:true});return;}
      if(action==='examples-back'){showChat();return;}
      if(action==='examples-delegate'){if(examplesOpen&&!allowed(state))setPermission(true);return;}
      if(action==='takeover'||action==='resume'){if(allowed(state))bridge().assistantControl(action==='takeover'?'takeover':'resume');return;}
      if(action==='settings'){bridge().openDisplays(state.localSlot);return;}
      if(action==='working-folder'){const folder=root.SpatialAIDesktop?.workingFolder?.()||state.home;root.SpatialAIDesktop?.validateWorkingFolder?.(folder,state.workspaceId);bridge().openFolder(folder);return;}
      if(action==='note'){bridge().launchNote('Untitled note','');return;}
      if(action==='selection'){
        const items=selection?.key===context(state)?selection.items:[];selection=null;showChat();
        if(items.length)root.SpatialAIDesktop?.attach(items);else root.SpatialAIDesktop?.notify('Select text or files in a window here, then choose Use selection.');
      }
    }catch(error){find('[data-display-feedback]').textContent=error.message||'This action could not complete.';}
  });
  root.addEventListener('spatial-display-role-change',refresh);root.addEventListener('spatial-ai-chat-change',refresh);
  root.addEventListener('spatial-assistant-display-reveal',event=>{const state=bridge()?.state();if(!event.detail?.workspace||event.detail.workspace===state?.workspaceId)showChat();});
  root.addEventListener('pagehide',()=>{selection=null;root.SpatialAIDesktop?.setDisplayTask?.(null);});root.addEventListener('pageshow',refresh);
  root.SpatialDisplayWorkbench={refresh,showChat};refresh();
})(window);
