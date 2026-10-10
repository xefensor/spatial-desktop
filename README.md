# Spatial Desktop

**A tactile, project-centred computing environment.**

**Work in progress (WIP).** The design, interactions and documentation are still evolving. This is an experimental browser prototype with simulated apps and integrations.

Spatial Desktop is an interactive browser prototype of a desktop organised around workspaces, projects and docked Areas. It explores how windows, useful app widgets and system tools can share the screen without a conventional taskbar.

[Live demo](https://xefensor.github.io/spatial-desktop/) · [Design philosophy](https://xefensor.github.io/spatial-desktop/philosophy.html)

![Spatial Desktop overview with Website Launch and Short Film example projects](docs/images/overview.jpg)

## Run locally

No build step or npm dependencies are required. From the repository root:

```sh
python3 -m http.server 8000 --directory dist
```

Open **http://localhost:8000**, then use the browser's fullscreen command. In JetBrains IDEA, open this folder as a project and run the same command in its terminal.

Serve the files over HTTP rather than opening `index.html` directly. Browser storage saves demo state for each origin. To test an older version without reusing the current version's state, serve it on a different port or use a separate browser profile.

## Publish on GitHub Pages

The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) checks the JavaScript and runs the existing layout/interaction checks, then publishes only `dist/`. It runs on pushes to `main` and can also be started manually.

### One-time setup

1. Open [Settings → Pages](https://github.com/xefensor/spatial-desktop/settings/pages).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open [the publishing workflow](https://github.com/xefensor/spatial-desktop/actions/workflows/pages.yml) and choose **Run workflow** on `main`, or rerun the failed deployment after enabling Pages.

Once deployment succeeds, the default site address is **https://xefensor.github.io/spatial-desktop/**. The workflow's deployment environment also shows the actual published URL.

The workflow uses GitHub's built-in token; no custom deployment secret or personal access token is needed after the one-time Pages setup. Deployment fails with `Get Pages site failed / Not Found` when Pages are not enabled or available for the repository.

GitHub documentation: [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Explore the desktop

- **Apps Area:** launch apps, use the numbered app hotbar and control parked windows through live cards.
- **Project Area:** organise a project folder, linked resources, notes, quick launches and saved window arrangements. Each open Project has its own desktops and windows; several Projects can stay open at once.
- **System Area:** keep relevant system widgets and notifications visible.
- **Overview:** access workspaces, projects, apps and system tools together. The Super/Windows key works when the browser receives it; the operating system may intercept it.
- **Windows:** ordinary dragging uses the tiled layout. Middle-button dragging or Alt + left-button dragging enables manual floating movement. New tiled windows try to avoid floating windows.
- **Areas:** resize and reposition docked Areas using their handles. Actual app fullscreen can temporarily move Areas to a second display when space permits.
- **Two displays:** open the same local URL in two browser windows and use the prototype's display assignment controls. Synchronisation requires the same browser profile and origin; it is a simulation rather than access to native monitor/window management.

## Demonstration examples

New visitors begin on an empty desktop with **Spatial Guide**. The optional hands-on introduction reveals the System Area, Apps Area, tiling and middle-drag floating, app search in Overview, bounded and true full screen, early Area resizing, parking and rail use, vertical desktops, creating an empty project and opening its own windows, project switching, creating your own empty workspace and exploring its Home folders in that order. Learners choose their apps throughout: tiling, floating, full screen, parking and project windows work with any supported app or instance. Search accepts any matching app, System practice accepts any quick setting, and Home-folder practice accepts any standard folder in the new workspace. The Guide remembers the selected window when a later action depends on it. Visible task checklists check actual desktop actions. The Guide remembers the learner’s expanded or compact view. It only temporarily compacts an expanded Guide when it obstructs an interaction. Each task can be skipped individually; the following task receives any missing prerequisites. Contextual recovery explains closed or parked windows, wrong full-screen modes and misplaced workspace/project contexts, with an action to get back on track. A final task combines opening an app inside a project, parking it and returning to the ordinary desktop without target highlights. Overview exposes only the sections already introduced. Finishing or leaving the introduction offers a clean desktop (General only, no apps or projects), the populated four-workspace demo, or keeping the learner’s own work. New workspace creation remains available in Overview outside the Guide. New project creation opens inside the Project Area, including when that Area starts on a rail.

Find **Spatial Guide** again in Overview → Applications → Help, or search for its name. Its searchable reference explains each topic, can highlight the corresponding desktop control, and offers a single-chapter practice session with the prerequisites already prepared. A chapter ends immediately after its own task; the complete introduction still teaches every part in the original continuous order. Repeating the introduction uses separate practice storage and offers returning to the original session when leaving; choosing clean or demo explicitly replaces that session. Chapter practice returns directly to the original session. Reloading during a lesson preserves both its progress and practice desktop. Existing saved sessions remain available without forcing the introduction. [Start the guide](https://xefensor.github.io/spatial-desktop/?guide=start).

The demo also includes four distinct, resumable example scenes for existing sessions and illustrative project content:

| Workspace | Activity | Initial layout |
| --- | --- | --- |
| General | Everyday files, no open Project | One Dolphin window, Apps on a left rail, System right |
| School | Urban Ecology research, reading with project notes and linked sources | Project left, reading and observations in the centre, System right, Apps on a bottom rail |
| Work | Website Launch and Short Film, each with two desktops | Preview above development terminal, Project right, Apps on a left rail, System on a bottom rail |
| Gaming | Co-op session, no open Project | Games and friends in Web, music in a live Apps card on the left, System on a right rail |

**Website Launch** pairs its preview with a development server on Desktop 1, and source files with a launch checklist on Desktop 2. **Short Film**, kept on another drive, pairs footage with edit notes on Desktop 1, and cut feedback with a parked soundtrack player on Desktop 2. **Urban Ecology** has reading and observations on Desktop 1, and survey evidence on Desktop 2. General and Gaming use Workspace desktops without an open Project. Files, resources, notifications, music and browser pages are illustrative data.

Use the top tabs or **Shift + scroll** to switch Projects or return to Workspace. Scroll vertically to change desktops within the current Project or Workspace when no window is focused. **Win + scroll** changes desktops and **Win + Shift + scroll** changes Projects from any window or Area, including while carrying a window. The Apps Area holds **Parked** windows: use **Park** to put a window away and **Unpark** to bring it onto the current desktop. Closing a Project saves its windows and desktop arrangement.

This scene update refreshes the built-in workspace arrangements once and retains a backup of their previous session data. Workspaces attached to custom Projects are left alone; edited Project definitions and existing workspace notes are preserved. Later visits and workspace switches restore the user's changes rather than reset the examples. Historical commits retain their original examples.

## Workspace folders and project downloads

Each Workspace owns its Home and all eight standard Linux user folders: Desktop, Documents, Downloads, Music, Pictures, Videos, Templates and Public. General uses `/home/demo`; other Workspaces use `/home/demo/Workspaces/<Name>`. Home and Places always resolve inside the current Workspace, even while a Project is open.

Projects do not override Home or any of these folders. **Download into this project**, disabled by default in project creation and settings, opts only its windows into `<project folder>/Downloads`. Enabling it creates that folder in the demo filesystem; disabling it returns new downloads to the Workspace and keeps existing files. A Project at a custom location behaves the same way. The originating window’s ownership determines the destination, including separate app instances.

Use **Download page notes** in a Web window and **Open download folder** to try the routing. Demo entries, folder creation and the project preference survive reload and synchronize between demo displays. These are simulated files stored by the prototype; native Linux Home/XDG settings and the host browser’s real download directory are not changed.

## Application windows

Open app icons follow the desktop’s reading order: left to right across each row, then top to bottom. Moving or retiling windows updates their hotbar numbers and keyboard shortcuts together. Parked icons keep their existing order at the end of the rail.

The five sample apps now use consistent toolbars, readable content and controls backed by persistent per-window state. App accents and ABS window silhouettes remain; internal layout surfaces stay square.

- **Dolphin:** one actual location instead of decorative tabs, clickable breadcrumbs, Back/Forward/Up, folder filtering, sorting, list/grid views, file selection and inline previews. Double-click or Enter opens an item. New folder creates a persistent simulated folder. Ctrl+L edits the path; Ctrl+F filters; Alt+arrows navigate.
- **Notes:** separately stored named notes, New note, document switching, autosave and word/character counts. Each window keeps its own documents. Ctrl+S also saves.
- **Web:** local demo-page navigation, working Back/Forward/Start/Reload and address submission. External sites are clearly identified and offered as links to open outside the prototype. Downloaded page notes remain routed by window ownership.
- **Konsole:** each window has its own working directory and command history. Enter runs supported demo commands; Up/Down recalls history; Ctrl+L clears. `pwd`, `ls`, `cd`, `echo`, `date` and `help` operate on demo folders; `$HOME` and XDG folder variables refer to the workspace.
- **Elisa:** queue selection, previous/next, play/pause, seeking, volume and mute have independent state in each player window. Progress advances while playing in the active workspace. This is a playback simulation without audio sources.

Parked cards use the owning window’s current location, note, terminal output, page or player. App sessions survive reload, transfer with windows between workspaces and synchronize between demo displays. The prototype does not execute native shell commands or load external websites inside its mock browser.

On the Apps rail, open windows sit at the start and parked windows at the end. Right-click a parked icon for its app’s background controls: Elisa transport and mute, Dolphin folders, Notes documents, Web navigation, or Konsole demo commands. Background commands keep the window parked; actions that open a folder or note restore it. **Window options…** opens the full menu for moving the same window between desktops, projects, workspaces and displays.

## Material philosophy

Windows primarily use opaque ABS plastic surfaces, with short mechanical press feedback. Secondary surfaces use transparent glass/acrylic. Their lighting communicates state instead of adding decoration everywhere.

- Main window content is always opaque.
- Areas and their content use square geometry; app windows and controls can use softer corners.
- Toggle controls have a persistent indicator line; momentary buttons do not.
- App colours connect each window with its launcher and live card.
- Important content stays readable, with small borders and efficient spacing.

The detailed reasoning, experiments and workflow models are in [`dist/philosophy.html`](dist/philosophy.html). When the server above is running, open **http://localhost:8000/philosophy.html**.

## Files

| Path | Purpose |
| --- | --- |
| `dist/index.html` | Current fullscreen desktop |
| `dist/desktop-shell.js` / `.css` | Desktop behaviour and appearance |
| `dist/app-tools.js` / `app-windows.js` / `app-windows.css` | Persistent app sessions and app controls/layout |
| `dist/home-folders.js` | Workspace Home resolution and persistent simulated downloads |
| `dist/spatial-tiling.js` | Tiling and floating-window obstacle layout |
| `dist/demo-examples.js` | Generic project examples and saved-data migration |
| `dist/spatial-intent.js` | Area allocation and fullscreen intent policy |
| `dist/philosophy.*` | Design and workflow documentation |
| `dist/material-guide.html` / `material-lab.html` | Material examples and earlier explorations |
| `scripts/` | Layout and interaction checks |
| `docs/history/` | Version map and exact original Git history |
| `.openai/hosting.json` | Existing Sites hosting metadata; not needed for local use |

## Workflow research and testing

- [Cross-platform workflow audit: 100 scenarios](docs/workflow-audit-2026-10-07.md) — research, tested prototype behaviour, alternatives and tradeoffs.
- [Filterable workflow matrix (CSV)](docs/workflow-matrix-2026-10-07.csv).
- [Broad desktop testing report](docs/testing-2026-10-07.md).

## Checks

With Node.js installed:

```sh
node scripts/check-spatial-intent.cjs
node scripts/check-spatial-tiling.cjs
node scripts/check-demo-examples.cjs
node scripts/check-spatial-guide.cjs
node scripts/check-workspace-setup.cjs
node scripts/check-ui-refinements.cjs
node scripts/check-desktop-workflows.cjs
```

The [desktop testing report](docs/testing-2026-10-07.md) records browser workflows, regression coverage, confirmed fixes and remaining hardware/browser checks. The workflow suite also runs 1,200 deterministic mixed layout steps across eight workspace sizes.

## Development history

All **153 saved source versions**, from the original Material Interface Lab to the current Spatial Desktop, are imported as chronological commits. Each imported commit's source tree matches its original tree byte for byte.

The connected GitHub interface recreates commit identities and dates, so the imported commits have new SHAs. Original SHAs, author/committer timestamps and the mapping to imported commits are recorded in [`docs/history/versions.json`](docs/history/versions.json). An included Git bundle preserves the **unaltered original commits** as well.

See [`docs/history/README.md`](docs/history/README.md) for checking out versions or restoring the original history.

## Work in progress & prototype scope

Spatial Desktop is still under active development. This is a design demonstration, not a native desktop environment. Its apps, files, system widgets and project/workspace packaging illustrate interactions; they do not provide complete operating-system integrations. Demo data is stored in the browser.

See the [UI and UX refinement notes](docs/ui-ux-review.md) for the latest overview and accessibility changes.

