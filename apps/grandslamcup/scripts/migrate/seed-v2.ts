/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seed v2 — загрузка данных из Telegram AI-экстракции (spb-clean.json + moscow-clean.json)
 * Заменяет устаревший seed.ts (v1, из Tilda HTML)
 *
 * Запуск: bun run scripts/migrate/seed-v2.ts
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

config({ path: join(import.meta.dirname, '../../.env.local'), quiet: true })
config({ path: join(import.meta.dirname, '../../.env'), quiet: true })

import { parsePostgresUrl } from '@letar/pg-url'
import { Pool } from 'pg'
import { transliterate } from '../../src/lib/transliterate'
import { normalizeTeamName } from './normalize'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан')
}

const pool = new Pool(parsePostgresUrl(process.env.DATABASE_URL))

// ============================================
// Утилиты
// ============================================

function cuid(): string {
  return `cm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

const NOW = new Date().toISOString()

function withTimestamps(data: Record<string, any>): Record<string, any> {
  return { ...data, createdAt: NOW, updatedAt: NOW }
}

function makeSlug(name: string): string {
  return transliterate(name)
}

// ============================================
// SQL helpers (из seed.ts v1)
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

// ============================================
// Типы clean JSON
// ============================================

interface CleanMatch {
  msgId: number
  date: string
  home: string | null
  away: string | null
  venue: string | null
  address: string | null
  time: string | null
  homeScore: number | null
  awayScore: number | null
  winner: string | null
}

interface CleanRoster {
  msgId: number
  date: string
  team: string
  players: string[]
}

interface CleanProfile {
  msgId: number
  name: string
  role: string | null
  team: string | null
  bio: string
}

interface CleanVenue {
  name: string
  address: string | null
  type: string | null
  city: string
}

interface CleanTeam {
  name: string
  telegramUrl: string | null
  homeVenue: string | null
}

interface CleanData {
  matches: CleanMatch[]
  rosters: CleanRoster[]
  profiles: CleanProfile[]
  venues: CleanVenue[]
  teams: CleanTeam[]
  rounds: any[]
}

// ============================================
// Белые списки команд по сезонам
// ============================================

const SPB_S1_TEAMS = new Set([
  'Шь',
  'Чумные',
  'Обормоты',
  'Блины',
  'Или',
  'Пыжыки',
  'Firma',
  'Софийка',
  'Болт',
  'Бюро',
  'Вином',
  'Ива',
])

const SPB_S2_VL = new Set(['Чумные', 'Блины', 'Или', 'ПЗК', 'Обормоты', 'Менестрели подземелья', '1163', 'Вином'])
const SPB_S2_1L = new Set(['Бугульма', 'Пыжыки', 'Винета', 'Бюро', 'Болт', 'Состав', 'Апостроф', 'Веселые ребята'])
const SPB_S2_TEAMS = new Set([...SPB_S2_VL, ...SPB_S2_1L])

const SPB_S3_TEAMS = new Set([...SPB_S2_TEAMS, 'Синий Пушкин', 'СТИХИ НАРОДА', 'ДА'])

const MOSCOW_S1_TEAMS = new Set([
  'Бродячие артисты',
  'Шатуны',
  'РЫБА',
  'ЛитПон',
  'СИИ',
  'ДА',
  'Кашалот',
  'Птица поэта',
  'Чатл',
  'Жемчужные',
  "Opezdol's Crew",
  'TERIYAKI SQUAD',
  'Против',
  'Дикпики',
])

const MOSCOW_S2_TEAMS = new Set([
  'In Folio',
  'ДА',
  'Кашалот',
  'Манулы',
  'Маски',
  'Метаморфоза',
  'НЕНАХОД НОГИ',
  'НеСТИХай',
  'ОПГ',
  'Поэтория',
  'Прогрев',
  'РЫБА',
  'СТИХИ НАРОДА',
  'Солянка',
  'Чатл',
  'Шатуны',
])

// Все команды обоих городов
const ALL_SPB_TEAMS = new Set([...SPB_S1_TEAMS, ...SPB_S2_TEAMS, ...SPB_S3_TEAMS])
const ALL_MOSCOW_TEAMS = new Set([...MOSCOW_S1_TEAMS, ...MOSCOW_S2_TEAMS])

// ============================================
// Определение сезона по дате и городу
// ============================================

type SeasonKey = 'spb-s1' | 'spb-s2' | 'spb-s3' | 'moscow-s1' | 'moscow-s2'

function getSeasonKey(date: string, city: 'spb' | 'moscow'): SeasonKey | null {
  if (city === 'spb') {
    if (date <= '2024-12-31') {
      return 'spb-s1'
    }
    if (date <= '2025-06-30') {
      return 'spb-s2'
    }
    if (date >= '2025-09-01') {
      return 'spb-s3'
    }
    return null // летняя пауза
  }
  // Москва
  if (date <= '2025-12-31') {
    return 'moscow-s1'
  }
  if (date >= '2026-02-01') {
    return 'moscow-s2'
  }
  return null
}

/** Определить в какой сезон входит команда (по белому списку) */
function getTeamSeasons(teamName: string, city: 'spb' | 'moscow'): SeasonKey[] {
  const seasons: SeasonKey[] = []
  if (city === 'spb') {
    if (SPB_S1_TEAMS.has(teamName)) {
      seasons.push('spb-s1')
    }
    if (SPB_S2_TEAMS.has(teamName)) {
      seasons.push('spb-s2')
    }
    if (SPB_S3_TEAMS.has(teamName)) {
      seasons.push('spb-s3')
    }
  } else {
    if (MOSCOW_S1_TEAMS.has(teamName)) {
      seasons.push('moscow-s1')
    }
    if (MOSCOW_S2_TEAMS.has(teamName)) {
      seasons.push('moscow-s2')
    }
  }
  return seasons
}

// ============================================
// Восстановление пар команд из ростеров
// ============================================

/** Для матчей без home/away ищем 2 ростера на ту же дату */
function _restoreMatchPairs(matches: CleanMatch[], rosters: CleanRoster[]): CleanMatch[] {
  // Индекс ростеров по дате
  const rostersByDate = new Map<string, string[]>()
  for (const r of rosters) {
    const dateKey = r.date.substring(0, 10)
    if (!rostersByDate.has(dateKey)) {
      rostersByDate.set(dateKey, [])
    }
    rostersByDate.get(dateKey)!.push(r.team)
  }

  return matches.map((m) => {
    // Уже есть обе команды
    if (m.home && m.away) {
      return m
    }

    const dateKey = m.date.substring(0, 10)
    const teamsOnDate = rostersByDate.get(dateKey)

    if (!teamsOnDate || teamsOnDate.length < 2) {
      return m
    }

    // Убираем дубли
    const uniqueTeams = [...new Set(teamsOnDate)]

    // Если ровно 2 команды — отлично
    if (uniqueTeams.length === 2) {
      let [teamA, teamB] = uniqueTeams
      // Если winner совпадает с одной из них, она home
      if (m.winner === teamB) {
        ;[teamA, teamB] = [teamB, teamA]
      }
      return {
        ...m,
        home: m.home ?? teamA,
        away: m.away ?? teamB,
      }
    }

    // Если есть home но нет away — ищем вторую команду из ростеров
    if (m.home && !m.away) {
      const otherTeams = uniqueTeams.filter((t) => t !== m.home)
      if (otherTeams.length === 1) {
        return { ...m, away: otherTeams[0] }
      }
    }

    return m
  })
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('=== Seed v2: Миграция из Telegram AI-экстракции ===\n')

  // Загружаем v2 JSON (Sonnet 4.6 экстракция)
  const spbData: CleanData = JSON.parse(readFileSync(join(import.meta.dirname, 'manual-data/spb-v2.json'), 'utf-8'))
  const moscowData: CleanData = JSON.parse(
    readFileSync(join(import.meta.dirname, 'manual-data/moscow-v2.json'), 'utf-8'),
  )

  // Загружаем расписание (анонсы будущих матчей)
  const schedules = JSON.parse(readFileSync(join(import.meta.dirname, 'manual-data/schedules.json'), 'utf-8'))

  // Мёржим расписание: добавляем venue/time к существующим матчам, новые — как SCHEDULED
  function mergeSchedule(matches: CleanMatch[], schedule: any[], _city: 'spb' | 'moscow') {
    // Ключи в обоих направлениях (home-away и away-home)
    const existingKeys = new Set<string>()
    for (const m of matches) {
      existingKeys.add(`${m.date}|${m.home}|${m.away}`)
      existingKeys.add(`${m.date}|${m.away}|${m.home}`)
    }

    for (const s of schedule) {
      // Нормализуем названия через общий модуль
      s.home = normalizeTeamName(s.home || '') || s.home
      s.away = normalizeTeamName(s.away || '') || s.away

      // Пропускаем мусор
      if (!s.home || !s.away || s.home.length > 40 || s.away.length > 40) {
        continue
      }

      const key = `${s.date}|${s.home}|${s.away}`

      if (existingKeys.has(key)) {
        // Матч уже есть — обновляем venue/time если не заданы
        const existing = matches.find((m) => `${m.date}|${m.home}|${m.away}` === key)
        if (existing) {
          if (!existing.venue && s.venue) {
            existing.venue = s.venue
          }
          if (!existing.time && s.time) {
            existing.time = s.time
          }
        }
      } else {
        // Новый матч — добавляем как SCHEDULED (без счёта)
        existingKeys.add(key)
        matches.push({
          msgId: s.msgId,
          date: s.date,
          home: s.home,
          away: s.away,
          venue: s.venue || null,
          address: null,
          time: s.time || null,
          homeScore: null,
          awayScore: null,
          winner: null,
        })
      }
    }
  }

  mergeSchedule(moscowData.matches, schedules.moscow || [], 'moscow')
  mergeSchedule(spbData.matches, schedules.spb || [], 'spb')

  // v2 данные уже чистые — все матчи с home+away
  const scheduledMoscow = moscowData.matches.filter((m) => m.homeScore === null).length
  const scheduledSpb = spbData.matches.filter((m) => m.homeScore === null).length
  console.log(
    `Матчи: СПб ${spbData.matches.length} (${scheduledSpb} scheduled), Москва ${moscowData.matches.length} (${scheduledMoscow} scheduled)`,
  )

  // -----------------------------------------------
  // 1. Очистка БД (обратный порядок зависимостей)
  // -----------------------------------------------
  console.log('\n1. Очистка БД...')
  const tablesToClean = [
    'PlayerSuspension',
    'AudienceVote',
    'JudgeVote',
    'JudgeSession',
    'Card',
    'PlayerPerformance',
    'MatchLineup',
    'MatchPhoto',
    'NewsPost',
    'DonateLink',
    'BracketSlot',
    'Stage',
    'Standings',
    'PlayerRating',
    'RosterApplication',
    'Match',
    'Tour',
    'Round',
    'League',
    'Transfer',
    'PlayerTeamSeason',
    'TeamSeason',
    'Season',
    'Player',
    'Team',
    'CityOrganizer',
    'Venue',
    'City',
  ]
  for (const table of tablesToClean) {
    try {
      const res = await pool.query(`DELETE FROM "${table}"`)
      if (res.rowCount && res.rowCount > 0) {
        console.log(`  ${table}: удалено ${res.rowCount}`)
      }
    } catch {
      // Таблица может не существовать — пропускаем
    }
  }

  // -----------------------------------------------
  // 2. Города
  // -----------------------------------------------
  console.log('\n2. Города...')
  const spbCityId = await upsert('City', withTimestamps({ id: cuid(), name: 'Санкт-Петербург', slug: 'spb' }), 'slug')
  const moscowCityId = await upsert('City', withTimestamps({ id: cuid(), name: 'Москва', slug: 'moskva' }), 'slug')
  console.log(`  СПб: ${spbCityId}, Москва: ${moscowCityId}`)

  const cityIdMap: Record<string, string> = { spb: spbCityId, moscow: moscowCityId }

  // -----------------------------------------------
  // 3. Площадки
  // -----------------------------------------------
  console.log('\n3. Площадки...')
  const venueMap = new Map<string, string>() // название → id

  async function seedVenues(venues: CleanVenue[], cityId: string) {
    for (const v of venues) {
      if (!v.name || v.name.length < 2) {
        continue
      }
      const slug = makeSlug(v.name)
      // Проверяем уникальность slug — при дубле добавляем суффикс
      const uniqueSlug = slug
      const existing = await pool.query(`SELECT "id" FROM "Venue" WHERE "slug" = $1`, [slug])
      if (existing.rows.length > 0) {
        // Если площадка с таким slug уже есть — пропускаем (дубль по городам)
        venueMap.set(v.name, existing.rows[0].id)
        continue
      }

      const id = await upsert(
        'Venue',
        withTimestamps({
          id: cuid(),
          name: v.name,
          slug: uniqueSlug,
          cityId,
          address: v.address ?? null,
        }),
        'slug',
      )
      venueMap.set(v.name, id)
    }
  }

  await seedVenues(spbData.venues, spbCityId)
  await seedVenues(moscowData.venues, moscowCityId)

  // Добавляем площадки из матчей, которых нет в venues[]
  async function seedVenuesFromMatches(matches: CleanMatch[], cityId: string) {
    for (const m of matches) {
      if (!m.venue || venueMap.has(m.venue)) {
        continue
      }
      const slug = makeSlug(m.venue)
      const existing = await pool.query(`SELECT "id" FROM "Venue" WHERE "slug" = $1`, [slug])
      if (existing.rows.length > 0) {
        venueMap.set(m.venue, existing.rows[0].id)
        continue
      }
      const id = await upsert(
        'Venue',
        withTimestamps({
          id: cuid(),
          name: m.venue,
          slug,
          cityId,
          address: m.address ?? null,
        }),
        'slug',
      )
      venueMap.set(m.venue, id)
    }
  }

  await seedVenuesFromMatches(spbData.matches, spbCityId)
  await seedVenuesFromMatches(moscowData.matches, moscowCityId)
  console.log(`  Всего площадок: ${venueMap.size}`)

  // -----------------------------------------------
  // 4. Сезоны
  // -----------------------------------------------
  console.log('\n4. Сезоны...')

  const seasonIds: Record<SeasonKey, string> = {} as any

  seasonIds['spb-s1'] = await upsert(
    'Season',
    withTimestamps({
      id: cuid(),
      name: 'КБС СПб Сезон 1',
      slug: 'spb-s1',
      cityId: spbCityId,
      startDate: new Date('2024-09-01').toISOString(),
      endDate: new Date('2024-12-31').toISOString(),
      status: 'FINISHED',
      format: 'ROUND_ROBIN',
      maxSubstitutions: 2,
      drawAllowed: true,
      homeVenuesEnabled: true,
      showLiveScore: true,
    }),
    'slug',
  )

  seasonIds['spb-s2'] = await upsert(
    'Season',
    withTimestamps({
      id: cuid(),
      name: 'КБС СПб Сезон 2',
      slug: 'spb-s2',
      cityId: spbCityId,
      startDate: new Date('2024-12-01').toISOString(),
      endDate: new Date('2025-05-31').toISOString(),
      status: 'FINISHED',
      format: 'ROUND_ROBIN',
      maxSubstitutions: 2,
      drawAllowed: true,
      homeVenuesEnabled: true,
      showLiveScore: true,
    }),
    'slug',
  )

  seasonIds['spb-s3'] = await upsert(
    'Season',
    withTimestamps({
      id: cuid(),
      name: 'КБС СПб Сезон 3',
      slug: 'spb-s3',
      cityId: spbCityId,
      startDate: new Date('2025-09-01').toISOString(),
      endDate: null,
      status: 'ACTIVE',
      format: 'ROUND_ROBIN',
      maxSubstitutions: 2,
      drawAllowed: true,
      homeVenuesEnabled: true,
      showLiveScore: true,
    }),
    'slug',
  )

  seasonIds['moscow-s1'] = await upsert(
    'Season',
    withTimestamps({
      id: cuid(),
      name: 'КБС Москва Сезон 1',
      slug: 'moscow-s1',
      cityId: moscowCityId,
      startDate: new Date('2025-02-01').toISOString(),
      endDate: new Date('2025-12-31').toISOString(),
      status: 'FINISHED',
      format: 'ROUND_ROBIN',
      maxSubstitutions: 2,
      drawAllowed: false,
      homeVenuesEnabled: false,
      showLiveScore: true,
    }),
    'slug',
  )

  seasonIds['moscow-s2'] = await upsert(
    'Season',
    withTimestamps({
      id: cuid(),
      name: 'КБС Москва Сезон 2',
      slug: 'moscow-s2',
      cityId: moscowCityId,
      startDate: new Date('2026-02-01').toISOString(),
      endDate: null,
      status: 'ACTIVE',
      format: 'SWISS',
      maxSubstitutions: 2,
      drawAllowed: false,
      homeVenuesEnabled: false,
      showLiveScore: true,
    }),
    'slug',
  )

  for (const [key, id] of Object.entries(seasonIds)) {
    console.log(`  ${key}: ${id}`)
  }

  // -----------------------------------------------
  // 5. Лиги
  // -----------------------------------------------
  console.log('\n5. Лиги...')
  const leagueIds: Record<string, string> = {}

  // СПб С1 — одна лига
  leagueIds['spb-s1-main'] = await upsertComposite(
    'League',
    {
      id: cuid(),
      name: 'Основная',
      seasonId: seasonIds['spb-s1'],
      order: 1,
    },
    ['seasonId', 'name'],
  )

  // СПб С2 — две лиги
  leagueIds['spb-s2-vl'] = await upsertComposite(
    'League',
    {
      id: cuid(),
      name: 'Высшая лига',
      seasonId: seasonIds['spb-s2'],
      order: 1,
    },
    ['seasonId', 'name'],
  )
  leagueIds['spb-s2-1l'] = await upsertComposite(
    'League',
    {
      id: cuid(),
      name: 'Первая лига',
      seasonId: seasonIds['spb-s2'],
      order: 2,
    },
    ['seasonId', 'name'],
  )

  // СПб С3, Москва С1, Москва С2 — по одной лиге
  for (const sk of ['spb-s3', 'moscow-s1', 'moscow-s2'] as SeasonKey[]) {
    leagueIds[`${sk}-main`] = await upsertComposite(
      'League',
      {
        id: cuid(),
        name: 'Основная',
        seasonId: seasonIds[sk],
        order: 1,
      },
      ['seasonId', 'name'],
    )
  }

  console.log(`  Лиг: ${Object.keys(leagueIds).length}`)

  // -----------------------------------------------
  // 6. Раунды и Туры
  // -----------------------------------------------
  console.log('\n6. Раунды...')
  const roundIds: Record<SeasonKey, string> = {} as any

  for (const sk of Object.keys(seasonIds) as SeasonKey[]) {
    roundIds[sk] = await upsertComposite(
      'Round',
      {
        id: cuid(),
        name: 'Круг 1',
        seasonId: seasonIds[sk],
        number: 1,
      },
      ['seasonId', 'number'],
    )
  }

  // Туры — один на каждый сезон (упрощённо, без детального разбиения)
  const tourIds: Record<SeasonKey, string> = {} as any
  for (const sk of Object.keys(seasonIds) as SeasonKey[]) {
    tourIds[sk] = await upsertComposite(
      'Tour',
      {
        id: cuid(),
        roundId: roundIds[sk],
        number: 1,
      },
      ['roundId', 'number'],
    )
  }

  // -----------------------------------------------
  // 7. Команды
  // -----------------------------------------------
  console.log('\n7. Команды...')
  const teamMap = new Map<string, string>() // название → id
  const teamInfoMap = new Map<string, CleanTeam>() // название → данные команды

  // Собираем инфо о командах из teams[]
  for (const t of [...spbData.teams, ...moscowData.teams]) {
    if (!teamInfoMap.has(t.name)) {
      teamInfoMap.set(t.name, t)
    }
  }

  // Определяем город команды
  function getTeamCity(teamName: string): 'spb' | 'moscow' {
    if (ALL_SPB_TEAMS.has(teamName)) {
      return 'spb'
    }
    if (ALL_MOSCOW_TEAMS.has(teamName)) {
      return 'moscow'
    }
    // Fallback — ищем в ростерах
    for (const r of spbData.rosters) {
      if (r.team === teamName) {
        return 'spb'
      }
    }
    return 'moscow'
  }

  // Собираем все уникальные названия команд
  // Белый список команд — ТОЛЬКО из констант, НЕ из матчей/ростеров
  // (матчи содержат мусорные названия вроде "пн, ЧУМНЫЕ", "ОБОРМОТЫ в бильярдном клубе")
  const allTeamNames = new Set<string>()
  for (const t of [...ALL_SPB_TEAMS, ...ALL_MOSCOW_TEAMS]) {
    allTeamNames.add(t)
  }
  // Команды из teams[] JSON файлов (уже почищены)
  for (const t of [...spbData.teams, ...moscowData.teams]) {
    allTeamNames.add(t.name)
  }

  // Переименования
  const PREVIOUS_NAMES: Record<string, string[]> = {
    Вином: ['Болт'],
    Ива: ['Софийка'],
  }

  for (const name of allTeamNames) {
    const city = getTeamCity(name)
    const info = teamInfoMap.get(name)
    const homeVenueId = info?.homeVenue ? (venueMap.get(info.homeVenue) ?? null) : null
    const previousNames = PREVIOUS_NAMES[name] ?? []

    const id = await upsert(
      'Team',
      withTimestamps({
        id: cuid(),
        name,
        slug: makeSlug(name),
        cityId: cityIdMap[city],
        homeVenueId,
        telegramLink: info?.telegramUrl ?? null,
        previousNames: `{${previousNames.map((n) => `"${n}"`).join(',')}}`,
      }),
      'slug',
    )
    teamMap.set(name, id)
  }
  console.log(`  Команд: ${teamMap.size}`)

  // -----------------------------------------------
  // 8. TeamSeason — привязка команд к сезонам
  // -----------------------------------------------
  console.log('\n8. TeamSeason...')
  const teamSeasonMap = new Map<string, string>() // "teamName:seasonKey" → id
  let tsCount = 0

  /** Определить leagueId для команды в сезоне */
  function getLeagueId(teamName: string, sk: SeasonKey): string {
    if (sk === 'spb-s2') {
      if (SPB_S2_VL.has(teamName)) {
        return leagueIds['spb-s2-vl']
      }
      if (SPB_S2_1L.has(teamName)) {
        return leagueIds['spb-s2-1l']
      }
      return leagueIds['spb-s2-vl'] // fallback
    }
    return leagueIds[`${sk}-main`]
  }

  for (const name of allTeamNames) {
    const city = getTeamCity(name)
    const seasons = getTeamSeasons(name, city)
    for (const sk of seasons) {
      const key = `${name}:${sk}`
      const teamId = teamMap.get(name)!
      const id = await upsertComposite(
        'TeamSeason',
        {
          id: cuid(),
          teamId,
          seasonId: seasonIds[sk],
          leagueId: getLeagueId(name, sk),
        },
        ['teamId', 'seasonId'],
      )
      teamSeasonMap.set(key, id)
      tsCount++
    }
  }
  console.log(`  TeamSeason: ${tsCount}`)

  // -----------------------------------------------
  // 9. Игроки
  // -----------------------------------------------
  console.log('\n9. Игроки...')
  const playerMap = new Map<string, string>() // нормализованное имя → id

  function normalizePlayerName(name: string): string {
    return name.trim().replace(/\s+/g, ' ')
  }

  // Собираем уникальных игроков из ростеров
  const allPlayerNames = new Set<string>()
  for (const r of [...spbData.rosters, ...moscowData.rosters]) {
    for (const p of r.players) {
      const normalized = normalizePlayerName(p)
      if (normalized.length >= 2) {
        allPlayerNames.add(normalized)
      }
    }
  }

  // Профили — индекс по имени для bio
  const profileByName = new Map<string, CleanProfile>()
  for (const p of [...spbData.profiles, ...moscowData.profiles]) {
    const norm = normalizePlayerName(p.name)
    if (norm.length >= 3 && !profileByName.has(norm)) {
      profileByName.set(norm, p)
    }
  }

  // Определяем город игрока из ростера
  function getPlayerCity(playerName: string): string | null {
    for (const r of spbData.rosters) {
      if (r.players.some((p) => normalizePlayerName(p) === playerName)) {
        return spbCityId
      }
    }
    for (const r of moscowData.rosters) {
      if (r.players.some((p) => normalizePlayerName(p) === playerName)) {
        return moscowCityId
      }
    }
    return null
  }

  for (const name of allPlayerNames) {
    const profile = profileByName.get(name)
    const cityId = getPlayerCity(name)
    const slug = makeSlug(name)

    // Проверка уникальности slug
    const existing = await pool.query(`SELECT "id" FROM "Player" WHERE "slug" = $1`, [slug])
    if (existing.rows.length > 0) {
      playerMap.set(name, existing.rows[0].id)
      continue
    }

    const id = await upsert(
      'Player',
      withTimestamps({
        id: cuid(),
        name,
        slug,
        cityId,
        bio: profile?.bio ?? null,
      }),
      'slug',
    )
    playerMap.set(name, id)
  }
  console.log(`  Игроков: ${playerMap.size}`)

  // -----------------------------------------------
  // 10. PlayerTeamSeason — привязка игроков к командам
  // -----------------------------------------------
  console.log('\n10. PlayerTeamSeason...')
  let ptsCount = 0

  for (const r of [...spbData.rosters, ...moscowData.rosters]) {
    const city: 'spb' | 'moscow' = spbData.rosters.includes(r) ? 'spb' : 'moscow'
    const sk = getSeasonKey(r.date, city)
    if (!sk) {
      continue
    }

    const tsKey = `${r.team}:${sk}`
    const teamSeasonId = teamSeasonMap.get(tsKey)
    if (!teamSeasonId) {
      continue
    }

    for (const p of r.players) {
      const norm = normalizePlayerName(p)
      const playerId = playerMap.get(norm)
      if (!playerId) {
        continue
      }

      try {
        await upsertComposite(
          'PlayerTeamSeason',
          {
            id: cuid(),
            playerId,
            teamSeasonId,
            role: 'PLAYER',
          },
          ['playerId', 'teamSeasonId'],
        )
        ptsCount++
      } catch {
        // Дубликат — пропускаем
      }
    }
  }
  console.log(`  PlayerTeamSeason: ${ptsCount}`)

  // -----------------------------------------------
  // 11. Матчи
  // -----------------------------------------------
  console.log('\n11. Матчи...')
  let matchCount = 0
  let skippedMatches = 0

  async function seedMatches(matches: CleanMatch[], city: 'spb' | 'moscow') {
    for (const m of matches) {
      if (!m.home || !m.away) {
        skippedMatches++
        continue
      }

      const sk = getSeasonKey(m.date, city)
      if (!sk) {
        skippedMatches++
        continue
      }

      // Не добавляем SCHEDULED матчи для завершённых сезонов
      const isFinishedSeason = sk === 'spb-s1' || sk === 'spb-s2' || sk === 'moscow-s1'
      if (m.homeScore == null && isFinishedSeason) {
        skippedMatches++
        continue
      }

      const homeTsKey = `${m.home}:${sk}`
      const awayTsKey = `${m.away}:${sk}`
      const homeTeamId = teamSeasonMap.get(homeTsKey)
      const awayTeamId = teamSeasonMap.get(awayTsKey)

      if (!homeTeamId || !awayTeamId) {
        // Команда не в белом списке этого сезона — пробуем создать TeamSeason
        if (!homeTeamId && teamMap.has(m.home)) {
          const tid = teamMap.get(m.home)!
          const lid = getLeagueId(m.home, sk)
          const tsId = await upsertComposite(
            'TeamSeason',
            {
              id: cuid(),
              teamId: tid,
              seasonId: seasonIds[sk],
              leagueId: lid,
            },
            ['teamId', 'seasonId'],
          )
          teamSeasonMap.set(homeTsKey, tsId)
        }
        if (!awayTeamId && teamMap.has(m.away)) {
          const tid = teamMap.get(m.away)!
          const lid = getLeagueId(m.away, sk)
          const tsId = await upsertComposite(
            'TeamSeason',
            {
              id: cuid(),
              teamId: tid,
              seasonId: seasonIds[sk],
              leagueId: lid,
            },
            ['teamId', 'seasonId'],
          )
          teamSeasonMap.set(awayTsKey, tsId)
        }
      }

      const finalHomeId = teamSeasonMap.get(homeTsKey)
      const finalAwayId = teamSeasonMap.get(awayTsKey)
      if (!finalHomeId || !finalAwayId) {
        skippedMatches++
        continue
      }

      const venueId = m.venue ? (venueMap.get(m.venue) ?? null) : null
      const hasScore = m.homeScore != null && m.awayScore != null
      const status = hasScore ? 'FINISHED' : 'SCHEDULED'

      // Турнирные очки
      let homePoints: number | null = null
      let awayPoints: number | null = null
      if (hasScore) {
        if (m.homeScore! > m.awayScore!) {
          homePoints = 1
          awayPoints = 0
        } else if (m.homeScore! < m.awayScore!) {
          homePoints = 0
          awayPoints = 1
        } else {
          homePoints = 0.5
          awayPoints = 0.5
        }
      }

      // scheduledAt из date + time
      let scheduledAt: string | null = null
      if (m.date) {
        const timePart = m.time ?? '19:00'
        scheduledAt = new Date(`${m.date}T${timePart}:00`).toISOString()
      }

      try {
        await pool.query(
          `INSERT INTO "Match" (
            "id", "tourId", "leagueId", "homeTeamId", "awayTeamId",
            "venueId", "scheduledAt", "status",
            "homeScore", "awayScore", "homePoints", "awayPoints",
            "scorerToken", "presenterToken", "homeCoachToken", "awayCoachToken",
            "createdAt", "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          ON CONFLICT DO NOTHING`,
          [
            cuid(),
            tourIds[sk],
            getLeagueId(m.home, sk),
            finalHomeId,
            finalAwayId,
            venueId,
            scheduledAt,
            status,
            m.homeScore ?? 0,
            m.awayScore ?? 0,
            homePoints,
            awayPoints,
            cuid(),
            cuid(),
            cuid(),
            cuid(),
            NOW,
            NOW,
          ],
        )
        matchCount++
      } catch (err: any) {
        console.error(`  Ошибка матча ${m.home} vs ${m.away}: ${err.message}`)
        skippedMatches++
      }
    }
  }

  await seedMatches(spbData.matches, 'spb')
  await seedMatches(moscowData.matches, 'moscow')
  console.log(`  Матчей загружено: ${matchCount}, пропущено: ${skippedMatches}`)

  // -----------------------------------------------
  // 12. Standings — пересчёт из матчей
  // -----------------------------------------------
  console.log('\n12. Standings...')
  let standingsCount = 0

  // Для каждого TeamSeason считаем статистику из матчей
  const standingsData = new Map<
    string,
    {
      played: number
      won: number
      drawn: number
      lost: number
      points: number
      scored: number
      conceded: number
    }
  >()

  // Загружаем матчи с информацией о сезоне для группировки
  const matchRows = await pool.query(
    `SELECT m."homeTeamId", m."awayTeamId", m."homeScore", m."awayScore", m."homePoints", m."awayPoints",
            ts_h."seasonId" as "seasonId"
     FROM "Match" m
     JOIN "TeamSeason" ts_h ON ts_h."id" = m."homeTeamId"
     WHERE m."status" = 'FINISHED'`,
  )

  for (const row of matchRows.rows) {
    // Home
    if (!standingsData.has(row.homeTeamId)) {
      standingsData.set(row.homeTeamId, { played: 0, won: 0, drawn: 0, lost: 0, points: 0, scored: 0, conceded: 0 })
    }
    const home = standingsData.get(row.homeTeamId)!
    home.played++
    home.scored += Number(row.homeScore)
    home.conceded += Number(row.awayScore)
    if (row.homePoints === 1) {
      home.won++
    } else if (row.homePoints === 0.5) {
      home.drawn++
    } else if (row.homePoints === 0) {
      home.lost++
    }
    home.points += Number(row.homePoints ?? 0)

    // Away
    if (!standingsData.has(row.awayTeamId)) {
      standingsData.set(row.awayTeamId, { played: 0, won: 0, drawn: 0, lost: 0, points: 0, scored: 0, conceded: 0 })
    }
    const away = standingsData.get(row.awayTeamId)!
    away.played++
    away.scored += Number(row.awayScore)
    away.conceded += Number(row.homeScore)
    if (row.awayPoints === 1) {
      away.won++
    } else if (row.awayPoints === 0.5) {
      away.drawn++
    } else if (row.awayPoints === 0) {
      away.lost++
    }
    away.points += Number(row.awayPoints ?? 0)
  }

  // Группируем по сезону для позиционирования внутри каждого сезона
  const teamSeasonToSeason = new Map<string, string>()
  const allTeamSeasons = await pool.query(`SELECT "id", "seasonId" FROM "TeamSeason"`)
  for (const row of allTeamSeasons.rows) {
    teamSeasonToSeason.set(row.id, row.seasonId)
  }

  // Группируем standings по сезонам
  const standingsBySeason = new Map<
    string,
    Array<[string, typeof standingsData extends Map<string, infer V> ? V : never]>
  >()
  for (const [tsId, stats] of standingsData) {
    const seasonId = teamSeasonToSeason.get(tsId)
    if (!seasonId) {
      continue
    }
    if (!standingsBySeason.has(seasonId)) {
      standingsBySeason.set(seasonId, [])
    }
    standingsBySeason.get(seasonId)!.push([tsId, stats])
  }

  // Сортируем и записываем per-season
  for (const [_seasonId, entries] of standingsBySeason) {
    entries.sort((a, b) => b[1].points - a[1].points || b[1].scored - b[1].conceded - (a[1].scored - a[1].conceded))
    let position = 0
    for (const [teamSeasonId, stats] of entries) {
      position++
      try {
        await pool.query(
          `INSERT INTO "Standings" ("id", "teamSeasonId", "position", "played", "won", "drawn", "lost", "points", "scored", "conceded", "difference")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT ("teamSeasonId") DO NOTHING`,
          [
            cuid(),
            teamSeasonId,
            position,
            stats.played,
            stats.won,
            stats.drawn,
            stats.lost,
            stats.points,
            stats.scored,
            stats.conceded,
            stats.scored - stats.conceded,
          ],
        )
        standingsCount++
      } catch {
        // Пропускаем
      }
    }
  }
  console.log(`  Standings: ${standingsCount}`)

  // -----------------------------------------------
  // 13. Этапы турнира для moscow-s2 (без сетки — швейцарка ещё идёт)
  // -----------------------------------------------
  console.log('\n13. Этапы Moscow S2 (без bracket — швейцарка не завершена)...')

  const moscowS2Id = seasonIds['moscow-s2']

  // Создаём Stage записи (для будущей генерации сетки из админки)
  const stageTypes = [
    { name: 'Групповой этап (швейцарка)', type: 'GROUP', order: 1 },
    { name: 'Верхняя сетка (Winners)', type: 'PLAYOFF_UPPER', order: 2 },
    { name: 'Нижняя сетка (Losers)', type: 'PLAYOFF_LOWER', order: 3 },
    { name: 'Гранд-финал', type: 'GRAND_FINAL', order: 4 },
  ]

  for (const st of stageTypes) {
    await upsertComposite(
      'Stage',
      { id: cuid(), seasonId: moscowS2Id, name: st.name, type: st.type, order: st.order },
      ['seasonId', 'order'],
    )
  }
  console.log(`  Stages: ${stageTypes.length} (bracket будет сгенерирован после швейцарки)`)

  // Генерируем слоты сетки
  // BracketSlot НЕ генерируются — швейцарка ещё не завершена.
  // Сетка будет создана из админки после 5-го раунда швейцарки.

  // -----------------------------------------------
  // Итоги
  // -----------------------------------------------
  console.log('\n=== Готово! ===')
  console.log(`Города: 2`)
  console.log(`Площадки: ${venueMap.size}`)
  console.log(`Сезоны: ${Object.keys(seasonIds).length}`)
  console.log(`Лиги: ${Object.keys(leagueIds).length}`)
  console.log(`Команды: ${teamMap.size}`)
  console.log(`TeamSeason: ${tsCount}`)
  console.log(`Игроки: ${playerMap.size}`)
  console.log(`PlayerTeamSeason: ${ptsCount}`)
  console.log(`Матчи: ${matchCount} (пропущено: ${skippedMatches})`)
  console.log(`Standings: ${standingsCount}`)

  await pool.end()
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
