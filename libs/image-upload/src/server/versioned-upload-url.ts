import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { resolveUploadPath } from './serve-uploads'

export interface VersionedUploadUrlOptions {
  /** URL-префикс маршрута, который раздаёт uploads. */
  baseUrl?: string
  /** Длина SHA-256 в URL. 12 hex-символов достаточно для локального набора файлов. */
  hashLength?: number
  /** Корень uploads. По умолчанию `<process.cwd()>/uploads`. */
  root?: string
}

/**
 * Строит content-addressed URL для файла с постоянным именем.
 *
 * `/api/files` отдаётся с `immutable`, поэтому перезаписывать файл под прежним URL нельзя.
 * Хэш содержимого в query меняет ключ браузерного/CDN-кэша автоматически и при этом сохраняет
 * долгий кэш для неизменившейся версии.
 */
export function getVersionedUploadUrl(relativePath: string, options: VersionedUploadUrlOptions = {}): string {
  const { baseUrl = '/api/files', hashLength = 12, root = path.join(process.cwd(), 'uploads') } = options

  if (!Number.isInteger(hashLength) || hashLength < 8 || hashLength > 64) {
    throw new Error('Длина хэша должна быть целым числом от 8 до 64')
  }

  if (path.isAbsolute(relativePath)) {
    throw new Error(`Путь выходит за пределы uploads: ${relativePath}`)
  }

  const segments = relativePath.replaceAll('\\', '/').split('/').filter(Boolean)
  const resolved = resolveUploadPath(root, segments)
  if (!resolved.ok) {
    throw new Error(`Путь выходит за пределы uploads: ${relativePath}`)
  }

  const bytes = readFileSync(/* turbopackIgnore: true */ resolved.absPath)
  const version = createHash('sha256').update(bytes).digest('hex').slice(0, hashLength)
  const encodedPath = segments.map(encodeURIComponent).join('/')

  return `${baseUrl.replace(/\/$/, '')}/${encodedPath}?v=${version}`
}
