/* Public demonstration content. Stable internal IDs preserve saved layouts.
 * Only unchanged built-in examples migrate; renamed or relocated projects
 * and user-written notes, resources and modes remain untouched. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./spatial-tiling.js"));
  else root.SpatialDemoExamples = factory(root.SpatialTiling);
})(typeof globalThis !== "undefined" ? globalThis : this, function (tiling) {
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
    files: [["field-observations.csv", "Four plots across two sites", "document"], ["report-outline.md", "Draft structure", "document"], ["Photos", "Field visit photographs", "folder"]],
    note: "Research question: how does shade affect plant diversity?\n\nCompare the riverside and courtyard samples. Cite the field guide before writing the conclusion.",
    resources: [["Field guide.pdf", "Linked · School/Documents/Biology", "document", "i-note"], ["Survey map", "Linked · School/Pictures", "document", "i-web"]],
    activeMode: "study", modes: { study: { label: "Research", icon: "i-graduation", apps: ["browser"], layout: "canvas" } }
  };
  const previousPublicProjects = JSON.parse(JSON.stringify(projects));

  // Real, bundled media. Captions stay editable; the source content stays intact.
  projects.plasma.resources = [
    ["Brand brief", "Launch direction and review checklist", "document", "i-note", {text:"A concise brief for the homepage review.", attachment:{kind:"document",src:"media/stash/brand-brief.html",format:"Document"}}],
    ["Product photo", "Hero image reference", "image", "i-image", {text:"Test a wide crop with enough space for the headline.", attachment:{kind:"image",src:"images/philosophy/keychron-profile.jpg",format:"Photo",credit:"Photo: Mulad · public domain"}}]
  ];
  projects.retold.resources = [
    ["Closing theme", "Original synth sketch", "audio", "i-music", {text:"An eight-second musical sketch for the closing shot. Compare its pacing with the cut.",attachment:{kind:"audio",src:"media/stash/closing-theme.wav",format:"Audio · 0:08",credit:"Original synthesised demo audio"}}],
    ["Station transition", "Three-shot storyboard", "image", "i-image", {text:"Wide platform → approaching train → departure. Keep the cut on movement.",attachment:{kind:"image",src:"media/stash/storyboard.svg",format:"Storyboard"}}]
  ];
  projects.research.resources = [
    ["Field observations", "Two sites, one sampling method", "document", "i-note", {text:"Illustrative survey data: compare shade cover and plant counts before writing the report.",attachment:{kind:"document",src:"media/stash/field-observations.html",format:"Data sheet"}}],
    ["Survey route", "Riverside and courtyard", "image", "i-image", {text:"A schematic route linking the two sample sites; not a navigational map.",attachment:{kind:"image",src:"media/stash/survey-route.svg",format:"Map"}}]
  ];

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
  const priorWorkflowProjects = JSON.parse(JSON.stringify(projects));
  projects.plasma.note = "Homepage review\n\nKeep one clear action: Explore the keyboard.\nCheck the product photo crop on a phone.\nTest keyboard navigation before sharing the preview.";
  projects.research.note = "Field observations · four equal 1 m² plots\n\nRiverside A: 75% shade, 8 species.\nRiverside B: 60% shade, 7 species.\nCourtyard A: 20% shade, 4 species.\nCourtyard B: 35% shade, 5 species.\n\nRecord watering and ground cover. This small fictional sample does not establish that shade caused the difference.";
  projects.research.files[0][1] = "Four plots across two sites";
  const reviewNotes = {
    plasma: {title:"Before sharing the homepage", text:"Check the headline and primary action on a phone.\nReview the crop of Product photo.\nTest the contact link and keyboard focus.\nKeep review feedback in this Project’s Stash."},
    retold: {title:"Next cut review", text:"00:24 — hold the opening shot longer.\n01:12 — soften the station transition.\n02:06 — lower the music under dialogue.\nCompare the Closing theme sketch with the cut; the demo Assistant cannot listen to the audio."},
    research: {title:"Before writing the conclusion", text:"Compare all four equal-size plots in Field observations.\nCheck watering, ground cover and time of day.\nDescribe an observed association rather than claiming that shade caused it.\nKeep the sample’s limitations beside the conclusion."}
  };
  // Instructions use the same controls and supported operations as the live demo.
  // They are recipes, not fabricated completed conversations or file operations.
  const assistantWorkflows = {
    plasma: [
      {title:"Review the homepage copy", steps:["On Desktop 1, highlight the homepage paragraph in Firefox.","Right-click → Ask Assistant, or hold F2 and press A. Ask for a checklist.","Review the reply, then choose Save to Stash. Its Details keeps the selected input."], prompt:"Make a review checklist from this text."},
      {title:"Prepare an image for the web", steps:["In Stash, open its folder in File Browser and select Product photo.jpg.","Choose Ask Assistant and send the request below. Review Save in, then choose Convert.","Use Open or Show in folder. Output History is in Details; the original stays in Stash."], prompt:"Convert selected files to WebP in Images/Web"}
    ],
    retold: [
      {title:"Prepare the next cut review", steps:["On Desktop 1, highlight the timestamped feedback in Edit notes.","Choose Ask Assistant and request a checklist. Review the result before saving it to Stash.","On Desktop 2, compare the written feedback with the parked soundtrack. Audio analysis and video editing are not connected in this demo."], prompt:"Make a checklist from these edit notes."},
      {title:"Export a readable copy of a note", steps:["Open this Project’s Stash folder and select Project note.md.","Ask for the conversion below, review Save in and choose Convert.","Open the HTML copy. Details → History follows its original note."], prompt:"Convert selected files to HTML in Review"}
    ],
    research: [
      {title:"Summarize the observations", steps:["On Desktop 1, select the four plot observations and the limitations in Note Editor.","Choose Ask Assistant and request a summary. Check it against the saved Field observations document.","Keep the useful reply in Stash. Details → History lets you follow the input later."], prompt:"Summarize these observations and their limitations."},
      {title:"Keep a readable report note", steps:["Open the Project’s Stash folder and select Project note.md.","Ask for an HTML copy, review its destination and choose Convert.","Show in folder reveals the copy. This does not submit the assignment or change the original note."], prompt:"Convert selected files to HTML in Report"}
    ],
    general: [
      {title:"Plan the next trip", steps:["Go to Desktop 2 and highlight the train-ticket and photo-backup reminders in Personal notes.","Choose Ask Assistant and ask for a checklist.","Review the reply and Save to Stash. It stays in General across its desktops."], prompt:"Make a checklist from these reminders."},
      {title:"Convert a saved note", steps:["Keep a note in Stash, then open its folder in File Browser and select the Markdown file.","Choose Ask Assistant and request an HTML copy in Documents/Converted.","Review Save in and choose Convert. Open the result or Show in folder."], prompt:"Convert selected files to HTML in Documents/Converted"}
    ],
    work: [
      {title:"Separate studio planning from project work", steps:["On Desktop 2, select the meeting reminders in Studio planning and choose Ask Assistant.","Ask for a checklist and save the useful result in this Workspace’s Stash.","Switch to Website Launch or Short Film for that Project’s materials. The chat stays in Work; check the input chip before sending another request."], prompt:"Make a checklist from these meeting reminders."}
    ],
    school: [
      {title:"Prepare for the seminar", steps:["On Desktop 2, select the reminders in Class planning and choose Ask Assistant.","Ask for a checklist and keep it in the School Workspace’s Stash.","Switch to Urban Ecology for the four-plot observations and Project-specific examples."], prompt:"Make a checklist from these class reminders."}
    ],
    gaming: [
      {title:"Get ready for co-op", steps:["Go to Desktop 2, highlight the Game night note and choose Ask Assistant.","Ask for a checklist and keep it in Gaming’s Stash.","Return to Desktop 1. F2+F switches Fallout’s Gamescope window between fullscreen and tiling; F2 alone opens Overview while the game stays available."], prompt:"Make a checklist from this game-night plan."},
      {title:"Find the result later", steps:["Open Overview → Timeline in Gaming and find the recent Assistant activity.","Expand Details to see individual actions; Open chat returns to the request.","For a saved reply’s own journey, open Stash → item → Details → History. Other Workspaces keep their activity separate."]}
    ]
  };
  const closedApps = { dolphin: "closed", elisa: "closed", browser: "closed", terminal: "closed", notes: "closed", steam: "closed", game: "closed" };
  const leaf = name => ({ kind: "window", name });
  const defaultAreaDocks = {
    apps: {edge:"left",order:0}, projects: {edge:"left",order:1},
    systems: {edge:"right",order:0}, ai: {edge:"right",order:1}
  };
  // Upgrade only recognisable shipped defaults, retaining edited layouts and sizes.
  function migrateAreaLayout(session) {
    if (!session || session.orientationVersion === 1) return migrateSideAreaLayout(session);
    const next = JSON.parse(JSON.stringify(session));
    const oldDefaults = [
      {apps:["left",0],projects:["left",1],systems:["right",0]},
      {apps:["left",1],projects:["left",0],systems:["right",0]},
      {apps:["left",0],projects:["right",1],systems:["right",0]},
      {apps:["right",0],projects:["left",0],systems:["right",1]}
    ];
    const state = next.state;
    const oldAI = !state?.ai || (state.ai.edge === "bottom" && state.ai.order === 0);
    if (state && oldAI && oldDefaults.some(layout => Object.entries(layout).every(([name,[edge,order]]) => state[name]?.edge === edge && state[name]?.order === order))) {
      next.state = JSON.parse(JSON.stringify(defaultAreaDocks));
    }
    next.orientationVersion = 1;
    return migrateSideAreaLayout(next);
  }
  // Retired top/bottom docks join the matching side after its existing Areas.
  // Horizontal lengths are not usable vertical shares or restore heights.
  function migrateSideAreaLayout(session) {
    const names = Object.keys(defaultAreaDocks);
    const moved = names.filter(name => ["top","bottom"].includes(session?.state?.[name]?.edge));
    if (!moved.length) return session;
    const next = JSON.parse(JSON.stringify(session));
    const order = name => Number(next.state[name]?.order) || 0;
    const sorted = list => list.sort((a,b) => order(a)-order(b) || names.indexOf(a)-names.indexOf(b));
    for (const [oldEdge,edge,width] of [["top","left",310],["bottom","right",300]]) {
      const incoming = sorted(moved.filter(name => next.state[name].edge === oldEdge));
      if (!incoming.length) continue;
      const existing = sorted(names.filter(name => next.state[name]?.edge === edge));
      next.sizes = {...next.sizes};
      if (!existing.length || !Number.isFinite(next.sizes[edge])) next.sizes[edge] = width;
      [...existing,...incoming].forEach((name,index) => { next.state[name] = {...next.state[name],edge,order:index}; });
      incoming.forEach(name => {
        if (next.shares?.[edge]) delete next.shares[edge][name];
        if (next.expandedMain?.[edge]) delete next.expandedMain[edge][name];
        if (next.expanded?.[name]) {
          delete next.expanded[name].top; delete next.expanded[name].bottom;
          if (!Number.isFinite(next.expanded[name][edge])) next.expanded[name][edge] = next.sizes[edge];
        }
      });
    }
    for (const key of ["shares","expandedMain"]) if (next[key]) {
      delete next[key].top; delete next[key].bottom;
    }
    return next;
  }
  const scene = (project, mode, apps, sizes, tree, extras = {}) => ({
    project, mode, apps: { ...closedApps, ...apps }, tree,
    areas: { orientationVersion: 1, state: JSON.parse(JSON.stringify(defaultAreaDocks)), sizes: { left: 280, right: 280, top: 250, bottom: 250, ...sizes },
      hidden: { projects: false, apps: false, systems: false, ai: false },
      manual: { left: true, right: true, top: true, bottom: true }, layoutMode: "manual" }, ...extras
  });
  const scenarios = {
    general: scene(null, null, { dolphin: "open" },
      { left: 68, right: 280 }, leaf("dolphin"), {
        note: "Personal notes\n\nBook the train tickets.\nBack up the holiday photographs.",
        folder: "Home", files: [["Documents", "124 items", "folder"], ["Downloads", "31 items", "folder"], ["Pictures", "231 items", "folder"], ["Music", "18 albums", "folder"], ["Projects", "7 items", "folder"]],
        browser: { title: "Your day", subtitle: "Personal start page", intro: "Mail, the weather and the next trip — a quiet place for everyday browsing.", links: ["Mail", "Weather", "Train tickets", "Reading list"] },
        notifications: [], hiddenWidgets: [false, false]
      }),
    school: scene("research", "study", { browser: "open" },
      { left: 280, right: 280, bottom: 96 }, leaf("browser"), {
        note: "Field observations\n\nRiverside A: 75% shade, 8 species.\nRiverside B: 60% shade, 7 species.\nCourtyard A: 20% shade, 4 species.\nCourtyard B: 35% shade, 5 species.\nCheck watering and ground cover before attributing differences to shade.",
        folder: "Documents/Biology", files: [["Field guide.pdf", "4.2 MiB", "document"], ["Course notes", "12 files", "folder"], ["Reading list.md", "3 KiB", "document"]],
        browser: { title: "Urban habitats & biodiversity", subtitle: "Biology · course reading", intro: "Habitat structure, shade and soil moisture influence the species found in urban green spaces. Compare sites using the same survey method, then record the limits of your sample.", links: ["Course reading", "Sampling methods", "Citation guide", "Assignment brief"] },
        notifications: [["Feedback available", "Biology · your field survey outline", "amber", "i-graduation"]], focus: { running: false, seconds: 1500, visible: true }, hiddenWidgets: [false, true]
      }),
    work: scene("plasma", "prototype", { browser: "open", terminal: "open", dolphin: "minimized" },
      { left: 68, right: 300, bottom: 96 }, { kind: "split", axis: "y", ratio: .58, a: leaf("browser"), b: leaf("terminal") }, {
        note: projects.plasma.note,
        folder: "Projects/website-launch", files: [["src", "24 files", "folder"], ["public", "18 files", "folder"], ["package.json", "2 KiB", "document"], ["README.md", "4 KiB", "document"]],
        browser: { title: "Northstar Studio", subtitle: "Website Launch · local preview", intro: "A compact keyboard for everyday work. A comfortable layout, readable legends and one quiet place for every key. Explore the keyboard and find the layout that fits your desk.", links: ["Explore the keyboard", "Layouts & specifications", "Contact", "Preview checklist"] },
        notifications: [["Review in 15 minutes", "Website Launch · bring the staging preview", "violet", "i-calendar"]], hiddenWidgets: [false, true]
      }),
    gaming: scene(null, null, { browser: "open", elisa: "minimized" },
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
      windowSpec("notes--demo-site-checklist", "notes", 1, {shortTitle:"Launch checklist", note:projects.plasma.note})
    ],
    retold: [
      windowSpec("dolphin--demo-film-footage", "dolphin", 0, {shortTitle:"Footage", folder:projects.retold.root, files:projects.retold.files}),
      windowSpec("notes--demo-film-cut", "notes", 0, {shortTitle:"Edit notes", note:"Short Film · rough cut\n\n00:24 — hold the opening shot longer.\n01:12 — soften the station transition.\n02:06 — lower the music under dialogue.\n\nReview copy: rough-cut.mp4 · 02:48."}),
      windowSpec("browser--demo-film-review", "browser", 1, {shortTitle:"Cut feedback", address:"Review board · Short Film", browser:reading("Rough cut review", "Short Film · feedback", "Collect notes on the 02:48 review copy. Keep the source footage on Desktop 1 while you compare feedback here.", ["Opening scene", "Station transition", "Dialogue mix", "Export checklist"], "Opening feels clear. The station cut at 01:12 needs a softer transition. Export the next preview after checking the dialogue mix.")}),
      windowSpec("elisa--demo-film-soundtrack", "elisa", 1, {shortTitle:"Soundtrack", music:{title:"Station ambience", artist:"Short Film · production audio", tracks:["Station ambience", "Dialogue reference", "Closing theme"]}}, "minimized")
    ],
    research: [
      windowSpec("browser--demo-study-reading", "browser", 0, {shortTitle:"Field guide", address:"Biology · field guide", browser:scenarios.school.browser}),
      windowSpec("notes--demo-study-observations", "notes", 0, {shortTitle:"Observations", note:projects.research.note}),
      windowSpec("dolphin--demo-study-evidence", "dolphin", 1, {shortTitle:"Survey evidence", folder:projects.research.root, files:projects.research.files})
    ]
  };
  const workspaceWindows = {
    general: [windowSpec("dolphin", "dolphin", 0, {shortTitle:"Home", folder:"/home/demo", files:scenarios.general.files}), windowSpec("notes", "notes", 1, {shortTitle:"Personal notes", note:scenarios.general.note})],
    school: [windowSpec("browser", "browser", 0, {shortTitle:"Student portal", address:"School · student portal", browser:reading("This week at school", "School · student portal", "Course announcements, assignment dates and the timetable live in your workspace. Urban Ecology has its own desktops.", ["Timetable", "Assignments", "Course announcements", "Library"], "Biology report due Friday. Bring the field observations to Thursday’s seminar.")}), windowSpec("notes", "notes", 1, {shortTitle:"Class planning", note:"Class planning\n\nThursday — biology seminar.\nFriday — submit the Urban Ecology report.\n\nResearch notes stay in the Urban Ecology project."})],
    work: [windowSpec("browser", "browser", 0, {shortTitle:"Studio desk", address:"Work · studio desk", browser:reading("Studio desk", "Work · daily administration", "Keep everyday studio planning here. Website Launch and Short Film are open beside this workspace, each with its own windows and desktops.", ["Meeting agenda", "Studio inbox", "Shared calendar", "Invoices"], "10:00 — weekly planning. 14:30 — website review. 16:00 — film feedback. Switch project tabs to return to the relevant work.")}), windowSpec("notes", "notes", 1, {shortTitle:"Studio planning", note:"Studio planning\n\nWebsite review — 14:30.\nShort Film feedback — 16:00.\n\nKeep project checklists in their projects."})],
    gaming: [windowSpec("browser", "browser", 0, {shortTitle:"Game library", address:"Gaming · game library", browser:scenarios.gaming.browser}), windowSpec("elisa", "elisa", 0, {shortTitle:"Game-night mix", music:{title:"Evening Light", artist:"Northbound · game-night mix", tracks:["Evening Light", "City Lights", "Blue Horizon"]}}, "minimized"), windowSpec("notes", "notes", 1, {shortTitle:"Co-op planning", note:scenarios.gaming.note})]
  };
  const openProjects = {general:[], school:["research"], work:["plasma","retold"], gaming:[]};
  workspaceWindows.gaming.unshift(windowSpec("game", "game", 0, {shortTitle:"Sanctuary Hills"}), windowSpec("steam", "steam", 0, {shortTitle:"Friends & game tools"}, "minimized"));
  for (const [workspace, example] of Object.entries(scenarios)) {
    example.project = openProjects[workspace][0] || null;
    example.mode = example.project ? "default" : null;
    example.areas.hidden.projects = false;
    example.windows = [{column:"workspace", windows:workspaceWindows[workspace]}, ...openProjects[workspace].map(column=>({column, windows:projectWindows[column]}))];
    example.apps = {...closedApps};
    example.windows.forEach(column=>column.windows.forEach(window=>{example.apps[window.id]=window.state;}));
  }
  Object.assign(scenarios.general.areas.sizes,{left:280,right:70});
  scenarios.general.areas.state.systems={edge:'left',order:2};
  Object.assign(scenarios.general.areas.hidden,{projects:true,ai:true});
  scenarios.general.areas.preferred={apps:'expanded',projects:'expanded',systems:'rail',ai:'rail'};
  scenarios.school.areas.sizes = {left:280,right:280,top:250,bottom:250};
  scenarios.work.areas.sizes = {left:280,right:280,top:250,bottom:250};
  scenarios.work.notifications = [["Website review · 14:30", "Website Launch · preview and checklist", "violet", "i-calendar"], ["Rough cut ready", "Short Film · feedback on Desktop 2", "green", "i-video"]];

  function demoWindowTree(windows) {
    return tiling.rowMajor(windows.map(window => window.id), {width:1000,height:900}, () => ({width:400,height:300}));
  }

  function migrateDemoWindowOrder(storage) {
    const key = "spatial-demo-window-order-v1";
    if (storage.getItem(key) === "1") return false;
    const layouts = JSON.parse(storage.getItem("spatial-split-layouts-v1") || "{}");
    for (const [workspace, example] of Object.entries(scenarios)) for (const column of example.windows) {
      for (const page of new Set(column.windows.map(window => window.page))) {
        const windows = column.windows.filter(window => window.page === page && window.state === "open");
        const prefix = column.column === "workspace" ? workspace+":desktop:" : workspace+":project-column:"+column.column+":desktop:";
        const session = layouts[prefix+page+":1"];
        const previous = windows.reduce((root,window) => root ? {kind:"split",axis:"y",ratio:.5,a:root,b:leaf(window.id)} : leaf(window.id), null);
        // Update only the exact shipped layout; keep manually rearranged sessions.
        if (session && JSON.stringify(session.root) === JSON.stringify(previous)) session.root = demoWindowTree(windows);
      }
    }
    storage.setItem("spatial-split-layouts-v1", JSON.stringify(layouts));
    storage.setItem(key, "1");
    return true;
  }

  function seedWorkspaces(storage) {
    const versionKey = "spatial-demo-scenes-v1";
    if (storage.getItem(versionKey) === "4") { migrateDemoWindowOrder(storage); seedGamingOverlay(storage); seedGamingParent(storage); seedGeneralAreas(storage); return false; }
    const keys = ["spatial-workspace-app-states-v1", "spatial-workspace-area-layouts-v1", "spatial-workspace-project-states-v1", "spatial-workspace-area-contents-v1", "spatial-split-layouts-v1", "spatial-workspace-window-layouts-v1", "spatial-workspace-display-assignments-v1", "spatial-desktop-pages-v1", "spatial-open-projects-v1", "spatial-independent-sessions-v1", "spatial-project-window-sessions-v1"];
    const backup = Object.fromEntries(keys.map(key=>[key,storage.getItem(key)]));
    const values = Object.fromEntries(keys.map(key=>[key,JSON.parse(storage.getItem(key)||"{}") ]));
    const rawProjects = storage.getItem("spatial-project-spaces-v2");
    const savedProjects = rawProjects === null ? JSON.parse(JSON.stringify(projects)) : JSON.parse(rawProjects || "{}");
    if (Object.keys(savedProjects).length && !savedProjects.research && !storage.getItem(versionKey)) savedProjects.research = JSON.parse(JSON.stringify(projects.research));
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
      const fileFields = content?.frames?.dolphin;
      const oldDefaultPaths = ["/home/demo/Downloads", workspace === "general" ? "/home/demo" : "/home/demo/Workspaces/" + workspace[0].toUpperCase() + workspace.slice(1) + "/" + example.folder];
      if (fileFields && oldDefaultPaths.includes(fileFields[0]?.value)) fileFields[0].value = workspaceWindows[workspace].find(w=>w.base==="dolphin")?.content.folder || "/home/demo/Workspaces/" + workspace[0].toUpperCase() + workspace.slice(1);
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
          const tree = demoWindowTree(windows);
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
    storage.setItem(versionKey,"4");
    seedGamingOverlay(storage);
    seedGamingParent(storage);
    seedGeneralAreas(storage);
    return true;
  }

  // Adopt the new General opening layout once, retaining deliberate edits.
  function seedGeneralAreas(storage) {
    const marker='spatial-demo-general-areas-v1',key='spatial-workspace-area-layouts-v1';
    if(storage.getItem(marker)==='2')return false;
    const layouts=JSON.parse(storage.getItem(key)||'{}'),saved=layouts.general;
    const previousSizes={left:68,right:280,top:250,bottom:250};
    const previousStates={apps:'rail',projects:'rail',systems:'expanded',ai:'expanded'};
    const assignments=JSON.parse(storage.getItem('spatial-workspace-display-assignments-v1')||'{}').general?.areas||{};
    const original=!saved || saved.layoutMode==='manual'
      && Object.entries(defaultAreaDocks).every(([name,dock])=>saved.state?.[name]?.edge===dock.edge&&saved.state[name].order===dock.order&&!saved.hidden?.[name])
      && Object.entries(previousSizes).every(([edge,size])=>(saved.sizes?.[edge]===size||edge==='right'&&saved.sizes?.right===300)&&saved.manual?.[edge]===true)
      && Object.entries(saved.preferred||{}).every(([name,state])=>previousStates[name]===state)
      // The Assistant's minimum width fitted the former 280px dock to 300px.
      && Object.values(saved.expanded||{}).every(edges=>Object.entries(edges).every(([edge,size])=>edge==='right'&&[280,300].includes(size)));
    const previousOpening=saved?.layoutMode==='manual'
      && Object.entries(defaultAreaDocks).every(([name,dock])=>saved.state?.[name]?.edge===dock.edge&&saved.state[name].order===dock.order)
      && Object.entries(scenarios.general.areas.hidden).every(([name,hidden])=>saved.hidden?.[name]===hidden)
      && Object.entries(scenarios.general.areas.sizes).every(([edge,size])=>saved.sizes?.[edge]===size&&saved.manual?.[edge]===true)
      && Object.entries(scenarios.general.areas.preferred).every(([name,state])=>saved.preferred?.[name]===state)
      && Object.entries(saved.expanded||{}).every(([name,edges])=>name==='apps'&&Object.entries(edges).every(([edge,size])=>edge==='left'&&size===280))
      && Object.values(saved.shares||{}).every(shares=>!Object.keys(shares).length);
    const adopt=(original||previousOpening)&&Object.values(assignments).every(display=>display===1);
    if(adopt){
      layouts.general=JSON.parse(JSON.stringify(scenarios.general.areas));
      storage.setItem(key,JSON.stringify(layouts));
    }
    storage.setItem(marker,'2');
    return Boolean(adopt);
  }

  // Change only the shipped opening view once. User-chosen later pages,
  // Project ownership, closed apps and subsequent visits remain their own.
  function seedGamingParent(storage) {
    const key='spatial-demo-gaming-parent-v1';
    if(storage.getItem(key))return false;
    const pages=JSON.parse(storage.getItem('spatial-desktop-pages-v1')||'{}');
    const layouts=JSON.parse(storage.getItem('spatial-split-layouts-v1')||'{}');
    const gaming=pages.gaming;
    if(gaming?.windows?.game===0 && (!gaming.owners?.game || gaming.owners.game==='workspace')) {
      if((!gaming.activeColumn || gaming.activeColumn==='workspace') && !gaming.active && gaming.activeFullscreen?.workspace==='game') delete gaming.activeFullscreen.workspace;
      const initial=layouts['gaming:desktop:0:1']?.fullscreen;
      if(initial?.name==='game' && !initial.bonded) initial.startOnParent=true;
      storage.setItem('spatial-desktop-pages-v1',JSON.stringify(pages));
      storage.setItem('spatial-split-layouts-v1',JSON.stringify(layouts));
    }
    storage.setItem(key,'1');return true;
  }

  // Add only the new Gaming examples to an existing demo. Never reseed its
  // other windows, projects, page selection, notes, or Area preferences.
  function seedGamingOverlay(storage) {
    const key="spatial-demo-steam-v1";
    if(storage.getItem(key))return false;
    const read=key=>JSON.parse(storage.getItem(key)||'{}');
    const states=read('spatial-workspace-app-states-v1'),pages=read('spatial-desktop-pages-v1'),layouts=read('spatial-split-layouts-v1'),independent=read('spatial-independent-sessions-v1');
    states.gaming ||= {};pages.gaming ||= {active:0,activeColumn:'workspace',columns:{},migrated:true,columnsMigrated:true};
    pages.gaming.windows ||= {};pages.gaming.owners ||= {};independent.membership ||= {};independent.membership.gaming ||= {};
    const freshGame=!Object.hasOwn(states.gaming,'game');
    for(const [id,state] of [['game','open'],['steam','minimized']]){
      if(Object.hasOwn(states.gaming,id))continue;
      states.gaming[id]=state;pages.gaming.windows[id]=0;pages.gaming.owners[id]='workspace';independent.membership.gaming[id]=null;
    }
    if(freshGame){
      const session=layouts['gaming:desktop:0:1'] ||= {root:null,parked:{},floating:{}};
      if(!tiling.contains(session.root,'game'))session.root=session.root?{kind:'split',axis:'x',ratio:.5,a:session.root,b:leaf('game')}:leaf('game');

    }
    for(const [key,value] of [['spatial-workspace-app-states-v1',states],['spatial-desktop-pages-v1',pages],['spatial-split-layouts-v1',layouts],['spatial-independent-sessions-v1',independent]])storage.setItem(key,JSON.stringify(value));
    storage.setItem(key,'1');return true;
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
    const before = legacy[id] || previousPublicProjects[id];
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
      if (same(next[field], before[field]) || same(next[field], priorWorkflowProjects[id]?.[field])) next[field] = after[field];
    }
    // Replace individual default rows while keeping additions, removals and edits.
    for (const field of ["files", "resources"]) {
      if (!Array.isArray(next[field])) continue;
      next[field] = next[field].map(row => {
        if(id==='research'&&field==='files'&&same(row,['field-observations.csv','Three survey sites','document']))return JSON.parse(JSON.stringify(after.files[0]));
        let index = before[field].findIndex(original => same(row, original));
        if (index < 0) index = previousPublicProjects[id]?.[field]?.findIndex(original => same(row, original)) ?? -1;
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

  function migrateBrowserPage(page) {
    const oldIntro='Thoughtful spaces for everyday life. A small architecture studio creating useful, welcoming places — from the first sketch to the last detail.';
    if(!page||page.address!=='http://localhost:5173/'||page.title!=='Northstar Studio'||page.intro!==oldIntro||page.detail!==oldIntro||JSON.stringify(page.links)!==JSON.stringify(['Our projects','About the studio','Contact','Preview checklist']))return page;
    const current=scenarios.work.browser;
    return {...page,intro:current.intro,detail:current.intro,links:[...current.links]};
  }

  function migrateNote(value) {
    const renamedDefaults = {
      "Review the homepage copy, check the mobile layout, then share the preview for feedback.": projects.plasma.note,
      "Research question: how does shade affect plant diversity?\n\nCompare the riverside and courtyard samples. Cite the field guide before writing the conclusion.": projects.research.note,
      "Field observations\n\nRiverside: 14 plant species, mostly shaded.\nCourtyard: 8 species, direct sunlight.\nCheck whether sampling effort was equal.": projects.research.note,
      "Launch checklist\n\nConfirm the contact form.\nCheck keyboard navigation.\nSend the staging link for review.": projects.plasma.note,
      "Class planning\n\nThursday — biology seminar.\nFriday — submit the Urban Ecology report.\n\nResearch notes stay in the Urban Ecology column.": workspaceWindows.school.find(window => window.base === "notes").content.note,
      "Studio planning\n\nWebsite review — 14:30.\nShort Film feedback — 16:00.\n\nKeep project checklists in their project columns.": workspaceWindows.work.find(window => window.base === "notes").content.note
    };
    if (Object.hasOwn(renamedDefaults, value)) return renamedDefaults[value];
    return value === legacyNote ? note : value;
  }

  return { projects, assistantWorkflows, reviewNotes, scenarios, projectWindows, workspaceWindows, seedWorkspaces, defaultAreaDocks, migrateAreaLayout, migrateSideAreaLayout, note, migrateProject, migrateNote, migrateBrowserPage };
});

