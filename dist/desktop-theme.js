// Resolve the user's choice separately from the rendered palette.
// Loaded at the start of <body> so Auto is applied before the desktop paints.
(function (root) {
  function createDesktopTheme({ document, storage, media, events }) {
    const key = "spatial-color-theme-v1";
    const choices = ["auto", "oled", "graphite", "light"];
    const labels = { auto: "Auto", oled: "OLED", graphite: "Graphite", light: "Light" };
    let preference = "auto";
    let button;
    try {
      const saved = storage.getItem(key);
      if (choices.includes(saved)) preference = saved;
    } catch {}
    const theme = {
      get preference() { return preference; },
      onChange: null,
      setPreference(value, { notify = true } = {}) {
        if (!choices.includes(value)) return;
        preference = value;
        try { storage.setItem(key, value); } catch {}
        apply();
        if (notify) theme.onChange?.();
      },
      next() {
        theme.setPreference(choices[(choices.indexOf(preference) + 1) % choices.length]);
      },
      bind(control) { button = control; apply(); }
    };
    function apply() {
      const resolved = preference === "auto" ? (media.matches ? "graphite" : "light") : preference;
      document.body.dataset.theme = resolved;
      document.body.dataset.themePreference = preference;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = resolved === "light" ? "#d9dde0" : resolved === "graphite" ? "#161a1c" : "#07090a";
      if (button) {
        button.querySelector("span:last-child").textContent = labels[preference];
        const current = preference === "auto" ? `Auto (${media.matches ? "Dark" : "Light"}) — follows system` : labels[preference];
        button.setAttribute("aria-label", `Color theme: ${current}. Change color theme`);
        button.title = `Color theme: ${current}. Click to cycle Auto, OLED, Graphite and Light.`;
      }
    }
    function systemChanged() {
      if (preference !== "auto") return;
      apply();
      theme.onChange?.();
    }
    if (media.addEventListener) media.addEventListener("change", systemChanged);
    else media.addListener?.(systemChanged);
    events?.addEventListener("storage", event => {
      if (event.key !== key) return;
      theme.setPreference(event.newValue || "auto", { notify: false });
    });
    apply();
    return theme;
  }
  if (typeof module === "object" && module.exports) module.exports = createDesktopTheme;
  else root.SpatialDesktopTheme = createDesktopTheme({
    document: root.document,
    storage: { getItem: key => root.localStorage.getItem(key), setItem: (key, value) => root.localStorage.setItem(key, value) },
    media: root.matchMedia("(prefers-color-scheme: dark)"),
    events: root
  });
})(typeof window === "object" ? window : globalThis);
