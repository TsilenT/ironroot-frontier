'use strict';
const { app, BrowserWindow, Menu, protocol, session, dialog } = require('electron');
const path = require('node:path');
const { ENTRY, CSP, isLocal, isGameNavigation, readAsset } = require('./security.cjs');
// Stable origin and persistent partition preserve localStorage across upgrades.
// Never add allowServiceWorkers, bypassCSP, a preload, or a Node bridge.
protocol.registerSchemesAsPrivileged([{ scheme: 'ironroot', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
app.setName('Ironroot Frontier');
let mainWindow;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } });
  app.whenReady().then(async () => {
    const gameSession = session.fromPartition('persist:ironroot-frontier');
    gameSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    gameSession.setPermissionCheckHandler(() => false);
    // Portable export is explicitly unavailable in the current desktop UI.
    // Keep this unconditional until a coordinated UI/native-save implementation
    // has passed payload validation, cancellation and real desktop runtime checks.
    gameSession.on('will-download', event => event.preventDefault());
    gameSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !isLocal(details.url) }));
    await gameSession.protocol.handle('ironroot', async request => {
      if (request.method !== 'GET') return new Response(null, { status: 405 });
      const asset = await readAsset(path.join(__dirname, 'game'), request.url);
      if (!asset) return new Response('Not found', { status: 404 });
      return new Response(asset.bytes, { headers: { 'Content-Type': asset.type, 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } });
    });
    function createWindow() {
      mainWindow = new BrowserWindow({ title: 'Ironroot Frontier', width: 1440, height: 900, minWidth: 800, minHeight: 600, backgroundColor: '#101916', show: false,
        webPreferences: { session: gameSession, nodeIntegration: false, nodeIntegrationInWorker: false, nodeIntegrationInSubFrames: false, contextIsolation: true, sandbox: true, webSecurity: true, allowRunningInsecureContent: false, webviewTag: false, devTools: !app.isPackaged } });
      const contents = mainWindow.webContents;
      contents.setWindowOpenHandler(() => ({ action: 'deny' }));
      // Electron navigation details are on the event. Missing metadata fails
      // closed, subframes remain blocked, and redirects use the same allowlist.
      const guardNavigation = event => {
        if (event.isMainFrame !== true || !isGameNavigation(event.url)) event.preventDefault();
      };
      contents.on('will-navigate', guardNavigation);
      contents.on('will-frame-navigate', guardNavigation);
      contents.on('will-redirect', guardNavigation);
      contents.on('will-attach-webview', event => event.preventDefault());
      contents.on('render-process-gone', () => dialog.showErrorBox('Game stopped', 'The game renderer stopped unexpectedly. Close and reopen Ironroot Frontier to resume your last saved battle.'));
      mainWindow.once('ready-to-show', () => mainWindow?.show());
      mainWindow.on('closed', () => { gameSession.flushStorageData(); mainWindow = null; });
      mainWindow.loadURL(ENTRY).catch(error => { dialog.showErrorBox('Unable to load game', error.message); app.quit(); });
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : [{ label: 'Game', submenu: [{ role: 'quit' }] }]),
      { label: 'View', submenu: [{ role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] }
    ]));
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  }).catch(error => { dialog.showErrorBox('Startup failed', error.message); app.quit(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
