import { setCurrentPhoneme } from './avatar.js';

// ── SPEECH SYNTHESIS ─────────────────────────────────────────────
let onSpeakStart = null;
let onSpeakEnd   = null;

// Voices load async in Chrome — must wait for onvoiceschanged
let cachedVoices = [];
function loadVoices() {
  cachedVoices = window.speechSynthesis.getVoices();
}
loadVoices();
window.speechSynthesis.onvoiceschanged = loadVoices;

// Keep utterance reference alive — Chrome GC bug kills it mid-speech
let activeUtterance = null;
// Timer that polls whether synthesis is still running (Chrome pauses on background tab)
let speakPollTimer  = null;

function startSpeakPoll() {
  // Chrome sometimes pauses speechSynthesis on background tabs; kick it every 10s
  speakPollTimer = setInterval(() => {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    if (!window.speechSynthesis.speaking) clearSpeakPoll();
  }, 5000);
}
function clearSpeakPoll() {
  if (speakPollTimer) { clearInterval(speakPollTimer); speakPollTimer = null; }
}

function classifyPhoneme(word) {
  const w = word.toLowerCase();
  if (/[pbm]/.test(w))         return 'mm';
  if (/sh|ch|[sz]/.test(w))   return 'ss';
  if (/[ou]/.test(w))          return 'oo';
  if (/[aei]/.test(w))         return 'aa';
  return 'rest';
}

function speak(text) {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    clearSpeakPoll();

    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterance = utterance; // keep alive — prevents Chrome GC bug

    // Prefer a slightly older-sounding male voice
    const preferred = cachedVoices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Male') || v.name.includes('Daniel') ||
       v.name.includes('Alex') || v.name.includes('David'))
    );
    if (preferred) utterance.voice = preferred;

    utterance.rate   = 0.88;
    utterance.pitch  = 0.9;
    utterance.volume = 1;

    let ended = false;
    function finish() {
      if (ended) return;
      ended = true;
      window._futureSpeaking = false;
      clearSpeakPoll();
      setCurrentPhoneme('rest');
      if (onSpeakEnd) onSpeakEnd();
      activeUtterance = null;
      resolve();
    }

    // Set flag immediately — don't rely on onstart alone (Chrome bug)
    window._futureSpeaking = true;
    if (onSpeakStart) onSpeakStart();

    utterance.onstart    = () => {
      window._futureSpeaking = true;
      startSpeakPoll();
    };
    utterance.onend      = finish;
    utterance.onerror    = finish;
    utterance.onboundary = (e) => {
      if (e.name !== 'word') return;
      window._speakBoundaryTick = (window._speakBoundaryTick || 0) + 1;
      const word = text.slice(e.charIndex, e.charIndex + (e.charLength || 5));
      setCurrentPhoneme(classifyPhoneme(word));
    };

    window.speechSynthesis.speak(utterance);
  });
}

// ── SPEECH RECOGNITION ────────────────────────────────────────────
let recognition = null;
let isListening  = false;

function initRecognition(onResult, onEnd) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;

  recognition = new SR();
  recognition.lang            = 'en-US';
  recognition.continuous      = false;
  recognition.interimResults  = false;

  recognition.onresult = (e) => onResult(e.results[0][0].transcript);
  recognition.onend    = () => { isListening = false; onEnd(); };
  recognition.onerror  = () => { isListening = false; onEnd(); };
  return true;
}

function startListening() {
  if (!recognition || isListening) return;
  isListening = true;
  recognition.start();
}

function stopListening() {
  if (!recognition || !isListening) return;
  recognition.stop();
}

export { speak, initRecognition, startListening, stopListening };
export function setSpeakCallbacks(onStart, onEnd) {
  onSpeakStart = onStart;
  onSpeakEnd   = onEnd;
}
