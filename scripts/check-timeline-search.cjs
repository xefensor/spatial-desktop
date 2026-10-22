const assert=require('node:assert/strict');
const T=require('../dist/timeline.js');
const day='2026-10-17',tomorrow='2026-10-18';
const at=(hour,minute=0,date=day)=>new Date(date+'T'+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+':00').getTime();
const event=(id,time,extra={})=>T.normalize({id,time,workspace:'work',project:'launch',projectName:'Website Launch',type:'file.open',title:'Checklist',path:'/work/launch/checklist.md',...extra});
const activity=[
  event('start',at(10),{type:'project.open',path:'',title:'Website Launch'}),
  event('read',at(10,5),{itemId:'checklist',itemVersion:'v1'}),
  event('used',at(10,8),{type:'assistant.use',title:'Review the checklist',itemId:'checklist',itemVersion:'v1',chatId:'launch-chat',turnId:'review'}),
  event('output',at(10,10),{type:'assistant.output',title:'Launch summary',itemId:'summary',itemVersion:'summary-v1',path:'/work/launch/Assistant/summary.md',sourceIds:['checklist']}),
  event('film',at(10,11),{project:'film',projectName:'Short Film',title:'Cut notes',path:'/work/film/notes.md'}),
  event('return',at(10,12),{title:'Checklist again'}),
  event('tomorrow',at(11,0,tomorrow),{title:'Next-day work',path:'/work/launch/tomorrow.md'})
];
const first=T.workSessions(activity)[0],ids=first.events.map(e=>e.id);
const notes=T.createSessionNotes();
notes.put(first,'Return to the orbital handoff before publishing.',1);
const noteFor=session=>notes.get(session.id,session.workspace)?.text||'';

let found=T.searchSessions(activity,{query:'ORBITAL HANDOFF',noteFor});
assert.equal(found.length,1,'Session notes are searchable even when no event metadata matches');
assert.equal(found[0].id,first.id);
assert.deepEqual(found[0].events.map(e=>e.id),ids,'Note results retain every input, output and context event');
assert.equal(found[0].total,4);
assert(found[0].matches.some(match=>match.kind==='note'&&/orbital handoff/i.test(match.text)),'The result explains that its saved session note matched');
assert.equal(T.searchSessions(activity,{query:'orbital handoff'}).length,0,'The engine does not invent missing notes or topics');
assert.equal(notes.get(first.id,'personal'),null,'A note cannot be retrieved under another Workspace');

const beforeClear=notes.snapshot();notes.put(first,'',2);notes.merge(beforeClear);
assert.equal(T.searchSessions(activity,{query:'orbital handoff',noteFor}).length,0,'Cleared notes and stale concurrent snapshots cannot keep a search hit alive');
notes.put(first,'Return to the orbital handoff before publishing.',3);
const persisted=T.createSessionNotes(JSON.parse(JSON.stringify(notes.snapshot())));
assert.equal(T.searchSessions(persisted.activity('work'),{query:'orbital handoff',noteFor:session=>persisted.get(session.id,'work')?.text||''}).length,1,'An annotated session remains searchable after leaving the rolling activity feed');
assert.equal(persisted.activity('personal').length,0);

const savedText='Opening context. '.repeat(30)+'The heliotrope milestone belongs to the saved launch checklist. '+'Trailing context. '.repeat(30);
const contentFor=e=>e.id==='read'?[{kind:'saved',text:savedText,title:'Checklist · recorded version',itemId:'checklist',path:e.path,versionId:'v1',eventId:e.id}]:[];
found=T.searchSessions(activity,{query:'heliotrope',contentFor});
assert.equal(found.length,1,'Available saved text can find a session with no metadata hit');
assert.deepEqual(found[0].events.map(e=>e.id),ids,'Content search retains surrounding work and recorded outputs');
assert.equal(found[0].matched,1,'Only the eligible event with matching content is counted');
const saved=found[0].matches.find(match=>match.kind==='saved');
assert(saved&&saved.text.includes('heliotrope'),'A bounded snippet includes the matching text even when it appears late in a file');
assert(saved.text.length<savedText.length,'Search explanations do not dump the entire file');
assert.equal(saved.title,'Checklist · recorded version');
assert.equal(saved.eventId,'read');assert.equal(saved.itemId,'checklist');assert.equal(saved.versionId,'v1');assert.equal(saved.path,'/work/launch/checklist.md');
assert.equal(T.searchSessions(activity,{query:'heliotrope'}).length,0,'Unavailable file text is not inferred from file names or prior results');

const currentFor=e=>e.id==='read'?[{kind:'current',text:'Current file contains a gentian milestone.',title:'Checklist · current file',itemId:'checklist',path:e.path,eventId:e.id}]:[];
const current=T.searchSessions(activity,{query:'gentian',contentFor:currentFor})[0].matches.find(match=>match.kind==='current');
assert(current&&current.text.includes('gentian'),'Current available text is identified separately from a recorded saved version');
assert(!current.versionId,'A current file result does not fabricate a historical version');

const byType=T.searchSessions(activity,{type:'assistant'});
assert.equal(byType[0].id,first.id);assert.equal(byType[0].matched,2);assert.equal(byType[0].total,4);
assert.deepEqual(byType[0].events.map(e=>e.id),ids,'Type filters preserve the original session context');
const requested=[];
const filtered=T.searchSessions(activity,{type:'assistant',query:'heliotrope',contentFor:e=>{requested.push(e.type);return contentFor(e);}});
assert.equal(filtered.length,0,'A file-only content hit cannot bypass the Assistant type filter');
assert(requested.every(type=>type.startsWith('assistant.')),'Content lookups are requested only for eligible event types');
const metadata=T.searchSessions(activity,{query:'Checklist'});
assert.equal(metadata[0].matched,2,'Existing event metadata search still counts each matching event once');
assert(metadata[0].matches.some(match=>match.kind==='event'),'Metadata results state their recorded-event match reason');
assert.deepEqual(metadata[0].events.map(e=>e.id),ids);
assert.equal(T.searchSessions(activity,{query:'checklist',contentFor:e=>e.id==='read'?[{kind:'saved',text:'checklist checklist',title:'Checklist',eventId:e.id,itemId:'checklist',versionId:'v1'}]:[]})[0].matched,2,'Several matching fields on one event never inflate its match count');
assert.equal(T.searchSessions(activity,{query:'checklist-v1-private-id'}).length,0,'Internal identifiers are not user-facing search metadata');
assert.deepEqual(T.searchSessions(activity,{query:' \n\t '}).map(s=>[s.id,s.matched]),T.searchSessions(activity).map(s=>[s.id,s.matched]),'A whitespace-only query behaves like no text filter');
assert.equal(T.searchSessions(activity,{query:'Website Launch'}).length,3,'Filtering cannot erase an intervening Project or day boundary and merge sessions');

const noteView=T.lanes(activity,[],{day:tomorrow,now:at(12,0,tomorrow),groupActivity:true,query:'orbital handoff',noteFor});
assert(noteView.days.includes(day),'Note-only matches make their older day reachable in day navigation');
assert(noteView.days.includes(tomorrow),'The selected day remains available even without a match');
const contentView=T.lanes(activity,[],{day:tomorrow,groupActivity:true,query:'heliotrope',contentFor});
assert(contentView.days.includes(day),'Content-only matches also contribute available search days');

const plan={...event('meeting',at(10),{title:'orbital handoff',type:'calendar.event',planned:true}),endTime:at(10,15)};
for(const expand of [false,true]){
  const view=T.lanes(activity,[plan],{day,now:at(12),groupActivity:true,query:'orbital handoff',noteFor,expandedSessions:expand?[first.id]:[],expandedEventSessions:expand?[first.id]:[]});
  assert.equal(view.activity.length,1,'A note match appears in the activity lane');
  assert.deepEqual(view.activity[0].session.events.map(e=>e.id),ids);
  assert.equal(view.activity[0].session.id,first.id);
  assert(view.activity[0].top>=0&&Number.isFinite(view.height),'Note-only matches establish valid time geometry even without matching activity metadata');
  assert.equal(view.plans.length,1);
  assert.equal(view.plans[0].top,view.ticks.find(t=>t.time===at(10)).top,'Meeting start shares the session time anchor');
  assert.equal(view.plans[0].top+view.plans[0].height,view.ticks.find(t=>t.time===at(10,15)).top,'Calendar end stays aligned when matched session materials and chronology expand');
}
const textOnly=T.lanes(activity,[],{day,groupActivity:true,query:'heliotrope',contentFor});
assert.equal(textOnly.activity.length,1);assert(textOnly.activity[0].top>=0&&textOnly.height>0,'A content-only hit reserves usable space without any matching metadata or calendar items');

console.log('Timeline search passed: saved notes and available text, explained matches, version identity, full-session context, type filters, stable boundaries, stale-note removal, older-day navigation and shared calendar geometry.');
