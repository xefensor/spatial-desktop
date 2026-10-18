const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Roles=require('../dist/display-roles.js');
const source=fs.readFileSync(path.join(__dirname,'../dist/display-workbench.js'),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
// Exercise the real workbench and role model; chat remains the existing tool.
function harness(){
  const elements=new Map(),listeners={},opened=[],folders=[],restored=[],settings=[],chat={mounts:[],unmounts:0,renders:0,attachments:[],notices:[]},side={mounts:[],states:[]},intervals=new Set();
  let serial=0,workspace='work',localSlot=2,parkedWindows=[],captureItems=[],failLaunch=false;
  let roster=[{slot:1,screenWidth:2560,screenHeight:1440},{slot:2,screenWidth:1920,screenHeight:1080}];
  const model=Roles.create();model.connect(roster);model.setRole(2,'assistant');
  function element(){return {hidden:false,value:'',textContent:'',dataset:{},events:{},children:[],replaceChildren(...children){this.children=children;},setAttribute(){},addEventListener(type,fn){this.events[type]=fn;},querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);}};}
  const host=element(),zone={append(node){assert.equal(node,host);}};
  const state=()=>({setupKey:model.setup().signature,workspaceId:workspace,workspace:workspace==='work'?'Work':'Gaming',localSlot,role:model.role(localSlot),home:'/home/demo/'+workspace,
    displays:model.setup().displays.map(display=>({...display,label:'Display '+display.slot})),space:model.space(workspace,localSlot),
    localWindows:model.space(workspace,localSlot).windows.filter(id=>!parkedWindows.some(window=>window.id===id)).map(id=>({id,label:'Note Editor'})),parkedWindows});
  const browser={addEventListener(type,fn){listeners[type]=fn;},SpatialDisplayRoleBridge:{state,
    openFolder(path){folders.push({workspace,slot:localSlot,path});return 'dolphin--1';},
    launchNote(title,text){if(failLaunch)throw Error('Note Editor could not open.');const id='notes--'+(opened.length+1);opened.push({id,title,text,workspace,slot:localSlot});model.pinWindow(workspace,localSlot,id);browser.SpatialDisplayWorkbench.refresh();return id;},
    openWindow(id){restored.push({workspace,slot:localSlot,id});parkedWindows=parkedWindows.filter(window=>window.id!==id);browser.SpatialDisplayWorkbench.refresh();},
    openDisplays(slot){settings.push({workspace,slot});}},
    SpatialAIDesktop:{mountDisplay(host){chat.mounts.push(host);return true;},unmountDisplay(){chat.unmounts++;},render(){chat.renders++;},attach(items){chat.attachments.push(clone(items));},notify(text){chat.notices.push(text);}},
    SpatialAssistantDesktop:{capture(){return clone(captureItems);}},SpatialDisplaySideTools:{mount(host){side.mounts.push(host);},refresh(state){side.states.push(clone(state));}}};
  let created=false;
  const document={querySelector:()=>zone,createElement(){if(!created){created=true;return host;}return element();}};
  vm.runInNewContext(source,{window:browser,document,prepareControlSemantics(){},Date,setTimeout(){throw Error('No pretend Assistant task timers.');},clearTimeout(){},setInterval(){const id=++serial;intervals.add(id);return id;},clearInterval(id){intervals.delete(id);}});
  const refresh=()=>browser.SpatialDisplayWorkbench.refresh();
  function event(attribute,value){return {target:{closest(selector){return selector==='['+attribute+']'||selector==='['+attribute+'="'+value+'"]'?{dataset:{[{'data-display-action':'displayAction','data-display-window':'displayWindow'}[attribute]]:value}}:null;}}};}
  return {model,host,elements,listeners,opened,folders,restored,settings,chat,side,intervals,state,refresh,
    action:name=>host.events.click(event('data-display-action',name)),selectionDown:()=>host.events.pointerdown(event('data-display-action','selection')),capture(items){captureItems=items;},restore:id=>host.events.click(event('data-display-window',id)),
    park(windows){parkedWindows=windows;for(const window of windows)model.pinWindow(workspace,localSlot,window.id);refresh();},
    switchWorkspace(next,render=true){workspace=next;if(render)refresh();},role(next,render=true){assert(model.setRole(localSlot,next).ok);if(render)refresh();},
    moveDisplay(next,render=true){localSlot=next;if(render)refresh();},changeSetup(render=true){roster=roster.map(display=>({...display,screenWidth:display.screenWidth+100}));model.connect(roster);model.setRole(2,'assistant');if(render)refresh();},failLaunch(value){failLaunch=value;}};
}
{
  const h=harness();
  assert.doesNotMatch(h.host.innerHTML,/display-workbench-bar/,'No horizontal helper header');
  assert.doesNotMatch(h.host.innerHTML,/Run demo task|displayAssistantTask/,'A pretend task no longer replaces chat');
  assert.match(h.host.innerHTML,/class="display-assistant-chat"[^>]*aria-label="Assistant chat"/);
  assert.equal(h.chat.mounts.length,1);h.refresh();h.refresh();assert.equal(h.chat.mounts.length,1,'Routine refreshes preserve the chat node and draft');
  h.switchWorkspace('gaming');assert.equal(h.chat.mounts.length,1);assert.equal(h.chat.renders,1,'Workspace changes render the existing chat conversation');
  h.switchWorkspace('work');assert.equal(h.chat.renders,2);
  h.role('side');assert.equal(h.chat.unmounts,1);assert.equal(h.side.mounts.length,1);assert.equal(h.side.states.at(-1).workspaceId,'work');assert.equal(h.intervals.size,1);
  h.refresh();assert.equal(h.side.mounts.length,1,'The Side form is not remounted on refresh');
  h.role('assistant');assert.equal(h.chat.mounts.length,2);assert.equal(h.intervals.size,0);
  h.role('extended');assert.equal(h.chat.unmounts,2);assert.equal(h.host.hidden,true);
  h.moveDisplay(1);assert.equal(h.host.hidden,true,'The main display has no helper workbench');
}
for(const role of ['side','assistant']){
  const h=harness();h.role(role);
  assert.equal(h.elements.get('[data-display-title]').textContent,role==='assistant'?'Assistant':'Side space');assert.match(h.elements.get('[data-display-scope]').textContent,/Work.*Display 2/);
  h.action('settings');assert.deepEqual(h.settings.at(-1),{workspace:'work',slot:2});
  h.action('files');assert.deepEqual(h.folders.at(-1),{workspace:'work',slot:2,path:'/home/demo/work'});
  h.action('note');assert.deepEqual(h.opened.at(-1),{id:'notes--1',title:'Untitled note',text:'',workspace:'work',slot:2});
  h.action('briefing');assert.equal(h.opened.length,2,'A briefing opens immediately in an actual editor');assert.equal(h.opened.at(-1).title,'Workspace briefing');assert.match(h.opened.at(-1).text,/Work — Workspace briefing/);assert.match(h.opened.at(-1).text,/Workspace Home: \/home\/demo\/work/);
  assert.equal(h.elements.get('.display-workbench-empty').hidden,true);assert.deepEqual(h.model.space('work',1).windows,[],'Canvas outputs stay off the main display');
  h.switchWorkspace('gaming');h.action('files');assert.equal(h.folders.at(-1).path,'/home/demo/gaming');
  h.failLaunch(true);h.action('note');assert.match(h.elements.get('[data-display-feedback]').textContent,/could not open/);
}
{
  const h=harness(),selection=[{id:'selected-text',title:'Selected text · Note Editor',kind:'text',text:'Review this paragraph',workspace:'work'}];
  h.capture(selection);h.selectionDown();h.capture([]);h.action('selection');assert.deepEqual(h.chat.attachments,[selection],'Capture happens before button focus removes the selection');
  h.action('selection');assert.equal(h.chat.attachments.length,1);assert.match(h.chat.notices.at(-1),/Select text or files/);
  h.capture(selection);h.selectionDown();h.switchWorkspace('gaming');h.action('selection');assert.equal(h.chat.attachments.length,1,'A Work selection cannot attach to Gaming');
  h.role('side');h.capture(selection);h.selectionDown();h.action('selection');assert.equal(h.chat.attachments.length,1,'Hidden Assistant controls do nothing on Side space');
}
for(const transition of ['workspace','role','setup','display']){
  const h=harness();h.capture([{id:'selected',text:'Work only'}]);h.selectionDown();
  if(transition==='workspace')h.switchWorkspace('gaming',false);if(transition==='role')h.role('side',false);if(transition==='setup')h.changeSetup(false);if(transition==='display')h.moveDisplay(1,false);
  for(const action of ['files','note','briefing','selection'])h.action(action);
  assert.equal(h.opened.length,0,transition+': stale actions cannot open new-context windows');assert.equal(h.folders.length,0);assert.equal(h.chat.attachments.length,0);
}
for(const role of ['side','assistant']){
  const h=harness();h.role(role);assert.equal(h.elements.get('[data-display-parked]').hidden,true);
  h.park([{id:'notes--1',label:'Note Editor',title:'Workspace briefing'}]);assert.equal(h.elements.get('[data-display-parked]').hidden,false);assert.equal(h.elements.get('[data-display-parked-count]').textContent,'1');
  const button=h.elements.get('[data-display-parked-list]').children[0];assert.equal(button.textContent,'Restore Workspace briefing');assert.equal(button.dataset.displayWindow,'notes--1');
  h.restore('notes--1');assert.deepEqual(h.restored[0],{workspace:'work',slot:2,id:'notes--1'});assert.equal(h.elements.get('[data-display-parked]').hidden,true);assert.equal(h.state().localWindows[0].id,'notes--1');
  h.listeners.pagehide();assert.equal(h.intervals.size,0);assert(h.chat.unmounts>=1,'Page exit returns the shared chat node');
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
console.log('Display workbench passed: chat lifecycle, Workspace navigation, real canvas actions, selected inputs, scope guards, parked recovery and header-free tools.');
