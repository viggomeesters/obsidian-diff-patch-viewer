import fs from "node:fs/promises";
import path from "node:path";

const PLUGIN_ID = "diff-patch-viewer";
const TEST_VAULT_NAME = "obsidian-test-vault";
const DEFAULT_TARGET = `/mnt/c/Users/viggo/github/${TEST_VAULT_NAME}/.obsidian/plugins/${PLUGIN_ID}`;
const ARTIFACTS = ["main.js", "manifest.json", "styles.css"];

const target = path.resolve(process.argv[2] ?? DEFAULT_TARGET);
const normalized = target.replaceAll("\\", "/").toLowerCase();

if (normalized.includes("syncthing/vault")) {
  throw new Error(`Refusing to sync into main Syncthing vault path: ${target}`);
}
if (!normalized.includes(`/${TEST_VAULT_NAME}/.obsidian/plugins/${PLUGIN_ID}`)) {
  throw new Error(`Refusing unsafe target. Expected ${TEST_VAULT_NAME}/.obsidian/plugins/${PLUGIN_ID}, got: ${target}`);
}

await fs.mkdir(target, { recursive: true });
const copied = [];
for (const artifact of ARTIFACTS) {
  const source = path.resolve(artifact);
  const destination = path.join(target, artifact);
  const stat = await fs.stat(source);
  await fs.copyFile(source, destination);
  copied.push({ artifact, source, destination, bytes: stat.size });
}

console.log(JSON.stringify({ ok: true, target, copied }, null, 2));
