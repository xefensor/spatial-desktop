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
function setMaterialState(state = 'rest', label = 'KLID') {
  meter.dataset.state = state;
  stateLabel.textContent = label;
}

document.addEventListener('pointerover', event => {
  if (event.target.closest('button, .recess-field, input[type="range"]')) setMaterialState('hover', 'NAD POVRCHEM');
});
document.addEventListener('pointerout', event => {
  if (!event.relatedTarget?.closest?.('button, .recess-field, input[type="range"]')) setMaterialState();
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('button, .recess-field, input[type="range"]')) return;
  setMaterialState('press', body.dataset.scene === 'phone' ? 'DOTYK' : 'STISK');
});
document.addEventListener('pointerup', () => {
  setMaterialState(document.activeElement?.matches('input') ? 'focus' : 'rest', document.activeElement?.matches('input') ? 'FOKUS' : 'KLID');
});
document.addEventListener('focusin', event => {
  if (event.target.matches('input')) setMaterialState('focus', 'FOKUS');
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
        showToast('Záložka zavřena');
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
    showToast('Otevřeno: ' + place.dataset.place);
  });
});

$$('.file-row').forEach(row => {
  row.addEventListener('click', () => {
    $$('.file-row').forEach(item => item.classList.toggle('is-selected', item === row));
  });
  row.addEventListener('dblclick', () => showToast('Otevírám ' + row.dataset.name));
});

const filter = $('#fileFilter');
function applyDesktopFilter() {
  const query = filter.value.toLocaleLowerCase('cs');
  let folders = 0;
  let files = 0;
  $$('.file-row').forEach(row => {
    const visible = row.dataset.name.toLocaleLowerCase('cs').includes(query);
    row.hidden = !visible;
    if (visible && row.querySelector('.folder-icon')) folders += 1;
    if (visible && row.querySelector('.doc-icon')) files += 1;
  });
  $('#fileCount').textContent = query ? folders + ' složky, ' + files + ' soubory nalezeny' : '4 složky, 4 soubory';
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
  ['Signal space vstupenky', '4 položky'],
  ['Lured In', '17 položek'],
  ['YTDLnis', '2 položky'],
  ['log', '1 položka'],
  ['Quick Share', '1 položka'],
  ['plastic-plasma-oled-4k', '6,8 MB'],
  ['cs_CZ-refined-fonts', '221,9 kB']
];
let phoneItems = [...basePhoneItems];
let currentPhoneView = 'Soubory';

function renderPhoneItems(view = currentPhoneView) {
  const query = $('#phoneSearch').value.toLocaleLowerCase('cs');
  const items = phoneItems.filter(([name]) => name.toLocaleLowerCase('cs').includes(query));
  $('#phoneList').innerHTML = items.length ? items.map(([name, detail], index) =>
    '<button class="phone-item" data-phone-item="' + index + '"><i class="phone-folder"></i><span><b>' +
    name + '</b><small>' + (view === 'Nedávné' ? 'dnes, 1:' + String(31 + index).padStart(2, '0') : detail) +
    '</small></span></button>'
  ).join('') : '<p class="phone-empty">Nic takového tu není.</p>';
  $$('.phone-item').forEach(item => item.addEventListener('click', () => showToast('Vybráno: ' + $('b', item).textContent)));
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
  phoneItems.unshift(['Nová složka ' + (phoneItems.length - basePhoneItems.length + 1), 'prázdná']);
  renderPhoneItems(currentPhoneView);
  showToast('Složka vytvořena');
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
const musicTouchLight = $('.music-touch-light');

function attachCapacitiveSurface(surface, light) {
  surface.insertAdjacentHTML('beforeend',
    '<div class="capacitive-field" aria-hidden="true">' +
      '<div class="field-cross"></div>' +
    '</div>'
  );
  const field = $('.capacitive-field', surface);
  let releaseTimer;

  function sense(event) {
    const rect = surface.getBoundingClientRect();
    const x = Math.max(8, Math.min(rect.width - 8, event.clientX - rect.left));
    const y = Math.max(8, Math.min(rect.height - 8, event.clientY - rect.top));
    surface.style.setProperty('--touch-x', x + 'px');
    surface.style.setProperty('--touch-y', y + 'px');
    field.classList.add('is-sensing');
    light.style.left = x + 'px';
    light.style.top = y + 'px';
    light.classList.add('is-on');
    setMaterialState('press', 'DOTYK');
    clearTimeout(releaseTimer);
  }

  function release() {
    releaseTimer = setTimeout(() => {
      field.classList.remove('is-sensing');
      light.classList.remove('is-on');
      setMaterialState();
    }, 260);
  }

  surface.addEventListener('pointerdown', sense);
  surface.addEventListener('pointermove', event => {
    if (event.buttons || event.pointerType === 'touch') sense(event);
  });
  surface.addEventListener('pointerup', release);
  surface.addEventListener('pointercancel', release);
  surface.addEventListener('pointerleave', event => {
    if (event.buttons) release();
  });
}

attachCapacitiveSurface(phone, $('#screenLight'));
attachCapacitiveSurface(musicPhone, musicTouchLight);
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
  { title: 'running out of time', artist: 'eenspire', album: 'Mix z roku Escape', seconds: 138 },
  { title: 'Genesis', artist: 'Justice', album: 'Justice', seconds: 234 },
  { title: 'Let There Be Light', artist: 'Justice', album: 'Justice', seconds: 295 },
  { title: 'D.A.N.C.E.', artist: 'Justice', album: 'Justice', seconds: 242 },
  { title: 'Newjack', artist: 'Justice', album: 'Justice', seconds: 216 },
  { title: 'Phantom', artist: 'Justice', album: 'Justice', seconds: 262 },
  { title: 'Phantom Pt. II', artist: 'Justice', album: 'Justice', seconds: 200 },
  { title: 'Valentine', artist: 'Justice', album: 'Justice', seconds: 176 },
  { title: 'The Party', artist: 'Justice', album: 'Justice', seconds: 243 },
  { title: 'DVNO', artist: 'Justice', album: 'Justice', seconds: 236 },
  { title: 'Stress', artist: 'Justice', album: 'Justice', seconds: 298 },
  { title: 'Waters of Nazareth', artist: 'Justice', album: 'Justice', seconds: 265 }
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
  const query = $('#musicSearch').value.trim().toLocaleLowerCase('cs');
  const visible = musicData.map((track, index) => ({ track, index })).filter(({ track }) =>
    (track.title + ' ' + track.artist + ' ' + track.album).toLocaleLowerCase('cs').includes(query)
  );
  $('#musicTracks').innerHTML = visible.length ? visible.map(({ track, index }) =>
    '<button class="music-track music-track-grid' + (index === currentTrackIndex ? ' is-active' : '') + '" data-music-index="' + index + '">' +
    '<span>' + String(index + 1).padStart(2, '0') + '</span><span>' + track.title + '</span><span>' + track.artist + '</span><span>' + formatTime(track.seconds) + '</span></button>'
  ).join('') : '<p class="music-empty">Žádná skladba neodpovídá hledání.</p>';
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
  $('#queueCount').textContent = (musicData.length - 1) + ' skladeb';
}

function syncProgress() {
  const track = musicData[currentTrackIndex];
  $$('.track-progress').forEach(range => {
    range.max = track.seconds;
    range.value = playbackSeconds;
  });
  $$('.elapsed-time').forEach(label => label.textContent = formatTime(playbackSeconds));
  $$('.duration-time').forEach(label => label.textContent = formatTime(track.seconds));
}

function syncPlaybackState() {
  $('.music-window').classList.toggle('is-playing', musicPlaying);
  $('.music-phone').classList.toggle('is-playing', musicPlaying);
  $$('.main-play').forEach(button => {
    $('span', button).textContent = musicPlaying ? '❚❚' : '▶';
    button.setAttribute('aria-label', musicPlaying ? 'Pozastavit' : 'Přehrát');
  });
  $('.mobile-main-play b').textContent = musicPlaying ? 'Pauza' : 'Přehrát';
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
$$('.previous-track').forEach(button => button.addEventListener('click', () => selectMusicTrack(currentTrackIndex - 1, true)));
$$('.next-track').forEach(button => button.addEventListener('click', () => selectMusicTrack(currentTrackIndex + 1, true)));
$$('.track-progress').forEach(range => range.addEventListener('input', event => {
  playbackSeconds = Number(event.target.value);
  syncProgress();
}));
$$('.volume-range').forEach(range => range.addEventListener('input', event => {
  $$('.volume-range').forEach(other => other.value = event.target.value);
  showToast('Hlasitost ' + event.target.value + ' %');
}));

for (const selector of ['.shuffle-toggle', '.repeat-toggle']) {
  $$(selector).forEach(button => button.addEventListener('click', () => {
    $$(selector).forEach(other => other.classList.toggle('is-active'));
  }));
}
$('.like-button').addEventListener('click', event => {
  event.currentTarget.classList.toggle('is-active');
  event.currentTarget.textContent = event.currentTarget.classList.contains('is-active') ? '♥' : '♡';
});
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
