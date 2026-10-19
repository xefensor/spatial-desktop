/* Compact applets are live views of the existing desktop, with no copied state. */
(function (root) {
  'use strict';

  function create(options = {}) {
    const document = options.document || root.document;
    const registry = options.registry || new Map();
    const views = new Map(), observers = [];
    let scheduled = 0, disposed = false, appsExtent = null;
    const eventRoot = document?.defaultView || root;
    const workspace = () => typeof activeWorkspace === 'string' ? activeWorkspace : '';
    const info = () => typeof appInfo === 'object' ? appInfo : {};
    const states = () => typeof appState === 'object' ? appState : {};
    const source = id => registry.get(id)?.source;
    const text = node => (node?.textContent || '').trim();
    const nativeDisabled = node => Boolean(node?.disabled || node?.getAttribute?.('aria-disabled') === 'true');
    const allowed = id => {
      if (document?.querySelector('.desktop-shell')?.inert || root.SpatialDesktopSystem?.blocked?.()) return false;
      const feature = (info()[id]?.base || id) === 'settings' ? 'systems' : 'apps';
      return !root.SpatialGuide?.model?.active?.() || root.SpatialGuide.model.allows(feature);
    };
    const nativeLaunchers = () => Array.from(source('apps')?.querySelectorAll('#appsQuickLaunch [data-quick-launch-app]') || []);
    const nativeBackground = () => Array.from(source('apps')?.querySelectorAll('#backgroundApps [data-background-open]') || []);
    const backgroundItems = () => {
      const snapshot = root.SpatialBackgroundApps?.snapshot?.();
      const native = nativeBackground();
      // Background services have their own identities and deliberately run
      // across Workspaces. A closed source window is not a missing service.
      const records = Array.isArray(snapshot?.items) ? snapshot.items : native.map(node => ({id: node.dataset.backgroundOpen, kind: node.dataset.backgroundKind}));
      const byId = new Map(records.map(item => [item.id, item]));
      const order = [...native.map(node => node.dataset.backgroundOpen), ...records.map(item => item.id)];
      return [...new Set(order)].filter(id => byId.has(id)).map(id => byId.get(id));
    };
    const parkedNames = () => {
      const belongs = id => root.SpatialDisplayRoleBridge?.windowInCurrentContext?.(id) ?? (typeof desktopPages !== 'undefined' ? desktopPages.inColumn?.(workspace(), id) ?? true : true);
      const cards = Array.from(source('apps')?.querySelectorAll('#miniStack [data-mini-card]') || []).map(card => card.dataset.miniCard);
      // Use the same card order as the expanded view, not a separate taskbar
      // sort. Before the first card render, this is its native model query.
      const names = cards.length ? cards : Object.keys(states());
      const scoped = typeof workspaceHotbarNames === 'function' ? new Set(workspaceHotbarNames()) : null;
      return [...new Set(names)].filter(id => info()[id] && states()[id] === 'minimized' && (!scoped || scoped.has(id)) && belongs(id) && (!info()[id].workspace || info()[id].workspace === workspace()));
    };
    const pinNames = () => (root.SpatialAppsQuickLaunch?.names?.() || nativeLaunchers().map(button => button.dataset.quickLaunchApp)).filter(id => info()[id] && (!info()[id].workspace || info()[id].workspace === workspace()));
    const nativeRestore = id => Array.from(source('apps')?.querySelectorAll('[data-mini-restore]') || []).find(button => button.dataset.miniRestore === id);
    const appAllowed = id => allowed(id) && !(typeof desktopNavigationBlocked === 'function' && desktopNavigationBlocked());
    const element = (tag, className) => { const node = document.createElement(tag); if (className) node.className = className; return node; };
    const glyph = name => typeof icon === 'function' ? icon(name) : '<svg aria-hidden="true"><use href="#' + name + '"/></svg>';
    const art = id => typeof appArt === 'function' ? appArt(id) : glyph('i-grid');
    function button(className, label) {
      const node = element('button', className); node.type = 'button'; node.setAttribute('aria-label', label); node.title = label; return node;
    }
    function setLabel(node, label) { if (node.getAttribute('aria-label') !== label) node.setAttribute('aria-label', label); if (node.title !== label) node.title = label; }
    function setText(node, value) { if (node.textContent !== value) node.textContent = value; }
    const expandedClock = source('clock');
    let restoreExpandedClock = () => {};
    if (expandedClock && !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(expandedClock.tagName)) {
      const attributes = ['role', 'tabindex', 'aria-label', 'aria-haspopup', 'aria-disabled'];
      const previous = new Map(attributes.map(name => [name, expandedClock.getAttribute(name)]));
      const previousTitle = expandedClock.title, previousClass = expandedClock.classList.contains('panel-native-clock-action');
      expandedClock.setAttribute('role', 'button'); expandedClock.setAttribute('tabindex', '0'); expandedClock.setAttribute('aria-haspopup', 'dialog');
      expandedClock.classList.toggle('panel-native-clock-action', true);
      const openCalendar = event => { if (!allowed('settings')) return; interact(event); options.openWidget?.('calendar', expandedClock); };
      const keyCalendar = event => { if (!event.defaultPrevented && ['Enter', ' '].includes(event.key)) openCalendar(event); };
      expandedClock.addEventListener('click', openCalendar); expandedClock.addEventListener('keydown', keyCalendar);
      restoreExpandedClock = () => {
        expandedClock.removeEventListener?.('click', openCalendar); expandedClock.removeEventListener?.('keydown', keyCalendar);
        for (const [name, value] of previous) if (value === null) expandedClock.removeAttribute(name); else expandedClock.setAttribute(name, value);
        expandedClock.title = previousTitle; expandedClock.classList.toggle('panel-native-clock-action', previousClass);
      };
    }
    function reconcile(group, nodes) {
      const focused = document.activeElement, keep = new Set(nodes);
      for (const child of Array.from(group.children)) if (!keep.has(child)) child.remove();
      nodes.forEach((node, index) => { if (group.children[index] !== node) group.insertBefore(node, group.children[index] || null); });
      if (focused?.isConnected && group.contains(focused) && document.activeElement !== focused) focused.focus({preventScroll: true});
    }
    function interact(event) { event.preventDefault(); event.stopPropagation(); }
    function buildApps(container) {
      const view = {id: 'apps', root: element('div', 'panel-compact-apps'), buttons: new Map()};
      view.pins = element('div', 'panel-compact-pins'); view.pins.setAttribute('role', 'group'); view.pins.setAttribute('aria-label', 'Quick launch'); view.pins.dataset.appSection = 'quick-launch';
      view.tasks = element('div', 'panel-compact-tasks'); view.tasks.setAttribute('role', 'group'); view.tasks.setAttribute('aria-label', 'Parked windows'); view.tasks.dataset.appSection = 'parked';
      view.background = element('div', 'panel-compact-background'); view.background.setAttribute('role', 'group'); view.background.setAttribute('aria-label', 'Background · Running across all Workspaces'); view.background.dataset.appSection = 'background';
      view.root.append(view.pins, view.tasks, view.background);
      view.root.addEventListener('click', event => {
        const target = event.target.closest('button'); if (!target || !view.root.contains(target)) return;
        // The native document capture handler owns this command, including
        // popup anchoring, middle-click force quit and its context menu.
        if (target.dataset.backgroundOpen) return;
        interact(event);
        if (view.workspace !== workspace()) { sync(); return; }
        const id = target.dataset.panelTask || target.dataset.panelLaunch, task = Boolean(target.dataset.panelTask);
        if (nativeDisabled(target) || !appAllowed(id) || !info()[id]) return;
        if (task) {
          if (!parkedNames().includes(id)) { sync(); return; }
          const restore = nativeRestore(id);
          // This is the expanded parked card's primary action. Shift does not
          // turn Unpark into a different command in the expanded view either.
          if (restore) { if (!nativeDisabled(restore)) restore.click(); }
          else if (typeof openApp === 'function') openApp(id);
        } else {
          if (!pinNames().includes(id)) { sync(); return; }
          root.SpatialAppsQuickLaunch?.activate?.(id, Boolean(event.shiftKey));
        }
        sync();
      });
      container.append(view.root); return view;
    }
    function appButton(view, id, task) {
      const key = (task ? 'window:' : 'pin:') + id;
      if (!view.buttons.has(key)) {
        const node = button('panel-compact-app', info()[id]?.label || id);
        node.dataset[task ? 'panelTask' : 'panelLaunch'] = id;
        node.innerHTML = art(id);
        let state = null, shortcut = null;
        if (task) {
          state = element('span', 'panel-compact-state'); state.setAttribute('aria-hidden', 'true'); node.append(state);
          shortcut = element('kbd', 'panel-compact-shortcut'); shortcut.setAttribute('aria-hidden', 'true'); node.append(shortcut);
        }
        view.buttons.set(key, {node, state, shortcut});
      }
      const entry = view.buttons.get(key), model = info()[id], status = task ? states()[id] : 'launcher';
      entry.node.dataset.windowState = status; if (entry.state) entry.state.dataset.windowState = status;
      entry.node.classList.toggle('is-parked', status === 'minimized');
      entry.node.style.setProperty('--app-primary', model.primary || 'var(--workspace-accent)');
      entry.node.disabled = !allowed(id) || nativeDisabled(task ? nativeRestore(id) : nativeLaunchers().find(button => button.dataset.quickLaunchApp === id));
      if (task) {
        const slot = typeof hotbarSlotFor === 'function' ? hotbarSlotFor(id) : typeof workspaceHotbarNames === 'function' ? workspaceHotbarNames().indexOf(id) + 1 : null;
        const digit = slot % 10, bank = Math.floor((slot - 1) / 10);
        entry.shortcut.hidden = !(slot > 0);
        if (slot > 0) setText(entry.shortcut, bank === 0 ? String(digit) : bank === 1 ? '⇧' + digit : String(slot));
        const hint = slot > 0 && slot <= 20 ? ' · Super+' + (bank ? 'Shift+' : '') + digit + ' · F2+' + (bank ? 'Shift+' : '') + digit : slot > 20 ? ' · Slot ' + slot : '';
        if (slot > 0 && slot <= 20) entry.node.setAttribute('aria-keyshortcuts', 'Meta+' + (bank ? 'Shift+' : '') + digit);
        else entry.node.removeAttribute('aria-keyshortcuts');
        setLabel(entry.node, model.label + ' · Parked · Unpark' + hint);
      } else {
        const native = nativeLaunchers().find(button => button.dataset.quickLaunchApp === id);
        const action = root.SpatialAppsQuickLaunch?.actionFor?.(id);
        const detail = action === 'return' ? 'Return to existing app on its desktop' : action === 'new' ? 'New window on this desktop' : 'Open on this desktop';
        setLabel(entry.node, native?.getAttribute('aria-label') || model.label + ' · ' + detail + (model.singleInstance ? '' : ' · Shift-click for a new window'));
      }
      return entry.node;
    }
    function backgroundButton(view, service) {
      const key = 'background:' + service.id;
      const native = nativeBackground().find(node => node.dataset.backgroundOpen === service.id);
      if (!view.buttons.has(key)) {
        const node = button('panel-compact-app panel-compact-background-app', service.label || info()[service.kind]?.label || service.kind || 'Background app');
        node.dataset.backgroundOpen = service.id;
        node.dataset.windowState = 'background';
        node.setAttribute('aria-haspopup', 'dialog'); node.setAttribute('aria-controls', 'backgroundAppPopup');
        node.innerHTML = service.kind ? art(service.kind) : native?.innerHTML || glyph('i-grid');
        const state = element('span', 'panel-compact-state'); state.setAttribute('aria-hidden', 'true'); state.dataset.windowState = 'background'; node.append(state);
        view.buttons.set(key, {node, state});
      }
      const entry = view.buttons.get(key), download = service.model?.download;
      entry.node.dataset.backgroundKind = service.kind || '';
      entry.node.disabled = !allowed(service.kind || service.id) || nativeDisabled(native);
      entry.node.style.setProperty('--app-primary', info()[service.kind]?.primary || 'var(--workspace-accent)');
      entry.node.style.setProperty('--background-progress', download?.active ? Math.floor(download.received / download.total * 100) + '%' : '100%');
      const label = native?.getAttribute('aria-label') || (service.label || info()[service.kind]?.label || service.kind || 'Background app') + ' · Running across all Workspaces · Click for controls · Middle click to force quit';
      setLabel(entry.node, label);
      return entry.node;
    }
    function syncApps(view) {
      const tasks = parkedNames(), pins = pinNames(), background = backgroundItems();
      view.workspace = workspace();
      reconcile(view.pins, pins.map(id => appButton(view, id, false)));
      reconcile(view.tasks, tasks.map(id => appButton(view, id, true)));
      reconcile(view.background, background.map(service => backgroundButton(view, service)));
      view.pins.hidden = !pins.length; view.tasks.hidden = !tasks.length; view.background.hidden = !background.length;
      const keep = new Set([...pins.map(id => 'pin:' + id), ...tasks.map(id => 'window:' + id), ...background.map(service => 'background:' + service.id)]);
      for (const key of view.buttons.keys()) if (!keep.has(key)) view.buttons.delete(key);
    }
    function buildClock(container) {
      const view = {id: 'clock', root: button('panel-compact-clock', 'Open Calendar')};
      view.time = element('strong', 'panel-compact-time'); view.date = element('small', 'panel-compact-date');
      view.root.append(view.time, view.date); view.root.setAttribute('aria-haspopup', 'dialog');
      view.root.addEventListener('click', event => { interact(event); if (allowed('settings')) options.openWidget?.('calendar', view.root); });
      container.append(view.root); return view;
    }
    function syncClock(view) {
      const now = new Date(), clock = source('clock');
      const time = text(clock?.querySelector('.live-time')) || now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
      const date = now.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
      const nativeDate = [text(clock?.querySelector('#dayLabel')), text(clock?.querySelector('#dateLabel'))].filter(Boolean).join(' · ') || date;
      view.root.disabled = !allowed('settings');
      setText(view.time, time); setText(view.date, date); setLabel(view.root, time + ' · ' + nativeDate + ' · Open Calendar');
    }
    function sync() {
      if (disposed) return;
      if (expandedClock?.classList.contains('panel-native-clock-action')) {
        const detail = [text(expandedClock.querySelector('.live-time')), text(expandedClock.querySelector('#dayLabel')), text(expandedClock.querySelector('#dateLabel'))].filter(Boolean).join(' · ');
        setLabel(expandedClock, detail + ' · Open Calendar');
        expandedClock.setAttribute('aria-disabled', String(!allowed('settings')));
      }
      for (const view of views.values()) {
        if (view.id === 'apps') syncApps(view);
        else if (view.id === 'clock') syncClock(view);
      }
      if ([...views.values()].some(view => view.id === 'apps')) {
        const nextExtent = measure('apps', true) + ':' + measureMin('apps', true), changed = appsExtent !== null && appsExtent !== nextExtent;
        appsExtent = nextExtent;
        if (changed) options.onChange?.();
      }
    }
    function schedule() {
      if (scheduled || disposed) return;
      if (typeof eventRoot.requestAnimationFrame !== 'function') { sync(); return; }
      scheduled = eventRoot.requestAnimationFrame(() => { scheduled = 0; sync(); });
    }
    function parkedWheel(event) {
      if (disposed || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.getModifierState?.('OS') || root.SpatialDemoSuper?.held?.()) return;
      // A held-window gesture owns its wheel shortcuts before any applet does.
      if ((typeof manualWindowInteraction !== 'undefined' && manualWindowInteraction) || (typeof tileInteraction !== 'undefined' && tileInteraction) || document?.querySelector('.app-frame.is-dragging')) return;
      const group = event.target?.closest?.('.panel-compact-tasks');
      if (!group || group.hidden || ![...views.values()].some(view => view.id === 'apps' && view.tasks === group)) return;
      const panel = group.closest('.desktop-panel');
      if (!panel || panel.dataset.mode !== 'compact') return;
      const horizontal = ['top', 'bottom'].includes(panel.dataset.edge);
      if (!horizontal && event.shiftKey) return;
      if (horizontal) {
        const delta = Math.abs(event.deltaX || 0) > Math.abs(event.deltaY || 0) ? event.deltaX : event.deltaY || event.deltaX || 0;
        if (!delta) return;
        const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? group.clientWidth || 1 : 1;
        const limit = Math.max(0, (group.scrollWidth || 0) - (group.clientWidth || 0));
        group.scrollLeft = Math.max(0, Math.min(limit, (group.scrollLeft || 0) + delta * scale));
        event.preventDefault();
      }
      // Even an edge belongs to Parked. Native vertical default scrolling is
      // left intact; document-capture desktop navigation must not receive it.
      event.stopPropagation();
    }
    eventRoot.addEventListener?.('wheel', parkedWheel, {capture: true, passive: false});
    if (typeof root.MutationObserver === 'function') {
      const observe = (node, settings) => { if (node) { const observer = new root.MutationObserver(schedule); observer.observe(node, settings); observers.push(observer); } };
      observe(document?.querySelector('.workspace-zone'), {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class']});
      observe(source('apps')?.querySelector('#appsQuickLaunch'), {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-label']});
      observe(source('apps')?.querySelector('#miniStack'), {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'aria-disabled']});
      observe(source('apps')?.querySelector('#backgroundApps'), {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-label', 'title', 'style']});
      observe(source('clock'), {childList: true, subtree: true});
    }
    function mount(id, container) {
      if (!document || !container || !['apps', 'clock'].includes(id)) return false;
      if (views.has(container)) return views.get(container).id === id;
      const view = id === 'apps' ? buildApps(container) : buildClock(container);
      views.set(container, view); sync(); return true;
    }
    function measure(id, vertical) {
      if (id === 'clock') return vertical ? 48 : 80;
      if (id === 'apps') return measureApps(3);
      return 44;
    }
    function measureMin(id, vertical) {
      if (id === 'apps') return measureApps(1);
      return measure(id, vertical);
    }
    function measureApps(parkedLimit) {
      const counts = [pinNames().length, Math.min(parkedNames().length, parkedLimit), backgroundItems().length].filter(Boolean);
      // Launchers and background controls are fixed. Only Parked scrolls:
      // prefer three visible icons and permit one when panel space is tight.
      const icons = counts.reduce((sum, count) => sum + count, 0);
      // Start is its own panel icon. Apps only reserves its native groups,
      // with separators between visible groups and no leading divider.
      return 4 + icons * 40 + Math.max(0, icons - 1) * 4 + Math.max(0, counts.length - 1) * 8;
    }
    function destroy() {
      disposed = true;
      if (scheduled) eventRoot.cancelAnimationFrame?.(scheduled);
      eventRoot.removeEventListener?.('wheel', parkedWheel, true);
      observers.forEach(observer => observer.disconnect());
      restoreExpandedClock();
      for (const view of views.values()) view.root.remove(); views.clear();
    }
    return {mount, sync, measure, measureMin, destroy};
  }

  const api = {create};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpatialPanelCompact = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
