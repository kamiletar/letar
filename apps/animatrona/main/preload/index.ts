/**
 * Animatrona - Preload Script (оркестратор)
 *
 * Мост между Electron main process и renderer (Next.js).
 * Собирает все доменные модули и экспортирует единый electronAPI.
 */

import { contextBridge } from 'electron'
import type {
  AudioTranscodeOptions,
  AudioTranscodeVBROptions,
  DemuxOptions,
  DemuxResult,
  FileFilter,
  MediaInfo,
  MergeConfig,
  OperationResult,
  TranscodeProgress,
  VideoTranscodeOptions,
} from '../../shared/types'
import { appPreload, trayPreload, windowPreload } from './app.preload'
import { audioReencodePreload } from './audio-reencode.preload'
import { dialogPreload } from './dialog.preload'
import { exportQueuePreload, webExportPreload } from './export.preload'
import { federationPreload } from './federation.preload'
import { ffmpegPreload } from './ffmpeg.preload'
import { fsPreload, subtitlePreload } from './fs.preload'
import { achievementsPreload, bonusPreload, reputationPreload, statsPreload } from './gamification.preload'
import { historyPreload, importQueuePreload, templatesPreload } from './import-queue.preload'
import { ipfsPreload } from './ipfs.preload'
import { kuboPreload } from './kubo.preload'
import { libraryPreload } from './library.preload'
import { logsPreload } from './logs.preload'
import { animeInfoPreload, animeManifestPreload, manifestPreload } from './manifest.preload'
import { introDetectorPreload, legacyOnPreload, mobileServerPreload } from './misc.preload'
import { restoreTracksPreload } from './restore-tracks.preload'
import { rutrackerPreload } from './rutracker.preload'
import { franchisePreload, shikimoriPreload } from './shikimori.preload'
import { deepLinkPreload, friendsPreload, presencePreload, profilePreload, watchPartyPreload } from './social.preload'
import { torrentPreload } from './torrent.preload'
import { trackerPreload } from './tracker.preload'
import { parallelTranscodePreload, transcodePreload } from './transcode.preload'
import { updaterPreload } from './updater.preload'
import { vmafPreload } from './vmaf.preload'

// Реэкспорт типов для использования в других модулях
export type {
  AudioTranscodeOptions,
  AudioTranscodeVBROptions,
  DemuxOptions,
  DemuxResult,
  FileFilter,
  MediaInfo,
  MergeConfig,
  OperationResult,
  TranscodeProgress,
  VideoTranscodeOptions,
}

/**
 * API, доступный в renderer process через window.electronAPI
 */
const electronAPI = {
  app: appPreload,
  window: windowPreload,
  dialog: dialogPreload,
  fs: fsPreload,
  subtitle: subtitlePreload,
  library: libraryPreload,
  shikimori: shikimoriPreload,
  franchise: franchisePreload,
  animeManifest: animeManifestPreload,
  animeInfo: animeInfoPreload,
  manifest: manifestPreload,
  ffmpeg: ffmpegPreload,
  transcode: transcodePreload,
  parallelTranscode: parallelTranscodePreload,
  tray: trayPreload,
  vmaf: vmafPreload,
  importQueue: importQueuePreload,
  templates: templatesPreload,
  history: historyPreload,
  on: legacyOnPreload,
  logs: logsPreload,
  updater: updaterPreload,
  ipfs: ipfsPreload,
  kubo: kuboPreload,
  federation: federationPreload,
  stats: statsPreload,
  reputation: reputationPreload,
  achievements: achievementsPreload,
  bonus: bonusPreload,
  exportQueue: exportQueuePreload,
  webExport: webExportPreload,
  profile: profilePreload,
  friends: friendsPreload,
  presence: presencePreload,
  watchParty: watchPartyPreload,
  deepLink: deepLinkPreload,
  introDetector: introDetectorPreload,
  mobileServer: mobileServerPreload,
  tracker: trackerPreload,
  rutracker: rutrackerPreload,
  torrent: torrentPreload,
  audioReencode: audioReencodePreload,
  restoreTracks: restoreTracksPreload,
}

// Экспортируем API в renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Типы для TypeScript в renderer
export type ElectronAPI = typeof electronAPI
