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
      const chat=chats.newChat(workspace);chats.rename(workspace,chat.id,title);chats.folder(workspace,null);
      return {workspace,chatId:chat.id,folder,items};
    },
    attach(items){return items.map(item=>{const retained=history.get(item.id)||history.upsert(item,{workspace:c.activeWorkspace});return chats.add(c.activeWorkspace,{...item,versionId:retained.currentVersion});});},
    createTurn(request,response,details){return chats.exchange(c.activeWorkspace,request,response,details);}
  };
  c.appFileRows=(id,directory)=>c.workspaceDownloads.list(directory).map(file=>[file.name,'Saved file',file.attachment?.kind||'document']);
  c.fetch=async()=>({ok:true,blob:async()=>new Blob(['retained photograph bytes'],{type:'image/jpeg'})});
  c.SpatialAssistantDesktop={proposeExampleConversion:async options=>c.SpatialAIDesktop.createTurn(options.request,{title:'Convert WebP',text:'Review',action:{format:'webp',destination:options.folder,status:'review'}},{sources:options.items,folder:options.folder})};
  B.setRole(2,'assistant');c.localSlot=2;
  return {...f,chats,history,bytes,B};
}

(async()=>{
  {
    const {c,B,chats,history,notes}=fixture(),originalId=chats.session('work').id;
    chats.draft('work','An existing unsent request');
    chats.add('work',{id:'existing-source',workspace:'work',title:'Existing source',text:'Existing source content'});
    const previous=clone(chats.session('work'));
    c.workspaceDownloads.add('/Work','EXAMPLE LAUNCH BRIEF.md',{workspace:'work',content:'Keep the original content'});
    const result=await B.runAssistantExample('checklist');
    assert.equal(result.status,'done');assert.deepEqual(clone(chats.session('work',originalId)),previous);
    const files=c.workspaceDownloads.list('/Work');
    assert.equal(files.find(file=>file.name==='EXAMPLE LAUNCH BRIEF.md').content,'Keep the original content');
    const input=files.find(file=>file.name==='Example launch brief (2).md'),output=files.find(file=>file.name==='Example launch checklist.md');
    assert(input,'A case-insensitive name collision creates a separate sample source');
    assert.equal(output.content,Examples.checklistFromBrief(input.content),'Saved output is computed from the actual saved input');
    assert.equal(history.get(output.itemId).relations[0].itemId,input.itemId);assert(history.get(output.itemId).relations[0].versionId);
    assert.equal(chats.session('work').turns[0].sources[0].text,input.content);
    assert(Object.values(notes).some(note=>note.text===output.content),'An actual helper Note contains the same computed checklist');
    assert(chats.session('work').turns[0].text.includes('/Work/'+output.name));
    for(const id of result.outputs)assert(c.isLocalApp(id),'Every result window belongs to the assigned helper');
    assert.equal(c.appState.browser,'open');assert.equal(c.isLocalApp('browser'),false,'The main window is neither moved nor controlled');
    await B.runAssistantExample('checklist');
    assert.equal(c.workspaceDownloads.list('/Work').find(file=>file.name===output.name).content,output.content);
    assert(c.workspaceDownloads.list('/Work').some(file=>file.name==='Example launch checklist (2).md'));
  }
  {
    const {c,B,chats,history,notes}=fixture(),result=await B.runAssistantExample('compare');
    assert.equal(result.status,'done');const files=c.workspaceDownloads.list('/Work');
    const before=files.find(file=>file.name==='Example release notes before.md'),after=files.find(file=>file.name==='Example release notes after.md'),report=files.find(file=>file.name==='Example release comparison.md');
    assert.equal(report.content,Examples.comparisonText(Examples.compareLines(before.content,after.content)));
    assert.equal(history.get(report.itemId).relations.length,2);assert(history.get(report.itemId).relations.every(parent=>parent.versionId));
    assert(Object.values(notes).some(note=>note.text===report.content));assert.equal(chats.session('work').turns[0].sources.length,2);
  }
  {
    const {c,B,chats,bytes}=fixture(),result=await B.runAssistantExample('image');
    assert.equal(result.status,'needs-you');const input=c.workspaceDownloads.list('/Work')[0];
    assert.equal(await bytes.get(input.attachment.key).text(),'retained photograph bytes');
    assert.equal(chats.session('work').turns[0].sources[0].attachment.key,input.attachment.key);
    assert.equal(chats.session('work').turns[0].action.status,'review','Image example proposes a conversion instead of inventing a completed output');
    assert.equal(c.workspaceDownloads.list('/Work').length,1,'Only the original exists until the user runs conversion');
  }
  for(const change of ['takeover','chat','workspace','role','setup']){
    const {c,B,chats,bytes,created}=fixture();let release;
    c.fetch=()=>new Promise(resolve=>{release=resolve;});
    const original=chats.session('work').id,pending=B.runAssistantExample('image');
    let selected=original;
    if(change==='takeover')B.assistantControl('takeover');
    if(change==='chat')selected=chats.newChat('work').id;
    if(change==='workspace')c.activeWorkspace='gaming';
    if(change==='role')B.setRole(2,'side');
    if(change==='setup')c.roster.push({slot:3,source:'new-display',width:1440,height:900});
    release({ok:true,blob:async()=>new Blob(['not published'],{type:'image/jpeg'})});
    await assert.rejects(pending,/stopped/);
    assert.equal(chats.session('work').id,selected,'A '+change+' during image loading preserves the selected conversation');
    assert.equal(c.workspaceDownloads.snapshot().files.length,0);assert.equal(bytes.size,0);assert.equal(created.length,0);
    if(change==='workspace')assert.equal(B.state().space.assistant.task,'','The new Workspace receives no old task state');
  }
  {
    const {c,B,bytes}=fixture();let release,started;
    const begun=new Promise(resolve=>{started=resolve;});
    c.SpatialStashFiles.put=(key,blob)=>new Promise(resolve=>{release=()=>{bytes.set(key,blob);resolve();};started();});
    const pending=B.runAssistantExample('image');await begun;B.assistantControl('takeover');release();
    await assert.rejects(pending,/stopped/);
    assert.equal(c.workspaceDownloads.snapshot().files.length,0);assert.equal(bytes.size,0,'Only the example\'s newly retained unpublished key is removed');
  }
  {
    const {c,B,bytes}=fixture();let release;
    c.fetch=()=>new Promise(resolve=>{release=resolve;});
    const pending=B.runAssistantExample('image');
    B.assistantControl('takeover');B.assistantControl('resume');
    await B.runAssistantExample('checklist');
    const completed=clone(B.state().space.assistant),saved=clone(c.workspaceDownloads.snapshot());
    release({ok:true,blob:async()=>new Blob(['stale request'],{type:'image/jpeg'})});
    await assert.rejects(pending,/stopped/);
    assert.deepEqual(clone(B.state().space.assistant),completed,'An old async task cannot replace the result of a newer task after Take over and Continue');
    assert.deepEqual(clone(c.workspaceDownloads.snapshot()),saved);assert.equal(bytes.size,0);
  }
  {
    const {c,B,chats,bytes}=fixture();
    while(chats.chats('work').length<50)chats.newChat('work');
    const before=clone(chats.snapshot());
    await assert.rejects(B.runAssistantExample('image'),/Chat limit/);
    assert.deepEqual(clone(chats.snapshot()),before);assert.equal(c.workspaceDownloads.snapshot().files.length,0);assert.equal(bytes.size,0);
  }
  {
    const {c,B,history}=fixture(),set=c.desktopStorage.setItem;
    c.desktopStorage.setItem=(key,value)=>{if(key==='spatial-downloads-v1')throw Error('Quota exceeded');return set(key,value);};
    await assert.rejects(B.runAssistantExample('checklist'),/could not be saved/);
    assert.equal(c.workspaceDownloads.snapshot().files.length,0,'A synchronous storage failure leaves no phantom file');
    assert.equal(history.list('work').length,0,'A rejected file publication does not create phantom history');
  }
  {
    const {c,B,created}=fixture(),create=c.createAppInstance;let notes=0;
    c.createAppInstance=kind=>kind==='notes'&&++notes===2?null:create(kind);
    await assert.rejects(B.runAssistantExample('checklist'),/Note Editor could not open/);
    assert.equal(c.workspaceDownloads.list('/Work').length,2,'A later window failure preserves already saved source and result files');
    assert.equal(created.length,1);assert.equal(B.state().space.assistant.status,'error');
    assert.equal(B.state().space.assistant.outputs.length,1,'The task records its actual partial window result');
  }
  {
    const {c,B,created}=fixture();
    c.localSlot=1;await assert.rejects(B.runAssistantExample('checklist'),/assigned display/);
    c.localSlot=2;B.setRole(2,'side');await assert.rejects(B.runAssistantExample('checklist'),/assigned display/);
    B.setRole(2,'assistant');c.SpatialAIDesktop.workingFolder=()=>'/Gaming/private';
    await assert.rejects(B.runAssistantExample('checklist'),/this Workspace/);
    assert.equal(c.workspaceDownloads.snapshot().files.length,0);assert.equal(created.length,0);
  }
  console.log('Assistant example integration passed: real saved inputs/results and versions, collision preservation, delegated windows, byte retention, stale control/context, scoped cleanup, quota failure and partial results.');
})().catch(error=>{console.error(error);process.exitCode=1;});
