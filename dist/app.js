const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const body = document.body;
const toast = $('#toast');
let toastTimer;

function readPreference(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function savePreference(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function setTheme(theme) {
  const allowed = ['light', 'graphite', 'oled'];
  const next = allowed.includes(theme) ? theme : 'oled';
  body.dataset.theme = next;
  $$('[data-theme-button]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.themeButton === next);
  });
  $('meta[name="theme-color"]').content = next === 'light' ? '#e7e3db' : next === 'graphite' ? '#161a1c' : '#000000';
  savePreference('material-lab-theme', next);
}

function setScene(scene) {
  const next = ['desktop', 'phone', 'music'].includes(scene) ? scene : 'desktop';
  body.dataset.scene = next;
  $$('[data-scene-button]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.sceneButton === next);
  });
  savePreference('material-lab-scene', next);
}

setTheme(readPreference('material-lab-theme', body.dataset.theme));
setScene(readPreference('material-lab-scene', body.dataset.scene));

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1500);
}

$$('[data-scene-button]').forEach(button => {
  button.addEventListener('click', () => setScene(button.dataset.sceneButton));
});

$$('[data-theme-button]').forEach(button => {
  button.addEventListener('click', () => setTheme(button.dataset.themeButton));
});

const meter = $('.material-meter');
const stateLabel = $('#stateLabel');
function setMaterialState(state = 'rest', label = 'IDLE') {
  meter.dataset.state = state;
  stateLabel.textContent = label;
}

document.addEventListener('pointerover', event => {
  if (event.target.closest('button, .recess-field, input[type="range"]')) setMaterialState('hover', 'HOVER');
});
document.addEventListener('pointerout', event => {
  if (!event.relatedTarget?.closest?.('button, .recess-field, input[type="range"]')) setMaterialState();
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('button, .recess-field, input[type="range"]')) return;
  setMaterialState('press', body.dataset.scene === 'phone' ? 'TOUCH' : 'PRESS');
});
document.addEventListener('pointerup', () => {
  setMaterialState(document.activeElement?.matches('input') ? 'focus' : 'rest', document.activeElement?.matches('input') ? 'FOCUS' : 'IDLE');
});
document.addEventListener('focusin', event => {
  if (event.target.matches('input')) setMaterialState('focus', 'FOCUS');
});
document.addEventListener('focusout', event => {
  if (event.target.matches('input')) setMaterialState();
});

$$('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));

$$('.folder-tab').forEach(tab => {
  tab.addEventListener('click', event => {
    if (event.target.tagName === 'I') {
      if ($$('.folder-tab').length > 1) {
        const replacement = tab.previousElementSibling || tab.nextElementSibling;
        const wasActive = tab.classList.contains('is-active');
        tab.remove();
        if (wasActive && replacement) {
          replacement.click();
        }
        showToast('Tab closed');
      }
      return;
    }
    $$('.folder-tab').forEach(item => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
    $('.address-field input').value = tab.dataset.tab;
  });
});

$$('[data-place]').forEach(place => {
  place.addEventListener('click', () => {
    $$('[data-place]').forEach(item => item.classList.toggle('is-active', item === place));
    $('.address-field input').value = place.dataset.place;
    showToast('Opened: ' + place.dataset.place);
  });
});

$$('.file-row').forEach(row => {
  row.addEventListener('click', () => {
    $$('.file-row').forEach(item => item.classList.toggle('is-selected', item === row));
  });
  row.addEventListener('dblclick', () => showToast('Opening ' + row.dataset.name));
});

const filter = $('#fileFilter');
function applyDesktopFilter() {
  const query = filter.value.toLocaleLowerCase('en-GB');
  let folders = 0;
  let files = 0;
  $$('.file-row').forEach(row => {
    const visible = row.dataset.name.toLocaleLowerCase('en-GB').includes(query);
    row.hidden = !visible;
    if (visible && row.querySelector('.folder-icon')) folders += 1;
    if (visible && row.querySelector('.doc-icon')) files += 1;
  });
  $('#fileCount').textContent = query ? folders + ' folders, ' + files + ' files found' : '4 folders, 4 files';
}
filter.addEventListener('input', applyDesktopFilter);
$('#focusFilter').addEventListener('click', () => filter.focus());
$('#zoomRange').addEventListener('input', event => {
  const sizes = [
    { row: 34, font: 13 },
    { row: 43, font: 14 },
    { row: 54, font: 15 }
  ];
  const size = sizes[Number(event.target.value)];
  document.documentElement.style.setProperty('--row-height', size.row + 'px');
  document.documentElement.style.setProperty('--font-size', size.font + 'px');
});

const basePhoneItems = [
  ['Event tickets', '4 items'],
  ['Travel Photos', '17 items'],
  ['Tutorials', '2 items'],
  ['Receipts', '1 item'],
  ['Quick Share', '1 item'],
  ['landscape.jpg', '6.8 MB'],
  ['project-brief.pdf', '221.9 kB']
];
let phoneItems = [...basePhoneItems];
let currentPhoneView = 'Files';

function renderPhoneItems(view = currentPhoneView) {
  const query = $('#phoneSearch').value.toLocaleLowerCase('en-GB');
  const items = phoneItems.filter(([name]) => name.toLocaleLowerCase('en-GB').includes(query));
  $('#phoneList').innerHTML = items.length ? items.map(([name, detail], index) =>
    '<button class="phone-item" data-phone-item="' + index + '"><i class="phone-folder"></i><span><b>' +
    name + '</b><small>' + (view === 'Recent' ? 'today, 1:' + String(31 + index).padStart(2, '0') : detail) +
    '</small></span></button>'
  ).join('') : '<p class="phone-empty">No matching items.</p>';
  $$('.phone-item').forEach(item => item.addEventListener('click', () => {
    $$('.phone-item').forEach(other => other.classList.toggle('is-selected', other === item));
    showToast('Selected: ' + $('b', item).textContent);
  }));
}
renderPhoneItems();

const keyboard = $('#keyboard');
const phone = $('.phone');
$$('.key-row[data-keys]').forEach(row => {
  row.innerHTML = [...row.dataset.keys].map(key => '<button data-key="' + key + '">' + key + '</button>').join('');
});

function setKeyboard(open) {
  keyboard.classList.toggle('is-open', open);
  keyboard.setAttribute('aria-hidden', String(!open));
  phone.classList.toggle('keyboard-open', open);
}

$('#phoneSearch').addEventListener('focus', () => setKeyboard(true));
$('#phoneSearch').addEventListener('input', () => renderPhoneItems());
$('#phoneBack').addEventListener('click', () => {
  setKeyboard(false);
  $('#phoneSearch').blur();
});

$$('[data-key]', keyboard).forEach(key => {
  key.addEventListener('click', () => {
    const input = $('#phoneSearch');
    const value = key.dataset.key;
    if (value === 'enter') {
      setKeyboard(false);
      input.blur();
    } else if (value === 'clear') {
      input.value = '';
    } else {
      input.value += value;
    }
    input.dispatchEvent(new Event('input'));
  });
});

$('#addFolder').addEventListener('click', () => {
  phoneItems.unshift(['New folder ' + (phoneItems.length - basePhoneItems.length + 1), 'empty']);
  renderPhoneItems(currentPhoneView);
  showToast('Folder created');
});

$$('[data-phone-view]').forEach(button => {
  button.addEventListener('click', () => {
    $$('[data-phone-view]').forEach(item => item.classList.toggle('is-active', item === button));
    currentPhoneView = button.dataset.phoneView;
    $('#phonePath').textContent = currentPhoneView;
    renderPhoneItems(currentPhoneView);
  });
});
$$('[data-phone-action]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.phoneAction)));

const musicPhone = $('.music-phone');

function attachCapacitiveSurface(surface) {
  if (!surface || surface.dataset.capacitiveSurface === 'true') return;
  surface.dataset.capacitiveSurface = 'true';
  surface.insertAdjacentHTML('beforeend', '<div class="capacitive-field" aria-hidden="true"></div>');
  const field = $('.capacitive-field', surface);
  const contacts = new Map();
  const controlContacts = new Map();

  function contactTargetAt(x, y) {
    const target = document.elementFromPoint(x, y)?.closest('button, input[type="range"], .phone-toolbar label');
    return target && surface.contains(target) ? target : null;
  }

  function addControlContact(control) {
    if (!control) return;
    const count = (controlContacts.get(control) || 0) + 1;
    controlContacts.set(control, count);
    control.classList.add('is-contacted');
  }

  function removeControlContact(control, delay = 0) {
    if (!control) return;
    window.setTimeout(() => {
      const count = Math.max(0, (controlContacts.get(control) || 1) - 1);
      if (count) controlContacts.set(control, count);
      else {
        controlContacts.delete(control);
        control.classList.remove('is-contacted');
      }
    }, delay);
  }

  function updateContact(entry, event) {
    const samples = event.getCoalescedEvents?.() || [event];
    const sample = samples[samples.length - 1] || event;
    const rect = field.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, sample.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, sample.clientY - rect.top));
    const touchWidth = sample.pointerType === 'mouse' ? 19 : Math.max(12, Math.min(58, sample.width || 24));
    const touchHeight = sample.pointerType === 'mouse' ? 15 : Math.max(10, Math.min(52, sample.height || 18));
    entry.element.style.setProperty('--contact-x', x + 'px');
    entry.element.style.setProperty('--contact-y', y + 'px');
    entry.element.style.setProperty('--contact-w', touchWidth + 'px');
    entry.element.style.setProperty('--contact-h', touchHeight + 'px');

    const nextControl = contactTargetAt(sample.clientX, sample.clientY);
    if (nextControl !== entry.control) {
      removeControlContact(entry.control);
      entry.control = nextControl;
      addControlContact(nextControl);
    }
  }

  function finishContact(event, cancelled = false) {
    const entry = contacts.get(event.pointerId);
    if (!entry) return;
    updateContact(entry, event);
    contacts.delete(event.pointerId);
    entry.element.classList.add('is-releasing');
    window.setTimeout(() => entry.element.remove(), 70);
    const visibleFor = performance.now() - entry.startedAt;
    const clickBridge = cancelled ? 0 : Math.max(0, 90 - visibleFor);
    removeControlContact(entry.control, clickBridge);
    if (!contacts.size) setMaterialState();
  }

  surface.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const element = document.createElement('i');
    element.className = 'glass-contact';
    field.append(element);
    const entry = { element, control: null, startedAt: performance.now() };
    contacts.set(event.pointerId, entry);
    updateContact(entry, event);
    setMaterialState('press', 'TOUCH');
  });
  window.addEventListener('pointermove', event => {
    const entry = contacts.get(event.pointerId);
    if (entry) updateContact(entry, event);
  });
  window.addEventListener('pointerup', event => finishContact(event));
  window.addEventListener('pointercancel', event => finishContact(event, true));
}

attachCapacitiveSurface(phone);
attachCapacitiveSurface(musicPhone);

function syncGlassRange(range) {
  const min = Number(range.min || 0);
  const max = Number(range.max || 100);
  const ratio = max === min ? 0 : (Number(range.value) - min) / (max - min);
  range.style.setProperty('--range-fill', Math.max(0, Math.min(1, ratio)) * 100 + '%');
  range.setAttribute('aria-valuenow', range.value);
}

$$('.phone input[type="range"], .music-phone input[type="range"]').forEach(range => {
  syncGlassRange(range);
  range.addEventListener('input', () => syncGlassRange(range));
});
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && keyboard.classList.contains('is-open')) {
    setKeyboard(false);
    $('#phoneSearch').blur();
  }
  if (body.dataset.scene === 'music' && !event.target.matches('input')) {
    if (event.code === 'Space') {
      event.preventDefault();
      setPlaying(!musicPlaying);
    }
    if (event.key === 'ArrowLeft') selectMusicTrack(currentTrackIndex - 1, true);
    if (event.key === 'ArrowRight') selectMusicTrack(currentTrackIndex + 1, true);
  }
});

const musicData = [
  { title: 'Evening Light', artist: 'Northbound', album: 'After Hours', seconds: 138 },
  { title: 'First Light', artist: 'Northbound', album: 'Northbound', seconds: 234 },
  { title: 'Open Road', artist: 'Northbound', album: 'Northbound', seconds: 295 },
  { title: 'City Lights', artist: 'Northbound', album: 'Northbound', seconds: 242 },
  { title: 'Quiet Hours', artist: 'Northbound', album: 'Northbound', seconds: 216 },
  { title: 'Blue Horizon', artist: 'Northbound', album: 'Northbound', seconds: 262 },
  { title: 'Second Wind', artist: 'Northbound', album: 'Northbound', seconds: 200 },
  { title: 'Last Stop', artist: 'Northbound', album: 'Northbound', seconds: 176 },
  { title: 'Gathering', artist: 'Northbound', album: 'Northbound', seconds: 243 },
  { title: 'Daybreak', artist: 'Northbound', album: 'Northbound', seconds: 236 },
  { title: 'Moving On', artist: 'Northbound', album: 'Northbound', seconds: 298 },
  { title: 'Homeward', artist: 'Northbound', album: 'Northbound', seconds: 265 }
];
let currentTrackIndex = 0;
let musicPlaying = false;
let playbackSeconds = 0;
let playbackTimer;

function formatTime(total) {
  const value = Math.max(0, Math.round(total));
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
}

function renderMusicTracks() {
  const query = $('#musicSearch').value.trim().toLocaleLowerCase('en-GB');
  const visible = musicData.map((track, index) => ({ track, index })).filter(({ track }) =>
    (track.title + ' ' + track.artist + ' ' + track.album).toLocaleLowerCase('en-GB').includes(query)
  );
  $('#musicTracks').innerHTML = visible.length ? visible.map(({ track, index }) =>
    '<button class="music-track music-track-grid' + (index === currentTrackIndex ? ' is-active' : '') + '" data-music-index="' + index + '">' +
    '<span>' + String(index + 1).padStart(2, '0') + '</span><span>' + track.title + '</span><span>' + track.artist + '</span><span>' + formatTime(track.seconds) + '</span></button>'
  ).join('') : '<p class="music-empty">No tracks match your search.</p>';
  $$('.music-track').forEach(row => row.addEventListener('click', () => selectMusicTrack(Number(row.dataset.musicIndex), true)));
}

function renderQueues() {
  const queue = musicData.map((track, index) =>
    '<button class="queue-track' + (index === currentTrackIndex ? ' is-active' : '') + '" data-queue-index="' + index + '">' +
    '<i class="drag-dots">⁙</i><span>' + track.title + '</span><small>' + formatTime(track.seconds) + '</small></button>'
  ).join('');
  $('#queueTracks').innerHTML = queue;
  $('#mobileQueue').innerHTML = queue;
  $$('[data-queue-index]').forEach(row => row.addEventListener('click', () => selectMusicTrack(Number(row.dataset.queueIndex), true)));
  $('#queueCount').textContent = (musicData.length - 1) + ' tracks';
}

function syncProgress() {
  const track = musicData[currentTrackIndex];
  $$('.track-progress').forEach(range => {
    range.max = track.seconds;
    range.value = playbackSeconds;
    syncGlassRange(range);
  });
  $$('.elapsed-time').forEach(label => label.textContent = formatTime(playbackSeconds));
  $$('.duration-time').forEach(label => label.textContent = formatTime(track.seconds));
}

function syncPlaybackState() {
  $('.music-window').classList.toggle('is-playing', musicPlaying);
  $('.music-phone').classList.toggle('is-playing', musicPlaying);
  $$('.main-play').forEach(button => {
    button.classList.toggle('is-active', musicPlaying);
    button.setAttribute('aria-pressed', String(musicPlaying));
    $('span', button).textContent = musicPlaying ? '❚❚' : '▶';
    button.setAttribute('aria-label', musicPlaying ? 'Pause' : 'Play');
  });
  $('.mobile-main-play b').textContent = musicPlaying ? 'Pause' : 'Play';
}

function setPlaying(playing) {
  musicPlaying = playing;
  clearInterval(playbackTimer);
  if (musicPlaying) {
    playbackTimer = setInterval(() => {
      playbackSeconds += 1;
      if (playbackSeconds >= musicData[currentTrackIndex].seconds) {
        selectMusicTrack((currentTrackIndex + 1) % musicData.length, true);
      }
      syncProgress();
    }, 1000);
  }
  syncPlaybackState();
}

function selectMusicTrack(index, autoplay = false) {
  currentTrackIndex = (index + musicData.length) % musicData.length;
  playbackSeconds = 0;
  const track = musicData[currentTrackIndex];
  $$('.now-title').forEach(label => label.textContent = track.title);
  $$('.now-artist').forEach(label => label.textContent = label.closest('.display-copy') ? track.artist + ' · ' + track.album : track.artist);
  $('#musicWindowTitle').textContent = track.title + ' — Elisa';
  renderMusicTracks();
  renderQueues();
  syncProgress();
  if (autoplay) setPlaying(true);
}

$('#musicSearch').addEventListener('input', renderMusicTracks);
$$('.main-play').forEach(button => button.addEventListener('click', () => setPlaying(!musicPlaying)));
$('.library-play').addEventListener('click', () => setPlaying(true));
$$('.previous-track').forEach(button => button.addEventListener('click', () => selectMusicTrack(currentTrackIndex - 1, true)));
$$('.next-track').forEach(button => button.addEventListener('click', () => selectMusicTrack(currentTrackIndex + 1, true)));
$$('.track-progress').forEach(range => range.addEventListener('input', event => {
  playbackSeconds = Number(event.target.value);
  syncProgress();
}));
$$('.volume-range').forEach(range => range.addEventListener('input', event => {
  $$('.volume-range').forEach(other => {
    other.value = event.target.value;
    if (other.closest('.phone, .music-phone')) syncGlassRange(other);
  });
  showToast('Volume ' + event.target.value + '%');
}));

for (const selector of ['.shuffle-toggle', '.repeat-toggle']) {
  $$(selector).forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('is-active')));
    button.addEventListener('click', () => {
      const active = !button.classList.contains('is-active');
      $$(selector).forEach(other => {
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });
    });
  });
}
$('.like-button').addEventListener('click', event => {
  event.currentTarget.classList.toggle('is-active');
  event.currentTarget.setAttribute('aria-pressed', String(event.currentTarget.classList.contains('is-active')));
  event.currentTarget.textContent = event.currentTarget.classList.contains('is-active') ? '♥' : '♡';
});
$('.share-button').addEventListener('click', () => showToast('Track link copied'));
$('.queue-toggle').addEventListener('click', () => $('.music-body').classList.toggle('queue-hidden'));
$('.queue-close').addEventListener('click', () => $('.music-body').classList.add('queue-hidden'));
$('.mobile-queue-toggle').addEventListener('click', () => {
  $('#mobileQueueSheet').classList.add('is-open');
  $('#mobileQueueSheet').setAttribute('aria-hidden', 'false');
});
$('.sheet-close').addEventListener('click', () => {
  $('#mobileQueueSheet').classList.remove('is-open');
  $('#mobileQueueSheet').setAttribute('aria-hidden', 'true');
});
$$('.music-sidebar nav button').forEach(button => button.addEventListener('click', () => {
  $$('.music-sidebar nav button').forEach(other => other.classList.toggle('is-active', other === button));
}));

renderMusicTracks();
renderQueues();
selectMusicTrack(0);
