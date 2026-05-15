/**
 * Извлечение расписания будущих матчей из Telegram-экспортов.
 * Парсит посты "Расписание N тура" с парами команд, местом и временем.
 *
 * Запуск: bun run scripts/migrate/extract-schedule.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MOSCOW_SRC = 'C:/Users/Kami/Downloads/Telegram Desktop/slam/result.json'
const SPB_SRC = 'C:/Users/Kami/Downloads/Telegram Desktop/spb/result.json'
const OUTPUT_DIR = join(import.meta.dirname, 'manual-data')

interface TgMessage {
  id: number
  type: string
  date: string
  text: string | Array<string | { type: string; text: string }>
  [key: string]: unknown
}

interface ScheduledMatch {
  msgId: number
  date: string
  home: string
  away: string
  venue: string | null
  time: string | null
  tour: number | null
}

function getText(msg: TgMessage): string {
  if (!msg.text) {
    return ''
  }
  if (typeof msg.text === 'string') {
    return msg.text
  }
  return msg.text.map((p) => (typeof p === 'string' ? p : p.text || '')).join('')
}

function loadMessages(path: string): TgMessage[] {
  const raw = readFileSync(path, 'utf-8')
  const data = JSON.parse(raw)
  return data.messages.filter((m: TgMessage) => m.type === 'message')
}

/** Извлечь год из даты сообщения */
function getYear(msgDate: string): number {
  return new Date(msgDate).getFullYear()
}

/** Парсинг одного блока расписания */
function parseScheduleBlock(text: string, msgId: number, msgDate: string): ScheduledMatch[] {
  const matches: ScheduledMatch[] = []
  const year = getYear(msgDate)

  // Извлечь номер тура
  const tourMatch = text.match(/(\d+)\s*тур/i)
  const tour = tourMatch ? parseInt(tourMatch[1]) : null

  // Паттерны строк расписания:
  // "2.04, чт: СТИХИ НАРОДА-Метаморфоза"
  // "5.04, вс: ОПГ-НеСТИХай"
  // Место: «Дежурная рюмочная»
  // Начало: 20.00

  const lines = text.split('\n').map((l) => l.trim())
  let currentMatch: Partial<ScheduledMatch> | null = null

  for (const line of lines) {
    // Строка с датой и командами: "2.04, чт: X-Y" или "2.04 (чт): X vs Y" или "02.04: X — Y"
    const dateTeamMatch = line.match(
      /^(\d{1,2})\.(\d{2})(?:\s*,?\s*(?:\(?\s*[а-яА-ЯёЁa-zA-Z]{2}\s*\)?\s*)?)?[:\s]+(.+?)\s*[-–—]\s*(.+?)$/
    )
    if (dateTeamMatch) {
      // Сохранить предыдущий
      if (currentMatch?.home && currentMatch?.away) {
        matches.push(currentMatch as ScheduledMatch)
      }

      const day = dateTeamMatch[1].padStart(2, '0')
      const month = dateTeamMatch[2]
      const date = `${year}-${month}-${day}`

      currentMatch = {
        msgId,
        date,
        home: dateTeamMatch[3].trim().replace(/[«»""]/g, ''),
        away: dateTeamMatch[4].trim().replace(/[«»""]/g, ''),
        venue: null,
        time: null,
        tour,
      }
      continue
    }

    // Место: «Дежурная рюмочная»
    const venueMatch = line.match(/^[Мм]есто\s*:\s*[«""]?(.+?)[»""]?\s*$/)
    if (venueMatch && currentMatch) {
      currentMatch.venue = venueMatch[1].trim()
      continue
    }

    // Начало: 20.00 / 20:00
    const timeMatch = line.match(/^[Нн]ачало\s*:\s*(\d{1,2})[.:](\d{2})/)
    if (timeMatch && currentMatch) {
      currentMatch.time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
      continue
    }
  }

  // Последний матч
  if (currentMatch?.home && currentMatch?.away) {
    matches.push(currentMatch as ScheduledMatch)
  }

  return matches
}

function extractSchedules(messages: TgMessage[]): ScheduledMatch[] {
  const allMatches: ScheduledMatch[] = []

  for (const m of messages) {
    const text = getText(m)

    // Ищем посты с расписанием
    if (!/расписание/i.test(text)) {
      continue
    }
    if (!/тур|матч|начало/i.test(text)) {
      continue
    }

    const matches = parseScheduleBlock(text, m.id, m.date)
    if (matches.length > 0) {
      allMatches.push(...matches)
    }
  }

  return allMatches
}

function main() {
  console.log('=== Извлечение расписания из Telegram ===\n')

  // Москва
  console.log('📍 Москва:')
  const moscowMsgs = loadMessages(MOSCOW_SRC)
  const moscowSchedule = extractSchedules(moscowMsgs)
  console.log(`  Найдено матчей в расписаниях: ${moscowSchedule.length}`)
  for (const m of moscowSchedule) {
    console.log(`  ${m.date} ${m.home} vs ${m.away} @ ${m.venue || '?'} ${m.time || ''} (тур ${m.tour || '?'})`)
  }

  // СПб
  console.log('\n📍 СПб:')
  const spbMsgs = loadMessages(SPB_SRC)
  const spbSchedule = extractSchedules(spbMsgs)
  console.log(`  Найдено матчей в расписаниях: ${spbSchedule.length}`)
  for (const m of spbSchedule.slice(0, 20)) {
    console.log(`  ${m.date} ${m.home} vs ${m.away} @ ${m.venue || '?'} ${m.time || ''} (тур ${m.tour || '?'})`)
  }
  if (spbSchedule.length > 20) {
    console.log(`  ... и ещё ${spbSchedule.length - 20}`)
  }

  // Сохраняем
  const result = { moscow: moscowSchedule, spb: spbSchedule }
  writeFileSync(join(OUTPUT_DIR, 'schedules.json'), JSON.stringify(result, null, 2), 'utf-8')
  console.log(`\nСохранено: schedules.json (${moscowSchedule.length + spbSchedule.length} матчей)`)
}

main()
