'use server'

/**
 * Server actions для управления этапами турнира и сеткой плей-офф
 */

import { adminGuard } from '@/lib/action-guard'
import { generateDE16Bracket } from '@/lib/bracket'
import { prisma } from '@/lib/db'
import type { SwissTeamRecord } from '@/lib/swiss'
import { generateSwissRound, makePairKey } from '@/lib/swiss'
import { revalidatePath } from 'next/cache'

// === Получить этапы сезона ===

export const getStagesAction = adminGuard(async (seasonId: string) => {
  try {
    const stages = await prisma.stage.findMany({
      where: { seasonId },
      include: {
        rounds: { select: { id: true, name: true, number: true } },
        _count: { select: { bracketSlots: true } },
      },
      orderBy: { order: 'asc' },
    })

    return { data: stages }
  } catch (error) {
    console.error('[getStagesAction] ошибка:', error)
    return { error: 'Не удалось загрузить этапы' }
  }
})

// === Создать стандартные этапы для швейцарки + DE ===

export const createSwissStagesAction = adminGuard(async (seasonId: string) => {
  try {
    // Проверяем что сезон SWISS
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { format: true },
    })

    if (season?.format !== 'SWISS') {
      return { error: 'Этапы доступны только для швейцарской системы' }
    }

    // Проверяем что этапы ещё не созданы
    const existing = await prisma.stage.count({ where: { seasonId } })
    if (existing > 0) {
      return { error: 'Этапы уже созданы' }
    }

    await prisma.stage.createMany({
      data: [
        { seasonId, name: 'Групповой этап (швейцарка)', type: 'GROUP', order: 1 },
        { seasonId, name: 'Плей-офф — верхняя сетка', type: 'PLAYOFF_UPPER', order: 2 },
        { seasonId, name: 'Плей-офф — нижняя сетка', type: 'PLAYOFF_LOWER', order: 3 },
        { seasonId, name: 'Гранд-финал', type: 'GRAND_FINAL', order: 4 },
      ],
    })

    revalidatePath(`/admin/seasons/${seasonId}`)
    return { success: true }
  } catch (error) {
    console.error('[createSwissStagesAction] ошибка:', error)
    return { error: 'Не удалось создать этапы' }
  }
})

// === Прогресс текущего раунда швейцарки ===

export const getSwissProgressAction = adminGuard(async (seasonId: string) => {
  try {
    // Последний раунд
    const lastRound = await prisma.round.findFirst({
      where: { seasonId },
      orderBy: { number: 'desc' },
      select: { id: true, number: true, name: true },
    })
    if (!lastRound) return { data: null }

    // Матчи последнего раунда с командами
    const matches = await prisma.match.findMany({
      where: { tour: { roundId: lastRound.id } },
      select: { status: true, homeTeamId: true, awayTeamId: true },
    })

    // Все завершённые матчи ПРЕДЫДУЩИХ раундов (для подсчёта W-L до текущего тура)
    const prevMatches = await prisma.match.findMany({
      where: {
        tour: { round: { seasonId, number: { lt: lastRound.number } } },
        status: 'FINISHED',
      },
      select: { homeTeamId: true, awayTeamId: true, homePoints: true, awayPoints: true },
    })

    // Подсчёт W-L каждой команды до текущего тура
    const wlMap = new Map<string, { wins: number; losses: number }>()
    for (const m of prevMatches) {
      if (!wlMap.has(m.homeTeamId)) wlMap.set(m.homeTeamId, { wins: 0, losses: 0 })
      if (!wlMap.has(m.awayTeamId)) wlMap.set(m.awayTeamId, { wins: 0, losses: 0 })
      const home = wlMap.get(m.homeTeamId)!
      const away = wlMap.get(m.awayTeamId)!
      if (m.homePoints === 1) {
        home.wins++
        away.losses++
      } else {
        away.wins++
        home.losses++
      }
    }

    // Группируем матчи текущего раунда по W-L ячейкам
    const cellMap = new Map<string, { total: number; finished: number; live: number }>()
    for (const m of matches) {
      const rec = wlMap.get(m.homeTeamId) ?? { wins: 0, losses: 0 }
      const cellKey = `${rec.wins}-${rec.losses}`
      if (!cellMap.has(cellKey)) cellMap.set(cellKey, { total: 0, finished: 0, live: 0 })
      const cell = cellMap.get(cellKey)!
      cell.total++
      if (m.status === 'FINISHED') cell.finished++
      else if (m.status === 'LIVE') cell.live++
    }

    // Сортируем ячейки: сначала по победам (убывание), потом по поражениям
    const cells = [...cellMap.entries()]
      .map(([key, stats]) => ({ key, ...stats }))
      .sort((a, b) => {
        const [aw, al] = a.key.split('-').map(Number)
        const [bw, bl] = b.key.split('-').map(Number)
        return bw - aw || al - bl
      })

    const total = matches.length
    const finished = matches.filter((m) => m.status === 'FINISHED').length
    const live = matches.filter((m) => m.status === 'LIVE').length
    const scheduled = total - finished - live

    return {
      data: {
        roundNumber: lastRound.number,
        roundName: lastRound.name,
        totalMatches: total,
        finishedMatches: finished,
        liveMatches: live,
        scheduledMatches: scheduled,
        allFinished: total > 0 && finished === total,
        /** W-L ячейки сетки с прогрессом */
        cells,
      },
    }
  } catch (error) {
    console.error('[getSwissProgressAction] ошибка:', error)
    return { error: 'Не удалось загрузить прогресс' }
  }
})

// === Превью пар следующего раунда (без записи в БД) ===

export const previewSwissRoundAction = adminGuard(async (seasonId: string) => {
  try {
    const { teams, previousPairs, nextRoundNumber } = await _buildSwissContext(seasonId)

    const roundResult = generateSwissRound(teams, previousPairs)
    if (roundResult.pairs.length === 0) {
      return { error: 'Не удалось сгенерировать пары (возможно все сыграли друг с другом)' }
    }

    // Маппинг teamSeasonId → данные для отображения
    const teamMap = new Map(teams.map((t) => [t.teamSeasonId, t]))

    const pairs = roundResult.pairs.map((p) => ({
      home: teamMap.get(p.homeTeamSeasonId)!,
      away: teamMap.get(p.awayTeamSeasonId)!,
    }))
    const byes = roundResult.byes.map((id) => teamMap.get(id)!).filter(Boolean)

    return { data: { pairs, byes, roundNumber: nextRoundNumber } }
  } catch (error) {
    console.error('[previewSwissRoundAction] ошибка:', error)
    return { error: 'Не удалось сгенерировать превью' }
  }
})

/** Общая логика подготовки данных для швейцарки (переиспользуется в preview и generate) */
async function _buildSwissContext(seasonId: string) {
  const teamSeasons = await prisma.teamSeason.findMany({
    where: { seasonId },
    include: { team: { select: { name: true } } },
  })

  if (teamSeasons.length < 2) {
    throw new Error('Недостаточно команд для раунда')
  }

  const finishedMatches = await prisma.match.findMany({
    where: {
      tour: { round: { seasonId } },
      status: 'FINISHED',
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homePoints: true,
      awayPoints: true,
      homeScore: true,
      awayScore: true,
    },
  })

  const records = new Map<string, SwissTeamRecord>()
  for (const ts of teamSeasons) {
    records.set(ts.id, { teamSeasonId: ts.id, teamName: ts.team.name, wins: 0, losses: 0, totalScored: 0 })
  }

  for (const m of finishedMatches) {
    const home = records.get(m.homeTeamId)
    const away = records.get(m.awayTeamId)
    if (home) {
      home.totalScored += m.homeScore
      if (m.homePoints === 1) home.wins++
      else home.losses++
    }
    if (away) {
      away.totalScored += m.awayScore
      if (m.awayPoints === 1) away.wins++
      else away.losses++
    }
  }

  const previousPairs = new Set<string>()
  for (const m of finishedMatches) {
    previousPairs.add(makePairKey(m.homeTeamId, m.awayTeamId))
  }

  const lastRound = await prisma.round.findFirst({
    where: { seasonId },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  const nextRoundNumber = (lastRound?.number ?? 0) + 1

  return {
    teams: [...records.values()],
    previousPairs,
    nextRoundNumber,
    teamSeasons,
    finishedMatches,
  }
}

// === Сгенерировать следующий раунд швейцарки ===

interface GenerateSwissInput {
  seasonId: string
  /** Если передан — использовать эти пары вместо автогенерации */
  pairs?: Array<{ homeTeamSeasonId: string; awayTeamSeasonId: string }>
}

export const generateSwissRoundAction = adminGuard(async (input: string | GenerateSwissInput) => {
  // Обратная совместимость: принимаем и просто seasonId
  const { seasonId, pairs: explicitPairs } = typeof input === 'string' ? { seasonId: input, pairs: undefined } : input
  try {
    const ctx = await _buildSwissContext(seasonId)

    // Определяем пары: переданные явно или автосгенерированные
    let pairs: Array<{ homeTeamSeasonId: string; awayTeamSeasonId: string }>
    if (explicitPairs && explicitPairs.length > 0) {
      pairs = explicitPairs
    } else {
      const roundResult = generateSwissRound(ctx.teams, ctx.previousPairs)
      if (roundResult.pairs.length === 0) {
        return { error: 'Не удалось сгенерировать пары (возможно все сыграли друг с другом)' }
      }
      pairs = roundResult.pairs
    }

    // Получаем этап GROUP
    const groupStage = await prisma.stage.findFirst({
      where: { seasonId, type: 'GROUP' },
      select: { id: true },
    })

    // Создаём раунд
    const round = await prisma.round.create({
      data: {
        seasonId,
        stageId: groupStage?.id,
        name: `Тур ${ctx.nextRoundNumber}`,
        number: ctx.nextRoundNumber,
      },
    })

    // Создаём тур
    const tour = await prisma.tour.create({
      data: { roundId: round.id, number: 1 },
    })

    // Получаем лигу (первую доступную)
    const league = await prisma.league.findFirst({
      where: { seasonId },
      select: { id: true },
    })

    if (!league) {
      return { error: 'Нет лиги в сезоне. Создайте лигу.' }
    }

    // Создаём матчи
    for (const pair of pairs) {
      await prisma.match.create({
        data: {
          tourId: tour.id,
          leagueId: league.id,
          homeTeamId: pair.homeTeamSeasonId,
          awayTeamId: pair.awayTeamSeasonId,
        },
      })
    }

    revalidatePath(`/admin/seasons/${seasonId}`)
    revalidatePath('/admin/matches')

    return {
      success: true,
      data: {
        roundNumber: ctx.nextRoundNumber,
        pairsCount: pairs.length,
        byes: 0,
      },
    }
  } catch (error) {
    console.error('[generateSwissRoundAction] ошибка:', error)
    return { error: 'Не удалось сгенерировать раунд' }
  }
})

// === Сгенерировать сетку плей-офф ===

export const generatePlayoffBracketAction = adminGuard(async (seasonId: string) => {
  try {
    // Проверяем что нет существующих слотов
    const existingSlots = await prisma.bracketSlot.count({ where: { seasonId } })
    if (existingSlots > 0) {
      return { error: 'Сетка уже создана' }
    }

    // Получаем этапы
    const stages = await prisma.stage.findMany({
      where: { seasonId },
      select: { id: true, type: true },
    })

    const stageMap = new Map(stages.map((s) => [s.type, s.id]))

    if (!stageMap.has('PLAYOFF_UPPER') || !stageMap.has('PLAYOFF_LOWER') || !stageMap.has('GRAND_FINAL')) {
      return { error: 'Сначала создайте этапы (верхняя/нижняя сетка, гранд-финал)' }
    }

    // Генерируем определения слотов
    const slotDefs = generateDE16Bracket()

    // Создаём слоты в БД
    const stageTypeToId: Record<string, string> = {
      PLAYOFF_UPPER: stageMap.get('PLAYOFF_UPPER')!,
      PLAYOFF_LOWER: stageMap.get('PLAYOFF_LOWER')!,
      GRAND_FINAL: stageMap.get('GRAND_FINAL')!,
    }

    // Создаём слоты и запоминаем маппинг
    const slotMap = new Map<string, string>() // "PLAYOFF_UPPER:1:7" → id

    for (const def of slotDefs) {
      const slot = await prisma.bracketSlot.create({
        data: {
          seasonId,
          stageId: stageTypeToId[def.stageType],
          roundNumber: def.roundNumber,
          slotNumber: def.slotNumber,
          label: def.label,
        },
      })
      const key = `${def.stageType}:${def.roundNumber}:${def.slotNumber}`
      slotMap.set(key, slot.id)
    }

    // Резолвим source IDs и loserGoesTo
    for (const def of slotDefs) {
      const slotKey = `${def.stageType}:${def.roundNumber}:${def.slotNumber}`
      const slotId = slotMap.get(slotKey)!

      const updateData: Record<string, string | undefined> = {}

      // Резолвим source1 (откуда приходит команда 1)
      if (def.source1) {
        const sourceKey = def.source1.replace(':loser', '')
        const sourceId = slotMap.get(sourceKey)
        if (sourceId) updateData.sourceSlot1Id = sourceId
      }

      // Резолвим source2 (откуда приходит команда 2)
      if (def.source2) {
        const sourceKey = def.source2.replace(':loser', '')
        const sourceId = slotMap.get(sourceKey)
        if (sourceId) updateData.sourceSlot2Id = sourceId
      }

      // Резолвим loserGoesTo
      if (def.loserGoesTo) {
        const loserId = slotMap.get(def.loserGoesTo)
        if (loserId) updateData.loserGoesToId = loserId
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.bracketSlot.update({ where: { id: slotId }, data: updateData })
      }
    }

    revalidatePath(`/admin/seasons/${seasonId}`)
    return { success: true, data: { slotsCreated: slotDefs.length } }
  } catch (error) {
    console.error('[generatePlayoffBracketAction] ошибка:', error)
    return { error: 'Не удалось сгенерировать сетку плей-офф' }
  }
})

// === Получить сетку плей-офф ===

export const getBracketAction = adminGuard(async (seasonId: string) => {
  try {
    const slots = await prisma.bracketSlot.findMany({
      where: { seasonId },
      include: {
        stage: { select: { type: true, name: true } },
        teamSeason: { include: { team: { select: { name: true } } } },
        match: { select: { id: true, status: true, homeScore: true, awayScore: true } },
      },
      orderBy: [{ stage: { order: 'asc' } }, { roundNumber: 'asc' }, { slotNumber: 'asc' }],
    })

    return { data: slots }
  } catch (error) {
    console.error('[getBracketAction] ошибка:', error)
    return { error: 'Не удалось загрузить сетку' }
  }
})
