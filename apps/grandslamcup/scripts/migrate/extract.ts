/**
 * Экстрактор данных из cached HTML страниц grandslamcup.ru
 */
import * as cheerio from 'cheerio'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  RawCrossTable,
  RawCrossTableRow,
  RawPoet,
  RawPoetPerformance,
  RawResultMatch,
  RawRosterEntry,
  RawScheduleMatch,
  RawTeam,
} from './types'

const CACHE_DIR = join(import.meta.dirname, 'cache')

function loadHtml(filename: string) {
  return cheerio.load(readFileSync(join(CACHE_DIR, filename), 'utf-8'))
}

// ============================================
// РАСПИСАНИЕ (Сезон 2, главная страница)
// ============================================

/** Парсинг блока расписания (type=468, второй блок) */
export function extractSchedule(): RawScheduleMatch[] {
  const doc = loadHtml('index.html')
  const matches: RawScheduleMatch[] = []

  // Второй блок type=468 содержит расписание
  const blocks = doc('.t-rec[data-record-type="468"]')
  if (blocks.length < 2) {
    console.warn('Не найден блок расписания')
    return matches
  }

  const text = doc(blocks[1]).text()

  // Текст — одна длинная строка. Разбиваем вставляя \n перед "N тур" и перед "ВЛ:" / "1Л:"
  const normalized = text.replace(/(\d+)\s*тур/g, '\n$1 тур\n').replace(/(ВЛ|1Л):/g, '\n$1:')

  let currentTour = 0
  for (const line of normalized.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    const tourMatch = trimmed.match(/^(\d+)\s*тур/)
    if (tourMatch) {
      currentTour = parseInt(tourMatch[1])
      continue
    }

    // "1Л: 4.12 (чт) Бездна. Весёлые ребята 245:233 Апостроф"
    // \w не матчит кириллицу в JS, используем [а-яА-ЯёЁa-zA-Z]
    const played = trimmed.match(
      /^(ВЛ|1Л):\s*(\d{1,2}\.\d{2})\s*\(([а-яА-ЯёЁa-zA-Z]+)\)\s*(.+?)\.\s*(.+?)\s+(\d+):(\d+)\s+(.+)$/
    )
    if (played) {
      matches.push({
        tour: currentTour,
        league: played[1] as 'ВЛ' | '1Л',
        date: played[2],
        dayOfWeek: played[3],
        venue: played[4].trim(),
        homeTeam: played[5].trim(),
        homeScore: parseInt(played[6]),
        awayScore: parseInt(played[7]),
        awayTeam: played[8].trim(),
      })
    }
  }

  return matches
}

// ============================================
// ПЕРЕКРЁСТНЫЕ ТАБЛИЦЫ (Сезон 2)
// ============================================

/** Парсинг перекрёстных таблиц (type=431 на главной) */
export function extractCrossTables(): RawCrossTable[] {
  const doc = loadHtml('index.html')
  const tables: RawCrossTable[] = []

  doc('.t-rec[data-record-type="431"]').each((i, el) => {
    // Данные в текстовом виде с <b> тегами (CSV формат, ; разделитель)
    const rawText = doc(el).text().replace(/\s+/g, ' ').trim()

    // Заголовки: Команды;1163;Блины;...;Голы;РО;Очки
    const headerMatch = rawText.match(/Команды;([^<]+?);Голы;(?:РО|PO);Очки/)
    if (!headerMatch) {
      return
    }

    const teamNames = headerMatch[1].split(';').map((n) => n.trim())
    const league = i === 0 ? 'Высшая Лига' : 'Первая Лига'

    // Строки: "<b>Команда</b>;val;val;...;голы;diff;pts"
    // Работаем с текстом, убирая <b></b>
    const cleanText = rawText.replace(/<\/?b>/g, '')

    const rows: RawCrossTableRow[] = []
    for (const teamName of teamNames) {
      // Ищем строку: "ИмяКоманды;val1;val2;...;голы-голы;diff;pts"
      const escapedName = teamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // После имени команды идут teamNames.length значений, потом голы, diff, pts
      const rowRegex = new RegExp(`${escapedName};([^А-ЯЁA-Z]+?)(?= ${escapedName}| [А-ЯЁA-Z]|$)`)
      const rowMatch = cleanText.match(rowRegex)
      if (!rowMatch) {
        continue
      }

      const cells = rowMatch[1]
        .split(';')
        .map((c) => c.trim())
        .filter(Boolean)
      if (cells.length < teamNames.length + 2) {
        continue
      }

      const results = cells.slice(0, teamNames.length).map((c) => {
        if (c === '-') {
          return '-'
        }
        const num = parseFloat(c)
        return isNaN(num) ? c : num
      })

      const goalsStr = cells[teamNames.length] || ''
      const diff = parseInt(cells[teamNames.length + 1])
      const points = parseInt(cells[teamNames.length + 2])

      rows.push({
        team: teamName,
        results,
        goals: goalsStr,
        difference: isNaN(diff) ? 0 : diff,
        points: isNaN(points) ? 0 : points,
      })
    }

    tables.push({ league, teamNames, rows })
  })

  return tables
}

// ============================================
// КОМАНДЫ (со страниц команд)
// ============================================

/** Парсинг страницы команды */
export function extractTeam(filename: string): RawTeam | null {
  try {
    const doc = loadHtml(filename)
    const roster: RawRosterEntry[] = []
    let coachName = ''

    // Состав — каждый игрок в .t524__col внутри блока type=524
    doc('.t-rec[data-record-type="524"]').each((_, el) => {
      doc(el)
        .find('.t524__col')
        .each((_, col) => {
          const name = doc(col).find('.t524__persname').text().trim()
          const descr = doc(col).find('.t524__persdescr').text().trim().toLowerCase()
          if (!name) {
            return
          }

          let role: RawRosterEntry['role'] = 'player'
          if (descr.includes('играющий тренер')) {
            role = 'playing_coach'
            coachName = name
          } else if (descr.includes('тренер')) {
            role = 'coach'
            coachName = name
          } else if (descr.includes('продюсер')) {
            role = 'player' // Продюсер считается как player (роль PRODUCER добавим позже)
          }

          roster.push({ name, role })
        })
    })

    // Описание и стадион из type=106
    let description = ''
    let venueName = ''

    doc('.t-rec[data-record-type="106"]').each((_, el) => {
      const text = doc(el).text().trim()
      if (text.includes('Стадион')) {
        const venueMatch = text.match(/Стадион\s*(.+?)(?:Тренер|Сети|$)/i)
        if (venueMatch) {
          venueName = venueMatch[1]
            .trim()
            .replace(/^бар\s+/i, '')
            .replace(/[«»""]/g, '')
        }
        if (!coachName) {
          const coachMatch = text.match(/Тренер\s*[-–—:]\s*(.+?)(?:\n|Сети|$)/)
          if (coachMatch) {
            coachName = coachMatch[1].trim()
          }
        }
      } else if (text.length > 50 && !description) {
        description = text
      }
    })

    // Имя команды из type=18 или title
    let teamName = ''
    doc('.t-rec[data-record-type="18"]').each((_, el) => {
      const text = doc(el).text().trim()
      if (text.length > 0 && text.length < 50) {
        teamName = text
      }
    })
    if (!teamName) {
      teamName = doc('title').text().trim().split('|')[0].trim()
    }

    return { name: teamName, description, venueName, coachName, roster }
  } catch {
    return null
  }
}

/** Извлечь все команды из cached страниц */
export function extractTeams(): RawTeam[] {
  const teams: RawTeam[] = []
  const teamFiles = readdirSync(CACHE_DIR).filter(
    (f) => f.endsWith('.html') && !f.includes('__') && !['index', 'results', 'rules'].includes(f.replace('.html', ''))
  )
  for (const file of teamFiles) {
    const team = extractTeam(file)
    if (team) {
      teams.push(team)
    }
  }
  return teams
}

// ============================================
// РЕЗУЛЬТАТЫ СЕЗОНА 1 (страница /results)
// ============================================

/** Парсинг результатов Сезона 1 */
export function extractSeason1Results(): RawResultMatch[] {
  const doc = loadHtml('results.html')
  const matches: RawResultMatch[] = []

  const block = doc('.t-rec[data-record-type="521"]')
  if (block.length === 0) {
    return matches
  }

  const text = block.text()

  // Формат: '11.09.2024, ср20-00"Апартаменты №159"(адрес)   Шь - Чумные1:0272-249'
  // Кириллический день недели + кавычки (обычные ")
  const entries = text.split(/(?=\d{2}\.\d{2}\.\d{4})/).filter((e) => e.trim())

  for (const entry of entries) {
    // [а-яА-ЯёЁa-zA-Z] вместо \w для кириллицы
    // Формат без пробелов: "Шь - Чумные1:0272-249"
    // result = "1:0" или "0:1" или "1/2:1/2", score = "272-249"
    const m = entry.match(
      /(\d{2}\.\d{2}\.\d{4}),?\s*[а-яА-ЯёЁa-zA-Z]+(\d{2}-\d{2})\s*["""«]([^"""»]+)["""»]\s*\(([^)]*)\)\s+(.+?)\s+-\s+(.+?)(1:0|0:1|1\/2:1\/2)(\d+-\d+)/
    )
    if (m) {
      matches.push({
        date: m[1],
        time: m[2],
        venue: m[3].trim(),
        address: m[4].trim(),
        homeTeam: m[5].trim(),
        awayTeam: m[6].trim(),
        result: m[7],
        score: m[8],
      })
    }
  }

  return matches
}

// ============================================
// ПОЭТЫ (со страниц поэтов)
// ============================================

/** Парсинг страницы поэта */
export function extractPoet(filename: string): RawPoet | null {
  try {
    const doc = loadHtml(filename)
    const slug = filename.replace('.html', '')
    const teamSlug = slug.split('__')[0]

    // Имя и био из type=544
    let name = ''
    let bio = ''
    doc('.t-rec[data-record-type="544"]').each((_, el) => {
      const text = doc(el).text().trim()
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      if (lines.length > 0) {
        name = lines[0]
      }
      if (lines.length > 1) {
        bio = lines.slice(1).join(' ').trim()
      }
    })

    // Индивидуальный зачёт из type=431
    const performances: RawPoetPerformance[] = []
    doc('.t-rec[data-record-type="431"]').each((_, el) => {
      const text = doc(el).text().trim()
      const dataText = text.replace(/^Матч;Игрок;Счет;Счет;Оппонент\s*/, '')
      const entries = dataText.split(/(?=\d{2}\.\d{2}\.\d{2})/).filter((e) => e.trim())

      for (const entry of entries) {
        const parts = entry.split(';').map((p) => p.trim())
        if (parts.length < 5) {
          continue
        }

        const dateMatch = parts[0].match(/(\d{2}\.\d{2}\.\d{2})\s*\((\d)\)\s*(.+?)\s*-\s*(.+)/)
        if (!dateMatch) {
          continue
        }

        performances.push({
          date: dateMatch[1],
          half: parseInt(dateMatch[2]),
          matchTeams: `${dateMatch[3].trim()} - ${dateMatch[4].trim()}`,
          playerName: parts[1],
          playerScore: parseInt(parts[2]) || 0,
          opponentScore: parseInt(parts[3]) || 0,
          opponentName: parts[4],
        })
      }
    })

    if (!name) {
      return null
    }
    return { name, teamSlug, bio, performances }
  } catch {
    return null
  }
}

/** Извлечь всех поэтов */
export function extractPoets(): RawPoet[] {
  const poets: RawPoet[] = []
  const poetFiles = readdirSync(CACHE_DIR).filter((f) => f.endsWith('.html') && f.includes('__'))
  for (const file of poetFiles) {
    const poet = extractPoet(file)
    if (poet) {
      poets.push(poet)
    }
  }
  return poets
}

// ============================================
// СТАДИОНЫ
// ============================================

/** Извлечь уникальные стадионы */
export function extractVenues(
  schedule: RawScheduleMatch[],
  s1Results: RawResultMatch[]
): { name: string; address?: string }[] {
  const venueMap = new Map<string, string>()
  for (const m of schedule) {
    if (m.venue && !venueMap.has(m.venue)) {
      venueMap.set(m.venue, '')
    }
  }
  for (const m of s1Results) {
    if (m.venue && !venueMap.has(m.venue)) {
      venueMap.set(m.venue, m.address || '')
    }
  }
  return Array.from(venueMap.entries()).map(([name, address]) => ({
    name,
    address: address || undefined,
  }))
}

// ============================================
// ТЕСТ
// ============================================

if (import.meta.main) {
  console.log('=== РАСПИСАНИЕ (Сезон 2) ===')
  const schedule = extractSchedule()
  console.log(`Найдено ${schedule.length} матчей`)
  for (const m of schedule.slice(0, 5)) {
    console.log(
      `  Тур ${m.tour} ${m.league}: ${m.homeTeam} ${m.homeScore ?? '?'}:${
        m.awayScore ?? '?'
      } ${m.awayTeam} @ ${m.venue}`
    )
  }

  console.log('\n=== ПЕРЕКРЁСТНЫЕ ТАБЛИЦЫ ===')
  const tables = extractCrossTables()
  for (const t of tables) {
    console.log(`\n${t.league} (${t.teamNames.length} команд):`)
    for (const r of t.rows) {
      console.log(`  ${r.team}: ${r.goals} (${r.difference > 0 ? '+' : ''}${r.difference}) -- ${r.points} очков`)
    }
  }

  console.log('\n=== КОМАНДЫ ===')
  const teams = extractTeams()
  for (const t of teams) {
    console.log(`\n${t.name}: ${t.roster.length} игроков, тренер: ${t.coachName}, стадион: ${t.venueName}`)
    for (const r of t.roster) {
      console.log(`  - ${r.name} (${r.role})`)
    }
  }

  console.log('\n=== РЕЗУЛЬТАТЫ СЕЗОНА 1 ===')
  const s1 = extractSeason1Results()
  console.log(`Найдено ${s1.length} матчей`)
  for (const m of s1.slice(0, 5)) {
    console.log(`  ${m.date}: ${m.homeTeam} - ${m.awayTeam} ${m.result} (${m.score}) @ ${m.venue}`)
  }

  console.log('\n=== ПОЭТЫ ===')
  const poets = extractPoets()
  for (const p of poets) {
    console.log(`\n${p.name} (${p.teamSlug}): ${p.performances.length} перформансов`)
    for (const perf of p.performances.slice(0, 3)) {
      console.log(`  ${perf.date} (${perf.half}т): ${perf.playerScore}:${perf.opponentScore} vs ${perf.opponentName}`)
    }
  }

  console.log('\n=== СТАДИОНЫ ===')
  const venues = extractVenues(schedule, s1)
  console.log(`Всего ${venues.length} стадионов:`)
  for (const v of venues) {
    console.log(`  ${v.name}${v.address ? ` (${v.address})` : ''}`)
  }
}
