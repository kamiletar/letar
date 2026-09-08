/**
 * @letar/ipfs-kubo-core — SHARED IPFS/Kubo-код Animatrona-экосистемы
 *
 * Вынесено из `apps/animatrona/main/services/{kubo,ipfs}` — код без Prisma-зависимостей,
 * пригодный для переиспользования лёгкими клиентами (animatrona-ipfs-player и т.п.), не только
 * полноценным Animatrona-приложением создателя раздач.
 *
 * ⚠️ Содержит только READ-часть работы с файлами (cat/stat/has/saveToFile) — WRITE-операции
 * (addFile/addDirectory/addBytes/createDirectoryFromCids/repoGc) остались в Animatrona,
 * они завязаны на creator-only очередь импорта.
 */

// === Kubo — сервис, конфигурация, обнаружение IPFS Desktop, relay, статистика ===
export * as kuboApi from './kubo/kubo-api-client'
export { IPFS_DESKTOP_PORTS, KUBO_CONFIG, KUBO_PORTS, PRIVATE_RELAY } from './kubo/kubo-config'
export { detectIpfsDesktop, type IpfsDesktopInfo, isIpfsDesktopAlive } from './kubo/kubo-detector'
export { getKuboService, KuboService } from './kubo/kubo-service'
export type { KuboMode, KuboServiceEvents, KuboServiceStatus } from './kubo/kubo-types'
export { getPeerSyncService, type PeerSyncService } from './kubo/peer-sync-service'
export type {
  PeerSyncResult,
  PeerSyncSource,
  PeerSyncStatus,
  PinServer,
  PinServerCache,
  PinServerResponse,
} from './kubo/peer-sync-types'
export { KNOWN_PINNER_PEER_IDS } from './kubo/peer-sync-types'

// === IPFS — pin-менеджер, конкурентность, peer-id, READ-часть unified-ipfs-service ===
export { kuboLimiter } from './ipfs/kubo-concurrency'
export { getBlockstorePath, getDatastorePath, getIpfsDataDir, loadOrCreatePeerId } from './ipfs/peer-id-manager'
export { getPinManager, PinManager } from './ipfs/pin-manager'
export type { PinInfo, PinStats } from './ipfs/pin-manager'
export { cat, hasBlock, probeCidAvailable, safeCat, saveToFile, stat } from './ipfs/unified-ipfs-read'
// unixfs-service.ts — тонкая обёртка над unified-ipfs-read.ts (обратная совместимость с app-кодом)
export {
  cat as unixfsCat,
  has as unixfsHas,
  saveToFile as unixfsSaveToFile,
  stat as unixfsStat,
} from './ipfs/unixfs-service'

// === Tracker client ===
export {
  addToLibraryViaTracker,
  fetchLibraryFromTracker,
  fetchPinServers,
  fetchProfile,
  fetchTrackerAnimeDetail,
  fetchTrackerCatalog,
  fetchWatchProgressSince,
  publishToTracker,
  pushWatchProgress,
  registerDistribution,
  reportStats,
  syncLibraryToTracker,
  testTrackerConnection,
  updateDistribution,
  updateProfile,
} from './tracker-client'
export type { TrackerConfig, TrackerConnectionResult, TrackerPublishResult } from './tracker-client'

// === Утилиты ===
export { createConcurrencyLimiter } from './utils/concurrency-limiter'
export { createModuleLogger } from './utils/logger'
export { getAvailablePort } from './utils/port-finder'

// === Типы ===
export type { IpfsAddResult, IpfsServiceStatus, IpfsStatResult, P2PDiagnostics } from './types/ipfs'
export type { StatsReportDelta } from './types/stats'
export type {
  TrackerAddToLibraryResult,
  TrackerAnimeDetailResult,
  TrackerCatalogResult,
  TrackerDistribution,
  TrackerDistributionResult,
  TrackerLibraryItem,
  TrackerSyncItem,
  TrackerSyncResult,
  TrackerUserProfile,
  TrackerWatchProgressItem,
} from './types/tracker'
