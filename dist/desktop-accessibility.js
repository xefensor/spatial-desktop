/* Reading and pointer preferences affect the demo, never the host desktop. */
(function(root){
  'use strict';
  function normalize(value={}){
    return {text:['normal','large','larger'].includes(value.text)?value.text:'normal',pointer:['material','large','system'].includes(value.pointer)?value.pointer:'material',motion:['system','reduced'].includes(value.motion)?value.motion:'system'};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={normalize};return;}
  const key='spatial-accessibility-v1';let preferences=normalize(readDesktopStorage(key,{}));
  function apply(){
    document.body.dataset.readingSize=preferences.text;
    document.body.dataset.pointerStyle=preferences.pointer;
    document.body.dataset.motion=preferences.motion;
    root.dispatchEvent(new CustomEvent('spatial-accessibility-change'));
  }
  function load(value){preferences=normalize(value);try{desktopStorage.setItem(key,JSON.stringify(preferences));}catch{}apply();}
  root.SpatialAccessibility={snapshot:()=>({...preferences}),load,set(patch){
    const next=normalize({...preferences,...patch});
    try{desktopStorage.setItem(key,JSON.stringify(next));}catch{showToast('Preferences could not be saved. Try again.');return false;}
    preferences=next;apply();queueDesktopStateBroadcast(0);return true;
  }};
  root.addEventListener('storage',event=>{if(event.key===key)load(readDesktopStorage(key,{}));});
  apply();
})(globalThis);
