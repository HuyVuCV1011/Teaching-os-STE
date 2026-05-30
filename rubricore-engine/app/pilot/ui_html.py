"""Pilot UI HTML template - extracted from fastapi_app.py for maintainability."""

PILOT_UI_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RubriCore Pilot</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #202124;
      --muted: #5f6368;
      --line: #d7dbdf;
      --panel: #ffffff;
      --page: #f5f7f8;
      --accent: #0f766e;
      --accent-strong: #115e59;
      --danger: #b42318;
      --warning: #b54708;
      --ok: #027a48;
      --soft-ok: #ecfdf3;
      --soft-warning: #fffaeb;
      --soft-danger: #fef3f2;
      --soft-info: #eff6ff;
      --code: #111827;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--page);
      color: var(--ink);
    }
    header {
      border-bottom: 1px solid var(--line);
      background: #eef3f2;
    }
    .bar, main {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
    }
    .bar {
      min-height: 68px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 750;
      letter-spacing: 0;
    }
    .status {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 0 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--muted);
      font-size: 13px;
    }
    main {
      display: grid;
      grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
      gap: 20px;
      padding: 22px 0;
    }
    section {
      min-width: 0;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }
    .panel + .panel { margin-top: 14px; }
    .review-panel {
      display: grid;
      gap: 14px;
    }
    h2 {
      margin: 0 0 14px;
      font-size: 15px;
      letter-spacing: 0;
    }
    h3 {
      margin: 0 0 10px;
      font-size: 14px;
      letter-spacing: 0;
    }
    label {
      display: block;
      margin: 12px 0 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 650;
    }
    input, select, textarea {
      width: 100%;
      min-height: 38px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-size: 14px;
    }
    textarea {
      min-height: 92px;
      resize: vertical;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .checks {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 12px;
      margin-top: 12px;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--ink);
      font-size: 13px;
      font-weight: 500;
    }
    .check input {
      width: 16px;
      min-height: 16px;
      margin: 0;
      accent-color: var(--accent);
    }
    button {
      width: 100%;
      min-height: 42px;
      margin-top: 16px;
      border: 0;
      border-radius: 6px;
      background: var(--accent);
      color: #fff;
      font-size: 14px;
      font-weight: 750;
      cursor: pointer;
    }
    button:hover { background: var(--accent-strong); }
    button:disabled { cursor: wait; opacity: .65; }
    button.secondary {
      margin-top: 14px;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink);
    }
    button.secondary:hover { background: #eef3f2; }
    .empty {
      border: 1px dashed var(--line);
      border-radius: 8px;
      padding: 22px;
      color: var(--muted);
      background: #fafafa;
      text-align: center;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: #fff;
      min-width: 0;
    }
    .metric span {
      display: block;
      margin-bottom: 5px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 650;
    }
    .metric strong {
      display: block;
      overflow-wrap: anywhere;
      font-size: 18px;
      line-height: 1.2;
    }
    .route-card {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      background: var(--soft-info);
    }
    .route-card.auto {
      border-color: #abefc6;
      background: var(--soft-ok);
    }
    .route-card.review {
      border-color: #fedf89;
      background: var(--soft-warning);
    }
    .route-card.error {
      border-color: #fecdca;
      background: var(--soft-danger);
    }
    .route-title {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 750;
    }
    .route-copy {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 0 9px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--muted);
      font-size: 12px;
      font-weight: 750;
      white-space: nowrap;
    }
    .badge.ok { border-color: #abefc6; color: var(--ok); }
    .badge.warn { border-color: #fedf89; color: var(--warning); }
    .badge.danger { border-color: #fecdca; color: var(--danger); }
    .criteria {
      display: grid;
      gap: 10px;
    }
    .criterion {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 13px;
      background: #fff;
    }
    .criterion-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }
    .criterion-title {
      margin: 0;
      font-size: 14px;
      font-weight: 750;
      overflow-wrap: anywhere;
    }
    .criterion-score {
      white-space: nowrap;
      font-weight: 800;
    }
    .criterion-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .criterion p, .feedback {
      margin: 0;
      color: #3f454a;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .signals {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .actions {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      background: #fbfefe;
    }
    .action-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    .action-grid button {
      margin-top: 0;
    }
    .action-grid button.danger-action {
      background: var(--warning);
    }
    .action-grid button.danger-action:hover {
      background: #93370d;
    }
    .action-message {
      margin-top: 10px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
    }
    .action-message.ok { color: var(--ok); }
    .action-message.error { color: var(--danger); }
    details {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
    }
    summary {
      cursor: pointer;
      padding: 12px 14px;
      font-weight: 750;
    }
    pre {
      margin: 0;
      overflow: auto;
      border: 1px solid #1f2937;
      border-radius: 0 0 8px 8px;
      padding: 14px;
      background: var(--code);
      color: #d1fae5;
      font-size: 13px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .error { color: var(--danger); }
    @media (max-width: 860px) {
      main { grid-template-columns: 1fr; }
      .summary { grid-template-columns: 1fr 1fr; }
      .route-card { display: grid; }
    }
    @media (max-width: 560px) {
      .row, .checks, .summary { grid-template-columns: 1fr; }
      .bar { align-items: flex-start; flex-direction: column; padding: 14px 0; }
      .criterion-head { display: grid; }
      .criterion-score { white-space: normal; }
    }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <h1>RubriCore Pilot</h1>
      <div id="health" class="status">Checking API</div>
    </div>
  </header>
  <main>
    <section>
      <form id="grading-form" class="panel">
        <h2>Grading Run</h2>
        <label for="actor">Actor user ID</label>
        <input id="actor" name="actor" autocomplete="off" required>
        <label for="organization">Organization ID</label>
        <input id="organization" name="organization" autocomplete="off" required>
        <label for="role">Role</label>
        <select id="role" name="role">
          <option value="teacher">teacher</option>
          <option value="admin">admin</option>
          <option value="system">system</option>
          <option value="reviewer">reviewer</option>
          <option value="read_only">read_only</option>
        </select>
        <label for="submission">Submission ID</label>
        <input id="submission" name="submission" autocomplete="off" required>
        <label for="rubric">Rubric version ID</label>
        <input id="rubric" name="rubric" autocomplete="off">
        <label for="answer-key">Answer key version ID</label>
        <input id="answer-key" name="answer-key" autocomplete="off">
        <div class="row">
          <div>
            <label for="confidence">Confidence</label>
            <input id="confidence" name="confidence" inputmode="decimal" value="0.85">
          </div>
          <div>
            <label for="review">Review</label>
            <input id="review" name="review" inputmode="decimal" value="0.70">
          </div>
        </div>
        <label for="levels">Selected levels JSON</label>
        <textarea id="levels" name="levels">{}</textarea>
        <div class="checks">
          <label class="check"><input id="ai-allowed" type="checkbox" checked> AI allowed</label>
          <label class="check"><input id="ai-required" type="checkbox"> AI required</label>
          <label class="check"><input id="auto-finalize" type="checkbox" checked> Auto finalize</label>
          <label class="check"><input id="mandatory-review" type="checkbox"> Mandatory review</label>
        </div>
        <button id="load-sample" type="button" class="secondary">Load sample data</button>
        <button id="submit" type="submit">Run grading</button>
      </form>
    </section>
    <section>
      <div class="panel review-panel">
        <h2>Teacher Review</h2>
        <div id="review-output" class="empty">Run grading to see the teacher review surface.</div>
        <details>
          <summary>Raw JSON</summary>
          <pre id="output">{}</pre>
        </details>
      </div>
    </section>
  </main>
  <script>
    const health = document.querySelector("#health");
    const form = document.querySelector("#grading-form");
    const output = document.querySelector("#output");
    const reviewOutput = document.querySelector("#review-output");
    const submit = document.querySelector("#submit");
    const loadSample = document.querySelector("#load-sample");
    let latestReviewData = null;
    let latestActionNotice = null;

    async function refreshHealth() {
      try {
        const res = await fetch("/pilot/health");
        const data = await res.json();
        health.textContent = data.status === "ok" ? "API online" : "API unavailable";
      } catch {
        health.textContent = "API unavailable";
        health.classList.add("error");
      }
    }

    function optionalValue(id) {
      const value = document.querySelector(id).value.trim();
      return value ? value : null;
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);
    }

    function labelize(value) {
      if (value === null || value === undefined || value === "") return "Not provided";
      return String(value).replaceAll("_", " ").replaceAll("-", " ");
    }

    function badgeClass(value) {
      const normalized = String(value || "").toLowerCase();
      if (["completed", "finalized", "valid", "auto_accept"].includes(normalized)) return "ok";
      if (["needs_review", "route_to_review", "pending", "proposed"].includes(normalized)) return "warn";
      if (["failed", "invalid"].includes(normalized)) return "danger";
      return "";
    }

    function routeSummary(data) {
      const result = data.grading_result || {};
      const routing = result.explanation_payload?.routing || {};
      if (routing.decision === "auto_accept" || result.status === "finalized") {
        return {
          className: "auto",
          title: "Auto-finalized",
          badge: "Ready",
          copy: routing.reviewer_summary || "The result passed the pilot routing policy and can be treated as final."
        };
      }
      if (routing.decision === "route_to_review" || result.status === "needs_review" || reviewTaskId(data)) {
        return {
          className: "review",
          title: "Needs teacher review",
          badge: "Review",
          copy: routing.reviewer_summary
            || "The result has one or more signals that should be checked before finalizing."
        };
      }
      if (data.error) {
        return {
          className: "error",
          title: "Request failed",
          badge: "Error",
          copy: data.error.message || "The grading request did not complete."
        };
      }
      return {
        className: "",
        title: "Awaiting result",
        badge: "Draft",
        copy: "Run grading to see routing, scoring, and review details."
      };
    }

    function reviewTaskId(data) {
      return data.review_task_id || data.review_task?.id || null;
    }

    function isActionable(data) {
      const result = data.grading_result || {};
      const task = data.review_task || {};
      const taskOpen = !task.status || ["open", "assigned"].includes(task.status);
      return Boolean(reviewTaskId(data) && result.status === "needs_review" && taskOpen && data.actionable !== false);
    }

    function criterionRows(result) {
      const exported = Array.isArray(result.criterion_results) ? result.criterion_results : [];
      if (exported.length) return exported;

      const deterministic = result.explanation_payload?.deterministic || {};
      const scores = deterministic.criterion_scores || {};
      return Object.entries(scores).map(([criterionKey, score]) => ({
        criterion_key: criterionKey,
        source: "deterministic",
        score,
        max_score: deterministic.criterion_max_scores?.[criterionKey] ?? null,
        confidence: "1",
        explanation: `Deterministic rubric level ${
          deterministic.selected_levels_by_criterion?.[criterionKey] || "not selected"
        } selected.`
      }));
    }

    function renderSignals(result) {
      const payload = result.explanation_payload || {};
      const reasons = payload.review_reasons || payload.routing?.reasons || [];
      const blocking = payload.blocking_signals || [];
      const signals = [...new Set([...reasons, ...blocking])];
      if (!signals.length) return "";
      return `
        <div>
          <h3>Review reasons and blocking signals</h3>
          <div class="signals">
            ${signals.map((signal) => `<span class="badge warn">${escapeHtml(labelize(signal))}</span>`).join("")}
          </div>
        </div>
      `;
    }

    function renderActionSurface(data, criteria) {
      const notice = latestActionNotice
        ? `<div class="action-message ${latestActionNotice.kind}">${escapeHtml(latestActionNotice.message)}</div>`
        : "";
      if (!isActionable(data)) return "";
      const result = data.grading_result || {};
      const criterionScoreLabel = (item) => `${item.score ?? "N/A"} / ${item.max_score ?? "N/A"}`;
      const criterionOptions = criteria.map((item) => `
        <option
          value="${escapeHtml(item.criterion_key)}"
          data-id="${escapeHtml(item.id || "")}"
          data-score="${escapeHtml(item.score ?? "")}"
          data-max="${escapeHtml(item.max_score ?? "")}"
          data-explanation="${escapeHtml(item.explanation || "")}"
        >
          ${escapeHtml(labelize(item.criterion_key))} (${escapeHtml(criterionScoreLabel(item))})
        </option>
      `).join("");
      return `
        <div class="actions" id="review-actions">
          <h3>Teacher actions</h3>
          <label for="review-reason">Reason or comment</label>
          <textarea id="review-reason" placeholder="Required for every review action"></textarea>
          <label for="feedback-edit">Feedback draft</label>
          <textarea id="feedback-edit">${escapeHtml(result.feedback || "")}</textarea>
          <div class="row">
            <div>
              <label for="total-score-edit">Total score</label>
              <input id="total-score-edit" inputmode="decimal" value="${escapeHtml(result.total_score ?? "")}">
            </div>
            <div>
              <label for="max-score-readonly">Max score</label>
              <input id="max-score-readonly" value="${escapeHtml(result.max_score ?? "N/A")}" readonly>
            </div>
          </div>
          <label for="criterion-select">Criterion score</label>
          <select id="criterion-select">${criterionOptions}</select>
          <div class="row">
            <div>
              <label for="criterion-score-edit">Criterion score</label>
              <input id="criterion-score-edit" inputmode="decimal">
            </div>
            <div>
              <label for="criterion-max-score">Criterion max</label>
              <input id="criterion-max-score" inputmode="decimal">
            </div>
          </div>
          <label for="criterion-explanation-edit">Criterion explanation</label>
          <textarea id="criterion-explanation-edit"></textarea>
          <div class="action-grid">
            <button type="button" data-review-action="approve">Approve result</button>
            <button type="button" data-review-action="edit-feedback">Edit feedback</button>
            <button type="button" data-review-action="adjust-score">Adjust total score</button>
            <button type="button" data-review-action="adjust-criterion-score">Adjust criterion score</button>
            <button
              type="button"
              class="danger-action"
              data-review-action="return-for-regrade"
            >Return for regrade</button>
          </div>
          <div id="action-message" class="action-message">Reason is required by review policy.</div>
          ${notice}
        </div>
      `;
    }

    function renderActionNotice() {
      if (!latestActionNotice) return "";
      return `
        <div class="actions">
          <h3>Teacher actions</h3>
          <div class="action-message ${latestActionNotice.kind}">
            ${escapeHtml(latestActionNotice.message)}
          </div>
        </div>
      `;
    }

    function renderTeacherReview(data) {
      if (data.error) {
        reviewOutput.className = "empty error";
        reviewOutput.textContent = data.error.message || "Request failed.";
        return;
      }
      const result = data.grading_result;
      if (!result) {
        reviewOutput.className = "empty";
        reviewOutput.textContent = "No grading result was returned.";
        return;
      }

      const route = routeSummary(data);
      const aiStatus = data.ai_interaction?.validation_status
        || result.explanation_payload?.ai_validation_summary?.status
        || "not available";
      const routingDecision = result.explanation_payload?.routing?.decision;
      const routeBadge = route.className === "auto" ? "ok" : route.className === "review" ? "warn" : "danger";
      const criteria = criterionRows(result);
      latestReviewData = data;
      reviewOutput.className = "";
      reviewOutput.innerHTML = `
        <div class="route-card ${route.className}">
          <div>
            <p class="route-title">${escapeHtml(route.title)}</p>
            <p class="route-copy">${escapeHtml(route.copy)}</p>
          </div>
          <span class="badge ${routeBadge}">${escapeHtml(route.badge)}</span>
        </div>
        <div class="summary">
          <div class="metric">
            <span>Grading run</span>
            <strong>${escapeHtml(labelize(data.grading_run_status))}</strong>
          </div>
          <div class="metric"><span>Result</span><strong>${escapeHtml(labelize(result.status))}</strong></div>
          <div class="metric">
            <span>Total score</span>
            <strong>${escapeHtml(result.total_score ?? "N/A")} / ${escapeHtml(result.max_score ?? "N/A")}</strong>
          </div>
          <div class="metric">
            <span>Confidence</span>
            <strong>${escapeHtml(result.confidence ?? "N/A")}</strong>
          </div>
        </div>
        <div class="summary">
          <div class="metric">
            <span>AI validation</span>
            <strong><span class="badge ${badgeClass(aiStatus)}">${escapeHtml(labelize(aiStatus))}</span></strong>
          </div>
          <div class="metric">
            <span>Routing decision</span>
            <strong>
              <span class="badge ${badgeClass(routingDecision)}">
                ${escapeHtml(labelize(routingDecision || route.title))}
              </span>
            </strong>
          </div>
          <div class="metric">
            <span>Review task</span>
            <strong>${escapeHtml(reviewTaskId(data) || "None")}</strong>
          </div>
          <div class="metric">
            <span>Result type</span>
            <strong>${escapeHtml(labelize(result.result_type))}</strong>
          </div>
        </div>
        <div>
          <h3>Criterion details</h3>
          <div class="criteria">
            ${criteria.length ? criteria.map((item) => `
              <article class="criterion">
                <div class="criterion-head">
                  <p class="criterion-title">${escapeHtml(labelize(item.criterion_key))}</p>
                  <div class="criterion-score">
                    ${escapeHtml(item.score ?? "N/A")} / ${escapeHtml(item.max_score ?? "N/A")}
                  </div>
                </div>
                <div class="criterion-meta">
                  <span class="badge">${escapeHtml(labelize(item.source))}</span>
                  <span class="badge ${badgeClass(item.confidence)}">
                    Confidence ${escapeHtml(item.confidence ?? "N/A")}
                  </span>
                </div>
                <p>${escapeHtml(item.explanation || "No explanation provided.")}</p>
              </article>
            `).join("") : `<div class="empty">No criterion-level results were returned.</div>`}
          </div>
        </div>
        ${result.feedback ? `
          <div><h3>Feedback draft</h3><p class="feedback">${escapeHtml(result.feedback)}</p></div>
        ` : ""}
        ${renderSignals(result)}
        ${renderActionSurface(data, criteria)}
        ${!isActionable(data) ? renderActionNotice() : ""}
      `;
      hydrateActionControls(result);
    }

    function hydrateActionControls(result) {
      const select = document.querySelector("#criterion-select");
      if (!select) return;
      function syncCriterion() {
        const option = select.selectedOptions[0];
        document.querySelector("#criterion-score-edit").value = option?.dataset.score || "";
        document.querySelector("#criterion-max-score").value = option?.dataset.max || "";
        document.querySelector("#criterion-explanation-edit").value = option?.dataset.explanation || "";
      }
      select.addEventListener("change", syncCriterion);
      syncCriterion();
      const totalInput = document.querySelector("#total-score-edit");
      totalInput.addEventListener("input", () => {
        const max = Number(result.max_score);
        const score = Number(totalInput.value);
        totalInput.setCustomValidity(Number.isFinite(max) && score > max ? "Score cannot exceed max score." : "");
      });
    }

    function actionHeaders(requestId) {
      return {
        "Content-Type": "application/json",
        "X-Pilot-Actor-User-Id": document.querySelector("#actor").value.trim(),
        "X-Pilot-Organization-Id": document.querySelector("#organization").value.trim(),
        "X-Pilot-Roles": document.querySelector("#role").value,
        "X-Pilot-Request-Id": requestId
      };
    }

    function assertScoreWithinMax(scoreValue, maxValue, label) {
      if (scoreValue === "") return;
      const score = Number(scoreValue);
      const max = Number(maxValue);
      if (!Number.isFinite(score) || score < 0) throw new Error(`${label} must be zero or greater.`);
      if (Number.isFinite(max) && score > max) throw new Error(`${label} cannot exceed max score ${maxValue}.`);
    }

    async function submitReviewAction(action) {
      if (!latestReviewData || !isActionable(latestReviewData)) return;
      const message = document.querySelector("#action-message");
      const reason = document.querySelector("#review-reason").value.trim();
      if (!reason) {
        message.textContent = "Reason is required before submitting a review action.";
        message.className = "action-message error";
        return;
      }
      const requestId = crypto.randomUUID();
      const payload = { reason, request_id: requestId };
      try {
        if (action === "edit-feedback") {
          payload.feedback = document.querySelector("#feedback-edit").value;
        }
        if (action === "adjust-score") {
          const totalScore = document.querySelector("#total-score-edit").value.trim();
          assertScoreWithinMax(totalScore, latestReviewData.grading_result.max_score, "Total score");
          payload.total_score = totalScore;
        }
        if (action === "adjust-criterion-score") {
          const select = document.querySelector("#criterion-select");
          const option = select.selectedOptions[0];
          const score = document.querySelector("#criterion-score-edit").value.trim();
          const max = document.querySelector("#criterion-max-score").value.trim();
          assertScoreWithinMax(score, max, "Criterion score");
          payload.criterion_key = select.value;
          payload.criterion_result_id = option?.dataset.id || null;
          payload.criterion_score = score;
          payload.criterion_max_score = max || null;
          payload.criterion_explanation = document.querySelector("#criterion-explanation-edit").value;
        }
      } catch (error) {
        message.textContent = String(error.message || error);
        message.className = "action-message error";
        return;
      }
      message.textContent = "Submitting review action...";
      message.className = "action-message";
      document.querySelectorAll("[data-review-action]").forEach((button) => { button.disabled = true; });
      try {
        const res = await fetch(`/pilot/review-tasks/${reviewTaskId(latestReviewData)}/actions/${action}`, {
          method: "POST",
          headers: actionHeaders(requestId),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
        if (!res.ok) {
          output.classList.add("error");
          message.textContent = data.error?.message || "Review action failed.";
          message.className = "action-message error";
          document.querySelectorAll("[data-review-action]").forEach((button) => { button.disabled = false; });
          return;
        }
        output.classList.remove("error");
        latestActionNotice = { kind: "ok", message: "Review action completed." };
        renderTeacherReview(data);
      } catch (error) {
        message.textContent = String(error);
        message.className = "action-message error";
        output.textContent = String(error);
        output.classList.add("error");
        document.querySelectorAll("[data-review-action]").forEach((button) => { button.disabled = false; });
      }
    }

    reviewOutput.addEventListener("click", (event) => {
      const button = event.target.closest("[data-review-action]");
      if (!button) return;
      submitReviewAction(button.dataset.reviewAction);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      output.textContent = "Running...";
      reviewOutput.className = "empty";
      reviewOutput.textContent = "Running grading...";
      latestActionNotice = null;
      output.classList.remove("error");
      let levels = {};
      try {
        levels = JSON.parse(document.querySelector("#levels").value || "{}");
      } catch {
        output.textContent = "Selected levels JSON is invalid.";
        reviewOutput.className = "empty error";
        reviewOutput.textContent = "Selected levels JSON is invalid.";
        output.classList.add("error");
        submit.disabled = false;
        return;
      }
      const payload = {
        submission_id: document.querySelector("#submission").value.trim(),
        rubric_version_id: optionalValue("#rubric"),
        answer_key_version_id: optionalValue("#answer-key"),
        selected_levels_by_criterion: levels,
        ai_allowed: document.querySelector("#ai-allowed").checked,
        ai_required: document.querySelector("#ai-required").checked,
        auto_finalize_allowed: document.querySelector("#auto-finalize").checked,
        mandatory_review: document.querySelector("#mandatory-review").checked,
        confidence_threshold: document.querySelector("#confidence").value.trim(),
        review_threshold: document.querySelector("#review").value.trim(),
        request_id: crypto.randomUUID()
      };
      try {
        const res = await fetch("/pilot/grading-runs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Pilot-Actor-User-Id": document.querySelector("#actor").value.trim(),
            "X-Pilot-Organization-Id": document.querySelector("#organization").value.trim(),
            "X-Pilot-Roles": document.querySelector("#role").value,
            "X-Pilot-Request-Id": payload.request_id
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
        renderTeacherReview(data);
        if (!res.ok) output.classList.add("error");
      } catch (error) {
        output.textContent = String(error);
        reviewOutput.className = "empty error";
        reviewOutput.textContent = String(error);
        output.classList.add("error");
      } finally {
        submit.disabled = false;
      }
    });

    loadSample.addEventListener("click", async () => {
      loadSample.disabled = true;
      output.classList.remove("error");
      try {
        const res = await fetch("/pilot/demo/sample-grading-context");
        const data = await res.json();
        if (!res.ok) {
          output.textContent = JSON.stringify(data, null, 2);
          reviewOutput.className = "empty error";
          reviewOutput.textContent = data.error?.message || "Sample data could not be loaded.";
          output.classList.add("error");
          return;
        }
        document.querySelector("#actor").value = data.actor_user_id;
        document.querySelector("#organization").value = data.organization_id;
        document.querySelector("#role").value = data.role;
        document.querySelector("#submission").value = data.submission_id;
        document.querySelector("#rubric").value = data.rubric_version_id;
        document.querySelector("#answer-key").value = data.answer_key_version_id || "";
        output.textContent = JSON.stringify(data, null, 2);
        reviewOutput.className = "empty";
        reviewOutput.textContent = "Sample data loaded. Run grading to see the teacher review surface.";
        latestActionNotice = null;
      } catch (error) {
        output.textContent = String(error);
        reviewOutput.className = "empty error";
        reviewOutput.textContent = String(error);
        output.classList.add("error");
      } finally {
        loadSample.disabled = false;
      }
    });

    refreshHealth();
  </script>
</body>
</html>
"""
