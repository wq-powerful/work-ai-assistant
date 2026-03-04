const { app, BrowserWindow, dialog, Tray, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const http = require('http');

let mainWindow = null;
let backendProcess = null;
let tray = null;
let backendPort = 0;

// ── Helpers ──────────────────────────────────────────────

/** Find a free TCP port */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

/** Poll the backend health endpoint until it responds */
function waitForBackend(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error('Backend failed to start within timeout'));
      }
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) return resolve();
        setTimeout(check, 300);
      });
      req.on('error', () => setTimeout(check, 300));
      req.setTimeout(2000, () => {
        req.destroy();
        setTimeout(check, 300);
      });
    };
    check();
  });
}

/** Resolve the path to the backend executable */
function getBackendPath() {
  if (app.isPackaged) {
    // In production: extraResources/backend/backend.exe
    return path.join(process.resourcesPath, 'backend', 'backend.exe');
  }
  // In development: run Python directly
  return null;
}

// ── Backend Process ──────────────────────────────────────

async function startBackend() {
  backendPort = await findFreePort();
  const backendExe = getBackendPath();

  if (backendExe) {
    // Production: spawn the packaged backend exe
    backendProcess = spawn(backendExe, ['--port', String(backendPort)], {
      stdio: 'pipe',
      windowsHide: true,
    });
  } else {
    // Development: run Python
    backendProcess = spawn('python', ['main.py', '--port', String(backendPort)], {
      cwd: path.join(__dirname, '..', 'backend'),
      stdio: 'pipe',
      windowsHide: true,
    });
  }

  backendProcess.stdout.on('data', (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
    dialog.showErrorBox('启动失败', `后端服务启动失败: ${err.message}`);
    app.quit();
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
    backendProcess = null;
  });

  // Wait for backend to be ready
  await waitForBackend(backendPort);
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

// ── Electron Window ──────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AI 工作助手',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(`http://127.0.0.1:${backendPort}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    // Minimize to tray instead of closing
    if (tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a simple icon; in production you'd use a proper .ico
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'static', 'logo.svg')
    : path.join(__dirname, '..', 'frontend', 'public', 'logo.svg');

  try {
    tray = new Tray(iconPath);
  } catch {
    // If SVG fails, skip tray (Electron may not support SVG as tray icon)
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => mainWindow && mainWindow.show() },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        tray = null;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('AI 工作助手');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow && mainWindow.show());
}

// ── App Lifecycle ────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    await startBackend();
    createTray();
    createWindow();
  } catch (err) {
    dialog.showErrorBox('启动失败', `应用启动失败: ${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // On macOS keep running; on Windows/Linux quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  stopBackend();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
