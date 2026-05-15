/** Категория достижения */
export type AchievementCategory = 'sessions' | 'answers' | 'results' | 'special'

/** Определение достижения */
export interface AchievementDef {
  code: string
  category: AchievementCategory
  icon: string
  label: string
  labelEn: string
  description: string
  descriptionEn: string
  xpReward: number
}

/** Все достижения квиза */
export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Прохождения ---
  {
    code: 'FIRST_QUIZ',
    category: 'sessions',
    icon: '🎯',
    label: 'Первый шаг',
    labelEn: 'First Step',
    description: 'Завершите свою первую сессию квиза',
    descriptionEn: 'Complete your first quiz session',
    xpReward: 50,
  },
  {
    code: 'SESSIONS_3',
    category: 'sessions',
    icon: '🔄',
    label: 'Постоянный клиент',
    labelEn: 'Regular',
    description: 'Пройдите квиз 3 раза',
    descriptionEn: 'Complete the quiz 3 times',
    xpReward: 100,
  },
  {
    code: 'SESSIONS_5',
    category: 'sessions',
    icon: '🔍',
    label: 'Исследователь глубин',
    labelEn: 'Deep Explorer',
    description: 'Пройдите квиз 5 раз',
    descriptionEn: 'Complete the quiz 5 times',
    xpReward: 150,
  },
  {
    code: 'SESSIONS_10',
    category: 'sessions',
    icon: '💎',
    label: 'Фанат самопознания',
    labelEn: 'Self-Discovery Fan',
    description: 'Пройдите квиз 10 раз',
    descriptionEn: 'Complete the quiz 10 times',
    xpReward: 300,
  },
  {
    code: 'SESSIONS_25',
    category: 'sessions',
    icon: '🧘',
    label: 'Мастер рефлексии',
    labelEn: 'Reflection Master',
    description: 'Пройдите квиз 25 раз',
    descriptionEn: 'Complete the quiz 25 times',
    xpReward: 500,
  },

  // --- Ответы ---
  {
    code: 'FULL_QUIZ',
    category: 'answers',
    icon: '✅',
    label: 'Перфекционист',
    labelEn: 'Perfectionist',
    description: 'Ответьте на все 50 вопросов',
    descriptionEn: 'Answer all 50 questions',
    xpReward: 100,
  },
  {
    code: 'SPEED_DEMON',
    category: 'answers',
    icon: '⚡',
    label: 'Молниеносный',
    labelEn: 'Speed Demon',
    description: 'Завершите квиз менее чем за 5 минут',
    descriptionEn: 'Complete the quiz in under 5 minutes',
    xpReward: 75,
  },
  {
    code: 'TOTAL_500',
    category: 'answers',
    icon: '📊',
    label: 'Пятисотка',
    labelEn: 'Five Hundred',
    description: 'Дайте 500 ответов суммарно',
    descriptionEn: 'Give 500 total answers',
    xpReward: 200,
  },
  {
    code: 'TOTAL_1000',
    category: 'answers',
    icon: '🏆',
    label: 'Тысячник',
    labelEn: 'One Thousand',
    description: 'Дайте 1000 ответов суммарно',
    descriptionEn: 'Give 1000 total answers',
    xpReward: 400,
  },

  // --- Результаты ---
  {
    code: 'DOMINANT_80',
    category: 'results',
    icon: '🔥',
    label: 'Ярко выраженный',
    labelEn: 'Dominant Type',
    description: 'Один тип набрал ≥ 80%',
    descriptionEn: 'One type scored ≥ 80%',
    xpReward: 100,
  },
  {
    code: 'BALANCED',
    category: 'results',
    icon: '⚖️',
    label: 'Гармония',
    labelEn: 'Harmony',
    description: 'Все типы в диапазоне 20–60%',
    descriptionEn: 'All types between 20–60%',
    xpReward: 150,
  },
  {
    code: 'TYPE_SHIFT',
    category: 'results',
    icon: '🦋',
    label: 'Метаморфоза',
    labelEn: 'Metamorphosis',
    description: 'Ваш ведущий тип сменился',
    descriptionEn: 'Your dominant type has changed',
    xpReward: 100,
  },
  {
    code: 'STABLE_PROFILE',
    category: 'results',
    icon: '🪨',
    label: 'Стабильность',
    labelEn: 'Stability',
    description: 'Топ-3 типа совпали в 3+ сессиях',
    descriptionEn: 'Top-3 types matched across 3+ sessions',
    xpReward: 200,
  },

  // --- Особые ---
  {
    code: 'NIGHT_OWL',
    category: 'special',
    icon: '🦉',
    label: 'Сова',
    labelEn: 'Night Owl',
    description: 'Пройдите тест с 00:00 до 05:00',
    descriptionEn: 'Take the test between midnight and 5 AM',
    xpReward: 50,
  },
  {
    code: 'EARLY_BIRD',
    category: 'special',
    icon: '🐦',
    label: 'Жаворонок',
    labelEn: 'Early Bird',
    description: 'Пройдите тест с 05:00 до 07:00',
    descriptionEn: 'Take the test between 5 AM and 7 AM',
    xpReward: 50,
  },
]

/** Быстрый поиск достижения по коду */
export const ACHIEVEMENTS_MAP = new Map(ACHIEVEMENTS.map((a) => [a.code, a]))

/** Все коды достижений */
export const ACHIEVEMENT_CODES = ACHIEVEMENTS.map((a) => a.code)

/** Все категории достижений */
export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = ['sessions', 'answers', 'results', 'special']
