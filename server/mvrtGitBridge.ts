import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function walkAssetsDir(
  dir: string,
  baseDir: string,
  results: Array<{ path: string; name: string; size: number; ext: string }> = []
) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAssetsDir(full, baseDir, results);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.pdf'].includes(ext)) {
        const rel = path.relative(baseDir, full).replace(/\\/g, '/');
        const stat = fs.statSync(full);
        results.push({
          path: rel.startsWith('assets/') ? rel : `assets/${rel}`,
          name: entry.name,
          size: stat.size,
          ext
        });
      }
    }
  }
  return results;
}

export function mvrtGitBridge(): Plugin {
  return {
    name: 'mvrt-git-bridge',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/mvrt/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json');

        try {
          if (req.url === '/api/mvrt/git-credential' && req.method === 'GET') {
            try {
              const out = execFileSync('git', ['credential', 'fill'], {
                input: 'protocol=https\nhost=github.com\n\n',
                encoding: 'utf8'
              });
              const lines = out.split(/\r?\n/);
              let username = '';
              let password = '';
              for (const line of lines) {
                if (line.startsWith('username=')) username = line.slice(9).trim();
                if (line.startsWith('password=')) password = line.slice(9).trim();
              }
              if (password) {
                res.end(JSON.stringify({ ok: true, username, token: password }));
              } else {
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'No stored GitHub credential found.'
                  })
                );
              }
            } catch (credErr: any) {
              res.end(
                JSON.stringify({
                  ok: false,
                  error: credErr?.message || String(credErr)
                })
              );
            }
            return;
          }

          if (req.url === '/api/mvrt/git-status' && req.method === 'GET') {
            const cwd = process.cwd();
            let branch = 'main';
            let remote = '';
            try {
              branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
                cwd,
                encoding: 'utf8'
              }).trim();
            } catch {
              // ignore
            }
            try {
              remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
                cwd,
                encoding: 'utf8'
              }).trim();
            } catch {
              // ignore
            }
            const today = new Date().toISOString().slice(0, 10);
            res.end(
              JSON.stringify({
                ok: true,
                cwd,
                currentBranch: branch,
                remoteUrl: remote,
                suggestedDatedBranch: `update-${today}`
              })
            );
            return;
          }

          if (req.url === '/api/mvrt/scan-folder' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const targetFolder = body.folderPath
              ? path.resolve(String(body.folderPath))
              : path.resolve(process.cwd(), 'generated-site');
            if (!fs.existsSync(targetFolder)) {
              res.statusCode = 404;
              res.end(
                JSON.stringify({
                  ok: false,
                  error: `Folder not found: ${targetFolder}`
                })
              );
              return;
            }
            const files = walkAssetsDir(targetFolder, targetFolder);
            res.end(
              JSON.stringify({
                ok: true,
                folderPath: targetFolder,
                files
              })
            );
            return;
          }

          if (req.url === '/api/mvrt/git-push-dated' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const today = new Date().toISOString().slice(0, 10);
            const branchName = String(body.branchName || `update-${today}`)
              .trim()
              .replace(/[^a-zA-Z0-9._/-]/g, '-');
            const commitMessage = String(
              body.commitMessage || `Update MVRT website (${today})`
            ).trim();
            const targetDir = body.repoPath
              ? path.resolve(String(body.repoPath))
              : path.resolve(process.cwd(), 'generated-site');
            const staticFiles: Array<{ filename: string; content: string }> =
              Array.isArray(body.staticFiles) ? body.staticFiles : [];
            const uploadedAssets: Array<{ path: string; dataUrl: string }> =
              Array.isArray(body.uploadedAssets) ? body.uploadedAssets : [];

            // 1. Write all generated static HTML/CSS/JSON files
            fs.mkdirSync(targetDir, { recursive: true });
            for (const f of staticFiles) {
              const outPath = path.join(targetDir, f.filename);
              fs.mkdirSync(path.dirname(outPath), { recursive: true });
              fs.writeFileSync(outPath, f.content, 'utf8');
            }

            // 2. Write any uploaded local assets (dataUrl -> binary)
            for (const asset of uploadedAssets) {
              if (!asset.dataUrl || !asset.dataUrl.startsWith('data:')) continue;
              const commaIdx = asset.dataUrl.indexOf(',');
              if (commaIdx < 0) continue;
              const base64 = asset.dataUrl.slice(commaIdx + 1);
              const buf = Buffer.from(base64, 'base64');
              const relPath = asset.path.replace(/^\/+/, '');
              const outPath = path.join(targetDir, relPath);
              fs.mkdirSync(path.dirname(outPath), { recursive: true });
              fs.writeFileSync(outPath, buf);
            }

            // Also sync to ./generated-site if targetDir is different
            const defaultGenDir = path.resolve(process.cwd(), 'generated-site');
            if (targetDir !== defaultGenDir) {
              for (const f of staticFiles) {
                const outPath = path.join(defaultGenDir, f.filename);
                fs.mkdirSync(path.dirname(outPath), { recursive: true });
                fs.writeFileSync(outPath, f.content, 'utf8');
              }
            }

            // 3. Determine git root (either targetDir or workspace root)
            let gitCwd = targetDir;
            if (!fs.existsSync(path.join(gitCwd, '.git'))) {
              gitCwd = process.cwd();
            }

            const logs: string[] = [];
            logs.push(`Wrote ${staticFiles.length} website files + ${uploadedAssets.length} assets to ${targetDir}`);

            // Checkout dated branch
            execFileSync('git', ['checkout', '-B', branchName], {
              cwd: gitCwd,
              encoding: 'utf8'
            });
            logs.push(`Switched to dated branch: ${branchName}`);

            // Stage generated files
            execFileSync('git', ['add', '-A'], {
              cwd: gitCwd,
              encoding: 'utf8'
            });

            // Commit if there are staged changes
            let committed = false;
            try {
              const statusOut = execFileSync('git', ['status', '--porcelain'], {
                cwd: gitCwd,
                encoding: 'utf8'
              }).trim();
              if (statusOut) {
                execFileSync('git', ['commit', '-m', commitMessage], {
                  cwd: gitCwd,
                  encoding: 'utf8'
                });
                committed = true;
                logs.push(`Created commit: "${commitMessage}"`);
              } else {
                logs.push('Working tree already clean on this dated branch.');
              }
            } catch (commitErr: any) {
              logs.push(`Commit note: ${commitErr?.message || String(commitErr)}`);
            }

            // Attempt push to origin if origin exists
            let pushed = false;
            let pushNote = '';
            try {
              const remotes = execFileSync('git', ['remote'], {
                cwd: gitCwd,
                encoding: 'utf8'
              }).trim();
              if (remotes.split(/\s+/).includes('origin')) {
                const pushOut = execFileSync(
                  'git',
                  ['push', '-u', 'origin', branchName],
                  { cwd: gitCwd, encoding: 'utf8' }
                );
                pushed = true;
                pushNote = pushOut.trim() || `Pushed to origin/${branchName}`;
                logs.push(`Pushed to origin/${branchName}`);
              } else {
                pushNote = `Branch "${branchName}" created & committed locally (no 'origin' remote configured yet — add origin or use GitHub Token push).`;
                logs.push(pushNote);
              }
            } catch (pushErr: any) {
              pushNote = `Branch "${branchName}" committed locally. Push to origin reported: ${
                pushErr?.stderr || pushErr?.message || String(pushErr)
              }`;
              logs.push(pushNote);
            }

            res.end(
              JSON.stringify({
                ok: true,
                branchName,
                committed,
                pushed,
                targetDir,
                logs,
                pushNote
              })
            );
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ ok: false, error: 'Unknown endpoint' }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              ok: false,
              error: err?.message || String(err)
            })
          );
        }
      });
    }
  };
}
