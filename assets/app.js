(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const stage = $("stage"), photo = $("photo"), cam = $("cam");

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };

  let toastTimer;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3600);
  }

  // ───────── photo ─────────
  // The photo is placed by its centre offset from the stage centre, a rotation and a scale.
  const view = { x: 0, y: 0, r: 0, k: 1 };
  let locked = false, saveTimer;

  function apply() {
    photo.style.transform = `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) rotate(${view.r}rad) scale(${view.k})`;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set("pc.view", view), 300);
  }
  function fit() {
    if (!photo.naturalWidth) return;
    Object.assign(view, { x: 0, y: 0, r: 0, k: Math.min(stage.clientWidth / photo.naturalWidth, stage.clientHeight / photo.naturalHeight) * 0.9 });
    apply();
  }

  function show(src, keepView) {
    photo.onload = () => {
      photo.style.width = photo.naturalWidth + "px";
      photo.style.height = photo.naturalHeight + "px";
      photo.hidden = false; $("empty").hidden = true;
      const saved = keepView && store.get("pc.view");
      if (saved) { Object.assign(view, saved); apply(); } else fit();
    };
    photo.onerror = () => toast("Couldn't open that image.");
    photo.src = src;
  }

  // Keep a copy (at most 1600px) so a reload mid-drawing brings the photo back where it was.
  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return toast("That doesn't look like an image.");
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const data = c.toDataURL("image/jpeg", 0.9);
      store.set("pc.photo", data);
      show(data, false);
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("Couldn't open that image."); };
    img.src = url;
  }

  const fileInput = $("fileInput");
  $("pickBtn").onclick = $("photoBtn").onclick = () => fileInput.click();
  fileInput.onchange = () => { loadFile(fileInput.files[0]); fileInput.value = ""; };
  document.addEventListener("dragover", (e) => { e.preventDefault(); stage.classList.add("over"); });
  document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) stage.classList.remove("over"); });
  document.addEventListener("drop", (e) => { e.preventDefault(); stage.classList.remove("over"); loadFile(e.dataTransfer.files[0]); });
  document.addEventListener("paste", (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) loadFile(f);
  });

  // ───────── move, zoom, rotate ─────────
  // One finger drags; two fingers pinch to zoom and twist to rotate; the wheel zooms; double-tap fits.
  const pointers = new Map();
  let pair = null;
  const centreOf = () => { const b = stage.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };

  // Scale by f and rotate by dr around the screen point (mx, my).
  function transformAbout(mx, my, f, dr) {
    const [cx, cy] = centreOf(), px = cx + view.x - mx, py = cy + view.y - my;
    const cos = Math.cos(dr), sin = Math.sin(dr);
    view.x = mx + f * (px * cos - py * sin) - cx;
    view.y = my + f * (px * sin + py * cos) - cy;
    view.k *= f; view.r += dr;
    apply();
  }
  const pairOf = () => {
    const [a, b] = [...pointers.values()];
    return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x) };
  };

  stage.addEventListener("pointerdown", (e) => {
    if (locked || photo.hidden || e.target.closest(".level")) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pair = pairOf();
  });
  stage.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1) { view.x += dx; view.y += dy; apply(); }
    else if (pointers.size === 2 && pair) {
      const now = pairOf();
      view.x += now.mx - pair.mx; view.y += now.my - pair.my;
      transformAbout(now.mx, now.my, now.d / pair.d, now.a - pair.a);
      pair = now;
    }
  });
  const release = (e) => { pointers.delete(e.pointerId); pair = pointers.size === 2 ? pairOf() : null; };
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (locked || photo.hidden) return;
    transformAbout(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015), 0);
  }, { passive: false });
  stage.addEventListener("dblclick", (e) => { if (!locked && !e.target.closest(".level")) fit(); });

  $("lockBtn").onclick = () => {
    locked = !locked;
    $("lockBtn").setAttribute("aria-pressed", String(locked));
    $("lockBtn").textContent = locked ? "Locked" : "Lock";
  };

  // ───────── see-through ─────────
  let camOn = false, stream = null, wakeLock = null;
  const see = $("see");
  see.value = store.get("pc.see") ?? 50;
  const applySee = () => { photo.style.opacity = camOn ? see.value / 100 : 1; };
  see.addEventListener("input", () => { store.set("pc.see", +see.value); applySee(); });

  // ───────── camera ─────────
  async function setCamera(on) {
    const motion = on ? askForMotion() : null;
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
    $("level").dataset.state = deg <= 1.5 ? "ok" : deg <= 4 ? "near" : "off";
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

  window.addEventListener("pagehide", () => { if (!photo.hidden) store.set("pc.view", view); });

  // ───────── boot ─────────
  const last = store.get("pc.photo");
  if (last) show(last, true);
})();
