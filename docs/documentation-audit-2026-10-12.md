# Documentation audit — 12 October 2026

This review compares the current repository with retrieved decisions from other Spatial Desktop project conversations, especially the corrections from 8–12 October. It records the accessible evidence, not a complete transcript or an exhaustive export of every project chat. Later explicit decisions take precedence over earlier proposals. Source before this documentation pass: `73f72f1bb10fbd0162e3369507b07fd336ce0a3d`.

## Corrections made

| Subject | Problem in the previous documentation | Corrected description and source evidence |
| --- | --- | --- |
| Names | Reference called the current app Spatial Guide and used Dolphin/Elisa/Konsole as visible labels | Desktop Guide and generic tool names; stable legacy IDs are documented separately. [Name mapping](../dist/app-names.js), [Guide controller](../dist/guide-desktop.js) |
| Guide sequence | An inherited long paragraph taught early Area arrangement and introduced Stash/AI after Projects | Thirteen chapters; Stash and AI before Projects, Area arrangement after Overview & Timeline. [Chapter definitions](../dist/spatial-guide.js) |
| Setup windows | Older demos described preview above Terminal | Side-by-side initial pairs and row-major automatic openings, with usable-size/obstacle constraints. [Tiling](../dist/spatial-tiling.js), [Demo seeding/migration](../dist/demo-examples.js) |
| Numbers | Documentation needed the final correction, not just a rounded number badge | Shared hotbar/title-bar numbers with no box, background or shadow; first two keyboard banks and clickable later slots. [Window/rack synchronization](../dist/desktop-shell.js), [Title-bar styling](../dist/desktop-shell.css) |
| Parking | “Icons follow open icons” hid the expanded/rail distinction and ownership scope | Expanded parked cards without duplicate icons; rail entries below open icons; persistence across desktops within the owning context. [Desktop controller](../dist/desktop-shell.js), [App cards](../dist/app-windows.js) |
| Navigation | README used Columns and omitted the focus condition for ordinary Shift+scroll | Visible terminology is Projects; normal desktop scrolling requires released app focus, explicit Super shortcuts work from windows/Areas. Held-title-bar scrolling carries a window. [Navigation and carry handlers](../dist/desktop-shell.js), [Page/ownership model](../dist/desktop-pages.js) |
| Maximize/Fullscreen | Brief descriptions omitted peers, second-display capacity and restoration | Maximize retains Areas; Fullscreen uses the display. Peers transfer when they fit without parking existing destination apps, otherwise park. Restore respects explicit user changes. [Transfer/focus/fullscreen logic](../dist/desktop-shell.js), [Area intent policy](../dist/spatial-intent.js) |
| Areas | Older conversations included fixed-visible Areas and no hiding | Later implemented behaviour allows all four Areas to hide/recover; expanded, rail and hidden are current states. Manual mode is respected. [Dock and visibility handlers](../dist/desktop-shell.js), [Intent policy](../dist/spatial-intent.js) |
| Home paths | Reference gave only the built-in Workspace naming scheme | Built-ins use named directories; newly created Workspaces use unique IDs. Project downloads remain opt-in and do not replace Home. [Creation](../dist/workspace-setup.js), [Folder routing](../dist/home-folders.js) |
| Project lifecycle | Missing explanation of retired Modes and save-place controls | Projects own desktop stacks and save/resume automatically. Modes, Continue working and Quick Note are historical approaches. [Project/page controller](../dist/desktop-shell.js) |
| Media | A general “without audio sources” statement could imply Stash audio never plays | Mock Music Player progress is simulated; separate viewers can play bundled/imported files. [App sessions](../dist/app-windows.js), [Stash viewers](../dist/working-memory-desktop.js), [Bundled media](../dist/demo-examples.js) |
| Screenshots | README presented an old three-section Overview with Modes as current | Removed the misleading current screenshot presentation; point to focused crops and explicitly labelled diagrams/history in the philosophy. [Earlier image retained](images/overview.jpg), [Illustrated design record](../dist/philosophy.html) |
| Implementation scope | Design ambitions risk being read as native features | Added a current-prototype/native-work table: mock apps, local plans, scripted AI, browser folders and display simulation are distinguished from OS integrations. [Detailed reference](prototype-reference.md) |

## Decisions retained from project conversations

| Earlier approach | Current decision | Why |
| --- | --- | --- |
| Minimized windows | Park / Unpark with useful app cards | Clear canvas space while keeping small app tasks available |
| Project Modes and labels on shared windows | Projects own vertical desktop stacks | Make ownership spatial; additional pages do not need another named mode |
| Similar motion for page and Project changes | Canvas-only vertical motion, whole-scene horizontal motion | Distinguish more room from another piece of work |
| Project-only capture and a separate Quick Note | Workspace/Project Stash, including without an open Project | Keep explicit material in its working context with less duplication |
| Manual save-place / Continue working | Automatic Project save and resume | Returning to work is normal Project behaviour |
| AI embedded in System or Project resources | A fourth Area with a freeform request and source tags | Support its own task and ordinary work outside Projects |
| Project overrides Workspace folders | Workspace owns standard Home folders; only Project Downloads opt in | Keep personal folders predictable and make destination changes explicit |
| Framed shortcut numbers | Plain title-bar numbers; visible hotbar shortcuts | Reach the window directly without introducing another control-like box |
| Last-focused-window insertion | Reading-order opening and matching demo pairs | Make layout and shortcut order predictable |
| Broad unlabeled screenshots | Focused relevant crops, labelled diagrams and historical captures | Show the claim being explained without implying an older UI is current |

These are design decisions and rationales, not measured usability-study results. Native workspace environments, KWin integration, filesystem permissions, provider-backed AI, external calendar accounts and portable process restoration remain future integration work.

## Verification

- Reviewed the README, detailed reference, UI notes and live philosophy source against implementation and retrieved project decisions.
- Inspected the README's old Overview image and the existing focused Apps/rail crops; retained historical files rather than fabricating a current screenshot.
- Checked repository-relative documentation links and local links/assets/fragments in the philosophy page.
- Ran syntax checks for all 24 top-level `dist/*.js` files and all 17 `scripts/check-*.cjs` regression suites successfully.
- Existing suites cover tiling and obstacles, setup migration, Guide chapters, app sessions, Home/downloads, Stash/AI, Timeline, desktop/Project navigation, window carrying and two-display transfer/restore rules.

This pass did not perform a new live-browser visual capture, a native monitor test or testing with independent users. Automated browser-state simulations do not establish native OS integration. The reports dated 7 October remain historical evidence; this review does not rewrite their findings.

## Author text promoted after the audit

The existing `philosophy-draft.html` authored draft is now the main `philosophy.html`. Its author paragraphs remain unchanged; the previous AI-written record was linked separately (removed from the published site on 23 October). The old draft URL redirects to the main page. README now includes a real 12 October desktop capture with all four Areas, an open Web Browser and a parked Terminal. That later capture does not retroactively turn the earlier audit into a full visual regression pass.
