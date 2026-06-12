# Manual QA

Use the Windows-local `obsidian-test-vault`; do not use the main Life OS vault.

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run sync:test-vault
npm run smoke:cdp
npm run community:check
```

Expected:

- plugin loads from `.obsidian/plugins/diff-patch-viewer`;
- supported files open in the plugin view;
- no runtime network, clipboard, git, or patch-apply behavior is introduced;
- release assets are exactly `main.js`, `manifest.json`, and `styles.css`.
