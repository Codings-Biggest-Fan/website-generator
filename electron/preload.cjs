const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('mvrtDesktop', {
  isElectron: true,
  platform: process.platform,
  appVersion: '1.0.0'
});
