'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const G=require('../dist/spatial-guide.js'),M=require('../dist/panel-widgets.js');
const model=id=>G.create({status:'active',version:9,index:G.lessons.findIndex(lesson=>lesson.id===id),done:[]});
const scene=(state,workspace='general',interacting=false)=>({state,workspace,interacting});
for(const id of ['system','apps','overview','tiling','park','unpark','desktops','project-stash','ai-context','projects','workspaces','folders','temporary-desktop','two-displays'])assert(G.lessons.some(lesson=>lesson.id===id),'Keep full desktop guidance: '+id);
assert.equal(G.chapters.length,14);assert.equal(G.chapters.find(chapter=>chapter.id==='areas').title,'Panels & widgets');
for(const id of ['apps','overview','tiling','project-app','timeline'])assert.equal(G.lessons.find(lesson=>lesson.id===id).target,'[data-panel-action="open-overview"]','Overview lessons point at the visible launcher');
assert(G.lessons.find(lesson=>lesson.id==='overview').details.includes('top-left'));assert(G.goalHints['app-open'].includes('top-left'));assert.equal(G.panelFeature('launcher'),'overview');
assert(G.lessons.find(lesson=>lesson.id==='two-displays').referenceSections.some(section=>section.text.includes('Allow display control')&&section.text.includes('current Workspace and Project')),'Keep scoped display-control guidance');
for(const lesson of G.lessons){
 const copy=[lesson.title,lesson.text,lesson.task,lesson.details,...(lesson.referenceSections||[]).flatMap(section=>[section.title,section.text])].filter(Boolean).join(' ');
 assert(!/\bAreas?\b/.test(copy),'Guide copy teaches only the current panels and widgets: '+lesson.id);
 assert(!/data-area-/.test(lesson.target||''),'Guide targets native tools: '+lesson.id);
}
const guideCss=fs.readFileSync(path.join(__dirname,'../dist/spatial-guide.css'),'utf8');assert(!/data-area-|area-window/.test(guideCss),'Guide feature gates use the native widget sources');
const arrangement=G.lessons.find(lesson=>lesson.id==='move-areas'),arrangementHelp=arrangement.referenceSections.map(section=>section.text).join(' ');
assert(arrangementHelp.includes('widget’s edit cover'));assert(arrangementHelp.includes('stationary click'));assert(arrangementHelp.includes('normal widget controls'));assert(arrangementHelp.includes('choose Spacer'));assert(arrangementHelp.includes('Add more'));assert(!arrangementHelp.includes('Flexible space before'));assert(!arrangementHelp.includes('Add flexible space'));
const fitHelp=G.lessons.find(lesson=>lesson.id==='resize-areas').referenceSections.map(section=>section.text).join(' ');assert(fitHelp.includes('fit their live content automatically'));assert(fitHelp.includes('Other widgets can temporarily use their icon'));assert(fitHelp.includes('saved expanded preference'));
const appsHelp=G.lessons.find(lesson=>lesson.id==='apps').referenceSections.map(section=>section.text).join(' ');assert(appsHelp.includes('Quick launch and Background stay visible and fixed'));assert(appsHelp.includes('only Parked scrolls'));assert(fitHelp.includes('More parked windows stay inside that viewport'),'Parked overflow remains in Apps rather than forcing the widget into its icon');
assert(G.lessons.find(lesson=>lesson.id==='unpark').details.includes('Background remains available in compact Apps'));assert(G.lessons.find(lesson=>lesson.id==='unpark').details.includes('Steam or Music'));
assert.equal(arrangement.goals.join(','),'area-moved','Widget arrangement help preserves the panel-only practice task');
for(const id of ['area-moved','apps-rail','apps-expanded']){assert(G.goalHints[id].includes('Edit layout → Panels'));assert(!/header|footer|Toolbox/.test(G.goalHints[id]),'Guide does not direct learners to removed panel chrome');}
assert.equal(G.panelTarget('two-displays','display-area-moved',{editing:false}),'.desktop-panel:not([hidden]) .desktop-panel-body');assert(G.panelTarget('two-displays','display-area-moved',{editing:true}).includes('[data-panel-action="panels"]'));
assert(arrangement.details.includes('Right-click a panel → Edit layout → Panels'));assert(!/header|footer|Toolbox/.test(arrangement.details));
{
 const guide=model('resize-areas'),start=M.defaults();G.observePanelLayout(guide,scene(start));assert(!guide.ready());
 G.observePanelLayout(guide,scene(M.updatePanel(start,'panel-left',{size:280}),'other'));assert(!guide.ready(),'Another Workspace does not finish the task');
 G.observePanelLayout(guide,scene(M.updatePanel(start,'panel-left',{size:280}),'general',true));assert(!guide.ready(),'Wait until the resize interaction finishes');
 G.observePanelLayout(guide,scene(M.updateWidget(start,'controls',{size:200})));assert(!guide.ready(),'Individual widget sizes are not panel resizing');
 G.observePanelLayout(guide,scene(M.updatePanel(start,'panel-left',{size:280})));assert(guide.ready(),'Real saved panel size change finishes resize');
}
{
 const guide=model('area-rail'),start=M.defaults();G.observePanelLayout(guide,scene(start));assert(!guide.ready());
 const icon=M.updateWidget(start,'apps',{mode:'compact'});G.observePanelLayout(guide,scene(icon));assert(guide.state.done.includes('apps-rail'));assert(!guide.ready());
 G.observePanelLayout(guide,scene(M.updateWidget(icon,'apps',{mode:'expanded'})));assert(guide.ready(),'Icon → expanded keeps existing goal identities');
}
{
 const guide=model('area-rail'),start=M.defaults();G.observePanelLayout(guide,scene(start));
 const compact=M.updatePanel(start,'panel-left',{mode:'compact'});G.observePanelLayout(guide,scene(compact));assert(guide.state.done.includes('apps-rail'));
 G.observePanelLayout(guide,scene(compact));assert(!guide.ready(),'A transient applet opening without stored mode changes cannot finish persistent expansion');
 G.observePanelLayout(guide,scene(M.updatePanel(compact,'panel-left',{mode:'expanded'})));assert(guide.ready(),'Panels → Expand panel restores the saved expanded Apps view');
 assert(G.panelTarget('area-rail','apps-expanded',{compactAppsPanel:true,appsPanel:'panel-left'}).includes('.desktop-panel-body'),'Panel presentation starts with right-clicking the visible panel');
 assert(G.panelTarget('area-rail','apps-expanded',{editing:true,compactAppsPanel:true,appsPanel:'panel-left'}).includes('[data-panel-action="compact-panel"][data-panel-id="panel-left"]'),'Edit mode targets the Apps panel’s presentation control');
 const copy=G.lessons.find(lesson=>lesson.id==='area-rail').referenceSections.map(section=>section.text).join(' ');assert(copy.includes('temporary applet popup'));assert(copy.includes('Keep expanded'));assert(copy.includes('panel’s expand control'));
}
{
 const guide=model('move-areas'),start=M.defaults();G.observePanelLayout(guide,scene(start));G.observePanelLayout(guide,scene(M.moveWidget(start,'controls','panel-right')));assert(!guide.ready(),'A widget assignment is not a whole-panel move');
 G.observePanelLayout(guide,scene(M.updatePanel(start,'panel-left',{edge:'right'})));assert(guide.ready(),'Moving the panel to another edge finishes the layout task');
 const other=model('move-areas');G.observePanelLayout(other,scene(start));G.observePanelLayout(other,scene(M.updatePanel(start,'panel-left',{edge:'bottom'})));assert(other.ready(),'Panel docking is another valid completion');
}
{
 const guide=model('hide-areas'),start=M.defaults();G.observePanelLayout(guide,scene(start));const removed=M.updateWidget(start,'notifications',{mode:'hidden'});G.observePanelLayout(guide,scene(removed));assert.equal(guide.state.hiddenArea,'notifications');assert(!guide.ready());
 G.observePanelLayout(guide,scene(M.updateWidget(removed,'notifications',{mode:'expanded'})));assert(guide.ready(),'Add the same removed widget; no retired Overview Area controls are required');
}
{
 const guide=model('hide-areas'),start=M.defaults(),id='fixture-spacer';start.panels[0].widgets.push(id);start.widgets[id]={mode:'expanded'};const isSpacer=value=>value===id;
 G.observePanelLayout(guide,{...scene(start),isSpacer});const removed=JSON.parse(JSON.stringify(start));removed.panels[0].widgets=removed.panels[0].widgets.filter(value=>value!==id);delete removed.widgets[id];
 G.observePanelLayout(guide,{...scene(removed),isSpacer});assert(!guide.state.done.includes('area-hidden'),'Removing a repeatable Spacer cannot strand a same-tool recovery task');
 const toolRemoved=M.updateWidget(removed,'controls',{mode:'hidden'});G.observePanelLayout(guide,{...scene(toolRemoved),isSpacer});assert.equal(guide.state.hiddenArea,'controls');G.observePanelLayout(guide,{...scene(M.updateWidget(toolRemoved,'controls',{mode:'expanded'})),isSpacer});assert(guide.ready());
}
{
 const guide=model('two-displays'),assignments={apps:{browser:1,notes:1},areas:{'panel-left':1,'panel-right':1}},base={count:2,slot:1,assignments,states:{browser:'open',notes:'open'},areas:[{name:'panel-left',saved:1,actual:1}],open:['browser','notes']};
 G.observeDisplays(guide,base);G.observeDisplays(guide,{...base,assignments:{...assignments,apps:{browser:2,notes:1}},open:['notes']});G.observeDisplays(guide,base);
 const moved={...assignments,areas:{'panel-left':2,'panel-right':1}};G.observeDisplays(guide,{...base,assignments:moved});assert(guide.state.done.includes('display-area-moved'),'Panel Display field satisfies the existing transfer goal');
 G.observeDisplays(guide,{...base,assignments:{...moved,apps:{browser:1,notes:2}},bounded:'browser',transferred:{notes:{target:2}},open:['browser']});G.observeDisplays(guide,{...base,assignments:moved});
 G.observeDisplays(guide,{...base,assignments:{...moved,apps:{browser:1,notes:2}},full:'browser',transferred:{notes:{target:2}},areas:[{name:'panel-right',saved:1,actual:2,hidden:false}],open:['browser']});G.observeDisplays(guide,{...base,assignments:moved});assert(guide.ready(),'Two-display lesson retains window return, maximize and fullscreen goals');
}
assert(G.panelTarget('resize-areas','',{editing:false}).includes('.desktop-panel-resizer'),'Normal mode exposes the panel resize border');assert.equal(G.panelTarget('move-areas','',{editing:false}),'.desktop-panel:not([hidden]) .desktop-panel-body','Panel moving starts with right-clicking the visible panel');assert(G.panelTarget('move-areas','',{editing:true}).includes('[data-panel-action="panels"]'),'Panel moving exposes the Panels picker before its drag handle');assert(!G.panelTarget('move-areas','',{editing:true}).includes('widget-move'));assert(!G.panelTarget('resize-areas','',{editing:true}).includes('widget-resizer'));assert(!G.panelTarget('hide-areas','',{editing:true,hiddenWidget:'notifications'}).includes('data-area'));
for(const [lesson,goal]of [['move-areas','area-moved'],['hide-areas','area-hidden'],['area-rail','apps-rail'],['two-displays','display-area-moved']]){assert.equal(G.panelTarget(lesson,goal,{editing:false}),'.desktop-panel:not([hidden]) .desktop-panel-body','Guide first highlights a visible panel');assert.equal(G.panelTarget(lesson,goal,{editing:false,contextMenuOpen:true}),'.panel-context-menu [data-panel-action="edit"]','Guide then highlights the right-click Edit layout action');}
assert(!fs.readFileSync(path.join(__dirname,'../dist/spatial-guide.js'),'utf8').includes('#panelLayoutLauncher'),'Guide never targets the removed floating layout button');
const desktop=fs.readFileSync(path.join(__dirname,'../dist/guide-desktop.js'),'utf8');
assert(desktop.includes('panels.showWidget(id)'),'Practice reveals real widgets');assert(!/areaFor|dockState|dockSizes|areaPriority|snapshotAreaLayout|showArea|layoutDockAreas|data-area-/.test(desktop),'The Guide has no retired Areas runtime dependencies');
// Reuse only the bounded panel runtime fixture setup, without its test loops or
// the full desktop startup. This exercises the actual renderer with Guide gates.
const fixture=fs.readFileSync(path.join(__dirname,'check-panel-desktop.cjs'),'utf8'),prefix=fixture.slice(0,fixture.indexOf("test('runtime-only fixture"));
const harness={require,process,console,__dirname,module:{exports:{}}};vm.runInNewContext(prefix+'\nmodule.exports={w,d,context,P};',harness,{filename:'panel-guide-fixture.cjs'});
const {w,d,context,P}=harness.module.exports;const saved=JSON.stringify(P.sessions());
w.localStorage.setItem('spatial-guide-v1',JSON.stringify({status:'active',version:9,index:G.lessons.findIndex(lesson=>lesson.id==='system'),done:[]}));
vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/spatial-guide.js'),'utf8'),context,{filename:'spatial-guide.js'});P.render();
assert.equal(d.querySelector('[data-widget-id="apps"].desktop-widget').hidden,true,'An unintroduced Apps widget has no empty allocation');assert.equal(d.querySelector('[data-widget-id="controls"].desktop-widget').hidden,false,'The System controls icon is available');assert.equal(d.querySelector('[data-panel-id="panel-right"].desktop-panel').hidden,true,'A wholly gated panel does not occupy blank space');assert.equal(JSON.stringify(P.sessions()),saved,'Guide gates do not rewrite saved widget modes');assert(w.SpatialGuide.panelWidgetAllowed('launcher'),'The launcher stays available before the Apps lesson');assert.equal(d.querySelector('[data-widget-id="launcher"].desktop-widget').hidden,false,'The early Guide keeps its Overview icon visible');
w.SpatialGuide.model.state.index=G.lessons.findIndex(lesson=>lesson.id==='ai-context');w.SpatialGuide.applyGate();P.showWidget('assistant');P.render();assert.equal(d.querySelector('[data-widget-id="assistant"].desktop-widget').hidden,false,'Assistant remains available at its source lesson');
const functions=desktop.slice(desktop.indexOf('  function visibleTarget('),desktop.indexOf('\n  async function waitForScene('));
vm.runInContext('const guide=SpatialGuide,model=guide.model;const $=(selector,root=document)=>root.querySelector(selector),$$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));'+functions,context,{filename:'guide-target-adapter.js'});
w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[this.getBoundingClientRect()];};
const targets=vm.runInContext('guideTargets(\'[data-widget-id="controls"]\')',context);assert(targets.length);assert(targets.every(element=>element.dataset.widgetId==='controls'),'Guide targets the native System controls widget');
const overviewLauncher=d.querySelector('[data-panel-action="open-overview"]');assert(overviewLauncher,'Overview has a dedicated visible launcher');assert(vm.runInContext('guideTargets(\'[data-panel-action="open-overview"]\')',context).includes(overviewLauncher),'Overview lessons highlight the visible launcher');
w.SpatialGuide.model.state.index=G.lessons.findIndex(lesson=>lesson.id==='area-rail');w.SpatialGuide.applyGate();P.reset();P.showWidget('controls');
const appletGuide=model('area-rail');G.observePanelLayout(appletGuide,scene(P.state()));P.updatePanel('panel-left',{mode:'compact'});G.observePanelLayout(appletGuide,scene(P.state()));const compactSaved=JSON.stringify(P.state());
d.querySelector('[data-widget-id="controls"] .desktop-widget-summary').click();const applet=d.querySelector('.panel-applet-popup[data-widget-id="controls"]');assert(applet,'Compact applet opens its real controls');assert.equal(JSON.stringify(P.state()),compactSaved,'Opening a live applet preserves saved panel and widget modes');G.observePanelLayout(appletGuide,scene(P.state()));assert(!appletGuide.ready(),'The Guide does not confuse a popup with persistent expansion');
applet.querySelector('[data-panel-action="pin-widget"]').click();assert.equal(P.state().panels.find(panel=>panel.widgets.includes('controls')).mode,'expanded');G.observePanelLayout(appletGuide,scene(P.state()));assert(appletGuide.ready(),'Keep expanded is an explicit persistent expansion');
P.updatePanel('panel-left',{mode:'compact'});const panelBody=d.querySelector('.desktop-panel[data-panel-id="panel-left"] .desktop-panel-body');panelBody.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:20,clientY:40}));const editLayout=d.querySelector('.panel-context-menu [data-panel-action="edit"]');assert(editLayout,'Right-clicking the panel offers Edit layout');assert.equal(vm.runInContext('panelTargetContext().contextMenuOpen',context),true,'Guide recognizes the visible context menu action');assert(vm.runInContext('guideTargets(guide.panelTarget("area-rail","apps-expanded",panelTargetContext()))',context).includes(editLayout),'Guide highlights Edit layout after the panel menu opens');editLayout.click();const panels=d.querySelector('[data-panel-action="panels"]');assert(panels,'Edit layout offers the Panels picker');panels.click();const expand=d.querySelector('.panel-choice[data-panel-id="panel-left"] [data-panel-action="compact-panel"]');assert(expand,'The Apps panel row offers its presentation toggle');assert.equal(expand.getAttribute('aria-expanded'),'false');expand.click();assert.equal(P.state().panels.find(panel=>panel.id==='panel-left').mode,'expanded','Edit layout → Panels restores the larger panel without a persistent footer');P.edit(false);
P.reset();const expandedIconGuide=model('area-rail');G.observePanelLayout(expandedIconGuide,scene(P.state()));P.updateWidget('apps',{mode:'compact'});G.observePanelLayout(expandedIconGuide,scene(P.state()));const expandedSaved=JSON.stringify(P.state());d.querySelector('.desktop-widget[data-widget-id="apps"] .desktop-widget-summary').click();const appsPopup=d.querySelector('.panel-applet-popup[data-widget-id="apps"]');assert(appsPopup,'Expanded-panel icons open the same temporary applet');assert.equal(JSON.stringify(P.state()),expandedSaved,'Expanded-panel icon click keeps stored modes unchanged too');G.observePanelLayout(expandedIconGuide,scene(P.state()));assert(!expandedIconGuide.ready());appsPopup.querySelector('[data-panel-action="pin-widget"]').click();G.observePanelLayout(expandedIconGuide,scene(P.state()));assert(expandedIconGuide.ready(),'Only explicit Keep expanded completes persistence in either panel state');
w.close();console.log('Panel Guide passed: complete desktop chapters, real panel/widget task progression, transfer/maximize/fullscreen flow, temporary rendering gates, Assistant availability and visible target adapters.');
