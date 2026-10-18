const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Roles=require('../dist/display-roles.js');
const source=fs.readFileSync(path.join(__dirname,'../dist/display-workbench.js'),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
// Exercise production workbench handlers with the real role model. The chat
// and shelf adapters record mount identity, preserving their own live state.
function harness(initialAllowed=true){
  const elements=new Map(),listeners={},opened=[],folders=[],restored=[],settings=[],controls=[],tasks=[],examples=[],answers=[],stops=[],permissionChanges=[],chat={mounts:[],unmounts:0,renders:0,attachments:[],notices:[],taskStates:[]},side={mounts:[],states:[]},intervals=new Set();
  let serial=0,workspace='work',localSlot=2,parkedWindows=[],captureItems=[],failLaunch=false,blockedFolder=false,workingFolder='',currentChat='chat-1';
  let roster=[{slot:1,screenWidth:2560,screenHeight:1440},{slot:2,screenWidth:1920,screenHeight:1080}];
  const model=Roles.create();model.connect(roster);model.setRole(2,'side');model.setAssistantAllowed('work',2,initialAllowed);
  const document={activeElement:null};
  function element(){return {hidden:false,value:'',textContent:'',dataset:{},events:{},children:[],attributes:{},classList:{toggle(){}},focus(){document.activeElement=this;},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},querySelectorAll(selector){const all=node=>node.children.flatMap(child=>[child,...all(child)]);return selector==='[data-display-example]'?all(this).filter(child=>child.dataset.displayExample):[];},setAttribute(name,value){this.attributes[name]=value;},addEventListener(type,fn){this.events[type]=fn;},querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);}};}
  const host=element(),zone={append(node){assert.equal(node,host);}};
  const state=()=>({setupKey:model.setup().signature,workspaceId:workspace,workspace:workspace==='work'?'Work':'Gaming',localSlot,role:model.role(localSlot),home:'/home/demo/'+workspace,
    displays:model.setup().displays.map(display=>({...display,label:'Display '+display.slot,assistantAllowed:model.space(workspace,display.slot).assistant.allowed})),space:model.space(workspace,localSlot),
    localWindows:model.space(workspace,localSlot).windows.filter(id=>!parkedWindows.some(window=>window.id===id)).map(id=>({id,label:'Note Editor'})),parkedWindows});
  const browser={addEventListener(type,fn){listeners[type]=fn;},SpatialDisplayRoleBridge:{state,
    setAssistantAllowed(slot,allowed){permissionChanges.push({workspace,slot,allowed});const result=model.setAssistantAllowed(workspace,slot,allowed);browser.SpatialDisplayWorkbench.refresh();return result;},
    assistantControl(action){controls.push({workspace,slot:localSlot,action});model.setAssistant(workspace,localSlot,{control:action==='takeover'?'user':'assistant',status:action==='takeover'?'paused':'idle'});browser.SpatialDisplayWorkbench.refresh();},
    assistantExamples(){return [{id:'checklist',title:'Turn a brief into a checklist',prompt:'Make a launch checklist from this brief.',input:'A short sample launch brief',outcome:'Source note, editable checklist and saved Markdown copy'},{id:'image',title:'Convert an image for the web',prompt:'Convert this image to WebP.',input:'A bundled keyboard photograph',outcome:'Image preview and a conversion to review'},{id:'compare',title:'Compare two text versions',prompt:'Compare these release notes.',input:'Two sample versions',outcome:'An exact line comparison'}];},
    runAssistantExample(id){examples.push({workspace,slot:localSlot,id});return true;},
    answerAssistantExample(choiceId,tokens){answers.push({choiceId,...tokens});return true;},
    stopAssistantExample(){stops.push({workspace,slot:localSlot});return true;},
    runAssistantTask(kind){tasks.push({workspace,slot:localSlot,kind});return true;},
    openFolder(path){folders.push({workspace,slot:localSlot,path});return 'dolphin--1';},
    launchNote(title,text){if(failLaunch)throw Error('Note Editor could not open.');const id='notes--'+(opened.length+1);opened.push({id,title,text,workspace,slot:localSlot});model.pinWindow(workspace,localSlot,id);browser.SpatialDisplayWorkbench.refresh();return id;},
    openWindow(id){restored.push({workspace,slot:localSlot,id});parkedWindows=parkedWindows.filter(window=>window.id!==id);browser.SpatialDisplayWorkbench.refresh();},
    openDisplays(slot){settings.push({workspace,slot});}},
    SpatialAIDesktop:{setDisplayTask(state){chat.taskStates.push(state?clone(state):null);},validateWorkingFolder(path){if(blockedFolder)throw Error('Assistant already names a file. Rename it before using this working folder.');return path;},current:()=>({id:currentChat}),mountDisplay(host){chat.mounts.push(host);return true;},unmountDisplay(){chat.unmounts++;},render(){chat.renders++;},attach(items){chat.attachments.push(clone(items));},notify(text){chat.notices.push(text);},workingFolder:()=>workingFolder},
    SpatialAssistantDesktop:{capture(){return clone(captureItems);}},SpatialDisplaySideTools:{mount(host){side.mounts.push(host);},refresh(state){side.states.push(clone(state));}}};
  let created=false;
  document.querySelector=()=>zone;document.createElement=()=>{if(!created){created=true;return host;}return element();};
  vm.runInNewContext(source,{window:browser,document,prepareControlSemantics(){},Date,setTimeout(){throw Error('No pretend Assistant task timers.');},clearTimeout(){},setInterval(){const id=++serial;intervals.add(id);return id;},clearInterval(id){intervals.delete(id);}});
  const refresh=()=>browser.SpatialDisplayWorkbench.refresh();
  function event(attribute,value,{inChat=false,dataset={}}={}){return {target:{closest(selector){
    if(selector==='['+attribute+']'||selector==='['+attribute+'="'+value+'"]')return {dataset:{[{'data-display-action':'displayAction','data-display-window':'displayWindow','data-display-example':'displayExample','data-display-example-answer':'displayExampleAnswer'}[attribute]]:value,...dataset}};
    if(selector==='[data-display-assistant]')return inChat?elements.get('[data-display-assistant]'):null;
    return null;
  }}};}
  return {model,host,elements,listeners,opened,folders,restored,settings,controls,tasks,examples,answers,stops,permissionChanges,chat,side,intervals,state,refresh,document,
    action:(name,options)=>host.events.click(event('data-display-action',name,options)),example:id=>host.events.click(event('data-display-example',id)),answer:(id,tokens={})=>host.events.click(event('data-display-example-answer',id,{inChat:true,dataset:{displayQuestion:tokens.questionId,displayOperation:tokens.operationId}})),selectionDown:()=>host.events.pointerdown(event('data-display-action','selection',{inChat:true})),toolsDown:()=>host.events.pointerdown({target:{closest:selector=>selector==='[data-display-tools] summary'?{}:null}}),capture(items){captureItems=items;},restore:id=>host.events.click(event('data-display-window',id)),
    tabKey(key){let prevented=false;host.events.keydown({key,target:{closest:selector=>selector==='[role="tab"]'?{}:null},preventDefault(){prevented=true;},stopPropagation(){}});return prevented;},
    reveal(detail={}){listeners['spatial-assistant-display-reveal']({detail});},
    park(windows){parkedWindows=windows;for(const window of windows)model.pinWindow(workspace,localSlot,window.id);refresh();},
    permission(allowed){host.events.change({target:{closest:selector=>selector==='[data-display-assistant-allowed]'?{checked:allowed}:null}});},
    allowed(next,render=true){model.setAssistantAllowed(workspace,localSlot,next);if(render)refresh();},
    switchWorkspace(next,render=true){workspace=next;if(render)refresh();},role(next,render=true){assert(model.setRole(localSlot,next).ok);if(render)refresh();},
    moveDisplay(next,render=true){localSlot=next;if(render)refresh();},changeSetup(render=true){roster=roster.map(display=>({...display,screenWidth:display.screenWidth+100}));model.connect(roster);model.setRole(2,'side');if(render)refresh();},failLaunch(value){failLaunch=value;},folder(path){workingFolder=path;},blockFolder(value){blockedFolder=value;},chatId(id){currentChat=id;listeners['spatial-ai-chat-change']({detail:{workspace,chatId:id}});}};
}
{
  const h=harness();
  assert.doesNotMatch(h.host.innerHTML,/display-workbench-bar/,'No horizontal helper header');
  assert.doesNotMatch(h.host.innerHTML,/Run demo task|displayAssistantTask/,'Shared chat remains the real chat implementation');
  assert.match(h.host.innerHTML,/class="display-assistant-chat"[^>]*aria-label="Assistant chat"/);
  assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.chat.mounts.length,1);assert.equal(h.side.mounts.length,1,'The same Side space has both shelf and chat');h.action('chat');
  h.refresh();h.refresh();assert.equal(h.chat.mounts.length,1);assert.equal(h.side.mounts.length,1,'Routine refreshes preserve chat and reference node identities');
  h.action('references');const shelf=h.side.mounts[0],chat=h.chat.mounts[0];
  assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.elements.get('[data-display-assistant]').hidden,true);assert.equal(h.intervals.size,1);
  h.permission(false);assert.equal(h.chat.unmounts,0,'Changing who controls the space preserves its live chat');assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.chat.mounts[0],chat);assert.equal(h.side.mounts[0],shelf);
  h.action('chat');assert.equal(h.host.dataset.displayTool,'chat');assert.equal(h.intervals.size,0);
  h.permission(true);assert.equal(h.host.dataset.displayTool,'chat');assert.equal(h.chat.mounts.length,1);assert.equal(h.side.mounts.length,1);
  h.switchWorkspace('gaming');assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.elements.get('[data-display-assistant-allowed]').checked,false,'Permission never carries into a new Workspace');h.action('references');
  h.switchWorkspace('work');assert.equal(h.host.dataset.displayTool,'chat','Each Workspace restores its chosen tool');
  h.switchWorkspace('gaming');assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.chat.mounts.length,1);assert.equal(h.side.states.at(-1).workspaceId,'gaming');
  h.role('extended');assert.equal(h.chat.unmounts,1);assert.equal(h.host.hidden,true);assert.equal(h.intervals.size,0);
  h.moveDisplay(1);assert.equal(h.host.hidden,true,'The main display has no helper workbench');
}
for(const allowed of [false,true]){
  const h=harness(allowed);
  assert.equal(h.host.dataset.displayTool,'references','A Side space starts with references regardless of permission');
  assert.equal(h.elements.get('[data-display-title]').textContent,'Side space');assert.match(h.elements.get('[data-display-scope]').textContent,/Work.*Display 2/);
  h.action('settings');assert.deepEqual(h.settings.at(-1),{workspace:'work',slot:2});
  h.action('files');assert.deepEqual(h.folders.at(-1),{workspace:'work',slot:2,path:'/home/demo/work'});
  h.action('chat');h.folder('/home/demo/work/Projects/Website Launch');h.action('files',{inChat:true});assert.equal(h.folders.at(-1).path,'/home/demo/work/Projects/Website Launch','Chat opens its selected working folder');h.folder('/home/demo/work/Projects/Website Launch/Assistant');h.refresh();h.action('working-folder',{inChat:true});assert.equal(h.folders.at(-1).path,'/home/demo/work/Projects/Website Launch/Assistant');assert.equal(h.elements.get('[data-display-folder-name]').textContent,'Website Launch / Assistant');assert.equal(h.elements.get('[data-display-action="working-folder"]').title,'/home/demo/work/Projects/Website Launch/Assistant');h.folder('');
  h.action('note');assert.deepEqual(h.opened.at(-1),{id:'notes--1',title:'Untitled note',text:'',workspace:'work',slot:2});
  h.action('briefing');assert.equal(h.opened.length,2,'A manual briefing opens immediately in an actual editor');assert.equal(h.opened.at(-1).title,'Workspace briefing');assert.match(h.opened.at(-1).text,/Work — Workspace briefing/);assert.match(h.opened.at(-1).text,/Workspace Home: \/home\/demo\/work/);
  assert.equal(h.elements.get('.display-workbench-empty').hidden,true);assert.deepEqual(h.model.space('work',1).windows,[],'Canvas outputs stay off the main display');
  h.switchWorkspace('gaming');h.action('files');assert.equal(h.folders.at(-1).path,'/home/demo/gaming');
  h.failLaunch(true);h.action('note');assert.match(h.elements.get('[data-display-feedback]').textContent,/could not open/);
}
{
  const h=harness(false);h.model.pinWindow('work',2,'notes--existing');
  h.model.updateSpace('work',2,{note:'Shared scratch note',folders:[{kind:'folder',path:'/home/demo/work/Documents'}]});
  h.permission(true);assert.deepEqual(h.permissionChanges.at(-1),{workspace:'work',slot:2,allowed:true});assert.deepEqual(h.model.space('work',2).windows,['notes--existing']);assert.equal(h.model.space('work',2).note,'Shared scratch note');assert.equal(h.host.dataset.displayTool,'references','Handing control to Assistant preserves the tool being used');
  h.action('task-briefing');h.action('task-image');assert.deepEqual(h.tasks,[{workspace:'work',slot:2,kind:'briefing'},{workspace:'work',slot:2,kind:'image'}]);
  h.model.setAssistant('work',2,{status:'done',result:'Opened the reference image.'});h.refresh();
  h.action('takeover');assert.deepEqual(h.controls.at(-1),{workspace:'work',slot:2,action:'takeover'});assert.equal(h.elements.get('[data-display-control-status]').textContent,'You’re in control');assert.equal(h.elements.get('[data-display-action="takeover"]').hidden,true);assert.equal(h.elements.get('[data-display-action="resume"]').hidden,false);
  assert.equal(h.model.space('work',2).assistant.result,'Opened the reference image.','Taking control keeps the task result');
  h.action('resume');assert.equal(h.model.space('work',2).assistant.result,'Opened the reference image.','Returning control retains the completed result');assert.equal(h.elements.get('[data-display-control-status]').textContent,'Ready');
  h.model.setAssistant('work',2,{status:'working',task:'Preparing a reference'});h.refresh();assert.equal(h.elements.get('[data-display-control-status]').textContent,'Working');
  h.model.setAssistant('work',2,{status:'needs-you',result:'Choose a reference'});h.refresh();assert.equal(h.elements.get('[data-display-control-status]').textContent,'Needs your input');
  h.permission(false);assert.deepEqual(h.permissionChanges.at(-1),{workspace:'work',slot:2,allowed:false});assert.equal(h.elements.get('[data-display-control]').hidden,false);assert.equal(h.elements.get('[data-display-assistant-allowed]').checked,false);assert.equal(h.elements.get('[data-display-control-status]').textContent,'You’re in control');assert.equal(h.elements.get('[data-display-action="takeover"]').hidden,true);assert.equal(h.elements.get('[data-display-action="resume"]').hidden,true);const count=h.controls.length,taskCount=h.tasks.length;
  h.action('takeover');h.action('resume');h.action('task-image');assert.equal(h.controls.length,count);assert.equal(h.tasks.length,taskCount,'Permission off cannot invoke Assistant control from hidden controls');
  assert.equal(h.model.space('work',2).note,'Shared scratch note');assert.equal(h.model.space('work',2).folders.length,1);assert.equal(h.state().role,'side');assert.deepEqual(h.model.space('work',2).windows,['notes--existing'],'Permission toggles preserve the actual display windows');
}
{
  const h=harness(false),focus={label:'Keep this editor focused'};h.document.activeElement=focus;h.refresh();assert.equal(h.document.activeElement,focus,'A routine display refresh does not steal focus');
  h.reveal({workspace:'gaming'});assert.equal(h.host.dataset.displayTool,'references','A reveal for another Workspace is ignored');
  h.reveal({workspace:'work'});assert.equal(h.host.dataset.displayTool,'chat');assert.equal(h.document.activeElement,focus,'Opening the shared tool leaves focus decisions to its caller');
  assert.equal(h.tabKey('End'),true);assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.document.activeElement,h.elements.get('[data-display-action="references"]'));
  assert.equal(h.elements.get('[data-display-action="references"]').attributes['aria-selected'],'true');assert.equal(h.elements.get('[data-display-action="chat"]').attributes.tabindex,'-1');
  h.tabKey('ArrowRight');assert.equal(h.host.dataset.displayTool,'chat');h.tabKey('Home');assert.equal(h.host.dataset.displayTool,'chat');assert.equal(h.tabKey('Tab'),false,'Normal Tab navigation is retained');
}
for(const allowed of [false,true]){
  const h=harness(allowed),selection=[{id:'selected-text',title:'Selected text · Note Editor',kind:'text',text:'Review this paragraph',workspace:'work'}];h.action('chat');
  h.capture(selection);h.selectionDown();h.capture([]);h.action('selection',{inChat:true});assert.deepEqual(h.chat.attachments,[selection],'Selection is captured before button focus removes it in either permission state');
  h.action('selection',{inChat:true});assert.equal(h.chat.attachments.length,1);assert.match(h.chat.notices.at(-1),/Select text or files/);
  h.capture(selection);h.selectionDown();h.switchWorkspace('gaming');h.action('selection',{inChat:true});assert.equal(h.chat.attachments.length,1,'A Work selection cannot attach to Gaming');
  h.action('references');const opened=h.opened.length,folders=h.folders.length;h.action('note',{inChat:true});h.action('files',{inChat:true});h.capture(selection);h.selectionDown();h.action('selection',{inChat:true});
  assert.equal(h.chat.attachments.length,1,'Hidden chat controls cannot attach');assert.equal(h.opened.length,opened);assert.equal(h.folders.length,folders);
}
for(const transition of ['workspace','role','setup','display']){
  const h=harness();h.capture([{id:'selected',text:'Work only'}]);h.selectionDown();
  if(transition==='workspace')h.switchWorkspace('gaming',false);if(transition==='role')h.role('extended',false);if(transition==='setup')h.changeSetup(false);if(transition==='display')h.moveDisplay(1,false);
  h.permission(false);
  for(const action of ['files','note','briefing','selection','takeover','resume','task-briefing','task-image','references'])h.action(action);
  assert.equal(h.opened.length,0,transition+': stale actions cannot open new-context windows');assert.equal(h.folders.length,0);assert.equal(h.chat.attachments.length,0);assert.equal(h.controls.length,0);assert.equal(h.tasks.length,0);assert.equal(h.permissionChanges.length,0);
}
for(const allowed of [false,true]){
  const h=harness(allowed);assert.equal(h.elements.get('[data-display-parked]').hidden,true);
  h.park([{id:'notes--1',label:'Note Editor',title:'Workspace briefing'}]);assert.equal(h.elements.get('[data-display-parked]').hidden,false);assert.equal(h.elements.get('[data-display-parked-count]').textContent,'1');
  const button=h.elements.get('[data-display-parked-list]').children[0];assert.equal(button.textContent,'Restore Workspace briefing');assert.equal(button.dataset.displayWindow,'notes--1');
  h.restore('notes--1');assert.deepEqual(h.restored[0],{workspace:'work',slot:2,id:'notes--1'});assert.equal(h.elements.get('[data-display-parked]').hidden,true);assert.equal(h.state().localWindows[0].id,'notes--1');
  h.action('references');const mounts=h.chat.mounts.length,shelfMounts=h.side.mounts.length;
  h.listeners.pagehide();assert.equal(h.intervals.size,0);assert.equal(h.chat.unmounts,1,'Page exit returns the shared chat node');
  h.listeners.pageshow();assert.equal(h.chat.mounts.length,mounts+1,'The page cache remounts chat in Side space');assert.equal(h.side.mounts.length,shelfMounts,'Page cache return does not duplicate shelf listeners');assert.equal(h.host.dataset.displayTool,'references');assert.equal(h.intervals.size,1,'Returning to References restarts its clock');
}
// Examples are an explicit temporary viewport; simply browsing does not
// create chats or documents, and stale or manual-control runs are rejected.
{
  const h=harness(),chat=h.chat.mounts[0];h.action('examples');
  assert.equal(h.host.dataset.displayExamples,'open');assert.equal(h.elements.get('[data-display-examples]').hidden,false);assert.equal(h.elements.get('[data-display-assistant]').hidden,true,'Examples makes the mounted chat explicitly hidden for interaction guards');
  assert.equal(h.examples.length,0,'Opening Examples only explains the workflows');assert.equal(h.chat.mounts[0],chat,'The live chat remains mounted');
  const cards=h.elements.get('[data-display-examples-list]').children;assert.equal(cards.length,3);assert.equal(cards[0].children.length,4,'Compact cards contain a title, outcome, sample and action');assert.equal(cards[0].children[1].textContent,'Source note, editable checklist and saved Markdown copy');assert.equal(cards[0].children[2].textContent,'Sample: A short sample launch brief');
  assert.equal(cards[0].children[3].attributes['aria-label'],'Run example: Turn a brief into a checklist');
  h.action('examples-back');assert.equal(h.host.dataset.displayExamples,'closed');assert.equal(h.elements.get('[data-display-assistant]').hidden,false);assert.equal(h.host.dataset.displayTool,'chat');assert.equal(h.examples.length,0);
  h.example('checklist');assert.equal(h.examples.length,0,'Hidden example controls cannot run');
  h.action('examples');h.example('missing');assert.equal(h.examples.length,0,'Unknown examples cannot run');
  h.example('checklist');assert.deepEqual(h.examples,[{workspace:'work',slot:2,id:'checklist'}]);assert.equal(h.host.dataset.displayExamples,'closed');assert.equal(h.host.dataset.displayTool,'chat','Running returns to the real conversation');
  h.action('takeover');h.action('examples');assert.match(h.elements.get('[data-display-examples-access-text]').textContent,/Continue/);assert.equal(cards[0].children[3].disabled,true);h.example('image');assert.equal(h.examples.length,1);
  h.action('resume');assert.equal(cards[0].children[3].disabled,false);h.example('image');assert.equal(h.examples.at(-1).id,'image');
  h.action('examples');h.switchWorkspace('gaming');assert.equal(h.host.dataset.displayExamples,'closed','Workspace changes close the example view');
  h.action('examples');h.permission(false);assert.equal(h.host.dataset.displayExamples,'open','Changing permission preserves the browsed examples');
  h.action('chat');h.action('examples');assert.match(h.elements.get('[data-display-examples-access-text]').textContent,/Allow Assistant/);h.example('compare');assert.equal(h.examples.length,2,'Side space allows browsing without granting control');
  h.action('examples-delegate');assert.equal(h.state().role,'side');assert.equal(h.state().space.assistant.allowed,true);assert.equal(h.host.dataset.displayExamples,'open','Granting access leaves the browsed examples in place');
}
for(const transition of ['workspace','role','setup','display']){
  const h=harness();h.action('examples');
  if(transition==='workspace')h.switchWorkspace('gaming',false);if(transition==='role')h.role('extended',false);if(transition==='setup')h.changeSetup(false);if(transition==='display')h.moveDisplay(1,false);
  h.example('checklist');assert.equal(h.examples.length,0,transition+': stale example controls cannot act in a changed context');
}
{
  const h=harness();h.action('chat');h.folder('/home/demo/work/Assistant');h.blockFolder(true);h.action('working-folder',{inChat:true});assert.equal(h.folders.length,0,'An existing file named Assistant cannot be opened as a new folder');assert.match(h.elements.get('[data-display-feedback]').textContent,/already names a file/);h.blockFolder(false);h.action('working-folder',{inChat:true});assert.equal(h.folders.at(-1).path,'/home/demo/work/Assistant');
}
// The workbench supplies the actual chat with current display state. Task
// progress, answers and results have one owner inside that conversation.
{
  const h=harness(),chat=h.chat.mounts[0],context={workspace:'work',setup:h.state().setupKey,slot:2,folder:'/home/demo/work/Assistant',chatId:'chat-1',operationId:'operation-1'};
  const question={id:'format-1',prompt:'How should I arrange the checklist?',options:[{id:'grouped',label:'Group by task',description:'Keep related tasks together.'},{id:'simple',label:'One list',description:'Use the brief’s original order.'}]};
  h.model.setAssistant('work',2,{status:'needs-you',task:'Turn a brief into a checklist',context,activity:{stage:'question',label:'Choose a checklist format',detail:'The source is saved. I need your preference before creating the result.',step:2,total:4,entries:[{label:'Opened the brief',detail:'A work copy is in Assistant.'}],question}});h.refresh();
  assert.doesNotMatch(h.host.innerHTML,/data-display-activity|data-display-example-answer|data-display-task-summary/,'No duplicate progress, answer card or result outside chat');
  assert.equal(h.chat.taskStates.at(-1).space.assistant.activity.question.id,'format-1');
  assert.equal(h.chat.taskStates.at(-1).space.assistant.context.operationId,'operation-1');
  assert.equal(h.chat.mounts[0],chat,'Task progress does not replace or remount the shared chat');
  h.refresh();assert.equal(h.chat.mounts.length,1,'Routine task updates keep the live conversation node');
  h.action('takeover');assert.equal(h.chat.taskStates.at(-1).space.assistant.control,'user','The chat receives paused task state');
  h.action('resume');assert.equal(h.chat.taskStates.at(-1).space.assistant.control,'assistant');
  h.chatId('chat-2');assert.equal(h.chat.taskStates.at(-1).space.assistant.context.chatId,'chat-1','Chat adapter receives bound identity to reject foreign questions');
  h.chatId('chat-1');h.action('examples');h.example('image');assert.equal(h.examples.length,0,'A pending question must finish or stop before another example starts');h.action('examples-back');
  h.role('extended');assert.equal(h.chat.taskStates.at(-1),null,'Leaving the workbench clears its inline display task');
}
{
  const h=harness(),selection=[{id:'selected-text',title:'Selected text',kind:'text',text:'Keep this selection',workspace:'work'}];h.action('chat');
  assert.match(h.host.innerHTML,/class="display-chat-tools display-workbench-menu"[^>]*data-display-tools/);
  assert.match(h.host.innerHTML,/class="display-options display-workbench-menu"[^>]*data-display-options/);
  assert.doesNotMatch(h.host.innerHTML,/class="display-canvas-actions"|class="display-mode-controls"/,'Occasional tools and mode descriptions stay out of the conversation layout');
  h.capture(selection);h.toolsDown();h.capture([]);h.selectionDown();h.action('selection',{inChat:true});assert.deepEqual(h.chat.attachments,[selection],'Opening Tools retains a selection before the menu takes focus');
  h.folder('/home/demo/work/Assistant');h.refresh();assert.equal(h.elements.get('[data-display-folder-name]').textContent,'Work / Assistant','The ordinary folder includes its scope');
  h.elements.get('[data-display-options]').open=true;h.elements.get('[data-display-tools]').open=true;h.switchWorkspace('gaming');assert.equal(h.elements.get('[data-display-options]').open,false);assert.equal(h.elements.get('[data-display-tools]').open,false,'Workspace changes close stale menus');
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
console.log('Display workbench passed: shared tools and scoped permission, explicit control status, real canvas actions, selections, focus, stale guards, tab keyboard access and page-cache lifecycle.');
