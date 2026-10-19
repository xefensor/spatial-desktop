'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

// Exercise the live shell positioner without starting unrelated desktop models.
const shell = fs.readFileSync(path.join(__dirname, '../dist/desktop-shell.js'), 'utf8');
const start = shell.indexOf('function positionNotificationPeek() {');
const source = shell.slice(start, shell.indexOf('\nfunction hideNotificationPeek()', start));
assert(start >= 0 && source.includes('function positionNotificationPeek()'));
const dom = new JSDOM('<!doctype html><body><div hidden data-widget-source="system"></div><button id="notificationPeek" class="is-visible"></button></body>');
const w = dom.window, d = w.document, peek = d.querySelector('#notificationPeek');
const position = new Function('document', 'window', '$', source + '\nreturn positionNotificationPeek;')(d, w, selector => d.querySelector(selector));
w.innerWidth = 1280; w.innerHeight = 800;
let renderedHeight = 58;
Object.defineProperty(peek, 'offsetHeight', {get: () => renderedHeight});
const bounds = (left, top, width, height) => ({left, top, width, height, right: left + width, bottom: top + height});
function widget(id, edge, box) {
  const panel = d.createElement('section'); panel.className = 'desktop-panel'; panel.dataset.edge = edge; panel.dataset.mode = 'compact';
  const frame = d.createElement('section'); frame.className = 'desktop-widget'; frame.dataset.widgetId = id; frame.dataset.widgetMode = 'compact';
  frame.getBoundingClientRect = () => box;
  panel.append(frame); d.body.append(panel); return {panel, frame};
}
const normal = widget('notifications', 'left', bounds(12, 540, 44, 44));
const shared = widget('workspace-alerts', 'right', bounds(1224, 100, 44, 44));
const px = key => parseFloat(peek.style[key]);
function bounded() {
  const height = Math.min(renderedHeight, px('maxHeight'));
  assert(px('left') >= 0 && px('top') >= 0, 'The peek stays inside the top and left viewport edges');
  assert(px('left') + px('width') <= w.innerWidth, 'The peek fits the viewport width');
  assert(px('top') + height <= w.innerHeight, 'The peek fits the viewport height');
}
for (const mode of ['compact', 'expanded']) for (const edge of ['left', 'right', 'top', 'bottom']) {
  normal.panel.dataset.mode = mode; normal.frame.dataset.widgetMode = mode; normal.panel.dataset.edge = edge;
  peek.dataset.notificationScope = 'workspace'; position(); bounded();
  assert.equal(peek.dataset.edge, edge, 'Notification previews follow the real ' + mode + ' widget when its panel moves');
  if (edge === 'left') assert.equal(px('left'), 64);
  if (edge === 'bottom') assert.equal(px('top'), 474);
}
peek.dataset.notificationScope = 'system'; position(); bounded();
assert.equal(peek.dataset.edge, 'right', 'Shared alerts anchor on their own widget rather than Notifications');
assert.equal(px('left'), 924);
assert.equal(px('top'), 93);

normal.panel.dataset.edge = 'top';
const popup = d.createElement('section'); popup.className = 'panel-applet-popup'; popup.dataset.widgetId = 'notifications';
popup.getBoundingClientRect = () => bounds(400, 200, 380, 300); d.body.append(popup);
peek.dataset.notificationScope = 'workspace'; position(); bounded();
assert.equal(px('left'), 444); assert.equal(px('top'), 508, 'An open live popup is the visible anchor');
popup.remove();

function fallback() {
  position(); bounded(); assert.equal(peek.dataset.edge, 'right');
  assert.equal(px('left'), 976); assert.equal(px('top'), 730, 'Unavailable widgets use a local display corner');
}
normal.panel.hidden = true; fallback(); normal.panel.hidden = false;
normal.panel.classList.add('is-on-other-display'); fallback(); normal.panel.classList.remove('is-on-other-display');
normal.frame.style.display = 'none'; fallback(); normal.frame.style.display = '';
normal.frame.style.visibility = 'hidden'; fallback(); normal.frame.style.visibility = '';
normal.frame.getBoundingClientRect = () => bounds(0, 0, 0, 0); fallback();
normal.frame.getBoundingClientRect = () => bounds(12, 540, 44, 44);

for (const [width, height] of [[320, 200], [180, 110], [80, 40]]) {
  w.innerWidth = width; w.innerHeight = height;
  for (const scope of ['workspace', 'system']) {peek.dataset.notificationScope = scope; position(); bounded();}
}
renderedHeight = 180; w.innerWidth = 360; w.innerHeight = 180; position(); bounded();
assert.equal(px('maxHeight'), 156, 'Long content is bounded after its width changes');
peek.classList.remove('is-visible'); const before = peek.getAttribute('style'); position(); assert.equal(peek.getAttribute('style'), before, 'A dismissed preview does not move');
dom.window.close();
console.log('Panel notification previews passed: real scoped widget and popup anchors, every panel edge and presentation, hidden or remote recovery, and small viewport bounds.');
