'use client';

import { useRef, useEffect, useState } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import * as THREE from 'three';

interface Props {
  url: string;
  analyserRef?: React.MutableRefObject<AnalyserNode | null>;
}

// ─── GLB avatar (Ready Player Me) ────────────────────────────────────────────

const MOUTH_KEYS = [
  'mouthOpen', 'viseme_aa', 'viseme_O', 'jawOpen',
  'mouth_open', 'Mouth_Open', 'Fcl_MTH_A',
];

function GLBAvatar({ url, analyserRef }: Props) {
  const { scene } = useGLTF(url);
  const morphTargets = useRef<{ mesh: THREE.SkinnedMesh; idx: number }[]>([]);
  const freqBuf = useRef<Uint8Array | null>(null);
  const amp = useRef(0);

  useEffect(() => {
    morphTargets.current = [];
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.SkinnedMesh)) return;
      const dict = obj.morphTargetDictionary;
      if (!dict || !obj.morphTargetInfluences) return;
      for (const key of MOUTH_KEYS) {
        if (dict[key] !== undefined) {
          morphTargets.current.push({ mesh: obj, idx: dict[key] });
          break;
        }
      }
    });
  }, [scene]);

  useFrame(() => {
    const analyser = analyserRef?.current;
    let target = 0;
    if (analyser) {
      if (!freqBuf.current || freqBuf.current.length !== analyser.frequencyBinCount) {
        freqBuf.current = new Uint8Array(analyser.frequencyBinCount);
      }
      analyser.getByteFrequencyData(freqBuf.current as Uint8Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 1; i <= 12; i++) sum += freqBuf.current[i];
      target = Math.min(1, Math.pow((sum / (12 * 255)) * 2.5, 0.6));
    }
    amp.current = THREE.MathUtils.lerp(amp.current, target, 0.25);
    for (const { mesh, idx } of morphTargets.current) {
      if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[idx] = amp.current;
    }
  });

  return <primitive object={scene} scale={1.15} position={[0, -0.9, 0]} />;
}

// ─── VRM avatar (VRoid Studio) ────────────────────────────────────────────────

function VRMAvatar({ url, analyserRef }: Props) {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const vrm = gltf.userData.vrm as VRM | undefined;
  const freqBuf = useRef<Uint8Array | null>(null);
  const amp = useRef(0);

  useFrame((_, delta) => {
    if (!vrm) return;
    vrm.update(delta);

    const analyser = analyserRef?.current;
    let target = 0;
    if (analyser) {
      if (!freqBuf.current || freqBuf.current.length !== analyser.frequencyBinCount) {
        freqBuf.current = new Uint8Array(analyser.frequencyBinCount);
      }
      analyser.getByteFrequencyData(freqBuf.current as Uint8Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 1; i <= 12; i++) sum += freqBuf.current[i];
      target = Math.min(1, Math.pow((sum / (12 * 255)) * 2.5, 0.6));
    }
    amp.current = THREE.MathUtils.lerp(amp.current, target, 0.25);

    // VRM standardised mouth expression
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Aa, amp.current);
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} scale={0.95} position={[0, -0.85, 0]} />;
}

// ─── Router: pick GLB or VRM based on URL extension ─────────────────────────

export default function TalkingAvatar({ url, analyserRef }: Props) {
  const isVRM = url.toLowerCase().endsWith('.vrm') || url.includes('format=vrm');
  return isVRM
    ? <VRMAvatar url={url} analyserRef={analyserRef} />
    : <GLBAvatar url={url} analyserRef={analyserRef} />;
}
