/* Intent-driven docking: rendered tile positions never drive this policy. */
(function(root) {
  function minimumTree(node, minimum) {
    if (!node) return { width: 0, height: 0 };
    if (node.kind === "window") return minimum(node.name);
    const a = minimumTree(node.a, minimum), b = minimumTree(node.b, minimum);
    return node.axis === "x"
      ? { width: a.width + b.width + 8, height: Math.max(a.height, b.height) }
      : { width: Math.max(a.width, b.width), height: a.height + b.height + 8 };
  }
  function plan({ areas, displays, windows, demands, railSize = 70 }) {
    const moves = {}, rails = {}, overlays = {}, hidden = {}, canvas = {};
    const assigned = area => moves[area.name] || area.display;
    const laneSize = (group, edge) => {
      const lane = group.filter(area => area.edge === edge);
      return lane.length ? Math.max(...lane.map(area => rails[area.name] ? railSize : area.size)) : 0;
    };
    function fits(slot, group) {
      const display = displays.find(item => item.slot === slot);
      if (!display || demands.some(item => item.display === slot && item.fullscreen)) return false;
      const sizes = Object.fromEntries(["left", "right", "top", "bottom"].map(edge => [edge, laneSize(group, edge)]));
      const min = display.minimum || { width: 0, height: 0 };
      if (display.width - sizes.left - sizes.right - 16 < min.width || display.height - sizes.top - sizes.bottom - 16 < min.height) return false;
      return !windows.some(item => item.display === slot && item.floating && !item.fullscreen && (
        (sizes.left && item.rect.left < sizes.left) ||
        (sizes.right && item.rect.left + item.rect.width > display.width - sizes.right) ||
        (sizes.top && item.rect.top < sizes.top) ||
        (sizes.bottom && item.rect.top + item.rect.height > display.height - sizes.bottom)
      ));
    }
    for (const demand of demands) {
      for (const edge of demand.edges) {
        const group = areas.filter(area => area.display === demand.display && area.edge === edge && !demand.exclude?.includes(area.name));
        if (!group.length) continue;
        let target = displays.find(display => display.slot !== demand.display && fits(display.slot,
          areas.filter(area => assigned(area) === display.slot).concat(group)));
        if (!target) {
          group.forEach(area => { rails[area.name] = true; });
          target = displays.find(display => display.slot !== demand.display && fits(display.slot,
            areas.filter(area => assigned(area) === display.slot).concat(group)));
        }
        if (target) group.forEach(area => { moves[area.name] = target.slot; });
        else group.forEach(area => {
          rails[area.name] = true;
          if (demand.fullscreen) hidden[area.name] = true;
          else if (demand.overlayEdges?.includes(edge)) overlays[area.name] = true;
        });
      }
    }
    for (const display of displays) {
      const group = areas.filter(area => assigned(area) === display.slot && !hidden[area.name]);
      const hasWindows = windows.some(item => item.display === display.slot);
      if (!hasWindows && group.length > 1 && group.some(area => moves[area.name])) canvas[display.slot] = group.map(area => area.name);
    }
    return { moves, rails, overlays, hidden, canvas };
  }
  const api = { minimumTree, plan };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SpatialIntent = api;
})(typeof window !== "undefined" ? window : globalThis);
