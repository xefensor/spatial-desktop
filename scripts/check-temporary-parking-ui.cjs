const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Temporary=require('../dist/temporary-parking.js'),Pages=require('../dist/desktop-pages.js'),T=require('../dist/spatial-tiling.js');
const dataKey=name=>name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.className='';this.hidden=false;this.listeners={};this._text='';this._html='';
    this.style={values:{},setProperty(name,value){this.values[name]=String(value);},getPropertyValue(name){return this.values[name]||'';}};}
  get parentElement(){return this.parent||null;}
  set textContent(value){this.replaceChildren();this._text=String(value);this._html='';}
  get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
  set innerHTML(value){assert(!this.hasAttribute('data-mini-card'),'Decoration must not replace an existing card or its controls');this.replaceChildren();this._html=String(value);this._text='';}
  get innerHTML(){return this._html;}
  setAttribute(name,value){if(name.startsWith('data-'))this.dataset[dataKey(name)]=String(value);else this.attrs[name]=String(value);}
  getAttribute(name){return name.startsWith('data-')?this.dataset[dataKey(name)]??null:this.attrs[name]??null;}
  hasAttribute(name){return this.getAttribute(name)!==null;}
  remove(){if(!this.parent)return;this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
  append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);}}
  prepend(...nodes){for(const node of [...nodes].reverse()){node.remove();node.parent=this;this.children.unshift(node);}}
  replaceChildren(...nodes){for(const node of [...this.children])node.remove();this._text='';this._html='';this.append(...nodes);}
  contains(node){return this===node||this.children.some(child=>child.contains(node));}
  cloneNode(){throw new Error('The temporary parking adapter must move live cards, not clone them');}
  matches(selector){
    if(selector.startsWith('.'))return this.className.split(/\s+/).includes(selector.slice(1));
    const attr=/^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
    if(attr)return this.hasAttribute(attr[1])&&(attr[2]===undefined||this.getAttribute(attr[1])===attr[2]);
    return this.tagName===selector;
  }
  querySelectorAll(selector){
    const parts=selector.trim().split(/\s+/),descendants=this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);
    if(selector==='*')return descendants;
    return descendants.filter(node=>{
      if(!node.matches(parts.at(-1)))return false;
      let ancestor=node.parent;
      for(let at=parts.length-2;at>=0;at--){while(ancestor&&ancestor!==this&&!ancestor.matches(parts[at]))ancestor=ancestor.parent;if(!ancestor||ancestor===this)return false;ancestor=ancestor.parent;}
      return true;
    });
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);}
  dispatch(type){for(const handler of this.listeners[type]||[])handler({target:this});}
}
const node=(tag,className='',text='')=>{const result=new Element(tag);result.className=className;result.textContent=text;return result;};
const section=node('section'),heading=node('header','section-heading','Parked'),stack=node('div'),rack=node('div');section.append(heading,stack);
const pages=Pages.create();
const memberships={owner0:[0,1],note:[0,1],owner1:[1,1],terminal:[1,1],privateOwner:[1,2],preview:[1,2],manual:[0,1]};
for(const [id,[page]]of Object.entries(memberships))pages.assign('work',id,page);
pages.go('work',1);
const sessions={};
function focus(owner,peer,page,display){sessions['work:desktop:'+page+':'+display]={root:T.leaf(owner),focus:{name:owner,parked:[peer]},parked:{[peer]:{reason:'Focused TOP SECRET DOCUMENT'}}};}
focus('owner0','note',0,1);focus('owner1','terminal',1,1);focus('privateOwner','preview',1,2);
const state={owner0:'open',note:'minimized',owner1:'open',terminal:'minimized',privateOwner:'open',preview:'minimized',manual:'minimized'};
const assignments=Object.fromEntries(Object.entries(memberships).map(([id,[,display]])=>[id,display]));
const cardColors={note:'#f4c155',manual:'#3bb5dd',terminal:'#ac85ef',preview:'#e985a5'};
const opened=[],closed=[],dragged=[],artCalls=[],originalCards=new Map(),railButtons=new Map();let renders=0,rackSyncs=0;
for(const id of ['note','terminal','preview','manual','owner0']){
  const button=node('button','app-key');button.dataset.openApp=id;button.dataset.hotbarSlot=String(railButtons.size+1);
  button.title=id+' · Super+'+button.dataset.hotbarSlot;button.setAttribute('aria-label','Open '+id);
  button.addEventListener('click',()=>opened.push(id));rack.append(button);railButtons.set(id,button);
}
const context={SpatialTemporaryParking:Temporary,SpatialPreviewPrivacy:{hidden:id=>id==='privateOwner'},
  document:{getElementById:id=>id==='miniStack'?stack:id==='appRack'?rack:null,createElement:tag=>new Element(tag)},
  tileSessions:sessions,activeWorkspace:'work',desktopPages:pages,appState:state,
  appInfo:{owner0:{label:'Firefox',primary:'#e96f32'},owner1:{label:'Terminal',primary:'#54c791'},privateOwner:{label:'SECRET PROJECT TITLE',primary:'#3512a7'}},
  displayAssignmentsFor:()=>({apps:assignments}),activeDisplayRoster:()=>[{},{}],localDisplaySlot:()=>2,
  appArt:(id,kind)=>{artCalls.push([id,kind]);return '<svg>'+id+'</svg>';},icon:id=>'<svg>'+id+'</svg>',
  renderMiniApps(){
    renders++;stack.replaceChildren();originalCards.clear();
    for(const id of ['note','manual','terminal','preview']){
      if(state[id]!=='minimized'||!pages.inColumn('work',id))continue;
      const card=node('article','mini-card');card.dataset.miniCard=id;card.style.setProperty('--app-primary',cardColors[id]);
      const header=node('header'),key=node('kbd','mini-hotkey',String(originalCards.size+1)),actions=node('div','mini-actions');
      const restore=node('button','mini-control'),close=node('button','mini-control');restore.dataset.miniRestore=id;close.dataset.miniClose=id;
      restore.setAttribute('aria-label','Unpark '+id);close.setAttribute('aria-label','Close '+id);
      restore.addEventListener('click',()=>opened.push(id));close.addEventListener('click',()=>closed.push(id));
      header.addEventListener('pointerdown',()=>dragged.push(id));actions.append(restore,close);header.append(key,actions);
      // A live widget and owned-dialog relationship must survive grouping too.
      const field=node('textarea');field.value='Unsaved '+id;
      const dialog=node('button','parked-owned-dialog-restore');dialog.dataset.ownedDialogRestore=id;dialog.addEventListener('click',()=>opened.push(id+'-dialog'));
      card.append(header,field,dialog);stack.append(card);originalCards.set(id,{card,header,key,restore,close,field,dialog});
    }
  },
  syncRack(){rackSyncs++;return 'original-rack-result';}
};
vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/temporary-parking-desktop.js'),'utf8'),context);
assert.equal(renders,1,'Bootstrap decorates exactly one normal render');
const groups=stack.children.filter(child=>child.className==='temporary-park-group');
assert.equal(groups.length,3);assert.equal(heading.hidden,false,'The shared Parked heading and scope remain visible above temporary return groups');
assert.deepEqual(groups.map(group=>group.dataset.temporaryParkSession),['work:desktop:1:2','work:desktop:1:1','work:desktop:0:1'],'Current desktop comes first, followed by the local display and then other desktops');
assert.match(groups[0].getAttribute('aria-label'),/While another window is maximized · Desktop 2 · Display 2/);
assert.equal(groups[1].querySelector('h3').textContent,'While Terminal is maximized');
assert.equal(groups[2].querySelector('h3').textContent,'While Firefox is maximized');
assert.deepEqual(groups.map(group=>group.querySelector('.temporary-park-kind').textContent),[
  'Temporarily parked · from Desktop 2 · Display 2','Temporarily parked · from Desktop 2 · Display 1','Temporarily parked · from Desktop 1 · Display 1'
],'The header names the originating desktop and display instead of a window count');
for(const group of groups){assert(!/\b\d+ windows?\b/.test(group.querySelector('.temporary-park-kind').textContent));assert.equal(group.querySelector('.temporary-park-location'),null,'Origin is not repeated beneath the owner');}
assert.deepEqual(groups.map(group=>group.style.getPropertyValue('--temporary-park-accent')),['var(--ui-neutral)','#54c791','#e96f32'],'Each public group uses its owning app color; a private owner uses the theme neutral');
assert(!JSON.stringify(groups.map(group=>group.style.values)).includes('#3512a7'),'The hidden owner color cannot identify its group');
assert.equal(stack.children[3].className,'temporary-park-ordinary-heading');assert.equal(stack.children[4],originalCards.get('manual').card,'Ordinary cards follow all returning groups');
assert(!section.textContent.includes('SECRET'));assert(!JSON.stringify(groups.map(group=>group.attrs)).includes('SECRET'));
assert(!artCalls.some(([id])=>id==='privateOwner'),'A private owner does not request its artwork');
for(const id of ['note','terminal','preview']){
  const entry=originalCards.get(id),actual=stack.querySelector('[data-mini-card="'+id+'"]');
  assert.equal(actual,entry.card,'Grouping retains the original card node');assert.equal(actual.querySelector('textarea'),entry.field);assert.equal(entry.field.value,'Unsaved '+id);
  assert.equal(actual.style.getPropertyValue('--app-primary'),cardColors[id],'A group accent never overwrites the parked app identity color');
  assert.equal(actual.style.getPropertyValue('--temporary-park-accent'),'','The owner tint belongs to the group rather than the card');
  assert.equal(entry.restore.dataset.miniRestore,id);assert.equal(entry.close.dataset.miniClose,id);assert.equal(entry.dialog.dataset.ownedDialogRestore,id);
  assert.match(entry.key.textContent,/^[1-4]$/,'The existing hotbar number survives unchanged');
  assert.equal(entry.header.querySelectorAll('.temporary-park-arrow').length,1);
  entry.restore.dispatch('click');entry.close.dispatch('click');entry.header.dispatch('pointerdown');entry.dialog.dispatch('click');
}
assert.deepEqual(opened,['note','note-dialog','terminal','terminal-dialog','preview','preview-dialog']);assert.deepEqual(closed,['note','terminal','preview']);assert.deepEqual(dragged,['note','terminal','preview']);
assert.equal(originalCards.get('manual').card.querySelector('.temporary-park-arrow'),null);
assert.equal(originalCards.get('manual').card.style.getPropertyValue('--app-primary'),cardColors.manual);
assert.equal(originalCards.get('manual').card.style.getPropertyValue('--temporary-park-accent'),'','Ordinary parking does not receive a return-group tint');
for(const id of ['note','terminal','preview']){
  const button=railButtons.get(id);assert.equal(button.querySelectorAll('.temporary-park-arrow').length,1);assert.match(button.title,/Returns to Desktop/);assert.match(button.getAttribute('aria-label'),/unmaximized/);
  assert.equal(button.dataset.hotbarSlot,String(['note','terminal','preview','manual','owner0'].indexOf(id)+1));
}
assert(!railButtons.get('preview').title.includes('SECRET'));assert.match(railButtons.get('preview').title,/another window/);
assert.equal(railButtons.get('manual').querySelector('.temporary-park-arrow'),null);assert.equal(railButtons.get('owner0').querySelector('.temporary-park-arrow'),null);
assert.equal(context.syncRack(),'original-rack-result');assert.equal(rackSyncs,1);
for(const id of ['note','terminal','preview'])assert.equal(railButtons.get(id).querySelectorAll('.temporary-park-arrow').length,1,'Repeated rail synchronization does not duplicate badges');

// Ending a focus removes its heading/badges, restores the rail's exact original
// wording, and leaves a deliberately parked card in the normal Parked section.
for(const session of Object.values(sessions))session.focus=null;
state.note='open';state.terminal='open';state.preview='open';
context.renderMiniApps();context.syncRack();
assert.equal(renders,2);assert.equal(stack.children.length,1);assert.equal(stack.children[0].dataset.miniCard,'manual');assert.equal(heading.hidden,false);
assert.equal(stack.querySelector('.temporary-park-group'),null);assert.equal(stack.querySelector('.temporary-park-arrow'),null);
for(const [id,button]of railButtons){
  assert.equal(button.querySelector('.temporary-park-arrow'),null);assert.equal(button.title,id+' · Super+'+button.dataset.hotbarSlot);assert.equal(button.getAttribute('aria-label'),'Open '+id);
  assert.equal(button.dataset.temporaryParkTitle,undefined);assert.equal(button.dataset.temporaryParkLabel,undefined);
}
railButtons.get('note').dispatch('click');assert.equal(opened.at(-1),'note','The existing rail launch listener still runs after decoration is removed');

// Changing privacy or desktop updates descriptions while retaining one badge.
state.note='minimized';focus('owner0','note',0,1);context.renderMiniApps();context.syncRack();
assert.match(railButtons.get('note').title,/Firefox/);
const sourceSession=sessions['work:desktop:0:1'];sourceSession.focus.parked.push('manual');sourceSession.parked.manual={reason:'Focused Firefox'};
context.renderMiniApps();
assert.equal(stack.querySelector('.temporary-park-kind').textContent,'Temporarily parked · from Desktop 1 · Display 1','A multiwindow group still names its origin rather than a plural count');
assert.equal(stack.querySelector('.temporary-park-cards').children.length,2);
sourceSession.focus.parked=['note'];delete sourceSession.parked.manual;
context.appInfo.owner0.primary='#c876e8';context.renderMiniApps();
assert.equal(stack.querySelector('.temporary-park-group').style.getPropertyValue('--temporary-park-accent'),'#c876e8','A refreshed group follows its app metadata color without a fixed palette');
assert.equal(originalCards.get('note').card.style.getPropertyValue('--app-primary'),cardColors.note,'Refreshing the owner color preserves the child color');
// This is the actual PreviewPrivacy refresh contract: its toggle redraws cards
// without synchronizing the rack, so an already rendered badge must update now.
const syncsBeforePrivacy=rackSyncs;
context.SpatialPreviewPrivacy.hidden=()=>true;context.renderMiniApps();
assert.equal(rackSyncs,syncsBeforePrivacy,'Privacy refresh must not depend on a later rack synchronization');
assert.match(stack.textContent,/another window/);assert(!stack.textContent.includes('Firefox'));assert(!railButtons.get('note').title.includes('Firefox'));
assert.match(railButtons.get('note').title,/another window/);assert.match(railButtons.get('note').getAttribute('aria-label'),/another window/);
assert(!railButtons.get('note').getAttribute('aria-label').includes('Firefox'));
assert.equal(railButtons.get('note').querySelectorAll('.temporary-park-arrow').length,1);
assert.equal(stack.querySelector('.temporary-park-group').style.getPropertyValue('--temporary-park-accent'),'var(--ui-neutral)','Hiding the owner immediately replaces its identifying group tint');
assert(!JSON.stringify(stack.querySelector('.temporary-park-group').style.values).includes('#c876e8'));
assert.equal(originalCards.get('note').card.style.getPropertyValue('--app-primary'),cardColors.note);
pages.select('work','unrelated-project');context.renderMiniApps();context.syncRack();
assert.equal(stack.children.length,0,'A different Project has no returning cards from the old one');
assert.equal(railButtons.get('note').title,'note · Super+1');assert.equal(heading.hidden,false);
console.log('Temporary parking UI passed: real provenance, desktop/display grouping order, live cards and controls, privacy, return badges, rail labels and reset.');
