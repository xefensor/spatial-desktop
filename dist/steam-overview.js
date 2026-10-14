/* Local app-contributed Steam concept. No Steam service, account, or messages. */
(function(){
  'use strict';
  const root=document.querySelector('[data-overview-panel="steam"]');
  if(!root||desktopPreset!=='demo'||globalThis.SpatialGuide?.model.active())return;
  const find=id=>document.getElementById(id),all=selector=>[...root.querySelectorAll(selector)];
  const storeKey='spatial-gaming-steam-chats-v1',noteKey='spatial-gaming-fallout-note-v1';
  const friends={morgan:{name:'Morgan',presence:'Playing Factorio',tone:'green',initial:'M',messages:[{you:false,text:'Want to join our factory after your quest?'},{you:true,text:'Give me ten minutes. Almost back at Sanctuary.'}]},claire:{name:'Claire',presence:'Online',tone:'blue',initial:'C',messages:[{you:false,text:'How is your settlement coming along?'}]},jamie:{name:'Jamie',presence:'Away',tone:'violet',initial:'J',messages:[{you:false,text:'Catch you later!'}]}};
  const drafts={};let selected='morgan',noteTimer;
  try{const saved=JSON.parse(localStorage.getItem(storeKey)||'{}');for(const id of Object.keys(friends)){if(Array.isArray(saved[id]))friends[id].messages=saved[id].filter(m=>typeof m?.text==='string'&&typeof m.you==='boolean').slice(-50).map(m=>({you:m.you,text:m.text.slice(0,1000)}));}}catch{}
  function persistChat(){try{localStorage.setItem(storeKey,JSON.stringify(Object.fromEntries(Object.entries(friends).map(([id,f])=>[id,f.messages]))));return true;}catch{return false;}}
  function renderChat(){
    const f=friends[selected];find('steamChatTitle').textContent=f.name;find('steamChatPresence').textContent=f.presence;
    find('steamChatAvatar').textContent=f.initial;find('steamChatAvatar').className='steam-avatar avatar-'+f.tone;
    all('[data-steam-friend]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.steamFriend===selected)));
    const log=find('steamMessages');log.replaceChildren();
    for(const m of f.messages){const row=document.createElement('div'),by=document.createElement('small'),p=document.createElement('p');row.className='steam-message'+(m.you?' is-you':'');by.textContent=m.you?'You · sample':f.name+' · sample';p.textContent=m.text;row.append(by,p);log.append(row);}
    find('steamMessageInput').value=drafts[selected]||'';log.scrollTop=log.scrollHeight;
  }
  function selectTool(id,focus=false){
    const tabs=all('[data-steam-tool]');if(!tabs.some(b=>b.dataset.steamTool===id))return;
    tabs.forEach(b=>{const active=b.dataset.steamTool===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;find(b.getAttribute('aria-controls')).hidden=!active;if(active&&focus)b.focus({preventScroll:true});});
  }
  root.addEventListener('click',event=>{const tool=event.target.closest('[data-steam-tool]'),friend=event.target.closest('[data-steam-friend]'),guide=event.target.closest('[data-steam-guide]');if(tool)selectTool(tool.dataset.steamTool);if(friend&&friends[friend.dataset.steamFriend]){drafts[selected]=find('steamMessageInput').value;selected=friend.dataset.steamFriend;renderChat();}if(guide)renderGuide(guide.dataset.steamGuide);});
  root.querySelector('.steam-tool-tabs').addEventListener('keydown',event=>{const tab=event.target.closest('[data-steam-tool]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const tabs=all('[data-steam-tool]'),index=tabs.indexOf(tab);selectTool(tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length].dataset.steamTool,true);});
  // Nested tools own scrolling even when a list is short or exhausted.
  root.addEventListener('wheel',event=>{if(event.target.closest('.steam-messages,.steam-friends-list,.steam-guide-article,.steam-guide-list-column,#steamGameNotes,.steam-tool-tabs'))event.stopPropagation();},{passive:true});
  find('steamChatForm').addEventListener('submit',event=>{event.preventDefault();const input=find('steamMessageInput'),text=input.value.trim().slice(0,1000);if(!text)return;friends[selected].messages.push({you:true,text});friends[selected].messages=friends[selected].messages.slice(-50);drafts[selected]='';const saved=persistChat();renderChat();input.focus();if(!saved)showToast('Sample message kept for this visit; browser storage is full.');});
  const guides={settlement:{title:'A useful first settlement',type:'BUILDING · SAMPLE GUIDE',intro:'A small base is enough to make the next trip feel easier. Leave room for the things you actually use.',steps:['Start with a bed, water and a place to put supplies.','Keep the workshop easy to find when you come home.','Write down the next small improvement, then go exploring.'],end:'You can keep this guide here while switching to Notes. Closing Overview brings you straight back to the game.'},explore:{title:'Explore at your own pace',type:'EXPLORATION · SAMPLE GUIDE',intro:'Pick one direction that looks interesting. A short trip can leave plenty of stories for another evening.',steps:['Choose a nearby landmark before heading out.','Save a breadcrumb in Notes if you find a place to revisit.','Return to your base when you feel ready, then plan the next trip.'],end:'This is original illustrative content for the web concept.'},inventory:{title:'Keep your pack manageable',type:'INVENTORY · SAMPLE GUIDE',intro:'A lighter pack leaves more room for the interesting things you find along the way.',steps:['Store supplies at a familiar base.','Bring a small set of things you expect to use.','Leave yourself a note about anything you want to come back for.'],end:'Use personal Notes for your own routine rather than remembering everything at once.'}};
  function renderGuide(id){const g=guides[id];if(!g)return;all('[data-steam-guide]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.steamGuide===id)));const article=find('steamGuideArticle'),eyebrow=document.createElement('span'),title=document.createElement('h4'),intro=document.createElement('p'),list=document.createElement('ol'),end=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent=g.type;title.textContent=g.title;intro.textContent=g.intro;for(const text of g.steps){const li=document.createElement('li');li.textContent=text;list.append(li);}end.textContent=g.end;article.replaceChildren(eyebrow,title,intro,list,end);article.scrollTop=0;}
  find('steamGuideSearch').addEventListener('input',()=>{const query=find('steamGuideSearch').value.trim().toLocaleLowerCase();let count=0;all('[data-steam-guide]').forEach(b=>{b.hidden=!b.textContent.toLocaleLowerCase().includes(query);if(!b.hidden)count++;});find('steamGuideEmpty').hidden=count>0;});
  const notes=find('steamGameNotes');let noteLoaded=false;try{const saved=localStorage.getItem(noteKey);if(saved!==null){notes.value=saved;noteLoaded=true;}}catch{}
  if(!noteLoaded)notes.value='Next time\n\n• Finish the small house near the workshop.\n• Bring supplies back to Sanctuary.\n• Ask Morgan about the new factory.';
  function saveNote(){clearTimeout(noteTimer);try{localStorage.setItem(noteKey,notes.value);find('steamNoteStatus').textContent='Saved locally';}catch{find('steamNoteStatus').textContent='Could not save · copy your notes';}}
  notes.addEventListener('input',()=>{find('steamNoteStatus').textContent='Saving…';clearTimeout(noteTimer);noteTimer=setTimeout(saveNote,350);});notes.addEventListener('blur',saveNote);window.addEventListener('pagehide',saveNote);
  find('steamCopyNotes').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(notes.value);showToast('Game notes copied.');}catch{selectTool('notes');notes.focus();notes.select();showToast('Select and copy these notes with Ctrl+C.');}});
  find('steamRemainingOnly').addEventListener('change',()=>{all('[data-steam-unlocked]').forEach(a=>{a.hidden=find('steamRemainingOnly').checked&&a.dataset.steamUnlocked==='true';});});
  const gameFrame=()=>frameFor('game');
  const available=()=>!globalThis.SpatialGuide?.model.active() && activeWorkspace==='gaming' && appState.steam!==undefined && appState.steam!=='closed';
  const gameBond=()=>typeof desktopPages!=='undefined'?desktopPages.fullscreenBond?.(activeWorkspace,'game'):null;
  const running=()=>activeWorkspace==='gaming' && appState.game==='open' && isLocalApp('game') && tileSession().fullscreen?.name==='game';
  function syncContext(){
    const gameOpen=activeWorkspace==='gaming' && appState.game && appState.game!=='closed';
    find('steamGameState').textContent=gameBond()?'RUNNING · FULLSCREEN DESKTOP':running()?'CURRENT GAME · FULLSCREEN':gameOpen?'CURRENT GAME · OPEN':'READY TO PLAY';
    find('steamReturnGame').querySelector('span').textContent=gameOpen?'Return to game':'Launch game';
    globalThis.SpatialOverviewDesktop?.refresh();
  }
  function overviewChanged(open){
    if(open&&available()&&running())requestAnimationFrame(()=>{if(available()&&running()&&find('universalSearch').classList.contains('is-open')&&!find('universalSearchInput').value)globalThis.SpatialOverviewDesktop?.select('steam',false);});
    if(!open&&running())gameFrame()?.querySelector('[data-steam-action="overview"]')?.focus({preventScroll:true});
  }
  function appOpened(name){
    if(name==='game'&&activeWorkspace==='gaming'&&isLocalApp('game')&&tileSession().fullscreen?.name!=='game')toggleAppFullscreen('game');
    syncContext();
  }
  function startGame(withOverview=false){
    if(activeWorkspace!=='gaming')return;
    if(appState.steam==='closed'){openApp('steam');minimizeApp('steam');}
    openApp('game');
    setUniversalSearchOpen(withOverview);
    if(withOverview)overviewChanged(true);
  }
  function showDesktop(){
    if(activeWorkspace!=='gaming')return;
    setUniversalSearchOpen(false);
    const bond=gameBond();
    if(bond)changeDesktopPage(bond.page,false,bond.column);else if(running())toggleAppFullscreen('game');else minimizeApp('game');
    syncContext();
  }
  function openTools(tool){
    if(!available())return;
    setUniversalSearchOpen(true);
    requestAnimationFrame(()=>{if(available())globalThis.SpatialOverviewDesktop?.select('steam',false);if(tool)selectTool(tool);});
  }
  function workspaceChanged(){
    saveNote();filterLauncher();syncContext();
    if(find('universalSearch').classList.contains('is-open'))overviewChanged(true);
  }
  find('steamReturnGame').addEventListener('click',()=>startGame(false));
  find('steamReturnDesktop').addEventListener('click',()=>globalThis.SpatialOverviewDesktop?.select('apps',false));
  document.addEventListener('click',event=>{const button=event.target.closest('[data-steam-action]');if(!button||activeWorkspace!=='gaming')return;const action=button.dataset.steamAction;if(action==='overview')openTools();else if(['guides','notes','achievements'].includes(action))openTools(action);else if(action==='resume')startGame(false);else if(action==='desktop')showDesktop();});
  globalThis.SpatialSteamOverview={available,overviewChanged,startGame,showDesktop,running,appOpened,workspaceChanged,syncContext};
  renderChat();renderGuide('settlement');
  globalThis.SpatialOverviewDesktop?.registerSection('steam',{label:'Steam',available});
  workspaceChanged();
})();
