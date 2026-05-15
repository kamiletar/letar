/**
 * Утилиты для работы с Origin Private File System (OPFS).
 * Используются для хранения кастомных аудио-треков пользователя.
 */

import type { CustomAudioTrack } from '@/app/[locale]/(main)/mandalas/[slug]/_schemas/viewer-settings.schema'

// =============================================================================
// Константы
// =============================================================================

/** Название директории для аудиофайлов */
export const AUDIO_DIR = 'mandala-audio'

/** Название файла метаданных */
export const METADATA_FILE = 'metadata.json'

/** Допустимые MIME-типы аудиофайлов */
export const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'] as const

/** Максимальный размер файла (100 МБ) */
export const MAX_FILE_SIZE = 100 * 1024 * 1024

/** Маппинг MIME-типов на расширения файлов */
export const MIME_TO_EXTENSION: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
}

// =============================================================================
// Типы
// =============================================================================

/** Результат валидации аудиофайла */
export interface ValidationResult {
  valid: boolean
  duration?: number
  error?: string
}

// =============================================================================
// Функции файловой системы
// =============================================================================

/**
 * Получить директорию для аудиофайлов в OPFS.
 */
export async function getAudioDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(AUDIO_DIR, { create: true })
}

/**
 * Сохранить файл в OPFS.
 */
export async function saveFile(dir: FileSystemDirectoryHandle, name: string, data: Blob | string): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(data)
  await writable.close()
}

/**
 * Прочитать файл из OPFS.
 */
export async function readFile(dir: FileSystemDirectoryHandle, name: string): Promise<File | null> {
  try {
    const fileHandle = await dir.getFileHandle(name)
    return fileHandle.getFile()
  } catch {
    return null
  }
}

/**
 * Удалить файл из OPFS.
 */
export async function deleteFile(dir: FileSystemDirectoryHandle, name: string): Promise<void> {
  try {
    await dir.removeEntry(name)
  } catch {
    // Игнорируем ошибку если файл не существует
  }
}

// =============================================================================
// Функции метаданных
// =============================================================================

/**
 * Загрузить метаданные треков из OPFS.
 */
export async function loadMetadata(dir: FileSystemDirectoryHandle): Promise<CustomAudioTrack[]> {
  const file = await readFile(dir, METADATA_FILE)
  if (!file) {
    return []
  }
  try {
    const text = await file.text()
    return JSON.parse(text) as CustomAudioTrack[]
  } catch {
    return []
  }
}

/**
 * Сохранить метаданные треков в OPFS.
 */
export async function saveMetadata(dir: FileSystemDirectoryHandle, tracks: CustomAudioTrack[]): Promise<void> {
  await saveFile(dir, METADATA_FILE, JSON.stringify(tracks, null, 2))
}

// =============================================================================
// Функции валидации
// =============================================================================

/**
 * Валидация аудиофайла.
 * Проверяет MIME-тип, размер и возможность декодирования.
 */
export async function validateAudioFile(file: File): Promise<ValidationResult> {
  // 1. Проверка MIME-типа
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Неподдерживаемый формат. Используйте MP3, WAV, OGG или M4A.`,
    }
  }

  // 2. Проверка размера
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Файл слишком большой. Максимум 100 МБ.`,
    }
  }

  // 3. Проверка декодирования и получение длительности
  try {
    const audioContext = new AudioContext()
    const buffer = await file.arrayBuffer()
    const decoded = await audioContext.decodeAudioData(buffer)
    await audioContext.close()
    return {
      valid: true,
      duration: decoded.duration,
    }
  } catch {
    return {
      valid: false,
      error: `Не удалось прочитать аудиофайл. Файл повреждён.`,
    }
  }
}

// =============================================================================
// Вспомогательные функции
// =============================================================================

/**
 * Генерация UUID.
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Получить имя файла без расширения.
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(0, lastDot) : filename
}
