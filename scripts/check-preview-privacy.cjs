const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../dist/preview-privacy.js'),A=require('../dist/app-tools.js');
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const card=P.card('browser--2','Firefox <two>','<svg></svg>',12,true,escape);
assert.match(card,/Firefox &lt;two>/);assert.match(card,/Preview hidden/);assert.match(card,/Needs input/);
assert.match(card,/data-mini-restore="browser--2"/);assert.match(card,/data-owned-dialog-restore="browser--2"/);
assert(!card.includes('data-parked-preview'),'A hidden card never requests a window snapshot');
assert.equal((card.match(/data-mini-card=/g)||[]).length,1,'The dialog remains in its parent group');

const store=A.create();let snapshots=0,saves=0;
const context=vm.createContext({activeWorkspace:'gaming',appInfo:{browser:{label:'Firefox'},'browser--2':{label:'Firefox · 2'},notes:{label:'Note Editor'}},appState:{browser:'minimized','browser--2':'open',notes:'minimized'},
  appWindowModel:id=>store.get(context.activeWorkspace,id,()=>({kind:id,ownedDialog:id==='browser'?{title:'Secret operation',filename:'private-file.txt',directory:'/private/folder'}:null})),
  miniMarkup:id=>{snapshots++;return '<article>SECRET PAGE '+id+'</article>';},hotbarSlotFor:()=>2,appArt:()=>'<svg></svg>',escapeHtml:escape,
  contextMenuEntries:()=>[{action:'app-close',label:'Close window'}],executeContextAction(){},contextMenuState:{name:'browser'},
  renderMiniApps(){},renderOverviewWindows(){},renderDesktopColumnMap(){},renderFullscreenPeek(){},fullscreenPeekBond:()=>null,
  document:{querySelectorAll:()=>[],getElementById:()=>null},saveAppWindows(){saves++;},showToast(){}});
vm.runInContext(fs.readFileSync(require.resolve('../dist/preview-privacy.js'),'utf8'),context);
assert(context.contextMenuEntries({kind:'app',name:'browser'}).some(e=>e.label==='Hide preview'));
context.executeContextAction('app-toggle-preview');
const privateCard=context.miniMarkup('browser');
assert.equal(snapshots,0,'A hidden window bypasses both the widget and snapshot renderers');
for(const secret of ['SECRET PAGE','Secret operation','private-file.txt','/private/folder'])assert(!privateCard.includes(secret));
assert(privateCard.includes('Needs input'));assert(context.SpatialPreviewPrivacy.hidden('browser'));
assert(!context.SpatialPreviewPrivacy.hidden('browser--2'),'Sibling windows keep their own setting');
assert(context.contextMenuEntries({kind:'app',name:'browser'}).some(e=>e.label==='Show preview'));
context.contextMenuState={name:'notes'};context.executeContextAction('app-toggle-preview');assert(context.miniMarkup('notes').includes('Preview hidden'),'Widget contents can also be hidden');
const reload=A.create(JSON.parse(JSON.stringify(store.snapshot())));assert(reload.get('gaming','browser').previewHidden,'The preference survives reload');
store.copy('gaming','browser','work','browser--3');assert(store.get('work','browser--3').previewHidden,'A transferred window keeps its privacy setting');
context.activeWorkspace='work';assert(!context.SpatialPreviewPrivacy.hidden('browser'),'Workspace sessions do not share privacy flags');context.activeWorkspace='gaming';
context.contextMenuState={name:'browser'};context.executeContextAction('app-toggle-preview');assert(!context.SpatialPreviewPrivacy.hidden('browser'));
assert(context.miniMarkup('browser').includes('SECRET PAGE'));assert.equal(snapshots,1,'Showing the preview returns to the original renderer');assert.equal(saves,3);
const shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const nodes={};const node=id=>nodes[id]||=( {value:'all',innerHTML:'',textContent:''} );
const overview=vm.createContext({appState:{browser:'minimized'},appInfo:{browser:{label:'Firefox',detail:'Secret account',primary:'#abc'}},activeWorkspace:'gaming',frontApp:null,desktopHasWindowFocus:false,
  desktopPages:{inColumn:()=>true,current:()=>0,pageOf:()=>0},workspaceHotbarNames:()=>['browser'],frameFor:()=>({}),
  SpatialPreviewPrivacy:{hidden:()=>true},$:selector=>selector==='.app-identity small'?{textContent:'Private document title'}:node(selector),escapeHtml:escape,appArt:()=>'',icon:()=>'',refreshWorkspaceContext(){},renderDesktopColumnMap(){},prepareControlSemantics(){}});
vm.runInContext(shell.slice(shell.indexOf('function renderOverviewWindows()'),shell.indexOf('function refreshWorkspaceContext()')),overview);
overview.renderOverviewWindows();const html=node('#overviewWindowGrid').innerHTML;
assert(html.includes('Preview hidden'));assert(!html.includes('Private document title')&&!html.includes('Secret account'),'Overview labels and tooltips do not leak the hidden document');
console.log('Preview privacy passed: content-free app/dialog cards, no snapshot/widget request, retained restore identity, safe labels, per-window/workspace persistence, transfer, reversible setting and private Overview titles.');
