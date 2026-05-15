/**
 * Типы для визуализации турнирной сетки (Double Elimination).
 */

/** Статус матча */
export type MatchStatus = 'TBD' | 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED'

/** Команда в карточке матча */
export interface BracketTeam {
  id: string
  name: string
  slug: string
  /** Сид (позиция посева), если есть */
  seed?: number
}

/** Матч для отображения в bracket */
export interface BracketMatch {
  /** ID слота в БД */
  slotId: string
  /** Подпись слота (WB R1 #1, LB SF, ...) */
  label: string
  /** Команда 1 (home) */
  team1: BracketTeam | null
  /** Команда 2 (away) */
  team2: BracketTeam | null
  /** Счёт команды 1 */
  score1: number | null
  /** Счёт команды 2 */
  score2: number | null
  /** Статус матча */
  status: MatchStatus
  /** ID матча (если создан) */
  matchId: string | null
  /** ID победителя (teamSeason), если матч завершён */
  winnerId: string | null
  /** Текст куда падает проигравший ("→ LB R4 #1") */
  loserDropLabel: string | null
}

/** Раунд — группа матчей одного раунда */
export interface BracketRound {
  /** Номер раунда */
  number: number
  /** Название раунда (R1, R2, SF, Final) */
  name: string
  /** Матчи в раунде */
  matches: BracketMatch[]
}

/** Секция сетки */
export type BracketSectionType = 'PLAYOFF_UPPER' | 'PLAYOFF_LOWER' | 'GRAND_FINAL'

/** Секция — верхняя/нижняя/гранд-финал */
export interface BracketSection {
  type: BracketSectionType
  label: string
  rounds: BracketRound[]
}

/** Позиция карточки матча в CSS Grid (desktop) */
export interface MatchGridPosition {
  gridColumn: number
  gridRow: number
  /** Сколько строк занимает (для вертикального выравнивания) */
  gridRowSpan: number
}

/** Определение SVG-коннектора между слотами */
export interface ConnectorDef {
  /** ID исходного слота */
  fromSlotId: string
  /** ID целевого слота */
  toSlotId: string
  /** Тип: победитель идёт дальше или проигравший падает */
  type: 'winner' | 'loser-drop'
}

/** Пропсы верхнего компонента TournamentBracket */
export interface TournamentBracketProps {
  sections: BracketSection[]
  /** Заголовок (имя сезона) */
  title?: string
  /** Показывать ли заголовки секций */
  showSectionHeaders?: boolean
}
