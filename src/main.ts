import { app, BrowserWindow, Tray, Menu, nativeImage, dialog } from 'electron';
import path from 'path';
import { startSmtpServer } from './smtp/server';
import { startApiServer } from './api/server';

app.name = 'LocalMail';

const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '1025', 10);
const API_PORT = parseInt(process.env.API_PORT ?? '6245', 10);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuiting = false;

function getAsset(filename: string): string {
  const base = app.isPackaged
    // electron-builder places extraResources at process.resourcesPath
    ? path.join((process as NodeJS.Process & { resourcesPath: string }).resourcesPath, 'assets')
    : path.join(app.getAppPath(), 'assets');
  return path.join(base, filename);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'LocalMail',
    show: false,
  });

  const qs = process.platform === 'darwin' ? '?frame=inset' : '';
  mainWindow.loadURL(`http://localhost:${API_PORT}/${qs}`);
  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.on('close', (e) => {
    if (!isQuiting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray(): void {
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'tray-icon.png';
  let icon = nativeImage.createFromPath(getAsset(iconFile));
  if (icon.isEmpty()) icon = nativeImage.createFromPath(getAsset('icon.png'));

  try {
    tray = new Tray(icon);
  } catch {
    return; // tray unavailable (headless / missing icon)
  }

  if (process.platform === 'darwin') tray.setIgnoreDoubleClickEvents(true);
  tray.setToolTip(`LocalMail — SMTP :${SMTP_PORT}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open LocalMail', click: showWindow },
    { type: 'separator' },
    { label: `SMTP  localhost:${SMTP_PORT}`, enabled: false },
    { label: `Web   localhost:${API_PORT}`, enabled: false },
    { type: 'separator' },
    { label: 'Quit LocalMail', click: () => { isQuiting = true; app.quit(); } },
  ]));
  tray.on('click', showWindow);
  tray.on('double-click', showWindow);
}

function showWindow(): void {
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

app.whenReady().then(async () => {
  // Set dock icon — in dev mode Electron uses its own icon otherwise
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(getAsset('icon.png'));
    if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon);
  }

  try {
    startSmtpServer(SMTP_PORT);
    await startApiServer(API_PORT, SMTP_PORT);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    dialog.showErrorBox(
      'LocalMail — Startup Error',
      `Could not bind to the required ports.\n\n${msg}\n\nSet SMTP_PORT or API_PORT environment variables to use different ports.`,
    );
    app.quit();
    return;
  }

  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

// Keep the process alive in the tray; quit only via the tray menu "Quit" item.
app.on('window-all-closed', () => { /* intentional no-op */ });
