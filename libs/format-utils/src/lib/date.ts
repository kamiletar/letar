/**
 * Утилиты для форматирования дат и времени
 */

/**
 * Форматирует дату в формат "01.12.2025"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return 'N/A'
  }
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Форматирует время в формат "14:30:00"
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) {
    return 'N/A'
  }
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Форматирует дату и время в формат "01.12.2025 14:30"
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) {
    return 'N/A'
  }
  const d = new Date(date)
  return `${formatDate(d)} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * Форматирует дату в короткий формат "01.12.25"
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) {
    return 'N/A'
  }
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/**
 * Форматирует дату в длинный формат "1 декабря 2025"
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) {
    return 'N/A'
  }
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Форматирует время для сообщений в чатах (сегодня/вчера/дата)
 */
export function formatMessageTime(date: Date): string {
  const now = new Date()
  const messageDate = new Date(date)

  const isToday = messageDate.getDate() === now.getDate()
    && messageDate.getMonth() === now.getMonth()
    && messageDate.getFullYear() === now.getFullYear()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = messageDate.getDate() === yesterday.getDate()
    && messageDate.getMonth() === yesterday.getMonth()
    && messageDate.getFullYear() === yesterday.getFullYear()

  if (isToday) {
    return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  if (isYesterday) {
    return 'Вчера'
  }

  return messageDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Форматирует дату для разделителя сообщений
 */
export function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()

  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear()

  if (isToday) {
    return 'Сегодня'
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.getDate() === yesterday.getDate()
    && date.getMonth() === yesterday.getMonth()
    && date.getFullYear() === yesterday.getFullYear()

  if (isYesterday) {
    return 'Вчера'
  }

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ============================================================================
// ДЛИТЕЛЬНОСТЬ И СТАЖ
// ============================================================================

/**
 * Форматирует длительность в часы и минуты
 * @param minutes Количество минут
 * @returns Строка вида "1 ч 30 мин", "45 мин" или "2 ч"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} мин`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} ч`
  }
  return `${hours} ч ${mins} мин`
}

/**
 * Вычисляет количество полных лет между датой и сегодняшним днём
 * @param startDate Дата начала
 * @returns Количество полных лет или null если дата не указана
 */
export function calculateYearsFromDate(startDate: Date | null | undefined): number | null {
  if (!startDate) {
    return null
  }

  const start = new Date(startDate)
  const today = new Date()

  let years = today.getFullYear() - start.getFullYear()
  const monthDiff = today.getMonth() - start.getMonth()

  // Если день рождения стажа ещё не наступил в этом году
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < start.getDate())) {
    years--
  }

  return Math.max(0, years)
}

/**
 * Форматирует стаж/опыт в читаемую строку с правильным склонением
 * @param startDate Дата начала деятельности
 * @returns Строка вида "5 лет", "1 год", "3 года", "Менее года" или null
 */
export function formatExperience(startDate: Date | null | undefined): string | null {
  const years = calculateYearsFromDate(startDate)

  if (years === null) {
    return null
  }

  if (years === 0) {
    return 'Менее года'
  }

  // Склонение слова "год"
  const lastDigit = years % 10
  const lastTwoDigits = years % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return `${years} лет`
  }

  if (lastDigit === 1) {
    return `${years} год`
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${years} года`
  }

  return `${years} лет`
}
