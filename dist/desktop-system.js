/* Stateful demo devices and session controls. No host hardware is changed. */
(function(root){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const networks=[
    {id:'home',name:'Home Wi-Fi',secure:true,detail:'Saved network'},
    {id:'studio',name:'Studio Wi-Fi',secure:true,detail:'Demo password: spatial-demo'},
    {id:'guest',name:'Guest Wi-Fi',secure:false,detail:'Open demo network'},
    {id:'weak',name:'Garden Wi-Fi',secure:false,detail:'Weak signal · first connection will fail'}
  ];
  const devices=[{id:'phone',name:'Phone',detail:'60% battery · notifications and files'},{id:'keyboard',name:'Wireless keyboard',detail:'Pairing code: 042731'},{id:'headphones',name:'Studio headphones',detail:'Headphones and microphone'}];
  const outputs=[{id:'speakers',name:'Desktop speakers'},{id:'headphones',name:'Studio headphones',bluetooth:true}];
  const inputs=[{id:'desktop-mic',name:'Desktop microphone'},{id:'headset-mic',name:'Headset microphone',bluetooth:true}];
  const known=(list,id)=>list.some(item=>item.id===id);
  const clamp=(value,fallback=75)=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Math.round(Number(value)))):fallback;
  function create(saved={},legacy={}){
    let value,sequence=0;const owner='system-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),operation=()=>owner+':'+(++sequence);
    function load(input={}, {recover=true}={}){
      const network=input.network||{},bluetooth=input.bluetooth||{},audio=input.audio||{},power=input.power||{},usb=input.usb||{};
      const wifi=typeof network.enabled==='boolean'?network.enabled:legacy['Wi-Fi']!==false;
      const bt=typeof bluetooth.enabled==='boolean'?bluetooth.enabled:legacy.Bluetooth!==false;
      const paired=(Array.isArray(bluetooth.paired)?bluetooth.paired:['phone']).filter(id=>known(devices,id));
      const connected=bt?(Array.isArray(bluetooth.connected)?bluetooth.connected:['phone']).filter(id=>paired.includes(id)):[];
      value={revision:Number.isFinite(input.revision)?input.revision:0,
        network:{enabled:wifi,connected:wifi?(known(networks,network.connected)?network.connected:network.connected===null?null:'home'):null,connecting:!recover&&wifi&&known(networks,network.connecting?.id)&&typeof network.connecting?.token==='string'?clone(network.connecting):null,error:recover&&network.connecting?'Connection interrupted. Choose a network to try again.':String(network.error||'').slice(0,300),known:(Array.isArray(network.known)?network.known:['home']).filter(id=>known(networks,id)),attempts:Object.fromEntries(networks.map(item=>[item.id,Math.max(0,Math.floor(Number(network.attempts?.[item.id])||0))]))},
        bluetooth:{enabled:bt,paired,connected},
        audio:{output:known(outputs,audio.output)?audio.output:'speakers',input:known(inputs,audio.input)?audio.input:'desktop-mic',volume:clamp(audio.volume,72),outputMuted:typeof audio.outputMuted==='boolean'?audio.outputMuted:legacy.Sound===false,inputMuted:audio.inputMuted===true},
        power:{battery:clamp(power.battery,78),charging:power.charging!==false,brightness:Math.max(10,clamp(power.brightness,100)),profile:['balanced','performance','power-saver'].includes(power.profile)?power.profile:'balanced'},
        usb:{attached:usb.attached!==false,mounted:usb.attached!==false&&usb.mounted!==false,job:!recover&&typeof usb.job?.token==='string'&&typeof usb.job.workspace==='string'&&typeof usb.job.destination==='string'?clone(usb.job):null,lastPath:typeof usb.lastPath==='string'?usb.lastPath:'',error:recover&&usb.job?'The copy was interrupted. The source is unchanged; try again.':String(usb.error||'').slice(0,300)},
        session:{mode:['active','locked','sleeping','off','restarted'].includes(input.session?.mode)?input.session.mode:'active'}};
      if(recover&&(network.connecting||usb.job))value.revision=Math.max(Date.now(),value.revision+1);
      reconcileAudio();return snapshot();
    }
    const touch=()=>{value.revision=Math.max(Date.now(),value.revision+1);};
    function snapshot(){return clone(value);}
    function reconcileAudio(){if(!value.bluetooth.connected.includes('headphones')){if(value.audio.output==='headphones')value.audio.output='speakers';if(value.audio.input==='headset-mic')value.audio.input='desktop-mic';}}
    function setToggle(label,enabled){
      enabled=Boolean(enabled);
      if(label==='Wi-Fi'&&value.network.enabled===enabled||label==='Bluetooth'&&value.bluetooth.enabled===enabled||label==='Sound'&&value.audio.outputMuted===!enabled)return false;
      if(label==='Wi-Fi'){value.network.enabled=Boolean(enabled);if(!enabled){value.network.connected=null;value.network.connecting=null;}value.network.error='';}
      else if(label==='Bluetooth'){value.bluetooth.enabled=Boolean(enabled);if(!enabled)value.bluetooth.connected=[];reconcileAudio();}
      else if(label==='Sound')value.audio.outputMuted=!enabled;
      else return false;
      touch();return true;
    }
    function beginNetwork(id,password=''){
      const network=networks.find(item=>item.id===id);if(!network||!value.network.enabled)return {ok:false,error:'Turn Wi-Fi on first.'};
      if(network.secure&&!value.network.known.includes(id)&&password!=='spatial-demo'){value.network.error='Incorrect password. Use spatial-demo for this sample network.';touch();return {ok:false,error:value.network.error};}
      if(network.secure&&!value.network.known.includes(id))value.network.known.push(id);
      value.network.connecting={id,token:operation()};value.network.error='';touch();return {ok:true,...value.network.connecting};
    }
    function finishNetwork(token){
      const pending=value.network.connecting;if(!pending||pending.token!==token||!value.network.enabled)return false;
      value.network.attempts[pending.id]=(Number(value.network.attempts[pending.id])||0)+1;
      value.network.connecting=null;
      if(pending.id==='weak'&&value.network.attempts.weak===1){value.network.error='Garden Wi-Fi did not respond. Move closer or choose Retry.';touch();return {ok:false,id:pending.id,error:value.network.error};}
      value.network.connected=pending.id;value.network.error='';touch();return {ok:true,id:pending.id};
    }
    function disconnect(){value.network.connected=null;value.network.connecting=null;value.network.error='';touch();}
    function pair(id,confirmed=false){
      if(!known(devices,id)||!value.bluetooth.enabled)return {ok:false,error:'Turn Bluetooth on first.'};
      if(!value.bluetooth.paired.includes(id)&&!confirmed)return {ok:false,confirmation:true};
      if(!value.bluetooth.paired.includes(id))value.bluetooth.paired.push(id);
      if(!value.bluetooth.connected.includes(id))value.bluetooth.connected.push(id);touch();return {ok:true};
    }
    function disconnectDevice(id,forget=false){value.bluetooth.connected=value.bluetooth.connected.filter(item=>item!==id);if(forget)value.bluetooth.paired=value.bluetooth.paired.filter(item=>item!==id);reconcileAudio();touch();}
    function setAudio(key,next){
      if(key==='output'||key==='input'){
        const item=(key==='output'?outputs:inputs).find(item=>item.id===next);if(!item||item.bluetooth&&!value.bluetooth.connected.includes('headphones'))return false;value.audio[key]=next;
      }else if(key==='volume')value.audio.volume=clamp(next);else if(['inputMuted','outputMuted'].includes(key))value.audio[key]=next===true;else return false;
      touch();return true;
    }
    function setPower(key,next){if(['brightness','battery'].includes(key))value.power[key]=key==='brightness'?Math.max(10,clamp(next)):clamp(next);else if(key==='charging')value.power.charging=next===true;else if(key==='profile'&&['balanced','performance','power-saver'].includes(next))value.power.profile=next;else return false;touch();return true;}
    function usbAction(action){
      if(value.usb.job){value.usb.error='A copy is in progress. Wait for it to finish before removing the drive.';touch();return false;}
      if(action==='attach'){value.usb.attached=true;value.usb.mounted=false;}
      else if(action==='mount'&&value.usb.attached)value.usb.mounted=true;
      else if(action==='eject'){value.usb.mounted=false;value.usb.attached=false;}
      else return false;value.usb.error='';touch();return true;
    }
    function beginCopy(workspace,destination){if(!value.usb.attached||!value.usb.mounted||value.usb.job)return null;const job={token:operation(),workspace,destination,progress:0};value.usb.job=job;value.usb.error='';touch();return clone(job);}
    function progressCopy(token,progress){if(value.usb.job?.token!==token)return false;value.usb.job.progress=clamp(progress);touch();return true;}
    function finishCopy(token,path,error=''){if(value.usb.job?.token!==token)return false;value.usb.job=null;value.usb.error=error;if(!error)value.usb.lastPath=path;touch();return true;}
    function session(action){
      const next={lock:'locked',unlock:'active',sleep:'sleeping',wake:'locked',shutdown:'off',start:'active',restart:'restarted',continue:'active'}[action];if(!next)return false;
      const mode=value.session.mode;if(action==='unlock'&&mode!=='locked'||action==='wake'&&mode!=='sleeping'||action==='start'&&mode!=='off'||action==='continue'&&mode!=='restarted')return false;
      value.session.mode=next;touch();return true;
    }
    load(saved);return {snapshot,load,setToggle,beginNetwork,finishNetwork,disconnect,pair,disconnectDevice,setAudio,setPower,usbAction,beginCopy,progressCopy,finishCopy,session};
  }
  const api={create,networks,devices,outputs,inputs};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  const storage=typeof desktopStorage!=='undefined'?desktopStorage:root.localStorage,key='spatial-demo-system-v1';
  let saved={},legacy={};try{saved=JSON.parse(storage.getItem(key)||'{}');legacy=JSON.parse(storage.getItem('spatial-system-toggles-v1')||'{}');}catch{}
  const model=create(saved,legacy),escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let section='network',pairing='',selectedNetwork='',feedback='',origin=null,pendingConfirmation='',applying=false;
  const dialog=document.createElement('dialog');dialog.className='desktop-system-dialog material-surface-glass';dialog.id='desktopSystemDialog';dialog.setAttribute('aria-labelledby','desktopSystemTitle');
  dialog.innerHTML='<header class="desktop-system-heading"><div><small>Demo devices · all Workspaces</small><h2 id="desktopSystemTitle">Devices & session</h2></div><button type="button" class="surface-key" data-system-close aria-label="Close Devices & session">×</button></header><nav class="desktop-system-tabs" aria-label="Device settings">'+[['network','Network'],['bluetooth','Devices'],['sound','Sound'],['power','Power & session']].map(([id,label])=>'<button type="button" class="nav-choice" data-system-section="'+id+'">'+label+'</button>').join('')+'</nav><div class="desktop-system-body"></div><p class="desktop-system-feedback" role="status" aria-live="polite"></p>';
  const sessionDialog=document.createElement('dialog');sessionDialog.className='desktop-session-dialog';sessionDialog.id='desktopSessionDialog';sessionDialog.setAttribute('aria-labelledby','desktopSessionTitle');
  document.body.append(dialog,sessionDialog);
  const brightnessShade=document.createElement('div');brightnessShade.className='desktop-brightness-shade';brightnessShade.setAttribute('aria-hidden','true');document.body.append(brightnessShade);
  const body=dialog.querySelector('.desktop-system-body'),status=dialog.querySelector('.desktop-system-feedback');
  const button=(action,label,attributes='')=>'<button type="button" class="surface-key" data-system-action="'+action+'" '+attributes+'>'+label+'</button>';
  const row=(title,detail,controls)=>'<section class="desktop-device-row"><div><b>'+title+'</b>'+(detail?'<p>'+detail+'</p>':'')+'</div><div class="desktop-device-actions">'+controls+'</div></section>';
  const switchControl=(label,enabled)=>'<button type="button" class="surface-key desktop-device-switch" data-system-toggle="'+label+'" aria-pressed="'+enabled+'">'+(enabled?'On':'Off')+'</button>';
  function blocked(){return Boolean(dialog.open||sessionDialog.open);}
  function permitted(){return !root.SpatialGuide?.model.active()||root.SpatialGuide.model.allows('systems');}
  function save(repaint=true){try{storage.setItem(key,JSON.stringify(model.snapshot()));}catch{}if(typeof queueDesktopStateBroadcast==='function')queueDesktopStateBroadcast(0);if(repaint)render();else renderAmbient(model.snapshot());root.dispatchEvent(new CustomEvent('spatial-system-change',{detail:model.snapshot()}));}
  function syncToggles(){
    if(typeof setSystemToggle!=='function')return;const state=model.snapshot(),previous=applying;applying=true;
    try{setSystemToggle('Wi-Fi',state.network.enabled);setSystemToggle('Bluetooth',state.bluetooth.enabled);setSystemToggle('Sound',!state.audio.outputMuted);}finally{applying=previous;}
    root.SpatialSettings?.refresh();
  }
  function close(){if(dialog.open)dialog.close();pairing='';selectedNetwork='';feedback='';origin?.focus?.({preventScroll:true});origin=null;}
  function open(next='network'){
    if(!permitted()||model.snapshot().session.mode!=='active')return false;
    const aliases={wifi:'network',devices:'bluetooth',audio:'sound',session:'power'};next=aliases[next]||next;
    section=['network','bluetooth','sound','power'].includes(next)?next:'network';origin=document.activeElement;
    if(typeof setUniversalSearchOpen==='function')setUniversalSearchOpen(false);root.SpatialPanels?.closeApplet?.(false);
    feedback='';render(true);if(!dialog.open)dialog.showModal();dialog.querySelector('[data-system-section="'+section+'"]').focus();return true;
  }
  function renderNetwork(state){
    const network=state.network,current=networks.find(item=>item.id===network.connected),pending=networks.find(item=>item.id===network.connecting?.id);
    return row('Wi-Fi',network.enabled?(pending?'Connecting to '+escape(pending.name)+'…':current?'Connected · '+escape(current.name):'Not connected'):'Wi-Fi is off',switchControl('Wi-Fi',network.enabled))+
      (network.enabled?'<div class="desktop-network-list" aria-label="Available demo networks">'+networks.map(item=>{
        const connected=network.connected===item.id,waiting=network.connecting?.id===item.id;
        return row(escape(item.name)+(connected?' <span class="desktop-device-tag">Connected</span>':''),escape(item.detail),connected?button('disconnect-network','Disconnect'):button('choose-network',''+(waiting?'Connecting…':network.error&&item.id==='weak'&&network.attempts.weak===1?'Retry':'Connect'),'data-network="'+item.id+'"'+(network.connecting?' disabled':'')));
      }).join('')+'</div>':'<p class="desktop-device-empty">Turn Wi-Fi on to choose a network. Your demo files remain available offline.</p>')+
      (selectedNetwork&&network.enabled?'<form class="desktop-network-auth" data-network-form><label for="demoNetworkPassword">Password for '+escape(networks.find(item=>item.id===selectedNetwork)?.name)+'</label><input id="demoNetworkPassword" name="password" type="password" autocomplete="off" aria-describedby="demoNetworkPasswordHint" required><small id="demoNetworkPasswordHint">Sample password: spatial-demo</small><div>'+button('cancel-network','Cancel')+'<button class="surface-key" type="submit">Connect</button></div></form>':'')+
      (network.error?'<p class="desktop-device-error" role="alert">'+escape(network.error)+'</p>':'');
  }
  function renderBluetooth(state){
    const bt=state.bluetooth;return row('Bluetooth',bt.enabled?'Available demo devices':'Bluetooth is off',switchControl('Bluetooth',bt.enabled))+
      (bt.enabled?devices.map(item=>{const paired=bt.paired.includes(item.id),connected=bt.connected.includes(item.id);return row(escape(item.name),escape((connected?'Connected':paired?'Paired · disconnected':'Available to pair')+' · '+item.detail),connected?button('disconnect-device','Disconnect','data-device="'+item.id+'"'):button('pair-device',paired?'Connect':'Pair','data-device="'+item.id+'"')+(paired?button('forget-device','Forget','data-device="'+item.id+'"'):''));}).join(''):'')+
      (pairing?'<section class="desktop-device-pair" role="group" aria-label="Confirm device pairing"><h3>Pair '+escape(devices.find(item=>item.id===pairing)?.name)+'?</h3><p>Check that the sample device shows <strong>042731</strong>.</p><div>'+button('cancel-pair','Cancel')+button('confirm-pair','Pair device')+'</div></section>':'')+
      '<h3 class="desktop-device-subheading">Removable storage</h3>'+row('Demo USB drive',state.usb.attached?(state.usb.mounted?'Mounted · sample field notes available':'Connected · not mounted'):'Safely removed',state.usb.attached?(state.usb.mounted?button('copy-usb','Copy sample file',''+(state.usb.job?'disabled':'')):button('mount-usb','Mount'))+button('eject-usb','Safely remove'):button('attach-usb','Connect demo drive'))+
      (state.usb.job?'<div class="desktop-device-transfer"><label>Copying to '+escape(state.usb.job.destination)+'</label><progress max="100" value="'+state.usb.job.progress+'" aria-label="USB copy progress"></progress></div>':'')+
      (state.usb.lastPath?'<p class="desktop-device-result">Copied to '+escape(state.usb.lastPath)+' '+button('open-usb-copy','Show in Files')+'</p>':'')+
      (state.usb.error?'<p class="desktop-device-error" role="alert">'+escape(state.usb.error)+'</p>':'');
  }
  function renderSound(state){
    const connected=state.bluetooth.connected.includes('headphones'),options=rows=>rows.map(item=>'<option value="'+item.id+'"'+(item.bluetooth&&!connected?' disabled':'')+'>'+escape(item.name)+(item.bluetooth&&!connected?' · connect in Devices':'')+'</option>').join('');
    return '<p class="desktop-device-note">Demo audio devices. Individual window volumes stay separate.</p>'+row('Output device','', '<select data-system-audio="output" aria-label="Audio output">'+options(outputs)+'</select>')+
      row('Output sound',state.audio.outputMuted?'Muted':'On',switchControl('Sound',!state.audio.outputMuted))+
      '<label class="desktop-device-slider">Output volume <output>'+state.audio.volume+'%</output><input type="range" min="0" max="100" value="'+state.audio.volume+'" data-system-audio="volume" aria-label="Demo output volume"></label>'+
      row('Input device','','<select data-system-audio="input" aria-label="Microphone input">'+options(inputs)+'</select>')+
      row('Microphone',state.audio.inputMuted?'Microphone muted':'Microphone available · no recording',button('mute-microphone',state.audio.inputMuted?'Unmute microphone':'Mute microphone','aria-pressed="'+state.audio.inputMuted+'"'));
  }
  function renderPower(state){
    return row('Demo battery',state.power.battery+'% · '+(state.power.charging?'Charging':'On battery'),button('power-source',state.power.charging?'Unplug charger':'Connect charger'))+
      '<label class="desktop-device-slider">Demo display brightness <output>'+state.power.brightness+'%</output><input type="range" min="10" max="100" value="'+state.power.brightness+'" data-system-power="brightness" aria-label="Demo display brightness"></label>'+
      row('Power profile','','<select data-system-power="profile" aria-label="Power profile"><option value="balanced">Balanced</option><option value="performance">Performance</option><option value="power-saver">Power saver</option></select>')+
      '<h3 class="desktop-device-subheading">Session</h3><p class="desktop-device-note">These controls affect this demo. Your computer keeps running; local work is preserved.</p><div class="desktop-session-actions">'+button('lock','Lock demo')+button('sleep','Sleep demo')+button('restart','Restart demo…')+button('shutdown','Shut down demo…')+'</div>';
  }
  function render(force=false){
    const state=model.snapshot();if(force||dialog.open||body.childElementCount===0){
      const active=document.activeElement,field=dialog.contains(active)&&active.matches('input')?{audio:active.dataset.systemAudio,power:active.dataset.systemPower,value:active.value,start:active.selectionStart,end:active.selectionEnd}:null;
      const auth=body.querySelector('[name="password"]')?.value;
      body.innerHTML=section==='network'?renderNetwork(state):section==='bluetooth'?renderBluetooth(state):section==='sound'?renderSound(state):renderPower(state);
      for(const tab of dialog.querySelectorAll('[data-system-section]')){const selected=tab.dataset.systemSection===section;tab.setAttribute('aria-pressed',String(selected));tab.classList.toggle('is-active',selected);}
      for(const select of body.querySelectorAll('select[data-system-audio]'))select.value=state.audio[select.dataset.systemAudio];
      const profile=body.querySelector('[data-system-power="profile"]');if(profile)profile.value=state.power.profile;
      if(selectedNetwork&&auth&&body.querySelector('[name="password"]'))body.querySelector('[name="password"]').value=auth;
      if(field&&(field.audio||field.power)){const next=body.querySelector(field.audio?'[data-system-audio="'+field.audio+'"]':'[data-system-power="'+field.power+'"]');next?.focus({preventScroll:true});}
      status.textContent=feedback;
      if(typeof prepareMaterialSurfaces==='function')prepareMaterialSurfaces(dialog);if(typeof prepareControlSemantics==='function')prepareControlSemantics(dialog);
    }
    renderAmbient(state);renderSession();
  }
  function renderAmbient(state){
    document.documentElement.style.setProperty('--demo-brightness',String(.35+state.power.brightness*.0065));
    document.body.dataset.demoPowerProfile=state.power.profile;
    const network=networks.find(item=>item.id===state.network.connected);
    for(const node of document.querySelectorAll('[data-system-network-status]'))node.textContent=state.network.enabled?(network?.name||'Offline'):'Wi-Fi off';
    for(const node of document.querySelectorAll('[data-phone-ping]')){node.title=state.bluetooth.connected.includes('phone')?'Ping connected demo phone · 60% battery':'Phone disconnected · open Devices';}
    const phone=document.querySelector('.connect-widget .device-row small');if(phone)phone.textContent=state.bluetooth.connected.includes('phone')?'Connected · Bluetooth':'Disconnected';
  }
  function renderSession(){
    const mode=model.snapshot().session.mode,shown=mode!=='active'||Boolean(pendingConfirmation);
    if(!shown){if(sessionDialog.open)sessionDialog.close();document.body.classList.remove('demo-session-inactive');return;}
    if(dialog.open&&!pendingConfirmation)dialog.close();
    document.body.classList.toggle('demo-session-inactive',mode!=='active');
    const content=pendingConfirmation?{title:pendingConfirmation==='restart'?'Restart this demo session?':'Shut down this demo session?',detail:'Open windows, drafts and files will be kept. This does not restart or shut down your computer.',actions:button('cancel-session','Cancel')+button('confirm-session',pendingConfirmation==='restart'?'Restart demo':'Shut down demo')}:mode==='locked'?{title:'Demo locked',detail:'Your work is still here. This is a simulated lock screen, not a security boundary.',actions:button('unlock','Unlock demo')}:mode==='sleeping'?{title:'Demo sleeping',detail:'Your windows and files are kept. Wake the demo to return to its lock screen.',actions:button('wake','Wake demo')}:mode==='off'?{title:'Demo is shut down',detail:'Your saved work is ready for the next session.',actions:button('start','Start demo')}: {title:'Demo restarted',detail:'Your windows, drafts and files have been restored.',actions:button('continue','Return to desktop')};
    const signature=JSON.stringify([mode,pendingConfirmation]);if(sessionDialog.dataset.rendered!==signature){sessionDialog.dataset.rendered=signature;sessionDialog.innerHTML='<div class="desktop-session-card material-surface-glass"><small>Spatial Desktop · demo session</small><h1 id="desktopSessionTitle">'+content.title+'</h1><p>'+content.detail+'</p><div class="desktop-session-actions">'+content.actions+'</div></div>';}
    if(!sessionDialog.open)sessionDialog.showModal();
  }
  function flushSession(){for(const name of ['captureCurrentWorkspaceSession','saveAppWindows','saveTileSessions','saveIndependentSessions']){const fn=name==='captureCurrentWorkspaceSession'?typeof captureCurrentWorkspaceSession==='function'&&captureCurrentWorkspaceSession:name==='saveAppWindows'?typeof saveAppWindows==='function'&&saveAppWindows:name==='saveTileSessions'?typeof saveTileSessions==='function'&&saveTileSessions:typeof saveIndependentSessions==='function'&&saveIndependentSessions;if(fn)fn();}}
  function sessionAction(action){
    if(['restart','shutdown'].includes(action)){pendingConfirmation=action;renderSession();return true;}
    flushSession();const changed=model.session(action);if(changed){pendingConfirmation='';save();}return changed;
  }
  function startNetwork(id,password=''){
    const result=model.beginNetwork(id,password);if(!result.ok){feedback='';save();body.querySelector('[name="password"]')?.focus();return;}
    selectedNetwork='';feedback='';save();const token=result.token;
    setTimeout(()=>{const result=model.finishNetwork(token);if(result){feedback=result.ok?'Connected to '+networks.find(item=>item.id===result.id).name:result.error;save();}},650);
  }
  function copyUSB(){
    const workspace=activeWorkspace,destination=SpatialHomeFolders.folder(workspaceProfiles,workspace,'Downloads'),job=model.beginCopy(workspace,destination);if(!job)return;
    save();let progress=0;
    const tick=()=>{if(!model.progressCopy(job.token,progress+=34))return;save();if(progress<100){setTimeout(tick,450);return;}
      try{
        if(!workspaceProfiles[job.workspace])throw Error('The destination Workspace is no longer available.');
        if(!root.SpatialDesktopFiles?.write)throw Error('File storage is not available. Try copying again.');
        const file=root.SpatialDesktopFiles.write(job.destination+'/USB field notes.txt','Field notes from the demo USB drive.\n\nSample 1: Wetland route checked.\nSample 2: Bring spare batteries.\n',{workspace:job.workspace,collision:'keep-both',source:'Demo USB drive'});
        refreshDownloadUi();model.finishCopy(job.token,file.path);feedback='Copied USB field notes.txt. The source stays on the demo drive.';
        root.SpatialAllWorkspaces?.notify({workspace:job.workspace,title:'USB file copied',detail:file.path,tone:'green',glyph:'i-folder',actions:[{id:'show',label:'Show in Files',kind:'open-location',path:file.path}]});
      }catch(error){model.finishCopy(job.token,'',error.message);feedback=error.message;}save();};setTimeout(tick,450);
  }
  function act(action,target){
    const state=model.snapshot();
    if(action==='choose-network'){const id=target.dataset.network,item=networks.find(item=>item.id===id);if(item?.secure&&!state.network.known.includes(id)){selectedNetwork=id;feedback='';render();body.querySelector('[name="password"]')?.focus();}else startNetwork(id);}
    else if(action==='cancel-network'){selectedNetwork='';feedback='';render();}
    else if(action==='disconnect-network'){model.disconnect();feedback='Disconnected. Demo files remain available offline.';save();}
    else if(action==='pair-device'){const id=target.dataset.device,result=model.pair(id);if(result.confirmation){pairing=id;render();}else{feedback=result.ok?'Device connected.':result.error;save();}}
    else if(action==='confirm-pair'){model.pair(pairing,true);pairing='';feedback='Device paired and connected.';save();}
    else if(action==='cancel-pair'){pairing='';render();}
    else if(action==='disconnect-device'||action==='forget-device'){model.disconnectDevice(target.dataset.device,action==='forget-device');feedback=action==='forget-device'?'Device forgotten.':'Device disconnected.';save();}
    else if(action==='mute-microphone'){model.setAudio('inputMuted',!state.audio.inputMuted);save();}
    else if(action==='power-source'){model.setPower('charging',!state.power.charging);save();}
    else if(action==='attach-usb'||action==='mount-usb'||action==='eject-usb'){model.usbAction(action.split('-')[0]==='eject'?'eject':action.split('-')[0]);feedback='';save();}
    else if(action==='copy-usb')copyUSB();
    else if(action==='open-usb-copy'&&state.usb.lastPath){close();openFileLocation(state.usb.lastPath.slice(0,state.usb.lastPath.lastIndexOf('/')));}
    else if(action==='cancel-session'){pendingConfirmation='';renderSession();}
    else if(action==='confirm-session'){const next=pendingConfirmation;if(!next)return;flushSession();pendingConfirmation='';model.session(next);save();}
    else if(['lock','unlock','sleep','wake','restart','shutdown','start','continue'].includes(action))sessionAction(action);
  }
  dialog.addEventListener('click',event=>{
    const tab=event.target.closest('[data-system-section]');if(tab){section=tab.dataset.systemSection;pairing='';selectedNetwork='';feedback='';render();return;}
    if(event.target.closest('[data-system-close]')){close();return;}
    const toggle=event.target.closest('[data-system-toggle]');if(toggle){model.setToggle(toggle.dataset.systemToggle,toggle.getAttribute('aria-pressed')!=='true');syncToggles();save();return;}
    const action=event.target.closest('[data-system-action]');if(action)act(action.dataset.systemAction,action);
  });
  dialog.addEventListener('submit',event=>{if(!event.target.matches('[data-network-form]'))return;event.preventDefault();startNetwork(selectedNetwork,event.target.elements.password.value);});
  function field(event){const target=event.target,repaint=target.type!=='range'||event.type==='change';if(target.dataset.systemAudio){model.setAudio(target.dataset.systemAudio,target.type==='range'?Number(target.value):target.value);syncToggles();save(repaint);}else if(target.dataset.systemPower){model.setPower(target.dataset.systemPower,target.type==='range'?Number(target.value):target.value);save(repaint);}if(!repaint){const output=target.closest('label')?.querySelector('output');if(output)output.textContent=target.value+'%';}}
  dialog.addEventListener('change',field);dialog.addEventListener('input',event=>{if(event.target.type==='range')field(event);});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  sessionDialog.addEventListener('click',event=>{const action=event.target.closest('[data-system-action]');if(action)act(action.dataset.systemAction,action);});
  sessionDialog.addEventListener('cancel',event=>{event.preventDefault();if(pendingConfirmation){pendingConfirmation='';renderSession();}});
  // Stop shell shortcuts at the window boundary while native modal focus owns
  // input. Text editing, native Tab navigation and button activation still work.
  for(const type of ['keydown','keyup'])root.addEventListener(type,event=>{if(blocked()){root.SpatialDemoSuper?.cancel?.();event.stopImmediatePropagation();if(event.key==='Escape'&&type==='keydown'){event.preventDefault();if(sessionDialog.open){if(pendingConfirmation){pendingConfirmation='';renderSession();}}else close();}}},true);
  if(typeof desktopNavigationBlocked==='function'){const originalBlocked=desktopNavigationBlocked;desktopNavigationBlocked=function(...args){return blocked()||originalBlocked(...args);};}
  if(typeof setSystemToggle==='function'){const previous=setSystemToggle;setSystemToggle=function(label,enabled,...args){const result=previous(label,enabled,...args);if(!applying&&model.setToggle(label,enabled))save();return result;};}
  document.addEventListener('click',event=>{
    const link=event.target.closest('[data-desktop-system-open]');if(link){event.preventDefault();open(link.dataset.desktopSystemOpen);return;}
    const ping=event.target.closest('[data-phone-ping]');if(ping&&!model.snapshot().bluetooth.connected.includes('phone')){event.preventDefault();event.stopImmediatePropagation();open('bluetooth');}
  },true);
  const shortcuts=document.createElement('div');shortcuts.className='desktop-system-shortcuts';shortcuts.innerHTML='<button type="button" class="surface-key" data-desktop-system-open="network"><span data-system-network-status></span><span aria-hidden="true"> ›</span></button><button type="button" class="surface-key" data-desktop-system-open="power">Devices & session</button>';
  // Controls and shortcuts remain one native widget in panels and applets.
  document.querySelector('.quick-settings')?.insertAdjacentElement('afterend',shortcuts);
  function load(next){if(!next||Number(next.revision)<=model.snapshot().revision)return false;model.load(next,{recover:false});syncToggles();render();root.dispatchEvent(new CustomEvent('spatial-system-change',{detail:model.snapshot()}));return true;}
  const bridge={...api,open,close,lock:()=>sessionAction('lock'),sleep:()=>sessionAction('sleep'),request:sessionAction,blocked,snapshot:model.snapshot,load,audioState:()=>model.snapshot().audio};
  root.SpatialDesktopSystem=bridge;
  if(typeof captureDesktopSyncState==='function'){const capture=captureDesktopSyncState;captureDesktopSyncState=function(...args){return {...capture(...args),desktopSystem:model.snapshot()};};}
  if(typeof persistIncomingDesktopState==='function'){const incoming=persistIncomingDesktopState;persistIncomingDesktopState=function(state){if(state.desktopSystem)load(state.desktopSystem);return incoming(state);};}
  if(typeof applyDesktopSyncState==='function'){const apply=applyDesktopSyncState;applyDesktopSyncState=function(...args){const previous=applying;applying=true;try{return apply(...args);}finally{applying=previous;syncToggles();}};}
  root.addEventListener('storage',event=>{if(event.key===key)try{load(JSON.parse(event.newValue||'{}'));}catch{}});
  syncToggles();render();if(saved.network?.connecting||saved.usb?.job)save();else root.dispatchEvent(new CustomEvent('spatial-system-change',{detail:model.snapshot()}));
})(typeof globalThis!=='undefined'?globalThis:this);
