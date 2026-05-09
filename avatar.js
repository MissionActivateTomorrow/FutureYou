import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, avatarMesh;
let faceMeshes = [];   // meshes with jawOpen blendshape (Wolf3D_Head, Wolf3D_Teeth)
let clock;
let jawVal = 0;        // smoothed 0-1

// ARKit blendshape names used by Ready Player Me
const JAW_NAMES   = ['jawOpen', 'JawOpen'];
const SMILE_NAMES = ['mouthSmileLeft', 'mouthSmileRight'];

// ── SCENE ────────────────────────────────────────────────────────
export function initScene() {
  const canvas = document.getElementById('face-canvas');
  const size   = canvas.parentElement.offsetWidth || 300;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(size, size);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  scene = new THREE.Scene();
  clock = new THREE.Clock();

  // RPM half-body avatar — head sits at ~1.60m
  camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  camera.position.set(0, 1.60, 0.68);
  camera.lookAt(0, 1.60, 0);

  const key  = new THREE.DirectionalLight(0xfff8f0, 2.4);
  key.position.set(1, 2, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x1AD2A0, 0.55);
  fill.position.set(-2, 1, 1);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  animate();
}

// ── LOAD AVATAR GLB ───────────────────────────────────────────────
export function loadAvatar(glbUrl) {
  if (avatarMesh) { scene.remove(avatarMesh); avatarMesh = null; }
  faceMeshes = [];

  new GLTFLoader().load(glbUrl, (gltf) => {
    avatarMesh = gltf.scene;
    scene.add(avatarMesh);

    avatarMesh.traverse((node) => {
      if (!node.isMesh) return;
      // RPM face meshes that carry jawOpen blendshape
      if (node.morphTargetDictionary && node.morphTargetInfluences) {
        const keys = Object.keys(node.morphTargetDictionary);
        console.log('[LipSync] mesh:', node.name, '| blendshapes:', keys.join(', '));
        faceMeshes.push(node);
      }
    });

    console.log('[LipSync] face meshes with blendshapes:', faceMeshes.length);
    window.dispatchEvent(new CustomEvent('avatar-loaded'));
  },
  undefined,
  err => console.error('[LipSync] load error:', err));
}

// ── MOUTH ANIMATION ───────────────────────────────────────────────
function animateMouth(delta) {
  const speaking = !!window._futureSpeaking;

  // Oscillate between 0.25 and 0.85 while speaking — clearly visible
  const freq   = 5.5;
  const target = speaking
    ? 0.25 + 0.6 * Math.abs(Math.sin(clock.elapsedTime * freq))
    : 0;

  jawVal += (target - jawVal) * Math.min(1, delta * (speaking ? 18 : 12));

  faceMeshes.forEach(mesh => {
    const dict = mesh.morphTargetDictionary;
    const inf  = mesh.morphTargetInfluences;

    const jawName = JAW_NAMES.find(n => n in dict);
    if (jawName !== undefined) inf[dict[jawName]] = jawVal;

    const smileName = SMILE_NAMES.find(n => n in dict);
    if (smileName !== undefined) inf[dict[smileName]] = speaking ? 0.08 : 0;
  });
}

// ── IDLE HEAD MOVEMENT ────────────────────────────────────────────
let idleT = 0;
function animateIdle(delta) {
  if (!avatarMesh) return;
  idleT += delta;
  avatarMesh.rotation.y = 0.035 * Math.sin(idleT * 0.55);
  avatarMesh.rotation.x = 0.008 * Math.sin(idleT * 0.38);
}

// ── RENDER LOOP ───────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  animateMouth(delta);
  animateIdle(delta);
  renderer.render(scene, camera);
}

// ── SPEAKING STATE ────────────────────────────────────────────────
export function setSpeaking(state) {
  window._futureSpeaking = state;
  const ring = document.getElementById('face-ring');
  if (ring) ring.classList.toggle('speaking', state);
}

// ── READY PLAYER ME FLOW ──────────────────────────────────────────
// RPM uses an iframe + postMessage to return the avatar GLB URL.
// The avatar includes Wolf3D_Head mesh with full ARKit blendshapes.

let rpmFrame = null;

export function startAvaturn() {
  const modal = document.getElementById('avaturn-modal');
  const container = document.getElementById('avaturn-sdk-container');
  modal.style.display = 'block';
  container.innerHTML = '';

  rpmFrame = document.createElement('iframe');
  rpmFrame.id = 'rpm-frame';
  // frameApi param enables postMessage events
  rpmFrame.src = 'https://demo.readyplayer.me/avatar?frameApi&bodyType=halfbody&morphTargets=ARKit';
  rpmFrame.style.cssText = 'width:100%;height:100%;border:none;';
  container.appendChild(rpmFrame);

  // RPM sends the avatar URL via postMessage
  window.addEventListener('message', onRpmMessage);
}

function onRpmMessage(event) {
  // Only handle RPM messages
  if (!event.origin.includes('readyplayer.me')) return;

  let data = event.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return; }
  }

  // RPM v1 export event
  if (data?.source === 'readyplayerme' && data?.eventName === 'v1.avatar.exported') {
    window.removeEventListener('message', onRpmMessage);
    const glbUrl = data.data?.url;
    if (glbUrl) {
      closeAvaturn();
      onAvatarExported(glbUrl);
    }
  }
}

export function closeAvaturn() {
  document.getElementById('avaturn-modal').style.display = 'none';
  window.removeEventListener('message', onRpmMessage);
}

function onAvatarExported(glbUrl) {
  document.getElementById('avatar-intro').style.display = 'none';
  document.getElementById('avatar-loading').style.display = 'flex';

  window.goTo('s-talk');

  requestAnimationFrame(() => {
    initScene();
    // RPM GLBs need the morphTargets query param — append if not already present
    const url = glbUrl.includes('morphTargets') ? glbUrl : glbUrl + '?morphTargets=ARKit';
    loadAvatar(url);
  });

  window.addEventListener('avatar-loaded', () => {
    const overlay = document.getElementById('face-loading-overlay');
    if (overlay) overlay.style.display = 'none';
    window.startConversation();
  }, { once: true });
}

window.startAvaturn = startAvaturn;
window.closeAvaturn = closeAvaturn;
