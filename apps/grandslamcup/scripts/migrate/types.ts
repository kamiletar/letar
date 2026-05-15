/** Сырые типы данных из Tilda */

/** Строка расписания */
export interface RawScheduleMatch {
  /** Номер тура */
  tour: number
  /** Лига: ВЛ или 1Л */
  league: 'ВЛ' | '1Л'
  /** Дата строкой, напр. "4.12" */
  date: string
  /** День недели, напр. "чт" */
  dayOfWeek: string
  /** Название стадиона */
  venue: string
  /** Домашняя команда */
  homeTeam: string
  /** Гостевая команда */
  awayTeam: string
  /** Счёт хозяев (баллы), если сыгран */
  homeScore: number | null
  /** Счёт гостей (баллы), если сыгран */
  awayScore: number | null
}

/** Строка перекрёстной таблицы */
export interface RawCrossTableRow {
  /** Название команды */
  team: string
  /** Результаты (1 = победа, 0 = поражение, дата = не сыграно) */
  results: (number | string)[]
  /** Забито-пропущено, напр. "1669-1606" */
  goals: string
  /** Разница очков */
  difference: number
  /** Итого очков */
  points: number
}

/** Перекрёстная таблица одной лиги */
export interface RawCrossTable {
  /** Лига (Высшая или Первая) */
  league: string
  /** Названия команд (заголовок) */
  teamNames: string[]
  /** Строки таблицы */
  rows: RawCrossTableRow[]
}

/** Команда с составом */
export interface RawTeam {
  /** Название */
  name: string
  /** Описание */
  description: string
  /** Стадион (бар) */
  venueName: string
  /** Имя тренера */
  coachName: string
  /** Состав */
  roster: RawRosterEntry[]
}

/** Игрок в составе */
export interface RawRosterEntry {
  /** Полное имя */
  name: string
  /** Роль: тренер, играющий тренер, или просто игрок */
  role: 'coach' | 'playing_coach' | 'player'
}

/** Матч из results (Сезон 1) */
export interface RawResultMatch {
  /** Дата, напр. "11.09.2024" */
  date: string
  /** Время, напр. "20-00" */
  time: string
  /** Стадион */
  venue: string
  /** Адрес (если есть) */
  address: string
  /** Домашняя команда */
  homeTeam: string
  /** Гостевая команда */
  awayTeam: string
  /** Результат: "1:0", "0:1", "1/2:1/2" */
  result: string
  /** Баллы, напр. "272-249" */
  score: string
}

/** Индивидуальный зачёт поэта */
export interface RawPoetPerformance {
  /** Дата матча, напр. "15.09.24" */
  date: string
  /** Тайм (1 или 2) */
  half: number
  /** Матч, напр. "Обормоты - Блины" */
  matchTeams: string
  /** Имя поэта */
  playerName: string
  /** Счёт поэта */
  playerScore: number
  /** Счёт оппонента */
  opponentScore: number
  /** Имя оппонента */
  opponentName: string
}

/** Полные данные поэта */
export interface RawPoet {
  /** Имя */
  name: string
  /** Команда (slug) */
  teamSlug: string
  /** Биография */
  bio: string
  /** Перформансы */
  performances: RawPoetPerformance[]
}
