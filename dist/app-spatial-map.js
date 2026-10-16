/* A small spatial grid for app icons. Coordinates come from settled windows. */
(function(root){
  'use strict';
  const gutterTolerance=16;

  function identity(value){
    if(typeof value==='string')return value;
    return typeof value==='number'&&Number.isFinite(value)?String(value):null;
  }

  function geometry(rect){
    if(![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite)||rect.width<=0||rect.height<=0)return null;
    const right=rect.x+rect.width,bottom=rect.y+rect.height;
    // An unrepresentable edge cannot produce a nonzero CSS-grid cell.
    if(!Number.isFinite(right)||!Number.isFinite(bottom)||right<=rect.x||bottom<=rect.y)return null;
    return {x:rect.x,y:rect.y,right,bottom,width:rect.width,height:rect.height};
  }

  function intersects(a,b){
    return a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
  }

  function tracks(rects,axis){
    const start=axis==='x'?'x':'y',end=axis==='x'?'right':'bottom',extent=axis==='x'?'width':'height';
    const edges=[];
    for(const rect of rects){
      // A normal 8px gutter becomes one boundary. Small windows keep both
      // of their edges even when they are narrower than the normal tolerance.
      const tolerance=Math.min(gutterTolerance,rect[extent]/4);
      edges.push({value:rect[start],rect,side:'start',tolerance},{value:rect[end],rect,side:'end',tolerance});
    }
    edges.sort((a,b)=>a.value-b.value);
    const groups=[];
    for(const edge of edges){
      let group=groups[groups.length-1];
      const tolerance=Math.min(group?.tolerance??gutterTolerance,edge.tolerance);
      if(!group||edge.value-group.min>tolerance||group.rects.has(edge.rect)){
        group={min:edge.value,max:edge.value,tolerance:edge.tolerance,rects:new Set(),edges:[]};groups.push(group);
      }
      group.max=edge.value;group.tolerance=Math.min(group.tolerance,edge.tolerance);group.rects.add(edge.rect);group.edges.push(edge);
    }
    const points=groups.map(group=>group.min+(group.max-group.min)/2),positions=new Map();
    groups.forEach((group,index)=>group.edges.forEach(edge=>{
      if(!positions.has(edge.rect))positions.set(edge.rect,{});
      positions.get(edge.rect)[edge.side]=index;
    }));
    const total=points[points.length-1]-points[0];
    if(!Number.isFinite(total)||total<=0)return null;
    const weights=points.slice(1).map((value,index)=>(value-points[index])/total);
    if(weights.some(value=>!Number.isFinite(value)||value<=0))return null;
    return {weights,positions};
  }

  /**
   * Return CSS-grid-ready, 1-based cells and normalized fractional tracks.
   * Unsupported windows stay in the caller's fallback strip, in input order.
   * IDs remain opaque text; this module never creates markup or DOM nodes.
   */
  function layout(rectangles){
    const entries=[],seen=new Set();
    for(const source of Array.isArray(rectangles)?rectangles:[]){
      if(!source||typeof source!=='object')continue;
      const id=identity(source.id);
      if(id===null||seen.has(id))continue;
      seen.add(id);
      const bounds=geometry(source);
      entries.push({id,...bounds,fallback:!!source.floating||!bounds});
    }
    const candidates=entries.filter(rect=>!rect.fallback),overlapping=new Set();
    // Do not invent a tiling order for overlapping windows. Keep every member
    // of an overlap together in the fallback strip, rather than hiding a target.
    for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
      if(intersects(candidates[i],candidates[j])){overlapping.add(candidates[i]);overlapping.add(candidates[j]);}
    }
    overlapping.forEach(rect=>{rect.fallback=true;});
    const tiled=entries.filter(rect=>!rect.fallback),empty=()=>({columns:[],rows:[],cells:[],fallback:entries.map(rect=>rect.id)});
    if(!tiled.length)return empty();
    const horizontal=tracks(tiled,'x'),vertical=tracks(tiled,'y');
    if(!horizontal||!vertical)return empty();
    return {
      columns:horizontal.weights,
      rows:vertical.weights,
      cells:tiled.map(rect=>{
        const x=horizontal.positions.get(rect),y=vertical.positions.get(rect);
        return {id:rect.id,column:x.start+1,row:y.start+1,columnSpan:x.end-x.start,rowSpan:y.end-y.start};
      }),
      fallback:entries.filter(rect=>rect.fallback).map(rect=>rect.id)
    };
  }

  const api={layout};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.SpatialAppMap=api;
})(typeof globalThis!=='undefined'?globalThis:this);
