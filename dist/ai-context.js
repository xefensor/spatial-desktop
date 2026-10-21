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
      const result={id,title:clean(item.title,120)||'Dropped content',kind:clean(item.kind,30)||'text',text:clean(item.text,12000),why:clean(item.why,1000),source:M.source(item.source),origin:item.origin==='automatic'?'automatic':'manual',savedAt:Math.max(0,Number(item.savedAt)||0),attachment:attachment(item.attachment),address:path,workspace:sourceWorkspace,project,app:clean(item.app,120),fileKey,filename:clean(item.filename,160),itemId:clean(item.itemId||item.fileId||id,180),fileId:clean(item.fileId,180),versionId:clean(item.versionId,180),versionNumber:Math.max(0,Math.min(99999,Math.floor(Number(item.versionNumber)||0))),capturedAt:Math.max(0,Number(item.capturedAt||item.savedAt)||0),contentTruncated:item.contentTruncated===true||String(item.text||'').length>12000,derivedFrom:parents(item.derivedFrom||item.relations)};
      result.representation=representation(result);return result;
    }
    function normalizeTurn(turn,workspace){
      if(!turn||typeof turn!=='object'||(!clean(turn.request,4000).trim()&&!(turn.assistantOnly===true&&clean(turn.text,12000).trim())))return null;
      const outputs=(Array.isArray(turn.outputs)?turn.outputs:[]).slice(0,12).flatMap(output=>{if(!output||typeof output.path!=='string'||!output.path.startsWith('/'))return [];let path;try{path=A.path(output.path);}catch{return [];}if(path!==output.path||!inside(path,address(turn.folder))||path===turn.folder)return [];return [{path,title:clean(output.title,160)||path.split('/').at(-1),kind:['note','image','file'].includes(output.kind)?output.kind:'file'}];});
      return {id:clean(turn.id,160)||'turn-'+Math.random().toString(36).slice(2),request:clean(turn.request,4000),title:clean(turn.title,120)||'Demo reply',text:clean(turn.text,12000),folder:address(turn.folder),project:clean(turn.project,160)||null,workspace,example:turn.example===true,assistantOnly:turn.assistantOnly===true,presentation:['plan','question','result'].includes(turn.presentation)?turn.presentation:'',outputs,sources:(Array.isArray(turn.sources)?turn.sources:[]).slice(0,24).map(item=>normalize(item,workspace)).filter(Boolean),created:Math.max(0,Number(turn.created)||0),action:A?.action(turn.action)};
    }
    function normalizeChat(input,workspace,id){
      const contentUpdated=stamp(input.contentUpdated??input.updated),draftUpdated=stamp(input.draftUpdated??input.updated),scopeUpdated=stamp(input.scopeUpdated);
      const scopeBound=input.scopeBound===true,scopeProject=Object.hasOwn(projects(),input.scopeProject)?input.scopeProject:null;
      return {id,title:clean(input.title,80).trim()||'Chat',named:input.named===true,
        draft:clean(input.draft,4000),items:(Array.isArray(input.items)?input.items:[]).slice(0,24).map(item=>normalize(item,workspace)).filter(Boolean),
        turns:(Array.isArray(input.turns)?input.turns:[]).slice(-60).map(turn=>normalizeTurn(turn,workspace)).filter(Boolean),
        examplesSeen:input.examplesSeen===true,folderChosen:scopeBound||input.folderChosen===true||Object.hasOwn(projects(),input.workingProject),workingProject:scopeBound?scopeProject:Object.hasOwn(projects(),input.workingProject)?input.workingProject:null,
        scopeBound,scopeProject,scopeUpdated,created:stamp(input.created),updated:Math.max(stamp(input.updated),contentUpdated,draftUpdated,scopeUpdated),contentUpdated,draftUpdated};
    }
    function space(workspace){
      if(!Object.hasOwn(profiles(),workspace))throw new Error('Unknown workspace');
      if(!records[workspace]){
        const id='chat-'+workspace;
        records[workspace]={mode:'expanded',modeUpdated:0,activeChat:id,selectionUpdated:0,activeContext:null,contexts:Object.create(null),chats:{[id]:normalizeChat({title:'New chat'},workspace,id)}};
      }
      return records[workspace];
    }
    function session(workspace,id){
      const record=space(workspace),chat=record.chats[id||record.activeChat];
      if(!chat)return null;
      if(chat.scopeBound){chat.scopeProject=projectId(chat.scopeProject);chat.workingProject=chat.scopeProject;}
      else if(!Object.hasOwn(projects(),chat.workingProject))chat.workingProject=null;
      if(!Object.hasOwn(chat,'mode'))Object.defineProperty(chat,'mode',{enumerable:false,get:()=>record.mode});
      return chat;
    }
    const scopeFolder=(workspace,id)=>projects()[session(workspace,id)?.workingProject]?.root||profiles()[workspace].home;
    const workingFolder=(workspace,id)=>scopeFolder(workspace,id).replace(/\/+$/,'')+'/Assistant';
    function changed(chat,part='content'){chat.updated=tick();chat[part==='draft'?'draftUpdated':'contentUpdated']=chat.updated;}
    function titleFrom(chat,text){if(!chat.named&&!chat.turns.length)chat.title=clean(text,80).replace(/\s+/g,' ').trim()||chat.title;}
    const projectId=project=>Object.hasOwn(projects(),project)?project:null;
    const contextKey=project=>project===null?'workspace':'project:'+project;
    const chatProject=chat=>projectId(chat.scopeBound?chat.scopeProject:chat.workingProject);
    function context(record,project){
      const key=contextKey(project);
      return record.contexts[key]??={project,activeChat:null,selectionUpdated:0,enabled:false,preferenceUpdated:0};
    }
    function belongs(chat,project){return Boolean(chat&&chatProject(chat)===project);}
    function bind(chat,project){
      if(chat.scopeBound)return belongs(chat,project);
      chat.scopeBound=true;chat.scopeProject=project;chat.workingProject=project;chat.folderChosen=true;chat.scopeUpdated=tick();chat.updated=Math.max(chat.updated,chat.scopeUpdated);return true;
    }
    function selectChat(record,chat,project){
      record.activeChat=chat.id;record.selectionUpdated=tick();
      if(record.activeContext!==null){const state=context(record,project);state.activeChat=chat.id;state.selectionUpdated=record.selectionUpdated;}
    }
    function createChat(workspace,project,scoped){
      const record=space(workspace);if(Object.keys(record.chats).length>=50)return null;
      const created=tick(),id='chat-'+created.toString(36)+'-'+Math.random().toString(36).slice(2);
      const chat=normalizeChat({title:'New chat '+(Object.keys(record.chats).length+1),created,updated:created,examplesSeen:true,scopeBound:scoped,scopeProject:project,scopeUpdated:scoped?created:0,workingProject:project},workspace,id);
      record.chats[id]=chat;
      if(scoped)record.activeContext=contextKey(project);
      selectChat(record,chat,project);return session(workspace,id);
    }
    function scope(workspace,project=null){
      const record=space(workspace),target=projectId(project),key=contextKey(target),state=context(record,target);
      let chat=record.chats[state.activeChat];
      if(!belongs(chat,target)){
        // Migrate previous conversations in place. The old active chat is the
        // strongest selection evidence; other contexts recover their latest.
        chat=Object.values(record.chats).filter(item=>belongs(item,target)).sort((a,b)=>(b.id===record.activeChat)-(a.id===record.activeChat)||b.updated-a.updated||b.created-a.created||a.id.localeCompare(b.id))[0];
      }
      if(!chat)return createChat(workspace,target,true);
      bind(chat,target);
      if(record.activeContext!==key||record.activeChat!==chat.id||state.activeChat!==chat.id){record.activeContext=key;selectChat(record,chat,target);}
      return session(workspace,chat.id);
    }
    function load(snapshot,options={}){
      Object.entries(snapshot?.sessions||{}).forEach(([workspace,input])=>{
        if(!Object.hasOwn(profiles(),workspace)||!input||typeof input!=='object')return;
        const existed=Boolean(records[workspace]),record=space(workspace);
        const multi=snapshot.version>=4&&input.chats&&typeof input.chats==='object';
        // The creation limit must never truncate a saved or concurrently
        // merged history. In particular, two displays may each create the
        // fiftieth chat before receiving the other's update.
        const entries=(multi?Object.entries(input.chats):[['chat-'+workspace,{...input,folderChosen:input.folderChosen??Boolean(input.workingProject||input.items?.length||input.turns?.length),title:input.turns?.[0]?.request||input.items?.[0]?.title||'Previous chat'}]]).filter(([id,data])=>/^chat-[\w.-]{1,150}$/.test(id)&&data&&typeof data==='object');
        if(!existed&&entries.length)record.chats=Object.create(null);
        entries.forEach(([id,data])=>{
          const incoming=normalizeChat(data,workspace,id),current=record.chats[id];clock=Math.max(clock,incoming.updated);
          if(!current||!existed){record.chats[id]=incoming;return;}
          // A user can type on one display while Assistant updates the same
          // chat on another. Draft edits do not own the transcript or inputs.
          const draft=incoming.draftUpdated>current.draftUpdated?incoming:current;
          const content=incoming.contentUpdated>current.contentUpdated?incoming:current;
          // Binding a conversation is independent from typing or replies.
          // A stale unbound copy cannot move its destination after a switch.
          const bound=[current,incoming].filter(chat=>chat.scopeBound).sort((a,b)=>a.scopeUpdated-b.scopeUpdated||contextKey(a.scopeProject).localeCompare(contextKey(b.scopeProject)))[0];
          record.chats[id]={...content,draft:draft.draft,draftUpdated:draft.draftUpdated,updated:Math.max(current.updated,incoming.updated),...(bound?{scopeBound:true,scopeProject:bound.scopeProject,scopeUpdated:bound.scopeUpdated,workingProject:bound.scopeProject,folderChosen:true}:{})};
        });
        const selectionUpdated=stamp(multi?input.selectionUpdated:input.updated),modeUpdated=stamp(multi?input.modeUpdated:input.updated);
        clock=Math.max(clock,selectionUpdated,modeUpdated);
        const preserve=workspace===options.preserveSelection,previousContext=record.activeContext;
        if(snapshot.version>=6&&input.contexts&&typeof input.contexts==='object')Object.entries(input.contexts).forEach(([key,data])=>{
          if(!data||typeof data!=='object')return;
          const project=projectId(data.project);if(key!==contextKey(project))return;
          const current=context(record,project),incomingSelection=stamp(data.selectionUpdated),incomingPreference=stamp(data.preferenceUpdated);
          clock=Math.max(clock,incomingSelection,incomingPreference);
          const newerSelection=incomingSelection>current.selectionUpdated||incomingSelection===current.selectionUpdated&&String(data.activeChat)<String(current.activeChat);
          if((!existed||!(preserve&&previousContext===key)&&newerSelection)&&belongs(record.chats[data.activeChat],project)){current.activeChat=data.activeChat;current.selectionUpdated=incomingSelection;}
          // A simultaneous enable/revoke resolves to disabled on both copies.
          if(!existed||incomingPreference>current.preferenceUpdated||incomingPreference===current.preferenceUpdated&&data.enabled!==true){current.enabled=data.enabled===true;current.preferenceUpdated=incomingPreference;}
        });
        if(!existed||(workspace!==options.preserveSelection&&selectionUpdated>record.selectionUpdated)){
          const active=multi?input.activeChat:'chat-'+workspace;
          if(Object.hasOwn(record.chats,active))record.activeChat=active;
          record.activeContext=snapshot.version>=6&&Object.hasOwn(record.contexts,input.activeContext)?input.activeContext:null;
          record.selectionUpdated=selectionUpdated;
        }
        if(!Object.hasOwn(record.chats,record.activeChat))record.activeChat=Object.keys(record.chats)[0];
        if(record.activeContext!==null){const current=record.contexts[record.activeContext];if(belongs(record.chats[current.activeChat],current.project))record.activeChat=current.activeChat;}
        if(!existed||modeUpdated>record.modeUpdated){record.mode=snapshot.version>=2&&input.mode==='rail'?'rail':'expanded';record.modeUpdated=modeUpdated;}
      });
    }
    load(value);
    return {
      session,load,normalize,projectAt,scope,
      activeScope(workspace){const record=space(workspace);return record.activeContext===null?null:projectId(record.contexts[record.activeContext].project);},
      contextPreference(workspace,project,enabled){const record=space(workspace),state=context(record,projectId(project));if(arguments.length>=3&&state.enabled!==(enabled===true)){state.enabled=enabled===true;state.preferenceUpdated=tick();}return state.enabled;},
      chats(workspace,options={}){const record=space(workspace),project=record.activeContext===null?undefined:projectId(record.contexts[record.activeContext].project);return Object.values(record.chats).filter(chat=>options.all||project===undefined||belongs(chat,project)).sort((a,b)=>b.created-a.created||a.id.localeCompare(b.id)).map(chat=>({id:chat.id,title:chat.title,created:chat.created,updated:chat.updated,sources:chat.items.length,replies:chat.turns.length}));},
      newChat(workspace,project){const record=space(workspace),scoped=arguments.length>=2||record.activeContext!==null,target=arguments.length>=2?projectId(project):record.activeContext===null?null:projectId(record.contexts[record.activeContext].project);return createChat(workspace,target,scoped);},
      select(workspace,id){const record=space(workspace),chat=record.chats[id];if(!chat)return false;const project=record.activeContext===null?null:projectId(record.contexts[record.activeContext].project);if(record.activeContext!==null&&(!belongs(chat,project)||!bind(chat,project)))return false;selectChat(record,chat,project);return true;},
      rename(workspace,id,title){const chat=session(workspace,id),name=clean(title,80).trim();if(!chat||!name)return false;chat.title=name;chat.named=true;changed(chat);return true;},
      add(workspace,item,id){const record=session(workspace,id),entry=normalize(item,workspace);if(!record||!entry)return null;const duplicate=record.items.find(old=>old.id===entry.id);if(duplicate){record.items[record.items.indexOf(duplicate)]=entry;changed(record);return entry;}if(record.items.length>=24)return null;if(entry.project&&!record.scopeBound&&!record.workingProject&&!record.folderChosen){record.workingProject=entry.project;record.folderChosen=true;}if(!record.items.length)titleFrom(record,entry.title);record.items.push(entry);changed(record);return entry;},
      remove(workspace,id,chatId){const record=session(workspace,chatId);if(!record)return;record.items=record.items.filter(item=>item.id!==id);changed(record);},
      exchange(workspace,request,response,context={},id){const record=session(workspace,id);if(!record||record.turns.length>=60)return null;const turn=normalizeTurn({id:'turn-'+Math.random().toString(36).slice(2),request,title:response.title,text:response.text,presentation:response.presentation,assistantOnly:response.assistantOnly,outputs:response.outputs,folder:context.folder||workingFolder(workspace,id),project:context.project===undefined?record.workingProject:context.project,sources:context.sources||record.items,example:context.example,action:response.action,created:Date.now()},workspace);if(!turn)return null;titleFrom(record,request);record.turns.push(turn);changed(record);return turn;},
      reply(workspace,turnId,response={},id){const record=session(workspace,id),turn=record?.turns.find(turn=>turn.id===turnId);if(!turn||!response||typeof response!=='object')return null;const normalized=normalizeTurn({...turn,...Object.fromEntries(['title','text','action','presentation','outputs','assistantOnly'].filter(key=>Object.hasOwn(response,key)).map(key=>[key,response[key]]))},workspace);if(!normalized)return null;Object.assign(turn,normalized);changed(record);return turn;},
      action(workspace,turnId,value,chatId){const record=session(workspace,chatId),turn=record?.turns.find(t=>t.id===turnId);if(!turn)return null;turn.action=A?.action(value);changed(record);return turn;},
      examplesSeen(workspace){const record=session(workspace);record.examplesSeen=true;changed(record);},
      draft(workspace,text,id){const record=session(workspace,id);if(!record)return;record.draft=clean(text,4000);changed(record,'draft');},
      mode(workspace,mode){const record=space(workspace);record.mode=mode==='expanded'?'expanded':'rail';record.modeUpdated=tick();},
      folder(workspace,project,id){const record=session(workspace,id),target=projectId(project);if(!record||record.scopeBound&&record.scopeProject!==target)return false;if(record.workingProject===target&&record.folderChosen)return true;record.workingProject=target;record.folderChosen=true;changed(record);return true;},
      scopeFolder,workingFolder,
      snapshot(){const sessions={};Object.entries(records).forEach(([workspace,record])=>{const chat=session(workspace);sessions[workspace]={...record,draft:chat.draft,items:chat.items,turns:chat.turns,examplesSeen:chat.examplesSeen,workingProject:chat.workingProject,updated:Math.max(record.modeUpdated,record.selectionUpdated,...Object.values(record.contexts).map(item=>Math.max(item.selectionUpdated,item.preferenceUpdated)),...Object.values(record.chats).map(item=>item.updated))};});return JSON.parse(JSON.stringify({version:6,sessions}));}

    };
  }
  return {MIME,create,inside,representation};
});
