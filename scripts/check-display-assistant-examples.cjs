const assert=require('node:assert/strict');
const Examples=require('../dist/display-assistant-examples.js');
const Home=require('../dist/home-folders.js');

const definitions=Examples.list();
assert.deepEqual(definitions.map(example=>example.id),['checklist','image','compare']);
definitions[0].title='Changed outside';assert.notEqual(Examples.list()[0].title,'Changed outside','Examples cannot be renamed by a UI consumer');
assert.equal(Examples.checklistFromBrief('Context\n- One\n- Two\n'), '# Launch checklist\n\n- [ ] One\n- [ ] Two\n');
assert.throws(()=>Examples.checklistFromBrief('No explicit tasks'),/explicit bullet list/);
assert.deepEqual(Examples.compareLines('same\nrepeat\nrepeat\nlast\n','same\nrepeat\nnew\nlast\n'),[{kind:'removed',line:3,text:'repeat'},{kind:'added',line:3,text:'new'}],'Repeated lines are compared in order, not collapsed to a set');
assert.deepEqual(Examples.compareLines('a\r\nb\r\n','a\nb\n'),[]);
assert.throws(()=>Examples.compareLines('line\n'.repeat(401),'short'),/400 lines/);
assert(Examples.comparisonText([]).includes('No added lines.'));

function fixture(){
  const files=Home.create(),notes=[],chats=[],turns=[],conversions=[],previews=[];let sequence=0,current=true;
  const tools={workspace:'work',folder:'/Work/Project',isCurrent:()=>current,check(){if(!current)throw Error('Context changed.');},
    async prepareImage(asset){assert.equal(asset,Examples.fixtures.image);return {kind:'image',key:'stash-fixture-photo',filename:'photo.jpg',mime:'image/jpeg',size:123};},
    startChat(title){const chat={chatId:'chat-'+(++sequence),title};chats.push(chat);return chat;},
    save(name,text,options={}){const file=files.add(tools.folder,name,{workspace:tools.workspace,content:text,attachment:options.attachment,itemId:'file-'+(++sequence)});return {id:file.itemId,itemId:file.itemId,title:file.name,filename:file.name,text:file.content,address:file.path,attachment:file.attachment,related:options.related};},
    attach(items){return items.map(item=>({...item,versionId:'retained-'+item.id}));},
    note(title,text){notes.push({title,text});return 'notes-'+notes.length;},
    turn(request,response,details){const turn={id:'turn-'+(++sequence),request,...response,...details};turns.push(turn);return turn;},
    showFile(item){previews.push(item);return 'preview-'+previews.length;},
    async proposeConversion(options){conversions.push(options);return {id:'review-'+conversions.length};}
  };
  return {tools,files,notes,chats,turns,conversions,previews,stale:()=>{current=false;}};
}

(async()=>{
  const f=fixture();
  const first=await Examples.run('checklist',f.tools);
  assert.equal(first.status,'done');assert.equal(first.outputs.length,2);assert.equal(f.chats.length,1);assert.equal(f.notes.length,2);
  const saved=f.files.list(f.tools.folder),source=saved.find(file=>file.name==='Example launch brief.md'),checklist=saved.find(file=>file.name==='Example launch checklist.md');
  assert(source&&checklist);assert.equal(source.content,Examples.fixtures.brief);assert.equal(checklist.content,Examples.checklistFromBrief(source.content));
  assert.equal(f.turns[0].sources[0].text,source.content,'The chat cites the actual retained source text');
  assert.equal(f.notes[1].text,checklist.content,'The editable output and saved output start from the same computed text');
  assert(f.turns[0].text.includes(f.tools.folder+'/'+checklist.name));
  await Examples.run('checklist',f.tools);
  assert.equal(f.chats.length,2,'Every run opens a new chat');assert.equal(f.files.list(f.tools.folder).length,4,'A second run retains the earlier source and output');
  assert(f.files.list(f.tools.folder).some(file=>file.name==='Example launch checklist (2).md'));
  assert.equal(f.files.list(f.tools.folder).find(file=>file.name==='Example launch checklist.md').content,checklist.content);

  const c=fixture(),comparison=await Examples.run('compare',c.tools);
  assert.equal(comparison.status,'done');assert.equal(c.notes.length,3);
  const compared=c.files.list(c.tools.folder),before=compared.find(file=>file.name.includes('before')),after=compared.find(file=>file.name.includes('after')),report=compared.find(file=>file.name.includes('comparison'));
  assert.equal(report.content,Examples.comparisonText(Examples.compareLines(before.content,after.content)));
  assert.equal(c.turns[0].sources.length,2);assert(c.turns[0].sources.every(source=>source.versionId));
  assert(report.content.includes('Version 0.4'));assert(report.content.includes('Version 0.5'));
  assert(report.content.includes('Assistant can prepare an editable checklist.'));
  assert(!report.content.includes('- Line 4: The desktop map shows open windows.'),'Unchanged text is not reported as changed');

  const image=fixture(),review=await Examples.run('image',image.tools);
  assert.equal(review.status,'needs-you');assert.equal(image.files.list(image.tools.folder).length,1,'Starting an image example saves its original, not a converted output');
  assert.equal(image.previews[0].attachment.key,'stash-fixture-photo');assert.equal(image.conversions.length,1);
  const proposal=image.conversions[0];assert.equal(proposal.format,'webp');assert.equal(proposal.destination,image.tools.folder);assert.equal(proposal.folder,image.tools.folder);assert.equal(proposal.workspace,'work');assert.equal(proposal.chatId,review.chatId);assert(proposal.items[0].versionId);
  assert.equal(proposal.items[0].address,image.previews[0].address,'The real saved original is both shown and passed to conversion');
  assert.equal(proposal.isCurrent(),true);

  const stale=fixture();stale.tools.prepareImage=async()=>{stale.stale();return {kind:'image',key:'stash-photo'};};
  await assert.rejects(Examples.run('image',stale.tools),/Context changed/);
  assert.equal(stale.chats.length,0);assert.equal(stale.files.snapshot().files.length,0,'A Workspace change during image preparation publishes no fixtures');
  const full=fixture();full.tools.startChat=()=>{throw Error('Chat limit reached');};
  await assert.rejects(Examples.run('checklist',full.tools),/Chat limit/);assert.equal(full.files.snapshot().files.length,0,'The chat capacity is checked before saving sample files');
  await assert.rejects(Examples.run('missing',fixture().tools),/available Assistant examples/);
  console.log('Assistant display examples: retained sources, exact derived results, fresh chats, file preservation and async context checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
