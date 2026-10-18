const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../dist/assistant-files.js'),C=require('../dist/ai-context.js'),H=require('../dist/home-folders.js');
const profiles={general:{home:'/home/demo'},work:{home:'/home/demo/Workspaces/Work'},gaming:{home:'/home/demo/Workspaces/Gaming'}},projects={web:{root:'/mnt/Web',originWorkspace:'work',files:[]}};
assert.equal(T.parse('Summarize this paragraph'),null);
const command=T.parse('Convert all PNG in "Pictures" to WebP in "Pictures/Web"');
assert.equal(command.format,'webp');assert.equal(command.sourceFolder,'Pictures');assert.equal(command.destination,'Pictures/Web');assert.equal(command.extension,'png');
assert.equal(T.parse('Convert "Project note.md" to HTML in Converted').sourceName,'Project note.md');
assert.equal(T.parse('Convert selected files to plain text').format,'txt');
assert.throws(()=>T.parse('Convert this to PDF'),/Choose a format/);
assert.throws(()=>T.parse('Convert this to HTML and overwrite the original'),/never overwritten/);
assert.equal(T.path('../Converted','/mnt/Web/Assets'),'/mnt/Web/Converted');
assert.throws(()=>T.path('https://example.org'),/local folder/);
assert.equal(T.allowed('/home/demo/Workspaces/Gaming/secret.txt','general',profiles,projects),false,'General Home cannot bypass a nested Workspace boundary');
assert.equal(T.allowed('/mnt/Web/Assets','work',profiles,projects),true);
assert.equal(T.allowed('/mnt/Web/Assets','gaming',profiles,projects),false);
assert.throws(()=>T.chooseFolder('Assets','/home/demo',['/a/Assets','/b/Assets']),/More than one/);
assert.equal(T.chooseFolder('Pictures','/home/demo',['/home/demo/Pictures']),'/home/demo/Pictures');
const html=T.convertText('# Review\n<script>unsafe()</script>','md','html');
assert(html.includes('<h1>Review</h1>'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));
assert.equal(T.convertText('<p>Hello &amp; world</p><script>secret()</script>','html','txt'),'Hello & world\n');
const csv='name,note\r\n"Xef","Line one\nLine two, with a quote ""inside"""\r\n';
const json=T.convertText(csv,'csv','json');assert.deepEqual(JSON.parse(json),[{name:'Xef',note:'Line one\nLine two, with a quote "inside"'}]);
assert.deepEqual(JSON.parse(T.convertText(T.convertText(json,'json','csv'),'csv','json')),JSON.parse(json));
assert.throws(()=>T.convertText('a,a\n1,2','csv','json'),/unique/);
assert.throws(()=>T.convertText('a,b\n1','csv','json'),/match/);
assert.throws(()=>T.convertText('"unfinished','csv','json'),/unclosed/);
assert.throws(()=>T.convertText('free prose','txt','csv'),/needs JSON/);
assert.throws(()=>T.convertText('{}','json','csv'),/array/);
assert.equal(JSON.parse(T.convertText('source text','txt','json')).text,'source text');
assert.deepEqual(T.select(['a','b','c'],['a'],'c',{shift:true}),['a','b','c']);
assert.deepEqual(T.select(['a','b','c'],['a'],'c',{ctrl:true}),['a','c']);
assert.deepEqual(T.select(['a','b','c'],['a','c'],'a',{ctrl:true}),['c']);
const model=C.create({}, {workspaces:()=>profiles,projects:()=>projects});
model.add('work',{id:'original',title:'Note',text:'Old text',workspace:'work',versionId:'version-1'});
const turn=model.exchange('work','Convert to HTML',{title:'Conversion',text:'Review',action:{format:'html',destination:'/mnt/Web/Converted',status:'review'}});
model.add('work',{id:'original',title:'Note',text:'New text',workspace:'work',versionId:'version-2'});
model.action('work',turn.id,{...turn.action,status:'complete',outputs:[{path:'/mnt/Web/Converted/Note.html',itemId:'output'}]});
const restored=C.create(model.snapshot(),{workspaces:()=>profiles,projects:()=>projects}).session('work').turns[0];
assert.equal(restored.action.status,'complete');assert.equal(restored.sources[0].versionId,'version-1');assert.equal(restored.sources[0].text,'Old text');assert.equal(restored.action.outputs[0].itemId,'output');
assert.equal(model.action('gaming',turn.id,{format:'html'}),null,'Another Workspace cannot mutate this action');
const files=H.create();files.add('/mnt/Web/Converted','Note.html',{workspace:'work',content:html,itemId:'output',attachment:{kind:'file',key:'stash-test'},operationId:turn.id});
const second=files.add('/mnt/Web/Converted','Note.html',{workspace:'work',content:html});assert.equal(second.name,'Note (2).html');
assert.equal(H.create(files.snapshot()).list('/mnt/Web/Converted')[0].attachment.key,'stash-test');

// The File Browser must classify generated media even when its legacy file
// projection already supplied a generic document row for the same path.
const appSource=fs.readFileSync(require.resolve('../dist/app-windows.js'),'utf8');
const mediaFiles=H.create();mediaFiles.add('/mnt/Web/Converted','photo.webp',{workspace:'work',attachment:{kind:'image',key:'stash-image'}});
const mediaEnv={frameFor:()=>({}),workspaceProfiles:profiles,projectSpaces:projects,SpatialHomeFolders:H,workspaceDownloads:mediaFiles,fileLocationRows:()=>[['photo.webp','Saved file','document']]};
vm.createContext(mediaEnv);vm.runInContext(appSource.slice(appSource.indexOf('function appFileRows('),appSource.indexOf('function appFileBreadcrumbs(')),mediaEnv);
assert.equal(vm.runInContext("appFileRows('files','/mnt/Web/Converted')[0][2]",mediaEnv),'image');

// Exercise the production selection adapter and file-request capture without
// exposing a DOM selection to an unrelated Workspace or collecting it passively.
const events={},nodes=new Map(),sent=[],session=C.create({}, {workspaces:()=>profiles,projects:()=>projects});let frame,field,sequence=0;const blobs=new Map(),outputs=[],activity=[];let failPut=false;
function node(id){if(!nodes.has(id))nodes.set(id,{id,hidden:false,className:'',dataset:{},innerHTML:'',before(){},setAttribute(){},addEventListener(type,fn){(events[id+':'+type]??=[]).push(fn);},querySelector(){return null;},closest(){return null;}});return nodes.get(id);}
const boot={SpatialAssistantFiles:T,SpatialStashFiles:{safeAttachment:value=>value||null,safeName:x=>x,async put(key,blob){if(failPut)throw Error('Storage full');blobs.set(key,blob);},get:key=>Promise.resolve(blobs.get(key))},SpatialHomeFolders:H,workspaceProfiles:profiles,projectSpaces:projects,activeWorkspace:'work',appState:{notes:'open',files:'open'},appInfo:{notes:{label:'Note Editor'},files:{base:'dolphin',label:'File Browser'}},desktopPages:{columnOf:()=> 'web',inColumn:()=>true,pageOf:()=>0,current:()=>0},isLocalApp:()=>boot.activeWorkspace==='work',frameFor:()=>frame,contextMenuDescriptor:()=>null,contextMenuEntries:()=>[],executeContextAction(){},closeDesktopContextMenu(){},openDesktopContextMenu(c){boot.menu=c;},openAppFile(){},workspaceDownloads:H.create(),escapeHtml:x=>String(x),icon:()=>'',prepareControlSemantics(){},Blob,crypto:{randomUUID:()=>String(++sequence)},CSS:{escape:x=>x},MutationObserver:class{observe(){}},window:{getSelection:()=>null,addEventListener(){}},document:{activeElement:null,querySelector:()=>null,getElementById:node,createElement:()=>node('created'),addEventListener(type,fn){(events[type]??=[]).push(fn);}},SpatialMemoryDesktop:{contextAtFile(path){return {id:path,title:path.split('/').at(-1),filename:path.split('/').at(-1),text:'Saved input '+path,kind:'note',address:path,workspace:'work',project:'web',source:{workspace:'work',project:'web',app:'notes'}};}},SpatialAIDesktop:{current:()=>session.session(boot.activeWorkspace),workingFolder:()=>'/mnt/Web',removeInputs(ids){ids.forEach(id=>session.remove(boot.activeWorkspace,id));},attach(items){return items.map(i=>session.add(boot.activeWorkspace,{...i,versionId:'captured-version'}));},createTurn(request,response,context){const turn=session.exchange(boot.activeWorkspace,request,response,context);sent.push(turn);return turn;},notify(text){boot.status=text;},setAction(workspace,chatId,turnId,value){return session.action(workspace,turnId,value,chatId);},inspect(){}}};
frame={dataset:{appFrame:'notes'},hidden:false,contains:()=>true,querySelector:()=>null,querySelectorAll:()=>[],closest:()=>frame};
field={value:'Before SELECTED after',selectionStart:7,selectionEnd:15,matches:s=>s.startsWith('textarea'),closest:()=>frame};boot.document.activeElement=field;
boot.SpatialItemHistoryDesktop={capture(item,options){outputs.push({item,options});},persist(){}};boot.SpatialTimelineDesktop={record(...args){activity.push(args);}};boot.desktopStorage={setItem(){}};boot.refreshDownloadUi=()=>{};boot.captureWorkspaceContent=()=>{};boot.queueDesktopStateBroadcast=()=>{};
vm.createContext(boot);vm.runInContext(fs.readFileSync(require.resolve('../dist/assistant-desktop.js'),'utf8'),boot);
assert.equal(session.session('work').items.length,0,'Highlighting alone captures nothing');
assert.equal(boot.SpatialAssistantDesktop.invoke(),true);assert.equal(session.session('work').items[0].text,'SELECTED');
field.value='Changed later';assert.equal(session.session('work').items[0].text,'SELECTED','Invocation retains the exact selected text');
boot.desktopPages.inColumn=()=>false;boot.SpatialDisplayRoleBridge={windowContextKey:()=> 'work:display-role:assistant:2'};
field.value='PINNED';field.selectionStart=0;field.selectionEnd=6;assert.equal(boot.SpatialAssistantDesktop.capture()[0].text,'PINNED','A local supporting-display window is selectable outside the main desktop column');
boot.SpatialDisplayRoleBridge.windowContextKey=()=>null;assert.equal(boot.SpatialAssistantDesktop.capture().length,0,'Unpinned off-column windows remain outside selection context');
boot.desktopPages.inColumn=()=>true;delete boot.SpatialDisplayRoleBridge;
boot.activeWorkspace='gaming';assert.equal(boot.SpatialAssistantDesktop.invoke(),false);assert.equal(session.session('gaming').items.length,0);
boot.activeWorkspace='work';frame.dataset.appFrame='files';frame.dataset.fileLocation='/mnt/Web';field.matches=()=>false;
const rows=['one.md','two.md'].map(name=>({dataset:{fileName:name},closest:()=>frame}));frame.querySelectorAll=()=>rows;
assert.equal(boot.SpatialAssistantDesktop.invoke(),true);assert.equal(session.session('work').items.length,2,'A new invocation replaces the earlier implicit selection, keeping the new file batch');
assert.equal(boot.contextMenuDescriptor({closest:()=>null}),null,'Desktop menus must not inherit a stale file selection');
const context=boot.contextMenuDescriptor({closest:s=>s==='[data-app-frame]'?frame:null});assert.equal(context.assistantSources.length,2);assert.equal(boot.contextMenuEntries(context)[0].label,'Ask Assistant');
node('aiPrompt').value='Convert selected files to HTML in Converted';
(async()=>{let stopped=false;await events.submit[0]({target:{id:'aiComposer'},preventDefault(){},stopImmediatePropagation(){stopped=true;}});assert(stopped);assert.equal(sent.length,1,boot.status);assert.equal(sent[0].action.destination,'/mnt/Web/Converted');assert.equal(sent[0].sources.length,2);assert(sent[0].sources.every(i=>i.versionId==='captured-version'));assert.equal(files.list('/mnt/Web').length,0,'Proposing never writes output files');const count=boot.workspaceDownloads.snapshot().files.length;
  function clickRun(turnId){const card={dataset:{turn:turnId},querySelector:()=>({value:'/mnt/Web/Converted'})};return events['aiTranscript:click'][0]({target:{closest:selector=>selector==='.ai-file-task'?card:selector==='[data-task-run]'?{}:null}});}
  await clickRun(sent[0].id);const written=boot.workspaceDownloads.list('/mnt/Web/Converted');assert.equal(written.length,2);assert.equal(outputs.length,2);assert(written.every(file=>file.content.includes('<!doctype html>')));assert(written.every(file=>file.attachment.key&&blobs.has(file.attachment.key)));assert(outputs.every(record=>record.options.related[0].versionId==='captured-version'));assert.equal(activity[0][0],'assistant.output');assert.equal(activity[0][1].sourceIds.length,2);assert.equal(session.session('work').turns[0].action.status,'complete');
  await clickRun(sent[0].id);assert.equal(boot.workspaceDownloads.list('/mnt/Web/Converted').length,2,'A completed action cannot run twice');
  const failed=session.exchange('work','Convert again',{title:'Conversion',text:'Review',action:{format:'html',destination:'/mnt/Web/Converted',status:'review'}},{sources:sent[0].sources});failPut=true;await clickRun(failed.id);assert.equal(session.session('work').turns.at(-1).action.status,'failed');assert.equal(boot.workspaceDownloads.list('/mnt/Web/Converted').length,2,'A failed save leaves the folder unchanged');
  console.log('Assistant files passed: real text formats, CSV quoting, safe HTML, Workspace paths, copy collisions, persisted action/source versions, production selection and exact multi-file request capture.');})().catch(error=>{console.error(error);process.exitCode=1;});
