/**
 * Фильтры файлов для диалогов выбора — те же расширения, что распознаёт `@letar/folder-scan`
 */

export interface FileFilter {
  name: string
  extensions: string[]
}

export const VIDEO_FILTERS: FileFilter[] = [
  { name: 'Видео', extensions: ['mkv', 'mp4', 'avi', 'webm', 'mov', 'ts', 'm2ts'] },
  { name: 'Все файлы', extensions: ['*'] },
]
