const assert=require('node:assert/strict');
const Displays=require('../dist/display-roles.js');
const pair=[{slot:1,source:'first-random-id',width:1280,height:800},{slot:2,source:'second-random-id',width:1100,height:700}];
const model=Displays.create();

// There is always a place for the user to work, including a disconnected setup.
assert.equal(model.main(),1);assert.equal(model.role(1),'main');
assert.equal(model.setRole(1,'side').reason,'single-display');
assert.deepEqual(model.connect(pair).roles,{'1':'main','2':'extended'});
assert(model.setRole(2,'side').ok);
assert.equal(model.setRole(1,'assistant').reason,'choose-main-first');
assert.equal(model.role(1),'main');assert.equal(model.role(2),'side');
assert.equal(model.setRole(9,'side').reason,'unknown-display');
assert.equal(model.setRole(2,'unrestricted').reason,'unknown-role');
assert.equal(model.role(2),'side','Failed changes leave the current roles intact');

// Reloaded browser sessions and resized browser windows describe the same setup.
const original=model.snapshot();
model.connect(pair.map(display=>({...display,source:'new-'+display.slot,openedAt:9876,width:display.width+100,height:display.height-50})));
assert.deepEqual(model.snapshot(),original);
assert.equal(model.role(2),'side');
assert.equal(Displays.signature(pair),Displays.signature([...pair].reverse()));
assert(model.setRole(2,'main').ok);
assert.equal(model.main(),2);assert.equal(model.role(1),'extended');
assert(model.setRole(1,'assistant').ok);
model.connect([pair[0]]);
assert.equal(model.role(1),'main');assert.equal(model.role(2),null);
model.connect(pair);
assert.equal(model.main(),2);assert.equal(model.role(1),'assistant','Reconnect restores the saved main and helper roles');

// Physical screen geometry can distinguish monitor sets without using browser IDs.
const physical=pair.map((display,index)=>({...display,screenWidth:index?1920:2560,screenHeight:index?1080:1440}));
assert.notEqual(Displays.signature(physical),Displays.signature(pair));
model.connect(physical);assert.equal(model.main(),1);model.setRole(2,'side');
const changedMonitor=physical.map(display=>({...display,screenWidth:display.screenWidth+100}));
model.connect(changedMonitor);assert.equal(model.role(2),'extended');
model.connect(physical);assert.equal(model.role(2),'side');
model.connect(pair);assert.equal(model.role(1),'assistant');

// Side-space contents are Workspace-owned and independent of Projects/desktops.
model.pinWindow('work',2,'browser');
model.pinWindow('work',2,'editor');
model.updateSpace('work',2,{widgets:[{id:'notes',kind:'note',text:'References'}],folders:[{path:'/Work/References',label:'Reference folder'}],note:'Keep these references beside the desktop.'});
model.setAssistant('work',1,{status:'working',task:'Compare these images'});
model.setAssistant('work',1,{result:'Two images selected'});
assert.deepEqual(model.space('work',2).windows,['browser','editor']);
assert.deepEqual(model.space('gaming',2).windows,[]);
assert.equal(model.space('gaming',2).note,'');
assert.equal(model.space('work',2).note,'Keep these references beside the desktop.');
assert.equal(model.space('gaming',1).assistant.status,'idle');
assert.equal(model.space('work',1).assistant.task,'Compare these images','Partial Assistant updates preserve the task');
assert.equal(model.space('work',1).assistant.status,'working');
assert.equal(model.windowDisplay('work','browser'),2);
model.pinWindow('work',1,'browser');
assert.equal(model.windowDisplay('work','browser'),1);
assert.deepEqual(model.space('work',2).windows,['editor'],'Moving a window cannot leave two pins');
model.pinWindow('gaming',2,'browser');
assert.equal(model.windowDisplay('gaming','browser'),2,'Equal app IDs in separate Workspaces stay independent');
assert(model.unpinWindow('work','browser'));assert(!model.unpinWindow('work','browser'));
assert.equal(model.windowDisplay('gaming','browser'),2);
model.pinWindow('work',2,'closed-app');
assert.equal(model.pruneWindows('work',['editor']),1);
assert.deepEqual(model.space('work',2).windows,['editor']);

// Stored data and public views cannot alias mutable application state.
const saved=model.snapshot(),restored=Displays.create(saved);restored.connect(pair);
saved.setups[Displays.signature(pair)].roles[1]='side';
saved.workspaces.work.displays[2].folders[0].label='Changed externally';
assert.equal(restored.role(1),'assistant');
assert.equal(restored.space('work',2).folders[0].label,'Reference folder');
assert.equal(restored.space('work',2).note,'Keep these references beside the desktop.','Side-space note persists with its Workspace');
restored.updateSpace('gaming',2,{note:'Game notes'});
assert.equal(restored.space('work',2).note,'Keep these references beside the desktop.');
restored.updateSpace('gaming',2,{note:'x'.repeat(8100)});
assert.equal(restored.space('gaming',2).note.length,8000);
const view=restored.space('work',2);view.windows.length=0;view.widgets[0].text='Changed';
const setup=restored.setup();setup.roles[1]='side';setup.displays.length=0;
assert.equal(restored.main(),2);assert.deepEqual(restored.space('work',2).windows,['editor']);
assert.equal(restored.space('work',2).widgets[0].text,'References');
restored.connect([pair[0]]);restored.connect(pair);
assert.deepEqual(restored.space('work',2),model.space('work',2),'Disconnects retain helper-space content');

// Malformed storage is repaired to one main and safe, independent content.
const corrupt=Displays.create({setups:{[Displays.signature(pair)]:{roles:{1:'main',2:'main',8:'nonsense'}}},workspaces:{work:{displays:{1:{windows:['same','same',null,42],assistant:{status:'anything',task:7},widgets:[null,'',{},false]},2:{windows:['same','other'],folders:[{path:'/Documents'}]}}},broken:null}});
corrupt.connect(pair);
assert.deepEqual(corrupt.roles(),{'1':'main','2':'extended'});
assert.equal(corrupt.space('work',1).assistant.status,'idle');
assert.equal(corrupt.space('work',1).assistant.task,'');
assert.deepEqual(corrupt.space('work',1).windows,['same']);
assert.deepEqual(corrupt.space('work',2).windows,['other']);
assert.doesNotThrow(()=>corrupt.updateSpace('work',2,null));
assert.doesNotThrow(()=>Displays.create(null).connect(null));
const badSignature=Displays.create({setups:{[Displays.signature(pair)]:{roles:{8:'main'}}}});
badSignature.connect(pair);assert.equal(badSignature.main(),1);
const cycle={kind:'note'};cycle.self=cycle;
corrupt.updateSpace('work',1,{widgets:[cycle]});assert.deepEqual(corrupt.space('work',1).widgets,[{kind:'note'}]);
assert.doesNotThrow(()=>JSON.stringify(corrupt.snapshot()));
console.log('Display roles: main invariant, remembered monitor setups, reconnects, Workspace isolation and sticky content passed');
