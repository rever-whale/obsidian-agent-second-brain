import assert from "node:assert/strict";
import { mkdtemp, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
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

test("splits H3 topics under a daily-note section into separate actions", () => {
  const markdown = `---
type: daily
date: 2026-06-22
archive_status: pending
---

# 2026-06-22

## Question

### MSA Aggregate 역할 수행

- 현재 파트너센터 서비스 중, crux gateway api 이외에 다른 api 서버를 호출하는 케이스가 있는가?

### 비즈스페이스

- 기존 에러 fallback url이 /profiles였는데, /dashboard로 가야할까?
`;

  const sections = parseDailyNote(markdown);
  const actions = planArchive({
    sections,
    sourcePath: path.join(fixtureVault, "daily/2026-06-22.md"),
    vaultRoot: fixtureVault
  });

  assert.equal(sections.length, 2);
  assert.deepEqual(sections.map((section) => section.topic), ["MSA Aggregate 역할 수행", "비즈스페이스"]);
  assert.deepEqual(actions.map((action) => action.target), [
    "questions/msa-aggregate-역할-수행.md",
    "questions/비즈스페이스.md"
  ]);
  assert.deepEqual(actions.map((action) => action.title), ["MSA Aggregate 역할 수행", "비즈스페이스"]);
  assert.ok(!actions[0].text.includes("비즈스페이스"));
});

test("splits decision topics into separate decision notes", () => {
  const markdown = `# 2026-06-22

## Decision

### 비즈스페이스 > 내 비즈니스 전체 목록

- fallback url은 /dashboard로 보낸다.

### MSA Aggregate 역할 수행

- crux gateway api 우선 호출을 기본 룰로 둔다.
`;

  const sections = parseDailyNote(markdown);
  const actions = planArchive({
    sections,
    sourcePath: path.join(fixtureVault, "daily/2026-06-22.md"),
    vaultRoot: fixtureVault
  });

  assert.equal(sections.length, 2);
  assert.deepEqual(actions.map((action) => action.kind), ["append_decision", "append_decision"]);
  assert.deepEqual(actions.map((action) => action.target), [
    "decisions/비즈스페이스/내-비즈니스-전체-목록.md",
    "decisions/msa-aggregate-역할-수행.md"
  ]);
  assert.equal(actions[0].relatedProject, "비즈스페이스");
  assert.equal(actions[1].relatedProject, "");
  assert.deepEqual(actions[0].projectHierarchy, [
    { label: "비즈스페이스", path: "projects/비즈스페이스/index.md" }
  ]);
  assert.ok(!actions[0].text.includes("crux gateway"));
});

test("renders decision notes with project links when topic contains a project context", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "brain-archive-"));
  const vaultRoot = path.join(tempRoot, "vault");
  await cp(fixtureVault, vaultRoot, { recursive: true });

  try {
    const sourcePath = path.join(vaultRoot, "daily/2026-06-22.md");
    const markdown = `# 2026-06-22

## Decision

### 비즈스페이스 > 내 비즈니스 전체 목록

- fallback url은 /dashboard로 보낸다.
`;
    const actions = planArchive({
      sections: parseDailyNote(markdown),
      sourcePath,
      vaultRoot
    });

    await applyPlan({ actions, vaultRoot });
    const decision = await readFile(
      path.join(vaultRoot, "decisions/비즈스페이스/내-비즈니스-전체-목록.md"),
      "utf8"
    );

    const projectIndex = await readFile(path.join(vaultRoot, "projects/비즈스페이스/index.md"), "utf8");

    assert.match(decision, /project:\n  - "\[\[projects\/비즈스페이스\/index\|비즈스페이스\]\]"/);
    assert.match(decision, /project_hierarchy:\n  - "\[\[projects\/비즈스페이스\/index\|비즈스페이스\]\]"/);
    assert.doesNotMatch(decision, /parent:/);
    assert.match(decision, /Project: \[\[projects\/비즈스페이스\/index\|비즈스페이스\]\]/);
    assert.match(decision, /Project Hierarchy: \[\[projects\/비즈스페이스\/index\|비즈스페이스\]\]/);
    assert.match(projectIndex, /# 비즈스페이스/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("uses greater-than topic segments as nested target folders", () => {
  const markdown = `# 2026-06-22

## Decision

### 위자드 > MW

- MW 플로우를 위자드 하위 정책으로 둔다.
`;

  const actions = planArchive({
    sections: parseDailyNote(markdown),
    sourcePath: path.join(fixtureVault, "daily/2026-06-22.md"),
    vaultRoot: fixtureVault
  });

  assert.equal(actions[0].target, "decisions/위자드/mw.md");
  assert.equal(actions[0].relatedProject, "위자드");
  assert.deepEqual(actions[0].projectHierarchy, [
    { label: "위자드", path: "projects/위자드/index.md" }
  ]);
});

test("renders hierarchy links for nested topic paths", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "brain-archive-"));
  const vaultRoot = path.join(tempRoot, "vault");
  await cp(fixtureVault, vaultRoot, { recursive: true });

  try {
    const sourcePath = path.join(vaultRoot, "daily/2026-06-22.md");
    const markdown = `# 2026-06-22

## Decision

### 위자드 > MW > sample

- sample 정책은 MW 하위에서 관리한다.
`;
    const actions = planArchive({
      sections: parseDailyNote(markdown),
      sourcePath,
      vaultRoot
    });

    await applyPlan({ actions, vaultRoot });
    const decision = await readFile(path.join(vaultRoot, "decisions/위자드/mw/sample.md"), "utf8");
    const wizardIndex = await readFile(path.join(vaultRoot, "projects/위자드/index.md"), "utf8");
    const mwIndex = await readFile(path.join(vaultRoot, "projects/위자드/mw/index.md"), "utf8");

    assert.doesNotMatch(decision, /parent:/);
    assert.match(decision, /project_hierarchy:\n  - "\[\[projects\/위자드\/index\|위자드\]\]"\n  - "\[\[projects\/위자드\/mw\/index\|MW\]\]"/);
    assert.match(decision, /Project Hierarchy: \[\[projects\/위자드\/index\|위자드\]\] > \[\[projects\/위자드\/mw\/index\|MW\]\]/);
    assert.match(wizardIndex, /# 위자드/);
    assert.match(mwIndex, /# MW/);
    assert.match(mwIndex, /Hierarchy: \[\[projects\/위자드\/index\|위자드\]\] > \[\[projects\/위자드\/mw\/index\|MW\]\]/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("uses linked project headings as optional autocomplete hints", () => {
  const markdown = `# 2026-06-22

## Decision

### [[projects/위자드/mw/index|MW]] > fallback 정책

- fallback은 MW 하위 정책으로 관리한다.
`;

  const actions = planArchive({
    sections: parseDailyNote(markdown),
    sourcePath: path.join(fixtureVault, "daily/2026-06-22.md"),
    vaultRoot: fixtureVault
  });

  assert.equal(actions[0].target, "decisions/위자드/mw/fallback-정책.md");
  assert.equal(actions[0].relatedProject, "위자드");
  assert.equal(actions[0].title, "위자드 > MW > fallback 정책");
  assert.deepEqual(actions[0].projectHierarchy, [
    { label: "위자드", path: "projects/위자드/index.md" },
    { label: "MW", path: "projects/위자드/mw/index.md" }
  ]);
});

test("extends an existing linked project hierarchy from daily text", () => {
  const markdown = `# 2026-06-22

## Decision

### [[projects/위자드/index|위자드]] > MW > fallback 정책

- fallback은 MW 하위 정책으로 관리한다.
`;

  const actions = planArchive({
    sections: parseDailyNote(markdown),
    sourcePath: path.join(fixtureVault, "daily/2026-06-22.md"),
    vaultRoot: fixtureVault
  });

  assert.equal(actions[0].target, "decisions/위자드/mw/fallback-정책.md");
  assert.deepEqual(actions[0].projectHierarchy, [
    { label: "위자드", path: "projects/위자드/index.md" },
    { label: "MW", path: "projects/위자드/mw/index.md" }
  ]);
});

test("uses linked project headings for project index notes", () => {
  const markdown = `# 2026-06-22

## Project

### [[projects/위자드/index|위자드]] > MW

- MW 하위 프로젝트를 시작한다.
`;

  const actions = planArchive({
    sections: parseDailyNote(markdown),
    sourcePath: path.join(fixtureVault, "daily/2026-06-22.md"),
    vaultRoot: fixtureVault
  });

  assert.equal(actions[0].target, "projects/위자드/mw/index.md");
  assert.deepEqual(actions[0].projectHierarchy, [
    { label: "위자드", path: "projects/위자드/index.md" },
    { label: "MW", path: "projects/위자드/mw/index.md" }
  ]);
});

test("routes unknown headings to manual review inbox", () => {
  const markdown = `# 2026-06-22

## Random Memo

분류가 애매한 메모.
`;

  const actions = planArchive({
    sections: parseDailyNote(markdown),
    sourcePath: path.join(fixtureVault, "daily/2026-06-22.md"),
    vaultRoot: fixtureVault
  });

  assert.equal(actions[0].kind, "manual_review");
  assert.equal(actions[0].target, "inbox/manual-review/분류가-애매한-메모.md");
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
    assert.doesNotMatch(question, /Review Queue/);

    const project = await readFile(path.join(vaultRoot, "projects/search-api.md"), "utf8");
    assert.match(project, /Redis miss/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("does not duplicate an already applied daily-note action", async () => {
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

    const firstChanged = await applyPlan({ actions, vaultRoot });
    const secondChanged = await applyPlan({ actions, vaultRoot });
    const question = await readFile(path.join(vaultRoot, "questions/rsc-cache-scope.md"), "utf8");

    assert.equal(firstChanged.length, 3);
    assert.equal(secondChanged.length, 0);
    assert.equal([...question.matchAll(/Server Component/g)].length, 1);
    assert.doesNotMatch(question, /brain-archive:/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("marks daily note archived after apply", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "brain-archive-"));
  const vaultRoot = path.join(tempRoot, "vault");
  await cp(fixtureVault, vaultRoot, { recursive: true });

  try {
    const sourcePath = path.join(vaultRoot, "daily/2026-06-19.md");
    const state = await markDailyNoteArchived({
      sourcePath,
      vaultRoot,
      archivedAt: new Date("2026-06-22T00:00:00.000Z")
    });
    const archivedPath = path.join(vaultRoot, "archive/daily/2026-06-19.md");
    const markdown = await readFile(archivedPath, "utf8");
    let originalExists = true;
    try {
      await readFile(sourcePath, "utf8");
    } catch {
      originalExists = false;
    }

    assert.equal(state.archiveStatus, "archived");
    assert.equal(state.archivedAt, "2026-06-22");
    assert.equal(state.archivedPath, archivedPath);
    assert.equal(originalExists, false);
    assert.match(markdown, /archive_status: archived/);
    assert.match(markdown, /archived_at: 2026-06-22/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("does not overwrite an existing archived daily note", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "brain-archive-"));
  const vaultRoot = path.join(tempRoot, "vault");
  await cp(fixtureVault, vaultRoot, { recursive: true });

  try {
    const sourcePath = path.join(vaultRoot, "daily/2026-06-19.md");
    const existingArchivedPath = path.join(vaultRoot, "archive/daily/2026-06-19.md");
    await mkdir(path.dirname(existingArchivedPath), { recursive: true });
    await writeFile(existingArchivedPath, "# Existing archived daily\n", "utf8");

    const state = await markDailyNoteArchived({
      sourcePath,
      vaultRoot,
      archivedAt: new Date("2026-06-22T00:00:00.000Z")
    });

    const preserved = await readFile(existingArchivedPath, "utf8");
    const moved = await readFile(path.join(vaultRoot, "archive/daily/2026-06-19-2.md"), "utf8");

    assert.equal(state.archivedPath, path.join(vaultRoot, "archive/daily/2026-06-19-2.md"));
    assert.equal(preserved, "# Existing archived daily\n");
    assert.match(moved, /archive_status: archived/);
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

test("finds similar notes with lexical vectors", async () => {
  const result = await findSimilarNotes({
    vaultRoot: fixtureVault,
    queryPath: path.join(fixtureVault, "notes/frontend/react-query.md"),
    limit: 2
  });

  assert.equal(result.query, "notes/frontend/react-query.md");
  assert.deepEqual(result.candidates.map((candidate) => candidate.file), [
    "notes/frontend/server-state.md",
    "notes/frontend/cache-invalidation.md"
  ]);
  assert.ok(result.candidates[0].score > result.candidates[1].score);
});

test("renders similar note report", async () => {
  const result = await findSimilarNotes({
    vaultRoot: fixtureVault,
    queryPath: path.join(fixtureVault, "notes/frontend/react-query.md"),
    limit: 1
  });
  const report = renderSimilarNotesReport(result);

  assert.match(report, /Similar Notes/);
  assert.match(report, /Query: notes\/frontend\/react-query\.md/);
  assert.match(report, /notes\/frontend\/server-state\.md/);
});
