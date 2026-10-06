(() => {
  const themeButton = document.querySelector('#guideTheme');
  let savedTheme;
  try { savedTheme = localStorage.getItem('spatial-guide-theme'); } catch {}
  const setTheme = theme => {
    document.body.dataset.guideTheme = theme;
    themeButton.textContent = theme === 'light' ? 'Dark' : 'Light';
    themeButton.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} appearance`);
    document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#f4f7f9' : '#0c1218';
  };
  setTheme(savedTheme || (matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark'));
  themeButton.addEventListener('click', () => {
    const next = document.body.dataset.guideTheme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try { localStorage.setItem('spatial-guide-theme', next); } catch {}
  });
  const links = [...document.querySelectorAll('.guide-sidebar nav a')];
  const chapters = links.map(link => document.querySelector(link.hash));
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
