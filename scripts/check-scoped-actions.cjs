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
assert.equal(background[1].label,'Open Steam in Gaming');assert.match(background[2].detail,/only this instance in Gaming/);

// Exercise the shipped command adapter, including stale origin protection.
const calls=[],sections=[];
const runtime=vm.createContext({
  contextMenuDescriptor:()=>({kind:'desktop'}),contextMenuEntries:()=>original,executeContextAction:action=>calls.push(['original',action]),
  activeWorkspace:'work',activeProjectName:'site',desktopPages:{column:()=>runtime.column,current:()=>1},column:'site',
  workspaceProfiles:{work:workspace,school:{label:'School',home:'/school'}},projectSpaces:{site:project},appInfo:{},appState:{},
  openFileLocation:path=>calls.push(['folder',path]),openProjectEditor:(view,options)=>calls.push([view,options.projectName]),closeActiveProject:()=>calls.push(['close','site']),
  SpatialSettings:{open:()=>calls.push(['settings'])},document:{querySelector:selector=>({scrollIntoView:()=>sections.push(selector),querySelector:()=>({focus(){}})})}
});
vm.runInContext(fs.readFileSync('dist/scoped-actions.js','utf8'),runtime);
runtime.contextMenuState=runtime.contextMenuDescriptor();
runtime.executeContextAction('scope:project-folder');assert.deepEqual(calls.at(-1),['folder','/projects/site']);
runtime.executeContextAction('scope:project-manage');assert.deepEqual(calls.at(-1),['manage','site']);
runtime.executeContextAction('scope:project-close');assert.deepEqual(calls.at(-1),['close','site']);
runtime.executeContextAction('scope:workspace-home');assert.deepEqual(calls.at(-1),['folder','/work']);
runtime.executeContextAction('scope:workspace-settings');assert.equal(sections.at(-1),'[data-setting-scope="workspace"]');
runtime.executeContextAction('scope:system-settings');assert.equal(sections.at(-1),'[data-setting-scope="system"]');
const count=calls.length;runtime.activeWorkspace='school';runtime.executeContextAction('scope:project-close');assert.equal(calls.length,count,'An old menu cannot close a Project after a Workspace switch');
runtime.activeWorkspace='work';runtime.column='workspace';runtime.executeContextAction('scope:project-folder');assert.equal(calls.length,count,'An old menu cannot act in a newly selected column');
runtime.executeContextAction('app-open');assert.deepEqual(calls.at(-1),['original','app-open'],'Existing app/virtual-screen/transfer commands retain their adapters');
console.log('Scoped actions passed: near-to-wide menus, named targets, Guide gates, actual folder/settings/Project actions, background instance scope and stale-origin guards.');
