const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {targets,place}=require('../dist/context-submenus.js'),Pages=require('../dist/desktop-pages.js');
const source=fs.readFileSync(require.resolve('../dist/context-submenus.js'),'utf8');
function segment(first,last){const start=source.indexOf(first),end=source.indexOf(last,start+first.length);assert(start>=0&&end>start);return source.slice(start,end);}
const options={workspace:'work',profiles:{work:{label:'Work',home:'/home/work'},school:{label:'School',home:'/home/school'}},projects:{site:{name:'Website Launch'},film:{name:'Film <cut>'}},owner:'site',page:1,last:()=>2,open:['site','film']};
let menu=targets(options);
assert.equal(menu.label,'Move to…');assert.match(menu.children[0].info,/Work \/ Website Launch \/ Desktop 2/);
const local=menu.children.find(item=>item.label==='This Project');assert.equal(local.children[1].disabled,true);assert.equal(local.children[2].marker,'New');
const projects=menu.children.find(item=>item.label==='Other Projects');assert(projects.children.some(item=>item.label==='Workspace desktops'));assert(projects.children.some(item=>item.label==='Film <cut>'));
const school=menu.children.find(item=>item.label==='Other Workspaces').children[0];assert.match(school.children[0].info,/\/home\/school/);
const destination=JSON.parse(decodeURIComponent(school.children.at(-1).action.slice(12)));assert.deepEqual(destination,{workspace:'school',owner:'workspace',page:2});
assert(!targets({...options,restricted:'work'}).children.some(item=>item.label==='Other Workspaces'));
assert.equal(targets({...options,allowed:()=>false}),null,'Unintroduced Guide destinations stay unavailable');
assert(!targets({...options,bond:true}).children.find(item=>item.label==='This Project').children[1].disabled,'A parent desktop is a valid target from its temporary child');

// Render actual menu markup: literal user names, nested ARIA and disabled current target.
const markupContext={reset(){},escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),icon:()=>'<svg></svg>'};
vm.createContext(markupContext);vm.runInContext(segment('  function markup(entries){','  function mount(){'),markupContext);
const html=markupContext.markup([menu]);assert.match(html,/aria-haspopup="menu"/);assert.match(html,/aria-controls="contextSubmenu-/);assert.match(html,/role="menu"/);assert.match(html,/disabled aria-disabled="true"/);assert.match(html,/Film &lt;cut&gt;/);assert(!html.includes('Film <cut>'));

// Each popup flips independently and remains within the viewport, including narrow screens.
for(const width of [320,800,1440])for(const height of [420,900])for(const x of [8,width/2,width-30])for(const y of [8,height/2,height-30]){
  const size={width:Math.min(300,width-16),height:Math.min(360,height-16)},position=place({left:x,right:x+25,top:y},size,{width,height});
  assert(position.left>=8 && position.left+size.width<=width-8);assert(position.top>=8 && position.top+size.height<=height-8);
}

// A flipped child can overlap an ancestor; it must always paint above that ancestor.
const panel=()=>({hidden:true,style:{},getBoundingClientRect:()=>({width:300,height:200})});
const panelA=panel(),panelB=panel(),chain=[];
const menuContext={clearTimeout(){},hoverTimer:0,chain,panels:new Map([['a',{panel:panelA,parent:'',opener:{getBoundingClientRect:()=>({left:850,right:1120,top:300}),setAttribute(){}}}],['b',{panel:panelB,parent:'a',opener:{getBoundingClientRect:()=>({left:550,right:850,top:350}),setAttribute(){}}}]]),closeAfter(parent){chain.splice(parent?chain.indexOf(parent)+1:0);},menu:{getBoundingClientRect:()=>({left:300,top:200})},window:{innerWidth:1200,innerHeight:800},items:()=>[],place};
vm.createContext(menuContext);vm.runInContext(segment('  function open(id,focus=false){','  function click(event){'),menuContext);
menuContext.open('a');menuContext.open('b');assert(Number(panelB.style.zIndex)>Number(panelA.style.zIndex));menuContext.open('a');assert(Number(panelB.style.zIndex)>Number(panelA.style.zIndex),'Hovering the ancestor cannot cover an already open child');

// Exercise the shipped transfer adapter against the real desktop ownership model.
function fixture(){
  const pages=Pages.create();pages.assign('work','notes',1,'film');pages.go('work',0,'workspace');
  let activeWorkspace='work',selected='workspace';const calls=[];
  const c={activeWorkspace,workspaceProfiles:options.profiles,projectSpaces:options.projects,appInfo:{notes:{label:'Notes'}},appState:{notes:'minimized'},desktopPages:pages,localDisplaySlot:()=>1,
    changeDesktopPage(page,animate,column,bond){calls.push(['view',page,column,bond]);pages.select('work',column);pages.go('work',page,column);selected=column;},
    moveWindowToDesktop(name,delta){calls.push(['desktop',name,delta]);pages.assign('work',name,pages.pageOf('work',name)+delta,pages.column('work'));},
    moveWindowToColumn(name,column,follow,page){calls.push(['column',name,column,follow,page]);pages.assign('work',name,page,column);},
    moveAppProject(name,column,page){calls.push(['project',name,column,page]);pages.assign('work',name,page,column);},
    moveAppWorkspace(name,workspace,page){calls.push(['workspace',name,workspace,page]);return {destination:workspace,id:'notes--1'};},
    leaveBondedFullscreen(name){calls.push(['leave',name]);pages.removeFullscreen('work',name);},queueDesktopStateBroadcast(){}};
  vm.createContext(c);vm.runInContext(segment('  function moveTarget(name,target){','  const transfer='),c);return {c,pages,calls};
}
{
  const {c,pages,calls}=fixture();c.moveTarget('notes',{workspace:'work',owner:'film',page:2});
  assert.equal(pages.columnOf('work','notes'),'film');assert.equal(pages.pageOf('work','notes'),2);assert.equal(pages.column('work'),'workspace','Moving a window from another column cannot change its ownership accidentally');
  assert(calls.some(row=>row[0]==='desktop'&&row[2]===1));assert.equal(c.appState.notes,'minimized');
}
{
  const {c,calls}=fixture();c.moveTarget('notes',{workspace:'work',owner:'site',page:1});assert(calls.some(row=>JSON.stringify(row)===JSON.stringify(['project','notes','site',1])));
}
{
  const {c,calls}=fixture();const result=c.moveTarget('notes',{workspace:'school',owner:'workspace',page:1});assert.deepEqual(JSON.parse(JSON.stringify(result)),{destination:'school',id:'notes--1',transfer:true});assert(calls.some(row=>JSON.stringify(row)===JSON.stringify(['workspace','notes','school',1])));
}
{
  const {c,pages,calls}=fixture();pages.addFullscreen('work','notes',1);c.moveTarget('notes',{workspace:'work',owner:'film',page:1});assert.equal(pages.fullscreenBond('work','notes'),null);assert(calls.some(row=>row[0]==='leave'));
}
console.log('Context submenus passed: scope hierarchy, exact named destinations, Guide/restricted apps, safe nested markup, viewport flipping and production transfers from other columns, parked windows and temporary desktops.');
