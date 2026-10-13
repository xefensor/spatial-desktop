# UI and UX notes

Current conventions as of 13 October 2026. Spatial Desktop remains a browser prototype; simulated apps, system tools and files do not provide native OS integrations.

## Windows and hotbar

New tiled windows fill rows from left to right, then top to bottom. The first pair forms two vertical halves when minimum usable sizes fit. Floating obstacles retain their reserved space; constrained layouts can park windows. Manual edge drops still choose a specific split.

Open hotbar icons follow the visible windows’ reading order. Moving or retiling windows updates their numbers and shortcuts together. Parked windows follow the open group. Each app instance has its own slot, and its title bar shows the matching number as plain text without a border, background or shadow. Slots run 1–9,0; Shift selects the next ten with Super.

Desktop Guide uses thirteen chapters, generic app names and learner-chosen tools. Stash and AI are introduced before Projects; arranging Areas comes after Overview & Timeline.

Fresh setup demo scenes follow the same window order. A one-time migration updates exact old shipped split trees, preserving manually changed trees and other session data.

## Overview

Overview has four horizontally navigable sections: Timeline, Apps, Projects & Home, and System. Sideways swipes, Shift+scroll, section tabs, edge previews and Left/Right move between sections. Lists retain their own vertical scrolling. A compact context header identifies the current Workspace, Project and desktop.

Apps combines the desktop map, running-window lists and the launcher. Filters show the current desktop, open windows or parked windows. Timeline aligns local activity with calendar events, tasks and reminders. Search and Workspace selection remain available across sections.

Projects & Home supports name, summary and folder-path search and a filter for Projects open in this Workspace. Cards show current/open/available status. Global search uses bounded groups in two columns and an explicit result-category selector; filtered-out results also leave keyboard navigation.

Stash has context-owned text and Pinned filters, a visible filtered count and a recovery action when nothing matches. Filtering retains disclosure and media nodes. Direct returns and new captures reveal their item by clearing only the receiving shelf’s filter.

The browsing pass on 13 October passed all 20 project checks and GitHub Pages deployment. Live accessibility review verified project-name search, the Open here empty state, Show all projects recovery, Workspace filter reset and current/open/available project labels. The new Stash controls were present after deployment. Final visual captures and live Stash/global-search interaction review were blocked by repeated browser-control timeouts; automated checks cover their filtering, context isolation and result recovery.

## Materials and accessibility

- App windows retain opaque ABS bodies, rounded silhouettes and rounded discrete controls. Structural content joins stay flat.
- Areas, Overview and transient menus use square acrylic/glass geometry with thin edges.
- Window shortcut numbers are unframed text, rather than another control or panel.
- App colours connect windows, launcher icons and parked cards.
- Toggle indicators remain distinct from momentary actions; press feedback stays short.
- Keyboard focus is visible. Workspace tabs support Left/Right, Home and End; search navigation respects category selection.
- System headers stay outside their scrolling content. Readable app content remains on solid surfaces.

## Area controls and recovery

Area headers expose the same Expanded, On rail and Hidden choices through their context menu. Border handles remain the direct way to resize. Areas in one dock column share their thickness and Expanded/On rail changes; Hidden remains individual. A moved Area adopts the destination column’s state, and showing a hidden Area rejoins its visible peers. Expanded remembers the column’s previous size on each edge; cancelling an Area drag restores its starting placement. Recent layout changes offer an actionable Undo without restoring old app text or chat contents.

The Projects heading in Overview uses the surrounding glass surface. A conflicting generic heading rule previously added a separate grey background in light mode; the project heading now explicitly keeps a transparent background.

The column correction passed all 20 checks and deployment. Live review at 1363 × 936 verified System and AI collapsing together to 70 px, Undo restoring both to 300 px, and a System border drag resizing both to 378 px while the left column stayed 280 px. The final System stylesheet also hides rail-only tools in expanded mode; rail controls remain available when collapsed. The Projects heading’s computed background is transparent and its light-mode appearance was reviewed. Verified views: [shared System/AI column](images/shared-area-column-verified-2026-10-13.jpg) and [Projects without the grey heading](images/projects-overview-fixed-2026-10-13.jpg).

System puts quick settings and the next planned item before the full month calendar. The month is a keyboard-accessible disclosure; the rail's Agenda action reveals it. AI and Stash drop labels name the receiving chat or context before release, including over narrow rails. Plain-text drops into editors remain text insertion.

## Maximize, Fullscreen and ownership

Maximize retains Areas; Fullscreen uses their display space. Other apps can transfer to a second demo display without displacing its existing apps, otherwise park. Restore respects deliberate moves, closing and parking. Fullscreen transfers Areas when possible or hides them temporarily. Project desktop stacks replace named Modes, and their sessions save automatically.

## Documentation and checks

The [README](../README.md) introduces the prototype and its controls. The [reference](prototype-reference.md) describes persistence, demo scenes, app tools, Stash and simulated integrations. The [live philosophy](https://xefensor.github.io/spatial-desktop/philosophy.html) explains the design through workflow examples.

Automated checks in `scripts/check-*.cjs` cover layout, window intent, demo migration, independent sessions, Overview, Guide and material behaviour. Passing these checks is distinct from visual browser inspection or native hardware testing. Dated audit and testing reports preserve their original findings.

## Philosophy appearance

The philosophy page shares the desktop’s Auto/OLED/Graphite/Light preference and follows system changes live in Auto. The header and chapter navigation use square acrylic; the reading surface is opaque ABS with rounded outer corners. Mobile layout keeps the same material hierarchy. Theme integration checks cover system updates, manual overrides and cross-tab synchronization.

Live browser captures: [Graphite](images/philosophy-graphite-2026-10-12.jpg) and [Auto following a light system appearance](images/philosophy-auto-light-2026-10-12.jpg), captured 12 October 2026.
