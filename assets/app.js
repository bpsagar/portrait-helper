(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const MAX_SIDE = 1400;
  const LINE_SIDE = 480; // working size for block-in line detection

  const SAMPLES = [
    { id: "eyes", name: "Eye study", src: "assets/samples/eyes.jpg" },
    { id: "akram", name: "Three-quarter", src: "assets/samples/akram-deptq.jpg" },
    { id: "messi", name: "Portrait", src: "assets/samples/messi.jpg" },
    { id: "ronaldo", name: "Portrait", src: "assets/samples/ronaldo.jpg" },
  ];

  const LEADS = ["6B", "4B", "2B", "B", "HB", "H", "2H"];
  const GRAPHITE = [29, 27, 24];
  const PAPERS = { warm: [241, 234, 220], cool: [233, 236, 238], gray: [168, 163, 153] };

  // Line steps: the outline first, then the shadow shapes, simplified less the second time.
  const LINE_PASSES = [
    { name: "Outline the head" },
    { name: "Draw the shadow shapes", eps: 0.04, minArea: 0.008 },
    { name: "Refine the shapes", eps: 0.01, minArea: 0.002, core: true },
  ];
  const L = LINE_PASSES.length;
  const FINISH = [
    { kind: "blend", name: "Blend the tones", tool: "Tissue or stump" },
    { kind: "detail", name: "Add the details", tool: "Sharp pencil" },
    { kind: "lift", name: "Lift the highlights", tool: "Kneaded eraser" },
  ];

  const defaults = {
    n: 4, contrast: 100, squint: 4, levels: true, grid: false, cols: 8, flip: false, paper: "warm", leads: true,
    lineBlur: 3, detail: 5, ghost: 15, dots: true, see: 50,
  };
  const state = { ...defaults, step: 1 };
  let source = null; // { kind: 'sample' | 'url' | 'file', ref }

  // ───────── persistence ─────────
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  const PREF_KEYS = Object.keys(defaults);

  function loadPrefs() {
    const saved = store.get("pc.prefs3") || {};
    for (const k of PREF_KEYS) if (k in saved) state[k] = saved[k];
    const h = new URLSearchParams(location.hash.slice(1));
    const num = (k, lo, hi) => { const v = parseFloat(h.get(k)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null; };
    const set = (key, v) => { if (v !== null) state[key] = v; };
    set("n", num("v", 3, 10)); set("contrast", num("c", 50, 180)); set("squint", num("s", 0, 12));
    set("cols", num("k", 3, 16)); set("step", num("t", 1, 20));
    set("lineBlur", num("b", 1, 6)); set("detail", num("d", 1, 9));
    if (h.has("l")) state.levels = h.get("l") === "1";
    if (h.has("g")) state.grid = h.get("g") === "1";
    if (h.has("f")) state.flip = h.get("f") === "1";
    if (PAPERS[h.get("p")]) state.paper = h.get("p");
    return h.get("src");
  }

  function savePrefs() {
    const prefs = {};
    for (const k of PREF_KEYS) prefs[k] = state[k];
    store.set("pc.prefs3", prefs);
    const { n, contrast, squint, levels, grid, cols, flip, paper, lineBlur, detail } = state;
    const h = new URLSearchParams({
      v: n, c: contrast, s: squint, l: +levels, g: +grid, k: cols, f: +flip, p: paper, b: lineBlur, d: detail, t: state.step,
    });
    if (source && source.kind === "sample") h.set("src", "sample:" + source.ref);
    if (source && source.kind === "url") h.set("src", source.ref);
    try { history.replaceState(null, "", "#" + h.toString()); } catch { /* sandboxed */ }
  }

  // ───────── image → value map ─────────
  let W = 0, H = 0;
  let lum = null; // Float32Array, 0..255
  let idx = null; // Uint8Array, value index per pixel (0 darkest … n-1 paper)
  let SW = 0, SH = 0, slum = null; // small copy for line detection
  let lines = null; // { passes: [[poly…]…], highlights: [poly…] } in full-size coordinates
  let blendV = null, detailV = null; // continuous 0..1 tone maps for the finishing steps
  let bgSmall = null; // background mask at line-detection size; the background stays white paper
  const origCanvas = $("orig"), canvas = $("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const grayCanvas = document.createElement("canvas");

  function readLum(img, w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, 0, 0, w, h);
    const px = cx.getImageData(0, 0, w, h).data;
    const out = new Float32Array(w * h);
    for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = px[j] * 0.299 + px[j + 1] * 0.587 + px[j + 2] * 0.114;
    return out;
  }

  function ingest(img) {
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    W = Math.max(1, Math.round(img.naturalWidth * k));
    H = Math.max(1, Math.round(img.naturalHeight * k));
    for (const c of [origCanvas, canvas, grayCanvas]) { c.width = W; c.height = H; }
    origCanvas.getContext("2d").drawImage(img, 0, 0, W, H);
    lum = readLum(img, W, H);

    const g = grayCanvas.getContext("2d"), gi = g.createImageData(W, H), gp = new Uint32Array(gi.data.buffer);
    for (let i = 0; i < lum.length; i++) { const v = lum[i] | 0; gp[i] = (255 << 24) | (v << 16) | (v << 8) | v; }
    g.putImageData(gi, 0, 0);

    const s = Math.min(1, LINE_SIDE / Math.max(W, H));
    SW = Math.max(8, Math.round(W * s)); SH = Math.max(8, Math.round(H * s));
    slum = readLum(img, SW, SH);

    const paper = $("paper");
    paper.style.width = W + "px";
    paper.style.height = H + "px";
    for (const id of ["gridSvg", "linesSvg"]) $(id).setAttribute("viewBox", `0 0 ${W} ${H}`);
    view.auto = true;
  }

  function boxBlur(src, w, h, r) {
    if (r < 1) return src;
    const tmp = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    const pass = (a, b, len, stride, count, lineStride) => {
      const win = 2 * r + 1;
      for (let l = 0; l < count; l++) {
        const base = l * lineStride;
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += a[base + Math.min(len - 1, Math.max(0, i)) * stride];
        for (let i = 0; i < len; i++) {
          b[base + i * stride] = acc / win;
          acc += a[base + Math.min(len - 1, i + r + 1) * stride] - a[base + Math.max(0, i - r) * stride];
        }
      }
    };
    pass(src, tmp, w, 1, h, w);
    pass(tmp, out, h, w, w, 1);
    pass(out, tmp, w, 1, h, w);
    pass(tmp, out, h, w, w, 1);
    return out;
  }

  // Auto-levels + contrast, mapping 0..255 to 0..1.
  function toneCurve(g) {
    let lo = 0, hi = 255;
    if (state.levels) {
      const hist = new Uint32Array(256);
      for (let i = 0; i < g.length; i++) hist[Math.min(255, Math.max(0, g[i] | 0))]++;
      const cut = g.length * 0.01;
      let a = 0;
      for (lo = 0; lo < 255 && (a += hist[lo]) < cut; lo++);
      a = 0;
      for (hi = 255; hi > lo + 8 && (a += hist[hi]) < cut; hi--);
    }
    const span = Math.max(8, hi - lo), c = state.contrast / 100;
    return (v) => Math.min(1, Math.max(0, (((v - lo) / span) * 255 - 128) * c + 128) / 255);
  }

  function computeValues() {
    const g = boxBlur(lum, W, H, Math.round(state.squint * W / 500));
    const curve = toneCurve(g), n = state.n;
    idx = new Uint8Array(g.length);
    for (let i = 0; i < g.length; i++) idx[i] = Math.round(curve(g[i]) * (n - 1));
    // The tone steps leave the background as white paper.
    bgSmall = backgroundMask(slum, SW, SH);
    const bgHard = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      bgHard[y * W + x] = bgSmall[Math.min(SH - 1, Math.floor(y * SH / H)) * SW + Math.min(SW - 1, Math.floor(x * SW / W))];
    }
    for (let i = 0; i < idx.length; i++) if (bgHard[i]) idx[i] = n - 1;
    // Finishing targets: the full tonal range, softened (after blending) and sharp (after details).
    const full = toneCurve(lum);
    detailV = lum.map(full);
    blendV = boxBlur(detailV, W, H, Math.max(2, Math.round(Math.max(W, H) / 200)));
  }

  // ───────── block-in lines ─────────
  // Marching squares over a binary mask; returns closed loops in pixel-centre coordinates.
  const SEGS = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[0, 3], [2, 1]], [[0, 2]], [[0, 3]],
    [[0, 3]], [[0, 2]], [[0, 1], [3, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];
  function traceContours(mask, w, h) {
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
    const stride = 2 * h + 6;
    const key = (X, Y) => (X + 2) * stride + (Y + 2);
    const adj = new Map();
    const link = (a, b) => {
      (adj.get(a) || adj.set(a, []).get(a)).push(b);
      (adj.get(b) || adj.set(b, []).get(b)).push(a);
    };
    for (let y = -1; y < h; y++) {
      for (let x = -1; x < w; x++) {
        const c = (at(x, y) << 3) | (at(x + 1, y) << 2) | (at(x + 1, y + 1) << 1) | at(x, y + 1);
        if (c === 0 || c === 15) continue;
        // edge midpoints in doubled coordinates: top, right, bottom, left
        const e = [key(2 * x + 1, 2 * y), key(2 * x + 2, 2 * y + 1), key(2 * x + 1, 2 * y + 2), key(2 * x, 2 * y + 1)];
        for (const [a, b] of SEGS[c]) link(e[a], e[b]);
      }
    }
    const seen = new Set(), loops = [];
    for (const start of adj.keys()) {
      if (seen.has(start)) continue;
      const loop = [];
      let prev = -1, cur = start;
      while (!seen.has(cur)) {
        seen.add(cur);
        loop.push([(Math.floor(cur / stride) - 2) / 2, ((cur % stride) - 2) / 2]);
        const nb = adj.get(cur);
        const next = nb[0] !== prev ? nb[0] : nb[1];
        prev = cur; cur = next;
      }
      if (loop.length > 2) loops.push(loop);
    }
    return loops;
  }

  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
    let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }

  // Ramer–Douglas–Peucker: keep only the points that stray more than eps from a straight line.
  function rdp(pts, eps) {
    const n = pts.length;
    if (n < 3) return pts.slice();
    const keep = new Uint8Array(n);
    keep[0] = keep[n - 1] = 1;
    const stack = [[0, n - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let best = -1, far = 0;
      for (let i = a + 1; i < b; i++) {
        const d = segDist(pts[i], pts[a], pts[b]);
        if (d > far) { far = d; best = i; }
      }
      if (best > 0 && far > eps) { keep[best] = 1; stack.push([a, best], [best, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  function rdpClosed(pts, eps) {
    let far = 0, fi = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
      if (d > far) { far = d; fi = i; }
    }
    const a = rdp(pts.slice(0, fi + 1), eps), b = rdp(pts.slice(fi).concat([pts[0]]), eps);
    return a.concat(b.slice(1, -1));
  }
  const area = (p) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;

  function hull(points) {
    const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const q of p) { while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
    for (const q of p.reverse()) { while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }
  // Drop the vertex that changes the outline least until only `max` remain.
  function reduceTo(poly, max) {
    const p = poly.slice();
    while (p.length > max) {
      let best = 0, min = Infinity;
      for (let i = 0; i < p.length; i++) {
        const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
        const t = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
        if (t < min) { min = t; best = i; }
      }
      p.splice(best, 1);
    }
    return p;
  }

  function largestComponent(mask, w, h) {
    const label = new Int32Array(mask.length), queue = new Int32Array(mask.length);
    let best = 0, bestSize = 0, next = 0;
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i] || label[i]) continue;
      next++;
      let head = 0, tail = 0, size = 0;
      queue[tail++] = i; label[i] = next;
      while (head < tail) {
        const j = queue[head++], x = j % w, y = (j / w) | 0;
        size++;
        for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1]) {
          if (k >= 0 && mask[k] && !label[k]) { label[k] = next; queue[tail++] = k; }
        }
      }
      if (size > bestSize) { bestSize = size; best = next; }
    }
    return label.map((l) => (l === best && best ? 1 : 0));
  }

  // Background = the even-toned region reachable from the frame. Grown on a lightly blurred copy so the
  // edge between hair and background survives; it fails only where the two are the same tone.
  function backgroundMask(src, w, h) {
    const g = boxBlur(src, w, h, Math.max(1, Math.round(Math.hypot(w, h) * 0.006)));
    const curve = toneCurve(g), v = g.map(curve);
    const border = [];
    for (let x = 0; x < w; x++) border.push(v[x], v[(h - 1) * w + x]);
    for (let y = 0; y < h; y++) border.push(v[y * w], v[y * w + w - 1]);
    border.sort((a, c) => a - c);
    const bg = border[border.length >> 1];
    const mask = new Uint8Array(w * h), queue = new Int32Array(w * h);
    let tail = 0;
    const seed = (i) => { if (!mask[i] && Math.abs(v[i] - bg) < 0.12) { mask[i] = 1; queue[tail++] = i; } };
    for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
    for (let head = 0; head < tail; head++) {
      const j = queue[head], x = j % w, y = (j / w) | 0;
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1]) {
        if (k >= 0 && !mask[k] && Math.abs(v[k] - v[j]) < 0.02 && Math.abs(v[k] - bg) < 0.2) { mask[k] = 1; queue[tail++] = k; }
      }
    }
    // A "background" covering most of the frame means the subject fills it (a close crop): ignore it.
    return tail > w * h * 0.75 ? new Uint8Array(w * h) : mask;
  }

  function computeLines() {
    const diag = Math.hypot(SW, SH), sx = W / SW, sy = H / SH, h = half();
    const bgMask = bgSmall;
    const r = Math.max(1, Math.round((state.lineBlur / 100) * diag));
    // Trace the very pixels the value passes fill: the shadow mass (value pass 1) and the
    // darker split inside it (value pass 2). Blurring that mask and cutting it at 50% drops
    // small detail without sliding the edges of big shapes, as blurring the photo would.
    const shapeOf = (below) => {
      const cover = new Float32Array(SW * SH);
      for (let y = 0; y < SH; y++) {
        const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
        for (let x = 0; x < SW; x++) {
          const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
          let hit = 0;
          for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) if (idx[yy * W + xx] < below) hit++;
          cover[y * SW + x] = bgMask[y * SW + x] ? 0 : hit / ((y1 - y0) * (x1 - x0));
        }
      }
      return boxBlur(cover, SW, SH, r);
    };
    const shadowSoft = shapeOf(h), coreSoft = shapeOf(h - 1);
    const shadowLoops = traceContours(shadowSoft.map((c) => (c >= 0.5 ? 1 : 0)), SW, SH);
    const coreLoops = traceContours(coreSoft.map((c) => (c >= 0.5 ? 1 : 0)), SW, SH);
    const edgesTouched = (p) => {
      const t = Math.min(SW, SH) * 0.03;
      return [p.some(([x]) => x < t), p.some(([x]) => x > SW - 1 - t), p.some(([, y]) => y < t), p.some(([, y]) => y > SH - 1 - t)].filter(Boolean).length;
    };
    const scale = (poly) => poly.map(([x, y]) => [(x + 0.5) * sx, (y + 0.5) * sy]);
    const detail = Math.pow(2, (5 - state.detail) / 3); // 1 = default, >1 fewer lines
    const simplify = (loops, eps, minArea) => loops
      .map((l) => rdpClosed(l, eps * diag * detail))
      // a shape covering half the frame is the background, not a shadow
      .filter((p) => p.length >= 3 && area(p) >= minArea * SW * SH && area(p) <= 0.45 * SW * SH)
      .map(scale);

    // Envelope: the subject is whatever differs from the border colour.
    const subject = largestComponent(bgMask.map((b) => 1 - b), SW, SH);
    const rows = [];
    let count = 0;
    for (let y = 0; y < SH; y++) {
      let lo = -1, hi = -1;
      for (let x = 0; x < SW; x++) if (subject[y * SW + x]) { if (lo < 0) lo = x; hi = x; count++; }
      if (lo >= 0) rows.push([y, lo, hi]);
    }
    const pts = rows.flatMap(([y, lo, hi]) => [[lo, y], [hi, y]]);
    let envHull = pts.length > 2 ? hull(pts) : [];
    const frac = count / (SW * SH);
    // When the "subject" is really the background, fall back to the outline of the shadow shapes.
    if (frac < 0.04 || frac > 0.85 || edgesTouched(envHull) >= 3) {
      envHull = hull(simplify(shadowLoops, 0.03, 0.005).flat().map(([x, y]) => [x / sx - 0.5, y / sy - 0.5]));
    }
    const env = envHull.length > 2 ? [scale(reduceTo(envHull, 9))] : [];

    const passes = [env];
    for (const p of LINE_PASSES.slice(1)) {
      let polys = simplify(shadowLoops, p.eps, p.minArea);
      if (p.core) polys = polys.concat(simplify(coreLoops, p.eps * 1.2, p.minArea));
      passes.push(polys);
    }
    // Highlights: small spots clearly brighter than their surroundings (the shine in the eyes,
    // on the nose and the lips), kept away from the background edge.
    const lv = slum.map(toneCurve(slum));
    const around = boxBlur(lv, SW, SH, Math.max(2, Math.round(diag * 0.012)));
    const nearBg = boxBlur(Float32Array.from(bgMask), SW, SH, Math.max(2, Math.round(diag * 0.01)));
    const hiMask = new Uint8Array(SW * SH);
    for (let i = 0; i < hiMask.length; i++) hiMask[i] = nearBg[i] < 0.01 && lv[i] > 0.6 && lv[i] - around[i] > 0.14 ? 1 : 0;
    const highlights = traceContours(hiMask, SW, SH)
      .filter((l) => area(l) >= 0.00004 * SW * SH && area(l) <= 0.006 * SW * SH)
      .map((l) => { const p = rdpClosed(l, 0.002 * diag); return p.length >= 3 ? p : l; })
      .map(scale);
    // The first two tone steps bridge lines and photo: a flat fill inside the straight-line
    // shapes, then the same shapes with their corners rounded off (the smoothed masks).
    const last = LINE_PASSES[L - 1];
    const fill = { shadow: simplify(shadowLoops, last.eps, last.minArea), core: simplify(coreLoops, last.eps * 1.2, last.minArea) };
    const rounded = new Uint8Array(W * H);
    const sample = (m, fx, fy) => {
      const x0 = Math.min(SW - 1, Math.max(0, Math.floor(fx))), y0 = Math.min(SH - 1, Math.max(0, Math.floor(fy)));
      const x1 = Math.min(SW - 1, x0 + 1), y1 = Math.min(SH - 1, y0 + 1), ax = Math.min(1, Math.max(0, fx - x0)), ay = Math.min(1, Math.max(0, fy - y0));
      return (m[y0 * SW + x0] * (1 - ax) + m[y0 * SW + x1] * ax) * (1 - ay) + (m[y1 * SW + x0] * (1 - ax) + m[y1 * SW + x1] * ax) * ay;
    };
    for (let y = 0; y < H; y++) {
      const fy = (y + 0.5) / sy - 0.5;
      for (let x = 0; x < W; x++) {
        const fx = (x + 0.5) / sx - 0.5;
        rounded[y * W + x] = sample(coreSoft, fx, fy) >= 0.5 ? h - 2 : sample(shadowSoft, fx, fy) >= 0.5 ? h - 1 : state.n - 1;
      }
    }
    lines = { passes, highlights, fill, rounded };
  }

  // Segments that run along the frame edge are artefacts of shapes cut off by the crop.
  function segmentsOf(poly) {
    const tol = Math.max(2, Math.min(W, H) * 0.025), out = [];
    const on = (p, q) => (p[0] <= tol && q[0] <= tol) || (p[1] <= tol && q[1] <= tol) ||
      (p[0] >= W - tol && q[0] >= W - tol) || (p[1] >= H - tol && q[1] >= H - tol);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if (!on(a, b)) out.push([a, b]);
    }
    return out;
  }
  const pathOf = (polys) => polys.flatMap(segmentsOf).map(([a, b]) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`).join("");
  const dotsOf = (polys) => {
    const tol = Math.max(2, W / 150);
    return polys.flat().filter(([x, y]) => x > tol && y > tol && x < W - tol && y < H - tol)
      .map(([x, y]) => `M${x.toFixed(1)} ${y.toFixed(1)}h0`).join("");
  };

  // ───────── steps ─────────
  // Lines → Tones → Finish. Tones has one step per tone added (n - 1).
  const half = () => Math.ceil(state.n / 2);
  function steps() {
    const out = LINE_PASSES.map((p, i) => ({ stage: "Lines", kind: "line", i, name: p.name }));
    for (let v = 1; v < state.n; v++) out.push({ stage: "Tones", kind: "tone", v, t: toneOfStep(v) });
    for (const f of FINISH) out.push({ stage: "Finish", ...f });
    return out;
  }
  const totalSteps = () => L + state.n - 1 + FINISH.length;
  const stepAt = (n) => steps()[n - 1];
  // The tone a value step adds: darks from the shadow mass inward, then the lights.
  const toneOfStep = (v) => (v <= half() ? half() - v : v - 1);

  function stepLut(vstep) {
    const n = state.n, h = half(), lut = new Array(n).fill(n - 1);
    if (vstep <= h) {
      const t = h - vstep;
      for (let i = 0; i < h; i++) lut[i] = i <= t ? t : i;
    } else {
      for (let i = 0; i <= vstep - 1; i++) lut[i] = i;
    }
    return lut;
  }

  function tone(i) {
    const p = PAPERS[state.paper], f = i / (state.n - 1);
    return GRAPHITE.map((g, k) => Math.round(g + (p[k] - g) * f));
  }
  const css = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  const leadOf = (i) => LEADS[Math.round((i / Math.max(1, state.n - 2)) * (LEADS.length - 1))];
  const pencil = (i) => `${chip(i)}${state.leads ? `<b>${leadOf(i)}</b>` : "<b>this tone</b>"}`;
  const chip = (i) => `<span class="tone" style="background:${css(tone(i))}"></span>`;

  function paintValues(target, indices, w, h, vstep) {
    const lut32 = stepLut(vstep).map((ti) => { const [r, g, b] = tone(ti); return (255 << 24) | (b << 16) | (g << 8) | r; });
    const img = target.createImageData(w, h);
    const out = new Uint32Array(img.data.buffer);
    for (let i = 0; i < out.length; i++) out[i] = lut32[indices[i]];
    target.putImageData(img, 0, 0);
  }

  function paintContinuous(target, values, w, h) {
    const p = PAPERS[state.paper], lut32 = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      const [r, g, b] = GRAPHITE.map((c, k) => Math.round(c + (p[k] - c) * (i / 255)));
      lut32[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
    const img = target.createImageData(w, h);
    const out = new Uint32Array(img.data.buffer);
    for (let i = 0; i < out.length; i++) out[i] = lut32[(values[i] * 255) | 0];
    target.putImageData(img, 0, 0);
  }

  function paintPaper(target, w, h, clear) {
    target.save();
    if (clear) target.clearRect(0, 0, w, h);
    else { target.fillStyle = css(tone(state.n - 1)); target.fillRect(0, 0, w, h); }
    target.globalAlpha = state.ghost / 100;
    target.drawImage(grayCanvas, 0, 0, w, h);
    target.restore();
  }

  // Tone step 1: flat tone inside the straight-line shapes, drawn as polygons.
  function paintShapes(target, w, h) {
    const k = w / W, hf = half();
    target.save();
    target.fillStyle = css(tone(state.n - 1)); target.fillRect(0, 0, w, h);
    const fillPolys = (polys, t) => {
      target.fillStyle = css(tone(t));
      target.beginPath();
      for (const p of polys) { p.forEach(([x, y], i) => (i ? target.lineTo(x * k, y * k) : target.moveTo(x * k, y * k))); target.closePath(); }
      target.fill("evenodd");
    };
    if (lines) fillPolys(lines.fill.shadow, hf - 1);
    target.restore();
  }

  function paintIndex(target, indices, w, h) {
    const lut32 = Array.from({ length: state.n }, (_, i) => { const [r, g, b] = tone(i); return (255 << 24) | (b << 16) | (g << 8) | r; });
    const img = target.createImageData(w, h);
    const out = new Uint32Array(img.data.buffer);
    for (let i = 0; i < out.length; i++) out[i] = lut32[indices[i]];
    target.putImageData(img, 0, 0);
  }

  // Draw a step's picture: what the paper should look like once the step is done.
  // Tones move from the lines toward the photo: straight shapes, rounded shapes, then the photo's own.
  function paintStep(target, st, w, h, maps, clear) {
    if (st.kind === "line") paintPaper(target, w, h, clear);
    else if (st.kind === "tone" && st.v === 1) paintShapes(target, w, h);
    else if (st.kind === "tone" && st.v === 2 && maps.rounded) paintIndex(target, maps.rounded, w, h);
    else if (st.kind === "tone") paintValues(target, maps.idx, w, h, st.v);
    else paintContinuous(target, st.kind === "blend" ? maps.blend : maps.detail, w, h);
  }

  // Which lines a step shows: current, faint previous, dashed outline, highlight marks.
  function lineLayers(st) {
    const none = { cur: [], prev: [], env: [], hl: [] };
    if (!lines) return none;
    if (st.kind === "line") return { ...none, cur: lines.passes[st.i], prev: st.i > 1 ? lines.passes[st.i - 1] : [], env: st.i > 0 ? lines.passes[0] : [] };
    if (st.kind === "tone" && st.v === 1) return { ...none, prev: lines.passes[L - 1] };
    if (st.kind === "lift") return { ...none, hl: lines.highlights };
    return none;
  }

  function renderLines() {
    const svg = $("linesSvg"), layers = lineLayers(stepAt(state.step));
    const ns = "http://www.w3.org/2000/svg", kids = [];
    const add = (cls, d) => { if (!d) return; const p = document.createElementNS(ns, "path"); p.setAttribute("class", cls); p.setAttribute("d", d); kids.push(p); };
    add("env", pathOf(layers.env));
    add("prev", pathOf(layers.prev));
    add("cur", pathOf(layers.cur));
    add("hl", pathOf(layers.hl));
    if (state.dots) add("dots", dotsOf(layers.cur));
    svg.replaceChildren(...kids);
  }

  function strokeLines(c, st, k, opts = {}) {
    const layers = lineLayers(st);
    const draw = (polys, color, alpha, width, dash) => {
      c.save();
      c.strokeStyle = color; c.globalAlpha = alpha; c.lineWidth = width; c.lineCap = "round"; c.setLineDash(dash || []);
      c.beginPath();
      for (const [a, b] of polys.flatMap(segmentsOf)) { c.moveTo(a[0] * k, a[1] * k); c.lineTo(b[0] * k, b[1] * k); }
      c.stroke(); c.restore();
    };
    const w = opts.width || 1, lead = "rgb(42,38,32)", red = "rgb(196,85,58)";
    draw(layers.env, lead, 0.35, w * 0.6, [w * 3, w * 2.5]);
    draw(layers.prev, lead, 0.25, w * 0.7);
    draw(layers.cur, lead, 1, w);
    draw(layers.hl, red, 1, w, [w * 2, w * 2]);
    if (opts.dots && state.dots) {
      c.fillStyle = red;
      for (const [x, y] of layers.cur.flat()) { c.beginPath(); c.arc(x * k, y * k, w * 1.6, 0, 7); c.fill(); }
    }
  }

  function coachCopy(st, step) {
    const no = `${st.stage} · Step ${step} of ${totalSteps()}`;
    if (st.kind === "line") {
      const how = state.leads ? " Use a 2H pencil and press lightly, so the lines are easy to erase." : " Press lightly, so the lines are easy to erase.";
      return { no, ...[
        { title: "Outline the head", text: `Draw a few straight lines around the outside of the head. Touch the top of the hair, the chin and the widest points on each side. No curves and no features yet.${how}` },
        { title: "Draw the shadow shapes", text: "Squint at the photo until it turns into a few dark patches. Outline each dark patch with straight lines. Place the red corner points first, then join them." },
        { title: "Refine the shapes", text: "Add more corners so your lines follow the shadows more closely, and outline the darkest patches inside them. Erase any line that no longer fits." },
      ][st.i] };
    }
    if (st.kind === "tone") {
      const { v, t } = st, h = half(), last = state.n - 1;
      if (v === 1) return { no, title: "Fill the shadows", text: `Shade inside the shapes you just drew with one even, flat tone using ${pencil(t)}. Stay inside your lines. Use the side of the lead and light pressure, and go over it again until it looks even. Leave everything else white.` };
      if (v === 2) {
        const round = "Now soften the straight corners so the shadow edges follow the curves you see in the photo.";
        if (v === h) return { no, title: "Round off and add the darks", text: `${round} Then press harder with ${pencil(0)} in the darkest areas only: the pupils, nostrils, the line between the lips and the darkest hair.` };
        return { no, title: "Round off the shadows", text: `${round} Then go over the darker parts of the shadow with ${pencil(t)}.` };
      }
      if (v === h) return { no, title: "Add the darkest darks", text: `Press harder with ${pencil(0)} in the darkest spots only: the pupils, nostrils, the line between the lips and the darkest hair. Keep them small.` };
      if (v < h) return { no, title: "Deepen the shadows", text: `Inside the shadows, find the areas that are darker still. Go over them with ${pencil(t)}.` };
      if (v === last) return { no, title: "Shade the half-tones", text: `Very lightly shade the grey areas on the lit side with ${pencil(t)}. Leave the brightest spots white: they become your highlights.` };
      return { no, title: "Add the mid-greys", text: `On the lit side, shade the areas that are clearly grey with ${pencil(t)}. Keep the lightest areas white for now.` };
    }
    return {
      blend: { no, title: "Blend the tones", text: "Rub the shading gently with a tissue or blending stump until the steps between tones disappear. Follow the curve of the face. Keep a few edges crisp: the eyelids, the nostrils and the line of the lips." },
      detail: { no, title: "Add the details", text: "Now copy from the photo itself. With a sharp pencil, add the small darks and textures: the iris and eyelashes first, then the nostrils, the lips and a few strands of hair. Press and hold Peek to compare." },
      lift: { no, title: "Lift the highlights", text: "Press a kneaded eraser onto the spots marked in red to bring back clean white: the shine in the eyes, the tip of the nose, the lower lip. Step back and compare with the photo. You're done." },
    }[st.kind];
  }

  // ───────── rendering ─────────
  const maps = () => ({ idx, blend: blendV, detail: detailV, rounded: lines && lines.rounded });
  function render() {
    if (!idx) return;
    const st = stepAt(state.step);
    paintStep(ctx, st, W, H, maps(), tracing);
    renderLines();
    const { no, title, text } = coachCopy(st, state.step);
    $("passNo").textContent = no;
    $("passTitle").textContent = title;
    $("passText").innerHTML = text;
    $("prev").disabled = state.step <= 1;
    $("next").disabled = state.step >= totalSteps();
    $("next").textContent = state.step >= totalSteps() ? "Finished" : "Next step →";
    renderRail();
    markProgress();
    $("paper").classList.toggle("flip", state.flip);
    renderGrid();
    savePrefs();
  }

  function railItem(swHtml, name, small, st, onclick) {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button"; b.className = "val"; b.dataset.state = st;
    b.innerHTML = `${swHtml}<span class="nm"></span>`;
    b.lastChild.textContent = name;
    const sm = document.createElement("small"); sm.textContent = small; b.lastChild.appendChild(sm);
    b.onclick = onclick;
    li.appendChild(b);
    return li;
  }

  function renderRail() {
    const frag = document.createDocumentFragment();
    let stage = "";
    steps().forEach((st, i) => {
      const n = i + 1, state_ = n === state.step ? "new" : n < state.step ? "done" : "later";
      if (st.stage !== stage) {
        stage = st.stage;
        const h = document.createElement("li"); h.className = "stage-head"; h.textContent = stage; frag.appendChild(h);
      }
      let sw = `<span class="sw num">${n}</span>`, name = st.name, tool = "";
      if (st.kind === "line") tool = state.leads ? "2H, light lines" : "Light lines";
      else if (st.kind === "tone") {
        sw = `<span class="sw" style="background:${css(tone(st.t))}"></span>`;
        name = coachCopy(st, n).title;
        tool = state.leads ? leadOf(st.t) : "";
      } else tool = st.tool;
      frag.appendChild(railItem(sw, name, tool, state_, () => go(n)));
    });
    $("scaleList").replaceChildren(frag);
  }

  function buildProgress() {
    const frag = document.createDocumentFragment();
    const tw = 96, th = Math.max(1, Math.round(96 * H / W)), k = tw / W;
    const pick = (arr, T) => {
      const out = new T(tw * th);
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) out[y * tw + x] = arr[Math.min(H - 1, Math.floor((y + .5) * H / th)) * W + Math.min(W - 1, Math.floor((x + .5) * W / tw))];
      return out;
    };
    const small = { idx: pick(idx, Uint8Array), blend: pick(blendV, Float32Array), detail: pick(detailV, Float32Array), rounded: lines && pick(lines.rounded, Uint8Array) };
    let stage = "";
    steps().forEach((st, i) => {
      const s = i + 1;
      if (stage && st.stage !== stage) { const gap = document.createElement("span"); gap.className = "gap"; frag.appendChild(gap); }
      stage = st.stage;
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.dataset.step = s;
      b.setAttribute("aria-label", `Step ${s}: ${st.stage}`);
      const c = document.createElement("canvas"); c.width = tw; c.height = th;
      const cx = c.getContext("2d");
      paintStep(cx, st, tw, th, small, false);
      if (st.kind === "line") strokeLines(cx, st, k, { width: 1 });
      b.appendChild(c);
      b.onclick = () => go(s);
      frag.appendChild(b);
    });
    $("progress").replaceChildren(frag);
  }
  function markProgress() {
    $("progress").querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.step === state.step)));
  }

  function renderGrid() {
    const svg = $("gridSvg");
    if (!state.grid || !W) { svg.replaceChildren(); return; }
    const cell = W / state.cols, rows = Math.ceil(H / cell - 1e-6), ns = "http://www.w3.org/2000/svg";
    const frag = document.createDocumentFragment();
    const add = (tag, attrs, text) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text) e.textContent = text; frag.appendChild(e); };
    for (let c = 1; c < state.cols; c++) add("line", { x1: c * cell, y1: 0, x2: c * cell, y2: H });
    for (let r = 1; r < rows; r++) add("line", { x1: 0, y1: r * cell, x2: W, y2: r * cell });
    for (let c = 0; c < state.cols; c++) add("text", { x: c * cell + cell / 2, y: 0, "text-anchor": "middle", dy: "1.2em" }, String.fromCharCode(65 + c));
    for (let r = 0; r < rows; r++) add("text", { x: 4, y: r * cell + cell / 2, dy: ".35em" }, r + 1);
    svg.replaceChildren(frag);
    applyView();
  }

  function go(step) {
    state.step = Math.min(totalSteps(), Math.max(1, step));
    render();
  }

  let pending = false;
  function recompute(withLines = true) {
    if (pending || !lum) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      computeValues();
      if (withLines) computeLines();
      state.step = Math.min(state.step, totalSteps());
      buildProgress();
      render();
    });
  }

  // ───────── pan & zoom ─────────
  const stage = $("stage"), paperEl = $("paper");
  const view = { k: 1, x: 0, y: 0, auto: true };
  let locked = false;
  const fitK = () => Math.min(stage.clientWidth / W, stage.clientHeight / H) * 0.9;

  function applyView() {
    paperEl.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.k})`;
    $("gridSvg").style.setProperty("--fs", 12 / view.k + "px");
  }
  function fit() {
    if (!W) return;
    view.k = fitK();
    view.x = (stage.clientWidth - W * view.k) / 2;
    view.y = (stage.clientHeight - H * view.k) / 2;
    view.auto = true;
    applyView();
  }
  function zoomAt(factor, cx, cy) {
    if (locked) return;
    const base = fitK(), k = Math.min(base * 10, Math.max(base * 0.4, view.k * factor)), r = k / view.k;
    view.x = cx - (cx - view.x) * r;
    view.y = cy - (cy - view.y) * r;
    view.k = k; view.auto = false;
    applyView();
  }
  const centre = () => [stage.clientWidth / 2, stage.clientHeight / 2];

  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  const pointers = new Map();
  let pinch = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".stage-hud") || locked) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.classList.add("dragging");
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  stage.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = stage.getBoundingClientRect();
      zoomAt(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch = d;
    } else if (pointers.size === 1) {
      view.x += dx; view.y += dy; view.auto = false; applyView();
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId); pinch = null;
    if (!pointers.size) stage.classList.remove("dragging");
  };
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  stage.addEventListener("dblclick", (e) => { if (!e.target.closest(".stage-hud") && !locked) fit(); });
  new ResizeObserver(() => { if (view.auto) fit(); }).observe(stage);

  $("zoomIn").onclick = () => zoomAt(1.3, ...centre());
  $("zoomOut").onclick = () => zoomAt(1 / 1.3, ...centre());
  $("zoomFit").onclick = () => { if (!locked) fit(); };

  // ───────── peek at original ─────────
  const peek = (on) => paperEl.classList.toggle("peek", on);
  const peekBtn = $("peekBtn");
  peekBtn.addEventListener("pointerdown", () => peek(true));
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) peekBtn.addEventListener(ev, () => peek(false));

  // ───────── trace with camera ─────────
  // The camera fills the stage behind a see-through reference; prop the phone over your paper and trace.
  let tracing = false, stream = null, wakeLock = null;
  const cam = $("cam");

  async function setTracing(on) {
    if (on) {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        cam.srcObject = stream;
        try { wakeLock = await navigator.wakeLock?.request("screen"); } catch { /* optional */ }
      } catch {
        toast("Camera isn't available. Allow camera access, and open the site over HTTPS.");
        return;
      }
    } else {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null; cam.srcObject = null;
      wakeLock?.release?.().catch(() => {}); wakeLock = null;
      setLocked(false);
    }
    tracing = on;
    cam.hidden = !on;
    stage.classList.toggle("tracing", on);
    $("camBtn").setAttribute("aria-pressed", String(on));
    $("camBtn").textContent = on ? "Stop tracing" : "Trace with camera";
    $("seeWrap").hidden = !on; $("lockBtn").hidden = !on;
    paperEl.style.opacity = on ? state.see / 100 : "";
    render();
  }
  function setLocked(on) {
    locked = on;
    stage.classList.toggle("locked", on);
    $("lockBtn").setAttribute("aria-pressed", String(on));
    $("lockBtn").textContent = on ? "Locked" : "Lock";
  }
  $("camBtn").onclick = () => setTracing(!tracing);
  $("lockBtn").onclick = () => setLocked(!locked);
  $("seeThrough").addEventListener("input", (e) => {
    state.see = +e.target.value;
    if (tracing) paperEl.style.opacity = state.see / 100;
    savePrefs();
  });

  // ───────── controls ─────────
  const bind = (id, key, out, fmt, withLines = true) => {
    const el = $(id), o = out && $(out);
    el.addEventListener("input", () => {
      state[key] = el.type === "checkbox" ? el.checked : +el.value;
      if (o) o.textContent = fmt ? fmt(state[key]) : state[key];
      recompute(withLines);
    });
  };
  bind("values", "n", "valuesOut");
  bind("contrast", "contrast", "contrastOut", (v) => v + "%");
  bind("squint", "squint", "squintOut", (v) => (v ? v : "off"));
  bind("levels", "levels");
  bind("lineBlur", "lineBlur", "lineBlurOut", (v) => v + "%");
  bind("detail", "detail", "detailOut", detailLabel);

  function detailLabel(v) { return v <= 3 ? "fewer" : v >= 7 ? "more" : "balanced"; }

  $("ghost").addEventListener("input", (e) => { state.ghost = +e.target.value; $("ghostOut").textContent = state.ghost + "%"; buildProgress(); render(); });
  $("dots").addEventListener("change", (e) => { state.dots = e.target.checked; render(); });
  $("grid").addEventListener("change", (e) => { state.grid = e.target.checked; syncControls(); render(); });
  $("gridCols").addEventListener("input", (e) => { state.cols = +e.target.value; $("gridOut").textContent = state.cols; renderGrid(); savePrefs(); });
  $("flip").addEventListener("change", (e) => { state.flip = e.target.checked; render(); });
  $("leads").addEventListener("change", (e) => { state.leads = e.target.checked; render(); });
  $("paperSeg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-paper]");
    if (!b) return;
    state.paper = b.dataset.paper; syncControls(); buildProgress(); render();
  });

  function syncControls() {
    $("values").value = state.n; $("valuesOut").textContent = state.n;
    $("contrast").value = state.contrast; $("contrastOut").textContent = state.contrast + "%";
    $("squint").value = state.squint; $("squintOut").textContent = state.squint || "off";
    $("levels").checked = state.levels;
    $("lineBlur").value = state.lineBlur; $("lineBlurOut").textContent = state.lineBlur + "%";
    $("detail").value = state.detail; $("detailOut").textContent = detailLabel(state.detail);
    $("ghost").value = state.ghost; $("ghostOut").textContent = state.ghost + "%";
    $("dots").checked = state.dots;
    $("seeThrough").value = state.see;
    $("grid").checked = state.grid;
    $("gridCols").value = state.cols; $("gridOut").textContent = state.cols;
    $("gridField").classList.toggle("off", !state.grid);
    $("flip").checked = state.flip;
    $("leads").checked = state.leads;
    document.querySelectorAll("#paperSeg button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.paper === state.paper)));
  }

  $("prev").onclick = () => go(state.step - 1);
  $("next").onclick = () => go(state.step + 1);
  $("panelBtn").onclick = (e) => {
    const open = $("panel").classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", String(open));
  };

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || $("studio").hidden) return;
    if (e.target.matches("input[type=range], input[type=url]")) return;
    const k = e.key.toLowerCase();
    if (k === "arrowright") go(state.step + 1);
    else if (k === "arrowleft") go(state.step - 1);
    else if (k === "g") { state.grid = !state.grid; syncControls(); render(); }
    else if (k === "m") { state.flip = !state.flip; syncControls(); render(); }
    else if (k === "t") setTracing(!tracing);
    else if (k === "o") peek(true);
  });
  document.addEventListener("keyup", (e) => { if (e.key.toLowerCase() === "o") peek(false); });

  // ───────── save pass ─────────
  $("saveBtn").onclick = () => {
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const o = out.getContext("2d");
    o.save();
    if (state.flip) { o.translate(W, 0); o.scale(-1, 1); }
    const st = stepAt(state.step);
    if (st.kind === "line") paintPaper(o, W, H, false); else o.drawImage(canvas, 0, 0);
    strokeLines(o, st, 1, { width: Math.max(2, W / 400), dots: true });
    o.restore();
    if (state.grid) {
      const cell = W / state.cols;
      o.strokeStyle = "rgba(196,85,58,.9)"; o.lineWidth = Math.max(1, W / 900);
      o.beginPath();
      for (let c = 1; c < state.cols; c++) { o.moveTo(c * cell, 0); o.lineTo(c * cell, H); }
      for (let r = 1; r * cell < H; r++) { o.moveTo(0, r * cell); o.lineTo(W, r * cell); }
      o.stroke();
    }
    out.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `portrait-coach-pass-${state.step}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  };

  // ───────── loading images ─────────
  const welcome = $("welcome"), studio = $("studio");
  let toastTimer;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3600);
  }

  function open(img, src, { keepStep = false } = {}) {
    source = src;
    ingest(img);
    if (!keepStep) state.step = 1;
    welcome.hidden = true; studio.hidden = false;
    $("shareBtn").hidden = false; $("panelBtn").hidden = false;
    syncControls();
    computeValues();
    computeLines();
    state.step = Math.min(state.step, totalSteps());
    buildProgress();
    render();
    fit();
  }

  function loadUrl(url, src, opts) {
    const img = new Image();
    if (/^https?:/i.test(url)) img.crossOrigin = "anonymous";
    img.onload = () => open(img, src, opts);
    img.onerror = () => toast(src.kind === "url" ? "Couldn't load that link. Try saving the image and opening the file." : "Couldn't load that image.");
    img.src = url;
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return toast("That doesn't look like an image.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      open(img, { kind: "file", ref: file.name });
      addRecent(img, file.name);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("Couldn't read that file."); };
    img.src = url;
  }

  function addRecent(img, name) {
    const k = Math.min(1, 720 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const list = (store.get("pc.recent") || []).filter((r) => r.name !== name);
    list.unshift({ name, data: c.toDataURL("image/jpeg", 0.8) });
    while (list.length && !store.set("pc.recent", list.slice(0, 6))) list.pop();
    renderRecent();
  }

  function thumb(item, onclick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sample"; b.title = item.name;
    b.innerHTML = `<img alt="" src="${item.src || item.data}"><span></span>`;
    b.lastChild.textContent = item.name;
    b.onclick = onclick;
    return b;
  }

  function renderRecent() {
    const list = store.get("pc.recent") || [];
    $("recentWrap").hidden = !list.length;
    $("recent").replaceChildren(...list.map((r) => thumb(r, () => loadUrl(r.data, { kind: "file", ref: r.name }))));
  }

  $("samples").replaceChildren(...SAMPLES.map((s) => thumb(s, () => loadUrl(s.src, { kind: "sample", ref: s.id }))));

  const fileInput = $("fileInput");
  $("openBtn").onclick = () => fileInput.click();
  $("newBtn").onclick = () => {
    if (tracing) setTracing(false);
    source = null; studio.hidden = true; welcome.hidden = false;
    $("shareBtn").hidden = true; $("panelBtn").hidden = true;
    try { history.replaceState(null, "", location.pathname); } catch { /* sandboxed */ }
    window.scrollTo(0, 0);
  };
  fileInput.onchange = () => { loadFile(fileInput.files[0]); fileInput.value = ""; };

  const drop = $("drop");
  drop.addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); });
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
  document.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) drop.classList.remove("over"); });
  document.addEventListener("drop", (e) => {
    e.preventDefault(); drop.classList.remove("over");
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
    else {
      const u = (e.dataTransfer.getData("text/uri-list") || "").split("\n")[0].trim();
      if (u) loadUrl(u, { kind: "url", ref: u });
    }
  });
  document.addEventListener("paste", (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) loadFile(f);
  });

  $("urlForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const u = $("urlInput").value.trim();
    if (u) loadUrl(u, { kind: "url", ref: u });
  });

  $("shareBtn").onclick = async () => {
    savePrefs();
    try { await navigator.clipboard.writeText(location.href); } catch { /* ignore */ }
    toast(source?.kind === "file" ? "Link copied. Settings only; your photo stays on this device." : "Link copied.");
  };

  // ───────── boot ─────────
  const initial = loadPrefs();
  syncControls();
  renderRecent();
  if (initial) {
    if (initial.startsWith("sample:")) {
      const s = SAMPLES.find((x) => x.id === initial.slice(7));
      if (s) loadUrl(s.src, { kind: "sample", ref: s.id }, { keepStep: true });
    } else if (/^https?:\/\//i.test(initial)) {
      loadUrl(initial, { kind: "url", ref: initial }, { keepStep: true });
    }
  }
})();
