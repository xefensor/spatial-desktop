const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {scopeFor,localProject,canonicalFilePath,duplicateFiles}=require('../dist/search-scopes.js');
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

// Canonical file deduplication keeps content-search/action-rich saved items,
// without merging copies, references at different paths, or case-sensitive names.
assert.equal(canonicalFilePath('/home/work//Assistant/./brief.md'),'/home/work/Assistant/brief.md');
assert.equal(canonicalFilePath('/home/work/../private.md'),'');
assert.equal(canonicalFilePath('https://example.org/brief.md'),'');
const fileRow={path:'/projects/film/brief.md',provider:'files'},savedRow={path:'/projects/film/brief.md',provider:'memory'},copyRow={path:'/projects/film/brief (2).md',provider:'memory'};
assert.deepEqual(duplicateFiles([fileRow,savedRow,copyRow]),[fileRow]);
assert.deepEqual(duplicateFiles([savedRow,fileRow]),[fileRow],'Saved-item preference does not depend on provider order');
assert.equal(duplicateFiles([{path:'/projects/film/Brief.md',provider:'files'},savedRow]).length,0,'Distinct Linux filenames stay distinct');
const duplicateFile={dataset:{searchFileDirectory:'/projects/film',searchFileName:'brief.md'},hidden:false};
const memoryResult={dataset:{memoryResult:'saved'},hidden:false},contentOnly={dataset:{memoryResult:'content-only'},hidden:false},differentCopy={dataset:{memoryResult:'copy'},hidden:false},sourceLink={dataset:{memoryResult:'source'},hidden:false};
const savedItems={saved:{id:'saved'},'content-only':{id:'content-only'},copy:{id:'copy'},source:{id:'source',source:{address:'/projects/film/brief.md'}}};
const pathById={saved:'/projects/film/brief.md','content-only':'/projects/film/only-content.md',copy:'/projects/film/brief (2).md'};
const dedupeContext={results:{},duplicateFiles,$$:()=>[duplicateFile,memoryResult,contentOnly,differentCopy,sourceLink],root:{SpatialMemoryDesktop:{itemFor:id=>savedItems[id],savedItem:item=>pathById[item.id]?{path:pathById[item.id]}:null}}};
vm.createContext(dedupeContext);vm.runInContext(segment(source,'  function dedupe(','  function metadata('),dedupeContext);
assert.equal(dedupeContext.dedupe(false),1,'Category counts can use the same unique All count without hiding their own result');
assert(!duplicateFile.hidden);assert(!memoryResult.hidden);
assert.equal(dedupeContext.dedupe(),1);assert(duplicateFile.hidden);assert(!memoryResult.hidden,'All results retains the actionable saved item');
assert(!contentOnly.hidden,'A content-only match remains searchable without a matching filename');
assert(!differentCopy.hidden,'Different saved locations retain separate results');
assert(!sourceLink.hidden,'A source address is not its saved location');

// Rows inherit their visible section's scope; location appears only when needed
// to distinguish another desktop/Project. Parking has no desktop ownership.
const rowContext={scopeFor,activeWorkspace:'work',appState:{here:'open',away:'open',parked:'minimized',other:'minimized',background:'background'},
  projectSpaces:{film:{name:'Film'},research:{name:'Research'}},kinds:{apps:'Application',files:'File',settings:'Action'},
  desktopPages:{columnOf:(_,id)=>id==='other'?'research':'film',visible:(_,id)=>id!=='away',pageOf:()=>2,fullscreenBond:()=>null},
  localDisplaySlot:()=>1,activeDisplayRoster:()=>[{}]};
vm.createContext(rowContext);vm.runInContext(segment(source,'  function metadata(','  function render('),rowContext);
const row=id=>({dataset:{searchWindow:'true',searchOpenApp:id}}),rowScope={owner:'film',workspace:{label:'Work'}};
assert.equal(rowContext.metadata(row('here'),'apps',rowScope).detail,'','Current desktop is already identified by its heading');
assert.equal(rowContext.metadata(row('away'),'apps',rowScope).detail,'Desktop 3','Another desktop remains distinguishable');
assert.equal(rowContext.metadata(row('parked'),'apps',rowScope).scope,'project','Parked windows span their Project, regardless of the stored page');
assert.equal(rowContext.metadata(row('parked'),'apps',rowScope).detail,'');
assert.equal(rowContext.metadata(row('other'),'apps',rowScope).detail,'Research','A parked window has a Project location, not a misleading desktop');
assert.equal(rowContext.metadata(row('background'),'apps',rowScope).scope,'system','Background apps have system scope');
assert.equal(rowContext.metadata({dataset:{searchOwner:'film'}},'files',rowScope).detail,'','The existing file path needs no second generic scope line');
assert.equal(rowContext.metadata({dataset:{searchScope:'system'}},'settings',rowScope).detail,'','Settings inherit their scope heading');

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
