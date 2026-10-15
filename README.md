# Spatial Desktop

**A tactile, project-centred computing environment — work in progress.**

Spatial Desktop is a browser prototype exploring a desktop built around Workspaces, Projects and useful docked Areas. It is designed by Xef and developed through ongoing experiments.

[Try the desktop](https://xefensor.github.io/spatial-desktop/) · [Design philosophy by Xef](https://xefensor.github.io/spatial-desktop/philosophy.html) · [Start Desktop Guide](https://xefensor.github.io/spatial-desktop/?guide=start)

![Spatial Desktop: Website Launch with Apps and a parked Terminal on the left, Web Browser in the centre, Workspace & Projects with Stash, and System and AI on the right](docs/images/desktop-2026-10-12.jpg)

*Actual browser capture, 12 October 2026. Work workspace / Website Launch / Desktop 1. All four Areas are visible; Terminal is parked as a useful app card.*

## The idea

- Windows tile automatically and share numbered shortcuts with the Apps hotbar. Each title bar shows its number; new windows open left to right, then top to bottom, with four preferring a 2×2 grid when they fit.
- Park apps as useful cards instead of hiding their work. Float a window when placement matters.
- Projects keep their own folders, windows and vertical desktops, and resume automatically. Workspaces separate broader contexts such as personal life, study and work.
- Apps, Workspace & Projects, System and Assistant remain in docked Areas that can expand, become rails or be hidden.
- Stash keeps notes, sources and files. Overview and Timeline help find work and its context.
- System follows the same near-to-wide order as Apps: current-desktop requests, current-project plans, Workspace notifications/focus/calendar, then shared alerts, other Workspaces, clock, devices and machine controls. The rail keeps that order too.
- Overview's **System** tab mirrors the System Area's scope order. It holds local notifications, shared system alerts and other Workspaces' unread badges. New foreign arrivals only light their icon and update the count; click to preview without switching context. Steam remains separately grouped on the right. Background apps share the bottom Apps row across Workspaces.
- Borderless games use a fixed-resolution virtual screen that can fill the display or tile on its original desktop. Win+D (F2+D in the browser) tiles the fullscreen game; Overview offers both presentations. Steam contributes local chats, guides and notes.

Firefox and Steam show read-only window previews when parked; apps with a parking widget keep their interactive controls.
App-owned dialogs park directly below their app preview as a connected group. Try Firefox's **Save page as…** from its menu or **Ctrl+S**, then park Firefox; restoring either card brings back both the window and its waiting dialog.
**Save in** groups that window's default location, Project folders and Workspace Home folders. The choice applies to one file. Desktop context menus follow the same near-to-wide order, with named Project actions, Workspace Home/Settings and shared system Settings.
Use **Hide preview** in a window or parked card's context menu to show only its app identity and a restore placeholder. Attached dialog content is hidden too, while **Needs input** stays visible. The choice saves per window; **Show preview** restores its preview or parking widget.
Left-click **Close** closes the window while needed activity can continue; middle-click **Close** force quits that app instance and stops its activity. Background-only apps appear as small icons at the bottom of Apps, below open windows and parked cards. Try playing Music Player or starting Steam's local demo update, then close its window.

Desktop Guide introduces these interactions through 32 steps across 14 chapters, including independent app windows, quick launch from an empty desktop and switching a borderless virtual screen between fullscreen and tiled presentation on its original desktop. The [design philosophy](https://xefensor.github.io/spatial-desktop/philosophy.html) is Xef’s own unfinished text, being written one topic at a time.

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
