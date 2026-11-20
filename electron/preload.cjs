const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mvrtDesktop', {
  isElectron: true,
  platform: process.platform,
  appVersion: '1.0.0',
  pickFolder: () => ipcRenderer.invoke('mvrt:pick-folder'),
  saveZip: (bytes, defaultName) =>
    ipcRenderer.invoke('mvrt:save-zip', { bytes, defaultName }),
  getGitCredential: () => ipcRenderer.invoke('mvrt:git-credential')
});
