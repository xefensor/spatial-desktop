const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {fit,card}=require('../dist/virtual-screen.js');
for(const [w,h] of [[1920,1080],[500,900],[1300,400],[4000,2200],[0,0]]){
 const result=fit(w,h);assert(result.width<=w+1e-8);assert(result.height<=h+1e-8);
 if(result.scale)assert(Math.abs(result.width/result.height-16/9)<1e-10);
}
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const args={name:'game',label:'Fallout <4>',primary:'#abc',shortcut:'',detail:'Sanctuary Hills',privatePreview:false,minimized:false,page:0,escape,art:'<i>game</i>',icon:()=>'<svg></svg>'};
let html=card({...args,fullscreen:true});
assert(html.includes('Gamescope · Fullscreen'));assert(html.includes('Show tiled'));assert(html.includes('data-virtual-screen-tiled="game"'));assert(html.includes('Fallout &lt;4>'));assert(html.includes('2560 × 1440'));assert(!html.includes('Show fullscreen'));assert(!html.includes('Temporary desktop'));assert(html.includes('F2+F'));
html=card(args);assert(html.includes('Gamescope · Tiled'));assert(html.includes('Show fullscreen'));assert(!html.includes('data-fullscreen-action'));
html=card({...args,privatePreview:true});assert(!html.includes('Sanctuary Hills'));assert(html.includes('Preview hidden'));assert(html.includes('data-peek-kind="private"'));
const css=fs.readFileSync('dist/virtual-screen.css','utf8');assert(css.includes('width:2560px!important;height:1440px!important'));assert(css.includes('background:#050706'));
console.log('Gamescope canvas passed: fixed-canvas aspect/containment at tall/wide/zero sizes, distinct presentation cards, safe labels and hidden-preview content.');

html=card({...args,minimized:true});assert(html.includes('Gamescope · Parked'));assert(html.includes('Unpark game'));
