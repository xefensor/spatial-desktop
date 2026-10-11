/* Suspend decorative work while the page is hidden or the pointer is held. */
(function () {
  const root = document.documentElement;
  const release = () => root.removeAttribute('data-background-busy');
  const visibility = () => {
    root.toggleAttribute('data-page-hidden', document.hidden);
    if (document.hidden) release();
  };
  document.addEventListener('visibilitychange', visibility);
  document.addEventListener('pointerdown', () => root.setAttribute('data-background-busy', ''), {passive:true,capture:true});
  ['pointerup','pointercancel'].forEach(type => document.addEventListener(type, release, {passive:true,capture:true}));
  window.addEventListener('blur', release);
  visibility();
})();
