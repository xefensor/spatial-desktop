/* Portable, explicitly selected project history. Binary files are packaged separately. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./item-history.js'));else root.SpatialItemHistoryPackage=factory(root.SpatialItemHistory);})(globalThis,function(H){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  const clean=(value,max=320)=>String(value??'').slice(0,max);
  const validId=value=>typeof value==='string'&&value.length>0&&value.length<=320&&!/[\x00-\x1f]/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
  const canonical=item=>item?.itemId||item?.fileId||item?.id;
  function scope(value){
    if(typeof value==='string'){try{value=JSON.parse(value);}catch{return null;}}
    if(!Array.isArray(value)||typeof value[0]!=='string'||!(value[1]===null||typeof value[1]==='string'))return null;
    return {workspace:value[0],project:value[1]};
  }
  function metadata(value){return {tags:[...new Set((Array.isArray(value?.tags)?value.tags:[]).filter(tag=>typeof tag==='string').map(tag=>tag.slice(0,40)).filter(Boolean))].slice(0,16),updated:Number.isFinite(value?.updated)?value.updated:0};}
  function exportProject(snapshot,items,workspace,project){
    const state=H.create(snapshot?.history||snapshot).snapshot(),records={},selected=new Set();
    (Array.isArray(items)?items:[]).forEach(item=>{const owner=scope(item?.scope||item?.storageScope),id=canonical(item);if(owner?.workspace===workspace&&owner.project===(project||null)&&validId(id))selected.add(id);});
    selected.forEach(id=>{
      const original=state.records[id];if(!original)return;
      const record=copy(original),current=record.versions.at(-1)?.id;
      record.events=record.events.filter(event=>event.workspace===workspace);
      const versions=new Set([current,...record.events.map(event=>event.versionId)]);
      // Historical snapshots from another Workspace are not exported merely
      // because the same identity was later referenced in this Project.
      record.versions=record.versions.filter(version=>versions.has(version.id));
      record.references=record.references.filter(reference=>reference.active&&reference.workspace===workspace&&reference.project===(project||null));
      records[id]=record;
    });
    const result={format:'spatial-item-history',version:1,records};
    if(object(snapshot?.metadata)){const tags={};selected.forEach(id=>{if(records[id]&&object(snapshot.metadata[id]))tags[id]=metadata(snapshot.metadata[id]);});if(Object.keys(tags).length)result.metadata=tags;}
    return result;
  }
  function hash(value){let a=2166136261,b=2246822507;for(const char of value){const code=char.charCodeAt(0);a=Math.imul(a^code,16777619);b=Math.imul(b^code,3266489909);}return (a>>>0).toString(36)+(b>>>0).toString(36);}
  function importProject(bundle,options={}){
    if(bundle?.format!=='spatial-item-history'||bundle.version!==1||!object(bundle.records)||typeof options.workspace!=='string'||!options.workspace||typeof options.idPrefix!=='string'||!options.idPrefix)return null;
    const workspace=clean(options.workspace,160),project=typeof options.project==='string'?clean(options.project,160):null,prefix=clean(options.idPrefix,100).replace(/[^a-zA-Z0-9_-]/g,'-');
    if(!prefix)return null;
    const state=H.create({version:1,records:bundle.records}).snapshot(),idMap=Object.create(null),versionMap=Object.create(null),records=Object.create(null),tags=Object.create(null);
    const selected=Object.keys(state.records).sort(),used=new Set();
    selected.forEach(old=>{const base='import:'+prefix+':'+hash(old);let id=base,n=1;while(used.has(id))id=base+':'+(++n);used.add(id);idMap[old]=id;});
    selected.forEach(old=>{state.records[old].versions.forEach((version,index)=>{versionMap[version.id]=idMap[old]+':version:'+String(index).padStart(8,'0')+':'+hash(version.id);});});
    const explicitTime=options.importedAt??options.now;
    const importedAt=Number.isFinite(explicitTime)&&explicitTime>0?explicitTime:Date.now();
    const attachmentMap=object(options.attachmentMap)?options.attachmentMap:{};
    function remapAttachment(attachment){
      if(!attachment)return null;
      const locator=attachment.key||attachment.src,mapped=Object.prototype.hasOwnProperty.call(attachmentMap,locator)?attachmentMap[locator]:'';
      // Missing historical bytes retain their metadata, but receive a fresh
      // unavailable key. Never accidentally read the old browser's blob key.
      const key=typeof mapped==='string'&&/^stash-[\w-]{1,160}$/.test(mapped)?mapped:'stash-unavailable-'+hash(prefix+'\n'+locator);
      const result={...attachment,key};delete result.src;return result;
    }
    function remapData(value,key='',depth=0){
      if(depth>5)return null;
      if(typeof value==='string'){if(['itemId','sourceId','relatedId'].includes(key))return idMap[value]||value;if(['versionId','sourceVersionId','itemVersion'].includes(key))return versionMap[value]||value;return value;}
      if(Array.isArray(value))return value.map(entry=>typeof entry==='string'&&['sourceIds','itemIds'].includes(key)?idMap[entry]||entry:remapData(entry,key,depth+1));
      if(!object(value))return value;
      const result={};Object.entries(value).forEach(([name,entry])=>{if(!['__proto__','constructor','prototype'].includes(name))result[name]=remapData(entry,name,depth+1);});return result;
    }
    selected.forEach(oldId=>{
      const original=state.records[oldId],id=idMap[oldId],oldVersion=original.versions.at(-1)?.id||'';
      const versions=original.versions.map((version,index)=>({...version,id:versionMap[version.id],revision:'import:'+String(index).padStart(12,'0'),attachment:remapAttachment(version.attachment)}));
      const events=original.events.map((event,index)=>({...event,id:id+':event:'+String(index).padStart(8,'0')+':'+hash(event.id),workspace,project,versionId:versionMap[event.versionId]||'',detail:clean('Imported history from '+event.workspace+(event.project?' / '+event.project:'')+(event.detail?' · '+event.detail:''),2000),data:{...remapData(event.data),originalWorkspace:event.workspace,originalProject:event.project,originalEventId:event.id}}));
      let eventTime=importedAt;versions.forEach(version=>{eventTime=Math.max(eventTime,version.created+1);});events.forEach(event=>{eventTime=Math.max(eventTime,event.created+1);});
      events.push({id:id+':import',type:'import',created:eventTime,workspace,project,versionId:versionMap[oldVersion]||'',detail:'Imported an independent copy. Historical file bytes are available only when included in this package.',data:{sourceItemId:oldId,sourceVersionId:oldVersion}});
      const relations=original.relations.map(relation=>({...relation,itemId:idMap[relation.itemId]||relation.itemId,versionId:idMap[relation.itemId]?versionMap[relation.versionId]||'':relation.versionId})).filter(relation=>relation.itemId!==id);
      relations.push({itemId:oldId,relation:'copiedFrom',versionId:oldVersion,created:eventTime});
      records[id]={...original,id,created:importedAt,versions,events,references:[{workspace,project,active:true,updated:eventTime,revision:'import:'+prefix}],relations};
      if(object(bundle.metadata?.[oldId]))tags[id]={...metadata(bundle.metadata[oldId]),updated:importedAt};
    });
    return {history:H.create({version:1,records}).snapshot(),idMap,metadata:tags};
  }
  return {exportProject,importProject};
});
