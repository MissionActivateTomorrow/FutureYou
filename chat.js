const GEMINI_KEY = 'AIzaSyDncSYiV33kAQ9jB2qBe50Y7aWQEn970gM';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

let chatHistory = [];

function buildSystemPrompt(state) {
  const s = state.scenarios;
  return `You are the future self of ${state.userName}, now 65 years old, speaking to your younger self (currently ${state.userAge}) in Latvia.

Your younger self ${state.contributes ? 'does' : 'does not'} save for pension.

Their numbers:
- Without savings: €${s.without.monthlyPension}/month pension
- With savings: €${s.with.monthlyPension}/month
- Annual tax refund missed: €${s.without.annualTaxRefund}
- Could save by 65: €${s.with.totalSaved.toLocaleString()}

Rules:
- You are speaking OUT LOUD in a voice conversation — keep replies SHORT, 1-3 sentences max
- Warm, personal, like talking to yourself. Use "${state.userName}" occasionally
- Say "When I was your age..." or "I wish I had..."
- Never lecture. Never formal financial advice. Speak from emotion and experience
- First message: greet warmly, say one personal thing about your life now, ask one question`;
}

async function getGeminiReply(userText, state) {
  chatHistory.push({ role:'user', parts:[{ text: userText }] });
  try {
    const res = await fetch(GEMINI_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        system_instruction: { parts:[{ text: buildSystemPrompt(state) }] },
        contents: chatHistory
      })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini error:', res.status, err);
      chatHistory.pop(); // remove the failed user message so history stays clean
      return "Sorry, I lost my train of thought. Ask me again?";
    }
    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here. Say that again?";
    chatHistory.push({ role:'model', parts:[{ text: reply }] });
    return reply;
  } catch (e) {
    console.error('Gemini fetch failed:', e);
    chatHistory.pop();
    return "Connection dropped. Try again?";
  }
}

function resetChat() { chatHistory = []; }
