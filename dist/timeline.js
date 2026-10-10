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
      page:Math.max(0,Math.min(999,Math.floor(Number(event.page)||0))),path:text(event.path),address:text(event.address),example:event.example===true};
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
  function demoExamples({preset,profiles={},projects={},now=Date.now()}={}){
    if(preset!=='demo')return [];
    const events=[];
    function add(workspace,minutes,type,title,data={}){
      if(!profiles[workspace]||profiles[workspace].custom)return;
      const project=data.project||'',space=projects[project];
      if(project&&!space)return;
      events.push({id:'demo-timeline-v1:'+workspace+':'+events.length,workspace,time:now-minutes*60000,type,title,example:true,...data,projectName:space?.name||''});
    }
    const home=profiles.general?.home;
    add('general',1455,'file.folder','Pictures',{base:'dolphin',app:'dolphin',path:home+'/Pictures'});
    add('general',52,'app.open','Dolphin · Home',{base:'dolphin',app:'dolphin'});
    add('general',46,'file.folder','Downloads',{base:'dolphin',app:'dolphin',path:home+'/Downloads'});
    add('general',37,'browser.visit','Train journey research',{base:'browser',address:'https://en.wikipedia.org/wiki/Rail_transport'});
    add('general',28,'desktop.switch','Desktop 2',{page:1});
    add('general',26,'app.open','Personal notes',{base:'notes',app:'notes',page:1});
    add('general',14,'app.park','Firefox',{base:'browser'});
    const study=projects.research;
    if(study?.name==='Urban Ecology'){
      add('school',65,'project.open',study.name,{project:'research'});
      add('school',58,'app.open','Field guide',{project:'research',app:'browser--demo-study-reading',base:'browser'});
      add('school',45,'desktop.switch','Desktop 2',{project:'research',page:1});
      add('school',42,'file.open','field-observations.csv',{project:'research',page:1,app:'dolphin--demo-study-evidence',base:'dolphin',path:study.root+'/field-observations.csv'});
      add('school',24,'app.open','Observations',{project:'research',app:'notes--demo-study-observations',base:'notes'});
      add('school',11,'file.folder','Photos',{project:'research',page:1,app:'dolphin--demo-study-evidence',base:'dolphin',path:study.root+'/Photos'});
    }
    const site=projects.plasma,film=projects.retold;
    if(site?.name==='Website Launch'){
      add('work',1480,'file.open','launch-checklist.md',{project:'plasma',page:1,app:'dolphin--demo-site-files',base:'dolphin',path:site.root+'/launch-checklist.md'});
      add('work',80,'project.open',site.name,{project:'plasma'});
      add('work',73,'app.open','Development server',{project:'plasma',app:'terminal--demo-site-server',base:'terminal'});
      add('work',62,'browser.visit','Northstar Studio · website preview',{project:'plasma',app:'browser--demo-site-preview',base:'browser',address:'http://localhost:5173/'});
      add('work',51,'desktop.switch','Desktop 2',{project:'plasma',page:1});
      add('work',48,'file.open','index.html',{project:'plasma',page:1,app:'dolphin--demo-site-files',base:'dolphin',path:site.root+'/index.html'});
      add('work',39,'app.open','Launch checklist',{project:'plasma',page:1,app:'notes--demo-site-checklist',base:'notes'});
    }
    if(film?.name==='Short Film'){
      add('work',29,'project.switch',film.name,{project:'retold'});
      add('work',24,'file.folder','Footage',{project:'retold',app:'dolphin--demo-film-footage',base:'dolphin',path:film.root+'/Footage'});
      add('work',17,'app.open','Edit notes',{project:'retold',app:'notes--demo-film-cut',base:'notes'});
      add('work',8,'app.park','Soundtrack · Station ambience',{project:'retold',page:1,app:'elisa--demo-film-soundtrack',base:'elisa'});
    }
    add('gaming',49,'app.open','Game library',{app:'browser',base:'browser'});
    add('gaming',36,'app.restore','Game-night mix',{app:'elisa',base:'elisa'});
    add('gaming',29,'desktop.switch','Desktop 2',{page:1});
    add('gaming',27,'app.open','Co-op planning',{app:'notes',base:'notes',page:1});
    add('gaming',15,'app.park','Game-night mix',{app:'elisa',base:'elisa'});
    return events;
  }
  return {create,normalize,limit,sections,neighbour,demoExamples};
});
