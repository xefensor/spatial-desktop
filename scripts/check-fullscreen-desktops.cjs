const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const Pages=require('../dist/desktop-pages.js'),T=require('../dist/spatial-tiling.js');
const source=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const slice=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b);};
const copy=value=>JSON.parse(JSON.stringify(value));
// Exercise production fullscreen enter/exit, navigation, visibility, launch,
// close and Park adapters. Peers on the second display retain their own tree.
let slot=1,count=2;
const classes=()=>{const values=new Set();return{add(...names){names.forEach(x=>values.add(x));},remove(...names){names.forEach(x=>values.delete(x));},toggle(name,on){on?values.add(name):values.delete(name);},contains:name=>values.has(name)};};
const nodes=new Map(),node=key=>{if(!nodes.has(key))nodes.set(key,{key,dataset:{},style:{setProperty(name,value){this[name]=value;}},classList:classes(),hidden:true,children:[],setAttribute(name,value){this[name]=value;},focus(){},querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0})});return nodes.get(key);};
const frames=Object.fromEntries(['game','browser','notes','terminal','steam'].map(name=>[name,node(name)]));
for(const [name,frame]of Object.entries(frames))frame.dataset.appFrame=name;
const ctx={desktopPages:Pages.create(),activeWorkspace:'gaming',appInfo:Object.fromEntries(Object.keys(frames).map(name=>[name,{label:name==='game'?'Fallout 4':name}])),
 appState:{game:'open',browser:'open',notes:'open',terminal:'open',steam:'minimized'},appMaximizedState:{},
 tileSessions:{},tileEngine:T,localDisplaySlot:()=>slot,activeDisplayRoster:()=>Array.from({length:count},()=>({width:1363,height:936})),extendedDesktopActive:()=>count>1,
 displayAssignmentsFor:()=>({apps:{game:1,browser:1,notes:2,terminal:2},areas:{apps:2}}),intentAreaPlan:{moves:{}},cloneDesktopState:copy,
 frameFor:name=>frames[name],document:{body:{classList:classes()}},window:{matchMedia:()=>({matches:true}),setTimeout(){}},$:node,$$:()=>[],
 placementUndoEpoch:0,cancelAreaPointerInteraction:null,desktopPageAnimating:false,tileInteraction:false,manualWindowInteraction:false,desktopHasWindowFocus:false,frontApp:'game',windowViewportLockReady:false,
 saveDesktopPages(){},saveTileSessions(){},saveLayout(){},returnCoveredApps(){},releaseBorrowedApp(){},refreshIntentAreas(){},renderTileLayout(){},queueDesktopStateBroadcast(){},
 updateDesktopPageUi(){},focusDesktop(){},renderProjectSpace(){},captureWorkspaceContent(){},endSystemRailExpansion(){},layoutDockAreas(){},topOpenApp:()=>Object.keys(ctx.appState).find(name=>ctx.isLocalApp(name)&&ctx.appState[name]==='open'),
 bringToFront(name){ctx.frontApp=name;},showToast(){},syncApps(){for(const [name,frame]of Object.entries(frames))frame.hidden=ctx.appState[name]!=='open'||!ctx.isLocalApp(name);},
 appMaximizedState:{},autoTiledWindows:new Set(),windowGeometry:new Map(),layoutMode:'manual',
 syncMaximizeButton(){},clearWindowAutoAvoidance(){},removeOffPageWindowTiles(){},scheduleSpatialAutoLayout(){},rebalanceAreaDisplays:()=>false,applyExtendedDesktopPartition(){},
 readGeometry:()=>({x:0,y:0,width:500,height:400}),desktopColumnLabel:()=> 'Gaming',
 workspaceProfiles:{gaming:{label:'Gaming',accent:'#5af',rack:['game','steam']}},projectSpaces:{},openProjectNames:()=>[],appArt:name=>'<i>'+name+'</i>',icon:()=>'<svg></svg>',escapeHtml:String,prepareControlSemantics(){},applyAppPrimaryColors(){}
};
vm.createContext(ctx);
ctx.appInfo.game.borderlessFullscreen=true;ctx.appInfo.game.gamescope=true;
vm.runInContext(slice('function tileContextKey(','function tileBounds('),ctx);
vm.runInContext(slice('function leaveAppFullscreen(','// Subtract opaque'),ctx);
vm.runInContext(slice('function createBondedFullscreen(','function updateFloatingYield('),ctx);
vm.runInContext(slice('function isLocalApp(','function persistDisplayAssignments('),ctx);
vm.runInContext(slice('function changeDesktopPage(','function moveWindowToDesktop('),ctx);
vm.runInContext(slice('function closeApp(','function syncMaximizeButton('),ctx);
vm.runInContext(slice('function minimizeApp(','function closeApp('),ctx);
for(const [name,page]of [['game',0],['browser',0],['notes',0],['terminal',1],['steam',0]])ctx.desktopPages.assign('gaming',name,page);
ctx.tileSessions['gaming:desktop:0:1']={root:T.insert(T.leaf('browser'),'game','browser','right'),parked:{},floating:{},focus:null};
ctx.tileSessions['gaming:desktop:0:2']={root:T.leaf('notes'),parked:{},floating:{notes:{left:300,top:80,width:600,height:400}},focus:null};
const origin=copy(ctx.tileSession().root),peerBefore=JSON.stringify(ctx.tileSessions['gaming:desktop:0:2']);
const entriesBefore=JSON.stringify(ctx.desktopPages.entries('gaming'));
// The same game owns the same ordinary desktop and split in either mode.
ctx.toggleAppFullscreen('game');
assert.equal(ctx.tileSession().fullscreen.name,'game');assert.equal(ctx.tileContextKey(),'gaming:desktop:0:1');
assert.equal(ctx.desktopPages.selectedFullscreen('gaming'),null);assert.equal(ctx.desktopPages.fullscreenBond('gaming','game'),null);
assert.equal(JSON.stringify(ctx.desktopPages.entries('gaming')),entriesBefore);assert.equal(ctx.desktopPages.current('gaming'),0);
assert.equal(ctx.desktopPages.next('gaming',1).page,1,'One scroll advances directly to the next ordinary desktop');
assert.equal(ctx.appState.game,'open');
slot=2;assert.equal(ctx.tileContextKey(),'gaming:desktop:0:2');assert(ctx.isLocalApp('notes'));assert(!ctx.isLocalApp('game'));
assert.equal(JSON.stringify(ctx.tileSessions['gaming:desktop:0:2']),peerBefore,'Presentation does not replace the other display tree');
slot=1;ctx.toggleAppFullscreen('game');assert(!ctx.tileSession().fullscreen);assert.deepEqual(copy(ctx.tileSession().root),origin);
assert.equal(ctx.createBondedFullscreen('game'),null,'The legacy entry point cannot create a child');
// A genuine fullscreen canvas bypasses tile minimums even when Areas occupy
// nearly all of the ordinary canvas. It cannot be parked by the fitter.
ctx.toggleAppFullscreen('game');const previousRenderer=ctx.renderTileLayout;let fullscreenRendered=0,hotbarRefreshed=0;
Object.assign(ctx,{tileRendering:false,manualWindowInteraction:false,renderFloatingWindows(){},renderTileDividers(){},renderFullscreenWindow(name){assert.equal(name,'game');fullscreenRendered++;},scheduleHotbarOrder(){hotbarRefreshed++;},scheduleWindowVisibility(){},parkFullscreenPeers(){},reconcileTileTree(){throw Error('Fullscreen must bypass ordinary tile fitting');}});
vm.runInContext(slice('function renderTileLayout(','function tileOpenWindows('),ctx);
ctx.renderTileLayout('game');assert.equal(fullscreenRendered,1);assert.equal(hotbarRefreshed,1,'Borderless fullscreen refreshes the spatial hotbar even while bypassing tile geometry');assert.equal(ctx.appState.game,'open');ctx.renderTileLayout=previousRenderer;ctx.toggleAppFullscreen('game');
// Fullscreen parks only covered local peers and restores its own parked peers.
// An app that was already parked or explicitly closed must stay that way.
ctx.autoWindowAvoidance=new Set();ctx.moveCoveredApps=()=>{};
vm.runInContext(slice('function parkTileWindows(','// A maximized window'),ctx);
vm.runInContext(slice('function parkFullscreenPeers(','function leaveAppFullscreen('),ctx);
ctx.toggleAppFullscreen('game');ctx.parkFullscreenPeers(ctx.tileSession());
assert.equal(ctx.appState.browser,'minimized');assert.equal(ctx.appState.notes,'open');assert.equal(ctx.appState.steam,'minimized');
ctx.leaveAppFullscreen();assert.equal(ctx.appState.browser,'open');assert.equal(ctx.appState.steam,'minimized');assert.deepEqual(copy(ctx.tileSession().root),origin);
ctx.toggleAppFullscreen('game');ctx.parkFullscreenPeers(ctx.tileSession());ctx.closeApp('browser');ctx.leaveAppFullscreen();assert.equal(ctx.appState.browser,'closed','Returning cannot revive an explicitly closed peer');
ctx.appState.browser='open';ctx.tileSession().root=copy(origin);

function oldBond({selected=true,display=1,owner='workspace',page=0}={}){
 ctx.desktopPages.assign('gaming','game',page,owner);ctx.desktopPages.select('gaming',owner);ctx.desktopPages.go('gaming',page);
 const prefix=ctx.desktopPages.context('gaming',page,owner),rest=T.remove(origin,'game');
 ctx.tileSessions[prefix+display]={root:copy(rest),parked:{},floating:{},focus:null};
 ctx.desktopPages.addFullscreen('gaming','game',display);if(selected)ctx.desktopPages.goFullscreen('gaming','game');
 ctx.tileSessions[prefix+'fullscreen:game:'+display]={root:T.leaf('game'),parked:{},floating:{},focus:null,fullscreen:{name:'game',bonded:true,originRoot:copy(origin),originRest:copy(rest),originFloating:null,originFocus:null}};
 return prefix;
}
// Selected legacy children become fullscreen on their original desktop. Their
// Project, display, old split and other monitor's state remain intact.
const projectPrefix=oldBond({owner:'project',display:2,page:1});
ctx.ensureBondedFullscreenDesktops();
assert.equal(ctx.desktopPages.column('gaming'),'project');assert.equal(ctx.desktopPages.current('gaming'),1);
assert.equal(ctx.desktopPages.fullscreenBond('gaming','game'),null);assert.equal(ctx.desktopPages.selectedFullscreen('gaming'),null);
assert(!Object.keys(ctx.tileSessions).some(key=>key.includes(':fullscreen:')));assert(!ctx.desktopPages.entries('gaming').some(entry=>entry.fullscreen));
assert.equal(ctx.tileSessions[projectPrefix+2].fullscreen.name,'game');assert.deepEqual(copy(ctx.tileSessions[projectPrefix+2].root),origin);
assert.equal(JSON.stringify(ctx.tileSessions['gaming:desktop:0:2']),peerBefore);
const migrated=JSON.stringify({pages:ctx.desktopPages.snapshot(),tiles:ctx.tileSessions});ctx.ensureBondedFullscreenDesktops();assert.equal(JSON.stringify({pages:ctx.desktopPages.snapshot(),tiles:ctx.tileSessions}),migrated,'Migration is idempotent');
const reload=Pages.create(ctx.desktopPages.snapshot());assert(!reload.selectedFullscreen('gaming'));assert(!reload.entries('gaming').some(entry=>entry.fullscreen));
// A user viewing the old parent keeps an ordinary desktop with the game tiled.
// Later parent arrangements and a user-selected different page survive.
ctx.tileSessions[projectPrefix+2].fullscreen=null;
const prefix=oldBond({selected:false});ctx.tileSessions[prefix+1].root=T.leaf('notes');ctx.desktopPages.go('gaming',1);
ctx.ensureBondedFullscreenDesktops();
assert.equal(ctx.desktopPages.current('gaming'),1,'Migration never changes a user-selected ordinary desktop');
assert(!ctx.tileSessions[prefix+1].fullscreen);assert.equal(ctx.tileSessions[prefix+1].root.name,'notes');assert(!ctx.desktopPages.fullscreenBond('gaming','game'));
// The initial demo marker becomes a tiled game on Desktop 1 and never recreates
// a hidden child. Explicit future fullscreen requests remain fullscreen.
ctx.desktopPages.go('gaming',0);ctx.tileSession().fullscreen={name:'game',startOnParent:true};
ctx.ensureBondedFullscreenDesktops();assert(!ctx.tileSession().fullscreen);assert.equal(ctx.desktopPages.current('gaming'),0);assert.equal(ctx.appState.game,'open');
assert(!ctx.desktopPages.entries('gaming').some(entry=>entry.fullscreen));
ctx.tileSession().fullscreen={name:'game'};ctx.ensureBondedFullscreenDesktops();assert.equal(ctx.tileSession().fullscreen.name,'game');ctx.leaveAppFullscreen();
// Close and explicit Park remove the presentation without leaving a route.
for(const action of ['closeApp','minimizeApp']){
 ctx.appState.game='open';ctx.toggleAppFullscreen('game');ctx[action]('game');
 assert.equal(ctx.appState.game,action==='closeApp'?'closed':'minimized');assert(!ctx.tileSession().fullscreen);assert(!ctx.desktopPages.fullscreenBond('gaming','game'));
}
// Actual virtual-screen mode is read from its owner session, including when
// Overview is opened from the other display. Tiling persists Steam's choice.
let virtualSaved={};ctx.desktopStorage={getItem:key=>virtualSaved[key]||null,setItem:(key,value)=>virtualSaved[key]=value};
const keyListeners=[];let dialogOpen=false;
ctx.document.getElementById=()=>null;ctx.document.querySelector=()=>dialogOpen?{}:null;ctx.ResizeObserver=class{observe(){}};ctx.document.addEventListener=(type,fn,capture)=>{if(type==='keydown')keyListeners.push({fn,capture});};ctx.window.addEventListener=()=>{};
for(const frame of Object.values(frames))frame.querySelector=()=>null;
ctx.contextMenuEntries=()=>[];ctx.executeContextAction=()=>{};ctx.setUniversalSearchOpen=()=>{};ctx.saveIndependentSessions=()=>{};ctx.renderOverviewWindows=()=>{};
ctx.appState.game='open';ctx.desktopPages.go('gaming',0);slot=1;
ctx.tileSessions['gaming:desktop:0:1']={root:T.leaf('game'),parked:{},floating:{game:{left:10,top:10,width:500,height:400}},focus:{name:'game'}};
vm.runInContext(fs.readFileSync(require.resolve('../dist/virtual-screen.js'),'utf8'),ctx);
assert(ctx.SpatialVirtualScreen.showFullscreen('game'));assert(ctx.SpatialVirtualScreen.fullscreen('game'));assert(!ctx.SpatialVirtualScreen.prefersTiled('game'));
slot=2;assert(ctx.SpatialVirtualScreen.fullscreen('game'),'Overview can find the actual game mode on its owning display');slot=1;
assert(ctx.SpatialVirtualScreen.showTiled('game'));assert(!ctx.SpatialVirtualScreen.fullscreen('game'));assert(!ctx.tileSession().floating.game);assert(!ctx.tileSession().focus);
assert(ctx.SpatialVirtualScreen.prefersTiled('game'));assert.equal(JSON.parse(virtualSaved['spatial-virtual-screen-modes-v1']).gaming.game,'tiled');
assert.equal(ctx.SpatialVirtualScreen.showTiled('game'),false,'A repeated or stale tile action is harmless');
assert(ctx.SpatialVirtualScreen.showFullscreen('game'));assert.equal(ctx.desktopPages.current('gaming'),0);assert(!ctx.desktopPages.entries('gaming').some(entry=>entry.fullscreen));
// Exercise the production capture listener for both native Super and the
// browser F2 alternative. No general show-desktop or ordinary-window action is
// introduced, and overlays and unrelated modifier combinations retain control.
assert.equal(keyListeners.length,1);assert.equal(keyListeners[0].capture,true);
function pressD(extra={}){
 const event={code:'KeyD',metaKey:true,repeat:false,ctrlKey:false,altKey:false,shiftKey:false,isComposing:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...extra};
 keyListeners[0].fn(event);return event;
}
ctx.superKeyAlone=true;let event=pressD();assert(event.defaultPrevented&&event.stopped);assert(!ctx.SpatialVirtualScreen.fullscreen('game'));assert.equal(ctx.superKeyAlone,false);
ctx.SpatialVirtualScreen.showFullscreen('game');ctx.SpatialDemoSuper={held:()=>true};event=pressD({metaKey:false});assert(event.defaultPrevented);assert(!ctx.SpatialVirtualScreen.fullscreen('game'));delete ctx.SpatialDemoSuper;
ctx.SpatialVirtualScreen.showFullscreen('game');
for(const extra of [{metaKey:false},{repeat:true},{ctrlKey:true},{altKey:true},{shiftKey:true},{isComposing:true},{code:'KeyA'}]){
 event=pressD(extra);assert(!event.defaultPrevented);assert(ctx.SpatialVirtualScreen.fullscreen('game'));
}
dialogOpen=true;event=pressD();assert(!event.defaultPrevented);assert(ctx.SpatialVirtualScreen.fullscreen('game'));dialogOpen=false;
ctx.SpatialVirtualScreen.showTiled('game');event=pressD();assert(!event.defaultPrevented,'Without a borderless fullscreen app, the shortcut does nothing');
ctx.toggleAppFullscreen('browser');event=pressD();assert(!event.defaultPrevented);assert.equal(ctx.tileSession().fullscreen.name,'browser','Ordinary fullscreen is unaffected');ctx.toggleAppFullscreen('browser');
slot=2;event=pressD();assert(!event.defaultPrevented,'The peer display cannot tile another display\'s game');
// Gamescope toggles its one outer window, never the game canvas or desktop.
slot=1;ctx.frontApp='game';ctx.desktopHasWindowFocus=true;
const beforeF=JSON.stringify(ctx.desktopPages.snapshot());
event=pressD({code:'KeyF'});assert(event.defaultPrevented);assert(ctx.SpatialVirtualScreen.fullscreen('game'));
event=pressD({code:'KeyF'});assert(event.defaultPrevented);assert(!ctx.SpatialVirtualScreen.fullscreen('game'));
assert.equal(JSON.stringify(ctx.desktopPages.snapshot()),beforeF);assert.equal(ctx.appState.game,'open');
ctx.SpatialDemoSuper={held:()=>true};event=pressD({code:'KeyF',metaKey:false});assert(event.defaultPrevented);assert(ctx.SpatialVirtualScreen.fullscreen('game'));delete ctx.SpatialDemoSuper;
ctx.SpatialVirtualScreen.showTiled('game');
for(const extra of [{repeat:true},{ctrlKey:true},{shiftKey:true},{altKey:true},{isComposing:true},{target:{closest:()=>({})}}]){event=pressD({code:'KeyF',...extra});assert(!event.defaultPrevented);}
ctx.desktopHasWindowFocus=false;event=pressD({code:'KeyF'});assert(!event.defaultPrevented);assert.equal(ctx.appState.game,'open','Losing focus does not park the tiled game');
ctx.desktopHasWindowFocus=true;ctx.frontApp='browser';event=pressD({code:'KeyF'});assert(!event.defaultPrevented,'Ordinary apps retain their shortcut');
ctx.frontApp='game';dialogOpen=true;event=pressD({code:'KeyF'});assert(!event.defaultPrevented,'Overlays retain priority');dialogOpen=false;
slot=2;event=pressD({code:'KeyF'});assert(!event.defaultPrevented,'Cannot toggle a game on another display');slot=1;

console.log('Fullscreen presentation passed: original desktop identity, direct canvas, ordinary navigation, peer displays, legacy/reload recovery, demo migration, Park/close, remembered virtual-screen modes and Win/F2+D with modifier/dialog/ordinary-window guards.');
