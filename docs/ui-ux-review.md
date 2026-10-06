# UI and UX refinement

This pass preserves Spatial Desktop's material and spatial model while making its information easier to scan and its controls easier to use.

## Overview

The Overview has three vertical contexts: Projects and Home, Applications, and System. Open and parked windows are compact rows above the application library, rather than miniature desktop previews. Window state remains visible without opening a separate page. Application names wrap when needed; the grid adapts to its own available width.

The category selector filters the existing library. Search accepts filenames, punctuation, accents and reordered words. An explicit close control complements Escape and Super. Workspace tabs support Left/Right, Home and End. Search navigation does not intercept category selection.

Notifications are mirrored from the System Area, including dismissal. Date, window counts, active project, favorite counts, music progress and timer state come from the existing state rather than separate mock values. The System heading stays outside its scrolling content.

## Material rules retained

- Areas, Overview and transient menus use square, thin-edged acrylic glass.
- App windows retain opaque ABS bodies and solid content surfaces.
- Full-color app icons remain unframed where possible.
- Application colors convey identity; no new titlebar fades are introduced.
- Toggle indicators remain distinct from momentary actions.
- Press feedback retains the short mechanical timing. Keyboard focus gets a clear outline.
- Docking, tiling, project Modes, workspace sessions and display synchronization keep their existing implementation and saved state.

## Supporting pages

The philosophy, material guide and reference share focus styling and project-relative navigation. The material token table retains every column on smaller screens. Reference device and appearance controls expose their selected state to assistive technology. Forms and guide sections have more resilient scrolling and text wrapping.

`dist/ui-refinements.css` contains the presentation changes, loaded after each page's established material styles. Behavior changes stay in the existing desktop and reference controllers. Automated checks cover search, live workspace metadata, category parity, asset references and the existing tiling/intent/session policies.

The site remains a browser prototype: simulated applications, system actions and sample files are not native OS integrations.
