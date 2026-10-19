const assert=require('node:assert/strict');
const System=require('../dist/desktop-system.js');

{
  const model=System.create(),initial=model.snapshot();
  assert.equal(initial.network.connected,'home');assert.equal(initial.bluetooth.connected.includes('phone'),true);
  assert.equal(initial.audio.outputMuted,false);assert.equal(initial.power.brightness,100);assert.equal(initial.session.mode,'active');
  const offline=System.create({}, {'Wi-Fi':false,Bluetooth:false,Sound:false}).snapshot();
  assert.equal(offline.network.enabled,false);assert.equal(offline.network.connected,null);assert.deepEqual(offline.bluetooth.connected,[]);assert.equal(offline.audio.outputMuted,true,'Legacy shared toggles initialize the same device model');
  initial.network.enabled=false;assert.equal(model.snapshot().network.enabled,true,'Snapshots cannot mutate device state');
  const revision=model.snapshot().revision;assert.equal(model.setToggle('Wi-Fi',true),false);assert.equal(model.snapshot().revision,revision,'An echoed unchanged toggle cannot create a linked-display broadcast loop');
}
{
  const model=System.create();
  const wrong=model.beginNetwork('studio','wrong password');assert.equal(wrong.ok,false);assert.match(wrong.error,/Incorrect password/);assert.equal(model.snapshot().network.connected,'home','An unsuccessful attempt keeps the previous live connection');
  assert.equal(JSON.stringify(model.snapshot()).includes('wrong password'),false,'Typed passwords are not persisted');
  const request=model.beginNetwork('studio','spatial-demo');assert.equal(request.ok,true);assert.equal(model.snapshot().network.connecting.id,'studio');
  assert.equal(model.finishNetwork(request.token+1),false,'A stale async completion cannot change the current connection');
  assert.equal(model.finishNetwork(request.token).ok,true);assert.equal(model.snapshot().network.connected,'studio');
  assert.equal(JSON.stringify(model.snapshot()).includes('spatial-demo'),false);
  model.disconnect();assert.equal(model.snapshot().network.connected,null);
  assert.equal(model.beginNetwork('studio').ok,true,'The saved network can reconnect without storing its password');
  model.setToggle('Wi-Fi',false);assert.equal(model.snapshot().network.connecting,null);assert.equal(model.finishNetwork(request.token),false);assert.equal(model.beginNetwork('guest').ok,false);
  model.setToggle('Wi-Fi',true);const garden=model.beginNetwork('weak');assert.equal(model.finishNetwork(garden.token).ok,false);assert.match(model.snapshot().network.error,/Retry/);
  const retry=model.beginNetwork('weak');assert.equal(model.finishNetwork(retry.token).ok,true);assert.equal(model.snapshot().network.connected,'weak','The deterministic failure has a useful successful retry');
  model.disconnect();const cancelled=model.beginNetwork('guest');model.disconnect();assert.equal(model.finishNetwork(cancelled.token),false,'Disconnect cancels an in-flight connection');
}
{
  const model=System.create();assert.equal(model.pair('keyboard').confirmation,true);assert.equal(model.snapshot().bluetooth.paired.includes('keyboard'),false);
  assert.equal(model.pair('keyboard',true).ok,true);assert.equal(model.snapshot().bluetooth.connected.includes('keyboard'),true);
  model.disconnectDevice('keyboard');assert.equal(model.snapshot().bluetooth.paired.includes('keyboard'),true);assert.equal(model.pair('keyboard').ok,true);
  model.disconnectDevice('keyboard',true);assert.equal(model.snapshot().bluetooth.paired.includes('keyboard'),false);assert.equal(model.pair('keyboard').confirmation,true);
  assert.equal(model.setAudio('output','headphones'),false,'A disconnected output cannot be selected');
  model.pair('headphones',true);assert.equal(model.setAudio('output','headphones'),true);assert.equal(model.setAudio('input','headset-mic'),true);
  model.setToggle('Bluetooth',false);assert.deepEqual(model.snapshot().bluetooth.connected,[]);assert.equal(model.snapshot().audio.output,'speakers');assert.equal(model.snapshot().audio.input,'desktop-mic','Losing the headset falls back to an available microphone');
  assert.equal(model.pair('headphones',true).ok,false);model.setToggle('Bluetooth',true);assert.equal(model.pair('headphones').ok,true);
  model.setAudio('volume',150);assert.equal(model.snapshot().audio.volume,100);model.setAudio('volume',-5);assert.equal(model.snapshot().audio.volume,0);
  model.setAudio('inputMuted',true);model.setToggle('Sound',false);assert.equal(model.snapshot().audio.inputMuted,true);assert.equal(model.snapshot().audio.outputMuted,true);
  model.setToggle('Sound',true);assert.equal(model.snapshot().audio.outputMuted,false);assert.equal(model.snapshot().audio.inputMuted,true,'Output sound does not silently unmute the microphone');
}
{
  const model=System.create();model.setPower('brightness',0);assert.equal(model.snapshot().power.brightness,10,'The demo remains readable at minimum brightness');
  model.setPower('profile','power-saver');assert.equal(model.snapshot().power.profile,'power-saver');assert.equal(model.setPower('profile','unsupported'),false);
  model.setPower('charging',false);assert.equal(model.snapshot().power.charging,false);
  assert.equal(model.session('sleep'),true);assert.equal(model.snapshot().session.mode,'sleeping');assert.equal(model.session('unlock'),false);
  model.session('wake');assert.equal(model.snapshot().session.mode,'locked');model.session('unlock');assert.equal(model.snapshot().session.mode,'active');
  model.session('lock');assert.equal(model.snapshot().session.mode,'locked');model.session('unlock');
  model.session('restart');assert.equal(model.snapshot().session.mode,'restarted');model.session('continue');assert.equal(model.snapshot().session.mode,'active');
  model.session('shutdown');assert.equal(model.snapshot().session.mode,'off');model.session('start');assert.equal(model.snapshot().session.mode,'active');
  assert.equal(model.session('unknown'),false);assert.equal(System.create(model.snapshot()).snapshot().power.profile,'power-saver','A session change does not reset hardware preferences');
}
{
  const model=System.create(),job=model.beginCopy('work','/Work/Downloads');assert(job);assert.equal(model.beginCopy('other','/Other'),null);
  assert.equal(model.usbAction('eject'),false,'Safe removal refuses an active transfer');assert.match(model.snapshot().usb.error,/copy is in progress/);
  assert.equal(model.progressCopy(job.token+1,50),false);assert.equal(model.progressCopy(job.token,68),true);assert.equal(model.snapshot().usb.job.progress,68);
  assert.equal(model.finishCopy(job.token+1,'/Wrong'),false);assert.equal(model.finishCopy(job.token,'/Work/Downloads/USB field notes.txt'),true);
  assert.equal(model.snapshot().usb.lastPath,'/Work/Downloads/USB field notes.txt');assert.equal(model.usbAction('eject'),true);assert.equal(model.beginCopy('work','/Work'),null);
  model.usbAction('attach');assert.equal(model.snapshot().usb.mounted,false);model.usbAction('mount');assert.equal(model.snapshot().usb.mounted,true);
  const retry=model.beginCopy('work','/Work/Downloads');model.finishCopy(retry.token,'','Destination unavailable');assert.equal(model.snapshot().usb.job,null);assert.equal(model.snapshot().usb.error,'Destination unavailable');assert.equal(model.snapshot().usb.mounted,true,'A failed copy leaves the source drive available');
}
{
  const model=System.create();model.beginNetwork('guest');model.beginCopy('work','/Work/Downloads');model.session('lock');
  const recovered=System.create(model.snapshot()).snapshot();assert.equal(recovered.network.connecting,null);assert.match(recovered.network.error,/interrupted/);assert.equal(recovered.usb.job,null);assert.match(recovered.usb.error,/interrupted/);assert.equal(recovered.session.mode,'locked','Reload preserves the visible session boundary without resuming lost task closures');
  const linked=System.create();linked.load(model.snapshot(),{recover:false});assert.equal(linked.snapshot().network.connecting.token,model.snapshot().network.connecting.token);assert.equal(linked.snapshot().usb.job.token,model.snapshot().usb.job.token,'Live display sync keeps the actual owning tab’s pending transfer rather than inventing an interruption');
  const oldToken=linked.snapshot().network.connecting.token;const next=model.beginNetwork('weak');linked.load(model.snapshot(),{recover:false});assert.equal(linked.finishNetwork(oldToken),false,'A superseded async operation cannot finish another display’s replacement request');assert.equal(linked.finishNetwork(next.token).ok,false);
  const malformed=System.create({network:{attempts:'bad'},audio:{output:'missing',input:'missing'},power:{brightness:-1}});assert.equal(malformed.snapshot().audio.output,'speakers');assert.equal(malformed.snapshot().power.brightness,10);const attempt=malformed.beginNetwork('weak');assert.equal(malformed.finishNetwork(attempt.token).ok,false);
}
console.log('Desktop system passed: shared legacy state, Wi-Fi auth/failure/retry/cancellation, pairing and audio fallback, mute separation, readable power controls, session lifecycle, safe USB removal, scoped transfers and interrupted-job recovery.');
