/* =====================================================================
   ApexCrestVest 3D Engine — three-d.js
   Three.js dynamically loaded, disposal-safe, single state object.
   Scenes: hero coin, growth chart, globe
   ===================================================================== */

var APEX3D = {
  version: '1.0.0',
  ready: false,
  THREE: null,
  hero: null,
  growth: null,
  globe: null,
  rafId: null,

  /* ---------- Script loader ---------- */
  loadScript: function (url) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + url + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  },

  loadThree: function () {
    var self = this;
    if (self.ready) return Promise.resolve(self.THREE);
    if (window.THREE) {
      self.THREE = window.THREE;
      self.ready = true;
      return Promise.resolve(self.THREE);
    }
    return self.loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      .then(function () {
        self.THREE = window.THREE;
        self.ready = true;
        return self.THREE;
      });
  },

  _ocPromise: null,
  loadOrbitControls: function () {
    var self = this;
    if (self._ocPromise) return self._ocPromise;
    if (window.THREE && window.THREE.OrbitControls) {
      self._ocPromise = Promise.resolve();
      return self._ocPromise;
    }
    var url = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
    self._ocPromise = self.loadScript(url).then(function () {
      /* Verify it attached */
      if (!window.THREE || !window.THREE.OrbitControls) {
        return Promise.reject(new Error('OrbitControls failed to attach to THREE'));
      }
    });
    return self._ocPromise;
  },

  /* ---------- Disposal helpers ---------- */
  disposeRenderer: function (ctx) {
    if (!ctx) return;
    if (ctx.rafId) cancelAnimationFrame(ctx.rafId);
    if (ctx.controls) { try { ctx.controls.dispose(); } catch (e) {} }
    if (ctx.scene) {
      ctx.scene.traverse(function (obj) {
        if (obj.geometry) try { obj.geometry.dispose(); } catch (e) {}
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(function (m) { try { m.dispose(); } catch (e) {} });
          } else {
            try { obj.material.dispose(); } catch (e) {}
          }
        }
      });
    }
    if (ctx.renderer) {
      try { ctx.renderer.dispose(); } catch (e) {}
      var el = ctx.renderer.domElement;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  },

  teardownAll: function () {
    this.disposeRenderer(this.hero);
    this.hero = null;
    this.disposeRenderer(this.growth);
    this.growth = null;
    this.disposeRenderer(this.globe);
    this.globe = null;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  },

  /* ================================================================
     HERO SCENE — Rotating 3D gold coin behind the dashboard
     ================================================================ */
  initHeroCoin: function (THREE) {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    var self = this;

    /* Dispose previous if re-init */
    self.disposeRenderer(self.hero);

    var W = canvas.clientWidth || window.innerWidth;
    var H = canvas.clientHeight || window.innerHeight;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 9);

    /* --- Lighting --- */
    var ambient = new THREE.AmbientLight(0x4a5a7a, 0.6);
    scene.add(ambient);
    var keyLight = new THREE.DirectionalLight(0xf0c75e, 1.4);
    keyLight.position.set(5, 5, 6);
    scene.add(keyLight);
    var rimLight = new THREE.DirectionalLight(0xd4a24e, 0.8);
    rimLight.position.set(-4, -2, 3);
    scene.add(rimLight);
    var pointGold = new THREE.PointLight(0xf0c75e, 1.2, 20);
    pointGold.position.set(0, 0, 4);
    scene.add(pointGold);

    /* --- Gold coin group --- */
    var coinGroup = new THREE.Group();

    var coinGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.35, 64);
    var coinMat = new THREE.MeshPhongMaterial({
      color: 0xd4a24e,
      emissive: 0x3a2a0a,
      specular: 0xfff4d0,
      shininess: 120,
      flatShading: false
    });
    var coin = new THREE.Mesh(coinGeo, coinMat);
    coin.rotation.x = Math.PI / 2;
    coinGroup.add(coin);

    /* Coin rim — torus around the edge */
    var rimGeo = new THREE.TorusGeometry(2.2, 0.08, 16, 80);
    var rimMat = new THREE.MeshPhongMaterial({
      color: 0xf0c75e,
      emissive: 0x2a1f08,
      specular: 0xfff8e0,
      shininess: 100
    });
    var rim = new THREE.Mesh(rimGeo, rimMat);
    coinGroup.add(rim);

    /* Emboss rings (inner + outer) on face — thin torus slightly offset on Z */
    var ringInner = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.03, 12, 64),
      new THREE.MeshPhongMaterial({ color: 0xb8862e, emissive: 0x1a1205, shininess: 80 })
    );
    ringInner.position.z = 0.18;
    coinGroup.add(ringInner);

    var ringOuter = new THREE.Mesh(
      new THREE.TorusGeometry(1.95, 0.025, 12, 64),
      new THREE.MeshPhongMaterial({ color: 0xb8862e, emissive: 0x1a1205, shininess: 80 })
    );
    ringOuter.position.z = 0.18;
    coinGroup.add(ringOuter);

    /* Center emblem — small extruded star using a simple shape */
    var starShape = new THREE.Shape();
    var outerR = 0.9, innerR = 0.38, spikes = 5;
    for (var i = 0; i < spikes * 2; i++) {
      var r = (i % 2 === 0) ? outerR : innerR;
      var a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starShape.closePath();
    var starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
    var starMat = new THREE.MeshPhongMaterial({ color: 0xf0c75e, emissive: 0x2a1f08, specular: 0xfff8e0, shininess: 110 });
    var star = new THREE.Mesh(starGeo, starMat);
    star.position.z = 0.18;
    star.rotation.z = 0;
    coinGroup.add(star);

    /* Position coin behind/beside the dashboard panel (right side, pushed back) */
    coinGroup.position.set(2.0, 0.3, -1.5);
    coinGroup.scale.set(0.85, 0.85, 0.85);
    scene.add(coinGroup);

    /* --- Floating gold particles (dust) --- */
    var particleCount = 120;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(particleCount * 3);
    var pVel = [];
    for (var i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 18;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
      pVel.push({
        x: (Math.random() - 0.5) * 0.003,
        y: (Math.random() - 0.5) * 0.004 + 0.002,
        z: (Math.random() - 0.5) * 0.002
      });
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    var pMat = new THREE.PointsMaterial({
      color: 0xf0c75e,
      size: 0.06,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    /* --- Mouse parallax --- */
    var mouseX = 0, mouseY = 0, targetRX = 0, targetRY = 0;
    window.addEventListener('mousemove', function (e) {
      mouseX = (e.clientX / window.innerWidth) - 0.5;
      mouseY = (e.clientY / window.innerHeight) - 0.5;
    });

    /* --- Resize --- */
    function onResize() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', onResize);

    var ctx = {
      renderer: renderer,
      scene: scene,
      camera: camera,
      controls: null,
      coinGroup: coinGroup,
      particles: particles,
      pVel: pVel,
      onResize: onResize,
      rafId: null
    };

    function animate() {
      ctx.rafId = requestAnimationFrame(animate);
      var t = performance.now() * 0.001;

      /* Coin spin */
      coinGroup.rotation.y = t * 0.5;
      coinGroup.rotation.x = Math.sin(t * 0.3) * 0.15 + 0.1;

      /* Mouse parallax → shift coin slightly */
      targetRX += (mouseY * 0.4 - targetRX) * 0.05;
      targetRY += (mouseX * 0.6 - targetRY) * 0.05;
      coinGroup.position.x = 2.0 + targetRY * 0.8;
      coinGroup.position.y = 0.3 - targetRX * 0.8;

      /* Particles drift */
      var pos = particles.geometry.attributes.position.array;
      for (var j = 0; j < particleCount; j++) {
        pos[j * 3] += pVel[j].x;
        pos[j * 3 + 1] += pVel[j].y;
        pos[j * 3 + 2] += pVel[j].z;
        if (pos[j * 3 + 1] > 6) pos[j * 3 + 1] = -6;
        if (Math.abs(pos[j * 3]) > 9) pVel[j].x *= -1;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate();

    self.hero = ctx;
  },

  /* ================================================================
     GROWTH CHART SCENE — 3D gold bars rising on scroll
     ================================================================ */
  initGrowthChart: function (THREE) {
    var canvas = document.getElementById('growth-canvas');
    if (!canvas) return;
    var self = this;

    self.disposeRenderer(self.growth);

    var W = canvas.clientWidth, H = canvas.clientHeight;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x0d1b2a, 1);

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0d1b2a, 12, 30);

    var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(8, 7, 12);
    camera.lookAt(0, 2.5, 0);

    /* --- Lighting --- */
    scene.add(new THREE.AmbientLight(0x3a4a6a, 0.7));
    var dirLight = new THREE.DirectionalLight(0xf0c75e, 1.1);
    dirLight.position.set(6, 10, 6);
    scene.add(dirLight);
    var fillLight = new THREE.DirectionalLight(0x6a8aaa, 0.5);
    fillLight.position.set(-5, 4, -3);
    scene.add(fillLight);
    var goldPoint = new THREE.PointLight(0xd4a24e, 0.8, 25);
    goldPoint.position.set(0, 5, 5);
    scene.add(goldPoint);

    /* --- Data: 12 months of growth --- */
    var data = [2.0, 2.6, 3.1, 3.5, 4.2, 4.8, 5.3, 5.9, 6.4, 7.0, 7.6, 8.2];
    var barCount = data.length;
    var barWidth = 0.7, barDepth = 0.7, spacing = 0.35;
    var totalWidth = barCount * (barWidth + spacing) - spacing;
    var startX = -totalWidth / 2 + barWidth / 2;

    var bars = [];
    var goldColors = [0xb8862e, 0xc99a3a, 0xd4a24e, 0xe0b258, 0xf0c75e];

    for (var i = 0; i < barCount; i++) {
      var h = data[i];
      var geo = new THREE.BoxGeometry(barWidth, h, barDepth);
      var mat = new THREE.MeshPhongMaterial({
        color: goldColors[i % goldColors.length],
        emissive: 0x2a1f08,
        specular: 0xfff4d0,
        shininess: 90,
        transparent: true,
        opacity: 0.95
      });
      var bar = new THREE.Mesh(geo, mat);
      bar.position.x = startX + i * (barWidth + spacing);
      bar.position.y = h / 2;
      bar.position.z = 0;
      bar.userData.targetHeight = h;
      bar.userData.currentHeight = 0.01;
      bar.scale.y = 0.01 / h; /* start flat */
      bar.position.y = 0.005;
      scene.add(bar);
      bars.push(bar);

      /* Bar top cap — small gold disk */
      var capGeo = new THREE.BoxGeometry(barWidth * 1.02, 0.06, barDepth * 1.02);
      var capMat = new THREE.MeshPhongMaterial({ color: 0xfff4d0, emissive: 0xd4a24e, emissiveIntensity: 0.4, shininess: 120 });
      var cap = new THREE.Mesh(capGeo, capMat);
      cap.userData.barIndex = i;
      bar.userData.cap = cap;
      cap.position.copy(bar.position);
      cap.position.y = bar.position.y + h / 2;
      scene.add(cap);
    }

    /* --- Floor grid plane --- */
    var floorGeo = new THREE.PlaneGeometry(totalWidth + 6, 8);
    var floorMat = new THREE.MeshPhongMaterial({
      color: 0x122236,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.position.z = 0;
    scene.add(floor);

    /* Grid helper for depth feel */
    var grid = new THREE.GridHelper(totalWidth + 6, 16, 0x2a3a55, 0x1a2f48);
    grid.position.y = 0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.4;
    scene.add(grid);

    /* --- OrbitControls --- */
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 8;
    controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.target.set(0, 2.5, 0);

    /* --- Resize --- */
    function onResize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', onResize);

    var ctx = {
      renderer: renderer,
      scene: scene,
      camera: camera,
      controls: controls,
      bars: bars,
      data: data,
      onResize: onResize,
      rafId: null,
      animateStart: false,
      progress: 0
    };

    /* Start animation when scrolled into view */
    self.growth = ctx;

    function animate() {
      ctx.rafId = requestAnimationFrame(animate);
      controls.update();
      var t = performance.now() * 0.001;

      /* Animate bars rising once triggered */
      if (ctx.animateStart && ctx.progress < 1) {
        ctx.progress = Math.min(1, ctx.progress + 0.012);
        for (var i = 0; i < bars.length; i++) {
          var bar = bars[i];
          var targetH = bar.userData.targetHeight;
          /* Stagger: each bar starts slightly later */
          var barProgress = Math.max(0, Math.min(1, (ctx.progress - i * 0.04) / 0.6));
          var easedH = targetH * easeOutCubic(barProgress);
          bar.scale.y = Math.max(0.001, easedH / targetH);
          bar.position.y = easedH / 2;
          if (bar.userData.cap) {
            bar.userData.cap.position.y = easedH + 0.03;
          }
        }
      }

      /* Subtle shimmer on bars */
      for (var k = 0; k < bars.length; k++) {
        bars[k].material.emissiveIntensity = 0.3 + Math.sin(t * 1.5 + k * 0.5) * 0.15;
      }

      renderer.render(scene, camera);
    }

    function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

    animate();
  },

  /* Trigger growth chart animation */
  triggerGrowth: function () {
    if (this.growth) this.growth.animateStart = true;
  },

  /* ================================================================
     GLOBE SCENE — Dark navy sphere with gold points + auto-rotate
     ================================================================ */
  initGlobe: function (THREE) {
    var canvas = document.getElementById('globe-canvas');
    if (!canvas) return;
    var self = this;

    self.disposeRenderer(self.globe);

    var W = canvas.clientWidth, H = canvas.clientHeight;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x0a1628, 1);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    /* --- Lighting --- */
    scene.add(new THREE.AmbientLight(0x4a5a7a, 0.5));
    var keyLight = new THREE.DirectionalLight(0xf0c75e, 0.9);
    keyLight.position.set(5, 3, 5);
    scene.add(keyLight);
    var rimLight = new THREE.DirectionalLight(0x6a8aaa, 0.4);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    var globeGroup = new THREE.Group();

    /* --- Globe sphere --- */
    var RADIUS = 2.5;
    var sphereGeo = new THREE.SphereGeometry(RADIUS, 64, 64);
    var sphereMat = new THREE.MeshPhongMaterial({
      color: 0x0d1b2a,
      emissive: 0x0a141f,
      emissiveIntensity: 0.5,
      shininess: 15,
      transparent: true,
      opacity: 0.92
    });
    var sphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(sphere);

    /* --- Gold wireframe overlay --- */
    var wireGeo = new THREE.SphereGeometry(RADIUS + 0.01, 32, 24);
    var wireMat = new THREE.MeshBasicMaterial({
      color: 0xd4a24e,
      wireframe: true,
      transparent: true,
      opacity: 0.18
    });
    var wire = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wire);

    /* --- Latitude / longitude grid lines --- */
    var lineMat = new THREE.LineBasicMaterial({ color: 0xd4a24e, transparent: true, opacity: 0.25 });
    /* Latitude rings */
    for (var lat = -60; lat <= 60; lat += 30) {
      var ringGeo = new THREE.RingGeometry(
        RADIUS * Math.cos(lat * Math.PI / 180) + 0.01,
        RADIUS * Math.cos(lat * Math.PI / 180) + 0.015,
        64
      );
      var ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xd4a24e, transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = RADIUS * Math.sin(lat * Math.PI / 180);
      globeGroup.add(ring);
    }

    /* --- Halo glow --- */
    var haloGeo = new THREE.SphereGeometry(RADIUS + 0.3, 32, 32);
    var haloMat = new THREE.MeshBasicMaterial({
      color: 0xd4a24e,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide
    });
    var halo = new THREE.Mesh(haloGeo, haloMat);
    globeGroup.add(halo);

    scene.add(globeGroup);

    /* --- Starfield background --- */
    var starCount = 600;
    var sGeo = new THREE.BufferGeometry();
    var sPos = new Float32Array(starCount * 3);
    for (var s = 0; s < starCount; s++) {
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      var r = 15 + Math.random() * 10;
      sPos[s * 3] = r * Math.sin(phi) * Math.cos(theta);
      sPos[s * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      sPos[s * 3 + 2] = r * Math.cos(phi);
    }
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    var sMat = new THREE.PointsMaterial({ color: 0xb8c4d6, size: 0.08, transparent: true, opacity: 0.6 });
    var stars = new THREE.Points(sGeo, sMat);
    scene.add(stars);

    /* --- Gold glowing points (investor hubs) --- */
    function latLngToVec3(lat, lng, radius) {
      var phi = (90 - lat) * Math.PI / 180;
      var theta = (lng + 180) * Math.PI / 180;
      var x = -radius * Math.sin(phi) * Math.cos(theta);
      var y = radius * Math.cos(phi);
      var z = radius * Math.sin(phi) * Math.sin(theta);
      return new THREE.Vector3(x, y, z);
    }

    var hubs = [
      { lat: 40.71, lng: -74.0, name: 'New York' },
      { lat: 51.51, lng: -0.13, name: 'London' },
      { lat: 25.20, lng: 55.27, name: 'Dubai' },
      { lat: 1.35, lng: 103.82, name: 'Singapore' },
      { lat: 35.68, lng: 139.69, name: 'Tokyo' },
      { lat: -33.87, lng: 151.21, name: 'Sydney' },
      { lat: 48.85, lng: 2.35, name: 'Paris' },
      { lat: 52.52, lng: 13.40, name: 'Berlin' },
      { lat: 43.65, lng: -79.38, name: 'Toronto' },
      { lat: 19.43, lng: -99.13, name: 'Mexico City' },
      { lat: -23.55, lng: -46.63, name: 'São Paulo' },
      { lat: 55.75, lng: 37.62, name: 'Moscow' },
      { lat: 28.61, lng: 77.21, name: 'New Delhi' },
      { lat: 22.32, lng: 114.17, name: 'Hong Kong' },
      { lat: -26.20, lng: 28.04, name: 'Johannesburg' }
    ];

    var pointLights = [];
    for (var p = 0; p < hubs.length; p++) {
      var pos = latLngToVec3(hubs[p].lat, hubs[p].lng, RADIUS + 0.02);
      var dotGeo = new THREE.SphereGeometry(0.045, 12, 12);
      var dotMat = new THREE.MeshBasicMaterial({ color: 0xf0c75e });
      var dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      globeGroup.add(dot);

      /* Glow sprite around each point */
      var glowGeo = new THREE.SphereGeometry(0.12, 12, 12);
      var glowMat = new THREE.MeshBasicMaterial({ color: 0xf0c75e, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending });
      var glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(pos);
      glow.userData.pulsePhase = Math.random() * Math.PI * 2;
      globeGroup.add(glow);
      pointLights.push({ glow: glow, phase: glow.userData.pulsePhase });
    }

    /* --- OrbitControls --- */
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.5;
    controls.enableZoom = true;
    controls.minDistance = 4;
    controls.maxDistance = 14;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.enablePan = false;

    function onResize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', onResize);

    var ctx = {
      renderer: renderer,
      scene: scene,
      camera: camera,
      controls: controls,
      globeGroup: globeGroup,
      stars: stars,
      pointLights: pointLights,
      onResize: onResize,
      rafId: null
    };

    function animate() {
      ctx.rafId = requestAnimationFrame(animate);
      controls.update();
      var t = performance.now() * 0.001;

      /* Pulse the glow points */
      for (var i = 0; i < pointLights.length; i++) {
        var pl = pointLights[i];
        var s = 1 + Math.sin(t * 2 + pl.phase) * 0.3;
        pl.glow.scale.set(s, s, s);
        pl.glow.material.opacity = 0.25 + Math.sin(t * 2 + pl.phase) * 0.15;
      }

      /* Slow star drift */
      stars.rotation.y = t * 0.02;

      renderer.render(scene, camera);
    }
    animate();

    self.globe = ctx;
  },

  /* ================================================================
     INIT — entry point called from app.js
     ================================================================ */
  init: function (opts) {
    opts = opts || {};
    var self = this;
    self.loadThree().then(function (THREE) {
      if (opts.hero) self.initHeroCoin(THREE);

      if (opts.growth || opts.globe) {
        self.loadOrbitControls().then(function () {
          if (opts.growth) self.initGrowthChart(THREE);
          if (opts.globe) self.initGlobe(THREE);
        }).catch(function (err) {
          console.error('[APEX3D] OrbitControls load failed:', err);
        });
      }
    });
  }
};

window.APEX3D = APEX3D;
