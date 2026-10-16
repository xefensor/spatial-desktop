/* Content-sized compact Areas beside expanded Areas in a vertical dock. */
(function(root){
  'use strict';
  const compactWidth=240;
  const finiteSize=value=>Number.isFinite(value)?Math.max(0,value):0;

  /**
   * Local column rectangles, preserving names order. Wide rail Areas expose
   * compactGrid; mixed columns reserve at least half their usable height for
   * expanded peers. All-equal states and narrow columns retain equal splits.
   */
  function layout(options={}){
    options=options&&typeof options==='object'?options:{};
    const names=[...new Set((Array.isArray(options.names)?options.names:[]).filter(name=>typeof name==='string'&&name.length))];
    if(!names.length)return {};
    const width=finiteSize(options.width),height=finiteSize(options.height),states=options.states||{};
    const gap=names.length>1?Math.min(finiteSize(options.gap),height/(names.length-1)):0;
    const usable=Math.max(0,height-gap*(names.length-1)),wide=width>=compactWidth;
    const compact=names.filter(name=>states[name]==='rail'),expanded=names.filter(name=>states[name]!=='rail');
    const heights=new Map(names.map(name=>[name,usable/names.length]));
    if(wide&&compact.length&&expanded.length){
      const desired=compact.map(name=>{
        const override=options.compactHeights?.[name];
        return Math.min(usable,Number.isFinite(override)&&override>0?override:name==='systems'?240:156);
      });
      const largest=Math.max(...desired),relative=largest?desired.reduce((sum,value)=>sum+value/largest,0):0;
      const budget=usable/2,scaleDown=largest&&relative>budget/largest;
      compact.forEach((name,index)=>heights.set(name,scaleDown?(desired[index]/largest)/relative*budget:desired[index]));
      const compactTotal=compact.reduce((sum,name)=>sum+heights.get(name),0),expandedHeight=(usable-compactTotal)/expanded.length;
      expanded.forEach(name=>heights.set(name,expandedHeight));
    }
    let y=0;
    return Object.fromEntries(names.map((name,index)=>{
      // Bound the last edge to the column even after fractional allocations.
      const allocated=Math.min(heights.get(name),Math.max(0,height-y));
      const entry=[name,{y:Math.min(y,height),height:allocated,compactGrid:wide&&states[name]==='rail'}];
      y+=allocated+(index<names.length-1?gap:0);
      return entry;
    }));
  }

  const thresholds=Object.freeze({
    compactCrossSize:compactWidth,
    horizontalGridWidth:160,
    horizontalGridHeight:120,
    compactExtent:Object.freeze({vertical:72,horizontal:64}),
    expandedExtent:Object.freeze({
      vertical:Object.freeze({apps:380,projects:240,systems:240,ai:260}),
      horizontal:Object.freeze({apps:300,projects:320,systems:300,ai:320})
    })
  });
  const expandedMinimum=(axis,name)=>{
    const value=thresholds.expandedExtent[axis==='horizontal'?'horizontal':'vertical'][name];
    return Number.isFinite(value)?value:axis==='horizontal'?300:220;
  };

  /* Keep positive shares proportional unless a panel would lose all controls. */
  function sharedExtents(names,shares,usable,minimum){
    if(usable<=minimum*names.length)return names.map(()=>usable/names.length);
    const largest=Math.max(...names.map(name=>shares[name]));
    const weights=names.map(name=>shares[name]/largest),sizes=names.map(()=>0);
    let remaining=names.map((_,index)=>index),available=usable;
    while(remaining.length){
      const total=remaining.reduce((sum,index)=>sum+weights[index],0);
      const small=remaining.filter(index=>weights[index]/total*available<minimum);
      if(!small.length){
        remaining.forEach(index=>{sizes[index]=weights[index]/total*available;});
        break;
      }
      const fixed=new Set(small);
      small.forEach(index=>{sizes[index]=minimum;available-=minimum;});
      remaining=remaining.filter(index=>!fixed.has(index));
    }
    return sizes;
  }

  /**
   * Allocate a dock along either axis. Saved shares express relative space, not
   * presentation: an expanded preference returns automatically when it fits.
   * Incomplete/invalid shares retain the content-sized legacy default instead.
   */
  function allocate(options={}){
    options=options&&typeof options==='object'?options:{};
    const names=[...new Set((Array.isArray(options.names)?options.names:[]).filter(name=>typeof name==='string'&&name.length))];
    if(!names.length)return {};
    const axis=options.axis==='horizontal'?'horizontal':'vertical';
    const extent=finiteSize(options.extent),crossSize=finiteSize(options.crossSize);
    const gap=names.length>1?Math.min(finiteSize(options.gap),extent/(names.length-1)):0;
    const usable=Math.max(0,extent-gap*(names.length-1));
    const states=options.states&&typeof options.states==='object'?options.states:{};
    const shares=options.shares&&typeof options.shares==='object'?options.shares:null;
    const explicit=shares&&names.every(name=>Object.hasOwn(shares,name)&&Number.isFinite(shares[name])&&shares[name]>0);
    let sizes;
    if(explicit){
      sizes=sharedExtents(names,shares,usable,thresholds.compactExtent[axis]);
    }else if(axis==='vertical'){
      const legacy=layout({names,states,width:crossSize,height:extent,gap,compactHeights:options.compactHeights});
      sizes=names.map(name=>legacy[name].height);
    }else{
      sizes=names.map(()=>usable/names.length);
    }
    let offset=0;
    return Object.fromEntries(names.map((name,index)=>{
      offset=Math.min(offset,extent);
      const size=index===names.length-1?Math.max(0,extent-offset):Math.min(sizes[index],Math.max(0,extent-offset));
      const state=states[name]==='rail'||size+1e-7<expandedMinimum(axis,name)?'rail':'expanded';
      const gridFits=axis==='vertical'?crossSize>=compactWidth:size>=thresholds.horizontalGridWidth&&crossSize>=thresholds.horizontalGridHeight;
      const entry=[name,{offset,extent:size,state,compactGrid:gridFits&&state==='rail'}];
      offset+=size+(index<names.length-1?gap:0);
      return entry;
    }));
  }

  const api={layout,allocate,thresholds,expandedMinimum};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.SpatialCompactAreas=api;
})(typeof globalThis!=='undefined'?globalThis:this);
