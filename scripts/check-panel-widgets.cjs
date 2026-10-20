const assert=require('node:assert/strict');
const M=require('../dist/panel-widgets.js');
const content=M.catalog.filter(item=>!item.repeatable);
const clone=value=>JSON.parse(JSON.stringify(value));
const options={width:1440,height:900,headerSize:0,footerSize:32,widgetHeaderSize:28,compactToolboxSize:28};
const epsilon=1e-7;
function complete(state){
  const ids=state.panels.flatMap(panel=>panel.widgets),regular=ids.filter(id=>!M.isSpacer(id));
  assert.deepEqual([...regular].sort(),content.map(item=>item.id).sort());assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual(Object.keys(state.widgets).sort(),[...ids].sort());
  for(const panel of state.panels)assert.equal(Object.hasOwn(panel,'spaceBefore'),false);
  for(const id of ids)assert.ok(M.definition(id));
}
function bounded(state,viewport){
  const result=M.layout(state,viewport),width=Math.max(1,viewport.width||1440),height=Math.max(1,viewport.height||900);
  for(const rect of Object.values(result.panels)){
    for(const value of [rect.x,rect.y,rect.width,rect.height,rect.bodyExtent,rect.contentExtent,rect.bodyEnd,rect.toolboxSize,rect.unusedExtent])assert.ok(Number.isFinite(value)&&value>=0);
    assert.ok(rect.x+rect.width<=width+epsilon);assert.ok(rect.y+rect.height<=height+epsilon);assert.ok(rect.bodyOffset+rect.bodyEnd<=rect.height+epsilon);
    assert.ok(rect.contentExtent<=rect.bodyExtent+epsilon);
    const allocations=Object.values(rect.widgets),bodyHeight=Math.max(0,rect.height-rect.bodyOffset-rect.bodyEnd-(rect.vertical?rect.toolboxSize:0)),bodyWidth=Math.max(0,rect.width-(rect.vertical?0:rect.toolboxSize));
    for(const allocation of allocations){
      for(const key of ['x','y','width','height','offset','extent','headerSize'])assert.ok(Number.isFinite(allocation[key])&&allocation[key]>=0);
      assert.ok(allocation.x+allocation.width<=bodyWidth+epsilon,'Widget exceeds body width');
      assert.ok(allocation.y+allocation.height<=bodyHeight+epsilon,'Widget exceeds body height');
      assert.ok(allocation.headerSize<=allocation.height+epsilon);
      assert.ok(['expanded','compact'].includes(allocation.mode));assert.ok(['main','footer'].includes(allocation.section));
      if(allocation.mode==='compact'){
        assert.equal(allocation.headerSize,0,'Icons never acquire a widget header');
        if(!allocation.compactView||allocation.compactView==='icon'){assert.equal(allocation.width,allocation.height,'Compact icons are square');assert.ok(allocation.width<=44+epsilon);}else assert.ok(['apps','clock'].includes(allocation.compactView));
      }else{
        assert.ok((rect.vertical?allocation.height-allocation.headerSize:allocation.width)>=M.definition(Object.keys(rect.widgets).find(id=>rect.widgets[id]===allocation)).minSize-epsilon,'Expanded widgets keep readable minimum');
        if(rect.vertical)assert.equal(allocation.width,rect.width);
      }
    }
    assert.ok(Array.isArray(rect.spaces));
    for(const space of rect.spaces){
      for(const key of ['x','y','width','height','extent'])assert.ok(Number.isFinite(space[key])&&space[key]>=0);
      assert.ok(space.x+space.width<=bodyWidth+epsilon);assert.ok(space.y+space.height<=bodyHeight+epsilon);
      assert.equal(space.extent,rect.vertical?space.height:space.width);
      assert.ok(Array.isArray(space.anchors)&&space.anchors.length>0);
      assert.equal(new Set(space.anchors).size,space.anchors.length);
      assert.ok(space.before==='$end'||Object.hasOwn(rect.widgets,space.before));
    }
    const boxes=[...allocations,...rect.spaces];
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i],b=boxes[j];
      if(a.width<=epsilon||a.height<=epsilon||b.width<=epsilon||b.height<=epsilon)continue;
      assert.ok(a.x+a.width<=b.x+epsilon||b.x+b.width<=a.x+epsilon||a.y+a.height<=b.y+epsilon||b.y+b.height<=a.y+epsilon,'Packed widget rectangles overlap');
    }
  }
  return result;
}
function legacy(version){
  const current=M.defaults();return {schema:version,panels:[
    {id:'panel-left',label:'Left panel',edge:'left',size:version===1?248:264,share:1,mode:'expanded',display:1,widgets:version===1?['apps','calendar','clock','controls']:version===2?['apps','notifications','calendar','clock','controls']:['apps','clock','notifications','calendar','controls']},
    {id:'panel-right',label:'Right panel',edge:'right',size:304,share:1,mode:'expanded',display:1,widgets:version===1?['files','assistant','notifications','clipboard','focus','devices','requests','project-plans','workspace-alerts']:current.panels[1].widgets.slice()}
  ],widgets:Object.fromEntries(content.filter(item=>item.id!=='launcher').map(item=>[item.id,{mode:item.id==='clock'&&version<3?'compact':item.id==='assistant'&&version===1?'expanded':item.defaultMode,size:0}]))};
}
const initial=M.defaults(),before=JSON.stringify(initial);complete(initial);
assert.equal(initial.schema,5);assert.deepEqual(initial.panels[0].widgets,['apps','clock','launcher','notifications','calendar','controls']);
const oldFour=clone(initial);oldFour.schema=4;assert.deepEqual(M.normalize(oldFour),initial);const customFour=clone(oldFour);customFour.panels[0].size=311;customFour.widgets.assistant.mode='expanded';assert.equal(M.normalize(customFour).panels[0].size,311);assert.equal(M.normalize(customFour).widgets.assistant.mode,'expanded');
for(const schema of [4,5]){
  const previous=clone(initial);previous.schema=schema;previous.panels[0].size=232;
  assert.deepEqual(M.normalize(previous),initial,'Only the untouched previous default adopts the narrower layout');
  for(const change of [state=>state.panels[0].size=296,state=>state.panels[0].label='Personal',state=>state.panels[0].widgets.reverse(),state=>state.widgets.controls.mode='expanded',state=>state.widgets.apps.size=480]){
    const customized=clone(previous);change(customized);assert.equal(M.migrateDefaults(customized),customized,'Custom panel layouts are not reset by the default update');
    const normalized=M.normalize(customized);assert.equal(normalized.panels[0].size,customized.panels[0].size);assert.equal(normalized.widgets.controls.mode,customized.widgets.controls.mode);
  }
}
assert.equal(initial.widgets.clock.mode,'expanded');assert.equal(initial.widgets.assistant.mode,'compact');assert.deepEqual(M.normalize(initial),initial);
assert.equal(initial.widgets.launcher.mode,'compact');assert.equal(M.definitions.launcher.title,'Overview');assert.equal(M.definitions.launcher.minSize,44);assert.equal(M.definitions.launcher.preferredSize,44);assert.equal(M.compactDefinitions.launcher.minSize,44);
assert.equal(M.updateWidget(initial,'launcher',{mode:'expanded'}).widgets.launcher.mode,'compact','Overview remains a single icon');
let savedBeforeLauncher=M.addSpacer(initial,'panel-left',2);savedBeforeLauncher=M.updatePanel(savedBeforeLauncher,'panel-left',{size:317,share:2});savedBeforeLauncher=M.updateWidget(savedBeforeLauncher,'apps',{size:491});savedBeforeLauncher=M.updateWidget(savedBeforeLauncher,'calendar',{mode:'expanded',size:211});
savedBeforeLauncher.panels[0].widgets=savedBeforeLauncher.panels[0].widgets.filter(id=>id!=='launcher');delete savedBeforeLauncher.widgets.launcher;
const addedLauncher=M.normalize(savedBeforeLauncher);complete(addedLauncher);assert.deepEqual(addedLauncher.panels[0].widgets,['apps','clock','spacer-1','launcher','notifications','calendar','controls']);
assert.deepEqual(addedLauncher.panels.map(panel=>({...panel,widgets:panel.widgets.filter(id=>id!=='launcher')})),savedBeforeLauncher.panels,'Adding Overview preserves saved panel state, order and Spacer instances');
assert.deepEqual(Object.fromEntries(Object.entries(addedLauncher.widgets).filter(([id])=>id!=='launcher')),savedBeforeLauncher.widgets,'Adding Overview preserves every existing widget preference');assert.deepEqual(M.normalize(addedLauncher),addedLauncher);
const placedLauncher=M.updateWidget(M.moveWidget(initial,'launcher','panel-right',1),'launcher',{mode:'hidden',size:77});assert.deepEqual(M.normalize(placedLauncher),placedLauncher,'Existing Overview placement and hidden preference survive normalization');
for(const version of [1,2,3]){
  const old=legacy(version);assert.deepEqual(M.migrateDefaults(old),initial);assert.deepEqual(M.normalize(old),initial);
  for(const change of [value=>value.panels[0].size++,value=>value.panels[0].share=2,value=>value.panels[0].label='Mine',value=>value.panels[0].edge='top',value=>value.panels[0].mode='compact',value=>value.panels[0].display=2,value=>value.panels[0].widgets.reverse(),value=>value.widgets.clock.mode=value.schema===3?'compact':'expanded',value=>value.widgets.apps.size=1,value=>value.extra=true,value=>value.widgets.apps.extra=true]){
    const custom=clone(old);change(custom);assert.equal(M.migrateDefaults(custom),custom);const normalized=M.normalize(custom);
    assert.equal(normalized.panels[0].size,custom.panels[0].size);assert.deepEqual(normalized.panels[0].widgets.filter(id=>id!=='launcher'),custom.panels[0].widgets);assert.equal(normalized.widgets.clock.mode,custom.widgets.clock.mode);
  }
}
for(const malformed of [null,{}, {panels:[]},{panels:[null,false]},{panels:[{id:'__proto__',widgets:['__proto__','apps','apps']}]}])complete(M.normalize(malformed));
const repaired=M.normalize({panels:[{id:'same',widgets:['apps']},{id:'same',mode:'hidden',widgets:['apps','clock']}],widgets:{calendar:{mode:'hidden',size:193}}});
complete(repaired);assert.equal(new Set(repaired.panels.map(panel=>panel.id)).size,2);assert.equal(repaired.widgets.calendar.mode,'hidden');assert.deepEqual(M.normalize(repaired),repaired);
const longDuplicateId='saved-'.padEnd(64,'x'),longDuplicatePanels=M.normalize({panels:[{id:longDuplicateId,widgets:['apps']},{id:longDuplicateId,widgets:['clock']},{id:longDuplicateId,widgets:[]}]});
assert.equal(new Set(longDuplicatePanels.panels.map(panel=>panel.id)).size,3);for(const panel of longDuplicatePanels.panels)assert.ok(panel.id.length<=64);assert.deepEqual(M.normalize(longDuplicatePanels),longDuplicatePanels,'Repairing duplicate maximum-length panel IDs is stable across reloads');
let moved=M.moveWidget(initial,'calendar','panel-right',0);complete(moved);assert.equal(moved.panels[1].widgets[0],'calendar');assert.equal(JSON.stringify(initial),before);
assert.deepEqual(M.moveWidget(initial,'missing','panel-left',0),initial);assert.deepEqual(M.moveWidget(initial,'apps','missing',0),initial);
let added=M.addPanel(moved,'bottom'),extra=added.panels.at(-1).id;added=M.moveWidget(added,'calendar',extra,0);complete(added);assert.equal(M.removePanel(added,extra).panels.length,2);
let one=M.removePanel(initial,'panel-right');complete(one);assert.equal(M.removePanel(one,one.panels[0].id).panels.length,1);

for(const height of [768,900]){
  const result=bounded(initial,{...options,height}),left=result.panels['panel-left'],right=result.panels['panel-right'];
  assert.equal(left.widgets.apps.mode,'expanded');assert.equal(left.widgets.clock.mode,'expanded');assert.equal(left.widgets.clock.height-left.widgets.clock.headerSize,56,'Clock keeps its natural expanded size');
  assert.equal(right.widgets.files.mode,'compact');assert.equal(right.widgets.assistant.mode,'compact');
  assert.equal(left.widgets.launcher.x,0);assert.equal(left.widgets.launcher.y,left.widgets.notifications.y);assert.equal(left.widgets.notifications.y,left.widgets.calendar.y);assert.equal(left.widgets.calendar.y,left.widgets.controls.y,'Overview and the existing bottom icons share one row');
  assert.equal(left.widgets.launcher.width,44);assert.equal(left.widgets.launcher.height,44);assert.equal(left.widgets.notifications.x-left.widgets.launcher.x,48);
  assert.equal(left.widgets.calendar.x-left.widgets.notifications.x,48);assert.equal(left.widgets.controls.x-left.widgets.calendar.x,48);
  assert.equal(left.widgets.notifications.width,44);assert.equal(left.contentExtent,left.bodyExtent);
  assert.ok(left.widgets.apps.height>left.widgets.clock.height*3,'Apps uses the remaining panel space');
}
for(const compactHeaders of [false,true]){
  const result=bounded(initial,{...options,headerSize:compactHeaders?30:0,compactHeaders});
  assert.equal(result.panels['panel-left'].widgets.calendar.headerSize,0);
  assert.equal(result.panels['panel-left'].widgets.calendar.height,44);
  assert.equal(result.panels['panel-left'].widgets.apps.headerSize,28);
}
let icons=M.removePanel(initial,'panel-right');for(const item of content)icons=M.updateWidget(icons,item.id,{mode:'compact',size:0});
const packed=bounded(icons,options).panels['panel-left'];assert.equal(Object.keys(packed.widgets).length,14);
const ordered=icons.panels[0].widgets;assert.equal(packed.widgets[ordered[0]].y,packed.widgets[ordered[3]].y);assert.equal(packed.widgets[ordered[4]].y,48);
assert.equal(packed.widgets[ordered[7]].section,'main');assert.equal(packed.widgets[ordered[8]].section,'footer');assert.equal(packed.widgets[ordered[8]].y,packed.bodyExtent-92);assert.equal(packed.contentExtent,packed.bodyExtent);
const railState=M.updatePanel(icons,'panel-left',{mode:'compact'}),rail=bounded(railState,options).panels['panel-left'];
assert.equal(rail.width,56);for(const item of Object.values(rail.widgets)){if(item.compactView==='icon'){assert.equal(item.x,6);assert.equal(item.width,44);}else{assert.equal(item.x,0);assert.equal(item.width,56);}}
assert.equal(rail.contentExtent,rail.bodyExtent);assert.equal(rail.widgets.clock.height,48);assert.equal(rail.widgets.controls.height,44);assert.ok(rail.widgets.apps.height>44);
assert.deepEqual(railState.widgets,icons.widgets,'Panel compaction preserves every stored widget mode');
for(const edge of ['top','bottom']){
  const horizontal=M.updatePanel(icons,'panel-left',{edge,size:180});const result=bounded(horizontal,options).panels['panel-left'];
  let previous=-48,section='main';for(const id of horizontal.panels[0].widgets){const item=result.widgets[id];if(item.section===section)assert.equal(item.x-previous,48);else assert.ok(item.x-previous>=48);previous=item.x;section=item.section;assert.equal(item.width,44);}
}
let huge=M.updateWidget(initial,'apps',{size:1600});const fitted=bounded(huge,{...options,height:400,preferredWidget:'apps'});
assert.equal(fitted.panels['panel-left'].widgets.apps.mode,'expanded');assert.equal(fitted.panels['panel-left'].widgets.clock.mode,'expanded','Oversized preferences do not collapse unrelated readable widgets');
const expandedDefault=M.updatePanel(initial,'panel-right',{mode:'expanded'});
let pair=M.updateWidget(expandedDefault,'assistant',{mode:'expanded',size:1600});pair=M.updateWidget(pair,'files',{size:1600});
const pairLayout=bounded(pair,{...options,height:620,preferredWidget:'files'}).panels['panel-right'];assert.equal(pairLayout.widgets.files.mode,'expanded');assert.equal(pairLayout.widgets.assistant.mode,'expanded');
const actualAssistant=pairLayout.widgets.assistant.height-pairLayout.widgets.assistant.headerSize;
assert.equal(M.resizeLimits(pair,'assistant',{...options,height:620,preferredWidget:'files'}).value,actualAssistant,'Resize begins at actual rendering');

// Boundary resize exchanges space with the immediately adjacent expanded
// widget. Neither widget changes mode, and no unrelated preference is touched.
const limits=M.resizeLimits(initial,'apps',options);assert.equal(limits.neighborId,null);assert.equal(limits.max,limits.value,'Apps cannot inflate the fixed-size Clock');
const originalLeft=M.layout(initial,options).panels['panel-left'];
for(const delta of [-16,16,1600]){
  const resized=M.resizeWidget(initial,'apps',limits.value+delta,options),expected=Math.max(limits.min,Math.min(limits.max,limits.value+delta));
  assert.equal(resized.widgets.apps.size,expected);
  for(const item of content){assert.equal(resized.widgets[item.id].mode,initial.widgets[item.id].mode);if(item.id!=='apps')assert.deepEqual(resized.widgets[item.id],initial.widgets[item.id]);}
  const result=bounded(resized,{...options,preferredWidget:'apps'}).panels['panel-left'];
  assert.ok(Math.abs(result.widgets.apps.height-result.widgets.apps.headerSize-expected)<epsilon);
  assert.equal(result.widgets.clock.height-result.widgets.clock.headerSize,56);
  for(const id of ['clock','notifications','calendar','controls'])assert.deepEqual(result.widgets[id],originalLeft.widgets[id],'Fixed footer stays anchored while Apps changes size');
  assert.deepEqual(M.normalize(resized),resized);
}
for(const mode of ['compact','hidden']) {
  const changed=M.updateWidget(initial,'apps',{mode}),result=bounded(changed,options).panels['panel-left'];
  for(const id of ['clock','notifications','calendar','controls'])assert.deepEqual(result.widgets[id],originalLeft.widgets[id],'Footer stays anchored when Apps is '+mode);
}
const clockLimits=M.resizeLimits(initial,'clock',options);assert.equal(clockLimits.neighborId,'apps');
const enlargedClock=M.resizeWidget(initial,'clock',72,options);assert.equal(enlargedClock.widgets.clock.size,72);assert.equal(enlargedClock.widgets.apps.size,clockLimits.neighborValue-16);bounded(enlargedClock,options);
const fileLimits=M.resizeLimits(expandedDefault,'files',options);assert.equal(fileLimits.neighborId,null);assert.equal(fileLimits.max,fileLimits.value,'A single expanded widget cannot steal icon space');
assert.equal(M.resizeWidget(expandedDefault,'files',1600,options).widgets.files.size,fileLimits.value);
const smaller=M.resizeWidget(expandedDefault,'files',fileLimits.value-16,options),smallerLimits=M.resizeLimits(smaller,'files',options);
assert.equal(smallerLimits.value,fileLimits.value-16);assert.equal(smallerLimits.max,fileLimits.value,'Only the newly unused space is available for growth');
assert.deepEqual(M.resizeWidget(initial,'assistant',200,options),initial,'Resizing an icon never expands it implicitly');
assert.deepEqual(M.resizeWidget(initial,'apps',NaN,options),initial);assert.deepEqual(M.resizeWidget(initial,'missing',100,options),initial);
assert.equal(M.resizeLimits(initial,'clipboard',options).visible,false);
assert.equal(M.resizeWidget(huge,'apps',0,options).widgets.apps.size,0);
const pairOptions={...options,height:620,preferredWidget:'files'},pairLimits=M.resizeLimits(pair,'assistant',pairOptions);
const pairResize=M.resizeWidget(pair,'assistant',pairLimits.value+16,pairOptions),pairAfter=bounded(pairResize,{...pairOptions,preferredWidget:'assistant'}).panels['panel-right'];
assert.equal(pairResize.widgets.assistant.size,pairLimits.value+16);assert.ok(Math.abs(pairAfter.widgets.assistant.height-pairAfter.widgets.assistant.headerSize-(pairLimits.value+16))<epsilon);
assert.equal(pairResize.widgets.files.mode,'expanded');assert.equal(pairResize.widgets.assistant.mode,'expanded');
for(const height of [2160,4000,20000]){
  const viewport={...options,height},current=M.resizeLimits(initial,'apps',viewport);
  const resized=M.resizeWidget(initial,'apps',current.value-16,viewport),result=bounded(resized,viewport).panels['panel-left'];assert.equal(resized.widgets.apps.size,current.value-16);assert.ok(Math.abs(result.widgets.apps.height-result.widgets.apps.headerSize-current.value+16)<epsilon);
}
let sharing=M.addPanel(initial,'left');extra=sharing.panels.at(-1).id;sharing=M.moveWidget(sharing,'calendar',extra,0);sharing=M.updatePanel(sharing,extra,{share:3,size:200});
const shared=bounded(sharing,options);assert.equal(shared.panels[extra].height,shared.panels['panel-left'].height*3);
assert.equal(Object.keys(M.layout(initial,{...options,fullscreen:true}).panels).length,0);assert.equal(Object.keys(bounded(initial,{...options,display:2,displays:2,fullscreen:true}).panels).length,2);
// Compact panels are a single live task strip and tray, never wrapped applets
// or an expanded panel's header/footer stacked into the thin cross dimension.
const compactLeft=M.updatePanel(initial,'panel-left',{mode:'compact'});
const compactSnapshot=JSON.stringify(compactLeft);
for(const edge of ['left','right','top','bottom'])for(const headerSize of [0,30]){
  const state=M.updatePanel(compactLeft,'panel-left',{edge}),rect=bounded(state,{...options,width:1200,height:900,headerSize}).panels['panel-left'];
  assert.equal(rect.compact,true);assert.equal(rect.bodyOffset,headerSize);assert.equal(rect.bodyEnd,0);assert.equal(rect.toolboxSize,28);
  assert.equal(rect.vertical?rect.width:rect.height,rect.vertical?56:56+headerSize);
  const list=state.panels.find(panel=>panel.id==='panel-left').widgets.filter(id=>state.widgets[id].mode!=='hidden');let end=0;
  for(const id of list){const item=rect.widgets[id],start=rect.vertical?item.y:item.x;assert.ok(start>=end-epsilon,'Compact applets stay in a single ordered axis');end=start+(rect.vertical?item.height:item.width);assert.equal(item.headerSize,0);}
  const apps=rect.widgets.apps,clock=rect.widgets.clock,controls=rect.widgets.controls;
  assert.ok((rect.vertical?apps.height:apps.width)>44,'Task manager uses the free axis');
  assert.equal(rect.vertical?clock.height:clock.width,rect.vertical?48:80);
  assert.equal(rect.vertical?controls.height:controls.width,44);
  assert.ok(Math.abs(end-rect.bodyExtent)<epsilon,'Tray ends immediately before the toolbox');
}
const customized=bounded(compactLeft,{...options,compactSizes:{clock:{vertical:60,horizontal:120},apps:{minSize:80}}}).panels['panel-left'];
assert.equal(customized.widgets.clock.height,60);assert.equal(customized.widgets.controls.height,44);
assert.equal(JSON.stringify(compactLeft),compactSnapshot,'Live compact allocation preserves every expanded preference');
assert.deepEqual(M.layout(initial,{...options,compactSizes:{clock:1000,apps:1000}}).panels['panel-left'].widgets,M.layout(initial,options).panels['panel-left'].widgets,'Compact overrides never alter an expanded panel');
const clockIcon=M.layout(M.updateWidget(initial,'clock',{mode:'compact'}),options).panels['panel-left'].widgets.clock;
assert.equal(clockIcon.compactView,'icon');assert.equal(clockIcon.width,44);assert.equal(clockIcon.height,44,'Clock is a normal icon in a mixed expanded panel');
const restoredState=M.updatePanel(compactLeft,'panel-left',{mode:'expanded'});assert.deepEqual(restoredState,initial);assert.deepEqual(M.layout(restoredState,options),M.layout(initial,options));
assert.equal(M.compactDefinitions.controls.view,'icon');assert.equal(M.compactDefinitions.controls.grow,0);for(const id of ['controls','calendar','notifications']){const item=M.layout(compactLeft,options).panels['panel-left'].widgets[id];assert.equal(item.compactView,'icon');assert.equal(item.width,44);assert.equal(item.height,44);}
assert.equal(M.compactDefinitions.apps.grow,M.definitions.apps.grow);assert.equal(M.compactDefinitions.clock.vertical,48);assert.equal(M.compactDefinitions.controls.horizontal,44);
assert.equal(M.resizeLimits(compactLeft,'apps',options).resizable,false,'Live compact task content does not mutate persisted widget sizes');

// Both widths share one logical order and native-content/system-footer split.
for(const mode of ['expanded','compact']) {
  const state=M.updatePanel(initial,'panel-left',{mode}),rect=bounded(state,options).panels['panel-left'];
  assert.deepEqual(Object.keys(rect.widgets),state.panels[0].widgets);
  assert.equal(rect.widgets.apps.section,'main');
  for(const id of ['clock','notifications','calendar','controls'])assert.equal(rect.widgets[id].section,'footer');
  const shortened=M.updateWidget(state,'apps',{size:280}),short=bounded(shortened,options).panels['panel-left'];
  for(const id of ['clock','notifications','calendar','controls'])assert.deepEqual(short.widgets[id],rect.widgets[id],'System footer is stable in '+mode);
  assert.ok(short.unusedExtent>0);
  if(mode==='compact')assert.equal(short.widgets.apps.height,280,'Compact native Apps honors the same stored preference');
  const noApps=M.updateWidget(state,'apps',{mode:'hidden'}),onlySystem=bounded(noApps,options).panels['panel-left'];
  assert.equal(onlySystem.widgets.clock.section,'footer');
  assert.deepEqual(onlySystem.widgets.clock,rect.widgets.clock,'Hiding native Apps preserves the footer in '+mode);
}
for(const mode of ['expanded','compact']) {
  let right=M.updatePanel(initial,'panel-right',{mode});right=M.updateWidget(right,'files',{mode:'compact'});
  const rect=bounded(right,options).panels['panel-right'];
  assert.equal(rect.widgets.files.section,'main');assert.equal(rect.widgets.assistant.section,'main');
  assert.equal(rect.widgets.files.y,0);assert.ok(rect.widgets.assistant.y<100,'Files and Assistant remain at the top');
}
const customStructure=M.moveWidget(M.updateWidget(initial,'clipboard',{mode:'compact'}),'clipboard','panel-left',0);
const wideStructure=bounded(customStructure,options).panels['panel-left'];
const thinStructure=bounded(M.updatePanel(customStructure,'panel-left',{mode:'compact'}),options).panels['panel-left'];
assert.deepEqual(Object.keys(wideStructure.widgets),Object.keys(thinStructure.widgets));
for(const id of Object.keys(wideStructure.widgets))assert.equal(wideStructure.widgets[id].section,thinStructure.widgets[id].section,'Custom native order keeps the same functional boundary');
const normalThin=bounded(compactLeft,options).panels['panel-left'],editThin=bounded(compactLeft,{...options,headerSize:30}).panels['panel-left'];
assert.equal(editThin.bodyOffset,30);assert.equal(editThin.toolboxSize,28);assert.equal(normalThin.bodyExtent-editThin.bodyExtent,30);
assert.equal(JSON.stringify(compactLeft),compactSnapshot,'Edit geometry does not alter the saved layout');

// Normal panels reserve just their small footer; edit controls reserve both.
assert.equal(initial.panels[0].size,224);assert.equal(initial.panels[1].size,280);assert.equal(initial.panels[1].mode,'compact');
assert.equal(initial.widgets.files.mode,'expanded','Whole-panel restore retains the Files widget state');
const center=M.layout(initial,{...options,width:1200});assert.equal(1200-center.insets.left-center.insets.right,920);
const restored=M.layout(M.updatePanel(initial,'panel-right',{mode:'expanded'}),options).panels['panel-right'];assert.equal(restored.width,280);assert.equal(restored.widgets.files.mode,'expanded');
for(const width of [600,699,700]){const result=bounded(initial,{...options,width});assert.equal(result.panels['panel-left'].width,224);assert.equal(result.panels['panel-left'].compact,false,'Actual capacity permits the panel below the old breakpoint');}
for(const headerSize of [0,30])for(const edge of ['left','right','top','bottom']){
  let state=M.updatePanel(initial,'panel-left',{edge,mode:'compact'});const result=bounded(state,{...options,headerSize}),rect=result.panels['panel-left'];
  assert.equal(rect.bodyOffset,headerSize);assert.equal(rect.bodyEnd,0);assert.equal(rect.toolboxSize,28);
  assert.equal(rect.vertical?rect.width:rect.height,rect.vertical?56:56+headerSize,'Edit header leaves a full thin native body');
  assert.equal(rect.widgets.apps.compactView,'apps');assert.equal(rect.widgets.clock.compactView,'clock');
  if(edge==='top'||edge==='bottom'){assert.equal(rect.widgets.clock.width,80);assert.equal(rect.widgets.controls.width,44);assert.equal(rect.widgets.apps.height,56);}
  else{assert.equal(rect.widgets.clock.height,48);assert.equal(rect.widgets.controls.height,44);assert.equal(rect.widgets.apps.width,56);}
}
for(const [width,height]of [[1,1],[80,40],[320,240],[1440,768]])for(const headerSize of [0,30,60])for(const footerSize of [0,32,60])bounded(icons,{...options,width,height,headerSize,footerSize});
const focused=M.layout(pair,{...options,height:620,preferredWidget:'assistant'}).panels['panel-right'];
const reloaded=M.layout(pair,{...options,height:620}).panels['panel-right'];
assert.deepEqual(focused.widgets,reloaded.widgets,'Saved preference fitting does not depend on transient focus');
const resizedApps=M.resizeWidget(initial,'apps',280,options),leftResized=bounded(resizedApps,options).panels['panel-left'];
assert.equal(leftResized.widgets.clock.y,originalLeft.widgets.clock.y);assert.equal(leftResized.widgets.controls.y,originalLeft.widgets.controls.y);
assert.ok(leftResized.unusedExtent>0);assert.equal(M.resizeLimits(resizedApps,'apps',options).max,limits.value,'Unused space above the anchored footer remains resizable');

// Spacer is one repeatable catalog choice, represented by ordinary movable
// instances in panel order. Removing it cannot resurrect an unassigned instance.
assert.equal(M.catalog.length,15);assert.equal(M.catalog.filter(item=>item.id==='spacer').length,1);assert.equal(M.catalog.at(-1).repeatable,true);
assert.equal(Object.keys(initial.widgets).length,14);assert.equal(M.definition('spacer-21').title,'Spacer');assert.equal(M.isSpacer('spacer-1'),true);assert.equal(M.isSpacer('spacer'),false);assert.equal(M.isSpacer('spacer-0'),false);assert.equal(M.definition('bogus'),undefined);
let withSpace=M.addSpacer(initial,'panel-left',1),spaceId=withSpace.panels[0].widgets[1];
assert.equal(spaceId,'spacer-1');assert.deepEqual(withSpace.widgets[spaceId],{mode:'expanded',size:0});complete(withSpace);assert.equal(JSON.stringify(initial),before);
assert.deepEqual(M.normalize(clone(withSpace)),withSpace);assert.deepEqual(M.removeSpacer(withSpace,spaceId),initial);assert.deepEqual(M.normalize(M.removeSpacer(withSpace,spaceId)),initial);
assert.deepEqual(M.addSpacer(initial,'missing',0),initial);assert.deepEqual(M.removeSpacer(initial,'apps'),initial);
let twoSpaces=M.addSpacer(withSpace,'panel-left'),secondId=twoSpaces.panels[0].widgets.at(-1);assert.notEqual(secondId,spaceId);complete(twoSpaces);
const movedSpace=M.moveWidget(twoSpaces,spaceId,'panel-right',1);assert.equal(movedSpace.panels[1].widgets[1],spaceId);assert.ok(!movedSpace.panels[0].widgets.includes(spaceId));assert.equal(movedSpace.widgets[spaceId].mode,'expanded');complete(movedSpace);
const movedContent=M.moveWidget(withSpace,'clock','panel-right',0);assert.equal(movedContent.panels[0].widgets[1],spaceId,'A real Spacer stays at its original position when its following content moves');
let migrated=clone(initial);migrated.schema=4;migrated.panels[0].spaceBefore=['clock','calendar','clock','bogus','files','$end'];migrated.widgets.clock.size=71;
const legacySpaces=M.normalize(migrated);assert.deepEqual(legacySpaces.panels[0].widgets,['apps','spacer-1','clock','launcher','notifications','spacer-2','calendar','controls','spacer-3']);assert.equal(legacySpaces.widgets.clock.size,71);assert.deepEqual(M.normalize(legacySpaces),legacySpaces);complete(legacySpaces);
const colliding=clone(withSpace);colliding.panels[0].spaceBefore=['clock'];assert.ok(M.normalize(colliding).panels[0].widgets.includes('spacer-2'),'Migration avoids existing instance IDs');
const malformedDynamic=M.normalize({panels:[{widgets:['apps','spacer','spacer-0','spacer-1','spacer-1','spacer-99']}],widgets:{'spacer-99':{mode:'expanded',size:17},'spacer-70':{mode:'expanded',size:0}}});complete(malformedDynamic);assert.equal(Object.hasOwn(malformedDynamic.widgets,'spacer-70'),false);assert.equal(malformedDynamic.widgets['spacer-99'].size,17);
for(const mode of ['expanded','compact'])for(const edge of ['left','right','top','bottom'])for(const headerSize of [0,30]){
  const state=M.updatePanel(M.updatePanel(withSpace,'panel-left',{mode,edge}),'panel-right',{mode:'hidden'}),viewport={...options,headerSize};
  const rect=bounded(state,viewport).panels['panel-left'],space=rect.widgets[spaceId];assert.equal(space.spacer,true);assert.equal(space.headerSize,0);assert.equal(space.mode,'expanded');assert.ok(space.extent>0);assert.deepEqual(rect.spaces,[]);
  assert.equal(rect.vertical?space.width:space.height,rect.vertical?rect.width:rect.height-rect.bodyOffset-rect.bodyEnd);
  const clock=rect.widgets.clock;assert.ok((rect.vertical?space.y+space.height:space.x+space.width)<=(rect.vertical?clock.y:clock.x)+epsilon);
  const larger={...viewport,[rect.vertical?'height':'width']:viewport[rect.vertical?'height':'width']+200};const more=bounded(state,larger).panels['panel-left'];assert.ok(Math.abs(more.widgets[spaceId].extent-space.extent-200)<epsilon,'Spacer absorbs added axis capacity');
  assert.deepEqual(state.widgets,withSpace.widgets,'Allocation preserves widget modes/preferences');
}
const plainGap=bounded(withSpace,options).panels['panel-left'];assert.equal(plainGap.widgets.apps.height-plainGap.widgets.apps.headerSize,M.definitions.apps.preferredSize,'Spacer receives unused Apps flex');assert.equal(plainGap.unusedExtent,0);
const twoRects=bounded(twoSpaces,options).panels['panel-left'];assert.equal(twoRects.widgets[spaceId].extent,twoRects.widgets[secondId].extent);assert.ok(twoRects.widgets.controls.y<plainGap.widgets.controls.y,'Trailing Spacer overrides implicit footer anchoring');
const splitIndex=initial.panels[0].widgets.indexOf('calendar'),split=M.addSpacer(initial,'panel-left',splitIndex),splitId=split.panels[0].widgets[splitIndex],splitRect=bounded(split,options).panels['panel-left'];assert.ok(splitRect.widgets.notifications.y+44<=splitRect.widgets[splitId].y+epsilon);assert.ok(splitRect.widgets[splitId].y+splitRect.widgets[splitId].height<=splitRect.widgets.calendar.y+epsilon,'Spacer separates icon runs');
const hiddenAnchor=M.updateWidget(legacySpaces,'calendar',{mode:'hidden'}),hiddenRect=bounded(hiddenAnchor,options).panels['panel-left'];assert.ok(hiddenRect.widgets['spacer-2']);assert.equal(hiddenRect.widgets.calendar,undefined);
let onlySpace=withSpace;for(const id of content.map(item=>item.id))onlySpace=M.updateWidget(onlySpace,id,{mode:'hidden'});const emptyRect=bounded(onlySpace,options).panels['panel-left'];assert.deepEqual(Object.keys(emptyRect.widgets),[spaceId]);assert.equal(emptyRect.widgets[spaceId].extent,emptyRect.bodyExtent);
const noSpacer=M.updateWidget(withSpace,spaceId,{mode:'hidden'});assert.equal(bounded(noSpacer,options).panels['panel-left'].widgets[spaceId],undefined);assert.equal(M.resizeLimits(withSpace,spaceId,options).resizable,false);
const panelRemoved=M.removePanel(movedSpace,'panel-right');assert.ok(panelRemoved.panels[0].widgets.includes(spaceId),'Deleting a panel redistributes its real Spacer along with content');complete(panelRemoved);
for(const mode of ['expanded','compact'])for(const edge of ['left','right','top','bottom'])for(const [width,height]of [[1,1],[80,40],[320,240]])bounded(M.updatePanel(twoSpaces,'panel-left',{mode,edge}),{...options,width,height,headerSize:30});
assert.equal(bounded(withSpace,{...options,height:1}).panels['panel-left'].widgets[spaceId].extent,0);

// Live measurements describe natural CONTENT size, so a frame either fits
// its actual content or becomes a popup icon, preserving the saved preference.
const measuredOptions={...options,widgetSizes:{apps:{vertical:380,horizontal:420},clock:56}};
const natural=bounded(withSpace,measuredOptions).panels['panel-left'];assert.equal(natural.widgets.apps.mode,'expanded');assert.equal(natural.widgets.apps.height-natural.widgets.apps.headerSize,380);assert.ok(natural.widgets[spaceId].extent>0);
const naturalSaved=M.updateWidget(withSpace,'apps',{size:1600});assert.equal(bounded(naturalSaved,measuredOptions).panels['panel-left'].widgets.apps.height,natural.widgets.apps.height,'Live natural content overrides stale arbitrary size preference');assert.equal(naturalSaved.widgets.apps.size,1600);
const crowdedMeasured=bounded(initial,{...options,height:360,widgetSizes:{apps:380,clock:56}}).panels['panel-left'];assert.equal(crowdedMeasured.widgets.apps.mode,'compact');assert.equal(initial.widgets.apps.mode,'expanded');assert.equal(crowdedMeasured.widgets.clock.mode,'expanded');
const opened=bounded(pair,{...options,height:620,widgetSizes:{files:320,assistant:300},preferredWidget:'assistant'}).panels['panel-right'];assert.equal(opened.widgets.assistant.mode,'expanded');assert.equal(opened.widgets.assistant.height-opened.widgets.assistant.headerSize,300);assert.equal(opened.widgets.files.mode,'compact');assert.equal(pair.widgets.files.mode,'expanded');
const unfitCross=bounded(M.updatePanel(initial,'panel-left',{edge:'bottom',size:100}),{...options,widgetSizes:{apps:{vertical:380,horizontal:100000}}}).panels['panel-left'];assert.equal(unfitCross.widgets.apps.mode,'compact','Unfit cross-axis measurement sentinel opens content via icon');
const compactFits=bounded(compactLeft,{...options,compactSizes:{apps:400}}).panels['panel-left'];assert.equal(compactFits.widgets.apps.compactView,'apps');assert.ok(compactFits.widgets.apps.height>=400);
const compactOverflow=bounded(compactLeft,{...options,height:400,compactSizes:{apps:{vertical:400,minSize:400}}}).panels['panel-left'];assert.equal(compactOverflow.widgets.apps.compactView,'icon');assert.equal(compactOverflow.widgets.apps.width,44);assert.equal(compactOverflow.widgets.apps.height,44);assert.deepEqual(compactLeft.widgets,initial.widgets);

// Optional spacing must yield before a readable widget disappears. This
// applies both to bare panel gaps and repeated empty Spacer instances.
const fittingOnlyLeft=M.updatePanel(initial,'panel-right',{mode:'hidden'});
for(const height of [232,236,240,248]){
  const rect=bounded(fittingOnlyLeft,{width:1440,height}).panels['panel-left'];
  assert.equal(rect.widgets.apps.mode,'expanded','Apps stays readable when its content fits without decorative gaps');
  assert.equal(rect.widgets.clock.mode,'expanded','Clock stays readable when optional spacing is the only shortage');
  assert.ok(rect.widgets.apps.height>=140-epsilon);assert.ok(rect.widgets.clock.height>=48-epsilon);
}
let zeroSpacePressure=fittingOnlyLeft;for(let i=0;i<12;i++)zeroSpacePressure=M.addSpacer(zeroSpacePressure,'panel-left',1);
const fitThroughSpaces=bounded(zeroSpacePressure,{width:1440,height:232}).panels['panel-left'];
assert.equal(fitThroughSpaces.widgets.apps.mode,'expanded');assert.equal(fitThroughSpaces.widgets.clock.mode,'expanded');
for(const id of zeroSpacePressure.panels[0].widgets.filter(M.isSpacer))assert.equal(fitThroughSpaces.widgets[id].extent,0,'Empty Spacers yield before content');
const compactGapPressure=M.updatePanel(fittingOnlyLeft,'panel-left',{mode:'compact'}),compactGapFit=bounded(compactGapPressure,{width:1440,height:320,compactSizes:{apps:{vertical:144,minSize:144}}}).panels['panel-left'];
assert.equal(compactGapFit.widgets.apps.compactView,'apps','A compact task manager does not become an icon just to preserve optional gaps');assert.ok(compactGapFit.widgets.apps.extent>=144-epsilon);
const fitSnapshot=JSON.stringify(zeroSpacePressure),beforePressure=M.layout(zeroSpacePressure,{width:1440,height:900});M.layout(zeroSpacePressure,{width:1440,height:120});assert.equal(JSON.stringify(zeroSpacePressure),fitSnapshot);assert.deepEqual(M.layout(zeroSpacePressure,{width:1440,height:900}),beforePressure,'Growing a panel restores its stored expanded preferences after temporary fitting');assert.deepEqual(M.normalize(zeroSpacePressure),zeroSpacePressure);
const axisMinimums={apps:{vertical:144,horizontal:144,minSize:{vertical:144,horizontal:2000}}};
assert.equal(bounded(compactGapPressure,{width:1440,height:320,compactSizes:axisMinimums}).panels['panel-left'].widgets.apps.compactView,'apps');
assert.equal(bounded(M.updatePanel(compactGapPressure,'panel-left',{edge:'bottom'}),{width:1440,height:320,compactSizes:axisMinimums}).panels['panel-left'].widgets.apps.compactView,'icon','Horizontal compact content uses its own measured fixed-control minimum');

// Apps reserves fixed launcher/background controls; only the Parked viewport
// is flexible. A long Parked list must not collapse a viable task manager.
for(const edge of ['left','right','top','bottom'])for(const preferred of [120,240,1600]){
  const state=M.updatePanel(M.updatePanel(compactLeft,'panel-left',{edge}),'panel-right',{mode:'hidden'}),viewport={...options,width:600,height:400,compactSizes:{apps:{minSize:120,vertical:preferred,horizontal:preferred}}},rect=bounded(state,viewport).panels['panel-left'];
  assert.equal(rect.widgets.apps.compactView,'apps','Preferred Parked count cannot force compact Apps to an icon');assert.ok(rect.widgets.apps.extent>=120-epsilon,'Fixed compact controls and one Parked icon remain visible');assert.equal(rect.widgets.clock.extent,rect.vertical?48:80);for(const id of ['notifications','calendar','controls'])assert.equal(rect.widgets[id].extent,44,'Optional Parked viewport yields space before fixed tray icons');assert.ok(rect.unusedExtent<epsilon,'Live Apps fills available capacity without a Spacer');assert.deepEqual(state.widgets,initial.widgets);
}
for(const edge of ['left','right','top','bottom']){
  const state=M.updatePanel(M.updatePanel(initial,'panel-left',{edge}),'panel-right',{mode:'hidden'}),viewport={...options,width:600,height:500,widgetSizes:{apps:{min:220,preferred:1600},clock:56}},rect=bounded(state,viewport).panels['panel-left'],apps=rect.widgets.apps,contentSize=(rect.vertical?apps.height-apps.headerSize:apps.width);
  assert.equal(apps.mode,'expanded');assert.ok(contentSize>=220-epsilon);assert.ok(contentSize<1600,'Only the variable Parked viewport gives up preference');assert.equal(rect.widgets.clock.mode,'expanded');assert.deepEqual(state.widgets,initial.widgets);
}
const axisRange=bounded(withSpace,{...options,widgetSizes:{apps:{vertical:{min:220,preferred:300},horizontal:{min:400,preferred:500}},clock:56}}).panels['panel-left'];assert.equal(axisRange.widgets.apps.height-axisRange.widgets.apps.headerSize,300);assert.ok(axisRange.widgets[spaceId].extent>0);
const staleApps=M.updateWidget(initial,'apps',{size:1}),naturalGrow=bounded(staleApps,{...options,widgetSizes:{apps:{min:220,preferred:300}}}).panels['panel-left'];assert.equal(naturalGrow.unusedExtent,0);assert.ok(naturalGrow.widgets.apps.height-naturalGrow.widgets.apps.headerSize>300,'Measured Apps fills free panel space despite obsolete stored sizing');assert.equal(staleApps.widgets.apps.size,1);
const rangeUnfit=bounded(initial,{...options,height:400,widgetSizes:{apps:{min:900,preferred:1600},clock:56}}).panels['panel-left'];assert.equal(rangeUnfit.widgets.apps.mode,'compact');assert.equal(rangeUnfit.widgets.clock.mode,'expanded','Unfit fixed Apps controls do not collapse the natural Clock');
const spacerRange=bounded(withSpace,{...options,height:500,widgetSizes:{apps:{min:220,preferred:500},clock:56}}).panels['panel-left'];assert.equal(spacerRange.widgets.apps.mode,'expanded');assert.ok(spacerRange.widgets.apps.height-spacerRange.widgets.apps.headerSize>=220);assert.equal(spacerRange.widgets[spaceId].extent,0,'Spacer gives up free space before the fixed Apps controls');

let manySpacers=M.removePanel(initial,'panel-right');for(let i=0;i<32;i++)manySpacers=M.addSpacer(manySpacers,'panel-left',i%2?0:manySpacers.panels[0].widgets.length);for(const item of content)manySpacers=M.updateWidget(manySpacers,item.id,{mode:'expanded'});complete(manySpacers);assert.deepEqual(M.normalize(clone(manySpacers)),manySpacers);for(const mode of ['expanded','compact'])for(const edge of ['left','right','top','bottom'])for(const [width,height]of [[1,1],[80,40],[320,240],[1440,900]])bounded(M.updatePanel(manySpacers,'panel-left',{mode,edge}),{...options,width,height,headerSize:30,widgetSizes:Object.fromEntries(content.map(item=>[item.id,480]))});
let crowded=M.defaults();while(crowded.panels.length<24)crowded=M.addPanel(crowded,'left');
for(const edge of ['left','right','top','bottom']){let same=crowded;for(const panel of same.panels)same=M.updatePanel(same,panel.id,{edge});for(const [width,height]of [[1,1],[80,40],[320,240],[1440,768]])bounded(same,{...options,width,height,compactHeaders:true});}
let seed=0x5efa;function random(max){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;}
for(let iteration=0;iteration<400;iteration++){
  let state=M.defaults();const count=1+random(24);while(state.panels.length<count)state=M.addPanel(state,['left','right','top','bottom'][random(4)]);while(state.panels.length>count)state=M.removePanel(state,state.panels.at(-1).id);
  for(const panel of [...state.panels])state=M.updatePanel(state,panel.id,{edge:['left','right','top','bottom'][random(4)],size:56+random(585),share:.1+random(200)/10,display:1+random(3),mode:['expanded','compact','hidden'][random(3)]});
  for(const item of content){state=M.moveWidget(state,item.id,state.panels[random(state.panels.length)].id,random(14));state=M.updateWidget(state,item.id,{mode:['expanded','compact','hidden'][random(3)],size:random(3)?1600:random(20000)});}
  for(const panel of state.panels)if(random(3)===0){state=M.addSpacer(state,panel.id,random(panel.widgets.length+1));if(random(2))state=M.addSpacer(state,panel.id);}
  complete(state);const viewport={width:1+random(1600),height:1+random(1100),display:1+random(3),displays:3,fullscreen:random(3)===0,fullscreenDisplay:1+random(3),headerSize:random(61),footerSize:random(61),compactToolboxSize:random(61),compactSizes:{apps:{vertical:random(1000),horizontal:random(1000),minSize:random(600)},clock:{vertical:random(100),horizontal:random(140)}},widgetHeaderSize:random(61),compactHeaders:random(2)===0,widgetSizes:random(2)?{apps:{vertical:{min:random(400),preferred:random(1000)},horizontal:{min:random(400),preferred:random(1800)}},clock:{vertical:48+random(100),horizontal:48+random(200)},files:random(1000),assistant:random(1000)}:null,preferredWidget:content[random(content.length)].id};
  const snapshot=JSON.stringify(state);bounded(state,viewport);const target=content[random(content.length)].id,resizing=M.resizeWidget(state,target,random(3000),viewport);assert.deepEqual(M.normalize(resizing),resizing);bounded(resizing,{...viewport,preferredWidget:target});assert.equal(JSON.stringify(state),snapshot);
}
assert.equal(JSON.stringify(initial),before);
console.log('Panel model: fixed Apps controls with flexible Parked viewport, repeatable Spacers and 400 bounded stress cases passed.');
