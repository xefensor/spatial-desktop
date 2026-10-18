const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const Side=require('../dist/display-side-tools.js'),Roles=require('../dist/display-roles.js');
const source=fs.readFileSync(path.join(__dirname,'../dist/display-side-tools.js'),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));

assert.equal(Side.normalizePath('~/Documents','/home/demo/work'),'/home/demo/work/Documents');
assert.equal(Side.normalizePath('/home//demo/./work/'),'/home/demo/work');
for(const address of ['relative/file.md','/home/demo/../gaming/private.md','/home/demo/\x00file'])assert.equal(Side.normalizePath(address,'/home/demo/work'),'');
assert.equal(Side.normalizeUrl('https://example.com/reference'),'https://example.com/reference');
for(const address of ['javascript:alert(1)','data:text/plain,test','file:///home/demo/private','https://user:secret@example.com','https://example.com/a b','https://example.com/a\nb'])assert.equal(Side.normalizeUrl(address),'');
assert.deepEqual(Side.normalizeReference({kind:'file',path:'~/Documents/brief.md'},'/home/demo/work'),{id:'file:/home/demo/work/Documents/brief.md',kind:'file',label:'brief.md',path:'/home/demo/work/Documents/brief.md'});
assert.equal(Side.normalizeReference({kind:'unknown',path:'/tmp'}),null);
assert.deepEqual(Side.checklist({widgets:[{kind:'clock'},{kind:'checklist',id:'side-checklist',items:[{id:'one',text:'  Review brief  ',done:true},{id:'empty',text:' '},{id:'two',text:'Send notes',done:'yes'}]}]}),[{id:'one',text:'Review brief',done:true},{id:'two',text:'Send notes',done:false}]);

function harness(){
  let workspace='work',slot=2,setup='pair',role='side';
  const model=Roles.create();model.connect([{slot:1},{slot:2}]);model.setRole(2,'side');
  const opened=[],notes=[],writes=[],elements=new Map(),classNames=new Set(),listeners={};
  const document={activeElement:null};
  function element(selector=''){
    return {selector,owner:true,value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,open:false,dataset:{},events:{},
      focus(){document.activeElement=this;},matches(query){return query.split(',').includes(selector);},
      hasAttribute(name){return this.attributes?.includes(name)||selector==='['+name+']';}};
  }
  const host={innerHTML:'',classList:{add(...names){names.forEach(name=>classNames.add(name));},remove(...names){names.forEach(name=>classNames.delete(name));}},
    querySelector(selector){if(!elements.has(selector))elements.set(selector,element(selector));return elements.get(selector);},
    contains(node){return Boolean(node?.owner);},
    addEventListener(type,fn){(listeners[type]||=[]).push(fn);},removeEventListener(type,fn){listeners[type]=(listeners[type]||[]).filter(value=>value!==fn);}};
  const state=()=>({setupKey:setup,workspaceId:workspace,workspace:workspace==='work'?'Work':'Gaming',localSlot:slot,role,home:'/home/demo/'+workspace,space:model.space(workspace,slot),referenceOptions:[{kind:'folder',path:'/home/demo/'+workspace+'/Documents',label:'Documents'},{kind:'file',path:'/home/demo/'+workspace+'/Documents/brief.md',label:'Brief'}]});
  const context={document,URL,Date,Math,SpatialAIContext:{MIME:'application/x-spatial-context'},prepareControlSemantics(){},
    SpatialDisplayRoleBridge:{state,updateSpace(patch){writes.push({workspace,slot,patch:clone(patch)});model.updateSpace(workspace,slot,patch);},
      openReference(item){opened.push({workspace,slot,item:clone(item)});return true;},launchNote(title,text){notes.push({workspace,slot,title,text});return 'notes--1';}}};
  vm.createContext(context);vm.runInContext(source,context);
  const controller=context.SpatialDisplaySideTools.mount(host);
  const find=selector=>host.querySelector(selector);
  const dispatch=(type,event)=>{for(const fn of listeners[type]||[])fn({preventDefault(){},stopPropagation(){},...event});};
  function button(attributes={}){const target=element();target.attributes=Object.keys(attributes);target.textContent=attributes.text||'';for(const [name,value]of Object.entries(attributes))target.dataset[name.replace(/^data-/,'').replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;target.closest=selector=>selector==='button'?target:null;return target;}
  function click(attributes){dispatch('click',{target:button(attributes)});}
  function submitReference(kind,address,label=''){
    find('[data-side-reference-kind]').value=kind;find('[data-side-reference-address]').value=address;find('[data-side-reference-label]').value=label;
    dispatch('submit',{target:find('[data-side-reference-form]')});
  }
  return {model,host,elements,listeners,context,controller,state,opened,notes,writes,find,dispatch,click,submitReference,
    refresh:()=>controller.refresh(),switchWorkspace(next,refresh=true){workspace=next;if(refresh)controller.refresh();},role(next,refresh=true){role=next;if(refresh)controller.refresh();},
    setup(next,refresh=true){setup=next;if(refresh)controller.refresh();},moveDisplay(next,refresh=true){slot=next;if(refresh)controller.refresh();}};
}

{
  const h=harness();
  assert.equal(h.context.SpatialDisplaySideTools.mount(h.host),h.controller,'Mounting the same shelf keeps its controller');
  assert.equal(h.listeners.submit.length,1,'Repeated mounting cannot duplicate form writes');
  h.submitReference('folder','~/Documents','Docs');
  assert.deepEqual(h.model.space('work',2).folders,[{id:'folder:/home/demo/work/Documents',kind:'folder',label:'Docs',path:'/home/demo/work/Documents'}]);
  h.submitReference('folder','~/Documents','Duplicate');assert.equal(h.model.space('work',2).folders.length,1,'A repeated pin is not added twice');
  h.submitReference('link','javascript:alert(1)','Unsafe');assert.equal(h.model.space('work',2).folders.length,1,'Invalid links are never saved');
  h.submitReference('link','https://example.com/reference','<script>not markup</script>');
  assert.match(h.find('[data-side-references]').innerHTML,/&lt;script&gt;not markup&lt;\/script&gt;/,'Pinned names are rendered as text');
  assert.doesNotMatch(h.find('[data-side-references]').innerHTML,/href="https?:/,'References use explicit app actions rather than navigating the demo tab');
  h.click({'data-side-open':'link:https://example.com/reference'});
  assert.deepEqual(h.opened[0],{workspace:'work',slot:2,item:{id:'link:https://example.com/reference',kind:'link',label:'<script>not markup</script>',url:'https://example.com/reference'}});
  h.click({'data-side-open':'missing-pin'});assert.equal(h.opened.length,1,'A removed or unknown pin cannot open');
  h.click({'data-side-remove':'folder:/home/demo/work/Documents'});assert.equal(h.model.space('work',2).folders.length,1);
  assert.match(h.find('[data-side-feedback]').textContent,/original is unchanged/,'Unpin communicates that it removes only the shortcut');
  h.controller.dispose();assert.equal(h.listeners.submit.length,0,'Disposal removes form listeners');
}

{
  const h=harness(),note=h.find('[data-side-note]');
  note.value='Notes from the Work call';h.dispatch('input',{target:note});
  assert.equal(h.model.space('work',2).note,'Notes from the Work call');
  h.click({'data-side-action':'open-note'});assert.deepEqual(h.notes[0],{workspace:'work',slot:2,title:'Work — Scratch note',text:'Notes from the Work call'});
  h.model.updateSpace('work',2,{widgets:[{kind:'clock',id:'clock'}]});
  h.find('#displaySideTask').value='Review the brief';h.dispatch('submit',{target:h.find('[data-side-task-form]')});
  const tasks=Side.checklist(h.model.space('work',2));assert.equal(tasks.length,1);assert.equal(tasks[0].text,'Review the brief');
  assert.equal(h.model.space('work',2).widgets[0].kind,'clock','Checklist edits preserve other widget kinds');
  const toggle={attributes:['data-side-task'],dataset:{sideTask:tasks[0].id},checked:true,hasAttribute(name){return this.attributes.includes(name);}};
  h.dispatch('change',{target:toggle});assert.equal(Side.checklist(h.model.space('work',2))[0].done,true);
  h.click({'data-side-action':'clear-done'});assert.deepEqual(Side.checklist(h.model.space('work',2)),[]);
  assert.equal(h.model.space('work',2).widgets[0].kind,'clock');
  note.value='x'.repeat(8100);h.dispatch('input',{target:note});assert.equal(note.value.length,8000);assert.equal(h.model.space('work',2).note.length,8000);
  h.switchWorkspace('gaming');assert.equal(note.value,'');assert.deepEqual(Side.checklist(h.model.space('gaming',2)),[]);
  note.value='Game plan';h.dispatch('input',{target:note});h.switchWorkspace('work');assert.equal(note.value.length,8000);assert.equal(h.model.space('gaming',2).note,'Game plan');
}

for(const transition of ['workspace','role','setup','display']){
  const h=harness();h.find('[data-side-reference-address]').value='~/Documents/stale.md';
  if(transition==='workspace')h.switchWorkspace('gaming',false);
  if(transition==='role')h.role('assistant',false);
  if(transition==='setup')h.setup('different-monitors',false);
  if(transition==='display')h.moveDisplay(1,false);
  h.submitReference('file','~/Documents/stale.md');h.click({'data-side-action':'open-note'});h.click({'data-side-quick-folder':'/home/demo/work/Documents'});
  assert.equal(h.writes.length,0,transition+': stale controls cannot write into a new context');
  assert.equal(h.opened.length,0,transition+': stale shortcuts cannot open on another display or Workspace');assert.equal(h.notes.length,0);
}

{
  const h=harness();
  const type='application/x-spatial-context',value={kind:'file',address:'/home/demo/work/Documents/brief.md',title:'Brief'};
  const dataTransfer={types:[type],getData:name=>name===type?JSON.stringify(value):''};
  h.dispatch('drop',{dataTransfer});assert.equal(h.model.space('work',2).folders[0].kind,'file','Dragging a demo file saves its reference');
  h.switchWorkspace('gaming');h.dispatch('drop',{dataTransfer:{types:['text/uri-list'],getData:name=>name==='text/uri-list'?'https://example.com/game':''}});
  assert.equal(h.model.space('gaming',2).folders[0].url,'https://example.com/game');assert.equal(h.model.space('work',2).folders.length,1);
}
console.log('Display Side tools passed: validated references, saved Workspace shelf, real open actions, note/checklist persistence, safe names, stale context guards, drops and idempotent mounts.');
