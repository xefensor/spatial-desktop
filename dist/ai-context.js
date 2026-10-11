/* Local context only. No provider calls or generated replies. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SpatialAIContext=api;})(globalThis,function(){
  'use strict';
  const M=typeof module==='object'&&module.exports?require('./working-memory.js'):globalThis.SpatialWorkingMemory;
  const MIME='application/x-spatial-context';
  const clean=(value,max=2000)=>typeof value==='string'?value.slice(0,max):'';
  const address=value=>/^(https?:\/\/|\/)/i.test(clean(value))?clean(value):'';
  const inside=(path,folder)=>Boolean(folder&&(path===folder||path.startsWith(folder.replace(/\/$/,'')+'/')));
  function create(value={},environment){
    const records={};
    const profiles=()=>environment.workspaces(),projects=()=>environment.projects();
    function projectAt(path){return Object.keys(projects()).sort((a,b)=>projects()[b].root.length-projects()[a].root.length).find(id=>inside(path,projects()[id].root));}
    function normalize(item,workspace){
      if(!item||typeof item!=='object')return null;
      const sourceWorkspace=Object.hasOwn(profiles(),item.workspace)?item.workspace:workspace;
      const path=address(item.address),project=Object.hasOwn(projects(),item.project)?item.project:projectAt(path)||null;
      const fileKey=/^stash-[\w-]{1,160}$/.test(item.fileKey||'')?item.fileKey:'';
      return {id:clean(item.id,160)||'context-'+Math.random().toString(36).slice(2),title:clean(item.title,120)||'Dropped content',kind:clean(item.kind,30)||'text',text:clean(item.text,12000),why:clean(item.why,1000),source:M.source(item.source),savedAt:Math.max(0,Number(item.savedAt)||0),attachment:M.attachment(item.attachment),address:path,workspace:sourceWorkspace,project,app:clean(item.app,120),fileKey,filename:clean(item.filename,160)};
    }
    function session(workspace){
      if(!Object.hasOwn(profiles(),workspace))throw new Error('Unknown workspace');
      const record=records[workspace]||={draft:'',items:[],workingProject:null,mode:'expanded',updated:0};
      if(!Object.hasOwn(projects(),record.workingProject))record.workingProject=null;
      return record;
    }
    function changed(record){record.updated=Math.max(Date.now(),record.updated+1);}
    function load(snapshot){
      Object.entries(snapshot?.sessions||{}).forEach(([workspace,input])=>{
        if(!Object.hasOwn(profiles(),workspace)||!input||typeof input!=='object'||Number(input.updated||0)<(records[workspace]?.updated||0))return;
        records[workspace]={draft:clean(input.draft,4000),items:(Array.isArray(input.items)?input.items:[]).slice(0,24).map(item=>normalize(item,workspace)).filter(Boolean),workingProject:Object.hasOwn(projects(),input.workingProject)?input.workingProject:null,mode:snapshot.version>=2&&input.mode==='rail'?'rail':'expanded',updated:Number(input.updated)||0};
      });
    }
    load(value);
    return {
      session,load,normalize,projectAt,
      add(workspace,item){const record=session(workspace),entry=normalize(item,workspace);if(!entry||record.items.length>=24)return null;const duplicate=record.items.find(old=>old.id===entry.id);if(duplicate)return duplicate;if(entry.project&&!record.workingProject)record.workingProject=entry.project;record.items.push(entry);changed(record);return entry;},
      remove(workspace,id){const record=session(workspace);record.items=record.items.filter(item=>item.id!==id);changed(record);},
      draft(workspace,text){const record=session(workspace);record.draft=clean(text,4000);changed(record);},
      mode(workspace,mode){const record=session(workspace);record.mode=mode==='expanded'?'expanded':'rail';changed(record);},
      folder(workspace,project){const record=session(workspace);record.workingProject=Object.hasOwn(projects(),project)?project:null;changed(record);},
      workingFolder(workspace){const record=session(workspace);return projects()[record.workingProject]?.root||profiles()[workspace].home;},
      snapshot(){return JSON.parse(JSON.stringify({version:2,sessions:records}));}
    };
  }
  return {MIME,create,inside};
});
