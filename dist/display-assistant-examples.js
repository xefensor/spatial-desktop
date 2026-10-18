/* Explicit, local Assistant examples. Inputs and computed results are real
   saved files; no sample claims to inspect a user's existing documents. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SpatialDisplayAssistantExamples=api;})(globalThis,function(){
  'use strict';
  const definitions=[
    {id:'checklist',title:'Turn a brief into a checklist',prompt:'Turn this sample launch brief into an editable checklist.',input:'A short sample launch brief',outcome:'A source note, editable checklist and saved Markdown copy'},
    {id:'image',title:'Convert an image for the web',prompt:'Convert the attached keyboard photograph to WebP and keep the original.',input:'A bundled keyboard photograph',outcome:'A saved original, image preview and a WebP conversion to review'},
    {id:'compare',title:'Compare two text versions',prompt:'Compare these two sample release notes and show exactly which lines changed.',input:'Two short sample release notes',outcome:'Both versions, an exact line comparison and a saved report'}
  ];
  const fixtures=Object.freeze({
    brief:'# Sample website launch brief\n\nPrepare a small project page for Friday.\n\nDeliverables\n- Choose a cover image.\n- Write a short project introduction.\n- Add a link to the playable demo.\n- Check the page on a phone.\n- Send the preview for review.\n',
    before:'# Sample release notes\n\nVersion 0.4\nThe desktop map shows open windows.\nAssistant can open a briefing note.\nSide space keeps references visible.\n',
    after:'# Sample release notes\n\nVersion 0.5\nThe desktop map shows open windows.\nAssistant can prepare an editable checklist.\nSide space keeps references visible.\nYou can review a WebP conversion before running it.\n',
    image:'images/philosophy/keychron-profile.jpg'
  });
  function checklistFromBrief(text){
    const tasks=String(text).split(/\r?\n/).map(line=>/^\s*[-*]\s+(.+?)\s*$/.exec(line)?.[1]).filter(Boolean);
    if(!tasks.length)throw Error('This local example needs an explicit bullet list.');
    return '# Launch checklist\n\n'+tasks.map(task=>'- [ ] '+task).join('\n')+'\n';
  }
  // An exact line diff. The LCS retains ordering and repeated lines instead of
  // pretending that this controlled local example understands arbitrary prose.
  function compareLines(before,after){
    const lines=value=>String(value).replace(/\r\n/g,'\n').replace(/\n$/,'').split('\n');
    const a=lines(before),b=lines(after);
    if(a.length>400||b.length>400)throw Error('The local comparison supports up to 400 lines per version.');
    const table=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
    for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i][j]=a[i]===b[j]?1+table[i+1][j+1]:Math.max(table[i+1][j],table[i][j+1]);
    const edits=[];let i=0,j=0;
    while(i<a.length||j<b.length){
      if(i<a.length&&j<b.length&&a[i]===b[j]){i++;j++;}
      else if(i<a.length&&(j===b.length||table[i+1][j]>=table[i][j+1])){edits.push({kind:'removed',line:i+1,text:a[i++]});}
      else edits.push({kind:'added',line:j+1,text:b[j++]});
    }
    return edits;
  }
  function comparisonText(edits){
    const added=edits.filter(edit=>edit.kind==='added'),removed=edits.filter(edit=>edit.kind==='removed');
    return '# Release note comparison\n\nExact line comparison of the two supplied sample files. No semantic or image analysis is performed.\n\n'+
      '## Removed from the first version\n'+(removed.length?removed.map(edit=>'- Line '+edit.line+': '+(edit.text||'(blank line)')).join('\n'):'No removed lines.')+'\n\n'+
      '## Added in the second version\n'+(added.length?added.map(edit=>'- Line '+edit.line+': '+(edit.text||'(blank line)')).join('\n'):'No added lines.')+'\n';
  }
  async function run(id,tools){
    const definition=definitions.find(example=>example.id===id);if(!definition)throw Error('Choose one of the available Assistant examples.');
    tools.check();
    // Retain the bundled image before publishing metadata, then re-check the
    // originating display, Workspace and user control after every async step.
    const image=id==='image'?await tools.prepareImage(fixtures.image):null;tools.check();
    const chat=tools.startChat(definition.title),outputs=[];tools.check();
    const openNote=(title,text)=>{tools.check();const result=tools.note(title,text);if(!result)throw Error('Note Editor could not open.');outputs.push(result);return result;};
    if(id==='checklist'){
      const source=tools.save('Example launch brief.md',fixtures.brief),text=checklistFromBrief(source.text),sources=tools.attach([source]);
      const result=tools.save('Example launch checklist.md',text,{related:sources});
      openNote('Sample launch brief',source.text);openNote('Launch checklist',text);
      const turn=tools.turn(definition.prompt,{title:'Checklist ready',text:text+'\nSaved as: '+result.address+'\n\nThe five checklist items were copied from the explicit bullets in the attached sample brief. Edit the checklist in the Note Editor.'},{sources});
      tools.check();return {status:'done',result:'Opened the sample brief and an editable checklist. A Markdown copy is saved in '+tools.folder+'.',outputs,chatId:chat.chatId,turnId:turn.id};
    }
    if(id==='compare'){
      const before=tools.save('Example release notes before.md',fixtures.before),after=tools.save('Example release notes after.md',fixtures.after);
      const edits=compareLines(before.text,after.text),text=comparisonText(edits),sources=tools.attach([before,after]),report=tools.save('Example release comparison.md',text,{related:sources});
      openNote('Release notes · before',before.text);openNote('Release notes · after',after.text);openNote('Release comparison',text);
      const turn=tools.turn(definition.prompt,{title:'Exact changes',text:text+'\nSaved report: '+report.address},{sources});
      tools.check();return {status:'done',result:'Compared both supplied sample files and opened the exact changes. The report is saved in '+tools.folder+'.',outputs,chatId:chat.chatId,turnId:turn.id};
    }
    const source=tools.save('Example keyboard photo.jpg','',{attachment:image}),sources=tools.attach([source]);
    tools.check();const preview=tools.showFile(source);if(!preview)throw Error('The saved image preview could not open.');outputs.push(preview);
    const turn=await tools.proposeConversion({request:definition.prompt,items:sources,workspace:tools.workspace,chatId:chat.chatId,folder:tools.folder,format:'webp',destination:tools.folder,isCurrent:tools.isCurrent});
    tools.check();return {status:'needs-you',result:'The saved original is open. Review its destination in chat, then choose Convert to create a real WebP copy.',outputs,chatId:chat.chatId,turnId:turn.id};
  }
  return {list:()=>definitions.map(example=>({...example})),fixtures,checklistFromBrief,compareLines,comparisonText,run};
});
