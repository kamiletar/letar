'use server'

/**
 * Server action для объединения дублей профилей игроков.
 *
 * mergePlayersAction(sourceId, targetId):
 * В транзакции переносит все связанные данные с source на target,
 * затем удаляет source.
 *
 * getMergePreviewAction(sourceId, targetId):
 * Возвращает preview — сколько записей будет перенесено.
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Preview объединения ===

const PreviewSchema = z
  .object({
    sourceId: z.string().min(1),
    targetId: z.string().min(1),
  })
  .strip()

export const getMergePreviewAction = adminGuard(async (input: unknown) => {
  const parsed = PreviewSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const { sourceId, targetId } = parsed.data

  if (sourceId === targetId) {
    return { error: 'Нельзя объединить игрока с самим собой' }
  }

  const [source, target] = await Promise.all([
    prisma.player.findUnique({
      where: { id: sourceId },
      select: { id: true, name: true, userId: true },
    }),
    prisma.player.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, userId: true },
    }),
  ])

  if (!source) {
    return { error: 'Исходный профиль не найден' }
  }
  if (!target) {
    return { error: 'Целевой профиль не найден' }
  }

  // Считаем записи для переноса
  const [performances, lineups, teamSeasons, ratings, poems, suspensions] = await Promise.all([
    prisma.playerPerformance.count({ where: { playerId: sourceId } }),
    prisma.matchLineup.count({ where: { playerId: sourceId } }),
    prisma.playerTeamSeason.count({ where: { playerId: sourceId } }),
    prisma.playerRating.count({ where: { playerId: sourceId } }),
    prisma.poem.count({ where: { playerId: sourceId } }),
    prisma.playerSuspension.count({ where: { playerId: sourceId } }),
  ])

  return {
    data: {
      source: { id: source.id, name: source.name, hasUser: !!source.userId },
      target: { id: target.id, name: target.name, hasUser: !!target.userId },
      counts: {
        performances,
        lineups,
        teamSeasons,
        ratings,
        poems,
        suspensions,
      },
      // Предупреждение о переносе userId
      willTransferUser: !!source.userId && !target.userId,
      userConflict: !!source.userId && !!target.userId,
    },
  }
})

// === Объединение игроков ===

const MergeSchema = z
  .object({
    sourceId: z.string().min(1),
    targetId: z.string().min(1),
  })
  .strip()

export const mergePlayersAction = adminGuard(async (input: unknown) => {
  const parsed = MergeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const { sourceId, targetId } = parsed.data

  if (sourceId === targetId) {
    return { error: 'Нельзя объединить игрока с самим собой' }
  }

  const [source, target] = await Promise.all([
    prisma.player.findUnique({ where: { id: sourceId } }),
    prisma.player.findUnique({ where: { id: targetId } }),
  ])

  if (!source) {
    return { error: 'Исходный профиль не найден' }
  }
  if (!target) {
    return { error: 'Целевой профиль не найден' }
  }

  try {
    // Транзакция — всё или ничего
    await prisma.$transaction(async (tx) => {
      // 1. Перенести PlayerPerformance (playerId → targetId)
      await tx.playerPerformance.updateMany({
        where: { playerId: sourceId },
        data: { playerId: targetId },
      })

      // 2. Перенести MatchLineup (playerId → targetId)
      //    Проверяем конфликты unique [matchId, teamSeasonId, playerId]
      const sourceLineups = await tx.matchLineup.findMany({
        where: { playerId: sourceId },
        select: { id: true, matchId: true, teamSeasonId: true },
      })

      for (const lineup of sourceLineups) {
        // Проверяем есть ли уже такая запись у target
        const existing = await tx.matchLineup.findUnique({
          where: {
            matchId_teamSeasonId_playerId: {
              matchId: lineup.matchId,
              teamSeasonId: lineup.teamSeasonId,
              playerId: targetId,
            },
          },
        })

        if (existing) {
          // Удаляем дубль из source
          await tx.matchLineup.delete({ where: { id: lineup.id } })
        } else {
          await tx.matchLineup.update({
            where: { id: lineup.id },
            data: { playerId: targetId },
          })
        }
      }

      // 3. Перенести PlayerTeamSeason (playerId → targetId, проверить unique)
      const sourceTeamSeasons = await tx.playerTeamSeason.findMany({
        where: { playerId: sourceId },
        select: { id: true, teamSeasonId: true },
      })

      for (const pts of sourceTeamSeasons) {
        const existing = await tx.playerTeamSeason.findUnique({
          where: {
            playerId_teamSeasonId: {
              playerId: targetId,
              teamSeasonId: pts.teamSeasonId,
            },
          },
        })

        if (existing) {
          // Удаляем дубль из source
          await tx.playerTeamSeason.delete({ where: { id: pts.id } })
        } else {
          await tx.playerTeamSeason.update({
            where: { id: pts.id },
            data: { playerId: targetId },
          })
        }
      }

      // 4. Карточки перенесены через performance (уже обновлены в шаге 1)

      // 5. Перенести PlayerRating (playerId → targetId, проверить unique)
      const sourceRatings = await tx.playerRating.findMany({
        where: { playerId: sourceId },
        select: { id: true, seasonId: true },
      })

      for (const rating of sourceRatings) {
        const existing = await tx.playerRating.findUnique({
          where: {
            playerId_seasonId: {
              playerId: targetId,
              seasonId: rating.seasonId,
            },
          },
        })

        if (existing) {
          // Удаляем дубль — рейтинг target останется (потребуется пересчёт)
          await tx.playerRating.delete({ where: { id: rating.id } })
        } else {
          await tx.playerRating.update({
            where: { id: rating.id },
            data: { playerId: targetId },
          })
        }
      }

      // 6. Перенести Poem (playerId → targetId)
      await tx.poem.updateMany({
        where: { playerId: sourceId },
        data: { playerId: targetId },
      })

      // 7. Перенести Transfer (playerId → targetId)
      await tx.transfer.updateMany({
        where: { playerId: sourceId },
        data: { playerId: targetId },
      })

      // 8. Перенести PlayerSuspension (playerId → targetId)
      await tx.playerSuspension.updateMany({
        where: { playerId: sourceId },
        data: { playerId: targetId },
      })

      // 9. Перенести RosterApplication (playerId → targetId)
      await tx.rosterApplication.updateMany({
        where: { playerId: sourceId },
        data: { playerId: targetId },
      })

      // 10. Если у source есть userId, а у target нет → перенести
      if (source.userId && !target.userId) {
        await tx.player.update({
          where: { id: targetId },
          data: { userId: source.userId },
        })
        // Снять userId с source перед удалением (unique constraint)
        await tx.player.update({
          where: { id: sourceId },
          data: { userId: null },
        })
      }

      // 11. Удалить source Player
      await tx.player.delete({ where: { id: sourceId } })
    })

    revalidatePath('/admin/players')
    revalidatePath('/admin/players/merge')
    return { success: true }
  } catch (error) {
    console.error('[mergePlayersAction] ошибка:', error)
    return { error: 'Ошибка при объединении профилей' }
  }
})
