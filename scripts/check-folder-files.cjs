const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const UI=require('../dist/folder-files.js'),F=require('../dist/stash-files.js'),M=require('../dist/working-memory.js'),H=require('../dist/home-folders.js'),Archive=require('../dist/project-archive.js');
const key=M.scope('work','launch'),model=M.create({},()=>100,'writer');
const note=model.add(key,{title:'Review',text:'Keep the original body',relativeDirectory:'Research'});
model.edit(note.id,{pinned:true});
const reloaded=M.create(JSON.parse(JSON.stringify(model.snapshot())));
assert.equal(reloaded.get(note.id).relativeDirectory,'Research','Editing, pinning and reloading preserve the actual folder');
const project={root:'/projects/launch',name:'Launch',files:[['Review.md','Existing original','document'],['Stash','Saved notes, files and media','folder']],resources:[],stash:{version:1,files:{old:{id:'old',name:'Old note.md',title:'Old note',content:'Saved earlier',blobKey:'stash-old'}}}};
const old={id:'old',title:'Old note',text:'Saved earlier',source:{},updated:10};
F.materialize(project,[old,reloaded.get(note.id),{id:'root-review',title:'Review',text:'A different note',source:{}}]);
assert.equal(F.folder(project),'/projects/launch');assert(!project.files.some(row=>row[0]==='Stash'));
assert.equal(F.path(project,project.stash.files.old),'/projects/launch/Old note.md');
assert.equal(F.path(project,project.stash.files[note.id]),'/projects/launch/Research/Review.md');
assert.equal(project.stash.files['root-review'].name,'Review (2).md','Existing ordinary files cannot be overwritten by materialized notes');
assert.equal(F.rows(project).length,2);assert.equal(F.rows(project,'/projects/launch/Research').length,1);
assert.equal(new Set(F.list(project).map(file=>F.path(project,file))).size,3);
assert(UI.inside('/projects/launch/Research','/projects/launch'));assert(!UI.inside('/projects/launcher','/projects/launch'));
const paths=UI.projectRows({path:'/projects/launch',base:'/projects/launch',rows:[['Review.md','Original','document']],directories:['/projects/launch/Research','/projects/launch/Research/Notes'],downloads:[{directory:'/projects/launch',name:'Review.md'},{directory:'/projects/launch',name:'Result.html'}],files:[{directory:'/projects/launch/Research',name:'Review.md'}],archive:{'Images/frame.svg':{kind:'image'}}});
assert.equal(paths.filter(row=>row[0]==='Review.md').length,1);assert(paths.some(row=>row[0]==='Research'&&row[2]==='folder'));assert(paths.some(row=>row[0]==='Images'&&row[2]==='folder'));assert(paths.some(row=>row[0]==='Result.html'));
const downloads=H.create();downloads.add('/projects/launch','Result.txt',{workspace:'work',project:'launch',content:'Before',itemId:'result-identity'});
downloads.update('/projects/launch','Result.txt',{content:'After'});assert.equal(downloads.list('/projects/launch').length,1);assert.equal(downloads.list('/projects/launch')[0].itemId,'result-identity');assert.equal(downloads.list('/projects/launch')[0].content,'After');

// Exercise production file lookup, including old links and combined root rows.
const code=fs.readFileSync(require.resolve('../dist/working-memory-desktop.js'),'utf8'),start=code.indexOf('  function ownerAtFolder('),end=code.indexOf('  function openSavedFile(',start);
const context=vm.createContext({F,M,activeWorkspace:'work',projectSpaces:{launch:project},workspaceProfiles:{work:{home:'/home/work',folders:[['Documents','Folder','folder']]}}});
context.ownerFor=()=>({root:'/home/work',files:[],stash:{files:{}}});
vm.runInContext(code.slice(start,end),context);
assert(vm.runInContext("fileRows('/projects/launch').some(row=>row[0]==='Review.md')",context));
assert(vm.runInContext("fileRows('/projects/launch').some(row=>row[0]==='Old note.md')",context));
assert.equal(vm.runInContext("fileRows('/projects/launch/Stash').length",context),2,'Old history paths resolve to the same retained files');
assert.equal(vm.runInContext("fileRows('/projects/launch/Research')[0][0]",context),'Review.md');

(async()=>{
 const plan=await Archive.build(project,{stash:F.list(project)});
 assert(plan.entries.some(entry=>entry.path==='Research/Review.md'));
 assert(plan.entries.some(entry=>entry.path==='Old note.md'));
 assert(!plan.entries.some(entry=>entry.path.startsWith('Stash/')),'Packing preserves the unified actual directory structure');
 console.log('Interactive folders passed: migration, identity, nested notes, safe collisions, ordinary-file edits, unified listings, legacy links and ZIP paths.');
})().catch(error=>{console.error(error);process.exitCode=1;});
