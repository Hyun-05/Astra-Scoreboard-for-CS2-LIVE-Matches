const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  onGsiStatus: (callback) => ipcRenderer.on('gsi-status', callback),
  onGsiData: (callback) => ipcRenderer.on('gsi-data', callback),
  onMapEnded: (callback) => ipcRenderer.on('map-ended', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  updateTeamColor: (team, colorData) => ipcRenderer.invoke('update-team-color', team, colorData),
  getTeamColors: () => ipcRenderer.invoke('get-team-colors'),
  // 新增：同步 OBS 状态
  updateObsState: (state) => ipcRenderer.invoke('update-obs-state', state),

  selectBgImage: (team) => ipcRenderer.invoke('select-bg-image', team),
  toggleBgVisible: (team, visible) => ipcRenderer.invoke('toggle-bg-visible', team, visible),
  getBgConfig: () => ipcRenderer.invoke('get-bg-config'),
  autoConfigGsi: () => ipcRenderer.invoke('auto-config-gsi'),
  onGsiData: (cb) => ipcRenderer.on('gsi-data', cb),
    selectScoreDir: () => ipcRenderer.invoke('select-score-dir'),
  getScoreDir: () => ipcRenderer.invoke('get-score-dir'),
});