/* A visible, Workspace-scoped home for supporting displays. Assistant work is
   a local scripted demonstration; real background computer control is future work. */
(function(root){
  'use strict';
  const zone=document.querySelector('.workspace-zone');
  if(!zone)return;
  const host=document.createElement('section');
  host.className='display-workbench';
  host.hidden=true;
  host.setAttribute('aria-label','Display workspace');
  host.innerHTML=`
    <header class="display-workbench-bar material-surface-glass">
      <svg aria-hidden="true"><use href="#i-monitor"/></svg>
      <div class="display-workbench-identity"><b data-display-title></b><small data-display-scope></small></div>
      <button type="button" class="surface-key" data-display-action="settings" aria-label="Open Display settings"><svg aria-hidden="true"><use href="#i-settings"/></svg><span>Display settings</span></button>
    </header>
    <aside class="display-workbench-panel material-surface-glass" aria-label="Supporting display tools">
      <div class="display-side-tools" data-display-side>
        <section class="display-workbench-section">
          <h2>Folders</h2>
          <nav class="display-folder-shortcuts" aria-label="Workspace folders">
            <button type="button" class="surface-key" data-display-folder="home"><svg aria-hidden="true"><use href="#i-folder"/></svg>Workspace Home</button>
            <button type="button" class="surface-key" data-display-folder="documents"><svg aria-hidden="true"><use href="#i-folder"/></svg>Documents</button>
            <button type="button" class="surface-key" data-display-folder="downloads"><svg aria-hidden="true"><use href="#i-folder"/></svg>Downloads</button>
          </nav>
        </section>
        <section class="display-workbench-section display-side-note">
          <label for="displaySideNote">Workspace note <span>Saved here</span></label>
          <textarea id="displaySideNote" rows="5" maxlength="8000" placeholder="Keep a reference, reminder or next step here…" spellcheck="true"></textarea>
        </section>
        <section class="display-workbench-section display-clock" aria-label="Clock"><time data-display-clock></time><span data-display-date></span></section>
        <p class="display-role-explanation">Stays here across desktops and Projects. Switching Workspace restores its own side space.</p>
      </div>
      <div class="display-assistant-tools" data-display-assistant hidden>
        <section class="display-workbench-section">
          <h2>Assistant workspace</h2>
          <p>Let Assistant prepare something alongside your work.</p>
          <p class="display-assistant-status" role="status" aria-live="polite"><i aria-hidden="true"></i><b data-display-status>Ready</b></p>
          <label for="displayAssistantTask">Demo task</label>
          <input id="displayAssistantTask" type="text" value="Prepare a Workspace briefing" readonly>
          <p class="display-assistant-progress" data-display-progress></p>
          <div class="display-assistant-actions">
            <button type="button" class="surface-key display-role-primary" data-display-action="run">Run demo task</button>
            <button type="button" class="surface-key" data-display-action="pause" hidden>Pause</button>
            <button type="button" class="surface-key" data-display-action="takeover" hidden>Take over</button>
            <button type="button" class="surface-key display-role-primary" data-display-action="resume" hidden>Resume</button>
          </div>
        </section>
        <p class="display-role-explanation">Scripted local demo. Assistant opens a real demo Note Editor here. Your mouse and keyboard stay under your control.</p>
        <p class="display-role-explanation">Each Workspace has its own Assistant space. Tasks pause when you leave this display role or Workspace.</p>
      </div>
    </aside>
    <div class="display-workbench-empty" aria-hidden="true"><svg><use href="#i-monitor"/></svg><b data-display-empty-title></b><p data-display-empty-text></p></div>`;
  zone.append(host);
  const find=selector=>host.querySelector(selector);
  const controls=action=>find('[data-display-action="'+action+'"]');
  const bridge=()=>root.SpatialDisplayRoleBridge;
  const context=state=>[state.setupKey,state.workspaceId,state.localSlot,state.role].join('|');
  const special=state=>state&&(state.role==='side'||state.role==='assistant');
  let currentKey='',job=null,clockTimer=0,updating=false;
  function time(){
    const now=new Date();
    find('[data-display-clock]').textContent=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
    find('[data-display-clock]').dateTime=now.toISOString();
    find('[data-display-date]').textContent=now.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});
  }
  function stopJob(){if(job?.timer)clearTimeout(job.timer);job=null;}
  function writeAssistant(patch){
    const state=bridge()?.state();
    if(!state||state.role!=='assistant')return;
    bridge().updateSpace({assistant:{...(state.space?.assistant||{}),...patch}});
    refresh();
  }
  function stateMatches(jobState){const state=bridge()?.state();return Boolean(jobState&&state?.role==='assistant'&&context(state)===jobState.key&&job===jobState);}
  function schedule(jobState){
    if(!stateMatches(jobState)||jobState.paused)return;
    jobState.timer=setTimeout(()=>{
      jobState.timer=0;
      if(!stateMatches(jobState)||jobState.paused)return;
      jobState.step++;
      if(jobState.step<3){
        writeAssistant({status:'working',result:jobState.step===1?'Gathering the current Workspace context…':'Preparing a short briefing in Note Editor…'});
        schedule(jobState);
        return;
      }
      const state=bridge().state();
      const names=(state.localWindows||[]).map(window=>window.label).filter(Boolean);
      const briefing=[state.workspace+' — Workspace briefing','','Prepared in the Assistant display.','','Current context',
        '• Workspace: '+state.workspace,
        '• Open here: '+(names.length?names.join(', '):'No windows yet'),
        '• Your work on the main display is unchanged.','','Suggested next steps',
        '• Open the files you want to work with.',
        '• Add a specific task in Assistant.',
        '• Review the result before using it.','','This briefing is a scripted local demonstration. It does not inspect real files or control your operating system.'].join('\n');
      try{
        if(!stateMatches(jobState))return;
        if(!bridge().launchNote('Workspace briefing',briefing))throw new Error('Note Editor could not open');
        if(!stateMatches(jobState))return;
        job=null;
        writeAssistant({status:'done',result:'Workspace briefing is open here in Note Editor. You can review and edit it.'});
      }catch(error){
        jobState.paused=true;
        writeAssistant({status:'needs-you',result:'The briefing could not open. Resume to try again.'});
      }
    },jobState.step===0?1300:1600);
  }
  function run(){
    const state=bridge()?.state();if(state?.role!=='assistant')return;
    stopJob();
    job={key:context(state),step:0,paused:false,timer:0};
    writeAssistant({status:'working',task:'Prepare a Workspace briefing',result:'Starting the local Workspace briefing demo…'});
    schedule(job);
  }
  function pause(takeover=false){
    const state=bridge()?.state();if(state?.role!=='assistant')return;
    if(job?.timer)clearTimeout(job.timer);
    if(!job)job={key:context(state),step:0,timer:0};
    job.paused=true;
    writeAssistant({status:takeover?'needs-you':'paused',result:takeover?'You have control. Resume when you are ready.':'Demo task paused. Resume to continue.'});
  }
  function resume(){
    const state=bridge()?.state();if(state?.role!=='assistant')return;
    if(!job||job.key!==context(state))job={key:context(state),step:0,timer:0};
    job.paused=false;
    writeAssistant({status:'working',result:'Continuing the Workspace briefing demo…'});
    schedule(job);
  }
  function refresh(){
    const state=bridge()?.state();
    if(!state){host.hidden=true;return;}
    const key=context(state),changed=key!==currentKey;
    if(changed){
      stopJob();currentKey=key;
      if(state.role==='assistant'&&state.space?.assistant?.status==='working'&&!updating){
        updating=true;
        bridge().updateSpace({assistant:{...state.space.assistant,status:'paused',result:'Task paused when you left this space. Resume to continue.'}});
        updating=false;
        return refresh();
      }
    }
    host.hidden=!special(state);
    if(host.hidden){clearInterval(clockTimer);clockTimer=0;return;}
    const assistant=state.role==='assistant',a=state.space?.assistant||{},status=a.status||'idle';
    if(job&&status!=='working'){
      if(job.timer)clearTimeout(job.timer);
      job.timer=0;job.paused=true;
    }
    host.dataset.displayRole=state.role;
    host.dataset.assistantStatus=status;
    find('[data-display-title]').textContent=assistant?'Assistant display':'Side space';
    find('[data-display-scope]').textContent=state.workspace+' · '+(state.displays?.find(display=>display.slot===state.localSlot)?.label||'Supporting display');
    find('[data-display-side]').hidden=assistant;
    find('[data-display-assistant]').hidden=!assistant;
    find('[data-display-empty-title]').textContent=assistant?'Room for Assistant to work':'Keep things alongside your work';
    find('[data-display-empty-text]').textContent=assistant?'Run the demo task to open a briefing here. To move an existing window here, use its title-bar menu → Move to… → Displays.':'Move a window here using its title-bar menu → Move to… → Displays. It stays while you switch desktops and Projects.';
    find('.display-workbench-empty').hidden=Boolean(state.localWindows?.length);
    const note=find('#displaySideNote');
    if((changed||document.activeElement!==note)&&note.value!==(state.space?.note||''))note.value=state.space?.note||'';
    find('[data-display-status]').textContent=({idle:'Ready',working:'Working','needs-you':'Needs you',paused:'Needs you',done:'Done',error:'Needs you'})[status]||'Ready';
    find('[data-display-progress]').textContent=a.result||'Try a short task to see how Assistant can use its own display.';
    controls('run').hidden=status==='working'||['needs-you','paused','error'].includes(status);
    controls('run').textContent=status==='done'?'Run demo again':'Run demo task';
    controls('pause').hidden=status!=='working';
    controls('takeover').hidden=status!=='working';
    controls('resume').hidden=!['needs-you','paused','error'].includes(status);
    if(!assistant&&!clockTimer){time();clockTimer=setInterval(time,30000);}
    if(assistant){clearInterval(clockTimer);clockTimer=0;}
    if(typeof prepareControlSemantics==='function')prepareControlSemantics(host);
  }
  host.addEventListener('click',event=>{
    const folder=event.target.closest('[data-display-folder]');
    if(folder){
      const state=bridge()?.state(),home=state?.home;
      const base=(typeof home==='string'?home:home?.root||home?.path||'').replace(/\/$/,'');
      const kind=folder.dataset.displayFolder;
      const path=kind==='home'?base:((typeof home==='object'&&home?.[kind])||base+'/'+(kind==='documents'?'Documents':'Downloads'));
      if(base)bridge().openFolder(path);
      return;
    }
    const action=event.target.closest('[data-display-action]')?.dataset.displayAction;
    if(action==='settings')bridge()?.openDisplays();
    if(action==='run')run();
    if(action==='pause')pause();
    if(action==='takeover')pause(true);
    if(action==='resume')resume();
  });
  find('#displaySideNote').addEventListener('input',event=>{
    const state=bridge()?.state();if(state?.role!=='side')return;
    const note=event.target.value.slice(0,8000);
    if(event.target.value!==note)event.target.value=note;
    bridge().updateSpace({note});
  });
  root.addEventListener('spatial-display-role-change',refresh);
  root.addEventListener('pagehide',()=>{stopJob();clearInterval(clockTimer);clockTimer=0;});
  root.SpatialDisplayWorkbench={refresh};
  refresh();
})(window);
