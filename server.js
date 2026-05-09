require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = 3000;
const API_KEY = process.env.GEMINI_KEY;
const GEMINI  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

if (!API_KEY) { console.error('ERROR: GEMINI_KEY missing in .env'); process.exit(1); }

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.glb':  'model/gltf-binary',
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

// ── forward to Gemini, return reply text ─────────────────────────
async function callGemini(body) {
  const res = await fetch(GEMINI, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    console.error('Gemini API error:', res.status, msg);
    throw new Error(msg);
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I'm here. Say that again?";
}

// ── HTTP server ───────────────────────────────────────────────────
http.createServer(async (req, res) => {

  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── POST /api/chat ────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const body  = await readBody(req);
      const reply = await callGemini(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    } catch (err) {
      console.error('Gemini proxy error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: "Sorry, couldn't reach my future self right now." }));
    }
    return;
  }

  // ── Static files ──────────────────────────────────────────────
  const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext      = path.extname(filePath).toLowerCase();

  // Block config.js — key stays server-side
  if (path.basename(filePath) === 'config.js') {
    res.writeHead(404); res.end('Not found'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });

}).listen(PORT, () => console.log(`\n  FutureYou → http://localhost:${PORT}\n  API key: server-side only ✓\n`));
