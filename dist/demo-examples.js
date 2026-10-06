/* Public demonstration content. Stable internal IDs preserve saved layouts.
 * Only unchanged built-in examples migrate; renamed or relocated projects
 * and user-written notes, resources and modes remain untouched. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SpatialDemoExamples = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const projects = {
  "plasma": {
    "name": "Website Launch",
    "accent": "#5cbcff",
    "icon": "i-folder",
    "summary": "Design, build and launch a website",
    "root": "/home/demo/Workspaces/Work/Projects/website-launch",
    "originWorkspace": "work",
    "files": [
      [
        "index.html",
        "Modified 8 min ago",
        "document"
      ],
      [
        "launch-checklist.md",
        "Modified today",
        "document"
      ]
    ],
    "note": "Review the homepage copy, check the mobile layout, then share the preview for feedback.",
    "resources": [
      [
        "brand-guidelines.pdf",
        "Linked \u00b7 ~/Documents/Brand",
        "document",
        "i-note"
      ],
      [
        "Reference images",
        "Linked \u00b7 ~/Pictures/References",
        "folder",
        "i-folder"
      ]
    ],
    "activeMode": "visual",
    "modes": {
      "visual": {
        "label": "Design",
        "icon": "i-palette",
        "apps": [
          "browser",
          "dolphin",
          "notes"
        ],
        "layout": "canvas"
      },
      "prototype": {
        "label": "Build",
        "icon": "i-code",
        "apps": [
          "browser",
          "terminal",
          "dolphin"
        ],
        "layout": "build"
      },
      "testing": {
        "label": "Review",
        "icon": "i-monitor",
        "apps": [
          "browser",
          "notes",
          "terminal"
        ],
        "layout": "review"
      }
    }
  },
  "retold": {
    "name": "Short Film",
    "accent": "#65d881",
    "icon": "i-video",
    "summary": "Edit and deliver a short film",
    "root": "/mnt/media/Projects/short-film",
    "originWorkspace": null,
    "files": [
      [
        "Footage",
        "Source clips",
        "folder"
      ],
      [
        "edit-notes.md",
        "Modified yesterday",
        "document"
      ]
    ],
    "note": "Review the rough cut, balance the audio, then export a preview for feedback.",
    "resources": [
      [
        "soundtrack.wav",
        "Linked \u00b7 ~/Music/Production",
        "audio",
        "i-music"
      ],
      [
        "storyboard.pdf",
        "Linked \u00b7 ~/Documents/Film",
        "document",
        "i-note"
      ]
    ],
    "activeMode": "development",
    "modes": {
      "development": {
        "label": "Editing",
        "icon": "i-video",
        "apps": [
          "dolphin",
          "elisa",
          "notes"
        ],
        "layout": "build"
      },
      "playtest": {
        "label": "Review",
        "icon": "i-play",
        "apps": [
          "browser",
          "notes",
          "dolphin"
        ],
        "layout": "review"
      },
      "release": {
        "label": "Delivery",
        "icon": "i-monitor",
        "apps": [
          "dolphin",
          "browser",
          "notes"
        ],
        "layout": "canvas"
      }
    }
  }
};
  projects.research = {
    name: "Urban Ecology", accent: "#e6b84f", icon: "i-graduation",
    summary: "Compare field observations and prepare a class report",
    root: "/home/demo/Workspaces/School/Projects/urban-ecology", originWorkspace: "school",
    files: [["field-observations.csv", "Three survey sites", "document"], ["report-outline.md", "Draft structure", "document"], ["Photos", "Field visit photographs", "folder"]],
    note: "Research question: how does shade affect plant diversity?\n\nCompare the riverside and courtyard samples. Cite the field guide before writing the conclusion.",
    resources: [["Field guide.pdf", "Linked · School/Documents/Biology", "document", "i-note"], ["Survey map", "Linked · School/Pictures", "document", "i-web"]],
    activeMode: "study", modes: { study: { label: "Research", icon: "i-graduation", apps: ["browser"], layout: "canvas" } }
  };
  const closedApps = { dolphin: "closed", elisa: "closed", browser: "closed", terminal: "closed", notes: "closed" };
  const leaf = name => ({ kind: "window", name });
  const scene = (project, mode, apps, docks, sizes, tree, extras = {}) => ({
    project, mode, apps: { ...closedApps, ...apps }, tree,
    areas: { state: docks, sizes: { left: 280, right: 280, top: 250, bottom: 250, ...sizes },
      hidden: { projects: !project, apps: false, systems: false },
      manual: { left: true, right: true, top: true, bottom: true }, layoutMode: "manual" }, ...extras
  });
  const scenarios = {
    general: scene(null, null, { dolphin: "open" },
      { projects: { edge: "left", order: 1 }, apps: { edge: "left", order: 0 }, systems: { edge: "right", order: 0 } },
      { left: 68, right: 280 }, leaf("dolphin"), {
        note: "Personal notes\n\nBook the train tickets.\nBack up the holiday photographs.",
        folder: "Home", files: [["Documents", "124 items", "folder"], ["Downloads", "31 items", "folder"], ["Pictures", "231 items", "folder"], ["Music", "18 albums", "folder"], ["Projects", "7 items", "folder"]],
        browser: { title: "Your day", subtitle: "Personal start page", intro: "Mail, the weather and the next trip — a quiet place for everyday browsing.", links: ["Mail", "Weather", "Train tickets", "Reading list"] },
        notifications: [], hiddenWidgets: [false, false]
      }),
    school: scene("research", "study", { browser: "open" },
      { projects: { edge: "left", order: 0 }, apps: { edge: "bottom", order: 0 }, systems: { edge: "right", order: 0 } },
      { left: 280, right: 280, bottom: 96 }, leaf("browser"), {
        note: "Field observations\n\nRiverside: 14 plant species, mostly shaded.\nCourtyard: 8 species, direct sunlight.\nCheck whether sampling effort was equal.",
        folder: "Documents/Biology", files: [["Field guide.pdf", "4.2 MiB", "document"], ["Course notes", "12 files", "folder"], ["Reading list.md", "3 KiB", "document"]],
        browser: { title: "Urban habitats & biodiversity", subtitle: "Biology · course reading", intro: "Habitat structure, shade and soil moisture influence the species found in urban green spaces. Compare sites using the same survey method, then record the limits of your sample.", links: ["Course reading", "Sampling methods", "Citation guide", "Assignment brief"] },
        notifications: [["Feedback available", "Biology · your field survey outline", "amber", "i-graduation"]], focus: { running: false, seconds: 1500, visible: true }, hiddenWidgets: [false, true]
      }),
    work: scene("plasma", "prototype", { browser: "open", terminal: "open", dolphin: "minimized" },
      { projects: { edge: "right", order: 0 }, apps: { edge: "left", order: 0 }, systems: { edge: "bottom", order: 0 } },
      { left: 68, right: 300, bottom: 96 }, { kind: "split", axis: "y", ratio: .58, a: leaf("browser"), b: leaf("terminal") }, {
        note: "Launch checklist\n\nConfirm the contact form.\nCheck keyboard navigation.\nSend the staging link for review.",
        folder: "Projects/website-launch", files: [["src", "24 files", "folder"], ["public", "18 files", "folder"], ["package.json", "2 KiB", "document"], ["README.md", "4 KiB", "document"]],
        browser: { title: "Northstar Studio", subtitle: "Website Launch · local preview", intro: "Thoughtful spaces for everyday life. A small architecture studio creating useful, welcoming places — from the first sketch to the last detail.", links: ["Our projects", "About the studio", "Contact", "Preview checklist"] },
        notifications: [["Review in 15 minutes", "Website Launch · bring the staging preview", "violet", "i-calendar"]], hiddenWidgets: [false, true]
      }),
    gaming: scene(null, null, { browser: "open", elisa: "minimized" },
      { projects: { edge: "right", order: 1 }, apps: { edge: "left", order: 0 }, systems: { edge: "right", order: 0 } },
      { left: 300, right: 70 }, leaf("browser"), {
        note: "Game night\n\nMeet in voice chat at 20:00.\nPick a co-op game everyone has installed.",
        folder: "Captures", files: [["Friday co-op.webm", "812 MiB", "document"], ["Screenshots", "28 images", "folder"], ["Highlights", "6 clips", "folder"]],
        browser: { title: "Tonight's co-op", subtitle: "Games and friends", intro: "Three friends are ready for the next session. Choose a game, check the shared notes and keep the music controls nearby while you play.", links: ["Game library", "Friends", "Voice chat", "Recent captures"] },
        notifications: [["Jamie invited you", "Co-op lobby · 3 friends online", "green", "i-gamepad"]], hiddenWidgets: [true, false]
      })
  };

  // A one-time refresh of the built-in demonstration scenes. Keep edited Project
  // definitions and Workspaces attached to a custom Project. Retain the old scene
  // data in a backup, and never reseed layouts on subsequent visits or switches.
  function seedWorkspaces(storage) {
    const versionKey = "spatial-demo-scenes-v1";
    if (storage.getItem(versionKey) === "2") return false;
    const keys = ["spatial-workspace-app-states-v1", "spatial-workspace-area-layouts-v1", "spatial-workspace-project-states-v1", "spatial-workspace-area-contents-v1", "spatial-split-layouts-v1", "spatial-workspace-window-layouts-v1", "spatial-workspace-display-assignments-v1"];
    const backup = Object.fromEntries(keys.map(key => [key, storage.getItem(key)]));
    const values = Object.fromEntries(keys.map(key => [key, JSON.parse(storage.getItem(key) || "{}") ]));
    const savedProjectsRaw = storage.getItem("spatial-project-spaces-v2");
    const savedProjects = savedProjectsRaw === null ? JSON.parse(JSON.stringify(projects)) : JSON.parse(savedProjectsRaw || "{}");
    // Introduce the new research example beside existing examples, but respect
    // an intentionally empty project library and an existing custom research ID.
    if (Object.keys(savedProjects).length && !savedProjects.research) savedProjects.research = JSON.parse(JSON.stringify(projects.research));
    let refreshedActive = false;
    for (const [name, example] of Object.entries(scenarios)) {
      const previousProject = values[keys[2]][name]?.project || (name === (storage.getItem("spatial-active-workspace") || "general") ? storage.getItem("spatial-active-project-v1") : null);
      if (previousProject && !["plasma", "retold", "research"].includes(previousProject)) continue;
      const contextProject = savedProjects[example.project] ? example.project : null;
      values[keys[0]][name] = JSON.parse(JSON.stringify(example.apps));
      values[keys[1]][name] = JSON.parse(JSON.stringify(example.areas));
      values[keys[1]][name].hidden.projects = !contextProject;
      values[keys[2]][name] = { project: contextProject, mode: contextProject ? example.mode : null };
      const legacyDraft = storage.getItem("spatial-note-draft-v1");
      const personalDraft = name === "general" && legacyDraft !== null && legacyDraft !== note && legacyDraft !== legacyNote ? legacyDraft : example.note;
      const noteValue = values[keys[3]][name]?.noteDraft ?? personalDraft;
      values[keys[3]][name] = { noteDraft: noteValue, notifications: example.notifications,
        focus: { running: false, seconds: 1500, visible: false, ...example.focus, savedAt: Date.now() },
        hiddenWidgets: example.hiddenWidgets, scroll: { apps: 0, systems: 0, projects: 0 } };
      for (const key of Object.keys(values[keys[4]])) if (key.startsWith(name + ":")) delete values[keys[4]][key];
      const tileKey = [name, contextProject || "desktop", contextProject ? example.mode : "default", 1].join(":");
      values[keys[4]][tileKey] = { root: JSON.parse(JSON.stringify(example.tree)), parked: {}, floating: {}, focus: Object.keys(example.apps).find(app => example.apps[app] === "open") };
      delete values[keys[5]][name];
      values[keys[6]][name] = { areas: { projects: 1, apps: 1, systems: 1 }, apps: Object.fromEntries(Object.keys(closedApps).map(app => [app, 1])) };
      if (storage.getItem("spatial-active-workspace") === name) refreshedActive = true;
    }
    storage.setItem("spatial-demo-scenes-backup-v1", JSON.stringify(backup));
    storage.setItem("spatial-project-spaces-v2", JSON.stringify(savedProjects));
    for (const key of keys) storage.setItem(key, JSON.stringify(values[key]));
    if (refreshedActive || !storage.getItem("spatial-active-workspace")) storage.setItem("spatial-active-workspace", "general");
    storage.setItem(versionKey, "2");
    return true;
  }

  const legacy = {
  "plasma": {
    "name": "Plasma Redesign",
    "accent": "#5cbcff",
    "icon": "i-folder",
    "summary": "Desktop shell",
    "root": "/home/xef/Projects/plasma-redesign",
    "originWorkspace": "general",
    "files": [
      [
        "desktop-shell.css",
        "Modified 8 min ago",
        "document"
      ],
      [
        "interaction-notes.md",
        "Modified today",
        "document"
      ]
    ],
    "note": "Keep the interaction physical, but let the content stay quiet and readable.",
    "resources": [
      [
        "keyboard-reference.mp4",
        "Linked \u00b7 ~/Videos",
        "video",
        "i-video"
      ],
      [
        "Ocean design",
        "Web reference",
        "web",
        "i-web"
      ]
    ],
    "activeMode": "visual",
    "modes": {
      "visual": {
        "label": "Visual Design",
        "icon": "i-palette",
        "apps": [
          "browser",
          "dolphin",
          "notes"
        ],
        "layout": "canvas"
      },
      "prototype": {
        "label": "Prototype",
        "icon": "i-code",
        "apps": [
          "browser",
          "terminal",
          "dolphin"
        ],
        "layout": "build"
      },
      "testing": {
        "label": "Interaction Test",
        "icon": "i-monitor",
        "apps": [
          "browser",
          "notes",
          "terminal"
        ],
        "layout": "review"
      }
    }
  },
  "retold": {
    "name": "Retold",
    "accent": "#65d881",
    "icon": "i-gamepad",
    "summary": "Minecraft mod",
    "root": "/mnt/nvmekingston/Projects/Retold",
    "originWorkspace": null,
    "files": [
      [
        "src/main/java",
        "Gameplay sources",
        "folder"
      ],
      [
        "gradle.properties",
        "Modified yesterday",
        "document"
      ]
    ],
    "note": "Test the new movement controller, then record the climbing animation bug.",
    "resources": [
      [
        "v0.3 test recording.mp4",
        "Linked \u00b7 ~/Videos/Captures",
        "video",
        "i-video"
      ],
      [
        "Fabric documentation",
        "Web reference",
        "web",
        "i-web"
      ]
    ],
    "activeMode": "development",
    "modes": {
      "development": {
        "label": "Development",
        "icon": "i-code",
        "apps": [
          "terminal",
          "dolphin",
          "browser"
        ],
        "layout": "build"
      },
      "playtest": {
        "label": "Playtest",
        "icon": "i-play",
        "apps": [
          "browser",
          "terminal",
          "notes"
        ],
        "layout": "review"
      },
      "release": {
        "label": "Release",
        "icon": "i-monitor",
        "apps": [
          "dolphin",
          "browser",
          "notes"
        ],
        "layout": "canvas"
      }
    }
  }
};
  const note = "Launch review\n\n\u2022 Finalise the homepage copy.\n\u2022 Check the layout on a phone.\n\u2022 Collect feedback from the team.\n\nNext meeting: Thursday, 14:30.";
  const legacyNote = "The center is a free-form workspace. Windows can overlap, move and resize.\n\nDrag a title bar into Apps to park the window as a live card. Drag that card back to restore it where you release.\n\nThe right side contains system state and short interactions.";
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function migrateProject(id, project) {
    const before = legacy[id];
    const after = projects[id];
    if (!before || !after || !project) return project;
    const legacyRoots = [before.root];
    if (id === "retold") legacyRoots.push("/home/xef/Projects/retold-mod");
    const unchangedExample = project.name === before.name && legacyRoots.includes(project.root);
    const movedPublicExample = id === "plasma" && project.name === after.name && project.root === "/home/demo/Projects/website-launch";
    const currentExample = project.name === after.name && project.root === after.root;
    if (!unchangedExample && !currentExample && !movedPublicExample) return project;
    const next = JSON.parse(JSON.stringify(project));
    if (unchangedExample || movedPublicExample) {
      next.name = after.name;
      next.root = after.root;
      if (id === "plasma" && next.originWorkspace === "general") next.originWorkspace = "work";
    }
    for (const field of ["icon", "summary", "note"]) {
      if (same(next[field], before[field])) next[field] = after[field];
    }
    // Replace individual default rows while keeping additions, removals and edits.
    for (const field of ["files", "resources"]) {
      if (!Array.isArray(next[field])) continue;
      next[field] = next[field].map(row => {
        const index = before[field].findIndex(original => same(row, original));
        return index < 0 ? row : JSON.parse(JSON.stringify(after[field][index]));
      });
    }
    for (const [modeId, mode] of Object.entries(next.modes || {})) {
      const oldMode = before.modes[modeId];
      const newMode = after.modes[modeId];
      if (!oldMode || !newMode) continue;
      for (const field of ["label", "icon", "apps", "layout"]) {
        if (same(mode[field], oldMode[field])) mode[field] = JSON.parse(JSON.stringify(newMode[field]));
      }
    }
    return next;
  }

  function migrateNote(value) {
    return value === legacyNote ? note : value;
  }

  return { projects, scenarios, seedWorkspaces, note, migrateProject, migrateNote };
});
