import assert from "node:assert/strict";
import { mkdtemp, cp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  analyzeVaultGraph,
  applyPlan,
  parseDailyNote,
  planArchive,
  renderGraphDoctorReport,
  renderPlanDiff
} from "../src/brain-archive.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const labRoot = path.resolve(testDir, "..");
const fixtureVault = path.join(labRoot, "fixtures/vault");

test("parses H2 daily-note sections", async () => {
  const markdown = await readFile(path.join(fixtureVault, "daily/2026-06-19.md"), "utf8");
  const sections = parseDailyNote(markdown);

  assert.equal(sections.length, 3);
  assert.deepEqual(sections.map((section) => section.heading), ["Insight", "Project", "Question"]);
});

test("plans archive actions from daily-note sections", async () => {
  const sourcePath = path.join(fixtureVault, "daily/2026-06-19.md");
  const markdown = await readFile(sourcePath, "utf8");
  const sections = parseDailyNote(markdown);
  const actions = planArchive({ sections, sourcePath, vaultRoot: fixtureVault });

  assert.equal(actions.length, 3);
  assert.equal(actions[0].target, "notes/frontend/react-query-invalidation.md");
  assert.equal(actions[1].target, "projects/search-api.md");
  assert.equal(actions[2].target, "questions/rsc-cache-scope.md");
});

test("renders dry-run diff without mutating files", async () => {
  const sourcePath = path.join(fixtureVault, "daily/2026-06-19.md");
  const markdown = await readFile(sourcePath, "utf8");
  const actions = planArchive({
    sections: parseDailyNote(markdown),
    sourcePath,
    vaultRoot: fixtureVault
  });

  const diff = await renderPlanDiff({ actions, vaultRoot: fixtureVault });

  assert.match(diff, /new file mode 100644/);
  assert.match(diff, /notes\/frontend\/react-query-invalidation\.md/);
  assert.match(diff, /projects\/search-api\.md/);
});

test("applies planned changes to a vault copy", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "brain-archive-"));
  const vaultRoot = path.join(tempRoot, "vault");
  await cp(fixtureVault, vaultRoot, { recursive: true });

  try {
    const sourcePath = path.join(vaultRoot, "daily/2026-06-19.md");
    const markdown = await readFile(sourcePath, "utf8");
    const actions = planArchive({
      sections: parseDailyNote(markdown),
      sourcePath,
      vaultRoot
    });

    const changed = await applyPlan({ actions, vaultRoot });

    assert.deepEqual(changed, [
      "notes/frontend/react-query-invalidation.md",
      "projects/search-api.md",
      "questions/rsc-cache-scope.md"
    ]);

    const question = await readFile(path.join(vaultRoot, "questions/rsc-cache-scope.md"), "utf8");
    assert.match(question, /# RSC Cache Scope/);
    assert.match(question, /Server Component/);

    const project = await readFile(path.join(vaultRoot, "projects/search-api.md"), "utf8");
    assert.match(project, /Redis miss/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("analyzes vault graph health", async () => {
  const analysis = await analyzeVaultGraph(fixtureVault);

  assert.equal(analysis.totalNotes, 6);
  assert.equal(analysis.totalEdges, 4);
  assert.deepEqual(analysis.orphanNotes, ["notes/orphan.md"]);
  assert.deepEqual(analysis.brokenLinks, [
    { from: "notes/frontend/cache-invalidation.md", target: "Missing Cache Note" }
  ]);
  assert.equal(analysis.hubs[0].file, "notes/frontend/react-query.md");
});

test("renders graph doctor report", async () => {
  const analysis = await analyzeVaultGraph(fixtureVault);
  const report = renderGraphDoctorReport(analysis);

  assert.match(report, /Graph Doctor/);
  assert.match(report, /Total notes: 6/);
  assert.match(report, /Broken links: 1/);
  assert.match(report, /notes\/orphan\.md/);
});
