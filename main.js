/* LarkShinnn — explorable Snezhnaya
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

/* map units: the generated map is 1000 wide */
const POIS = [
  { id: "profile", short: "Profile", place: "Malder's Peak", x: 175, y: 300, icon: "cage" },
  { id: "runs", short: "Best Runs", place: "The Pain Cage Spire", x: 250, y: 330, icon: "crown" },
  { id: "team", short: "Fav Team", place: "Hall of the Chosen", x: 330, y: 225, icon: "team" },
  { id: "ledger", short: "Death Ledger", place: "Ronova's Archive", x: 405, y: 365, icon: "book" },
  { id: "amv", short: "AMV", place: "The Cutting Room", x: 560, y: 190, icon: "film" },
  { id: "dev", short: "Developer", place: "Compiler Tundra", x: 705, y: 232, icon: "code" },
  { id: "teyvat", short: "Teyvat", place: "Border of Teyvat", x: 845, y: 175, icon: "star" },
  { id: "contact", short: "Contact", place: "The Last Outpost", x: 880, y: 255, icon: "send" },
];
const SPAWN = { x: 458, y: 262, place: "Requiem Square" };

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
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("is-ready")));

function buildWing(g) {
  const flap = svgEl("g", { class: "flap" });
  const feather = (x, y, ang, len, wid, op, hole) => {
    const f = svgEl("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})` });
    f.append(
      svgEl("path", { class: "feather", opacity: op.toFixed(2), d: `M0 0 Q${len * 0.4} ${-wid} ${len} 0 Q${len * 0.5} ${wid * 0.65} 0 0Z` }),
      svgEl("path", { class: "feather-spine", d: `M4 0 L${len * 0.9} 0` })
    );
    if (hole) {
      const hx = len * 0.62, rx = wid * 0.9, ry = wid * 0.4;
      f.append(
        svgEl("path", { class: "feather-hole", d: `M${hx - rx} 0 Q${hx} ${-ry * 2} ${hx + rx} 0 Q${hx} ${ry * 2} ${hx - rx} 0Z` }),
        svgEl("circle", { class: "feather-hole-ring", cx: hx, cy: 0, r: ry * 0.75 })
      );
    }
    flap.appendChild(f);
  };
  const bone = (t) => [150 + 240 * t, -20 - 230 * t + 70 * t * t];
  for (let i = 14; i >= 0; i--) { const t = i / 14; const [x, y] = bone(t); feather(x, y, 100 - 78 * t, 110 + 250 * t, 15 + 6 * t, 0.62 + 0.38 * t, i % 3 === 1 && t > 0.3); }
  for (let i = 10; i >= 0; i--) { const t = i / 10; const [x, y] = bone(t * 0.95); feather(x - 4, y - 4, 70 - 50 * t, 60 + 70 * t, 12, 0.95, false); }
  g.appendChild(flap);
}
$$("[data-wing]").forEach(buildWing);

const look = $("[data-look]");
if (look && finePointer && !reduceMotion) {
  const sigil = $(".sigil");
  window.addEventListener("pointermove", (e) => {
    if (!document.body.classList.contains("on-title")) return;
    const r = sigil.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1, k = Math.min(d / 400, 1);
    look.style.transform = `translate(${(dx / d) * 48 * k}px, ${(dy / d) * 22 * k}px)`;
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
   MAP
   ============================================================ */
const MAP = window.SNEZHNAYA;
const SCALE = 3;                       // map unit -> px at zoom 1
const MW = MAP.w * SCALE, MH = MAP.h * SCALE;
const mapSvg = $("[data-map]");
mapSvg.setAttribute("viewBox", `0 0 ${MAP.w} ${MAP.h}`);
mapSvg.setAttribute("width", MW);
mapSvg.setAttribute("height", MH);

MAP.sea.forEach((ring, i) => ring.forEach((d) => mapSvg.appendChild(svgEl("path", { d, class: `m-sea${i ? ` m-sea--${i + 1}` : ""}` }))));
const fogPath = svgEl("path", { d: MAP.fog.join(" "), class: "m-fog" });
mapSvg.appendChild(fogPath);
const coastD = MAP.coast.join(" ");
mapSvg.appendChild(svgEl("path", { d: coastD, class: "m-land" }));
MAP.topo.forEach((lvl, i) => lvl.forEach((d) => mapSvg.appendChild(svgEl("path", { d, class: "m-topo", style: `stroke-opacity:${(0.5 + i * 0.12).toFixed(2)}` }))));
const coastPath = svgEl("path", { d: coastD, class: "m-coast" });
mapSvg.appendChild(coastPath);
mapSvg.appendChild(Object.assign(svgEl("text", { x: 520, y: 470, class: "m-label", "font-size": 64 }), { textContent: "SNEZHNAYA" }));

// peaks on the highest contour rings
requestAnimationFrame(() => {
  const top = MAP.topo[MAP.topo.length - 1];
  top.forEach((d) => {
    const p = svgEl("path", { d });
    mapSvg.appendChild(p);
    const b = p.getBBox();
    p.remove();
    if (b.width < 6) return;
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    mapSvg.appendChild(svgEl("path", { class: "m-peak", d: `M${cx - 9} ${cy + 5} L${cx - 2} ${cy - 6} L${cx + 2} ${cy - 1} L${cx + 5} ${cy - 4} L${cx + 11} ${cy + 5}` }));
  });
});

// Ronova's marks scattered over the land: little eyes with star pupils
[[245, 245], [470, 245], [620, 215], [780, 205], [930, 200], [360, 290]].forEach(([x, y]) => {
  const g = svgEl("g", { transform: `translate(${x} ${y})` });
  g.append(svgEl("path", { class: "m-mark-lid", d: "M-8 0 Q0 -5.5 8 0 Q0 5.5 -8 0Z" }), svgEl("circle", { class: "m-mark-star", r: 1.6 }));
  mapSvg.appendChild(g);
});

// a dotted route linking the places, in dock order, starting at the square
const route = [SPAWN, ...POIS];
mapSvg.appendChild(svgEl("path", {
  class: "m-path",
  d: route.map((p, i) => {
    if (!i) return `M${p.x} ${p.y}`;
    const q = route[i - 1], mx = (p.x + q.x) / 2 + (p.y - q.y) * 0.2, my = (p.y + q.y) / 2 - (p.x - q.x) * 0.2;
    return `Q${mx} ${my} ${p.x} ${p.y}`;
  }).join(" "),
}));

// points of interest
const poiLayer = $("[data-pois]");
const poiEls = POIS.map((p) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "poi";
  b.tabIndex = -1;
  b.style.left = `${p.x * SCALE}px`;
  b.style.top = `${p.y * SCALE}px`;
  b.innerHTML = `<span class="poi__ring"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[p.icon]}</svg></span><span class="poi__label">${p.place}</span>`;
  b.addEventListener("click", (e) => { e.stopPropagation(); travelTo(p, true); });
  poiLayer.appendChild(b);
  return b;
});

/* ============================================================
   CAMERA + PLAYER
   ============================================================ */
const world = $("[data-world]"), camera = $("[data-camera]"), playerEl = $("[data-player]"), playerBody = $(".player__body");
const player = { x: SPAWN.x, y: SPAWN.y, heading: -90 };
let zoom = 1, cam = { x: 0, y: 0 }, target = null, onArrive = null, flying = false;
const keys = new Set();
const canHitTest = typeof fogPath.isPointInFill === "function";

function baseZoom() {
  const vw = window.innerWidth;
  if (vw < 700) return 0.6;                          // phones: closer, so labels stay readable
  return Math.min(Math.max(vw / 2000, 0.5), 0.85);
}
zoom = baseZoom();
window.addEventListener("resize", () => { zoom = baseZoom(); placeCamera(true); });

function onLand(x, y) {
  if (!canHitTest) return x > 0 && y > 0 && x < MAP.w && y < MAP.h;
  try { return fogPath.isPointInFill(new DOMPoint(x, y)); } catch { return true; }
}

function placeCamera(snap) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const sw = MW * zoom, sh = MH * zoom;
  let tx = vw / 2 - player.x * SCALE * zoom;
  let ty = vh / 2 - player.y * SCALE * zoom;
  const m = 120;
  tx = sw + 2 * m < vw ? (vw - sw) / 2 : Math.min(m, Math.max(vw - sw - m, tx));
  ty = sh + 2 * m < vh ? (vh - sh) / 2 : Math.min(m, Math.max(vh - sh - m, ty));
  if (snap) { cam.x = tx; cam.y = ty; }
  else { cam.x += (tx - cam.x) * 0.12; cam.y += (ty - cam.y) * 0.12; }
  camera.style.transform = `translate3d(${cam.x.toFixed(1)}px, ${cam.y.toFixed(1)}px, 0) scale(${zoom})`;
}
function drawPlayer() {
  playerEl.style.transform = `translate3d(${player.x * SCALE}px, ${player.y * SCALE}px, 0)`;
  playerBody.style.transform = `rotate(${player.heading + 90}deg)`;
}
drawPlayer();
placeCamera(true);

// input
const KEYMAP = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (document.body.classList.contains("on-title")) {
    if (!["tab", "shift", "control", "alt", "meta"].includes(k) && e.target === document.body) { e.preventDefault(); enterWorld(); }
    return;
  }
  if (openPanel) { if (k === "escape") closePanel(); else if (k === "tab") trapFocus(e); return; }
  if (e.target.closest && e.target.closest("input, textarea")) return;
  if (KEYMAP[k]) { keys.add(k); target = null; onArrive = null; flying = false; e.preventDefault(); }
  else if (k === "e" || (k === "enter" && e.target === document.body)) { if (nearPoi) { e.preventDefault(); openSection(nearPoi.id); } }
  else if (/^[1-9]$/.test(k) && POIS[+k - 1]) { travelTo(POIS[+k - 1], true); }
  else if (k === "+" || k === "=") { zoom = Math.min(zoom + 0.1, 1.6); }
  else if (k === "-") { zoom = Math.max(zoom - 0.1, 0.45); }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

world.addEventListener("click", (e) => {
  if (openPanel) return;
  const x = (e.clientX - cam.x) / (SCALE * zoom), y = (e.clientY - cam.y) / (SCALE * zoom);
  if (!onLand(x, y)) return;
  target = { x, y }; onArrive = null; flying = false;
});
world.addEventListener("wheel", (e) => {
  e.preventDefault();
  zoom = Math.min(Math.max(zoom * (e.deltaY > 0 ? 0.92 : 1.08), 0.45), 1.6);
}, { passive: false });

function travelTo(p, open) {
  if (openPanel) closePanel(true);
  if (document.body.classList.contains("on-title")) enterWorld();
  const d = Math.hypot(p.x - player.x, p.y - player.y);
  if (d < 26) { if (open) openSection(p.id); return; }
  target = { x: p.x, y: p.y + 16 };
  flying = true;
  onArrive = open ? () => openSection(p.id) : null;
}

// proximity
let nearPoi = null;
const prompt = $("[data-prompt]"), promptText = $("[data-prompt-text]"), placeEl = $("[data-place]"), needle = $("[data-needle]");
prompt.addEventListener("click", () => nearPoi && openSection(nearPoi.id));
function updateNear() {
  let best = null, bd = 40;
  POIS.forEach((p) => { const d = Math.hypot(p.x - player.x, p.y - player.y); if (d < bd) { bd = d; best = p; } });
  if (best !== nearPoi) {
    nearPoi = best;
    poiEls.forEach((el, i) => el.classList.toggle("is-near", POIS[i] === best));
    if (best) { promptText.textContent = `Enter · ${best.short}`; placeEl.textContent = best.place; }
    else placeEl.textContent = Math.hypot(SPAWN.x - player.x, SPAWN.y - player.y) < 50 ? SPAWN.place : "Snezhnaya";
    prompt.classList.toggle("is-on", !!best && !openPanel);
  }
}

// loop
let last = 0, looping = false;
function startLoop() { if (looping) return; looping = true; last = performance.now(); requestAnimationFrame(tick); }
function tick(t) {
  const dt = Math.min((t - last) / 1000, 0.05); last = t;
  let vx = 0, vy = 0;
  keys.forEach((k) => { vx += KEYMAP[k][0]; vy += KEYMAP[k][1]; });
  let speed = 95;
  if (!vx && !vy && target) {
    const dx = target.x - player.x, dy = target.y - player.y, d = Math.hypot(dx, dy);
    if (d < 2) { target = null; flying = false; const cb = onArrive; onArrive = null; if (cb) cb(); }
    else { vx = dx / d; vy = dy / d; if (flying) speed = Math.min(420, 140 + d * 2.2); }
  }
  if (vx || vy) {
    const n = Math.hypot(vx, vy); vx /= n; vy /= n;
    const step = speed * dt;
    const nx = player.x + vx * step, ny = player.y + vy * step;
    if (flying || onLand(nx, ny)) { player.x = nx; player.y = ny; }
    else if (onLand(nx, player.y)) player.x = nx;
    else if (onLand(player.x, ny)) player.y = ny;
    else target = null;
    const h = Math.atan2(vy, vx) * 180 / Math.PI;
    let diff = ((h - player.heading + 540) % 360) - 180;
    player.heading += diff * Math.min(1, dt * 12);
    needle.style.transform = `rotate(${player.heading + 90}deg)`;
    drawPlayer();
    updateNear();
  }
  placeCamera(reduceMotion);
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
worldBtn.addEventListener("click", () => { if (openPanel) closePanel(); });
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
const SECTION_OPEN = { team: () => { loadFrameDetails(); }, amv: () => playTimeline(true), dev: () => loadRepos(), runs: () => refreshRuns() };
const SECTION_CLOSE = { amv: () => playTimeline(false) };

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
    $("[data-live-levelbar]").style.setProperty("--w", `${Math.min(p.level / 120, 1) * 100}%`);
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
   AMV TIMELINE
   ============================================================ */
const ruler = $("[data-ruler]");
for (let i = 0; i <= 40; i++) {
  const t = document.createElement("i");
  t.style.left = `${(i / 40) * 100}%`;
  if (i % 8 === 0) {
    t.className = "major";
    if (i < 40) { const lab = document.createElement("span"); lab.style.left = `${(i / 40) * 100}%`; lab.textContent = `00:${String((i / 8) * 6).padStart(2, "0")}`; ruler.appendChild(lab); }
  }
  ruler.appendChild(t);
}
const wave = $("[data-wave]");
wave.setAttribute("viewBox", "0 0 160 100");
let seed = 7;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
for (let i = 0; i < 160; i++) {
  const beat = Math.abs(Math.sin(i * 0.39)) ** 3;
  const h = 8 + (beat * 70 + rnd() * 22) * (0.45 + 0.55 * Math.sin((i / 160) * Math.PI));
  wave.appendChild(svgEl("rect", { x: i + 0.15, width: 0.7, y: 50 - h / 2, height: h }));
}
const tracks = $(".timeline__tracks"), tc = $("[data-tc]");
let tlRaf = 0, tlStart = 0;
function setPlayhead(p) {
  tracks.style.setProperty("--p", p.toFixed(4));
  const frames = Math.round(p * 900), s = Math.floor(frames / 30), f = frames % 30;
  tc.textContent = `00:00:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}
function playTimeline(on) {
  cancelAnimationFrame(tlRaf);
  if (!on) return;
  if (reduceMotion) { setPlayhead(0.42); return; }
  tlStart = performance.now();
  const step = (t) => { setPlayhead(((t - tlStart) / 12000) % 1); tlRaf = requestAnimationFrame(step); };
  tlRaf = requestAnimationFrame(step);
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

// deep link: #team etc. skips the title screen
const hashId = location.hash.slice(1);
if (POIS.some((p) => p.id === hashId)) {
  const p = POIS.find((q) => q.id === hashId);
  player.x = p.x; player.y = p.y + 16;
  drawPlayer(); placeCamera(true);
  enterWorld(); updateNear(); openSection(hashId);
} else updateNear();

/* ============================================================
   FALLING FEATHERS AND SNOW
   ============================================================ */
const canvas = $(".feathers");
if (!reduceMotion && canvas.getContext) {
  const ctx = canvas.getContext("2d");
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
