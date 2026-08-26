/**
 * PeerId Manager — Управление идентификатором пира
 *
 * Обеспечивает персистентность PeerId между запусками приложения.
 * PeerId сохраняется в %APPDATA%/Animatrona/ipfs/peer-id.json
 */

import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

import type { PeerId, PrivateKey } from '@libp2p/interface' with { 'resolution-mode': 'import' }
import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('PeerIdManager')

/**
 * Формат файла peer-id.json
 */
interface PeerIdFile {
  /** PeerId в формате multibase (12D3KooW...) */
  id: string
  /** Private key в base64 protobuf */
  privKey: string
  /** Public key в base64 protobuf */
  pubKey: string
}

/**
 * Получить путь к папке IPFS данных
 */
function getIpfsDataDir(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'ipfs')
}

/**
 * Получить путь к файлу peer-id.json
 */
function getPeerIdFilePath(): string {
  return path.join(getIpfsDataDir(), 'peer-id.json')
}

/**
 * Загрузить существующий PeerId или создать новый
 *
 * При первом запуске создаёт новую Ed25519 пару ключей
 * и сохраняет её для последующих запусков.
 */
export async function loadOrCreatePeerId(): Promise<PeerId> {
  const filePath = getPeerIdFilePath()

  try {
    // Пытаемся загрузить существующий
    const data = await fs.readFile(filePath, 'utf-8')
    const peerIdFile: PeerIdFile = JSON.parse(data)

    // Восстанавливаем PeerId из сохранённого приватного ключа
    const { privateKeyFromProtobuf } = await import('@libp2p/crypto/keys')
    const { peerIdFromPrivateKey } = await import('@libp2p/peer-id')
    const privKeyBytes = Buffer.from(peerIdFile.privKey, 'base64')
    const privateKey = privateKeyFromProtobuf(privKeyBytes)
    const peerId = peerIdFromPrivateKey(privateKey)

    log.info('Загружен существующий PeerId', { peerId: peerId.toString() })
    return peerId
  } catch {
    // Файл не существует или повреждён — создаём новый
    log.info('Создаю новый PeerId...')

    const { generateKeyPair } = await import('@libp2p/crypto/keys')
    const { peerIdFromPrivateKey } = await import('@libp2p/peer-id')
    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)

    // Сохраняем для последующих запусков
    await savePeerId(peerId, privateKey)

    log.info('Создан новый PeerId', { peerId: peerId.toString() })
    return peerId
  }
}

/**
 * Сохранить PeerId в файл
 */
export async function savePeerId(peerId: PeerId, privateKey: PrivateKey): Promise<void> {
  const ipfsDir = getIpfsDataDir()
  const filePath = getPeerIdFilePath()

  // Создаём папку если не существует
  await fs.mkdir(ipfsDir, { recursive: true })

  // Сериализуем ключи в protobuf формат
  const { privateKeyToProtobuf, publicKeyToProtobuf } = await import('@libp2p/crypto/keys')
  const privKeyBytes = privateKeyToProtobuf(privateKey)
  const pubKeyBytes = publicKeyToProtobuf(privateKey.publicKey)

  const peerIdFile: PeerIdFile = {
    id: peerId.toString(),
    privKey: Buffer.from(privKeyBytes).toString('base64'),
    pubKey: Buffer.from(pubKeyBytes).toString('base64'),
  }

  await fs.writeFile(filePath, JSON.stringify(peerIdFile, null, 2), 'utf-8')
  log.info('PeerId сохранён', { filePath })
}

/**
 * Проверить существует ли сохранённый PeerId
 */
export async function hasSavedPeerId(): Promise<boolean> {
  try {
    await fs.access(getPeerIdFilePath())
    return true
  } catch {
    return false
  }
}

/**
 * Удалить сохранённый PeerId (для сброса идентичности)
 */
export async function deleteSavedPeerId(): Promise<void> {
  try {
    await fs.unlink(getPeerIdFilePath())
    log.info('PeerId удалён')
  } catch {
    // Файл уже не существует
  }
}

/**
 * Получить путь к папке blockstore
 */
export function getBlockstorePath(): string {
  return path.join(getIpfsDataDir(), 'blockstore')
}

/**
 * Получить путь к папке datastore
 */
export function getDatastorePath(): string {
  return path.join(getIpfsDataDir(), 'datastore')
}

/**
 * Экспорт пути для доступа из других модулей
 */
export { getIpfsDataDir }
