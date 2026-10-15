const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const G=require('../dist/all-workspaces.js');
const profiles={work:{},gaming:{},general:{}};
assert.equal(G.destination({workspace:'gaming'},'work',profiles),'gaming');
assert.equal(G.destination({},'work',profiles),'work');
assert.equal(G.destination({system:true},'work',profiles),null);
assert.equal(G.destination({workspace:'missing'},'work',profiles),undefined);
const store=G.create();
store.add({id:'game',workspace:'gaming',app:'steam',title:'Jamie invited you',detail:'Co-op lobby',time:10});
store.add({id:'work',workspace:'work',title:'Review ready',time:20});
store.add({id:'system',workspace:null,title:'Low battery',time:30});
assert.equal(store.list('work').length,1);assert(!store.list('work').some(n=>n.id==='game'),'Local notification lists never include another workspace');
assert.equal(store.list(null).length,1,'System alerts have an explicit shared scope');
store.markImported('gaming');store.dismiss('game',40);
const stale=G.create();stale.add({id:'game',workspace:'gaming',title:'Stale invitation',time:10});
store.merge(stale.snapshot());assert.equal(store.get('game'),null,'Display sync cannot resurrect a dismissed notification');
const restored=G.create(JSON.parse(JSON.stringify(store.snapshot())));assert(restored.imported('gaming'));assert.equal(restored.get('game'),null);assert.equal(restored.list('work')[0].title,'Review ready');
for(let i=0;i<120;i++)store.add({id:'bounded'+i,workspace:'work',title:'Notice',time:100+i});assert.equal(store.list('work').length,100);
const privateNote=G.displayNotification({title:'Private filename',detail:'/private/folder'},{previewHidden:true},'Firefox');
assert.equal(privateNote.title,'Firefox notification');assert.equal(privateNote.detail,'Preview hidden');
const info={web:{label:'Firefox'},music:{label:'Music Player'},steam:{label:'Steam'}};
const models={web:{kind:'browser',previewHidden:true,ownedDialog:{title:'Save page',filename:'private.txt'}},music:{kind:'elisa',background:true,playing:true,index:0,tracks:[{title:'Private song'}]},steam:{kind:'steam',background:true,download:{active:true,received:200,total:400}}};
const states={web:'minimized',music:'closed',steam:'closed'};
const items=G.activities(models,states,'gaming','work',info);
assert(items.some(item=>item.category==='Needs input'&&item.detail==='Preview hidden'));
assert(!items.some(item=>item.detail.includes('private.txt')));
assert(items.some(item=>item.category==='Saved playback'&&item.detail==='Resumes in this workspace'),'An inactive simulated player is not falsely labelled as audible now');
assert(items.some(item=>item.category==='Background download'&&item.detail.includes('50%')));
assert(G.activities(models,states,'gaming','gaming',info).some(item=>item.category==='Playing audio'));
models.steam.background=false;assert(!G.activities(models,states,'gaming','work',info).some(item=>item.app==='steam'),'Force-quit instances are excluded');

// Exercise the production attention guard, including a queued event after switching.
const shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
let attention=0,peek=0;
const alerts=vm.createContext({activeWorkspace:'work',notificationAttentionTimer:0,areaFor(){attention++;return null;},$:()=>({classList:{remove(){}}}),$$:()=>[],clearTimeout(){},setTimeout:()=>1,showNotificationPeek(){peek++;}});
vm.runInContext(shell.slice(shell.indexOf('function drawAttentionToNotification('),shell.indexOf('function addNotification(')),alerts);
alerts.drawAttentionToNotification({isConnected:true,dataset:{notificationWorkspace:'gaming'}},'Gaming invite','Private lobby','blue','i-bell');
alerts.drawAttentionToNotification({isConnected:false,dataset:{notificationWorkspace:'work'}},'Old work alert','','blue','i-bell');
assert.equal(attention,0);assert.equal(peek,0,'Neither another workspace nor a detached delayed item can show a popup');
alerts.drawAttentionToNotification({isConnected:true,dataset:{notificationWorkspace:'work'}},'Work alert','','blue','i-bell');assert.equal(peek,1);
console.log('All Workspaces passed: explicit notification origins, local-only lists, shared System alerts, bounded persistence, dismissal tombstones, privacy, real activity projection and cross-workspace/delayed-popup guards.');

// Changing presets clears this session's notification history with other workspace data.
const Setup = require('../dist/workspace-setup.js');
const remaining = new Map([['spatial-workspace-notifications-v1','private demo activity']]);
Setup.reset({removeItem:key=>remaining.delete(key),setItem:(key,value)=>remaining.set(key,value)}, 'clean');
assert(!remaining.has('spatial-workspace-notifications-v1'));
