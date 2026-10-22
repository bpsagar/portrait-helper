(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const MAX_SIDE = 1400;

  const SAMPLES = [
    { id: "eyes", name: "Eye study", src: "assets/samples/eyes.jpg" },
    { id: "akram", name: "Three-quarter", src: "assets/samples/akram-deptq.jpg" },
    { id: "messi", name: "Portrait", src: "assets/samples/messi.jpg" },
    { id: "ronaldo", name: "Portrait", src: "assets/samples/ronaldo.jpg" },
  ];

  const NAMES = ["Darkest accent", "Deep shadow", "Shadow", "Core shadow", "Midtone", "Half-light", "Light", "Highlight edge"];
  const LEADS = ["8B", "6B", "5B", "4B", "2B", "B", "HB", "F", "2H"];
  const GRAPHITE = [29, 27, 24];
  const PAPERS = { warm: [241, 234, 220], cool: [233, 236, 238], gray: [168, 163, 153] };

  const defaults = { n: 6, contrast: 100, squint: 2, levels: true, grid: false, cols: 8, flip: false, paper: "warm", leads: true };
  const state = { ...defaults, step: 1 };
  let source = null; // { kind: 'sample' | 'url' | 'file', ref }

  // ───────── persistence ─────────
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };

  function loadPrefs() {
    Object.assign(state, store.get("pc.prefs") || {});
    const h = new URLSearchParams(location.hash.slice(1));
    const num = (k, lo, hi) => { const v = parseInt(h.get(k), 10); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null; };
    const set = (key, v) => { if (v !== null) state[key] = v; };
    set("n", num("v", 3, 10)); set("contrast", num("c", 50, 180)); set("squint", num("s", 0, 12));
    set("cols", num("k", 3, 16)); set("step", num("t", 1, 9));
    if (h.has("l")) state.levels = h.get("l") === "1";
    if (h.has("g")) state.grid = h.get("g") === "1";
    if (h.has("f")) state.flip = h.get("f") === "1";
    if (PAPERS[h.get("p")]) state.paper = h.get("p");
    return h.get("src");
  }

  function savePrefs() {
    const { n, contrast, squint, levels, grid, cols, flip, paper, leads } = state;
    store.set("pc.prefs", { n, contrast, squint, levels, grid, cols, flip, paper, leads });
    const h = new URLSearchParams({
      v: n, c: contrast, s: squint, l: +levels, g: +grid, k: cols, f: +flip, p: paper, t: state.step,
    });
    if (source && source.kind === "sample") h.set("src", "sample:" + source.ref);
    if (source && source.kind === "url") h.set("src", source.ref);
    history.replaceState(null, "", "#" + h.toString());
  }

  // ───────── image → value map ─────────
  let W = 0, H = 0;
  let lum = null; // Float32Array, 0..255
  let idx = null; // Uint8Array, value index per pixel (0 darkest … n-1 paper)
  const origCanvas = $("orig"), canvas = $("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  function ingest(img) {
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    W = Math.max(1, Math.round(img.naturalWidth * k));
    H = Math.max(1, Math.round(img.naturalHeight * k));
    for (const c of [origCanvas, canvas]) { c.width = W; c.height = H; }
    const octx = origCanvas.getContext("2d", { willReadFrequently: true });
    octx.drawImage(img, 0, 0, W, H);
    const px = octx.getImageData(0, 0, W, H).data;
    lum = new Float32Array(W * H);
    for (let i = 0, j = 0; i < lum.length; i++, j += 4) lum[i] = px[j] * 0.299 + px[j + 1] * 0.587 + px[j + 2] * 0.114;
    const paper = $("paper");
    paper.style.width = W + "px";
    paper.style.height = H + "px";
    $("gridSvg").setAttribute("viewBox", `0 0 ${W} ${H}`);
    view.auto = true;
  }

  function boxBlur(src, r) {
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
    pass(src, tmp, W, 1, H, W);
    pass(tmp, out, H, W, W, 1);
    pass(out, tmp, W, 1, H, W);
    pass(tmp, out, H, W, W, 1);
    return out;
  }

  function computeValues() {
    const r = Math.round(state.squint * W / 500);
    const g = boxBlur(lum, r);
    let lo = 0, hi = 255;
    if (state.levels) {
      const hist = new Uint32Array(256);
      for (let i = 0; i < g.length; i++) hist[g[i] | 0]++;
      const cut = g.length * 0.01;
      let a = 0;
      for (lo = 0; lo < 255 && (a += hist[lo]) < cut; lo++);
      a = 0;
      for (hi = 255; hi > lo + 8 && (a += hist[hi]) < cut; hi--);
    }
    const span = Math.max(8, hi - lo), c = state.contrast / 100, n = state.n;
    idx = new Uint8Array(g.length);
    for (let i = 0; i < g.length; i++) {
      let v = ((g[i] - lo) / span) * 255;
      v = (v - 128) * c + 128;
      idx[i] = Math.round(Math.min(255, Math.max(0, v)) / 255 * (n - 1));
    }
  }

  // ───────── passes ─────────
  const half = () => Math.ceil(state.n / 2);
  const totalSteps = () => state.n - 1;
  const introStep = (i) => (i < half() ? half() - i : i + 1);

  function stepLut(step) {
    const n = state.n, h = half(), lut = new Array(n).fill(n - 1);
    if (step <= h) {
      const t = h - step;
      for (let i = 0; i < h; i++) lut[i] = i <= t ? t : i;
    } else {
      for (let i = 0; i <= step - 1; i++) lut[i] = i;
    }
    return lut;
  }

  function tone(i) {
    const p = PAPERS[state.paper], f = i / (state.n - 1);
    return GRAPHITE.map((g, k) => Math.round(g + (p[k] - g) * f));
  }
  const css = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  const nameOf = (i) => NAMES[Math.round((i / (state.n - 2)) * (NAMES.length - 1))];
  const leadOf = (i) => LEADS[Math.round((i / (state.n - 2)) * (LEADS.length - 1))];
  const label = (i) => (state.leads ? `${nameOf(i)}, ${leadOf(i)}` : nameOf(i));
  const chip = (i) => `<span class="tone" style="background:${css(tone(i))}"></span>`;

  function paintInto(target, indices, w, h, step) {
    const lut = stepLut(step), n = state.n;
    const lut32 = lut.map((ti) => { const [r, g, b] = tone(ti); return (255 << 24) | (b << 16) | (g << 8) | r; });
    const img = target.createImageData(w, h);
    const out = new Uint32Array(img.data.buffer);
    for (let i = 0; i < out.length; i++) out[i] = lut32[indices[i]];
    target.putImageData(img, 0, 0);
    return n;
  }

  function coachCopy(step) {
    const n = state.n, h = half(), last = totalSteps();
    const no = `Pass ${step} of ${last}`;
    if (step <= h) {
      const t = h - step;
      if (step === 1) return { no, title: "Block in the shadows", text: `Squint at the reference. Lay one flat tone, ${chip(t)}<b>${label(t)}</b>, over the whole shadow mass. Ignore features. You're only finding the outer shape of the dark area.` };
      if (step === h) return { no, title: "Find the darkest darks", text: `Place the deepest accents, ${chip(0)}<b>${label(0)}</b>: pupils, nostrils, the corner of the mouth, under the hair. Use them sparingly so they stay powerful.` };
      return { no, title: "Split the shadows", text: `Find where the shadow deepens. Darken those shapes to ${chip(t)}<b>${label(t)}</b> and leave everything lighter as it is.` };
    }
    const i = step - 1;
    if (step === last) return { no, title: "Light touches", text: `Add the last tone, ${chip(i)}<b>${label(i)}</b>, on the planes just before the highlights. Whatever stays blank is your <b>paper</b>. Protect it, then soften edges to taste.` };
    return { no, title: "Bring in the lights", text: `Move into the half-lights. Fill the areas of ${chip(i)}<b>${label(i)}</b>, keeping edges soft where the form turns away from the light.` };
  }

  // ───────── rendering ─────────
  function render() {
    if (!idx) return;
    paintInto(ctx, idx, W, H, state.step);
    const { no, title, text } = coachCopy(state.step);
    $("passNo").textContent = no;
    $("passTitle").textContent = title;
    $("passText").innerHTML = text;
    $("prev").disabled = state.step <= 1;
    $("next").disabled = state.step >= totalSteps();
    $("next").textContent = state.step >= totalSteps() ? "Finished" : "Next pass →";
    renderScale();
    markProgress();
    $("paper").classList.toggle("flip", state.flip);
    renderGrid();
    savePrefs();
  }

  function renderScale() {
    const n = state.n, step = state.step, h = half();
    const frag = document.createDocumentFragment();
    for (let i = n - 1; i >= 0; i--) {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button"; b.className = "val";
      let st;
      if (i === n - 1) st = "paper";
      else if (introStep(i) === step) st = "new";
      else if (i < h && step <= h && i < h - step) st = "merged";
      else st = introStep(i) < step ? "done" : "later";
      b.dataset.state = st;
      const small = { paper: "Left blank", new: "Add now", merged: "Not yet, drawn lighter", done: "In place", later: "Coming later" }[st];
      const lead = state.leads && i < n - 1 ? ` · ${leadOf(i)}` : "";
      b.innerHTML = `<span class="sw" style="background:${css(tone(i))}"></span><span class="nm">${i === n - 1 ? "Paper" : nameOf(i)}<small>${small}${lead}</small></span>`;
      if (i < n - 1) b.onclick = () => go(introStep(i));
      else b.disabled = true;
      li.appendChild(b); frag.appendChild(li);
    }
    $("scaleList").replaceChildren(frag);
  }

  function buildProgress() {
    const wrap = $("progress"), frag = document.createDocumentFragment();
    const tw = 96, th = Math.max(1, Math.round(96 * H / W));
    const small = new Uint8Array(tw * th);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) small[y * tw + x] = idx[Math.min(H - 1, Math.floor((y + .5) * H / th)) * W + Math.min(W - 1, Math.floor((x + .5) * W / tw))];
    for (let s = 1; s <= totalSteps(); s++) {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", `Pass ${s}`);
      const c = document.createElement("canvas"); c.width = tw; c.height = th;
      paintInto(c.getContext("2d"), small, tw, th, s);
      b.appendChild(c);
      b.onclick = () => go(s);
      frag.appendChild(b);
    }
    wrap.replaceChildren(frag);
  }
  function markProgress() {
    [...$("progress").children].forEach((b, i) => b.setAttribute("aria-selected", String(i + 1 === state.step)));
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
  function recompute() {
    if (pending || !lum) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      computeValues();
      state.step = Math.min(state.step, totalSteps());
      buildProgress();
      render();
    });
  }

  // ───────── pan & zoom ─────────
  const stage = $("stage"), paperEl = $("paper");
  const view = { k: 1, x: 0, y: 0, auto: true };
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
    if (e.target.closest(".stage-hud")) return;
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
  stage.addEventListener("dblclick", (e) => { if (!e.target.closest(".stage-hud")) fit(); });
  new ResizeObserver(() => { if (view.auto) fit(); }).observe(stage);

  $("zoomIn").onclick = () => zoomAt(1.3, ...centre());
  $("zoomOut").onclick = () => zoomAt(1 / 1.3, ...centre());
  $("zoomFit").onclick = fit;

  // ───────── peek at original ─────────
  const peek = (on) => paperEl.classList.toggle("peek", on);
  const peekBtn = $("peekBtn");
  peekBtn.addEventListener("pointerdown", () => peek(true));
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) peekBtn.addEventListener(ev, () => peek(false));

  // ───────── controls ─────────
  const bind = (id, key, out, fmt = (v) => v) => {
    const el = $(id), o = out && $(out);
    el.addEventListener("input", () => {
      state[key] = el.type === "checkbox" ? el.checked : +el.value;
      if (o) o.textContent = fmt(state[key]);
      recompute();
    });
  };
  bind("values", "n", "valuesOut");
  bind("contrast", "contrast", "contrastOut", (v) => v + "%");
  bind("squint", "squint", "squintOut", (v) => (v ? v : "off"));
  bind("levels", "levels");

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
    o.drawImage(canvas, 0, 0);
    o.restore();
    if (state.grid) {
      const cell = W / state.cols;
      o.strokeStyle = "rgba(196,85,58,.9)"; o.lineWidth = Math.max(1, W / 900);
      o.fillStyle = "#fff"; o.font = `600 ${Math.round(W / 70)}px sans-serif`; o.textAlign = "center";
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
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  function open(img, src, { keepStep = false } = {}) {
    source = src;
    ingest(img);
    if (!keepStep) state.step = 1;
    welcome.hidden = true; studio.hidden = false;
    $("shareBtn").hidden = false; $("panelBtn").hidden = false;
    syncControls();
    computeValues();
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
    source = null; studio.hidden = true; welcome.hidden = false;
    $("shareBtn").hidden = true; $("panelBtn").hidden = true;
    history.replaceState(null, "", location.pathname);
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
