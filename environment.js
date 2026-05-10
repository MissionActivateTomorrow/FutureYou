import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const _loader = new GLTFLoader();

// ── CDN model URLs (pmndrs public Supabase — CC0) ─────────────────
const CDN = 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models';
const M = {
  tree:  `${CDN}/tree-beech/model.gltf`,
  tree2: `${CDN}/tree-lime/model.gltf`,
  bench: `${CDN}/bench-2/model.gltf`,
  car:   `${CDN}/car-sport/model.gltf`,
};

// ── 4 very distinct sky / ground pairs ───────────────────────────
// Tier 0 — Nothing:        gloomy overcast / dry cracked earth
// Tier 1 — Under €10k:    soft blue sky / fresh light green
// Tier 3 — €10k–€50k:    clear bright blue / rich green
// Tier 5 — Over €50k:     deep vivid blue / deep lush green
const SKY_COLORS    = { 0: 0x8899AA, 1: 0x87CEEB, 3: 0x4A9FD8, 5: 0x2C7EBF };
const GROUND_COLORS = { 0: 0x8B7355, 1: 0x5A9A5A, 3: 0x2E7040, 5: 0x1A5A30 };

// ── Tiny mesh helper ─────────────────────────────────────────────
function mesh(g, m) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = true; o.receiveShadow = true;
  return o;
}

// ── Procedural assets (buildings — no reliable public GLB for these) ─

function deadTree(x, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x4A3728 });
  const trunk = mesh(new THREE.CylinderGeometry(0.05, 0.10, 1.1, 7), mat);
  trunk.position.y = 0.55;
  const b1 = mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.55, 5), mat);
  b1.position.set(0.22, 0.95, 0); b1.rotation.z = Math.PI / 4;
  const b2 = mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.45, 5), mat);
  b2.position.set(-0.18, 1.0, 0.05); b2.rotation.z = -Math.PI / 3.5;
  const b3 = mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.30, 5), mat);
  b3.position.set(0.06, 1.1, -0.12); b3.rotation.x = Math.PI / 4;
  g.add(trunk, b1, b2, b3);
  g.position.set(x, 0, z);
  return g;
}

function cottage(x, z) {
  const g = new THREE.Group();
  const wm  = new THREE.MeshLambertMaterial({ color: 0xE8D5B0 });
  const rm  = new THREE.MeshLambertMaterial({ color: 0xB05030 });
  const dm  = new THREE.MeshLambertMaterial({ color: 0x6B4226 });
  const wim = new THREE.MeshLambertMaterial({ color: 0xBEE0F0 });
  const base = mesh(new THREE.BoxGeometry(1.1, 0.7, 0.9), wm);
  base.position.y = 0.35;
  const roof = mesh(new THREE.ConeGeometry(0.85, 0.5, 4), rm);
  roof.position.y = 0.95; roof.rotation.y = Math.PI / 4;
  const door = mesh(new THREE.BoxGeometry(0.15, 0.28, 0.03), dm);
  door.position.set(0, 0.14, 0.46);
  [-0.3, 0.3].forEach(ox => {
    const w = mesh(new THREE.BoxGeometry(0.16, 0.16, 0.03), wim);
    w.position.set(ox, 0.42, 0.46); g.add(w);
  });
  // chimney
  const ch = mesh(new THREE.BoxGeometry(0.1, 0.25, 0.1), rm);
  ch.position.set(0.25, 1.15, 0);
  g.add(base, roof, door, ch);
  g.position.set(x, 0, z);
  return g;
}

function house(x, z) {
  const g   = new THREE.Group();
  const wm  = new THREE.MeshLambertMaterial({ color: 0xF5ECD7 });
  const rm  = new THREE.MeshLambertMaterial({ color: 0x8B2020 });
  const dm  = new THREE.MeshLambertMaterial({ color: 0x5C3A1E });
  const wim = new THREE.MeshLambertMaterial({ color: 0xADD8E6 });
  const gm  = new THREE.MeshLambertMaterial({ color: 0xD8D8D0 });
  const walls = mesh(new THREE.BoxGeometry(1.6, 0.9, 1.1), wm);
  walls.position.y = 0.45;
  const roof = mesh(new THREE.ConeGeometry(1.2, 0.6, 4), rm);
  roof.position.y = 1.2; roof.rotation.y = Math.PI / 4;
  const door = mesh(new THREE.BoxGeometry(0.18, 0.36, 0.03), dm);
  door.position.set(0, 0.18, 0.56);
  [-0.5, 0.5].forEach(ox => {
    const w = mesh(new THREE.BoxGeometry(0.2, 0.2, 0.03), wim);
    w.position.set(ox, 0.55, 0.56); g.add(w);
  });
  const garage = mesh(new THREE.BoxGeometry(0.6, 0.55, 0.5), wm);
  garage.position.set(0.95, 0.275, 0);
  const gDoor = mesh(new THREE.BoxGeometry(0.55, 0.45, 0.03), gm);
  gDoor.position.set(0.95, 0.225, 0.265);
  const ch = mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), rm);
  ch.position.set(0.4, 1.5, 0);
  g.add(walls, roof, door, garage, gDoor, ch);
  g.position.set(x, 0, z);
  return g;
}

function villa(x, z) {
  const g   = new THREE.Group();
  const wm  = new THREE.MeshLambertMaterial({ color: 0xFAF5EC });
  const rm  = new THREE.MeshLambertMaterial({ color: 0x7A1818 });
  const wim = new THREE.MeshLambertMaterial({ color: 0x9DD8F0 });
  const pm  = new THREE.MeshLambertMaterial({ color: 0x00CED1, transparent: true, opacity: 0.85 });
  const em  = new THREE.MeshLambertMaterial({ color: 0xE8E8E0 });
  // Main block
  const main = mesh(new THREE.BoxGeometry(2.2, 1.1, 1.3), wm);
  main.position.y = 0.55;
  const flatRoof = mesh(new THREE.BoxGeometry(2.35, 0.08, 1.45), rm);
  flatRoof.position.y = 1.14;
  // Side wing
  const wing = mesh(new THREE.BoxGeometry(0.9, 0.8, 1.1), wm);
  wing.position.set(1.45, 0.4, 0);
  const wingRoof = mesh(new THREE.BoxGeometry(1.0, 0.07, 1.2), rm);
  wingRoof.position.set(1.45, 0.84, 0);
  // Windows — floor-to-ceiling style
  for (let col = -2; col <= 2; col++) {
    if (col === 0) continue;
    const w = mesh(new THREE.BoxGeometry(0.22, 0.55, 0.03), wim);
    w.position.set(col * 0.38, 0.6, 0.66); g.add(w);
  }
  // Pool
  const poolWater = mesh(new THREE.BoxGeometry(1.1, 0.08, 0.65), pm);
  poolWater.position.set(-0.5, 0.04, -1.1);
  const poolEdge = mesh(new THREE.BoxGeometry(1.22, 0.08, 0.77), em);
  poolEdge.position.set(-0.5, 0.0, -1.1);
  // Columns
  [-0.55, 0, 0.55].forEach(cx => {
    const col = mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 8), em);
    col.position.set(cx, 0.55, 0.67); g.add(col);
  });
  g.add(main, flatRoof, wing, wingRoof, poolWater, poolEdge);
  g.position.set(x, 0, z);
  return g;
}

// ── Environment class ─────────────────────────────────────────────
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
    this.ground = mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshLambertMaterial({ color: GROUND_COLORS[0] })
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(14, 16, 16),
      new THREE.MeshBasicMaterial({ color: SKY_COLORS[0], side: THREE.BackSide })
    );
    this.scene.add(this.sky);
  }

  static getTier(totalSaved) {
    if (totalSaved >= 180000) return 5;
    if (totalSaved >= 120000) return 4;
    if (totalSaved >= 70000)  return 3;
    if (totalSaved >= 30000)  return 2;
    if (totalSaved >= 10000)  return 1;
    return 0;
  }

  setTier(tier) {
    if (tier === this.currentTier) return;
    this.currentTier = tier;
    this.sky.material.color.setHex(SKY_COLORS[tier] ?? SKY_COLORS[0]);
    this.ground.material.color.setHex(GROUND_COLORS[tier] ?? GROUND_COLORS[0]);
    this.assets.forEach(a => this.scene.remove(a));
    this.assets = [];
    this._buildTier(tier);
  }

  _add(obj) { this.scene.add(obj); this.assets.push(obj); }

  _glb(token, url, x, y, z, scale, rotY = 0) {
    _loader.load(url, (gltf) => {
      if (this._token !== token) return;
      const model = gltf.scene;
      model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
      model.position.set(x, y, z);
      model.scale.setScalar(scale);
      if (rotY) model.rotation.y = rotY;
      this._add(model);
    }, undefined, () => console.warn('[env] missing:', url));
  }

  _buildTier(tier) {
    const tok = ++this._token;
    const g = (url, x, y, z, sc, ry = 0) => this._glb(tok, url, x, y, z, sc, ry);

    switch (tier) {

      // ── TIER 0: Nothing saved — barren wasteland ──────────────
      case 0:
        this._add(deadTree(-1.8, -2.2));
        this._add(deadTree( 1.5, -2.8));
        this._add(deadTree(-0.4, -3.2));
        break;

      // ── TIER 1: Under €10k — modest park, simple life ─────────
      case 1:
        g(M.tree,  -1.5, 0, -2.5,  0.38);
        g(M.bench,  1.2, 0, -1.8,  0.45);
        break;

      // ── TIER 3: €10k–€50k — comfortable home ──────────────────
      case 3:
        this._add(cottage(2.0, -2.8));
        g(M.tree,  -1.8, 0, -2.4,  0.42);
        g(M.tree2,  3.2, 0, -2.2,  0.36, Math.PI * 0.5);
        g(M.car,    0.8, 0, -1.8,  0.32);
        break;

      // ── TIER 5: Over €50k — luxury villa ──────────────────────
      case 5:
        this._add(villa(2.4, -3.2));
        g(M.tree,  -2.8, 0, -2.0,  0.55);
        g(M.tree2,  3.8, 0, -2.5,  0.50, Math.PI * 0.4);
        g(M.tree,  -1.4, 0, -3.5,  0.45, Math.PI * 0.8);
        g(M.car,   -0.3, 0, -1.7,  0.38);
        break;

      default:
        break;
    }
  }
}
