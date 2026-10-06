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
    result.splits.push({ path, axis: node.axis, bounds: { ...bounds }, coordinate: bounds[vertical ? "x" : "y"] + first + spacing / 2 });
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
  function insert(node, name, target, side, bounds, minimum) {
    node = remove(node, name);
    if (!node) return leaf(name);
    const rects = layout(node, bounds).windows;
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

  function resizeWindow(node, name, axis, delta, bounds) {
    const path = pathTo(node, name);
    if (!path) return node;
    const next = copy(node);
    const windowRect = layout(next, bounds).windows.get(name);
    for (let depth = path.length - 1; depth >= 0; depth -= 1) {
      const split = at(next, path.slice(0, depth));
      if (split.axis !== axis) continue;
      const side = path[depth];
      const fraction = side === "a" ? split.ratio : 1 - split.ratio;
      const extent = windowRect[axis === "x" ? "width" : "height"];
      const nextFraction = fraction * (1 + delta / Math.max(1, extent));
      split.ratio = Math.max(.001, Math.min(.999, side === "a" ? nextFraction : 1 - nextFraction));
      break;
    }
    return next;
  }
  const api = { gap, copy, leaf, names, contains, normalize, remove, layout, at, pathTo, insert, fit, resizeWindow };
  root.SpatialTiling = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
