const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, 'dist', 'frontend', 'browser');
const port = Number(process.env.PORT ?? 4200);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

http
  .createServer((request, response) => {
    const urlPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
    let filePath = path.join(root, urlPath === '/' ? 'index.html' : urlPath);

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(root, 'index.html');
    }

    response.writeHead(200, {
      'Content-Type':
        contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
    });
    fs.createReadStream(filePath).pipe(response);
  })
  .listen(port, () => {
    console.log(`Frontend listo en http://localhost:${port}`);
  });
