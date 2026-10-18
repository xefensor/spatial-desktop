const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Roles=require('../dist/display-roles.js');
const source=fs.readFileSync(path.join(__dirname,'../dist/display-workbench.js'),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
// Exercise production workbench handlers with the real role model. The chat
// and shelf adapters record mount identity, preserving their own live state.
function harness(initialRole='assistant'){
  const elements=new Map(),listeners={},opened=[],folders=[],restored=[],settings=[],controls=[],tasks=[],modeChanges=[],chat={mounts:[],unmounts:0,renders:0,attachments:[],notices:[]},side={mounts:[],states:[]},intervals=new Set();
  let serial=0,workspace='work',localSlot=2,parkedWindows=[],captureItems=[],failLaunch=false,workingFolder='';
  let roster=[{slot:1,screenWidth:2560,screenHeight:1440},{slot:2,screenWidth:1920,screenHeight:1080}];
  const model=Roles.create();model.connect(roster);model.setRole(2,initialRole);
  const document={activeElement:null};
  function element(){return {hidden:false,value:'',textContent:'',dataset:{},events:{},children:[],attributes:{},classList:{toggle(){}},focus(){document.activeElement=this;},replaceChildren(...children){this.children=children;},setAttribute(name,value){this.attributes[name]=value;},addEventListener(type,fn){this.events[type]=fn;},querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);}};}
  const host=element(),zone={append(node){assert.equal(node,host);}};
  const state=()=>({setupKey:model.setup().signature,workspaceId:workspace,workspace:workspace==='work'?'Work':'Gaming',localSlot,role:model.role(localSlot),home:'/home/demo/'+workspace,
    displays:model.setup().displays.map(display=>({...display,label:'Display '+display.slot})),space:model.space(workspace,localSlot),
    localWindows:model.space(workspace,localSlot).windows.filter(id=>!parkedWindows.some(window=>window.id===id)).map(id=>({id,label:'Note Editor'})),parkedWindows});
  const browser={addEventListener(type,fn){listeners[type]=fn;},SpatialDisplayRoleBridge:{state,
    setRole(slot,role){modeChanges.push({slot,role});assert(model.setRole(slot,role).ok);browser.SpatialDisplayWorkbench.refresh();},
    assistantControl(action){controls.push({workspace,slot:localSlot,action});model.setAssistant(workspace,localSlot,{control:action==='takeover'?'user':'assistant',status:action==='takeover'?'paused':'idle'});browser.SpatialDisplayWorkbench.refresh();},
    runAssistantTask(kind){tasks.push({workspace,slot:localSlot,kind});return true;},
    openFolder(path){folders.push({workspace,slot:localSlot,path});return 'dolphin--1';},
    launchNote(title,text){if(failLaunch)throw Error('Note Editor could not open.');const id='notes--'+(opened.length+1);opened.push({id,title,text,workspace,slot:localSlot});model.pinWindow(workspace,localSlot,id);browser.SpatialDisplayWorkbench.refresh();return id;},
    openWindow(id){restored.push({workspace,slot:localSlot,id});parkedWindows=parkedWindows.filter(window=>window.id!==id);browser.SpatialDisplayWorkbench.refresh();},
    openDisplays(slot){settings.push({workspace,slot});}},
    SpatialAIDesktop:{mountDisplay(host){chat.mounts.push(host);return true;},unmountDisplay(){chat.unmounts++;},render(){chat.renders++;},attach(items){chat.attachments.push(clone(items));},notify(text){chat.notices.push(text);},workingFolder:()=>workingFolder},
    SpatialAssistantDesktop:{capture(){return clone(captureItems);}},SpatialDisplaySideTools:{mount(host){side.mounts.push(host);},refresh(state){side.states.push(clone(state));}}};
  let created=false;
  document.querySelector=()=>zone;document.createElement=()=>{if(!created){created=true;return host;}return element();};
  vm.runInNewContext(source,{window:browser,document,prepareControlSemantics(){},Date,setTimeout(){throw Error('No pretend Assistant task timers.');},clearTimeout(){},setInterval(){const id=++serial;intervals.add(id);return id;},clearInterval(id){intervals.delete(id);}});
  const refresh=()=>browser.SpatialDisplayWorkbench.refresh();
  function event(attribute,value,{inChat=false}={}){return {target:{closest(selector){
    if(selector==='['+attribute+']'||selector==='['+attribute+'="'+value+'"]')return {dataset:{[{'data-display-action':'displayAction','data-display-window':'displayWindow'}[attribute]]:value}};
    if(selector==='[data-display-assistant]')return inChat?elements.get('[data-display-assistant]'):null;
    return null;
  }}};}
  return {model,host,elements,listeners,opened,folders,restored,settings,controls,tasks,modeChanges,chat,side,intervals,state,refresh,document,
    action:(name,options)=>host.events.click(event('data-display-action',name,options)),selectionDown:()=>host.events.pointerdown(event('data-display-action','selection',{inChat:true})),capture(items){captureItems=items;},restore:id=>host.events.click(event('data-display-window',id)),
    tabKey(key){let prevented=false;host.events.keydown({key,target:{closest:selector=>selector==='[role="tab"]'?{}:null},preventDefault(){prevented=true;},stopPropagation(){}});return prevented;},
    reveal(detail={}){listeners['spatial-assistant-display-reveal']({detail});},
    park(windows){parkedWindows=windows;for(const window of windows)model.pinWindow(workspace,localSlot,window.id);refresh();},
    switchWorkspace(next,render=true){workspace=next;if(render)refresh();},role(next,render=true){assert(model.setRole(localSlot,next).ok);if(render)refresh();},
    moveDisplay(next,render=true){localSlot=next;if(render)refresh();},changeSetup(render=true){roster=roster.map(display=>({...display,screenWidth:display.screenWidth+100}));model.connect(roster);model.setRole(2,'assistant');if(render)refresh();},failLaunch(value){failLaunch=value;},folder(path){workingFolder=path;}};
}
{
  const h=harness();
  assert.doesNotMatch(h.host.innerHTML,/display-workbench-bar/,'No horizontal helper header');
  assert.doesNotMatch(h.host.innerHTML,/Run demo task|displayAssistantTask/,'Shared chat remains the real chat implementation');
  assert.match(h.host.innerHTML,/class="display-assistant-chat"[^>]*aria-label="Assistant chat"/);
  assert.equal(h.host.dataset.displayTool,'chat');assert.equal(h.chat.mounts.length,1);assert.equal(h.side.mounts.length,1,'Both modes have the same shelf and chat');
  h.refresh();h.refresh();assert.equal(h.chat.mounts.length,1);assert.equal(h.side.mounts.length,1,'Routine refreshes preserve chat and reference node identities');
  h.action('references');const shelf=h.side.mounts[0],chat=h.chat.mounts[0];
  assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.elements.get('[data-display-assistant]').hidden,true);assert.equal(h.intervals.size,1);
  h.role('side');assert.equal(h.chat.unmounts,0,'Changing who controls the space preserves its live chat');assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.chat.mounts[0],chat);assert.equal(h.side.mounts[0],shelf);
  h.action('chat');assert.equal(h.host.dataset.displayTool,'chat');assert.equal(h.intervals.size,0);
  h.role('assistant');assert.equal(h.host.dataset.displayTool,'chat');assert.equal(h.chat.mounts.length,1);assert.equal(h.side.mounts.length,1);
  h.switchWorkspace('gaming');assert.equal(h.host.dataset.displayTool,'chat');h.action('references');
  h.switchWorkspace('work');assert.equal(h.host.dataset.displayTool,'chat','Each Workspace restores its chosen tool');
  h.switchWorkspace('gaming');assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.chat.mounts.length,1);assert.equal(h.side.states.at(-1).workspaceId,'gaming');
  h.role('extended');assert.equal(h.chat.unmounts,1);assert.equal(h.host.hidden,true);assert.equal(h.intervals.size,0);
  h.moveDisplay(1);assert.equal(h.host.hidden,true,'The main display has no helper workbench');
}
for(const role of ['side','assistant']){
  const h=harness(role);
  assert.equal(h.host.dataset.displayTool,role==='assistant'?'chat':'references','A new display starts with the mode’s most useful tool');
  assert.equal(h.elements.get('[data-display-title]').textContent,role==='assistant'?'Assistant':'Side space');assert.match(h.elements.get('[data-display-scope]').textContent,/Work.*Display 2/);
  h.action('settings');assert.deepEqual(h.settings.at(-1),{workspace:'work',slot:2});
  h.action('files');assert.deepEqual(h.folders.at(-1),{workspace:'work',slot:2,path:'/home/demo/work'});
  h.action('chat');h.folder('/home/demo/work/Projects/Website Launch');h.action('files',{inChat:true});assert.equal(h.folders.at(-1).path,'/home/demo/work/Projects/Website Launch','Chat opens its selected working folder');h.folder('');
  h.action('note');assert.deepEqual(h.opened.at(-1),{id:'notes--1',title:'Untitled note',text:'',workspace:'work',slot:2});
  h.action('briefing');assert.equal(h.opened.length,2,'A manual briefing opens immediately in an actual editor');assert.equal(h.opened.at(-1).title,'Workspace briefing');assert.match(h.opened.at(-1).text,/Work — Workspace briefing/);assert.match(h.opened.at(-1).text,/Workspace Home: \/home\/demo\/work/);
  assert.equal(h.elements.get('.display-workbench-empty').hidden,true);assert.deepEqual(h.model.space('work',1).windows,[],'Canvas outputs stay off the main display');
  h.switchWorkspace('gaming');h.action('files');assert.equal(h.folders.at(-1).path,'/home/demo/gaming');
  h.failLaunch(true);h.action('note');assert.match(h.elements.get('[data-display-feedback]').textContent,/could not open/);
}
{
  const h=harness('side');h.model.pinWindow('work',2,'notes--existing');
  h.model.updateSpace('work',2,{note:'Shared scratch note',folders:[{kind:'folder',path:'/home/demo/work/Documents'}]});
  h.action('mode');assert.deepEqual(h.modeChanges.at(-1),{slot:2,role:'assistant'});assert.deepEqual(h.model.space('work',2).windows,['notes--existing']);assert.equal(h.model.space('work',2).note,'Shared scratch note');assert.equal(h.host.dataset.displayTool,'references','Handing control to Assistant preserves the tool being used');
  h.action('task-briefing');h.action('task-image');assert.deepEqual(h.tasks,[{workspace:'work',slot:2,kind:'briefing'},{workspace:'work',slot:2,kind:'image'}]);
  h.model.setAssistant('work',2,{status:'done',result:'Opened the reference image.'});h.refresh();
  h.action('takeover');assert.deepEqual(h.controls.at(-1),{workspace:'work',slot:2,action:'takeover'});assert.equal(h.elements.get('[data-display-control-status]').textContent,'You’re in control');assert.equal(h.elements.get('[data-display-action="takeover"]').hidden,true);assert.equal(h.elements.get('[data-display-action="resume"]').hidden,false);assert.equal(h.elements.get('[data-display-action="task-image"]').disabled,true);
  assert.equal(h.elements.get('[data-display-task-summary]').textContent,'Assistant will wait until you choose Continue.');assert.equal(h.model.space('work',2).assistant.result,'Opened the reference image.','Taking control keeps the task result');
  h.action('resume');assert.equal(h.elements.get('[data-display-task-summary]').textContent,'Opened the reference image.','Returning control shows the retained result');assert.equal(h.elements.get('[data-display-control-status]').textContent,'Ready');assert.equal(h.elements.get('[data-display-action="task-image"]').disabled,false);
  h.model.setAssistant('work',2,{status:'working',task:'Preparing a reference'});h.refresh();assert.equal(h.elements.get('[data-display-control-status]').textContent,'Working');assert.equal(h.elements.get('[data-display-action="task-briefing"]').disabled,true);
  h.model.setAssistant('work',2,{status:'needs-you',result:'Choose a reference'});h.refresh();assert.equal(h.elements.get('[data-display-control-status]').textContent,'Needs your input');assert.equal(h.elements.get('[data-display-task-summary]').textContent,'Choose a reference');
  h.action('mode');assert.deepEqual(h.modeChanges.at(-1),{slot:2,role:'side'});assert.equal(h.elements.get('[data-display-control]').hidden,true);const count=h.controls.length,taskCount=h.tasks.length;
  h.action('takeover');h.action('resume');h.action('task-image');assert.equal(h.controls.length,count);assert.equal(h.tasks.length,taskCount,'Side mode cannot invoke Assistant control from hidden controls');
  assert.equal(h.model.space('work',2).note,'Shared scratch note');assert.equal(h.model.space('work',2).folders.length,1);
}
{
  const h=harness('side'),focus={label:'Keep this editor focused'};h.document.activeElement=focus;h.refresh();assert.equal(h.document.activeElement,focus,'A routine display refresh does not steal focus');
  h.reveal({workspace:'gaming'});assert.equal(h.host.dataset.displayTool,'references','A reveal for another Workspace is ignored');
  h.reveal({workspace:'work'});assert.equal(h.host.dataset.displayTool,'chat');assert.equal(h.document.activeElement,focus,'Opening the shared tool leaves focus decisions to its caller');
  assert.equal(h.tabKey('End'),true);assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.document.activeElement,h.elements.get('[data-display-action="references"]'));
  assert.equal(h.elements.get('[data-display-action="references"]').attributes['aria-selected'],'true');assert.equal(h.elements.get('[data-display-action="chat"]').attributes.tabindex,'-1');
  h.tabKey('ArrowRight');assert.equal(h.host.dataset.displayTool,'chat');h.tabKey('Home');assert.equal(h.host.dataset.displayTool,'chat');assert.equal(h.tabKey('Tab'),false,'Normal Tab navigation is retained');
}
for(const role of ['side','assistant']){
  const h=harness(role),selection=[{id:'selected-text',title:'Selected text · Note Editor',kind:'text',text:'Review this paragraph',workspace:'work'}];h.action('chat');
  h.capture(selection);h.selectionDown();h.capture([]);h.action('selection',{inChat:true});assert.deepEqual(h.chat.attachments,[selection],'Selection is captured before button focus removes it in either mode');
  h.action('selection',{inChat:true});assert.equal(h.chat.attachments.length,1);assert.match(h.chat.notices.at(-1),/Select text or files/);
  h.capture(selection);h.selectionDown();h.switchWorkspace('gaming');h.action('selection',{inChat:true});assert.equal(h.chat.attachments.length,1,'A Work selection cannot attach to Gaming');
  h.action('references');const opened=h.opened.length,folders=h.folders.length;h.action('note',{inChat:true});h.action('files',{inChat:true});h.capture(selection);h.selectionDown();h.action('selection',{inChat:true});
  assert.equal(h.chat.attachments.length,1,'Hidden chat controls cannot attach');assert.equal(h.opened.length,opened);assert.equal(h.folders.length,folders);
}
for(const transition of ['workspace','role','setup','display']){
  const h=harness();h.capture([{id:'selected',text:'Work only'}]);h.selectionDown();
  if(transition==='workspace')h.switchWorkspace('gaming',false);if(transition==='role')h.role('side',false);if(transition==='setup')h.changeSetup(false);if(transition==='display')h.moveDisplay(1,false);
  for(const action of ['files','note','briefing','selection','mode','takeover','resume','task-briefing','task-image','references'])h.action(action);
  assert.equal(h.opened.length,0,transition+': stale actions cannot open new-context windows');assert.equal(h.folders.length,0);assert.equal(h.chat.attachments.length,0);assert.equal(h.controls.length,0);assert.equal(h.tasks.length,0);assert.equal(h.modeChanges.length,0);
}
for(const role of ['side','assistant']){
  const h=harness(role);assert.equal(h.elements.get('[data-display-parked]').hidden,true);
  h.park([{id:'notes--1',label:'Note Editor',title:'Workspace briefing'}]);assert.equal(h.elements.get('[data-display-parked]').hidden,false);assert.equal(h.elements.get('[data-display-parked-count]').textContent,'1');
  const button=h.elements.get('[data-display-parked-list]').children[0];assert.equal(button.textContent,'Restore Workspace briefing');assert.equal(button.dataset.displayWindow,'notes--1');
  h.restore('notes--1');assert.deepEqual(h.restored[0],{workspace:'work',slot:2,id:'notes--1'});assert.equal(h.elements.get('[data-display-parked]').hidden,true);assert.equal(h.state().localWindows[0].id,'notes--1');
  h.action('references');const mounts=h.chat.mounts.length,shelfMounts=h.side.mounts.length;
  h.listeners.pagehide();assert.equal(h.intervals.size,0);assert.equal(h.chat.unmounts,1,'Page exit returns the shared chat node');
  h.listeners.pageshow();assert.equal(h.chat.mounts.length,mounts+1,'The page cache remounts chat in either supporting mode');assert.equal(h.side.mounts.length,shelfMounts,'Page cache return does not duplicate shelf listeners');assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.intervals.size,1,'Returning to References restarts its clock');
}
// A pinned helper window deliberately does not share the active Project/page.
// Exercise the actual selection predicates so the chat can use its contents
// while still rejecting windows on another display or in another Workspace.
{
  const adapter=fs.readFileSync(path.join(__dirname,'../dist/assistant-desktop.js'),'utf8');
  const between=(start,end)=>adapter.slice(adapter.indexOf(start),adapter.indexOf(end,adapter.indexOf(start)));
  let pinned=true,local=true;
  const frame={dataset:{appFrame:'notes--1'},hidden:false,contains:()=>true};
  const field={value:'Before HELPER TEXT after',selectionStart:7,selectionEnd:18,closest:()=>frame,matches:query=>query.startsWith('textarea')};
  const context={activeWorkspace:'work',appState:{'notes--1':'open'},isLocalApp:()=>local,desktopPages:{inColumn:()=>false,pageOf:()=>0,current:()=>3},
    SpatialDisplayRoleBridge:{windowContextKey:()=>pinned?'work:display-role:assistant:2':null},document:{activeElement:field},window:{getSelection:()=>null}};
  vm.createContext(context);vm.runInContext(between('function local(frame)','function scope(frame)')+between('function selectedText()','function selectionSource('),context);
  assert.equal(context.selectedText().text,'HELPER TEXT','Pinned helper text can be selected despite a different active Project/desktop');
  local=false;assert.equal(context.selectedText(),null,'Pinned text on another display cannot be captured');
  local=true;pinned=false;assert.equal(context.selectedText(),null,'A non-pinned window on another desktop cannot be captured');
  pinned=true;context.appState['notes--1']='closed';assert.equal(context.selectedText(),null,'A closed helper window cannot supply a selection');
  context.appState['notes--1']='open';frame.hidden=true;assert.equal(context.selectedText(),null,'A hidden helper window cannot supply a selection');
}
console.log('Display workbench passed: shared tools and mode handoff, explicit control status, real canvas actions, selections, focus, stale guards, tab keyboard access and page-cache lifecycle.');
