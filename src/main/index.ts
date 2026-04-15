import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { join, basename } from 'path';

type MarkdownFile = {
    content?: string;
    filePath?: string;
}

const getCurrentFile = async (browserWindow?: BrowserWindow) => {
    if (currentFile.filePath) return currentFile.filePath;
    if (!browserWindow) return;
    return showSaveDialog(browserWindow);
};

const setCurrentFile = (browserWindow: BrowserWindow, content: string, filePath: string) => {
    currentFile = {
        content: content,
        filePath: filePath,
    };

    app.addRecentDocument(filePath);
    browserWindow.setTitle(`${basename(filePath)} - ${app.name}`);
    browserWindow.setRepresentedFilename(filePath);
};

let currentFile: MarkdownFile = {
    content: '',
    filePath: undefined,
};

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
        },
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(
            join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        );
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    })

    mainWindow.webContents.openDevTools({
        mode: 'detach',
    });
};
app.on('ready', createWindow);
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

// Open File
const showOpenDialog = async (browserWindow: BrowserWindow) => {
    const result = await dialog.showOpenDialog(browserWindow, {
        properties: ['openFile'],
        filters: [{name: 'Markdown Files', extensions: ['md']}],
    });

    if (result.canceled) return;

    const [filePath] = result.filePaths;

    openFile(browserWindow, filePath);
};

const openFile = async (browserWindow: BrowserWindow, filePath: string) => {
    const content = await readFile(filePath, {encoding: 'utf8'});

    setCurrentFile(browserWindow, content, filePath);

    browserWindow.webContents.send('file-opened', content, filePath);
};

ipcMain.on('show-open-dialog', (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    showOpenDialog(browserWindow);
});

// Export HTML
const showExportHtmlDialog = async (browserWindow: BrowserWindow, html: string) => {
    const result = await dialog.showSaveDialog(browserWindow, {
        title: 'Export HTML',
        filters: [{name: 'HTML File', extensions: ['html']}],
    });

    if (result.canceled) return;

    const { filePath } = result;
    if (!filePath) return;

    exportHtml(filePath, html);
};

const exportHtml = async (filePath: string, html: string) => {
    await writeFile(filePath, html, { encoding: 'utf8' });
}

ipcMain.on('show-export-html-dialog', (event, html: string) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    showExportHtmlDialog(browserWindow, html);
});

// Save File
const showSaveDialog = async (browserWindow: BrowserWindow) => {
    const result = await dialog.showSaveDialog(browserWindow, {
        title: 'Save Markdown',
        filters: [{name: 'Markdown File', extensions: ['md']}],
    });

    if (result.canceled) return;

    const { filePath } = result;
    if (!filePath) return;

    return filePath;
};

const saveFile = async (browserWindow: BrowserWindow, content: string) => {
    const filePath = await getCurrentFile(browserWindow);
    if (!filePath) return;

    await writeFile(filePath, content, { encoding: 'utf8' });
    setCurrentFile(browserWindow, content, filePath);
};

ipcMain.on('save-file', async (event, content: string) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;

    await saveFile(browserWindow, content);
});
