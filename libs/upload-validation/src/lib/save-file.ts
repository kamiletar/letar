/**
 * Утилиты сохранения файлов на диск
 */

import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Генерирует уникальное имя файла.
 *
 * Имя целиком строится на сервере (timestamp + random), из `originalName`
 * берётся только расширение — и оно обязательно очищается: `originalName`
 * приходит из multipart-заголовка, то есть полностью под контролем клиента,
 * а результат попадает в `join()` при записи на диск и в поле `path` в БД.
 *
 * @example
 * generateFilename('photo.jpg') // '1704672000000-abc123xyz.jpg'
 * generateFilename('a./etc/passwd') // '1704672000000-abc123xyz.etcpasswd'
 */
export function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const rawExtension = originalName.split('.').pop() || 'bin'
  // Оставляем только буквы и цифры: убирает разделители пути (`/`, `\`),
  // нулевой байт и прочие управляющие символы. Через `split('.').pop()`
  // сегмент `..` недостижим (в расширении не бывает точки), поэтому подняться
  // выше корня нельзя — но `/` без очистки уводит запись в чужой подкаталог
  // uploads и протаскивает слэши в `path` записи File.
  const extension = rawExtension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin'
  return `${timestamp}-${randomString}.${extension}`
}

/**
 * Создаёт директорию для загрузки если не существует
 *
 * @param subdir Поддиректория внутри uploads (например 'avatars', 'vehicles')
 * @returns Полный путь к директории
 */
export async function ensureUploadDir(subdir: string): Promise<string> {
  const uploadsDir = join(process.cwd(), 'uploads', subdir)

  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }

  return uploadsDir
}

/**
 * Сохраняет файл на диск
 *
 * @returns Относительный путь файла (для хранения в БД)
 *
 * @example
 * ```ts
 * const filename = generateFilename(file.name)
 * const { path, buffer } = await saveFileToDisk(file, 'avatars', filename)
 * // path = 'avatars/1704672000000-abc123xyz.jpg'
 * ```
 */
export async function saveFileToDisk(
  file: File,
  subdir: string,
  filename: string,
): Promise<{ path: string; buffer: Buffer }> {
  const uploadsDir = await ensureUploadDir(subdir)
  const filepath = join(uploadsDir, filename)

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  await writeFile(filepath, buffer)

  return {
    path: `${subdir}/${filename}`,
    buffer,
  }
}

/**
 * Удаляет файл с диска (безопасно игнорирует ошибки)
 *
 * @param relativePath Относительный путь от uploads/ (например 'avatars/abc.jpg')
 */
export async function deleteFileFromDisk(relativePath: string): Promise<void> {
  try {
    const filepath = join(process.cwd(), 'uploads', relativePath)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }
  } catch {
    // Игнорируем ошибки при удалении
  }
}

/**
 * Удаляет старый файл если он существует
 *
 * @param fileInfo Информация о файле (должен иметь поле path)
 */
export async function deleteOldFile(fileInfo: { path: string } | null | undefined): Promise<void> {
  if (fileInfo?.path) {
    await deleteFileFromDisk(fileInfo.path)
  }
}
