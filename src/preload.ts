import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
    onFileOpen: (callback: (content: string, filePath: string) => void) => {
        ipcRenderer.on('file-opened', (_, content: string) => {
            callback(content);
        });
    },
    showOpenDialog: () => {
        ipcRenderer.send('show-open-dialog');
    },
    showExportHtmlDialog: (html: string) => {
        ipcRenderer.send('show-export-html-dialog', html);
    },
    saveFile: async (content: string) => {
        ipcRenderer.send('save-file', content);
    }
});
