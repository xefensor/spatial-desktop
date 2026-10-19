const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Pages = require('../dist/desktop-pages.js');

// Run the production adapter, including its DOM insertion and delegated clicks.
class Element {
  constructor(tag='div') { this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.hidden=false;this.inert=false;this.className='';this.style={setProperty(name,value){this[name]=value;}}; }
  append(...nodes) { for(const node of nodes){node.parentElement=this;this.children.push(node);} }
  insertBefore(node,anchor) { node.remove();const index=anchor?this.children.indexOf(anchor):this.children.length;assert(index>=0);this.children.splice(index,0,node);node.parentElement=this; }
  remove() { if(this.parentElement)this.parentElement.children.splice(this.parentElement.children.indexOf(this),1);this.parentElement=null; }
  replaceChildren(...nodes) { this.replacements=(this.replacements||0)+1;for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes); }
  setAttribute(name,value) { this.attrs[name]=String(value); }
  getAttribute(name) { return this.attrs[name]??null; }
  contains(node) { for(let at=node;at;at=at.parentElement)if(at===this)return true;return false; }
  matches(selector) { if(selector==='[data-quick-launch-app]')return Object.hasOwn(this.dataset,'quickLaunchApp');if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));return selector.toLowerCase()===this.tagName.toLowerCase(); }
  closest(selector) { for(let at=this;at;at=at.parentElement)if(at.matches(selector))return at;return null; }
  querySelectorAll(selector) { return this.children.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0]||null; }
  addEventListener(type,fn) { this.listeners[type]=fn; }
}
const area=new Element('aside'),region=new Element(),rack=new Element('nav'),shell=new Element('main');
region.className='apps-scroll-region';region.append(rack);area.append(region);
const calls=[];
const context={
  document:{querySelector:selector=>selector==='[data-widget-source="apps"]'?area:null,createElement:tag=>new Element(tag),getElementById:id=>id==='appRack'?rack:null},
  areaFor:()=>area,$:()=>shell,prepareControlSemantics(){calls.push(['prepare']);},appArt:name=>'<svg data-art="'+name+'"></svg>',
  activeWorkspace:'general',desktopPages:Pages.create(),
  workspaceProfiles:{
    general:{favorites:[['browser','Wrong alias'],['i-mail','Mail'],['notes','Notes'],['browser','Firefox'],['browser--1','Extra'],['steam','Steam']],rack:['notes','browser']},
    gaming:{favorites:[['steam','Steam'],['game','Fallout 4'],['browser','Firefox']],rack:['steam','game']},
    custom:{favorites:[['i-mail','Mail'],['missing','Unknown'],['steam','Steam']],rack:['notes','browser','notes','browser--1','missing','steam']},
    preferences:{favorites:[['settings','System Settings']],rack:[]},
    empty:{favorites:[],rack:['i-mail','browser--1']}
  },
  appInfo:{settings:{label:'Settings',primary:'#a483ff',singleInstance:true},browser:{label:'Firefox',primary:'#ff7139'},notes:{label:'Note Editor',primary:'#ffb553'},'browser--1':{base:'browser',label:'Firefox'},steam:{label:'Steam',primary:'#79bfec',singleInstance:true,workspace:'gaming'},game:{label:'Fallout 4',primary:'#b8d59a',singleInstance:true,workspace:'gaming'}},
  appState:{settings:'closed',browser:'closed',notes:'closed',steam:'closed',game:'closed'},desktopNavigationBlocked:()=>false,
  createAppInstance:name=>calls.push(['new',name]),openApp:name=>calls.push(['open',name]),launchAppHere:name=>calls.push(['launch-here',name]),
  changeDesktopPage(page,animate,column,fullscreen){calls.push(['go',page,animate,column,fullscreen]);context.desktopPages.select(context.activeWorkspace,column);context.desktopPages.go(context.activeWorkspace,page,column);}
};
vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/apps-quick-launch.js'),'utf8'),context);
const nav=region.children[0],grid=nav.querySelector('.apps-quick-launch-grid'),refresh=context.SpatialAppsQuickLaunch.refresh;
const buttons=()=>grid.querySelectorAll('[data-quick-launch-app]');
const ids=()=>buttons().map(button=>button.dataset.quickLaunchApp);
const button=name=>buttons().find(button=>button.dataset.quickLaunchApp===name);
const click=(name,shiftKey=false)=>nav.listeners.click({target:button(name).children[0]||button(name),shiftKey});
assert.equal(nav.id,'appsQuickLaunch');assert.equal(region.children[1],rack,'Launchers precede parked applications');
assert.equal(nav.children[0].textContent,'Quick launch');
assert.deepEqual(ids(),['browser','notes'],'Use runnable base favorites, in favorite order; exclude placeholder apps, instances, wrong Workspace and duplicates');
assert.equal(button('browser').children[0].textContent,'Firefox','Use the current app label rather than a stale favorite alias');
for(const launcher of buttons()){
  assert.equal(launcher.type,'button');assert(launcher.className.includes('material-glass-button'));
  assert(!Object.hasOwn(launcher.dataset,'openApp'));assert(!Object.hasOwn(launcher.dataset,'hotbarSlot'));assert.equal(launcher.getAttribute('aria-pressed'),null);
  assert(!/is-open|is-active|is-minimized|control-toggle/.test(launcher.className),'Launchers do not impersonate running-window toggles');
}
click('browser');assert.deepEqual(calls.pop(),['open','browser'],'A closed app opens in the current desktop');
click('browser',true);assert.deepEqual(calls.pop(),['new','browser'],'Shift-click always requests an independent ordinary window');
context.desktopPages.assign('general','browser',0);context.desktopPages.go('general',1);
context.appState.browser='open';refresh();click('browser');assert.deepEqual(calls.pop(),['new','browser']);
assert.equal(context.desktopPages.current('general'),1,'An open ordinary app gets a new window here rather than navigating to its existing desktop');
context.desktopPages.go('general',0);click('browser');assert.deepEqual(calls.pop(),['new','browser'],'A visible ordinary app also opens a new independent window');
context.appState.browser='minimized';refresh();
assert(button('browser').getAttribute('aria-label').includes('New window on this desktop'),'A parked base is described as a new launch, not a restoration');
for(const [column,page,shiftKey,description] of [
  ['workspace',0,false,'on its current desktop'],
  ['workspace',0,true,'with Shift on its current desktop'],
  ['workspace',1,false,'on another desktop in the same context'],
  ['project',0,false,'in another Project context']
]){
  context.desktopPages.select('general',column);context.desktopPages.go('general',page);refresh();
  const location=[context.desktopPages.column('general'),context.desktopPages.current('general')],count=calls.length;
  click('browser',shiftKey);
  assert.deepEqual(calls.slice(count),[['new','browser']],'A launcher creates an independent window while its base is parked '+description);
  assert.equal(context.appState.browser,'minimized','The parked base keeps its state '+description);
  assert.equal(context.desktopPages.columnOf('general','browser'),'workspace','The parked base keeps its original context');
  assert.equal(context.desktopPages.pageOf('general','browser'),0,'The parked base keeps its original desktop');
  assert.deepEqual([context.desktopPages.column('general'),context.desktopPages.current('general')],location,'Launching does not navigate to parked work '+description);
}
const sameButtons=buttons(),sameReplacements=grid.replacements;context.frontApp='notes';context.desktopHasWindowFocus=true;refresh();
assert.equal(grid.replacements,sameReplacements);assert.equal(button('browser'),sameButtons[0],'Focus updates preserve the actual launcher nodes');
context.appState.browser='open';refresh();assert.equal(button('browser'),sameButtons[0],'Launch policy changes update a hint without replacing a focused button');
assert(button('browser').getAttribute('aria-label').includes('New window on this desktop'));
const retainedBrowser=button('browser');
context.workspaceProfiles.general.favorites=[['notes'],['browser']];context.appInfo.browser.label='Firefox with a renamed profile';refresh();
assert.equal(button('browser'),retainedBrowser,'Favorite reordering and renamed labels preserve the actual launcher and keyboard focus');
assert.equal(button('browser').children[0].textContent,'Firefox with a renamed profile');
const staleWorkspaceCount=calls.length;context.activeWorkspace='custom';click('browser');
assert(calls.slice(staleWorkspaceCount).every(call=>call[0]==='prepare'),'A launcher rendered for the previous Workspace only refreshes when clicked after a context change');
context.activeWorkspace='custom';refresh();assert.deepEqual(ids(),['notes','browser'],'A Workspace without runnable favorites falls back to its runnable base rack');
context.activeWorkspace='gaming';refresh();assert.deepEqual(ids(),['steam','game','browser']);
context.desktopPages.assign('gaming','steam',2,'game-project');context.appState.steam='open';context.desktopPages.select('gaming','workspace');refresh();
click('steam');assert.deepEqual(calls.slice(-2),[['go',2,false,'game-project',null],['open','steam']],'A live singleton returns to its owner before being focused');
context.appState.steam='minimized';context.desktopPages.select('gaming','workspace');refresh();
click('steam',true);assert.deepEqual(calls.slice(-2),[['go',2,false,'game-project',null],['open','steam']],'A parked singleton still returns to its owner; Shift does not attempt to duplicate it');
context.desktopPages.assign('gaming','game',0,'game-project');context.desktopPages.addFullscreen('gaming','game');context.appState.game='open';context.desktopPages.select('gaming','workspace');
click('game',true);assert.deepEqual(calls.slice(-2),[['go',0,false,'game-project','game'],['open','game']],'Shift cannot duplicate a singleton; its fullscreen return target is retained');
context.appState.steam='closed';click('steam',true);assert.deepEqual(calls.pop(),['open','steam']);
context.appState.browser='closed';context.appState['browser--1']='open';refresh();
click('browser');assert.deepEqual(calls.pop(),['open','browser'],'A closed base can supply a fresh window while an independent instance stays open');
assert.equal(context.appState['browser--1'],'open');
click('browser',true);assert.deepEqual(calls.pop(),['new','browser'],'Shift creates an independent instance even when the base is closed');
context.appState.browser='open';refresh();
const unchanged=()=>{const count=calls.length;click('browser');assert.equal(calls.length,count,'Unavailable, hidden or modal-blocked launchers do not launch');};
shell.inert=true;unchanged();shell.inert=false;
area.hidden=true;unchanged();area.hidden=false;
area.inert=true;unchanged();area.inert=false;
context.desktopNavigationBlocked=()=>true;unchanged();context.desktopNavigationBlocked=()=>false;
context.SpatialGuide={model:{active:()=>true,allows:()=>false}};unchanged();
context.SpatialGuide.model.allows=feature=>feature==='apps';click('browser');assert.deepEqual(calls.pop(),['new','browser'],'Guide apps gating permits only the real launch path when taught');
context.SpatialGuide.model.active=()=>false;
context.workspaceProfiles.gaming.favorites=[['steam','Steam']];unchanged();refresh();assert.deepEqual(ids(),['steam'],'Removed favorites cannot launch through stale controls');
context.activeWorkspace='preferences';context.desktopPages.assign('preferences','settings',2,'old-project');context.desktopPages.select('preferences','workspace');context.appState.settings='minimized';refresh();
assert.deepEqual(ids(),['settings'],'Settings is a runnable favorite in its own right');
assert(button('settings').getAttribute('aria-label').includes('Open on this desktop'),'Settings describes its actual current-desktop behavior');
let countBefore=calls.length;click('settings',true);assert.deepEqual(calls.slice(countBefore),[['launch-here','settings']],'Settings uses the ordinary current-desktop launch adapter without pre-navigation or duplicates');
assert.equal(context.desktopPages.column('preferences'),'workspace');assert.equal(context.desktopPages.current('preferences'),0,'Opening Settings does not jump to its previous desktop');
context.SpatialGuide={model:{active:()=>true,allows:feature=>feature==='apps'}};countBefore=calls.length;click('settings');assert.equal(calls.length,countBefore,'Settings follows the Guide system controls gate');
context.SpatialGuide.model.allows=feature=>feature==='systems';click('settings');assert.deepEqual(calls.pop(),['launch-here','settings'],'The system lesson can open Settings through Apps');
delete context.SpatialGuide;
context.activeWorkspace='empty';refresh();assert(nav.hidden);assert.deepEqual(ids(),[],'Do not manufacture a generic launcher for an empty profile');
const outside=new Element();outside.dataset.quickLaunchApp='browser';const count=calls.length;nav.listeners.click({target:outside});assert.equal(calls.length,count,'Only actual launchers inside this nav own its delegated action');

// Exercise real shortcut ordering and the hidden compatibility metadata rack.
// Removing open-window icons must not renumber a parked window's shortcut.
const shellSource=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const parkedRack=new Element('nav'),positions={open1:0,open2:300,parked:600};
const rackContext={
  activeWorkspace:'general',workspaceProfiles:{general:{rack:['open1','open2','parked']}},
  appState:{open1:'open',open2:'open',parked:'minimized'},
  appInfo:{open1:{label:'First'},open2:{label:'Second'},parked:{label:'Parked tool'}},
  desktopPages:Pages.create(),isLocalApp:()=>true,
  frameFor:name=>({style:{left:positions[name]+'px',top:'0px'},getBoundingClientRect:()=>({left:positions[name],top:0}),parentElement:{getBoundingClientRect:()=>({left:0,top:0})}}),
  $:()=>parkedRack,applyAppPrimaryColors(){},escapeHtml:text=>text,appArt:name=>'<svg data-art="'+name+'"></svg>',icon:()=>'<svg></svg>'
};
for(const name of Object.keys(rackContext.appState))rackContext.desktopPages.assign('general',name,0);
vm.createContext(rackContext);
vm.runInContext(shellSource.slice(shellSource.indexOf('function workspaceHotbarNames()'),shellSource.indexOf('let hotbarOrderFrame=')),rackContext);
const shortcutNames=()=>Array.from(rackContext.workspaceShortcutNames());
const parkedMarkup=()=>[...parkedRack.innerHTML.matchAll(/data-open-app="([^"]+)"/g)].map(match=>match[1]);
assert.deepEqual(shortcutNames(),['open1','open2','parked']);
rackContext.renderInstanceRack();
assert(parkedRack.hidden,'Parking never reveals the retired rack');assert.deepEqual(parkedMarkup(),['parked'],'Hidden metadata retains the parked shortcut binding');
assert(parkedRack.innerHTML.includes('data-hotbar-slot="3"'));
assert(parkedRack.innerHTML.includes('aria-keyshortcuts="Meta+3"'),'Its slot still counts the two open windows ahead of it');
assert(!parkedRack.innerHTML.includes('app-rack-open'),'No open-window mirror remains in Apps');
const firstMarkup=parkedRack.innerHTML;rackContext.renderInstanceRack();assert.equal(parkedRack.innerHTML,firstMarkup,'A repeat render keeps the same parked state');
assert.deepEqual(shortcutNames(),['open1','open2','parked'],'Rendering icons leaves the shared keyboard ordering untouched');
rackContext.appState.parked='open';rackContext.renderInstanceRack();
assert(parkedRack.hidden);assert.equal(parkedRack.innerHTML,'','An entirely unparked desktop has no compatibility task metadata');
assert.deepEqual(shortcutNames(),['open1','open2','parked'],'Open windows retain their shortcut slots without requiring icons');
// A real DOM verifies focus: moving a retained button within its parent
// can blur it even when its identity and native listeners were preserved.
const {JSDOM}=require(process.env.SPATIAL_DOM_TEST_MODULE||'jsdom');
const focusDom=new JSDOM('<!doctype html><main class="desktop-shell"><aside data-widget-source="apps"><div class="apps-scroll-region"><nav id="appRack"></nav></div></aside></main>',{runScripts:'outside-only'});
const focusWindow=focusDom.window;
Object.assign(focusWindow,{activeWorkspace:'general',workspaceProfiles:{general:{favorites:[['browser'],['notes']],rack:[]}},appInfo:{browser:{label:'Firefox',primary:'#ff7139'},notes:{label:'Note Editor',primary:'#ffb553'}},appState:{browser:'closed',notes:'closed'},appArt:name=>'<svg aria-hidden="true"></svg>',prepareControlSemantics(){}});
vm.runInContext(fs.readFileSync(require.resolve('../dist/apps-quick-launch.js'),'utf8'),focusDom.getInternalVMContext());
const focusDocument=focusWindow.document,retainedFocus=focusDocument.querySelector('[data-quick-launch-app="browser"]');
retainedFocus.focus();focusWindow.workspaceProfiles.general.favorites=[['notes'],['browser']];focusWindow.appInfo.browser.label='Renamed profile';focusWindow.SpatialAppsQuickLaunch.refresh();
assert.equal(focusDocument.activeElement,retainedFocus,'Favorite reordering restores keyboard focus to the actual retained native launcher');
assert.equal(retainedFocus.querySelector('span').textContent,'Renamed profile');focusDom.window.close();
console.log('Apps quick launch passed: runnable Workspace favorites, stable launchers, independent/parked/singleton launch policies, current-desktop Settings, Guide/modal guards and hidden compatibility metadata without duplicate native task UI or shortcut renumbering.');
