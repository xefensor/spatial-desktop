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

class Node {
  constructor(){this.dataset={};this.children=[];this.style={setProperty(){}};this.attrs={};this.hidden=false;}
  append(node){node.parent=this;this.children.push(node);}
  remove(){this.parent.children=this.parent.children.filter(node=>node!==this);}
  setAttribute(k,v){this.attrs[k]=v;}
}
const row=new Node(),events={},opened=[],closed=[],timeouts=[];
const store=A.create(),models={};let saves=0;
const context=vm.createContext({appInfo:{},appState:{},activeWorkspace:'gaming',appWindowStore:store,
  appWindowModel:id=>store.get(context.activeWorkspace,id,()=>models[id]||{kind:id}),
  document:{getElementById:id=>id==='backgroundApps'?row:null,querySelectorAll:()=>[],createElement:()=>new Node(),addEventListener:(type,fn)=>events[type]=fn},
  frameFor:()=>null,prepareControlSemantics(){},appArt:id=>'<svg>'+id+'</svg>',
  saveAppWindows(){saves++;},closeApp:id=>{closed.push(id);context.appState[id]='closed';},openApp:id=>{opened.push(id);context.appState[id]='open';},
  syncApps(){},renderMiniApps(){},renderAllAppMusic(){},hydrateAppWindow(){},contextMenuDescriptor:()=>null,contextMenuEntries:()=>[],executeContextAction(){},
  showToast(){},setTimeout:fn=>{timeouts.push(fn);return timeouts.length;},Date});
vm.runInContext(fs.readFileSync(require.resolve('../dist/background-apps.js'),'utf8'),context);
assert(row.hidden,'No background activity reserves no bottom row');
function add(id,kind,model){context.appInfo[id]={base:kind,label:id,primary:'#abc'};context.appState[id]='open';models[id]={kind,...model};return context.appWindowModel(id);}
const player=add('player','elisa',{playing:true}),sibling=add('player--2','elisa',{playing:true}),idle=add('idle','elisa',{playing:false});
context.closeApp('player');
assert.equal(context.appState.player,'closed');assert(player.background&&player.playing);
assert.equal(row.hidden,false);assert.equal(row.children[0].dataset.backgroundOpen,'player');
assert.equal(row.children[0].dataset.hotbarSlot,undefined,'No phantom window shortcut');
context.closeApp('idle');assert(!idle.background);assert.equal(row.children.length,1,'Idle Close exits without a background icon');
context.openApp('player');assert(!player.background&&player.playing);assert(row.hidden,'Opening a window removes its background-only icon');
context.closeApp('player');
const saved=A.create(JSON.parse(JSON.stringify(store.snapshot())));assert(saved.get('gaming','player').background,'Background state survives reload');
const source={dataset:{miniClose:'player'}};
events.auxclick({button:1,target:{closest:()=>source},preventDefault(){},stopImmediatePropagation(){}});
assert(!player.background&&!player.playing);assert(sibling.playing,'Force quit does not stop an independent instance');
assert(row.hidden);
const steam=add('steam','steam',{download:{active:true,received:100,total:400,updated:Date.now()}});
context.closeApp('steam');assert(steam.background&&steam.download.active);assert.equal(row.children.length,1);
assert.match(row.children[0].attrs['aria-label'],/Background.*25%/);
context.activeWorkspace='work';context.syncApps();assert(row.hidden,'Background icons stay in their owning workspace');
context.activeWorkspace='gaming';context.syncApps();assert(!row.hidden);
context.contextMenuState={name:'steam'};context.executeContextAction('app-force-quit');
assert(!steam.download.active&&!steam.background);assert(row.hidden);
context.appState.game='open';context.appState.steam='open';context.closeApp('steam');assert(steam.background,'A game session can keep Steam services alive');
context.appState.game='closed';context.syncApps();assert(!steam.background&&row.hidden,'The last activity ending removes the icon without opening a window');
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
console.log('Background apps passed: needed vs idle Close, separate window/activity state, bottom-only icons, no duplicate window slots, restore, force quit by middle click/menu, independent instances/workspaces, reload, activity completion, download sync and real background music ticking.');
