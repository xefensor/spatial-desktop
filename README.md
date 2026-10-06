# Spatial Desktop

**A tactile, project-centred computing environment.**

Spatial Desktop is an interactive browser prototype of a desktop organised around workspaces, projects and docked Areas. It explores how windows, useful app widgets and system tools can share the screen without a conventional taskbar.

[Live demo](https://spatial-desktop.xefensor.chatgpt.site) · [Design philosophy](https://spatial-desktop.xefensor.chatgpt.site/philosophy.html)

## Run locally

No build step or npm dependencies are required. From the repository root:

```sh
python3 -m http.server 8000 --directory dist
```

Open **http://localhost:8000**, then use the browser's fullscreen command. In JetBrains IDEA, open this folder as a project and run the same command in its terminal.

Serve the files over HTTP rather than opening `index.html` directly. Browser storage saves demo state for each origin. To test an older version without reusing the current version's state, serve it on a different port or use a separate browser profile.

## Explore the desktop

- **Apps Area:** launch apps, use the numbered app hotbar and control parked windows through live cards.
- **Project Area:** organise a project folder, linked resources, notes, quick launches and saved window arrangements. Projects can have multiple modes for different kinds of work.
- **System Area:** keep relevant system widgets and notifications visible.
- **Overview:** access workspaces, projects, apps and system tools together. The Super/Windows key works when the browser receives it; the operating system may intercept it.
- **Windows:** ordinary dragging uses the tiled layout. Middle-button dragging or Alt + left-button dragging enables manual floating movement. New tiled windows try to avoid floating windows.
- **Areas:** resize and reposition docked Areas using their handles. Actual app fullscreen can temporarily move Areas to a second display when space permits.
- **Two displays:** open the same local URL in two browser windows and use the prototype's display assignment controls. Synchronisation requires the same browser profile and origin; it is a simulation rather than access to native monitor/window management.

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
| `dist/spatial-tiling.js` | Tiling and floating-window obstacle layout |
| `dist/spatial-intent.js` | Area allocation and fullscreen intent policy |
| `dist/philosophy.*` | Design and workflow documentation |
| `dist/material-guide.html` / `material-lab.html` | Material examples and earlier explorations |
| `scripts/` | Layout and interaction checks |
| `docs/history/` | Version map and exact original Git history |
| `.openai/hosting.json` | Existing Sites hosting metadata; not needed for local use |

## Checks

With Node.js installed:

```sh
node scripts/check-spatial-intent.cjs
node scripts/check-spatial-tiling.cjs
```

## Development history

All **153 saved source versions**, from the original Material Interface Lab to the current Spatial Desktop, are imported as chronological commits. Each imported commit's source tree matches its original tree byte for byte.

The connected GitHub interface recreates commit identities and dates, so the imported commits have new SHAs. Original SHAs, author/committer timestamps and the mapping to imported commits are recorded in [`docs/history/versions.json`](docs/history/versions.json). An included Git bundle preserves the **unaltered original commits** as well.

See [`docs/history/README.md`](docs/history/README.md) for checking out versions or restoring the original history.

## Prototype scope

This is a design demonstration, not a native desktop environment. Its apps, files, system widgets and project/workspace packaging illustrate interactions; they do not provide complete operating-system integrations. Demo data is stored in the browser.
