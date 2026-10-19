const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Home=require('../dist/home-folders.js'),Files=require('../dist/desktop-files.js');
const clone=value=>JSON.parse(JSON.stringify(value));
function harness(){
  const downloads=Home.create(),persisted=[],events=[],clips=[];let workspace='work',serial=0,fail=false;
  const seeds=[{path:'/work',kind:'folder',protected:true},{path:'/work/Documents',kind:'folder',protected:true},{path:'/work/Project',kind:'folder',protected:true},{path:'/play',kind:'folder',protected:true},
    {path:'/work/retained.md',kind:'note',content:'Original retained note',itemId:'retained-item',revision:1},
    {path:'/work/photo.png',kind:'image',content:null,itemId:'photo-item',attachment:{kind:'image',key:'stash-kept-binary',mime:'image/png',filename:'photo.png'}}];
  const scope=(address,current)=>Files.inside(address,'/'+current)?{workspace:current,project:Files.inside(address,'/work/Project')?'project':null}:null;
  const options={downloads,seed:()=>seeds,scope,workspace:()=>workspace,clock:()=>1000+serial,id:()=>('file-'+(++serial)),persist(snapshot){if(fail)throw Error('Quota exceeded');persisted.push(clone(snapshot));},changed:detail=>events.push(detail),clipboardChanged:detail=>clips.push(detail)};
  const model=Files.create(options);
  return {model,downloads,seeds,persisted,events,clips,options,switchWorkspace(value){workspace=value;},fail(value){fail=value;},reload(){return Files.create({...options,downloads:Home.create(persisted.at(-1)||downloads.snapshot())});}};
}
{
  const h=harness(),f=h.model;
  assert.equal(Files.path('/work/./Documents/../note.md'),'/work/note.md');assert.equal(Files.path('/../../outside'),'');assert.equal(Files.path('/work/bad\u0000file'),'');
  assert.throws(()=>f.write('/play/private.md','Leak'),{code:'scope'});assert.throws(()=>f.read('/play/private.md'),{code:'scope'});
  const note=f.write('/work/Documents/review.md','# Review');assert(note.itemId);assert.equal(f.read(note.path).content,'# Review');assert.equal(note.project,null);
  assert.throws(()=>f.write(note.path,'Unreviewed overwrite'),{code:'conflict'});
  assert.equal(f.write(note.path,'# Edited',{itemId:note.itemId,expectedContent:'# Review'}).itemId,note.itemId);
  assert.throws(()=>f.write(note.path,'Lost update',{itemId:note.itemId,expectedContent:'# Review'}),{code:'changed'});
  assert.equal(f.read(note.path).content,'# Edited');assert.equal(h.reload().read(note.path).itemId,note.itemId);
  assert.throws(()=>f.write('/work/missing/new.md','No folder'),{code:'missing'});assert.throws(()=>f.write('/work/too-big.md','x'.repeat(12001)),{code:'size'});
}
{
  const h=harness(),f=h.model,folder=f.createDirectory('/work/Documents/Bundle'),child=f.createDirectory(folder.path+'/Sub');
  const note=f.write(child.path+'/readme.md','Nested text'),image=f.transfer(['/work/photo.png'],child.path)[0];
  assert.notEqual(image.itemId,'photo-item');assert.equal(image.attachment.key,'stash-kept-binary','Copies retain the same immutable binary bytes');
  const beforeFolder=f.read(folder.path);f.copy([folder.path]);const renamed=f.rename(folder.path,'Renamed');
  assert.equal(renamed.itemId,beforeFolder.itemId,'Directory identity survives rename');assert.equal(f.resolve(note).path,'/work/Documents/Renamed/Sub/readme.md');
  const copies=f.paste('/work/Project');assert(copies.some(item=>item.path==='/work/Project/Renamed/Sub/readme.md'));assert.equal(f.read('/work/Project/Renamed/Sub/photo.png').attachment.key,'stash-kept-binary');
  assert.notEqual(f.read('/work/Project/Renamed').itemId,renamed.itemId);assert.equal(f.read('/work/Project/Renamed/Sub/readme.md').project,'project');
  const restored=h.reload();assert.equal(restored.read(renamed.path).itemId,renamed.itemId,'Directory identity survives reload');
  assert.throws(()=>f.move([renamed.path],renamed.path+'/Sub'),{code:'descendant'});assert.throws(()=>f.trash(['/work/Documents']),{code:'protected'});
  assert.throws(()=>f.cut([renamed.path,note.path]),{code:'missing'},'A stale descendant selection is rejected');
}
{
  const h=harness(),f=h.model;f.write('/work/Documents/a.txt','One');f.write('/work/Documents/b.txt','Two');f.write('/work/Project/b.txt','Existing');
  const before=h.downloads.snapshot();assert.throws(()=>f.move(['/work/Documents/a.txt','/work/Documents/b.txt'],'/work/Project'),{code:'conflict'});assert.deepEqual(h.downloads.snapshot(),before,'A later conflict rolls back the entire batch before persistence');
  const outputs=f.move(['/work/Documents/a.txt','/work/Documents/b.txt'],'/work/Project',{collision:'keep-both'});assert(outputs.some(item=>item.path==='/work/Project/b (2).txt'));assert.equal(f.read('/work/Documents/a.txt'),null);
  const victim=f.read('/work/Project/b.txt'),replacement=f.rename('/work/Project/b (2).txt','b.txt',{collision:'replace'});assert.equal(replacement.content,'Two');assert.equal(f.trashList().length,1);assert.equal(f.trashList()[0].items[0].content,'Existing','Replace retains the victim in Trash');
  assert.equal(f.resolve(victim),null,'The replaced identity no longer resolves to the unrelated replacement');
  f.restore([f.trashList()[0].id],{collision:'keep-both'});assert.equal(f.read('/work/Project/b (2).txt').content,'Existing');
}
{
  const h=harness(),f=h.model;const legacy=f.read('/work/retained.md');
  f.rename(legacy.path,'renamed.md');assert.equal(f.read(legacy.path),null);assert.equal(f.read('/work/renamed.md').itemId,'retained-item');assert.equal(h.seeds.find(item=>item.itemId==='retained-item').content,'Original retained note','Retained source record is preserved');
  assert.equal(f.visibleSource(legacy.path),false);assert.equal(f.filterRows('/work',[['retained.md','Old retained row','document']]).some(row=>row[0]==='retained.md'),false,'Old source projections cannot resurrect a renamed file');
  const deleted=f.trash(['/work/renamed.md'])[0];assert.equal(f.resolve(legacy),null);assert.equal(h.reload().trashList()[0].items[0].itemId,'retained-item');
  f.restore([deleted.id]);assert.equal(f.resolve(legacy).path,'/work/renamed.md');
  const edited=f.write('/work/renamed.md','New contents',{itemId:legacy.itemId,expectedContent:'Original retained note'});assert.equal(f.read(edited.path).content,'New contents');
  f.write(edited.path,'Replacement',{itemId:legacy.itemId,expectedContent:'New contents',collision:'replace'});const old=f.trashList()[0];assert.equal(old.items[0].content,'New contents');
  f.restore([old.id],{collision:'keep-both'});assert.notEqual(f.read('/work/renamed (2).md').itemId,f.read('/work/renamed.md').itemId,'Restoring a replaced version as another file creates independent identity');
}
{
  const h=harness(),f=h.model;const folder=f.createDirectory('/work/Documents/Parent'),child=f.write(folder.path+'/child.txt','Recover me');
  const childTrash=f.trash([child.path])[0],parentTrash=f.trash([folder.path])[0];assert.throws(()=>f.restore([childTrash.id]),{code:'missing'});
  f.restore([childTrash.id,parentTrash.id]);assert.equal(f.read(child.path).content,'Recover me','One restore transaction handles separately trashed parent and descendant in dependency order');
  const before=h.downloads.snapshot();h.fail(true);assert.throws(()=>f.rename(folder.path,'Quota'),{code:'storage'});assert.deepEqual(h.downloads.snapshot(),before);assert(f.read(child.path));h.fail(false);
  f.rename(folder.path,'After quota');assert.equal(f.read('/work/Documents/After quota/child.txt').content,'Recover me');
}
{
  const downloads=Home.create({directories:['/work','/work/Shared','/work/Shared/Foreign'],files:[{directory:'/work/Shared/Foreign',name:'private.txt',workspace:'other',content:'Private data'}]});
  const f=Files.create({downloads,seed:()=>[{path:'/work/Shared',kind:'folder'}],scope:(address,workspace)=>Files.inside(address,'/work')&&!Files.inside(address,'/work/Shared/Foreign')?{workspace}:null,workspace:()=> 'work'});
  const before=downloads.snapshot();for(const operation of [()=>f.trash(['/work/Shared']),()=>f.rename('/work/Shared','Moved'),()=>f.move(['/work/Shared'],'/work')])assert.throws(operation,{code:'scope'});
  assert.deepEqual(downloads.snapshot(),before,'Mutating an ancestor cannot erase foreign Workspace descendants');
}
{
  const h=harness(),f=h.model;h.seeds.push({path:'/work/Project/import.png',kind:'image',content:null,attachment:{kind:'image',key:'stash-imported',mime:'image/png'},sourceRef:{archive:true}});h.downloads.add('/work/Project','import.png',{workspace:'work',project:'project',content:'Imported binary file · 64 KiB'});
  const imported=f.read('/work/Project/import.png');assert.equal(imported.content,null,'An import listing placeholder never replaces the genuine binary contents');assert.equal(imported.attachment.key,'stash-imported');
  const copy=f.transfer([imported.path],'/work/Documents')[0];assert.equal(copy.content,null);assert.equal(copy.attachment.key,'stash-imported','An imported binary remains binary through ordinary copy');
}
{
  const h=harness(),f=h.model,file=f.write('/work/Documents/undo.txt','Before');f.rename(file.path,'renamed.txt');const token=h.events.at(-1).undoToken;
  f.undo({token});assert.equal(f.resolve(file).path,file.path);assert.equal(h.reload().resolve(file).path,file.path);
  f.rename(file.path,'changed.txt');h.downloads.add('/work/Documents','external.txt',{workspace:'work',content:'External write'});assert.throws(()=>f.undo(),{code:'changed'});assert.equal(f.read('/work/Documents/external.txt').content,'External write');
  f.copy(['/work/Documents/changed.txt']);const clip=f.clipboard();h.switchWorkspace('play');assert.equal(f.clipboard(),null);assert.throws(()=>f.pasteClipboard(clip,'/play'),{code:'scope'});assert.equal(f.trashList().length,0);h.switchWorkspace('work');assert.equal(f.clipboard().items[0].itemId,file.itemId);
  f.cut(['/work/Documents/changed.txt']);f.paste('/work/Project');assert.equal(f.resolve(file).path,'/work/Project/changed.txt');assert.equal(f.clipboard(),null,'Successful cut/paste consumes the live file clipboard');
}
{
  const source=fs.readFileSync(require.resolve('../dist/desktop-files.js'),'utf8'),marker=source.indexOf('// F2 also emulates Super'),start=source.indexOf("root.addEventListener('keydown'",marker),end=source.indexOf('},true);',start)+'},true);'.length;
  let handler,selected=['/work/review.md'],renames=0;const frame={hidden:false,dataset:{appFrame:'files',fileWorkspace:'work'}};
  vm.runInNewContext(source.slice(start,end),{root:{addEventListener(type,callback,capture){assert.equal(type,'keydown');assert.equal(capture,true);handler=callback;}},activeWorkspace:'work',appInfo:{files:{base:'dolphin'}},selection:()=>selected,perform(id,action){assert.equal(id,'files');assert.equal(action,'rename');renames++;}});
  function event(){return {key:'F2',target:{closest:selector=>selector==='[data-app-frame]'?frame:null},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};}
  const selectedKey=event();handler(selectedKey);let demoSuperHeld=false;if(!selectedKey.stopped)demoSuperHeld=true;
  assert.equal(renames,1);assert.equal(selectedKey.prevented,true);assert.equal(demoSuperHeld,false,'File Rename intercepts F2 before the browser Super emulation can become held');
  selected=[];const overviewKey=event();handler(overviewKey);assert.equal(overviewKey.stopped,undefined,'F2 without file selection continues to Overview');assert.equal(renames,1);
}
{
  const source=fs.readFileSync(require.resolve('../dist/desktop-files.js'),'utf8'),between=(first,last)=>source.slice(source.indexOf(first),source.indexOf(last,source.indexOf(first)));
  const fields=new Map(),controls=Array.from({length:5},()=>({disabled:false})),places=[{pressed:true,classList:{remove(){this.active=false;}},setAttribute(name,value){if(name==='aria-pressed')this.pressed=value;}}],messages=[],visits=[];
  const field=selector=>{if(!fields.has(selector))fields.set(selector,{value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,readOnly:false});return fields.get(selector);};
  const frame={dataset:{fileLocation:'/home/work/Downloads',fileWorkspace:'work'},querySelector:field,querySelectorAll:selector=>selector==='[data-home-folder]'?places:controls};
  let entries=[{id:'trash-one',name:'Review.md',path:'/home/work/Downloads/Review.md',deletedAt:1000,items:[{kind:'document'}]}];
  const runtime=vm.createContext({frameFor:()=>frame,activeWorkspace:'work',workspaceProfiles:{work:{home:'/home/work'}},selections:new Map(),selection:()=>[],escapeHtml:String,icon:()=>'',parent:Files.parent,Date,
    files:{trashList:()=>entries,read:address=>['/home/work/Downloads','/home/work'].includes(address)?{kind:'folder'}:null},feedback:(id,message)=>messages.push(message),
    previousRender(id,address){visits.push(address);frame.dataset.fileLocation=address;field('.address-bar input').value=address;field('.file-breadcrumbs').innerHTML=address;},
    renderFileLocation(id,address){runtime.renderAppFiles(id,address);},decorate(){runtime.trashControls(frame,frame.dataset.desktopTrash==='true');}});
  vm.runInContext(between('function trashControls(', 'function decorate(')+between('function perform(', 'function showTrash(')+between('function showTrash(', 'newAppFolder=function')+between('renderAppFiles=function', 'function selection('),runtime);
  runtime.showTrash('files');assert.equal(field('.address-bar input').value,'Trash');assert.equal(field('.address-bar input').disabled,true);assert.match(field('.file-breadcrumbs').innerHTML,/Trash/);assert(controls.every(control=>control.disabled));assert.equal(places[0].pressed,'false');assert.match(field('.app-status').innerHTML,/1 item in/);assert.doesNotMatch(field('.app-status').innerHTML,/1 items/);
  runtime.perform('files','new-folder');assert.deepEqual(messages,['Return to files before using this action.'],'A stale create action cannot create a folder in the hidden previous location');
  entries=[];runtime.showTrash('files');assert.equal(frame.dataset.trashPreviousDirectory,'/home/work/Downloads','Refreshing Trash retains its original return folder');assert.match(field('.app-status').innerHTML,/0 items/);
  runtime.perform('files','home');assert.deepEqual(visits,['/home/work/Downloads']);assert(controls.every(control=>!control.disabled));assert.equal(field('.address-bar input').disabled,false);assert.equal(field('.address-bar input').readOnly,false);assert.equal(frame.dataset.trashPreviousDirectory,undefined);assert.equal(field('.address-bar input').value,'/home/work/Downloads');
  runtime.showTrash('files');frame.dataset.trashPreviousWorkspace='other';runtime.perform('files','home');assert.equal(visits.at(-1),'/home/work','A stale previous Workspace path never becomes the return destination');
}
console.log('Desktop files passed: scoped real text and retained bytes, stable file/directory identities, descendants, atomic conflicts and quota rollback, safe replace/Trash/restore, projection masks, reload/sync metadata, clipboard scope and guarded Undo.');
