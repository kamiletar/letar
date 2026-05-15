/**
 * Типы для модуля добавления дорожек
 */

import type { AggregatedProgress } from '../../../../shared/types/parallel-transcode'
import type { DonorFile, EpisodeMatch } from './episode-matcher'

/** Информация о дорожке для выбора */
export interface TrackInfo {
  /** Уникальный ID (путь:индекс) */
  id: string
  /** Индекс потока */
  streamIndex: number
  /** Язык */
  language: string
  /** Название */
  title: string
  /** Кодек */
  codec: string
  /** Каналы (только для аудио) */
  channels?: number
  /** Битрейт */
  bitrate?: number
  /** Формат (только для субтитров) */
  format?: string
  /** Путь к файлу (для внешних) */
  filePath?: string
  /** Внешний файл? */
  isExternal: boolean
  /** Шрифты (для ASS субтитров) */
  matchedFonts?: Array<{ name: string; path: string }>
  /** Название группы озвучки (имя папки-дублёра) */
  dubGroup?: string
}

/** Конфигурация авто-фильтра по языку */
export interface TrackFilterConfig {
  /** Языки для пропуска (например: jpn, ja) */
  skipLanguages: string[]
  /** Языки для автовыбора (например: eng, rus) */
  takeLanguages: string[]
  /** Включить автовыбор */
  autoSelectByType: boolean
}

/** Выбранная дорожка для добавления */
export interface SelectedTrack {
  /** ID матча (путь донора) */
  matchId: string
  /** ID целевого эпизода */
  episodeId: string
  /** Путь к папке эпизода */
  episodeDir: string
  /** Тип: audio или subtitle */
  type: 'audio' | 'subtitle'
  /** Информация о дорожке */
  track: TrackInfo
  /** Название группы озвучки (наследуется от дорожки) */
  dubGroup?: string
}

/** Результат пробы файла донора */
export interface DonorProbeResult {
  /** Путь к файлу */
  path: string
  /** Аудиодорожки (встроенные в MKV) */
  audioTracks: TrackInfo[]
  /** Субтитры (встроенные в MKV) */
  subtitleTracks: TrackInfo[]
  /** Внешние субтитры (из папок типа Rus Sub/) */
  externalSubtitles: TrackInfo[]
  /** Внешние аудиодорожки по группам (папкам дублёров) */
  externalAudioByGroup: Map<string, TrackInfo[]>
}

/** Стадия процесса */
export type AddTracksStage =
  | 'idle'
  | 'folder' // Шаг 1: выбор папки
  | 'scanning' // Сканирование папки
  | 'matching' // Шаг 2: сопоставление файлов
  | 'calibration' // Шаг 3: калибровка синхронизации
  | 'probing' // Анализ файлов (ffprobe)
  | 'selection' // Шаг 4: выбор дорожек
  | 'processing' // Шаг 5: обработка
  | 'done' // Завершено
  | 'error' // Ошибка
  | 'cancelled' // Отменено

/** Добавленная запись (для отката) */
export interface AddedRecord {
  type: 'audio' | 'subtitle'
  id: string
  filePath: string
}

/** Прогресс отдельного файла */
export interface FileProgress {
  /** ID файла (путь) */
  id: string
  /** Имя файла */
  fileName: string
  /** Фаза обработки */
  phase: 'waiting' | 'transcode' | 'copy' | 'done' | 'error'
  /** Процент выполнения (0-100) */
  percent: number
  /** Сообщение об ошибке */
  error?: string
}

/** Прогресс обработки */
export interface AddTracksProgress {
  /** Текущий файл (для совместимости) */
  currentFile: number
  /** Всего файлов */
  totalFiles: number
  /** Текущее имя файла */
  currentFileName: string | null
  /** Фаза: demux, transcode, copy */
  phase: 'demux' | 'transcode' | 'copy' | 'done'
  /** Параллельный прогресс */
  parallelProgress: AggregatedProgress | null
  /** Добавлено аудиодорожек */
  addedAudioTracks: number
  /** Добавлено субтитров */
  addedSubtitleTracks: number
  /** Прогресс каждого файла (для параллельной обработки) */
  fileProgress: FileProgress[]
  /** Количество параллельных потоков */
  concurrency: number
}

/** Состояние хука */
export interface AddTracksState {
  stage: AddTracksStage
  /** Путь к папке-донору */
  donorPath: string | null
  /** Найденные файлы донора */
  donorFiles: DonorFile[]
  /** Сопоставления файлов с эпизодами */
  matches: EpisodeMatch[]
  /** Результаты пробы файлов */
  probeResults: Map<string, DonorProbeResult>
  /** Выбранные дорожки */
  selectedTracks: SelectedTrack[]
  /** Прогресс обработки */
  progress: AddTracksProgress
  /** Сообщение об ошибке */
  error: string | null
  /** Смещение синхронизации донора (мс) */
  syncOffset: number
  /** Количество параллельных потоков (настраиваемое) */
  concurrency: number
  /** Задачи восстановления шрифтов (заполняются из restore-tracks) */
  fontTasks?: FontTask[]
}

/** Эпизод из библиотеки */
export interface LibraryEpisode {
  id: string
  number: number
  /** Путь к папке эпизода (Season X/Episode Y) */
  folderPath?: string | null
  /** CID транскодированного видео в IPFS */
  transcodedCid?: string | null
}

/** Опции хука */
export interface UseAddTracksFlowOptions {
  /** ID аниме */
  animeId: string
  /** Эпизоды из библиотеки */
  episodes: LibraryEpisode[]
  /** Путь к папке аниме */
  animeFolderPath: string
  /** Название аниме */
  animeName: string
  /** Фильтр по типу контента (series = только серии, special = только спешлы) */
  contentTypeFilter?: 'series' | 'special'
}

/** Задача восстановления шрифтов из MKV attachments */
export interface FontTask {
  /** Путь к донорскому MKV */
  donorPath: string
  /** ID эпизода */
  episodeId: string
  /** Имена файлов недостающих шрифтов */
  missingFonts: string[]
  /** ID SubtitleTrack для привязки (все ASS дорожки эпизода) */
  subtitleTrackIds: string[]
}

/** Задача обработки аудио */
export interface AudioTask {
  id: string
  type: 'embedded' | 'external'
  donorPath: string
  episodeId: string
  episodeDir: string
  trackInfo: TrackInfo
}

/** Задача обработки субтитров */
export interface SubtitleTask {
  id: string
  type: 'embedded' | 'external'
  donorPath: string
  episodeId: string
  episodeDir: string
  trackInfo: TrackInfo
}
