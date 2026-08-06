/**
 * IPFS Service — Экспорты
 *
 * Архитектура:
 * - KuboService — основной IPFS (Kubo/Go-IPFS или IPFS Desktop)
 * - UnifiedIPFS — обёртка над Kubo RPC для совместимости
 *
 * OrbitDB и Helia полностью удалены — используется SQLite + Kubo PubSub.
 */

export { getIpnsService, IpnsService } from './ipns-service'
export type { IpnsPublishResult, IpnsResolveResult } from './ipns-service'
export { getBlockstorePath, getDatastorePath, getIpfsDataDir, loadOrCreatePeerId } from './peer-id-manager'
export { getPinManager, PinManager } from './pin-manager'
export type { PinInfo, PinStats } from './pin-manager'

// UnixFS — теперь использует UnifiedIPFS (Kubo-based)
export { repoGc } from './unified-ipfs-service'
export { addBytes, addDirectory, addFile, cat, has, saveToFile, stat } from './unixfs-service'

// Unified IPFS Service (Kubo-based) — основной API для работы с файлами
export * as UnifiedIPFS from './unified-ipfs-service'
export type { DirEntry } from './unified-ipfs-service'
