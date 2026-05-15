/**
 * Утилита для генерации .ics календарных файлов
 * Формат iCalendar (RFC 5545) совместим со всеми календарями
 */

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  url?: string
  startDate: Date
  endDate: Date
  organizerName?: string
  organizerEmail?: string
  attendeeName?: string
  attendeeEmail?: string
}

/**
 * Форматировать дату в формат iCalendar (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Экранировать специальные символы для iCalendar
 */
function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/**
 * Разбить длинную строку на строки по 75 символов (требование RFC)
 */
function foldLine(line: string): string {
  const maxLength = 75
  if (line.length <= maxLength) {
    return line
  }

  const lines: string[] = []
  const currentLine = line.substring(0, maxLength)
  let remaining = line.substring(maxLength)

  lines.push(currentLine)

  while (remaining.length > 0) {
    const chunk = remaining.substring(0, maxLength - 1)
    lines.push(' ' + chunk)
    remaining = remaining.substring(maxLength - 1)
  }

  return lines.join('\r\n')
}

/**
 * Сгенерировать .ics файл для календарного события
 */
export function generateICS(event: CalendarEvent): string {
  const now = new Date()
  const dtstamp = formatICalDate(now)
  const dtstart = formatICalDate(event.startDate)
  const dtend = formatICalDate(event.endDate)

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IMOT//Integrative Matrix//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@imot.app`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ]

  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeICalText(event.description)}`))
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`)
  }

  if (event.url) {
    lines.push(`URL:${event.url}`)
  }

  if (event.organizerName && event.organizerEmail) {
    lines.push(`ORGANIZER;CN=${escapeICalText(event.organizerName)}:mailto:${event.organizerEmail}`)
  }

  if (event.attendeeName && event.attendeeEmail) {
    lines.push(`ATTENDEE;CN=${escapeICalText(event.attendeeName)};RSVP=TRUE:mailto:${event.attendeeEmail}`)
  }

  lines.push('STATUS:CONFIRMED')
  lines.push('SEQUENCE:0')
  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Создать HTTP Response с .ics файлом для скачивания
 */
export function createICSResponse(icsContent: string, filename = 'event.ics'): Response {
  return new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
