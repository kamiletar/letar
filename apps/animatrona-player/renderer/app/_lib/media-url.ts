/**
 * Конвертирует локальный путь в `media://` URL, воспроизводимый в `<video>`.
 * Без IPFS — animatrona-player работает только с локальными папками.
 */
export function toMediaUrl(path: string | null | undefined): string {
  if (!path) {
    return ''
  }

  if (path.startsWith('media://')) {
    return path
  }

  let normalized = path
  if (normalized.startsWith('file:///')) {
    normalized = normalized.slice(8)
  } else if (normalized.startsWith('file://')) {
    normalized = normalized.slice(7)
  }

  return `media://${normalized}`
}
