const assert=require('node:assert/strict');
const fs=require('node:fs');
const A=require('../dist/project-archive.js');
(async()=>{
 assert.equal(A.crc(new TextEncoder().encode('123456789')),0xcbf43926,'ZIP CRC matches the standard check value');
 for(const path of ['../secret','/absolute','a/../b','a\\b','C:/data','a//b','a\u0000b'])assert.equal(A.safePath(path),false,path);
 const project={name:'Project Č',root:'/home/demo/Project',note:'Project note',files:[['readme.md','Example outline','document']],resources:[
 ['Source A','Linked · /outside/a/reference.txt','file','i-link'],['Source B','Linked · /outside/b/reference.txt','file','i-link'],
 ['Same source again','Linked · /outside/a/reference.txt','file','i-link'],['Site','Web','web','i-web',{address:'https://example.test/'}],
 ['Photo','Caption','image','i-image',{attachment:{kind:'image',src:'media/stash/photo.svg'}}]
 ],activeMode:'default',modes:{default:{label:'Default',apps:['editor','missing-app'],layout:'canvas'}}};
 const before=JSON.stringify(project);const reads=[];
 const plan=await A.build(project,{files:[{path:'notes.txt',data:'Saved notes č'}],readPath:async path=>{reads.push(path);return path;},readAttachment:async()=>new Blob(['<svg/>'],{type:'image/svg+xml'}),stash:[{name:'Free note.md',content:'Remember me',title:'Free note',caption:'Remember me',record:{id:'note'}}]});
 assert.equal(JSON.stringify(project),before,'Building an archive does not edit the original Project');assert.deepEqual(plan.missing,[]);
 assert.equal(reads.length,2,'Repeated linked files are copied once');
 assert(plan.entries.some(e=>e.path==='Linked resources/reference.txt'));assert(plan.entries.some(e=>e.path==='Linked resources/reference (2).txt'));
 const resources=plan.manifest.project.resources;assert.equal(resources[0][4].address,'./Linked resources/reference.txt');assert.equal(resources[2][4].address,resources[0][4].address);assert.equal(resources[3][4].address,'https://example.test/');
 assert(resources.some(e=>e[0]==='Free note'&&e[4].text==='Remember me'),'Free Stash notes remain accessible resources after import');
 assert(plan.samples.includes('readme.md'));assert(plan.entries.some(e=>e.path==='Stash/Free note.md'));
 const zip=A.zip(plan.entries),review=A.inspect(zip);assert.equal(review.manifest.project.root,'.');assert.equal(A.decode(review.files.get('notes.txt')),'Saved notes č');assert.deepEqual(review.manifest.requirements,['editor','missing-app']);
 fs.writeFileSync('/tmp/spatial-project-archive-check.zip',zip);
 const damaged=zip.slice();damaged[35]^=1;assert.throws(()=>A.inspect(damaged));assert.throws(()=>A.inspect(zip.slice(0,-8)),/complete/);
 assert.throws(()=>A.zip([{path:'same',data:'a'},{path:'same',data:'b'}]),/duplicate/);
 const missing=await A.build({...project,resources:[project.resources[0]]},{readPath:()=>undefined});assert.deepEqual(missing.missing,['Source A']);assert.equal(missing.report[0].kind,'missing');
 const replaced=await A.build({...project,resources:[project.resources[0]]},{replacements:{0:new Blob(['Actual replacement'])}});assert.deepEqual(replaced.missing,[]);assert.equal(A.decode(replaced.entries.find(e=>e.path==='Linked resources/reference.txt').data),'Actual replacement');
 const invalid=structuredClone(plan.manifest);invalid.project.resources[0][4].address='./missing.txt';assert.throws(()=>A.inspect(A.zip([{path:'.spatial-project.json',data:JSON.stringify(invalid)}])),/missing/);
 const html=fs.readFileSync('dist/index.html','utf8');assert(!html.includes('data-open-package="workspace"'));assert(!html.includes('Import as new Workspace'));assert(!html.includes('data-package-mode'));assert(html.includes('Import project'));
 console.log('Project archives passed: standard CRC, real ZIP bytes, linked copies/duplicates/collisions, relative rebasing, web links, unchanged originals, saved Stash notes, missing-file replacement, UTF-8, invalid paths, damage, truncated ZIPs and Project-only UI.');
})().catch(error=>{console.error(error);process.exitCode=1;});
