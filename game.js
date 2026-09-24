(() => {
'use strict';

/* =====================================================================
   UTILIDADES
   ===================================================================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* =====================================================================
   CONFIG  (valores del juego. Puedes cambiar los numeros de aqui)
   ===================================================================== */
const CFG = {
  god: false, lava: true, infStamina: false, infAmmo: false, oneShot: false, fly: false,
  speed: 1, jump: 1, gravity: 1, timeScale: 1, sens: 1, fov: 90,
  hRange: 60, hPull: 1, hNoCd: false, hPullEnemy: true,
  passive: false, enemyDmg: 1, enemyCount: 1,
  weaponDmg: 1, fireRate: 1,
  seed: '', size: 10, density: 0.5, fog: 1,
  post: true, resH: 320, dither: 0.6, embers: true,
  debug: false, haptic: true,
  sound: true, music: true, volume: 0.7, musicVol: 0.6,
  autoAim: 0.0, parryWindow: 0.22, bossEvery: 5, pickups: true,
  waveMaxTime: 45
};

/* =====================================================================
   RENDER
   ===================================================================== */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(CFG.fov, 16 / 9, 0.05, 250);
camera.rotation.order = 'YXZ';
scene.add(camera);

let rt = null;
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(320, 180) },
    uTime: { value: 0 },
    uAberr: { value: 0 },
    uHeat: { value: 0 },
    uDither: { value: 0.6 },
    uHurt: { value: 0 },
    uPost: { value: 1 },
    uFlash: { value: 0 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uTime, uAberr, uHeat, uDither, uHurt, uPost, uFlash;

    float bayer(vec2 p){
      int x = int(mod(p.x, 4.0)); int y = int(mod(p.y, 4.0));
      int i = x + y * 4;
      float m[16];
      m[0]=0.0; m[1]=8.0; m[2]=2.0; m[3]=10.0;
      m[4]=12.0; m[5]=4.0; m[6]=14.0; m[7]=6.0;
      m[8]=3.0; m[9]=11.0; m[10]=1.0; m[11]=9.0;
      m[12]=15.0; m[13]=7.0; m[14]=13.0; m[15]=5.0;
      for(int k=0;k<16;k++){ if(k==i) return m[k]/16.0; }
      return 0.0;
    }

    void main(){
      vec2 uv = vUv;
      if(uHeat > 0.001){
        uv.x += sin(uv.y * 40.0 + uTime * 6.0) * 0.004 * uHeat;
        uv.y += cos(uv.x * 30.0 + uTime * 5.0) * 0.003 * uHeat;
      }
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);
      float ab = uAberr * 0.012 + r2 * 0.006 * uPost;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + d * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - d * ab).b;

      if(uPost > 0.5){
        vec3 glow = vec3(0.0);
        float px = 1.5 / uRes.x, py = 1.5 / uRes.y;
        glow += texture2D(tDiffuse, uv + vec2( px, 0.0)).rgb;
        glow += texture2D(tDiffuse, uv + vec2(-px, 0.0)).rgb;
        glow += texture2D(tDiffuse, uv + vec2(0.0,  py)).rgb;
        glow += texture2D(tDiffuse, uv + vec2(0.0, -py)).rgb;
        glow *= 0.25;
        float lum = dot(glow, vec3(0.3, 0.59, 0.11));
        col += glow * smoothstep(0.55, 1.0, lum) * 0.45;

        col = (col - 0.5) * 1.12 + 0.5;
        col *= vec3(1.06, 0.98, 0.94);

        vec2 px2 = floor(uv * uRes);
        float b = (bayer(px2) - 0.5) * uDither;
        float levels = 20.0;
        col = floor(col * levels + 0.5 + b) / levels;

        col *= 0.93 + 0.07 * sin(uv.y * uRes.y * 3.14159);
        col *= smoothstep(0.95, 0.35, length(d) * 1.25);
      }
      col = mix(col, vec3(0.8, 0.05, 0.03), uHurt * 0.55);
      col += vec3(1.0, 0.9, 0.7) * uFlash;
      gl_FragColor = vec4(col, 1.0);
    }`,
  depthTest: false, depthWrite: false
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

function applyResolution() {
  const h = CFG.resH;
  const w = Math.round(h * (innerWidth / innerHeight));
  renderer.setSize(w, h, false);
  canvas.style.width = '100%'; canvas.style.height = '100%';
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (rt) rt.dispose();
  rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
  postMat.uniforms.uRes.value.set(w, h);
}
addEventListener('resize', applyResolution);
applyResolution();

/* =====================================================================
   TEXTURAS PROCEDURALES
   ===================================================================== */
function px32(fn, size = 32) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, gg, b] = fn(x, y, size);
    const i = (y * size + x) * 4;
    img.data[i] = clamp(r, 0, 255); img.data[i + 1] = clamp(gg, 0, 255); img.data[i + 2] = clamp(b, 0, 255); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >> 13)) * 1274126177 | 0; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }
function noise2(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

const TEX = {
  brick: px32((x, y, s) => {
    const row = Math.floor(y / 8), off = (row % 2) * 8;
    const bx = (x + off) % 16, by = y % 8;
    const mortar = bx === 0 || by === 0;
    const n = noise2(x * 0.5, y * 0.5, 1) * 40 + hash2(x, y, 2) * 22;
    if (mortar) return [28 + n * 0.3, 18 + n * 0.2, 16 + n * 0.2];
    const tone = hash2(Math.floor((x + off) / 16), row, 5) * 30;
    return [92 + tone + n, 44 + tone * 0.5 + n * 0.5, 34 + tone * 0.4 + n * 0.4];
  }),
  floor: px32((x, y, s) => {
    const n = noise2(x * 0.35, y * 0.35, 3) * 50 + hash2(x, y, 4) * 20;
    const crack = Math.abs(noise2(x * 0.18 + 5, y * 0.18, 9) - 0.5) < 0.025 ? -45 : 0;
    const edge = (x % 16 === 0 || y % 16 === 0) ? -30 : 0;
    return [70 + n + crack + edge, 56 + n * 0.85 + crack + edge, 52 + n * 0.8 + crack + edge];
  }),
  metal: px32((x, y, s) => {
    const n = noise2(x * 0.4, y * 0.4, 6) * 45 + hash2(x, y, 7) * 14;
    const rivet = ((x % 8 === 2 || x % 8 === 6) && (y % 8 === 2 || y % 8 === 6)) ? 55 : 0;
    const panel = (x % 16 === 0 || y % 16 === 0) ? -35 : 0;
    const rust = noise2(x * 0.22, y * 0.22, 11) > 0.62 ? 1 : 0;
    return rust ? [120 + n * 0.5 + rivet + panel, 60 + n * 0.3 + panel, 30 + n * 0.2 + panel]
                : [82 + n + rivet + panel, 76 + n * 0.9 + rivet + panel, 74 + n * 0.85 + rivet + panel];
  }),
  rock: px32((x, y, s) => {
    const n = noise2(x * 0.3, y * 0.6, 12) * 55 + hash2(x, y, 13) * 18;
    const vein = Math.abs(noise2(x * 0.2, y * 0.2, 14) - 0.5) < 0.03 ? 70 : 0;
    return [38 + n * 0.7 + vein, 30 + n * 0.55 + vein * 0.4, 34 + n * 0.6];
  }),
  bone: px32((x, y, s) => {
    const n = noise2(x * 0.5, y * 0.5, 15) * 30 + hash2(x, y, 16) * 14;
    return [190 + n, 178 + n, 150 + n * 0.8];
  }),
  flesh: px32((x, y, s) => {
    const n = noise2(x * 0.45, y * 0.45, 17) * 55 + hash2(x, y, 18) * 20;
    const vein = noise2(x * 0.3, y * 0.3, 19) > 0.7 ? -40 : 0;
    return [150 + n + vein, 52 + n * 0.4 + vein * 0.5, 44 + n * 0.35 + vein * 0.4];
  }),
  armor: px32((x, y, s) => {
    const n = noise2(x * 0.4, y * 0.4, 20) * 30 + hash2(x, y, 21) * 10;
    const edge = (x % 16 === 0 || y % 16 === 0) ? 25 : 0;
    return [46 + n + edge, 48 + n + edge, 62 + n * 1.1 + edge];
  }),
  shell: px32((x, y, s) => {
    const n = noise2(x * 0.5, y * 0.5, 22) * 55 + hash2(x, y, 23) * 16;
    const rib = (y % 8 < 2) ? -35 : 0;
    return [130 + n + rib, 36 + n * 0.3 + rib * 0.5, 22 + n * 0.25];
  }),
  gun: px32((x, y, s) => {
    const n = noise2(x * 0.5, y * 0.5, 24) * 28 + hash2(x, y, 25) * 14;
    return [92 + n, 92 + n, 100 + n];
  })
};

const lavaUniforms = { uTime: { value: 0 } };
function makeLavaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: lavaUniforms,
    vertexShader: `varying vec2 vW; varying float vDist; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xz; vec4 mv = viewMatrix * w; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      precision mediump float;
      varying vec2 vW; varying float vDist;
      uniform float uTime;
      uniform vec3 fogColor; uniform float fogNear, fogFar;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vW * 0.18;
        float t = uTime * 0.25;
        float a = n(p * 2.0 + vec2(t, t * 0.6));
        float b = n(p * 4.0 - vec2(t * 0.7, t));
        float c = n(p * 8.0 + vec2(t * 1.3, -t));
        float f = a * 0.5 + b * 0.32 + c * 0.18;
        float crust = smoothstep(0.52, 0.66, f);
        vec3 magma = mix(vec3(1.0, 0.85, 0.15), vec3(1.0, 0.28, 0.02), smoothstep(0.2, 0.6, f));
        vec3 dark = vec3(0.18, 0.04, 0.02);
        vec3 col = mix(magma, dark, crust);
        col += vec3(1.0, 0.5, 0.1) * pow(max(0.0, sin(uTime * 2.0 + f * 12.0)), 6.0) * 0.18;
        col *= 1.0 + 0.15 * sin(uTime * 1.5);
        float fog = smoothstep(fogNear, fogFar, vDist);
        col = mix(col, fogColor, fog * 0.8);
        gl_FragColor = vec4(col, 1.0);
      }`,
    fog: false
  });
}
lavaUniforms.fogColor = { value: new THREE.Color(0x1a0606) };
lavaUniforms.fogNear = { value: 8 };
lavaUniforms.fogFar = { value: 70 };

function bakeShade(geo, base = 1) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const ny = nor.getY(i), nx = nor.getX(i), nz = nor.getZ(i);
    let s = 0.62 + ny * 0.3 + nx * 0.06 - nz * 0.04;
    s = clamp(s, 0.35, 1.05) * base;
    const y = pos.getY(i);
    s *= 0.88 + 0.12 * clamp(y / 6 + 0.5, 0, 1);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = s;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
function matV(tex, rx, ry, tint) {
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshBasicMaterial({ map: t, color: tint || 0xffffff, vertexColors: true });
}

/* =====================================================================
   MUNDO
   ===================================================================== */
const world = { boxes: [], meshes: [], group: new THREE.Group(), spawn: new THREE.Vector3(), lavaY: -6, half: 0 };
scene.add(world.group);

function addBox(x, y, z, w, h, d, tex, tint, solid = true, hookable = true) {
  const geo = bakeShade(new THREE.BoxGeometry(w, h, d));
  const m = new THREE.Mesh(geo, matV(tex, Math.max(1, w / 3), Math.max(1, Math.max(h, d) / 3), tint));
  m.position.set(x, y, z);
  world.group.add(m); world.meshes.push(m);
  if (solid) world.boxes.push({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2, mesh: m, hookable });
  return m;
}
function addDecor(m) { world.group.add(m); world.meshes.push(m); }
world.floorY = function (x, z) {
  let best = world.lavaY;
  for (const b of world.boxes) if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && b.maxY > best && b.maxY < 40) best = b.maxY;
  return best;
};
world.isBlocked = function (x, y, z, r, h) {
  for (const b of world.boxes) {
    if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ && y + h > b.minY && y < b.maxY) return true;
  }
  return false;
};

function clearWorld() {
  for (const m of world.meshes) {
    world.group.remove(m);
    if (m.geometry) m.geometry.dispose();
    if (m.material) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); }
  }
  world.meshes.length = 0; world.boxes.length = 0;
}

/* =====================================================================
   GENERACION PROCEDURAL
   ===================================================================== */
const CELL = 14;
let currentSeedStr = '';
let spawnPoints = [];
let lavaMesh = null;
let embersPts = null;
let biome = { fog: 0x1a0606, ember: 0xff7a20 };

const BIOMES = [
  { fog: 0x1a0606, ember: 0xff7a20, tint: 0xffffff },
  { fog: 0x14081c, ember: 0xc060ff, tint: 0xd8c8ff },
  { fog: 0x1c1206, ember: 0xffc030, tint: 0xffe6b0 },
  { fog: 0x061418, ember: 0x40e0d0, tint: 0xc4ffe8 }
];

function generateLevel(seedStr) {
  clearWorld();
  spawnPoints = [];
  currentSeedStr = seedStr;
  const R = rng(hashStr(seedStr));
  const N = CFG.size;
  const half = (N * CELL) / 2;
  world.half = half;

  biome = BIOMES[Math.floor(R() * BIOMES.length)];
  const tint = biome.tint;
  scene.background = new THREE.Color(biome.fog);
  scene.fog = new THREE.Fog(biome.fog, 10 / CFG.fog, 85 / CFG.fog);
  lavaUniforms.fogColor.value.setHex(biome.fog);
  lavaUniforms.fogNear.value = 10 / CFG.fog; lavaUniforms.fogFar.value = 85 / CFG.fog;

  const grid = [];
  for (let i = 0; i < N; i++) {
    grid[i] = [];
    for (let j = 0; j < N; j++) {
      const cx = i - N / 2 + 0.5, cz = j - N / 2 + 0.5;
      const centerDist = Math.hypot(cx, cz);
      let type = 'floor';
      const roll = R();
      if (centerDist > 1.8) {
        if (roll < 0.18) type = 'pit';
        else if (roll < 0.42) type = 'pillars';
        else if (roll < 0.58) type = 'stairs';
        else if (roll < 0.7) type = 'block';
      }
      grid[i][j] = type;
    }
  }

  const lavaGeo = new THREE.PlaneGeometry(N * CELL + 120, N * CELL + 120);
  lavaGeo.rotateX(-Math.PI / 2);
  lavaMesh = new THREE.Mesh(lavaGeo, makeLavaMaterial());
  lavaMesh.position.y = world.lavaY;
  addDecor(lavaMesh);

  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const type = grid[i][j];
    const x = (i - N / 2 + 0.5) * CELL, z = (j - N / 2 + 0.5) * CELL;

    if (type === 'pit') {
      const n = 2 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const px = x + (R() - 0.5) * (CELL - 4), pz = z + (R() - 0.5) * (CELL - 4);
        addBox(px, -0.5, pz, 3 + R() * 2, 1, 3 + R() * 2, TEX.metal, tint);
      }
      continue;
    }
    addBox(x, -0.5, z, CELL, 1, CELL, TEX.floor, tint);

    if (type === 'pillars') {
      const n = 3 + Math.floor(R() * 4);
      for (let k = 0; k < n; k++) {
        const px = x + (R() - 0.5) * (CELL - 3), pz = z + (R() - 0.5) * (CELL - 3);
        const h = 3 + R() * 7;
        const w = 1.6 + R() * 1.2;
        addBox(px, h / 2, pz, w, h, w, TEX.rock, tint);
        addBox(px, h + 0.15, pz, w + 0.5, 0.3, w + 0.5, TEX.brick, tint);
        if (R() < CFG.density) addBox(px + 2.2, h * 0.55, pz, 3, 0.5, 3, TEX.metal, tint);
      }
    } else if (type === 'stairs') {
      const steps = 5 + Math.floor(R() * 3);
      const dir = R() < 0.5 ? 1 : -1;
      for (let k = 0; k < steps; k++) {
        addBox(x - (CELL / 2 - 2) * dir + k * 1.9 * dir, 0.6 + k * 0.9, z, 2.2, 0.5, 4.5, TEX.metal, tint);
      }
      addBox(x + (CELL / 2 - 2) * dir, 0.6 + steps * 0.9, z, 4, 0.5, 5, TEX.metal, tint);
    } else if (type === 'block') {
      const h = 2 + R() * 3;
      addBox(x, h / 2, z, 5 + R() * 3, h, 5 + R() * 3, TEX.brick, tint);
    }

    if (type !== 'pit' && R() < CFG.density * 0.5) {
      const py = 5 + R() * 6;
      addBox(x + (R() - 0.5) * 6, py, z + (R() - 0.5) * 6, 3.5, 0.5, 3.5, TEX.metal, tint);
    }
    if (type !== 'block') {
      const jitterX = (R() - 0.5) * (type === 'pillars' ? 3 : 6);
      const jitterZ = (R() - 0.5) * (type === 'pillars' ? 3 : 6);
      spawnPoints.push(new THREE.Vector3(x + jitterX, 1.2, z + jitterZ));
    }
  }

  const wallH = 34, t = 2;
  addBox(0, wallH / 2 - 1, -half - t / 2, N * CELL + 4, wallH, t, TEX.brick, tint);
  addBox(0, wallH / 2 - 1,  half + t / 2, N * CELL + 4, wallH, t, TEX.brick, tint);
  addBox(-half - t / 2, wallH / 2 - 1, 0, t, wallH, N * CELL + 4, TEX.brick, tint);
  addBox( half + t / 2, wallH / 2 - 1, 0, t, wallH, N * CELL + 4, TEX.brick, tint);

  addBox(0, -0.5, 0, CELL * 2, 1, CELL * 2, TEX.floor, tint);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 5.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: biome.ember, transparent: true, opacity: 0.7 })
  );
  ring.position.set(0, 0.03, 0); addDecor(ring);
  world.spawn.set(0, 1.7, 0);
  if (spawnPoints.length < 8) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      spawnPoints.push(new THREE.Vector3(Math.cos(a) * half * 0.6, 1.2, Math.sin(a) * half * 0.6));
    }
  }

  for (let k = 0; k < N * 2; k++) {
    const px = (R() - 0.5) * (N * CELL - 6), pz = (R() - 0.5) * (N * CELL - 6);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), new THREE.MeshBasicMaterial({ map: TEX.rock.clone() }));
    base.position.set(px, 0.45, pz);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 5), new THREE.MeshBasicMaterial({ color: biome.ember }));
    flame.position.set(px, 1.5, pz);
    flame.userData.flicker = R() * 6;
    addDecor(base); addDecor(flame);
    flame.userData.isFlame = true;
  }

  buildEmbers(N * CELL, R);
}

function buildEmbers(size, R) {
  if (embersPts) { scene.remove(embersPts); embersPts.geometry.dispose(); embersPts.material.dispose(); embersPts = null; }
  const n = 350;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (R() - 0.5) * size; pos[i * 3 + 1] = R() * 30 - 5; pos[i * 3 + 2] = (R() - 0.5) * size;
    seed[i] = R() * 100;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.PointsMaterial({ color: biome.ember, size: 0.28, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, fog: true });
  embersPts = new THREE.Points(geo, mat);
  embersPts.userData.size = size;
  scene.add(embersPts);
}
function updateEmbers(dt, t) {
  if (!embersPts) return;
  embersPts.visible = CFG.embers;
  if (!CFG.embers) return;
  const pos = embersPts.geometry.attributes.position, sd = embersPts.geometry.attributes.seed;
  const size = embersPts.userData.size;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i) + dt * (1.4 + (sd.getX(i) % 1.5));
    pos.setX(i, pos.getX(i) + Math.sin(t * 0.7 + sd.getX(i)) * dt * 0.8);
    if (y > 28) { y = -5; pos.setX(i, (Math.random() - 0.5) * size); pos.setZ(i, (Math.random() - 0.5) * size); }
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
}
function animateDecor(t) {
  for (const m of world.meshes) if (m.userData && m.userData.isFlame) {
    const f = 1 + Math.sin(t * 9 + m.userData.flicker) * 0.18;
    m.scale.set(f, 1 + Math.sin(t * 12 + m.userData.flicker) * 0.25, f);
  }
}

/* =====================================================================
   JUGADOR
   ===================================================================== */
const P = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(),
  yaw: 0, pitch: 0, r: 0.45, h: 1.7,
  hp: 100, stamina: 3, maxStamina: 3,
  onGround: false, sliding: false,
  dashT: 0, dashDir: new THREE.Vector3(),
  coyote: 0, jumpBuf: 0,
  alive: true, iframes: 0, lastJumpTap: -9, bob: 0,
  lean: 0, speedFx: 0
};

const G = 34, WALK = 9, ACCEL = 60, AIR_ACCEL = 22, JUMP_V = 12.5;
const DASH_SPEED = 32, DASH_TIME = 0.18, DASH_COST = 1, SLIDE_SPEED = 16;
const EYE = 1.55, EYE_SLIDE = 0.8;

function resetPlayer() {
  P.pos.copy(world.spawn); P.vel.set(0, 0, 0);
  P.yaw = 0; P.pitch = 0; P.hp = 100; P.stamina = P.maxStamina;
  P.alive = true; P.sliding = false; P.dashT = 0; P.iframes = 0;
  hook.state = 0; hook.cd = 0;
}

function overlapBox(px, py, pz, r, h, b) {
  return px + r > b.minX && px - r < b.maxX && pz + r > b.minZ && pz - r < b.maxZ && py + h > b.minY && py < b.maxY;
}

function movePlayer(dt) {
  const h = P.sliding ? 0.9 : P.h;
  P.onGround = false;
  P.pos.x += P.vel.x * dt;
  for (const b of world.boxes) if (overlapBox(P.pos.x, P.pos.y - P.h, P.pos.z, P.r, h, b)) {
    if (P.vel.x > 0) P.pos.x = b.minX - P.r - 0.001; else P.pos.x = b.maxX + P.r + 0.001;
    P.vel.x = 0;
  }
  P.pos.z += P.vel.z * dt;
  for (const b of world.boxes) if (overlapBox(P.pos.x, P.pos.y - P.h, P.pos.z, P.r, h, b)) {
    if (P.vel.z > 0) P.pos.z = b.minZ - P.r - 0.001; else P.pos.z = b.maxZ + P.r + 0.001;
    P.vel.z = 0;
  }
  P.pos.y += P.vel.y * dt;
  for (const b of world.boxes) if (overlapBox(P.pos.x, P.pos.y - P.h, P.pos.z, P.r, h, b)) {
    if (P.vel.y <= 0) { P.pos.y = b.maxY + P.h + 0.001; P.onGround = true; }
    else { P.pos.y = b.minY - 0.15 - 0.001; }
    P.vel.y = 0;
  }
}

/* =====================================================================
   GANCHO
   ===================================================================== */
const hook = {
  state: 0, anchor: new THREE.Vector3(), pos: new THREE.Vector3(), dir: new THREE.Vector3(),
  len: 0, cd: 0, target: null, held: false, travel: 0, tapPending: false
};
const HOOK_SPEED = 130, HOOK_CD = 0.9;
const HOOK_MAX_V = 38;

const ropeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), new THREE.MeshBasicMaterial({ color: 0x4fd8ff }));
ropeMesh.visible = false; ropeMesh.frustumCulled = false; scene.add(ropeMesh);
const hookHead = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 4).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd8f6ff }));
hookHead.visible = false; hookHead.frustumCulled = false; scene.add(hookHead);

function hookOrigin() {
  return new THREE.Vector3(0.35, -0.3, -0.55).applyMatrix4(camera.matrixWorld);
}
function hookFire() {
  if (hook.state !== 0 || (hook.cd > 0 && !CFG.hNoCd)) return;
  hook.state = 1; hook.travel = 0; sfx('hookFire');
  hook.pos.copy(camera.position);
  hook.dir.set(0, 0, -1).applyQuaternion(camera.quaternion);
  haptic(12);
}
function hookRelease(boost = true) {
  if (hook.state === 2 || hook.state === 3) {
    if (boost) {
      const sp = P.vel.length();
      if (sp > 4) P.vel.multiplyScalar(1.08);
      P.vel.y += 3.5;
      const cap = HOOK_MAX_V * 1.15 * CFG.hPull;
      if (P.vel.length() > cap) P.vel.multiplyScalar(cap / P.vel.length());
    }
  }
  hook.state = 0; hook.target = null; hook.cd = HOOK_CD;
  ropeMesh.visible = hookHead.visible = false;
}
function updateHook(dt) {
  if (hook.cd > 0) hook.cd -= dt;

  const o = camera.position, d = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const wt = rayWorld(o, d, CFG.hRange, true);
  let et = Infinity;
  for (const e of enemies) { const t = rayEnemy(o, d, e); if (t < et) et = t; }
  const can = hook.state === 0 && (wt < CFG.hRange || et < CFG.hRange) && (hook.cd <= 0 || CFG.hNoCd);
  $('cross').classList.toggle('hook', can);
  $('hookHint').style.opacity = can ? 1 : 0;

  if (hook.state === 0) return;

  if (hook.state === 1) {
    const step = HOOK_SPEED * dt;
    const wallT = rayWorld(hook.pos, hook.dir, step, true);
    let enemyT = Infinity, enemyHit = null;
    for (const e of enemies) { const t = rayEnemy(hook.pos, hook.dir, e); if (t < enemyT && t <= step) { enemyT = t; enemyHit = e; } }
    if (enemyHit && enemyT < wallT) {
      hook.pos.addScaledVector(hook.dir, enemyT);
      hook.target = enemyHit; hook.state = 3; hook.anchor.copy(hook.pos);
      haptic(20);
    } else if (wallT <= step) {
      hook.pos.addScaledVector(hook.dir, wallT);
      hook.anchor.copy(hook.pos); hook.state = 2; sfx('hookHit');
      hook.len = P.pos.distanceTo(hook.anchor);
      burst(hook.pos, 0x4fd8ff, 6, 3);
      impactRing(hook.pos, 0x4fd8ff, 1.4); // NUEVO: anillo de impacto al clavar el gancho
      haptic(25);
    } else {
      hook.pos.addScaledVector(hook.dir, step); hook.travel += step;
      if (hook.travel > CFG.hRange) hookRelease(false);
    }
  } else if (hook.state === 2) {
    const toA = new THREE.Vector3().subVectors(hook.anchor, P.pos);
    const dist = toA.length();
    toA.normalize();
    if (hook.held) {
      hook.len = Math.max(2.5, hook.len - 34 * CFG.hPull * dt);
      P.vel.addScaledVector(toA, 60 * CFG.hPull * dt);
    }
    if (dist > hook.len) {
      const stretch = dist - hook.len;
      P.vel.addScaledVector(toA, stretch * 18 * dt * 60 / 60);
      const radial = P.vel.dot(toA);
      if (radial < 0) P.vel.addScaledVector(toA, -radial * Math.min(1, dt * 14));
    }
    P.vel.multiplyScalar(1 - 0.05 * dt);
    const vmax = HOOK_MAX_V * CFG.hPull;
    const vl = P.vel.length();
    if (vl > vmax) P.vel.multiplyScalar(vmax / vl);
    hook.pos.copy(hook.anchor);
    if (dist < 2.6 && hook.held) hookRelease(true);
    if (P.onGround && !hook.held) hookRelease(false);
  } else if (hook.state === 3) {
    const e = hook.target;
    if (!e || enemies.indexOf(e) < 0) { hookRelease(false); }
    else {
      hook.anchor.copy(e.mesh.position);
      hook.pos.copy(hook.anchor);
      const toE = new THREE.Vector3().subVectors(hook.anchor, P.pos);
      const dist = toE.length(); toE.normalize();
      if (e.d.heavy || !CFG.hPullEnemy) {
        P.vel.addScaledVector(toE, 90 * CFG.hPull * dt);
        const vm3 = HOOK_MAX_V * CFG.hPull, vl3 = P.vel.length();
        if (vl3 > vm3) P.vel.multiplyScalar(vm3 / vl3);
        if (dist < 3) hookRelease(true);
      } else {
        e.vel.x = -toE.x * 30; e.vel.z = -toE.z * 30; e.vel.y = Math.max(e.vel.y, 2);
        if (dist < 3.2) { hookRelease(false); damageEnemy(e, 30); }
      }
      if (!hook.held && dist < 6) hookRelease(false);
    }
  }

  if (hook.state !== 0) {
    const a = hookOrigin(), b = hook.pos;
    const len = a.distanceTo(b);
    ropeMesh.visible = hookHead.visible = true;
    ropeMesh.position.copy(a).lerp(b, 0.5);
    ropeMesh.scale.set(1, 1, len);
    ropeMesh.lookAt(b);
    hookHead.position.copy(b);
    hookHead.lookAt(a);
    hookHead.rotateY(Math.PI);
  }
}

/* =====================================================================
   ARMAS
   ===================================================================== */
const WEAPONS = [
  { id: 'pistol',  name: 'REVOLVER',  dmg: 25, rate: 0.28, ammo: Infinity, spread: 0.004, pellets: 1, unlocked: true,  color: 0xffc933, range: 90 },
  { id: 'shotgun', name: 'ESCOPETA',  dmg: 9,  rate: 0.75, ammo: 40,       spread: 0.07,  pellets: 8, unlocked: true,  color: 0xff6a1a, range: 30 },
  { id: 'rail',    name: 'RIEL',      dmg: 140, rate: 1.4, ammo: 12,       spread: 0,     pellets: 1, unlocked: false, color: 0x60d0ff, range: 200, pierce: true },
  { id: 'nail',    name: 'CLAVOS',    dmg: 6,  rate: 0.07, ammo: 250,      spread: 0.03,  pellets: 1, unlocked: false, color: 0xece4d2, range: 70 }
];
let wIdx = 0, fireCd = 0, ammoState = {};
function resetAmmo() { for (const w of WEAPONS) ammoState[w.id] = w.ammo; }
resetAmmo();

const gunMats = {
  steel: new THREE.MeshBasicMaterial({ map: TEX.gun, color: 0xffffff, vertexColors: true }),
  dark: new THREE.MeshBasicMaterial({ color: 0x25252c, vertexColors: true }),
  wood: new THREE.MeshBasicMaterial({ color: 0x6a3f24, vertexColors: true }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffc933 })
};
function gbox(w, h, d, m, x, y, z) {
  const geo = bakeShade(new THREE.BoxGeometry(w, h, d), 1.1);
  const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); return mesh;
}
const gunGroup = new THREE.Group();
const gunModels = {};
(function buildGuns() {
  let g = new THREE.Group();
  g.add(gbox(0.09, 0.13, 0.55, gunMats.steel, 0, 0, -0.1));
  g.add(gbox(0.13, 0.13, 0.16, gunMats.dark, 0, -0.01, 0.02));
  g.add(gbox(0.08, 0.2, 0.1, gunMats.wood, 0, -0.15, 0.2));
  g.add(gbox(0.03, 0.03, 0.1, gunMats.glow, 0, 0.085, -0.32));
  gunModels.pistol = g;
  g = new THREE.Group();
  g.add(gbox(0.08, 0.08, 0.8, gunMats.steel, -0.04, 0.02, -0.2));
  g.add(gbox(0.08, 0.08, 0.8, gunMats.steel, 0.04, 0.02, -0.2));
  g.add(gbox(0.16, 0.12, 0.3, gunMats.dark, 0, -0.03, 0.15));
  g.add(gbox(0.1, 0.16, 0.34, gunMats.wood, 0, -0.06, 0.4));
  g.add(gbox(0.14, 0.08, 0.2, gunMats.wood, 0, -0.06, -0.1));
  gunModels.shotgun = g;
  g = new THREE.Group();
  g.add(gbox(0.1, 0.1, 1.0, gunMats.steel, 0, 0, -0.25));
  g.add(gbox(0.03, 0.14, 0.9, gunMats.glow, -0.065, 0, -0.25));
  g.add(gbox(0.03, 0.14, 0.9, gunMats.glow, 0.065, 0, -0.25));
  g.add(gbox(0.16, 0.16, 0.3, gunMats.dark, 0, -0.02, 0.3));
  g.add(gbox(0.07, 0.18, 0.09, gunMats.dark, 0, -0.16, 0.25));
  gunModels.rail = g;
  g = new THREE.Group();
  g.add(gbox(0.14, 0.14, 0.5, gunMats.dark, 0, 0, -0.05));
  g.add(gbox(0.04, 0.04, 0.4, gunMats.steel, 0, 0.03, -0.42));
  g.add(gbox(0.1, 0.2, 0.2, gunMats.steel, 0, -0.16, 0.05));
  g.add(gbox(0.08, 0.12, 0.1, gunMats.wood, 0, -0.22, 0.2));
  gunModels.nail = g;
  gunGroup.position.set(0.32, -0.3, -0.62);
  camera.add(gunGroup);
})();
let gunKick = 0, gunTipColor = 0xffc933;
let gunSway = { x: 0, y: 0 };

/* NUEVO: destello del canon. Es una cajita brillante pegada al arma que
   aparece un instante cuando disparas y se desvanece rapido. */
const muzzleFlash = new THREE.Mesh(
  new THREE.BoxGeometry(0.22, 0.22, 0.04),
  new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, depthTest: false })
);
muzzleFlash.position.set(0, 0.02, -0.75);
muzzleFlash.renderOrder = 999;
gunGroup.add(muzzleFlash);
let muzzleT = 0;
function triggerMuzzle(color, size) {
  muzzleFlash.material.color.setHex(color);
  muzzleFlash.scale.set(size, size, 1);
  muzzleFlash.rotation.z = Math.random() * Math.PI;
  muzzleT = 1;
}
function updateMuzzle(dt) {
  if (muzzleT <= 0) { muzzleFlash.material.opacity = 0; return; }
  muzzleT = Math.max(0, muzzleT - dt * 16);
  muzzleFlash.material.opacity = muzzleT;
}

function setWeapon(i) {
  const cur = WEAPONS[i];
  if (!cur || !cur.unlocked) return;
  wIdx = i;
  gunGroup.clear();
  gunGroup.add(gunModels[cur.id]);
  gunGroup.add(muzzleFlash);       // NUEVO: volvemos a pegar el destello (gunGroup.clear() lo quitaba)
  muzzleFlash.position.z = cur.id === 'rail' ? -0.85 : (cur.id === 'shotgun' ? -0.65 : -0.6);
  gunMats.glow.color.setHex(cur.color);
  updateWeaponHUD();
  gunKick = 0.4;
}
function nextWeapon() {
  for (let k = 1; k <= WEAPONS.length; k++) {
    const i = (wIdx + k) % WEAPONS.length;
    if (WEAPONS[i].unlocked) { setWeapon(i); return; }
  }
}
function updateWeaponHUD() {
  const w = WEAPONS[wIdx];
  const a = CFG.infAmmo || ammoState[w.id] === Infinity ? '\u221e' : ammoState[w.id];
  $('weapon').innerHTML = `${w.name}<br>${a}`;
}

/* =====================================================================
   ENEMIGOS
   ===================================================================== */
const ETYPES = {
  husk:    { hp: 40,  speed: 6.5,  size: [0.9, 1.8, 0.9], dmg: 8,  melee: true,  score: 100, hit: [0.9, 1.8, 0.9] },
  shooter: { hp: 30,  speed: 4.0,  size: [0.8, 1.7, 0.8], dmg: 6,  melee: false, score: 150, fireRate: 1.35, hit: [0.8, 1.7, 0.8] },
  charger: { hp: 55,  speed: 4.8,  size: [1.1, 1.3, 1.5], dmg: 18, melee: true,  score: 200, hit: [1.1, 1.3, 1.5] },
  brute:   { hp: 220, speed: 3.6,  size: [1.8, 3.0, 1.8], dmg: 25, melee: true,  score: 500, heavy: true, hit: [1.8, 3.0, 1.8] },
  imp:     { hp: 24,  speed: 8.2,  size: [0.7, 1.4, 0.7], dmg: 10, melee: true,  score: 180, hit: [0.7, 1.4, 0.7], leaper: true },
  bomber:  { hp: 35,  speed: 5.4,  size: [1.0, 1.0, 1.0], dmg: 40, melee: false, score: 220, hit: [1.0, 1.0, 1.0], explosive: true },
  sniper:  { hp: 30,  speed: 0,    size: [0.7, 1.7, 0.7], dmg: 22, melee: false, score: 250, hit: [0.7, 1.7, 0.7], fireRate: 2.8, sniper: true },
  warden:  { hp: 450, speed: 2.9,  size: [2.4, 4.2, 2.4], dmg: 30, melee: true,  score: 2500, heavy: true, hit: [2.4, 4.2, 2.4], boss: true }
};
const enemies = [];
const projectiles = [];
const particles = [];
const MAX_PARTICLES = 260;
const MAX_ENEMIES_ONSCREEN = 40;

function eb(w, h, d, tex, x, y, z, tint) {
  const geo = bakeShade(new THREE.BoxGeometry(w, h, d), 1.15);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: tint || 0xffffff, vertexColors: true }));
  m.position.set(x, y, z); return m;
}
function limb(w, h, d, tex, px, py, pz, tint) {
  const g = new THREE.Group(); g.position.set(px, py, pz);
  g.add(eb(w, h, d, tex, 0, -h / 2, 0, tint)); return g;
}

function buildHusk() {
  const g = new THREE.Group(); const parts = {};
  parts.legL = limb(0.28, 0.85, 0.28, TEX.flesh, -0.2, 0.85, 0);
  parts.legR = limb(0.28, 0.85, 0.28, TEX.flesh, 0.2, 0.85, 0);
  const torso = eb(0.7, 0.75, 0.4, TEX.flesh, 0, 1.25, 0);
  const ribs = eb(0.6, 0.12, 0.05, TEX.bone, 0, 1.3, 0.22); const ribs2 = eb(0.6, 0.12, 0.05, TEX.bone, 0, 1.12, 0.22);
  parts.head = new THREE.Group(); parts.head.position.set(0, 1.75, 0);
  parts.head.add(eb(0.4, 0.4, 0.4, TEX.bone, 0, 0.05, 0));
  const eye1 = eb(0.11, 0.09, 0.06, TEX.bone, -0.13, 0.09, 0.21); eye1.material = new THREE.MeshBasicMaterial({ color: 0xffe000 });
  const eye2 = eb(0.11, 0.09, 0.06, TEX.bone, 0.13, 0.09, 0.21); eye2.material = new THREE.MeshBasicMaterial({ color: 0xffe000 });
  parts.head.add(eye1, eye2);
  parts.head.add(eb(0.3, 0.1, 0.06, TEX.bone, 0, -0.08, 0.21));
  parts.armL = limb(0.22, 0.75, 0.22, TEX.flesh, -0.5, 1.6, 0);
  parts.armR = limb(0.22, 0.75, 0.22, TEX.flesh, 0.5, 1.6, 0);
  parts.armL.add(eb(0.16, 0.22, 0.3, TEX.bone, 0, -0.85, 0.06)); parts.armR.add(eb(0.16, 0.22, 0.3, TEX.bone, 0, -0.85, 0.06));
  g.add(parts.legL, parts.legR, torso, ribs, ribs2, parts.head, parts.armL, parts.armR);
  return { g, parts, base: 0 };
}
function buildShooter() {
  const g = new THREE.Group(); const parts = {};
  parts.legL = limb(0.26, 0.8, 0.26, TEX.armor, -0.18, 0.8, 0);
  parts.legR = limb(0.26, 0.8, 0.26, TEX.armor, 0.18, 0.8, 0);
  g.add(eb(0.62, 0.7, 0.36, TEX.armor, 0, 1.2, 0));
  g.add(eb(0.7, 0.16, 0.44, TEX.armor, 0, 1.55, 0));
  parts.head = new THREE.Group(); parts.head.position.set(0, 1.7, 0);
  parts.head.add(eb(0.36, 0.38, 0.36, TEX.armor, 0, 0.05, 0));
  const visor = eb(0.3, 0.07, 0.06, TEX.bone, 0, 0.08, 0.19); visor.material = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  parts.head.add(visor);
  parts.armL = limb(0.2, 0.7, 0.2, TEX.armor, -0.44, 1.5, 0);
  parts.armR = limb(0.2, 0.7, 0.2, TEX.armor, 0.44, 1.5, 0);
  const cannon = eb(0.16, 0.16, 0.5, TEX.gun, 0, -0.72, 0.2); parts.armR.add(cannon);
  const tip = eb(0.1, 0.1, 0.08, TEX.gun, 0, -0.72, 0.48); tip.material = new THREE.MeshBasicMaterial({ color: 0xff3020 }); parts.armR.add(tip);
  parts.armR.rotation.x = -1.2;
  g.add(parts.legL, parts.legR, parts.head, parts.armL, parts.armR);
  return { g, parts, base: 0 };
}
function buildCharger() {
  const g = new THREE.Group(); const parts = {};
  g.add(eb(1.0, 0.7, 1.4, TEX.shell, 0, 0.75, 0));
  g.add(eb(0.85, 0.22, 1.1, TEX.shell, 0, 1.18, -0.05));
  parts.head = new THREE.Group(); parts.head.position.set(0, 0.8, 0.8);
  parts.head.add(eb(0.6, 0.5, 0.45, TEX.shell, 0, 0, 0));
  const hL = eb(0.12, 0.12, 0.7, TEX.bone, -0.25, 0.1, 0.4); const hR = eb(0.12, 0.12, 0.7, TEX.bone, 0.25, 0.1, 0.4);
  hL.rotation.y = 0.25; hR.rotation.y = -0.25;
  const eL = eb(0.1, 0.08, 0.05, TEX.bone, -0.15, 0.08, 0.23); eL.material = new THREE.MeshBasicMaterial({ color: 0xffe000 });
  const eR = eb(0.1, 0.08, 0.05, TEX.bone, 0.15, 0.08, 0.23); eR.material = new THREE.MeshBasicMaterial({ color: 0xffe000 });
  parts.head.add(hL, hR, eL, eR);
  parts.legL = limb(0.16, 0.6, 0.16, TEX.bone, -0.45, 0.6, 0.3); parts.legR = limb(0.16, 0.6, 0.16, TEX.bone, 0.45, 0.6, 0.3);
  parts.legL2 = limb(0.16, 0.6, 0.16, TEX.bone, -0.45, 0.6, -0.4); parts.legR2 = limb(0.16, 0.6, 0.16, TEX.bone, 0.45, 0.6, -0.4);
  g.add(parts.head, parts.legL, parts.legR, parts.legL2, parts.legR2);
  return { g, parts, base: 0 };
}
function buildBrute() {
  const g = new THREE.Group(); const parts = {};
  parts.legL = limb(0.55, 1.2, 0.55, TEX.rock, -0.42, 1.2, 0);
  parts.legR = limb(0.55, 1.2, 0.55, TEX.rock, 0.42, 1.2, 0);
  g.add(eb(1.5, 1.1, 0.8, TEX.flesh, 0, 1.85, 0));
  g.add(eb(1.3, 0.3, 0.7, TEX.rock, 0, 2.3, 0));
  const chest = eb(0.9, 0.5, 0.1, TEX.bone, 0, 1.95, 0.42); g.add(chest);
  parts.head = new THREE.Group(); parts.head.position.set(0, 2.65, 0.05);
  parts.head.add(eb(0.6, 0.55, 0.55, TEX.rock, 0, 0.05, 0));
  const e1 = eb(0.16, 0.12, 0.06, TEX.bone, -0.15, 0.1, 0.29); e1.material = new THREE.MeshBasicMaterial({ color: 0xff5a00 });
  const e2 = eb(0.16, 0.12, 0.06, TEX.bone, 0.15, 0.1, 0.29); e2.material = new THREE.MeshBasicMaterial({ color: 0xff5a00 });
  parts.head.add(e1, e2);
  parts.head.add(eb(0.1, 0.35, 0.1, TEX.bone, -0.25, 0.42, 0)); parts.head.add(eb(0.1, 0.35, 0.1, TEX.bone, 0.25, 0.42, 0));
  parts.armL = limb(0.5, 1.3, 0.5, TEX.flesh, -1.0, 2.35, 0);
  parts.armR = limb(0.5, 1.3, 0.5, TEX.flesh, 1.0, 2.35, 0);
  parts.armL.add(eb(0.7, 0.55, 0.7, TEX.rock, 0, -1.45, 0)); parts.armR.add(eb(0.7, 0.55, 0.7, TEX.rock, 0, -1.45, 0));
  g.add(parts.legL, parts.legR, parts.head, parts.armL, parts.armR);
  return { g, parts, base: 0 };
}
function buildImp() {
  const g = new THREE.Group(); const parts = {};
  parts.legL = limb(0.2, 0.6, 0.2, TEX.armor, -0.15, 0.6, 0);
  parts.legR = limb(0.2, 0.6, 0.2, TEX.armor, 0.15, 0.6, 0);
  g.add(eb(0.5, 0.55, 0.32, TEX.flesh, 0, 0.9, 0));
  parts.head = new THREE.Group(); parts.head.position.set(0, 1.3, 0);
  parts.head.add(eb(0.34, 0.34, 0.34, TEX.flesh, 0, 0.04, 0));
  const c1 = eb(0.06, 0.24, 0.06, TEX.bone, -0.12, 0.28, 0), c2 = eb(0.06, 0.24, 0.06, TEX.bone, 0.12, 0.28, 0);
  const e1 = eb(0.09, 0.07, 0.05, TEX.bone, -0.09, 0.08, 0.18), e2 = eb(0.09, 0.07, 0.05, TEX.bone, 0.09, 0.08, 0.18);
  e1.material = new THREE.MeshBasicMaterial({ color: 0x40ff60 }); e2.material = new THREE.MeshBasicMaterial({ color: 0x40ff60 });
  parts.head.add(c1, c2, e1, e2);
  parts.armL = limb(0.14, 0.7, 0.14, TEX.flesh, -0.34, 1.12, 0); parts.armR = limb(0.14, 0.7, 0.14, TEX.flesh, 0.34, 1.12, 0);
  parts.armL.add(eb(0.1, 0.22, 0.1, TEX.bone, 0, -0.75, 0.04)); parts.armR.add(eb(0.1, 0.22, 0.1, TEX.bone, 0, -0.75, 0.04));
  g.add(parts.legL, parts.legR, parts.head, parts.armL, parts.armR);
  return { g, parts, base: 0 };
}
function buildBomber() {
  const g = new THREE.Group(); const parts = {};
  parts.core = eb(0.85, 0.85, 0.85, TEX.shell, 0, 0.6, 0);
  const glow = eb(0.5, 0.5, 0.5, TEX.bone, 0, 0.6, 0); glow.material = new THREE.MeshBasicMaterial({ color: 0xff6a00 }); parts.glow = glow;
  parts.legL = limb(0.12, 0.35, 0.12, TEX.bone, -0.25, 0.25, 0.1); parts.legR = limb(0.12, 0.35, 0.12, TEX.bone, 0.25, 0.25, 0.1);
  parts.head = new THREE.Group(); parts.head.position.set(0, 0.95, 0.2);
  const e1 = eb(0.12, 0.1, 0.05, TEX.bone, -0.1, 0, 0.3), e2 = eb(0.12, 0.1, 0.05, TEX.bone, 0.1, 0, 0.3);
  e1.material = new THREE.MeshBasicMaterial({ color: 0xffe000 }); e2.material = new THREE.MeshBasicMaterial({ color: 0xffe000 });
  parts.head.add(e1, e2);
  g.add(parts.core, glow, parts.legL, parts.legR, parts.head);
  return { g, parts, base: 0 };
}
function buildSniper() {
  const g = new THREE.Group(); const parts = {};
  g.add(eb(0.5, 0.8, 0.3, TEX.armor, 0, 0.9, 0));
  g.add(eb(0.7, 0.14, 0.4, TEX.rock, 0, 1.28, 0));
  parts.legL = limb(0.2, 0.7, 0.2, TEX.armor, -0.14, 0.6, 0); parts.legR = limb(0.2, 0.7, 0.2, TEX.armor, 0.14, 0.6, 0);
  parts.head = new THREE.Group(); parts.head.position.set(0, 1.5, 0);
  parts.head.add(eb(0.32, 0.32, 0.32, TEX.armor, 0, 0.05, 0));
  const eye = eb(0.22, 0.06, 0.05, TEX.bone, 0, 0.07, 0.17); eye.material = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  parts.head.add(eye);
  parts.armL = limb(0.14, 0.6, 0.14, TEX.armor, -0.34, 1.25, 0); parts.armR = limb(0.14, 0.6, 0.14, TEX.armor, 0.34, 1.25, 0);
  const rifle = eb(0.08, 0.08, 1.3, TEX.gun, 0, -0.5, 0.5); parts.armR.add(rifle);
  parts.armL.rotation.x = -1.1; parts.armR.rotation.x = -1.35;
  g.add(parts.legL, parts.legR, parts.head, parts.armL, parts.armR);
  return { g, parts, base: 0 };
}
function buildWarden() {
  const g = new THREE.Group(); const parts = {};
  parts.legL = limb(0.9, 1.9, 0.9, TEX.rock, -0.75, 1.9, 0); parts.legR = limb(0.9, 1.9, 0.9, TEX.rock, 0.75, 1.9, 0);
  g.add(eb(2.4, 1.7, 1.3, TEX.flesh, 0, 2.9, 0));
  g.add(eb(2.1, 0.5, 1.2, TEX.rock, 0, 3.65, 0));
  const core = eb(1.0, 0.9, 0.15, TEX.bone, 0, 2.95, 0.7); core.material = new THREE.MeshBasicMaterial({ color: 0xff3a10 }); parts.core = core; g.add(core);
  parts.head = new THREE.Group(); parts.head.position.set(0, 4.15, 0.1);
  parts.head.add(eb(0.95, 0.85, 0.85, TEX.rock, 0, 0.1, 0));
  for (const x of [-0.35, 0.35]) { const h = eb(0.16, 0.7, 0.16, TEX.bone, x, 0.75, 0); h.rotation.z = x > 0 ? -0.25 : 0.25; parts.head.add(h); }
  const e1 = eb(0.28, 0.16, 0.06, TEX.bone, -0.25, 0.15, 0.44), e2 = eb(0.28, 0.16, 0.06, TEX.bone, 0.25, 0.15, 0.44);
  e1.material = new THREE.MeshBasicMaterial({ color: 0xff5a00 }); e2.material = new THREE.MeshBasicMaterial({ color: 0xff5a00 });
  parts.head.add(e1, e2);
  parts.armL = limb(0.8, 2.1, 0.8, TEX.flesh, -1.75, 3.6, 0); parts.armR = limb(0.8, 2.1, 0.8, TEX.flesh, 1.75, 3.6, 0);
  parts.armL.add(eb(1.1, 0.9, 1.1, TEX.rock, 0, -2.3, 0)); parts.armR.add(eb(1.1, 0.9, 1.1, TEX.rock, 0, -2.3, 0));
  g.add(parts.legL, parts.legR, parts.head, parts.armL, parts.armR);
  return { g, parts, base: 0 };
}
const BUILDERS = { husk: buildHusk, shooter: buildShooter, charger: buildCharger, brute: buildBrute, imp: buildImp, bomber: buildBomber, sniper: buildSniper, warden: buildWarden };

function spawnEnemy(type, pos) {
  const d = ETYPES[type];
  if (!d) return null;
  const built = BUILDERS[type]();
  const root = new THREE.Group();
  root.add(built.g);
  root.position.copy(pos);
  // Si nos dan una altura valida (pickSpawnPoint ya la calcula sobre el suelo real) la respetamos.
  // ANTES se forzaba siempre a la altura del suelo base, y los enemigos nacian dentro de plataformas.
  if (!(pos.y > d.size[1] / 2)) root.position.y = d.size[1] / 2 + 0.05;
  built.g.position.y = -d.size[1] / 2;
  scene.add(root);
  const e = {
    type, d, mesh: root, model: built, hp: d.hp, vel: new THREE.Vector3(), cd: 0.5 + Math.random(),
    state: 0, st: 0, flash: 0, grounded: false, walk: Math.random() * 6, shootAnim: 0,
    spawnT: 0.35, scaleIn: 0
  };
  enemies.push(e);
  // NUEVO: anillo y humo al aparecer, para que se note de donde salen
  impactRing(new THREE.Vector3(pos.x, world.floorY(pos.x, pos.z) + 0.1, pos.z), 0xff5a20, 1.2);
  burst(new THREE.Vector3(pos.x, root.position.y, pos.z), 0x3a1a10, 6, 3);
  return e;
}

function disposeGroup(g) {
  g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
}

function killEnemy(e) {
  const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1);
  const center = e.mesh.position.clone();
  e.model.g.traverse(o => {
    if (o.isMesh && particles.length < MAX_PARTICLES) {
      const wp = new THREE.Vector3(); o.getWorldPosition(wp);
      const frag = new THREE.Mesh(o.geometry.clone(), o.material.clone());
      frag.scale.setScalar(0.5);
      frag.position.copy(wp); frag.quaternion.copy(o.getWorldQuaternion(new THREE.Quaternion()));
      scene.add(frag);
      const dir = wp.clone().sub(center).normalize();
      particles.push({ mesh: frag, vel: dir.multiplyScalar(6 + Math.random() * 5).add(new THREE.Vector3(0, 4 + Math.random() * 4, 0)), spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8), life: 1.1, frag: true });
    }
  });
  scene.remove(e.mesh); disposeGroup(e.mesh);
  burst(center, 0xd40f0f, 22, 8); burst(center, 0xff6a1a, 8, 5);
  // NUEVO: efectos de muerte extra (anillo de impacto + chispas brillantes + destello de pantalla)
  impactRing(center, e.d.heavy ? 0xff6a1a : 0xffc933, e.d.heavy ? 3.2 : 1.8);
  sparks(center, e.d.heavy ? 18 : 10, 0xffe08a);
  screenPunch(e.d.heavy ? 0.55 : 0.22);
  S.kills++; S.style = Math.min(S.style + 1, 12); S.styleT = 4;
  S.score += Math.round(e.d.score * S.mult * fireMult());
  const now = S.time;
  addStyle('BAJA', 22);
  if (!P.onGround && !hook.state) { addStyle('AEREO', 30); S.airKills++; }
  if (hook.state === 2 || hook.state === 3) addStyle('EN EL GANCHO', 45);
  if (P.dashT > 0 || P.sliding) addStyle(P.sliding ? 'DESLIZANDO' : 'DASH', 25);
  if (now - S.lastKillT < 1.6) { S.chain++; if (S.chain >= 2) addStyle('COMBO x' + (S.chain + 1), 15 * S.chain); } else S.chain = 0;
  S.lastKillT = now;
  if (e.d.boss) { addStyle('JEFE', 200); }
  if (e.exploded) addStyle('EXPLOSIVO', 40);
  fireOnKill(e);
  P.hp = Math.min(100, P.hp + (e.d.heavy ? 14 : 6));
  P.shake = Math.max(P.shake || 0, e.d.heavy ? 0.6 : 0.25);
  hitStop = e.d.heavy ? 0.12 : 0.035;
  sfx(e.d.heavy ? 'bigKill' : 'kill');
  maybeDrop(center, e);
  if (e.type === 'bomber') { e.exploded = true; explode(center, 6, 30, e); }
  if (e.d.boss) {
    // ARREGLADO: en oleadas con 2+ jefes, matar uno no debe apagar la barra ni la musica de jefe si queda otro vivo.
    const otherBoss = enemies.some(o => o !== e && o.d.boss);
    if (!otherBoss) { bossActive = false; $('bossBar').classList.remove('on'); }
    flashMsg(otherBoss ? '\u00a1UN JEFE MENOS!' : '\u00a1JEFE DERROTADO!');
  }
  haptic(25);
  killPopup(center, e.d.score);
}

function damageEnemy(e, dmg) {
  e.hp -= dmg * CFG.weaponDmg;
  e.flash = 0.09;
  burst(e.mesh.position, 0xd40f0f, 3, 3);
  sparks(e.mesh.position, 3, 0xffffff);   // NUEVO: chispas blancas al recibir un golpe
  sfx('hit');
  const hm = $('hitmark'); hm.style.opacity = 1; setTimeout(() => hm.style.opacity = 0, 90);
  const cr = $('cross'); cr.classList.add('hit'); setTimeout(() => cr.classList.remove('hit'), 90);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemyQuiet(e) {
  const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1);
  scene.remove(e.mesh); disposeGroup(e.mesh);
}

function rayBox(o, d, b) {
  let tmin = 0, tmax = Infinity;
  const O = [o.x, o.y, o.z], D = [d.x, d.y, d.z], mn = [b.minX, b.minY, b.minZ], mx = [b.maxX, b.maxY, b.maxZ];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(D[a]) < 1e-8) { if (O[a] < mn[a] || O[a] > mx[a]) return Infinity; }
    else {
      let t1 = (mn[a] - O[a]) / D[a], t2 = (mx[a] - O[a]) / D[a];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}
function rayWorld(o, d, maxD, hookOnly) {
  let best = Infinity;
  for (const b of world.boxes) {
    if (hookOnly && !b.hookable) continue;
    const t = rayBox(o, d, b); if (t < best && t <= maxD) best = t;
  }
  return best;
}
function rayEnemy(o, d, e) {
  const p = e.mesh.position, s = e.d.hit;
  return rayBox(o, d, { minX: p.x - s[0] / 2, maxX: p.x + s[0] / 2, minY: p.y - s[1] / 2, maxY: p.y + s[1] / 2, minZ: p.z - s[2] / 2, maxZ: p.z + s[2] / 2 });
}
function enemyLOS(from, to) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length(); dir.normalize();
  return rayWorld(from, dir, len) === Infinity;
}

function animateEnemy(e, dt, speedH) {
  const p = e.model.parts;
  e.walk += dt * (2 + speedH * 1.6);
  const sw = Math.sin(e.walk) * clamp(speedH / 4, 0, 1);
  if (e.type === 'husk') {
    p.legL.rotation.x = sw * 0.9; p.legR.rotation.x = -sw * 0.9;
    p.armL.rotation.x = -1.35 + Math.sin(e.walk * 1.1) * 0.25; p.armR.rotation.x = -1.35 - Math.sin(e.walk * 1.1) * 0.25;
    p.head.rotation.z = Math.sin(e.walk * 0.5) * 0.12;
  } else if (e.type === 'shooter') {
    p.legL.rotation.x = sw * 0.7; p.legR.rotation.x = -sw * 0.7;
    p.armL.rotation.x = -sw * 0.3;
    p.armR.rotation.x = -1.2 - e.shootAnim * 0.5; e.shootAnim = Math.max(0, e.shootAnim - dt * 5);
  } else if (e.type === 'charger') {
    const f = e.state === 2 ? 3 : 1;
    p.legL.rotation.x = sw * 0.8 * f; p.legR2.rotation.x = sw * 0.8 * f;
    p.legR.rotation.x = -sw * 0.8 * f; p.legL2.rotation.x = -sw * 0.8 * f;
    p.head.rotation.x = e.state === 1 ? 0.5 : (e.state === 2 ? -0.15 : 0);
  } else if (e.type === 'imp') {
    p.legL.rotation.x = sw * 1.1; p.legR.rotation.x = -sw * 1.1;
    p.armL.rotation.x = e.state === 1 ? -2.6 : sw * 0.6; p.armR.rotation.x = e.state === 1 ? -2.6 : -sw * 0.6;
  } else if (e.type === 'bomber') {
    p.legL.rotation.x = sw * 1.2; p.legR.rotation.x = -sw * 1.2;
    const pulse = 1 + Math.sin(e.walk * 3) * 0.06 + (e.fuse > 0 ? (1 - e.fuse / 0.9) * 0.4 : 0);
    p.core.scale.setScalar(pulse);
    p.glow.material.color.setHex(e.fuse > 0 && Math.floor(e.fuse * 14) % 2 ? 0xffffff : 0xff6a00);
  } else if (e.type === 'sniper') {
    p.legL.rotation.x = 0; p.legR.rotation.x = 0;
    p.armR.rotation.x = -1.35 - (e.aim > 0 ? 0.08 : 0);
  } else if (e.type === 'warden') {
    p.legL.rotation.x = sw * 0.35; p.legR.rotation.x = -sw * 0.35;
    const slam = e.state === 1 ? -2.9 * (1 - clamp(e.st / 0.9, 0, 1)) : 0;
    p.armL.rotation.x = e.state === 1 ? -2.9 + slam * 0.1 : -sw * 0.25; p.armR.rotation.x = e.state === 1 ? -2.9 + slam * 0.1 : sw * 0.25;
    p.core.material.color.setHex(Math.floor(gt * 5) % 2 ? 0xff3a10 : 0xffb020);
    p.head.position.y = 4.15 + Math.abs(Math.sin(e.walk)) * 0.05 * clamp(speedH / 2, 0, 1);
  } else if (e.type === 'brute') {
    p.legL.rotation.x = sw * 0.5; p.legR.rotation.x = -sw * 0.5;
    p.armL.rotation.x = -sw * 0.35 - 0.1; p.armR.rotation.x = sw * 0.35 - 0.1;
    p.head.position.y = 2.65 + Math.abs(Math.sin(e.walk)) * 0.04 * clamp(speedH / 3, 0, 1);
  }
  if (e.scaleIn < 1) { e.scaleIn = Math.min(1, e.scaleIn + dt * 4); e.mesh.scale.setScalar(0.2 + 0.8 * e.scaleIn); }
}
/* Tinte blanco-rojizo cuando el enemigo recibe dano (flash). */
function tintEnemy(e, on) {
  e.model.g.traverse(o => { if (o.isMesh && o.material && o.material.color) { if (on) { if (o.userData.c0 === undefined) o.userData.c0 = o.material.color.getHex(); o.material.color.setHex(0xff8080); } else if (o.userData.c0 !== undefined) o.material.color.setHex(o.userData.c0); } });
}

/* NUEVO - CONCIENCIA DEL BORDE
   Los enemigos terrestres miran un poco por delante de ellos. Si no hay suelo
   (hay lava o un vacio), en vez de caminar al abismo se desvian hacia un lado
   y rodean el borde. Asi no se suicidan solos y de verdad te persiguen.
   Devuelve true si hay suelo firme en ese punto. */
function groundAhead(x, z, fromY) {
  const fy = world.floorY(x, z);
  return fy > world.lavaY + 0.5 && fy > fromY - 3.5;   // hay suelo y no es una caida enorme
}
function steerAwayFromEdge(e, p) {
  // Solo enemigos que caminan por el suelo. Los que saltan/cargan tienen su propio movimiento.
  if (!e.grounded) return;
  if (e.type === 'imp' && e.state !== 0) return;
  if (e.type === 'charger' && e.state === 2) return;
  if (e.d.boss) return;
  const vx = e.vel.x, vz = e.vel.z, sp = Math.hypot(vx, vz);
  if (sp < 0.5) return;
  const dx = vx / sp, dz = vz / sp;
  const look = 1.6 + sp * 0.22;                  // mira mas lejos cuanto mas rapido va
  const feet = p.y - e.d.hit[1] / 2;
  if (groundAhead(p.x + dx * look, p.z + dz * look, feet)) return;   // todo bien: hay suelo
  // No hay suelo delante: probamos girar a ambos lados y elegimos el que tenga suelo
  for (const ang of [0.9, -0.9, 1.6, -1.6]) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const rx = dx * c - dz * s, rz = dx * s + dz * c;
    if (groundAhead(p.x + rx * look, p.z + rz * look, feet)) { e.vel.x = rx * sp; e.vel.z = rz * sp; return; }
  }
  e.vel.x = 0; e.vel.z = 0;                       // sin salida: se queda quieto en el borde
  e.edgeWait = 0.5;
}

function updateEnemies(dt) {
  const target = new THREE.Vector3(P.pos.x, P.pos.y - 0.9, P.pos.z);
  for (const e of [...enemies]) {
    const p = e.mesh.position;
    const wasFlash = e.flash > 0; e.flash -= dt;
    if (wasFlash !== e.flash > 0) tintEnemy(e, e.flash > 0);
    if (e.spawnT > 0) e.spawnT -= dt;

    e.vel.y -= G * dt;
    if (CFG.passive) { e.vel.x = e.vel.z = 0; }

    const toP = new THREE.Vector3(target.x - p.x, 0, target.z - p.z);
    const dist = toP.length(); toP.normalize();
    e.mesh.rotation.y = Math.atan2(toP.x, toP.z);

    const hookedToThis = hook.state === 3 && hook.target === e;
    if (!CFG.passive && !hookedToThis) {
      e.cd -= dt;
      if (e.type === 'shooter') {
        const want = dist > 16 ? 1 : dist < 9 ? -1 : 0;
        e.vel.x = toP.x * e.d.speed * want; e.vel.z = toP.z * e.d.speed * want;
        if (e.cd <= 0 && dist < 40 && enemyLOS(p, target)) {
          e.cd = e.d.fireRate * (0.8 + Math.random() * 0.5);
          e.shootAnim = 1;
          const dir = new THREE.Vector3().subVectors(target, p).normalize();
          shootProjectile(p.clone().add(new THREE.Vector3(0, 0.5, 0)), dir, 20, e.d.dmg);
          sfx('enemyShot');
        }
      } else if (e.type === 'charger') {
        if (e.state === 0) {
          e.vel.x = toP.x * e.d.speed; e.vel.z = toP.z * e.d.speed;
          if (e.cd <= 0 && dist < 22) { e.state = 1; e.st = 0.45; e.dir = toP.clone(); e.vel.set(0, 0, 0); }
        } else if (e.state === 1) {
          e.st -= dt; e.vel.x = e.vel.z = 0;
          if (e.st <= 0) { e.state = 2; e.st = 0.9; }
        } else {
          e.st -= dt; e.vel.x = e.dir.x * 28; e.vel.z = e.dir.z * 28;
          if (e.st <= 0) { e.state = 0; e.cd = 2.0; }
        }
      } else if (e.type === 'imp') {
        if (e.state === 0) {
          const zig = Math.sin(gt * 4 + e.walk) * 0.6;
          e.vel.x = (toP.x + -toP.z * zig) * e.d.speed; e.vel.z = (toP.z + toP.x * zig) * e.d.speed;
          if (e.cd <= 0 && dist < 11 && dist > 4 && e.grounded) { e.state = 1; e.st = 0.32; e.vel.x = e.vel.z = 0; sfx('telegraph'); }
        } else if (e.state === 1) {
          e.st -= dt; e.vel.x = e.vel.z = 0;
          if (e.st <= 0) { e.state = 2; e.vel.y = 13; e.leapDir = toP.clone(); e.st = 1.2; }
        } else {
          e.st -= dt; e.vel.x = e.leapDir.x * 20; e.vel.z = e.leapDir.z * 20;
          if ((e.grounded && e.st < 1.0) || e.st <= 0) { e.state = 0; e.cd = 1.6 + Math.random(); }
        }
      } else if (e.type === 'bomber') {
        if (e.fuse > 0) {
          e.fuse -= dt; e.vel.x *= 0.85; e.vel.z *= 0.85;
          if (e.fuse <= 0) { explode(p, 7, e.d.dmg, e); killEnemyQuiet(e); continue; }
        } else {
          e.vel.x = toP.x * e.d.speed; e.vel.z = toP.z * e.d.speed;
          if (dist < 4.2) { e.fuse = 0.9; sfx('telegraph'); }
        }
      } else if (e.type === 'sniper') {
        e.vel.x = e.vel.z = 0;
        const los = dist < 70 && enemyLOS(p.clone().add(new THREE.Vector3(0, 0.6, 0)), target);
        if (los) {
          if (e.aim > 0) {
            e.aim -= dt;
            if (e.aim <= 0) {
              const dir = new THREE.Vector3().subVectors(e.aimPoint, p.clone().add(new THREE.Vector3(0, 0.6, 0))).normalize();
              shootProjectile(p.clone().add(new THREE.Vector3(0, 0.6, 0)), dir, 60, e.d.dmg, true);
              sfx('enemyShot'); e.cd = e.d.fireRate; e.shootAnim = 1;
            } else { e.aimPoint = target.clone(); }
          } else if (e.cd <= 0) { e.aim = 1.1; e.aimPoint = target.clone(); sfx('telegraph'); }
        } else e.aim = 0;
      } else if (e.type === 'warden') {
        if (e.state === 0) {
          e.vel.x = toP.x * e.d.speed; e.vel.z = toP.z * e.d.speed;
          if (e.cd <= 0) { e.atk = (e.atk || 0) + 1; if (e.atk % 3 === 0) { e.state = 2; e.st = 0.6; } else { e.state = 1; e.st = 0.9; } sfx('telegraph'); }
        } else if (e.state === 1) {
          e.st -= dt; e.vel.x = e.vel.z = 0;
          if (e.st <= 0) {
            shockwave(p, e.d.dmg);
            if (dist < 9) { const away = toP.clone().multiplyScalar(-1); P.vel.x += away.x * 16; P.vel.z += away.z * 16; P.vel.y = Math.max(P.vel.y, 11); P.onGround = false; addStyle('EMPUJADO', 0); }
            e.state = 0; e.cd = 2.0;
          }
        } else {
          e.st -= dt; e.vel.x = e.vel.z = 0;
          if (e.st <= 0) {
            const n = e.enraged ? 14 : 9;
            for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + gt; shootProjectile(p.clone().add(new THREE.Vector3(0, 1.5, 0)), new THREE.Vector3(Math.cos(a), 0.05, Math.sin(a)), 15, 10, false); }
            sfx('enemyShot'); e.state = 0; e.cd = e.enraged ? 1.4 : 2.1;
          }
        }
        if (!e.enraged && e.hp < e.d.hp * 0.5) { e.enraged = true; e.d = Object.assign({}, e.d, { speed: e.d.speed * 1.5 }); flashMsg('\u00a1ENFURECIDO!'); sfx('boss'); P.shake = 0.8; }
      } else {
        e.vel.x = toP.x * e.d.speed; e.vel.z = toP.z * e.d.speed;
      }
      if (e.d.melee && dist < e.d.size[0] / 2 + 0.9 && Math.abs(p.y - target.y) < 2) {
        if (e.cd <= 0 || (e.type === 'charger' && e.state === 2)) {
          hurtPlayer(e.d.dmg);
          e.cd = 0.9;
          if (e.type === 'charger') e.state = 0;
        }
      }
    }

    steerAwayFromEdge(e, p);   // NUEVO: no caminar hacia el vacio
    const sx = e.d.hit[0] / 2, sy = e.d.hit[1];
    p.x += e.vel.x * dt;
    for (const b of world.boxes) if (overlapBox(p.x, p.y - sy / 2, p.z, sx, sy, b)) { p.x -= e.vel.x * dt; e.vel.x = 0; break; }
    p.z += e.vel.z * dt;
    for (const b of world.boxes) if (overlapBox(p.x, p.y - sy / 2, p.z, sx, sy, b)) { p.z -= e.vel.z * dt; e.vel.z = 0; break; }
    p.y += e.vel.y * dt; e.grounded = false;
    for (const b of world.boxes) if (overlapBox(p.x, p.y - sy / 2, p.z, sx, sy, b)) {
      if (e.vel.y <= 0) { p.y = b.maxY + sy / 2 + 0.001; e.grounded = true; }
      e.vel.y = 0;
    }
    if (e.grounded && !CFG.passive && (Math.abs(e.vel.x) + Math.abs(e.vel.z)) < 0.3 && dist > 3 && e.type !== 'shooter') {
      // NUEVO: solo salta para superar un obstaculo si al otro lado hay suelo (antes saltaba a ciegas y caia a la lava)
      const ahead = groundAhead(p.x + toP.x * 3, p.z + toP.z * 3, p.y - sy / 2);
      if (ahead) e.vel.y = 12;
    }

    animateEnemy(e, dt, Math.hypot(e.vel.x, e.vel.z));

    if (p.y - e.d.hit[1] / 2 <= world.lavaY + 0.4) {
      burst(new THREE.Vector3(p.x, world.lavaY + 0.5, p.z), 0xff8a20, 14, 7);
      killEnemyQuiet(e);
    }
  }
}

const pickups = [];
const PK = { health: { c: 0xff2a2a, n: 'VIDA' }, ammo: { c: 0xffc933, n: 'MUNICION' }, dash: { c: 0x40ff90, n: 'DASH' } };
function maybeDrop(pos, e) {
  if (!CFG.pickups) return;
  const r = Math.random();
  const boost = e.d.heavy ? 0.5 : 0;
  let kind = null;
  if (r < 0.12 + boost) kind = 'health'; else if (r < 0.28 + boost) kind = 'ammo'; else if (r < 0.36 + boost * 0.5) kind = 'dash';
  if (!kind) return;
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), new THREE.MeshBasicMaterial({ color: PK[kind].c }));
  m.position.copy(pos); m.position.y += 0.6; scene.add(m);
  pickups.push({ mesh: m, kind, t: 0, life: 14, vel: new THREE.Vector3((Math.random() - 0.5) * 4, 5, (Math.random() - 0.5) * 4) });
}
function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const k = pickups[i]; k.t += dt; k.life -= dt;
    const p = k.mesh.position;
    k.vel.y -= 22 * dt; p.addScaledVector(k.vel, dt);
    const fy = world.floorY(p.x, p.z) + 0.55;
    if (p.y < fy) { p.y = fy; k.vel.y = Math.abs(k.vel.y) > 3 ? -k.vel.y * 0.4 : 0; k.vel.x *= 0.8; k.vel.z *= 0.8; }
    k.mesh.rotation.y += dt * 3; k.mesh.rotation.x = Math.sin(k.t * 3) * 0.3;
    // NUEVO: los items "laten" suavemente para que se noten mas
    k.mesh.scale.setScalar(1 + Math.sin(k.t * 6) * 0.12);
    const dx = P.pos.x - p.x, dy = (P.pos.y - 0.9) - p.y, dz = P.pos.z - p.z, d = Math.hypot(dx, dy, dz);
    if (d < 5 && k.t > 0.4) { const f = (1 - d / 5) * 26 * dt; p.x += dx / d * f; p.y += dy / d * f; p.z += dz / d * f; }
    if (d < 1.4 && k.t > 0.3) {
      if (k.kind === 'health') P.hp = Math.min(100, P.hp + 25);
      else if (k.kind === 'dash') P.stamina = Math.min(P.maxStamina, P.stamina + 1);
      else { for (const w of WEAPONS) if (w.unlocked && isFinite(w.ammo)) ammoState[w.id] = Math.min(w.ammo, ammoState[w.id] + Math.ceil(w.ammo * 0.35)); updateWeaponHUD(); }
      sfx('pickup'); flashMsg(PK[k.kind].n); haptic(15);
      // NUEVO: brillo de pantalla y anillo al recoger un item
      pickFlash(PK[k.kind].c); impactRing(p, PK[k.kind].c, 1.6); sparks(p, 8, PK[k.kind].c);
      scene.remove(k.mesh); k.mesh.geometry.dispose(); k.mesh.material.dispose(); pickups.splice(i, 1); continue;
    }
    if (k.life < 3) k.mesh.visible = Math.floor(k.t * 8) % 2 === 0;
    if (k.life <= 0 || p.y < world.lavaY) { scene.remove(k.mesh); k.mesh.geometry.dispose(); k.mesh.material.dispose(); pickups.splice(i, 1); }
  }
}

function explode(pos, radius, dmg, source) {
  burst(pos, 0xffe060, 24, 12); burst(pos, 0xff6a1a, 26, 9); burst(pos, 0x3a1a10, 10, 6);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.9, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.position.copy(pos); ring.position.y += 0.1; scene.add(ring);
  fx.push({ m: ring, t: 0, life: 0.35, grow: radius * 2.2 });
  sparks(pos, 20, 0xffe08a);      // NUEVO: lluvia de chispas en explosiones
  screenPunch(0.5);               // NUEVO: destello breve de pantalla
  sfx('slam'); P.shake = Math.max(P.shake || 0, 0.6);
  const d = Math.hypot(P.pos.x - pos.x, (P.pos.y - 0.9) - pos.y, P.pos.z - pos.z);
  if (d < radius) {
    hurtPlayer(dmg * (1 - d / radius * 0.5));
    const away = new THREE.Vector3(P.pos.x - pos.x, 0.4, P.pos.z - pos.z).normalize();
    P.vel.addScaledVector(away, 18 * (1 - d / radius));
  }
  for (const o of [...enemies]) {
    if (o === source) continue;
    const od = o.mesh.position.distanceTo(pos);
    if (od < radius) damageEnemy(o, dmg * 2 * (1 - od / radius));
  }
}
function shockwave(pos, dmg) {
  burst(pos, 0x8a5a3a, 20, 9);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.2, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  ring.position.set(pos.x, world.floorY(pos.x, pos.z) + 0.15, pos.z); scene.add(ring);
  fx.push({ m: ring, t: 0, life: 2.4, grow: 38, wave: { x: pos.x, z: pos.z, dmg, hit: false, speed: 16 } });
  sfx('slam'); P.shake = Math.max(P.shake || 0, 0.7);
}
const fx = [];
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt; const k = f.t / f.life;
    f.m.scale.setScalar(1 + k * f.grow); f.m.material.opacity = Math.max(0, 0.9 * (1 - k));
    if (f.wave && !f.wave.hit) {
      const r = f.t * f.wave.speed;
      const dd = Math.hypot(P.pos.x - f.wave.x, P.pos.z - f.wave.z);
      if (Math.abs(dd - r) < 1.4 && (P.pos.y - P.h) < world.floorY(P.pos.x, P.pos.z) + 0.9) { hurtPlayer(f.wave.dmg); f.wave.hit = true; }
    }
    if (k >= 1) { scene.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); fx.splice(i, 1); }
  }
}

/* =====================================================================
   NUEVO: EFECTOS VISUALES LIGEROS
   Todos estan pensados para costar muy poco rendimiento:
   - impactRing: un anillo plano que crece y se desvanece.
   - sparks: pocas particulas brillantes que salen disparadas.
   - screenPunch: un destello breve de toda la pantalla.
   - pickFlash: un brillo de color al recoger un objeto.
   ===================================================================== */
const ringGeo = new THREE.RingGeometry(0.3, 0.5, 16).rotateX(-Math.PI / 2);
function impactRing(pos, color, size) {
  if (fx.length > 24) return; // limite de seguridad para no saturar
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  m.position.copy(pos); scene.add(m);
  fx.push({ m, t: 0, life: 0.28, grow: size * 3 });
}
function sparks(pos, n, color) {
  for (let i = 0; i < n; i++) {
    if (particles.length > MAX_PARTICLES) break;
    const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color }));
    m.position.copy(pos); scene.add(m);
    const a = Math.random() * Math.PI * 2, up = 2 + Math.random() * 6, sp = 4 + Math.random() * 9;
    particles.push({ mesh: m, vel: new THREE.Vector3(Math.cos(a) * sp, up, Math.sin(a) * sp), life: 0.25 + Math.random() * 0.3 });
  }
}
const sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.22);
let punchT = 0;
function screenPunch(amount) {
  postMat.uniforms.uFlash.value = Math.max(postMat.uniforms.uFlash.value, amount * 0.35);
  punchT = 1;
}
function updatePunch(dt) {
  if (P.alive && postMat.uniforms.uFlash.value > 0) {
    postMat.uniforms.uFlash.value = Math.max(0, postMat.uniforms.uFlash.value - dt * 2.4);
  }
}
function pickFlash(color) {
  const el = $('pickFlash');
  el.style.background = 'radial-gradient(ellipse at center, transparent 50%, #' + color.toString(16).padStart(6, '0') + '99)';
  el.style.transition = 'none'; el.style.opacity = 1;
  requestAnimationFrame(() => { el.style.transition = 'opacity .35s'; el.style.opacity = 0; });
}

const laserMeshes = [];
function getLaser(i) {
  if (!laserMeshes[i]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), new THREE.MeshBasicMaterial({ color: 0xff1010 }));
    m.visible = false; m.frustumCulled = false; scene.add(m); laserMeshes[i] = m;
  }
  return laserMeshes[i];
}
function updateLasers() {
  let li = 0, warn = false;
  for (const e of enemies) {
    if (e.type !== 'sniper' || !(e.aim > 0) || !e.aimPoint) continue;
    const l = getLaser(li++);
    const a = e.mesh.position.clone(); a.y += 0.6;
    const b = e.aimPoint.clone();
    const len = a.distanceTo(b);
    l.visible = !(e.aim < 0.35 && Math.floor(e.aim * 30) % 2);
    l.position.copy(a).lerp(b, 0.5); l.scale.set(e.aim < 0.35 ? 3 : 1, e.aim < 0.35 ? 3 : 1, len); l.lookAt(b);
    if (Math.hypot(b.x - P.pos.x, b.z - P.pos.z) < 3) warn = true;
  }
  for (let k = li; k < laserMeshes.length; k++) laserMeshes[k].visible = false;
  $('laserWarn').classList.toggle('on', warn);
}

function shootProjectile(p, dir, speed, dmg, fast) {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  m.add(core);
  m.position.copy(p); scene.add(m);
  projectiles.push({ mesh: m, dir: dir.clone(), speed, dmg, life: 5, trail: 0, parried: false, fast: !!fast });
  if (fast) m.scale.setScalar(0.7);
}
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.life -= dt;
    pr.mesh.position.addScaledVector(pr.dir, pr.speed * dt);
    pr.mesh.rotation.x += dt * 9; pr.mesh.rotation.y += dt * 7;
    pr.trail -= dt; if (pr.trail <= 0) { pr.trail = 0.04; burst(pr.mesh.position, pr.parried ? 0x60d0ff : 0xff3a1a, 1, 0.6); }
    let dead = pr.life <= 0;
    const pp = pr.mesh.position;

    if (pr.parried) {
      for (const e of enemies) {
        const t = e.mesh.position, h = e.d.hit;
        if (Math.abs(pp.x - t.x) < h[0] / 2 + 0.3 && Math.abs(pp.y - t.y) < h[1] / 2 + 0.3 && Math.abs(pp.z - t.z) < h[0] / 2 + 0.3) {
          damageEnemy(e, pr.dmg * 4 + 25); addStyle('DEVUELTO', 60); explode(pp, 3, 0, null); dead = true; break;
        }
      }
    } else {
      const dx = pp.x - P.pos.x, dz = pp.z - P.pos.z, dy = pp.y - (P.pos.y - 0.8);
      const near = Math.sqrt(dx * dx + dz * dz + dy * dy);
      if (near < 3.4 && parryT > 0) {
        pr.parried = true; pr.dir.copy(aimDir()); pr.speed = Math.max(pr.speed, 34);
        pr.mesh.children[0] && pr.mesh.children[0].material.color.setHex(0x60d0ff);
        pr.mesh.material.color.setHex(0x2090ff);
        pr.life = 4; parryT = 0; S.parries++;
        sfx('parry'); haptic([20, 30, 40]); P.shake = Math.max(P.shake || 0, 0.3); hitStop = 0.07;
        addStyle('PARRY', 120); P.hp = Math.min(100, P.hp + 4);
        burst(pp, 0x60d0ff, 14, 8);
        impactRing(pp, 0x60d0ff, 2.2); sparks(pp, 14, 0xbfeaff); screenPunch(0.45); // NUEVO: efectos de parry
        continue;
      }
      if (!dead && dx * dx + dz * dz < 0.7 && Math.abs(dy) < 1.1) { hurtPlayer(pr.dmg); dead = true; }
    }
    if (!dead) for (const b of world.boxes) if (overlapBox(pp.x, pp.y - 0.15, pp.z, 0.15, 0.3, b)) { dead = true; break; }
    if (dead) { scene.remove(pr.mesh); disposeGroup(pr.mesh); projectiles.splice(i, 1); }
  }
}
function aimDir() { return new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize(); }
let parryT = 0;
let hitStop = 0;

const partGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
function burst(pos, color, n, spd) {
  for (let i = 0; i < n; i++) {
    if (particles.length > MAX_PARTICLES) break;
    const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color }));
    m.position.copy(pos); scene.add(m);
    particles.push({ mesh: m, vel: new THREE.Vector3((Math.random() - 0.5) * spd, Math.random() * spd, (Math.random() - 0.5) * spd), life: 0.5 + Math.random() * 0.4 });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt; p.vel.y -= 18 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    if (p.spin) { p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.y += p.spin.y * dt; p.mesh.rotation.z += p.spin.z * dt; }
    if (p.frag) p.mesh.scale.setScalar(Math.max(0.05, p.mesh.scale.x - dt * 0.35));
    if (p.life <= 0) {
      scene.remove(p.mesh); if (p.frag) p.mesh.geometry.dispose(); p.mesh.material.dispose(); particles.splice(i, 1);
    }
  }
}

const killPopEl = document.createElement('div');
killPopEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;overflow:hidden';
document.body.appendChild(killPopEl);
function killPopup(worldPos, pts) {
  const v = worldPos.clone().project(camera);
  if (v.z > 1) return;
  const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
  const el = document.createElement('div');
  el.textContent = '+' + pts;
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;color:#ffc933;font:bold 14px monospace;text-shadow:2px 2px 0 #000;transform:translate(-50%,-50%) scale(.6);transition:transform .6s ease-out, opacity .6s ease-out;`;
  killPopEl.appendChild(el);
  requestAnimationFrame(() => { el.style.transform = 'translate(-50%,-140%) scale(1.2)'; el.style.opacity = '0'; });
  setTimeout(() => el.remove(), 650);
}

/* =====================================================================
   AUDIO
   =====================================================================
   COMO FUNCIONA EL AUDIO AHORA (version simple):

   1. Al iniciar, el juego lee la lista de archivos de "audio-config.js".
   2. Intenta cargar cada archivo de la carpeta audio/.
   3. Si el archivo existe -> el juego lo usa cuando toca ese sonido.
   4. Si el archivo NO existe -> el juego usa su sonido interno (los de
      la seccion "SFX" mas abajo). El juego nunca se queda mudo.

   Tu NO necesitas tocar este archivo para cambiar sonidos.
   Solo reemplaza los archivos en la carpeta audio/ (ver GUIA).
   ===================================================================== */
const AU = { ctx: null, master: null, sfxBus: null, ok: true, noiseBuf: null, musicT: 0, step: 0,
             bus: {},            // un "bus" de volumen por categoria: music, weapons, enemies, player, ui
             buffers: {},        // efectos cargados desde archivo: nombre -> audio decodificado
             loading: false, loaded: false,
             tracks: {},         // capas de musica: calm / battle / boss (cada una con su <audio> y su volumen)
             musicFile: {},      // que capas existen de verdad como archivo
             musicWaveKey: null, // ruta de la cancion "battle" que esta sonando (para el cambio por oleada)
             curCat: 'ui' };     // categoria del sonido que se esta creando (la usan los sonidos internos)
const AUCFG = window.HELLRUSH_AUDIO || { music: {}, musicByWave: {}, sfx: {}, volume: {} };
const AU_CATS = ['music', 'weapons', 'enemies', 'player', 'ui'];
/* Volumen de cada categoria. Empieza con el valor de audio-config.js y el jugador
   lo puede cambiar en MOD MENU. Se guarda en CFG.vol para que el menu lo controle. */
CFG.vol = {};
for (const c of AU_CATS) CFG.vol[c] = (AUCFG.volume && AUCFG.volume[c] != null) ? AUCFG.volume[c] : 1;

/* A que categoria pertenece cada sonido. Sale de audio-config.js (el 1er elemento de cada linea).
   Si un sonido no esta en la config usa 'ui'. */
function catOf(name) {
  const e = AUCFG.sfx && AUCFG.sfx[name];
  if (Array.isArray(e) && e[0]) return e[0];
  return 'ui';
}
function urlOf(name) {
  const e = AUCFG.sfx && AUCFG.sfx[name];
  if (Array.isArray(e)) return e[1] || '';
  return typeof e === 'string' ? e : '';   // compatible con el formato viejo: nombre: "ruta"
}

function audioInit() {
  if (AU.ctx || !AU.ok) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) { AU.ok = false; return; }
    AU.ctx = new C();
    AU.master = AU.ctx.createGain(); AU.master.gain.value = CFG.volume;
    const comp = AU.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    AU.master.connect(comp); comp.connect(AU.ctx.destination);
    for (const c of AU_CATS) {
      const g = AU.ctx.createGain(); g.gain.value = CFG.vol[c]; g.connect(AU.master); AU.bus[c] = g;
    }
    AU.sfxBus = AU.bus.ui;   // por si algun codigo viejo aun usa sfxBus
    const len = AU.ctx.sampleRate * 1;
    AU.noiseBuf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
    const d = AU.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    loadAudioFiles();
  } catch (e) { AU.ok = false; }
}
function audioResume() { audioInit(); if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); }
/* Aplica los volumenes actuales (los del MOD MENU) a los buses. */
function audioVolumeRefresh() {
  if (!AU.ctx) return;
  AU.master.gain.value = CFG.volume;
  for (const c of AU_CATS) if (AU.bus[c]) AU.bus[c].gain.value = CFG.vol[c];
}

/* Carga los efectos. Si un archivo no existe (error 404) se ignora y ese sonido
   usara la version interna. NUNCA muestra error al jugador. */
function loadAudioFiles() {
  if (AU.loading || AU.loaded) return;
  AU.loading = true;
  const list = AUCFG.sfx || {};
  /* Si el archivo no esta en su subcarpeta nueva (ej. audio/sfx/weapons/x.mp3), probamos la ruta
     ANTIGUA (audio/sfx/x.mp3). Asi, si ya subiste archivos con la organizacion vieja, siguen sonando. */
  const legacyUrl = u => u.replace(/^(audio\/sfx)\/(?:weapons|enemies|player|environment|ui)\//, '$1/');
  const fetchAudio = url => fetch(url).then(r => {
    if (r.ok) return r;
    const old = legacyUrl(url);
    if (old !== url) return fetch(old).then(r2 => { if (!r2.ok) throw new Error('no existe'); return r2; });
    throw new Error('no existe');
  });
  const jobs = Object.keys(list).map(name => {
    const url = urlOf(name);
    if (!url) return Promise.resolve();
    return fetchAudio(url)
      .then(r => r.arrayBuffer())
      // Solo la forma de promesa: con callbacks + promesa a la vez, un archivo roto lanzaba un error sin capturar.
      .then(buf => AU.ctx.decodeAudioData(buf))
      .then(audio => { AU.buffers[name] = audio; })
      .catch(() => { /* ausente o roto: se usa el sonido interno */ });
  });
  Promise.all(jobs).then(() => { AU.loaded = true; AU.loading = false; });
  // Musica: capas calm/battle/boss + canciones por oleada. Solo comprobamos cuales existen.
  const probe = (key, url) => {
    if (!url) return;
    fetch(url, { method: 'HEAD' }).then(r => {
      if (!r.ok) return;
      // Comprobamos que el navegador puede leerlo de verdad (un archivo corrupto responde 'ok' igualmente)
      const probeEl = new Audio(); probeEl.preload = 'metadata';
      probeEl.addEventListener('loadedmetadata', () => { AU.musicFile[key] = url; });
      probeEl.addEventListener('error', () => {});
      probeEl.src = url;
    }).catch(() => {});
  };
  const mus = AUCFG.music || {};
  Object.keys(mus).forEach(n => probe(n, mus[n]));
  const byWave = AUCFG.musicByWave || {};
  Object.keys(byWave).forEach(w => probe('wave' + w, byWave[w]));
}

/* Reproduce un efecto desde archivo. Devuelve true si lo logro. */
function playBuffer(name) {
  const b = AU.buffers[name];
  if (!b || !AU.ctx) return false;
  const s = AU.ctx.createBufferSource(); s.buffer = b;
  s.playbackRate.value = 0.96 + Math.random() * 0.08;   // variacion de tono para que no suenen identicos
  s.connect(AU.bus[catOf(name)] || AU.bus.ui); s.start();
  return true;
}

/* --- MUSICA EN CAPAS CON TRANSICION SUAVE ---
   Cada capa (calm / battle / boss) es un <audio> en bucle conectado a su propio
   volumen. Todas suenan a la vez en silencio; solo se sube la que corresponde y
   se baja la demas poco a poco (crossfade). Asi los cambios nunca son bruscos. */
function trackGet(key) {
  const url = AU.musicFile[key];
  if (!url) return null;
  let t = AU.tracks[key];
  if (t && t.url === url) return t;
  if (t) { try { t.el.pause(); } catch (e) {} }
  const el = new Audio(url); el.loop = true; el.preload = 'auto';
  // Si el archivo esta roto o no es audio, lo descartamos: asi el juego usa la musica interna en vez de quedarse mudo.
  el.addEventListener('error', () => { delete AU.musicFile[key]; if (AU.tracks[key]) { try { el.pause(); } catch (e) {} delete AU.tracks[key]; } });
  const g = AU.ctx.createGain(); g.gain.value = 0;
  try { AU.ctx.createMediaElementSource(el).connect(g); g.connect(AU.bus.music); }
  catch (e) { return null; }
  t = AU.tracks[key] = { key, url, el, g, cur: 0, playing: false };
  return t;
}
/* Que capa deberia sonar ahora mismo y con que "key" de archivo. */
function musicWanted() {
  if (bossActive) return AU.musicFile.boss ? 'boss' : null;
  const wk = 'wave' + S.wave;
  const combatKey = AU.musicFile[wk] ? wk : 'battle';
  const inFight = S.waveState === 'active' || S.waveState === 'spawning';
  // Margen de gracia: la musica NO vuelve a "calma" hasta llevar ~4 s sin combate.
  // (La pausa entre oleadas es corta; sin esto la musica oscilaria sin parar.)
  if (inFight) AU.lastFightT = S.time;
  const recentlyFought = S.time - (AU.lastFightT === undefined ? -99 : AU.lastFightT) < 4;
  if ((inFight || recentlyFought) && AU.musicFile[combatKey]) return combatKey;
  if (AU.musicFile.calm) return 'calm';
  return AU.musicFile[combatKey] ? combatKey : null;   // sin capa calma: se usa la de combate siempre
}
function musicFadeStep(dt, wanted) {
  let any = false;
  for (const key of Object.keys(AUCFG.music || {}).concat(Object.keys(AUCFG.musicByWave || {}).map(w => 'wave' + w))) {
    if (!AU.musicFile[key]) continue;
    const t = trackGet(key); if (!t) continue;
    const target = key === wanted ? 1 : 0;
    // subir rapido (1.2 s) y bajar un poco mas lento (1.6 s) para que se solapen bien
    const rate = target > t.cur ? dt / 1.2 : dt / 1.6;
    t.cur = clamp(t.cur + Math.sign(target - t.cur) * Math.min(Math.abs(target - t.cur), rate), 0, 1);
    t.g.gain.value = t.cur;
    if (t.cur > 0.001 && !t.playing) { t.el.play().catch(() => {}); t.playing = true; }
    else if (t.cur <= 0.001 && t.playing && target === 0) { try { t.el.pause(); } catch (e) {} t.playing = false; }
    if (t.playing) any = true;
  }
  return any;
}
function musicStop() {
  for (const k of Object.keys(AU.tracks)) { const t = AU.tracks[k]; try { t.el.pause(); } catch (e) {} t.playing = false; t.cur = 0; if (t.g) t.g.gain.value = 0; }
}
function musicVolumeRefresh() { audioVolumeRefresh(); }

/* --- SONIDOS FABRICADOS POR CODIGO (respaldo si no hay archivo) ---
   Van al bus de su categoria (armas, enemigos...) para que los volumenes tambien les afecten. */
function outBus() { return AU.bus[AU.curCat] || AU.bus.ui; }
function sfxTone(f0, f1, dur, type = 'square', vol = 0.3, delay = 0) {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime + delay;
  const o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(outBus()); o.start(t); o.stop(t + dur + 0.02);
}
function sfxNoise(dur, freq, q, vol = 0.3, type = 'lowpass', delay = 0, sweepTo) {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime + delay;
  const s = AU.ctx.createBufferSource(); s.buffer = AU.noiseBuf; s.loop = true;
  const f = AU.ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = AU.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(outBus()); s.start(t); s.stop(t + dur + 0.02);
}

const SFX = {
  pistol()  { sfxNoise(0.12, 3200, 1, 0.35, 'bandpass', 0, 700); sfxTone(420, 90, 0.14, 'square', 0.22); },
  shotgun() { sfxNoise(0.32, 1800, 0.7, 0.6, 'lowpass', 0, 200); sfxTone(150, 40, 0.28, 'sawtooth', 0.4); },
  rail()    { sfxTone(1800, 60, 0.5, 'sawtooth', 0.32); sfxNoise(0.45, 4500, 2, 0.28, 'bandpass', 0, 300); sfxTone(90, 45, 0.6, 'sine', 0.5); },
  nail()    { sfxNoise(0.05, 5000, 2, 0.22, 'highpass'); sfxTone(900, 500, 0.05, 'square', 0.12); },
  hit()     { sfxTone(220, 120, 0.06, 'square', 0.18); },
  kill()    { sfxNoise(0.35, 900, 0.8, 0.5, 'lowpass', 0, 120); sfxTone(200, 40, 0.3, 'sawtooth', 0.35); },
  bigKill() { sfxNoise(0.6, 600, 0.7, 0.7, 'lowpass', 0, 80); sfxTone(110, 30, 0.6, 'sawtooth', 0.5); },
  hurt()    { sfxTone(180, 60, 0.25, 'sawtooth', 0.4); sfxNoise(0.2, 600, 1, 0.3, 'lowpass'); },
  dash()    { sfxNoise(0.22, 700, 0.6, 0.28, 'bandpass', 0, 3200); },
  jump()    { sfxTone(200, 420, 0.1, 'sine', 0.14); },
  slide()   { sfxNoise(0.3, 1500, 0.5, 0.16, 'bandpass', 0, 500); },
  slam()    { sfxNoise(0.4, 400, 0.6, 0.6, 'lowpass', 0, 60); sfxTone(90, 30, 0.35, 'sine', 0.6); },
  hookFire(){ sfxTone(700, 1500, 0.09, 'triangle', 0.22); sfxNoise(0.08, 3000, 1, 0.14, 'highpass'); },
  hookHit() { sfxTone(1200, 500, 0.08, 'square', 0.2); sfxNoise(0.1, 2000, 2, 0.25, 'bandpass'); },
  parry()   { sfxTone(1400, 2200, 0.09, 'triangle', 0.4); sfxTone(700, 350, 0.25, 'square', 0.3, 0.02); sfxNoise(0.2, 6000, 1, 0.3, 'highpass'); },
  pickup()  { sfxTone(600, 900, 0.07, 'triangle', 0.22); sfxTone(900, 1400, 0.09, 'triangle', 0.22, 0.06); },
  lava()    { sfxNoise(1.0, 500, 0.6, 0.8, 'lowpass', 0, 60); sfxTone(300, 30, 0.9, 'sawtooth', 0.55); },
  wave()    { sfxTone(110, 110, 0.5, 'sawtooth', 0.28); sfxTone(165, 165, 0.5, 'sawtooth', 0.22, 0.05); sfxNoise(0.5, 300, 1, 0.2, 'lowpass'); },
  boss()    { sfxTone(55, 40, 1.4, 'sawtooth', 0.6); sfxTone(82, 60, 1.4, 'square', 0.35, 0.1); sfxNoise(1.2, 200, 1, 0.4, 'lowpass'); },
  rank()    { sfxTone(500, 750, 0.08, 'square', 0.16); sfxTone(750, 1000, 0.1, 'square', 0.16, 0.08); },
  enemyShot(){ sfxTone(300, 150, 0.12, 'sawtooth', 0.14); },
  telegraph(){ sfxTone(880, 880, 0.14, 'square', 0.16); sfxTone(880, 880, 0.14, 'square', 0.16, 0.2); },
  button()  { sfxTone(520, 380, 0.06, 'square', 0.14); },
  death()   { sfxTone(400, 30, 1.4, 'sawtooth', 0.5); sfxNoise(1.4, 800, 0.6, 0.4, 'lowpass', 0, 40); }
};
/* Funcion central de sonido: primero intenta el ARCHIVO, si no hay usa el interno.
   Marca la categoria antes de crear el sonido interno para que use el volumen correcto. */
function sfx(name) {
  if (!CFG.sound || !AU.ctx) return;
  try {
    if (playBuffer(name)) return;
    if (SFX[name]) { AU.curCat = catOf(name); SFX[name](); }
  } catch (e) {}
}

/* --- MUSICA DINAMICA ---
   Decide que capa suena (calma / combate / jefe / cancion por oleada) y hace
   la transicion suave. Si NO hay ningun archivo de musica, suena la musica
   interna de siempre, que ademas se intensifica con tu estilo. */
const BASS = [55, 55, 82.4, 55, 65.4, 55, 73.4, 82.4];
function updateMusic(dt) {
  if (!AU.ctx) return;
  const playing = S.running && !S.paused;
  if (!playing) { for (const k of Object.keys(AU.tracks)) { const t = AU.tracks[k]; if (t.playing) { try { t.el.pause(); } catch (e) {} t.playing = false; } } return; }
  if (!CFG.music) { musicStop(); return; }
  const wanted = musicWanted();
  if (wanted) { musicFadeStep(dt, wanted); return; }
  // Sin archivos de musica: musica interna fabricada por codigo (la de siempre)
  musicFadeStep(dt, null);
  AU.curCat = 'music';
  AU.musicT -= dt;
  const inten = clamp(S.style / 12, 0, 1) + (bossActive ? 0.5 : 0);
  const stepLen = 0.15 - inten * 0.03;
  if (AU.musicT > 0) return;
  AU.musicT = stepLen;
  const i = AU.step++ % 16;
  const mv = 1;   // el volumen de la musica interna lo controla el bus "music"
  if (i % 4 === 0) { sfxTone(120, 40, 0.16, 'sine', 0.55 * mv); }
  if (i % 8 === 4) { sfxNoise(0.14, 2200, 1, 0.3 * mv, 'bandpass'); }
  if (i % 2 === 1 && inten > 0.25) { sfxNoise(0.03, 8000, 1, 0.1 * mv, 'highpass'); }
  if (i % 2 === 0) {
    const n = BASS[(i / 2 + (S.wave % 2 ? 0 : 2)) % BASS.length | 0] * (inten > 0.6 ? 2 : 1);
    sfxTone(n, n * 0.98, stepLen * 1.7, 'sawtooth', 0.16 * mv);
  }
  if (inten > 0.5 && i % 4 === 2) sfxTone(BASS[i % 8] * 4, BASS[i % 8] * 4, stepLen, 'square', 0.05 * mv);
}
['touchstart', 'mousedown', 'keydown'].forEach(ev => addEventListener(ev, audioResume, { passive: true }));

/* =====================================================================
   ESTADO / OLEADAS
   ===================================================================== */
const S = {
  running: false, paused: false, wave: 0, score: 0, kills: 0, style: 0, styleT: 0, time: 0,
  parries: 0, mult: 1, rank: 0, rankT: 0, airKills: 0, lastKillT: -9, chain: 0,
  waveState: 'idle', waveTarget: 0, waveSpawned: 0, waveTimer: 0, waveSpawnT: 0
};
let bossActive = false;
const RANKS = [
  { n: '', m: 1, need: 0 }, { n: 'D', m: 1.0, need: 30 }, { n: 'C', m: 1.2, need: 70 }, { n: 'B', m: 1.5, need: 120 },
  { n: 'A', m: 2.0, need: 180 }, { n: 'S', m: 2.5, need: 250 }, { n: 'SS', m: 3.0, need: 330 }, { n: 'ULTRAKILL', m: 4.0, need: 420 }
];
/* =====================================================================
   NUEVO - SISTEMA "FUEGO"  (tu propio sistema de combate agresivo)
   =====================================================================
   El FUEGO es una barra de 0 a 100 que mide lo AGRESIVO que juegas.
   - SUBE cuando: matas rapido, cambias de arma entre bajas, te mueves a
     gran velocidad, matas en el aire, y aguantas sin recibir dano.
   - BAJA cuando: te quedas quieto, te hacen dano, o pasas tiempo sin matar.
   Segun el FUEGO ganas un multiplicador EXTRA de puntos (se suma al de tu
   rango de estilo). Todos los numeros estan aqui abajo para que los cambies.
   ===================================================================== */
const FIRE = {
  max: 100,
  decayIdle: 8,        // cuanto baja por segundo si no haces nada agresivo
  decayHit: 35,        // cuanto se pierde de golpe al recibir dano
  perKill: 3,          // subida base por baja
  quickKillBonus: 4,   // extra si la baja llega < 1.2 s despues de la anterior
  weaponSwapBonus: 5,  // extra si matas con un arma distinta a la de la baja anterior
  airBonus: 3,         // extra por baja en el aire
  speedGain: 2.2,      // subida por segundo cuando vas rapido
  speedThreshold: 19,  // velocidad minima para considerarse "rapido"
  noHitBonus: 6,       // premio UNICO cada 10 s seguidos sin recibir dano
  heavyBonus: 6,       // extra por matar un enemigo pesado
  idleAfterKill: 1.6,  // segundos tras una baja antes de empezar a enfriarse
  tiers: [             // multiplicador extra segun el FUEGO
    { at: 0,  mult: 1.0,  name: '' },
    { at: 25, mult: 1.25, name: 'CALIENTE' },
    { at: 50, mult: 1.5,  name: 'ARDIENDO' },
    { at: 75, mult: 2.0,  name: 'INFERNAL' },
    { at: 95, mult: 3.0,  name: 'APOCALIPSIS' }
  ]
};
S.fire = 0; S.fireTier = 0; S.lastWeaponKill = null; S.noHitT = 0; S.peakFire = 0;
function fireMult() { return FIRE.tiers[S.fireTier].mult; }
function fireAdd(n, why) {
  if (!P.alive) return;
  const before = S.fireTier;
  S.fire = clamp(S.fire + n, 0, FIRE.max);
  S.peakFire = Math.max(S.peakFire, S.fire);
  updateFireTier(before);
}
function updateFireTier(before) {
  let t = 0; for (let i = FIRE.tiers.length - 1; i >= 0; i--) if (S.fire >= FIRE.tiers[i].at) { t = i; break; }
  S.fireTier = t;
  if (t > before && t > 0) {
    flashMsg(FIRE.tiers[t].name + '  x' + FIRE.tiers[t].mult.toFixed(2));
    sfx('rank'); screenPunch(0.35);
    const el = $('fireL'); if (el) { el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 220); }
  }
}
/* Se llama en cada baja: aqui se decide cuanto FUEGO gana el jugador. */
function fireOnKill(e) {
  let gain = FIRE.perKill;
  const quick = S.time - S.lastKillT < 1.2;
  if (quick) gain += FIRE.quickKillBonus;
  const wid = WEAPONS[wIdx].id;
  if (S.lastWeaponKill && S.lastWeaponKill !== wid) { gain += FIRE.weaponSwapBonus; addStyle('CAMBIO DE ARMA', 20); }
  S.lastWeaponKill = wid;
  if (!P.onGround && !hook.state) gain += FIRE.airBonus;
  if (e.d.heavy) gain += FIRE.heavyBonus;
  fireAdd(gain);
}
/* Se llama cada frame: sube por moverte rapido, baja si estas parado. */
function fireUpdate(dt) {
  const sp = Math.hypot(P.vel.x, P.vel.z);
  const nh0 = Math.floor(S.noHitT / 10); S.noHitT += dt;
  if (Math.floor(S.noHitT / 10) > nh0 && S.time - S.lastKillT < 6) { fireAdd(FIRE.noHitBonus); addStyle('SIN DANO', 25); }
  if (sp > FIRE.speedThreshold) fireAdd(FIRE.speedGain * dt);
  else if (S.time - S.lastKillT > FIRE.idleAfterKill) {
    const before = S.fireTier;
    S.fire = Math.max(0, S.fire - FIRE.decayIdle * dt);   // sin kills recientes y sin velocidad: se enfria
    updateFireTier(before);
  }
  const el = $('fireFill'); if (el) el.style.width = (S.fire / FIRE.max * 100) + '%';
  fireHud();
}
/* Actualiza la etiqueta y el brillo de bordes. Solo toca el DOM si el nivel cambio (ahorra rendimiento). */
let _fireHudKey = '';
function fireHud() {
  const key = S.fireTier + '|' + Math.round(S.fire / 5);
  if (key === _fireHudKey) return;
  _fireHudKey = key;
  const t = FIRE.tiers[S.fireTier];
  const lab = $('fireL'); if (lab) { lab.textContent = t.name ? t.name + '  x' + t.mult.toFixed(2) : 'FUEGO'; lab.style.opacity = S.fireTier ? 1 : 0.5; }
  const g = $('fireGlow');
  if (g) {
    const cols = ['0,0,0', '255,150,40', '255,110,20', '255,60,20', '255,30,30'];
    const inten = [0, 0.18, 0.3, 0.45, 0.62][S.fireTier];
    g.style.boxShadow = S.fireTier ? `inset 0 0 ${60 + S.fireTier * 22}px ${6 + S.fireTier * 4}px rgba(${cols[S.fireTier]},${inten})` : 'none';
    g.style.opacity = S.fireTier ? 1 : 0;
  }
}
function fireOnHurt() {
  S.noHitT = 0;
  const before = S.fireTier;
  S.fire = Math.max(0, S.fire - FIRE.decayHit);
  updateFireTier(before);
}

const feed = [];
function addStyle(label, pts) {
  S.rankT = Math.min(S.rankT + pts, 460);
  const before = S.rank;
  S.rank = 0; for (let r = RANKS.length - 1; r >= 0; r--) if (S.rankT >= RANKS[r].need) { S.rank = r; break; }
  S.mult = RANKS[S.rank].m;
  S.score += Math.round(pts * S.mult * fireMult() * 0.5);
  feed.unshift({ t: 2.2, txt: '+' + label }); if (feed.length > 4) feed.pop();
  if (S.rank > before) { sfx('rank'); const rl = $('rankL'); rl.classList.add('pop'); setTimeout(() => rl.classList.remove('pop'), 200); }
}

function waveComposition(wave) {
  const pool = ['husk', 'husk', 'husk'];
  if (wave >= 2) pool.push('shooter', 'shooter', 'imp', 'imp');
  if (wave >= 3) pool.push('charger', 'imp', 'bomber');
  if (wave >= 4) pool.push('sniper', 'bomber', 'shooter');
  if (wave >= 5) pool.push('brute');
  if (wave >= 6) pool.push('imp', 'bomber', 'charger');
  if (wave >= 7) pool.push('brute', 'sniper', 'imp');
  if (wave >= 9) pool.push('brute', 'charger', 'bomber');
  return pool;
}

/* NUEVO - "TEMAS" DE OLEADA
   Cada cierto numero de oleadas el juego cambia el ritmo del combate.
   Esto hace que las rondas no se sientan todas iguales. Son solo datos:
   puedes cambiar los numeros sin miedo.
     name   = texto que sale en pantalla
     pool   = lista de enemigos que pueden salir (se repiten para dar mas peso)
     mult   = multiplicador de cantidad de enemigos
     rush   = 1 = salen mas rapido, 0.6 = salen mas despacio
   El tema se elige con: (numero de oleada) % (cantidad de temas). */
const WAVE_THEMES = [
  { name: null,                 pool: null,                                          mult: 1.0,  rush: 1.0 },
  { name: 'HORDA',              pool: ['husk', 'husk', 'husk', 'imp', 'imp'],        mult: 1.5,  rush: 0.7 },
  { name: 'FRANCOTIRADORES',    pool: ['sniper', 'shooter', 'shooter', 'imp'],       mult: 0.8,  rush: 1.0 },
  { name: 'EMBESTIDA',          pool: ['charger', 'charger', 'imp', 'husk'],         mult: 1.0,  rush: 0.9 },
  { name: 'BOMBAS',             pool: ['bomber', 'bomber', 'bomber', 'husk', 'imp'], mult: 1.1,  rush: 0.85 },
  { name: 'PESADOS',            pool: ['brute', 'brute', 'shooter', 'charger'],      mult: 0.55, rush: 1.2 }
];
function waveTheme(wave) {
  if (wave < 4) return WAVE_THEMES[0];        // oleadas 1-3: normales, para aprender
  if (wave % 5 === 0) return WAVE_THEMES[0];  // oleadas de jefe: sin tema
  if (wave % 2 === 1) return WAVE_THEMES[0];  // las impares: normales (respiro)
  // las pares (4, 6, 8, 12...) rotan entre los temas especiales 1..5
  const special = WAVE_THEMES.length - 1;
  return WAVE_THEMES[1 + (Math.floor(wave / 2) % special)];
}

/* CUANTOS ENEMIGOS TIENE CADA OLEADA
   ANTES: se recortaba a 40 y a partir de la oleada ~10 la dificultad dejaba de subir.
   AHORA: el "total" de la oleada puede ser MAYOR que 40, porque los enemigos salen
   por goteo (nunca hay mas de MAX_ENEMIES_ONSCREEN a la vez en pantalla).
   Asi la oleada 20 es de verdad mas larga e intensa que la 10. */
function waveEnemyCount(wave) {
  const growth = 4 + wave * 2.1 + Math.pow(wave, 1.35) * 0.9;
  return Math.round(growth * CFG.enemyCount * waveTheme(wave).mult);
}
function waveSpawnInterval(wave) {
  return clamp((0.85 - wave * 0.055) * waveTheme(wave).rush, 0.14, 0.95);
}

function beginWave() {
  S.wave++;
  const isBoss = CFG.bossEvery > 0 && S.wave % CFG.bossEvery === 0;
  const theme = waveTheme(S.wave);
  S.waveIsBoss = isBoss;
  S.waveTheme = isBoss ? null : theme;
  S.waveState = 'spawning';
  S.waveTimer = 0;
  S.waveSpawnT = 0;
  S.waveSpawned = 0;
  S.waveFails = 0;          // NUEVO: intentos de aparicion que fallaron en esta oleada
  S.waveStall = 0;          // NUEVO: segundos seguidos sin ningun progreso (vigilante)
  S.waveKilledInWave = 0;
  S.waveLast = 0;
  // ANTES: Math.min(total, MAX_ENEMIES_ONSCREEN). Ahora el total puede ser mayor (ver waveEnemyCount).
  S.waveTarget = isBoss ? 1 + Math.floor(S.wave / 6) : waveEnemyCount(S.wave);
  S.wavePool = (theme.pool && !isBoss) ? theme.pool.slice() : waveComposition(S.wave);
  // Con un tema de "horda" y enemigos ligeros mezclamos unos pocos del pool normal para variar
  if (theme.pool && !isBoss && S.wave >= 8) S.wavePool.push(...waveComposition(S.wave).slice(-3));

  if (isBoss) {
    sfx('boss'); P.shake = 0.9;
    flashMsg('\u00a1JEFE: EL CARCELERO!');
  } else {
    sfx('wave');
    if (S.wave === 3) { WEAPONS[2].unlocked = true; flashMsg('RIEL DESBLOQUEADO'); }
    else if (S.wave === 5) { WEAPONS[3].unlocked = true; flashMsg('CLAVOS DESBLOQUEADO'); }
    else flashMsg(theme.name ? 'OLEADA ' + S.wave + ' \u00b7 ' + theme.name : 'OLEADA ' + S.wave);
  }
  addStyle('OLEADA', 15);
  $('waveNum').textContent = S.wave + (isBoss ? ' \u00b7 JEFE' : (theme.name ? ' \u00b7 ' + theme.name : ''));
}

/* ---------------------------------------------------------------------
   DONDE APARECEN LOS ENEMIGOS  (ARREGLADO)
   Problema que habia: un punto de aparicion podia estar DENTRO de una pared
   o pilar (medimos un 38% de puntos asi en niveles de prueba). El "plan B"
   ademas sumaba +4 en altura, pero spawnEnemy() lo ignoraba, y el enemigo
   podia nacer ATRAPADO dentro de un bloque, sin poder moverse jamas.
   AHORA: probamos muchos puntos, comprobamos que haya suelo debajo y espacio
   libre, y si todo falla usamos un punto de emergencia sobre el suelo central.
   --------------------------------------------------------------------- */
function isSpawnClear(x, z, size) {
  const fy = world.floorY(x, z);
  if (fy <= world.lavaY + 0.5) return null;                 // no hay suelo: caeria a la lava
  const y = fy + size[1] / 2 + 0.05;
  const r = Math.max(size[0], size[2]) / 2 + 0.25;
  // el cuerpo completo debe caber sin tocar ninguna caja
  if (world.isBlocked(x, y - size[1] / 2 + 0.05, z, r, size[1] - 0.1)) return null;
  return y;
}
function pickSpawnPoint(size) {
  size = size || [1, 1.8, 1];
  const px = P.pos.x, pz = P.pos.z;
  const tryList = (minDist, tries) => {
    const src = spawnPoints;
    for (let t = 0; t < tries && src.length; t++) {
      const sp = src[Math.floor(Math.random() * src.length)];
      if (Math.hypot(sp.x - px, sp.z - pz) < minDist) continue;
      // probamos el punto y un par de desplazamientos pequenos alrededor
      for (let k = 0; k < 3; k++) {
        const x = sp.x + (k ? (Math.random() - 0.5) * 3 : 0), z = sp.z + (k ? (Math.random() - 0.5) * 3 : 0);
        const y = isSpawnClear(x, z, size);
        if (y !== null) return new THREE.Vector3(x, y, z);
      }
    }
    return null;
  };
  let p = tryList(16, 24) || tryList(8, 24) || tryList(0, 40);
  if (p) return p;
  // Emergencia: puntos aleatorios sobre el suelo central del nivel (siempre es suelo firme)
  for (let t = 0; t < 40; t++) {
    const x = (Math.random() - 0.5) * 26, z = (Math.random() - 0.5) * 26;
    const y = isSpawnClear(x, z, size);
    if (y !== null && Math.hypot(x - px, z - pz) > 5) return new THREE.Vector3(x, y, z);
  }
  return new THREE.Vector3(0, 0.9 + 0.05 + 2, 0);              // ultimo recurso: sobre el centro
}

/* Aparece UN enemigo del pool. Devuelve true solo si de verdad aparecio.
   ANTES: se contaba como "spawneado" aunque fallara. AHORA solo cuenta si existe. */
function spawnFromPool() {
  const type = S.wavePool[Math.floor(Math.random() * S.wavePool.length)];
  const d = ETYPES[type];
  if (!d) { S.waveFails++; return false; }
  let e = null;
  try { e = spawnEnemy(type, pickSpawnPoint(d.size)); }
  catch (err) { if (CFG.debug) console.error('Fallo al crear enemigo', type, err); e = null; }
  if (!e) { S.waveFails++; return false; }
  S.waveSpawned++;
  return true;
}

/* ---------------------------------------------------------------------
   VIGILANTE ANTI-BLOQUEO
   Garantiza que ninguna oleada se quede parada para siempre. Cada segundo
   comprueba si "algo esta pasando" (sale un enemigo, muere uno, o el jugador
   avanza). Si pasan varios segundos sin progreso, actua:
     1) Si faltan enemigos por salir y hay hueco -> fuerza una aparicion.
     2) Si hay enemigos vivos pero atrapados/lejos (sin moverse) -> los
        recoloca cerca del jugador en un sitio seguro.
     3) Si la oleada esta a punto de agotar su tiempo -> la cierra.
   --------------------------------------------------------------------- */
function relocateStuckEnemies() {
  let moved = 0;
  for (const e of enemies) {
    if (e.d.boss) continue;
    const p = e.mesh.position;
    e.stuckT = e.stuckT || 0;
    const lastX = e.lastX === undefined ? p.x : e.lastX, lastZ = e.lastZ === undefined ? p.z : e.lastZ;
    const moving = Math.hypot(p.x - lastX, p.z - lastZ) > 0.6;
    e.lastX = p.x; e.lastZ = p.z;
    const ranged = e.type === 'sniper' || e.type === 'shooter';
    if (moving || ranged) { e.stuckT = 0; continue; }
    e.stuckT += 1;                                   // se llama 1 vez por segundo
    if (e.stuckT >= 6) {                             // 6 s inmovil = atrapado
      const np = pickSpawnPoint(e.d.size);
      p.copy(np); e.vel.set(0, 0, 0); e.stuckT = 0; e.lastX = np.x; e.lastZ = np.z;
      impactRing(new THREE.Vector3(np.x, np.y - 0.8, np.z), 0xff5a20, 1.2);
      moved++;
    }
  }
  return moved;
}

function updateWaves(dt) {
  if (S.waveState === 'idle') {
    S.waveTimer -= dt;
    $('waveTimer').textContent = '';
    if (S.waveTimer <= 0) beginWave();
    return;
  }

  if (S.waveState === 'spawning') {
    S.waveSpawnT -= dt;
    // Se permite mas de un spawn por frame si el juego va lento (asi el ritmo no depende de los FPS)
    let guard = 0;
    while (S.waveSpawnT <= 0 && S.waveSpawned < S.waveTarget && enemies.length < MAX_ENEMIES_ONSCREEN && guard++ < 4) {
      if (S.waveIsBoss) {
        const bp = new THREE.Vector3(0, 1.2, -18);
        let bs = null;
        try { bs = spawnEnemy('warden', bp); } catch (err) { bs = null; }
        if (bs) { bs.hp = bs.d.hp + S.wave * 45; bs.maxHp = bs.hp; bossActive = true; $('bossBar').classList.add('on'); S.waveSpawned++; }
        else S.waveFails++;
      } else {
        spawnFromPool();
      }
      S.waveSpawnT += waveSpawnInterval(S.wave);
      if (S.waveFails > 40) break;                   // demasiados fallos: dejamos que actue el vigilante
    }
    // La oleada pasa a "activa" cuando ya salieron todos, o cuando ya no se puede seguir intentando
    if (S.waveSpawned >= S.waveTarget || S.waveFails > 40) S.waveState = 'active';
    $('waveTimer').textContent = S.waveSpawned + '/' + S.waveTarget;
  }

  if (S.waveState === 'active' || S.waveState === 'spawning') {
    S.waveTimer += dt;
    if (S.waveState === 'active') $('waveTimer').textContent = enemies.length + ' vivos';

    // --- vigilante: se ejecuta 1 vez por segundo ---
    S.waveWatch = (S.waveWatch || 0) + dt;
    if (S.waveWatch >= 1) {
      S.waveWatch -= 1;
      const sig = S.waveSpawned + '|' + enemies.length + '|' + S.kills;
      if (sig === S.waveSig) S.waveStall++; else { S.waveStall = 0; S.waveSig = sig; }
      relocateStuckEnemies();
      /* NUEVO - "LOS ULTIMOS": cuando ya salieron todos y quedan pocos, en vez de esperar
         45 s a que se acabe el tiempo, los traemos cerca del jugador. Asi no hay que buscar
         al ultimo enemigo por todo el mapa. Se activa tras 12 s con <= 3 enemigos vivos. */
      if (S.waveState === 'active' && enemies.length > 0 && enemies.length <= 3) {
        S.waveLast = (S.waveLast || 0) + 1;
        if (S.waveLast >= 12) {
          for (const e of enemies) {
            if (e.d.boss) continue;
            const d = Math.hypot(e.mesh.position.x - P.pos.x, e.mesh.position.z - P.pos.z);
            if (d > 22) {
              const np = pickSpawnPoint(e.d.size);            // nuevo punto seguro, preferentemente lejos... 
              const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 6;
              const x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
              const y = isSpawnClear(x, z, e.d.size);
              const dest = y !== null ? new THREE.Vector3(x, y, z) : np;    // cerca del jugador si hay sitio, si no punto seguro
              e.mesh.position.copy(dest); e.vel.set(0, 0, 0);
              impactRing(new THREE.Vector3(dest.x, dest.y - 0.8, dest.z), 0xff5a20, 1.4);
            }
          }
          flashMsg('\u00a1QUEDAN ' + enemies.length + '!');
          S.waveLast = -8;                                    // espera 20 s antes de volver a hacerlo
        }
      } else S.waveLast = 0;
      // 6 s sin progreso y todavia faltan enemigos por salir -> forzamos aparicion
      if (S.waveState === 'spawning' && S.waveStall >= 6 && S.waveSpawned < S.waveTarget) {
        if (enemies.length >= MAX_ENEMIES_ONSCREEN) { relocateStuckEnemies(); }
        else { for (let k = 0; k < 3 && S.waveSpawned < S.waveTarget; k++) spawnFromPool(); }
        S.waveStall = 0;
      }
    }

    const noMoreToSpawn = S.waveSpawned >= S.waveTarget || S.waveFails > 40;
    const cleared = enemies.length === 0 && noMoreToSpawn;
    // Tiempo maximo: solo cuenta cuando ya salieron todos (asi una oleada larga no se corta antes de tiempo)
    const timedOut = S.waveState === 'active' && S.waveTimer > CFG.waveMaxTime + Math.min(30, S.wave * 1.5);
    // Red de seguridad final: ninguna oleada dura mas de 3 minutos pase lo que pase
    const hardLimit = S.waveTimer > 180;
    if (cleared || timedOut || hardLimit) {
      if ((timedOut || hardLimit) && enemies.length > 0) {
        for (const e of [...enemies]) killEnemyQuiet(e);
        flashMsg('OLEADA FORZADA');
      }
      S.waveState = 'idle';
      S.waveTimer = 1.6;
      S.waveWatch = 0; S.waveStall = 0; S.waveSig = '';
      if (bossActive) { bossActive = false; $('bossBar').classList.remove('on'); }
    }
  }
}

let msgTimer = null;
function flashMsg(t) {
  const m = $('msg'); m.textContent = t; m.style.opacity = 1; m.classList.add('pop');
  setTimeout(() => m.classList.remove('pop'), 260);
  clearTimeout(msgTimer); msgTimer = setTimeout(() => m.style.opacity = 0, 1600);
}

let hurtFx = 0;
function hurtPlayer(d) {
  if (!P.alive || P.iframes > 0 || CFG.god) return;
  const dmg = CFG.oneShot ? 9999 : d * CFG.enemyDmg;
  if (dmg <= 0) return;
  P.hp -= dmg; P.iframes = 0.25; hurtFx = 1;
  fireOnHurt();
  const el = $('dmg'); el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 180);
  haptic(60); P.shake = Math.max(P.shake || 0, 0.4); sfx('hurt');
  S.style = Math.max(0, S.style - 2);
  $('hpFill').classList.toggle('low', P.hp < 30);
  if (P.hp <= 0) die('MUERTO');
}
function die(title) {
  if (!P.alive) return;
  P.alive = false; S.running = false;
  hookRelease(false);
  sfx('death');
  musicStop();
  burst(new THREE.Vector3(P.pos.x, P.pos.y - 1, P.pos.z), 0xd40f0f, 30, 9);
  P.shake = 1.2;
  postMat.uniforms.uFlash.value = 1;
  const fadeFlash = () => { postMat.uniforms.uFlash.value = Math.max(0, postMat.uniforms.uFlash.value - 0.04); if (postMat.uniforms.uFlash.value > 0) requestAnimationFrame(fadeFlash); };
  requestAnimationFrame(fadeFlash);
  $('deadTitle').textContent = title;
  $('deadInfo').innerHTML = `Oleada ${S.wave} \u00b7 Rango ${RANKS[S.rank].n || '-'}<br>Puntos ${S.score}<br>Bajas ${S.kills} (${S.airKills} aereas)<br>Parries ${S.parries} \u00b7 Fuego maximo ${Math.round(S.peakFire)}<br>Semilla: ${currentSeedStr}`;
  setTimeout(() => { showScreen('dead'); setControls(false); }, 260);
}

let lastSafe = new THREE.Vector3();
function checkLava() {
  if (P.onGround && P.pos.y > 0) { lastSafe.copy(P.pos); }
  const feet = P.pos.y - P.h;
  if (feet <= world.lavaY + 0.4 && P.alive) {
    burst(new THREE.Vector3(P.pos.x, world.lavaY + 0.4, P.pos.z), 0xff8a20, 30, 10);
    burst(new THREE.Vector3(P.pos.x, world.lavaY + 0.4, P.pos.z), 0xffe060, 16, 6);
    if (CFG.god || !CFG.lava) {
      P.pos.copy(lastSafe.lengthSq() ? lastSafe : world.spawn); P.pos.y += 1.5; P.vel.set(0, 6, 0);
      hookRelease(false);
      return;
    }
    const f = $('lavaFlash'); f.style.transition = 'none'; f.style.opacity = 0.95;
    requestAnimationFrame(() => { f.style.transition = 'opacity 1.2s'; f.style.opacity = 0; });
    haptic([80, 40, 120]);
    P.hp = 0; sfx('lava');
    die('INCINERADO');
  }
}

/* =====================================================================
   ENTRADA TACTIL
   ===================================================================== */
const IN = { mx: 0, mz: 0, fire: false, alt: false, jump: false, dash: false, slide: false, slideHeld: false, jumpHeld: false };

const stickEl = $('stick'), knob = stickEl.querySelector('i');
let stickId = null, stickOrigin = { x: 0, y: 0 }, lookId = null, lookLast = { x: 0, y: 0 };
const STICK_R = 55;

function bindZone(el, role) {
  el.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (role === 'move' && stickId === null) {
        stickId = t.identifier; stickOrigin = { x: t.clientX, y: t.clientY };
        stickEl.style.display = 'block';
        stickEl.style.left = (t.clientX - 60) + 'px'; stickEl.style.top = (t.clientY - 60) + 'px';
        knob.style.transform = 'translate(0,0)';
      } else if (role === 'look' && lookId === null) {
        lookId = t.identifier; lookLast = { x: t.clientX, y: t.clientY };
      }
    }
  }, { passive: false });
  el.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = t.clientX - stickOrigin.x, dy = t.clientY - stickOrigin.y;
        const l = Math.hypot(dx, dy);
        if (l > STICK_R) { dx *= STICK_R / l; dy *= STICK_R / l; }
        knob.style.transform = `translate(${dx}px,${dy}px)`;
        IN.mx = dx / STICK_R; IN.mz = dy / STICK_R;
      } else if (t.identifier === lookId) {
        const dx = t.clientX - lookLast.x, dy = t.clientY - lookLast.y;
        lookLast = { x: t.clientX, y: t.clientY };
        const k = 0.0052 * CFG.sens;
        P.yaw -= dx * k;
        P.pitch = clamp(P.pitch - dy * k, -1.5, 1.5);
      }
    }
  }, { passive: false });
  const end = e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickId = null; IN.mx = IN.mz = 0; stickEl.style.display = 'none'; }
      if (t.identifier === lookId) lookId = null;
    }
  };
  el.addEventListener('touchend', end, { passive: false });
  el.addEventListener('touchcancel', end, { passive: false });
}
bindZone($('movezone'), 'move');
bindZone($('lookzone'), 'look');

function bindBtn(id, down, up) {
  const el = $(id);
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); down && down(); }, { passive: false });
  const end = e => { e.preventDefault(); e.stopPropagation(); el.classList.remove('down'); up && up(); };
  el.addEventListener('touchend', end, { passive: false });
  el.addEventListener('touchcancel', end, { passive: false });
  el.addEventListener('mousedown', () => { el.classList.add('down'); down && down(); });
  el.addEventListener('mouseup', () => { el.classList.remove('down'); up && up(); });
}
bindBtn('bFire', () => IN.fire = true, () => IN.fire = false);
bindBtn('bJump', () => {
  IN.jump = true; IN.jumpHeld = true;
  const now = performance.now();
  if (now - P.lastJumpTap < 260) IN.bhop = true;
  P.lastJumpTap = now;
}, () => IN.jumpHeld = false);
bindBtn('bDash', () => IN.dash = true);
bindBtn('bSlide', () => { IN.slide = true; IN.slideHeld = true; }, () => IN.slideHeld = false);
bindBtn('bHook', () => { hook.held = true; if (hook.state === 0) hookFire(); }, () => { hook.held = false; if (hook.state === 2 || hook.state === 3) hookRelease(true); });
bindBtn('bSwap', () => nextWeapon());
bindBtn('bMenu', () => openMod('game'));

const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { IN.jump = true; IN.jumpHeld = true; }
  if (e.code === 'ShiftLeft') IN.dash = true;
  if (e.code === 'ControlLeft' || e.code === 'KeyC') { IN.slide = true; IN.slideHeld = true; }
  if (e.code === 'KeyQ') nextWeapon();
  if (e.code === 'KeyE') { hook.held = true; if (hook.state === 0) hookFire(); }
  if (e.code === 'Escape') openMod('game');
});
addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space') IN.jumpHeld = false;
  if (e.code === 'ControlLeft' || e.code === 'KeyC') IN.slideHeld = false;
  if (e.code === 'KeyE') { hook.held = false; if (hook.state === 2 || hook.state === 3) hookRelease(true); }
});

/* =====================================================================
   MOVIMIENTO
   ===================================================================== */
let slamPending = false;
function updatePlayer(dt) {
  if (!P.alive) return;
  if (slamPending && P.onGround) {
    slamPending = false;
    const c = new THREE.Vector3(P.pos.x, P.pos.y - P.h + 0.2, P.pos.z);
    sfx('slam'); P.shake = Math.max(P.shake || 0, 0.7); haptic([40, 20, 60]); hitStop = 0.06;
    burst(c, 0x8a6a4a, 24, 10);
    impactRing(c, 0xffc933, 3.5); sparks(c, 12, 0xffe08a); // NUEVO: onda al aterrizar con SLIDE
    let hitN = 0;
    for (const e of [...enemies]) {
      const d = e.mesh.position.distanceTo(c);
      if (d < 8) { hitN++; damageEnemy(e, 60 * (1 - d / 10)); if (enemies.includes(e) && !e.d.heavy) { e.vel.y = 9; const a = new THREE.Vector3().subVectors(e.mesh.position, c).setY(0).normalize(); e.vel.x = a.x * 14; e.vel.z = a.z * 14; } }
    }
    if (hitN) addStyle('IMPACTO x' + hitN, 25 * hitN);
  }
  P.iframes -= dt;

  let mx = IN.mx, mz = IN.mz;
  if (keys.KeyA) mx -= 1; if (keys.KeyD) mx += 1; if (keys.KeyW) mz -= 1; if (keys.KeyS) mz += 1;
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const sinY = Math.sin(P.yaw), cosY = Math.cos(P.yaw);
  const wishX = (mx * cosY + mz * sinY);
  const wishZ = (-mx * sinY + mz * cosY);
  const spd = WALK * CFG.speed;

  const wantLean = clamp(-mx, -1, 1) * (P.onGround ? 1 : 0.6);
  P.lean = lerp(P.lean, wantLean * 0.08, Math.min(1, dt * 8));
  P.speedFx = lerp(P.speedFx, clamp((Math.hypot(P.vel.x, P.vel.z) - WALK) / 22, 0, 1), Math.min(1, dt * 6));

  if (CFG.fly) {
    P.vel.x = lerp(P.vel.x, wishX * spd * 1.6, Math.min(1, dt * 10));
    P.vel.z = lerp(P.vel.z, wishZ * spd * 1.6, Math.min(1, dt * 10));
    const vy = (IN.jumpHeld ? 1 : 0) - (IN.slideHeld ? 1 : 0);
    P.vel.y = lerp(P.vel.y, vy * spd, Math.min(1, dt * 10));
    movePlayer(dt);
    return;
  }

  P.coyote = P.onGround ? 0.1 : P.coyote - dt;
  if (IN.jump) P.jumpBuf = 0.12; else P.jumpBuf -= dt;

  if (IN.dash) {
    IN.dash = false;
    if (P.dashT <= 0 && (P.stamina >= DASH_COST || CFG.infStamina)) {
      if (!CFG.infStamina) P.stamina -= DASH_COST;
      P.dashT = DASH_TIME; sfx('dash');
      if (ml > 0.1) P.dashDir.set(wishX, 0, wishZ).normalize();
      else P.dashDir.set(-sinY, 0, -cosY);
      P.iframes = Math.max(P.iframes, DASH_TIME);
      P.vel.y = Math.max(P.vel.y, 0);
      haptic(15);
      sparks(new THREE.Vector3(P.pos.x, P.pos.y - 1.2, P.pos.z), 6, 0xffc933); // NUEVO: chispas al hacer dash
    }
  }
  if (P.dashT > 0) {
    P.dashT -= dt;
    P.vel.x = P.dashDir.x * DASH_SPEED * CFG.speed;
    P.vel.z = P.dashDir.z * DASH_SPEED * CFG.speed;
    P.vel.y = 0;
  } else {
    const wantSlide = IN.slideHeld;
    if (wantSlide && P.onGround && !P.sliding) {
      P.sliding = true; sfx('slide');
      const cur = Math.hypot(P.vel.x, P.vel.z);
      const dir = ml > 0.1 ? new THREE.Vector3(wishX, 0, wishZ).normalize() : new THREE.Vector3(-sinY, 0, -cosY);
      const boost = Math.max(cur, SLIDE_SPEED * CFG.speed);
      P.vel.x = dir.x * boost; P.vel.z = dir.z * boost;
    }
    if (P.sliding && !wantSlide) P.sliding = false;

    if (IN.slide && !P.onGround) { P.vel.y = -38; slamPending = true; }
    IN.slide = false;

    const swinging = hook.state === 2 || hook.state === 3;
    if (P.sliding) {
      const f = Math.pow(0.35, dt);
      P.vel.x *= f; P.vel.z *= f;
      if (Math.hypot(P.vel.x, P.vel.z) < 4) P.sliding = false;
    } else if (P.onGround && !swinging) {
      const ax = wishX * spd, az = wishZ * spd;
      const a = ACCEL * dt;
      P.vel.x += clamp(ax - P.vel.x, -a, a);
      P.vel.z += clamp(az - P.vel.z, -a, a);
    } else {
      const a = (swinging ? AIR_ACCEL * 0.6 : AIR_ACCEL) * dt;
      const cur = Math.hypot(P.vel.x, P.vel.z);
      const lim = Math.max(spd, cur);
      P.vel.x += wishX * a; P.vel.z += wishZ * a;
      const nl = Math.hypot(P.vel.x, P.vel.z);
      if (nl > lim && !swinging) { P.vel.x *= lim / nl; P.vel.z *= lim / nl; }
    }
    P.vel.y -= G * CFG.gravity * dt;
  }

  if (P.jumpBuf > 0 && P.coyote > 0) {
    P.vel.y = JUMP_V * CFG.jump; sfx('jump');
    P.jumpBuf = 0; P.coyote = 0; P.onGround = false;
    if (P.sliding) { P.vel.x *= 1.12; P.vel.z *= 1.12; P.sliding = false; }
    if (IN.bhop) { const l = Math.hypot(P.vel.x, P.vel.z); if (l > 0.1) { P.vel.x *= 1.15; P.vel.z *= 1.15; } IN.bhop = false; }
    haptic(8);
  }
  IN.jump = false;

  movePlayer(dt);

  const regen = P.onGround ? 1.1 : 0.7;
  if (!CFG.infStamina) P.stamina = Math.min(P.maxStamina, P.stamina + regen * dt);
  else P.stamina = P.maxStamina;

  checkLava();
  if (P.pos.y < -60) { P.pos.copy(world.spawn); P.vel.set(0, 0, 0); }
}

/* =====================================================================
   DISPARO
   ===================================================================== */
function fire() {
  const w = WEAPONS[wIdx];
  if (fireCd > 0) return;
  const inf = CFG.infAmmo || ammoState[w.id] === Infinity;
  if (!inf && ammoState[w.id] <= 0) { setWeapon(0); return; }
  if (!inf) ammoState[w.id]--;
  fireCd = w.rate / CFG.fireRate;
  gunKick = 1;
  haptic(w.id === 'shotgun' ? 30 : 10);
  sfx(w.id); parryT = CFG.parryWindow;
  P.shake = Math.max(P.shake || 0, w.id === 'shotgun' ? 0.22 : 0.08);
  triggerMuzzle(w.color, w.id === 'shotgun' ? 1.8 : (w.id === 'rail' ? 1.5 : 1)); // NUEVO: destello del canon

  const origin = camera.position.clone();
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

  const mz = new THREE.Vector3(0.32, -0.28, -1.1).applyMatrix4(camera.matrixWorld);
  burst(mz, w.color, 5, 4.5);

  for (let p = 0; p < w.pellets; p++) {
    const dir = fwd.clone().addScaledVector(right, (Math.random() - 0.5) * w.spread * 2).addScaledVector(up, (Math.random() - 0.5) * w.spread * 2).normalize();
    const wallT = rayWorld(origin, dir, w.range);
    let hitAny = false;
    const hits = [];
    for (const e of enemies) { const t = rayEnemy(origin, dir, e); if (t < Math.min(wallT, w.range)) hits.push({ e, t }); }
    hits.sort((a, b) => a.t - b.t);
    if (w.pierce) for (const h of hits) { damageEnemy(h.e, w.dmg); hitAny = true; }
    else if (hits.length) { damageEnemy(hits[0].e, w.dmg); hitAny = true; }
    const endT = hitAny && !w.pierce ? hits[0].t : Math.min(wallT, w.range);
    tracer(origin, dir, endT, w.color);
    if (!hitAny && wallT < w.range) {
      const hp = origin.clone().addScaledVector(dir, wallT - 0.1);
      burst(hp, 0xffc933, 3, 3);
      if (p === 0) impactRing(hp, w.color, 0.7); // NUEVO: marca de impacto en paredes (1 por disparo)
    }
  }
  updateWeaponHUD();
}
const tracers = [];
const tracerGeo = new THREE.BoxGeometry(0.035, 0.035, 1);
function tracer(o, d, len, color) {
  const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color }));
  const start = o.clone().addScaledVector(d, 0.7).add(new THREE.Vector3(0.3, -0.25, 0).applyQuaternion(camera.quaternion));
  const end = o.clone().addScaledVector(d, len);
  m.position.copy(start).lerp(end, 0.5);
  m.scale.z = start.distanceTo(end);
  m.lookAt(end);
  scene.add(m); tracers.push({ m, life: 0.07 });
}
function updateTracers(dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    tracers[i].life -= dt;
    if (tracers[i].life <= 0) { scene.remove(tracers[i].m); tracers[i].m.material.dispose(); tracers.splice(i, 1); }
  }
}

function haptic(ms) { if (CFG.haptic && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

/* =====================================================================
   BUCLE PRINCIPAL
   ===================================================================== */
let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsShow = 0, gt = 0;
const dbg = document.createElement('div');
dbg.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9;font:11px monospace;color:#0f0;background:rgba(0,0,0,.6);padding:4px;display:none;pointer-events:none;white-space:pre';
document.body.appendChild(dbg);
let hpGhostVal = 100;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = clamp((now - last) / 1000, 0, 0.05); last = now;
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) { fpsShow = Math.round(fpsN / fpsAcc); fpsAcc = fpsN = 0; }
  gt += dt;

  try {
    if (S.running && !S.paused) {
      dt *= CFG.timeScale;
      if (hitStop > 0) { hitStop -= dt; dt *= 0.06; }
      S.time += dt;
      fireCd -= dt;
      const steps = Math.max(1, Math.ceil(dt / 0.016));
      for (let i = 0; i < steps; i++) updatePlayer(dt / steps);
      updateHook(dt);
      parryT = Math.max(0, parryT - dt);
      updateEnemies(dt); updateProjectiles(dt); updateParticles(dt); updateTracers(dt);
      updateFx(dt); updatePickups(dt); updateMusic(dt); updateLasers();
      updateWaves(dt);
      fireUpdate(dt);
      S.rankT = Math.max(0, S.rankT - dt * (6 + S.rank * 5));
      {
        let r = 0; for (let k = RANKS.length - 1; k >= 0; k--) if (S.rankT >= RANKS[k].need) { r = k; break; }
        S.rank = r; S.mult = RANKS[r].m;
      }

      if (IN.fire) fire();

      S.styleT -= dt; if (S.styleT <= 0) S.style = Math.max(0, S.style - dt * 3);
    } else {
      updateMusic(dt); // asegura que la musica de archivo se pause en pausa/menu
    }
  } catch (err) {
    if (CFG.debug) console.error('Error de simulacion capturado:', err);
  }

  updateMuzzle(dt);
  updatePunch(dt);
  lavaUniforms.uTime.value = gt;
  animateDecor(gt);
  updateEmbers(dt, gt);

  const speedH = Math.hypot(P.vel.x, P.vel.z);
  P.bob += speedH * 0.0006 * (P.onGround ? 1 : 0);
  const eye = P.sliding ? EYE_SLIDE : EYE;
  let shx = 0, shy = 0;
  if (P.shake > 0) { shx = (Math.random() - 0.5) * P.shake * 0.18; shy = (Math.random() - 0.5) * P.shake * 0.18; P.shake = Math.max(0, P.shake - dt * 2.2); }
  camera.position.set(P.pos.x + shx, P.pos.y - P.h + eye + Math.sin(P.bob * 60) * 0.03 * (P.onGround ? 1 : 0) + shy, P.pos.z);
  const tilt = P.sliding ? -0.08 : (hook.state === 2 ? -0.05 : P.lean);
  camera.rotation.set(P.pitch, P.yaw, tilt);
  const targetFov = CFG.fov + (P.dashT > 0 ? 14 : 0) + clamp(speedH - WALK, 0, 24) * 0.45 + P.speedFx * 4;
  camera.fov = lerp(camera.fov, targetFov, 0.2);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  gunKick = Math.max(0, gunKick - 0.14);
  gunGroup.position.z = -0.62 + gunKick * 0.14;
  gunGroup.rotation.x = gunKick * 0.14;
  gunGroup.rotation.z = lerp(gunGroup.rotation.z || 0, -P.lean * 1.4, 0.2);
  gunGroup.position.y = -0.3 + Math.sin(P.bob * 60) * 0.006 * (P.onGround ? 1 : 0);
  gunGroup.position.x = 0.32 + P.speedFx * Math.sin(gt * 10) * 0.01;

  postMat.uniforms.uTime.value = gt;
  postMat.uniforms.uAberr.value = lerp(postMat.uniforms.uAberr.value, (P.dashT > 0 ? 1 : 0) + clamp((speedH - 14) / 20, 0, 0.7), 0.25);
  const feetH = P.pos.y - P.h - world.lavaY;
  postMat.uniforms.uHeat.value = lerp(postMat.uniforms.uHeat.value, clamp(1 - feetH / 14, 0, 1), 0.1);
  hurtFx = Math.max(0, hurtFx - dt * 3);
  postMat.uniforms.uHurt.value = hurtFx;
  postMat.uniforms.uDither.value = CFG.dither;
  postMat.uniforms.uPost.value = CFG.post ? 1 : 0;

  // --- HUD ---
  const hpNow = clamp(P.hp, 0, 100);
  $('hpFill').style.width = hpNow + '%';
  // NUEVO: la barra "fantasma" baja despacio y deja ver cuanta vida perdiste
  if (hpNow >= hpGhostVal) hpGhostVal = hpNow;
  $('hpGhost').style.width = hpGhostVal + '%';
  hpGhostVal = lerp(hpGhostVal, hpNow, 0.03);
  $('stFill').style.width = (P.stamina / P.maxStamina * 100) + '%';
  // NUEVO: lineas de velocidad en los bordes cuando vas muy rapido
  $('speedLines').style.opacity = clamp((speedH - 18) / 16, 0, 0.9);
  {
    const sv = $('scoreV');
    if (sv.dataset.last !== String(S.score)) { sv.classList.add('pop'); setTimeout(() => sv.classList.remove('pop'), 100); sv.dataset.last = String(S.score); }
  }
  $('scoreV').textContent = S.score;
  $('killsV').textContent = S.kills + ' bajas';
  $('style').textContent = '';
  {
    const R0 = RANKS[S.rank], R1 = RANKS[Math.min(S.rank + 1, RANKS.length - 1)];
    $('rankL').textContent = R0.n; $('rankL').style.color = ['#888', '#aaa', '#9ec', '#8f8', '#ffd54a', '#ff9a30', '#ff5a20', '#ff2a2a'][S.rank] || '#fff';
    $('rankFill').style.width = (S.rank >= RANKS.length - 1 ? 100 : clamp((S.rankT - R0.need) / Math.max(1, R1.need - R0.need), 0, 1) * 100) + '%';
    $('rankMult').textContent = S.rank ? 'x' + R0.m.toFixed(1) + ' PUNTOS' : '';
    for (const f of feed) f.t -= dt;
    while (feed.length && feed[feed.length - 1].t <= 0) feed.pop();
    const fh = feed.map(f => '<div>' + f.txt + '</div>').join('');
    if ($('feed').dataset.h !== fh) { $('feed').innerHTML = fh; $('feed').dataset.h = fh; }
    if (bossActive) { const bs = enemies.find(x => x.d.boss); if (bs) $('bossFill').style.width = clamp(bs.hp / (bs.maxHp || bs.d.hp) * 100, 0, 100) + '%'; }
  }
  if (CFG.debug) {
    dbg.style.display = 'block';
    dbg.textContent = `FPS ${fpsShow}  vel ${speedH.toFixed(1)}  y ${P.pos.y.toFixed(1)}\nenemigos ${enemies.length}/${S.waveTarget}  estado-oleada ${S.waveState}\nsuelo ${P.onGround}  gancho ${['reposo','lanzado','pared','enemigo'][hook.state]}\nsemilla ${currentSeedStr}\naudio: ${Object.keys(AU.buffers).length} efectos + ${Object.keys(AU.musicFile).length} musicas desde archivo`;
  } else dbg.style.display = 'none';

  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  postMat.uniforms.tDiffuse.value = rt.texture;
  renderer.render(postScene, postCam);
}

/* =====================================================================
   PANTALLAS Y MENUS
   ===================================================================== */
function showScreen(id) { for (const s of ['title', 'pause', 'dead']) $(s).classList.toggle('on', s === id); }
function setControls(on) { $('ctl').classList.toggle('on', on); $('hud').classList.toggle('on', on); }
function randomSeed() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function newRun(seed) {
  for (const e of [...enemies]) killEnemyQuiet(e);
  for (const p of projectiles) { scene.remove(p.mesh); disposeGroup(p.mesh); } projectiles.length = 0;
  for (const p of particles) { scene.remove(p.mesh); } particles.length = 0;
  for (const t of tracers) { scene.remove(t.m); } tracers.length = 0;
  hookRelease(false); hook.cd = 0;
  WEAPONS.forEach((w, i) => w.unlocked = i < 2);
  resetAmmo(); setWeapon(0);
  S.wave = 0; S.score = 0; S.kills = 0; S.style = 0; S.time = 0;
  S.parries = 0; S.mult = 1; S.rank = 0; S.rankT = 0; S.airKills = 0; S.chain = 0; S.lastKillT = -9;
  S.fire = 0; S.fireTier = 0; S.lastWeaponKill = null; S.noHitT = 0; S.peakFire = 0; _fireHudKey = ''; fireHud();
  S.waveState = 'idle'; S.waveTarget = 0; S.waveSpawned = 0; S.waveTimer = 0.8; S.waveSpawnT = 0; S.wavePool = ['husk'];
  AU.lastFightT = undefined; bossActive = false; $('bossBar').classList.remove('on'); feed.length = 0; parryT = 0; hitStop = 0; slamPending = false;
  for (const k of pickups) { scene.remove(k.mesh); } pickups.length = 0;
  for (const f of fx) { scene.remove(f.m); } fx.length = 0;
  for (const l of laserMeshes) l.visible = false;
  postMat.uniforms.uFlash.value = 0;
  $('hpFill').classList.remove('low');
  hpGhostVal = 100;
  musicStop();
  generateLevel(seed || CFG.seed || randomSeed());
  $('seedIn').value = currentSeedStr;
  resetPlayer(); lastSafe.copy(world.spawn);
  $('waveNum').textContent = '0';
  S.running = true; S.paused = false;
  showScreen(null); setControls(true);
}

function openMod(from) {
  if (from === 'game') { S.paused = true; setControls(false); }
  $('mod').dataset.from = from;
  $('mod').classList.add('on');
  $('seedIn').value = currentSeedStr;
}
function closeMod() {
  $('mod').classList.remove('on');
  const from = $('mod').dataset.from;
  if (from === 'game') { S.paused = false; setControls(true); }
  else if (from === 'pause') showScreen('pause');
  else showScreen('title');
}

/* NUEVO: sonido de boton en todos los botones de los menus */
document.querySelectorAll('.big, .mbtn').forEach(b => b.addEventListener('touchstart', () => sfx('button'), { passive: true }));

$('bStart').onclick = () => newRun(CFG.seed);
$('bModT').onclick = () => { showScreen(null); openMod('title'); };
$('bModP').onclick = () => { showScreen(null); openMod('pause'); };
$('bResume').onclick = () => { showScreen(null); S.paused = false; setControls(true); };
$('bQuit').onclick = () => { S.running = false; S.paused = false; musicStop(); showScreen('title'); setControls(false); };
$('bRetry').onclick = () => newRun(currentSeedStr);
$('bNew').onclick = () => { CFG.seed = ''; newRun(); };
$('mClose').onclick = closeMod;

function bindCheck(id, key) { const el = $(id); el.checked = CFG[key]; el.onchange = () => { CFG[key] = el.checked; updateWeaponHUD(); }; }
function bindRange(id, key, fmt, cb) {
  const el = $(id), v = $(id + 'V');
  const upd = () => { CFG[key] = parseFloat(el.value); v.textContent = fmt(CFG[key]); cb && cb(); };
  el.oninput = upd; upd();
}
const x1 = v => v.toFixed(1) + 'x';
bindCheck('mGod', 'god'); bindCheck('mLava', 'lava'); bindCheck('mInfSt', 'infStamina'); bindCheck('mInfAmmo', 'infAmmo');
bindCheck('mOneShot', 'oneShot'); bindCheck('mFly', 'fly'); bindCheck('mPassive', 'passive');
bindCheck('mDebug', 'debug'); bindCheck('mHaptic', 'haptic');
bindCheck('mHNoCd', 'hNoCd'); bindCheck('mHPullEnemy', 'hPullEnemy');
bindCheck('mPost', 'post'); bindCheck('mEmbers', 'embers');
bindCheck('mSound', 'sound'); bindCheck('mMusic', 'music'); bindCheck('mPickups', 'pickups');
bindRange('mVol', 'volume', v => v.toFixed(2), () => { if (AU.master) AU.master.gain.value = CFG.volume; musicVolumeRefresh(); });
/* Volumenes por categoria. El valor inicial sale de audio-config.js (asi si lo cambias ahi, el slider arranca en ese valor). */
[['mVolMusic', 'music'], ['mVolWeapons', 'weapons'], ['mVolEnemies', 'enemies'], ['mVolPlayer', 'player'], ['mVolUi', 'ui']].forEach(([id, cat]) => {
  const el = $(id), v = $(id + 'V');
  el.value = CFG.vol[cat]; v.textContent = CFG.vol[cat].toFixed(2);
  el.oninput = () => { CFG.vol[cat] = parseFloat(el.value); v.textContent = CFG.vol[cat].toFixed(2); audioVolumeRefresh(); };
});
bindRange('mParry', 'parryWindow', v => v.toFixed(2)); bindRange('mBoss', 'bossEvery', v => v | 0);
bindRange('mWaveMax', 'waveMaxTime', v => v | 0);
bindRange('mSpeed', 'speed', x1); bindRange('mJump', 'jump', x1); bindRange('mGrav', 'gravity', x1);
bindRange('mTime', 'timeScale', x1); bindRange('mSens', 'sens', x1);
bindRange('mFov', 'fov', v => v | 0);
bindRange('mHRange', 'hRange', v => v | 0); bindRange('mHPull', 'hPull', x1);
bindRange('mEDmg', 'enemyDmg', x1); bindRange('mCount', 'enemyCount', v => v.toFixed(2) + 'x');
bindRange('mWDmg', 'weaponDmg', x1); bindRange('mRate', 'fireRate', x1);
bindRange('mSize', 'size', v => v | 0); bindRange('mDens', 'density', v => v.toFixed(2));
bindRange('mFog', 'fog', x1, () => { if (scene.fog) { scene.fog.near = 10 / CFG.fog; scene.fog.far = 85 / CFG.fog; lavaUniforms.fogNear.value = scene.fog.near; lavaUniforms.fogFar.value = scene.fog.far; } });
bindRange('mRes', 'resH', v => v | 0, applyResolution);
bindRange('mDither', 'dither', v => v.toFixed(2));

document.querySelectorAll('[data-spawn]').forEach(b => b.onclick = () => {
  if (!S.running) return;
  const ang = Math.random() * Math.PI * 2;
  spawnEnemy(b.dataset.spawn, new THREE.Vector3(P.pos.x + Math.cos(ang) * 10, 3, P.pos.z + Math.sin(ang) * 10));
});
$('mNextWave').onclick = () => { if (S.running) { for (const e of [...enemies]) killEnemyQuiet(e); S.waveState = 'idle'; S.waveTimer = 0; } };
$('mMaxStyle').onclick = () => { S.rankT = 460; };
$('mKillAll').onclick = () => { for (const e of [...enemies]) killEnemyQuiet(e); };
$('mUnlock').onclick = () => { WEAPONS.forEach(w => w.unlocked = true); resetAmmo(); updateWeaponHUD(); };
$('mHeal').onclick = () => { P.hp = 100; P.stamina = P.maxStamina; };
$('seedIn').onchange = e => { CFG.seed = e.target.value.trim(); };
$('mRegen').onclick = () => { CFG.seed = $('seedIn').value.trim() || currentSeedStr; closeMod(); newRun(CFG.seed); };
$('mRandom').onclick = () => { CFG.seed = randomSeed(); $('seedIn').value = CFG.seed; closeMod(); newRun(CFG.seed); };

generateLevel(randomSeed());
setWeapon(0);
resetPlayer();
P.pos.set(0, 12, 0);
requestAnimationFrame(frame);
setInterval(() => { if (!S.running) { P.yaw += 0.004; P.pitch = -0.25; } }, 16);

})();
