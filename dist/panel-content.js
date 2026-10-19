/* Native widget sources retain the original live controls, models and IDs. */
(function (root) {
  'use strict';

  const catalog = [
    { id: 'apps', label: 'Apps', kind: 'widget', selector: '[data-widget-source="apps"]', scope: 'Workspace' },
    { id: 'launcher', label: 'Overview', selector: '#allAppsToggle', scope: 'Workspace' },
    { id: 'files', label: 'Files', kind: 'widget', selector: '[data-widget-source="files"]', scope: 'Workspace / project' },
    { id: 'assistant', label: 'Assistant', kind: 'widget', selector: '[data-widget-source="assistant"]', scope: 'Workspace / project' },
    { id: 'calendar', label: 'Calendar', selector: '.system-agenda-stack', scope: 'Workspace' },
    { id: 'notifications', label: 'Notifications', selector: '#notificationWidget', scope: 'Workspace' },
    { id: 'clipboard', label: 'Clipboard', selector: '#desktopClipboardWidget', scope: 'Workspace' },
    { id: 'focus', label: 'Focus timer', selector: '.system-focus-controls', scope: 'Workspace' },
    { id: 'clock', label: 'Clock', selector: '.time-block', scope: 'System' },
    { id: 'controls', label: 'System controls', selector: '.quick-settings', scope: 'System' },
    { id: 'devices', label: 'Connected devices', selector: '.system-device-details', scope: 'System' },
    { id: 'requests', label: 'Pending requests', selector: '.system-desktop-requests', scope: 'Desktop' },
    { id: 'project-plans', label: 'Project plans', selector: '.system-project-plan', scope: 'Project' },
    { id: 'workspace-alerts', label: 'Other alerts', selector: '#workspaceNotificationsWidget', scope: 'Other Workspaces / system' }
  ];
  const instances = new WeakMap();

  function preserveContentActions(document, registry) {
    const apps = registry.get('apps')?.source;
    for (const id of ['appsQuickLaunchScope', 'parkedScope']) document.querySelector('#' + id)?.classList.add('panel-secondary-copy');
    const parkedCount = document.querySelector('#miniCount');
    const syncParked = () => { if (apps) apps.dataset.panelParkedEmpty = String(!(Number(parkedCount?.textContent) || 0)); };
    syncParked();
    if (parkedCount && typeof root.MutationObserver === 'function') new root.MutationObserver(syncParked).observe(parkedCount, { childList: true, subtree: true });

    const files = registry.get('files')?.source;
    const projectControls = files?.querySelector('.file-project-actions-source');
    const toolbar = files?.querySelector('#workingMemory .memory-toolbar');
    const browse = files?.querySelector('#workingMemory .memory-browse');
    const projectActions = [
      [projectControls?.querySelector('#manageProjectButton'), 'Manage project'],
      [projectControls?.querySelector('[data-open-package="project"]'), 'Pack project'],
      [projectControls?.querySelector('#closeProjectButton'), 'Close project']
    ].filter(([control]) => control);
    if (toolbar && browse) {
      const details = document.createElement('details');
      details.className = 'panel-file-actions';
      const summary = document.createElement('summary');
      summary.textContent = 'Actions';
      summary.setAttribute('aria-label', 'File and project actions');
      const menu = document.createElement('div');
      menu.className = 'panel-file-actions-menu';
      const projectGroup = document.createElement('div');
      projectGroup.className = 'panel-file-project-actions';
      projectGroup.setAttribute('role', 'group');
      projectGroup.setAttribute('aria-label', 'Project actions');
      for (const [control, label] of projectActions) {
        const text = document.createElement('span');
        text.textContent = label;
        control.append(text);
        projectGroup.append(control);
      }
      toolbar.append(projectGroup);
      projectControls?.remove?.();
      menu.append(toolbar);
      details.append(summary, menu);
      browse.append(details);
      const syncAvailability = () => {
        projectGroup.hidden = projectActions.every(([control]) => control.disabled);
      };
      syncAvailability();
      if (typeof root.MutationObserver === 'function') {
        const observer = new root.MutationObserver(syncAvailability);
        for (const [control] of projectActions) observer.observe(control, { attributes: true, attributeFilter: ['disabled'] });
      }
      // Move the original toolbar as a unit: native file pickers, note actions
      // and later New folder insertions keep their delegated source handlers.
      details.addEventListener('click', event => {
        if (event.target.closest('button')) details.open = false;
      }, true);
    }
    const facets = files?.querySelector('.memory-facets');
    const facetBody = facets?.querySelector('div');
    const type = files?.querySelector('[data-memory-filter]');
    if (facets && facetBody && type) {
      const label = document.createElement('label');
      label.className = 'panel-file-type-filter';
      label.textContent = 'Show';
      label.append(type);
      facetBody.insertBefore(label, facetBody.firstElementChild);
      const pinned = document.createElement('small');
      pinned.className = 'panel-file-pinned-state';
      pinned.textContent = ' · Pinned';
      facets.querySelector('summary')?.append(pinned);
      const syncPinned = () => { pinned.hidden = type.value !== 'pinned'; };
      type.addEventListener('change', syncPinned);
      facets.addEventListener('click', event => {
        if (event.target.closest('[data-history-reset]')) { type.value = 'all'; syncPinned(); }
      }, true);
      syncPinned();
      const count = facets.querySelector('[data-facet-count]');
      if (count && typeof root.MutationObserver === 'function') new root.MutationObserver(syncPinned).observe(count, { childList: true, subtree: true });
    }
    const assistant = registry.get('assistant')?.source;
    const displayControl = assistant?.querySelector('[data-display-control]');
    const permission = displayControl?.querySelector('.display-assistant-permission');
    const permissionScope = displayControl?.querySelector('.display-permission-scope');
    if (displayControl && permission && permissionScope) {
      const details = document.createElement('details');
      details.className = 'panel-assistant-access';
      const summary = document.createElement('summary');
      const label = document.createElement('span');
      label.className = 'panel-assistant-access-label';
      label.textContent = 'Display access';
      const state = document.createElement('strong');
      state.className = 'panel-assistant-access-state';
      state.setAttribute('aria-live', 'polite');
      summary.append(label, state);
      details.append(summary, permission, permissionScope);
      displayControl.insertBefore(details, displayControl.firstElementChild);
      const syncPermission = () => {
        const allowed = Boolean(permission.querySelector('[data-display-assistant-allowed]')?.checked);
        const value = allowed ? 'Allowed' : 'Off';
        if (state.textContent !== value) state.textContent = value;
        details.dataset.allowed = String(allowed);
      };
      syncPermission();
      if (typeof root.MutationObserver === 'function') new root.MutationObserver(syncPermission).observe(displayControl, { attributes: true, attributeFilter: ['data-control'] });
    }
    const emptyHint = assistant?.querySelector('.ai-empty small');
    if (emptyHint) emptyHint.textContent = 'Ask a question or drop a file here.';
    const notice = assistant?.querySelector('#aiDemoNotice');
    if (notice) { notice.textContent = 'Local scripted demo'; notice.title = 'No AI service is connected.'; }
    const folderLabel = assistant?.querySelector('.ai-folder label');
    if (folderLabel) folderLabel.textContent = 'Save to';
    const chatOptions = assistant?.querySelector('.ai-chat-settings > summary');
    if (chatOptions) { chatOptions.setAttribute('aria-label', 'Chat and file options'); chatOptions.title = 'Chat and file options'; }
  }

  function create(document = root.document) {
    if (!document) return new Map();
    if (instances.has(document)) return instances.get(document);
    const select = selector => document.querySelector(selector);
    const systemSources = select('[data-widget-source="system"]');
    const registry = new Map();
    const text = (selector, fallback = '') => (select(selector)?.textContent || fallback).replace(/\s+/g, ' ').trim();
    const summaries = {
      apps: () => text('#miniCount', '0') + ' parked',
      files: () => text('#projectAreaContext', 'Workspace files'),
      assistant: () => text('#aiAreaContext', 'Assistant'),
      calendar: () => text('#systemAgendaTitle', 'No upcoming plans'),
      notifications: () => text('#notificationCount', '0') + ' notifications',
      clipboard: () => text('.desktop-clipboard-context', 'Workspace clipboard'),
      focus: () => select('#timerWidget')?.hidden ? 'Start a focus session' : text('#timerValue', '25:00') + ' · ' + text('#timerState', 'Ready'),
      clock: () => text('.time-block .live-time') + ' · ' + text('#dateLabel'),
      controls: () => text('[data-system-network-status]', 'Devices & session'),
      devices: () => text('.system-device-details .device-row b', 'Connected devices'),
      requests: () => {
        const count = select('.system-desktop-requests')?.querySelectorAll('[data-system-request]').length || 0;
        return count ? count + ' pending ' + (count === 1 ? 'request' : 'requests') : 'No pending requests';
      },
      'project-plans': () => text('#systemProjectAgendaTitle', 'No upcoming project plans'),
      'workspace-alerts': () => {
        const workspaces = select('#workspaceNotificationBadges')?.querySelectorAll('button').length || 0;
        const alerts = Number(text('#systemWideNotificationCount', '0')) || 0;
        return workspaces + ' other ' + (workspaces === 1 ? 'Workspace' : 'Workspaces') + ' · ' + alerts + ' system alerts';
      }
    };
    const badges = {
      notifications: () => Number(text('#notificationCount', '0')) || 0,
      requests: () => select('.system-desktop-requests')?.querySelectorAll('[data-system-request]').length || 0,
      'workspace-alerts': () => Array.from(select('#workspaceNotificationBadges')?.querySelectorAll('button small') || []).reduce((sum, node) => sum + (Number(node.textContent) || 0), 0) + (Number(text('#systemWideNotificationCount', '0')) || 0)
    };
    for (const definition of catalog) {
      const source = select(definition.selector);
      if (!source) continue;
      source.dataset.widgetSource = definition.id;
      const nodes = [source];
      if (definition.id === 'controls') {
        const shortcuts = select('.desktop-system-shortcuts');
        const settings = systemSources?.querySelector('[data-open-settings]');
        const context = systemSources?.querySelector('#systemAreaContext');
        if (shortcuts) nodes.push(shortcuts);
        if (settings) nodes.push(settings);
        if (context) nodes.push(context);
      }
      if (definition.id === 'workspace-alerts') {
        const systemAlerts = select('#systemWideNotificationWidget');
        if (systemAlerts) nodes.push(systemAlerts);
      }
      registry.set(definition.id, {
        nodes,
        label: definition.label,
        kind: definition.kind || 'system',
        source,
        sourceMetadata: { selector: definition.selector, scope: definition.scope },
        summary: summaries[definition.id],
        badge: badges[definition.id]
      });
    }
    preserveContentActions(document, registry);

    instances.set(document, registry);
    return registry;
  }

  const api = { create, catalog: catalog.map(item => ({ ...item })) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpatialPanelContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
