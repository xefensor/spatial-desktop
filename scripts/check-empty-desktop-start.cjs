const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Pages=require('../dist/desktop-pages.js'),Resources=require('../dist/empty-desktop-resources.js');
const Home=require('../dist/home-folders.js'),Tools=require('../dist/app-tools.js');
const shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8'),apps=fs.readFileSync(require.resolve('../dist/app-windows.js'),'utf8');
const segment=(source,first,last)=>{const start=source.indexOf(first),end=source.indexOf(last,start+first.length);assert(start>=0&&end>start);return source.slice(start,end);};
const decode=value=>value.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const key=name=>name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
const doc={activeElement:null};
class Node {
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.hidden=false;this.inert=false;this.value='';this._html='';this._text='';this.className='';this.scrollHeight=400;this.clientHeight=200;}
  append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}
  setAttribute(name,value){if(name.startsWith('data-'))this.dataset[key(name)]=String(value);else if(name==='class')this.className=String(value);else this.attrs[name]=String(value);}
  getAttribute(name){return name.startsWith('data-')?this.dataset[key(name)]??null:name==='class'?this.className:this.attrs[name]??null;}
  set innerHTML(value){
    this._html=String(value);for(const node of [...this.children])node.remove();this._text='';
    for(const match of this._html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)){
      const node=new Node('button');for(const attr of match[1].matchAll(/([\w:-]+)(?:="([^"]*)")?/g))node.setAttribute(attr[1],decode(attr[2]||''));
      node._text=decode(match[2].replace(/<[^>]*>/g,''));this.append(node);
    }
    if(!this.children.length)this._text=decode(this._html.replace(/<[^>]*>/g,''));
  }
  get innerHTML(){return this._html;}
  set textContent(value){for(const node of [...this.children])node.remove();this._text=String(value);this._html='';}
  get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  matches(selector){return selector.split(',').some(part=>{part=part.trim();if(part.startsWith('.'))return this.className.split(/\s+/).includes(part.slice(1));const attr=/^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(part);return attr?this.getAttribute(attr[1])!==null&&(attr[2]===undefined||this.getAttribute(attr[1])===attr[2]):this.tag===part;});}
  closest(selector){return this.matches(selector)?this:this.parent?.closest(selector)||null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);}
  dispatch(type,options={}){
    const event={target:this,shiftKey:false,key:'',prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...options};
    for(let node=this;node;node=node.parent){for(const handler of node.listeners[type]||[])handler(event);if(event.stopped)break;}return event;
  }
  click(){return this.dispatch('click');}
  focus(){doc.activeElement=this;}
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
}
const nodes={};
for(const id of ['emptyWorkspace','emptyDesktopApps','emptyDesktopAllApps','emptyDesktopSearch','emptyDesktopFolders','emptyDesktopFiles','emptyDesktopStatus','emptyDesktopClear','emptyDesktopFoldersSection','emptyDesktopFilesSection','emptyDesktopAppsSection','emptyDesktopMoreFolders','emptyDesktopMoreFiles','emptyDesktopFilesEmpty'])nodes['#'+id]=new Node(id==='emptyDesktopSearch'?'input':'div');
nodes['.desktop-shell']=new Node();const launcher=new Node();launcher.className='empty-desktop-launcher';
const panel=nodes['#emptyWorkspace'],grid=nodes['#emptyDesktopApps'],folders=nodes['#emptyDesktopFolders'],files=nodes['#emptyDesktopFiles'],search=nodes['#emptyDesktopSearch'];
nodes['.desktop-shell'].append(panel);panel.append(launcher);launcher.append(search,nodes['#emptyDesktopClear'],nodes['#emptyDesktopStatus'],nodes['#emptyDesktopAppsSection'],nodes['#emptyDesktopFoldersSection'],nodes['#emptyDesktopFilesSection']);
nodes['#emptyDesktopAppsSection'].append(nodes['#emptyDesktopAllApps'],grid);nodes['#emptyDesktopFoldersSection'].append(nodes['#emptyDesktopMoreFolders'],folders);nodes['#emptyDesktopFilesSection'].append(nodes['#emptyDesktopMoreFiles'],files,nodes['#emptyDesktopFilesEmpty']);
const profiles={work:{label:'Work',home:'/home/work',folders:[['Documents','Work documents','folder'],['.spatial-workspace.toml','Workspace settings','config']]},gaming:{label:'Gaming',home:'/home/gaming',folders:[['Games','Installed games','folder']]}};
const projects={site:{name:'Website',root:'/projects/site',originWorkspace:'work',files:[['brief.md','Project brief','document'],['Source','Code','folder'],['Stash','Project notes','folder']]},other:{name:'Other private project',root:'/projects/other',originWorkspace:'work',files:[['other-secret.md','SECRET OTHER PROJECT','document']]},foreign:{name:'Foreign',root:'/home/gaming/Projects/private',originWorkspace:'gaming',files:[['foreign-secret.md','SECRET GAMING','document']]}};
const downloads=Home.create(),workFile=downloads.add('/home/work/Documents','Žlutý plán.txt',{workspace:'work',content:'WORK CONTENT 674 — actual preview'});
downloads.add('/home/gaming/Documents',workFile.name,{workspace:'gaming',content:'SECRET GAMING CONTENT'});
downloads.add('/projects/site','saved-project.txt',{workspace:'work',project:'site',content:'PROJECT CONTENT 913'});
downloads.add('/projects/other','other-download.txt',{workspace:'work',project:'other',content:'SECRET OTHER PROJECT'});
for(let i=0;i<6;i++)downloads.add('/home/work/Downloads','recent-'+i+'.txt',{workspace:'work',content:'Saved '+i});
const pages=Pages.create();pages.assign('work','parked-files',0);pages.go('work',1);
const parkedModel={navigation:Tools.navigation('/home/work/old-folder'),query:'Keep this filter',selected:'old.txt'};
const frames=new Map(),models=new Map([['parked-files',parkedModel]]),created=[],locations=[],launched=[],captured=[],timeline=[];
const frameFor=id=>frames.get(id);let blocked=false,guideFolders=true,guideActive=false,sequence=0,superHeld=false;
const context={document:doc,SpatialEmptyDesktopResources:Resources,SpatialHomeFolders:Home,SpatialAppTools:Tools,desktopPages:pages,workspaceProfiles:profiles,projectSpaces:projects,workspaceDownloads:downloads,
  activeWorkspace:'work',appInfo:{browser:{label:'Firefox',primary:'#f73'},notes:{label:'Žlutý poznámkovník',primary:'#fb5'},dolphin:{label:'File Browser',primary:'#39f'},'parked-files':{base:'dolphin',label:'File Browser · parked'},steam:{label:'Steam',workspace:'gaming',singleInstance:true}},
  appState:{browser:'closed',notes:'closed',dolphin:'closed','parked-files':'minimized',steam:'closed'},
  SpatialGuide:{model:{active:()=>guideActive,allows:feature=>feature!=='folders'||guideFolders}},SpatialDemoSuper:{held:()=>superHeld},
  SpatialMemoryDesktop:{openFile:()=>false,fileRows:path=>path==='/home/work'?[['workspace-note.md','Saved workspace note','document']]:path==='/projects/site'?[['project-note.md','Saved project note','document']]:null},
  $:(selector,scope)=>scope?scope.querySelector(selector):nodes[selector]||null,$$:()=>[],frameFor,appWindowModel:id=>models.get(id),
  escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;'),icon:id=>'<svg>'+id+'</svg>',appArt:id=>'<svg>'+id+'</svg>',
  desktopNavigationBlocked:()=>blocked,launchAppHere:(id,shift)=>launched.push([id,shift]),
  createAppInstance(base){const id='files--'+(++sequence),frame=new Node('article'),preview=new Node('section');preview.className='file-preview';preview.hidden=true;frame.append(preview);frame.dataset.appFrame=id;frames.set(id,frame);models.set(id,{navigation:Tools.navigation(profiles[context.activeWorkspace].home)});context.appInfo[id]={base,label:'File Browser · '+sequence};context.appState[id]='open';pages.assign(context.activeWorkspace,id);created.push(id);return id;},
  renderFileLocation(id,path){locations.push([id,path]);Tools.visit(models.get(id).navigation,path);frames.get(id).dataset.fileLocation=path;},
  captureWorkspaceContent:()=>captured.push(context.activeWorkspace),prepareControlSemantics(){},appActionButton:()=>'<button>Close preview</button>',saveAppWindows(){},
  SpatialTimelineDesktop:{record:(...args)=>timeline.push(args)},setUniversalSearchOpen:open=>launched.push(['overview',open]),SpatialOverviewDesktop:{select:tab=>launched.push(['section',tab])}
};
vm.createContext(context);
vm.runInContext(segment(shell,'function normalizeSearchText(','function buildUniversalAppResults('),context);
vm.runInContext(segment(shell,'function fileLocationRows(','function renderFileLocation('),context);
vm.runInContext(segment(apps,'function appFileRows(','function appFileBreadcrumbs('),context);
vm.runInContext(segment(apps,'function openAppFile(','function newAppFolder('),context);
vm.runInContext(fs.readFileSync(require.resolve('../dist/empty-desktop.js'),'utf8'),context);
const refresh=()=>context.SpatialEmptyDesktop.refresh(),query=value=>{search.value=value;return search.dispatch('input');};
const resource=(host,text)=>host.querySelectorAll('[data-empty-resource]').find(button=>button.textContent.includes(text));
const snapshotParked=JSON.stringify(parkedModel);
assert(!grid.innerHTML.includes('Steam'));assert(!grid.innerHTML.includes('parked-files'),'Live instances are not additional launchers');
query('zluty poznam');assert.equal(grid.children.length,1);assert.equal(grid.children[0].dataset.emptyApp,'notes','Applications use production accent-insensitive multiword matching');
grid.children[0].click();assert.deepEqual(launched.pop(),['notes',false]);
query('Documents');const documents=resource(folders,'Documents');assert(documents);assert.match(documents.getAttribute('title'),/\/home\/work\/Documents/);
documents.click();assert.deepEqual(locations.at(-1),[created.at(-1),'/home/work/Documents']);
assert.equal(context.appState['parked-files'],'minimized');assert.equal(JSON.stringify(parkedModel),snapshotParked,'Opening a folder creates a fresh browser and preserves an existing parked browser');
query('zluty plan');const saved=resource(files,workFile.name);assert(saved);saved.click();
const opened=created.at(-1),preview=frames.get(opened).querySelector('.file-preview');
assert.deepEqual(locations.at(-1),[opened,'/home/work/Documents']);assert.equal(preview.hidden,false);assert.match(preview.innerHTML,/WORK CONTENT 674/,'The actual openAppFile path opens saved file contents rather than only its folder');assert(!preview.innerHTML.includes('SECRET GAMING'));
assert(timeline.some(([kind,entry])=>kind==='file.open'&&entry.title===workFile.name));assert(captured.length>=2);
query('secret');assert.equal(files.children.length,0);assert.equal(folders.children.length,0,'Foreign Workspace and unopened Project resources are absent');
query('saved-project');assert.equal(files.children.length,0,'Another Project is not included from the workspace column');
pages.select('work','site');refresh();assert.equal(search.value,'','Project switching resets the prior query');
query('saved-project');const projectFile=resource(files,'saved-project.txt');assert(projectFile);projectFile.click();assert.match(frames.get(created.at(-1)).querySelector('.file-preview').innerHTML,/PROJECT CONTENT 913/);
query('project-note');assert(resource(files,'project-note.md'),'Current Project Stash files are discoverable');query('workspace-note');assert(resource(files,'workspace-note.md'),'Current Workspace Home remains accessible within its Project');
query('other-secret');assert.equal(files.children.length,0);query('brief');assert(resource(files,'brief.md'),'Current Project files are included');

// Repeated desktop synchronization must not replace the search field or a
// focused result, reset the query, or disturb the caret.
query('brief');search.focus();search.setSelectionRange(2,4);const input=search,brief=files.children[0];const markup=files.innerHTML;
refresh();refresh();assert.equal(nodes['#emptyDesktopSearch'],input);assert.equal(doc.activeElement,input);assert.equal(search.value,'brief');assert.equal(search.selectionStart,2);assert.equal(search.selectionEnd,4);assert.equal(files.children[0],brief);assert.equal(files.innerHTML,markup);
brief.focus();refresh();assert.equal(doc.activeElement,brief);assert.equal(files.children[0],brief,'An unchanged refresh retains the focused result node');

// A queued old result cannot launch after a context switch or after removal.
const count=created.length;pages.select('work','workspace');brief.click();assert.equal(created.length,count,'An old Project result is rejected before refresh');refresh();brief.click();assert.equal(created.length,count,'A detached result is rejected');
query('zluty plan');const stale=resource(files,workFile.name),downloadSnapshot=downloads.snapshot();downloadSnapshot.files=downloadSnapshot.files.filter(file=>file.directory!==workFile.directory||file.name!==workFile.name);downloads.load(downloadSnapshot);stale.click();assert.equal(created.length,count,'A no-longer-existing file is revalidated at click time');
query('Documents');const guarded=resource(folders,'Documents');
for(const set of [()=>panel.hidden=true,()=>nodes['.desktop-shell'].inert=true,()=>blocked=true]){set();guarded.click();assert.equal(created.length,count);panel.hidden=false;nodes['.desktop-shell'].inert=false;blocked=false;}
guideActive=true;guideFolders=false;refresh();assert(nodes['#emptyDesktopFoldersSection'].hidden&&nodes['#emptyDesktopFilesSection'].hidden);guarded.click();assert.equal(created.length,count,'Guide cannot open a stale folder from an untaught feature');guideActive=false;guideFolders=true;
query('Firefox');const enter=search.dispatch('keydown',{key:'Enter'});assert(enter.prevented&&enter.stopped);assert.deepEqual(launched.pop(),['browser',false]);
const escape=search.dispatch('keydown',{key:'Escape'});assert(escape.prevented&&escape.stopped);assert.equal(search.value,'');assert.equal(nodes['#emptyDesktopClear'].hidden,true);
query('Documents');nodes['#emptyDesktopClear'].click();assert.equal(search.value,'');assert.equal(doc.activeElement,search);
query('work');context.activeWorkspace='gaming';refresh();assert.equal(search.value,'');query('zluty');assert.equal(files.children.length,1);assert.match(files.children[0].getAttribute('title'),/^\/home\/gaming\//,'Workspace switch uses the new Home even for an identical filename');assert(!files.innerHTML.includes('/home/work/'));
query('Steam');assert.equal(grid.children[0].dataset.emptyApp,'steam');
const priorLaunches=launched.length;panel.hidden=true;search.dispatch('keydown',{key:'Enter'});assert.equal(launched.length,priorLaunches,'Keyboard submission obeys the same hidden panel guard');panel.hidden=false;
const wheel=options=>launcher.dispatch('wheel',options);assert.equal(wheel({}).stopped,true);
for(const options of [{shiftKey:true},{ctrlKey:true},{metaKey:true},{getModifierState:key=>key==='OS'}])assert.equal(wheel(options).stopped,false);
superHeld=true;assert.equal(wheel({}).stopped,false);superHeld=false;launcher.scrollHeight=launcher.clientHeight;assert.equal(wheel({}).stopped,false,'An unscrollable launcher leaves desktop scrolling available');
console.log('Empty desktop start passed: scoped real resources and file contents, new file windows, preserved parked sessions, search focus/caret, stale actions, Guide/modal guards and keyboard/wheel routing.');
