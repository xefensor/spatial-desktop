const assert=require('node:assert/strict');
const R=require('../dist/system-rail.js');
// Every edge opens beside the rail, stays on screen, and leaves its anchor intact.
for(const edge of ['left','right','top','bottom']){
  const anchor={left:420,right:490,top:300,bottom:350},before=JSON.stringify(anchor),box=R.position(edge,anchor,{width:330,height:240},{width:1000,height:800});
  assert.equal(JSON.stringify(anchor),before);
  assert(box.left>=12&&box.top>=12&&box.left+box.width<=988&&box.top+box.height<=788);
  if(edge==='left')assert(box.left>anchor.right);
  if(edge==='right')assert(box.left+box.width<anchor.left);
  if(edge==='top')assert(box.top>anchor.bottom);
  if(edge==='bottom')assert(box.top+box.height<anchor.top);
  const clipped=R.position(edge,{left:0,right:70,top:0,bottom:60},{width:330,height:900},{width:220,height:180});
  assert.equal(clipped.width,196);assert.equal(clipped.height,156);assert.equal(clipped.top,12);
}
// Media may include active local windows and explicitly shared service models;
// a model from an unrelated private Workspace is never searched or selected.
const local={id:'music',model:{playing:false},shared:false},shared={playing:true};
assert.equal(R.choosePlayer(local,[shared]).model,shared);
local.model.playing=true;assert.equal(R.choosePlayer(local,[shared]),local);
local.model.playing=false;shared.playing=false;assert.equal(R.choosePlayer(local,[shared]),local);
assert.equal(R.choosePlayer(null,[shared]).shared,true);assert.equal(R.choosePlayer(null,[]),null);

// Exercise the production flyout lifecycle with the actual node-moving logic.
class Node{
  constructor(name){this.name=name;this.children=[];this.parentNode=null;this.hidden=false;this.inert=false;this.isConnected=true;this.attributes={};this.shown=false;}
  append(...nodes){for(const node of nodes){node.remove();this.children.push(node);node.parentNode=this;}}
  insertBefore(node,reference){node.remove();const index=this.children.indexOf(reference);assert(index>=0);this.children.splice(index,0,node);node.parentNode=this;}
  before(node){this.parentNode.insertBefore(node,this);}
  remove(){if(this.parentNode){if(this.contains(active))active=null;this.parentNode.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null;}}
  contains(node){return this===node||this.children.some(child=>child.contains(node));}
  setAttribute(key,value){this.attributes[key]=value;}
  focus(){active=this;}
  matches(){return this.shown;}
  showPopover(){this.shown=true;}
  hidePopover(){this.shown=false;}
}
let active=null,positions=0;
const home=new Node('home'),one=new Node('notifications'),two=new Node('timer'),third=new Node('devices'),popup=new Node('popup'),content=new Node('content'),title={},scope={},empty={};
home.append(one,two,third);popup.append(content);
const origin=new Node('origin');
const controller=R.createFlyout({document:{createComment:()=>new Node('marker'),get activeElement(){return active;}},popup,content,title,scope,empty,onPosition:()=>positions++});
controller.open({key:'notifications',label:'Notifications',scope:'Work',nodes:[one],origin,context:'work|rail'});
assert.deepEqual(content.children,[one]);assert.equal(one.parentNode,content);assert.equal(controller.owns(one),true);assert.equal(controller.owns(origin),true);assert.equal(controller.owns(third),false);
assert.equal(title.textContent,'Notifications');assert.equal(scope.textContent,'Work');assert.equal(origin.attributes['aria-expanded'],'true');assert.equal(active,popup);assert.equal(popup.shown,true);assert.equal(empty.hidden,true);
one.focus();
controller.withRestored(()=>assert.deepEqual(home.children.filter(node=>node.name!=='marker'),[one,two,third]));
assert.equal(active,one,'Saving state preserves keyboard focus inside a borrowed widget');
assert.equal(one.parentNode,content,'Snapshot returns the live widget to the open flyout afterwards');
assert.throws(()=>controller.withRestored(()=>{throw Error('storage denied');}),/storage denied/);assert.equal(one.parentNode,content,'Snapshot errors still remount the widget');
controller.reconcile('work|rail');assert(controller.current());
controller.reconcile('gaming|rail');assert.equal(controller.current(),null);assert.equal(popup.hidden,true);assert.equal(popup.inert,true);assert.equal(popup.shown,false);assert.deepEqual(home.children,[one,two,third]);assert.equal(origin.attributes['aria-expanded'],'false');
controller.open({key:'timer',label:'Focus timer',nodes:[two],origin,context:'work|rail'});
controller.close(true);assert.equal(active,origin);assert.deepEqual(home.children,[one,two,third]);
controller.open({key:'notifications',label:'Notifications',nodes:[one],origin,context:'work|rail'});
controller.open({key:'timer',label:'Focus timer',nodes:[two],origin,context:'work|rail'});
assert.deepEqual(home.children.filter(node=>node.name!=='marker'),[one,third]);assert.deepEqual(content.children,[two]);
assert.equal(controller.open({key:'timer',label:'Focus timer',nodes:[two],origin,context:'work|rail'}),false,'Clicking the same tool closes it');
assert.deepEqual(home.children,[one,two,third]);
one.hidden=true;controller.open({key:'empty',label:'Notifications',empty:'No notifications.',nodes:[one],origin,context:'work|rail'});assert.equal(empty.hidden,false);assert.equal(empty.textContent,'No notifications.');
controller.close();assert.deepEqual(home.children,[one,two,third]);assert(positions>=5);
console.log('System rail tools passed: four-edge bounded placement, local/shared media selection, original node/listener identity, ordered snapshots, error recovery, switching, empty state and context cleanup.');
