/* Local, action-level shortcut practice. Input adapters report completed
   actions; this model never observes keystrokes, documents or pointer paths. */
(function (root) {
  'use strict';
  const day = 86400000, maxRecords = 200;
  const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 160;
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const positive = (value, fallback) => Number.isSafeInteger(value) && value > 0 ? value : fallback;
  function create({saved, now = Date.now, mouseThreshold = 5, shortcutThreshold = 3, maxActive = 2, recentMs = 7 * day} = {}) {
    mouseThreshold = positive(mouseThreshold, 5);
    shortcutThreshold = positive(shortcutThreshold, 3);
    maxActive = Math.min(positive(maxActive, 2), maxRecords);
    recentMs = positive(recentMs, 7 * day);
    const clock = typeof now === 'function' ? now : Date.now;
    const time = () => {const value = clock(); return Number.isFinite(value) && value >= 0 ? value : Date.now();};
    const actions = new Map();
    let enabled = true;
    const quiet = action => {action.mouseUses = 0; action.shortcutUses = 0; action.teaching = false;};
    function expire(timestamp) {
      for (const action of actions.values()) {
        if (timestamp - action.lastUsed > recentMs) quiet(action);
      }
    }
    const count = (value, limit) => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, limit) : 0;
    if (object(saved) && (saved.version === 1 || saved.version === undefined)) {
      if (typeof saved.enabled === 'boolean') enabled = saved.enabled;
      if (object(saved.actions)) {
        const timestamp = time();
        const entries = Object.entries(saved.actions).filter(([id, value]) => validId(id) && object(value))
          .sort((a, b) => (Number(b[1].lastUsed) || 0) - (Number(a[1].lastUsed) || 0)).slice(0, maxRecords);
        let teaching = 0;
        for (const [id, value] of entries) {
          const action = {
            mouseUses: count(value.mouseUses, mouseThreshold),
            shortcutUses: count(value.shortcutUses, shortcutThreshold - 1),
            teaching: false,
            muted: value.muted === true,
            lastUsed: Number.isFinite(value.lastUsed) && value.lastUsed >= 0 ? Math.min(value.lastUsed, timestamp) : 0
          };
          if (!action.muted && value.teaching === true && timestamp - action.lastUsed <= recentMs && teaching < maxActive) {
            action.teaching = true; teaching++;
          } else action.shortcutUses = 0;
          actions.set(id, action);
        }
        expire(timestamp);
      }
    }
    function ensure(id, timestamp) {
      if (!actions.has(id)) {
        if (actions.size >= maxRecords) {
          // Keep explicit exclusions longest; ordinary observations are cheap
          // to relearn if a session creates an unusually large action catalog.
          const candidates = [...actions.entries()].sort((a, b) =>
            Number(a[1].muted) - Number(b[1].muted) || Number(a[1].teaching) - Number(b[1].teaching) || a[1].lastUsed - b[1].lastUsed);
          actions.delete(candidates[0][0]);
        }
        actions.set(id, {mouseUses: 0, shortcutUses: 0, teaching: false, muted: false, lastUsed: timestamp});
      }
      return actions.get(id);
    }
    function record(id, source) {
      const result = {show: false, learned: false};
      if (!enabled || !validId(id) || !['pointer', 'shortcut'].includes(source)) return result;
      const timestamp = time();
      expire(timestamp);
      if (actions.get(id)?.muted) return result;
      const action = ensure(id, timestamp);
      action.lastUsed = timestamp;
      if (source === 'shortcut') {
        if (action.teaching) {
          action.shortcutUses++;
          if (action.shortcutUses >= shortcutThreshold) {quiet(action); result.learned = true;}
        } else action.mouseUses = 0;
        return result;
      }
      if (!action.teaching) {
        if (action.mouseUses < mouseThreshold) {action.mouseUses++; return result;}
        const active = [...actions.values()].filter(value => value.teaching && !value.muted).length;
        if (active >= maxActive) return result;
        action.teaching = true;
      }
      result.show = true;
      return result;
    }
    function snapshot() {
      expire(time());
      return {version: 1, enabled, actions: Object.fromEntries([...actions].map(([id, action]) => [id, {...action}]))};
    }
    function setMuted(id, muted) {
      if (!validId(id)) return;
      const action = ensure(id, time());
      quiet(action);
      action.muted = Boolean(muted);
    }
    return {record, snapshot, setEnabled(value) {enabled = Boolean(value);}, setMuted, reset() {actions.clear();}};
  }
  const api = {create};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpatialShortcutLearning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
