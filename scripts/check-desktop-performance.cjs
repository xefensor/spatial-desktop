const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// The real clock scheduler must stay accurate after sleeping without idle work.
const desktop = fs.readFileSync(require.resolve('../dist/desktop-shell.js'), 'utf8');
let now = 59000, clockWrites = 0, sequence = 0;
const timers = new Map(), clockListeners = {};
const clockDocument = {hidden:false,addEventListener:(name,fn)=>clockListeners[name]=fn};
const clock = vm.createContext({document:clockDocument, Date:{now:()=>now}, updateClock:()=>clockWrites++,
  setTimeout:(fn,delay)=>{const id=++sequence;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)});
vm.runInContext(desktop.slice(desktop.indexOf('function prepareClockUpdates()'), desktop.indexOf('function renderCalendar()')),clock);
clock.prepareClockUpdates();
assert.equal(clockWrites,1);
assert.equal([...timers.values()][0].delay,1000,'First refresh aligns to the minute boundary');
now=60000;[...timers.values()][0].fn();
assert.equal(clockWrites,2);assert.equal([...timers.values()][0].delay,60000);
clockDocument.hidden=true;clockListeners.visibilitychange();
assert.equal(timers.size,0);assert.equal(clockWrites,2,'A hidden clock does not write');
now=600000;clockDocument.hidden=false;clockListeners.visibilitychange();
assert.equal(clockWrites,3,'Returning updates the clock immediately');assert.equal(timers.size,1);

// Paused players must neither repaint nor save. Playing keeps advancing hidden.
const apps = fs.readFileSync(require.resolve('../dist/app-windows.js'), 'utf8');
const tools = require('../dist/app-tools.js');
let renders=0,saves=0;
const models={music:{playing:false,position:0,index:0,tracks:[{duration:120}]},other:{playing:true,position:0,index:0,tracks:[{duration:120}]}};
const musicDocument={hidden:false};
const music=vm.createContext({appInfo:{music:{base:'elisa'},other:{base:'elisa'}},appState:{music:'minimized',other:'closed'},
  appWindowModel:id=>models[id],SpatialAppTools:tools,document:musicDocument,renderAllAppMusic:()=>renders++,saveAppWindows:()=>saves++});
vm.runInContext(apps.slice(apps.indexOf('function tickAppMusic()'),apps.indexOf('function appMiniMarkup(')),music);
for(let i=0;i<60;i++)music.tickAppMusic();
assert.equal(saves,0);assert.equal(renders,0);assert.equal(models.other.position,0);
models.music.playing=true;music.tickAppMusic();
assert.equal(models.music.position,1);assert.equal(renders,1);assert.equal(saves,1);
musicDocument.hidden=true;music.tickAppMusic();
assert.equal(models.music.position,2);assert.equal(renders,1);assert.equal(saves,2);
models.music.playing=false;music.tickAppMusic();assert.equal(saves,2);

// A canceled drag or loss of focus cannot leave decoration permanently paused.
const attributes=new Set(),listeners={},windowListeners={};
const backgroundDocument={hidden:false,documentElement:{
  setAttribute:name=>attributes.add(name),removeAttribute:name=>attributes.delete(name),
  toggleAttribute:(name,on)=>on?attributes.add(name):attributes.delete(name)},addEventListener:(name,fn)=>listeners[name]=fn};
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/desktop-background.js'),'utf8'),{document:backgroundDocument,window:{addEventListener:(name,fn)=>windowListeners[name]=fn}});
listeners.pointerdown();assert(attributes.has('data-background-busy'));
listeners.pointercancel();assert(!attributes.has('data-background-busy'));
listeners.pointerdown();windowListeners.blur();assert(!attributes.has('data-background-busy'));
backgroundDocument.hidden=true;listeners.visibilitychange();assert(attributes.has('data-page-hidden'));
backgroundDocument.hidden=false;listeners.visibilitychange();assert(!attributes.has('data-page-hidden'));
console.log('Desktop performance passed: minute-aligned clock, hidden-page recovery, no idle music rendering/storage, continuing playback and canceled-drag recovery.');
