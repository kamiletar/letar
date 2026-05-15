/**
 * Автопродвижение в сетке Double Elimination.
 *
 * После завершения матча: победитель → следующий слот,
 * проигравший → нижняя сетка (или вылет).
 * Если оба источника слота заполнены — автоматически создаётся матч.
 */

import { prisma } from '@/lib/db'

/**
 * Продвигает победителя/проигравшего в следующие слоты сетки.
 * Вызывается из finishMatchAction() если матч привязан к BracketSlot.
 */
export async function advanceWinner(matchId: string): Promise<{
  advanced: boolean
  matchesCreated: number
  error?: string
}> {
  // Находим BracketSlot для этого матча
  const currentSlot = await prisma.bracketSlot.findFirst({
    where: { matchId },
    include: {
      match: {
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          homePoints: true,
          awayPoints: true,
          status: true,
          tourId: true,
          leagueId: true,
        },
      },
    },
  })

  if (!currentSlot || !currentSlot.match) {
    return { advanced: false, matchesCreated: 0 }
  }

  if (currentSlot.match.status !== 'FINISHED') {
    return { advanced: false, matchesCreated: 0, error: 'Матч не завершён' }
  }

  // Определяем победителя и проигравшего
  const { homeTeamId, awayTeamId, homeScore, awayScore } = currentSlot.match
  const winnerId = homeScore > awayScore ? homeTeamId : awayTeamId
  const loserId = homeScore > awayScore ? awayTeamId : homeTeamId

  let matchesCreated = 0

  // Победитель → следующие слоты (feedsTo1 или feedsTo2)
  const feedsTo = await prisma.bracketSlot.findMany({
    where: {
      OR: [{ sourceSlot1Id: currentSlot.id }, { sourceSlot2Id: currentSlot.id }],
    },
  })

  for (const nextSlot of feedsTo) {
    await prisma.bracketSlot.update({
      where: { id: nextSlot.id },
      data: { teamSeasonId: winnerId },
    })

    // Проверяем, заполнены ли оба источника
    const created = currentSlot.match.tourId
      ? await tryCreateMatch(nextSlot.id, currentSlot.match.tourId, currentSlot.match.leagueId)
      : false
    if (created) {
      matchesCreated++
    }
  }

  // Проигравший → слот loserGoesTo
  const loserSlots = await prisma.bracketSlot.findMany({
    where: { id: currentSlot.loserGoesToId ?? undefined },
  })

  for (const loserSlot of loserSlots) {
    // Определяем куда идёт проигравший (в source1 или source2)
    // Проигравший заполняет пустую позицию
    const slot = await prisma.bracketSlot.findUnique({
      where: { id: loserSlot.id },
      include: {
        sourceSlot1: { select: { teamSeasonId: true } },
        sourceSlot2: { select: { teamSeasonId: true } },
      },
    })

    if (slot) {
      // Помещаем проигравшего в слот, который ссылается на source из loserGoesTo
      await prisma.bracketSlot.update({
        where: { id: loserSlot.id },
        data: { teamSeasonId: loserId },
      })

      const created = currentSlot.match.tourId
        ? await tryCreateMatch(loserSlot.id, currentSlot.match.tourId, currentSlot.match.leagueId)
        : false
      if (created) {
        matchesCreated++
      }
    }
  }

  return { advanced: true, matchesCreated }
}

/**
 * Пытается создать матч для слота если оба источника заполнены.
 * Слот хранит teamSeasonId только одной команды — нужно проверить оба source слота.
 */
async function tryCreateMatch(slotId: string, tourId: string, leagueId: string | null): Promise<boolean> {
  const slot = await prisma.bracketSlot.findUnique({
    where: { id: slotId },
    include: {
      sourceSlot1: { select: { teamSeasonId: true } },
      sourceSlot2: { select: { teamSeasonId: true } },
    },
  })

  if (!slot) {
    return false
  }
  // Уже есть матч — не создаём повторно
  if (slot.matchId) {
    return false
  }

  const team1 = slot.sourceSlot1?.teamSeasonId
  const team2 = slot.sourceSlot2?.teamSeasonId

  // Если у слота нет source (начальный слот) — пропускаем
  if (!slot.sourceSlot1Id && !slot.sourceSlot2Id) {
    return false
  }

  // Оба источника должны быть заполнены
  if (!team1 || !team2) {
    return false
  }

  // Создаём матч
  const match = await prisma.match.create({
    data: {
      tourId,
      leagueId,
      homeTeamId: team1,
      awayTeamId: team2,
      status: 'SCHEDULED',
    },
  })

  // Привязываем матч к слоту
  await prisma.bracketSlot.update({
    where: { id: slotId },
    data: { matchId: match.id },
  })

  return true
}
