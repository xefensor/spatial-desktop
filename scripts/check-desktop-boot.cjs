'use strict';
// Load the actual page and every script in page order. This is a DOM integration
// check; layout, pointer geometry and visual appearance have separate checks.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const CSSOM=require('rrweb-cssom');
const directory=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(directory,'index.html'),'utf8');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function boot(practice=false,chapter=null){
 const errors=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error.message));
 const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://spatial.test/'+(chapter?'?guide=chapter&chapter='+chapter:''),virtualConsole}),w=dom.window,d=w.document;
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.getComputedStyle=element=>new Proxy(element.style,{get(style,key){if(key===Symbol.iterator)return function*(){for(let index=0;index<style.length;index++)yield style.item(index);};if(key==='getPropertyValue')return name=>style.getPropertyValue(name);if(key==='display')return element.hidden?'none':style.display||'block';if(key==='visibility')return style.visibility||'visible';const value=style[key];return typeof value==='function'?value.bind(style):value||'';}});
 // CSSStyleDeclaration iteration is not supplied by every jsdom/cssstyle
 // combination. Browser computed styles enumerate property names, including
 // custom properties copied into native parked-window previews.
 const styleProbe=d.createElement('div');styleProbe.style.setProperty('--computed-style-probe','retained');Object.defineProperty(styleProbe.style,Symbol.iterator,{value:undefined,configurable:true});
 const computedProbe=w.getComputedStyle(styleProbe);assert.deepEqual([...computedProbe],['--computed-style-probe']);assert.equal(computedProbe.getPropertyValue('--computed-style-probe'),'retained');
 if(!practice||chapter)w.localStorage.setItem('spatial-guide-v1',JSON.stringify({status:'skipped',index:0,version:9}));
 w.matchMedia=query=>({matches:query.includes('reduced-motion'),addEventListener(){},removeEventListener(){}});
 w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};
 w.BroadcastChannel=class{postMessage(){}addEventListener(){}close(){}};
 w.Element.prototype.scrollIntoView=function(){};w.Element.prototype.scrollTo=function(){};
 w.Element.prototype.animate=function(){return {finished:Promise.resolve(),cancel(){}};};
 w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};
 w.document.documentElement.requestFullscreen=()=>Promise.resolve();
 w.requestAnimationFrame=callback=>w.setTimeout(()=>{try{callback(w.performance.now());}catch(error){errors.push(error.stack);}},0);
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return this.classList?.contains('desktop-shell')?1440:parseFloat(this.style.width)||960;}});
 Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return this.classList?.contains('desktop-shell')?900:parseFloat(this.style.height)||750;}});
 try{
  for(const script of d.querySelectorAll('script')){
   const filename=script.getAttribute('src')?.split('?')[0],source=filename?fs.readFileSync(path.join(directory,filename),'utf8'):script.textContent;
   if(!source.trim()||script.type&&script.type!=='text/javascript')continue;
   try{vm.runInContext(source,dom.getInternalVMContext(),{filename:filename||'inline-page-script',timeout:10000});}catch(error){errors.push((filename||'inline')+': '+error.stack);}
  }
  await delay(50);assert.deepEqual(errors,[],'Actual page bootstrap has no errors');
  assert(w.SpatialPanels);assert.equal(d.querySelector('[data-area-window],.area-window,.area-resize-handle,.area-share-handle,.overview-areas-widget'),null,'No legacy Areas are mounted');
  assert.equal(d.querySelector('[data-widget-source="system"]'),null,'System source bank is dismantled');
  for(const id of ['apps','files','assistant'])assert(d.querySelector('.desktop-widget [data-widget-source="'+id+'"]'),'Live '+id+' is mounted directly into a widget');
  const P=w.SpatialPanels;
  if(practice){
   assert(w.SpatialGuide.model.active(),'First-run Guide starts');assert.equal(d.querySelector('#spatialGuide').hidden,false,'Guide opens after panels are ready');
   assert(d.querySelector('[data-panel-action="open-overview"]'),'Overview remains available during practice');
   const realKeys=Object.keys(w.localStorage).filter(key=>key==='spatial-widget-panels-v1');assert.equal(realKeys.length,0,'Guide practice never writes normal panel layout');
   if(chapter==='projects'){
    assert.equal(w.SpatialGuide.model.lesson.id,'projects');
    const settled=(ready,message)=>new Promise((resolve,reject)=>{
     const observer=new w.MutationObserver(check),deadline=setTimeout(()=>{observer.disconnect();reject(new Error(message));},5000);
     function check(){if(ready()){observer.disconnect();clearTimeout(deadline);resolve();}}
     observer.observe(d.body,{subtree:true,attributes:true,childList:true,characterData:true});check();
    });
    const dialog=d.querySelector('#projectEditorDialog'),open=async()=>{
     d.querySelector('[data-create-project]').click();
     await settled(()=>!dialog.hidden&&!dialog.inert&&dialog.classList.contains('is-open')&&d.activeElement===dialog.querySelector('[name="name"]'),'Project dialog did not open and focus its name field');
     assert.equal(dialog.parentElement,d.body);
    },closed=()=>settled(()=>dialog.hidden&&dialog.inert,'Project dialog did not finish closing');
    await open();
    const name=d.querySelector('#projectEditorBody [name="name"]'),root=d.querySelector('#projectEditorBody [name="root"]'),download=d.querySelector('#projectEditorBody [name="downloadToProject"]');
    assert.equal(d.activeElement,name,'Guide Project dialog receives its own focus');
    for(const control of [name,root,download,d.querySelector('[data-project-editor-action="close"]')]){
     const event=new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true});control.dispatchEvent(event);assert.equal(event.defaultPrevented,false,'Guide capture permits '+(control.name||'Cancel'));
    }
    name.value='Guide cancelled project';name.dispatchEvent(new w.Event('input',{bubbles:true}));download.click();assert.equal(download.checked,true);
    d.querySelector('[data-project-editor-action="close"]').click();assert.equal(dialog.inert,true,'Cancel works during the Projects lesson');await closed();
    await open();d.querySelector('#closeProjectEditor').click();assert.equal(dialog.inert,true,'The Project dialog close button works during the Guide');await closed();
    await open();d.querySelector('#projectEditorBody [name="name"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(dialog.inert,true,'Escape closes the Guide Project dialog');await closed();
    await open();d.querySelector('#projectEditorBody [name="name"]').value='Guide pointer check';d.querySelector('#projectEditorBody [name="root"]').value='/home/demo/Projects/guide-pointer-check';d.querySelector('#projectEditorBody [name="downloadToProject"]').click();d.querySelector('#projectEditorBody [type="submit"]').click();await settled(()=>dialog.inert&&w.SpatialGuide.model.state.done.includes('project-created'),'Guide did not observe Project creation');
    assert.equal(dialog.inert,true,'Create project submits during the Guide');
    assert(vm.runInContext("Object.values(projectSpaces).some(project=>project.name==='Guide pointer check'&&project.downloadToProject)",dom.getInternalVMContext()),'The actual form creates the named Project with its selected option');
    assert(w.SpatialGuide.model.state.done.includes('project-created'),'Guide observes actual Project creation');
   }
  }else{
   const body=d.querySelector('.desktop-panel:not([hidden]) .desktop-panel-body'),state=JSON.stringify(P.state());
   body.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:20,clientY:100}));
   const edit=d.querySelector('.panel-context-menu [data-panel-action="edit"]');assert(edit,'Actual panel right-click exposes Edit layout');edit.click();
   assert.equal(d.body.dataset.panelEditing,'true');d.querySelector('.panel-layout-toolbar [data-panel-action="done"]').click();assert.equal(d.body.dataset.panelEditing,'false');assert.equal(JSON.stringify(P.state()),state);
   assert.equal(d.querySelector('#panelLayoutLauncher'),null);
   for(const id of ['files','assistant','controls','calendar']){
    const source=id==='files'||id==='assistant'?d.querySelector('[data-widget-source="'+id+'"]'):null;
    P.openApplet(id,d.querySelector('[data-widget-id="'+id+'"] .desktop-widget-summary'));assert(d.querySelector('.panel-applet-popup[data-widget-id="'+id+'"]'),'Actual '+id+' content opens');
    if(source)assert(d.querySelector('.panel-applet-popup').contains(source),'Popup uses original '+id+' content');
    P.closeApplet();if(source)assert(d.querySelector('.desktop-panel').isConnected&&source.closest('.desktop-widget'),'Closing returns live source to widget');
   }
   P.openApplet('assistant');const prompt=d.querySelector('#aiPrompt');prompt.value='Keep this native widget draft';prompt.dispatchEvent(new w.Event('input',{bubbles:true}));P.closeApplet();P.openApplet('assistant');assert.equal(prompt.value,'Keep this native widget draft');P.closeApplet();
   const leftWidth=P.state().panels.find(panel=>panel.id==='panel-left').size;P.updatePanel('panel-left',{size:leftWidth+40});
   vm.runInContext("renderWorkspace('work',false)",dom.getInternalVMContext(),{timeout:10000});await delay(20);assert.notEqual(P.state().panels.find(panel=>panel.id==='panel-left').size,leftWidth+40,'Workspace has independent panel layout');
   vm.runInContext("renderWorkspace('general',false)",dom.getInternalVMContext(),{timeout:10000});await delay(20);assert.equal(P.state().panels.find(panel=>panel.id==='panel-left').size,leftWidth+40,'Returning restores panel layout');
   // The retired compact rack remains a model adapter for hotbar shortcuts.
   // Parking must never expose its duplicate icons beside the native cards.
   const rack=d.querySelector('#appRack'),parkedNotes=()=>d.querySelectorAll('#miniStack [data-mini-card="notes"]');
   const assertRackHidden=stage=>assert.equal(rack.hidden,true,'Retired app rack stays hidden '+stage);
   const rackRules=[...d.querySelectorAll('link[rel="stylesheet"][href]')].flatMap(link=>{
    const filename=link.getAttribute('href').split('?')[0];
    return [...CSSOM.parse(fs.readFileSync(path.join(directory,filename),'utf8')).cssRules];
   }).filter(rule=>rule.selectorText?.includes('#appRack')&&rack.matches(rule.selectorText));
   assert(rackRules.some(rule=>rule.style.getPropertyValue('display')==='none'&&rule.style.getPropertyPriority('display')==='important'),'Loaded styles permanently conceal the retired rack independently of its model updates');
   w.openApp('notes');await delay(20);assertRackHidden('after opening Notes');
   w.minimizeApp('notes');await delay(20);assertRackHidden('after parking Notes');
   assert.equal(parkedNotes().length,1,'Notes has one actual native Parked card');
   assert.equal(d.querySelectorAll('#miniStack [data-mini-restore="notes"]').length,1,'Only the native card provides the visible Notes restore action');
   const parkedSlot=vm.runInContext("hotbarSlotFor('notes')",dom.getInternalVMContext());assert(parkedSlot>0,'Parked Notes keeps its canonical shortcut slot');
   const parkedShortcut=parkedSlot<=10?String(parkedSlot%10):parkedSlot<=20?'⇧'+parkedSlot%10:String(parkedSlot);
   assert.equal(parkedNotes()[0].querySelector('.mini-hotkey').textContent,parkedShortcut,'Native Parked card displays the canonical hotbar number');
   vm.runInContext("renderWorkspace('work',false)",dom.getInternalVMContext(),{timeout:10000});await delay(20);assertRackHidden('after leaving the Notes Workspace');
   vm.runInContext("renderWorkspace('general',false)",dom.getInternalVMContext(),{timeout:10000});await delay(20);assertRackHidden('after returning to the Notes Workspace');assert.equal(parkedNotes().length,1,'Workspace restoration does not duplicate the Notes Parked card');
   vm.runInContext("activateHotbarSlot(hotbarSlotFor('notes'))",dom.getInternalVMContext());await delay(20);assertRackHidden('after restoring Notes by its shortcut command');assert.equal(vm.runInContext('appState.notes',dom.getInternalVMContext()),'open','The canonical shortcut still restores the actual Notes window');assert.equal(parkedNotes().length,0);
   w.minimizeApp('notes');await delay(20);assertRackHidden('after parking Notes again');assert.equal(parkedNotes().length,1);
   parkedNotes()[0].querySelector('[data-mini-restore="notes"]').click();await delay(20);assertRackHidden('after the native Unpark action');assert.equal(parkedNotes().length,0);
   w.closeApp('notes');assertRackHidden('after closing Notes');
   w.openApp('settings');assert(d.querySelector('[data-app-frame="settings"]'),'Settings opens as an ordinary app');
  }
  await delay(40);assert.deepEqual(errors,[],'Widget, Workspace and app actions have no script/event errors');
 }finally{w.close();}
}
(async()=>{await boot();await boot(true);await boot(true,'projects');console.log('Full desktop boot passed: actual page scripts, native widgets, context editing, live popups/drafts, Workspace layout isolation, permanently hidden legacy rack, unique Parked cards and canonical shortcut restoration, app controls, Settings, first-run Guide and body-level Guide Project form pointer/Cancel/close/Escape/Create interactions.');})().catch(error=>{console.error(error);process.exitCode=1;});
