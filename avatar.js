import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, avatarMesh;
let clock;

// Lip sync state
let morphMesh = null;
let morphDict = null;
let jawBone   = null;
let currentPhoneme = 'rest';
let lerpedMorphs = {};
let sinePhase = 0;
let jawAngle  = 0;

// ── SCENE ─────────────────────────────────────────────────────────
export function initScene() {
  const canvas = document.getElementById('face-canvas');
  const size   = canvas.parentElement.offsetWidth || 300;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(size, size);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10);
  camera.position.set(0, 1.60, 0.75);
  camera.lookAt(0, 1.60, 0);

  const key = new THREE.DirectionalLight(0xfff8f0, 2.4);
  key.position.set(1, 2, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x1AD2A0, 0.5);
  fill.position.set(-2, 1, 1);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  animate();
}

// ── LOAD AVATAR ────────────────────────────────────────────────────
export function loadAvatar(glbUrl) {
  if (avatarMesh) { scene.remove(avatarMesh); avatarMesh = null; }

  new GLTFLoader().load(glbUrl, (gltf) => {
    avatarMesh = gltf.scene;
    discoverLipSync(gltf);
    scene.add(avatarMesh);
    window.dispatchEvent(new CustomEvent('avatar-loaded'));
  }, undefined, err => console.error('Avatar load error:', err));
}

function discoverLipSync(gltf) {
  morphMesh = null; morphDict = null; jawBone = null;
  lerpedMorphs = {};

  gltf.scene.traverse((node) => {
    if (node.isMesh && node.morphTargetDictionary) {
      const keys = Object.keys(node.morphTargetDictionary);
      if (keys.length > 0 && !morphMesh) {
        morphMesh = node;
        morphDict = node.morphTargetDictionary;
        console.log('[LipSync] Morph targets on:', node.name);
        console.log('[LipSync] Names:', keys.join(', '));
        keys.forEach(k => (lerpedMorphs[k] = 0));
      }
    }
    if (!jawBone && /jaw/i.test(node.name)) {
      jawBone = node;
      console.log('[LipSync] Jaw bone:', node.name);
    }
    if (node.isBone) console.log('[LipSync] Bone:', node.name);
  });

  if (!morphMesh && !jawBone)
    console.log('[LipSync] No morph targets or jaw bone — lip sync disabled');

  window._lipSyncMesh = morphMesh;
  window._lipSyncJaw  = jawBone;
}

// ── LIP SYNC TABLES ───────────────────────────────────────────────
const PHONEME_WEIGHTS = {
  aa:   { viseme_aa: 0.75, viseme_E: 0.25, jawOpen: 0.60 },
  oo:   { viseme_O:  0.80, viseme_U: 0.40, jawOpen: 0.40 },
  mm:   { viseme_PP: 0.90, jawOpen:  0.05 },
  ss:   { viseme_SS: 0.70, viseme_CH: 0.30, viseme_DD: 0.20, jawOpen: 0.15 },
  rest: {},
};
const PHONEME_AMP = { aa: 0.30, oo: 0.22, mm: 0.04, ss: 0.12, rest: 0.18 };

// ── IDLE HEAD MOVEMENT ─────────────────────────────────────────────
let idleT = 0;
function animateIdle(delta) {
  if (!avatarMesh) return;
  idleT += delta;
  avatarMesh.rotation.y = 0.035 * Math.sin(idleT * 0.55);
  avatarMesh.rotation.x = 0.008 * Math.sin(idleT * 0.38);
}

// ── RENDER LOOP ────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  animateIdle(delta);
  renderer.render(scene, camera);
}

// ── SPEAKING STATE ─────────────────────────────────────────────────
export function setSpeaking(state) {
  window._futureSpeaking = state;
  const ring = document.getElementById('face-ring');
  if (ring) ring.classList.toggle('speaking', state);
}

// ── AVATURN FLOW ───────────────────────────────────────────────────
export async function startAvaturn() {
  document.getElementById('avaturn-modal').style.display = 'block';
  const { AvaturnSDK } = await import('https://cdn.jsdelivr.net/npm/@avaturn/sdk/dist/index.js');
  const sdk = new AvaturnSDK();
  await sdk.init(document.getElementById('avaturn-sdk-container'), {
    url: 'https://demo.avaturn.dev'
  });
  sdk.on('export', (data) => { closeAvaturn(); onAvatarExported(data.url); });
}

export function closeAvaturn() {
  document.getElementById('avaturn-modal').style.display = 'none';
}

function onAvatarExported(glbUrl) {
  document.getElementById('avatar-intro').style.display = 'none';
  document.getElementById('avatar-loading').style.display = 'flex';
  window.goTo('s-talk');
  requestAnimationFrame(() => { initScene(); loadAvatar(glbUrl); });
  window.addEventListener('avatar-loaded', () => {
    const ov = document.getElementById('face-loading-overlay');
    if (ov) ov.style.display = 'none';
    window.startConversation();
  }, { once: true });
}

window.startAvaturn = startAvaturn;
window.closeAvaturn = closeAvaturn;
