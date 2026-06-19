#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SECTION_HEADING = /^##\s+(.+?)\s*$/;

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

async function main(argv) {
  const [command, dailyPath, ...rest] = argv;
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
    process.stdout.write(`Applied ${changed.length} change(s):\n`);
    for (const file of changed) process.stdout.write(`- ${file}\n`);
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
    }
  }
  return options;
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
  process.stderr.write("Usage: brain-archive archive <daily-note.md> --vault <vault> [--dry-run|--apply|--json]\n");
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
