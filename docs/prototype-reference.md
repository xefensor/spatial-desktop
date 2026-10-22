# Prototype reference

This reference describes the panel and widget desktop. See [Panels and widgets](panels-and-widgets.md) for the current layout, compact behavior, controls and ownership. The [earlier reference](history/prototype-reference-areas-2026-10-18.md) preserves historical Area behavior and captures.

## Desktop and windows

Windows tile automatically and show their hotbar numbers. Multiple instances keep independent content and numbers. Parked windows retain their instance; Background services stay available across Workspaces. Float gives manual placement. Maximize retains panels; Fullscreen temporarily hides or transfers them. App dialogs remain attached to their owner. Hide preview protects content in parked previews and the desktop map.

Desktop pages stack vertically. Projects have their own column of desktops; Workspaces separate wider contexts. Parked windows belong to the whole current column. Desktop indicators and the desktop map show location and open windows without including parked or closed windows.

## Demo starting scenes

Fresh demo sessions give each desktop a purpose. School first selects Urban Ecology, and Work first selects Website Launch; their ordinary Workspace tabs keep everyday planning separate.

| Context | Desktop 1 | Desktop 2 |
| --- | --- | --- |
| General Workspace | Your day in Firefox + Personal notes | Documents in File Browser |
| School Workspace | Student portal + Class planning | Available for more work |
| Urban Ecology Project | Field guide + Observations | Survey evidence in File Browser |
| Work Workspace | Studio desk + Studio planning | Available for more work |
| Website Launch Project | Preview + Launch checklist | Dev server + Source files |
| Short Film Project | Footage + Edit notes | Cut feedback, with Soundtrack parked |
| Gaming Workspace | Fallout 4, with Steam and Game-night mix parked | Game library + Co-op planning |

The game starts alone on its ordinary desktop; **F2+F** demonstrates fullscreen. Settings stays available through System controls and Overview instead of occupying a starting tile. Default Quick launch lists use runnable demo apps; saved custom favorites remain unchanged.

New seeds and explicit **Explore demo** resets use these scenes. Existing saved sessions retain their windows, desktop placement, favorites and panel layouts. **Reset layout** changes only the current Workspace’s panel arrangement; it does not reload the demo app scenes. Desktop Guide practice and a clean desktop remain separate from the populated demo.

## Panels and widgets

Right-click a panel → **Edit layout** to move widgets, add Spacers or arrange whole panels. Compact and expanded presentations retain the same grouping and actions. Icons open temporary live content; **Keep expanded** pins it. Panel borders resize panels. Apps keeps Quick launch and Background visible, while only Parked scrolls.

The populated demo starts with a 200-pixel expanded left panel for Overview, Apps, Clock and system icons, and a 248-pixel expanded right panel for Files with compact Assistant. An untouched demo arrangement temporarily compacts the right panel below 1360 pixels and both panels below 1180, restoring them when space returns without saving different modes. Deliberate layout edits opt out. Existing saved layouts are retained. Clean desktops and new custom Workspaces use a 224-pixel expanded left panel and compact right panel.

Panels and widgets have no headers or panel footers. Widget movement is available in edit mode. The former Areas layout, shared-column controls and independent rail engines are retired. Historical lesson identifiers remain only for saved progress compatibility.

## Ownership and files

Workspaces separate Home folders, app sessions, browser history, multimedia, clipboard history, notifications and panel layouts. Projects own a folder, resources, windows and desktop column. Downloads follow the Workspace unless a Project opts into its own Downloads folder.

Files exposes folders and Project management. Create, import, rename, copy, move, trash and recover ordinary files. Saved materials and source references stay in the active context’s folders. Notes can bind to browser-local files and reopen with their content intact.

Project ZIP packing gathers the Project folder and linked local resources, deduplicates repeated sources and resolves name collisions. Web links stay links. Import reviews the Project without modifying originals. Browser-local files and simulated paths are not native filesystem access.

## Overview and Settings

**Super / F2** opens Overview and search. Its system sections are Windows, Apps, Projects & Files, Timeline and System. App-contributed tabs such as Steam are separated from system sections. **Meta+Tab / F2+Tab** opens the desktop map. Overview is the first widget at the top of the left panel, above Quick launch. Its expanded button shows the icon and current Workspace name. Compact panels retain an icon with the Workspace identified in its tooltip and accessible label; opening a Project does not replace that Workspace name.

System groups current desktop requests, Project plans, Workspace content and shared controls. Notification history and other Workspace unread badges retain their scopes. Previews require an explicit action and do not switch Workspace automatically. Do Not Disturb quiets delivery while retaining notifications.

Settings is a regular app, available through Overview/search and the labeled Settings action in System controls. Explicit custom Settings favorites remain supported. **Panels & widgets** describes the current arrangement controls. Preferences retain their System, Workspace or Project scope.

## Timeline

Timeline aligns recorded desktop activity with calendar events, tasks and reminders on one shared time map. Sessions group nearby events within the same Workspace and Project; explicit context changes, day boundaries and longer pauses start new sessions. Example activity remains labelled and separate from real activity.

A closed session card previews its saved note, several materials and recorded outputs. Opening it shows materials first: repeated visits to the same page and repeated actions on a file collapse into one row with its latest recorded activity. Canonical file identity takes precedence; a path joins a known item only when that path has one unambiguous owner in the session. Different folders, distinct window instances and Workspace boundaries stay separate. Output folders are labelled as folders. Source relationships appear only when recorded and accessible in the current Workspace.

Materials reopen through their file, page, window or retained item history. Notes save locally with the session’s original events. **Show chronology** reveals the exact event list separately. Both material and event lists scroll within the expanded card, and expanding a card keeps calendar timestamps aligned. **Sessions / Events** switches between grouped and individual activity.

Creating a local file and opening an available saved file records its canonical identity and known version. Bound Note Editor saves join the same file’s history and Timeline after the existing edit coalescing; repeated keystrokes do not create separate activity records. Failed and unchanged saves do not claim a new saved version.

Search checks recorded event metadata, saved session notes and available file text in the current Workspace. Results identify the matching material, show an excerpt explaining the match and name the session and date. **Show session** returns to the surrounding work, including its other materials, outputs and full chronology. Search and type filters preserve the session’s identity and original events. Matching sessions on other recorded days remain reachable through the results and day navigation.

Text matches distinguish a recorded saved version from a file’s current text. A saved-version result opens that exact available version; current-text results open the current file. File identity follows renames, while ambiguous or reused paths do not borrow another file’s content. Text is read from accessible local files or retained item history. For imported readable text files, search examines the first 1 MiB of saved bytes. Images, audio and PDF bytes are not transcribed or OCRed, and a source link alone does not supply the page’s body. Missing file bytes leave recorded metadata available.

Timeline reopens related materials; it does not restore a historical computer state or infer topics automatically. Search does not fetch web pages or index files outside the browser demo.

## Assistant and displays

Assistant follows the exact Workspace and Project you are viewing. Each context remembers its active chat, draft and manual attachments. First entry starts a conversation, or restores an existing matching chat; returning selects the last chat used there. New chat and the Chat selector operate within that context. Focusing another app or switching virtual desktops keeps the conversation. The visible context identifies where the chat and its Assistant folder belong. Attaching a source from another context does not change that destination.

Two compact switches sit beside chat; their explanations are available on demand. **Context** includes readable local demo content from open apps and documents in the current Workspace or Project when you send. Its automatic-context summary is separate from manual attachments; each request captures the content it used. **Ask Assistant**, **F2+A** and dragging still attach a specific selection, file or reference, whether automatic context is on or off. **Display control** grants scripted control of the current display for that Workspace and Project. It works on Main workspace, Extended workspace and Side space, including a single Main display; Settings → Displays can also grant control for a selected connected display. Both switches start off in a new context and remember their settings independently of the selected chat. Neither connects an AI service or grants native filesystem or OS access.

Reviewed transformations create real browser-local files at the reviewed destination; the context's Assistant folder is the default working location. Each request retains its original sources, context and output destination; later navigation or source edits do not rewrite an earlier reply's inputs.

Replies follow fixed local rules rather than an AI model. Provide readable text through automatic context or an attachment and try `Summarize this note.`, `Make a checklist from this note.` or `Draft a note from this text.` Provide two readable sources for `Compare these two sources.` **Examples** below the message field lists supported requests. **Desktop tasks** in that drawer opens the guided file workflows. Wording can vary; keywords select a response template. Summaries quote captured excerpts, while checklists and drafts use templates. Image-description and audio-transcription requests only show an explanation of those unconnected workflows.

For a saved text file, try `Convert selected files to HTML in Converted`; for an image with its original bytes, try `Convert selected files to WebP in Converted`. Review the input and Save in destination, then choose **Convert** to create copies. Choose **Examples → Desktop tasks → Run example** for a guided launch checklist, WebP conversion or comparison of two text versions using bundled sample inputs. **Sample conversation** in Examples keeps the illustrative exchange out of the live chat.

Extended workspace follows desktop and Project navigation. Side space retains its Workspace-owned windows while the main display changes desktop or Project. Both use normal panels and widgets.

**Display control** belongs to the chosen display, display setup and exact Workspace/Project context; a grant in the ordinary Workspace does not grant control in its Projects. Chat and manual tools remain usable while permission is off. This permission is separate from **Context**: display examples can use manually supplied sources with automatic context off. **Take over** pauses a running example; **Continue** resumes a paused example when its original permission is available. Turning permission off pauses work without clearing files, windows or drafts. **Stop** abandons remaining steps and keeps completed work. Changing context interrupts unfinished scripted work safely. On Main or Extended workspace, changing desktops also interrupts display steps; Side space keeps its windows in place across desktop navigation. The captured inputs, original scope and completed steps remain in the original chat; the task never gains access to a new context or desktop.

### Voice

Use the microphone button beside the composer to start or stop input. **Voice options → Activation** selects how speech becomes a message:

| Mode | Input behavior |
| --- | --- |
| **Manual** | Dictation adds its transcript to the current draft. Review or edit it, then choose Send. |
| **Wake phrase** | Waits for “Hey Assistant”, then captures and sends the request after you finish speaking. The phrase itself is omitted from the message. |
| **Continuous** | Sends completed utterances after a pause, without requiring the activation phrase. |

Wake phrase and Continuous require an empty draft before starting. Editing the composer stops input and preserves the text. **Read replies aloud** independently reads new Assistant replies; opening a chat does not read its history. **Stop speaking** cancels playback. Recognition pauses during read-aloud to avoid an audio feedback loop, then resumes only within the same active voice session and captured context.

Activation mode and read-aloud preference are remembered per Workspace. Microphone activation is session-only and always begins with an explicit action; reloading never starts listening. The visible microphone state identifies whether input is waiting, listening or paused. Switching Workspace, Project or chat, changing the display setup or role, hiding the tab or leaving the page stops listening and discards unsent recognition. Saved drafts, attachments and previous replies remain intact. Voice input obeys the existing context and display-control permissions.

Voice input uses the browser’s speech-recognition support and is unavailable when that support is missing. Wake phrase requires on-device recognition and an available language pack; it never silently falls back to online recognition. With Wake phrase selected, supported browsers offer **Install English pack** in Voice options. This downloads the local pack only when you choose it. After installation, use the microphone button to start listening. Manual and Continuous recognition may send audio to the browser’s recognition service. Read-aloud uses browser speech synthesis. These speech features do not connect an AI model: Assistant replies and display workflows still use the same local scripted rules. Dictating a live message is separate from transcribing an attached audio file, which remains an unconnected workflow.

## Desktop Guide

Open Desktop Guide through search or the README's direct link. It teaches controls, Apps, tiling, floating, Overview, maximize/fullscreen, parking, desktops, Files, Assistant, Projects, Workspaces, panel arrangement and displays. Practice uses isolated state; finishing offers a clean desktop or demo content. Skipping and reopening preserve progress.

Guide targets real widgets, context menus, the edit toolbar and app controls. Temporary gates do not rewrite saved layouts. Arrangement instructions begin with a right-click on a panel.

## Materials and implementation

App windows use opaque ABS with rounded edges. Panels, Overview, controls and menus use square glass with visible edges. Persistent toggle state stays visible. Content and keyboard focus must remain readable in both themes.

The buildless website lives in `dist/`. Development-only DOM tests use the pinned jsdom dependency. GitHub Pages runs syntax and regression checks before deployment. Asset URLs use content hashes. Earlier captures are historical; Xef's unfinished authored philosophy is preserved.
