/* Settings is an ordinary, opaque app. Categories keep the scope of each
   preference visible without turning unrelated controls into one long form. */
(function(root){
  'use strict';
  function describe({workspace,project,page=0,temporary=false,display=1}){
    return {
      desktop:(temporary?'Temporary desktop':'Desktop '+(page+1))+' · '+(project?.name?project.name+' · ':'')+workspace+' · Display '+display,
      project:project?project.name+' Project':null,
      workspace:workspace+' Workspace',system:'All Workspaces'
    };
  }
  const categories=[
    {id:'home',label:'Home',icon:'home',detail:'Choose what you want to change.',scope:'system'},
    {id:'windows',label:'Windows',icon:'monitor',detail:'Arrange windows and move between your desktops.',scope:'desktop',group:'Your work'},
    {id:'project',label:'Project',icon:'folder',detail:'Files and downloads that follow this Project.',scope:'project',group:'Your work'},
    {id:'workspace',label:'Workspace',icon:'grid',detail:'Your Home folder and separate working environment.',scope:'workspace',group:'Your work'},
    {id:'areas',label:'Areas',icon:'grid',detail:'Choose which Areas stay beside your windows.',scope:'workspace',group:'Your work'},
    {id:'appearance',label:'Appearance',icon:'palette',detail:'Color theme and desktop indicators.',scope:'system',group:'System'},
    {id:'accessibility',label:'Accessibility',icon:'help',detail:'Reading size, pointer and motion.',scope:'system',group:'System'},
    {id:'displays',label:'Displays',icon:'monitor',detail:'Set up your screens and choose their roles.',scope:'system',group:'System'},
    {id:'connections',label:'Connections',icon:'wifi',detail:'Wi-Fi and Bluetooth demo controls.',scope:'system',group:'System'},
    {id:'sound',label:'Sound',icon:'volume',detail:'Shared sound and individual window volume.',scope:'system',group:'System'},
    {id:'about',label:'About',icon:'settings',detail:'Prototype information and help.',scope:'system'}
  ];
  const catalog=[
    {id:'window-arrangement',category:'windows',title:'Window arrangement',detail:'Open the desktop map to arrange and move windows.',keywords:'tile tiling layout desktop map fullscreen maximize'},
    {id:'project-folder',category:'project',title:'Project folder',detail:'Manage the current Project and its folder.',keywords:'manage root directory files'},
    {id:'project-downloads',category:'project',title:'Download into this Project',detail:'Choose where this Project’s downloads are saved.',keywords:'downloads save location destination'},
    {id:'workspace-home',category:'workspace',title:'Workspace Home',detail:'Open the Home folder for the current Workspace.',keywords:'home folder directory profile browser data separate'},
    {id:'area-visibility',category:'areas',title:'Area visibility',detail:'Show, hide, expand or compact Apps, Files, System and Assistant.',keywords:'panel dock compact expanded hidden size'},
    {id:'reset-areas',category:'areas',title:'Reset Areas',detail:'Restore the default Area layout in this Workspace.',keywords:'panel dock position layout reset'},
    {id:'color-theme',category:'appearance',title:'Color theme',detail:'Auto, OLED, Graphite or Light across all Workspaces.',keywords:'dark light black colors surface theme automatic'},
    {id:'desktop-indicators',category:'appearance',title:'Desktop indicators',detail:'Choose lines only or lines with app icons.',keywords:'markers rail icons desktop lines'},
    {id:'reading-size',category:'accessibility',title:'Reading size',detail:'Enlarge document text and file names.',keywords:'font text larger zoom accessibility'},
    {id:'pointer-style',category:'accessibility',title:'Pointer',detail:'Use the Material pointer, a larger pointer or your system pointer.',keywords:'cursor mouse size native accessibility'},
    {id:'reduce-motion',category:'accessibility',title:'Reduce motion',detail:'Follow your system preference or reduce animation.',keywords:'animation transitions movement accessibility'},
    {id:'display-roles',category:'displays',title:'Display roles',detail:'Main workspace, Extended workspace or Side space with optional Assistant control.',keywords:'monitor screen second main extended assistant permission side pinned odkládací'},
    {id:'second-display',category:'displays',title:'Open second demo display',detail:'Try another screen in a linked browser window.',keywords:'monitor screen second companion popup'},
    {id:'wifi',category:'connections',title:'Wi-Fi',detail:'Toggle the shared Wi-Fi demo state.',keywords:'network internet wireless connections'},
    {id:'bluetooth',category:'connections',title:'Bluetooth',detail:'Toggle the shared Bluetooth demo state.',keywords:'devices wireless connections pairing'},
    {id:'sound-output',category:'sound',title:'Sound output',detail:'Toggle the shared Sound demo state.',keywords:'mute unmute audio speaker volume'},
    {id:'window-volume',category:'sound',title:'Window volume',detail:'Use each window’s audio control for its own volume.',keywords:'audio speaker app volume slider'},
    {id:'prototype-info',category:'about',title:'About Spatial Desktop',detail:'Learn what this web prototype can demonstrate.',keywords:'help guide native local scripted assistant prototype'}
  ];
  function search(query){
    const terms=String(query||'').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    if(!terms.length)return [];
    return catalog.filter(entry=>{
      const category=categories.find(item=>item.id===entry.category);
      const haystack=[entry.title,entry.detail,entry.keywords,category?.label].join(' ').toLocaleLowerCase();
      return terms.every(term=>haystack.includes(term));
    });
  }
  if(typeof module!=='undefined' && module.exports){module.exports={describe,categories,catalog,search};return;}
  const host=document.querySelector('.settings-app-content');if(!host)return;
  const navigationKey='spatial-settings-nav-v1';
  let navigation={};try{const saved=JSON.parse(desktopStorage.getItem(navigationKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))navigation=saved;}catch{}
  const state={category:'home',query:'',history:[],contextKey:'',options:{},workspaceId:activeWorkspace};
  const displayHosts=new WeakSet();
  function restoreNavigation(){
    const saved=navigation[activeWorkspace]||{};
    state.workspaceId=activeWorkspace;state.category=categoryFor(saved.category).id;
    state.query=typeof saved.query==='string'?saved.query.slice(0,300):'';
    state.history=Array.isArray(saved.history)?saved.history.filter(id=>categories.some(item=>item.id===id)).slice(-24):[];
    state.options={};state.contextKey='';
    const input=host.querySelector('[data-settings-search]');if(input)input.value=state.query;
  }
  function saveNavigation(){
    navigation[state.workspaceId]={category:state.category,query:state.query.slice(0,300),history:state.history.slice(-24)};
    try{desktopStorage.setItem(navigationKey,JSON.stringify(navigation));}catch{}
  }
  const escape=value=>escapeHtml(String(value??''));
  const icon=name=>'<svg aria-hidden="true"><use href="#i-'+name+'"/></svg>';
  const action=(name,label,disabled=false)=>'<button type="button" class="surface-key settings-action" data-setting-action="'+name+'"'+(disabled?' disabled title="Available later in the Guide"':'')+'>'+label+'</button>';
  const row=(id,label,detail,control='')=>'<section class="settings-row" id="settings-'+id+'" data-settings-target="'+id+'" tabindex="-1"><div><h3>'+label+'</h3>'+(detail?'<p>'+detail+'</p>':'')+'</div>'+control+'</section>';
  function context(){
    const id=desktopPages.column(activeWorkspace),project=projectSpaces[id];
    const bond=desktopPages.selectedFullscreen(activeWorkspace),display=localDisplaySlot();
    return {workspace:workspaceProfiles[activeWorkspace].label,workspaceId:activeWorkspace,owner:id,project:project?{...project,id}:null,page:desktopPages.current(activeWorkspace),temporary:Boolean(bond && Math.min(bond.display,activeDisplayRoster().length)===display),display};
  }
  function categoryFor(id){return categories.find(item=>item.id===id)||categories[0];}
  function allowed(feature){return !root.SpatialGuide?.model.active() || SpatialGuide.model.allows(feature);}
  function allowedAreas(){return allowed('area-settings');}
  function contextKey(ctx){return JSON.stringify([ctx.workspaceId,ctx.owner,ctx.page,ctx.temporary,ctx.display,ctx.project?.name,ctx.project?.root,['area-settings','projects','desktops','folders'].map(allowed)]);}
  function create(){
    host.innerHTML='<div class="settings-app-toolbar"><button type="button" class="surface-key settings-back" data-settings-back aria-label="Back in Settings" title="Back">'+icon('left')+'</button><label class="recessed-field settings-search">'+icon('search')+'<input type="search" data-settings-search aria-label="Search settings" placeholder="Search settings" autocomplete="off" spellcheck="false" maxlength="300"></label></div><div class="settings-app-layout"><nav class="settings-app-sidebar" aria-label="Settings categories">'+
      '<button type="button" class="settings-nav nav-choice" data-settings-category="home" title="Home">'+icon('home')+'<span>Home</span></button>'+['Your work','System'].map(group=>'<div class="settings-nav-group"><span>'+group+'</span>'+categories.filter(item=>item.group===group).map(item=>'<button type="button" class="settings-nav nav-choice" data-settings-category="'+item.id+'" title="'+item.label+'">'+icon(item.icon)+'<span>'+item.label+'</span></button>').join('')+'</div>').join('')+'<button type="button" class="settings-nav nav-choice settings-about-nav" data-settings-category="about" title="About">'+icon('settings')+'<span>About</span></button></nav><main class="settings-app-page" aria-label="Settings page" tabindex="-1"></main></div>';
    prepareMaterialSurfaces(host);prepareControlSemantics(host);
  }
  function scopeBanner(category,ctx){
    const names=describe(ctx),scope=category.scope;
    if(category.id==='home')return '';
    const label={desktop:'This desktop',project:'This Project',workspace:'This Workspace',system:'Applies to'}[scope];
    const target=scope==='project'&&!ctx.project?'No Project open':names[scope];
    return '<div class="settings-scope-banner" data-setting-scope="'+scope+'"><span>'+label+'</span><b>'+escape(target)+'</b></div>';
  }
  function toggleRow(id,label,detail){return row(id,label,detail,'<button type="button" class="surface-key settings-state-toggle" data-settings-toggle="'+label+'" aria-pressed="false"><span></span></button>');}
  function pageContent(id,ctx){
    const profile=workspaceProfiles[activeWorkspace],project=ctx.project;
    if(id==='home')return '<p class="settings-home-scope">Current workspace: <b>'+escape(ctx.workspace)+' Workspace</b></p><div class="settings-category-grid">'+categories.filter(item=>!['home','about'].includes(item.id)).map(item=>'<button type="button" class="settings-category-card nav-choice" data-settings-category="'+item.id+'">'+icon(item.icon)+'<span><b>'+item.label+'</b><small>'+item.detail+'</small></span>'+icon('right')+'</button>').join('')+'</div>';
    if(id==='windows')return row('window-arrangement','Window arrangement',ctx.temporary?'Restore the borderless fullscreen app before arranging its window.':'Windows tile automatically on this desktop. Use the desktop map to move a window to another desktop.',action('desktop-map','Open desktop map',!allowed('projects')||!allowed('desktops')))+
      '<details class="settings-help"><summary>Window shortcuts</summary><p>Meta + Tab opens the desktop map. Meta + D returns a maximized or Gamescope window to tiling. Hold F2 instead of Meta in this browser demo.</p><p>Click the desktop background or an Area, then scroll to switch desktops.</p></details>';
    if(id==='project')return project?row('project-folder','Project folder',escape(project.root),action('project','Manage Project',!allowed('projects')))+
      row('project-downloads','Download into this Project','Save downloads from this Project’s windows in its Downloads folder. The preference follows the Project across Workspaces.','<label class="settings-checkbox"><input type="checkbox" data-project-download-toggle data-settings-project="'+escape(project.id)+'" data-settings-workspace="'+escape(ctx.workspaceId)+'"'+(project.downloadToProject?' checked':'')+'><span>Use Project Downloads</span></label>')+
      '<p class="settings-destination">Downloads currently use <b data-settings-download-destination>'+escape(SpatialHomeFolders.downloadDestination(workspaceProfiles,projectSpaces,activeWorkspace,project.id))+'</b>.</p>':
      '<div class="settings-empty">'+icon('folder')+'<h3>No Project open</h3><p>Open a Project to manage its folder and download location. Your Workspace Home is available across its desktops.</p>'+action('projects','Open Projects & Files',!allowed('projects'))+'</div>';
    if(id==='workspace')return row('workspace-home','Workspace Home',escape(profile.home),action('home-folder','Open folder',!allowed('folders')))+
      '<div class="settings-help"><p>Apps use this Home folder for files and settings. It stays the same across this Workspace’s desktops and Projects. Switching Workspace restores that Workspace’s own windows, Projects and Areas.</p></div>';
    if(id==='areas'){
      if(!allowedAreas())return '<div class="settings-help"><b>Continue the Guide</b><p>Area controls become available when the Guide reaches Area settings.</p></div>';
      return '<section data-settings-target="area-visibility" id="settings-area-visibility" tabindex="-1"><div class="settings-section-intro"><h3>Visible Areas</h3><p>Position, size and visibility apply across this Workspace’s desktops and Projects.</p></div><div class="settings-area-list">'+areaPriority.map(name=>'<label class="settings-area-row"><span><b>'+escape(areaLabel(name))+'</b></span><select data-settings-area="'+name+'" data-settings-workspace="'+escape(ctx.workspaceId)+'" aria-label="'+escape(areaLabel(name))+' display state"><option value="expanded">Expanded</option><option value="rail">Compact</option><option value="hidden">Hidden</option></select></label>').join('')+'</div></section>'+row('reset-areas','Reset Areas','Restore the default positions, sizes and visibility for this Workspace.',action('reset-areas','Reset Areas'))+'<div class="settings-help"><p>Drag an Area’s header to move it. Drag its edge to resize; push past the stop to snap to Compact.</p></div>';
    }
    if(id==='appearance')return row('color-theme','Color theme','Auto follows your system’s light or dark appearance.','<select data-settings-theme aria-label="Color theme for all Workspaces"><option value="auto">Auto</option><option value="oled">OLED</option><option value="graphite">Graphite</option><option value="light">Light</option></select>')+
      row('desktop-indicators','Desktop indicators','Lines only leaves more room for windows. App icons show what is open on each desktop.','<select data-settings-desktop-markers aria-label="Desktop indicators for all Workspaces"><option value="lines">Lines only</option><option value="icons">Lines and app icons</option></select>');
    if(id==='displays')return '<div data-settings-target="display-roles" id="settings-display-roles" tabindex="-1"><div data-settings-displays></div></div>';
    if(id==='accessibility')return row('reading-size','Reading size','Applies to document text, file names and Settings descriptions. Browser zoom remains available for the whole interface.','<select data-settings-accessibility="text" aria-label="Reading size"><option value="normal">Normal</option><option value="large">Large · 115%</option><option value="larger">Larger · 130%</option></select>')+row('pointer-style','Pointer','Choose the pointer that is easiest to see.','<select data-settings-accessibility="pointer" aria-label="Pointer style"><option value="material">Material</option><option value="large">Large Material</option><option value="system">System pointer</option></select>')+row('reduce-motion','Motion','System follows your device’s reduced-motion preference.','<select data-settings-accessibility="motion" aria-label="Motion preference"><option value="system">System</option><option value="reduced">Reduce motion</option></select>')+'<details class="settings-help"><summary>Keyboard navigation</summary><p>Use Tab and Shift+Tab to move between controls, Enter to activate, and Escape to dismiss dialogs. F2 opens Overview. File Browser supports F2 to rename, Delete for Trash and Ctrl+C / X / V. Note Editor supports Ctrl+O, Ctrl+S and Ctrl+Shift+S.</p></details>';
    if(id==='connections')return '<p class="settings-demo-note">Simulated controls · no hardware settings are changed.</p>'+toggleRow('wifi','Wi-Fi','')+toggleRow('bluetooth','Bluetooth','')+row('network-devices','Networks & devices','Choose a demo network, pair a device and safely remove demo storage.',action('network-devices','Open connections'));
    if(id==='sound')return '<p class="settings-demo-note">Simulated sound control · native audio settings stay unchanged.</p>'+toggleRow('sound-output','Sound','')+row('sound-devices','Input & output','Select a demo speaker or microphone and control microphone mute.',action('sound-devices','Sound devices'))+row('window-volume','Window volume','Use the speaker button and volume slider in a window’s title bar to adjust that window only.')+'<div class="settings-help"><p>The Music Player and embedded audio previews use their window’s volume. Native audio routing will need desktop integration.</p></div>';
    return '<section class="settings-about" data-settings-target="prototype-info" id="settings-prototype-info" tabindex="-1"><span>'+icon('settings')+'</span><h3>Spatial Desktop</h3><p>A tactile, project-centred computing environment.</p><p class="settings-demo-note">Work in progress · interactive web prototype</p></section><div class="settings-help"><b>What this demo does</b><p>Explore tiling windows, Workspaces, Projects, Areas and linked demo displays. Preferences save locally in this browser.</p><p>Assistant replies and tasks are local scripted examples. Native OS integration remains future work.</p></div>'+row('guide','Learn the desktop','Use the interactive Guide for a step-by-step introduction.',action('guide','Open Guide'));
  }
  function renderPage({focus=false,targetId=null}={}){
    const page=host.querySelector('.settings-app-page'),ctx=context(),category=categoryFor(state.category);
    state.contextKey=contextKey(ctx);
    if(state.query.trim()){
      const results=search(state.query);
      page.innerHTML='<header class="settings-page-heading"><h2 tabindex="-1">Search settings</h2><p role="status" aria-live="polite">'+results.length+' result'+(results.length===1?'':'s')+' for “'+escape(state.query)+'”</p></header><div class="settings-search-results">'+(results.length?results.map(result=>'<button type="button" class="settings-search-result nav-choice" data-settings-category="'+result.category+'" data-settings-result="'+result.id+'">'+icon(categoryFor(result.category).icon)+'<span><small>'+categoryFor(result.category).label+'</small><b>'+result.title+'</b><span>'+result.detail+'</span></span>'+icon('right')+'</button>').join(''):'<div class="settings-empty"><h3>No settings found</h3><p>Try a word such as “theme”, “monitor”, “downloads” or “Areas”.</p></div>')+'</div>';
    }else{
      page.innerHTML='<header class="settings-page-heading"><h2 tabindex="-1">'+category.label+'</h2><p>'+category.detail+'</p></header>'+scopeBanner(category,ctx)+'<div class="settings-page-body">'+pageContent(category.id,ctx)+'</div>';
    }
    host.querySelectorAll('[data-settings-category]').forEach(button=>{if(!button.classList.contains('settings-nav'))return;const active=!state.query&&button.dataset.settingsCategory===state.category;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    host.querySelector('[data-settings-back]').disabled=!state.query&&!state.history.length;
    page.scrollTop=0;
    prepareMaterialSurfaces(host);prepareControlSemantics(host);refreshControls();
    if(targetId){
      const target=page.querySelector('[data-settings-target="'+CSS.escape(targetId)+'"]')||(targetId==='second-display'?page.querySelector('[data-display-open-companion]'):null);
      if(target){target.scrollIntoView({block:'nearest'});target.focus({preventScroll:true});}
    }else if(focus)page.querySelector('h2')?.focus({preventScroll:true});
  }
  function refreshControls(){
    // Navigation is restored before the Displays module finishes loading.
    // Mount it when available, once per rendered page, so a refresh never
    // re-applies the original deep-link slot over the user's monitor choice.
    const displays=host.querySelector('[data-settings-displays]');
    if(displays&&!displayHosts.has(displays)&&root.SpatialDisplaySettings?.mount){
      if(root.SpatialDisplaySettings.mount(displays,state.options.slot))displayHosts.add(displays);
    }
    const select=host.querySelector('[data-settings-theme]');if(select&&document.activeElement!==select)select.value=SpatialDesktopTheme.preference;
    const markers=host.querySelector('[data-settings-desktop-markers]');if(markers&&document.activeElement!==markers)markers.value=root.SpatialDesktopMarkers?.preference||'icons';
    const accessibility=root.SpatialAccessibility?.snapshot();if(accessibility)host.querySelectorAll('[data-settings-accessibility]').forEach(select=>{if(document.activeElement!==select)select.value=accessibility[select.dataset.settingsAccessibility];});
    host.querySelectorAll('[data-settings-area]').forEach(select=>{const name=select.dataset.settingsArea,area=areaFor(name);if(!area)return;const value=area.hidden?'hidden':area.dataset.areaState;select.value=value;const description=host.querySelector('[data-settings-area-state="'+name+'"]');if(description)description.textContent=value==='hidden'?'Hidden':layoutStateLabel(value);});
    host.querySelectorAll('[data-settings-toggle]').forEach(button=>{
      const label=button.dataset.settingsToggle,source=$$('.quick-toggle[data-toggle]').find(node=>node.textContent.trim()===label),active=source?.classList.contains('is-active')||false;
      button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-active',active);button.querySelector('span').textContent=active?'On':'Off';button.setAttribute('aria-label',label+' · '+(active?'On':'Off')+' · All Workspaces · Demo control');
    });
    const download=host.querySelector('[data-project-download-toggle]'),ctx=context();
    if(download&&ctx.project)download.checked=Boolean(ctx.project.downloadToProject);
    const destination=host.querySelector('[data-settings-download-destination]');if(destination&&ctx.project)destination.textContent=SpatialHomeFolders.downloadDestination(workspaceProfiles,projectSpaces,activeWorkspace,ctx.project.id);
    root.SpatialDisplaySettings?.refresh();
  }
  function refresh(){
    if(state.workspaceId!==activeWorkspace){restoreNavigation();renderPage();return;}
    const ctx=context(),key=contextKey(ctx);
    if(key!==state.contextKey)renderPage();else refreshControls();
  }
  function navigate(category,options={}){
    category=categoryFor(category).id;
    if(category!==state.category)state.history.push(state.category);state.history=state.history.slice(-24);
    state.category=category;state.query='';state.options=options;
    host.querySelector('[data-settings-search]').value='';saveNavigation();renderPage({focus:true,targetId:options.targetId});
  }
  function open(category,options={}){
    if(root.SpatialGuide?.model.active()&&!SpatialGuide.model.allows('systems'))return;
    const aliases={desktop:'windows',system:'home'};category=aliases[category]||category;
    setUniversalSearchOpen(false);launchAppHere('settings');
    if(state.workspaceId!==activeWorkspace)restoreNavigation();
    if(category)navigate(category,options);else refresh();
  }
  create();restoreNavigation();renderPage();
  host.addEventListener('input',event=>{if(!event.target.matches('[data-settings-search]'))return;state.query=event.target.value;saveNavigation();renderPage();});
  host.addEventListener('search',event=>{if(!event.target.matches('[data-settings-search]'))return;state.query=event.target.value;saveNavigation();renderPage();});
  host.addEventListener('click',event=>{
    const nav=event.target.closest('[data-settings-category]');if(nav){navigate(nav.dataset.settingsCategory,{targetId:nav.dataset.settingsResult});return;}
    if(event.target.closest('[data-settings-back]')){
      if(state.query){state.query='';host.querySelector('[data-settings-search]').value='';saveNavigation();renderPage({focus:true});}
      else if(state.history.length){state.category=state.history.pop();state.options={};saveNavigation();renderPage({focus:true});}return;
    }
    const toggle=event.target.closest('[data-settings-toggle]');if(toggle){const label=toggle.dataset.settingsToggle;setSystemToggle(label,toggle.getAttribute('aria-pressed')!=='true');queueDesktopStateBroadcast(0);refreshControls();return;}
    const button=event.target.closest('[data-setting-action]');if(!button)return;
    const name=button.dataset.settingAction,ctx=context();
    if(name==='home-folder'&&allowed('folders')){openFileLocation(workspaceProfiles[activeWorkspace].home);setUniversalSearchOpen(false);}
    if(name==='project'&&ctx.project&&allowed('projects'))openProjectEditor('manage',{projectName:ctx.project.id});
    if(name==='reset-areas'&&allowedAreas()){$('#resetAreas').click();refresh();}
    if(name==='desktop-map'&&allowed('projects')&&allowed('desktops'))root.SpatialDesktopMapDesktop?.open();
    if(name==='projects'&&allowed('projects')){setUniversalSearchOpen(true);document.querySelector('[data-overview-section="projects"]')?.click();}
    if(name==='guide')root.SpatialGuide?.open?.();
    if(name==='network-devices')root.SpatialDesktopSystem?.open('network');
    if(name==='sound-devices')root.SpatialDesktopSystem?.open('sound');
  });
  host.addEventListener('change',event=>{
    const target=event.target;
    if(target.matches('[data-settings-theme]')){SpatialDesktopTheme.setPreference(target.value);refreshControls();}
    if(target.matches('[data-settings-desktop-markers]')){root.SpatialDesktopMarkers?.setPreference(target.value);refreshControls();}
    if(target.matches('[data-settings-accessibility]')){root.SpatialAccessibility?.set({[target.dataset.settingsAccessibility]:target.value});refreshControls();}
    if(target.matches('[data-settings-area]')&&allowedAreas()){
      if(target.dataset.settingsWorkspace!==activeWorkspace){refresh();return;}
      setAreaState(target.dataset.settingsArea,target.value);refresh();
    }
    if(target.matches('[data-project-download-toggle]')){
      const ctx=context();if(target.dataset.settingsWorkspace!==ctx.workspaceId||target.dataset.settingsProject!==ctx.project?.id){refresh();return;}
      const project=projectSpaces[ctx.project?.id];if(!project)return;
      project.downloadToProject=target.checked;if(project.downloadToProject)ensureProjectDownloads(ctx.project.id);
      persistProjectState();refreshDownloadUi();if(activeProjectName===ctx.project.id)renderProjectSpace(ctx.project.id);queueDesktopStateBroadcast(0);refreshControls();
    }
  });
  host.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f'){event.preventDefault();event.stopPropagation();host.querySelector('[data-settings-search]').focus();}
    if(event.key==='Escape'&&event.target.matches('[data-settings-search]')&&state.query){event.preventDefault();event.stopPropagation();state.query='';event.target.value='';saveNavigation();renderPage();}
  });
  document.addEventListener('click',event=>{const button=event.target.closest('[data-open-settings]');if(button)open(button.dataset.settingsCategory);else if(event.target.closest('.quick-toggle[data-toggle]'))queueMicrotask(refreshControls);});
  /* Project management remains a separate editor; it is no longer borrowed
     to present Settings. Preserve its explicit Project scope note. */
  const originalRender=renderProjectEditor;
  renderProjectEditor=function(...args){
    const result=originalRender(...args),project=projectSpaces[projectEditorState?.projectName];
    if(project&&['manage','delete-project'].includes(projectEditorState?.view)){
      const note=document.createElement('p');note.className='settings-scope-note';note.textContent='Applies to: '+project.name+' Project · follows this Project across Workspaces';$('#projectEditorBody').prepend(note);
    }
    return result;
  };
  if(root.SpatialDesktopMarkers)root.SpatialDesktopMarkers.onChange=()=>{renderDesktopPageRail();if(windowViewportLockReady)scheduleWindowTiling();refresh();};
  const areaNote=document.createElement('p');areaNote.id='overviewAreaSettingsScope';areaNote.className='settings-scope-note';$('.overview-areas-widget')?.prepend(areaNote);
  const updateNotes=()=>{
    const ctx=context();areaNote.textContent='Applies to: '+ctx.workspace+' Workspace · all its desktops and Projects';
    $$('[data-area-resize]').forEach(button=>{button.title='Drag to resize · push past the stop to snap Compact · pull to expand · applies to '+ctx.workspace+' Workspace';});
    $$('.quick-toggle[data-toggle]').filter(button=>button.textContent.trim()!=='Focus').forEach(button=>{button.title=button.textContent.trim()+' · All Workspaces · Demo control';});
    const theme=$('#themeToggle');if(theme&&!theme.title.includes(' · Applies to all Workspaces'))theme.title+=' · Applies to all Workspaces';refresh();
  };
  const originalUpdate=updateDesktopPageUi;updateDesktopPageUi=function(...args){const result=originalUpdate(...args);updateNotes();return result;};
  root.addEventListener('storage',refresh);
  document.addEventListener('DOMContentLoaded',refresh,{once:true});
  root.SpatialSettings={open,refresh,navigate,search,catalog,categories,category:()=>state.category};updateNotes();
})(typeof globalThis!=='undefined'?globalThis:this);
