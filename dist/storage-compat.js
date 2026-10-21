/* Browser compatibility and preserved files from the earlier panel preview. */
(function(root){
  'use strict';
  // UUID is a secure-context API; local HTTP previews still have the native
  // cryptographic random source. Keep their ordinary file IDs working too.
  if(root.crypto&&typeof root.crypto.randomUUID!=='function'&&typeof root.crypto.getRandomValues==='function'){
    try{Object.defineProperty(root.crypto,'randomUUID',{configurable:true,writable:true,value(){
      const bytes=new Uint8Array(16);root.crypto.getRandomValues(bytes);
      bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
      const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
      return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
    }});}catch{}
  }
  const prefix='spatial-panels-experiment:',marker='spatial-widget-storage-compat-v1';
  let useLegacyFiles=false;
  try{
    const storage=root.localStorage;
    useLegacyFiles=storage.getItem(marker)==='legacy-files'||storage.getItem(prefix+'spatial-widget-panels-v1')!==null;
    for(const name of ['localStorage','sessionStorage']){
      const store=root[name],keys=[];
      for(let i=0;i<store.length;i++){const key=store.key(i);if(key?.startsWith(prefix))keys.push(key);}
      for(const key of keys){const target=key.slice(prefix.length);if(store.getItem(target)===null)store.setItem(target,store.getItem(key));}
    }
    if(useLegacyFiles)storage.setItem(marker,'legacy-files');
  }catch{}
  // IndexedDB names are retained for installations that already own preview files.
  // New installations use the normal database names; browser storage APIs stay native.
  if(useLegacyFiles&&root.indexedDB){
    const databases=root.indexedDB;
    Object.defineProperty(root,'indexedDB',{configurable:true,value:new Proxy(databases,{get(target,name){
      if(name==='open'||name==='deleteDatabase')return (database,...args)=>target[name](String(database).startsWith(prefix)?database:prefix+database,...args);
      const value=Reflect.get(target,name,target);return typeof value==='function'?value.bind(target):value;
    }})});
  }
})(globalThis);
