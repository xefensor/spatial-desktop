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
    "root": "/home/demo/Projects/website-launch",
    "originWorkspace": "general",
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
    const currentExample = project.name === after.name && project.root === after.root;
    if (!unchangedExample && !currentExample) return project;
    const next = JSON.parse(JSON.stringify(project));
    if (unchangedExample) {
      next.name = after.name;
      next.root = after.root;
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

  return { projects, note, migrateProject, migrateNote };
});
