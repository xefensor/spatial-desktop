const assert=require('node:assert/strict');
const C=require('../dist/ai-context.js');
const workspaces={general:{home:'/home/demo'},work:{home:'/home/demo/Work'}};
const projects={film:{name:'Short Film',root:'/home/demo/Projects/film'},website:{name:'Website',root:'/home/demo/Work/Projects/site'}};
const env={workspaces:()=>workspaces,projects:()=>projects};
// Scripted replies retain the actual context and stay local and workspace scoped.
{
  const D=require('../dist/ai-demo.js'),chat=C.create({},env);
  chat.add('general',{id:'brief',title:'Brief',text:'Keep navigation clear.',project:'website',workspace:'work'});
  chat.folder('general','website');
  const response=D.reply('Summarize the sources',{items:chat.session('general').items,folder:chat.workingFolder('general'),project:'Website'});
  assert(response.text.includes('Keep navigation clear.'));
  const observations=require('../dist/demo-examples.js').projects.research.note;const survey=D.reply('Summarize these observations and their limitations.',{items:[{title:'Observations',text:observations}]});for(const detail of ['Riverside A','Riverside B','Courtyard A','Courtyard B','does not establish'])assert(survey.text.includes(detail),'Short selected notes retain every plot and the stated limitation');
  assert.equal(D.reply('Summarize the attached project note',{items:chat.session('general').items}).title,'Source summary');
  const turn=chat.exchange('general','Summarize the sources',response);
  assert.equal(turn.folder,projects.website.root);assert.equal(turn.sources[0].workspace,'work');
  chat.remove('general','brief');chat.folder('general',null);
  assert.equal(turn.sources[0].title,'Brief','Changing attachments cannot rewrite old reply provenance');
  const reloaded=C.create(chat.snapshot(),env);assert.equal(reloaded.session('general').turns[0].folder,projects.website.root);
  assert.equal(reloaded.session('work').turns.length,0,'Replies stay inside their workspace');
  assert(D.reply('Compare these',{items:[]}).text.includes('Attach two sources'));
  assert(D.reply('Transcribe this audio',{items:[{title:'Voice memo',kind:'audio'}]}).text.includes('does not inspect pixels or listen to audio'));
  assert(D.reply('Delete every file',{folder:projects.website.root}).text.includes('does not send messages, change files or run commands'));
  for(let i=0;i<15;i++)chat.exchange('general','Request '+i,{title:'Reply',text:'Sample'});
  assert.equal(chat.session('general').turns.length,16,'Earlier turns are retained instead of silently dropping history');
  const old=chat.snapshot();chat.exchange('general','Newest request',{text:'Newest'});chat.load(old);
  assert.equal(chat.session('general').turns.at(-1).request,'Newest request');
  const caption=D.reply('Describe this photo',{items:[{title:'Reference photo',kind:'image',text:'A saved caption'}]});
  assert(caption.text.includes('A saved caption'));
  console.log('AI demo passed: contextual excerpts, immutable provenance, workspace isolation, reload, bounds and explicit simulation limits.');
}
const model=C.create({},env);
assert.equal(model.workingFolder('general'),workspaces.general.home,'AI works without a project');
assert.equal(model.session('general').mode,'expanded','AI opens ready for input');
const legacy=C.create({version:1,sessions:{general:{mode:'rail',draft:'Keep my request',updated:1}}},env);
assert.equal(legacy.session('general').mode,'expanded','Old default rails open fully after migration');
assert.equal(legacy.session('general').draft,'Keep my request');
legacy.mode('general','rail');
assert.equal(C.create(legacy.snapshot(),env).session('general').mode,'rail','A deliberate rail choice survives reload');
const file=model.add('general',{id:'storyboard',title:'Storyboard',kind:'image',address:projects.film.root+'/Stash/storyboard.svg',workspace:'general',app:'dolphin'});
assert.equal(file.project,'film','Folder provenance is inferred even from a workspace Dolphin');
assert.equal(model.workingFolder('general'),projects.film.root);
model.add('general',{id:'page',title:'Homepage',kind:'browser',project:'website',workspace:'work',app:'browser',address:'https://example.org/page'});
assert.equal(model.workingFolder('general'),projects.film.root,'A second project cannot silently replace the working folder');
assert.equal(model.session('general').items[1].workspace,'work','Cross-workspace source provenance is retained');
model.folder('general','website');assert.equal(model.workingFolder('general'),projects.website.root);
model.folder('general',null);assert.equal(model.workingFolder('general'),workspaces.general.home);
assert.equal(model.session('work').items.length,0,'Workspace conversations are isolated');
model.draft('general','What is relevant here?');model.mode('general','expanded');
const restored=C.create(JSON.parse(JSON.stringify(model.snapshot())),env);
assert.equal(restored.session('general').draft,'What is relevant here?');
assert.equal(restored.session('general').mode,'expanded');
assert.deepEqual(restored.session('general').items,model.session('general').items);
assert.equal(restored.session('work').draft,'');
const older=model.snapshot();restored.draft('general','Newer draft');restored.load(older);assert.equal(restored.session('general').draft,'Newer draft','Older display sync cannot overwrite new input');
const unsafe=model.normalize({workspace:'unknown',project:'unknown',address:'javascript:alert(1)',fileKey:'../../file',text:'a'.repeat(20000)},'general');
assert.equal(unsafe.workspace,'general');assert.equal(unsafe.project,null);assert.equal(unsafe.address,'');assert.equal(unsafe.fileKey,'');assert.equal(unsafe.text.length,12000);
assert.equal(model.normalize({address:projects.film.root+'-other/file'},'general').project,null,'Sibling paths do not acquire project ownership');
model.folder('general','film');delete projects.film;assert.equal(model.workingFolder('general'),workspaces.general.home,'Deleted projects fall back to workspace home');
for(let index=0;index<30;index++)model.add('work',{id:'item-'+index,title:'Item'});
assert.equal(model.session('work').items.length,24);model.remove('work','item-0');assert(model.add('work',{id:'replacement'}));
console.log('AI context passed: workspace isolation, project provenance, working folders, mixed projects, reload, display sync, safe sources and attachment bounds.');
// Run the production content gestures: native drag cannot steal the gesture,
// normal clicks survive, and canceled gestures attach nothing.
const fs=require('node:fs'),vm=require('node:vm');
const adapter=fs.readFileSync(require.resolve('../dist/ai-desktop.js'),'utf8');
// Boot the whole production Area with a legacy session. Example seeding is
// reached during startup, while clean desktops retain an empty conversation.
for(const preset of ['demo','clean']){
  const nodes=new Map();const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{dataset:{areaState:'expanded'},value:'',classList:{contains:()=>false},style:{},hidden:false,insertBefore(){},querySelector:()=>node('summary'),append(){},addEventListener(){},setAttribute(){},focus(){}});return nodes.get(selector);};
  const snapshot={version:2,sessions:{general:{items:[],workingProject:'website',draft:'Keep this draft',mode:'expanded',updated:3}}};
  const boot={SpatialAIContext:C,SpatialAIDemo:require('../dist/ai-demo.js'),SpatialStashFiles:{},readDesktopStorage:(key,fallback)=>key==='spatial-ai-context-v1'?snapshot:fallback,workspaceProfiles:{general:{label:'General',home:'/home/demo'}},projectSpaces:{website:{name:'Website Launch',root:'/website',note:'Review the page'}},SpatialDemoExamples:{projects:{website:{name:'Website Launch',root:'/website'}},assistantWorkflows:{website:require('../dist/demo-examples.js').assistantWorkflows.plasma}},activeWorkspace:'general',activeProjectName:'website',desktopPreset:preset,areaFor:()=>node('area'),$:node,$$:()=>[],desktopStorage:{getItem:()=>true,setItem(){}},queueDesktopStateBroadcast(){},escapeHtml:String,icon:()=>'',prepareControlSemantics(){},MutationObserver:class{observe(){}},document:{addEventListener(){},createElement:tag=>node(tag),body:{append(){}}},window:{innerWidth:1200,innerHeight:800,addEventListener(){}},layoutDockAreas(){}};
  vm.createContext(boot);vm.runInContext(adapter,boot);
  const session=boot.SpatialAIDesktop.snapshot().sessions.general;
  assert.equal(session.turns.length,0,'Opening examples does not fabricate completed conversations');assert.equal(session.draft,'Keep this draft');
  if(preset==='demo'){assert.match(node('#aiTranscript').innerHTML,/Review the homepage copy/);assert.match(node('#aiTranscript').innerHTML,/Convert selected files to WebP in Images\/Web/);}else assert(!node('#aiTranscript').innerHTML.includes('Review the homepage copy'),'Clean workspaces do not receive canned demo recipes');
  boot.SpatialAIDesktop.render();assert.equal(boot.SpatialAIDesktop.snapshot().sessions.general.turns.length,session.turns.length,'Rendering recipes does not write conversation history');
}
const handlers={document:{},window:{}};let over=false,highlighted=false;const added=[];
const source={closest(selector){return selector.startsWith('.app-identity')?this:null;}};
const context={document:{elementFromPoint:()=>over?'chat':{matches:()=>false},addEventListener(type,fn){(handlers.document[type]||=[]).push(fn);}},window:{addEventListener(type,fn){(handlers.window[type]||=[]).push(fn);}},withinAssistant:target=>target==='chat',area:{dataset:{},hidden:false,contains:target=>target==='chat',classList:{remove(){highlighted=false;},toggle(name,value){highlighted=value;}}},editableDropTarget:()=>false,showDropTarget:event=>{highlighted=Boolean(event);},describe:()=>({title:'Storyboard',project:'website'}),add:item=>added.push(item)};
vm.createContext(context);vm.runInContext(adapter.slice(adapter.indexOf('  function bindContentTransfers(){'),adapter.indexOf("  document.addEventListener('dragstart'")),context);
function send(surface,type,extra={}){const event={target:source,button:0,buttons:1,pointerId:1,clientX:10,clientY:10,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;},...extra};for(const fn of handlers[surface][type]||[])fn(event);return event;}
send('document','pointerdown');send('window','pointerup');assert.equal(added.length,0,'Clicking a source is not an attachment');
send('document','pointerdown');over=true;send('window','pointermove',{clientX:40});assert(highlighted);send('window','pointerup',{clientX:40});assert.equal(added.length,1);assert(!highlighted);
assert(send('document','click').prevented,'The click following a transfer does not activate the source');
send('document','pointerdown');assert(!send('document','click').prevented,'The next deliberate click works');
send('document','pointerdown');send('window','pointermove',{clientX:50});send('window','pointercancel');send('window','pointerup',{clientX:50});assert.equal(added.length,1,'Native drag/cancellation hands off without duplicate attachments');
send('document','pointerdown');send('window','pointermove',{clientX:50});send('document','keydown',{key:'Escape'});send('window','pointerup',{clientX:50});assert.equal(added.length,1,'Escape cancels');
console.log('AI content transfer passed: real production gesture path, normal clicks, threshold, drop highlight, source-click suppression, native handoff and cancellation.');

const contextual=restored.add('general',{id:'saved-context',title:'Reference',workspace:'work',project:'website',address:projects.website.root+'/Stash/Reference.md',source:{workspace:'general',project:null,app:'browser',address:'https://example.org/original'},why:'Compare with the new layout',savedAt:123});
assert.equal(contextual.source.address,'https://example.org/original');assert.equal(contextual.source.workspace,'general');
assert.equal(contextual.project,'website','AI working ownership comes from the saved destination');assert.equal(contextual.why,'Compare with the new layout');
const contextReload=C.create(restored.snapshot(),env).session('general').items.find(item=>item.id==='saved-context');
assert.deepEqual(contextReload.source,contextual.source);assert.equal(contextReload.why,contextual.why);assert.equal(contextReload.savedAt,123);
console.log('AI Stash provenance passed: saved location and original source remain distinct, including reminder and timestamp across reload.');
