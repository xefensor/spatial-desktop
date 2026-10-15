const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const B=require('../dist/background-apps.js'),A=require('../dist/app-tools.js');
assert.equal(B.reason('elisa',{playing:true}),'Playing music');assert.equal(B.reason('elisa',{playing:false}),'');
assert.equal(B.reason('browser',{},true),'');assert.equal(B.reason('steam',{},true),'Game session');
const download={active:true,received:10,total:400,updated:1000};
assert(B.advance(download,6000));assert.equal(download.received,20);
assert(!B.advance(download,6000),'Repeated same-time sync does not duplicate progress');
B.advance(download,300000);assert.equal(download.received,400);assert.equal(download.active,false);
const cancelled={kind:'steam',background:true,download:{active:true,received:20}};B.stop(cancelled);
assert(!cancelled.background&&!cancelled.download.active);assert.equal(cancelled.download.received,20,'Force quit stops work while preserving already received data');

const Services=require('../dist/background-services.js');
const storage=new Map(),events={},opened=[],closed=[],timeouts=[],nodes=new Map();let sequence=0;
class Node {
  constructor(key='node'){this.key=key;this.dataset={};this.children=[];this.style={setProperty(){}};this.attrs={};this.hidden=false;this.isConnected=true;this.offsetHeight=200;}
  set innerHTML(value){this.html=value;this.children=value?[new Node('content')]:[];}get innerHTML(){return this.html||'';}
  append(node){node.parent=this;this.children.push(node);}replaceChildren(...nodes){this.children=nodes;}
  remove(){this.parent.children=this.parent.children.filter(node=>node!==this);}
  setAttribute(k,v){this.attrs[k]=v;}focus(){}contains(target){return target===this;}getBoundingClientRect(){return {right:100,top:300};}
  querySelector(selector){if(this===row)return this.children.find(node=>selector.includes(node.dataset.backgroundOpen));const key=this.key+selector;if(!nodes.has(key))nodes.set(key,new Node(key));return nodes.get(key);}
}
const row=new Node('row'),popup=new Node('popup');popup.id='backgroundAppPopup';popup.hidden=true;
const store=A.create(),models={};let saves=0;
const context=vm.createContext({SpatialBackgroundServices:Services,SpatialAppTools:A,appInfo:{},appState:{},activeWorkspace:'gaming',appWindowStore:store,workspaceAppStates:{gaming:{},work:{}},workspaceProfiles:{gaming:{label:'Gaming',icon:'i-gamepad'},work:{label:'Work',icon:'i-note'}},
  appWindowModel:id=>store.get(context.activeWorkspace,id,()=>models[id]||{kind:context.appInfo[id]?.base||id}),
  document:{getElementById:id=>id==='backgroundApps'?row:id==='backgroundAppPopup'?popup:null,querySelectorAll:()=>[],createElement:()=>new Node(),addEventListener:(type,fn)=>events[type]=fn},
  desktopStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},crypto:{randomUUID:()=>String(++sequence)},innerWidth:1200,innerHeight:800,addEventListener(){},queueDesktopStateBroadcast(){},captureDesktopSyncState:()=>({}),persistIncomingDesktopState(){},
  frameFor:()=>null,prepareControlSemantics(){},appArt:id=>'<svg>'+id+'</svg>',desktopPageAnimating:false,desktopPages:{column:()=> 'workspace'},windowMembership:{},instanceSequence:0,instanceDefinitions:{},installInstance(id,base){context.appInfo[id]={...context.appInfo[base],base};context.appState[id]='closed';},saveIndependentSessions(){},
  renderWorkspace:workspace=>{context.workspaceAppStates[context.activeWorkspace]={...context.appState};context.activeWorkspace=workspace;context.appState={...context.workspaceAppStates[workspace]};},
  saveAppWindows(){saves++;},closeApp:id=>{closed.push(id);context.appState[id]='closed';},openApp:id=>{opened.push(id);context.appState[id]='open';},
  syncApps(){},renderMiniApps(){},renderAllAppMusic(){},hydrateAppWindow(){},setUniversalSearchOpen(){},contextMenuDescriptor:()=>null,contextMenuEntries:()=>[],executeContextAction(){},
  showToast(){},setTimeout:fn=>{timeouts.push(fn);return timeouts.length;},Date});
vm.runInContext(fs.readFileSync(require.resolve('../dist/background-apps.js'),'utf8'),context);
assert(row.hidden,'No background activity reserves no bottom row');
function add(id,kind,model){context.appInfo[kind]||={label:kind,primary:'#abc'};context.appInfo[id]={base:kind,label:id,primary:'#abc'};context.appState[id]='open';models[id]={kind,...model};return context.appWindowModel(id);}
const player=add('player','elisa',{playing:true,index:0,position:12,tracks:[{title:'One',duration:100}]}),sibling=add('player--2','elisa',{playing:true}),idle=add('idle','elisa',{playing:false});
context.closeApp('player');
assert.equal(context.appState.player,'closed');assert(!player.background&&!player.playing,'Background playback is detached from the old Workspace model');
assert.equal(row.hidden,false);const serviceId=row.children[0].dataset.backgroundOpen;
assert.equal(row.children[0].dataset.backgroundWorkspace,undefined);assert.equal(row.children[0].dataset.hotbarSlot,undefined);
assert.match(row.children[0].attrs['aria-label'],/System-wide background app/);assert(!row.children[0].attrs['aria-label'].includes('Gaming'));
assert(!row.children[0].innerHTML.includes('workspace-icon'));
const snapshot=context.SpatialBackgroundApps.snapshot(),service=snapshot.items[0];
assert(service.model.playing);assert.equal(service.workspace,undefined);assert.equal(service.project,undefined);assert.equal(service.desktop,undefined);
assert.equal(Services.create(JSON.parse(storage.get('spatial-background-services-v1'))).get(serviceId).model.position,12,'Detached service survives reload in shared storage');
context.closeApp('idle');assert.equal(row.children.length,1,'An idle app does not create a service');
context.renderWorkspace('work');context.syncApps();assert(!row.hidden,'The same shared service is visible in another Workspace');
events.click({target:{closest:selector=>selector==='[data-background-open]'?row.children[0]:null},preventDefault(){},stopImmediatePropagation(){}});
assert.equal(context.activeWorkspace,'work');assert.equal(popup.hidden,false,'Click shows global controls without navigating');
const openedId=context.SpatialBackgroundApps.restore(serviceId);
assert.equal(context.activeWorkspace,'work');assert.equal(context.appState[openedId],'open');assert.equal(context.appWindowModel(openedId).position,12);assert(context.appWindowModel(openedId).playing);assert(row.hidden,'Restoring removes the background-only service');
assert(!player.playing,'Restoring here does not revive the old window');
context.closeApp(openedId);const restoredService=row.children[0].dataset.backgroundOpen;
events.auxclick({button:1,target:{closest:()=>row.children[0]},preventDefault(){},stopImmediatePropagation(){}});
assert(row.hidden);assert(sibling.playing,'Force quit leaves another instance alone');
const stale=Services.create();stale.merge(snapshot);stale.merge(context.captureDesktopSyncState().backgroundServices);stale.merge(snapshot);assert(!stale.get(serviceId),'A stopped/restored service cannot be revived by an old display snapshot');
// Old per-Workspace background flags migrate once and never come back after Stop.
context.activeWorkspace='gaming';context.appState={};const legacyPlayer=add('legacy-player','elisa',{background:true,playing:true});context.appState['legacy-player']='closed';context.syncApps();const legacy=row.children[0].dataset.backgroundOpen;
assert(legacy.startsWith('legacy-'));assert(!legacyPlayer.background&&!legacyPlayer.playing);context.SpatialBackgroundApps.stop(legacy);legacyPlayer.background=true;legacyPlayer.playing=true;context.syncApps();assert(row.hidden,'A stale legacy model cannot resurrect a stopped service');
const steam=add('steam','steam',{download:{active:true,received:100,total:400,updated:Date.now()}});
context.closeApp('steam');assert(!steam.download.active);assert.equal(row.children.length,1);assert.match(row.children[0].attrs['aria-label'],/25%/);
const steamService=row.children[0].dataset.backgroundOpen;context.renderWorkspace('work');context.syncApps();assert(context.SpatialBackgroundApps.running('steam'));
context.contextMenuState={name:'steam',background:true,backgroundService:steamService};context.executeContextAction('app-force-quit');assert.equal(context.activeWorkspace,'work');assert(row.hidden);
context.appState.game='open';context.appState.steam='open';const localSteam=context.appWindowModel('steam');localSteam.kind='steam';delete localSteam.download;context.closeApp('steam');assert(!row.hidden,'A running game may keep the global Steam service alive');
context.appState.game='closed';context.workspaceAppStates.gaming.game='closed';context.syncApps();assert(row.hidden,'The last game ending releases its service');
assert(timeouts.length>0);assert(saves>0);

// Use the production music selection/tick code with a closed background player.
const appSource=fs.readFileSync(require.resolve('../dist/app-windows.js'),'utf8');
let tickSaves=0;
const musicModel={kind:'elisa',background:true,playing:true,index:0,position:0,tracks:[{title:'One',duration:10}]};
const music=vm.createContext({appInfo:{music:{base:'elisa'}},appState:{music:'closed'},appWindowModel:()=>musicModel,SpatialAppTools:A,document:{hidden:true},saveAppWindows(){tickSaves++;}});
vm.runInContext(appSource.slice(appSource.indexOf('function currentAppMusicId('),appSource.indexOf('function renderAllAppMusic(')),music);
vm.runInContext(appSource.slice(appSource.indexOf('function tickAppMusic('),appSource.indexOf('function appMiniMarkup(')),music);
assert.equal(music.currentAppMusicId(),'music');music.tickAppMusic();assert.equal(musicModel.position,1);assert.equal(tickSaves,1);
musicModel.playing=false;music.tickAppMusic();assert.equal(tickSaves,1,'Idle playback creates no repeating writes');
const foreignMusic={kind:'elisa',background:true,playing:true,index:0,position:0,tracks:[{title:'Other',duration:20}]};
music.SpatialBackgroundApps={players:()=>[foreignMusic]};music.tickAppMusic();assert.equal(foreignMusic.position,1,'Closed background playback continues from another workspace');
foreignMusic.playing=false;music.tickAppMusic();assert.equal(foreignMusic.position,1,'Stopped background players do not tick');
console.log('Background apps passed: ownerless shared services, legacy migration, stale-snapshot tombstones, same icons everywhere, global controls without navigation, restore here, independent force quit, reload, game lifecycle and real music ticking.');
