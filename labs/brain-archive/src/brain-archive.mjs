#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SECTION_HEADING = /^##\s+(.+?)\s*$/;
const WIKILINK = /!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
const STOP_WORDS = new Set([
  "and",
  "for",
  "from",
  "into",
  "the",
  "this",
  "that",
  "with",
  "about",
  "note",
  "source",
  "related",
  "status",
  "type"
]);

export function parseDailyNote(markdown) {
  const body = stripFrontmatter(markdown);
  const lines = body.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(SECTION_HEADING);
    if (match) {
      if (current) sections.push(finalizeSection(current));
      current = { heading: match[1].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }

  if (current) sections.push(finalizeSection(current));
  return sections.filter((section) => section.text.length > 0);
}

export function planArchive({ sections, sourcePath, vaultRoot }) {
  return sections.map((section, index) => {
    const kind = classifySection(section.heading);
    const target = targetForSection(section, kind);
    const action = {
      id: `act-${String(index + 1).padStart(3, "0")}`,
      kind,
      source: normalizePath(path.relative(vaultRoot, sourcePath)),
      sourceHeading: section.heading,
      target,
      title: titleForSection(section, kind),
      risk: riskForKind(kind),
      confidence: confidenceForSection(section, kind),
      text: section.text
    };
    return action;
  });
}

export async function renderPlanDiff({ actions, vaultRoot }) {
  const chunks = [];
  for (const action of actions) {
    const targetPath = path.join(vaultRoot, action.target);
    let existing = "";
    try {
      existing = await readFile(targetPath, "utf8");
    } catch {
      existing = "";
    }

    if (existing) {
      chunks.push(renderAppendDiff(action, existing));
    } else {
      chunks.push(renderCreateDiff(action));
    }
  }
  return chunks.join("\n");
}

export async function applyPlan({ actions, vaultRoot }) {
  const changed = [];
  for (const action of actions) {
    const targetPath = path.join(vaultRoot, action.target);
    await mkdir(path.dirname(targetPath), { recursive: true });

    let existing = "";
    try {
      existing = await readFile(targetPath, "utf8");
    } catch {
      existing = "";
    }

    const addition = renderActionMarkdown(action);
    const next = existing
      ? `${existing.replace(/\s*$/, "\n\n")}${addition}\n`
      : `${renderNewNote(action)}\n`;
    await writeFile(targetPath, next, "utf8");
    changed.push(action.target);
  }
  return changed;
}

export async function markDailyNoteArchived({ sourcePath, archivedAt = new Date() }) {
  const markdown = await readFile(sourcePath, "utf8");
  const archivedDate = archivedAt.toISOString().slice(0, 10);
  const next = updateFrontmatter(markdown, {
    archive_status: "archived",
    archived_at: archivedDate
  });
  await writeFile(sourcePath, next, "utf8");
  return {
    source: normalizePath(sourcePath),
    archiveStatus: "archived",
    archivedAt: archivedDate
  };
}

export async function analyzeVaultGraph(vaultRoot) {
  const files = await listMarkdownFiles(vaultRoot);
  const noteByAlias = new Map();
  for (const file of files) {
    noteByAlias.set(slugify(path.basename(file, ".md")), file);

    const markdown = await readFile(path.join(vaultRoot, file), "utf8");
    const title = extractTitle(markdown);
    if (title) noteByAlias.set(slugify(title), file);
  }

  const nodes = new Map(files.map((file) => [file, { inbound: 0, outbound: 0 }]));
  const brokenLinks = [];
  const edges = [];

  for (const file of files) {
    const markdown = await readFile(path.join(vaultRoot, file), "utf8");
    const links = extractWikilinks(markdown);
    for (const link of links) {
      const target = noteByAlias.get(slugify(link));
      nodes.get(file).outbound += 1;
      if (target) {
        nodes.get(target).inbound += 1;
        edges.push({ from: file, to: target });
      } else {
        brokenLinks.push({ from: file, target: link });
      }
    }
  }

  const orphanNotes = [...nodes.entries()]
    .filter(([file, degree]) => file.startsWith("notes/") && degree.inbound + degree.outbound === 0)
    .map(([file]) => file);
  const hubs = [...nodes.entries()]
    .map(([file, degree]) => ({
      file,
      degree: degree.inbound + degree.outbound,
      inbound: degree.inbound,
      outbound: degree.outbound
    }))
    .filter((node) => node.degree > 0)
    .sort((left, right) => right.degree - left.degree)
    .slice(0, 5);

  return {
    totalNotes: files.length,
    totalEdges: edges.length,
    orphanNotes,
    brokenLinks,
    hubs
  };
}

export function renderGraphDoctorReport(analysis) {
  return [
    "Graph Doctor",
    "",
    `Total notes: ${analysis.totalNotes}`,
    `Edges: ${analysis.totalEdges}`,
    `Orphan notes: ${analysis.orphanNotes.length}`,
    `Broken links: ${analysis.brokenLinks.length}`,
    "",
    "Top hubs:",
    ...formatHubLines(analysis.hubs),
    "",
    "Orphan note list:",
    ...formatList(analysis.orphanNotes),
    "",
    "Broken link list:",
    ...formatBrokenLinkLines(analysis.brokenLinks)
  ].join("\n");
}

export async function findSimilarNotes({ vaultRoot, queryPath, queryText, limit = 5 }) {
  if (!queryPath && !queryText) {
    throw new Error("findSimilarNotes requires queryPath or queryText");
  }

  const files = await listMarkdownFiles(vaultRoot);
  const resolvedQueryPath = queryPath ? path.resolve(queryPath) : "";
  const queryRelativePath = resolvedQueryPath
    ? normalizePath(path.relative(vaultRoot, resolvedQueryPath))
    : "";
  const sourceText = queryText ?? await readFile(resolvedQueryPath, "utf8");
  const queryVector = vectorize(sourceText);

  const candidates = [];
  for (const file of files) {
    if (file === queryRelativePath) continue;

    const markdown = await readFile(path.join(vaultRoot, file), "utf8");
    const score = cosineSimilarity(queryVector, vectorize(markdown));
    if (score <= 0) continue;

    candidates.push({
      file,
      score: Number(score.toFixed(4)),
      title: extractTitle(markdown) || toTitle(path.basename(file, ".md"))
    });
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.file.localeCompare(right.file);
  });

  return {
    query: queryRelativePath || "inline-query",
    candidates: candidates.slice(0, limit)
  };
}

export function renderSimilarNotesReport(result) {
  return [
    "Similar Notes",
    "",
    `Query: ${result.query}`,
    "",
    "Candidates:",
    ...formatSimilarLines(result.candidates)
  ].join("\n");
}

async function main(argv) {
  const [command, subcommandOrPath, ...rest] = argv;
  if (command === "graph" && subcommandOrPath === "doctor") {
    const options = parseOptions(rest);
    const vaultRoot = path.resolve(options.vault ?? ".");
    const analysis = await analyzeVaultGraph(vaultRoot);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderGraphDoctorReport(analysis)}\n`);
    }
    return 0;
  }

  if (command === "search" && subcommandOrPath === "similar") {
    const [queryArg, ...optionArgs] = rest;
    if (!queryArg) {
      printUsage();
      return 1;
    }

    const options = parseOptions(optionArgs);
    const vaultRoot = path.resolve(options.vault ?? ".");
    const result = await findSimilarNotes({
      vaultRoot,
      queryPath: path.resolve(queryArg),
      limit: options.limit ?? 5
    });

    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderSimilarNotesReport(result)}\n`);
    }
    return 0;
  }

  const dailyPath = subcommandOrPath;
  if (command !== "archive" || !dailyPath) {
    printUsage();
    return 1;
  }

  const options = parseOptions(rest);
  const vaultRoot = path.resolve(options.vault ?? ".");
  const sourcePath = path.resolve(dailyPath);
  const markdown = await readFile(sourcePath, "utf8");
  const sections = parseDailyNote(markdown);
  const actions = planArchive({ sections, sourcePath, vaultRoot });

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ source: dailyPath, actions }, null, 2)}\n`);
    return 0;
  }

  if (options.apply) {
    const changed = await applyPlan({ actions, vaultRoot });
    const archiveState = await markDailyNoteArchived({ sourcePath });
    process.stdout.write(`Applied ${changed.length} change(s):\n`);
    for (const file of changed) process.stdout.write(`- ${file}\n`);
    process.stdout.write(`Daily note status: ${archiveState.archiveStatus} (${archiveState.archivedAt})\n`);
    return 0;
  }

  const diff = await renderPlanDiff({ actions, vaultRoot });
  process.stdout.write(diff);
  return 0;
}

function stripFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) return markdown;
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) return markdown;
  return markdown.slice(end + 4);
}

function updateFrontmatter(markdown, values) {
  if (!markdown.startsWith("---\n")) {
    const frontmatter = renderFrontmatter(values);
    return `---\n${frontmatter}---\n\n${markdown}`;
  }

  const end = markdown.indexOf("\n---", 4);
  if (end === -1) {
    const frontmatter = renderFrontmatter(values);
    return `---\n${frontmatter}---\n\n${markdown}`;
  }

  const frontmatter = markdown.slice(4, end).replace(/^\n/, "");
  const body = markdown.slice(end);
  const nextFrontmatter = upsertFrontmatterValues(frontmatter, values);
  return `---\n${nextFrontmatter}${body}`;
}

function upsertFrontmatterValues(frontmatter, values) {
  const lines = frontmatter.split(/\r?\n/);
  const seen = new Set();
  const next = lines.map((line) => {
    const match = line.match(/^([A-Za-z0-9_-]+):/);
    if (!match) return line;
    const key = match[1];
    if (!(key in values)) return line;
    seen.add(key);
    return `${key}: ${values[key]}`;
  });

  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) next.push(`${key}: ${value}`);
  }

  return `${next.join("\n").replace(/\s*$/, "\n")}`;
}

function renderFrontmatter(values) {
  return Object.entries(values).map(([key, value]) => `${key}: ${value}`).join("\n") + "\n";
}

async function listMarkdownFiles(root, current = "") {
  const directory = path.join(root, current);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "book") continue;
    const relativePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(root, relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(normalizePath(relativePath));
    }
  }
  return files.sort();
}

function extractWikilinks(markdown) {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "");
  const links = [];
  for (const match of withoutCode.matchAll(WIKILINK)) {
    links.push(match[1].trim());
  }
  return links;
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+?)\s*$/m);
  return match?.[1].trim() ?? "";
}

function vectorize(markdown) {
  const vector = new Map();
  for (const token of tokenize(markdown)) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }
  return vector;
}

function tokenize(markdown) {
  return stripFrontmatter(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(WIKILINK, " $1 ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .normalize("NFKD")
    .toLowerCase()
    .split(/[^\p{Letter}\p{Number}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function cosineSimilarity(left, right) {
  let dotProduct = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (const count of left.values()) leftNorm += count * count;
  for (const count of right.values()) rightNorm += count * count;
  if (leftNorm === 0 || rightNorm === 0) return 0;

  for (const [token, leftCount] of left.entries()) {
    dotProduct += leftCount * (right.get(token) ?? 0);
  }

  return dotProduct / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function finalizeSection(section) {
  return {
    heading: section.heading,
    text: section.lines.join("\n").trim()
  };
}

function classifySection(heading) {
  const normalized = heading.toLowerCase();
  if (normalized === "insight") return "create_or_merge_concept";
  if (normalized === "learn") return "create_learning_note";
  if (normalized === "project") return "append_project";
  if (normalized === "question") return "create_question";
  if (normalized === "decision") return "append_decision";
  if (normalized === "meeting") return "create_meeting_note";
  if (normalized === "reference") return "create_reference_note";
  return "manual_review";
}

function targetForSection(section, kind) {
  const text = section.text.toLowerCase();
  if (kind === "append_project") {
    if (text.includes("search api") || section.text.includes("검색 API")) {
      return "projects/search-api.md";
    }
    return `projects/${slugify(firstMeaningfulLine(section.text))}.md`;
  }
  if (kind === "create_question") {
    if (text.includes("server component") || text.includes("rsc")) {
      return "questions/rsc-cache-scope.md";
    }
    return `questions/${slugify(firstMeaningfulLine(section.text))}.md`;
  }
  if (kind === "append_decision") return "decisions/decision-log.md";
  if (kind === "create_meeting_note") return `meetings/${slugify(firstMeaningfulLine(section.text))}.md`;
  if (kind === "create_reference_note") return `notes/references/${slugify(firstMeaningfulLine(section.text))}.md`;
  if (section.text.includes("React Query")) return "notes/frontend/react-query-invalidation.md";
  return `notes/${slugify(firstMeaningfulLine(section.text))}.md`;
}

function titleForSection(section, kind) {
  if (section.text.includes("React Query")) return "React Query Invalidation";
  if (kind === "append_project" && section.text.includes("검색 API")) return "Search API";
  if (kind === "create_question" && section.text.includes("Server Component")) return "RSC Cache Scope";
  return toTitle(firstMeaningfulLine(section.text));
}

function riskForKind(kind) {
  if (kind === "create_question" || kind === "create_reference_note") return "low";
  if (kind === "manual_review") return "high";
  return "medium";
}

function confidenceForSection(section, kind) {
  if (kind === "manual_review") return 0.45;
  if (section.text.length < 20) return 0.62;
  if (["create_question", "append_project"].includes(kind)) return 0.86;
  return 0.8;
}

function renderCreateDiff(action) {
  const content = renderNewNote(action).split("\n").map((line) => `+${line}`).join("\n");
  return [
    `diff --git a/${action.target} b/${action.target}`,
    "new file mode 100644",
    "--- /dev/null",
    `+++ b/${action.target}`,
    "@@",
    content,
    ""
  ].join("\n");
}

function renderAppendDiff(action, existing) {
  const lineCount = existing.split(/\r?\n/).length;
  const content = renderActionMarkdown(action).split("\n").map((line) => `+${line}`).join("\n");
  return [
    `diff --git a/${action.target} b/${action.target}`,
    `--- a/${action.target}`,
    `+++ b/${action.target}`,
    `@@ -${lineCount},0 +${lineCount + 1},${content.split("\n").length} @@`,
    content,
    ""
  ].join("\n");
}

function renderNewNote(action) {
  return [
    "---",
    `type: ${noteTypeForAction(action.kind)}`,
    "status: active",
    "source:",
    `  - "[[${sourceBasename(action.source)}]]"`,
    "---",
    "",
    `# ${action.title}`,
    "",
    renderActionMarkdown(action)
  ].join("\n");
}

function renderActionMarkdown(action) {
  if (action.kind === "append_project") {
    return [
      `## ${new Date().toISOString().slice(0, 10)} ${action.title}`,
      "",
      `Source: [[${sourceBasename(action.source)}]]`,
      "",
      action.text
    ].join("\n");
  }
  if (action.kind === "create_question") {
    return [
      "## Question",
      "",
      action.text,
      "",
      "## Research Notes",
      "",
      "- 기존 vault에서 관련 concept note를 찾는다.",
      "- 필요하면 외부 source를 조사한다."
    ].join("\n");
  }
  return [
    "## Observation",
    "",
    action.text,
    "",
    "## Related",
    "",
    "- [[Review Queue]]"
  ].join("\n");
}

function noteTypeForAction(kind) {
  if (kind === "create_question") return "question";
  if (kind === "append_project") return "project";
  if (kind === "append_decision") return "decision";
  if (kind === "create_reference_note") return "reference";
  return "concept";
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--vault") {
      options.vault = args[index + 1];
      index += 1;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--limit") {
      options.limit = Number.parseInt(args[index + 1], 10);
      index += 1;
    }
  }
  return options;
}

function formatHubLines(hubs) {
  if (hubs.length === 0) return ["- none"];
  return hubs.map((hub) => `- ${hub.file} degree=${hub.degree} inbound=${hub.inbound} outbound=${hub.outbound}`);
}

function formatList(items) {
  if (items.length === 0) return ["- none"];
  return items.map((item) => `- ${item}`);
}

function formatBrokenLinkLines(items) {
  if (items.length === 0) return ["- none"];
  return items.map((item) => `- ${item.from} -> [[${item.target}]]`);
}

function formatSimilarLines(items) {
  if (items.length === 0) return ["- none"];
  return items.map((item) => `- ${item.file} score=${item.score.toFixed(4)} title="${item.title}"`);
}

function firstMeaningfulLine(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "untitled";
}

function slugify(text) {
  return text
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "untitled";
}

function toTitle(text) {
  return text.replace(/[.#:()[\]`]/g, "").slice(0, 80);
}

function sourceBasename(source) {
  return path.basename(source, path.extname(source));
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function printUsage() {
  process.stderr.write([
    "Usage:",
    "  brain-archive archive <daily-note.md> --vault <vault> [--dry-run|--apply|--json]",
    "  brain-archive graph doctor --vault <vault> [--json]",
    "  brain-archive search similar <note.md> --vault <vault> [--limit <n>|--json]",
    ""
  ].join("\n"));
}

const isCli = fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
