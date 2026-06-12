import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const PLUGIN_ID = "diff-patch-viewer";
const DEFAULT_PORT = 9222;

async function main() {
  if (process.platform === "linux" && os.release().toLowerCase().includes("microsoft") && !process.env.DPV_CDP_WINDOWS_NODE) {
    const scriptPath = path.resolve(process.argv[1]);
    const wslpath = spawnSync("wslpath", ["-w", scriptPath], { encoding: "utf8" });
    if (wslpath.status !== 0) throw new Error(`wslpath failed: ${wslpath.stderr || wslpath.stdout}`);
    const command = `$env:DPV_CDP_WINDOWS_NODE='1'; node '${wslpath.stdout.trim().replaceAll("'", "''")}'`;
    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], { stdio: "inherit" });
    process.exit(result.status ?? 1);
  }

  const target = await findTarget("127.0.0.1", DEFAULT_PORT);
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);
  try {
    await client.send("Runtime.enable");
    const result = await evaluateSmoke(client);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    client.close();
  }
}

async function findTarget(host, port) {
  const response = await fetch(`http://${host}:${port}/json/list`);
  if (!response.ok) throw new Error(`CDP endpoint returned ${response.status}`);
  const targets = await response.json();
  const target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
  if (!target) throw new Error("No CDP page target found");
  return target;
}

async function evaluateSmoke(client) {
  const response = await client.send("Runtime.evaluate", {
    expression: `(${browserSmoke.toString()})(${JSON.stringify({ pluginId: PLUGIN_ID })})`,
    awaitPromise: true,
    returnByValue: true,
    timeout: 60_000,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? JSON.stringify(response.exceptionDetails));
  return response.result.value;
}

async function browserSmoke({ pluginId }) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const assert = (condition, message, details = {}) => {
    if (!condition) {
      const error = new Error(message);
      error.details = details;
      throw error;
    }
  };

  assert(window.app?.vault?.getName?.() === "obsidian-test-vault", "Wrong vault is open", { vault: window.app?.vault?.getName?.() });

  const folder = "dpv-smoke";
  const filePath = `${folder}/sample.patch`;
  const fallbackPath = `${folder}/fallback.diff`;
  const sample = `diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1,2 +1,3 @@\n keep\n-old\n+new\n+added\n`;

  if (!window.app.vault.getAbstractFileByPath(folder)) await window.app.vault.createFolder(folder);
  const existing = window.app.vault.getAbstractFileByPath(filePath);
  if (existing) await window.app.vault.modify(existing, sample);
  else await window.app.vault.create(filePath, sample);
  const fallbackExisting = window.app.vault.getAbstractFileByPath(fallbackPath);
  if (fallbackExisting) await window.app.vault.modify(fallbackExisting, "not a diff\n");
  else await window.app.vault.create(fallbackPath, "not a diff\n");

  if (window.app.plugins.plugins[pluginId]) {
    await window.app.plugins.disablePlugin(pluginId);
    await window.app.plugins.unloadPlugin(pluginId);
    await sleep(300);
  }
  await window.app.plugins.loadManifests();
  await window.app.plugins.loadPlugin(pluginId);
  await sleep(500);

  const file = window.app.vault.getAbstractFileByPath(filePath);
  await window.app.workspace.getLeaf(true).openFile(file);
  await sleep(800);
  const bodyText = document.body.innerText;
  assert(bodyText.includes("1 files · 1 hunks · +2 / -1"), "Summary was not rendered", { bodyText: bodyText.slice(0, 1000) });
  assert(bodyText.includes("a.txt"), "Changed file path was not rendered");
  assert(bodyText.includes("+added"), "Added line was not rendered");
  assert(bodyText.includes("-old"), "Deleted line was not rendered");
  assert(window.app.workspace.activeLeaf.view.getViewType() === "diff-patch-viewer", "Active view is not diff-patch-viewer", { viewType: window.app.workspace.activeLeaf.view.getViewType() });

  const fallback = window.app.vault.getAbstractFileByPath(fallbackPath);
  await window.app.workspace.getLeaf(true).openFile(fallback);
  await sleep(800);
  const fallbackText = document.body.innerText;
  assert(fallbackText.includes("Raw fallback"), "Raw fallback was not rendered");
  assert(fallbackText.includes("not a diff"), "Raw fallback text was not rendered");

  return {
    ok: true,
    viewType: window.app.workspace.activeLeaf.view.getViewType(),
    renderedPatch: filePath,
    renderedFallback: fallbackPath,
    viewPresent: window.app.workspace.activeLeaf.view.getViewType() === "diff-patch-viewer",
  };
}

class CdpClient {
  static connect(url) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      const client = new CdpClient(socket);
      socket.addEventListener("open", () => resolve(client), { once: true });
      socket.addEventListener("error", (event) => reject(new Error(event.message ?? "WebSocket connection failed")), { once: true });
    });
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.socket.addEventListener("message", (event) => this.onMessage(event));
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  close() {
    this.socket.close();
  }

  onMessage(event) {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`.trim()));
    else pending.resolve(message.result);
  }
}

await main();
