/* Small desktop utilities. Captures use the browser's explicit sharing chooser. */
(function(root){
  'use strict';
  const definitions={
    calculator:{label:'Calculator',icon:'i-calculator',tone:'silver',primary:'#a9c6df',detail:'Calculations',singleInstance:true,parkingWidget:false,audio:false},
    screenshot:{label:'Screenshot Tool',icon:'i-image',tone:'blue',primary:'#62b1ff',detail:'Capture and annotate',singleInstance:true,parkingWidget:false,audio:false},
    software:{label:'Software Center',icon:'i-grid',tone:'cyan',primary:'#65cedd',detail:'Apps in this demo',singleInstance:true,parkingWidget:false,audio:false},
    monitor:{label:'System Monitor',icon:'i-monitor',tone:'green',primary:'#79d69c',detail:'Demo windows and activity',singleInstance:true,parkingWidget:false,audio:false},
    'app-preview':{launcherHidden:true,label:'App Preview',icon:'i-grid',tone:'violet',primary:'#ae9cf1',detail:'Availability',singleInstance:true,parkingWidget:false,audio:false}
  };
  function calculate(input){
    const source=String(input).replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').trim();
    if(!source||source.length>240)throw Error('Enter a calculation.');
    let index=0,depth=0;
    const space=()=>{while(/\s/.test(source[index]||'')&&index<source.length)index++;};
    function atom(){
      space();if(++depth>32)throw Error('Too many parentheses.');let value;
      if(source[index]==='+'||source[index]==='-'){const sign=source[index++];value=(sign==='-'?-1:1)*atom();}
      else if(source[index]==='('){index++;value=sum();space();if(source[index++]!==')')throw Error('Close the parentheses.');}
      else{const match=source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);if(!match)throw Error('Use numbers and + − × ÷ ( ) %.');index+=match[0].length;value=Number(match[0]);}
      space();while(source[index]==='%'){value/=100;index++;space();}depth--;return value;
    }
    function product(){let value=atom();space();while(source[index]==='*'||source[index]==='/'){const op=source[index++],next=atom();if(op==='/'&&next===0)throw Error('Cannot divide by zero.');value=op==='*'?value*next:value/next;space();}return value;}
    function sum(){let value=product();space();while(source[index]==='+'||source[index]==='-'){const op=source[index++],next=product();value=op==='+'?value+next:value-next;space();}return value;}
    const value=sum();space();if(index!==source.length)throw Error('Check the calculation.');if(!Number.isFinite(value))throw Error('The result is too large.');return Number(value.toPrecision(13));
  }
  function cropBounds(start,end,width,height){
    const x=Math.max(0,Math.min(width,Math.min(start.x,end.x))),y=Math.max(0,Math.min(height,Math.min(start.y,end.y)));
    return {x:Math.round(x),y:Math.round(y),width:Math.round(Math.max(0,Math.min(width,Math.max(start.x,end.x))-x)),height:Math.round(Math.max(0,Math.min(height,Math.max(start.y,end.y))-y))};
  }
  const aliases={Calculator:'calculator',Spectacle:'screenshot','Screenshot Tool':'screenshot',Discover:'software','Software Center':'software','System Monitor':'monitor',Lutris:'steam'};
  const api={definitions,calculate,cropBounds,appFor:name=>aliases[name]||null};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  root.SpatialDesktopApps=api;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const glyph=id=>'<svg aria-hidden="true"><use href="#'+id+'"/></svg>';
  for(const [id,info] of Object.entries(definitions)){
    const frame=document.createElement('article');frame.className='app-frame simple-app desktop-utility';frame.dataset.appFrame=id;frame.hidden=true;frame.setAttribute('aria-label',info.label);
    frame.innerHTML='<header class="app-titlebar"><div class="app-identity"><span class="app-badge '+info.tone+'">'+glyph(info.icon)+'</span><div><b>'+info.label+'</b><small>'+info.detail+'</small></div></div><div class="window-actions"><button class="surface-key window-key" data-window-action="minimize" aria-label="Park '+info.label+'">'+glyph('i-min')+'</button><button class="surface-key window-key" data-window-action="maximize" aria-label="Maximize '+info.label+'">'+glyph('i-max')+'</button><button class="surface-key window-key danger" data-window-action="close" aria-label="Close '+info.label+'">'+glyph('i-close')+'</button></div></header><div class="desktop-utility-content" data-desktop-utility="'+id+'"></div>';
    document.querySelector('.workspace-zone').append(frame);
  }
  let started=false,captureBusy=false,monitorTimer=0;
  const captures=new Map();
  function host(id){return document.querySelector('[data-desktop-utility="'+id+'"]');}
  function currentCapture(){return captures.get(activeWorkspace);}
  function notify(id,message){const node=host(id)?.querySelector('[data-utility-status]');if(node)node.textContent=message;}
  function frameLocal(id){const frame=frameFor(id);return frame&&!frame.hidden&&appState[id]==='open'&&isLocalApp(id);}
  function nativeOpen(id){setUniversalSearchOpen(false);if(definitions[id])openApp(id);else launchAppHere(id);render(id);return id;}
  function calcModel(){const model=appWindowModel('calculator');if(!Array.isArray(model.calculations))model.calculations=[];return model;}
  function renderCalculator(){
    const node=host('calculator'),model=calcModel();
    node.innerHTML='<form class="desktop-calculator" data-calculator-form><label for="desktopCalculation">Calculation</label><div class="utility-input-row"><input id="desktopCalculation" data-calculator-input inputmode="decimal" maxlength="240" autocomplete="off" placeholder="(12 + 8) × 1.21" value="'+esc(model.expression||'')+'"><button type="submit">=</button></div><output data-calculator-result aria-live="polite">'+esc(model.result??'0')+'</output><div class="calculator-keys">'+['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','%','+','(',')','⌫','Clear'].map(key=>'<button type="button" data-calculator-key="'+esc(key)+'">'+key+'</button>').join('')+'</div><p class="utility-status" data-utility-status role="status"></p><details'+(model.calculations.length?' open':'')+'><summary>History</summary><ol class="calculator-history">'+model.calculations.slice().reverse().map((row,index)=>'<li><button type="button" data-calculator-history="'+index+'"><span>'+esc(row.expression)+'</span><b>'+esc(row.result)+'</b></button></li>').join('')+'</ol></details><small>Percent means ÷ 100. Calculations stay in this Workspace.</small></form>';
  }
  function runCalculation(){
    const model=calcModel(),input=host('calculator').querySelector('[data-calculator-input]');model.expression=input.value;
    try{model.result=calculate(model.expression);model.calculations.push({expression:model.expression,result:model.result});model.calculations=model.calculations.slice(-20);saveAppWindows();renderCalculator();host('calculator').querySelector('input').focus();}catch(error){notify('calculator',error.message);}
  }
  function captureMarkup(){
    const state=currentCapture(),directories=root.SpatialDesktopFiles?.directories({workspace:activeWorkspace})||[],preferred=projectSpaces[desktopPages.column(activeWorkspace)]?.root||workspaceProfiles[activeWorkspace].home+'/Pictures';
    const choices=[...new Set([preferred,...directories])];
    return '<div class="screenshot-controls"><div class="utility-button-row"><button type="button" data-screenshot="capture">Choose a tab to capture…</button><label class="utility-file-button">Open image…<input type="file" accept="image/png,image/jpeg,image/webp" data-screenshot-import></label></div><p>The browser asks what to share. Choose this demo tab; sharing stops after one image. You can also open an image to annotate.</p></div>'
      +'<div class="screenshot-editor"'+(!state?' hidden':'')+'><div class="utility-button-row screenshot-tools" role="toolbar" aria-label="Image tools">'+[['pen','Draw'],['box','Rectangle'],['crop','Crop']].map(([tool,label])=>'<button type="button" data-screenshot-tool="'+tool+'" aria-pressed="'+String((state?.tool||'pen')===tool)+'">'+label+'</button>').join('')+'<button type="button" data-screenshot="undo"'+(!state?.undo.length?' disabled':'')+'>Undo</button><label>Color <input type="color" data-screenshot-color value="'+esc(state?.color||'#ff5468')+'"></label></div><p class="screenshot-crop-help">Drag on the image to draw, add a rectangle, or crop. Undo restores the previous image.</p><div class="screenshot-canvas-wrap"><canvas data-screenshot-canvas aria-label="Screenshot preview and annotation canvas"></canvas></div><div class="screenshot-save"><label>File name<input data-screenshot-name maxlength="100" value="'+esc(state?.name||'Screenshot.png')+'"></label><label>Save in<select data-screenshot-directory>'+choices.map(path=>'<option'+(path===(state?.directory||preferred)?' selected':'')+'>'+esc(path)+'</option>').join('')+'</select></label><div class="utility-button-row"><button type="button" data-screenshot="save">Save to demo Files</button><button type="button" data-screenshot="download">Download PNG</button><button type="button" data-screenshot="copy"'+(!root.ClipboardItem||!navigator.clipboard?.write?' disabled title="This browser does not support copying images"':'')+'>Copy image</button><button type="button" data-screenshot="attach">Attach to Assistant</button></div><p data-screenshot-saved role="status" aria-live="polite">'+esc(state?.file?'Saved · '+state.file.path:'Unsaved image · save or download to keep it after reload.')+'</p></div></div><p class="utility-status" data-utility-status role="status"></p>';
  }
  function renderScreenshot(){
    if(captureBusy)return;
    const node=host('screenshot'),state=currentCapture();node.innerHTML=captureMarkup();if(!state)return;
    const canvas=node.querySelector('canvas');canvas.width=state.image.width;canvas.height=state.image.height;canvas.getContext('2d').drawImage(state.image,0,0);bindCanvas(canvas,state);
  }
  function imageFrom(source){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('This image could not be opened.'));image.src=source;});}
  function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('The image could not be encoded.')),'image/png'));}
  async function setImage(blob,workspace=activeWorkspace,name=null){
    const url=URL.createObjectURL(blob);let image;try{image=await imageFrom(url);}finally{URL.revokeObjectURL(url);}
    const factor=Math.min(1,2400/image.width,1800/image.height),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*factor);canvas.height=Math.round(image.height*factor);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const normalized=await imageFrom(canvas.toDataURL('image/png'));
    captures.set(workspace,{image:normalized,tool:'pen',color:'#ff5468',undo:[],file:null,name:name||'Screenshot-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.png'});
    if(workspace===activeWorkspace)renderScreenshot();
  }
  async function takeCapture(){
    if(captureBusy)return;
    if(!navigator.mediaDevices?.getDisplayMedia){notify('screenshot','Tab capture is unavailable in this browser. Use Open image to annotate a screenshot from your computer.');return;}
    const workspace=activeWorkspace,frame=frameFor('screenshot');let stream,video,message='';captureBusy=true;
    notify('screenshot','Choose this demo tab in the browser sharing dialog.');
    try{
      stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false,preferCurrentTab:true});
      // Visibility does not retile the desktop. The utility itself stays out of its image.
      frame.style.visibility='hidden';await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=stream;await video.play();
      if(!video.videoWidth)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No capture frame was received.')),8000);video.onloadeddata=()=>{clearTimeout(timer);resolve();};});
      if(video.requestVideoFrameCallback)await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve();};video.requestVideoFrameCallback(finish);setTimeout(finish,500);});
      const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;if(!canvas.width||!canvas.height)throw Error('No capture frame was received.');canvas.getContext('2d').drawImage(video,0,0);
      // Stop sharing before any encoding, editing, saving, or Assistant operation.
      stream.getTracks().forEach(track=>track.stop());await setImage(await canvasBlob(canvas),workspace);message='Captured one image. Sharing has stopped.';
    }catch(error){message=error.name==='NotAllowedError'||error.name==='AbortError'?'Capture cancelled. No image was saved.':error.message||'Capture failed. Try again or open an image.';}
    finally{stream?.getTracks().forEach(track=>track.stop());if(video)video.srcObject=null;frame.style.visibility='';captureBusy=false;if(workspace===activeWorkspace){renderScreenshot();notify('screenshot',message);}}
  }
  function bindCanvas(canvas,state){
    let origin=null,previous=null,snapshot=null;
    const point=event=>{const rect=canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};};
    const context=canvas.getContext('2d');
    canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);origin=previous=point(event);snapshot=context.getImageData(0,0,canvas.width,canvas.height);});
    canvas.addEventListener('pointermove',event=>{
      if(!origin)return;event.preventDefault();const at=point(event);context.strokeStyle=state.color;context.lineWidth=Math.max(2,canvas.width/450);context.lineCap='round';
      if(state.tool==='pen'){context.beginPath();context.moveTo(previous.x,previous.y);context.lineTo(at.x,at.y);context.stroke();previous=at;}
      else{context.putImageData(snapshot,0,0);const bounds=cropBounds(origin,at,canvas.width,canvas.height);context.setLineDash(state.tool==='crop'?[8,5]:[]);context.strokeRect(bounds.x,bounds.y,bounds.width,bounds.height);context.setLineDash([]);}
    });
    const finish=async(event,cancel=false)=>{
      if(!origin)return;const start=origin;origin=null;if(cancel){context.putImageData(snapshot,0,0);return;}
      const previousCanvas=document.createElement('canvas');previousCanvas.width=canvas.width;previousCanvas.height=canvas.height;previousCanvas.getContext('2d').putImageData(snapshot,0,0);
      if(state.tool==='crop'){
        context.putImageData(snapshot,0,0);const bounds=cropBounds(start,point(event),canvas.width,canvas.height);if(bounds.width<8||bounds.height<8){notify('screenshot','Select a larger region to crop.');return;}
        const cropped=document.createElement('canvas');cropped.width=bounds.width;cropped.height=bounds.height;cropped.getContext('2d').drawImage(canvas,bounds.x,bounds.y,bounds.width,bounds.height,0,0,bounds.width,bounds.height);canvas.width=cropped.width;canvas.height=cropped.height;canvas.getContext('2d').drawImage(cropped,0,0);
      }
      state.undo.push(previousCanvas.toDataURL('image/png'));state.undo=state.undo.slice(-8);state.image=await imageFrom(canvas.toDataURL('image/png'));state.file=null;renderScreenshot();
    };
    canvas.addEventListener('pointerup',event=>{finish(event).catch(error=>notify('screenshot',error.message));});canvas.addEventListener('pointercancel',event=>{finish(event,true);});
  }
  function screenshotValues(){const state=currentCapture();if(!state)throw Error('Capture or open an image first.');const node=host('screenshot');state.name=(node.querySelector('[data-screenshot-name]').value||'Screenshot.png').trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').replace(/\.png$/i,'')+'.png';state.directory=node.querySelector('[data-screenshot-directory]').value;return state;}
  async function saveScreenshot(){
    const state=screenshotValues(),workspace=activeWorkspace;if(!root.SpatialDesktopFiles?.saveBlob)throw Error('Files are not ready. Download the PNG to keep this image.');
    const file=await root.SpatialDesktopFiles.saveBlob(state.directory.replace(/\/$/,'')+'/'+state.name,await canvasBlob(host('screenshot').querySelector('canvas')),{workspace,collision:'keep-both',kind:'image'});state.file=file;
    if(workspace===activeWorkspace)renderScreenshot();return file;
  }
  async function screenshotAction(action){
    if(action==='capture')return takeCapture();
    const state=currentCapture();if(!state)return;
    if(action==='undo'){const previous=state.undo.pop();if(previous){state.image=await imageFrom(previous);state.file=null;renderScreenshot();}return;}
    if(action==='save')return saveScreenshot();
    if(action==='attach'){
      const workspace=activeWorkspace,existing=state.file&&root.SpatialDesktopFiles?.read(state.file.path,{workspace});const file=existing||await saveScreenshot();if(workspace!==activeWorkspace)throw Error('Return to the capture’s Workspace to attach it.');
      const context=root.SpatialAssistantDesktop?.fileContext(file.path)||{id:file.itemId,title:file.name,filename:file.name,kind:'image',attachment:file.attachment,address:file.path,workspace:file.workspace,project:file.project,source:{label:'Screenshot Tool',address:file.path,workspace:file.workspace}};
      const result=root.SpatialAIDesktop?.attach([context]);if(!result?.length)throw Error('Assistant could not accept this image. Remove unused inputs and try again.');notify('screenshot','Saved image attached to Assistant.');return;
    }
    const canvas=host('screenshot').querySelector('canvas');
    if(action==='copy'){if(!root.ClipboardItem||!navigator.clipboard?.write)throw Error('This browser does not support copying images.');await navigator.clipboard.write([new ClipboardItem({'image/png':canvasBlob(canvas)})]);notify('screenshot','Image copied to the system clipboard.');return;}
    if(action==='download'){const blob=await canvasBlob(canvas),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=screenshotValues().name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('screenshot','PNG handed to the browser for download.');}
  }
  const included=[['dolphin','File Browser','Browse, open, organise, and recover demo files.'],['notes','Note Editor','Write documents and save them to a folder.'],['browser','Firefox','Browse the included local pages.'],['terminal','Terminal','Try the local demo shell commands.'],['elisa','Music Player','Play the included media library.'],['steam','Game Launcher','Browse games and try the download simulation.'],['calculator','Calculator','Calculate with parentheses and history.'],['screenshot','Screenshot Tool','Capture a tab, annotate, and save an image.'],['monitor','System Monitor','Inspect demo windows and background activity.']];
  function previewNames(){return [...new Set([...document.querySelectorAll('[data-launch-app]')].map(button=>button.dataset.launchApp))].filter(name=>!aliases[name]&&!['Settings','Spatial Guide','Help Center'].includes(name));}
  function renderSoftware(){
    host('software').innerHTML='<header class="utility-intro"><h2>Apps in this demo</h2><p>These apps are included and ready to open. Software Center describes this browser demo; it does not install software on your computer.</p></header><div class="desktop-app-catalog">'+included.map(([id,label,detail])=>'<article><span class="app-badge '+appInfo[id].tone+'">'+glyph(appInfo[id].icon)+'</span><div><h3>'+label+'</h3><p>'+detail+'</p><small>Included</small></div><button type="button" data-utility-open="'+id+'">Open</button></article>').join('')+'</div><details class="utility-previews"><summary>Other app previews</summary><p>The launcher also illustrates these app categories. Their full applications are outside this browser demo.</p><div class="utility-button-row">'+previewNames().map(name=>'<button type="button" data-utility-preview="'+esc(name)+'">'+esc(SpatialAppNames.label(name))+'</button>').join('')+'</div></details>';
  }
  function renderMonitor(){
    const node=host('monitor'),windows=Object.entries(appState).filter(([id,status])=>appInfo[id]&&status!=='closed'),services=root.SpatialBackgroundApps?.snapshot().items||[];
    node.innerHTML='<header class="utility-intro"><h2>Demo activity</h2><p>Windows in '+esc(workspaceProfiles[activeWorkspace].label)+' and shared background services. Host CPU, memory, and processes are not available to this browser demo.</p></header><div class="utility-button-row"><button type="button" data-monitor-refresh>Refresh</button><span>'+windows.length+' windows · '+services.length+' background services</span></div><div class="desktop-process-list"><h3>Windows · this Workspace</h3>'+windows.map(([id,status])=>'<article><span class="app-badge '+appInfo[id].tone+'">'+glyph(appInfo[id].icon)+'</span><div><b>'+esc(appInfo[id].label)+'</b><small>'+esc(status==='minimized'?'Parked':'Open')+' · '+esc(projectSpaces[desktopPages.columnOf(activeWorkspace,id)]?.name||'Workspace')+'</small></div><button type="button" data-monitor-focus="'+esc(id)+'">Show</button>'+(id==='monitor'?'':'<button type="button" data-monitor-close="'+esc(id)+'">Close</button>')+'</article>').join('')+'<h3>Background · all Workspaces</h3>'+(services.length?services.map(service=>'<article><div><b>'+esc(service.label)+'</b><small>'+esc(service.model.playing?'Playing music':service.model.download?.active?'Downloading demo update':'Background activity')+'</small></div><button type="button" data-monitor-service="'+esc(service.id)+'">Stop</button></article>').join(''):'<p>No background services are running.</p>')+'</div><p class="utility-status" data-utility-status role="status">Closing a window keeps explicitly running music and downloads. Stop ends a background service.</p>';
  }
  const alternatives={Krita:['Painting App','Painting is not implemented here. Open a screenshot or image to draw simple annotations.','screenshot'],Gwenview:['Image Viewer','File Browser opens saved images and their previews.','dolphin'],Inkscape:['Vector Editor','Vector editing is not implemented in this demo. Keep source files in File Browser.','dolphin'],Blender:['3D Editor','3D modelling is not implemented in this demo. Keep project materials in Files.','dolphin'],Thunderbird:['Email Client','Email accounts and message delivery are outside this local demo. Use Note Editor to draft a message.','notes'],'KDE Connect':['Device Link','Real phone pairing is outside the browser demo. System controls show the available connection simulation.','settings'],'LibreOffice Writer':['Word Processor','Rich document layout is not implemented here. Note Editor supports local text documents.','notes'],'LibreOffice Calc':['Spreadsheet','Spreadsheet editing is not implemented here. Calculator supports numerical expressions.','calculator'],VLC:['Media Player','Open the included audio library in Music Player.','elisa'],Kdenlive:['Video Editor','Video editing is outside this browser demo. Keep media in Files.','dolphin'],'OBS Studio':['Screen Recorder','Recording is not implemented here. Screenshot Tool can capture a tab as a still image.','screenshot'],Ark:['Archive Manager','Project folders can be exported and imported as ZIP files using their Project menu. File Browser shows their contents.','dolphin'],Kate:['Text Editor','Note Editor provides editable local text documents in this demo.','notes']};
  function renderPreview(name){
    const model=appWindowModel('app-preview');if(name)model.previewName=name;
    const original=model.previewName||'Other Apps',details=alternatives[original]||[SpatialAppNames.label(original),'This app category is a preview. Its full application is outside this browser demo. Explore the working apps in Software Center.','software'];
    host('app-preview').innerHTML='<div class="utility-app-preview"><span class="utility-preview-badge">App preview</span><h2>'+esc(details[0])+'</h2><p>'+esc(details[1])+'</p><button type="button" data-utility-open="'+details[2]+'">Open '+esc(appInfo[details[2]].label)+'</button><button type="button" data-utility-open="software">Browse working apps</button></div>';
  }
  function render(id){if(!definitions[id])return;if(id==='calculator')renderCalculator();if(id==='screenshot')renderScreenshot();if(id==='software')renderSoftware();if(id==='monitor')renderMonitor();if(id==='app-preview')renderPreview();prepareControlSemantics(host(id));}
  function renderAll(){for(const id of Object.keys(definitions))render(id);}
  api.launch=function(name){
    if(!started)return false;
    if(name==='Help Center'){setUniversalSearchOpen(false);root.SpatialGuide?.open();return true;}
    const id=aliases[name];if(id){nativeOpen(id);if(id==='calculator')host(id).querySelector('input')?.focus();return true;}
    renderPreview(name);saveAppWindows();nativeOpen('app-preview');return true;
  };
  api.start=function(){
    if(started)return;started=true;renderAll();
    const originalRestore=restoreWorkspaceContent;restoreWorkspaceContent=function(...args){const result=originalRestore(...args);renderAll();return result;};
    const originalOpen=openApp;openApp=function(id,...args){
      if(definitions[id]){
        if(!['open','minimized'].includes(appState[id])){appState[id]='closed';desktopPages.assign(activeWorkspace,id);}
        else if(desktopPages.columnOf(activeWorkspace,id)!==desktopPages.column(activeWorkspace))changeDesktopPage(desktopPages.pageOf(activeWorkspace,id),false,desktopPages.columnOf(activeWorkspace,id));
      }
      const result=originalOpen(id,...args);if(definitions[id])render(id);return result;
    };
    document.addEventListener('submit',event=>{if(event.target.matches('[data-calculator-form]')){event.preventDefault();event.stopImmediatePropagation();runCalculation();}},true);
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-calculator-key],[data-calculator-history],[data-screenshot],[data-screenshot-tool],[data-utility-open],[data-utility-preview],[data-monitor-refresh],[data-monitor-focus],[data-monitor-close],[data-monitor-service]');if(!button)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(button.hasAttribute('data-calculator-key')){const input=host('calculator').querySelector('input'),key=button.dataset.calculatorKey;if(key==='Clear')input.value='';else if(key==='⌫')input.value=input.value.slice(0,-1);else input.setRangeText(key,input.selectionStart??input.value.length,input.selectionEnd??input.value.length,'end');calcModel().expression=input.value;saveAppWindows(false);input.focus();}
      if(button.hasAttribute('data-calculator-history')){const row=calcModel().calculations.slice().reverse()[Number(button.dataset.calculatorHistory)];if(row){calcModel().expression=String(row.result);saveAppWindows(false);renderCalculator();}}
      if(button.dataset.screenshot)screenshotAction(button.dataset.screenshot).catch(error=>notify('screenshot',error.message));
      if(button.dataset.screenshotTool){const state=currentCapture();if(state){state.tool=button.dataset.screenshotTool;renderScreenshot();}}
      if(button.dataset.utilityOpen)nativeOpen(button.dataset.utilityOpen);
      if(button.dataset.utilityPreview)api.launch(button.dataset.utilityPreview);
      if(button.hasAttribute('data-monitor-refresh'))renderMonitor();
      if(button.dataset.monitorFocus){const id=button.dataset.monitorFocus;changeDesktopPage(desktopPages.pageOf(activeWorkspace,id),false,desktopPages.columnOf(activeWorkspace,id));openApp(id);}
      if(button.dataset.monitorClose){closeApp(button.dataset.monitorClose);renderMonitor();}
      if(button.dataset.monitorService){root.SpatialBackgroundApps?.stop(button.dataset.monitorService);renderMonitor();}
    },true);
    document.addEventListener('input',event=>{if(event.target.matches('[data-calculator-input]')){calcModel().expression=event.target.value;saveAppWindows(false);}if(event.target.matches('[data-screenshot-name]')){const state=currentCapture();if(state)state.name=event.target.value;}},true);
    document.addEventListener('change',event=>{
      if(event.target.matches('[data-screenshot-color]')&&currentCapture())currentCapture().color=event.target.value;
      if(event.target.matches('[data-screenshot-directory]')&&currentCapture())currentCapture().directory=event.target.value;
      if(event.target.matches('[data-screenshot-import]')){const file=event.target.files[0];if(file){if(file.size>15*1024*1024){notify('screenshot','Choose an image smaller than 15 MB.');return;}setImage(file,activeWorkspace,file.name.replace(/\.[^.]+$/,'')+'.png').catch(error=>notify('screenshot',error.message));}}
    },true);
    // Refresh only while visible; no fabricated live CPU or memory readings.
    monitorTimer=setInterval(()=>{if(frameLocal('monitor')&&!host('monitor').contains(document.activeElement))renderMonitor();},3000);
    root.addEventListener('pagehide',()=>{clearInterval(monitorTimer);});
  };
})(typeof globalThis!=='undefined'?globalThis:this);
