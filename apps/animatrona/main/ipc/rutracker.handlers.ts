/**
 * IPC handlers для импорта из Рутрекера
 */

import { net } from 'electron'

import type { StartDownloadParams } from '../services/rutracker/rutracker-download-orchestrator'
import { getDownloadOrchestrator } from '../services/rutracker/rutracker-download-orchestrator'
import { confirmShikimoriMatch, processRutrackerImport } from '../services/rutracker/rutracker-import'
import { parseRutrackerPage } from '../services/rutracker/rutracker-parser'
import { initTorrentService } from '../services/torrent'
import type { QBittorrentService } from '../services/torrent/qbittorrent-service'
import { createHandler } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'
import { describeNetErrorWithDiagnostics } from '../utils/net-error'

const log = createModuleLogger('RutrackerIPC')

/** Ссылка на страницу раздачи Рутрекера в произвольном тексте (например, comment торрента) */
const RUTRACKER_URL_RE = /https?:\/\/rutracker\.org\/forum\/viewtopic\.php\?t=\d+/i

/**
 * Загружает HTML страницы Рутрекера по URL
 */
async function fetchRutrackerPage(url: string): Promise<string> {
  log.info('Загрузка страницы', { url })
  const startMs = Date.now()

  try {
    const response = await net.fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      log.error('Страница вернула ошибку', {
        status: response.status,
        statusText: response.statusText,
        elapsed: Date.now() - startMs,
      })
      throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    // Рутрекер использует windows-1251
    const decoder = new TextDecoder('windows-1251')
    const html = decoder.decode(buffer)
    log.info('Страница загружена', { length: html.length, elapsed: Date.now() - startMs })
    return html
  } catch (err) {
    const elapsed = Date.now() - startMs
    log.error('Ошибка загрузки страницы', { url, error: String(err), elapsed })
    throw new Error(await describeNetErrorWithDiagnostics(err, url))
  }
}

/**
 * Регистрирует IPC handlers для импорта из Рутрекера
 */
export function registerRutrackerHandlers(): void {
  // Загрузить HTML страницы раздачи по URL
  createHandler('rutracker:fetchPage', async (url: string) => {
    return fetchRutrackerPage(url)
  })

  // Парсинг HTML страницы раздачи
  createHandler('rutracker:parse', (html: string, url: string) => {
    return parseRutrackerPage(html, url)
  })

  // Полный пайплайн: парсинг + матчинг с Shikimori
  createHandler('rutracker:import', async (html: string, url: string) => {
    return processRutrackerImport(html, url)
  })

  // Подтверждение выбора Shikimori аниме (загрузка полных данных)
  createHandler('rutracker:confirmMatch', async (shikimoriId: number) => {
    const data = await confirmShikimoriMatch(shikimoriId)
    if (!data) {
      throw new Error('Аниме не найдено на Shikimori')
    }
    return data
  })

  // Запустить скачивание торрента → автоматический импорт
  createHandler('rutracker:startDownload', async (params: StartDownloadParams) => {
    const orchestrator = getDownloadOrchestrator()
    return orchestrator.startDownload(params)
  })

  // Список активных загрузок
  createHandler('rutracker:getActiveDownloads', () => {
    return getDownloadOrchestrator().getActiveDownloads()
  })

  // Метаданные загрузки для кнопки «В очередь»
  createHandler('rutracker:getDownloadMeta', (infoHash: string) => {
    return getDownloadOrchestrator().getDownloadMeta(infoHash)
  })

  // Отменить загрузку
  createHandler('rutracker:cancelDownload', async (infoHash: string, deleteFiles?: boolean) => {
    return getDownloadOrchestrator().cancelDownload(infoHash, deleteFiles)
  })

  // Найти источник для торрента, добавленного вручную (не через Animatrona) — по ссылке
  // в comment раздачи. Файлы уже на диске/качаются — никакого повторного скачивания,
  // только парсинг+матчинг и привязка результата к уже существующему торренту.
  createHandler('rutracker:findSourceForTorrent', async (infoHash: string) => {
    const service = (await initTorrentService()) as QBittorrentService
    const comment = await service.getTorrentComment(infoHash)
    const urlMatch = RUTRACKER_URL_RE.exec(comment)
    if (!urlMatch) {
      return { found: false as const }
    }
    const url = urlMatch[0]

    const html = await fetchRutrackerPage(url)
    const result = await processRutrackerImport(html, url)

    if (result.match && !result.needsConfirmation) {
      const animeName = result.shikimoriData?.russian || result.shikimoriData?.name || result.torrent.nameRu
      service.updateMeta(infoHash, {
        shikimoriId: result.match.shikimoriId,
        animeName,
        rutrackerUrl: url,
      })
      log.info('Источник найден и привязан', { infoHash, url, shikimoriId: result.match.shikimoriId, animeName })
      return { found: true as const, linked: true as const, url, shikimoriId: result.match.shikimoriId, animeName }
    }

    log.info('Источник найден, но матч неуверенный — нужна ручная проверка', { infoHash, url })
    return { found: true as const, linked: false as const, url }
  })
}
