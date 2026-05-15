/**
 * iCal Generator — генерация iCalendar (RFC 5545) файлов
 *
 * Создаёт .ics файлы для подписки в любых календарных приложениях:
 * - Google Calendar
 * - Apple Calendar
 * - Яндекс Календарь
 * - Microsoft Outlook
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5545
 */

import type { Absence, ExamSession, Lesson, TheoryLesson } from '@letar/driving-school-db/prisma'

/** Типы событий для календаря */
export type CalendarEventType = 'LESSON' | 'EXAM' | 'THEORY_LESSON' | 'ABSENCE'

/** Базовое событие для iCal */
export interface ICalEvent {
  uid: string
  type: CalendarEventType
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  isAllDay?: boolean
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
  organizer?: {
    name: string
    email: string
  }
  attendees?: Array<{
    name: string
    email: string
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT'
  }>
  url?: string
  lastModified?: Date
}

/** Опции генерации iCal */
export interface ICalGeneratorOptions {
  /** Название календаря */
  calendarName: string
  /** Описание календаря */
  calendarDescription?: string
  /** Временная зона */
  timezone?: string
  /** URL для обновления */
  refreshUrl?: string
  /** Интервал обновления в минутах */
  refreshInterval?: number
}

/**
 * Генератор iCalendar файлов
 */
export class ICalGenerator {
  private events: ICalEvent[] = []
  private options: Required<ICalGeneratorOptions>

  constructor(options: ICalGeneratorOptions) {
    this.options = {
      calendarName: options.calendarName,
      calendarDescription: options.calendarDescription || '',
      timezone: options.timezone || 'Europe/Moscow',
      refreshUrl: options.refreshUrl || '',
      refreshInterval: options.refreshInterval || 60, // 1 час по умолчанию
    }
  }

  /**
   * Добавить событие
   */
  addEvent(event: ICalEvent): this {
    this.events.push(event)
    return this
  }

  /**
   * Добавить несколько событий
   */
  addEvents(events: ICalEvent[]): this {
    this.events.push(...events)
    return this
  }

  /**
   * Конвертировать занятие в iCal событие
   */
  static lessonToEvent(
    lesson: Lesson & {
      slot: { startTime: Date; endTime: Date }
      student: { name: string | null; email: string }
      instructor: { name: string | null; email: string }
      lessonType?: { name: string } | null
    },
    viewerRole: 'student' | 'instructor'
  ): ICalEvent {
    const isStudent = viewerRole === 'student'
    const otherParty = isStudent ? lesson.instructor : lesson.student

    // Название события зависит от роли
    let title: string
    if (lesson.lessonType?.name) {
      title = `${lesson.lessonType.name} — ${otherParty.name || 'Без имени'}`
    } else {
      title = isStudent ? `Занятие с ${otherParty.name || 'инструктором'}` : `Занятие: ${otherParty.name || 'ученик'}`
    }

    // Статус события
    let status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED' = 'CONFIRMED'
    if (lesson.status === 'CANCELLED') {
      status = 'CANCELLED'
    } else if (lesson.status === 'PENDING') {
      status = 'TENTATIVE'
    }

    return {
      uid: `lesson-${lesson.id}@driving-school.app`,
      type: 'LESSON',
      title,
      description: lesson.instructorNotes || undefined,
      startTime: lesson.slot.startTime,
      endTime: lesson.slot.endTime,
      status,
      organizer: {
        name: lesson.instructor.name || 'Инструктор',
        email: lesson.instructor.email,
      },
      attendees: [
        {
          name: lesson.student.name || 'Ученик',
          email: lesson.student.email,
          role: 'REQ-PARTICIPANT',
        },
      ],
      lastModified: lesson.updatedAt,
    }
  }

  /**
   * Конвертировать отсутствие в iCal событие
   */
  static absenceToEvent(absence: Absence, instructorName: string): ICalEvent {
    const typeLabels: Record<string, string> = {
      VACATION: 'Отпуск',
      SICK_LEAVE: 'Больничный',
      PERSONAL: 'Личные дела',
      OTHER: 'Недоступен',
    }

    return {
      uid: `absence-${absence.id}@driving-school.app`,
      type: 'ABSENCE',
      title: `${typeLabels[absence.type] || 'Недоступен'}: ${instructorName}`,
      description: absence.reason || undefined,
      startTime: absence.startDate,
      endTime: absence.endDate || new Date(absence.startDate.getTime() + 24 * 60 * 60 * 1000),
      isAllDay: true,
      status: 'CONFIRMED',
    }
  }

  /**
   * Конвертировать теоретическое занятие в iCal событие
   */
  static theoryLessonToEvent(
    theoryLesson: TheoryLesson & {
      topic?: { name: string } | null
      instructor: { name: string | null; email: string } | null
      group: { name: string }
    }
  ): ICalEvent {
    // Вычисляем endTime из scheduledAt + duration (минуты)
    const endTime = new Date(theoryLesson.scheduledAt.getTime() + theoryLesson.duration * 60 * 1000)

    return {
      uid: `theory-${theoryLesson.id}@driving-school.app`,
      type: 'THEORY_LESSON',
      title: theoryLesson.topic?.name || `Теория: ${theoryLesson.group.name}`,
      description: undefined,
      location: theoryLesson.location || undefined,
      startTime: theoryLesson.scheduledAt,
      endTime,
      status: theoryLesson.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED',
      organizer: theoryLesson.instructor
        ? {
            name: theoryLesson.instructor.name || 'Преподаватель',
            email: theoryLesson.instructor.email,
          }
        : undefined,
    }
  }

  /**
   * Конвертировать экзамен в iCal событие
   *
   * @param exam - Сессия экзамена
   * @param examTypeName - Название типа экзамена (например "Теоретический", "Практический")
   */
  static examToEvent(exam: ExamSession, examTypeName: string): ICalEvent {
    // Дефолтная длительность экзамена — 60 минут
    const durationMs = 60 * 60 * 1000

    return {
      uid: `exam-${exam.id}@driving-school.app`,
      type: 'EXAM',
      title: `Экзамен: ${examTypeName}`,
      description: undefined,
      location: exam.location || undefined,
      startTime: exam.scheduledAt,
      endTime: new Date(exam.scheduledAt.getTime() + durationMs),
      status: exam.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED',
    }
  }

  /**
   * Форматировать дату в iCal формат (UTC)
   */
  private formatDate(date: Date, isAllDay = false): string {
    if (isAllDay) {
      // VALUE=DATE формат: YYYYMMDD
      return date.toISOString().slice(0, 10).replace(/-/g, '')
    }
    // DATETIME формат: YYYYMMDDTHHMMSSZ
    return date.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  }

  /**
   * Экранировать текст для iCal
   */
  private escapeText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
  }

  /**
   * Разбить длинную строку на части (RFC 5545: max 75 octets per line)
   */
  private foldLine(line: string): string {
    const maxLen = 75
    if (line.length <= maxLen) {
      return line
    }

    const result: string[] = []
    let remaining = line

    while (remaining.length > maxLen) {
      // Первая строка — полная длина, остальные — с пробелом в начале
      const cutAt = result.length === 0 ? maxLen : maxLen - 1
      result.push(remaining.slice(0, cutAt))
      remaining = ' ' + remaining.slice(cutAt)
    }
    if (remaining.length > 1) {
      result.push(remaining)
    }

    return result.join('\r\n')
  }

  /**
   * Сгенерировать iCal строку для события
   */
  private generateEvent(event: ICalEvent): string {
    const lines: string[] = []

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.uid}`)
    lines.push(`DTSTAMP:${this.formatDate(new Date())}`)

    if (event.isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${this.formatDate(event.startTime, true)}`)
      lines.push(`DTEND;VALUE=DATE:${this.formatDate(event.endTime, true)}`)
    } else {
      lines.push(`DTSTART:${this.formatDate(event.startTime)}`)
      lines.push(`DTEND:${this.formatDate(event.endTime)}`)
    }

    lines.push(`SUMMARY:${this.escapeText(event.title)}`)

    if (event.description) {
      lines.push(`DESCRIPTION:${this.escapeText(event.description)}`)
    }

    if (event.location) {
      lines.push(`LOCATION:${this.escapeText(event.location)}`)
    }

    if (event.status) {
      lines.push(`STATUS:${event.status}`)
    }

    if (event.organizer) {
      lines.push(`ORGANIZER;CN=${this.escapeText(event.organizer.name)}:mailto:${event.organizer.email}`)
    }

    if (event.attendees) {
      for (const attendee of event.attendees) {
        const role = attendee.role || 'REQ-PARTICIPANT'
        lines.push(`ATTENDEE;ROLE=${role};CN=${this.escapeText(attendee.name)}:mailto:${attendee.email}`)
      }
    }

    if (event.url) {
      lines.push(`URL:${event.url}`)
    }

    if (event.lastModified) {
      lines.push(`LAST-MODIFIED:${this.formatDate(event.lastModified)}`)
    }

    // Категория по типу события
    const categories: Record<CalendarEventType, string> = {
      LESSON: 'Занятие',
      EXAM: 'Экзамен',
      THEORY_LESSON: 'Теория',
      ABSENCE: 'Отсутствие',
    }
    lines.push(`CATEGORIES:${categories[event.type]}`)

    lines.push('END:VEVENT')

    return lines.map((line) => this.foldLine(line)).join('\r\n')
  }

  /**
   * Сгенерировать полный iCalendar файл
   */
  generate(): string {
    const lines: string[] = []

    // Заголовок календаря
    lines.push('BEGIN:VCALENDAR')
    lines.push('VERSION:2.0')
    lines.push('PRODID:-//Driving School//Calendar//RU')
    lines.push('CALSCALE:GREGORIAN')
    lines.push('METHOD:PUBLISH')
    lines.push(`X-WR-CALNAME:${this.escapeText(this.options.calendarName)}`)

    if (this.options.calendarDescription) {
      lines.push(`X-WR-CALDESC:${this.escapeText(this.options.calendarDescription)}`)
    }

    lines.push(`X-WR-TIMEZONE:${this.options.timezone}`)

    // Интервал обновления (для совместимости с разными клиентами)
    if (this.options.refreshUrl) {
      lines.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${this.options.refreshInterval}M`)
      lines.push(`X-PUBLISHED-TTL:PT${this.options.refreshInterval}M`)
    }

    // Определение временной зоны (Europe/Moscow)
    lines.push('BEGIN:VTIMEZONE')
    lines.push('TZID:Europe/Moscow')
    lines.push('BEGIN:STANDARD')
    lines.push('DTSTART:19700101T000000')
    lines.push('TZOFFSETFROM:+0300')
    lines.push('TZOFFSETTO:+0300')
    lines.push('TZNAME:MSK')
    lines.push('END:STANDARD')
    lines.push('END:VTIMEZONE')

    // События
    for (const event of this.events) {
      lines.push(this.generateEvent(event))
    }

    lines.push('END:VCALENDAR')

    // Объединяем с CRLF (RFC 5545 требует)
    return lines.join('\r\n')
  }

  /**
   * Сгенерировать как Buffer для HTTP response
   */
  generateBuffer(): Buffer {
    return Buffer.from(this.generate(), 'utf-8')
  }

  /**
   * Очистить события
   */
  clear(): this {
    this.events = []
    return this
  }
}
