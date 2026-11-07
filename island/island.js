(() => {
  'use strict';

  const PLACES = window.MV_PLACES || [];
  const BASE = window.MV_I18N;
  const TXT = window.ISLAND_I18N;
  const LANGS = ['en', 'zh'];
  const LANG_KEY = 'mv-lang';
  const FAV_KEY = 'mv-fav';
  const INTRO_KEY = 'mv-island-intro';
  const INK = '#2d2a32';
  const TAU = Math.PI * 2;
  const FONT = "Fredoka, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif";
  const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth <= 820;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ================= language ================= */
  function detectLang() {
    const u = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(u)) return u;
    try { const s = localStorage.getItem(LANG_KEY); if (LANGS.includes(s)) return s; } catch (e) { /* ignore */ }
    return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }
  let lang = detectLang();
  const tx = (k) => { const v = TXT[lang][k]; return v === undefined ? TXT.en[k] : v; };
  const ui = () => BASE.ui[lang] || BASE.ui.en;
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] === undefined ? '' : o[k]));
  const placeText = (p, f) => (lang === 'zh' && BASE.places.zh[p.id] && BASE.places.zh[p.id][f]) || p[f];
  const nameOf = (p) => (lang === 'zh' ? p.zh : p.name);
  const subOf = (p) => (lang === 'zh' ? p.name : p.zh);
  const TAGKEY = { hotel: 'tagHotel', island: 'tagIsland', sea: 'tagSea', go: 'tagGo' };
  const typeLabel = (p) => ui()[TAGKEY[p.type]] || BASE.ui.en[TAGKEY[p.type]];
  const atollName = (k) => (ui().atolls || BASE.ui.en.atolls)[k];

  /* ================= colour helpers ================= */
  const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const colorMemo = new Map();
  function shade(c, t) {
    const key = c + '|' + t;
    let v = colorMemo.get(key);
    if (!v) {
      const A = hex2rgb(c); const target = t < 0 ? 0 : 255; const a = Math.abs(t);
      v = `rgb(${A.map((x) => Math.round(x + (target - x) * a)).join(',')})`;
      colorMemo.set(key, v);
    }
    return v;
  }
  const mix = (a, b, t) => { const A = hex2rgb(a); const B = hex2rgb(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; };

  /* ================= world layout ================= */
  // A stylised map: atolls keep their rough north/south/east/west order, but gaps are stretched so every island has room.
  // [x, y, kind, rx, ry, extras]   (sea-life entries only need x, y)
  const ORDER = ['male', 'nmale', 'ari', 'baa', 'south'];
  const DCOL = { male: '#ff9e6b', nmale: '#2ec4a6', ari: '#4aa8e8', baa: '#b48ad8', south: '#ff7aa2' };
  const WORLD = { x0: -1260, y0: -1010, x1: 1120, y1: 1150 };
  const LAY = {
    velana: [430, 120, 'airport', 170, 44], seaplane: [280, 20, 'pontoon', 56, 24], ferry: [720, -40, 'ferry', 60, 26],
    male: [130, 200, 'city', 120, 70, { big: true }], hulhumale: [520, -40, 'city', 130, 56],
    maafushi: [300, 470, 'local', 110, 60], thulusdhoo: [860, -330, 'local', 100, 56],
    dhigurah: [-560, 330, 'long', 190, 40, { bank: true }], addu: [-70, 960, 'long', 160, 58, { link: true }],
    kurumba: [170, -540, 'resort', 95, 54, { villas: 3 }], baros: [-30, -660, 'resort', 80, 48, { villas: 4 }], gili: [320, -690, 'resort', 100, 56, { villas: 5 }],
    conrad: [-720, 70, 'resort', 150, 52, { villas: 4, twin: true }], soneva: [-840, -470, 'resort', 110, 60, { villas: 3 }], velaa: [-700, -700, 'resort', 100, 56, { villas: 3 }],
    bananareef: [340, -420], dolphins: [60, -860], maayathila: [-760, -100], whaleshark: [-900, 230], turtles: [-480, 140],
    hanifaru: [-560, -520], vaadhoo: [-980, -690], fuvahmulah: [210, 700],
  };
  const HH = { resort: 76, city: 84, local: 60, long: 58, airport: 72, pontoon: 54, ferry: 54 };
  const LABEL_AT = { male: [560, 300], nmale: [-250, -560], ari: [-380, 30], baa: [-540, -770], south: [-330, 800] };

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const places = []; const lands = []; const seas = []; const bById = new Map();
  PLACES.forEach((p, idx) => {
    const l = LAY[p.id]; if (!l) return;
    const b = { p, id: p.id, idx, dist: p.district, x: l[0], y: l[1], hit: null, badge: null };
    if (p.type === 'sea') { b.sea = true; b.hh = 62; seas.push(b); }
    else { b.kind = l[2]; b.rx = l[3]; b.ry = l[4]; Object.assign(b, l[5] || {}); b.hh = HH[b.kind]; lands.push(b); }
    places.push(b); bById.set(p.id, b);
  });
  const distCount = {}; ORDER.forEach((k) => { distCount[k] = places.filter((b) => b.dist === k).length; });

  function genOut(s) {
    return Array.from({ length: 26 }, (_, i) => { const a = (i / 26) * TAU; const r = 1 + 0.08 * Math.sin(3 * a + s) + 0.05 * Math.sin(5 * a + s * 2.3); return [Math.cos(a) * r, Math.sin(a) * r]; });
  }
  const segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax; const dy = by - ay; const L2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1); return Math.hypot(px - (ax + dx * t), (py - (ay + dy * t)) * 1.5);
  };

  /* ---------- scenery lists, filled by setupLand ---------- */
  const statics = [];
  const spush = (y, f) => statics.push({ y, f });
  const palms = []; const houses = []; const mosques = []; const villas = []; const umbrellas = [];
  const ROOFS = ['#e8503a', '#3f8f9a', '#ffc93c', '#7d8a96', '#b48ad8'];
  const WALLS = ['#fff1d6', '#ffe9c9', '#fde2e4', '#e3f4ec', '#e6f1fb', '#fff6c9'];

  function nearestIdx(G, x, y) {
    let bi = 0; let bd = Infinity;
    for (let i = 0; i < G.n.length; i++) { const d = (G.n[i][0] - x) ** 2 + (G.n[i][1] - y) ** 2; if (d < bd) { bd = d; bi = i; } }
    return bi;
  }
  function dijkstra(G, s, t) {
    const n = G.n.length; const dist = new Float64Array(n).fill(Infinity); const prev = new Int32Array(n).fill(-1); const done = new Uint8Array(n);
    dist[s] = 0;
    for (;;) {
      let u = -1; let best = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0 || u === t) break;
      done[u] = 1;
      for (const [v, w] of G.a[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
    }
    const out = []; for (let c = t; c !== -1; c = prev[c]) { out.unshift(c); if (c === s) break; }
    return out[0] === s ? out : [s, t];
  }
  function findPath(L, ax, ay, bx, by) {
    const G = L.G; const A = nearestIdx(G, ax, ay); const B = nearestIdx(G, bx, by);
    const pts = [[ax, ay]];
    dijkstra(G, A, B).forEach((i) => pts.push(G.n[i]));
    pts.push([bx, by]);
    return pts.filter((p, i) => !i || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.5).slice(1);
  }
  const pathLen = (path, x, y) => { let d = 0; let px = x; let py = y; path.forEach((p) => { d += Math.hypot(p[0] - px, p[1] - py); px = p[0]; py = p[1]; }); return d; };

  function setupLand(b) {
    const { x, y, rx, ry } = b;
    const G = { n: [], a: [] }; b.G = G; b.spots = []; b.edges = [];
    const N = (px, py) => { G.n.push([px, py]); G.a.push([]); return G.n.length - 1; };
    const link = (i, j) => {
      if (i === j || G.a[i].some((e) => e[0] === j)) return;
      const w = Math.hypot(G.n[i][0] - G.n[j][0], G.n[i][1] - G.n[j][1]); G.a[i].push([j, w]); G.a[j].push([i, w]); b.edges.push([i, j]);
    };
    const spot = (kind, i) => { const s = { kind, x: G.n[i][0], y: G.n[i][1], n: i }; b.spots.push(s); return s; };
    b.out = genOut(b.idx);
    let ring = []; let hub;
    if (b.kind === 'airport') {
      for (let i = 0; i < 5; i++) ring.push(N(x + rx * (-0.8 + 0.4 * i), y + ry * 0.5));
      for (let i = 1; i < 5; i++) link(ring[i - 1], ring[i]);
      hub = ring[2];
    } else {
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ring.push(N(x + Math.cos(a) * rx * 0.6, y + Math.sin(a) * ry * 0.6)); }
      for (let i = 0; i < 8; i++) link(ring[i], ring[(i + 1) % 8]);
      hub = N(x, y + ry * 0.14); [0, 2, 4, 6].forEach((i) => link(hub, ring[i]));
    }
    b.hub = G.n[hub];
    b.bx = x; b.by = y + ry * 0.05; // main building base

    // pier into the water (south-east shore)
    const len = { resort: 64, local: 70, city: 70, long: 66, airport: 58, pontoon: 20, ferry: 84 }[b.kind];
    const pa = Math.PI * 0.38; const sh = [x + Math.cos(pa) * rx * 0.96, y + Math.sin(pa) * ry * 0.96];
    const near = nearestIdx(G, sh[0], sh[1]);
    const sN = N(sh[0], sh[1]); link(sN, near);
    b.pierBase = sh; b.pier = [sh[0], sh[1] + len];
    const eN = N(b.pier[0], b.pier[1]); link(sN, eN);

    // statics
    const addPalm = (px, py) => palms.push({ x: px, y: py, s: 0.8 + rnd() * 0.5, lean: rnd() < 0.5 ? -1 : 1, ph: rnd() * 6 });
    const farFromPaths = (px, py, m) => !b.edges.some(([i, j]) => segDist(px, py, G.n[i][0], G.n[i][1], G.n[j][0], G.n[j][1]) < m);
    const scatter = (n, sc, fn, tries) => {
      let c = 0;
      for (let t = 0; t < (tries || 300) && c < n; t++) {
        const a = rnd() * TAU; const r = Math.sqrt(rnd()) * sc; const px = x + Math.cos(a) * rx * r; const py = y + Math.sin(a) * ry * r;
        if (fn(px, py)) c++;
      }
    };
    const clearOfHub = (px, py) => !(Math.abs(px - b.hub[0]) < 46 && py > b.hub[1] - 34 && py < b.hub[1] + 14);

    if (b.kind === 'resort') {
      spot('lobby', hub);
      spot('beach', ring[0]); spot('beach', ring[4]);
      // overwater villas along a jetty on the north-west shore
      const va = -Math.PI * 0.62; const vb = [x + Math.cos(va) * rx * 0.92, y + Math.sin(va) * ry * 0.92]; b.villaBase = vb; b.jet = [];
      let prev = nearestIdx(G, vb[0], vb[1]); const j0 = N(vb[0], vb[1]); link(prev, j0); prev = j0;
      for (let i = 0; i < (b.villas || 3); i++) {
        const jx = vb[0]; const jy = vb[1] - 32 * (i + 1); const jn = N(jx, jy); link(prev, jn); prev = jn; b.jet.push([jx, jy]);
        spot('villa', jn);
        villas.push({ x: jx + (i % 2 ? 30 : -30), y: jy + 8, roof: i % 3 === 0 ? '#d9a35f' : i % 3 === 1 ? '#c98a4a' : '#e0b46c', seed: i + b.idx, isl: b });
      }
      b.bldY = b.by - 6; spush(b.bldY, () => drawLobby(b));
      scatter(Math.round(rx / 9), 0.82, (px, py) => { if (!clearOfHub(px, py) || !farFromPaths(px, py, 9)) return false; addPalm(px, py); return true; });
      [ring[0], ring[4]].forEach((i, k) => { const a = k ? Math.PI : 0; umbrellas.push({ x: x + Math.cos(a) * rx * 0.8, y: y + Math.sin(a) * ry * 0.8 + 4, c: k ? '#ff6b5b' : '#ffc93c' }); });
      if (b.twin) { // second little island joined by a walkway, plus the glass undersea restaurant
        const ex = { x: x - rx - 70, y: y - 10, rx: 56, ry: 24, out: genOut(b.idx + 3), green: 0.55 }; b.extras = [ex];
        b.causeways = [{ pts: [[x - rx * 0.92, y - 2], [ex.x + ex.rx * 0.8, ex.y + 2]], wood: true }];
        addPalm(ex.x - 12, ex.y - 2); addPalm(ex.x + 16, ex.y + 3);
        b.dome = [x - 30, y + ry + 76];
      }
    } else if (b.kind === 'city') {
      spot('market', hub); spot('market', ring[6]); spot('beach', ring[0]);
      const mc = b.big ? [-0.42, -0.3, 1.35, '#ffc93c'] : [0.42, -0.28, 1, '#2ec4a6'];
      const mn = N(x + rx * mc[0], y + ry * mc[1] + 14); link(mn, nearestIdx(G, x + rx * mc[0], y + ry * mc[1] + 14 + 1)); link(mn, ring[b.big ? 5 : 7]); spot('mosque', mn);
      mosques.push({ x: x + rx * mc[0], y: y + ry * mc[1], s: mc[2], dome: mc[3] });
      const cnt = b.big ? 20 : 11; const placed = [];
      scatter(cnt, 0.84, (px, py) => {
        if (!clearOfHub(px, py) || !farFromPaths(px, py, 17)) return false;
        if (Math.hypot(px - (x + rx * mc[0]), (py - (y + ry * mc[1])) * 1.4) < 52) return false;
        if (placed.some((q) => Math.abs(q.x - px) < 34 && Math.abs(q.y - py) < 17)) return false;
        const hq = { x: px, y: py, w: 22 + rnd() * 12, h: (b.big ? 38 : 26) + rnd() * (b.big ? 52 : 26), wall: WALLS[Math.floor(rnd() * WALLS.length)], roof: ROOFS[Math.floor(rnd() * ROOFS.length)], seed: Math.floor(rnd() * 99) };
        placed.push(hq); houses.push(hq); return true;
      }, 600);
      scatter(4, 0.8, (px, py) => { if (!clearOfHub(px, py) || !farFromPaths(px, py, 10) || placed.some((q) => Math.abs(q.x - px) < 30 && Math.abs(q.y - py) < 18)) return false; addPalm(px, py); return true; });
    } else if (b.kind === 'local') {
      spot('village', hub); spot('beach', ring[4]);
      const mn = N(x - rx * 0.32, y - ry * 0.28 + 14); link(mn, ring[5]); link(mn, ring[6]); spot('mosque', mn);
      mosques.push({ x: x - rx * 0.32, y: y - ry * 0.28, s: 0.85, dome: '#2ec4a6' });
      scatter(7, 0.8, (px, py) => {
        if (!clearOfHub(px, py) || !farFromPaths(px, py, 17) || Math.hypot(px - (x - rx * 0.32), (py - (y - ry * 0.28)) * 1.4) < 44) return false;
        if (houses.some((q) => Math.abs(q.x - px) < 34 && Math.abs(q.y - py) < 16)) return false;
        houses.push({ x: px, y: py, w: 22 + rnd() * 8, h: 14 + rnd() * 8, pitch: true, wall: WALLS[Math.floor(rnd() * WALLS.length)], roof: ROOFS[Math.floor(rnd() * ROOFS.length)], seed: Math.floor(rnd() * 99) });
        return true;
      }, 500);
      scatter(Math.round(rx / 10), 0.86, (px, py) => { if (!clearOfHub(px, py) || !farFromPaths(px, py, 9) || houses.some((q) => Math.abs(q.x - px) < 26 && Math.abs(q.y - py) < 14)) return false; addPalm(px, py); return true; });
      umbrellas.push({ x: x - rx * 0.8, y: y + 6, c: '#3f8f9a' });
    } else if (b.kind === 'long') {
      spot('village', hub); spot('village', ring[0]); spot('village', ring[4]); spot('beach', ring[2]);
      for (let i = 0; i < 6; i++) {
        const hx = x + rx * (-0.78 + (1.56 * i) / 5); const hy = y + ry * (i % 2 ? 0.05 : -0.42);
        if (Math.hypot(hx - b.hub[0], hy - b.hub[1]) < 40) continue;
        houses.push({ x: hx, y: hy, w: 22 + rnd() * 8, h: 14 + rnd() * 7, pitch: true, wall: WALLS[(i + b.idx) % WALLS.length], roof: ROOFS[(i + b.idx) % ROOFS.length], seed: i });
      }
      scatter(Math.round(rx / 8), 0.9, (px, py) => { if (!farFromPaths(px, py, 8) || houses.some((q) => Math.abs(q.x - px) < 26 && Math.abs(q.y - py) < 14) || !clearOfHub(px, py)) return false; addPalm(px, py); return true; }, 600);
      b.extras = []; b.causeways = [];
      if (b.bank) b.extras.push({ x: x + rx + 56, y: y + 6, rx: 36, ry: 13, out: genOut(b.idx + 5), green: 0 });
      if (b.link) {
        const e1 = { x: x - rx - 90, y: y - 8, rx: 44, ry: 18, out: genOut(b.idx + 1), green: 0.5 }; const e2 = { x: x + rx + 100, y: y + 10, rx: 50, ry: 20, out: genOut(b.idx + 2), green: 0.5 };
        b.extras.push(e1, e2);
        b.causeways.push({ pts: [[x - rx * 0.9, y - 2], [e1.x + e1.rx * 0.7, e1.y + 2]], road: true }, { pts: [[x + rx * 0.9, y + 2], [e2.x - e2.rx * 0.7, e2.y]], road: true });
        addPalm(e1.x, e1.y - 2); addPalm(e2.x + 8, e2.y);
      }
      umbrellas.push({ x: x + rx * 0.2, y: y + ry * 0.7, c: '#ff6b5b' });
    } else if (b.kind === 'airport') {
      spot('terminal', ring[1]); spot('terminal', ring[3]);
      b.tx = x - rx * 0.12; b.ty = y + ry * 0.3; b.tw = [x + rx * 0.45, y + ry * 0.3];
      spush(b.ty, () => drawTerminal(b)); spush(b.tw[1], () => drawControlTower(b.tw[0], b.tw[1]));
      spush(y - ry * 0.35 + 1, () => drawJetStatic(x - rx * 0.55, y - ry * 0.12, 0.8)); spush(y - ry * 0.3, () => drawJetStatic(x + rx * 0.68, y - ry * 0.1, 0.7));
      addPalm(x - rx * 0.9, y + ry * 0.25); addPalm(x + rx * 0.92, y + ry * 0.2);
    } else if (b.kind === 'pontoon') {
      spot('platform', hub);
      b.bldY = y + 6; spush(b.bldY, () => drawPontoon(b));
    } else if (b.kind === 'ferry') {
      spot('ticket', hub);
      b.tx = x - rx * 0.25; b.ty = y - ry * 0.15; spush(b.ty, () => drawFerryShed(b));
      b.fx = b.pier[0] + 32; b.fy = b.pier[1] - 6; spush(b.fy, () => drawFerryBoat(b));
      addPalm(x + rx * 0.5, y - ry * 0.2); addPalm(x - rx * 0.62, y + ry * 0.1);
    }
    b.pierSpot = spot('pier', eN);

    // everything on this island that needs the island itself drawn first: badge (always on top)
    spush(y + ry + 12, () => drawBadge(b));
  }
  lands.forEach(setupLand);
  lands.forEach((b) => { (b.extras || []).forEach((e) => { e.isEx = true; }); });
  // sea-life islets (Vaadhoo, Fuvahmulah) are tiny sand islands the animals live around
  seas.forEach((b) => {
    if (b.p.creature === 'glow') b.islet = { x: b.x, y: b.y, rx: 62, ry: 26, out: genOut(b.idx), green: 0.5 };
    if (b.p.creature === 'tiger') b.islet = { x: b.x, y: b.y, rx: 48, ry: 22, out: genOut(b.idx), green: 0.55 };
    if (b.islet) { palms.push({ x: b.x - 14, y: b.y - 2, s: 0.9, lean: -1, ph: rnd() * 6 }, { x: b.x + 18, y: b.y + 2, s: 1.05, lean: 1, ph: rnd() * 6 }); }
    spush(b.y + 12, () => drawSeaBadge(b));
  });
  palms.forEach((t) => spush(t.y, () => drawPalm(t)));
  houses.forEach((h) => spush(h.y, () => drawHouse(h)));
  mosques.forEach((m) => spush(m.y, () => drawMosque(m)));
  villas.forEach((v) => spush(v.y, () => drawVilla(v)));
  umbrellas.forEach((u) => spush(u.y, () => drawUmbrella(u)));
  // reef corals near Banana Reef
  const coralSpots = [];
  (() => { const b = bById.get('bananareef'); if (!b) return; for (let i = 0; i < 7; i++) coralSpots.push({ x: b.x + (rnd() - 0.5) * 100, y: b.y + (rnd() - 0.5) * 36, c: ['#ff7aa2', '#ffb347', '#b48ad8', '#ff6b5b'][i % 4], s: 0.8 + rnd() * 0.5 }); })();

  /* ---------- open-water scenery ---------- */
  const nearLand = (x, y, m) => lands.some((L) => ((x - L.x) / (L.rx + m)) ** 2 + ((y - L.y) / (L.ry + m * 0.6)) ** 2 < 1) ||
    seas.some((b) => Math.hypot(x - b.x, (y - b.y) * 1.5) < 210);
  const waves = []; for (let t = 0, n = 0; n < 420 && t < 4000; t++) { const x = WORLD.x0 + rnd() * (WORLD.x1 - WORLD.x0); const y = WORLD.y0 + rnd() * (WORLD.y1 - WORLD.y0); if (!nearLand(x, y, 110)) { waves.push({ x, y, s: 0.7 + rnd() * 0.7, ph: rnd() * 6 }); n++; } }
  const deeps = []; for (let t = 0, n = 0; n < 16 && t < 800; t++) { const x = WORLD.x0 + 80 + rnd() * (WORLD.x1 - WORLD.x0 - 160); const y = WORLD.y0 + 80 + rnd() * (WORLD.y1 - WORLD.y0 - 160); if (!nearLand(x, y, 150)) { deeps.push({ x, y, rx: 90 + rnd() * 140, ry: 40 + rnd() * 60 }); n++; } }
  const banks = []; for (let t = 0, n = 0; n < 8 && t < 800; t++) { const x = WORLD.x0 + 80 + rnd() * (WORLD.x1 - WORLD.x0 - 160); const y = WORLD.y0 + 80 + rnd() * (WORLD.y1 - WORLD.y0 - 160); if (!nearLand(x, y, 130)) { banks.push({ x, y, rx: 20 + rnd() * 20, ry: 8 + rnd() * 8, out: genOut(n + 40) }); n++; } }
  const clouds = Array.from({ length: 9 }, () => ({ x: rnd() * 3400 - 1300, y: rnd() * 2300 - 1100, s: 0.6 + rnd() * 0.8, v: 6 + rnd() * 8 }));
  const dhonis = [
    { cx: 480, cy: -260, rx: 170, ry: 44, a: 0, w: 0.09, c: '#e8503a' }, { cx: -330, cy: -210, rx: 200, ry: 60, a: 2, w: -0.08, c: '#3f8f9a' },
    { cx: -150, cy: 560, rx: 240, ry: 60, a: 4, w: 0.07, c: '#ffc93c' }, { cx: 720, cy: 330, rx: 140, ry: 70, a: 1, w: -0.1, c: '#b48ad8' },
  ];
  const birds = Array.from({ length: 12 }, (_, i) => { const L = lands[i % lands.length]; return { cx: L.x, cy: L.y, r: 70 + rnd() * 90, a: rnd() * TAU, w: (rnd() < 0.5 ? -1 : 1) * (0.25 + rnd() * 0.3), z: 54 + rnd() * 30, ph: rnd() * 6 }; });
  const jet = { t: -8, x: 0, y: 0 };

  /* ================= sea creatures ================= */
  const creatures = [];
  const fishMem = (n, cols) => Array.from({ length: n }, (_, i) => ({ ox: (rnd() - 0.5) * 38, oy: (rnd() - 0.5) * 20, s: 0.8 + rnd() * 0.5, col: cols[i % cols.length] }));
  function mk(o) { const c = Object.assign({ a: rnd() * TAU, w: 0.2, rx: 60, ry: 30, sz: 1, x: o.cx, y: o.cy, face: 1, pitch: 0, ph: rnd() * 6, hr: 20, z: 0, under: true }, o); creatures.push(c); return c; }
  seas.forEach((b) => {
    const hx = b.x; const hy = b.y;
    switch (b.p.creature) {
      case 'reef': b.R = [70, 34]; mk({ t: 'school', pid: b.id, cx: hx, cy: hy, rx: 55, ry: 24, w: 0.55, mem: fishMem(14, ['#ffc93c', '#ffd95a', '#ffb347']), hr: 34 }); mk({ t: 'school', pid: b.id, cx: hx + 10, cy: hy - 6, rx: 40, ry: 18, w: -0.7, mem: fishMem(9, ['#ff9ebb', '#ff7aa2', '#ffd0e0']), hr: 30 }); break;
      case 'dolphin': b.R = [165, 75]; [0, 1.3, 2.5].forEach((o, i) => mk({ t: 'dolphin', pid: b.id, cx: hx, cy: hy, rx: 150, ry: 62, a: o, w: 0.3, jt: -i * 1.2 - 1, under: false, hr: 26 })); break;
      case 'reefshark': b.R = [95, 44]; [0, Math.PI].forEach((o) => mk({ t: 'reefshark', pid: b.id, cx: hx, cy: hy, rx: 75, ry: 32, a: o, w: -0.22, hr: 22 })); break;
      case 'whaleshark': b.R = [125, 55]; mk({ t: 'whaleshark', pid: b.id, cx: hx, cy: hy, rx: 100, ry: 42, w: 0.1, hr: 55 }); mk({ t: 'whaleshark', pid: b.id, cx: hx, cy: hy, rx: 100, ry: 42, a: Math.PI + 0.6, w: 0.1, sz: 0.6, hr: 35 }); break;
      case 'turtle': b.R = [80, 38]; [[-30, 5, 0.2], [20, -8, -0.17], [40, 14, 0.24]].forEach(([dx, dy, w], i) => mk({ t: 'turtle', pid: b.id, cx: hx + dx, cy: hy + dy, rx: 38 + i * 6, ry: 18 + i * 3, w, a: i * 2, hr: 20 })); break;
      case 'manta': b.R = [105, 52]; [0, 1.6, 3.1, 4.7].forEach((o, i) => mk({ t: 'manta', pid: b.id, cx: hx, cy: hy, rx: 80, ry: 36, a: o, w: 0.33, sz: i === 0 ? 1.25 : 1, hr: 32 })); break;
      case 'glow': b.R = [100, 48]; mk({ t: 'glow', pid: b.id, cx: hx, cy: hy, hr: 0 }); break;
      case 'tiger': b.R = [135, 60]; [0, Math.PI].forEach((o) => mk({ t: 'tiger', pid: b.id, cx: hx, cy: hy, rx: 105, ry: 46, a: o, w: 0.17, hr: 32 })); break;
      default: b.R = [80, 40];
    }
  });
  // little schools on every island's house reef
  lands.forEach((L, i) => mk({ t: 'school', pid: null, cx: L.x, cy: L.y + 4, rx: L.rx + 46, ry: L.ry + 24, w: (i % 2 ? -1 : 1) * 0.35, mem: fishMem(6, i % 2 ? ['#7ccbf5', '#5b9bd5'] : ['#ffd95a', '#ff9ebb']), hr: 0 }));
  function updateCreatures(dt) {
    for (const c of creatures) {
      if (c.t === 'glow') continue;
      c.a += c.w * dt;
      c.x = c.cx + c.rx * Math.cos(c.a); c.y = c.cy + c.ry * Math.sin(c.a);
      const vx = -c.rx * Math.sin(c.a) * c.w; const vy = c.ry * Math.cos(c.a) * c.w;
      if (Math.abs(vx) > 0.4) c.face = vx >= 0 ? 1 : -1;
      c.pitch = Math.atan2(vy * 0.58, Math.abs(vx) + 0.001) * 0.7;
      if (c.t === 'dolphin') {
        c.jt += dt;
        if (c.jt > 0) {
          const u = c.jt / 1.3;
          if (u >= 1) { c.jt = -(3 + Math.random() * 5); c.z = 0; } else { c.z = 40 * Math.sin(Math.PI * u); c.pitch += -Math.cos(Math.PI * u) * 0.8; }
        } else c.z = 0;
      }
    }
  }

  /* ================= guests, buggies, boats ================= */
  const SHIRT = ['#ff8a5c', '#5b9bd5', '#ffd166', '#5cc8b0', '#ffffff', '#b48ad8', '#ff7aa2', '#7ccf6e'];
  const HAIR = ['#3b2a20', '#5a3d2b', '#2b2b3a', '#8a5a3c', '#c98f4e'];
  const SPOT_EMOJI = { lobby: '🍹', villa: '🛏️', beach: '🏖️', pier: '🤿', market: '🐟', mosque: '🕌', village: '🍍', terminal: '🧳', platform: '🛩️', ticket: '🎫' };
  const GUESTS_AT = { airport: 3, pontoon: 2, ferry: 2, city: 4, local: 3, long: 2, resort: 2 };
  const BUGGIES_AT = { airport: 2, pontoon: 0, ferry: 0, city: 2, local: 1, long: 2, resort: 2 };
  const guests = []; const buggies = []; const vehicles = []; const fx = [];
  let gid = 0;
  lands.forEach((L) => {
    for (let i = 0; i < GUESTS_AT[L.kind]; i++) {
      const s = L.spots.filter((q) => q.kind !== 'pier'); const sp = s[Math.floor(rnd() * s.length)];
      guests.push({
        id: gid, nameIdx: gid, isl: L, x: sp.x + (rnd() - 0.5) * 8, y: sp.y + (rnd() - 0.5) * 4, state: 'idle', wait: rnd() * 6, path: [], cur: sp, dest: sp, trip: null,
        shirt: SHIRT[gid % 8], hair: HAIR[gid % 5], style: gid % 5, v: 26 + rnd() * 8, k: 1, ph: rnd() * 6, face: 1, say: '', sayT: 0, cool: rnd() * 6, moving: false,
        eatEmoji: '', eatT: 0, replyAt: 0, replyTxt: '', kind: 'guest',
      });
      gid++;
    }
    for (let i = 0; i < BUGGIES_AT[L.kind]; i++) {
      const n = L.G.n[Math.floor(rnd() * 8) % L.G.n.length];
      buggies.push({ kind: 'buggy', isl: L, x: n[0], y: n[1], state: 'idle', wait: rnd() * 4, path: [], job: null, pax: null, face: 1, ph: 0, color: ['#ffc93c', '#ff6b5b', '#2ec4a6', '#5b9bd5'][buggies.length % 4], id: buggies.length });
    }
  });
  const personName = (p) => tx('names')[p.nameIdx % 20] + (p.nameIdx >= 20 ? '²' : '');
  const say = (p, text, dur) => { p.say = text; p.sayT = dur || 5; };
  function heart(p, ch) { for (let i = 0; i < 3; i++) fx.push({ x: p.x + (Math.random() - 0.5) * 14, y: p.y, z: 26, vz: 22 + Math.random() * 16, life: 1.4, ch: ch || '💛' }); }

  /* ---------- journal ---------- */
  const logsEl = $('logs');
  let lastLogAt = 0;
  function addLog(html, cls, force) {
    const now = performance.now();
    if (!force && now - lastLogAt < 900) return;
    lastLogAt = now;
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = html;
    logsEl.prepend(d);
    while (logsEl.children.length > 40) logsEl.lastChild.remove();
  }
  function nearestSea(x, y, maxD) {
    let best = null; let bd = maxD;
    seas.forEach((b) => { const d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; best = b; } });
    return best;
  }

  function followPath(o, dt, speed) {
    if (!o.path.length) return true;
    const [tx_, ty_] = o.path[0]; const dx = tx_ - o.x; const dy = ty_ - o.y; const d = Math.hypot(dx, dy); const step = speed * dt;
    if (d <= step) { o.x = tx_; o.y = ty_; o.path.shift(); return !o.path.length; }
    o.x += (dx / d) * step; o.y += (dy / d) * step; if (Math.abs(dx) > 0.2) o.face = dx > 0 ? 1 : -1;
    return false;
  }
  const spotFor = (L, avoid) => { const c = L.spots.filter((s) => s.kind !== 'pier' && s !== avoid); return pick(c.length ? c : L.spots); };
  function freeBuggy(L, x, y) {
    let best = null; let bd = Infinity;
    buggies.forEach((b) => { if (b.isl !== L || (b.state !== 'idle' && b.state !== 'cruise')) return; const d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; best = b; } });
    return best;
  }
  function goTo(p, spot) {
    const L = p.isl; const path = findPath(L, p.x, p.y, spot.x, spot.y); p.dest = spot;
    const bg = pathLen(path, p.x, p.y) > 120 ? freeBuggy(L, p.x, p.y) : null;
    if (bg && Math.random() < 0.85) {
      bg.job = { g: p, spot }; bg.state = 'fetch'; bg.path = findPath(L, bg.x, bg.y, p.x, p.y);
      p.state = 'wbuggy'; p.wait = 18; p.moving = false;
    } else { p.state = 'walk'; p.path = path; }
  }
  function cancelBuggy(p) {
    buggies.forEach((b) => { if (b.job && b.job.g === p) { b.job = null; if (b.state === 'fetch') { b.state = 'idle'; b.wait = 1; b.path = []; } } });
    p.state = 'walk'; p.path = findPath(p.isl, p.x, p.y, p.dest.x, p.dest.y);
  }
  function decide(p) {
    const L = p.isl;
    if (Math.random() < 0.26 && lands.length > 1) {
      const others = lands.filter((o) => o !== L); const same = others.filter((o) => o.dist === L.dist);
      p.trip = { to: (same.length && Math.random() < 0.6) ? pick(same) : pick(others) };
      goTo(p, L.pierSpot); return;
    }
    p.trip = null; goTo(p, spotFor(L, p.cur));
  }
  function arrived(p) {
    const s = p.dest; p.cur = s;
    if (p.trip && s === p.isl.pierSpot) { boardVehicle(p); return; }
    p.state = 'idle'; p.moving = false; p.wait = 4 + Math.random() * 5;
    const lines = tx('spotLines')[s.kind];
    if (lines && s.kind !== 'pier') say(p, fill(pick(lines), { s: nameOf(p.isl.p) }), 4);
    heart(p, s.kind === 'beach' ? '☀️' : s.kind === 'villa' ? '💤' : '💛');
    p.eatEmoji = SPOT_EMOJI[s.kind] || ''; p.eatT = p.wait * 0.7;
    if (s.kind === 'beach') {
      const sb = nearestSea(p.x, p.y, 560);
      if (sb && Math.random() < 0.6) addLog(fill(tx('logSpot'), { n: esc(personName(p)), e: sb.p.emoji, s: esc(nameOf(sb.p)) }));
    } else if (Math.random() < 0.25) addLog(fill(tx('logAt'), { n: esc(personName(p)), s: esc(nameOf(p.isl.p)), e: SPOT_EMOJI[s.kind] || '' }));
  }

  function boardVehicle(p) {
    const from = p.isl; const to = p.trip.to; const d = Math.hypot(from.pier[0] - to.pier[0], from.pier[1] - to.pier[1]);
    const kind = d > 560 ? 'plane' : 'boat';
    const v = {
      kind: 'vehicle', vk: kind, x: from.pier[0], y: from.pier[1], fx: from.pier[0], fy: from.pier[1], tx: to.pier[0], ty: to.pier[1], t: 0, dur: Math.max(2.5, d / (kind === 'plane' ? 230 : 95)),
      phase: 'board', face: to.pier[0] >= from.pier[0] ? 1 : -1, alt: 0, alpha: 1, from, to, pax: [p], bend: (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 30), seen: new Set(), spT: 1.5,
      color: pick(['#e8503a', '#2ec4a6', '#ffc93c', '#5b9bd5']), id: vehicles.length,
    };
    vehicles.push(v); p.state = 'board'; p.vehicle = v; p.moving = false;
    say(p, pick(tx('boatLines')), 3);
  }
  function landVehicle(v) {
    v.phase = 'leave'; v.t = 0;
    v.pax.forEach((p) => {
      p.vehicle = null; p.isl = v.to; p.x = v.to.pier[0]; p.y = v.to.pier[1]; p.trip = null; p.cur = v.to.pierSpot;
      addLog(fill(tx('logTrip'), { n: esc(personName(p)), s: esc(nameOf(v.to.p)), e: v.vk === 'plane' ? '🛩️' : '🚤' }), '', true);
      say(p, fill(pick(tx('arriveLines')), { s: nameOf(v.to.p) }), 4);
      p.state = 'idle'; p.wait = 0; goTo(p, spotFor(v.to));
    });
    v.pax = [];
  }
  function updateVehicles(dt) {
    for (let i = vehicles.length - 1; i >= 0; i--) {
      const v = vehicles[i];
      if (v.phase === 'board') { v.t += dt; if (v.t >= 1.2) { v.phase = 'go'; v.t = 0; } } else if (v.phase === 'go') {
        v.t += dt; const u = clamp(v.t / v.dur, 0, 1); const e = u * u * (3 - 2 * u);
        v.x = lerp(v.fx, v.tx, e); v.y = lerp(v.fy, v.ty, e) + (v.vk === 'boat' ? Math.sin(Math.PI * e) * v.bend : 0);
        v.alt = v.vk === 'plane' ? 58 * Math.min(1, u / 0.22, (1 - u) / 0.22) : 0;
        if (Math.abs(v.tx - v.fx) > 8) v.face = v.tx >= v.fx ? 1 : -1;
        v.pax.forEach((p) => { p.x = v.x; p.y = v.y; p.state = 'sail'; });
        v.spT -= dt;
        if (v.spT <= 0) {
          v.spT = 1.2;
          const c = creatures.find((q) => q.pid && !v.seen.has(q.pid) && Math.hypot(q.x - v.x, q.y - v.y) < 120);
          if (c) {
            v.seen.add(c.pid); const sb = bById.get(c.pid); const p = v.pax[0];
            if (p && sb) { addLog(fill(tx('logSpot'), { n: esc(personName(p)), e: sb.p.emoji, s: esc(nameOf(sb.p)) }), '', true); say(p, sb.p.emoji + '!', 3); }
          }
        }
        if (u >= 1) landVehicle(v);
      } else { v.t += dt; v.x += v.face * 26 * dt; v.alpha = clamp(1 - v.t, 0, 1); if (v.t >= 1) vehicles.splice(i, 1); }
    }
  }

  function updateBuggies(dt) {
    for (const b of buggies) {
      b.ph += dt * 10;
      if (b.state === 'idle') { b.wait -= dt; if (b.wait <= 0) { const n = pick(b.isl.G.n); b.path = findPath(b.isl, b.x, b.y, n[0], n[1]); b.state = 'cruise'; } } else if (b.state === 'cruise') {
        if (followPath(b, dt, 56)) { b.state = 'idle'; b.wait = 2 + Math.random() * 5; }
      } else if (b.state === 'fetch') {
        if (!b.job) { b.state = 'idle'; continue; }
        if (followPath(b, dt, 70)) {
          const g0 = b.job.g;
          if (g0.state === 'wbuggy') {
            b.pax = g0; g0.state = 'ride'; g0.buggy = b; g0.moving = false; b.state = 'carry'; b.path = findPath(b.isl, b.x, b.y, b.job.spot.x, b.job.spot.y);
            addLog(fill(tx('logBuggy'), { n: esc(personName(g0)) }));
          } else { b.job = null; b.state = 'idle'; b.wait = 1; }
        }
      } else if (b.state === 'carry') {
        if (b.pax) { b.pax.x = b.x; b.pax.y = b.y; }
        if (followPath(b, dt, 70)) {
          const p = b.pax; b.pax = null; const spot = b.job.spot; b.job = null; b.state = 'idle'; b.wait = 3;
          if (p) { p.buggy = null; p.x = b.x; p.y = b.y; arrived(p); }
          void spot;
        }
      }
    }
  }

  function updateGuests(dt, time) {
    for (const p of guests) {
      if (p.sayT > 0) p.sayT -= dt;
      if (p.eatT > 0) p.eatT -= dt;
      if (p.cool > 0) p.cool -= dt;
      if (p.replyAt && time > p.replyAt) { say(p, p.replyTxt, 4); p.replyAt = 0; }
      if (p.state === 'idle') { p.moving = false; p.wait -= dt; if (p.wait <= 0) decide(p); } else if (p.state === 'walk') {
        p.moving = true; p.ph += dt * 9 * (p.v / 32);
        if (followPath(p, dt, p.v)) { p.moving = false; arrived(p); }
      } else if (p.state === 'wbuggy') { p.moving = false; p.wait -= dt; if (p.wait <= 0) cancelBuggy(p); } else p.moving = false;
    }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt; f.z += f.vz * dt; if (f.life <= 0) fx.splice(i, 1); }
  }
  function chatter(time) {
    for (let i = 0; i < guests.length; i++) {
      const a = guests[i]; if (a.cool > 0 || a.sayT > 0 || a.state !== 'idle') continue;
      for (let j = i + 1; j < guests.length; j++) {
        const b = guests[j]; if (b.cool > 0 || b.sayT > 0 || b.state !== 'idle' || a.isl !== b.isl) continue;
        if (Math.hypot(a.x - b.x, (a.y - b.y) * 1.4) < 34 && Math.random() < 0.5) {
          const place = nameOf(pick(lands).p);
          say(a, fill(pick(tx('greet')), { n: personName(b), s: place }), 4.5);
          b.replyAt = time + 1.6; b.replyTxt = fill(pick(tx('reply')), { s: place });
          a.cool = b.cool = 14; a.wait = Math.max(a.wait, 3.5); b.wait = Math.max(b.wait, 3.5);
          addLog(fill(tx('logChat'), { n: esc(personName(a)), m: esc(personName(b)) }));
          break;
        }
      }
    }
  }
  function sendGuest(b) {
    if (b.sea) return null;
    const cand = guests.filter((p) => p.state === 'idle' && p.isl !== b);
    if (!cand.length) return null;
    cand.sort((p, q) => Math.hypot(p.isl.x - b.x, p.isl.y - b.y) - Math.hypot(q.isl.x - b.x, q.isl.y - b.y));
    const p = pick(cand.slice(0, 5)); p.trip = { to: b }; goTo(p, p.isl.pierSpot); return p;
  }

  /* ================= canvas / camera ================= */
  const cv = $('cv'); const g = cv.getContext('2d');
  let W = 0; let H = 0; let DPR = 1;
  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  const cam = { x: 300, y: -120, z: 0.5, tx: 300, ty: -120, tz: 0.5, tilt: 0.58, ttilt: 0.58 };
  let bird = false;
  const sx = (x) => (x - cam.x) * cam.z + W / 2;
  const sy = (y, z) => (y - cam.y) * cam.z * cam.tilt + H / 2 - (z || 0) * cam.z;
  function rectZoom(x0, y0, x1, y1) {
    const padX = isMobile() ? 16 : 70; const padY = isMobile() ? 190 : 150;
    return clamp(Math.min((W - padX * 2) / (x1 - x0), (H - padY * 2) / ((y1 - y0) * cam.ttilt)), 0.1, 1.3);
  }
  function fitRect(x0, y0, x1, y1) { cam.tz = rectZoom(x0, y0, x1, y1); cam.tx = (x0 + x1) / 2; cam.ty = (y0 + y1) / 2; }
  function fitAll() { fitRect(WORLD.x0, WORLD.y0, WORLD.x1, WORLD.y1 + 40); }
  function fitStart() {
    if (isMobile()) { cam.tz = clamp(Math.min(W / 760, H / 640), 0.3, 0.9); cam.tx = 330; cam.ty = 60; } else fitRect(-60, -820, 980, 600);
  }
  let follow = null; // eslint-disable-line no-unused-vars
  let followP = null;
  function flyTo(x, y, z) { cam.tx = x; cam.ty = y; if (z) cam.tz = Math.max(cam.tz, z); stopFollow(); }
  function zoomAt(px, py, f) {
    const wx = (px - W / 2) / cam.z + cam.x; const wy = (py - H / 2) / (cam.z * cam.tilt) + cam.y;
    const nz = clamp(cam.z * f, 0.1, 3);
    cam.z = cam.tz = nz;
    cam.x = cam.tx = wx - (px - W / 2) / nz; cam.y = cam.ty = wy - (py - H / 2) / (nz * cam.tilt);
  }

  /* ---------- drawing helpers ---------- */
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function box(x, y, w, h, c, r) { rr(x, y, w, h, r || 0); g.fillStyle = c; g.fill(); g.stroke(); }
  function poly(pts, c) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = c; g.fill(); g.stroke(); }
  function ell(x, y, rx, ry, c, stroke) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fillStyle = c; g.fill(); if (stroke) g.stroke(); }
  function emoji(ch, x, y, size) { g.font = `${size}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText(ch, x, y); }
  const onScreen = (x, y, m) => x > -m && x < W + m && y > -m && y < H + m;

  let lw = 2; let time = 0;
  const lights = []; const litList = [];
  function flushLights(X, Y, k) { for (const L of lights) litList.push([X + L[0] * k, Y + L[1] * k, L[2] * k, L[3]]); lights.length = 0; }
  // run fn in a local, scaled coordinate frame whose origin is the screen position of world (x, y)
  function at(x, y, m, fn, z) {
    const X = sx(x); const Y = sy(y, z || 0); const k = cam.z;
    if (!onScreen(X, Y, m * k)) return false;
    g.save(); g.translate(X, Y); g.scale(k, k); lw = Math.max(1.3 / k, 2); g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK;
    fn(k, X, Y); g.restore();
    if (lights.length) flushLights(X, Y, k);
    return true;
  }

  /* ---------- environment (time of day) ---------- */
  const TOD = [{ m: [255, 212, 186], n: 0.15 }, { m: [255, 255, 255], n: 0 }, { m: [255, 168, 124], n: 0.35 }, { m: [92, 110, 190], n: 1 }];
  const env = { m: [255, 255, 255], n: 0 };
  let todIdx = 1; let autoTod = false; let autoClock = 0;
  function updateEnv(dt) {
    const T = TOD[todIdx]; const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 2.5);
    for (let i = 0; i < 3; i++) env.m[i] += (T.m[i] - env.m[i]) * k;
    env.n += (T.n - env.n) * k;
    if (autoTod && !reduceMotion) { autoClock += dt; if (autoClock > 12) { autoClock = 0; todIdx = (todIdx + 1) % 4; syncTodButtons(); } }
  }

  /* ---------- scenery drawers ---------- */
  function drawPalm(t) {
    at(t.x, t.y, 70, () => {
      g.scale(t.s, t.s); g.lineWidth = lw / t.s;
      ell(2, 1, 11, 4, 'rgba(0,0,0,.16)');
      const tx_ = 4 * t.lean; const ty_ = -40;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(8 * t.lean, -20, tx_, ty_); g.strokeStyle = INK; g.lineWidth = lw / t.s + 3.4; g.stroke();
      g.strokeStyle = '#b07a4a'; g.lineWidth = 3.4; g.stroke(); g.strokeStyle = INK; g.lineWidth = lw / t.s;
      const sw = Math.sin(time * 1.4 + t.ph) * 0.08;
      const leaf = (a, len, col) => {
        a += sw; const ex = tx_ + Math.cos(a) * len; const ey = ty_ + Math.sin(a) * len * 0.7 + len * 0.28;
        const cx = tx_ + Math.cos(a) * len * 0.55; const cy = ty_ + Math.sin(a) * len * 0.55 - 9;
        g.beginPath(); g.moveTo(tx_, ty_); g.quadraticCurveTo(cx, cy - 3, ex, ey); g.quadraticCurveTo(cx, cy + 5, tx_, ty_); g.closePath(); g.fillStyle = col; g.fill(); g.stroke();
      };
      leaf(Math.PI * 0.82, 26, '#3fb68b'); leaf(2.1 * Math.PI, 26, '#3fb68b');
      leaf(Math.PI * 1.02, 28, '#4fc99a'); leaf(Math.PI * 1.98, 28, '#4fc99a');
      leaf(Math.PI * 1.26, 27, '#6fdcae'); leaf(Math.PI * 1.74, 27, '#6fdcae'); leaf(Math.PI * 1.5, 22, '#6fdcae');
      ell(tx_ - 2, ty_ + 3, 3.2, 3.2, '#8a5a3c', true); ell(tx_ + 4, ty_ + 5, 3, 3, '#8a5a3c', true);
    });
  }
  function drawUmbrella(u) {
    at(u.x, u.y, 40, () => {
      ell(3, 2, 14, 3.5, 'rgba(0,0,0,.16)');
      box(7, -5, 18, 5, '#ffffff', 2);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -26); g.stroke();
      g.beginPath(); g.ellipse(0, -26, 16, 8, 0, Math.PI, 0); g.closePath(); g.fillStyle = u.c; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, -26, 6, 8, 0, Math.PI, 0); g.fillStyle = '#ffffff'; g.fill();
    });
  }
  function drawHouse(h) {
    const night = env.n;
    at(h.x, h.y, 90, () => {
      const w = h.w; const hh = h.h; const d = 8;
      ell(4, 2, w * 0.7, 5, 'rgba(0,0,0,.16)');
      box(-w / 2, -hh, w, hh, h.wall);
      poly([[w / 2, 0], [w / 2 + d, -4], [w / 2 + d, -hh - 4], [w / 2, -hh]], shade(h.wall, -0.2));
      if (h.pitch) poly([[-w / 2 - 3, -hh], [w / 2 + 3, -hh], [w / 2 + d, -hh - 6], [w / 2 - 2, -hh - 13], [-w / 2 + 3, -hh - 13]], h.roof);
      else { poly([[-w / 2, -hh], [w / 2, -hh], [w / 2 + d, -hh - 4], [-w / 2 + d, -hh - 4]], shade(h.roof, 0.2)); box(-w / 2 + 3, -hh - 6, 8, 5, '#d8d0bf', 1); }
      const rows = Math.max(1, Math.floor((hh - 10) / 14)); const cols = w > 26 ? 3 : 2;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const lit = night > 0.2 && (h.seed + r * 3 + c) % 3 !== 0; const wx = -w / 2 + ((c + 0.5) * w) / cols - 3; const wy = -hh + 6 + r * 14;
        if (wy > -12) continue;
        box(wx, wy, 6, 8, lit ? '#ffd873' : '#8fd3f4', 1.5);
      }
      box(-3, -9, 6, 9, '#7a4e32', 1.5);
      if (night > 0.2) lights.push([0, -hh / 2, Math.min(40, 14 + hh * 0.5), '255,200,110']);
    });
  }
  function drawMosque(m) {
    at(m.x, m.y, 110, () => {
      const s = m.s; g.scale(s, s); g.lineWidth = lw / s;
      ell(4, 2, 34, 7, 'rgba(0,0,0,.16)');
      box(-26, -22, 52, 22, '#f6efe0');
      poly([[26, 0], [34, -4], [34, -26], [26, -22]], '#d8cfba');
      g.beginPath(); g.moveTo(-8, 0); g.lineTo(-8, -9); g.quadraticCurveTo(0, -19, 8, -9); g.lineTo(8, 0); g.closePath(); g.fillStyle = '#4a3b30'; g.fill(); g.stroke();
      g.beginPath(); g.arc(0, -22, 18, Math.PI, 0); g.closePath(); g.fillStyle = m.dome; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, -40); g.lineTo(0, -48); g.stroke(); g.beginPath(); g.arc(0, -50, 2.8, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
      box(30, -62, 8, 62, '#f6efe0'); poly([[29, -62], [39, -62], [34, -74]], m.dome);
      box(31, -50, 6, 6, env.n > 0.2 ? '#ffd873' : '#8fd3f4', 1);
      if (env.n > 0.2) lights.push([0, -20, 38, '255,215,120']);
    });
  }
  function drawLobby(b) {
    at(b.bx, b.bldY, 100, () => {
      const night = env.n;
      ell(5, 3, 52, 10, 'rgba(0,0,0,.18)');
      box(-36, -8, 72, 8, '#ecd7a6');
      box(-30, -32, 60, 24, '#fff6e0');
      g.save(); g.lineWidth = lw * 2; g.strokeStyle = '#a9744a'; for (let x = -24; x <= 24; x += 16) { g.beginPath(); g.moveTo(x, -32); g.lineTo(x, -8); g.stroke(); } g.restore();
      box(-7, -28, 14, 20, night > 0.2 ? '#ffd873' : '#7a4e32', 3);
      poly([[-42, -32], [42, -32], [24, -60], [-24, -60]], '#d9a35f');
      g.save(); g.globalAlpha = 0.35; g.beginPath(); for (let x = -34; x < 36; x += 8) { g.moveTo(x, -33); g.lineTo(x * 0.55, -59); } g.stroke(); g.restore();
      box(-6, -68, 12, 9, '#c98a4a', 2);
      if (night > 0.2) lights.push([0, -20, 46, '255,200,110']);
    });
  }
  function drawVilla(v) {
    at(v.x, v.y, 70, () => {
      const night = env.n;
      ell(3, 6, 28, 7, 'rgba(0,70,100,.22)');
      g.save(); g.lineWidth = lw * 1.6; g.strokeStyle = '#7b5232';
      [-20, -7, 7, 20].forEach((px) => { g.beginPath(); g.moveTo(px, 0); g.lineTo(px, 11); g.stroke(); }); g.restore();
      box(-27, -6, 54, 8, '#d9a86c');
      box(-19, -27, 38, 21, '#fff6e0');
      box(-5, -23, 10, 13, night > 0.2 ? '#ffd873' : '#7ccbf5', 2);
      poly([[-27, -27], [27, -27], [13, -48], [-13, -48]], v.roof);
      g.save(); g.globalAlpha = 0.35; g.beginPath(); for (let x = -22; x < 24; x += 7) { g.moveTo(x, -28); g.lineTo(x * 0.5, -47); } g.stroke(); g.restore();
      if (night > 0.2) lights.push([0, -16, 32, '255,200,110']);
    });
  }
  function jetShape(s) {
    g.save(); g.scale(s, s); g.lineWidth = lw / s;
    g.beginPath(); g.ellipse(0, -14, 44, 8, 0, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
    poly([[-38, -16], [-52, -36], [-44, -36], [-26, -18]], '#2ec4c6');
    poly([[-6, -18], [12, -18], [-8, -32], [-22, -32]], '#e9eef2');
    poly([[-4, -10], [12, -10], [-6, 0], [-20, 0]], '#d4dbe0');
    g.beginPath(); for (let i = -22; i < 30; i += 8) { g.moveTo(i, -16); g.lineTo(i, -14); } g.lineWidth = lw * 1.4 / s; g.stroke();
    box(30, -18, 8, 5, '#7ccbf5', 2);
    g.restore();
  }
  function drawJetStatic(x, y, s) { at(x, y, 90, () => { ell(0, 2, 42 * s, 6 * s, 'rgba(0,0,0,.16)'); jetShape(s); }); }
  function planeShape(spin) {
    box(-26, 1, 50, 5, '#e8503a', 2.5);
    g.beginPath(); g.moveTo(-12, 1); g.lineTo(-10, -8); g.moveTo(10, 1); g.lineTo(10, -8); g.stroke();
    g.beginPath(); g.ellipse(0, -14, 28, 8, 0, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
    poly([[-24, -15], [-36, -31], [-28, -31], [-16, -17]], '#e8503a');
    box(10, -19, 10, 5, '#7ccbf5', 2);
    poly([[-8, -23], [14, -23], [22, -34], [0, -34]], '#ffffff');
    g.beginPath(); g.ellipse(30, -14, 2.2, 3 + Math.abs(Math.sin(spin)) * 7, 0, 0, TAU); g.fillStyle = 'rgba(60,60,70,.5)'; g.fill();
  }
  function drawTerminal(b) {
    at(b.tx, b.ty, 130, () => {
      const night = env.n;
      ell(8, 3, 86, 10, 'rgba(0,0,0,.16)');
      box(-72, -28, 144, 28, '#f3f0e6');
      poly([[72, 0], [82, -5], [82, -33], [72, -28]], '#cfcabb');
      box(-64, -22, 128, 12, night > 0.2 ? '#ffd873' : '#8fd3f4', 2);
      g.beginPath(); for (let x = -48; x <= 48; x += 16) { g.moveTo(x, -22); g.lineTo(x, -10); } g.stroke();
      poly([[-78, -28], [90, -28], [84, -38], [-72, -38]], '#2ec4c6');
      box(-14, -50, 28, 12, '#ffffff', 3); emoji('✈️', 0, -44, 11);
      if (night > 0.2) lights.push([0, -16, 70, '255,220,150']);
    });
  }
  function drawControlTower(x, y) {
    at(x, y, 110, () => {
      ell(2, 2, 14, 4, 'rgba(0,0,0,.16)');
      box(-6, -62, 12, 62, '#f3f0e6'); poly([[6, 0], [11, -3], [11, -65], [6, -62]], '#cfcabb');
      box(-15, -84, 30, 22, env.n > 0.2 ? '#ffd873' : '#8fd3f4', 4); poly([[-19, -84], [19, -84], [12, -94], [-12, -94]], '#e8503a');
      g.beginPath(); g.moveTo(0, -94); g.lineTo(0, -106); g.stroke();
      if (env.n > 0.2) lights.push([0, -76, 34, '255,220,150']);
    });
  }
  function drawPontoon(b) {
    at(b.x, b.bldY, 100, () => {
      ell(2, 10, 60, 9, 'rgba(0,70,100,.2)');
      box(-40, -34, 28, 24, '#fff6e0'); poly([[-46, -34], [-6, -34], [-14, -50], [-38, -50]], '#ff6b5b');
      box(-34, -26, 10, 16, '#7ccbf5', 2);
      g.save(); g.translate(26, -2 + Math.sin(time * 2) * 1.2); g.scale(0.8, 0.8); g.lineWidth = lw / 0.8; planeShape(time * 4); g.restore();
    });
  }
  function drawFerryShed(b) {
    at(b.tx, b.ty, 90, () => {
      ell(3, 2, 32, 6, 'rgba(0,0,0,.16)');
      box(-28, -26, 56, 26, '#fff6e0'); poly([[-34, -26], [34, -26], [24, -40], [-24, -40]], '#3f8f9a');
      box(-6, -22, 12, 22, '#7a4e32', 2); box(-24, -20, 12, 9, '#8fd3f4', 2); box(12, -20, 12, 9, '#8fd3f4', 2);
    });
  }
  function drawFerryBoat(b) {
    at(b.fx, b.fy, 90, () => {
      g.translate(0, Math.sin(time * 1.8) * 1.4);
      ell(0, 7, 38, 6, 'rgba(0,60,90,.25)');
      poly([[-36, -8], [34, -8], [28, 4], [-30, 4]], '#ffffff');
      box(-30, -8, 56, 4, '#2ec4c6');
      box(-24, -24, 44, 16, '#fff6e0', 2); box(-14, -38, 26, 14, '#fff6e0', 2);
      for (let x = -20; x < 16; x += 11) box(x, -21, 7, 6, '#7ccbf5', 1);
      box(-6, -35, 12, 6, '#7ccbf5', 1);
      g.beginPath(); g.moveTo(0, -38); g.lineTo(0, -48); g.stroke(); poly([[0, -48], [10, -45], [0, -42]], '#e8503a');
    });
  }
  function drawBadge(b) {
    b.badge = null;
    at(b.x, b.y + b.ry * 0.1, 50, (k, X, Y) => {
      const by = -b.hh - 14 + Math.sin(time * 2 + b.idx) * 1.5;
      g.beginPath(); g.arc(0, by, 12, 0, TAU); g.fillStyle = '#fffdf6'; g.fill(); g.stroke(); emoji(b.p.emoji, 0, by + 1, 14);
      b.badge = [X, Y + by * k, k];
    });
  }
  function drawSeaBadge(b) {
    b.badge = null;
    at(b.x, b.y, 50, (k, X, Y) => {
      const by = -62 + Math.sin(time * 2 + b.idx) * 2;
      ell(0, 0, 14, 5, 'rgba(255,255,255,.55)');
      g.beginPath(); g.moveTo(0, by + 12); g.lineTo(0, -4); g.setLineDash([3, 4]); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(0, by, 15, 0, TAU); g.fillStyle = '#e4fbff'; g.fill(); g.stroke(); emoji(b.p.emoji, 0, by + 1, 17);
      b.badge = [X, Y + by * k, k];
    });
  }

  /* ---------- creatures ---------- */
  function drawCreature(c) {
    if (c.t === 'glow') return;
    at(c.x, c.y, 90 * c.sz, (k, X, Y) => {
      c.sx = X; c.sy = Y; c.sk = k;
      if (c.z > 1) { /* dolphin shadow is drawn separately */ }
      g.scale(c.face * c.sz, c.sz); g.rotate(c.pitch);
      g.lineWidth = Math.max(lw * 0.8, 1.3);
      const wag = Math.sin(time * 5 + c.ph);
      switch (c.t) {
        case 'school':
          c.mem.forEach((m, i) => {
            const ox = m.ox + Math.sin(time * 1.6 + i) * 5; const oy = m.oy + Math.cos(time * 1.3 + i * 2) * 3;
            g.fillStyle = m.col; g.beginPath(); g.ellipse(ox, oy, 5 * m.s, 3 * m.s, 0, 0, TAU); g.fill(); g.stroke();
            g.beginPath(); g.moveTo(ox - 4 * m.s, oy); g.lineTo(ox - 9 * m.s, oy - 3 * m.s + wag); g.lineTo(ox - 9 * m.s, oy + 3 * m.s + wag); g.closePath(); g.fill(); g.stroke();
          });
          break;
        case 'dolphin':
          g.beginPath(); g.moveTo(-22, 0); g.quadraticCurveTo(-4, -14, 20, -8); g.quadraticCurveTo(28, -6, 34, -3); g.quadraticCurveTo(26, 0, 18, 3); g.quadraticCurveTo(0, 10, -22, 0); g.closePath(); g.fillStyle = '#7fa8cc'; g.fill(); g.stroke();
          g.beginPath(); g.moveTo(-6, 4); g.quadraticCurveTo(8, 8, 18, 3); g.quadraticCurveTo(8, 4, -6, 4); g.fillStyle = '#e8f3fb'; g.fill();
          poly([[-2, -12], [-9, -23], [5, -11]], '#5d86ab'); poly([[-22, 0], [-33, -8 + wag * 2], [-29, 0], [-33, 8 + wag * 2]], '#5d86ab');
          ell(18, -4, 1.4, 1.4, INK);
          break;
        case 'turtle':
          g.save(); g.fillStyle = '#8fd17a';
          [[-8, -8, -0.6], [-8, 8, 0.6], [9, -8, 0.5], [9, 8, -0.5]].forEach(([fx_, fy_, a], i) => { g.save(); g.translate(fx_, fy_); g.rotate(a + wag * 0.25 * (i % 2 ? 1 : -1)); g.beginPath(); g.ellipse(0, fy_ > 0 ? 5 : -5, 3.2, 7, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); });
          g.restore();
          g.beginPath(); g.ellipse(0, 0, 13, 9.5, 0, 0, TAU); g.fillStyle = '#6fb56a'; g.fill(); g.stroke();
          g.save(); g.globalAlpha = 0.5; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.moveTo(0, -8); g.lineTo(0, 8); g.stroke(); g.restore();
          ell(15, 0, 4.5, 3.8, '#8fd17a', true); ell(16.5, -1.3, 0.9, 0.9, INK);
          break;
        case 'manta': {
          const f = 0.75 + 0.25 * wag;
          g.beginPath(); g.moveTo(16, 0); g.quadraticCurveTo(6, -14 * f, -14, -27 * f); g.quadraticCurveTo(-8, -6, -18, 0); g.quadraticCurveTo(-8, 6, -14, 27 * f); g.quadraticCurveTo(6, 14 * f, 16, 0); g.closePath();
          g.fillStyle = '#37465f'; g.fill(); g.stroke();
          g.beginPath(); g.moveTo(-18, 0); g.lineTo(-42, 2 + wag * 2); g.stroke();
          g.beginPath(); g.moveTo(14, -3); g.quadraticCurveTo(20, -6, 22, -2); g.moveTo(14, 3); g.quadraticCurveTo(20, 6, 22, 2); g.stroke();
          ell(5, -3, 2, 2.4, '#fff'); ell(5, 3, 2, 2.4, '#fff');
          break;
        }
        case 'whaleshark':
          g.beginPath(); g.ellipse(0, 0, 50, 11, 0, 0, TAU); g.fillStyle = '#5f7f9f'; g.fill(); g.stroke();
          poly([[-48, 0], [-67, -14 + wag * 3], [-62, 0], [-67, 14 + wag * 3]], '#4f6d8c');
          poly([[18, 8], [26, 20], [8, 9]], '#4f6d8c'); poly([[18, -8], [26, -20], [8, -9]], '#4f6d8c');
          g.fillStyle = '#ffffff'; for (let x = -36; x <= 36; x += 10) for (let y = -4; y <= 4; y += 8) { g.beginPath(); g.arc(x + (y > 0 ? 4 : 0), y, 1.7, 0, TAU); g.fill(); }
          g.beginPath(); g.moveTo(46, 3); g.lineTo(38, 3); g.stroke(); ell(40, -4, 1.5, 1.5, INK);
          break;
        case 'reefshark': case 'tiger': {
          const L = c.t === 'tiger' ? 30 : 21; const col = c.t === 'tiger' ? '#6f8190' : '#8a95a3';
          g.beginPath(); g.ellipse(0, 0, L, L * 0.26, 0, 0, TAU); g.fillStyle = col; g.fill(); g.stroke();
          poly([[-L + 2, 0], [-L - 10, -8 + wag * 2], [-L - 6, 0], [-L - 8, 7 + wag * 2]], shade(col, -0.18));
          if (c.t === 'tiger') { g.save(); g.strokeStyle = '#44505e'; g.lineWidth = 2; g.beginPath(); for (let x = -L + 8; x < L - 6; x += 7) { g.moveTo(x, -L * 0.2); g.lineTo(x - 2, L * 0.2); } g.stroke(); g.restore(); }
          poly([[-2, -L * 0.22], [-7, -L * 0.7], [6, -L * 0.22]], shade(col, -0.12));
          if (c.t === 'reefshark') poly([[-7, -L * 0.7], [-5.5, -L * 0.52], [-2, -L * 0.52], [-4.5, -L * 0.66]], '#ffffff');
          ell(L - 6, -2, 1.3, 1.3, INK);
          break;
        }
        default:
      }
    }, c.z);
    if (c.z > 1) at(c.x, c.y, 40, () => { ell(0, 3, 22 * (1 - c.z / 90), 5, 'rgba(0,60,90,.28)'); });
  }
  function drawGlow(b) {
    const c = creatures.find((q) => q.pid === b.id && q.t === 'glow'); if (!c) return;
    const n = env.n; const I = 0.25 + n * 0.9;
    at(b.x, b.y, 150, (k, X, Y) => {
      c.sx = X; c.sy = Y; c.sk = k;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU; const rr_ = 1.15 + 0.12 * Math.sin(i * 1.7 + time); const px = Math.cos(a) * b.islet.rx * rr_; const py = Math.sin(a) * b.islet.ry * rr_ * 1.05;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.8 + i * 1.3));
        g.fillStyle = `rgba(80,225,255,${clamp(I * tw, 0, 1)})`; g.beginPath(); g.arc(px, py, 2.2 + tw * 1.4, 0, TAU); g.fill();
      }
      g.restore();
    });
    if (n > 0.1) at(b.x, b.y, 150, (k, X, Y) => { for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; lights.push([Math.cos(a) * b.islet.rx * 1.15, Math.sin(a) * b.islet.ry * 1.15, 48, '70,210,255']); } void X; void Y; });
  }

  /* ---------- people, buggies, boats ---------- */
  function drawPerson(p) {
    const X = sx(p.x); const Y = sy(p.y); if (!onScreen(X, Y, 60)) { p.sx = undefined; return; }
    const k = Math.max(cam.z, 0.5) * p.k; g.save(); g.translate(X, Y); g.scale(k, k);
    g.lineWidth = Math.max(1.1 / k, 1.6); g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round';
    const sw = p.moving ? Math.sin(p.ph) * 4 : 0; const bob = p.moving ? -Math.abs(Math.sin(p.ph)) * 1.6 : Math.sin(time * 2 + p.id) * 0.4;
    ell(0, 0, 8, 3, 'rgba(0,0,0,.2)');
    const f = p.face;
    g.save(); g.lineWidth = 3.6; g.strokeStyle = '#d8b48a';
    g.beginPath(); g.moveTo(-2.6, -9 + bob); g.lineTo(-2.6 + sw, -0.5); g.moveTo(2.6, -9 + bob); g.lineTo(2.6 - sw, -0.5); g.stroke(); g.restore();
    box(-6, -13 + bob, 12, 5, '#3b7fb8', 2); // shorts
    box(-6, -21 + bob, 12, 10, p.shirt, 4.5);
    g.save(); g.lineWidth = 3; g.strokeStyle = '#ffdcb8';
    g.beginPath(); g.moveTo(-6, -18 + bob); g.lineTo(-8, -12 + bob - sw * 0.3); g.moveTo(6, -18 + bob); g.lineTo(8, -12 + bob + sw * 0.3); g.stroke(); g.restore();
    const hy = -28 + bob;
    ell(0, hy, 7.6, 7.6, '#ffdcb8', true);
    g.beginPath(); g.arc(0, hy, 7.8, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fillStyle = p.hair; g.fill(); g.stroke();
    if (p.style === 1) ell(0, hy - 9, 3.8, 3.8, p.hair, true);
    if (p.style === 2) { ell(0, hy - 5, 12, 3.4, '#e8c98a', true); g.beginPath(); g.arc(0, hy - 6, 6, Math.PI, 0); g.closePath(); g.fillStyle = '#e8c98a'; g.fill(); g.stroke(); }
    if (p.style === 3) { box(-7.5, hy - 7, 15, 4.5, '#5b9bd5', 2); }
    if (p.style === 4) { g.beginPath(); g.arc(0, hy - 1, 8, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = '#ff6b5b'; g.fill(); g.stroke(); box(f > 0 ? 2 : -12, hy - 6, 10, 2.6, '#ff6b5b', 1); }
    g.fillStyle = INK; g.beginPath(); g.arc(f * 2.2 - 2.4, hy + 0.5, 1.2, 0, TAU); g.arc(f * 2.2 + 2.4, hy + 0.5, 1.2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,120,120,.45)'; g.beginPath(); g.arc(f * 2.2 - 4.6, hy + 3, 1.7, 0, TAU); g.arc(f * 2.2 + 4.6, hy + 3, 1.7, 0, TAU); g.fill();
    if (p.eatT > 0 && p.eatEmoji) emoji(p.eatEmoji, f * 10, -15 + bob + Math.sin(time * 6) * 1.5, 11);
    g.restore();
    p.sx = X; p.sy = Y; p.sk = k;
  }
  function head(p, x, y) { ell(x, y, 5.2, 5.2, '#ffdcb8', true); g.beginPath(); g.arc(x, y, 5.4, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fillStyle = p.hair; g.fill(); g.stroke(); if (p.style === 2) ell(x, y - 4, 8, 2.4, '#e8c98a', true); }
  function drawBuggy(b) {
    const hidden = !at(b.x, b.y, 60, (k, X, Y) => {
      b.sx = X; b.sy = Y; b.sk = k;
      g.scale(b.face, 1);
      ell(0, 3, 21, 5, 'rgba(0,0,0,.22)');
      box(-18, -13, 36, 10, b.color, 4);
      poly([[18, -13], [24, -9], [24, -4], [18, -4]], shade(b.color, -0.15));
      g.save(); g.lineWidth = lw * 1.3; g.strokeStyle = '#6b4a30'; g.beginPath(); g.moveTo(-14, -13); g.lineTo(-14, -31); g.moveTo(11, -13); g.lineTo(11, -31); g.stroke(); g.restore();
      if (b.pax) { head(b.pax, -7, -22); }
      if (b.state === 'carry' || b.pax) head({ hair: '#3b2a20', style: 0 }, 3, -22);
      for (let i = 0; i < 4; i++) box(-18 + i * 8.5, -37, 8.5, 6, i % 2 ? '#ffffff' : b.color, 2);
      [-11, 12].forEach((wx) => { ell(wx, -3, 5.6, 5.6, '#3b3a4a', true); g.save(); g.translate(wx, -3); g.rotate(b.ph); g.beginPath(); g.moveTo(-3, 0); g.lineTo(3, 0); g.strokeStyle = '#cfcfd8'; g.stroke(); g.restore(); });
      if (env.n > 0.2) { lights.push([22, -8, 34, '255,235,160']); lights.push([0, -30, 22, '255,200,110']); }
    });
    if (hidden) b.sx = undefined;
  }
  function drawDhoni(x, y, face, col, pax, moving, alpha) {
    at(x, y, 90, (k, X, Y) => {
      g.globalAlpha = alpha === undefined ? 1 : alpha;
      g.scale(face, 1); g.translate(0, Math.sin(time * 2 + x * 0.01) * 1.2);
      ell(0, 6, 26, 5, 'rgba(0,60,90,.28)');
      if (moving) { g.save(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(-24, 2 + i * 3); g.quadraticCurveTo(-36 - i * 8, 3 + i * 3, -54 - i * 10, 5 + i * 4); g.stroke(); } g.restore(); }
      poly([[-24, -8], [20, -8], [32, -16], [24, 2], [-20, 2]], '#ffffff');
      poly([[-24, -8], [20, -8], [23, -5], [-23, -5]], col);
      box(-10, -22, 18, 14, '#fff6e0', 3); box(-6, -19, 10, 6, '#7ccbf5', 1);
      poly([[-14, -22], [12, -22], [8, -29], [-10, -29]], col);
      pax.forEach((p, i) => head(p, -14 + i * 7, -13));
      if (env.n > 0.2) lights.push([0, -16, 30, '255,200,110']);
      g.globalAlpha = 1; void k; void X; void Y;
    });
  }
  function drawVehicle(v) {
    if (v.vk === 'boat') drawDhoni(v.x, v.y, v.face, v.color, v.pax, v.phase === 'go', v.alpha);
  }
  function drawFlying() {
    for (const v of vehicles) {
      if (v.vk !== 'plane') continue;
      at(v.x, v.y, 80, () => { g.globalAlpha = v.alpha * 0.8; ell(0, 2, 24 * (1 - v.alt / 140), 5, 'rgba(0,50,80,.28)'); g.globalAlpha = 1; });
      at(v.x, v.y, 90, () => {
        g.globalAlpha = v.alpha; g.scale(v.face, 1);
        if (v.phase === 'go' && v.alt < 3) { g.save(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-26, 4); g.quadraticCurveTo(-44, 6, -66, 9); g.stroke(); g.restore(); }
        planeShape(time * 30); v.pax.forEach((p) => head(p, 14, -15));
        if (env.n > 0.2) lights.push([0, -14, 30, '255,240,200']);
        g.globalAlpha = 1;
      }, v.alt + 0.1);
    }
    for (const b of birds) {
      const x = b.cx + Math.cos(b.a) * b.r; const y = b.cy + Math.sin(b.a) * b.r * 0.5; const dir = b.w > 0 ? 1 : -1; const X = sx(x); const Y = sy(y, b.z + Math.sin(time + b.ph) * 4);
      if (!onScreen(X, Y, 20)) continue;
      const f = Math.sin(time * 8 + b.ph) * 4 * cam.z; const s = 7 * Math.max(cam.z, 0.5);
      g.save(); g.strokeStyle = INK; g.lineWidth = Math.max(1.4, 2 * cam.z); g.beginPath(); g.moveTo(X - s * dir, Y - f); g.quadraticCurveTo(X - s * 0.4 * dir, Y - s * 0.5, X, Y); g.quadraticCurveTo(X + s * 0.4 * dir, Y - s * 0.5, X + s * dir, Y - f); g.stroke(); g.restore();
    }
    if (jet.t > 0 && jet.t < 1) {
      const x = lerp(WORLD.x0 - 260, WORLD.x1 + 260, jet.t); const y = lerp(-260, 280, jet.t) ;
      at(x, y, 120, () => { g.scale(1.5, 1.5); g.lineWidth = lw / 1.5; jetShape(1); }, 150);
    }
  }
  function drawClouds() {
    for (const c of clouds) {
      if (!paused) { c.x += c.v * lastDt; if (c.x > 2300) c.x = -1500; }
      const X = sx(c.x); const Y = sy(c.y, 190); const k = cam.z * c.s; if (!onScreen(X, Y, 120 * k)) continue;
      const SY = sy(c.y);
      g.fillStyle = 'rgba(0,50,80,.1)'; g.beginPath(); g.ellipse(X, SY + 20 * k, 50 * k, 12 * k, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.88)'; g.beginPath();
      g.arc(X - 28 * k, Y, 18 * k, 0, TAU); g.arc(X, Y - 10 * k, 24 * k, 0, TAU); g.arc(X + 28 * k, Y, 19 * k, 0, TAU); g.rect(X - 28 * k, Y, 56 * k, 18 * k);
      g.fill();
    }
  }

  /* ---------- ground layer ---------- */
  function ellPath(x, y, rx, ry) { g.moveTo(sx(x) + rx * cam.z, sy(y)); g.ellipse(sx(x), sy(y), rx * cam.z, ry * cam.z * cam.tilt, 0, 0, TAU); }
  function rectPath(x0, y0, x1, y1) { g.moveTo(sx(x0), sy(y0)); g.lineTo(sx(x1), sy(y0)); g.lineTo(sx(x1), sy(y1)); g.lineTo(sx(x0), sy(y1)); g.closePath(); }
  function smooth(pts) {
    const n = pts.length; const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const s = m(pts[n - 1], pts[0]); g.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const p = pts[i]; const q = pts[(i + 1) % n]; const mm = m(p, q); g.quadraticCurveTo(p[0], p[1], mm[0], mm[1]); }
    g.closePath();
  }
  function blob(o, sc) { const pts = o.out.map((p) => [sx(o.x + p[0] * o.rx * sc), sy(o.y + p[1] * o.ry * sc)]); g.beginPath(); smooth(pts); }
  function jetty(pts, wd) {
    const z = cam.z; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(sx(p[0]), sy(p[1])) : g.moveTo(sx(p[0]), sy(p[1]))));
    g.lineCap = 'butt'; g.lineJoin = 'round'; g.strokeStyle = INK; g.lineWidth = (wd + 5) * z; g.stroke(); g.strokeStyle = '#d9a86c'; g.lineWidth = wd * z; g.stroke();
    g.lineCap = 'round';
  }
  const SANDC = '#f9e8b8';
  function drawSand(o, green, paved) {
    const z = cam.z;
    blob(o, 1.1); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(1.5, 3.2 * z); g.setLineDash([10 * z, 12 * z]); g.lineDashOffset = -time * 6 * z; g.stroke(); g.setLineDash([]);
    blob(o, 1); g.fillStyle = SANDC; g.fill(); g.strokeStyle = INK; g.lineWidth = Math.max(1.4, 2.4 * z); g.stroke();
    if (green) { blob(o, green); g.fillStyle = paved ? '#e4dcc4' : '#93d97d'; g.fill(); g.strokeStyle = paved ? 'rgba(45,42,50,.5)' : 'rgba(45,42,50,.55)'; g.lineWidth = Math.max(1, 1.5 * z); g.stroke(); }
  }
  const GREEN_OF = { resort: 0.64, local: 0.72, long: 0.8, city: 0.82, ferry: 0.5 };
  let selId = null;
  function drawGround() {
    const z = cam.z; g.lineJoin = 'round'; g.lineCap = 'round';
    g.fillStyle = '#bfe9fb'; g.fillRect(0, 0, W, H);
    // the sea, as a floating slab
    const depth = 60; const fx0 = sx(WORLD.x0); const fx1 = sx(WORLD.x1); const fy0 = sy(WORLD.y1); const fy1 = sy(WORLD.y1, -depth);
    g.lineWidth = 3 * Math.max(z, 0.6); g.strokeStyle = INK;
    g.fillStyle = '#1d86b8'; g.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0); g.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    g.fillStyle = '#176f9f'; g.fillRect(fx0, fy0 + (fy1 - fy0) * 0.55, fx1 - fx0, (fy1 - fy0) * 0.45);
    g.beginPath(); rectPath(WORLD.x0, WORLD.y0, WORLD.x1, WORLD.y1); g.fillStyle = '#4fd3dc'; g.fill(); g.stroke();
    g.fillStyle = 'rgba(31,140,185,.22)'; g.beginPath(); for (const d of deeps) ellPath(d.x, d.y, d.rx, d.ry); g.fill();
    // wave marks
    g.save(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1.2, 2 * z); g.beginPath();
    for (const t of waves) {
      const X = sx(t.x); const Y = sy(t.y); if (!onScreen(X, Y, 30)) continue; const s = 7 * z * t.s; const o = Math.sin(time * 1.2 + t.ph) * 2 * z;
      g.moveTo(X - s + o, Y); g.quadraticCurveTo(X + o, Y - s * 0.55, X + s + o, Y);
    }
    g.stroke(); g.restore();
    // shallow lagoons around every island
    const halo = (x, y, rx, ry) => { g.beginPath(); ellPath(x, y + 4, rx + 66, ry + 40); g.fillStyle = '#7fe8de'; g.fill(); g.beginPath(); ellPath(x, y + 4, rx + 38, ry + 22); g.fillStyle = '#aaf4ea'; g.fill(); };
    lands.forEach((L) => { halo(L.x, L.y, L.rx, L.ry); (L.extras || []).forEach((e) => halo(e.x, e.y, e.rx, e.ry)); });
    seas.forEach((b) => { if (b.islet) halo(b.x, b.y, b.islet.rx, b.islet.ry); });
    banks.forEach((o) => halo(o.x, o.y, o.rx, o.ry));
    // reef patch and corals at Banana Reef
    const reef = bById.get('bananareef');
    if (reef && coralSpots.length) {
      g.beginPath(); ellPath(reef.x, reef.y, 90, 40); g.fillStyle = 'rgba(30,150,170,.45)'; g.fill();
      coralSpots.forEach((c) => {
        const X = sx(c.x); const Y = sy(c.y); if (!onScreen(X, Y, 40)) return; const s = c.s * z * 1.3;
        g.save(); g.strokeStyle = c.c; g.lineWidth = Math.max(2, 4 * s); g.lineCap = 'round'; g.beginPath();
        [[-6, -12], [0, -17], [6, -11]].forEach(([dx, dy]) => { g.moveTo(X, Y); g.lineTo(X + dx * s, Y + dy * s); }); g.stroke(); g.restore();
      });
    }
    // approximate-area rings for sea life
    seas.forEach((b) => {
      g.beginPath(); ellPath(b.x, b.y, b.R[0], b.R[1]); g.strokeStyle = selId === b.id ? '#ffc93c' : 'rgba(255,255,255,.7)';
      g.lineWidth = selId === b.id ? Math.max(2.5, 4 * z) : Math.max(1.2, 2 * z); g.setLineDash([9 * z, 9 * z]); g.lineDashOffset = -time * 8 * z; g.stroke(); g.setLineDash([]);
    });
    // swimmers below the surface
    creatures.forEach((c) => { if (c.under && c.t !== 'glow') drawCreature(c); });
    // undersea restaurant dome
    lands.forEach((L) => {
      if (!L.dome) return;
      g.beginPath(); ellPath(L.dome[0], L.dome[1], 34, 15); g.fillStyle = 'rgba(190,240,255,.75)'; g.fill(); g.strokeStyle = INK; g.lineWidth = Math.max(1.4, 2.4 * z); g.stroke();
      g.beginPath(); ellPath(L.dome[0], L.dome[1], 20, 8); g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
      emoji('🍽️', sx(L.dome[0]), sy(L.dome[1]) - 2 * z, 14 * Math.max(z, 0.7));
    });
    // sand, greenery, paths
    banks.forEach((o) => drawSand(o, 0));
    seas.forEach((b) => { if (b.islet) { drawSand(b.islet, b.islet.green); } });
    lands.forEach((L) => {
      (L.extras || []).forEach((e) => drawSand(e, e.green));
      // pontoon deck / sand
      if (L.kind === 'pontoon') {
        g.beginPath(); rectPath(L.x - L.rx, L.y - L.ry * 0.8, L.x + L.rx, L.y + L.ry * 0.8); g.fillStyle = '#d9a86c'; g.fill(); g.strokeStyle = INK; g.lineWidth = Math.max(1.4, 2.4 * z); g.stroke();
        g.strokeStyle = 'rgba(110,70,35,.5)'; g.lineWidth = Math.max(1, 1.5 * z); g.beginPath();
        for (let x = L.x - L.rx + 12; x < L.x + L.rx; x += 12) { g.moveTo(sx(x), sy(L.y - L.ry * 0.8)); g.lineTo(sx(x), sy(L.y + L.ry * 0.8)); } g.stroke();
      } else drawSand(L, GREEN_OF[L.kind] || 0, L.kind === 'city' || L.kind === 'ferry');
      (L.causeways || []).forEach((c) => jetty(c.pts, c.road ? 9 : 6));
      if (L.kind === 'airport') { // runway and apron
        const rx0 = L.x - L.rx * 0.9; const rx1 = L.x + L.rx * 0.9; const ry0 = L.y - L.ry * 0.62; const ry1 = L.y - L.ry * 0.14;
        g.beginPath(); rectPath(rx0, ry0, rx1, ry1); g.fillStyle = '#6b6f7a'; g.fill(); g.strokeStyle = INK; g.lineWidth = Math.max(1.2, 2 * z); g.stroke();
        g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, 2 * z); g.setLineDash([14 * z, 12 * z]); g.beginPath(); g.moveTo(sx(rx0 + 10), sy((ry0 + ry1) / 2)); g.lineTo(sx(rx1 - 10), sy((ry0 + ry1) / 2)); g.stroke(); g.setLineDash([]);
      }
      if (L.kind !== 'pontoon') { // footpaths
        g.strokeStyle = L.kind === 'city' || L.kind === 'ferry' ? '#c9c2ae' : '#f3dfa8'; g.lineWidth = 8 * z; g.lineCap = 'butt'; g.beginPath();
        L.edges.forEach(([i, j]) => { g.moveTo(sx(L.G.n[i][0]), sy(L.G.n[i][1])); g.lineTo(sx(L.G.n[j][0]), sy(L.G.n[j][1])); }); g.stroke(); g.lineCap = 'round';
      }
      jetty([[L.pierBase[0], L.pierBase[1] - 4], L.pier], 12);
      if (L.jet) jetty([[L.villaBase[0], L.villaBase[1] + 4], ...L.jet], 11);
      if (selId === L.id) { g.beginPath(); ellPath(L.x, L.y + 4, L.rx + 20, L.ry + 14); g.strokeStyle = '#ffc93c'; g.lineWidth = Math.max(2.5, 4 * z); g.stroke(); }
    });
    seas.forEach((b) => { if (b.p.creature === 'glow') drawGlow(b); });
  }

  /* ---------- screen-space overlays ---------- */
  function pill(text, x, y, o) {
    o = o || {}; const size = o.size || 13;
    g.font = `600 ${size}px ${FONT}`; const w = g.measureText(text).width + 18; const h = size + 11;
    rr(x - w / 2, y - h, w, h, h / 2); g.fillStyle = o.bg || 'rgba(255,253,246,.96)'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - h / 2 + 1);
  }
  function pillRect(text, x, y, size) { g.font = `600 ${size}px ${FONT}`; const w = g.measureText(text).width + 18; const h = size + 11; return [x - w / 2, y - h, w, h]; }
  function wrapText(text, maxW) {
    const lines = []; let line = ''; const cjk = /[　-鿿]/.test(text); const toks = cjk ? [...text] : text.split(' ');
    for (const t of toks) {
      const test = line ? (cjk ? line + t : line + ' ' + t) : t;
      if (g.measureText(test).width > maxW && line) { lines.push(line); line = t; } else line = test;
    }
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }
  function drawBubble(p) {
    if (p.sayT <= 0 || !p.say || p.sx === undefined || !onScreen(p.sx, p.sy, 80)) return;
    const k = p.sk; const size = clamp(12 * Math.max(cam.z, 0.7), 11, 15);
    g.font = `500 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = wrapText(p.say, 150); const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 16; const lh = size + 3; const h = lines.length * lh + 10;
    const x = clamp(p.sx, w / 2 + 4, W - w / 2 - 4); const yb = p.sy - 40 * k - 4; const a = Math.min(1, p.sayT * 1.5);
    g.save(); g.globalAlpha = a;
    rr(x - w / 2, yb - h, w, h, 10); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(p.sx - 5, yb - 1); g.lineTo(p.sx, yb + 6); g.lineTo(p.sx + 5, yb - 1); g.fillStyle = '#ffffff'; g.fill();
    g.beginPath(); g.moveTo(p.sx - 5, yb); g.lineTo(p.sx, yb + 6); g.lineTo(p.sx + 5, yb); g.stroke();
    g.fillStyle = INK; lines.forEach((l, i) => g.fillText(l, x, yb - h + 5 + lh * (i + 0.5)));
    g.restore();
  }
  let labelsOn = true; let paused = false; let hoverB = null;
  function drawLabels() {
    const taken = [];
    const free = (r) => !taken.some((t) => r[0] < t[0] + t[2] && r[0] + r[2] > t[0] && r[1] < t[1] + t[3] && r[1] + r[3] > t[1]);
    if (labelsOn && cam.z < 1.5) {
      ORDER.forEach((key) => {
        const [wx, wy] = LABEL_AT[key]; const X = sx(wx); const Y = sy(wy); if (!onScreen(X, Y, 140)) return;
        const size = clamp(15 * Math.sqrt(cam.z), 12, 18); const text = `${atollName(key)} · ${distCount[key]}`;
        pill(text, X, Y, { size, bg: mix(DCOL[key], '#ffffff', 0.72) }); taken.push(pillRect(text, X, Y, size));
      });
    }
    const pri = { hotel: 0, island: 1, sea: 2, go: 3 };
    const list = [...places].sort((a, b) => (selId === b.id) - (selId === a.id) || (hoverB === b) - (hoverB === a) || pri[a.p.type] - pri[b.p.type] || a.y - b.y);
    for (const b of list) {
      const forced = hoverB === b || selId === b.id;
      if (!forced && !(labelsOn && cam.z >= 0.3)) continue;
      if (!b.badge) continue;
      const x = b.badge[0]; const y = b.badge[1] - 16 * b.badge[2]; const name = nameOf(b.p); const r = pillRect(name, x, y, 13);
      if (!forced && !free(r)) continue;
      pill(name, x, y, { size: 13, bg: selId === b.id ? '#ffe680' : undefined }); taken.push(r);
    }
    if (followP && followP.sx !== undefined) {
      const t = (performance.now() / 300) % TAU; g.save(); g.fillStyle = '#ff6b5b'; g.strokeStyle = INK; g.lineWidth = 2;
      const y = followP.sy - (followP.kind === 'guest' ? 52 : followP.kind === 'buggy' ? 50 : 40) * (followP.sk || 1) + Math.sin(t) * 3;
      g.beginPath(); g.moveTo(followP.sx - 7, y - 10); g.lineTo(followP.sx + 7, y - 10); g.lineTo(followP.sx, y); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
  }

  /* ---------- frame ---------- */
  let lastDt = 0.016;
  function updateHits() {
    const k = cam.z;
    places.forEach((b) => {
      const X = sx(b.x); const Y = sy(b.y);
      if (b.sea) b.hit = { x: X - 18 * k, y: Y - 80 * k, w: 36 * k, h: 82 * k };
      else { const hw = b.rx * k * 0.9; b.hit = { x: X - hw, y: Y - (b.hh + 22) * k, w: 2 * hw, h: (b.hh + 22) * k + b.ry * k * cam.tilt }; }
    });
  }
  const isHidden = (p) => p.state === 'ride' || p.state === 'board' || p.state === 'sail';
  function render() {
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    litList.length = 0; lights.length = 0;
    updateHits();
    places.forEach((b) => { b.badge = null; });
    drawGround();

    const dyn = [];
    guests.forEach((p) => { if (isHidden(p)) { p.sx = undefined; return; } dyn.push({ y: p.y + 1, f: () => drawPerson(p) }); });
    buggies.forEach((b) => dyn.push({ y: b.y + 1, f: () => drawBuggy(b) }));
    vehicles.forEach((v) => { if (v.vk === 'boat') dyn.push({ y: v.y, f: () => drawVehicle(v) }); });
    dhonis.forEach((d) => { const x = d.cx + d.rx * Math.cos(d.a); const y = d.cy + d.ry * Math.sin(d.a); const face = -Math.sin(d.a) * d.w >= 0 ? 1 : -1; dyn.push({ y, f: () => drawDhoni(x, y, face, d.c, [], true) }); });
    creatures.forEach((c) => { if (!c.under) dyn.push({ y: c.y, f: () => drawCreature(c) }); });
    dyn.sort((a, b) => a.y - b.y);
    let di = 0;
    for (let si = 0; si < statics.length; si++) {
      while (di < dyn.length && dyn[di].y <= statics[si].y) dyn[di++].f();
      statics[si].f();
    }
    while (di < dyn.length) dyn[di++].f();

    drawFlying();
    fx.forEach((f) => { const X = sx(f.x); const Y = sy(f.y, f.z); g.globalAlpha = clamp(f.life, 0, 1); emoji(f.ch, X, Y, 14 * Math.max(cam.z, 0.7)); g.globalAlpha = 1; });
    drawClouds();

    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgb(${env.m.map(Math.round).join(',')})`; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    if (env.n > 0.05) {
      for (const L of litList) {
        const grd = g.createRadialGradient(L[0], L[1], 0, L[0], L[1], L[2]);
        grd.addColorStop(0, `rgba(${L[3]},${0.55 * env.n})`); grd.addColorStop(1, `rgba(${L[3]},0)`);
        g.fillStyle = grd; g.fillRect(L[0] - L[2], L[1] - L[2], L[2] * 2, L[2] * 2);
      }
    }
    g.globalCompositeOperation = 'source-over';
    drawLabels();
    // keep speech bubbles readable: none when zoomed far out, otherwise only a few nearest the centre
    if (cam.z >= 0.55 || followP) {
      guests.filter((p) => p.sayT > 0 && p.sx !== undefined && onScreen(p.sx, p.sy, 0))
        .sort((a, b) => ((a === followP) ? -1 : (b === followP) ? 1 : Math.hypot(a.sx - W / 2, a.sy - H / 2) - Math.hypot(b.sx - W / 2, b.sy - H / 2)))
        .slice(0, 5).forEach(drawBubble);
    }
  }

  function updateAmbient(dt) {
    dhonis.forEach((d) => { d.a += d.w * dt; });
    birds.forEach((b) => { b.a += b.w * dt; });
    jet.t += dt / 26; if (jet.t > 1) jet.t = -(1.2 + Math.random() * 1.4);
  }
  let last = performance.now(); let uiClock = 0; let chatT = 0; let factT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; lastDt = dt;
    if (!paused) {
      time += dt; updateGuests(dt, time); updateBuggies(dt); updateVehicles(dt); updateCreatures(dt); updateAmbient(dt);
      chatT += dt; if (chatT > 0.7) { chatT = 0; chatter(time); }
      factT += dt; if (factT > 18) { factT = 0; nextFact(); }
    }
    updateEnv(dt);
    if (followP) { cam.tx = followP.x; cam.ty = followP.y - 8; }
    const e = reduceMotion ? 1 : 1 - Math.exp(-dt * 6);
    cam.x += (cam.tx - cam.x) * e; cam.y += (cam.ty - cam.y) * e; cam.z += (cam.tz - cam.z) * e; cam.tilt += (cam.ttilt - cam.tilt) * e;
    uiClock += dt; if (uiClock > 0.5) { uiClock = 0; refreshFollow(); }
    render();
    requestAnimationFrame(frame);
  }

  /* ================= input ================= */
  const ptrs = new Map(); let moved = 0; let pinch = 0;
  const pinchDist = () => { const a = [...ptrs.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) moved = 0; if (ptrs.size === 2) pinch = pinchDist();
  });
  cv.addEventListener('pointermove', (e) => {
    const prev = ptrs.get(e.pointerId);
    if (!prev) { if (e.pointerType === 'mouse') hover(e.clientX, e.clientY); return; }
    const dx = e.clientX - prev.x; const dy = e.clientY - prev.y; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) { cv.classList.add('drag'); if (followP) stopFollow(); cam.x -= dx / cam.z; cam.y -= dy / (cam.z * cam.tilt); cam.tx = cam.x; cam.ty = cam.y; }
    } else if (ptrs.size === 2) {
      const d = pinchDist(); const a = [...ptrs.values()];
      if (pinch) zoomAt((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, d / pinch);
      pinch = d; moved = 99;
    }
  });
  function endPtr(e) {
    const had = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); cv.classList.remove('drag'); pinch = 0;
    if (had && e.type === 'pointerup' && moved < 7 && ptrs.size === 0) clickAt(e.clientX, e.clientY);
  }
  cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (followP) stopFollow(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
  cv.addEventListener('dblclick', (e) => zoomAt(e.clientX, e.clientY, 1.6));

  function hitPlace(x, y) {
    let best = null;
    for (const b of places) { if (b.badge && Math.hypot(x - b.badge[0], y - b.badge[1]) < 17 * b.badge[2] + 4) return b; }
    for (const b of places) {
      if (b.sea) continue; const h = b.hit; if (h && x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h && (!best || b.y > best.y)) best = b;
    }
    return best;
  }
  function hitMover(x, y) {
    let best = null; let bd = 1e9;
    const test = (o, dy, rad) => { if (o.sx === undefined) return; const d = Math.hypot(x - o.sx, y - (o.sy - dy * (o.sk || 1))); if (d < rad * (o.sk || 1) + 6 && d < bd) { best = o; bd = d; } };
    guests.forEach((p) => test(p, 14, 16)); buggies.forEach((b) => test(b, 14, 26));
    if (!best) creatures.forEach((c) => { if (c.pid && c.hr) test(c, 0, c.hr * c.sz); });
    return best;
  }
  function hover(x, y) { const m = hitMover(x, y); const b = m ? null : hitPlace(x, y); hoverB = b; cv.style.cursor = m || b ? 'pointer' : ''; }
  function clickAt(x, y) {
    const m = hitMover(x, y);
    if (m) { if (m.kind === 'guest' || m.kind === 'buggy') startFollow(m); else selectPlace(bById.get(m.pid)); return; }
    const b = hitPlace(x, y);
    if (b) { selectPlace(b); return; }
    closeCard();
  }

  /* ================= selection / card ================= */
  const favs = new Set((() => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; } })());
  const saveFavs = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch (e) { /* ignore */ } };
  const card = $('card');
  function selectPlace(b, opts) {
    selId = b.id; if (!(opts && opts.noFly)) flyTo(b.x, b.y - (b.sea ? 24 : 30), b.sea ? 0.95 : 1.05);
    if (isMobile()) closePanel('drawer');
    renderCard(); highlightList();
  }
  function closeCard() { selId = null; card.classList.remove('show'); highlightList(); }
  function renderCard() {
    const b = selId && bById.get(selId); if (!b) { card.classList.remove('show'); return; }
    const p = b.p; const c = DCOL[b.dist]; const fav = favs.has(p.id);
    const approx = p.approx ? `<span class="tag">${esc(ui().approx.replace(/^\s*·\s*/, ''))}</span>` : '';
    card.innerHTML =
      `<button class="x" type="button" aria-label="${esc(tx('close'))}">×</button>` +
      `<div class="sign" style="background:${c}">${p.emoji}</div>` +
      `<div class="body"><h2 lang="${lang}">${esc(nameOf(p))}</h2><div class="sub" lang="${lang === 'zh' ? 'en' : 'zh'}">${esc(subOf(p))}</div>` +
      `<div class="tags"><span class="tag" style="background:${mix(c, '#ffffff', 0.55)}">${esc(atollName(b.dist))}</span><span class="tag">${esc(typeLabel(p))}</span>${approx}</div>` +
      `<p>${esc(placeText(p, 'blurb'))}</p><div class="tip">💡 ${esc(placeText(p, 'tip'))}</div>` +
      `<div class="acts"><button class="btn" data-act="fav" type="button">${esc(tx(fav ? 'saved' : 'save'))}</button>` +
      (b.sea ? `<button class="btn" data-act="watch" type="button">${p.emoji} ${esc(tx('followBtn'))}</button>` : `<button class="btn" data-act="send" type="button">${esc(tx('sendGuest'))}</button>`) +
      `<a class="btn" href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=${b.sea ? 11 : 15}/${p.lat}/${p.lng}" target="_blank" rel="noopener">${esc(tx('osm'))}</a></div></div>`;
    card.classList.add('show');
    card.querySelector('.x').onclick = closeCard;
    card.querySelector('[data-act=fav]').onclick = () => { if (favs.has(p.id)) favs.delete(p.id); else favs.add(p.id); saveFavs(); renderCard(); buildList(); };
    const w = card.querySelector('[data-act=watch]'); if (w) w.onclick = () => { const c0 = creatures.find((q) => q.pid === p.id && q.t !== 'glow'); startFollow(c0 || { kind: 'sea', pid: p.id, x: b.x, y: b.y }); };
    const s = card.querySelector('[data-act=send]'); if (s) s.onclick = () => { const gst = sendGuest(b); if (gst) { closeCard(); startFollow(gst); } };
  }

  /* ================= follow ================= */
  const followEl = $('follow');
  const FOLLOW_BTN = { guest: 'bFollow', buggy: 'bRide', sea: 'bDive' };
  const kindOf = (o) => (o.kind === 'guest' ? 'guest' : o.kind === 'buggy' ? 'buggy' : 'sea');
  function startFollow(o) {
    followP = o; if (!o.kind) o.kind = 'sea'; cam.tz = Math.max(cam.tz, o.kind === 'sea' ? 0.9 : 1.2);
    closeCard();
    Object.values(FOLLOW_BTN).forEach((id) => { $(id).classList.remove('on'); $(id).setAttribute('aria-pressed', 'false'); });
    const id = FOLLOW_BTN[kindOf(o)]; $(id).classList.add('on'); $(id).setAttribute('aria-pressed', 'true');
    refreshFollow();
  }
  function stopFollow() {
    followP = null;
    Object.values(FOLLOW_BTN).forEach((id) => { $(id).classList.remove('on'); $(id).setAttribute('aria-pressed', 'false'); });
    refreshFollow();
  }
  function nextFollow(kindName) {
    const k = kindName || (followP ? kindOf(followP) : 'guest');
    if (k === 'guest') startFollow(pick(guests.filter((p) => p !== followP)));
    else if (k === 'buggy') startFollow(pick(buggies.filter((p) => p !== followP)));
    else startFollow(pick(creatures.filter((c) => c.pid && c.t !== 'glow' && c !== followP)));
  }
  function refreshFollow() {
    if (!followP) { followEl.classList.remove('show'); return; }
    const k = kindOf(followP); let text;
    if (k === 'guest') {
      const p = followP; text = `🧍 ${esc(tx('followingPre'))} <b>${esc(personName(p))}</b> · ${p.trip ? esc(tx('followingTo')) + ' ' + esc(nameOf(p.trip.to.p)) : esc(tx('followingAt')) + ' ' + esc(nameOf(p.isl.p))}`;
    } else if (k === 'buggy') {
      const b = followP; text = `🛺 ${esc(tx('ridingPre'))} <b>${esc(nameOf(b.isl.p))}</b> · ${b.pax ? esc(tx('ridingWith')) + ' ' + esc(personName(b.pax)) : esc(tx('ridingEmpty'))}`;
    } else {
      const sb = bById.get(followP.pid); text = `${sb ? sb.p.emoji : '🐠'} ${esc(tx('watchPre'))} <b>${sb ? esc(nameOf(sb.p)) : ''}</b>`;
    }
    followEl.innerHTML = `<span>${text}</span><button type="button" data-f="next">${esc(tx('followingNext'))}</button><button type="button" data-f="stop">${esc(tx('followingStop'))}</button>`;
    followEl.classList.add('show');
    followEl.querySelector('[data-f=next]').onclick = () => nextFollow(k);
    followEl.querySelector('[data-f=stop]').onclick = stopFollow;
  }

  /* ================= panels ================= */
  const PANELS = { drawer: ['drawer', 'bList'], log: ['log', 'bLog'] };
  function setBtn(id, on) { const b = $(id); b.setAttribute('aria-pressed', String(on)); if (id === 'bList') b.setAttribute('aria-expanded', String(on)); if (id !== 'bList') b.classList.toggle('on', on); }
  function openPanel(name) {
    const [el, btn] = PANELS[name];
    if (isMobile()) Object.keys(PANELS).forEach((n) => { if (n !== name) closePanel(n); });
    if (isMobile() && name === 'drawer') closeCard();
    $(el).classList.add('show'); setBtn(btn, true); document.body.classList.toggle('panel-open', true);
  }
  function closePanel(name) { const [el, btn] = PANELS[name]; $(el).classList.remove('show'); setBtn(btn, false); document.body.classList.toggle('panel-open', Object.keys(PANELS).some((n) => isOpen(n))); }
  const isOpen = (name) => $(PANELS[name][0]).classList.contains('show');
  const togglePanel = (name) => (isOpen(name) ? closePanel(name) : openPanel(name));

  /* ---------- list drawer ---------- */
  let catFilter = 'all'; let query = '';
  const TYPE_CHIPS = [['hotel', '🏨'], ['island', '🏝️'], ['sea', '🐠'], ['go', '🛩️']];
  function buildChips() {
    const wrap = $('cats'); wrap.replaceChildren();
    const mk = (key, label) => {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'chip' + (catFilter === key ? ' on' : ''); c.setAttribute('aria-pressed', String(catFilter === key));
      c.textContent = label; c.onclick = () => { catFilter = key; buildChips(); buildList(); }; wrap.appendChild(c);
    };
    mk('all', tx('chipAll')); mk('fav', tx('chipFav'));
    TYPE_CHIPS.forEach(([t, ic]) => mk(t, ic + ' ' + (ui()[TAGKEY[t]] || '')));
  }
  function buildList() {
    const q = query.trim().toLowerCase(); const out = $('list'); out.replaceChildren(); let any = false;
    ORDER.forEach((k) => {
      const rows = places.filter((b) => b.dist === k &&
        (catFilter === 'all' || (catFilter === 'fav' ? favs.has(b.id) : b.p.type === catFilter)) &&
        (!q || [b.p.name, b.p.zh, placeText(b.p, 'blurb'), placeText(b.p, 'tip')].join(' ').toLowerCase().includes(q)));
      if (!rows.length) return; any = true;
      const h = document.createElement('h4'); h.textContent = atollName(k); out.appendChild(h);
      rows.forEach((b) => {
        const it = document.createElement('button'); it.type = 'button'; it.className = 'it' + (selId === b.id ? ' sel' : ''); it.dataset.id = b.id;
        it.innerHTML = `<span class="em" style="background:${mix(DCOL[k], '#ffffff', 0.6)}">${b.p.emoji}</span><span class="tx"><span lang="${lang}">${esc(nameOf(b.p))}</span><small lang="${lang === 'zh' ? 'en' : 'zh'}">${esc(subOf(b.p))}</small></span>${favs.has(b.id) ? '<span class="star">⭐</span>' : ''}`;
        it.onclick = () => selectPlace(b); out.appendChild(it);
      });
    });
    if (!any) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = tx('noMatches'); out.appendChild(e); }
  }
  function highlightList() { document.querySelectorAll('#list .it').forEach((el) => el.classList.toggle('sel', el.dataset.id === selId)); }
  $('q').addEventListener('input', (e) => { query = e.target.value; buildList(); });

  /* ================= toolbar wiring ================= */
  const todEl = $('tod');
  const TOD_ICONS = ['🌅', '☀️', '🌇', '🌙', '🔄'];
  function buildTod() {
    todEl.replaceChildren();
    TOD_ICONS.forEach((ic, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tb'; b.dataset.t = i; b.title = tx('tod')[i]; b.setAttribute('aria-label', tx('tod')[i]);
      b.innerHTML = `<span class="i">${ic}</span>`;
      b.onclick = () => { if (i === 4) { autoTod = !autoTod; autoClock = 0; } else { autoTod = false; todIdx = i; } syncTodButtons(); };
      todEl.appendChild(b);
    });
    syncTodButtons();
  }
  function syncTodButtons() {
    [...todEl.children].forEach((b, i) => { const on = i === 4 ? autoTod : (autoTod ? false : i === todIdx); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  }
  let factIdx = 0;
  function nextFact() { factIdx = (factIdx + 1) % tx('facts').length; $('factTx').textContent = tx('facts')[factIdx]; }
  $('fact').onclick = () => { factT = 0; nextFact(); };
  $('fact').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); factT = 0; nextFact(); } });
  $('bLabel').onclick = () => { labelsOn = !labelsOn; setBtn('bLabel', labelsOn); };
  $('bRide').onclick = () => { if (followP && followP.kind === 'buggy') stopFollow(); else nextFollow('buggy'); };
  $('bFollow').onclick = () => { if (followP && followP.kind === 'guest') stopFollow(); else nextFollow('guest'); };
  $('bDive').onclick = () => { if (followP && kindOf(followP) === 'sea') stopFollow(); else nextFollow('sea'); };
  $('bPause').onclick = () => { paused = !paused; setBtn('bPause', paused); syncPause(); };
  function syncPause() { $('pauseIcon').textContent = paused ? '▶️' : '⏸'; $('pauseTx').textContent = tx('tools')[paused ? 'play' : 'pause']; }
  $('bBird').onclick = () => { bird = !bird; setBtn('bBird', bird); cam.ttilt = bird ? 0.95 : 0.58; stopFollow(); fitAll(); };
  $('bLog').onclick = () => togglePanel('log');
  $('bList').onclick = () => togglePanel('drawer');
  $('bAll').onclick = () => { stopFollow(); closeCard(); if (Math.abs(cam.tz - rectZoom(WORLD.x0, WORLD.y0, WORLD.x1, WORLD.y1 + 40)) < 0.04) fitStart(); else fitAll(); };
  $('bHelp').onclick = () => openIntro(0);
  document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  addEventListener('resize', resize);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ($('intro').classList.contains('show')) closeIntro(); else { closeCard(); stopFollow(); Object.keys(PANELS).forEach(closePanel); } } });

  /* ================= intro tour ================= */
  let introStep = 0;
  function openIntro(i) { introStep = i; renderIntro(); $('intro').classList.add('show'); $('inext').focus(); }
  function closeIntro() { $('intro').classList.remove('show'); try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* ignore */ } }
  function renderIntro() {
    const steps = tx('intro'); const s = steps[introStep];
    $('ist').textContent = s[0]; $('iti').textContent = s[1]; $('itx').textContent = s[2];
    $('idt').replaceChildren(...steps.map((_, i) => { const d = document.createElement('i'); if (i === introStep) d.className = 'on'; return d; }));
    $('iskip').textContent = tx('introSkip'); $('inext').textContent = introStep === steps.length - 1 ? tx('introDone') : tx('introNext');
  }
  $('inext').onclick = () => { if (introStep >= tx('intro').length - 1) closeIntro(); else { introStep++; renderIntro(); } };
  $('iskip').onclick = closeIntro;

  /* ================= static text ================= */
  function applyStatic() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = tx('docTitle');
    const meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', tx('docDesc'));
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = tx(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', tx(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.setAttribute('placeholder', tx(el.dataset.i18nPh)); });
    document.querySelectorAll('[data-tool]').forEach((el) => { el.textContent = tx('tools')[el.dataset.tool]; });
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    $('bHelp').setAttribute('aria-label', tx('help'));
    $('factTx').textContent = tx('facts')[factIdx];
    syncPause();
  }
  function setLang(next) {
    if (!LANGS.includes(next) || next === lang) return;
    lang = next; try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    guests.forEach((p) => { p.sayT = 0; p.replyAt = 0; });
    applyStatic(); buildTod(); buildChips(); buildList(); renderCard(); refreshFollow();
    if ($('intro').classList.contains('show')) renderIntro();
  }

  /* ================= start ================= */
  resize(); fitStart(); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz * 0.85;
  if (reduceMotion) { paused = true; setBtn('bPause', true); }
  applyStatic(); buildTod(); buildChips(); buildList();
  let introSeen = false; try { introSeen = !!localStorage.getItem(INTRO_KEY); } catch (e) { /* ignore */ }
  const qs = new URLSearchParams(location.search);
  if (!introSeen && !qs.has('nointro')) openIntro(0);
  if (qs.get('tod') && TOD[+qs.get('tod')]) { todIdx = +qs.get('tod'); Object.assign(env, { m: [...TOD[todIdx].m], n: TOD[todIdx].n }); syncTodButtons(); }
  const warm = qs.has('warm') ? +qs.get('warm') || 0 : 20;
  if (!paused) for (let i = 0; i < warm * 10; i++) { time += 0.1; updateGuests(0.1, time); updateBuggies(0.1); updateVehicles(0.1); updateCreatures(0.1); if (i % 7 === 0) chatter(time); }
  updateCreatures(0.01);
  if (qs.get('cam')) { const [cx, cy, cz] = qs.get('cam').split(',').map(Number); Object.assign(cam, { x: cx, y: cy, z: cz, tx: cx, ty: cy, tz: cz }); }
  if (qs.get('view') === 'world') { fitAll(); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
  if (qs.get('panel') && PANELS[qs.get('panel')]) openPanel(qs.get('panel'));
  if (qs.get('sel') && bById.has(qs.get('sel'))) selectPlace(bById.get(qs.get('sel')));
  requestAnimationFrame(frame);

  // small hook for debugging/tests
  window.__isl = { cam, places, guests, buggies, vehicles, creatures, selectPlace: (id) => selectPlace(bById.get(id)), startFollow, sendGuest: (id) => sendGuest(bById.get(id)) };
})();
