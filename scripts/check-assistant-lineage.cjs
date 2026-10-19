const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const C=require('../dist/ai-context.js'),D=require('../dist/ai-demo.js');
const H=require('../dist/item-history.js');
const workspaces={general:{label:'General',home:'/home/demo'},work:{label:'Work',home:'/home/demo/Work'}};
const projects={tax:{name:'Taxes 2026',root:'/home/demo/Projects/Taxes'}};
const model=C.create({}, {workspaces:()=>workspaces,projects:()=>projects});
const original={id:'stash-view-7',fileId:'chart-file',versionId:'version-1',title:'Chart',text:'The old chart value is 10.',workspace:'general',project:'tax',source:{app:'browser',address:'https://example.org/chart',workspace:'general',project:'tax'}};
model.add('general',original);
const turn=model.exchange('general','Summarize the chart',D.reply('Summarize',{items:model.session('general').items}));
model.add('general',{...original,text:'The revised chart value is 20.',versionId:'version-2'});
original.source.address='https://example.org/changed';model.remove('general',original.id);
const saved=C.create(model.snapshot(),{workspaces:()=>workspaces,projects:()=>projects}).session('general').turns[0].sources[0];
assert.equal(saved.itemId,'chart-file');assert.equal(saved.versionId,'version-1');assert.equal(saved.text,'The old chart value is 10.');assert.equal(saved.source.address,'https://example.org/chart');
assert.equal(C.representation({address:'https://example.org'}),'Link and metadata only');
assert.equal(C.representation({kind:'image',text:'A saved caption'}),'Saved caption / text only');
assert.equal(C.representation({kind:'audio'}),'Metadata only');
assert.equal(model.normalize({...original,text:'x'.repeat(12001)},'general').contentTruncated,true);

// Exercise production attach, send, snapshot inspection, workspace dismissal,
// and reply transfer. The inspector must never substitute a current source.
const nodes=new Map(),created=[],events={},areaEvents={},windowEvents={};let captures=0;
const records=[],tracked=[],kept=[],itemHistory=H.create();
function listen(host,type,fn){(host[type]??=[]).push(fn);}
function node(key){if(!nodes.has(key))nodes.set(key,{dataset:{widgetMode:'expanded'},style:{},value:'',hidden:false,open:false,scrollTop:0,scrollHeight:100,innerHTML:'',textContent:'',listeners:{},classList:{contains:()=>false,toggle(){},remove(){}},contains:()=>false,closest:()=>null,append(){},insertBefore(){},querySelector:()=>node('summary'),setAttribute(){},getBoundingClientRect:()=>({left:500,right:800,top:60,bottom:700,width:300,height:640}),addEventListener(type,fn){this.listeners[type]=fn;},focus(){boot.document.activeElement=this;}});return nodes.get(key);}
const area=node('area');area.addEventListener=(type,fn)=>areaEvents[type]=fn;
const boot={SpatialPanels:{isWidgetExpanded:()=>true,refresh(){},showWidget(){},openApplet(){}},SpatialAIContext:C,SpatialAIDemo:D,SpatialStashFiles:{},SpatialItemHistoryDesktop:{capture(item){tracked.push(item);return {id:item.fileId,currentVersion:'version-'+(++captures)};},record(...args){records.push(args);}},SpatialTimelineDesktop:{record(...args){records.push(args);}},readDesktopStorage:(_,fallback)=>fallback,workspaceProfiles:workspaces,projectSpaces:projects,SpatialDemoExamples:{projects:{}},activeWorkspace:'general',activeProjectName:null,desktopPreset:'clean',areaFor:()=>area,$:node,$$:()=>[],desktopStorage:{getItem:()=>true,setItem(){}},queueDesktopStateBroadcast(){},escapeHtml:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),icon:()=>'',appInfo:{},prepareControlSemantics(){},MutationObserver:class{observe(){}},document:{activeElement:null,querySelector:selector=>selector==='[data-widget-source="assistant"]'?area:null,addEventListener(type,fn){listen(events,type,fn);},createElement(){const result=node('created-'+created.length);created.push(result);return result;},body:{append(){},dataset:{}}},window:{innerWidth:1200,innerHeight:800,addEventListener(type,fn){listen(windowEvents,type,fn);}},layoutDockAreas(){},scheduleWindowTiling(){},setAreaState(_name,state){area.dataset.areaState=state;},extendedDesktopActive:()=>false};
vm.createContext(boot);vm.runInContext(fs.readFileSync(require.resolve('../dist/ai-desktop.js'),'utf8'),boot);
boot.SpatialMemoryDesktop={async keepContext(...args){kept.push(args);return true;}};
boot.SpatialItemHistoryDesktop.get=id=>itemHistory.get(id);
boot.SpatialItemHistoryDesktop.capture=(item,options)=>{tracked.push(item);const before=itemHistory.get(item.fileId);return !before||options.force?itemHistory.upsert({...item,id:item.fileId,fileId:undefined,address:item.source?.address||item.address||''},options):before;};
function drop(item){return areaEvents.drop({target:area,preventDefault(){},stopPropagation(){},dataTransfer:{types:[C.MIME],getData:type=>type===C.MIME?JSON.stringify(item):'',files:[]}});}
(async()=>{
  await drop({...original,source:{app:'browser',address:'https://example.org/chart',workspace:'general',project:'tax'}});
  node('#aiPrompt').value='Summarize the chart';node('#aiComposer').listeners.submit({preventDefault(){}});
  const reply=boot.SpatialAIDesktop.snapshot().sessions.general.turns[0];
  await drop({...original,text:'The revised chart value is 20.'});
  node('#aiAttachments').listeners.click({target:{closest:selector=>selector==='[data-ai-remove]'?{dataset:{aiRemove:original.id}}:null}});
  const citation={dataset:{aiInput:'0',aiInputTurn:reply.id}};
  node('#aiTranscript').listeners.click({target:{closest:selector=>selector==='[data-ai-input]'?citation:null}});
  const panel=created.find(element=>element.className==='ai-input-panel material-surface-glass');
  assert(panel);assert.equal(panel.hidden,false);assert(panel.innerHTML.includes('The old chart value is 10.'));assert(!panel.innerHTML.includes('The revised chart value is 20.'));assert(panel.innerHTML.includes('https://example.org/chart'));
  assert.equal(tracked[0].fileId,'chart-file');assert(records.some(entry=>entry[0]==='chart-file'&&entry[1]==='use'&&entry[2].versionId===reply.sources[0].versionId));
  const output={dataset:{aiDemoTurn:reply.id}};let transfer;
  for(const handler of events.dragstart||[])handler({target:{closest:selector=>selector==='[data-ai-demo-turn]'?output:null},dataTransfer:{setData(type,value){if(type===C.MIME)transfer=JSON.parse(value);}}});
  assert.equal(transfer.derivedFrom[0].itemId,'chart-file');assert.equal(transfer.derivedFrom[0].versionId,reply.sources[0].versionId);assert.equal(transfer.derivedFrom[0].relation,'derivedFrom');assert(transfer.chatId);assert.equal(transfer.turnId,reply.id);
  const saveButton={dataset:{aiSaveOutput:reply.id},disabled:false};
  await node('#aiTranscript').listeners.click({target:{closest:selector=>selector==='[data-ai-save-output]'?saveButton:null}});
  assert.equal(kept[0][0].derivedFrom[0].versionId,reply.sources[0].versionId);assert.equal(kept[0][1],JSON.stringify(['general','tax']));
  const plain={id:'plain-note',title:'Plain note',text:'A note without any source URL.',source:{workspace:'general'},workspace:'general'};
  const before=itemHistory.upsert(plain,{workspace:'general'});
  await drop({...plain,id:'plain-note-view',itemId:'plain-note',storageScope:JSON.stringify(['general',null]),address:'/home/demo/Stash/Plain-note.md'});
  assert.equal(itemHistory.get('plain-note').currentVersion,before.currentVersion,'Attaching a Stash note cannot create a version with the virtual Stash filepath');
  assert.equal(itemHistory.get('plain-note').address,'');
  boot.activeWorkspace='work';boot.SpatialAIDesktop.render();assert.equal(panel.hidden,true,'Switching workspace dismisses the private saved-input sheet');
  node('#aiTranscript').listeners.click({target:{closest:selector=>selector==='[data-ai-input]'?citation:null}});assert.equal(panel.hidden,true,'A turn ID from another workspace cannot expose its saved inputs');
  assert.equal(boot.SpatialAIDesktop.revealChat(transfer.chatId),false,'A Timeline shortcut cannot select another workspace chat');
  console.log('Assistant lineage passed: stable source IDs, exact input versions after edit/removal/reload, honest representations, truncation, actual saved-input sheet, derived-output parents and workspace isolation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
