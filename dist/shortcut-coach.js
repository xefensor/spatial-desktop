/* Completed desktop actions opt into learning explicitly. Keyboard navigation,
   scripts and ordinary clicks inside documents never become practice events. */
(function(root){
  'use strict';
  const storageKey='spatial-shortcut-learning-v1';
  const definitions={
    overview:{label:'Open Overview',keys:['Super'],demoKeys:['F2']},
    'desktop-map':{label:'Open desktop map',keys:['Super','Tab'],demoKeys:['F2','Tab']},
    'window-size':{label:'Maximize or restore window',keys:['Alt','Enter']},
    'window-focus':{label:'Switch to a numbered window',keys:['Super','1–0'],demoKeys:['F2','1–0']}
  };
  function saved(){try{return JSON.parse(desktopStorage.getItem(storageKey)||'null');}catch{return null;}}
  let model=SpatialShortcutLearning.create({saved:saved()}),timer=0,currentAction='';
  const hint=document.createElement('div');hint.id='shortcutLearningHint';hint.className='shortcut-learning-hint material-surface-glass';hint.hidden=true;hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');hint.setAttribute('aria-atomic','true');
  document.body.append(hint);
  function hide(){clearTimeout(timer);timer=0;currentAction='';hint.hidden=true;}
  function blocked(){
    return document.hidden||root.SpatialGuide?.model.active()||Boolean(document.querySelector('#spatialGuide:not([hidden]),[aria-modal="true"]:not([hidden]):not([aria-hidden="true"]):not(#universalSearch):not(#spatialDesktopMap),dialog[open]'));
  }
  function source(event){
    if(!event||event.repeat||event.isComposing)return null;
    if(['click','dblclick'].includes(event.type)&&event.detail>0&&event.button===0)return 'pointer';
    if(['keydown','keyup'].includes(event.type))return 'shortcut';
    return null;
  }
  const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const keycaps=keys=>keys.map(key=>'<kbd>'+escape(key)+'</kbd>').join('<span aria-hidden="true">+</span>');
  function show(id,detail){
    const entry={...definitions[id],...detail};
    // The map makes the rest of the desktop inert. Keep its live hint inside
    // that modal so it remains available to assistive technology as well.
    const map=document.querySelector('#spatialDesktopMap:not([hidden])'),parent=map||document.body;
    if(hint.parentElement!==parent)parent.append(hint);
    hint.inert=false;
    const markup='<span class="shortcut-hint-action">'+escape(entry.label)+'</span><span class="shortcut-hint-keys">'+keycaps(entry.keys)+'</span>'+(entry.demoKeys?'<span class="shortcut-hint-demo"><span>In demo</span><span class="shortcut-hint-keys">'+keycaps(entry.demoKeys)+'</span></span>':'');
    // Refresh one quiet surface; rapid repetition never stacks or reanimates it.
    if(hint.innerHTML!==markup)hint.innerHTML=markup;
    currentAction=id;hint.hidden=false;clearTimeout(timer);timer=setTimeout(hide,2200);
  }
  function persist(){try{desktopStorage.setItem(storageKey,JSON.stringify(model.snapshot()));}catch{/* Practice can continue for this visit when storage is unavailable. */}}
  function refreshSettings(host){
    if(!host)return;
    const state=model.snapshot(),master=host.querySelector('[data-shortcut-learning-enabled]');if(master)master.checked=state.enabled;
    for(const id of Object.keys(definitions)){
      const action=state.actions[id],input=host.querySelector('[data-shortcut-learning-action="'+id+'"]'),status=host.querySelector('[data-shortcut-learning-status="'+id+'"]');
      if(input)input.checked=!action?.muted;
      if(status)status.textContent=action?.muted?'Suggestions off':!state.enabled?'Learning paused':action?.teaching?'Practising · '+action.shortcutUses+' of 3 shortcut uses':'Waiting for repeated mouse use';
    }
  }
  function updated(){persist();refreshSettings(document.querySelector('.settings-app-content'));}
  function record(id,event,detail={}){
    const input=source(event);if(!definitions[id]||!input||blocked())return;
    const result=model.record(id,input);
    if(input==='shortcut'&&currentAction===id)hide();
    if(result.show)show(id,detail);
    updated();
    return result;
  }
  function windowFocused(name,event){
    // A numbered shortcut may park the already-front window. Only successful
    // focus/restore operations belong to this lesson, never a no-op content click.
    if(!name||appState[name]!=='open'||frontApp!==name||!isLocalApp(name))return;
    const slot=hotbarSlotFor(name);if(!slot||slot>20)return;
    const modifiers=slot>10?['Shift']:[],digit=String(slot%10);
    return record('window-focus',event,{label:'Switch to '+appInfo[name].label,keys:['Super',...modifiers,digit],demoKeys:['F2',...modifiers,digit]});
  }
  function settingsMarkup(){
    return '<section class="settings-row" id="settings-shortcut-learning" data-settings-target="shortcut-learning" tabindex="-1"><div><h3>Shortcut learning</h3><p>After five mouse uses, the next use shows the action and shortcut. Three successful shortcut uses quiet it again.</p></div><label class="settings-checkbox"><input type="checkbox" data-shortcut-learning-enabled><span>Learn shortcuts</span></label></section>'+
      '<div class="settings-help"><p>Mouse use stays available. Choose which suggestions you want below. Up to two actions are taught at once; regular shortcut use keeps reminders quiet. A week without using an action clears its practice counts.</p><p>Progress and preferences stay in this browser across Workspaces. Guide practice and scripted actions do not count. Hold F2 instead of Super in this demo; Alt + number also switches windows.</p></div>'+
      '<div class="shortcut-learning-settings">'+Object.entries(definitions).map(([id,entry])=>'<section class="settings-row"><div><h3>'+escape(entry.label)+'</h3><p class="shortcut-settings-keys">'+keycaps(entry.keys)+(entry.demoKeys?' <span>· In demo</span> '+keycaps(entry.demoKeys):'')+'</p><small data-shortcut-learning-status="'+id+'"></small></div><label class="settings-checkbox"><input type="checkbox" data-shortcut-learning-action="'+id+'"><span>Suggest<span class="sr-only"> '+escape(entry.label)+'</span></span></label></section>').join('')+'</div>'+
      '<section class="settings-row"><div><h3>Start learning again</h3><p>Clear practice counts and enable every suggestion again. Your global learning preference stays the same.</p></div><button type="button" class="surface-key settings-action" data-setting-action="reset-shortcut-learning">Reset progress</button></section>';
  }
  root.SpatialShortcutCoach={record,windowFocused,settingsMarkup,refreshSettings,snapshot:()=>model.snapshot(),
    setEnabled(value){model.setEnabled(value);hide();updated();},
    setMuted(id,value){if(!definitions[id])return;model.setMuted(id,value);if(currentAction===id)hide();updated();},
    reset(){model.reset();hide();updated();}
  };
  root.addEventListener('storage',event=>{if(event.key!==storageKey&&event.key!==null)return;model=SpatialShortcutLearning.create({saved:saved()});hide();root.SpatialSettings?.refresh();});
  root.addEventListener('blur',hide);document.addEventListener('visibilitychange',hide);
  new MutationObserver(()=>{if(!hint.hidden&&(blocked()||hint.closest('#spatialDesktopMap[hidden]')))hide();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','aria-hidden','open']});
  root.SpatialSettings?.refresh();
})(globalThis);
