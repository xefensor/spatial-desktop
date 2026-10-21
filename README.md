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
- **Ask Assistant.** Turn on **Context** beside chat to include readable demo content from open apps and documents in the current Workspace or Project when you send. You can also highlight text or select files, then use **Ask Assistant**, **F2+A** or drag a source into chat. Try `Summarize this note.`, `Make a checklist from this note.` or `Draft a note from this text.`; provide two readable sources for `Compare these two sources.` **Examples** below the message field lists supported requests and guided **Desktop tasks**. Replies follow fixed local rules. Reviewed conversions create actual browser-local files. The context’s **Assistant** folder is the default working location.
- **Speak or listen.** The microphone button starts or stops voice input. In **Voice options**, choose **Manual** to dictate into a draft, **Wake phrase** to begin each request with “Hey Assistant”, or **Continuous** to send finished utterances without an activation phrase. **Read replies aloud** works independently. Voice needs browser support; wake activation requires on-device recognition and an available language pack. Where supported, **Install English pack** in Voice options downloads the pack; start the microphone afterward to listen. Manual and Continuous recognition may use the browser’s online service. Listening starts only when you choose it and stops when you change context.
- **Return to the right conversation.** Each Workspace and Project remembers its active chat, draft and attachments. First entry starts a chat; returning restores your last one. Switching apps or virtual desktops keeps the current conversation.
- **Find your place.** **F2 / Super** opens Overview and search. In an expanded panel, its button pairs the Overview icon with the current Workspace name; compact panels keep the icon. Its horizontal tabs are **Windows**, **Apps**, **Projects & Files**, **Timeline** and **System**. **Meta+Tab / F2+Tab** opens the desktop map.
- **Use a display.** **Display control** beside chat grants scripted control of the current display for the current Workspace or Project, including your only **Main workspace** display. On another display, choose **Extended workspace** to follow the current desktop, or **Side space** to keep windows in place. Display role and control permission are independent; all roles use the same panels and widgets. **Context** and **Display control** are independent and start off in a new context. Turning control off pauses work without clearing it; **Take over** and **Continue** separately pause and resume a task. Changing context interrupts unfinished scripted work and keeps its captured inputs in the original chat. On Main or Extended workspace, changing desktops also interrupts display steps while retaining the conversation.

**System → Devices & session** adds network choice, device pairing, sound, a sample USB transfer and session controls. **Do Not Disturb** quiets alerts while retaining them.

The populated demo starts General with Firefox and Personal notes together, with Documents on Desktop 2. School opens its Urban Ecology research project; Work opens Website Launch with its preview and checklist. Gaming keeps the game on Desktop 1 and planning tools on Desktop 2. The demo panel layout exposes Apps on the left and Files on the right, with Assistant one click away; narrower viewports compact these panels to leave room for windows. Clean desktops use the simpler panel layout. New demo sessions and explicit **Explore demo** resets get these scenes; existing saved sessions and custom layouts stay as saved.

Settings opens as a normal app window from System controls or Overview/search. Desktop Guide introduces interactions through short lessons and searchable topics, with optional help for details and examples. Its introduction uses a practice desktop and offers to restore your earlier session when you finish.

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
