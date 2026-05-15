'use server'

/**
 * Server actions для управления отстранениями (дисциплина).
 * Создание, деактивация дисквалификаций и плагиат-action.
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Получить все отстранения ===

export const getSuspensionsAction = adminGuard(async (activeOnly?: boolean) => {
  const suspensions = await prisma.playerSuspension.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: {
      player: {
        select: { id: true, name: true, slug: true, disambiguation: true },
      },
      season: { select: { id: true, name: true } },
    },
    orderBy: [{ active: 'desc' }, { startedAt: 'desc' }],
  })

  return { data: suspensions }
})

// === Создать отстранение вручную ===

const CreateSuspensionSchema = z
  .object({
    playerId: z.string().min(1, 'Выберите поэта'),
    seasonId: z.string().min(1, 'Выберите сезон'),
    reason: z.enum(['RED_CARD', 'YELLOW_ACCUMULATION', 'DOUBLE_YELLOW', 'PLAGIARISM']),
    matchesLeft: z.number().int().min(0).optional(),
    untilEndOfSeason: z.boolean().optional(),
  })
  .strip()

export const createSuspensionAction = adminGuard(async (input: unknown) => {
  const parsed = CreateSuspensionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const { playerId, seasonId, reason, matchesLeft, untilEndOfSeason } = parsed.data

  // Проверяем что игрок и сезон существуют
  const [player, season] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId } }),
    prisma.season.findUnique({ where: { id: seasonId } }),
  ])

  if (!player) {
    return { error: 'Поэт не найден' }
  }
  if (!season) {
    return { error: 'Сезон не найден' }
  }

  // Проверяем что нет активного отстранения в этом сезоне
  const existing = await prisma.playerSuspension.findFirst({
    where: { playerId, seasonId, active: true },
  })
  if (existing) {
    return { error: 'У поэта уже есть активное отстранение в этом сезоне' }
  }

  const isSeason = reason === 'PLAGIARISM' || untilEndOfSeason === true

  await prisma.playerSuspension.create({
    data: {
      playerId,
      seasonId,
      reason,
      matchesLeft: isSeason ? 0 : (matchesLeft ?? 1),
      untilEndOfSeason: isSeason,
      active: true,
    },
  })

  revalidatePath('/admin/suspensions')
  return { success: true }
})

// === Деактивировать отстранение досрочно ===

const DeactivateSchema = z
  .object({
    id: z.string().min(1),
  })
  .strip()

export const deactivateSuspensionAction = adminGuard(async (input: unknown) => {
  const parsed = DeactivateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const suspension = await prisma.playerSuspension.findUnique({
    where: { id: parsed.data.id },
  })

  if (!suspension) {
    return { error: 'Отстранение не найдено' }
  }
  if (!suspension.active) {
    return { error: 'Отстранение уже неактивно' }
  }

  await prisma.playerSuspension.update({
    where: { id: parsed.data.id },
    data: { active: false, matchesLeft: 0 },
  })

  revalidatePath('/admin/suspensions')
  return { success: true }
})

// === Дисквалификация за плагиат (привязана к выступлению) ===

const PlagiarismSchema = z
  .object({
    performanceId: z.string().min(1),
  })
  .strip()

/**
 * Дисквалификация за плагиат:
 * 1. Обнуляет оценки выступления до минимальных (все 1)
 * 2. Создаёт PlayerSuspension до конца сезона
 */
export const disqualifyForPlagiarismAction = adminGuard(async (input: unknown) => {
  const parsed = PlagiarismSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const performance = await prisma.playerPerformance.findUnique({
    where: { id: parsed.data.performanceId },
    include: {
      player: { select: { id: true, name: true } },
      match: { select: { id: true } },
      teamSeason: { include: { season: { select: { id: true } } } },
    },
  })

  if (!performance) {
    return { error: 'Выступление не найдено' }
  }

  const seasonId = performance.teamSeason.season.id
  const playerId = performance.playerId

  // Проверяем нет ли уже активной дисквалификации
  const existing = await prisma.playerSuspension.findFirst({
    where: { playerId, seasonId, active: true, reason: 'PLAGIARISM' },
  })
  if (existing) {
    return { error: 'Поэт уже дисквалифицирован за плагиат в этом сезоне' }
  }

  // Транзакция: обнулить оценки + создать дисквалификацию
  await prisma.$transaction([
    // Обнулить все оценки до минимальных (5 судей × 1 балл)
    prisma.playerPerformance.update({
      where: { id: parsed.data.performanceId },
      data: {
        textScores: [1, 1, 1, 1, 1],
        deliveryScores: [1, 1, 1, 1, 1],
        textAdjusted: 3, // 1+1+1 (отброс мин/макс из одинаковых = всё равно 3)
        deliveryAdjusted: 3,
        totalScore: 6,
      },
    }),
    // Создать дисквалификацию до конца сезона
    prisma.playerSuspension.create({
      data: {
        playerId,
        seasonId,
        reason: 'PLAGIARISM',
        matchesLeft: 0,
        untilEndOfSeason: true,
        active: true,
      },
    }),
  ])

  revalidatePath(`/admin/matches/${performance.match.id}`)
  revalidatePath('/admin/suspensions')
  return { success: true, playerName: performance.player.name }
})

// === Поиск поэтов для комбобокса ===

export const searchPlayersForSuspensionAction = adminGuard(async (query: string) => {
  if (!query || query.length < 2) {
    return { data: [] }
  }

  const players = await prisma.player.findMany({
    where: {
      name: { contains: query, mode: 'insensitive' },
    },
    select: { id: true, name: true, disambiguation: true },
    take: 10,
    orderBy: { name: 'asc' },
  })

  return { data: players }
})

// === Список активных сезонов для выбора ===

export const getActiveSeasonsAction = adminGuard(async () => {
  const seasons = await prisma.season.findMany({
    where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
    select: { id: true, name: true },
    orderBy: { startDate: 'desc' },
  })

  return { data: seasons }
})
