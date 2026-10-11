/* Scripted, local examples. No model, network requests or desktop actions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SpatialAIDemo=api;})(globalThis,function(){
  'use strict';
  const normalize=text=>String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const excerpt=item=>String(item.text||'').split(/\n+/).map(line=>line.trim()).filter(Boolean).slice(0,3).join(' ').slice(0,280);
  function reply(request,{items=[],folder='',project=''}={}){
    const query=normalize(request),sources=items.slice(0,6),readable=sources.filter(item=>excerpt(item)),name=project||'this workspace';
    const summary=readable.map(item=>item.title+': '+excerpt(item));
    if(/\b(delete|remove|send|publish|install|run|smaz|odesl|publik|spust)/.test(query))return {title:'Proposed action',text:'In a connected assistant, this request could produce a reviewable action for '+name+'.\n\nThis scripted demo does not send messages, change files or run commands. Working folder: '+folder};
    if(/\b(compare|difference|porovn|rozdil)/.test(query)){
      if(sources.length<2)return {title:'Compare sources',text:'Attach two sources to see the comparison example. Each source keeps its own workspace and project; the working folder stays '+folder+'.'};
      const [a,b]=sources,words=item=>new Set(normalize(excerpt(item)).match(/[\p{L}\p{N}]{4,}/gu)||[]),shared=[...words(a)].filter(word=>words(b).has(word));
      return {title:'Source comparison',text:sources.slice(0,2).map(item=>item.title+'\n'+(excerpt(item)||'Only its title and file metadata are available in this demo.')).join('\n\n')+'\n\n'+(shared.length?'Shared terms: '+shared.slice(0,6).join(', ')+'.':'These excerpts do not share an obvious topic.')+'\nKeep the original sources attached while deciding what to use.'};
    }
    if(/\b(plan|checklist|task|next|todo|krok|ukol)/.test(query))return {title:'Suggested checklist',text:'A proposed next pass for '+name+':\n\n'+(readable.length?readable.slice(0,4).map((item,index)=>(index+1)+'. Review '+item.title+' — '+excerpt(item)).join('\n'): '1. Choose one concrete outcome for this session.\n2. Open the files and notes you need.\n3. Work on the smallest useful next step.')+'\n'+(readable.length?Math.min(readable.length,4)+1:4)+'. Keep the useful result in Stash, then check it before sharing.\n\nThis is a draft; no tasks or files have been created.'};
    if(/\b(photo|image|picture|audio|transcri|fot|obraz|zvuk|prepis)/.test(query)||(!readable.length&&sources.some(item=>['image','audio'].includes(item.kind)))){
      const media=sources.filter(item=>['image','audio'].includes(item.kind));
      return {title:'Media workflow example',text:(media.length?media.map(item=>item.title+' — '+item.kind+(excerpt(item)?'\nSaved caption: '+excerpt(item):'')).join('\n\n'):'Attach a photo or audio file to carry its origin into the conversation.')+'\n\nA connected assistant could propose an image description or an audio transcript beside its source. You could review that text and drag it into Stash. This demo does not inspect pixels or listen to audio.'};
    }
    if(/\b(draft|write|rewrite|napi|poznam)/.test(query))return {title:'Draft project note',text:'Working note for '+name+'\n\n'+(summary.length?summary.join('\n\n'):'Goal: finish one useful piece of work.\nNext: collect the sources, make a first pass, and review the result.')+'\n\nNext review: confirm what is ready and what still needs testing.'};
    if(summary.length)return {title:'Source summary',text:summary.join('\n\n')+(sources.length>readable.length?'\n\nOther attachments are available as references; their file contents have not been read.':'')};
    return {title:'Context example',text:'Working folder: '+folder+'\n\n'+(sources.length?'Attached: '+sources.map(item=>item.title).join(', ')+'.\nThis demo only has the text and metadata explicitly attached.':'Drag a note, file or app into this Area to supply context.')+'\n\nTry asking for a summary, a checklist, a draft note or a comparison. Replies use fixed local rules, not an AI model.'};
  }
  return {reply};
});
