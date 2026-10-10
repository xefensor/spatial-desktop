const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const H = require('../dist/home-folders.js');
const Pages = require('../dist/desktop-pages.js');
const source = fs.readFileSync(path.join(__dirname, '../dist/desktop-shell.js'), 'utf8');
const profiles = {
  general: {home:'/home/demo'}, school:{home:'/home/demo/Workspaces/School'},
  work:{home:'/home/demo/Workspaces/Work'}, gaming:{home:'/home/demo/Workspaces/Gaming'}
};
const projects = {
  site:{root:'/home/demo/Workspaces/Work/Projects/site',files:[],downloadToProject:false},
  film:{root:'/mnt/media/Short Film',files:[],downloadToProject:true}
};
assert.equal(H.standard.length,8);
for (const workspace of Object.keys(profiles)) {
  assert.equal(H.folder(profiles,workspace),profiles[workspace].home);
  for (const folder of H.standard) assert.equal(H.folder(profiles,workspace,folder),profiles[workspace].home+'/'+folder);
  assert.equal(H.downloadDestination(profiles,projects,workspace,'workspace'),profiles[workspace].home+'/Downloads');
  assert.equal(H.downloadDestination(profiles,projects,workspace,'site'),profiles[workspace].home+'/Downloads');
  assert.equal(H.downloadDestination(profiles,projects,workspace,'film'),'/mnt/media/Short Film/Downloads');
}
assert.throws(()=>H.folder(profiles,'missing','Downloads'));
const desktopPages = Pages.create();
desktopPages.assign('work','browser-personal',0,'workspace');
desktopPages.assign('work','browser-film',1,'film');
desktopPages.assign('work','browser-site',0,'site');
desktopPages.select('work','film');
const storage = new Map();
const ctx = vm.createContext({SpatialHomeFolders:H,workspaceProfiles:profiles,projectSpaces:projects,desktopPages,
  workspaceDownloads:H.create(),activeWorkspace:'work',activeProjectName:'film',
  desktopStorage:{setItem:(key,value)=>storage.set(key,value)}});
function slice(first,last) { return source.slice(source.indexOf(first),source.indexOf(last,source.indexOf(first))); }
vm.runInContext(slice('function persistDownloads(', 'function downloadPageNotes('),ctx);
assert.equal(ctx.downloadContext('browser-personal').directory,profiles.work.home+'/Downloads','An independent window ignores the selected project');
assert.equal(ctx.downloadContext('browser-film').directory,projects.film.root+'/Downloads');
assert.equal(ctx.downloadContext('browser-site').directory,profiles.work.home+'/Downloads','A second project defaults to workspace Downloads');
const captured = ctx.downloadContext('browser-film');
ctx.activeWorkspace = 'school'; ctx.activeProjectName = 'site';
assert.equal(ctx.downloadContext('browser-film','work').directory,captured.directory,'Explicit originating workspace survives context switches');
ctx.ensureProjectDownloads('film'); ctx.ensureProjectDownloads('film');
assert.equal(projects.film.files.filter(([name])=>name==='Downloads').length,1,'Creating the project folder is idempotent');
const a = ctx.workspaceDownloads.add(captured.directory,'review.txt',{...captured,content:'Review notes'});
const b = ctx.workspaceDownloads.add(captured.directory,'review.txt',captured);
assert.equal(b.name,'review (2).txt','Repeated downloads preserve previous files');
ctx.persistDownloads();
const restored = H.create(JSON.parse(storage.get('spatial-downloads-v1')));
assert.equal(restored.list(captured.directory).length,2);
assert.equal(restored.list(captured.directory)[0].content,'Review notes');
projects.film.downloadToProject = false;
assert.equal(ctx.downloadContext('browser-film','work').directory,profiles.work.home+'/Downloads','Disabling affects subsequent downloads');
assert.equal(restored.list(captured.directory).length,2,'Old project files remain after disabling');
const personal = restored.add(profiles.work.home+'/Downloads','review.txt',{workspace:'work'});
assert.equal(personal.name,'review.txt','Separate folders do not share filename collisions');
assert.equal(restored.list(profiles.school.home+'/Downloads').length,0,'Downloads stay isolated between workspaces');
assert(restored.snapshot().directories.includes(captured.directory));
assert.equal(H.create(restored.snapshot()).add(captured.directory,'../bad.txt').name,'.._bad.txt','Names cannot escape their destination');
assert.equal(H.folder(profiles,'work','Pictures'),profiles.work.home+'/Pictures','Project downloads never change standard Places');
assert(source.includes('downloadToProject: project.downloadToProject === true'),'The project preference survives normalization');
assert(source.includes('downloads: workspaceDownloads.snapshot()') && source.includes('workspaceDownloads.load(state.downloads)'),'Demo displays share the downloaded entries');
const html = fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
for (const folder of ['Home',...H.standard]) assert(html.includes('data-home-folder="'+folder+'"'),'Place exists: '+folder);
console.log('Home folders passed: all Linux user folders, originating-window routing, custom project roots, opt-in defaults, context switches, folder creation, reload, retained files, duplicate downloads, workspace isolation and display sync.');
