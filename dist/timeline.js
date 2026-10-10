/* Explicit desktop actions only. Each workspace owns its own bounded history. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.SpatialTimeline=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const types=new Set(['session','workspace','app.open','app.restore','app.park','app.close','project.open','project.close','project.switch','desktop.switch','file.open','file.folder','browser.visit']);
  const limit=300;
  const text=value=>typeof value==='string'?value.slice(0,1000):'';
  function normalize(event){
    if(!event||!types.has(event.type)||!text(event.workspace)||!text(event.id)||!Number.isFinite(event.time)||event.time<0)return null;
    return {id:text(event.id),workspace:text(event.workspace),type:event.type,time:event.time,
      title:text(event.title),app:text(event.app),base:text(event.base),project:text(event.project),projectName:text(event.projectName),
      page:Math.max(0,Math.min(999,Math.floor(Number(event.page)||0))),path:text(event.path),address:text(event.address)};
  }
  function create(snapshot={}){
    const sessions=Object.create(null);
    function merge(incoming){
      for(const [workspace,events] of Object.entries(incoming||{})){
        if(!Array.isArray(events))continue;
        const known=new Map((sessions[workspace]||[]).map(event=>[event.id,event]));
        events.forEach(raw=>{const event=normalize(raw);if(event&&event.workspace===workspace)known.set(event.id,event);});
        sessions[workspace]=[...known.values()].sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id)).slice(-limit);
      }
    }
    merge(snapshot);
    return {
      merge,
      add(raw){
        const event=normalize(raw);if(!event)return null;
        const events=sessions[event.workspace]||[];
        const last=events.at(-1);
        if(last&&event.time>=last.time&&event.time-last.time<3000&&['type','app','project','page','path','address','title'].every(key=>event[key]===last[key]))return null;
        merge({[event.workspace]:[event]});return {...event};
      },
      list(workspace,{type='all',query=''}={}){
        const needle=text(query).toLocaleLowerCase();
        return (sessions[workspace]||[]).filter(event=>(type==='all'||event.type.startsWith(type+'.'))&&(!needle||[event.title,event.projectName,event.path,event.address,event.type].join(' ').toLocaleLowerCase().includes(needle))).slice().reverse().map(event=>({...event}));
      },
      snapshot(){return JSON.parse(JSON.stringify(sessions));}
    };
  }
  const sections=['timeline','apps','projects','system'];
  function neighbour(id,direction,allowed=sections){const index=allowed.indexOf(id);return allowed.length?allowed[(Math.max(0,index)+direction+allowed.length)%allowed.length]:null;}
  return {create,normalize,limit,sections,neighbour};
});
