const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../dist/system-scopes.js'),N=require('../dist/all-workspaces.js');
const plans=[
  {id:'wrong',workspace:'gaming',time:101,title:'Foreign'},
  {id:'done',workspace:'work',project:'site',time:102,done:true},
  {id:'old',workspace:'work',project:'site',time:50},
  {id:'ongoing',workspace:'work',project:'site',time:90,endTime:120},
  {id:'project',workspace:'work',project:'site',time:110},
  {id:'workspace',workspace:'work',time:105},
  {id:'other-project',workspace:'work',project:'film',time:108}
];
const grouped=S.agendas(plans,'work','site',100);
assert.equal(grouped.project.id,'ongoing');assert.equal(grouped.workspace.id,'workspace');
assert.equal(S.agendas(plans,'work','film',100).project.id,'other-project');
assert.equal(S.agendas(plans,'work','',100).project,null);
assert.equal(S.agendas(plans,'work','',100).workspace.id,'ongoing');
assert.equal(S.agendas(plans,'work','site',200).workspace,undefined);
const models={here:{ownedDialog:{title:'Save file'}},elsewhere:{ownedDialog:{title:'Other desktop'}},parked:{previewHidden:true,ownedDialog:{title:'Secret name'}},closed:{ownedDialog:{}},orphan:{ownedDialog:{}}};
const states={here:'open',elsewhere:'open',parked:'minimized',closed:'closed'};
const info=Object.fromEntries(Object.keys(models).map(id=>[id,{label:id}]));
const items=S.requests(models,states,id=>id!=='elsewhere',id=>id==='here',info);
assert.deepEqual(items.map(item=>item.id),['here','parked']);
assert.equal(items[1].detail,'Preview hidden');assert(!JSON.stringify(items).includes('Secret name'));
assert.equal(S.requests(models,states,()=>true,()=>false,info).length,1,'Only parked requests follow the desktop when open owners are not visible');

// Run the actual local renderer with separate Workspace and System lists.
const notes=N.create();notes.add({id:'work',workspace:'work',title:'Work review',time:10});notes.add({id:'game',workspace:'gaming',title:'Private invitation',time:20});notes.add({id:'system',workspace:null,title:'Low battery',time:30});
const local={innerHTML:''},shared={innerHTML:''};let syncs=0;
const context=vm.createContext({notifications:notes,activeWorkspace:'work',painting:false,document:{getElementById:()=>shared},$:()=>local,notificationMarkup:note=>note.id,originalSync:()=>syncs++});
const source=fs.readFileSync(require.resolve('../dist/all-workspaces.js'),'utf8');
vm.runInContext(source.slice(source.indexOf('  function renderLocal(){'),source.indexOf('  syncNotifications=function')),context);
context.renderLocal();assert.equal(local.innerHTML,'work');assert.equal(shared.innerHTML,'system');assert.equal(notes.list(null).length,1);
context.activeWorkspace='gaming';context.renderLocal();assert.equal(local.innerHTML,'game');assert.equal(shared.innerHTML,'system');assert.equal(syncs,2);
context.document.getElementById=()=>null;context.renderLocal();assert.equal(local.innerHTML,'systemgame','The original renderer still works before the scope adapter mounts');
console.log('System scopes passed: actual project/Workspace plan separation, current-desktop requests, parked ownership, hidden content and independent shared alerts.');
