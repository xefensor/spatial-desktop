(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SpatialPanelWidgets = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const EDGES = ['left', 'right', 'top', 'bottom'];
  const MODES = ['expanded', 'compact', 'hidden'];
  const GAP = 8;
  const COMPACT = 56;
  const ICON = 44;
  const ICON_GAP = 4;
  const contentCatalog = Object.freeze([
    ['apps', 'Apps', '▦', 140, 250, 3, 'expanded', 56],
    ['files', 'Files', '▱', 140, 220, 2, 'expanded', 56],
    ['assistant', 'Assistant', '✧', 160, 240, 2, 'compact', 56],
    ['calendar', 'Calendar', '▦', 120, 180, 0, 'compact', 80],
    ['notifications', 'Notifications', '◉', 120, 160, 1, 'compact', 56],
    ['clipboard', 'Clipboard', '▤', 100, 150, 1, 'hidden', 56],
    ['focus', 'Focus', '◷', 80, 100, 0, 'hidden', 56],
    ['clock', 'Clock', '◷', 48, 56, 0, 'expanded', 44],
    ['launcher', 'Overview', '▦', 44, 44, 0, 'compact', 44],
    ['controls', 'System controls', '☷', 64, 80, 0, 'compact', 64],
    ['devices', 'Devices', '⌘', 120, 160, 0, 'hidden', 56],
    ['requests', 'Requests', '◇', 110, 160, 0, 'hidden', 56],
    ['project-plans', 'Project plans', '☰', 120, 180, 1, 'hidden', 56],
    ['workspace-alerts', 'Workspace alerts', '!', 100, 140, 0, 'hidden', 56]
  ].map(function (row) {
    return Object.freeze({id: row[0], title: row[1], icon: row[2], minSize: row[3], preferredSize: row[4], grow: row[5], defaultMode: row[6], compactSize: ICON});
  }));
  const spacerDefinition = Object.freeze({id: 'spacer', title: 'Spacer', icon: '↔', minSize: 0, preferredSize: 0, grow: 1, defaultMode: 'expanded', compactSize: 0, repeatable: true});
  const catalog = Object.freeze(contentCatalog.concat([spacerDefinition]));
  const definitions = Object.fromEntries(catalog.map(function (item) { return [item.id, item]; }));
  const compactDefinitions = Object.freeze(Object.fromEntries(contentCatalog.map(function (item) {
    const view = ['apps', 'clock'].includes(item.id) ? item.id : 'icon';
    return [item.id, Object.freeze({view: view, vertical: item.id === 'clock' ? 48 : 44, horizontal: item.id === 'clock' ? 80 : 44, minSize: ['apps', 'launcher'].includes(item.id) ? 44 : view === 'icon' ? 28 : 32, grow: item.id === 'apps' ? definitions.apps.grow : 0})];
  })));

  const leftWidgets = ['apps', 'clock', 'launcher', 'notifications', 'calendar', 'controls'];
  const rightWidgets = ['files', 'assistant', 'clipboard', 'focus', 'devices', 'requests', 'project-plans', 'workspace-alerts'];
  const own = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
  const record = function (value) { return value && typeof value === 'object' && !Array.isArray(value); };
  const number = function (value, fallback, min, max) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  };
  const mode = function (value, fallback) { return MODES.includes(value) ? value : fallback; };
  const edge = function (value) { return EDGES.includes(value) ? value : 'left'; };
  const panelLabel = function (value, side) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, 60) : side[0].toUpperCase() + side.slice(1) + ' panel';
  };
  const validId = function (value) {
    return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
  };

  function isSpacer(id) { return typeof id === 'string' && /^spacer-[1-9][0-9]{0,8}$/.test(id); }
  function definition(id) { return isSpacer(id) ? Object.assign({}, spacerDefinition, {id: id}) : definitions[id]; }
  function knownWidget(id) { return isSpacer(id) || (id !== 'spacer' && own(definitions, id)); }
  function nextSpacerId(ids) { let number = 1; while (ids.has('spacer-' + number)) number++; return 'spacer-' + number; }

  function defaults() {
    return {
      schema: 5,
      panels: [
        {id: 'panel-left', label: 'Left panel', edge: 'left', size: 232, share: 1, mode: 'expanded', display: 1, widgets: leftWidgets.slice()},
        {id: 'panel-right', label: 'Right panel', edge: 'right', size: 280, share: 1, mode: 'compact', display: 1, widgets: rightWidgets.slice()}
      ],
      widgets: Object.fromEntries(contentCatalog.map(function (item) { return [item.id, {mode: item.defaultMode, size: 0}]; }))
    };
  }

  function equalState(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (value, i) { return equalState(value, b[i]); });
    if (!record(a) || !record(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(function (key) { return own(b, key) && equalState(a[key], b[key]); });
  }

  function migrateDefaults(input) {
    function legacy(version) {
      return {
        schema: version,
        panels: [
          {id: 'panel-left', label: 'Left panel', edge: 'left', size: version === 1 ? 248 : 264, share: 1, mode: 'expanded', display: 1, widgets: version === 1 ? ['apps', 'calendar', 'clock', 'controls'] : version === 2 ? ['apps', 'notifications', 'calendar', 'clock', 'controls'] : leftWidgets.filter(function (id) { return id !== 'launcher'; })},
          {id: 'panel-right', label: 'Right panel', edge: 'right', size: 304, share: 1, mode: 'expanded', display: 1, widgets: version === 1 ? ['files', 'assistant', 'notifications', 'clipboard', 'focus', 'devices', 'requests', 'project-plans', 'workspace-alerts'] : rightWidgets.slice()}
        ],
        widgets: Object.fromEntries(contentCatalog.filter(function (item) { return item.id !== 'launcher'; }).map(function (item) { return [item.id, {mode: item.id === 'clock' && version < 3 ? 'compact' : item.id === 'assistant' && version === 1 ? 'expanded' : item.defaultMode, size: 0}]; }))
      };
    }
    return equalState(input, legacy(1)) || equalState(input, legacy(2)) || equalState(input, legacy(3)) ? defaults() : input;
  }

  function normalize(input) {
    const base = defaults();
    const migrated = migrateDefaults(input);
    const source = record(migrated) ? migrated : {};
    const rawPanels = Array.isArray(source.panels) && source.panels.some(record) ? source.panels.filter(record).slice(0, 24) : base.panels;
    const seenPanels = new Set();
    const seenWidgets = new Set();
    const panels = rawPanels.map(function (raw, index) {
      let id = validId(raw.id) ? raw.id : 'panel-' + (index + 1);
      const prefix = id;
      let suffix = 2;
      while (seenPanels.has(id)) id = prefix + '-' + suffix++;
      seenPanels.add(id);
      const side = edge(raw.edge);
      const widgets = (Array.isArray(raw.widgets) ? raw.widgets : []).filter(function (id) {
        if (typeof id !== 'string' || !knownWidget(id) || seenWidgets.has(id)) return false;
        seenWidgets.add(id);
        return true;
      });
      return {
        id: id,
        label: panelLabel(raw.label, side),
        edge: side,
        size: number(raw.size, side === 'top' || side === 'bottom' ? 180 : 264, COMPACT, 640),
        share: number(raw.share, 1, 0.1, 20),
        mode: mode(raw.mode, 'expanded'),
        display: Math.round(number(raw.display, 1, 1, 8)),
        widgets: widgets
      };
    });
    contentCatalog.forEach(function (item) {
      if (seenWidgets.has(item.id)) return;
      const preferredSide = leftWidgets.includes(item.id) ? 'left' : 'right';
      const owner = panels.find(function (panel) { return panel.edge === preferredSide; }) || panels[0];
      if (item.id === 'launcher') {
        // Add the new system entry beside the existing tray without resetting
        // saved panel dimensions, widget preferences or Spacer positions.
        const clock = owner.widgets.indexOf('clock');
        const tray = owner.widgets.findIndex(function (id, index) { return index > clock && ['notifications', 'calendar', 'controls'].includes(id); });
        const position = tray >= 0 ? tray : clock >= 0 ? clock + 1 : owner.widgets.length;
        owner.widgets.splice(position, 0, item.id);
      } else owner.widgets.push(item.id);
    });
    // The former panel-owned gaps become real movable Spacer instances. Keep
    // their exact sequence positions, including slots before hidden widgets.
    panels.forEach(function (panel, index) {
      const raw = rawPanels[index];
      const anchors = Array.isArray(raw.spaceBefore) ? Array.from(new Set(raw.spaceBefore.filter(function (id) { return id === '$end' || panel.widgets.includes(id); }))) : [];
      anchors.forEach(function (before) {
        const id = nextSpacerId(seenWidgets);
        seenWidgets.add(id);
        panel.widgets.splice(before === '$end' ? panel.widgets.length : panel.widgets.indexOf(before), 0, id);
      });
    });
    const rawWidgets = record(source.widgets) ? source.widgets : {};
    const ids = contentCatalog.map(function (item) { return item.id; }).concat(panels.flatMap(function (panel) { return panel.widgets.filter(isSpacer); }));
    const widgets = Object.fromEntries(ids.map(function (id) {
      const item = definition(id);
      const raw = own(rawWidgets, id) && record(rawWidgets[id]) ? rawWidgets[id] : {};
      const widgetMode = mode(raw.mode, item.defaultMode);
      return [id, {mode: id === 'launcher' && widgetMode === 'expanded' ? 'compact' : widgetMode, size: number(raw.size, 0, 0, 20000)}];
    }));
    return {schema: 5, panels: panels, widgets: widgets};
  }

  function addSpacer(input, panelId, index) {
    const state = normalize(input);
    const panel = state.panels.find(function (item) { return item.id === panelId; });
    if (!panel) return state;
    const id = nextSpacerId(new Set(Object.keys(state.widgets)));
    const position = Math.round(number(index, panel.widgets.length, 0, panel.widgets.length));
    panel.widgets.splice(position, 0, id);
    state.widgets[id] = {mode: 'expanded', size: 0};
    return state;
  }

  function removeSpacer(input, id) {
    const state = normalize(input);
    if (!isSpacer(id)) return state;
    state.panels.forEach(function (panel) { panel.widgets = panel.widgets.filter(function (item) { return item !== id; }); });
    delete state.widgets[id];
    return state;
  }

  // Compatibility for older callers: new gaps are literal Spacer widgets.
  function setSpace(input, panelId, beforeId, enabled = true) {
    const state = normalize(input);
    const panel = state.panels.find(function (item) { return item.id === panelId; });
    if (!panel || (beforeId !== '$end' && !panel.widgets.includes(beforeId))) return state;
    const index = beforeId === '$end' ? panel.widgets.length : panel.widgets.indexOf(beforeId);
    const preceding = panel.widgets[index - 1];
    if (enabled) return isSpacer(preceding) ? state : addSpacer(state, panelId, index);
    return isSpacer(preceding) ? removeSpacer(state, preceding) : state;
  }

  function moveWidget(input, widgetId, panelId, index) {
    const state = normalize(input);
    const destination = state.panels.find(function (panel) { return panel.id === panelId; });
    const source = state.panels.find(function (panel) { return panel.widgets.includes(widgetId); });
    if (!destination || !source || !knownWidget(widgetId)) return state;
    const length = destination.widgets.length - (source === destination ? 1 : 0);
    const position = Math.round(number(index, length, 0, length));
    const sourceIndex = source.widgets.indexOf(widgetId);
    if (source === destination && sourceIndex === position) return state;
    source.widgets.splice(sourceIndex, 1);
    destination.widgets.splice(position, 0, widgetId);
    return state;
  }

  function addPanel(input, side) {
    const state = normalize(input);
    if (state.panels.length >= 24) return state;
    const ids = new Set(state.panels.map(function (panel) { return panel.id; }));
    let index = 1;
    while (ids.has('panel-' + index)) index++;
    const panelEdge = edge(side);
    state.panels.push({id: 'panel-' + index, label: panelLabel(null, panelEdge), edge: panelEdge, size: panelEdge === 'top' || panelEdge === 'bottom' ? 180 : 264, share: 1, mode: 'expanded', display: 1, widgets: []});
    return state;
  }

  function removePanel(input, panelId) {
    const state = normalize(input);
    const removed = state.panels.find(function (panel) { return panel.id === panelId; });
    if (!removed || state.panels.length === 1) return state;
    state.panels = state.panels.filter(function (panel) { return panel.id !== panelId; });
    const destination = state.panels.find(function (panel) { return panel.edge === removed.edge && panel.display === removed.display; }) || state.panels[0];
    destination.widgets.push.apply(destination.widgets, removed.widgets);
    return state;
  }

  function updatePanel(input, panelId, patch) {
    const state = normalize(input);
    const panel = state.panels.find(function (item) { return item.id === panelId; });
    if (panel && record(patch)) ['label', 'edge', 'size', 'share', 'mode', 'display', 'spaceBefore'].forEach(function (key) { if (own(patch, key)) panel[key] = patch[key]; });
    return normalize(state);
  }

  function updateWidget(input, widgetId, patch) {
    const state = normalize(input);
    if (own(state.widgets, widgetId) && record(patch)) ['mode', 'size'].forEach(function (key) { if (own(patch, key)) state.widgets[widgetId][key] = patch[key]; });
    return normalize(state);
  }

  function logicalItems(state, panel) {
    const ids = panel.widgets.filter(function (id) { return state.widgets[id].mode !== 'hidden'; });
    let lastMain = -1;
    ids.forEach(function (id, index) { if (['apps', 'files', 'assistant'].includes(id)) lastMain = index; });
    // Keep the user's sequence intact. The trailing system tools form the same
    // footer in both widths; native app/file/Assistant controls stay in main.
    return ids.map(function (id, index) { return {id: id, index: index, definition: definition(id), setting: state.widgets[id], section: index <= lastMain ? 'main' : 'footer'}; });
  }

  function measuredRange(overrides, id, vertical) {
    const raw = record(overrides) && own(overrides, id) ? overrides[id] : null;
    const axis = vertical ? 'vertical' : 'horizontal';
    const value = record(raw) && (own(raw, 'vertical') || own(raw, 'horizontal')) ? raw[axis] : raw;
    const valid = function (size) { return typeof size === 'number' && Number.isFinite(size) && size >= 0; };
    if (valid(value)) return {min: Math.min(1000000, value), preferred: Math.min(1000000, value)};
    if (!record(value) || (!valid(value.min) && !valid(value.preferred))) return null;
    const minimum = number(value.min, value.preferred, 0, 1000000);
    return {min: minimum, preferred: Math.max(minimum, number(value.preferred, minimum, 0, 1000000))};
  }

  function measuredSize(overrides, id, vertical) {
    const measurement = measuredRange(overrides, id, vertical);
    return measurement ? measurement.preferred : null;
  }

  function allocateCompactWidgets(state, panel, available, vertical, crossExtent, overrides) {
    const settings = record(overrides) ? overrides : {};
    const items = logicalItems(state, panel).map(function (item) {
      if (isSpacer(item.id)) return {id: item.id, section: item.section, view: 'spacer', min: 0, extent: 0, grow: 0};
      const compact = compactDefinitions[item.id];
      const raw = own(settings, item.id) ? settings[item.id] : null;
      const custom = record(raw) ? raw : {};
      const minimum = number(custom.minSize, compact.minSize, 0, 20000);
      const measured = measuredSize(settings, item.id, vertical);
      const natural = item.id === 'apps' && item.setting.size ? item.setting.size : compact[vertical ? 'vertical' : 'horizontal'];
      const extent = Math.max(minimum, measured === null ? natural : measured);
      const grow = item.section === 'main' && (!item.setting.size || measured !== null) ? number(custom.grow, compact.grow, 0, 10) : 0;
      return {id: item.id, section: item.section, view: compact.view, min: minimum, extent: extent, grow: grow};
    });
    const spacers = items.filter(function (item) { return item.view === 'spacer'; });
    // Fixed Quicklaunch/Background controls and one Parked cell must fit.
    // Further Parked tasks scroll inside the remaining live task viewport;
    // its preferred length must never turn the complete applet into an icon.
    const apps = items.find(function (item) { return item.view === 'apps'; });
    if (apps && apps.min + items.reduce(function (sum, item) { return sum + (item === apps ? 0 : item.min); }, 0) + Math.max(0, items.length - 1) * ICON_GAP > available) {
      apps.view = 'icon'; apps.extent = ICON; apps.min = 28; apps.grow = 0;
    }
    const minimum = items.reduce(function (sum, item) { return sum + item.min; }, 0);
    const gap = items.length > 1 ? Math.min(ICON_GAP, Math.max(0, (available - minimum) / (items.length - 1))) : 0;
    const gaps = Math.max(0, items.length - 1) * gap;
    const total = items.reduce(function (sum, item) { return sum + item.extent; }, gaps);
    if (minimum + gaps > available) {
      const ratio = minimum ? Math.max(0, available - gaps) / minimum : 0;
      items.forEach(function (item) { item.extent = item.min * ratio; });
    } else if (total > available) {
      let reduction = total - available;
      // Give up the optional Parked viewport before making the fixed tray
      // controls smaller. Quicklaunch and Background remain above apps.min.
      if (apps && apps.view === 'apps') {
        const flexible = Math.min(reduction, apps.extent - apps.min);
        apps.extent -= flexible;
        reduction -= flexible;
      }
      const reducible = items.reduce(function (sum, item) { return sum + Math.max(0, item.extent - item.min); }, 0);
      if (reducible) items.forEach(function (item) { item.extent -= reduction * Math.max(0, item.extent - item.min) / reducible; });
    } else if (spacers.length) {
      spacers.forEach(function (item) { item.extent = (available - total) / spacers.length; });
    } else {
      const grow = items.reduce(function (sum, item) { return sum + item.grow; }, 0);
      if (grow) items.forEach(function (item) { item.extent += (available - total) * item.grow / grow; });
    }
    const widgets = {};
    const footerIndex = items.findIndex(function (item) { return item.section === 'footer'; });
    const footerExtent = footerIndex < 0 ? 0 : items.slice(footerIndex).reduce(function (sum, item) { return sum + item.extent; }, Math.max(0, items.length - footerIndex - 1) * gap);
    const usedExtent = items.reduce(function (sum, item) { return sum + item.extent; }, gaps);
    let cursor = 0;
    items.forEach(function (item, index) {
      if (!spacers.length && index === footerIndex) cursor = Math.max(cursor, available - footerExtent);
      const extent = Math.max(0, Math.min(item.extent, available - cursor));
      const icon = item.view === 'icon';
      const cell = icon ? Math.min(ICON, extent, crossExtent) : 0;
      const mainOffset = cursor + (icon ? (extent - cell) / 2 : 0);
      const crossOffset = icon ? Math.max(0, (crossExtent - cell) / 2) : 0;
      const mainExtent = icon ? cell : extent;
      const crossSize = icon ? cell : crossExtent;
      widgets[item.id] = {x: vertical ? crossOffset : mainOffset, y: vertical ? mainOffset : crossOffset, width: vertical ? crossSize : mainExtent, height: vertical ? mainExtent : crossSize, offset: mainOffset, extent: mainExtent, mode: item.view === 'spacer' ? 'expanded' : 'compact', spacer: item.view === 'spacer', compactView: item.view === 'spacer' ? null : item.view, section: item.section, headerSize: 0};
      cursor = Math.min(available, cursor + extent + (index < items.length - 1 ? gap : 0));
    });
    return {widgets: widgets, spaces: [], contentExtent: cursor, unusedExtent: Math.max(0, available - usedExtent)};
  }

  function allocateWidgets(state, panel, compact, available, vertical, crossExtent, widgetHeaderSize, preferredWidget, compactSizes, widgetSizes) {
    if (compact) return allocateCompactWidgets(state, panel, Math.max(0, available), vertical, Math.max(0, crossExtent), compactSizes);
    available = Math.max(0, available);
    crossExtent = Math.max(0, crossExtent);
    const items = logicalItems(state, panel).map(function (item) {
      const measured = measuredRange(widgetSizes, item.id, vertical);
      return Object.assign(item, {mode: isSpacer(item.id) ? 'expanded' : item.setting.mode, measured: measured, priority: item.id === preferredWidget ? 100 : item.definition.grow * 10});
    });
    const spacers = items.filter(function (item) { return isSpacer(item.id); });
    function bandsFor() {
      const bands = [];
      items.forEach(function (item) {
        if (isSpacer(item.id)) {
          bands.push({kind: 'spacer', section: item.section, items: [item], headerSize: 0, min: 0, extent: 0, grow: 0});
        } else if (item.mode === 'compact') {
          let band = bands[bands.length - 1];
          if (!band || band.kind !== 'icons' || band.section !== item.section) { band = {kind: 'icons', section: item.section, items: []}; bands.push(band); }
          band.items.push(item);
        } else {
          const header = Math.min(widgetHeaderSize, vertical ? available : crossExtent);
          const overhead = vertical ? header : 0;
          // Measurements describe content, excluding the panel widget header.
          // Numbers keep whole content visible. A measured {min,preferred}
          // range allows Apps to reserve fixed controls while only its Parked
          // viewport shrinks. Stored widget preferences are left unchanged.
          const minimum = Math.max(item.definition.minSize, item.measured === null ? 0 : item.measured.min);
          const preferred = item.measured === null ? Math.max(minimum, item.setting.size || item.definition.preferredSize) : Math.max(minimum, item.measured.preferred);
          bands.push({kind: 'expanded', section: item.section, items: [item], headerSize: header, min: minimum + overhead, extent: preferred + overhead, grow: item.section === 'footer' || (item.setting.size && (item.id !== 'apps' || item.measured === null)) ? 0 : item.definition.grow, priority: item.priority});
        }
      });
      bands.forEach(function (band) {
        if (band.kind !== 'icons') return;
        band.cell = Math.min(ICON, crossExtent);
        band.columns = vertical ? Math.max(1, Math.floor((crossExtent + ICON_GAP) / (ICON + ICON_GAP))) : band.items.length;
        band.rows = vertical ? Math.ceil(band.items.length / band.columns) : 1;
        const count = vertical ? band.rows : band.items.length;
        band.extent = band.min = count * band.cell + Math.max(0, count - 1) * ICON_GAP;
        band.grow = 0;
      });
      return bands;
    }
    let bands = bandsFor();
    const totalMinimum = function () { return bands.reduce(function (sum, band) { return sum + band.min; }, Math.max(0, bands.length - 1) * GAP); };
    items.filter(function (item) { return item.mode === 'expanded' && !isSpacer(item.id); }).sort(function (a, b) {
      const impossible = function (item) { return Math.max(item.definition.minSize, item.measured ? item.measured.min : 0) + (vertical ? widgetHeaderSize : 0) > available ? 1 : 0; };
      return impossible(b) - impossible(a) || a.priority - b.priority || b.index - a.index;
    }).forEach(function (item) {
      if (totalMinimum() <= available) return;
      item.mode = 'compact';
      bands = bandsFor();
    });
    let gap = bands.length > 1 ? Math.min(GAP, available / (bands.length - 1)) : 0;
    const minimumSum = bands.reduce(function (sum, band) { return sum + band.min; }, 0);
    if (minimumSum + gap * Math.max(0, bands.length - 1) > available) gap = 0;
    const gaps = Math.max(0, bands.length - 1) * gap;
    const total = bands.reduce(function (sum, band) { return sum + band.extent; }, gaps);
    if (minimumSum + gaps > available) {
      const ratio = minimumSum ? Math.max(0, available - gaps) / minimumSum : 0;
      bands.forEach(function (band) { band.extent = band.min * ratio; });
    } else if (total > available) {
      const reduction = total - available;
      const reducible = bands.reduce(function (sum, band) { return sum + Math.max(0, band.extent - band.min); }, 0);
      if (reducible) bands.forEach(function (band) { band.extent -= reduction * Math.max(0, band.extent - band.min) / reducible; });
    } else if (spacers.length) {
      bands.filter(function (band) { return band.kind === 'spacer'; }).forEach(function (band) { band.extent = (available - total) / spacers.length; });
    } else {
      const grow = bands.reduce(function (sum, band) { return sum + band.grow; }, 0);
      if (grow) bands.forEach(function (band) { band.extent += (available - total) * band.grow / grow; });
    }
    const widgets = {};
    const usedExtent = bands.reduce(function (sum, band) { return sum + band.extent; }, gaps);
    const unusedExtent = Math.max(0, available - usedExtent);
    const footerStart = bands.findIndex(function (band) { return band.section === 'footer'; });
    const anchorFooter = !spacers.length && footerStart >= 0;
    const footerExtent = footerStart < 0 ? 0 : bands.slice(footerStart).reduce(function (sum, band) { return sum + band.extent; }, Math.max(0, bands.length - footerStart - 1) * gap);
    let cursor = 0;
    bands.forEach(function (band, bandIndex) {
      if (anchorFooter && bandIndex === footerStart) cursor = Math.max(cursor, available - footerExtent);
      const extent = Math.max(0, Math.min(band.extent, available - cursor));
      if (band.kind === 'expanded' || band.kind === 'spacer') {
        const item = band.items[0];
        const headerSize = Math.min(band.headerSize, vertical ? extent : crossExtent);
        widgets[item.id] = {x: vertical ? 0 : cursor, y: vertical ? cursor : 0, width: vertical ? crossExtent : extent, height: vertical ? extent : crossExtent, offset: cursor, extent: extent, mode: 'expanded', spacer: band.kind === 'spacer', section: item.section, headerSize: headerSize};
      } else {
        const mainCount = vertical ? band.rows : band.items.length;
        const iconGap = mainCount > 1 ? Math.min(ICON_GAP, Math.max(0, (extent - mainCount) / (mainCount - 1))) : 0;
        const cell = Math.max(0, Math.min(band.cell, (extent - Math.max(0, mainCount - 1) * iconGap) / Math.max(1, mainCount)));
        band.items.forEach(function (item, index) {
          const row = vertical ? Math.floor(index / band.columns) : 0;
          const column = vertical ? index % band.columns : index;
          const x = vertical ? column * (cell + ICON_GAP) : cursor + index * (cell + iconGap);
          const y = vertical ? cursor + row * (cell + iconGap) : Math.max(0, (crossExtent - cell) / 2);
          widgets[item.id] = {x: x, y: y, width: cell, height: cell, offset: vertical ? y : x, extent: cell, mode: 'compact', compactView: 'icon', section: item.section, headerSize: 0};
        });
      }
      cursor = Math.min(available, cursor + extent + (bandIndex < bands.length - 1 ? gap : 0));
    });
    return {widgets: widgets, spaces: [], contentExtent: cursor, unusedExtent: unusedExtent};
  }

  function layout(input, viewport) {
    const state = normalize(input);
    const options = record(viewport) ? viewport : {};
    const width = number(options.width, 1440, 1, 20000);
    const height = number(options.height, 900, 1, 20000);
    const headerSize = number(options.headerSize, 0, 0, 60);
    const widgetHeaderSize = number(options.widgetHeaderSize, 0, 0, 60);
    const footerSize = number(options.footerSize, 0, 0, 60);
    const compactToolboxSize = number(options.compactToolboxSize, 0, 0, 60);
    const displays = Math.round(number(options.displays, 1, 1, 8));
    const currentDisplay = Math.round(number(options.display, 1, 1, displays));
    const fullscreenDisplay = Math.round(number(options.fullscreenDisplay, 1, 1, displays));
    const groups = {left: [], right: [], top: [], bottom: []};
    state.panels.forEach(function (panel) {
      if (panel.mode === 'hidden') return;
      let display = panel.display <= displays ? panel.display : 1;
      if (options.fullscreen && display === fullscreenDisplay) {
        if (displays === 1) return;
        display = display % displays + 1;
      }
      if (display === currentDisplay) groups[panel.edge].push(panel);
    });
    const forcedCompact = {left: false, right: false, top: false, bottom: false};
    const compactThickness = function (side) { return side === 'left' || side === 'right' ? COMPACT : COMPACT + headerSize; };
    const compactFor = function (panel) { return panel.mode === 'compact' || forcedCompact[panel.edge]; };
    const requested = function (panel) { return compactFor(panel) ? compactThickness(panel.edge) : Math.max(panel.edge === 'left' || panel.edge === 'right' ? 160 : 100, panel.size); };
    const insets = {left: 0, right: 0, top: 0, bottom: 0};
    EDGES.forEach(function (side) { insets[side] = Math.max(0, ...groups[side].map(requested)); });
    function boundPair(first, second, extent, minimumCenter) {
      const sides = [first, second].filter(function (side) { return groups[side].length; });
      if (!sides.length) return;
      const available = Math.max(0, extent - minimumCenter);
      const total = insets[first] + insets[second];
      if (total <= available) return;
      const minimum = sides.reduce(function (sum, side) { return sum + (forcedCompact[side] || groups[side].every(function (panel) { return panel.mode === 'compact'; }) ? compactThickness(side) : first === 'left' ? 160 : 100); }, 0);
      if (available < minimum) {
        sides.forEach(function (side) { forcedCompact[side] = true; insets[side] = compactThickness(side); });
      } else {
        let remaining = available - minimum;
        const extra = total - minimum;
        sides.forEach(function (side) {
          const floor = forcedCompact[side] || groups[side].every(function (panel) { return panel.mode === 'compact'; }) ? compactThickness(side) : first === 'left' ? 160 : 100;
          insets[side] = floor + (extra > 0 ? remaining * (insets[side] - floor) / extra : 0);
        });
      }
      // On screens smaller than the requested central minimum, retain a visible center.
      const combined = insets[first] + insets[second];
      if (combined > extent - 1) {
        const scale = Math.max(0, extent - 1) / combined;
        insets[first] *= scale;
        insets[second] *= scale;
      }
    }
    boundPair('left', 'right', width, Math.min(300, Math.max(1, width - 2 * COMPACT)));
    boundPair('top', 'bottom', height, Math.min(220, Math.max(1, height - 2 * compactThickness('top'))));
    const panels = {};
    EDGES.forEach(function (side) {
      const vertical = side === 'left' || side === 'right';
      const group = groups[side];
      const axisLength = vertical ? Math.max(0, height - insets.top - insets.bottom) : width;
      const groupGap = group.length > 1 ? Math.min(GAP, axisLength / (group.length - 1)) : 0;
      const available = Math.max(0, axisLength - Math.max(0, group.length - 1) * groupGap);
      const shares = group.reduce(function (sum, panel) { return sum + panel.share; }, 0);
      let cursor = vertical ? insets.top : 0;
      group.forEach(function (panel) {
        const axisExtent = available * panel.share / shares;
        const thickness = Math.min(requested(panel), insets[side]);
        const compact = compactFor(panel);
        const frame = {
          x: vertical ? side === 'left' ? 0 : width - thickness : cursor,
          y: vertical ? cursor : side === 'top' ? 0 : height - thickness,
          width: vertical ? thickness : axisExtent,
          height: vertical ? axisExtent : thickness,
          edge: side,
          vertical: vertical,
          compact: compact,
          mode: compact ? 'compact' : 'expanded',
          bodyOffset: Math.min(headerSize, vertical ? axisExtent : thickness)
        };
        frame.bodyEnd = compact ? 0 : Math.min(footerSize, Math.max(0, frame.height - frame.bodyOffset));
        frame.toolboxSize = compact ? Math.min(compactToolboxSize, Math.max(0, axisExtent - (vertical ? frame.bodyOffset : 0))) : 0;
        const bodyHeight = Math.max(0, frame.height - frame.bodyOffset - frame.bodyEnd - (vertical ? frame.toolboxSize : 0));
        frame.bodyExtent = vertical ? bodyHeight : Math.max(0, frame.width - frame.toolboxSize);
        const crossExtent = vertical ? frame.width : bodyHeight;
        const contents = allocateWidgets(state, panel, compact, frame.bodyExtent, vertical, crossExtent, widgetHeaderSize, options.preferredWidget, options.compactSizes, options.widgetSizes);
        frame.widgets = contents.widgets;
        frame.spaces = contents.spaces;
        frame.contentExtent = contents.contentExtent;
        frame.unusedExtent = contents.unusedExtent;
        panels[panel.id] = frame;
        cursor += axisExtent + groupGap;
      });
    });
    return {panels: panels, insets: insets};
  }

  function resizeLimits(input, widgetId, viewport) {
    const state = normalize(input);
    const owner = state.panels.find(function (panel) { return panel.widgets.includes(widgetId); });
    const empty = {min: 0, max: 0, value: 0, panelId: owner ? owner.id : null, vertical: true, headerSize: 0, available: 0, visible: false, resizable: false, neighborId: null};
    if (!owner || !knownWidget(widgetId) || isSpacer(widgetId) || state.widgets[widgetId].mode === 'hidden') return empty;
    const rect = layout(state, viewport).panels[owner.id];
    const actual = rect && rect.widgets[widgetId];
    if (!actual) return empty;
    const headerSize = rect.vertical ? actual.headerSize : 0;
    const value = Math.max(0, (rect.vertical ? actual.height : actual.width) - headerSize);
    const result = {min: value, max: value, value: value, panelId: owner.id, vertical: rect.vertical, headerSize: headerSize, available: rect.bodyExtent, visible: true, resizable: actual.mode === 'expanded', neighborId: null};
    if (!result.resizable) return result;
    const active = owner.widgets.filter(function (id) { return state.widgets[id].mode !== 'hidden'; });
    const index = active.indexOf(widgetId);
    const neighborId = [active[index + 1], active[index - 1]].find(function (id) { return id && state.widgets[id].mode === 'expanded' && definition(id).grow > 0 && rect.widgets[id] && rect.widgets[id].mode === 'expanded'; });
    const neighbor = neighborId && rect.widgets[neighborId];
    const neighborHeader = neighbor && rect.vertical ? neighbor.headerSize : 0;
    const neighborValue = neighbor ? Math.max(0, (rect.vertical ? neighbor.height : neighbor.width) - neighborHeader) : 0;
    const neighborMin = neighborId ? definition(neighborId).minSize : 0;
    result.min = Math.min(value, definition(widgetId).minSize);
    result.max = Math.min(20000, value + (neighbor ? Math.max(0, neighborValue - neighborMin) : Math.max(0, rect.unusedExtent)));
    result.neighborId = neighborId || null;
    result.neighborValue = neighborValue;
    result.neighborMin = neighborMin;
    return result;
  }

  function resizeWidget(input, widgetId, requestedContentSize, viewport) {
    const state = normalize(input);
    if (!knownWidget(widgetId)) return state;
    if (requestedContentSize === 0) return updateWidget(state, widgetId, {size: 0});
    const limits = resizeLimits(state, widgetId, viewport);
    if (!limits.resizable || typeof requestedContentSize !== 'number' || !Number.isFinite(requestedContentSize)) return state;
    const size = Math.max(limits.min, Math.min(limits.max, requestedContentSize));
    state.widgets[widgetId].size = size;
    if (limits.neighborId) state.widgets[limits.neighborId].size = limits.neighborValue - (size - limits.value);
    return state;
  }

  return Object.freeze({catalog: catalog, definition: definition, isSpacer: isSpacer, addSpacer: addSpacer, removeSpacer: removeSpacer, compactDefinitions: compactDefinitions, definitions: Object.freeze(definitions), defaults: defaults, migrateDefaults: migrateDefaults, normalize: normalize, setSpace: setSpace, moveWidget: moveWidget, addPanel: addPanel, removePanel: removePanel, updatePanel: updatePanel, updateWidget: updateWidget, resizeWidget: resizeWidget, resizeLimits: resizeLimits, layout: layout});
});
