/* LarkShinnn — the floating islands of Ronova's domain (drawn in 3D by world3d.js)
   Live data: Huaxu (api.huaxu.app, player 26438993) and GitHub, fetched on load.
   Snapshot values below are the fallback when a request fails. */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Number(n).toLocaleString("en-US");
const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

/* ============================================================
   DATA
   ============================================================ */
const HUAXU = {
  player: "https://api.huaxu.app/servers/ap/players/26438993",
  asset: (path) => `https://assets.huaxu.app/glb/${path}.webp`,
};
const RANKS = { 1: "b", 2: "a", 3: "s", 4: "ss", 5: "sss", 6: "sssplus" };
const RANK_LABEL = { 1: "B", 2: "A", 3: "S", 4: "SS", 5: "SSS", 6: "SSS+" };

const PGR_ELEMENT = {
  void: { label: "Nihil", color: "#b8a6ff" },
  dark: { label: "Dark", color: "#d6455c" },
  physical: { label: "Physical", color: "#dcd6ca" },
};
const FRAMES = {
  luna:     { id: 1171004, name: "Luna", frame: "Oblivion", cls: "Annihilator", el: "void", power: 7940, weapon: "Reconstruction of Law", q: 5 },
  ishmael:  { id: 1321003, name: "Ishmael", frame: "Parhelion", cls: "Observer", el: "void", power: 5682, weapon: "Alpha-Omega", q: 5 },
  nirvatia: { id: 1391003, name: "Nirvatia", frame: "Dirge", cls: "Amplifier", el: "void", power: 4875, weapon: "Obituary for Yesterday", q: 5 },
  kurumi:   { id: 1411003, name: "Kurumi", frame: "Tokisaki", cls: "Attacker", el: "dark", power: 7415, weapon: "Hour & Minute", q: 5 },
  rosetta:  { id: 1141004, name: "Rosetta", frame: "Arete", cls: "Breaker", el: "dark", power: 6899, weapon: "Mirage Halberd: Amalga", q: 5 },
  adelyde:  { id: 1421003, name: "Adelyde", frame: "Anabasis", cls: "Overlinker", el: "dark", power: 7793, weapon: "Unforsaken Beacon", q: 5 },
  hanying:  { id: 1241003, name: "Hanying", frame: "Solacetune", cls: "Tank", el: "physical", power: 7783, weapon: "Dream Roamer", q: 5 },
};
const SQUADS = [
  { id: "nihil", name: "Nihil", color: PGR_ELEMENT.void.color, members: ["luna", "ishmael", "nirvatia"] },
  { id: "dark", name: "Dark", color: PGR_ELEMENT.dark.color, members: ["kurumi", "rosetta", "adelyde"] },
  { id: "slash", name: "True Slash", color: "#e6dfd2", members: ["rosetta", "hanying", "adelyde"] },
];

const GENSHIN_EL = { cryo: { label: "Cryo", color: "#9fd3e8" }, anemo: { label: "Anemo", color: "#7fcfb4" } };
const ROSTER = [
  { id: "skirk", name: "Skirk", el: "cryo", wt: "Sword", epi: "A student of the abyss, a blade that splits the stars.", art: "gacha_SkirkNew", icon: "side_SkirkNew", weapon: "Finale of the Deep", wl: "Lv 80 · R1", s: { hp: 18381, atk: 1817, def: 842, em: 77, cr: 51.7, cd: 202.4 } },
  { id: "sandrone", name: "Sandrone", el: "cryo", wt: "Claymore", epi: "A doll who refuses to be called a doll.", art: "gacha_MarionetteNew", icon: "side_MarionetteNew", weapon: "A Teaspoon of Transcendence", wl: "Lv 80 · R1", s: { hp: 18262, atk: 2272, def: 789, em: 103, cr: 55.2, cd: 227.8 } },
  { id: "odette", name: "Odette", el: "cryo", wt: "Sword", epi: "The last dance, right before the curtain falls.", art: "gacha_Odette", icon: "side_Odette", weapon: "Exaiphanes Blade", wl: "Lv 90 · R3", s: { hp: 19876, atk: 2401, def: 752, em: 16, cr: 57.1, cd: 193.8 } },
  { id: "mizuki", name: "Yumemizuki Mizuki", short: "Mizuki", el: "anemo", wt: "Catalyst", epi: "Keeper of dreams, who knows when to wake you.", art: "gacha_Mizuki", icon: "side_Mizuki", weapon: "Sacrificial Fragments", wl: "Lv 80 · R3", s: { hp: 18235, atk: 1128, def: 764, em: 740, cr: 59.8, cd: 131.6 } },
];

const ICONS = {
  cage: '<path d="M5 9a7 5 0 0 1 14 0v11H5z"/><path d="M9 6.5V20M12 4v16M15 6.5V20M5 14h14"/>',
  team: '<path d="M12 3l3 4-3 4-3-4z"/><path d="M6 11l3 4-3 4-3-4z"/><path d="M18 11l3 4-3 4-3-4z"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 7v4M11.5 7v4M14 7v4M8 10l7-2"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M10 9.5v5l4.5-2.5z"/><path d="M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  star: '<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
  send: '<path d="M21 3L3 10.5l7 2.5 2.5 7z"/><path d="M10 13l4-4"/>',
  crown: '<path d="M4 18h16M5 18 3.5 8l5 4L12 5l3.5 7 5-4L19 18"/><circle cx="12" cy="13.5" r="1.4"/>',
};

/* the sections of the site, one floating island each (positions live in tools/build_world.py) */
const POIS = [
  { id: "profile", short: "Profile", place: "Malder's Peak", icon: "cage" },
  { id: "runs", short: "Best Runs", place: "The Pain Cage Spire", icon: "crown" },
  { id: "team", short: "Fav Team", place: "Hall of the Chosen", icon: "team" },
  { id: "ledger", short: "Death Ledger", place: "Ronova's Archive", icon: "book" },
  { id: "amv", short: "AMV", place: "The Cutting Room", icon: "film" },
  { id: "dev", short: "Developer", place: "Compiler Tundra", icon: "code" },
  { id: "teyvat", short: "Teyvat", place: "Border of Teyvat", icon: "star" },
  { id: "contact", short: "Contact", place: "The Last Outpost", icon: "send" },
];

/* ============================================================
   TITLE SCREEN
   ============================================================ */
document.body.classList.add("on-title");
let c = 0;
$$("[data-split]").forEach((line) => {
  const text = line.textContent;
  line.textContent = "";
  line.setAttribute("aria-hidden", "true");
  [...text].forEach((ch) => {
    const s = document.createElement("span");
    s.className = "ch";
    s.style.setProperty("--c", c++);
    s.textContent = ch;
    line.appendChild(s);
  });
});
/* the day in the broken face drawn in VectorCraft (assets/ronova/title/glyph-*.svg), date and hour */
const clockDay = $("[data-clock-day]"), clockDate = $("[data-clock-date]"), clockTime = $("[data-clock-time]");
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
let shownDay = -1;
function tickClock() {
  const now = new Date(), d = now.getDay();
  if (d !== shownDay) {
    shownDay = d;
    const name = DAYS[d];
    clockDay.replaceChildren(...[...name].map((ch, i) => {
      const img = new Image();
      img.src = `assets/ronova/title/glyph-${ch}.svg`;
      img.alt = ""; img.style.setProperty("--i", i);
      return img;
    }));
    clockDay.setAttribute("aria-label", name[0] + name.slice(1).toLowerCase());
    clockDay.parentElement.style.setProperty("--glen", (name.length * 1.32).toFixed(2));
    clockDate.textContent = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }
  const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");
  clockTime.innerHTML = `-${hh}<b>:</b>${mm}-`;
  clockTime.setAttribute("aria-label", `${hh}:${mm}`);
}
tickClock();
setInterval(() => { if (document.body.classList.contains("on-title")) tickClock(); }, 1000 * 5);

requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("is-ready")));

/* embers drifting up through the title screen */
const embers = $("[data-embers]");
if (embers && !reduceMotion && embers.getContext) {
  const ctx = embers.getContext("2d");
  let w = 0, h = 0, parts = [];
  const spawn = (fresh) => ({
    x: Math.random() * w, y: fresh ? Math.random() * h : h + 10,
    vy: 0.12 + Math.random() * 0.45, vx: (Math.random() - 0.5) * 0.15,
    len: Math.random() < 0.6 ? 2 + Math.random() * 7 : 0,          // streak or dot
    r: 0.5 + Math.random() * 1.1, ph: Math.random() * 6.28, sp: 0.01 + Math.random() * 0.03,
    hot: Math.random() < 0.7,
  });
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = embers.clientWidth; h = embers.clientHeight;
    embers.width = w * dpr; embers.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(110, (w * h) / 16000));
    while (parts.length < n) parts.push(spawn(true));
    parts.length = n;
  };
  const frame = () => {
    if (!document.body.classList.contains("on-title")) return;     // stops once the world is entered
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.y -= p.vy; p.x += p.vx + Math.sin(p.ph) * 0.12; p.ph += p.sp;
      if (p.y < -12) Object.assign(p, spawn(false));
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(p.ph * 1.7));
      if (p.len) {
        ctx.strokeStyle = p.hot ? `rgba(255,140,60,${a})` : `rgba(255,96,80,${a * 0.8})`;
        ctx.lineWidth = p.r; ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * p.len * 4, p.y + p.len); ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(255,238,230,${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.8, 0, 6.283); ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  };
  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
}

/* the portrait drifts a little with the pointer */
const artStage = $("[data-art-stage]");
if (artStage && finePointer && !reduceMotion) {
  let raf = 0, mx = 0, my = 0;
  window.addEventListener("pointermove", (e) => {
    if (!document.body.classList.contains("on-title")) return;
    mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; artStage.style.setProperty("--px", `${(-mx * 22).toFixed(1)}px`); artStage.style.setProperty("--py", `${(-my * 14).toFixed(1)}px`); });
  }, { passive: true });
}

function enterWorld() {
  if (!document.body.classList.contains("on-title")) return;
  document.body.classList.remove("on-title");
  $("[data-world]").removeAttribute("aria-hidden");
  $("[data-title]").setAttribute("aria-hidden", "true");
  $("[data-world-btn]").focus({ preventScroll: true });
  startLoop();
}
$("[data-enter]").addEventListener("click", enterWorld);

/* ============================================================
   WORLD — the floating islands are drawn by world3d.js. This part keeps which island the
   wisp is on, the input, and the place labels. Without WebGL the dock still opens every
   section directly.
   ============================================================ */
const world = $("[data-world]");
// world3d.js sets this once the 3D world is ready: { camera(snap), click(e), travel(poi, open), home(), zoomBy(f) }
let view = null;
let here = "spawn";                    // the island the wisp is on: "spawn" (Requiem Square) or a POI id
const keys = new Set();

// place labels; world3d.js floats them over their islands
const poiEls = POIS.map((p) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "poi";
  b.tabIndex = -1;
  b.innerHTML = `<span class="poi__ring"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[p.icon]}</svg></span><span class="poi__label">${p.place}</span>`;
  b.addEventListener("click", (e) => { e.stopPropagation(); travelTo(p, true); });
  return b;
});

// input: W/A/S/D and the arrows orbit and zoom the view (read by world3d.js each frame)
const VIEW_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (document.body.classList.contains("on-title")) {
    if (!["tab", "shift", "control", "alt", "meta"].includes(k) && e.target === document.body) { e.preventDefault(); enterWorld(); }
    return;
  }
  if (openPanel) { if (k === "escape") closePanel(); else if (k === "tab") trapFocus(e); return; }
  if (e.target.closest && e.target.closest("input, textarea")) return;
  if (VIEW_KEYS.has(k)) { keys.add(k); e.preventDefault(); }
  else if (k === "e" || (k === "enter" && e.target === document.body)) { if (nearPoi) { e.preventDefault(); openSection(nearPoi.id); } }
  else if (/^[1-9]$/.test(k) && POIS[+k - 1]) { travelTo(POIS[+k - 1], true); }
  else if (k === "+" || k === "=") view?.zoomBy(0.9);
  else if (k === "-") view?.zoomBy(1.1);
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());
world.addEventListener("click", (e) => { if (!openPanel) view?.click(e); });
world.addEventListener("wheel", (e) => {
  if (!view) return;
  e.preventDefault();
  view.zoomBy(e.deltaY > 0 ? 1.08 : 0.92);
}, { passive: false });

function travelTo(p, open) {
  if (openPanel) closePanel(true);
  if (document.body.classList.contains("on-title")) enterWorld();
  if (view) return view.travel(p, open);            // the wisp flies to the island, then arrive()
  arrive(p.id);
  if (open) openSection(p.id);
}

// arriving at an island: the "E · Enter" prompt and the highlighted label
let nearPoi = null;
const prompt = $("[data-prompt]"), promptText = $("[data-prompt-text]");
prompt.addEventListener("click", () => nearPoi && openSection(nearPoi.id));
function arrive(id) {
  here = id;
  nearPoi = POIS.find((p) => p.id === id) || null;
  poiEls.forEach((el, i) => el.classList.toggle("is-near", POIS[i] === nearPoi));
  if (nearPoi) promptText.textContent = `Enter · ${nearPoi.short}`;
  prompt.classList.toggle("is-on", !!nearPoi && !openPanel);
}

// frame loop: world3d.js draws once it is ready
let looping = false;
function startLoop() { if (looping) return; looping = true; requestAnimationFrame(tick); }
function tick() {
  if (view) view.camera(reduceMotion);
  requestAnimationFrame(tick);
}

/* ============================================================
   DOCK + PANELS
   ============================================================ */
const dock = $("#dock");
const dockBtns = {};
POIS.forEach((p, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "dock__btn";
  b.setAttribute("aria-label", `${p.short} (${i + 1})`);
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[p.icon]}</svg><span>${p.short}</span>`;
  b.addEventListener("click", () => travelTo(p, true));
  dock.appendChild(b);
  dockBtns[p.id] = b;
});
const worldBtn = $("[data-world-btn]");
worldBtn.addEventListener("click", () => { if (openPanel) closePanel(); else if (view) view.home(); });
$$("[data-open]").forEach((b) => b.addEventListener("click", () => openSection(b.dataset.open)));

let openPanel = null, lastFocus = null;
const scrim = $("[data-scrim]");
scrim.addEventListener("click", () => closePanel());
$$("[data-close]").forEach((b) => b.addEventListener("click", () => closePanel()));

function setActiveDock(id) {
  worldBtn.classList.toggle("is-active", !id);
  Object.entries(dockBtns).forEach(([k, b]) => b.classList.toggle("is-active", k === id));
}
function openSection(id) {
  const panel = $(`[data-panel="${id}"]`);
  if (!panel) return;
  if (openPanel) closePanel(true);
  lastFocus = document.activeElement;
  openPanel = panel;
  keys.clear();
  scrim.hidden = false;
  panel.hidden = false;
  prompt.classList.remove("is-on");
  setActiveDock(id);
  history.replaceState(null, "", `#${id}`);
  (panel.querySelector("[data-close]") || panel).focus({ preventScroll: true });
  SECTION_OPEN[id]?.();
}
function closePanel(silent) {
  if (!openPanel) return;
  const id = openPanel.dataset.panel;
  openPanel.hidden = true;
  openPanel = null;
  scrim.hidden = true;
  SECTION_CLOSE[id]?.();
  setActiveDock(null);
  history.replaceState(null, "", location.pathname + location.search);
  if (!silent) { (lastFocus && document.contains(lastFocus) ? lastFocus : worldBtn).focus({ preventScroll: true }); prompt.classList.toggle("is-on", !!nearPoi); }
}
function trapFocus(e) {
  const f = $$('a[href], button:not([disabled]), [tabindex="0"]', openPanel).filter((el) => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], lastEl = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
  else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
}
const SECTION_OPEN = { team: () => { loadFrameDetails(); }, amv: () => mountReels(true), dev: () => loadRepos(), runs: () => refreshRuns() };
const SECTION_CLOSE = { amv: () => mountReels(false) };

/* ============================================================
   LIVE: HUAXU PROFILE
   ============================================================ */
const syncEl = $("[data-sync]"), syncText = $("[data-sync-text]"), syncCard = $("[data-sync-card]");
const setAll = (sel, fn) => $$(sel).forEach(fn);
let liveChars = null;

async function loadProfile() {
  try {
    const res = await fetch(HUAXU.player, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(res.status);
    const { data } = await res.json();
    const p = data.player;
    setAll("[data-live-name]", (el) => { el.textContent = p.name; });
    setAll("[data-live-sign]", (el) => { el.textContent = p.sign ? `“${p.sign}”` : ""; });
    setAll("[data-live-level]", (el) => { el.textContent = p.level; });
    setAll("[data-live-guild]", (el) => { el.textContent = p.guildName || "—"; });
    setAll("[data-live-rating]", (el) => { el.textContent = fmt(data.characterRating); });
    setAll("[data-live-owned]", (el) => { el.textContent = data.characters.filter((c) => c.acquired).length; });
    if (p.portrait) setAll("[data-live-avatar]", (el) => { el.src = HUAXU.asset(p.portrait); });
    if (p.frame) setAll("[data-live-frame]", (el) => { el.src = HUAXU.asset(p.frame); });
    const badge = $("[data-live-badge]");
    if (p.nameplate?.icon) { badge.hidden = false; badge.src = HUAXU.asset(p.nameplate.icon); }
    else badge.hidden = true;                       // nothing equipped: show nothing
    liveChars = new Map(data.characters.map((c) => [c.id, c]));
    Object.values(FRAMES).forEach((f) => { const lc = liveChars.get(f.id); if (lc) f.q = lc.quality; });
    renderSquad();
    const when = data.updatedAt ? new Date(data.updatedAt) : new Date();
    const ago = relTime(when);
    syncEl.classList.add("is-live");
    syncText.textContent = `Live from Huaxu · updated ${ago}`;
    syncCard.textContent = `Live · updated ${ago}`;
  } catch {
    syncEl.classList.add("is-off");
    syncText.textContent = "Offline · snapshot 12 Nov 2026";
  }
}
function relTime(d) {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
let detailsLoaded = false;
async function loadFrameDetails() {
  if (detailsLoaded) return;
  detailsLoaded = true;
  await Promise.all(Object.values(FRAMES).map(async (f) => {
    try {
      const r = await fetch(`${HUAXU.player}/characters/${f.id}`);
      if (!r.ok) return;
      const { data } = await r.json();
      if (data.weapon?.name) f.weapon = data.weapon.name;
      if (data.character?.bp) f.power = Math.round(data.character.bp);
      if (data.character?.quality) f.q = data.character.quality;
    } catch { /* keep snapshot */ }
  }));
  renderSquad();
}
loadProfile();

/* ============================================================
   BEST RUNS — snapshot of every top-100 week, newest weeks re-checked live
   ============================================================ */
const RUNS = window.BEST_RUNS || { modes: [] };
const ME_ID = 26438993;
const ROMAN = ["I", "II", "III"];
const MODE_PATH = {
  ppc: (w) => `https://api.huaxu.app/servers/ap/ppc/${w}/4?ranking=true`,
  hero: (w) => `https://api.huaxu.app/servers/ap/warzone/${w}/15`,
  legend: (w) => `https://api.huaxu.app/servers/ap/warzone/${w}/16`,
};
const fmtDate = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const escHtml = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

function entryFrom(mode, data, week) {
  const rows = data.rankings || data.ranking || [];
  const r = rows.find((x) => x.player?.id === ME_ID);
  if (!r) return null;
  const meta = data.warzone || data.ppc || {};
  const base = { week, rank: r.rank, score: r.score, members: meta.members, start: (meta.start || "").slice(0, 10), end: (meta.end || "").slice(0, 10), live: meta.end ? new Date(meta.end) > new Date() : false };
  if (mode === "ppc") return { ...base, bosses: (meta.bosses || []).map((b) => ({ name: b.name, icon: b.icon })) };
  const zname = Object.fromEntries(((meta.area || {}).zones || []).map((z) => [z.id, z.name]));
  return { ...base, zones: (r.zones || []).map((z) => ({ name: zname[z.id] || "", score: z.score, team: (z.characters || []).map((c) => ({ name: c.characterName, frame: c.frameName, icon: c.icon })) })) };
}

function renderRuns() {
  const el = $("[data-runs]");
  el.innerHTML = RUNS.modes.map((m) => {
    const top = [...m.top].sort((a, b) => b.score - a.score).slice(0, 3);
    return `<article class="runs__mode">
      <header class="runs__head">
        <h3 class="runs__title">${m.title} <em>${m.tier}</em></h3>
        <dl class="runs__stats">
          <div><dt>Weeks in top 100</dt><dd>${m.weekSet.length}</dd></div>
          <div><dt>Best rank</dt><dd>#${m.bestRank.rank}</dd></div>
        </dl>
      </header>
      <ol class="runs__list">${top.map((e, i) => `
        <li class="run${i === 0 ? " run--first" : ""}">
          <span class="run__num" aria-hidden="true">${ROMAN[i]}</span>
          <div class="run__main">
            <p class="run__score">${fmt(e.score)}${e.live ? '<span class="run__live">This week</span>' : ""}</p>
            <p class="run__meta">Rank <b>#${e.rank}</b> of ${fmt(e.members)} · ${fmtDate(e.start)} · week ${e.week}</p>
            ${e.bosses ? `<ul class="run__bosses" aria-label="Bosses">${e.bosses.map((b) => `<li><img src="${HUAXU.asset(b.icon)}" alt="" width="34" height="34" loading="lazy" /><span>${escHtml(b.name)}</span></li>`).join("")}</ul>` : ""}
            ${e.zones ? `<ul class="run__zones">${e.zones.map((z) => `<li>
                <span class="run__zone">${escHtml(z.name)}</span>
                <span class="run__team">${z.team.map((c) => `<img src="${HUAXU.asset(c.icon)}" alt="${escHtml(c.name)}: ${escHtml(c.frame)}" title="${escHtml(c.name)}: ${escHtml(c.frame)}" width="28" height="28" loading="lazy" />`).join("")}</span>
                <span class="run__zscore">${fmt(z.score)}</span>
              </li>`).join("")}</ul>` : ""}
          </div>
        </li>`).join("")}
      </ol>
    </article>`;
  }).join("");
}
renderRuns();

let runsRefreshed = false;
async function refreshRuns() {
  if (runsRefreshed) return;
  runsRefreshed = true;
  let changed = false;
  await Promise.all(RUNS.modes.map(async (m) => {
    const path = MODE_PATH[m.key];
    if (!path) return;
    try {
      const first = await (await fetch(path(m.lastWeek))).json();
      const max = Math.min(first.data?.activities?.max || m.lastWeek, m.lastWeek + 6);
      const weeks = [[m.lastWeek, first.data]];
      for (let w = m.lastWeek + 1; w <= max; w++) {
        const d = await (await fetch(path(w))).json();
        if (d.data) weeks.push([w, d.data]);
      }
      weeks.forEach(([w, data]) => {
        const e = entryFrom(m.key, data, w);
        if (!e) return;
        m.top = m.top.filter((x) => x.week !== w).concat(e);
        if (!m.weekSet.includes(w)) m.weekSet.push(w);
        if (e.rank < m.bestRank.rank) m.bestRank = { rank: e.rank, week: w, start: e.start, score: e.score };
        changed = true;
      });
    } catch { /* keep the snapshot */ }
  }));
  if (changed) renderRuns();
  $("[data-runs-note]").textContent = "Top 100 rankings from Huaxu, scanned back to the oldest week available. The newest weeks are checked live.";
}

/* ============================================================
   FAV TEAM
   ============================================================ */
const squadTabsEl = $("[data-squad-tabs]"), squadEl = $("[data-squad]");
let squadIdx = 0;
const squadTabs = SQUADS.map((sq, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "squad-tab"; b.id = `sq-${sq.id}`;
  b.setAttribute("role", "tab"); b.setAttribute("aria-controls", "squad-panel");
  b.style.setProperty("--sq", sq.color);
  b.innerHTML = `<span class="heads">${sq.members.map((m) => `<img src="assets/pgr/head_${m}.webp" alt="" width="32" height="32" />`).join("")}</span>${sq.name}`;
  b.addEventListener("click", () => { squadIdx = i; renderSquad(true); });
  b.addEventListener("keydown", (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault(); e.stopPropagation();
    squadIdx = (i + d + SQUADS.length) % SQUADS.length; renderSquad(true); squadTabs[squadIdx].focus();
  });
  squadTabsEl.appendChild(b);
  return b;
});
squadEl.id = "squad-panel";
function renderSquad(animate = false) {
  const sq = SQUADS[squadIdx];
  squadTabs.forEach((t, k) => { t.setAttribute("aria-selected", String(k === squadIdx)); t.tabIndex = k === squadIdx ? 0 : -1; });
  squadEl.setAttribute("aria-labelledby", squadTabs[squadIdx].id);
  squadEl.innerHTML = sq.members.map((id, k) => {
    const f = FRAMES[id], el = PGR_ELEMENT[f.el], rk = RANKS[f.q] || "s";
    return `<article class="member" tabindex="0" style="--sq:${el.color};--k:${animate ? k : 0}" aria-label="${f.name}: ${f.frame}, rank ${RANK_LABEL[f.q] || ""}">
      <img src="assets/pgr/${id}.webp" alt="" width="900" height="972" loading="lazy" />
      <div class="member__info">
        <span class="member__el">${el.label} · ${f.cls}</span>
        <div class="member__head"><h3 class="member__name">${f.name}</h3><img class="rank" src="assets/rank/${rk}.webp" alt="${RANK_LABEL[f.q] || ""} rank" height="30" /></div>
        <p class="member__frame">${f.frame}</p>
        <div class="member__meta"><div><dl>
          <div><dt>Weapon</dt><dd>${f.weapon}</dd></div>
          <div><dt>Power</dt><dd>${fmt(f.power)}</dd></div>
        </dl></div></div>
      </div>
    </article>`;
  }).join("");
}
renderSquad();

/* ============================================================
   DEATH LEDGER
   ============================================================ */
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const VERDICTS = [
  [0, "Nobody has died yet. Suspicious."],
  [1, "Warming up. Nothing to worry about."],
  [5, "Palms are getting sweaty."],
  [15, "The hairline is retreating."],
  [30, "Malding has officially begun."],
  [60, "Ronova stopped writing. She's tired."],
];
const tallyEl = $("[data-tally]"), deathsEl = $("[data-deaths]"), verdictEl = $("[data-verdict]");
let deaths = Math.max(0, parseInt(store.get("lark-deaths") || "0", 10) || 0);
function renderTally(animateLast) {
  tallyEl.textContent = "";
  const shown = Math.min(deaths, 60);
  for (let g = 0; g < Math.ceil(shown / 5); g++) {
    const grp = document.createElement("span");
    grp.className = "group";
    const n = Math.min(5, shown - g * 5);
    for (let m = 0; m < Math.min(n, 4); m++) { const mk = document.createElement("i"); mk.className = "mark"; grp.appendChild(mk); }
    if (n === 5) { const sl = document.createElement("i"); sl.className = "slash"; grp.appendChild(sl); }
    tallyEl.appendChild(grp);
  }
  const strokes = $$(".mark, .slash", tallyEl);
  strokes.forEach((el, i) => {
    if (animateLast && i === strokes.length - 1) return;
    el.style.animation = "none";
    if (el.classList.contains("slash")) el.style.transform = "rotate(-24deg)";
  });
  if (deaths > 60) { const more = document.createElement("span"); more.className = "more"; more.textContent = `+${deaths - 60}`; tallyEl.appendChild(more); }
  deathsEl.textContent = fmt(deaths);
  verdictEl.textContent = VERDICTS.filter(([n]) => deaths >= n).pop()[1];
}
renderTally(false);
$("[data-retry]").addEventListener("click", () => { deaths++; store.set("lark-deaths", deaths); renderTally(true); });
$("[data-reset]").addEventListener("click", () => { deaths = 0; store.set("lark-deaths", 0); renderTally(false); say("Ledger cleared. Ronova sighs in relief."); });

/* ============================================================
   AMV — self-hosted renders (assets/amv/cut-NN.mp4). TikTok's embed player is rate-limited
   and often shows "Server error" / 429, so it is not used; a missing file falls back to a
   card that links to the post on TikTok.
   ============================================================ */
const AMVS = ["7697824930443971860", "7694600326791384328", "7658971051820453140"];
const reelsEl = $("[data-reels]");
const tiktokUrl = (id) => `https://www.tiktok.com/@larkshinnn/video/${id}`;
const ARROW = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>`;
reelsEl.innerHTML = AMVS.map((id, i) => {
  const n = String(i + 1).padStart(2, "0");
  return `
  <figure class="reel">
    <div class="reel__frame" data-reel="${n}">
      <a class="reel__fallback" href="${tiktokUrl(id)}" target="_blank" rel="noopener noreferrer">
        <img src="assets/ronova/title/title-mark.svg" alt="" width="160" height="84" />
        <span class="reel__fallback-cut">Cut ${n}</span>
        <span class="reel__fallback-cta">Watch on TikTok ${ARROW}</span>
      </a>
    </div>
    <figcaption class="reel__cap">
      <span class="reel__num">Cut ${n}</span>
      <a href="${tiktokUrl(id)}" target="_blank" rel="noopener noreferrer">TikTok ${ARROW}</a>
    </figcaption>
  </figure>`;
}).join("");

// videos load only while the panel is open, and pause on close
function mountReels(on) {
  $$("[data-reel]", reelsEl).forEach((frame, i) => {
    let v = frame.querySelector("video");
    if (!on) { if (v) v.pause(); return; }
    if (v || frame.classList.contains("is-missing")) return;
    v = document.createElement("video");
    v.src = `assets/amv/cut-${frame.dataset.reel}.mp4#t=0.1`;    // #t shows a frame as the poster
    v.preload = "metadata"; v.controls = true; v.playsInline = true;
    v.setAttribute("aria-label", `AMV cut ${i + 1}`);
    v.addEventListener("loadeddata", () => frame.classList.add("is-loaded"), { once: true });
    v.addEventListener("error", () => { frame.classList.add("is-missing"); frame.removeChild(v); }, { once: true });
    v.addEventListener("play", () => $$("video", reelsEl).forEach((o) => o !== v && o.pause()));
    frame.appendChild(v);
  });
}

/* ============================================================
   DEVELOPER: live repos
   ============================================================ */
const LANG = { JavaScript: "#e8d36b", TypeScript: "#5b8fd6", Vue: "#5fbf8f", HTML: "#e0734f", CSS: "#8a6fd1", Python: "#5a8fc2", Dart: "#4fb3c9", PHP: "#8892bf" };
let reposLoaded = false;
async function loadRepos() {
  if (reposLoaded) return;
  reposLoaded = true;
  try {
    const r = await fetch("https://api.github.com/users/Larkshinnn/repos?sort=updated&per_page=20");
    if (!r.ok) return;
    const repos = (await r.json()).filter((x) => !x.fork);
    if (!repos.length) return;
    const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    $("[data-repos]").innerHTML = repos.map((x) => `<li><a href="${esc(x.html_url)}" target="_blank" rel="noopener noreferrer">
      <span class="repos__name">${esc(x.name)}${x.description ? `<span class="repos__desc">${esc(x.description)}</span>` : ""}</span>
      <span class="repos__lang">${x.language ? `<i style="--c:${LANG[x.language] || "#8f8a97"}"></i>${esc(x.language)}` : ""}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a></li>`).join("");
  } catch { /* keep static list */ }
}

/* ============================================================
   TEYVAT SHOWCASE
   ============================================================ */
const stage = $(".stage"), rosterEl = $("[data-roster]"), gpanel = $("[data-gpanel]"), art = $("[data-art]"), ghost = $("[data-ghost]");
const gtabs = ROSTER.map((ch, i) => {
  const b = document.createElement("button");
  b.className = "tab"; b.type = "button"; b.id = `tab-${ch.id}`;
  b.setAttribute("role", "tab"); b.setAttribute("aria-label", ch.name); b.setAttribute("aria-controls", "showcase-panel");
  b.style.setProperty("--tab-el", GENSHIN_EL[ch.el].color);
  b.innerHTML = `<img src="assets/img/${ch.icon}.webp" alt="" width="128" height="128" />`;
  b.addEventListener("click", () => gselect(i, true));
  b.addEventListener("keydown", (e) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    e.preventDefault(); e.stopPropagation();
    const n = (i + d + ROSTER.length) % ROSTER.length; gselect(n, true); gtabs[n].focus();
  });
  rosterEl.appendChild(b);
  return b;
});
gpanel.id = "showcase-panel";
let gcur = -1;
function gselect(i, animate) {
  if (i === gcur) return;
  gcur = i;
  const ch = ROSTER[i], el = GENSHIN_EL[ch.el], s = ch.s;
  gtabs.forEach((t, k) => { t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; });
  gpanel.setAttribute("aria-labelledby", gtabs[i].id);
  stage.style.setProperty("--el", el.color);
  const src = `assets/img/${ch.art}.webp`;
  art.alt = `Splash art of ${ch.name}`;
  if (!animate || reduceMotion) art.src = src;
  else {
    art.classList.add("is-out");
    setTimeout(() => { art.src = src; art.classList.remove("is-out"); art.classList.add("is-in-start"); requestAnimationFrame(() => requestAnimationFrame(() => art.classList.remove("is-in-start"))); }, 280);
  }
  ghost.textContent = ch.short || ch.name;
  gpanel.innerHTML = `
    <p class="p-el gfade" style="--d:0">${el.label} · ${ch.wt}</p>
    <h3 class="p-name gfade" style="--d:1">${ch.name}</h3>
    <p class="p-epi gfade" style="--d:2">${ch.epi}</p>
    <div class="p-weapon gfade" style="--d:3"><span class="v">${ch.weapon}</span><span class="k">${ch.wl}</span></div>
    <dl class="stats gfade" style="--d:4">
      <div class="stat"><dt>HP</dt><dd>${fmt(s.hp)}</dd></div><div class="stat"><dt>ATK</dt><dd>${fmt(s.atk)}</dd></div>
      <div class="stat"><dt>DEF</dt><dd>${fmt(s.def)}</dd></div><div class="stat"><dt>EM</dt><dd>${fmt(s.em)}</dd></div>
      <div class="stat"><dt>Crit Rate</dt><dd>${s.cr.toFixed(1)}%</dd></div><div class="stat"><dt>Crit DMG</dt><dd>${s.cd.toFixed(1)}%</dd></div>
    </dl>`;
}
gselect(0, false);

/* ============================================================
   MISC
   ============================================================ */
const toast = $("[data-toast]");
let toastTimer;
function say(msg) { toast.textContent = msg; toast.classList.add("is-on"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2200); }
$$("[data-copy]").forEach((btn) => btn.addEventListener("click", async () => {
  const v = btn.dataset.copy;
  try { await navigator.clipboard.writeText(v); say(`UID ${v} copied`); } catch { say(`UID: ${v}`); }
}));
const stay = $("[data-stay]"), born = Date.now();
setInterval(() => { const s = Math.floor((Date.now() - born) / 1000); stay.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }, 1000);

// deep link: #team etc. starts on that island with its panel open; #map skips the title screen
const hashId = location.hash.slice(1);
if (POIS.some((p) => p.id === hashId)) { arrive(hashId); enterWorld(); openSection(hashId); }
else if (hashId === "map") enterWorld();

/* ============================================================
   FALLING FEATHERS AND SNOW
   ============================================================ */
const canvas = $(".feathers");
if (!reduceMotion && canvas.getContext) {
  const ctx = canvas.getContext("2d");
  const featherImg = new Image();
  featherImg.src = "assets/ronova/vector/ronova-feather.png";
  let w, h, items = [], running = true;
  const spawn = (fresh) => {
    const kind = Math.random();
    return {
      snow: kind < 0.55, red: kind > 0.82,
      x: Math.random() * w, y: fresh ? Math.random() * h : -30,
      len: 7 + Math.random() * 12, r: 0.6 + Math.random() * 1.6,
      vy: 0.2 + Math.random() * 0.4, sway: Math.random() * 6.28, ss: 0.006 + Math.random() * 0.01,
      rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.01,
      a: 0.15 + Math.random() * 0.35,
    };
  };
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(80, (w * h) / 22000));
    while (items.length < n) items.push(spawn(true));
    items.length = n;
  };
  const draw = () => {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const f of items) {
      f.sway += f.ss; f.y += f.vy; f.x += Math.sin(f.sway) * 0.4; f.rot += f.spin + Math.cos(f.sway) * 0.004;
      if (f.y > h + 30) Object.assign(f, spawn(false));
      if (f.snow) {
        ctx.globalAlpha = f.a; ctx.fillStyle = "#dfe8f0";
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
        continue;
      }
      if (featherImg.complete && featherImg.naturalWidth) {   // Ronova's wing blade, drawn in VectorCraft
        const fh = f.len * 2.4, fw = fh / 2;
        ctx.globalAlpha = Math.min(1, f.a + (f.red ? 0.35 : 0.15));
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
        ctx.drawImage(featherImg, -fw / 2, -fh / 2, fw, fh);
        ctx.restore();
        continue;
      }
      const col = f.red ? "194,66,83" : "120,112,128";
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.fillStyle = `rgba(${col},${f.a + 0.1})`;
      ctx.beginPath(); ctx.moveTo(-f.len, 0);
      ctx.quadraticCurveTo(-f.len * 0.15, -f.len * 0.5, f.len, 0);
      ctx.quadraticCurveTo(-f.len * 0.1, f.len * 0.34, -f.len, 0); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${Math.min(1, f.a + 0.3)})`; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-f.len * 1.25, 0); ctx.lineTo(f.len * 0.9, 0); ctx.stroke();
      ctx.restore();
    }
    requestAnimationFrame(draw);
  };
  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) requestAnimationFrame(draw); });
  requestAnimationFrame(draw);
}
