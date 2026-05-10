import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Environment } from './environment.js';

let scene, camera, renderer, clock;
let avatarRoot   = null;
let faceMeshes   = [];
let isSpeaking   = false;
let environment  = null;
let idleTime     = 0;
let headBone     = null;

// ── ORBIT STATE (touch controls) ─────────────────────────────────
let _orbit = null;

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
  renderer.shadowMap.type = THREE.PCFShadowMap;

  scene = new THREE.Scene();
  clock = new THREE.Clock();

  const aspect = w / h;
  const isPortrait = h > w;
  camera = new THREE.PerspectiveCamera(isPortrait ? 62 : 50, aspect, 0.01, 30);
  camera.position.set(0, isPortrait ? 1.15 : 1.40, isPortrait ? 2.2 : 1.8);
  camera.lookAt(0, isPortrait ? 1.05 : 1.20, 0);

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

  _initOrbit();
  _initTouchControls();
  window.addEventListener('resize', _onResize);
  animate();
  return { scene, camera, renderer };
}

// ── ORBIT HELPERS ─────────────────────────────────────────────────
function _initOrbit() {
  const ty = window.innerHeight > window.innerWidth ? 1.05 : 1.20;
  const target = new THREE.Vector3(0, ty, 0);
  const dx = camera.position.x - target.x;
  const dy = camera.position.y - target.y;
  const dz = camera.position.z - target.z;
  const r  = Math.sqrt(dx*dx + dy*dy + dz*dz);
  _orbit = {
    r, rMin: 1.0, rMax: 5.5,
    theta: Math.atan2(dx, dz),
    phi:   Math.asin(Math.max(-1, Math.min(1, dy / r))),
    phiMin: -0.15, phiMax: 0.55,
    target,
    prevTouches: null,
  };
}

function _applyOrbit() {
  if (!_orbit || !camera) return;
  const { r, theta, phi, target } = _orbit;
  camera.position.set(
    target.x + r * Math.sin(theta) * Math.cos(phi),
    target.y + r * Math.sin(phi),
    target.z + r * Math.cos(theta) * Math.cos(phi)
  );
  camera.lookAt(target);
}

// ── TOUCH CONTROLS ────────────────────────────────────────────────
function _initTouchControls() {
  const canvas = renderer.domElement;

  canvas.addEventListener('touchstart', (e) => {
    if (!_orbit) return;
    _orbit.prevTouches = _copyTouches(e.touches);
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (!_orbit || !_orbit.prevTouches) return;
    e.preventDefault();
    const cur  = e.touches;
    const prev = _orbit.prevTouches;

    if (cur.length === 1 && prev.length === 1) {
      // Single finger — orbit
      const dx = cur[0].clientX - prev[0].clientX;
      const dy = cur[0].clientY - prev[0].clientY;
      _orbit.theta -= dx * 0.008;
      _orbit.phi    = Math.max(_orbit.phiMin,
                       Math.min(_orbit.phiMax, _orbit.phi + dy * 0.005));
    } else if (cur.length === 2 && prev.length === 2) {
      // Two fingers — pinch zoom
      const prevDist = _touchDist(prev[0], prev[1]);
      const curDist  = _touchDist(cur[0],  cur[1]);
      if (prevDist > 0) {
        _orbit.r = Math.max(_orbit.rMin,
                    Math.min(_orbit.rMax, _orbit.r * (prevDist / curDist)));
      }
    }

    _orbit.prevTouches = _copyTouches(cur);
    _applyOrbit();
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    if (_orbit) _orbit.prevTouches = null;
  }, { passive: true });
}

function _copyTouches(list) {
  return Array.from(list).map(t => ({ clientX: t.clientX, clientY: t.clientY }));
}
function _touchDist(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function _onResize() {
  if (!renderer || !camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isPortrait = h > w;
  renderer.setSize(w, h);
  camera.aspect  = w / h;
  camera.fov     = isPortrait ? 62 : 50;
  camera.position.set(0, isPortrait ? 1.15 : 1.40, isPortrait ? 2.2 : 1.8);
  camera.lookAt(0, isPortrait ? 1.05 : 1.20, 0);
  camera.updateProjectionMatrix();
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

    // Force avatar to face straight toward camera
    avatarRoot.rotation.set(0, 0, 0);

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
  const targetX = -0.50 + 0.02 * Math.sin(idleTime * 0.3);
  const targetY =  0.00 + 0.02 * Math.sin(idleTime * 0.2);
  const speed   = 0.08;
  headBone.rotation.x += (targetX - headBone.rotation.x) * speed;
  headBone.rotation.y += (targetY - headBone.rotation.y) * speed;
}

// ── IDLE BODY SWAY ────────────────────────────────────────────────
function animateIdle(delta) {
  if (!avatarRoot) return;
  idleTime += delta;
  // Slight body rotation to correct natural stance offset
  avatarRoot.rotation.y = 0.25;
}

// ── RENDER LOOP ───────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  animateHeadLook();
  animateMouth(delta);
  animateIdle(delta);
  _applyOrbit();
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
  try { localStorage.setItem('lastAvatarUrl', glbUrl); } catch(_) {}
  _launchTalkScreen(glbUrl);
}

function _launchTalkScreen(glbUrl) {
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

// Quick resume — skips survey, reloads last avatar if available, otherwise goes to avatar creation
window.quickResume = function() {
  window.appState = window.appState || {};
  window.appState.userName = window.appState.userName || 'You';
  window.appState.environmentTier = 0;
  const url = localStorage.getItem('lastAvatarUrl');
  if (url) {
    _launchTalkScreen(url);
  } else {
    window.goTo('s-avatar'); // skip survey, go straight to avatar creation
  }
};

window.startAvaturn = startAvaturn;
window.closeAvaturn = closeAvaturn;
