'use strict';
// Load the actual page and every script in page order. This is a DOM integration
// check; layout, pointer geometry and visual appearance have separate checks.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const directory=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(directory,'index.html'),'utf8');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function boot(practice=false){
 const errors=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error.message));
 const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://spatial.test/',virtualConsole}),w=dom.window,d=w.document;
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.getComputedStyle=element=>new Proxy(element.style,{get(style,key){if(key==='getPropertyValue')return name=>style.getPropertyValue(name);if(key==='display')return element.hidden?'none':style.display||'block';if(key==='visibility')return style.visibility||'visible';const value=style[key];return typeof value==='function'?value.bind(style):value||'';}});
 if(!practice)w.localStorage.setItem('spatial-guide-v1',JSON.stringify({status:'skipped',index:0,version:9}));
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
   w.openApp('notes');w.minimizeApp('notes');w.openApp('notes');w.closeApp('notes');
   w.openApp('settings');assert(d.querySelector('[data-app-frame="settings"]'),'Settings opens as an ordinary app');
  }
  await delay(40);assert.deepEqual(errors,[],'Widget, Workspace and app actions have no script/event errors');
 }finally{w.close();}
}
(async()=>{await boot();await boot(true);console.log('Full desktop boot passed: actual page scripts, native widgets, context editing, live popups/drafts, Workspace layout isolation, app controls, Settings and first-run Guide.');})().catch(error=>{console.error(error);process.exitCode=1;});
