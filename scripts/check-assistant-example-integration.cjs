/* Independent integration coverage: run the production example module through
   the production display bridge with real file/chat/history models. The small
   UI adapters below replace only browser windows, IndexedDB and chat rendering;
   the production chat adapter's draft handling has its own check-ai-chats suite. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Home=require('../dist/home-folders.js'),Chat=require('../dist/ai-context.js'),History=require('../dist/item-history.js');
const Examples=require('../dist/display-assistant-examples.js'),Stash=require('../dist/stash-files.js');
const clone=value=>JSON.parse(JSON.stringify(value));

// Reuse the established browser-window fixture, without evaluating its tests.
// That fixture loads the real display bridge, desktop membership and tile APIs.
const shared=fs.readFileSync(path.join(__dirname,'check-display-role-desktop.cjs'),'utf8');
const boundary=shared.indexOf('// Supporting-display tools');
assert(boundary>0,'The shared display fixture must be available before its test cases');
const displayFixture=new Function('require','__dirname',shared.slice(0,boundary)+'\nreturn fixture;')(require,__dirname);

function fixture(){
  const f=displayFixture(),{c}=f,B=c.SpatialDisplayRoleBridge;
  const timers=new Map();let timerId=0;
  c.setTimeout=(run,delay)=>{const id=++timerId;timers.set(id,{run,delay});return id;};
  c.clearTimeout=id=>timers.delete(id);
  const microtasks=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
  const advance=async()=>{const entry=timers.entries().next().value;if(entry){timers.delete(entry[0]);entry[1].run();}await microtasks();return Boolean(entry);};
  async function until(predicate,label='expected progress'){
    for(let index=0;index<150;index++){await microtasks();if(predicate())return;if(!await advance())throw Error('The example stalled before '+label);}
    throw Error('The example exceeded its bounded steps before '+label);
  }
  function start(kind){
    const task={settled:false,result:null,error:null};
    task.pending=B.runAssistantExample(kind).then(result=>{task.result=result;task.settled=true;},error=>{task.error=error;task.settled=true;});
    return task;
  }
  async function complete(task,choice='simple'){
    await until(()=>task.settled||B.state().space.assistant.activity?.question,'a question or completion');
    if(!task.settled){const question=B.state().space.assistant.activity.question;const option=question.options.find(option=>option.id===choice)||question.options[0];B.answerAssistantExample(option.id,{questionId:question.id,operationId:B.state().space.assistant.context.operationId});await until(()=>task.settled,'completion after the answer');}
    await task.pending;if(task.error)throw task.error;return task.result;
  }
  c.crypto=require('node:crypto');c.SpatialDisplayAssistantExamples=Examples;
  c.workspaceDownloads=Home.create();c.refreshDownloadUi=()=>{};
  const bytes=new Map(),history=History.create();
  const chats=Chat.create({},{workspaces:()=>c.workspaceProfiles,projects:()=>c.projectSpaces});
  c.SpatialStashFiles={...Stash,put:async(key,value)=>bytes.set(key,value),get:async key=>bytes.get(key),remove:async key=>bytes.delete(key)};
  c.SpatialItemHistoryDesktop={capture:(item,at)=>history.upsert(item,at),persist:()=>true};
  c.SpatialTimelineDesktop={record(){}};
  c.SpatialAIDesktop={
    current:()=>chats.session(c.activeWorkspace),workingFolder:()=>chats.workingFolder(c.activeWorkspace),
    startExample({title,workspace,folder,items=[]}){
      assert.equal(workspace,c.activeWorkspace);
      if(chats.chats(workspace).length>=50)throw Error('Chat limit reached');
      const project=Object.keys(c.projectSpaces).find(id=>folder===c.projectSpaces[id].root+'/Assistant')||null;
      assert.equal(folder,Home.assistantFolder(c.workspaceProfiles,c.projectSpaces,workspace,project),'The production bridge chooses an ordinary scoped Assistant directory');
      const chat=chats.newChat(workspace);chats.rename(workspace,chat.id,title);chats.folder(workspace,project);
      return {workspace,chatId:chat.id,folder,items};
    },
    attach(items){return items.map(item=>{const retained=history.get(item.id)||history.upsert(item,{workspace:c.activeWorkspace});return chats.add(c.activeWorkspace,{...item,versionId:retained.currentVersion});});},
    createTurn(request,response,details){return chats.exchange(c.activeWorkspace,request,response,details);},
    updateTurn(workspace,chatId,turnId,response){if(workspace!==c.activeWorkspace||chatId!==chats.session(workspace).id)return null;return chats.reply(workspace,turnId,response,chatId);}
  };
  c.appFileRows=(id,directory)=>c.workspaceDownloads.list(directory).map(file=>[file.name,'Saved file',file.attachment?.kind||'document']);
  c.fetch=async()=>({ok:true,blob:async()=>new Blob(['retained photograph bytes'],{type:'image/jpeg'})});
  c.SpatialAssistantDesktop={proposeExampleConversion:async options=>c.SpatialAIDesktop.createTurn(options.assistantOnly?'':options.request,{title:'Convert WebP',text:'Review',assistantOnly:options.assistantOnly,action:{format:'webp',destination:options.folder,status:'review'}},{sources:options.items,folder:options.folder})};
  B.setRole(2,'side');B.setAssistantAllowed(2,true);c.localSlot=2;
  return {...f,chats,history,bytes,B,timers,microtasks,advance,until,start,complete};
}

function savedResult(chat,file,sources){
  const plan=chat.turns.find(turn=>turn.presentation==='plan');
  const question=chat.turns.find(turn=>turn.presentation==='question');
  const result=chat.turns.find(turn=>turn.presentation==='result');
  assert(plan&&!plan.assistantOnly&&plan.request,'The original request keeps a durable public plan');
  assert.equal(plan.sources.length,0,'The public plan cannot imply the source was read before opening it');
  assert(question?.assistantOnly,'The Assistant question is a separate message, not an invented user request');
  assert.equal(question.request,'');
  assert.equal(result?.assistantOnly,false,'The chosen option remains the real user reply');
  const path=file.directory+'/'+file.name;
  assert.deepEqual(clone(result.outputs),[{path,title:file.name,kind:'note'}],'The handoff links the exact saved file instead of publishing another copy of its text');
  assert(!result.text.includes(file.content),'The chat handoff does not repeat the complete editable document');
  assert.equal(result.folder,file.directory);
  for(const [index,source] of sources.entries()){
    assert.equal(question.sources[index].text,source.content);
    assert.equal(result.sources[index].text,source.content);
    assert.equal(result.sources[index].itemId,source.itemId);
    assert.equal(result.sources[index].versionId,question.sources[index].versionId,'The answer uses the exact source version shown with the question');
    assert(result.sources[index].versionId);
  }
  return {plan,question,result};
}

(async()=>{
  {
    const f=fixture(),{c,B,chats,history,notes,boundNotes,created,openedFiles,start,complete,until,advance}=f,originalId=chats.session('work').id;
    chats.draft('work','An existing unsent request');
    chats.add('work',{id:'existing-source',workspace:'work',title:'Existing source',text:'Existing source content'});
    const previous=clone(chats.session('work'));
    c.workspaceDownloads.add('/Work/Assistant','EXAMPLE LAUNCH BRIEF.md',{workspace:'work',content:'Keep the original content'});
    const task=start('checklist');
    await f.microtasks();
    assert.equal(task.settled,false,'Starting an example exposes work before it finishes');
    assert.equal(c.workspaceDownloads.list('/Work/Assistant').length,1,'The first paced step does not instantly publish all files');
    const first=clone(B.state().space.assistant.activity);
    assert(first?.label,'The Assistant exposes a useful current action');
    await until(()=>Boolean(B.state().space.assistant.activity?.question),'the checklist question');
    const waiting=clone(B.state().space.assistant),beforeAnswer=clone(c.workspaceDownloads.snapshot()),openBefore=clone(notes),turnsBefore=clone(chats.session('work').turns);
    assert.equal(waiting.status,'needs-you');
    assert(waiting.activity.entries.length>=2,'Completed distinct steps remain visible');
    assert.notEqual(waiting.activity.label,first.label);
    assert.equal(beforeAnswer.files.filter(file=>file.name!=='EXAMPLE LAUNCH BRIEF.md').length,1,'Only the actual source is written before choosing the output structure');
    const initialPlan=clone(chats.session('work').turns.find(turn=>turn.presentation==='plan'));
    assert(initialPlan,'The plan is already in the conversation before the user answers');
    assert.equal(Object.keys(notes).length,0,'The source opens in the read-only file preview, not a detached editable Note');
    assert.equal(created.filter(window=>window.kind==='dolphin').length,1);
    assert.equal(openedFiles.at(-1).name,'Example launch brief (2).md');
    chats.draft('work','Keep this draft while the example finishes');
    for(let i=0;i<4;i++)await advance();
    assert.deepEqual(clone(c.workspaceDownloads.snapshot()),beforeAnswer,'Waiting for an answer cannot publish an output');
    assert.deepEqual(clone(notes),openBefore);assert.deepEqual(clone(chats.session('work').turns),turnsBefore);
    const result=await complete(task,'simple');
    assert.equal(result.status,'done');assert.deepEqual(clone(chats.session('work',originalId)),previous);
    const files=c.workspaceDownloads.list('/Work/Assistant');
    assert.equal(files.find(file=>file.name==='EXAMPLE LAUNCH BRIEF.md').content,'Keep the original content');
    const input=files.find(file=>file.name==='Example launch brief (2).md'),output=files.find(file=>file.name==='Example launch checklist.md');
    assert(input,'A case-insensitive name collision creates a separate sample source');
    assert.equal(output.content,Examples.checklistFromBrief(input.content),'Saved output is computed from the actual saved input');
    assert.equal(history.get(output.itemId).relations[0].itemId,input.itemId);assert(history.get(output.itemId).relations[0].versionId);
    assert(chats.session('work').turns.some(turn=>turn.sources.some(source=>source.text===input.content)));
    assert(Object.values(notes).some(note=>note.text===output.content),'An actual helper Note contains the same computed checklist');
    const handoff=savedResult(chats.session('work'),output,[input]);
    assert.deepEqual(clone(handoff.plan),initialPlan,'The question and result do not overwrite the original public plan');
    assert.equal(chats.session('work').draft,'Keep this draft while the example finishes','Scripted steps preserve an unsent request in the running chat');
    assert.equal(created.filter(window=>window.kind==='notes').length,1,'The final document is the only editable Note');
    assert.equal(Object.values(boundNotes).filter(note=>note.path===output.directory+'/'+output.name&&note.itemId===output.itemId).length,1,'The result editor is bound to the exact saved Markdown identity');
    assert(chats.session('work').turns.some(turn=>/simple|straight|list/i.test(turn.request)),'The real user answer remains in the conversation');
    for(const id of result.outputs)assert(c.isLocalApp(id),'Every result window belongs to the assigned helper');
    assert.equal(c.appState.browser,'open');assert.equal(c.isLocalApp('browser'),false,'The main window is neither moved nor controlled');
    const editor=Object.keys(boundNotes).find(id=>boundNotes[id].path===output.directory+'/'+output.name),windowCount=created.length;
    c.minimizeApp(editor);
    assert.equal(B.openReference({kind:'file',path:output.directory+'/'+output.name}),editor,'Opening the saved handoff restores its bound local editor');
    assert.equal(c.appState[editor],'open');assert.equal(created.length,windowCount,'Reopening the result cannot create a detached duplicate');
    const unrelated=c.createAppInstance('browser');
    await complete(start('checklist'),'grouped');
    for(const id of result.outputs)assert.equal(c.appState[id],'minimized','Starting another example parks only the preceding task windows');
    assert.equal(c.appState[unrelated],'open','An unrelated helper window stays open when another example starts');
    const repeated=c.workspaceDownloads.list('/Work/Assistant');
    assert.equal(repeated.find(file=>file.name===output.name).content,output.content);
    const grouped=repeated.find(file=>file.name==='Example launch checklist (2).md');assert(grouped);
    assert.notEqual(grouped.content,output.content,'The answer changes the actual saved result');
    for(const item of input.content.split('\n').filter(line=>line.startsWith('- ')))assert(grouped.content.includes(item.slice(2)),'Grouping keeps each source deliverable');
  }
  {
    const {c,start,complete,chats,history,notes,boundNotes,created,openedFiles}=fixture(),result=await complete(start('compare'),'full');
    assert.equal(result.status,'done');const files=c.workspaceDownloads.list('/Work/Assistant');
    const before=files.find(file=>file.name==='Example release notes before.md'),after=files.find(file=>file.name==='Example release notes after.md'),report=files.find(file=>file.name==='Example release comparison.md');
    assert.equal(report.content,Examples.comparisonText(Examples.compareLines(before.content,after.content)));
    assert.equal(history.get(report.itemId).relations.length,2);assert(history.get(report.itemId).relations.every(parent=>parent.versionId));
    assert(Object.values(notes).some(note=>note.text===report.content));assert(chats.session('work').turns.some(turn=>turn.sources.length===2));
    savedResult(chats.session('work'),report,[before,after]);
    assert.equal(created.filter(window=>window.kind==='dolphin').length,1,'Comparing versions reuses one read-only source window');
    assert.deepEqual(openedFiles.map(file=>file.name),[before.name,after.name]);
    assert.equal(new Set(openedFiles.map(file=>file.id)).size,1,'Both supplied versions can be reviewed in the same File Browser');
    assert.equal(created.filter(window=>window.kind==='notes').length,1);
    assert.equal(Object.values(boundNotes).filter(note=>note.path===report.directory+'/'+report.name&&note.itemId===report.itemId).length,1);
    await complete(start('compare'),'additions');
    const additions=c.workspaceDownloads.list('/Work/Assistant').find(file=>file.name==='Example release comparison (2).md');
    assert.notEqual(additions.content,report.content,'The comparison answer controls the saved report');
    assert(!additions.content.includes('## Removed from the first version'));
  }
  {
    const {c,start,complete,boundNotes}=fixture(),result=await complete(start('checklist'),'simple');
    const editor=Object.keys(boundNotes)[0],source=result.outputs.find(id=>id!==editor);
    c.transferAppToDisplay(editor,1);
    assert.equal(c.isLocalApp(editor),false);
    await complete(start('compare'),'full');
    assert.equal(c.appState[editor],'open','A previous result explicitly moved back to Main is not parked by a new helper task');
    assert.equal(c.isLocalApp(editor),false,'Starting a task does not reclaim a moved result window');
    assert.equal(c.appState[source],'minimized','The remaining previous task source is parked on its original helper');
  }
  {
    const {c,B,start,until,complete,chats,history}=fixture(),task=start('checklist');
    await until(()=>Boolean(B.state().space.assistant.activity?.question),'a retained source before a user edit');
    const source=c.workspaceDownloads.list('/Work/Assistant')[0],snapshot=clone(chats.session('work').items[0]),question=clone(chats.session('work').turns.find(turn=>turn.presentation==='question'));
    B.assistantControl('takeover');
    c.workspaceDownloads.update(source.directory,source.name,{content:'# Later source edit\n\n- A different task added after capture.\n'});
    history.upsert({...snapshot,text:'# Later source edit\n\n- A different task added after capture.\n'},{workspace:'work',force:true,action:'edit'});
    assert.notEqual(history.get(source.itemId).currentVersion,snapshot.versionId,'The original can acquire a later version while Assistant waits');
    B.assistantControl('resume');await complete(task,'simple');
    const output=c.workspaceDownloads.list('/Work/Assistant').find(file=>file.name==='Example launch checklist.md');
    assert.equal(output.content,Examples.checklistFromBrief(snapshot.text),'The result uses the attached source snapshot, not later source edits');
    assert.equal(history.get(output.itemId).relations[0].versionId,snapshot.versionId);
    const result=chats.session('work').turns.find(turn=>turn.presentation==='result');
    assert.deepEqual(clone(result.sources),question.sources,'The final result retains the exact question inputs and version identities');
    assert.equal(c.workspaceDownloads.list(source.directory).find(file=>file.name===source.name).content,'# Later source edit\n\n- A different task added after capture.\n','Assistant never rewrites the user\'s later source edit');
  }
  {
    const {c,B,chats,start,complete}=fixture();
    c.projectSpaces.site={name:'Site',root:'/Work/Projects/Site'};
    c.projectSpaces.other={name:'Other',root:'/Work/Projects/Other'};
    c.openProjectNames=()=>['site','other'];
    chats.folder('work','site');
    const task=start('checklist');
    c.desktopPages.select('work','other');
    const result=await complete(task,'simple');
    assert.equal(result.status,'done');assert.equal(chats.session('work').workingProject,'site');
    assert.equal(chats.workingFolder('work'),'/Work/Projects/Site/Assistant');
    assert(c.workspaceDownloads.list('/Work/Projects/Site/Assistant').length===2,'The task retains its chat Project despite a main-desktop Project switch');
    assert.equal(c.workspaceDownloads.list('/Work/Projects/Other/Assistant').length,0);
    assert.equal(c.workspaceDownloads.list('/Work/Assistant').length,0);
    assert(c.workspaceDownloads.snapshot().files.every(file=>file.project==='site'));
    assert.equal(B.state().space.assistant.context.folder,'/Work/Projects/Site/Assistant');
    const saved=c.workspaceDownloads.snapshot(),reloaded=Home.create(saved);
    assert.deepEqual(reloaded.list('/Work/Projects/Site/Assistant'),c.workspaceDownloads.list('/Work/Projects/Site/Assistant'),'Assistant results are ordinary persisted folder files');
  }
  {
    const {c,start,complete,chats,bytes,created}=fixture(),result=await complete(start('image'));
    assert.equal(result.status,'needs-you');const input=c.workspaceDownloads.list('/Work/Assistant')[0];
    assert.equal(await bytes.get(input.attachment.key).text(),'retained photograph bytes');
    const turn=chats.session('work').turns.find(turn=>turn.action);
    assert.equal(turn.sources[0].attachment.key,input.attachment.key);
    assert.equal(turn.action.status,'review','Image example proposes a conversion instead of inventing a completed output');
    assert.equal(c.workspaceDownloads.list('/Work/Assistant').length,1,'Only the original exists until the user runs conversion');
    const plan=chats.session('work').turns.find(turn=>turn.presentation==='plan');
    assert(plan&&plan.request&&plan.text,'Image conversion keeps the initial request and plan visible');
    assert(turn.assistantOnly,'The conversion review does not repeat the same invented user request');
    assert.equal(created.filter(window=>window.kind==='dolphin').length,1);assert.equal(created.filter(window=>window.kind==='notes').length,0);
  }
  {
    const {c,B,start,complete,chats}=fixture();await complete(start('image'));
    const review=clone(B.state().space.assistant),files=clone(c.workspaceDownloads.snapshot()),chat=clone(chats.session('work'));
    B.setAssistantAllowed(2,false);assert.equal(B.state().space.assistant.status,'paused');
    B.setAssistantAllowed(2,true);assert.equal(B.state().space.assistant.status,'needs-you','Reallowing a finished example restores its pending image review without Continue');
    assert.equal(B.state().space.assistant.control,'assistant');assert.deepEqual(clone(B.state().space.assistant.activity),review.activity);assert.deepEqual(clone(B.state().space.assistant.context),review.context);
    assert.deepEqual(clone(c.workspaceDownloads.snapshot()),files);assert.deepEqual(clone(chats.session('work')),chat,'Review permission changes never replay the example or duplicate its input');
    // The same restoration must work when permission is changed from Main.
    const remoteOff=clone(c.captureDesktopSyncState());remoteOff.displayRoles.workspaces.work.displays[2].assistant.allowed=false;remoteOff.displayRoles.workspaces.work.displays[2].assistant.revision++;
    c.applyDesktopSyncState(remoteOff);assert.equal(B.state().space.assistant.status,'paused');
    const remoteOn=clone(c.captureDesktopSyncState());remoteOn.displayRoles.workspaces.work.displays[2].assistant.allowed=true;remoteOn.displayRoles.workspaces.work.displays[2].assistant.revision++;
    c.applyDesktopSyncState(remoteOn);assert.equal(B.state().space.assistant.status,'needs-you','Remote regrant also restores the pending review');
    for(const [action,status,stage] of [['complete','done','complete'],['failed','error','error'],['cancelled','idle','stopped']]){
      B.setAssistantAllowed(2,false);
      assert.equal(B.assistantExampleConversionUpdate({workspace:'work',chatId:review.context.chatId,turnId:review.context.turnId,action:{status:action,destination:'/Work/Assistant',outputs:action==='complete'?[{path:'/Work/Assistant/photo.webp'}]:[],error:'Example failure'}}),true);
      assert.equal(B.state().space.assistant.status,'paused');assert.equal(B.state().space.assistant.activity.stage,stage);
      B.setAssistantAllowed(2,true);assert.equal(B.state().space.assistant.status,status,'Regrant restores '+action+' rather than an unnecessary Continue prompt');
      assert.equal(B.state().space.assistant.control,'assistant');
    }
    B.assistantControl('takeover');B.setAssistantAllowed(2,false);B.setAssistantAllowed(2,true);
    assert.equal(B.state().space.assistant.control,'user');assert.equal(B.state().space.assistant.status,'paused','A distinct user Take over still requires Continue');
  }
  // Revoking monitor permission pauses this same live job. It is distinct
  // from Take over, role changes, reloads and cancellation.
  {
    const {c,B,start,complete,until,advance,created,chats}=fixture(),task=start('checklist');
    await until(()=>Boolean(B.state().space.assistant.activity?.question),'a question before revoking permission');
    const waiting=clone(B.state().space.assistant),files=clone(c.workspaceDownloads.snapshot()),windows=created.length,conversation=clone(chats.session('work'));
    const answer={questionId:waiting.activity.question.id,operationId:waiting.context.operationId};
    B.setAssistantAllowed(2,false);
    const off=clone(B.state().space.assistant);assert.equal(off.allowed,false);assert.equal(off.status,'paused');assert.equal(off.control,'assistant');
    assert.deepEqual(off.context,waiting.context);assert.deepEqual(off.activity,waiting.activity,'Permission off retains the exact pending question');
    assert.equal(B.state().role,'side');assert.equal(B.state().displays[1].assistantAllowed,false);
    assert.throws(()=>B.answerAssistantExample('simple',answer),/current question/);
    assert.throws(()=>B.assistantControl('resume'),/Allow Assistant/);
    await assert.rejects(complete(start('compare')),/Allow Assistant/);
    for(let i=0;i<4;i++)await advance();
    assert.equal(task.settled,false);assert.deepEqual(clone(c.workspaceDownloads.snapshot()),files);assert.equal(created.length,windows);assert.deepEqual(clone(chats.session('work')),conversation,'Revoking permission cannot edit the conversation or create files');
    B.setAssistantAllowed(2,true);assert.equal(B.state().space.assistant.status,'needs-you');
    assert.equal(B.state().space.assistant.context.operationId,waiting.context.operationId);
    const result=await complete(task,'grouped');assert.equal(result.status,'done');assert.equal(c.workspaceDownloads.list('/Work/Assistant').length,2);
  }
  {
    const {c,B,start,complete,advance,microtasks}=fixture(),task=start('checklist');
    await microtasks();const operation=B.state().space.assistant.context.operationId;B.setAssistantAllowed(2,false);
    for(let i=0;i<5;i++)await advance();
    assert.equal(c.workspaceDownloads.snapshot().files.length,0,'An expired timed step cannot publish while permission is off');assert.equal(task.settled,false);
    B.setAssistantAllowed(2,true);assert.equal(B.state().space.assistant.context.operationId,operation);await complete(task,'simple');
  }
  {
    const {c,B,bytes,start,until,advance,complete}=fixture();let release;
    c.SpatialStashFiles.put=(key,blob)=>new Promise(resolve=>{release=()=>{bytes.set(key,blob);resolve();};});
    const task=start('image');await until(()=>Boolean(release),'retention before permission revocation');
    B.setAssistantAllowed(2,false);release();for(let i=0;i<4;i++)await advance();
    assert.equal(c.workspaceDownloads.snapshot().files.length,0,'Late I/O cannot publish a file after permission is revoked');assert.equal(task.settled,false);
    B.setAssistantAllowed(2,true);assert.equal((await complete(task)).status,'needs-you');assert.equal(c.workspaceDownloads.list('/Work/Assistant').length,1);assert.equal(bytes.size,1);
  }
  {
    const {c,B,start,complete,until,advance}=fixture(),task=start('checklist');
    await until(()=>Boolean(B.state().space.assistant.activity?.question),'question before remote permission edits');
    const waiting=clone(B.state().space.assistant),stale=clone(c.captureDesktopSyncState()),revoked=clone(stale);
    // The main display may know only older task metadata. Its newer permission
    // change is accepted without replacing the owner's operation or question.
    revoked.displayRoles.workspaces.work.displays[2].assistant={allowed:false,revision:waiting.revision+1,status:'idle',activity:null,context:null};
    c.applyDesktopSyncState(revoked);
    assert.equal(B.state().space.assistant.allowed,false);assert.equal(B.state().space.assistant.status,'paused');assert.deepEqual(clone(B.state().space.assistant.activity),waiting.activity);assert.deepEqual(clone(B.state().space.assistant.context),waiting.context);
    c.applyDesktopSyncState(stale);assert.equal(B.state().space.assistant.allowed,false,'A stale whole-desktop echo cannot restore revoked permission');
    for(let i=0;i<3;i++)await advance();assert.equal(task.settled,false);
    const resumed=clone(stale);resumed.displayRoles.workspaces.work.displays[2].assistant={allowed:true,revision:B.state().space.assistant.revision+1,status:'idle',activity:null,context:null};
    c.applyDesktopSyncState(resumed);assert.equal(B.state().space.assistant.allowed,true);assert.equal(B.state().space.assistant.status,'needs-you');await complete(task,'simple');
  }
  {
    const {B,start,until,advance,complete}=fixture(),task=start('checklist');
    await until(()=>Boolean(B.state().space.assistant.activity?.question),'question before separate user takeover');
    B.assistantControl('takeover');B.setAssistantAllowed(2,false);B.setAssistantAllowed(2,true);
    assert.equal(B.state().space.assistant.control,'user');assert.equal(B.state().space.assistant.status,'paused','Turning permission back on does not clear Take over');
    for(let i=0;i<3;i++)await advance();assert.equal(task.settled,false);B.assistantControl('resume');await complete(task,'simple');
  }
  {
    const {B,start,until,complete}=fixture(),task=start('checklist');
    await until(()=>Boolean(B.state().space.assistant.activity?.question),'question before cancelling with permission off');
    B.setAssistantAllowed(2,false);assert.equal(B.stopAssistantExample(),true,'Stop remains an explicit user cancellation even with permission off');
    await complete(task);assert.equal(B.state().space.assistant.allowed,false);assert.equal(B.state().space.assistant.activity.stage,'stopped');assert.equal(B.state().space.assistant.activity.question,null);
  }
  for(const change of ['chat','workspace','role','setup','stop']){
    const {c,B,chats,bytes,created,start,until,advance}=fixture(),task=start('checklist');
    await until(()=>Boolean(B.state().space.assistant.activity?.question),'a cancellable question');
    const current=clone(B.state().space.assistant),saved=clone(c.workspaceDownloads.snapshot()),windows=created.length;
    const answer={questionId:current.activity.question.id,operationId:current.context.operationId};
    if(change==='chat')chats.newChat('work');
    if(change==='workspace')c.activeWorkspace='gaming';
    if(change==='role')B.setRole(2,'extended');
    if(change==='setup')c.roster.push({slot:3,source:'new-display',width:1440,height:900});
    if(change==='stop')B.stopAssistantExample();
    c.SpatialDisplayRoleDesktop.refresh();
    assert.throws(()=>B.answerAssistantExample('simple',answer),/no longer active|current question/,'A stale '+change+' answer cannot resume the task');
    for(let i=0;i<8&&!task.settled;i++)await advance();
    assert.equal(task.settled,true,'A '+change+' cancels the waiting runner');
    assert.deepEqual(clone(c.workspaceDownloads.snapshot()),saved,'A '+change+' prevents late file mutations');
    assert.equal(created.length,windows);assert.equal(bytes.size,0);
    if(change==='workspace')assert.equal(B.state().space.assistant.task,'','The new Workspace receives no old task state');
  }
  {
    const {c,B,start,complete,until,advance}=fixture(),task=start('checklist');
    await until(()=>Boolean(B.state().space.assistant.activity?.question),'a question before takeover');
    const state=clone(B.state().space.assistant),saved=clone(c.workspaceDownloads.snapshot()),beforeTakeover=clone(c.captureDesktopSyncState());
    B.assistantControl('takeover');c.applyDesktopSyncState(beforeTakeover);
    assert.equal(B.state().space.assistant.control,'user','A linked-display echo cannot undo the local Take over');
    assert.throws(()=>B.answerAssistantExample('simple',{questionId:state.activity.question.id,operationId:state.context.operationId}),/current question/);
    for(let i=0;i<4;i++)await advance();
    assert.equal(task.settled,false,'Take over pauses rather than replays the running workflow');
    assert.deepEqual(clone(c.workspaceDownloads.snapshot()),saved);
    B.assistantControl('resume');
    const result=await complete(task,'simple');assert.equal(result.status,'done');
    assert.equal(c.workspaceDownloads.list('/Work/Assistant').length,2,'Continue resumes the same task without duplicating its source');
  }
  {
    const {c,B,start,complete,advance,microtasks}=fixture(),task=start('checklist');
    await microtasks();B.assistantControl('takeover');
    for(let i=0;i<5;i++)await advance();
    assert.equal(c.workspaceDownloads.snapshot().files.length,0,'A paused timed step cannot publish its source');
    assert.equal(task.settled,false);
    await assert.rejects(complete(start('compare')),/control this display|already working/,'A pending paused runner cannot be replaced accidentally');
    B.assistantControl('resume');await complete(task,'simple');
    assert.equal(c.workspaceDownloads.list('/Work/Assistant').length,2);
  }
  {
    const {c,B,bytes,start,until,advance,complete}=fixture();let release;
    c.SpatialStashFiles.put=(key,blob)=>new Promise(resolve=>{release=()=>{bytes.set(key,blob);resolve();};});
    const task=start('image');await until(()=>Boolean(release),'retention before takeover');
    B.assistantControl('takeover');release();for(let i=0;i<4;i++)await advance();
    assert.equal(c.workspaceDownloads.snapshot().files.length,0,'A retained byte write resolving during Take over cannot publish file metadata');
    assert.equal(task.settled,false);B.assistantControl('resume');
    const result=await complete(task);assert.equal(result.status,'needs-you');
    assert.equal(c.workspaceDownloads.list('/Work/Assistant').length,1,'Continue publishes the same original once');
    assert.equal(bytes.size,1);
  }
  for(const change of ['chat','workspace','role','setup','stop']){
    const {c,B,chats,bytes,start,until,complete}=fixture();let release;
    c.fetch=()=>new Promise(resolve=>{release=resolve;});
    const task=start('image');await until(()=>Boolean(release),'image loading');
    const selected=chats.session('work').id,saved=clone(c.workspaceDownloads.snapshot());
    if(change==='chat')chats.newChat('work');
    if(change==='workspace')c.activeWorkspace='gaming';
    if(change==='role')B.setRole(2,'extended');
    if(change==='setup')c.roster.push({slot:3,source:'new-display',width:1440,height:900});
    if(change==='stop')B.stopAssistantExample();
    c.SpatialDisplayRoleDesktop.refresh();
    const selectedAfter=chats.session('work').id;
    release({ok:true,blob:async()=>new Blob(['not published'],{type:'image/jpeg'})});
    await complete(task);
    assert.equal(chats.session('work').id,selectedAfter,'Late '+change+' image loading preserves the selected conversation');
    assert.deepEqual(clone(c.workspaceDownloads.snapshot()),saved);assert.equal(bytes.size,0);
    if(change!=='chat')assert.equal(selectedAfter,selected);
  }
  {
    const {c,B,bytes,start,until,complete}=fixture();let release;
    c.SpatialStashFiles.put=(key,blob)=>new Promise(resolve=>{release=()=>{bytes.set(key,blob);resolve();};});
    const task=start('image');await until(()=>Boolean(release),'image retention');B.stopAssistantExample();release();
    await complete(task);
    assert.equal(c.workspaceDownloads.snapshot().files.length,0);assert.equal(bytes.size,0,'Only the example\'s newly retained unpublished key is removed');
  }
  {
    const {c,B,bytes,start,until,complete}=fixture();let release;
    c.fetch=()=>new Promise(resolve=>{release=resolve;});
    const task=start('image');await until(()=>Boolean(release),'old image loading');
    B.stopAssistantExample();
    const replacement=start('checklist');await complete(replacement,'simple');
    const completed=clone(B.state().space.assistant),saved=clone(c.workspaceDownloads.snapshot());
    release({ok:true,blob:async()=>new Blob(['stale request'],{type:'image/jpeg'})});
    await complete(task);
    assert.deepEqual(clone(B.state().space.assistant),completed,'A stopped old task cannot replace a newer result');
    assert.deepEqual(clone(c.workspaceDownloads.snapshot()),saved);assert.equal(bytes.size,0);
  }
  {
    const {c,B,start,until,complete,bytes}=fixture();let release;
    c.fetch=()=>new Promise(resolve=>{release=resolve;});
    const task=start('image');await until(()=>Boolean(release),'image load before a stale sync');
    const stale=clone(c.captureDesktopSyncState());
    B.stopAssistantExample();
    const stopped=clone(B.state().space.assistant),saved=clone(c.workspaceDownloads.snapshot());
    c.applyDesktopSyncState(stale);
    assert(!['working','needs-you'].includes(B.state().space.assistant.status),'An old linked-display packet cannot revive a stopped local job');
    assert.equal(B.state().space.assistant.activity.question,null);
    release({ok:true,blob:async()=>new Blob(['stopped byte request'],{type:'image/jpeg'})});
    await complete(task);
    assert.deepEqual(clone(c.workspaceDownloads.snapshot()),saved);assert.equal(bytes.size,0);
    assert.equal(B.state().space.assistant.activity.stage,'stopped','Late I/O cannot turn Stop into a stale error or running task');
    const fresh=await complete(start('checklist'),'simple');assert.equal(fresh.status,'done','A cancelled closure does not block a new task');
  }
  {
    const {c,B,start,until,complete}=fixture();let release;
    c.fetch=()=>new Promise(resolve=>{release=resolve;});
    const old=start('image');await until(()=>Boolean(release),'old image before replacement');
    const stale=clone(c.captureDesktopSyncState());B.stopAssistantExample();
    const fresh=start('checklist');await until(()=>Boolean(B.state().space.assistant.activity?.question),'replacement question');
    const waiting=clone(B.state().space.assistant),saved=clone(c.workspaceDownloads.snapshot());
    c.applyDesktopSyncState(stale);
    assert.equal(B.state().space.assistant.context.operationId,waiting.context.operationId,'A main-display echo of an older task preserves the current helper-owned task');
    assert.equal(B.state().space.assistant.activity.question.id,waiting.activity.question.id);
    assert.deepEqual(clone(c.workspaceDownloads.snapshot()),saved);
    release({ok:true,blob:async()=>new Blob(['retired task'],{type:'image/jpeg'})});await complete(old);
    await complete(fresh,'grouped');assert.equal(B.state().space.assistant.status,'done');
  }
  {
    const {c,B,start,until,complete}=fixture(),task=start('checklist');
    await until(()=>Boolean(B.state().space.assistant.activity?.question),'question before completion');
    const oldQuestion=clone(c.captureDesktopSyncState());await complete(task,'grouped');
    const completed=clone(B.state().space.assistant);
    c.applyDesktopSyncState(oldQuestion);
    assert.deepEqual(clone(B.state().space.assistant),completed,'An old question echoed after completion cannot replace a completed result');
    assert.throws(()=>B.answerAssistantExample('simple',{questionId:oldQuestion.displayRoles.workspaces.work.displays[2].assistant.activity.question.id,operationId:completed.context.operationId}),/no longer active|current question/);
  }
  {
    const {c,B,start,complete}=fixture(),beforeJob=clone(c.captureDesktopSyncState());
    await complete(start('checklist'),'simple');const completed=clone(B.state().space.assistant);
    c.applyDesktopSyncState(beforeJob);
    assert.deepEqual(clone(B.state().space.assistant),completed,'An idle snapshot captured before the job cannot erase the latest completed local result');
  }
  {
    const {c,B,start,complete}=fixture();await complete(start('checklist'),'simple');
    const completed=clone(B.state().space.assistant),stale=clone(c.captureDesktopSyncState()),off=clone(stale);
    off.displayRoles.workspaces.work.displays[2].assistant.allowed=false;off.displayRoles.workspaces.work.displays[2].assistant.revision=completed.revision+1;
    c.applyDesktopSyncState(off);assert.equal(B.state().space.assistant.allowed,false,'A newer remote permission toggle works after completion too');
    assert.equal(B.state().space.assistant.result,completed.result);assert.deepEqual(clone(B.state().space.assistant.outputs),completed.outputs);
    c.applyDesktopSyncState(stale);assert.equal(B.state().space.assistant.allowed,false,'A completed job tombstone also rejects stale permission echoes');
  }
  {
    const {c,B,start,until,complete}=fixture(),task=start('checklist');
    await until(()=>Boolean(B.state().space.assistant.activity?.question),'question before remote role change');
    const side=clone(c.captureDesktopSyncState()),setup=B.state().setupKey;
    side.displayRoles.setups[setup].roles[2]='extended';c.applyDesktopSyncState(side);
    assert.equal(B.state().role,'extended','Protecting local task metadata still accepts the main display role change');
    await complete(task);assert.equal(B.state().space.assistant.activity.question,null);
    assert.equal(B.state().space.assistant.activity.stage,'interrupted');
    const assistant=clone(side);assistant.displayRoles.setups[setup].roles[2]='side';c.applyDesktopSyncState(assistant);
    assert.equal(B.state().role,'side');assert.equal(B.state().space.assistant.activity.question,null,'Switching back cannot revive the interrupted remote question');
    assert.equal((await complete(start('checklist'),'simple')).status,'done','The new role can start a fresh task after interruption');
  }
  {
    const owner=fixture(),task=owner.start('checklist');
    await owner.until(()=>Boolean(owner.B.state().space.assistant.activity?.question),'owner question before reload');
    const packet=clone(owner.c.captureDesktopSyncState()),fresh=fixture();
    fresh.c.localSlot=1;fresh.c.applyDesktopSyncState(packet);
    const echoed=fresh.c.captureDesktopSyncState().displayRoles.workspaces.work.displays[2].assistant;
    assert.equal(echoed.activity.stage,'question','The main display must not falsely interrupt a helper-owned workflow');
    fresh.c.localSlot=2;fresh.c.SpatialDisplayRoleDesktop.refresh();
    assert.equal(fresh.B.state().space.assistant.activity.stage,'interrupted','A newly loaded helper cannot resume a persisted task from another page');
    assert.equal(fresh.B.state().space.assistant.activity.question,null);
    assert(!['working','needs-you'].includes(fresh.B.state().space.assistant.status));
    owner.B.stopAssistantExample();await owner.complete(task);
  }
  {
    const {c,start,complete,chats,bytes}=fixture();
    while(chats.chats('work').length<50)chats.newChat('work');
    const before=clone(chats.snapshot());
    await assert.rejects(complete(start('image')),/Chat limit/);
    assert.deepEqual(clone(chats.snapshot()),before);assert.equal(c.workspaceDownloads.snapshot().files.length,0);assert.equal(bytes.size,0);
  }
  {
    const {c,start,complete,history}=fixture(),set=c.desktopStorage.setItem;
    c.desktopStorage.setItem=(key,value)=>{if(key==='spatial-downloads-v1')throw Error('Quota exceeded');return set(key,value);};
    await assert.rejects(complete(start('checklist')),/could not be saved/);
    assert.equal(c.workspaceDownloads.snapshot().files.length,0,'A synchronous storage failure leaves no phantom file');
    assert.equal(history.list('work').length,0,'A rejected file publication does not create phantom history');
  }
  {
    const {c,B,start,complete,created}=fixture(),create=c.createAppInstance;
    c.createAppInstance=kind=>kind==='notes'?null:create(kind);
    await assert.rejects(complete(start('checklist')),/Note Editor|saved result could not open/);
    assert.equal(c.workspaceDownloads.list('/Work/Assistant').length,2,'A later window failure preserves already saved source and result files');
    assert.equal(created.length,1);assert.equal(B.state().space.assistant.status,'error');
    assert.equal(B.state().space.assistant.outputs.length,1,'The task records its actual partial window result');
  }
  {
    const {c,B,start,complete,created}=fixture();
    c.localSlot=1;await assert.rejects(complete(start('checklist')),/connected Side space/);
    c.localSlot=2;B.setAssistantAllowed(2,false);await assert.rejects(complete(start('checklist')),/Allow Assistant/);
    B.setRole(2,'side');B.setAssistantAllowed(2,true);c.SpatialAIDesktop.workingFolder=()=>'/Gaming/private';
    await assert.rejects(complete(start('checklist')),/this Workspace/);
    assert.equal(c.workspaceDownloads.snapshot().files.length,0);assert.equal(created.length,0);
  }
  console.log('Assistant example integration passed: durable plans/questions, concise saved-file handoffs, exact bound editors, read-only source reuse, captured versions after user edits, selective canvas parking, preserved drafts/collisions, byte retention, pause/stop/context safety, scoped cleanup and partial failures.');
})().catch(error=>{console.error(error);process.exitCode=1;});
