/* Supporting displays host the same working tools as the rest of the desktop.
   Chat is shared with Assistant; every canvas action opens a real demo window. */
(function(root){
  'use strict';
  const zone=document.querySelector('.workspace-zone');if(!zone)return;
  const host=document.createElement('section');host.className='display-workbench';host.hidden=true;host.setAttribute('aria-label','Display workspace');
  host.innerHTML=`
    <aside class="display-workbench-panel material-surface-glass" aria-label="Supporting display tools">
      <div class="display-workbench-context"><div><b data-display-title></b><small data-display-scope></small></div><button type="button" class="surface-key" data-display-action="settings" aria-label="Open Display settings" title="Display settings"><svg aria-hidden="true"><use href="#i-settings"/></svg></button></div>
      <div class="display-side-tools" data-display-side></div>
      <div class="display-assistant-tools" data-display-assistant hidden>
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
  const special=state=>state&&(state.role==='side'||state.role==='assistant');
  let currentKey='',parkedKey='',clockTimer=0,chatMounted=false,sideMounted=false,selection=null;
  function renderParked(state){
    const windows=state.parkedWindows||[],key=JSON.stringify(windows.map(window=>[window.id,window.label,window.title]));
    find('[data-display-parked]').hidden=!windows.length;find('[data-display-parked-count]').textContent=String(windows.length);
    if(key===parkedKey)return;parkedKey=key;
    find('[data-display-parked-list]').replaceChildren(...windows.map(window=>{const button=document.createElement('button');button.type='button';button.className='surface-key display-parked-restore';button.dataset.displayWindow=window.id;button.textContent='Restore '+(window.title||window.label||window.id);return button;}));
  }
  function time(){const now=new Date();find('[data-display-clock]').textContent=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});find('[data-display-clock]').dateTime=now.toISOString();find('[data-display-date]').textContent=now.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});}
  function refresh(){
    const state=bridge()?.state(),key=context(state),changed=key!==currentKey,assistant=state?.role==='assistant';
    if(!assistant&&chatMounted){root.SpatialAIDesktop?.unmountDisplay();chatMounted=false;}
    host.hidden=!special(state);if(host.hidden){clearInterval(clockTimer);clockTimer=0;currentKey=key;return;}
    if(changed){selection=null;find('[data-display-feedback]').textContent='';}currentKey=key;
    host.dataset.displayRole=state.role;find('[data-display-title]').textContent=assistant?'Assistant':'Side space';find('[data-display-scope]').textContent=state.workspace+' · Display '+state.localSlot;
    find('[data-display-side]').hidden=assistant;find('[data-display-assistant]').hidden=!assistant;
    if(assistant){
      if(!chatMounted)chatMounted=Boolean(root.SpatialAIDesktop?.mountDisplay(find('.display-assistant-chat')));
      else if(changed)root.SpatialAIDesktop?.render();
    }else{
      if(!sideMounted&&root.SpatialDisplaySideTools){root.SpatialDisplaySideTools.mount(find('[data-display-side]'));sideMounted=true;}
      root.SpatialDisplaySideTools?.refresh(state);
    }
    renderParked(state);
    find('[data-display-empty-title]').textContent=assistant?'Room to work together':'Keep your references in view';
    find('[data-display-empty-text]').textContent=assistant?'Chat on the left, open files and notes here, then select text or files to use in your request. Replies are scripted locally; supported file conversions create real demo files.':'Open a pinned file, folder or web link from your shelf. Windows stay here while you switch desktops and Projects.';
    find('.display-workbench-empty').hidden=Boolean(state.localWindows?.length);
    find('[data-display-clock-section]').hidden=assistant;
    if(!assistant&&!clockTimer){time();clockTimer=setInterval(time,30000);}if(assistant){clearInterval(clockTimer);clockTimer=0;}
    if(typeof prepareControlSemantics==='function')prepareControlSemantics(host);
  }
  host.addEventListener('pointerdown',event=>{
    if(event.target.closest('[data-display-action="selection"]')){const state=bridge()?.state();selection=state?.role==='assistant'?{key:context(state),items:root.SpatialAssistantDesktop?.capture()||[]}:null;}
  });
  host.addEventListener('click',event=>{
    const state=bridge()?.state();if(host.hidden||!special(state)||context(state)!==currentKey)return;
    const parked=event.target.closest('[data-display-window]');if(parked){bridge()?.openWindow(parked.dataset.displayWindow);return;}
    const action=event.target.closest('[data-display-action]')?.dataset.displayAction;if(!action)return;
    try{
      if(action==='settings'){bridge().openDisplays(state.localSlot);return;}
      if(action==='files')bridge().openFolder(state.role==='assistant'?(root.SpatialAIDesktop?.workingFolder?.()||state.home):state.home);
      if(action==='note')bridge().launchNote('Untitled note','');
      if(action==='selection'&&state.role==='assistant'){
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
  root.addEventListener('pagehide',()=>{clearInterval(clockTimer);root.SpatialAIDesktop?.unmountDisplay();});
  root.SpatialDisplayWorkbench={refresh};refresh();
})(window);
