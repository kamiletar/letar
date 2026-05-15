/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Объединение v2 результатов AI-экстракции (Sonnet 4.6) из чанков.
 * Дедупликация, нормализация, статистика. Версия 2.
 *
 * Запуск: bun run scripts/migrate/merge-v2.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeTeamName, normalizeVenueName } from './normalize'

const CHUNKS_DIR = join(import.meta.dirname, 'chunks')
const CHUNKS_SPB_DIR = join(import.meta.dirname, 'chunks-spb')
const OUTPUT_DIR = join(import.meta.dirname, 'manual-data')

interface ExtractedData {
  matches: any[]
  rosters: any[]
  profiles: any[]
  venues: any[]
  teams: any[]
}

// Нормализация из общего модуля
// normalizeTeamName и normalizeVenueName импортированы из ./normalize

// ============================================
// Чтение и объединение чанков
// ============================================

function readChunks(dir: string, count: number): ExtractedData {
  const merged: ExtractedData = { matches: [], rosters: [], profiles: [], venues: [], teams: [] }

  for (let i = 1; i <= count; i++) {
    const file = join(dir, `chunk-${i}-extracted-v2.json`)
    if (!existsSync(file)) {
      console.warn(`  ⚠ Чанк ${i} не найден: ${file}`)
      continue
    }

    const data = JSON.parse(readFileSync(file, 'utf-8'))
    const stats = [
      `${data.matches?.length || 0} матчей`,
      `${data.rosters?.length || 0} составов`,
      `${data.profiles?.length || 0} профилей`,
      `${data.venues?.length || 0} площадок`,
      `${data.teams?.length || 0} команд`,
    ].join(', ')
    console.log(`  Чанк ${i}: ${stats}`)

    if (data.matches) {
      merged.matches.push(...data.matches)
    }
    if (data.rosters) {
      merged.rosters.push(...data.rosters)
    }
    if (data.profiles) {
      merged.profiles.push(...data.profiles)
    }
    if (data.venues) {
      merged.venues.push(...data.venues)
    }
    if (data.teams) {
      merged.teams.push(...data.teams)
    }
  }

  return merged
}

// ============================================
// Дедупликация и нормализация
// ============================================

function deduplicateAndClean(data: ExtractedData, city: string): ExtractedData {
  const clean: ExtractedData = { matches: [], rosters: [], profiles: [], venues: [], teams: [] }

  // Матчи: дедупликация по date+home+away (объединяем анонс + результат)
  const matchMap = new Map<string, any>()
  for (const m of data.matches) {
    const home = normalizeTeamName(m.home)
    const away = normalizeTeamName(m.away)
    if (!home || !away) {
      console.warn(`  ⚠ Матч ${m.msgId} пропущен — null home/away: ${m.home} vs ${m.away}`)
      continue
    }

    const date = m.date?.substring(0, 10)
    const key = `${date}|${home}|${away}`

    const homeScore = typeof m.homeScore === 'number' ? m.homeScore : null
    const awayScore = typeof m.awayScore === 'number' ? m.awayScore : null

    // Пересчитываем winner по счёту (агенты часто путают)
    let winner: string | null = null
    if (homeScore !== null && awayScore !== null) {
      if (homeScore > awayScore) {
        winner = home
      } else if (awayScore > homeScore) {
        winner = away
      }
      // Ничья — winner = null
    } else {
      // Нет счёта — берём из данных
      winner = normalizeTeamName(m.winner) || null
    }

    const venue = m.venue ? normalizeVenueName(m.venue) : null

    const existing = matchMap.get(key)
    if (existing) {
      // Объединяем: предпочитаем данные с score
      if (homeScore !== null && existing.homeScore === null) {
        existing.homeScore = homeScore
        existing.awayScore = awayScore
        existing.winner = winner
      }
      if (venue && !existing.venue) {
        existing.venue = venue
      }
      if (m.time && !existing.time) {
        existing.time = m.time
      }
    } else {
      matchMap.set(key, {
        msgId: m.msgId,
        date,
        home,
        away,
        homeScore,
        awayScore,
        winner,
        venue,
        time: m.time || null,
      })
    }
  }
  clean.matches = [...matchMap.values()]

  // Мусорные команды (не существуют, артефакт парсинга)
  const JUNK_TEAMS = new Set(['РО', 'БЮ', 'Sofijka'])

  // Составы: дедупликация по msgId + team
  const seenRosters = new Set<string>()
  for (const r of data.rosters) {
    const rawTeam = (r.team || '').trim()
    if (JUNK_TEAMS.has(rawTeam)) {
      continue
    }
    const team = normalizeTeamName(rawTeam)
    if (!team) {
      continue
    }
    const key = `${r.msgId}:${team}`
    if (seenRosters.has(key)) {
      continue
    }
    seenRosters.add(key)

    const players = (r.players || []).map((p: string) => p.trim()).filter((p: string) => p.length >= 2)

    if (players.length === 0) {
      continue
    }

    clean.rosters.push({
      msgId: r.msgId,
      date: r.date?.substring(0, 10),
      team,
      players,
      coach: r.coach || null,
    })
  }

  // Площадки: нормализация имён + дедупликация
  const seenVenues = new Map<string, any>()
  for (const v of data.venues) {
    let name = (v.name || '').trim()
    if (!name || name.length > 80) {
      continue
    }
    name = normalizeVenueName(name)
    if (name.length < 2 || name.length > 60) {
      continue
    }

    const existing = seenVenues.get(name)
    if (!existing || (v.address && v.address.length > (existing.address?.length || 0))) {
      seenVenues.set(name, { name, address: v.address || null, city })
    }
  }
  clean.venues = [...seenVenues.values()]

  // Команды: дедупликация по имени
  const seenTeams = new Map<string, any>()
  for (const t of data.teams) {
    const name = normalizeTeamName(t.name)
    if (!name) {
      continue
    }
    const existing = seenTeams.get(name)
    seenTeams.set(name, { ...existing, ...t, name })
  }
  clean.teams = [...seenTeams.values()]

  // Профили: дедупликация по имени
  const seenProfiles = new Map<string, any>()
  for (const p of data.profiles) {
    let name = (p.name || '').trim()
    if (name.includes('\n')) {
      const parts = name.split('\n').filter((s: string) => s.trim())
      name = parts[parts.length - 1].trim()
    }
    if (name.length < 3 || name.length > 80) {
      continue
    }
    if (!seenProfiles.has(name)) {
      seenProfiles.set(name, {
        name,
        team: normalizeTeamName(p.team) || p.team || null,
        role: p.role || null,
        bio: (p.bio || '').substring(0, 500) || null,
      })
    }
  }
  clean.profiles = [...seenProfiles.values()]

  return clean
}

// ============================================
// Main
// ============================================

function main() {
  console.log('=== Merge v2: Sonnet 4.6 экстракция ===\n')

  // Москва (6 чанков)
  console.log('📍 Москва:')
  const moscowRaw = readChunks(CHUNKS_DIR, 6)
  const moscow = deduplicateAndClean(moscowRaw, 'Москва')

  console.log(`\n  До дедупликации: ${moscowRaw.matches.length} матчей`)
  console.log(
    `  После: ${moscow.matches.length} матчей, ${moscow.rosters.length} составов, ${moscow.profiles.length} профилей, ${moscow.venues.length} площадок, ${moscow.teams.length} команд`
  )

  const mNullHA = moscow.matches.filter((m) => !m.home || !m.away).length
  console.log(`  null home/away: ${mNullHA}`)

  // Уникальные игроки из составов
  const mPlayers = new Set<string>()
  moscow.rosters.forEach((r) => r.players.forEach((p: string) => mPlayers.add(p)))
  console.log(`  Уникальных игроков: ${mPlayers.size}`)

  // Уникальные команды в матчах
  const mTeams = new Set<string>()
  moscow.matches.forEach((m) => {
    mTeams.add(m.home)
    mTeams.add(m.away)
  })
  console.log(`  Команд в матчах: ${mTeams.size} — ${[...mTeams].sort().join(', ')}`)

  writeFileSync(join(OUTPUT_DIR, 'moscow-v2.json'), JSON.stringify(moscow, null, 2), 'utf-8')

  // СПб (7 чанков)
  console.log('\n📍 СПб:')
  const spbRaw = readChunks(CHUNKS_SPB_DIR, 7)
  const spb = deduplicateAndClean(spbRaw, 'Санкт-Петербург')

  console.log(`\n  До дедупликации: ${spbRaw.matches.length} матчей`)
  console.log(
    `  После: ${spb.matches.length} матчей, ${spb.rosters.length} составов, ${spb.profiles.length} профилей, ${spb.venues.length} площадок, ${spb.teams.length} команд`
  )

  const sNullHA = spb.matches.filter((m) => !m.home || !m.away).length
  console.log(`  null home/away: ${sNullHA}`)

  const sPlayers = new Set<string>()
  spb.rosters.forEach((r) => r.players.forEach((p: string) => sPlayers.add(p)))
  console.log(`  Уникальных игроков: ${sPlayers.size}`)

  const sTeams = new Set<string>()
  spb.matches.forEach((m) => {
    sTeams.add(m.home)
    sTeams.add(m.away)
  })
  console.log(`  Команд в матчах: ${sTeams.size} — ${[...sTeams].sort().join(', ')}`)

  writeFileSync(join(OUTPUT_DIR, 'spb-v2.json'), JSON.stringify(spb, null, 2), 'utf-8')

  // Сравнение с v1
  console.log('\n=== СРАВНЕНИЕ v1 (Haiku) vs v2 (Sonnet) ===')
  const v1Moscow = JSON.parse(readFileSync(join(OUTPUT_DIR, 'moscow-clean.json'), 'utf-8'))
  const v1Spb = JSON.parse(readFileSync(join(OUTPUT_DIR, 'spb-clean.json'), 'utf-8'))
  const v1mNull = v1Moscow.matches.filter((m: any) => !m.home || !m.away).length
  const v1sNull = v1Spb.matches.filter((m: any) => !m.home || !m.away).length

  console.log(
    `\n  Москва матчи: ${v1Moscow.matches.length} → ${moscow.matches.length} (null h/a: ${v1mNull} → ${mNullHA})`
  )
  console.log(`  СПб матчи: ${v1Spb.matches.length} → ${spb.matches.length} (null h/a: ${v1sNull} → ${sNullHA})`)
  console.log(`  Москва профили: ${v1Moscow.profiles.length} → ${moscow.profiles.length}`)
  console.log(`  СПб профили: ${v1Spb.profiles.length} → ${spb.profiles.length}`)
  console.log(`  Москва составы: ${v1Moscow.rosters.length} → ${moscow.rosters.length}`)
  console.log(`  СПб составы: ${v1Spb.rosters.length} → ${spb.rosters.length}`)

  console.log('\n✅ Готово!')
  console.log(`  moscow-v2.json: ${(readFileSync(join(OUTPUT_DIR, 'moscow-v2.json')).length / 1024).toFixed(0)} KB`)
  console.log(`  spb-v2.json: ${(readFileSync(join(OUTPUT_DIR, 'spb-v2.json')).length / 1024).toFixed(0)} KB`)
}

main()
