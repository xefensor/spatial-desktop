const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path'),D=require('../dist/demo-examples.js');
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8'),source=fs.readFileSync(path.join(__dirname,'../dist/steam-overview.js'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'No duplicate desktop or provider IDs');
for(const section of html.matchAll(/<section class="(?:overview-panel steam-overview-panel|steam-game-stage)[\s\S]*?<\/section>/g))for(const ref of section[0].matchAll(/<use href="#([^"]+)"/g))assert(ids.includes(ref[1]),'Provider icon exists: '+ref[1]);
for(const file of [...html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)].map(m=>m[1]).filter(f=>!f.includes(':')&&!f.startsWith('#')))assert(fs.existsSync(path.join(__dirname,'../dist',file)),'Local asset exists: '+file);
const nodes=new Map(),memory=new Map(),frames=[],timers=[];
function node(key){if(nodes.has(key))return nodes.get(key);const n={key,dataset:{},attrs:{},listeners:{},children:[],value:'',textContent:'',hidden:false,inert:false,scrollTop:0,scrollHeight:500,style:{},className:'',
setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},addEventListener(k,f){this.listeners[k]=f;},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},focus(){focused=this.key;},select(){this.selected=true;},querySelector(k){return node(key+':'+k);},classList:{add(){},remove(){}}};nodes.set(key,n);return n;}
let focused='',open=false,fullscreen=null;
node('universalSearch').classList={contains:()=>open};
const tools=['friends','guides','notes','achievements'].map(id=>{const n=node('tab:'+id);n.dataset.steamTool=id;n.attrs['aria-controls']='steam'+id[0].toUpperCase()+id.slice(1)+'Panel';return n;});
const friendButtons=['morgan','claire','jamie'].map(id=>{const n=node('friend:'+id);n.dataset.steamFriend=id;return n;});
const guideButtons=['settlement','explore','inventory'].map(id=>{const n=node('guide:'+id);n.dataset.steamGuide=id;n.textContent={settlement:'A useful first settlement Building',explore:'Explore at your own pace Exploration',inventory:'Keep your pack manageable Inventory'}[id];return n;});
const achievements=[true,true,false,false].map((v,i)=>{const n=node('achievement:'+i);n.dataset.steamUnlocked=String(v);return n;});
const root=node('root');root.querySelectorAll=k=>({'[data-steam-tool]':tools,'[data-steam-friend]':friendButtons,'[data-steam-guide]':guideButtons,'[data-steam-unlocked]':achievements}[k]||[]);
const context={appInfo:{steam:{},game:{}},workspaceProfiles:{general:{label:'General'},gaming:{label:'Gaming'},school:{label:'School'},work:{label:'Work'}},desktopPreset:'demo',activeWorkspace:'general',appState:{game:'closed',steam:'closed'},frameFor:()=>node('gameFrame'),isLocalApp:()=>true,tileSession:()=>({fullscreen}),filterLauncher(){},toggleAppFullscreen(name){fullscreen=fullscreen?.name===name?null:{name};},openApp(name){context.appState[name]='open';context.SpatialSteamOverview?.appOpened(name);},minimizeApp(name){context.appState[name]='minimized';},document:{querySelector:k=>k.includes('data-overview-panel')?root:node(k),getElementById:node,createElement:k=>node('new:'+nodes.size+':'+k),body:node('body'),addEventListener(k,f){node('document').listeners[k]=f;}},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},window:{addEventListener(k,f){node('window').listeners[k]=f;}},navigator:{clipboard:{writeText:async()=>{}}},requestAnimationFrame:f=>frames.push(f),setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},showToast(){},SpatialOverviewDesktop:{refresh(){},select(id){context.active=id;},registerSection(id,provider){context.provider=provider;}},setUniversalSearchOpen(v){open=v;node('.desktop-shell').inert=v;context.SpatialSteamOverview?.overviewChanged(v);}};
vm.createContext(context);vm.runInContext(source,context);frames.splice(0).forEach(f=>f());frames.splice(0).forEach(f=>f());
assert.equal(context.provider.available(),false,'No Steam tab in General');
for(const workspace of ['school','work']){context.activeWorkspace=workspace;context.SpatialSteamOverview.workspaceChanged();assert.equal(context.provider.available(),false);assert.equal(open,false);}
context.activeWorkspace='gaming';context.appState={game:'open',steam:'minimized'};fullscreen={name:'game'};
context.SpatialSteamOverview.workspaceChanged();assert.equal(context.provider.available(),true);context.setUniversalSearchOpen(true);frames.splice(0).forEach(f=>f());
assert(context.SpatialSteamOverview.running()&&open);assert.equal(context.active,'steam');
const click=(kind,value)=>root.listeners.click({target:{closest:k=>k==='[data-steam-'+kind+']'?{dataset:{['steam'+kind[0].toUpperCase()+kind.slice(1)]:value}}:null}});
node('steamMessageInput').value='draft for Morgan';click('friend','claire');assert.equal(node('steamMessageInput').value,'');click('friend','morgan');assert.equal(node('steamMessageInput').value,'draft for Morgan','Drafts remain separate');
node('steamMessageInput').value='<img onerror=bad> hello';node('steamChatForm').listeners.submit({preventDefault(){}});const saved=JSON.parse(memory.get('spatial-gaming-steam-chats-v1'));assert(saved.morgan.at(-1).text.startsWith('<img'));assert.equal(saved.claire.length,1);assert.equal(node('steamMessages').children.at(-1).children[1].textContent,'<img onerror=bad> hello','Messages are inserted as text');
click('tool','notes');assert.equal(node('steamNotesPanel').hidden,false);assert.equal(node('steamFriendsPanel').hidden,true);
node('steamGameNotes').value='My next quest';node('steamGameNotes').listeners.input();timers.at(-1)();assert.equal(memory.get('spatial-gaming-fallout-note-v1'),'My next quest');assert.equal(node('steamNoteStatus').textContent,'Saved locally');
node('steamGuideSearch').value='not a guide';node('steamGuideSearch').listeners.input();assert(guideButtons.every(n=>n.hidden));assert.equal(node('steamGuideEmpty').hidden,false);node('steamGuideSearch').value='pack';node('steamGuideSearch').listeners.input();assert.equal(guideButtons.filter(n=>!n.hidden).length,1);
node('steamRemainingOnly').checked=true;node('steamRemainingOnly').listeners.change();assert(achievements.filter(n=>n.hidden).length===2);
let stopped=false;root.listeners.wheel({target:{closest:()=>node('steamMessages')},stopPropagation(){stopped=true;}});assert(stopped,'Nested tools retain wheel ownership at either edge');
context.setUniversalSearchOpen(false);assert.equal(fullscreen.name,'game');assert.equal(focused,'gameFrame:[data-steam-action="overview"]','Escape returns keyboard focus to the game');
context.setUniversalSearchOpen(true);frames.splice(0).forEach(f=>f());assert.equal(context.active,'steam');assert(context.SpatialSteamOverview.running(),'Overview never leaves fullscreen');
context.SpatialVirtualScreen={showTiled(){fullscreen=null;},refresh(){},prefersTiled:()=>!fullscreen};
context.SpatialSteamOverview.showDesktop();assert.equal(fullscreen,null);assert.equal(context.appState.game,'open','Showing the desktop tiles the game without closing it');assert.equal(open,false);
context.SpatialSteamOverview.appOpened('game');assert.equal(fullscreen,null,'Selecting a tiled game preserves its mode');
delete context.SpatialVirtualScreen;
context.SpatialSteamOverview.startGame();assert.equal(fullscreen.name,'game');assert.equal(context.appState.steam,'minimized');
fullscreen=null;context.SpatialVirtualScreen={prefersTiled:()=>true,refresh(){}};context.SpatialSteamOverview.startGame();assert.equal(fullscreen,null,'Returning through Steam preserves the tiled virtual screen');delete context.SpatialVirtualScreen;context.SpatialSteamOverview.startGame();assert.equal(fullscreen.name,'game');
node('steamMessageInput').value='Gaming draft';node('steamGameNotes').value='Gaming pending note';node('steamGameNotes').listeners.input();
context.activeWorkspace='work';context.appState={game:'closed',steam:'closed'};context.SpatialSteamOverview.workspaceChanged();assert.equal(context.provider.available(),false);assert.equal(context.SpatialSteamOverview.running(),false);
assert.equal(memory.get('spatial-gaming-fallout-note-v1'),'Gaming pending note','Pending notes flush into their originating Workspace');
assert.notEqual(node('steamGameNotes').value,'Gaming pending note');assert.equal(node('steamMessageInput').value,'');
context.SpatialSteamOverview.startGame();assert.equal(context.appState.game,'open','Fallout launches in Work');assert.equal(context.provider.available(),true,'A running Steam instance contributes its tab in Work');assert.equal(node('gameFrame:[data-steam-workspace-label]').textContent,'Work');
node('steamGameNotes').value='Work note';node('steamGameNotes').listeners.input();timers.at(-1)();assert.equal(memory.get('spatial-work-fallout-note-v1'),'Work note');
node('steamMessageInput').value='Only in Work';node('steamChatForm').listeners.submit({preventDefault(){}});assert.equal(JSON.parse(memory.get('spatial-work-steam-chats-v1')).morgan.at(-1).text,'Only in Work');
context.activeWorkspace='gaming';context.appState={game:'open',steam:'closed'};context.SpatialSteamOverview.syncContext();
assert.equal(node('steamGameNotes').value,'Gaming pending note');assert.equal(node('steamMessageInput').value,'Gaming draft');assert(!node('steamMessages').children.some(row=>row.children[1].textContent==='Only in Work'),'Foreign chats never enter the current Steam panel');assert.equal(context.provider.available(),false,'Closing Steam removes its contributed tab');
context.SpatialBackgroundApps={running:id=>id==='steam'};assert.equal(context.provider.available(),true,'Steam services remain available without a window while running in the background');
context.SpatialSteamOverview.startGame();assert.equal(context.appState.steam,'closed','Resuming a game does not create a parked client window when Steam already runs in the background');delete context.SpatialBackgroundApps;
context.SpatialSteamOverview.startGame();assert.equal(context.appState.steam,'minimized');assert.equal(context.provider.available(),true);
context.SpatialGuide={model:{active:()=>true}};assert.equal(context.provider.available(),false,'Guide practice never offers the Steam tab');
// Old demo storage gets only the new Gaming examples, once.
const seed=new Map([['spatial-demo-scenes-v1','4'],['spatial-workspace-app-states-v1',JSON.stringify({general:{notes:'open'},gaming:{browser:'open',notes:'closed'}})],['spatial-desktop-pages-v1',JSON.stringify({gaming:{active:1,activeColumn:'workspace',windows:{browser:0},owners:{browser:'workspace'}}})],['spatial-workspace-area-layouts-v1',JSON.stringify({gaming:{sizes:{left:327}}})]]);
const storage={getItem:k=>seed.get(k)||null,setItem:(k,v)=>seed.set(k,v)};D.seedWorkspaces(storage);
const states=JSON.parse(seed.get('spatial-workspace-app-states-v1'));assert.deepEqual(states.general,{notes:'open'});assert.equal(states.gaming.game,'open');assert.equal(states.gaming.steam,'minimized');assert.equal(states.gaming.notes,'closed');assert.equal(JSON.parse(seed.get('spatial-desktop-pages-v1')).gaming.active,1,'Existing page selection is retained');assert.equal(JSON.parse(seed.get('spatial-workspace-area-layouts-v1')).gaming.sizes.left,327);
assert.equal(JSON.parse(seed.get('spatial-split-layouts-v1'))['gaming:desktop:0:1'].fullscreen,undefined,'New game example has no child or hidden fullscreen');states.gaming.game='closed';seed.set('spatial-workspace-app-states-v1',JSON.stringify(states));D.seedWorkspaces(storage);assert.equal(JSON.parse(seed.get('spatial-workspace-app-states-v1')).gaming.game,'closed','Reload does not resurrect a closed game');
for(const workspace of ['general','school','work','custom-workspace']){context.SpatialGuide=undefined;context.activeWorkspace=workspace;context.appState={steam:'open',game:'closed'};context.SpatialSteamOverview.workspaceChanged();assert.equal(context.provider.available(),true,'Steam available in '+workspace);context.SpatialSteamOverview.startGame();assert.equal(context.appState.game,'open');}
for(const id of ['steam','game']){const button=html.match(new RegExp('<button[^>]*data-open-app="'+id+'"[^>]*>'))?.[0];assert(button&&!button.includes('data-app-workspace'),'Installed app is not filtered by Workspace');}
assert(!fs.readFileSync(path.join(__dirname,'../dist/desktop-shell.js'),'utf8').includes('workspace: "gaming", singleInstance'),'Base apps have no Gaming launch restriction');
console.log('Steam passed: every Workspace, isolated chat/note/draft state, pending-save ownership, legacy Gaming keys, Guide isolation, fullscreen return, separate chats/drafts, safe text, notes, filters, scroll ownership, and one-time legacy seeding.');

// The Overview keyboard listener runs before the window listener. One Escape
// must not also exit fullscreen after Overview has consumed that same event.
const shell=fs.readFileSync(path.join(__dirname,'../dist/desktop-shell.js'),'utf8');
const start=shell.indexOf('  if (root === document) document.addEventListener("keydown", event => {');
const end=shell.indexOf('\n  const observer = new ResizeObserver',start);
let windowEscape,exits=0;
const keyboard={root:null,document:{addEventListener:(_,listener)=>windowEscape=listener},tileSession:()=>({fullscreen:{name:'game'}}),toggleAppFullscreen:()=>exits++,$:selector=>selector==='#desktopContextMenu'?{hidden:true}:{classList:{contains:()=>false}}};
keyboard.root=keyboard.document;vm.createContext(keyboard);vm.runInContext(shell.slice(start,end),keyboard);
windowEscape({key:'Escape',defaultPrevented:true,preventDefault(){}});assert.equal(exits,0,'An Escape consumed by Overview cannot leave fullscreen');
windowEscape({key:'Escape',defaultPrevented:false,preventDefault(){}});assert.equal(exits,1,'A separate Escape still leaves fullscreen normally');
console.log('Fullscreen Escape passed: consumed Overview/dialog keys cannot also exit the app.');
