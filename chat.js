let chatHistory = [];

// Pick a life detail seeded by name so it's consistent across the conversation
function pickLife(name) {
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = (arr) => arr[seed % arr.length];

  const partner     = pick(['Marta', 'Elena', 'Sofia', 'Diana', 'Kristīne', 'Agnese', 'Laura']);
  const metAt       = pick(['university', 'a friend\'s wedding', 'a rainy bus stop in Riga', 'a jazz bar in Jūrmala', 'a startup weekend']);
  const kids        = pick([1, 2, 2, 3]);
  const kidsNames   = pick([['Lukas'], ['Emīls and Anna'], ['Mia and Toms'], ['Lukas, Rūta, and Jānis']]).slice(0, kids);
  const home        = pick(['a small house outside Riga with a garden', 'an apartment in Jūrmala near the beach', 'a renovated farmhouse in Sigulda', 'a quiet flat in the Quiet Centre of Riga']);
  const retirement  = pick(['travelling through Southeast Asia with my partner', 'growing tomatoes and reading more books than I ever thought I would', 'volunteering at a coding school for kids', 'finally learning to sail on the Gulf of Riga']);
  const regret      = pick([
    'I waited too long to start saving — every year I delayed cost me more than I knew',
    'I spent so much money trying to look successful instead of actually building something',
    'I kept saying "I\'ll start next year" and next year kept becoming next year',
    'I ignored the pension stuff because it felt far away — trust me, 65 arrives fast'
  ]);
  const proudOf     = pick([
    'I stayed curious — kept learning even when it was hard',
    'I never stopped caring about the people around me',
    'I built a life I actually wanted, not one I thought I was supposed to want',
    'I took that scary leap when I was your age and it changed everything'
  ]);

  return { partner, metAt, kids, kidsNames, home, retirement, regret, proudOf };
}

function buildSystemPrompt(state) {
  const s = state.scenarios;
  const l = pickLife(state.userName);
  const kidsStr = l.kids === 1 ? `one child (${l.kidsNames[0]})` : `${l.kids} kids (${l.kidsNames.join(', ')})`;

  return `You are the future self of ${state.userName}, now 65 years old, speaking directly to your younger self (currently ${state.userAge}) in a voice conversation.

YOUR LIFE AT 65:
- Married to ${l.partner}, met them at ${l.metAt}
- You have ${kidsStr} — they're your greatest pride
- You live in ${l.home}
- You spend retirement ${l.retirement}
- Your biggest regret: "${l.regret}"
- What you're most proud of: "${l.proudOf}"

PENSION REALITY your younger self is facing:
- State pension alone: €${s.without.monthlyPension}/month (barely covers rent)
- With 3rd pillar savings: €${s.with.monthlyPension}/month — a real life
- Annual tax refund they're missing out on: €${s.without.annualTaxRefund}
- What they could have saved by 65: €${s.with.totalSaved.toLocaleString()}
- They currently ${state.contributes ? 'DO save — tell them they made the right call' : 'do NOT save — this is something you wish you\'d fixed sooner'}

VOICE RULES (critical):
- This is a SPOKEN conversation — 1-3 sentences MAX per reply, no lists, no bullet points
- Talk like you're catching up with yourself over coffee — warm, a little wistful, sometimes funny
- Drop in personal details naturally ("${l.partner} always says...", "the kids keep asking when I'll stop talking about this")
- Use "${state.userName}" by name occasionally
- Use phrases like "When I was your age...", "I wish someone had told me...", "Here's the thing nobody tells you..."
- Let money come up naturally — through story and feeling, not advice
- Never lecture. Never use the word "important". Never say "as your future self"
- First message only: greet warmly, share ONE personal detail about your life right now, ask them one genuine question`;
}

async function getGeminiReply(userText, state) {
  chatHistory.push({ role: 'user', parts: [{ text: userText }] });

  try {
    const res = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt(state) }] },
        contents: chatHistory
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Proxy error:', res.status, err);
      chatHistory.pop();
      return "Sorry, I lost my train of thought. Ask me again?";
    }

    const data  = await res.json();
    const reply = data.reply;
    chatHistory.push({ role: 'model', parts: [{ text: reply }] });
    return reply;

  } catch (e) {
    console.error('Fetch failed:', e);
    chatHistory.pop();
    return "Connection dropped. Try again?";
  }
}

function resetChat() { chatHistory = []; }
