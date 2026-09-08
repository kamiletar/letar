/**
 * IPFS Service — Экспорты
 *
 * Архитектура:
 * - KuboService — основной IPFS (Kubo/Go-IPFS или IPFS Desktop), теперь из `@letar/ipfs-kubo-core`
 * - UnifiedIPFS — обёртка над Kubo RPC для совместимости (WRITE-часть, creator-only)
 *
 * OrbitDB и Helia полностью удалены — используется SQLite + Kubo PubSub.
 * Pin-manager, peer-id-manager и READ-часть unified-ipfs-service переехали в
 * `@letar/ipfs-kubo-core` — см. её README/index.ts.
 */

export {
  getBlockstorePath,
  getDatastorePath,
  getIpfsDataDir,
  getPinManager,
  loadOrCreatePeerId,
  PinManager,
} from '@letar/ipfs-kubo-core'
export type { PinInfo, PinStats } from '@letar/ipfs-kubo-core'
export { getIpnsService, IpnsService } from './ipns-service'
export type { IpnsPublishResult, IpnsResolveResult } from './ipns-service'

// UnixFS — теперь использует UnifiedIPFS (Kubo-based)
export { repoGc } from './unified-ipfs-service'
export { addBytes, addDirectory, addFile, cat, has, saveToFile, stat } from './unixfs-service'

// Unified IPFS Service (Kubo-based) — WRITE-часть, основной API для записи файлов
export * as UnifiedIPFS from './unified-ipfs-service'
export type { DirEntry } from './unified-ipfs-service'
