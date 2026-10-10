/* Explicit, local working memory. No background clipboard or screen capture. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SpatialWorkingMemory=factory();})(globalThis,function(){
  'use strict';
  const clean=(value,max=12000)=>String(value??'').slice(0,max);
  const scope=(workspace,project=null)=>JSON.stringify([workspace,project||null]);
  const normalize=value=>clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function source(value={}) {
    value=value||{};
    const address=clean(value.address,2000);
    return {label:clean(value.label,160),address:/^(https?:\/\/|\/)/i.test(address)?address:'',app:clean(value.app,100),desktop:Math.max(0,Number(value.desktop)||0)};
  }
  function create(saved={},clock=()=>Date.now(),writer=Math.random().toString(36).slice(2)) {
    let state={version:1,records:Object.create(null)};let sequence=0;
    function merge(incoming){
      if(incoming?.version!==1||!incoming.records||typeof incoming.records!=='object')return false;
      let changed=false;
      Object.entries(incoming.records).forEach(([id,item])=>{
        if(!item||id.length>180||typeof item.scope!=='string'||item.scope.length>300||!Number.isFinite(item.updated)||!['item','next','visit','seed'].includes(item.kind))return;
        let owner;try{owner=JSON.parse(item.scope);}catch{return;}if(!Array.isArray(owner)||owner.length!==2||typeof owner[0]!=='string'||!(owner[1]===null||typeof owner[1]==='string'))return;
        const old=state.records[id];
        if(old&&(old.updated>item.updated||(old.updated===item.updated&&old.revision>=String(item.revision||''))))return;
        state.records[id]={id,scope:item.scope,kind:item.kind,title:clean(item.title,120),text:clean(item.text),source:source(item.source),updated:item.updated,created:Number(item.created)||item.updated,revision:clean(item.revision,100),deleted:item.deleted===true,pinned:item.pinned===true,desktop:Math.max(0,Number(item.desktop)||0),apps:Array.isArray(item.apps)?item.apps.filter(x=>typeof x==='string').slice(0,40):[]};changed=true;
      });return changed;
    }
    merge(saved);
    function write(id,patch){const prev=state.records[id]||{};const updated=Math.max(clock(),(prev.updated||0)+1);const item={...prev,...patch,id,updated,created:prev.created||updated,revision:writer+':'+(++sequence)};merge({version:1,records:{[id]:item}});return state.records[id];}
    function records(key,kind){return Object.values(state.records).filter(item=>item.scope===key&&item.kind===kind&&!item.deleted).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updated-a.updated);}
    function add(key,value){if(!clean(value.text).trim()&&!clean(value.source?.address).trim())return null;if(records(key,'item').length>=80)return null;const id=writer+'-'+clock().toString(36)+'-'+(++sequence);return write(id,{scope:key,kind:'item',title:clean(value.title,120).trim()||clean(value.text,60).split('\n')[0]||'Saved source',text:clean(value.text),source:source(value.source),pinned:false});}
    function edit(id,patch){const old=state.records[id];if(!old||old.deleted||old.kind!=='item')return null;return write(id,{title:patch.title===undefined?old.title:clean(patch.title,120),text:patch.text===undefined?old.text:clean(patch.text),source:patch.source===undefined?old.source:source(patch.source),pinned:patch.pinned===undefined?old.pinned:!!patch.pinned});}
    function remove(id){if(state.records[id])write(id,{deleted:true});}
    function restore(id){if(state.records[id])write(id,{deleted:false});}
    function next(key,text){return write('next:'+key,{scope:key,kind:'next',text:clean(text,500),title:'Next step'});}
    function visit(key,entry){const latest=records(key,'visit')[0];if(latest&&latest.title===entry.title&&latest.desktop===entry.desktop&&clock()-latest.updated<60000)return;const id='visit:'+writer+'-'+clock().toString(36)+'-'+(++sequence);write(id,{scope:key,kind:'visit',title:clean(entry.title,120),text:'',desktop:entry.desktop,apps:entry.apps||[],source:source(entry.source)});records(key,'visit').slice(30).forEach(item=>remove(item.id));}
    function search(query,workspace,now=clock()) {
      let text=normalize(query);const yesterday=/\b(yesterday|vcera)\b/.test(text),today=/\b(today|dnes)\b/.test(text);
      text=text.replace(/\b(yesterday|today|vcera|dnes)\b/g,'');const words=text.match(/[\p{L}\p{N}]+/gu)||[];
      const day=new Date(now);day.setHours(0,0,0,0);const start=day.getTime();const previous=new Date(start);previous.setDate(previous.getDate()-1);
      return Object.values(state.records).filter(item=>{if(item.deleted||!['item','next'].includes(item.kind)||(!item.text.trim()&&!item.source.address)||JSON.parse(item.scope)[0]!==workspace)return false;if(yesterday&&(item.updated<previous.getTime()||item.updated>=start))return false;if(today&&item.updated<start)return false;const haystack=normalize([item.title,item.text,item.source.label,item.source.address].join(' '));return (words.length||yesterday||today)&&words.every(word=>haystack.includes(word));}).sort((a,b)=>b.updated-a.updated).slice(0,30);
    }
    return {add,edit,remove,restore,next,visit,merge,search,promoteNext(key,duplicate){const item=records(key,'next')[0];if(!item)return;if(!item.text.trim()||item.text===duplicate)remove(item.id);else write(item.id,{kind:'item',title:'Next step note'});},items:key=>records(key,'item'),history:key=>records(key,'visit'),nextStep:key=>records(key,'next')[0]?.text||'',get:id=>state.records[id],snapshot:()=>JSON.parse(JSON.stringify(state)),seeded:key=>!!state.records['seed:'+key],markSeeded:key=>write('seed:'+key,{scope:key,kind:'seed'})};
  }
  function compose(items){return items.map((item,index)=>'['+(index+1)+'] '+item.title+'\n'+item.text+(item.source.address?'\nSource: '+item.source.address:item.source.label?'\nSource: '+item.source.label:'')).join('\n\n');}
  function compare(items){if(items.length!==2)return null;const lines=item=>item.text.split(/\n+/).map(line=>line.trim()).filter(Boolean);const [a,b]=items.map(lines);const normalized=list=>new Set(list.map(normalize));const first=normalized(a),second=normalized(b);return {shared:a.filter(line=>second.has(normalize(line))),onlyFirst:a.filter(line=>!second.has(normalize(line))),onlySecond:b.filter(line=>!first.has(normalize(line)))};}
  return {create,scope,source,compose,compare};
});
