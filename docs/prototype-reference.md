# Prototype reference

Reviewed against source and retrieved project decisions on 12 October 2026. The main design philosophy is Xef’s unfinished author text; this document separately describes implemented prototype behaviour. Start with the [README](../README.md) or the [live design philosophy](https://xefensor.github.io/spatial-desktop/philosophy.html).

## Context and ownership

| Context | Role | What it retains in the prototype |
| --- | --- | --- |
| Workspace | A broad context such as General, School, Work or Gaming | Home folders, Area configuration, app sessions, browsing history, player state, local activity/plans and workspace Stash |
| Project | A piece of work rooted in its own folder | Its windows, vertical desktops, files/resources and project Stash; several Projects can stay open |
| Desktop | Another page inside a Workspace or Project | Window placement on that page; vertical scrolling changes the page |

The ordinary Workspace and each open Project appear in the horizontal context strip. Switching Project moves the scene horizontally; changing its desktop moves the window canvas vertically while Areas remain in place. Desktop markers on both sides identify the current page. The design uses bounded desktop pages rather than canvas zoom or permanently exposed portions of neighbouring desktops.

Project navigation and window arrangements save automatically. Closing a Project saves its session; opening it again resumes that session. There is no manual save-place or Continue working step. Named project Modes belong to earlier versions; current interaction uses desktop pages.

Window options can move a window between desktops, Projects, Workspaces and demo displays, or detach it into the ordinary Workspace so that closing the Project no longer closes that window. Separate app instances keep their own state.

**Move to…** now uses nested destination menus rather than a flat list. **This Project / This Workspace** lists its desktops, **Other Projects** opens Project → desktop (including Workspace desktops outside Projects), and the separated **Other Workspaces** branch opens Workspace → desktop. Each desktop names the complete destination path; the current location is disabled and marked **Current**, and the trailing empty desktop is marked **New**. Closed Projects say that the window is stored until the Project is opened. Moving to another Workspace targets its ordinary Workspace context, with its Home shown explicitly; window content is retained and open file locations stay at their original paths. This is simulated window/session transfer, not native process or Home migration. Gaming-only apps stay in Gaming. Display transfer appears under **Displays** when a second display is available.

Hover or click opens a submenu. Up/Down and Home/End stay in its current level; Right opens a child, Left or Escape returns one level, and each popup has a Back control for pointer/touch use. Tab closes the menu. Submenus flip at screen edges and scroll independently. Selecting a destination keeps the current view and offers placement Undo; newer edits to a transferred destination window prevent stale Undo. These menus also work on windows reached through Overview and on parked windows through **Window options…**.

Workspace separation is simulated under one browser profile. It does not create native users, sandbox applications, change native Home folders, enforce file permissions or replace the system clipboard.

## Desktop Guide and setup

The visible app is **Desktop Guide**. `Spatial Guide` remains a legacy launch key in source. New visitors begin on an empty desktop and can take the hands-on introduction or choose their desktop. Existing sessions do not have to repeat it.

The current fourteen chapters contain 32 steps, including the welcome and finish screens:

| Order | Chapter | Purpose |
| --- | --- | --- |
| 1 | System | Try a quick setting and learn toggle feedback |
| 2 | Apps & Overview | Open a tool, find another through search and create an independent copy |
| 3 | Windows | Tile, float, Maximize and try Fullscreen |
| 4 | Parking | Put a useful app aside and bring its window back |
| 5 | Desktops | Change page and launch an app directly from an empty desktop |
| 6 | Stash | Save and inspect an idea without requiring a Project |
| 7 | Assistant | Attach a source, write a request and keep a scripted reply |
| 8 | Projects | Create a Project and use its separate windows/desktops |
| 9 | Workspaces | Create a Workspace and explore its Home folders |
| 10 | Overview & Timeline | Find work and compare local activity with a plan |
| 11 | Arrange your Areas | Resize, dock, hide and recover Areas |
| 12 | Try it on your own | Combine actions without target highlights |
| 13 | Borderless fullscreen | Enter a temporary desktop, return to its parent and restore the window |
| 14 | Two displays | Optional practice with a second browser window |

Tasks use generic app names and let learners choose compatible tools. Each task can be skipped; the next task prepares missing prerequisites. Examples and extra explanations are expandable. Only introduced Overview sections are exposed during practice. The Guide supports expanded/compact presentation and contextual recovery when a window is closed, parked or in the wrong context.

The borderless-fullscreen chapter prepares the real Fallout 4 example in Gaming, using isolated practice storage. It starts on Desktop 1 with the game on its bonded child. The game has no window frame, border, Park, Maximize or Close controls in this mode. Ordinary whole-display windows, including this demo's Firefox, keep their existing desktop and never receive a temporary one. The creation helper enforces explicit borderless eligibility, and obsolete Firefox practice bonds restore their original window. An in-progress old practice changes to Fallout without resetting other Guide chapters. Creating the example does not complete the task: learners enter it, use **Back to Desktop 1** (or navigate back) while the game remains fullscreen, then use **Restore window** to remove the child. Its expanded explanation also covers the Apps return icon, the child's lifetime and the held second monitor. The game's **Open Overview** button opens Apps during practice; the Steam-contributed section stays excluded.

The Guide audit also updated expanded explanations for hotbar numbering per window and its first twenty shortcuts, row-based tiling, carrying a window with title-bar + scroll (Shift for Project columns), Undo after hiding or docking Areas, temporary-desktop cards and Steam's contributed Overview controls. Existing saved lesson IDs and version-eight positional progress migrate without losing completed goals.

Repeated introductions and chapter practice use isolated storage. Progress survives reload. Leaving a repeated introduction offers a return to the original session; individual chapter practice returns directly. Explicit **Clean desktop** or **Explore the demo** choices replace the current session while preserving display preferences. A clean desktop has General only, with no open apps or Projects. The temporary second practice display closes when its chapter ends and does not join the original session.

Find Desktop Guide in **Overview → Apps → Help**, or search its name. [Start the guide](https://xefensor.github.io/spatial-desktop/?guide=start).

## Demonstration scenes

| Workspace | Example activity | Initial context |
| --- | --- | --- |
| General | Everyday files | Ordinary Workspace desktops; no open Project |
| School | Urban Ecology research | Reading, observations and survey evidence in a Project |
| Work | Website Launch and Short Film | Two Projects, each with two desktops |
| Gaming | Co-op session | Desktop 1, with Firefox open, Fallout on its attached fullscreen desktop, Steam and Music Player parked |

Website Launch pairs a preview with its development terminal on Desktop 1, and source files with a checklist on Desktop 2. Short Film pairs footage with edit notes, then cut feedback with a parked soundtrack player. Urban Ecology pairs reading and observations, with survey evidence on the next desktop. The data and app content illustrate workflows.

Setup pairs use side-by-side vertical halves. Automatic openings fill a row from left to right, then start the next row. Three windows prefer two across the top and one full-width below; four prefer a 2×2 grid even on a wide display. If that would violate app minimum sizes, the automatic layout falls back to a width-based arrangement. Minimum usable sizes and floating obstacles can constrain placement. The one-time order migration changes exact old shipped split trees; manually rearranged trees remain intact. Broader scene migrations preserve edited Project definitions and notes, and skip Workspaces attached to custom Projects.

## Window placement and parking

Tiling shares the bounded space between Areas. Left-drag a title bar to rearrange tiles; drag a divider or resize handle to change their shares. The new-window order does not depend on which window was last focused. Manual edge drops select a specific split. Middle-button title-bar dragging or Alt+left-drag floats a window; a normal drag or the window menu returns it to tiling.

Tiled windows avoid floating obstacles when space allows. Floating windows can overlap one another. Space pressure and fully obscured/offscreen windows can park in Apps rather than become unreachable. Window fitting does not promise every app remains visible at every viewport size.

**Park** replaces minimization in the visible interface. The window leaves the canvas but its app remains available through a useful card. **Unpark** restores it on the currently viewed desktop in its owning context. Parked apps travel between desktops inside that Workspace or Project; parking does not change ownership.

Apps with a parking-widget integration keep their useful controls in the card, such as Music Player transport or an editable note. **Firefox and Steam** deliberately have no parking widget: their card shows a read-only **Window preview** of that specific app window, including its current tabs, page and visible app content. Clicking the preview or **Unpark** restores the original window; dragging the header places it on the desktop. The preview cannot type, click links, switch tabs or activate app controls. Header dragging survives a tray refresh; Escape, pointer cancellation, focus loss and hiding the page cancel it without restoring the window or leaving a drag ghost. Browser instances keep separate previews and hotbar slots. Preview-only apps expose ordinary window actions on a rail, without invented background commands.

The web prototype renders an inert copy of its own simulated app DOM, with isolated styles and icon definitions. Content changes update the preview without a polling timer; Area resizing preserves the full window's proportions. Copies omit window identities, action attributes and duplicate document IDs, and keep live input values. A native implementation would obtain the application's surface from the compositor. This demo does not capture real third-party windows.

Expanded Apps displays open-window icons at the top and useful parked cards below, without duplicating each parked card with an extra icon. On a rail, open icons remain at the top and parked icons start around the lower middle. Right-click a parked icon for relevant background actions. Commands such as playback keep the window parked; opening a file or note restores it. **Window options…** opens the movement menu.

### Numbers and shortcuts

The hotbar follows visible windows’ reading order: left to right across a row, then top to bottom. Moves and retiling update both numbers and shortcuts. Parked entries follow the open group. Every separate app instance gets its own slot. Each open app title bar shows the matching number as plain text with no border, background or shadow.

| Slots | Shortcut |
| --- | --- |
| 1–10 | Super+1–9,0 |
| 11–20 | Super+Shift+1–9,0 |
| Later slots | Click the entry; no additional keyboard bank is bound |

**F2 is the browser-only alternative to Super.** Press and release F2 alone to toggle Overview; hold F2 with 1–9 or 0 for the hotbar, add Shift for slots 11–20, use F2+A for Assistant, F2+scroll for desktops and F2+Shift+scroll for Project columns. Press F2 before the other keys. Release after a combination does not toggle Overview. Leaving the browser clears the held key. This does not remap the host OS. Alt+number and Alt+Shift+number remain browser fallbacks. Focus or restore with the shortcut; invoking it again on the focused window parks that window. Shift+click a hotbar icon creates another app instance. The host OS may intercept Super shortcuts.

### Preview privacy

An open window, hotbar icon or parked card's context menu offers **Hide preview** / **Show preview**. The preference belongs to that particular window in its Workspace session, persists through restore/repark, close/reopen and reload, travels with a transferred window and synchronizes between displays. Sibling windows have independent settings.

A hidden parked card contains only the app identity, **Preview hidden** and its normal restore/close controls. Its placeholder restores the original window and its header still supports drag placement. This also replaces interactive parking widgets such as Notes or Music Player, so their text and app controls are not exposed in a private card. An attached dialog stays below its app, connected and labelled **Needs input**, but its title, filename and destination are omitted. Restoring either card focuses the real dialog as before. The window's own visible contents are unchanged when opened.

Hidden windows bypass snapshot/widget rendering; existing cached DOM snapshots are discarded rather than blurred. Overview's window detail and tooltip say **Preview hidden** instead of the document title. A hidden borderless app also uses a plain icon scene in its temporary-desktop Overview cards and bottom return preview. This controls window previews; it does not erase the window's saved content or separately saved Stash/Timeline entries.

### Background applications and closing

Apps has three positions: open-window icons at the top, parked cards in the middle, and small **background-only** icons at the bottom. The bottom row exists only when needed, remains outside the parked list's scroll viewport and keeps its position on an Apps rail. A horizontal rail places it at the trailing end. It has no numbered window shortcuts or duplicate icons for apps that still have an open/parked window. Background activity is available system-wide through this shared row, across every Workspace, desktop and Project column. Each icon includes the origin Workspace symbol; its tooltip names the origin. The process keeps its originating Home, app data and session. Clicking switches to that origin and opens the existing app; it never launches that app against the current Workspace’s Home. Force quit from another Workspace stops only the selected origin instance without switching context. It is not counted as an open or parked window in Overview.

Left-clicking the title-bar or parked-card **Close** closes that window. The app continues only if it has a reason: Music Player is playing, or Steam is downloading a demo update or providing the current game session. An idle app exits completely. Middle-clicking the same Close button **force quits that app instance** and stops its playback/download; other independent instances are unaffected. Context menus offer **Close window** and **Force quit** separately. A background icon's tooltip describes its activity; click opens its window, and middle-click or **Force quit** in its context menu stops it. Reopening removes the bottom icon. When the last activity ends, the background icon disappears without switching focus.

Steam's library includes **Download demo update**, with Pause/Resume and a progress bar. It is a local simulation, not a network download. Progress persists and catches up across Workspace changes, reload and display synchronization. Closed background Music Player sessions continue their local playback simulation across Workspace switches and can be reopened through the shared Apps row. Open or parked playback sessions retain their existing Workspace behavior. The demo does not provide native audio playback. Close-button tooltips explain both mouse actions. The prototype stores background activity with the app's local session; it does not inspect or kill native Linux processes.

### Dialogs attached to an app

Firefox's menu offers **Save page as…**; **Ctrl+S** opens the same local demo dialog. It belongs to the particular Firefox window, blocks that window's content while leaving its title bar available, and follows its desktop, Project and display. Other apps remain usable. Park Firefox while the dialog is open: its read-only app preview stays above an indented dialog card, connected by the app's accent line and labelled **Dialog · Firefox** and **Needs input**. Both belong to one parked group and one app slot. The dialog does not become an independent parked app. Clicking either preview or Unpark restores the same window and focuses the waiting dialog; dragging the parent card also restores the group. Switching contexts and reloading preserve the dialog and its filename. There is no automatic focus switch while parked.

**Save** writes the captured demo page text into the owning window's current workspace/Project download destination. **Cancel** or Escape dismisses the dialog; explicitly closing the parent also closes its dialog. A second Firefox window has its own dialog state. This is a prototype of app ownership, not an integration with native file pickers or external app dialogs.

### Maximize and Fullscreen

| Action | Input | Space and other windows |
| --- | --- | --- |
| Maximize | Left-click maximize, or double-click title bar | Fills the canvas between Areas; peers move to the second display when they fit, otherwise park |
| Fullscreen | Middle-click maximize | Fills the whole display; peers transfer or park, and Areas transfer when possible or temporarily hide |
| Restore | Repeat the control; Escape also leaves Fullscreen | Returns automatically parked/transferred peers and temporarily moved/hidden Areas |

Explicit moves, closing or parking cancel automatic peer return. A busy second display is not cleared to make room: candidate transfers must fit without parking its existing apps. Both displays are browser windows on the same origin/profile, with prototype display assignments rather than native monitor management.

## Navigation and Areas

An empty desktop shows **Open an app**, its Workspace or Project and desktop number, and large quick-launch icons for the demo's working apps. **All applications** opens the Apps section in Overview. Launching a regular app already open elsewhere creates an independent window on the current desktop and display, preserving the original window. A parked app in the same context restores here; Shift+click requests a new window. Single-instance apps such as Steam and Fallout show **Return to app** when already running. Gaming apps appear only in Gaming. The launcher disappears while this display has an open window and is excluded from fullscreen surfaces. In the guided introduction it appears from the empty-desktop lesson onwards.

Scroll over an Area header, rail or non-scrollable content to change vertical desktop pages, even while a window is focused. Scrollable Area content keeps its wheel at both edges; input fields retain their normal scrolling. Nested scrollers do not pass motion to outer panes. Shift+scroll over an Area switches between the ordinary Workspace and open Projects unless a nested horizontal scroller owns that motion. You can also click desktop background or an Area to release window focus, then scroll over the canvas. Super+scroll and Super+Shift+scroll work from windows or Areas when the browser receives them. Page Up/Down provide desktop navigation with focus released; Shift selects Project navigation.

While holding a title bar with the left mouse button, scroll to carry the window to another desktop; Shift+scroll changes its Project context. Release to place it. Cancelled drags return to the original placement. Ordinary scrolling inside focused apps remains an app action.

All four Areas default to vertical side docks: Apps and Workspace & Projects on the left, System and Assistant on the right. Move an Area using its header/handle; resize its inner border. A rail and an expanded Area are presentations of the same dock. The removed Area Compact state is distinct from the Guide app’s compact view.

Every Area header's context menu offers **Expanded**, **On rail** and **Hidden**, with the current state marked. Areas sharing a dock column on the same display resize, collapse and expand together, remembering that column’s previous expanded thickness. Top/bottom rows share their height in the same way. Hidden applies to the chosen Area; showing it again joins its visible peers’ state and size. Docking into an occupied edge joins that column rather than replacing its width. The same menu is available with Shift+F10 from a focused header control. Dragging remains available; Escape, a cancelled pointer or leaving the browser cancels an unfinished Area gesture.

Completed Area changes and window moves offer **Undo** in their feedback message. Recovery restores placement and state, not document text, chat drafts or playback contents. The offer applies to the just-completed change; if another layout, context or display change intervenes, the previous offer cannot overwrite it. Maximize and Fullscreen keep their existing automatic Restore behavior.

A column of rails has one shared thickness and stays anchored to its screen edge. The System/Assistant column is 70 px wide on a side edge (64 px high on a horizontal edge). Collapsing System resets its scroll position so the rail clock and alerts are immediately visible. Temporary widget reveals can open over the scene without changing the column’s saved size. Older mixed rail/expanded preferences are fitted to their shared saved dock thickness.

All four Areas can be hidden through their context menus and restored in **Overview → System → Desktop Areas**. Super or the Overview keyboard fallback remains useful if every Area is hidden. Visibility and dock layout save per Workspace. Ordinary tiling respects dock bounds; explicit floating/fullscreen interactions can request temporary Area changes. Fullscreen Area transfers/hiding are reversible and respect Manual mode.

Border drags stop at available space rather than pushing the opposite Area offscreen. Side docks have a 520 px ceiling and top/bottom docks a 360 px ceiling, also capped at 40% of that display extent. Up to 440 px width / 320 px height remains reserved for the canvas, scaled down on small viewports. Old oversized states are fitted to the current display; the preferred size can return on a larger display.

## System Area

System follows **desktop → project → Workspace → system-wide**, in both expanded and rail layouts. **This desktop** identifies the current ordinary or temporary desktop and surfaces app-owned requests only for visible windows or parked windows in the current column. Click a request to restore/focus its existing owner and dialog. Hidden previews remain generic; closed windows, other projects and other desktops cannot add requests here.

**Project** shows the next unfinished upcoming/ongoing item assigned to the currently selected Project. It disappears on the ordinary Workspace column. **Workspace** contains that Workspace's notifications, its existing focus timer and the remaining upcoming plans. The selected Project's item is not repeated there; when a Project is selected, the remaining plan is labelled **Elsewhere in Workspace**. The month view remains collapsed until requested. A focus timer remains Workspace-local and continues across desktop/Project changes, preserving the previous saved sessions. Its start action becomes the active timer instead of appearing twice.

**System-wide** stays in a compact footer below independently scrollable local controls, keeping machine settings accessible in a short Area. It contains other-Workspace unread badges, explicit shared system alerts, clock/date, collapsible connected devices and Wi-Fi/Bluetooth/sound/theme controls. Shared alerts have their own list, count and rail access, independent of Workspace notification lists and dismissal. Other-Workspace badges keep their explicit-preview privacy behavior. A rail follows the same progression: current-desktop requests, selected-Project plans, Workspace Alerts/Focus/Agenda, then clock, shared alerts, foreign unread badges, phone and machine toggles. Reveals retain the existing temporary expansion behavior on all four edges.

The 13 October System and recovery pass passed all 19 project checks and GitHub Pages deployment. Live review at 1363 × 936 covered light and OLED themes, opening and closing the month, System and AI rail changes with Undo, docking System at the top and restoring it, moving an app to another desktop and undoing it, and attaching then removing an app source in AI. The final spacing adjustment keeps the focus action and Area status in one row. Pointer cancellation, stale Undo protection and named AI/Stash destinations also have automated regression coverage.

![Compact System with quick settings, next event and collapsed month](images/system-and-recovery-2026-10-13.jpg)

## Settings and scope

Open **Settings** from the System Area gear, the System Settings application or search result, or **Overview → System → Settings**. The view follows **This desktop → Project → Workspace → System-wide**. Each section names the context it applies to; controls retain their existing scope, without a scope selector that implies unsupported combinations.

- **This desktop** identifies the current desktop, Project column, Workspace and display. It explains arranging windows on this desktop and offers **Arrange on desktop**; it does not introduce a global tiling preference. Temporary borderless-fullscreen desktops instead offer **Return to fullscreen app**.
- **Project** appears only when a Project is selected. It shows that Project's folder, its existing **Download into this project** preference and **Manage Project** action. The folder is a displayed location, not an editable default-tools or Home setting. Download routing affects only that Project's windows; opening the same Project elsewhere uses the same Project preference.
- **Workspace** names the active Workspace and its Home. Area visibility and **Reset** use the existing Area actions. Their scope is **all desktops and Projects in this Workspace**. Existing Area controls also name this scope, so changing an Area while viewing a Project does not imply a Project-only layout.
- **System-wide** applies to all Workspaces. The existing shared color-theme preference offers **Auto**, **OLED**, **Graphite** and **Light**; Auto follows the host's preferred color scheme. Wi-Fi, Bluetooth and Sound retain their shared simulated toggle state. These demo controls do not configure native networking or audio.

The Project editor also identifies the Project affected by its download preference. Settings does not add a wallpaper chooser, app-default picker, notification policy or native monitor configuration. Existing windows and sessions remain intact while settings change; values continue to save locally and synchronize through the existing display session.

## Workspace Home and downloads

Each Workspace owns simulated Home and the eight standard folders: Desktop, Documents, Downloads, Music, Pictures, Videos, Templates and Public. General uses `/home/demo`; built-in other Workspaces use `/home/demo/Workspaces/<Name>`. Newly created Workspaces use their unique workspace ID beneath `/home/demo/Workspaces/`. Home and Places resolve inside the current Workspace even while a Project is open.

**Download into this project** is disabled by default. Opting in routes that Project’s windows to `<project folder>/Downloads`, creating the simulated folder if needed. It does not override Home or other standard folders. Disabling it affects new downloads and retains existing files. The originating window’s ownership determines routing, including separate instances.

Try **Download page notes** in Web Browser and **Open download folder**. Prototype folder entries, preferences and downloads persist locally and synchronize between its displays; they do not change the host browser’s actual download directory or Linux XDG configuration.

## App tools

Visible names describe functions. Legacy app IDs remain stable for saved sessions; these mock interfaces are not embedded native apps.

| Visible app | Prototype controls | Legacy source ID |
| --- | --- | --- |
| File Browser | Breadcrumbs, Back/Forward/Up, path editing, filtering, sorting, list/grid views, selection, previews and creating folders | `dolphin` |
| Note Editor | Named documents, New note, document switching, autosave and word/character counts | `notes` |
| Web Browser | Local demo-page navigation, Back/Forward/Start/Reload, address submission, external-link handoff and download routing | `browser` |
| Terminal | Per-window working folder and history; supported demo commands such as `pwd`, `ls`, `cd`, `echo`, `date`, `clear`, `help` | `terminal` |
| Music Player | Per-window queue, previous/next, play/pause, seeking, volume, mute and simulated progress | `elisa` |
| Desktop Guide | Introduction, searchable reference and chapter practice | `Spatial Guide` launch key |

File Browser supports Ctrl+L for its path and Ctrl+F for filtering. Terminal supports Up/Down history and Ctrl+L clearing. Note Editor also supports Ctrl+S. App sessions survive reload, transfer with windows between Workspaces and synchronize between demo displays. Useful parked cards read their owning window’s current state.

The mock Terminal does not execute native commands and Web Browser does not embed external websites. Music Player progress is simulated, without a native audio-library integration. Separate Stash/media viewers can play bundled or imported audio; that does not imply the mock Music Player is a complete media app.

## Overview, activity and plans

Overview has four workspace sections: **Timeline, Apps, Projects & Home, System**. Sideways swipes, Shift+scroll, section tabs, edge previews and Left/Right change these sections. Each section snaps into view; lists retain vertical scrolling. Workspace selection and global search remain available, and a compact header names the current Workspace, Project and desktop. **All Workspaces** is a visibly separated system-wide tab on the left; app-contributed Steam remains separated on the right.

**All Workspaces** opens only when explicitly selected. It is a separate panel, excluded from the carousel's neighbouring previews, wheel navigation and saved section preference. Closing/reopening Overview, changing Workspace or entering search returns to a local section. Its content is cleared while closed, so other Workspace details cannot peek into an ordinary Work overview during screen sharing. The left tab uses a neutral accent, a divider and a scope mark, while its panel says **System-wide view**.

The panel uses **side-by-side columns**, one per Workspace plus System alerts. Each column has its own vertical scroll; smaller screens scroll the column strip horizontally instead of stacking Workspaces. It contains notifications and app-owned dialogs that need input. Background apps, downloads and playback use the shared Apps row and are not repeated here. **Open** switches to the owning Workspace and opens the original app in its existing Project context, or shows that Workspace's notification centre when no app target exists. **Dismiss** removes that notification without switching Workspace. Hidden previews replace app-derived details, including notification and dialog content, with **Preview hidden**. Steam's simulated downloads continue across Workspaces and produce a notification in their originating Workspace when complete.

App notifications remain workspace-local. Beneath the local notifications in **System**, icons for the other Workspaces show their **unread count**. The same controls sit beneath Alerts on the System rail, including horizontal rails. An inactive Workspace’s new event changes only its icon’s steady glow and count: it never adds foreign content to the local list, opens a popup, makes a sound or switches context. Clicking an icon explicitly opens a nonmodal preview of that Workspace’s pending notifications while staying in the current Workspace. The displayed notifications become read but remain available until dismissed. New arrivals do not insert their contents into an already-open preview; they update the badge and a generic new-notification count. Close and reopen to view them. **Open** on an item or **Open workspace** explicitly navigates to the origin. Outside click, Escape, focus leaving, Overview, a Workspace switch or window blur closes the preview and clears its contents. Hide preview applies here too.

Read state is also recorded when a notification is actually visible in the local centre or the explicitly opened global columns; clipped, hidden or inert content does not count. Read state and dismissal are independent and persist across reload and display synchronization. Existing per-Workspace notification lists migrate once to structured local records; read timestamps and dismissal tombstones prevent stale display updates from undoing newer reads or dismissals. Returning to a Workspace shows its list without replaying missed popups. Explicit system alerts remain shared. Guide practice retains its isolated local Overview and does not offer the global panel or cross-Workspace badges.

Nested lists keep wheel ownership at their top/bottom or left/right edges, without advancing the Overview section or scrolling a parent pane. Section navigation remains available over non-scrollable content; Shift+scroll can cross a vertical list, but stays inside a nested horizontal scroller.

The containment change passed the full project check suite, including Area edge/focus routing and nested horizontal Overview lists. Live review verified repeated wheel input beyond both ends of the app library kept the Apps section selected. [Reviewed Overview](images/contained-scroll-2026-10-13.jpg).

Apps keeps existing work on the left and the app library on the right. Desktop cards show their app icons; running-window rows show the current content, state, desktop and matching hotbar number. Windows are ordered by desktop and hotbar position. Filters select the current desktop, open windows or parked windows; the launcher stays available. The library has visible categories and an icon grid with readable labels. Narrow screens stack the work pane above the library and use a category selector. Projects & Home exposes context and folder navigation. System includes settings, notifications and recovery controls for Areas.

Projects & Home has its own project search, matching names, summaries and folder paths, plus **Open here** for the current Workspace. Cards distinguish available projects, projects open in this Workspace and the current Project’s desktop. Opening another Workspace clears this library filter. Global search follows **This desktop → Project → Workspace → System-wide**, omitting scopes with no matching results. Cards name their type and location. Existing windows appear by their actual desktop and Project ownership; selecting one returns to that window, including parked windows and bonded temporary desktops. Installed app entries explicitly open a new window or application. Files come from the current Workspace’s Home folders, accessible Project file lists and demo downloads; Stash keeps its Project or Workspace ownership. Other Workspaces’ private windows, Stash and unopened Projects do not enter local results. Hidden window previews also hide their content titles from search. This is a demo index, not a native filesystem index. Scope sections stay in vertical order with multiple card columns when space permits. **Show** still filters Applications, Files, Stash, Projects or System & actions within that order. The web action stays separate below local results. Clearing the query returns to Overview and resets the category.

![Apps in Overview: desktops and running windows beside the app library](images/overview-apps-2026-10-12.jpg)

Timeline records explicit app, file, browser, Project, desktop and Stash actions per Workspace. Return actions reopen the relevant context or stored item. The shared time axis aligns activity with calendar, task and reminder lanes; calendar events show durations and overlaps. **Now**, **Latest activity** and day navigation help find a moment. The System calendar opens this view and shows the next planned item.

Create local events with start/end, tasks and reminders. Completion and dismissal persist through reload and between demo displays. Plans can appear even without a recorded app interaction. Demo plans are labelled examples; clean and newly created Workspaces start without them. No external calendar account is connected. Timeline is explicit prototype activity history, not a keylogger, clipboard recorder or passive screen capture.

## Gaming and app-contributed Overview tabs

The demo’s **Gaming** workspace opens on **Desktop 1**, with Firefox visible, Steam parked in Apps and the illustrative Fallout 4 game already running on its bonded fullscreen desktop below. Use the bottom **Temporary desktop** preview, Fallout's Apps icon or scroll down to enter the game. Both game and Steam are native prototype windows with hotbar slots. They are scoped to Gaming; they do not appear in the other workspaces’ app library or search, and this sample cannot be moved into another workspace. Clean sessions do not seed these examples. Desktop Guide creates only its isolated Fallout practice in the borderless-fullscreen chapter. A one-time update returns the old shipped Desktop 1 fullscreen opening to its parent; subsequent visits preserve the user's selected page, Project and open/parked/closed app choices.

Press **F2** or **Super** (Ctrl+Space is another browser fallback) or use **Open Overview** in the game. Overview opens above fullscreen and selects Steam when it is running in Gaming. **Escape** closes Overview and returns to the game; **Switch app** opens the Apps section. Choosing another app uses the usual window manager. **Return to game** restores the game’s fullscreen view. **Show desktop** returns to the bonded parent while keeping the game open in fullscreen. **Win + scroll** navigates between the parent, fullscreen child and subsequent desktops. Switching workspaces saves the existing fullscreen session.

### Bonded fullscreen desktop

Only borderless fullscreen apps get a temporary desktop directly below their originating desktop. Fallout 4 is the qualifying example; ordinary fullscreen windows with decorations remain on their existing desktop. It remains in the same Workspace and Project column. The child has no Areas, desktop folders or context header, including in Manual mode. Overview remains available above the game. Ordinary desktop numbers and other window assignments stay unchanged.

Switching away retains the game's fullscreen session and keeps it open. Its originating desktop keeps a Fallout 4 icon in Apps, marked with a fullscreen badge and return tooltip, after visible windows and before parked apps. Clicking it or using its numbered shortcut returns to the child without parking the game. The icon also works on a held parent monitor; the game remains on its owning display. It does not appear on unrelated pages or Project columns. Selecting the game in Overview returns to its child; opening another app from the child returns to the parent first. Leaving fullscreen restores the game to its original desktop and removes the child. An explicit Park or Close also removes it. Original splits and floating placement are retained, while later changes to the parent are preserved. Reload and display synchronization retain the bond.

The fullscreen surface reaches all four display edges with square corners, no outer border or shadow. It bypasses the rounded material shape used by ordinary app windows. This is a browser simulation of fullscreen organization; native KWin and game integration remain future work.

On its owning monitor, the originating desktop shows a **48 px bottom preview** of the attached fullscreen surface. It uses the game's scene and icon, shows a distinct **Temporary desktop** badge and **Created for borderless fullscreen**, and offers **Enter desktop** with **Scroll down or click**. The strip sits below the ordinary window canvas and above any bottom-docked Areas, without changing dock preferences. Floating windows can cover the resting strip. Hover or keyboard focus lifts it to 112 px without resizing the canvas again and reveals **The app stays fullscreen while you use Desktop 1**. Its tooltip explains the parent link and lifetime. Click, Enter/Space, or a plain downward wheel gesture enters the existing child; the wheel shares the desktop momentum gate. The preview never appears on the held peer monitor, unrelated desktops or Project columns, the fullscreen child itself, or over another fullscreen window. Park, Close and leaving fullscreen remove it. Reduced-motion preferences disable its reveal animation.

Only the game's monitor displays the fullscreen child. The shared scroll route advances through the bond while the other monitor holds the parent:

| Scroll position | Game's monitor | Other monitor |
| --- | --- | --- |
| Parent | Desktop 1 | Desktop 1 |
| Bonded child | Fallout 4 fullscreen | Desktop 1 |
| Past the bond | Desktop 2 | Desktop 2 |

The reverse scroll follows the same route. Overview shows an indented, connected Fallout 4 card with the same scene preview, marked **Temporary** and **Attached to Desktop 1 · Display 1**, with its fullscreen window labelled separately from the parent. The running-window list gives the temporary desktop a larger scene card labelled **Created for Fallout 4's borderless fullscreen**, with **Removed when the app leaves fullscreen or closes**. **Back to Desktop 1** navigates to the parent while retaining fullscreen; **Restore window** returns the existing app to its parent as a normal window and removes the temporary desktop. Restore operates on the owning monitor even when requested from a peer and avoids the launch path that would re-enter fullscreen. Both actions also appear in Steam's Overview section while the temporary desktop exists. The other monitor's Overview context identifies its held ordinary desktop. A fullscreen diamond appears in the owning monitor's desktop rail when on ordinary desktops; the game itself has no desktop chrome.

Steam keeps its own navy library, green Play button, friends list and blue chat surfaces, including when the surrounding desktop uses light mode. The provider tab and its tools remain inside the common Overview.

System sections remain Timeline, Apps, Projects & Home and System. App-contributed tabs have their own separated group after those sections. A tab is available only in its provider’s workspace while the provider is open or parked; closing Steam removes its tab. Registration cannot replace a system section, and unavailable panels are hidden and excluded from carousel navigation.

Steam provides three separate sample conversations with independent drafts, original sample guides with search, browser-local autosaved game notes and illustrative achievement filters. All example names and UI are English. The scene is original SVG artwork, not a gameplay screenshot. No game process, Steam account or messaging service is connected, and sample messages stay in this browser.

## Stash

The Workspace & Projects Area shows the current context’s Stash. Ordinary work has a Workspace Stash in Home/Stash; a Project has its own Stash folder. It keeps explicit notes, excerpts, links and uploaded files with their source, saved time and provenance. The heading opens its folder in File Browser. A Project’s Stash is shared when that Project is opened from another Workspace.

Drop or paste content, or use **Add note or source**. A title is optional; drops save immediately. Items start collapsed and retain expansion state. Expand to inspect the source, rename, edit text or change a media caption. Edits autosave. Pin items, remove and undo, drag them into another app or attach them to Assistant. Source identity stays separate from the destination when copying between Stashes.

While dragging over Stash, a destination label names the Project or Workspace Stash and its folder. It follows the current context and disappears when the drag ends or is cancelled.

**Find in Stash** searches the current shelf’s titles, text, source labels and addresses, and filenames. **Pinned** isolates important items. Each Stash remembers its own filter during the session. Filtering hides existing disclosures without rebuilding media previews. An empty result offers **Show all items**; saving a new item or returning directly to one clears the receiving shelf’s filter so the item remains visible.

Each capture records a Timeline return link keyed to the saved item, surviving later insertion and renaming. Search uses local word matching, with date terms such as `today` / `yesterday` and `dnes` / `vcera`; it is not semantic AI retrieval.

Notes are represented as Markdown files, web sources as `.url` files and media keeps its file type. File selection and file drops copy contents into IndexedDB, with a 25 MB limit per file; note bodies and the manifest persist with the context. Bundled examples include real local media. Stash/audio viewers can play those files. Nothing writes into the computer’s native Project folders.

Older Quick notes migrate to pinned Stash notes, and existing next-step text becomes an ordinary note. There is no separate Quick Note panel or manual save-place control. Per-item merge/deletion markers support synchronization between demo displays. Clean/demo reset and Guide practice use their own storage handling.

## Assistant Area

Assistant is the digital assistant in its own fourth docked Area, also available without a Project. Its header or Super+A opens it. Enter submits a request; Shift+Enter adds a line. There are no preset prompt buttons and no real model/provider connection. Fixed local rules return explicitly labelled scripted examples.

Attach a Stash item, file, app title-bar icon, selected text or link. Tags identify origin Workspace, Project and app. The first Project attachment selects that Project’s root as the working folder; another Project never silently replaces it. Choose Workspace Home or an attached Project explicitly. When a saved Stash item came from another Project, its storage owner supplies the working folder and its original source remains visible separately.

The drag destination names the current chat and Workspace before release. Ordinary text dropped into an editable field remains text; file and explicit source drops attach to the chat, including when dropped over the composer.

Each Workspace keeps a list of chats. **New chat** starts an empty conversation; the Chat selector returns to earlier conversations and **Rename** gives one an explicit name. Otherwise the first request supplies its title. Every chat has its own draft, attachments, working folder and replies, preserved through Project switches and reloads. Existing single conversations migrate into the list without discarding their content.

Sources occupy a bounded, collapsible tray above the messages. Each source starts collapsed; expand it to inspect text, location and provenance, or remove it from the current context. Later drops do not expand the whole tray over a conversation. Dropping the same source again refreshes its current contents while earlier replies retain their own immutable source/folder snapshots. File batches remain assigned to the chat and Workspace in which the drop started, even if the user switches while storage is pending. Chat records merge independently across demo displays; another display cannot redirect the current chat’s input.

Replies can be dragged into Stash. Imported attachments are copied into browser storage; desktop attachments reference prototype files. Requests and replies are local and are not sent to a model. The scripted demo retains up to 60 replies and 24 sources per chat and 50 chats per Workspace. At the reply limit it keeps the draft and earlier history and asks for a new chat, rather than removing old replies. Legacy snapshots retain the active-chat projection needed by the Guide and display adapter.

The chat pass passed all project checks, including legacy migration, independent chat merges, immutable reply context and switching chats/Workspaces during a pending file batch. Live review at 1363 × 936 verified creating and renaming two chats, isolated drafts, two source drops, Enter and Send, and a later repeat drop keeping the tray collapsed without duplicating the source. The floating practice Guide covered Send until moved aside. [Verified chat layout](images/ai-chats-2026-10-13.jpg).

## Materials and background

The shared interface pass gives Projects & Home a Home sidebar and a project grid, groups System status beside Area recovery controls, and improves metadata in Timeline, search, Areas, app interiors and utility dialogs. Each pane keeps its bounded scroll region. Planner card heights remain tied to the time layout.

The pass was checked with the full regression suite and GitHub Pages deployment. Live visual review at 1363 × 936 covered System, Projects & Home with a created project, Timeline with a longer task, the project’s Areas, project creation and Pack. Follow-up app and narrow-layout visual checks were interrupted by a browser-control outage. The final contrast/alignment and Timeline completion-control adjustments passed automated checks; their final live visual review remains outstanding.

Controls use a fine reflected rim and a softer contact shadow, with a recessed, quick press. Navigation rows stay flush with their reading surface and retain the shared toggle indicator. The expanded Apps hotbar fits readable slots to the Area width; compact and rail layouts keep icons and shortcut digits, and narrow slots hide labels instead of wrapping them. Titles and secondary metadata have a consistent type hierarchy.

App windows use opaque ABS bodies with rounded silhouettes and discrete controls. Structural content joins remain flat. Areas, Overview, Pack/Import and transient menus use square acrylic/glass geometry. Main window content stays opaque. App colour connects the window, hotbar and parked card; floating windows have a subtle app-colour rim. Toggle light lines persist; momentary controls use short press feedback. Window numbers are unframed text.

The workspace-coloured wallpaper is one fixed background beneath the desktop and Areas, with static translucent blue/teal silk folds drawn in SVG. A slow opacity pulse replaces moving glow and particle layers. Cool acrylic sheets use restrained role colours: blue for Apps, project colour (amber in the library) for Workspace & Projects, mint for System, and lavender for Assistant. App casings and title bars carry their own accent; reading surfaces stay opaque with a gentler tint. Light mode uses a pale background and darker accent colours. Decorative animation pauses when hidden, during held-pointer interaction, in Overview and under Fullscreen, and respects reduced motion. The clock updates at minute boundaries.

## Current prototype and intended system

| Implemented here | Native implementation remains future work |
| --- | --- |
| Browser-local window geometry, contexts and app state | Managing real KWin/application windows |
| Simulated Workspace Home and Project folders; stored uploads | Native filesystem integration and permission handling |
| Workspace-owned mock browser/media sessions | Separate real browser profiles, native media sessions and app environments |
| Scripted Assistant replies and explicit source tags | Connected AI providers and actual inference |
| Local plans, reminders and explicit activity history | External calendar/task services and OS-level activity integrations |
| Two browser windows with synchronized display assignments | Native monitor discovery, hot-plug and window/display control |
| Prototype Pack/Import surfaces | Portable native app/workspace packaging |

Design goals should be evaluated separately from the implemented demonstration. The [audit record](documentation-audit-2026-10-12.md) links the current documentation claims to source and regression checks. Dated research/testing reports retain their historical scope.

## Recognizable app examples

The browser example is **Firefox** across windows, hotbar, app library and search. It uses the Firefox icon, a theme-aware tab strip, navigation controls, address field, bookmarks and a New Tab page. Each tab has independent back/forward history, bounded to 20 tabs per window, and survives reload within its own window and workspace. New tab, selecting and closing tabs, address entry, the local New Tab search, bookmarking and the Firefox menu are interactive. Native pages remain simulated; external URLs use the existing explicit link to open outside the prototype.

The bundled Firefox SVG is unchanged from [Mozilla’s official Firefox source](https://github.com/mozilla-firefox/firefox/blob/main/browser/branding/official/content/about-logo.svg). Firefox branding belongs to Mozilla. Steam visuals are a CSS/SVG interpretation of [Valve’s library](https://store.steampowered.com/libraryupdate) and [in-game tools](https://help.steampowered.com/en/faqs/view/3978-072C-18DF-FBF9); no account connection is implied. Spatial still owns window placement, numbered hotbar shortcuts, fullscreen state and the common Overview frame.
