import { contextBridge, ipcRenderer } from 'electron'

/**
 * API, доступный в renderer process через window.electronAPI.
 * Добавляй новые методы сюда и в main/ipc/*.handlers.ts — IPC единственный
 * способ связи между main и renderer (contextIsolation: true, nodeIntegration: false).
 */
const electronAPI = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
