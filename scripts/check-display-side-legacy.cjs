const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Roles=require('../dist/display-roles.js'),Legacy=require('../dist/display-side-legacy.js');
const source=fs.readFileSync(path.join(__dirname,'../dist/display-side-legacy.js'),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));

for(const value of [null,{}, {folders:[]}, {note:'  '}, {widgets:[{kind:'clock'}]}, {widgets:[{kind:'checklist',id:'other',items:[{text:'Unrelated widget'}]}]}])assert.equal(Legacy.hasContent(value),false,'Empty or unrelated content does not add another tools shelf');
for(const value of [{folders:[{kind:'file',path:'/home/demo/work/brief.md'}]}, {note:'Saved scratch'}, {widgets:[{kind:'checklist',id:'side-checklist',items:[{id:'one',text:'Review'}]}]}])assert.equal(Legacy.hasContent(value),true);

function harness(saved){
  const model=Roles.create(saved);model.connect([{slot:1},{slot:2},{slot:3}]);model.setRole(2,'side');model.setRole(3,'side');
  let workspace='work',localSlot=2,setup='pair';
  const mounts=[],refreshes=[],listeners={},observers=[],workingMemory={id:'workingMemory',textContent:'Existing Files contents'};
  function element(tag){return {tag,children:[],hidden:false,inert:false,open:false,className:'',textContent:'',events:{},append(...children){this.children.push(...children);},addEventListener(type,fn){this.events[type]=fn;}};}
  const area=element('aside');area.dataset={widgetMode:'expanded'};area.classList={contains:()=>false};area.append(workingMemory);
  const state=()=>({setupKey:setup,workspaceId:workspace,workspace:workspace==='work'?'Work':'Gaming',localSlot,role:model.role(localSlot),space:model.space(workspace,localSlot)});
  const browser={document:{querySelector(selector){assert.equal(selector,'[data-widget-source="files"]');return area;},createElement:element},
    addEventListener(type,fn){listeners[type]=fn;},MutationObserver:class{constructor(callback){this.callback=callback;}observe(target,options){observers.push({target,options,callback:this.callback});}},SpatialDisplayRoleBridge:{state},
    SpatialDisplaySideTools:{mount(host){mounts.push(host);return {refresh(state){refreshes.push({host,state:clone(state)});}};}}};
  vm.runInNewContext(source,browser);
  const disclosure=area.children[1],scope=disclosure.children[1],host=disclosure.children[2],refresh=()=>browser.SpatialDisplaySideLegacy.refresh();
  return {model,area,workingMemory,disclosure,scope,host,mounts,refreshes,listeners,state,refresh,observers,
    toggle(open){disclosure.open=open;disclosure.events.toggle();},
    switchWorkspace(next,render=true){workspace=next;if(render)refresh();},
    moveDisplay(next,render=true){localSlot=next;if(render)refresh();},
    role(next){assert.equal(model.setRole(localSlot,next).ok,true);refresh();},
    setup(next){setup=next;refresh();}};
}

{
  const h=harness();
  assert.equal(h.disclosure.hidden,true);assert.equal(h.disclosure.open,false);assert.equal(h.host.hidden,true);assert.equal(h.mounts.length,0,'A fresh Side space has no duplicate empty tools');
  assert.equal(h.area.children[0],h.workingMemory,'Compatibility access leaves the normal Files contents in place');
  h.model.updateSpace('work',2,{note:'Call notes'});h.listeners['spatial-display-role-change']();
  assert.equal(h.disclosure.hidden,false);assert.equal(h.disclosure.open,false);assert.equal(h.mounts.length,0,'Saved data appears in a collapsed disclosure');
  const before=h.model.snapshot();h.toggle(true);
  assert.equal(h.host.hidden,false);assert.equal(h.mounts.length,1);assert.equal(h.scope.textContent,'Work · Display 2');
  assert.deepEqual(h.model.snapshot(),before,'Showing saved tools does not rewrite or migrate their original data');
  h.refresh();h.model.setAssistantAllowed('work',2,true);h.refresh();
  assert.equal(h.mounts.length,1,'Permission and display refreshes keep one live tools host');assert.equal(h.host,h.mounts[0]);
  h.toggle(false);assert.equal(h.host.hidden,true,'Collapsed tools use the existing hidden-host write/drop guards');
  h.toggle(true);assert.equal(h.mounts.length,1);
  assert.equal(h.observers.length,1);assert.equal(h.observers[0].target,h.area);
  for(const mode of ['hidden','inert','compact','other-display']){
    if(mode==='hidden')h.area.hidden=true;if(mode==='inert')h.area.inert=true;if(mode==='compact'){h.area.dataset.widgetMode='compact';h.area.inert=true;}if(mode==='other-display')h.area.hidden=true;
    h.observers[0].callback();assert.equal(h.host.hidden,true,mode+': Native widget visibility blocks saved shelf actions');
    h.area.hidden=false;h.area.inert=false;h.area.dataset.widgetMode='expanded';h.area.classList.contains=()=>false;h.observers[0].callback();assert.equal(h.host.hidden,false,'Saved tools resume when the Files widget is expanded');
  }
  h.model.updateSpace('work',2,{note:''});h.refresh();assert.equal(h.disclosure.hidden,true);assert.equal(h.host.hidden,true,'Removing the final saved item removes the compatibility shelf');
}

{
  const h=harness();h.model.updateSpace('work',2,{note:'Work notes',folders:[{kind:'link',url:'https://example.com',label:'Work reference'}],widgets:[{id:'side-checklist',kind:'checklist',items:[{id:'review',text:'Review the brief',done:false}]}]});h.refresh();h.toggle(true);
  h.switchWorkspace('gaming');assert.equal(h.disclosure.hidden,true);assert.equal(h.host.hidden,true,'Work material is hidden in another Workspace');
  h.model.updateSpace('gaming',2,{note:'Gaming notes'});h.refresh();assert.equal(h.disclosure.open,false);h.toggle(true);
  assert.equal(h.refreshes.at(-1).state.space.note,'Gaming notes');
  h.switchWorkspace('work');assert.equal(h.disclosure.open,true);assert.equal(h.refreshes.at(-1).state.space.note,'Work notes');
  h.moveDisplay(3);assert.equal(h.disclosure.hidden,true);assert.equal(h.host.hidden,true,'Saved material remains scoped to its display');
  h.moveDisplay(2);assert.equal(h.disclosure.open,true);assert.equal(h.host.hidden,false);
  h.role('extended');assert.equal(h.disclosure.hidden,true);assert.equal(h.host.hidden,true,'An Extended display does not expose the Side tools');
  h.role('side');assert.equal(h.disclosure.hidden,false);assert.equal(h.disclosure.open,true);
  const saved=h.model.snapshot(),reloaded=harness(saved);
  assert.equal(reloaded.disclosure.hidden,false);assert.equal(reloaded.disclosure.open,false,'Reload starts with the compatibility shelf collapsed');reloaded.toggle(true);
  assert.deepEqual(clone(reloaded.refreshes.at(-1).state.space),clone(h.state().space),'Reload exposes the same pins, scratch, checklist and permission');
}

{
  const h=harness();h.model.updateSpace('work',2,{note:'Work notes'});h.refresh();
  h.switchWorkspace('gaming',false);h.toggle(true);
  assert.equal(h.disclosure.hidden,true);assert.equal(h.host.hidden,true);assert.equal(h.mounts.length,0,'A stale disclosure toggle cannot reveal previous-Workspace data');
  h.moveDisplay(1);assert.equal(h.disclosure.hidden,true);assert.equal(h.host.hidden,true,'The Main display does not create another Side shelf');
}

console.log('Saved Side tools passed: conditional access in normal Files, original record persistence, collapsed/drop guards, Workspace/display scope, reload compatibility and one live host.');
