const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Apps=require('../dist/app-tools.js');

// Run the shipped window-model factory: Settings must never fall through into
// Music Player initialization or read unrelated app controls.
const windows=fs.readFileSync(require.resolve('../dist/app-windows.js'),'utf8');
const modelContext=vm.createContext({activeWorkspace:'work',appInfo:{settings:{label:'Settings',singleInstance:true}},desktopPreset:'empty',SpatialAppTools:Apps,frameFor:()=>({dataset:{}}),$:()=>{throw Error('Settings read another app’s content');},$$:()=>{throw Error('Settings initialized another app’s content');}});
vm.runInContext(windows.slice(0,windows.indexOf('function appActionButton('))+'\nappWindowStore=SpatialAppTools.create();',modelContext);
const settingsModel=modelContext.appWindowModel('settings');
assert.equal(settingsModel.kind,'settings');
assert.equal(settingsModel.tracks,undefined,'Settings cannot acquire a Music Player model');

// Displays embeds into a category page rather than creating a second window.
// Mounting again must keep exactly one delegated listener and each host owns
// its own chosen monitor.
function displayHarness(){
  const writes=[],routes=[],listeners={};
  const state={workspace:'Work',mainSlot:1,localSlot:1,displays:[{slot:1,label:'Display 1',role:'main',width:2560,height:1440},{slot:2,label:'Display 2',role:'extended',width:1920,height:1080}]};
  function host(){
    const nodes=new Map(),events={};
    const value={isConnected:true,hidden:false,events,nodes,classList:{add(){}},contains:()=>false,checkVisibility(){return !this.hidden;},closest(){return this.hidden?{}:null;},addEventListener(type,fn){(events[type]||=[]).push(fn);},querySelector(selector){
      if(!nodes.has(selector))nodes.set(selector,{textContent:'',htmlWrites:0,hidden:false,focus(){},replaceChildren(node){this.textContent=node.textContent;},set innerHTML(value){this.html=value;this.htmlWrites++;},get innerHTML(){return this.html||'';}});
      return nodes.get(selector);
    }};return value;
  }
  const context=vm.createContext({document:{activeElement:null,createTextNode:text=>({textContent:text})},CSS:{escape:String},addEventListener(type,fn){listeners[type]=fn;},SpatialSettings:{open:(...args)=>routes.push(args)},SpatialDisplayRoleBridge:{state:()=>state,setRole:async(slot,role)=>{writes.push([slot,role]);state.displays.find(display=>display.slot===slot).role=role;return true;},openCompanion(){}}});
  vm.runInContext(fs.readFileSync(require.resolve('../dist/display-settings.js'),'utf8'),context);
  const change=(host,role,slot=2)=>host.events.change[0]({target:{closest:selector=>selector==='[data-display-role]'?{value:role,dataset:{displaySlot:String(slot)}}:null}});
  return {context,state,writes,routes,host,change,api:context.SpatialDisplaySettings};
}
async function displayChecks(){
  const h=displayHarness(),first=h.host(),second=h.host();
  h.api.mount(first,2);h.api.mount(first,2);h.api.mount(second,1);
  assert.equal(first.events.click.length,1);assert.equal(first.events.change.length,1,'Repeated refresh never doubles role actions');
  let blocked=false;first.events.keydown[0]({key:'f',ctrlKey:true,stopPropagation(){blocked=true;}});
  assert.equal(blocked,false,'Find can reach the enclosing Settings search from Displays');
  first.events.keydown[0]({key:'ArrowRight',stopPropagation(){blocked=true;}});
  assert.equal(blocked,true,'Radio arrows stay inside the embedded display editor');
  assert.equal(first.querySelector('legend').textContent,'Use Display 2 as');assert.equal(second.querySelector('legend').textContent,'Use Display 1 as');
  assert.match(first.querySelector('.display-role-options').innerHTML,/aria-label="Assistant on Display 2"/);
  assert.match(second.querySelector('.display-role-options').innerHTML,/value="side"[^>]* disabled/,'The Main workspace keeps one user work display');
  h.api.open(2);assert.equal(h.routes[0][0],'displays');assert.equal(h.routes[0][1].slot,2,'Display context-menu links select their source monitor');
  await h.change(first,'side');assert.deepEqual(h.writes,[[2,'side']]);
  assert.equal(second.querySelector('legend').textContent,'Use Display 1 as','An editor cannot take another host’s monitor selection');
  const options=first.querySelector('.display-role-options'),renders=options.htmlWrites;
  h.state.workspace='Gaming';h.state.windowActivity='unrelated';h.api.refresh();
  assert.equal(options.htmlWrites,renders,'Unrelated bridge activity does not replace focused monitor controls');
  first.events.click[0]({target:{closest:selector=>selector==='[data-display-select]'?{dataset:{displaySelect:'1'}}:null}});
  await h.change(first,'assistant',2);assert.equal(h.writes.length,1,'A control rendered for another selected monitor cannot change this one');
  h.api.mount(first,2);first.hidden=true;await h.change(first,'assistant');
  assert.equal(h.writes.length,1,'A hidden Displays page cannot apply a stale role action');
  first.isConnected=false;h.api.refresh();
}

// Small DOM fixture executes the shipped renderer and its delegated handlers.
// It parses the generated elements so tests click real controls rather than
// reproducing navigation logic in test helpers.
function settingsHarness(saved={},options={}){
  let document;
  const storage={...saved};
  const decode=value=>String(value??'').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  function node(tag='div',attributes={}){
    const classes=new Set((attributes.class||'').split(/\s+/).filter(Boolean));
    const out={tag,isConnected:true,attributes:{...attributes},children:[],dataset:{},events:{},value:attributes.value||'',checked:'checked' in attributes,disabled:'disabled' in attributes,hidden:'hidden' in attributes,textContent:'',scrollTop:0,
      classList:{contains:name=>classes.has(name),add:name=>classes.add(name),remove:name=>classes.delete(name),toggle(name,active){if(active===undefined)active=!classes.has(name);if(active)classes.add(name);else classes.delete(name);}},
      getAttribute:name=>out.attributes[name]??null,setAttribute(name,value){out.attributes[name]=String(value);},removeAttribute(name){delete out.attributes[name];},
      addEventListener(type,callback){(out.events[type]||=[]).push(callback);},
      matches(selector){if(selector.startsWith('.'))return classes.has(selector.slice(1));if(selector.startsWith('#'))return out.attributes.id===selector.slice(1);const match=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);if(match)return match[1] in out.attributes&&(match[2]===undefined||out.attributes[match[1]]===match[2]);return tag===selector;},
      closest(selector){for(let item=out;item;item=item.parentElement)if(item.matches(selector))return item;return null;},
      contains(target){for(let item=target;item;item=item.parentElement)if(item===out)return true;return false;},
      querySelectorAll(selector){if(selector.includes(' ')){const [ancestor,...rest]=selector.split(/\s+/);return out.querySelectorAll(ancestor).flatMap(child=>child.querySelectorAll(rest.join(' ')));}const result=[];for(const child of out.children){if(child.matches(selector))result.push(child);result.push(...child.querySelectorAll(selector));}return result;},querySelector(selector){return out.querySelectorAll(selector)[0]||null;},
      focus(){document.activeElement=out;},scrollIntoView(){out.scrolled=true;},prepend(child){child.parentElement=out;out.children.unshift(child);},click(){for(const callback of document.events.click||[])callback({target:out});},
      set innerHTML(html){out.html=String(html);out.children=[];const stack=[out];for(const match of out.html.matchAll(/<\/?([a-z][\w-]*)([^>]*)>/gi)){
        const name=match[1].toLowerCase();if(match[0].startsWith('</')){const index=stack.map(item=>item.tag).lastIndexOf(name);if(index>0)stack.length=index;continue;}
        const attrs={};for(const item of match[2].matchAll(/([\w:-]+)(?:="([^"]*)"|'([^']*)'|=([^\s>]+))?/g))attrs[item[1]]=decode(item[2]??item[3]??item[4]??'');
        const child=node(name,attrs);child.parentElement=stack.at(-1);stack.at(-1).children.push(child);if(!['input','use','br','hr','img','meta','link'].includes(name)&&!match[0].endsWith('/>'))stack.push(child);
      }},get innerHTML(){return out.html||'';}
    };
    for(const [name,value] of Object.entries(attributes))if(name.startsWith('data-'))out.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;
    return out;
  }
  const host=node(),external=new Map(),sourceToggles=['Wi-Fi','Bluetooth','Sound','Focus'].map(label=>{const source=node('button');source.textContent=label;source.title=label;return source;}),calls={launched:[],overview:[],theme:[],markers:[],area:[],system:[],downloads:[],manage:[],folders:[],mounts:[],broadcasts:0,reset:0,markerRenders:0,tiling:0,persist:0};
  document={activeElement:null,events:{},querySelector(selector){if(selector==='.settings-app-content')return host;if(!external.has(selector))external.set(selector,node());return external.get(selector);},addEventListener(type,callback){(this.events[type]||=[]).push(callback);},createElement:tag=>node(tag)};
  const profiles={work:{label:'Work',home:'/home/work'},gaming:{label:'Gaming',home:'/home/gaming'}},projects={site:{name:'Website <draft>',root:'/projects/site',downloadToProject:false},film:{name:'Film',root:'/projects/film',downloadToProject:false}},areas={work:{apps:{hidden:false,dataset:{areaState:'expanded'}},systems:{hidden:true,dataset:{areaState:'rail'}}},gaming:{apps:{hidden:false,dataset:{areaState:'rail'}},systems:{hidden:false,dataset:{areaState:'expanded'}}}};
  const context=vm.createContext({document,desktopStorage:{getItem:key=>storage[key]??null,setItem:(key,value)=>storage[key]=value},CSS:{escape:String},activeWorkspace:'work',activeProjectName:'site',owner:'site',page:1,slot:1,bond:null,workspaceProfiles:profiles,projectSpaces:projects,areaPriority:['apps','systems'],projectEditorState:{view:'manage',projectName:'film'},windowViewportLockReady:true,
    desktopPages:{column:()=>context.owner,current:()=>context.page,selectedFullscreen:()=>context.bond},localDisplaySlot:()=>context.slot,activeDisplayRoster:()=>[{},{}],
    escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),prepareMaterialSurfaces(){},prepareControlSemantics(){},
    areaLabel:name=>name==='apps'?'Apps':'System',areaFor:name=>areas[context.activeWorkspace][name],layoutStateLabel:value=>value==='rail'?'Compact':'Expanded',
    setAreaState(name,value){calls.area.push([context.activeWorkspace,name,value]);const area=areas[context.activeWorkspace][name];area.hidden=value==='hidden';if(value!=='hidden')area.dataset.areaState=value;},
    setSystemToggle(label,active){calls.system.push([label,active]);sourceToggles.find(button=>button.textContent===label).classList.toggle('is-active',active);},
    SpatialDesktopTheme:{preference:'graphite',setPreference(value){this.preference=value;calls.theme.push(value);}},SpatialDesktopMarkers:{preference:'icons',setPreference(value){this.preference=value;calls.markers.push(value);this.onChange?.();}},
    SpatialHomeFolders:{downloadDestination:(profiles,projects,workspace,project)=>projects[project]?.downloadToProject?projects[project].root+'/Downloads':profiles[workspace].home+'/Downloads'},
    SpatialDisplaySettings:options.displaysReady===false?undefined:{mount(host,slot){calls.mounts.push({host,slot});return host;},refresh(){}},setUniversalSearchOpen:value=>calls.overview.push(value),launchAppHere:id=>calls.launched.push(id),
    ensureProjectDownloads:id=>calls.downloads.push(id),persistProjectState:()=>calls.persist++,refreshDownloadUi(){},renderProjectSpace(){},queueDesktopStateBroadcast:()=>calls.broadcasts++,
    openProjectEditor:(...args)=>calls.manage.push(args),renderProjectEditor(){},updateDesktopPageUi(){},renderDesktopPageRail:()=>calls.markerRenders++,scheduleWindowTiling:()=>calls.tiling++,
    openFileLocation:path=>calls.folders.push(path),addEventListener(){},queueMicrotask:callback=>callback(),
    $:selector=>{if(!external.has(selector))external.set(selector,node());return external.get(selector);},$$:selector=>selector==='.quick-toggle[data-toggle]'?sourceToggles:[]
  });
  external.set('#resetAreas',{click:()=>calls.reset++});external.set('#themeToggle',{title:'Color theme'});
  vm.runInContext(fs.readFileSync(require.resolve('../dist/scoped-settings.js'),'utf8'),context);
  function emit(type,target,extra={}){assert(target,'Expected a rendered Settings control');const event={target,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra};for(const handler of host.events[type]||[])handler(event);return event;}
  return {context,host,document,storage,calls,profiles,projects,areas,api:context.SpatialSettings,page:()=>host.querySelector('.settings-app-page'),find:selector=>host.querySelector(selector),emit,click:selector=>emit('click',host.querySelector(selector)),change(selector,value){const target=host.querySelector(selector);target.value=value;return emit('change',target);},query(value){const target=host.querySelector('[data-settings-search]');target.value=value;emit('input',target);}};
}

const Settings=require('../dist/scoped-settings.js');
assert.equal(Settings.search('').length,0);
assert(Settings.search('  SECOND monitor  ').some(result=>result.category==='displays'),'Search uses synonyms and ignores case/whitespace');
assert(Settings.search('project downloads').some(result=>result.id==='project-downloads'));
assert.equal(Settings.search('theme bluetooth').length,0,'All query terms must describe the same setting');
for(const result of Settings.search('volume'))assert(Settings.catalog.includes(result)&&Settings.categories.some(category=>category.id===result.category),'Search results route to real categories');

function settingsChecks(){
  const h=settingsHarness();
  assert.equal(h.api.category(),'home');
  h.api.open('appearance');assert.equal(h.calls.launched.at(-1),'settings');assert.equal(h.calls.overview.at(-1),false);
  h.change('[data-settings-theme]','light');assert.equal(h.context.SpatialDesktopTheme.preference,'light');
  h.change('[data-settings-desktop-markers]','lines');assert.equal(h.context.SpatialDesktopMarkers.preference,'lines');assert.deepEqual(h.calls.theme,['light'],'Marker changes do not change the color theme');
  assert.equal(h.calls.markerRenders,1);assert.equal(h.calls.tiling,1,'Marker widths refit the actual window canvas');
  h.context.windowViewportLockReady=false;h.context.SpatialDesktopMarkers.onChange();assert.equal(h.calls.tiling,1,'Early preference changes never arrange uninitialized windows');
  h.api.navigate('areas');h.change('[data-settings-area="systems"]','expanded');assert.deepEqual(h.calls.area.at(-1),['work','systems','expanded']);assert.equal(h.areas.work.systems.hidden,false);
  h.click('[data-setting-action="reset-areas"]');assert.equal(h.calls.reset,1);
  h.api.navigate('connections');h.click('[data-settings-toggle="Wi-Fi"]');assert.deepEqual(h.calls.system.at(-1),['Wi-Fi',true]);assert.equal(h.find('[data-settings-toggle="Wi-Fi"]').getAttribute('aria-pressed'),'true');
  h.click('[data-settings-toggle="Wi-Fi"]');assert.deepEqual(h.calls.system.at(-1),['Wi-Fi',false]);
  h.api.navigate('home');h.api.navigate('appearance');
  assert.equal(h.find('[data-settings-category="home"]').getAttribute('aria-pressed'),'false','The previous category releases its shared ABS pressed state');
  assert.equal(h.find('[data-settings-category="appearance"]').getAttribute('aria-pressed'),'true','The selected category owns the shared ABS pressed state');
  h.api.navigate('displays',{slot:2});assert.equal(h.calls.mounts.at(-1).slot,2,'Displays opens inside the Settings page on the requested monitor');
  h.click('[data-settings-back]');assert.equal(h.api.category(),'appearance','Back restores the previous category');
  h.query('second monitor');assert.match(h.page().innerHTML,/Open second demo display/);h.click('[data-settings-result="second-display"]');
  assert.equal(h.api.category(),'displays','A search result opens its actual category');
  h.api.navigate('appearance');h.query('nothing-can-match-this');assert.match(h.page().innerHTML,/No settings found/);h.click('[data-settings-back]');assert.equal(h.api.category(),'appearance');assert.equal(h.find('[data-settings-search]').value,'','Back first clears the active search');
  const shortcut=h.emit('keydown',h.page(),{key:'f',ctrlKey:true});assert(shortcut.prevented&&shortcut.stopped);assert.equal(h.document.activeElement,h.find('[data-settings-search]'));
  h.query('theme');const escape=h.emit('keydown',h.find('[data-settings-search]'),{key:'Escape'});assert(escape.prevented&&escape.stopped);assert.equal(h.find('[data-settings-search]').value,'');

  h.api.navigate('project');assert.match(h.page().innerHTML,/Website &lt;draft&gt; Project/);assert(!h.page().innerHTML.includes('Website <draft>'),'Project names are escaped when rendered');
  let checkbox=h.find('[data-project-download-toggle]');checkbox.checked=true;h.emit('change',checkbox);assert.equal(h.projects.site.downloadToProject,true);assert.equal(h.projects.film.downloadToProject,false,'The unrelated legacy Project editor is never the target');assert.deepEqual(h.calls.downloads,['site']);
  assert.equal(h.find('[data-settings-download-destination]').textContent,'/projects/site/Downloads');
  h.click('[data-setting-action="project"]');assert.equal(h.calls.manage.at(-1)[0],'manage');assert.equal(h.calls.manage.at(-1)[1].projectName,'site');
  h.context.owner='workspace';h.api.refresh();assert.match(h.page().innerHTML,/No Project open/);assert.equal(h.find('[data-project-download-toggle]'),null);
  checkbox.checked=false;h.emit('change',checkbox);assert.equal(h.projects.site.downloadToProject,true,'An ordinary desktop cannot mutate the last Project from a stale control');
  h.context.owner='site';h.api.refresh();checkbox=h.find('[data-project-download-toggle]');checkbox.checked=false;h.context.owner='film';h.emit('change',checkbox);assert.equal(h.projects.site.downloadToProject,true);assert.equal(h.projects.film.downloadToProject,false,'A stale Project control cannot apply to a newly selected Project');
  h.api.refresh();assert.match(h.page().innerHTML,/Film Project/);

  h.api.navigate('workspace');h.context.activeWorkspace='gaming';h.context.owner='workspace';h.api.refresh();assert.equal(h.api.category(),'home','A new Workspace starts with its own navigation');assert.match(h.page().innerHTML,/Gaming Workspace/);h.api.navigate('workspace');h.click('[data-setting-action="home-folder"]');assert.equal(h.calls.folders.at(-1),'/home/gaming');
  h.api.navigate('areas');h.change('[data-settings-area="apps"]','hidden');assert.deepEqual(h.calls.area.at(-1),['gaming','apps','hidden']);assert.equal(h.areas.work.apps.hidden,false,'Area actions target only the current Workspace');
  h.context.bond={display:1};h.context.slot=1;h.api.navigate('windows');assert.match(h.page().innerHTML,/Temporary desktop/);h.context.slot=2;h.api.refresh();assert(!h.page().innerHTML.includes('Temporary desktop'),'The held companion display is not the fullscreen app’s temporary desktop');
  h.context.activeWorkspace='work';h.context.owner='site';h.api.refresh();assert.equal(h.api.category(),'workspace','Returning restores that Workspace’s category');h.api.navigate('appearance');h.query('light');
  const reloaded=settingsHarness(h.storage);assert.equal(reloaded.api.category(),'appearance');assert.equal(reloaded.find('[data-settings-search]').value,'light','Search and navigation survive a browser reload');
  reloaded.query('');reloaded.api.open();assert.equal(reloaded.api.category(),'appearance','Reopening Settings keeps the last page unless a deep link requests another');
  const stale=settingsHarness();stale.api.navigate('areas');const oldArea=stale.find('[data-settings-area="apps"]');oldArea.value='hidden';stale.context.activeWorkspace='gaming';stale.context.owner='workspace';stale.emit('change',oldArea);assert.equal(stale.calls.area.length,0,'A stale Area control cannot write into another Workspace');
  const repaired=settingsHarness({'spatial-settings-nav-v1':JSON.stringify({work:{category:'missing-page',query:42,history:['missing-page','appearance']}})});assert.equal(repaired.api.category(),'home');assert.equal(repaired.find('[data-settings-search]').value,'');repaired.click('[data-settings-back]');assert.equal(repaired.api.category(),'appearance','Reload repairs unknown categories and preserves valid history');
  h.context.SpatialGuide={model:{active:()=>true,allows:()=>false}};const launched=h.calls.launched.length;h.api.open('areas');assert.equal(h.calls.launched.length,launched,'The early Guide cannot open gated Settings');h.api.navigate('areas');assert.equal(h.find('[data-settings-area]'),null,'Guide restrictions also hide direct category controls');
}

// Classic scripts restore Settings before loading the embedded Displays
// editor. Exercise that production load order with both real modules.
function delayedDisplaysChecks(){
  const h=settingsHarness({'spatial-settings-nav-v1':JSON.stringify({work:{category:'displays',query:'',history:['home']}})},{displaysReady:false});
  const empty=h.find('[data-settings-displays]');assert(empty);assert.equal(empty.innerHTML,'','The restored page initially waits for its editor module');
  h.context.SpatialDisplayRoleBridge={state:()=>({workspace:'Work',mainSlot:1,localSlot:1,displays:[{slot:1,label:'Display 1',role:'main',width:1440,height:900},{slot:2,label:'Display 2',role:'assistant',width:1440,height:900}]})};
  vm.runInContext(fs.readFileSync(require.resolve('../dist/display-settings.js'),'utf8'),h.context);
  for(const ready of h.document.events.DOMContentLoaded||[])ready();
  assert.equal(h.find('[data-settings-displays]'),empty,'Module readiness fills the existing page without rebuilding navigation');
  assert(empty.classList.contains('settings-displays-editor'));assert.equal(empty.querySelector('legend').textContent,'Use Display 1 as');assert.equal(empty.events.click.length,1,'The delayed editor binds one listener');
  h.api.navigate('displays',{slot:1});const editor=h.find('[data-settings-displays]');
  editor.events.click[0]({target:editor.querySelector('[data-display-select="2"]')});
  assert.equal(editor.querySelector('legend').textContent,'Use Display 2 as');
  h.api.refresh();h.api.open();h.api.refresh();
  assert.equal(editor.querySelector('legend').textContent,'Use Display 2 as','Repeated refresh/reopen preserves the user-selected display instead of reapplying the original slot');
  assert.equal(editor.events.click.length,1);assert.equal(editor.events.change.length,1);
}

// Exercise the Settings adapter around the real desktop open/minimize/close
// functions and the real saved desktop/tiling models.
function lifecycleChecks(){
  const Pages=require('../dist/desktop-pages.js'),Tiles=require('../dist/spatial-tiling.js');
  const pages=Pages.create();pages.assign('work','settings',0,'film');pages.assign('work','browser',0,'film');pages.assign('work','notes',1,'site');pages.select('work','site');pages.go('work',1);pages.assign('gaming','settings',0,'workspace');
  const session=(root)=>({root,parked:{settings:['browser']},floating:{settings:{x:40,y:40}},focus:null,fullscreen:null});
  const oldKey=pages.context('work',0,'film')+'1',secondOldKey=pages.context('work',0,'film')+'2',currentKey=pages.context('work')+'1',foreignKey=pages.context('gaming',0,'workspace')+'1';
  const sessions={[oldKey]:session({kind:'split',axis:'x',ratio:.5,a:Tiles.leaf('settings'),b:Tiles.leaf('browser')}),[secondOldKey]:session(Tiles.leaf('settings')),[currentKey]:session(Tiles.leaf('notes')),[foreignKey]:session(Tiles.leaf('settings'))};sessions[oldKey].focus={name:'settings'};sessions[secondOldKey].fullscreen={name:'settings'};
  const foreign=JSON.stringify(sessions[foreignKey]),frames={settings:{hidden:false,dataset:{maximized:'true'},classList:{remove(){}}},browser:{hidden:false,dataset:{},classList:{remove(){}}},notes:{hidden:false,dataset:{},classList:{remove(){}}}},assignments={apps:{settings:2}},calls={focus:0,fullscreen:0,duplicates:0,splits:0,refresh:0,broadcast:0,moves:[],saved:[],changed:[],timers:[]};
  const projectSessions={'work:film':{apps:['settings','browser'],states:{settings:'open',browser:'open'},geometry:{settings:{}},displays:{settings:2}},'gaming:film':{apps:['settings'],states:{settings:'open'}}};
  const context=vm.createContext({activeWorkspace:'work',appInfo:{settings:{label:'Settings',singleInstance:true},browser:{label:'Firefox'},notes:{label:'Notes'}},appState:{settings:'open',browser:'open',notes:'open'},appMaximizedState:{settings:true},desktopPages:pages,tileSessions:sessions,tileEngine:Tiles,windowMembership:{work:{settings:'film'},gaming:{settings:null}},projectWindowSessions:projectSessions,desktopPageAnimating:false,maximizeRestore:new Map([['settings',{}]]),windowGeometry:new Map(),autoTiledWindows:new Set(),frontApp:'notes',layoutMode:'manual',
    localDisplaySlot:()=>1,activeDisplayRoster:()=>[{},{}],isLocalApp:id=>assignments.apps[id]===1,frameFor:id=>frames[id],tileSession:()=>sessions[pages.context(context.activeWorkspace)+'1']||=(session(null)),extendedDesktopActive:()=>false,displayAssignmentsFor:()=>assignments,
    releaseBorrowedApp(){},leaveTileFocus(session,_,options){calls.focus++;assert(options.owns('settings')&&options.owns('browser'));session.focus=null;},leaveAppFullscreen(session){calls.fullscreen++;(session||context.tileSession()).fullscreen=null;},clearWindowAutoAvoidance(){},syncApps(){for(const [id,frame] of Object.entries(frames))frame.hidden=context.appState[id]!=='open';},renderTileLayout(){},
    splitWindowIntoTile(id){calls.splits++;const session=context.tileSession();session.root=Tiles.insert(session.root,id,context.frontApp,'right',{x:0,y:0,width:1400,height:900},()=>({width:200,height:200}));},bringToFront:id=>context.frontApp=id,refreshIntentAreas(){},queueDesktopStateBroadcast:()=>calls.broadcast++,SpatialSettings:{refresh:()=>calls.refresh++},readGeometry:()=>({x:0,y:0,width:600,height:400}),syncMaximizeButton(){},topOpenApp:()=>null,showToast(){},
    saveDesktopPages:()=>calls.saved.push('pages'),saveTileSessions:()=>calls.saved.push('tiles'),saveIndependentSessions:()=>calls.saved.push('session'),persistWorkspaceAppStates:()=>calls.saved.push('apps'),persistProjectState:()=>calls.saved.push('projects'),refreshDownloadUi(){},
    createAppInstance(){calls.duplicates++;throw Error('Settings created a duplicate instance');},changeDesktopPage(page,_,owner){calls.changed.push([page,owner]);if(owner)pages.select(context.activeWorkspace,owner);pages.go(context.activeWorkspace,page);},
    moveAppWorkspace:(...args)=>calls.moves.push(['workspace',...args]),moveAppProject:(...args)=>calls.moves.push(['project',...args]),moveWindowToColumn:(...args)=>calls.moves.push(['column',...args]),
    contextMenuEntries:()=>[{action:'app-new-instance',label:'New window'},{label:'Other Projects',children:[{action:'app-project:film'}]},{label:'Other Workspaces',children:[{action:'app-workspace:gaming'}]},{action:'app-close',label:'Close'}],contextMenuDescriptor:()=>({kind:'app',name:'settings'}),setTimeout:callback=>calls.timers.push(callback)
  });
  const shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
  const segment=(first,last)=>{const start=shell.indexOf(first),end=shell.indexOf(last,start+first.length);assert(start>=0&&end>start);return shell.slice(start,end);};
  vm.runInContext(segment('function openApp(', 'function syncMaximizeButton('),context);
  vm.runInContext(segment('function launchAppHere(', 'function workspaceHotbarNames('),context);
  vm.runInContext(segment('const originalOpenApp = openApp;', 'function moveAppWorkspace('),context);
  vm.runInContext(fs.readFileSync(require.resolve('../dist/settings-app-desktop.js'),'utf8'),context);
  assert.equal(context.launchAppHere('settings',true),'settings');
  assert.equal(calls.duplicates,0);assert.equal(pages.column('work'),'site');assert.equal(pages.current('work'),1,'Opening Settings stays on the viewed desktop');assert.equal(pages.columnOf('work','settings'),'site');assert.equal(pages.pageOf('work','settings'),1);
  assert.equal(context.appState.settings,'open');assert.equal(frames.settings.hidden,false);assert(Tiles.names(sessions[currentKey].root).includes('settings'),'Settings enters ordinary tiling');
  assert(!Tiles.names(sessions[oldKey].root).includes('settings'));assert.equal(calls.focus,1);assert.equal(calls.fullscreen,1);assert.equal(JSON.stringify(sessions[foreignKey]),foreign,'Opening Settings never edits another Workspace’s tiles');
  assert.equal(context.windowMembership.work.settings,null);assert(!projectSessions['work:film'].apps.includes('settings'));assert.equal(projectSessions['work:film'].states.settings,undefined);assert(projectSessions['gaming:film'].apps.includes('settings'),'Project cleanup is limited to the owning Workspace');
  context.minimizeApp('settings');assert.equal(context.appState.settings,'minimized');assert.equal(frames.settings.hidden,true);assert(!Tiles.names(sessions[currentKey].root).includes('settings'));
  context.launchAppHere('settings');assert.equal(context.appState.settings,'open');assert.equal(Tiles.names(sessions[currentKey].root).filter(id=>id==='settings').length,1,'Restoring the parked Settings window uses one tile and identity');
  context.closeApp('settings');assert.equal(context.appState.settings,'closed');assert.equal(frames.settings.hidden,true);context.openApp('settings');assert.equal(context.appState.settings,'open');assert.equal(calls.duplicates,0,'Closing and reopening never makes a new Settings identity');
  context.SpatialGuide={model:{active:()=>true,allows:gate=>gate==='systems'}};context.closeApp('settings');context.launchAppHere('settings');assert.equal(context.appState.settings,'open','Settings uses the systems Guide gate even before apps are allowed');
  context.SpatialGuide.model.allows=()=>false;context.closeApp('settings');const splits=calls.splits;context.launchAppHere('settings');assert.equal(context.appState.settings,'closed');assert.equal(calls.splits,splits,'A gated Settings entry cannot mutate the layout');context.SpatialGuide=null;
  context.desktopPageAnimating=true;context.launchAppHere('settings');assert.equal(calls.timers.length,1);context.activeWorkspace='gaming';context.desktopPageAnimating=false;calls.timers.shift()();assert.equal(context.appState.settings,'closed','An animation-deferred launch is discarded after changing Workspace');
  context.activeWorkspace='work';
  const settingsMenu=context.contextMenuEntries({kind:'app',name:'settings'});assert(!settingsMenu.some(entry=>entry.action==='app-new-instance'||['Other Projects','Other Workspaces'].includes(entry.label)),'Settings has no duplicate or packed transfer menu actions');assert(settingsMenu.some(entry=>entry.action==='app-close'));
  assert(context.contextMenuEntries({kind:'app',name:'browser'}).some(entry=>entry.action==='app-new-instance'),'Ordinary app transfer menus remain available');
  context.moveAppWorkspace('settings','gaming');context.moveAppProject('settings','film');assert.equal(context.moveWindowToColumn('settings','film'),false);assert.equal(calls.moves.length,0,'Direct transfer calls cannot duplicate or pack Settings');
  context.moveWindowToColumn('settings','site',false,0);assert.deepEqual(calls.moves.at(-1),['column','settings','site',false,0],'Settings can still move between its normal desktops');context.moveAppWorkspace('browser','gaming');assert.deepEqual(calls.moves.at(-1),['workspace','browser','gaming']);
  assert(calls.saved.includes('pages')&&calls.saved.includes('session')&&calls.saved.includes('apps'));
}

function workspaceCaptureChecks(){
  const shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8'),settingsField={value:'live preference'},documentField={value:'Current document',tagName:'INPUT',type:'text'};let settingsReads=0,saves=0;
  const context=vm.createContext({activeWorkspace:'work',activeProjectName:null,appInfo:{settings:{},browser:{}},frameFor:id=>id==='settings'?{querySelectorAll(){settingsReads++;return [settingsField];}}:{dataset:{},querySelectorAll:()=>[documentField]},pristineFrames:{browser:{querySelectorAll:()=>[{value:'Default document'}]}},workspaceContent:{work:{history:[]}},workspaceProjects:{},workspaceAreaContents:{},workspaceProfiles:{work:{home:'/home/work'}},desktopPreset:'empty',focusSeconds:5,musicPlaying:false,musicPosition:0,noteDraft:'Current note',terminalPreview:'Ready',focusTimer:1,SpatialDemoExamples:{migrateNote:value=>value},areaFor:()=>({querySelectorAll:()=>[]}),saveIndependentSessions:()=>saves++,clearInterval(){},updateTimer(){},setMusicPlaying(){},refreshDownloadUi(){},renderWorkspaceHistory(){},$:()=>({value:''})});
  const slice=(first,last)=>shell.slice(shell.indexOf(first),shell.indexOf(last,shell.indexOf(first)));
  vm.runInContext(slice('function captureWorkspaceContent() {','function renderWorkspaceHistory() {')+slice('function restoreWorkspaceContent(name) {','const originalCaptureWorkspace ='),context);
  context.captureWorkspaceContent();assert.equal(context.workspaceContent.work.frames.settings,undefined,'Workspace document snapshots do not capture live Settings preference fields');assert.equal(context.workspaceContent.work.frames.browser[0].value,'Current document');
  context.workspaceContent.work.frames.settings=[{value:'Obsolete theme from legacy session'}];documentField.value='Unsaved browser value';context.restoreWorkspaceContent('work');
  assert.equal(documentField.value,'Current document','Ordinary app document fields still restore');assert.equal(settingsField.value,'live preference');assert.equal(settingsReads,0,'Neither capture nor restore reads positional Settings controls');assert.equal(saves,1);
}

(async()=>{settingsChecks();delayedDisplaysChecks();lifecycleChecks();workspaceCaptureChecks();await displayChecks();console.log('Settings app passed: searchable categories, real navigation and shortcuts, live controls, safe current scopes, fullscreen ownership, Guide gates, independent embedded Displays and window-model identity.');})().catch(error=>{console.error(error);process.exitCode=1;});
