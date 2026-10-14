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

Workspace separation is simulated under one browser profile. It does not create native users, sandbox applications, change native Home folders, enforce file permissions or replace the system clipboard.

## Desktop Guide and setup

The visible app is **Desktop Guide**. `Spatial Guide` remains a legacy launch key in source. New visitors begin on an empty desktop and can take the hands-on introduction or choose their desktop. Existing sessions do not have to repeat it.

The current thirteen chapters follow this order:

| Order | Chapter | Purpose |
| --- | --- | --- |
| 1 | System | Try a quick setting and learn toggle feedback |
| 2 | Apps & Overview | Open a tool and find another through search |
| 3 | Windows | Tile, float, Maximize and try Fullscreen |
| 4 | Parking | Put a useful app aside and bring its window back |
| 5 | Desktops | Change page while keeping the same context |
| 6 | Stash | Save and inspect an idea without requiring a Project |
| 7 | AI | Attach a source, write a request and keep a scripted reply |
| 8 | Projects | Create a Project and use its separate windows/desktops |
| 9 | Workspaces | Create a Workspace and explore its Home folders |
| 10 | Overview & Timeline | Find work and compare local activity with a plan |
| 11 | Arrange your Areas | Resize, dock, hide and recover Areas |
| 12 | Try it on your own | Combine actions without target highlights |
| 13 | Two displays | Optional practice with a second browser window |

Tasks use generic app names and let learners choose compatible tools. Each task can be skipped; the next task prepares missing prerequisites. Examples and extra explanations are expandable. Only introduced Overview sections are exposed during practice. The Guide supports expanded/compact presentation and contextual recovery when a window is closed, parked or in the wrong context.

Repeated introductions and chapter practice use isolated storage. Progress survives reload. Leaving a repeated introduction offers a return to the original session; individual chapter practice returns directly. Explicit **Clean desktop** or **Explore the demo** choices replace the current session while preserving display preferences. A clean desktop has General only, with no open apps or Projects. The temporary second practice display closes when its chapter ends and does not join the original session.

Find Desktop Guide in **Overview → Apps → Help**, or search its name. [Start the guide](https://xefensor.github.io/spatial-desktop/?guide=start).

## Demonstration scenes

| Workspace | Example activity | Initial context |
| --- | --- | --- |
| General | Everyday files | Ordinary Workspace desktops; no open Project |
| School | Urban Ecology research | Reading, observations and survey evidence in a Project |
| Work | Website Launch and Short Film | Two Projects, each with two desktops |
| Gaming | Co-op session | Ordinary Workspace desktops and a parked Music Player |

Website Launch pairs a preview with its development terminal on Desktop 1, and source files with a checklist on Desktop 2. Short Film pairs footage with edit notes, then cut feedback with a parked soundtrack player. Urban Ecology pairs reading and observations, with survey evidence on the next desktop. The data and app content illustrate workflows.

Setup pairs use side-by-side vertical halves. Automatic openings fill a row from left to right, then start the next row. Three windows prefer two across the top and one full-width below; four prefer a 2×2 grid even on a wide display. If that would violate app minimum sizes, the automatic layout falls back to a width-based arrangement. Minimum usable sizes and floating obstacles can constrain placement. The one-time order migration changes exact old shipped split trees; manually rearranged trees remain intact. Broader scene migrations preserve edited Project definitions and notes, and skip Workspaces attached to custom Projects.

## Window placement and parking

Tiling shares the bounded space between Areas. Left-drag a title bar to rearrange tiles; drag a divider or resize handle to change their shares. The new-window order does not depend on which window was last focused. Manual edge drops select a specific split. Middle-button title-bar dragging or Alt+left-drag floats a window; a normal drag or the window menu returns it to tiling.

Tiled windows avoid floating obstacles when space allows. Floating windows can overlap one another. Space pressure and fully obscured/offscreen windows can park in Apps rather than become unreachable. Window fitting does not promise every app remains visible at every viewport size.

**Park** replaces minimization in the visible interface. The window leaves the canvas but its app remains available through a useful card. **Unpark** restores it on the currently viewed desktop in its owning context. Parked apps travel between desktops inside that Workspace or Project; parking does not change ownership.

Expanded Apps displays open-window icons at the top and useful parked cards below, without duplicating each parked card with an extra icon. On a rail, open icons remain at the top and parked icons start around the lower middle. Right-click a parked icon for relevant background actions. Commands such as playback keep the window parked; opening a file or note restores it. **Window options…** opens the movement menu.

### Numbers and shortcuts

The hotbar follows visible windows’ reading order: left to right across a row, then top to bottom. Moves and retiling update both numbers and shortcuts. Parked entries follow the open group. Every separate app instance gets its own slot. Each open app title bar shows the matching number as plain text with no border, background or shadow.

| Slots | Shortcut |
| --- | --- |
| 1–10 | Super+1–9,0 |
| 11–20 | Super+Shift+1–9,0 |
| Later slots | Click the entry; no additional keyboard bank is bound |

Alt+number and Alt+Shift+number are browser fallbacks. Focus or restore with the shortcut; invoking it again on the focused window parks that window. Shift+click a hotbar icon creates another app instance. The host OS may intercept Super shortcuts.

### Maximize and Fullscreen

| Action | Input | Space and other windows |
| --- | --- | --- |
| Maximize | Left-click maximize, or double-click title bar | Fills the canvas between Areas; peers move to the second display when they fit, otherwise park |
| Fullscreen | Middle-click maximize | Fills the whole display; peers transfer or park, and Areas transfer when possible or temporarily hide |
| Restore | Repeat the control; Escape also leaves Fullscreen | Returns automatically parked/transferred peers and temporarily moved/hidden Areas |

Explicit moves, closing or parking cancel automatic peer return. A busy second display is not cleared to make room: candidate transfers must fit without parking its existing apps. Both displays are browser windows on the same origin/profile, with prototype display assignments rather than native monitor management.

## Navigation and Areas

Scroll over an Area header, rail or non-scrollable content to change vertical desktop pages, even while a window is focused. Scrollable Area content keeps its wheel at both edges; input fields retain their normal scrolling. Nested scrollers do not pass motion to outer panes. Shift+scroll over an Area switches between the ordinary Workspace and open Projects unless a nested horizontal scroller owns that motion. You can also click desktop background or an Area to release window focus, then scroll over the canvas. Super+scroll and Super+Shift+scroll work from windows or Areas when the browser receives them. Page Up/Down provide desktop navigation with focus released; Shift selects Project navigation.

While holding a title bar with the left mouse button, scroll to carry the window to another desktop; Shift+scroll changes its Project context. Release to place it. Cancelled drags return to the original placement. Ordinary scrolling inside focused apps remains an app action.

All four Areas default to vertical side docks: Apps and Workspace & Projects on the left, System and AI on the right. Move an Area using its header/handle; resize its inner border. A rail and an expanded Area are presentations of the same dock. The removed Area Compact state is distinct from the Guide app’s compact view.

Every Area header's context menu offers **Expanded**, **On rail** and **Hidden**, with the current state marked. Areas sharing a dock column on the same display resize, collapse and expand together, remembering that column’s previous expanded thickness. Top/bottom rows share their height in the same way. Hidden applies to the chosen Area; showing it again joins its visible peers’ state and size. Docking into an occupied edge joins that column rather than replacing its width. The same menu is available with Shift+F10 from a focused header control. Dragging remains available; Escape, a cancelled pointer or leaving the browser cancels an unfinished Area gesture.

Completed Area changes and window moves offer **Undo** in their feedback message. Recovery restores placement and state, not document text, chat drafts or playback contents. The offer applies to the just-completed change; if another layout, context or display change intervenes, the previous offer cannot overwrite it. Maximize and Fullscreen keep their existing automatic Restore behavior.

A column of rails has one shared thickness and stays anchored to its screen edge. The System/AI column is 70 px wide on a side edge (64 px high on a horizontal edge). Collapsing System resets its scroll position so the rail clock and alerts are immediately visible. Temporary widget reveals can open over the scene without changing the column’s saved size. Older mixed rail/expanded preferences are fitted to their shared saved dock thickness.

All four Areas can be hidden through their context menus and restored in **Overview → System → Desktop Areas**. Super or the Overview keyboard fallback remains useful if every Area is hidden. Visibility and dock layout save per Workspace. Ordinary tiling respects dock bounds; explicit floating/fullscreen interactions can request temporary Area changes. Fullscreen Area transfers/hiding are reversible and respect Manual mode.

Border drags stop at available space rather than pushing the opposite Area offscreen. Side docks have a 520 px ceiling and top/bottom docks a 360 px ceiling, also capped at 40% of that display extent. Up to 440 px width / 320 px height remains reserved for the canvas, scaled down on small viewports. Old oversized states are fitted to the current display; the preferred size can return on a larger display.

## System Area

Expanded System starts with a compact clock, quick settings and the focus action. **Next up** shows the nearest planned item and opens Timeline. **Month view** expands the calendar when needed, leaving more space for notifications and connected devices by default. The rail keeps its clock, alerts and daily tools; its Agenda action temporarily reveals the panel and opens the month.

The 13 October System and recovery pass passed all 19 project checks and GitHub Pages deployment. Live review at 1363 × 936 covered light and OLED themes, opening and closing the month, System and AI rail changes with Undo, docking System at the top and restoring it, moving an app to another desktop and undoing it, and attaching then removing an app source in AI. The final spacing adjustment keeps the focus action and Area status in one row. Pointer cancellation, stale Undo protection and named AI/Stash destinations also have automated regression coverage.

![Compact System with quick settings, next event and collapsed month](images/system-and-recovery-2026-10-13.jpg)

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

Overview has four horizontal sections: **Timeline, Apps, Projects & Home, System**. Sideways swipes, Shift+scroll, section tabs, edge previews and Left/Right change sections. Each section snaps into view; lists retain vertical scrolling. Workspace selection and global search remain available, and a compact header names the current Workspace, Project and desktop.

Nested lists keep wheel ownership at their top/bottom or left/right edges, without advancing the Overview section or scrolling a parent pane. Section navigation remains available over non-scrollable content; Shift+scroll can cross a vertical list, but stays inside a nested horizontal scroller.

The containment change passed the full project check suite, including Area edge/focus routing and nested horizontal Overview lists. Live review verified repeated wheel input beyond both ends of the app library kept the Apps section selected. [Reviewed Overview](images/contained-scroll-2026-10-13.jpg).

Apps keeps existing work on the left and the app library on the right. Desktop cards show their app icons; running-window rows show the current content, state, desktop and matching hotbar number. Windows are ordered by desktop and hotbar position. Filters select the current desktop, open windows or parked windows; the launcher stays available. The library has visible categories and an icon grid with readable labels. Narrow screens stack the work pane above the library and use a category selector. Projects & Home exposes context and folder navigation. System includes settings, notifications and recovery controls for Areas.

Projects & Home has its own project search, matching names, summaries and folder paths, plus **Open here** for the current Workspace. Cards distinguish available projects, projects open in this Workspace and the current Project’s desktop. Opening another Workspace clears this library filter. Global search groups results into two readable columns on a wide screen and one on a narrow screen; **Show** filters Applications, Files, Stash, Projects or System & actions. Clearing the search returns to Overview and resets the category.

![Apps in Overview: desktops and running windows beside the app library](images/overview-apps-2026-10-12.jpg)

Timeline records explicit app, file, browser, Project, desktop and Stash actions per Workspace. Return actions reopen the relevant context or stored item. The shared time axis aligns activity with calendar, task and reminder lanes; calendar events show durations and overlaps. **Now**, **Latest activity** and day navigation help find a moment. The System calendar opens this view and shows the next planned item.

Create local events with start/end, tasks and reminders. Completion and dismissal persist through reload and between demo displays. Plans can appear even without a recorded app interaction. Demo plans are labelled examples; clean and newly created Workspaces start without them. No external calendar account is connected. Timeline is explicit prototype activity history, not a keylogger, clipboard recorder or passive screen capture.

## Gaming and app-contributed Overview tabs

The demo’s **Gaming** workspace starts with an illustrative Fallout 4 game open in fullscreen and Steam parked in Apps. Both are native prototype windows with hotbar slots. They are scoped to Gaming; they do not appear in the other workspaces’ app library or search, and this sample cannot be moved into another workspace. Clean sessions and Desktop Guide do not seed these examples.

Press **Super** (or **Alt+Space** in a browser) or use **Open Overview** in the game. Overview opens above fullscreen and selects Steam when it is running in Gaming. **Escape** closes Overview and returns to the game; **Switch app** opens the Apps section. Choosing another app uses the usual window manager. **Return to game** restores the game’s fullscreen view. **Show desktop** leaves fullscreen while keeping the game open. Switching workspaces saves the existing fullscreen session.

Steam keeps its own navy library, green Play button, friends list and blue chat surfaces, including when the surrounding desktop uses light mode. The provider tab and its tools remain inside the common Overview.

System sections remain Timeline, Apps, Projects & Home and System. App-contributed tabs have their own separated group after those sections. A tab is available only in its provider’s workspace while the provider is open or parked; closing Steam removes its tab. Registration cannot replace a system section, and unavailable panels are hidden and excluded from carousel navigation.

Steam provides three separate sample conversations with independent drafts, original sample guides with search, browser-local autosaved game notes and illustrative achievement filters. All example names and UI are English. The scene is original SVG artwork, not a gameplay screenshot. No game process, Steam account or messaging service is connected, and sample messages stay in this browser.

## Stash

The Workspace & Projects Area shows the current context’s Stash. Ordinary work has a Workspace Stash in Home/Stash; a Project has its own Stash folder. It keeps explicit notes, excerpts, links and uploaded files with their source, saved time and provenance. The heading opens its folder in File Browser. A Project’s Stash is shared when that Project is opened from another Workspace.

Drop or paste content, or use **Add note or source**. A title is optional; drops save immediately. Items start collapsed and retain expansion state. Expand to inspect the source, rename, edit text or change a media caption. Edits autosave. Pin items, remove and undo, drag them into another app or attach them to AI. Source identity stays separate from the destination when copying between Stashes.

While dragging over Stash, a destination label names the Project or Workspace Stash and its folder. It follows the current context and disappears when the drag ends or is cancelled.

**Find in Stash** searches the current shelf’s titles, text, source labels and addresses, and filenames. **Pinned** isolates important items. Each Stash remembers its own filter during the session. Filtering hides existing disclosures without rebuilding media previews. An empty result offers **Show all items**; saving a new item or returning directly to one clears the receiving shelf’s filter so the item remains visible.

Each capture records a Timeline return link keyed to the saved item, surviving later insertion and renaming. Search uses local word matching, with date terms such as `today` / `yesterday` and `dnes` / `vcera`; it is not semantic AI retrieval.

Notes are represented as Markdown files, web sources as `.url` files and media keeps its file type. File selection and file drops copy contents into IndexedDB, with a 25 MB limit per file; note bodies and the manifest persist with the context. Bundled examples include real local media. Stash/audio viewers can play those files. Nothing writes into the computer’s native Project folders.

Older Quick notes migrate to pinned Stash notes, and existing next-step text becomes an ordinary note. There is no separate Quick Note panel or manual save-place control. Per-item merge/deletion markers support synchronization between demo displays. Clean/demo reset and Guide practice use their own storage handling.

## AI Area

AI is its own fourth docked Area, also available without a Project. Its header or Super+A opens it. Enter submits a request; Shift+Enter adds a line. There are no preset prompt buttons and no real model/provider connection. Fixed local rules return explicitly labelled scripted examples.

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

The workspace-coloured wallpaper is one fixed background beneath the desktop and Areas, with static translucent blue/teal silk folds drawn in SVG. A slow opacity pulse replaces moving glow and particle layers. Cool acrylic sheets use restrained role colours: blue for Apps, project colour (amber in the library) for Workspace & Projects, mint for System, and lavender for AI. App casings and title bars carry their own accent; reading surfaces stay opaque with a gentler tint. Light mode uses a pale background and darker accent colours. Decorative animation pauses when hidden, during held-pointer interaction, in Overview and under Fullscreen, and respects reduced motion. The clock updates at minute boundaries.

## Current prototype and intended system

| Implemented here | Native implementation remains future work |
| --- | --- |
| Browser-local window geometry, contexts and app state | Managing real KWin/application windows |
| Simulated Workspace Home and Project folders; stored uploads | Native filesystem integration and permission handling |
| Workspace-owned mock browser/media sessions | Separate real browser profiles, native media sessions and app environments |
| Scripted AI replies and explicit source tags | Connected AI providers and actual inference |
| Local plans, reminders and explicit activity history | External calendar/task services and OS-level activity integrations |
| Two browser windows with synchronized display assignments | Native monitor discovery, hot-plug and window/display control |
| Prototype Pack/Import surfaces | Portable native app/workspace packaging |

Design goals should be evaluated separately from the implemented demonstration. The [audit record](documentation-audit-2026-10-12.md) links the current documentation claims to source and regression checks. Dated research/testing reports retain their historical scope.

## Recognizable app examples

The browser example is **Firefox** across windows, hotbar, app library and search. It uses the Firefox icon, a theme-aware tab strip, navigation controls, address field, bookmarks and a New Tab page. Each tab has independent back/forward history, bounded to 20 tabs per window, and survives reload within its own window and workspace. New tab, selecting and closing tabs, address entry, the local New Tab search, bookmarking and the Firefox menu are interactive. Native pages remain simulated; external URLs use the existing explicit link to open outside the prototype.

The bundled Firefox SVG is unchanged from [Mozilla’s official Firefox source](https://github.com/mozilla-firefox/firefox/blob/main/browser/branding/official/content/about-logo.svg). Firefox branding belongs to Mozilla. Steam visuals are a CSS/SVG interpretation of [Valve’s library](https://store.steampowered.com/libraryupdate) and [in-game tools](https://help.steampowered.com/en/faqs/view/3978-072C-18DF-FBF9); no account connection is implied. Spatial still owns window placement, numbered hotbar shortcuts, fullscreen state and the common Overview frame.
