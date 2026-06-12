import fs from "node:fs/promises";
import path from "node:path";

const textExtensions = new Set([".ts", ".js", ".mjs", ".json", ".md", ".css", ".yml", ".yaml"]);
const ignoredDirs = new Set([".git", "node_modules", "dist"]);
const root = process.cwd();
const failures = [];

for await (const file of walk(root)) {
  if (!textExtensions.has(path.extname(file))) continue;
  const content = await fs.readFile(file, "utf8");
  if (/[ \t]$/m.test(content)) failures.push(`${path.relative(root, file)} has trailing whitespace`);
  if (!content.endsWith("\n")) failures.push(`${path.relative(root, file)} is missing final newline`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Lint passed.");

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(fullPath);
    else if (entry.isFile()) yield fullPath;
  }
}
