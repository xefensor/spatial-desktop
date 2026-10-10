/* Adapter: tasks observe the same windows and controls used outside lessons. */
(function () {
  'use strict';
  const guide = SpatialGuide, model = guide.model;
  const window = document.createElement('section');
  window.id = 'spatialGuide'; window.className = 'guide-window material-surface-abs';
  window.setAttribute('role', 'region'); window.setAttribute('aria-label', 'Spatial Guide'); window.hidden = true;
  window.innerHTML = '<header class="guide-titlebar"><span class="guide-identity">' + icon('i-help') + '<b>Spatial Guide</b></span><div class="guide-window-actions"><button class="surface-key guide-key" data-guide-action="compact" aria-label="Compact Guide" aria-pressed="false">' + icon('i-min') + '</button><button class="surface-key guide-key" data-guide-action="close" aria-label="Close Guide">' + icon('i-close') + '</button></div></header><div class="guide-content"></div>';
  document.body.append(window);
  const launcher = document.createElement('div');
  launcher.id = 'guidePracticeLauncher'; launcher.className = 'guide-practice-launcher';
  launcher.innerHTML = '<span>Practice apps</span><button class="surface-key" data-open-app="notes">' + appArt('notes') + '<span>Open Notes</span></button><button class="surface-key" data-open-app="dolphin">' + appArt('dolphin') + '<span>Open Dolphin</span></button>';
  $('.area-body', areaFor('apps'))?.prepend(launcher);
  if (!launcher.isConnected) $('.area-window-body', areaFor('apps'))?.prepend(launcher);
  if (!launcher.isConnected) $('#appRack').before(launcher);
  const returnButton = document.createElement('button');
  returnButton.id = 'guideReturn'; returnButton.className = 'surface-key material-surface-glass'; returnButton.hidden = true;
  returnButton.innerHTML = icon('i-help') + '<span>Spatial Guide</span>'; returnButton.addEventListener('click', () => guide.open());
  document.body.append(returnButton);
  let highlighted = [], interval = 0, lastSignature = '', pointer = null;

  function resetPractice() {
    guide.settingUp = true;
    setUniversalSearchOpen(false);
    setMusicPlaying(false); setFocusRunning(false);
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
    Object.assign(appState, workspaceAppStates.general);
    activeWorkspace = 'general'; activeProjectName = null; frontApp = null; desktopHasWindowFocus = false;
    dockState.apps = {edge:'left', order:0}; dockState.systems = {edge:'right', order:0}; dockState.projects = {edge:'left', order:1};
    Object.assign(dockSizes, {left:280, right:300, top:250, bottom:250});
    defaultAreaSession = snapshotAreaLayout();
    renderWorkspace('general', false);
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
    const target = model.lesson.target;
    if (target) highlighted = $$(target).filter(element => !element.closest('[hidden]'));
    highlighted.forEach(element => element.classList.add('guide-target'));
  }
  function updateGate() {
    guide.applyGate();
    areaPriority.forEach(name => { areaFor(name).inert = model.active() && !model.allows(name); });
    $('#allAppsToggle').disabled = model.active() && !model.allows('overview');
    $('#universalSearchInput').placeholder = model.active() && !model.allows('projects') ? 'Search applications' : 'Search apps, files, settings, actions or the web';
    $('#overviewProjectZoneTitle').textContent = model.active() && !model.allows('projects') ? 'Workspace Home' : 'Projects and Home';
    filterLauncher();
    layoutDockAreas(false, false); refreshIntentAreas(); scheduleWindowTiling();
  }
  function referenceMarkup() {
    return '<div class="guide-heading"><span class="eyebrow">DESKTOP COMPANION</span><h1>Find your way around.</h1><p>Open a topic whenever you need a reminder, or learn by using the actual desktop.</p></div><button class="surface-key guide-primary" data-guide-action="start">Start the hands-on guide</button><label class="guide-search recessed-field">' + icon('i-search') + '<input type="search" aria-label="Search Guide topics" placeholder="Search topics or shortcuts"></label><div class="guide-topic-list">' + guide.lessons.slice(1, -1).map((lesson,index) => '<details data-guide-topic><summary><span>' + escapeHtml(lesson.title) + '</span>' + icon('i-right') + '</summary><p>' + escapeHtml(lesson.text) + '</p><button class="surface-key guide-show" data-guide-show="' + (index + 1) + '">Show on desktop</button></details>').join('') + '</div><p class="guide-footnote">You can always find Spatial Guide in Overview → Applications → Help, or search for its name.</p>';
  }
  function render() {
    const content = $('.guide-content', window);
    clearHighlight(); lastSignature = '';
    if (!model.active()) { content.innerHTML = referenceMarkup(); prepareControlSemantics(window); return; }
    const lesson = model.lesson, index = model.state.index, welcome = index === 0, complete = lesson.id === 'complete';
    window.classList.toggle('is-lesson', !welcome);
    content.innerHTML = '<div class="guide-step-meta"><span>' + (welcome ? 'WELCOME' : complete ? 'READY TO GO' : 'STEP ' + index + ' OF ' + (guide.lessons.length-2)) + '</span><button class="guide-text-action" data-guide-action="leave">' + (welcome ? 'Skip introduction' : 'Leave introduction') + '</button></div><div class="guide-progress" role="progressbar" aria-label="Introduction progress" aria-valuemin="0" aria-valuemax="' + (guide.lessons.length-1) + '" aria-valuenow="' + index + '"><i style="width:' + (index/(guide.lessons.length-1)*100) + '%"></i></div><h1 tabindex="-1">' + escapeHtml(lesson.title) + '</h1><p>' + escapeHtml(lesson.text) + '</p><div class="guide-task"><span class="eyebrow">' + (complete ? 'COME BACK ANYTIME' : welcome ? 'AT YOUR OWN PACE' : 'TRY IT') + '</span><p>' + escapeHtml(lesson.task) + '</p><span id="guideTaskStatus" role="status" aria-live="polite"></span></div><div class="guide-step-actions"><button class="surface-key guide-primary" data-guide-action="next">' + (welcome ? 'Start exploring' : complete ? 'Continue to desktop' : 'Continue') + icon('i-right') + '</button>' + (!welcome && !complete ? '<button class="guide-text-action" data-guide-action="show">Show target</button>' : '') + '</div>' + (welcome ? '<p class="guide-footnote">Skip now or leave at any point. Find us again in Overview → Applications → Help, or search “Spatial Guide”.</p>' : '<p class="guide-footnote">These are real desktop actions. Progress is saved; refreshing resumes this step.' + (model.state.mode === 'repeat' ? ' Your original desktop returns when you leave.' : '') + '</p>');
    prepareControlSemantics(window); highlight(); check();
  }
  function mark(goal) {
    if (model.mark(goal)) { guide.save(); lastSignature = ''; }
  }
  function check() {
    if (!model.active()) return;
    const id = model.lesson.id, done = model.state.done, session = tileSession();
    const isNotesOpen = appState.notes === 'open';
    if (id === 'apps' && isNotesOpen) mark('notes-open');
    if (id === 'tiling' && ['notes','dolphin'].every(name => appState[name] === 'open' && frameFor(name).classList.contains('is-tiled'))) mark('two-tiled');
    if (id === 'float' && session.floating.notes && !manualWindowInteraction) mark('notes-float');
    if (id === 'fullscreen') {
      if (session.focus?.name === 'notes' || (isNotesOpen && appMaximizedState.notes && !session.fullscreen)) mark('bounded-enter');
      else if (done.includes('bounded-enter') && !session.fullscreen) mark('bounded-exit');
    }
    if (id === 'true-fullscreen') {
      if (session.fullscreen?.name === 'notes') mark('full-enter');
      else if (done.includes('full-enter')) mark('full-exit');
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
    const ready = model.ready(), signature = JSON.stringify([model.state.index, done, ready]);
    if (signature === lastSignature) return;
    lastSignature = signature;
    $('[data-guide-action="next"]', window).disabled = !ready;
    const status = $('#guideTaskStatus');
    if (status) status.textContent = !model.lesson.goals ? '' : ready ? 'Done — continue when you are ready.' : done.length ? 'Good. Finish the remaining action to continue.' : 'Waiting for you to try it.';
    highlight();
  }
  function start() {
    captureCurrentWorkspaceSession(); captureWorkspaceContent();
    guide.clearPractice(); model.start('repeat'); guide.save(); location.reload();
  }
  function leave(status) {
    setUniversalSearchOpen(false);
    captureCurrentWorkspaceSession(); captureWorkspaceContent();
    clearInterval(interval); clearHighlight();
    guide.finish(status);
    const url = new URL(location.href); url.searchParams.delete('guide'); history.replaceState(null, '', url);
    location.reload();
  }
  guide.open = () => {
    window.hidden = false; returnButton.hidden = true; render();
    $('.guide-content h1', window)?.focus({preventScroll:true});
  };
  window.addEventListener('click', event => {
    const action = event.target.closest('[data-guide-action]')?.dataset.guideAction;
    if (action === 'start') start();
    if (action === 'next') {
      if (!model.ready()) return;
      if (model.lesson.id === 'complete') return leave('completed');
      if (model.next()) { guide.save(); updateGate(); render(); }
    }
    if (action === 'leave') leave('skipped');
    if (action === 'close') {
      if (model.active()) window.classList.add('is-compact');
      else { window.hidden = true; clearHighlight(); returnButton.hidden = false; }
    }
    if (action === 'compact') {
      window.classList.toggle('is-compact');
      $('[data-guide-action="compact"]').setAttribute('aria-pressed', String(window.classList.contains('is-compact')));
    }
    if (action === 'show') {
      if (['overview','workspaces','folders','return'].includes(model.lesson.id)) setUniversalSearchOpen(true);
      highlight();
    }
    const show = event.target.closest('[data-guide-show]');
    if (show) {
      const lesson = guide.lessons[Number(show.dataset.guideShow)];
      if (['overview','workspaces','folders','return'].includes(lesson.id)) setUniversalSearchOpen(true);
      clearHighlight(); highlighted = $$(lesson.target); highlighted.forEach(element => element.classList.add('guide-target'));
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
    if (model.lesson.id === 'system' && focus?.textContent.trim() === 'Focus') {
      if (focus.getAttribute('aria-pressed') === 'true') mark('focus-on');
      else if (model.state.done.includes('focus-on')) mark('focus-off');
    }
    if (model.lesson.id === 'overview' && event.target.closest('[data-search-open-app="dolphin"]') && model.state.done.includes('app-search') && appState.dolphin === 'open') mark('search-launch');
    check();
  });
  document.addEventListener('input', event => {
    if (model.active() && model.lesson.id === 'overview' && event.target.id === 'universalSearchInput' && normalizeSearchText(event.target.value).includes('dolphin')) mark('app-search');
  });
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
    if (!model.state.initialized) resetPractice();
    updateGate(); guide.open(); interval = setInterval(check, 180);
  }
})();
