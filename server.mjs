import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT) || 4173;
const root = process.cwd();
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${request.headers.host}`).pathname);
  const relative = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^[/\\]+/, '');
  let file = join(root, relative || 'index.html');
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  response.writeHead(200, {
    'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Junior Astronaut Mission Trainer listo en http://127.0.0.1:${port}/`);
});
