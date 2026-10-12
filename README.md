# Spatial Desktop

**A tactile, project-centred computing environment — work in progress.**

Spatial Desktop is a browser prototype exploring a desktop built around Workspaces, Projects and useful docked Areas. It is designed by Xef and developed through ongoing experiments.

[Try the desktop](https://xefensor.github.io/spatial-desktop/) · [Design philosophy by Xef](https://xefensor.github.io/spatial-desktop/philosophy.html) · [Start Desktop Guide](https://xefensor.github.io/spatial-desktop/?guide=start)

![Spatial Desktop: Website Launch with Apps and a parked Terminal on the left, Web Browser in the centre, Workspace & Projects with Stash, and System and AI on the right](docs/images/desktop-2026-10-12.jpg)

*Actual browser capture, 12 October 2026. Work workspace / Website Launch / Desktop 1. All four Areas are visible; Terminal is parked as a useful app card.*

## The idea

- Windows tile automatically and share numbered shortcuts with the Apps hotbar. Each title bar shows its number; new windows open left to right, then top to bottom.
- Park apps as useful cards instead of hiding their work. Float a window when placement matters.
- Projects keep their own folders, windows and vertical desktops, and resume automatically. Workspaces separate broader contexts such as personal life, study and work.
- Apps, Workspace & Projects, System and AI remain in docked Areas that can expand, become rails or be hidden.
- Stash keeps notes, sources and files. Overview and Timeline help find work and its context.

Desktop Guide introduces these interactions through hands-on tasks. The [design philosophy](https://xefensor.github.io/spatial-desktop/philosophy.html) is Xef’s own unfinished text, being written one topic at a time.

## Run locally

No build step or npm dependencies:

```sh
python3 -m http.server 8000 --directory dist
```

Open **http://localhost:8000**. State is saved in browser storage. Use another port or browser profile for an isolated session.

## Develop

Source lives in `dist/`; checks live in `scripts/`. Pushes to `main` run the [GitHub Pages workflow](.github/workflows/pages.yml) and publish `dist/`.

```sh
for file in dist/*.js; do node --check "$file" || exit 1; done
for file in scripts/check-*.cjs; do node "$file" || exit 1; done
```

[Controls and prototype reference](docs/prototype-reference.md) · [UI notes](docs/ui-ux-review.md) · [Source history](docs/history/README.md)

This is an interaction prototype with simulated apps, folders and system actions. AI replies are scripted; calendars and plans are local. Native OS integration remains future work. Reference media retain their individual [credits and licences](dist/images/philosophy/credits.json).
