/* Read intrinsic content, never the height assigned by the panel allocator. */
(function (root) {
  'use strict';

  const number = value => Math.max(0, parseFloat(value) || 0);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const widths = { apps: 232, files: 280, assistant: 320, clock: 150, controls: 224 };
  const floors = { apps: 76, files: 200, assistant: 280, clock: 44, controls: 100 };
  const cap = 520;

  function create(options = {}) {
    const document = options.document || root.document;
    const view = document?.defaultView || root;
    const registry = options.registry || new Map();
    const cache = new Map();
    const observers = [];
    let pending = 0, destroyed = false;
    const requestFrame = view.requestAnimationFrame?.bind(view) || (callback => view.setTimeout(callback, 16));
    const cancelFrame = view.cancelAnimationFrame?.bind(view) || view.clearTimeout?.bind(view);
    const entries = () => Array.from(registry.entries()).filter(([, entry]) => entry?.source);
    const style = node => {
      let css;
      try { css = view.getComputedStyle?.(node) || {}; } catch (_) { css = {}; }
      return css;
    };
    const visible = (node, source) => {
      if (node === source) return true; // A compact widget's original content is hidden.
      if (node.hidden || node.matches?.('.panel-secondary-copy,.sr-only,.app-rack,.display-side-legacy')) return false;
      const css = style(node);
      return css.display !== 'none' && css.visibility !== 'hidden' && css.position !== 'absolute' && css.position !== 'fixed';
    };

    function intrinsic(node, width, source, budget, depth = 0) {
      if (!node || depth > 24 || --budget.count < 0 || !visible(node, source)) return 0;
      const css = style(node);
      const padding = number(css.paddingTop) + number(css.paddingBottom) + number(css.borderTopWidth) + number(css.borderBottomWidth);
      const inlinePadding = number(css.paddingLeft) + number(css.paddingRight);
      const innerWidth = Math.max(32, width - inlinePadding);
      const font = number(css.fontSize) || 14;
      const line = number(css.lineHeight) || font * 1.5;
      let children = Array.from(node.children || []).filter(child => visible(child, source));
      if (node.tagName === 'DETAILS' && !node.open) children = children.filter(child => child.tagName === 'SUMMARY');
      const tag = node.tagName || '';
      if (tag === 'SVG' || tag === 'IMG' || tag === 'CANVAS') return clamp(number(css.height) || 20, 16, 64);
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) {
        // An input's value is not a demand to grow its viewport forever.
        return Math.max(tag === 'TEXTAREA' ? line * Math.max(2, Number(node.rows) || 2) + padding : 32, number(css.minHeight));
      }
      if (!children.length) {
        const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
        const wrap = css.whiteSpace !== 'nowrap' && css.whiteSpace !== 'pre';
        const lines = text ? (wrap ? Math.max(1, Math.ceil(text.length * font * 0.52 / innerWidth)) : 1) : 0;
        // Leaf scrollHeight catches actual font/wrapping. Containers deliberately
        // never use it: a flex-stretched container would feed its allocation back.
        const measured = node === source || number(css.flexGrow) > 0 ? 0 : Math.min(240, number(node.scrollHeight));
        return Math.max(lines * line + padding, measured, number(css.minHeight), tag === 'BUTTON' || tag === 'SUMMARY' ? 28 : 0);
      }
      const gap = number(css.rowGap || css.gap);
      let height;
      if (css.display === 'grid' && !String(css.gridTemplateColumns || '').includes('subgrid')) {
        const columns = String(css.gridTemplateColumns || '').split(/\s+/).filter(value => /^\d/.test(value)).length || 1;
        const cell = Math.max(32, (innerWidth - gap * (columns - 1)) / columns);
        height = 0;
        for (let index = 0; index < children.length; index += columns) height += Math.max(...children.slice(index, index + columns).map(child => intrinsic(child, cell, source, budget, depth + 1))) + (index ? gap : 0);
      } else if ((css.display === 'flex' || css.display === 'inline-flex') && !String(css.flexDirection).startsWith('column')) {
        const cell = Math.max(32, (innerWidth - gap * (children.length - 1)) / children.length);
        height = Math.max(0, ...children.map(child => intrinsic(child, cell, source, budget, depth + 1)));
      } else {
        height = children.reduce((sum, child, index) => {
          const childStyle = style(child);
          return sum + intrinsic(child, innerWidth, source, budget, depth + 1) + number(childStyle.marginTop) + number(childStyle.marginBottom) + (index ? gap : 0);
        }, 0);
      }
      // Large histories keep a useful list viewport; headings and controls stay
      // outside it. Short lists use their actual content height.
      if (node.matches?.('.ai-chat')) height = clamp(height, 140, 220);
      else if (node.matches?.('#miniStack,.memory-items,.folder-directory,#notificationList,.desktop-clipboard-list')) height = Math.min(360, height);
      return Math.max(height + padding, /^(BUTTON|SUMMARY)$/.test(tag) ? Math.max(28, number(css.minHeight)) : 0);
    }

    function appsDimensions(entry, width) {
      const source = entry.source;
      let fixed = 24; // Native sheet inset; Overview has its own icon widget.
      const quick = source.querySelector?.('#appsQuickLaunch');
      const launchers = Array.from(quick?.querySelectorAll('[data-quick-launch-app]') || []).filter(node => !node.hidden);
      if (launchers.length) {
        const columns = Math.max(1, Math.floor((Math.max(64, width - 24) + 4) / 68));
        const rows = Math.ceil(launchers.length / columns);
        fixed += 25 + rows * 68 + Math.max(0, rows - 1) * 8;
      }
      const parked = Array.from(source.querySelectorAll?.('#miniStack [data-mini-card]') || []).filter(node => !node.hidden);
      const background = source.querySelector?.('#backgroundApps');
      if (background && !background.hidden) {
        const icons = background.querySelectorAll('.background-app-icon').length || background.querySelectorAll('button').length;
        const rows = Math.max(1, Math.ceil(icons / Math.max(1, Math.floor((width - 24) / 38))));
        fixed += 16 + 25 + rows * 34 + Math.max(0, rows - 1) * 4;
      }
      // Quick launch and Background never scroll. Only Parked receives a
      // bounded, useful viewport, so forty cards do not shrink these controls
      // or turn the entire Apps widget into an icon.
      const min = Math.max(floors.apps, fixed + (parked.length ? 37 + 120 : 0));
      const preferred = Math.max(min, fixed + (parked.length ? 37 + (parked.length > 1 ? 160 : 120) : 0));
      return { min, preferred };
    }

    function contentHeight(id, entry, width) {
      if (id === 'apps') return appsDimensions(entry, width).preferred;
      if (id === 'clock') {
        const time = entry.source.querySelector?.('.live-time')?.textContent || '12:00';
        const date = entry.source.querySelector?.('#dateLabel')?.textContent || '22 September';
        const day = entry.source.querySelector?.('#dayLabel')?.textContent || 'Monday';
        const small = width <= 200, font = small ? 24 : 28, gap = width <= 230 ? 8 : 12;
        const dateHeight = small ? 12 * 1.35 : 13 * 1.35 + 3 + 12 * 1.35;
        const labelWidth = Math.max(date.length * 12 * 0.52, small ? 0 : day.length * 13 * 0.52);
        const wraps = width <= 230 && time.length * font * 0.56 + gap + labelWidth > width - 24;
        const height = (wraps ? font * 1.1 + gap + dateHeight : Math.max(font * 1.1, dateHeight)) + 8;
        return Math.max(44, Math.ceil(height / 4) * 4);
      }
      const nodes = entry.nodes?.length ? entry.nodes : [entry.source];
      const height = nodes.reduce((sum, node) => sum + intrinsic(node, width, entry.source, { count: 1200 }), 0);
      const inset = entry.area ? (id === 'files' ? 0 : 16) : 20;
      return clamp(Math.ceil(height + inset), floors[id] || 48, cap);
    }

    function crossWidth(id, entry, given) {
      if (Number.isFinite(given) && given >= 100) return given;
      const frame = entry.source.closest?.('.desktop-widget');
      const live = number(frame?.getBoundingClientRect?.().width);
      return live >= 120 ? live : (widths[id] || 232);
    }
    function read(id, vertical, cross) {
      const entry = registry.get(id);
      if (!entry?.source || id.startsWith('spacer')) return undefined;
      if (vertical) return contentHeight(id, entry, crossWidth(id, entry, cross));
      const minimumWidth = widths[id] || 232;
      if (!Number.isFinite(cross) || cross < 1) return minimumWidth;
      // A horizontal panel must have room for the whole usable widget height,
      // too. Widening can remove wrapping, but cannot turn a 100px strip into
      // a readable conversation or a multi-row launcher. The allocator treats
      // this finite sentinel as an unfit minimum and uses the icon popup.
      for (let width = minimumWidth; width <= 640; width += 32) {
        const required = id === 'apps' ? appsDimensions(entry, width).min : contentHeight(id, entry, width);
        if (required <= cross) return width;
      }
      return 100000;
    }
    function readRange(id, vertical, cross) {
      const entry = registry.get(id);
      if (id === 'apps' && vertical && entry?.source) return appsDimensions(entry, crossWidth(id, entry, cross));
      return read(id, vertical, cross);
    }
    const same = (first, second) => first === second || Boolean(first && second && typeof first === 'object' && typeof second === 'object' && first.min === second.min && first.preferred === second.preferred);
    function measure(id, vertical = true, availableCross) {
      const value = read(id, vertical, availableCross);
      if (value !== undefined) cache.set(id + ':' + Boolean(vertical), { id, vertical: Boolean(vertical), cross: availableCross, value, range: false });
      return value;
    }
    function measureRange(id, vertical = true, availableCross) {
      const value = readRange(id, vertical, availableCross);
      if (value !== undefined) cache.set(id + ':' + Boolean(vertical) + ':range', { id, vertical: Boolean(vertical), cross: availableCross, value, range: true });
      return value;
    }
    function sync() {
      if (destroyed) return false;
      let changed = false;
      for (const [key, previous] of cache) {
        const value = previous.range ? readRange(previous.id, previous.vertical, previous.cross) : read(previous.id, previous.vertical, previous.cross);
        if (!same(value, previous.value)) { cache.set(key, { ...previous, value }); changed = true; }
      }
      return changed;
    }
    function schedule() {
      if (pending || destroyed) return;
      pending = requestFrame(() => {
        pending = 0;
        if (sync()) options.onChange?.();
      });
    }
    const Mutation = view.MutationObserver || root.MutationObserver;
    const Resize = view.ResizeObserver || root.ResizeObserver;
    if (typeof Mutation === 'function') {
      const observer = new Mutation(schedule);
      for (const [, entry] of entries()) for (const node of entry.nodes || [entry.source]) observer.observe(node, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'open', 'class'] });
      observers.push(observer);
    }
    if (typeof Resize === 'function') {
      const observer = new Resize(schedule);
      for (const [, entry] of entries()) observer.observe(entry.source);
      observers.push(observer);
    }
    document?.addEventListener?.('input', schedule, true);
    document?.addEventListener?.('change', schedule, true);
    view.addEventListener?.('resize', schedule);
    return {
      measure, measureRange, sync,
      destroy() {
        destroyed = true;
        if (pending && cancelFrame) cancelFrame(pending);
        pending = 0;
        for (const observer of observers) observer.disconnect();
        document?.removeEventListener?.('input', schedule, true);
        document?.removeEventListener?.('change', schedule, true);
        view.removeEventListener?.('resize', schedule);
        cache.clear();
      }
    };
  }
  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpatialPanelFit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
