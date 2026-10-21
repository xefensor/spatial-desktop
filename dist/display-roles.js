/* Display roles belong to a monitor setup; the contents belong to a Workspace.
   This module is deliberately independent of browser windows and OS APIs. */
(function(root){
  'use strict';
  const ROLES=['main','extended','side'];
  const STATUSES=['idle','working','needs-you','done','error','paused'];
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const entries=value=>record(value)?Object.entries(value):[];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const key=value=>typeof value==='string'&&value.trim()?value:'';
  const slot=value=>Number.isSafeInteger(Number(value))&&Number(value)>0?Number(value):0;
  const dimension=value=>Number.isFinite(Number(value))&&Number(value)>0?Math.round(Number(value)):0;
  const ids=value=>[...new Set((Array.isArray(value)?value:[]).filter(value=>key(value)))];
  const permissionKey=(setup,project=null)=>JSON.stringify([key(setup),key(project)||null]);
  function permissions(value){
    const result={};
    for(const [name,permission] of entries(value)){
      let context;try{context=JSON.parse(name);}catch{continue;}
      if(!Array.isArray(context)||context.length!==2||!key(context[0])||context[1]!==null&&!key(context[1])||typeof permission?.allowed!=='boolean')continue;
      result[permissionKey(...context)]={allowed:permission.allowed,revision:Number.isSafeInteger(permission.revision)&&permission.revision>=0?permission.revision:0};
    }
    return result;
  }

  function cleanReference(value,seen=new Set(),depth=0){
    if(value===null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='object'||seen.has(value)||depth>12)return undefined;
    seen.add(value);
    const result=Array.isArray(value)?value.map(item=>cleanReference(item,seen,depth+1)).filter(item=>item!==undefined):
      Object.fromEntries(Object.entries(value).filter(([name])=>!['__proto__','prototype','constructor'].includes(name)).map(([name,item])=>[name,cleanReference(item,seen,depth+1)]).filter(([,item])=>item!==undefined));
    seen.delete(value);return result;
  }
  function references(value){
    return (Array.isArray(value)?value:[]).map(item=>typeof item==='string'?key(item):record(item)?cleanReference(item):undefined).filter(item=>item!==undefined&&item!=='');
  }
  function activity(value){
    if(!record(value)||!['plan','source','output','question','review','complete','stopped','interrupted','error'].includes(value.stage))return null;
    const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
    const question=record(value.question)&&key(value.question.id)?{id:text(value.question.id,180),prompt:text(value.question.prompt,500),options:(Array.isArray(value.question.options)?value.question.options:[]).slice(0,4).filter(option=>record(option)&&key(option.id)&&key(option.label)).map(option=>({id:text(option.id,100),label:text(option.label,160),description:text(option.description,500)}))}:null;
    return {stage:value.stage,label:text(value.label,200),detail:text(value.detail,1000),step:Math.max(0,Math.min(20,Math.floor(Number(value.step)||0))),total:Math.max(0,Math.min(20,Math.floor(Number(value.total)||0))),entries:(Array.isArray(value.entries)?value.entries:[]).slice(-12).filter(record).map(entry=>({label:text(entry.label,200),detail:text(entry.detail,1000)})),question:value.stage==='question'&&question?.options.length?question:null};
  }
  function assistant(value){
    const context=value?.context;
    const result=typeof value?.result==='string'?value.result:'';
    // Earlier control transitions stored instructions in the task result. They
    // describe temporary authority, so never restore them as a completed result.
    const controlNotice=['You control this display. Assistant will wait until you choose Continue.','Assistant may work with windows on this display when you give it a task.','The Workspace or monitor setup changed. Continue here when you are ready.','You took over the workspace. Resume when you are ready.'].includes(result);
    return {allowed:value?.allowed===true,permissions:permissions(value?.permissions),revision:Number.isSafeInteger(value?.revision)&&value.revision>=0?value.revision:0,status:STATUSES.includes(value?.status)?value.status:'idle',task:typeof value?.task==='string'?value.task:'',result:controlNotice?'':result,
      control:value?.control==='user'||value?.control!=='assistant'&&value?.status==='paused'?'user':'assistant',kind:['briefing','image','checklist','compare'].includes(value?.kind)?value.kind:'',
      context:record(context)&&key(context.workspace)&&key(context.setup)&&slot(context.slot)?{workspace:key(context.workspace),setup:key(context.setup),slot:slot(context.slot),folder:key(context.folder),...(own(context,'project')?{project:key(context.project)||null}:{}),...(key(context.chatId)?{chatId:key(context.chatId)}:{}),...(key(context.turnId)?{turnId:key(context.turnId)}:{}),...(key(context.operationId)?{operationId:key(context.operationId)}:{})}:null,
      outputs:ids(value?.outputs),activity:activity(value?.activity)};
  }
  function content(value){
    return {windows:ids(value?.windows),widgets:references(value?.widgets),folders:references(value?.folders),note:typeof value?.note==='string'?value.note.slice(0,8000):'',assistant:assistant(value?.assistant)};
  }
  function displays(roster){
    const used=new Set(),result=[];
    for(const [index,value] of (Array.isArray(roster)?roster:[]).entries()){
      if(!record(value))continue;
      let number=slot(value.slot)||index+1;while(used.has(number))number++;
      used.add(number);result.push({slot:number,width:dimension(value.width),height:dimension(value.height),screenWidth:dimension(value.screenWidth),screenHeight:dimension(value.screenHeight)});
    }
    return result.length?result.sort((a,b)=>a.slot-b.slot):[{slot:1,width:0,height:0,screenWidth:0,screenHeight:0}];
  }
  function signature(roster){
    // Viewport dimensions and browser source IDs are intentionally excluded.
    // Physical dimensions, when available, distinguish connected monitor sets.
    return 'displays:'+displays(roster).map(item=>item.slot+(item.screenWidth&&item.screenHeight?'@'+item.screenWidth+'x'+item.screenHeight:'')).join('|');
  }
  function normalizedRoles(value,available){
    const roles=Object.fromEntries(available.map(number=>[number,value?.[number]==='assistant'?'side':ROLES.includes(value?.[number])?value[number]:'extended']));
    const main=available.find(number=>roles[number]==='main')||available[0];
    for(const number of available)if(roles[number]==='main'&&number!==main)roles[number]='extended';
    roles[main]='main';return roles;
  }
  function create(saved={}){
    let state,currentDisplays,currentSignature;
    function load(value={}){
      state={version:3,setups:{},workspaces:{}};
      // The old Assistant role implied permission, but only existing saved
      // Workspace/display records inherit that intent. New Workspaces stay off.
      const legacyAllowed=new Set();
      for(const [,setup] of entries(value?.setups))for(const [number,role] of entries(setup?.roles))if(role==='assistant'&&slot(number))legacyAllowed.add(slot(number));
      for(const [name,valueSetup] of entries(value?.setups)){
        if(!record(valueSetup))continue;
        const available=[...new Set(entries(valueSetup.roles).map(([name])=>slot(name)).filter(Boolean))].sort((a,b)=>a-b);
        if(!available.length)continue;
        Object.defineProperty(state.setups,name,{value:{roles:normalizedRoles(valueSetup.roles,available)},enumerable:true,writable:true,configurable:true});
      }
      for(const [workspace,valueWorkspace] of entries(value?.workspaces)){
        if(!key(workspace)||!record(valueWorkspace))continue;
        const byDisplay={},seen=new Set();
        for(const [name,valueSpace] of entries(valueWorkspace.displays)){
          const number=slot(name);if(!number||!record(valueSpace))continue;
          const next=content(valueSpace);
          if(!own(valueSpace.assistant||{},'allowed')&&legacyAllowed.has(number))next.assistant.allowed=true;
          // Previous releases stored Workspace consent beside task state. Keep
          // that consent only for saved Side-space setups, never for Projects.
          if(Number(value?.version||0)<3&&next.assistant.allowed)for(const [setup,valueSetup] of entries(state.setups))if(valueSetup.roles[number]==='side'){
            next.assistant.permissions[permissionKey(setup)]={allowed:true,revision:next.assistant.revision};
          }
          next.windows=next.windows.filter(id=>{if(seen.has(id))return false;seen.add(id);return true;});byDisplay[number]=next;
        }
        Object.defineProperty(state.workspaces,workspace,{value:{displays:byDisplay},enumerable:true,writable:true,configurable:true});
      }
      currentDisplays=displays([]);currentSignature=signature(currentDisplays);connect(currentDisplays);
      return snapshot();
    }
    function connect(roster){
      currentDisplays=displays(roster);currentSignature=signature(currentDisplays);
      const next=normalizedRoles(own(state.setups,currentSignature)?state.setups[currentSignature].roles:{},currentDisplays.map(item=>item.slot));
      if(!own(state.setups,currentSignature)||JSON.stringify(state.setups[currentSignature].roles)!==JSON.stringify(next))state.setups[currentSignature]={roles:next};
      return setup();
    }
    function roles(){return clone(state.setups[currentSignature].roles);}
    function main(){return currentDisplays.find(item=>role(item.slot)==='main').slot;}
    function role(number){return state.setups[currentSignature].roles[slot(number)]||null;}
    function setup(){return {signature:currentSignature,displays:clone(currentDisplays),roles:roles(),main:main()};}
    function setRole(number,next){
      number=slot(number);const previous=role(number);
      const failure=reason=>({ok:false,reason,previous,role:previous,main:main()});
      if(!previous)return failure('unknown-display');
      if(!ROLES.includes(next))return failure('unknown-role');
      if(next===previous)return {ok:true,changed:false,previous,role:next,main:main()};
      if(currentDisplays.length===1&&next!=='main')return failure('single-display');
      if(previous==='main'&&next!=='main')return failure('choose-main-first');
      const target=state.setups[currentSignature].roles;
      if(next==='main')for(const name of Object.keys(target))if(target[name]==='main')target[name]='extended';
      target[number]=next;return {ok:true,changed:true,previous,role:next,main:main()};
    }
    function workspace(name){
      name=key(name);if(!name)return null;
      if(!own(state.workspaces,name))Object.defineProperty(state.workspaces,name,{value:{displays:{}},enumerable:true,writable:true,configurable:true});
      return state.workspaces[name];
    }
    function space(name,number){
      const target=workspace(name);number=slot(number);if(!target||!number)return content({});
      return clone(target.displays[number]||content({}));
    }
    function unpinWindow(name,id){
      const target=workspace(name);if(!target||!key(id))return false;let removed=false;
      for(const value of Object.values(target.displays)){const previous=value.windows.length;value.windows=value.windows.filter(name=>name!==id);if(value.windows.length!==previous)removed=true;}
      return removed;
    }
    function updateSpace(name,number,patch={}){
      if(!record(patch))patch={};
      const target=workspace(name);number=slot(number);if(!target||!number)return content({});
      const previous=target.displays[number]||content({}),next={...previous};
      if(own(patch,'windows')){next.windows=ids(patch.windows);for(const id of next.windows)unpinWindow(name,id);}
      if(own(patch,'widgets'))next.widgets=references(patch.widgets);
      if(own(patch,'folders'))next.folders=references(patch.folders);
      if(own(patch,'note'))next.note=typeof patch.note==='string'?patch.note.slice(0,8000):'';
      if(own(patch,'assistant'))next.assistant=assistant({...previous.assistant,...(record(patch.assistant)?patch.assistant:{}),revision:Math.min(Number.MAX_SAFE_INTEGER,Math.max(Date.now(),(previous.assistant.revision||0)+1))});
      target.displays[number]=next;return clone(next);
    }
    function pinWindow(name,number,id){
      if(!key(id)||!slot(number)||!key(name))return false;
      const previous=space(name,number);updateSpace(name,number,{windows:[...previous.windows,id]});return true;
    }
    function windowDisplay(name,id){
      const target=workspace(name);if(!target||!key(id))return null;
      const found=Object.entries(target.displays).find(([,value])=>value.windows.includes(id));return found?Number(found[0]):null;
    }
    function pruneWindows(name,validIds){
      const target=workspace(name);if(!target)return 0;const valid=new Set(ids(validIds));let removed=0;
      for(const value of Object.values(target.displays)){const previous=value.windows.length;value.windows=value.windows.filter(id=>valid.has(id));removed+=previous-value.windows.length;}
      return removed;
    }
    function setAssistant(name,number,patch){return updateSpace(name,number,{assistant:patch}).assistant;}
    function permission(name,number,{setup=currentSignature,project=null}={}){
      return clone(space(name,number).assistant.permissions[permissionKey(setup,project)]||{allowed:false,revision:0});
    }
    function setDisplayControl(name,number,allowed,{setup=currentSignature,project=null}={}){
      const previous=space(name,number).assistant,permissionName=permissionKey(setup,project),revision=Math.min(Number.MAX_SAFE_INTEGER,Math.max(Date.now(),previous.revision+1,Number(previous.permissions[permissionName]?.revision||0)+1));
      return setAssistant(name,number,{permissions:{...previous.permissions,[permissionName]:{allowed:allowed===true,revision}},...(!key(project)?{allowed:allowed===true}:{})});
    }
    function setAssistantAllowed(name,number,allowed){return setDisplayControl(name,number,allowed);}
    function snapshot(){return clone(state);}
    load(saved);
    return {load,connect,setup,roles,role,main,setRole,space,updateSpace,pinWindow,unpinWindow,windowDisplay,pruneWindows,setAssistant,setAssistantAllowed,permission,setDisplayControl,snapshot};
  }
  const api={create,signature,permissionKey,roles:ROLES.slice(),statuses:STATUSES.slice()};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SpatialDisplayRoles=api;
})(typeof globalThis!=='undefined'?globalThis:this);
