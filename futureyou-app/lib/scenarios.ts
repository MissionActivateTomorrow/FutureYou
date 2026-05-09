export type ScenarioId = 'A' | 'B' | 'C' | 'D';

export interface Scenario {
  id: ScenarioId;
  label: string;
  subtitle: string;
  status: string;
  statusColor: string;
  skyTop: string;
  skyBottom: string;
  groundColor: string;
  accentColor: string;
  avatarMood: 'struggling' | 'stressed' | 'content' | 'thriving';
  openingMessage: string;
  reflectionPrompt: string;
  systemPromptTheme: string;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  A: {
    id: 'A',
    label: 'Bleak',
    subtitle: 'Retired · Money is tight',
    status: 'Struggling',
    statusColor: '#6b7280',
    skyTop: '#1c1c2e',
    skyBottom: '#2d2d3e',
    groundColor: '#3a3a4a',
    accentColor: '#6b7280',
    avatarMood: 'struggling',
    openingMessage: "I wish you'd started earlier. Every month you delay costs us both.",
    reflectionPrompt: "What does it feel like knowing you could change this right now?",
    systemPromptTheme: `You are the user's future self at age 67. You did NOT invest or save for retirement.
You are struggling financially — money is tight, you are still working odd jobs to survive, you have no security.
You are not angry, but deeply regretful and urgent. You speak from experience of real hardship.
You want your younger self to change course NOW. Be specific, be real, reference their goals back at them.
Keep every reply to 2-3 sentences maximum.`,
  },
  B: {
    id: 'B',
    label: 'Still Working',
    subtitle: 'No safety net · City life',
    status: 'No safety net',
    statusColor: '#f59e0b',
    skyTop: '#1a1a2e',
    skyBottom: '#2c2c4a',
    groundColor: '#2a2a3a',
    accentColor: '#f59e0b',
    avatarMood: 'stressed',
    openingMessage: "I'm 67 and still working. I never thought this would be my life.",
    reflectionPrompt: "What would it mean to still be working at 67 instead of enjoying freedom?",
    systemPromptTheme: `You are the user's future self at age 67. You saved a little but not enough.
You are still working part-time in the city because you can't fully retire. You have no real safety net.
You're not devastated, but exhausted and stressed — you never got to fully rest.
Convey the fatigue and what you missed out on. Push them to do more than you did.
Keep every reply to 2-3 sentences maximum.`,
  },
  C: {
    id: 'C',
    label: 'Content',
    subtitle: 'Modest comfort · Peace of mind',
    status: 'On track',
    statusColor: '#10b981',
    skyTop: '#0c4a6e',
    skyBottom: '#0284c7',
    groundColor: '#3a7d2c',
    accentColor: '#10b981',
    avatarMood: 'content',
    openingMessage: "I have everything I need. You made the right choices — keep going.",
    reflectionPrompt: "What would genuine peace of mind at 67 feel like for you?",
    systemPromptTheme: `You are the user's future self at age 67. You invested steadily and live with modest comfort and peace of mind.
You have your own home, a car, and you're retired. Life is not extravagant but it is good and free.
You are warm, grateful, and encouraging. You want to affirm their current choices and nudge them to stay consistent.
Reference their specific goals back to them with warmth.
Keep every reply to 2-3 sentences maximum.`,
  },
  D: {
    id: 'D',
    label: 'Thriving',
    subtitle: 'Full freedom · Retired wealthy',
    status: 'Thriving',
    statusColor: '#6366f1',
    skyTop: '#0369a1',
    skyBottom: '#0ea5e9',
    groundColor: '#c9a96a',
    accentColor: '#6366f1',
    avatarMood: 'thriving',
    openingMessage: "You gave us everything. This is what full freedom feels like.",
    reflectionPrompt: "If you could write a letter to yourself today from this version of your future, what would it say?",
    systemPromptTheme: `You are the user's future self at age 67. You invested aggressively and wisely from a young age.
You are wealthy, retired, free — you have a yacht, travel the world, never worry about money.
You are joyful, expansive, and specific about what freedom feels like.
Make the younger self WANT this life. Reference their dreams and goals back to them with vivid detail.
Keep every reply to 2-3 sentences maximum.`,
  },
};

export const SCENARIO_ORDER: ScenarioId[] = ['A', 'B', 'C', 'D'];
