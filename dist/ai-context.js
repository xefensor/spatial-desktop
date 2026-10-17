/* Local context and scripted demo conversations. No provider calls. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SpatialAIContext=api;})(globalThis,function(){
  'use strict';
  const M=typeof module==='object'&&module.exports?require('./working-memory.js'):globalThis.SpatialWorkingMemory;
  const A=typeof module==='object'&&module.exports?require('./assistant-files.js'):globalThis.SpatialAssistantFiles;
  const MIME='application/x-spatial-context';
  const clean=(value,max=2000)=>typeof value==='string'?value.slice(0,max):'';
  const address=value=>/^(https?:\/\/|\/)/i.test(clean(value))?clean(value):'';
  const inside=(path,folder)=>Boolean(folder&&(path===folder||path.startsWith(folder.replace(/\/$/,'')+'/')));
  // These labels describe the actual input available to the local demo. A link
  // is never described as downloaded page content, or a picture as parsed text.
  function representation(item={}){
    if(clean(item.text,12000).trim())return ['image','audio'].includes(item.kind)?'Saved caption / text only':'Saved text';
    return address(item.address||item.source?.address)?'Link and metadata only':'Metadata only';
  }
  function parents(values){return (Array.isArray(values)?values:[]).slice(0,24).filter(value=>value&&typeof value==='object'&&clean(value.itemId,180)).map(value=>({itemId:clean(value.itemId,180),versionId:clean(value.versionId,180),relation:'derivedFrom'}));}
  function attachment(value){
    const local=M.attachment(value);if(local)return local;
    const src=clean(value?.src,500),types={image:/\.(svg|png|jpe?g|webp)$/i,audio:/\.(wav|mp3|ogg)$/i,document:/\.html$/i};
    if(!types[value?.kind]?.test(src)||!/^media\/stash\/[\w./-]+$/.test(src)||src.split('/').includes('..'))return undefined;
    return {kind:value.kind,src,filename:clean(value.filename,160),mime:clean(value.mime,100),size:Math.max(0,Number(value.size)||0),format:clean(value.format,100),...(value.credit?{credit:clean(value.credit,200)}:{})};
  }
  function create(value={},environment){
    const records=Object.create(null);let clock=0;
    const tick=()=>clock=Math.max(Date.now(),clock+1);
    const stamp=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
    const profiles=()=>environment.workspaces(),projects=()=>environment.projects();
    function projectAt(path){return Object.keys(projects()).sort((a,b)=>projects()[b].root.length-projects()[a].root.length).find(id=>inside(path,projects()[id].root));}
    function normalize(item,workspace){
      if(!item||typeof item!=='object')return null;
      const sourceWorkspace=Object.hasOwn(profiles(),item.workspace)?item.workspace:workspace;
      const path=address(item.address),project=Object.hasOwn(projects(),item.project)?item.project:projectAt(path)||null;
      const fileKey=/^stash-[\w-]{1,160}$/.test(item.fileKey||'')?item.fileKey:'';
      const id=clean(item.id,160)||'context-'+Math.random().toString(36).slice(2);
      const result={id,title:clean(item.title,120)||'Dropped content',kind:clean(item.kind,30)||'text',text:clean(item.text,12000),why:clean(item.why,1000),source:M.source(item.source),savedAt:Math.max(0,Number(item.savedAt)||0),attachment:attachment(item.attachment),address:path,workspace:sourceWorkspace,project,app:clean(item.app,120),fileKey,filename:clean(item.filename,160),itemId:clean(item.itemId||item.fileId||id,180),fileId:clean(item.fileId,180),versionId:clean(item.versionId,180),versionNumber:Math.max(0,Math.min(99999,Math.floor(Number(item.versionNumber)||0))),capturedAt:Math.max(0,Number(item.capturedAt||item.savedAt)||0),contentTruncated:item.contentTruncated===true||String(item.text||'').length>12000,derivedFrom:parents(item.derivedFrom||item.relations)};
      result.representation=representation(result);return result;
    }
    function normalizeTurn(turn,workspace){
      if(!turn||typeof turn!=='object'||!clean(turn.request,4000).trim())return null;
      return {id:clean(turn.id,160)||'turn-'+Math.random().toString(36).slice(2),request:clean(turn.request,4000),title:clean(turn.title,120)||'Demo reply',text:clean(turn.text,12000),folder:address(turn.folder),project:Object.hasOwn(projects(),turn.project)?turn.project:null,workspace,example:turn.example===true,sources:(Array.isArray(turn.sources)?turn.sources:[]).slice(0,24).map(item=>normalize(item,workspace)).filter(Boolean),created:Math.max(0,Number(turn.created)||0),action:A?.action(turn.action)};
    }
    function normalizeChat(input,workspace,id){
      return {id,title:clean(input.title,80).trim()||'Chat',named:input.named===true,
        draft:clean(input.draft,4000),items:(Array.isArray(input.items)?input.items:[]).slice(0,24).map(item=>normalize(item,workspace)).filter(Boolean),
        turns:(Array.isArray(input.turns)?input.turns:[]).slice(-60).map(turn=>normalizeTurn(turn,workspace)).filter(Boolean),
        examplesSeen:input.examplesSeen===true,folderChosen:input.folderChosen===true||Object.hasOwn(projects(),input.workingProject),workingProject:Object.hasOwn(projects(),input.workingProject)?input.workingProject:null,
        created:stamp(input.created),updated:stamp(input.updated)};
    }
    function space(workspace){
      if(!Object.hasOwn(profiles(),workspace))throw new Error('Unknown workspace');
      if(!records[workspace]){
        const id='chat-'+workspace;
        records[workspace]={mode:'expanded',modeUpdated:0,activeChat:id,selectionUpdated:0,chats:{[id]:normalizeChat({title:'New chat'},workspace,id)}};
      }
      return records[workspace];
    }
    function session(workspace,id){
      const record=space(workspace),chat=record.chats[id||record.activeChat];
      if(!chat)return null;
      if(!Object.hasOwn(projects(),chat.workingProject))chat.workingProject=null;
      if(!Object.hasOwn(chat,'mode'))Object.defineProperty(chat,'mode',{enumerable:false,get:()=>record.mode});
      return chat;
    }
    function changed(chat){chat.updated=tick();}
    function titleFrom(chat,text){if(!chat.named&&!chat.turns.length)chat.title=clean(text,80).replace(/\s+/g,' ').trim()||chat.title;}
    function load(snapshot,options={}){
      Object.entries(snapshot?.sessions||{}).forEach(([workspace,input])=>{
        if(!Object.hasOwn(profiles(),workspace)||!input||typeof input!=='object')return;
        const existed=Boolean(records[workspace]),record=space(workspace);
        const multi=snapshot.version>=4&&input.chats&&typeof input.chats==='object';
        const entries=multi?Object.entries(input.chats).slice(0,50):[['chat-'+workspace,{...input,folderChosen:input.folderChosen??Boolean(input.workingProject||input.items?.length||input.turns?.length),title:input.turns?.[0]?.request||input.items?.[0]?.title||'Previous chat'}]];
        entries.forEach(([id,data])=>{
          if(!/^chat-[\w.-]{1,150}$/.test(id)||!data||typeof data!=='object')return;
          const updated=stamp(data.updated);clock=Math.max(clock,updated);
          if(record.chats[id]&&updated<record.chats[id].updated)return;
          if(record.chats[id]&&existed&&updated===record.chats[id].updated)return;
          record.chats[id]=normalizeChat(data,workspace,id);
        });
        const selectionUpdated=stamp(multi?input.selectionUpdated:input.updated),modeUpdated=stamp(multi?input.modeUpdated:input.updated);
        clock=Math.max(clock,selectionUpdated,modeUpdated);
        if(!existed||(workspace!==options.preserveSelection&&selectionUpdated>record.selectionUpdated)){
          const active=multi?input.activeChat:'chat-'+workspace;
          if(Object.hasOwn(record.chats,active))record.activeChat=active;
          record.selectionUpdated=selectionUpdated;
        }
        if(!existed||modeUpdated>record.modeUpdated){record.mode=snapshot.version>=2&&input.mode==='rail'?'rail':'expanded';record.modeUpdated=modeUpdated;}
      });
    }
    load(value);
    return {
      session,load,normalize,projectAt,
      chats(workspace){return Object.values(space(workspace).chats).sort((a,b)=>b.created-a.created||a.id.localeCompare(b.id)).map(chat=>({id:chat.id,title:chat.title,created:chat.created,updated:chat.updated,sources:chat.items.length,replies:chat.turns.length}));},
      newChat(workspace){const record=space(workspace);if(Object.keys(record.chats).length>=50)return null;
        const created=tick(),id='chat-'+created.toString(36)+'-'+Math.random().toString(36).slice(2);
        const chat=normalizeChat({title:'New chat '+(Object.keys(record.chats).length+1),created,updated:created,examplesSeen:true},workspace,id);
        record.chats[id]=chat;record.activeChat=id;record.selectionUpdated=tick();return session(workspace,id);},
      select(workspace,id){const record=space(workspace);if(!Object.hasOwn(record.chats,id))return false;record.activeChat=id;record.selectionUpdated=tick();return true;},
      rename(workspace,id,title){const chat=session(workspace,id),name=clean(title,80).trim();if(!chat||!name)return false;chat.title=name;chat.named=true;changed(chat);return true;},
      add(workspace,item,id){const record=session(workspace,id),entry=normalize(item,workspace);if(!record||!entry)return null;const duplicate=record.items.find(old=>old.id===entry.id);if(duplicate){record.items[record.items.indexOf(duplicate)]=entry;changed(record);return entry;}if(record.items.length>=24)return null;if(entry.project&&!record.workingProject&&!record.folderChosen){record.workingProject=entry.project;record.folderChosen=true;}if(!record.items.length)titleFrom(record,entry.title);record.items.push(entry);changed(record);return entry;},
      remove(workspace,id,chatId){const record=session(workspace,chatId);if(!record)return;record.items=record.items.filter(item=>item.id!==id);changed(record);},
      exchange(workspace,request,response,context={},id){const record=session(workspace,id);if(!record||record.turns.length>=60)return null;const turn=normalizeTurn({id:'turn-'+Math.random().toString(36).slice(2),request,title:response.title,text:response.text,folder:context.folder||projects()[record.workingProject]?.root||profiles()[workspace].home,project:context.project===undefined?record.workingProject:context.project,sources:context.sources||record.items,example:context.example,action:response.action,created:Date.now()},workspace);if(!turn)return null;titleFrom(record,request);record.turns.push(turn);changed(record);return turn;},
      action(workspace,turnId,value,chatId){const record=session(workspace,chatId),turn=record?.turns.find(t=>t.id===turnId);if(!turn)return null;turn.action=A?.action(value);changed(record);return turn;},
      examplesSeen(workspace){const record=session(workspace);record.examplesSeen=true;changed(record);},
      draft(workspace,text,id){const record=session(workspace,id);if(!record)return;record.draft=clean(text,4000);changed(record);},
      mode(workspace,mode){const record=space(workspace);record.mode=mode==='expanded'?'expanded':'rail';record.modeUpdated=tick();},
      folder(workspace,project,id){const record=session(workspace,id);if(!record)return;record.workingProject=Object.hasOwn(projects(),project)?project:null;record.folderChosen=true;changed(record);},
      workingFolder(workspace,id){const record=session(workspace,id);return projects()[record?.workingProject]?.root||profiles()[workspace].home;},
      snapshot(){const sessions={};Object.entries(records).forEach(([workspace,record])=>{const chat=session(workspace);sessions[workspace]={...record,draft:chat.draft,items:chat.items,turns:chat.turns,examplesSeen:chat.examplesSeen,workingProject:chat.workingProject,updated:Math.max(record.modeUpdated,record.selectionUpdated,...Object.values(record.chats).map(item=>item.updated))};});return JSON.parse(JSON.stringify({version:4,sessions}));}

    };
  }
  return {MIME,create,inside,representation};
});
