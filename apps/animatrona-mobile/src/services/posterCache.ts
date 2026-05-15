/**
 * Кэш постеров аниме
 *
 * При загрузке библиотеки скачивает постеры через react-native-blob-util.
 * Хранит маппинг animeId → "localFilePath|timestamp" в AsyncStorage.
 * getPosterUrl() возвращает file:// URI если постер закэширован.
 *
 * Формат posterMap: { animeId: "path|timestamp" }
 * - path — путь к файлу на диске
 * - timestamp — время скачивания (для cache-busting RN Image)
 */

import ReactNativeBlobUtil from 'react-native-blob-util'

import { getPosterUrl as getServerPosterUrl } from '@/api/client'
import { addPosterToMap, getPosterMap, removePosterFromMap } from '@/services/cache'
import { fileExists, getFileSize, getPosterPath } from '@/services/fileStorage'

/** Минимальный размер валидного постера (1 KB) — 404 body обычно ~30 байт */
const MIN_POSTER_SIZE = 1024

/** Разделитель пути и версии в posterMap */
const VERSION_SEPARATOR = '|'

/** Извлечь путь и версию из записи posterMap */
function parsePosterEntry(entry: string): { path: string; version: string } {
  const sepIndex = entry.lastIndexOf(VERSION_SEPARATOR)
  if (sepIndex === -1) {
    // Старый формат (без версии) — совместимость
    return { path: entry, version: '0' }
  }
  return {
    path: entry.substring(0, sepIndex),
    version: entry.substring(sepIndex + 1),
  }
}

/** Создать запись posterMap с версией */
function createPosterEntry(path: string): string {
  return `${path}${VERSION_SEPARATOR}${Date.now()}`
}

/** Проверить, закэширован ли постер */
export async function isPosterCached(animeId: string): Promise<boolean> {
  const path = getPosterPath(animeId)
  return fileExists(path)
}

/**
 * Получить URL постера (локальный file:// или серверный)
 *
 * Синхронная функция — использует предзагруженный маппинг.
 * Для оффлайн работы постер должен быть предварительно скачан.
 */
export function getCachedPosterUrl(animeId: string, posterMap: Record<string, string>): string {
  const entry = posterMap[animeId]
  if (entry) {
    const { path, version } = parsePosterEntry(entry)
    // ?v= инвалидирует кэш RN Image при обновлении файла
    return `file://${path}?v=${version}`
  }
  // Фоллбэк на серверный URL
  return getServerPosterUrl(animeId)
}

/** Скачать постер для одного аниме */
export async function downloadPoster(animeId: string): Promise<string | null> {
  try {
    const serverUrl = getServerPosterUrl(animeId)
    if (!serverUrl) {
      return null
    }

    const destPath = getPosterPath(animeId)

    // Проверяем, уже есть ли валидный файл
    if (await fileExists(destPath)) {
      const size = await getFileSize(destPath)
      if (size > MIN_POSTER_SIZE) {
        return destPath
      }
      // Битый файл (404 body, пустой) — удаляем и перекачиваем
      await ReactNativeBlobUtil.fs.unlink(destPath).catch(() => undefined)
    }

    // Создать родительскую директорию
    const { ensureParentDir } = await import('./fileStorage')
    await ensureParentDir(destPath)

    // Скачиваем
    const response = await ReactNativeBlobUtil.config({
      path: destPath,
      overwrite: true,
    }).fetch('GET', serverUrl)

    // Проверяем HTTP статус — BlobUtil создаёт файл даже при 404
    const status = response.info().status
    if (status < 200 || status >= 300) {
      await ReactNativeBlobUtil.fs.unlink(destPath).catch(() => undefined)
      return null
    }

    // Обновляем маппинг с новой версией (инвалидирует кэш Image)
    await addPosterToMap(animeId, createPosterEntry(destPath))

    return destPath
  } catch (error) {
    console.warn('[posterCache] Ошибка скачивания постера:', animeId, error)
    return null
  }
}

/** Скачать постеры для списка аниме (фоновая операция) */
export async function cachePostersForLibrary(animeIds: string[]): Promise<void> {
  const map = await getPosterMap()
  const toDownload: string[] = []

  for (const id of animeIds) {
    if (!map[id]) {
      // Нет в кэше — нужно скачать
      toDownload.push(id)
      continue
    }
    // Есть в кэше — проверяем валидность файла
    const { path } = parsePosterEntry(map[id])
    const exists = await fileExists(path)
    if (!exists) {
      await removePosterFromMap(id)
      toDownload.push(id)
      continue
    }
    const size = await getFileSize(path)
    if (size < MIN_POSTER_SIZE) {
      // Битый файл (404 body сохранённый BlobUtil)
      await ReactNativeBlobUtil.fs.unlink(path).catch(() => undefined)
      await removePosterFromMap(id)
      toDownload.push(id)
    }
  }

  if (toDownload.length === 0) {
    return
  }

  console.warn(`[posterCache] Кэширование ${toDownload.length} постеров`)

  // Скачиваем по одному (не перегружаем сеть)
  for (const animeId of toDownload) {
    await downloadPoster(animeId)
  }

  console.warn('[posterCache] Кэширование постеров завершено')
}

/** Удалить постер из кэша */
export async function deleteCachedPoster(animeId: string): Promise<void> {
  const path = getPosterPath(animeId)
  try {
    const exists = await fileExists(path)
    if (exists) {
      await ReactNativeBlobUtil.fs.unlink(path)
    }
  } catch {
    // Игнорируем
  }
  await removePosterFromMap(animeId)
}

/** Очистить весь кэш постеров */
export async function clearPosterCache(): Promise<void> {
  const { deleteFile } = await import('./fileStorage')
  const map = await getPosterMap()

  for (const [animeId, entry] of Object.entries(map)) {
    const { path } = parsePosterEntry(entry)
    await deleteFile(path)
    await removePosterFromMap(animeId)
  }

  console.warn('[posterCache] Кэш постеров очищен')
}
