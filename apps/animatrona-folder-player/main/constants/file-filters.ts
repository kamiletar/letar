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

/**
 * Расширения видео (без точки) для файловых ассоциаций и распознавания пути в argv/drag&drop —
 * тот же набор, что сканер `@letar/folder-scan` (`EXTENSIONS_BY_TYPE.video`), плюс `ts`/`m2ts`
 * из диалоговых фильтров выше. Держать синхронно с `electron-builder.yml` § `fileAssociations`.
 */
export const VIDEO_EXTENSIONS = new Set(['mkv', 'mp4', 'avi', 'webm', 'mov', 'wmv', 'flv', 'm4v', 'ts', 'm2ts'])
