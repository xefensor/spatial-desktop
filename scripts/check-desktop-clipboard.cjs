const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Clipboard=require('../dist/desktop-clipboard.js'),Notifications=require('../dist/all-workspaces.js');
const store=Clipboard.create();
store.add({id:'private',workspace:'work',kind:'text',text:'Private review notes',time:1});
store.add({id:'game',workspace:'gaming',kind:'text',text:'Lobby code',time:2});
assert.equal(store.list('work').length,1);assert.equal(store.list('general').length,0);
assert(!JSON.stringify(store.list('gaming')).includes('Private review notes'),'Workspace clipboard lists never include foreign content');
const old=store.snapshot();
store.add({id:'private-new',workspace:'work',kind:'text',text:'Private review notes',time:3});
store.merge(old);assert.equal(store.list('work').length,1,'Concurrent snapshots do not reintroduce repeated copies');
store.clear('work',4);store.merge(old);assert.equal(store.list('work').length,0,'Clear tombstones prevent an old linked display from restoring private history');
assert.equal(store.list('gaming').length,1,'Clearing one Workspace preserves the others');
store.add({id:'after-clear',workspace:'work',kind:'location',text:'/home/demo/Workspaces/work/Documents',time:4});
assert.equal(store.list('work').length,1,'An explicit copy after Clear survives even in the same timestamp');
for(let i=0;i<35;i++)store.add({id:'entry-'+i,workspace:'work',text:'Text '+i,time:10+i});
assert.equal(store.list('work').length,30);assert.equal(store.list('work')[0].text,'Text 34');
store.add({id:'bounded',workspace:'work',text:'x'.repeat(30000),time:50});assert.equal(store.list('work')[0].text.length,20000);
const fileEntry=store.add({id:'files',workspace:'work',kind:'files',mode:'cut',paths:['/home/demo/a.md'],items:[{itemId:'stable-file-id',path:'/home/demo/a.md',name:'a.md'}],time:60});
assert.equal(fileEntry.mode,'cut');assert.equal(fileEntry.items[0].itemId,'stable-file-id');
const restored=Clipboard.create(store.snapshot());assert.deepEqual(restored.list('work'),store.list('work'));
assert.equal(store.add({id:'empty',workspace:'work',kind:'files',paths:[],time:80}),null);
assert.equal(store.add({id:'empty-text',workspace:'work',text:'   ',time:80}),null);
assert(Clipboard.isPrivateField({closest:selector=>selector.includes('password')}));
assert(!Clipboard.editable({closest:()=>({}),matches:()=>true}),'Password and explicitly private fields cannot be paste targets');
assert(!Clipboard.editable({closest:()=>null,matches:()=>true,readOnly:true}));
assert(Clipboard.editable({closest:()=>null,matches:()=>true}));

// Paste uses the native selection and dispatches the input event consumed by
// document persistence. It never inserts HTML or accesses the host clipboard.
const clipboardSource=fs.readFileSync(require.resolve('../dist/desktop-clipboard.js'),'utf8');
const input={isConnected:true,value:'before after',selectionStart:7,selectionEnd:7,closest:()=>null,focus(){this.focused=true;},getAttribute:()=> 'Note body',setRangeText(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end);},dispatchEvent(event){this.events=(this.events||[]).concat(event.type);}};
const runtime=vm.createContext({editable:target=>target===input,status:{textContent:''},open(){this.opened=true;},showToast(){},Event:class{constructor(type){this.type=type;}}});
vm.runInContext(clipboardSource.slice(clipboardSource.indexOf('  function textPaste('),clipboardSource.indexOf('  function paste(')),runtime);
assert(runtime.textPaste({text:'<plain text> '},input));assert.equal(input.value,'before <plain text> after');assert.deepEqual(input.events,['input','change']);
assert(!runtime.textPaste({text:'secret'},null));assert(runtime.status.textContent.includes('Focus a text field'));

// Desktop Paste has an explicit filesystem destination. It creates an ordinary
// text file rather than modifying whichever editor was focused previously.
const Files=require('../dist/desktop-files.js'),Home=require('../dist/home-folders.js');
const downloads=Home.create(),seeds=[{path:'/work',kind:'folder'},{path:'/work/Desktop',kind:'folder'},{path:'/work/Project',kind:'folder'}];let failSave=false,serial=0;
const files=Files.create({downloads,seed:()=>seeds,workspace:()=> 'work',scope:(address,current)=>current==='work'&&Files.inside(address,'/work')?{workspace:current}:null,id:()=> 'clipboard-file-'+(++serial),persist(){if(failSave)throw Error('Quota exceeded');}});
const copied={id:'desktop-text',workspace:'work',kind:'text',text:'Keep this exact text\nSecond line'};
const pasteRuntime=vm.createContext({root:{SpatialDesktopFiles:files},workspace:()=> 'work',chosen:()=>copied,selectedId:'',status:{textContent:''},destination:{hidden:false},pasteTextFile:Clipboard.pasteTextFile,editable:()=>false,lastEditable:input,textPaste(){throw Error('Explicit folder paste must not use a stale editor.');},showToast(){},open(){},folder:{},defaultFolder(){return '/work/Desktop';}});
vm.runInContext(clipboardSource.slice(clipboardSource.indexOf('  function paste(target,entry){'),clipboardSource.indexOf('  function render(){')),pasteRuntime);
const pasted=pasteRuntime.paste('/work/Desktop');assert.equal(pasted.path,'/work/Desktop/Pasted text.txt');assert.equal(files.read(pasted.path).content,copied.text);assert.equal(input.value,'before <plain text> after','Desktop Paste leaves the old editor untouched');
assert.equal(pasteRuntime.paste('/work/Desktop').path,'/work/Desktop/Pasted text (2).txt','Repeated Desktop Paste keeps both files');
const projectPaste=pasteRuntime.paste('/work/Project/Desktop');assert.equal(projectPaste.path,'/work/Project/Desktop/Pasted text.txt');assert.equal(files.read('/work/Project/Desktop').kind,'folder','A scoped Project Desktop is created when its parent exists');
assert.equal(pasteRuntime.paste('/foreign/Desktop'),false);assert.match(pasteRuntime.status.textContent,/Workspace/);
assert.equal(pasteRuntime.paste('/work/Missing'),false);assert.equal(files.read('/work/Missing'),null,'Paste does not invent arbitrary destination folders');
const beforeQuota=downloads.snapshot();failSave=true;assert.equal(pasteRuntime.paste('/work/Desktop'),false);assert.match(pasteRuntime.status.textContent,/could not save/);assert.deepEqual(downloads.snapshot(),beforeQuota,'A persistence failure leaves files unchanged');assert.equal(copied.text,'Keep this exact text\nSecond line','A failed Desktop Paste keeps the clipboard contents');failSave=false;
assert.throws(()=>Clipboard.pasteTextFile(files,{...copied,text:'x'.repeat(12001)},'/work/Project/Other/Desktop','work'),/12,000/);assert.equal(files.read('/work/Project/Other/Desktop'),null,'Oversized text is rejected before directory creation');
assert.throws(()=>Clipboard.pasteTextFile(files,{...copied,workspace:'gaming'},'/work/Desktop','work'),/another Workspace/);

const notes=Notifications.create();notes.setDoNotDisturb(true,10);const policySnapshot=notes.snapshot();
notes.merge({policy:{doNotDisturb:false,updated:2}});assert(notes.doNotDisturb(),'An old display cannot disable a newer quiet policy');
assert(Notifications.create(policySnapshot).doNotDisturb(),'Do Not Disturb persists across reloads');
const actions=Notifications.notificationActions([{kind:'open-location',label:'Open folder',path:'/home/demo/Documents'}, {kind:'undo',label:'Undo',token:'operation-1'}, {kind:'eval',label:'Unsafe',code:'alert(1)'}]);
assert.equal(actions.length,2);assert(!JSON.stringify(actions).includes('code'));
const notifySource=fs.readFileSync(require.resolve('../dist/all-workspaces.js'),'utf8').split('  function notify(options){')[1].split('  addNotification=function')[0];
let scheduled=0,drawn=0,queued=null;
const ctx=vm.createContext({notifications:notes,destination:Notifications.destination,activeWorkspace:'work',workspaceProfiles:{work:{}},id:()=> 'quiet',save(){},renderLocal(){},requestAnimationFrame(fn){scheduled++;queued=fn;},localItems:()=>[{dataset:{notificationId:'loud'}}],drawAttentionToNotification(){drawn++;},Date});
vm.runInContext('function notify(options){'+notifySource,ctx);
ctx.notify({workspace:'work',title:'A quiet download',actions});assert.equal(scheduled,0);assert.equal(notes.unread('work'),1,'Quiet notifications still arrive and remain unread');assert.equal(notes.get('quiet').actions.length,2);
notes.setDoNotDisturb(false,20);ctx.notify({id:'loud',workspace:'work',title:'A queued event'});assert.equal(scheduled,1);
notes.setDoNotDisturb(true,30);queued();assert.equal(drawn,0,'Enabling Do Not Disturb also suppresses a previously queued popup');
assert(!clipboardSource.includes('navigator.clipboard.read'),'Clipboard never reads the private host clipboard automatically');
console.log('Desktop clipboard passed: Workspace isolation, bounded persistent history, clear tombstones, concurrent deduplication, private fields, plain-text/editor and Desktop-file paste, collision preservation, scoped Desktop creation, quota rollback, file identity handoff, explicit host access and retained quiet notifications.');
