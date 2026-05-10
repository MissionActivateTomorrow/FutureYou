'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SCENARIOS, type ScenarioId } from '@/lib/scenarios';
import { loadProfile, type UserProfile } from '@/lib/onboarding';
import { loadAvatarBlob } from '@/lib/avatarStorage';
import ScenarioChip from '@/components/ScenarioChip';
import NotificationToast from '@/components/NotificationToast';

// Three.js must be loaded client-side only
const AvatarScene = dynamic(() => import('@/components/AvatarScene'), { ssr: false });

function HomeContent() {
  const router = useRouter();
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('C');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [showMessage, setShowMessage] = useState(false);

  const scenario = SCENARIOS[activeScenario];

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    // Restore blob URL from IndexedDB (profile.avatarUrl is stale after reload)
    loadAvatarBlob().then((blob) => {
      if (blob) setAvatarUrl(URL.createObjectURL(blob));
    });
    const t = setTimeout(() => setShowMessage(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const handleScenarioChange = (id: ScenarioId) => {
    setActiveScenario(id);
    setShowMessage(false);
    setTimeout(() => setShowMessage(true), 1000);
  };

  return (
    <div className="fixed inset-0 bg-[#05050d]">
      {/* Full-bleed 3D scene */}
      <div className="absolute inset-0">
        <Suspense fallback={<div className="w-full h-full" style={{ background: scenario.skyBottom }} />}>
          <AvatarScene
            scenario={scenario}
            onAvatarClick={() => router.push('/chat')}
            interactive
            photoDataUrl={profile?.photoDataUrl}
            avatarColors={profile?.avatarColors}
            avatarUrl={avatarUrl}
          />
        </Suspense>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-12 px-4 gap-3 z-10">
        <motion.p
          className="text-xs tracking-widest uppercase text-white/30 font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          FutureYou
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
        >
          <ScenarioChip active={activeScenario} onChange={handleScenarioChange} />
        </motion.div>
      </div>

      {/* Bottom overlay: message + tap hint */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-10 z-10 pointer-events-none">
        {/* Daily message card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: showMessage ? 1 : 0, y: showMessage ? 0 : 20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-4"
        >
          <div
            className="rounded-2xl px-5 py-4"
            style={{
              background: 'rgba(5,5,13,0.75)',
              border: `1px solid ${scenario.accentColor}33`,
              backdropFilter: 'blur(20px)',
            }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: scenario.accentColor }}>
              {scenario.label} · {scenario.subtitle}
            </p>
            <p className="text-sm text-white/80 leading-snug italic">
              &ldquo;{scenario.openingMessage}&rdquo;
            </p>
          </div>
        </motion.div>

        {/* Tap hint */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <div
            className="rounded-full px-5 py-2.5 pointer-events-auto cursor-pointer flex items-center gap-2 text-sm font-medium"
            style={{
              background: scenario.accentColor,
              color: '#fff',
            }}
            onClick={() => router.push('/chat')}
          >
            <span>Talk to your future self</span>
            <span>→</span>
          </div>
        </motion.div>
      </div>

      {/* Scenario label chip bottom-right */}
      <motion.div
        className="absolute bottom-10 right-5 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div
          className="rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{
            background: scenario.accentColor + '22',
            border: `1px solid ${scenario.accentColor}44`,
            color: scenario.accentColor,
          }}
        >
          {scenario.status}
        </div>
      </motion.div>

      {/* Photo overlay bottom-left */}
      {profile?.photoDataUrl && (
        <motion.div
          className="absolute bottom-10 left-5 z-10 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.photoDataUrl}
            alt="You"
            className="w-10 h-10 rounded-full object-cover border-2"
            style={{ borderColor: scenario.accentColor }}
          />
          <span className="text-xs text-white/40">You, age 67</span>
        </motion.div>
      )}

      {/* Notification toast */}
      <NotificationToast scenario={scenario} profile={profile} />
    </div>
  );
}

export default function HomePage() {
  return <HomeContent />;
}
