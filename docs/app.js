/* ======================================================================
   PromptPilot — app.js (v2 single-source, tolerant voor vlakke lijst)
   ====================================================================== */

/* ------------------ Thema toggle + persist ------------------ */
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
(() => {
  const saved = localStorage.getItem("pp:theme");
  if (saved === "dark") root.classList.add("dark");
})();
function toggleTheme() {
  const isDark = root.classList.toggle("dark");
  localStorage.setItem("pp:theme", isDark ? "dark" : "light");
}
if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

/* ------------------ Zoek (globale state) ------------------ */
const $q = document.getElementById("q");
const $view = document.getElementById("view");
let STATE = { term: "", chapters: [] };

if ($q) {
  $q.addEventListener("input", (e) => {
    STATE.term = (e.target.value || "").trim().toLowerCase();
    route();
  });
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const typing = tag === "input" || tag === "textarea";
    if (!typing && e.key === "/") {
      e.preventDefault();
      $q.focus();
    }
    if (!typing && (e.key === "t" || e.key === "T")) {
      e.preventDefault();
      toggleTheme();
    }
  });
}

/* ------------------ Helpers ------------------ */
function callout(title, html) {
  return `<div class="callout"><h4>${esc(title)}</h4>${html}</div>`;
}
function esc(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}
function notFound(msg) {
  return `<div class="card"><h3>${esc(
    msg
  )}</h3><p class="muted">Controleer de URL of ga terug naar de hoofdpagina.</p></div>`;
}
function matches(t, term) {
  if (!term) return true;
  const hay = `${t.title || ""} ${t.description || ""} ${t.when || ""} ${
    t.chapter || ""
  }`.toLowerCase();
  return hay.includes(term);
}
function cssAttrEscape(s) {
  return String(s).replace(/"/g, "&quot;");
}
function firstRunOpenAttr() {
  return localStorage.getItem("pp:onboarded") ? "" : "open";
}

/* ------------------ Data laden (één pad) ------------------ */
async function loadRaw() {
  const res = await fetch("./data/templates.v2.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

/* Accepteert:
   A) { chapters: [ {id,title,templates:[...]}, ... ] }
   B) [ { id, title, chapter, ... }, ... ]  (vlakke lijst)  -> groepeer per chapter
*/
function normalizeData(raw) {
  // A: al in v2-vorm
  if (raw && Array.isArray(raw.chapters)) {
    return raw.chapters.map((ch) => ({
      id: ch.id ?? ch.title ?? "onbekend",
      title: ch.title ?? ch.id ?? "Onbekend",
      templates: Array.isArray(ch.templates) ? ch.templates : [],
    }));
  }
  // B: vlakke lijst
  const list = Array.isArray(raw) ? raw : raw?.templates || [];
  if (!Array.isArray(list)) {
    throw new Error(
      "Onbekend JSON-formaat. Verwacht {chapters:[...]} of een vlakke array met 'chapter'."
    );
  }
  const by = list.reduce((acc, t) => {
    const key = t.chapter || "Overig";
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});
  return Object.entries(by).map(([id, templates]) => ({
    id,
    title: id,
    templates,
  }));
}

(async function boot() {
  try {
    const raw = await loadRaw();
    STATE.chapters = normalizeData(raw);
    route();
  } catch (e) {
    console.error(e);
    if ($view) {
      $view.innerHTML = `
        <div class="card">
          <h3>Kon templates.v2.json niet laden</h3>
          <p class="muted">${esc(e.message || String(e))}</p>
        </div>`;
    }
  }
})();

/* ------------------ Router ------------------ */
window.addEventListener("hashchange", route);
function route() {
  if (!$view) return;
  const p = location.hash
    .replace(/^#/, "")
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);
  if (p[0] === "chapter" && p[1]) {
    renderChapter(p[1]);
    return;
  }
  if (p[0] === "template" && p[1] && p[2]) {
    renderTemplate(p[1], p[2]);
    return;
  }
  renderHome();
}

/* ------------------ Views ------------------ */
function renderHome() {
  const term = STATE.term;
  const filtered = STATE.chapters
    .map((ch) => ({
      ...ch,
      matchCount: ch.templates.filter((t) => matches(t, term)).length,
    }))
    .filter((ch) => (term ? ch.matchCount > 0 : true));

  $view.innerHTML = `
    ${callout(
      "Welkom! Zo werkt PromptPilot",
      `<ol>
        <li><b>Kies een hoofdstuk</b> dat past bij je doel.</li>
        <li><b>Kies een optie</b> (template) die het best aansluit.</li>
        <li><b>Vul de velden in</b> en klik <i>Genereer prompt</i> — klaar om te kopiëren.</li>
      </ol>
      <p class="help">Tip: <b>/</b> om te zoeken, <b>T</b> voor thema.</p>`
    )}
    <div class="card">
      <h3>Kies een hoofdstuk ${term ? `(gefilterd)` : ""}</h3>
      <div class="grid">
        ${filtered
          .map(
            (ch) => `
          <a class="card link" href="#/chapter/${encodeURIComponent(ch.id)}">
            <h4>${esc(ch.title)}</h4>
            <p class="meta">${ch.matchCount || ch.templates.length} opties</p>
          </a>
        `
          )
          .join("")}
      </div>
    </div>`;
}

function renderChapter(chapterId) {
  const ch = STATE.chapters.find((c) => String(c.id) === String(chapterId));
  if (!ch) {
    $view.innerHTML = notFound("Hoofdstuk niet gevonden");
    return;
  }

  const term = STATE.term;
  const list = ch.templates.filter((t) => matches(t, term));

  $view.innerHTML = `
    <div class="crumbs"><a href="#">← Terug naar hoofdstukken</a></div>
    ${callout(
      `${esc(ch.title)} — wat nu?`,
      `<p>Kies hieronder één van de opties. Je kan daarna nog altijd terug.</p>
       <p class="help">Start met de optie die het dichtst bij je doel ligt.</p>`
    )}
    <div class="card">
      <h3>${esc(ch.title)} ${term ? `(gefilterd)` : ""}</h3>
      <p class="meta">${list.length} van ${ch.templates.length} opties</p>
      <div class="list">
        ${list
          .map(
            (t) => `
          <a class="row" href="#/template/${encodeURIComponent(
            ch.id
          )}/${encodeURIComponent(t.id)}">
            <div class="row-main">
              <strong>${esc(t.title ?? t.id)}</strong>
              ${
                t.description
                  ? `<div class="muted">${esc(t.description)}</div>`
                  : ""
              }
            </div>
            <span aria-hidden="true">›</span>
          </a>
        `
          )
          .join("")}
      </div>
    </div>`;
}

function renderTemplate(chapterId, templateId) {
  const ch = STATE.chapters.find((c) => String(c.id) === String(chapterId));
  const t = ch?.templates?.find((x) => String(x.id) === String(templateId));
  if (!ch || !t) {
    $view.innerHTML = notFound("Template niet gevonden");
    return;
  }

  $view.innerHTML = `
    <div class="crumbs"><a href="#/chapter/${encodeURIComponent(
      ch.id
    )}">← Terug naar ${esc(ch.title)}</a></div>
    <div class="card">
      <h3>${esc(t.title ?? t.id)}</h3>
      ${t.description ? `<p class="meta">${esc(t.description)}</p>` : ""}
      <div id="templateHost"></div>
    </div>`;
  buildPromptForm(t, document.getElementById("templateHost"));
}

/* ------------------ Dynamische prompt-maker ------------------ */
function buildPromptForm(template, hostEl) {
  const fields = Array.isArray(template.inputFields)
    ? template.inputFields
    : [];
  hostEl.innerHTML = `
    ${callout(
      "Stap 3 — Vul in & genereer",
      `<p>Vul enkel in wat relevant is. Klik <b>Genereer prompt</b> en kopieer het resultaat.</p>
       <p class="help">Tokens zoals <code>{{besluit}}</code> in de template worden automatisch vervangen.</p>`
    )}
    <form id="pp-form" class="form">
      ${fields.map(renderField).join("")}
      <div style="margin-top:1rem; display:flex; gap:.5rem; flex-wrap:wrap;">
        <button type="button" class="btn" id="pp-gen">Genereer prompt</button>
        <button type="button" class="btn btn-ghost" id="pp-copy">Kopieer</button>
      </div>
      <details class="helpbox" id="pp-help" ${firstRunOpenAttr()}>
        <summary>Hoe gebruik ik dit? (uitleg & tips)</summary>
        <ul>
          <li>Vul velden zo concreet mogelijk in (tijdshorizon, criteria, context…)</li>
          <li>Klik <b>Genereer prompt</b> — de tekst verschijnt onderaan.</li>
          <li>Klik <b>Kopieer</b> om te plakken waar je wil.</li>
        </ul>
        ${
          template.example
            ? `<p class="help" style="margin-top:.5rem;"><b>Voorbeeld</b>: ${esc(
                template.example
              )}</p>`
            : ""
        }
      </details>
    </form>
    <div class="card" style="margin-top:1rem;">
      <h3>Resultaat</h3>
      <pre id="pp-out" style="white-space:pre-wrap; overflow:auto;"></pre>
    </div>
  `;

  const d = hostEl.querySelector("#pp-help");
  d?.addEventListener("toggle", () => {
    if (!d.open) localStorage.setItem("pp:onboarded", "1");
  });

  const $out = hostEl.querySelector("#pp-out");
  hostEl.querySelector("#pp-gen").addEventListener("click", () => {
    const values = {};
    fields.forEach((f) => {
      const el = hostEl.querySelector(`[name="${cssAttrEscape(f.key)}"]`);
      values[f.key] = (el?.value ?? "").trim();
    });
    let base = String(template.prompt || "");
    const hadTokens = /\{\{[^}]+\}\}/.test(base);
    if (hadTokens) {
      base = base.replace(
        /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g,
        (_, k) => values[k] || ""
      );
    } else {
      const blocks = fields
        .filter((f) => values[f.key])
        .map((f) => `- ${f.label || f.key}: ${values[f.key]}`)
        .join("\n");
      if (blocks) base = `${base}\n\n## Ingevulde velden\n${blocks}`;
    }
    $out.textContent = base.trim();
  });
  hostEl.querySelector("#pp-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($out.textContent || "");
    } catch {}
  });
}

function renderField(f) {
  const type = (f.type || "text").toLowerCase();
  const label = esc(f.label || f.key || "");
  const name = esc(f.key || "");
  const hint = f.help ? `<span class="hint">${esc(f.help)}</span>` : "";
  if (type === "textarea") {
    return `
      <label style="display:block; margin-top:.75rem;">${label}${hint}</label>
      <textarea name="${name}" rows="4" placeholder="${label}" style="width:100%"></textarea>
    `;
  }
  return `
    <label style="display:block; margin-top:.75rem;">${label}${hint}</label>
    <input name="${name}" type="text" placeholder="${label}" style="width:100%" />
  `;
}
