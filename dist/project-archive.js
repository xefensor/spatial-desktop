/* Small, inspectable ZIP archives for the browser's Project filesystem. */
(function(root){
  'use strict';
  const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true}),LIMIT=40*1024*1024;
  const safePath=path=>typeof path==='string'&&path.length<500&&!/^[\\/]|[\\\x00-\x1f:]|(^|\/)\.{1,2}(\/|$)/.test(path)&&path.split('/').every(Boolean);
  function crc(bytes){let value=-1;for(const byte of bytes){value^=byte;for(let n=0;n<8;n++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^-1)>>>0;}
  const bytes=value=>typeof value==='string'?enc.encode(value):value;
  function zip(entries){
    if(entries.length>1000)throw Error('This demo supports up to 1,000 files.');
    const local=[],central=[];let offset=0,size=0;const names=new Set();
    for(const entry of entries){
      if(!safePath(entry.path)||names.has(entry.path))throw Error('Invalid or duplicate archive path.');names.add(entry.path);
      const name=enc.encode(entry.path),data=bytes(entry.data);size+=data.length;if(size>LIMIT)throw Error('This demo supports archives up to 40 MB.');
      const checksum=crc(data),head=new Uint8Array(30+name.length),h=new DataView(head.buffer);
      h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint32(14,checksum,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);head.set(name,30);local.push(head,data);
      const record=new Uint8Array(46+name.length),r=new DataView(record.buffer);r.setUint32(0,0x02014b50,true);r.setUint16(4,20,true);r.setUint16(6,20,true);r.setUint16(8,0x800,true);r.setUint32(16,checksum,true);r.setUint32(20,data.length,true);r.setUint32(24,data.length,true);r.setUint16(28,name.length,true);r.setUint32(42,offset,true);record.set(name,46);central.push(record);offset+=head.length+data.length;
    }
    const centralSize=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
    const output=new Uint8Array(offset+centralSize+22);let at=0;for(const part of [...local,...central,end]){output.set(part,at);at+=part.length;}return output;
  }
  function unzip(input){
    const data=bytes(input);if(data.length>LIMIT+200000)throw Error('Archive is too large for this demo.');
    const v=new DataView(data.buffer,data.byteOffset,data.byteLength),files=new Map();let at=0,total=0;
    while(at+4<=data.length&&v.getUint32(at,true)===0x04034b50){
      if(at+30>data.length)throw Error('Incomplete ZIP archive.');
      const flags=v.getUint16(at+6,true),method=v.getUint16(at+8,true),size=v.getUint32(at+18,true),unpacked=v.getUint32(at+22,true),len=v.getUint16(at+26,true),extra=v.getUint16(at+28,true),start=at+30+len+extra;
      if(flags&9||method!==0||size!==unpacked)throw Error('Choose a Project ZIP created by this demo. Other ZIP compression is not supported yet.');
      if(start+size>data.length)throw Error('Incomplete ZIP archive.');const path=dec.decode(data.slice(at+30,at+30+len));
      if(!safePath(path)||files.has(path))throw Error('Invalid or duplicate archive path.');
      const content=data.slice(start,start+size);if(crc(content)!==v.getUint32(at+14,true))throw Error('A file in the archive is damaged.');
      total+=size;if(total>LIMIT||files.size>=1000)throw Error('Archive exceeds this demo’s limits.');files.set(path,content);at=start+size;
    }
    if(!files.size||at+4>data.length||v.getUint32(at,true)!==0x02014b50||data.length<22||v.getUint32(data.length-22,true)!==0x06054b50||v.getUint16(data.length-12,true)!==files.size||v.getUint32(data.length-6,true)!==at)throw Error('This is not a complete Project ZIP.');return files;
  }
  const clean=value=>String(value??'').slice(0,12000),copy=value=>JSON.parse(JSON.stringify(value));
  function unique(path,used){const dot=path.lastIndexOf('.'),slash=path.lastIndexOf('/'),stem=dot>slash?path.slice(0,dot):path,ext=dot>slash?path.slice(dot):'';let next=path,n=2;while(used.has(next.toLowerCase()))next=stem+' ('+n+++')'+ext;used.add(next.toLowerCase());return next;}
  function resourceAddress(entry,home){const meta=entry[4]||{};let address=meta.address??meta.source?.address??(String(entry[1]||'').startsWith('Linked · ')?entry[1].slice(9):'');if(address.startsWith('~/'))address=home+address.slice(1);if(address.startsWith('/')&&/\.[a-z0-9]{1,10}$/i.test(entry[0])&&!address.endsWith('/'+entry[0])&&!address.split('/').at(-1).includes('.'))address=address.replace(/\/$/,'')+'/'+entry[0];return address;}
  async function build(project,{home='',files=[],stash=[],readAttachment,readPath,replacements={}}={}){
    const original=copy(project),portable=copy(project),entries=[],report=[],missing=[],used=new Set(),sources=new Map(),samples=[];
    portable.root='.';delete portable.originWorkspace;delete portable.stash;delete portable.archiveFiles;
    const put=(path,data,extra={})=>{if(!safePath(path))throw Error('Invalid Project file path: '+path);if(entries.some(e=>e.path===path))return;used.add(path.toLowerCase());entries.push({path,data:bytes(data),...extra});};

    for(const file of files){if(!safePath(file.path)||file.path.startsWith('.spatial-project.'))continue;put(file.path,file.data,{kind:file.kind||'text',mime:file.mime||'text/plain'});}
    for(const [name,detail,type]of portable.files||[]){if(type==='folder'||name.startsWith('.spatial-project.')||entries.some(e=>e.path===name))continue;if(!safePath(name))continue;put(name,'Demo example file: '+name+'\n'+detail+'\n\nThis prototype has no original file contents attached.\n',{kind:'text'});samples.push(name);}
    for(const file of stash){if(file.record&&!String(file.record.id||'').startsWith('project-note:')){original.resources.push([file.title,file.caption||file.content||'',file.kind==='note'?'document':file.kind,'i-note',{text:file.caption||file.content||'',attachment:file.attachment||undefined,fileId:file.id,itemId:file.record.itemId||file.id,source:file.source||{label:'Saved Project note'},created:file.created,updated:file.updated,why:file.why,pinned:file.pinned}]);}if(file.attachment){try{const blob=await readAttachment(file);put('Stash/'+file.name,new Uint8Array(await blob.arrayBuffer()),{kind:file.kind,mime:blob.type});}catch{missing.push('Stash/'+file.name);}}else put('Stash/'+file.name,file.content||'',{kind:'text'});}
    portable.resources=[];
    for(let i=0;i<(original.resources||[]).length;i++){
      const entry=copy(original.resources[i]),meta=entry[4]||{},address=resourceAddress(entry,home),attachment=meta.attachment;
      if(!attachment&&/^https?:\/\//i.test(address)){entry[4]={...meta,address,source:{label:'Web resource',address}};portable.resources.push(entry);report.push({label:entry[0],kind:'web',detail:'Kept as a web link'});continue;}
      if(!attachment&&!address){portable.resources.push(entry);continue;}
      const source=attachment?.key||attachment?.src||address;let target=sources.get(source),blob;
      if(!target){
        const internal=address.startsWith(original.root.replace(/\/$/,'')+'/')?address.slice(original.root.replace(/\/$/,'').length+1):null;
        target=internal&&safePath(internal)?internal:unique('Linked resources/'+(attachment?.filename||attachment?.src?.split('/').at(-1)||address.split('/').at(-1)||entry[0]).replace(/[\\/\x00-\x1f<>:"|?*]/g,'-'),used);
        try{
          if(replacements[i])blob=replacements[i];
          else if(attachment)blob=await readAttachment({id:'resource-'+i,attachment});
          else {const content=entries.find(e=>e.path===internal)?.data??await readPath?.(address);if(content!==undefined&&content!==null)blob=new Blob([content]);}
          if(!blob)throw Error('Unavailable');
          put(target,new Uint8Array(await blob.arrayBuffer()),{kind:attachment?.kind||'file',mime:blob.type});sources.set(source,target);
        }catch{missing.push(entry[0]);report.push({index:i,label:entry[0],kind:'missing',detail:address||'Saved attachment unavailable'});portable.resources.push(entry);continue;}
      }
      const next={...meta,address:'./'+target,source:{label:'Included Project file',address:'./'+target}};
      if(attachment)next.attachment={kind:attachment.kind,filename:attachment.filename||target.split('/').at(-1),format:attachment.format||'File',packagePath:target,mime:attachment.mime||blob?.type||''};
      entry[4]=next;if(String(entry[1]).startsWith('Linked · '))entry[1]='Linked · ./'+target;
      portable.resources.push(entry);report.push({index:i,label:entry[0],kind:'included',detail:target});
    }
    const requirements=[...new Set(Object.values(portable.modes||{}).flatMap(mode=>mode.apps||[]))];
    const manifest={format:'spatial-project',version:1,project:portable,requirements,samples,files:entries.map(({path,kind='text',mime='text/plain'})=>({path,kind,mime}))};
    put('.spatial-project.toml','name = '+JSON.stringify(portable.name)+'\nroot = "."\nmetadata = ".spatial-project.json"\n');
    put('.spatial-project.json',JSON.stringify(manifest,null,2));
    return {manifest,entries,report,missing,samples,size:entries.reduce((n,e)=>n+e.data.length,0)};
  }
  function inspect(input){
    const files=unzip(input),raw=files.get('.spatial-project.json');if(!raw)throw Error('This ZIP has no Spatial Project settings.');
    const manifest=JSON.parse(dec.decode(raw)),p=manifest.project;
    if(manifest.format!=='spatial-project'||manifest.version!==1||!p||typeof p.name!=='string'||!p.name.trim()||!p.modes||typeof p.modes!=='object'||Array.isArray(p.modes))throw Error('Unsupported Project settings.');
    if(!Array.isArray(p.files)||p.files.length>1000||!Array.isArray(p.resources)||p.resources.length>100||!Array.isArray(manifest.files))throw Error('Invalid Project file list.');
    for(const file of manifest.files){if(!safePath(file.path)||!files.has(file.path))throw Error('A Project file is missing from this ZIP.');}
    for(const resource of p.resources){if(!Array.isArray(resource)||typeof resource[0]!=='string')throw Error('Invalid linked resource.');const meta=resource[4]||{};for(const value of [meta.address,meta.source?.address])if(value&&(!/^https?:\/\//i.test(value)&&(!value.startsWith('./')||!safePath(value.slice(2))||!files.has(value.slice(2)))))throw Error('A linked file is missing from this ZIP.');if(meta.attachment&&(!safePath(meta.attachment.packagePath)||!files.has(meta.attachment.packagePath)||!['image','audio','document','file'].includes(meta.attachment.kind)))throw Error('Invalid attached Project file.');}
    return {manifest,files};
  }
  const api={safePath,crc,zip,unzip,build,inspect,decode:data=>dec.decode(data),LIMIT};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SpatialProjectArchive=api;
})(typeof globalThis!=='undefined'?globalThis:this);
