import test from "node:test";
import assert from "node:assert/strict";
import { parseDiffText } from "../dist/parser.mjs";

const SAMPLE = `diff --git a/src/old.ts b/src/new.ts
index 1111111..2222222 100644
--- a/src/old.ts
+++ b/src/new.ts
@@ -1,4 +1,5 @@
 const keep = true;
-const oldName = "old";
+const newName = "new";
+const added = true;
 context();
diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -10,2 +10,2 @@ Heading
-old docs
+new docs
`;

test("parses files, hunks, additions and deletions", () => {
  const parsed = parseDiffText(SAMPLE);
  assert.equal(parsed.files.length, 2);
  assert.deepEqual(parsed.summary, { files: 2, hunks: 2, additions: 3, deletions: 2 });
  assert.equal(parsed.files[0].oldPath, "src/old.ts");
  assert.equal(parsed.files[0].newPath, "src/new.ts");
  assert.equal(parsed.files[0].hunks[0].header, "@@ -1,4 +1,5 @@");
  assert.equal(parsed.files[0].additions, 2);
  assert.equal(parsed.files[0].deletions, 1);
});

test("keeps a raw fallback for non-unified text", () => {
  const parsed = parseDiffText("not a diff\njust text\n");
  assert.equal(parsed.files.length, 0);
  assert.equal(parsed.raw, "not a diff\njust text\n");
  assert.equal(parsed.summary.additions, 0);
});

test("does not treat diff headers as added/deleted lines", () => {
  const parsed = parseDiffText("--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n");
  assert.equal(parsed.summary.additions, 1);
  assert.equal(parsed.summary.deletions, 1);
});
