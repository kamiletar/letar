/**
 * Типы для торрент-сервиса
 */

/** Статус торрента */
export type TorrentStatus = 'adding' | 'downloading' | 'checking' | 'seeding' | 'paused' | 'error' | 'done'

/** Информация о торренте для renderer */
export interface TorrentInfo {
  /** Уникальный ID (infoHash) */
  infoHash: string
  /** Название торрента */
  name: string
  /** Общий размер в байтах */
  totalSize: number
  /** Скачано в байтах */
  downloaded: number
  /** Отдано в байтах */
  uploaded: number
  /** Прогресс 0..1 */
  progress: number
  /** Скорость скачивания байт/сек */
  downloadSpeed: number
  /** Скорость отдачи байт/сек */
  uploadSpeed: number
  /** Количество пиров */
  numPeers: number
  /** Ratio (uploaded / downloaded) */
  ratio: number
  /** Статус */
  status: TorrentStatus
  /** Путь к папке с файлами */
  path: string
  /** Время добавления */
  addedAt: number
  /** Магнет-ссылка */
  magnetURI: string
  /** Список файлов */
  files: TorrentFileInfo[]
  /** Статус импорта: none (не импортирован), queued (в очереди), imported (в библиотеке) */
  importStatus?: 'none' | 'queued' | 'imported'
  /** Русское название аниме (из Shikimori) */
  animeName?: string
  /** ID на Shikimori */
  shikimoriId?: number
  /** URL раздачи на Rutracker */
  rutrackerUrl?: string
  /** Набор из нескольких аниме в одной раздаче */
  isBundle?: boolean
  /** JSON [{shikimoriId, animeName}] — аниме в наборе */
  bundleAnimesJson?: string
  /** Сообщение об ошибке */
  error?: string
  /** Категория в qBittorrent ('animatrona' — добавлен через Animatrona, иначе/пусто — вручную) */
  category?: string
}

/** Информация о файле в торренте */
export interface TorrentFileInfo {
  /** Имя файла */
  name: string
  /** Путь к файлу (относительный) */
  path: string
  /** Размер в байтах */
  size: number
  /** Прогресс 0..1 */
  progress: number
}

/** Опции добавления торрента */
export interface AddTorrentOptions {
  /** Папка для скачивания */
  downloadPath: string
  /** Последовательная загрузка (для стриминга) */
  sequential?: boolean
  /** Целевой ratio для авто-остановки сидирования */
  targetRatio?: number
  /** Набор из нескольких аниме в одной раздаче */
  isBundle?: boolean
  /** JSON [{shikimoriId, animeName}] — аниме в наборе */
  bundleAnimesJson?: string
}

/** Компактный прогресс торрента — отправляется каждые 2 сек через IPC (без files[]) */
export interface TorrentProgress {
  infoHash: string
  progress: number
  downloadSpeed: number
  uploadSpeed: number
  numPeers: number
  downloaded: number
  uploaded: number
  ratio: number
  status: TorrentStatus
}

/** События торрент-сервиса */
export interface TorrentEvents {
  /** Прогресс скачивания обновился (компактный, без files[]) */
  'torrent:progress': TorrentProgress
  /** Торрент добавлен */
  'torrent:added': TorrentInfo
  /** Скачивание завершено */
  'torrent:done': TorrentInfo
  /** Ошибка */
  'torrent:error': { infoHash: string; error: string }
  /** Торрент удалён */
  'torrent:removed': { infoHash: string }
}
