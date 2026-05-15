/**
 * EpisodeManifest — Типы манифеста эпизода для IPFS
 *
 * Описывает формат JSON-документа, хранящегося в IPFS для каждого эпизода.
 * Содержит информацию о видео, аудиодорожках, субтитрах, главах, превью.
 *
 * Используется как плеером (web/desktop/mobile/tv), так и генератором (desktop).
 */

/** Версия формата манифеста эпизода */
export const MANIFEST_VERSION = 1

/** Информация о видео */
export interface ManifestVideo {
  /** CID видеофайла в IPFS */
  cid: string
  /** Длительность в миллисекундах */
  durationMs: number
  /** Ширина кадра */
  width: number
  /** Высота кадра */
  height: number
  /** Кодек видео (hevc, av1, h264) */
  codec: string
  /** Битрейт видео (bps) */
  bitrate?: number
  /** Размер видеофайла в IPFS (байты) */
  size?: number
}

/** Аудиодорожка */
export interface ManifestAudioTrack {
  /** Уникальный ID дорожки */
  id: string
  /** Индекс потока в контейнере */
  streamIndex: number
  /** Язык (ISO 639-1: ru, en, ja) */
  language: string
  /** Название дорожки (Japanese 5.1, Russian Dub) */
  title: string
  /** Кодек (aac, opus, flac) */
  codec: string
  /** Конфигурация каналов (2.0, 5.1, 7.1) */
  channels: string
  /** Битрейт (bps) */
  bitrate?: number
  /** Дорожка по умолчанию */
  isDefault: boolean
  /** CID аудиофайла в IPFS */
  cid?: string
  /** Группа озвучки (AniDUB, AniLibria и т.д.) */
  dubGroup?: string
  /** Размер аудиофайла в IPFS (байты) */
  size?: number
}

/** Субтитры */
export interface ManifestSubtitleTrack {
  /** Уникальный ID дорожки */
  id: string
  /** Индекс потока (-1 для внешних файлов) */
  streamIndex: number
  /** Язык */
  language: string
  /** Название (Russian Signs, English Subs) */
  title: string
  /** Формат (ass, srt, vtt) */
  format: string
  /** CID файла субтитров в IPFS */
  cid?: string
  /** Дорожка по умолчанию */
  isDefault: boolean
  /** Шрифты для ASS субтитров */
  fonts?: ManifestSubtitleFont[]
  /** Группа субтитров (HorribleSubs, FanSub Team и т.д.) */
  dubGroup?: string
  /** Размер файла субтитров в IPFS (байты) */
  size?: number
}

/** Шрифт для ASS субтитров */
export interface ManifestSubtitleFont {
  /** Имя шрифта как в ASS файле */
  name: string
  /** CID файла шрифта в IPFS */
  cid?: string
  /** Расширение файла (ttf, otf, woff2). По умолчанию ttf */
  fileExt?: string
  /** Размер файла шрифта в IPFS (байты) */
  size?: number
}

/** Тип главы */
export type ManifestChapterType = 'chapter' | 'op' | 'ed' | 'recap' | 'preview'

/** Глава */
export interface ManifestChapter {
  /** Время начала в миллисекундах */
  startMs: number
  /** Время окончания в миллисекундах */
  endMs: number
  /** Название главы */
  title: string | null
  /** Тип главы */
  type: ManifestChapterType
  /** Можно ли пропустить */
  skippable: boolean
}

/** Превью кадры (sprite sheet) */
export interface ManifestThumbnails {
  /** CID VTT файла с метками времени в IPFS */
  vttCid: string
  /** CID sprite sheet изображения в IPFS */
  spriteCid: string
}

/** Навигация между эпизодами */
export interface ManifestNavigation {
  /** Следующий эпизод */
  nextEpisode?: {
    id: string
    manifestCid: string
  }
  /** Предыдущий эпизод */
  prevEpisode?: {
    id: string
    manifestCid: string
  }
}

/** Информация о кодировании */
export interface ManifestEncodingInfo {
  /** Название профиля кодирования */
  profileName: string
  /** Кодек (av1, hevc, h264) */
  codec: string
  /** Constant Quality (CQ/CRF) */
  cq: number
  /** Пресет энкодера */
  preset: string
  /** Режим контроля битрейта */
  rateControl: string
  /** Tune настройка */
  tune?: string
  /** Multipass режим */
  multipass?: string
  /** Spatial AQ */
  spatialAq?: boolean
  /** Temporal AQ */
  temporalAq?: boolean
  /** AQ Strength */
  aqStrength?: number
  /** GOP Size */
  gopSize?: number
  /** Lookahead */
  lookahead?: number
  /** B-Ref Mode */
  bRefMode?: string
  /** Принудительный 10-bit */
  force10Bit?: boolean
  /** VMAF score (если использовался подбор) */
  vmafScore?: number
  /** Тип энкодера (gpu/cpu) */
  encoderType: 'gpu' | 'cpu'
  /** Модель оборудования (GPU или CPU) */
  hardwareModel?: string
  /** Версия FFmpeg */
  ffmpegVersion?: string
  /** Полная команда FFmpeg */
  ffmpegCommand?: string
  /** Время транскодирования в мс */
  transcodeDurationMs?: number
  /** Количество активных GPU воркеров */
  activeGpuWorkers?: number
  /** Макс. параллельных видео-потоков */
  videoMaxConcurrent?: number
  /** Макс. параллельных аудио-потоков */
  audioMaxConcurrent?: number
  /** Размер исходного файла в байтах */
  sourceSize?: number
  /** Размер транскодированного файла в байтах */
  transcodedSize?: number
  /** Коэффициент сжатия (transcodedSize / sourceSize) */
  compressionRatio?: number
  /** Кодек исходного видео (h264, hevc, etc.) */
  sourceCodec?: string
  /** Ширина исходного видео */
  sourceWidth?: number
  /** Высота исходного видео */
  sourceHeight?: number
  /** Битрейт исходного видео (bps) */
  sourceBitrate?: number
  /** Битность исходного видео (8, 10, 12) */
  sourceBitDepth?: number
}

/** Информация об эпизоде */
export interface ManifestInfo {
  /** Название аниме */
  animeName: string
  /** Номер сезона */
  seasonNumber: number
  /** Номер эпизода */
  episodeNumber: number
  /** Название эпизода (если есть) */
  episodeName?: string
}

// ─── Вложенные IPFS-документы ────────────────────────────────────────

/** Документ глав в IPFS (отдельный JSON со своим CID) */
export interface ChaptersDocument {
  /** Версия формата */
  version: 1
  /** Список глав */
  chapters: ManifestChapter[]
}

/** Документ кодирования в IPFS (отдельный JSON со своим CID) */
export interface EncodingDocument {
  /** Версия формата */
  version: 1
  /** Информация о кодировании */
  encoding: ManifestEncodingInfo
}

/** Документ превью в IPFS (отдельный JSON со своим CID) */
export interface ThumbnailsDocument {
  /** Версия формата */
  version: 1
  /** Превью кадры */
  thumbnails: ManifestThumbnails
}

// ─── Основной тип ────────────────────────────────────────────────────

/** Полный манифест эпизода */
export interface EpisodeManifest {
  /** Версия формата */
  version: typeof MANIFEST_VERSION
  /** ID эпизода в БД */
  episodeId: string
  /** Информация об эпизоде */
  info: ManifestInfo
  /** Информация о видео */
  video: ManifestVideo
  /** Аудиодорожки */
  audioTracks: ManifestAudioTrack[]
  /** Субтитры */
  subtitleTracks: ManifestSubtitleTrack[]
  /** @deprecated Главы инлайн (для обратной совместимости при чтении старых манифестов) */
  chapters: ManifestChapter[]
  /** CID документа глав (ChaptersDocument) в IPFS */
  chaptersCid?: string
  /** @deprecated Превью инлайн (для обратной совместимости при чтении старых манифестов) */
  thumbnails?: ManifestThumbnails
  /** CID документа превью (ThumbnailsDocument) в IPFS */
  thumbnailsCid?: string
  /** Навигация */
  navigation?: ManifestNavigation
  /** @deprecated Кодирование инлайн (для обратной совместимости при чтении старых манифестов) */
  encoding?: ManifestEncodingInfo
  /** CID документа кодирования (EncodingDocument) в IPFS */
  encodingCid?: string
  /** CID metadata.json исходника в IPFS (результат ffprobe) */
  metadataCid?: string
  /** CID'ы полноразмерных скриншотов (1280px webp) */
  screenshotCids?: string[]
  /** Дата генерации */
  generatedAt: string
}
