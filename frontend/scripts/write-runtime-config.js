const fs = require('fs');
const path = require('path');

const apiUrl =
  process.env.API_URL ||
  process.env.RENDER_BACKEND_URL ||
  process.env.NG_APP_API_URL ||
  'http://localhost:3000';

const config = {
  apiUrl: apiUrl.replace(/\/$/, ''),
};

const publicDir = path.join(__dirname, '..', 'public');
const outputPath = path.join(publicDir, 'runtime-config.js');
const contents = `window.smartStadiumConfig = ${JSON.stringify(config, null, 2)};\n`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(outputPath, contents, 'utf8');

console.log(`Runtime config written with API URL: ${config.apiUrl}`);
