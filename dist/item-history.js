/* Shared item identity and provenance. No screen capture or inferred ownership. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SpatialItemHistory=factory();})(globalThis,function(){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const text=(value,max=12000)=>String(value??'').slice(0,max);
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  const id=value=>typeof value==='string'&&value.length>0&&value.length<=320&&!/[\x00-\x1f]/.test(value)&&!['__proto__','constructor','prototype'].includes(value)?value:'';
  const stamp=value=>Number.isFinite(value)&&value>=0?value:0;
  const address=value=>/^(?:https?:\/\/|\/)/i.test(text(value,4000))?text(value,4000):'';
  const project=value=>typeof value==='string'?text(value,160):null;
  const scopeKey=value=>JSON.stringify([value.workspace,value.project]);
  function scope(value){return {workspace:typeof value?.workspace==='string'?text(value.workspace,160):'',project:project(value?.project)};}
  function source(value){
    value=object(value)?value:{};
    return {label:text(value.label,240),address:address(value.address),app:text(value.app,160),workspace:text(value.workspace,160),project:project(value.project),desktop:Math.min(10000,Math.max(0,Math.floor(Number(value.desktop)||0)))};
  }
  function attachment(value){
    if(!object(value)||!['image','audio','document','file'].includes(value.kind))return null;
    const key=/^stash-[\w-]{1,160}$/.test(value.key||'')?value.key:'';
    const src=text(value.src,500),safeSrc=/^(?:media\/stash\/|images\/philosophy\/)[a-zA-Z0-9_./-]+$/.test(src)&&!src.split('/').includes('..');
    const extensions={image:/\.(?:svg|png|jpe?g|webp)$/i,audio:/\.(?:wav|mp3|ogg)$/i,document:/\.html$/i};
    if(!key&&!(safeSrc&&extensions[value.kind]?.test(src)))return null;
    return {kind:value.kind,...(key?{key}:{src}),filename:text(value.filename,240),mime:text(value.mime,120),size:Math.max(0,Number(value.size)||0),format:text(value.format,120),...(value.credit?{credit:text(value.credit,300)}:{})};
  }
  // Events may contain adapter-specific observations, but never executable or
  // unbounded objects. The origin is intentionally a separate, fixed record.
  function data(value,depth=0){
    if(value===null||typeof value==='boolean')return value;
    if(typeof value==='string')return text(value,2000);
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(depth>=4)return null;
    if(Array.isArray(value))return value.slice(0,80).map(entry=>data(entry,depth+1));
    if(!object(value))return null;
    const result={};
    Object.keys(value).slice(0,40).forEach(key=>{if(id(key)&&!['origin','source'].includes(key))result[key]=data(value[key],depth+1);});
    return result;
  }
  function content(value,previous={}){
    const valueAddress=own(value,'address')?value.address:own(value,'source')?value.source?.address:previous.address;
    return {title:own(value,'title')?text(value.title,240):text(previous.title,240),text:own(value,'text')?text(value.text,50000):text(previous.text,50000),address:address(valueAddress),attachment:own(value,'attachment')?attachment(value.attachment):attachment(previous.attachment)};
  }
  const contentKey=value=>JSON.stringify([value.title,value.text,value.address,value.attachment]);
  const order=(a,b)=>a.created-b.created||String(a.revision||'').localeCompare(String(b.revision||''))||a.id.localeCompare(b.id);
  const canonical=value=>JSON.stringify(value);
  function union(first,second,key=entry=>entry.id){
    const result=new Map(first.map(entry=>[key(entry),entry]));
    second.forEach(entry=>{const previous=result.get(key(entry));if(!previous||canonical(entry)>canonical(previous))result.set(key(entry),entry);});
    return [...result.values()];
  }
  function cleanVersion(value){
    if(!object(value)||!id(value.id))return null;
    return {id:value.id,created:stamp(value.created),revision:text(value.revision,200),...content(value)};
  }
  function cleanEvent(value){
    if(!object(value)||!id(value.id)||!/^[-a-z0-9_]{1,64}$/i.test(value.type||''))return null;
    return {id:value.id,type:value.type,created:stamp(value.created),...scope(value),versionId:id(value.versionId),detail:text(value.detail,2000),...(value.dedupKey?{dedupKey:text(value.dedupKey,320)}:{}),data:data(value.data)||{}};
  }
  function cleanReference(value){
    if(!object(value))return null;
    const owner=scope(value);if(!owner.workspace)return null;
    return {...owner,active:value.active!==false,updated:stamp(value.updated),revision:text(value.revision,200)};
  }
  function cleanRelation(value){
    if(!object(value)||!id(value.itemId)||!['copiedFrom','derivedFrom','reference','quotation','revisionOf'].includes(value.relation))return null;
    const versionId=id(value.versionId);
    return {id:JSON.stringify([value.relation,value.itemId,versionId]),itemId:value.itemId,relation:value.relation,versionId,created:stamp(value.created)};
  }
  function cleanRecord(key,value){
    if(!id(key)||!object(value))return null;
    const versions=(Array.isArray(value.versions)?value.versions:[]).map(cleanVersion).filter(Boolean);
    if(!versions.length)return null;
    const events=(Array.isArray(value.events)?value.events:[]).map(cleanEvent).filter(Boolean);
    const references=(Array.isArray(value.references)?value.references:[]).map(cleanReference).filter(Boolean);
    const relations=(Array.isArray(value.relations)?value.relations:[]).map(cleanRelation).filter(Boolean);
    return {id:key,origin:source(value.origin||value.source),originCreated:stamp(value.originCreated??value.created),originRevision:text(value.originRevision,200),created:stamp(value.created),versions:union([],versions).sort(order),events:union([],events).sort(order),references:mergeReferences([],references),relations:union([],relations).sort((a,b)=>a.id.localeCompare(b.id))};
  }
  function mergeReferences(first,second){
    const result=new Map(first.map(entry=>[scopeKey(entry),entry]));
    second.forEach(entry=>{const key=scopeKey(entry),old=result.get(key);if(!old||entry.updated>old.updated||(entry.updated===old.updated&&(entry.revision>old.revision||(entry.revision===old.revision&&canonical(entry)>canonical(old)))))result.set(key,entry);});
    return [...result.values()].sort((a,b)=>scopeKey(a).localeCompare(scopeKey(b)));
  }
  function create(saved={},clock=()=>Date.now(),writer=Math.random().toString(36).slice(2)){
    const state={version:1,records:Object.create(null)};
    writer=text(typeof writer==='string'?writer:'writer',120)||'writer';
    let sequence=0,lastTime=0;
    function now(){let value;try{value=Number(clock());}catch{value=0;}lastTime=Math.max(stamp(value),lastTime+1);return lastTime;}
    function nextId(kind,time){return kind+':'+writer+':'+time.toString(36)+':'+(++sequence).toString(36);}
    function projectRecord(record){
      if(!record)return null;
      const current=record.versions.at(-1),result={...record,...content(current),source:record.origin,updated:current.created,currentVersion:current.id,lastEventAt:record.events.at(-1)?.created||record.created};
      return clone(result);
    }
    function merge(incoming){
      if(incoming?.version!==1||!object(incoming.records))return false;
      let changed=false;
      Object.entries(incoming.records).forEach(([key,value])=>{
        const entry=cleanRecord(key,value);if(!entry)return;
        const old=state.records[key];let merged=entry;
        if(old){
          const origin=entry.originCreated<old.originCreated||(entry.originCreated===old.originCreated&&(entry.originRevision<old.originRevision||(entry.originRevision===old.originRevision&&canonical(entry.origin)<canonical(old.origin))))?entry:old;
          merged={id:key,origin:origin.origin,originCreated:origin.originCreated,originRevision:origin.originRevision,created:Math.min(old.created,entry.created),versions:union(old.versions,entry.versions).sort(order),events:union(old.events,entry.events).sort(order),references:mergeReferences(old.references,entry.references),relations:union(old.relations,entry.relations).sort((a,b)=>a.id.localeCompare(b.id))};
        }
        if(!old||canonical(old)!==canonical(merged)){state.records[key]=merged;changed=true;}
        lastTime=Math.max(lastTime,merged.created);
        merged.versions.forEach(version=>{lastTime=Math.max(lastTime,version.created);});
        merged.events.forEach(event=>{lastTime=Math.max(lastTime,event.created);});
        merged.references.forEach(reference=>{lastTime=Math.max(lastTime,reference.updated);});
      });
      return changed;
    }
    merge(saved);
    function reference(record,value,active,time){
      const owner=scope(value);if(!owner.workspace)return false;
      const old=record.references.find(entry=>scopeKey(entry)===scopeKey(owner));
      if(old&&old.active===active)return false;
      record.references=mergeReferences(record.references,[{...owner,active,updated:time,revision:writer+':'+(++sequence)}]);return true;
    }
    function append(record,type,value={},time=now()){
      const eventId=id(value.eventId||value.id),dedupKey=text(value.dedupKey,320);
      if(eventId&&record.events.some(event=>event.id===eventId))return null;
      if(dedupKey&&record.events.some(event=>event.type===type&&event.dedupKey===dedupKey))return null;
      const extra=Object.create(null);
      Object.entries(value).forEach(([key,entry])=>{if(!['workspace','project','detail','versionId','eventId','id','dedupKey','origin','source'].includes(key))extra[key]=entry;});
      const event=cleanEvent({id:eventId||nextId('event',time),type,created:time,...scope(value),versionId:own(value,'versionId')?value.versionId:record.versions.at(-1)?.id,detail:value.detail,...(dedupKey?{dedupKey}:{}),data:extra});
      if(!event)return null;
      record.events.push(event);record.events.sort(order);return event;
    }
    function link(fromId,toId,relation='reference'){
      const from=state.records[id(fromId)],to=object(toId)?toId:{itemId:toId};if(!from)return null;
      const target=id(to.itemId||to.id),existing=state.records[target];
      if(!target||target===from.id)return null;
      const entry=cleanRelation({itemId:target,relation,versionId:to.versionId||existing?.versions.at(-1)?.id||'',created:now()});if(!entry)return null;
      if(!from.relations.some(value=>value.id===entry.id)){from.relations.push(entry);from.relations.sort((a,b)=>a.id.localeCompare(b.id));}
      return clone(from.relations.find(value=>value.id===entry.id));
    }
    function upsert(item,options={}){
      if(!object(item))return null;
      const key=id(item.fileId||item.id);if(!key)return null;
      let record=state.records[key];const initial=!record,previous=record?.versions.at(-1),current=content(item,previous);
      const changed=initial||contentKey(previous)!==contentKey(current),owner=scope(options);
      const addReference=owner.workspace&&!record?.references.some(entry=>entry.active&&scopeKey(entry)===scopeKey(owner));
      const time=changed||addReference?now():lastTime;
      if(initial){
        // Indexing an existing saved item is not a new capture. Preserve only
        // an explicit plausible saved timestamp; absent/zero/future values do
        // not manufacture a historical date or an inferred origin.
        const created=Number.isFinite(item.created)&&item.created>0&&item.created<=time?item.created:time;
        record={id:key,origin:source(item.origin||item.source),originCreated:created,originRevision:writer+':'+(++sequence),created,versions:[],events:[],references:[],relations:[]};state.records[key]=record;
      }
      if(changed){const version={id:nextId('version',time),created:time,revision:writer+':'+(++sequence),...current};record.versions.push(version);}
      reference(record,owner,true,time);
      const type=text(options.action||'capture',64);
      if(initial||changed||addReference)append(record,initial?type:changed?(type==='capture'?'version':type):'reference',options,time);
      if(Array.isArray(options.related))options.related.forEach(related=>link(key,related,object(related)&&related.relation||options.relation||'reference'));
      return projectRecord(record);
    }
    function recordEvent(key,type,options={}){
      const record=state.records[id(key)];if(!record||!/^[-a-z0-9_]{1,64}$/i.test(type||''))return null;
      const time=now(),event=append(record,type,options,time);if(!event)return null;
      const removing=type==='unreference';
      reference(record,options,!removing,time);
      if(type==='move'&&options.fromWorkspace)reference(record,{workspace:options.fromWorkspace,project:options.fromProject},false,time);
      return clone(event);
    }
    return {upsert,record:recordEvent,get:key=>projectRecord(state.records[id(key)]),list:workspace=>Object.values(state.records).filter(record=>record.references.some(reference=>reference.active&&reference.workspace===workspace)).map(projectRecord).sort((a,b)=>b.updated-a.updated||a.id.localeCompare(b.id)),version(key,versionId){const record=state.records[id(key)];if(!record)return null;const version=versionId?record.versions.find(value=>value.id===versionId):record.versions.at(-1);return version?clone(version):null;},link,merge,snapshot:()=>clone(state)};
  }
  return {create,source,attachment};
});
