/* The Guide teaches the production desktop in an isolated practice session. */
(function (root) {
  'use strict';
  const key = 'spatial-guide-v1', prefix = 'spatial-guide-practice:';
  const lessons = [
    {id:'welcome', title:'Your desktop, one step at a time', text:'Start with an empty desktop, just like your first sign-in. We will reveal one part at a time and let you try it yourself.', task:'Ready to explore?', level:0},
    {id:'system', title:'The System Area', text:'This glass Area holds your clock, notifications, device controls and quick settings. A toggle has a light inside its bottom edge: lit means on.', task:'Switch Sound off, then on again in the System Area.', level:1, goals:['sound-off','sound-on'], target:'[data-area-window="systems"]'},
    {id:'resize-areas', title:'Give Areas the space you need', text:'Glass Areas have a resize handle on their inner border. Drag it a little toward the desktop to widen the Area, or toward the screen edge to narrow it. This is your choice; the desktop uses the remaining space.', task:'Drag the inner border of the System Area to change its width.', level:1, goals:['area-resized'], target:'[data-area-resize="systems"]'},
    {id:'apps', title:'The Apps Area', text:'The Apps Area keeps your visible windows within reach. Its numbered icons follow the windows on your desktop. Later, this Area will also hold parked apps.', task:'Open Notes using the practice launcher in the Apps Area.', level:2, goals:['notes-open'], target:'#guidePracticeLauncher'},
    {id:'tiling', title:'Windows arrange themselves', text:'New windows automatically tile into the available desktop space. Left-drag a title bar to change their arrangement; you do not need to place every window by hand.', task:'Open Dolphin from the practice launcher. Both windows should share the available space.', level:2, goals:['two-tiled'], target:'#guidePracticeLauncher'},
    {id:'float', title:'Middle-drag to float', text:'Hold the middle mouse button on a window title bar and drag. The window can float freely and borrow space from Areas. Alt + left-drag does the same thing. You can also choose Float window from the title bar’s right-click menu.', task:'Middle-drag the Notes title bar to make its window float.', level:2, goals:['notes-float'], target:'[data-app-frame="notes"] .app-titlebar'},
    {id:'overview', title:'Find apps in Overview', text:'Overview is now available through the workspace icon in the Apps header, Super, or Ctrl + Space. For now it shows only applications. More parts will appear when you learn about them.', task:'Open Overview, search for “Dolphin”, then open its search result.', level:3, goals:['app-search','search-launch'], target:'#allAppsToggle'},
    {id:'fullscreen', title:'Full screen between Areas', text:'Left-click the maximize button to fill the desktop space between Areas. Your Areas stay accessible. Repeat the click to restore the window.', task:'Maximize an app between Areas, then left-click the same button to restore it.', level:3, goals:['bounded-enter','bounded-exit'], target:'[data-app-frame] [data-window-action="maximize"]'},
    {id:'true-fullscreen', title:'True full screen', text:'Middle-click the same maximize button. The app uses the whole display and Areas yield. This is different from filling the space between Areas. Escape restores the desktop.', task:'Enter true full screen in an app, then press Escape to return.', level:3, goals:['full-enter','full-exit'], target:'[data-app-frame] [data-window-action="maximize"]'},
    {id:'park', title:'Park instead of minimize', text:'There is no minimization here. Park puts an app into the Apps Area as a useful live card. Its note, controls and content remain available; the app is still running.', task:'Type a short note in Notes, then use its Park button.', level:4, goals:['note-written','notes-park'], target:'[data-app-frame="notes"]'},
    {id:'area-rail', title:'A rail keeps your apps within reach', text:'Narrow the Apps Area to a rail by dragging its inner border toward the screen edge. Open apps stay at the top and parked apps appear as icons at the bottom. Right-click a parked icon for app actions. Widen the Area again to see its live cards.', task:'Turn the Apps Area into a rail, then expand it again. Your parked note stays available.', level:4, goals:['apps-rail','apps-expanded'], target:'[data-area-resize="apps"]'},
    {id:'unpark', title:'Your parked app stays useful', text:'In an expanded Area, parked apps have live cards. On a rail, their icons sit at the bottom; right-click offers app actions. Unpark brings the full window onto your current desktop.', task:'Find your note in its parked card and click Unpark.', level:4, goals:['notes-unpark'], target:'#miniStack'},
    {id:'desktops', title:'More room, vertically', text:'Each workspace has multiple desktops. Click empty desktop space or any Area to unfocus a window, then scroll to the next desktop. Areas stay in place. Win + scroll also works while a window is focused.', task:'Go to Desktop 2, then return to Desktop 1. The left-side markers show your position.', level:5, goals:['desktop-next','desktop-return'], target:'.desktop-page-rail'},
    {id:'projects', title:'Start your own project', text:'A project has its own vertical set of desktops, containing only its windows. The Project Area keeps its folder, quick note and resources together. Start with an empty project so you can see exactly what belongs to it.', task:'Choose New project in the Project Area, give it a name of your own, then create it. Leave the folder blank to use the workspace’s Projects folder.', level:6, goals:['project-created'], target:'[data-create-area-project]'},
    {id:'project-app', title:'An app belongs where you open it', text:'Your new project starts empty. An app opened here gets its own window in this project. Opening Notes here will not move or replace the note you wrote on your ordinary desktop.', task:'Use Overview to open Notes in your project.', level:6, goals:['project-notes-open'], target:'#allAppsToggle'},
    {id:'project-navigation', title:'Switch projects horizontally', text:'The strip at the top lists Workspace and every open project. Click a name to switch, or unfocus a window and use Shift + scroll. Win + Shift + scroll also works with a focused window. Project switches move the whole scene, including Areas; desktop scrolling moves only the desktop.', task:'Switch to Workspace and find your original note, return to your project, then switch to Workspace again.', level:6, goals:['project-workspace','project-return','project-workspace-return'], target:'.desktop-context-header'},
    {id:'workspaces', title:'Separate parts of your life', text:'Workspaces keep their own windows, Areas, app sessions and media. Create one for a part of your life: study, work, music, or anything you choose. It starts empty while your General windows stay in General.', task:'Open Overview, choose New workspace, give it your own name, then create it.', level:7, goals:['workspace-created'], target:'#newWorkspaceButton'},
    {id:'folders', title:'Each workspace has its own Home', text:'Your new workspace has its own Desktop, Documents, Downloads, Pictures, Videos, Music, Templates and Public folders. Downloads go to this workspace. Projects do not replace Home; they can optionally route their own downloads into a project Downloads folder.', task:'In Overview, open your workspace’s Downloads folder. Check its own Home path in Dolphin.', level:8, goals:['workspace-downloads'], target:'.workspace-home-card'},
    {id:'return', title:'Pick up where you left off', text:'Changing workspaces does not close your work. Return to General and your note and window arrangement will still be there.', task:'Switch back to General using Overview.', level:8, goals:['general-return'], target:'.workspace-tabs'},
    {id:'challenge', title:'Try it on your own', text:'Put what you have learned together. There are no target highlights for this final task. Use whichever controls or shortcuts feel natural.', task:'Open another app in your project, park that window, then return to the ordinary Workspace desktops.', level:8, goals:['challenge-open','challenge-park','challenge-return'], challenge:true},
    {id:'complete', title:'The desktop is yours', text:'You have tried the System and Apps Areas, tiling, floating, Overview, both full-screen modes, parking, resizing Areas, desktops, projects and workspace folders. The rest of Overview is now available.', task:'You can open Spatial Guide anytime from Overview → Applications → Help, or search for “Spatial Guide”.', level:9}
  ];
  function create(saved = {}) {
    let state = {status:'idle', index:0, mode:'repeat', initialized:false, done:[], skipped:[], ...saved};
    const oldIds = ['welcome','system','apps','tiling','float','overview','fullscreen','true-fullscreen','park','unpark','desktops','workspaces','folders','return','complete'];
    const version2Ids = ['welcome','system','apps','tiling','float','overview','fullscreen','true-fullscreen','park','unpark','resize-areas','desktops','projects','project-navigation','workspaces','folders','return','complete'];
    const legacyIds = saved.version === 2 ? version2Ids : oldIds;
    if (saved.lessonId) state.index = lessons.findIndex(lesson => lesson.id === saved.lessonId);
    else if (saved.status && saved.version !== 3 && Number.isInteger(saved.index) && legacyIds[saved.index]) state.index = lessons.findIndex(lesson => lesson.id === legacyIds[saved.index]);
    state.version = 3;
    state.index = Math.max(0, Math.min(lessons.length - 1, Number(state.index) || 0));
    state.done = Array.isArray(state.done) ? state.done.filter(value => (lessons[state.index].goals || []).includes(value)) : [];
    return {
      get state() { return state; },
      get lesson() { return lessons[state.index]; },
      active: () => state.status === 'active',
      allows(feature) {
        if (state.status !== 'active') return true;
        const level = lessons[state.index].level;
        return level >= ({systems:1, apps:2, overview:3, parking:4, desktops:5, projects:6, workspaces:7, folders:8}[feature] ?? 9);
      },
      ready() { return (lessons[state.index].goals || []).every(goal => state.done.includes(goal)); },
      mark(goal) {
        if (state.status !== 'active' || !(lessons[state.index].goals || []).includes(goal) || state.done.includes(goal)) return false;
        state.done.push(goal); return true;
      },
      next() { if (!this.ready() || state.chapter || state.index >= lessons.length-1) return false; return this.advance(); },
      advance() { if (state.index >= lessons.length-1) return false; state.index++; state.done=[]; delete state.practiceWindow; delete state.areaResizeBaseline; delete state.projectBaseline; delete state.workspaceBaseline; delete state.challengeBaseline; delete state.challengeWindow; return true; },
      skip() {
        if (!this.active() || state.chapter || !this.lesson.goals || state.index >= lessons.length-1) return false;
        state.skipped = [...new Set([...(state.skipped || []), this.lesson.id])];
        return this.advance();
      },
      start(mode = 'repeat', chapter = null) {
        const index = lessons.findIndex(lesson => lesson.id === chapter && lesson.goals);
        state = {status:'active', index:index > 0 ? index : 0, mode, initialized:false, done:[], skipped:[], version:3};
        if (index > 0) state.chapter = chapter;
      },
      leave(status = 'skipped') { state.status = status; },
      snapshot: () => JSON.parse(JSON.stringify({...state, lessonId:lessons[state.index].id}))
    };
  }
  // Observe the actual mode and remember which window entered it. A different
  // app or a true fullscreen overlay cannot falsely count as restoring it.
  function observeFullscreen(model, {bounded, full, open}) {
    const trueMode = model.lesson.id === 'true-fullscreen';
    if (!trueMode && model.lesson.id !== 'fullscreen') return false;
    const enter = trueMode ? 'full-enter' : 'bounded-enter', exit = trueMode ? 'full-exit' : 'bounded-exit';
    const current = trueMode ? full : !full && bounded;
    let changed = false;
    if (!model.state.done.includes(enter) && current) {
      model.state.practiceWindow = current;
      changed = model.mark(enter);
    } else if (model.state.done.includes(enter)) {
      const name = model.state.practiceWindow || 'notes'; // legacy in-progress lesson
      if (open.includes(name) && !full && (trueMode || bounded !== name)) changed = model.mark(exit);
    }
    return changed;
  }
  const goalLabels = {
    'sound-off':'Switch Sound off', 'sound-on':'Switch Sound on again',
    'area-resized':'Change the System Area width', 'notes-open':'Open Notes', 'two-tiled':'Open Dolphin beside Notes',
    'notes-float':'Float the Notes window', 'app-search':'Search for Dolphin', 'search-launch':'Open its search result',
    'bounded-enter':'Maximize an app between Areas', 'bounded-exit':'Restore that window',
    'full-enter':'Enter true full screen', 'full-exit':'Press Escape to return',
    'note-written':'Write a short note', 'notes-park':'Park Notes', 'apps-rail':'Narrow Apps to a rail',
    'apps-expanded':'Expand Apps again', 'notes-unpark':'Unpark your note',
    'desktop-next':'Visit Desktop 2', 'desktop-return':'Return to Desktop 1',
    'project-created':'Create your own empty project', 'project-notes-open':'Open Notes inside your project',
    'project-workspace':'Find your original note in Workspace', 'project-return':'Return to your project',
    'project-workspace-return':'Switch back to Workspace', 'workspace-created':'Create your own empty workspace',
    'workspace-downloads':'Open your workspace’s Downloads folder', 'general-return':'Return to General',
    'challenge-open':'Open another app in your project', 'challenge-park':'Park that new window', 'challenge-return':'Return to Workspace'
  };
  // Only prerequisites are supplied. The selected chapter's actions remain undone.
  function prerequisites(id) {
    const index = lessons.findIndex(lesson => lesson.id === id);
    return {
      notes:index >= 4, dolphin:index >= 5 && index <= 8,
      noteText:index >= 10, parked:['area-rail','unpark'].includes(id),
      project:index >= 14, projectApp:index >= 15,
      inProject:['project-app','project-navigation'].includes(id),
      ownWorkspace:['folders','return'].includes(id), downloads:id === 'return'
    };
  }
  function recovery(model, scene) {
    if (!model.active() || model.ready()) return null;
    const id = model.lesson.id, done = model.state.done;
    const hint = (text,action,label) => ({text,action,label});
    if (id === 'fullscreen' && scene.full) return hint('This is true full screen. Press Escape, then left-click maximize for the space between Areas.','escape','Exit true full screen');
    if (['fullscreen','true-fullscreen'].includes(id)) {
      if (model.state.practiceWindow && !scene.open.includes(model.state.practiceWindow)) return hint('The window used for this task was closed or parked. Reopen it and try the full-screen task again.','fullscreen-retry','Reopen and retry');
      if (!scene.open.length) return hint('Open an app before trying its full-screen controls.','open-app','Open Notes');
    }
    const ownWorkspace = ['folders','return'].includes(id);
    if (scene.workspace !== (ownWorkspace ? model.state.practiceWorkspace : 'general') && id !== 'workspaces') return hint('This task belongs in ' + (ownWorkspace ? 'your new workspace' : 'General') + '. Your practice work is still there.','workspace', ownWorkspace ? 'Return to your workspace' : 'Return to General');
    if (['project-app','project-navigation','challenge'].includes(id) && !scene.projectExists) return hint('Your practice project was closed or removed. Reopen it, or prepare a replacement to continue.','project','Restore practice project');
    if (id === 'project-app' && scene.column !== model.state.practiceProject) return hint('Open the app inside your practice project, so it belongs to that project.','project','Go to your project');
    if (['tiling','float','park','unpark','project-navigation'].includes(id) && scene.notesState === 'closed') return hint('Your original Notes window was closed. Reopen it to continue; saved note content stays with the window.','notes','Reopen your note');
    if (['tiling','float','park','unpark'].includes(id) && (!scene.notesVisible || scene.column !== 'workspace')) return hint('Your note is on another desktop. Return to it before continuing this task.','notes','Go to your note');
    if (['tiling','float','park'].includes(id) && scene.notesState === 'minimized') return hint('Your note is parked. Bring it back onto the desktop for this task.','notes','Unpark your note');
    if (id === 'true-fullscreen' && scene.bounded && !done.includes('full-enter')) return hint('This fills the space between Areas. Middle-click maximize for true full screen.','true-fullscreen','Enter true full screen');
    return null;
  }
  function shouldCompact(preference, guideRect, targetRect) {
    if (preference === 'compact') return true;
    return !!(targetRect && guideRect.left < targetRect.right && guideRect.right > targetRect.left && guideRect.top < targetRect.bottom && guideRect.bottom > targetRect.top);
  }
  function placeGuide(viewport, size, targets = []) {
    const margin = 12, width = Math.min(size.width, viewport.width - margin * 2), height = Math.min(size.height, viewport.height - margin * 2);
    const right = Math.max(margin, viewport.width - width - margin), bottom = Math.max(margin, viewport.height - height - margin);
    const candidates = [{left:right,top:bottom},{left:margin,top:bottom},{left:right,top:margin},{left:margin,top:margin}];
    const overlap = rect => targets.reduce((sum,target) => sum + Math.max(0,Math.min(rect.left+width,target.right)-Math.max(rect.left,target.left)) * Math.max(0,Math.min(rect.top+height,target.bottom)-Math.max(rect.top,target.top)),0);
    return candidates.reduce((best,candidate) => overlap(candidate) < overlap(best) ? candidate : best);
  }
  const api = {lessons, create, observeFullscreen, goalLabels, prerequisites, recovery, shouldCompact, placeGuide, key, prefix};
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  let real;
  try { real = root.localStorage; } catch {}
  if (!real) {
    real = {};
    Object.defineProperties(real, {getItem:{value:name=>real[name] ?? null}, setItem:{value:(name,value)=>{real[name]=String(value);}}, removeItem:{value:name=>{delete real[name];}}});
  }
  let saved = {}, fresh = false;
  try {
    saved = JSON.parse(real.getItem(key) || '{}');
    fresh = !saved.status && !real.getItem('spatial-workspace-app-states-v1') && !real.getItem('spatial-active-workspace');
  } catch {}
  const model = create(saved);
  if (fresh) model.start('first');
  api.model = model;
  api.view = 'expanded';
  try { if (real.getItem('spatial-guide-view-v1') === 'compact') api.view = 'compact'; } catch {}
  api.setView = value => { api.view = value === 'compact' ? 'compact' : 'expanded'; try { real.setItem('spatial-guide-view-v1',api.view); } catch {} };
  api.save = () => { try { real.setItem(key, JSON.stringify(model.snapshot())); } catch {} };
  // Keep late layout/autosave callbacks in practice storage while leaving.
  // The normal desktop gets its own facade after the page reloads.
  let practiceSession = model.active();
  const storageKey = name => { if (model.active()) practiceSession = true; return (practiceSession ? prefix : '') + name; };
  api.storage = {
    getItem(name) { try { return real.getItem(storageKey(name)); } catch { return null; } },
    setItem(name, value) { try { real.setItem(storageKey(name), value); } catch {} },
    removeItem(name) { try { real.removeItem(storageKey(name)); } catch {} }
  };
  api.clearPractice = () => {
    try { Object.keys(real).filter(name => name.startsWith(prefix)).forEach(name => real.removeItem(name)); } catch {}
  };
  if (!fresh && !model.active() && root.location) {
    const params = new URLSearchParams(root.location.search);
    if (params.get('guide') === 'start' || params.get('guide') === 'chapter') {
      api.clearPractice(); model.start('repeat',params.get('guide') === 'chapter' ? params.get('chapter') : null);
    }
  }
  api.finish = (status, choice = "keep") => {
    // A first-run learner keeps their work. Repeat lessons never touch their real session.
    if (['clean','demo'].includes(choice)) root.SpatialWorkspaceSetup.reset(real,choice);
    else if (model.state.mode === 'first') {
      try { Object.keys(real).filter(name => name.startsWith(prefix)).forEach(name => real.setItem(name.slice(prefix.length), real.getItem(name))); } catch {}
    }
    if (choice === 'keep' && model.state.mode === 'first') real.setItem('spatial-desktop-preset-v1','clean');
    delete model.state.exitStatus; model.leave(status); api.save();
  };
  api.applyGate = () => {
    const element = document.documentElement;
    if (model.active()) element.dataset.guideLevel = lessons[model.state.index].level;
    else delete element.dataset.guideLevel;
  };
  api.save(); api.applyGate(); root.SpatialGuide = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
