const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),S=require('../dist/scoped-actions.js');
const workspace={label:'Work',home:'/work',icon:'i-grid'},project={name:'Website <draft>',root:'/projects/site'};
const original=[{action:'desktop-overview',label:'Open Overview'},{action:'desktop-page:1',label:'Desktop below'},{separator:true},{action:'desktop-new-folder',label:'New Folder'},{action:'desktop-settings',label:'Display Settings'},{action:'desktop-guide',label:'Philosophy & guide'}];
const menu=S.entries(original,{kind:'desktop',workspace,project,page:1});
assert.match(menu[0].info,/This desktop · Desktop 2 · Website <draft> · Work/);
assert.deepEqual(menu.filter(item=>item.children).map(item=>item.label),['Project · Website <draft>','Workspace · Work','System-wide']);
assert(!menu.some(item=>item.action==='desktop-settings'),'The old display placeholder is replaced by actual scoped Settings');
assert.equal(menu.find(item=>item.label?.startsWith('Project ·')).children.at(-1).label,'Close Project: Website <draft>');
assert(!S.entries(original,{kind:'desktop',workspace,project,page:0,allowed:()=>false}).some(item=>item.label?.startsWith('Project ·')||item.label?.startsWith('Workspace ·')),'Guide gates apply to nested commands');
const background=S.entries([{action:'app-open'},{action:'app-force-quit'}],{kind:'app',workspace:{label:'Gaming'},label:'Steam',background:true});
assert.equal(background.length,2);assert(!background.some(item=>item.info||item.detail),'Global service menus gain no Workspace association');

// Exercise the shipped command adapter, including stale origin protection.
const calls=[],routes=[],workspaceZone={focus(){}};
const runtime=vm.createContext({
  contextMenuDescriptor:()=>({kind:'desktop'}),contextMenuEntries:()=>original,executeContextAction:action=>calls.push(['original',action]),
  activeWorkspace:'work',activeProjectName:'site',desktopPages:{column:()=>runtime.column,current:()=>1},column:'site',
  workspaceProfiles:{work:workspace,school:{label:'School',home:'/school'}},projectSpaces:{site:project},appInfo:{},appState:{},
  openFileLocation:path=>calls.push(['folder',path]),openProjectEditor:(view,options)=>{runtime.projectEditorState={view};calls.push([view,options.projectName]);},closeActiveProject:()=>calls.push(['close','site']),projectEditorState:null,
  SpatialSettings:{open:(category,options)=>{routes.push([category,options]);calls.push(['settings',category]);}},document:{querySelector:()=>workspaceZone}
});
vm.runInContext(fs.readFileSync('dist/scoped-actions.js','utf8'),runtime);
runtime.contextMenuState=runtime.contextMenuDescriptor();
runtime.executeContextAction('scope:project-folder');assert.deepEqual(calls.at(-1),['folder','/projects/site']);
runtime.executeContextAction('scope:project-manage');assert.deepEqual(calls.at(-1),['manage','site']);assert.equal(runtime.projectEditorState.returnFocus,workspaceZone,'Project editor returns focus to a visible desktop instead of a hidden menu');
runtime.executeContextAction('scope:project-close');assert.deepEqual(calls.at(-1),['close','site']);
runtime.executeContextAction('scope:workspace-home');assert.deepEqual(calls.at(-1),['folder','/work']);
runtime.executeContextAction('scope:workspace-settings');assert.equal(routes.at(-1)[0],'workspace','Workspace settings route directly into the Settings app');
runtime.executeContextAction('scope:system-settings');assert.equal(routes.at(-1)[0],'appearance','System settings route directly into Appearance');
const count=calls.length;runtime.activeWorkspace='school';runtime.executeContextAction('scope:project-close');assert.equal(calls.length,count,'An old menu cannot close a Project after a Workspace switch');
runtime.activeWorkspace='work';runtime.column='workspace';runtime.executeContextAction('scope:project-folder');assert.equal(calls.length,count,'An old menu cannot act in a newly selected column');
runtime.executeContextAction('app-open');assert.deepEqual(calls.at(-1),['original','app-open'],'Existing app/virtual-screen/transfer commands retain their adapters');
console.log('Scoped actions passed: near-to-wide menus, named targets, Guide gates, actual folder/settings/Project actions, background instance scope and stale-origin guards.');
