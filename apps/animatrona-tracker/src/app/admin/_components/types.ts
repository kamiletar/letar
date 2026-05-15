/** Краткая информация об аудиодорожке (из EpisodeManifest) */
export interface AudioTrackSummary {
  language: string
  title: string
  codec: string
  channels: string
  dubGroup?: string
}

/** Краткая информация о субтитрах (из EpisodeManifest) */
export interface SubtitleTrackSummary {
  language: string
  title: string
  format: string
  dubGroup?: string
}

/** Данные эпизода для модерации */
export interface EpisodeData {
  id: string
  number: number
  title: string | null
  videoCid: string
  duration: number | null
  /** Аудиодорожки из манифеста (опционально — загружается из IPFS) */
  audioTracks?: AudioTrackSummary[]
  /** Субтитры из манифеста (опционально — загружается из IPFS) */
  subtitleTracks?: SubtitleTrackSummary[]
}

/** Данные замещаемого аниме (для сравнения) */
export interface ReplacesAnimeData {
  id: string
  title: string
  titleOriginal: string | null
  coverUrl: string | null
  directoryCid: string | null
  directorySize: number | null
  directoryBlocks: number | null
  year: number | null
  studio: string | null
  genres: string[]
  shikimoriId: number | null
  malId: number | null
  anilistId: number | null
  description: string | null
  createdAt: Date
  uploadedBy: {
    id: string
    name: string | null
    email: string | null
  }
  episodes: EpisodeData[]
}

export interface AnimeItem {
  id: string
  title: string
  titleOriginal: string | null
  coverUrl: string | null
  directoryCid: string | null
  directorySize: number | null
  directoryBlocks: number | null
  shikimoriId: number | null
  malId: number | null
  anilistId: number | null
  description: string | null
  replacesAnimeId: string | null
  replacesAnime: ReplacesAnimeData | null
  year: number | null
  studio: string | null
  genres: string[]
  status: string
  createdAt: Date
  uploadedBy: {
    id: string
    name: string | null
    email: string | null
  }
  episodes: EpisodeData[]
  /** Количество конкурирующих заявок с тем же shikimoriId */
  competingCount?: number
  /** ID конкурирующих заявок */
  competingAnimeIds?: string[]
}

/** Краткая сводка кодирования из EpisodeManifest */
export interface EncodingSummary {
  profileName: string
  codec: string
  cq: number
  preset: string
  vmafScore?: number
  encoderType: string
}

/** Сводка видео из EpisodeManifest */
export interface VideoSummary {
  width: number
  height: number
  codec: string
  bitrate?: number
  size?: number
  durationMs: number
}

/** Полная сводка эпизода из IPFS (для глубокого сравнения) */
export interface EpisodeFullSummary {
  number: number
  name?: string
  manifestCid: string
  /** Удалось ли загрузить EpisodeManifest из IPFS */
  manifestLoaded: boolean
  videoCid?: string
  size: number
  durationMs?: number
  video: VideoSummary | null
  audioTracks: AudioTrackSummary[]
  subtitleTracks: SubtitleTrackSummary[]
  encoding: EncodingSummary | null
  /** Есть ли главы (OP/ED маркеры) */
  hasChapters: boolean
  /** Количество глав */
  chaptersCount: number
  /** Есть ли превью-спрайты */
  hasThumbnails: boolean
  /** Количество скриншотов */
  screenshotsCount: number
}

/** Сводка AnimeInfo из IPFS (метаданные аниме) */
export interface AnimeInfoSummary {
  name?: string
  originalName?: string
  nameEn?: string
  year?: number
  kind?: string
  ageRating?: string
  episodeCount?: number
  status?: string
  rating?: number
  descriptionLength: number
  genres: string[]
  studios: string[]
  fandubbers: string[]
  fansubbers: string[]
}

/** Сводка верхнеуровневого AnimeManifest из IPFS */
export interface ManifestTopLevelSummary {
  /** Название в манифесте */
  name?: string
  /** Оригинальное название */
  originalName?: string
  /** CID постера */
  posterCid?: string
  /** CID AnimeInfo (метаданные: описание, персонажи, стафф) */
  animeInfoCid?: string
  /** CID списка эпизодов */
  episodesCid?: string
  /** CID графа франшизы */
  franchiseGraphCid?: string
  /** CID связей с другими аниме */
  relationsCid?: string
  /** CID превью эпизодов */
  episodePreviewsCid?: string
  /** BD ремукс */
  isBdRemux?: boolean
  /** URL источника */
  sourceUrl?: string
  /** Размер директории */
  directorySize?: number
  /** Количество блоков */
  directoryBlocks?: number
  /** Дата обновления */
  updatedAt?: string
  /** Количество эпизодов в манифесте */
  episodeCount: number
  /** Развёрнутая сводка AnimeInfo (загружается по animeInfoCid) */
  animeInfo?: AnimeInfoSummary
}

/** Полный результат deep-diff API */
export interface DeepDiffResponse {
  /** Верхнеуровневая сводка манифеста */
  manifest: ManifestTopLevelSummary
  /** Сводка по каждому эпизоду */
  episodes: EpisodeFullSummary[]
}

export interface PinServer {
  id: string
  name: string
  apiUrl: string
  peerId: string | null
  authSecret: string | null
  status: string
  role: string
  capacityBytes: number
  usedBytes: number
  _count: { pinJobs: number }
  createdAt: Date
}

export interface PinJob {
  id: string
  cid: string
  status: string
  size: number
  progressBlocks: number
  error: string | null
  createdAt: Date
  server: { id: string; name: string; status: string }
  anime: { id: string; title: string; directoryBlocks: number | null; directorySize: number | null } | null
  createdBy: { id: string; name: string | null }
}

export interface Distribution {
  id: string
  cid: string
  peerId: string
  status: string
  size: number
  lastSeenAt: Date
  anime: { id: string; title: string; directoryBlocks: number | null; directorySize: number | null } | null
  user: { id: string; name: string | null }
}

export interface Stats {
  pendingAnime: number
  totalPublished: number
  totalUsers: number
  pinnedCount: number
}

export interface AdminClientProps {
  pendingAnime: AnimeItem[]
  stats: Stats
  pinServers: PinServer[]
  /** pinJobs загружаются через TanStack Query в PinJobsTab */
  /** distributions загружаются через TanStack Query в SeedsTab */
  userRole: string
}
