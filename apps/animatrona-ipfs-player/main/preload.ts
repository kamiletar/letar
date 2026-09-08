import { contextBridge, ipcRenderer } from 'electron'
import type { RecentRelease, Settings, Tracker } from '../renderer/src/generated/prisma'
import type { OpenByCidResult, ReleaseEpisodeManifest } from './ipc/manifest.handlers'
import type { RecentReleaseUpsertInput } from './ipc/recent-release.handlers'
import type { TrackerInput } from './ipc/tracker.handlers'

/**
 * API, доступный в renderer process через window.electronAPI.
 * Добавляй новые методы сюда и в main/ipc/*.handlers.ts — IPC единственный
 * способ связи между main и renderer (contextIsolation: true, nodeIntegration: false).
 */
const electronAPI = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),

  tracker: {
    list: (): Promise<Tracker[]> => ipcRenderer.invoke('tracker:list'),
    add: (input: TrackerInput): Promise<Tracker> => ipcRenderer.invoke('tracker:add', input),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('tracker:remove', id),
  },

  recentRelease: {
    list: (): Promise<RecentRelease[]> => ipcRenderer.invoke('recentRelease:list'),
    open: (input: RecentReleaseUpsertInput): Promise<RecentRelease> => ipcRenderer.invoke('recentRelease:open', input),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('recentRelease:remove', id),
  },

  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    update: (patch: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke('settings:update', patch),
  },

  manifest: {
    openByCid: (directoryCid: string): Promise<OpenByCidResult> =>
      ipcRenderer.invoke('manifest:openByCid', directoryCid),
    openEpisode: (manifestCid: string): Promise<ReleaseEpisodeManifest> =>
      ipcRenderer.invoke('manifest:openEpisode', manifestCid),
  },

  ipfs: {
    start: (): Promise<void> => ipcRenderer.invoke('ipfs:start'),
    getGatewayUrl: (): Promise<string | null> => ipcRenderer.invoke('ipfs:getGatewayUrl'),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
