const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Archive=require('../dist/project-archive.js'),Home=require('../dist/home-folders.js'),Files=require('../dist/desktop-files.js');
const source=fs.readFileSync(require.resolve('../dist/project-packages.js'),'utf8'),collect=source.slice(source.indexOf('  async function collect('),source.indexOf('  async function prepare('));
(async()=>{
  const project={name:'File export',root:'/home/work/Projects/Export',originWorkspace:'work',note:'Project note',files:[['Bundled.txt','Listed example','document'],['Gone.txt','Deleted example','document']],resources:[['Retained old','Original','document','i-note',{fileId:'retained-old',itemId:'retained-old'}],['External binary','Linked · /home/work/Documents/link.bin','file','i-link']],modes:{default:{label:'Default',apps:['notes']}},activeMode:'default',archiveFiles:{'photo.png':{key:'archive-photo',kind:'image',mime:'image/png'}}};
  const retained=[{id:'retained-old',name:'Old.md',kind:'note',title:'Retained old',content:'Original',record:{id:'retained-old'}},{id:'retained-kept',name:'Kept.md',kind:'note',title:'Retained kept',content:'Keep this provenance',record:{id:'retained-kept'}}];
  const downloads=Home.create(),bytes=new Map([['archive-photo',new Blob([new Uint8Array([137,80,78,71,1])],{type:'image/png'})],['local-shot',new Blob([new Uint8Array([137,80,78,71,2])],{type:'image/png'})],['external',new Blob([new Uint8Array([0,2,255])],{type:'application/octet-stream'})]]);
  let serial=0;
  const backend=Files.create({downloads,workspace:()=> 'work',scope:(address,workspace)=>address.startsWith('/home/work')?{workspace,project:address.startsWith(project.root)?'export':null}:null,id:()=> 'id-'+(++serial),seed:()=>[
    {path:'/home/work',kind:'folder'},{path:'/home/work/Documents',kind:'folder'},{path:project.root,kind:'folder',protected:true},
    {path:project.root+'/Bundled.txt',kind:'document',content:null},{path:project.root+'/Gone.txt',kind:'document',content:null},
    ...retained.map(file=>({...file,path:project.root+'/'+file.name,itemId:file.id})),
    {path:project.root+'/photo.png',kind:'image',content:null,attachment:{key:'archive-photo',kind:'image',mime:'image/png'}},
    {path:'/home/work/Documents/link.bin',kind:'file',content:null,attachment:{key:'external',kind:'file',mime:'application/octet-stream'}}
  ]});
  backend.blob=async(address,options)=>{const file=backend.read(address,options);if(!file)throw Error('Missing file');if(typeof file.content==='string')return new Blob([file.content],{type:'text/plain'});const blob=bytes.get(file.attachment?.key);if(!blob)throw Error('Missing saved bytes');return blob;};
  backend.rename(project.root+'/Old.md','Renamed.md');backend.trash([project.root+'/Gone.txt']);backend.write(project.root+'/Bundled.txt','Actual replacement',{collision:'replace'});backend.write(project.root+'/Capture.png',null,{attachment:{key:'local-shot',kind:'image',mime:'image/png'}});
  const runtime=vm.createContext({root:{SpatialDesktopFiles:backend},A:Archive,F:{list:()=>retained,path:(owner,file)=>owner.root+'/'+file.name,get:async key=>bytes.get(key),copyAsset:async(owner,file)=>bytes.get(file.attachment.key)},clone:value=>JSON.parse(JSON.stringify(value)),activeWorkspace:'work',workspaceDownloads:downloads,workspaceProfiles:{work:{home:'/home/work'}},projectSpaces:{export:project},Uint8Array,Blob,SpatialItemHistoryDesktop:{snapshot:()=>({})},SpatialItemHistoryPackage:{exportProject:()=>({records:{kept:{versions:[]}}})}});
  vm.runInContext(collect,runtime);const before=JSON.stringify(project),plan=await runtime.collect(project,'export',{}),review=Archive.inspect(Archive.zip(plan.entries));
  assert.equal(JSON.stringify(project),before,'Export leaves the live Project unchanged');
  assert.equal(Archive.decode(review.files.get('Renamed.md')),'Original');assert(!review.files.has('Old.md'));assert(!review.files.has('Gone.txt'));
  assert.equal(Archive.decode(review.files.get('Bundled.txt')),'Actual replacement','An ordinary replacement wins over a bundled sample');
  assert.deepEqual([...review.files.get('photo.png')],[137,80,78,71,1],'Imported image keeps its binary bytes');
  assert.deepEqual([...review.files.get('Capture.png')],[137,80,78,71,2],'New binary files do not export as empty text');
  assert.deepEqual([...review.files.get('Linked resources/link.bin')],[0,2,255],'Linked accessible files also use canonical binary bytes');
  assert(!review.manifest.project.resources.some(entry=>entry[0]==='Retained old'),'A renamed retained source is not recreated from stale metadata');
  assert(review.manifest.project.resources.some(entry=>entry[0]==='Retained kept'),'Unchanged retained note provenance stays in the package');
  assert(review.files.has('.spatial-item-history.json'),'Project history remains packaged');assert.deepEqual(plan.missing,[]);
  backend.trash(['/home/work/Documents/link.bin']);const missing=await runtime.collect(project,'export',{});assert(missing.missing.includes('External binary'),'A deleted linked source cannot reappear through a legacy fallback');
  bytes.delete('local-shot');await assert.rejects(()=>runtime.collect(project,'export',{}),/Missing saved bytes/,'Unavailable actual file bytes stop a misleading incomplete export');
  runtime.root.SpatialDesktopFiles=null;const fallback=await runtime.collect({...project,resources:[],stash:undefined},'export',{});assert.deepEqual([...fallback.entries.find(entry=>entry.path==='photo.png').data],[137,80,78,71,1],'The legacy path remains usable before the canonical adapter starts');
  console.log('Project file export passed: canonical rename/Trash/replacement, image and linked binary bytes, retained provenance/history, unavailable source safety and legacy fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
