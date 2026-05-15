/**
 * Типы для страницы настроек
 */

import type { LuSun } from 'react-icons/lu'

import type { ThemeMode } from '@/components/ui/color-mode'

/** Дефолтные пути */
export interface DefaultPaths {
  libraryPath: string
  outputPath: string
}

/** Статус обновления */
export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  updateInfo: { version: string; releaseDate: string; releaseNotes?: string } | null
  downloadProgress: number
  error: string | null
  downloadSpeed: number
  downloadEta: number
}

/** Опция темы */
export interface ThemeOption {
  value: ThemeMode
  label: string
  description: string
  icon: typeof LuSun
}
