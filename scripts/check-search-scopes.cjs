const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {scopeFor,localProject}=require('../dist/search-scopes.js');
const source=fs.readFileSync(require.resolve('../dist/search-scopes.js'),'utf8');
const shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
function segment(text,first,last){const start=text.indexOf(first),end=text.indexOf(last,start+first.length);assert(start>=0&&end>start);return text.slice(start,end);}
const context={owner:'film'};
assert.equal(scopeFor({kind:'window',owner:'film',visible:true},context),'desktop');
assert.equal(scopeFor({kind:'window',owner:'film',visible:false},context),'project');
assert.equal(scopeFor({kind:'window',owner:'workspace',visible:false},context),'workspace');
assert.equal(scopeFor({kind:'window',owner:'other',visible:false},context),'workspace');
assert.equal(scopeFor({kind:'file',owner:'film'},context),'project');
assert.equal(scopeFor({kind:'memory',owner:'film'},context),'project');
assert.equal(scopeFor({kind:'memory',owner:'workspace'},context),'workspace');
assert.equal(scopeFor({kind:'project',owner:'other'},context),'workspace');
assert.equal(scopeFor({kind:'app'},context),'system');
assert.equal(scopeFor({kind:'action',scope:'workspace'},context),'workspace');
assert.equal(scopeFor({kind:'window',owner:'workspace',visible:true},{owner:'workspace'}),'desktop');
assert(localProject({originWorkspace:'work'},'film','work',[]));
assert(!localProject({originWorkspace:'gaming'},'game','work',[]));
assert(localProject({originWorkspace:'gaming'},'game','work',['game']));

// Execute the shipped app and file builders, including private titles and actual instances.
const targets=new Map();
const target=id=>{if(!targets.has(id))targets.set(id,{children:[],replaceChildren(){this.children=[];},append(row){this.children.push(row);}});return targets.get(id);};
const ctx={scopeFor,localProject,activeWorkspace:'work',workspaceProfiles:{work:{label:'Work',home:'/home/work',folders:[['Documents','Documents'],['.workspace.toml','Settings','config']]}},
  projectSpaces:{film:{name:'Film',root:'/projects/film',originWorkspace:'work',files:[['Shot list.md','Notes','document'],['Clips','Footage','folder']]},foreign:{originWorkspace:'gaming',root:'/private',files:[['Secret.md','Secret','document']]}},
  appState:{browser:'open',second:'minimized',secret:'open',closed:'closed'},
  appInfo:{browser:{label:'Firefox',detail:'Studio'},second:{base:'browser',label:'Firefox · Research',detail:'Research'},secret:{base:'browser',label:'Firefox · Confidential',detail:'Confidential'},closed:{label:'Closed'}},
  appWindowStore:{snapshot:()=>({work:{secret:{previewHidden:true}}})},
  desktopPages:{columnOf:(_,id)=>id==='second'?'film':'workspace'},openProjectNames:()=>['film'],
  workspaceDownloads:{snapshot:()=>({files:[{workspace:'work',directory:'/home/work/Documents',name:'Review.txt'},{workspace:'gaming',directory:'/private',name:'Secret.txt'}]})},
  $:id=>target(id),$$:()=>[],appArt:id=>id,icon:id=>id,prepareControlSemantics(){},result:(action,label,detail)=>({dataset:action,label,detail})};
vm.createContext(ctx);
vm.runInContext(segment(shell,'function normalizeSearchText(','function buildUniversalAppResults(')+segment(source,'  function appResults(','  function metadata('),ctx);
vm.runInContext('function availableProjects(){return Object.entries(projectSpaces).filter(([id,p])=>localProject(p,id,activeWorkspace,openProjectNames()));}',ctx);
assert.equal(ctx.appResults('firefox'),3,'Each running or parked instance is individually searchable');
assert.equal(target('#universalAppResults').children.filter(row=>row.dataset.searchWindow==='true').length,3);
assert(!JSON.stringify(target('#universalAppResults').children).includes('Confidential'),'Private window title is absent');
assert.equal(ctx.appResults('confidential'),0,'Private content cannot be discovered through a matching query');
assert.equal(ctx.appResults('research'),1);
assert.equal(target('#universalAppResults').children[0].dataset.searchOpenApp,'second');
ctx.fileResults('shot');assert.equal(target('#universalFileResults').children[0].dataset.searchOwner,'film');
ctx.fileResults('review');assert.equal(target('#universalFileResults').children[0].dataset.searchFileDirectory,'/home/work/Documents');
ctx.fileResults('secret');assert.equal(target('#universalFileResults').children.length,0,'Foreign Home and unopened Project files stay out');
ctx.fileResults('workspace toml');assert.equal(target('#universalFileResults').children[0].dataset.searchFileDirectory,'/home/work','Config is a file, not an invented folder');

// Search result navigation uses its actual page, project column and fullscreen bond.
const handlers=[];const controls={addEventListener:(event,handler)=>handlers.push(handler)};
let navigated,opened,created;
const navigation={$:()=>controls,desktopPages:{pageOf:()=>2,columnOf:()=> 'film',fullscreenBond:()=>({name:'fallout'})},activeWorkspace:'gaming',
  appInfo:{browser:{},notes:{},fallout:{singleInstance:true}},appState:{browser:'minimized',notes:'closed',fallout:'minimized'},
  changeDesktopPage:(...args)=>navigated=args,openApp:name=>opened=name,createAppInstance:name=>created=name,setUniversalSearchOpen(){}};
vm.createContext(navigation);
vm.runInContext(segment(shell,'function launchAppHere(', 'function workspaceHotbarNames('),navigation);
vm.runInContext(segment(shell,'$("#universalResults").addEventListener("click", event => {','$("#universalResults").addEventListener("click", event => {\n  const result = event.target.closest("[data-search-project]"'),navigation);
handlers[0]({target:{closest:()=>({dataset:{searchOpenApp:'fallout',searchWindow:'true'}})}});
assert.deepEqual(navigated,[2,false,'film','fallout']);assert.equal(opened,'fallout');
created=undefined;opened=undefined;
handlers[0]({target:{closest:()=>({dataset:{searchOpenApp:'browser',searchNewInstance:'true'}})}});
assert.equal(created,'browser');assert.equal(opened,undefined,'An application result creates a fresh window instead of restoring its parked one');
assert.equal(navigation.appState.browser,'minimized','Application search leaves the parked window untouched');
created=undefined;
handlers[0]({target:{closest:()=>({dataset:{searchOpenApp:'browser'}})}});
assert.equal(created,'browser','Guide-limited application search uses the same new-window policy');
created=undefined;opened=undefined;
handlers[0]({target:{closest:()=>({dataset:{searchOpenApp:'browser',searchWindow:'true'}})}});
assert.equal(opened,'browser');assert.equal(created,undefined,'Selecting an actual parked window result still restores that window');
opened=undefined;
handlers[0]({target:{closest:()=>({dataset:{searchOpenApp:'notes'}})}});
assert.equal(opened,'notes','A closed app can use its existing closed identity');
opened=undefined;created=undefined;
handlers[0]({shiftKey:true,target:{closest:()=>({dataset:{searchOpenApp:'notes'}})}});
assert.equal(created,'notes','Shift-clicking an application result requests a new instance');
created=undefined;opened=undefined;
handlers[0]({target:{closest:()=>({dataset:{searchOpenApp:'fallout',searchNewInstance:'true'}})}});
assert.deepEqual(navigated,[2,false,'film','fallout']);assert.equal(opened,'fallout');assert.equal(created,undefined,'A single-instance application returns to its owner instead of attempting to create another copy');
// File actions must bring an existing File Browser's desktop into view first.
let fileHandler,fileDirectory,project;
const fileContext={results:{addEventListener:(_,handler)=>fileHandler=handler},appInfo:{files:{base:'dolphin'}},appState:{files:'open'},activeWorkspace:'work',activateProject:id=>project=id,desktopPages:{inColumn:()=>true,pageOf:()=>1,columnOf:()=> 'film'},changeDesktopPage:(...args)=>navigated=args,openFileLocation:path=>fileDirectory=path,showToast(){}};
vm.createContext(fileContext);vm.runInContext(segment(source,"  results.addEventListener('click',event=>{","  root.SpatialSearchScopes="),fileContext);
fileHandler({target:{closest:()=>({dataset:{searchOwner:'film',searchFileDirectory:'/projects/film',searchFileName:'Shot list.md'}})}});
assert.equal(project,'film');assert.deepEqual(navigated,[1,false,'film']);assert.equal(fileDirectory,'/projects/film');
assert.match(segment(shell,'function renderWorkspace(name,','function renderDemoAppExample('),/SpatialSearchScopes[\s\S]*filterUniversalSearch\(\)/,'Workspace switching refreshes existing queries');
console.log('Scoped search passed: desktop/project/Workspace/system ranking, actual parked instances, private titles, owned files and downloads, foreign-context exclusion and fullscreen return.');
