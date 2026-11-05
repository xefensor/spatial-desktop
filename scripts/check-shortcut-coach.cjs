'use strict';
// Execute the shipped page and input handlers together. Geometry is stubbed;
// the shortcut lessons themselves are driven through their real UI controls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const directory=path.resolve(__dirname,'../dist');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const storageKey='spatial-shortcut-learning-v1';

async function boot(saved={}){
  const errors=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(fs.readFileSync(path.join(directory,'index.html'),'utf8'),{runScripts:'outside-only',pretendToBeVisual:true,url:'https://spatial.test/',virtualConsole});
  const w=dom.window,d=w.document,context=dom.getInternalVMContext(),run=source=>vm.runInContext(source,context);
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
  w.localStorage.setItem('spatial-guide-v1',JSON.stringify({status:'skipped',index:0,version:9}));
  for(const [key,value] of Object.entries(saved))w.localStorage.setItem(key,value);
  w.getComputedStyle=element=>new Proxy(element.style,{get(style,key){if(key===Symbol.iterator)return function*(){for(let index=0;index<style.length;index++)yield style.item(index);};if(key==='getPropertyValue')return name=>style.getPropertyValue(name);if(key==='display')return element.hidden?'none':style.display||'block';if(key==='visibility')return style.visibility||'visible';const value=style[key];return typeof value==='function'?value.bind(style):value||'';}});
  w.matchMedia=query=>({matches:query.includes('reduced-motion'),addEventListener(){},removeEventListener(){}});
  w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};
  w.BroadcastChannel=class{postMessage(){}addEventListener(){}close(){}};
  w.Element.prototype.scrollIntoView=function(){};w.Element.prototype.scrollTo=function(){};
  w.Element.prototype.animate=function(){return {finished:Promise.resolve(),cancel(){}};};
  w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};
  d.documentElement.requestFullscreen=()=>Promise.resolve();
  w.requestAnimationFrame=callback=>w.setTimeout(()=>{try{callback(w.performance.now());}catch(error){errors.push(error.stack);}},0);
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return this.classList?.contains('desktop-shell')?1440:parseFloat(this.style.width)||960;}});
  Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return this.classList?.contains('desktop-shell')?900:parseFloat(this.style.height)||750;}});
  for(const script of d.querySelectorAll('script')){
    const filename=script.getAttribute('src')?.split('?')[0];
    if(script.type&&script.type!=='text/javascript')continue;
    const source=filename?fs.readFileSync(path.join(directory,filename),'utf8'):script.textContent;
    if(source.trim())try{vm.runInContext(source,context,{filename:filename||'inline-page-script',timeout:10000});}catch(error){errors.push((filename||'inline')+': '+error.stack);}
  }
  await delay(50);assert.deepEqual(errors,[],'Actual page bootstraps without errors');
  const coach=w.SpatialShortcutCoach,hint=d.querySelector('#shortcutLearningHint');assert(coach&&hint);
  const mouse=target=>{
    assert(target,'Expected a real mouse target');
    const event=new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1,button:0});target.dispatchEvent(event);return event;
  };
  const key=(type,key,options={})=>{const event=new w.KeyboardEvent(type,{key,code:key,bubbles:true,cancelable:true,...options});d.body.dispatchEvent(event);return event;};
  const overview=()=>d.querySelector('#universalSearch').classList.contains('is-open');
  const mouseOverview=()=>{run('setUniversalSearchOpen(false)');return mouse(d.querySelector('#allAppsToggle'));};
  const shortcutOverview=()=>{run('setUniversalSearchOpen(false)');key('keydown','F2');key('keyup','F2');assert(overview(),'F2 performs the actual Overview action');};
  const change=(selector,checked)=>{const input=d.querySelector(selector);assert(input,'Expected Settings control '+selector);input.checked=checked;input.dispatchEvent(new w.Event('change',{bubbles:true}));};
  return {dom,w,d,run,coach,hint,errors,mouse,key,overview,mouseOverview,shortcutOverview,change};
}

async function check(){
  let h=await boot();
  try{
    const {w,d,run,coach,hint,mouse,key,mouseOverview,shortcutOverview,change}=h;
    // Programmatic actions and Enter/Space activation must not look like mouse
    // practice, even though they invoke the same visible action.
    for(let index=0;index<6;index++){run('setUniversalSearchOpen(false)');d.querySelector('#allAppsToggle').click();}
    run('setUniversalSearchOpen(false)');assert.equal(coach.snapshot().actions.overview,undefined);
    run('setUniversalSearchOpen(true);setUniversalSearchOpen(false)');assert.equal(coach.snapshot().actions.overview,undefined);
    for(let index=0;index<5;index++){mouseOverview();assert(h.overview());assert(hint.hidden,'First five mouse uses stay quiet');}
    const sixth=mouseOverview();assert.equal(sixth.defaultPrevented,false,'The coach never cancels the action');
    assert.equal(coach.snapshot().actions.overview.teaching,true);assert.equal(hint.hidden,false);assert.match(hint.textContent,/Open Overview.*Super.*In demo.*F2/);
    assert.equal(hint.querySelector('button,input,a,[tabindex]'),null,'The hint introduces no focus or click targets');
    const css=fs.readFileSync(path.join(directory,'shortcut-learning.css'),'utf8');assert.match(css,/pointer-events:none!important/,'The visible hint cannot intercept clicks');
    await delay(10);assert.equal(d.activeElement,d.querySelector('#universalSearchInput'),'Overview keeps its normal focus destination');
    shortcutOverview();assert(hint.hidden,'A successful shortcut removes the current reminder immediately');assert.equal(coach.snapshot().actions.overview.shortcutUses,1);
    mouseOverview();assert.equal(coach.snapshot().actions.overview.shortcutUses,1,'A mouse use preserves shortcut practice');
    shortcutOverview();shortcutOverview();assert.equal(coach.snapshot().actions.overview.teaching,false);assert.equal(coach.snapshot().actions.overview.mouseUses,0);
    mouseOverview();assert(hint.hidden,'A single mouse use after learning stays quiet');

    // Window buttons and keyboard shortcuts report the same completed action.
    coach.reset();run("setUniversalSearchOpen(false);launchAppHere('notes')");await delay(20);
    const name=run('frontApp');assert(name);const frame=d.querySelector('[data-app-frame="'+name+'"]');assert(frame);
    for(let index=0;index<6;index++)mouse(frame.querySelector('[data-window-action="maximize"]'));
    assert.equal(coach.snapshot().actions['window-size'].teaching,true,'Real window controls activate a lesson');assert(!hint.hidden);assert.match(hint.textContent,/Alt.*Enter/);
    for(let index=0;index<3;index++){
      const before=frame.dataset.maximized==='true';key('keydown','Enter',{code:'Enter',altKey:true});assert.notEqual(frame.dataset.maximized==='true',before,'Alt+Enter changes actual window state');
    }
    assert.equal(coach.snapshot().actions['window-size'].teaching,false);assert(hint.hidden);

    coach.reset();run('setUniversalSearchOpen(false)');
    if(frame.dataset.maximized==='true')run('focusTileWindow('+JSON.stringify(name)+')');
    run("launchAppHere('browser')");
    const documentText=frame.querySelector('textarea');assert(documentText);
    documentText.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true,button:0}));mouse(documentText);
    assert.equal(run('frontApp'),name,'Ordinary document interaction can focus its window');assert.equal(coach.snapshot().actions['window-focus'],undefined,'Document clicks do not become window-switch practice');
    run('setUniversalSearchOpen(true)');mouse(d.querySelector('[data-overview-open-app="'+name+'"]'));
    assert.equal(coach.snapshot().actions['window-focus'],undefined,'Selecting the already-front window in Overview is a no-op for learning');
    const appsPanel=w.SpatialPanels.state().panels.find(panel=>panel.widgets.includes('apps'));assert(appsPanel);
    w.SpatialPanels.updatePanel(appsPanel.id,{mode:'compact'});w.SpatialPanels.updateWidget('apps',{mode:'compact'});
    for(let index=0;index<6;index++){
      run('minimizeApp('+JSON.stringify(name)+')');w.SpatialPanels.render();
      mouse(d.querySelector('.panel-compact-apps [data-panel-task="'+name+'"]'));
      assert.equal(run('appState['+JSON.stringify(name)+']'),'open','Compact Apps restores the actual parked window');
      assert.equal(run('frontApp'),name);
      if(index<5)assert.equal(coach.snapshot().actions['window-focus'].mouseUses,index+1,'Forwarding compact restore counts exactly once');
    }
    assert.equal(coach.snapshot().actions['window-focus'].teaching,true);assert(!hint.hidden);assert.match(hint.textContent,/Switch to .*Super.*F2/);
    for(let index=0;index<3;index++){
      run('minimizeApp('+JSON.stringify(name)+')');const slot=run('hotbarSlotFor('+JSON.stringify(name)+')');assert(slot>0&&slot<=20);
      const shortcut={code:'Digit'+slot%10,altKey:true,shiftKey:slot>10};key('keydown',String(slot%10),shortcut);
      assert.equal(run('appState['+JSON.stringify(name)+']'),'open','The numbered shortcut restores the real window');assert.equal(run('frontApp'),name);
      if(index===0){
        assert.equal(coach.snapshot().actions['window-focus'].shortcutUses,1);
        key('keydown',String(slot%10),shortcut);assert.equal(run('appState['+JSON.stringify(name)+']'),'minimized','Repeating the focused slot performs the existing park action');
        assert.equal(coach.snapshot().actions['window-focus'].shortcutUses,1,'Parking is not mistaken for another successful focus');
      }
    }
    assert.equal(coach.snapshot().actions['window-focus'].teaching,false);assert(hint.hidden);

    coach.reset();
    for(let index=0;index<6;index++){w.SpatialDesktopMapDesktop.close();mouse(d.querySelector('#desktopContextToggle'));assert(w.SpatialDesktopMapDesktop.isOpen());}
    assert.equal(coach.snapshot().actions['desktop-map'].teaching,true,'Real map button reports opening');assert(!hint.hidden);assert.match(hint.textContent,/desktop map.*Super.*Tab.*F2.*Tab/);
    assert.equal(hint.parentElement,d.querySelector('#spatialDesktopMap'),'The map hint stays inside the active modal accessibility tree');assert.equal(hint.inert,false);
    w.SpatialDesktopMapDesktop.close();await delay(0);assert(hint.hidden,'Closing the map also hides its live hint');
    for(let index=0;index<3;index++){
      w.SpatialDesktopMapDesktop.close();key('keydown','F2');key('keydown','Tab',{code:'Tab'});key('keyup','Tab',{code:'Tab'});key('keyup','F2');assert(w.SpatialDesktopMapDesktop.isOpen(),'F2+Tab opens the actual map');
    }
    assert.equal(coach.snapshot().actions['desktop-map'].teaching,false);w.SpatialDesktopMapDesktop.close();

    w.SpatialSettings.open('shortcuts');
    assert(d.querySelector('[data-shortcut-learning-enabled]'),'Shortcuts settings renders the shipped coach controls');
    change('[data-shortcut-learning-enabled]',false);assert.equal(coach.snapshot().enabled,false);
    for(let index=0;index<6;index++)mouseOverview();assert(hint.hidden);assert.equal(coach.snapshot().actions.overview,undefined,'Disabled learning observes no mouse practice');
    run('setUniversalSearchOpen(false)');w.SpatialSettings.navigate('shortcuts');change('[data-shortcut-learning-action="overview"]',false);assert.equal(coach.snapshot().actions.overview.muted,true);
    const persisted=JSON.parse(w.localStorage.getItem(storageKey));assert.equal(persisted.enabled,false);assert.equal(persisted.actions.overview.muted,true);
    const saved=Object.fromEntries(Object.keys(w.localStorage).map(key=>[key,w.localStorage.getItem(key)]));
    assert.deepEqual(h.errors,[],'Actual input paths report no runtime errors');h.dom.window.close();

    // Restoring the saved category exercises its early-render placeholder:
    // the coach loads later than Settings in the real page script order.
    h=await boot(saved);assert.equal(h.coach.snapshot().enabled,false);assert.equal(h.coach.snapshot().actions.overview.muted,true);
    assert.equal(h.w.SpatialSettings.category(),'shortcuts');assert(h.d.querySelector('[data-shortcut-learning-enabled]'),'Saved Shortcuts page mounts after the late coach loads');
    assert.equal(h.d.querySelector('[data-shortcut-learning-enabled]').checked,false);assert.equal(h.d.querySelector('[data-shortcut-learning-action="overview"]').checked,false);
    h.d.querySelector('[data-setting-action="reset-shortcut-learning"]').click();assert.equal(h.coach.snapshot().enabled,false,'Reset preserves the global learning preference');assert.deepEqual(Object.keys(h.coach.snapshot().actions),[]);assert.equal(h.d.querySelector('[data-shortcut-learning-action="overview"]').checked,true);
    h.change('[data-shortcut-learning-enabled]',true);assert.equal(h.coach.snapshot().enabled,true);assert.equal(JSON.parse(h.w.localStorage.getItem(storageKey)).enabled,true);
    assert.deepEqual(h.errors,[]);
    console.log('Shortcut coach passed: actual pointer and keyboard actions, learning and quieting, passive feedback, Settings controls and persisted navigation.');
  }finally{h.dom.window.close();}
}
check().catch(error=>{console.error(error);process.exitCode=1;});
