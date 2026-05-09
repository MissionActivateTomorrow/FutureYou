// Reads .env and writes config.js — run automatically via npm start
require('dotenv').config();
const fs = require('fs');

if (!process.env.GEMINI_KEY) {
  console.error('ERROR: GEMINI_KEY not found in .env');
  process.exit(1);
}

fs.writeFileSync('config.js',
  `window.CONFIG = { GEMINI_KEY: '${process.env.GEMINI_KEY}' };\n`
);
console.log('config.js generated from .env');
