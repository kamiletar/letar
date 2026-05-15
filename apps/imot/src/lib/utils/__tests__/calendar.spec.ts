import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '../calendar'
import { createICSResponse, generateICS } from '../calendar'

const baseEvent: CalendarEvent = {
  id: 'test-event-1',
  title: 'Сессия ИМОТ',
  description: 'Терапевтическая сессия с клиентом',
  startDate: new Date('2026-03-25T10:00:00Z'),
  endDate: new Date('2026-03-25T11:00:00Z'),
}

describe('generateICS', () => {
  it('генерирует валидный iCalendar формат', () => {
    const ics = generateICS(baseEvent)
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('VERSION:2.0')
  })

  it('содержит UID с доменом', () => {
    const ics = generateICS(baseEvent)
    expect(ics).toContain('UID:test-event-1@imot.app')
  })

  it('содержит DTSTART и DTEND', () => {
    const ics = generateICS(baseEvent)
    expect(ics).toContain('DTSTART:20260325T100000Z')
    expect(ics).toContain('DTEND:20260325T110000Z')
  })

  it('содержит SUMMARY', () => {
    const ics = generateICS(baseEvent)
    expect(ics).toContain('SUMMARY:Сессия ИМОТ')
  })

  it('содержит DESCRIPTION если задано', () => {
    const ics = generateICS(baseEvent)
    expect(ics).toContain('DESCRIPTION:')
  })

  it('не содержит LOCATION если не задано', () => {
    const ics = generateICS(baseEvent)
    expect(ics).not.toContain('LOCATION:')
  })

  it('добавляет LOCATION если задано', () => {
    const ics = generateICS({ ...baseEvent, location: 'Zoom' })
    expect(ics).toContain('LOCATION:Zoom')
  })

  it('добавляет URL если задано', () => {
    const ics = generateICS({ ...baseEvent, url: 'https://meet.google.com/abc' })
    expect(ics).toContain('URL:https://meet.google.com/abc')
  })

  it('добавляет ORGANIZER если задано', () => {
    const ics = generateICS({
      ...baseEvent,
      organizerName: 'Елена Рос',
      organizerEmail: 'elena@imot.app',
    })
    expect(ics).toContain('ORGANIZER;CN=Елена Рос:mailto:elena@imot.app')
  })

  it('добавляет ATTENDEE если задано', () => {
    const ics = generateICS({
      ...baseEvent,
      attendeeName: 'Клиент',
      attendeeEmail: 'client@mail.ru',
    })
    expect(ics).toContain('ATTENDEE;CN=Клиент')
    expect(ics).toContain('mailto:client@mail.ru')
  })

  it('экранирует спецсимволы в тексте', () => {
    const ics = generateICS({
      ...baseEvent,
      title: 'Сессия; с запятой, и обратной\\чертой',
    })
    expect(ics).toContain('SUMMARY:Сессия\\; с запятой\\, и обратной\\\\чертой')
  })
})

describe('createICSResponse', () => {
  it('создаёт Response с правильным Content-Type', () => {
    const response = createICSResponse('content', 'test.ics')
    expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
  })

  it('создаёт Response с Content-Disposition', () => {
    const response = createICSResponse('content', 'session.ics')
    expect(response.headers.get('Content-Disposition')).toContain('session.ics')
  })
})
