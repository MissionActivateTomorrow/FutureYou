'use client';

import { motion } from 'framer-motion';
import { SCENARIOS, SCENARIO_ORDER, type ScenarioId } from '@/lib/scenarios';

interface ScenarioChipProps {
  active: ScenarioId;
  onChange: (id: ScenarioId) => void;
}

export default function ScenarioChip({ active, onChange }: ScenarioChipProps) {
  return (
    <div
      className="flex gap-1 rounded-full p-1"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {SCENARIO_ORDER.map((id) => {
        const s = SCENARIOS[id];
        const isActive = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="relative rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200"
            style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.45)' }}
          >
            {isActive && (
              <motion.div
                layoutId="scenario-pill"
                className="absolute inset-0 rounded-full"
                style={{ background: s.accentColor }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{s.status}</span>
          </button>
        );
      })}
    </div>
  );
}
