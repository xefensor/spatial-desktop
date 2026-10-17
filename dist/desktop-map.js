/* Read-only projection of the active Workspace. No desktop or window mutations. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./spatial-tiling.js'):root.SpatialTiling);if(typeof module==='object'&&module.exports)module.exports=api;else root.SpatialDesktopMap=api;})(globalThis,function(T){
  'use strict';
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function scenes(names,session={},bounds={width:1000,height:640}){
    const b={x:0,y:0,width:Math.max(1,bounds.width),height:Math.max(1,bounds.height)},floating=session.floating||{};
    const tiled=names.filter(name=>!floating[name]),tree=T.normalize(session.root,tiled),missing=tiled.filter(name=>!T.contains(tree,name));
    const root=missing.length?T.rowMajor(tiled,b,()=>({width:1,height:1})):tree;
    const rects=T.layout(root,b).windows,full=session.fullscreen?.name||session.focus?.name;
    for(const name of names){if(floating[name])rects.set(name,floating[name]);if(name===full)rects.set(name,b);}
    return names.map(name=>{const r=rects.get(name)||b,x=clamp(Number(r.x)||0,0,b.width-1),y=clamp(Number(r.y)||0,0,b.height-1);return {name,x:x/b.width,y:y/b.height,width:clamp(Number(r.width)||b.width,1,b.width-x)/b.width,height:clamp(Number(r.height)||b.height,1,b.height-y)/b.height,top:name===full,floating:Boolean(floating[name])};});
  }
  function build({columns,windows,displays,session,currentColumn,currentPage}){
    return columns.map(column=>{
      const owned=windows.filter(w=>w.column===column.id),open=owned.filter(w=>w.state==='open');
      return {...column,pages:Array.from({length:Math.max(1,column.pages)},(_,page)=>({page,current:column.id===currentColumn&&page===currentPage,displays:displays.map(display=>({...display,windows:scenes(open.filter(w=>w.page===page&&w.display===display.slot).map(w=>w.id),session(column.id,page,display.slot),display).map(rect=>({...open.find(w=>w.id===rect.name),...rect}))}))})),parked:owned.filter(w=>w.state==='minimized')};
    });
  }
  function move(columns,column,page,key){
    let c=columns.findIndex(item=>item.id===column);if(c<0)c=0;
    if(key==='ArrowLeft')c=Math.max(0,c-1);if(key==='ArrowRight')c=Math.min(columns.length-1,c+1);
    const count=columns[c]?.pages.length||1;
    if(key==='ArrowUp')page--;if(key==='ArrowDown')page++;
    if(key==='Home')page=0;if(key==='End')page=count-1;
    return {column:columns[c]?.id,page:clamp(page,0,count-1)};
  }
  return {scenes,build,move};
});
