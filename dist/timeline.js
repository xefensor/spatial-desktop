/* Workspace-owned activity history and independent calendar, task and reminder records. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.SpatialTimeline=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const types=new Set(['session','workspace','app.open','app.restore','app.park','app.close','project.open','project.close','project.switch','desktop.switch','file.open','file.folder','browser.visit','stash.save','calendar.event','task.due','task.complete','task.reopen','reminder.due']);
  const limit=300;
  const text=value=>typeof value==='string'?value.slice(0,1000):'';
  function normalize(event){
    if(!event||!types.has(event.type)||!text(event.workspace)||!text(event.id)||!Number.isFinite(event.time)||event.time<0)return null;
    return {id:text(event.id),workspace:text(event.workspace),type:event.type,time:event.time,
      title:text(event.title),app:text(event.app),base:text(event.base),project:text(event.project),projectName:text(event.projectName),
      page:Math.max(0,Math.min(999,Math.floor(Number(event.page)||0))),path:text(event.path),address:text(event.address),stashId:text(event.stashId),example:event.example===true,
      planned:event.planned===true,done:event.done===true,doneTime:Number.isFinite(event.doneTime)&&event.doneTime>0?event.doneTime:0,detail:text(event.detail),endTime:Number.isFinite(event.endTime)&&event.endTime>event.time?event.endTime:0};
  }
  function matches(event,{type='all',query=''}={}){
    const needle=text(query).toLocaleLowerCase();
    return (type==='all'||type==='planned'&&event.planned||type==='activity'&&!event.planned||event.type.startsWith(type+'.'))&&(!needle||[event.title,event.projectName,event.path,event.address,event.detail,event.type].join(' ').toLocaleLowerCase().includes(needle));
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
        if(last&&event.time>=last.time&&event.time-last.time<3000&&['type','app','project','page','path','address','title','stashId'].every(key=>event[key]===last[key]))return null;
        merge({[event.workspace]:[event]});return {...event};
      },
      list(workspace,{type='all',query=''}={}){
        return (sessions[workspace]||[]).filter(event=>matches(event,{type,query})).slice().reverse().map(event=>({...event}));
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
  function createPlanner(snapshot={}){
    const items=new Map();
    function merge(incoming){
      for(const raw of Object.values(incoming||{})){
        const event=normalize(raw);
        if(!event||!event.planned||!['calendar.event','task.due','reminder.due'].includes(event.type))continue;
        const updated=Number.isFinite(raw.updated)?raw.updated:0,current=items.get(event.id);
        if(!current||updated>=current.updated)items.set(event.id,{...event,updated});
      }
    }
    merge(snapshot);
    return {
      merge,
      put(raw){const event=normalize({...raw,planned:true});if(!event)return null;merge({[event.id]:{...event,updated:raw.updated??Date.now()}});return items.get(event.id)||null;},
      get(id){const event=items.get(id);return event?{...event}:null;},
      complete(workspace,id,done,updated=Date.now()){const event=items.get(id);if(!event||event.workspace!==workspace||event.type==='calendar.event')return null;return this.put({...event,done:!!done,doneTime:done?updated:0,updated:Math.max(updated,event.updated+1)});},
      list(workspace,filter={}){return [...items.values()].filter(event=>event.workspace===workspace&&matches(event,filter)).sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id)).map(event=>({...event}));},
      snapshot(){return Object.fromEntries([...items].map(([id,event])=>[id,{...event}]));}
    };
  }
  function view(activity,planned,{now=Date.now(),...filter}={}){
    const rows=[...activity,...planned].filter(event=>matches(event,filter)).map(event=>event.planned&&event.done&&event.doneTime?{...event,dueTime:event.time,time:event.doneTime}:event);
    const next=event=>event.planned&&!event.done&&(event.time>=now||event.endTime>now);
    return {upcoming:rows.filter(next).sort((a,b)=>a.time-b.time),earlier:rows.filter(event=>!next(event)).sort((a,b)=>b.time-a.time)};
  }
  // A shared time map anchors both lanes precisely. Busy moments expand to
  // keep actions readable; calendar blocks span the same start/end positions.
  function dayKey(time){const d=new Date(time);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
  function lanes(activity,planned,{now=Date.now(),day=dayKey(now),includeNow=false,...filter}={}){
    const midnight=new Date(day+'T00:00:00').getTime(),next=new Date(day+'T00:00:00');next.setDate(next.getDate()+1);const finish=next.getTime(),quarter=15*60000;
    const rows=[...activity,...planned].filter(e=>matches(e,filter)).map(e=>e.planned&&e.done&&e.doneTime?{...e,dueTime:e.time,time:e.doneTime}:e);
    const days=[...new Set([day,...rows.flatMap(e=>[dayKey(e.time),...(e.endTime?[dayKey(e.endTime-1)]:[])])])].sort();
    const visible=rows.filter(e=>e.time<finish&&(e.endTime||e.time+1)>midnight).sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
    const groups=new Map();
    for(const e of visible.filter(e=>!e.planned)){if(!groups.has(e.time))groups.set(e.time,[]);groups.get(e.time).push(e);}
    const scale=4;
    const pointSpan=Math.max(quarter,90/scale*60000);
    const first=visible.length?Math.max(midnight,Math.min(...visible.map(e=>e.time))):midnight+9*3600000;
    const last=visible.length?Math.min(finish,Math.max(...visible.map(e=>e.endTime||e.time+(e.planned?pointSpan:quarter)))):midnight+17*3600000;
    const anchor=includeNow&&dayKey(now)===day;
    const start=midnight+Math.floor(((anchor?Math.min(first,now):first)-midnight)/3600000)*3600000;
    const end=Math.min(finish,Math.max(start+3600000,midnight+Math.ceil(((anchor?Math.max(last,now+quarter):last)-midnight)/3600000)*3600000));
    const tickTimes=Array.from({length:Math.round((end-start)/quarter)+1},(_,i)=>start+i*quarter);
    const knots=[...new Set([start,end,...tickTimes,...groups.keys(),...visible.filter(e=>e.planned).flatMap(e=>[Math.max(start,e.time),Math.min(end,e.endTime||e.time+pointSpan)])])].sort((a,b)=>a-b);
    const positions=[0];for(let i=1;i<knots.length;i++)positions.push(positions[i-1]+Math.max((knots[i]-knots[i-1])/60000*scale,(groups.get(knots[i-1])?.length||0)*58+(groups.has(knots[i-1])?8:0)));
    const y=time=>{if(time<=start)return(time-start)/60000*scale;if(time>=end)return positions.at(-1)+(time-end)/60000*scale;let i=1;while(knots[i]<time)i++;return positions[i-1]+(time-knots[i-1])/(knots[i]-knots[i-1])*(positions[i]-positions[i-1]);};
    const calendar=visible.filter(e=>e.planned).map(e=>({...e,start:Math.max(midnight,e.time),finish:Math.min(finish,e.endTime||e.time+(e.planned?pointSpan:quarter))}));
    // Pack overlapping plans into parallel columns without moving their times.
    let cluster=[],clusterEnd=0;const pack=()=>{const ends=[];for(const e of cluster){let col=ends.findIndex(end=>end<=e.start);if(col<0)col=ends.length;ends[col]=e.finish;e.column=col;}cluster.forEach(e=>e.columns=ends.length);};
    for(const e of calendar){if(cluster.length&&e.start>=clusterEnd){pack();cluster=[];clusterEnd=0;}cluster.push(e);clusterEnd=Math.max(clusterEnd,e.finish);}pack();
    return {day,days,start,end,scale,height:y(end),ticks:tickTimes.map(time=>({time,top:y(time)})),
      activity:[...groups].map(([time,events])=>({events,top:y(time)})),
      plans:calendar.map(e=>({...e,top:y(e.start),height:y(e.finish)-y(e.start)})),nowTop:y(now)};
  }
  function demoPlans({preset,profiles={},projects={},now=Date.now()}={}){
    if(preset!=='demo')return [];
    const events=[],at=(day,hour,minute=0)=>{const date=new Date(now);date.setDate(date.getDate()+day);date.setHours(hour,minute,0,0);return date.getTime();};
    function add(workspace,id,type,title,day,hour,minute=0,data={}){
      if(!profiles[workspace]||profiles[workspace].custom||data.project&&!projects[data.project])return;
      events.push({id:'demo-plan-v1:'+workspace+':'+id,workspace,type,title,time:at(day,hour,minute),planned:true,example:true,...data,projectName:projects[data.project]?.name||''});
    }
    for(const [workspace,profile] of Object.entries(profiles)){
      const meta=profile.agenda?.[2]||'',match=meta.match(/(\d{1,2}):(\d{2})/);
      if(!match)continue;
      const project=workspace==='work'&&projects.plasma?.name==='Website Launch'?'plasma':workspace==='school'&&projects.research?.name==='Urban Ecology'?'research':'';
      add(workspace,'agenda',/due/i.test(meta)?'task.due':'calendar.event',profile.agenda[1],/tomorrow/i.test(meta)?1:0,Number(match[1]),Number(match[2]),{project,detail:meta,...(!/due/i.test(meta)?{endTime:at(/tomorrow/i.test(meta)?1:0,Number(match[1]),Number(match[2]))+45*60000}:{})});
    }
    add('general','photo-backup','task.due','Back up holiday photographs',1,10,0,{detail:'Pictures → external backup drive'});
    add('general','tickets','reminder.due','Book the train tickets',1,9,0,{detail:'Check the dates before booking.'});
    if(projects.plasma?.name==='Website Launch')add('work','contact-form','task.due','Check the website contact form',1,12,0,{project:'plasma',detail:'Verify the confirmation message and keyboard navigation.'});
    if(projects.retold?.name==='Short Film'){
      add('work','film-review','calendar.event','Short Film feedback',1,16,0,{project:'retold',endTime:at(1,16,45),detail:'Review the rough cut and station transition.'});
      add('work','preview','reminder.due','Export a film preview for feedback',1,15,30,{project:'retold',detail:'Check the dialogue mix before exporting.'});
    }
    if(projects.research?.name==='Urban Ecology')add('school','seminar','calendar.event','Biology seminar',1,10,0,{project:'research',endTime:at(1,11),detail:'Bring the field observations and report outline.'});
    add('gaming','game-check','task.due','Agree on a co-op game',0,19,0,{detail:'Pick something everyone has installed.'});
    add('gaming','headset','reminder.due','Charge the headset',0,19,45);
    return events;
  }
  return {create,normalize,matches,limit,sections,neighbour,demoExamples,createPlanner,view,dayKey,lanes,demoPlans};
});
