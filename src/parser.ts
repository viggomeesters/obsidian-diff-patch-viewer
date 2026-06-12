export type DiffLineKind = "context" | "addition" | "deletion" | "meta";

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

export interface DiffHunk {
  header: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  rawHeader: string[];
}

export interface DiffSummary {
  files: number;
  hunks: number;
  additions: number;
  deletions: number;
}

export interface ParsedDiff {
  files: DiffFile[];
  summary: DiffSummary;
  raw: string;
}

const DEV_NULL = "/dev/null";

export function parseDiffText(raw: string): ParsedDiff {
  const lines = raw.split(/\r?\n/);
  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let pendingOldPath: string | null = null;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      currentFile = createFileFromGitHeader(line);
      files.push(currentFile);
      currentHunk = null;
      pendingOldPath = null;
      continue;
    }

    if (line.startsWith("--- ")) {
      pendingOldPath = normalizeDiffPath(line.slice(4).trim());
      if (currentFile) currentFile.rawHeader.push(line);
      continue;
    }

    if (line.startsWith("+++ ")) {
      const newPath = normalizeDiffPath(line.slice(4).trim());
      if (!currentFile) {
        currentFile = createFile(pendingOldPath ?? DEV_NULL, newPath);
        files.push(currentFile);
      } else {
        currentFile.oldPath = pendingOldPath ?? currentFile.oldPath;
        currentFile.newPath = newPath;
        currentFile.rawHeader.push(line);
      }
      currentHunk = null;
      pendingOldPath = null;
      continue;
    }

    if (line.startsWith("@@ ")) {
      if (!currentFile) {
        currentFile = createFile("unknown", "unknown");
        files.push(currentFile);
      }
      currentHunk = { header: line.trim(), additions: 0, deletions: 0, lines: [] };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    if (!currentFile) continue;

    if (!currentHunk) {
      currentFile.rawHeader.push(line);
      continue;
    }

    const parsedLine = parseHunkLine(line);
    currentHunk.lines.push(parsedLine);

    if (parsedLine.kind === "addition") {
      currentHunk.additions += 1;
      currentFile.additions += 1;
    } else if (parsedLine.kind === "deletion") {
      currentHunk.deletions += 1;
      currentFile.deletions += 1;
    }
  }

  return {
    files,
    summary: summarize(files),
    raw,
  };
}

function createFileFromGitHeader(line: string): DiffFile {
  const match = line.match(/^diff --git a\/(.*?) b\/(.*)$/);
  if (!match) return createFile("unknown", "unknown", [line]);
  return createFile(match[1], match[2], [line]);
}

function createFile(oldPath: string, newPath: string, rawHeader: string[] = []): DiffFile {
  return { oldPath, newPath, additions: 0, deletions: 0, hunks: [], rawHeader };
}

function normalizeDiffPath(path: string): string {
  if (path === DEV_NULL) return path;
  return path.replace(/^(a|b)\//, "");
}

function parseHunkLine(line: string): DiffLine {
  if (line.startsWith("+") && !line.startsWith("+++")) return { kind: "addition", text: line };
  if (line.startsWith("-") && !line.startsWith("---")) return { kind: "deletion", text: line };
  if (line.startsWith("\\")) return { kind: "meta", text: line };
  return { kind: "context", text: line };
}

function summarize(files: DiffFile[]): DiffSummary {
  return files.reduce<DiffSummary>(
    (summary, file) => {
      summary.files += 1;
      summary.hunks += file.hunks.length;
      summary.additions += file.additions;
      summary.deletions += file.deletions;
      return summary;
    },
    { files: 0, hunks: 0, additions: 0, deletions: 0 },
  );
}
