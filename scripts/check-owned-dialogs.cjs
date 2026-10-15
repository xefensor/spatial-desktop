const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../dist/owned-dialogs.js'),A=require('../dist/app-tools.js');
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const dialog=D.savePage({title:'Co-op / notes',address:'co-op',intro:'Tonight',detail:'Bring supplies'},{directory:'/gaming/Downloads',project:null});
assert.equal(dialog.filename,'Co-op - notes.txt');assert.match(dialog.content,/Tonight\n\nBring supplies/);
assert.equal(D.filename('  a/b\u0000.txt  '),'a-b-.txt');assert.equal(D.filename('  '),'');
const parent='<article class="mini-card mini-card-preview" data-mini-card="browser--2"><header>Firefox</header><div data-parked-preview="browser--2">App preview</div></article>';
const card=D.parkedMarkup(parent,'browser--2','Firefox',dialog,escape);
assert(card.indexOf('App preview')<card.indexOf('parked-owned-dialog'));
assert.equal((card.match(/data-mini-card=/g)||[]).length,1,'One parent identity and hotbar slot for the group');
assert.match(card,/role="group" aria-label="Firefox and its dialog"/);
assert.match(card,/data-owned-dialog-restore="browser--2"/);assert.match(card,/Needs input/);
assert.equal(D.parkedMarkup(parent,'browser--2','Firefox',null,escape),parent);
const unsafe=D.parkedMarkup(parent,'browser--2','Firefox',{...dialog,filename:'<img onerror="bad">'},escape);
assert(!unsafe.includes('<img'));assert(unsafe.includes('&lt;img'));

// Exercise the production adapters and events with independent window models.
const store=A.create(),events={},opened=[],files=[],focused=[];
let saves=0,currentDirectory='/gaming/Downloads';
const frames={};
const runtime=vm.createContext({appInfo:{},appState:{},activeWorkspace:'gaming',SpatialAppTools:A,
  appWindowModel:id=>store.get(runtime.activeWorkspace,id,()=>({kind:'browser',navigation:A.navigation({title:id,address:id,intro:'Page text'})})),
  frameFor:id=>frames[id],document:{addEventListener:(type,fn)=>events[type]=fn},
  downloadContext:()=>({directory:currentDirectory,workspace:runtime.activeWorkspace,project:null}),
  saveAppWindows(){saves++;},renderMiniApps(){},hydrateAppWindow(){},syncApps(){},prepareControlSemantics(){},isLocalApp:()=>true,
  openApp:id=>{runtime.appState[id]='open';opened.push(id);},closeApp:id=>{runtime.appState[id]='closed';},performAppAction(){},
  miniMarkup:id=>parent.replaceAll('browser--2',id),escapeHtml:escape,
  projectSpaces:{},workspaceDownloads:{add:(directory,name,data)=>{files.push({directory,name,...data});return {path:directory+'/'+name};}},
  persistDownloads(){},refreshDownloadUi(){},captureWorkspaceContent(){},queueDesktopStateBroadcast(){},showToast(){}});
vm.runInContext(fs.readFileSync(require.resolve('../dist/owned-dialogs.js'),'utf8'),runtime);
for(const id of ['browser','browser--2']){
  runtime.appInfo[id]={base:'browser',label:'Firefox'};runtime.appState[id]='open';
  // DOM rendering is inspected in a browser; here the frame is not hydrated.
  frames[id]={dataset:{appFrame:id,appReadyWorkspace:'not-hydrated'},hidden:false,querySelector:selector=>selector.includes('input')?{focus:()=>focused.push(id)}:null};
  runtime.performAppAction(id,'browser-save-page');
}
const first=runtime.appWindowModel('browser').ownedDialog,second=runtime.appWindowModel('browser--2').ownedDialog;
assert.notEqual(first,second);first.filename='My pending draft.txt';
runtime.appState.browser='minimized';runtime.syncApps();
assert.equal(runtime.appWindowModel('browser').ownedDialog.filename,'My pending draft.txt','Parking retains the pending dialog');
assert(runtime.miniMarkup('browser').includes('My pending draft.txt'));
events.click({target:{closest:selector=>selector==='[data-owned-dialog-restore]'?{dataset:{ownedDialogRestore:'browser'}}:null},preventDefault(){},stopImmediatePropagation(){}});
assert.deepEqual(opened,['browser']);assert.equal(focused.at(-1),'browser','Restoring the group focuses the owning dialog');
const reloaded=A.create(JSON.parse(JSON.stringify(store.snapshot())));
assert.equal(reloaded.get('gaming','browser').ownedDialog.filename,'My pending draft.txt','Reload retains dialog input');
runtime.activeWorkspace='work';assert.equal(runtime.appWindowModel('browser').ownedDialog,undefined,'A workspace has separate dialog state');runtime.activeWorkspace='gaming';
currentDirectory='/gaming/Project/Downloads';
const form={closest:()=>({dataset:{ownedDialog:'browser'}})};
events.submit({target:{closest:()=>form},preventDefault(){},stopImmediatePropagation(){}});
assert.equal(files.length,1);assert.equal(files[0].directory,currentDirectory,'Save follows the current owning context');
assert.equal(files[0].name,'My pending draft.txt');assert.equal(runtime.appWindowModel('browser').ownedDialog,undefined);
assert(runtime.appWindowModel('browser--2').ownedDialog,'Saving one instance leaves its sibling pending');
runtime.closeApp('browser--2');assert.equal(runtime.appWindowModel('browser--2').ownedDialog,undefined,'Closing the parent also closes its dialog');
assert(saves>0);
console.log('Owned dialogs passed: connected cards below their parent, one window identity, safe labels and filenames, independent instances/workspaces, park/restore focus, reload, current save destination and parent-close cleanup.');
