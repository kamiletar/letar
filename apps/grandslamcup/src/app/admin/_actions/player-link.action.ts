'use server'

/**
 * Server actions для привязки/отвязки поэт↔пользователь из админки.
 * Включает одобрение/отклонение заявок "Это я" (pendingUserId).
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Заявки на привязку (pendingUserId) ===

/** Получить список поэтов с pending заявкой */
export const getPendingClaimsAction = adminGuard(async () => {
  const players = await prisma.player.findMany({
    where: { pendingUserId: { not: null } },
    select: {
      id: true,
      name: true,
      slug: true,
      photo: true,
      pendingUserId: true,
      updatedAt: true,
      city: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Подгружаем данные pending пользователей
  const userIds = players.map((p) => p.pendingUserId).filter(Boolean) as string[]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  return {
    data: players.map((p) => ({
      ...p,
      updatedAt: p.updatedAt.toISOString(),
      pendingUser: p.pendingUserId ? (userMap.get(p.pendingUserId) ?? null) : null,
    })),
  }
})

/** Количество pending заявок (для badge) */
export const getPendingClaimsCountAction = adminGuard(async () => {
  const count = await prisma.player.count({
    where: { pendingUserId: { not: null } },
  })
  return { count }
})

const PlayerIdSchema = z.object({ playerId: z.string().min(1) }).strip()

/** Одобрить заявку — pendingUserId → userId */
export const approveClaimAction = adminGuard(async (input: unknown) => {
  const parsed = PlayerIdSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const player = await prisma.player.findUnique({
    where: { id: parsed.data.playerId },
    select: { pendingUserId: true, userId: true },
  })

  if (!player) {
    return { error: 'Поэт не найден' }
  }
  if (!player.pendingUserId) {
    return { error: 'Нет заявки на привязку' }
  }
  if (player.userId) {
    return { error: 'Профиль уже привязан к другому аккаунту' }
  }

  // Проверяем что pendingUser не привязан к другому поэту
  const existing = await prisma.player.findFirst({
    where: { userId: player.pendingUserId },
    select: { name: true },
  })
  if (existing) {
    return { error: `Аккаунт уже привязан к: ${existing.name}` }
  }

  try {
    await prisma.player.update({
      where: { id: parsed.data.playerId },
      data: { userId: player.pendingUserId, pendingUserId: null },
    })
    revalidatePath('/admin')
    return { success: true }
  } catch {
    return { error: 'Не удалось одобрить заявку' }
  }
})

/** Отклонить заявку — pendingUserId = null */
export const rejectClaimAction = adminGuard(async (input: unknown) => {
  const parsed = PlayerIdSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  try {
    await prisma.player.update({
      where: { id: parsed.data.playerId },
      data: { pendingUserId: null },
    })
    revalidatePath('/admin')
    return { success: true }
  } catch {
    return { error: 'Не удалось отклонить заявку' }
  }
})

// === Поиск поэтов для привязки из страницы пользователя ===

const SearchSchema = z.object({ query: z.string().min(1).max(100) }).strip()

/** Поиск поэтов по имени (без привязанного userId) */
export const searchUnlinkedPlayersAction = adminGuard(async (input: unknown) => {
  const parsed = SearchSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Укажите поисковый запрос' }
  }

  const players = await prisma.player.findMany({
    where: {
      userId: null,
      name: { contains: parsed.data.query, mode: 'insensitive' },
    },
    select: { id: true, name: true, slug: true, city: { select: { name: true } } },
    take: 10,
    orderBy: { name: 'asc' },
  })

  return { data: players }
})

// === Привязка из страницы пользователя (по playerId + userId) ===

const LinkByIdsSchema = z.object({ playerId: z.string().min(1), userId: z.string().min(1) }).strip()

/** Привязать поэта к пользователю по ID */
export const linkPlayerToUserByIdAction = adminGuard(async (input: unknown) => {
  const parsed = LinkByIdsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  // Проверяем что пользователь не привязан к другому поэту
  const existing = await prisma.player.findFirst({
    where: { userId: parsed.data.userId },
    select: { name: true },
  })
  if (existing) {
    return { error: `Аккаунт уже привязан к: ${existing.name}` }
  }

  // Проверяем что поэт не привязан
  const player = await prisma.player.findUnique({
    where: { id: parsed.data.playerId },
    select: { userId: true },
  })
  if (!player) {
    return { error: 'Поэт не найден' }
  }
  if (player.userId) {
    return { error: 'Поэт уже привязан к другому аккаунту' }
  }

  try {
    await prisma.player.update({
      where: { id: parsed.data.playerId },
      data: { userId: parsed.data.userId, pendingUserId: null },
    })
    revalidatePath('/admin')
    return { success: true }
  } catch {
    return { error: 'Не удалось привязать' }
  }
})
