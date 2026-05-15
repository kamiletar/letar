'use server'

/**
 * Server Actions для CRUD операций с Settings
 * Singleton модель — всегда один документ с id='default'
 */

import type { Prisma, Settings } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить настройки (всегда возвращает singleton или null)
 */
export async function getSettings(include?: Prisma.SettingsInclude): Promise<Settings | null> {
  return prisma.settings.findUnique({
    where: { id: 'default' },
    include,
  })
}

/**
 * Получить настройки с профилем по умолчанию
 */
export async function getSettingsWithProfile(): Promise<Settings | null> {
  return prisma.settings.findUnique({
    where: { id: 'default' },
    include: { defaultProfile: true },
  })
}

// === UPSERT ===

/**
 * Создать или обновить настройки
 * Используется для инициализации и обновления
 */
export async function upsertSettings(data: Prisma.SettingsUpdateInput): Promise<Settings> {
  return prisma.settings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      ...(data as Prisma.SettingsCreateInput),
    },
    update: data,
  })
}

// === UPDATE ===

/**
 * Обновить настройки
 */
export async function updateSettings(data: Prisma.SettingsUpdateInput): Promise<Settings> {
  return prisma.settings.update({
    where: { id: 'default' },
    data,
  })
}

/**
 * Обновить путь к библиотеке
 */
export async function updateLibraryPath(path: string): Promise<Settings> {
  return prisma.settings.update({
    where: { id: 'default' },
    data: { libraryPath: path },
  })
}

/**
 * Обновить настройки транскодирования
 */
export async function updateTranscodeSettings(data: {
  useGpu?: boolean
  videoCodec?: 'AV1' | 'HEVC' | 'H264' | 'COPY'
  videoQuality?: number
  videoPreset?: string
  audioBitrate?: number
}): Promise<Settings> {
  return prisma.settings.update({
    where: { id: 'default' },
    data,
  })
}

/**
 * Обновить настройки плеера
 */
export async function updatePlayerSettings(data: {
  skipOpening?: boolean
  skipEnding?: boolean
  autoplay?: boolean
}): Promise<Settings> {
  return prisma.settings.update({
    where: { id: 'default' },
    data,
  })
}

/**
 * Установить профиль по умолчанию
 */
export async function setDefaultProfile(profileId: string | null): Promise<Settings> {
  return prisma.settings.update({
    where: { id: 'default' },
    data: { defaultProfileId: profileId },
  })
}
