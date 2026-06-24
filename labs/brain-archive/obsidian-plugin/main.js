const { ItemView, Notice, Plugin, PluginSettingTab, Setting } = require("obsidian");
const { existsSync } = require("fs");
const { mkdir, readFile, writeFile } = require("fs/promises");
const path = require("path");

const VIEW_TYPE = "brain-archive-dashboard";
const DEFAULT_SETTINGS = {
  dailyFolder: "daily",
  reportsFolder: "reports",
  defaultSimilarNote: "notes/frontend/react-query-invalidation.md",
  similarLimit: 3
};

module.exports = class BrainArchivePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    this.registerView(VIEW_TYPE, (leaf) => new BrainArchiveView(leaf, this));

    this.addRibbonIcon("archive", "Brain Archive", () => this.activateDashboard());

    this.addCommand({
      id: "open-dashboard",
      name: "Open dashboard",
      callback: () => this.activateDashboard()
    });

    this.addCommand({
      id: "bootstrap-vault",
      name: "Bootstrap vault folders and templates",
      callback: () => this.runAndNotice("Bootstrap", () => this.bootstrapVault())
    });

    this.addCommand({
      id: "archive-dry-run",
      name: "Archive dry-run for active daily note",
      callback: () => this.runAndNotice("Dry-run", () => this.archiveDryRun())
    });

    this.addCommand({
      id: "archive-apply",
      name: "Archive apply for active daily note",
      callback: () => this.runAndNotice("Apply", () => this.archiveApply())
    });

    this.addCommand({
      id: "graph-doctor",
      name: "Run graph doctor",
      callback: () => this.runAndNotice("Graph Doctor", () => this.graphDoctor())
    });

    this.addCommand({
      id: "similar-active-note",
      name: "Find similar notes for active note",
      callback: () => this.runAndNotice("Similar", () => this.similarForActiveNote())
    });

    this.addCommand({
      id: "write-archive-report",
      name: "Write archive report",
      callback: () => this.runAndNotice("Write Report", () => this.writeArchiveReport())
    });

    this.addSettingTab(new BrainArchiveSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async activateDashboard() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    const leaf = leaves[0] ?? this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async runAndNotice(label, task) {
    try {
      const result = await task();
      new Notice(`${label}: ${result.summary || "done"}`);
      await this.appendDashboardLog(label, result);
    } catch (error) {
      new Notice(`${label} failed: ${error.message}`);
      await this.appendDashboardLog(`${label} failed`, {
        ok: false,
        summary: error.message,
        output: error.stack || error.message
      });
    }
  }

  async appendDashboardLog(title, result) {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    const view = leaves[0]?.view;
    if (view?.appendRunLog) view.appendRunLog(title, result);
  }

  vaultRoot() {
    const adapter = this.app.vault.adapter;
    if (!adapter.basePath) {
      throw new Error("Brain Archive requires the desktop Obsidian file adapter.");
    }
    return adapter.basePath;
  }

  resolveVaultPath(value) {
    if (path.isAbsolute(value)) return path.normalize(value);
    return path.join(this.vaultRoot(), value);
  }

  relativeToVault(value) {
    const relative = path.relative(this.vaultRoot(), value);
    return relative && !relative.startsWith("..") ? normalizePath(relative) : value;
  }

  async brainArchiveModule() {
    const modulePath = this.internalModulePath();
    return require(modulePath);
  }

  pluginRoot() {
    const configDir = this.app.vault.configDir || ".obsidian";
    const pluginRoot = path.join(this.vaultRoot(), configDir, "plugins");
    const candidates = [
      this.manifest.dir,
      this.manifest.id,
      "brain-archive",
      "obsidian-plugin"
    ].filter(Boolean);

    for (const candidate of candidates) {
      const directory = path.join(pluginRoot, candidate);
      if (existsSync(path.join(directory, "brain-archive.cjs"))) return directory;
    }

    return path.join(pluginRoot, this.manifest.dir || this.manifest.id);
  }

  internalModulePath() {
    return path.join(this.pluginRoot(), "brain-archive.cjs");
  }

  activeMarkdownPath() {
    const file = this.app.workspace.getActiveFile();
    return file?.extension === "md" ? file.path : "";
  }

  currentDate() {
    return new Date().toLocaleDateString("en-CA");
  }

  dailyPath(date = this.currentDate()) {
    const active = this.activeMarkdownPath();
    if (active.startsWith(`${this.settings.dailyFolder}/`)) return active;
    return `${this.settings.dailyFolder}/${date}.md`;
  }

  dailyNoteOptions() {
    const dailyPrefix = `${this.settings.dailyFolder}/`;
    const archivedDailyPrefix = `archive/${this.settings.dailyFolder}/`;
    return this.app.vault.getMarkdownFiles()
      .filter((file) => file.path.startsWith(dailyPrefix) || file.path.startsWith(archivedDailyPrefix))
      .sort((left, right) => right.stat.mtime - left.stat.mtime)
      .map((file) => file.path);
  }

  markdownNoteOptions() {
    return this.app.vault.getMarkdownFiles()
      .filter((file) => !file.path.startsWith(`${this.settings.dailyFolder}/`))
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((file) => file.path);
  }

  reportPath(date = this.currentDate()) {
    return `${this.settings.reportsFolder}/${date}-archive.md`;
  }

  async archiveContext(dailyPath = this.dailyPath()) {
    const brainArchive = await this.brainArchiveModule();
    const vaultRoot = this.vaultRoot();
    const sourcePath = await this.resolveDailyPath(dailyPath);
    const markdown = await readFile(sourcePath, "utf8");
    const sections = brainArchive.parseDailyNote(markdown);
    const actions = brainArchive.planArchive({ sections, sourcePath, vaultRoot });
    return { brainArchive, actions, sourcePath, vaultRoot };
  }

  async resolveDailyPath(dailyPath) {
    const sourcePath = this.resolveVaultPath(dailyPath);
    try {
      await readFile(sourcePath, "utf8");
      return sourcePath;
    } catch {
      const relativePath = this.relativeToVault(sourcePath);
      const archivePath = relativePath.startsWith(`${this.settings.dailyFolder}/`)
        ? path.join(this.vaultRoot(), "archive", this.settings.dailyFolder, path.basename(sourcePath))
        : path.join(this.vaultRoot(), "archive", relativePath);
      await readFile(archivePath, "utf8");
      return archivePath;
    }
  }

  async bootstrapVault(date = this.currentDate()) {
    const vaultRoot = this.vaultRoot();
    const directories = [
      "inbox/manual-review",
      this.settings.dailyFolder,
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
      this.settings.reportsFolder,
      "templates",
      `archive/${this.settings.dailyFolder}`
    ];

    for (const directory of directories) {
      await mkdir(path.join(vaultRoot, directory), { recursive: true });
    }

    const writes = [];
    writes.push(await writeIfMissing(path.join(vaultRoot, "templates/daily.md"), dailyTemplate()));
    writes.push(await writeIfMissing(path.join(vaultRoot, "templates/note.md"), noteTemplate()));
    writes.push(await writeIfMissing(path.join(vaultRoot, this.dailyPath(date)), dailyNote(date)));

    const created = writes.filter(Boolean);
    return {
      ok: true,
      summary: `Bootstrap checked ${directories.length} folder(s), created ${created.length} file(s).`,
      output: [
        `Vault: ${vaultRoot}`,
        "",
        "Folders:",
        ...directories.map((directory) => `- ${directory}`),
        "",
        "Created files:",
        ...(created.length ? created.map((file) => `- ${this.relativeToVault(file)}`) : ["- none"])
      ].join("\n")
    };
  }

  async archiveDryRun(dailyPath = this.dailyPath()) {
    const context = await this.archiveContext(dailyPath);
    const output = await context.brainArchive.renderPlanDiff(context);
    const actions = context.actions.map((action) => {
      const targetPath = path.join(context.vaultRoot, action.target);
      return { ...action, mode: existsSync(targetPath) ? "append" : "create" };
    });
    return {
      ok: true,
      summary: `Planned ${actions.length} archive action(s).`,
      actions,
      output
    };
  }

  async archiveApply(dailyPath = this.dailyPath()) {
    const context = await this.archiveContext(dailyPath);
    const changed = await context.brainArchive.applyPlan(context);
    const archiveState = await context.brainArchive.markDailyNoteArchived({
      sourcePath: context.sourcePath,
      vaultRoot: context.vaultRoot
    });
    return {
      ok: true,
      summary: `Applied ${changed.length} change(s); daily note archived.`,
      changed,
      archiveState,
      output: [
        `Applied ${changed.length} change(s):`,
        ...changed.map((file) => `- ${file}`),
        `Daily note status: ${archiveState.archiveStatus} (${archiveState.archivedAt})`,
        `Daily note moved to: ${this.relativeToVault(archiveState.archivedPath)}`
      ].join("\n")
    };
  }

  async graphDoctor() {
    const brainArchive = await this.brainArchiveModule();
    const analysis = await brainArchive.analyzeVaultGraph(this.vaultRoot());
    return {
      ok: true,
      summary: `Graph checked: ${analysis.totalNotes} note(s), ${analysis.brokenLinks.length} broken link(s).`,
      analysis,
      output: brainArchive.renderGraphDoctorReport(analysis)
    };
  }

  async similarForActiveNote(notePath = this.activeMarkdownPath() || this.settings.defaultSimilarNote) {
    const brainArchive = await this.brainArchiveModule();
    const result = await brainArchive.findSimilarNotes({
      vaultRoot: this.vaultRoot(),
      queryPath: this.resolveVaultPath(notePath),
      limit: Number(this.settings.similarLimit || 3)
    });
    return {
      ok: true,
      summary: `Found ${result.candidates.length} similar candidate(s).`,
      result,
      output: brainArchive.renderSimilarNotesReport(result)
    };
  }

  async writeArchiveReport(date = this.currentDate(), dailyPath = this.dailyPath(date)) {
    const context = await this.archiveContext(dailyPath);
    const reportPath = this.resolveVaultPath(this.reportPath(date));
    await mkdir(path.dirname(reportPath), { recursive: true });

    const lines = [
      `# Archive Report: ${date}`,
      "",
      "## Input",
      "",
      `- ${this.relativeToVault(context.sourcePath)}`,
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
      summary: `Wrote report ${this.relativeToVault(reportPath)}.`,
      output: `Report written:\n- ${this.relativeToVault(reportPath)}`
    };
  }

  cliCommands(date = this.currentDate(), dailyPath = this.dailyPath(date), notePath = this.activeMarkdownPath() || this.settings.defaultSimilarNote) {
    const modulePath = this.internalModulePath();
    const daily = this.resolveVaultPath(dailyPath);
    const note = this.resolveVaultPath(notePath);
    const vault = this.vaultRoot();
    const limit = Number(this.settings.similarLimit || 3);
    return [
      `node ${quoteShell(modulePath)} archive ${quoteShell(daily)} --vault ${quoteShell(vault)} --dry-run`,
      `node ${quoteShell(modulePath)} archive ${quoteShell(daily)} --vault ${quoteShell(vault)} --apply`,
      `node ${quoteShell(modulePath)} graph doctor --vault ${quoteShell(vault)}`,
      `node ${quoteShell(modulePath)} search similar ${quoteShell(note)} --vault ${quoteShell(vault)} --limit ${limit}`
    ].join("\n");
  }
};

class BrainArchiveView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.latestActions = [];
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Brain Archive";
  }

  getIcon() {
    return "archive";
  }

  async onOpen() {
    this.render();
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("brain-archive-view");

    const header = container.createDiv({ cls: "brain-archive-header" });
    const titleWrap = header.createDiv();
    titleWrap.createEl("div", { cls: "brain-archive-eyebrow", text: "brain-archive" });
    titleWrap.createEl("h2", { text: "Archive Dashboard" });
    this.statusEl = header.createDiv({ cls: "brain-archive-status", text: "Ready" });

    this.sectionLabel(container, "Archive Target");
    const fields = container.createDiv({ cls: "brain-archive-fields" });
    this.dateInput = this.createField(fields, "Date", this.plugin.currentDate());
    this.dailySearch = this.createSearchField({
      parent: fields,
      label: "Daily Note",
      value: this.plugin.dailyPath(this.dateInput.value),
      options: () => this.plugin.dailyNoteOptions(),
      wide: true
    });
    this.dailyInput = this.dailySearch.input;

    this.dateInput.addEventListener("input", () => {
      this.dailyInput.value = this.plugin.dailyPath(this.dateInput.value.trim() || this.plugin.currentDate());
      this.renderCli();
      this.resetPlan();
    });
    this.dailyInput.addEventListener("input", () => {
      this.dailySearch.renderSuggestions(this.dailyInput.value);
      this.renderCli();
      this.resetPlan();
    });

    const workflow = container.createDiv({ cls: "brain-archive-workflow" });
    this.stepBadge = workflow.createDiv({ cls: "brain-archive-step", text: "STEP 1" });
    this.dryRunButton = workflow.createEl("button", {
      cls: "brain-archive-cta brain-archive-cta-secondary",
      text: "Dry-run"
    });
    this.dryRunButton.setAttribute("aria-label", "Preview archive actions without modifying files");
    this.dryRunButton.addEventListener("click", () => this.run("Dry-run", () => this.plugin.archiveDryRun(this.dailyInput.value)));

    this.applyButton = workflow.createEl("button", {
      cls: "brain-archive-cta brain-archive-cta-primary",
      text: "Apply"
    });
    this.applyButton.disabled = true;
    this.applyButton.setAttribute("aria-label", "Apply archive — cannot be undone");
    this.applyButton.title = "Run Dry-run first to enable Apply.";
    this.applyButton.addEventListener("click", () => this.run("Apply", () => this.plugin.archiveApply(this.dailyInput.value)));

    this.sectionLabel(container, "Review Actions");
    this.reviewPanel = container.createDiv({ cls: "brain-archive-review" });
    this.reviewSummaryEl = this.reviewPanel.createDiv({ cls: "brain-archive-review-summary" });
    this.actionsEl = this.reviewPanel.createDiv({ cls: "brain-archive-actions" });
    this.applyHintEl = this.reviewPanel.createDiv({ cls: "brain-archive-apply-hint" });

    this.rawOutputDetails = this.createCollapsible(container, "Raw Output");
    const outputBody = this.rawOutputDetails.body;
    const copyOutput = outputBody.createEl("button", { cls: "brain-archive-ghost brain-archive-inline-copy", text: "Copy" });
    copyOutput.addEventListener("click", () => navigator.clipboard.writeText(this.outputEl.textContent || ""));
    this.outputEl = outputBody.createEl("pre", { text: "" });

    this.utilitiesDetails = this.createCollapsible(container, "Utilities");
    const utilsBody = this.utilitiesDetails.body;
    this.noteSearch = this.createSearchField({
      parent: utilsBody,
      label: "Similar Note",
      value: this.plugin.activeMarkdownPath() || this.plugin.settings.defaultSimilarNote,
      options: () => this.plugin.markdownNoteOptions(),
      wide: true
    });
    this.noteInput = this.noteSearch.input;
    this.noteInput.addEventListener("input", () => {
      this.noteSearch.renderSuggestions(this.noteInput.value);
      this.renderCli();
    });

    const utilsToolbar = utilsBody.createDiv({ cls: "brain-archive-utils-toolbar" });
    this.addButton(utilsToolbar, "Graph Doctor", () => this.run("Graph Doctor", () => this.plugin.graphDoctor()));
    this.addButton(utilsToolbar, "Similar", () => this.run("Similar", () => this.plugin.similarForActiveNote(this.noteInput.value)));
    this.addButton(utilsToolbar, "Write Report", () => this.run("Write Report", () => this.plugin.writeArchiveReport(this.dateInput.value, this.dailyInput.value)));
    this.addButton(utilsToolbar, "Bootstrap", () => this.run("Bootstrap", () => this.plugin.bootstrapVault(this.dateInput.value)));

    this.historyDetails = this.createCollapsible(container, "History");
    const historyBody = this.historyDetails.body;
    this.historyRecentEl = historyBody.createDiv({ cls: "brain-archive-history-recent", text: "No recent activity." });
    const historyHead = historyBody.createDiv({ cls: "brain-archive-history-head" });
    historyHead.createSpan({ cls: "brain-archive-subtle", text: "Run log" });
    const clearLogButton = historyHead.createEl("button", { cls: "brain-archive-ghost", text: "Clear" });
    this.logEl = historyBody.createEl("ol", { cls: "brain-archive-log" });
    clearLogButton.addEventListener("click", () => this.logEl.empty());

    this.advancedDetails = this.createCollapsible(container, "Advanced");
    const advancedBody = this.advancedDetails.body;
    advancedBody.createDiv({ cls: "brain-archive-subtle", text: "Equivalent CLI commands" });
    const cliCopy = advancedBody.createEl("button", { cls: "brain-archive-ghost brain-archive-inline-copy", text: "Copy" });
    cliCopy.addEventListener("click", () => navigator.clipboard.writeText(this.cliEl.textContent || ""));
    this.cliEl = advancedBody.createEl("pre", { cls: "brain-archive-cli" });
    this.renderCli();

    this.resetPlan();
  }

  sectionLabel(parent, text) {
    return parent.createDiv({ cls: "brain-archive-section-label", text });
  }

  createCollapsible(parent, label) {
    const details = parent.createEl("details", { cls: "brain-archive-collapsible" });
    const summary = details.createEl("summary", { cls: "brain-archive-collapsible-summary" });
    summary.createSpan({ text: label });
    const body = details.createDiv({ cls: "brain-archive-collapsible-body" });
    return { details, summary, body };
  }

  resetPlan() {
    this.latestActions = [];
    if (this.applyButton) {
      this.applyButton.disabled = true;
      this.applyButton.title = "Run Dry-run first to enable Apply.";
      this.applyButton.classList.remove("is-ready");
    }
    if (this.stepBadge) this.stepBadge.setText("STEP 1");
    if (this.statusEl) {
      this.statusEl.setText("Ready");
      this.statusEl.removeClass("is-busy");
    }
    this.renderEmptyReview();
  }

  renderEmptyReview() {
    if (!this.reviewSummaryEl) return;
    this.reviewSummaryEl.empty();
    this.reviewSummaryEl.addClass("brain-archive-empty");
    this.reviewSummaryEl.setText("No archive preview yet");

    this.actionsEl.empty();
    this.actionsEl.addClass("brain-archive-empty");
    const intro = this.actionsEl.createDiv();
    intro.setText("Select a Daily Note and run Dry-run. Brain Archive will:");
    const list = this.actionsEl.createEl("ul", { cls: "brain-archive-empty-list" });
    ["extract projects", "capture decisions", "create questions", "link notes"].forEach((item) => {
      list.createEl("li", { text: item });
    });

    this.applyHintEl.empty();
    this.applyHintEl.setText("No files are modified until Apply.");
  }

  createField(parent, label, value, wide = false) {
    const wrapper = parent.createDiv({ cls: wide ? "brain-archive-field is-wide" : "brain-archive-field" });
    wrapper.createEl("label", { text: label });
    const input = wrapper.createEl("input", { value });
    input.spellcheck = false;
    return input;
  }

  createSearchField({ parent, label, value, options, wide = false }) {
    const wrapper = parent.createDiv({ cls: wide ? "brain-archive-field brain-archive-search is-wide" : "brain-archive-field brain-archive-search" });
    wrapper.createEl("label", { text: label });

    const row = wrapper.createDiv({ cls: "brain-archive-search-row" });
    const input = row.createEl("input", { value });
    input.spellcheck = false;
    const listButton = row.createEl("button", { cls: "brain-archive-list-button", text: "List" });
    const suggestions = wrapper.createDiv({ cls: "brain-archive-suggestions" });

    const control = {
      input,
      renderSuggestions: (query = input.value) => {
        const matches = fuzzyOptions(options(), query).slice(0, 12);
        suggestions.empty();
        suggestions.classList.toggle("is-open", matches.length > 0);
        for (const item of matches) {
          const button = suggestions.createEl("button", { cls: "brain-archive-suggestion" });
          button.createSpan({ text: item.value });
          if (item.detail) button.createSpan({ cls: "brain-archive-suggestion-detail", text: item.detail });
          button.addEventListener("mousedown", (event) => {
            event.preventDefault();
            input.value = item.value;
            suggestions.removeClass("is-open");
            this.renderCli();
          });
        }
      },
      close: () => suggestions.classList.remove("is-open")
    };

    input.addEventListener("focus", () => control.renderSuggestions(input.value));
    listButton.addEventListener("click", () => {
      if (suggestions.classList.contains("is-open")) {
        control.close();
      } else {
        control.renderSuggestions("");
      }
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") control.close();
    });
    input.addEventListener("blur", () => {
      window.setTimeout(() => control.close(), 120);
    });

    return control;
  }

  addButton(parent, label, callback) {
    const button = parent.createEl("button", { text: label });
    button.addEventListener("click", callback);
    return button;
  }

  panel(parent, title) {
    const panel = parent.createDiv({ cls: "brain-archive-panel" });
    const heading = panel.createDiv({ cls: "brain-archive-panel-heading" });
    heading.createEl("h3", { text: title });
    const body = panel.createDiv({ cls: "brain-archive-panel-body" });
    return { panel, heading, body };
  }

  async run(label, task) {
    this.setBusy(label);
    try {
      const result = await task();
      this.renderResult(label, result);
      new Notice(`${label}: ${result.summary || "done"}`);
    } catch (error) {
      const result = {
        ok: false,
        summary: error.message,
        output: error.stack || error.message
      };
      this.renderResult(`${label} failed`, result);
      new Notice(`${label} failed: ${error.message}`);
    } finally {
      this.setIdle();
    }
  }

  renderResult(label, result) {
    this.outputEl.setText(result.output || result.summary || "Done");
    if (label === "Dry-run" && result.actions) {
      this.renderDryRunReview(result.actions);
    } else if (label === "Apply" && result.ok) {
      this.markApplied(result);
    }
    if (label !== "Dry-run" && label !== "Apply") {
      this.rawOutputDetails.details.open = true;
    }
    this.appendRunLog(label, result);
    this.renderCli();
  }

  renderDryRunReview(actions) {
    this.latestActions = actions;
    const count = actions.length;
    const createCount = actions.filter((action) => action.mode === "create").length;
    const updateCount = count - createCount;

    if (this.stepBadge) this.stepBadge.setText("STEP 2");
    if (this.applyButton) {
      this.applyButton.disabled = count === 0;
      this.applyButton.title = count === 0
        ? "No actions to apply."
        : `This action will:\n• create ${createCount} file${createCount === 1 ? "" : "s"}\n• update ${updateCount} file${updateCount === 1 ? "" : "s"}\n• move Daily Note\n\nThis action cannot be undone.`;
      this.applyButton.classList.toggle("is-ready", count > 0);
      this.applyButton.setText(count > 0 ? "Apply Archive" : "Apply");
    }

    this.reviewSummaryEl.empty();
    this.reviewSummaryEl.removeClass("brain-archive-empty");
    this.reviewSummaryEl.createEl("strong", { text: `${count} change${count === 1 ? "" : "s"} ready` });

    this.actionsEl.empty();
    this.actionsEl.removeClass("brain-archive-empty");
    for (const action of actions) {
      this.actionsEl.appendChild(this.buildActionRow(action));
    }

    this.applyHintEl.empty();
    if (count === 0) {
      this.applyHintEl.setText("Nothing to archive. Daily Note has no recognized sections.");
      return;
    }
    this.applyHintEl.createDiv({ text: "Applying will:" });
    const list = this.applyHintEl.createEl("ul");
    list.createEl("li", { text: `create ${createCount} file${createCount === 1 ? "" : "s"}` });
    list.createEl("li", { text: `update ${updateCount} file${updateCount === 1 ? "" : "s"}` });
    list.createEl("li", { text: "move Daily Note to archive" });
  }

  buildActionRow(action) {
    const row = document.createElement("div");
    row.className = "brain-archive-action-row";
    row.dataset.mode = action.mode || "create";

    const head = document.createElement("div");
    head.className = "brain-archive-action-head";
    const glyph = document.createElement("span");
    glyph.className = "brain-archive-action-glyph";
    glyph.textContent = action.mode === "append" ? "~" : "+";
    head.appendChild(glyph);

    const target = document.createElement("span");
    target.className = "brain-archive-action-target";
    target.textContent = action.target;
    head.appendChild(target);

    row.appendChild(head);

    const meta = document.createElement("div");
    meta.className = "brain-archive-action-meta";

    const modeLabel = document.createElement("span");
    modeLabel.className = "brain-archive-action-kind";
    modeLabel.textContent = `${action.mode === "append" ? "Append" : "Create"} ${formatKind(action.kind)}`;
    meta.appendChild(modeLabel);

    const confidence = document.createElement("span");
    confidence.className = "brain-archive-action-confidence";
    confidence.textContent = `Confidence ${formatConfidence(action.confidence)}`;
    confidence.title = "How confident the archive engine is about this classification.";
    meta.appendChild(confidence);

    const risk = document.createElement("span");
    risk.className = `brain-archive-action-risk is-${action.risk}`;
    risk.textContent = `Risk ${action.risk}`;
    risk.title = "How likely this action modifies existing content.";
    meta.appendChild(risk);

    row.appendChild(meta);

    if (action.sourceHeading) {
      const subtle = document.createElement("div");
      subtle.className = "brain-archive-subtle";
      subtle.textContent = `${action.sourceHeading} → ${action.title}`;
      row.appendChild(subtle);
    }

    return row;
  }

  markApplied(result) {
    if (this.stepBadge) this.stepBadge.setText("DONE");
    if (this.applyButton) {
      this.applyButton.disabled = true;
      this.applyButton.classList.remove("is-ready");
      this.applyButton.setText("Applied");
    }
    if (this.reviewSummaryEl) {
      this.reviewSummaryEl.empty();
      this.reviewSummaryEl.createEl("strong", {
        text: `Applied ${(result.changed || []).length} change${(result.changed || []).length === 1 ? "" : "s"}`
      });
    }
    if (this.applyHintEl) {
      this.applyHintEl.empty();
      const archivedAt = result.archiveState?.archivedAt;
      if (archivedAt) {
        this.applyHintEl.setText(`Daily Note archived at ${archivedAt}.`);
      }
    }
    if (this.historyRecentEl) {
      this.historyRecentEl.empty();
      this.historyRecentEl.createDiv({ cls: "brain-archive-subtle", text: "Last archive" });
      this.historyRecentEl.createDiv({ text: `Today ${new Date().toLocaleTimeString()}` });
      this.historyRecentEl.createDiv({
        text: `${(result.changed || []).length} action${(result.changed || []).length === 1 ? "" : "s"} applied`
      });
    }
  }

  appendRunLog(label, result) {
    if (!this.logEl) return;
    const item = this.logEl.createEl("li");
    item.createDiv({ cls: "brain-archive-subtle", text: new Date().toLocaleTimeString() });
    item.createEl("strong", { text: label });
    item.createDiv({ text: result.summary || "Done" });
    item.createEl("pre", { text: result.output || JSON.stringify(result, null, 2) });
    this.logEl.prepend(item);
  }

  renderCli() {
    if (!this.cliEl) return;
    this.cliEl.setText(this.plugin.cliCommands(this.dateInput.value, this.dailyInput.value, this.noteInput.value));
  }

  setBusy(label) {
    this.statusEl.setText(`Running ${label}`);
    this.statusEl.addClass("is-busy");
    this.containerEl.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
  }

  setIdle() {
    this.statusEl.setText("Ready");
    this.statusEl.removeClass("is-busy");
    this.containerEl.querySelectorAll("button").forEach((button) => {
      if (button === this.applyButton) return;
      button.disabled = false;
    });
    if (this.applyButton) {
      const ready = this.applyButton.classList.contains("is-ready");
      this.applyButton.disabled = !ready;
    }
  }
}

function formatKind(kind) {
  switch (kind) {
    case "create_decision_note": return "Decision";
    case "create_project_note": return "Project";
    case "create_question_note": return "Question";
    case "create_meeting_note": return "Meeting";
    case "create_note": return "Note";
    default: return String(kind || "Note").replace(/^create_/, "").replace(/_/g, " ");
  }
}

function formatConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (number <= 1) return `${Math.round(number * 100)}%`;
  return `${Math.round(number)}%`;
}

class BrainArchiveSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Brain Archive" });

    containerEl.createEl("p", {
      text: `Core module: ${this.plugin.internalModulePath()}`
    });

    new Setting(containerEl)
      .setName("Daily folder")
      .addText((text) => text
        .setValue(this.plugin.settings.dailyFolder)
        .onChange(async (value) => {
          this.plugin.settings.dailyFolder = value.trim() || DEFAULT_SETTINGS.dailyFolder;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Reports folder")
      .addText((text) => text
        .setValue(this.plugin.settings.reportsFolder)
        .onChange(async (value) => {
          this.plugin.settings.reportsFolder = value.trim() || DEFAULT_SETTINGS.reportsFolder;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Default similar note")
      .addText((text) => text
        .setValue(this.plugin.settings.defaultSimilarNote)
        .onChange(async (value) => {
          this.plugin.settings.defaultSimilarNote = value.trim() || DEFAULT_SETTINGS.defaultSimilarNote;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Similar search limit")
      .addText((text) => text
        .setValue(String(this.plugin.settings.similarLimit))
        .onChange(async (value) => {
          this.plugin.settings.similarLimit = Number(value) || DEFAULT_SETTINGS.similarLimit;
          await this.plugin.saveSettings();
        }));
  }
}

async function writeIfMissing(filePath, content) {
  try {
    await readFile(filePath, "utf8");
    return "";
  } catch {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
    return filePath;
  }
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


## Learn


## Project


## Question


## Decision


## Meeting


## Reference

`;
}

function fuzzyOptions(values, query) {
  const normalizedQuery = normalizeSearch(query);
  return values
    .map((value) => ({
      value,
      detail: path.basename(value),
      score: fuzzyScore(value, normalizedQuery)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.value.length - right.value.length;
    });
}

function fuzzyScore(value, normalizedQuery) {
  if (!normalizedQuery) return 1;

  const normalizedValue = normalizeSearch(value);
  if (normalizedValue === normalizedQuery) return 1000;
  if (normalizedValue.includes(normalizedQuery)) {
    return 800 - normalizedValue.indexOf(normalizedQuery);
  }

  let score = 0;
  let queryIndex = 0;
  let lastMatchIndex = -1;
  for (let index = 0; index < normalizedValue.length && queryIndex < normalizedQuery.length; index += 1) {
    if (normalizedValue[index] !== normalizedQuery[queryIndex]) continue;
    score += lastMatchIndex === index - 1 ? 12 : 6;
    lastMatchIndex = index;
    queryIndex += 1;
  }

  return queryIndex === normalizedQuery.length ? score : 0;
}

function normalizeSearch(value) {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

function quoteShell(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}
