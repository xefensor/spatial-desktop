const assert=require('node:assert/strict');
const C=require('../dist/ai-context.js');
const workspaces={general:{home:'/home/demo'},work:{home:'/home/demo/Work'}};
const projects={film:{root:'/home/demo/Projects/film'},site:{root:'/home/demo/Projects/site'}};
const env={workspaces:()=>workspaces,projects:()=>projects};
const create=value=>C.create(value,env);

// A scope follows the Workspace/Project pair, not focus or virtual desktops.
const model=create(),home=model.scope('general',null).id;
assert.equal(model.chats('general').length,1,'First Workspace entry reuses its empty starter');
assert.equal(model.contextPreference('general',null),false);
model.draft('general','Home draft');
model.add('general',{id:'foreign',project:'film',text:'Explicitly emphasized source'});
assert.equal(model.workingFolder('general'),'/home/demo/Assistant','A Project source cannot retarget a bound Workspace chat');
assert.equal(model.folder('general','film',home),false,'A bound chat cannot change destination');
const film=model.scope('general','film').id;
assert.notEqual(film,home);assert.equal(model.session('general').draft,'');
assert.equal(model.workingFolder('general'),projects.film.root+'/Assistant');
model.draft('general','Film draft');model.add('general',{id:'film-notes',text:'Film notes'});
const unchanged=JSON.stringify(model.snapshot());
for(let i=0;i<8;i++)assert.equal(model.scope('general','film').id,film);
assert.equal(JSON.stringify(model.snapshot()),unchanged,'Same-context rendering or window/desktop focus changes create no chat or selection writes');
const filmSecond=model.newChat('general').id;model.draft('general','Second film draft');
assert(model.select('general',film));
model.scope('general',null);assert.equal(model.session('general').id,home);assert.equal(model.session('general').draft,'Home draft');
assert.equal(model.select('general',filmSecond),false,'Chat selection stays within the current scope');
model.scope('general','film');assert.equal(model.session('general').id,film);assert.equal(model.session('general').draft,'Film draft');assert.equal(model.session('general').items[0].id,'film-notes');
assert.equal(model.chats('general').length,2);assert.equal(model.chats('general',{all:true}).length,3);
const otherWorkspace=model.scope('work','film').id;
assert.notEqual(otherWorkspace,film);assert.equal(model.session('work').draft,'');
model.contextPreference('general','film',true);
assert.equal(model.contextPreference('work','film'),false,'Context access is scoped by both Workspace and Project');
assert.equal(model.contextPreference('general',null),false);
const example=model.newChat('general','site');assert.equal(example.scopeBound,true);assert.equal(example.workingProject,'site');
assert.equal(model.folder('general','film',example.id),false);
model.scope('general','film');assert.equal(model.session('general').id,film);
const restored=create(model.snapshot());restored.scope('general','film');assert.equal(restored.session('general').id,film);assert.equal(restored.contextPreference('general','film'),true);
restored.scope('general',null);assert.equal(restored.session('general').draft,'Home draft');

// Legacy folders are the migration evidence, including chats that were not
// active at shutdown. No history or unsent draft becomes an orphan.
for(const version of [1,2,3]){
  const legacy=create({version,sessions:{general:{workingProject:'film',draft:'Legacy draft',items:[{id:'legacy-source',text:'Keep this'}],turns:[{id:'legacy-turn',request:'Legacy question',text:'Legacy answer'}],updated:7}}});
  const id=legacy.session('general').id;
  legacy.scope('general',null);assert.notEqual(legacy.session('general').id,id);
  legacy.scope('general','film');assert.equal(legacy.session('general').id,id);assert.equal(legacy.session('general').draft,'Legacy draft');assert.equal(legacy.session('general').turns[0].text,'Legacy answer');
  assert.equal(create(legacy.snapshot()).chats('general',{all:true}).length,2);
}
for(const version of [4,5]){
  const legacy=create();const filmId=legacy.session('general').id;legacy.folder('general','film',filmId);legacy.draft('general','Film legacy');
  const siteId=legacy.newChat('general').id;legacy.folder('general','site',siteId);legacy.draft('general','Site legacy');
  const homeId=legacy.newChat('general').id;legacy.folder('general',null,homeId);legacy.draft('general','Home legacy');legacy.select('general',siteId);
  const old=legacy.snapshot();old.version=version;
  for(const record of Object.values(old.sessions)){delete record.contexts;delete record.activeContext;for(const chat of Object.values(record.chats)){delete chat.scopeBound;delete chat.scopeProject;delete chat.scopeUpdated;if(version===4){delete chat.contentUpdated;delete chat.draftUpdated;}}}
  const migrated=create(old);
  for(const [project,id,draft] of [['film',filmId,'Film legacy'],['site',siteId,'Site legacy'],[null,homeId,'Home legacy']]){assert.equal(migrated.scope('general',project).id,id);assert.equal(migrated.session('general').draft,draft);}
  assert.equal(migrated.chats('general',{all:true}).length,3);
}
const initialized=create(),initializedId=initialized.newChat('general').id;
assert(initialized.folder('general','film',initializedId),'Explicit unbound example setup remains compatible');
assert.equal(initialized.scope('general','film').id,initializedId);
assert.equal(initialized.folder('general','site',initializedId),false);

// Two displays can remember different contexts without stealing the visible
// chat. Preferences merge on their own clock, independently from typing.
const seed=create(),homeOne=seed.scope('general',null).id,homeTwo=seed.newChat('general').id;
const filmOne=seed.scope('general','film').id,filmTwo=seed.newChat('general').id;
seed.scope('general',null);seed.select('general',homeOne);
const a=create(seed.snapshot()),b=create(seed.snapshot());
a.scope('general','film');a.select('general',filmOne);a.contextPreference('general','film',true);
b.scope('general',null);b.select('general',homeTwo);b.contextPreference('general',null,true);
a.load(b.snapshot(),{preserveSelection:'general'});b.load(a.snapshot(),{preserveSelection:'general'});
assert.equal(a.session('general').id,filmOne);assert.equal(b.session('general').id,homeTwo);
assert(a.contextPreference('general',null));assert(b.contextPreference('general','film'));
a.scope('general',null);assert.equal(a.session('general').id,homeTwo,'A hidden context receives its remote remembered selection');
b.scope('general','film');assert.equal(b.session('general').id,filmOne);
const typing=create(a.snapshot()),reply=create(a.snapshot());
reply.contextPreference('general',null,false);
reply.exchange('general','Read these',{text:'Source captured'},{sources:[{id:'open-editor',origin:'automatic',text:'Captured text'}]});
typing.draft('general','My unsent draft');typing.draft('general','My final draft');
reply.load(typing.snapshot());typing.load(reply.snapshot());
for(const copy of [typing,reply]){assert.equal(copy.contextPreference('general',null),false);assert.equal(copy.session('general').draft,'My final draft');assert.equal(copy.session('general').turns[0].sources[0].origin,'automatic');assert.equal(copy.session('general').turns[0].sources[0].text,'Captured text');}
const preferenceOnly=create(typing.snapshot()),contentOnly=create(typing.snapshot());
preferenceOnly.contextPreference('general',null,true);contentOnly.add('general',{id:'manual',text:'Attached explicitly'});contentOnly.draft('general','A later draft');
preferenceOnly.load(contentOnly.snapshot());contentOnly.load(preferenceOnly.snapshot());
assert(contentOnly.contextPreference('general',null));assert.equal(preferenceOnly.session('general').items[0].origin,'manual');
const local=create(seed.snapshot()),remote=create(seed.snapshot());local.scope('general',null);local.select('general',homeOne);remote.scope('general',null);remote.select('general',homeTwo);
local.load(remote.snapshot(),{preserveSelection:'general'});assert.equal(local.scope('general',null).id,homeOne,'A remote selector cannot move the local composer');
const tiedEnabled=seed.snapshot(),tiedDisabled=seed.snapshot();
for(const [snapshot,enabled,chat] of [[tiedEnabled,true,homeOne],[tiedDisabled,false,homeTwo]]){const state=snapshot.sessions.general.contexts.workspace;state.enabled=enabled;state.preferenceUpdated=9000000000000;state.selectionUpdated=9000000000000;state.activeChat=chat;}
const tieA=create(tiedEnabled),tieB=create(tiedDisabled);tieA.load(tieB.snapshot());tieB.load(tieA.snapshot());
assert.equal(tieA.contextPreference('general',null),false);assert.equal(tieB.contextPreference('general',null),false,'Equal-time access changes converge to disabled');
assert.equal(tieA.scope('general',null).id,tieB.scope('general',null).id,'Equal-time hidden selections converge deterministically');
const beforeBinding=create();beforeBinding.folder('general','film');const bound=create(beforeBinding.snapshot()),stale=create(beforeBinding.snapshot());
bound.scope('general','film');stale.folder('general','site');stale.draft('general','Typed on the older display');stale.add('general',{id:'later-input',text:'A later input'});
bound.load(stale.snapshot(),{preserveSelection:'general'});stale.load(bound.snapshot());
for(const copy of [bound,stale]){assert.equal(copy.workingFolder('general'),projects.film.root+'/Assistant','A newer unbound copy cannot retarget a bound chat');assert.equal(copy.session('general').draft,'Typed on the older display');assert.equal(copy.session('general').items[0].id,'later-input');}

// Closing a Project does not remove its definition or history. If the actual
// Project is deleted, its chats immediately fall back to the Workspace list;
// old input access permission must not grant Workspace access.
const mutableProjects={...projects},dynamicEnv={workspaces:()=>workspaces,projects:()=>mutableProjects};
const removed=C.create({},dynamicEnv),removedId=removed.scope('general','film').id;
removed.draft('general','Keep after deletion');removed.add('general',{id:'kept-input',text:'Keep this input'});removed.contextPreference('general','film',true);
const historical=removed.exchange('general','Original request',{text:'Original reply'}),historicalFolder=historical.folder;
delete mutableProjects.film;
assert.equal(removed.scope('general',null).id,removedId,'Deleted Project history is immediately accessible in the Workspace');
assert.equal(removed.workingFolder('general'),workspaces.general.home+'/Assistant');assert.equal(removed.contextPreference('general',null),false);
assert(removed.chats('general').some(chat=>chat.id===removedId));assert.equal(removed.session('general').draft,'Keep after deletion');assert.equal(removed.session('general').items[0].text,'Keep this input');
assert.equal(removed.session('general').turns[0].folder,historicalFolder);assert.equal(removed.session('general').turns[0].project,'film','A historical turn retains its captured Project identity');
const afterDeletion=C.create(removed.snapshot(),dynamicEnv);afterDeletion.scope('general',null);
assert.equal(afterDeletion.session('general').id,removedId);assert.equal(afterDeletion.session('general').draft,'Keep after deletion');assert.equal(afterDeletion.contextPreference('general',null),false);assert.equal(afterDeletion.session('general').turns[0].folder,historicalFolder);assert.equal(afterDeletion.session('general').turns[0].project,'film');

// Capacity failures are explicit and lossless, including the first visit to
// another context. Concurrent creations may exceed the cap only on merge;
// loading them must preserve all chats instead of silently slicing to fifty.
const full=create();full.scope('general',null);full.draft('general','Keep the last draft');
for(let i=1;i<50;i++)assert(full.newChat('general'));
const active=full.session('general').id;full.draft('general','Capacity draft');
assert.equal(full.scope('general','film'),null);assert.equal(full.session('general').id,active);assert.equal(full.activeScope('general'),null);assert.equal(full.newChat('general','site'),null);assert.equal(full.session('general').draft,'Capacity draft');
assert.equal(create(full.snapshot()).chats('general',{all:true}).length,50);
const near=create();for(let i=1;i<49;i++)near.newChat('general');
const left=create(near.snapshot()),right=create(near.snapshot());const leftId=left.newChat('general').id,rightId=right.newChat('general').id;
left.draft('general','Left creation',leftId);right.draft('general','Right creation',rightId);left.load(right.snapshot());right.load(left.snapshot());
for(const copy of [left,right,create(left.snapshot())]){assert.equal(copy.chats('general',{all:true}).length,51);assert.equal(copy.session('general',leftId).draft,'Left creation');assert.equal(copy.session('general',rightId).draft,'Right creation');assert.equal(copy.newChat('general'),null);}
console.log('AI scopes passed: Workspace/Project chat and draft return, immutable folders, scoped access preferences, legacy migration, concurrent selections/content/drafts, source origins and lossless capacity.');
