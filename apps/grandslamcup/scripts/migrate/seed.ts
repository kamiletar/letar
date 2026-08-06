/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seed скрипт — загрузка данных в PostgreSQL через Kysely (raw SQL)
 * Обходит ZenStack ORM валидацию для прямого доступа к БД
 *
 * Запуск: bun run scripts/migrate/seed.ts
 */
import { config } from 'dotenv'
import { join } from 'node:path'

config({ path: join(import.meta.dirname, '../../.env.local') })
config({ path: join(import.meta.dirname, '../../.env') })

import { Pool } from 'pg'
import { transliterate } from '../../src/lib/transliterate'
import { extractCrossTables, extractSchedule, extractSeason1Results, extractTeams, extractVenues } from './extract'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function cuid(): string {
  return `cm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

const NOW = new Date().toISOString()

/** Добавить createdAt/updatedAt к данным если модель их имеет */
function withTimestamps(data: Record<string, any>): Record<string, any> {
  return { ...data, createdAt: NOW, updatedAt: NOW }
}

function makeSlug(name: string): string {
  return transliterate(name)
}

/**
 * Нормализация названий команд — приведение к каноническому виду.
 * Устраняет разночтения из разных источников Tilda.
 */
const TEAM_NAME_ALIASES: Record<string, string> = {
  // С2: регистр и ё/е
  'Менестрели Подземелья': 'Менестрели подземелья',
  'Весёлые ребята': 'Веселые ребята',
  // С1: латиница, скобки, опечатки
  Firma: 'Фирма',
  'Вином (ех-Болт)': 'Вином',
  'Ива (экс-Софийка)': 'Ива',
  Пыжики: 'Пыжыки',
}

/** Артефакты парсинга — пропускаем */
const SKIP_NAMES = new Set(["'", '.', '', "'"])

function normalizeTeamName(name: string): string {
  const trimmed = name.trim()
  return TEAM_NAME_ALIASES[trimmed] || trimmed
}

// ============================================
// SQL helpers
// ============================================

/** INSERT ... ON CONFLICT DO NOTHING + SELECT id */
async function upsert(table: string, data: Record<string, any>, uniqueCol: string): Promise<string> {
  const cols = Object.keys(data)
  const vals = Object.values(data)
  const colList = cols.map((c) => `"${c}"`).join(', ')
  const valList = cols.map((_, i) => `$${i + 1}`).join(', ')

  await pool.query(
    `INSERT INTO "${table}" (${colList}) VALUES (${valList}) ON CONFLICT ("${uniqueCol}") DO NOTHING`,
    vals,
  )

  const result = await pool.query(`SELECT "id" FROM "${table}" WHERE "${uniqueCol}" = $1 LIMIT 1`, [data[uniqueCol]])
  return result.rows[0].id
}

/** INSERT ... ON CONFLICT на составном ключе DO NOTHING + SELECT id */
async function upsertComposite(table: string, data: Record<string, any>, uniqueCols: string[]): Promise<string> {
  const cols = Object.keys(data)
  const vals = Object.values(data)
  const colList = cols.map((c) => `"${c}"`).join(', ')
  const valList = cols.map((_, i) => `$${i + 1}`).join(', ')
  const conflictList = uniqueCols.map((c) => `"${c}"`).join(', ')

  await pool.query(
    `INSERT INTO "${table}" (${colList}) VALUES (${valList}) ON CONFLICT (${conflictList}) DO NOTHING`,
    vals,
  )

  const whereParts = uniqueCols.map((c, i) => `"${c}" = $${i + 1}`)
  const whereVals = uniqueCols.map((c) => data[c])
  const result = await pool.query(`SELECT "id" FROM "${table}" WHERE ${whereParts.join(' AND ')} LIMIT 1`, whereVals)
  return result.rows[0].id
}

/** INSERT если не существует (проверка по checkCols) */
async function insertIfNotExists(
  table: string,
  data: Record<string, any>,
  checkCols: string[],
): Promise<string | null> {
  const checkParts = checkCols.map((c, i) => `"${c}" = $${i + 1}`)
  const checkVals = checkCols.map((c) => data[c])

  const existing = await pool.query(`SELECT "id" FROM "${table}" WHERE ${checkParts.join(' AND ')} LIMIT 1`, checkVals)
  if (existing.rows.length > 0) {
    return existing.rows[0].id
  }

  const cols = Object.keys(data)
  const vals = Object.values(data)
  const colList = cols.map((c) => `"${c}"`).join(', ')
  const valList = cols.map((_, i) => `$${i + 1}`).join(', ')

  const result = await pool.query(`INSERT INTO "${table}" (${colList}) VALUES (${valList}) RETURNING "id"`, vals)
  return result.rows[0].id
}

// ============================================
// Seed
// ============================================

async function main() {
  console.log('=== Миграция данных GrandSlamCup ===\n')

  // 1. Город (имеет createdAt/updatedAt)
  console.log('Города...')
  const cityId = await upsert('City', withTimestamps({ id: cuid(), name: 'Санкт-Петербург', slug: 'spb' }), 'slug')
  console.log(`  СПб: ${cityId}`)

  // 2. Стадионы
  console.log('Стадионы...')
  const schedule = extractSchedule()
  const s1Results = extractSeason1Results()
  const rawVenues = extractVenues(schedule, s1Results)
  const venueMap = new Map<string, string>()

  for (const v of rawVenues) {
    const slug = makeSlug(v.name)
    const id = await upsert(
      'Venue',
      withTimestamps({
        id: cuid(),
        name: v.name,
        slug,
        cityId,
        address: v.address || null,
      }),
      'slug',
    )
    venueMap.set(v.name, id)
  }
  console.log(`  ${venueMap.size} стадионов`)

  // 3. Сезоны
  console.log('Сезоны...')
  const s1Id = await upsert(
    'Season',
    withTimestamps({
      id: cuid(),
      name: 'КБС СПб Сезон 1',
      slug: 'spb-2024-s1',
      cityId,
      status: 'FINISHED',
      format: 'ROUND_ROBIN',
      transferWindowOpen: false,
      showLiveScore: true,
    }),
    'slug',
  )

  const s2Id = await upsert(
    'Season',
    withTimestamps({
      id: cuid(),
      name: 'КБС СПб Сезон 2',
      slug: 'spb-2025-s2',
      cityId,
      status: 'ACTIVE',
      format: 'ROUND_ROBIN',
      transferWindowOpen: false,
      showLiveScore: true,
    }),
    'slug',
  )
  console.log(`  С1: ${s1Id}, С2: ${s2Id}`)

  // 4. Лиги
  console.log('Лиги...')
  const s1LeagueId = await upsertComposite(
    'League',
    {
      id: cuid(),
      seasonId: s1Id,
      name: 'Основная',
      order: 1,
    },
    ['seasonId', 'name'],
  )

  const s2VLId = await upsertComposite(
    'League',
    {
      id: cuid(),
      seasonId: s2Id,
      name: 'Высшая Лига',
      order: 1,
    },
    ['seasonId', 'name'],
  )

  const s2PLId = await upsertComposite(
    'League',
    {
      id: cuid(),
      seasonId: s2Id,
      name: 'Первая Лига',
      order: 2,
    },
    ['seasonId', 'name'],
  )

  // 5. Круги
  console.log('Круги...')
  const s1RoundId = await upsertComposite(
    'Round',
    {
      id: cuid(),
      seasonId: s1Id,
      name: 'Круг 1',
      number: 1,
    },
    ['seasonId', 'number'],
  )

  const s2RoundId = await upsertComposite(
    'Round',
    {
      id: cuid(),
      seasonId: s2Id,
      name: 'Круг 1',
      number: 1,
    },
    ['seasonId', 'number'],
  )

  // 6. Туры С2
  console.log('Туры...')
  const maxTour = Math.max(...schedule.map((m) => m.tour), 0)
  const s2TourMap = new Map<number, string>()
  for (let i = 1; i <= maxTour; i++) {
    const tourId = await upsertComposite(
      'Tour',
      {
        id: cuid(),
        roundId: s2RoundId,
        number: i,
      },
      ['roundId', 'number'],
    )
    s2TourMap.set(i, tourId)
  }

  // Туры С1 — один тур на матч
  const s1TourMap = new Map<number, string>()
  for (let i = 1; i <= s1Results.length; i++) {
    const tourId = await upsertComposite(
      'Tour',
      {
        id: cuid(),
        roundId: s1RoundId,
        number: i,
      },
      ['roundId', 'number'],
    )
    s1TourMap.set(i, tourId)
  }
  console.log(`  С2: ${s2TourMap.size} туров, С1: ${s1TourMap.size} туров`)

  // 7. Команды (нормализуем имена через TEAM_NAME_ALIASES)
  console.log('Команды...')
  const allTeamNames = new Set<string>()

  /** Добавить нормализованное имя (пропуская артефакты) */
  const addTeamName = (raw: string) => {
    const name = normalizeTeamName(raw)
    if (!SKIP_NAMES.has(name)) {
      allTeamNames.add(name)
    }
  }
  const tables = extractCrossTables()

  for (const m of schedule) {
    addTeamName(m.homeTeam)
    addTeamName(m.awayTeam)
  }
  for (const m of s1Results) {
    addTeamName(m.homeTeam)
    addTeamName(m.awayTeam)
  }
  for (const t of tables) {
    for (const n of t.teamNames) {
      addTeamName(n)
    }
  }

  // Переименования
  const renames: Record<string, string[]> = {
    Вином: ['Болт'],
    Ива: ['Софийка'],
  }
  const oldNames = new Set(Object.values(renames).flat())

  const teamMap = new Map<string, string>() // name → teamId
  const teamPages = extractTeams()

  for (const name of allTeamNames) {
    if (oldNames.has(name)) {
      continue
    } // старое имя — пропускаем

    const slug = makeSlug(name)
    const previousNames = renames[name] || []
    const teamPage = teamPages.find((t) => t.name.toUpperCase() === name.toUpperCase())

    const teamId = await upsert(
      'Team',
      withTimestamps({
        id: cuid(),
        name,
        slug,
        cityId,
        previousNames: previousNames.length > 0 ? `{${previousNames.join(',')}}` : '{}',
        description: teamPage?.description || null,
      }),
      'slug',
    )

    teamMap.set(name, teamId)
    for (const old of previousNames) {
      teamMap.set(old, teamId)
    }
  }
  console.log(`  ${teamMap.size} команд`)

  // 8. Игроки
  console.log('Игроки...')
  const playerMap = new Map<string, string>()

  console.log(`  Команды с составами: ${teamPages.length}`)
  for (const teamPage of teamPages) {
    console.log(`    ${teamPage.name}: ${teamPage.roster.length} игроков`)
    for (const entry of teamPage.roster) {
      const cleanName = entry.name.trim()
      if (playerMap.has(cleanName) || cleanName.length < 2) {
        continue
      }

      const slug = makeSlug(cleanName)

      try {
        const playerId = await upsert(
          'Player',
          withTimestamps({
            id: cuid(),
            name: cleanName,
            slug,
          }),
          'slug',
        )
        playerMap.set(cleanName, playerId)
      } catch (err) {
        console.warn(`    Ошибка игрока "${cleanName}":`, (err as Error).message?.substring(0, 100))
      }
    }
  }
  console.log(`  ${playerMap.size} игроков`)

  // 9. TeamSeason
  console.log('TeamSeason...')
  const tsMap = new Map<string, string>() // "name:season" → id

  // С2 Высшая Лига
  const vlTeams = tables[0]?.teamNames || []
  for (const rawName of vlTeams) {
    const name = normalizeTeamName(rawName)
    const teamId = teamMap.get(name)
    if (!teamId) {
      console.warn(`  Нет команды: ${name}`)
      continue
    }
    const id = await upsertComposite(
      'TeamSeason',
      {
        id: cuid(),
        teamId,
        seasonId: s2Id,
        leagueId: s2VLId,
      },
      ['teamId', 'seasonId'],
    )
    tsMap.set(`${name}:s2`, id)
  }

  // С2 Первая Лига
  const plTeams = tables[1]?.teamNames || []
  for (const rawName of plTeams) {
    const name = normalizeTeamName(rawName)
    const teamId = teamMap.get(name)
    if (!teamId) {
      console.warn(`  Нет команды: ${name}`)
      continue
    }
    const id = await upsertComposite(
      'TeamSeason',
      {
        id: cuid(),
        teamId,
        seasonId: s2Id,
        leagueId: s2PLId,
      },
      ['teamId', 'seasonId'],
    )
    tsMap.set(`${name}:s2`, id)
  }

  // С1 — все команды
  const s1Names = new Set<string>()
  for (const m of s1Results) {
    s1Names.add(normalizeTeamName(m.homeTeam))
    s1Names.add(normalizeTeamName(m.awayTeam))
  }
  for (const name of s1Names) {
    if (SKIP_NAMES.has(name)) {
      continue
    }
    const teamId = teamMap.get(name)
    if (!teamId) {
      console.warn(`  Нет команды (С1): ${name}`)
      continue
    }
    const id = await upsertComposite(
      'TeamSeason',
      {
        id: cuid(),
        teamId,
        seasonId: s1Id,
        leagueId: s1LeagueId,
      },
      ['teamId', 'seasonId'],
    )
    tsMap.set(`${name}:s1`, id)
  }
  console.log(`  ${tsMap.size} записей`)

  // 10. PlayerTeamSeason
  console.log('PlayerTeamSeason...')
  let ptsCount = 0
  for (const teamPage of teamPages) {
    // teamPage.name может содержать 'Команда "ЧУМНЫЕ"' — ищем по вхождению
    const pageNameUpper = teamPage.name.toUpperCase().replace(/[«»""]/g, '')
    let teamSeasonId: string | undefined
    for (const [key, id] of tsMap) {
      const tsName = key.split(':')[0].toUpperCase()
      if (pageNameUpper.includes(tsName) || tsName.includes(pageNameUpper)) {
        teamSeasonId = id
        break
      }
    }
    if (!teamSeasonId) {
      console.warn(`    Нет TeamSeason для команды "${teamPage.name}"`)
      continue
    }

    for (const entry of teamPage.roster) {
      const playerId = playerMap.get(entry.name.trim())
      if (!playerId) {
        continue
      }

      const role = entry.role === 'playing_coach' ? 'PLAYING_COACH' : entry.role === 'coach' ? 'COACH' : 'PLAYER'

      try {
        await upsertComposite(
          'PlayerTeamSeason',
          {
            id: cuid(),
            playerId,
            teamSeasonId,
            role,
            joinedAt: NOW,
          },
          ['playerId', 'teamSeasonId'],
        )
        ptsCount++
      } catch (err) {
        console.warn(`    PTS ошибка ${entry.name}:`, (err as Error).message?.substring(0, 80))
      }
    }
  }
  console.log(`  ${ptsCount} записей`)

  // 11. Матчи С1
  console.log('Матчи С1...')
  let s1Count = 0
  for (let i = 0; i < s1Results.length; i++) {
    const m = s1Results[i]
    const homeTS = tsMap.get(`${normalizeTeamName(m.homeTeam)}:s1`)
    const awayTS = tsMap.get(`${normalizeTeamName(m.awayTeam)}:s1`)
    const tourId = s1TourMap.get(i + 1)
    const venueId = venueMap.get(m.venue) || null

    if (!homeTS || !awayTS || !tourId) {
      continue
    }

    const [homeScore, awayScore] = m.score.split('-').map(Number)
    const [hp, ap] = m.result === '1:0' ? [1, 0] : m.result === '0:1' ? [0, 1] : [0.5, 0.5]

    const [day, month, year] = m.date.split('.')
    const time = m.time.replace('-', ':')
    const scheduledAt = new Date(`${year}-${month}-${day}T${time}:00`)

    const matchId = await insertIfNotExists(
      'Match',
      withTimestamps({
        id: cuid(),
        tourId,
        leagueId: s1LeagueId,
        homeTeamId: homeTS,
        awayTeamId: awayTS,
        venueId,
        status: 'FINISHED',
        homeScore,
        awayScore,
        homePoints: hp,
        awayPoints: ap,
        scheduledAt: scheduledAt.toISOString(),
        hasTiebreak: false,
        scorerToken: cuid(),
        presenterToken: cuid(),
        homeCoachToken: cuid(),
        awayCoachToken: cuid(),
      }),
      ['tourId', 'homeTeamId', 'awayTeamId'],
    )

    if (matchId) {
      s1Count++
    }
  }
  console.log(`  ${s1Count} матчей`)

  // 12. Матчи С2
  console.log('Матчи С2...')
  let s2Count = 0
  for (const m of schedule) {
    if (m.tour === 0) {
      continue
    }

    const homeTS = tsMap.get(`${normalizeTeamName(m.homeTeam)}:s2`)
    const awayTS = tsMap.get(`${normalizeTeamName(m.awayTeam)}:s2`)
    const tourId = s2TourMap.get(m.tour)
    const venueId = venueMap.get(m.venue) || null

    if (!homeTS || !awayTS || !tourId) {
      console.warn(`  Пропуск: Тур ${m.tour} ${m.homeTeam} vs ${m.awayTeam}`)
      continue
    }

    const isFinished = m.homeScore !== null
    const homeScore = m.homeScore ?? 0
    const awayScore = m.awayScore ?? 0
    const hp = isFinished ? (homeScore > awayScore ? 1 : homeScore === awayScore ? 0.5 : 0) : 0
    const ap = isFinished ? (awayScore > homeScore ? 1 : awayScore === homeScore ? 0.5 : 0) : 0

    // Определяем лигу по типу матча (ВЛ или 1Л)
    const matchLeagueId = m.league === 'ВЛ' ? s2VLId : s2PLId

    const matchId = await insertIfNotExists(
      'Match',
      withTimestamps({
        id: cuid(),
        tourId,
        leagueId: matchLeagueId,
        homeTeamId: homeTS,
        awayTeamId: awayTS,
        venueId,
        status: isFinished ? 'FINISHED' : 'SCHEDULED',
        homeScore,
        awayScore,
        homePoints: hp,
        awayPoints: ap,
        hasTiebreak: false,
        scorerToken: cuid(),
        presenterToken: cuid(),
        homeCoachToken: cuid(),
        awayCoachToken: cuid(),
      }),
      ['tourId', 'homeTeamId', 'awayTeamId'],
    )

    if (matchId) {
      s2Count++
    }
  }
  console.log(`  ${s2Count} матчей`)

  // Итоговая статистика
  console.log('\n=== Статистика ===')
  const statTables = [
    'City',
    'Venue',
    'Season',
    'League',
    'Round',
    'Tour',
    'Team',
    'Player',
    'TeamSeason',
    'PlayerTeamSeason',
    'Match',
  ]
  for (const t of statTables) {
    const result = await pool.query(`SELECT COUNT(*) as count FROM "${t}"`)
    console.log(`  ${t}: ${result.rows[0].count}`)
  }

  console.log('\n=== Миграция завершена ===')
  await pool.end()
}

main().catch((err) => {
  console.error('ОШИБКА:', err)
  process.exit(1)
})
