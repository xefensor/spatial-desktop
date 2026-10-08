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
  const previousPublicProjects = JSON.parse(JSON.stringify(projects));
  for (const project of Object.values(projects)) {
    project.activeMode = "default";
    project.modes = {default: {label: "Project", icon: project.icon, apps: [], layout: "canvas"}};
  }
  projects.plasma.modes.default.apps = ["browser", "terminal", "dolphin", "notes"];
  projects.retold.modes.default.apps = ["dolphin", "notes", "elisa", "browser"];
  projects.research.modes.default.apps = ["browser", "notes", "dolphin"];
  projects.retold.summary = "Organise footage, review sound and collect cut feedback";
  projects.retold.note = "Rough cut: 02:48. Check the station transition at 01:12 and reduce the music under dialogue. Keep review feedback on Desktop 2.";
  projects.retold.files = [["Footage", "Source clips", "folder"], ["rough-cut.mp4", "Review copy · 02:48", "document"], ["edit-notes.md", "Cut feedback", "document"]];
  const closedApps = { dolphin: "closed", elisa: "closed", browser: "closed", terminal: "closed", notes: "closed" };
  const leaf = name => ({ kind: "window", name });
  const scene = (project, mode, apps, docks, sizes, tree, extras = {}) => ({
    project, mode, apps: { ...closedApps, ...apps }, tree,
    areas: { state: docks, sizes: { left: 280, right: 280, top: 250, bottom: 250, ...sizes },
      hidden: { projects: false, apps: false, systems: false },
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

  // Columns replace Modes. Each window has one owner and an explicit desktop.
  const reading = (title, subtitle, intro, links, detail) => ({title, subtitle, intro, links, detail});
  const windowSpec = (id, base, page, content, state = "open") => ({id, base, page, content, state});
  const projectWindows = {
    plasma: [
      windowSpec("browser--demo-site-preview", "browser", 0, {shortTitle:"Preview", browser: scenarios.work.browser, address:"http://localhost:5173/"}),
      windowSpec("terminal--demo-site-server", "terminal", 0, {shortTitle:"Dev server", terminal:{path:projects.plasma.root, command:"npm run dev", output:"Northstar Studio · development preview\nBuild completed · no errors\nLocal: http://localhost:5173/\nWatching source files for changes…"}}),
      windowSpec("dolphin--demo-site-files", "dolphin", 1, {shortTitle:"Source files", folder:projects.plasma.root, files:scenarios.work.files}),
      windowSpec("notes--demo-site-checklist", "notes", 1, {shortTitle:"Launch checklist", note:scenarios.work.note})
    ],
    retold: [
      windowSpec("dolphin--demo-film-footage", "dolphin", 0, {shortTitle:"Footage", folder:projects.retold.root, files:projects.retold.files}),
      windowSpec("notes--demo-film-cut", "notes", 0, {shortTitle:"Edit notes", note:"Short Film · rough cut\n\n00:24 — hold the opening shot longer.\n01:12 — soften the station transition.\n02:06 — lower the music under dialogue.\n\nReview copy: rough-cut.mp4 · 02:48."}),
      windowSpec("browser--demo-film-review", "browser", 1, {shortTitle:"Cut feedback", address:"Review board · Short Film", browser:reading("Rough cut review", "Short Film · feedback", "Collect notes on the 02:48 review copy. Keep the source footage on Desktop 1 while you compare feedback here.", ["Opening scene", "Station transition", "Dialogue mix", "Export checklist"], "Opening feels clear. The station cut at 01:12 needs a softer transition. Export the next preview after checking the dialogue mix.")}),
      windowSpec("elisa--demo-film-soundtrack", "elisa", 1, {shortTitle:"Soundtrack", music:{title:"Station ambience", artist:"Short Film · production audio", tracks:["Station ambience", "Dialogue reference", "Closing theme"]}}, "minimized")
    ],
    research: [
      windowSpec("browser--demo-study-reading", "browser", 0, {shortTitle:"Field guide", address:"Biology · field guide", browser:scenarios.school.browser}),
      windowSpec("notes--demo-study-observations", "notes", 0, {shortTitle:"Observations", note:scenarios.school.note}),
      windowSpec("dolphin--demo-study-evidence", "dolphin", 1, {shortTitle:"Survey evidence", folder:projects.research.root, files:projects.research.files})
    ]
  };
  const workspaceWindows = {
    general: [windowSpec("dolphin", "dolphin", 0, {shortTitle:"Home", folder:"/home/demo", files:scenarios.general.files}), windowSpec("notes", "notes", 1, {shortTitle:"Personal notes", note:scenarios.general.note})],
    school: [windowSpec("browser", "browser", 0, {shortTitle:"Student portal", address:"School · student portal", browser:reading("This week at school", "School · student portal", "Course announcements, assignment dates and the timetable live in your workspace. Urban Ecology has its own project column.", ["Timetable", "Assignments", "Course announcements", "Library"], "Biology report due Friday. Bring the field observations to Thursday’s seminar.")}), windowSpec("notes", "notes", 1, {shortTitle:"Class planning", note:"Class planning\n\nThursday — biology seminar.\nFriday — submit the Urban Ecology report.\n\nResearch notes stay in the Urban Ecology column."})],
    work: [windowSpec("browser", "browser", 0, {shortTitle:"Studio desk", address:"Work · studio desk", browser:reading("Studio desk", "Work · daily administration", "Keep everyday studio planning here. Website Launch and Short Film are open beside this workspace, each with its own windows and desktops.", ["Meeting agenda", "Studio inbox", "Shared calendar", "Invoices"], "10:00 — weekly planning. 14:30 — website review. 16:00 — film feedback. Switch project tabs to return to the relevant work.")}), windowSpec("notes", "notes", 1, {shortTitle:"Studio planning", note:"Studio planning\n\nWebsite review — 14:30.\nShort Film feedback — 16:00.\n\nKeep project checklists in their project columns."})],
    gaming: [windowSpec("browser", "browser", 0, {shortTitle:"Game library", address:"Gaming · game library", browser:scenarios.gaming.browser}), windowSpec("elisa", "elisa", 0, {shortTitle:"Game-night mix", music:{title:"Evening Light", artist:"Northbound · game-night mix", tracks:["Evening Light", "City Lights", "Blue Horizon"]}}, "minimized"), windowSpec("notes", "notes", 1, {shortTitle:"Co-op planning", note:scenarios.gaming.note})]
  };
  const openProjects = {general:[], school:["research"], work:["plasma","retold"], gaming:[]};
  for (const [workspace, example] of Object.entries(scenarios)) {
    example.project = openProjects[workspace][0] || null;
    example.mode = example.project ? "default" : null;
    example.areas.hidden.projects = false;
    example.windows = [{column:"workspace", windows:workspaceWindows[workspace]}, ...openProjects[workspace].map(column=>({column, windows:projectWindows[column]}))];
    example.apps = {...closedApps};
    example.windows.forEach(column=>column.windows.forEach(window=>{example.apps[window.id]=window.state;}));
  }
  scenarios.school.areas.state.apps = {edge:"left",order:1};
  scenarios.school.areas.sizes = {left:280,right:280,top:250,bottom:250};
  scenarios.work.areas.state = {apps:{edge:"left",order:0},projects:{edge:"left",order:1},systems:{edge:"right",order:0}};
  scenarios.work.areas.sizes = {left:280,right:280,top:250,bottom:250};
  scenarios.work.notifications = [["Website review · 14:30", "Website Launch · preview and checklist", "violet", "i-calendar"], ["Rough cut ready", "Short Film · feedback on Desktop 2", "green", "i-video"]];

  function seedWorkspaces(storage) {
    const versionKey = "spatial-demo-scenes-v1";
    if (storage.getItem(versionKey) === "3") return false;
    const keys = ["spatial-workspace-app-states-v1", "spatial-workspace-area-layouts-v1", "spatial-workspace-project-states-v1", "spatial-workspace-area-contents-v1", "spatial-split-layouts-v1", "spatial-workspace-window-layouts-v1", "spatial-workspace-display-assignments-v1", "spatial-desktop-pages-v1", "spatial-open-projects-v1", "spatial-independent-sessions-v1", "spatial-project-window-sessions-v1"];
    const backup = Object.fromEntries(keys.map(key=>[key,storage.getItem(key)]));
    const values = Object.fromEntries(keys.map(key=>[key,JSON.parse(storage.getItem(key)||"{}") ]));
    const rawProjects = storage.getItem("spatial-project-spaces-v2");
    const savedProjects = rawProjects === null ? JSON.parse(JSON.stringify(projects)) : JSON.parse(rawProjects || "{}");
    if (Object.keys(savedProjects).length && !savedProjects.research) savedProjects.research = JSON.parse(JSON.stringify(projects.research));
    for (const [id, project] of Object.entries(savedProjects)) {
      const before = previousPublicProjects[id], after = projects[id];
      if (before && project.name === before.name && project.root === before.root && JSON.stringify(project.modes) === JSON.stringify(before.modes)) {
        project.modes = JSON.parse(JSON.stringify(after.modes)); project.activeMode = "default";
      }
    }
    const independent = values["spatial-independent-sessions-v1"];
    independent.instances ||= {}; independent.membership ||= {}; independent.projects ||= {}; independent.content ||= {};
    for (const [workspace, example] of Object.entries(scenarios)) {
      const existing = values["spatial-workspace-project-states-v1"][workspace]?.project;
      const opened = values["spatial-open-projects-v1"][workspace] || [];
      if ([existing,...opened].some(id=>id && (!projects[id] || (savedProjects[id] && (savedProjects[id].name !== projects[id].name || savedProjects[id].root !== projects[id].root))))) continue;
      const columns = example.windows.filter(column=>column.column === "workspace" || savedProjects[column.column]);
      const apps = {...closedApps}, owners = {}, pages = {};
      independent.membership[workspace] = {};
      const activeColumn = columns[1]?.column || "workspace";
      const project = activeColumn === "workspace" ? null : activeColumn;
      const oldNote = values["spatial-workspace-area-contents-v1"][workspace]?.noteDraft;
      const storedNote = oldNote ?? (workspace === "general" ? storage.getItem("spatial-note-draft-v1") : null);
      const defaultNote = workspaceWindows[workspace].find(w=>w.base==="notes")?.content.note;
      const defaultDrafts = [example.note, note, legacyNote];
      const personalNote = storedNote !== null && defaultDrafts.includes(storedNote) ? defaultNote : storedNote;
      const content = independent.content[workspace];
      if (content && defaultDrafts.includes(content.note)) content.note = defaultNote;
      const notes = content?.frames?.notes;
      if (notes) for (const field of notes) if (defaultDrafts.includes(field.value)) field.value = defaultNote;
      const browserFields = content?.frames?.browser;
      if (browserFields && ["Search the web", "localhost:5173 · Northstar Studio", example.browser.subtitle].includes(browserFields[0]?.value)) browserFields[0].value = workspaceWindows[workspace].find(w=>w.base==="browser")?.content.address || "Search the web";
      values["spatial-workspace-area-contents-v1"][workspace] = {noteDraft:personalNote ?? workspaceWindows[workspace].find(w=>w.base==="notes")?.content.note ?? example.note, notifications:example.notifications, focus:{running:false,seconds:1500,visible:Boolean(example.focus?.visible),savedAt:Date.now()}, hiddenWidgets:example.hiddenWidgets, scroll:{apps:0,systems:0,projects:0}};
      for (const key of Object.keys(values["spatial-split-layouts-v1"])) if (key.startsWith(workspace+":")) delete values["spatial-split-layouts-v1"][key];
      for (const column of columns) {
        for (const window of column.windows) {
          apps[window.id]=window.state; owners[window.id]=column.column; pages[window.id]=window.page;
          independent.membership[workspace][window.id]=column.column === "workspace" ? null : column.column;
          if (window.id !== window.base) independent.instances[window.id]=window.base;
        }
        const usedPages = [...new Set(column.windows.map(w=>w.page))];
        for (const page of usedPages) {
          const windows = column.windows.filter(w=>w.page===page && w.state==="open");
          const tree = windows.reduce((root,w)=>root ? {kind:"split",axis:"x",ratio:.5,a:root,b:leaf(w.id)} : leaf(w.id), null);
          const prefix = column.column === "workspace" ? workspace+":desktop:" : workspace+":project-column:"+column.column+":desktop:";
          values["spatial-split-layouts-v1"][prefix+page+":1"] = {root:tree,parked:{},floating:{}};
        }
      }
      values["spatial-workspace-app-states-v1"][workspace]=apps;
      values["spatial-workspace-area-layouts-v1"][workspace]=JSON.parse(JSON.stringify(example.areas));
      values["spatial-workspace-project-states-v1"][workspace]={project,mode:project ? savedProjects[project].activeMode : null};
      values["spatial-open-projects-v1"][workspace]=columns.filter(c=>c.column!=="workspace").map(c=>c.column);
      values["spatial-desktop-pages-v1"][workspace]={active:0,activeColumn,windows:pages,owners,columns:Object.fromEntries(columns.filter(c=>c.column!=="workspace").map(c=>[c.column,{active:0}])),migrated:true,columnsMigrated:true};
      independent.projects[workspace]=project;
      delete values["spatial-workspace-window-layouts-v1"][workspace];
      values["spatial-workspace-display-assignments-v1"][workspace]={areas:{projects:1,apps:1,systems:1},apps:Object.fromEntries(Object.keys(apps).map(id=>[id,1]))};
      for (const key of Object.keys(values["spatial-project-window-sessions-v1"])) if (key.startsWith(workspace+":")) delete values["spatial-project-window-sessions-v1"][key];
    }
    // Retain the complete previous session before refreshing built-in scenes.
    backup["spatial-project-spaces-v2"] = rawProjects;
    storage.setItem("spatial-demo-columns-backup-v1", JSON.stringify(backup));
    storage.setItem("spatial-project-spaces-v2", JSON.stringify(savedProjects));
    for (const key of keys) storage.setItem(key, JSON.stringify(values[key]));
    storage.setItem(versionKey,"3");
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
      const newMode = previousPublicProjects[id]?.modes[modeId];
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

  return { projects, scenarios, projectWindows, workspaceWindows, seedWorkspaces, note, migrateProject, migrateNote };
});

