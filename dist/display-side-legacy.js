/* Saved Side-space references stay reachable from the Files widget.
   Keep their original Workspace/display record; no copy or migration is needed. */
(function(root){
  'use strict';
  const hasContent=space=>Boolean((Array.isArray(space?.folders)&&space.folders.length)||
    (typeof space?.note==='string'&&space.note.trim())||
    (Array.isArray(space?.widgets)&&space.widgets.some(widget=>widget?.kind==='checklist'&&widget.id==='side-checklist'&&Array.isArray(widget.items)&&widget.items.length)));
  if(typeof module!=='undefined'&&module.exports){module.exports={hasContent};return;}
  const area=document.querySelector('[data-widget-source="files"]');
  if(!area)return;
  const disclosure=document.createElement('details');
  disclosure.className='display-side-legacy';disclosure.hidden=true;
  const summary=document.createElement('summary');summary.textContent='Saved side-space tools';
  const scope=document.createElement('p');scope.className='display-side-legacy-scope';
  const host=document.createElement('div');host.className='display-side-legacy-body';host.hidden=true;
  disclosure.append(summary,scope,host);area.append(disclosure);
  const bridge=()=>root.SpatialDisplayRoleBridge;
  const context=state=>[state?.setupKey,state?.workspaceId,state?.localSlot,state?.role].join('|');
  const expanded=new Map();let current='',controller=null;
  function refresh(){
    const state=bridge()?.state(),key=context(state),changed=key!==current;
    if(changed){
      if(current)expanded.set(current,disclosure.open);
      current=key;disclosure.open=expanded.get(key)===true;
    }
    disclosure.hidden=state?.role!=='side'||!hasContent(state?.space);
    scope.textContent=state?state.workspace+' · Display '+state.localSlot:'';
    host.hidden=disclosure.hidden||!disclosure.open||area.hidden||area.inert;
    if(!host.hidden&&!controller)controller=root.SpatialDisplaySideTools?.mount(host)||null;
    controller?.refresh(state);
  }
  disclosure.addEventListener('toggle',()=>{
    // A delayed toggle from an earlier Workspace must not reveal stale tools.
    if(context(bridge()?.state())!==current){refresh();return;}
    expanded.set(current,disclosure.open);refresh();
  });
  root.addEventListener('spatial-display-role-change',refresh);
  root.addEventListener('pageshow',refresh);
  // Compact and display placement use CSS, while the shelf's existing input
  // guards deliberately rely on hidden/inert ancestors. Keep both in step.
  if(typeof root.MutationObserver==='function')new root.MutationObserver(refresh).observe(area,{attributes:true,attributeFilter:['class','hidden','inert','data-widget-mode']});
  root.SpatialDisplaySideLegacy={refresh};refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
