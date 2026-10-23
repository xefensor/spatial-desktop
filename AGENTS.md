# Spatial Desktop — agent instructions

These instructions apply to the whole repository.

## Default delivery

- The canonical project is `xefensor/spatial-desktop` on GitHub. Use its latest `main` as the starting point.
- Xef's standing preference is to implement requested project changes in this repository, verify them, commit them and push them to `main`. A local edit or a separate ChatGPT-hosted copy alone does not complete a normal implementation request. Do not ask him to repeat this preference in each chat.
- Follow any explicit instruction for the current task such as “preview only”, “no commit”, “no push” or a different branch. Discussion and design advice alone do not request a commit.
- Preserve unrelated work. Check the remote head before publishing, integrate newer changes safely, and never force-push or rewrite shared history.
- Pushes to `main` publish `dist/` through `.github/workflows/pages.yml`. Check the workflow result before claiming that the live demo has updated. Report the commit and demo link; say clearly if publishing is blocked or still pending.

## Project conventions

- Panels and widgets are the canonical desktop. Do not restore the retired Areas layout, headers, rails, resize engine or settings. Legacy lesson/storage identifiers may remain solely to preserve saved progress and data.

- Editable website source is in `dist/`; there is no website build step. Run `npm ci` for the development-only DOM test dependency before verification. Automated checks are in `scripts/`.
- Keep demo labels, names and help text in English. The digital assistant's visible name is **Assistant**. Existing internal `ai` identifiers, filenames and storage keys are compatibility details; a label change must not reset saved chats or Guide progress.
- Keep prototype limitations explicit: Assistant replies are scripted and local, and native OS integration remains future work.
- `dist/philosophy.html` is Xef's own unfinished design philosophy. Preserve his authored text unless he asks to edit it. The obsolete design-record page and its navigation have been removed; do not restore them. Dated audits and source archives remain repository history.
- Update current documentation when a change affects documented behaviour. Preserve historical screenshots and their accurate descriptions.

## Verification

Run `npm ci`, then the checks used by GitHub Pages before publishing:

```sh
for file in dist/*.js; do node --check "$file" || exit 1; done
for file in scripts/check-*.cjs; do node "$file" || exit 1; done
```

For visible UI changes, also inspect the relevant interaction in a browser. Serve the demo with:

```sh
python3 -m http.server 8000 --directory dist
```
