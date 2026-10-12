# Spatial Desktop

**A tactile, project-centred computing environment.**

**Work in progress.** An experimental browser prototype with simulated apps, files and system integrations. The design and interactions are still evolving.

Spatial Desktop organises work around separate Workspaces, Projects and docked Areas. It explores a desktop where windows, useful app controls and project resources share the screen, and where users can find their work through its place and context.

[Try the demo](https://xefensor.github.io/spatial-desktop/) · [Start the guide](https://xefensor.github.io/spatial-desktop/?guide=start) · [Design philosophy](https://xefensor.github.io/spatial-desktop/philosophy.html) · [Detailed reference](docs/prototype-reference.md)

The [design philosophy](https://xefensor.github.io/spatial-desktop/philosophy.html) includes focused interface crops, labelled diagrams and clearly marked historical screenshots.

## Try it

New visitors start with an empty desktop and the optional **Desktop Guide**. It teaches interactions through hands-on tasks. You can also choose a clean desktop or populated demo scenes for General, School, Work and Gaming.

Existing sessions restore their browser-local state. Repeating the guide uses isolated practice storage and offers a return to the original session. Explicitly choosing a clean or demo setup replaces the current session.

The host operating system may intercept Super/Windows shortcuts. The prototype provides Alt+number as a fallback for window shortcuts.

## What it explores

- **Numbered windows:** the Apps hotbar and window title bars share the same number. Numbers follow the visible layout, including after moving or retiling a window. Title-bar numbers are plain text, without a box. Separate app instances have separate slots.
- **Readable tiling:** new windows fill rows from left to right, then top to bottom. The first two form side-by-side vertical halves when space permits. Setup demo scenes use the same order. Minimum app sizes and floating obstacles still determine what fits; excess windows can be parked.
- **Useful parked apps:** put a window into the Apps Area and keep its relevant controls available without occupying the canvas. Expanded Apps shows open-window icons above useful parked cards. Its rail shows open icons first and parked icons below. Parked apps remain available across desktops within their owning Workspace or Project.
- **Projects and desktops:** several Projects can stay open. Each has its own folder, windows and vertical desktops. Switch sideways between Workspace and Projects, and vertically between desktops. Project windows and their placement save automatically; no manual save-place step is required. Move a window between those contexts or detach it from a Project.
- **Separate Workspaces:** each restores its own Home folders, app sessions and browser history, media-player state, Area layout, project context, Stash, activity and local plans. These are prototype contexts, not operating-system security boundaries.
- **Four docked Areas:** Apps, Workspace & Projects, System and AI. Resize or reposition them with their handles, collapse them to rails, or hide and restore them. Visibility and layout are saved per Workspace.
- **Overview and Timeline:** find apps, windows, projects and system tools; compare local desktop activity with calendar events, tasks and reminders on a shared time axis.
- **Project Stash and AI:** save explicit notes, links and files with their sources, and attach them to a scripted AI conversation. The AI Area illustrates provenance and working folders; no model or AI provider is connected.

## Main controls

| Action | Control |
| --- | --- |
| Open or close Overview | Super / Windows, the Workspace icon in Apps, or Ctrl+Space / Alt+Space |
| Select a window in slots 1–10 | Super+1–9,0; Alt+number fallback |
| Select a window in slots 11–20 | Super+Shift+1–9,0; Alt+Shift+number fallback |
| Create another app instance | Shift+click its hotbar icon |
| Tile a window | Drag its title bar with the left mouse button |
| Float a window | Middle-button drag, or Alt+left-button drag |
| Switch vertical desktops | Scroll when no window is focused; Super+scroll from a window or Area |
| Switch between Workspace and Projects | Context-strip entries or Shift+scroll with window focus released; Super+Shift+scroll from a window or Area |
| Carry a window to another desktop or Project | Hold its title bar with the left button and scroll; add Shift to switch Projects |
| Maximize / restore | Left-click the maximize control, or double-click the title bar |
| Fullscreen / restore | Middle-click the maximize control; Escape leaves Fullscreen |
| Open AI | Its header or Super+A |
| Change Areas | Drag their header / inner border; use the context menu or Overview → System to hide/show |

Click the desktop background or an Area to release window focus before ordinary desktop scrolling. Slots after the first twenty remain clickable; this prototype binds two keyboard banks.

Window shortcut activation depends on state: it focuses or restores the window, and parks the currently focused window when invoked again. OS-reserved shortcuts remain subject to the browser and host desktop.

## Maximize, Fullscreen and two displays

Maximize fills the canvas between Areas. Fullscreen uses the entire display. Other windows can move temporarily to the second demo display when they fit without parking its existing apps; otherwise they park. Restore returns automatically transferred or parked peers, while respecting explicit moves, closing and parking. Fullscreen also moves Areas when the other display has capacity, or temporarily hides them and restores them on exit.

The two-display demo uses separate browser windows on the same origin and profile. It does not control native monitors or KWin windows.

## Materials

Primary app windows use opaque ABS plastic with rounded silhouettes and controls. Main app content stays solid and readable. Structural content joins remain flat; the shortcut number is unframed text. Secondary Areas and transient surfaces use square acrylic/glass geometry. App colours communicate identity, and persistent light lines distinguish toggles from momentary buttons.

See the [material and workflow reference](docs/prototype-reference.md) and [UI notes](docs/ui-ux-review.md).

## Run locally

No build step or npm dependencies are required:

```sh
python3 -m http.server 8000 --directory dist
```

Open **http://localhost:8000**. Serve over HTTP rather than opening `index.html` directly. Browser storage is isolated by origin; use another port or browser profile to explore historical versions without reusing the current session. Two browser windows on the same origin and profile can simulate separate displays.

## Development and publishing

Make source and documentation changes in this repository. The [GitHub Pages workflow](.github/workflows/pages.yml) checks JavaScript and the regression suites, then publishes `dist/` after a push to `main`. In repository Settings → Pages, the publishing source must be **GitHub Actions**.

| Path | Purpose |
| --- | --- |
| `dist/index.html` | Desktop entry point |
| `dist/desktop-shell.js` / `.css` | Desktop behaviour and appearance |
| `dist/spatial-tiling.js` | Tiling, reading-order placement and floating obstacles |
| `dist/app-tools.js`, `app-windows.js`, `app-windows.css` | Persistent simulated app sessions and controls |
| `dist/demo-examples.js` | Example scenes and migration of shipped defaults |
| `dist/philosophy.*` | Design philosophy and workflow explanations |
| `scripts/check-*.cjs` | Automated regression checks |
| `docs/` | Detailed reference, research and historical reports |

Run the checks used by the publishing workflow:

```sh
for file in dist/*.js; do node --check "$file" || exit 1; done
for file in scripts/check-*.cjs; do node "$file" || exit 1; done
```

## Scope and evidence

Apps, commands, files, calendars, AI replies and system actions demonstrate interaction models. They do not replace native applications or OS integrations. The mock browser does not embed external websites, the mock terminal does not execute native commands, and prototype files do not write into native Home or Project directories. State is stored in the browser. Bundled reference media retain their individual credits and licences in the [illustrated philosophy](dist/philosophy.html) and [image metadata](dist/images/philosophy/credits.json).

- [Prototype reference](docs/prototype-reference.md): detailed current behaviour and persistence.
- [UI and UX notes](docs/ui-ux-review.md): current layout and material conventions.
- [Documentation audit, 12 October 2026](docs/documentation-audit-2026-10-12.md): corrections, source evidence, project decisions and verification limits.
- [Workflow audit, 7 October 2026](docs/workflow-audit-2026-10-07.md) and [CSV matrix](docs/workflow-matrix-2026-10-07.csv): 100 researched scenarios and tradeoffs.
- [Testing report, 7 October 2026](docs/testing-2026-10-07.md): checks and limitations at that date; historical evidence, not a claim that every later revision received browser or hardware testing.
- [Source history](docs/history/README.md): the 153 imported source snapshots, their SHA mapping and the original Git bundle. Development continues in normal commits after that imported history.
