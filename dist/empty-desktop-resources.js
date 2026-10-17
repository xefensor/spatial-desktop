/* Read-only working files for the empty desktop. No filesystem probing. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SpatialEmptyDesktopResources=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const standard=['Desktop','Documents','Downloads','Music','Pictures','Videos','Templates','Public'];
  const primary=new Set(['Documents','Downloads','Desktop','Projects']);
  const text=value=>typeof value==='string'?value:'';
  function path(value){
    if(typeof value!=='string'||!value.startsWith('/')||/[\x00-\x1f]/.test(value))return '';
    const parts=[];
    for(const part of value.split('/')){
      if(part==='..'){if(!parts.length)return '';parts.pop();}
      else if(part&&part!=='.')parts.push(part);
    }
    return '/'+parts.join('/');
  }
  const inside=(value,base)=>Boolean(base&&(value===base||value.startsWith(base==='/'?'/':base+'/')));
  function join(base,name){
    if(typeof name!=='string'||!name||name.startsWith('/')||/[\x00-\x1f]/.test(name)||name.split('/').some(part=>!part||part==='.'||part==='..'))return '';
    const result=path(base.replace(/\/$/,'')+'/'+name);
    return inside(result,base)?result:'';
  }
  function collect({workspace,column='workspace',profiles={},projects={},downloads={},stashRows}={}){
    const profile=profiles[workspace],home=path(profile?.home);
    if(!profile||!home)return {folders:[],files:[]};
    const homes=Object.entries(profiles).map(([id,value])=>({id,root:path(value?.home)})).filter(value=>value.root).sort((a,b)=>b.root.length-a.root.length);
    const projectRoots=Object.entries(projects).map(([id,value])=>({id,root:path(value?.root)})).filter(value=>value.root).sort((a,b)=>b.root.length-a.root.length);
    const foreignHome=value=>{const owner=homes.find(home=>inside(value,home.root));return Boolean(owner&&owner.id!==workspace);};
    const candidate=column!=='workspace'?projects[column]:null;
    const root=path(candidate?.root);
    const project=candidate&&root&&(!candidate.originWorkspace||candidate.originWorkspace===workspace)&&!foreignHome(root)?candidate:null;
    const owner=project?column:'workspace',projectRoot=project?root:'';
    const folders=[],files=[],seen=new Set();
    function add({label,detail='',target,directory,name,folder=false,type='document',owner:entryOwner='workspace',searchOnly=false,sourcePath,savedAt}){
      const absolute=path(target);
      if(!absolute||foreignHome(absolute))return;
      const identity=(folder?'folder:':'file:')+absolute;
      if(seen.has(identity))return;
      seen.add(identity);
      const entry={key:JSON.stringify([workspace,entryOwner,folder?'folder':'file',absolute]),label:text(label)||absolute.split('/').at(-1)||'/',detail:text(detail),path:absolute,
        directory:folder?absolute:path(directory),name:text(name)||absolute.split('/').at(-1)||'/',folder,owner:entryOwner,type:folder?'folder':text(type)||'document'};
      if(searchOnly)entry.searchOnly=true;
      if(typeof sourcePath==='string'&&sourcePath&&sourcePath!==absolute)entry.sourcePath=sourcePath;
      if(Number.isFinite(savedAt)&&savedAt>=0)entry.savedAt=savedAt;
      (folder?folders:files).push(entry);
    }
    function row(entry,base,entryOwner,{searchOnly=false}={}){
      if(!Array.isArray(entry)||typeof entry[0]!=='string')return;
      const [name,detail,type,target]=entry,folder=type==='folder';
      const absolute=folder&&text(target).startsWith('/')?path(target):join(base,name);
      add({label:name,detail,target:absolute,directory:base,name,folder,type,owner:entryOwner,searchOnly,sourcePath:!folder?target:undefined});
    }
    if(project)add({label:project.name||column,detail:'Project folder',target:projectRoot,folder:true,owner});
    add({label:(profile.label||workspace)+' Home',detail:'Workspace Home',target:home,folder:true});
    for(const name of ['Documents','Downloads','Desktop','Projects'])add({label:name,detail:'Workspace folder',target:join(home,name),folder:true});
    for(const name of standard.filter(name=>!primary.has(name)))add({label:name,detail:'Workspace folder',target:join(home,name),folder:true,searchOnly:true});
    if(project){
      row(['.spatial-project.toml','Project settings','config'],projectRoot,owner);
      for(const entry of Array.isArray(project.files)?project.files:[])row(entry,projectRoot,owner);
    }
    for(const entry of Array.isArray(profile.folders)?profile.folders:[]){
      if(!Array.isArray(entry))continue;
      if(entry[2]==='folder')row(entry,home,'workspace',{searchOnly:standard.includes(entry[0])&&!primary.has(entry[0])});
      else if(entry[0]==='.spatial-workspace.toml')row(entry,home,'workspace');
    }
    function localDirectory(value){
      if(!value||foreignHome(value))return false;
      const knownProject=projectRoots.find(project=>inside(value,project.root));
      if(knownProject&&knownProject.id!==owner)return false;
      return inside(value,home)||Boolean(projectRoot&&inside(value,projectRoot));
    }
    for(const directory of Array.isArray(downloads.directories)?downloads.directories:[]){
      const absolute=path(directory);
      if(!localDirectory(absolute))continue;
      add({label:absolute.split('/').at(-1)||'/',detail:'Saved folder',target:absolute,folder:true,owner:projectRoot&&inside(absolute,projectRoot)?owner:'workspace'});
    }
    for(const file of Array.isArray(downloads.files)?downloads.files:[]){
      if(!file||file.workspace!==workspace||(file.project&&file.project!==owner))continue;
      const directory=path(file.directory),absolute=join(directory,file.name);
      if(!directory||!absolute||foreignHome(absolute))continue;
      const knownProject=projectRoots.find(project=>inside(absolute,project.root));
      if(knownProject&&knownProject.id!==owner)continue;
      add({label:file.name,detail:'Saved file',target:absolute,directory,name:file.name,owner:file.project||'workspace',savedAt:file.savedAt});
    }
    if(typeof stashRows==='function'){
      for(const [base,entryOwner] of [[home,'workspace'],...(project?[[projectRoot,owner]]:[])]){
        const directory=base;let entries;
        try{entries=stashRows(directory);}catch{continue;}
        for(const entry of Array.isArray(entries)?entries:[])row(entry,directory,entryOwner);
      }
    }
    return {folders,files};
  }
  return {collect};
});
