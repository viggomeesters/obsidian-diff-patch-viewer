import { FileView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { parseDiffText, type DiffFile, type DiffHunk, type DiffLine, type ParsedDiff } from "./parser";

const VIEW_TYPE_DIFF_PATCH = "diff-patch-viewer";
const SUPPORTED_EXTENSIONS = ["diff", "patch"];

export default class DiffPatchViewerPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_DIFF_PATCH, (leaf) => new DiffPatchView(leaf));
    this.registerExtensions(SUPPORTED_EXTENSIONS, VIEW_TYPE_DIFF_PATCH);
  }
}

class DiffPatchView extends FileView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_DIFF_PATCH;
  }

  getDisplayText(): string {
    return this.file?.basename ?? "Diff/Patch";
  }

  getIcon(): string {
    return "git-compare";
  }

  async onLoadFile(file: TFile): Promise<void> {
    const raw = await this.app.vault.read(file);
    const parsed = parseDiffText(raw);
    this.render(file, parsed);
  }

  async onUnloadFile(): Promise<void> {
    this.contentEl.empty();
  }

  private render(file: TFile, parsed: ParsedDiff): void {
    this.contentEl.empty();
    this.contentEl.addClass("diff-patch-viewer");

    const header = this.contentEl.createDiv({ cls: "diff-patch-viewer__header" });
    header.createEl("h2", { text: file.path });
    header.createEl("p", {
      cls: "diff-patch-viewer__summary",
      text: `${parsed.summary.files} files · ${parsed.summary.hunks} hunks · +${parsed.summary.additions} / -${parsed.summary.deletions}`,
    });

    if (parsed.files.length === 0) {
      this.renderRawFallback(parsed.raw);
      return;
    }

    const fileList = this.contentEl.createEl("nav", { cls: "diff-patch-viewer__files", attr: { "aria-label": "Changed files" } });
    for (const diffFile of parsed.files) {
      fileList.createEl("div", {
        cls: "diff-patch-viewer__file-link",
        text: `${displayPath(diffFile)}  +${diffFile.additions} / -${diffFile.deletions}`,
      });
    }

    for (const diffFile of parsed.files) {
      this.renderFile(diffFile);
    }
  }

  private renderRawFallback(raw: string): void {
    this.contentEl.createEl("h3", { text: "Raw fallback" });
    this.contentEl.createEl("p", {
      cls: "diff-patch-viewer__notice",
      text: "No unified diff hunks were detected. Showing the file as read-only raw text.",
    });
    this.contentEl.createEl("pre", { cls: "diff-patch-viewer__raw", text: raw });
  }

  private renderFile(diffFile: DiffFile): void {
    const section = this.contentEl.createEl("section", { cls: "diff-patch-viewer__file" });
    section.createEl("h3", { text: displayPath(diffFile) });
    section.createEl("p", { cls: "diff-patch-viewer__stats", text: `+${diffFile.additions} / -${diffFile.deletions}` });

    for (const hunk of diffFile.hunks) {
      this.renderHunk(section, hunk);
    }
  }

  private renderHunk(parent: HTMLElement, hunk: DiffHunk): void {
    const article = parent.createEl("article", { cls: "diff-patch-viewer__hunk" });
    article.createEl("h4", { text: hunk.header });
    const code = article.createEl("pre", { cls: "diff-patch-viewer__code" });

    for (const line of hunk.lines) {
      code.appendChild(renderLine(line));
    }
  }
}

function displayPath(file: DiffFile): string {
  if (file.newPath === "/dev/null") return file.oldPath;
  return file.newPath;
}

function renderLine(line: DiffLine): HTMLElement {
  const element = document.createElement("div");
  element.className = `diff-patch-viewer__line diff-patch-viewer__line--${line.kind}`;
  element.textContent = line.text;
  return element;
}
