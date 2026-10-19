'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const memorySource=fs.readFileSync(path.join(__dirname,'../dist/working-memory-desktop.js'),'utf8');
function section(start,end){const a=memorySource.indexOf(start),b=memorySource.indexOf(end,a);assert(a>=0&&b>a,'Production Files section exists: '+start);return memorySource.slice(a,b);}
// Reuse the bounded native panel renderer fixture. Its production panel runtime
// remains responsible for popup placement, live-node ownership and Guide gates.
const fixture=fs.readFileSync(path.join(__dirname,'check-panel-desktop.cjs'),'utf8');
const prefix=fixture.slice(0,fixture.indexOf("test('runtime-only fixture"));
const harness={require,process,console,__dirname,module:{exports:{}}};
vm.runInNewContext(prefix+'\nmodule.exports={w,d,context,P,registry,flush,guideBlockedWidgets};',harness,{filename:'files-widget-fixture.cjs'});
const {w,d,context,P,registry,flush,guideBlockedWidgets}=harness.module.exports;
const host=d.createElement('section');host.id='workingMemory';
const editor=d.createElement('textarea');editor.value='Unsent Files note';
const note=d.createElement('button');note.textContent='Note';let noteClicks=0;note.addEventListener('click',()=>noteClicks++);
host.append(editor,note);registry.get('files').source.append(host);
w.__filesHost=host;w.__filesModule=require('../dist/stash-files.js');w.__memoryModule=require('../dist/working-memory.js');w.SpatialAIContext=require('../dist/ai-context.js');
w.__fileCaptures=[];w.__fileUploads=[];w.__fileFeedback=[];
w.projectSpaces={site:{name:'Website',originWorkspace:'work',root:'/projects/site',resources:[],files:[['brief.md','Linked reference','file','/shared/brief.md'],['assets','8 files','folder'],['plan.md','','file']]}};
w.workspaceProfiles.work.home='/home/work';w.workspaceProfiles.work.folders=[['Documents','42 items','folder']];w.workspaceProfiles.general.home='/home/general';w.workspaceProfiles.general.folders=[];
w.__filesItem={id:'saved-reference',title:'Reference',text:'Saved excerpt',scope:'["work","site"]',created:10,source:{workspace:'general',project:null,app:'browser--2',label:'Original web page',address:'https://example.test/reference'}};
w.__filesModule.materialize(w.projectSpaces.site,[w.__filesItem]);
const dragStart=section("  host.addEventListener('dragstart'",'  const acceptsDrop=');
const dropAcceptance=section('  const acceptsDrop=','  async function keepContext(');
const dropHandlers=section('  function dropIntoStash(',"  document.addEventListener('click',event=>{const result=");
vm.runInContext(`(function(){
  const host=__filesHost,F=__filesModule,M=__memoryModule,$=(selector,root=document)=>root.querySelector(selector);
  const workspaceOwners=new Map();
  const scope=()=>M.scope(activeWorkspace,activeWorkspace==='work'?'site':null);
  const ownerFor=key=>{const [workspace,project]=JSON.parse(key);if(project)return projectSpaces[project];if(!workspaceOwners.has(workspace))workspaceOwners.set(workspace,{root:workspaceProfiles[workspace].home,files:[]});return workspaceOwners.get(workspace);};
  const savedItem=item=>{const owner=ownerFor(item.scope),file=owner?.stash?.files?.[item.fileId||item.id];return file?{owner,file,path:F.path(owner,file)}:null;};
  const allowed=()=>!globalThis.SpatialGuide?.model.active()||SpatialGuide.model.allows('stash');
  const itemFor=id=>id===__filesItem.id?__filesItem:null;
  const showDropTarget=()=>{};
  const keepContext=value=>__fileCaptures.push(value);
  const saveFiles=files=>__fileUploads.push(files);
  const feedback=message=>__fileFeedback.push(message);
  ${section('  function contextFor(','  function originTags(')}
  ${section('  function openSource(',"  host.addEventListener('submit'")}
  ${section('  function ownerAtFolder(','  function openSavedFile(')}
  ${dragStart}${dropAcceptance}${dropHandlers}
  globalThis.__filesRuntime={contextFor,openSource,fileRows};
})();`,context,{filename:'native-files-behavior.cjs'});
const transfer=values=>({types:Object.keys(values),files:[],values:{...values},getData(type){return this.values[type]||'';},setData(type,value){this.values[type]=value;}});
function event(type,target,dataTransfer){const value=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:120,clientY:180});Object.defineProperty(value,'dataTransfer',{value:dataTransfer});target.dispatchEvent(value);flush();return value;}
function filesIcon(){return d.querySelector('.desktop-widget[data-widget-id="files"] .desktop-widget-summary');}
function closePopup(){P.closeApplet();flush();}
try{
  const entry=w.__filesRuntime.contextFor(w.__filesItem);
  assert.equal(entry.workspace,'work');assert.equal(entry.project,'site');
  assert.equal(entry.address,'/projects/site/Reference.md','A saved source has its own actual destination path');
  assert.equal(entry.source.address,'https://example.test/reference','Its original address remains separate');
  assert.equal(entry.source.workspace,'general');assert.equal(entry.app,'browser--2');
  const rows=w.__filesRuntime.fileRows('/projects/site');
  assert(rows.some(row=>row[0]==='brief.md'&&row[3]==='/shared/brief.md'),'Native Files retains explicit linked-file paths');
  assert(rows.some(row=>row[0]==='assets'&&row[2]==='folder'),'Native Files keeps folder metadata');
  assert(rows.some(row=>row[0]==='Reference.md'),'Saved notes join the native file rows');
  const sourceCalls=[];w.createAppInstance=kind=>{sourceCalls.push(['create',kind]);return 'new-'+kind;};
  w.navigateBrowser=(...args)=>sourceCalls.push(['web',...args]);w.renderFileLocation=(...args)=>sourceCalls.push(['location',...args]);w.openAppFile=(...args)=>sourceCalls.push(['file',...args]);
  w.__filesRuntime.openSource({...w.__filesItem,source:{address:'/shared/brief.md'}});
  assert.deepEqual(sourceCalls,[['create','dolphin'],['location','new-dolphin','/shared'],['file','new-dolphin','brief.md']],'Linked sources open their actual parent folder and filename');
  sourceCalls.length=0;w.__filesRuntime.openSource(w.__filesItem);
  assert.deepEqual(sourceCalls,[['create','browser'],['web','new-browser','https://example.test/reference']]);

  const itemRow=d.createElement('article');itemRow.dataset.memoryId=w.__filesItem.id;host.append(itemRow);
  const drag=transfer({});event('dragstart',itemRow,drag);
  const dragged=JSON.parse(drag.values[w.SpatialAIContext.MIME]);
  assert.equal(drag.effectAllowed,'copy');assert.equal(dragged.project,'site');assert.equal(dragged.source.address,w.__filesItem.source.address,'File drags retain the original provenance for Assistant and Files');

  for(const mode of ['expanded','compact']){
    P.updatePanel('panel-right',{mode});P.updateWidget('files',{mode:'compact'});
    const icon=filesIcon(),saved=JSON.stringify(P.state()),source=registry.get('files').source;
    const payload=transfer({[w.SpatialAIContext.MIME]:JSON.stringify(entry),'text/plain':entry.text});
    const over=event('dragover',icon,payload);
    assert(over.defaultPrevented,'Compact Files accepts a supported source in either panel presentation');
    assert.equal(payload.dropEffect,'copy');
    const popup=d.querySelector('.panel-applet-popup[data-widget-id="files"]');
    assert(popup?.contains(host)&&popup.contains(source),'The original Files host opens in its native popup');
    assert.equal(editor.value,'Unsent Files note');note.click();
    const before=w.__fileCaptures.length;
    const drop=event('drop',icon,payload);
    assert(drop.defaultPrevented);assert.equal(drop.dataTransfer,payload,'Forwarding keeps the exact original DataTransfer');
    assert.equal(w.__fileCaptures.length,before+1,'The existing Files handler receives the drop once');
    assert.equal(w.__fileCaptures.at(-1).source.address,entry.source.address);
    assert.equal(JSON.stringify(P.state()),saved,'Dropping into a popup does not alter saved panel or widget modes');
    closePopup();assert(source.contains(host),'Closing returns the same Files host to its widget');assert.equal(editor.value,'Unsent Files note');
  }
  assert.equal(noteClicks,2,'Live Files listeners survive each popup move');
  const plain=transfer({'text/plain':'A note dropped into Files'});event('drop',filesIcon(),plain);
  assert.equal(w.__fileCaptures.at(-1).text,'A note dropped into Files');closePopup();
  const filePayload=transfer({'Files':''}),file=new w.File(['native file'],'brief.txt',{type:'text/plain'});filePayload.files=[file];
  event('drop',filesIcon(),filePayload);assert.equal(w.__fileUploads.at(-1)[0],file,'Dropped files retain their original File objects');closePopup();

  const captures=w.__fileCaptures.length;
  w.SpatialGuide.model.active=()=>true;w.SpatialGuide.model.allows=()=>false;guideBlockedWidgets.add('files');P.render();
  assert.equal(P.openApplet('files',filesIcon()),undefined);assert.equal(d.querySelector('.panel-applet-popup'),null,'Guide gates prevent an untaught Files popup');
  event('drop',filesIcon(),plain);assert.equal(w.__fileCaptures.length,captures,'Guide gates reject drops into untaught Files');
  w.SpatialGuide.model.active=()=>false;guideBlockedWidgets.delete('files');P.render();P.edit(true);
  event('drop',filesIcon(),plain);assert.equal(w.__fileCaptures.length,captures,'Layout editing never turns a drop into saved content');P.edit(false);
  d.querySelector('.desktop-shell').inert=true;event('drop',filesIcon(),plain);assert.equal(w.__fileCaptures.length,captures,'Modal desktop gates reject compact Files drops');d.querySelector('.desktop-shell').inert=false;
  const invalid=transfer({'application/unknown':'ignored'});assert.equal(event('drop',filesIcon(),invalid).defaultPrevented,false);assert.equal(w.__fileCaptures.length,captures);
  console.log('Native Files widget passed: actual source/destination paths, linked-file opening, drag provenance, live popup identity/listeners/drafts, original drop/File objects, unchanged layout and Guide/edit/modal gates.');
}finally{w.close();}
