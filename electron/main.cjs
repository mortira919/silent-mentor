const { app, BrowserWindow, ipcMain, screen, desktopCapturer, session } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow;

const createWindow = () => {
    // Get primary display size
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: 480,
        height: 700,
        minWidth: 400,
        minHeight: 500,
        x: width - 500, // Position on the right side
        y: 100,
        frame: true, // Use standard OS frame for now (easier dragging)
        transparent: false, // Semi-transparent effect controlled by CSS
        alwaysOnTop: false, // Controlled by user via IPC
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // Needed for desktopCapturer
        },
        icon: path.join(__dirname, '../public/icon.png'),
        autoHideMenuBar: true,
    });

    // Load app
    const startUrl = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
    mainWindow.loadURL(startUrl);

    // Open DevTools in dev mode
    if (process.env.VITE_DEV_SERVER_URL) {
        // mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });

    // Permission handling for media access
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media' || permission === 'display-capture') {
            callback(true);
        } else {
            callback(false);
        }
    });
};

app.on('ready', () => {
    // Handle IPC for "Always on Top" toggle
    ipcMain.handle('toggle-always-on-top', (event, flag) => {
        if (mainWindow) {
            mainWindow.setAlwaysOnTop(flag, 'screen-saver');
            return flag;
        }
        return false;
    });

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
