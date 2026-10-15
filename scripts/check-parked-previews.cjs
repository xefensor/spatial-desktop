const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../dist/parked-previews.js');
assert(P.usesPreview({parkingWidget:false}));assert(!P.usesPreview({}));assert(!P.usesPreview({parkingWidget:true}));
for(const [width,height,vw,vh] of [[960,640,280,175],[600,950,230,144],[1920,1080,400,250],[400,300,90,56]]){
  const p=P.fit(width,height,vw,vh);
  assert(p.scale>0&&p.scale<=1);assert(p.left>=0&&p.top>=0);assert(width*p.scale<=vw);assert(height*p.scale<=vh);
}
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
for(const id of ['browser','browser--2','steam']){
  const html=P.markup('<article class="mini-card" data-mini-card="'+id+'"><header><b>App</b></header><form>Old widget</form></article>',id,'App <two>',escape);
  assert(html.includes('data-parked-preview="'+id+'"'));assert(html.includes('data-mini-restore="'+id+'"'));
  assert(html.includes('App &lt;two>'));assert(html.includes('Window preview'));assert(!html.includes('<form>'));assert(!html.includes('Old widget'));
}
// Snapshot live property values, without sharing editable controls or window IDs.
class Element {
  constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs={...attrs};this.children=children;this.dataset={appKind:'browser'};this.hidden=true;this.scrollTop=0;this.scrollLeft=0;
    const values=new Set((attrs.class||'').split(' '));this.classList={add:x=>values.add(x),remove:(...xs)=>xs.forEach(x=>values.delete(x)),contains:x=>values.has(x)};}
  get attributes(){return Object.entries(this.attrs).map(([name,value])=>({name,value}));}
  removeAttribute(name){delete this.attrs[name];}setAttribute(name,value){this.attrs[name]=value;}
  matches(selector){return selector.split(',').includes(this.tag);}
  querySelectorAll(){return this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);}
  cloneNode(){return new Element(this.tag,this.attrs,this.children.map(c=>c.cloneNode(true)));}
}
const field=new Element('input',{id:'address',name:'query','data-app-action':'search',autofocus:'',onclick:'bad()'});field.value='My current page';field.checked=true;
const note=new Element('textarea');note.value='Unsaved draft';
const video=new Element('video',{autoplay:''});
const frame=new Element('article',{'data-app-frame':'browser',id:'window',class:'app-frame is-fullscreen is-front'},[field,note,video]);
const clone=P.cloneWindow(frame),[previewField,previewNote,previewVideo]=clone.children;
assert.equal(previewField.value,field.value);assert.equal(previewField.checked,true);assert.equal(previewNote.value,note.value);
assert.equal(clone.hidden,false);assert.equal(clone.inert,true);assert.equal(clone.attrs['aria-hidden'],'true');assert(!clone.classList.contains('is-fullscreen'));
for(const node of [clone,...clone.querySelectorAll('*')])assert(!node.attributes.some(a=>a.name==='id'||a.name==='name'||a.name.startsWith('data-')||a.name.startsWith('on')||a.name==='autofocus'));
assert.equal(previewVideo.autoplay,false);assert.equal(previewVideo.muted,true);assert.equal(field.value,'My current page');assert.equal(frame.hidden,true);
// Exercise the actual adapter hooks, including per-instance opt-in and widgets.
let rendered=0;
const runtime=vm.createContext({appInfo:{browser:{label:'Firefox',parkingWidget:false},'browser--2':{label:'Firefox · 2',parkingWidget:false},steam:{label:'Steam',parkingWidget:false},notes:{label:'Notes'}},activeWorkspace:'general',appState:{},
  document:{querySelectorAll:()=>[],addEventListener(){}},ResizeObserver:class{disconnect(){}},MutationObserver:class{},escapeHtml:escape,
  miniMarkup:id=>'<article class="mini-card"><header>'+id+'</header><textarea>Widget</textarea></article>',renderMiniApps(){rendered++;}});
vm.runInContext(fs.readFileSync(require.resolve('../dist/parked-previews.js'),'utf8'),runtime);
assert.equal(rendered,1);
for(const id of ['browser','browser--2','steam'])assert(runtime.miniMarkup(id).includes('data-parked-preview="'+id+'"'));
assert(runtime.miniMarkup('notes').includes('<textarea>Widget</textarea>'));runtime.renderMiniApps();assert.equal(rendered,2);
console.log('Parked previews passed: capability fallback, independent window identities, preserved native widgets, aspect-ratio fitting, current form values, inert snapshots and removed duplicate IDs/actions.');
