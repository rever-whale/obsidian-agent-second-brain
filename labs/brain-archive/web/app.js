const state = {
  latestActions: []
};

const els = {
  vault: document.querySelector("#vault"),
  date: document.querySelector("#date"),
  daily: document.querySelector("#daily"),
  note: document.querySelector("#note"),
  output: document.querySelector("#output"),
  actions: document.querySelector("#actions"),
  actionCount: document.querySelector("#action-count"),
  status: document.querySelector("#status"),
  log: document.querySelector("#log"),
  copyOutput: document.querySelector("#copy-output"),
  clearLog: document.querySelector("#clear-log")
};

const routes = {
  bootstrap: {
    label: "Bootstrap",
    path: "/api/bootstrap",
    success(result) {
      syncPaths();
      renderActions([]);
      return result.output;
    }
  },
  dryRun: {
    label: "Dry-run",
    path: "/api/archive/dry-run",
    success(result) {
      renderActions(result.actions || []);
      return result.output;
    }
  },
  apply: {
    label: "Apply",
    path: "/api/archive/apply",
    success(result) {
      return result.output;
    }
  },
  graph: {
    label: "Graph Doctor",
    path: "/api/graph",
    success(result) {
      return result.output;
    }
  },
  similar: {
    label: "Similar Search",
    path: "/api/similar",
    success(result) {
      return result.output;
    }
  },
  report: {
    label: "Write Report",
    path: "/api/report",
    success(result) {
      return result.output;
    }
  }
};

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => runAction(button.dataset.action));
});

els.vault.addEventListener("input", syncPaths);
els.date.addEventListener("input", syncPaths);
els.copyOutput.addEventListener("click", copyOutput);
els.clearLog.addEventListener("click", () => {
  els.log.replaceChildren();
});

function syncPaths() {
  const vault = els.vault.value.trim() || "sandbox-vault";
  const date = els.date.value.trim() || "2026-06-22";
  els.daily.value = `${vault}/daily/${date}.md`;
  els.note.value = `${vault}/notes/frontend/react-query-invalidation.md`;
}

async function runAction(actionName) {
  const route = routes[actionName];
  if (!route) return;

  setBusy(true, route.label);
  try {
    const result = await postJson(route.path, payload());
    const text = route.success(result);
    els.output.textContent = text || result.summary || "Done";
    appendLog({
      title: route.label,
      summary: result.summary || "Done",
      output: text || JSON.stringify(result, null, 2)
    });
  } catch (error) {
    els.output.textContent = error.message;
    appendLog({
      title: `${route.label} failed`,
      summary: error.message,
      output: error.stack || error.message
    });
  } finally {
    setBusy(false);
  }
}

function payload() {
  return {
    vault: els.vault.value.trim(),
    date: els.date.value.trim(),
    daily: els.daily.value.trim(),
    note: els.note.value.trim(),
    limit: 3
  };
}

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `Request failed: ${response.status}`);
  }
  return result;
}

function renderActions(actions) {
  state.latestActions = actions;
  els.actionCount.textContent = `${actions.length} action${actions.length === 1 ? "" : "s"}`;

  if (actions.length === 0) {
    els.actions.className = "actions-empty";
    els.actions.textContent = "Dry-run to inspect archive actions.";
    return;
  }

  els.actions.className = "";
  els.actions.replaceChildren(...actions.map(renderActionCard));
}

function renderActionCard(action) {
  const card = document.createElement("section");
  card.className = "action-card";

  const title = document.createElement("strong");
  title.textContent = action.target;

  const meta = document.createElement("div");
  meta.className = "meta-row";
  meta.append(
    pill(action.kind),
    pill(`risk: ${action.risk}`, `risk-${action.risk}`),
    pill(`confidence: ${action.confidence}`)
  );

  const source = document.createElement("div");
  source.className = "log-time";
  source.textContent = `${action.sourceHeading} -> ${action.title}`;

  card.append(title, meta, source);
  return card;
}

function pill(text, extraClass = "") {
  const element = document.createElement("span");
  element.className = `pill ${extraClass}`.trim();
  element.textContent = text;
  return element;
}

function appendLog(entry) {
  const item = document.createElement("li");

  const time = document.createElement("div");
  time.className = "log-time";
  time.textContent = new Date().toLocaleTimeString();

  const title = document.createElement("div");
  title.className = "log-title";
  title.textContent = entry.title;

  const summary = document.createElement("div");
  summary.textContent = entry.summary;

  const output = document.createElement("pre");
  output.className = "log-output";
  output.textContent = entry.output;

  item.append(time, title, summary, output);
  els.log.prepend(item);
}

async function copyOutput() {
  await navigator.clipboard.writeText(els.output.textContent);
  appendLog({
    title: "Copy Output",
    summary: "Latest output copied.",
    output: els.output.textContent
  });
}

function setBusy(isBusy, label = "") {
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
  });
  els.status.textContent = isBusy ? `Running ${label}` : "Idle";
  els.status.classList.toggle("busy", isBusy);
}
