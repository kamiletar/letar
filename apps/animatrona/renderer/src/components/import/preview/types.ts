/**
 * Типы для компонентов PreviewStep
 */

import type { EncodingProfile } from '@/generated/prisma'

import type { MediaInfo } from '../../../../../shared/types'
import type { ParsedFile } from '../FileScanStep'

/** Тип субтитров: полные, надписи (signs), песни (songs) */
export type SubtitleType = 'full' | 'signs' | 'songs'

/** Настройки импорта (профиль + потоки) */
export interface ImportSettings {
  /** ID выбранного профиля кодирования */
  profileId: string | null
  /** Полные данные профиля (для передачи в main process) */
  selectedProfile?: EncodingProfile | null
  /** Макс. количество параллельных аудио-потоков */
  audioMaxConcurrent: number
  /** Макс. количество параллельных видео-потоков (GPU NVENC) */
  videoMaxConcurrent: number
  /** Переопределённый CQ из VMAF авто-поиска */
  cqOverride?: number
  /** Требуется CPU fallback (GPU недоступен для контента) */
  useCpuFallback?: boolean
  /** Принудительно использовать CPU вместо GPU */
  forceCpu?: boolean
  /** Включить VMAF подбор CQ перед кодированием (в очереди) */
  vmafEnabled?: boolean
  /** Целевой VMAF для подбора CQ (по умолчанию 94) */
  targetVmaf?: number
  /** Anime4K апскейл через libplacebo (GPU шейдеры, фиксированный CQ 32) */
  anime4kEnabled?: boolean
  /** Применить hqdn3d денойз перед кодированием */
  denoiseEnabled?: boolean
}

/** Рекомендация для аудиодорожки */
export interface AudioRecommendation {
  trackIndex: number
  action: 'transcode' | 'skip'
  reason: string
  enabled: boolean
  /** Внешний файл? */
  isExternal?: boolean
  /** Путь к внешнему файлу */
  externalPath?: string
  /** Название группы (озвучки) для внешних аудио */
  groupName?: string
  /** Язык аудиодорожки (ru, en, ja и т.д.) */
  language?: string
  /** Группа озвучки (AniDUB, AniLibria и т.д.) */
  dubGroup?: string
  /** ID группы для batch-редактирования ("embedded:0" | "external:FolderName") */
  groupId?: string
}

/** Рекомендация для субтитров */
export interface SubtitleRecommendation {
  /** Индекс потока (или -1 для внешних) */
  streamIndex: number
  /** Язык */
  language: string
  /** Название */
  title: string
  /** Формат (ass, srt, vtt) */
  format: string
  /** Внешний файл? */
  isExternal: boolean
  /** Путь к внешнему файлу */
  externalPath?: string
  /** Шрифты (для ASS) */
  matchedFonts?: Array<{ name: string; path: string }>
  /** Включен для импорта */
  enabled: boolean
  /** Группа озвучки/субтитров (AniDUB, HorribleSubs и т.д.) */
  dubGroup?: string
  /** Тип субтитров (полные, надписи, песни) */
  subtitleType?: SubtitleType
  /** ID группы для batch-редактирования ("embedded:0" | "external:FolderName") */
  groupId?: string
}

/** Результат анализа файла (используем probe, не demux) */
export interface FileAnalysis {
  file: ParsedFile
  mediaInfo: MediaInfo | null
  isAnalyzing: boolean
  error: string | null
  audioRecommendations: AudioRecommendation[]
  subtitleRecommendations: SubtitleRecommendation[]
}

/** Props для PreviewStep */
export interface PreviewStepProps {
  /** Выбранные файлы */
  files: ParsedFile[]
  /** Путь к папке с файлами (для сканирования внешних субтитров) */
  folderPath: string
  /** Год выхода аниме (из Shikimori) — используется для авто-предложения денойза */
  sourceYear?: number
  /** Обратный вызов при изменении анализа */
  onAnalysisComplete: (analyses: FileAnalysis[]) => void
  /** Обратный вызов при изменении настроек импорта */
  onSettingsChange?: (settings: ImportSettings) => void
}

/** Props для FileCard */
export interface FileCardProps {
  analysis: FileAnalysis
  folderPath: string
  onToggleTrack: (fileIndex: number, trackIndex: number, enabled: boolean) => void
  onToggleSubtitle: (episodeNumber: number, subtitleIndex: number, enabled: boolean) => void
  /** Callback для обновления групп дорожек (только текущий эпизод) */
  onTrackGroupEdit?: (episodeNumber: number, type: 'audio' | 'subtitle', groupId: string, edit: TrackGroupEdit) => void
  /** Callback для применения настроек ко всем эпизодам */
  onApplyToAll?: (type: 'audio' | 'subtitle', groupId: string, edit: TrackGroupEdit) => void
}

/** Опции видео для VMAF теста */
export interface VideoOptionsForVmaf {
  codec: 'av1' | 'hevc' | 'h264'
  useGpu: boolean
  preset: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7'
}

/** Состояние настроек кодирования */
export interface EncodingSettingsState {
  profiles: EncodingProfile[]
  selectedProfileId: string | null
  isLoadingProfiles: boolean
  audioMaxConcurrent: number
  videoMaxConcurrent: number
}

/** Редактирование групп дорожек (batch edit) */
export interface TrackGroupEdit {
  /** Изменённый язык */
  language?: string
  /** Изменённая группа озвучки (null = без группы) */
  dubGroup?: string | null
  /** Изменённый тип субтитров */
  subtitleType?: SubtitleType
  /** Включить/исключить все дорожки группы */
  enabled?: boolean
}

/** Маппинг groupId -> изменения */
export type TrackGroupEdits = Record<string, TrackGroupEdit>

/** Информация о группе дорожек */
export interface TrackGroup {
  /** Уникальный ID группы */
  groupId: string
  /** Тип группы */
  type: 'embedded' | 'external'
  /** Название для отображения (папка или "Встроенные #N") */
  displayName: string
  /** Количество дорожек в группе */
  trackCount: number
  /** Текущий язык (если у всех одинаковый) */
  language?: string
  /** Текущая группа озвучки (если у всех одинаковая) */
  dubGroup?: string
  /** Тип субтитров (если у всех одинаковый) */
  subtitleType?: SubtitleType
  /** Все дорожки включены (false = все выключены, undefined = смешанное) */
  enabled?: boolean
  /** Индексы дорожек в этой группе (для аудио: trackIndex, для сабов: индекс в массиве) */
  trackIndices: number[]
}
