const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const appInfo = {
  dolphin: { label: 'Dolphin', icon: 'i-folder', tone: 'blue', detail: 'Downloads' },
  elisa: { label: 'Elisa', icon: 'i-music', tone: 'violet', detail: 'running out of time' },
  browser: { label: 'Web', icon: 'i-web', tone: 'cyan', detail: 'Start page' },
  terminal: { label: 'Konsole', icon: 'i-terminal', tone: 'green', detail: 'xef@desktop' },
  notes: { label: 'Notes', icon: 'i-note', tone: 'amber', detail: 'Desktop concept' }
};

const appState = {
  dolphin: 'active',
  elisa: 'minimized',
  browser: 'closed',
  terminal: 'closed',
  notes: 'closed'
};

let activeApp = 'dolphin';
let toastTimer;
let musicPlaying = true;
let musicPosition = 115;
let musicTimer;
let focusSeconds = 25 * 60;
let focusRunning = false;
let focusTimer;

function icon(name) {
  return `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1600);
}

function syncApps() {
  $$('[data-app-frame]').forEach(frame => {
    const name = frame.dataset.appFrame;
    const visible = appState[name] === 'active';
    frame.hidden = !visible;
    frame.classList.toggle('is-active', visible);
  });

  $$('[data-open-app]').forEach(button => {
    const state = appState[button.dataset.openApp];
    button.classList.toggle('is-open', state !== 'closed');
    button.classList.toggle('is-active', state === 'active');
    button.classList.toggle('is-minimized', state === 'minimized');
    button.setAttribute('aria-pressed', String(state === 'active'));
  });

  $('#emptyWorkspace').hidden = Object.values(appState).includes('active');
  renderMiniApps();
}

function activateApp(name) {
  if (!appInfo[name]) return;
  Object.keys(appState).forEach(key => {
    if (appState[key] === 'active') appState[key] = 'minimized';
  });
  appState[name] = 'active';
  activeApp = name;
  syncApps();
}

function minimizeApp(name) {
  appState[name] = 'minimized';
  const next = Object.keys(appState).find(key => appState[key] === 'minimized' && key !== name);
  if (next) {
    appState[next] = 'active';
    activeApp = next;
  } else {
    activeApp = null;
  }
  syncApps();
}

function closeApp(name) {
  appState[name] = 'closed';
  if (activeApp === name) {
    const next = Object.keys(appState).find(key => appState[key] === 'minimized');
    if (next) {
      appState[next] = 'active';
      activeApp = next;
    } else {
      activeApp = null;
    }
  }
  syncApps();
  showToast(`${appInfo[name].label} closed`);
}

function miniMarkup(name) {
  const info = appInfo[name];
  const header = `<header><div><span class="app-badge ${info.tone}">${icon(info.icon)}</span><span><b>${info.label}</b><small>${info.detail}</small></span></div><div class="mini-actions"><button class="surface-key mini-control" data-mini-restore="${name}" aria-label="Restore ${info.label}">${icon('i-max')}</button><button class="surface-key mini-control" data-mini-close="${name}" aria-label="Close ${info.label}">${icon('i-close')}</button></div></header>`;
  if (name === 'elisa') {
    return `<article class="mini-card" data-mini-card="${name}">${header}<div class="mini-music"><div class="mini-art"></div><div class="mini-track"><b>running out of time</b><small>eenspire · 1:55 / 3:38</small></div><div class="mini-transport"><button class="surface-key mini-control" data-music="prev">${icon('i-prev')}</button><button class="surface-key mini-control play-toggle" data-music="play">${icon(musicPlaying ? 'i-pause' : 'i-play')}</button><button class="surface-key mini-control" data-music="next">${icon('i-next')}</button><input class="track-range" type="range" min="0" max="218" value="${musicPosition}" aria-label="Track position"></div></div></article>`;
  }
  if (name === 'dolphin') {
    return `<article class="mini-card" data-mini-card="${name}">${header}<div class="mini-files"><b>Downloads</b><span>6 items</span><small>material-interface</small><span>today</span><small>Retold</small><span>yesterday</span></div><button class="surface-key mini-open" data-mini-restore="${name}">Open Downloads</button></article>`;
  }
  if (name === 'terminal') {
    return `<article class="mini-card" data-mini-card="${name}">${header}<div class="mini-files"><b>Last command</b><span>done</span><small>git status</small><span>clean</span></div><button class="surface-key mini-open" data-mini-restore="${name}">Return to terminal</button></article>`;
  }
  return `<article class="mini-card" data-mini-card="${name}">${header}<div class="mini-files"><b>${info.detail}</b><span>open</span><small>App remains available here</small><span>live</span></div><button class="surface-key mini-open" data-mini-restore="${name}">Restore ${info.label}</button></article>`;
}

function renderMiniApps() {
  const minimized = Object.keys(appState).filter(key => appState[key] === 'minimized');
  $('#miniStack').innerHTML = minimized.length ? minimized.map(miniMarkup).join('') : '<div class="mini-empty">Minimized apps will stay controllable here.</div>';
  $('#miniCount').textContent = `${minimized.length} active`;
  $$('[data-mini-restore]').forEach(button => button.addEventListener('click', () => activateApp(button.dataset.miniRestore)));
  $$('[data-mini-close]').forEach(button => button.addEventListener('click', () => closeApp(button.dataset.miniClose)));
  bindMusicControls();
}

$$('[data-open-app]').forEach(button => button.addEventListener('click', () => activateApp(button.dataset.openApp)));
$$('[data-window-action]').forEach(button => button.addEventListener('click', () => {
  const name = button.closest('[data-app-frame]').dataset.appFrame;
  if (button.dataset.windowAction === 'minimize') minimizeApp(name);
  if (button.dataset.windowAction === 'close') closeApp(name);
}));

$('#appSearch').addEventListener('input', event => {
  const query = event.target.value.toLowerCase();
  $$('[data-open-app]').forEach(button => {
    const visible = appInfo[button.dataset.openApp].label.toLowerCase().includes(query);
    button.hidden = !visible;
  });
});

$('#fullscreenButton').addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showToast('Use F11 to enter fullscreen');
  }
});

document.addEventListener('fullscreenchange', () => {
  $('#fullscreenButton').setAttribute('aria-label', document.fullscreenElement ? 'Leave fullscreen' : 'Enter fullscreen');
});

$$('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
$$('[data-toggle]').forEach(button => button.addEventListener('click', () => {
  button.classList.toggle('is-active');
  button.setAttribute('aria-pressed', String(button.classList.contains('is-active')));
}));

const themes = ['oled', 'graphite', 'light'];
$('#themeToggle').addEventListener('click', () => {
  const next = themes[(themes.indexOf(document.body.dataset.theme) + 1) % themes.length];
  document.body.dataset.theme = next;
  showToast(`${next[0].toUpperCase() + next.slice(1)} surface`);
});

$$('.nav-choice').forEach(button => button.addEventListener('click', () => {
  const nav = button.closest('nav');
  $$('.nav-choice', nav).forEach(other => other.classList.toggle('is-active', other === button));
}));

$$('.folder-tab').forEach(tab => tab.addEventListener('click', event => {
  if (event.target.tagName === 'SPAN') {
    if ($$('.folder-tab').length > 1) tab.remove();
    return;
  }
  $$('.folder-tab').forEach(other => {
    const selected = other === tab;
    other.classList.toggle('is-active', selected);
    other.setAttribute('aria-selected', String(selected));
  });
}));

$$('.content-row').forEach(row => row.addEventListener('click', () => {
  const parent = row.parentElement;
  $$('.content-row', parent).forEach(other => other.classList.toggle('is-selected', other === row));
}));

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function syncMusic() {
  document.body.classList.toggle('music-playing', musicPlaying);
  $$('.play-toggle').forEach(button => {
    button.innerHTML = icon(musicPlaying ? 'i-pause' : 'i-play');
    button.classList.toggle('is-active', musicPlaying);
    button.setAttribute('aria-pressed', String(musicPlaying));
  });
  $$('.track-range').forEach(range => range.value = musicPosition);
  if ($('#elapsedMain')) $('#elapsedMain').textContent = formatTime(musicPosition);
}

function setMusicPlaying(next) {
  musicPlaying = next;
  clearInterval(musicTimer);
  if (musicPlaying) musicTimer = setInterval(() => {
    musicPosition = musicPosition >= 218 ? 0 : musicPosition + 1;
    syncMusic();
  }, 1000);
  syncMusic();
}

function bindMusicControls() {
  $$('[data-music]').forEach(button => {
    if (button.dataset.bound) return;
    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      if (button.dataset.music === 'play') setMusicPlaying(!musicPlaying);
      else showToast(button.dataset.music === 'next' ? 'Next track' : 'Previous track');
    });
  });
  $$('.track-range').forEach(range => {
    if (range.dataset.bound) return;
    range.dataset.bound = 'true';
    range.addEventListener('input', event => {
      musicPosition = Number(event.target.value);
      syncMusic();
    });
  });
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $$('.live-time').forEach(label => label.textContent = time);
  $('#dayLabel').textContent = now.toLocaleDateString([], { weekday: 'long' });
  $('#dateLabel').textContent = now.toLocaleDateString([], { day: 'numeric', month: 'long' });
  $('#monthLabel').textContent = now.toLocaleDateString([], { month: 'long' });
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstMondayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const previousDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstMondayIndex - 1; i >= 0; i--) cells.push({ day: previousDays - i, outside: true });
  for (let day = 1; day <= days; day++) cells.push({ day, today: day === now.getDate() });
  let next = 1;
  while (cells.length < 35) cells.push({ day: next++, outside: true });
  $('#calendarGrid').innerHTML = cells.map(cell => `<button class="${cell.today ? 'is-today' : ''} ${cell.outside ? 'is-outside' : ''}">${cell.day}</button>`).join('');
}

function updateTimer() {
  $('#timerValue').textContent = formatTime(focusSeconds);
  $('#timerProgress').style.width = `${100 - focusSeconds / (25 * 60) * 100}%`;
  $('#timerState').textContent = focusRunning ? 'Running' : focusSeconds === 25 * 60 ? 'Ready' : 'Paused';
  $('#timerToggle').textContent = focusRunning ? 'Pause' : 'Start';
}

$('#timerToggle').addEventListener('click', () => {
  focusRunning = !focusRunning;
  clearInterval(focusTimer);
  if (focusRunning) focusTimer = setInterval(() => {
    focusSeconds = Math.max(0, focusSeconds - 1);
    if (!focusSeconds) {
      focusRunning = false;
      clearInterval(focusTimer);
      showToast('Focus timer finished');
    }
    updateTimer();
  }, 1000);
  updateTimer();
});

$('#timerReset').addEventListener('click', () => {
  clearInterval(focusTimer);
  focusRunning = false;
  focusSeconds = 25 * 60;
  updateTimer();
});

$$('.dismiss-button').forEach(button => button.addEventListener('click', () => {
  button.closest('.notification').remove();
  const count = $$('.notification').length;
  $('#notificationCount').textContent = count;
  if (!count) $('#notificationList').innerHTML = '<div class="notification-empty">You are all caught up.</div>';
}));

$('#terminalInput').addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  const value = event.target.value.trim();
  if (!value) return;
  const line = document.createElement('p');
  line.className = 'terminal-output';
  line.textContent = value === 'help' ? 'Try: clear, date, echo hello' : value === 'date' ? new Date().toString() : `command not found: ${value}`;
  event.target.closest('label').before(line);
  if (value === 'clear') $$('.terminal-screen > p').forEach(item => item.remove());
  event.target.value = '';
});

updateClock();
setInterval(updateClock, 1000);
renderCalendar();
renderMiniApps();
bindMusicControls();
setMusicPlaying(true);
updateTimer();
syncApps();
