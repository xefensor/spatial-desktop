/* Adapter: tasks observe the same windows and controls used outside lessons. */
(function () {
  'use strict';
  const guide = SpatialGuide, model = guide.model;
  if (guide.displayCompanion) {
    const banner = document.createElement('aside'); banner.className = 'guide-display-banner material-surface-glass';
    banner.setAttribute('aria-label','Second practice display');
    banner.innerHTML = '<span><b>Display 2 · Guide practice</b><small>' + (guide.displayValid ? 'The same workspace. Continue the tasks in the first window.' : 'This practice session has ended. Return to the first window.') + '</small></span><button class="surface-key" data-guide-close-display>Close practice display</button>';
    document.body.append(banner); prepareControlSemantics(banner); $('button',banner).addEventListener('click',()=>globalThis.close());
    guide.open = () => {};
    return;
  }
  if (model.active() && pristineFrames.notes) {
    // New practice Notes windows begin empty, without the public demo note.
    $('.notes-layout textarea',pristineFrames.notes).value = '';
    $('.notes-layout textarea',pristineFrames.notes).textContent = '';
    $('.app-identity small',pristineFrames.notes).textContent = 'New note';
  }
  const window = document.createElement('section');
  window.id = 'spatialGuide'; window.className = 'guide-window material-surface-abs';
  window.setAttribute('role', 'region'); window.setAttribute('aria-label', 'Spatial Guide'); window.hidden = true;
  window.innerHTML = '<header class="guide-titlebar"><span class="guide-identity">' + icon('i-help') + '<b>Spatial Guide</b></span><div class="guide-window-actions"><button class="surface-key guide-key" data-guide-action="compact" aria-label="Compact Guide" aria-pressed="false">' + icon('i-min') + '</button><button class="surface-key guide-key" data-guide-action="close" aria-label="Close Guide">' + icon('i-close') + '</button></div></header><div class="guide-strip"><div><span class="guide-strip-meta"></span><p class="guide-strip-task" aria-live="polite"></p></div><button class="guide-text-action" data-guide-action="compact" aria-label="Expand Guide">Expand</button><button class="guide-text-action guide-strip-recover" data-guide-action="recover" hidden>Help</button><button class="surface-key guide-strip-next" data-guide-action="next" hidden>Continue</button></div><div class="guide-content"></div>';
  document.body.append(window);
  const launcher = document.createElement('div');
  launcher.id = 'guidePracticeLauncher'; launcher.className = 'guide-practice-launcher';
  launcher.innerHTML = '<span>Choose an app to try</span>' + Object.entries(appInfo).filter(([,info])=>!info.base).map(([name,info])=>'<button class="surface-key" data-open-app="' + name + '">' + appArt(name) + '<span>Open ' + escapeHtml(info.label) + '</span></button>').join('');
  $('.area-body', areaFor('apps'))?.prepend(launcher);
  if (!launcher.isConnected) $('.area-window-body', areaFor('apps'))?.prepend(launcher);
  if (!launcher.isConnected) $('#appRack').before(launcher);
  let practiceDisplay = null;
  function closePracticeDisplay() {
    if (model.lesson.id !== 'two-displays' && !practiceDisplay) return;
    postDesktopSyncMessage({type:'guide-display-end'});
    practiceDisplay?.close(); practiceDisplay = null;
  }
  async function openPracticeDisplay() {
    const url = new URL(location.href); url.searchParams.set('guide','display'); url.searchParams.delete('chapter'); url.searchParams.set('practice',model.state.sessionId);
    practiceDisplay = globalThis.open(url.href,'spatial-guide-display-' + model.state.sessionId);
    if (!practiceDisplay) { $('#guideTaskStatus').textContent = 'Allow this demo to open its second practice window, then try again.'; return; }
    await prepareLesson(); queueDesktopStateBroadcast(0); lastSignature = ''; check();
  }
  let highlighted = [], interval = 0, lastSignature = '', pointer = null, currentRecovery = null, lastFullscreen = null;

  async function waitForScene() {
    while (desktopPageAnimating) await new Promise(resolve => setTimeout(resolve,30));
  }
  function ordinaryDesktop() {
    if (activeWorkspace !== 'general') renderWorkspace('general',false);
    if (desktopPages.column(activeWorkspace) !== 'workspace' || desktopPages.current(activeWorkspace) !== 0) changeDesktopPage(0,false,'workspace');
  }
  async function ensurePracticeProject() {
    let name = model.state.practiceProject;
    if (!name || !projectSpaces[name]) {
      createProjectFromEditor('Practice project','');
      await waitForScene(); name = activeProjectName;
      model.state.practiceProject = name;
    } else {
      if (!openProjectNames().includes(name)) { activateProject(name,false); await waitForScene(); }
      changeDesktopPage(0,false,name);
    }
    return name;
  }
  function ensureWorkspaceWindow() {
    ordinaryDesktop();
    const candidates = Object.keys(appState).filter(name=>appState[name] !== 'closed' && desktopPages.columnOf(activeWorkspace,name) === 'workspace');
    let name = candidates.includes(model.state.workspaceWindow) ? model.state.workspaceWindow : candidates[0];
    name ||= appInfo[model.state.preferredApp] ? model.state.preferredApp : 'browser';
    openApp(name);
    if (appState[name] !== 'open' || desktopPages.columnOf(activeWorkspace,name) !== 'workspace') name = Object.keys(appState).find(id=>appState[id] === 'open' && desktopPages.columnOf(activeWorkspace,id) === 'workspace') || name;
    changeDesktopPage(desktopPages.pageOf(activeWorkspace,name),false,'workspace');
    model.state.workspaceWindow = name; model.state.preferredApp = appInfo[name].base || name;
    return name;
  }
  async function prepareLesson() {
    guide.settingUp = true;
    await waitForScene();
    if (tileSession().fullscreen) toggleAppFullscreen(tileSession().fullscreen.name);
    if (tileSession().focus) toggleMaximize(tileSession().focus.name);
    setUniversalSearchOpen(false);
    const needed = guide.prerequisites(model.lesson.id);
    if (needed.window) {
      ordinaryDesktop();
      const parked = needed.parked && Object.keys(appState).find(id=>appState[id] === 'minimized' && desktopPages.columnOf(activeWorkspace,id) === 'workspace');
      if (parked) model.state.parkedWindow = parked;
      else {
        const name = ensureWorkspaceWindow();
        if (needed.parked) { minimizeApp(name); model.state.parkedWindow = name; }
      }
    }
    if (needed.project) {
      await ensurePracticeProject();
      if (needed.projectApp && !Object.keys(appState).some(name=>appState[name] !== 'closed' && desktopPages.columnOf(activeWorkspace,name) === model.state.practiceProject)) openApp(model.state.preferredApp || 'browser');
      if (!needed.inProject) changeDesktopPage(0,false,'workspace');
    }
    if (needed.ownWorkspace) {
      if (!workspaceProfiles[model.state.practiceWorkspace]) model.state.practiceWorkspace = createWorkspaceFromEditor('Practice workspace');
      renderWorkspace(model.state.practiceWorkspace,false);
    }
    if (needed.downloads) { openApp('dolphin'); renderFileLocation('dolphin',workspaceProfiles[model.state.practiceWorkspace].home+'/Downloads'); }
    focusDesktop(false); captureCurrentWorkspaceSession(); saveAppWindows(false); saveIndependentSessions(); saveDesktopPages();
    model.state.initialized = true; guide.save(); guide.settingUp = false;
  }
  async function recover(action) {
    guide.settingUp = true;
    await waitForScene();
    if (action === 'escape' && tileSession().fullscreen) toggleAppFullscreen(tileSession().fullscreen.name);
    if (action === 'workspace') {
      if (['folders','return'].includes(model.lesson.id)) {
        if (!workspaceProfiles[model.state.practiceWorkspace]) model.state.practiceWorkspace = createWorkspaceFromEditor('Practice workspace');
        renderWorkspace(model.state.practiceWorkspace,false);
      } else renderWorkspace('general',false);
    }
    if (action === 'project') { ordinaryDesktop(); await ensurePracticeProject(); }
    if (action === 'window') ensureWorkspaceWindow();
    if (action === 'park-app') { const name = ensureWorkspaceWindow(); minimizeApp(name); model.state.parkedWindow = name; delete model.state.unparkCandidates; }
    if (action === 'fullscreen-retry') {
      const name = model.state.practiceWindow;
      model.state.done = []; delete model.state.practiceWindow;
      if (appInfo[name]) { ordinaryDesktop(); changeDesktopPage(desktopPages.pageOf(activeWorkspace,name),false); openApp(name); }
      else ensureWorkspaceWindow();
    }
    if (action === 'true-fullscreen') {
      const name = tileSession().focus?.name || topOpenApp();
      if (name) toggleAppFullscreen(name);
    }
    guide.save(); guide.settingUp = false; lastSignature = ''; check();
  }

  function resetPractice() {
    guide.settingUp = true;
    setUniversalSearchOpen(false);
    setMusicPlaying(false); setFocusRunning(false); setSystemToggle('Sound', true);
    Object.keys(tileSessions).forEach(key => delete tileSessions[key]);
    desktopPages.load({}); windowGeometry.clear(); autoTiledWindows.clear(); maximizeRestore.clear();
    appWindowStore.load({});
    Object.keys(workspaceProfiles).forEach(name => {
      workspaceAppStates[name] = Object.fromEntries(Object.keys(appInfo).map(id => [id, 'closed']));
      workspaceProjectStates[name] = {project:null, mode:null}; workspaceOpenProjects[name] = [];
      workspaceProjects[name] = null; windowMembership[name] = {};
      delete workspaceContent[name]; delete workspaceAreaContents[name];
      workspaceDisplayAssignments[name] = {apps:Object.fromEntries(Object.keys(appInfo).map(id => [id, 1])), areas:{apps:1, systems:1, projects:1}};
      delete workspaceAreaSessions[name];
    });
    Object.keys(projectSpaces).forEach(id => delete projectSpaces[id]);
    Object.keys(projectWindowSessions).forEach(id => delete projectWindowSessions[id]);
    Object.assign(appState, workspaceAppStates.general);
    activeWorkspace = 'general'; activeProjectName = null; frontApp = null; desktopHasWindowFocus = false;
    dockState.apps = {edge:'left', order:0}; dockState.systems = {edge:'right', order:0}; dockState.projects = {edge:'left', order:1};
    Object.assign(dockSizes, {left:280, right:300, top:250, bottom:250});
    defaultAreaSession = snapshotAreaLayout();
    renderWorkspace('general', false); renderOverviewProjects(); setProjectClosedState(true);
    $('.notes-layout textarea', frameFor('notes')).value = '';
    const note = appWindowModel('notes'); note.notes = [{id:'main', title:'My first note', text:''}]; note.active = 'main'; renderNotes('notes');
    $('#notificationList').innerHTML = ''; syncNotifications();
    focusDesktop(false); syncApps(); layoutDockAreas(false, false);
    saveDesktopPages(); saveTileSessions(); saveAppWindows(false); persistProjectState(); saveIndependentSessions();
    captureCurrentWorkspaceSession(); persistDisplayAssignments();
    model.state.initialized = true; guide.save(); guide.settingUp = false;
  }
  function clearHighlight() {
    highlighted.forEach(element => element.classList.remove('guide-target')); highlighted = [];
  }
  function highlight() {
    clearHighlight();
    if (!model.active() || window.hidden) return;
    if (model.lesson.challenge) return;
    const displayGoal = model.lesson.id === 'two-displays' && model.lesson.goals.find(goal=>!model.state.done.includes(goal));
    const target = model.lesson.id === 'two-displays' ? ({'display-linked':'[data-guide-action="open-display"]','display-app-moved':'[data-app-frame] .app-titlebar','display-area-moved':'[data-area-drag-handle]','display-max-enter':'[data-app-frame] [data-window-action="maximize"]','display-max-exit':'[data-app-frame] [data-window-action="maximize"]','display-full-enter':'[data-app-frame] [data-window-action="maximize"]'})[displayGoal] : model.lesson.target;
    if (target) highlighted = $$(target).filter(element => !element.closest('[hidden],.is-on-other-display') && element.getClientRects().length);
    highlighted.forEach(element => element.classList.add('guide-target'));
  }
  function updateGate() {
    guide.applyGate();
    areaPriority.forEach(name => { areaFor(name).inert = model.active() && !model.allows(name); });
    $('#allAppsToggle').disabled = model.active() && !model.allows('overview');
    $('#universalSearchInput').placeholder = model.active() && !model.allows('all') ? (model.allows('folders') ? 'Search applications, projects and files' : model.allows('projects') ? 'Search applications and projects' : 'Search applications') : 'Search apps, files, settings, actions or the web';
    $('#overviewProjectZoneTitle').textContent = model.active() && !model.allows('folders') ? 'Projects' : 'Projects and Home';
    filterLauncher();
    layoutDockAreas(false, false); refreshIntentAreas(); scheduleWindowTiling();
  }
  function referenceMarkup() {
    return '<div class="guide-heading"><span class="eyebrow">DESKTOP COMPANION</span><h1>Find your way around.</h1><p>Open a topic whenever you need a reminder, or learn by using the actual desktop.</p></div><button class="surface-key guide-primary" data-guide-action="start">Start the hands-on guide</button><label class="guide-search recessed-field">' + icon('i-search') + '<input type="search" aria-label="Search Guide topics" placeholder="Search topics or shortcuts"></label><div class="guide-topic-list">' + guide.lessons.slice(1, -1).map((lesson,index) => '<details data-guide-topic><summary><span>' + escapeHtml(lesson.title) + '</span>' + icon('i-right') + '</summary><p>' + escapeHtml(lesson.text) + '</p><button class="surface-key guide-show" data-guide-show="' + (index + 1) + '">Show on desktop</button><button class="guide-text-action guide-replay" data-guide-chapter="' + lesson.id + '">Practice this chapter</button></details>').join('') + '</div><p class="guide-footnote">You can always find Spatial Guide in Overview → Applications → Help, or search for its name.</p>';
  }
  function setCompact(compact, manual = false) {
    if (manual) guide.setView(compact ? 'compact' : 'expanded');
    window.classList.toggle('is-compact', compact);
    $('.guide-key[data-guide-action="compact"]', window).setAttribute('aria-pressed', String(compact));
    if (!model.active()) { $('.guide-strip-recover',window).hidden = true; $('.guide-strip-meta',window).textContent = 'SPATIAL GUIDE'; $('.guide-strip-task',window).textContent = 'Expand to browse topics or restart the introduction.'; $('.guide-strip-next',window).hidden = true; }
    positionGuide();
  }
  function positionGuide() {
    if (!model.active() || model.state.index === 0 || window.hidden || pointer || window.classList.contains('was-moved')) return;
    const targets = highlighted.filter(element => !window.contains(element)).map(element => element.getBoundingClientRect());
    // Keep the Guide out of a live title bar, menus and modal form controls.
    const front = frontApp && appState[frontApp] === 'open' ? frameFor(frontApp) : null;
    if (front && !front.hidden) targets.push($('.app-titlebar',front).getBoundingClientRect());
    for (const selector of ['#desktopContextMenu:not([hidden])','#projectEditorDialog.is-open #projectEditorBody','#universalSearch.is-open .universal-search-header','#universalSearch.is-open #allAppsGrid','#workspaceCreateForm:not([hidden])']) {
      const element = $(selector); if (element) targets.push(element.getBoundingClientRect());
    }
    const overviewTarget = ({'project-app':'#allAppsGrid [data-open-app]',overview:'[data-search-open-app],[data-search-launch-app="Spatial Guide"]',workspaces:'#newWorkspaceButton',folders:'.workspace-home-card',return:'.workspace-tabs'})[model.lesson.id];
    const nextControl = overviewTarget && $('#universalSearch.is-open ' + overviewTarget);
    if (nextControl) targets.push(nextControl.getBoundingClientRect());
    const rect = window.getBoundingClientRect();
    const point = guide.placeGuide({width:innerWidth,height:innerHeight},{width:rect.width,height:rect.height},targets);
    window.style.left = point.left+'px'; window.style.top = point.top+'px'; window.style.bottom = 'auto';
    if (nextControl && !window.classList.contains('is-compact') && guide.shouldCompact(guide.view,window.getBoundingClientRect(),nextControl.getBoundingClientRect())) setCompact(true);
  }
  function updateChecklist() {
    const goals = model.lesson.goals || [], current = goals.find(goal => !model.state.done.includes(goal));
    $$('[data-guide-goal]', window).forEach(row => {
      const goal = row.dataset.guideGoal, done = model.state.done.includes(goal);
      row.classList.toggle('is-done',done); row.classList.toggle('is-current',goal === current);
      $('.guide-goal-state',row).textContent = done ? '✓' : '○';
      row.setAttribute('aria-label',guide.goalLabels[goal] + (done ? ' — done' : ' — remaining'));
      if (goal === current) row.setAttribute('aria-current','step'); else row.removeAttribute('aria-current');
    });
    $('.guide-strip-meta',window).textContent = (model.state.chapter ? 'PRACTICE' : 'STEP ' + model.state.index) + ' · ' + model.lesson.title;
    $('.guide-strip-task',window).textContent = current ? guide.goalLabels[current] : 'Done — ready to continue.';
    if (model.state.chapter) {
      const progress = $('.guide-progress',window);
      progress.setAttribute('aria-label','Chapter progress'); progress.setAttribute('aria-valuemax','1'); progress.setAttribute('aria-valuenow',model.ready() ? '1' : '0');
      $('i',progress).style.width = model.ready() ? '100%' : '0%';
    }
    const next = $('.guide-strip-next',window); next.textContent = model.state.chapter ? 'Finish chapter' : 'Continue'; next.hidden = !model.ready(); next.disabled = !model.ready();
  }
  function render() {
    const content = $('.guide-content', window);
    if (model.active() && model.state.exitStatus) return renderExitChoices();
    clearHighlight(); lastSignature = '';
    window.classList.remove('is-compact','was-moved');
    $('.guide-key[data-guide-action="compact"]',window).setAttribute('aria-pressed','false'); window.style.left = ''; window.style.top = ''; window.style.bottom = '';
    window.classList.toggle('is-reference', !model.active());
    if (!model.active()) { content.innerHTML = referenceMarkup(); prepareControlSemantics(window); setCompact(guide.view === 'compact'); return; }
    const lesson = model.lesson, index = model.state.index, welcome = index === 0, complete = lesson.id === 'complete';
    const introduction = complete && model.state.skipped?.length ? 'Your introduction is finished. You can revisit any skipped topic or practice an individual chapter in Spatial Guide anytime.' : lesson.text;
    window.classList.toggle('is-lesson', !welcome);
    window.classList.toggle('is-display-lesson', lesson.id === 'two-displays');
    content.innerHTML = '<div class="guide-step-meta"><span>' + (welcome ? 'WELCOME' : complete ? 'READY TO GO' : model.state.chapter ? 'CHAPTER PRACTICE' : 'STEP ' + index + ' OF ' + (guide.lessons.length-2)) + '</span><button class="guide-text-action" data-guide-action="leave">' + (welcome ? 'Skip introduction' : model.state.chapter ? 'Leave chapter' : 'Leave introduction') + '</button></div><div class="guide-progress" role="progressbar" aria-label="Introduction progress" aria-valuemin="0" aria-valuemax="' + (guide.lessons.length-1) + '" aria-valuenow="' + index + '"><i style="width:' + (index/(guide.lessons.length-1)*100) + '%"></i></div><h1 tabindex="-1">' + escapeHtml(lesson.title) + '</h1><p>' + escapeHtml(introduction) + '</p><div class="guide-task"><span class="eyebrow">' + (complete ? 'COME BACK ANYTIME' : welcome ? 'AT YOUR OWN PACE' : 'TRY IT') + '</span><p>' + escapeHtml(lesson.task) + '</p>' + (lesson.id === 'two-displays' ? '<button class="surface-key guide-display-open" data-guide-action="open-display">Open second practice display</button><p class="guide-display-help">Two browser windows simulate two displays. Keep them in the same browser profile. You can skip this chapter with one monitor.</p>' : '') + '<ol class="guide-checklist">' + (lesson.goals || []).map(goal => '<li data-guide-goal="' + goal + '"><span class="guide-goal-state" aria-hidden="true">○</span><span>' + escapeHtml(guide.goalLabels[goal]) + '</span></li>').join('') + '</ol><span id="guideTaskStatus" role="status" aria-live="polite"></span><div class="guide-recovery" hidden><p></p><button class="guide-text-action" data-guide-action="recover"></button></div></div><div class="guide-step-actions"><button class="surface-key guide-primary" data-guide-action="next">' + (welcome ? 'Start exploring' : complete ? 'Continue to desktop' : model.state.chapter ? 'Finish chapter' : 'Continue') + icon('i-right') + '</button>' + (!welcome && !complete && !lesson.challenge ? '<button class="guide-text-action" data-guide-action="show">Show target</button>' : '') + '</div>' + (!welcome && !complete && !model.state.chapter ? '<button class="guide-text-action guide-skip" data-guide-action="skip">' + (lesson.optional ? 'Skip two-display practice' : 'I already know this — skip task') + '</button>' : '') + (welcome ? '<p class="guide-footnote">Skip now or leave at any point. Find us again in Overview → Applications → Help, or search “Spatial Guide”.</p>' : '<p class="guide-footnote">These are real desktop actions. Progress is saved; refreshing resumes this step.' + (model.state.mode === 'repeat' ? ' Your original desktop returns when you leave.' : '') + '</p>');
    prepareControlSemantics(window); highlight();
    if (!welcome) setCompact(guide.view === 'compact');
    if (tileSession().fullscreen && guide.shouldCompact(guide.view,window.getBoundingClientRect(),frameFor(tileSession().fullscreen.name).getBoundingClientRect())) setCompact(true);
    check();
    positionGuide();
  }
  function mark(goal) {
    if (model.mark(goal)) { guide.save(); lastSignature = ''; }
  }
  function check() {
    if (!model.active() || guide.settingUp || model.state.exitStatus) return;
    const id = model.lesson.id, done = model.state.done, session = tileSession();
    const open = Object.keys(appState).filter(name => appState[name] === 'open' && isLocalApp(name));
    const column = desktopPages.column(activeWorkspace);
    const states = Object.fromEntries(Object.entries(appState).filter(([name])=>desktopPages.columnOf(activeWorkspace,name) === column));
    if (guide.observeWindows(model,{open,states,column,page:desktopPages.current(activeWorkspace),
      bases:Object.fromEntries(Object.keys(appInfo).map(name=>[name,appInfo[name].base || name])),
      tiled:open.filter(name=>frameFor(name).classList.contains('is-tiled')),
      floating:open.filter(name=>session.floating?.[name]),interacting:!!manualWindowInteraction})) {guide.save();lastSignature = '';}
    if (id === 'overview' && $('#universalSearch').classList.contains('is-open')) {
      if (guide.observeSearch(model,{query:$('#universalSearchInput').value,results:$$('[data-search-open-app],[data-search-launch-app="Spatial Guide"]').map(button=>(button.dataset.searchOpenApp || button.dataset.searchLaunchApp))})) {guide.save();lastSignature = '';}
    }
    const bounded = session.focus?.name || open.find(name => appMaximizedState[name] && !frameFor(name).classList.contains('is-fullscreen'));
    if (guide.observeFullscreen(model, {bounded, full:session.fullscreen?.name, open})) { guide.save(); lastSignature = ''; }
    if (session.fullscreen?.name !== lastFullscreen) {
      lastFullscreen = session.fullscreen?.name;
      if (session.fullscreen && guide.shouldCompact(guide.view,window.getBoundingClientRect(),frameFor(session.fullscreen.name).getBoundingClientRect())) setCompact(true);
    }
    if (id === 'two-displays') {
      const assignments = displayAssignmentsFor();
      const areas = areaPriority.filter(name=>!areaFor(name).hidden).map(name=>({name,saved:Number(assignments.areas[name] || 1),actual:Number(intentAreaPlan.moves[name] || assignments.areas[name] || 1),hidden:!!intentAreaPlan.hidden[name]}));
      if (guide.observeDisplays(model,{count:activeDisplayRoster().length,slot:localDisplaySlot(),assignments,states:appState,areas,bounded,transferred:(session.fullscreen || session.focus)?.transferred || {},full:session.fullscreen?.name,open})) {guide.save();lastSignature = '';}
      const displayButton = $('[data-guide-action="open-display"]',window);
      if (displayButton) {displayButton.disabled = extendedDesktopActive();displayButton.textContent = extendedDesktopActive() ? 'Second practice display connected' : done.includes('display-linked') ? 'Reconnect second practice display' : 'Open second practice display';}
    }
    if (id === 'resize-areas') {
      const edge = dockState.systems.edge;
      if (!model.state.areaResizeBaseline) { model.state.areaResizeBaseline = {edge, size:dockSizes[edge]}; guide.save(); }
      const baseline = model.state.areaResizeBaseline;
      if (baseline.edge === edge && Math.abs(dockSizes[edge] - baseline.size) >= 24 && !areaFor('systems').classList.contains('is-area-resizing')) mark('area-resized');
    }
    if (id === 'move-areas') {
      const names = areaPriority.filter(name => model.allows(name) && !areaFor(name).hidden);
      if (!model.state.areaMoveBaseline) { model.state.areaMoveBaseline = Object.fromEntries(names.map(name => [name,dockState[name].edge])); guide.save(); }
      if (names.some(name => model.state.areaMoveBaseline[name] && dockState[name].edge !== model.state.areaMoveBaseline[name] && !areaFor(name).classList.contains('is-dock-dragging'))) mark('area-moved');
    }
    if (id === 'area-rail' && !areaFor('apps').classList.contains('is-area-resizing')) {
      if (areaFor('apps').dataset.areaState === 'rail') mark('apps-rail');
      else if (done.includes('apps-rail') && areaFor('apps').dataset.areaState === 'expanded') mark('apps-expanded');
    }
    if (id === 'projects') {
      if (!model.state.projectBaseline) { model.state.projectBaseline = Object.keys(projectSpaces); guide.save(); }
      if (!done.includes('project-created') && projectColumnActive() && !model.state.projectBaseline.includes(activeProjectName)) {
        model.state.practiceProject = activeProjectName; guide.save(); mark('project-created');
      }
    }
    if (['project-app','project-navigation','challenge'].includes(id) && !model.state.practiceProject && activeProjectName) { model.state.practiceProject = activeProjectName; guide.save(); }
    const practiceProject = model.state.practiceProject;
    if (id === 'challenge') {
      if (!model.state.challengeBaseline) { model.state.challengeBaseline = Object.keys(appState).filter(name => appState[name] !== 'closed'); guide.save(); }
      if (model.state.challengeWindow && appState[model.state.challengeWindow] === 'closed' && !done.includes('challenge-park')) {
        delete model.state.challengeWindow; model.state.done.splice(model.state.done.indexOf('challenge-open'),1); guide.save();
      }
      const candidate = open.find(name => desktopPages.columnOf(activeWorkspace,name) === practiceProject && !model.state.challengeBaseline.includes(name));
      if (!model.state.challengeWindow && candidate) { model.state.challengeWindow = candidate; guide.save(); mark('challenge-open'); }
      if (model.state.challengeWindow && appState[model.state.challengeWindow] === 'minimized') mark('challenge-park');
      if (done.includes('challenge-park') && desktopPages.column(activeWorkspace) === 'workspace') mark('challenge-return');
    }
    if (id === 'workspaces') {
      if (!model.state.workspaceBaseline) { model.state.workspaceBaseline = Object.keys(workspaceProfiles); guide.save(); }
      if (!done.includes('workspace-created') && workspaceProfiles[activeWorkspace]?.custom && !model.state.workspaceBaseline.includes(activeWorkspace)) {
        model.state.practiceWorkspace = activeWorkspace; guide.save(); mark('workspace-created');
      }
    }
    if (id === 'folders' && activeWorkspace === model.state.practiceWorkspace && open.some(name => (appInfo[name].base || name) === 'dolphin' && SpatialHomeFolders.standard.some(folder => frameFor(name).dataset.fileLocation === workspaceProfiles[activeWorkspace].home + '/' + folder))) mark('workspace-folder');
    if (id === 'return' && activeWorkspace === 'general') mark('general-return');
    currentRecovery = guide.recovery(model,{workspace:activeWorkspace,column:desktopPages.column(activeWorkspace),projectExists:!!projectSpaces[practiceProject] && openProjectNames().includes(practiceProject),open,bounded,full:session.fullscreen?.name,parked:Object.keys(states).filter(name=>states[name] === 'minimized')});
    const ready = model.ready(), signature = JSON.stringify([model.state.index, done, ready, session.fullscreen?.name, bounded,currentRecovery,id === 'two-displays' && extendedDesktopActive()]);
    if (signature === lastSignature) { positionGuide(); return; }
    lastSignature = signature;
    $$('[data-guide-action="next"]', window).forEach(button => { button.disabled = !ready; });
    updateChecklist();
    const recovery = $('.guide-recovery',window);
    if (recovery) {
      recovery.hidden = !currentRecovery;
      if (currentRecovery) { $('p',recovery).textContent = currentRecovery.text; $('button',recovery).textContent = currentRecovery.label; }
    }
    $('.guide-strip-recover',window).hidden = !currentRecovery;
    if (currentRecovery) $('.guide-strip-task',window).textContent = currentRecovery.text;
    const status = $('#guideTaskStatus');
    if (status) status.textContent = !model.lesson.goals ? '' : ready ? 'Done — continue when you are ready.' : id === 'fullscreen' && session.fullscreen ? 'This is Full fullscreen. Press Escape, then left-click maximize to fill the space between Areas.' : id === 'fullscreen' && done.includes('bounded-enter') ? 'Maximize detected. Left-click the same maximize button again to restore the app.' : id === 'true-fullscreen' && done.includes('full-enter') ? 'Full fullscreen detected. Press Escape to return.' : done.length ? 'Good. Finish the remaining action to continue.' : 'Waiting for you to try it.';
    if (id === 'two-displays' && !ready) {
      const tips = {'display-linked':'Open the second practice display. Both windows share this practice desktop.', 'display-app-moved':'Right-click any app title bar → Move to Display 2.', 'display-app-returned':'In Display 2, right-click that app title bar → Move to Display 1.', 'display-area-moved':'Right-click any Area header → Move to Display 2.', 'display-max-enter':'Open another app here, then left-click Maximize. Watch its peer move to Display 2.', 'display-max-exit':'Left-click Maximize again to restore the app and bring its peers back.', 'display-full-enter':'On this display, middle-click an app’s maximize button. Look for apps and Areas on Display 2.', 'display-full-exit':'Press Escape on the full-screen app to restore it.'};
      const tip = extendedDesktopActive() ? tips[model.lesson.goals.find(goal=>!done.includes(goal))] : 'The second display is disconnected. Reopen it to continue, or skip this optional chapter.';
      if (status) status.textContent = tip; $('.guide-strip-task',window).textContent = tip;
    }
    if (id === 'fullscreen' && session.fullscreen) $('.guide-strip-task',window).textContent = 'Full fullscreen — press Escape, then left-click maximize.';
    highlight(); positionGuide();
  }
  function start(chapter = null) {
    captureCurrentWorkspaceSession(); captureWorkspaceContent();
    guide.clearPractice(); model.start('repeat',chapter); guide.save(); location.reload();
  }
  function renderExitChoices() {
    clearHighlight(); window.classList.remove('is-compact','is-reference','was-moved');
    $('.guide-key[data-guide-action="compact"]',window).setAttribute('aria-pressed','false');
    const keepLabel = model.state.mode === 'first' ? 'Keep what I created' : 'Return to my desktop';
    const keepText = model.state.mode === 'first' ? 'Continue with your own apps, project and workspace.' : 'Restore the desktop you had before this introduction.';
    $('.guide-content',window).innerHTML = '<div class="guide-step-meta"><span>CHOOSE YOUR DESKTOP</span></div><h1 tabindex="-1">How would you like to begin?</h1><p>Choose an empty desktop or explore the populated demo. Spatial Guide is always in Overview → Applications → Help.</p><div class="guide-desktop-choices"><button class="surface-key guide-desktop-choice" data-guide-preset="clean">' + icon('i-monitor') + '<span><b>Clean desktop</b><small>General only, with no open apps or projects. Create your own workspaces.</small></span></button><button class="surface-key guide-desktop-choice" data-guide-preset="demo">' + icon('i-grid') + '<span><b>Explore the demo</b><small>Open apps, projects and desktops in General, School, Work and Gaming.</small></span></button><button class="surface-key guide-desktop-choice" data-guide-preset="keep">' + icon('i-right') + '<span><b>' + keepLabel + '</b><small>' + keepText + '</small></span></button></div><p class="guide-footnote">Clean and demo replace the current desktop session. Your display preferences stay the same.</p><button class="guide-text-action" data-guide-action="exit-back">Back to Guide</button>';
    prepareControlSemantics(window); positionGuide();
    $('.guide-content h1',window)?.focus({preventScroll:true});
  }
  function requestExit(status) {
    if (model.state.chapter) return leave(status);
    closePracticeDisplay(); setUniversalSearchOpen(false);
    if (tileSession().fullscreen) toggleAppFullscreen(tileSession().fullscreen.name);
    closeProjectEditor();
    model.state.exitStatus = status; guide.save(); renderExitChoices();
  }
  function leave(status, choice = 'keep') {
    setUniversalSearchOpen(false);
    captureCurrentWorkspaceSession(); captureWorkspaceContent();
    closePracticeDisplay(); clearInterval(interval); clearHighlight();
    guide.finish(status,choice);
    const url = new URL(location.href); url.searchParams.delete('guide'); url.searchParams.delete('chapter'); history.replaceState(null, '', url);
    location.reload();
  }
  guide.open = () => {
    window.hidden = false; render();
    $('.guide-content h1', window)?.focus({preventScroll:true});
  };
  window.addEventListener('click', async event => {
    if (guide.settingUp) return;
    const action = event.target.closest('[data-guide-action]')?.dataset.guideAction;
    const preset = event.target.closest('[data-guide-preset]')?.dataset.guidePreset;
    if (preset && model.state.exitStatus) return leave(model.state.exitStatus,preset);
    if (action === 'open-display') return openPracticeDisplay();
    if (action === 'exit-back') { delete model.state.exitStatus; guide.save(); return render(); }
    if (action === 'start') start();
    if (action === 'next') {
      if (!model.ready()) return;
      if (model.lesson.id === 'complete' || model.state.chapter) return requestExit('completed');
      if (model.lesson.id === 'two-displays') closePracticeDisplay();
      if (model.next()) { guide.save(); updateGate(); render(); }
    }
    if (action === 'skip' && !model.state.chapter) {
      if (model.lesson.id === 'two-displays') closePracticeDisplay();
      if (model.skip()) { guide.save(); updateGate(); if (model.lesson.id !== 'complete') await prepareLesson(); render(); }
    }
    if (action === 'recover' && currentRecovery) await recover(currentRecovery.action);
    if (action === 'leave') requestExit('skipped');
    if (action === 'close') {
      if (model.active()) setCompact(true,true);
      else { window.hidden = true; clearHighlight(); }
    }
    if (action === 'compact') setCompact(!window.classList.contains('is-compact'),true);
    const chapter = event.target.closest('[data-guide-chapter]')?.dataset.guideChapter;
    if (chapter) start(chapter);
    if (action === 'show') {
      if (['overview','project-app','workspaces','folders','return'].includes(model.lesson.id)) { setUniversalSearchOpen(true); positionGuide(); }
      highlight();
    }
    const show = event.target.closest('[data-guide-show]');
    if (show) {
      const lesson = guide.lessons[Number(show.dataset.guideShow)];
      if (['overview','project-app','workspaces','folders','return'].includes(lesson.id)) setUniversalSearchOpen(true);
      const name = frontApp && appState[frontApp] === 'open' ? frontApp : topOpenApp();
      const frame = name ? frameFor(name) : null;
      const target = lesson.id === 'apps' ? areaFor('apps') : lesson.id === 'tiling' ? $('.workspace-zone') : lesson.id === 'float' ? $('.app-titlebar', frame || $('.workspace-zone')) : ['fullscreen','true-fullscreen'].includes(lesson.id) ? frame?.querySelector('[data-window-action="maximize"]') : lesson.id === 'park' ? frame?.querySelector('[data-window-action="minimize"]') : null;
      clearHighlight(); highlighted = target ? [target] : lesson.target ? $$(lesson.target) : [];
      if (!highlighted.length) { showToast('Open an app to try this window control.'); return; }
      highlighted.forEach(element => element.classList.add('guide-target'));
    }
  });
  window.addEventListener('input', event => {
    if (!event.target.matches('[aria-label="Search Guide topics"]')) return;
    const words = normalizeSearchText(event.target.value).split(' ').filter(Boolean);
    $$('[data-guide-topic]', window).forEach(topic => { topic.hidden = !words.every(word => normalizeSearchText(topic.textContent).includes(word)); });
  });
  document.addEventListener('click', event => {
    if (!model.active() || model.state.exitStatus) return;
    const setting = event.target.closest('[data-area-window="systems"] [data-toggle]');
    if (setting && guide.observeToggle(model,setting.textContent.trim(),setting.getAttribute('aria-pressed') === 'true')) {guide.save();lastSignature = '';}
    check();
  });
  document.addEventListener('pointerdown', event => {
    if (!model.active() || model.state.index === 0 || event.target.closest('#spatialGuide')) return;
    if (event.target.closest('[data-app-frame],[data-area-resize],[data-area-drag-handle],[data-open-app],#allAppsToggle,[data-create-area-project],#createProjectButton,#universalSearch,#projectEditorDialog') && guide.shouldCompact(guide.view,window.getBoundingClientRect(),event.target.getBoundingClientRect())) setCompact(true);
  }, true);
  // Capture the selected search result, then validate after the app's own action.
  document.addEventListener('click', event => {
    const result = event.target.closest('[data-search-open-app],[data-search-launch-app="Spatial Guide"]');
    const search = result && {query:$('#universalSearchInput').value,results:$$('[data-search-open-app],[data-search-launch-app="Spatial Guide"]').map(button=>(button.dataset.searchOpenApp || button.dataset.searchLaunchApp)),launch:result.dataset.searchOpenApp || result.dataset.searchLaunchApp};
    setTimeout(() => {
      if (model.active() && search && guide.observeSearch(model,{...search,opened:Object.keys(appState).filter(name=>appState[name] === 'open' && isLocalApp(name)).map(name=>appInfo[name].base || name).concat(window.hidden ? [] : ['Spatial Guide'])})) {guide.save();lastSignature = '';}
      check();
    },0);
  }, true);
  document.addEventListener('pointerup', check);
  document.addEventListener('keyup', check);
  document.addEventListener('input',()=>setTimeout(check,0));
  globalThis.addEventListener('resize', positionGuide);
  $('.guide-titlebar', window).addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = window.getBoundingClientRect(); pointer = {id:event.pointerId, x:event.clientX, y:event.clientY, left:rect.left, top:rect.top};
    event.currentTarget.setPointerCapture(event.pointerId);
  });
  $('.guide-titlebar', window).addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const rect = window.getBoundingClientRect();
    window.style.left = Math.max(8, Math.min(innerWidth-rect.width-8, pointer.left+event.clientX-pointer.x))+'px';
    window.style.top = Math.max(8, Math.min(innerHeight-rect.height-8, pointer.top+event.clientY-pointer.y))+'px';
    window.classList.add('was-moved');
  });
  $('.guide-titlebar', window).addEventListener('pointerup', () => { pointer = null; });
  $('.guide-titlebar', window).addEventListener('pointercancel', () => { pointer = null; });
  if (model.active()) {
    (async () => {
      if (!model.state.initialized) { resetPractice(); updateGate(); if (model.state.chapter) await prepareLesson(); }
      updateGate(); guide.open(); interval = setInterval(check,180);
    })();
  }
})();
