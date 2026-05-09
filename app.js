import { speak, initRecognition, startListening, stopListening, setSpeakCallbacks } from './voice.js';
import { setSpeaking } from './avatar.js';

// ── GLOBAL STATE ──────────────────────────────────────────────────
window.appState = {
  userName: '', userAge: 25, salaryRange: '1500-3000',
  contributes: false, scenarios: null
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
  window.appState.salaryRange  = salaryEl.value;
  window.appState.contributes  = pensionEl?.value === 'yes';
  window.appState.userAge      = parseInt(document.getElementById('input-age').value);
  window.appState.scenarios    = calculateScenarios(window.appState.salaryRange, window.appState.userAge);
  goTo('s-avatar');
};

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

// ── SUBTITLE ─────────────────────────────────────────────────────
function showSubtitle(text) {
  const el = document.getElementById('speech-bubble');
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = text;
    el.style.opacity = '1';
  }, 150);
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
