/* Optional browser speech. Assistant replies still use the local demo rules. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SpatialAssistantVoice=api;})(globalThis,function(){
  'use strict';
  const modes=new Set(['manual','wake','continuous']);
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const words=value=>clean(value).toLowerCase().replace(/[^\p{L}\p{N} ]/gu,'').trim();
  function create(options={}){
    const env=options.environment||globalThis,Recognition=env.SpeechRecognition||env.webkitSpeechRecognition,synth=env.speechSynthesis,Utterance=env.SpeechSynthesisUtterance;
    const later=(fn,ms)=>(env.setTimeout||setTimeout)(fn,ms),cancel=id=>{if(id!==null)(env.clearTimeout||clearTimeout)(id);};
    const language=options.lang||env.navigator?.language||'en-US',silence=Math.max(300,Number(options.silenceMs)||900);
    const onState=options.onState||(()=>{}),onTranscript=options.onTranscript||(()=>{}),onSubmit=options.onSubmit||(()=>false);
    const currentContext=()=>String(options.getContext?.()||''),visible=()=>env.document?.hidden!==true;
    let context=currentContext(),epoch=0,recognitionSerial=0,speechSerial=0,recognizer=null,restartTimer=null,submitTimer=null,active=false,recognizing=false,speaking=false,readAloud=false,destroyed=false;
    let mode='manual',processing='browser',status='Microphone off',error='',transcript='',pending='',wakeArmed=false,emptyEnds=0,submitting=false,installing=false,wakePackAvailable=null;
    const readIds=new Set(),wakeSupported=Boolean(Recognition&&'processLocally' in (Recognition.prototype||{})&&typeof Recognition.available==='function');
    const wakeInstallSupported=Boolean(wakeSupported&&typeof Recognition.install==='function');
    const snapshot=()=>({mode,active,recognizing,speaking,readAloud,supported:typeof Recognition==='function',synthesisSupported:Boolean(synth&&Utterance),wakeSupported,wakeInstallSupported,wakePackAvailable,installing,processing,status,error,transcript,wakeArmed});
    const notify=()=>{onState(snapshot());};
    function fresh(token){if(destroyed||token!==epoch)return false;if(currentContext()!==context||!visible()){stop(!visible()?'Microphone paused while this page is hidden':'Context changed. Start the microphone again.');return false;}return true;}
    function clearTimers(){cancel(restartTimer);cancel(submitTimer);restartTimer=submitTimer=null;}
    function abortRecognition(){recognitionSerial++;const previous=recognizer;recognizer=null;recognizing=false;try{previous?.abort();}catch{} }
    function cancelSpeech(){speechSerial++;speaking=false;try{synth?.cancel();}catch{} }
    function stop(reason='Microphone off',{keepSpeech=false}={}){
      epoch++;active=false;submitting=false;wakeArmed=false;pending='';clearTimers();abortRecognition();if(!keepSpeech)cancelSpeech();status=keepSpeech&&speaking?'Reading aloud · microphone off':reason;error='';notify();return true;
    }
    function fail(message){stop(message);error=message;notify();return false;}
    function waiting(){return mode==='wake'&&!wakeArmed?'Waiting for “Hey Assistant”':mode==='manual'?'Listening · Review the draft before sending':'Listening · Speech sends after a pause';}
    function scheduleRestart(token){
      if(!fresh(token)||!active||speaking||submitting)return;
      cancel(restartTimer);restartTimer=later(()=>{restartTimer=null;if(fresh(token)&&active&&!speaking&&!submitting)beginRecognition(token);},250);
    }
    function emit(text,final){transcript=clean(text).slice(0,4000);onTranscript(transcript,{final,mode});notify();}
    function completeUtterance(token){
      submitTimer=null;if(!fresh(token)||!active||submitting||speaking)return;
      const text=clean(pending);if(!text)return;
      pending='';wakeArmed=false;submitting=true;abortRecognition();status='Sending voice message…';notify();
      let accepted=false;try{if(options.canSend?.()!==false)accepted=onSubmit(text);}catch{accepted=false;}
      Promise.resolve(accepted).then(value=>{
        if(!fresh(token)||!active)return;submitting=false;
        if(value===false){fail('Voice message was not sent. Review the transcript and start again.');return;}
        transcript='';onTranscript('',{final:true,mode});status=speaking?'Microphone paused while reading aloud':waiting();notify();if(!speaking)scheduleRestart(token);
      }).catch(()=>{if(fresh(token)&&active)fail('Voice message was not sent. Review the transcript and start again.');});
    }
    function queueSubmit(token){cancel(submitTimer);submitTimer=later(()=>completeUtterance(token),silence);}
    function command(text){const normalized=words(text);return normalized==='stop listening'||normalized==='mute microphone';}
    function beginRecognition(token){
      if(!fresh(token)||!active||speaking||submitting)return false;
      const serial=++recognitionSerial;let instance;
      try{instance=new Recognition();instance.lang=language;instance.continuous=mode!=='manual';instance.interimResults=true;instance.maxAlternatives=1;if(mode==='wake')instance.processLocally=true;}catch{return fail('Speech recognition could not start in this browser.');}
      recognizer=instance;const finalParts=new Map(),started=Date.now();let lastInterim='',received=false,noSpeech=false,manualBefore=mode==='manual'?transcript:'';
      const valid=()=>serial===recognitionSerial&&recognizer===instance&&fresh(token)&&active&&!speaking;
      instance.onstart=()=>{if(!valid())return;recognizing=true;status=waiting();error='';notify();};
      instance.onspeechstart=()=>{if(!valid())return;cancel(submitTimer);submitTimer=null;};
      instance.onresult=event=>{
        if(!valid())return;received=true;emptyEnds=0;let changed=false,stopRequested=false;lastInterim='';
        for(let index=0;index<(event.results?.length||0);index++){
          const result=event.results[index],text=clean(result?.[0]?.transcript);
          if(result?.isFinal){if(!finalParts.has(index)){finalParts.set(index,text);changed=true;if(command(text))stopRequested=true;}}
          else{lastInterim=clean(lastInterim+' '+text);if(command(text))stopRequested=true;}
        }
        const finalText=clean([...finalParts.values()].join(' '));
        if(stopRequested||command(clean(finalText+' '+lastInterim))){stop('Microphone off by voice command');return;}
        if(mode==='manual'){const text=clean(manualBefore+' '+finalText+' '+lastInterim);emit(text,!lastInterim);if(text.length>4000)fail('Voice transcript reached 4,000 characters. Review and send the draft.');return;}
        // Each recognition instance has cumulative indexed results. Rebuild its
        // contribution instead of appending repeated final events.
        let value=finalText,interim=lastInterim;
        if(mode==='wake'&&!wakeArmed){
          const match=/\bhey[\s,]+assistant\b[\s,.:!?-]*/i.exec(value||interim);
          if(!match){status=waiting();notify();return;}
          if(!value){status='Listening for your request…';notify();return;}
          wakeArmed=true;value=value.slice(match.index+match[0].length);status='Listening for your request…';
        }else if(mode==='wake'){
          // Keep the wake phrase out of a final result that contains the same
          // cumulative activation and command after an earlier partial result.
          value=value.replace(/^.*?\bhey[\s,]+assistant\b[\s,.:!?-]*/i,'');
        }
        pending=clean(value);const complete=clean(pending+' '+interim);emit(complete,!interim);
        if(complete.length>4000){fail('Voice transcript reached 4,000 characters. Review the text before sending.');return;}
        if(changed&&pending&&!interim)queueSubmit(token);
        if(interim){cancel(submitTimer);submitTimer=null;}
      };
      instance.onerror=event=>{
        if(!valid())return;const code=event.error||'unknown';
        if(code==='no-speech'){noSpeech=true;status=waiting();notify();return;}
        const messages={'not-allowed':'Microphone access was denied. Allow it in browser settings, then try again.','service-not-allowed':'The browser speech service is unavailable.','audio-capture':'No microphone is available.','network':'Speech recognition could not reach the browser service.','language-not-supported':mode==='wake'?'On-device speech recognition is unavailable for this language. Install its browser language pack first.':'This recognition language is unavailable.','aborted':'Speech recognition stopped.'};
        fail(messages[code]||'Speech recognition stopped. Start the microphone to try again.');
      };
      instance.onend=()=>{
        if(!valid())return;recognizer=null;recognizing=false;recognitionSerial++;
        if(mode==='manual'){active=false;status=transcript?'Dictation ready. Review and send.':'Microphone off';notify();return;}
        if(lastInterim){fail('Speech ended before a complete transcript. Review the text and start again.');return;}
        if(!received&&!noSpeech&&Date.now()-started<1500){if(++emptyEnds>=4){fail('Speech recognition ended repeatedly. Start the microphone to try again.');return;}}else emptyEnds=0;
        // Wait for a pending complete utterance before opening another browser
        // recognition session, so its cumulative result indexes cannot collide.
        if(pending){queueSubmit(token);notify();return;}
        status=waiting();notify();scheduleRestart(token);
      };
      try{instance.start();return true;}catch{return fail('Speech recognition could not start. Check microphone access and try again.');}
    }
    async function start(nextMode=mode){
      if(installing)return false;
      stop('Starting microphone…');mode=modes.has(nextMode)?nextMode:'manual';processing=mode==='wake'?'on-device':'browser';transcript='';error='';context=currentContext();const token=epoch;
      if(destroyed)return false;if(!Recognition)return fail('Speech recognition is not supported in this browser. You can still type.');
      if(!visible())return fail('Open this page before starting the microphone.');
      if(mode==='wake'){
        if(!wakeSupported)return fail('Wake phrase needs browser support for on-device speech recognition.');
        status='Checking on-device speech recognition…';notify();
        let availability;try{availability=await Recognition.available({langs:[language],processLocally:true});}catch{return fresh(token)?fail('On-device speech recognition is unavailable in this browser.'):false;}
        if(!fresh(token))return false;
        wakePackAvailable=availability==='available';
        if(!wakePackAvailable)return fail('Wake phrase needs an installed on-device language pack for '+language+'. '+(wakeInstallSupported?'Choose Install English pack, then start listening.':'Use Manual or Continuous; this browser cannot install the pack here.'));
      }
      if(!fresh(token))return false;active=true;emptyEnds=0;wakeArmed=false;status=waiting();notify();return beginRecognition(token);
    }
    async function installWakePack(){
      if(destroyed||installing)return false;
      if(!wakeInstallSupported)return fail('This browser cannot install an on-device speech pack here. Use Manual or Continuous.');
      if(!visible())return fail('Open this page before installing the speech pack.');
      stop('Preparing the on-device speech pack…');context=currentContext();const token=epoch;
      if(!fresh(token))return false;
      installing=true;status='Installing '+language+' speech pack… Microphone stays off.';notify();
      try{
        // Installation is called only from the explicit setup action. Neither
        // opening Assistant nor starting Wake ever downloads a language pack.
        const installed=await Recognition.install({langs:[language]});
        if(!fresh(token))return false;
        wakePackAvailable=installed===true;
        if(!wakePackAvailable)return fail('The speech pack could not be installed. Try Install English pack again, or use Manual or Continuous.');
        status='On-device '+language+' speech pack ready. Microphone off; start listening when ready.';error='';notify();return true;
      }catch{
        return fresh(token)?fail('The speech pack could not be installed. Try Install English pack again, or use Manual or Continuous.'):false;
      }finally{installing=false;notify();}
    }
    function setContext(next){next=String(next??currentContext());if(next!==context){const hadSession=Boolean(active||speaking||submitting||pending||transcript);stop(hadSession?'Context changed. Start the microphone again.':'Microphone off');context=next;transcript='';notify();}return context;}
    function setMode(next){next=modes.has(next)?next:'manual';if(next!==mode){stop('Microphone off',{keepSpeech:true});mode=next;processing=mode==='wake'?'on-device':'browser';notify();}return mode;}
    function stopSpeaking(){
      const wasSpeaking=speaking;cancelSpeech();if(wasSpeaking){status=active?waiting():'Reading stopped';notify();if(active&&fresh(epoch))scheduleRestart(epoch);}return wasSpeaking;
    }
    function setReadAloud(value){readAloud=Boolean(value);if(!readAloud)stopSpeaking();notify();return readAloud;}
    function speak(text,id){
      text=clean(text).slice(0,6000);if(!readAloud||!synth||!Utterance||!text||destroyed||!visible())return false;
      if(currentContext()!==context){setContext(currentContext());return false;}
      const key=context+'\n'+String(id||text);if(readIds.has(key))return false;
      readIds.add(key);if(readIds.size>100)readIds.delete(readIds.values().next().value);
      clearTimers();abortRecognition();cancelSpeech();const token=epoch,serial=++speechSerial,speechContext=context;let utterance;
      try{utterance=new Utterance(text);utterance.lang=language;}catch{status='Speech output could not start.';notify();if(active)scheduleRestart(token);return false;}
      speaking=true;status=active?'Microphone paused while reading aloud':'Reading aloud';notify();
      const finished=event=>{if(serial!==speechSerial||destroyed)return;if(currentContext()!==speechContext||!visible()){stop('Context changed. Start the microphone again.');return;}speaking=false;status=event?.error&&event.error!=='interrupted'?'Reading aloud is unavailable.':active?waiting():'Microphone off';notify();if(active)scheduleRestart(epoch);};
      utterance.onend=finished;utterance.onerror=finished;
      try{synth.speak(utterance);return true;}catch{finished({error:'unavailable'});return false;}
    }
    const pagehide=()=>stop('Microphone off while this page is closed'),visibility=()=>{if(!visible())stop('Microphone paused while this page is hidden');};
    env.addEventListener?.('pagehide',pagehide);env.document?.addEventListener?.('visibilitychange',visibility);
    function destroy(){stop();destroyed=true;env.removeEventListener?.('pagehide',pagehide);env.document?.removeEventListener?.('visibilitychange',visibility);}
    notify();return {start,stop,installWakePack,setContext,setMode,setReadAloud,speak,stopSpeaking,state:snapshot,destroy};
  }
  return {create};
});
