# Third-party notices and asset provenance

The project licenses cover the contributors' original material only.
The entries below preserve separate rights, sources and exceptions.
An exclusion from the project licenses does not itself grant permission
to redistribute an unidentified asset.

## Mozilla Firefox artwork and branding

- Locations: dist/images/apps/firefox.svg and the app-browser SVG symbol
  embedded in dist/index.html; also visible inside some demo captures.
- Verified upstream reference:
  https://github.com/mozilla-firefox/firefox/blob/main/browser/branding/official/content/about-logo.svg
- The bundled SVG was compared with this upstream file when these notices
  were added and matches after trimming surrounding whitespace.
  Mozilla artwork and branding are excluded from this project's GPL
  and CC grants.
- Mozilla's licensing information:
  https://www.mozilla.org/en-US/foundation/licensing/
- Applicable trademark guidance:
  https://www.mozilla.org/en-US/foundation/trademarks/policy/

Firefox is a trademark of the Mozilla Foundation in the US and other
countries. Spatial Desktop is an independent interface experiment and is
not affiliated with or endorsed by Mozilla. The simulated browser window
does not distribute or connect to the actual Firefox application.

## Other product representations

The demo includes names, marks and visual references to Steam, Fallout,
KDE applications and other products. The locally drawn app-steam,
app-game, app-dolphin and app-elisa symbols and the related mock
interfaces do not grant rights to third-party branding or protected
artwork. No upstream icon source or separate icon license is recorded
for those local interpretations; none is asserted here.

Steam and its logo are trademarks of Valve Corporation. Other product
names and marks belong to their respective owners. The prototype is not
affiliated with or endorsed by these organizations. Its game artwork and
interfaces are illustrative local examples, not connected products.

The project licenses cover the contributors' own implementation
contributions, subject to the retained third-party rights.

## Public-domain reference photograph

- File: dist/images/philosophy/keychron-profile.jpg
- Title: Keychron K1 v2 TKL side view
- Photographer: Wikimedia Commons user Mulad
- Source:
  https://commons.wikimedia.org/wiki/File:Keychron_K1_v2_TKL_side_view.jpg
- Recorded status: dedicated to the public domain by its author.
- Project modifications: resized and converted to JPEG; no content changes.
- Existing machine-readable credit:
  dist/images/philosophy/credits.json

This photograph retains its public-domain status. It is not presented as
original Spatial Desktop artwork or relicensed under CC BY-SA.

## Legacy bitmap wallpapers with unrecorded provenance

The following tracked legacy files are excluded from the project-wide
license grants:

| Files | Recorded status |
| --- | --- |
| dist/wallpaper.jpg and dist/wallpaper-river-v34.jpg | Identical landscape photographs imported with historical prototypes. No photographer, source or redistribution license is recorded. |
| dist/wallpaper.png | Historical video-game screenshot. The game, capture source and applicable permissions are not recorded. |

These files are not referenced by the current live HTML, CSS or JavaScript.
Their presence in repository history or historical archives does not
establish a reuse permission. Confirm their provenance before reusing them.

## Original project illustrations and demo audio

The repository records the following as locally created prototype content,
with no external image or audio sample source:

- dist/assets/wallpaper-silk.svg
- dist/assets/wallpaper-specks.svg
- dist/images/gaming/sanctuary-concept.svg
- dist/media/stash/storyboard.svg
- dist/media/stash/survey-route.svg
- dist/media/stash/closing-theme.wav

The corresponding original contributions are covered by the content grant
in [LICENSING.md](LICENSING.md). The settlement SVG is an original
stylized scene rather than a captured game screenshot. Referenced game
and product branding remains subject to the exceptions above.

## Prototype screenshots

The seven captures in dist/images/design-notes/ were made from the browser
prototype on 21 October 2026, source commit
582edc4a016cf7fe20fa863e90192fe512ad94a2.
Their original contributions are CC-BY-SA-4.0; incorporated third-party
material is excluded from that grant. Capture captions and provenance
remain in dist/images/design-notes/credits.json.

Historical verification captures in docs/images/ have the same
original-contribution scope. Neither these notices nor the new license
files alter the underlying rights in material visible inside a capture.

## Development dependencies

jsdom and its transitive dependencies retain their own copyright notices
and licenses, identified in package-lock.json and the installed packages.
They are development-only dependencies. node_modules/ is not tracked or
included in the published dist/ website.

## License texts

The unmodified GPL and CC license texts were obtained from the SPDX
license-list-data project:

- https://github.com/spdx/license-list-data/blob/main/text/GPL-3.0-or-later.txt
- https://github.com/spdx/license-list-data/blob/main/text/CC-BY-SA-4.0.txt

The copies served in dist/licenses/ are byte-identical to this repository's
LICENSE and LICENSE-CONTENT files.
