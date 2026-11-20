#!/usr/bin/env node
/**
 * Starts Vite dev server and launches the Electron desktop window once ready.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const vitePort = 5173;
const devUrl = `http://localhost:${vitePort}`;

const viteProc = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', '--port', String(vitePort)],
  { cwd: rootDir, stdio: 'inherit', shell: true }
);

function waitForVite(retries = 40) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http
        .get(devUrl, (res) => {
          res.resume();
          resolve();
        })
        .on('error', () => {
          if (n <= 0) {
            reject(new Error('Vite dev server did not start in time.'));
          } else {
            setTimeout(() => attempt(n - 1), 300);
          }
        });
    };
    attempt(retries);
  });
}

await waitForVite();

const electronProc = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['electron', '.', '--dev'],
  {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_DEV_SERVER_URL: devUrl }
  }
);

electronProc.on('close', (code) => {
  viteProc.kill();
  process.exit(code ?? 0);
});
