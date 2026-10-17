const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Pages=require('../dist/desktop-pages.js'),T=require('../dist/spatial-tiling.js');
const shell=fs.readFileSync('dist/desktop-shell.js','utf8'),adapter=fs.readFileSync('dist/desktop-map-desktop.js','utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
function extract(text,start,end){return text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));}
// Transfer the real off-screen identity, preserving its monitor and floating
// rectangle without selecting either the source or destination desktop.
const pages=Pages.create();pages.assign('work','a',1,'site');pages.assign('work','peer',1,'site');
const prefix=pages.context('work',1,'site'),assignments={apps:{a:2,peer:2}};
const ctx={desktopPages:pages,activeWorkspace:'work',appInfo:{a:{label:'Notes'},peer:{label:'Files'}},appState:{a:'open',peer:'minimized'},activeDisplayRoster:()=>[{},{}],displayAssignmentsFor:()=>assignments,openProjectNames:()=>['site'],windowMembership:{work:{a:'site',peer:'site'}},tileSessions:{[prefix+'2']:{root:T.leaf('a'),floating:{a:{left:15,top:25,width:500,height:350}},parked:{peer:{fullscreen:'a'}},fullscreen:{name:'a',root:{kind:'split',axis:'x',ratio:.5,a:T.leaf('a'),b:T.leaf('peer')},parked:['peer'],transferred:{}}}},tileEngine:T,appMaximizedState:{a:true},autoTiledWindows:new Set(['a']),frontApp:null,cloneDesktopState:copy,frameFor:()=>({classList:{remove(){}},dataset:{}}),syncApps(){},renderTileLayout(){},saveDesktopPages(){},saveTileSessions(){},saveIndependentSessions(){},persistProjectState(){},queueDesktopStateBroadcast(){},showToast(){},desktopColumnLabel:x=>x,removeWindowFromSavedProjects(){},persistDisplayAssignments(){},changeDesktopPage(){throw Error('Drag must not navigate');},isLocalApp(){return false;},syncMaximizeButton(){},leaveBondedFullscreen(){throw Error('No legacy temporary desktop');}};
vm.createContext(ctx);
vm.runInContext(extract(shell,'function releaseBorrowedApp(', 'function parkFullscreenPeers('),ctx);
vm.runInContext(extract(shell,'function leaveAppFullscreen(', '// Subtract opaque foreground windows'),ctx);
vm.runInContext(extract(shell,'function detachDraggedDesktopWindow(', '// A floating window is reparented'),ctx);
vm.runInContext(extract(shell,'function moveWindowToColumn(', 'function moveWindowToDesktop('),ctx);
const content={text:'Live edited draft'};ctx.content=content;
assert(ctx.moveWindowToColumn('a','site',false,2));
assert.equal(pages.pageOf('work','a'),2);assert.equal(pages.column('work'),'workspace');assert.equal(pages.current('work'),0);assert.equal(assignments.apps.a,2);
assert.equal(ctx.appState.peer,'open','Moving off-screen fullscreen restores peers in its own scene');assert.equal(ctx.tileSessions[prefix+'2'].fullscreen,null);assert.equal(ctx.tileSessions[prefix+'2'].root.name,'peer');
assert.deepEqual(copy(ctx.tileSessions[pages.context('work',2,'site')+'2'].floating.a),{left:15,top:25,width:500,height:350});assert.equal(ctx.appMaximizedState.a,false);assert(!ctx.autoTiledWindows.has('a'));assert.equal(ctx.content,content);
assert(ctx.moveWindowToColumn('a','workspace',false,1));assert.equal(ctx.windowMembership.work.a,null);assert.equal(pages.pageOf('work','a'),1);assert.equal(assignments.apps.a,2);assert(!ctx.moveWindowToColumn('a','workspace',false,1));assert(!ctx.moveWindowToColumn('a','closed-project',false,0));
// Real pointer handlers: click threshold, source rejection, drop, cancellation,
// unchanged context, and the layout-guarded map-local Undo control.
const classes=()=>({add(){},remove(){}}),source={classList:classes()},button={dataset:{mapWindow:'a'},closest:()=>source},target={dataset:{mapDropColumn:'site',mapDropPage:'2'},classList:classes(),closest(){return this;}};
let hit=target,capture=false,moves=[],restores=0,stamp=0,raf=0;
const statusNode={},undo={hidden:true},panel={querySelector:s=>s==='[data-map-undo]'?undo:statusNode,classList:classes(),setPointerCapture(){capture=true;},hasPointerCapture:()=>capture,releasePointerCapture(){capture=false;},append(){},addEventListener(){}};
const d={drag:null,scrollFrame:0,suppressClickUntil:0,undoMove:null,activeWorkspace:'work',owner:'work',columns:[{id:'workspace',pages:[{page:0}]},{id:'site',pages:[{page:2}]}],panel,world:{contains:()=>true,getBoundingClientRect:()=>({left:0,right:700,top:100,bottom:700}),scrollLeft:0,scrollTop:0},document:{elementFromPoint:()=>hit,createElement:()=>({className:'',setAttribute(){},style:{},remove(){}})},window:{addEventListener(){}},desktopPages:{columnOf:()=> 'workspace',pageOf:()=>0},appState:{a:'open'},appInfo:{a:{label:'Notes'}},displayAssignmentsFor:()=>({apps:{a:2}}),activeDisplayRoster:()=>[{},{}],openProjectNames:()=>['site'],desktopColumnLabel:x=>x,appArt:()=>'',html:x=>x,performance:{now:()=>100},requestAnimationFrame:()=>++raf,cancelAnimationFrame(){},render(){},focusPage(){},capturePlacement:()=>({stamp}),placementFingerprint:JSON.stringify,restorePlacement(){restores++;return true;},moveWindowToColumn(...args){moves.push(args);stamp++;return true;}};
vm.createContext(d);vm.runInContext(extract(adapter,'  function status(', '  function blocked('),d);
const event=(x=100,y=200)=>({target:{closest:()=>button},button:0,pointerId:7,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
d.beginDrag(event());d.moveDrag(event(102));assert(!d.drag.active);d.finishDrag(event(102));assert.equal(moves.length,0,'Click still opens normally');assert.equal(d.suppressClickUntil,0);
d.beginDrag(event());d.moveDrag(event(130));assert(d.drag.active);assert(capture);assert.equal(d.drag.target.column,'site');d.finishDrag(event(130));assert.deepEqual(moves,[['a','site',false,2]]);assert.equal(d.drag,null);assert(!capture);assert(d.suppressClickUntil>100);assert.equal(undo.hidden,false);d.undoLastMove();assert.equal(restores,1);assert.equal(undo.hidden,true);
d.beginDrag(event());d.moveDrag(event(130));d.cancelDrag();assert.equal(moves.length,1);assert.equal(d.drag,null);
hit=null;d.beginDrag(event());d.moveDrag(event(130));d.finishDrag(event(130));assert.equal(moves.length,1,'Outside drop never moves');
hit=target;d.beginDrag(event());d.moveDrag(event(130));d.activeWorkspace='school';d.finishDrag(event(130));assert.equal(moves.length,1,'A workspace change cancels ownership mutation');d.activeWorkspace='work';
d.beginDrag(event());d.moveDrag(event(130));d.finishDrag(event(130));stamp++;d.undoLastMove();assert.equal(restores,1,'Stale Undo must not overwrite newer layout');
console.log('Desktop map drag passed: live off-screen fullscreen transfer, source peer restore, exact destination, monitor/floating preservation, same-scene rejection, pointer threshold/capture/drop/cancel, workspace guard and safe map Undo.');
