/* Display roles have their own system-level editor. The bridge owns layout
   state and native-demo behavior; this module only renders and edits it. */
(function(root){
  'use strict';
  if(typeof document==='undefined')return;
  const roles={
    main:{label:'Main workspace',summary:'Your primary place to work.',detail:'Desktops and Projects change here. One connected display is always the Main workspace.',preview:'main'},
    extended:{label:'Extended workspace',summary:'More room for the current desktop.',detail:'Windows share the desktop you are viewing on the Main workspace. Switching desktops or Projects updates both displays.',preview:'extended'},
    assistant:{label:'Assistant',summary:'A visible place for Assistant to work.',detail:'Keep your own work on the Main workspace while Assistant prepares something alongside you. Each Workspace has its own Assistant space.',preview:'assistant'},
    side:{label:'Side space',summary:'Keep references, folders and widgets nearby.',detail:'This space stays in place when you switch desktops or Projects. Switching Workspace restores that Workspace’s own Side space.',preview:'side'}
  };
  let dialog=null,selectedSlot=null,returnFocus=null,renderSignature='',busy=false;
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const bridge=()=>root.SpatialDisplayRoleBridge;
  const readState=()=>bridge()?.state?.()||{displays:[],mainSlot:1,localSlot:1,workspace:'Workspace'};
  const sameSlot=(one,two)=>String(one)===String(two);
  const icon=name=>'<svg aria-hidden="true"><use href="#i-'+name+'"></use></svg>';
  function preview(role){
    return '<span class="display-role-preview display-role-preview-'+role+'" aria-hidden="true"><span class="display-preview-top"></span><span class="display-preview-tile display-preview-tile-one"></span><span class="display-preview-tile display-preview-tile-two"></span><span class="display-preview-tile display-preview-tile-three"></span><span class="display-preview-mark">'+(role==='assistant'?'✦':role==='side'?'⌖':role==='extended'?'→':'')+'</span></span>';
  }
  function create(){
    if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='displaySettingsDialog';
    dialog.className='display-settings-window desktop-glass-dialog material-surface-glass';
    dialog.setAttribute('aria-labelledby','displaySettingsTitle');dialog.setAttribute('aria-describedby','displaySettingsIntro');dialog.setAttribute('aria-modal','true');
    dialog.innerHTML='<header class="display-settings-header"><span class="display-settings-mark">'+icon('monitor')+'</span><div><small>SETTINGS · SYSTEM-WIDE</small><h2 id="displaySettingsTitle">Displays</h2></div><button type="button" class="display-settings-close surface-key" data-display-settings-close aria-label="Close Displays">'+icon('close')+'</button></header><div class="display-settings-body"><p id="displaySettingsIntro">Choose a display, then decide how you want to use it.</p><div class="display-settings-map" role="group" aria-label="Connected displays"></div><section class="display-settings-selected" aria-labelledby="displaySettingsSelected"><header><h3 id="displaySettingsSelected"></h3><span class="display-settings-resolution"></span></header><fieldset class="display-role-fieldset"><legend>Use this display as</legend><div class="display-role-options"></div></fieldset><p class="display-main-explanation" hidden>Choose another display as Main workspace first. One display always stays available for your work.</p><p class="display-role-detail"></p></section><div class="display-settings-scope"><b>Separate content in every Workspace</b><p>Side space and Assistant keep their own content in each Workspace. Display roles stay the same for this connected display setup.</p></div><div class="display-settings-demo"><div><b>Try another display</b><p>Linked browser windows simulate physical screens. Assistant replies and activity remain local, scripted demo examples.</p></div><button type="button" class="surface-key" data-display-open-companion>'+icon('add')+'<span>Open second demo display</span></button></div></div><footer class="display-settings-footer"><p class="display-settings-status" role="status" aria-live="polite">Changes save automatically for this display setup.</p><button type="button" class="surface-key" data-display-settings-close>Done</button></footer>';
    document.body.append(dialog);
    dialog.addEventListener('click',event=>{
      if(event.target.closest('[data-display-settings-close]')){close();return;}
      const monitor=event.target.closest('[data-display-select]');
      if(monitor){selectedSlot=monitor.dataset.displaySelect;renderSignature='';refresh();dialog.querySelector('[data-display-select="'+CSS.escape(String(selectedSlot))+'"]')?.focus({preventScroll:true});return;}
      if(event.target.closest('[data-display-open-companion]')){
        if(!bridge()?.openCompanion){status('The second demo display is not available yet.');return;}
        try{bridge().openCompanion();status('The second display opens in another browser window. Allow popups if your browser blocks it.');}
        catch(error){status(error?.message||'The second display could not be opened.');}
      }
    });
    dialog.addEventListener('change',async event=>{
      const input=event.target.closest('[data-display-role]');if(!input||busy)return;
      const state=readState(),display=state.displays.find(item=>sameSlot(item.slot,selectedSlot));if(!display)return;
      busy=true;refresh();
      try{const result=await bridge().setRole(display.slot,input.value);if(result===false)throw new Error('This display role could not be changed.');status((display.label||'Display '+display.slot)+' now uses '+roles[input.value].label+'.');}
      catch(error){status(error?.message||'This display role could not be changed.');}
      finally{busy=false;renderSignature='';refresh();dialog.querySelector('[data-display-role][value="'+CSS.escape(String(readState().displays.find(item=>sameSlot(item.slot,selectedSlot))?.role||'main'))+'"]')?.focus({preventScroll:true});}
    });
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('close',restoreFocus);
    /* Stop ordinary desktop shortcuts at the dialog. Native radio arrows,
       Tab and the browser’s own keys retain their normal behavior. */
    dialog.addEventListener('keydown',event=>event.stopPropagation());
    return dialog;
  }
  function status(message){dialog?.querySelector('.display-settings-status')?.replaceChildren(document.createTextNode(message));}
  function restoreFocus(){const target=returnFocus;returnFocus=null;if(target?.isConnected&&!target.closest('[inert]'))target.focus?.({preventScroll:true});}
  function refresh(){
    if(!dialog?.open)return;
    const state=readState(),displays=Array.isArray(state.displays)?state.displays:[];
    let selected=displays.find(item=>sameSlot(item.slot,selectedSlot));
    if(!selected){selected=displays.find(item=>sameSlot(item.slot,state.localSlot))||displays.find(item=>sameSlot(item.slot,state.mainSlot))||displays[0];selectedSlot=selected?.slot??null;}
    const signature=JSON.stringify({displays,selectedSlot,mainSlot:state.mainSlot,localSlot:state.localSlot,workspace:state.workspace,busy});
    if(signature===renderSignature)return;renderSignature=signature;
    const focused=document.activeElement,focusRole=focused?.dataset?.displayRole,focusMonitor=focused?.dataset?.displaySelect;
    dialog.querySelector('.display-settings-map').innerHTML=displays.map(display=>{
      const role=roles[display.role]||roles.extended,local=display.local||sameSlot(display.slot,state.localSlot),main=display.role==='main'||sameSlot(display.slot,state.mainSlot);
      const width=Number(display.width)||0,height=Number(display.height)||0,ratio=width>0&&height>0?Math.max(.7,Math.min(2.4,width/height)):1.6;
      return '<button type="button" class="display-monitor surface-key" data-display-select="'+escape(display.slot)+'" aria-pressed="'+sameSlot(display.slot,selectedSlot)+'" aria-label="'+escape((display.label||'Display '+display.slot)+' · '+role.label+(local?' · This window':''))+'"><span class="display-monitor-screen" style="--display-preview-ratio:'+ratio+'"><strong>'+escape(display.slot)+'</strong>'+(main?'<span class="display-monitor-main">Main</span>':'')+'</span><b>'+escape(display.label||'Display '+display.slot)+'</b><small>'+escape(role.label)+(local?' · This window':'')+'</small></button>';
    }).join('');
    const title=dialog.querySelector('#displaySettingsSelected'),resolution=dialog.querySelector('.display-settings-resolution'),options=dialog.querySelector('.display-role-options');
    title.textContent=selected?(selected.label||'Display '+selected.slot):'No display connected';
    const width=Number(selected?.width)||0,height=Number(selected?.height)||0;
    resolution.textContent=width>0&&height>0?Math.round(width)+' × '+Math.round(height)+' demo viewport':'';
    const single=displays.length<2,isMain=selected&&(selected.role==='main'||sameSlot(selected.slot,state.mainSlot));
    options.innerHTML=selected?(single?['main']:Object.keys(roles)).map(name=>{
      const role=roles[name],disabled=busy||Boolean(isMain&&name!=='main'),checked=name===selected.role||(name==='main'&&isMain);
      return '<label class="display-role-option'+(disabled?' is-disabled':'')+'"><input type="radio" name="display-role" value="'+name+'" data-display-role="'+name+'"'+(checked?' checked':'')+(disabled?' disabled':'')+'><span class="display-role-option-content">'+preview(name)+'<b>'+role.label+'</b><small>'+role.summary+'</small></span></label>';
    }).join(''):'';
    dialog.querySelector('.display-main-explanation').hidden=!isMain||single;
    dialog.querySelector('.display-role-detail').textContent=single?'Add a second demo display to try Extended workspace, Assistant or Side space. Your only display remains the Main workspace.':(roles[selected?.role]||roles.extended).detail;
    dialog.querySelector('[data-display-open-companion] span').textContent=single?'Open second demo display':'Open another demo display';
    if(typeof root.prepareControlSemantics==='function')root.prepareControlSemantics(dialog);
    else if(typeof prepareControlSemantics==='function')prepareControlSemantics(dialog);
    if(focusRole)dialog.querySelector('[data-display-role="'+CSS.escape(focusRole)+'"]:enabled')?.focus({preventScroll:true});
    else if(focusMonitor)dialog.querySelector('[data-display-select="'+CSS.escape(focusMonitor)+'"]')?.focus({preventScroll:true});
  }
  function open(slot){
    create();
    if(!dialog.open)returnFocus=document.activeElement;
    const state=readState();selectedSlot=slot??state.localSlot??state.mainSlot;renderSignature='';
    if(!dialog.open)dialog.showModal();
    refresh();
    dialog.querySelector('[data-display-select="'+CSS.escape(String(selectedSlot))+'"]')?.focus({preventScroll:true});
  }
  function close(){if(dialog?.open)dialog.close();}
  root.SpatialDisplaySettings={open,refresh,close};
  root.addEventListener('spatial-display-roles-change',refresh);
  root.addEventListener('storage',refresh);
})(typeof globalThis!=='undefined'?globalThis:this);
