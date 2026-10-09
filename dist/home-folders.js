(function (root) {
  'use strict';
  const standard = Object.freeze(['Desktop', 'Documents', 'Downloads', 'Music', 'Pictures', 'Videos', 'Templates', 'Public']);
  const join = (parent, child) => parent.replace(/\/+$/, '') + '/' + child;
  function home(profiles, workspace) {
    if (!profiles[workspace]?.home) throw new Error('Unknown workspace');
    return profiles[workspace].home;
  }
  function folder(profiles, workspace, name = 'Home') {
    const base = home(profiles, workspace);
    if (name === 'Home') return base;
    if (!standard.includes(name) && name !== 'Projects') throw new Error('Unknown Home folder');
    return join(base, name);
  }
  // Only download requests opt into the project path. Places always use Home.
  function downloadDestination(profiles, projects, workspace, owner) {
    const project = projects[owner];
    return project?.downloadToProject === true
      ? join(project.root, 'Downloads') : folder(profiles, workspace, 'Downloads');
  }
  function create(saved = {}) {
    let directories = new Set();
    let files = [];
    function load(value = {}) {
      directories = new Set((Array.isArray(value.directories) ? value.directories : []).filter(path => typeof path === 'string' && path.startsWith('/')));
      files = (Array.isArray(value.files) ? value.files : []).filter(file => file && typeof file.directory === 'string' && file.directory.startsWith('/') && typeof file.name === 'string' && file.name && !/[\\/]/.test(file.name) && file.name !== '.' && file.name !== '..').map(file => ({...file}));
      files.forEach(file => directories.add(file.directory));
    }
    const ensure = path => { directories.add(path); return path; };
    const list = path => files.filter(file => file.directory === path).map(file => ({...file}));
    function add(directory, requestedName, context = {}) {
      ensure(directory);
      const original = String(requestedName).replace(/[\\/\x00-\x1f]/g, '_').trim();
      const safe = !original || original === '.' || original === '..' ? 'download.txt' : original;
      const dot = safe.lastIndexOf('.');
      const stem = dot > 0 ? safe.slice(0, dot) : safe;
      const extension = dot > 0 ? safe.slice(dot) : '';
      let name = safe, suffix = 2;
      while (files.some(file => file.directory === directory && file.name === name)) name = stem + ' (' + suffix++ + ')' + extension;
      const file = {directory, name, workspace: context.workspace, project: context.project || null, source: context.source || '', content: context.content || '', savedAt: Date.now()};
      files.push(file);
      return {...file, path: join(directory, name)};
    }
    load(saved);
    return {load, ensure, list, add, snapshot: () => ({directories: [...directories], files: files.map(file => ({...file}))})};
  }
  const api = {standard, home, folder, downloadDestination, create};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpatialHomeFolders = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
