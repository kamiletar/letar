/**
 * Форматирует байты в человекочитаемую строку
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) {
    return '0 B'
  }

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// =============================================================================
// Форматирование дат
// =============================================================================

/**
 * Форматирует дату и время в русской локали
 * @example formatDateTime('2024-01-15T10:30:00Z') // '15.01.2024, 13:30'
 */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) {
    return '—'
  }
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return d.toLocaleString('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * Форматирует только дату в русской локали
 * @example formatDateOnly('2024-01-15') // '15.01.2024'
 */
export function formatDateOnly(date: Date | string | number | null | undefined): string {
  if (!date) {
    return '—'
  }
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return d.toLocaleDateString('ru-RU', {
    dateStyle: 'short',
  })
}

/**
 * Форматирует только время в русской локали
 * @example formatTimeOnly('2024-01-15T10:30:00Z') // '13:30'
 */
export function formatTimeOnly(date: Date | string | number | null | undefined): string {
  if (!date) {
    return '—'
  }
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return d.toLocaleTimeString('ru-RU', {
    timeStyle: 'short',
  })
}

/**
 * Форматирует дату последнего деплоя (с fallback 'Никогда')
 * @example formatLastDeployed(null) // 'Никогда'
 * @example formatLastDeployed('2024-01-15T10:30:00Z') // '15.01.2024, 13:30'
 */
export function formatLastDeployed(date: Date | string | null | undefined): string {
  if (!date) {
    return 'Никогда'
  }
  return formatDateTime(date)
}

/**
 * Форматирует дату для отображения в карточках (день + месяц)
 * @example formatShortDate('2024-01-15') // '15 янв.'
 */
export function formatShortDate(date: Date | string | number | null | undefined): string {
  if (!date) {
    return '—'
  }
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

// =============================================================================
// Форматирование для Docker/контейнеров
// =============================================================================

/**
 * Форматирует Unix timestamp в компактную дату (DD.MM.YY)
 * @example formatTimestamp(1705310400) // '15.01.24'
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/**
 * Форматирует Unix timestamp в относительное время
 * @example formatRelativeTime(1705310400) // '5 дней назад'
 */
export function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = Date.now()
  const diff = now - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return 'Сегодня'
  }
  if (days === 1) {
    return 'Вчера'
  }
  if (days < 30) {
    return `${days} ${pluralize(days, 'день', 'дня', 'дней')} назад`
  }
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `${months} ${pluralize(months, 'месяц', 'месяца', 'месяцев')} назад`
  }
  const years = Math.floor(days / 365)
  return `${years} ${pluralize(years, 'год', 'года', 'лет')} назад`
}

/**
 * Русское склонение числительных
 */
function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 19) {
    return many
  }
  if (mod10 === 1) {
    return one
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return few
  }
  return many
}

// =============================================================================
// Форматирование длительности
// =============================================================================

/**
 * Форматирует длительность из startTime в "Xм Yс"
 * @example formatDuration('2024-01-15T10:30:00Z') // '2м 35с'
 */
export function formatDuration(startTime: string | Date | null | undefined): string {
  if (!startTime) {
    return '0с'
  }

  const start = typeof startTime === 'string' ? new Date(startTime).getTime() : startTime.getTime()
  const now = Date.now()
  const duration = Math.floor((now - start) / 1000)

  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60

  if (minutes > 0) {
    return `${minutes}м ${seconds}с`
  }
  return `${seconds}с`
}

/**
 * Форматирует длительность из секунд в "Xм Yс"
 * @example formatDurationSeconds(155) // '2м 35с'
 */
export function formatDurationSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (minutes > 0) {
    return `${minutes}м ${secs}с`
  }
  return `${secs}с`
}

// =============================================================================
// Цвета и тексты состояний контейнеров
// =============================================================================

type ContainerState =
  | 'running'
  | 'exited'
  | 'paused'
  | 'restarting'
  | 'starting'
  | 'stopping'
  | 'removing'
  | 'created'
  | 'dead'
  | string

/**
 * Возвращает цвет для состояния контейнера
 * @example getContainerStateColor('running') // 'green'
 */
export function getContainerStateColor(state: ContainerState): string {
  switch (state) {
    case 'running':
      return 'green'
    case 'exited':
    case 'dead':
      return 'red'
    case 'paused':
      return 'yellow'
    case 'restarting':
    case 'starting':
    case 'created':
      return 'blue'
    case 'stopping':
    case 'removing':
      return 'orange'
    default:
      return 'gray'
  }
}

/**
 * Возвращает отображаемый текст для состояния контейнера
 * @example getContainerStateText('starting') // 'Starting...'
 */
export function getContainerStateText(state: ContainerState): string {
  switch (state) {
    case 'starting':
      return 'Starting...'
    case 'stopping':
      return 'Stopping...'
    case 'restarting':
      return 'Restarting...'
    case 'removing':
      return 'Removing...'
    default:
      return state
  }
}
