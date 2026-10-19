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
const originalFavorites=[['notes','My notes'],['browser','Browser']];
const previous={favorites:originalFavorites};Setup.includeSettingsFavorite(previous);Setup.includeSettingsFavorite(previous);
assert.equal(previous.favorites,originalFavorites,'Adding Settings preserves the existing favorite list');
assert.deepEqual(previous.favorites,[['notes','My notes'],['browser','Browser'],['settings','Settings']],'Migration appends Settings once without reordering or replacing favorites');
assert.deepEqual(Setup.includeSettingsFavorite({}).favorites,[['settings','Settings']]);
const first=Setup.createProfile('My study / Práce',profiles);profiles[first.id]=first.profile;
assert(first.profile.favorites.some(([id])=>id==='settings'),'New Workspaces expose Settings in Quick launch');
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
const migration=vm.createContext({workspaceProfiles:{old:{folders:[['Documents','Files','folder']],favorites:[['notes','Existing note favorite']]}},SpatialWorkspaceSetup:Setup,SpatialHomeFolders:Home});
vm.runInContext(source.slice(source.indexOf('Object.values(workspaceProfiles).forEach(profile => {'),source.indexOf('const workspaceDownloads =')),migration);
assert.deepEqual(Array.from(migration.workspaceProfiles.old.favorites,row=>Array.from(row)),[['notes','Existing note favorite'],['settings','Settings']],'Existing demo and saved profiles receive the same Settings favorite migration');
// Real project editor path: creation is in the Files widget, without inerting the desktop or trapping focus.
const classes=new Set(),attributes={};let parent,expanded=false,focused=false;
const dialog={hidden:true,inert:true,classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)},setAttribute:(key,value)=>{attributes[key]=value;}};
const area={classList:{add(){},remove(){}},append:node=>{parent=area;}};
const shell={inert:false},overview={inert:true,classList:{contains:()=>false}};
const editor=vm.createContext({projectEditorState:null,activeProjectName:null,document:{activeElement:{focus(){}},body:{append:()=>{parent='body';},classList:{add(){},remove(){}}}},
 $:selector=>selector==='#projectEditorDialog'?dialog:selector==='.desktop-shell'?shell:selector==='#universalSearch'?overview:{focus:()=>{focused=true;}},
 areaFor:()=>area,dockState:{projects:{edge:'left'}},dockSizes:{left:48},autoSpatialEdgeStates:new Map(),renderProjectEditor(){},setUniversalSearchOpen(){},showArea:()=>{expanded=true;},layoutDockAreas(){},requestAnimationFrame:cb=>cb(),setTimeout:cb=>cb()
});
vm.runInContext(source.slice(source.indexOf('function openProjectEditor('),source.indexOf('function prepareProjectEditor(')),editor);
editor.openProjectEditor('create-project');assert.equal(parent,area);assert.equal(shell.inert,false);assert.equal(attributes.role,'region');assert.equal(attributes['aria-modal'],'false');assert(expanded&&focused,"Native Files widget expands before inline editor focus");
editor.closeProjectEditor();assert.equal(dialog.hidden,true);assert.equal(shell.inert,false);
editor.openProjectEditor('manage');assert.equal(parent,'body');assert.equal(shell.inert,true);assert.equal(attributes.role,'dialog');
console.log('Workspace setup passed: unique names, standard folders, empty sessions, persisted profiles and inline project creation in the Files widget.');

assert(Setup.sessionKeys.includes('spatial-widget-panels-v1'),'Clean/demo reset includes native panel layouts');
