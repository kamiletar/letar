/**
 * Регистрация IPC handlers
 *
 * Разделены на core (нужны при старте) и deferred (загружаются после ready).
 * Deferred handlers регистрируются через setTimeout(0) — после event loop,
 * чтобы не блокировать первый рендер окна.
 */

// === Core handlers — нужны при первом рендере ===
import { registerAppHandlers } from './app.handlers'
import { registerDialogHandlers } from './dialog.handlers'
import { registerFFmpegHandlers } from './ffmpeg.handlers'
import { registerFsHandlers } from './fs.handlers'
import { registerLibraryHandlers } from './library.handlers'
import { registerWindowHandlers } from './window.handlers'

/**
 * Регистрация deferred (некритичных) handlers после первого рендера.
 * Все 40+ модулей загружаются через dynamic import — не блокируют startup.
 */
function registerDeferredHandlers(): void {
  // Импорт + транскодирование
  import('./import-queue.handlers').then((m) => m.registerImportQueueHandlers())
  import('./parallel-transcode.handlers').then((m) => m.registerParallelTranscodeHandlers())
  import('./transcode.handlers').then((m) => m.registerTranscodeQueueHandlers())
  import('./audio-reencode.handlers').then((m) => m.registerAudioReencodeHandlers())
  import('./vmaf.handlers').then((m) => m.registerVmafHandlers())
  import('./restore-tracks.handlers').then((m) => m.registerRestoreTracksHandlers())

  // Библиотека / контент
  import('./anime-manifest.handlers').then((m) => m.registerAnimeManifestHandlers())
  import('./manifest.handlers').then((m) => m.registerManifestHandlers())
  import('./franchise.handlers').then((m) => m.registerFranchiseHandlers())
  import('./shikimori.handlers').then((m) => m.registerShikimoriHandlers())
  import('./subtitle.handlers').then((m) => m.registerSubtitleHandlers())
  import('./history.handlers').then((m) => m.registerHistoryHandlers())
  import('./intro-detector.handlers').then((m) => m.registerIntroDetectorHandlers())
  import('./templates.handlers').then((m) => m.registerTemplatesHandlers())

  // Системные / диагностика
  import('./logs.handlers').then((m) => m.registerLogsHandlers())

  // IPFS / P2P
  import('./ipfs.handlers').then((m) => m.registerIpfsHandlers())
  import('./publisher.handlers').then((m) => m.registerPublisherHandlers())
  import('./remote-pin.handlers').then((m) => m.registerRemotePinHandlers())
  import('./export-queue.handlers').then((m) => m.registerExportQueueHandlers())
  import('./web-export.handlers').then((m) => m.registerWebExportHandlers())

  // Торренты + Рутрекер
  import('./torrent.handlers').then((m) => {
    m.registerTorrentHandlers()
    // Инициализируем торрент-сервис для восстановления торрентов
    import('../services/torrent').then(({ initTorrentService }) => {
      initTorrentService().catch((err) => {
        console.error('[IPC] Ошибка автоинициализации торрент-сервиса:', err)
      })
    })
  })
  import('./rutracker.handlers').then((m) => m.registerRutrackerHandlers())

  // Трекер / социальные
  import('./tracker.handlers').then((m) => m.registerTrackerHandlers())
  import('./friends.handlers').then((m) => m.registerFriendsHandlers())
  import('./presence.handlers').then((m) => m.registerPresenceHandlers())
  import('./watch-party.handlers').then((m) => m.registerWatchPartyHandlers())
  import('./federation.handlers').then((m) => m.registerFederationHandlers())
  import('./subscription.handlers').then((m) => m.registerSubscriptionHandlers())
  import('./profile.handlers').then((m) => m.registerProfileHandlers())

  // Геймификация / статистика
  import('./achievements.handlers').then((m) => m.registerAchievementsHandlers())
  import('./bonus.handlers').then((m) => m.registerBonusHandlers())
  import('./reputation.handlers').then((m) => m.registerReputationHandlers())
  import('./stats.handlers').then((m) => m.registerStatsHandlers())

  // Утилиты
  import('./deep-link.handlers').then((m) => m.registerDeepLinkHandlers())
  import('./mobile-server.handlers').then((m) => m.registerMobileServerHandlers())
  import('./scheduler.handlers').then((m) => m.registerSchedulerHandlers())
  import('./tray.handlers').then((m) => m.registerTrayHandlers())
  import('./updater.handlers').then((m) => m.registerUpdaterHandlers())
}

/**
 * Регистрирует все IPC handlers.
 * Core — синхронно (блокирует, но нужны сразу).
 * Deferred — через setTimeout(0) (после первого рендера).
 */
export function registerIpcHandlers(): void {
  // Core: app, dialog, ffmpeg, fs, library, window — нужны при первом рендере
  registerAppHandlers()
  registerDialogHandlers()
  registerFFmpegHandlers()
  registerFsHandlers()
  registerLibraryHandlers()
  registerWindowHandlers()

  // Deferred: остальные 40 модулей — после event loop
  setTimeout(registerDeferredHandlers, 0)
}
