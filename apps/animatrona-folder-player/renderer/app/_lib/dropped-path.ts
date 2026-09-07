/**
 * Определяет, является ли перетащенный путь видеофайлом (иначе считаем его папкой) —
 * тот же набор расширений, что и `main/constants/file-filters.ts` (`VIDEO_EXTENSIONS`).
 * Дублируется, а не импортируется: main и renderer собираются раздельными бандлерами
 * (webpack / Next.js), общий модуль сюда не резолвится без отдельной настройки алиасов.
 */
const VIDEO_EXTENSIONS = new Set(['mkv', 'mp4', 'avi', 'webm', 'mov', 'wmv', 'flv', 'm4v', 'ts', 'm2ts'])

export function isVideoFilePath(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase()
  return !!ext && VIDEO_EXTENSIONS.has(ext)
}
