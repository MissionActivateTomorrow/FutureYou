'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Scenario } from '@/lib/scenarios';
import type { UserProfile } from '@/lib/onboarding';

const TOAST_MESSAGES: Record<string, string[]> = {
  A: [
    "Your salary just landed. Don't let it disappear again.",
    "Every month you wait, I get older and poorer.",
    "One small transfer today could change everything.",
  ],
  B: [
    "Salary in. I still remember checking that notification at 67.",
    "You're 4 months from breaking the cycle — invest something today.",
    "This month's deposit could be the one that changes our story.",
  ],
  C: [
    "Nice work. Your future self is watching you build something real.",
    "You're on track. Keep this momentum — don't skip this month.",
    "Salary hit. Put a little aside — your future self says thank you.",
  ],
  D: [
    "Money in. This is how freedom compounds — one month at a time.",
    "You're building the yacht with every deposit. Keep going.",
    "Another month on the path to full freedom. I'm proud of you.",
  ],
};

interface NotificationToastProps {
  scenario: Scenario;
  profile: UserProfile | null;
}

export default function NotificationToast({ scenario, profile }: NotificationToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem('fy_toast_shown');
    if (shown) return;

    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem('fy_toast_shown', '1');
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const messages = TOAST_MESSAGES[scenario.id] || TOAST_MESSAGES['C'];
  const message = messages[Math.floor(Math.random() * messages.length)];
  const name = profile?.name ? `, ${profile.name}` : '';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[340px] max-w-[90vw]"
        >
          <div
            className="rounded-2xl p-4 flex items-start gap-3 shadow-2xl"
            style={{
              background: 'rgba(15, 15, 25, 0.92)',
              border: `1px solid ${scenario.accentColor}44`,
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Avatar pip */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: scenario.accentColor + '33', color: scenario.accentColor }}
            >
              67
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold mb-0.5" style={{ color: scenario.accentColor }}>
                From your future self{name}
              </p>
              <p className="text-sm text-white/80 leading-snug">{message}</p>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="text-white/30 hover:text-white/60 text-lg leading-none shrink-0 mt-0.5"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
