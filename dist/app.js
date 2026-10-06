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
  const next = scene === 'phone' ? 'phone' : 'desktop';
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

function localLight(event) {
  const rect = phone.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  const light = $('#screenLight');
  light.style.left = (point.clientX - rect.left) + 'px';
  light.style.top = (point.clientY - rect.top) + 'px';
  light.classList.add('is-on');
}
phone.addEventListener('pointerdown', localLight);
phone.addEventListener('pointermove', event => {
  if (event.buttons) localLight(event);
});
window.addEventListener('pointerup', () => $('#screenLight').classList.remove('is-on'));
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && keyboard.classList.contains('is-open')) {
    setKeyboard(false);
    $('#phoneSearch').blur();
  }
});
