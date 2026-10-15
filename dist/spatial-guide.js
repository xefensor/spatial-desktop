/* The Guide teaches the production desktop in an isolated practice session. */
(function (root) {
  'use strict';
  const key = 'spatial-guide-v1', prefix = 'spatial-guide-practice:';
  const chapters = [{"id": "system", "title": "System"}, {"id": "apps", "title": "Apps & Overview"}, {"id": "windows", "title": "Windows"}, {"id": "parking", "title": "Parking"}, {"id": "desktops", "title": "Desktops"}, {"id": "stash", "title": "Stash"}, {"id": "ai", "title": "Assistant"}, {"id": "projects", "title": "Projects"}, {"id": "workspaces", "title": "Workspaces"}, {"id": "recall", "title": "Overview & Timeline"}, {"id": "areas", "title": "Arrange your Areas"}, {"id": "challenge", "title": "Try it on your own"}, {"id": "fullscreen-apps", "title": "Borderless fullscreen"}, {"id": "displays", "title": "Two displays"}];
  const lessons = [
    {"id": "welcome", "title": "Make this desktop yours", "text": "Try short steps with your own apps and ideas. Each part appears when you need it.", "task": "Ready to explore?", "level": 0},
    {"id": "system", "title": "Settle in", "text": "System keeps everyday controls within reach. A lit line inside a toggle means it is on.", "task": "Could you switch any quick setting off, then on again?", "level": 1, "goals": ["toggle-off", "toggle-on"], "target": "[data-area-window=\"systems\"]", "details": "This glass Area holds your clock, notifications, device controls and quick settings. A toggle has a light inside its bottom edge: lit means on.", "chapter": "system"},
    {"id": "apps", "title": "Find your first tool", "text": "Apps is your hotbar for visible windows. Its numbers follow their order on the desktop.", "task": "Find any app you would like to try in Overview and open it.", "level": 3, "goals": ["app-open"], "target": "#allAppsToggle", "details": "The Apps Area keeps your visible windows within reach. Its numbered icons follow the windows on your desktop. Later, this Area will also hold parked apps. Each window gets its own number, including separate windows of the same app. Numbers follow left-to-right, then top-to-bottom order. Super + 1–9 or 0 selects the first ten; add Shift for the next ten.", "chapter": "apps"},
    {"id": "overview", "title": "Find a companion", "text": "Overview searches your apps. Your current workspace, project and desktop appear in its header.", "task": "Find another useful tool by searching for it.", "level": 3, "goals": ["app-search", "search-launch"], "target": "#allAppsToggle", "details": "Overview is now available through the workspace icon in the Apps header, Super, or Ctrl + Space. The compact header names your current workspace, project and desktop. Type in the search field to find an app. For now only applications are available; other sections appear as you learn about them.", "chapter": "apps"},
    {"id": "app-instances", "title": "Use the same tool twice", "text": "Separate windows of the same app have their own contents and hotbar numbers. Opening another copy keeps your existing work.", "task": "Open a second window of an app you are already using.", "level": 3, "goals": ["instance-created"], "target": "#appRack [data-open-app]", "details": "Shift + click an app icon in Apps or Overview to create an independent window. Each window has its own documents, browser tabs or playback, and a separate hotbar slot. Steam and Fallout 4 have a single window in this demo.", "chapter": "apps"},
    {"id": "tiling", "title": "Work side by side", "text": "Windows share the available space automatically. Left-drag a title bar to rearrange them.", "task": "Keep two windows side by side.", "level": 3, "goals": ["two-tiled"], "target": "#allAppsToggle", "details": "New windows automatically tile into the available desktop space. Left-drag a title bar to change their arrangement; you do not need to place every window by hand. Windows open left to right, then top to bottom. Three prefer two above and one below; four prefer a 2×2 grid when their minimum sizes fit. Floating windows reserve space for tiles.", "chapter": "windows", "usage": {"title": "Write with a reference", "text": "Keep a browser beside your notes so you can read and write together."}},
    {"id": "float", "title": "Put a window where you need it", "text": "Float a window when its position matters more than sharing the desktop evenly.", "task": "Could you make either window float?", "level": 3, "goals": ["app-float"], "target": "[data-app-frame] .app-titlebar", "details": "Hold the middle mouse button on a window title bar and drag. The window can float freely and borrow space from Areas. Alt + left-drag does the same thing. You can also choose Float window from the title bar’s right-click menu.", "chapter": "windows"},
    {"id": "fullscreen", "title": "Focus without losing your tools", "text": "Maximize fills the space between Areas, keeping them accessible.", "task": "Give one app more room, then restore it.", "level": 3, "goals": ["bounded-enter", "bounded-exit"], "target": "[data-app-frame] [data-window-action=\"maximize\"]", "details": "Left-click Maximize to fill the desktop space between Areas. Your Areas stay accessible. With two displays, other open apps move to the second display when they fit; otherwise they park. Restore the window to bring automatically moved apps back.", "chapter": "windows"},
    {"id": "true-fullscreen", "title": "Use the whole display", "text": "Fullscreen fills the display. Escape brings your desktop back.", "task": "Try the whole-display view, then come back.", "level": 3, "goals": ["full-enter", "full-exit"], "target": "[data-app-frame] [data-window-action=\"maximize\"]", "details": "Middle-click the same maximize button. The app uses the whole display and Areas yield. With two displays, other apps move there when they fit. Apps and Areas return when you restore; deliberate moves, closing and parking are respected. This is different from filling the space between Areas. Escape restores the desktop. Only borderless fullscreen apps, with no window frame or title-bar controls, get an attached temporary desktop. The Fallout 4 Gaming example uses this mode; ordinary fullscreen windows stay on their original desktop. The Borderless fullscreen chapter teaches entering it, leaving the game running and restoring a normal window.", "chapter": "windows"},
    {"id": "park", "title": "Make room without closing", "text": "Parked apps keep running as useful cards in Apps. This replaces minimization.", "task": "Could you park either window to make some room?", "level": 4, "goals": ["app-park"], "target": "[data-app-frame] [data-window-action=\"minimize\"]", "details": "Park puts an app into the Apps Area while it keeps running. Apps with a parking widget offer their own notes or controls. Third-party apps without that integration use a read-only window preview instead: Firefox and Steam demonstrate this. Click the preview or Unpark to restore the full window, or drag the card header onto the desktop to place it. App dialogs park below their app as a connected group. Try Firefox menu → Save page as… (or Ctrl+S), then park Firefox: the attached dialog says Needs input. Restoring either card brings back both and focuses the dialog. Open apps are at the top, parked cards in the middle and background-only icons at the bottom. Left-click Close closes the window but keeps needed playback, downloads or game services running. Middle-click Close force quits that app instance and stops its activity; Force quit is also in the context menu. Click a bottom icon to reopen its window. Try Music Player while playing, or Steam’s local demo update. For private content, right-click the window, hotbar icon or parked card and choose Hide preview. Its card keeps only the app identity and restore controls; attached dialogs keep Needs input without their contents. Overview hides the document title too. The choice is saved for that window. Show preview brings the preview or widget back.", "chapter": "parking", "usage": {"title": "Music while you work", "text": "Park Music Player and use its card for playback while another app gets more room."}},
    {"id": "unpark", "title": "Bring your work back", "text": "A parked card keeps the app available. Restore its window when you need the full interface.", "task": "Bring that parked app back.", "level": 4, "goals": ["app-unpark"], "target": "#miniStack", "details": "In an expanded Area, supported apps have interactive widgets; Firefox and Steam have window previews. A preview shows the app but cannot be used directly. Click it or Unpark to interact with the real window. On a rail, parked icons start around the lower middle and continue down; right-click offers the supported window or app actions. Unpark brings the full window onto your current desktop.", "chapter": "parking"},
    {"id": "desktops", "title": "Find more room", "text": "Scroll over an Area to switch desktops. Areas stay in place.", "task": "Visit another desktop, then return to your work.", "level": 5, "goals": ["desktop-next", "desktop-return"], "target": ".desktop-page-rail", "details": "Each workspace has multiple desktops. Scroll over an Area header or rail to switch desktops without clicking first. Area lists keep scrolling within themselves, including at their edges. You can also click empty desktop space to unfocus a window, then scroll there. Areas stay in place. Win + scroll works from a focused window. Hold a title bar with the left mouse button and scroll to carry that window to another desktop; hold Shift to carry it between Project columns. Release to place it, or press Escape to cancel.", "chapter": "desktops"},
    {"id": "empty-desktop", "title": "Start directly on an empty desktop", "text": "An empty desktop offers app icons for a quick start. Your current workspace, project and desktop appear above them.", "task": "Find an empty desktop, then open an app from its quick-launch icons.", "level": 5, "goals": ["empty-visited", "empty-launched"], "target": "#emptyDesktopApps", "details": "Scroll to an empty desktop. Open an app from the large icons to start here. If a regular app already runs elsewhere, a new independent window opens on this desktop and display. A parked app in the same context restores here. Single-window apps offer Return to app. All applications opens the Apps section of Overview.", "chapter": "desktops"},
    {"id": "project-stash", "title": "Keep an idea for later", "text": "Stash holds notes, links and files in your workspace. You can use it without a project.", "task": "What is something you do not want to forget? Keep it in Stash.", "level": 6, "goals": ["stash-saved", "stash-inspected"], "target": "#workingMemory", "details": "Stash keeps notes, links, images, audio and files in a folder inside your workspace Home. Drop content with its source, or use Add note or source; no title is required. Expand an item to inspect its origin or edit it. Changes save automatically, and Timeline keeps a return link. When you open a project later, the same Area shows that project’s separate Stash folder.", "chapter": "stash", "usage": {"title": "Keep a loose thought", "text": "Save a note, link or file you may want later. Choose your own subject; a project is not required."}},
    {"id": "ai-context", "title": "Use what you kept", "text": "Drag sources into Assistant and write your own request. Origin tags show where they came from. Replies here are scripted demo examples.", "task": "Give Assistant something from Stash and ask it something useful.", "level": 6, "goals": ["ai-source", "ai-request", "ai-kept"], "target": "[data-area-window=\"ai\"]", "details": "Assistant has its own Area and works with or without a project. New chat starts a separate conversation; use Chat to return to earlier ones and Rename to name them. Each chat keeps its own sources, draft and working folder. Drag an app’s title-bar icon, a file, selected text or a Stash item into it. Expand Sources to inspect or remove an attachment. Origin tags show its workspace, project and app. A project source selects that project folder as the working folder; you can change it explicitly. Write your own request. This prototype uses clearly labeled, scripted replies to illustrate summaries, comparisons and draft plans. No AI service is connected; everything stays local. You can drag a reply into Stash.", "chapter": "ai", "usage": {"title": "Turn a thought into a checklist", "text": "Attach the item you kept and ask for a checklist. Review the scripted reply before keeping it."}},
    {"id": "projects", "title": "Give an idea a place of its own", "text": "A project owns its folder and a vertical set of desktops. Its windows save automatically.", "task": "Create a project with any name you like.", "level": 6, "goals": ["project-created"], "target": "[data-create-area-project]", "details": "A project has its own vertical set of desktops, containing only its windows. The Workspace & Projects Area keeps its folder and Stash together. The header names every open project; Workspace means your ordinary desktops. Projects save their windows automatically and reopen where you left off. Start with an empty project so you can see exactly what belongs to it.", "chapter": "projects", "usage": {"title": "A place for a personal idea", "text": "Give any idea its own project, with its files and windows together."}},
    {"id": "project-app", "title": "See the context change", "text": "Apps opened here belong to this project. Stash now shows project items; a project source gives Assistant its working folder.", "task": "Open a tool in your project, then bring its context into Assistant.", "level": 6, "goals": ["project-app-open", "ai-project-source"], "target": "#allAppsToggle", "details": "Your new project starts empty. An app opened here gets its own window in this project. Opening an app here will not move or replace its window on your ordinary desktop.", "chapter": "projects"},
    {"id": "project-navigation", "title": "Step away and come back", "text": "Choose a name in the top strip to switch projects. Shift + scroll switches horizontally; desktop scrolling stays vertical.", "task": "Visit Workspace, then return to your project.", "level": 6, "goals": ["project-workspace", "project-return"], "target": ".desktop-context-header", "details": "The strip at the top lists Workspace and every open project. Click a name to switch, or unfocus a window and use Shift + scroll. Win + Shift + scroll also works with a focused window. Project switches move the whole scene, including Areas; desktop scrolling moves only the desktop. When holding a title bar, Shift + scroll carries that window into another column. The other windows keep their ownership.", "chapter": "projects"},
    {"id": "workspaces", "title": "Separate another part of your life", "text": "Workspaces keep their own windows, app sessions, media, Areas and Stash.", "task": "Could you create a workspace for another part of your life?", "level": 7, "goals": ["workspace-created"], "target": "#newWorkspaceButton", "details": "Workspaces keep their own windows, Areas, app sessions and media. Create one for a part of your life: study, work, music, or anything you choose. It starts empty while your General windows stay in General.", "chapter": "workspaces", "usage": {"title": "Different parts of your life", "text": "Use one workspace for personal activity and another for work or study. Each can hold several projects."}},
    {"id": "folders", "title": "Find its own Home", "text": "Each workspace has its own standard Home folders. Downloads go there; projects do not replace Home.", "task": "Open any Home folder in your new workspace.", "level": 8, "goals": ["workspace-folder"], "target": ".workspace-home-card", "details": "Your new workspace has its own Desktop, Documents, Downloads, Pictures, Videos, Music, Templates and Public folders. Downloads go to this workspace. Projects do not replace Home; they can optionally route their own downloads into a project Downloads folder.", "chapter": "workspaces"},
    {"id": "return", "title": "Pick up your earlier work", "text": "Switching workspaces keeps your windows and their arrangement.", "task": "Return to General and find your earlier work.", "level": 8, "goals": ["general-return"], "target": ".workspace-tabs", "details": "Changing workspaces does not close your work. Return to General and your apps and window arrangement will still be there.", "chapter": "workspaces"},
    {"id": "overview-navigation", "title": "Find work you already opened", "text": "Overview locates running and parked windows as well as launching apps. Its sections scroll horizontally.", "task": "Find an existing window instead of launching another copy.", "level": 9, "goals": ["overview-away", "overview-back", "overview-filtered", "overview-window-returned"], "target": ".overview-section-nav", "details": "The header names your workspace, project and desktop. Sections snap to the centre with neighbours visible at the edges. Use tabs, edge arrows, Left/Right when a section control is focused, or scroll over non-scrollable content. Lists retain their scrolling at both edges; Shift + scroll switches sections unless a horizontal list owns the motion. Apps keeps desktops and running windows together beside the app library. Windows are ordered by desktop and hotbar position, and show their current content and shortcut number. All windows, This desktop, Open and Parked filter the current project or ordinary workspace desktops. Parked windows travel with you. If a filter is empty, choose All windows. Click a desktop to visit it, or a window to focus or unpark it. Temporary desktops have a scene thumbnail and an Attached to Desktop label. Their card explains the lifetime and offers Back to Desktop and Restore window. In Gaming, Steam contributes a separate tab after the system sections, with local chats, guides and notes.", "chapter": "recall"},
    {"id": "timeline", "title": "What happened during the review?", "text": "Timeline aligns your activity with events, tasks and reminders. We will add a labeled practice meeting beside your next action.", "task": "Open any app, then compare its activity with the practice meeting.", "level": 9, "goals": ["timeline-activity", "timeline-compared", "timeline-latest"], "target": "#allAppsToggle", "details": "Timeline puts time on the left, desktop activity beside it, and calendar events, tasks and reminders in another lane. Events span their full start-to-end time, so you can see what you were doing during a meeting. Busy moments expand in both lanes together. Overlapping events appear side by side, and meeting names stay visible while you scroll. Timeline opens near recent activity. Now returns to today at the current time; Latest activity jumps to the newest action on the selected day. The arrows beside the day visit days with items. Show and the timeline search narrow the view. Open and Go to return to earlier work. Activity stays in its workspace and excludes typing and clipboard contents. Calendar entries are local prototype data, not a connected calendar account.", "chapter": "recall", "usage": {"title": "Find the work from a meeting", "text": "Look along the meeting duration for a relevant app or file, then use Open or Go to return to it."}},
    {"id": "timeline-task", "title": "Leave yourself a reminder", "text": "Scheduled plans appear before you use them. Completing a task keeps its deadline and records when you finished.", "task": "Add a small task of your own, then mark it done.", "level": 9, "goals": ["timeline-task-created", "timeline-task-done"], "target": "#timelineAddToggle", "details": "Tasks, reminders and calendar events appear at their scheduled times even if you have never opened them. Add creates one for the current workspace, optionally linked to a project. A task’s Done checkbox saves completion and places it at the completion time while retaining its original deadline. Reminders can be dismissed. System’s calendar shows the next plan and opens Timeline. Now brings you back to today and its current-time line; changing the day does not remove your plans.", "chapter": "recall"},
    {"id": "resize-areas", "title": "Make room where it helps", "text": "Areas resize from their inner border. Windows use the space that remains.", "task": "Could you give System a little more or less room?", "level": 9, "goals": ["area-resized"], "target": "[data-area-resize=\"systems\"]", "details": "Glass Areas have a resize handle on their inner border. Drag it a little toward the desktop to widen the Area, or toward the screen edge to narrow it. This is your choice; the desktop uses the remaining space. Press Escape while dragging to cancel, or use Undo just after a change.", "chapter": "areas"},
    {"id": "area-rail", "title": "Keep controls within reach", "text": "A rail keeps open apps at the top and parked apps lower down. Right-click a parked icon for its controls.", "task": "Reduce Apps to a rail, then widen it again.", "level": 9, "goals": ["apps-rail", "apps-expanded"], "target": "[data-area-resize=\"apps\"]", "details": "Narrow the Apps Area to a rail by dragging its inner border toward the screen edge. Open apps stay at the top. Parked icons start around the lower middle of the rail and continue down, so they stay near your view. Right-click a parked icon for app actions. Widen the Area again to see its live cards. You can also right-click its header and choose Expanded or On rail; Expanded remembers the previous size.", "chapter": "areas"},
    {"id": "move-areas", "title": "Choose your layout", "text": "Drag an Area header to dock it on another screen edge. The glass preview shows where it will land.", "task": "Put System on whichever edge feels comfortable.", "level": 9, "goals": ["area-moved"], "target": "[data-area-window=\"systems\"] [data-area-drag-handle]", "details": "Areas can dock on the left, right, top or bottom of the screen. Drag an Area’s header toward the edge you want; the glass preview shows where it will land. Release to dock it there. This works for the Apps and Workspace & Projects Areas too once they are introduced. Windows use the space that remains. Completed window moves and Area changes offer Undo; it restores placement while keeping document contents.", "chapter": "areas"},
    {"id": "hide-areas", "title": "Clear space and recover it", "text": "Hide an Area when you do not need it. Overview → System brings it back; your apps keep running.", "task": "Hide any Area, then bring the same one back.", "level": 9, "goals": ["area-hidden", "area-shown"], "target": "[data-area-drag-handle]", "details": "Every Area can be hidden. Right-click its header and choose Hidden. Your apps and project keep running. Open Overview with Super, go to System, and use Show under Desktop Areas to restore it. A rail remains visible; hiding removes the whole Area. Hiding an Area keeps its content. Undo is available after completed placement changes.", "chapter": "areas"},
    {"id": "challenge", "title": "Leave your project ready for tomorrow", "text": "This step has no target highlights. Use the controls or shortcuts that feel natural.", "task": "Open another tool in your project, park it, then return to Workspace.", "level": 9, "goals": ["challenge-open", "challenge-park", "challenge-return"], "challenge": true, "details": "Put what you have learned together. There are no target highlights for this independent task. Use whichever controls or shortcuts feel natural.", "chapter": "challenge"},
    {"id": "temporary-desktop", "title": "Step away from borderless fullscreen", "text": "Borderless fullscreen apps have no window frame or title-bar controls. They get a temporary desktop attached to their original desktop, so other apps stay accessible.", "task": "Visit Fallout 4, return to Desktop 1, then restore its normal window.", "level": 9, "goals": ["temporary-enter", "temporary-back", "temporary-restore"], "target": "#fullscreenDesktopPeek", "details": "This isolated Gaming practice begins on Desktop 1, with Fallout 4 in borderless fullscreen on its attached temporary desktop. It has no window frame or Park, Maximize and Close buttons. Ordinary fullscreen windows such as this demo's Firefox keep their controls and stay on their existing desktop. The bottom scene preview and the original Apps icon return to the game. Overview shows Temporary desktop, its parent and why it exists. Back to Desktop keeps the game fullscreen; Restore window brings back its normal window and removes the temporary desktop. Closing, parking or leaving borderless fullscreen also removes it. On two displays only the owning monitor enters the child; the other holds the parent until you scroll past the bond. Steam adds the same actions in its Overview tab outside Guide practice. Your real desktops remain separate from this practice.", "chapter": "fullscreen-apps"},
    {"id": "two-displays", "title": "Spread your work across two displays", "text": "Optional: two browser windows simulate an extended desktop. Windows keep their project ownership when moved.", "task": "Try arranging your work across the two practice displays.", "level": 9, "optional": true, "goals": ["display-linked", "display-app-moved", "display-app-returned", "display-area-moved", "display-max-enter", "display-max-exit", "display-full-enter", "display-full-exit"], "target": "[data-guide-action=\"open-display\"]", "details": "Optional: extend the same workspace across two browser windows. Move the second window to another monitor if you have one, or place both side by side. An app keeps its project or Workspace ownership when it moves. Right-click a window’s title bar or an Area’s header and choose Move to Display 2; the same menu brings it back. Maximize keeps Areas accessible; Fullscreen uses the whole display. Both move other open apps to Display 2 when they fit without displacing its existing apps. Fullscreen also moves Areas there when there is room. Restore to bring automatically moved apps back; apps you deliberately move, park or close stay as you chose.", "chapter": "displays"},
    {"id": "complete", "title": "The desktop is yours", "text": "You have explored the whole desktop. Your own project, workspace and practice items connected the steps.", "task": "Find this Guide again in Overview → Apps → Help.", "level": 9}
  ];
  // Stable lesson IDs let existing learners resume after reordering.
  const version7Ids = ["welcome", "system", "resize-areas", "move-areas", "apps", "tiling", "float", "overview", "fullscreen", "true-fullscreen", "park", "area-rail", "unpark", "desktops", "projects", "project-app", "project-stash", "project-navigation", "workspaces", "folders", "return", "ai-context", "hide-areas", "overview-navigation", "timeline", "timeline-task", "challenge", "two-displays", "complete"];
  const version8Ids = ["welcome", "system", "apps", "overview", "tiling", "float", "fullscreen", "true-fullscreen", "park", "unpark", "desktops", "project-stash", "ai-context", "projects", "project-app", "project-navigation", "workspaces", "folders", "return", "overview-navigation", "timeline", "timeline-task", "resize-areas", "area-rail", "move-areas", "hide-areas", "challenge", "two-displays", "complete"];
  function create(saved = {}) {
    let state = {status:'idle', index:0, mode:'repeat', initialized:false, done:[], skipped:[], ...saved};
    const oldIds = ['welcome','system','apps','tiling','float','overview','fullscreen','true-fullscreen','park','unpark','desktops','workspaces','folders','return','complete'];
    const version2Ids = ['welcome','system','apps','tiling','float','overview','fullscreen','true-fullscreen','park','unpark','resize-areas','desktops','projects','project-navigation','workspaces','folders','return','complete'];
    const version6Ids = ['welcome', 'system', 'resize-areas', 'move-areas', 'apps', 'tiling', 'float', 'overview', 'fullscreen', 'true-fullscreen', 'park', 'area-rail', 'unpark', 'desktops', 'projects', 'project-app', 'project-navigation', 'workspaces', 'folders', 'return', 'challenge', 'two-displays', 'complete'];
    const version4Ids = version6Ids.filter(id => !['move-areas','two-displays'].includes(id));
    const version5Ids = version6Ids.filter(id => id !== 'two-displays');
    const legacyIds = saved.version === 8 ? version8Ids : saved.version === 7 ? version7Ids : saved.version === 6 ? version6Ids : saved.version === 5 ? version5Ids : [3,4].includes(saved.version) ? version4Ids : saved.version === 2 ? version2Ids : oldIds;
    if (saved.lessonId) state.index = lessons.findIndex(lesson => lesson.id === saved.lessonId);
    else if (saved.status && saved.version !== 9 && Number.isInteger(saved.index) && legacyIds[saved.index]) state.index = lessons.findIndex(lesson => lesson.id === legacyIds[saved.index]);
    state.version = 9;
    state.index = Math.max(0, Math.min(lessons.length - 1, Number(state.index) || 0));
    const legacyGoals = {'sound-off':'toggle-off','sound-on':'toggle-on','notes-open':'app-open','notes-float':'app-float','notes-park':'app-park','notes-unpark':'app-unpark','project-notes-open':'project-app-open','workspace-downloads':'workspace-folder'};
    if (saved.version === 7 && lessons[state.index].id === 'ai-context' && Array.isArray(state.done)) state.done = state.done.map(goal => goal === 'ai-project-source' ? 'ai-source' : goal);
    if (Array.isArray(saved.done) && saved.done.includes('notes-park')) state.parkedWindow ||= 'notes';
    if (Array.isArray(saved.done) && saved.done.includes('sound-off')) state.practiceToggle ||= 'Sound';
    state.done = Array.isArray(state.done) ? state.done.map(value=>legacyGoals[value] || value).filter(value => (lessons[state.index].goals || []).includes(value)) : [];
    return {
      get state() { return state; },
      get lesson() { return lessons[state.index]; },
      active: () => state.status === 'active',
      allows(feature) {
        if (state.status !== 'active') return true;
        const milestone={systems:'system',apps:'apps',overview:'apps',parking:'park',desktops:'desktops','empty-desktop':'empty-desktop',
          stash:'project-stash','project-area':'project-stash',ai:'ai-context',projects:'projects',
          workspaces:'workspaces',folders:'folders',timeline:'overview-navigation','overview-system':'overview-navigation',all:'overview-navigation'}[feature];
        return milestone ? state.index>=lessons.findIndex(lesson=>lesson.id===milestone) : lessons[state.index].level>=9;
      },
      ready() { return (lessons[state.index].goals || []).every(goal => state.done.includes(goal)); },
      mark(goal) {
        if (state.status !== 'active' || !(lessons[state.index].goals || []).includes(goal) || state.done.includes(goal)) return false;
        state.done.push(goal); return true;
      },
      next() { if (!this.ready() || state.chapter || state.index >= lessons.length-1) return false; return this.advance(); },
      advance() { if (state.index >= lessons.length-1) return false; state.index++; state.done=[]; delete state.practiceWindow; delete state.areaResizeBaseline; delete state.areaMoveBaseline; delete state.projectBaseline; delete state.workspaceBaseline; delete state.challengeBaseline; delete state.challengeWindow; delete state.parkingBaseline; delete state.unparkCandidates; delete state.desktopOrigin; delete state.searchQuery; delete state.searchResults; delete state.displayBaseline; delete state.displayWindow; delete state.displayFullscreen; delete state.displayMaximized; delete state.displayPeer; delete state.displayFullPeer; delete state.contextBaseline; delete state.hiddenArea; delete state.timelineActivity; delete state.timelinePlan; delete state.timelineTask; delete state.helpShown; delete state.instanceBaseline; delete state.emptyOrigin; delete state.emptyDesktop; delete state.emptyLaunch; delete state.temporaryDesktop; delete state.temporaryWindow; return true; },
      skip() {
        if (!this.active() || state.chapter || !this.lesson.goals || state.index >= lessons.length-1) return false;
        state.skipped = [...new Set([...(state.skipped || []), this.lesson.id])];
        return this.advance();
      },
      start(mode = 'repeat', chapter = null) {
        const index = lessons.findIndex(lesson => lesson.id === chapter && lesson.goals);
        state = {status:'active', index:index > 0 ? index : 0, mode, initialized:false, done:[], skipped:[], version:9};
        if (index > 0) state.chapter = chapter;
      },
      leave(status = 'skipped') { state.status = status; },
      snapshot: () => JSON.parse(JSON.stringify({...state, lessonId:lessons[state.index].id}))
    };
  }
  // Observe the actual mode and remember which window entered it. A different
  // app or a true fullscreen overlay cannot falsely count as restoring it.
  function observeFullscreen(model, {bounded, full, open}) {
    const trueMode = model.lesson.id === 'true-fullscreen';
    if (!trueMode && model.lesson.id !== 'fullscreen') return false;
    const enter = trueMode ? 'full-enter' : 'bounded-enter', exit = trueMode ? 'full-exit' : 'bounded-exit';
    const current = trueMode ? full : !full && bounded;
    let changed = false;
    if (!model.state.done.includes(enter) && current) {
      model.state.practiceWindow = current;
      changed = model.mark(enter);
    } else if (model.state.done.includes(enter)) {
      const name = model.state.practiceWindow || open[0]; // legacy in-progress lesson
      if (open.includes(name) && !full && (trueMode || bounded !== name)) changed = model.mark(exit);
    }
    return changed;
  }
  function observeTemporaryDesktop(model,scene) {
    if (!model.active() || model.lesson.id!=='temporary-desktop') return false;
    const before=JSON.stringify(model.state),done=model.state.done;
    if (scene.state!=='open' || !scene.borderless) return false;
    if (scene.bond && scene.selected===scene.bond.name && scene.full===scene.bond.name) {
      model.state.temporaryDesktop={name:scene.bond.name,page:scene.bond.page,column:scene.bond.column};
      model.mark('temporary-enter');
    }
    const origin=model.state.temporaryDesktop;
    if (origin && scene.page===origin.page && scene.column===origin.column) {
      if (done.includes('temporary-enter') && scene.bond && !scene.selected) model.mark('temporary-back');
      if (done.includes('temporary-back') && !scene.bond && !scene.full && scene.open.includes(origin.name)) model.mark('temporary-restore');
    }
    return before!==JSON.stringify(model.state);
  }
  const goalLabels = {
    'toggle-off':'Switch any setting off', 'toggle-on':'Switch the same setting on again',
    'area-resized':'Change the System Area width', 'area-moved':'Move an Area to another screen edge', 'app-open':'Open any app', 'two-tiled':'Tile two app windows together',
    'app-float':'Float any app window', 'app-search':'Search for an app of your choice', 'search-launch':'Open its search result',
    'bounded-enter':'Maximize an app between Areas', 'bounded-exit':'Restore that window',
    'full-enter':'Enter Fullscreen', 'full-exit':'Press Escape to return',
    'app-park':'Park any app window', 'apps-rail':'Narrow Apps to a rail',
    'apps-expanded':'Expand Apps again', 'app-unpark':'Unpark a parked app',
    'desktop-next':'Visit another desktop', 'desktop-return':'Return to your starting desktop',
    'project-created':'Create your own empty project', 'project-app-open':'Open any app inside your project',
    'project-workspace':'Find your apps in Workspace', 'project-return':'Return to your project',
    'project-workspace-return':'Switch back to Workspace', 'workspace-created':'Create your own empty workspace',
    'workspace-folder':'Open any of your workspace’s Home folders', 'general-return':'Return to General',
    'display-linked':'Connect the second practice display', 'display-app-moved':'Move any app to Display 2', 'display-app-returned':'Bring that app back to this display', 'display-area-moved':'Move any Area to Display 2', 'display-max-enter':'Maximize and see another app on Display 2', 'display-max-exit':'Restore and bring that app back automatically', 'display-full-enter':'Try Fullscreen with apps and Areas on Display 2', 'display-full-exit':'Press Escape to restore the app',
    'stash-saved':'Save any note, link or file in Stash',
    'ai-project-source':'Attach a project source with its working folder', 'ai-request':'Send your own request for a scripted reply',
    'area-hidden':'Hide any visible Area', 'area-shown':'Restore that Area from Overview → System',
    'overview-away':'Visit another Overview section', 'overview-back':'Return to Apps',
    'overview-filtered':'Try This desktop, Open or Parked', 'overview-window-returned':'Return to a running window from Overview',
    'timeline-activity':'Open any app to create an activity', 'timeline-event':'Add a calendar event covering that moment', 'timeline-compared':'Compare both lanes on the same day', 'timeline-latest':'Use Latest activity to find the newest action',
    'timeline-task-created':'Add your own scheduled task', 'timeline-task-done':'Complete that task',
    'challenge-open':'Open another app in your project', 'challenge-park':'Park that new window', 'challenge-return':'Return to Workspace'
  };
  Object.assign(goalLabels,{"app-open": "Find any app in Overview and open it.", "app-search": "Can you find a companion app by searching for it?", "search-launch": "Open the result you found.", "two-tiled": "Keep two windows side by side.", "app-float": "Put either window where you want it.", "bounded-enter": "Give one app more room without hiding Areas.", "bounded-exit": "Bring that window back to its previous size.", "full-enter": "Try using the whole display.", "full-exit": "Come back to your desktop.", "app-park": "Can you make room without closing either app?", "app-unpark": "Bring your parked app back when you need it.", "desktop-next": "Find another desktop for extra work.", "desktop-return": "Return to the desktop you started on.", "stash-saved": "What is something you do not want to forget? Keep it in Stash.", "stash-inspected": "Open the item you just kept and take another look.", "ai-source": "Give Assistant the item you kept, or another useful source.", "ai-request": "Ask something useful about your source.", "ai-kept": "Keep the demo reply in Stash so you can use it later.", "project-created": "Give your idea a project with any name you like.", "project-app-open": "Open a useful app inside your new project.", "ai-project-source": "Give Assistant a source from this project and check its working folder.", "project-workspace": "Visit Workspace and find your ordinary windows.", "project-return": "Return to the project you created.", "workspace-created": "Create a workspace for another part of your life.", "workspace-folder": "Open any Home folder belonging to your new workspace.", "general-return": "Return to General and find your earlier work.", "timeline-activity": "Open any app to make a new activity.", "timeline-compared": "Find that activity alongside the practice review in Timeline.", "timeline-latest": "Jump to your latest activity on that day.", "timeline-task-created": "Add a small task of your own.", "timeline-task-done": "Mark your task done and see when you finished it.", "area-resized": "Give System a little more or less room.", "area-moved": "Put System on another screen edge of your choice.", "apps-rail": "Give your windows more room by narrowing Apps to a rail.", "apps-expanded": "Widen Apps again to get its cards back.", "area-hidden": "Clear some space by hiding any Area.", "area-shown": "Find and restore that same Area in Overview.", "challenge-open": "Open another tool in your project.", "challenge-park": "Leave that new window running, but out of the way.", "challenge-return": "Return to Workspace for an unrelated task."});
  const goalHints = {"toggle-off": "Choose any quick setting in System.", "toggle-on": "Click the same setting again; its line lights up.", "app-open": "Click the Apps header icon or press Super; choose an app.", "app-search": "Open Overview and type the name or function of an app.", "search-launch": "Choose its search result.", "two-tiled": "Open another window from Overview if you need one.", "app-float": "Middle-drag its title bar, or use Alt + left-drag.", "bounded-enter": "Left-click the maximize button in an app title bar.", "bounded-exit": "Left-click the same maximize button again.", "full-enter": "Middle-click the maximize button.", "full-exit": "Press Escape.", "app-park": "Use the Park button in an app title bar.", "app-unpark": "Click the restore control on its live card in Apps.", "desktop-next": "Unfocus a window, then scroll; Win + scroll also works.", "desktop-return": "Scroll back; the left-side markers show your position.", "stash-saved": "Use Note or drop a link/file in Stash. No title required.", "stash-inspected": "Click your saved item to expand it.", "ai-source": "Drag a Stash item, file or app title-bar icon into Assistant.", "ai-request": "Type your own request in Message Assistant and press Enter.", "ai-kept": "Drag the reply from Assistant into Stash.", "project-created": "Choose New project in Workspace & Projects. The folder can stay blank.", "project-app-open": "Use Overview while your project is selected.", "ai-project-source": "Drag the app title-bar icon or a project Stash item into Assistant.", "project-workspace": "Choose Workspace in the top strip; Win + Shift + scroll also works.", "project-return": "Choose your project name in the top strip.", "workspace-created": "Open Overview and choose New workspace.", "workspace-folder": "Use Projects & Home in Overview and choose a standard folder.", "general-return": "Choose General in Overview\u2019s workspace strip.", "overview-away": "Scroll over non-scrollable Overview content or use its section buttons.", "overview-back": "Choose the Apps section.", "overview-filtered": "Use the running-window filter above the app launcher.", "overview-window-returned": "Choose a running window; use All windows if the filter is empty.", "timeline-activity": "Open any app from Overview.", "timeline-compared": "Choose Timeline, Everything and today; find the labeled practice review.", "timeline-latest": "Choose Latest activity in Timeline.", "timeline-task-created": "Choose Add in Timeline, select Task and give it your own title.", "timeline-task-done": "Tick Done on the task you added.", "area-resized": "Drag System\u2019s inner border.", "apps-rail": "Drag Apps\u2019 inner border toward the screen edge.", "apps-expanded": "Drag the same border back toward the desktop.", "area-moved": "Drag System\u2019s header to another edge and release on the preview.", "area-hidden": "Right-click an Area header and choose Hidden.", "area-shown": "Open Overview \u2192 System \u2192 Desktop Areas and choose Show."};
  const goalFeedback = {"toggle-off": "That setting is off; its indicator is dark.", "toggle-on": "The lit line means it is on again.", "app-open": "Your window is open and has a place in the Apps hotbar.", "search-launch": "Your chosen app is open. Its hotbar icon follows the window.", "two-tiled": "Both windows share the desktop without overlapping.", "app-float": "This window can now sit wherever you need it.", "bounded-enter": "The app fills the desktop while Areas stay accessible.", "bounded-exit": "Your shared desktop space is back.", "full-enter": "The app is using the entire display.", "full-exit": "Your desktop and Areas are back.", "app-park": "The app is still running. Its live card is in Apps.", "app-unpark": "Your app is back, with its content intact.", "desktop-next": "Only the desktop moved; your Areas stayed in place.", "desktop-return": "Your earlier windows are still here.", "stash-saved": "Your item is saved in this workspace\u2019s Stash.", "stash-inspected": "You can inspect it here, drag it out or return to its source.", "ai-source": "The source is attached with its origin. Assistant also works without a project.", "ai-request": "This is a scripted demo reply. Review it before keeping it.", "ai-kept": "Your reply is in Stash with its Assistant source attached.", "project-created": "Your project has its own desktops and an empty Stash.", "project-app-open": "This window belongs to your project; your ordinary window stays separate.", "ai-project-source": "The project source selected its folder for Assistant. Workspace Stash stays separate.", "project-workspace": "Your ordinary workspace windows are still here.", "project-return": "Your project kept its windows and Stash.", "workspace-created": "Your new workspace starts with its own apps, media and Home.", "workspace-folder": "This path belongs to your new workspace. Its downloads go here too.", "general-return": "Your earlier work stayed in General.", "timeline-compared": "The meeting spans time beside your activity. Plans can appear before you interact with them.", "timeline-latest": "You found the latest action without searching through the whole day.", "timeline-task-done": "Timeline keeps the original deadline and when you actually finished.", "area-resized": "The Area has more or less room; windows use the remaining space.", "apps-expanded": "The rail becomes an expanded Area again.", "area-moved": "The Area is docked on your chosen edge.", "area-shown": "The same Area is back; hiding did not close your work.", "challenge-return": "Your project is ready to come back to later."};
  Object.assign(goalLabels,{'instance-created':'Open another window of the same app.','empty-visited':'Find an empty desktop.','empty-launched':'Choose an app from the large icons on that desktop.','temporary-enter':'Enter the attached temporary desktop.','temporary-back':'Return to the original desktop while the app stays fullscreen.','temporary-restore':'Restore the app as a normal window.'});
  Object.assign(goalHints,{'instance-created':'Shift + click an app icon in Apps or Overview.','empty-visited':'Scroll down over an Area until the Open an app launcher appears.','empty-launched':'Click an app icon in the middle of the empty desktop.','temporary-enter':'Click the bottom scene preview, or scroll down over it.','temporary-back':'Open Overview → Apps and choose Back to Desktop.','temporary-restore':'Open Overview → Apps and choose Restore window on the temporary card.'});
  Object.assign(goalFeedback,{'instance-created':'The new window has its own contents and hotbar number.','empty-visited':'This desktop is ready for a new tool.','empty-launched':'The app opened here; your earlier window kept its own place.','temporary-enter':'The app owns this display, with no desktop Areas around it.','temporary-back':'Your app stays fullscreen on its attached desktop.','temporary-restore':'The normal window is back and its temporary desktop is gone.'});
  function mission(model) {
    const goals=model.lesson.goals||[],goal=goals.find(goal=>!model.state.done.includes(goal));
    const last=goals.filter(goal=>model.state.done.includes(goal)).at(-1);
    let feedback=goalFeedback[last]||'';
    if(last==='stash-saved'&&model.state.keptItem?.title)feedback='“'+model.state.keptItem.title+'” is saved in your workspace Stash.';
    if(last==='ai-source'&&model.state.aiSourceTitle)feedback='“'+model.state.aiSourceTitle+'” is attached with its origin.';
    return {goal,task:goal?goalLabels[goal]:model.lesson.task,hint:goalHints[goal]||'',feedback,done:goals.filter(goal=>model.state.done.includes(goal)).length,total:goals.length};
  }
  // Supply missing windows for skip/replay, retaining the learner’s own app choices.
  function prerequisites(id) {
    const index = lessons.findIndex(lesson => lesson.id === id);
    const project=['project-app','project-navigation','challenge'].includes(id);
    return {window:id!=='temporary-desktop' && (id==='app-instances' || index >= lessons.findIndex(lesson => lesson.id === 'tiling')), parked:['area-rail','unpark'].includes(id),
      project,projectApp:['project-navigation','challenge'].includes(id),inProject:project,
      ownWorkspace:['folders','return'].includes(id),downloads:id==='return'};
  }
  // Validate saved data and live view state, rather than crediting a click.
  function observeContext(model,scene){
    if(!model.active())return false;
    const id=model.lesson.id,before=JSON.stringify(model.state),done=model.state.done;
    const ids=items=>(items||[]).map(item=>item.id);
    const baseline=model.state.contextBaseline ||= {workspace:scene.workspace,column:scene.column,note:scene.note||'',items:ids(scene.items),attachments:ids(scene.ai?.items),draft:scene.ai?.draft||'',turns:ids(scene.ai?.turns),areas:{...scene.areas},activity:ids(scene.activity),plans:ids(scene.plans)};
    if(scene.workspace!==baseline.workspace)return before!==JSON.stringify(model.state);
    if(id==='project-stash'&&scene.column===baseline.column){
      const item=scene.items?.find(item=>!baseline.items.includes(item.id)&&!item.deleted);
      if(item){model.state.keptItem={id:item.id,title:item.title||'Your item'};model.mark('stash-saved');}
      if(done.includes('stash-saved')&&scene.expandedStash?.includes(model.state.keptItem?.id))model.mark('stash-inspected');
    }
    if(id==='ai-context'){
      const source=scene.ai?.items?.find(item=>!baseline.attachments.includes(item.id)&&(!item.workspace||item.workspace===scene.workspace));
      if(source){model.state.aiSourceTitle=source.title||'Your source';model.mark('ai-source');}
      if(done.includes('ai-source')&&scene.ai?.turns?.some(turn=>!turn.example&&turn.request?.trim()&&!(baseline.turns||[]).includes(turn.id)))model.mark('ai-request');
      if(done.includes('ai-request')&&scene.items?.some(item=>!baseline.items.includes(item.id)&&item.source?.app==='ai-demo'&&!item.deleted))model.mark('ai-kept');
    }
    if(id==='project-app'&&done.includes('project-app-open')){
      if(scene.ai?.items?.some(item=>!baseline.attachments.includes(item.id)&&item.project===model.state.practiceProject)&&scene.ai.workingProject===model.state.practiceProject)model.mark('ai-project-source');
    }
    if(id==='hide-areas'){
      if(!model.state.hiddenArea){const name=Object.keys(baseline.areas).find(name=>baseline.areas[name]&&scene.areas?.[name]===false);if(name){model.state.hiddenArea=name;model.mark('area-hidden');}}
      if(model.state.hiddenArea&&scene.areas?.[model.state.hiddenArea]&&scene.overview&&scene.section==='system')model.mark('area-shown');
    }
    if(id==='overview-navigation'&&scene.overview){if(scene.section!=='apps')model.mark('overview-away');else if(done.includes('overview-away'))model.mark('overview-back');}
    if(id==='timeline'){
      const activity=scene.activity?.find(e=>!baseline.activity.includes(e.id)&&['app.open','app.restore'].includes(e.type));
      if(activity){model.state.timelineActivity ||= activity;model.mark('timeline-activity');}
      const at=model.state.timelineActivity;
      const event=at&&scene.plans?.find(e=>!baseline.plans.includes(e.id)&&e.type==='calendar.event'&&e.time<=at.time&&e.endTime>at.time);
      if(event){model.state.timelinePlan=event.id;model.mark('timeline-event');}
      if(event&&scene.overview&&scene.section==='timeline'&&scene.filter==='all'&&!scene.query&&scene.day===scene.activityDay)model.mark('timeline-compared');
    }
    if(id==='timeline-task'){
      const task=scene.plans?.find(e=>!baseline.plans.includes(e.id)&&e.type==='task.due');
      if(task){model.state.timelineTask=task.id;model.mark('timeline-task-created');if(task.done)model.mark('timeline-task-done');}
    }
    return before!==JSON.stringify(model.state);
  }
  // An actual Overview action must have its intended result in this workspace.
  function observeOverviewAction(model,action,scene){
    if(!model.active()||action.workspace!==scene.workspace||scene.workspace!==model.state.contextBaseline?.workspace||!action.fromOverview)return false;
    if(model.lesson.id==='overview-navigation'){
      if(action.kind==='filter'&&action.section==='apps'&&scene.overview&&scene.section==='apps'&&['desktop','open','parked'].includes(action.value)&&scene.windowFilter===action.value)return model.mark('overview-filtered');
      if(action.kind==='window'&&action.section==='apps'&&model.state.done.includes('overview-filtered')&&scene.open?.includes(action.name)&&scene.front===action.name)return model.mark('overview-window-returned');
    }
    if(model.lesson.id==='timeline'&&action.kind==='latest'&&action.section==='timeline'&&model.state.done.includes('timeline-compared')&&scene.overview&&scene.section==='timeline'&&scene.day===scene.activityDay&&scene.activity?.some(item=>item.id===model.state.timelineActivity?.id))return model.mark('timeline-latest');
    return false;
  }
  function observeWindows(model, scene) {
    if (!model.active()) return false;
    const before = JSON.stringify(model.state), id = model.lesson.id, done = model.state.done;
    const {open = [], states = {}, tiled = [], floating = [], column = 'workspace', page = 0} = scene;
    const remember = name => {model.state.workspaceWindow = name; if(scene.bases?.[name]) model.state.preferredApp = scene.bases[name];};
    if (id === 'apps' && open.length) {remember(open[0]);model.mark('app-open');}
    if (id === 'tiling' && tiled.length >= 2) model.mark('two-tiled');
    if (id === 'app-instances') {
      model.state.instanceBaseline ||= Object.keys(states);
      if (open.some(name=>!model.state.instanceBaseline.includes(name) && model.state.instanceBaseline.some(other=>other!==name && ['open','minimized'].includes(states[other]) && scene.bases?.[other]===scene.bases?.[name] && scene.bases?.[name]))) model.mark('instance-created');
    }
    if (id === 'empty-desktop') {
      model.state.emptyOrigin ||= {page,column};
      const origin=model.state.emptyOrigin;
      if (column===origin.column && page!==origin.page && !open.length) {
        model.state.emptyDesktop={page,column};model.mark('empty-visited');
      }
      const target=model.state.emptyDesktop,launch=model.state.emptyLaunch;
      if (target && launch && launch.workspace===scene.workspace && launch.column===column && launch.page===page && target.column===column && target.page===page && open.some(name=>(scene.bases?.[name]||name)===launch.name)) model.mark('empty-launched');
      delete model.state.emptyLaunch;
    }
    if (id === 'float' && floating.length && !scene.interacting) {remember(floating[0]);model.mark('app-float');}
    if (id === 'park') {
      model.state.parkingBaseline ||= Object.keys(states).filter(name=>states[name] === 'minimized');
      model.state.parkingBaseline = model.state.parkingBaseline.filter(name=>states[name] === 'minimized');
      const name = Object.keys(states).find(name=>states[name] === 'minimized' && !model.state.parkingBaseline.includes(name));
      if (name) {remember(name);model.state.parkedWindow = name;model.mark('app-park');}
    }
    if (id === 'unpark') {
      model.state.unparkCandidates = [...new Set([...(model.state.unparkCandidates || []), ...Object.keys(states).filter(name=>states[name] === 'minimized')])];
      const name = model.state.unparkCandidates.find(name=>open.includes(name));
      if (name) {remember(name);model.state.parkedWindow = name;model.mark('app-unpark');}
    }
    if (id === 'project-app' && column === model.state.practiceProject && open.length) model.mark('project-app-open');
    if (id === 'project-navigation') {
      if (column === 'workspace') {
        if (done.includes('project-return')) model.mark('project-workspace-return');
        else if (open.length) model.mark('project-workspace');
      } else if (column === model.state.practiceProject && done.includes('project-workspace')) model.mark('project-return');
    }
    if (id === 'desktops') {
      model.state.desktopOrigin ||= {page,column};
      const origin = model.state.desktopOrigin;
      if (column === origin.column && page !== origin.page) model.mark('desktop-next');
      else if (column === origin.column && page === origin.page && done.includes('desktop-next')) model.mark('desktop-return');
    }
    return before !== JSON.stringify(model.state);
  }
  function observeToggle(model, name, active) {
    if (model.lesson.id !== 'system' || !name) return false;
    if (!active && !model.state.done.includes('toggle-off')) {model.state.practiceToggle = name; return model.mark('toggle-off');}
    if (active && model.state.practiceToggle === name && model.state.done.includes('toggle-off')) return model.mark('toggle-on');
    return false;
  }
  function observeSearch(model, {query = '', results = [], launch, opened = []}) {
    if (model.lesson.id !== 'overview' || !query.trim() || !results.length) return false;
    let changed = model.mark('app-search');
    model.state.searchQuery = query; model.state.searchResults = results;
    if (launch && results.includes(launch) && opened.includes(launch)) changed = model.mark('search-launch') || changed;
    return changed;
  }
  function observeDisplays(model, {count = 1, slot = 1, assignments = {}, states = {}, areas = [], bounded, transferred = {}, full, open = []}) {
    if (!model.active() || model.lesson.id !== 'two-displays' || count < 2) return false;
    const before = JSON.stringify(model.state), done = model.state.done;
    model.mark('display-linked');
    model.state.displayBaseline ||= {slot, apps:{...assignments.apps}, areas:{...assignments.areas}};
    const baseline = model.state.displayBaseline;
    const moved = Object.keys(states).find(name => states[name] === 'open' && Number(assignments.apps?.[name] || 1) !== Number(baseline.apps[name] || baseline.slot));
    if (!model.state.displayWindow && moved) {model.state.displayWindow = moved; model.mark('display-app-moved');}
    const name = model.state.displayWindow;
    if (name && states[name] === 'open' && Number(assignments.apps?.[name] || 1) === baseline.slot && open.includes(name)) model.mark('display-app-returned');
    if (areas.some(area => Number(assignments.areas?.[area.name] || 1) !== Number(baseline.areas[area.name] || baseline.slot))) model.mark('display-area-moved');
    const peer = Object.keys(transferred).find(name=>states[name] === 'open' && Number(assignments.apps?.[name]) === transferred[name].target);
    if (done.includes('display-app-returned') && done.includes('display-area-moved') && bounded && !full && peer) {
      model.state.displayMaximized = bounded; model.state.displayPeer = peer; model.mark('display-max-enter');
    }
    if (done.includes('display-max-enter') && !bounded && !full && open.includes(model.state.displayMaximized) && open.includes(model.state.displayPeer)) model.mark('display-max-exit');
    if (done.includes('display-max-exit') && full && peer && areas.some(area => area.saved === slot && area.actual !== slot && !area.hidden)) {
      model.state.displayFullscreen = full; model.state.displayFullPeer = peer; model.mark('display-full-enter');
    }
    if (done.includes('display-full-enter') && !full && !bounded && open.includes(model.state.displayFullscreen) && open.includes(model.state.displayFullPeer)) model.mark('display-full-exit');
    return before !== JSON.stringify(model.state);
  }
  function recovery(model, scene) {
    if (!model.active() || model.ready()) return null;
    const id = model.lesson.id, done = model.state.done;
    const hint = (text,action,label) => ({text,action,label});
    if (id === 'fullscreen' && scene.full) return hint('This is Fullscreen. Press Escape, then left-click maximize for the space between Areas.','escape','Exit Fullscreen');
    if (['fullscreen','true-fullscreen'].includes(id)) {
      if (model.state.practiceWindow && !scene.open.includes(model.state.practiceWindow)) return hint('The window used for this task was closed or parked. Reopen it and try the full-screen task again.','fullscreen-retry','Reopen and retry');
      if (!scene.open.length) return hint('Open any app before trying its full-screen controls.','window','Open an app');
    }
    if (id==='temporary-desktop') {
      if(scene.workspace!=='gaming')return hint('This task uses Fallout 4 in Gaming, where the app runs without a window frame or title-bar controls.','temporary-retry','Return to Gaming');
      if(model.state.temporaryWindow && (!scene.temporaryBond || !scene.temporaryOpen) && !done.includes('temporary-restore'))return hint('The game left its temporary desktop before the task was finished. Prepare it again to retry.','temporary-retry','Prepare temporary desktop');
      return null;
    }
    const ownWorkspace = ['folders','return'].includes(id);
    if (scene.workspace !== (ownWorkspace ? model.state.practiceWorkspace : 'general') && id !== 'workspaces') return hint('This task belongs in ' + (ownWorkspace ? 'your new workspace' : 'General') + '. Your practice work is still there.','workspace', ownWorkspace ? 'Return to your workspace' : 'Return to General');
    if (['project-app','project-navigation','challenge'].includes(id) && !scene.projectExists) return hint('Your practice project was closed or removed. Reopen it, or prepare a replacement to continue.','project','Restore practice project');
    if (['project-app'].includes(id) && scene.column !== model.state.practiceProject) return hint('Open the app inside your practice project, so it belongs to that project.','project','Go to your project');
    if (['tiling','app-instances','float','park'].includes(id) && (scene.column !== 'workspace' || !scene.open.length)) return hint('Bring any app onto the Workspace desktop for this task. Your existing windows and saved content are still available.','window','Bring an app here');
    if(id==='overview-navigation'&&!scene.open.length&&!scene.parked?.length)return hint('There is no window on this desktop. Choose a populated desktop in Apps, or bring an app here. All windows includes the other desktops in the current project or Workspace.','window','Bring an app here');
    if (id === 'unpark' && !scene.parked?.length && !(model.state.unparkCandidates || []).some(name=>scene.open.includes(name))) return hint('There is no parked app available. Park any window, then bring it back using its card or rail icon.','park-app','Prepare a parked app');
    if (id === 'project-navigation' && scene.column === 'workspace' && !scene.open.length) return hint('Open or unpark any app in Workspace before comparing it with your project.','window','Open a Workspace app');
    if (id === 'true-fullscreen' && scene.bounded && !done.includes('full-enter')) return hint('This fills the space between Areas. Middle-click maximize for Fullscreen.','true-fullscreen','Enter Fullscreen');
    return null;
  }
  function shouldCompact(preference, guideRect, targetRect) {
    if (preference === 'compact') return true;
    return !!(targetRect && guideRect.left < targetRect.right && guideRect.right > targetRect.left && guideRect.top < targetRect.bottom && guideRect.bottom > targetRect.top);
  }
  function placeGuide(viewport, size, targets = []) {
    const margin = 12, width = Math.min(size.width, viewport.width - margin * 2), height = Math.min(size.height, viewport.height - margin * 2);
    const right = Math.max(margin, viewport.width - width - margin), bottom = Math.max(margin, viewport.height - height - margin);
    const candidates = [{left:right,top:bottom},{left:margin,top:bottom},{left:right,top:margin},{left:margin,top:margin}];
    const overlap = rect => targets.reduce((sum,target) => sum + Math.max(0,Math.min(rect.left+width,target.right)-Math.max(rect.left,target.left)) * Math.max(0,Math.min(rect.top+height,target.bottom)-Math.max(rect.top,target.top)),0);
    return candidates.reduce((best,candidate) => overlap(candidate) < overlap(best) ? candidate : best);
  }
  const api = {chapters, mission, goalHints, lessons, create, observeContext, observeOverviewAction, observeFullscreen, observeTemporaryDesktop, observeWindows, observeToggle, observeSearch, observeDisplays, goalLabels, prerequisites, recovery, shouldCompact, placeGuide, key, prefix};
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  let real;
  try { real = root.localStorage; } catch {}
  if (!real) {
    real = {};
    Object.defineProperties(real, {getItem:{value:name=>real[name] ?? null}, setItem:{value:(name,value)=>{real[name]=String(value);}}, removeItem:{value:name=>{delete real[name];}}});
  }
  const params = new URLSearchParams(root.location?.search || '');
  api.displayCompanion = params.get('guide') === 'display';
  let saved = {}, fresh = false;
  try {
    saved = JSON.parse(real.getItem(key) || '{}');
    fresh = !saved.status && !real.getItem('spatial-workspace-app-states-v1') && !real.getItem('spatial-active-workspace');
  } catch {}
  const model = create(saved);
  if (fresh && !api.displayCompanion) model.start('first');
  api.model = model;
  api.view = 'expanded';
  try { if (real.getItem('spatial-guide-view-v1') === 'compact') api.view = 'compact'; } catch {}
  api.setView = value => { api.view = value === 'compact' ? 'compact' : 'expanded'; try { real.setItem('spatial-guide-view-v1',api.view); } catch {} };
  api.save = () => { if (api.displayCompanion) return; try { real.setItem(key, JSON.stringify(model.snapshot())); } catch {} };
  // Keep late layout/autosave callbacks in practice storage while leaving.
  // The normal desktop gets its own facade after the page reloads.
  let practiceSession = model.active() || api.displayCompanion;
  const storageKey = name => { if (model.active()) practiceSession = true; return (practiceSession ? prefix : '') + name; };
  api.storage = {
    getItem(name) { try { return real.getItem(storageKey(name)); } catch { return null; } },
    setItem(name, value) { try { real.setItem(storageKey(name), value); } catch {} },
    removeItem(name) { try { real.removeItem(storageKey(name)); } catch {} }
  };
  api.clearPractice = () => {
    try { Object.keys(real).filter(name => name.startsWith(prefix)).forEach(name => real.removeItem(name)); } catch {}
  };
  if (!fresh && !model.active() && root.location) {
    if (params.get('guide') === 'start' || params.get('guide') === 'chapter') {
      api.clearPractice(); model.start('repeat',params.get('guide') === 'chapter' ? params.get('chapter') : null);
    }
  }
  if (model.active() && !model.state.sessionId && !api.displayCompanion) model.state.sessionId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  api.syncScope = api.displayCompanion ? 'guide:' + params.get('practice') : model.active() ? 'guide:' + model.state.sessionId : 'desktop';
  api.displayValid = !api.displayCompanion || (model.active() && model.lesson.id === 'two-displays' && params.get('practice') === model.state.sessionId);
  api.finish = (status, choice = "keep") => {
    // A first-run learner keeps their work. Repeat lessons never touch their real session.
    if (['clean','demo'].includes(choice)) root.SpatialWorkspaceSetup.reset(real,choice);
    else if (model.state.mode === 'first') {
      try { Object.keys(real).filter(name => name.startsWith(prefix)).forEach(name => real.setItem(name.slice(prefix.length), real.getItem(name))); } catch {}
    }
    if (choice === 'keep' && model.state.mode === 'first') real.setItem('spatial-desktop-preset-v1','clean');
    delete model.state.exitStatus; model.leave(status); api.save();
  };
  api.applyGate = () => {
    const element = document.documentElement;
    const gates={guideSystems:'systems',guideApps:'apps',guideOverview:'overview',guideParking:'parking',guideDesktops:'desktops',guideEmptyDesktop:'empty-desktop',guideStash:'stash',guideProjects:'projects',guideWorkspaces:'workspaces',guideFolders:'folders',guideAi:'ai',guideTimeline:'timeline',guideSystemOverview:'overview-system',guideAll:'all'};
    if(model.active()) {element.dataset.guideLevel=lessons[model.state.index].level;for(const [attribute,feature] of Object.entries(gates))element.dataset[attribute]=String(model.allows(feature));}
    else for(const attribute of ['guideLevel',...Object.keys(gates)])delete element.dataset[attribute];
  };
  api.save(); api.applyGate(); root.SpatialGuide = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
