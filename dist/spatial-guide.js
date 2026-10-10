/* The Guide teaches the production desktop in an isolated practice session. */
(function (root) {
  'use strict';
  const key = 'spatial-guide-v1', prefix = 'spatial-guide-practice:';
  const lessons = [
    {id:'welcome', title:'Your desktop, one step at a time', text:'Start with an empty desktop, just like your first sign-in. We will reveal one part at a time and let you try it yourself.', task:'Ready to explore?', level:0},
    {id:'system', title:'The System Area', text:'This glass Area holds your clock, notifications, device controls and quick settings. A toggle has a light inside its bottom edge: lit means on.', task:'Switch Focus on, then off again in the System Area.', level:1, goals:['focus-on','focus-off'], target:'[data-area-window="systems"]'},
    {id:'apps', title:'The Apps Area', text:'The Apps Area keeps your visible windows within reach. Its numbered icons follow the windows on your desktop. Later, this Area will also hold parked apps.', task:'Open Notes using the practice launcher in the Apps Area.', level:2, goals:['notes-open'], target:'#guidePracticeLauncher'},
    {id:'tiling', title:'Windows arrange themselves', text:'New windows automatically tile into the available desktop space. Left-drag a title bar to change their arrangement; you do not need to place every window by hand.', task:'Open Dolphin from the practice launcher. Both windows should fit beside each other.', level:2, goals:['two-tiled'], target:'#guidePracticeLauncher'},
    {id:'float', title:'Middle-drag to float', text:'Hold the middle mouse button on a window title bar and drag. The window can float freely and borrow space from Areas. Alt + left-drag does the same thing.', task:'Middle-drag the Notes title bar to make its window float.', level:2, goals:['notes-float'], target:'[data-app-frame="notes"] .app-titlebar'},
    {id:'overview', title:'Find apps in Overview', text:'Overview is now available through the workspace icon in the Apps header, Super, or Ctrl + Space. For now it shows only applications. More parts will appear when you learn about them.', task:'Open Overview, search for “Dolphin”, then open its search result.', level:3, goals:['app-search','search-launch'], target:'#allAppsToggle'},
    {id:'fullscreen', title:'Full screen between Areas', text:'Left-click the maximize button to fill the desktop space between Areas. Your Areas stay accessible. Repeat the click to restore the window.', task:'Maximize Notes between Areas, then restore it.', level:3, goals:['bounded-enter','bounded-exit'], target:'[data-app-frame="notes"] [data-window-action="maximize"]'},
    {id:'true-fullscreen', title:'True full screen', text:'Middle-click the same button, or press Alt + Enter while Notes is focused. The app uses the whole display and Areas yield. This is different from filling the space between Areas. Escape restores the desktop.', task:'Enter true full screen in Notes, then press Escape to return.', level:3, goals:['full-enter','full-exit'], target:'[data-app-frame="notes"] [data-window-action="maximize"]'},
    {id:'park', title:'Park instead of minimize', text:'There is no minimization here. Park puts an app into the Apps Area as a useful live card. Its note, controls and content remain available; the app is still running.', task:'Type a short note in Notes, then use its Park button.', level:4, goals:['note-written','notes-park'], target:'[data-app-frame="notes"]'},
    {id:'unpark', title:'Your parked app stays useful', text:'In an expanded Area, parked apps have live cards. On a rail, their icons sit at the bottom; right-click offers app actions. Unpark brings the full window onto your current desktop.', task:'Find your note in its parked card and click Unpark.', level:4, goals:['notes-unpark'], target:'#miniStack'},
    {id:'desktops', title:'More room, vertically', text:'Each workspace has multiple desktops. Click empty desktop space or any Area to unfocus a window, then scroll to the next desktop. Areas stay in place. Win + scroll also works while a window is focused.', task:'Go to Desktop 2, then return to Desktop 1. The left-side markers show your position.', level:5, goals:['desktop-next','desktop-return'], target:'.desktop-page-rail'},
    {id:'workspaces', title:'Separate parts of your life', text:'Workspaces keep their own windows, Areas, app sessions and media. General, School, Work and Gaming are separate environments. Workspace choices are now visible in Overview.', task:'Open Overview and switch to School. Your General windows stay in General.', level:6, goals:['school-switch'], target:'.workspace-tabs'},
    {id:'folders', title:'Each workspace has its own Home', text:'School has its own Desktop, Documents, Downloads, Pictures, Videos, Music, Templates and Public folders. Downloads go to this workspace. Projects do not replace Home; they can optionally route their own downloads into a project Downloads folder.', task:'In Overview, open School’s Downloads folder. Check its path in Dolphin.', level:7, goals:['school-downloads'], target:'.workspace-home-card'},
    {id:'return', title:'Pick up where you left off', text:'Changing workspaces does not close your work. Return to General and your note and window arrangement will still be there.', task:'Switch back to General using Overview.', level:7, goals:['general-return'], target:'.workspace-tabs'},
    {id:'complete', title:'The desktop is yours', text:'You have tried the System and Apps Areas, tiling, floating, Overview, both full-screen modes, parking, desktops and workspace folders. The rest of Overview and the Project Area are now available.', task:'You can open Spatial Guide anytime from Overview → Applications → Help, or search for “Spatial Guide”.', level:8}
  ];
  function create(saved = {}) {
    let state = {status:'idle', index:0, mode:'repeat', initialized:false, done:[], ...saved};
    state.index = Math.max(0, Math.min(lessons.length - 1, Number(state.index) || 0));
    state.done = Array.isArray(state.done) ? state.done.filter(value => typeof value === 'string') : [];
    return {
      get state() { return state; },
      get lesson() { return lessons[state.index]; },
      active: () => state.status === 'active',
      allows(feature) {
        if (state.status !== 'active') return true;
        const level = lessons[state.index].level;
        return level >= ({systems:1, apps:2, overview:3, parking:4, desktops:5, workspaces:6, folders:7, projects:8}[feature] ?? 8);
      },
      ready() { return (lessons[state.index].goals || []).every(goal => state.done.includes(goal)); },
      mark(goal) {
        if (state.status !== 'active' || !(lessons[state.index].goals || []).includes(goal) || state.done.includes(goal)) return false;
        state.done.push(goal); return true;
      },
      next() { if (!this.ready() || state.index >= lessons.length-1) return false; state.index++; state.done=[]; return true; },
      start(mode = 'repeat') { state = {status:'active', index:0, mode, initialized:false, done:[]}; },
      leave(status = 'skipped') { state.status = status; },
      snapshot: () => JSON.parse(JSON.stringify(state))
    };
  }
  const api = {lessons, create, key, prefix};
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
  api.save = () => { try { real.setItem(key, JSON.stringify(model.snapshot())); } catch {} };
  api.storage = {
    getItem(name) { try { return real.getItem((model.active() ? prefix : '') + name); } catch { return null; } },
    setItem(name, value) { try { real.setItem((model.active() ? prefix : '') + name, value); } catch {} },
    removeItem(name) { try { real.removeItem((model.active() ? prefix : '') + name); } catch {} }
  };
  api.clearPractice = () => {
    try { Object.keys(real).filter(name => name.startsWith(prefix)).forEach(name => real.removeItem(name)); } catch {}
  };
  if (!fresh && !model.active() && root.location && new URLSearchParams(root.location.search).get('guide') === 'start') {
    api.clearPractice(); model.start('repeat');
  }
  api.finish = status => {
    // A first-run learner keeps their work. Repeat lessons never touch their real session.
    if (model.state.mode === 'first') {
      try { Object.keys(real).filter(name => name.startsWith(prefix)).forEach(name => real.setItem(name.slice(prefix.length), real.getItem(name))); } catch {}
    }
    model.leave(status); api.save();
  };
  api.applyGate = () => {
    const element = document.documentElement;
    if (model.active()) element.dataset.guideLevel = lessons[model.state.index].level;
    else delete element.dataset.guideLevel;
  };
  api.save(); api.applyGate(); root.SpatialGuide = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
