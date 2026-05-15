/**
 * Логика вычисления Swiss bracket из матчей.
 *
 * Швейцарская система с элиминацией (CS2 Major):
 * - 16 команд, 5 раундов
 * - 3 победы → плей-офф, 3 поражения → вылет
 * - Раунды определяются по количеству сыгранных матчей команды
 * - W-L группы определяются по записи обеих команд перед матчем
 */

// ----- Типы -----

/** Команда в Swiss bracket */
export interface SwissTeam {
  id: string
  name: string
  slug: string
}

/** Матч в Swiss bracket */
export interface SwissBracketMatch {
  matchId: string
  homeTeam: SwissTeam
  awayTeam: SwissTeam
  homeScore: number | null
  awayScore: number | null
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED'
  scheduledAt: string | null
  /** Победитель (teamSeason id) */
  winnerId: string | null
}

/** W-L группа внутри раунда */
export interface SwissBracketGroup {
  /** Ключ записи "2-0", "1-1", ... */
  wl: string
  wins: number
  losses: number
  matches: SwissBracketMatch[]
  /** Команды перешедшие в плей-офф (3 победы) */
  advancedTeams: SwissTeam[]
  /** Команды вылетевшие (3 поражения) */
  eliminatedTeams: SwissTeam[]
}

/** Раунд швейцарки */
export interface SwissBracketRound {
  number: number
  /** W-L группы в раунде (сортировка: больше побед сверху) */
  groups: SwissBracketGroup[]
}

/** Полные данные Swiss bracket */
export interface SwissBracketData {
  rounds: SwissBracketRound[]
  /** Все команды прошедшие в плей-офф */
  advanced: Array<SwissTeam & { wl: string; afterRound: number }>
  /** Все вылетевшие команды */
  eliminated: Array<SwissTeam & { wl: string; afterRound: number }>
  /** Общее количество команд */
  totalTeams: number
}

// ----- Сырые данные из БД -----

/** Матч из БД (минимальный набор полей) */
export interface SwissMatchRow {
  id: string
  status: string
  homeScore: number | null
  awayScore: number | null
  scheduledAt: Date | string | null
  homeTeam: {
    id: string
    team: { name: string; slug: string }
  } | null
  awayTeam: {
    id: string
    team: { name: string; slug: string }
  } | null
}

// ----- Основная логика -----

const WINS_TO_ADVANCE = 3
const LOSSES_TO_ELIMINATE = 3

/**
 * Строит Swiss bracket из списка матчей сезона.
 *
 * Алгоритм:
 * 1. Сортируем матчи по дате
 * 2. Для каждого матча определяем раунд = кол-во игр обеих команд + 1
 * 3. Группируем по раунду и W-L записи
 * 4. Определяем кто прошёл (3W) и кто вылетел (3L)
 */
export function buildSwissBracket(rawMatches: SwissMatchRow[]): SwissBracketData {
  // Фильтруем матчи без команд
  const validMatches = rawMatches.filter((m) => m.homeTeam && m.awayTeam)

  // Сортируем по дате (nulls последними)
  const sorted = [...validMatches].sort((a, b) => {
    const tA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
    const tB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
    return tA - tB
  })

  // Трекаем W-L каждой команды
  const records = new Map<string, { wins: number; losses: number }>()

  // Собираем все команды
  const teamMap = new Map<string, SwissTeam>()

  // Результат: раунд → W-L ключ → матчи
  const roundGroupMatches = new Map<number, Map<string, SwissBracketMatch[]>>()

  // Трекаем кто уже прошёл/вылетел и в каком раунде
  const advancedMap = new Map<string, { team: SwissTeam; wl: string; afterRound: number }>()
  const eliminatedMap = new Map<string, { team: SwissTeam; wl: string; afterRound: number }>()

  for (const raw of sorted) {
    const home = raw.homeTeam!
    const away = raw.awayTeam!

    const homeTeam: SwissTeam = { id: home.id, name: home.team.name, slug: home.team.slug }
    const awayTeam: SwissTeam = { id: away.id, name: away.team.name, slug: away.team.slug }
    teamMap.set(homeTeam.id, homeTeam)
    teamMap.set(awayTeam.id, awayTeam)

    const homeRec = records.get(homeTeam.id) ?? { wins: 0, losses: 0 }
    const awayRec = records.get(awayTeam.id) ?? { wins: 0, losses: 0 }

    // Раунд = max из сыгранных игр обеих команд + 1
    // (в корректной швейцарке обе команды должны быть в одном раунде)
    const homeGames = homeRec.wins + homeRec.losses
    const awayGames = awayRec.wins + awayRec.losses
    const roundNum = Math.max(homeGames, awayGames) + 1

    // W-L группа — по команде с большим кол-вом игр (или home если равны)
    const wlKey = homeGames >= awayGames ? `${homeRec.wins}-${homeRec.losses}` : `${awayRec.wins}-${awayRec.losses}`

    // Определяем победителя
    let winnerId: string | null = null
    if (raw.status === 'FINISHED' && raw.homeScore !== null && raw.awayScore !== null) {
      winnerId = raw.homeScore > raw.awayScore ? homeTeam.id : awayTeam.id
    }

    const bracketMatch: SwissBracketMatch = {
      matchId: raw.id,
      homeTeam,
      awayTeam,
      homeScore: raw.homeScore,
      awayScore: raw.awayScore,
      status: raw.status as SwissBracketMatch['status'],
      scheduledAt: raw.scheduledAt ? new Date(raw.scheduledAt).toISOString() : null,
      winnerId,
    }

    // Добавляем в группу
    if (!roundGroupMatches.has(roundNum)) {
      roundGroupMatches.set(roundNum, new Map())
    }
    const roundMap = roundGroupMatches.get(roundNum)!
    if (!roundMap.has(wlKey)) {
      roundMap.set(wlKey, [])
    }
    roundMap.get(wlKey)!.push(bracketMatch)

    // Обновляем записи если матч завершён
    if (raw.status === 'FINISHED' && raw.homeScore !== null && raw.awayScore !== null) {
      if (raw.homeScore > raw.awayScore) {
        homeRec.wins++
        awayRec.losses++
      } else {
        awayRec.wins++
        homeRec.losses++
      }
      records.set(homeTeam.id, homeRec)
      records.set(awayTeam.id, awayRec)

      // Проверяем прошёл/вылетел
      if (homeRec.wins >= WINS_TO_ADVANCE && !advancedMap.has(homeTeam.id)) {
        advancedMap.set(homeTeam.id, {
          team: homeTeam,
          wl: `${homeRec.wins}-${homeRec.losses}`,
          afterRound: roundNum,
        })
      }
      if (awayRec.wins >= WINS_TO_ADVANCE && !advancedMap.has(awayTeam.id)) {
        advancedMap.set(awayTeam.id, {
          team: awayTeam,
          wl: `${awayRec.wins}-${awayRec.losses}`,
          afterRound: roundNum,
        })
      }
      if (homeRec.losses >= LOSSES_TO_ELIMINATE && !eliminatedMap.has(homeTeam.id)) {
        eliminatedMap.set(homeTeam.id, {
          team: homeTeam,
          wl: `${homeRec.wins}-${homeRec.losses}`,
          afterRound: roundNum,
        })
      }
      if (awayRec.losses >= LOSSES_TO_ELIMINATE && !eliminatedMap.has(awayTeam.id)) {
        eliminatedMap.set(awayTeam.id, {
          team: awayTeam,
          wl: `${awayRec.wins}-${awayRec.losses}`,
          afterRound: roundNum,
        })
      }
    }
  }

  // Строим структуру раундов
  const rounds: SwissBracketRound[] = []

  const roundNumbers = [...roundGroupMatches.keys()].sort((a, b) => a - b)
  for (const roundNum of roundNumbers) {
    const groupMap = roundGroupMatches.get(roundNum)!
    const groups: SwissBracketGroup[] = []

    for (const [wlKey, matches] of groupMap) {
      const [wins, losses] = wlKey.split('-').map(Number)
      groups.push({
        wl: wlKey,
        wins,
        losses,
        matches,
        // Прошедшие/вылетевшие показываются ТОЛЬКО в терминальных узлах (SWISS_16_LAYOUT)
        advancedTeams: [],
        eliminatedTeams: [],
      })
    }

    // Сортируем группы: больше побед сверху
    groups.sort((a, b) => b.wins - a.wins || a.losses - b.losses)

    rounds.push({ number: roundNum, groups })
  }

  return {
    rounds,
    advanced: [...advancedMap.values()].map((e) => ({ ...e.team, wl: e.wl, afterRound: e.afterRound })),
    eliminated: [...eliminatedMap.values()].map((e) => ({ ...e.team, wl: e.wl, afterRound: e.afterRound })),
    totalTeams: teamMap.size,
  }
}

// ----- Позиционирование для Desktop Grid -----

/** Позиция узла в CSS Grid */
export interface SwissGridNode {
  wl: string
  round: number
  gridRow: number
  gridCol: number
  /** Тип: группа матчей, прошедшие, или вылетевшие */
  type: 'group' | 'advanced' | 'eliminated'
}

/** Коннектор между узлами */
export interface SwissConnector {
  fromWl: string
  toWl: string
  fromRound: number
  toRound: number
  /** Тип: победитель идёт вверх, проигравший вниз */
  outcome: 'winner' | 'loser'
}

/**
 * Фиксированная раскладка Swiss bracket 16 команд.
 *
 * Вертикальная ось: W-L от лучших (вверху) до худших (внизу).
 * Горизонтальная: раунды 1-5.
 */
export const SWISS_16_LAYOUT: SwissGridNode[] = [
  // Группы с матчами
  { wl: '0-0', round: 1, gridRow: 5, gridCol: 1, type: 'group' },
  { wl: '1-0', round: 2, gridRow: 3, gridCol: 2, type: 'group' },
  { wl: '0-1', round: 2, gridRow: 7, gridCol: 2, type: 'group' },
  { wl: '2-0', round: 3, gridRow: 2, gridCol: 3, type: 'group' },
  { wl: '1-1', round: 3, gridRow: 5, gridCol: 3, type: 'group' },
  { wl: '0-2', round: 3, gridRow: 8, gridCol: 3, type: 'group' },
  { wl: '2-1', round: 4, gridRow: 3, gridCol: 4, type: 'group' },
  { wl: '1-2', round: 4, gridRow: 7, gridCol: 4, type: 'group' },
  { wl: '2-2', round: 5, gridRow: 5, gridCol: 5, type: 'group' },
  // Терминальные — прошедшие
  { wl: '3-0', round: 3, gridRow: 1, gridCol: 3, type: 'advanced' },
  { wl: '3-1', round: 4, gridRow: 1, gridCol: 4, type: 'advanced' },
  { wl: '3-2', round: 5, gridRow: 3, gridCol: 5, type: 'advanced' },
  // Терминальные — вылетевшие
  { wl: '0-3', round: 3, gridRow: 9, gridCol: 3, type: 'eliminated' },
  { wl: '1-3', round: 4, gridRow: 9, gridCol: 4, type: 'eliminated' },
  { wl: '2-3', round: 5, gridRow: 7, gridCol: 5, type: 'eliminated' },
]

/** Коннекторы между W-L группами */
export const SWISS_16_CONNECTORS: SwissConnector[] = [
  // Раунд 1 → Раунд 2
  { fromWl: '0-0', toWl: '1-0', fromRound: 1, toRound: 2, outcome: 'winner' },
  { fromWl: '0-0', toWl: '0-1', fromRound: 1, toRound: 2, outcome: 'loser' },
  // Раунд 2 → Раунд 3
  { fromWl: '1-0', toWl: '2-0', fromRound: 2, toRound: 3, outcome: 'winner' },
  { fromWl: '1-0', toWl: '1-1', fromRound: 2, toRound: 3, outcome: 'loser' },
  { fromWl: '0-1', toWl: '1-1', fromRound: 2, toRound: 3, outcome: 'winner' },
  { fromWl: '0-1', toWl: '0-2', fromRound: 2, toRound: 3, outcome: 'loser' },
  // Раунд 3 → Раунд 4 (+ терминальные)
  { fromWl: '2-0', toWl: '3-0', fromRound: 3, toRound: 3, outcome: 'winner' },
  { fromWl: '2-0', toWl: '2-1', fromRound: 3, toRound: 4, outcome: 'loser' },
  { fromWl: '1-1', toWl: '2-1', fromRound: 3, toRound: 4, outcome: 'winner' },
  { fromWl: '1-1', toWl: '1-2', fromRound: 3, toRound: 4, outcome: 'loser' },
  { fromWl: '0-2', toWl: '1-2', fromRound: 3, toRound: 4, outcome: 'winner' },
  { fromWl: '0-2', toWl: '0-3', fromRound: 3, toRound: 3, outcome: 'loser' },
  // Раунд 4 → Раунд 5 (+ терминальные)
  { fromWl: '2-1', toWl: '3-1', fromRound: 4, toRound: 4, outcome: 'winner' },
  { fromWl: '2-1', toWl: '2-2', fromRound: 4, toRound: 5, outcome: 'loser' },
  { fromWl: '1-2', toWl: '2-2', fromRound: 4, toRound: 5, outcome: 'winner' },
  { fromWl: '1-2', toWl: '1-3', fromRound: 4, toRound: 4, outcome: 'loser' },
  // Раунд 5 → терминальные
  { fromWl: '2-2', toWl: '3-2', fromRound: 5, toRound: 5, outcome: 'winner' },
  { fromWl: '2-2', toWl: '2-3', fromRound: 5, toRound: 5, outcome: 'loser' },
]
