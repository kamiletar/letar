import { PLAYABLE_VIDEO_EXTENSIONS, withoutDots } from '@letar/folder-scan/media-extensions'

/**
 * Фильтры файлов для диалогов выбора — те же расширения, что распознаёт `@letar/folder-scan`
 */

export interface FileFilter {
  name: string
  extensions: string[]
}

export const VIDEO_FILTERS: FileFilter[] = [
  { name: 'Видео', extensions: withoutDots(PLAYABLE_VIDEO_EXTENSIONS) },
  { name: 'Все файлы', extensions: ['*'] },
]

/**
 * Расширения видео (без точки) для файловых ассоциаций и распознавания пути в argv/drag&drop.
 * Держать синхронно с `electron-builder.yml` § `fileAssociations`.
 */
export const VIDEO_EXTENSIONS = new Set(withoutDots(PLAYABLE_VIDEO_EXTENSIONS))
