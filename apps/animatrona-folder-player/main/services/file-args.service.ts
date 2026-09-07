/**
 * Распознавание пути к видеофайлу в аргументах командной строки — двойной клик по
 * ассоциированному файлу (`fileAssociations` в electron-builder.yml) передаёт его аргументом
 * при первом запуске (`process.argv`) и при повторном (`second-instance`, `commandLine`).
 */

import path from 'node:path'
import { VIDEO_EXTENSIONS } from '../constants/file-filters'

export function findVideoFileInArgv(argv: string[]): string | undefined {
  return argv.find((arg) => {
    const ext = path.extname(arg).toLowerCase().replace(/^\./, '')
    return VIDEO_EXTENSIONS.has(ext)
  })
}
