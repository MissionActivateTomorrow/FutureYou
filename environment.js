import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const _loader = new GLTFLoader();

const CDN = 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models';
const M = {
  tree:  `${CDN}/tree-beech/model.gltf`,
  tree2: `${CDN}/tree-lime/model.gltf`,
  bench: `${CDN}/bench-2/model.gltf`,
  car:   `${CDN}/car-sport/model.gltf`,
};

const SKY    = { 0: 0x7A8FA0, 1: 0x87CEEB, 3: 0x4A9FD8, 5: 0x1E6EB5 };
const GROUND = { 0: 0x9B8A6A, 1: 0x5A9A5A, 3: 0x2E7040, 5: 0x1A5A30 };

// ── PBR materials ─────────────────────────────────────────────────
function std(color, rough = 0.85, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
const MAT = {
  deadwood  : std(0x5C4A35, 0.95),
  rock      : std(0x7A7A7A, 0.95),
  rockDark  : std(0x555555, 0.95),
  dryGrass  : std(0xB8A878, 0.95),
  rust      : std(0x8B4513, 0.90),
  // tier 1
  lampMetal : std(0x333333, 0.40, 0.70),
  lampGlass : new THREE.MeshStandardMaterial({ color:0xFFFF99, roughness:0.05, emissive:0xFFEE66, emissiveIntensity:0.6 }),
  pathStone : std(0xBBBBBB, 0.90),
  flower1   : std(0xFF6B6B, 0.80),
  flower2   : std(0xFFD700, 0.80),
  flower3   : std(0xFF8CC8, 0.80),
  stem      : std(0x3A7A3A, 0.90),
  fence     : std(0x9B7B4A, 0.88),
  // tier 3
  wallCream : std(0xF5ECD7, 0.85),
  wallGrey  : std(0xE0DDD8, 0.85),
  roofTile  : std(0xA03020, 0.80),
  roofSlate : std(0x555560, 0.75),
  doorWood  : std(0x6B4226, 0.85),
  windowGlass: new THREE.MeshStandardMaterial({ color:0x9ECAE8, roughness:0.05, transparent:true, opacity:0.65 }),
  asphalt   : std(0x2A2A2A, 0.95),
  hedgeGreen: std(0x2D6A27, 0.95),
  concrete  : std(0xC8C8C0, 0.88),
  // tier 5
  villaWall : std(0xFBF8F2, 0.75),
  flatRoof  : std(0x2E2E3A, 0.70),
  pool      : new THREE.MeshStandardMaterial({ color:0x00C8D4, roughness:0.05, transparent:true, opacity:0.88 }),
  poolDeck  : std(0xE2DDD6, 0.70),
  wroughtiron: std(0x1A1A1A, 0.30, 0.80),
  marble    : std(0xF8F6F0, 0.25),
  deckChair : std(0xD4A96A, 0.80),
  column    : std(0xEFEBE4, 0.70),
};

// ── mesh helper ───────────────────────────────────────────────────
function m(geo, mat) {
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true; o.receiveShadow = true;
  return o;
}

// ══════════════════════════════════════════════════════════════════
// TIER 0 ASSETS — dead, barren, hopeless
// ══════════════════════════════════════════════════════════════════

function deadTree(x, z, sc = 1) {
  const g = new THREE.Group();
  const trunk = m(new THREE.CylinderGeometry(0.06*sc, 0.13*sc, 1.5*sc, 9), MAT.deadwood);
  trunk.position.y = 0.75*sc;
  g.add(trunk);
  const branches = [
    [0.24, 0.92, 0.0,  Math.PI/4,    0,          0],
    [-0.20, 1.00, 0.05, -Math.PI/3.5, 0,          0],
    [0.07,  1.15, -0.14, 0,            Math.PI/5,  0],
    [-0.05, 0.75,  0.18, 0,           -Math.PI/6,  Math.PI/8],
  ];
  branches.forEach(([bx,by,bz,rz,rx,ry]) => {
    const b = m(new THREE.CylinderGeometry(0.02*sc, 0.04*sc, 0.52*sc, 6), MAT.deadwood);
    b.position.set(bx*sc, by*sc, bz*sc);
    b.rotation.set(rx, ry, rz);
    g.add(b);
  });
  g.position.set(x, 0, z);
  return g;
}

function rock(x, z, scale = 1) {
  const g = new THREE.Group();
  const mat = Math.random() > 0.5 ? MAT.rock : MAT.rockDark;
  const r = m(new THREE.DodecahedronGeometry(0.18 * scale, 0), mat);
  r.scale.set(1 + Math.random()*0.3, 0.65 + Math.random()*0.2, 0.8 + Math.random()*0.3);
  r.rotation.y = Math.random() * Math.PI;
  r.rotation.z = (Math.random() - 0.5) * 0.3;
  g.add(r);
  g.position.set(x, 0.05 * scale, z);
  return g;
}

function brokenFence(x, z, len = 4) {
  const g = new THREE.Group();
  for (let i = 0; i < len; i++) {
    const h = 0.28 - Math.random() * 0.12;
    const post = m(new THREE.BoxGeometry(0.05, h, 0.05), MAT.rust);
    post.position.set(i * 0.28, h/2, 0);
    post.rotation.z = (Math.random() - 0.5) * 0.5;
    g.add(post);
    if (i < len-1 && Math.random() > 0.35) {
      const rail = m(new THREE.BoxGeometry(0.27, 0.03, 0.03), MAT.rust);
      rail.position.set(i * 0.28 + 0.14, h * 0.6, 0);
      rail.rotation.z = (Math.random() - 0.5) * 0.15;
      g.add(rail);
    }
  }
  g.position.set(x, 0, z);
  return g;
}

function dryGrassTuft(x, z) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const blade = m(new THREE.PlaneGeometry(0.04, 0.18 + Math.random()*0.08), MAT.dryGrass);
    blade.position.set((Math.random()-0.5)*0.15, 0.09, (Math.random()-0.5)*0.15);
    blade.rotation.y = Math.random() * Math.PI;
    blade.rotation.z = (Math.random()-0.5) * 0.5;
    blade.castShadow = false;
    g.add(blade);
  }
  g.position.set(x, 0, z);
  return g;
}

// ══════════════════════════════════════════════════════════════════
// TIER 1 ASSETS — modest park, simple life
// ══════════════════════════════════════════════════════════════════

function lampPost(x, z) {
  const g = new THREE.Group();
  const pole = m(new THREE.CylinderGeometry(0.03, 0.045, 2.4, 8), MAT.lampMetal);
  pole.position.y = 1.2;
  const arm = m(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 6), MAT.lampMetal);
  arm.rotation.z = Math.PI/2; arm.position.set(0.22, 2.3, 0);
  const head = m(new THREE.CylinderGeometry(0.07, 0.09, 0.15, 8), MAT.lampMetal);
  head.position.set(0.44, 2.25, 0);
  const bulb = m(new THREE.SphereGeometry(0.055, 8, 8), MAT.lampGlass);
  bulb.position.set(0.44, 2.17, 0);
  const light = new THREE.PointLight(0xFFE8A0, 0.8, 4);
  light.position.set(0.44, 2.1, 0);
  g.add(pole, arm, head, bulb, light);
  g.position.set(x, 0, z);
  return g;
}

function stonePathSegment(x, z, w = 0.45, d = 0.32) {
  const slab = m(new THREE.BoxGeometry(w, 0.06, d), MAT.pathStone);
  slab.position.set(x, 0.02, z);
  slab.rotation.y = (Math.random()-0.5) * 0.08;
  return slab;
}

function flowerPatch(x, z, count = 8) {
  const g = new THREE.Group();
  const cols = [MAT.flower1, MAT.flower2, MAT.flower3];
  for (let i = 0; i < count; i++) {
    const fg = new THREE.Group();
    const stem = m(new THREE.CylinderGeometry(0.008, 0.01, 0.16, 5), MAT.stem);
    stem.position.y = 0.08;
    const petal = m(new THREE.SphereGeometry(0.045, 7, 7), cols[i % cols.length]);
    petal.scale.set(1, 0.65, 1);
    petal.position.y = 0.18;
    fg.add(stem, petal);
    fg.position.set((Math.random()-0.5)*0.55, 0, (Math.random()-0.5)*0.55);
    g.add(fg);
  }
  g.position.set(x, 0, z);
  return g;
}

function woodFence(x, z, len = 5, rotY = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < len; i++) {
    const post = m(new THREE.BoxGeometry(0.06, 0.55, 0.06), MAT.fence);
    post.position.set(i * 0.38, 0.28, 0);
    g.add(post);
  }
  const rail1 = m(new THREE.BoxGeometry(len * 0.38, 0.04, 0.04), MAT.fence);
  rail1.position.set((len-1)*0.38/2, 0.42, 0);
  const rail2 = m(new THREE.BoxGeometry(len * 0.38, 0.04, 0.04), MAT.fence);
  rail2.position.set((len-1)*0.38/2, 0.18, 0);
  for (let i = 0; i < len*2-1; i++) {
    const picket = m(new THREE.BoxGeometry(0.05, 0.48, 0.03), MAT.fence);
    picket.position.set(i * 0.19, 0.24, 0);
    g.add(picket);
  }
  g.add(rail1, rail2);
  g.rotation.y = rotY;
  g.position.set(x, 0, z);
  return g;
}

// ══════════════════════════════════════════════════════════════════
// TIER 3 ASSETS — comfortable home
// ══════════════════════════════════════════════════════════════════

function house(x, z) {
  const g = new THREE.Group();
  // Main walls
  const walls = m(new THREE.BoxGeometry(1.8, 1.0, 1.2), MAT.wallCream);
  walls.position.y = 0.5;
  // Roof
  const roof = m(new THREE.ConeGeometry(1.38, 0.65, 4), MAT.roofTile);
  roof.position.y = 1.325; roof.rotation.y = Math.PI/4;
  // Chimney
  const ch = m(new THREE.BoxGeometry(0.14, 0.4, 0.14), MAT.roofTile);
  ch.position.set(0.45, 1.55, 0);
  // Door
  const door = m(new THREE.BoxGeometry(0.2, 0.4, 0.03), MAT.doorWood);
  door.position.set(0, 0.2, 0.615);
  // Door frame
  const df = m(new THREE.BoxGeometry(0.24, 0.44, 0.03), MAT.wallGrey);
  df.position.set(0, 0.22, 0.612);
  // Windows x4
  [[-0.55, 0.62], [0.55, 0.62], [-0.55, 0.28], [0.55, 0.28]].forEach(([wx, wy]) => {
    const wf = m(new THREE.BoxGeometry(0.30, 0.25, 0.03), MAT.wallGrey);
    wf.position.set(wx, wy, 0.615); g.add(wf);
    const wg = m(new THREE.BoxGeometry(0.25, 0.20, 0.02), MAT.windowGlass);
    wg.position.set(wx, wy, 0.618); g.add(wg);
  });
  // Garage
  const gar = m(new THREE.BoxGeometry(0.7, 0.62, 0.55), MAT.wallCream);
  gar.position.set(1.08, 0.31, -0.1);
  const garDoor = m(new THREE.BoxGeometry(0.62, 0.5, 0.03), MAT.wallGrey);
  garDoor.position.set(1.08, 0.25, 0.175);
  // Steps
  const step1 = m(new THREE.BoxGeometry(0.36, 0.06, 0.18), MAT.concrete);
  step1.position.set(0, 0.03, 0.7);
  const step2 = m(new THREE.BoxGeometry(0.28, 0.06, 0.14), MAT.concrete);
  step2.position.set(0, 0.09, 0.78);
  g.add(walls, roof, ch, door, df, gar, garDoor, step1, step2);
  g.position.set(x, 0, z);
  return g;
}

function driveway(x, z, w = 0.9, d = 2.2) {
  const drive = m(new THREE.BoxGeometry(w, 0.04, d), MAT.asphalt);
  drive.position.set(x, 0.01, z);
  return drive;
}

function hedge(x, z, w = 0.5, h = 0.55, d = 0.35) {
  const hg = m(new THREE.BoxGeometry(w, h, d), MAT.hedgeGreen);
  hg.position.set(x, h/2, z);
  return hg;
}

function gardenLight(x, z) {
  const g = new THREE.Group();
  const pole = m(new THREE.CylinderGeometry(0.02, 0.025, 0.7, 6), MAT.lampMetal);
  pole.position.y = 0.35;
  const head = m(new THREE.SphereGeometry(0.045, 8, 8), MAT.lampGlass);
  head.position.y = 0.73;
  const light = new THREE.PointLight(0xFFE0A0, 0.4, 2.5);
  light.position.y = 0.73;
  g.add(pole, head, light);
  g.position.set(x, 0, z);
  return g;
}

// ══════════════════════════════════════════════════════════════════
// TIER 5 ASSETS — luxury estate
// ══════════════════════════════════════════════════════════════════

function villa(x, z) {
  const g = new THREE.Group();
  // Main block
  const main = m(new THREE.BoxGeometry(2.8, 1.3, 1.5), MAT.villaWall);
  main.position.y = 0.65;
  // Flat roof with overhang
  const roof = m(new THREE.BoxGeometry(3.1, 0.1, 1.8), MAT.flatRoof);
  roof.position.y = 1.35;
  // Side wing
  const wing = m(new THREE.BoxGeometry(1.1, 0.95, 1.3), MAT.villaWall);
  wing.position.set(1.75, 0.475, -0.05);
  const wingRoof = m(new THREE.BoxGeometry(1.2, 0.09, 1.5), MAT.flatRoof);
  wingRoof.position.set(1.75, 1.0, -0.05);
  // Columns at front
  [-0.8, -0.3, 0.3, 0.8].forEach(cx => {
    const col = m(new THREE.CylinderGeometry(0.06, 0.07, 1.3, 10), MAT.column);
    col.position.set(cx, 0.65, 0.77); g.add(col);
    const cap = m(new THREE.BoxGeometry(0.18, 0.06, 0.18), MAT.column);
    cap.position.set(cx, 1.33, 0.77); g.add(cap);
  });
  // Large floor-to-ceiling windows
  for (let col = -2; col <= 2; col++) {
    const wg = m(new THREE.BoxGeometry(0.30, 0.7, 0.03), MAT.windowGlass);
    wg.position.set(col * 0.48, 0.75, 0.77); g.add(wg);
    const wf = m(new THREE.BoxGeometry(0.34, 0.74, 0.02), MAT.wallGrey);
    wf.position.set(col * 0.48, 0.75, 0.765); g.add(wf);
  }
  // Front steps / terrace
  const terrace = m(new THREE.BoxGeometry(2.2, 0.08, 0.6), MAT.marble);
  terrace.position.set(-0.1, 0.04, 1.1);
  const step = m(new THREE.BoxGeometry(1.8, 0.06, 0.28), MAT.marble);
  step.position.set(-0.1, 0.1, 1.38);
  g.add(main, roof, wing, wingRoof, terrace, step);
  g.position.set(x, 0, z);
  return g;
}

function pool(x, z) {
  const g = new THREE.Group();
  // Deck surround
  const deck = m(new THREE.BoxGeometry(2.0, 0.08, 1.1), MAT.poolDeck);
  deck.position.y = 0.04;
  // Water
  const water = m(new THREE.BoxGeometry(1.7, 0.06, 0.8), MAT.pool);
  water.position.y = 0.07;
  // Edge trim
  const trim = m(new THREE.BoxGeometry(1.76, 0.04, 0.86), MAT.marble);
  trim.position.y = 0.1;
  // Pool steps (end)
  const steps = m(new THREE.BoxGeometry(0.3, 0.06, 0.8), MAT.marble);
  steps.position.set(-0.7, 0.04, 0);
  // Deck chairs x2
  [-0.28, 0.28].forEach(side => {
    const seat = m(new THREE.BoxGeometry(0.5, 0.04, 0.15), MAT.deckChair);
    seat.position.set(side, 0.12, -0.55); g.add(seat);
    const back = m(new THREE.BoxGeometry(0.5, 0.22, 0.03), MAT.deckChair);
    back.position.set(side, 0.22, -0.63); back.rotation.x = 0.3; g.add(back);
  });
  g.add(deck, water, trim, steps);
  g.position.set(x, 0, z);
  return g;
}

function ironFence(x, z, len = 6, rotY = 0) {
  const g = new THREE.Group();
  const spacing = 0.32;
  for (let i = 0; i < len; i++) {
    const post = m(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), MAT.wroughtiron);
    post.position.set(i * spacing, 0.45, 0); g.add(post);
    // Spike top
    const spike = m(new THREE.ConeGeometry(0.03, 0.12, 6), MAT.wroughtiron);
    spike.position.set(i * spacing, 0.96, 0); g.add(spike);
    // Pickets between posts
    if (i < len - 1) {
      for (let p = 1; p < 3; p++) {
        const pk = m(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 5), MAT.wroughtiron);
        pk.position.set(i * spacing + p * spacing/3, 0.36, 0); g.add(pk);
        const sp2 = m(new THREE.ConeGeometry(0.022, 0.09, 5), MAT.wroughtiron);
        sp2.position.set(i * spacing + p * spacing/3, 0.77, 0); g.add(sp2);
      }
    }
  }
  // Rails
  const r1 = m(new THREE.BoxGeometry((len-1)*spacing, 0.04, 0.04), MAT.wroughtiron);
  r1.position.set((len-1)*spacing/2, 0.7, 0); g.add(r1);
  const r2 = m(new THREE.BoxGeometry((len-1)*spacing, 0.04, 0.04), MAT.wroughtiron);
  r2.position.set((len-1)*spacing/2, 0.2, 0); g.add(r2);
  g.rotation.y = rotY;
  g.position.set(x, 0, z);
  return g;
}

function manicuredHedge(x, z, w = 0.8) {
  const g = new THREE.Group();
  const base = m(new THREE.BoxGeometry(w, 0.65, 0.38), MAT.hedgeGreen);
  base.position.y = 0.325;
  const top = m(new THREE.BoxGeometry(w, 0.15, 0.38), MAT.hedgeGreen);
  top.position.y = 0.72;
  g.add(base, top);
  g.position.set(x, 0, z);
  return g;
}

function fountain(x, z) {
  const g = new THREE.Group();
  const base = m(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 12), MAT.marble);
  base.position.y = 0.06;
  const basin = m(new THREE.CylinderGeometry(0.4, 0.38, 0.14, 12), MAT.marble);
  basin.position.y = 0.19;
  const water = m(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 12), MAT.pool);
  water.position.y = 0.26;
  const column = m(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 8), MAT.marble);
  column.position.y = 0.52;
  const topBowl = m(new THREE.CylinderGeometry(0.18, 0.15, 0.08, 10), MAT.marble);
  topBowl.position.y = 0.82;
  g.add(base, basin, water, column, topBowl);
  g.position.set(x, 0, z);
  return g;
}

// ══════════════════════════════════════════════════════════════════
// ENVIRONMENT CLASS
// ══════════════════════════════════════════════════════════════════

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.assets = [];
    this.ground = null;
    this.sky    = null;
    this.currentTier = -1;
    this._token = 0;
    this._buildBase();
  }

  _buildBase() {
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: GROUND[0], roughness: 0.95 })
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(18, 20, 20),
      new THREE.MeshBasicMaterial({ color: SKY[0], side: THREE.BackSide })
    );
    this.scene.add(this.sky);
  }

  static getTier(v) {
    if (v >= 5) return 5;
    if (v >= 3) return 3;
    if (v >= 1) return 1;
    return 0;
  }

  setTier(tier) {
    if (tier === this.currentTier) return;
    this.currentTier = tier;
    this.sky.material.color.setHex(SKY[tier] ?? SKY[0]);
    this.ground.material.color.setHex(GROUND[tier] ?? GROUND[0]);
    this.assets.forEach(a => this.scene.remove(a));
    this.assets = [];
    this._buildTier(tier);
  }

  _add(o) { this.scene.add(o); this.assets.push(o); }

  _glb(tok, url, x, y, z, sc, ry = 0) {
    _loader.load(url, (gltf) => {
      if (this._token !== tok) return;
      const mod = gltf.scene;
      mod.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
      mod.position.set(x, y, z);
      mod.scale.setScalar(sc);
      if (ry) mod.rotation.y = ry;
      this._add(mod);
    }, undefined, () => console.warn('[env] CDN model unavailable:', url));
  }

  _buildTier(tier) {
    const tok = ++this._token;
    const glb = (url, x, y, z, sc, ry = 0) => this._glb(tok, url, x, y, z, sc, ry);

    switch (tier) {

      // ────────────────────────────────────────────────────────────
      case 0: // NOTHING — desolate wasteland
      // ────────────────────────────────────────────────────────────
        this._add(deadTree(-2.2, -2.5, 1.1));
        this._add(deadTree( 1.8, -3.0, 0.9));
        this._add(deadTree(-0.5, -3.8, 1.3));
        this._add(deadTree( 3.2, -2.2, 0.75));
        this._add(deadTree(-3.5, -3.5, 1.0));
        this._add(rock(-1.2, -2.0, 1.2));
        this._add(rock( 0.8, -1.8, 0.9));
        this._add(rock( 2.5, -3.2, 1.4));
        this._add(rock(-3.0, -2.5, 1.0));
        this._add(rock( 1.5, -4.0, 1.1));
        this._add(brokenFence(-1.5, -1.7));
        this._add(brokenFence( 0.5, -2.8, 3));
        for (let i = 0; i < 14; i++) {
          this._add(dryGrassTuft(
            (Math.random() - 0.5) * 7,
            -1.5 - Math.random() * 4
          ));
        }
        break;

      // ────────────────────────────────────────────────────────────
      case 1: // UNDER €10k — simple park / modest life
      // ────────────────────────────────────────────────────────────
        glb(M.tree,  -1.8, 0, -2.8, 0.40);
        glb(M.tree2,  2.5, 0, -2.5, 0.34, Math.PI * 0.6);
        glb(M.tree2, -3.2, 0, -3.5, 0.30, Math.PI * 0.2);
        glb(M.bench,  0.8, 0, -1.9, 0.45);
        this._add(lampPost(-0.4, -1.6));
        this._add(lampPost( 2.2, -2.0));
        for (let i = 0; i < 5; i++) {
          this._add(stonePathSegment(0.0, -1.4 - i * 0.5));
        }
        this._add(flowerPatch(-1.0, -2.0, 10));
        this._add(flowerPatch( 1.4, -2.2,  8));
        this._add(flowerPatch( 0.3, -3.0,  7));
        this._add(woodFence(-3.5, -1.8, 6));
        this._add(woodFence( 0.8, -1.6, 5, Math.PI / 2));
        this._add(rock( 1.8, -3.5, 0.7));
        this._add(rock(-2.5, -3.0, 0.8));
        break;

      // ────────────────────────────────────────────────────────────
      case 3: // €10k – €50k — comfortable family home
      // ────────────────────────────────────────────────────────────
        this._add(house(2.2, -3.2));
        this._add(driveway(1.2, -1.9));
        glb(M.car,    0.9, 0, -1.6,  0.32, Math.PI * 0.05);
        glb(M.tree,  -2.0, 0, -2.8,  0.42);
        glb(M.tree2,  3.8, 0, -2.5,  0.36, Math.PI * 0.5);
        glb(M.tree,  -3.5, 0, -3.8,  0.33, Math.PI * 0.9);
        this._add(flowerPatch(-0.4, -2.0,  9));
        this._add(flowerPatch( 1.0, -3.8, 11));
        this._add(flowerPatch(-1.5, -3.5,  8));
        this._add(hedge(-0.2, -1.7, 0.6));
        this._add(hedge( 0.5, -1.7, 0.6));
        this._add(hedge( 2.8, -1.5, 1.2));
        this._add(gardenLight(-0.8, -2.4));
        this._add(gardenLight( 1.6, -2.4));
        this._add(woodFence(-4.0, -1.8, 8));
        this._add(woodFence(-4.0, -2.1, 1, Math.PI / 2));
        this._add(rock(-2.8, -2.0, 0.9));
        break;

      // ────────────────────────────────────────────────────────────
      case 5: // OVER €50k — luxury estate
      // ────────────────────────────────────────────────────────────
        this._add(villa(2.6, -3.8));
        this._add(pool(-0.8, -2.8));
        this._add(fountain(-3.2, -2.0));
        glb(M.car,   0.6, 0, -1.7,  0.36, -Math.PI * 0.08);
        glb(M.car,   2.0, 0, -1.6,  0.32,  Math.PI * 0.06);
        glb(M.tree,  -2.4, 0, -2.5, 0.55);
        glb(M.tree2,  4.4, 0, -2.8, 0.50, Math.PI * 0.4);
        glb(M.tree,  -4.0, 0, -4.0, 0.48, Math.PI * 0.7);
        glb(M.tree2,  3.0, 0, -4.5, 0.45, Math.PI * 1.1);
        glb(M.tree,  -1.5, 0, -5.0, 0.40, Math.PI * 0.3);
        this._add(manicuredHedge(-0.2, -1.6, 1.0));
        this._add(manicuredHedge( 1.2, -1.6, 0.8));
        this._add(manicuredHedge( 2.6, -1.5, 1.2));
        this._add(manicuredHedge(-2.0, -2.0, 0.6));
        this._add(ironFence(-5.0, -1.5, 8));
        this._add(ironFence(-5.0, -1.7, 2, Math.PI / 2));
        this._add(ironFence( 1.2, -1.5, 6));
        this._add(gardenLight(-1.5, -1.7));
        this._add(gardenLight( 0.2, -1.7));
        this._add(gardenLight( 3.5, -1.7));
        this._add(flowerPatch(-3.5, -3.0, 14));
        this._add(flowerPatch( 1.5, -4.5, 12));
        this._add(flowerPatch(-1.8, -4.8, 10));
        break;
    }
  }
}
