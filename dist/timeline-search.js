/* Search only text already available to this browser, with explicit ownership
   and version identity. No page fetching or background computer indexing. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.SpatialTimelineSearch=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const readable=(attachment,path)=>/^(text\/|application\/(json|xml|javascript)(;|$))/i.test(attachment?.mime||'')||/\.(txt|md|markdown|csv|tsv|json|html?|css|js|toml|xml|log)$/i.test(path||'');
  function prepare(events,{workspace,files=[],history=()=>null}={}){
    const documents=new Map(),attachments=[],owners=new Map(),items=new Map();
    const activity=events.filter(e=>e.workspace===workspace);
    for(const event of activity)if(event.path&&event.itemId){if(!owners.has(event.path))owners.set(event.path,new Set());owners.get(event.path).add(event.itemId);}
    function item(id){if(!id)return null;if(!items.has(id))items.set(id,history(id));return items.get(id);}
    function add(event,doc,attachment){
      const rows=documents.get(event.id)||[];rows.push(doc);documents.set(event.id,rows);
      if(attachment?.key&&readable(attachment,doc.path||doc.title))attachments.push({eventId:event.id,doc,attachment});
    }
    for(const event of activity){
      if(event.type==='file.folder'||!event.itemId&&!event.path)continue;
      const record=item(event.itemId),version=event.itemVersion&&record?.versions?.find(v=>v.id===event.itemVersion);
      if(version)add(event,{kind:'saved',title:version.title||event.title,itemId:event.itemId,versionId:version.id,versionNumber:record.versions.indexOf(version)+1,path:event.path||'',text:version.text||''},version.attachment);
      // A recorded ID survives renames; a recycled path must never borrow a
      // replacement file's text. Path-only activity needs unambiguous ownership.
      const pathOwners=owners.get(event.path);
      const candidates=files.filter(file=>file.workspace===workspace&&file.kind!=='folder'&&(event.itemId?file.itemId===event.itemId:file.path===event.path&&(!pathOwners||pathOwners.size===1&&pathOwners.has(file.itemId))));
      const current=candidates.find(file=>file.path===event.path)||candidates[0];
      if(current)add(event,{kind:'current',title:current.name||event.title,itemId:current.itemId,path:current.path,revision:current.revision||0,text:typeof current.content==='string'?current.content:''},typeof current.content==='string'?null:current.attachment);
      else if(!event.itemVersion&&record)add(event,{kind:'current',title:record.title||event.title,itemId:record.id,path:'',versionId:record.currentVersion,text:record.text||''},record.attachment);
    }
    // Include byte identity so a changed imported file invalidates an in-flight
    // read even when its path and display name stay the same.
    const signature=JSON.stringify([workspace,[...documents],attachments.map(({eventId,attachment})=>[eventId,attachment.key,attachment.mime])]);
    return {documents,attachments,signature};
  }
  async function load(prepared,readBlob){
    const documents=new Map([...prepared.documents].map(([id,docs])=>[id,docs.map(doc=>({...doc}))])),reads=new Map();
    await Promise.all(prepared.attachments.map(async({eventId,doc,attachment})=>{
      try{
        if(!reads.has(attachment.key))reads.set(attachment.key,Promise.resolve().then(()=>readBlob(attachment.key)).then(blob=>blob?blob.slice(0,1024*1024).text():''));
        const text=await reads.get(attachment.key),rows=documents.get(eventId),index=prepared.documents.get(eventId).indexOf(doc);
        rows[index].text=[doc.text,text].filter(Boolean).join('\n');
      }catch{/* Missing file bytes leave metadata and saved captions available. */}
    }));
    return documents;
  }
  return {prepare,load};
});
