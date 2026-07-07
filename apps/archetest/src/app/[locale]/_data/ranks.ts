/** Определение ранга */
export interface RankDef {
  code: string
  tier: string
  level: number
  label: string
  labelEn: string
  icon: string
  minXp: number
}

/** Все ранги (5 тиров × 3 уровня = 15 рангов) */
export const RANKS: RankDef[] = [
  { code: 'NOVICE_I', tier: 'NOVICE', level: 1, label: 'Новичок I', labelEn: 'Novice I', icon: '🌱', minXp: 0 },
  { code: 'NOVICE_II', tier: 'NOVICE', level: 2, label: 'Новичок II', labelEn: 'Novice II', icon: '🌱', minXp: 100 },
  { code: 'NOVICE_III', tier: 'NOVICE', level: 3, label: 'Новичок III', labelEn: 'Novice III', icon: '🌱', minXp: 250 },

  {
    code: 'EXPLORER_I',
    tier: 'EXPLORER',
    level: 1,
    label: 'Исследователь I',
    labelEn: 'Explorer I',
    icon: '🔭',
    minXp: 500,
  },
  {
    code: 'EXPLORER_II',
    tier: 'EXPLORER',
    level: 2,
    label: 'Исследователь II',
    labelEn: 'Explorer II',
    icon: '🔭',
    minXp: 750,
  },
  {
    code: 'EXPLORER_III',
    tier: 'EXPLORER',
    level: 3,
    label: 'Исследователь III',
    labelEn: 'Explorer III',
    icon: '🔭',
    minXp: 1100,
  },

  { code: 'EXPERT_I', tier: 'EXPERT', level: 1, label: 'Знаток I', labelEn: 'Expert I', icon: '📚', minXp: 1500 },
  { code: 'EXPERT_II', tier: 'EXPERT', level: 2, label: 'Знаток II', labelEn: 'Expert II', icon: '📚', minXp: 2000 },
  { code: 'EXPERT_III', tier: 'EXPERT', level: 3, label: 'Знаток III', labelEn: 'Expert III', icon: '📚', minXp: 3000 },

  { code: 'MASTER_I', tier: 'MASTER', level: 1, label: 'Мастер I', labelEn: 'Master I', icon: '🏅', minXp: 4000 },
  { code: 'MASTER_II', tier: 'MASTER', level: 2, label: 'Мастер II', labelEn: 'Master II', icon: '🏅', minXp: 5500 },
  { code: 'MASTER_III', tier: 'MASTER', level: 3, label: 'Мастер III', labelEn: 'Master III', icon: '🏅', minXp: 7500 },

  { code: 'GURU_I', tier: 'GURU', level: 1, label: 'Гуру I', labelEn: 'Guru I', icon: '👑', minXp: 10000 },
  { code: 'GURU_II', tier: 'GURU', level: 2, label: 'Гуру II', labelEn: 'Guru II', icon: '👑', minXp: 15000 },
  { code: 'GURU_III', tier: 'GURU', level: 3, label: 'Гуру III', labelEn: 'Guru III', icon: '👑', minXp: 25000 },
]

/** Быстрый поиск ранга по коду */
export const RANKS_MAP = new Map(RANKS.map((r) => [r.code, r]))

/** Определить ранг по XP */
export function getRankByXp(xp: number): RankDef {
  let rank = RANKS[0]
  for (const r of RANKS) {
    if (xp >= r.minXp) {
      rank = r
    } else {
      break
    }
  }
  return rank
}

/** Получить следующий ранг (или null если максимальный) */
export function getNextRank(currentCode: string): RankDef | null {
  const idx = RANKS.findIndex((r) => r.code === currentCode)
  if (idx === -1 || idx >= RANKS.length - 1) {
    return null
  }
  return RANKS[idx + 1]
}

/**
 * Число уникальных UTC-дней среди дат (этап 5.9.3, гибрид).
 * XP-гранула — сутки: сколько бы порций вопросов ни было пройдено за день,
 * в XP день входит один раз. Продолжать в тот же день можно свободно
 * (новые вопросы уточняют профиль), но XP-ферма порциями закрыта.
 */
export function countUniqueUtcDays(dates: Date[]): number {
  const days = new Set<string>()
  for (const d of dates) {
    days.add(d.toISOString().slice(0, 10))
  }
  return days.size
}

/**
 * Рассчитать XP по формуле (глубина самопознания — дни практики и достижения,
 * не объём ответов и не число порций). Этап 5.9.3: гранула — уникальный день
 * с валидной сессией, см. countUniqueUtcDays.
 */
export function calculateXp(uniqueDaysCount: number, achievementXpSum: number): number {
  return uniqueDaysCount * 100 + achievementXpSum
}
