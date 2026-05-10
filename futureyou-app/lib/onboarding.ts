export interface UserProfile {
  name: string;
  age: string;
  goals: string;
  retirementVision: string;
  photoDataUrl?: string;
  avatarColors?: { skin: string; hair: string };
  avatarUrl?: string; // Ready Player Me GLB URL
}

export interface OnboardingQuestion {
  id: keyof UserProfile;
  avatarText: string;
  placeholder: string;
  inputType: 'text' | 'textarea' | 'photo' | 'avatarUrl';
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'name',
    avatarText: "Hey, I'm your future self. Before we talk... what's your name?",
    placeholder: 'Your name...',
    inputType: 'text',
  },
  {
    id: 'age',
    avatarText: "Nice to meet you. How old are you right now?",
    placeholder: 'Your age...',
    inputType: 'text',
  },
  {
    id: 'goals',
    avatarText: "What are your biggest goals in life? Dreams, ambitions — anything.",
    placeholder: 'Travel the world, start a family, build a company...',
    inputType: 'textarea',
  },
  {
    id: 'retirementVision',
    avatarText: "And at 60 — what does your ideal life look like?",
    placeholder: 'Living by the coast, spending time with grandkids, total freedom...',
    inputType: 'textarea',
  },
  {
    id: 'avatarUrl',
    avatarText: "Last thing — paste your Ready Player Me avatar URL so I look like you. (readyplayer.me — free, 2 mins)",
    placeholder: 'https://models.readyplayer.me/YOUR_ID.glb',
    inputType: 'avatarUrl',
  },
];

export function saveProfile(profile: UserProfile) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('futureyou_profile', JSON.stringify(profile));
  }
}

export function loadProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('futureyou_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function buildSystemPrompt(profile: UserProfile, scenarioTheme: string): string {
  return `${scenarioTheme}

User profile:
- Name: ${profile.name}
- Current age: ${profile.age}
- Life goals: ${profile.goals}
- Vision for life at 60: ${profile.retirementVision}

Always address them as ${profile.name}. Reference their specific goals and vision throughout the conversation.
Speak as their future self — use "I remember when I was your age", "I made the choice", "we" etc.
Never break character. Never mention AI or that this is generated.`;
}
