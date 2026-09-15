/**
 * Preload script — contextBridge IPC API
 *
 * Типизированный мост между main и renderer процессами.
 * contextIsolation: true, nodeIntegration: false.
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/ipc-types'
import type { KeymapConfig } from '../src/types'

const electronAPI: ElectronAPI = {
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    save: (config: KeymapConfig) => ipcRenderer.invoke('config:save', config),
    cycleLayout: () => ipcRenderer.invoke('config:cycleLayout'),
  },
  symbols: {
    getAll: () => ipcRenderer.invoke('symbols:getAll'),
  },
  stats: {
    getTop: (n: number) => ipcRenderer.invoke('stats:getTop', n),
  },
  exclusions: {
    getList: () => ipcRenderer.invoke('exclusions:getList'),
    saveList: (processes: string[]) => ipcRenderer.invoke('exclusions:saveList', processes),
    getForegroundProcess: () => ipcRenderer.invoke('exclusions:getForegroundProcess'),
  },
  system: {
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
    getLayoutInfo: () => ipcRenderer.invoke('system:getLayoutInfo'),
    isAutostartEnabled: () => ipcRenderer.invoke('system:isAutostartEnabled'),
    setAutostart: (on: boolean): Promise<boolean> => ipcRenderer.invoke('system:setAutostart', on),
    isHotkeyEnabled: () => ipcRenderer.invoke('system:isHotkeyEnabled'),
    setHotkeyEnabled: (on: boolean) => ipcRenderer.invoke('system:setHotkeyEnabled', on),
    checkForUpdates: () => ipcRenderer.invoke('system:checkForUpdates'),
  },
  platform: process.platform,
  on: {
    configChanged: (cb: (config: KeymapConfig) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, config: KeymapConfig) => cb(config)
      ipcRenderer.on('config:changed', handler)
      return () => ipcRenderer.removeListener('config:changed', handler)
    },
    hotkeyEnabledChanged: (cb: (on: boolean) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, on: boolean) => cb(on)
      ipcRenderer.on('system:hotkeyEnabledChanged', handler)
      return () => ipcRenderer.removeListener('system:hotkeyEnabledChanged', handler)
    },
    navigate: (cb: (page: 'editor' | 'settings') => void) => {
      const handler = (_event: Electron.IpcRendererEvent, page: 'editor' | 'settings') => cb(page)
      ipcRenderer.on('app:navigate', handler)
      return () => ipcRenderer.removeListener('app:navigate', handler)
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
