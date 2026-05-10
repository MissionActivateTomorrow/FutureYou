import { speak, initRecognition, startListening, stopListening, setSpeakCallbacks } from './voice.js';
import { setSpeaking } from './avatar.js';

// ── GLOBAL STATE ──────────────────────────────────────────────────
window.appState = {
  userName: '', userAge: 25, salaryRange: '1500-3000',
  contributes: false, currentSavings: 0, scenarios: null
};

let exchangeCount = 0;
let micAvailable  = false;

// ── NAVIGATION ────────────────────────────────────────────────────
window.goTo = function(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  window.scrollTo(0, 0);
};

// ── PARTICLES ─────────────────────────────────────────────────────
(function createParticles() {
  const c = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration = (8 + Math.random() * 12) + 's';
    p.style.animationDelay    = (Math.random() * 10) + 's';
    p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
    c.appendChild(p);
  }
})();

// ── SURVEY ────────────────────────────────────────────────────────
window.nextQ = function(current) {
  if (current === 0) {
    const name = document.getElementById('input-name').value.trim();
    if (!name) { alert('Please enter your name!'); return; }
    window.appState.userName = name;
  }
  if (current === 1) {
    window.appState.userAge = parseInt(document.getElementById('input-age').value);
  }
  document.getElementById(`q${current}`).classList.remove('active');
  document.getElementById(`dot-${current}`).classList.remove('active');
  document.getElementById(`q${current+1}`).classList.add('active');
  document.getElementById(`dot-${current+1}`).classList.add('active');
};

window.submitSurvey = function() {
  const salaryEl  = document.querySelector('input[name="salary"]:checked');
  const pensionEl = document.querySelector('input[name="pension"]:checked');
  if (!salaryEl) { alert('Please select your salary!'); return; }
  window.appState.salaryRange     = salaryEl.value;
  window.appState.contributes     = pensionEl?.value === 'yes';
  window.appState.userAge         = parseInt(document.getElementById('input-age').value);
  window.appState.environmentTier = 0;
  window.appState.scenarios       = calculateScenarios(window.appState.salaryRange, window.appState.userAge);
  goTo('s-avatar');
  _autoLoadDemoAvatar();
};

function _autoLoadDemoAvatar() {
  const steps = [
    [800,  'Ageing your avatar to 65…'],
    [1800, 'Adding 40 years of experience…'],
    [2800, 'Almost ready…'],
  ];
  const sub   = document.getElementById('avatar-gen-sub');
  const title = document.getElementById('avatar-gen-title');
  steps.forEach(([ms, txt]) => setTimeout(() => { if (sub) sub.textContent = txt; }, ms));
  setTimeout(() => {
    if (title) title.textContent = 'Meet your future self.';
    window.useDemoAvatar();
  }, 3400);
}

window.switchEnv = function(tier, btn) {
  document.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (window._setEnvironmentTier) window._setEnvironmentTier(tier);
  if (window.appState) window.appState.environmentTier = tier;
  updateStatsSheet();
  const talkSection = document.getElementById('s-talk');
  if (talkSection && talkSection.classList.contains('active')) {
    window.startConversation();
  }
};

// ── STATS BOTTOM SHEET ────────────────────────────────────────────
const TIER_MONTHLY = { 0: 380,  1: 680,   3: 1100,  5: 1850  };
const TIER_SAVED   = { 0: 0,    1: 10000, 3: 50000, 5: 130000 };
const STATE_PENSION = 540; // Latvia baseline

function updateStatsSheet() {
  const state = window.appState || {};
  const tier  = state.environmentTier;
  const yearsLeft = Math.max(0, 65 - (state.userAge || 25));
  const monthlySalary = { '<800':750,'800-1500':1150,'1500-3000':2250,'3000+':3500 }[state.salaryRange] || 1150;
  const monthlyContrib = Math.round(monthlySalary * 0.10);
  const annualRefund   = Math.round(monthlyContrib * 12 * 0.20);

  let pension, saved, extra;

  if (tier !== undefined && TIER_MONTHLY[tier] !== undefined) {
    pension = TIER_MONTHLY[tier];
    saved   = TIER_SAVED[tier];
    extra   = Math.max(0, pension - STATE_PENSION);
  } else if (state.scenarios) {
    const s = state.scenarios;
    pension = state.contributes ? s.with.monthlyPension : s.without.monthlyPension;
    saved   = state.contributes ? s.with.totalSaved : 0;
    extra   = s.difference || 0;
  } else {
    pension = STATE_PENSION; saved = 0; extra = 0;
  }

  const fmt = (n) => '€' + Number(n).toLocaleString();
  document.getElementById('stat-pension').textContent  = fmt(pension);
  document.getElementById('stat-pension-sub').textContent =
    tier === 0 ? 'state pension only — no private savings' :
    tier === 5 ? 'state + 3rd pillar — fully on track' :
                 'state + 3rd pillar combined';
  document.getElementById('stat-saved').textContent   = saved > 0 ? fmt(saved) : '€0';
  document.getElementById('stat-refund').textContent  = fmt(annualRefund);
  document.getElementById('stat-contrib').textContent = fmt(monthlyContrib);
  document.getElementById('stat-years').textContent   = yearsLeft + ' yrs';
  document.getElementById('stat-extra').textContent   = extra > 0 ? '+' + fmt(extra) : '€0';
}

window.toggleStatsSheet = function() {
  const sheet = document.getElementById('stats-sheet');
  sheet.classList.toggle('open');
  if (sheet.classList.contains('open')) updateStatsSheet();
};

// Swipe-up gesture on the handle
(function initSheetSwipe() {
  let startY = 0;
  const handle = document.getElementById('stats-handle');
  if (!handle) return;
  handle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  handle.addEventListener('touchend', e => {
    const dy = startY - e.changedTouches[0].clientY;
    if (dy > 40)  document.getElementById('stats-sheet').classList.add('open');
    if (dy < -40) document.getElementById('stats-sheet').classList.remove('open');
  }, { passive: true });
})();

// ── START CONVERSATION (called after avatar loads) ─────────────────
window.startConversation = async function() {
  resetChat();
  exchangeCount = 0;

  document.getElementById('talk-name').textContent =
    `Future ${window.appState.userName}, age 65`;
  document.getElementById('talk-status').textContent = 'Getting ready...';

  // Set up speaking callbacks — drive jaw animation
  setSpeakCallbacks(
    () => setSpeaking(true),   // onStart
    () => setSpeaking(false)   // onEnd
  );

  // Set up mic recognition
  micAvailable = initRecognition(
    async (text) => {
      // User finished speaking — process it
      document.getElementById('talk-status').textContent = 'Thinking...';
      document.getElementById('mic-btn').classList.remove('active');
      await handleUserSpeech(text);
    },
    () => {
      document.getElementById('mic-btn').classList.remove('active');
      document.getElementById('talk-status').textContent = 'Tap mic to speak';
    }
  );

  if (!micAvailable) {
    // Show text fallback for iOS
    document.getElementById('text-fallback').style.display = 'flex';
    document.getElementById('mic-btn').style.display = 'none';
    document.getElementById('mic-hint').style.display = 'none';
  }

  // Future self speaks first
  await futureSelfspeaks('Say hello to your younger self for the first time. Warm, personal, short, end with a question.');
};

// ── FUTURE SELF SPEAKS ────────────────────────────────────────────
async function futureSelfspeaks(prompt) {
  document.getElementById('talk-status').textContent = 'Speaking...';
  const text = await getGeminiReply(prompt, window.appState);
  showSubtitle(text);
  await speak(text);
  document.getElementById('talk-status').textContent = micAvailable
    ? 'Tap mic to speak' : 'Type your reply below';
  exchangeCount++;
  if (exchangeCount >= 4) {
    document.getElementById('cta-btn').style.display = 'block';
  }
}

// ── USER SPEAKS OR TYPES ──────────────────────────────────────────
async function handleUserSpeech(text) {
  showSubtitle(`You: "${text}"`);
  await futureSelfspeaks(text);
}

// ── MIC BUTTON ────────────────────────────────────────────────────
window.toggleMic = function() {
  const btn = document.getElementById('mic-btn');
  if (!micAvailable) return;
  if (btn.classList.contains('active')) {
    stopListening();
    btn.classList.remove('active');
    document.getElementById('talk-status').textContent = 'Tap mic to speak';
  } else {
    // Don't listen while future self is speaking
    if (document.getElementById('face-ring').classList.contains('speaking')) return;
    startListening();
    btn.classList.add('active');
    document.getElementById('talk-status').textContent = 'Listening...';
  }
};

// ── TEXT FALLBACK (iOS) ───────────────────────────────────────────
window.sendTextMessage = async function() {
  const input = document.getElementById('text-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await handleUserSpeech(text);
};

// ── CAPTION TOGGLE ───────────────────────────────────────
let captionEnabled = false;
window.toggleCaption = function() {
  captionEnabled = !captionEnabled;
  const bubble = document.getElementById('speech-bubble');
  const btn    = document.getElementById('caption-toggle');
  bubble.style.display = captionEnabled ? '' : 'none';
  btn.classList.toggle('active', captionEnabled);
};

// ── SUBTITLE ─────────────────────────────────────────────────────
function showSubtitle(text) {
  const el = document.getElementById('speech-bubble');
  el.textContent = text; // always update text
  if (!captionEnabled) return; // only show if enabled
  el.style.opacity = '0';
  el.style.display = '';
  setTimeout(() => { el.style.opacity = '1'; }, 150);
}

// ── SHARE ─────────────────────────────────────────────────────────
window.shareApp = function() {
  if (navigator.share) {
    navigator.share({ title:'FutureYou', text:'I just talked to my future self. Try it.', url:window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied!');
  }
};
