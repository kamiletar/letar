/**
 * Чистые функции трансформации данных bracket для UI.
 *
 * transformSlotsToSections — группирует DB-слоты в секции/раунды/матчи
 * computeGridPositions — рассчитывает CSS Grid позиции для desktop
 * computeConnectors — определяет SVG-коннекторы между матчами
 */

import type {
  BracketMatch,
  BracketRound,
  BracketSection,
  BracketSectionType,
  ConnectorDef,
  MatchGridPosition,
  MatchStatus,
} from './types'

// === Типы входных данных (из Prisma include) ===

export interface BracketSlotRow {
  id: string
  roundNumber: number
  slotNumber: number
  label: string | null
  stage: { type: string; name: string }
  teamSeasonId: string | null
  teamSeason: {
    id: string
    team: { name: string; slug: string }
  } | null
  match: {
    id: string
    status: string
    homeScore: number | null
    awayScore: number | null
    homeTeamId: string | null
    awayTeamId: string | null
  } | null
  sourceSlot1Id: string | null
  sourceSlot2Id: string | null
  loserGoesToId: string | null
}

// === Название раундов ===

const UPPER_ROUND_NAMES: Record<number, string> = {
  1: 'WB R1',
  2: 'WB R2',
  3: 'WB SF',
  4: 'WB Final',
}

const LOWER_ROUND_NAMES: Record<number, string> = {
  1: 'LB R1',
  2: 'LB R2',
  3: 'LB R3',
  4: 'LB R4',
  5: 'LB QF',
  6: 'LB SF',
  7: 'LB Final',
}

const SECTION_LABELS: Record<string, string> = {
  PLAYOFF_UPPER: 'Верхняя сетка',
  PLAYOFF_LOWER: 'Нижняя сетка',
  GRAND_FINAL: 'Гранд-финал',
}

// === Трансформация слотов → секции ===

/**
 * Группирует плоский массив слотов из БД в структуру секций → раундов → матчей.
 *
 * В R1 (WB и LB) каждый слот — отдельный сид (не матч). Функция парит их (1+2, 3+4...)
 * в визуальные карточки матчей. Начиная с R2 каждый слот = 1 матч.
 */
export function transformSlotsToSections(slots: BracketSlotRow[]): BracketSection[] {
  // Группируем по stageType → roundNumber → слоты
  const byStage = new Map<string, Map<number, BracketSlotRow[]>>()

  for (const slot of slots) {
    const stageType = slot.stage.type
    if (!byStage.has(stageType)) {
      byStage.set(stageType, new Map())
    }
    const rounds = byStage.get(stageType)!
    if (!rounds.has(slot.roundNumber)) {
      rounds.set(slot.roundNumber, [])
    }
    rounds.get(slot.roundNumber)!.push(slot)
  }

  // Карта всех слотов по id (для loserGoesTo label)
  const slotMap = new Map(slots.map((s) => [s.id, s]))

  const sectionOrder: BracketSectionType[] = ['PLAYOFF_UPPER', 'PLAYOFF_LOWER', 'GRAND_FINAL']

  return sectionOrder
    .filter((type) => byStage.has(type))
    .map((type) => {
      const rounds = byStage.get(type)!
      const roundNames =
        type === 'PLAYOFF_UPPER'
          ? UPPER_ROUND_NAMES
          : type === 'PLAYOFF_LOWER'
            ? LOWER_ROUND_NAMES
            : { 1: 'Гранд-финал' }

      const bracketRounds: BracketRound[] = [...rounds.entries()]
        .sort(([a], [b]) => a - b)
        .map(([roundNum, roundSlots]) => ({
          number: roundNum,
          name: roundNames[roundNum] ?? `R${roundNum}`,
          matches: slotsToMatches(roundSlots, roundNum, type, slotMap),
        }))

      return {
        type,
        label: SECTION_LABELS[type] ?? type,
        rounds: bracketRounds,
      }
    })
}

/** Конвертирует слоты раунда в матчи. В R1 парит по 2 слота. */
function slotsToMatches(
  slots: BracketSlotRow[],
  roundNumber: number,
  stageType: string,
  slotMap: Map<string, BracketSlotRow>
): BracketMatch[] {
  const sorted = [...slots].sort((a, b) => a.slotNumber - b.slotNumber)

  // В R1 верхней и нижней сетки — слоты-сиды, парим по 2
  const isR1SeedRound = roundNumber === 1 && (stageType === 'PLAYOFF_UPPER' || stageType === 'PLAYOFF_LOWER')

  if (isR1SeedRound) {
    const matches: BracketMatch[] = []
    for (let i = 0; i < sorted.length; i += 2) {
      const slot1 = sorted[i]
      const slot2 = sorted[i + 1]
      // Берём match из первого слота (он привязан к матчу)
      const matchSlot = slot1?.match ? slot1 : slot2
      matches.push({
        slotId: slot1?.id ?? slot2?.id ?? '',
        label: slot1?.label ?? '',
        team1: slot1?.teamSeason
          ? { id: slot1.teamSeason.id, name: slot1.teamSeason.team.name, slug: slot1.teamSeason.team.slug }
          : null,
        team2: slot2?.teamSeason
          ? { id: slot2.teamSeason.id, name: slot2.teamSeason.team.name, slug: slot2.teamSeason.team.slug }
          : null,
        score1: matchSlot?.match?.homeScore ?? null,
        score2: matchSlot?.match?.awayScore ?? null,
        status: mapStatus(matchSlot?.match?.status),
        matchId: matchSlot?.match?.id ?? null,
        winnerId: null, // Вычислим ниже
        loserDropLabel: null,
      })
    }
    return matches
  }

  // Начиная с R2 — каждый слот = 1 матч
  return sorted.map((slot) => {
    const team1 = resolveTeam(slot, 'source1', slotMap)
    const team2 = resolveTeam(slot, 'source2', slotMap)

    // Определяем победителя
    let winnerId: string | null = null
    if (slot.match?.status === 'FINISHED' && slot.match.homeScore !== null && slot.match.awayScore !== null) {
      winnerId = slot.match.homeScore > slot.match.awayScore ? slot.match.homeTeamId : slot.match.awayTeamId
    }

    // Куда падает проигравший
    let loserDropLabel: string | null = null
    if (slot.loserGoesToId) {
      const target = slotMap.get(slot.loserGoesToId)
      if (target) {
        loserDropLabel = `→ ${target.label}`
      }
    }

    return {
      slotId: slot.id,
      label: slot.label ?? '',
      team1,
      team2,
      score1: slot.match?.homeScore ?? null,
      score2: slot.match?.awayScore ?? null,
      status: mapStatus(slot.match?.status),
      matchId: slot.match?.id ?? null,
      winnerId,
      loserDropLabel,
    }
  })
}

/** Извлекает команду из sourceSlot */
function resolveTeam(slot: BracketSlotRow, source: 'source1' | 'source2', slotMap: Map<string, BracketSlotRow>) {
  // Для слотов без source — берём teamSeason напрямую (начальные слоты с seed)
  const sourceId = source === 'source1' ? slot.sourceSlot1Id : slot.sourceSlot2Id

  if (!sourceId) {
    // Нет source — это может быть seed-слот или bye
    if (slot.teamSeason && source === 'source1') {
      return { id: slot.teamSeason.id, name: slot.teamSeason.team.name, slug: slot.teamSeason.team.slug }
    }
    return null
  }

  const sourceSlot = slotMap.get(sourceId)
  if (!sourceSlot?.teamSeason) {
    return null
  }

  return {
    id: sourceSlot.teamSeason.id,
    name: sourceSlot.teamSeason.team.name,
    slug: sourceSlot.teamSeason.team.slug,
  }
}

function mapStatus(status?: string | null): MatchStatus {
  switch (status) {
    case 'LIVE':
      return 'LIVE'
    case 'FINISHED':
      return 'FINISHED'
    case 'SCHEDULED':
      return 'SCHEDULED'
    case 'POSTPONED':
      return 'POSTPONED'
    default:
      return 'TBD'
  }
}

// === CSS Grid позиции для desktop ===

/**
 * Рассчитывает позиции карточек в CSS Grid для секции.
 * Возвращает Map<slotId, MatchGridPosition>.
 *
 * Upper Bracket: 4 столбца (R1, R2, SF, Final), 4 строки макс
 * Lower Bracket: 7 столбцов, сложная раскладка
 * Grand Final: 1 столбец, 1 строка
 */
export function computeGridPositions(section: BracketSection): Map<string, MatchGridPosition> {
  const positions = new Map<string, MatchGridPosition>()

  for (const round of section.rounds) {
    const col = round.number
    const matchCount = round.matches.length
    // Равномерное распределение матчей по строкам
    const totalRows = section.type === 'PLAYOFF_UPPER' ? 4 : section.type === 'PLAYOFF_LOWER' ? 4 : 1
    const rowSpan = Math.max(1, Math.floor(totalRows / matchCount))

    round.matches.forEach((match, idx) => {
      positions.set(match.slotId, {
        gridColumn: col,
        gridRow: idx * rowSpan + 1,
        gridRowSpan: rowSpan,
      })
    })
  }

  return positions
}

// === SVG коннекторы ===

/**
 * Определяет коннекторы между матчами внутри секции.
 * Берёт sourceSlot1Id/sourceSlot2Id из DB-данных.
 */
export function computeConnectors(section: BracketSection, slots: BracketSlotRow[]): ConnectorDef[] {
  const connectors: ConnectorDef[] = []

  // Собираем все slotId этой секции
  const sectionSlotIds = new Set<string>()
  for (const round of section.rounds) {
    for (const match of round.matches) {
      sectionSlotIds.add(match.slotId)
    }
  }

  // Для каждого слота R2+ создаём коннекторы от source слотов
  const sectionSlots = slots.filter((s) => s.stage.type === section.type)
  for (const slot of sectionSlots) {
    // Пропускаем R1 seed-слоты (они не матчи)
    if (slot.roundNumber === 1) {
      continue
    }

    if (slot.sourceSlot1Id && sectionSlotIds.has(slot.sourceSlot1Id)) {
      connectors.push({
        fromSlotId: slot.sourceSlot1Id,
        toSlotId: slot.id,
        type: 'winner',
      })
    }
    if (slot.sourceSlot2Id && sectionSlotIds.has(slot.sourceSlot2Id)) {
      connectors.push({
        fromSlotId: slot.sourceSlot2Id,
        toSlotId: slot.id,
        type: 'winner',
      })
    }
  }

  return connectors
}
