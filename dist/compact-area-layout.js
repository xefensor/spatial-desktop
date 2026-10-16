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
    resistance:48,
    compactExtent:Object.freeze({vertical:72,horizontal:64}),
    compactSlot:Object.freeze({
      vertical:Object.freeze({apps:184,projects:100,systems:208,ai:100}),
      horizontal:Object.freeze({apps:196,projects:196,systems:208,ai:208})
    }),
    expandedExtent:Object.freeze({
      vertical:Object.freeze({apps:380,projects:240,systems:280,ai:260}),
      horizontal:Object.freeze({apps:300,projects:320,systems:300,ai:320})
    })
  });
  const expandedMinimum=(axis,name)=>{
    const value=thresholds.expandedExtent[axis==='horizontal'?'horizontal':'vertical'][name];
    return Number.isFinite(value)?value:axis==='horizontal'?300:220;
  };

  /* Embedded Compact cards keep a fixed slot; a narrow dock divides its lane. */
  const compactSize=(axis,name)=>{
    const value=thresholds.compactSlot[axis==='horizontal'?'horizontal':'vertical'][name];
    return Number.isFinite(value)?value:axis==='horizontal'?196:100;
  };

  /* Keep positive shares proportional unless a panel would lose all controls. */
  function sharedExtents(names,weights,usable,minimum){
    const sizes=names.map(()=>0);
    let remaining=names.map((_,index)=>index),available=usable;
    while(remaining.length){
      const total=remaining.reduce((sum,index)=>sum+weights[index],0);
      const small=remaining.filter(index=>weights[index]/total*available<minimum(names[index]));
      if(!small.length){
        remaining.forEach(index=>{sizes[index]=weights[index]/total*available;});
        break;
      }
      const fixed=new Set(small);
      small.forEach(index=>{sizes[index]=minimum(names[index]);available-=minimum(names[index]);});
      remaining=remaining.filter(index=>!fixed.has(index));
    }
    return sizes;
  }

  /**
   * Allocate a dock along either axis. Saved shares express relative space, not
   * presentation: an expanded preference returns automatically when it fits.
   * Embedded Compact slots are fixed; only Expanded peers divide spare room.
   * A whole narrow Compact dock instead fills its lane with normal rail shares.
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
    const largest=explicit?Math.max(...names.map(name=>shares[name])):1;
    const weights=names.map(name=>explicit?Math.max(Number.MIN_VALUE,shares[name]/largest):1);
    const sum=weights.reduce((total,value)=>total+value,0);
    const preferredCompact=new Set(names.filter(name=>states[name]==='rail'));
    const compactBudget=names.reduce((total,name)=>total+(preferredCompact.has(name)?compactSize(axis,name):0),0);
    const expandedCount=names.length-preferredCompact.size;
    const desired=names.map((name,index)=>explicit?weights[index]/sum*usable:preferredCompact.has(name)?compactSize(axis,name):Math.max(0,usable-compactBudget)/Math.max(1,expandedCount));
    const compact=new Set(names.filter((name,index)=>preferredCompact.has(name)||desired[index]+1e-7<expandedMinimum(axis,name)));
    let sizes;
    if(names.length===1){
      sizes=[usable];
      if(states[names[0]]!=='rail'&&usable+1e-7>=expandedMinimum(axis,names[0]))compact.delete(names[0]);
    }else{
      const minimumTotal=()=>names.reduce((total,name)=>total+(compact.has(name)?compactSize(axis,name):expandedMinimum(axis,name)),0);
      // Compact the least-supported Expanded preference first when fixed slots
      // and meaningful Expanded minima cannot all coexist in this dock.
      while(minimumTotal()>usable+1e-7&&compact.size<names.length){
        const candidates=names.map((name,index)=>({name,index,ratio:desired[index]/expandedMinimum(axis,name)})).filter(entry=>!compact.has(entry.name));
        candidates.sort((first,second)=>first.ratio-second.ratio||second.index-first.index);
        compact.add(candidates[0].name);
      }
      const fixedTotal=names.reduce((total,name)=>total+(compact.has(name)?compactSize(axis,name):0),0);
      sizes=names.map(name=>compact.has(name)?compactSize(axis,name):0);
      if(fixedTotal>usable){
        // Physical viewport constraints are the only reason a fixed Compact
        // slot can shrink. A pointer resize never produces this allocation.
        sizes=sizes.map(size=>size/fixedTotal*usable);
      }else if(compact.size===names.length&&crossSize<(axis==='vertical'?compactWidth:thresholds.horizontalGridHeight)){
        // Collapsing a mixed dock turns every Area into a narrow rail. Fixed
        // card slots would strand its controls at the top/left and waste the
        // rest of the lane. Preserve the saved split, bounded by useful rail
        // controls, while leaving its preferred states and shares untouched.
        sizes=sharedExtents(names,weights,usable,name=>compactSize(axis,name));
      }else{
        const expanded=names.filter(name=>!compact.has(name));
        if(expanded.length){
          const expandedWeights=expanded.map(name=>weights[names.indexOf(name)]);
          const allocated=sharedExtents(expanded,expandedWeights,usable-fixedTotal,name=>expandedMinimum(axis,name));
          expanded.forEach((name,index)=>{sizes[names.indexOf(name)]=allocated[index];});
        }
      }
    }
    let offset=0;
    return Object.fromEntries(names.map((name,index)=>{
      offset=Math.min(offset,extent);
      const size=Math.min(sizes[index],Math.max(0,extent-offset));
      const state=compact.has(name)?'rail':'expanded';
      const gridFits=axis==='vertical'?crossSize>=compactWidth:size>=thresholds.horizontalGridWidth&&crossSize>=thresholds.horizontalGridHeight;
      const entry=[name,{offset,extent:size,state,compactGrid:gridFits&&state==='rail'}];
      offset+=size+(index<names.length-1?gap:0);
      return entry;
    }));
  }

  /**
   * One divider gesture stage. Positive delta grows first and shrinks second.
   * Callers re-anchor after a snap: reversing direction must cross the same
   * resistance band before a fixed Compact slot expands again.
   */
  function resizePair(options={}){
    options=options&&typeof options==='object'?options:{};
    const axis=options.axis==='horizontal'?'horizontal':'vertical',first=options.first,second=options.second;
    const sizes={...(options.sizes&&typeof options.sizes==='object'?options.sizes:{})};
    const states={...(options.states&&typeof options.states==='object'?options.states:{})};
    const result={sizes,states,pressure:0,blocked:false};
    if(typeof first!=='string'||typeof second!=='string'||first===second)return result;
    const startFirst=finiteSize(sizes[first]),startSecond=finiteSize(sizes[second]);
    sizes[first]=startFirst;sizes[second]=startSecond;
    states[first]=states[first]==='rail'?'rail':'expanded';states[second]=states[second]==='rail'?'rail':'expanded';
    const delta=Number.isFinite(options.delta)?options.delta:0;
    if(!delta)return result;
    const growing=delta>0?first:second,shrinking=delta>0?second:first,travel=Math.abs(delta),total=startFirst+startSecond;
    const minimum=name=>expandedMinimum(axis,name),fixed=name=>compactSize(axis,name);
    if(!Number.isFinite(total)||[first,second].some(name=>states[name]==='expanded'&&sizes[name]+1e-7<minimum(name))){
      result.blocked=true;
      return result;
    }
    if(states[growing]==='rail'){
      result.pressure=Math.min(1,travel/thresholds.resistance);result.blocked=true;
      if(travel<thresholds.resistance)return result;
      result.expand=growing;
      const crossMinimum=options.crossMinimums?.[growing],crossSize=finiteSize(options.crossSize);
      if(Number.isFinite(crossMinimum)&&crossSize+1e-7<crossMinimum)return result;
      const available=total-(states[shrinking]==='rail'?sizes[shrinking]:minimum(shrinking));
      if(available+1e-7<minimum(growing))return result;
      const remembered=options.expanded?.[growing];
      sizes[growing]=Math.min(available,Math.max(minimum(growing),Number.isFinite(remembered)?remembered:minimum(growing)));
      sizes[shrinking]=total-sizes[growing];states[growing]='expanded';
      result.blocked=false;result.pressure=0;result.snapped=growing;
      return result;
    }
    if(states[shrinking]==='rail'){
      result.blocked=true;
      return result;
    }
    const requested=sizes[shrinking]-travel,min=minimum(shrinking),overflow=Math.max(0,min-requested);
    sizes[shrinking]=Math.max(min,requested);sizes[growing]=total-sizes[shrinking];
    result.pressure=Math.min(1,overflow/thresholds.resistance);result.blocked=overflow>0;
    if(overflow>=thresholds.resistance&&total-fixed(shrinking)+1e-7>=minimum(growing)){
      sizes[shrinking]=fixed(shrinking);sizes[growing]=total-fixed(shrinking);states[shrinking]='rail';
      result.blocked=false;result.pressure=0;result.snapped=shrinking;
    }
    return result;
  }

  /* The outer edge uses the identical resistance band as a shared divider. */
  function resizeThickness(options={}){
    options=options&&typeof options==='object'?options:{};
    const state=options.state==='rail'?'rail':'expanded',compact=finiteSize(options.compact),minimum=Math.max(compact,finiteSize(options.minimum));
    const maximum=Number.isFinite(options.maximum)?Math.max(0,options.maximum):Number.MAX_VALUE;
    const requested=Number.isFinite(options.requested)?options.requested:state==='rail'?compact:minimum;
    const result={size:Math.min(maximum,state==='rail'?compact:Math.max(minimum,requested)),state,pressure:0,blocked:false};
    // A physically constrained dock is already Compact before a gesture can
    // press its stop. Never report a sub-minimum rectangle as Expanded.
    if(maximum+1e-7<minimum){
      result.size=Math.min(maximum,compact);result.state='rail';result.blocked=true;
      if(state==='rail'&&requested>=compact+thresholds.resistance)result.expand=true;
      return result;
    }
    if(state==='rail'){
      const travel=Math.max(0,requested-compact);
      result.pressure=Math.min(1,travel/thresholds.resistance);result.blocked=travel>0||requested<compact;
      if(travel>=thresholds.resistance){
        result.expand=true;
        if(maximum+1e-7<minimum)return result;
        const restore=Number.isFinite(options.restore)?options.restore:minimum;
        result.size=Math.min(maximum,Math.max(minimum,restore));result.state='expanded';result.pressure=0;result.blocked=false;result.snapped=true;
      }
    }else{
      const overflow=Math.max(0,minimum-requested);
      result.pressure=Math.min(1,overflow/thresholds.resistance);result.blocked=overflow>0||requested>maximum;
      if(overflow>=thresholds.resistance){
        result.size=Math.min(maximum,compact);result.state='rail';result.pressure=0;result.blocked=false;result.snapped=true;
      }
    }
    return result;
  }

  const api={layout,allocate,resizePair,resizeThickness,compactSize,thresholds,expandedMinimum};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.SpatialCompactAreas=api;
})(typeof globalThis!=='undefined'?globalThis:this);
