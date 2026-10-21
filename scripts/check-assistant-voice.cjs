const assert=require('node:assert/strict');
const V=require('../dist/assistant-voice.js');
function harness({local=false,availability='available',install,recognition=true,synthesis=true,canSend=()=>true,submit=()=>true}={}){
  const instances=[],timers=new Map(),listeners=new Map(),docListeners=new Map(),sent=[],transcripts=[],spoken=[];let clock=0,timerId=0,context='general/workspace/chat-1/main',packChecks=0,packInstalls=0,aborts=0,cancels=0;
  class Recognition{
    constructor(){instances.push(this);}
    start(){this.started=true;this.onstart?.();}
    abort(){aborts++;this.onend?.();}
    results(parts){this.onresult?.({resultIndex:0,results:parts.map(part=>Object.assign([{transcript:part[0]}],{isFinal:part[1]!==false}))});}
    end(){this.onend?.();}
    error(code){this.onerror?.({error:code});}
  }
  if(local){Recognition.prototype.processLocally=false;Recognition.available=async options=>{packChecks++;assert.equal(options.processLocally,true);return typeof availability==='function'?availability():availability;};}
  if(install!==undefined)Recognition.install=options=>{packInstalls++;assert.deepEqual(options,{langs:['en-US']});return typeof install==='function'?install():Promise.resolve(install);};
  const env={navigator:{language:'en-US'},document:{hidden:false,addEventListener:(type,fn)=>docListeners.set(type,fn),removeEventListener:type=>docListeners.delete(type)},addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{at:clock+ms,fn});return id;},clearTimeout:id=>timers.delete(id)};
  if(recognition)env.SpeechRecognition=Recognition;
  if(synthesis){env.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};env.speechSynthesis={speak:utterance=>{spoken.push(utterance);utterance.onstart?.();},cancel:()=>{cancels++;spoken.at(-1)?.onend?.();}};}
  const controller=V.create({environment:env,getContext:()=>context,canSend,onSubmit:text=>{sent.push(text);return submit(text);},onTranscript:(text,meta)=>transcripts.push({text,...meta}),silenceMs:900});
  async function tick(ms){const end=clock+ms;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at).find(([,item])=>item.at<=end);if(!next)break;clock=next[1].at;timers.delete(next[0]);next[1].fn();await Promise.resolve();await Promise.resolve();}clock=end;await Promise.resolve();await Promise.resolve();}
  return {controller,env,instances,sent,transcripts,spoken,timers,change:value=>{context=value;},get packChecks(){return packChecks;},get packInstalls(){return packInstalls;},get aborts(){return aborts;},get cancels(){return cancels;},hide:()=>{env.document.hidden=true;docListeners.get('visibilitychange')?.();},pagehide:()=>listeners.get('pagehide')?.(),tick};
}
(async()=>{
  {
    const h=harness();assert.equal(h.instances.length,0,'Opening Assistant never opens a microphone');assert.equal(h.controller.state().active,false);
    h.change('general/workspace/chat-1/main-display-ready');h.controller.setContext('general/workspace/chat-1/main-display-ready');assert.equal(h.controller.state().status,'Microphone off','Initializing the display context while idle does not claim a microphone session was interrupted');assert.equal(h.instances.length,0);
    await h.controller.start('manual');const first=h.instances.at(-1);assert(first.started);assert.equal(first.continuous,false);
    first.results([['Make a',false]]);first.results([['Make a checklist']]);first.results([['Make a checklist']]);await h.tick(2000);
    assert.deepEqual(h.sent,[],'Manual dictation cannot auto-send');assert.equal(h.transcripts.at(-1).text,'Make a checklist','Cumulative final events replace, not duplicate, dictation');
    first.end();assert.equal(h.controller.state().active,false);assert.match(h.controller.state().status,/Review and send/);
    const previous=h.transcripts.length;first.results([['late text']]);assert.equal(h.transcripts.length,previous,'An ended recognizer cannot change the draft');
  }
  {
    const h=harness();await h.controller.start('continuous');const first=h.instances.at(-1);
    first.results([['Make a checklist']]);await h.tick(600);assert.equal(h.sent.length,0,'Continuous waits for an utterance pause');
    first.onspeechstart();await h.tick(900);assert.equal(h.sent.length,0,'New speech cancels the pending send');
    first.results([['Make a checklist'],['for the launch']]);first.results([['Make a checklist'],['for the launch']]);await h.tick(900);
    assert.deepEqual(h.sent,['Make a checklist for the launch'],'Duplicate final events send exactly one complete utterance');await h.tick(250);
    const second=h.instances.at(-1);assert.notEqual(second,first);first.results([['late duplicate']]);await h.tick(1000);assert.equal(h.sent.length,1,'Old browser session callbacks cannot send after restart');
    second.results([['mute microphone']]);assert.equal(h.controller.state().active,false);await h.tick(2000);assert.equal(h.sent.length,1,'Mute command stops instead of reaching the scripted reply');
  }
  {
    const h=harness({local:true});assert.equal(h.controller.state().wakeSupported,true);await h.controller.start('wake');const first=h.instances.at(-1);
    assert.equal(h.packChecks,1);assert.equal(first.processLocally,true,'Wake never delegates ambient speech to a remote recognition service');
    first.results([['An unrelated conversation']]);await h.tick(2000);assert.deepEqual(h.sent,[]);assert.equal(h.transcripts.length,0,'Waiting for wake phrase does not expose ambient text as a message');
    first.results([['An unrelated conversation'],['Hey Assistant, make a checklist']]);await h.tick(900);assert.deepEqual(h.sent,['make a checklist']);assert.equal(h.controller.state().wakeArmed,false);await h.tick(250);
    const second=h.instances.at(-1);second.results([['Hey Assistant']]);second.end();await h.tick(250);const third=h.instances.at(-1);third.results([['Compare the sources']]);await h.tick(900);assert.deepEqual(h.sent,['make a checklist','Compare the sources'],'A phrase-only activation accepts the next utterance');
  }
  {
    const unsupported=harness();assert.equal(await unsupported.controller.start('wake'),false);assert.equal(unsupported.instances.length,0);assert.equal(unsupported.controller.state().active,false);
    const missing=harness({local:true,availability:'downloadable'});assert.equal(await missing.controller.start('wake'),false);assert.equal(missing.instances.length,0);assert.match(missing.controller.state().error,/installed on-device language pack/);
    const absent=harness({recognition:false,synthesis:false});assert.equal(await absent.controller.start(),false);absent.controller.setReadAloud(true);assert.equal(absent.controller.speak('A reply','one'),false);assert.match(absent.controller.state().error,/not supported/);
  }
  {
    let resolvePack;const h=harness({local:true,availability:()=>new Promise(resolve=>{resolvePack=resolve;})});const starting=h.controller.start('wake');await Promise.resolve();h.change('work/project/chat-2/side');h.controller.setContext('work/project/chat-2/side');resolvePack('available');assert.equal(await starting,false);assert.equal(h.instances.length,0,'A delayed local-pack check cannot start listening in a different context');
  }
  {
    let resolveInstall,installed=false;const h=harness({local:true,availability:()=>installed?'available':'downloadable',install:()=>new Promise(resolve=>{resolveInstall=value=>{installed=value;resolve(value);};})});
    assert.equal(h.controller.state().wakeInstallSupported,true);assert.equal(h.packInstalls,0,'Opening Assistant never downloads a pack');assert.equal(await h.controller.start('wake'),false);assert.equal(h.packInstalls,0,'Starting Wake checks availability without automatically downloading');assert.equal(h.controller.state().wakePackAvailable,false);
    const installing=h.controller.installWakePack();assert.equal(h.packInstalls,1,'Explicit setup calls install synchronously while the click still has user activation');assert.equal(h.controller.state().installing,true);assert.equal(await h.controller.installWakePack(),false,'Repeated setup cannot overlap installations');assert.equal(await h.controller.start('wake'),false,'Installation cannot implicitly power the microphone');assert.equal(h.instances.length,0);
    resolveInstall(true);assert.equal(await installing,true);assert.equal(h.controller.state().installing,false);assert.equal(h.controller.state().wakePackAvailable,true);assert.match(h.controller.state().status,/ready.*Microphone off/);assert.equal(h.instances.length,0,'Successful installation still requires a separate microphone action');
    assert.equal(await h.controller.start('wake'),true);assert.equal(h.instances.length,1);h.controller.stop();
  }
  {
    let resolveInstall;const h=harness({local:true,install:()=>new Promise(resolve=>{resolveInstall=resolve;})});const installing=h.controller.installWakePack();h.change('work/project/chat-2/side');h.controller.setContext('work/project/chat-2/side');const status=h.controller.state().status;resolveInstall(true);assert.equal(await installing,false);assert.equal(h.controller.state().status,status,'Stale installation completion cannot overwrite the new context status');assert.equal(h.controller.state().wakePackAvailable,null);assert.equal(h.controller.state().installing,false);assert.equal(h.instances.length,0);
    const hidden=harness({local:true,install:true});hidden.hide();assert.equal(await hidden.controller.installWakePack(),false);assert.equal(hidden.packInstalls,0,'Hidden pages cannot start a pack download');
    for(const install of [false,()=>Promise.reject(Error('Blocked download'))]){const failed=harness({local:true,install});assert.equal(await failed.controller.installWakePack(),false);assert.match(failed.controller.state().error,/could not be installed/);assert.equal(failed.controller.state().installing,false);assert.equal(failed.instances.length,0);}
    const unsupported=harness({local:true});assert.equal(unsupported.controller.state().wakeInstallSupported,false);assert.equal(await unsupported.controller.installWakePack(),false);assert.match(unsupported.controller.state().error,/cannot install/);
  }
  {
    const h=harness();await h.controller.start('continuous');const first=h.instances.at(-1);first.results([['Make a checklist']]);h.change('general/project/chat-2/main');await h.tick(1000);assert.deepEqual(h.sent,[]);assert.equal(h.controller.state().active,false,'Fresh context is checked again immediately before sending');
    await h.controller.start('continuous');const second=h.instances.at(-1);h.controller.setContext('different');assert.match(h.controller.state().status,/Context changed/,'An actual microphone session still explains its interruption');second.results([['Old speech']]);await h.tick(2000);assert.deepEqual(h.sent,[]);
  }
  {
    const h=harness({canSend:()=>false});await h.controller.start('continuous');h.instances.at(-1).results([['Make a checklist']]);await h.tick(1000);assert.deepEqual(h.sent,[]);assert.equal(h.controller.state().active,false);assert.match(h.controller.state().status,/not sent/);
  }
  {
    const h=harness();await h.controller.start('continuous');const rec=h.instances.at(-1);rec.results([['Make a checklist']]);rec.results([['Make a checklist'],['Stop listening']]);await h.tick(1000);assert.deepEqual(h.sent,[],'A separate stop command cancels an earlier pending utterance');assert.equal(h.controller.state().active,false);
  }
  {
    for(const submit of [async()=>false,async()=>{throw Error('Send rejected');}]){const h=harness({submit});await h.controller.start('continuous');h.instances.at(-1).results([['Make a checklist']]);await h.tick(1000);assert.equal(h.controller.state().active,false,'An async failed send disarms instead of accepting more speech');assert.match(h.controller.state().status,/not sent/);}
    const h=harness();await h.controller.start('continuous');const rec=h.instances.at(-1);rec.results([['Make a checklist'],['for another',false]]);rec.end();await h.tick(1000);assert.deepEqual(h.sent,[],'Unexpected end with unfinished speech cannot send only the earlier part');assert.equal(h.controller.state().active,false);assert.match(h.controller.state().status,/complete transcript/);
  }
  {
    const h=harness();await h.controller.start('continuous');h.instances.at(-1).results([['a'.repeat(4001)]]);await h.tick(1000);assert.deepEqual(h.sent,[],'A long spoken request cannot silently send a truncated command');assert.equal(h.controller.state().transcript.length,4000);assert.equal(h.controller.state().active,false);
  }
  {
    const h=harness();await h.controller.start('continuous');const first=h.instances.at(-1);first.results([['Make a checklist']]);h.hide();await h.tick(2000);assert.deepEqual(h.sent,[]);assert.equal(h.controller.state().active,false);
    h.env.document.hidden=false;await h.controller.start('continuous');h.instances.at(-1).end();h.pagehide();await h.tick(2000);assert.equal(h.controller.state().active,false);assert.equal(h.timers.size,0,'Page lifecycle shutdown clears every pending restart/send');
    await h.controller.start('continuous');const denied=h.instances.at(-1);denied.error('not-allowed');denied.end();await h.tick(2000);assert.match(h.controller.state().error,/denied/);assert.equal(h.controller.state().active,false);
  }
  {
    const h=harness();await h.controller.start('continuous');for(let i=0;i<6;i++){const rec=h.instances.at(-1);rec.error('no-speech');rec.end();await h.tick(250);}assert.equal(h.controller.state().active,true,'Ordinary silence does not disarm continuous conversation');h.controller.stop();await h.tick(2000);assert.equal(h.controller.state().active,false);
  }
  {
    const h=harness();h.controller.setReadAloud(true);assert.equal(h.instances.length,0,'Read aloud preference never powers the microphone');
    assert.equal(h.controller.speak('Checklist ready','reply-1'),true);assert.equal(h.controller.state().speaking,true);assert.equal(h.controller.speak('Checklist ready','reply-1'),false,'Rendering the same reply does not read it twice');h.controller.stopSpeaking();
    await h.controller.start('continuous');const rec=h.instances.at(-1);assert.equal(h.controller.speak('The launch checklist is ready','reply-2'),true);assert.equal(h.controller.state().active,true);assert.equal(h.controller.state().recognizing,false);assert.match(h.controller.state().status,/paused while reading/);
    rec.results([['The launch checklist is ready']]);await h.tick(1000);assert.deepEqual(h.sent,[],'Assistant speech cannot be recognized and sent back to itself');
    h.controller.stopSpeaking();await h.tick(250);assert.equal(h.controller.state().recognizing,true,'Stopping speech returns to the same armed conversation');
    h.controller.speak('Another reply','reply-3');const late=h.spoken.at(-1);h.change('work/workspace/chat-5/main');h.controller.setContext('work/workspace/chat-5/main');late.onend();await h.tick(2000);assert.equal(h.controller.state().active,false);assert.equal(h.controller.state().speaking,false,'Late synthesis completion cannot revive a microphone after a context switch');
    assert.equal(h.controller.state().readAloud,true,'Stopping a microphone preserves the independent read-aloud preference');
    h.controller.destroy();assert.equal(await h.controller.start('continuous'),false);
  }
  {
    const h=harness();await h.controller.start('continuous');h.controller.setReadAloud(true);h.controller.speak('Continue reading this reply','reply');const utterance=h.spoken.at(-1),before=h.cancels;h.controller.stop('Microphone off',{keepSpeech:true});assert.equal(h.controller.state().speaking,true,'Explicit microphone Mute can preserve independent speech output');assert.equal(h.cancels,before);utterance.onend();await h.tick(1000);assert.equal(h.controller.state().speaking,false);assert.equal(h.controller.state().active,false,'Finishing preserved speech does not rearm a muted microphone');
  }
  console.log('Assistant voice passed: real capability gates, manual/wake/continuous input, local-only wake, silence boundaries, duplicate prevention, scope and lifecycle isolation, permission failures, muted shutdown and feedback-safe independent speech output.');
})().catch(error=>{console.error(error);process.exitCode=1;});
