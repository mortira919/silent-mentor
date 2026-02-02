const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    toggleAlwaysOnTop: (flag) => ipcRenderer.invoke('toggle-always-on-top', flag),
    isElectron: true,
});
