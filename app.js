// ---- Data inladen uit JSON ----
let templates = [];
let activeChapter = null;

const $q = document.getElementById("q");
const $chapterFilter = document.getElementById("chapterFilter");
const $chaptersList = document.getElementById("chaptersList");
const $results = document.getElementById("results");

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("data/templates.json", { cache: "no-store" });
    templates = await res.json();
    initFilters();
  } catch (e) {
    console.error("Kon templates.json niet laden:", e);
    $results.innerHTML = '<div class="empty">Kon templates niet laden.</div>';
  }
});

// ---- Init & filters ----
function initFilters() {
  // dropdown
  const chapters = [...new Set(templates.map((t) => t.chapter))];
  $chapterFilter.innerHTML =
    `<option value="">Alle hoofdstukken</option>` +
    chapters.map((c) => `<option>${c}</option>`).join("");

  // listeners
  $q.addEventListener("input", renderResults);
  $chapterFilter.addEventListener("change", () => {
    activeChapter = $chapterFilter.value || null;
    renderChapters();
    renderResults();
  });

  renderChapters();
  renderResults();
}

function renderChapters() {
  const chapters = [...new Set(templates.map((t) => t.chapter))];
  $chaptersList.innerHTML = chapters
    .map((c) => {
      const count = templates.filter((t) => t.chapter === c).length;
      const act = activeChapter === c ? "active" : "";
      return `<div class="chapter ${act}" data-c="${c}">
      <div>${c}</div><div class="count">${count}</div>
    </div>`;
    })
    .join("");

  // klik op een hoofdstuk in de sidebar
  $chaptersList.querySelectorAll(".chapter").forEach((node) => {
    node.onclick = () => {
      const c = node.dataset.c;
      activeChapter = activeChapter === c ? null : c; // toggle
      $chapterFilter.value = activeChapter || "";
      renderChapters();
      renderResults();
    };
  });
}

// ---- Resultaten ----
function renderResults() {
  const term = ($q.value || "").toLowerCase();

  const list = templates.filter((t) => {
    const matchTerm =
      !term || (t.title + t.when + t.chapter).toLowerCase().includes(term);
    const matchChapter = !activeChapter || t.chapter === activeChapter;
    return matchTerm && matchChapter;
  });

  if (!list.length) {
    $results.innerHTML = `<div class="empty">Geen resultaten…</div>`;
    return;
  }
  $results.innerHTML = list.map((t) => tmplCard(t)).join("");
}

function tmplCard(t) {
  const deliver = (t.deliver || []).map((d) => `<li>${d}</li>`).join("");
  const output = (t.output || []).map((o) => `<li>${o}</li>`).join("");
  const qc = (t.qc || []).map((c) => `<li>${c}</li>`).join("");
  return `
  <article class="tmpl" id="t-${t.id}">
    <h3>${t.title}</h3>
    <div class="meta"><span class="pill">${t.chapter}</span></div>

    <div class="block"><b>🟢 Wanneer gebruiken</b><br>${t.when}</div>
    <div class="block"><b>📦 Wat ik oplever</b><br><ul>${deliver}</ul></div>

    <div class="block"><b>💬 Prompt</b>
      <pre class="code">${t.prompt}</pre>
    </div>

    <div class="block"><b>📤 Verwachte output</b><br><ul>${output}</ul></div>
    <div class="block"><b>✅ Kwaliteitscheck</b><br><ul>${qc}</ul></div>
  </article>`;
}
