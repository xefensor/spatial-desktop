# Source version history

The repository contains all 153 saved source versions in their original order. The imported commits are titled `Import Spatial Desktop v001` through `v153`. Each one has exactly the original source tree, including assets and the hosting manifest.

## Two forms of history

1. **Imported Git commits:** normal, browsable GitHub history with the actual source changes for every version. The GitHub connector creates new commit identities and timestamps. Original commit information is included in commit messages and `versions.json`.
2. **`spatial-desktop-original-history.bundle`:** the exact original Git object history, retaining original SHAs, parents, authors, dates and messages. It contains all 153 original commits and their files.

`versions.json` maps the saved version number to both the original and imported commit SHAs. It also records original tree SHAs and author/committer metadata. The original commit messages were generally `Update Site source`; the numbered import messages make navigation easier.

## Check out an imported version

Look up its `github_commit` in `versions.json`, then create an isolated checkout:

```sh
git worktree add --detach ../spatial-desktop-old-version IMPORTED_COMMIT_SHA
cd ../spatial-desktop-old-version
python3 -m http.server 8153 --directory dist
```

Replace `IMPORTED_COMMIT_SHA` with the desired real SHA. Use a separate port for each version to isolate its browser state. Historical versions preserve the behaviour and bugs of their respective snapshots; they have not all been retested on current browsers.

## Restore the exact original history

From a clone of this repository:

```sh
git bundle verify docs/history/spatial-desktop-original-history.bundle
git fetch docs/history/spatial-desktop-original-history.bundle HEAD:refs/heads/original-history
git log original-history
```

The `original-history` branch now contains all 153 original commits. To inspect its current source without changing your main checkout:

```sh
git worktree add ../spatial-desktop-original original-history
```

The original tip is `2d0a6c27f999838edb76817459e81e736f2f1bf3`. The branch should contain exactly 153 commits:

```sh
git rev-list --count original-history
```

If you also want the unchanged original branch directly visible on GitHub, push it after the fetch above:

```sh
git push origin original-history
```

This creates a separate branch and does not replace `main`.

## Export boundaries

This is the website's saved source history. Chat messages, browser-local demo state and generated design images from before the website are not part of Git history.
