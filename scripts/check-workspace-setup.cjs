const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Setup = require('../dist/workspace-setup.js');
const demoReset=new Map([['spatial-demo-general-areas-v1','1']]);
Setup.reset({removeItem:key=>demoReset.delete(key),setItem:(key,value)=>demoReset.set(key,value)},'demo');
assert(!demoReset.has('spatial-demo-general-areas-v1'),'Explore demo resets the General Area migration too');
const Home = require('../dist/home-folders.js');
const source = fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const profiles={general:{home:'/home/demo'}};
assert.equal(Setup.createProfile('  ',profiles),null);
const first=Setup.createProfile('My study / Práce',profiles);profiles[first.id]=first.profile;
assert.deepEqual(first.profile.favorites.map(([id])=>id),['dolphin','browser','elisa','notes'],'New Workspaces keep four everyday app favorites; Settings has its System controls entry');
const second=Setup.createProfile('My study / Práce',profiles);assert.notEqual(first.id,second.id);assert.notEqual(first.profile.home,second.profile.home);
const reserved=Setup.createProfile('__proto__',profiles);assert(reserved.id.startsWith('workspace-'));assert.equal(Object.getPrototypeOf(profiles),Object.prototype);
for (const name of Home.standard) assert(first.profile.folders.some(([folder])=>folder===name),name);
assert.equal(Home.downloadDestination(profiles,{},first.id,'workspace'),first.profile.home+'/Downloads');
const saved={}, states={}, projectStates={}, openProjects={}, membership={}, contents={};
const created=vm.createContext({SpatialWorkspaceSetup:Setup,workspaceProfiles:profiles,appInfo:{notes:{},dolphin:{}},workspaceAppStates:states,
 workspaceProjectStates:projectStates,workspaceOpenProjects:openProjects,workspaceProjects:{},windowMembership:membership,workspaceAreaContents:{},workspaceContent:contents,defaultAreaContent:{noteDraft:'Existing note'},workspaceAreaSessions:{},
 desktopStorage:{setItem:(key,value)=>{saved[key]=value;}},snapshotAreaLayout:()=>({sizes:{left:280}}),renderWorkspaceTabs(){},renderWorkspace:(id)=>{created.activeWorkspace=id;},persistWorkspaceAppStates(){},persistProjectState(){},saveIndependentSessions(){},setWorkspaceCreateOpen(){},setUniversalSearchOpen(){},showToast(){}
});
vm.runInContext(source.slice(source.indexOf('function createWorkspaceFromEditor('),source.indexOf('function setWorkspaceCreateOpen(')),created);
const id=created.createWorkspaceFromEditor('My music');assert.equal(created.activeWorkspace,id);
assert.equal(states[id].notes,'closed');assert.equal(states[id].dolphin,'closed');assert.equal(openProjects[id].length,0);assert.equal(contents[id].note,'');
assert.equal(JSON.parse(saved[Setup.profilesKey])[id].label,'My music');
const storedProfiles=JSON.parse(saved[Setup.profilesKey]);storedProfiles[id].favorites=[['notes','Saved notes'],['dolphin','Files']];saved[Setup.profilesKey]=JSON.stringify(storedProfiles);
// Load the production profile initializer after a reload, rather than testing only the helper.
const reloaded=vm.createContext({desktopPreset:'clean',workspaceProfiles:{general:{home:'/home/demo'},school:{}},SpatialWorkspaceSetup:Setup,desktopStorage:{getItem:()=>saved[Setup.profilesKey]}});
vm.runInContext(source.slice(source.indexOf("if (desktopPreset === 'clean') Object.keys(workspaceProfiles)"),source.indexOf('function renderWorkspaceTabs(')),reloaded);
assert.equal(reloaded.workspaceProfiles[id].home,profiles[id].home);assert.equal(reloaded.workspaceProfiles[id].accent,profiles[id].accent);assert(!reloaded.workspaceProfiles.school);
assert.deepEqual(Array.from(reloaded.workspaceProfiles[id].favorites,row=>Array.from(row)),[['notes','Saved notes'],['dolphin','Files']],'Reload preserves saved favorite content and order');
const migration=vm.createContext({workspaceProfiles:{old:{folders:[['Documents','Files','folder']],favorites:[['notes','Existing note favorite']]},custom:{folders:[],favorites:[['settings','My settings'],['browser','Browser']]}},SpatialWorkspaceSetup:Setup,SpatialHomeFolders:Home});
vm.runInContext(source.slice(source.indexOf('Object.values(workspaceProfiles).forEach(profile => {'),source.indexOf('const workspaceDownloads =')),migration);
assert.deepEqual(Array.from(migration.workspaceProfiles.old.favorites,row=>Array.from(row)),[['notes','Existing note favorite']],'Initialization does not append an extra Settings launcher');
assert.deepEqual(Array.from(migration.workspaceProfiles.custom.favorites,row=>Array.from(row)),[['settings','My settings'],['browser','Browser']],'Explicit saved Settings favorites keep their content and order');
// Every Project editor escapes the Files widget's shared, clipped viewport.
const classes=new Set(['is-inline']),attributes={};let parent,focused=false,returned=false;
const dialog={hidden:true,inert:true,classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)},setAttribute:(key,value)=>{attributes[key]=value;}};
const area={classList:{add(){},remove(){}},append:()=>{throw Error('Project editor must not consume folder height');}};
const shell={inert:false},overview={inert:true,classList:{contains:()=>false}},frames=[];
const editor=vm.createContext({projectEditorState:null,projectEditorCloseTimer:null,activeProjectName:null,document:{activeElement:{focus(){returned=true;}},body:{append:node=>{assert.equal(node,dialog,'The same live editor node is moved');parent='body';},classList:{add(){},remove(){}}}},
 $:selector=>selector==='#projectEditorDialog'?dialog:selector==='.desktop-shell'?shell:selector==='#universalSearch'?overview:{focus:()=>{focused=true;}},
 areaFor:()=>area,renderProjectEditor(){},requestAnimationFrame:cb=>frames.push(cb),setTimeout:cb=>cb(),clearTimeout(){}
});
vm.runInContext(source.slice(source.indexOf('function openProjectEditor('),source.indexOf('function prepareProjectEditor(')),editor);
for(const view of ['create-project','manage']){
 focused=false;returned=false;editor.openProjectEditor(view);assert.equal(parent,'body');assert.equal(shell.inert,true);assert.equal(overview.inert,true);assert.equal(attributes.role,'dialog');assert.equal(attributes['aria-modal'],'true');assert(!classes.has('is-inline'));
 frames.shift()();assert(focused,'The first editor control receives focus');assert(classes.has('is-open'));
 editor.closeProjectEditor();assert.equal(dialog.hidden,true);assert.equal(shell.inert,false);assert.equal(overview.inert,true);assert(returned,'Closing restores the original control');
}
focused=false;editor.openProjectEditor('create-project');editor.closeProjectEditor();frames.shift()();assert(!classes.has('is-open'));assert(!focused,'A cancelled opening frame cannot refocus a closed editor');

// The native New project shortcut must not grow into a blank block above Files.
const {JSDOM}=require('jsdom');
const panelCSS=fs.readFileSync(require.resolve('../dist/panel-desktop.css'),'utf8');
const growthRule=panelCSS.split('\n').find(line=>line.startsWith('body.panel-desktop-preview .desktop-widget-content>.widget-source>:is('));
const filesScrollRule=panelCSS.split('\n').find(line=>line.startsWith('body.panel-desktop-preview .desktop-widget[data-widget-id="files"] #workingMemory:not('));
assert(growthRule&&filesScrollRule,'The real panel growth and Files scroll rules are present');
const folderDOM=new JSDOM('<!doctype html><body class="panel-desktop-preview"><section class="desktop-widget" data-widget-id="files"><div class="desktop-widget-content"><aside class="widget-source files-widget" data-widget-source="files"><section id="projectClosedState" class="project-library"><div id="projectLibraryList"></div><button class="project-library-create">New project</button></section><div id="workingMemory" class="interactive-folder">Saved files</div></aside></div></section></body>');
const style=folderDOM.window.document.createElement('style');style.textContent=growthRule+'\n'+filesScrollRule+'\n'+fs.readFileSync(require.resolve('../dist/folder-files.css'),'utf8');folderDOM.window.document.head.append(style);
const computed=id=>folderDOM.window.getComputedStyle(folderDOM.window.document.getElementById(id));
assert.equal(computed('projectClosedState').flexGrow,'0','The shortcut reserves only its content height');assert.equal(computed('projectClosedState').flexBasis,'auto');
assert.equal(computed('workingMemory').flexGrow,'1','The actual folder keeps the available viewport');assert.equal(computed('projectLibraryList').display,'none');
folderDOM.window.close();
console.log('Workspace setup passed: unique names, standard folders, empty sessions, persisted profiles, independent Project dialogs and bounded Files shortcuts.');

assert(Setup.sessionKeys.includes('spatial-widget-panels-v1'),'Clean/demo reset includes native panel layouts');
