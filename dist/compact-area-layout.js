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

  const api={layout};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.SpatialCompactAreas=api;
})(typeof globalThis!=='undefined'?globalThis:this);
