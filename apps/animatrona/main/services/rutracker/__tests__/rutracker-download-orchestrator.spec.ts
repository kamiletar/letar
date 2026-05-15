/**
 * Тесты RutrackerDownloadOrchestrator
 *
 * Мокаем торрент-сервис, ImportQueueController и electron.
 */

import { EventEmitter } from 'events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TorrentInfo } from '../../torrent'
import type { StartDownloadParams } from '../rutracker-download-orchestrator'

// Мок electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp'),
  },
}))

// Мок логгера
vi.mock('../../../utils/logger', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Мок торрент-сервис
const mockTorrentService = Object.assign(new EventEmitter(), {
  init: vi.fn(),
  add: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  updateMeta: vi.fn(),
  getAll: vi.fn(() => []),
})

vi.mock('../../torrent', () => ({
  getTorrentService: () => mockTorrentService,
}))

// Мок ImportQueueController
const mockAddItems = vi.fn()

vi.mock('../../import-queue-controller', () => ({
  ImportQueueController: {
    getInstance: () => ({
      addItems: mockAddItems,
    }),
  },
}))

// Импортируем после моков
import { getDownloadOrchestrator } from '../rutracker-download-orchestrator'

/** Тестовые данные */
function createTestParams(overrides?: Partial<StartDownloadParams>): StartDownloadParams {
  return {
    importResult: {
      torrent: {
        nameRu: 'Тест аниме',
        nameOriginal: 'Test Anime',
        magnetLink: 'magnet:?xt=urn:btih:abc123',
        releaseGroup: 'SubGroup',
        resolution: '1080p',
        sourceType: 'BDRip',
        topicId: '12345',
        url: 'https://rutracker.org/forum/viewtopic.php?t=12345',
        forumName: 'Аниме',
        seeders: 10,
        leechers: 2,
        size: '5 GB',
      },
      shikimoriMatch: {
        id: 1,
        name: 'Test Anime',
        russian: 'Тест аниме',
        score: 8.5,
        confidence: 0.95,
      },
    },
    shikimoriData: {
      id: 1,
      name: 'Test Anime',
      russian: 'Тест аниме',
      description: 'Описание',
      descriptionHtml: '<p>Описание</p>',
      poster: { originalUrl: 'https://example.com/poster.jpg' },
      kind: 'tv',
      status: 'released',
      episodes: 12,
      episodesAired: 12,
      airedOn: { date: '2024-01-01' },
      score: '8.5',
      genres: [{ id: 1, name: 'Action', russian: 'Экшен', kind: 'genre' }],
    },
    ...overrides,
  } as StartDownloadParams
}

/** Тестовая TorrentInfo */
function createTestTorrentInfo(): TorrentInfo {
  return {
    infoHash: 'abc123def456',
    name: 'Test Anime [1080p]',
    magnetURI: 'magnet:?xt=urn:btih:abc123def456',
    totalSize: 5 * 1024 * 1024 * 1024,
    downloaded: 5 * 1024 * 1024 * 1024,
    uploaded: 0,
    progress: 1,
    downloadSpeed: 0,
    uploadSpeed: 0,
    numPeers: 5,
    status: 'seeding',
    path: '/tmp/Animatrona',
    files: [
      {
        name: '[SubGroup] Test Anime - 01 [1080p].mkv',
        path: 'Test Anime [1080p]/[SubGroup] Test Anime - 01 [1080p].mkv',
        size: 500 * 1024 * 1024,
        progress: 1,
      },
      {
        name: '[SubGroup] Test Anime - 02 [1080p].mkv',
        path: 'Test Anime [1080p]/[SubGroup] Test Anime - 02 [1080p].mkv',
        size: 500 * 1024 * 1024,
        progress: 1,
      },
      { name: 'readme.txt', path: 'Test Anime [1080p]/readme.txt', size: 1024, progress: 1 },
    ],
  }
}

describe('RutrackerDownloadOrchestrator', () => {
  beforeEach(() => {
    // Сбрасываем singleton
    // @ts-expect-error — доступ к private static для тестов
    const OrchestratorClass = getDownloadOrchestrator().constructor
    // @ts-expect-error — сброс singleton
    OrchestratorClass.instance = null

    vi.clearAllMocks()
    mockTorrentService.removeAllListeners()
  })

  afterEach(() => {
    mockTorrentService.removeAllListeners()
  })

  describe('startDownload', () => {
    it('запускает скачивание и возвращает infoHash', async () => {
      const torrentInfo = createTestTorrentInfo()
      mockTorrentService.add.mockResolvedValue(torrentInfo)

      const orchestrator = getDownloadOrchestrator()
      const params = createTestParams()
      const result = await orchestrator.startDownload(params)

      expect(result.infoHash).toBe('abc123def456')
      expect(result.torrent).toBe(torrentInfo)
      expect(mockTorrentService.init).toHaveBeenCalled()
      expect(mockTorrentService.add).toHaveBeenCalledWith('magnet:?xt=urn:btih:abc123', {
        downloadPath: expect.stringContaining('Animatrona'),
        sequential: undefined,
      })
    })

    it('бросает ошибку без магнет-ссылки', async () => {
      const orchestrator = getDownloadOrchestrator()
      const params = createTestParams()
      params.importResult.torrent.magnetLink = undefined as unknown as string

      await expect(orchestrator.startDownload(params)).rejects.toThrow('Магнет-ссылка отсутствует')
    })

    it('использует указанный downloadPath', async () => {
      const torrentInfo = createTestTorrentInfo()
      mockTorrentService.add.mockResolvedValue(torrentInfo)

      const orchestrator = getDownloadOrchestrator()
      const params = createTestParams({ downloadPath: '/custom/path' })
      await orchestrator.startDownload(params)

      expect(mockTorrentService.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ downloadPath: '/custom/path' })
      )
    })

    it('передаёт sequential опцию', async () => {
      const torrentInfo = createTestTorrentInfo()
      mockTorrentService.add.mockResolvedValue(torrentInfo)

      const orchestrator = getDownloadOrchestrator()
      const params = createTestParams({ sequential: true })
      await orchestrator.startDownload(params)

      expect(mockTorrentService.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ sequential: true })
      )
    })
  })

  describe('onTorrentDone', () => {
    it('логирует завершение скачивания (не добавляет автоматически в очередь)', async () => {
      const torrentInfo = createTestTorrentInfo()
      mockTorrentService.add.mockResolvedValue(torrentInfo)

      const orchestrator = getDownloadOrchestrator()
      await orchestrator.startDownload(createTestParams())

      // Симулируем событие done
      mockTorrentService.emit('torrent:done', torrentInfo)
      await new Promise((r) => setTimeout(r, 10))

      // addItems НЕ вызывается — пользователь сам нажмёт «В очередь»
      expect(mockAddItems).not.toHaveBeenCalled()
    })

    it('игнорирует не свои торренты', async () => {
      const orchestrator = getDownloadOrchestrator()
      const torrentInfo = createTestTorrentInfo()

      mockTorrentService.add.mockResolvedValue(torrentInfo)
      await orchestrator.startDownload(createTestParams())

      // Симулируем done для другого торрента
      const otherTorrent = { ...torrentInfo, infoHash: 'other_hash' }
      mockTorrentService.emit('torrent:done', otherTorrent)

      await new Promise((r) => setTimeout(r, 10))

      expect(mockAddItems).not.toHaveBeenCalled()
    })

    it('сохраняет загрузку в активных после завершения для UI', async () => {
      const torrentInfo = createTestTorrentInfo()
      mockTorrentService.add.mockResolvedValue(torrentInfo)

      const orchestrator = getDownloadOrchestrator()
      await orchestrator.startDownload(createTestParams())

      expect(orchestrator.getActiveDownloads()).toHaveLength(1)

      // После done загрузка остаётся в активных — пользователь решает что делать
      mockTorrentService.emit('torrent:done', torrentInfo)
      await new Promise((r) => setTimeout(r, 10))

      expect(orchestrator.getActiveDownloads()).toHaveLength(1)
    })
  })

  describe('getActiveDownloads', () => {
    it('возвращает список активных загрузок', async () => {
      const torrentInfo = createTestTorrentInfo()
      mockTorrentService.add.mockResolvedValue(torrentInfo)
      mockTorrentService.get.mockReturnValue(torrentInfo)

      const orchestrator = getDownloadOrchestrator()
      await orchestrator.startDownload(createTestParams())

      const active = orchestrator.getActiveDownloads()
      expect(active).toHaveLength(1)
      expect(active[0].infoHash).toBe('abc123def456')
      expect(active[0].name).toBe('Test Anime [1080p]')
    })

    it('использует nameRu если торрент не найден в сервисе', async () => {
      const torrentInfo = createTestTorrentInfo()
      mockTorrentService.add.mockResolvedValue(torrentInfo)
      mockTorrentService.get.mockReturnValue(null)

      const orchestrator = getDownloadOrchestrator()
      await orchestrator.startDownload(createTestParams())

      const active = orchestrator.getActiveDownloads()
      expect(active[0].name).toBe('Тест аниме')
    })
  })

  describe('cancelDownload', () => {
    it('отменяет загрузку', async () => {
      const torrentInfo = createTestTorrentInfo()
      mockTorrentService.add.mockResolvedValue(torrentInfo)
      mockTorrentService.remove.mockResolvedValue(true)

      const orchestrator = getDownloadOrchestrator()
      await orchestrator.startDownload(createTestParams())

      const result = await orchestrator.cancelDownload('abc123def456')
      expect(result).toBe(true)
      expect(mockTorrentService.remove).toHaveBeenCalledWith('abc123def456', true)
      expect(orchestrator.getActiveDownloads()).toHaveLength(0)
    })

    it('возвращает false для несуществующей загрузки', async () => {
      const orchestrator = getDownloadOrchestrator()
      const result = await orchestrator.cancelDownload('nonexistent')
      expect(result).toBe(false)
    })
  })

  // extractEpisodeNumber и buildImportQueueData — private методы,
  // тестируются косвенно при интеграционном тестировании через UI «В очередь»
})
