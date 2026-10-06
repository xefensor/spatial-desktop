/* Spatial Desktop: bounded, recursive window splits. No canvas zoom, no
   viewport transforms, and no remounting app content. */
(function (root) {
  "use strict";
  const gap = 8;
  const copy = value => value ? JSON.parse(JSON.stringify(value)) : null;
  const leaf = name => ({ kind: "window", name });
  const names = node => !node ? [] : node.kind === "window" ? [node.name] : names(node.a).concat(names(node.b));
  const contains = (node, name) => names(node).includes(name);

  function normalize(node, allowed, seen = new Set(), depth = 0) {
    if (!node || depth > 24) return null;
    if (node.kind === "window") {
      if (!allowed.includes(node.name) || seen.has(node.name)) return null;
      seen.add(node.name);
      return leaf(node.name);
    }
    if (node.kind !== "split") return null;
    const a = normalize(node.a, allowed, seen, depth + 1);
    const b = normalize(node.b, allowed, seen, depth + 1);
    if (!a || !b) return a || b;
    return { kind: "split", axis: node.axis === "y" ? "y" : "x", ratio: Math.max(.001, Math.min(.999, Number(node.ratio) || .5)), a, b };
  }

  function remove(node, name) {
    if (!node) return null;
    if (node.kind === "window") return node.name === name ? null : node;
    const a = remove(node.a, name), b = remove(node.b, name);
    return a && b ? { ...node, a, b } : a || b;
  }

  function layout(node, bounds, path = [], result = { windows: new Map(), splits: [] }) {
    if (!node) return result;
    if (node.kind === "window") {
      result.windows.set(node.name, { ...bounds });
      return result;
    }
    const vertical = node.axis === "x";
    const extent = vertical ? bounds.width : bounds.height;
    const spacing = Math.min(gap, Math.max(0, extent - 2));
    const available = Math.max(0, extent - spacing);
    const first = Math.round(available * node.ratio);
    const a = { ...bounds, [vertical ? "width" : "height"]: first };
    const b = { ...bounds, [vertical ? "x" : "y"]: bounds[vertical ? "x" : "y"] + first + spacing, [vertical ? "width" : "height"]: available - first };
    result.splits.push({ path: node.sourcePath || path, axis: node.axis, bounds: { ...bounds }, coordinate: bounds[vertical ? "x" : "y"] + first + spacing / 2 });
    layout(node.a, a, path.concat("a"), result);
    layout(node.b, b, path.concat("b"), result);
    return result;
  }

  function at(node, path) { return path.reduce((current, key) => current?.[key], node); }
  function pathTo(node, name, path = []) {
    if (!node) return null;
    if (node.kind === "window") return node.name === name ? path : null;
    return pathTo(node.a, name, path.concat("a")) || pathTo(node.b, name, path.concat("b"));
  }
  function replace(node, target, replacement) {
    if (node.kind === "window") return node.name === target ? replacement : node;
    return { ...node, a: replace(node.a, target, replacement), b: replace(node.b, target, replacement) };
  }
  function insert(node, name, target, side, bounds, minimum, placed = null) {
    node = remove(node, name);
    if (!node) return leaf(name);
    const rects = layout(node, bounds).windows;
    placed?.forEach((rect, existing) => { if (rects.has(existing)) rects.set(existing,rect); });
    if (!rects.has(target)) target = names(node)[0];
    if (!side) {
      const feasible = [...rects].filter(([existing, rect]) => {
        const oldMin = minimum(existing), newMin = minimum(name);
        return rect.width >= oldMin.width + newMin.width + gap && rect.height >= Math.max(oldMin.height, newMin.height)
          || rect.height >= oldMin.height + newMin.height + gap && rect.width >= Math.max(oldMin.width, newMin.width);
      });
      if (feasible.length && !feasible.some(([existing]) => existing === target)) {
        target = feasible.sort((a, b) => b[1].width * b[1].height - a[1].width * a[1].height)[0][0];
      }
      const rect = rects.get(target), oldMin = minimum(target), newMin = minimum(name);
      const horizontalFit = Math.min(rect.width / (oldMin.width + newMin.width + gap), rect.height / Math.max(oldMin.height, newMin.height));
      const verticalFit = Math.min(rect.height / (oldMin.height + newMin.height + gap), rect.width / Math.max(oldMin.width, newMin.width));
      side = horizontalFit >= verticalFit ? "right" : "bottom";
    }
    const before = side === "left" || side === "top";
    const axis = side === "left" || side === "right" ? "x" : "y";
    return replace(node, target, { kind: "split", axis, ratio: .5, a: leaf(before ? name : target), b: leaf(before ? target : name) });
  }

  function fit(node, bounds, minimum, protectedName, priority = () => 0) {
    const parked = [];
    while (names(node).length > 1) {
      const rects = layout(node, bounds).windows;
      const failing = [...rects].filter(([name, rect]) => rect.width < minimum(name).width - 1 || rect.height < minimum(name).height - 1);
      if (!failing.length) break;
      const protectedPath = pathTo(node, protectedName) || [];
      const candidates = names(node).filter(name => name !== protectedName);
      candidates.sort((a, b) => {
        /* Prefer removing a squeezed sibling of the protected window; then
           use recency. Never sacrifice the window the user is manipulating. */
        const distance = name => {
          const path = pathTo(node, name) || [];
          let shared = 0;
          while (shared < path.length && path[shared] === protectedPath[shared]) shared += 1;
          return shared;
        };
        const squeezed = name => failing.some(([item]) => item === name) ? 1 : 0;
        return squeezed(b) - squeezed(a) || distance(b) - distance(a) || priority(a) - priority(b);
      });
      const victim = candidates[0];
      if (!victim) break;
      parked.push(victim);
      node = remove(node, victim);
    }
    return { node, parked, ...layout(node, bounds) };
  }

  // Carve non-overlapping rectangular lanes around fixed floating windows.
  // Try both cut directions: one may keep a useful full-height lane, while
  // the other gives an app usable space above or below the obstacle.
  function freePartitions(bounds, obstacles) {
    let variants = [[{ ...bounds }]];
    for (const obstacle of obstacles) {
      const next = new Map();
      for (const regions of variants) for (const vertical of [false, true]) {
        const carved = regions.flatMap(rect => {
          const x = Math.max(rect.x, obstacle.x), y = Math.max(rect.y, obstacle.y);
          const right = Math.min(rect.x + rect.width, obstacle.x + obstacle.width);
          const bottom = Math.min(rect.y + rect.height, obstacle.y + obstacle.height);
          if (right <= x || bottom <= y) return [rect];
          return (vertical ? [
            {x:rect.x, y:rect.y, width:x-rect.x, height:rect.height},
            {x:right, y:rect.y, width:rect.x+rect.width-right, height:rect.height},
            {x, y:rect.y, width:right-x, height:y-rect.y},
            {x, y:bottom, width:right-x, height:rect.y+rect.height-bottom}
          ] : [
            {x:rect.x, y:rect.y, width:rect.width, height:y-rect.y},
            {x:rect.x, y:bottom, width:rect.width, height:rect.y+rect.height-bottom},
            {x:rect.x, y, width:x-rect.x, height:bottom-y},
            {x:right, y, width:rect.x+rect.width-right, height:bottom-y}
          ]).filter(region => region.width > 0 && region.height > 0);
        }).sort((a,b) => a.x-b.x || a.y-b.y || a.width-b.width);
        next.set(JSON.stringify(carved), carved);
      }
      variants = [...next.values()].slice(0, 32);
    }
    return variants;
  }

  function projectTree(node, wanted, path = []) {
    if (!node) return null;
    if (node.kind === "window") return wanted.has(node.name) ? leaf(node.name) : null;
    const a = projectTree(node.a, wanted, path.concat("a"));
    const b = projectTree(node.b, wanted, path.concat("b"));
    return a && b ? {...node, a, b, sourcePath:path} : a || b;
  }

  function fitAvoiding(node, bounds, minimum, protectedName, priority = () => 0, obstacles = []) {
    const blocked = obstacles.filter(rect => [rect.x,rect.y,rect.width,rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0)
      .map(rect => ({x:rect.x-gap, y:rect.y-gap, width:rect.width+gap*2, height:rect.height+gap*2}))
      .filter(rect => rect.x < bounds.x+bounds.width && rect.x+rect.width > bounds.x && rect.y < bounds.y+bounds.height && rect.y+rect.height > bounds.y);
    if (!node || !blocked.length) return fit(node, bounds, minimum, protectedName, priority);
    const ordered = names(node).sort((a,b) => Number(b === protectedName)-Number(a === protectedName) || priority(b)-priority(a));
    const ideal = layout(node, bounds).windows;
    let best = null;
    for (const regions of freePartitions(bounds, blocked)) {
      const groups = regions.map(() => []), cache = new Map();
      const viable = (index, group) => {
        const key = index + ":" + group.slice().sort().join(",");
        if (cache.has(key)) return cache.get(key);
        const projected = projectTree(node, new Set(group));
        const placed = layout(projected, regions[index]);
        const works = [...placed.windows].every(([name,rect]) => rect.width >= minimum(name).width-1 && rect.height >= minimum(name).height-1);
        cache.set(key, works);
        return works;
      };
      const visit = (index, kept) => {
        if (best && kept.length + ordered.length-index < best.kept.length) return;
        if (index === ordered.length) {
          let area = 0, distance = 0;
          groups.forEach((group,i) => {
            if (!group.length) return;
            area += regions[i].width*regions[i].height;
            layout(projectTree(node,new Set(group)),regions[i]).windows.forEach((rect,name) => {
              const old = ideal.get(name);
              distance += Math.hypot(rect.x+rect.width/2-old.x-old.width/2, rect.y+rect.height/2-old.y-old.height/2);
            });
          });
          const recency = kept.reduce((sum,name) => sum + (ordered.length-ordered.indexOf(name)),0);
          const score = kept.length*1e9 + Number(kept.includes(protectedName))*1e7 + recency*1e5 + area/Math.max(1,bounds.width*bounds.height)*1000 - distance*.01;
          if (!best || score > best.score) best = {score, kept:[...kept], groups:groups.map(group=>[...group]), regions};
          return;
        }
        const name = ordered[index];
        const options = regions.map((rect,i)=>i).filter(i=>viable(i,groups[i].concat(name)))
          .sort((a,b)=>regions[b].width*regions[b].height-regions[a].width*regions[a].height);
        for (const i of options) {
          groups[i].push(name);
          visit(index+1,kept.concat(name));
          groups[i].pop();
        }
        visit(index+1,kept);
      };
      visit(0,[]);
    }
    const kept = best?.kept || [];
    const fittedNode = normalize(node,kept);
    const result = {node:fittedNode, parked:ordered.filter(name=>!kept.includes(name)), windows:new Map(), splits:[], avoiding:true};
    best?.groups.forEach((group,i) => {
      if (!group.length) return;
      // Paths refer to the persisted tree, not to a temporary region subtree.
      layout(projectTree(fittedNode,new Set(group)),best.regions[i],[],result);
    });
    return result;
  }

  function resizeWindow(node, name, axis, delta, bounds, placed = null) {
    const path = pathTo(node, name);
    if (!path) return node;
    const next = copy(node);
    const windowRect = (placed || layout(next, bounds)).windows.get(name);
    for (let depth = path.length - 1; depth >= 0; depth -= 1) {
      const split = at(next, path.slice(0, depth));
      if (split.axis !== axis) continue;
      const visibleSplit = placed?.splits.find(item => item.axis === axis && JSON.stringify(item.path) === JSON.stringify(path.slice(0,depth)));
      if (placed && !visibleSplit) continue;
      const side = path[depth];
      const fraction = side === "a" ? split.ratio : 1 - split.ratio;
      const extent = windowRect[axis === "x" ? "width" : "height"];
      const nextFraction = visibleSplit ? fraction + delta / Math.max(1,visibleSplit.bounds[axis === "x" ? "width" : "height"]-gap) : fraction * (1 + delta / Math.max(1, extent));
      split.ratio = Math.max(.001, Math.min(.999, side === "a" ? nextFraction : 1 - nextFraction));
      break;
    }
    return next;
  }
  const api = { gap, copy, leaf, names, contains, normalize, remove, layout, at, pathTo, insert, fit, fitAvoiding, resizeWindow };
  root.SpatialTiling = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
