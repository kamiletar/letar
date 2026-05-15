/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Объединение результатов AI-экстракции СПб из 7 чанков.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHUNKS_DIR = join(import.meta.dirname, 'chunks-spb')
const OUTPUT_DIR = join(import.meta.dirname, 'manual-data')
const OUTPUT_FILE = join(OUTPUT_DIR, 'spb-ai-extracted.json')

function main() {
  console.log('Объединение результатов СПб AI-экстракции...\n')

  const merged: Record<string, any[]> = {
    matches: [],
    rosters: [],
    profiles: [],
    venues: [],
    rounds: [],
    teams: [],
  }

  for (let i = 1; i <= 7; i++) {
    const file = join(CHUNKS_DIR, `chunk-${i}-extracted.json`)
    if (!existsSync(file)) {
      console.warn(`  Чанк ${i} не найден`)
      continue
    }
    const data = JSON.parse(readFileSync(file, 'utf-8'))
    const keys = ['matches', 'rosters', 'profiles', 'venues', 'rounds', 'teams']
    const counts = keys.map((k) => `${data[k]?.length || 0} ${k}`).join(', ')
    console.log(`  Чанк ${i}: ${counts}`)

    for (const k of keys) {
      if (data[k]) {
        merged[k].push(...data[k])
      }
    }
  }

  console.log('\n=== До дедупликации ===')
  for (const [k, v] of Object.entries(merged)) {
    console.log(`  ${k}: ${v.length}`)
  }

  // Дедупликация матчей по msgId
  const seenM = new Set()
  merged.matches = merged.matches.filter((m) => {
    const key = m.msgId ?? `${m.date}:${m.home}:${m.away}`
    if (seenM.has(key)) {
      return false
    }
    seenM.add(key)
    return true
  })

  // Дедупликация составов по msgId+team
  const seenR = new Set()
  merged.rosters = merged.rosters.filter((r) => {
    const key = `${r.msgId}:${r.team}`
    if (seenR.has(key)) {
      return false
    }
    seenR.add(key)
    return true
  })

  // Дедупликация площадок по name
  const venueMap = new Map<string, any>()
  for (const v of merged.venues) {
    const name = v.name?.trim()
    if (!name) {
      continue
    }
    const existing = venueMap.get(name)
    if (!existing || (v.address && v.address.length > (existing.address?.length || 0))) {
      venueMap.set(name, v)
    }
  }
  merged.venues = [...venueMap.values()]

  // Дедупликация команд по name
  const teamMap = new Map<string, any>()
  for (const t of merged.teams) {
    const name = t.name?.trim()
    if (!name) {
      continue
    }
    if (!teamMap.has(name)) {
      teamMap.set(name, t)
    } else {
      teamMap.set(name, { ...teamMap.get(name), ...t, name })
    }
  }
  merged.teams = [...teamMap.values()]

  // Дедупликация профилей по name
  const profMap = new Map<string, any>()
  for (const p of merged.profiles) {
    const name = p.name?.trim()
    if (name && !profMap.has(name)) {
      profMap.set(name, p)
    }
  }
  merged.profiles = [...profMap.values()]

  console.log('\n=== После дедупликации ===')
  for (const [k, v] of Object.entries(merged)) {
    console.log(`  ${k}: ${v.length}`)
  }

  // Уникальные игроки
  const players = new Set<string>()
  for (const r of merged.rosters) {
    const list = r.players || r.members || []
    list.forEach((p: string) => players.add(p.trim()))
  }
  console.log(`  Уникальных игроков: ${players.size}`)

  // Команды из матчей
  const matchTeams = new Set<string>()
  for (const m of merged.matches) {
    if (m.home) {
      matchTeams.add(m.home.trim())
    }
    if (m.away) {
      matchTeams.add(m.away.trim())
    }
    if (m.team1) {
      matchTeams.add(m.team1.trim())
    }
    if (m.team2) {
      matchTeams.add(m.team2.trim())
    }
  }
  console.log(`  Команд в матчах: ${matchTeams.size}`)
  console.log(`  Названия: ${[...matchTeams].sort().join(', ')}`)

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }
  writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2), 'utf-8')
  console.log(`\nСохранено: ${OUTPUT_FILE}`)
  console.log(`Размер: ${(readFileSync(OUTPUT_FILE).length / 1024).toFixed(0)} KB`)
}

main()
