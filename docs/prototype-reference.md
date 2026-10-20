# Prototype reference

This reference describes the panel and widget desktop. See [Panels and widgets](panels-and-widgets.md) for the current layout, compact behavior, controls and ownership. The [earlier reference](history/prototype-reference-areas-2026-10-18.md) preserves historical Area behavior and captures.

## Desktop and windows

Windows tile automatically and show their hotbar numbers. Multiple instances keep independent content and numbers. Parked windows retain their instance; Background services stay available across Workspaces. Float gives manual placement. Maximize retains panels; Fullscreen temporarily hides or transfers them. App dialogs remain attached to their owner. Hide preview protects content in parked previews and the desktop map.

Desktop pages stack vertically. Projects have their own column of desktops; Workspaces separate wider contexts. Parked windows belong to the whole current column. Desktop indicators and the desktop map show location and open windows without including parked or closed windows.

## Panels and widgets

Right-click a panel → **Edit layout** to move widgets, add Spacers or arrange whole panels. Compact and expanded presentations retain the same grouping and actions. Icons open temporary live content; **Keep expanded** pins it. Panel borders resize panels. Apps keeps Quick launch and Background visible, while only Parked scrolls.

Panels and widgets have no headers or panel footers. Widget movement is available in edit mode. The former Areas layout, shared-column controls and independent rail engines are retired. Historical lesson identifiers remain only for saved progress compatibility.

## Ownership and files

Workspaces separate Home folders, app sessions, browser history, multimedia, clipboard history, notifications and panel layouts. Projects own a folder, resources, windows and desktop column. Downloads follow the Workspace unless a Project opts into its own Downloads folder.

Files exposes folders, Project management and Stash. Create, import, rename, copy, move, trash and recover files. Stash retains text, files and source references within the active context. Notes can bind to browser-local files and reopen with their content intact.

Project ZIP packing gathers the Project folder and linked local resources, deduplicates repeated sources and resolves name collisions. Web links stay links. Import reviews the Project without modifying originals. Browser-local files and simulated paths are not native filesystem access.

## Overview and Settings

**Super / F2** opens Overview and search. Its system sections are Windows, Apps, Projects & Files, Timeline and System. App-contributed tabs such as Steam are separated from system sections. **Meta+Tab / F2+Tab** opens the desktop map. Overview is the first widget at the top of the left panel, above Quick launch.

System groups current desktop requests, Project plans, Workspace content and shared controls. Notification history and other Workspace unread badges retain their scopes. Previews require an explicit action and do not switch Workspace automatically. Do Not Disturb quiets delivery while retaining notifications.

Settings is a regular app, available through Overview/search and the labeled Settings action in System controls. Explicit custom Settings favorites remain supported. **Panels & widgets** describes the current arrangement controls. Preferences retain their System, Workspace or Project scope.

## Assistant and displays

Assistant retains conversations, selected inputs and working files in their Workspace or Project. Ask Assistant attaches selected text or files. Reviewed transformations create real browser-local files in the context's Assistant folder.

Replies follow fixed local rules rather than an AI model. Attach text and try `Summarize this note.`, `Make a checklist from this note.` or `Draft a note from this text.` Attach two sources for `Compare these two sources.` Wording can vary; keywords select a response template. Summaries quote attached excerpts, while checklists and drafts use templates. Image-description and audio-transcription requests only show an explanation of those unconnected workflows.

For a saved text file, try `Convert selected files to HTML in Converted`; for an image with its original bytes, try `Convert selected files to WebP in Converted`. Review the input and Save in destination, then choose **Convert** to create copies. The separate guided display examples use bundled sample inputs for a launch checklist, a WebP conversion or a comparison of two text versions.

Extended workspace follows desktop and Project navigation. Side space retains its Workspace-owned windows while the main display changes desktop or Project. Both use normal panels and widgets.

**Allow Assistant to use this display** belongs to the specific display and Workspace. Chat and manual tools remain usable while permission is off. Take over pauses a running example; Continue resumes it. Turning permission off pauses work without clearing files, windows or drafts. Stop abandons remaining steps and keeps completed work. A context or display change interrupts unfinished scripted work and requires a fresh run.

## Desktop Guide

Open Desktop Guide through search or the README's direct link. It teaches controls, Apps, tiling, floating, Overview, maximize/fullscreen, parking, desktops, Files/Stash, Assistant, Projects, Workspaces, panel arrangement and displays. Practice uses isolated state; finishing offers a clean desktop or demo content. Skipping and reopening preserve progress.

Guide targets real widgets, context menus, the edit toolbar and app controls. Temporary gates do not rewrite saved layouts. Arrangement instructions begin with a right-click on a panel.

## Materials and implementation

App windows use opaque ABS with rounded edges. Panels, Overview, controls and menus use square glass with visible edges. Persistent toggle state stays visible. Content and keyboard focus must remain readable in both themes.

The buildless website lives in `dist/`. Development-only DOM tests use the pinned jsdom dependency. GitHub Pages runs syntax and regression checks before deployment. Asset URLs use content hashes. Earlier captures are historical; Xef's unfinished authored philosophy is preserved.
