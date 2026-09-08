/**
 * Определяет, является ли перетащенный путь видеофайлом (иначе считаем его папкой).
 *
 * Набор расширений общий с main-процессом. Раньше он был здесь скопирован — считалось, что
 * общий модуль сюда не резолвится, потому что main и renderer собираются разными бандлерами.
 * Это верно для бареля `@letar/folder-scan` (он тянет `node:fs`/`electron`), но не для
 * подпути `/media-extensions`: там нет ни одной зависимости от рантайма.
 */
import { hasExtension, PLAYABLE_VIDEO_EXTENSIONS } from '@letar/folder-scan/media-extensions'

export function isVideoFilePath(filePath: string): boolean {
  return hasExtension(filePath, PLAYABLE_VIDEO_EXTENSIONS)
}
