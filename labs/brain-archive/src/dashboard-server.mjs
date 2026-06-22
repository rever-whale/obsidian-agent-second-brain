#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeVaultGraph,
  applyPlan,
  findSimilarNotes,
  markDailyNoteArchived,
  parseDailyNote,
  planArchive,
  renderGraphDoctorReport,
  renderPlanDiff,
  renderSimilarNotesReport
} from "./brain-archive.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const labRoot = path.resolve(__dirname, "..");
const publicRoot = path.join(labRoot, "web");
const DEFAULT_DATE = "2026-06-22";

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"]
]);

export function createDashboardServer() {
  return createServer(async (request, response) => {
    try {
      if (request.method === "GET") {
        await handleStatic(request, response);
        return;
      }

      if (request.method === "POST") {
        await handleApi(request, response);
        return;
      }

      send(response, 405, { error: "Method not allowed" });
    } catch (error) {
      send(response, 500, {
        ok: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
}

async function handleStatic(request, response) {
  const url = new URL(request.url, "http://127.0.0.1");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = path.normalize(path.join(publicRoot, pathname));

  if (!target.startsWith(publicRoot)) {
    sendText(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  try {
    const content = await readFile(target);
    sendText(response, 200, content, MIME_TYPES.get(path.extname(target)) ?? "application/octet-stream");
  } catch {
    sendText(response, 404, "Not found", "text/plain; charset=utf-8");
  }
}

async function handleApi(request, response) {
  const url = new URL(request.url, "http://127.0.0.1");
  const body = await readJsonBody(request);

  if (url.pathname === "/api/bootstrap") {
    const result = await bootstrapVault(body);
    send(response, 200, result);
    return;
  }

  if (url.pathname === "/api/archive/dry-run") {
    const context = await archiveContext(body);
    const diff = await renderPlanDiff(context);
    send(response, 200, {
      ok: true,
      summary: `Planned ${context.actions.length} archive action(s).`,
      actions: context.actions,
      output: diff
    });
    return;
  }

  if (url.pathname === "/api/archive/apply") {
    const context = await archiveContext(body);
    const changed = await applyPlan(context);
    const archiveState = await markDailyNoteArchived({
      sourcePath: context.sourcePath,
      vaultRoot: context.vaultRoot
    });
    send(response, 200, {
      ok: true,
      summary: `Applied ${changed.length} change(s); daily note archived.`,
      changed,
      archiveState,
      output: [
        `Applied ${changed.length} change(s):`,
        ...changed.map((file) => `- ${file}`),
        `Daily note status: ${archiveState.archiveStatus} (${archiveState.archivedAt})`,
        `Daily note moved to: ${formatRelative(archiveState.archivedPath, context.vaultRoot)}`
      ].join("\n")
    });
    return;
  }

  if (url.pathname === "/api/graph") {
    const vaultRoot = resolveFromLab(body.vault || "sandbox-vault");
    const analysis = await analyzeVaultGraph(vaultRoot);
    send(response, 200, {
      ok: true,
      summary: `Graph checked: ${analysis.totalNotes} note(s), ${analysis.brokenLinks.length} broken link(s).`,
      analysis,
      output: renderGraphDoctorReport(analysis)
    });
    return;
  }

  if (url.pathname === "/api/similar") {
    const vaultRoot = resolveFromLab(body.vault || "sandbox-vault");
    const notePath = resolveFromLab(body.note || defaultSimilarNote(body.vault));
    const result = await findSimilarNotes({
      vaultRoot,
      queryPath: notePath,
      limit: Number(body.limit || 3)
    });
    send(response, 200, {
      ok: true,
      summary: `Found ${result.candidates.length} similar candidate(s).`,
      result,
      output: renderSimilarNotesReport(result)
    });
    return;
  }

  if (url.pathname === "/api/report") {
    const result = await writeArchiveReport(body);
    send(response, 200, result);
    return;
  }

  send(response, 404, { ok: false, error: "Unknown API route" });
}

async function archiveContext(body) {
  const vaultRoot = resolveFromLab(body.vault || "sandbox-vault");
  const sourcePath = await resolveDashboardDailyPath({
    vaultRoot,
    sourcePath: resolveFromLab(body.daily || defaultDailyNote(body.vault, body.date))
  });
  const markdown = await readFile(sourcePath, "utf8");
  const sections = parseDailyNote(markdown);
  const actions = planArchive({ sections, sourcePath, vaultRoot });
  return { actions, sourcePath, vaultRoot };
}

async function resolveDashboardDailyPath({ vaultRoot, sourcePath }) {
  try {
    await readFile(sourcePath, "utf8");
    return sourcePath;
  } catch {
    const relativePath = formatRelative(sourcePath, vaultRoot);
    const archivePath = relativePath.startsWith("daily/")
      ? path.join(vaultRoot, "archive", "daily", path.basename(sourcePath))
      : path.join(vaultRoot, "archive", relativePath);
    await readFile(archivePath, "utf8");
    return archivePath;
  }
}

async function bootstrapVault(body) {
  const date = body.date || DEFAULT_DATE;
  const vaultRoot = resolveFromLab(body.vault || "sandbox-vault");
  await mkdir(vaultRoot, { recursive: true });
  for (const directory of [
    "inbox/manual-review",
    "daily",
    "notes/frontend",
    "notes/backend",
    "notes/architecture",
    "notes/learning",
    "notes/references",
    "projects",
    "questions",
    "decisions",
    "meetings",
    "moc",
    "reviews",
    "reports",
    "templates",
    "archive/daily"
  ]) {
    await mkdir(path.join(vaultRoot, directory), { recursive: true });
  }

  await writeFile(path.join(vaultRoot, "templates/daily.md"), dailyTemplate(), "utf8");
  await writeFile(path.join(vaultRoot, "templates/note.md"), noteTemplate(), "utf8");
  await writeFile(path.join(vaultRoot, `daily/${date}.md`), dailyNote(date), "utf8");

  return {
    ok: true,
    summary: `Created ${formatRelative(vaultRoot)}.`,
    output: [
      `Created ${formatRelative(vaultRoot)}`,
      `Daily note: ${formatRelative(path.join(vaultRoot, `daily/${date}.md`))}`,
      `Next: dry-run archive`
    ].join("\n")
  };
}

async function writeArchiveReport(body) {
  const date = body.date || DEFAULT_DATE;
  const vaultRoot = resolveFromLab(body.vault || "sandbox-vault");
  const context = await archiveContext(body);
  const reportPath = path.join(vaultRoot, `reports/${date}-archive.md`);
  await mkdir(path.dirname(reportPath), { recursive: true });

  const lines = [
    `# Archive Report: ${date}`,
    "",
    "## Input",
    "",
    `- ${formatRelative(resolveFromLab(body.daily || defaultDailyNote(body.vault, date)), vaultRoot)}`,
    "",
    "## Planned Targets",
    "",
    ...context.actions.map((action) => `- ${action.target} (${action.kind}, risk=${action.risk}, confidence=${action.confidence})`),
    "",
    "## Review Notes",
    "",
    "- dry-run diff를 보고 target path와 제목을 확인한다.",
    "- apply 후 graph doctor와 similar search 결과를 weekly review에서 다시 본다.",
    "",
    "## Next",
    "",
    "- orphan note 확인",
    "- 중복 후보 확인",
    "- 필요한 노트를 MOC에 연결"
  ];

  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  return {
    ok: true,
    summary: `Wrote report ${formatRelative(reportPath)}.`,
    output: `Report written:\n- ${formatRelative(reportPath)}`
  };
}

function defaultDailyNote(vault = "sandbox-vault", date = DEFAULT_DATE) {
  return `${vault || "sandbox-vault"}/daily/${date || DEFAULT_DATE}.md`;
}

function defaultSimilarNote(vault = "sandbox-vault") {
  return `${vault || "sandbox-vault"}/notes/frontend/react-query-invalidation.md`;
}

function resolveFromLab(value) {
  if (path.isAbsolute(value)) return path.normalize(value);
  return path.resolve(labRoot, value);
}

function formatRelative(value, from = labRoot) {
  const relative = path.relative(from, value);
  return relative && !relative.startsWith("..") ? relative.split(path.sep).join("/") : value;
}

function dailyTemplate() {
  return `---
type: daily
date: {{date}}
archive_status: pending
---

# {{date}}

## Insight

## Learn

## Project

## Question

## Decision

## Meeting

## Reference
`;
}

function noteTemplate() {
  return `---
type: concept
status: active
created: {{date}}
updated: {{date}}
source: []
aliases: []
---

# {{title}}

## Observation

## Related
`;
}

function dailyNote(date) {
  return `---
type: daily
date: ${date}
archive_status: pending
---

# ${date}

## Insight

React Query invalidateQueries는 생각보다 범위가 넓다.

## Project

검색 API latency 조사.
원인 후보는 Redis miss와 DB index.

## Question

Server Component에서 cache 범위는 어디까지인가?
`;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response, status, value) {
  sendText(response, status, JSON.stringify(value, null, 2), "application/json; charset=utf-8");
}

function sendText(response, status, value, contentType) {
  response.writeHead(status, { "content-type": contentType });
  response.end(value);
}

const isCli = fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const port = Number(process.env.PORT || 8787);
  const server = createDashboardServer();
  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(`brain-archive dashboard: http://127.0.0.1:${port}\n`);
  });
}
