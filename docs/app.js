/* ======================================================================
   PromptPilot — app.js (Home & Chapter fancy; Chapter draait omgekeerd)
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

function setTerm(v) {
  STATE.term = (v || "").trim().toLowerCase();
  if ($q && $q.value !== v) $q.value = v; // sync UI
}

if ($q) {
  $q.addEventListener("input", (e) => {
    setTerm(e.target.value);
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
function prettyTitle(s = "") {
  return String(s)
    .replace(/^\s*\d+\s*[-–.)]*\s*/, "") // leading nummering weghalen
    .replace(/^[•\-\–\—\*\u2022\s]+/, "") // bullets/dashes
    .trim();
}
function stripDiacritics(s = "") {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function normKey(s = "") {
  return stripDiacritics(prettyTitle(s)).toLowerCase();
}
function firstAlphaNum(s = "") {
  const m = stripDiacritics(prettyTitle(s)).match(/[A-Za-z0-9]/);
  return m ? m[0].toUpperCase() : "";
}

/* ---------- Icon detectie (incl. persoonlijke ontwikkeling) ---------- */
const ICON_KEYWORDS = [
  { icon: "🧭", any: ["strategie", "strategy", "roadmap", "vision"] },
  {
    icon: "✍️",
    any: ["schrijven", "redactie", "write", "editor", "copy", "tekst"],
  },
  {
    icon: "💡",
    any: ["creativiteit", "brainstorm", "idee", "idea", "concept"],
  },
  { icon: "🔎", any: ["onderzoek", "analyse", "research", "insight"] },
  {
    icon: "🎓",
    any: ["leren", "uitleg", "education", "train", "learn", "academy"],
  },
  {
    icon: "⚙️",
    any: [
      "productiviteit",
      "organisatie",
      "productivity",
      "organis",
      "ops",
      "operations",
    ],
  },
  { icon: "🤖", any: ["meta", "promptcraft", "prompt", "ai", "llm"] },
  {
    icon: "💼",
    any: ["sales", "verk", "bd", "business development", "account"],
  },
  { icon: "🛟", any: ["support", "klantenservice", "customer service", "cs"] },
  { icon: "📣", any: ["marketing", "brand", "campagne", "campaign", "promo"] },
  {
    icon: "💰",
    any: ["finance", "financi", "budget", "boekhoud", "accounting"],
  },
  { icon: "⚖️", any: ["legal", "jurid", "contract", "compliance"] },
  { icon: "🧑‍🤝‍🧑", any: ["hr", "people", "talent", "recruit", "recrut"] },
  { icon: "🛡️", any: ["security", "veilig", "infosec", "privacy"] },
  {
    icon: "📊",
    any: ["data", "analytics", "metric", "kpi", "bi", "dashboard"],
  },
  { icon: "🎨", any: ["design", "ux", "ui", "visual", "ontwerp"] },
  {
    icon: "🛠️",
    any: ["engineering", "dev", "developer", "development", "tech"],
  },
  { icon: "🧩", any: ["product", "roadmap", "feature", "backlog"] },
  // persoonlijke ontwikkeling
  {
    icon: "🌱",
    any: [
      "persoonlijke",
      "ontwikkeling",
      "personal",
      "growth",
      "coach",
      "coaching",
      "skills",
      "vaardig",
    ],
  },
];

function iconFor(rawTitle = "") {
  const key = normKey(rawTitle);
  for (const rule of ICON_KEYWORDS) {
    if (rule.any.some((k) => key.includes(k))) return rule.icon;
  }
  return firstAlphaNum(rawTitle) || "✨";
}

/* override helper: JSON kan 'icon' bevatten */
function pickIcon(title, override) {
  return override || iconFor(title);
}

/* ------------------ Data laden ------------------ */
async function loadRaw() {
  const res = await fetch("./data/templates.v2.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}
function normalizeData(raw) {
  if (raw && Array.isArray(raw.chapters)) {
    return raw.chapters.map((ch) => ({
      id: ch.id ?? ch.title ?? "onbekend",
      title: ch.title ?? ch.id ?? "Onbekend",
      icon: ch.icon, // <— optioneel
      templates: Array.isArray(ch.templates) ? ch.templates : [],
    }));
  }
  const list = Array.isArray(raw) ? raw : raw?.templates || [];
  if (!Array.isArray(list)) throw new Error("Onbekend JSON-formaat.");
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
    if ($view)
      $view.innerHTML = `<div class="card"><h3>Kon templates.v2.json niet laden</h3><p class="muted">${esc(
        e.message || String(e)
      )}</p></div>`;
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

/* ------------------ Fancy carrousel helper ------------------ */
function canFancy() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
/**
 * bouwt één ring-carrousel
 * items: [{ id, title, meta, icon?, onOpen }]
 * options: { reverse:boolean, radius:number }
 */
function renderRing(items, options = {}) {
  const reverse = !!options.reverse;
  const radius =
    options.radius ??
    Math.min(
      380,
      Math.max(
        220,
        Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.35)
      )
    );
  const angleStep = (2 * Math.PI) / Math.max(items.length, 1);

  const html = `
    <div class="fancy-wrap" aria-label="Carrousel">
      <div class="fancy-ring" id="ring" role="list"></div>
      <div class="fancy-hint">Sleep/scroll • ← → • Enter</div>
    </div>`;
  return { html, mount };

  function mount(host) {
    const ring = host.querySelector("#ring");
    items.forEach((it) => {
      const el = document.createElement("button");
      el.className = "fancy-bubble";
      el.setAttribute("role", "listitem");
      el.setAttribute(
        "aria-label",
        `${prettyTitle(it.title)}${it.meta ? `, ${it.meta}` : ""}`
      );

      const ttl = prettyTitle(it.title);
      const ico = pickIcon(it.title, it.icon);
      el.innerHTML = `
        <div class="layer icon" aria-hidden="true"
             style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <span style="font-size:44px;line-height:1;">${esc(ico)}</span>
        </div>
        <div class="layer label" role="presentation"
             style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div class="title">${esc(ttl)}</div>
          ${it.meta ? `<div class="meta">${esc(it.meta)}</div>` : ""}
        </div>
      `;
      el.addEventListener("click", () => it.onOpen && it.onOpen());
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          it.onOpen && it.onOpen();
        }
      });
      ring.appendChild(el);
    });

    let rot = 0,
      auto = reverse ? -0.0045 : 0.0045,
      dragging = false,
      vx = 0,
      lastX = 0;
    const bubbles = [...ring.children];

    function layout() {
      bubbles.forEach((el, i) => {
        const a = i * angleStep + rot;
        const x = Math.sin(a) * radius;
        const z = Math.cos(a) * radius;
        const scale = 0.65 + 0.35 * ((z + radius) / (2 * radius));
        el.style.transform = `translate3d(${x}px,0,${z}px) scale(${scale})`;
        el.style.zIndex = String(1000 + Math.round(z));
        el.dataset.depth = z < 0 ? "back" : "front";
        el.tabIndex = Math.abs(a % (2 * Math.PI)) < angleStep / 2 ? 0 : -1;
      });
      ring.style.transform = `rotateX(-10deg)`;
    }

    let raf = requestAnimationFrame(tick);
    function tick() {
      if (!dragging) rot = (rot + auto) % (2 * Math.PI);
      layout();
      raf = requestAnimationFrame(tick);
    }

    function px(e) {
      return (e.touches ? e.touches[0].clientX : e.clientX) || 0;
    }
    function onDown(e) {
      dragging = true;
      cancelAnimationFrame(raf);
      lastX = px(e);
      vx = 0;
    }
    function onMove(e) {
      if (!dragging) return;
      const x = px(e),
        dx = x - lastX;
      lastX = x;
      vx = dx;
      rot += dx * 0.005 * (reverse ? -1 : 1);
      layout();
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      const decay = 0.95;
      (function glide() {
        if (Math.abs(vx) < 0.2) {
          raf = requestAnimationFrame(tick);
          return;
        }
        rot += vx * 0.005 * (reverse ? -1 : 1);
        vx *= decay;
        layout();
        requestAnimationFrame(glide);
      })();
    }

    ring.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    ring.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        rot += 0.35 * (reverse ? -1 : 1);
        layout();
      }
      if (e.key === "ArrowLeft") {
        rot -= 0.35 * (reverse ? -1 : 1);
        layout();
      }
    });
    ring.addEventListener("mouseenter", () => {
      auto = 0;
    });
    ring.addEventListener("mouseleave", () => {
      auto = reverse ? -0.0045 : 0.0045;
    });

    layout();
  }
}

/* ------------------ Views ------------------ */
// Home — fancy ring vooruit; fallback grid
function renderHome() {
  if (canFancy()) {
    const term = STATE.term;
    const filtered = STATE.chapters
      .map((ch) => ({
        ...ch,
        matchCount: ch.templates.filter((t) => matches(t, term)).length,
      }))
      .filter((ch) => (term ? ch.matchCount > 0 : true));

    const items = filtered.map((ch) => ({
      id: ch.id,
      title: prettyTitle(ch.title),
      meta: `${ch.matchCount || ch.templates.length} opties`,
      icon: ch.icon, // override mogelijk
      onOpen: () => {
        setTerm("");
        location.hash = `#/chapter/${encodeURIComponent(ch.id)}`;
      },
    }));

    $view.innerHTML = `
      ${callout(
        "Welkom! Swipe / sleep aan de carrousel",
        `<p class="help">Sleep of gebruik de pijltjestoetsen. Klik op een bubbel om een hoofdstuk te openen.</p>`
      )}
      <div id="ringHost"></div>
    `;
    const { mount, html } = renderRing(items, { reverse: false });
    document.getElementById("ringHost").innerHTML = html;
    mount(document.getElementById("ringHost"));
    return;
  }

  // --- Fallback grid ---
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
        <li><b>Vul de velden in</b> en klik <i>Genereer prompt</i>.</li>
      </ol>
      <p class="help">Tip: <b>/</b> om te zoeken, <b>T</b> voor thema.</p>`
    )}
    <div class="card">
      <h3>Kies een hoofdstuk ${term ? `(gefilterd)` : ""}</h3>
      <div class="grid">
        ${filtered
          .map(
            (ch) => `
          <a class="card link" href="#/chapter/${encodeURIComponent(
            ch.id
          )}" onclick="(${setTerm})('')">
            <h4>${esc(prettyTitle(ch.title))}</h4>
            <p class="meta">${ch.matchCount || ch.templates.length} opties</p>
          </a>`
          )
          .join("")}
      </div>
    </div>
  `;
}

// Chapter — fancy ring achteruit; items = templates
function renderChapter(chapterId) {
  const ch = STATE.chapters.find((c) => String(c.id) === String(chapterId));
  if (!ch) {
    $view.innerHTML = notFound("Hoofdstuk niet gevonden");
    return;
  }

  if (canFancy()) {
    const list = ch.templates.slice(); // (optioneel: filter op STATE.term)
    const items = list.map((t) => ({
      id: t.id,
      title: t.title || t.id,
      meta: t.description ? prettyTitle(t.description) : "",
      icon: t.icon, // override mogelijk
      onOpen: () => {
        location.hash = `#/template/${encodeURIComponent(
          ch.id
        )}/${encodeURIComponent(t.id)}`;
      },
    }));

    $view.innerHTML = `
      <div class="crumbs"><a href="#">← Terug naar hoofdstukken</a></div>
      ${callout(
        `${esc(prettyTitle(ch.title))} — kies een optie`,
        `<p class="help">Deze carrousel draait <i>omgekeerd</i> zodat je ziet dat je in het hoofdstuk zit.</p>`
      )}
      <div id="ringHost"></div>
    `;
    const { mount, html } = renderRing(items, { reverse: true });
    document.getElementById("ringHost").innerHTML = html;
    mount(document.getElementById("ringHost"));
    return;
  }

  // --- Fallback lijst ---
  const list = ch.templates;
  $view.innerHTML = `
    <div class="crumbs"><a href="#">← Terug naar hoofdstukken</a></div>
    <div class="card">
      <h3>${esc(prettyTitle(ch.title))}</h3>
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
          </a>`
          )
          .join("")}
      </div>
    </div>
  `;
}

// Template — prompt-maker
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
    )}">← Terug naar ${esc(prettyTitle(ch.title))}</a></div>
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
