const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const timeline=require('../dist/timeline.js');
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
// A small element tree is enough to inspect the real panel ownership without
// depending on a browser or matching nested sections with a greedy expression.
const markup=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
const tree={children:[]},stack=[tree],elements=[];
const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
for(const token of markup.matchAll(/<\/?([a-z][\w:-]*)([^>]*)>/gi)){
  const tag=token[1].toLowerCase();
  if(token[0].startsWith('</')){
    const index=stack.findLastIndex(node=>node.tag===tag);
    if(index>0){for(const node of stack.slice(index))node.end=token.index+token[0].length;stack.length=index;}
    continue;
  }
  const attrs=Object.fromEntries([...token[2].matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s=<>`]+)))?/g)].map(match=>[match[1],match[2]??match[3]??match[4]??'']));
  const node={tag,attrs,parent:stack.at(-1),children:[],start:token.index,end:token.index+token[0].length};
  node.parent.children.push(node);elements.push(node);
  if(!voids.has(tag)&&!token[0].endsWith('/>'))stack.push(node);
}
const byId=id=>{const nodes=elements.filter(node=>node.attrs.id===id);assert.equal(nodes.length,1,'Exactly one #'+id+' exists');return nodes[0];};
const contains=(parent,node)=>{for(let current=node;current;current=current.parent)if(current===parent)return true;return false;};
const fragment=node=>markup.slice(node.start,node.end);
const text=node=>fragment(node).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const home=byId('overviewHome'),track=byId('overviewSectionTrack');
const panels=elements.filter(node=>node.attrs['data-overview-panel']);
assert.deepEqual(panels.map(node=>node.attrs['data-overview-panel']),[...timeline.sections,'steam'],'DOM order follows the horizontal scope progression with an appended provider');
assert(panels.every(node=>node.parent===track),'Every panel is a direct child of the same horizontal carousel');
const panel=id=>panels.find(node=>node.attrs['data-overview-panel']===id);
const tabs=elements.filter(node=>(node.attrs.class||'').split(/\s+/).includes('overview-section-tab'));
assert.deepEqual(tabs.map(node=>node.attrs['data-overview-section']),[...timeline.sections,'steam']);
assert.deepEqual(tabs.slice(0,5).map(text),['Windows','Apps','Projects & Files','Timeline','System']);
assert.deepEqual(tabs.filter(node=>node.attrs['aria-pressed']==='true').map(node=>node.attrs['data-overview-section']),['windows'],'Initial markup presents Windows as the selected section');
const providers=elements.find(node=>'data-overview-provider-group' in node.attrs);
assert(providers&&contains(home,providers)&&contains(providers,tabs.at(-1)),'Steam remains in a separate provider group');
assert(tabs.slice(0,5).every(node=>!contains(providers,node)),'Built-in tabs stay separate from app contributions');
for(const id of ['desktopColumnMap','overviewWindowGrid','overviewWindowFilter'])assert(contains(panel('windows'),byId(id)),'#'+id+' belongs to Windows');
for(const id of ['allAppsGrid','overviewCategory'])assert(contains(panel('apps'),byId(id)),'#'+id+' belongs to the app catalogue');
assert(elements.filter(node=>'data-category-filter' in node.attrs).every(node=>contains(panel('apps'),node)),'Application categories live together in Apps');
assert(!contains(panel('apps'),byId('overviewWindowGrid'))&&!contains(panel('windows'),byId('allAppsGrid')),'Window management and launching are not mixed in one panel');
for(const id of ['overviewCurrentProject','overviewCurrentProjectName','overviewCurrentProjectPath','overviewCurrentProjectMeta','workspaceHomeTitle','workspaceFolders','overviewProjectGrid'])assert(contains(panel('projects'),byId(id)),'#'+id+' belongs to Projects & Files');
assert(byId('overviewCurrentProject').start<byId('workspaceHomeTitle').start&&byId('workspaceHomeTitle').start<byId('overviewProjectGrid').start,'Projects & Files starts with current context, then Workspace Home, then the shared project library');
assert(contains(panel('timeline'),byId('timelineEntries'))&&contains(panel('timeline'),byId('timelinePlanForm')),'Activity and plans remain in Timeline');
assert(contains(panel('system'),byId('overviewWorkspaceNotificationBadges')),'Foreign Workspace unread badges remain in System');
assert(contains(panel('system'),byId('overviewSystemWideNotificationList')),'Shared notifications remain in System');
const setup=require('../dist/workspace-setup.js');
assert(setup.sessionKeys.includes('spatial-overview-section-v1')&&setup.sessionKeys.includes('spatial-overview-section-v2'),'Clean/demo resets clear both old and new section preferences');
console.log('Overview structure passed: five horizontal destinations, real control ownership, current-project-first files, isolated provider tabs and versioned reset support.');
