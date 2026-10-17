const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const button=(id,dataset)=>({id,dataset,hidden:false});
const buttons=[
  button('files',{openApp:'dolphin',category:'utilities',favorite:'false'}),
  button('music',{openApp:'elisa',category:'multimedia',favorite:'true'}),
  button('notes',{openApp:'notes',category:'office',favorite:'true'}),
  button('terminal',{openApp:'terminal',category:'system',favorite:'false'}),
  button('browser-copy',{openApp:'browser--2',category:'internet',favorite:'false'}),
  button('mail',{launchApp:'Thunderbird',category:'internet',favorite:'false'}),
  button('editor',{launchApp:'Kate',category:'development',favorite:'false'}),
  button('painting',{launchApp:'Krita',category:'graphics',favorite:'true'}),
  button('steam',{openApp:'steam',category:'games',favorite:'false'}),
  button('lutris',{launchApp:'Lutris',category:'games',favorite:'false'}),
  button('foreign-browser',{openApp:'browser',category:'internet',appWorkspace:'work',favorite:'true'}),
  button('settings',{openApp:'settings',category:'system',favorite:'false'}),
  button('guide',{launchApp:'Spatial Guide',category:'help',favorite:'true'})
];
const nodes={'#allAppsGrid':{},'#allAppsCount':{},'#allAppsEmpty':{}};
const context={
  activeWorkspace:'general',activeLauncherCategory:'favorites',SpatialAppNames:require('../dist/app-names.js'),
  appInfo:{settings:{label:'Settings',singleInstance:true},dolphin:{label:'File Browser'},elisa:{label:'Music Player'},notes:{label:'Note Editor'},terminal:{label:'Terminal'},browser:{label:'Firefox'},'browser--2':{base:'browser',label:'Firefox · 2'},steam:{label:'Steam'}},
  workspaceProfiles:{
    general:{favorites:[['dolphin','Dolphin'],['elisa','Elisa'],['notes','Notes'],['i-mail','Thunderbird']]},
    work:{favorites:[['dolphin','Dolphin'],['terminal','Konsole'],['browser','Firefox'],['i-code','Kate'],['i-mail','Mail']]},
    gaming:{favorites:[['steam','Steam']]},empty:{favorites:[]}
  },
  $:selector=>nodes[selector],$$:selector=>selector==='.launcher-app'?buttons:[]
};
vm.createContext(context);
const start=source.indexOf('function filterLauncher()'),end=source.indexOf('\n$$("[data-category-filter]")',start);
assert(start>=0&&end>start,'The production launcher filter can be isolated from its event bindings');
vm.runInContext(source.slice(start,end),context);
const visible=()=>buttons.filter(button=>!button.hidden).map(button=>button.id);
const expect=(ids,message)=>{context.filterLauncher();assert.deepEqual(visible(),ids,message);assert.equal(nodes['#allAppsCount'].textContent,ids.length+(ids.length===1?' app':' apps'));assert.equal(nodes['#allAppsEmpty'].hidden,ids.length!==0);};
expect(['files','music','notes','mail'],'General favorites come from its profile, ignoring stale static favorite flags');
context.activeWorkspace='work';
expect(['files','terminal','browser-copy','mail','editor','foreign-browser'],'The same catalogue follows Work favorites, including instance base IDs and normalized Mail/Thunderbird aliases');
context.activeWorkspace='general';expect(['files','music','notes','mail'],'Returning to General removes Work-only favorites immediately');
context.activeWorkspace='gaming';expect(['steam'],'Explicit Steam identity does not accidentally favorite Lutris through their shared generic label');
context.activeWorkspace='work';context.SpatialGuide={model:{active:()=>true,allows:()=>false}};
expect(['files','terminal','browser-copy','foreign-browser'],'Guide restrictions still hide generic launchers even when favorited');
context.activeLauncherCategory='all';context.filterLauncher();
assert(visible().includes('guide')&&!visible().includes('mail')&&!visible().includes('painting'),'The Guide launcher remains available while untaught generic applications stay gated');
context.SpatialGuide.model.allows=()=>true;context.filterLauncher();assert(visible().includes('mail'),'Completing the Guide restores generic launchers');
delete context.SpatialGuide;context.activeWorkspace='general';context.activeLauncherCategory='internet';
expect(['browser-copy','mail'],'Category filtering remains independent of favorites and honors Workspace restrictions');
context.activeLauncherCategory='favorites';context.activeWorkspace='empty';expect([],'An empty favorite list shows the catalogue empty state');
context.activeWorkspace='missing';expect([],'A missing Workspace profile cannot expose static favorites');
context.workspaceProfiles.empty.favorites=[['settings','Settings']];context.activeWorkspace='empty';
expect(['settings'],'Settings participates in Favorites through its actual app identity');
context.activeLauncherCategory='system';expect(['terminal','settings'],'Settings is available alongside Terminal under System');
context.activeLauncherCategory='all';context.filterLauncher();assert(visible().includes('settings'),'Settings appears in All applications in every Workspace');

// Read the shipped launcher entry and run its actual app-search builder.
const html=fs.readFileSync(require.resolve('../dist/index.html'),'utf8');
const settingsEntry=html.match(/<button class="launcher-app"[^>]*data-open-app="settings"[^>]*>[\s\S]*?<\/button>/g)||[];
assert.equal(settingsEntry.length,1,'There is exactly one real Settings launcher');
assert(settingsEntry[0].includes('href="#app-settings"'),'Settings uses the same app art as Quick launch and parked cards');
assert(!html.includes('data-launch-app="Settings"'),'No legacy generic Settings placeholder remains');
const searchTarget={innerHTML:''},launcher={dataset:{openApp:'settings',category:'system'},textContent:'Settings',lastElementChild:{textContent:'Settings'}};
const searchContext=vm.createContext({$:selector=>selector==='#universalAppResults'?searchTarget:selector==='.launcher-icon'?{innerHTML:'<svg><use href="#app-settings"/></svg>'}:{},$$:()=>[launcher]});
vm.runInContext(source.slice(source.indexOf('function normalizeSearchText('),source.indexOf('function projectSearchResults(')),searchContext);
for(const query of ['settings','system settings']){
  assert.equal(searchContext.buildUniversalAppResults(query),1,'Settings is searchable using its current and previous name');
  assert(searchTarget.innerHTML.includes('data-search-open-app="settings"'),'Search launches the actual Settings application');
  assert(!searchTarget.innerHTML.includes('data-search-launch-app'));
}

console.log('Launcher favorites passed: Workspace switching, app identity/base matching, normalized generic aliases, stale flag rejection, Guide/category/privacy gates, real Settings launcher/search and empty states.');
