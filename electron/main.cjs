const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

function walkAssetsDir(dir, baseDir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name.startsWith('.') ||
      entry.name === 'node_modules' ||
      entry.name === 'dist'
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAssetsDir(full, baseDir, results);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (
        ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.pdf'].includes(ext)
      ) {
        const rel = path.relative(baseDir, full).replace(/\\/g, '/');
        const mimeMap = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.gif': 'image/gif',
          '.pdf': 'application/pdf'
        };
        const buf = fs.readFileSync(full);
        const assetPath = rel.startsWith('assets/') ? rel : `assets/${rel}`;
        results.push({
          path: assetPath,
          name: entry.name,
          size: buf.length,
          mimeType: mimeMap[ext] || 'application/octet-stream',
          dataUrl: `data:${mimeMap[ext] || 'application/octet-stream'};base64,${buf.toString('base64')}`
        });
      }
    }
  }
  return results;
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'MVRT Website Studio — FRC Team 115',
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const devServerUrl =
    process.env.VITE_DEV_SERVER_URL ||
    process.env.ELECTRON_START_URL ||
    (process.argv.includes('--dev') ? 'http://localhost:5173' : null);

  const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');

  if (devServerUrl || !fs.existsSync(distIndexPath)) {
    mainWindow.loadURL(devServerUrl || 'http://localhost:5173');
  } else {
    mainWindow.loadFile(distIndexPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  return mainWindow;
}

// Native Folder Picker IPC
ipcMain.handle('mvrt:pick-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Local Assets Folder'
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, files: [] };
  }
  const folderPath = result.filePaths[0];
  const files = walkAssetsDir(folderPath, folderPath);
  return {
    canceled: false,
    folderPath,
    folderName: path.basename(folderPath),
    files
  };
});

// Native Save .ZIP IPC
ipcMain.handle('mvrt:save-zip', async (_event, { bytes, defaultName }) => {
  const result = await dialog.showSaveDialog({
    title: 'Export MVRT Static Website (.zip)',
    defaultPath: defaultName || 'mvrt-website.zip',
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
  });
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  fs.writeFileSync(result.filePath, Buffer.from(bytes));
  return { canceled: false, filePath: result.filePath };
});

// Native Git Credential Lookup (uses OS Git Credential Manager if user already signed in)
ipcMain.handle('mvrt:git-credential', async () => {
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
      return { ok: true, username, token: password };
    }
    return { ok: false, error: 'No stored GitHub credential found.' };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
