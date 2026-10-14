const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const Pages=require('../dist/desktop-pages.js'),T=require('../dist/spatial-tiling.js');
const source=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const slice=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b);};
const copy=value=>JSON.parse(JSON.stringify(value));
// Stable ordinary indices and a shared route with a display-specific projection.
const model=Pages.create();
for(const [name,page] of [['game',0],['browser',0],['notes',0],['terminal',1]])model.assign('gaming',name,page);
model.addFullscreen('gaming','game',1);
assert.deepEqual(model.entries('gaming').map(e=>[e.page,e.fullscreen]),[[0,null],[0,'game'],[1,null],[2,null]]);
assert.equal(model.pageOf('gaming','terminal'),1,'Insertion never renumbers ordinary window pages');
assert.deepEqual(model.next('gaming',1).fullscreen,'game');model.goFullscreen('gaming','game');
assert.equal(model.current('gaming'),0,'The parent coordinate stays stable on every monitor');
assert(model.visible('gaming','game',1,2));assert(!model.visible('gaming','browser',1,2));
assert(model.visible('gaming','notes',2,2));assert(!model.visible('gaming','game',2,2));
assert.deepEqual(model.next('gaming',-1),{page:0,fullscreen:null});
assert.deepEqual(model.next('gaming',1),{page:1,fullscreen:null});
const reloaded=Pages.create(model.snapshot());assert.deepEqual(reloaded.snapshot(),model.snapshot());
reloaded.go('gaming',1);assert(reloaded.visible('gaming','terminal',2,2));
assert(!reloaded.visible('gaming','game',1,2));assert(reloaded.fullscreenBond('gaming','game'),'Navigation retains fullscreen ownership');
model.removeFullscreen('gaming','game');assert(!model.selectedFullscreen('gaming'));
model.addFullscreen('gaming','game',2);model.goFullscreen('gaming','game');
assert(model.visible('gaming','game',1,1),'A disconnected owner falls back to the remaining display');
model.assign('gaming','game',1);assert(!model.fullscreenBond('gaming','game'),'Moving the window cannot leave a stale bond');
model.assign('gaming','game',0,'project');model.addFullscreen('gaming','game',2);model.goFullscreen('gaming','game');
assert.equal(model.column('gaming'),'project');assert.equal(model.selectedFullscreen('gaming','workspace'),null);
assert(Pages.create(model.snapshot()).selectedFullscreen('gaming'),'Project ownership survives reload');

// Exercise production fullscreen enter/exit, navigation, visibility, launch,
// close and Park adapters. Peers on the second display retain their own tree.
let slot=1,count=2;
const classes=()=>{const values=new Set();return{add(...names){names.forEach(x=>values.add(x));},remove(...names){names.forEach(x=>values.delete(x));},toggle(name,on){on?values.add(name):values.delete(name);},contains:name=>values.has(name)};};
const nodes=new Map(),node=key=>{if(!nodes.has(key))nodes.set(key,{key,dataset:{},style:{setProperty(){}},classList:classes(),hidden:true,children:[],setAttribute(){},focus(){},querySelectorAll:()=>[]});return nodes.get(key);};
const frames=Object.fromEntries(['game','browser','notes','terminal','steam'].map(name=>[name,node(name)]));
for(const [name,frame]of Object.entries(frames))frame.dataset.appFrame=name;
const ctx={desktopPages:Pages.create(),activeWorkspace:'gaming',appInfo:Object.fromEntries(Object.keys(frames).map(name=>[name,{label:name==='game'?'Fallout 4':name}])),
 appState:{game:'open',browser:'open',notes:'open',terminal:'open',steam:'minimized'},appMaximizedState:{},
 tileSessions:{},tileEngine:T,localDisplaySlot:()=>slot,activeDisplayRoster:()=>Array.from({length:count},()=>({width:1363,height:936})),extendedDesktopActive:()=>count>1,
 displayAssignmentsFor:()=>({apps:{game:1,browser:1,notes:2,terminal:2},areas:{apps:2}}),intentAreaPlan:{moves:{}},cloneDesktopState:copy,
 frameFor:name=>frames[name],document:{body:{classList:classes()}},window:{matchMedia:()=>({matches:true})},$:node,$$:()=>[],
 placementUndoEpoch:0,cancelAreaPointerInteraction:null,desktopPageAnimating:false,desktopHasWindowFocus:false,frontApp:'game',
 saveDesktopPages(){},saveTileSessions(){},saveLayout(){},returnCoveredApps(){},releaseBorrowedApp(){},refreshIntentAreas(){},renderTileLayout(){},queueDesktopStateBroadcast(){},
 updateDesktopPageUi(){},focusDesktop(){},renderProjectSpace(){},captureWorkspaceContent(){},endSystemRailExpansion(){},layoutDockAreas(){},topOpenApp:()=>Object.keys(ctx.appState).find(name=>ctx.isLocalApp(name)&&ctx.appState[name]==='open'),
 bringToFront(name){ctx.frontApp=name;},showToast(){},syncApps(){for(const [name,frame]of Object.entries(frames))frame.hidden=ctx.appState[name]!=='open'||!ctx.isLocalApp(name);},
 appMaximizedState:{},autoTiledWindows:new Set(),windowGeometry:new Map(),layoutMode:'manual',
 syncMaximizeButton(){},clearWindowAutoAvoidance(){},removeOffPageWindowTiles(){},scheduleSpatialAutoLayout(){},rebalanceAreaDisplays:()=>false,applyExtendedDesktopPartition(){},
 readGeometry:()=>({x:0,y:0,width:500,height:400}),desktopColumnLabel:()=> 'Gaming',
 workspaceProfiles:{gaming:{label:'Gaming',accent:'#5af'}},projectSpaces:{},openProjectNames:()=>[],appArt:name=>'<i>'+name+'</i>',icon:()=>'<svg></svg>',escapeHtml:String,prepareControlSemantics(){}
};
vm.createContext(ctx);
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
const origin=copy(ctx.tileSessions['gaming:desktop:0:1'].root),peerBefore=JSON.stringify(ctx.tileSessions['gaming:desktop:0:2']);
ctx.toggleAppFullscreen('game');
assert(ctx.desktopPages.selectedFullscreen('gaming'));assert.equal(ctx.tileSession().fullscreen.bonded,true);
assert.equal(ctx.tileContextKey(),'gaming:desktop:0:fullscreen:game:1');
assert.equal(ctx.appState.browser,'open');assert.equal(ctx.appState.notes,'open');assert.equal(ctx.appState.game,'open');
assert(!ctx.isLocalArea('apps'),'Fullscreen page has no Areas even in Manual mode');
slot=2;assert.equal(ctx.tileContextKey(),'gaming:desktop:0:2');assert(ctx.isLocalApp('notes'));assert(!ctx.isLocalApp('game'));assert(ctx.isLocalArea('apps'));
assert.equal(JSON.stringify(ctx.tileSessions['gaming:desktop:0:2']),peerBefore,'The held monitor tree and floats are untouched');
// Scroll beyond the child advances BOTH displays to ordinary page 2.
const next=ctx.desktopPages.next('gaming',1);ctx.changeDesktopPage(next.page,false,'workspace',next.fullscreen);
assert.equal(ctx.desktopPages.current('gaming'),1);assert(ctx.isLocalApp('terminal'));
slot=1;assert(!ctx.isLocalApp('game'));assert.equal(ctx.appState.game,'open');
assert(ctx.tileSessions['gaming:desktop:0:fullscreen:game:1'].fullscreen,'Switching never exits or parks the game');
const above=ctx.desktopPages.next('gaming',-1);ctx.changeDesktopPage(above.page,false,'workspace',above.fullscreen);
assert.equal(ctx.tileSession().fullscreen.name,'game');ctx.changeDesktopPage(0,false);
assert(ctx.isLocalApp('browser'));assert(!ctx.isLocalApp('game'));assert(ctx.desktopPages.fullscreenBond('gaming','game'));
// The real Overview renderer nests and names the bond rather than counting it
// as another ordinary numbered page or duplicating the game on the parent.
vm.runInContext(slice('function renderDesktopColumnMap(','function migrateDesktopColumns('),ctx);
ctx.renderDesktopColumnMap();const markup=node('#desktopColumnMap').innerHTML;
assert(markup.includes('is-fullscreen-page'));assert(markup.includes('data-fullscreen-page="game"'));assert(markup.includes('below Desktop 1 · Display 1'));
assert.equal((markup.match(/<i>game<\/i>/g)||[]).length,1);
// Launches from a fullscreen surface go back to its parent. Returning to the
// game follows its existing bond; an action on the other monitor cannot steal it.
let originalCalls=[];ctx.openApp=name=>originalCalls.push(name);ctx.saveIndependentSessions=()=>{};ctx.refreshDownloadUi=()=>{};
vm.runInContext(slice('const originalOpenApp = openApp;','function removeWindowFromSavedProjects('),ctx);
ctx.openApp('game');assert.equal(ctx.desktopPages.selectedFullscreen('gaming').name,'game');
ctx.openApp('browser');assert.equal(ctx.desktopPages.selectedFullscreen('gaming'),null);assert(ctx.desktopPages.fullscreenBond('gaming','game'));
slot=2;ctx.openApp('game');assert.equal(originalCalls.at(-1),'browser','Selecting the game from Display 2 does not move it there');
slot=1;ctx.toggleAppFullscreen('game');assert(!ctx.desktopPages.fullscreenBond('gaming','game'));
assert.deepEqual(copy(ctx.tileSessions['gaming:desktop:0:1'].root),origin,'The original split is restored');
assert.equal(ctx.desktopPages.entries('gaming').filter(e=>e.fullscreen).length,0);
// A later parent edit must not be overwritten on return.
ctx.toggleAppFullscreen('game');ctx.changeDesktopPage(0,false);ctx.tileSessions['gaming:desktop:0:1'].root=T.leaf('terminal');
ctx.changeDesktopPage(0,false,'workspace','game');ctx.toggleAppFullscreen('game');
assert.equal(ctx.tileSessions['gaming:desktop:0:1'].root.name,'terminal','Returning cannot undo later parent arrangement');
// Restore a floating source and clean up when closing from another desktop.
ctx.tileSessions['gaming:desktop:0:1'].floating.game={left:20,top:30,width:700,height:500};
ctx.toggleAppFullscreen('game');ctx.toggleAppFullscreen('game');assert.equal(ctx.tileSessions['gaming:desktop:0:1'].floating.game.left,20);
ctx.toggleAppFullscreen('game');ctx.changeDesktopPage(1,false);ctx.closeApp('game');
assert.equal(ctx.appState.game,'closed');assert(!ctx.desktopPages.fullscreenBond('gaming','game'));assert.equal(ctx.desktopPages.current('gaming'),1);
ctx.appState.game='open';ctx.desktopPages.go('gaming',0);ctx.toggleAppFullscreen('game');ctx.minimizeApp('game');
assert.equal(ctx.appState.game,'minimized','An explicit Park still works');assert(!ctx.desktopPages.fullscreenBond('gaming','game'));
// A saved owner on Display 2 still presents the fullscreen session after that
// monitor disconnects, and the owning key survives reload and display sync.
ctx.appState.game='open';slot=2;ctx.createBondedFullscreen('game',2);count=1;slot=1;
assert.equal(ctx.tileContextKey(),'gaming:desktop:0:fullscreen:game:2');assert(ctx.isLocalApp('game'));assert.equal(ctx.tileSession().fullscreen.name,'game');
ctx.desktopPages.load(ctx.desktopPages.snapshot());assert(ctx.desktopPages.selectedFullscreen('gaming'));ctx.leaveBondedFullscreen('game');
// Adopting older shipped fullscreen state restores only its automatically
// parked peers and preserves a user who was already on another ordinary page.
count=2;slot=1;ctx.appState.game='open';ctx.appState.browser='minimized';ctx.desktopPages.go('gaming',1);
ctx.tileSessions['gaming:desktop:0:1']={root:T.leaf('game'),parked:{browser:{fullscreen:'game'}},floating:{},fullscreen:{name:'game',root:origin,parked:['browser']}};
ctx.ensureBondedFullscreenDesktops();assert.equal(ctx.desktopPages.current('gaming'),1);assert.equal(ctx.desktopPages.selectedFullscreen('gaming'),null);
assert(ctx.desktopPages.fullscreenBond('gaming','game'));assert.equal(ctx.appState.browser,'open');
const migrated=JSON.stringify(ctx.desktopPages.snapshot());ctx.ensureBondedFullscreenDesktops();assert.equal(JSON.stringify(ctx.desktopPages.snapshot()),migrated);
console.log('Bonded fullscreen passed: stable page order, both scroll directions, held secondary display, Manual Area exclusion, reload/sync, Overview identity, parent launches, no focus-loss parking, original splits/floats, later edits, explicit Park/close, project ownership and monitor disconnect.');
