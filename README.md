# Diff and Patch Viewer

Read-only Obsidian viewer for `.diff` and `.patch` files.

## Scope

This plugin only renders diff and patch files. It does **not** apply patches, call `git`, modify files, or bundle unrelated Git Viewer behavior.

## Features

- opens `.diff` and `.patch` through a custom read-only view;
- shows file list and per-file stats;
- shows hunk headers;
- highlights additions and deletions;
- falls back to raw read-only text when no unified diff hunk is detected.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run sync:test-vault
npm run smoke:cdp
```

`npm run sync:test-vault` copies only `main.js`, `manifest.json`, and `styles.css` to:

```text
/mnt/c/Users/viggo/github/obsidian-test-vault/.obsidian/plugins/diff-patch-viewer
```

The sync script refuses `Syncthing/vault` targets.
