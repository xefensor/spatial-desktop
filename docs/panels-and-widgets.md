# Panels and widgets

Panels and live widgets are the desktop's canonical interface. The earlier Areas layout and its drag, resize and rail engines are retired. Historical captures and Xef's authored philosophy remain records of the earlier design.

## Normal use

The default left panel is 224 pixels wide and starts with Overview above Quick launch, followed by Apps, a readable Clock and bottom tools for Notifications, Calendar and System controls. General starts with File Browser, Firefox, Music Player and Note Editor in Quick launch. Files and Assistant start in the compact right panel. Overview is its own icon, separate from Apps. Only an untouched earlier default adopts the new width. An unchanged former Overview position moves to the top while other panel and widget preferences stay intact; custom widget orders, Spacers and explicitly moved or hidden Overview remain as saved.

Expanded System controls uses a compact two-by-two grid for Wi-Fi, Bluetooth, Sound and theme, followed by network status and the labeled Devices & session and Settings actions. Files keeps New project beside its folder content without an empty reserved region. Creating or managing a Project opens a separate dialog above the panels, with focus returning to the initiating control when it closes.

Panels have Expanded, Compact and Hidden presentations. Compact keeps the expanded panel's widget order and grouping. Apps shows Quick launch and Background permanently; only Parked scrolls. Clock shows the time directly. Other compact widgets open their live content beside the panel without moving desktop windows. Escape or a click outside closes that content. **Keep expanded** pins it into the panel.

Individual widgets have Icon and Expanded appearances. A compact panel remembers the widgets' expanded preferences. If space is temporarily insufficient, content can fall back to an icon and recover when space returns. Controls, drafts and models survive these changes.

Spacing contracts before readable content falls back to an icon. Quick launch names wrap onto two lines, and Parked card actions wrap beneath their identity in narrow panels. Changes to favorites keep the existing focused launcher where possible. Compact actions follow the same Guide restrictions and native availability as their expanded controls.

Temporary widget content sizes to its live contents within the viewport. Notifications follow their own widget when it moves. Changing Workspace, display or fullscreen ownership dismisses layout menus and cancels unfinished drags; resizing the viewport keeps an open menu reachable without moving focus out of its fields.

## Arrangement

Right-click a panel → **Edit layout**. The edit toolbar offers Panels, Widgets, Add panel, Undo, Reset layout, Help and Done. Panels and widgets have no title bars or panel footers, and no editing button permanently occupies the desktop.

In edit mode, drag a widget to reorder it or move it between panels. Click it for options. Add **Spacer** from Widgets; each Spacer is an independent, movable instance sharing the available space. Moving a widget never also activates it.

Use **Panels → Move** to drag a whole panel to another edge. Panel options select its display, presentation and name. Drag the panel border to change its thickness; panels sharing an edge can also change their share of that edge. Widgets have no individual resize handles. Escape or pointer cancellation restores the starting arrangement. Done restores normal controls.

Removing a widget retains its content. Removing a panel transfers its widgets to another panel. Hidden panels can be recovered from the widget picker. Reset layout affects the current Workspace, without clearing documents, chats or app sessions.

The Panels menu also offers **Show** for hidden panels. Unavailable reorder directions and Add panel at the panel limit are disabled. The temporary edit toolbar wraps on narrow screens so Done remains reachable.

## Widgets and ownership

| Widget | Content and scope |
| --- | --- |
| Overview | Native Overview/search action and current desktop |
| Apps | Workspace Quick launch and Parked, shared Background apps |
| Files | Workspace or Project folders, resources and Stash |
| Assistant | Scoped chats, attachments, working files and display permission |
| Clock | Shared time and date |
| Calendar | Workspace plans and month view |
| Notifications | Workspace notifications and history |
| Clipboard | Workspace clipboard history |
| Focus | Workspace focus session |
| System controls | Shared audio, network, Settings and session controls |
| Devices | Connected devices |
| Requests | App requests belonging to this desktop |
| Project plans | Current Project plans |
| Workspace alerts | Shared alerts and other Workspaces' unread counts |
| Spacer | Flexible space; multiple instances allowed |

System controls use glass in the panel and popup. App content uses opaque ABS. Each Workspace retains panel placement, size, display assignment, widget order and appearance. Layout edits never change file, window or chat ownership.

Fullscreen temporarily hides panels on a single display. With another connected display, panels move there as whole panels and return after exit. A disconnected display assignment falls back to the available display. Extended workspace and Side space use the same panel implementation.

Assistant's display permission is explicit and belongs to the display and Workspace. Opening or arranging a widget never grants it. Assistant examples remain scripted local demonstrations; native OS control is future work.

## Development and checks

The buildless site lives in `dist/`. Install the pinned development-only dependency with `npm ci`, then run the README's syntax and regression commands. DOM checks cover real widget actions, ownership, cancellation, popup bounds, live node identity and Guide targets. Model stress cases cover small viewports, displays, icon packing and saved layouts. Refresh content hashes with `node scripts/refresh-site-assets.cjs` before publication.
