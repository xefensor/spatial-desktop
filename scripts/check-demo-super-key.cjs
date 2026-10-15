const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const listeners = {}, windowListeners = {}, nodes = {};
const ctx = vm.createContext({
  document: { hidden:false, addEventListener(type, fn, capture) { (listeners[type] ||= []).push({fn,capture}); } },
  window: { addEventListener(type,fn) { (windowListeners[type] ||= []).push(fn); } },
  $: selector => nodes[selector] ||= {classList:{contains:()=>false},hidden:true},
  trapDialogFocus:()=>false, activateHotbarSlot:slot=>slots.push(slot),
  setUniversalSearchOpen:open=>{ overview=open; nodes['#universalSearch'].classList.contains=()=>overview; },
  superKeyAlone:false
});
let overview=false; const slots=[];
vm.runInContext(fs.readFileSync('dist/demo-super-key.js','utf8'),ctx);
const source=fs.readFileSync('dist/desktop-shell.js','utf8');
const start=source.indexOf('document.addEventListener("keydown", event => {\n  const packageDialog');
vm.runInContext(source.slice(start,source.indexOf('$$("[data-toast]")',start)),ctx);
function send(type,key,code=key,extra={}) {
 const event={type,key,code,target:{closest:()=>null},preventDefault(){this.defaultPrevented=true;},stopPropagation(){},...extra};
 for(const item of [...(listeners[type]||[])].sort((a,b)=>Number(!!b.capture)-Number(!!a.capture)))item.fn(event);
 return event;
}
send('keydown','F2');send('keyup','F2');assert.equal(overview,true,'F2 alone opens Overview');
send('keydown','F2');send('keydown','F2','F2',{repeat:true});send('keyup','F2');assert.equal(overview,false,'Repeat does not double-toggle');
for(const [digit,shift,slot] of [['1',false,1],['0',false,10],['2',true,12],['0',true,20]]) {
 send('keydown','F2');send('keydown',digit,'Digit'+digit,{shiftKey:shift});send('keyup','F2');
 assert.equal(slots.at(-1),slot);assert.equal(overview,false,'Chord release does not open Overview');
}
send('keydown','F2');send('keydown','x','KeyX');send('keyup','F2');assert.equal(overview,false,'Other keys consume standalone action');
send('keydown','F2');for(const fn of windowListeners.blur)fn();assert.equal(ctx.SpatialDemoSuper.held(),false);send('keyup','F2');assert.equal(overview,false,'Blur clears key and standalone action');
send('keydown','F2');send('pointerdown','');send('keyup','F2');assert.equal(overview,false,'Pointer use does not open Overview on release');
send('keydown','F2','F2',{ctrlKey:true});assert.equal(ctx.SpatialDemoSuper.held(),false);send('keyup','F2');assert.equal(overview,false,'Modified F2 does not activate the alias');
send('keydown','Meta');send('keyup','Meta');assert.equal(overview,true,'Native Super remains available');
send('keydown','F2');send('keydown',' ','Space');send('keyup','F2');assert.equal(overview,false,'F2+Space uses the existing Overview shortcut once');
console.log('Demo Super alias passed: F2 tap/repeat, both hotbar banks, native Super, Space, pointer/other-key suppression, blur and modified-key guards.');
