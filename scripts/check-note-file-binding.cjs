const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const A=require('../dist/app-tools.js');
const F=require('../dist/assistant-files.js');
const H=require('../dist/home-folders.js');
const History=require('../dist/item-history.js');
const source=fs.readFileSync(path.join(__dirname,'../dist/app-windows.js'),'utf8');
const slice=(first,last)=>source.slice(source.indexOf(first),source.indexOf(last,source.indexOf(first)));
function environment(saved){
  const files=H.create(saved?.files),models=A.create(saved?.windows),writes=new Map(),timers=new Map(),history=History.create(saved?.history);
  const fields=new Map(),frames=new Map();let timer=0,fail=false,ordinaryWrites=0;
  function field(selector,id){
    const key=id+selector;if(fields.has(key))return fields.get(key);
    const value={value:'',textContent:'',hidden:false,innerHTML:'',removeAttribute(name){this.removed=name;}};
    Object.defineProperty(value,'maxLength',{set(next){if(next<0)throw Error('IndexSizeError: maximum length cannot be negative');this.limit=next;}});
    fields.set(key,value);return value;
  }
  const c=vm.createContext({SpatialAppTools:A,SpatialAssistantFiles:F,activeWorkspace:'work',
    workspaceProfiles:{work:{home:'/home/work'},play:{home:'/home/play'}},projectSpaces:{film:{root:'/home/work/Projects/Film',originWorkspace:'work'}},
    appInfo:{'notes--1':{base:'notes'},notes:{base:'notes'},'notes--2':{base:'notes'}},workspaceDownloads:files,
    openProjectNames:()=>c.openProjects,openProjects:['film'],
    appWindowModel(id){return models.get(c.activeWorkspace,id,()=>({kind:'notes',active:'main',sequence:1,notes:[{id:'main',title:'Note',text:'Unbound working text'}]}));},
    frameFor(id){if(!frames.has(id))frames.set(id,{dataset:{appFrame:id}});return frames.get(id);},
    $(selector,frame){return field(selector,frame.dataset.appFrame);},escapeHtml:String,icon:()=>'',prepareControlSemantics(){},
    desktopStorage:{setItem(key,value){if(fail&&key==='spatial-downloads-v1')throw Error('Quota exceeded');writes.set(key,value);}},
    SpatialItemHistoryDesktop:{capture(item,options){history.upsert(item,options);},persist(){return true;}},
    setTimeout(callback){const id=++timer;timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);},
    persistDownloads(){},refreshDownloadUi(){},persistWorkspaceNote(){ordinaryWrites++;},saveAppWindows(){writes.set('notes',JSON.stringify(models.snapshot()));}
  });
  vm.runInContext(slice('function renderNotes(','function readBrowserPage('),c);
  vm.runInContext(slice('function appWindowInput(','function appWindowKey('),c);
  function edit(text,id='notes--1'){
    const frame=c.frameFor(id),target={value:text,closest(){return frame;},matches(selector){return selector.includes('.notes-layout textarea');}};
    c.appWindowInput({target,stopImmediatePropagation(){}});
  }
  return {c,files,models,writes,timers,history,edit,field,fail(value){fail=value;},ordinaryWrites:()=>ordinaryWrites,
    note:(id='notes--1')=>A.activeNote(c.appWindowModel(id)),snapshot:()=>({files:files.snapshot(),windows:models.snapshot(),history:history.snapshot()})};
}
const e=environment();
const saved=e.files.add('/home/work/Projects/Film/Assistant','Launch checklist.md',{workspace:'work',project:'film',content:'# Launch\n- [ ] Review\n',itemId:'assistant-checklist'});
e.history.upsert({id:saved.itemId,title:saved.name,text:saved.content,address:saved.path,source:{app:'assistant',workspace:'work',project:'film',label:'Assistant checklist'}},{workspace:'work',project:'film',action:'created'});
const binding={path:saved.path,itemId:saved.itemId,workspace:'work',project:'film'};
e.note().text='A stale passed copy';
assert.equal(e.c.SpatialNoteFiles.bind('notes--1',binding),true);
assert.equal(e.note().text,saved.content,'Binding opens the exact saved content, never the stale launch text');
e.c.renderNotes('notes--1');
assert.equal(e.field('[data-note-title]','notes--1').readOnly,true,'A document label cannot pretend to rename the bound file');
assert.equal(e.field('[data-note-file-location]','notes--1').textContent,saved.path);
assert.equal(e.field('.notes-layout textarea','notes--1').limit,12000);
e.edit('# Launch\n- [x] Review');e.edit('# Launch\n- [x] Review\n- [ ] Ship\n');
assert.equal(e.files.list(saved.directory)[0].content,e.note().text,'Input updates the same actual saved file');
assert.equal(JSON.parse(e.writes.get('spatial-downloads-v1')).files[0].content,e.note().text,'The edited file is persisted, not just the window');
assert.equal(e.files.snapshot().files.length,1,'Editing creates no duplicate output or renamed file');
assert.equal(e.history.get(saved.itemId).versions.length,1,'Typing does not create a history version per keypress');
e.c.SpatialNoteFiles.flush('notes--1');
assert.equal(e.history.get(saved.itemId).versions.length,2);
assert.equal(e.history.get(saved.itemId).text,e.note().text);
assert.equal(e.history.get(saved.itemId).origin.app,'assistant','Editing retains the original Assistant provenance');
assert.deepEqual(Object.keys(e.history.snapshot().records),[saved.itemId],'All edits belong to the original item identity');
e.c.SpatialNoteFiles.save('notes--1');assert.equal(e.history.get(saved.itemId).versions.length,2,'Saving unchanged text creates no phantom version');

const reloaded=environment(e.snapshot());reloaded.c.renderNotes('notes--1');
assert.equal(reloaded.note().file.path,saved.path,'The file binding survives the serialized app session');
assert.equal(reloaded.note().text,e.note().text);
reloaded.files.update(saved.directory,saved.name,{content:'An edit made in Files'});reloaded.c.SpatialNoteFiles.refresh('notes--1');
assert.equal(reloaded.note().text,'An edit made in Files','Reopening a clean bound editor reads current file content');
reloaded.c.renderNotes('notes');
assert.equal(reloaded.field('.notes-layout textarea','notes').removed,'maxlength','Ordinary Notes remove the bound limit without setting an invalid negative native maxLength');
assert.equal(reloaded.field('[data-note-title]','notes').readOnly,false);
reloaded.edit('An ordinary independent note','notes');
assert.equal(reloaded.ordinaryWrites(),1);assert.equal(reloaded.files.list(saved.directory)[0].content,'An edit made in Files','Ordinary Notes keep their independent autosaved document behaviour');

const before=reloaded.files.snapshot(),versions=reloaded.history.get(saved.itemId).versions.length;
reloaded.fail(true);reloaded.edit('Unsaved draft retained');
assert.deepEqual(reloaded.files.snapshot(),before,'Storage failure rolls back only this synchronous file update');
assert.equal(reloaded.note().text,'Unsaved draft retained');assert.equal(reloaded.note().fileDirty,true);assert.match(reloaded.note().fileError,/Saving failed/);
reloaded.c.SpatialNoteFiles.flush();assert.equal(reloaded.history.get(saved.itemId).versions.length,versions,'An unsaved draft is never recorded as a saved file version');
reloaded.fail(false);assert.equal(reloaded.c.SpatialNoteFiles.save('notes--1'),true);assert.equal(reloaded.files.list(saved.directory)[0].content,'Unsaved draft retained');
assert.equal(reloaded.history.get(saved.itemId).text,'Unsaved draft retained');

reloaded.c.activeWorkspace='play';
reloaded.models.copy('work','notes--1','play','notes--1');reloaded.edit('Attempt from another Workspace');
assert.match(reloaded.note().fileError,/another Workspace/);assert.equal(reloaded.files.list(saved.directory)[0].content,'Unsaved draft retained','A transferred editor cannot write back into its old Workspace');
reloaded.c.activeWorkspace='work';reloaded.c.openProjects=[];reloaded.edit('Project is closed');
assert.match(reloaded.note().fileError,/Reopen this Project/);assert.equal(reloaded.files.list(saved.directory)[0].content,'Unsaved draft retained');
reloaded.c.openProjects=['film'];delete reloaded.c.projectSpaces.film;reloaded.edit('Project was removed');
assert.match(reloaded.note().fileError,/no longer available/);assert.equal(reloaded.files.list(saved.directory)[0].content,'Unsaved draft retained','Removing a Project never recreates or writes its files');
assert.equal(reloaded.c.SpatialNoteFiles.bind('notes--2',binding),false,'A missing Project cannot get an unbound fallback editor');

const replaced=environment(e.snapshot());
const replacement=replaced.files.snapshot();replacement.files[0].itemId='other-file-same-name';replaced.files.load(replacement);
replaced.edit('Do not overwrite a replacement');assert.match(replaced.note().fileError,/no longer available/);
assert.equal(replaced.files.snapshot().files[0].itemId,'other-file-same-name');assert.notEqual(replaced.files.snapshot().files[0].content,'Do not overwrite a replacement');
assert.equal(replaced.c.SpatialNoteFiles.bind('notes--2',{...binding,path:'/home/work/Projects/Film/Assistant/../Launch checklist.md'}),false,'Bindings require an exact canonical file path');
const conflict=environment(e.snapshot());conflict.note().fileDirty=true;conflict.note().text='Draft I was editing';
conflict.files.update(saved.directory,saved.name,{content:'Newer external edit'});
assert.equal(conflict.c.SpatialNoteFiles.save('notes--1'),false);assert.match(conflict.note().fileError,/changed elsewhere/);assert.equal(conflict.files.list(saved.directory)[0].content,'Newer external edit','An unsaved draft cannot overwrite a newer saved file');
console.log('Bound Note files passed: exact saved-file editing and readback, persistent binding, coalesced same-item history, ordinary Notes, native length semantics, transactional quota failure/retry, replacement identity, closed/removed Project and foreign Workspace guards.');
