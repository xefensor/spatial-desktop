/* Shared workspace and first-run desktop setup; no demo content in a new workspace. */
(function(root) {
  'use strict';
  const presetKey = 'spatial-desktop-preset-v1', profilesKey = 'spatial-custom-workspaces-v1';
  const sessionKeys = ['spatial-active-project-v1','spatial-active-workspace','spatial-desktop-layout-v3','spatial-desktop-pages-v1','spatial-dock-layout-v2','spatial-downloads-v1','spatial-layout-mode-v1','spatial-note-draft-v1','spatial-open-projects-v1','spatial-project-content-v1','spatial-project-spaces-v2','spatial-project-window-sessions-v1','spatial-split-layouts-v1','spatial-workspace-app-states-v1','spatial-workspace-area-contents-v1','spatial-workspace-area-layouts-v1','spatial-workspace-display-assignments-v1','spatial-workspace-project-states-v1','spatial-workspace-window-layouts-v1','spatial-zone-layout-v1','spatial-independent-sessions-v1','spatial-app-windows-v1','spatial-demo-scenes-v1',profilesKey];
  function createProfile(name, profiles) {
    const label = String(name || '').trim().slice(0,48);
    if (!label) return null;
    const slug = label.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'workspace';
    let id = 'workspace-' + slug, sequence = 2;
    while (Object.hasOwn(profiles,id)) id = 'workspace-' + slug + '-' + sequence++;
    const accent = ['#56baff','#f2b646','#8d85ff','#61d982'][Object.keys(profiles).length % 4];
    return {id,profile:{custom:true,label,subtitle:'Your workspace',icon:'i-grid',accent,home:'/home/demo/Workspaces/'+id,
      context:label+' files and tools',meta:'Separate windows and Home folders',
      folders:['Desktop','Documents','Downloads','Pictures','Videos','Music','Templates','Public','Projects'].map(folder=>[folder,'Workspace folder','folder']).concat([['.spatial-workspace.toml','Editable workspace settings','config']]),
      rack:['dolphin','elisa','browser','terminal','notes'],favorites:[['dolphin','Dolphin'],['browser','Firefox'],['notes','Notes']],agenda:[label,'No upcoming events','Your calendar']}};
  }
  function reset(storage,preset) {
    if (!['clean','demo'].includes(preset)) return false;
    sessionKeys.forEach(key=>storage.removeItem(key));
    storage.setItem(presetKey,preset); storage.setItem('spatial-active-workspace','general');
    return true;
  }
  const api={presetKey,profilesKey,sessionKeys,createProfile,reset};
  if(typeof module !== 'undefined' && module.exports) module.exports=api; else root.SpatialWorkspaceSetup=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
