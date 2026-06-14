# Contributing

Thanks for helping improve Diff and Patch Viewer.

## Local setup

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run community:check
```

For manual testing, copy the built runtime files into `.obsidian/plugins/diff-patch-viewer/` in a test vault, reload the app, and open supported fixture files.

## Pull requests

- Keep the plugin one-purpose.
- Do not add network APIs in runtime plugin code.
- Do not add clipboard access without explicit user action and documentation.
- Do not use the main Life OS vault for plugin development or testing.
- Run lint, typecheck, tests, build, and community checks before opening a PR.

## Release assets

Community releases must include:

- `main.js`
- `manifest.json`
- `styles.css`
