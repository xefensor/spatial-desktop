/* Execute the shipped browser-presence adapters against a simulated clock.
   Delayed background-tab heartbeats must not remap the Assistant display. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Roles=require('../dist/display-roles.js');
const source=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const slice=(start,end)=>{
  const from=source.indexOf(start),to=source.indexOf(end,from);
  assert(from>=0&&to>from,'The production presence adapter must be available');
  return source.slice(from,to);
};
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
  let now=100000;
  const events={},messages=[],intervals=[],toasts=[],bodyClasses=new Set(),roles=Roles.create();
  const context={textContent:''},system={attributes:{},title:'',setAttribute(name,value){this.attributes[name]=value;}};
  const c={
    Date:{now:()=>now},desktopSyncSource:'helper',desktopSyncScope:'desktop',desktopSyncPeers:new Map(),
    desktopSyncLastStamp:0,desktopSyncReady:true,desktopSyncApplying:false,desktopSyncAnnounced:false,
    activeWorkspace:'work',workspaceProfiles:{work:{label:'Work'}},layoutMode:'manual',
    localDisplayDescriptor:()=>({openedAt:20,width:1440,height:900,screenWidth:2560,screenHeight:1440}),
    refreshIntentAreas(){},$:selector=>selector==='#systemAreaContext'?context:null,areaFor:()=>system,
    document:{body:{classList:{toggle(name,active){if(active)bodyClasses.add(name);else bodyClasses.delete(name);}}},addEventListener(type,handler){(events['document:'+type]||=[]).push(handler);}},
    window:{addEventListener(type,handler){(events['window:'+type]||=[]).push(handler);},setInterval(handler,delay){intervals.push({handler,delay});return intervals.length;}},
    desktopSyncChannel:null,postDesktopSyncMessage:message=>messages.push(message),
    showToast:message=>toasts.push(message),rebalanceAreaDisplays:()=>false,applyExtendedDesktopPartition(){},
    queueDesktopStateBroadcast(){},broadcastDesktopState(){},applyDesktopSyncState(){throw Error('Presence must not import desktop contents');}
  };
  vm.createContext(c);
  vm.runInContext(slice('const DESKTOP_SYNC_PRESENCE_GRACE_MS =','const workspaceDisplayAssignments ='),c);
  vm.runInContext(slice('function activeDisplayRoster() {','function displayAssignmentsFor('),c);
  vm.runInContext(slice('function updateDesktopSyncPresence() {','// Window identities and workspace-owned content sessions.'),c);
  const presence=()=>c.receiveDesktopSyncMessage({type:'presence',scope:'desktop',source:'main',display:{openedAt:10,width:1920,height:1080,screenWidth:2560,screenHeight:1440}});
  const setup=()=>roles.connect(c.activeDisplayRoster().map((display,index)=>({...display,slot:index+1})));
  return {c,roles,events,messages,intervals,toasts,bodyClasses,context,system,presence,setup,time:value=>{now=value;}};
}

{
  const f=fixture(),{c,roles}=f;
  f.presence();const initial=f.setup();assert.equal(roles.setRole(2,'side').ok,true);
  assert.equal(c.localDisplaySlot(),2);assert.equal(c.extendedDesktopActive(),true);
  const initialSources=clone(c.activeDisplayRoster().map(display=>display.source));
  for(const age of [10000,60000,90000]){
    f.time(100000+age);
    assert.deepEqual(clone(c.activeDisplayRoster().map(display=>display.source)),initialSources,'A '+age+' ms silent peer remains in the same ordered roster');
    assert.equal(c.localDisplaySlot(),2,'Timer throttling cannot turn the helper into Main');
    const beforePrune=f.setup();assert.equal(beforePrune.signature,initial.signature);assert.equal(roles.role(2),'side');
    c.updateDesktopSyncPresence();
    assert.equal(c.desktopSyncPeers.size,1,'Pruning uses the same inclusive grace boundary as the roster');
    assert.equal(f.setup().signature,initial.signature);assert.equal(roles.role(2),'side');
    assert(f.bodyClasses.has('is-session-synced'));
  }
  f.time(190001);
  assert.equal(c.activeDisplayRoster().length,1,'A silent peer expires immediately after 90 seconds');
  assert.equal(c.desktopSyncPeers.size,1,'The roster can exclude an expired peer before the next scheduled prune');
  c.updateDesktopSyncPresence();
  assert.equal(c.desktopSyncPeers.size,0,'Pruning removes the peer on that same boundary');
  assert.equal(c.localDisplaySlot(),1);assert.equal(c.extendedDesktopActive(),false);
  assert.notEqual(f.setup().signature,initial.signature,'An actually expired peer releases its monitor setup');
  assert.equal(f.bodyClasses.has('is-session-synced'),false);assert.equal(f.context.textContent,'Work workspace');
  assert.equal(f.system.title,'');assert.equal(f.system.attributes['aria-label'],'System controls');
}
{
  const f=fixture();f.presence();const initial=f.setup();
  f.time(160000);f.presence();f.time(220000);
  assert.equal(f.c.activeDisplayRoster().length,2,'A resumed heartbeat renews presence from its actual reception time');
  f.c.updateDesktopSyncPresence();assert.equal(f.setup().signature,initial.signature);
  f.c.receiveDesktopSyncMessage({type:'goodbye',scope:'desktop',source:'main'});
  assert.equal(f.c.desktopSyncPeers.size,0,'Explicit goodbye bypasses the grace period');
  assert.equal(f.c.localDisplaySlot(),1);assert.equal(f.bodyClasses.has('is-session-synced'),false);
}
{
  const f=fixture();f.c.prepareCrossDisplaySync();
  assert.deepEqual(clone(f.messages),[{type:'presence'},{type:'request'}]);
  assert.equal(f.intervals.length,1);assert.equal(f.intervals[0].delay,2000,'The existing heartbeat cadence stays at two seconds');
  f.intervals[0].handler();assert.deepEqual(clone(f.messages.at(-1)),{type:'presence'});
  f.events['window:pagehide'][0]();assert.deepEqual(clone(f.messages.at(-1)),{type:'goodbye'},'Closing the demo still announces its departure immediately');
}
console.log('Display presence passed: simulated 10/60/90 second timer delays preserve slots and Assistant setup, shared exact expiry boundary, renewed heartbeats, immediate goodbye and unchanged two-second cadence.');
