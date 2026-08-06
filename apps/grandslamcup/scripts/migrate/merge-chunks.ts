/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Объединение результатов AI-экстракции из 6 чанков в один файл.
 * Дедупликация, нормализация имён команд, статистика.
 *
 * Запуск: bun run scripts/migrate/merge-chunks.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHUNKS_DIR = join(import.meta.dirname, 'chunks')
const OUTPUT_DIR = join(import.meta.dirname, 'manual-data')
const OUTPUT_FILE = join(OUTPUT_DIR, 'moscow-ai-extracted.json')

interface ExtractedData {
  matches: any[]
  rosters: any[]
  profiles: any[]
  venues: any[]
  rounds: any[]
  teams: any[]
}

function main() {
  console.log('Объединение результатов AI-экстракции...\n')

  const merged: ExtractedData = {
    matches: [],
    rosters: [],
    profiles: [],
    venues: [],
    rounds: [],
    teams: [],
  }

  // Читаем все 6 чанков
  for (let i = 1; i <= 6; i++) {
    const file = join(CHUNKS_DIR, `chunk-${i}-extracted.json`)
    if (!existsSync(file)) {
      console.warn(`  Чанк ${i} не найден: ${file}`)
      continue
    }

    const data: ExtractedData = JSON.parse(readFileSync(file, 'utf-8'))
    console.log(
      `  Чанк ${i}: ${data.matches?.length || 0} матчей, ${data.rosters?.length || 0} составов, ${
        data.profiles?.length || 0
      } профилей, ${data.venues?.length || 0} площадок, ${data.rounds?.length || 0} раундов, ${
        data.teams?.length || 0
      } команд`,
    )

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
    if (data.rounds) {
      merged.rounds.push(...data.rounds)
    }
    if (data.teams) {
      merged.teams.push(...data.teams)
    }
  }

  console.log('\n=== До дедупликации ===')
  console.log(`  Матчей: ${merged.matches.length}`)
  console.log(`  Составов: ${merged.rosters.length}`)
  console.log(`  Профилей: ${merged.profiles.length}`)
  console.log(`  Площадок: ${merged.venues.length}`)
  console.log(`  Раундов: ${merged.rounds.length}`)
  console.log(`  Команд: ${merged.teams.length}`)

  // Дедупликация матчей по msgId
  const seenMatchIds = new Set<number>()
  merged.matches = merged.matches.filter((m) => {
    if (seenMatchIds.has(m.msgId)) {
      return false
    }
    seenMatchIds.add(m.msgId)
    return true
  })

  // Дедупликация составов по msgId + team
  const seenRosters = new Set<string>()
  merged.rosters = merged.rosters.filter((r) => {
    const key = `${r.msgId}:${r.team}`
    if (seenRosters.has(key)) {
      return false
    }
    seenRosters.add(key)
    return true
  })

  // Дедупликация площадок по name
  const seenVenues = new Map<string, any>()
  for (const v of merged.venues) {
    const name = v.name?.trim()
    if (!name) {
      continue
    }
    const existing = seenVenues.get(name)
    // Оставляем версию с более полным адресом
    if (!existing || (v.address && v.address.length > (existing.address?.length || 0))) {
      seenVenues.set(name, v)
    }
  }
  merged.venues = [...seenVenues.values()]

  // Дедупликация команд по name
  const seenTeams = new Map<string, any>()
  for (const t of merged.teams) {
    const name = t.name?.trim()
    if (!name) {
      continue
    }
    const existing = seenTeams.get(name)
    if (!existing || (t.telegramUrl && !existing.telegramUrl)) {
      seenTeams.set(name, { ...existing, ...t, name })
    }
  }
  merged.teams = [...seenTeams.values()]

  // Дедупликация профилей по name
  const seenProfiles = new Map<string, any>()
  for (const p of merged.profiles) {
    const name = p.name?.trim()
    if (!name) {
      continue
    }
    if (!seenProfiles.has(name)) {
      seenProfiles.set(name, p)
    }
  }
  merged.profiles = [...seenProfiles.values()]

  console.log('\n=== После дедупликации ===')
  console.log(`  Матчей: ${merged.matches.length}`)
  console.log(`  Составов: ${merged.rosters.length}`)
  console.log(`  Профилей: ${merged.profiles.length}`)
  console.log(`  Площадок: ${merged.venues.length}`)
  console.log(`  Раундов: ${merged.rounds.length}`)
  console.log(`  Команд: ${merged.teams.length}`)

  // Уникальные игроки из составов
  const allPlayers = new Set<string>()
  for (const r of merged.rosters) {
    if (r.players) {
      r.players.forEach((p: string) => allPlayers.add(p.trim()))
    }
  }
  console.log(`  Уникальных игроков: ${allPlayers.size}`)

  // Уникальные команды из матчей
  const matchTeams = new Set<string>()
  for (const m of merged.matches) {
    if (m.home) {
      matchTeams.add(m.home.trim())
    }
    if (m.away) {
      matchTeams.add(m.away.trim())
    }
  }
  console.log(`  Команд в матчах: ${matchTeams.size}`)
  console.log(`  Названия: ${[...matchTeams].sort().join(', ')}`)

  // Сохраняем
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }
  writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2), 'utf-8')
  console.log(`\nСохранено: ${OUTPUT_FILE}`)
  console.log(`Размер: ${(readFileSync(OUTPUT_FILE).length / 1024).toFixed(0)} KB`)
}

main()
