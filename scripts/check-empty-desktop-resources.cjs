const assert=require('node:assert/strict');
const {collect}=require('../dist/empty-desktop-resources.js');

function frozen(value){
  if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}
  return value;
}
const profiles=frozen({
  general:{label:'General',home:'/home/demo',folders:[]},
  work:{label:'Work',home:'/home/demo/Workspaces/work',folders:[['Documents','Workspace folder','folder'],['Pictures','Workspace folder','folder'],['References <draft>','Working material','folder'],['.spatial-workspace.toml','Workspace settings','config']]},
  school:{label:'School',home:'/home/demo/Workspaces/school',folders:[['Private assignment','Other Workspace','folder']]}
});
const home=profiles.work.home;
const projects=frozen({
  launch:{name:'Launch <review>',root:home+'/Projects/launch',originWorkspace:'work',files:[
    ['.spatial-project.toml','Already listed config','config'],['index.html','Website entry','document'],
    ['Cut notes.md','Linked document','document','/mnt/reference/Real notes.md'],['Clips','Linked footage','folder','/mnt/film/Clips'],
    ['Stash','Project saved material','folder'],['R&D "notes".txt','Literal filename','document'],['../escape','Invalid row','document']
  ]},
  other:{name:'Another Work project',root:home+'/Projects/other',originWorkspace:'work',files:[['Other secret.txt','Other Project','document']]},
  foreign:{name:'School project',root:profiles.school.home+'/Projects/private',originWorkspace:'school',files:[['Private.txt','Other Workspace','document']]},
  legacy:{name:'Custom project',root:'/mnt/custom',files:[['Readme.md','Legacy project row','document']]}
});
const downloads=frozen({directories:[home+'/Downloads',home+'/Documents/Reports',home+'/Projects/other/Exports',projects.launch.root+'/Downloads',profiles.school.home+'/Downloads','/mnt/unowned'],files:[
  {directory:home+'/Downloads',name:'review.txt',workspace:'work',project:null,content:'Never index file contents',savedAt:123},
  {directory:projects.launch.root,name:'index.html',workspace:'work',project:'launch',content:'Do not duplicate configured row',savedAt:234},
  {directory:projects.launch.root+'/Downloads',name:'page notes.txt',workspace:'work',project:'launch',content:'Saved Project file',savedAt:345},
  {directory:'/mnt/explicit-work-files',name:'External save.txt',workspace:'work',project:null,content:'Explicit ownership allows custom paths'},
  {directory:projects.other.root,name:'Other.txt',workspace:'work',project:'other'},
  {directory:projects.other.root,name:'Mislabeled.txt',workspace:'work',project:null},
  {directory:profiles.school.home+'/Downloads',name:'Private.txt',workspace:'school'},
  {directory:profiles.school.home+'/Downloads',name:'Mislabeled private.txt',workspace:'work'},
  {directory:home+'/Downloads',name:'Foreign metadata.txt',workspace:'school'},
  {directory:home+'/Downloads',name:'../bad.txt',workspace:'work'},
  {directory:home+'/Downloads',name:'Legacy no owner.txt'}
]});
const stashCalls=[];
const stashRows=directory=>{
  stashCalls.push(directory);
  if(directory===home+'')return frozen([['My note.md','Saved note','document'],['Image.png','Image','image']]);
  if(directory===projects.launch.root+'')return frozen([['Review.pdf','Document','document']]);
  throw new Error('Never request a foreign Stash');
};
const input={workspace:'work',column:'launch',profiles,projects,downloads,stashRows};
const before=JSON.stringify({profiles,projects,downloads});
const result=collect(input);
assert.equal(JSON.stringify({profiles,projects,downloads}),before,'The collector never mutates any source data');
assert.deepEqual(stashCalls,[home+'',projects.launch.root+'']);
assert.deepEqual(result.folders.filter(entry=>!entry.searchOnly).slice(0,7).map(entry=>entry.label),['Launch <review>','Work Home','Documents','Downloads','Desktop','Projects','Clips'],'Default folders keep the current Project followed by Home working folders');
assert(result.folders.some(entry=>entry.path===projects.launch.root+'/Assistant'&&entry.owner==='launch'),'An empty Project Assistant folder is discoverable before any task runs');
assert(result.folders.some(entry=>entry.path===home+'/Assistant'&&entry.owner==='workspace'),'Workspace Assistant files have their own ordinary folder');
assert(result.folders.find(entry=>entry.label==='Pictures').searchOnly,'Other standard Home folders are available for local search without crowding default folders');
assert(result.folders.some(entry=>entry.path===home+'/References <draft>'),'Configured Home extras retain literal names');
assert(result.folders.some(entry=>entry.path==='/mnt/film/Clips'&&entry.owner==='launch'),'Explicit Project folder targets preserve their real path');
assert(result.folders.some(entry=>entry.path===home+'/Documents/Reports'),'Known created folders in this Home appear without a filesystem probe');
assert(result.folders.some(entry=>entry.path===projects.launch.root+'/Downloads'&&entry.owner==='launch'));
assert(!result.folders.some(entry=>entry.path==='/mnt/unowned'),'Unscoped external directory strings cannot leak into the current Workspace');
assert.equal(result.folders.filter(entry=>entry.path===home+'/Downloads').length,1,'Default/configured/created folder entries deduplicate by path');
const linked=result.files.find(entry=>entry.label==='Cut notes.md');
assert.equal(linked.path,projects.launch.root+'/Cut notes.md');
assert.equal(linked.directory,projects.launch.root);assert.equal(linked.name,'Cut notes.md');
assert.equal(linked.sourcePath,'/mnt/reference/Real notes.md','The linked target is metadata, while opening addresses the actual Project listing');
assert.equal(result.files.filter(entry=>entry.path===projects.launch.root+'/index.html').length,1,'Saved and configured entries for one file deduplicate');
assert.equal(result.files.filter(entry=>entry.name==='.spatial-project.toml').length,1,'The generated Project config does not duplicate its configured row');
assert(result.files.some(entry=>entry.name==='.spatial-workspace.toml'&&entry.directory===home),'Workspace config appears only when it is actually listed');
assert(result.files.some(entry=>entry.path===home+'/My note.md'&&entry.owner==='workspace'));
assert(result.files.some(entry=>entry.path===projects.launch.root+'/Review.pdf'&&entry.owner==='launch'));
assert(result.files.some(entry=>entry.path==='/mnt/explicit-work-files/External save.txt'),'Explicitly Workspace-owned saved files may live in a custom directory');
assert.equal(result.files.find(entry=>entry.name==='review.txt').savedAt,123);
assert(result.files.some(entry=>entry.label==='R&D "notes".txt'),'User filenames stay literal data, without HTML parsing');
assert(!JSON.stringify(result).includes('Never index file contents'),'Search data never copies mutable document contents');
assert(!result.files.some(entry=>/Private|Other\.txt|Mislabeled|Foreign metadata|Legacy no owner|bad\.txt|escape/.test(entry.label)),'Foreign Workspace/Project, missing ownership and traversal entries stay out');
assert(!result.folders.some(entry=>entry.path.startsWith(projects.other.root)||entry.path.startsWith(profiles.school.home)));
assert.equal(new Set([...result.folders,...result.files].map(entry=>entry.key)).size,result.folders.length+result.files.length,'Every visible entry has a unique scoped key');
const again=collect(input);assert.deepEqual(again,result,'Stable input produces stable keys and ordering');
result.files[0].label='Changed output';assert.notEqual(projects.launch.files[0][0],'Changed output','Output entries are fresh metadata objects');

const ordinary=collect({...input,column:'workspace',stashRows:directory=>directory===home+''?[['Workspace note.md','Saved note','document']]:assert.fail('An ordinary Workspace never inspects a Project Stash')});
assert(!ordinary.files.some(entry=>entry.owner!=='workspace'),'Ordinary Workspace files exclude every Project’s saved files');
assert(!ordinary.files.some(entry=>entry.name==='.spatial-project.toml'));
const foreign=collect({...input,column:'foreign',stashRows:()=>[]});
assert(!foreign.folders.some(entry=>entry.owner==='foreign'));assert(!foreign.files.some(entry=>entry.owner==='foreign'),'Explicitly foreign selected Project metadata is rejected');
const legacy=collect({...input,column:'legacy',stashRows:()=>[]});
assert.equal(legacy.folders[0].path,'/mnt/custom','A selected legacy/custom Project without an origin can still provide its explicit folder');
const noConfig=collect({workspace:'general',profiles,projects:{},downloads:{}});
assert(!noConfig.files.some(entry=>entry.name==='.spatial-workspace.toml'),'A workspace config is not invented when no row exists');
assert.deepEqual(collect({workspace:'missing',profiles,projects,downloads}),{folders:[],files:[]});
assert.doesNotThrow(()=>collect({...input,stashRows(){throw new Error('Unavailable');}}),'An unavailable optional Stash does not hide the other working files');
for(const collision of [
  {profiles:{...profiles,work:{...profiles.work,folders:[['Assistant','Existing file','document']]}}},
  {downloads:{directories:[],files:[{directory:home,name:'Assistant',workspace:'work',content:'Keep me'}]}},
  {stashRows:directory=>directory===home?[['Assistant','Saved file','file']]:[]}
]){
  const blocked=collect({...input,column:'workspace',...collision});
  assert(blocked.files.some(entry=>entry.path===home+'/Assistant'),'An actual same-name file stays visible');
  assert(!blocked.folders.some(entry=>entry.path===home+'/Assistant'),'An actual same-name file is never duplicated as a synthetic folder');
}
console.log('Empty desktop resources passed: scoped Home/Project folders, actual saved files, Stash metadata, stable keys, target paths, deduplication, literal names, ownership isolation and immutable inputs.');
