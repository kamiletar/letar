'use server'

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import type { ActionResult } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Назначение ведущего / счетовода на матч ===

const AssignStaffSchema = z
  .object({
    matchId: z.string().min(1),
    scorerUserId: z.string().nullable().optional(),
    presenterUserId: z.string().nullable().optional(),
  })
  .strip()

/** Обновить назначение ведущего и/или счетовода */
export const assignMatchStaffAction = adminGuard(async (input: unknown): Promise<ActionResult> => {
  const parsed = AssignStaffSchema.safeParse(input)
  if (!parsed.success) { return { success: false, error: 'Некорректные данные' } }

  const { matchId, scorerUserId, presenterUserId } = parsed.data

  try {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        ...(scorerUserId !== undefined ? { scorerUserId: scorerUserId || null } : {}),
        ...(presenterUserId !== undefined ? { presenterUserId: presenterUserId || null } : {}),
      },
    })

    revalidatePath('/admin/matches')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Не удалось назначить' }
  }
})

/** Поиск пользователей для назначения ведущего/счетовода */
export const searchStaffUsersAction = adminGuard(async (query: string, role: 'presenter' | 'scorer') => {
  // Пользователи, которые уже были ведущими/счетоводами (частые)
  const recentField = role === 'presenter' ? 'presenterUserId' : 'scorerUserId'
  const recentMatches = await prisma.match.findMany({
    where: { [recentField]: { not: null } },
    select: { [recentField]: true },
    orderBy: { scheduledAt: 'desc' },
    take: 100,
  })

  // Подсчёт частоты
  const frequencyMap = new Map<string, number>()
  for (const m of recentMatches) {
    const userId = (m as Record<string, string | null>)[recentField]
    if (userId) {
      frequencyMap.set(userId, (frequencyMap.get(userId) ?? 0) + 1)
    }
  }

  const frequentIds = [...frequencyMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  // Если есть поисковый запрос — ищем по имени/email
  if (query.trim().length >= 2) {
    const searchResults = await prisma.user.findMany({
      where: {
        OR: [{ name: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }],
      },
      select: { id: true, name: true, email: true },
      take: 20,
      orderBy: { name: 'asc' },
    })
    return { data: { frequent: [], results: searchResults } }
  }

  // Без запроса — показываем частых
  const frequentUsers = frequentIds.length > 0
    ? await prisma.user.findMany({
      where: { id: { in: frequentIds } },
      select: { id: true, name: true, email: true },
    })
    : []

  // Сортируем по частоте
  const sorted = frequentUsers.sort((a, b) => {
    return (frequencyMap.get(b.id) ?? 0) - (frequencyMap.get(a.id) ?? 0)
  })

  return { data: { frequent: sorted, results: [] } }
})

/** Схема валидации создания матча */
const CreateMatchSchema = z
  .object({
    matchType: z.enum(['REGULAR', 'FRIENDLY']),
    seasonId: z.string().optional(),
    tourId: z.string().optional(),
    leagueId: z.string().optional(),
    homeTeamId: z.string().min(1, 'Выберите домашнюю команду'),
    awayTeamId: z.string().min(1, 'Выберите гостевую команду'),
    venueId: z.string().optional(),
    scheduledAt: z.string().optional(),
  })
  .strip()

/** Создание матча */
export const createMatchAction = adminGuard(async (input: unknown): Promise<ActionResult<{ matchId: string }>> => {
  const parsed = CreateMatchSchema.safeParse(input)
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const firstError = Object.values(flat.fieldErrors).flat()[0] ?? 'Некорректные данные'
    return { success: false, error: firstError }
  }

  const { matchType, seasonId, tourId, leagueId, homeTeamId, awayTeamId, venueId, scheduledAt } = parsed.data

  // Валидация: домашняя и гостевая команда не совпадают
  if (homeTeamId === awayTeamId) {
    return { success: false, error: 'Домашняя и гостевая команда не могут совпадать' }
  }

  // Валидация зависимостей по типу матча
  if (matchType === 'REGULAR' && !tourId) {
    return { success: false, error: 'Для регулярного матча выберите тур' }
  }
  if (matchType === 'FRIENDLY' && !seasonId) {
    return { success: false, error: 'Для товарищеского матча выберите сезон' }
  }

  try {
    const match = await prisma.match.create({
      data: {
        matchType,
        tourId: matchType === 'REGULAR' ? tourId : null,
        leagueId: matchType === 'REGULAR' ? leagueId : null,
        seasonId: matchType === 'FRIENDLY' ? seasonId : null,
        homeTeamId,
        awayTeamId,
        venueId: venueId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    })

    revalidatePath('/admin/matches')

    return { success: true, data: { matchId: match.id } }
  } catch (e) {
    console.error('Ошибка создания матча:', e)
    return { success: false, error: 'Не удалось создать матч' }
  }
})

/** Удалить матч — только в статусе SCHEDULED */
export const deleteMatchAction = adminGuard(async (matchId: unknown): Promise<ActionResult> => {
  if (typeof matchId !== 'string' || !matchId) { return { success: false, error: 'Некорректный ID' } }

  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { status: true } })
  if (!match) { return { success: false, error: 'Матч не найден' } }
  if (match.status !== 'SCHEDULED') { return { success: false, error: 'Удалить можно только запланированный матч' } }

  await prisma.match.delete({ where: { id: matchId } })
  revalidatePath('/admin/matches')
  return { success: true, data: undefined }
})
