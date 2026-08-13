export interface DateRangeValue {
  start: string
  end: string
}

export type DateRangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear'

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  thisWeek: 'Эта неделя',
  lastWeek: 'Прошлая неделя',
  thisMonth: 'Этот месяц',
  lastMonth: 'Прошлый месяц',
  thisYear: 'Этот год',
}

export function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function getPresetRange(preset: DateRangePreset): DateRangeValue {
  const today = new Date()

  switch (preset) {
    case 'today':
      return { start: formatDate(today), end: formatDate(today) }
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      return { start: formatDate(yesterday), end: formatDate(yesterday) }
    }
    case 'thisWeek': {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay() + 1)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'lastWeek': {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay() - 6)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'thisYear': {
      const start = new Date(today.getFullYear(), 0, 1)
      const end = new Date(today.getFullYear(), 11, 31)
      return { start: formatDate(start), end: formatDate(end) }
    }
  }
}
