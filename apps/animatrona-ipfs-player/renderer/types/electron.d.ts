import type { OpenByCidResult, ReleaseEpisodeManifest } from '../../main/ipc/manifest.handlers'
import type { RecentReleaseUpsertInput } from '../../main/ipc/recent-release.handlers'
import type { TrackerInput } from '../../main/ipc/tracker.handlers'
import type { RecentRelease, Settings, Tracker } from '../src/generated/prisma'

export interface ElectronAPI {
  getVersion: () => Promise<string>

  tracker: {
    list: () => Promise<Tracker[]>
    add: (input: TrackerInput) => Promise<Tracker>
    remove: (id: string) => Promise<void>
  }

  recentRelease: {
    list: () => Promise<RecentRelease[]>
    open: (input: RecentReleaseUpsertInput) => Promise<RecentRelease>
    remove: (id: string) => Promise<void>
  }

  settings: {
    get: () => Promise<Settings>
    update: (patch: Partial<Settings>) => Promise<Settings>
  }

  manifest: {
    openByCid: (directoryCid: string) => Promise<OpenByCidResult>
    openEpisode: (manifestCid: string) => Promise<ReleaseEpisodeManifest>
  }

  ipfs: {
    start: () => Promise<void>
    getGatewayUrl: () => Promise<string | null>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
