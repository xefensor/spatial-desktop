/* Preserve files and preferences created by the earlier hosted panel preview. */
(function(root){
  'use strict';
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
