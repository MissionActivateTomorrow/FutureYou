'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { Scenario } from '@/lib/scenarios';
import TalkingAvatar from './TalkingAvatar';

function useToon() {
  return useMemo(() => {
    const colors = new Uint8Array([40, 140, 230]);
    const tex = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);
}

// ─── FACE PHOTO TEXTURE ──────────────────────────────────────────────────────

function FacePhoto({ dataUrl }: { dataUrl: string }) {
  const texture = useLoader(THREE.TextureLoader, dataUrl);
  return (
    <mesh position={[0, 0.02, 0.346]}>
      <circleGeometry args={[0.29, 48]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

// ─── AVATAR ─────────────────────────────────────────────────────────────────

interface CartoonAvatarProps {
  mood: Scenario['avatarMood'];
  accentColor: string;
  skinColor?: string;
  hairColor?: string;
  photoDataUrl?: string;
  /** Pass a live AnalyserNode; useFrame reads it at 60fps for lip sync */
  analyserRef?: React.MutableRefObject<AnalyserNode | null>;
}

function CartoonAvatar({ mood, accentColor, skinColor, hairColor, photoDataUrl, analyserRef }: CartoonAvatarProps) {
  const groupRef    = useRef<THREE.Group>(null);
  const headRef     = useRef<THREE.Group>(null);
  const mouthOpenRef = useRef<THREE.Mesh>(null);
  const freqBufRef  = useRef<Uint8Array | null>(null);
  const gradientMap = useToon();

  const SKIN  = skinColor  || '#f5dfc0';
  const HAIR  = hairColor  || accentColor;
  const DARK  = '#1a1a2e';
  const WHITE = '#ffffff';

  const isHappy = mood === 'thriving' || mood === 'content';
  const isSad   = mood === 'struggling';

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // Idle float + head sway
    if (groupRef.current) groupRef.current.position.y = Math.sin(t * 0.7) * 0.03;
    if (headRef.current)  headRef.current.rotation.y  = Math.sin(t * 0.35) * 0.12;

    // ── Lip sync ──────────────────────────────────────────────────────────
    if (!mouthOpenRef.current) return;
    const analyser = analyserRef?.current;
    if (!analyser) {
      mouthOpenRef.current.visible = false;
      return;
    }
    if (!freqBufRef.current || freqBufRef.current.length !== analyser.frequencyBinCount) {
      freqBufRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }
    analyser.getByteFrequencyData(freqBufRef.current as Uint8Array<ArrayBuffer>);
    // Bins 1–12 cover ~170–2000 Hz (human voice fundamental + first harmonics)
    let sum = 0;
    for (let i = 1; i <= 12; i++) sum += freqBufRef.current[i];
    const amplitude = sum / (12 * 255);
    const openAmount = Math.pow(Math.min(amplitude * 2.2, 1), 0.6); // gamma + clamp

    mouthOpenRef.current.visible = openAmount > 0.04;
    mouthOpenRef.current.scale.set(1, Math.max(0.05, openAmount), 1);
  });

  return (
    <group ref={groupRef} scale={1.55} position={[0, -0.25, 0]}>

      {/* ── HEAD ── */}
      <group ref={headRef} position={[0, 0.78, 0]}>
        <mesh scale={[1, 1.05, 1]}>
          <sphereGeometry args={[0.34, 32, 32]} />
          <meshToonMaterial color={SKIN} gradientMap={gradientMap} />
        </mesh>

        {/* Hair cap */}
        <mesh position={[0, 0.18, -0.02]} scale={[1.01, 0.88, 1.01]}>
          <sphereGeometry args={[0.34, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshToonMaterial color={HAIR} gradientMap={gradientMap} />
        </mesh>

        {/* ── PHOTO FACE — user's actual face as texture ── */}
        {photoDataUrl ? (
          <Suspense fallback={null}>
            <FacePhoto dataUrl={photoDataUrl} />
          </Suspense>
        ) : (
          <>
            {/* ── LEFT EYE ── */}
            <group position={[-0.12, 0.04, 0.30]}>
              <mesh>
                <sphereGeometry args={[0.074, 16, 16]} />
                <meshBasicMaterial color={WHITE} />
              </mesh>
              <mesh position={[0, 0, 0.068]}>
                <circleGeometry args={[0.046, 16]} />
                <meshBasicMaterial color={DARK} />
              </mesh>
              <mesh position={[0.016, 0.018, 0.071]}>
                <circleGeometry args={[0.016, 8]} />
                <meshBasicMaterial color={WHITE} />
              </mesh>
              {isHappy && (
                <mesh position={[0, 0.05, 0.071]} rotation={[0, 0, 0.1]}>
                  <capsuleGeometry args={[0.006, 0.07, 4, 8]} />
                  <meshBasicMaterial color={DARK} />
                </mesh>
              )}
            </group>

            {/* ── RIGHT EYE ── */}
            <group position={[0.12, 0.04, 0.30]}>
              <mesh>
                <sphereGeometry args={[0.074, 16, 16]} />
                <meshBasicMaterial color={WHITE} />
              </mesh>
              <mesh position={[0, 0, 0.068]}>
                <circleGeometry args={[0.046, 16]} />
                <meshBasicMaterial color={DARK} />
              </mesh>
              <mesh position={[-0.016, 0.018, 0.071]}>
                <circleGeometry args={[0.016, 8]} />
                <meshBasicMaterial color={WHITE} />
              </mesh>
              {isHappy && (
                <mesh position={[0, 0.05, 0.071]} rotation={[0, 0, -0.1]}>
                  <capsuleGeometry args={[0.006, 0.07, 4, 8]} />
                  <meshBasicMaterial color={DARK} />
                </mesh>
              )}
            </group>

            {/* Cheek blush (happy only) */}
            {isHappy && (
              <>
                <mesh position={[-0.22, -0.07, 0.26]}>
                  <circleGeometry args={[0.055, 12]} />
                  <meshBasicMaterial color="#f472b6" transparent opacity={0.35} />
                </mesh>
                <mesh position={[0.22, -0.07, 0.26]}>
                  <circleGeometry args={[0.055, 12]} />
                  <meshBasicMaterial color="#f472b6" transparent opacity={0.35} />
                </mesh>
              </>
            )}
          </>
        )}

        {/* ── EYEBROWS (always shown — float above photo or toon face) ── */}
        <mesh position={[-0.12, 0.16, 0.31]} rotation={[0, 0, isSad ? 0.3 : -0.1]}>
          <capsuleGeometry args={[0.008, 0.075, 4, 8]} />
          <meshBasicMaterial color={HAIR} />
        </mesh>
        <mesh position={[0.12, 0.16, 0.31]} rotation={[0, 0, isSad ? -0.3 : 0.1]}>
          <capsuleGeometry args={[0.008, 0.075, 4, 8]} />
          <meshBasicMaterial color={HAIR} />
        </mesh>

        {/* ── MOUTH resting shape (shown when no photo, or behind photo) ── */}
        {!photoDataUrl && (
          <>
            {mood === 'thriving' && (
              <mesh position={[0, -0.14, 0.35]}>
                <torusGeometry args={[0.085, 0.022, 8, 20, Math.PI]} />
                <meshBasicMaterial color={DARK} />
              </mesh>
            )}
            {mood === 'content' && (
              <mesh position={[0, -0.13, 0.35]}>
                <torusGeometry args={[0.06, 0.016, 8, 20, Math.PI]} />
                <meshBasicMaterial color={DARK} />
              </mesh>
            )}
            {mood === 'stressed' && (
              <mesh position={[0, -0.14, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.012, 0.1, 4, 8]} />
                <meshBasicMaterial color={DARK} />
              </mesh>
            )}
            {mood === 'struggling' && (
              <mesh position={[0, -0.12, 0.35]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.06, 0.016, 8, 20, Math.PI]} />
                <meshBasicMaterial color={DARK} />
              </mesh>
            )}
          </>
        )}

        {/* ── LIP SYNC overlay — scales in Y from analyser amplitude ── */}
        <mesh ref={mouthOpenRef} position={[0, -0.145, 0.355]} visible={false}>
          <circleGeometry args={[0.065, 14]} />
          <meshBasicMaterial color="#12060a" />
        </mesh>
      </group>

      {/* ── NECK ── */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.18, 12]} />
        <meshToonMaterial color={SKIN} gradientMap={gradientMap} />
      </mesh>

      {/* ── BODY ── */}
      <mesh position={[0, -0.02, 0]} scale={[1, 1, 0.88]}>
        <capsuleGeometry args={[0.26, 0.52, 8, 16]} />
        <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
      </mesh>

      {/* ── LEFT ARM ── */}
      <group position={[-0.36, 0.20, 0]} rotation={[0, 0, isHappy ? 0.65 : isSad ? 0.1 : 0.3]}>
        <mesh>
          <capsuleGeometry args={[0.09, 0.44, 6, 12]} />
          <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.11, 14, 14]} />
          <meshToonMaterial color={SKIN} gradientMap={gradientMap} />
        </mesh>
      </group>

      {/* ── RIGHT ARM ── */}
      <group position={[0.36, 0.20, 0]} rotation={[0, 0, isHappy ? -0.65 : isSad ? -0.1 : -0.3]}>
        <mesh>
          <capsuleGeometry args={[0.09, 0.44, 6, 12]} />
          <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.11, 14, 14]} />
          <meshToonMaterial color={SKIN} gradientMap={gradientMap} />
        </mesh>
      </group>

      {/* ── LEFT LEG ── */}
      <group position={[-0.14, -0.67, 0]}>
        <mesh>
          <capsuleGeometry args={[0.11, 0.36, 6, 12]} />
          <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0.02, -0.3, 0.05]} rotation={[0.25, 0, 0]}>
          <capsuleGeometry args={[0.1, 0.18, 6, 10]} />
          <meshToonMaterial color={DARK} gradientMap={gradientMap} />
        </mesh>
      </group>

      {/* ── RIGHT LEG ── */}
      <group position={[0.14, -0.67, 0]}>
        <mesh>
          <capsuleGeometry args={[0.11, 0.36, 6, 12]} />
          <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[-0.02, -0.3, 0.05]} rotation={[0.25, 0, 0]}>
          <capsuleGeometry args={[0.1, 0.18, 6, 10]} />
          <meshToonMaterial color={DARK} gradientMap={gradientMap} />
        </mesh>
      </group>

      {/* ── GLOW RING ── */}
      <mesh position={[0, -1.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.46, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ─── ENVIRONMENT ────────────────────────────────────────────────────────────

function SceneEnvironment({ scenario }: { scenario: Scenario }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(new THREE.Color(scenario.skyBottom), 1);
  }, [gl, scenario.skyBottom]);

  return (
    <>
      <mesh scale={[-70, 70, 70]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color={scenario.skyTop} side={THREE.BackSide} />
      </mesh>
      <mesh scale={[-70, 24, 70]}>
        <sphereGeometry args={[1, 32, 8, 0, Math.PI * 2, 0.52, 0.52]} />
        <meshBasicMaterial color={scenario.skyBottom} side={THREE.BackSide} transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.18, 0]}>
        <circleGeometry args={[40, 64]} />
        <meshToonMaterial color={scenario.groundColor} />
      </mesh>
      <ScenarioProps scenario={scenario} />
      <Particles count={55} color={scenario.accentColor} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 10, 4]}
        intensity={1.5}
        color={scenario.id === 'D' ? '#ffe8b0' : scenario.id === 'C' ? '#ddeeff' : '#c0ccdd'}
      />
      <pointLight position={[0, 2.5, 1]} color={scenario.accentColor} intensity={0.6} distance={9} />
    </>
  );
}

// ─── PARTICLES ──────────────────────────────────────────────────────────────

function Particles({ count, color }: { count: number; color: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() =>
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 16,
      y: Math.random() * 7 - 1,
      z: (Math.random() - 0.5) * 9 - 1,
      speed: 0.06 + Math.random() * 0.08,
      range: 7,
    })), [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    const m = new THREE.Matrix4();
    data.forEach((p, i) => {
      const y = ((p.y + t * p.speed) % p.range) - 1;
      m.setPosition(p.x, y, p.z);
      meshRef.current!.setMatrixAt(i, m);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.028, 5, 5]} />
      <meshBasicMaterial color={color} transparent opacity={0.45} />
    </instancedMesh>
  );
}

// ─── SCENARIO PROPS ─────────────────────────────────────────────────────────

function ScenarioProps({ scenario }: { scenario: Scenario }) {
  const g = useToon();

  if (scenario.id === 'A') return (
    <>
      <mesh position={[-4, -0.25, -5.5]} rotation={[0, 0.25, 0]}>
        <boxGeometry args={[2.8, 1.8, 0.3]} />
        <meshToonMaterial color="#4a4a58" gradientMap={g} />
      </mesh>
      <mesh position={[-3.8, 0.62, -5.4]} rotation={[0, 0.25, 0.08]}>
        <boxGeometry args={[1.4, 0.4, 0.28]} />
        <meshToonMaterial color="#3d3d4b" gradientMap={g} />
      </mesh>
      <group position={[3.5, -1.18, -4.5]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.08, 0.14, 1.8, 7]} />
          <meshToonMaterial color="#383840" gradientMap={g} />
        </mesh>
        {[[-0.3, 1.5, 0.05], [0.25, 1.3, 0.0], [-0.1, 1.7, -0.05]].map(([x, y, rz], i) => (
          <mesh key={i} position={[x, y, 0]} rotation={[0, 0, rz]}>
            <cylinderGeometry args={[0.03, 0.06, 0.55, 5]} />
            <meshToonMaterial color="#383840" gradientMap={g} />
          </mesh>
        ))}
      </group>
    </>
  );

  if (scenario.id === 'B') return (
    <>
      {[
        { x: -6.5, z: -8.5, w: 1.3, h: 5.0, c: '#1a1a32' },
        { x: -4.8, z: -7.5, w: 1.0, h: 3.2, c: '#212140' },
        { x: -3.2, z: -9.0, w: 0.8, h: 6.5, c: '#161628' },
        { x:  5.2, z: -8.5, w: 1.5, h: 4.8, c: '#1c1c38' },
        { x:  6.8, z: -7.5, w: 0.9, h: 3.5, c: '#20203e' },
        { x:  8.2, z: -9.5, w: 1.2, h: 5.5, c: '#181830' },
      ].map((b, i) => (
        <group key={i} position={[b.x, b.h / 2 - 1.18, b.z]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.w * 0.85]} />
            <meshToonMaterial color={b.c} gradientMap={g} />
          </mesh>
          <mesh position={[0, 0, b.w * 0.43]}>
            <planeGeometry args={[b.w * 0.65, b.h * 0.72]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.07} />
          </mesh>
        </group>
      ))}
    </>
  );

  if (scenario.id === 'C') return (
    <>
      <group position={[-4.2, -1.18, -6]}>
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[2.4, 1.7, 2.0]} />
          <meshToonMaterial color="#e8d5a8" gradientMap={g} />
        </mesh>
        <mesh position={[0, 1.92, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[1.68, 1.0, 4]} />
          <meshToonMaterial color="#8b4513" gradientMap={g} />
        </mesh>
        <mesh position={[0, 0.3, 1.01]}>
          <boxGeometry args={[0.44, 0.85, 0.05]} />
          <meshToonMaterial color="#5c3a1e" gradientMap={g} />
        </mesh>
        <mesh position={[-0.68, 0.82, 1.01]}>
          <boxGeometry args={[0.5, 0.5, 0.05]} />
          <meshToonMaterial color="#87ceeb" gradientMap={g} />
        </mesh>
        <mesh position={[0.68, 0.82, 1.01]}>
          <boxGeometry args={[0.5, 0.5, 0.05]} />
          <meshToonMaterial color="#87ceeb" gradientMap={g} />
        </mesh>
        <mesh position={[0.6, 2.1, -0.3]}>
          <boxGeometry args={[0.28, 0.6, 0.28]} />
          <meshToonMaterial color="#8b4513" gradientMap={g} />
        </mesh>
      </group>
      <group position={[3.8, -1.18, -5]}>
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.1, 0.16, 1.4, 8]} />
          <meshToonMaterial color="#5c3a1e" gradientMap={g} />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.62, 14, 14]} />
          <meshToonMaterial color="#22c55e" gradientMap={g} />
        </mesh>
        <mesh position={[0.18, 1.9, 0.25]}>
          <sphereGeometry args={[0.3, 10, 10]} />
          <meshToonMaterial color="#4ade80" gradientMap={g} />
        </mesh>
      </group>
    </>
  );

  if (scenario.id === 'D') return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.16, -12]}>
        <planeGeometry args={[100, 40]} />
        <meshBasicMaterial color="#0369a1" transparent opacity={0.82} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.17, -6]}>
        <planeGeometry args={[100, 8]} />
        <meshBasicMaterial color="#a7c3d4" transparent opacity={0.5} />
      </mesh>
      <group position={[-4.5, -1.18, -4]}>
        <mesh position={[0.1, 1.05, 0]} rotation={[0.06, 0, 0.1]}>
          <cylinderGeometry args={[0.07, 0.16, 2.2, 9]} />
          <meshToonMaterial color="#92400e" gradientMap={g} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const yaw = (i * Math.PI * 2) / 6;
          return (
            <group key={i} position={[0.1, 2.28, 0]} rotation={[0, yaw, 0]}>
              <mesh position={[0.55, -0.08, 0]} rotation={[0, 0, 0.42]}>
                <boxGeometry args={[1.0, 0.06, 0.22]} />
                <meshToonMaterial color="#15803d" gradientMap={g} />
              </mesh>
            </group>
          );
        })}
        {[[0.18, 2.08, 0.15], [-0.1, 2.05, 0.08]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshToonMaterial color="#78350f" gradientMap={g} />
          </mesh>
        ))}
      </group>
      <group position={[5, -1.18, -5.5]}>
        <mesh position={[-0.08, 1.1, 0]} rotation={[0, 0, -0.09]}>
          <cylinderGeometry args={[0.07, 0.15, 2.4, 9]} />
          <meshToonMaterial color="#92400e" gradientMap={g} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const yaw = (i * Math.PI * 2) / 6 + 0.5;
          return (
            <group key={i} position={[-0.08, 2.4, 0]} rotation={[0, yaw, 0]}>
              <mesh position={[0.5, -0.06, 0]} rotation={[0, 0, 0.38]}>
                <boxGeometry args={[0.9, 0.05, 0.2]} />
                <meshToonMaterial color="#16a34a" gradientMap={g} />
              </mesh>
            </group>
          );
        })}
      </group>
      <group position={[4, -0.9, -16]}>
        <mesh>
          <boxGeometry args={[3.5, 0.45, 1.0]} />
          <meshToonMaterial color="#f1f5f9" gradientMap={g} />
        </mesh>
        <mesh position={[0.4, 0.58, 0]}>
          <boxGeometry args={[1.4, 0.7, 0.9]} />
          <meshToonMaterial color="#e2e8f0" gradientMap={g} />
        </mesh>
        <mesh position={[0.3, 0.48, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.0, 6]} />
          <meshToonMaterial color="#94a3b8" gradientMap={g} />
        </mesh>
        <mesh position={[0.4, 1.35, 0]}>
          <coneGeometry args={[0.6, 1.6, 3]} />
          <meshToonMaterial color="#ffffff" gradientMap={g} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, -1.15, -14]}>
        <planeGeometry args={[5, 3]} />
        <meshBasicMaterial color="#fde68a" transparent opacity={0.18} />
      </mesh>
    </>
  );

  return null;
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────

interface AvatarSceneProps {
  scenario: Scenario;
  onAvatarClick?: () => void;
  interactive?: boolean;
  analyserRef?: React.MutableRefObject<AnalyserNode | null>;
  avatarColors?: { skin: string; hair: string };
  photoDataUrl?: string;
  avatarUrl?: string;
}

export default function AvatarScene({
  scenario, onAvatarClick, interactive = true, analyserRef, avatarColors, photoDataUrl, avatarUrl,
}: AvatarSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.6, 3.4], fov: 50 }}
      style={{ width: '100%', height: '100%', cursor: onAvatarClick ? 'pointer' : 'grab' }}
    >
      <SceneEnvironment scenario={scenario} />

      <Float speed={1.0} rotationIntensity={0.08} floatIntensity={0.12}>
        <group onClick={onAvatarClick}>
          {avatarUrl ? (
            <Suspense fallback={null}>
              <TalkingAvatar url={avatarUrl} analyserRef={analyserRef} />
            </Suspense>
          ) : (
            <CartoonAvatar
              mood={scenario.avatarMood}
              accentColor={scenario.accentColor}
              skinColor={avatarColors?.skin}
              hairColor={avatarColors?.hair}
              photoDataUrl={photoDataUrl}
              analyserRef={analyserRef}
            />
          )}
        </group>
      </Float>

      {interactive && (
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2.2}
          maxDistance={8}
          maxPolarAngle={Math.PI / 1.75}
          minPolarAngle={Math.PI / 5}
          rotateSpeed={0.42}
          zoomSpeed={0.7}
          target={[0, 0.1, 0]}
        />
      )}
    </Canvas>
  );
}
