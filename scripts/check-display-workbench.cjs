const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Roles=require('../dist/display-roles.js');
const source=fs.readFileSync(path.join(__dirname,'../dist/display-workbench.js'),'utf8');

// Exercise the production workbench with the real persisted role model. DOM
// and timers are controlled here so stale callbacks can be delivered on purpose.
function harness(){
  const elements=new Map(),timers=new Map(),listeners={},opened=[],folders=[],writes=[];
  let serial=0,workspace='work',localSlot=2,failLaunch=false;
  let roster=[{slot:1,screenWidth:2560,screenHeight:1440},{slot:2,screenWidth:1920,screenHeight:1080}];
  const model=Roles.create();model.connect(roster);model.setRole(2,'assistant');
  function element(){return {hidden:false,value:'',textContent:'',dataset:{},events:{},setAttribute(){},addEventListener(type,fn){this.events[type]=fn;},querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);}};}
  const host=element(),zone={append(node){assert.equal(node,host);}};
  function state(){
    const setup=model.setup();
    return {setupKey:setup.signature,workspaceId:workspace,workspace:workspace==='work'?'Work':'Gaming',localSlot,role:model.role(localSlot),home:'/home/demo/'+workspace,
      displays:setup.displays.map(display=>({...display,label:'Display '+display.slot})),space:model.space(workspace,localSlot),
      localWindows:model.space(workspace,localSlot).windows.map(id=>({id,label:'Note Editor'}))};
  }
  const browser={addEventListener(type,fn){listeners[type]=fn;},SpatialDisplayRoleBridge:{state,
    updateSpace(patch){writes.push({workspace,slot:localSlot,patch});model.updateSpace(workspace,localSlot,patch);browser.SpatialDisplayWorkbench?.refresh();},
    launchNote(title,text){if(failLaunch)return null;const id='note--'+(opened.length+1);opened.push({id,title,text,workspace,slot:localSlot});model.pinWindow(workspace,localSlot,id);browser.SpatialDisplayWorkbench.refresh();return id;},
    openFolder(folder){folders.push({workspace,slot:localSlot,path:folder});},openDisplays(){}}};
  const document={activeElement:null,querySelector:()=>zone,createElement:()=>host};
  const context=vm.createContext({window:browser,document,prepareControlSemantics(){},Date,
    setTimeout(fn){const id=++serial;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},setInterval:()=>1,clearInterval(){}});
  vm.runInContext(source,context);
  const refresh=()=>browser.SpatialDisplayWorkbench.refresh();
  function click(attribute,value){host.events.click({target:{closest(selector){return selector==='['+attribute+']'?{dataset:{[attribute==='data-display-action'?'displayAction':'displayFolder']:value}}:null;}}});}
  function tick(){const next=timers.entries().next().value;assert(next,'Expected a pending demo timer');timers.delete(next[0]);next[1]();}
  return {model,host,document,elements,timers,opened,folders,writes,state,refresh,tick,
    action:name=>click('data-display-action',name),folder:name=>click('data-display-folder',name),
    note(value){const note=elements.get('#displaySideNote');note.value=value;note.events.input({target:note});return note;},
    switchWorkspace(next){workspace=next;refresh();},
    role(next){assert(model.setRole(localSlot,next).ok);refresh();},
    moveDisplay(next){localSlot=next;refresh();},
    changeSetup(){roster=roster.map(display=>({...display,screenWidth:display.screenWidth+100}));model.connect(roster);model.setRole(2,'assistant');refresh();},
    failLaunch(value){failLaunch=value;},listeners};
}

{
  const h=harness();
  h.action('run');assert.equal(h.state().space.assistant.status,'working');assert.equal(h.timers.size,1);
  h.tick();assert.equal(h.opened.length,0,'Preparing the task does not prematurely open its output');
  h.action('pause');assert.equal(h.timers.size,0);assert.equal(h.state().space.assistant.status,'paused');
  h.action('resume');h.tick();h.tick();
  assert.equal(h.state().space.assistant.status,'done');assert.equal(h.opened.length,1);
  assert.equal(h.opened[0].workspace,'work');assert.equal(h.opened[0].slot,2);
  assert(h.opened[0].text.includes('Work — Workspace briefing'));
  assert.equal(h.elements.get('.display-workbench-empty').hidden,true,'An actual output window replaces the empty canvas hint');
  assert.deepEqual(h.model.space('work',1).windows,[],'Assistant never opens the result on the main display');

  h.action('run');
  h.model.setAssistant('work',2,{status:'paused',result:'You took over the workspace.'});h.refresh();
  assert.equal(h.timers.size,0,'An app-window takeover outside the panel cancels the local demo timer');
  assert.equal(h.elements.get('[data-display-action="resume"]').hidden,false);
  h.action('resume');assert.equal(h.timers.size,1);
  h.action('takeover');assert.equal(h.state().space.assistant.status,'needs-you');assert.equal(h.timers.size,0);
  h.action('resume');h.tick();h.tick();h.tick();assert.equal(h.opened.length,2);
}

for(const transition of ['workspace','role','setup','display']){
  const h=harness();h.action('run');
  const stale=h.timers.values().next().value;
  if(transition==='workspace')h.switchWorkspace('gaming');
  if(transition==='role')h.role('extended');
  if(transition==='setup')h.changeSetup();
  if(transition==='display')h.moveDisplay(1);
  assert.equal(h.timers.size,0,transition+': leaving the task context clears its timer');
  stale();assert.equal(h.opened.length,0,transition+': an already dispatched old callback cannot open a result');
  assert.equal(h.timers.size,0,transition+': stale callbacks cannot schedule further work');
  if(transition==='workspace'){
    assert.equal(h.model.space('gaming',2).assistant.status,'idle','A previous Workspace cannot change the new Assistant space');
    h.switchWorkspace('work');assert.equal(h.state().space.assistant.status,'paused','Returning requires an explicit Resume');
    h.action('resume');h.tick();h.tick();h.tick();assert.equal(h.opened[0].workspace,'work');
  }
}

{
  const h=harness();h.failLaunch(true);h.action('run');h.tick();h.tick();h.tick();
  assert.equal(h.state().space.assistant.status,'needs-you','Failed window creation is never reported as Done');
  assert.equal(h.opened.length,0);h.failLaunch(false);h.action('resume');h.tick();
  assert.equal(h.state().space.assistant.status,'done');assert.equal(h.opened.length,1);
}

{
  const h=harness();h.role('side');
  const note=h.note('Work reference');h.document.activeElement=note;
  assert.equal(h.model.space('work',2).note,'Work reference');
  h.model.updateSpace('gaming',2,{note:'Gaming reference'});h.switchWorkspace('gaming');
  assert.equal(note.value,'Gaming reference','A focused note is replaced when its Workspace changes');
  h.note('Gaming update');assert.equal(h.model.space('gaming',2).note,'Gaming update');
  assert.equal(h.model.space('work',2).note,'Work reference','Saving never changes another Workspace note');
  h.folder('documents');assert.equal(h.folders[0].path,'/home/demo/gaming/Documents','Folder shortcuts resolve the current Workspace Home');
  h.switchWorkspace('work');assert.equal(note.value,'Work reference');
  h.folder('home');assert.equal(h.folders[1].path,'/home/demo/work');
  h.note('x'.repeat(8005));assert.equal(note.value.length,8000);assert.equal(h.model.space('work',2).note.length,8000,'The editable value and persisted 8000-character limit agree');
  h.role('assistant');h.note('Hidden control event');assert.equal(h.model.space('work',2).note.length,8000,'A hidden Side note cannot write from another role');
  h.action('run');h.listeners.pagehide();assert.equal(h.timers.size,0,'Leaving the browser cancels pending work');
}
console.log('Display workbench passed: scripted output, pause/resume, takeover, stale callback cancellation, context isolation, output failure and Side note/folder ownership.');
