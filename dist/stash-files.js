/* Project-owned files in the demo filesystem. Binary contents live in IndexedDB. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SpatialStashFiles=factory();})(globalThis,function(){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const folder=project=>project.root.replace(/\/+$/,'')+'/Stash';
  const safeName=value=>String(value||'Untitled').normalize('NFC').replace(/[\\/\x00-\x1f<>:"|?*]/g,'-').replace(/^\.+|\.+$/g,'').trim().slice(0,100)||'Untitled';
  function safeAttachment(value){
    if(!value||!['image','audio','document','file'].includes(value.kind))return null;
    const src=String(value.src||''),key=String(value.key||'');
    if(key&&/^stash-[\w-]{1,160}$/.test(key))return {...value,key,src:undefined};
    if(!/^(?:media\/stash\/|images\/philosophy\/)[a-zA-Z0-9_./-]+$/.test(src)||src.split('/').includes('..'))return null;
    const ext={image:/\.(?:svg|png|jpe?g|webp)$/i,audio:/\.(?:wav|mp3|ogg)$/i,document:/\.html$/i};
    return ext[value.kind]?.test(src)?{...value,src}:null;
  }
  function describe(item){
    const attachment=safeAttachment(item.attachment),address=item.source?.address||'';
    if(attachment){const original=attachment.filename||attachment.src?.split('/').at(-1)||item.title;const ext=original.match(/\.[a-z0-9]{1,10}$/i)?.[0]||'';return {kind:attachment.kind,name:safeName(item.title.replace(/\.[a-z0-9]{1,10}$/i,''))+ext,content:null,attachment};}
    if(address&&(item.resourceType==='web'||!item.text?.trim()||item.text.startsWith('Linked · '))){const web=/^https?:\/\//i.test(address);return {kind:'link',name:safeName(item.title)+(web?'.url':'.link'),content:web?'[InternetShortcut]\nURL='+address+'\n':address+'\n',attachment:null};}
    return {kind:'note',name:safeName(item.title.replace(/\.md$/i,''))+'.md',content:String(item.text||'')+(address?'\n\nSource: '+address+'\n':''),attachment:null};
  }
  function materialize(project,items){
    const previous=project.stash?.files||{},files={},used=new Set(),retained=new Map();
    for(const item of items){const id=item.fileId||item.id,old=previous[id];if(old&&old.title===item.title&&old.name===safeName(old.name)&&!used.has(old.name.toLocaleLowerCase())){retained.set(id,old.name);used.add(old.name.toLocaleLowerCase());}}
    for(const item of items){const id=item.fileId||item.id;if(files[id])continue;const desc=describe(item);let name=retained.get(id)||desc.name,n=2;const dot=name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';if(!retained.has(id)){while(used.has(name.toLocaleLowerCase()))name=stem+' ('+(n++)+')'+ext;used.add(name.toLocaleLowerCase());}
      files[id]={id,name,kind:desc.kind,content:desc.content,attachment:desc.attachment,caption:item.text||'',title:item.title,source:clone(item.source||{}),updated:item.updated||0,pinned:!!item.pinned,record:item.resourceIndex===undefined?clone(item):null};
      if(previous[id]?.blobKey&&JSON.stringify(previous[id].attachment)===JSON.stringify(desc.attachment))files[id].blobKey=previous[id].blobKey;
    }
    const next={version:1,files};const changed=JSON.stringify(project.stash)!==JSON.stringify(next);project.stash=next;
    if(!project.files.some(([name])=>name==='Stash')){project.files.push(['Stash','Saved notes, files and media','folder']);return true;}return changed;
  }
  const list=project=>Object.values(project.stash?.files||{});
  const rows=project=>list(project).map(file=>[file.name,file.attachment?.format||({note:'Saved note',link:'Saved link',image:'Image',audio:'Audio',document:'Document',file:'File'}[file.kind]),file.kind==='note'||file.kind==='link'?'document':file.kind]);
  let database;
  function db(){if(!database)database=new Promise((resolve,reject)=>{const request=indexedDB.open('spatial-stash-files-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});return database;}
  async function put(key,blob){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('files','readwrite');tx.objectStore('files').put(blob,key);tx.oncomplete=()=>resolve(key);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  async function get(key){const database=await db();return new Promise((resolve,reject)=>{const request=database.transaction('files').objectStore('files').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
  async function copyAsset(project,file){if(!file.attachment)return null;const key=file.attachment.key||file.blobKey||'stash-'+hash(project.root+'\n'+file.id);let blob=await get(key);if(!blob){if(!file.attachment.src)throw Error('Missing saved file');const response=await fetch(file.attachment.src);if(!response.ok)throw Error('Source unavailable');blob=await response.blob();await put(key,blob);}file.blobKey=key;return blob;}
  function hash(value){let h=2166136261;for(const char of value){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  return {folder,safeName,safeAttachment,describe,materialize,list,rows,put,get,copyAsset};
});
