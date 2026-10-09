(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  function create(saved = {}) {
    let spaces = {};
    function load(value = {}) { spaces = clone(value && typeof value === 'object' ? value : {}); }
    function get(workspace, id, seed) {
      spaces[workspace] ||= {};
      return spaces[workspace][id] ||= clone(typeof seed === 'function' ? seed() : seed);
    }
    function copy(fromWorkspace, fromId, toWorkspace, toId) {
      if (!spaces[fromWorkspace]?.[fromId]) return;
      spaces[toWorkspace] ||= {};
      spaces[toWorkspace][toId] = clone(spaces[fromWorkspace][fromId]);
    }
    load(saved);
    return {get, copy, load, snapshot: () => clone(spaces)};
  }
  const navigation = initial => ({items: [clone(initial)], index: 0});
  const current = nav => nav.items[nav.index];
  function visit(nav, value) {
    if (JSON.stringify(current(nav)) === JSON.stringify(value)) return current(nav);
    nav.items.splice(nav.index + 1);
    nav.items.push(clone(value));
    if (nav.items.length > 60) nav.items.shift();
    nav.index = nav.items.length - 1;
    return current(nav);
  }
  function go(nav, delta) {
    nav.index = Math.max(0, Math.min(nav.items.length - 1, nav.index + delta));
    return current(nav);
  }
  function resolvePath(value, cwd, home) {
    const raw = value === '~' ? home : value.startsWith('~/') ? home + value.slice(1) : value.startsWith('/') ? value : cwd + '/' + value;
    const parts = [];
    raw.split('/').forEach(part => { if (part === '..') parts.pop(); else if (part && part !== '.') parts.push(part); });
    return '/' + parts.join('/');
  }
  function terminal(command, cwd, context) {
    const trimmed = command.trim();
    const verb = trimmed.split(/\s/)[0];
    const rawArgs = trimmed.slice(verb.length).trim();
    const args = /^(".*"|'.*')$/.test(rawArgs) ? rawArgs.slice(1,-1) : rawArgs;
    const result = output => ({cwd, output, clear: false});
    if (verb === 'clear') return {cwd, output: '', clear: true};
    if (verb === 'help') return result('Demo shell: pwd, ls [folder], cd [folder], echo [text], date, clear\nUp / Down: command history · Ctrl+L: clear screen\nCommands operate on this prototype’s files.');
    if (verb === 'pwd') return result(cwd);
    if (verb === 'date') return result(new Date().toLocaleString('en-GB'));
    if (verb === 'echo') return result(args.replace(/\$(?:\{(HOME|XDG_[A-Z]+_DIR)\}|(HOME|XDG_[A-Z]+_DIR))/g, (match, braced, plain) => {
      const name = braced || plain;
      return name === 'HOME' ? context.home : context.environment?.[name] || match;
    }));
    if (verb === 'cd' || verb === 'ls') {
      const target = resolvePath(args || (verb === 'cd' ? context.home : cwd), cwd, context.home);
      if (!context.exists(target)) return result(verb + ': no such folder: ' + target);
      if (verb === 'cd') return {cwd: target, output: '', clear: false};
      return result(context.list(target).join('\n') || '(empty folder)');
    }
    if (trimmed === 'git status') return result('Demo repository · native Git is not running in this prototype.');
    return result('command not found: ' + verb + '\nType help for available demo commands.');
  }
  function addNote(state) {
    const id = 'note-' + (++state.sequence);
    state.notes.push({id, title: 'Untitled ' + state.sequence, text: ''});
    state.active = id;
    return state.notes.at(-1);
  }
  const activeNote = state => state.notes.find(note => note.id === state.active) || state.notes[0];
  const words = text => (String(text).trim().match(/\S+/g) || []).length;
  function musicStep(state, delta = 1) {
    if (!state.tracks.length) return;
    state.index = (state.index + delta + state.tracks.length) % state.tracks.length;
    state.position = 0;
  }
  function musicTick(state) {
    if (!state.playing || !state.tracks.length) return;
    state.position += 1;
    if (state.position >= state.tracks[state.index].duration) musicStep(state);
  }
  const api = {create, navigation, current, visit, go, resolvePath, terminal, addNote, activeNote, words, musicStep, musicTick};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpatialAppTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
