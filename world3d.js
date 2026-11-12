/* 3D world — three.js renders the floating islands of Ronova's domain (assets/3d/world.glb,
   built in Blender by tools/build_world.py) in place of the 2D map. Every section has an
   island; the wisp flies between them. main.js keeps the panels, dock and live data and
   hands control over through the `view` hook. Without WebGL or the CDN, the 2D map stays. */
(() => {
  const mobile = window.matchMedia("(max-width: 700px)").matches;
  const loadScript = (src) => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  async function boot() {
    const test = document.createElement("canvas");
    if (!(test.getContext("webgl2") || test.getContext("webgl"))) throw new Error("WebGL unavailable");

    const [THREE, { GLTFLoader }, { DRACOLoader }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/loaders/DRACOLoader.js"),
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
      import("three/addons/postprocessing/OutputPass.js"),
      window.WORLD_GLB ? null : loadScript("assets/3d/world.glb.js"),
    ]);
    const bytes = await (await fetch(`data:application/octet-stream;base64,${window.WORLD_GLB}`)).arrayBuffer();
    delete window.WORLD_GLB;
    const draco = new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    const gltf = await new Promise((res, rej) => new GLTFLoader().setDRACOLoader(draco).parse(bytes, "", res, rej));
    draco.dispose();

    /* ---------- renderer ---------- */
    const canvas = document.createElement("canvas");
    canvas.className = "world3d";
    canvas.setAttribute("aria-hidden", "true");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0408, 0.0009);
    const cam = new THREE.PerspectiveCamera(34, 1, 1, 6000);

    // sky: violet-black above, a blood-red glow at the horizon and up from the abyss below
    const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `varying vec3 vP;
        void main(){
          float h = vP.y;
          vec3 top = vec3(0.018, 0.014, 0.032), hor = vec3(0.13, 0.018, 0.035), abyss = vec3(0.075, 0.006, 0.016);
          vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h * 1.6, 0.0, 1.0), 0.55)) : mix(hor, abyss, pow(clamp(-h * 2.2, 0.0, 1.0), 0.6));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    scene.add(sky);

    /* ---------- lights ---------- */
    scene.add(new THREE.HemisphereLight(0x3e3a58, 0x2a050c, 0.85));
    const moon = new THREE.DirectionalLight(0xc4d0ff, 2.2);
    moon.position.set(-220, 380, 260);
    moon.castShadow = true;
    Object.assign(moon.shadow.camera, { left: -320, right: 320, top: 320, bottom: -320, near: 50, far: 1200 });
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.5;
    scene.add(moon, moon.target);
    const abyssLight = new THREE.DirectionalLight(0xff2238, 1.6);   // the undersides glow red from the abyss
    abyssLight.position.set(40, -300, 120);
    scene.add(abyssLight);
    const rim = new THREE.DirectionalLight(0xff4458, 0.7);
    rim.position.set(260, 120, -380);
    scene.add(rim);

    /* ---------- the islands ---------- */
    const root = gltf.scene;
    const glowMats = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      const m = o.material;
      if (m && m.emissive && m.emissive.getHex() && m.emissiveIntensity > 0 && !glowMats.includes(m)) { m.userData.baseEmit = m.emissiveIntensity; glowMats.push(m); }
    });
    scene.add(root);
    const byName = (n) => root.getObjectByName(n);

    const IDS = ["spawn", ...POIS.map((p) => p.id)];
    const islands = {};
    IDS.forEach((id) => {
      const obj = byName(`island_${id}`), lm = byName(`lm_${id}`);
      if (!obj) return;
      const box = new THREE.Box3().setFromObject(obj);
      const lmBox = lm ? new THREE.Box3().setFromObject(lm) : box;
      const top = obj.getWorldPosition(new THREE.Vector3());
      const radius = Math.min(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
      const lmPos = lm ? lm.getWorldPosition(new THREE.Vector3()) : top.clone();
      islands[id] = {
        id, obj, top, radius,
        label: new THREE.Vector3(lmPos.x, lmBox.max.y + 6, lmPos.z),
        perch: new THREE.Vector3(lmPos.x, top.y + 8, lmPos.z + Math.min(radius * 0.5, 26) + 8),   // where the wisp hovers
      };
      obj.userData.island = id;
      // a light on each landmark so it reads in the dark
      const warm = ["team", "dev", "teyvat", "contact"].includes(id);
      const l = new THREE.PointLight(warm ? 0xffb060 : 0xff3344, mobile ? 1800 : 2400, 110, 2);
      l.position.set(lmPos.x, lmBox.max.y * 0.6 + top.y * 0.4, lmPos.z + 14);
      scene.add(l);
    });
    const reel = byName("lm_amv_reel"), star = byName("lm_teyvat_star"), greatEye = byName("great_eye"), debris = byName("debris");
    const watchers = [];
    root.traverse((o) => { if (/^watcher_\d+$/.test(o.name)) watchers.push({ o, y: o.position.y, ph: Math.random() * 6.28 }); });
    // every eye turns its face to the camera; only the iris (its own node) looks at the wisp
    const eyes = [...watchers.map((w) => ({ o: w.o, iris: byName(`${w.o.name}_iris`), rx: 1.5, ry: 0.45 })),
      ...(greatEye ? [{ o: greatEye, iris: byName("great_eye_iris"), rx: 16, ry: 4, tilt: true }] : [])];
    eyes.forEach((e) => { e.o.rotation.order = "YXZ"; e.blink = 3 + Math.random() * 5; });
    // the great eye hangs far off in the sky: out of the fog so its shape stays sharp, dimmed so it looms
    if (greatEye) greatEye.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.fog = false; o.castShadow = false; o.material.color.multiplyScalar(0.42); if (o.material.emissiveIntensity) o.material.emissiveIntensity *= 0.4; } });
    const tmpV = new THREE.Vector3();
    function aimEyes(t, dt) {
      eyes.forEach((e) => {
        const o = e.o;
        o.rotation.y = Math.atan2(cam.position.x - o.position.x, cam.position.z - o.position.z);
        if (e.tilt) o.rotation.x = -Math.atan2(cam.position.y - o.position.y, Math.hypot(cam.position.x - o.position.x, cam.position.z - o.position.z)) * 0.6;
        if (!e.iris) return;
        tmpV.copy(wisp.position);
        o.worldToLocal(tmpV);
        const n = tmpV.length() || 1;
        e.iris.position.x += (Math.max(-1, Math.min(1, (tmpV.x / n) * 2.2)) * e.rx - e.iris.position.x) * 0.1;
        e.iris.position.y += (Math.max(-1, Math.min(1, (tmpV.y / n) * 2.2)) * e.ry - e.iris.position.y) * 0.1;
        if (reduceMotion) return;
        e.blink -= dt;                                       // now and then the eye blinks
        const b = e.blink < 0 ? Math.min(1, Math.abs(e.blink + 0.09) / 0.09) : 1;
        o.scale.y = o.userData.sy || (o.userData.sy = o.scale.y);
        o.scale.y = o.userData.sy * (0.12 + 0.88 * b);
        if (e.blink < -0.18) e.blink = 2.5 + Math.random() * 6;
      });
    }

    /* ---------- the abyss: drifting crimson mist far below, embers rising ---------- */
    const mistTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const g = c.getContext("2d"), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, "rgba(255,60,80,0.55)"); grd.addColorStop(0.45, "rgba(170,20,40,0.22)"); grd.addColorStop(1, "rgba(80,0,10,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
    })();
    const mists = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.32 }));
      const s = 380 + Math.random() * 520;
      m.scale.set(s, s, 1);
      m.rotation.x = -Math.PI / 2;
      m.position.set((Math.random() - 0.5) * 900, -170 - Math.random() * 140, (Math.random() - 0.5) * 900 - 80);
      m.userData.spin = (Math.random() - 0.5) * 0.04;
      scene.add(m);
      mists.push(m);
    }
    const EMB = mobile ? 260 : 600;
    const embGeo = new THREE.BufferGeometry(), embPos = new Float32Array(EMB * 3), embSpd = new Float32Array(EMB);
    for (let i = 0; i < EMB; i++) {
      embPos[i * 3] = (Math.random() - 0.5) * 900; embPos[i * 3 + 1] = -250 + Math.random() * 480; embPos[i * 3 + 2] = (Math.random() - 0.5) * 800;
      embSpd[i] = 4 + Math.random() * 12;
    }
    embGeo.setAttribute("position", new THREE.BufferAttribute(embPos, 3));
    scene.add(new THREE.Points(embGeo, new THREE.PointsMaterial({ color: 0xff7040, size: 1.6, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })));

    /* ---------- the wisp and its trail ---------- */
    const wisp = byName("player");
    scene.add(wisp);
    wisp.add(new THREE.PointLight(0xff4050, mobile ? 1200 : 1800, 80, 2));
    const TRAIL = 40, trailGeo = new THREE.BufferGeometry(), trailPos = new Float32Array(TRAIL * 3);
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
    scene.add(new THREE.Points(trailGeo, new THREE.PointsMaterial({ color: 0xff5060, size: 2.2, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })));

    /* ---------- post: bloom for the eyes, crystals and windows ---------- */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, cam));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? 0.55 : 0.75, 0.55, 0.85));
    composer.addPass(new OutputPass());
    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false); composer.setSize(w, h);
      cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    /* ---------- labels: the existing POI buttons, floated over their islands ---------- */
    const labels = document.createElement("div");
    labels.className = "pois3d";
    POIS.forEach((p, i) => {
      poiEls[i].style.left = poiEls[i].style.top = "0";      // the 2D map positioned them inline
      labels.appendChild(poiEls[i]);
    });

    /* ---------- camera rig: orbit around a focus that follows the wisp ---------- */
    const HOME = { dist: mobile ? 820 : 580, pitch: 0.34 };
    const NEAR = { dist: mobile ? 220 : 170, pitch: 0.4 };
    const rig = { yaw: 0.18, pitch: HOME.pitch, dist: HOME.dist, goal: { yaw: 0.18, pitch: HOME.pitch, dist: HOME.dist } };
    const HOME_FOCUS = new THREE.Vector3(0, 10, 20);
    const focus = HOME_FOCUS.clone(), focusGoal = HOME_FOCUS.clone();
    let overview = true;

    // which island the wisp starts on: the one nearest the player's map position
    const nearestId = () => {
      let best = "spawn", bd = Math.hypot(player.x - SPAWN.x, player.y - SPAWN.y);
      POIS.forEach((p) => { const d = Math.hypot(player.x - p.x, player.y - p.y); if (d < bd) { bd = d; best = p.id; } });
      return best;
    };
    let at = nearestId(), flight = null;
    const wispPos = islands[at].perch.clone();
    if (at !== "spawn") { overview = false; focusGoal.copy(wispPos); focus.copy(wispPos); rig.goal.dist = rig.dist = NEAR.dist; rig.goal.pitch = rig.pitch = NEAR.pitch; }

    function travel(p, open) {
      const id = typeof p === "string" ? p : p.id;
      const isl = islands[id];
      if (!isl) return;
      const done = () => {
        at = id;
        const poi = POIS.find((q) => q.id === id) || { x: SPAWN.x, y: SPAWN.y + 24 };
        player.x = poi.x; player.y = poi.y;                  // main.js reads this for "near" and E to enter
        updateNear();
        if (open && id !== "spawn") openSection(id);
      };
      overview = false;
      rig.goal.dist = NEAR.dist; rig.goal.pitch = NEAR.pitch;
      if (id === at && !flight) { done(); return; }
      const from = wispPos.clone(), to = isl.perch.clone();
      const len = from.distanceTo(to);
      const mid = from.clone().lerp(to, 0.5); mid.y += 30 + len * 0.18;
      flight = { from, mid, to, t: 0, dur: reduceMotion ? 0.01 : Math.min(2.4, 0.9 + len / 260), done };
    }
    function home() {
      overview = true;
      focusGoal.copy(HOME_FOCUS);
      rig.goal.dist = HOME.dist; rig.goal.pitch = HOME.pitch;
    }

    // drag to orbit (a press that moves is a drag, not a click)
    let drag = null, dragged = false;
    world.addEventListener("pointerdown", (e) => { if (openPanel || e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, yaw: rig.goal.yaw, pitch: rig.goal.pitch }; dragged = false; });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!dragged && Math.hypot(dx, dy) > 6) dragged = true;
      if (!dragged) return;
      rig.goal.yaw = drag.yaw - dx * 0.005;
      rig.goal.pitch = Math.min(Math.max(drag.pitch + dy * 0.003, 0.06), 1.25);
    });
    window.addEventListener("pointerup", () => { drag = null; });

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const islandObjs = Object.values(islands).map((i) => i.obj);
    function click(e) {
      if (dragged) { dragged = false; return; }
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObjects(islandObjs, true)[0];
      if (!hit) return;
      let o = hit.object;
      while (o && !o.userData.island) o = o.parent;
      if (!o) return;
      const poi = POIS.find((q) => q.id === o.userData.island);
      if (poi) travelTo(poi, true); else travel("spawn", false);
    }

    /* ---------- frame ---------- */
    const v = new THREE.Vector3(), clock = new THREE.Clock();
    let t = 0;
    function frame(snap) {
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      const still = reduceMotion;

      // keyboard: A/D or arrows orbit, W/S zoom
      if (keys.size && !openPanel) {
        if (keys.has("a") || keys.has("arrowleft")) rig.goal.yaw += dt * 1.4;
        if (keys.has("d") || keys.has("arrowright")) rig.goal.yaw -= dt * 1.4;
        if (keys.has("w") || keys.has("arrowup")) rig.goal.dist = Math.max(rig.goal.dist * (1 - dt * 1.2), 90);
        if (keys.has("s") || keys.has("arrowdown")) rig.goal.dist = Math.min(rig.goal.dist * (1 + dt * 1.2), 1100);
      }
      if (overview && !drag && !still) rig.goal.yaw += dt * 0.03;

      // the wisp: along an arc while flying, otherwise hovering at its island
      if (flight) {
        flight.t = Math.min(1, flight.t + dt / flight.dur);
        const k = flight.t < 0.5 ? 2 * flight.t * flight.t : 1 - Math.pow(-2 * flight.t + 2, 2) / 2, u = 1 - k;
        wispPos.set(
          u * u * flight.from.x + 2 * u * k * flight.mid.x + k * k * flight.to.x,
          u * u * flight.from.y + 2 * u * k * flight.mid.y + k * k * flight.to.y,
          u * u * flight.from.z + 2 * u * k * flight.mid.z + k * k * flight.to.z);
        if (flight.t >= 1) { const cb = flight.done; flight = null; cb(); }
      } else wispPos.lerp(islands[at].perch, 0.1);
      if (!overview) focusGoal.copy(wispPos);
      const f = snap ? 1 : 1 - Math.pow(0.0015, dt);
      focus.lerp(focusGoal, f);
      rig.yaw += (rig.goal.yaw - rig.yaw) * f;
      rig.pitch += (rig.goal.pitch - rig.pitch) * f;
      rig.dist += (rig.goal.dist - rig.dist) * f;
      cam.position.set(
        focus.x + Math.sin(rig.yaw) * Math.cos(rig.pitch) * rig.dist,
        focus.y + Math.sin(rig.pitch) * rig.dist,
        focus.z + Math.cos(rig.yaw) * Math.cos(rig.pitch) * rig.dist);
      cam.lookAt(focus);

      wisp.position.set(wispPos.x, wispPos.y + (still ? 0 : Math.sin(t * 2.2) * 0.8), wispPos.z);
      wisp.rotation.y = still ? 0 : t * 0.9;
      for (let i = TRAIL - 1; i > 0; i--) { trailPos[i * 3] = trailPos[i * 3 - 3]; trailPos[i * 3 + 1] = trailPos[i * 3 - 2]; trailPos[i * 3 + 2] = trailPos[i * 3 - 1]; }
      trailPos[0] = wisp.position.x; trailPos[1] = wisp.position.y; trailPos[2] = wisp.position.z;
      trailGeo.attributes.position.needsUpdate = true;

      aimEyes(t, dt);
      if (!still) {
        watchers.forEach((w) => { w.o.position.y = w.y + Math.sin(t * 1.1 + w.ph) * 3; });
        if (reel) reel.rotation.y = t * 0.5;
        if (star) star.rotation.y = t * 0.7;
        if (debris) debris.rotation.y = t * 0.004;
        mists.forEach((m) => { m.rotation.z += m.userData.spin * dt; });
        for (let i = 0; i < EMB; i++) {
          embPos[i * 3 + 1] += embSpd[i] * dt;
          embPos[i * 3] += Math.sin(t * 0.7 + i) * dt * 2;
          if (embPos[i * 3 + 1] > 240) embPos[i * 3 + 1] = -250;
        }
        embGeo.attributes.position.needsUpdate = true;
        glowMats.forEach((m) => { m.emissiveIntensity = m.userData.baseEmit * (0.85 + 0.15 * Math.sin(t * 2 + m.id)); });
      }

      composer.render();

      // labels over the islands; the current one stays bright
      const w = window.innerWidth, h = window.innerHeight;
      POIS.forEach((p, i) => {
        const el = poiEls[i], isl = islands[p.id];
        if (!isl) return;
        v.copy(isl.label).project(cam);
        if (v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) { el.style.visibility = "hidden"; return; }
        el.style.visibility = "";
        el.style.transform = `translate3d(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px, 0) translate(-50%, -100%)`;
        el.style.opacity = overview || p.id === at ? "1" : "0.6";
      });
    }

    view = {
      camera: (snap) => frame(snap),
      click,
      travel,
      home,
      zoomBy(f) { rig.goal.dist = Math.min(Math.max(rig.goal.dist * f, 90), 1100); },
      debug: { THREE, scene, cam, root, islands, rig },
    };

    world.prepend(canvas);
    world.appendChild(labels);
    document.body.classList.add("is-3d");
    const hint = $("[data-hint-desktop]"), hintT = $("[data-hint-touch]");
    if (hint) hint.textContent = "Drag to look · click an island · 1–8 sections · scroll to zoom · Esc back";
    if (hintT) hintT.textContent = "Drag to look · tap an island to fly there";
    frame(true);
    if (!document.body.classList.contains("on-title")) startLoop();
  }

  document.documentElement.dataset.world3d = "loading";
  boot().then(() => { document.documentElement.dataset.world3d = "ready"; }).catch((err) => {
    document.documentElement.dataset.world3d = `failed: ${err && err.message}`;
    console.warn("3D world unavailable, keeping the 2D map:", err);
  });
})();
