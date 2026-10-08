const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../dist/desktop-shell.js'), 'utf8');
const helpers = source.slice(source.indexOf('function systemRailExpansionOwns('), source.indexOf('$("#systemRailNotifications").addEventListener'));

for (const edge of ['left', 'right', 'top', 'bottom']) {
  const listeners = {};
  const windowListeners = {};
  const region = { focus() {}, scrollIntoView() {} };
  const trigger = { focus() { ctx.document.activeElement = trigger; }, blur() { ctx.document.activeElement = null; } };
  const widget = { hidden: false, focus() { ctx.document.activeElement = widget; }, scrollIntoView() {}, blur() { ctx.document.activeElement = null; } };
  const area = { hidden: false, dataset: { areaState: 'rail', areaJoinEdge: 'none' }, style: {}, contains: target => [trigger, widget, region].includes(target) };
  const frames = [];
  const ctx = vm.createContext({
    systemRailExpansion: null, activeWorkspace: 'general', dockState: { systems: { edge } },
    dockSizes: { left: 70, right: 70, top: 64, bottom: 64 },
    dockSizeManual: { left: true, right: true, top: true, bottom: true },
    contextMenuState: null, areaFor: () => area, isLocalArea: () => true,
    $: selector => selector === '#desktopContextMenu' ? { hidden: true } : selector === '.system-scroll-region' ? region : widget,
    document: { activeElement: trigger, addEventListener: (type, callback) => { listeners[type] = callback; } },
    window: { addEventListener: (type, callback) => { windowListeners[type] = callback; } },
    requestAnimationFrame: callback => frames.push(callback),
    applyDockRect: (_, rect) => { Object.assign(area.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px', height: rect.height + 'px' }); },
    showArea() { throw Error('A visible rail should not save a new Area layout'); }
  });
  const base = { left: edge === 'right' ? '930px' : '0px', top: edge === 'bottom' ? '736px' : '0px', width: ['left', 'right'].includes(edge) ? '70px' : '1000px', height: ['left', 'right'].includes(edge) ? '800px' : '64px' };
  ctx.layoutDockAreas = () => { Object.assign(area.style, base); area.dataset.areaState = 'rail'; ctx.applySystemRailExpansion(1000, 800); };
  Object.assign(area.style, base);
  vm.runInContext(helpers, ctx);
  ctx.prepareSystemRailExpansion();
  const reveal = () => { ctx.document.activeElement = trigger; ctx.revealSystemRailWidget('#notificationWidget'); };
  const saved = JSON.stringify({ sizes: ctx.dockSizes, manual: ctx.dockSizeManual });
  reveal();
  frames.shift()();
  assert.equal(area.dataset.areaState, 'expanded', edge + ': notification opens full panel');
  assert.equal(ctx.document.activeElement, widget);
  assert.equal(area.style[['left', 'right'].includes(edge) ? 'width' : 'height'], ['left', 'right'].includes(edge) ? '280px' : '250px');
  assert.equal(JSON.stringify({ sizes: ctx.dockSizes, manual: ctx.dockSizeManual }), saved, 'Temporary reveal does not persist expanded dimensions');
  listeners.pointerdown({ target: widget });
  listeners.focusin({ target: widget });
  assert.equal(area.dataset.areaState, 'expanded', 'Moving within panel keeps it open');
  listeners.pointerdown({ target: {} });
  assert.equal(area.dataset.areaState, 'rail', 'Click outside restores rail');
  assert.equal(area.dataset.railExpanded, undefined);
  reveal(); frames.shift()();
  listeners.focusin({ target: {} });
  assert.equal(area.dataset.areaState, 'rail', 'Keyboard focus outside restores rail');
  reveal(); frames.shift()();
  let prevented = false;
  listeners.keydown({ key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(area.dataset.areaState, 'rail');
  assert.equal(ctx.document.activeElement, trigger);
  assert(prevented);
  reveal();
  listeners.pointerdown({ target: {} }); frames.shift()();
  assert.equal(area.dataset.areaState, 'rail', 'An interrupted reveal cannot steal focus back');
  reveal(); frames.shift()();
  windowListeners.blur();
  assert.equal(area.dataset.areaState, 'rail', 'Leaving the browser restores rail');
  area.dataset.areaState = 'expanded';
  reveal(); frames.shift()();
  listeners.pointerdown({ target: {} });
  assert.equal(area.dataset.areaState, 'expanded', 'An intentionally expanded panel stays expanded');
}
console.log('System rail passed: four dock edges, temporary dimensions, internal focus, outside click/keyboard focus, Escape, interrupted reveals, window blur and manual expansion.');
