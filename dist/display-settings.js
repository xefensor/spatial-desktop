/* The Displays page belongs to the normal Settings app. The bridge owns
   display roles and native-demo behavior; this editor only renders and edits it. */
(function(root){
  'use strict';
  if(typeof document==='undefined')return;
  const roles={
    main:{label:'Main workspace',summary:'Your primary place to work.',detail:'Desktops and Projects change here. One connected display is always the Main workspace.',preview:'main'},
    extended:{label:'Extended workspace',summary:'More room for the current desktop.',detail:'Windows share the desktop you are viewing on the Main workspace. Switching desktops or Projects updates both displays.',preview:'extended'},
    assistant:{label:'Assistant',summary:'Let Assistant work with the windows here.',detail:'Delegate this display’s windows to Assistant in the active Workspace. Intervene at any time, then choose Continue when ready. Chat and references stay together; the Main workspace remains yours. Native autonomous control is not connected in this prototype.',preview:'assistant'},
    side:{label:'Side space',summary:'Keep a space you control beside your work.',detail:'Keep reference windows, chat, pinned files, notes and a checklist nearby. You control this space. Use Let Assistant work here to hand it over without losing its contents. Desktop and Project changes leave it in place; each Workspace keeps its own space.',preview:'side'}
  };
  const mounted=new Set(),editors=new WeakMap();
  let nextEditor=0;
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const bridge=()=>root.SpatialDisplayRoleBridge;
  const readState=()=>bridge()?.state?.()||{displays:[],mainSlot:1,localSlot:1,workspace:'Workspace'};
  const sameSlot=(one,two)=>String(one)===String(two);
  const icon=name=>'<svg aria-hidden="true"><use href="#i-'+name+'"></use></svg>';
  function preview(role){
    return '<span class="display-role-preview display-role-preview-'+role+'" aria-hidden="true"><span class="display-preview-top"></span><span class="display-preview-tile display-preview-tile-one"></span><span class="display-preview-tile display-preview-tile-two"></span><span class="display-preview-tile display-preview-tile-three"></span><span class="display-preview-mark">'+(role==='assistant'?'✦':role==='side'?'⌖':role==='extended'?'→':'')+'</span></span>';
  }
  function visible(editor){
    const host=editor.host;
    if(!host.isConnected||host.closest('[hidden],[inert]'))return false;
    if(typeof host.checkVisibility==='function')return host.checkVisibility({checkVisibilityCSS:true});
    for(let node=host;node?.nodeType===1;node=node.parentElement){
      const style=root.getComputedStyle?.(node);
      if(style?.display==='none'||style?.visibility==='hidden')return false;
    }
    return true;
  }
  function status(editor,message){editor.host.querySelector('.display-settings-status')?.replaceChildren(document.createTextNode(message));}
  function mount(host,slot){
    if(!host||typeof host.querySelector!=='function')return null;
    let editor=editors.get(host);
    if(!editor){
      const id='display-editor-'+(++nextEditor);
      editor={host,id,selectedSlot:null,signature:'',busy:false};
      editors.set(host,editor);mounted.add(editor);
      host.classList.add('settings-displays-editor');
      host.innerHTML='<p class="display-settings-intro">Choose a display, then decide how you want to use it.</p><div class="display-settings-map" role="group" aria-label="Connected displays"></div><section class="display-settings-selected" aria-labelledby="'+id+'-selected"><header><h3 id="'+id+'-selected"></h3><span class="display-settings-resolution"></span></header><fieldset class="display-role-fieldset"><legend>Use this display as</legend><div class="display-role-options"></div></fieldset><p class="display-main-explanation" hidden>Choose another display as Main workspace first. One display always stays available for your work.</p><p class="display-role-detail"></p></section><div class="display-settings-scope"><b>Same space, different control</b><p>Side space and Assistant share windows, chat and references within each Workspace. Switching between them keeps your material in place. Delegation applies to this display and Workspace; display roles save for this connected setup.</p></div><div class="display-settings-demo"><div><b>Try another display</b><p>Linked browser windows simulate physical screens. Chat replies and the limited Assistant tasks are local demo examples, without a connected model or native app control.</p></div><button type="button" class="surface-key" data-display-open-companion>'+icon('add')+'<span>Open second demo display</span></button></div><p class="display-settings-status" role="status" aria-live="polite">Changes save automatically for this display setup.</p>';
      host.addEventListener('click',event=>{
        const monitor=event.target.closest('[data-display-select]');
        if(monitor){editor.selectedSlot=monitor.dataset.displaySelect;render(editor);host.querySelector('[data-display-select="'+CSS.escape(String(editor.selectedSlot))+'"]')?.focus({preventScroll:true});return;}
        if(event.target.closest('[data-display-open-companion]')){
          if(!bridge()?.openCompanion){status(editor,'The second demo display is not available yet.');return;}
          try{bridge().openCompanion();status(editor,'The second display opens in another browser window. Allow popups if your browser blocks it.');}
          catch(error){status(editor,error?.message||'The second display could not be opened.');}
        }
      });
      host.addEventListener('change',async event=>{
        const input=event.target.closest('[data-display-role]');
        if(!input||editor.busy||!visible(editor)||!Object.prototype.hasOwnProperty.call(roles,input.value)||!sameSlot(input.dataset.displaySlot,editor.selectedSlot))return;
        const state=readState(),display=state.displays.find(item=>sameSlot(item.slot,editor.selectedSlot));if(!display)return;
        const nextRole=input.value;
        editor.busy=true;render(editor);
        try{const result=await bridge().setRole(display.slot,nextRole);if(result===false)throw new Error('This display role could not be changed.');status(editor,(display.label||'Display '+display.slot)+' now uses '+roles[nextRole].label+'.');}
        catch(error){status(editor,error?.message||'This display role could not be changed.');}
        finally{editor.busy=false;render(editor);if(visible(editor))host.querySelector('[data-display-role][value="'+CSS.escape(String(readState().displays.find(item=>sameSlot(item.slot,editor.selectedSlot))?.role||'main'))+'"]')?.focus({preventScroll:true});}
      });
      /* Settings owns window shortcuts. Keep radio arrows and other native
         field navigation from reaching the desktop shortcut handler. */
      host.addEventListener('keydown',event=>{
        // Find belongs to the enclosing Settings app on every category page.
        if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f')return;
        event.stopPropagation();
      });
    }
    mounted.add(editor);
    if(slot!==undefined&&slot!==null)editor.selectedSlot=slot;
    render(editor);
    return host;
  }
  function render(editor){
    if(!visible(editor))return;
    const host=editor.host,state=readState(),displays=Array.isArray(state.displays)?state.displays:[];
    let selected=displays.find(item=>sameSlot(item.slot,editor.selectedSlot));
    if(!selected){selected=displays.find(item=>sameSlot(item.slot,state.localSlot))||displays.find(item=>sameSlot(item.slot,state.mainSlot))||displays[0];editor.selectedSlot=selected?.slot??null;}
    /* Ignore bridge activity unrelated to the visible editor, including
       workspace window changes and repeated role/roster notifications. */
    const signature=JSON.stringify({displays:displays.map(({slot,label,role,local,width,height})=>({slot,label,role,local,width,height})),selectedSlot:String(editor.selectedSlot),mainSlot:state.mainSlot,localSlot:state.localSlot,busy:editor.busy});
    if(signature===editor.signature)return;editor.signature=signature;
    const focused=document.activeElement,ownsFocus=host.contains(focused),focusRole=ownsFocus&&focused?.dataset?.displayRole,focusMonitor=ownsFocus&&focused?.dataset?.displaySelect;
    host.querySelector('.display-settings-map').innerHTML=displays.map(display=>{
      const role=roles[display.role]||roles.extended,local=display.local||sameSlot(display.slot,state.localSlot),main=display.role==='main'||sameSlot(display.slot,state.mainSlot);
      const width=Number(display.width)||0,height=Number(display.height)||0,ratio=width>0&&height>0?Math.max(.7,Math.min(2.4,width/height)):1.6;
      return '<button type="button" class="display-monitor" data-display-select="'+escape(display.slot)+'" aria-pressed="'+sameSlot(display.slot,editor.selectedSlot)+'" aria-label="'+escape((display.label||'Display '+display.slot)+' · '+role.label+(local?' · This window':''))+'"><span class="display-monitor-screen" style="--display-preview-ratio:'+ratio+'"><strong>'+escape(display.slot)+'</strong>'+(main?'<span class="display-monitor-main">Main</span>':'')+'</span><b>'+escape(display.label||'Display '+display.slot)+'</b><small>'+escape(role.label)+(local?' · This window':'')+'</small></button>';
    }).join('');
    const displayName=selected?(selected.label||'Display '+selected.slot):'No display connected';
    host.querySelector('#'+editor.id+'-selected').textContent=displayName;
    const width=Number(selected?.width)||0,height=Number(selected?.height)||0;
    host.querySelector('.display-settings-resolution').textContent=width>0&&height>0?Math.round(width)+' × '+Math.round(height)+' demo viewport':'';
    const single=displays.length<2,isMain=selected&&(selected.role==='main'||sameSlot(selected.slot,state.mainSlot));
    host.querySelector('legend').textContent=selected?'Use '+displayName+' as':'Display role';
    host.querySelector('.display-role-options').innerHTML=selected?(single?['main']:Object.keys(roles)).map(name=>{
      const role=roles[name],disabled=editor.busy||Boolean(isMain&&name!=='main'),checked=name===selected.role||(name==='main'&&isMain);
      return '<label class="display-role-option'+(disabled?' is-disabled':'')+'"><input type="radio" name="'+editor.id+'-role" value="'+name+'" data-display-role="'+name+'" data-display-slot="'+escape(selected.slot)+'" aria-label="'+escape(role.label+' on '+displayName)+'"'+(checked?' checked':'')+(disabled?' disabled':'')+'><span class="display-role-option-content">'+preview(name)+'<b>'+role.label+'</b><small>'+role.summary+'</small></span></label>';
    }).join(''):'';
    host.querySelector('.display-main-explanation').hidden=!isMain||single;
    host.querySelector('.display-role-detail').textContent=single?'Add a second demo display to try Extended workspace, Assistant or Side space. Your only display remains the Main workspace.':(roles[selected?.role]||roles.extended).detail;
    host.querySelector('[data-display-open-companion] span').textContent=single?'Open second demo display':'Open another demo display';
    if(typeof root.prepareControlSemantics==='function')root.prepareControlSemantics(host);
    else if(typeof prepareControlSemantics==='function')prepareControlSemantics(host);
    if(focusRole)host.querySelector('[data-display-role="'+CSS.escape(focusRole)+'"]:enabled')?.focus({preventScroll:true});
    else if(focusMonitor)host.querySelector('[data-display-select="'+CSS.escape(focusMonitor)+'"]')?.focus({preventScroll:true});
  }
  function refresh(){
    for(const editor of mounted){if(!editor.host.isConnected)mounted.delete(editor);else render(editor);}
  }
  function open(slot){return root.SpatialSettings?.open?.('displays',{slot});}
  root.SpatialDisplaySettings={mount,open,refresh};
  root.addEventListener('spatial-display-roles-change',refresh);
  root.addEventListener('storage',refresh);
})(typeof globalThis!=='undefined'?globalThis:this);
