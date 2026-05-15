/**
 * Типы для @letar/exoplayer-ass
 */

import type { ViewStyle } from 'react-native'

/** Props для NativeAssView */
export interface NativeAssViewProps {
  /** Содержимое ASS/SSA файла */
  assContent: string
  /** Текущее время видео в миллисекундах */
  currentTimeMs: number
  /** Ширина видео (для корректного масштабирования) */
  videoWidth?: number
  /** Высота видео */
  videoHeight?: number
  /** Путь к директории с кастомными шрифтами */
  fontDir?: string
  /** Стиль контейнера */
  style?: ViewStyle
  /** Pointer events (обычно "none" чтобы не блокировать взаимодействие) */
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only'
}

/** Native команды для AssSubtitleView */
export interface AssSubtitleViewCommands {
  /** Загрузить ASS контент */
  loadContent: (content: string) => void
  /** Обновить размер кадра */
  setFrameSize: (width: number, height: number) => void
  /** Освободить ресурсы */
  release: () => void
}
