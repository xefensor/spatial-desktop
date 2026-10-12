(() => {
  const themeButton = document.querySelector('#guideTheme');
  // Use the same preference, system listener and cross-tab sync as the desktop.
  const theme = window.SpatialDesktopTheme;
  if (theme && themeButton) {
    theme.bind(themeButton);
    themeButton.addEventListener('click', () => theme.next());
  }
  const links = [...document.querySelectorAll('.guide-sidebar nav a')];
  const chapters = links.map(link => document.querySelector(link.hash)).filter(Boolean);
  if (!chapters.length) return;
  let pending = false;
  const updateChapter = () => {
    pending = false;
    let current = chapters[0];
    for (const chapter of chapters) if (chapter.getBoundingClientRect().top <= 150) current = chapter;
    links.forEach(link => {
      if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };
  window.addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(updateChapter); }
  }, {passive:true});
  updateChapter();
})();
