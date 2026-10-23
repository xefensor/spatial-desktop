# Panels and widgets

Panels and live widgets are the desktop's canonical interface. The earlier Areas layout and its drag, resize and rail engines are retired. Historical captures and Xef's authored philosophy remain records of the earlier design.

## Normal use

The populated demo uses a 200-pixel left panel with Overview above Apps, followed by a readable Clock and bottom icons for Notifications, Calendar and System controls. General shows only this left panel; its right panel starts hidden with no icon rail or reserved space. Other demo Workspaces retain the 248-pixel right panel with Files expanded and Assistant as an icon. General starts with File Browser, Firefox, Music Player and Note Editor in Quick launch. Overview remains an ordinary widget above Apps; its expanded button shows the Overview icon beside the current Workspace name. Compact panels retain the icon, with the Workspace in its tooltip and accessible label. Opening a Project keeps the Workspace name.

An untouched demo layout compacts the right panel below a 1360-pixel viewport and both panels below 1180 pixels, leaving more space for app windows. Widening the viewport restores their expanded presentation. This temporary fit does not rewrite saved modes. Deliberately changing panel sizes, modes, widget appearances or order makes the layout your own and ends this demo-specific fitting.

These defaults apply when a built-in demo Workspace has no saved panel session, including an explicit Explore demo reset. Untouched older General defaults upgrade once to the left-only presentation. Customized saved layouts keep their sizes, modes, order and Spacers; subsequently showing the right panel remains saved. Clean desktops and newly created Workspaces use the standard 224-pixel expanded left panel and compact right panel. Reset layout restores the current Workspace’s applicable demo or clean arrangement; it does not reset app windows, files or chats.

Expanded System controls uses a compact two-by-two grid for Wi-Fi, Bluetooth, Sound and theme, followed by network status and the labeled Devices & session and Settings actions. Files keeps New project beside its folder content without an empty reserved region. Creating or managing a Project opens a separate dialog above the panels, with focus returning to the initiating control when it closes.

Panels have Expanded, Compact and Hidden presentations. Compact keeps the expanded panel's widget order and grouping. Apps shows Quick launch and Background permanently; only Parked scrolls. Clock shows the time directly. Other compact widgets open their live content beside the panel without moving desktop windows. Escape or a click outside closes that content. **Keep expanded** pins it into the panel.

Individual widgets have Icon and Expanded appearances. A compact panel remembers the widgets' expanded preferences. If space is temporarily insufficient, content can fall back to an icon and recover when space returns. Controls, drafts and models survive these changes.

Spacing contracts before readable content falls back to an icon. Quick launch names wrap onto two lines. Parked cards keep Unpark and Close beside the title; long titles and subtitles truncate instead of pushing controls underneath. Right-click a card for window options, or focus one of its controls and press Shift+F10. New expanded Apps panels start at 280 pixels wide. Only exact, untouched earlier defaults adopt the wider size once; custom layouts and later manual resizing stay as saved. Changes to favorites keep the existing focused launcher where possible. Compact actions follow the same Guide restrictions and native availability as their expanded controls.

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
| Overview | Native Overview/search action, current Workspace name and desktop |
| Apps | Workspace Quick launch and Parked, shared Background apps |
| Files | Workspace or Project folders, resources and Stash |
| Assistant | Workspace/Project chats, context and display-control switches, voice input and read-aloud controls, attachments and saved outputs |
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

Assistant shows its Workspace and Project beside chat. Each context remembers its last conversation and draft; first entry starts a chat, and returning restores the previous one. Opening another app, switching virtual desktops or changing the widget's appearance keeps that conversation.

The composer has a microphone button and **Voice options**. **Manual** dictation adds a transcript to the current draft for review before Send. **Wake phrase** waits for “Hey Assistant”; **Continuous** sends finished utterances without an activation phrase. These automatic modes start with an empty draft, so typed text cannot be sent accidentally. **Read replies aloud** is independent of microphone input, with **Stop speaking** available during playback. Activation mode and read-aloud preference are remembered per Workspace; listening itself is never restored automatically. Active listening and its current state remain visible. Context changes, display setup or role changes, hiding the tab and leaving the page stop listening and discard pending recognition. Existing typed drafts remain intact. Voice recognition availability depends on the browser: Wake phrase requires supported on-device recognition and an available language pack. Where supported, **Install English pack** in Voice options downloads it on request; installation leaves the microphone off until you start it. Manual and Continuous may use the browser’s online recognition service. Recognition pauses while replies are read to avoid feeding Assistant’s own speech back into chat.

**Context** and **Display control** are compact, separate switches beside chat. The scope stays on one line; explanations live in tooltips and on-demand help. Both start off in a new context. The first includes readable demo content from open apps and documents in that context when you send, with an automatic-context summary separate from manually attached references. The second grants scripted control of the current display in that Workspace/Project and display setup. It works with Main workspace, Extended workspace and Side space, including one Main display. Settings → Displays can also change the permission for a selected connected display. Opening or arranging a widget never grants either permission. **Take over** and **Continue** pause and resume a task separately from permission. Changing context interrupts unfinished scripted work and retains its captured inputs and original scope in its chat. On Main or Extended workspace, desktop navigation also interrupts display steps while keeping the chat. Side space keeps its windows in place across desktop navigation. Assistant examples remain scripted local demonstrations; native OS control is future work.

**Examples** below the message field lists supported requests, with **Desktop tasks** for guided file workflows and **Sample conversation** for the illustrative exchange.

## Planned Assistant interaction: voice and shared material

Requested interaction requirement; this section describes intended behavior, not functionality already implemented in the browser demo.

- Keep text entry, paste, Send and attachment controls usable throughout an active voice conversation. Users can send text, code, screenshots and other supported files without ending the voice session.
- Put spoken messages and explicitly submitted material in the same Workspace/Project conversation. Assistant can use a submitted example together with the user's spoken explanation in the ongoing task.
- Treat microphone listening, reply playback and composer input as independent controls. Typing, pasting or sending material must not require stopping or restarting the voice session.
- Preserve unsent drafts and pending attachments. Voice recognition must not overwrite them or automatically submit typed material; typed content is submitted only through an explicit Send action. The existing automatic-mode draft guard describes the current demo, not a restriction of this intended interaction.
- Support staged input: when the user says to wait for more material, keep the conversation open and wait for an explicit instruction to proceed with the dependent task.
- Keep existing context boundaries: switching Workspace or Project must not transfer an unfinished utterance, draft or attachment to the new conversation.

## Development and checks

The buildless site lives in `dist/`. Install the pinned development-only dependency with `npm ci`, then run the README's syntax and regression commands. DOM checks cover real widget actions, ownership, cancellation, popup bounds, live node identity and Guide targets. Model stress cases cover small viewports, displays, icon packing and saved layouts. Refresh content hashes with `node scripts/refresh-site-assets.cjs` before publication.
