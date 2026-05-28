const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ========== 窗口控制（统一用 invoke，对应 main.cjs 的 handle）==========
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  onMaximizedChange: (callback) => ipcRenderer.on('window-maximized', (_event, value) => callback(value)),
  removeMaximizedListener: () => ipcRenderer.removeAllListeners('window-maximized'),

  // ========== 应用信息 ==========
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // ========== GSI 相关 ==========
  onGsiStatus: (callback) => ipcRenderer.on('gsi-status', callback),
  onGsiData: (callback) => ipcRenderer.on('gsi-data', callback),
  onMapEnded: (callback) => ipcRenderer.on('map-ended', callback),
  onMapChanged: (callback) => ipcRenderer.on('map-changed', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // ========== 状态同步 ==========
  updateObsState: (state) => ipcRenderer.invoke('update-obs-state', state),

  // ========== 设置相关 ==========
  updateTeamColor: (team, colorData) => ipcRenderer.invoke('update-team-color', team, colorData),
  getTeamColors: () => ipcRenderer.invoke('get-team-colors'),
  selectBgImage: (team) => ipcRenderer.invoke('select-bg-image', team),
  toggleBgVisible: (team, visible) => ipcRenderer.invoke('toggle-bg-visible', team, visible),
  getBgConfig: () => ipcRenderer.invoke('get-bg-config'),
  autoConfigGsi: () => ipcRenderer.invoke('auto-config-gsi'),
  selectScoreDir: () => ipcRenderer.invoke('select-score-dir'),
  getScoreDir: () => ipcRenderer.invoke('get-score-dir'),
  toggleScoreTxt: (enabled) => ipcRenderer.invoke('toggle-score-txt', enabled),
  getScoreTxtEnabled: () => ipcRenderer.invoke('get-score-txt-enabled'),
  getFontsList: () => ipcRenderer.invoke('get-fonts-list'),
  selectFontFile: () => ipcRenderer.invoke('select-font-file'),
  getUserFontsDir: () => ipcRenderer.invoke('get-user-fonts-dir'),
  getObsPort: () => ipcRenderer.invoke('get-obs-port'),
});