# Spatial Desktop

**A tactile, project-centred computing environment — work in progress.**

A browser prototype designed by Xef, exploring Workspaces, Projects, tiled windows and movable panels with live widgets.

[Try the desktop](https://xefensor.github.io/spatial-desktop/) · [Desktop Guide](https://xefensor.github.io/spatial-desktop/?guide=start) · [Design philosophy by Xef](https://xefensor.github.io/spatial-desktop/philosophy.html)

![Earlier Spatial Desktop design with tiled apps and four Areas](docs/images/desktop-2026-10-12.jpg)

*Historical capture from 12 October 2026, before the panel and widget redesign.*

## Try the workflow

- **Open and arrange apps.** Windows tile automatically, with numbers in their title bars. Park a window as an app card, or float it when placement matters. Supported apps can open independent instances.
- **Keep work together.** Projects have a folder, windows and desktop stack. Workspaces separate broader contexts, including their own Home folders and app data. Background services are system-wide.
- **Arrange your tools.** Panels contain live widgets such as Apps, Files, Assistant, Clock and System controls. Compact and expanded panels keep the same order and actions. Click an icon for temporary content, or use **Keep expanded**. Right-click a panel → **Edit layout** to move widgets, add Spacers and arrange panels. Resize the panel at its border; layouts save per Workspace.
- **Work with files.** Create a note, save it to a folder and reopen it. Rename, copy, move or recover files from Trash. Clipboard history stays private to each Workspace. Pack a Project as a ZIP that also gathers linked local files.
- **Ask Assistant.** Highlight text or select files, then use **Ask Assistant** or **F2+A**. Try `Summarize this note.`, `Make a checklist from this note.` or `Draft a note from this text.`; attach two sources for `Compare these two sources.` Replies follow fixed local rules. Reviewed conversions create actual browser-local files. Drafts and results use the Workspace or Project’s **Assistant** folder.
- **Find your place.** **F2 / Super** opens Overview and search. Its horizontal tabs are **Windows**, **Apps**, **Projects & Files**, **Timeline** and **System**. **Meta+Tab / F2+Tab** opens the desktop map.
- **Use another display.** Choose **Extended workspace** to follow the current desktop, or **Side space** to keep windows in place. Both use the same panels and widgets. In Side space, the Assistant widget’s **Allow Assistant to use this display** switch grants optional control for that display and Workspace. Turning it off pauses work without clearing anything.

**System → Devices & session** adds network choice, device pairing, sound, a sample USB transfer and session controls. **Do Not Disturb** quiets alerts while retaining them.

Settings is a normal app window, available from System controls and Overview/search. General starts with four everyday Quick launch favorites; saved custom favorites remain intact. Desktop Guide introduces the interactions through short lessons and searchable topics. Lessons keep their main task visible, with expandable help for details and examples. The introduction uses a practice desktop and offers to restore your earlier session when you finish.

## Useful details

Firefox and Steam show previews when parked; integrated apps can expose live parking controls. Waiting dialogs stay attached to their app. **Hide preview** keeps private content out of previews and the desktop map.

Left-click **Close** closes the window while needed activity may continue in the background; middle-click force quits that instance. Background apps stay available at the bottom of Apps across Workspaces.

Fallout demonstrates a Gamescope-style fixed-resolution screen that can tile or fill the display. **Meta+F / F2+F** switches between them; **Meta+D / F2+D** tiles it. Steam adds local chats, guides and notes, with separate data per Workspace.

The interface uses opaque ABS for app content and translucent glass for panels, widgets and menus. Optional explanations live in Details; current scope, important state and action feedback remain visible.

[Panels and widgets](docs/panels-and-widgets.md) · [Full controls and prototype reference](docs/prototype-reference.md) · [UI and UX notes](docs/ui-ux-review.md)

## Run locally

The website needs no build step or runtime packages:

```sh
python3 -m http.server 8000 --directory dist
```

Open **http://localhost:8000**. State is saved in browser storage. Use another port or browser profile for an isolated session.

## Develop

Source lives in `dist/`; checks live in `scripts/`. Pushes to `main` run the [GitHub Pages workflow](.github/workflows/pages.yml) and publish `dist/`.

[Agent instructions](AGENTS.md) record Xef's default workflow: verify requested project changes, commit and push them to GitHub unless he explicitly asks for a preview without publishing.

Install the development-only DOM test dependency first with `npm ci`.

```sh
for file in dist/*.js; do node --check "$file" || exit 1; done
for file in scripts/check-*.cjs; do node "$file" || exit 1; done
```

[Controls and prototype reference](docs/prototype-reference.md) · [UI notes](docs/ui-ux-review.md) · [Source history](docs/history/README.md)

This is an interaction prototype with simulated apps, folders and system actions. Assistant replies are scripted; calendars and plans are local. Native OS integration remains future work. Reference media retain their individual [credits and licences](dist/images/philosophy/credits.json).
