const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Roles=require('../dist/display-roles.js'),source=fs.readFileSync(path.join(__dirname,'../dist/display-workbench.js'),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const css=fs.readFileSync(path.join(__dirname,'../dist/display-workbench.css'),'utf8');
assert.match(css,/body\[data-display-role="side"\][^{]*:is\(\.desktop-page-rail,\.desktop-folder,#desktopContextColumns\)/,'Stable Side space omits the main desktop page navigation');
assert.doesNotMatch(css,/display-workbench-width|display-workbench-panel|workspace-zone\s*\{[^}]*inset/,'Native panels supply display bounds without special workbench geometry');

function harness(initialAllowed=true,{role='side',count=2,help=true}={}){
  const elements=new Map(),listeners={},permissions=[],controls=[],examples=[],folders=[],opened=[],settings=[],chat={taskStates:[],attachments:[],notices:[]};
  let workspace='work',project=null,localSlot=role==='main'?1:2,page=0,captureItems=[],workingFolder='',blockedFolder=false,currentChat='chat-1';
  let roster=[{slot:1,screenWidth:2560,screenHeight:1440},{slot:2,screenWidth:1920,screenHeight:1080}].slice(0,count);
  const model=Roles.create();model.connect(roster);if(role==='side')model.setRole(2,'side');model.setAssistantAllowed('work',localSlot,initialAllowed);
  const document={activeElement:null};
  function element(){return {hidden:false,inert:false,value:'',textContent:'',dataset:{},events:{},children:[],attributes:{},classList:{contains:()=>false,toggle(){}},focus(){document.activeElement=this;},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);for(const child of children)child.parentNode=this;},insertBefore(child){this.children.unshift(child);child.parentNode=this;},querySelectorAll(selector){const all=node=>node.children.flatMap(child=>[child,...all(child)]);return selector==='[data-display-example]'?all(this).filter(child=>child.dataset.displayExample):[];},setAttribute(name,value){this.attributes[name]=value;},addEventListener(type,fn){this.events[type]=fn;},querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);}};}
  const area=element(),content=element();area.dataset.widgetMode='expanded';content.parentNode=area;area.querySelector=()=>content;
  if(!help){const query=content.querySelector;content.querySelector=function(selector){return ['#aiDemoRequests','#aiDemoHelp'].includes(selector)?null:query.call(this,selector);};}
  const state=()=>({setupKey:model.setup().signature,workspaceId:workspace,project,page,workspace:workspace==='work'?'Work':'Gaming',localSlot,role:model.role(localSlot),home:'/home/demo/'+workspace,space:model.space(workspace,localSlot)});
  const browser={addEventListener(type,fn){listeners[type]=fn;},SpatialDisplayRoleBridge:{state,
    setAssistantAllowed(slot,allowed){permissions.push({workspace,slot,allowed});const result=model.setAssistantAllowed(workspace,slot,allowed);browser.SpatialDisplayWorkbench.refresh();return result;},
    assistantControl(action){controls.push({workspace,slot:localSlot,action});model.setAssistant(workspace,localSlot,{control:action==='takeover'?'user':'assistant',status:action==='takeover'?'paused':'idle'});browser.SpatialDisplayWorkbench.refresh();},
    assistantExamples:()=>[{id:'checklist',title:'Turn a brief into a checklist',input:'A sample brief',outcome:'A saved checklist'},{id:'image',title:'Convert an image',input:'A sample photograph',outcome:'An image to review'}],
    runAssistantExample(id){examples.push({workspace,slot:localSlot,id});return true;},
    openFolder(path){folders.push({workspace,slot:localSlot,path});},launchNote(title,text){opened.push({workspace,slot:localSlot,title,text});},openDisplays(slot){settings.push({workspace,slot});}},
    SpatialAIDesktop:{setDisplayTask(value){chat.taskStates.push(value?clone(value):null);},current:()=>({id:currentChat}),workingFolder:()=>workingFolder,validateWorkingFolder(path){if(blockedFolder)throw Error('Assistant already names a file.');return path;},attach(items){chat.attachments.push(clone(items));},notify(text){chat.notices.push(text);}},SpatialAssistantDesktop:{capture:()=>clone(captureItems)}};
  const created=[];document.querySelector=()=>area;document.createElement=()=>{const node=element();created.push(node);return node;};
  vm.runInNewContext(source,{window:browser,document,prepareControlSemantics(){}});
  const host=created[0],menu=created[1],examplesButton=created[2],refresh=()=>browser.SpatialDisplayWorkbench.refresh();
  const event=(attribute,value)=>({target:{closest(selector){return selector==='['+attribute+']'?{dataset:{[attribute==='data-display-example'?'displayExample':'displayAction']:value}}:null;}}});
  return {model,area,content,host,menu,examplesButton,elements,listeners,permissions,controls,examples,folders,opened,settings,chat,state,refresh,document,
    action:name=>content.events.click(event('data-display-action',name)),example:id=>content.events.click(event('data-display-example',id)),
    permission(allowed){model.setAssistantAllowed(workspace,localSlot,allowed);refresh();},
    selectionDown(){content.events.pointerdown({target:{closest:selector=>selector.includes('.ai-chat-settings>summary')?{}:null}});},capture(items){captureItems=items;},folder(value){workingFolder=value;},blockFolder(value){blockedFolder=value;},
    reveal(detail={}){listeners['spatial-assistant-display-reveal']({detail});},
    page(value,render=true){page=value;if(render)refresh();},switchWorkspace(value,render=true){workspace=value;if(render)refresh();},switchProject(value,render=true){project=value;if(render)refresh();},role(value,render=true){model.setRole(localSlot,value);if(render)refresh();},moveDisplay(value,render=true){localSlot=value;if(render)refresh();},changeSetup(render=true){roster=roster.map(display=>({...display,screenWidth:display.screenWidth+100}));model.connect(roster);model.setRole(2,'side');if(render)refresh();},chatId(value){currentChat=value;listeners['spatial-ai-chat-change']({detail:{workspace,chatId:value}});}};
}
{
  const h=harness();
  assert.equal(h.host.parentNode,h.content,'Controls are native children of the ordinary Assistant content');
  assert.equal(h.examplesButton.textContent,'Desktop tasks');assert.equal(h.examplesButton.parentNode,h.elements.get('#aiDemoRequests'),'Desktop workflows share the existing Examples drawer');
  assert.doesNotMatch(h.host.innerHTML,/data-display-action="examples"/,'The runtime row does not duplicate the Examples entry point');
  assert.match(h.host.innerHTML,/data-display-permission-scope hidden/,'Full scope stays available as a hidden description');
  assert.match(h.host.innerHTML,/data-display-control-status[^>]*aria-describedby="displayAssistantPermissionScope"/,'Status retains its exact accessible scope');
  assert.doesNotMatch(h.host.innerHTML,/data-display-assistant-allowed|display-workbench-panel|display-assistant-chat|data-display-side|display-tool-tabs|display-clock|display-parked/,'No special panel, duplicate chat, References tabs, clock or parked list');
  assert.doesNotMatch(source,/mountDisplay|unmountDisplay|SpatialDisplaySideTools/,'Assistant never portals chat or owns the Files shelf');
  assert.match(h.elements.get('[data-display-permission-scope]').textContent,/Display 2.*all windows.*Work Workspace only/);
  const focus={label:'Editor focus'};h.document.activeElement=focus;h.refresh();assert.equal(h.document.activeElement,focus,'Routine task updates do not steal focus');
  assert.equal(h.chat.taskStates.at(-1).workspaceId,'work');
  h.action('takeover');assert.equal(h.controls.at(-1).action,'takeover');assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Paused');assert.equal(h.elements.get('[data-display-action="resume"]').hidden,false);
  h.action('resume');assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Ready');
  h.model.setAssistant('work',2,{status:'working'});h.refresh();assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Working');
  h.model.setAssistant('work',2,{status:'needs-you'});h.refresh();assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Needs input');
  h.permission(false);assert.equal(h.state().space.assistant.allowed,false);assert.equal(h.elements.get('[data-display-action="resume"]').hidden,true);
  const count=h.controls.length;h.action('resume');h.action('takeover');assert.equal(h.controls.length,count,'Permission off cannot resume control');
  h.switchWorkspace('gaming');assert.equal(h.state().space.assistant.allowed,false,'Workspace permission remains independent');h.permission(true);h.switchWorkspace('work');assert.equal(h.state().space.assistant.allowed,false);
  h.role('extended');assert.equal(h.host.hidden,false);assert.equal(h.menu.hidden,false);assert.equal(h.chat.taskStates.at(-1).role,'extended','Extended displays keep the same native control and task adapter');
}
{
  const h=harness(false),section=h.elements.get('[data-display-control]'),takeover=h.elements.get('[data-display-action="takeover"]'),resume=h.elements.get('[data-display-action="resume"]');
  assert.equal(section.hidden,true,'The default idle Assistant has no display-status strip');
  assert.equal(h.examplesButton.hidden,false,'Desktop tasks remain discoverable with permission off');
  h.permission(true);assert.equal(section.hidden,false);assert.equal(takeover.hidden,true,'Idle permission does not add a routine Take over button');
  assert.equal(h.elements.get('.display-control-heading').title,'Display 2 · all windows here · Work Workspace only','Hover retains exact scope without another visible line');
  h.model.setAssistant('work',2,{status:'working',task:'A real desktop task'});h.refresh();assert.equal(takeover.hidden,false);assert.equal(resume.hidden,true);
  h.action('takeover');assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display 2 · Paused');assert.equal(resume.hidden,false);assert.equal(takeover.hidden,true);
  h.permission(false);assert.equal(section.hidden,false,'An interrupted real task remains visible with permission off');assert.equal(resume.hidden,true,'Permission still controls whether a paused task may resume');
  h.model.setAssistant('work',2,{status:'error',control:'assistant'});h.refresh();assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display 2 · Task failed');assert.equal(section.dataset.control,'error');
}
{
  const h=harness(false,{help:false});assert.equal(h.examplesButton.parentNode,h.elements.get('.ai-chat-settings-body'),'Older fixtures without the shared help drawer retain a tasks entry point');
  h.action('examples');assert.equal(h.examplesButton.attributes['aria-expanded'],'true');
  let prevented=false,stopped=false;h.content.events.keydown({key:'Escape',preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert.equal(prevented,true);assert.equal(stopped,true);assert.equal(h.content.dataset.displayExamples,'closed');assert.equal(h.examplesButton.attributes['aria-expanded'],'false');assert.equal(h.document.activeElement,h.examplesButton,'Closing desktop tasks returns focus to its relocated entry point');
}
{
  const h=harness(),help=h.content.querySelector('#aiDemoRequests'),helpButton=h.content.querySelector('#aiDemoHelp'),prompt=h.content.querySelector('#aiPrompt');
  prompt.value='Keep this unsent draft';
  help.hidden=false;helpButton.setAttribute('aria-expanded','true');h.refresh();
  assert.equal(help.hidden,false,'Routine display refresh does not close the keyword help drawer');
  h.action('examples');h.action('examples-back');
  assert.equal(help.hidden,true,'Back to chat closes keyword help so the conversation is visible');assert.equal(helpButton.attributes['aria-expanded'],'false');
  assert.equal(prompt.value,'Keep this unsent draft');assert.equal(h.document.activeElement,prompt,'Back to chat returns to the retained draft');
  help.hidden=false;helpButton.setAttribute('aria-expanded','true');h.action('examples');h.example('checklist');
  assert.equal(help.hidden,true,'Running a desktop task does not return into the open keyword drawer');assert.equal(helpButton.attributes['aria-expanded'],'false');assert.equal(prompt.value,'Keep this unsent draft');
  help.hidden=false;helpButton.setAttribute('aria-expanded','true');h.action('examples');h.content.events.keydown({key:'Escape',preventDefault(){},stopPropagation(){}});
  assert.equal(help.hidden,true);assert.equal(h.document.activeElement,helpButton,'Escape returns focus to the visible Examples entry point');
}
for(const initialAllowed of [false,true]){
  const h=harness(initialAllowed),selection=[{id:'selected',title:'Selected text',text:'Review this paragraph',workspace:'work'}];
  h.capture(selection);h.selectionDown();h.capture([]);h.action('selection');assert.deepEqual(h.chat.attachments,[selection],'Opening Chat options retains the selection before focus removes it');
  h.action('selection');assert.equal(h.chat.attachments.length,1);assert.match(h.chat.notices.at(-1),/Select text or files/);
  h.folder('/home/demo/work/Projects/Website/Assistant');h.action('working-folder');assert.equal(h.folders.at(-1).path,'/home/demo/work/Projects/Website/Assistant');
  h.blockFolder(true);h.action('working-folder');assert.equal(h.folders.length,1);assert.match(h.elements.get('[data-display-feedback]').textContent,/already names a file/);
  h.action('note');assert.deepEqual(h.opened[0],{workspace:'work',slot:2,title:'Untitled note',text:''});h.action('settings');assert.deepEqual(h.settings[0],{workspace:'work',slot:2});
  h.capture(selection);h.selectionDown();h.switchWorkspace('gaming');h.action('selection');assert.equal(h.chat.attachments.length,1,'Captured sources cannot cross Workspaces');
}
{
  const h=harness(false);h.action('examples');assert.equal(h.content.dataset.displayExamples,'open');assert.equal(h.examples.length,0,'Browsing examples does not create chats or files');
  const cards=h.elements.get('[data-display-examples-list]').children;assert.equal(cards.length,2);assert.equal(cards[0].children[3].disabled,true);h.example('checklist');assert.equal(h.examples.length,0);
  h.action('examples-delegate');assert.equal(h.state().space.assistant.allowed,true);assert.equal(h.content.dataset.displayExamples,'open');assert.equal(cards[0].children[3].disabled,false);
  h.example('missing');assert.equal(h.examples.length,0);h.example('checklist');assert.deepEqual(h.examples,[{workspace:'work',slot:2,id:'checklist'}]);assert.equal(h.content.dataset.displayExamples,'closed');
  h.example('image');assert.equal(h.examples.length,1,'Hidden example actions cannot run');h.action('takeover');h.action('examples');assert.match(h.elements.get('[data-display-examples-access-text]').textContent,/Continue/);h.example('image');assert.equal(h.examples.length,1);
  h.action('resume');h.example('image');assert.equal(h.examples.length,2);h.action('examples');h.reveal({workspace:'gaming'});assert.equal(h.content.dataset.displayExamples,'open');h.reveal({workspace:'work'});assert.equal(h.content.dataset.displayExamples,'closed','Normal chat invocation dismisses Examples');
  h.action('examples');h.switchWorkspace('gaming');assert.equal(h.content.dataset.displayExamples,'closed');
  h.listeners.pagehide();assert.equal(h.chat.taskStates.at(-1),null);h.listeners.pageshow();assert.equal(h.chat.taskStates.at(-1).workspaceId,'gaming','Page cache restores scoped task state without mounting another chat');
}
{
  const h=harness(false),selection=[{id:'selected',text:'Old selection'}];h.capture(selection);h.selectionDown();h.capture([]);h.selectionDown();h.action('selection');assert.equal(h.chat.attachments.length,0,'Reopening Chat options without a selection clears old capture');
  h.area.dataset.widgetMode='expanded';h.area.inert=false;h.area.parentNode={hidden:false,inert:false,dataset:{widgetMode:'expanded'}};h.action('examples');h.action('examples-delegate');assert.equal(h.permissions.length,1,'Native Compact quick chat can enable control from the scripted examples');
}
for(const transition of ['workspace','project','role','setup','display','hidden','inert','compact','remote-panel','hidden-ancestor','inert-ancestor']){
  const h=harness();h.capture([{id:'work-only',text:'Saved selection'}]);h.selectionDown();h.action('examples');
  if(transition==='workspace')h.switchWorkspace('gaming',false);if(transition==='project')h.switchProject('site',false);if(transition==='role')h.role('extended',false);if(transition==='setup')h.changeSetup(false);if(transition==='display')h.moveDisplay(1,false);
  if(transition==='hidden')h.area.hidden=true;if(transition==='inert')h.area.inert=true;if(transition==='compact'){h.area.dataset.widgetMode='compact';h.area.inert=true;}if(transition==='remote-panel')h.area.hidden=true;if(transition==='hidden-ancestor')h.area.parentNode={hidden:true};if(transition==='inert-ancestor')h.area.parentNode={inert:true};
  h.action('examples-delegate');for(const action of ['note','working-folder','settings','selection','takeover','resume'])h.action(action);h.example('checklist');
  for(const result of [h.permissions,h.opened,h.folders,h.settings,h.chat.attachments,h.controls,h.examples])assert.equal(result.length,0,transition+': stale or unavailable controls cannot act');
}
{
  const h=harness(),question={id:'format',options:[{id:'grouped',label:'Group by task'}]};h.model.setAssistant('work',2,{status:'needs-you',context:{workspace:'work',setup:h.state().setupKey,folder:'/home/demo/work/Assistant',slot:2,chatId:'chat-1',operationId:'op-1'},activity:{stage:'question',question}});h.refresh();
  assert.equal(h.chat.taskStates.at(-1).space.assistant.context.operationId,'op-1');assert.equal(h.chat.taskStates.at(-1).space.assistant.activity.question.id,'format');
  assert.doesNotMatch(h.host.innerHTML,/data-ai-task-answer|data-display-activity/,'Question and progress render only inside the actual chat');
  h.action('takeover');assert.equal(h.chat.taskStates.at(-1).space.assistant.control,'user');h.action('resume');assert.equal(h.chat.taskStates.at(-1).space.assistant.control,'assistant');
  h.action('examples');h.example('checklist');assert.equal(h.examples.length,0,'A pending question must finish or stop before another example starts');
}
// Finished review metadata stays in its original display context. Moving to
// another desktop must not show its old request in the current toolbar.
for(const role of ['main','extended']){
  const h=harness(true,{role,count:role==='main'?1:2}),slot=h.state().localSlot;
  const owner={workspace:'work',project:null,setup:h.state().setupKey,slot,role,page:0,folder:'/Work/Assistant'};
  const review={status:'needs-you',context:owner,activity:{stage:'review',label:'Original image review'}};
  h.model.setAssistant('work',slot,review);h.refresh();assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Needs input');
  h.page(1);assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Ready',role+': another desktop does not inherit a completed image review');
  assert.equal(h.model.space('work',slot).assistant.status,'needs-you');assert.equal(h.model.space('work',slot).assistant.activity.stage,'review','Toolbar masking preserves the original task');
  h.page(0);assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Needs input','Returning restores the original context status');
  for(const different of [{setup:'old-setup'},{slot:slot+1},{role:role==='main'?'extended':'side'},{workspace:'gaming'},{project:'site'}]){
    h.model.setAssistant('work',slot,{...review,context:{...owner,...different}});h.refresh();assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Ready','A mismatched '+Object.keys(different)[0]+' cannot present an old review');
  }
}
{
  const h=harness(),slot=h.state().localSlot;h.model.setAssistant('work',slot,{status:'needs-you',context:{workspace:'work',setup:h.state().setupKey,slot,role:'side',page:0,folder:'/Work/Assistant'},activity:{stage:'review',label:'Side review'}});h.page(1);assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Needs input','Side space retains its fixed surface across normal desktop navigation');
}
// Pinned Side windows may be on another Project/page, while remaining local
// to this display and Workspace. Their selected text is still an input source.
{
  const h=harness();h.model.setAssistant('work',2,{status:'needs-you',context:{workspace:'work',project:'site',setup:h.state().setupKey,slot:2,folder:'/Work/Projects/Site/Assistant'},activity:{stage:'review',label:'Old Project review'}});h.refresh();
  assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Ready','An old Project review is not presented as a request in the current Workspace');
  h.switchProject('site');assert.equal(h.elements.get('[data-display-control-status]').textContent,'Display '+h.state().localSlot+' · Needs input','Returning to the original Project reveals its retained state');
}
{
  const adapter=fs.readFileSync(path.join(__dirname,'../dist/assistant-desktop.js'),'utf8');
  const between=(start,end)=>adapter.slice(adapter.indexOf(start),adapter.indexOf(end,adapter.indexOf(start)));
  let pinned=true,local=true;const frame={dataset:{appFrame:'notes--1'},hidden:false,contains:()=>true};
  const field={value:'Before HELPER TEXT after',selectionStart:7,selectionEnd:18,closest:()=>frame,matches:query=>query.startsWith('textarea')};
  const context={activeWorkspace:'work',appState:{'notes--1':'open'},isLocalApp:()=>local,desktopPages:{inColumn:()=>false,pageOf:()=>0,current:()=>3},SpatialDisplayRoleBridge:{windowContextKey:()=>pinned?'work:display-role:assistant:2':null},document:{activeElement:field},window:{getSelection:()=>null}};
  vm.createContext(context);vm.runInContext(between('function local(frame)','function scope(frame)')+between('function selectedText()','function selectionSource('),context);
  assert.equal(context.selectedText().text,'HELPER TEXT');local=false;assert.equal(context.selectedText(),null);local=true;pinned=false;assert.equal(context.selectedText(),null);pinned=true;context.appState['notes--1']='closed';assert.equal(context.selectedText(),null);context.appState['notes--1']='open';frame.hidden=true;assert.equal(context.selectedText(),null);
}

// Display permission is independent of layout role, including one Main screen.
for(const role of ['main','extended','side']){
  const h=harness(false,{role,count:role==='main'?1:2}),slot=role==='main'?1:2;
  assert.equal(h.host.hidden,false,role+': scripted controls and examples are discoverable');
  assert.equal(h.menu.hidden,false);assert.equal(h.chat.taskStates.at(-1).role,role);
  assert.equal(h.state().space.assistant.allowed,false,role+': access starts off');
  h.action('examples');const cards=h.elements.get('[data-display-examples-list]').children;
  assert.equal(cards[0].children[3].disabled,true);h.example('checklist');assert.equal(h.examples.length,0);
  h.action('examples-delegate');assert.deepEqual(h.permissions,[{workspace:'work',slot,allowed:true}]);
  assert.equal(cards[0].children[3].disabled,false);h.example('checklist');assert.deepEqual(h.examples,[{workspace:'work',slot,id:'checklist'}]);
  h.action('takeover');assert.equal(h.state().space.assistant.control,'user');assert.equal(h.elements.get('[data-display-action="resume"]').hidden,false);
  h.action('resume');assert.equal(h.state().space.assistant.control,'assistant');
  h.permission(false);assert.equal(h.state().space.assistant.allowed,false);assert.equal(h.elements.get('[data-display-action="resume"]').hidden,true);
}

console.log('Native Assistant display controls passed: native widget ownership, no panel/chat portal, scoped permission and status, takeover/resume, original task state, examples, working folder, selections, Workspace privacy, hidden/Compact/inert and stale-context guards.');
