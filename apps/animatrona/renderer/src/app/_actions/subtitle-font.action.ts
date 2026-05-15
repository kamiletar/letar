'use server'

/**
 * Server Actions для CRUD операций с SubtitleFont
 *
 * SubtitleFont — шрифты для ASS субтитров
 */

import type { Prisma, SubtitleFont } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить список шрифтов
 */
export async function findManySubtitleFonts(args?: Prisma.SubtitleFontFindManyArgs): Promise<SubtitleFont[]> {
  return prisma.subtitleFont.findMany(args)
}

/**
 * Получить шрифт по ID
 */
export async function findUniqueSubtitleFont(id: string): Promise<SubtitleFont | null> {
  return prisma.subtitleFont.findUnique({ where: { id } })
}

// === CREATE ===

/**
 * Создать шрифт
 */
export async function createSubtitleFont(data: Prisma.SubtitleFontUncheckedCreateInput): Promise<SubtitleFont> {
  return prisma.subtitleFont.create({ data })
}

/**
 * Создать несколько шрифтов
 */
export async function createManySubtitleFonts(data: Prisma.SubtitleFontCreateManyInput[]): Promise<{ count: number }> {
  return prisma.subtitleFont.createMany({ data })
}

// === DELETE ===

/**
 * Удалить шрифт
 */
export async function deleteSubtitleFont(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.subtitleFont.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Удалить шрифты по ID субтитров
 */
export async function deleteSubtitleFontsByTrackId(subtitleTrackId: string): Promise<{ count: number }> {
  return prisma.subtitleFont.deleteMany({ where: { subtitleTrackId } })
}
