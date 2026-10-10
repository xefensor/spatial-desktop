/* Adapter: tasks observe the same windows and controls used outside lessons. */
(function () {
  'use strict';
  const guide = SpatialGuide, model = guide.model;
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
  launcher.innerHTML = '<span>Practice apps</span><button class="surface-key" data-open-app="notes">' + appArt('notes') + '<span>Open Notes</span></button><button class="surface-key" data-open-app="dolphin">' + appArt('dolphin') + '<span>Open Dolphin</span></button>';
  $('.area-body', areaFor('apps'))?.prepend(launcher);
  if (!launcher.isConnected) $('.area-window-body', areaFor('apps'))?.prepend(launcher);
  if (!launcher.isConnected) $('#appRack').before(launcher);
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
  async function prepareLesson() {
    guide.settingUp = true;
    await waitForScene();
    if (tileSession().fullscreen) leaveAppFullscreen();
    if (tileSession().focus) toggleMaximize(tileSession().focus.name);
    setUniversalSearchOpen(false);
    const needed = guide.prerequisites(model.lesson.id);
    if (needed.notes) {
      ordinaryDesktop(); openApp('notes');
      if (needed.noteText && !appWindowModel('notes').notes.some(note => note.text.trim())) {
        const note = appWindowModel('notes'); note.notes[0].text = 'My practice note — this stays in Workspace.'; renderNotes('notes');
      }
      if (needed.dolphin) openApp('dolphin');
      if (needed.parked) minimizeApp('notes');
    }
    if (needed.project) {
      await ensurePracticeProject();
      if (needed.projectApp && !Object.keys(appState).some(name => (appInfo[name].base || name) === 'notes' && appState[name] !== 'closed' && desktopPages.columnOf(activeWorkspace,name) === model.state.practiceProject)) openApp('notes');
      if (!needed.inProject) changeDesktopPage(0,false,'workspace');
    }
    if (needed.school) renderWorkspace('school',false);
    if (needed.downloads) { openApp('dolphin'); renderFileLocation('dolphin',workspaceProfiles.school.home+'/Downloads'); }
    focusDesktop(false); captureCurrentWorkspaceSession(); saveAppWindows(false); saveIndependentSessions(); saveDesktopPages();
    model.state.initialized = true; guide.save(); guide.settingUp = false;
  }
  async function recover(action) {
    guide.settingUp = true;
    await waitForScene();
    if (action === 'escape' && tileSession().fullscreen) toggleAppFullscreen(tileSession().fullscreen.name);
    if (action === 'workspace') renderWorkspace(['folders','return'].includes(model.lesson.id) ? 'school' : 'general',false);
    if (action === 'project') { ordinaryDesktop(); await ensurePracticeProject(); }
    if (action === 'notes' || action === 'open-app' || action === 'fullscreen-retry') {
      const name = action === 'fullscreen-retry' && appInfo[model.state.practiceWindow] ? model.state.practiceWindow : 'notes';
      if (action === 'fullscreen-retry') { model.state.done = []; delete model.state.practiceWindow; }
      ordinaryDesktop();
      const owner = desktopPages.columnOf(activeWorkspace,name);
      if (owner !== 'workspace' && projectSpaces[owner]) { model.state.practiceProject = owner; await ensurePracticeProject(); }
      changeDesktopPage(desktopPages.pageOf(activeWorkspace,name),false);
      openApp(name);
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
    const target = model.lesson.target;
    if (target) highlighted = $$(target).filter(element => !element.closest('[hidden]'));
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
    const targets = highlighted.map(element => element.getBoundingClientRect());
    // Keep the Guide out of a live title bar, menus and modal form controls.
    const front = frontApp && appState[frontApp] === 'open' ? frameFor(frontApp) : null;
    if (front && !front.hidden) targets.push($('.app-titlebar',front).getBoundingClientRect());
    for (const selector of ['#desktopContextMenu:not([hidden])','#projectEditorDialog.is-open #projectEditorBody','#universalSearch.is-open .universal-search-header']) {
      const element = $(selector); if (element) targets.push(element.getBoundingClientRect());
    }
    const rect = window.getBoundingClientRect();
    const point = guide.placeGuide({width:innerWidth,height:innerHeight},{width:rect.width,height:rect.height},targets);
    window.style.left = point.left+'px'; window.style.top = point.top+'px'; window.style.bottom = 'auto';
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
    clearHighlight(); lastSignature = '';
    window.classList.remove('is-compact','was-moved');
    $('.guide-key[data-guide-action="compact"]',window).setAttribute('aria-pressed','false'); window.style.left = ''; window.style.top = ''; window.style.bottom = '';
    window.classList.toggle('is-reference', !model.active());
    if (!model.active()) { content.innerHTML = referenceMarkup(); prepareControlSemantics(window); setCompact(guide.view === 'compact'); return; }
    const lesson = model.lesson, index = model.state.index, welcome = index === 0, complete = lesson.id === 'complete';
    const introduction = complete && model.state.skipped?.length ? 'Your introduction is finished. You can revisit any skipped topic or practice an individual chapter in Spatial Guide anytime.' : lesson.text;
    window.classList.toggle('is-lesson', !welcome);
    content.innerHTML = '<div class="guide-step-meta"><span>' + (welcome ? 'WELCOME' : complete ? 'READY TO GO' : model.state.chapter ? 'CHAPTER PRACTICE' : 'STEP ' + index + ' OF ' + (guide.lessons.length-2)) + '</span><button class="guide-text-action" data-guide-action="leave">' + (welcome ? 'Skip introduction' : model.state.chapter ? 'Leave chapter' : 'Leave introduction') + '</button></div><div class="guide-progress" role="progressbar" aria-label="Introduction progress" aria-valuemin="0" aria-valuemax="' + (guide.lessons.length-1) + '" aria-valuenow="' + index + '"><i style="width:' + (index/(guide.lessons.length-1)*100) + '%"></i></div><h1 tabindex="-1">' + escapeHtml(lesson.title) + '</h1><p>' + escapeHtml(lesson.text) + '</p><div class="guide-task"><span class="eyebrow">' + (complete ? 'COME BACK ANYTIME' : welcome ? 'AT YOUR OWN PACE' : 'TRY IT') + '</span><p>' + escapeHtml(lesson.task) + '</p><ol class="guide-checklist">' + (lesson.goals || []).map(goal => '<li data-guide-goal="' + goal + '"><span class="guide-goal-state" aria-hidden="true">○</span><span>' + escapeHtml(guide.goalLabels[goal]) + '</span></li>').join('') + '</ol><span id="guideTaskStatus" role="status" aria-live="polite"></span><div class="guide-recovery" hidden><p></p><button class="guide-text-action" data-guide-action="recover"></button></div></div><div class="guide-step-actions"><button class="surface-key guide-primary" data-guide-action="next">' + (welcome ? 'Start exploring' : complete ? 'Continue to desktop' : model.state.chapter ? 'Finish chapter' : 'Continue') + icon('i-right') + '</button>' + (!welcome && !complete && !lesson.challenge ? '<button class="guide-text-action" data-guide-action="show">Show target</button>' : '') + '</div>' + (!welcome && !complete && !model.state.chapter ? '<button class="guide-text-action guide-skip" data-guide-action="skip">I already know this — skip task</button>' : '') + (welcome ? '<p class="guide-footnote">Skip now or leave at any point. Find us again in Overview → Applications → Help, or search “Spatial Guide”.</p>' : '<p class="guide-footnote">These are real desktop actions. Progress is saved; refreshing resumes this step.' + (model.state.mode === 'repeat' ? ' Your original desktop returns when you leave.' : '') + '</p>');
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
    if (!model.active() || guide.settingUp) return;
    const id = model.lesson.id, done = model.state.done, session = tileSession();
    const isNotesOpen = appState.notes === 'open';
    if (id === 'apps' && isNotesOpen) mark('notes-open');
    if (id === 'tiling' && ['notes','dolphin'].every(name => appState[name] === 'open' && frameFor(name).classList.contains('is-tiled'))) mark('two-tiled');
    if (id === 'float' && session.floating.notes && !manualWindowInteraction) mark('notes-float');
    const open = Object.keys(appState).filter(name => appState[name] === 'open' && isLocalApp(name));
    const bounded = session.focus?.name || open.find(name => appMaximizedState[name] && !frameFor(name).classList.contains('is-fullscreen'));
    if (guide.observeFullscreen(model, {bounded, full:session.fullscreen?.name, open})) { guide.save(); lastSignature = ''; }
    if (session.fullscreen?.name !== lastFullscreen) {
      lastFullscreen = session.fullscreen?.name;
      if (session.fullscreen && guide.shouldCompact(guide.view,window.getBoundingClientRect(),frameFor(session.fullscreen.name).getBoundingClientRect())) setCompact(true);
    }
    if (id === 'resize-areas') {
      const edge = dockState.systems.edge;
      if (!model.state.areaResizeBaseline) { model.state.areaResizeBaseline = {edge, size:dockSizes[edge]}; guide.save(); }
      const baseline = model.state.areaResizeBaseline;
      if (baseline.edge === edge && Math.abs(dockSizes[edge] - baseline.size) >= 24 && !areaFor('systems').classList.contains('is-area-resizing')) mark('area-resized');
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
    if (id === 'project-app' && desktopPages.column(activeWorkspace) === practiceProject && open.some(name => (appInfo[name].base || name) === 'notes')) mark('project-notes-open');
    if (id === 'project-navigation') {
      const column = desktopPages.column(activeWorkspace);
      if (column === 'workspace') {
        if (done.includes('project-return')) mark('project-workspace-return');
        else if (appState.notes === 'open' && appWindowModel('notes').notes.some(note => note.text.trim())) mark('project-workspace');
      } else if (column === practiceProject && done.includes('project-workspace')) mark('project-return');
    }
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
    if (id === 'park') {
      const notes = appWindowModel('notes');
      if (notes.notes.some(note => note.text.trim())) mark('note-written');
      if (done.includes('note-written') && appState.notes === 'minimized') mark('notes-park');
    }
    if (id === 'unpark' && isNotesOpen) mark('notes-unpark');
    if (id === 'desktops') {
      if (desktopPages.current(activeWorkspace) > 0) mark('desktop-next');
      else if (done.includes('desktop-next')) mark('desktop-return');
    }
    if (id === 'workspaces' && activeWorkspace === 'school') mark('school-switch');
    if (id === 'folders' && activeWorkspace === 'school' && Object.keys(appState).some(name => appState[name] === 'open' && (appInfo[name].base || name) === 'dolphin' && frameFor(name).dataset.fileLocation === workspaceProfiles.school.home + '/Downloads')) mark('school-downloads');
    if (id === 'return' && activeWorkspace === 'general') mark('general-return');
    currentRecovery = guide.recovery(model,{workspace:activeWorkspace,column:desktopPages.column(activeWorkspace),projectExists:!!projectSpaces[practiceProject] && openProjectNames().includes(practiceProject),open,bounded,full:session.fullscreen?.name,notesState:appState.notes,notesVisible:desktopPages.visible(activeWorkspace,'notes')});
    const ready = model.ready(), signature = JSON.stringify([model.state.index, done, ready, session.fullscreen?.name, bounded,currentRecovery]);
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
    if (status) status.textContent = !model.lesson.goals ? '' : ready ? 'Done — continue when you are ready.' : id === 'fullscreen' && session.fullscreen ? 'This is true full screen. Press Escape, then left-click maximize to fill the space between Areas.' : id === 'fullscreen' && done.includes('bounded-enter') ? 'Full screen detected. Left-click the same maximize button again to restore the app.' : id === 'true-fullscreen' && done.includes('full-enter') ? 'True full screen detected. Press Escape to return.' : done.length ? 'Good. Finish the remaining action to continue.' : 'Waiting for you to try it.';
    if (id === 'fullscreen' && session.fullscreen) $('.guide-strip-task',window).textContent = 'True full screen — press Escape, then left-click maximize.';
    highlight(); positionGuide();
  }
  function start(chapter = null) {
    captureCurrentWorkspaceSession(); captureWorkspaceContent();
    guide.clearPractice(); model.start('repeat',chapter); guide.save(); location.reload();
  }
  function leave(status) {
    setUniversalSearchOpen(false);
    captureCurrentWorkspaceSession(); captureWorkspaceContent();
    clearInterval(interval); clearHighlight();
    guide.finish(status);
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
    if (action === 'start') start();
    if (action === 'next') {
      if (!model.ready()) return;
      if (model.lesson.id === 'complete' || model.state.chapter) return leave('completed');
      if (model.next()) { guide.save(); updateGate(); render(); }
    }
    if (action === 'skip' && model.skip()) { guide.save(); updateGate(); await prepareLesson(); render(); }
    if (action === 'recover' && currentRecovery) await recover(currentRecovery.action);
    if (action === 'leave') leave('skipped');
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
    if (!model.active()) return;
    const focus = event.target.closest('[data-toggle]');
    if (model.lesson.id === 'system' && focus?.textContent.trim() === 'Sound') {
      if (focus.getAttribute('aria-pressed') === 'false') mark('sound-off');
      else if (model.state.done.includes('sound-off')) mark('sound-on');
    }
    if (model.lesson.id === 'overview' && event.target.closest('[data-search-open-app="dolphin"]') && model.state.done.includes('app-search') && appState.dolphin === 'open') mark('search-launch');
    check();
  });
  document.addEventListener('pointerdown', event => {
    if (!model.active() || model.state.index === 0 || event.target.closest('#spatialGuide')) return;
    if (event.target.closest('[data-app-frame],[data-area-resize],[data-open-app],#allAppsToggle,[data-create-area-project],#createProjectButton,#universalSearch,#projectEditorDialog') && guide.shouldCompact(guide.view,window.getBoundingClientRect(),event.target.getBoundingClientRect())) setCompact(true);
  }, true);
  // Window controls stop bubbling; inspect them after their own click action.
  document.addEventListener('click', () => setTimeout(check, 0), true);
  document.addEventListener('pointerup', check);
  document.addEventListener('keyup', check);
  document.addEventListener('input', event => {
    if (model.active() && model.lesson.id === 'overview' && event.target.id === 'universalSearchInput' && normalizeSearchText(event.target.value).includes('dolphin')) mark('app-search');
  });
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
