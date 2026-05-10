import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Environment } from './environment.js';

let scene, camera, renderer, clock;
let avatarRoot   = null;
let faceMeshes   = [];
let isSpeaking   = false;
let environment  = null;
let idleTime     = 0;
let headBone     = null; // cached head bone for look-at override

// Animation
let mixer          = null;
let animGroup      = null;
let idleAction     = null;
let animationClip  = null; // cached so we don't re-fetch each avatar load

// Avaturn's own idle animation GLB from their public example repo
const IDLE_ANIM_URL = 'https://raw.githubusercontent.com/avaturn/avaturn-threejs-example/main/public/animation.glb';

// ── SCENE SETUP ───────────────────────────────────────────────────
export function initScene(totalSaved = 0) {
  const canvas = document.getElementById('face-canvas');
  const w = window.innerWidth;
  const h = window.innerHeight;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  clock = new THREE.Clock();

  const aspect = w / h;
  camera = new THREE.PerspectiveCamera(50, aspect, 0.01, 30);
  camera.position.set(0, 1.40, 1.8);
  camera.lookAt(0, 1.20, 0);

  const key = new THREE.DirectionalLight(0xFFF5E0, 2.4);
  key.position.set(1.5, 3, 2);
  key.castShadow = true;
  key.shadow.mapSize.width  = 1024;
  key.shadow.mapSize.height = 1024;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x1AD2A0, 0.5);
  fill.position.set(-2, 1, 1);
  scene.add(fill);

  const back = new THREE.DirectionalLight(0xFFE0B0, 0.8);
  back.position.set(0, 2, -3);
  scene.add(back);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  environment = new Environment(scene);
  environment.setTier(totalSaved);

  // Pre-fetch the idle animation so it's ready when avatar loads
  _loadIdleAnimation();

  animate();
  return { scene, camera, renderer };
}

// ── UPDATE TIER ───────────────────────────────────────────────────
export function updateEnvironmentTier(totalSaved) {
  if (!environment) return;
  environment.setTier(totalSaved);
}

// ── LOAD IDLE ANIMATION (Avaturn's own file) ──────────────────────
function _loadIdleAnimation() {
  if (animationClip) return; // already cached
  new GLTFLoader().load(IDLE_ANIM_URL, (gltf) => {
    animationClip = _filterAnimation(gltf.animations[0]);
    console.log('[avatar] idle animation loaded');
    // If avatar already loaded, start the animation now
    if (animGroup) _playAnimation();
  }, undefined, (err) => {
    console.warn('[avatar] idle animation failed to load:', err.message);
  });
}

// Keep only quaternion rotation tracks + Hips position — exactly as Avaturn do it
function _filterAnimation(animation) {
  animation.tracks = animation.tracks.filter((track) => {
    return track.name.endsWith('Hips.position') || track.name.endsWith('.quaternion');
  });
  return animation;
}

function _playAnimation() {
  if (!animationClip || !animGroup) return;
  if (mixer) mixer.stopAllAction();
  mixer = new THREE.AnimationMixer(animGroup);
  idleAction = mixer.clipAction(animationClip);
  idleAction.play();
}

// ── LOAD AVATAR GLB ───────────────────────────────────────────────
export function loadAvatar(glbUrl) {
  if (avatarRoot) {
    scene.remove(avatarRoot);
    avatarRoot = null;
    faceMeshes = [];
    if (mixer) { mixer.stopAllAction(); mixer = null; }
    animGroup = null;
  }

  new GLTFLoader().load(glbUrl, (gltf) => {
    avatarRoot = gltf.scene;

    avatarRoot.traverse((node) => {
      if (node.isMesh) {
        node.castShadow    = true;
        node.receiveShadow = true;
        if (node.morphTargetDictionary) faceMeshes.push(node);
      }
    });

    // Cache head bone for look-at override
    headBone = null;
    avatarRoot.traverse((node) => {
      if (node.isBone && (node.name === 'Head' || node.name === 'head')) {
        headBone = node;
      }
    });

    scene.add(avatarRoot);

    // Wire up AnimationMixer — same pattern as official Avaturn example
    animGroup = new THREE.AnimationObjectGroup();
    animGroup.add(avatarRoot);
    if (animationClip) _playAnimation();

    window.dispatchEvent(new CustomEvent('avatar-loaded'));
  }, undefined, (err) => console.error('Avatar load error:', err));
}

// ── MOUTH ANIMATION ───────────────────────────────────────────────
function animateMouth(delta) {
  faceMeshes.forEach((m) => {
    const d   = m.morphTargetDictionary;
    const inf = m.morphTargetInfluences;
    if (!inf) return;
    const key = d['jawOpen'] ?? d['mouthOpen'] ?? d['JawOpen'] ?? d['Mouth_Open'] ?? null;
    if (key !== null) {
      if (isSpeaking) {
        inf[key] = 0.28 + 0.24 * Math.abs(Math.sin(clock.elapsedTime * 8));
      } else {
        inf[key] = Math.max(0, inf[key] - delta * 7);
      }
    }
  });
}

// ── HEAD LOOK-AT (runs AFTER mixer so it overrides the animation) ──
function animateHeadLook() {
  if (!headBone) return;
  // Camera is slightly below the head — tilt head gently downward toward it
  // x > 0 = chin down in Mixamo space; add slow side-to-side blink look
  const targetX = -0.17 + 0.03 * Math.sin(idleTime * 0.3);
  const targetY =  0.04 * Math.sin(idleTime * 0.2);
  const speed   = 0.08;
  headBone.rotation.x += (targetX - headBone.rotation.x) * speed;
  headBone.rotation.y += (targetY - headBone.rotation.y) * speed;
}

// ── IDLE BODY SWAY ────────────────────────────────────────────────
function animateIdle(delta) {
  if (!avatarRoot) return;
  idleTime += delta;
  avatarRoot.rotation.y = 0.02 * Math.sin(idleTime * 0.4);
}

// ── RENDER LOOP ───────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  animateHeadLook(); // must run after mixer so it wins
  animateMouth(delta);
  animateIdle(delta);
  renderer.render(scene, camera);
}

// ── ENVIRONMENT TIER (called by demo switcher) ────────────────────
window._setEnvironmentTier = function(tier) {
  if (environment) environment.setTier(tier);
};

// ── SPEAKING STATE ────────────────────────────────────────────────
export function setSpeaking(state) {
  isSpeaking = state;
  const ring = document.getElementById('face-ring');
  if (ring) ring.classList.toggle('speaking', state);
}

// ── AVATURN INTEGRATION ───────────────────────────────────────────
export async function startAvaturn() {
  document.getElementById('avaturn-modal').style.display = 'block';
  const { AvaturnSDK } = await import('https://cdn.jsdelivr.net/npm/@avaturn/sdk/dist/index.js');
  const sdk = new AvaturnSDK();
  await sdk.init(document.getElementById('avaturn-sdk-container'), { url: 'https://demo.avaturn.dev' });
  sdk.on('export', (data) => {
    closeAvaturn();
    onAvatarExported(data.url);
  });
}

function closeAvaturn() {
  document.getElementById('avaturn-modal').style.display = 'none';
}

function onAvatarExported(glbUrl) {
  window.goTo('s-talk');
  const totalSaved = window.appState?.environmentTier ?? 0;
  requestAnimationFrame(() => {
    initScene(totalSaved);
    loadAvatar(glbUrl);
    window.addEventListener('avatar-loaded', () => {
      const ov = document.getElementById('face-loading-overlay');
      if (ov) ov.style.display = 'none';
      window.startConversation();
    }, { once: true });
  });
}

window.startAvaturn = startAvaturn;
window.closeAvaturn = closeAvaturn;
