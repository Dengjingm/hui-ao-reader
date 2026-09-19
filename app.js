const STORAGE_KEY = "hui-ao-reader";

const state = {
  book: null,
  lastId: 1,
};

const $ = (id) => document.getElementById(id);

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (Number.isFinite(saved.lastId)) state.lastId = saved.lastId;
  } catch {
    /* keep defaults */
  }
}

function savePrefs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ lastId: state.lastId }));
}

function formatCount(n) {
  return n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")} 万字` : `${n} 字`;
}

function chapterById(id) {
  return state.book.chapters.find((item) => item.id === id) || null;
}

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

function setNavOpen(open) {
  document.querySelector(".app").classList.toggle("nav-open", open);
  $("nav-mask").hidden = !open;
}

function renderCover() {
  const root = document.querySelector(".app");
  root.dataset.view = "cover";
  $("cover").hidden = false;
  $("chapter").hidden = true;
  $("cover-blurb").textContent = state.book.blurb;
  $("cover-meta").textContent = `${state.book.subtitle} · 已刊 ${state.book.chapterCount} 章 · ${formatCount(state.book.totalChars)}`;
  const last = chapterById(state.lastId) || state.book.chapters[0];
  $("start-read").href = `#/${state.book.chapters[0].id}`;
  $("continue-read").href = `#/${last.id}`;
  $("continue-read").hidden = last.id === state.book.chapters[0].id;
  $("continue-read").textContent = `续读 ${last.chapterLabel} ${last.title}`;
  $("top-progress").textContent = "封面";
  document.title = state.book.title;
  highlightNav(null);
  setNavOpen(false);
}

function renderChapter(id) {
  const chapter = chapterById(id) || state.book.chapters[0];
  const root = document.querySelector(".app");
  root.dataset.view = "chapter";
  $("cover").hidden = true;
  $("chapter").hidden = false;
  $("chapter-kicker").textContent = `${chapter.volumeTitle} · ${chapter.chapterLabel}`;
  $("chapter-title").textContent = chapter.title;
  $("chapter-meta").textContent = formatCount(chapter.chars);
  const body = $("chapter-body");
  body.replaceChildren(
    ...chapter.paragraphs.map((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      return p;
    }),
  );

  const index = state.book.chapters.findIndex((item) => item.id === chapter.id);
  const prev = state.book.chapters[index - 1];
  const next = state.book.chapters[index + 1];
  bindPager($("prev-chapter"), prev, "上一章");
  bindPager($("next-chapter"), next, "下一章");
  $("top-progress").textContent = `${index + 1} / ${state.book.chapterCount}`;
  document.title = `${chapter.heading} · ${state.book.title}`;
  state.lastId = chapter.id;
  savePrefs();
  highlightNav(chapter.id);
  window.scrollTo(0, 0);
}

function bindPager(el, chapter, fallback) {
  if (!chapter) {
    el.textContent = fallback;
    el.href = "#/";
    el.setAttribute("aria-disabled", "true");
    return;
  }
  el.textContent = `${fallback} · ${chapter.title}`;
  el.href = `#/${chapter.id}`;
  el.removeAttribute("aria-disabled");
}

function highlightNav(id) {
  document.querySelectorAll(".chapter-list a").forEach((link) => {
    link.classList.toggle("active", Number(link.dataset.id) === id);
  });
}

function renderNav() {
  const list = $("chapter-list");
  list.replaceChildren(
    ...state.book.chapters.map((chapter) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#/${chapter.id}`;
      link.dataset.id = String(chapter.id);
      link.innerHTML = `<span class="n">${String(chapter.number).padStart(2, "0")}</span><span>${chapter.title}</span>`;
      item.appendChild(link);
      return item;
    }),
  );
}

function filterNav(query) {
  const q = query.trim();
  document.querySelectorAll(".chapter-list li").forEach((item) => {
    item.hidden = q !== "" && !item.textContent.includes(q);
  });
}

function route() {
  const id = parseRoute();
  if (id == null) {
    renderCover();
    return;
  }
  renderChapter(id);
}

async function boot() {
  loadPrefs();
  const res = await fetch("./data/book.json");
  if (!res.ok) {
    $("cover-blurb").textContent = "章节还没打出来。先在本机运行 python reader/build.py。";
    return;
  }
  state.book = await res.json();
  renderNav();
  route();
}

$("toggle-nav").addEventListener("click", () => {
  setNavOpen(!document.querySelector(".app").classList.contains("nav-open"));
});
$("nav-mask").addEventListener("click", () => setNavOpen(false));
$("chapter-filter").addEventListener("input", (event) => filterNav(event.target.value));
window.addEventListener("hashchange", route);
document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea")) return;
  const id = parseRoute();
  if (id == null) return;
  const index = state.book.chapters.findIndex((item) => item.id === id);
  if (event.key === "ArrowRight" && state.book.chapters[index + 1]) {
    location.hash = `#/${state.book.chapters[index + 1].id}`;
  }
  if (event.key === "ArrowLeft" && state.book.chapters[index - 1]) {
    location.hash = `#/${state.book.chapters[index - 1].id}`;
  }
});

boot();
