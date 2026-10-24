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

  // ───────── choosing a photo ─────────
  // Keep a copy (at most 1600px) so a reload brings everything back.
  function openSource(data, keep) {
    src.onload = () => {
      src.style.width = src.naturalWidth + "px";
      src.style.height = src.naturalHeight + "px";
      src.hidden = false; $("frame").hidden = false; $("shade").hidden = false; $("empty").hidden = true; $("prepPanel").hidden = false;
      $("prepTop").hidden = false; $("prepTopRight").hidden = false;
      crop = keep && store.get("pc.crop");
      if (crop && crop.h == null) { crop.h = crop.L; delete crop.L; } // saved by the square-only version
      if (!crop) defaultCrop();
      applyAdj(); applyShape();
      if (keep && store.get("pc.screen") === "trace") showTrace(); else showPrep();
    };
    src.onerror = () => toast("Could not open that image. Try another photo.");
    src.src = data;
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return toast("That file is not an image. Choose a photo instead.");
    loadUrl(URL.createObjectURL(file), true);
  }

  function loadUrl(url, revoke) {
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
      openSource(data, false);
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
  }

  // ───────── step 2: trace ─────────
  // The crop is placed by its centre offset from the stage centre, a rotation and a scale.
  const view = { x: 0, y: 0, r: 0, k: 1 };
  let saveTimer, step = store.get("pc.step") ?? 0;

  function apply() {
    photo.style.transform = `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) rotate(${view.r}rad) scale(${view.k})`;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set("pc.view", view), 300);
  }
  function fit() {
    const w = parseFloat(photo.style.width), h = parseFloat(photo.style.height);
    Object.assign(view, { x: 0, y: 0, r: 0, k: Math.min(stage.clientWidth / w, stage.clientHeight / h) * 0.9 });
    apply();
  }

  // Tones are built like pencil layers over 9 equal levels: 3 zones (dark, mid, light), each split
  // into thirds. Each step darkens one zone's lower thirds, so no step ever lightens anything:
  //   1–2  the dark and mid zones at their lightest value (light stays white paper)
  //   3–5  dark, mid, light: the lower two thirds darken to the middle value
  //   6–8  dark, mid, light: the lowest third darkens to the darkest value
  // A step [zone, third] sets every level of that zone up to that third to the third's value.
  const STEPS = [[0, 2], [1, 2], [0, 1], [1, 1], [2, 1], [0, 0], [1, 0], [2, 0]];
  const levelValue = (z) => Math.round((z + 1) * 255 / 9);
  function stepLut(n) {
    const lut = new Array(9).fill(255);
    for (const [zone, third] of STEPS.slice(0, n)) {
      for (let s = 0; s <= third; s++) lut[zone * 3 + s] = levelValue(zone * 3 + third);
    }
    return lut;
  }

  // Draw the crop as the photo itself (step 0) or as the tones after a given step.
  function drawPhoto() {
    if (!baked) return;
    const ow = baked.width, oh = baked.height, long = Math.max(ow, oh);
    photo.width = ow; photo.height = oh;
    photo.style.width = DISPLAY * ow / long + "px";
    photo.style.height = DISPLAY * oh / long + "px";
    const x = photo.getContext("2d");
    if (!step) { x.drawImage(baked, 0, 0); }
    else {
      const img = x.createImageData(ow, oh), d = img.data, lut = stepLut(step);
      for (let i = 0, j = 0; j < lum.length; i += 4, j++) {
        const v = lut[Math.min(8, Math.floor(lum[j] * 9 / 256))];
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
    }
    $("toneStep").textContent = step ? `${step} of ${STEPS.length}` : "Photo";
    $("toneBack").disabled = step === 0;
    $("toneNext").disabled = step === STEPS.length;
    // Graphite step dots: done, on, todo; a small gap where each round of layers starts.
    $("toneDots").replaceChildren(...STEPS.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button"; dot.className = "gr-dot" + (i === 2 || i === 5 ? " round-start" : "");
      dot.dataset.s = i + 1 === step ? "on" : i + 1 < step ? "done" : "todo";
      dot.setAttribute("aria-label", `Go to step ${i + 1}`);
      dot.onclick = () => goStep(i + 1);
      return dot;
    }));
  }
  const goStep = (n) => { step = Math.max(0, Math.min(STEPS.length, n)); store.set("pc.step", step); drawPhoto(); };
  $("toneBack").onclick = () => goStep(step - 1);
  $("toneNext").onclick = () => goStep(step + 1);
  document.addEventListener("keydown", (e) => {
    if ($("trace").hidden || e.target.matches("input")) return;
    if (e.key === "ArrowRight") goStep(step + 1);
    else if (e.key === "ArrowLeft") goStep(step - 1);
  });

  function showTrace() {
    bake();
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
    blend.disabled = !camOn;
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

  // ───────── boot ─────────
  applyAdj();
  const last = store.get("pc.src");
  if (last) openSource(last, true);
})();
