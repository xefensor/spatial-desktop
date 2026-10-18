const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const memory=fs.readFileSync(require.resolve('../dist/working-memory-desktop.js'),'utf8');
function segment(source,first,last){const start=source.indexOf(first),end=source.indexOf(last,start+first.length);assert(start>=0&&end>start);return source.slice(start,end);}
const matching=segment(shell,'function normalizeSearchText(','function buildUniversalAppResults(');

// Exercise the actual project renderer, including filters, ownership and literal user names.
{
  const fields=new Map(),$=key=>{if(!fields.has(key))fields.set(key,{value:'',textContent:'',innerHTML:''});return fields.get(key);};
  $('#overviewProjectFilter').value='all';
  const context={$,activeWorkspace:'work',overviewProjectFilterWorkspace:'work',
    projectSpaces:{river:{name:'Říční průzkum',root:'/home/school/river',summary:'Wetlands observations',resources:[],icon:'i-folder',accent:'#abc'},film:{name:'Film <cut>',root:'/mnt/media/film',summary:'Edit',resources:[[]],icon:'i-video',accent:'#def'}},
    renderAvailableProjectLibrary(){},openProjectNames:()=>['film'],desktopPages:{column:()=> 'film',current:()=>1},projectLocationMeta:()=>({label:'Custom location',custom:true}),prepareControlSemantics(){}};
  vm.createContext(context);vm.runInContext(matching+segment(shell,'function escapeHtml(','function showToast(')+segment(shell,'function renderOverviewProjects()','function setProjectClosedState('),context);
  context.renderOverviewProjects();assert.match($('#overviewProjectGrid').innerHTML,/Current · Desktop 2/);assert.match($('#overviewProjectGrid').innerHTML,/Return/);assert.match($('#overviewProjectGrid').innerHTML,/Film &lt;cut&gt;/);assert(!$('#overviewProjectGrid').innerHTML.includes('Film <cut>'));
  $('#overviewProjectQuery').value='ricni';context.renderOverviewProjects();assert.match($('#overviewProjectGrid').innerHTML,/Říční průzkum/);assert(!$('#overviewProjectGrid').innerHTML.includes('data-overview-project="film"'));
  $('#overviewProjectQuery').value='wetlands';context.renderOverviewProjects();assert.match($('#overviewProjectGrid').innerHTML,/Říční průzkum/);
  $('#overviewProjectQuery').value='/mnt media';context.renderOverviewProjects();assert.match($('#overviewProjectGrid').innerHTML,/Film &lt;cut&gt;/);
  $('#overviewProjectQuery').value='';$('#overviewProjectFilter').value='open';context.renderOverviewProjects();assert(!$('#overviewProjectGrid').innerHTML.includes('data-overview-project="river"'));assert.equal($('#overviewProjectCount').textContent,'1 of 2 projects');
  $('#overviewProjectQuery').value='river';context.renderOverviewProjects();assert.match($('#overviewProjectGrid').innerHTML,/No matching projects/);assert.match($('#overviewProjectGrid').innerHTML,/data-project-filter-reset/);
  context.activeWorkspace='school';context.openProjectNames=()=>['river'];context.renderOverviewProjects();assert.equal($('#overviewProjectQuery').value,'');assert.equal($('#overviewProjectFilter').value,'all');assert.match($('#overviewProjectGrid').innerHTML,/Open in this workspace/);
}

// Run the production Stash render and filtering with two independent contexts.
{
  const M=require('../dist/working-memory.js'),work=M.scope('work'),school=M.scope('school');let destination=work;
  const fields=new Map(),field=key=>{if(!fields.has(key))fields.set(key,{value:'',textContent:'',innerHTML:'',hidden:false});return fields.get(key);};
  field('.memory-editor').hidden=true;
  const items={ [work]:[{id:'note',title:'Říční poznámky',text:'Water samples',source:{label:'Your note'},pinned:true},{id:'audio',title:'Soundtrack',text:'',source:{address:'/mnt/media/theme.wav'},attachment:{filename:'Theme.wav'},pinned:false}], [school]:[{id:'reading',title:'Reading',text:'Notes',source:{label:'Course'},pinned:false}] };
  const rows=Object.fromEntries(Object.entries(items).map(([key,list])=>[key,list.map(item=>({dataset:{memoryId:item.id},hidden:false}))]));let pauses=0;
  const target={prepend(node){node.parentElement=this;}},railEntry={};
  const host={parentElement:target,contains:()=>false,querySelectorAll:selector=>selector==='audio'?[{pause(){pauses++;}}]:rows[destination]};
  const context={field,host,shelfViews:new Map(),itemsFor:key=>items[key],scope:()=>destination,current:'',desktopSyncApplying:false,dropPosition:null,allowed:()=>true,rail:{},railEntry,area:{lastElementChild:railEntry,insertBefore(){}},drafts:new Map(),selected:new Set(),editing:null,draftScope:'',lastRemoved:null,projectColumnActive:()=>false,$:()=>target,syncFolders(){},projectFor:()=>null,ownerFor:()=>({root:'/home/work'}),F:{folder:()=>'/home/work/Stash'},signature:'',itemsSignature:'',workspaceProfiles:{work:{label:'Work'},school:{label:'School'}},document:{activeElement:null},prepareControlSemantics(){},itemMarkup:item=>'<details>'+item.title+'</details>'};
  vm.createContext(context);vm.runInContext(matching+segment(memory,'  function stashMatches(','  let signature=')+segment(memory,'  function render(force=false){','  function collapse('),context);
  context.render(true);const markup=field('.memory-items').innerHTML,initialPauses=pauses;
  field('[data-memory-query]').value='ricni';context.filterShelf();assert.equal(rows[work][0].hidden,false);assert.equal(rows[work][1].hidden,true);assert.equal(field('[data-memory-count]').textContent,'1 of 2 items');
  field('[data-memory-query]').value='theme wav';context.filterShelf();assert.equal(rows[work][1].hidden,false);assert.equal(rows[work][0].hidden,true);
  field('[data-memory-filter]').value='pinned';context.filterShelf();assert(field('.memory-empty').hidden===false);assert.equal(field('[data-memory-empty-title]').textContent,'No matching items');
  assert.equal(pauses,initialPauses,'Filtering does not pause media');assert.equal(field('.memory-items').innerHTML,markup,'Filtering retains existing preview nodes');
  destination=school;context.render(true);assert.equal(field('[data-memory-query]').value,'');assert.equal(field('[data-memory-filter]').value,'all');
  field('[data-memory-query]').value='course';context.filterShelf();destination=work;context.render(true);assert.equal(field('[data-memory-query]').value,'theme wav');assert.equal(field('[data-memory-filter]').value,'pinned');
  context.resetShelfFilters();assert.equal(rows[work].filter(row=>!row.hidden).length,2);assert.equal(field('.memory-empty').hidden,true);
  destination=school;context.render(true);assert.equal(field('[data-memory-query]').value,'course','Clearing one Stash filter leaves another context alone');
}

// Actual global search filtering must recover query matches on every category switch.
{
  const groups=['apps','files','memory','projects','settings','web'].map(id=>({dataset:{universalGroup:id},hidden:false,rows:[]}));
  const byId=id=>groups.find(group=>group.dataset.universalGroup===id);
  function result(group,text){const row={textContent:text,dataset:{universalSearch:text},hidden:false,closest:selector=>selector==='#universalAppResults'?(group==='apps'?{}:null):byId(group)};byId(group).rows.push(row);return row;}
  result('files','note.md');result('files','Photo');result('settings','Display');result('web','Web');
  const controls={universalSearchInput:{value:'note'},overviewHome:{},universalResults:{},universalSearchToolbar:{},universalSearchStatus:{},universalWebLabel:{},universalEmpty:{},universalFilterReset:{},universalResultFilter:{value:'all',options:['all','apps','files','memory','projects','settings'].map(value=>({value}))}};
  const $=(selector,group)=>group?(group.rows.find(row=>!row.hidden)||null):controls[selector.slice(1)];
  const $$=(selector,group)=>selector==='.universal-group'?groups:group?.rows?group.rows.filter(row=>!selector.includes(':not')||!row.hidden):groups.flatMap(group=>group.rows);
  const context={$, $$,workspaceProfiles:{work:{label:'Work'}},activeWorkspace:'work',buildUniversalAppResults(){byId('apps').rows=[];result('apps','Note Editor');return 1;},buildUniversalProjectResults(){byId('projects').rows=[];},SpatialMemoryDesktop:{search(){byId('memory').rows=[];const row=result('memory','Project note');row.dataset.memoryResult='saved';}},SpatialOverviewDesktop:{refresh(){}}};
  vm.createContext(context);vm.runInContext(matching+segment(shell,'function filterUniversalSearch()','$("#universalResultFilter").addEventListener'),context);
  context.filterUniversalSearch();assert.equal(controls.universalSearchStatus.textContent,'3 results · Work');assert.equal(byId('web').hidden,false);
  controls.universalResultFilter.value='memory';context.filterUniversalSearch();assert.equal(byId('apps').rows[0].hidden,true);assert.equal(byId('memory').rows[0].hidden,false);assert.equal(byId('web').hidden,true);assert.equal(controls.universalSearchStatus.textContent,'1 result · Saved items');
  controls.universalResultFilter.value='settings';context.filterUniversalSearch();assert.equal(controls.universalEmpty.hidden,false);assert.match(controls.universalEmpty.textContent,/No results in this category/);
  controls.universalResultFilter.value='all';context.filterUniversalSearch();assert.equal(byId('files').rows[0].hidden,false,'A static result recovers after a category switch');assert.equal(byId('apps').rows[0].hidden,false);assert.equal(byId('web').hidden,false);assert.equal(controls.universalFilterReset.hidden,true);
  // A path can belong to both category providers, but All presents it once.
  // Category membership/counts remain stable when switching the filter.
  context.SpatialSearchScopes={restore(){},render(){},fileResults(){},dedupe(hide){const file=byId('files').rows[0],saved=byId('memory').rows[0];assert(!file.hidden&&!saved.hidden,'Deduplication runs after matching and before category hiding');if(hide)file.hidden=true;return 1;}};
  context.filterUniversalSearch();assert.equal(controls.universalSearchStatus.textContent,'2 results · Work');assert.equal(controls.universalResultFilter.options[0].textContent,'All results · 2');assert.equal(controls.universalResultFilter.options.find(option=>option.value==='files').textContent,'Files · 1');assert.equal(byId('files').rows[0].hidden,true);
  controls.universalResultFilter.value='files';context.filterUniversalSearch();assert.equal(controls.universalSearchStatus.textContent,'1 result · Files');assert.equal(byId('files').rows[0].hidden,false);assert.equal(controls.universalResultFilter.options[0].textContent,'All results · 2','Unique All count does not jump when a category is selected');
  controls.universalResultFilter.value='memory';context.filterUniversalSearch();assert.equal(controls.universalSearchStatus.textContent,'1 result · Saved items');assert.equal(controls.universalResultFilter.options[0].textContent,'All results · 2');
  controls.universalSearchInput.value='';context.filterUniversalSearch();assert.equal(controls.universalSearchToolbar.hidden,true);assert.equal(controls.universalResultFilter.value,'all');
}
console.log('Library browsing passed: literal project names, diacritic/path matching, workspace-owned open filters, independent Stash views, preview-preserving filtering and search-category recovery.');
