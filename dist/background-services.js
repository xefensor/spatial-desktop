/* Background processes have a shared identity, independent of window placement. */
(function(root){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function legacyId(workspace,id){let hash=14695981039346656037n;for(const char of workspace+':'+id)hash=BigInt.asUintN(64,(hash^BigInt(char.codePointAt(0)))*1099511628211n);return 'legacy-'+hash.toString(16);}
  function create(saved={}){
    const records=new Map(),removed={};let clock=0;
    const next=()=>clock=Math.max(Date.now(),clock+1);
    function merge(snapshot={}){
      for(const [id,rev] of Object.entries(snapshot.removed||{})){if(!Number.isFinite(rev))continue;removed[id]=Math.max(removed[id]||0,rev);clock=Math.max(clock,rev);}
      for(const item of snapshot.items||[]){if(!item||typeof item.id!=='string'||!['steam','elisa'].includes(item.kind)||!item.model||!Number.isFinite(item.rev))continue;clock=Math.max(clock,item.rev);if(item.rev>(records.get(item.id)?.rev||0)&&item.rev>(removed[item.id]||0))records.set(item.id,clone(item));}
      for(const [id,item] of records)if((removed[id]||0)>=item.rev)records.delete(id);
    }
    merge(saved);
    return {merge,items:()=>[...records.values()],get:id=>records.get(id),known:id=>records.has(id)||Object.hasOwn(removed,id),
      put(item){const record=clone(item);record.rev=next();records.set(record.id,record);return record;},
      touch(id){const item=records.get(id);if(item)item.rev=next();},
      remove(id){removed[id]=next();records.delete(id);},
      snapshot:()=>clone({items:[...records.values()],removed})};
  }
  const api={create,legacyId};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SpatialBackgroundServices=api;
})(typeof globalThis!=='undefined'?globalThis:this);
