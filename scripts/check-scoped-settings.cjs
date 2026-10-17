const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {describe}=require('../dist/scoped-settings.js');

// Scope labels follow the actual desktop owner rather than the last open Project.
assert.deepEqual(describe({workspace:'Work',project:{name:'Website Launch'},page:1,display:2}),{desktop:'Desktop 2 · Website Launch · Work · Display 2',project:'Website Launch Project',workspace:'Work Workspace',system:'All Workspaces'});
assert.equal(describe({workspace:'Gaming',temporary:true}).desktop,'Temporary desktop · Gaming · Display 1');
assert.equal(describe({workspace:'General'}).project,null,'Ordinary Workspace context does not use the last open Project');
assert.equal(describe({workspace:'School',project:{name:'Paper <draft>'},page:0,display:2}).project,'Paper <draft> Project','Context data remains literal until rendered');

// Only the upper modal handles Tab when it is layered above Overview.
const shell=fs.readFileSync(require.resolve('../dist/desktop-shell.js'),'utf8');
const trapStart=shell.indexOf('  const packageDialog = $("#packageDialog");',shell.indexOf('document.addEventListener("keydown", event => {'));
const trapEnd=shell.indexOf('\n  if (projectEditorDialog.classList.contains("is-open") || packageDialog',trapStart);
assert(trapStart>=0&&trapEnd>trapStart);
const openSurfaces=new Set(['#projectEditorDialog','#universalSearch']),trapped=[];
const trapContext={$:selector=>({id:selector,classList:{contains:name=>name==='is-open'&&openSurfaces.has(selector)}}),trapDialogFocus:(node)=>{trapped.push(node.id);return false;}};
vm.createContext(trapContext);vm.runInContext('function routeTab(event){'+shell.slice(trapStart,trapEnd)+'}',trapContext);
trapContext.routeTab({key:'Tab'});assert.deepEqual(trapped,['#projectEditorDialog'],'Interior Tab cannot fall through into inert Overview');

console.log('Scoped Settings passed: literal ownership labels, ordinary/Project/fullscreen contexts, display labels and independent modal focus routing.');
