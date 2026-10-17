const assert=require('node:assert/strict');
const T=require('../dist/timeline.js');
const day='2026-10-17',at=(h,m=0)=>new Date(day+'T'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00').getTime();
const event=(id,time,extra={})=>T.normalize({id,time,workspace:'work',project:'tax',projectName:'Taxes 2026',type:'file.open',path:'/work/tax/chart.svg',title:'Chart',...extra});
const activity=[
  event('opened',at(10),{type:'project.open',path:''}),
  event('read',at(10,5)),
  event('saved',at(10,10),{type:'stash.save',stashId:'chart',itemId:'canonical-chart'}),
  event('used',at(10,12),{type:'assistant.use',chatId:'tax-chat',turnId:'turn-1',itemId:'canonical-chart',itemVersion:'v1',sourceIds:['canonical-chart']}),
  event('output',at(10,15),{type:'assistant.output',itemId:'summary',outputId:'summary',path:''}),
  event('other',at(10,18),{project:'film',projectName:'Short Film'}),
  event('back',at(10,20)),
  event('break',at(11)),
  event('general',at(11,1),{workspace:'general'}),
  event('next-day',at(23,59)+120000),
  event('calendar',at(12),{type:'calendar.event',planned:true}),
  event('task',at(12),{type:'task.due'}),
  event('reminder',at(12),{type:'reminder.due'})
];
const sessions=T.workSessions(activity);
assert.equal(sessions[0].events.length,5,'Nearby work in one explicit context becomes one session');
assert.deepEqual(sessions[0].events.map(event=>event.id),['opened','read','saved','used','output'],'All exact events and their chronological order remain available');
assert.equal(sessions[0].time,at(10));assert.equal(sessions[0].endTime,at(10,15));
assert.equal(sessions[0].outputs,1);assert.equal(sessions[0].materials,3,'The same canonical item is counted once across save/use');
assert.equal(sessions.length,6,'A context switch, long pause, Workspace change and day boundary all separate sessions');
assert(!sessions.some(session=>session.events.some(event=>['calendar.event','task.due','reminder.due'].includes(event.type))),'Plans never join work sessions');
assert.equal(T.workSessions([event('old',at(10)),event('new',at(10,2),{type:'project.open'})]).length,2,'An explicit project opening starts a new session even in the same project');
assert.equal(T.workSessions([event('example',at(10),{example:true}),event('real',at(10,1))]).length,2,'Demo examples never acquire a user’s real events');

const plan={...event('meeting',at(10,5)),planned:true,type:'calendar.event',endTime:at(10,15)};
const grouped=T.lanes(activity.filter(event=>event.workspace==='work'&&!event.planned),[plan],{day,groupActivity:true});
assert.equal(grouped.plans.length,1,'Grouping preserves the separate plans lane');
assert.equal(grouped.plans[0].top+grouped.plans[0].height,grouped.ticks.find(tick=>tick.time===at(10,15)).top,'A calendar end remains on its exact shared time anchor');
const group=grouped.activity.find(row=>row.session?.events.some(event=>event.id==='used'));
assert(group.session&&group.session.total===5);
const expanded=T.lanes(activity.filter(event=>event.workspace==='work'&&!event.planned),[plan],{day,groupActivity:true,expandedSessions:[group.session.id]});
assert(expanded.height>grouped.height,'Expanding reserves real height for all exact actions and the note');
assert.equal(expanded.plans[0].top+expanded.plans[0].height,expanded.ticks.find(tick=>tick.time===at(10,15)).top,'Expanding affects both lanes together without moving calendar timestamps');
const filtered=T.lanes(activity.filter(event=>event.workspace==='work'),[],{day,groupActivity:true,query:'canonical-chart'});
// Item IDs are implementation details and do not pollute text search.
assert.equal(filtered.activity.length,0);
const byType=T.lanes(activity.filter(event=>event.workspace==='work'),[],{day,groupActivity:true,type:'assistant'});
assert.equal(byType.activity[0].session.id,group.session.id,'Filtering keeps the original session identity');
assert.equal(byType.activity[0].session.total,5);assert.equal(byType.activity[0].session.matched,2);
assert(byType.activity[0].top>=0,'A session whose first matching event is later still has a valid time anchor');
const contextFilter=T.lanes([event('a',at(10)),event('intervening',at(10,1),{project:'film',projectName:'Film'}),event('b',at(10,2))],[],{day,groupActivity:true,query:'Taxes'});
assert.equal(contextFilter.activity.length,2,'A filter cannot hide a context switch and then merge the surrounding sessions');

const notes=T.createSessionNotes(),first=sessions[0];
assert(notes.put(first,'Continue by checking the source figures.',1));
assert.equal(notes.get(first.id,'general'),null,'Notes are readable only in their Workspace');
const reloaded=T.createSessionNotes(JSON.parse(JSON.stringify(notes.snapshot())));
assert.equal(reloaded.get(first.id,'work').text,'Continue by checking the source figures.');
const rolling=T.create();activity.filter(event=>event&&!event.planned).forEach(event=>rolling.add(event));
for(let i=0;i<400;i++)rolling.add(event('later-'+i,at(13)+i*4000,{path:'/later/'+i}));
assert(!rolling.list('work').some(event=>event.id==='opened'),'The ordinary feed still has its documented retention bound');
assert.equal(reloaded.activity('work').length,5,'An explicitly annotated session keeps its exact events outside the rolling feed');
assert.equal(reloaded.activity('general').length,0);
const stale=reloaded.snapshot();reloaded.put(first,'',2);reloaded.merge(stale);
assert.equal(reloaded.get(first.id,'work').text,'','An older display cannot resurrect a removed note');
assert.equal(reloaded.activity('work').length,0,'Clearing a note releases its retained activity snapshot');
assert.equal(T.createSessionNotes({malformed:{id:'x',workspace:'work',updated:1,events:[{type:'keystrokes'}]}}).activity('work').length,0,'Invalid imported note events are discarded');

const assistantModel=T.create();
assistantModel.add(event('first-turn',at(14),{type:'assistant.use',chatId:'chat',turnId:'one',itemId:'chart',itemVersion:'v1',sourceIds:['chart']}));
assistantModel.add(event('second-turn',at(14)+1000,{type:'assistant.use',chatId:'chat',turnId:'two',itemId:'chart',itemVersion:'v1',sourceIds:['chart']}));
assert.equal(assistantModel.list('work').length,2,'Distinct Assistant turns never coalesce into one event');
assert.deepEqual(T.create(assistantModel.snapshot()).list('work')[0].sourceIds,['chart']);
console.log('Timeline sessions passed: explicit context grouping, exact events, plan separation, filter stability, shared geometry, Workspace privacy, retained annotations and Assistant lineage IDs.');
