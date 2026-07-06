import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

// Kill any leftover
try { await fetch('http://localhost:3001/api/auth/csrf', { signal: AbortSignal.timeout(1000) }); } catch {}

const server = spawn('cmd', ['/c', 'npx', 'next', 'dev', '-p', '3001'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PATH: process.env.PATH }
});

let output = '';
server.stdout.on('data', (d) => { output += d.toString(); });
server.stderr.on('data', (d) => { output += d.toString(); });

await sleep(8000);

// Test providers endpoint
for (const [label, url] of [
  ['Providers', 'http://localhost:3001/api/auth/providers'],
  ['CSRF', 'http://localhost:3001/api/auth/csrf'],
  ['Session (no auth)', 'http://localhost:3001/api/auth/session'],
]) {
  try {
    const res = await fetch(url);
    console.log(`${label}: ${res.status}`);
    console.log(JSON.stringify(await res.json(), null, 2));
    console.log('');
  } catch(e) {
    console.log(`${label}: ERROR - ${e.message}\n`);
  }
}

// Test dev-login callback
try {
  const { csrfToken } = await (await fetch('http://localhost:3001/api/auth/csrf')).json();
  const res = await fetch('http://localhost:3001/api/auth/callback/dev-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email: 'demo@jobplatform.dev', json: 'true' })
  });
  console.log(`Dev Login callback: ${res.status}`);
  console.log(JSON.stringify(await res.json(), null, 2));
} catch(e) {
  console.log(`Dev Login: ERROR - ${e.message}`);
}

server.kill();
process.exit(0);
