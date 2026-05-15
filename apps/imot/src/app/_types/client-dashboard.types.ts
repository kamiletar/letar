/**
 * ТИПЫ ДЛЯ СТАТИСТИКИ ДАШБОРДА КЛИЕНТА
 */
export interface ClientDashboardStats {
  // Статистика по сессиям
  sessions: {
    total: number
    completed: number
    upcoming: number
    nextSession: {
      id: string
      date: Date
      duration: number
      notes: string | null
    } | null
  }

  // Активный план трансформации
  activePlan: {
    id: string
    title: string
    currentStage: string
    startDate: Date | null
    targetDate: Date | null
    progress: number // 0-100%
  } | null

  // Статистика по практикам
  practices: {
    total: number
    completed: number
    active: number
    completionRate: number // 0-100%
  }

  // Статистика по результатам
  results: {
    total: number
    recentCount: number // за последние 30 дней
    byLevel: {
      numerology: number
      neuroPsych: number
      energy: number
      body: number
      style: number
    }
  }

  // Прогресс по каждому уровню (последние измерения)
  levelProgress: {
    level: string
    metric: string
    currentValue: number
    previousValue: number | null
    change: number // разница в процентах
    trend: 'up' | 'down' | 'stable'
    measuredAt: Date
  }[]
}

/**
 * ТИПЫ ДЛЯ ГРАФИКА ПРОГРЕССА ПО ВРЕМЕНИ
 */
export interface LevelProgressHistory {
  level: string
  metric: string
  data: {
    date: Date
    value: number
  }[]
}
