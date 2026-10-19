/* Browser-only Super alternative. Hold F2, then use the same keys or wheel. */
(function () {
  'use strict';
  let held = false;
  const isKey = event => event.key === 'F2';
  const reset = () => { held = false; };
  const api = { held: () => held, isKey, cancel(){reset();api.onCancel?.();} };
  globalThis.SpatialDemoSuper = api;
  document.addEventListener('keydown', event => {
    if (!isKey(event)) return;
    if (!event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) held = true;
    if (held) event.preventDefault();
  }, true);
  document.addEventListener('keyup', event => {
    if (isKey(event)) { if (held) event.preventDefault(); reset(); }
  }, true);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
})();
