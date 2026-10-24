(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const src = $("src"), photo = $("photo"), cam = $("cam");
  const prepStage = $("prepStage"), stage = $("stage");
  const DISPLAY = 1000; // the crop's longest side always shows at this CSS size, so re-editing keeps its place
  const OUT_MAX = 1600; // longest side of the cropped image kept, in pixels
  const SAMPLES = [
    { name: "Eye", src: "assets/samples/eyes.jpg" },
    { name: "Three-quarter portrait", src: "assets/samples/akram-deptq.jpg" },
    { name: "Portrait", src: "assets/samples/messi.jpg" },
    { name: "Portrait", src: "assets/samples/ronaldo.jpg" },
  ];
  const RATIOS = { "1:1": 1, "4:5": 4 / 5, "3:4": 3 / 4, "2:3": 2 / 3, A4: 1 / Math.SQRT2 }; // width / height, portrait
  const BLENDS = { normal: "Normal", multiply: "Multiply", darken: "Darken", overlay: "Overlay", "soft-light": "Soft light", screen: "Screen", difference: "Difference" };

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };

  // ───────── Graphite controls ─────────
  // Dropdown: a caption, a soft hatched trigger and a listbox menu (Graphite's Dropdown component).
  const CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 13 5 5L20 6"/></svg>';
  let openMenu = null;
  function dropdown(host, options, onChange) {
    const id = host.id + "Cap";
    host.classList.add("dd");
    host.innerHTML = `<span class="gr-counter" id="${id}">${host.dataset.label}</span>
      <div class="gr-dropdown"><button class="gr-select" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${id}">
      <span class="gr-block"><span class="gr-hatch"></span></span><span class="gr-label"></span>
      <svg class="gr-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 9 7 7 7-7"/></svg></button>
      <div class="gr-menu" role="listbox" aria-labelledby="${id}" hidden></div></div>`;
    const btn = host.querySelector(".gr-select"), menu = host.querySelector(".gr-menu"), label = host.querySelector(".gr-label");
    let value = null;
    const close = () => { btn.setAttribute("aria-expanded", "false"); menu.hidden = true; if (openMenu === close) openMenu = null; };
    menu.replaceChildren(...Object.entries(options).map(([v, text]) => {
      const o = document.createElement("button");
      o.type = "button"; o.className = "gr-option"; o.setAttribute("role", "option"); o.dataset.value = v;
      o.innerHTML = CHECK; o.prepend(text);
      o.onclick = () => { close(); btn.focus(); if (v !== value) { set(v); onChange(v); } };
      return o;
    }));
    btn.onclick = (e) => {
      e.stopPropagation();
      if (!menu.hidden) return close();
      if (openMenu) openMenu();
      btn.setAttribute("aria-expanded", "true"); menu.hidden = false; openMenu = close;
      (menu.querySelector('[aria-selected="true"]') || menu.firstChild).focus();
    };
    menu.addEventListener("keydown", (e) => {
      const items = [...menu.children], i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus(); }
      else if (e.key === "Escape") { close(); btn.focus(); }
    });
    function set(v) {
      value = v; label.textContent = options[v];
      [...menu.children].forEach((o) => o.setAttribute("aria-selected", String(o.dataset.value === v)));
    }
    return { set, close, get value() { return value; }, set disabled(d) { btn.disabled = d; if (d) close(); } };
  }
  document.addEventListener("click", (e) => { if (openMenu && !e.target.closest(".gr-dropdown")) openMenu(); });

  // Slider: the squiggle grows into an arrow; --f is the value as a fraction.
  const syncSlider = (input) => input.parentNode.style.setProperty("--f", (input.value - input.min) / (input.max - input.min));

  let toastTimer;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3600);
  }

  // ───────── gestures ─────────
  // One finger drags; two fingers pinch (and twist); the wheel zooms; double-tap resets, where offered.
  function gestures(el, h) {
    const pointers = new Map();
    let pair = null;
    const pairOf = () => {
      const [a, b] = [...pointers.values()];
      return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x) };
    };
    el.addEventListener("pointerdown", (e) => {
      if (!h.enabled() || e.target.closest("button, .level, .empty")) return;
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) pair = pairOf();
    });
    el.addEventListener("pointermove", (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 1) h.pan(dx, dy);
      else if (pointers.size === 2 && pair) {
        const now = pairOf();
        h.pan(now.mx - pair.mx, now.my - pair.my);
        h.zoom(now.mx, now.my, now.d / pair.d, now.a - pair.a);
        pair = now;
      }
    });
    const release = (e) => { pointers.delete(e.pointerId); pair = pointers.size === 2 ? pairOf() : null; };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (h.enabled()) h.zoom(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015), 0);
    }, { passive: false });
    if (h.reset) el.addEventListener("dblclick", (e) => { if (h.enabled()) h.reset(); });
  }

  // ───────── step 1: crop and adjust ─────────
  // The crop is a rectangle of the chosen shape in source pixels: centre (u, v) and height h
  // (its width is h × ratio). The frame stays fixed on screen and the photo moves under it.
  let crop = null;
  const adj = { b: 100, c: 100, bw: true, ...(store.get("pc.adj") || {}) };
  const shape = { ratio: "1:1", wide: false, ...(store.get("pc.shape") || {}) };
  const ratio = () => (shape.wide ? 1 / RATIOS[shape.ratio] : RATIOS[shape.ratio]);

  function frameRect() {
    const r = ratio(), aw = Math.max(40, prepStage.clientWidth - 48), ah = Math.max(40, prepStage.clientHeight - 48);
    const w = Math.min(aw, ah * r), h = w / r;
    return { x: (prepStage.clientWidth - w) / 2, y: (prepStage.clientHeight - h) / 2, w, h };
  }
  function clampCrop() {
    const W = src.naturalWidth, H = src.naturalHeight, r = ratio();
    crop.h = Math.min(Math.min(H, W / r), Math.max(32, crop.h));
    const w = crop.h * r;
    crop.u = Math.min(W - w / 2, Math.max(w / 2, crop.u));
    crop.v = Math.min(H - crop.h / 2, Math.max(crop.h / 2, crop.v));
  }
  function layoutCrop() {
    if (!crop) return;
    clampCrop();
    const f = frameRect(), k = f.h / crop.h;
    Object.assign($("frame").style, { left: f.x + "px", top: f.y + "px", width: f.w + "px", height: f.h + "px" });
    const gapX = f.x + "px", gapY = f.y + "px";
    Object.assign($("shade").style, { borderLeftWidth: gapX, borderRightWidth: gapX, borderTopWidth: gapY, borderBottomWidth: gapY });
    src.style.transform = `translate(${f.x + f.w / 2 - crop.u * k}px, ${f.y + f.h / 2 - crop.v * k}px) scale(${k})`;
    store.set("pc.crop", crop);
  }
  // Largest crop of the current shape, centred.
  const defaultCrop = () => { crop = { u: src.naturalWidth / 2, v: src.naturalHeight / 2, h: Infinity }; clampCrop(); };

  gestures(prepStage, {
    enabled: () => !!crop,
    pan(dx, dy) { const k = frameRect().h / crop.h; crop.u -= dx / k; crop.v -= dy / k; layoutCrop(); },
    zoom(mx, my, f) {
      const r = prepStage.getBoundingClientRect(), fr = frameRect(), k = fr.h / crop.h;
      const ox = mx - r.left - (fr.x + fr.w / 2), oy = my - r.top - (fr.y + fr.h / 2);
      const px = crop.u + ox / k, py = crop.v + oy / k; // source point under the fingers stays put
      crop.h /= f; clampCrop();
      const k2 = fr.h / crop.h;
      crop.u = px - ox / k2; crop.v = py - oy / k2;
      layoutCrop();
    },
    reset() { defaultCrop(); layoutCrop(); },
  });

  // A new shape gets the largest crop that fits, around the same centre.
  const shapeDd = dropdown($("shapeDd"), Object.fromEntries(Object.keys(RATIOS).map((r) => [r, r])), (r) => { shape.ratio = r; applyShape(true); });
  function applyShape(resize) {
    if (resize && crop) crop.h = Infinity;
    shapeDd.set(shape.ratio);
    $("turnBtn").setAttribute("aria-pressed", String(shape.wide));
    store.set("pc.shape", shape);
    layoutCrop();
  }
  $("turnBtn").onclick = () => { shape.wide = !shape.wide; applyShape(true); };

  // The preview uses CSS filters; bake() applies the same maths to the pixels.
  function applyAdj() {
    src.style.filter = `brightness(${adj.b / 100}) contrast(${adj.c / 100}) grayscale(${adj.bw ? 1 : 0})`;
    $("bright").value = adj.b; $("brightOut").textContent = adj.b + "%"; syncSlider($("bright"));
    $("contrast").value = adj.c; $("contrastOut").textContent = adj.c + "%"; syncSlider($("contrast"));
    $("bwBtn").setAttribute("aria-pressed", String(adj.bw));
    store.set("pc.adj", adj);
  }
  $("bright").addEventListener("input", (e) => { adj.b = +e.target.value; applyAdj(); });
  $("contrast").addEventListener("input", (e) => { adj.c = +e.target.value; applyAdj(); });
  $("bwBtn").onclick = () => { adj.bw = !adj.bw; applyAdj(); };
  $("adjReset").onclick = () => { Object.assign(adj, { b: 100, c: 100, bw: true }); applyAdj(); };

  function showPrep() {
    setCamera(false);
    $("trace").hidden = true; $("prep").hidden = false;
    store.set("pc.screen", "prep");
    requestAnimationFrame(layoutCrop);
  }
  new ResizeObserver(layoutCrop).observe(prepStage);

  // ───────── recent photos ─────────
  // Every photo you add is kept in this browser (IndexedDB: localStorage is too small for photos),
  // with a thumbnail and the crop, shape and adjustments you last used with it. Newest use first.
  const HISTORY_MAX = 30;
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
  const historyAll = () => photos("readonly", (s) => s.getAll()).then((all) => all.sort((a, b) => b.used - a.used)).catch(() => []);
  const historyGet = (id) => photos("readonly", (s) => s.get(id));
  const historyPut = (rec) => photos("readwrite", (s) => s.put(rec));
  const historyDelete = (id) => photos("readwrite", (s) => s.delete(id));

  let currentId = store.get("pc.current");
  const setCurrent = (id) => { currentId = id; store.set("pc.current", id); };

  // Same thumbnail means the same photo: move it to the front instead of adding it twice.
  async function addToHistory(blob, thumb) {
    const all = await historyAll();
    const same = all.find((r) => r.thumb === thumb);
    const rec = same ? { ...same, used: Date.now() } : { id: Date.now().toString(36), added: Date.now(), used: Date.now(), blob, thumb };
    await historyPut(rec);
    for (const old of all.filter((r) => r.id !== rec.id).slice(HISTORY_MAX - 1)) await historyDelete(old.id);
    return { rec, seen: !!same };
  }
  // Remember how the current photo was cropped and adjusted, for the next time it is picked.
  function rememberSettings() {
    if (!currentId) return;
    historyGet(currentId).then((rec) => rec && historyPut({ ...rec, used: Date.now(), crop: { ...crop }, shape: { ...shape }, adj: { ...adj } })).catch(() => {});
  }

  async function renderRecent() {
    const all = await historyAll();
    $("recentWrap").hidden = !all.length;
    $("recent").replaceChildren(...all.map((rec) => {
      const tile = document.createElement("div");
      tile.className = "tile";
      const b = document.createElement("button");
      b.type = "button"; b.className = "sample"; b.setAttribute("aria-label", "Recent photo");
      const im = document.createElement("img"); im.src = rec.thumb; im.alt = ""; b.appendChild(im);
      b.onclick = () => openRecent(rec.id);
      const x = document.createElement("button");
      x.type = "button"; x.className = "tile-x"; x.setAttribute("aria-label", "Remove from recent");
      x.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      x.onclick = async () => { await historyDelete(rec.id).catch(() => {}); if (rec.id === currentId) setCurrent(null); renderRecent(); };
      tile.append(b, x);
      return tile;
    }));
  }

  async function openRecent(id) {
    const rec = await historyGet(id).catch(() => null);
    if (!rec) return toast("Could not open that photo. Pick another one.");
    const data = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(rec.blob); });
    if (rec.shape) Object.assign(shape, rec.shape);
    if (rec.adj) Object.assign(adj, rec.adj);
    setCurrent(rec.id);
    historyPut({ ...rec, used: Date.now() }).then(renderRecent).catch(() => {});
    store.set("pc.src", data); store.set("pc.view", null);
    openSource(data, { crop: rec.crop || null });
  }

  // ───────── choosing a photo ─────────
  // Keep a copy (at most 1600px) so a reload brings everything back.
  // opts.crop restores a crop; opts.toTrace goes straight to tracing (a reload mid-drawing).
  function openSource(data, opts = {}) {
    src.onload = () => {
      src.style.width = src.naturalWidth + "px";
      src.style.height = src.naturalHeight + "px";
      src.hidden = false; $("frame").hidden = false; $("shade").hidden = false; $("empty").hidden = true; $("prepPanel").hidden = false;
      $("prepTop").hidden = false; $("prepTopRight").hidden = false;
      crop = opts.crop ? { ...opts.crop } : null;
      if (crop && crop.h == null) { crop.h = crop.L; delete crop.L; } // saved by the square-only version
      if (!crop) defaultCrop();
      applyAdj(); applyShape();
      if (opts.toTrace) showTrace(); else showPrep();
    };
    src.onerror = () => toast("Could not open that image. Try another photo.");
    src.src = data;
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return toast("That file is not an image. Choose a photo instead.");
    loadUrl(URL.createObjectURL(file), true, true);
  }

  // Bring a photo in at most 1600px; photos you add (not samples) also go into Recent.
  function loadUrl(url, revoke, remember) {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      if (revoke) URL.revokeObjectURL(url);
      const data = c.toDataURL("image/jpeg", 0.9);
      store.set("pc.src", data);
      store.set("pc.crop", null); store.set("pc.view", null);
      setCurrent(null);
      openSource(data);
      if (remember) {
        const t = document.createElement("canvas"), ts = Math.min(1, 240 / Math.max(c.width, c.height));
        t.width = Math.round(c.width * ts); t.height = Math.round(c.height * ts);
        t.getContext("2d").drawImage(c, 0, 0, t.width, t.height);
        const thumb = t.toDataURL("image/jpeg", 0.8);
        c.toBlob((blob) => addToHistory(blob, thumb).then(({ rec, seen }) => {
          // A photo used before comes back with its last crop and adjustments.
          if (seen && rec.crop) return openRecent(rec.id);
          setCurrent(rec.id);
          renderRecent();
        }).catch(() => {}), "image/jpeg", 0.9);
      }
    };
    img.onerror = () => { if (revoke) URL.revokeObjectURL(url); toast("Could not open that image. Try another photo."); };
    img.src = url;
  }

  // The picker: choose from the device, or start from a sample.
  $("samples").replaceChildren(...SAMPLES.map((s) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sample"; b.title = s.name; b.setAttribute("aria-label", s.name);
    const im = document.createElement("img"); im.src = s.src; im.alt = ""; b.appendChild(im);
    b.onclick = () => loadUrl(s.src, false);
    return b;
  }));
  function openPicker() {
    renderRecent();
    $("empty").hidden = false; $("prepPanel").hidden = true;
    $("cancelPick").hidden = src.hidden;
  }
  $("cancelPick").onclick = () => { $("empty").hidden = true; $("prepPanel").hidden = false; };

  const fileInput = $("fileInput");
  $("pickBtn").onclick = () => fileInput.click();
  $("changeBtn").onclick = openPicker;
  fileInput.onchange = () => { loadFile(fileInput.files[0]); fileInput.value = ""; };
  document.addEventListener("dragover", (e) => { e.preventDefault(); prepStage.classList.add("over"); });
  document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) prepStage.classList.remove("over"); });
  document.addEventListener("drop", (e) => { e.preventDefault(); prepStage.classList.remove("over"); loadFile(e.dataTransfer.files[0]); });
  document.addEventListener("paste", (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) loadFile(f);
  });

  // ───────── bake the crop ─────────
  // Crop, then brightness → contrast → greyscale, matching the CSS filter preview.
  let baked = null, lum = null;
  function bake() {
    const cw = crop.h * ratio(), s = Math.min(1, OUT_MAX / Math.max(cw, crop.h));
    const ow = Math.max(1, Math.round(cw * s)), oh = Math.max(1, Math.round(crop.h * s));
    const c = document.createElement("canvas");
    c.width = ow; c.height = oh;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(src, crop.u - cw / 2, crop.v - crop.h / 2, cw, crop.h, 0, 0, ow, oh);
    const img = x.getImageData(0, 0, ow, oh), d = img.data, b = adj.b / 100, k = adj.c / 100;
    lum = new Uint8ClampedArray(ow * oh);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      let r = d[i] * b, g = d[i + 1] * b, bl = d[i + 2] * b;
      r = (r - 127.5) * k + 127.5; g = (g - 127.5) * k + 127.5; bl = (bl - 127.5) * k + 127.5;
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      if (adj.bw) r = g = bl = y;
      d[i] = r; d[i + 1] = g; d[i + 2] = bl;
      lum[j] = y;
    }
    x.putImageData(img, 0, 0);
    baked = c;
    splitTones();
  }

  // ───────── step 2: trace ─────────
  // The crop is placed by its centre offset from the stage centre, a rotation and a scale.
  const view = { x: 0, y: 0, r: 0, k: 1 };
  let saveTimer;
  // Which of the 9 tones show (darkest first), and whether the photo shows instead of tones.
  const visible = Array.isArray(store.get("pc.visible")) && store.get("pc.visible").length === 9 ? store.get("pc.visible") : new Array(9).fill(true);
  let showPhoto = store.get("pc.showPhoto") ?? true;

  function apply() {
    photo.style.transform = `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) rotate(${view.r}rad) scale(${view.k})`;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set("pc.view", view), 300);
  }
  // Fit shows the whole picture; fill covers the stage. Both straighten and centre it.
  function fit(fill) {
    const w = parseFloat(photo.style.width), h = parseFloat(photo.style.height);
    const sx = stage.clientWidth / w, sy = stage.clientHeight / h;
    Object.assign(view, { x: 0, y: 0, r: 0, k: fill ? Math.max(sx, sy) : Math.min(sx, sy) * 0.94 });
    apply();
  }
  $("fitBtn").onclick = () => fit(false);
  $("fillBtn").onclick = () => fit(true);

  // Tones: 9 levels in 3 zones (dark, mid, light), each zone in thirds. Any set of them can show;
  // a hidden tone is left as blank paper.
  const ZONES = ["Dark", "Mid", "Light"];
  const toneLut = () => levels.value.map((v, z) => (visible[z] ? v : 255));

  // How the grey range becomes 9 levels. Each level is drawn in its lightest grey (its top edge).
  //   even:  nine equal slices of 0–255.
  //   peaks: cut where this photo's histogram dips. Multi-level Otsu picks the two cuts that best
  //          separate the shades into 3 zones, then again inside each zone for its 3 layers, so
  //          zones settle around the photo's own peaks and the layers stay nested.
  let split = store.get("pc.split") === "peaks" ? "peaks" : "even";
  let levels = { of: new Uint8Array(256), value: [] };

  function otsu3(hist, lo, hi) {
    if (hi - lo < 2) return [lo, Math.min(hi, lo + 1)];
    let best = -1, cut = [lo + Math.floor((hi - lo) / 3), lo + Math.floor(2 * (hi - lo) / 3)];
    const n = [0], sum = [0]; // prefix counts and sums from lo
    for (let v = lo; v <= hi; v++) { n.push(n[n.length - 1] + hist[v]); sum.push(sum[sum.length - 1] + v * hist[v]); }
    const part = (a, b) => { const w = n[b - lo + 1] - n[a - lo], s = sum[b - lo + 1] - sum[a - lo]; return w ? (s * s) / w : -1; };
    for (let t1 = lo; t1 < hi - 1; t1++) {
      const p1 = part(lo, t1);
      if (p1 < 0) continue;
      for (let t2 = t1 + 1; t2 < hi; t2++) {
        const p2 = part(t1 + 1, t2), p3 = part(t2 + 1, hi);
        if (p2 < 0 || p3 < 0) continue;
        if (p1 + p2 + p3 > best) { best = p1 + p2 + p3; cut = [t1, t2]; }
      }
    }
    return cut;
  }

  function splitTones() {
    const tops = [];
    if (split === "peaks" && lum) {
      const hist = new Float64Array(256);
      for (let i = 0; i < lum.length; i++) hist[lum[i]]++;
      const [z1, z2] = otsu3(hist, 0, 255);
      for (const [a, b] of [[0, z1], [z1 + 1, z2], [z2 + 1, 255]]) {
        const [s1, s2] = otsu3(hist, a, b);
        tops.push(s1, s2, b);
      }
    } else {
      for (let z = 0; z < 9; z++) tops.push(Math.round((z + 1) * 255 / 9));
    }
    levels.value = tops;
    for (let v = 0, z = 0; v < 256; v++) { while (z < 8 && v > tops[z]) z++; levels.of[v] = z; }
  }

  function setSplit(mode) {
    split = mode; store.set("pc.split", mode);
    document.querySelectorAll("[data-split]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.split === mode)));
    splitTones(); drawPhoto();
  }
  $("splitTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-split]"); if (b) setSplit(b.dataset.split); });

  // Draw the crop as the photo itself, or as the chosen tones.
  function drawPhoto() {
    if (!baked) return;
    const ow = baked.width, oh = baked.height, long = Math.max(ow, oh);
    photo.width = ow; photo.height = oh;
    photo.style.width = DISPLAY * ow / long + "px";
    photo.style.height = DISPLAY * oh / long + "px";
    const x = photo.getContext("2d");
    if (showPhoto) { x.drawImage(baked, 0, 0); }
    else {
      const img = x.createImageData(ow, oh), d = img.data, lut = toneLut();
      for (let i = 0, j = 0; j < lum.length; i += 4, j++) {
        const v = lut[levels.of[lum[j]]];
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
    }
    renderTones();
  }

  // The swatch row: each swatch is a tone in its own grey; zone names toggle their three tones.
  function renderTones() {
    $("photoBtn").setAttribute("aria-pressed", String(showPhoto));
    $("tones").classList.toggle("tones-off", showPhoto);
    $("tones").replaceChildren(...ZONES.map((name, zone) => {
      const group = document.createElement("div");
      group.className = "tone-group";
      const label = document.createElement("button");
      label.type = "button"; label.className = "gr-counter zone-btn"; label.textContent = name;
      label.setAttribute("aria-label", `Show or hide all ${name.toLowerCase()} tones`);
      label.onclick = () => {
        const on = !(visible[zone * 3] && visible[zone * 3 + 1] && visible[zone * 3 + 2]);
        for (let s = 0; s < 3; s++) visible[zone * 3 + s] = on;
        changeTones();
      };
      const row = document.createElement("div");
      row.className = "swatches";
      for (let s = 0; s < 3; s++) {
        const z = zone * 3 + s, v = levels.value[z];
        const sw = document.createElement("button");
        sw.type = "button"; sw.className = "swatch";
        sw.style.setProperty("--tone", `rgb(${v},${v},${v})`);
        sw.setAttribute("aria-pressed", String(visible[z]));
        sw.setAttribute("aria-label", `${name} tone ${s + 1} of 3`);
        sw.onclick = () => { visible[z] = !visible[z]; changeTones(); };
        row.appendChild(sw);
      }
      group.append(label, row);
      return group;
    }));
  }
  // Touching a tone means you want tones, not the photo.
  function changeTones() {
    showPhoto = false;
    store.set("pc.visible", visible); store.set("pc.showPhoto", showPhoto);
    drawPhoto();
  }
  $("photoBtn").onclick = () => { showPhoto = !showPhoto; store.set("pc.showPhoto", showPhoto); drawPhoto(); };

  function showTrace() {
    bake();
    rememberSettings();
    $("prep").hidden = true; $("trace").hidden = false;
    store.set("pc.screen", "trace");
    drawPhoto();
    requestAnimationFrame(() => {
      const saved = store.get("pc.view");
      if (saved) { Object.assign(view, saved); apply(); } else fit();
    });
  }
  $("doneBtn").onclick = showTrace;
  $("editBtn").onclick = showPrep;

  // No double-tap reset here: one stray double-tap would undo the alignment with the paper.
  gestures(stage, {
    enabled: () => true,
    pan(dx, dy) { view.x += dx; view.y += dy; apply(); },
    // Scale by f and rotate by dr around the screen point (mx, my).
    zoom(mx, my, f, dr) {
      const b = stage.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const px = cx + view.x - mx, py = cy + view.y - my, cos = Math.cos(dr), sin = Math.sin(dr);
      view.x = mx + f * (px * cos - py * sin) - cx;
      view.y = my + f * (px * sin + py * cos) - cy;
      view.k *= f; view.r += dr;
      apply();
    },
  });

  // ───────── see-through ─────────
  let camOn = false, stream = null, wakeLock = null;
  // With the camera on, the photo blends with the live view: Multiply, for instance, lets white
  // show the paper through untouched while darks darken it. See-through sets the strength.
  const see = $("see");
  see.value = store.get("pc.see") ?? 50;
  const blend = dropdown($("blendDd"), BLENDS, (v) => { store.set("pc.blend", v); applySee(); });
  blend.set(BLENDS[store.get("pc.blend")] ? store.get("pc.blend") : store.get("pc.blend") === "color-burn" ? "multiply" : "normal");
  const applySee = () => {
    photo.style.opacity = camOn ? see.value / 100 : 1;
    photo.style.mixBlendMode = camOn ? blend.value : "normal";
    $("camOpts").hidden = !camOn;
    if (!camOn) blend.close();
    $("seeOut").textContent = see.value + "%"; syncSlider(see);
  };
  see.addEventListener("input", () => { store.set("pc.see", +see.value); applySee(); });
  applySee();

  // ───────── camera ─────────
  async function setCamera(on) {
    if (on === camOn) return;
    const motion = on ? askForMotion() : null;
    if (on) {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        cam.srcObject = stream;
        try { wakeLock = await navigator.wakeLock?.request("screen"); } catch { /* optional */ }
      } catch {
        toast("Camera is not available. Allow camera access and open the site over HTTPS.");
        return;
      }
    } else {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null; cam.srcObject = null;
      wakeLock?.release?.().catch(() => {}); wakeLock = null;
    }
    camOn = on;
    cam.hidden = !on;
    $("camBtn").setAttribute("aria-pressed", String(on));
    applySee();
    // The level appears only on devices that report tilt (phones and tablets, not laptops).
    $("level").hidden = true;
    if (on) motion.then(() => setTimeout(() => { if (camOn && gravity) { $("level").hidden = false; drawLevel(); } }, 600));
  }
  $("camBtn").onclick = () => setCamera(!camOn);

  // ───────── spirit level ─────────
  // The tilt sensor gives the phone's angles to gravity. Parallel to the paper means the gravity
  // direction, seen from the phone, matches a reference: straight down for paper flat on a table,
  // or whatever was measured while the phone lay on the paper (Calibrate) for a sloped board.
  const FLAT = [0, 0, 1];
  let reference = store.get("pc.level") || FLAT, gravity = null, calibrating = 0;

  // Gravity in the phone's own frame (x right, y toward the top edge, z out of the screen),
  // from the W3C beta/gamma angles. Compass heading (alpha) drops out, so it never matters.
  const toGravity = (beta, gamma) => {
    const b = beta * Math.PI / 180, g = gamma * Math.PI / 180;
    return [-Math.sin(g) * Math.cos(b), Math.sin(b), Math.cos(b) * Math.cos(g)];
  };

  window.addEventListener("deviceorientation", (e) => {
    if (e.beta == null || e.gamma == null) return;
    const g = toGravity(e.beta, e.gamma);
    gravity = gravity ? gravity.map((v, i) => v + (g[i] - v) * 0.25) : g; // smooth out hand shake
    if (calibrating && --calibrating === 0) {
      reference = gravity.slice();
      store.set("pc.level", reference);
      $("calReset").hidden = false;
      toast("Calibrated to your paper. Hold the phone the same way round.");
    }
    if (camOn) drawLevel();
  });

  function drawLevel() {
    if (!gravity) return;
    const dot = gravity.reduce((sum, v, i) => sum + v * reference[i], 0);
    const deg = Math.acos(Math.min(1, Math.max(-1, dot))) * 180 / Math.PI;
    // The bubble floats to the high side, like a real level; 10° reaches the rim.
    let dx = gravity[0] - reference[0], dy = gravity[1] - reference[1];
    const a = ((screen.orientation && screen.orientation.angle) || 0) * Math.PI / 180;
    [dx, dy] = [dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a)];
    const k = 22 / Math.sin(10 * Math.PI / 180), len = Math.hypot(dx, dy) * k, clamp = len > 22 ? 22 / len : 1;
    $("bubble").style.transform = `translate(${(dx * k * clamp).toFixed(1)}px, ${(-dy * k * clamp).toFixed(1)}px)`;
    $("levelDeg").textContent = deg.toFixed(1) + "°";
    const state = deg <= 1.5 ? "ok" : deg <= 4 ? "near" : "off";
    $("level").dataset.state = state;
    $("levelWord").textContent = state === "ok" ? "Level" : "Tilt";
  }

  // iOS asks for permission, and only from a tap; call this first thing in the tap handler.
  function askForMotion() {
    const ask = window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission;
    return ask ? ask.call(DeviceOrientationEvent).catch(() => "denied") : Promise.resolve("granted");
  }

  $("calBtn").onclick = () => { calibrating = 10; };
  $("calReset").onclick = () => {
    reference = FLAT; store.set("pc.level", null);
    $("calReset").hidden = true; drawLevel();
  };
  $("calReset").hidden = reference === FLAT;

  window.addEventListener("pagehide", () => { if (!$("trace").hidden) store.set("pc.view", view); });

  // ───────── theme ─────────
  // Auto follows the device; Light (Paper) and Dark (Graphite) pin it. The head script applies a
  // saved choice before the page draws.
  const THEME_BAR = { light: "#f4f1ea", dark: "#1b1a18" };
  function setTheme(choice) {
    const root = document.documentElement;
    if (choice === "light" || choice === "dark") root.dataset.theme = choice; else delete root.dataset.theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.content = THEME_BAR[choice] || (m.media.includes("dark") ? THEME_BAR.dark : THEME_BAR.light);
    });
    document.querySelectorAll("[data-theme-choice]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.themeChoice === choice)));
    store.set("pc.theme", choice);
  }
  $("themeTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme-choice]");
    if (b) setTheme(b.dataset.themeChoice);
  });
  setTheme(store.get("pc.theme") || "auto");

  document.querySelectorAll("[data-split]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.split === split)));

  // ───────── boot ─────────
  applyAdj();
  renderRecent();
  const last = store.get("pc.src");
  if (last) openSource(last, { crop: store.get("pc.crop"), toTrace: store.get("pc.screen") === "trace" });
})();
