const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Audio=require('../dist/window-audio.js'),Apps=require('../dist/app-tools.js');

// Levels remain window-local when saved, reloaded and transferred.
const store=Apps.create(),first=store.get('work','browser--1',{}),second=store.get('work','browser--2',{});
assert.deepEqual(Audio.read(first),{volume:100,muted:false,silent:false,restore:100});
Audio.setVolume(first,37.4);assert.equal(first.volume,37);assert.equal(Audio.read(second).volume,100);
Audio.toggleMute(first);assert.equal(first.volume,37);assert.equal(first.muted,true);
Audio.toggleMute(first);assert.equal(first.muted,false);
Audio.setVolume(first,0);Audio.toggleMute(first);assert.equal(first.volume,37,'Unmute from zero restores the last audible level');
Audio.toggleMute(first);Audio.setVolume(first,24);assert.equal(first.muted,false,'Adjusting the slider unmutes');
Audio.setVolume(first,150);assert.equal(first.volume,100);
Audio.setVolume(first,-10);assert.equal(first.volume,0);
Audio.setVolume(first,NaN);assert.equal(first.volume,0);
Audio.toggleMute(first);assert.equal(first.volume,100);
Audio.setVolume(first,41);Audio.toggleMute(first);
store.copy('work','browser--1','gaming','browser--3');
const restored=Apps.create(JSON.parse(JSON.stringify(store.snapshot())));
assert.deepEqual(Audio.read(restored.get('gaming','browser--3')),Audio.read(first));
Audio.setVolume(restored.get('gaming','browser--3'),12);
assert.equal(first.volume,41,'Transferred state is not aliased to the original');
assert.equal(Audio.read(restored.get('gaming','browser--1',{})).volume,100,'Workspace state is isolated');

// Applying sound settings must not restart a preview or keep writing unchanged properties.
let writes=0,level=1,muted=false;
const media={currentTime:83,paused:false,get volume(){return level;},set volume(value){writes++;level=value;},get muted(){return muted;},set muted(value){writes++;muted=value;}};
Audio.apply(media,Audio.read(first));assert.equal(level,.41);assert.equal(muted,true);
Audio.apply(media,Audio.read(first));assert.equal(writes,2);
assert.equal(media.currentTime,83);assert.equal(media.paused,false);

// Run the production DOM adapter against two browser windows and Music Player.
const events={},frames={},models=Apps.create(),musicRenders=[];let saves=0;
function element(){return {dataset:{},attributes:{},style:{setProperty(){}},classList:{toggle(){}},setAttribute(key,value){this.attributes[key]=value;},getAttribute(key){return this.attributes[key];},addEventListener(type,callback){(this.events||={})[type]=callback;}};}
function control(){
  const group=element(),button=element(),range=element(),output=element();range.value='50';
  group.querySelector=selector=>({button,input:range,output}[selector]);
  group.button=button;group.range=range;group.output=output;
  return group;
}
function frame(id){
  const f={dataset:{appFrame:id},media:[],control:null};
  const header={querySelector:selector=>selector==='.window-audio'?f.control:{before(group){f.control=group;}},append(group){f.control=group;}};
  f.querySelector=selector=>selector==='.app-titlebar'?header:null;
  f.querySelectorAll=()=>f.media;
  return f;
}
for(const id of ['browser--1','browser--2','elisa'])frames[id]=frame(id);
models.get('work','elisa',{volume:72,muted:false,kind:'elisa'});
const preview={volume:1,muted:false,currentTime:42,isConnected:true,closest:selector=>selector==='[data-app-frame]'?frames['browser--1']:null};
frames['browser--1'].media.push(preview);
const context=vm.createContext({
  appWindowsReady:true,appWindowsHydrating:false,activeWorkspace:'work',
  appInfo:{'browser--1':{base:'browser',label:'Firefox'},'browser--2':{base:'browser',label:'Firefox'},elisa:{label:'Music Player'}},
  appState:{'browser--1':'open','browser--2':'open',elisa:'open'},
  appWindowModel:id=>models.get(context.activeWorkspace,id,{}),frameFor:id=>frames[id],
  isLocalApp:()=>true,bringToFront(){},icon:id=>id,prepareMaterialSurfaces(){},prepareControlSemantics(){},
  saveAppWindows(){saves++;},renderAppMusic:id=>musicRenders.push(id),restoreWorkspaceContent(){},installInstance(){},
  document:{createElement:control,querySelector:()=>({}),addEventListener(type,callback){events[type]=callback;}},
  MutationObserver:class{observe(){}},requestAnimationFrame(){return 1;}
});
vm.runInContext(fs.readFileSync(require.resolve('../dist/window-audio.js'),'utf8'),context);
function event(id,kind){
  const f=frames[id],target=kind==='mute'?f.control.button:f.control.range;
  target.closest=selector=>selector==='[data-app-frame]'?f:selector===(kind==='mute'?'[data-window-mute]':'[data-window-volume]')?target:null;
  return {target,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};
}
assert.equal(frames.elisa.control.range.value,72,'Music header uses its existing level');
const slider=event('browser--1','volume');slider.target.value='35';events.input(slider);
assert(slider.stopped,'Header inputs cannot reach browser navigation or editor handlers');
assert.equal(preview.volume,.35);assert.equal(preview.currentTime,42);
assert.equal(frames['browser--2'].control.range.value,100);
events.click(event('browser--1','mute'));assert.equal(preview.muted,true);
assert.equal(frames['browser--1'].control.button.attributes['aria-label'],'Unmute Firefox');
assert.equal(models.get('work','browser--2').muted,undefined);
preview.volume=.63;preview.muted=false;events.volumechange({target:preview});
assert.equal(frames['browser--1'].control.range.value,63,'Native media controls update their window header');
const music=event('elisa','volume');music.target.value='18';events.change(music);
assert.equal(models.get('work','elisa').volume,18);assert(musicRenders.includes('elisa'));
models.get('work','elisa').volume=55;context.renderAppMusic('elisa');
assert.equal(frames.elisa.control.range.value,55,'In-app Music changes update the same header');
context.activeWorkspace='gaming';preview.volume=.11;events.volumechange({target:preview});
assert.equal(models.snapshot().gaming,undefined,'A stale media event cannot write into another Workspace');
context.restoreWorkspaceContent();assert.equal(frames['browser--1'].control.range.value,100);
context.activeWorkspace='work';context.restoreWorkspaceContent();
assert.equal(frames['browser--1'].control.range.value,63,'Switching back restores the owning window’s level');
assert(saves>0);
console.log('Window audio: independent levels, mute, media sync, persistence and Workspace ownership passed');

// Master audio changes effective media output without overwriting a window level.
assert.equal(Audio.effective({volume:50,muted:false},{volume:40,outputMuted:false}).volume,20);
assert.equal(Audio.effective({volume:50,muted:false},{volume:40,outputMuted:true}).muted,true);
assert.equal(Audio.effective({volume:50,muted:true},{volume:100,outputMuted:false}).muted,true);
