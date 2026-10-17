/* Bounded local file commands. No shell, provider or native filesystem access. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SpatialAssistantFiles=api;})(globalThis,function(){
  'use strict';
  const formats={txt:'txt',text:'txt',md:'md',markdown:'md',html:'html',json:'json',csv:'csv',png:'png',jpg:'jpg',jpeg:'jpg',webp:'webp'};
  const mime={txt:'text/plain',md:'text/markdown',html:'text/html',json:'application/json',csv:'text/csv',png:'image/png',jpg:'image/jpeg',webp:'image/webp'};
  const clean=value=>String(value||'').trim().replace(/^["'`]|["'`]$/g,'');
  function path(value,base='/'){
    const raw=clean(value);if(!raw||/[\x00-\x1f\\]/.test(raw)||/^[a-z]+:/i.test(raw))throw Error('Use a local folder path.');
    const parts=[];for(const part of (raw.startsWith('/')?raw:base+'/'+raw).split('/')){if(part==='..')parts.pop();else if(part&&part!=='.')parts.push(part);}return '/'+parts.join('/');
  }
  const inside=(value,root)=>value===root||value.startsWith(root.replace(/\/$/,'')+'/');
  function allowed(value,workspace,profiles,projects,accessibleProjects=[]){
    const owners=[...Object.entries(profiles).map(([id,p])=>({root:p.home,workspace:id})),...Object.entries(projects).filter(([id,p])=>p.originWorkspace||accessibleProjects.includes(id)).map(([id,p])=>({root:p.root,workspace:accessibleProjects.includes(id)?workspace:p.originWorkspace}))].filter(p=>inside(value,p.root)).sort((a,b)=>b.root.length-a.root.length);
    return owners[0]?.workspace===workspace;
  }
  function parse(request){
    const raw=String(request||'');if(!/\b(convert|export|prevest|převeď|převest|převe[dď]|konvert)/i.test(raw))return null;
    if(/\b(delete|overwrite|replace|remove|smaz|přepi|prepi)/i.test(raw))throw Error('This demo creates converted copies. Original files are never overwritten or deleted.');
    const match=/\b(?:to|into|as|na|do)\s+(plain\s+text|markdown|jpeg|webp|html|json|csv|png|jpg|txt|text|md)\b/i.exec(raw);
    if(!match)throw Error('Choose a format: TXT, Markdown, HTML, JSON, CSV, PNG, JPEG or WebP.');
    const format=formats[match[1].toLowerCase().replace(/plain\s+/,'')],before=raw.slice(0,match.index),after=raw.slice(match.index+match[0].length);
    const from=/\b(?:in|from)\s+(.+?)\s*$/i.exec(before),to=/\b(?:in|into|to|do)\s+(?:the\s+)?(?:folder\s+)?(.+?)\s*[.!]?$/i.exec(after);
    const named=/\b(?:convert|export)\s+(?:"([^"]+\.[a-z0-9]+)"|'([^']+\.[a-z0-9]+)'|([\w.-]+\.[a-z0-9]+))/i.exec(before);
    const ext=/\b(?:all\s+)?(png|jpe?g|webp|md|txt|html|json|csv)(?:\s+files?|\s+images?)?\b/i.exec(before);
    return {format,sourceName:named?(named[1]||named[2]||named[3]):'',sourceFolder:from?clean(from[1]):'',destination:to?clean(to[1]):'',extension:ext?ext[1].toLowerCase():''};
  }
  function chooseFolder(value,base,folders){
    const direct=path(value,base);if(folders.includes(direct)||clean(value).startsWith('/'))return direct;
    const matches=[...new Set(folders.filter(folder=>folder.split('/').at(-1).toLowerCase()===clean(value).toLowerCase()))];
    if(matches.length>1)throw Error('More than one folder is named '+clean(value)+'. Use its full path.');return matches[0]||direct;
  }
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function csvRows(text){
    const rows=[];let row=[],cell='',quoted=false,ended=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;ended=true;}else cell+=c;}
      else if(c==='"'){if(cell||ended)throw Error('Invalid CSV quoting.');quoted=true;}
      else if(c===','){row.push(cell);cell='';ended=false;}
      else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';ended=false;}
      else {if(ended&&!/\s/.test(c))throw Error('Invalid CSV after a closing quote.');if(!ended)cell+=c;}}
    if(quoted)throw Error('CSV contains an unclosed quote.');if(cell||row.length||ended)rows.push([...row,cell]);return rows;
  }
  function convertText(text,from,to){
    text=String(text??'');from=String(from||'').toLowerCase();
    if(to==='html')return '<!doctype html>\n<html lang="en"><meta charset="utf-8"><title>Converted document</title><body>\n'+(from==='md'?text.split(/\r?\n/).map(line=>{const h=/^(#{1,6})\s+(.*)$/.exec(line);return h?'<h'+h[1].length+'>'+escape(h[2])+'</h'+h[1].length+'>':line?'<p>'+escape(line)+'</p>':'';}).join('\n'):'<pre>'+escape(text)+'</pre>')+'\n</body></html>\n';
    if(to==='json'){
      if(from==='csv'){const [headers=[],...rows]=csvRows(text);if(new Set(headers).size!==headers.length)throw Error('CSV headers must be unique.');if(rows.some(row=>row.length!==headers.length))throw Error('CSV rows must match the header.');return JSON.stringify(rows.map(row=>Object.fromEntries(headers.map((key,i)=>[key,row[i]]))),null,2)+'\n';}
      if(from==='json')return JSON.stringify(JSON.parse(text),null,2)+'\n';return JSON.stringify({text},null,2)+'\n';
    }
    if(to==='csv'){
      if(from==='csv'){csvRows(text);return text;}
      if(from!=='json')throw Error('CSV conversion needs JSON containing an array of objects, or an existing CSV file.');
      const rows=JSON.parse(text);if(!Array.isArray(rows)||rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw Error('Use a JSON array of objects for CSV.');
      const keys=[...new Set(rows.flatMap(Object.keys))],cell=value=>'"'+String(value===undefined?'':typeof value==='object'?JSON.stringify(value):value).replace(/"/g,'""')+'"';return [keys,...rows.map(row=>keys.map(k=>row[k]))].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
    }
    if(!['txt','md'].includes(to))throw Error('This format needs image bytes.');
    if(from==='html')return text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/(?:p|div|h[1-6]|li)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g,(_,e)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",'#39':"'",nbsp:' '}[e])).trim()+'\n';
    if(from==='json')return JSON.stringify(JSON.parse(text),null,2)+'\n';return text;
  }
  function select(names,current,clicked,{ctrl=false,shift=false}={}){
    const before=new Set(current||[]);if(shift&&before.size){const anchor=names.indexOf([...before].at(-1)),end=names.indexOf(clicked);if(anchor>=0&&end>=0)return [...new Set([...before,...names.slice(Math.min(anchor,end),Math.max(anchor,end)+1)])];}
    if(ctrl){if(before.has(clicked))before.delete(clicked);else before.add(clicked);return [...before];}return [clicked];
  }
  function action(value){
    if(!value||!formats[value.format])return undefined;
    return {format:formats[value.format],destination:String(value.destination||'').slice(0,1000),status:['review','running','complete','failed','cancelled'].includes(value.status)?value.status:'review',error:String(value.error||'').slice(0,600),outputs:(Array.isArray(value.outputs)?value.outputs:[]).slice(0,24).map(o=>({path:String(o.path||'').slice(0,1000),itemId:String(o.itemId||'').slice(0,180)}))};
  }
  return {parse,path,inside,allowed,chooseFolder,convertText,csvRows,select,action,mime,formats};
});
