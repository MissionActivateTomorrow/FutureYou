require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

const PORT = 3000;
const HF_TOKEN = process.env.HF_TOKEN;
const MODEL = 'Qwen/Qwen3-32B:featherless-ai';

if (!HF_TOKEN) { console.error('ERROR: HF_TOKEN missing in .env'); process.exit(1); }

const client = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey:  HF_TOKEN,
});

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.glb':  'model/gltf-binary',
  '.gltf': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

// ── collect request body ──────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end',  () => resolve(data));
    req.on('error', reject);
  });
}

// ── convert Gemini-format payload → OpenAI messages ──────────────
function toOpenAIMessages(payload) {
  const messages = [];

  // system_instruction → system message
  const sys = payload.system_instruction?.parts?.[0]?.text;
  if (sys) messages.push({ role: 'system', content: sys });

  // contents (Gemini uses 'model', OpenAI uses 'assistant')
  for (const turn of (payload.contents || [])) {
    const role    = turn.role === 'model' ? 'assistant' : turn.role;
    const content = turn.parts?.[0]?.text ?? '';
    messages.push({ role, content });
  }

  return messages;
}

// ── call Qwen via HuggingFace router ─────────────────────────────
async function callQwen(rawBody) {
  const payload  = JSON.parse(rawBody);
  const messages = toOpenAIMessages(payload);
  const maxTokens = payload.generationConfig?.maxOutputTokens ?? 150;
  const temperature = payload.generationConfig?.temperature ?? 0.85;

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
    extra_body: { chat_template_kwargs: { enable_thinking: false } },
  });

  const msg = completion.choices[0].message;
  const text = msg.content || msg.reasoning || "I'm here. Say that again?";
  return text.trim();
}

// ── HTTP server ───────────────────────────────────────────────────
http.createServer(async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── POST /api/chat ────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const body  = await readBody(req);
      const reply = await callQwen(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    } catch (err) {
      console.error('Qwen error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: "Sorry, couldn't reach my future self right now." }));
    }
    return;
  }

  // ── Static files ──────────────────────────────────────────────
  const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext      = path.extname(filePath).toLowerCase();

  if (path.basename(filePath) === 'config.js') {
    res.writeHead(404); res.end('Not found'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });

}).listen(PORT, () => console.log(`\n  FutureYou → http://localhost:${PORT}\n  Model: ${MODEL}\n`));
