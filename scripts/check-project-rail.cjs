const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../dist/project-rail.js');
for(const edge of ['left','right','top','bottom']){
  const point=P.position({left:400,right:464,top:500,bottom:564},edge,{width:1200,height:1000},{width:200,height:200});
  assert.deepEqual(point,{x:edge==='left'?472:edge==='right'?192:400,y:edge==='top'?572:edge==='bottom'?292:500,width:200,height:200},edge+' opens inward next to its rail');
  for(const rect of [{left:0,right:64,top:0,bottom:64},{left:1190,right:1254,top:990,bottom:1054}]){
    const result=P.position(rect,edge,{width:1200,height:1000},{width:420,height:620});
    assert(result.x>=8&&result.y>=8&&result.x+result.width<=1192&&result.y+result.height<=992,edge+' popup remains within the viewport at either corner');
  }
}
assert.deepEqual(P.position({left:300,right:364,top:200,bottom:264},'right',{width:320,height:240},{width:420,height:620}),{x:8,y:8,width:304,height:224},'Small displays reduce the popup before positioning it');
const owner={root:'/projects/site/',files:[['brief.md','Linked reference','file','/shared/brief.md'],['assets','8 files','folder'],['plan.md',null,'file'],null,['readme.md',12,'file']]};
assert.deepEqual(P.files(owner),[
  {name:'brief.md',detail:'Linked reference',folder:false,path:'/shared/brief.md'},
  {name:'assets',detail:'8 files',folder:true,path:'/projects/site/assets'},
  {name:'plan.md',detail:'',folder:false,path:'/projects/site/plan.md'},
  {name:'readme.md',detail:'12',folder:false,path:'/projects/site/readme.md'}
],'File entries preserve explicit paths and useful labels while joining relative names once');
assert.deepEqual(P.files({root:'/home/work',folders:[['Documents','42 items','folder']]}),[{name:'Documents',detail:'42 items',folder:true,path:'/home/work/Documents'}]);
assert.deepEqual(P.files(null),[]);
for(const [item,glyph] of [[{attachment:{kind:'image'}},'i-image'],[{attachment:{kind:'audio'}},'i-music'],[{source:{address:'https://example.test'}},'i-web'],[{source:{address:'/shared/brief.md'}},'i-folder'],[{},'i-note']])assert.equal(P.kindIcon(item),glyph);

// Execute the browser adapter with a small DOM tree: nodes are moved rather
// than cloned, so the same Stash editor and its listeners must survive portals.
let doc;
const camel=value=>value.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.dataset={};this.attrs={};this.listeners={};this.style={setProperty(name,value){this[name]=value;}};this.hidden=false;this.inert=false;this.className='';this.textContent='';this._html='';
    this.classList={contains:name=>this.className.split(/\s+/).includes(name),add:name=>{if(!this.classList.contains(name))this.className+=' '+name;},remove:name=>{this.className=this.className.split(/\s+/).filter(item=>item!==name).join(' ');},toggle:(name,on)=>{if(on??!this.classList.contains(name))this.classList.add(name);else this.classList.remove(name);}};}
  setAttribute(name,value){this.attrs[name]=String(value);if(name==='class')this.className=String(value);if(name==='id')this.id=String(value);if(name.startsWith('data-'))this.dataset[camel(name.slice(5))]=String(value);}
  getAttribute(name){return this.attrs[name]??null;}
  append(...nodes){for(const node of nodes){node.remove();this.children.push(node);node.parentElement=this;}}
  prepend(...nodes){for(const node of nodes.reverse()){node.remove();this.children.unshift(node);node.parentElement=this;}}
  insertBefore(node,anchor){if(anchor.parentElement!==this)throw Error('NotFoundError: anchor is not a child');node.remove();this.children.splice(this.children.indexOf(anchor),0,node);node.parentElement=this;}
  get lastElementChild(){return this.children.at(-1)||null;}
  get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
  remove(){if(this.parentElement){const siblings=this.parentElement.children;siblings.splice(siblings.indexOf(this),1);this.parentElement=null;}}
  replaceChildren(...nodes){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...nodes);}
  contains(node){for(let current=node;current;current=current.parentElement)if(current===this)return true;return false;}
  get isConnected(){return doc?.body.contains(this)||false;}
  matches(selector){return selector.split(',').some(part=>{part=part.trim();if(!part)return false;const plain=part.replace(/\[[^\]]*\]/g,''),tag=plain.match(/^[\w-]+/);if(tag&&this.tagName!==tag[0].toUpperCase())return false;for(const match of plain.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(match[1]))return false;const id=plain.match(/#([\w-]+)/);if(id&&this.id!==id[1])return false;for(const match of part.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)){const value=match[1].startsWith('data-')?this.dataset[camel(match[1].slice(5))]:this.getAttribute(match[1]);if(value===undefined||value===null||match[2]!==undefined&&String(value)!==match[2])return false;}return true;});}
  closest(selector){for(let current=this;current;current=current.parentElement)if(current.matches(selector))return current;return null;}
  querySelectorAll(selector){const parts=selector.trim().split(/\s+/),last=parts.at(-1),result=[];const walk=node=>{for(const child of node.children){if(child.matches(last)){let parent=child.parentElement,index=parts.length-2;while(index>=0&&parent){if(parent.matches(parts[index]))index--;parent=parent.parentElement;}if(index<0)result.push(child);}walk(child);}};walk(this);return result;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  dispatchEvent(event){if(!event.target)event.target=this;for(const fn of this.listeners[event.type]||[])fn(event);if(event.bubbles&&this.parentElement)this.parentElement.dispatchEvent(event);return true;}
  focus(){doc.activeElement=this;}
  click(){this.dispatchEvent(new TestEvent('click',{bubbles:true}));}
  getBoundingClientRect(){return {left:0,right:68,top:140,bottom:800,width:68,height:660};}
  set innerHTML(value){this._html=value;this.replaceChildren();const stack=[this],voids=new Set(['input','br','img']);for(const token of value.matchAll(/<\/?([\w-]+)([^>]*)>/g)){if(token[0].startsWith('</')){if(stack.length>1)stack.pop();continue;}const node=new Element(token[1]);for(const attr of token[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))node.setAttribute(attr[1],attr[2]??'');stack.at(-1).append(node);if(!voids.has(token[1])&&!token[0].endsWith('/>'))stack.push(node);}}
  get innerHTML(){return this._html;}
}
class TestEvent{constructor(type,values={}){this.type=type;Object.assign(this,values);}preventDefault(){this.defaultPrevented=true;}stopPropagation(){}stopImmediatePropagation(){this.stopped=true;}}
const body=new Element('body'),documentEvents={},windowEvents={},frames=[],calls=[];
doc={body,activeElement:null,createElement:tag=>new Element(tag),getElementById:id=>body.querySelector('#'+id),querySelectorAll:selector=>body.querySelectorAll(selector),addEventListener(type,fn){(documentEvents[type]??=[]).push(fn);}};
const area=new Element('aside');area.dataset.areaState='rail';body.append(area);
const projectHost=new Element();projectHost.id='projectSpaceContent';area.append(projectHost);
const workspaceHost=new Element();workspaceHost.id='projectClosedState';area.append(workspaceHost);
const host=new Element('section');host.id='workingMemory';projectHost.append(host);
const addButton=new Element('button');addButton.dataset.memoryAction='add';addButton.addEventListener('click',()=>calls.push(['note']));host.append(addButton);
let items=[{id:'pinned',title:'Reference',pinned:true,updated:1,source:{address:'https://example.test/reference'}},{id:'normal',title:'Draft',pinned:false,updated:1,source:{address:''}}];
const memory={render(){calls.push(['render']);},items:()=>items,itemFor:id=>items.find(item=>item.id===id),revealItem:(id,key)=>calls.push(['reveal',id,key]),contextFor:item=>({title:item.title,address:item.source.address,workspace:'work',project:'site',source:item.source})};
const context={
  document:doc,window:{innerWidth:1200,innerHeight:900},SpatialWorkingMemory:require('../dist/working-memory.js'),SpatialMemoryDesktop:memory,SpatialAIContext:require('../dist/ai-context.js'),
  activeWorkspace:'work',projectSpaces:{site:{name:'Website',root:'/projects/site',accent:'#22bb66',files:owner.files}},workspaceProfiles:{work:{label:'Work',home:'/home/work',accent:'#22bb66',folders:[['Documents','42 items','folder']]},general:{label:'General',home:'/home/general',accent:'#33cc88',folders:[]}},
  column:'site',desktopPages:{column:()=>context.column},dockState:{projects:{edge:'left'}},areaFor:()=>area,isLocalArea:()=>true,projectColumnActive:()=>Boolean(context.projectSpaces[context.column]),
  icon:name=>'<svg><use href="#'+name+'"/></svg>',prepareMaterialSurfaces(){},prepareControlSemantics(){},
  requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},MutationObserver:class{constructor(fn){this.callback=fn;}observe(){}},
  CustomEvent:TestEvent,DragEvent:TestEvent,addEventListener(type,fn){(windowEvents[type]??=[]).push(fn);},dispatchEvent(event){for(const fn of windowEvents[event.type]||[])fn(event);},
  setAreaState:(...args)=>calls.push(['area',...args]),openFileLocation:path=>calls.push(['folder',path]),createAppInstance:base=>{calls.push(['instance',base]);return 'files-copy';},renderFileLocation:(...args)=>calls.push(['location',...args]),openAppFile:(...args)=>calls.push(['file',...args]),
  openProjectEditor:(...args)=>calls.push(['editor',...args]),openPackageDialog:(...args)=>calls.push(['package',...args]),closeActiveProject:()=>calls.push(['close-project']),setUniversalSearchOpen:open=>calls.push(['overview',open]),SpatialOverviewDesktop:{select:(...args)=>calls.push(['section',...args])}
};
vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/project-rail.js'),'utf8'),context);
const rail=context.SpatialProjectRail,nav=area.querySelector('.project-material-rail'),popup=doc.getElementById('projectShelfPopup'),popupBody=popup.querySelector('.project-shelf-body');
// Run the real memory render too: its legacy rail entry must remain anchored
// inside the Area even when the editable Stash itself is portalled outside it.
const memorySource=fs.readFileSync(require.resolve('../dist/working-memory-desktop.js'),'utf8'),memoryFields=new Map(),legacyRail=new Element('button'),legacyEntry=new Element('button');area.append(legacyEntry);
const memoryContext={desktopSyncApplying:false,dropPosition:null,scope:()=>scope(),current:'',allowed:()=>true,host,rail:legacyRail,railEntry:legacyEntry,area,
  field:name=>{if(!memoryFields.has(name))memoryFields.set(name,new Element());return memoryFields.get(name);},shelfViews:new Map(),filterShelf(){},itemMarkup:()=>'',drafts:new Map(),selected:new Set(),editing:null,draftScope:'',lastRemoved:null,
  projectColumnActive:context.projectColumnActive,$:selector=>doc.getElementById(selector.slice(1)),syncFolders(){},projectFor:key=>context.projectSpaces[JSON.parse(key)[1]],ownerFor:key=>{const [workspace,project]=JSON.parse(key);return context.projectSpaces[project]||{root:context.workspaceProfiles[workspace].home};},itemsFor:()=>items,F:{folder:owner=>owner.root+'/Stash'},signature:'',itemsSignature:'',workspaceProfiles:context.workspaceProfiles,document:doc,prepareControlSemantics(){},
  SpatialProjectRail:rail,requestAnimationFrame:context.requestAnimationFrame,showArea:()=>calls.push(['show-area']),temporaryRail:null,dockState:context.dockState,layoutDockAreas:()=>calls.push(['layout'])};
vm.createContext(memoryContext);vm.runInContext(memorySource.slice(memorySource.indexOf('  function render(force=false){'),memorySource.indexOf('  function collapse(')),memoryContext);
vm.runInContext(memorySource.slice(memorySource.indexOf('  function reveal(){'),memorySource.indexOf('  function editor(')),memoryContext);
memory.render=()=>{calls.push(['render']);memoryContext.render();};
const flush=()=>{for(const fn of frames.splice(0))fn();};
const documentEvent=(type,values={})=>{const event=new TestEvent(type,values);for(const fn of documentEvents[type]||[])fn(event);return event;};
const shelf=name=>nav.querySelector('[data-project-shelf="'+name+'"]');
const clickAction=action=>popup.querySelector('[data-project-shelf-action="'+action+'"]').click();
const scope=()=>context.SpatialWorkingMemory.scope(context.activeWorkspace,context.projectSpaces[context.column]?context.column:null);
assert(rail&&nav&&popup.hidden&&popup.inert);assert.equal(nav.querySelector('.project-material-context').textContent,'Website');
assert.equal(nav.querySelectorAll('[data-project-shelf-item]').length,1);assert.equal(shelf('stash').getAttribute('aria-label'),'Open Website Stash · 2 items');
const dockSnapshot=JSON.stringify(context.dockState),areaSnapshot=JSON.stringify(area.dataset);
assert(rail.open('stash'));flush();assert.equal(host.parentElement,popupBody);assert.equal(rail.stashTarget(),popupBody);assert.equal(doc.activeElement,addButton);assert(!popup.hidden&&!popup.inert);
assert.equal(JSON.stringify(context.dockState),dockSnapshot);assert.equal(JSON.stringify(area.dataset),areaSnapshot,'Opening Stash keeps rail and dock geometry unchanged');
addButton.click();assert(calls.some(call=>call[0]==='note'),'The real moved Stash retains its existing editor listener');
rail.close();assert.equal(host.parentElement,projectHost);assert.equal(rail.stashTarget(),null);assert(popup.hidden&&popup.inert);
shelf('note').click();flush();assert.equal(host.parentElement,popupBody);assert.equal(calls.filter(call=>call[0]==='note').length,2,'Note opens the existing Stash composer');
const outside=new Element('button');body.append(outside);documentEvent('pointerdown',{target:outside});assert(popup.hidden);assert.equal(host.parentElement,projectHost);
shelf('stash').focus();shelf('stash').click();flush();const escape=documentEvent('keydown',{key:'Escape',target:addButton});assert(escape.defaultPrevented&&escape.stopped);assert(popup.hidden);assert.equal(doc.activeElement,shelf('stash'),'Escape restores the rail trigger focus');
rail.open('stash');context.column='workspace';rail.contextChanged(scope());assert(popup.hidden);assert.equal(host.parentElement,workspaceHost,'A scope change returns the same Stash to the correct ownership host');
assert(rail.open('stash'));flush();assert.equal(host.parentElement,popupBody);assert.equal(legacyEntry.nextElementSibling,workspaceHost,'Workspace Stash portals preserve the inline legacy-rail anchor');rail.close();
memoryContext.reveal();assert.equal(host.parentElement,popupBody);assert(!calls.some(call=>call[0]==='show-area'||call[0]==='layout'),'Existing Stash reveal delegates to the popup without expanding or relaying out docks');rail.close();
context.activeWorkspace='general';rail.render();assert.equal(nav.querySelector('.project-material-context').textContent,'General');
rail.open('stash');context.dispatchEvent(new TestEvent('spatial-rail-open',{detail:{area:'systems'}}));assert(popup.hidden,'Opening a different Area popover closes the Project shelf');
context.activeWorkspace='work';context.column='site';
items=items.map(item=>({...item,pinned:true,title:item.id==='pinned'?'Updated reference':item.title,updated:2}));rail.render();assert.equal(nav.querySelectorAll('[data-project-shelf-item]').length,2);assert.equal(nav.querySelector('[data-project-shelf-item="pinned"]').title,'Updated reference','Pinned titles and newly pinned items refresh');
nav.querySelector('[data-project-shelf-item="normal"]').click();assert(calls.some(call=>call[0]==='reveal'&&call[1]==='normal'&&call[2]===scope()));
rail.open('more');flush();assert.deepEqual(popupBody.querySelectorAll('[role="menuitem"]').map(button=>button.textContent),['Manage project','Pack project','Close project']);
documentEvent('keydown',{key:'End',target:doc.activeElement});assert.equal(doc.activeElement.dataset.projectShelfAction,'close','More supports keyboard navigation');
clickAction('manage');assert(calls.some(call=>call[0]==='editor'&&call[1]==='manage'&&call[2].projectName==='site'));
rail.open('more');clickAction('pack');assert(calls.some(call=>call[0]==='package'&&call[1]==='project'&&call[2]==='pack'));
rail.open('more');clickAction('close');assert(calls.some(call=>call[0]==='close-project'));
context.column='workspace';rail.open('more');assert.deepEqual(popupBody.querySelectorAll('[role="menuitem"]').map(button=>button.textContent),['New project','Project library']);clickAction('projects');assert.deepEqual(calls.slice(-2),[['overview',true],['section','projects',false]]);
context.column='site';rail.open('files');const linked=popup.querySelector('[data-project-shelf-path="/shared/brief.md"]');assert.equal(linked.title,'/shared/brief.md');linked.click();
assert(calls.some(call=>call[0]==='location'&&call[1]==='files-copy'&&call[2]==='/shared'),'Linked files open their actual source folder');assert(calls.some(call=>call[0]==='file'&&call[2]==='brief.md'));
rail.open('files');popup.querySelector('[data-project-shelf-path="/projects/site/assets"]').click();assert(calls.some(call=>call[0]==='folder'&&call[1]==='/projects/site/assets'));
const transfer={values:{},setData(type,value){this.values[type]=value;}};
rail.open('files');popup.querySelector('[data-project-shelf-path="/shared/brief.md"]').dispatchEvent(new TestEvent('dragstart',{bubbles:true,dataTransfer:transfer}));
assert.equal(transfer.effectAllowed,'copy');assert.equal(transfer.values['text/plain'],'/shared/brief.md');assert.equal(JSON.parse(transfer.values[context.SpatialAIContext.MIME]).source.project,'site','File drags retain Project provenance for Stash and Assistant');
const forwarded=[];host.addEventListener('drop',event=>forwarded.push(event));const payload={types:['text/plain']};
shelf('stash').dispatchEvent(new TestEvent('drop',{dataTransfer:payload,clientX:80,clientY:180}));assert.equal(host.parentElement,popupBody);assert.equal(forwarded.length,1);assert.equal(forwarded[0].dataTransfer,payload,'Rail drops are forwarded to the real Stash with their original transfer');
context.SpatialGuide={model:{active:()=>true,allows:()=>false}};rail.render();assert(popup.hidden&&nav.hidden);assert.equal(rail.open('stash'),false,'Guide gates prevent opening an untaught Stash');
delete context.SpatialGuide;area.dataset.areaState='expanded';rail.render();assert.equal(rail.canReveal(),false);assert.equal(rail.open('stash'),false,'Expanded Areas keep their ordinary inline Stash');
console.log('Project rail passed: four-edge bounds, file metadata, live Stash portal, unchanged dock state, scope/focus dismissal, pin updates, contextual More actions, file provenance, drop forwarding and Guide gating.');
