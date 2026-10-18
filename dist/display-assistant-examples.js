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
  function checklistFromBrief(text,style='simple'){
    const tasks=String(text).split(/\r?\n/).map(line=>/^\s*[-*]\s+(.+?)\s*$/.exec(line)?.[1]).filter(Boolean);
    if(!tasks.length)throw Error('This local example needs an explicit bullet list.');
    if(style==='grouped')return '# Launch checklist\n\n## Prepare the page\n'+tasks.slice(0,3).map(task=>'- [ ] '+task).join('\n')+'\n\n## Check and share\n'+tasks.slice(3).map(task=>'- [ ] '+task).join('\n')+'\n';
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
  function comparisonText(edits,style='full'){
    const added=edits.filter(edit=>edit.kind==='added'),removed=edits.filter(edit=>edit.kind==='removed');
    return '# Release note comparison\n\nExact line comparison of the two supplied sample files. No semantic or image analysis is performed.\n\n'+
      (style==='additions'?'This report shows only added lines; the supplied originals retain the complete before and after text.\n\n':'## Removed from the first version\n'+(removed.length?removed.map(edit=>'- Line '+edit.line+': '+(edit.text||'(blank line)')).join('\n'):'No removed lines.')+'\n\n')+
      '## Added in the second version\n'+(added.length?added.map(edit=>'- Line '+edit.line+': '+(edit.text||'(blank line)')).join('\n'):'No added lines.')+'\n';
  }
  async function run(id,tools){
    const definition=definitions.find(example=>example.id===id);if(!definition)throw Error('Choose one of the available Assistant examples.');
    tools.check();
    const chat=tools.startChat(definition.title),outputs=[];tools.check();
    let turn=null;
    const update=response=>{tools.check();if(turn)turn=tools.update?tools.update(turn.id,response):Object.assign(turn,response);return turn;};
    const step=async(stage,label,detail,number,action)=>{
      tools.check();if(tools.step)await tools.step({stage,label,detail,step:number,total:4});tools.check();
      const result=action?await action():undefined;tools.check();tools.completed?.({label,detail});return result;
    };
    const openNote=(title,text)=>{tools.check();const result=tools.note(title,text);if(!result)throw Error('Note Editor could not open.');outputs.push(result);return result;};
    const ask=async question=>{
      update({title:'A quick question',text:question.introduction+'\n\n'+question.prompt+'\n'+question.options.map(option=>'- '+option.label+': '+option.description).join('\n')});
      const choice=tools.ask?await tools.ask(question):question.options[0].id;tools.check();
      const selected=question.options.find(option=>option.id===choice);if(!selected)throw Error('Choose one of the displayed options.');
      turn=tools.turn(selected.label,{title:'Choice received',text:selected.description+' I will save the result in '+tools.folder+'.'},{sources:question.sources});return choice;
    };
    // Public plans and observable actions are shown while they happen. These
    // are scripted local workflows, not private model reasoning or fake work.
    if(id!=='image')turn=tools.turn(definition.prompt,{title:'Here is the plan',text:'I will open the supplied sample material, ask how you want the result arranged, and save a new file in '+tools.folder+'. The original sample will stay available.'},{sources:[]});
    await step('plan','Preparing a working copy','The example uses explicit bundled inputs and saves its own files in '+tools.folder+'.',1);
    if(id==='checklist'){
      let source,sources;
      await step('source','Opening the launch brief','I will retain the sample brief, attach it to this chat and open it in Note Editor.',2,()=>{
        source=tools.save('Example launch brief.md',fixtures.brief);sources=tools.attach([source]);openNote('Sample launch brief',source.text);
      });
      const style=await ask({id:'checklist-layout',introduction:'The brief has five explicit deliverables. I can copy all five without inventing new tasks.',prompt:'How would you like the checklist arranged?',sources,
        options:[{id:'simple',label:'One simple list',description:'Keep the five tasks in their original order.'},{id:'grouped',label:'Group by stage',description:'Separate preparing the page from checking and sharing it.'}]});
      let text,result;
      await step('output','Creating your checklist','Using your chosen arrangement and the five bullets from the retained brief.',3,()=>{
        text=checklistFromBrief(source.text,style);result=tools.save('Example launch checklist.md',text,{related:sources});openNote('Launch checklist',text);
      });
      await step('output','Saving the handoff','The editable Note Editor copy and the saved Markdown file start with the same text.',4,()=>{
        update({title:'Checklist ready',text:text+'\nSaved as: '+result.address+'\n\nAll five tasks came from the attached sample brief. The Note Editor is a working copy; later edits there do not rewrite this saved Markdown file.'});
      });
      return {status:'done',result:'Your '+(style==='grouped'?'grouped':'simple')+' checklist is open. A Markdown copy is saved in '+tools.folder+'.',outputs,chatId:chat.chatId,turnId:turn.id};
    }
    if(id==='compare'){
      let before,after,sources;
      await step('source','Opening both versions','I will retain each supplied version separately so that the comparison can be checked.',2,()=>{
        before=tools.save('Example release notes before.md',fixtures.before);after=tools.save('Example release notes after.md',fixtures.after);sources=tools.attach([before,after]);
        openNote('Release notes · before',before.text);openNote('Release notes · after',after.text);
      });
      const style=await ask({id:'comparison-scope',introduction:'Both originals are open. This example compares exact lines; it does not infer the meaning of the changes.',prompt:'What should the report include?',sources,
        options:[{id:'full',label:'All changed lines',description:'Show both removed and added lines with their original line numbers.'},{id:'additions',label:'Only what is new',description:'Show added lines and keep the complete originals alongside the report.'}]});
      let text,report;
      await step('output','Comparing the supplied text','Calculating the exact ordered line differences from the retained versions.',3,()=>{
        text=comparisonText(compareLines(before.text,after.text),style);report=tools.save('Example release comparison.md',text,{related:sources});openNote('Release comparison',text);
      });
      await step('output','Saving the comparison report','The report keeps the source links and records the scope you selected.',4,()=>{
        update({title:'Comparison ready',text:text+'\nSaved report: '+report.address});
      });
      return {status:'done',result:'The '+(style==='additions'?'additions-only':'complete changed-line')+' report is open and saved in '+tools.folder+'.',outputs,chatId:chat.chatId,turnId:turn.id};
    }
    let image,source,sources;
    await step('source','Retaining the original photograph','Loading the bundled JPEG into this browser before publishing its file entry.',2,async()=>{image=await tools.prepareImage(fixtures.image);tools.check();});
    await step('source','Opening the saved photograph','The original will stay unchanged. The conversion will create a separate file.',3,()=>{
      source=tools.save('Example keyboard photo.jpg','',{attachment:image});sources=tools.attach([source]);
      const preview=tools.showFile(source);if(!preview)throw Error('The saved image preview could not open.');outputs.push(preview);
    });
    await step('output','Preparing a conversion for review','Check the destination in chat, then choose Convert when you want to create the WebP copy.',4);
    turn=await tools.proposeConversion({request:definition.prompt,items:sources,workspace:tools.workspace,chatId:chat.chatId,folder:tools.folder,format:'webp',destination:tools.folder,isCurrent:tools.isCurrent});
    tools.check();return {status:'needs-you',result:'The saved original is open. Review its destination in chat, then choose Convert to create a real WebP copy.',outputs,chatId:chat.chatId,turnId:turn.id};
  }
  return {list:()=>definitions.map(example=>({...example})),fixtures,checklistFromBrief,compareLines,comparisonText,run};
});
