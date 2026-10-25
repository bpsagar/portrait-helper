(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const view = $("view"), vctx = view.getContext("2d", { willReadFrequently: true });
  const SAMPLES = [
    { name: "Eye", src: "../assets/samples/eyes.jpg" },
    { name: "Three-quarter portrait", src: "../assets/samples/akram-deptq.jpg" },
    { name: "Portrait", src: "../assets/samples/messi.jpg" },
    { name: "Portrait", src: "../assets/samples/ronaldo.jpg" },
  ];
  const WORK = 640; // analysis size, longest side
  // The value maps are drawings, so they use Graphite's Paper colours in either theme.
  const PAPER = [244, 241, 234], INK = [31, 30, 28], SHADOW = [85, 82, 78], HALF = [168, 164, 156], LIGHT = [230, 227, 219], HIGH = [249, 247, 241], ACCENT = [176, 67, 42];

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  let toastTimer;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3600);
  }
  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

  // ───────── photos (shared with Portrait Coach's Recent, in this browser) ─────────
  let dbp = null;
  function db() {
    dbp = dbp || new Promise((resolve, reject) => {
      const req = indexedDB.open("portrait-coach", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("photos", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function photos(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction("photos", mode), req = fn(tx.objectStore("photos"));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  const historyAll = () => photos("readonly", (s) => s.getAll()).then((a) => a.sort((x, y) => y.used - x.used)).catch(() => []);

  async function addToHistory(blob, thumb) {
    const all = await historyAll(), same = all.find((r) => r.thumb === thumb);
    const rec = same ? { ...same, used: Date.now() } : { id: Date.now().toString(36), added: Date.now(), used: Date.now(), blob, thumb };
    await photos("readwrite", (s) => s.put(rec));
    for (const old of all.filter((r) => r.id !== rec.id).slice(29)) await photos("readwrite", (s) => s.delete(old.id));
  }

  function tile(src, label, onclick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tile"; b.setAttribute("aria-label", label);
    const im = document.createElement("img"); im.src = src; im.alt = ""; b.appendChild(im);
    b.onclick = onclick;
    return b;
  }
  async function renderPicker() {
    const all = await historyAll();
    $("recentWrap").hidden = !all.length;
    $("recent").replaceChildren(...all.map((r) => tile(r.thumb, "Recent photo", () => {
      const fr = new FileReader(); fr.onload = () => loadUrl(fr.result, false); fr.readAsDataURL(r.blob);
    })));
  }
  $("samples").replaceChildren(...SAMPLES.map((s) => tile(s.src, s.name, () => loadUrl(s.src, false))));

  // Bring a photo in at most 1200px; photos from the device also join Recent.
  function loadUrl(url, remember) {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", 0.88);
      store.set("st.src", data); store.set("st.lesson", 0);
      if (remember) {
        const t = document.createElement("canvas"), ts = Math.min(1, 240 / Math.max(c.width, c.height));
        t.width = Math.round(c.width * ts); t.height = Math.round(c.height * ts);
        t.getContext("2d").drawImage(c, 0, 0, t.width, t.height);
        const thumb = t.toDataURL("image/jpeg", 0.8);
        c.toBlob((blob) => addToHistory(blob, thumb).catch(() => {}), "image/jpeg", 0.9);
      }
      open(data, 0);
    };
    img.onerror = () => toast("Could not open that image. Try another photo.");
    img.src = url;
  }
  const fileInput = $("fileInput");
  $("pickBtn").onclick = () => fileInput.click();
  fileInput.onchange = () => {
    const f = fileInput.files[0]; fileInput.value = "";
    if (!f || !f.type.startsWith("image/")) return toast("That file is not an image. Choose a photo instead.");
    const u = URL.createObjectURL(f); loadUrl(u, true);
  };
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) loadUrl(URL.createObjectURL(f), true);
  });
  $("backBtn").onclick = () => { $("study").hidden = true; $("pick").hidden = false; store.set("st.src", null); renderPicker(); };

  // ───────── analysis ─────────
  // Everything the lessons show is measured once from the photo at a small working size.
  let A = null;

  function boxBlur(src, w, h, r) {
    if (r < 1) return Float32Array.from(src);
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
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
    pass(src, tmp, w, 1, h, w); pass(tmp, out, h, w, w, 1);
    pass(out, tmp, w, 1, h, w); pass(tmp, out, h, w, w, 1);
    return out;
  }

  // Otsu's threshold on a (weighted) 256-bin histogram, within [lo, hi].
  function otsu(hist, lo = 0, hi = 255) {
    let n = 0, sum = 0;
    for (let v = lo; v <= hi; v++) { n += hist[v]; sum += v * hist[v]; }
    let best = -1, t = (lo + hi) >> 1, n0 = 0, s0 = 0;
    for (let v = lo; v < hi; v++) {
      n0 += hist[v]; s0 += v * hist[v];
      const n1 = n - n0;
      if (!n0 || !n1) continue;
      const m0 = s0 / n0, m1 = (sum - s0) / n1, between = n0 * n1 * (m0 - m1) * (m0 - m1);
      if (between > best) { best = between; t = v; }
    }
    return t;
  }
  function percentile(hist, p) {
    let n = 0; for (let v = 0; v < 256; v++) n += hist[v];
    let acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= p * n) return v; }
    return 255;
  }

  // The background: the even tone reachable from the frame. It counts for little in the analysis,
  // so a dark backdrop does not pass for shadow on the face.
  function backgroundOf(L, w, h) {
    const border = [];
    for (let x = 0; x < w; x++) border.push(L[x], L[(h - 1) * w + x]);
    for (let y = 0; y < h; y++) border.push(L[y * w], L[y * w + w - 1]);
    border.sort((a, b) => a - b);
    const bg = border[border.length >> 1], mask = new Uint8Array(w * h), q = new Int32Array(w * h);
    let tail = 0;
    const seed = (i) => { if (!mask[i] && Math.abs(L[i] - bg) < 22) { mask[i] = 1; q[tail++] = i; } };
    for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
    for (let head = 0; head < tail; head++) {
      const j = q[head], x = j % w, y = (j / w) | 0;
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1]) {
        if (k >= 0 && !mask[k] && Math.abs(L[k] - L[j]) < 4 && Math.abs(L[k] - bg) < 40) { mask[k] = 1; q[tail++] = k; }
      }
    }
    return tail > w * h * 0.7 ? new Uint8Array(w * h) : mask;
  }

  function analyse(img) {
    const k = Math.min(1, WORK / Math.max(img.naturalWidth, img.naturalHeight));
    const W = Math.max(1, Math.round(img.naturalWidth * k)), H = Math.max(1, Math.round(img.naturalHeight * k)), N = W * H;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, 0, 0, W, H);
    const px = cx.getImageData(0, 0, W, H).data, L = new Float32Array(N);
    for (let i = 0, j = 0; i < N; i++, j += 4) L[i] = 0.2126 * px[j] + 0.7152 * px[j + 1] + 0.0722 * px[j + 2];
    const diag = Math.hypot(W, H);
    const soft = boxBlur(L, W, H, 1);
    const shapes = boxBlur(L, W, H, Math.round(diag * 0.01)); // squinted: big shapes only
    const bg = backgroundOf(boxBlur(L, W, H, 2), W, H);

    // Weight: the subject counts, the centre most, the background barely.
    const wgt = new Float32Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x / W - 0.5) / 0.42, dy = (y / H - 0.45) / 0.5, i = y * W + x;
      wgt[i] = Math.exp(-(dx * dx + dy * dy)) * (bg[i] ? 0.08 : 1);
    }
    const hist = (src, mask) => { const h = new Float64Array(256); for (let i = 0; i < N; i++) if (!mask || mask(i)) h[Math.min(255, Math.max(0, src[i] | 0))] += wgt[i]; return h; };

    // Light and shadow: Otsu on the squinted values. Halftone: Otsu again inside the light.
    const shapeHist = hist(shapes);
    const T = otsu(shapeHist, 5, 250);
    const H2 = otsu(shapeHist, T + 1, 254);
    // The core of the subject: well away from the background and toward the centre. The darkest
    // darks and brightest lights are looked for only here, so a bright backdrop never counts.
    const nearBg = boxBlur(Float32Array.from(bg), W, H, Math.round(diag * 0.02));
    const core = new Uint8Array(N);
    for (let i = 0; i < N; i++) core[i] = nearBg[i] < 0.02 && wgt[i] > 0.3 ? 1 : 0;
    const softHist = hist(soft, (i) => core[i]);
    const dark = percentile(softHist, 0.025), bright = percentile(softHist, 0.985);

    // Light direction: which half of the face is lighter. Measured on the lighter 60% of a window
    // on the face, so dark hair and a dark backdrop do not decide it. Left and right only: up and
    // down is better read from where the shadows fall.
    const win = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x / W - 0.5) / 0.3, dy = (y / H - 0.45) / 0.35;
      if (Math.exp(-(dx * dx + dy * dy)) > 0.4) win.push(y * W + x);
    }
    const sorted = win.map((i) => shapes[i]).sort((a, b) => a - b), floor = sorted[Math.floor(sorted.length * 0.4)] || 0;
    let ls = 0, ln = 0, rs = 0, rn = 0;
    for (const i of win) {
      if (shapes[i] < floor) continue;
      if (i % W < W / 2) { ls += shapes[i]; ln++; } else { rs += shapes[i]; rn++; }
    }
    const lm = ls / Math.max(1, ln), rm = rs / Math.max(1, rn), balance = (rm - lm) / Math.max(1, (lm + rm) / 2);
    const light = { side: Math.abs(balance) < 0.06 ? 0 : Math.sign(balance), balance };

    A = { img, W, H, N, diag, L, soft, shapes, bg, wgt, core, T, H2, dark, bright, light };
    analyseEdges(); analyseReflected();
  }

  // Shadow edge: along the line between light and shadow, a fast change is a hard edge (a cast
  // shadow, a sharp turn) and a slow one is soft (a round form turning away). Measured as how many
  // pixels the change takes, against the light-to-shadow contrast.
  function analyseEdges() {
    const { W, H, N, soft, shapes, T, wgt, diag } = A;
    let lsum = 0, ln = 0, dsum = 0, dn = 0;
    for (let i = 0; i < N; i++) { if (wgt[i] < 0.3) continue; if (shapes[i] < T) { dsum += soft[i]; dn++; } else { lsum += soft[i]; ln++; } }
    const contrast = Math.max(20, (ln ? lsum / ln : 200) - (dn ? dsum / dn : 60));
    const mid = boxBlur(A.L, W, H, Math.round(diag * 0.004));
    const pts = [];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = y * W + x;
      if (wgt[i] < 0.25 || x < W * 0.03 || x > W * 0.97 || y < H * 0.03 || y > H * 0.97) continue;
      const a = shapes[i] < T, onEdge = a !== (shapes[i + 1] < T) || a !== (shapes[i + W] < T);
      if (!onEdge) continue;
      let g = 0;
      for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
        const j = i + oy * W + ox;
        g = Math.max(g, Math.hypot(mid[j + 1] - mid[j - 1], mid[j + W] - mid[j - W]) / 2);
      }
      const width = contrast / Math.max(0.5, g); // pixels the change takes
      pts.push({ x, y, hard: width < diag * 0.012 });
    }
    A.edges = pts;
    A.hardShare = pts.length ? pts.filter((p) => p.hard).length / pts.length : 0;
  }

  // Inside the shadow: it has lighter and darker parts (reflected light, dark hair), split by Otsu.
  // The rule to check: its lightest part stays darker than the darkest part of the light.
  function analyseReflected() {
    const { N, soft, shapes, T, core } = A, hs = new Float64Array(256), shadowVals = [], lightVals = [];
    for (let i = 0; i < N; i++) {
      if (!core[i]) continue;
      if (shapes[i] < T) { hs[soft[i] | 0]++; shadowVals.push(soft[i]); } else lightVals.push(soft[i]);
    }
    shadowVals.sort((a, b) => a - b); lightVals.sort((a, b) => a - b);
    const q = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(p * arr.length))] : 0);
    const split = otsu(hs, 0, Math.max(1, T));
    A.inside = { split, shadowTop: q(shadowVals, 0.9), lightBottom: q(lightVals, 0.1) };
  }

  // ───────── drawing the lessons ─────────
  function paint(fn) {
    const { W, H, N } = A, img = vctx.createImageData(W, H), d = img.data;
    for (let i = 0, j = 0; i < N; i++, j += 4) { const c = fn(i); d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255; }
    vctx.putImageData(img, 0, 0);
  }
  const greyOf = (v) => [v, v, v];
  // The photo in grey, faded toward paper, as a quiet base for marks drawn over it.
  const faded = (i, amount = 0.55) => { const v = A.soft[i]; return PAPER.map((p) => Math.round(v + (p - v) * amount)); };

  function arrow(x1, y1, x2, y2, color, width) {
    vctx.save();
    vctx.strokeStyle = rgb(color); vctx.fillStyle = rgb(color); vctx.lineWidth = width; vctx.lineCap = "round";
    vctx.beginPath(); vctx.moveTo(x1, y1); vctx.lineTo(x2, y2); vctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1), s = width * 4.5;
    vctx.beginPath(); vctx.moveTo(x2, y2);
    vctx.lineTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
    vctx.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45));
    vctx.closePath(); vctx.fill();
    vctx.restore();
  }
  function ring(x, y, r, color, width) {
    vctx.save(); vctx.strokeStyle = rgb(color); vctx.lineWidth = width;
    vctx.beginPath(); vctx.arc(x, y, r, 0, Math.PI * 2); vctx.stroke(); vctx.restore();
  }

  function legend(items) {
    const el = $("legend");
    el.hidden = !items;
    if (!items) return;
    el.replaceChildren(...items.map(([color, name, share]) => {
      const s = document.createElement("span");
      s.innerHTML = `<i style="background:${rgb(color)}"></i>`;
      s.append(name);
      if (share != null) { const b = document.createElement("b"); b.textContent = Math.round(share * 100) + "%"; s.append(" ", b); }
      return s;
    }));
  }
  function shares(classify, n) {
    const out = new Array(n).fill(0);
    let tot = 0;
    for (let i = 0; i < A.N; i++) { if (A.bg[i]) continue; out[classify(i)]++; tot++; }
    return out.map((v) => v / Math.max(1, tot));
  }

  // Words for a direction in the picture ("from the upper left").
  function directionWords(x, y) {
    const v = y < -0.38 ? "upper" : y > 0.38 ? "lower" : "", h = x < -0.38 ? "left" : x > 0.38 ? "right" : "";
    if (v && h) return `the ${v} ${h}`;
    if (h) return `the ${h}`;
    return v === "upper" ? "above" : v === "lower" ? "below" : "the front";
  }

  // ───────── lessons ─────────
  // Each lesson: a title, two or three sentences, what to draw, what to show, and optionally a
  // control or a question to answer by tapping the picture before the answer is shown.
  const state = { squint: null, split: null, answers: {} };

  const LESSONS = [
    {
      title: "Squint",
      text: () => "Half-close your eyes. Detail melts away and a few big light and dark shapes are left. Those shapes are the portrait.",
      draw: () => "Nothing yet. Look until you can name three or four big shapes.",
      control: () => slider("Squint", 0, 24, state.squint ?? 10, (v) => { state.squint = v; render(); }, (v) => (v ? v : "Off")),
      show() {
        const r = Math.round((state.squint ?? 10) * A.diag / 900);
        const b = boxBlur(A.L, A.W, A.H, r);
        paint((i) => greyOf(b[i])); legend(null);
      },
    },
    {
      title: "Find the light",
      text: () => {
        const side = A.light.side;
        if (!side) return "The light is mostly in front of the face, so neither side is much darker. Look at the shadows under the brow, nose and chin to see how high it sits.";
        return `The ${side > 0 ? "right" : "left"} side of the face is lighter, so the light comes from the ${side > 0 ? "right" : "left"} of the picture. The shadows under the nose and chin show how high it sits.`;
      },
      draw: () => "Mark a small arrow in the corner of your paper for the light.",
      ask: [{ prompt: "Where does the light come from? Tap the side of the picture it comes from.", check: checkLight }],
      show() {
        paint((i) => faded(i, 0.35));
        const { W, H } = A, side = A.light.side, y = H * 0.36, wd = Math.max(3, W / 110);
        if (side) arrow(W / 2 + side * W * 0.47, y, W / 2 + side * W * 0.2, y, ACCENT, wd);
        else ring(W / 2, y, Math.min(W, H) * 0.08, ACCENT, wd);
        legend(null);
      },
    },
    {
      title: "Light and shadow",
      text: () => `Sort everything into two groups, light and dark. Group by value, not by what it is: dark hair joins the shadows here. About ${Math.round(shadowShare() * 100)}% of the subject is in the dark group.`,
      draw: () => "Outline the shadow shapes lightly, then fill them with one flat tone.",
      control: () => slider("Split", 20, 235, state.split ?? A.T, (v) => { state.split = v; render(); refreshText(); }, (v) => (v === A.T ? "Auto" : v)),
      show() {
        const T = state.split ?? A.T;
        paint((i) => (A.shapes[i] < T ? SHADOW : PAPER));
        const [s] = shares((i) => (A.shapes[i] < T ? 0 : 1), 2);
        legend([[SHADOW, "Shadow", s], [PAPER, "Light", 1 - s]]);
      },
    },
    {
      title: "Read the edge",
      text: () => {
        const hard = Math.round(A.hardShare * 100);
        return `Where a form turns slowly away from the light, the shadow edge is soft, as on a cheek. Where a shadow is cast, it is hard, as under the nose. About ${hard}% of this shadow edge is hard.`;
      },
      draw: () => "Keep the hard edges crisp. Blend the soft ones gently into the light.",
      show() {
        const T = A.T;
        paint((i) => (A.shapes[i] < T ? faded(i, 0.45).map((v) => v - 20) : faded(i, 0.7)));
        const s = Math.max(1.5, A.W / 260);
        for (const p of A.edges) {
          vctx.fillStyle = rgb(p.hard ? INK : ACCENT);
          const r = p.hard ? s * 1.3 : s * 0.7;
          vctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        }
        legend([[INK, "Hard"], [ACCENT, "Soft"]]);
      },
    },
    {
      title: "Add the halftone",
      text: () => "Inside the light, find the planes that turn gently away from it. That middle value is the halftone. It carries the form, and it stays lighter than any shadow.",
      draw: () => "Add one middle tone inside the light. Leave the brightest planes as paper.",
      show() {
        const { T, H2 } = A;
        const cls = (i) => (A.shapes[i] < T ? 0 : A.shapes[i] < H2 ? 1 : 2);
        paint((i) => [SHADOW, HALF, PAPER][cls(i)]);
        const [s, h, l] = shares(cls, 3);
        legend([[SHADOW, "Shadow", s], [HALF, "Halftone", h], [PAPER, "Light", l]]);
      },
    },
    {
      title: "Darkest and lightest",
      text: () => "The darkest darks and the brightest lights are small. They sit where the light is blocked or reflected most, and they give the drawing its punch. Keep them few.",
      draw: () => "Press hardest only in the darkest darks. Keep the highlights as clean paper.",
      ask: [
        { prompt: "Tap the darkest dark in the picture.", check: (x, y) => checkSpot(x, y, (i) => A.soft[i] <= A.dark, "darkest dark") },
        { prompt: "Now tap the brightest light.", check: (x, y) => checkSpot(x, y, (i) => A.soft[i] >= A.bright, "brightest light") },
      ],
      show() {
        paint((i) => (A.core[i] && A.soft[i] <= A.dark ? INK : A.core[i] && A.soft[i] >= A.bright ? HIGH : faded(i, 0.65)));
        outline((i) => A.core[i] && A.soft[i] >= A.bright, ACCENT);
        const [d, , b] = shares((i) => (!A.core[i] ? 1 : A.soft[i] <= A.dark ? 0 : A.soft[i] >= A.bright ? 2 : 1), 3);
        legend([[INK, "Darkest", d], [ACCENT, "Brightest", b]]);
      },
    },
    {
      title: "Inside the shadow",
      text: () => {
        const { shadowTop, lightBottom } = A.inside;
        const base = "Shadows are not flat. Light bounces back in and lifts parts of them, and dark hair sinks other parts.";
        return shadowTop < lightBottom
          ? `${base} Here even the lightest shadow stays darker than the light, as it should.`
          : `${base} Here the lightest shadow comes close to the light. Draw it a step darker than you see, or the shadow falls apart.`;
      },
      draw: () => "Inside the shadow, darken the deepest parts. Never let a shadow get as light as the light.",
      show() {
        const { T } = A, { split } = A.inside, LIFT = HALF.map((v) => v - 46);
        paint((i) => (A.shapes[i] < T ? (A.soft[i] > split ? LIFT : INK) : PAPER));
        const [d, l] = shares((i) => (A.shapes[i] < T ? (A.soft[i] > split ? 1 : 0) : 2), 3);
        legend([[INK, "Deep shadow", d], [LIFT, "Lighter shadow", l], [PAPER, "Light"]]);
      },
    },
    {
      title: "Your value plan",
      text: () => {
        const s = shadowShare();
        const key = s > 0.55 ? "a low-key portrait: most of it sits in shadow" : s < 0.25 ? "a high-key portrait: most of it sits in light" : "a balanced portrait, light and shadow in fair measure";
        return `This is ${key}. Five values hold the whole head together before any detail.`;
      },
      draw: () => "Shadow shapes first, then halftones, then the darkest darks, then the highlights.",
      show() {
        const { T, H2, dark, bright } = A;
        const cls = (i) => (A.core[i] && A.soft[i] <= dark ? 0 : A.shapes[i] < T ? 1 : A.shapes[i] < H2 ? 2 : A.core[i] && A.soft[i] >= bright ? 4 : 3);
        const pal = [INK, SHADOW, HALF, LIGHT, HIGH];
        paint((i) => pal[cls(i)]);
        const sh = shares(cls, 5);
        legend([[INK, "Accent", sh[0]], [SHADOW, "Shadow", sh[1]], [HALF, "Half", sh[2]], [LIGHT, "Light", sh[3]], [HIGH, "High", sh[4]]]);
      },
    },
  ];

  function shadowShare() {
    const T = state.split ?? A.T;
    let s = 0, n = 0;
    for (let i = 0; i < A.N; i++) { if (A.bg[i]) continue; n++; if (A.shapes[i] < T) s++; }
    return s / Math.max(1, n);
  }
  // Outline a region in a colour: pixels inside it with a neighbour outside.
  function outline(inside, color) {
    const { W, H } = A, s = Math.max(1, A.W / 320);
    vctx.fillStyle = rgb(color);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (inside(i) && (!inside(i - 1) || !inside(i + 1) || !inside(i - W) || !inside(i + W))) vctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
  }

  // ───────── questions ─────────
  function checkLight(x) {
    const side = A.light.side, tapped = Math.abs(x - A.W / 2) < A.W * 0.12 ? 0 : Math.sign(x - A.W / 2);
    if (tapped === side) return side ? "Yes. That side of the face is lighter." : "Yes. Neither side is much darker, so the light is in front.";
    if (!side) return "Not quite. Neither side is much darker: the light is mostly in front.";
    return `Not quite. Compare the two cheeks: the ${side > 0 ? "right" : "left"} one is lighter, so the light comes from there.`;
  }
  function checkSpot(x, y, inside, name) {
    const { W, H } = A;
    let best = Infinity, bx = 0, by = 0;
    for (let yy = 0; yy < H; yy += 2) for (let xx = 0; xx < W; xx += 2) {
      const i = yy * W + xx;
      if (!A.core[i] || !inside(i)) continue;
      const d = Math.hypot(xx - x, yy - y);
      if (d < best) { best = d; bx = xx; by = yy; }
    }
    if (best === Infinity) return `There is no clear ${name} here.`;
    if (best < A.diag * 0.04) return `Yes. That is one of the ${name}s.`;
    return `Not quite. The nearest ${name} is a little ${directionWords((bx - x) / best, (by - y) / best).replace("the ", "to the ")}.`;
  }

  // ───────── the lesson screen ─────────
  // asking: which of the lesson's questions is waiting for a tap (null once answered or shown).
  let lesson = 0, look = "study", asking = null, said = [];
  const question = () => (asking == null ? null : LESSONS[lesson].ask[asking]);

  function slider(label, min, max, value, onInput, fmt) {
    const f = document.createElement("div");
    f.className = "field";
    const id = "s-" + label.toLowerCase();
    f.innerHTML = `<div class="field-head"><label class="gr-counter" for="${id}">${label}</label><output></output></div>
      <div class="gr-slider"><span class="gr-slider__track"></span><span class="gr-slider__fill"></span><svg class="gr-slider__arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 1.5 11 7 3 12.5"/></svg><input type="range" id="${id}" min="${min}" max="${max}" step="1" value="${value}"></div>`;
    const input = f.querySelector("input"), out = f.querySelector("output");
    const sync = () => { input.parentNode.style.setProperty("--f", (input.value - min) / (max - min)); out.textContent = fmt(+input.value); };
    input.addEventListener("input", () => { sync(); onInput(+input.value); });
    sync();
    return f;
  }
  function softButton(label, onclick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "gr-btn gr-soft";
    b.innerHTML = '<span class="gr-block"><span class="gr-hatch"></span></span><span class="gr-label"></span>';
    b.lastChild.textContent = label; b.onclick = onclick;
    return b;
  }

  function refreshText() {
    const L = LESSONS[lesson], q = question();
    $("text").textContent = q ? q.prompt : L.text();
    $("draw").textContent = L.draw();
    $("draw").hidden = !!q;
  }

  function setLesson(n) {
    lesson = Math.max(0, Math.min(LESSONS.length - 1, n));
    store.set("st.lesson", lesson);
    const L = LESSONS[lesson];
    asking = L.ask && !state.answers[lesson] ? 0 : null; said = [];
    $("counter").textContent = `Lesson ${lesson + 1} of ${LESSONS.length}`;
    $("title").textContent = L.title;
    buildControl(); refreshText();
    $("prev").disabled = lesson === 0;
    $("next").disabled = lesson === LESSONS.length - 1;
    $("dots").replaceChildren(...LESSONS.map((_, i) => {
      const d = document.createElement("button");
      d.type = "button"; d.className = "gr-dot"; d.dataset.s = i === lesson ? "on" : i < lesson ? "done" : "todo";
      d.setAttribute("aria-label", `Go to lesson ${i + 1}`); d.onclick = () => setLesson(i);
      return d;
    }));
    render();
  }

  // While a question waits: its feedback so far and a way out. After: the lesson's control and
  // what was said about your answers.
  function buildControl() {
    const L = LESSONS[lesson], c = $("control"), fb = document.createElement("span");
    fb.className = "feedback";
    if (asking != null) {
      fb.textContent = said[said.length - 1] || "";
      c.replaceChildren(fb, softButton("Show me", () => reveal()));
    } else {
      fb.textContent = state.answers[lesson] && state.answers[lesson] !== true ? state.answers[lesson] : "";
      c.replaceChildren(...(L.control ? [L.control()] : []), ...(fb.textContent ? [fb] : []));
    }
  }

  // Before an answer: the plain photo, waiting for a tap. After: the lesson's picture.
  function render() {
    if (!A) return;
    view.width = A.W; view.height = A.H;
    fitView();
    view.classList.toggle("asking", asking != null);
    document.querySelectorAll("[data-look]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.look === look)));
    if (look === "photo" || asking != null) { vctx.drawImage(A.img, 0, 0, A.W, A.H); legend(null); return; }
    LESSONS[lesson].show();
  }

  // Show the picture as large as the stage allows (the canvas works at the small analysis size).
  function fitView() {
    if (!A) return;
    const st = $("stage"), cs = getComputedStyle(st);
    const aw = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const k = Math.min(aw / A.W, ah / A.H);
    view.style.width = Math.floor(A.W * k) + "px"; view.style.height = Math.floor(A.H * k) + "px";
  }
  new ResizeObserver(fitView).observe($("stage"));

  function reveal() {
    state.answers[lesson] = said.length ? said.join(" ") : true;
    asking = null; look = "study";
    buildControl(); refreshText(); render();
  }

  view.addEventListener("click", (e) => {
    const q = question();
    if (!q) return;
    const r = view.getBoundingClientRect();
    said.push(q.check((e.clientX - r.left) * A.W / r.width, (e.clientY - r.top) * A.H / r.height));
    if (asking < LESSONS[lesson].ask.length - 1) { asking++; buildControl(); refreshText(); }
    else reveal();
  });
  document.querySelectorAll("[data-look]").forEach((b) => (b.onclick = () => { look = b.dataset.look; render(); }));
  $("prev").onclick = () => setLesson(lesson - 1);
  $("next").onclick = () => setLesson(lesson + 1);
  document.addEventListener("keydown", (e) => {
    if ($("study").hidden || e.target.matches("input")) return;
    if (e.key === "ArrowRight") setLesson(lesson + 1);
    else if (e.key === "ArrowLeft") setLesson(lesson - 1);
  });

  function open(data, at) {
    const img = new Image();
    img.onload = () => {
      analyse(img);
      Object.assign(state, { squint: null, split: null, answers: {} });
      look = "study";
      $("pick").hidden = true; $("study").hidden = false;
      setLesson(at || 0);
    };
    img.src = data;
  }

  // ───────── boot ─────────
  renderPicker();
  const last = store.get("st.src");
  if (last) open(last, store.get("st.lesson") || 0);
})();
