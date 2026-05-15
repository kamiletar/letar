/**
 * Швейцарская турнирная система.
 *
 * Правила:
 * 1. Команды группируются по количеству побед (одинаковый W-L)
 * 2. Внутри группы — случайное распределение по парам
 * 3. Команды не могут играть друг с другом дважды
 * 4. Если нечётное число в группе — один получает "bye" (проход без боя)
 * 5. После 5 раундов: 3 победы → верхняя сетка, 3 поражения → нижняя/выбывание
 */

/** Статистика команды в швейцарке */
export interface SwissTeamRecord {
  teamSeasonId: string
  teamName: string
  wins: number
  losses: number
  /** Суммарные баллы (для тай-брейков в группе) */
  totalScored: number
}

/** Пара для нового раунда */
export interface SwissPair {
  homeTeamSeasonId: string
  awayTeamSeasonId: string
}

/** Результат генерации раунда */
export interface SwissRoundResult {
  pairs: SwissPair[]
  /** Команды получившие "bye" (проход без боя) */
  byes: string[]
}

/**
 * Генерирует пары для следующего раунда швейцарки.
 *
 * @param teams — текущая статистика всех команд
 * @param previousPairs — все ранее сыгранные пары (для избежания повторов)
 */
export function generateSwissRound(teams: SwissTeamRecord[], previousPairs: Set<string>): SwissRoundResult {
  const result: SwissRoundResult = { pairs: [], byes: [] }

  // Группируем команды по W-L записи
  const groups = new Map<string, SwissTeamRecord[]>()
  for (const team of teams) {
    const key = `${team.wins}-${team.losses}`
    const group = groups.get(key) || []
    group.push(team)
    groups.set(key, group)
  }

  // Сортируем группы по убыванию побед
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const wA = Number.parseInt(a.split('-')[0])
    const wB = Number.parseInt(b.split('-')[0])
    return wB - wA
  })

  // Непарные команды, перетекающие в следующую группу
  const overflow: SwissTeamRecord[] = []

  for (const key of sortedKeys) {
    const group = [...(groups.get(key) || []), ...overflow.splice(0)]

    // Перемешиваем для случайности
    shuffleArray(group)

    // Если нечётное — один получает bye (с наименьшим totalScored)
    if (group.length % 2 !== 0) {
      // Сортируем по баллам, последний получает bye
      group.sort((a, b) => b.totalScored - a.totalScored)
      const byeTeam = group.pop()!
      result.byes.push(byeTeam.teamSeasonId)
    }

    // Формируем пары внутри группы
    const paired = pairWithinGroup(group, previousPairs)
    result.pairs.push(...paired.pairs)

    // Непарные перетекают в следующую группу
    overflow.push(...paired.unpaired)
  }

  return result
}

/** Формирует пары внутри группы, избегая повторов */
function pairWithinGroup(
  teams: SwissTeamRecord[],
  previousPairs: Set<string>
): { pairs: SwissPair[]; unpaired: SwissTeamRecord[] } {
  const pairs: SwissPair[] = []
  const used = new Set<string>()

  for (let i = 0; i < teams.length; i++) {
    if (used.has(teams[i].teamSeasonId)) {
      continue
    }

    for (let j = i + 1; j < teams.length; j++) {
      if (used.has(teams[j].teamSeasonId)) {
        continue
      }

      const pairKey = makePairKey(teams[i].teamSeasonId, teams[j].teamSeasonId)
      if (!previousPairs.has(pairKey)) {
        pairs.push({
          homeTeamSeasonId: teams[i].teamSeasonId,
          awayTeamSeasonId: teams[j].teamSeasonId,
        })
        used.add(teams[i].teamSeasonId)
        used.add(teams[j].teamSeasonId)
        break
      }
    }
  }

  // Непарные команды (не удалось найти пару без повтора)
  const unpaired = teams.filter((t) => !used.has(t.teamSeasonId))

  return { pairs, unpaired }
}

/** Создаёт ключ пары (порядок не важен) */
export function makePairKey(a: string, b: string): string {
  return [a, b].sort().join(':')
}

/** Перемешивание массива (Fisher-Yates) */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}
