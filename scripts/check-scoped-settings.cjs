const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {describe}=require('../dist/scoped-settings.js');
const source=fs.readFileSync(require.resolve('../dist/scoped-settings.js'),'utf8');
function segment(first,last){const start=source.indexOf(first),end=source.indexOf(last,start+first.length);assert(start>=0&&end>start);return source.slice(start,end);}
assert.deepEqual(describe({workspace:'Work',project:{name:'Website Launch'},page:1,display:2}),{desktop:'Desktop 2 · Website Launch · Work · Display 2',project:'Website Launch Project',workspace:'Work Workspace',system:'All Workspaces'});
assert.equal(describe({workspace:'Gaming',temporary:true}).desktop,'Temporary desktop · Gaming · Display 1');
assert.equal(describe({workspace:'General'}).project,null,'Ordinary Workspace context does not use the last open Project');

// Execute the real Settings renderer with read-only context values and assert scope/order.
const nodes=new Map(),$=selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',innerHTML:'',setAttribute(){}});return nodes.get(selector);};
let ctx={workspace:'Work',workspaceId:'work',owner:'film',project:{id:'film',name:'Film <cut>',root:'/mnt/film',downloadToProject:false},page:1,display:1};
const sandbox={root:{},describe,context:()=>ctx,escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),$,dialog:{},projectEditorState:{view:'settings'},activeWorkspace:'work',workspaceProfiles:{work:{home:'/home/work'}},projectSpaces:{film:ctx.project},areaPriority:['apps','systems'],areaLabel:name=>name,SpatialHomeFolders:{downloadDestination:()=>'/home/work/Downloads'},prepareMaterialSurfaces(){},prepareControlSemantics(){},refresh(){}};
vm.createContext(sandbox);vm.runInContext(segment('  const section=','  function refresh(){'),sandbox);
sandbox.renderSettings();let html=$('#projectEditorBody').innerHTML;
assert(html.indexOf('data-setting-scope="desktop"')<html.indexOf('data-setting-scope="project"'));
assert(html.indexOf('data-setting-scope="project"')<html.indexOf('data-setting-scope="workspace"'));
assert(html.indexOf('data-setting-scope="workspace"')<html.indexOf('data-setting-scope="system"'));
assert.match(html,/Film &lt;cut&gt; Project/);assert(!html.includes('Film <cut>'));
assert.match(html,/data-project-download-toggle/);assert.match(html,/class="project-download-destination"/,'Original project download listener has its destination target');
assert.match(html,/apply to all desktops and Projects in Work/);assert.match(html,/do not change native hardware/);
assert.match(html,/data-settings-desktop-markers/);
assert(html.indexOf('data-setting-scope="system"')<html.indexOf('data-settings-desktop-markers'),'Desktop-indicator appearance is explicitly system-wide');
assert.match(html,/<option value="lines">Lines only<\/option><option value="icons">Lines and app icons<\/option>/);
ctx={workspace:'Work',workspaceId:'work',owner:'workspace',project:null,page:0,display:1};sandbox.renderSettings();html=$('#projectEditorBody').innerHTML;
assert(!html.includes('data-setting-scope="project"'));assert.equal(sandbox.projectEditorState.projectName,null,'Last active Project cannot become the target on an ordinary desktop');
ctx.temporary=true;sandbox.renderSettings();assert.match($('#projectEditorBody').innerHTML,/Return to fullscreen app/);
sandbox.root.SpatialGuide=sandbox.SpatialGuide={model:{active:()=>true,allows:()=>false}};sandbox.renderSettings();assert(!$('#projectEditorBody').innerHTML.includes('data-settings-area="'),'Early Guide settings cannot reveal later Area controls');

// A bonded fullscreen desktop applies only on its owning display, not the held peer.
let slot=1;
const displayContext={activeWorkspace:'gaming',workspaceProfiles:{gaming:{label:'Gaming'}},projectSpaces:{},desktopPages:{column:()=> 'workspace',current:()=>0,selectedFullscreen:()=>({display:1})},localDisplaySlot:()=>slot,activeDisplayRoster:()=>[{},{}]};
vm.createContext(displayContext);vm.runInContext(segment('  function context(){','  const section='),displayContext);
assert.equal(displayContext.context().temporary,true);slot=2;assert.equal(displayContext.context().temporary,false);

// Only the upper modal handles Tab when it is layered above Overview.
const shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const trapStart=shell.indexOf('  const packageDialog = $("#packageDialog");',shell.indexOf('document.addEventListener("keydown", event => {'));
const trapEnd=shell.indexOf('\n  if (projectEditorDialog.classList.contains("is-open") || packageDialog',trapStart);
assert(trapStart>=0&&trapEnd>trapStart);
const openSurfaces=new Set(['#projectEditorDialog','#universalSearch']),trapped=[];
const trapContext={$:selector=>({id:selector,classList:{contains:name=>name==='is-open'&&openSurfaces.has(selector)}}),trapDialogFocus:(node)=>{trapped.push(node.id);return false;}};
vm.createContext(trapContext);vm.runInContext('function routeTab(event){'+shell.slice(trapStart,trapEnd)+'}',trapContext);
trapContext.routeTab({key:'Tab'});assert.deepEqual(trapped,['#projectEditorDialog'],'Interior Tab cannot fall through into inert Overview');

// Run shipped action handlers: settings reuse existing mutations and preserve navigation.
const handlers={};let hidden=false,visibility=[],globalToggle,themeValue,markerValue,markerRenders=0,reset=0,closed=0,overview,focused=false,refreshed=0;
const node={hidden:false,dataset:{areaState:'expanded'}};
const actionContext={dialog:{addEventListener:(name,handler)=>handlers[name]=handler},projectEditorState:{view:'settings'},areaFor:()=>({...node,hidden}),showArea:(name,announce)=>{hidden=false;visibility.push(['show',name,announce]);},hideArea:name=>{hidden=true;visibility.push(['hide',name]);},refresh:()=>refreshed++,$$:()=>[{textContent:'Wi-Fi',click:()=>globalToggle=['Wi-Fi',false]}],queueDesktopStateBroadcast(){},closeProjectEditor:()=>closed++,setUniversalSearchOpen:value=>overview=value,$:selector=>selector==='#resetAreas'?{click:()=>reset++}:{focus:()=>focused=true},renderProjectEditor(){},SpatialDesktopTheme:{setPreference:value=>themeValue=value}};
actionContext.root={SpatialDesktopMarkers:{setPreference:value=>markerValue=value}};
actionContext.renderDesktopPageRail=()=>markerRenders++;
let markerLayouts=0;actionContext.windowViewportLockReady=true;actionContext.scheduleWindowTiling=()=>markerLayouts++;
vm.createContext(actionContext);vm.runInContext(segment("  dialog.addEventListener('click',event=>{","  const areaNote="),actionContext);
const click=(selector,data)=>handlers.click({target:{closest:key=>key===selector?{dataset:data,getAttribute:()=> 'true'}:null}});
click('[data-settings-area]',{settingsArea:'apps'});assert.equal(hidden,true);click('[data-settings-area]',{settingsArea:'apps'});assert.equal(hidden,false);assert.deepEqual(visibility,[['hide','apps'],['show','apps',false]]);
click('[data-settings-toggle]',{settingsToggle:'Wi-Fi'});assert.deepEqual(globalToggle,['Wi-Fi',false]);
handlers.change({target:{matches:selector=>selector==='[data-settings-theme]',value:'oled'}});assert.equal(themeValue,'oled');
handlers.change({target:{matches:selector=>selector==='[data-settings-desktop-markers]',value:'lines'}});assert.equal(markerValue,'lines');assert.equal(themeValue,'oled','Changing markers does not change the color theme');
actionContext.root.SpatialDesktopMarkers.onChange();assert.equal(markerRenders,1,'Local and remote preference changes refresh the real desktop markers');
assert.equal(markerLayouts,1,'Local and remote marker changes refit windows to the new canvas width');
actionContext.windowViewportLockReady=false;actionContext.root.SpatialDesktopMarkers.onChange();assert.equal(markerLayouts,1,'Early marker changes do not fit windows before layout is ready');
click('[data-setting-action]',{settingAction:'reset-areas'});assert.equal(reset,1);
click('[data-setting-action]',{settingAction:'desktop'});assert.equal(closed,1);assert.equal(overview,false);assert(focused);
assert(refreshed>=5);
console.log('Scoped Settings passed: named actual ownership, ordinary/Project/temporary contexts, literal names, existing download routing, Area actions, shared theme/toggles and desktop return.');
