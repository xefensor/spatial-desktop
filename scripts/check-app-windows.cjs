const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const A = require('../dist/app-tools.js');
const H = require('../dist/home-folders.js');
const store = A.create();
const notes = store.get('work','notes--1',{kind:'notes',active:'main',sequence:1,notes:[{id:'main',title:'Launch',text:'Original checklist'}]});
const second = A.addNote(notes);second.title='Ideas';second.text='Keep this separate';
notes.active='main';assert.equal(A.activeNote(notes).text,'Original checklist');
notes.active=second.id;assert.equal(A.activeNote(notes).text,'Keep this separate');
const other = store.get('work','notes--2',{kind:'notes',active:'main',sequence:1,notes:[{id:'main',title:'Film',text:'Film notes'}]});
assert.equal(A.activeNote(other).text,'Film notes','Instances never reuse a sibling’s document');
const school = store.get('school','notes--1',{kind:'notes',active:'main',sequence:1,notes:[{id:'main',title:'School',text:'Course notes'}]});
assert.equal(A.activeNote(school).text,'Course notes','The same base identity is isolated by workspace');
store.copy('work','notes--1','school','notes--3');
store.get('school','notes--3').notes[0].text='Edited after transfer';
assert.equal(notes.notes[0].text,'Original checklist','Transfer copies the session without coupling the windows');
const restored = A.create(JSON.parse(JSON.stringify(store.snapshot())));
assert.equal(A.activeNote(restored.get('work','notes--1')).title,'Ideas');
assert.equal(A.words('  One\n two\tthree  '),3);
const navigation=A.navigation('/home/demo');
A.visit(navigation,'/home/demo/Documents');A.visit(navigation,'/home/demo/Pictures');
assert.equal(A.go(navigation,-1),'/home/demo/Documents');
A.visit(navigation,'/home/demo/Downloads');
assert.deepEqual(navigation.items,['/home/demo','/home/demo/Documents','/home/demo/Downloads'],'Back followed by a new visit removes stale forward history');
assert.equal(A.go(navigation,99),'/home/demo/Downloads');
assert.equal(A.go(navigation,-99),'/home/demo');
const browser=A.navigation({address:'Start',title:'Start page',links:['Mail']});
A.visit(browser,{address:'Mail',title:'Mail',links:[]});
const browserReload=JSON.parse(JSON.stringify(browser));
assert.equal(A.go(browserReload,-1).address,'Start');
assert.equal(A.go(browserReload,1).title,'Mail');
const home='/home/demo/Workspaces/Work';
const terminalContext={home,environment:{XDG_DOWNLOAD_DIR:home+'/Downloads'},exists:p=>[home,home+'/Documents','/mnt/Short Film'].includes(p),list:p=>p===home?['Documents','Downloads']:['checklist.md']};
assert.equal(A.terminal('pwd','/mnt/Short Film',terminalContext).output,'/mnt/Short Film');
assert.equal(A.terminal('echo $HOME $XDG_DOWNLOAD_DIR','/mnt/Short Film',terminalContext).output,home+' '+home+'/Downloads');
assert.equal(A.terminal('cd ~/Documents',home,terminalContext).cwd,home+'/Documents');
assert.equal(A.terminal('cd "/mnt/Short Film"',home,terminalContext).cwd,'/mnt/Short Film');
assert.equal(A.terminal('cd /missing',home,terminalContext).cwd,home,'A failed cd retains the working directory');
assert.match(A.terminal('ls',home,terminalContext).output,/Documents\nDownloads/);
assert(A.terminal('clear',home,terminalContext).clear);
assert.match(A.terminal('curl anything',home,terminalContext).output,/command not found/);
assert.equal(A.resolvePath('../Downloads',home+'/Documents',home),home+'/Downloads');
const firstPlayer={tracks:[{title:'One',duration:3},{title:'Two',duration:5}],index:0,position:2,playing:true};
const secondPlayer={tracks:[{title:'Other',duration:4}],index:0,position:0,playing:false};
A.musicTick(firstPlayer);A.musicTick(secondPlayer);
assert.equal(firstPlayer.index,1);assert.equal(firstPlayer.position,0,'Finishing a track advances and resets progress');
assert.equal(secondPlayer.position,0,'A paused second instance stays untouched');
A.musicStep(firstPlayer,-1);assert.equal(firstPlayer.index,0);
A.musicStep(firstPlayer,-1);assert.equal(firstPlayer.index,1,'Previous wraps the queue');
const shell=fs.readFileSync(path.join(__dirname,'../dist/desktop-shell.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../dist/app-windows.js'),'utf8');
const profiles={general:{home:'/home/demo',label:'General',folders:[['Documents','Folder','folder']]},work:{home,label:'Work',folders:H.standard.map(name=>[name,'Folder','folder'])}};
const projectSpaces={film:{root:'/mnt/Short Film',originWorkspace:null,files:[['Footage','12 files','folder'],['Downloads','Files','folder']]}};
const downloads=H.create();downloads.ensure('/mnt/Short Film/Downloads');downloads.ensure(home+'/New folder');
const ctx=vm.createContext({workspaceProfiles:profiles,activeWorkspace:'work',projectSpaces,workspaceDownloads:downloads,
  SpatialHomeFolders:H,frameFor:()=>({dataset:{}}),escapeHtml:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')});
const slice=(text,first,last)=>text.slice(text.indexOf(first),text.indexOf(last,text.indexOf(first)));
vm.runInContext(slice(shell,'function fileLocationRows(', 'function renderFileLocation('),ctx);
vm.runInContext(slice(ui,'function appFileRows(', 'function renderAppFiles('),ctx);
assert.equal(ctx.appFileRows('files','/mnt/Short Film').filter(row=>row[0]==='Downloads').length,1,'A created Downloads folder is not shown twice');
assert(ctx.appFileRows('files',home).some(row=>row[0]==='New folder'),'Created folders appear in their actual parent');
assert(ctx.appFileRows('files','/home/demo').some(row=>row[0]==='Documents'),'Another Home remains explicitly accessible');
assert(ctx.appFileRows('files','/home/demo/Workspaces').some(row=>row[0]==='Work'),'Parent navigation exposes the known workspace hierarchy');
assert(ctx.appFileRows('files',home).some(row=>row[0]==='Assistant'&&row[2]==='folder'),'An unused Workspace Assistant folder appears in File Browser');
assert(ctx.appFileRows('files','/mnt/Short Film').some(row=>row[0]==='Assistant'&&row[3]==='/mnt/Short Film/Assistant'),'An unused custom Project Assistant folder appears in File Browser');
const crumbs=ctx.appFileBreadcrumbs(home+'/Documents');
assert.match(crumbs,/Work Home/);assert.match(crumbs,/aria-current="page"/);assert(!crumbs.includes('×'),'Breadcrumbs are locations, without fake tab close controls');
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
const trayModels={player:{kind:'elisa',tracks:[{title:'One',duration:20},{title:'Two',duration:30}],index:0,position:5,playing:false,muted:false},other:{kind:'elisa',tracks:[{title:'Other',duration:30}],index:0,position:0,playing:false,muted:false},notes:{notes:[{id:'main',title:'Checklist',text:'Keep this'}]},web:{navigation:A.navigation({title:'First'})},files:{navigation:A.navigation(home+'/Documents')},console:{cwd:home+'/Documents'}};
let trayRestored=[],commands=[],folders=[],saves=0;
const tray=vm.createContext({appInfo:{player:{base:'elisa'},other:{base:'elisa'},notes:{},web:{base:'browser'},files:{base:'dolphin'},console:{base:'terminal'}},
  appState:{player:'minimized',other:'minimized',notes:'minimized',web:'minimized',files:'minimized',console:'minimized'},
  appWindowModel:id=>trayModels[id],SpatialAppTools:A,SpatialHomeFolders:H,workspaceProfiles:profiles,activeWorkspace:'work',
  renderAllAppMusic(){},renderMiniApps(){},saveAppWindows(){saves++;},showToast(){},renderFileLocation:(id,path)=>folders.push([id,path]),openApp:id=>trayRestored.push(id),runAppCommand:(id,command)=>commands.push([id,command])});
vm.runInContext(slice(ui,'function parkedAppMenuEntries(', 'function prepareAppWindows('),tray);
assert(tray.parkedAppMenuEntries('player').some(entry=>entry.label==='Play'));
tray.executeParkedAppAction('player','music-play');
tray.executeParkedAppAction('player','music-next');
tray.executeParkedAppAction('player','music-mute');
assert(trayModels.player.playing&&trayModels.player.muted);assert.equal(trayModels.player.index,1);
assert(!trayModels.other.playing&&!trayModels.other.muted);assert.equal(trayModels.other.index,0,'Tray commands operate on the owning player');
assert.equal(trayRestored.length,0,'Background transport never unparks a window');
assert(tray.parkedAppMenuEntries('player').some(entry=>entry.label==='Pause'));
assert(tray.parkedAppMenuEntries('notes').some(entry=>entry.label==='Open note: Checklist'));
assert(!tray.parkedAppMenuEntries('web').some(entry=>entry.label==='Back'),'No dead Back command at the start of history');
A.visit(trayModels.web.navigation,{title:'Second'});
assert(tray.parkedAppMenuEntries('web').some(entry=>entry.label==='Back'));
tray.appInfo.web.parkingWidget=false;assert.deepEqual(Array.from(tray.parkedAppMenuEntries('web')),[],'Apps without a widget expose no invented background actions');
tray.executeParkedAppAction('files','file-downloads');
assert.deepEqual(folders,[['files',home+'/Downloads']]);assert.deepEqual(trayRestored,['files'],'Open Downloads restores the same file window');
tray.executeParkedAppAction('console','terminal-help');assert.deepEqual(commands,[['console','help']]);
tray.appState.player='closed';tray.executeParkedAppAction('player','music-play');assert(trayModels.player.playing,'A stale tray command cannot restart a closed window');
assert(saves>0);
assert(!html.includes('class="folder-tabs"'),'Unbacked static file tabs have been removed');
assert(html.indexOf('app-tools.js')<html.indexOf('app-windows.js')&&html.indexOf('app-windows.js')<html.indexOf('desktop-shell.js'));
assert(shell.includes('prepareAppWindows();'),'Apps are hydrated after the desktop session');
console.log('App windows passed: real folder navigation, history branching, breadcrumbs, saved note documents, isolated instances/workspaces, transfers, browser back/forward/reload, demo shell paths and variables, command limits, independent music queues and persistent folder creation.');

// Firefox tabs retain their own history through migration and reload.
const firefox={kind:'browser',navigation:A.navigation({address:'Studio',title:'Studio'})};
A.visit(firefox.navigation,{address:'Checklist',title:'Checklist'});A.browserTabs(firefox);
assert.equal(firefox.tabs.length,1,'Legacy browser history becomes the first tab');
const firstTab=firefox.activeTab,secondTab=A.browserAddTab(firefox,{address:'about:newtab',title:'New Tab'});
A.visit(firefox.navigation,{address:'Weather',title:'Weather'});assert.equal(A.current(firefox.navigation).title,'Weather');
A.browserSelectTab(firefox,firstTab);assert.equal(A.current(firefox.navigation).title,'Checklist');A.go(firefox.navigation,-1);assert.equal(A.current(firefox.navigation).title,'Studio');
A.browserSelectTab(firefox,secondTab.id);assert.equal(A.current(firefox.navigation).title,'Weather','Changing another tab history never changes this one');
const tabReload=JSON.parse(JSON.stringify(firefox));A.browserTabs(tabReload);A.go(tabReload.navigation,-1);assert.equal(A.current(tabReload.tabs[1].navigation).title,'New Tab','Reload reconnects navigation to the selected tab');
assert.equal(A.browserSelectTab(tabReload,'missing'),false);assert.equal(A.browserCloseTab(tabReload,secondTab.id),true);assert.equal(tabReload.activeTab,firstTab);assert.equal(A.browserCloseTab(tabReload,firstTab),false,'Closing the last tab asks the window manager to close this window');
const sibling={navigation:A.navigation({title:'Other window'})};A.browserTabs(sibling);assert.equal(A.current(sibling.navigation).title,'Other window');
while(firefox.tabs.length<20)A.browserAddTab(firefox,{address:'about:newtab',title:'New Tab'});assert.equal(A.browserAddTab(firefox,{title:'Beyond limit'}),null);assert.equal(firefox.tabs.length,20);
console.log('Firefox tabs passed: legacy migration, independent history, reload, selection, closing, separate windows, and bounds.');

// Reproduce first Workspace entry with real cloned app DOM: the window model
// can hydrate before renderWorkspaceExample writes its scene content.
{
 const {JSDOM}=require('jsdom'),D=require('../dist/demo-examples.js');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://spatial.test/'}),w=dom.window,d=w.document,context=dom.getInternalVMContext(),frames={};
 const specs=D.scenarios.work.windows.flatMap(column=>column.windows);
 for(const spec of specs){const frame=d.querySelector('[data-app-frame="'+spec.base+'"]').cloneNode(true);frame.dataset.appFrame=spec.id;d.body.append(frame);frames[spec.id]=frame;}
 Object.assign(w,{SpatialAppTools:A,SpatialDemoExamples:D,desktopPreset:'demo',activeWorkspace:'general',workspaceProfiles:profiles,projectSpaces:D.projects,
  frameFor:id=>frames[id],appInfo:Object.fromEntries(specs.map(spec=>[spec.id,{base:spec.base,label:spec.base}])),appState:Object.fromEntries(specs.map(spec=>[spec.id,spec.state])),
  desktopPages:{columnOf:(workspace,id)=>D.scenarios[workspace]?.windows.find(column=>column.windows.some(spec=>spec.id===id))?.column||'workspace'},
  $:(selector,root=d)=>root.querySelector(selector),$$:(selector,root=d)=>[...root.querySelectorAll(selector)],escapeHtml:value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),icon:()=>'',prepareControlSemantics(){},refreshDownloadUi(){},refreshBoundNote(){},
  renderFileLocation(){},renderTerminal(){},renderAppMusic(){},musicPosition:0,musicPlaying:false,desktopStorage:{setItem(){}},queueDesktopStateBroadcast(){}});
 vm.runInContext(ui.slice(0,ui.indexOf('function appFileRows(')),context);
 vm.runInContext(slice(ui,'function renderNotes(', 'function noteFileContext('),context);
 vm.runInContext(slice(ui,'function readBrowserPage(', 'function navigateBrowser('),context);
 vm.runInContext('appWindowStore=SpatialAppTools.create();',context);
 const preview='browser--demo-site-preview',checklist='notes--demo-site-checklist';
 // Early hydration occurs while General is active and these clones still
 // contain the base New Tab/Meeting notes template.
 w.hydrateAppWindow(preview,true);w.hydrateAppWindow(checklist,true);
 w.activeWorkspace='work';w.hydrateAppWindow(preview,true);w.hydrateAppWindow(checklist,true);
 assert.equal(frames[preview].querySelector('.browser-toolbar input').value,'http://localhost:5173/','First Work entry hydrates the exact Project preview address');
 assert.equal(frames[preview].querySelector('.demo-reading-page h2').textContent,'Northstar Studio');
 assert.match(frames[preview].querySelector('.demo-reading-page p').textContent,/compact keyboard/);
 assert.equal(frames[checklist].querySelector('[data-note-title]').value,'Launch checklist','The actual editor title comes from this instance, not its base clone');
 assert.equal(frames[checklist].querySelector('.notes-layout textarea').value,D.projects.plasma.note);
 const noteModel=w.appWindowModel(checklist),browserModel=w.appWindowModel(preview);
 noteModel.notes[0].title='My edited review';noteModel.notes[0].text='Keep my own project checklist';
 A.browserAddTab(browserModel,{address:'https://example.test/review',title:'My review tab',subtitle:'Saved',intro:'Keep this page',detail:'My page notes',links:[]});
 // The production demo renderer can run on return; the saved model remains
 // authoritative over the DOM it writes before hydrateAppWindow runs again.
 vm.runInContext(slice(shell,'function renderDemoAppExample(', 'function renderWorkspaceExample('),context);
 for(const id of [preview,checklist]){w.renderDemoAppExample(id,specs.find(spec=>spec.id===id).content);w.hydrateAppWindow(id,true);}
 assert.equal(frames[checklist].querySelector('[data-note-title]').value,'My edited review');
 assert.equal(frames[checklist].querySelector('.notes-layout textarea').value,'Keep my own project checklist');
 assert.equal(frames[preview].querySelector('.browser-toolbar input').value,'https://example.test/review');assert.equal(browserModel.tabs.length,2,'Returning preserves the extra browser tab and active history');
 assert.equal(w.appWindowModel('terminal--demo-site-server').cwd,D.projects.plasma.root);assert(w.appWindowModel('terminal--demo-site-server').lines.some(line=>line.includes('Build completed')));
 assert.equal(A.current(w.appWindowModel('dolphin--demo-site-files').navigation),D.projects.plasma.root);
 const soundtrack=w.appWindowModel('elisa--demo-film-soundtrack');assert.equal(soundtrack.tracks[0].title,'Station ambience');assert.equal(soundtrack.playing,false);
 // Legacy/partial imports can retain DOM field snapshots without app models.
 // Rendering a scene before restore must not replace those saved drafts.
 frames.notes=d.querySelector('[data-app-frame="notes"]');w.appInfo.notes={};w.appState.notes='open';
 const generalNote=D.scenarios.general.windows.flatMap(column=>column.windows).find(spec=>spec.id==='notes').content;
 for(const draft of ['My saved legacy draft','']){
  w.activeWorkspace='general';w.workspaceContent={general:{note:draft}};w.workspaceAreaContents={general:{noteDraft:'Older area draft'}};
  vm.runInContext('appWindowStore=SpatialAppTools.create();',context);
  w.renderDemoAppExample('notes',generalNote);w.hydrateAppWindow('notes',true);
  assert.equal(frames.notes.querySelector('.notes-layout textarea').value,draft,'A saved base draft, including a deliberately empty one, wins over the scene');
 }
 for(const draft of ['Area-only saved draft','']){
  w.workspaceContent={};w.workspaceAreaContents={general:{noteDraft:draft}};
  vm.runInContext('appWindowStore=SpatialAppTools.create();',context);w.hydrateAppWindow('notes',true);
  assert.equal(frames.notes.querySelector('.notes-layout textarea').value,draft,'An area-only draft survives a missing app model');
 }
 for(const savedFields of [[{value:'Legacy Project draft'}],[{value:'Retained Project title'},{value:''}]]){
  w.activeWorkspace='work';w.workspaceContent={work:{note:'Workspace draft must not leak',frames:{[checklist]:savedFields}}};w.workspaceAreaContents={work:{noteDraft:'Area draft must not leak'}};
  vm.runInContext('appWindowStore=SpatialAppTools.create();',context);w.hydrateAppWindow(checklist,true);
  assert.equal(frames[checklist].querySelector('.notes-layout textarea').value,savedFields.at(-1).value,'Project field snapshots retain their own draft independently of the Workspace draft');
  if(savedFields.length>1)assert.equal(frames[checklist].querySelector('[data-note-title]').value,'Retained Project title');
 }
 w.workspaceContent={work:{frames:{[preview]:[{value:'https://example.test/retained'}],['dolphin--demo-site-files']:[{value:D.projects.plasma.root+'/src'}]}}};
 vm.runInContext('appWindowStore=SpatialAppTools.create();',context);w.hydrateAppWindow(preview,true);
 assert.equal(frames[preview].querySelector('.browser-toolbar input').value,'https://example.test/retained','A saved address survives before legacy field restoration runs');
 assert.equal(A.current(w.appWindowModel('dolphin--demo-site-files').navigation),D.projects.plasma.root+'/src','The saved File Browser location wins over its opening scene');
 w.close();console.log('Demo app hydration passed: exact first-entry Project content, retained model edits/tabs, and legacy field/area drafts (including empty text) survive independently.');
}
