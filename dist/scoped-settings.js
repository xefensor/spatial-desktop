/* Settings name the context their existing actions actually change. */
(function(root){
  'use strict';
  function describe({workspace,project,page=0,temporary=false,display=1}){
    return {
      desktop:(temporary?'Temporary desktop':'Desktop '+(page+1))+' · '+(project?.name?project.name+' · ':'')+workspace+' · Display '+display,
      project:project?project.name+' Project':null,
      workspace:workspace+' Workspace',system:'All Workspaces'
    };
  }
  if(typeof module!=='undefined' && module.exports){module.exports={describe};return;}
  const dialog=document.querySelector('#projectEditorDialog');if(!dialog)return;
  function context(){
    const id=desktopPages.column(activeWorkspace),project=projectSpaces[id];
    const bond=desktopPages.selectedFullscreen(activeWorkspace),display=localDisplaySlot();
    return {workspace:workspaceProfiles[activeWorkspace].label,workspaceId:activeWorkspace,owner:id,project:project?{...project,id}:null,page:desktopPages.current(activeWorkspace),temporary:Boolean(bond && Math.min(bond.display,activeDisplayRoster().length)===display),display};
  }
  const section=(scope,label,target,content)=>'<section class="settings-scope" data-setting-scope="'+scope+'"><header><h3>'+label+'</h3><p>Applies to: <b>'+escapeHtml(target)+'</b></p></header><div class="settings-scope-content">'+content+'</div></section>';
  const row=(label,detail,control)=>'<div class="scoped-setting-row"><div><b>'+label+'</b><small>'+detail+'</small></div>'+control+'</div>';
  const action=(name,label)=>'<button type="button" class="surface-key" data-setting-action="'+name+'">'+label+'</button>';
  function renderSettings(){
    const ctx=context(),names=describe(ctx),profile=workspaceProfiles[activeWorkspace],project=ctx.project;
    projectEditorState.settingsWorkspace=activeWorkspace;
    projectEditorState.projectName=project?.id||null;
    $('#projectEditorKicker').textContent=ctx.workspace+' / '+(project?.name||'Workspace');
    $('#projectEditorTitle').textContent='Settings';
    $('.project-editor-mark use',dialog).setAttribute('href','#i-settings');
    $('#closeProjectEditor').setAttribute('aria-label','Close Settings');
    let content=section('desktop','This desktop',names.desktop,row(ctx.temporary?'Borderless fullscreen':'Window arrangement',ctx.temporary?'This temporary desktop is dedicated to its fullscreen app. Restore the window before arranging it.':'Positions, splits and floating windows belong to this desktop and display.',action('desktop',ctx.temporary?'Return to fullscreen app':'Arrange on desktop')));
    if(project){
      content+=section('project','Project',names.project,
        row('Project folder',escapeHtml(project.root),action('project','Manage Project'))+
        '<label class="scoped-project-download"><input type="checkbox" data-project-download-toggle'+(project.downloadToProject?' checked':'')+'><span><b>Download into this Project</b><small>Only downloads from this Project’s windows. This preference follows the Project across Workspaces.</small></span></label>'+
        '<p class="project-download-destination">Downloads currently use <b>'+escapeHtml(SpatialHomeFolders.downloadDestination(workspaceProfiles,projectSpaces,activeWorkspace,project.id))+'</b>.</p>');
    }
    const canEditAreas=!root.SpatialGuide?.model.active() || SpatialGuide.model.allows('area-settings');
    const areas=canEditAreas?areaPriority.map(name=>'<div class="scoped-area-row"><span><b>'+escapeHtml(areaLabel(name))+'</b><small data-settings-area-state="'+name+'"></small></span><button type="button" class="surface-key" data-settings-area="'+name+'"></button></div>').join(''):'';
    content+=section('workspace','Workspace',names.workspace,
      row('Workspace Home',escapeHtml(profile.home),'')+
      '<div class="scoped-area-heading"><div><b>Areas</b><small>Position, size and visibility apply to all desktops and Projects in '+escapeHtml(ctx.workspace)+'.'+(canEditAreas?'':' Area controls appear later in the Guide.')+'</small></div>'+(canEditAreas?action('reset-areas','Reset Areas'):'')+'</div><div class="scoped-area-list">'+areas+'</div>');
    const toggles=['Wi-Fi','Bluetooth','Sound'].map(label=>'<button type="button" class="scoped-system-toggle surface-key" data-settings-toggle="'+label+'" aria-pressed="false"><b>'+label+'</b><small></small></button>').join('');
    content+=section('system','System-wide',names.system,
      row('Color theme','Shared by every Workspace. Auto follows your system’s appearance.','<select data-settings-theme aria-label="Color theme for all Workspaces"><option value="auto">Auto</option><option value="oled">OLED</option><option value="graphite">Graphite</option><option value="light">Light</option></select>')+
      row('Desktop indicators','Shared by every Workspace and display. Choose simple lines or include every open window’s app icon. Window spacing stays the same.','<select data-settings-desktop-markers aria-label="Desktop indicators for all Workspaces"><option value="lines">Lines only</option><option value="icons">Lines and app icons</option></select>')+
      '<div class="scoped-device-heading"><b>Connection & sound</b><small>Demo controls · these switches do not change native hardware.</small></div><div class="scoped-system-toggles">'+toggles+'</div>');
    $('#projectEditorBody').innerHTML='<div class="settings-scopes">'+content+'</div>';
    prepareMaterialSurfaces(dialog);prepareControlSemantics(dialog);refresh();
  }
  function refresh(){
    if(projectEditorState?.view!=='settings')return;
    if(projectEditorState.settingsWorkspace!==activeWorkspace){closeProjectEditor();return;}
    $$('[data-settings-area]',dialog).forEach(button=>{
      const name=button.dataset.settingsArea,area=areaFor(name),state=area.hidden?'Hidden':layoutStateLabel(area.dataset.areaState);
      $('[data-settings-area-state="'+name+'"]',dialog).textContent=state;
      button.textContent=area.hidden?'Show':'Hide';button.setAttribute('aria-label',(area.hidden?'Show ':'Hide ')+areaLabel(name)+' in '+workspaceProfiles[activeWorkspace].label+' Workspace');
    });
    const select=$('[data-settings-theme]',dialog);if(select)select.value=SpatialDesktopTheme.preference;
    const markers=$('[data-settings-desktop-markers]',dialog);if(markers)markers.value=root.SpatialDesktopMarkers?.preference||'icons';
    $$('[data-settings-toggle]',dialog).forEach(button=>{
      const label=button.dataset.settingsToggle,source=$$('.quick-toggle[data-toggle]').find(node=>node.textContent.trim()===label);
      const active=source?.classList.contains('is-active')||false;
      button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-active',active);$('small',button).textContent=active?'On':'Off';
      button.setAttribute('aria-label',label+' · '+(active?'On':'Off')+' · All Workspaces · Demo control');
    });
  }
  function open(){
    if(root.SpatialGuide?.model.active() && !SpatialGuide.model.allows('systems'))return;
    openProjectEditor('settings');
  }
  const originalRender=renderProjectEditor;
  renderProjectEditor=function(...args){
    if(projectEditorState?.view==='settings')return renderSettings();
    $('#closeProjectEditor').setAttribute('aria-label','Close project editor');
    $('.project-editor-mark use',dialog).setAttribute('href','#i-folder');
    const result=originalRender(...args);
    const project=projectSpaces[projectEditorState?.projectName];
    if(project && ['manage','delete-project'].includes(projectEditorState?.view)){
      const note=document.createElement('p');note.className='settings-scope-note';note.textContent='Applies to: '+project.name+' Project · follows this Project across Workspaces';$('#projectEditorBody').prepend(note);
    }
    return result;
  };
  document.addEventListener('click',event=>{if(event.target.closest('[data-open-settings]'))open();});
  dialog.addEventListener('click',event=>{
    if(projectEditorState?.view!=='settings')return;
    const area=event.target.closest('[data-settings-area]'),toggle=event.target.closest('[data-settings-toggle]'),button=event.target.closest('[data-setting-action]');
    if(area){const name=area.dataset.settingsArea;if(areaFor(name).hidden)showArea(name,false);else hideArea(name);refresh();}
    if(toggle){const label=toggle.dataset.settingsToggle,source=$$('.quick-toggle[data-toggle]').find(node=>node.textContent.trim()===label);source?.click();queueDesktopStateBroadcast(0);refresh();}
    if(button){
      const action=button.dataset.settingAction;
      if(action==='desktop'){closeProjectEditor();setUniversalSearchOpen(false);$('.workspace-zone').focus({preventScroll:true});}
      if(action==='project'){projectEditorState.view='manage';renderProjectEditor();$('#closeProjectEditor').focus();}
      if(action==='reset-areas'){$('#resetAreas').click();refresh();}
    }
  });
  dialog.addEventListener('change',event=>{
    if(event.target.matches('[data-settings-theme]')){SpatialDesktopTheme.setPreference(event.target.value);refresh();}
    if(event.target.matches('[data-settings-desktop-markers]')){root.SpatialDesktopMarkers?.setPreference(event.target.value);refresh();}
  });
  if(root.SpatialDesktopMarkers)root.SpatialDesktopMarkers.onChange=()=>{renderDesktopPageRail();refresh();};
  const areaNote=document.createElement('p');areaNote.id='overviewAreaSettingsScope';areaNote.className='settings-scope-note';$('.overview-areas-widget').prepend(areaNote);
  const updateNotes=()=>{
    const ctx=context();areaNote.textContent='Applies to: '+ctx.workspace+' Workspace · all its desktops and Projects';
    $$('[data-area-resize]').forEach(button=>{button.title='Drag to resize · applies to '+ctx.workspace+' Workspace';});
    $$('.quick-toggle[data-toggle]').filter(button=>button.textContent.trim()!=='Focus').forEach(button=>{button.title=button.textContent.trim()+' · All Workspaces · Demo control';});
    const theme=$('#themeToggle');if(!theme.title.includes(' · Applies to all Workspaces'))theme.title+=' · Applies to all Workspaces';
    refresh();
  };
  const originalUpdate=updateDesktopPageUi;updateDesktopPageUi=function(...args){const result=originalUpdate(...args);updateNotes();return result;};
  root.addEventListener('storage',()=>refresh());
  root.SpatialSettings={open,refresh};updateNotes();
})(typeof globalThis!=='undefined'?globalThis:this);
