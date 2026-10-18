# Spatial Desktop

**A tactile, project-centred computing environment — work in progress.**

A browser prototype designed by Xef, exploring Workspaces, Projects, tiled windows and useful docked Areas.

[Try the desktop](https://xefensor.github.io/spatial-desktop/) · [Desktop Guide](https://xefensor.github.io/spatial-desktop/?guide=start) · [Design philosophy by Xef](https://xefensor.github.io/spatial-desktop/philosophy.html)

![Spatial Desktop with tiled apps and all four Areas](docs/images/desktop-2026-10-12.jpg)

*Browser capture from 12 October 2026. This earlier design uses the names Stash and AI; the current Areas are Files and Assistant.*

## Try the workflow

- **Open and arrange apps.** Windows tile automatically, with numbers in their title bars. Park a window as an app card, or float it when placement matters. Supported apps can open independent instances.
- **Keep work together.** Projects have a folder, windows and desktop stack. Workspaces separate broader contexts, including their own Home folders and app data. Background services are system-wide.
- **Keep tools nearby.** Apps, Files, System and Assistant can be Expanded, Compact or Hidden. Drag an Area’s edge or its shared divider to resize it. Push through the minimum to snap to Compact; layouts save per Workspace.
- **Work with files.** Browse folders, create notes, pin material and inspect its history. Captured text, media, references and copies live in ordinary Project or Workspace folders. Pack a Project as a ZIP that also gathers linked local files.
- **Ask Assistant.** Highlight text or select files, then use **Ask Assistant** or **F2+A**. Inputs stay attached to the request; reviewed conversions create actual browser-local files. Drafts and results use the Workspace or Project’s **Assistant** folder.
- **Find your place.** **F2 / Super** opens Overview and search. Its horizontal tabs are **Windows**, **Apps**, **Projects & Files**, **Timeline** and **System**. **Meta+Tab / F2+Tab** opens the desktop map.
- **Use another display.** Choose **Extended workspace** to follow the current desktop, or **Side space** to keep windows in place. Both use the normal docked Areas. In Side space, the Assistant Area’s **Allow Assistant to use this display** switch grants optional control for that display and Workspace. Turning it off pauses work without clearing anything.

Settings is a normal app window, available from Quick launch, search and the System gear. Desktop Guide introduces the interactions through short lessons and searchable, expandable topics.

## Useful details

Firefox and Steam show previews when parked; integrated apps can expose live parking controls. Waiting dialogs stay attached to their app. **Hide preview** keeps private content out of previews and the desktop map.

Left-click **Close** closes the window while needed activity may continue in the background; middle-click force quits that instance. Background apps stay available at the bottom of Apps across Workspaces.

Fallout demonstrates a Gamescope-style fixed-resolution screen that can tile or fill the display. **Meta+F / F2+F** switches between them; **Meta+D / F2+D** tiles it. Steam adds local chats, guides and notes, with separate data per Workspace.

The interface uses opaque ABS for app content and translucent glass for Areas and menus. Optional explanations live in Details; current scope, important state and action feedback remain visible.

[Full controls and prototype reference](docs/prototype-reference.md) · [UI and UX notes](docs/ui-ux-review.md)

## Run locally

No build step or npm dependencies:

```sh
python3 -m http.server 8000 --directory dist
```

Open **http://localhost:8000**. State is saved in browser storage. Use another port or browser profile for an isolated session.

## Develop

Source lives in `dist/`; checks live in `scripts/`. Pushes to `main` run the [GitHub Pages workflow](.github/workflows/pages.yml) and publish `dist/`.

[Agent instructions](AGENTS.md) record Xef's default workflow: verify requested project changes, commit and push them to GitHub unless he explicitly asks for a preview without publishing.

```sh
for file in dist/*.js; do node --check "$file" || exit 1; done
for file in scripts/check-*.cjs; do node "$file" || exit 1; done
```

[Controls and prototype reference](docs/prototype-reference.md) · [UI notes](docs/ui-ux-review.md) · [Source history](docs/history/README.md)

This is an interaction prototype with simulated apps, folders and system actions. Assistant replies are scripted; calendars and plans are local. Native OS integration remains future work. Reference media retain their individual [credits and licences](dist/images/philosophy/credits.json).
